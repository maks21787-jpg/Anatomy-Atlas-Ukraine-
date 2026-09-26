export type SystemId = 'skeletal'|'muscular'|'arterial'|'venous'|'nervous'|'digestive'|'respiratory'|'urinary'|'reproductive'|'lymphatic'|'endocrine'|'integumentary'|'connective'|'sensory'|'cardiac';
export const SYSTEMS: {id:SystemId;name:string;color:string;description:string}[] = [
 {id:'skeletal',name:'Скелет',color:'#e2d9ba',description:'Кістки утворюють опорний каркас тіла, захищають органи та слугують місцями прикріплення м\'язів. Їхня внутрішня тканина накопичує мінеральні речовини й утворює клітини крові.'},
 {id:'muscular',name:'М\'язи',color:'#a85b50',description:'Скелетні м\'язи створюють рух, тягнучи за місця свого прикріплення. Разом із сухожилками вони рухають суглоби, утримують поставу й виробляють тепло.'},
 {id:'cardiac',name:'Серце',color:'#b96760',description:'Серце — м\'язовий насос із чотирма камерами. Його клапани спрямовують кров в одному напрямку через мале й велике кола кровообігу.'},
 {id:'sensory',name:'Органи чуття',color:'#b0c8ce',description:'Ці структури забезпечують спеціальні чуття, зокрема зір, слух і рівновагу. Їхні спеціалізовані тканини сприймають подразники й передають інформацію нервовій системі.'},
 {id:'arterial',name:'Артерії',color:'#c05245',description:'Серце рухає кров судинами. Артерії несуть кров від серця до тканин, а в малому колі кровообігу — до легень.'},
 {id:'venous',name:'Вени',color:'#527c9f',description:'Вени повертають кров до серця. Поверхневі та глибокі венозні сітки збирають кров від тканин, а легеневі вени приносять насичену киснем кров від легень.'},
 {id:'nervous',name:'Нервова система',color:'#d8b565',description:'Головний і спинний мозок та периферичні нерви передають і обробляють сигнали. Вони забезпечують чутливість, рух, координацію та автоматичну регуляцію функцій організму.'},
 {id:'respiratory',name:'Дихальна система',color:'#b98991',description:'Дихальні шляхи проводять повітря до легень, де кисень і вуглекислий газ переходять між повітрям і кров\'ю. Дихання відбувається завдяки змінам тиску, які створюють дихальні м\'язи.'},
 {id:'digestive',name:'Травна система',color:'#b8916b',description:'Травний тракт розщеплює їжу, всмоктує поживні речовини й воду та просуває неперетравлені залишки далі. Додаткові органи постачають жовч і травні ферменти.'},
 {id:'urinary',name:'Сечова система',color:'#b47961',description:'Нирки фільтрують кров і регулюють водний, електролітний та кислотно-основний баланс. Сеча надходить сечоводами до сечового міхура й виводиться через сечівник.'},
 {id:'lymphatic',name:'Лімфатична система',color:'#879f7c',description:'Лімфатичні судини повертають надлишок тканинної рідини в кровоплин. Лімфатичні вузли та інші лімфоїдні органи беруть участь в імунному нагляді й імунних реакціях.'},
 {id:'endocrine',name:'Ендокринна система',color:'#c5a09a',description:'Ендокринні органи виділяють гормони в кров і так узгоджують обмін речовин, ріст, реакцію на стрес і розмноження.'},
 {id:'reproductive',name:'Статева система',color:'#bda098',description:'Статеві органи утворюють статеві клітини та гормони. У чоловіків вони забезпечують дозрівання й транспорт сперматозоїдів, у жінок — дозрівання яйцеклітин, запліднення й виношування вагітності. Молочні залози тут віднесено до цієї системи.'},
 {id:'integumentary',name:'Поверхня тіла',color:'#ba9b7d',description:'Поверхня тіла слугує зовнішнім анатомічним орієнтиром. Покривна система утворює захисний бар\'єр і бере участь у чутливості та терморегуляції.'},
 {id:'connective',name:'Сполучна тканина',color:'#aec3bb',description:'Хрящі, зв\'язки та інші сполучні тканини підтримують, з\'єднують і розмежовують структури. Вони стабілізують суглоби й розподіляють механічне навантаження.'},
];
export interface Part {id:string;name:string;nameEn?:string;nameLa?:string;conceptId:string;system:SystemId;chunk:number;positions:number;normals:number;indices:number;vertexCount:number;indexCount:number;bounds:[number[],number[]]}
export interface Concept {id:string;name:string;nameEn?:string;nameLa?:string;elements:string[]}
export interface Atlas {version:string;sex?:'male';source?:string;scope?:string;parts:Part[];concepts:Concept[];chunks:{url:string;bytes:number;gzip?:string;gzipBytes?:number}[];triangles:number}
/** Camera presets. 'left' looks at the patient's left side (+x), 'right' at the right side (-x). */
export type View = 'three-quarter'|'front'|'back'|'left'|'right'|'top';
export type SectionAxis = 'axial'|'coronal'|'sagittal';
export type LabelMode = 'uk'|'la'|null;
/** Screen space, in CSS pixels, that panels cover on each side of the 3D view. */
export interface Insets {left:number;right:number;top:number;bottom:number}
export type Theme='light'|'dark';
/** zoom, focus and snapshot are commands: each new id is applied once. */
export interface SceneState {
 inspectorOpen?:boolean;explode:number;visible:SystemId[];selected:string[];isolate:boolean;view:View;rotate:boolean;reset:number;
 theme?:Theme;zoom?:{id:number;factor:number};focus?:number;snapshot?:number;
 /** Auto-rotation speed; the intro spins the body faster than the atlas does. */
 spin?:number;
 hidden?:string[];xray?:SystemId[];glass?:boolean;labels?:LabelMode;
 section?:{axis:SectionAxis;position:number}|null;
 scan?:{on:boolean;hold:boolean;position:number};
 coverage?:Record<string,number>|null;insets?:Insets;
}
export const DEFAULT_VISIBLE:SystemId[] = ['cardiac','sensory','skeletal','muscular','arterial','venous','nervous','respiratory','digestive','urinary','lymphatic','endocrine','reproductive','connective'];
export const EXPLANATIONS:Record<string,string> = {
 'uterus':'Порожнистий м\'язовий орган малого таза. Його слизова оболонка щомісяця готується до прийняття заплідненої яйцеклітини, а м\'язова стінка виношує плід і скорочується під час пологів.',
 'ovary':'Парна жіноча статева залоза. У яєчниках дозрівають яйцеклітини й утворюються гормони естрогени та прогестерон.',
 'uterine tube':'Парна трубка, що з\'єднує ділянку яєчника з порожниною матки. У ній зазвичай відбувається запліднення, а війки та м\'язи стінки просувають яйцеклітину до матки.',
 'breast':'Молочна залоза лежить на грудній стінці. Її часточки виробляють молоко після пологів, а протоки відводять його до соска.',
 'vagina':'М\'язово-сполучнотканинна трубка, що з\'єднує шийку матки із зовнішніми статевими органами.',
 'kidney':'Парний орган у заочеревинному просторі. Нирки фільтрують кров, утворюють сечу, регулюють водно-сольовий баланс і артеріальний тиск.',
 'heart':'М\'язовий насос у грудній клітці. Права половина серця спрямовує кров до легень, ліва — у велике коло кровообігу.',
 'liver':'Великий орган під правою частиною діафрагми. Переробляє всмоктані поживні речовини, утворює жовч і синтезує багато білків плазми крові.',
 'brain':'Центральний орган нервової системи. Його взаємопов\'язані ділянки забезпечують сприйняття, рух, пам\'ять, мовлення та регуляцію функцій організму.',
 'stomach':'М\'язовий порожнистий орган між стравоходом і тонкою кишкою. Накопичує їжу та перемішує її з кислотою й ферментами, а потім порціями передає в дванадцятипалу кишку.',
 'spleen':'Лімфоїдний орган у лівій верхній частині живота. Фільтрує кров, видаляє старі клітини крові та бере участь в імунних реакціях.',
 'pancreas':'Орган черевної порожнини з травною та ендокринною функціями. Постачає ферменти в тонку кишку й виділяє гормони, зокрема інсулін і глюкагон.',
 'urinary bladder':'М\'язовий резервуар у порожнині таза, де накопичується сеча, що надходить від нирок сечоводами.',
 'trachea':'Основний дихальний шлях між гортанню та бронхами. Хрящові півкільця не дають йому спадатися під час дихання.',
 'diaphragm':'Широкий м\'яз, що відокремлює грудну порожнину від черевної. Під час скорочення збільшує об\'єм грудної клітки й допомагає втягувати повітря в легені.',
};
export function explanation(nameEn:string,system:SystemId){return EXPLANATIONS[nameEn.toLowerCase()] ?? SYSTEMS.find(s=>s.id===system)?.description ?? '';}
/** Replaces English BodyParts3D names with Ukrainian ones, adds Latin names, and keeps the originals in nameEn for search and explanations. */
export function localizeAtlas(atlas:Atlas,uk:Record<string,string>,la:Record<string,string>):Atlas{
 const lookup=(names:Record<string,string>,name:string)=>{const t=names[name.toLowerCase()];return t?t.charAt(0).toLocaleUpperCase('uk')+t.slice(1):undefined;};
 const names=(name:string)=>({nameEn:name,name:lookup(uk,name)??name,nameLa:lookup(la,name)});
 return {...atlas,parts:atlas.parts.map(p=>({...p,...names(p.name)})),concepts:atlas.concepts.map(c=>({...c,...names(c.name)}))};
}
