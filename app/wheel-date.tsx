import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {useState,useRef,useEffect} from 'react';
import {Check,ArrowLeft} from 'lucide-react';
export function Wheel({values,value,onChange,label}:{values:string[];value:string;onChange:(v:string)=>void;label:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=ref.current;if(el)el.scrollTop=Math.max(0,values.indexOf(value))*44},[values.join('|')]);
 return <div className="date-wheel" ref={ref} role="listbox" aria-label={label} onScroll={e=>{const i=Math.round(e.currentTarget.scrollTop/44);if(values[i]!==undefined)onChange(values[i])}}>{values.map(v=><button role="option" aria-selected={v===value} key={v} onClick={()=>{onChange(v);ref.current?.scrollTo({top:values.indexOf(v)*44,behavior:'smooth'})}}>{v}</button>)}</div>;
}
export function WheelDate({value,onChange,label}:{value:string;onChange:(v:string)=>void;label:string}){
 const [open,setOpen]=useState(false),[parts,setParts]=useState(value.split('-').map(Number));
 const [y,m,d]=parts;const max=new Date(y,m,0).getDate();
 const change=(i:number,v:string)=>setParts(p=>p.map((n,j)=>j===i?Number(v):n));
 return <><button className="date-trigger" onClick={()=>{setParts(value.split('-').map(Number));setOpen(true)}} aria-label={label}>{value.slice(8,10)+'.'+value.slice(5,7)+'.'+value.slice(2,4)}</button>{open&&<div className="wheel-overlay" role="dialog" aria-modal="true" aria-label={label}><section><header><span>{label}</span><button aria-label={tr("Закрыть")} onClick={()=>setOpen(false)}><ArrowLeft size={28}/></button></header><div className="wheel-columns"><Wheel label={tr("День")} values={Array.from({length:max},(_,i)=>String(i+1))} value={String(Math.min(d,max))} onChange={v=>change(2,v)}/><Wheel label={tr("Месяц")} values={Array.from({length:12},(_,i)=>String(i+1))} value={String(m)} onChange={v=>change(1,v)}/><Wheel label={tr("Год")} values={Array.from({length:31},(_,i)=>String(new Date().getFullYear()-10+i))} value={String(y)} onChange={v=>change(0,v)}/></div><p className="month-caption">{new Intl.DateTimeFormat("en",{month:"long"}).format(new Date(y,m-1,1))}</p><button className="primary save-circle" aria-label={tr("Выбрать дату")} onClick={()=>{onChange([y,String(m).padStart(2,'0'),String(Math.min(d,max)).padStart(2,'0')].join('-'));setOpen(false)}}><Check/></button></section></div>}</>;
}
