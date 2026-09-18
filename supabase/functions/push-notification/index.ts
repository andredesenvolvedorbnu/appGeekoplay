import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const secretBundle=Deno.env.get("SUPABASE_SECRET_KEYS");
const SERVICE_KEY=secretBundle?JSON.parse(secretBundle)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function backendHeaders(extra:Record<string,string>={}){
  const headers:Record<string,string>={"Content-Type":"application/json",apikey:SERVICE_KEY,...extra};
  if(!SERVICE_KEY.startsWith("sb_secret_"))headers.Authorization=`Bearer ${SERVICE_KEY}`;
  return headers;
}
async function rpc<T>(name:string,body:Record<string,unknown>={}):Promise<T>{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:backendHeaders(),body:JSON.stringify(body)});if(!response.ok)throw new Error(`RPC ${name}: ${response.status} ${await response.text()}`);return await response.json() as T}
async function selectRows<T>(path:string):Promise<T[]>{const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:backendHeaders({"Accept":"application/json"})});if(!response.ok)throw new Error(`REST: ${response.status} ${await response.text()}`);return await response.json() as T[]}
async function deleteSubscription(id:string){await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:backendHeaders({"Prefer":"return=minimal"})})}

type NotificationRow={id:string;user_id:string;actor_id:string|null;type:string;title:string;body:string|null;entity_type:string|null;entity_id:string|null;created_at:string};
type Preference={enabled:boolean;messages:boolean;interactions:boolean;follows:boolean;communities:boolean;events:boolean;party_finder:boolean;invites:boolean};
type SubscriptionRow={id:string;endpoint:string;p256dh:string;auth:string};

function categoryFor(type:string):keyof Preference|null{if(type==="message")return "messages";if(type==="like"||type==="comment")return "interactions";if(type==="follow")return "follows";if(type==="community_join")return "communities";if(type==="event_same"||type==="event_friend_going")return "events";if(type==="party_join")return "party_finder";if(type==="invite")return "invites";return null}
function destination(n:NotificationRow){if(n.type==="message")return "/mensagens";if((n.type==="like"||n.type==="comment")&&n.entity_id)return `/publicacao/${n.entity_id}`;if(n.type==="follow"&&n.actor_id)return `/perfil/${n.actor_id}`;if((n.type==="event_same"||n.type==="event_friend_going")&&n.entity_id)return `/eventos/${n.entity_id}`;if(n.type==="community_join"&&n.entity_id)return `/comunidades/${n.entity_id}`;if(n.type==="party_join")return "/party-finder";if(n.type==="invite"&&n.entity_type==="community"&&n.entity_id)return `/comunidades/${n.entity_id}`;if(n.type==="invite"&&n.entity_type==="event"&&n.entity_id)return `/eventos/${n.entity_id}`;return "/notificacoes"}

Deno.serve(async(req)=>{
  try{
    if(req.method!=="POST")return new Response("Method not allowed",{status:405});
    const provided=req.headers.get("x-push-secret")||"";
    const expected=await rpc<string>("get_push_dispatch_secret");
    if(!provided||!expected||provided!==expected)return new Response("Unauthorized",{status:401});
    const payload=await req.json().catch(()=>({}));
    const notificationId=String(payload?.notification_id||"");
    if(!notificationId)return Response.json({ok:false,error:"notification_id required"},{status:400});

    const notifications=await selectRows<NotificationRow>(`notifications?id=eq.${encodeURIComponent(notificationId)}&select=id,user_id,actor_id,type,title,body,entity_type,entity_id,created_at&limit=1`);
    const notification=notifications[0];if(!notification)return Response.json({ok:true,skipped:"notification_not_found"});
    const category=categoryFor(notification.type);if(!category)return Response.json({ok:true,skipped:"not_relevant"});

    const prefs=await selectRows<Preference>(`push_preferences?user_id=eq.${encodeURIComponent(notification.user_id)}&select=enabled,messages,interactions,follows,communities,events,party_finder,invites&limit=1`);
    const pref=prefs[0];if(pref&&(!pref.enabled||!pref[category]))return Response.json({ok:true,skipped:"preference_disabled"});
    const subscriptions=await selectRows<SubscriptionRow>(`push_subscriptions?user_id=eq.${encodeURIComponent(notification.user_id)}&select=id,endpoint,p256dh,auth`);
    if(!subscriptions.length)return Response.json({ok:true,skipped:"no_subscription"});

    const [publicKey,privateKey]=await Promise.all([rpc<string>("get_push_public_key"),rpc<string>("get_push_vapid_private")]);
    if(!publicKey||!privateKey)throw new Error("VAPID credentials unavailable");
    webpush.setVapidDetails("mailto:contato.geekoplay@gmail.com",publicKey,privateKey);

    const body=JSON.stringify({title:notification.title||"GeekoPlay",body:notification.body||"Você tem uma nova interação no GeekoPlay.",url:destination(notification),tag:`geekoplay-${notification.type}-${notification.entity_id||notification.actor_id||notification.id}`,notificationId:notification.id});
    let sent=0;
    for(const sub of subscriptions){
      try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},body,{TTL:300,urgency:notification.type==="message"?"high":"normal"});sent++}
      catch(error:any){const status=Number(error?.statusCode||error?.status||0);if(status===404||status===410)await deleteSubscription(sub.id);else console.error("push send failed",status,error?.message||error)}
    }
    return Response.json({ok:true,sent});
  }catch(error){console.error(error);return Response.json({ok:false,error:"push_dispatch_failed"},{status:500})}
});
