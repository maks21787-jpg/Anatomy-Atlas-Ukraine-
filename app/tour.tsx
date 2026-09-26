import {useEffect,useLayoutEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Check} from 'lucide-react';

export interface TourStep {target:string|null;title:string;text:string}
interface Rect {x:number;y:number;w:number;h:number}

/** Spotlight tour: dims the screen, cuts a lit window around the real control and explains it next to it. */
export default function Tour({steps,step,onStep,onClose}:{steps:TourStep[];step:number;onStep:(n:number)=>void;onClose:()=>void}){
 const current=steps[step];
 const [rect,setRect]=useState<Rect|null>(null),[view,setView]=useState({w:innerWidth,h:innerHeight});
 useLayoutEffect(()=>{
  const measure=()=>{setView({w:innerWidth,h:innerHeight});const el=current.target?document.querySelector(current.target):null;if(!el){setRect(null);return;}const r=el.getBoundingClientRect();if(!r.width&&!r.height){setRect(null);return;}const pad=8;setRect({x:r.left-pad,y:r.top-pad,w:r.width+pad*2,h:r.height+pad*2});};
  measure();const t=setInterval(measure,300);addEventListener('resize',measure);return()=>{clearInterval(t);removeEventListener('resize',measure);};
 },[current]);
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();step<steps.length-1?onStep(step+1):onClose();}else if(e.key==='ArrowLeft'&&step>0)onStep(step-1);else if(e.key==='Escape')onClose();};addEventListener('keydown',k,true);return()=>removeEventListener('keydown',k,true);},[step,steps.length,onStep,onClose]);
 const cardW=Math.min(360,view.w-24);
 // Put the card below the target when there is room, otherwise above it; centre it when there is no target.
 let left=(view.w-cardW)/2,top=view.h/2-110;
 if(rect){left=Math.min(Math.max(12,rect.x+rect.w/2-cardW/2),view.w-cardW-12);const below=rect.y+rect.h+16;top=below+230<view.h?below:Math.max(12,rect.y-16-230);}
 const last=step===steps.length-1;
 return <div className="tour" role="dialog" aria-modal="true" aria-label={`Підказка ${step+1} з ${steps.length}: ${current.title}`}>
  {rect?<div className="tour-spot" style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h}}/>:<div className="tour-dim"/>}
  <div className="tour-card" key={step} style={{left,top,width:cardW}}>
   <div className="tour-step">Підказка {step+1} з {steps.length}</div>
   <h2>{current.title}</h2><p>{current.text}</p>
   <div className="tour-bar"><i style={{width:`${(step+1)/steps.length*100}%`}}/></div>
   <div className="tour-nav">
    <button className="tour-skip" onClick={onClose}>Пропустити тур</button>
    {step>0&&<button className="btn" onClick={()=>onStep(step-1)} aria-label="Назад"><ArrowLeft size={17}/></button>}
    <button className="btn primary" onClick={()=>last?onClose():onStep(step+1)}>{last?<>Зрозуміло<Check size={17}/></>:<>Далі<ArrowRight size={17}/></>}</button>
   </div>
  </div>
 </div>;
}
