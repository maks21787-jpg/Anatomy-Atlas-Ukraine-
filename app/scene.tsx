import {useEffect,useRef} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createExplosionLayout} from './explosion-layout';
import {decodeModelResponse} from './model-download';
import {PointerTap} from './pointer-tap';
import {SYSTEMS,type Atlas,type Insets,type SceneState,type SystemId,type View} from './anatomy';

export interface ScanReport {position:number;crossing:string[]}
interface Props {atlas:Atlas;state:SceneState;onSelect:(id:string,additive:boolean)=>void;onProgress:(n:number)=>void;onError:(s:string)=>void;onScan?:(report:ScanReport)=>void}

const THEMES={
 light:{clear:'#f1ece2',ground:0xe4ddd0,platform:0xf6f2ea,ring:0xa3978a,marker:0x7a6e60,hemi:1.05,label:'#1f1a14',line:'#6b5f52',halo:'#f7f3ece0'},
 dark:{clear:'#151310',ground:0x0e0c0a,platform:0x1d1a16,ring:0x5a5248,marker:0xa89c8a,hemi:.8,label:'#efe8dc',line:'#a89c8a',halo:'#151310e0'},
};
const SCAN_COLOR=new T.Color('#e9b247'),COVERAGE_COLOR=new T.Color('#6f9a5b');
const DIRECTIONS:Record<View,T.Vector3>={
 'three-quarter':new T.Vector3(.35,.06,1).normalize(),front:new T.Vector3(0,.02,1).normalize(),back:new T.Vector3(0,.02,-1).normalize(),
 left:new T.Vector3(1,.02,0).normalize(),right:new T.Vector3(-1,.02,0).normalize(),top:new T.Vector3(0,1,.08).normalize(),
};
const NO_INSETS:Insets={left:0,right:0,top:0,bottom:0};
const MAX_LABELS=24;
const measure=document.createElement('canvas').getContext('2d');
/** Shortens a label with an ellipsis so it fits the space left in the margin. */
function fitText(text:string,maxWidth:number){if(!measure)return text;measure.font='italic 13.5px Inter, Arial, sans-serif';if(measure.measureText(text).width<=maxWidth)return text;let lo=0,hi=text.length;while(lo<hi){const mid=(lo+hi+1)>>1;if(measure.measureText(text.slice(0,mid)+'…').width<=maxWidth)lo=mid;else hi=mid-1;}return lo>3?text.slice(0,lo)+'…':'';}
interface Label {x:number;y:number;px:number;py:number;text:string;side:'left'|'right'}

export default function AnatomyScene({atlas,state,onSelect,onProgress,onError,onScan}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),select=useRef(onSelect),scanned=useRef(onScan);
 latest.current=state;select.current=onSelect;scanned.current=onScan;
 useEffect(()=>{
  const el=host.current!;let disposed=false,frame=0,dirty=true,ready=false,amount=0;
  let lastAngle=0,lastView='',lastReset=-1,lastIsolate='',layoutKey='',lastTheme='',lastZoom=0,lastFocus=0,lastSnapshot=0,lastFlags='',lastSection='';
  let lastState:SceneState|null=null,hoverIndex=-1,scanY=1.7,scanDirection=-1,lastScanReport=0,labels:Label[]=[];
  let flight:{fromTarget:T.Vector3;toTarget:T.Vector3;dir:T.Vector3;turn:T.Quaternion;fromLength:number;toLength:number;start:number;duration:number}|null=null;
  const still=new T.Quaternion(),turning=new T.Quaternion();
  const abort=new AbortController();
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{onError('Цей браузер не зміг запустити 3D-переглядач. Спробуйте браузер з увімкненим WebGL.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.5:2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.localClippingEnabled=true;el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Інтерактивна анатомія людини. Перетягуйте, щоб обертати, прокручуйте, щоб масштабувати, і клацніть структуру, щоб її оглянути.');
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);
  camera.position.set(1.4,1.05,3.6);controls.target.set(0,.86,0);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=.07;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.99;controls.zoomToCursor=true;controls.addEventListener('change',()=>{dirty=true;});
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
  const hemi=new T.HemisphereLight(0xffffff,0xa7acb2,1.05);scene.add(hemi);
  const key=new T.DirectionalLight(0xfffaf4,2.3);key.position.set(-2,4,3);scene.add(key);
  const rim=new T.DirectionalLight(0xe9f0ff,1.8);rim.position.set(2,2,-3);scene.add(rim);
  const ground=new T.Mesh(new T.CircleGeometry(30,96),new T.MeshStandardMaterial({color:0xd5d9dc,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.019;scene.add(ground);
  const platform=new T.Mesh(new T.CylinderGeometry(.68,.7,.028,100),new T.MeshStandardMaterial({color:0xeeeeec,metalness:.12,roughness:.67}));platform.position.y=-.016;scene.add(platform);
  const ring=new T.Mesh(new T.RingGeometry(.63,.632,128),new T.MeshBasicMaterial({color:0x8c969f,transparent:true,opacity:.4,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.001;scene.add(ring);
  const innerRing=new T.Mesh(new T.RingGeometry(.55,.551,128),new T.MeshBasicMaterial({color:0xa4aeb8,transparent:true,opacity:.16,side:T.DoubleSide}));innerRing.rotation.x=-Math.PI/2;innerRing.position.y=.001;scene.add(innerRing);

  // Body extent drives the section planes and the scanner travel.
  const body=new T.Box3();atlas.parts.forEach(p=>{body.expandByPoint(new T.Vector3().fromArray(p.bounds[0]));body.expandByPoint(new T.Vector3().fromArray(p.bounds[1]));});
  // Exploded layouts and the stage are placed relative to the model, which may be a whole body or a trunk.
  const midY=(body.min.y+body.max.y)/2;ground.position.y=body.min.y-.019;platform.position.y=body.min.y-.016;ring.position.y=innerRing.position.y=body.min.y+.001;const stage=T.MathUtils.clamp(body.getSize(new T.Vector3()).x/.66,.45,1);[platform,ring,innerRing].forEach(m=>m.scale.set(stage,m===platform?1:stage,m===platform?stage:1));

  // Per-part state lives in two textures the shaders read by part index.
  // partTexture: xyz explosion offset, w visible. flagTexture: r selected, g ghost (x-ray), b glow (scanner or study coverage), a hover.
  const width=T.MathUtils.ceilPowerOfTwo(atlas.parts.length),data=new Float32Array(width*4),partTexture=new T.DataTexture(data,width,1,T.RGBAFormat,T.FloatType);partTexture.needsUpdate=true;
  const flags=new Uint8Array(width*4),flagTexture=new T.DataTexture(flags,width,1);flagTexture.needsUpdate=true;
  const glowColor={value:SCAN_COLOR.clone()},revealY={value:1e3},flash={value:0};let flashStart=0;
  // Newly shown structures materialise from the feet up behind a glowing band; w=2 in partTexture marks them.
  const revealing=new Uint8Array(atlas.parts.length),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;let reveal:{start:number;duration:number}|null=null,revealedOnce=false;
  const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],pickers:(T.Mesh|undefined)[]=[],centers=atlas.parts.map(p=>new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(.5));
  const volumes=atlas.parts.map(p=>(p.bounds[1][0]-p.bounds[0][0])*(p.bounds[1][1]-p.bounds[0][1])*(p.bounds[1][2]-p.bounds[0][2]));
  const offsets:T.Vector3[]=[],bounds=atlas.parts.map(p=>new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1])));
  let packingWidth=1,packingHeight=1;
  const markerPositions=new Float32Array(atlas.parts.length*3),markerGeometry=new T.BufferGeometry();markerGeometry.setAttribute('position',new T.BufferAttribute(markerPositions,3));
  const markerMaterial=new T.PointsMaterial({color:0x64748b,size:5,sizeAttenuation:false,transparent:true,opacity:.72,depthTest:false});
  markerMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};
  const markers=new T.Points(markerGeometry,markerMaterial);markers.frustumCulled=false;markers.renderOrder=10;markers.visible=false;scene.add(markers);

  const clipPlane=new T.Plane(),clipping:T.Plane[]=[];
  const sectionSheet=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:SCAN_COLOR,transparent:true,opacity:.07,side:T.DoubleSide,depthWrite:false}));sectionSheet.visible=false;sectionSheet.renderOrder=5;scene.add(sectionSheet);
  const sectionEdge=new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(1,1)),new T.LineBasicMaterial({color:SCAN_COLOR,transparent:true,opacity:.55}));sectionSheet.add(sectionEdge);
  const scanRing=new T.Mesh(new T.TorusGeometry(.46,.0045,12,160),new T.MeshBasicMaterial({color:SCAN_COLOR,transparent:true,opacity:.95}));scanRing.rotation.x=Math.PI/2;
  const scanDisc=new T.Mesh(new T.CircleGeometry(.46,96),new T.MeshBasicMaterial({color:SCAN_COLOR,transparent:true,opacity:.1,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));scanDisc.rotation.x=-Math.PI/2;
  const scanOuter=new T.Mesh(new T.TorusGeometry(.53,.0022,8,160),new T.MeshBasicMaterial({color:SCAN_COLOR,transparent:true,opacity:.35}));scanOuter.rotation.x=Math.PI/2;
  const scanner=new T.Group();scanner.add(scanRing,scanDisc,scanOuter);scanner.visible=false;scanner.renderOrder=6;scene.add(scanner);

  const hover=document.createElement('div');hover.className='part-hover';hover.setAttribute('role','tooltip');hover.hidden=true;el.appendChild(hover);
  const labelLayer=document.createElement('div');labelLayer.className='scene-labels';labelLayer.setAttribute('aria-hidden','true');el.appendChild(labelLayer);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');labelLayer.appendChild(svg);
  type Target={index:number;x:number;y:number;left:number;right:number;top:number;bottom:number};let targets:Target[]=[];
  const projected=new T.Vector3();
  const findTarget=(x:number,y:number,radius:number)=>{
   let best=-1,score=Infinity;
   for(const t of targets){const dx=Math.max(t.left-x,0,x-t.right),dy=Math.max(t.top-y,0,y-t.bottom),distance=Math.hypot(dx,dy);if(distance>radius)continue;const candidate=distance+Math.hypot(t.x-x,t.y-y)*.025;if(candidate<score){score=candidate;best=t.index;}}
   return best;
  };

  const materialFor=(system:string,ghost:boolean)=>{
   const skin=system==='integumentary';
   const m=new T.MeshStandardMaterial({color:SYSTEMS.find(s=>s.id===system)?.color??'#aebbb8',metalness:.08,roughness:ghost?.35:.53,side:T.DoubleSide,transparent:ghost,opacity:ghost?(skin?.1:.16):1,depthWrite:!ghost});
   m.clippingPlanes=clipping;
   m.onBeforeCompile=shader=>{
    shader.uniforms.partState={value:partTexture};shader.uniforms.flagState={value:flagTexture};shader.uniforms.stateWidth={value:width};shader.uniforms.glowColor=glowColor;shader.uniforms.revealY=revealY;shader.uniforms.flash=flash;
    shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform sampler2D flagState; uniform float stateWidth; varying float partVisible; varying vec4 partFlags; varying float partY;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partY = transformed.y; partFlags = texture2D(flagState, stateUv);');
    shader.fragmentShader='uniform vec3 glowColor; uniform float revealY; uniform float flash; varying float partVisible; varying vec4 partFlags; varying float partY;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif (partVisible < 0.5 || ${ghost?'partFlags.g < 0.5':'partFlags.g > 0.5'}) discard;\nif (partVisible > 1.5 && partY > revealY) discard;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.64, 0.16), partFlags.r * 0.58);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += glowColor * partFlags.b * 0.85 + vec3(partFlags.a * 0.16);\ntotalEmissiveRadiance += vec3(0.95, 0.68, 0.22) * partFlags.r * flash;\nif (partVisible > 1.5) totalEmissiveRadiance += vec3(0.95, 0.68, 0.22) * smoothstep(0.08, 0.0, revealY - partY) * 1.4;');
    if(ghost)shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nfloat rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);\ngl_FragColor.a = max(gl_FragColor.a * mix(0.45, 2.4, rim), partFlags.b * 0.6);');
   };
   // Same compile hook source for every system keeps three.js from compiling one program per material.
   m.customProgramCacheKey=()=>ghost?'atlas-ghost':'atlas-solid';
   materials.push(m);return m;
  };
  const solidMats=new Map(SYSTEMS.map(s=>[s.id,materialFor(s.id,false)])),ghostMats=new Map(SYSTEMS.map(s=>[s.id,materialFor(s.id,true)]));
  const applyTheme=(theme:'light'|'dark')=>{const t=THEMES[theme];renderer.setClearColor(t.clear);(ground.material as T.MeshStandardMaterial).color.setHex(t.ground);(platform.material as T.MeshStandardMaterial).color.setHex(t.platform);(platform.material as T.MeshStandardMaterial).envMapIntensity=theme==='dark'?.18:1;(ring.material as T.MeshBasicMaterial).color.setHex(t.ring);(innerRing.material as T.MeshBasicMaterial).color.setHex(t.ring);markerMaterial.color.setHex(t.marker);hemi.intensity=t.hemi;dirty=true;};
  // Flights are timed by the clock, not by frames, so they take the same time on slow devices.
  // The camera swings around the target on an arc, so a move from the front to the back never passes through the body.
  const flyTo=(position:T.Vector3,target:T.Vector3,duration=.6)=>{const from=camera.position.clone().sub(controls.target),to=position.clone().sub(target);flight={fromTarget:controls.target.clone(),toTarget:target.clone(),dir:from.clone().normalize(),turn:new T.Quaternion().setFromUnitVectors(from.clone().normalize(),to.clone().normalize()),fromLength:from.length(),toLength:to.length(),start:performance.now(),duration:duration*1000};};
  // Each system has a solid and a see-through mesh; a mesh with nothing to draw is switched off so the GPU skips its vertices.
  const solidMeshes=new Map<string,T.Mesh[]>(),ghostMeshes=new Map<string,T.Mesh[]>();

  let loaded=0;
  const loadChunk=async(ci:number)=>{
   const chunk=atlas.chunks[ci],compressed=!!chunk.gzip&&typeof DecompressionStream!=='undefined';const response=await fetch((compressed?chunk.gzip!:chunk.url).replace(/^\//,''),{signal:abort.signal});const buffer=await decodeModelResponse(response,chunk.bytes,compressed);if(disposed)return;
   const groups=new Map<string,T.BufferGeometry[]>();
   atlas.parts.forEach((p,i)=>{
    if(p.chunk!==ci)return;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));
    // GPU normalized signed-short normals keep the complete atlas compact in memory.
    g.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));
    g.boundingBox=bounds[i].clone();g.computeBoundingSphere();const pick=new T.Mesh(g);pick.matrixAutoUpdate=false;pickers[i]=pick;geometries.push(g);
    g.setAttribute('partIndex',new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i),1));
    const list=groups.get(p.system)??[];list.push(g);groups.set(p.system,list);
   });
   groups.forEach((gs,system)=>{const geometry=mergeGeometries(gs,false);if(!geometry)throw new Error('Не вдалося зібрати геометрію анатомічної моделі.');geometries.push(geometry);
    const solid=new T.Mesh(geometry,solidMats.get(system as SystemId));solid.frustumCulled=false;scene.add(solid);
    const glass=new T.Mesh(geometry,ghostMats.get(system as SystemId));glass.frustumCulled=false;glass.renderOrder=2;scene.add(glass);
    solidMeshes.set(system,[...(solidMeshes.get(system)??[]),solid]);ghostMeshes.set(system,[...(ghostMeshes.get(system)??[]),glass]);});
   lastState=null;lastFlags='';loaded++;onProgress(Math.round(loaded/atlas.chunks.length*100));dirty=true;
  };
  (async()=>{try{let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<atlas.chunks.length){const i=cursor++;await loadChunk(i);}}));if(!disposed){ready=true;dirty=true;lastState=null;if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!latest.current.selected.length){const to=camera.position.clone(),target=controls.target.clone(),offset=to.clone().sub(target);camera.position.copy(target).add(offset.multiplyScalar(1.5).applyAxisAngle(new T.Vector3(0,1,0),-.6));flyTo(to,target,1.7);}}}catch(e){if(!disposed)onError(e instanceof Error?e.message:'Не вдалося завантажити анатомічну модель.');}})();

  // The free area is the part of the screen panels do not cover; the camera's view offset keeps the body centred in it.
  const viewOffset=new T.Vector2(),wantOffset=new T.Vector2();
  const freeArea=()=>{const ins=latest.current.insets??NO_INSETS,w=el.clientWidth,h=el.clientHeight;return {w,h,freeW:Math.max(120,w-ins.left-ins.right),freeH:Math.max(120,h-ins.top-ins.bottom),ins};};
  const tanHalf=()=>Math.tan(T.MathUtils.degToRad(camera.fov/2));
  const fit=(view:View,extent=0,smooth=false)=>{
   const {w,h,freeW,freeH}=freeArea();
   if(extent>.8)view='front';
   const size=body.getSize(new T.Vector3()),center=body.getCenter(new T.Vector3());
   const bodyH=view==='top'?Math.max(size.x,size.z)*1.1:size.y+.09,bodyW=view==='left'||view==='right'?size.z+.1:size.x*1.05+.05;
   const normalDistance=Math.max(bodyH*h/freeH,bodyW*w/freeW/camera.aspect)/(2*tanHalf())*1.06;
   const atlasDistance=Math.max(packingHeight*h/freeH,packingWidth*w/freeW/camera.aspect)/(2*tanHalf())*1.06;
   const distance=T.MathUtils.lerp(normalDistance,Math.max(.2,atlasDistance),extent);
   const target=new T.Vector3(0,extent>.1?midY:center.y,0),position=target.clone().addScaledVector(DIRECTIONS[view].clone().applyAxisAngle(new T.Vector3(0,1,0),T.MathUtils.degToRad(latest.current.angle??0)),distance);
   if(smooth&&!reduceMotion){flyTo(position,target,.9);dirty=true;return;}
   flight=null;controls.target.copy(target);camera.position.copy(position);controls.update();dirty=true;
  };
  const resize=()=>{layoutKey='';lastState=null;renderer.setPixelRatio(Math.min(devicePixelRatio,el.clientWidth<768||el.clientHeight<600?1.5:2));camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);svg.setAttribute('viewBox',`0 0 ${el.clientWidth} ${el.clientHeight}`);fit(latest.current.view,amount);};const observer=new ResizeObserver(resize);observer.observe(el);

  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),tap=new PointerTap(),worldBox=new T.Box3(),hitPoint=new T.Vector3();
  const pick=(clientX:number,clientY:number,touch:boolean)=>{
   const rect=renderer.domElement.getBoundingClientRect();pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
   let nearest=Infinity,found=-1;
   pickers.forEach((mesh,i)=>{if(!mesh||data[i*4+3]<.5||flags[i*4+1]>127)return;worldBox.copy(bounds[i]).translate(mesh.position);if(!raycaster.ray.intersectBox(worldBox,hitPoint))return;const hits=raycaster.intersectObject(mesh,false);const hit=hits.find(x=>!clipping.length||clipPlane.distanceToPoint(x.point)>=0);if(hit&&hit.distance<nearest){nearest=hit.distance;found=i;}});
   if(found<0){/* Ghosted structures are still pickable when nothing solid is under the pointer. */pickers.forEach((mesh,i)=>{if(!mesh||data[i*4+3]<.5||flags[i*4+1]<128)return;worldBox.copy(bounds[i]).translate(mesh.position);if(!raycaster.ray.intersectBox(worldBox,hitPoint))return;const hit=raycaster.intersectObject(mesh,false)[0];if(hit&&hit.distance<nearest&&atlas.parts[i].system!=='integumentary'){nearest=hit.distance;found=i;}});}
   if(found<0&&amount>.45)found=findTarget(clientX-rect.left,clientY-rect.top,touch?24:16);
   return found;
  };
  let hoverTimer=0,pendingHover:{x:number;y:number}|null=null;
  const showHover=(index:number,x:number,y:number)=>{
   if(index!==hoverIndex){if(hoverIndex>=0)flags[hoverIndex*4+3]=0;if(index>=0)flags[index*4+3]=255;hoverIndex=index;flagTexture.needsUpdate=true;dirty=true;}
   hover.hidden=index<0;renderer.domElement.style.cursor=index<0?'grab':'pointer';
   if(index>=0){const p=atlas.parts[index];hover.replaceChildren();const a=document.createElement('strong');a.textContent=p.name;hover.appendChild(a);if(p.nameLa){const b=document.createElement('em');b.textContent=p.nameLa;hover.appendChild(b);}hover.style.left=`${Math.max(8,Math.min(x+16,el.clientWidth-290))}px`;hover.style.top=`${Math.max(8,Math.min(y+18,el.clientHeight-70))}px`;}
  };
  const down=(e:PointerEvent)=>{showHover(-1,0,0);tap.down(e.pointerId,e.clientX,e.clientY,e.pointerType==='touch'?12:5);};
  const move=(e:PointerEvent)=>{
   tap.move(e.pointerId,e.clientX,e.clientY);if(e.buttons||e.pointerType==='touch'||!ready){if(hoverIndex>=0)showHover(-1,0,0);return;}
   const rect=el.getBoundingClientRect();pendingHover={x:e.clientX-rect.left,y:e.clientY-rect.top};
   if(!hoverTimer)hoverTimer=window.setTimeout(()=>{hoverTimer=0;if(!pendingHover||disposed)return;const {x,y}=pendingHover;showHover(pick(x+rect.left,y+rect.top,false),x,y);},60);
  };
  const leave=()=>{pendingHover=null;showHover(-1,0,0);};
  const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  const up=(e:PointerEvent)=>{const validTap=tap.up(e.pointerId,e.clientX,e.clientY);if(!validTap||!ready)return;const found=pick(e.clientX,e.clientY,e.pointerType==='touch');if(found>=0){showHover(-1,0,0);select.current(atlas.parts[found].id,e.ctrlKey||e.metaKey||e.shiftKey);}};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('pointerleave',leave);

  /** Places selected structures' names in the margins with a leader line to each, like an atlas plate. */
  const layoutLabels=(s:SceneState)=>{
   labels=[];const {w,h,ins}=freeArea();
   if(!s.labels||amount>.4||!s.selected.length){labelLayer.hidden=true;return;}
   const sel=new Set(s.selected);let chosen=atlas.parts.map((p,i)=>i).filter(i=>sel.has(atlas.parts[i].id)&&data[i*4+3]>.5);
   if(chosen.length>MAX_LABELS)chosen=chosen.sort((a,b)=>volumes[b]-volumes[a]).slice(0,MAX_LABELS);
   const points=chosen.map(i=>{projected.copy(centers[i]).add(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])).project(camera);return {i,x:(projected.x+1)*w/2,y:(1-projected.y)*h/2,ok:projected.z>-1&&projected.z<1};}).filter(p=>p.ok&&p.x>-50&&p.x<w+50&&p.y>-50&&p.y<h+50);
   if(!points.length){labelLayer.hidden=true;return;}
   const midX=points.reduce((a,p)=>a+p.x,0)/points.length,minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
   const gap=Math.min(w,1400)>700?22:18,topLimit=ins.top+14,bottomLimit=h-ins.bottom-14;
   for(const side of ['left','right'] as const){
    const group=points.filter(p=>points.length===1?side==='right':side==='left'?p.x<midX:p.x>=midX).sort((a,b)=>a.y-b.y);if(!group.length)continue;
    const column=side==='left'?Math.max(ins.left+90,Math.min(minX-40,midX-110)):Math.min(w-ins.right-90,Math.max(maxX+40,midX+110));
    const room=side==='left'?column-ins.left-18:w-ins.right-column-18;
    const ys=group.map(p=>p.y);for(let k=1;k<ys.length;k++)ys[k]=Math.max(ys[k],ys[k-1]+gap);
    const overflow=ys[ys.length-1]-bottomLimit;if(overflow>0)for(let k=ys.length-1;k>=0;k--){ys[k]-=overflow;if(k>0&&ys[k-1]>ys[k]-gap)ys[k-1]=ys[k]-gap;}
    for(let k=0;k<ys.length;k++)ys[k]=Math.max(ys[k],topLimit+k*gap);
    group.forEach((p,k)=>{const part=atlas.parts[p.i],text=fitText(s.labels==='la'?(part.nameLa??part.name):part.name,room);if(text)labels.push({x:column,y:ys[k],px:p.x,py:p.y,side,text});});
   }
   labelLayer.hidden=false;
   svg.replaceChildren(...labels.flatMap(l=>{const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');const elbow=l.side==='left'?l.x+8:l.x-8;line.setAttribute('points',`${l.px},${l.py} ${elbow},${l.y} ${l.x},${l.y}`);const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',String(l.px));dot.setAttribute('cy',String(l.py));dot.setAttribute('r','2.4');return [line,dot];}));
   for(const node of [...labelLayer.querySelectorAll('span')])node.remove();
   for(const l of labels){const span=document.createElement('span');span.textContent=l.text;span.className=l.side;span.style.top=`${l.y}px`;if(l.side==='left')span.style.right=`${w-l.x+4}px`;else span.style.left=`${l.x+4}px`;labelLayer.appendChild(span);}
  };

  /** Saves the current view, with its labels, as a PNG. */
  const saveSnapshot=()=>{
   const source=renderer.domElement,ratio=source.width/el.clientWidth,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const ctx=canvas.getContext('2d');if(!ctx)return;
   ctx.drawImage(source,0,0);const theme=THEMES[latest.current.theme??'light'];ctx.scale(ratio,ratio);ctx.lineWidth=1;ctx.strokeStyle=theme.line;ctx.font='italic 13px Inter, Arial, sans-serif';ctx.textBaseline='middle';
   for(const l of labels){const elbow=l.side==='left'?l.x+8:l.x-8;ctx.beginPath();ctx.moveTo(l.px,l.py);ctx.lineTo(elbow,l.y);ctx.lineTo(l.x,l.y);ctx.stroke();ctx.fillStyle=theme.line;ctx.beginPath();ctx.arc(l.px,l.py,2.4,0,Math.PI*2);ctx.fill();ctx.fillStyle=theme.label;ctx.textAlign=l.side==='left'?'right':'left';ctx.fillText(l.text,l.side==='left'?l.x-4:l.x+4,l.y);}
   ctx.font='11px Inter, Arial, sans-serif';ctx.textAlign='left';ctx.fillStyle=theme.line;ctx.fillText('Атлас людини 3D · BodyParts3D (CC BY 4.0) · навчальне зображення',14,el.clientHeight-14);
   const link=document.createElement('a');link.download='atlas.png';link.href=canvas.toDataURL('image/png');link.click();
  };

  const clock=new T.Clock();let lastExtent=-1;
  const animate=()=>{
   if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),s=latest.current;
   // A newly picked structure flashes once so the eye finds it.
   if(lastState&&lastState.selected!==s.selected&&s.selected.length&&!reduceMotion)flashStart=performance.now();
   if(flashStart){const t=(performance.now()-flashStart)/900;flash.value=t>=1?0:Math.pow(1-t,2)*.9;if(t>=1)flashStart=0;dirty=true;}
   const changed=lastState?.visible!==s.visible||lastState?.selected!==s.selected||lastState?.isolate!==s.isolate||lastState?.hidden!==s.hidden;
   const moving=Math.abs(amount-s.explode)>.0001;
   if(moving){amount=T.MathUtils.damp(amount,s.explode,8,dt);dirty=true;}
   const hidden=new Set(s.hidden??[]),selection=new Set(s.selected);
   if(changed||moving||lastExtent<0){
    const visible=new Set(s.visible);
    const isShown=(p:typeof atlas.parts[number])=>!hidden.has(p.id)&&(s.isolate?selection.has(p.id):visible.has(p.system)||selection.has(p.id));
    const visibleParts=atlas.parts.filter(isShown);let revealStart=false;
    const nextLayoutKey=visibleParts.map(p=>p.id).join(',')+':'+camera.aspect.toFixed(3);
    if(nextLayoutKey!==layoutKey){const layout=createExplosionLayout(visibleParts,camera.aspect);packingWidth=layout.width;packingHeight=layout.height;atlas.parts.forEach((p,i)=>{const cell=layout.cells.get(p.id);offsets[i]=cell?new T.Vector3(cell.x,cell.y+midY,0):centers[i].clone();});layoutKey=nextLayoutKey;if(amount>.05&&!s.isolate)fit(s.view,Math.max(0,(amount-.3)/.7));}
    atlas.parts.forEach((p,i)=>{
     const c=centers[i],destination=offsets[i];let dx=0,dy=0,dz=0;
     const group=SYSTEMS.findIndex(sys=>sys.id===p.system),angle=group/SYSTEMS.length*Math.PI*2;
     if(amount<=.45){const t=amount/.45;dx=Math.sin(angle)*t*.48;dy=(c.y-midY)*t*.28;dz=Math.cos(angle)*t*.48;}
     else {const t=(amount-.45)/.55;dx=T.MathUtils.lerp(Math.sin(angle)*.48,destination.x-c.x,t);dy=T.MathUtils.lerp((c.y-midY)*.28,destination.y-c.y,t);dz=T.MathUtils.lerp(Math.cos(angle)*.48,-c.z,t);}
     const shown=ready&&isShown(p);if(!shown)revealing[i]=0;else if(data[i*4+3]<.5&&!reduceMotion){revealing[i]=1;revealStart=true;}
     data.set([dx,dy,dz,shown?(revealing[i]?2:1):0],i*4);
     markerPositions.set(data[i*4+3]>.5?[c.x+dx,c.y+dy,c.z+dz]:[10000,10000,10000],i*3);const mesh=pickers[i];if(mesh){mesh.position.set(dx,dy,dz);mesh.updateMatrix();mesh.updateMatrixWorld(true);}
    });partTexture.needsUpdate=true;markerGeometry.attributes.position.needsUpdate=true;lastState=s;lastExtent=amount;dirty=true;
    if(revealStart){reveal={start:performance.now(),duration:revealedOnce?1100:1900};revealedOnce=true;revealY.value=body.min.y-.05;}
   }

   if(reveal){const t=Math.min(1,(performance.now()-reveal.start)/reveal.duration),k=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;revealY.value=T.MathUtils.lerp(body.min.y-.05,body.max.y+.1,k);dirty=true;
    if(t>=1){reveal=null;revealY.value=1e3;revealing.forEach((r,i)=>{if(r&&data[i*4+3]>1.5)data[i*4+3]=1;});revealing.fill(0);partTexture.needsUpdate=true;}}

   // Section plane.
   const section=amount<.05?s.section:null,sectionKey=section?`${section.axis}:${section.position.toFixed(4)}`:'';
   if(sectionKey!==lastSection){lastSection=sectionKey;const size=body.getSize(new T.Vector3()),center=body.getCenter(new T.Vector3());
    if(section){const t=section.position;if(section.axis==='axial'){const y=body.max.y-t*size.y;clipPlane.set(new T.Vector3(0,-1,0),y);sectionSheet.position.set(center.x,y,center.z);sectionSheet.rotation.set(-Math.PI/2,0,0);sectionSheet.scale.set(size.x*1.25,size.z*1.8,1);}
     else if(section.axis==='coronal'){const z=body.max.z-t*size.z;clipPlane.set(new T.Vector3(0,0,-1),z);sectionSheet.position.set(center.x,center.y,z);sectionSheet.rotation.set(0,0,0);sectionSheet.scale.set(size.x*1.25,size.y*1.06,1);}
     else {const x=body.min.x+t*size.x;clipPlane.set(new T.Vector3(1,0,0),-x);sectionSheet.position.set(x,center.y,center.z);sectionSheet.rotation.set(0,Math.PI/2,0);sectionSheet.scale.set(size.z*1.8,size.y*1.06,1);}
     if(!clipping.length)clipping.push(clipPlane);}
    else clipping.length=0;
    sectionSheet.visible=!!section;dirty=true;}

   // Scanner sweep and study coverage both use the glow channel.
   const scanning=!!s.scan?.on&&amount<.05;
   if(scanning){
    const top=body.max.y-.02,bottom=body.min.y+.03;
    if(s.scan!.hold)scanY=top-s.scan!.position*(top-bottom);
    else{scanY+=scanDirection*dt*.2;if(scanY<bottom){scanY=bottom;scanDirection=1;}if(scanY>top){scanY=top;scanDirection=-1;}}
    scanner.visible=true;scanner.position.set(0,scanY,0);const pulse=1+.04*Math.sin(clock.elapsedTime*5);scanOuter.scale.set(pulse,pulse,pulse);dirty=true;
   }else scanner.visible=false;
   const flagKey=[s.bare,s.isolate,s.selected.length&&s.selected,s.xray,s.glass,s.coverage,scanning?scanY.toFixed(3):'',lastState&&layoutKey].map(String).join('|');
   if(flagKey!==lastFlags){lastFlags=flagKey;const xray=new Set(s.xray??[]);const crossing:number[]=[],solidSystems=new Set<string>(),ghostSystems=new Set<string>();glowColor.value.copy(scanning?SCAN_COLOR:COVERAGE_COLOR);
    atlas.parts.forEach((p,i)=>{const selected=selection.has(p.id),shown=data[i*4+3]>.5;flags[i*4]=selected&&!s.bare&&!s.isolate?255:0;
     flags[i*4+1]=!selected&&(p.system==='integumentary'||xray.has(p.system)||!!s.glass)?255:0;
     let glow=0;if(scanning){if(shown&&p.system!=='integumentary'&&p.bounds[0][1]<=scanY&&p.bounds[1][1]>=scanY){glow=1;crossing.push(i);}}else if(s.coverage)glow=s.coverage[p.id]??0;
     flags[i*4+2]=Math.round(glow*255);if(shown)(flags[i*4+1]?ghostSystems:solidSystems).add(p.system);});
    solidMeshes.forEach((list,system)=>list.forEach(m=>{m.visible=solidSystems.has(system);}));ghostMeshes.forEach((list,system)=>list.forEach(m=>{m.visible=ghostSystems.has(system);}));
    flagTexture.needsUpdate=true;dirty=true;
    const now=performance.now();if(scanning&&now-lastScanReport>140){lastScanReport=now;const top=body.max.y-.02,bottom=body.min.y+.03;scanned.current?.({position:(top-scanY)/(top-bottom),crossing:crossing.sort((a,b)=>volumes[b]-volumes[a]).map(i=>atlas.parts[i].id)});}
   }

   if(s.view!==lastView||s.reset!==lastReset||(s.angle??0)!==lastAngle){fit(s.view,amount,ready&&lastView!==''&&amount<.05&&!s.bare);lastView=s.view;lastReset=s.reset;lastAngle=s.angle??0;}
   if((s.theme??'light')!==lastTheme){lastTheme=s.theme??'light';applyTheme(lastTheme as 'light'|'dark');}
   if(s.zoom&&s.zoom.id!==lastZoom){lastZoom=s.zoom.id;const offset=camera.position.clone().sub(controls.target),length=T.MathUtils.clamp(offset.length()*s.zoom.factor,controls.minDistance,controls.maxDistance);flyTo(controls.target.clone().add(offset.setLength(length)),controls.target.clone(),.4);}
   if(s.focus&&s.focus!==lastFocus){lastFocus=s.focus;const box=new T.Box3();atlas.parts.forEach((p,i)=>{if(selection.has(p.id)&&data[i*4+3]>.5)box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});
    if(!box.isEmpty()){const {w,h,freeW,freeH}=freeArea(),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());const distance=Math.max(.08,Math.max(size.y*h/freeH,Math.max(size.x,size.z)*w/freeW/camera.aspect)/(2*tanHalf())*1.5+Math.max(size.x,size.z)*.5);const direction=camera.position.clone().sub(controls.target).normalize();flyTo(center.clone().addScaledVector(direction,distance),center,.8);}}
   if(flight){const t=Math.min(1,(performance.now()-flight.start)/flight.duration),k=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;controls.target.lerpVectors(flight.fromTarget,flight.toTarget,k);turning.copy(still).slerp(flight.turn,k);camera.position.copy(flight.dir).applyQuaternion(turning).multiplyScalar(T.MathUtils.lerp(flight.fromLength,flight.toLength,k)).add(controls.target);dirty=true;if(t>=1)flight=null;}
   if(moving&&!s.isolate)fit(amount>.5?'front':s.view,Math.max(0,(amount-.3)/.7));
   const isolateKey=s.isolate?s.selected.join(',')+':'+s.reset:'';
   if(isolateKey!==lastIsolate){
    if(s.isolate){const box=new T.Box3();atlas.parts.forEach((p,i)=>{if(selection.has(p.id))box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});
     if(!box.isEmpty()){const {w,h,freeW,freeH}=freeArea(),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const distance=Math.max(.07,Math.max(size.y*h/freeH,size.x*w/freeW/camera.aspect,size.z)/(2*tanHalf())*1.35);controls.maxDistance=Math.max(40,distance*2);flyTo(center.clone().add((s.bare?DIRECTIONS[s.view].clone():new T.Vector3(.2,.1,1).normalize()).multiplyScalar(distance)),center,.7);}
    }else if(lastIsolate)fit(s.view,amount);
    lastIsolate=isolateKey;
   }
   // Ease the view offset towards the centre of the free area.
   const {w,h,ins}=freeArea();wantOffset.set(-(ins.left-ins.right)/2,-(ins.top-ins.bottom)/2);
   if(viewOffset.distanceTo(wantOffset)>.3){viewOffset.lerp(wantOffset,1-Math.exp(-dt*9));dirty=true;}else if(!viewOffset.equals(wantOffset)){viewOffset.copy(wantOffset);dirty=true;}
   camera.setViewOffset(w,h,viewOffset.x,viewOffset.y,w,h);
   controls.enableRotate=amount<.8;controls.mouseButtons.LEFT=amount<.8?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.touches.ONE=amount<.8?T.TOUCH.ROTATE:T.TOUCH.PAN;
   platform.visible=ring.visible=innerRing.visible=amount<.5&&!s.isolate&&!section&&!s.bare;ground.visible=false;markers.visible=amount>.75;
   controls.autoRotate=s.rotate&&!s.isolate&&amount<.4;controls.autoRotateSpeed=s.spin??.65;controls.update();if(controls.autoRotate)dirty=true;
   if(dirty){
    renderer.render(scene,camera);layoutLabels(s);targets=[];
    if(amount>.45){atlas.parts.forEach((p,i)=>{if(data[i*4+3]<.5||flags[i*4+1]>127)return;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(let corner=0;corner<8;corner++){projected.set(p.bounds[(corner&1)?1:0][0]+data[i*4],p.bounds[(corner&2)?1:0][1]+data[i*4+1],p.bounds[(corner&4)?1:0][2]+data[i*4+2]).project(camera);const x=(projected.x+1)*w/2,y=(1-projected.y)*h/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}projected.copy(centers[i]).add(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])).project(camera);if(projected.z< -1||projected.z>1)return;targets.push({index:i,x:(projected.x+1)*w/2,y:(1-projected.y)*h/2,left,right,top,bottom});});}
    if(s.snapshot&&s.snapshot!==lastSnapshot){lastSnapshot=s.snapshot;saveSnapshot();}
    dirty=false;
   }else if(s.snapshot&&s.snapshot!==lastSnapshot){dirty=true;}
  };animate();
  const contextLost=(e:Event)=>{e.preventDefault();onError('Пристрій призупинив 3D-сеанс. Перезавантажте сторінку, щоб продовжити.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);clearTimeout(hoverTimer);observer.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.traverse(o=>{if((o instanceof T.Mesh||o instanceof T.LineSegments)&&!geometries.includes(o.geometry)){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});env.dispose();partTexture.dispose();flagTexture.dispose();markerGeometry.dispose();markerMaterial.dispose();hover.remove();labelLayer.remove();renderer.dispose();renderer.domElement.remove();};
 },[atlas]);
 return <div className="scene" ref={host}/>;
}
