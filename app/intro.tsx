import {useEffect,useState,type ReactNode} from 'react';
import {ArrowRight,MessageSquareHeart} from 'lucide-react';
import {AUTHOR,AUTHOR_LINKS,BrandIcon} from './author';

const TITLE='Атлас людини';
function CountUp({to,duration=1400,delay=0}:{to:number;duration?:number;delay?:number}){
 const [n,setN]=useState(0);
 useEffect(()=>{let frame=0;const start=performance.now()+delay;const tick=(now:number)=>{const t=Math.min(1,Math.max(0,(now-start)/duration));setN(Math.round(to*(1-Math.pow(1-t,3))));if(t<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[to,duration,delay]);
 return <>{n.toLocaleString('uk')}</>;
}

/** Full-screen opening card: animated emblem, what the atlas is, who made it, and the way in. */
export default function Intro({progress,onEnter,onFeedback}:{progress:number;onEnter:()=>void;onFeedback:()=>void}){
 const [leaving,setLeaving]=useState(false);
 const enter=()=>{if(leaving)return;setLeaving(true);setTimeout(onEnter,650);};
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key==='Escape')enter();};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);});
 const ready=progress>=100;
 return <div className={`intro ${leaving?'leaving':''}`} role="dialog" aria-label="Атлас людини 3D">
  <div className="intro-bg" aria-hidden="true"><div className="intro-glow"/><div className="intro-grid"/>{Array.from({length:18},(_,i)=><i key={i} style={{left:`${(i*53)%100}%`,animationDelay:`${(i*.37)%5}s`,animationDuration:`${6+(i%5)}s`}}/>)}</div>
  <div className="intro-inner">
   <svg className="emblem" viewBox="0 0 200 200" aria-hidden="true">
    <defs><linearGradient id="ig" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)"/><stop offset="1" stopColor="#60a5fa"/></linearGradient></defs>
    <circle className="ring r1" cx="100" cy="100" r="88"/><circle className="ring r2" cx="100" cy="100" r="72"/><circle className="ring r3" cx="100" cy="100" r="56"/>
    <g className="ticks">{Array.from({length:24},(_,i)=><rect key={i} x="98.5" y="6" width="3" height={i%6===0?12:7} rx="1.5" transform={`rotate(${i*15} 100 100)`}/>)}</g>
    <path className="pulse" d="M28 104 H70 L80 84 L92 128 L104 60 L116 118 L124 100 H172"/>
    <circle className="core" cx="100" cy="100" r="5"/>
   </svg>
   <div className="intro-eyebrow">Інтерактивний 3D-атлас анатомії</div>
   <h1 className="intro-title" aria-label={`${TITLE} 3D`}>{TITLE.split(' ').map((word,w,words)=>{const offset=words.slice(0,w).join(' ').length+(w?1:0);return <span className="word" key={w}>{[...word].map((ch,i)=><span key={i} style={{animationDelay:`${.35+(offset+i)*.05}s`}}>{ch}</span>)}</span>;}).reduce<ReactNode[]>((acc,el,i)=>i?[...acc,' ',el]:[el],[])}<em style={{animationDelay:`${.35+TITLE.length*.05+.1}s`}}>3D</em></h1>
   <p className="intro-lead">Досліджуйте тіло людини шар за шаром: системи органів, зрізи, сканер і назви кожної структури українською, латиною та англійською.</p>
   <div className="intro-stats">
    <div><b><CountUp to={2234} delay={700}/></b><span>структур чоловічого тіла</span></div>
    <div><b><CountUp to={264} delay={800}/></b><span>структури жіночого тулуба</span></div>
    <div><b>3</b><span>мови назв</span></div>
   </div>
   <div className="intro-actions">
    <button className="intro-enter" onClick={enter}><span className="fill" style={{width:`${ready?100:Math.max(6,progress)}%`}}/><span className="label">{ready?'Відкрити атлас':`Завантаження моделі · ${progress}%`}<ArrowRight size={20}/></span></button>
    <button className="intro-secondary" onClick={onFeedback}><MessageSquareHeart size={18}/>Надіслати відгук</button>
   </div>
   <div className="intro-author">
    <div className="avatar" aria-hidden="true">{AUTHOR.name.split(' ').map(w=>w[0]).join('')}</div>
    <div className="who"><small>Створено</small><b>{AUTHOR.name}</b></div>
    <div className="socials">{AUTHOR_LINKS.map(l=><a key={l.id} href={l.url} target="_blank" rel="noreferrer" aria-label={l.label} title={l.label}><BrandIcon id={l.id}/></a>)}<a href={`mailto:${AUTHOR.email}`} aria-label="Пошта" title={AUTHOR.email}><BrandIcon id="mail"/></a></div>
   </div>
   <p className="intro-foot">Версія {__BUILD__} · Навчальний ресурс, не для діагностики · BodyParts3D (DBCLS) і Human Reference Atlas (HuBMAP), CC BY 4.0</p>
  </div>
 </div>;
}
