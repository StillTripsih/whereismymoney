import {validateLanguagePack,builtInLanguages,type LanguagePack} from './language-packs';
import legacy from './legacy-category-labels.json';
import dictionary from './translations.json';
export type Language=string;
export const languageNames:Record<Language,string>={th:'ไทย',en:'English',ru:'Русский',uk:'Українська'};
export const languages:Language[]=['th','en','ru','uk'];
const listeners=new Set<()=>void>();
let current:Language='ru';
try{const saved=localStorage.getItem('wimm-language');const fallback=document.documentElement.lang;current=languages.includes(saved as Language)?saved as Language:languages.includes(fallback as Language)?fallback as Language:'ru'}catch{}
export const getLanguage=()=>current;
export const subscribeLanguage=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};
export function setLanguage(language:Language){if(!languages.includes(language))throw Error('Invalid language');current=language;try{localStorage.setItem('wimm-language',language)}catch{}if(typeof document!=='undefined')document.documentElement.lang=language;listeners.forEach(fn=>fn())}
export const localeCode=()=>({ru:'ru-RU',th:'th-TH-u-ca-gregory',en:'en-US',uk:'uk-UA'} as Record<string,string>)[current]||'en-US';
export const speechLocale=()=>({ru:'ru-RU',th:'th-TH',en:'en-US',uk:'uk-UA'} as Record<string,string>)[current]||current;
const entries:Record<string,{en:string;th:string;uk:string}>=dictionary;
let packs:LanguagePack[]=[];
export function registerLanguagePacks(value:LanguagePack[]){const next=value.map(pack=>validateLanguagePack(pack));if(next.length>20||new Set(next.map(p=>p.code)).size!==next.length)throw Error('Проверьте файл языка');packs=next;languages.splice(0,languages.length,'th','en','ru','uk',...packs.map(p=>p.code));for(const p of packs)languageNames[p.code]=p.name;try{localStorage.setItem('finance-language-packs',JSON.stringify(packs))}catch{}}
try{registerLanguagePacks(JSON.parse(localStorage.getItem('wimm-language-packs')||'[]'));const saved=localStorage.getItem('wimm-language');if(saved&&languages.includes(saved))current=saved}catch{}

const canonical=new Map<string,string>();for(const [key,values] of Object.entries(entries))for(const value of Object.values(values))canonical.set(value,key);
export function tr(key:string,args:unknown[]=[]):string{key=entries[key]?key:canonical.get(key)||key;let text=current==='ru'?key:builtInLanguages.includes(current)?entries[key]?.[current as 'en'|'th'|'uk']??key:packs.find(p=>p.code===current)?.translations[key]??entries[key]?.en??key;return text.replace(/\{(\d+)\}/g,(match,n)=>args[+n]===undefined?match:String(args[+n]))}
const defaults=['Продукты в магазинах','Кафе и рестораны','Аренда жилья','Коммунальные платежи','Мотобайк','Бензин','Виза','Медицина','Уход за собой','Подарки','Связь и интернет','Спорт и хобби','Одежда','Свидания','Путешествия и приключения','Разное','Алкоголь','Товары для дома'];
export function categoryLabel(c?:{id:string;name:string}):string{if(!c)return '';const key=c.id==='cat-fun'?'Развлечения':c.id==='cat-unknown'?'Неопознано':/^cat-\d+$/.test(c.id)?defaults[Number(c.id.slice(4))]:undefined;if(!key)return c.name;const standard=[key,(legacy as Record<string,string>)[key],...Object.values(entries[key]||{})];return standard.includes(c.name)?tr(key):c.name}
