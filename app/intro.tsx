import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowRight,ChevronRight,GraduationCap,MessageSquareHeart} from 'lucide-react';
import {AUTHOR,AUTHOR_LINKS,BrandIcon} from './author';

export interface Chapter {title:string;text:string;count:number;color:string}
const TITLE='Атлас людини';
/** How long each chapter stays on screen, in milliseconds. */
const CHAPTER_MS=3600;

function CountUp({to,duration=1200}:{to:number;duration?:number}){
 const [n,setN]=useState(0);
 useEffect(()=>{let frame=0;const start=performance.now();const tick=(now:number)=>{const t=Math.min(1,Math.max(0,(now-start)/duration));setN(Math.round(to*(1-Math.pow(1-t,3))));if(t<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[to,duration]);
 return <>{n.toLocaleString('uk')}</>;
}
function Letters({text,delay=0}:{text:string;delay?:number}){
 return <>{text.split(' ').map((word,w,words)=>{const offset=words.slice(0,w).join(' ').length+(w?1:0);return <span className="word" key={w}>{[...word].map((ch,i)=><span key={i} style={{animationDelay:`${delay+(offset+i)*.045}s`}}>{ch}</span>)}</span>;}).reduce<ReactNode[]>((acc,el,i)=>i?[...acc,' ',el]:[el],[])}</>;
}
function Emblem(){
 return <svg className="emblem" viewBox="0 0 200 200" aria-hidden="true">
  <circle className="ring r1" cx="100" cy="100" r="88"/><circle className="ring r2" cx="100" cy="100" r="72"/><circle className="ring r3" cx="100" cy="100" r="56"/>
  <g className="ticks">{Array.from({length:24},(_,i)=><rect key={i} x="98.5" y="6" width="3" height={i%6===0?12:7} rx="1.5" transform={`rotate(${i*15} 100 100)`}/>)}</g>
  <path className="pulse" d="M28 104 H70 L80 84 L92 128 L104 60 L116 118 L124 100 H172"/>
  <circle className="core" cx="100" cy="100" r="5"/>
 </svg>;
}

/**
 * Opening showreel. It plays over the live 3D scene: the page shows one layer of the body per chapter
 * while this overlay tells what the reader is looking at, then ends on the way in.
 */
export default function Intro({progress,chapters,onChapter,onEnter,onFeedback,tourNext,stats}:{progress:number;chapters:Chapter[];onChapter:(i:number)=>void;onEnter:()=>void;onFeedback:()=>void;tourNext:boolean;stats:{label:string;value:number}[]}){
 const [leaving,setLeaving]=useState(false),[chapter,setChapter]=useState(0);
 const ready=progress>=100,last=chapters.length+1;
 const enter=()=>{if(leaving)return;setLeaving(true);setTimeout(onEnter,700);};
 const go=(n:number)=>setChapter(Math.max(0,Math.min(last,n)));
 const report=useRef(onChapter);report.current=onChapter;
 useEffect(()=>{report.current(chapter);},[chapter]);
 // The opening card waits for the model; after that the chapters advance on their own and stop on the final card.
 useEffect(()=>{if(chapter>=last||(chapter===0&&!ready))return;const t=setTimeout(()=>setChapter(c=>c+1),chapter===0?2600:CHAPTER_MS);return()=>clearTimeout(t);},[chapter,ready,last]);
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();enter();}else if(e.key==='ArrowRight')go(chapter+1);else if(e.key==='ArrowLeft')go(chapter-1);};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);});
 const current=chapters[chapter-1];
 return <div className={`intro reel ${leaving?'leaving':''} ${ready?'ready':''} ch-${chapter===0?'open':chapter===last?'final':'layer'}`} role="dialog" aria-label="Атлас людини 3D">
  <div className="reel-veil" aria-hidden="true"/>
  <div className="intro-bg" aria-hidden="true"><div className="intro-grid"/>{Array.from({length:14},(_,i)=><i key={i} style={{left:`${(i*53)%100}%`,animationDelay:`${(i*.37)%5}s`,animationDuration:`${6+(i%5)}s`}}/>)}</div>
  <header className="reel-top">
   <div className="reel-bars" role="tablist" aria-label="Розділи вступу">{Array.from({length:last+1},(_,i)=><button key={i} role="tab" aria-selected={i===chapter} aria-label={i===0?'Початок':i===last?'Відкрити атлас':chapters[i-1].title} onClick={()=>go(i)} className={i<chapter?'done':i===chapter?'active':''}><i style={i===chapter?(i===0?{width:ready?undefined:`${Math.max(4,progress)}%`,animationDuration:ready?'2600ms':undefined}:{animationDuration:`${CHAPTER_MS}ms`}):undefined} className={i===chapter&&(i!==0||ready)&&i!==last?'run':''}/></button>)}</div>
   {chapter<last&&<button className="reel-skip" onClick={()=>go(last)}>Пропустити<ChevronRight size={17}/></button>}
  </header>
  {!ready&&chapter>0&&<div className="reel-loading" aria-hidden="true"><Emblem/><span>Модель завантажується · {progress}%</span></div>}

  <div className="reel-stage">
   {chapter===0&&<section className="reel-card open" key="open">
    <Emblem/>
    <div className="intro-eyebrow">{AUTHOR.name} представляє</div>
    <h1 className="intro-title" aria-label={`${TITLE} 3D`}><Letters text={TITLE} delay={.35}/><em style={{animationDelay:`${.35+TITLE.length*.045+.1}s`}}>3D</em></h1>
    <p className="intro-lead">Інтерактивна анатомія людини українською, латиною та англійською.</p>
    <div className="reel-progress"><div className="bar"><i style={{width:`${Math.max(4,progress)}%`}}/></div><span>{ready?'Модель готова':`Завантаження 3D-моделі · ${progress}%`}</span></div>
   </section>}
   {current&&<section className="reel-card layer" key={chapter}>
    <div className="reel-kicker"><i style={{background:current.color}}/>Розділ {chapter} з {chapters.length}</div>
    <h2><Letters text={current.title}/></h2>
    <div className="reel-count"><b><CountUp to={current.count}/></b><span>структур на моделі</span></div>
    <p>{current.text}</p>
   </section>}
   {chapter===last&&<section className="reel-card final" key="final">
    <div className="intro-eyebrow">Інтерактивний 3D-атлас анатомії</div>
    <h1 className="intro-title small" aria-label={`${TITLE} 3D`}><Letters text={TITLE} delay={.1}/><em style={{animationDelay:`${.1+TITLE.length*.045+.1}s`}}>3D</em></h1>
    <div className="intro-stats">{stats.map((s,i)=><div key={i} style={{animationDelay:`${.35+i*.1}s`}}><b>{s.value.toLocaleString('uk')}</b><span>{s.label}</span></div>)}</div>
    <div className="intro-actions">
     <button className="intro-enter" onClick={enter} autoFocus><span className="fill" style={{width:`${ready?100:Math.max(6,progress)}%`}}/><span className="label">{ready?'Відкрити атлас':`Завантаження · ${progress}%`}<ArrowRight size={20}/></span></button>
     <button className="intro-secondary" onClick={onFeedback}><MessageSquareHeart size={18}/>Відгук</button>
    </div>
    {tourNext&&<p className="reel-next"><GraduationCap size={17}/>Після входу — коротке інтерактивне навчання на 1 хвилину</p>}
    <div className="intro-author">
     <div className="avatar" aria-hidden="true">{AUTHOR.name.split(' ').map(w=>w[0]).join('')}</div>
     <div className="who"><small>Автор</small><b>{AUTHOR.name}</b></div>
     <div className="socials">{AUTHOR_LINKS.map(l=><a key={l.id} href={l.url} target="_blank" rel="noreferrer" aria-label={l.label} title={l.label}><BrandIcon id={l.id}/></a>)}<a href={`mailto:${AUTHOR.email}`} aria-label="Пошта" title={AUTHOR.email}><BrandIcon id="mail"/></a></div>
    </div>
    <p className="intro-foot">Версія {__BUILD__} · Навчальний ресурс, не для діагностики · BodyParts3D (DBCLS) і Human Reference Atlas (HuBMAP), CC BY 4.0</p>
   </section>}
  </div>

  {chapter<last&&<footer className="reel-foot">
   <button className="intro-enter compact" onClick={enter}><span className="fill" style={{width:`${ready?100:Math.max(6,progress)}%`}}/><span className="label">{ready?'Відкрити атлас':`Завантаження · ${progress}%`}<ArrowRight size={18}/></span></button>
   <span className="reel-keys">← → розділи · Enter — увійти</span>
  </footer>}
 </div>;
}
