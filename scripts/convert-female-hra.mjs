// Converts the female trunk atlas (HRA / HuBMAP, CC BY 4.0, as curated in Anatria3D's
// public/anatomy/*_female.glb + manifest_female.json) into this viewer's chunked format.
// Usage: node scripts/convert-female-hra.mjs <dir with manifest_female.json and *_female.glb>
// Needs: @gltf-transform/core @gltf-transform/extensions draco3dgltf meshoptimizer
import fs from 'node:fs';import zlib from 'node:zlib';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import {MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
const src=process.argv[2],out=new URL('../public/models/female/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(`${src}/manifest_female.json`,'utf8'));
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const docs=new Map();for(const f of new Set(manifest.organs.map(o=>o.mesh_file)))docs.set(f,await io.read(`${src}/${f}`));
const VEIN=/\bvein|\bvena|venae|portal/i,ARTERY=/arter|aorta|trunk/i,BREAST=/breast|mammar|nipple|areol|lactifer/i;
const systemOf=o=>o.system==='cardiovascular'?(VEIN.test(o.name_en)?'venous':ARTERY.test(o.name_en)?'arterial':'arterial'):o.system==='renal'?'urinary':o.system==='integumentary'?(BREAST.test(o.name_en+o.path.join(' '))?'reproductive':'integumentary'):o.system;
let chunks=[],segments=[],bytes=0,triangles=0,sourceTriangles=0,maxError=0;const parts=[];
const flush=()=>{if(!bytes)return;const name=`body-${chunks.length}.bin`,buf=Buffer.concat(segments),gz=zlib.gzipSync(buf,{level:9});fs.writeFileSync(new URL(name,out),buf);fs.writeFileSync(new URL(name+'.gz',out),gz);chunks.push({url:`models/female/${name}`,bytes:buf.length,gzip:`models/female/${name}.gz`,gzipBytes:gz.length});segments=[];bytes=0;};
const append=a=>{const padding=(4-bytes%4)%4;if(padding){segments.push(Buffer.alloc(padding));bytes+=padding;}const offset=bytes;const b=Buffer.from(a.buffer,a.byteOffset,a.byteLength);segments.push(b);bytes+=b.length;return offset;};
for(const o of manifest.organs){
 const node=docs.get(o.mesh_file).getRoot().listNodes().find(n=>n.getName()===o.node);if(!node?.getMesh())throw new Error(`Missing mesh ${o.node}`);
 const m=node.getWorldMatrix(),wp=[],wn=[],idx=[],weld=new Map();
 for(const prim of node.getMesh().listPrimitives()){
  const pos=prim.getAttribute('POSITION').getArray(),nor=prim.getAttribute('NORMAL')?.getArray(),ind=prim.getIndices()?.getArray()??Uint32Array.from({length:pos.length/3},(_,i)=>i);sourceTriangles+=ind.length/3;
  const local=new Uint32Array(pos.length/3);
  for(let i=0;i<pos.length/3;i++){const x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];const px=m[0]*x+m[4]*y+m[8]*z+m[12],py=m[1]*x+m[5]*y+m[9]*z+m[13],pz=m[2]*x+m[6]*y+m[10]*z+m[14];
   // Weld coincident vertices so simplification sees one surface, and average their normals.
   const k=`${px.toFixed(6)},${py.toFixed(6)},${pz.toFixed(6)}`;let v=weld.get(k);if(v===undefined){v=wp.length/3;weld.set(k,v);wp.push(px,py,pz);wn.push(0,0,0);}local[i]=v;
   if(nor){const a=nor[i*3],b=nor[i*3+1],c=nor[i*3+2];wn[v*3]+=m[0]*a+m[4]*b+m[8]*c;wn[v*3+1]+=m[1]*a+m[5]*b+m[9]*c;wn[v*3+2]+=m[2]*a+m[6]*b+m[10]*c;}}
  for(const i of ind)idx.push(local[i]);
 }
 const pos=new Float32Array(wp),indices=new Uint32Array(idx);
 if(!wn.some(v=>v!==0)){for(let t=0;t<indices.length;t+=3){const [a,b,c]=[indices[t],indices[t+1],indices[t+2]];const ux=pos[b*3]-pos[a*3],uy=pos[b*3+1]-pos[a*3+1],uz=pos[b*3+2]-pos[a*3+2],vx=pos[c*3]-pos[a*3],vy=pos[c*3+1]-pos[a*3+1],vz=pos[c*3+2]-pos[a*3+2];const n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];for(const v of [a,b,c])for(let k=0;k<3;k++)wn[v*3+k]+=n[k];}}
 const normal=new Int16Array(wn.length);for(let i=0;i<wn.length;i+=3){const l=Math.hypot(wn[i],wn[i+1],wn[i+2])||1;for(let k=0;k<3;k++)normal[i+k]=Math.round(wn[i+k]/l*32767);}
 const target=Math.max(96,Math.floor(indices.length*.22/3)*3);
 const [simplified,error]=MeshoptSimplifier.simplify(indices,pos,3,Math.min(indices.length,target),.002);maxError=Math.max(maxError,error);
 const [remap,count]=MeshoptSimplifier.compactMesh(simplified);
 const positions=new Float32Array(count*3),normals=new Int16Array(count*3);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let old=0;old<remap.length;old++){const n=remap[old];if(n===0xffffffff)continue;positions.set(pos.subarray(old*3,old*3+3),n*3);normals.set(normal.subarray(old*3,old*3+3),n*3);for(let k=0;k<3;k++){min[k]=Math.min(min[k],pos[old*3+k]);max[k]=Math.max(max[k],pos[old*3+k]);}}
 if(bytes>4_000_000)flush();
 parts.push({id:o.organ_id,name:o.name_en,conceptId:o.organ_id,system:systemOf(o),chunk:chunks.length,positions:append(positions),normals:append(normals),indices:append(simplified),vertexCount:count,indexCount:simplified.length,bounds:[min,max]});triangles+=simplified.length/3;
}
flush();
// Concepts: every structure, both sides of paired structures, and every group in the source hierarchy.
const concepts=[],seen=new Set();
// A group that holds exactly the same structures as an existing concept (for example the ovary group and the left/right ovary pair) is not listed twice.
const add=(id,name,elements)=>{const key=[...elements].sort().join(',');if(elements.length&&!concepts.some(c=>c.id===id)&&!seen.has(key)){seen.add(key);concepts.push({id,name,elements});}};
manifest.organs.forEach(o=>add(o.organ_id,o.name_en,[o.organ_id]));
const pairs=new Map();for(const o of manifest.organs){const base=o.name_en.replace(/ \((left|right)\)$/,'').replace(/, \d+$/,'').replace(/, (upper|lower|base|dome|compact bone|spongy bone)$/,'');if(base!==o.name_en){const list=pairs.get(base)??[];list.push(o.organ_id);pairs.set(base,list);}}
for(const [name,ids] of pairs)if(ids.length>1)add('pair:'+name.toLowerCase().replace(/\W+/g,'_'),name,ids);
const groups=new Map();for(const o of manifest.organs)o.path.forEach((_,i)=>{const key=o.path.slice(0,i+1).join('/');const list=groups.get(key)??[];list.push(o.organ_id);groups.set(key,list);});
const GENERIC=/^(Arteries|Veins|Ligaments|Lobes|Impressions|Medulla|Portal system)$/;
for(const [key,ids] of groups){const path=key.split('/'),last=path[path.length-1];add('group:'+key.toLowerCase().replace(/\W+/g,'_'),GENERIC.test(last)&&path.length>1?`${last} of ${path[path.length-2].toLowerCase()}`:last,ids);}
add('group:female_trunk','Female trunk',manifest.organs.map(o=>o.organ_id));
const latin=Object.fromEntries(manifest.organs.map(o=>[o.name_en.toLowerCase(),o.ta2_latin]));
fs.writeFileSync(new URL('atlas.json',out),JSON.stringify({version:'HRA united-female v1.5 (Anatria3D selection)',sex:'female',source:'HRA / HuBMAP',scope:'Female trunk reference · 264 structures',parts,concepts,chunks,triangles,sourceTriangles,optimized:{method:'meshoptimizer quadric simplification',maximumRelativeError:.002,preservedMeshes:parts.length}}));
fs.writeFileSync(new URL('latin-source.json',out),JSON.stringify(latin,null,0));
console.log(JSON.stringify({parts:parts.length,concepts:concepts.length,triangles,sourceTriangles,chunks:chunks.length,bytes:chunks.reduce((n,c)=>n+c.bytes,0),gzip:chunks.reduce((n,c)=>n+c.gzipBytes,0),maxError}));
