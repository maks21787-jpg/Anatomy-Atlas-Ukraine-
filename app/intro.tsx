import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,MessageSquareHeart} from 'lucide-react';
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
    <button className="plate-frame" onClick={()=>enter('vessels')} aria-label="Відкрити серце й судини в атласі"><img src="plates/vessels.webp" alt="Серце та кровоносні судини людини" fetchPriority="high"/></button>
    <figcaption><b>Табл. I.</b> Серце й кровоносні судини <i>Cor et vasa sanguinea, facies anterior</i></figcaption>
   </figure>
  </section>

  <section className="ln-section ln-preface">
   <p className="reveal"><span className="ln-drop">Ц</span>ей атлас зібрано з відкритих тривимірних моделей тіла людини. Кожну з 2 234 структур можна обертати, розглядати зблизька, розрізати в трьох площинах і підписувати. Назви подано за Міжнародною анатомічною термінологією: українською, латиною та англійською.</p>
  </section>

  <section className="ln-section" id="contents">
   <header className="ln-head reveal"><span className="ln-index">I</span><h2>Зміст</h2><p>Оберіть систему, і атлас відкриється лише з нею.</p></header>
   <ol className="ln-contents">{CONTENTS.map(([id,uk,la,n],i)=><li key={id} className="reveal" style={{transitionDelay:`${(i%5)*.05}s`}}><button onClick={()=>enter(`system:${id}`)}><span className="n">{toRoman(i+1)}.</span><span className="t">{uk} <i>{la}</i></span><span className="dots"/><span className="p">{n.toLocaleString('uk')}</span></button></li>)}</ol>
  </section>

  <section className="ln-section" id="plates">
   <header className="ln-head reveal"><span className="ln-index">II</span><h2>Таблиці</h2><p>Натисніть таблицю, щоб відкрити цю ділянку в 3D.</p></header>
   <div className="ln-plates">{PLATES.map((p,i)=><button key={p.id} className="ln-plate reveal" style={{transitionDelay:`${(i%3)*.1}s`}} onClick={()=>enter(p.id)}>
    <span className="plate-frame"><img src={`plates/${p.id}.webp`} alt={p.title} loading="lazy"/></span>
    <span className="ln-plate-meta"><b>Табл. {p.numeral}</b><span className="t">{p.title}</span><i>{p.latin}</i><small>{p.note}<ArrowUpRight size={15}/></small></span>
   </button>)}</div>
  </section>

  <section className="ln-section ln-stats reveal">
   <div><b>2 234</b><span>структури чоловічого тіла</span></div>
   <div><b>264</b><span>структури жіночого тулуба</span></div>
   <div><b>15</b><span>анатомічних систем</span></div>
   <div><b>3</b><span>мови назв</span></div>
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
