import type { ReactNode } from 'react';

const TOKEN_RE=/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|https?:\/\/[^\s<]+|www\.[^\s<]+|(?:[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.)+[A-Z]{2,}(?:\/[^\s<]*)?)/gi;
const TRAILING=/[.,!?;:]+$/;

function splitTrailing(value:string){
 const match=value.match(TRAILING);
 if(!match)return {token:value,trailing:''};
 return {token:value.slice(0,-match[0].length),trailing:match[0]};
}

function hrefFor(token:string){
 if(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(token))return `mailto:${token}`;
 if(/^https?:\/\//i.test(token))return token;
 return `https://${token}`;
}

function isEmail(token:string){
 return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(token);
}

export function AutoLinkText({text,className}:{text:string;className?:string}){
 const parts:ReactNode[]=[];
 let last=0;
 for(const match of text.matchAll(TOKEN_RE)){
  const index=match.index??0;
  if(index>last)parts.push(text.slice(last,index));
  const raw=match[0];
  const {token,trailing}=splitTrailing(raw);
  if(token){
   const email=isEmail(token);
   parts.push(
    <a
     key={`${index}-${token}`}
     href={hrefFor(token)}
     target={email?undefined:'_blank'}
     rel={email?undefined:'noopener noreferrer nofollow'}
     className="break-all font-semibold text-orange-300 underline decoration-orange-400/45 underline-offset-2 transition hover:text-orange-200 hover:decoration-orange-300"
     onClick={event=>event.stopPropagation()}
    >
     {token}
    </a>
   );
  }
  if(trailing)parts.push(trailing);
  last=index+raw.length;
 }
 if(last<text.length)parts.push(text.slice(last));
 return <span className={className}>{parts}</span>;
}
