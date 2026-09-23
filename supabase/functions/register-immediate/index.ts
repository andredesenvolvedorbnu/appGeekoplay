import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://geekoplay.com",
  "https://www.geekoplay.com",
]);

function cors(origin: string | null) {
  const allowed = Boolean(origin && (allowedOrigins.has(origin) || /^https:\/\/[-a-z0-9]+\.vercel\.app$/i.test(origin)));
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "https://geekoplay.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405, origin);
  }

  try {
    const body = await req.json();
    const name = String(body?.name || "").trim().replace(/\s+/g, " ");
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (name.length < 2 || name.length > 80) {
      return json({ error: "Informe um nome válido." }, 400, origin);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ error: "Informe um e-mail válido." }, 400, origin);
    }
    if (password.length < 8 || password.length > 128) {
      return json({ error: "A senha deve ter entre 8 e 128 caracteres." }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const secretKey = secretKeysRaw
      ? JSON.parse(secretKeysRaw)?.default
      : legacyServiceRole;

    if (!supabaseUrl || !secretKey) {
      console.error("Missing Supabase server credentials");
      return json({ error: "Cadastro temporariamente indisponível." }, 503, origin);
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });

    if (error) {
      const message = String(error.message || "");
      if (/already|registered|exists|duplicate/i.test(message)) {
        return json({ error: "Este e-mail já possui uma conta no GeekoPlay.", code: "already_registered" }, 409, origin);
      }
      if (/password/i.test(message)) {
        return json({ error: "A senha não atende aos requisitos de segurança." }, 400, origin);
      }
      if (/email/i.test(message)) {
        return json({ error: "Não foi possível usar este e-mail para criar a conta." }, 400, origin);
      }
      console.error("register-immediate createUser error", error);
      return json({ error: "Não foi possível criar sua conta agora." }, 500, origin);
    }

    return json({ ok: true, userId: data.user?.id || null }, 201, origin);
  } catch (error) {
    console.error("register-immediate unexpected error", error);
    return json({ error: "Não foi possível criar sua conta agora." }, 500, origin);
  }
});
