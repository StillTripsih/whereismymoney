import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Wallet,ArrowLeft,Check} from 'lucide-react';
import {usePageScrollLock} from './page-scroll-lock';
import {tr} from '@/lib/i18n';
import type {State} from '@/lib/finance';
export function BudgetPicker({data,value,onChange,multiple=false,label,allowAll=false}:{data:State;value:string[];onChange:(ids:string[])=>void;multiple?:boolean;label?:string;allowAll?:boolean}){
const [open,setOpen]=useState(false),[pending,setPending]=useState(value);
usePageScrollLock(open);
const options=[...(data.budget?[{id:'main',name:tr('Основной бюджет')}]:[]),...(data.categoryBudgets||[])];
return <><button data-direct-action="true" className="budget-picker-trigger" aria-label={label||tr('Выбор бюджета')} onClick={()=>{setPending(value);setOpen(true)}}><Wallet/></button>{open&&createPortal(<div className="budget-select-backdrop" role="dialog" aria-modal="true" aria-label={tr('Выбор бюджета')} onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}><section className="budget-select-window"><header><button data-direct-action="true" aria-label={tr('Назад')} onClick={()=>setOpen(false)}><ArrowLeft/></button><span>{tr('Выбор бюджета')}</span>{multiple&&<button className="unified-confirm" data-direct-action="true" disabled={!pending.length} aria-label={tr('Подтвердить выбор')} onClick={()=>{onChange(pending);setOpen(false)}}><Check/></button>}</header><div className="budget-select-options">{(multiple||allowAll)&&<button data-direct-action="true" aria-pressed={pending.includes('all')} onClick={()=>{if(multiple)setPending(['all']);else{onChange(['all']);setOpen(false)}}}><span>{tr('Все бюджеты')}</span>{pending.includes('all')&&<Check/>}</button>}{options.map(b=><button key={b.id} data-direct-action="true" aria-pressed={pending.includes(b.id)} onClick={()=>{if(multiple)setPending(old=>old.includes(b.id)?old.filter(id=>id!==b.id):[...old.filter(id=>id!=='all'),b.id]);else{onChange([b.id]);setOpen(false)}}}><span>{b.name}</span>{pending.includes(b.id)&&<Check/>}</button>)}</div></section></div>,document.body)}</>;
}