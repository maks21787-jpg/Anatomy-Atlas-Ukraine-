import type {ReactNode} from 'react';

/**
 * Author details shown in the intro, the sidebar and the feedback form.
 * To add a social network, fill in its url below; entries with an empty url are hidden.
 */
export const AUTHOR={
 name:'Maksym Valin',
 role:'Автор і розробник',
 email:'maks21787@gmail.com',
 links:[
  {id:'github',label:'GitHub',url:'https://github.com/maks21787-jpg'},
  {id:'instagram',label:'Instagram',url:''},
  {id:'telegram',label:'Telegram',url:''},
  {id:'linkedin',label:'LinkedIn',url:''},
  {id:'tiktok',label:'TikTok',url:''},
  {id:'youtube',label:'YouTube',url:''},
  {id:'facebook',label:'Facebook',url:''},
 ] as {id:BrandId;label:string;url:string}[],
};
export const AUTHOR_LINKS=AUTHOR.links.filter(l=>l.url);

export type BrandId='github'|'instagram'|'telegram'|'linkedin'|'tiktok'|'youtube'|'facebook'|'mail';
const PATHS:Record<BrandId,ReactNode>={
 github:<path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>,
 instagram:<g fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none"/></g>,
 telegram:<path fill="currentColor" d="M21.5 4.1 2.9 11.3c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.2-15c.3-1.3-.5-1.9-1.5-1.6ZM9.1 14.1l8.7-5.5c.4-.3.8-.1.5.2l-7.2 6.5-.3 3.2-1.7-4.4Z"/>,
 linkedin:<path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.55h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.64 4.77 6.08v6.42h-4v-5.7c0-1.36-.03-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8h-4v-11Z"/>,
 tiktok:<path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3.1c-1.4.1-2.7-.3-3.9-1.1v6.1c0 3.9-4.3 6.3-7.5 4.2-2.1-1.3-3-4-2-6.3 1-2.2 3.4-3.4 5.8-2.9v3.2c-.6-.2-1.3-.2-1.9.1-1 .5-1.4 1.8-.8 2.8.7 1.1 2.4 1.2 3.2.2.3-.4.4-.9.4-1.4V3h2.8Z"/>,
 youtube:<path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z"/>,
 facebook:<path fill="currentColor" d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3Z"/>,
 mail:<g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></g>,
};
export function BrandIcon({id,size=20}:{id:BrandId;size?:number}){return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">{PATHS[id]}</svg>;}

/** Opens the reader's mail app with the feedback already written, addressed to the author. */
export function feedbackMailto({kind,message,name,contact,context}:{kind:string;message:string;name:string;contact:string;context:string}){
 const subject=`Атлас людини 3D — ${kind}`;
 const body=[message.trim(),'',name.trim()&&`Ім'я: ${name.trim()}`,contact.trim()&&`Контакт для відповіді: ${contact.trim()}`,'',`— ${context}`].filter(x=>typeof x==='string').join('\n');
 return `mailto:${AUTHOR.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
