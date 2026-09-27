import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronUp,Hand,MousePointer2,PartyPopper,X} from 'lucide-react';

export interface TourStep {
 target:string|null;title:string;text:string;
 /** What the reader should try; the step advances by itself once it is done. */
 task?:string;done?:boolean;
 /** Animated hint drawn over the 3D body. 'drag' also completes the step when the reader turns the body. */
 gesture?:'drag'|'tap';
 finale?:boolean;
}
interface Rect {x:number;y:number;w:number;h:number}

/**
 * Interactive spotlight tour. The overlay never blocks the page: the reader performs each task on the real
 * controls while a lit window, a card and, where it helps, an animated hand show where to act.
 */
export default function Tour({steps,step,onStep,onClose,stage}:{steps:TourStep[];step:number;onStep:(n:number)=>void;onClose:()=>void;stage:{x:number;y:number}}){
 const current=steps[step],last=step===steps.length-1;
 const [rect,setRect]=useState<Rect|null>(null),[view,setView]=useState({w:innerWidth,h:innerHeight}),[dragged,setDragged]=useState(false),[card,setCard]=useState({w:360,h:240});
 const cardRef=useRef<HTMLDivElement>(null);
 const done=!!current.done||(current.gesture==='drag'&&dragged);
 // Touching anything outside the card folds it into a one-line strip, so the reader can see what they are doing.
 const [mini,setMini]=useState(false);
 useEffect(()=>{setDragged(false);setMini(false);},[step]);
 useEffect(()=>{if(step===0||current.finale)return;const down=(e:PointerEvent)=>{const t=e.target as Node;if(cardRef.current?.contains(t)||(t instanceof Element&&t.closest('.tour-pill')))return;setMini(true);};addEventListener('pointerdown',down,true);return()=>removeEventListener('pointerdown',down,true);},[step,current.finale]);
 useLayoutEffect(()=>{
  const measure=()=>{setView({w:innerWidth,h:innerHeight});if(cardRef.current){const r=cardRef.current.getBoundingClientRect();setCard(c=>Math.abs(c.h-r.height)>2||Math.abs(c.w-r.width)>2?{w:r.width,h:r.height}:c);}
   const el=current.target?document.querySelector(current.target):null;if(!el){setRect(null);return;}const r=el.getBoundingClientRect();if(!r.width&&!r.height){setRect(null);return;}const pad=8;setRect(o=>o&&Math.abs(o.x-(r.left-pad))<1&&Math.abs(o.y-(r.top-pad))<1&&Math.abs(o.w-(r.width+pad*2))<1&&Math.abs(o.h-(r.height+pad*2))<1?o:{x:r.left-pad,y:r.top-pad,w:r.width+pad*2,h:r.height+pad*2});};
  measure();const t=setInterval(measure,250);addEventListener('resize',measure);return()=>{clearInterval(t);removeEventListener('resize',measure);};
 },[current.target]);
 // Turning or zooming the body counts as done for the 'drag' step.
 useEffect(()=>{if(current.gesture!=='drag')return;let moved=0;const onMove=(e:PointerEvent)=>{if(!(e.target instanceof HTMLCanvasElement)||!(e.buttons||e.pointerType==='touch'))return;moved+=Math.abs(e.movementX)+Math.abs(e.movementY);if(moved>60)setDragged(true);};const onWheel=(e:WheelEvent)=>{if(e.target instanceof HTMLCanvasElement)setDragged(true);};addEventListener('pointermove',onMove,true);addEventListener('wheel',onWheel,true);return()=>{removeEventListener('pointermove',onMove,true);removeEventListener('wheel',onWheel,true);};},[current.gesture,step]);
 // A finished task moves on by itself after a short confirmation.
 const nav=useRef({onStep,onClose});nav.current={onStep,onClose};const hasTask=!!current.task;
 useEffect(()=>{if(!done||!hasTask)return;const t=setTimeout(()=>last?nav.current.onClose():nav.current.onStep(step+1),1300);return()=>clearTimeout(t);},[done,hasTask,step,last]);
 useEffect(()=>{const k=(e:KeyboardEvent)=>{const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement;if(e.key==='Escape'&&!typing){e.preventDefault();e.stopPropagation();onClose();return;}if(typing)return;if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();e.stopPropagation();last?onClose():onStep(step+1);}else if(e.key==='ArrowLeft'&&step>0){e.stopPropagation();onStep(step-1);}};addEventListener('keydown',k,true);return()=>removeEventListener('keydown',k,true);},[step,last,onStep,onClose]);

 // Place the card beside the lit control: below, above, left or right, whichever has room; without a target it sits clear of the body.
 // On a phone it docks to the top or bottom edge, on the side away from the control, so panels that open in the lower half stay visible.
 const narrow=view.w<900,cardW=Math.min(380,view.w-24),m=14;let left:number,top:number;
 const dockTop=narrow&&!!rect&&rect.y+rect.h/2>view.h*.45;
 if(narrow&&step>0&&!current.finale){left=12;top=dockTop?124:view.h-card.h-86;}
 else if(rect){
  const cx=Math.min(Math.max(12,rect.x+rect.w/2-cardW/2),view.w-cardW-12);
  if(rect.y+rect.h+m+card.h<view.h-8){left=cx;top=rect.y+rect.h+m;}
  else if(rect.y-m-card.h>8){left=cx;top=rect.y-m-card.h;}
  else if(rect.x-m-cardW>8){left=rect.x-m-cardW;top=Math.min(Math.max(12,rect.y+rect.h/2-card.h/2),view.h-card.h-12);}
  else if(rect.x+rect.w+m+cardW<view.w-8){left=rect.x+rect.w+m;top=Math.min(Math.max(12,rect.y+rect.h/2-card.h/2),view.h-card.h-12);}
  else {left=(view.w-cardW)/2;top=view.h-card.h-16;}
 }else if(current.gesture){
  if(view.w>=900){left=view.w-cardW-24;top=Math.max(90,view.h/2-card.h/2);}else{left=(view.w-cardW)/2;top=view.h-card.h-110;}
 }else{left=(view.w-cardW)/2;top=Math.max(12,view.h/2-card.h/2);}
 const dim=!rect&&!current.gesture;
 const pillLabel=done?'Чудово, виходить!':current.task??current.title;
 return <div className={`tour ${dim?'dimmed':''}`} role="dialog" aria-modal="false" aria-label={`Навчання, крок ${step+1} з ${steps.length}: ${current.title}`}>
  {rect&&<div className="tour-spot" style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h}}/>}
  {current.gesture&&!done&&<div className={`tour-gesture ${current.gesture}`} style={{left:stage.x,top:stage.y}} aria-hidden="true">{current.gesture==='drag'?<><span className="trail"/><Hand size={44}/></>:<><span className="ripple"/><span className="ripple two"/><MousePointer2 size={40}/></>}</div>}
  {current.finale&&<div className="confetti" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%9)*.07}s`,background:['#9a3324','#c58b2c','#3f5f4a','#1f1a14','#d8c7a8'][i%5],transform:`rotate(${i*23}deg)`}}/>)}</div>}
  {mini?<div className={`tour-pill ${done?'is-done':''} ${narrow&&!dockTop?'bottom':''}`}><button className="tour-pill-open" onClick={()=>setMini(false)} aria-label="Показати підказку"><span className="dot">{done?<Check size={13}/>:null}</span><span className="n">{step+1}/{steps.length}</span><span className="t">{pillLabel}</span><ChevronUp size={17}/></button><button className="tour-pill-close" onClick={onClose} aria-label="Завершити навчання"><X size={16}/></button></div>:
  <div ref={cardRef} className={`tour-card ${done?'is-done':''} ${narrow?'compact':''}`} key={step} style={{left,top,width:narrow&&step>0&&!current.finale?view.w-24:cardW}}>
   <div className="tour-step"><span>Навчання · крок {step+1} з {steps.length}</span></div>
   <h2>{current.finale&&<PartyPopper size={22}/>}{current.title}</h2>{!(narrow&&current.task&&step>0)&&<p>{current.text}</p>}
   {current.task&&<div className={`tour-task ${done?'done':''}`}><span className="dot">{done?<Check size={15}/>:null}</span><span>{done?'Чудово, виходить!':current.task}</span></div>}
   <div className="tour-bar"><i style={{width:`${(step+1)/steps.length*100}%`}}/></div>
   <div className="tour-nav">
    {!last&&<button className="tour-skip" onClick={onClose}>Пропустити</button>}
    {step>0&&<button className="btn" onClick={()=>onStep(step-1)} aria-label="Назад"><ArrowLeft size={17}/></button>}
    <button className={`btn ${current.task&&!done?'':'primary'}`} onClick={()=>last?onClose():onStep(step+1)}>{last?<>Почати роботу<Check size={17}/></>:step===0?<>Почати<ArrowRight size={17}/></>:current.task&&!done?<>Далі без цього<ArrowRight size={17}/></>:<>Далі<ArrowRight size={17}/></>}</button>
   </div>
  </div>}
 </div>;
}
