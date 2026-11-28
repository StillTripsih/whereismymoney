import {currentBudgetBalance,budgetFundingForBalance} from '@/lib/budget-balance';
import {BudgetFunding} from './budget-funding';
import {BudgetPlan} from './budget-plan';
import {BudgetAmount} from './budget-amount';
import {Screen} from './screen';
import {reportInCurrency} from '@/lib/report-currency';
import {visibleCurrencies} from '@/lib/currency-settings';
import {BudgetDailyPreview} from './budget-daily-preview';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {currencyInput} from '@/lib/currency-input';
import {quickCategories,orderedCategories} from '@/lib/category-priority';
import {BudgetPeriod} from './budget-period';
import {WheelDate} from './wheel-date';
import {Plus,Check,ArrowLeft} from 'lucide-react';
import {useRef,useState} from 'react';
import {budgetStatus,categoryBudgetStatus,validCategoryBudgets,type CategoryBudget} from '../lib/budget';
import {calculate,currencies,money,today,daysBetween,entriesForBudget,convert,type State,type Currency} from '../lib/finance';
import {labels as t} from '../lib/paired-labels';
import {CatIcon,Picker} from './ui';

export function CategoryBudgets({data,day,ready,onSave}:{data:State;day:string;ready:boolean;onSave:(value:CategoryBudget[])=>Promise<void>}){
 const budgets=data.categoryBudgets||[];
 const [editing,setEditing]=useState<CategoryBudget|null>(null),[remove,setRemove]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 async function deleteBudget(id:string){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await onSave(budgets.filter(b=>b.id!==id));setRemove(null)}catch(e:any){setError(tr(e.message))}finally{lock.current=false;setBusy(false)}}
 return <section className="category-budgets" aria-label={t.budgets}>
  {editing&&<CategoryBudgetEditor key={editing.id} value={editing} data={data} ready={ready&&!busy} onCancel={()=>setEditing(null)} onSave={async b=>{await onSave(budgets.map(old=>old.id===b.id?b:old));setEditing(null)}}/>}
  {error&&<p role="alert" className="error">{tr(error)}</p>}
  <div className="budget-cards">{budgets.map(b=>{const s=budgetStatus(b,entriesForBudget(data.entries,b.id),day);const amount=(v:number)=>s.missing?'—':money(v,b.currency);return <article className="budget-card" key={b.id}>
   <div className="row spaced"><h3>{b.name}</h3><button className="text-button" disabled={busy} onClick={()=>setEditing(b)}>{t.edit}</button></div>
   <p className="small muted">{t.totalLeft}</p>
   <div className={'daily-left '+(s.active&&s.todayLeft<0?'over-budget':'')}>{amount(s.totalLeft)}</div>
   <div className="budget-metrics"><div><span>{t.spentToday}</span><b>{amount(s.spent)}</b></div><div><span>{t.totalLeft}</span><b>{amount(s.totalLeft)}</b></div></div>
   <p>{t.nextDays}: {amount(s.future)} / {t.day}</p>
   <p className="small muted">{b.start} — {b.end} · {money(b.amount,b.currency)}</p>
   {b.policy==='reserve'&&<p className="small">{t.reserve}: {amount(s.reserve)}</p>}
   {s.missing>0&&<p className="error">{t.missingRates}</p>}
   {remove===b.id?<div><p>{t.deleteHint}</p><div className="budget-actions"><button className="secondary" disabled={busy} onClick={()=>setRemove(null)}>{t.cancel}</button><button className="primary" disabled={!ready||busy} onClick={()=>deleteBudget(b.id)}>{busy?t.saving:t.confirmDelete}</button></div></div>:<button className="text-button" disabled={busy} onClick={()=>setRemove(b.id)}>{t.deleteBudget}</button>}
  </article>})}</div>
 </section>;
}

export function CategoryBudgetEditor({value,data,ready,onCancel,onSave}:{value?:CategoryBudget;data:State;ready:boolean;onCancel:()=>void;onSave:(b:CategoryBudget)=>Promise<void>}){
 const now=today(),lastDay=new Date(Number(now.slice(0,4)),Number(now.slice(5,7)),0).getDate();
 const [name,setName]=useState(value?.name||''),[amount,setAmount]=useState(()=>{const balance=value?currentBudgetBalance(data,value,value.id,now):0;return balance===null?'':String(value?.currency==='THB'?Math.round(balance):balance)}),[daily,setDaily]=useState(value?.dailyLimit!==undefined?String(value.dailyLimit):''),[currency,setCurrency]=useState<Currency>(value?.currency||data.budget?.currency||'THB'),[start,setStart]=useState(now),[end,setEnd]=useState(value?.end&&value.end>=now?value.end:now.slice(0,8)+lastDay),[policy,setPolicy]=useState<CategoryBudget['policy']>(value?.policy||'spread'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const categories=value?.categories||[];
 const lock=useRef(false);
 async function save(){if(lock.current)return;setError('');try{if(!name.trim())throw Error(tr("Введите название бюджета"));if(daily&&currencyInput(daily,currency)<=0)throw Error(tr('Дневной лимит должен быть больше нуля'));const next:CategoryBudget={id:value?.id||crypto.randomUUID(),name:name.trim(),amount:budgetFundingForBalance(currencyInput(amount,currency),currency,start,end,data,value?.id||"new",now),currency,start,end,policy,dailyLimit:daily?currencyInput(daily,currency):undefined,quick:categories.slice(0,6),categories};if(!name.trim())throw Error(tr("Введите название бюджета"));if(start>end)throw Error(tr("Начало периода позже окончания"));if(daysBetween(start,end)>366)throw Error(tr("Период — не больше 366 дней"));if(!validCategoryBudgets([next]))throw Error(tr("Проверьте сумму и период"));lock.current=true;setBusy(true);await onSave(next)}catch(e:any){setError(tr(e.message))}finally{lock.current=false;setBusy(false)}}
 return <Screen title={value?t.editBudget:t.newBudget} heading={<input className="budget-name-title" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={t.name} value={name} maxLength={80} placeholder={t.newBudget} onChange={e=>setName(e.target.value)}/>} back={onCancel} busy={busy}><section className="budget-editor">
  <div className="input-pair"><div className="field">{t.amount}<BudgetFunding amount={amount} currency={currency} start={start} end={end} data={data} budgetId={value?.id||"new"} onChange={setAmount}/></div><div className="field">{t.currency}<Picker value={currency} onChange={v=>{const next=v as Currency;const n=convert(Number(amount||0),currency,next,data.rates);if(n!==null){setAmount(String(next==="THB"?Math.round(n):Math.round(n*100)/100));setCurrency(next);setDaily("")}}} options={visibleCurrencies(data).map(c=>[c,c])} label={t.currency}/></div></div>
  <BudgetPeriod start={start} end={end} onStart={()=>setStart(now)} onEnd={setEnd}/><BudgetPlan amount={amount} currency={currency} start={start} end={end} daily={daily} onDaily={setDaily} data={data} budgetId={value?.id||"new"} scope={categories}/>
  
  {error&&<p role="alert" className="error">{tr(error)}</p>}
  <div className="budget-footer"><div className="field"><Picker value={policy} onChange={v=>setPolicy(v as CategoryBudget['policy'])} options={[["spread",t.spread],["reserve",t.reserve]]} label={t.savings}/></div><button className="primary save-circle" aria-label={t.saveBudget} disabled={!ready||busy} onClick={save}><Check/></button></div>
 </section></Screen>;
}


