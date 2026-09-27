import {useEffect,useRef,useState} from 'react';
import {ArrowRight,MessageSquareHeart} from 'lucide-react';
import {AUTHOR,AUTHOR_LINKS,BrandIcon} from './author';

/** Table of contents: each line opens the atlas with only that system shown. */
const CONTENTS:[string,string,string,number][]=[
 ['skeletal','Скелет','Systema skeletale',296],['muscular','М\'язи','Systema musculare',402],['cardiac','Серце','Cor',23],['arterial','Артерії','Arteriae',639],['venous','Вени','Venae',404],
 ['nervous','Нервова система','Systema nervosum',139],['sensory','Органи чуття','Organa sensuum',45],['respiratory','Дихальна система','Systema respiratorium',119],['digestive','Травна система','Systema digestorium',97],['urinary','Сечова система','Systema urinarium',6],
];
const STEPS=[
 ['Обертайте й наближайте','Тягніть тіло мишею або пальцем, коліщатком чи двома пальцями змінюйте масштаб.'],
 ['Клацніть структуру','Картка покаже назву українською й латиною, опис, частини та нотатку.'],
 ['Шукайте й досліджуйте','Пошук будь-якою з трьох мов, зрізи, сканер, «Скляне тіло» й підписи.'],
];
function toRoman(n:number){const map:[number,string][]=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let out='';for(const [v,s] of map)while(n>=v){out+=s;n-=v;}return out;}

const TERMS=[['Arteria carotis communis','Musculus deltoideus','Os femoris','Cor','Pulmo dexter','Hepar','Ren sinister','Encephalon','Aorta thoracica','Vena cava superior','Musculus trapezius','Cerebellum'],['Sternum','Vena saphena magna','Musculus rectus abdominis','Gaster','Clavicula','Arteria femoralis','Colon transversum','Scapula','Musculus gluteus maximus','Pancreas','Tibia','Vertebrae lumbales']];
const reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A number that counts up once it scrolls into view. */
function Count({to}:{to:number}){
 const el=useRef<HTMLElement>(null),[n,setN]=useState(reduced?to:0);
 useEffect(()=>{const node=el.current;if(!node||reduced)return;let frame=0;const io=new IntersectionObserver(([e])=>{if(!e.isIntersecting)return;io.disconnect();const start=performance.now();const tick=(now:number)=>{const t=Math.min(1,(now-start)/1600);setN(Math.round(to*(1-Math.pow(1-t,4))));if(t<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);},{threshold:.4});io.observe(node);return()=>{io.disconnect();cancelAnimationFrame(frame);};},[to]);
 return <b ref={el}>{n.toLocaleString('uk')}</b>;
}

const WORDS=['Sceleton','Musculi','Cor','Vasa','Encephalon','Homo'];

/** Proportion figure after Vitruvius: circle, square, measuring ticks and axes, drawn line by line. */
function Vitruvian({className=''}:{className?:string}){
 return <svg className={`vitruvian ${className}`} viewBox="0 0 400 400" aria-hidden="true">
  <circle className="v-circle" cx="200" cy="200" r="176"/>
  <rect className="v-square" x="52" y="80" width="296" height="296"/>
  <g className="v-ticks">{Array.from({length:72},(_,i)=><line key={i} x1="200" y1="14" x2="200" y2={i%6===0?30:22} transform={`rotate(${i*5} 200 200)`}/>)}</g>
  <line className="v-axis" x1="200" y1="8" x2="200" y2="392"/><line className="v-axis h" x1="8" y1="200" x2="392" y2="200"/>
  <circle className="v-core" cx="200" cy="200" r="3"/>
 </svg>;
}

/** A few seconds of opening titles: the figure draws itself while Latin names of the body's parts pass through its centre. */
function Opening({onReveal,onDone}:{onReveal:()=>void;onDone:()=>void}){
 const [word,setWord]=useState(0),[out,setOut]=useState(false);
 useEffect(()=>{if(reduced){onReveal();onDone();return;}const timers=[...WORDS.map((_,i)=>setTimeout(()=>setWord(i),900+i*520)),setTimeout(()=>{setOut(true);onReveal();},900+WORDS.length*520+300),setTimeout(onDone,900+WORDS.length*520+1200)];return()=>timers.forEach(clearTimeout);// eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 return <div className={`opening ${out?'out':''}`} onClick={()=>{onReveal();onDone();}} role="presentation">
  <Vitruvian/>
  <div className="op-word" key={word}><span>{WORDS[word]}</span></div>
  <p className="op-foot">Atlas anatomiae humanae · {AUTHOR.name}</p>
  <button className="op-skip" onClick={e=>{e.stopPropagation();onReveal();onDone();}}>Пропустити</button>
 </div>;
}

/** Adds .in to every .reveal element once it scrolls into view, so sections settle in as the reader reaches them. */
function useReveal(root:React.RefObject<HTMLElement|null>){
 useEffect(()=>{const el=root.current;if(!el)return;const items=[...el.querySelectorAll('.reveal')];
  if(typeof IntersectionObserver==='undefined'){items.forEach(i=>i.classList.add('in'));return;}
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{root:el,threshold:.12});
  items.forEach(i=>io.observe(i));return()=>io.disconnect();},[root]);
}

/** Opening page, laid out like the title spread, contents and plates of a printed anatomical atlas. */
export default function Intro({progress,onEnter,onFeedback}:{progress:number;onEnter:(target?:string)=>void;onFeedback:()=>void}){
 const [leaving,setLeaving]=useState(false),[opened,setOpened]=useState(false),[titlesGone,setTitlesGone]=useState(false),root=useRef<HTMLDivElement>(null);
 useReveal(root);
 const ready=progress>=100;
 const enter=(target?:string)=>{if(leaving)return;setLeaving(true);setTimeout(()=>onEnter(target),850);};
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Enter'&&!(e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement)){e.preventDefault();enter();}};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);});
 const jump=(id:string)=>(e:React.MouseEvent)=>{e.preventDefault();root.current?.querySelector(`#${id}`)?.scrollIntoView({behavior:'smooth'});};
 const status=ready?'Модель готова':`Модель завантажується · ${progress}%`;
 return <div ref={root} className={`landing ${leaving?'leaving':''}`} role="dialog" aria-label="Атлас людини 3D">
  <header className="ln-nav">
   <div className="ln-mark">Атлас людини<sup>3D</sup></div>
   <nav><a href="#contents" onClick={jump('contents')}>Зміст</a><button onClick={onFeedback}>Відгук</button></nav>
   <button className="ln-btn small" onClick={()=>enter()}>Відкрити атлас<ArrowRight size={16}/></button>
  </header>

  {!titlesGone&&<Opening onReveal={()=>setOpened(true)} onDone={()=>setTitlesGone(true)}/>}
  {opened&&<section className="ln-hero">
   <Vitruvian className="bg"/>
   <div className="ln-title-page">
    <i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/>
    <p className="ln-running"><span className="line"><span>Atlas anatomiae humanae</span></span></p>
    <h1><span className="line"><span>Атлас</span></span><span className="line"><span>анатомії</span></span><span className="line"><span><em>людини</em></span></span></h1>
    <p className="ln-sub">у трьох вимірах, з назвами українською, латиною та англійською</p>
    <div className="ln-ornament" aria-hidden="true"><i/><span>❦</span><i/></div>
    <p className="ln-byline">Склав <b>{AUTHOR.name}</b> · {toRoman(new Date().getFullYear())}</p>
    <div className="ln-actions">
     <button className="ln-btn" onClick={()=>enter()}>Відкрити атлас<ArrowRight size={19}/></button>
     <button className="ln-btn ghost" onClick={onFeedback}><MessageSquareHeart size={18}/>Надіслати відгук</button>
    </div>
    <p className="ln-status" aria-live="polite"><span className="track"><i style={{width:`${Math.max(3,progress)}%`}}/></span><span>{status}</span></p>
   </div>
  </section>}

  <div className="ln-ticker" aria-hidden="true">{TERMS.map((row,r)=><div key={r} className={`row ${r?'rev':''}`}><div>{[...row,...row].map((t,i)=><span key={i}>{t}<i>✦</i></span>)}</div></div>)}</div>

  <section className="ln-section ln-preface">
   <p className="reveal"><span className="ln-drop">Ц</span>ей атлас зібрано з відкритих тривимірних моделей тіла людини. Кожну з 2 234 структур можна обертати, розглядати зблизька, розрізати в трьох площинах і підписувати. Назви подано за Міжнародною анатомічною термінологією: українською, латиною та англійською.</p>
  </section>

  <section className="ln-section" id="contents">
   <header className="ln-head reveal"><span className="ln-index">I</span><h2>Зміст</h2><p>Оберіть систему, і атлас відкриється лише з нею.</p></header>
   <ol className="ln-contents">{CONTENTS.map(([id,uk,la,n],i)=><li key={id} className="reveal" style={{transitionDelay:`${(i%5)*.05}s`}}><button onClick={()=>enter(`system:${id}`)}><span className="n">{toRoman(i+1)}.</span><span className="t">{uk} <i>{la}</i></span><span className="dots"/><span className="p">{n.toLocaleString('uk')}</span></button></li>)}</ol>
  </section>

  <section className="ln-section ln-stats reveal">
   <div><Count to={2234}/><span>структури чоловічого тіла</span></div>
   <div><Count to={264}/><span>структури жіночого тулуба</span></div>
   <div><Count to={15}/><span>анатомічних систем</span></div>
   <div><Count to={3}/><span>мови назв</span></div>
  </section>

  <section className="ln-section">
   <header className="ln-head reveal"><span className="ln-index">III</span><h2>Як користуватися</h2><p>Після входу коротке навчання покаже все на практиці.</p></header>
   <ol className="ln-steps">{STEPS.map(([t,d],i)=><li key={t} className="reveal" style={{transitionDelay:`${i*.1}s`}}><span>{toRoman(i+1)}</span><b>{t}</b><p>{d}</p></li>)}</ol>
  </section>

  <footer className="ln-foot reveal">
   <div className="ln-author">
    <small>Склав і розробив</small><b>{AUTHOR.name}</b>
    <div className="socials">{AUTHOR_LINKS.map(l=><a key={l.id} href={l.url} target="_blank" rel="noreferrer" aria-label={l.label} title={l.label}><BrandIcon id={l.id}/></a>)}<a href={`mailto:${AUTHOR.email}`} aria-label="Пошта" title={AUTHOR.email}><BrandIcon id="mail"/></a></div>
   </div>
   <div className="ln-foot-actions"><button className="ln-btn" onClick={()=>enter()}>Відкрити атлас<ArrowRight size={19}/></button><button className="ln-btn ghost" onClick={onFeedback}>Відгук автору</button></div>
   <p className="ln-fine">Версія {__BUILD__}. Навчальний ресурс, не для діагностики чи лікування. Анатомічні дані: BodyParts3D (DBCLS) і Human Reference Atlas (HuBMAP), CC BY 4.0. Таблиці відрендерено з цих моделей.</p>
  </footer>

  <div className="ln-dock"><button className="ln-btn" onClick={()=>enter()}>Відкрити атлас<ArrowRight size={19}/></button><span>{status}</span></div>
 </div>;
}
