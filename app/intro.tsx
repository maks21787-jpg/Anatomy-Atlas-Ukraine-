import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,MessageSquareHeart,Pause,Play} from 'lucide-react';
import {AUTHOR,AUTHOR_LINKS,BrandIcon} from './author';

/** An illustration on the opening page. Clicking it opens the atlas already showing that layer or structure. */
interface Plate {id:string;numeral:string;title:string;latin:string;note:string}
const PLATES:Plate[]=[
 {id:'skeleton',numeral:'II',title:'Скелет',latin:'Sceleton humanum',note:'296 кісток і хрящів'},
 {id:'muscles',numeral:'III',title:'М\'язи',latin:'Systema musculare',note:'402 м\'язи'},
 {id:'heart',numeral:'IV',title:'Серце',latin:'Cor',note:'камери, клапани, вінцеві судини'},
 {id:'organs',numeral:'V',title:'Внутрішні органи',latin:'Viscera',note:'дихальні, травні, сечові'},
 {id:'back',numeral:'VI',title:'М\'язи спини',latin:'Musculi dorsi',note:'вигляд ззаду'},
 {id:'brain',numeral:'VII',title:'Головний мозок',latin:'Encephalon',note:'півкулі, мозочок, стовбур'},
];
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
const ANGLES=['Facies anterior · спереду','Facies lateralis · збоку','Facies posterior · ззаду','Facies lateralis · збоку'];
const reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plate I as an X-ray: a scanning band sweeps the muscles and shows the skeleton beneath,
 * and on a pointer device a lens follows the cursor and shows the blood vessels.
 */
function XRayPlate({onOpen}:{onOpen:()=>void}){
 const el=useRef<HTMLButtonElement>(null),[lens,setLens]=useState<{x:number;y:number}|null>(null);
 useEffect(()=>{const node=el.current;if(!node||reduced)return;let frame=0,visible=true;const start=performance.now();
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});io.observe(node);
  const tick=(now:number)=>{frame=requestAnimationFrame(tick);if(!visible)return;const t=((now-start)/7000)%1,y=t<.5?t*2:2-t*2,eased=y*y*(3-2*y);node.style.setProperty('--scan',String(eased));};
  frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);io.disconnect();};},[]);
 return <button ref={el} className={`plate-frame xray ${lens?'has-lens':''}`} onClick={onOpen} aria-label="Відкрити атлас"
  onPointerMove={e=>{if(e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();setLens({x:e.clientX-r.left,y:e.clientY-r.top});}} onPointerLeave={()=>setLens(null)}
  style={lens?{['--lx' as string]:`${lens.x}px`,['--ly' as string]:`${lens.y}px`}:undefined}>
  <img src="plates/musclesfront.webp" alt="М'язи людини, вигляд спереду" fetchPriority="high"/>
  <img className="layer bone" src="plates/skeleton.webp" alt="" aria-hidden="true"/>
  <span className="scanline" aria-hidden="true"><em>Sceleton</em></span>
  <img className="layer vessels" src="plates/vessels.webp" alt="" aria-hidden="true"/>
  {lens&&<span className="lens-ring" aria-hidden="true"><em>Vasa sanguinea</em></span>}
 </button>;
}

/** A number that counts up once it scrolls into view. */
function Count({to}:{to:number}){
 const el=useRef<HTMLElement>(null),[n,setN]=useState(reduced?to:0);
 useEffect(()=>{const node=el.current;if(!node||reduced)return;let frame=0;const io=new IntersectionObserver(([e])=>{if(!e.isIntersecting)return;io.disconnect();const start=performance.now();const tick=(now:number)=>{const t=Math.min(1,(now-start)/1600);setN(Math.round(to*(1-Math.pow(1-t,4))));if(t<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);},{threshold:.4});io.observe(node);return()=>{io.disconnect();cancelAnimationFrame(frame);};},[to]);
 return <b ref={el}>{n.toLocaleString('uk')}</b>;
}

/** Turntable films of the body with a caption that follows the angle. */
function Turntables(){
 const [angle,setAngle]=useState(0),[playing,setPlaying]=useState(!reduced),vids=useRef<(HTMLVideoElement|null)[]>([]);
 useEffect(()=>{vids.current.forEach(v=>{if(!v)return;if(playing)v.play().catch(()=>setPlaying(false));else v.pause();});},[playing]);
 const clips:[string,string,string][]=[['vesselsturn','Серце й судини','Cor et vasa'],['musclesfront','М\'язи','Musculi']];
 return <div className="ln-films">
  {clips.map(([id,uk,la],i)=><figure key={id} className="ln-film reveal" style={{transitionDelay:`${i*.12}s`}}>
   <div className="film-frame"><video ref={v=>{vids.current[i]=v;}} muted loop playsInline autoPlay={!reduced} preload="metadata" poster={`plates/${id}-poster.webp`} onTimeUpdate={i===0?e=>{const v=e.currentTarget;if(v.duration)setAngle(Math.floor(v.currentTime/v.duration*4)%4);}:undefined}>
    <source src={`films/${id}.mp4`} type="video/mp4"/><source src={`films/${id}.webm`} type="video/webm"/></video>
    <span className="film-rec" aria-hidden="true"><i/>360°</span></div>
   <figcaption><b>{uk}</b> <i>{la}</i><span key={angle} className="film-angle">{ANGLES[angle]}</span></figcaption>
  </figure>)}
  <button className="ln-btn ghost small film-toggle" onClick={()=>setPlaying(p=>!p)}>{playing?<><Pause size={15}/>Пауза</>:<><Play size={15}/>Відтворити</>}</button>
 </div>;
}

/** Scroll parallax: elements with data-depth drift against the scroll, plates in alternate columns in opposite directions. */
function useParallax(root:React.RefObject<HTMLElement|null>){
 useEffect(()=>{const el=root.current;if(!el||reduced)return;const items=[...el.querySelectorAll<HTMLElement>('[data-depth]')];let frame=0;
  const update=()=>{frame=0;const h=el.clientHeight;for(const it of items){const r=it.getBoundingClientRect(),mid=r.top+r.height/2-h/2;it.style.setProperty('--py',`${(-mid*+it.dataset.depth!).toFixed(1)}px`);}};
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update);};el.addEventListener('scroll',onScroll,{passive:true});update();return()=>{el.removeEventListener('scroll',onScroll);cancelAnimationFrame(frame);};},[root]);
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
 const [leaving,setLeaving]=useState(false),root=useRef<HTMLDivElement>(null);
 useReveal(root);
 useParallax(root);
 const ready=progress>=100;
 const enter=(target?:string)=>{if(leaving)return;setLeaving(true);setTimeout(()=>onEnter(target),850);};
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Enter'&&!(e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement)){e.preventDefault();enter();}};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);});
 const jump=(id:string)=>(e:React.MouseEvent)=>{e.preventDefault();root.current?.querySelector(`#${id}`)?.scrollIntoView({behavior:'smooth'});};
 const status=ready?'Модель готова':`Модель завантажується · ${progress}%`;
 return <div ref={root} className={`landing ${leaving?'leaving':''}`} role="dialog" aria-label="Атлас людини 3D">
  <header className="ln-nav">
   <div className="ln-mark">Атлас людини<sup>3D</sup></div>
   <nav><a href="#contents" onClick={jump('contents')}>Зміст</a><a href="#plates" onClick={jump('plates')}>Таблиці</a><button onClick={onFeedback}>Відгук</button></nav>
   <button className="ln-btn small" onClick={()=>enter()}>Відкрити атлас<ArrowRight size={16}/></button>
  </header>

  <section className="ln-hero">
   <div className="ln-title-page">
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
   <figure className="ln-hero-plate">
    <XRayPlate onOpen={()=>enter()}/>
    <figcaption><b>Табл. I.</b> М'язи, скелет і судини, вигляд спереду <i>Musculi, sceleton et vasa, facies anterior</i><small className="xray-hint">Наведіть курсор, щоб побачити судини</small></figcaption>
   </figure>
  </section>

  <div className="ln-ticker" aria-hidden="true">{TERMS.map((row,r)=><div key={r} className={`row ${r?'rev':''}`}><div>{[...row,...row].map((t,i)=><span key={i}>{t}<i>✦</i></span>)}</div></div>)}</div>

  <section className="ln-section ln-preface">
   <p className="reveal"><span className="ln-drop">Ц</span>ей атлас зібрано з відкритих тривимірних моделей тіла людини. Кожну з 2 234 структур можна обертати, розглядати зблизька, розрізати в трьох площинах і підписувати. Назви подано за Міжнародною анатомічною термінологією: українською, латиною та англійською.</p>
  </section>

  <section className="ln-section ln-turn">
   <header className="ln-head reveal"><span className="ln-index">◯</span><h2>Обертання 360°</h2><p>Кожну модель можна оглянути з будь-якого боку. Відкрийте атлас і потягніть тіло.</p></header>
   <Turntables/>
  </section>

  <section className="ln-section" id="contents">
   <header className="ln-head reveal"><span className="ln-index">I</span><h2>Зміст</h2><p>Оберіть систему, і атлас відкриється лише з нею.</p></header>
   <ol className="ln-contents">{CONTENTS.map(([id,uk,la,n],i)=><li key={id} className="reveal" style={{transitionDelay:`${(i%5)*.05}s`}}><button onClick={()=>enter(`system:${id}`)}><span className="n">{toRoman(i+1)}.</span><span className="t">{uk} <i>{la}</i></span><span className="dots"/><span className="p">{n.toLocaleString('uk')}</span></button></li>)}</ol>
  </section>

  <section className="ln-section" id="plates">
   <header className="ln-head reveal"><span className="ln-index">II</span><h2>Таблиці</h2><p>Натисніть таблицю, щоб відкрити цю ділянку в 3D.</p></header>
   <div className="ln-plates">{PLATES.map((p,i)=><button key={p.id} className="ln-plate reveal" data-depth={[.06,-.04,.08][i%3]} style={{transitionDelay:`${(i%3)*.1}s`}} onClick={()=>enter(p.id)}>
    <span className="plate-frame"><img src={`plates/${p.id}.webp`} alt={p.title} loading="lazy"/></span>
    <span className="ln-plate-meta"><b>Табл. {p.numeral}</b><span className="t">{p.title}</span><i>{p.latin}</i><small>{p.note}<ArrowUpRight size={15}/></small></span>
   </button>)}</div>
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
