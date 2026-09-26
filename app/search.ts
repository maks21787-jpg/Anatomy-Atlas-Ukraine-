import type {Concept} from './anatomy';
/** Common Ukrainian noun and adjective endings, longest first, so "нирки", "нирок" and "нирці" all reduce to "нир". */
const ENDINGS=['ами','ями','ові','еві','ого','ому','ими','іми','их','іх','ій','ий','ої','ою','ею','ів','ах','ях','ам','ям','ом','ем','ок','ці','а','я','и','і','у','ю','о','е','ь','й'];
const WORD=/[\p{L}\p{N}']+/gu;
export function normalize(text:string){return text.toLocaleLowerCase('uk').replace(/[’ʼ`´]/g,"'");}
export function stem(token:string){if(/[а-яіїєґ]/.test(token)&&token.length>4)for(const ending of ENDINGS)if(token.endsWith(ending)&&token.length-ending.length>=3)return token.slice(0,-ending.length);return token;}
export interface QueryToken {raw:string;stem:string}
export function tokenize(query:string):QueryToken[]{return (normalize(query).match(WORD)??[]).map(raw=>({raw,stem:stem(raw)}));}
interface Entry {concept:Concept;uk:string;names:string[];ukWords:string[];words:string[];text:string}
export type SearchIndex=Entry[];
export function buildIndex(concepts:Concept[]):SearchIndex{return concepts.map(concept=>{const uk=normalize(concept.name),text=[uk,normalize(concept.nameLa??''),normalize(concept.nameEn??'')].join(' | ');return {concept,uk,names:[uk,normalize(concept.nameLa??''),normalize(concept.nameEn??'')],ukWords:uk.match(WORD)??[],words:text.match(WORD)??[],text};});}
/** Every query word must match the start of some word in the Ukrainian, Latin or English name (in any order); a plain substring match is accepted with a lower rank. */
export function searchConcepts(index:SearchIndex,query:string,filter?:(c:Concept)=>boolean):Concept[]{
 const tokens=tokenize(query);if(!tokens.length)return [];const whole=normalize(query).trim();const scored:{c:Concept;score:number;length:number}[]=[];
 for(const entry of index){if(filter&&!filter(entry.concept))continue;let score=0,matched=true,inUk=0;
  for(const t of tokens){if(entry.ukWords.some(w=>w.startsWith(t.stem)))inUk++;if(entry.words.includes(t.raw))continue;if(entry.words.some(w=>w.startsWith(t.stem))){score+=1;continue;}if(entry.text.includes(t.raw)){score+=4;continue;}matched=false;break;}
  if(!matched)continue;if(entry.names.includes(whole))score-=20;else if(entry.uk.startsWith(whole))score-=8;if(inUk===tokens.length)score-=3;scored.push({c:entry.concept,score,length:entry.uk.length});}
 return scored.sort((a,b)=>a.score-b.score||a.length-b.length).map(x=>x.c);
}
/** Splits a name into plain and highlighted pieces for the words that match the query. */
export function highlight(name:string,tokens:QueryToken[]):{text:string;hit:boolean}[]{
 if(!tokens.length)return [{text:name,hit:false}];const out:{text:string;hit:boolean}[]=[];let last=0;
 for(const m of name.matchAll(WORD)){const word=normalize(m[0]),t=tokens.find(t=>word.startsWith(t.stem))??tokens.find(t=>word.includes(t.raw));if(!t)continue;const start=m.index!+(word.startsWith(t.stem)?0:word.indexOf(t.raw)),len=word.startsWith(t.stem)?Math.max(t.stem.length,Math.min(t.raw.length,word.length)):t.raw.length;if(start>last)out.push({text:name.slice(last,start),hit:false});out.push({text:name.slice(start,start+len),hit:true});last=start+len;}
 if(last<name.length)out.push({text:name.slice(last),hit:false});return out;
}
