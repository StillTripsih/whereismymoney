import {createPortal} from 'react-dom';
import {usePageScrollLock} from './page-scroll-lock';
import {allCurrencies,symbols} from '@/lib/finance';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
'use client';
import {useState,useEffect,createContext,useContext} from 'react';
import {Check,ArrowLeft,ArrowLeftRight,Landmark} from 'lucide-react';
import {
  ShoppingBasket,
  Utensils,
  House,
  Lightbulb,
  Bike,
  Fuel,
  Stamp,
  HeartPulse,
  Scissors,
  Gift,
  Wifi,
  Dumbbell,
  Shirt,
  Heart,
  Plane,
  Ellipsis,
  Beer,
  SprayCan,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/lib/finance';
import type { ReactNode } from 'react';
const icons = [
  ShoppingBasket,
  Utensils,
  House,
  Lightbulb,
  Bike,
  Fuel,
  Stamp,
  HeartPulse,
  Scissors,
  Gift,
  Wifi,
  Dumbbell,
  Shirt,
  Heart,
  Plane,
  Ellipsis,
  Beer,
  SprayCan,
];
export const CategoryPriorityContext=createContext<string[]>(['cat-0','cat-1','cat-fun']);
export function Picker({value,onChange,options,label,autoOpen=false,onDismiss,trigger}:{value:string;onChange:(s:string)=>void;options:(string|ReactNode)[][];label:string;autoOpen?:boolean;onDismiss?:()=>void;trigger?:ReactNode}){
 const priorities=useContext(CategoryPriorityContext);
 const [open,setOpen]=useState(autoOpen),[pending,setPending]=useState(value);
 usePageScrollLock(open);
 const dismiss=()=>{setOpen(false);onDismiss?.()};
 const categoryGrid=options.length>0&&options.every(o=>typeof o[1]!=='string'&&(o[1] as any)?.props?.className==='category-option');
 if(categoryGrid)options=[...options].sort((a,b)=>{const x=priorities.indexOf(String(a[0])),y=priorities.indexOf(String(b[0]));return (x<0?999:x)-(y<0?999:y)});
 const currency=options.length>0&&options.every(o=>allCurrencies.includes(String(o[0]) as any));
 const policy=options.some(o=>o[0]==='spread')&&options.some(o=>o[0]==='reserve');
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')dismiss()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[open]);
 if(policy)return <div className="policy-inline" role="group" aria-label={label}>{options.map(([v,t])=><button key={String(v)} aria-label={String(t)} title={String(t)} aria-pressed={value===String(v)} onClick={()=>onChange(String(v))}>{v==='spread'?<ArrowLeftRight/>:<Landmark/>}<small>{v==='spread'?tr("Распределить"):tr("Отложить")}</small></button>)}</div>;
 const text=(v:any,t:any)=>currency?(symbols as Record<string,string>)[String(v)]:policy?(v==='spread'?'↔':'♧'):typeof t==='string'?tr(t):t;
 return <><button className="picker-button" aria-label={label} aria-haspopup="dialog" onClick={()=>{setPending(value);setOpen(true)}}>{trigger??text(value,options.find(o=>o[0]===value)?.[1]||label)}</button>{open&&createPortal(<div className={'picker-overlay '+(currency?'currency-picker':policy?'policy-picker':categoryGrid?'category-grid-picker':label===tr("Отслеживаемый бюджет")?'flat-list-picker budget-list-picker':'flat-list-picker')} role="dialog" aria-modal="true" aria-label={label} onTouchMove={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()} onClick={e=>{if(e.target===e.currentTarget)dismiss()}}><section><button className="picker-close" data-direct-action="true" aria-label={tr("Назад")} onClick={()=>dismiss()}><ArrowLeft size={28}/></button><div className="picker-options">{options.map(([v,t])=><button className={categoryGrid&&priorities.includes(String(v))?'priority-category':''} key={String(v)} aria-label={typeof t==='string'?t:(t as any)?.props?.children?.[1]?.props?.children||String(v)} title={typeof t==='string'?t:(t as any)?.props?.children?.[1]?.props?.children||String(v)} aria-pressed={pending===String(v)} onClick={()=>{setPending(String(v));if(!currency&&!policy&&!categoryGrid){onChange(String(v));dismiss()}}}>{text(v,t)}{pending===String(v)&&!currency&&!policy&&<span>✓</span>}</button>)}</div>{(currency||policy||categoryGrid)&&<button className="primary save-circle picker-confirm" data-direct-action="true" aria-label={tr("Подтвердить выбор")} onClick={()=>{onChange(pending);dismiss()}}><Check/></button>}</section></div>,document.body)}</>;
}
export function categoryOptions(categories: Category[]): [string, ReactNode][] {
  return categories.map((c) => [
    c.id,
    <span className="category-option">
      <CatIcon category={c} />
      <span>{categoryLabel(c)}</span>
    </span>,
  ]);
}
export function CatIcon({ category,color }: { category?: Category;color?:string }) {
  const Icon = icons[category?.icon ?? 15] || Ellipsis;
  return (
    <span className={"entry-icon"+(color?" analysis-entry-icon":"")} style={color?{'--category-color':color} as React.CSSProperties:undefined}>
      <Icon size={18} />
    </span>
  );
}
