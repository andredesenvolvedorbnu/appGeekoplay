'use client';

import type { ReactNode } from 'react';
import { RepostPreview } from '@/components/repost-preview';

const TOKEN_RE=/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|https?:\/\/[^\s<]+|www\.[^\s<]+|(?:[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.)+[A-Z]{2,}(?:\/[^\s<]*)?)/gi;
const TRAILING=/[.,!?;:]+$/;
const REPOST_RE=/^\[\[GEEKOPLAY_REPOST:([0-9a-f-]{36})\]\](?:\n([\s\S]*))?$/i;

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

function linkedParts(text:string){
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
 return parts;
}

export function AutoLinkText({text,className}:{text:string;className?:string}){
 const repost=text.match(REPOST_RE);
 if(repost){
  const note=(repost[2]||'').trim();
  return <span className={className}>
   {note&&<span className="mb-2 block whitespace-pre-wrap break-words">{linkedParts(note)}</span>}
   <RepostPreview postId={repost[1]}/>
  </span>;
 }
 return <span className={className}>{linkedParts(text)}</span>;
}
