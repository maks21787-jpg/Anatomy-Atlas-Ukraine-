import {flushSync} from 'react-dom';
import {registerAtlasTools} from './agent-tools';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Activity,ArrowLeft,ArrowUpRight,BookOpen,Camera,ChevronRight,CircleHelp,Eye,EyeOff,Focus,Ghost,History,Info,Lightbulb,LocateFixed,Maximize,Mars,Menu,MessageSquareHeart,Copy,Check,Moon,MousePointerClick,NotebookPen,Pause,Plus,RotateCcw,RotateCw,ScanLine,Scissors,Search,SlidersHorizontal,Sun,Tags,Trash2,Venus,X,ZoomIn,ZoomOut} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import AnatomyScene,{type ScanReport} from './scene';
import Intro,{type Chapter} from './intro';
import Tour from './tour';
import {AUTHOR,AUTHOR_LINKS,BrandIcon,feedbackMailto} from './author';
import {buildIndex,highlight,searchConcepts,tokenize,type QueryToken} from './search';
import {DEFAULT_VISIBLE,SYSTEMS,EXPLANATIONS,explanation,localizeAtlas,type Atlas,type Concept,type Insets,type LabelMode,type SceneState,type SectionAxis,type SystemId,type Theme,type View} from './anatomy';

const VIEWS:{id:View;short:string;label:string;key:string}[]=[
 {id:'front',short:'П',label:'Спереду',key:'1'},{id:'back',short:'З',label:'Ззаду',key:'2'},{id:'left',short:'Л',label:'Зліва',key:'3'},{id:'right',short:'Пр',label:'Справа',key:'4'},{id:'top',short:'В',label:'Згори',key:'5'},
];
const SECTIONS:{id:SectionAxis;label:string}[]=[{id:'axial',label:'Поперечний'},{id:'coronal',label:'Фронтальний'},{id:'sagittal',label:'Сагітальний'}];
const ORGANS:SystemId[]=['cardiac','respiratory','digestive','urinary','endocrine','reproductive'];
type Model='male'|'female';
const MODELS:{id:Model;label:string;dir:string;popular:string[]}[]=[
 {id:'male',label:'Чоловік · тіло',dir:'models/',popular:['heart','brain','liver','stomach','spleen','pancreas','kidney','lung','urinary bladder','trachea','femur','skull']},
 {id:'female',label:'Жінка · тулуб',dir:'models/female/',popular:['uterus','ovary','uterine tube','breast','vagina','kidney','liver','pancreas','spleen','urinary bladder','hip bone','vertebral column']},
];
/** Intro chapters: each one adds a layer of systems to the turning body. */
const LAYERS:{title:string;systems:SystemId[];text:Record<Model,string>}[]=[
 {title:'Скелет',systems:['skeletal','connective'],text:{male:'Кістки, хрящі та зв\'язки. Клацніть будь-яку кістку, щоб побачити її назву українською та латиною.',female:'Хребет і кістки таза: опора тулуба й захист органів малого таза.'}},
 {title:'Серце й судини',systems:['cardiac','arterial','venous'],text:{male:'Серце, артерії та вени: кровоносне русло від аорти до найдрібніших гілок.',female:'Аорта, порожнисті вени та їхні гілки до органів черевної порожнини й таза.'}},
 {title:'Органи й нерви',systems:['nervous','sensory','respiratory','digestive','urinary','endocrine','lymphatic','reproductive'],text:{male:'Мозок і нерви, легені, травні й сечові органи. Кожен можна ізолювати, розрізати й підписати.',female:'Матка, яєчники, маткові труби, нирки, печінка, кишечник і молочні залози.'}},
 {title:'М\'язи',systems:['muscular'],text:{male:'Понад 400 м\'язів поверх скелета. «Скляне тіло» й «Рентген» дозволяють заглянути під них.',female:''}},
];
const TIPS:Record<string,string>={
 select:'Ctrl + клік додає ще структури до вибору, а «Ізолювати» (I) лишає на екрані тільки вибране.',
 glass:'У «Скляному тілі» вибране лишається непрозорим. Оберіть орган, і його буде видно крізь тіло.',
 section:'Тягніть повзунок, щоб рухати площину зрізу. Площину можна змінити: поперечна, фронтальна, сагітальна.',
 scan:'Клацніть назву в списку сканера, щоб відкрити цю структуру.',
 female:'Жіноча модель — тулуб: хребет, таз, органи черевної порожнини й малого таза, судини, молочні залози.',
 labels:'Підписи з\'являються біля вибраних структур. Мову (українська чи латина) змінюють у меню «Вигляд».',
};
const PAGE=60;
const SHORTCUTS:[string,string][]=[['/','Пошук'],['Esc','Скасувати вибір, закрити панель'],['Ctrl + клік','Вибрати кілька структур'],['I','Ізолювати вибране'],['H','Сховати вибране'],['U','Показати приховане'],['F','Наблизити до вибраного'],['+ / −','Масштаб'],['0','Вписати тіло в екран'],['1–5','Спереду, ззаду, зліва, справа, згори'],['L','Підписи'],['G','Скляне тіло'],['S','Сканер']];
function plural(n:number,one:string,few:string,many:string){const m10=n%10,m100=n%100;return m10===1&&m100!==11?one:m10>=2&&m10<=4&&(m100<12||m100>14)?few:many;}
function Marked({name,tokens}:{name:string;tokens:QueryToken[]}){return <>{highlight(name,tokens).map((p,i)=>p.hit?<mark key={i}>{p.text}</mark>:<span key={i}>{p.text}</span>)}</>;}
function read<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}}
function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* storage may be blocked */}}
function storedTheme():Theme{const t=read<string>('atlas-theme-v2','');if(t==='light'||t==='dark')return t;return typeof matchMedia!=='undefined'&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
function useWide(){const [wide,setWide]=useState(()=>typeof innerWidth==='undefined'||innerWidth>=900);useEffect(()=>{const r=()=>setWide(innerWidth>=900);addEventListener('resize',r);return()=>removeEventListener('resize',r);},[]);return wide;}
interface Note {name:string;text:string;updated:number}
interface Visit {id:string;name:string;time:number}
function Section({title,icon,children,extra}:{title:string;icon?:ReactNode;children:ReactNode;extra?:ReactNode}){return <section className="side-section"><header>{icon}<h2>{title}</h2>{extra}</header>{children}</section>;}
function Segmented<V extends string|null>({value,options,onChange,label,className=''}:{value:V;options:{id:V;label:string}[];onChange:(v:V)=>void;label:string;className?:string}){return <div className={`segmented ${className}`} role="group" aria-label={label}>{options.map(o=><button key={String(o.id)} aria-pressed={value===o.id} onClick={()=>onChange(o.id)}>{o.label}</button>)}</div>;}

const initial:SceneState={explode:0,visible:DEFAULT_VISIBLE,selected:[],isolate:false,view:'three-quarter',rotate:false,reset:0,hidden:[],xray:[],glass:false,labels:'uk',section:null,scan:{on:false,hold:false,position:0}};

export default function Home(){
 const wide=useWide();
 const [model,setModel]=useState<Model>(()=>read<Model>('atlas-model','male')==='female'?'female':'male'),[atlas,setAtlas]=useState<Atlas|null>(null),[state,setState]=useState(initial),[progress,setProgress]=useState(0),[error,setError]=useState('');
 const [tab,setTab]=useState<'atlas'|'study'>('atlas'),[drawer,setDrawer]=useState(false),[details,setDetails]=useState(false),[about,setAbout]=useState(false),[help,setHelp]=useState(false);
 const [query,setQuery]=useState(''),[filterSystem,setFilterSystem]=useState<SystemId|null>(null),[limit,setLimit]=useState(PAGE),[cursor,setCursor]=useState(0);
 const [chosen,setChosen]=useState<Concept|null>(null),[history,setHistory]=useState<Concept[]>([]);
 const [theme,setTheme]=useState<Theme>(storedTheme),[zoom,setZoom]=useState({id:0,factor:1}),[focus,setFocus]=useState(0),[snapshot,setSnapshot]=useState(0);
 const [scan,setScan]=useState<ScanReport>({position:0,crossing:[]}),[notes,setNotes]=useState<Record<string,Note>>(()=>read('atlas-notes',{})),[visits,setVisits]=useState<Visit[]>(()=>read('atlas-visits',[])),[showCoverage,setShowCoverage]=useState(false),[toast,setToast]=useState('');
 // The intro shows once per browser session; the step-by-step guide follows it on the first ever visit.
 // The animated intro opens on every visit; the spotlight tour follows it until the reader has finished it once.
 const [intro,setIntro]=useState(()=>!new URLSearchParams(location.search).has('nointro'));
 const [guide,setGuide]=useState<number|null>(()=>new URLSearchParams(location.search).has('nointro')&&!read('atlas-tour-done',false)?0:null);
 const [entering,setEntering]=useState(false),[tip,setTip]=useState<string|null>(null),[tourModel,setTourModel]=useState<Model>('male');
 const closeIntro=()=>{setIntro(false);setState(s=>({...initial,labels:s.labels,reset:s.reset+1}));setEntering(true);setTimeout(()=>setEntering(false),1600);if(!read('atlas-tour-done',false))setTimeout(()=>setGuide(0),1100);};
 const [feedback,setFeedback]=useState(false),[fbKind,setFbKind]=useState('Ідея'),[fbText,setFbText]=useState(''),[fbName,setFbName]=useState(''),[fbContact,setFbContact]=useState(''),[copied,setCopied]=useState(false);
 const openSearch=()=>{setTab('atlas');setDrawer(true);setTimeout(()=>searchInput.current?.focus(),60);};
 const closeGuide=()=>{setGuide(null);write('atlas-tour-done',true);};
 const startGuide=()=>{setDrawer(false);setHelp(false);setGuide(0);};
 const searchInput=useRef<HTMLInputElement>(null),[searchFocused,setSearchFocused]=useState(false);

 const modelInfo=MODELS.find(m=>m.id===model)!;
 useEffect(()=>{write('atlas-model',model);const abort=new AbortController();setAtlas(null);setProgress(0);setError('');setChosen(null);setDetails(false);setHistory([]);setQuery('');setFilterSystem(null);setScan({position:0,crossing:[]});setState(s=>({...initial,labels:s.labels,reset:s.reset+1}));const dir=MODELS.find(m=>m.id===model)!.dir;const load=(url:string)=>fetch(url,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Не вдалося завантажити анатомічний каталог.');return r.json();});
  Promise.all([load(dir+'atlas.json'),load(dir+'names-uk.json'),load(dir+'names-la.json')]).then(([data,uk,la])=>setAtlas(localizeAtlas(data as Atlas,uk as Record<string,string>,la as Record<string,string>))).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>abort.abort();},[model]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name=theme-color]')?.setAttribute('content',theme==='dark'?'#0b1016':'#eef1f3');write('atlas-theme-v2',theme);},[theme]);
 useEffect(()=>write('atlas-notes',notes),[notes]);useEffect(()=>write('atlas-visits',visits),[visits]);
 // A cached copy of the page reloads itself once when a newer build has been published.
 useEffect(()=>{fetch('version.json',{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<{build?:string}>:null).then(v=>{if(!v?.build||v.build===__BUILD__)return;try{if(sessionStorage.getItem('atlas-reloaded')===v.build)return;sessionStorage.setItem('atlas-reloaded',v.build);}catch{return;}location.reload();}).catch(()=>{});},[]);
 useEffect(()=>{if(!tip)return;const t=setTimeout(()=>setTip(null),7000);return()=>clearTimeout(t);},[tip]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2200);return()=>clearTimeout(t);},[toast]);

 const parts=useMemo(()=>new Map(atlas?.parts.map(p=>[p.id,p])),[atlas]);
 const counts=useMemo(()=>Object.fromEntries(SYSTEMS.map(s=>[s.id,atlas?.parts.filter(p=>p.system===s.id).length??0])),[atlas]);
 const activeSystems=SYSTEMS.filter(s=>counts[s.id]>0);
 const selectedParts=state.selected.map(id=>parts.get(id)).filter(p=>!!p),selected=selectedParts[0],system=SYSTEMS.find(s=>s.id===selected?.system);
 const index=useMemo(()=>atlas?buildIndex(atlas.concepts):[],[atlas]);
 /** A concept belongs to the system that most of its pieces belong to. */
 const conceptSystem=useMemo(()=>{const m=new Map<string,SystemId>();for(const c of atlas?.concepts??[]){const tally=new Map<SystemId,number>();for(const id of c.elements){const p=parts.get(id);if(p)tally.set(p.system,(tally.get(p.system)??0)+1);}const best=[...tally].sort((a,b)=>b[1]-a[1])[0];if(best)m.set(c.id,best[0]);}return m;},[atlas,parts]);
 const conceptsByPart=useMemo(()=>{const m=new Map<string,Concept[]>();for(const c of atlas?.concepts??[])for(const id of c.elements){const list=m.get(id);if(list)list.push(c);else m.set(id,[c]);}return m;},[atlas]);
 const conceptById=useMemo(()=>new Map(atlas?.concepts.map(c=>[c.id,c])),[atlas]);
 const tokens=useMemo(()=>tokenize(query),[query]);
 const searching=tokens.length>0||!!filterSystem;
 const results=useMemo(()=>{if(!atlas)return[];const inSystem=filterSystem?(c:Concept)=>conceptSystem.get(c.id)===filterSystem:undefined;if(tokens.length)return searchConcepts(index,query,inSystem);if(inSystem)return atlas.concepts.filter(inSystem).sort((a,b)=>a.name.localeCompare(b.name,'uk'));return modelInfo.popular.map(name=>atlas.concepts.find(c=>(c.nameEn??c.name).toLowerCase()===name)).filter((x):x is Concept=>!!x);},[atlas,index,query,tokens,filterSystem,conceptSystem,modelInfo]);
 useEffect(()=>{setLimit(PAGE);setCursor(0);},[query,filterSystem]);
 const shown=results.slice(0,limit);
 const parents=useMemo(()=>{if(!chosen||!state.selected.length)return[];const first=conceptsByPart.get(state.selected[0])??[];return first.filter(c=>c.id!==chosen.id&&c.elements.length>state.selected.length&&state.selected.every(id=>c.elements.includes(id))).sort((a,b)=>a.elements.length-b.elements.length).slice(0,6);},[chosen,state.selected,conceptsByPart]);
 const coverage=useMemo(()=>{if(!showCoverage||!atlas)return null;const score:Record<string,number>={};const add=(c:Concept|undefined,w:number)=>c?.elements.forEach(id=>{score[id]=(score[id]??0)+w;});visits.forEach(v=>add(conceptById.get(v.id),1));Object.keys(notes).forEach(id=>add(conceptById.get(id),3));const max=Math.max(1,...Object.values(score));for(const k in score)score[k]=.3+.7*score[k]/max;return score;},[showCoverage,atlas,visits,notes,conceptById]);

 const chapters=useMemo(()=>{const out:(Chapter&{visible:SystemId[]})[]=[];let visible:SystemId[]=[];for(const layer of LAYERS){const present=layer.systems.filter(id=>counts[id]>0);if(!present.length||!layer.text[model])continue;visible=[...visible,...present];out.push({title:layer.title,text:layer.text[model],count:present.reduce((a,id)=>a+counts[id],0),color:SYSTEMS.find(x=>x.id===present[0])!.color,visible});}return out;},[counts,model]);
 /** The intro shows one more layer of the body per chapter while the camera circles it. */
 const onChapter=(i:number)=>{const visible=i===0?[]:i>chapters.length?DEFAULT_VISIBLE:chapters[i-1].visible;setState(s=>({...s,visible,selected:[],isolate:false,hidden:[],xray:[],glass:false,explode:0,section:null,scan:{on:false,hold:false,position:0},rotate:true,spin:2.4}));};
 const showTip=(key:string)=>{if(intro||guide!==null)return;const seen=read<string[]>('atlas-tips',[]);if(seen.includes(key))return;write('atlas-tips',[...seen,key]);setTip(TIPS[key]);};
 useEffect(()=>{if(state.selected.length)showTip('select');// eslint-disable-next-line react-hooks/exhaustive-deps
 },[state.selected.length>0]);
 useEffect(()=>{if(state.glass)showTip('glass');// eslint-disable-next-line react-hooks/exhaustive-deps
 },[state.glass]);
 useEffect(()=>{if(state.section)showTip('section');// eslint-disable-next-line react-hooks/exhaustive-deps
 },[!!state.section]);
 useEffect(()=>{if(state.scan?.on)showTip('scan');// eslint-disable-next-line react-hooks/exhaustive-deps
 },[state.scan?.on]);
 useEffect(()=>{if(model==='female'&&atlas)showTip('female');// eslint-disable-next-line react-hooks/exhaustive-deps
 },[model,atlas]);
 // The tour starts from a clean view and remembers the model, so switching it can count as done.
 useEffect(()=>{if(guide===0){setTourModel(model);clear();}// eslint-disable-next-line react-hooks/exhaustive-deps
 },[guide===0]);
 useEffect(()=>{if(!wide&&guide!==null&&guide>6)setDrawer(false);},[guide,wide]);

 const insets:Insets=useMemo(()=>intro?(wide?{left:Math.min(600,Math.round(innerWidth*.46)),right:24,top:80,bottom:110}:{left:0,right:0,top:70,bottom:Math.round(innerHeight*.5)}):wide?{left:(drawer||wide)?356:0,right:details&&selectedParts.length?430:12,top:64,bottom:96}:{left:0,right:0,top:84,bottom:details&&selectedParts.length?Math.round(innerHeight*.5):150},[intro,wide,drawer,details,selectedParts.length]);
 const zoomBy=(factor:number)=>setZoom(z=>({id:z.id+1,factor}));
 const patch=useCallback((p:Partial<SceneState>)=>setState(s=>({...s,...p})),[]);

 const remember=()=>{if(chosen&&details)setHistory(h=>[...h.slice(-19),chosen]);};
 const visit=(c:Concept)=>setVisits(v=>[{id:c.id,name:c.name,time:Date.now()},...v.filter(x=>x.id!==c.id)].slice(0,60));
 const choose=(c:Concept)=>{searchInput.current?.blur();remember();setChosen(c);visit(c);setState(s=>({...s,selected:c.elements,isolate:false,rotate:false}));setDetails(true);if(!wide)setDrawer(false);};
 const back=()=>{const prev=history[history.length-1];if(!prev)return;setHistory(h=>h.slice(0,-1));setChosen(prev);setState(s=>({...s,selected:prev.elements,isolate:false}));setDetails(true);};
 const selectPart=(id:string,additive:boolean)=>{const p=parts.get(id);if(!p)return;
  if(additive&&state.selected.length){const next=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];if(!next.length){clear();return;}setChosen({id:'selection',name:`Вибрано: ${next.length} ${plural(next.length,'структура','структури','структур')}`,elements:next});setState(s=>({...s,selected:next,isolate:false}));setDetails(true);return;}
  remember();const c=atlas?.concepts.find(x=>x.id===p.conceptId&&x.elements.length===1&&x.elements[0]===id)??{id:p.conceptId,name:p.name,nameEn:p.nameEn,nameLa:p.nameLa,elements:[id]};setChosen(c);visit(c);setState(s=>({...s,selected:[id],isolate:false,rotate:false}));setDetails(true);};
 const clear=()=>{setState(s=>({...s,selected:[],isolate:false}));setDetails(false);setChosen(null);};
 const hideSelected=()=>{if(!state.selected.length)return;const n=state.selected.length;setState(s=>({...s,hidden:[...new Set([...(s.hidden??[]),...s.selected])],selected:[],isolate:false}));setDetails(false);setToast(`Сховано: ${n}. Натисніть U, щоб повернути.`);};
 const addVessels=()=>{if(!atlas||!selectedParts.length)return;const box=selectedParts.reduce((b,p)=>[[Math.min(b[0][0],p.bounds[0][0]),Math.min(b[0][1],p.bounds[0][1]),Math.min(b[0][2],p.bounds[0][2])],[Math.max(b[1][0],p.bounds[1][0]),Math.max(b[1][1],p.bounds[1][1]),Math.max(b[1][2],p.bounds[1][2])]],[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]]);const m=.012;
  const vessels=atlas.parts.filter(p=>(p.system==='arterial'||p.system==='venous')&&!state.selected.includes(p.id)&&[0,1,2].every(k=>p.bounds[0][k]<=box[1][k]+m&&p.bounds[1][k]>=box[0][k]-m)).slice(0,120);
  if(!vessels.length){setToast('Поруч не знайдено судин.');return;}setState(s=>({...s,selected:[...s.selected,...vessels.map(v=>v.id)],visible:[...new Set([...s.visible,'arterial','venous'] as SystemId[])]}));setChosen(c=>c&&{...c,elements:[...c.elements,...vessels.map(v=>v.id)]});setToast(`Додано судин поруч: ${vessels.length}.`);};
 const toggleSystem=(id:SystemId)=>setState(s=>({...s,selected:[],isolate:false,visible:s.visible.includes(id)?s.visible.filter(x=>x!==id):[...s.visible,id]}));
 const toggleXray=(id:SystemId)=>setState(s=>({...s,visible:s.visible.includes(id)?s.visible:[...s.visible,id],xray:(s.xray??[]).includes(id)?(s.xray??[]).filter(x=>x!==id):[...(s.xray??[]),id]}));
 const solo=(id:SystemId)=>setState(s=>({...s,visible:[id],xray:[],isolate:false,selected:[]}));
 const reset=()=>{setState(s=>({...initial,labels:s.labels,reset:s.reset+1}));setChosen(null);setDetails(false);setHistory([]);};
 const setView=(view:View)=>setState(s=>({...s,view,reset:s.reset+1,rotate:false}));
 const setNote=(c:Concept,text:string)=>setNotes(n=>{const next={...n};if(text.trim())next[c.id]={name:c.name,text,updated:Date.now()};else delete next[c.id];return next;});

 useEffect(()=>{if(!atlas)return;return registerAtlasTools(atlas,c=>flushSync(()=>choose(c)));// eslint-disable-next-line react-hooks/exhaustive-deps
 },[atlas]);
 const keys=useRef<(e:KeyboardEvent)=>void>(()=>{});
 keys.current=(e:KeyboardEvent)=>{
  const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement;
  if(e.key==='Escape'){if(typing){(e.target as HTMLElement).blur();return;}if(feedback){setFeedback(false);return;}if(intro)return;if(guide!==null){closeGuide();return;}if(help){setHelp(false);return;}if(drawer&&!wide){setDrawer(false);return;}if(state.isolate){patch({isolate:false});return;}clear();return;}
  if(typing||e.ctrlKey||e.metaKey||e.altKey||intro||feedback)return;
  if(e.key==='/'){e.preventDefault();setTab('atlas');setDrawer(true);setTimeout(()=>searchInput.current?.focus(),30);return;}
  if(e.key==='+'||e.key==='='){zoomBy(.75);return;}if(e.key==='-'||e.key==='_'){zoomBy(1/.75);return;}if(e.key==='?'){setHelp(h=>!h);return;}
  const view=VIEWS.find(v=>v.key===e.key);if(view){setView(view.id);return;}
  switch(e.code){
   case 'Digit0':case 'Numpad0':setView(state.view==='three-quarter'?'front':'three-quarter');break;
   case 'KeyI':if(state.selected.length)patch({isolate:!state.isolate,explode:0});break;
   case 'KeyH':hideSelected();break;
   case 'KeyU':patch({hidden:[]});break;
   case 'KeyF':setFocus(f=>f+1);break;
   case 'KeyL':setState(s=>({...s,labels:s.labels?null:'uk'}));break;
   case 'KeyG':setState(s=>({...s,glass:!s.glass}));break;
   case 'KeyS':setState(s=>({...s,scan:{...s.scan!,on:!s.scan?.on,hold:false}}));break;
  }
 };
 useEffect(()=>{const k=(e:KeyboardEvent)=>keys.current(e);addEventListener('keydown',k);return()=>removeEventListener('keydown',k);},[]);

 const visibleCount=atlas?.parts.filter(p=>!(state.hidden??[]).includes(p.id)&&(state.isolate?state.selected.includes(p.id):state.visible.includes(p.system)||state.selected.includes(p.id))).length??0;
 const sidebarOpen=wide||drawer;
 const crossingNames=scan.crossing.slice(0,6).map(id=>parts.get(id)).filter(p=>!!p);
 const note=chosen&&chosen.id!=='selection'?notes[chosen.id]?.text??'':'';

 return <main className={`studio ${entering?'entering':''} ${intro?'in-intro':''} ${sidebarOpen?'with-sidebar':''} ${details&&selectedParts.length?'with-detail':''}`}>
  {atlas&&<AnatomyScene key={model} atlas={atlas} state={{...state,inspectorOpen:details&&selectedParts.length>0,theme,zoom,focus,snapshot,coverage:state.scan?.on?null:coverage,insets}} onSelect={selectPart} onProgress={n=>{setProgress(n);if(n===100)setError('');}} onError={setError} onScan={setScan}/>}

  {/* Sidebar */}
  {!wide&&drawer&&<div className="scrim" onClick={()=>setDrawer(false)}/>}
  <aside className={`sidebar ${sidebarOpen?'open':''}`} aria-label="Панель атласу">
   <div className="brand"><button className="brand-mark" onClick={()=>setIntro(true)} aria-label="Показати вступ" title="Про атлас"><span/></button><div><strong>Атлас людини <em>3D</em></strong><small>{atlas?atlas.parts.length.toLocaleString('uk'):'…'} структур · українською й латиною</small></div>{!wide&&<button className="icon-btn" onClick={()=>setDrawer(false)} aria-label="Закрити меню"><X size={20}/></button>}</div>
   <nav className="tabs" role="tablist"><button role="tab" aria-selected={tab==='atlas'} onClick={()=>setTab('atlas')}><Search size={16}/>Атлас</button><button role="tab" aria-selected={tab==='study'} onClick={()=>setTab('study')}><BookOpen size={16}/>Навчання{Object.keys(notes).length>0&&<b>{Object.keys(notes).length}</b>}</button></nav>
   <div className="side-scroll">
   {tab==='atlas'?<>
    <div className="search-field"><Search size={18}/><input ref={searchInput} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Пошук: ліва нирка, femur, arteria…" aria-label="Пошук анатомічних структур" onFocus={()=>setSearchFocused(true)} onBlur={()=>setTimeout(()=>setSearchFocused(false),200)} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setCursor(c=>Math.min(c+1,shown.length-1));}else if(e.key==='ArrowUp'){e.preventDefault();setCursor(c=>Math.max(c-1,0));}else if(e.key==='Enter'&&shown[cursor]){e.preventDefault();choose(shown[cursor]);}}}/>{query?<button className="icon-btn small" onClick={()=>{setQuery('');searchInput.current?.focus();}} aria-label="Очистити пошук"><X size={16}/></button>:<kbd>/</kbd>}</div>
    <div className="chips" role="group" aria-label="Фільтр за системою"><button aria-pressed={!filterSystem} onClick={()=>setFilterSystem(null)}>Усі</button>{activeSystems.map(s=><button key={s.id} aria-pressed={filterSystem===s.id} onClick={()=>setFilterSystem(f=>f===s.id?null:s.id)}><i style={{background:s.color}}/>{s.name}</button>)}</div>
    {searching||searchFocused?<div className="results">
     <div className="results-head">{tokens.length?(results.length?`Знайдено ${results.length.toLocaleString('uk')} ${plural(results.length,'структуру','структури','структур')}`:'Нічого не знайдено'):filterSystem?`${SYSTEMS.find(x=>x.id===filterSystem)?.name}: ${results.length.toLocaleString('uk')} за абеткою`:'Популярні органи'}{searching&&<button onClick={()=>{setQuery('');setFilterSystem(null);}}>Скинути</button>}</div>
     <div role="listbox" aria-label="Результати пошуку">{shown.map((c,i)=><button role="option" aria-selected={i===cursor} key={c.id} style={{'--i':Math.min(i%PAGE,14)} as CSSProperties} className={`result ${i===cursor?'current':''}`} onMouseMove={()=>{if(cursor!==i)setCursor(i);}} onClick={()=>choose(c)}><i style={{background:SYSTEMS.find(x=>x.id===conceptSystem.get(c.id))?.color}}/><span><b><Marked name={c.name} tokens={tokens}/></b>{c.nameLa&&<em><Marked name={c.nameLa} tokens={tokens}/></em>}</span><small>{c.elements.length}</small></button>)}
      {results.length>shown.length&&<button className="more" onClick={()=>setLimit(l=>l+PAGE)}>Показати ще ({(results.length-shown.length).toLocaleString('uk')})</button>}
      {tokens.length>0&&!results.length&&<p className="empty">Спробуйте коротше слово або іншу мову. Слова можна вводити в будь-якому порядку.</p>}</div>
    </div>:<>
     <Section title="Системи" extra={<span className="count">{visibleCount.toLocaleString('uk')} видно</span>}>
      <div className="segmented presets"><button aria-pressed={activeSystems.every(x=>state.visible.includes(x.id))} onClick={()=>patch({visible:activeSystems.map(x=>x.id),selected:[],isolate:false,xray:[]})}>Усі</button><button aria-pressed={state.visible.length===1&&state.visible[0]==='skeletal'} onClick={()=>patch({visible:['skeletal'],selected:[],isolate:false,xray:[]})}>Скелет</button><button aria-pressed={state.visible.length===ORGANS.length&&ORGANS.every(id=>state.visible.includes(id))} onClick={()=>patch({visible:ORGANS,selected:[],isolate:false,xray:[]})}>Органи</button><button aria-pressed={!state.visible.length} onClick={()=>patch({visible:[],selected:[],isolate:false})}>Жодної</button></div>
      <ul className="systems">{activeSystems.map(s=>{const on=state.visible.includes(s.id),xr=(state.xray??[]).includes(s.id);return <li key={s.id} className={on?'on':''}>
       <button className="sys-toggle" onClick={()=>toggleSystem(s.id)} aria-pressed={on} title={on?'Сховати систему':'Показати систему'}><span className="check">{on?<Eye size={15}/>:<EyeOff size={15}/>}</span><i style={{background:s.color}}/><span className="sys-name">{s.name}</span><small>{counts[s.id]}</small></button>
       <button className={`mini ${xr?'active':''}`} onClick={()=>toggleXray(s.id)} aria-pressed={xr} title="Рентген: зробити систему напівпрозорою">Рентген</button>
       <button className="mini" onClick={()=>solo(s.id)} title="Показати лише цю систему">Соло</button></li>;})}</ul>
     </Section>
     <Section title="Вигляд" icon={<Ghost size={16}/>}>
      <label className="toggle-row"><span><b>Скляне тіло</b><small>Усе, крім вибраного, стає напівпрозорим</small></span><Switch checked={!!state.glass} onCheckedChange={v=>patch({glass:!!v})}/></label>
      <div className="row-label"><Tags size={15}/>Підписи вибраного</div><Segmented<LabelMode> label="Мова підписів" value={state.labels??null} onChange={v=>patch({labels:v})} options={[{id:null,label:'Вимк.'},{id:'uk',label:'Українською'},{id:'la',label:'Латиною'}]}/>
      <div className="row-label">Розібрати на елементи<output>{Math.round(state.explode*100)}%</output></div>
      <Slider aria-label="Розібрати анатомію" min={0} max={100} step={1} value={[state.explode*100]} onValueChange={v=>{const n=(Array.isArray(v)?v[0]:v)/100;setState(s=>({...s,explode:n,view:n>.8?'front':s.view,rotate:false,section:n>.05?null:s.section,scan:{...s.scan!,on:n>.05?false:!!s.scan?.on}}));}}/>
      <div className="slider-ends"><span>Зібрано</span><span>Кожен елемент окремо</span></div>
     </Section>
     <Section title="Зріз" icon={<Scissors size={16}/>}>
      <Segmented<SectionAxis|null> className="grid2" label="Площина зрізу" value={state.section?.axis??null} onChange={axis=>patch({section:axis?{axis,position:state.section?.position??.35}:null,explode:0})} options={[{id:null,label:'Вимк.'},...SECTIONS]}/>
      {state.section&&<><Slider aria-label="Положення зрізу" min={0} max={1000} step={1} value={[state.section.position*1000]} onValueChange={v=>{const n=(Array.isArray(v)?v[0]:v)/1000;setState(s=>s.section?{...s,section:{...s.section,position:n}}:s);}}/><div className="slider-ends"><span>{state.section.axis==='axial'?'Голова':state.section.axis==='coronal'?'Спереду':'Праворуч'}</span><span>{state.section.axis==='axial'?'Стопи':state.section.axis==='coronal'?'Ззаду':'Ліворуч'}</span></div></>}
     </Section>
     <Section title="Сканер" icon={<ScanLine size={16}/>}>
      <p className="hint">Площина світла проходить тілом і підсвічує кожну структуру, яку перетинає, називаючи її.</p>
      <div className="button-row"><button className={`btn ${state.scan?.on?'accent':''}`} onClick={()=>setState(s=>({...s,explode:0,scan:{on:!s.scan?.on,hold:false,position:scan.position}}))}>{state.scan?.on?<><Pause size={16}/>Зупинити</>:<><ScanLine size={16}/>Запустити сканер</>}</button></div>
      {state.scan?.on&&<><div className="row-label">Утримати на рівні<output>{Math.round((state.scan.hold?state.scan.position:scan.position)*100)}%</output></div><Slider aria-label="Рівень сканера" min={0} max={1000} step={1} value={[(state.scan.hold?state.scan.position:scan.position)*1000]} onValueChange={v=>{const n=(Array.isArray(v)?v[0]:v)/1000;setState(s=>({...s,scan:{on:true,hold:true,position:n}}));}}/>{state.scan.hold&&<button className="link" onClick={()=>setState(s=>({...s,scan:{...s.scan!,hold:false}}))}>Продовжити рух</button>}</>}
     </Section>
     <Section title="Дії">
      <div className="button-row stack"><button className="btn" onClick={()=>setSnapshot(n=>n+1)}><Camera size={16}/>Зберегти зображення</button><button className="btn" onClick={reset}><RotateCcw size={16}/>Скинути все</button></div>
      {(state.hidden?.length??0)>0&&<button className="btn wide" onClick={()=>patch({hidden:[]})}><Eye size={16}/>Показати приховані ({state.hidden!.length})</button>}
     </Section>
    </>}
   </>:<>
    <Section title="Карта вивченого" icon={<Activity size={16}/>}>
     <label className="toggle-row"><span><b>Показати вивчене на тілі</b><small>Структури, які ви відкривали або до яких писали нотатки, світяться. Чим більше, тим яскравіше.</small></span><Switch checked={showCoverage} onCheckedChange={v=>setShowCoverage(!!v)}/></label>
    </Section>
    <Section title="Нотатки" icon={<NotebookPen size={16}/>} extra={<span className="count">{Object.keys(notes).length}</span>}>
     {Object.keys(notes).length?<ul className="study-list">{Object.entries(notes).sort((a,b)=>b[1].updated-a[1].updated).map(([id,n])=><li key={id}><button onClick={()=>{const c=conceptById.get(id);if(c)choose(c);}}><b>{n.name}</b><span>{n.text}</span></button></li>)}</ul>:<p className="hint">Відкрийте структуру й напишіть нотатку в її картці. Нотатки зберігаються лише в цьому браузері.</p>}
    </Section>
    <Section title="Нещодавно переглянуте" icon={<History size={16}/>} extra={visits.length>0&&<button className="link" onClick={()=>setVisits([])}><Trash2 size={14}/>Очистити</button>}>
     {visits.length?<ul className="study-list compact">{visits.slice(0,30).map(v=><li key={v.id}><button onClick={()=>{const c=conceptById.get(v.id);if(c)choose(c);}}><b>{v.name}</b><time>{new Date(v.time).toLocaleString('uk',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time></button></li>)}</ul>:<p className="hint">Тут з'являться структури, які ви відкривали.</p>}
    </Section>
   </>}
   </div>
   <div className="side-author"><div className="avatar" aria-hidden="true">{AUTHOR.name.split(' ').map(w=>w[0]).join('')}</div><div className="who"><small>Автор</small><b>{AUTHOR.name}</b></div><div className="socials">{AUTHOR_LINKS.map(l=><a key={l.id} href={l.url} target="_blank" rel="noreferrer" aria-label={l.label} title={l.label}><BrandIcon id={l.id} size={17}/></a>)}<button onClick={()=>setFeedback(true)} aria-label="Надіслати відгук" title="Надіслати відгук"><MessageSquareHeart size={17}/></button></div></div>
   <p className="side-note">{model==="female"?"Жіноча модель: HRA / HuBMAP, CC BY 4.0. ":""}Навчальний ресурс, не для діагностики чи лікування. Версія {__BUILD__}.</p>
   <footer className="side-foot">{!wide&&<button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>}{theme==='dark'?'Світла тема':'Темна тема'}</button>}<button onClick={startGuide}><CircleHelp size={15}/>Навчання</button><button onClick={()=>setAbout(true)}><Info size={15}/>Джерела</button></footer>
  </aside>

  {/* Top bar */}
  <div className="topbar">
   {!wide&&<button className="menu-btn raised" onClick={()=>setDrawer(true)} aria-label="Меню"><Menu size={20}/><span>Меню</span></button>}
   <div className="model-pill" role="group" aria-label="Модель тіла">
    <button aria-pressed={model==='male'} onClick={()=>setModel('male')}><Mars size={18}/><span><b>Чоловік</b><small>усе тіло</small></span></button>
    <button aria-pressed={model==='female'} onClick={()=>setModel('female')}><Venus size={18}/><span><b>Жінка</b><small>тулуб</small></span></button>
   </div>
   <div className="top-actions">
    {wide&&<button className="icon-btn raised" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} aria-label={theme==='dark'?'Світла тема':'Темна тема'} title={theme==='dark'?'Світла тема':'Темна тема'}>{theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button>}
    <button className="feedback-btn raised" onClick={()=>setFeedback(true)} aria-label="Надіслати відгук" title="Надіслати відгук"><MessageSquareHeart size={19}/><span>Відгук</span></button>
    {wide&&<button className="icon-btn raised help-btn" onClick={startGuide} aria-label="Навчання: як користуватися" title="Навчання: як користуватися"><CircleHelp size={20}/></button>}
   </div>
  </div>

  {/* Quick tools: the most used modes, always on screen */}
  <div className="quickbar" role="toolbar" aria-label="Швидкі інструменти">
   <button onClick={openSearch}><Search size={17}/><span>Пошук</span></button>
   <button aria-pressed={!!state.glass} onClick={()=>patch({glass:!state.glass})}><Ghost size={17}/><span>Скляне тіло</span></button>
   <button aria-pressed={!!state.labels} onClick={()=>patch({labels:state.labels?null:'uk'})}><Tags size={17}/><span>Підписи</span></button>
   <button aria-pressed={!!state.section} onClick={()=>patch({section:state.section?null:{axis:'axial',position:.35},explode:0})}><Scissors size={17}/><span>Зріз</span></button>
   <button aria-pressed={!!state.scan?.on} onClick={()=>setState(s=>({...s,explode:0,scan:{on:!s.scan?.on,hold:false,position:scan.position}}))}><ScanLine size={17}/><span>Сканер</span></button>
   {!wide&&<button onClick={()=>{setTab('atlas');setDrawer(true);}}><SlidersHorizontal size={17}/><span>Усі налаштування</span></button>}
  </div>

  {state.section&&<div className="tool-pop glass" aria-label="Налаштування зрізу"><div className="tool-pop-head"><Scissors size={15}/>Зріз<button className="icon-btn small" onClick={()=>patch({section:null})} aria-label="Вимкнути зріз"><X size={16}/></button></div>
   <Segmented<SectionAxis> label="Площина зрізу" value={state.section.axis} onChange={axis=>setState(s=>({...s,section:{axis,position:s.section?.position??.35}}))} options={SECTIONS}/>
   <Slider aria-label="Положення зрізу" min={0} max={1000} step={1} value={[state.section.position*1000]} onValueChange={v=>{const n=(Array.isArray(v)?v[0]:v)/1000;setState(s=>s.section?{...s,section:{...s.section,position:n}}:s);}}/>
   <div className="slider-ends"><span>{state.section.axis==='axial'?'Голова':state.section.axis==='coronal'?'Спереду':'Праворуч'}</span><span>{state.section.axis==='axial'?'Низ':state.section.axis==='coronal'?'Ззаду':'Ліворуч'}</span></div></div>}

  {/* Scanner readout */}
  {state.scan?.on&&<div className="scan-panel glass"><div className="scan-title"><ScanLine size={15}/>Перетинає зараз<span>{Math.round((state.scan.hold?state.scan.position:scan.position)*100)}%</span></div>
   {crossingNames.length?<ul>{crossingNames.map(p=><li key={p.id}><button onClick={()=>selectPart(p.id,false)}>{p.name}{p.nameLa&&<em>{p.nameLa}</em>}</button></li>)}</ul>:<p>Площина між структурами</p>}
   {scan.crossing.length>6&&<small>і ще {scan.crossing.length-6}</small>}
   <Slider aria-label="Рівень сканера" min={0} max={1000} step={1} value={[(state.scan.hold?state.scan.position:scan.position)*1000]} onValueChange={v=>{const n=(Array.isArray(v)?v[0]:v)/1000;setState(s=>({...s,scan:{on:true,hold:true,position:n}}));}}/>
   <div className="scan-actions">{state.scan.hold?<button className="link" onClick={()=>setState(s=>({...s,scan:{...s.scan!,hold:false}}))}>Продовжити рух</button>:<span>Потягніть повзунок, щоб зупинити на рівні</span>}<button className="link" onClick={()=>setState(s=>({...s,scan:{...s.scan!,on:false}}))}>Вимкнути</button></div></div>}

  {/* Selection bar and camera controls */}
  <div className="dock">
   {state.selected.length>0&&<div className="selection-bar glass"><span className="sel-count">{state.selected.length}</span><span className="sel-name">{chosen?.name??''}</span>
    <button onClick={()=>patch({isolate:!state.isolate,explode:0})} className={state.isolate?'active':''}><Focus size={16}/>{state.isolate?'Усе тіло':'Ізолювати'}<kbd>I</kbd></button>
    <button onClick={hideSelected}><EyeOff size={16}/>Сховати<kbd>H</kbd></button>
    <button onClick={clear}><X size={16}/>Очистити<kbd>Esc</kbd></button></div>}
   {!state.selected.length&&(state.hidden?.length??0)>0&&<div className="selection-bar glass"><span className="sel-name">Приховано: {state.hidden!.length}</span><button onClick={()=>patch({hidden:[]})}><Eye size={16}/>Показати все<kbd>U</kbd></button></div>}
   <div className="camera-bar glass" role="toolbar" aria-label="Камера">
    <button onClick={()=>setView(state.view)} title="Вписати тіло в екран (0)"><Maximize size={17}/><span>Вписати</span></button><i/>
    {VIEWS.map(v=><button key={v.id} className={state.view===v.id?'active':''} onClick={()=>setView(v.id)} title={`${v.label} (${v.key})`} aria-label={v.label} disabled={state.explode>.8&&v.id!=='front'}>{v.short}</button>)}<i/>
    <button className="zoom-btn" onClick={()=>zoomBy(1/.75)} title="Віддалити (−)" aria-label="Віддалити"><ZoomOut size={18}/></button><button className="zoom-btn" onClick={()=>zoomBy(.75)} title="Наблизити (+)" aria-label="Наблизити"><ZoomIn size={18}/></button>
    <button onClick={()=>setFocus(f=>f+1)} disabled={!state.selected.length} title="До вибраної структури (F)" aria-label="До вибраної структури"><LocateFixed size={18}/></button>
    <button className={state.rotate?'active':''} disabled={state.explode>=.4} onClick={()=>patch({rotate:!state.rotate})} title="Автообертання" aria-label={state.rotate?'Зупинити обертання':'Обертати тіло'}>{state.rotate?<Pause size={17}/>:<RotateCw size={17}/>}</button>
   </div>
  </div>

  {/* Detail card */}
  {details&&chosen&&selectedParts.length>0&&<aside className={`detail glass ${state.isolate?'is-isolated':''}`} aria-label="Відомості про структуру" key={chosen.id}>
   <button className="icon-btn close" onClick={clear} aria-label="Закрити"><X size={20}/></button>
   {history.length>0&&<button className="back" onClick={back}><ArrowLeft size={15}/>Назад до «{history[history.length-1].name}»</button>}
   <div className="accent" style={{background:system?.color}}/>
   <div className="eyebrow">{system?.name??'Анатомія'}</div>
   <h1>{chosen.name}</h1>
   {chosen.nameLa&&<p className="latin" lang="la">{chosen.nameLa}</p>}
   <div className="detail-scroll">
    <p className="description">{explanation(chosen.nameEn??chosen.name,selected!.system)}</p>
    {!EXPLANATIONS[(chosen.nameEn??chosen.name).toLowerCase()]&&<p className="note-small">Загальний опис системи, до якої належить структура.</p>}
    <dl className="facts"><div><dt>Система</dt><dd>{system?.name??'—'}</dd></div><div><dt>Елементів моделі</dt><dd>{state.selected.length.toLocaleString('uk')}</dd></div>{chosen.nameEn&&<div className="full"><dt>Англійською</dt><dd lang="en">{chosen.nameEn}</dd></div>}</dl>
    <div className="detail-actions">
     <button className="btn primary" onClick={()=>patch({isolate:!state.isolate,explode:0})}><Focus size={17}/>{state.isolate?'Показати все тіло':'Ізолювати структуру'}</button>
     <div className="button-row"><button className="btn" onClick={()=>setFocus(f=>f+1)}><LocateFixed size={16}/>Наблизити</button><button className="btn" onClick={addVessels}><Plus size={16}/>Судини поруч</button></div>
    </div>
    {chosen.id!=='selection'&&<label className="note-box"><span><NotebookPen size={15}/>Моя нотатка</span><textarea value={note} placeholder="Що важливо запам'ятати про цю структуру…" onChange={e=>setNote(chosen,e.target.value)} rows={3}/></label>}
    {parents.length>0&&<div className="links"><h3>Входить до складу</h3>{parents.map(c=><button key={c.id} onClick={()=>choose(c)}><span>{c.name}{c.nameLa&&<em>{c.nameLa}</em>}</span><ChevronRight size={16}/></button>)}</div>}
    {selectedParts.length>1&&<div className="links"><h3>Складові частини · {selectedParts.length}</h3>{selectedParts.slice(0,40).map(p=><button key={p.id} onClick={()=>selectPart(p.id,false)}><span>{p.name}{p.nameLa&&<em>{p.nameLa}</em>}</span><ChevronRight size={16}/></button>)}{selectedParts.length>40&&<p className="note-small">І ще {selectedParts.length-40}.</p>}</div>}
   </div>
  </aside>}

  {toast&&<div className="toast glass" role="status">{toast}</div>}
  {tip&&!toast&&<div className="tip glass" role="status"><Lightbulb size={18}/><p><b>Порада</b>{tip}</p><button className="icon-btn small" onClick={()=>setTip(null)} aria-label="Закрити пораду"><X size={16}/></button></div>}
  {progress<100&&!error&&!intro&&<div className="loading glass" role="status"><div className="spinner"/><div><strong>Готуємо анатомічну модель</strong><span>{progress}% · {atlas?.parts.length.toLocaleString('uk')??'…'} структур</span><div className="loading-track"><i style={{width:`${progress}%`}}/></div></div></div>}
  {error&&<div className="loading glass error" role="alert"><p>{error}</p><button className="btn" onClick={()=>location.reload()}>Перезавантажити</button></div>}

  {guide!==null&&!intro&&<Tour step={guide} onStep={setGuide} onClose={closeGuide} stage={{x:insets.left+(innerWidth-insets.left-insets.right)/2,y:insets.top+(innerHeight-insets.top-insets.bottom)*.42}} steps={[
   {target:null,title:'Вітаємо в атласі!',text:'Покажемо головне за хвилину. На кожному кроці спробуйте дію самі: підказка перейде далі, щойно все вийде.'},
   {target:null,gesture:'drag',title:'Покрутіть тіло',text:wide?'Тіло можна оглянути з будь-якого боку й наблизити.':'Тіло можна оглянути з будь-якого боку й наблизити.',task:wide?'Затисніть ліву кнопку миші на тілі й потягніть убік. Коліщатко — масштаб.':'Проведіть пальцем по тілу. Двома пальцями — масштаб.'},
   {target:null,gesture:'tap',title:'Оберіть структуру',text:wide?'Наведіть курсор, щоб побачити назву, і клацніть, щоб відкрити картку.':'Торкніться частини тіла, щоб відкрити її картку.',task:wide?'Клацніть будь-яку частину тіла.':'Торкніться будь-якої частини тіла.',done:state.selected.length>0},
   {target:'.detail',title:'Картка структури',text:'Тут українська й латинська назви, опис, «Ізолювати», «Наблизити», судини поруч і ваша нотатка. Закрити картку — хрестик або Esc.'},
   {target:'.quickbar',title:'Швидкі інструменти',text:'Пошук, «Скляне тіло», «Підписи», «Зріз» і «Сканер». Увімкнений інструмент світиться.',task:'Натисніть «Скляне тіло».',done:!!state.glass},
   {target:'.model-pill',title:'Чоловік чи жінка',text:'«Чоловік» — усе тіло, 2 234 структури. «Жінка» — тулуб з органами малого таза й молочними залозами.',task:'Перемкніть модель.',done:model!==tourModel},
   wide?{target:'.sidebar .search-field',title:'Пошук',text:'Шукайте українською, латиною чи англійською, у будь-якому відмінку. Нижче — системи органів з «Рентгеном» і «Соло».',task:'Введіть слово, наприклад «серце» або «femur».',done:query.trim().length>=3}
    :{target:'.menu-btn',title:'Меню',text:'У меню пошук, системи органів, розбирання на елементи, збереження зображення й вкладка «Навчання» з нотатками.',task:'Відкрийте меню.',done:drawer},
   {target:'.camera-bar',title:'Камера',text:'«Вписати» повертає все тіло в кадр. П, З, Л, Пр, В — вигляд спереду, ззаду, зліва, справа, згори.',task:'Натисніть «З», щоб подивитися ззаду.',done:state.view==='back'},
   {target:'.feedback-btn',finale:true,title:'Готово!',text:wide?'Навчання можна повторити кнопкою «?» угорі. Ідеї й помилки надсилайте автору кнопкою «Відгук».':'Навчання можна повторити в меню, кнопка «Навчання». Ідеї й помилки надсилайте автору кнопкою «Відгук».'},
  ]}/>}
  {feedback&&<div className="modal-scrim" onClick={()=>setFeedback(false)}><form className="feedback glass" role="dialog" aria-label="Відгук" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(!fbText.trim())return;location.href=feedbackMailto({kind:fbKind,message:fbText,name:fbName,contact:fbContact,context:`${model==='female'?'жіноча':'чоловіча'} модель${chosen?`, структура «${chosen.name}»`:''}, ${navigator.userAgent.includes('Mobile')?'телефон':'комп\'ютер'}`});setToast('Відкрито лист у поштовому застосунку. Дякую!');setFeedback(false);setFbText('');}}>
   <header><div><h2>Надіслати відгук</h2><p>Ідеї, помилки в назвах чи просто враження. Відгук отримає {AUTHOR.name}.</p></div><button type="button" className="icon-btn" onClick={()=>setFeedback(false)} aria-label="Закрити"><X size={20}/></button></header>
   <Segmented<string> label="Тип відгуку" value={fbKind} onChange={setFbKind} options={['Ідея','Помилка','Подяка','Інше'].map(x=>({id:x,label:x}))}/>
   <label className="field"><span>Повідомлення</span><textarea required rows={5} value={fbText} onChange={e=>setFbText(e.target.value)} placeholder={fbKind==='Помилка'?'Що сталося і де саме? Наприклад: неправильна назва структури…':'Напишіть, що думаєте…'} autoFocus/></label>
   <div className="field-row"><label className="field"><span>Ім'я (необов'язково)</span><input value={fbName} onChange={e=>setFbName(e.target.value)}/></label><label className="field"><span>Контакт для відповіді</span><input value={fbContact} onChange={e=>setFbContact(e.target.value)} placeholder="пошта або @нік"/></label></div>
   <button className="btn primary wide" type="submit" disabled={!fbText.trim()}><MessageSquareHeart size={18}/>Надіслати через пошту</button>
   <p className="fb-alt">Не відкривається пошта? Напишіть на <b>{AUTHOR.email}</b> <button type="button" className="link" onClick={()=>{navigator.clipboard?.writeText(AUTHOR.email).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1600);}).catch(()=>{});}}>{copied?<><Check size={14}/>Скопійовано</>:<><Copy size={14}/>Копіювати</>}</button></p>
   {AUTHOR_LINKS.length>0&&<div className="fb-socials">{AUTHOR_LINKS.map(l=><a key={l.id} href={l.url} target="_blank" rel="noreferrer"><BrandIcon id={l.id} size={17}/>{l.label}</a>)}</div>}
  </form></div>}
  {intro&&<Intro progress={error?0:progress} chapters={chapters} onChapter={onChapter} onEnter={closeIntro} onFeedback={()=>setFeedback(true)} tourNext={!read('atlas-tour-done',false)} stats={[{label:'структур чоловічого тіла',value:2234},{label:'структури жіночого тулуба',value:264},{label:'мови назв',value:3}]}/>}
  {help&&<div className="modal-scrim" onClick={()=>setHelp(false)}><div className="help glass" role="dialog" aria-label="Клавіші" onClick={e=>e.stopPropagation()}><header><h2>Керування</h2><button className="icon-btn" onClick={()=>setHelp(false)} aria-label="Закрити"><X size={20}/></button></header>
   <p className="hint">Мишею: перетягування обертає, права кнопка зсуває, колесо масштабує в точку під курсором. На телефоні: один палець обертає, два масштабують.</p>
   <dl>{SHORTCUTS.map(([k,v])=><div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}</dl></div></div>}

  <Sheet open={about} onOpenChange={setAbout}><SheetContent className="about-sheet"><div className="eyebrow">Джерело й охоплення</div><SheetTitle className="about-title">Тіло людини в 3D</SheetTitle><SheetDescription>Дві моделі: повне тіло дорослого чоловіка (BodyParts3D) і жіночий тулуб (Human Reference Atlas).</SheetDescription><div className="about-copy"><p><strong>Чоловік · BodyParts3D</strong><br/>2 234 окремі 3D-моделі та 3 432 названі анатомічні поняття.</p><p>Модель не охоплює всіх структур тіла людини та їхніх варіантів. Геометрію спрощено для вебу, а короткі пояснення дають загальний навчальний контекст. Атлас не призначений для діагностики чи планування операцій.</p><p><strong>Жінка · Human Reference Atlas</strong><br/>264 структури тулуба (хребет, таз, органи черевної порожнини й малого таза, судини, молочні залози) з 3D Reference Organ Library (HuBMAP / NIH, CC BY 4.0), реконструйованої за Visible Human Female. Вибірку й латинські назви за Terminologia Anatomica 2 взято з відкритих даних проєкту Anatria3D.</p><a href="https://humanatlas.io/" target="_blank" rel="noreferrer">Human Reference Atlas <ArrowUpRight size={14}/></a><h3>Мови</h3><p>Назви структур перекладено українською й доповнено латинськими назвами за Міжнародною анатомічною термінологією. Оригінальні англійські назви збережено; шукати можна будь-якою з трьох мов.</p><h3>Ваші дані</h3><p>Нотатки, історія переглядів і тема зберігаються лише у вашому браузері й нікуди не надсилаються.</p><h3>Джерело</h3><p>BodyParts3D, © The Database Center for Life Science, ліцензія CC Attribution 4.0 International.</p><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">Ліцензія набору даних <ArrowUpRight size={14}/></a><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">Оригінальна геометрія та метадані <ArrowUpRight size={14}/></a><a href="https://academic.oup.com/nar/article/37/suppl_1/D782/1000752" target="_blank" rel="noreferrer">Публікація про джерело даних <ArrowUpRight size={14}/></a></div></SheetContent></Sheet>
 </main>;
}
