import {BudgetPlan} from './budget-plan';
import {BudgetAmount} from './budget-amount';
import {visibleCurrencies} from '@/lib/currency-settings';
import {BudgetDailyPreview} from './budget-daily-preview';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {AmountDisplay} from './amount-display';
import {currencyInput} from '@/lib/currency-input';
import {quickCategories} from '@/lib/category-priority';
import {BudgetPeriod} from './budget-period';
import {Screen} from './screen';
import {WheelDate} from './wheel-date';
import {DailySummary} from './daily-summary';
import {CategoryBudgets} from './category-budgets';
import type {CategoryBudget} from '@/lib/budget';
import {useState,useRef} from 'react';
import {Camera,Mic,Plus,SlidersHorizontal,ArrowUpRight,MoreHorizontal,Calculator,Check,Wallet} from 'lucide-react';
import {budgetStatus,validBudget,type Budget} from '@/lib/budget';
import {calculate,money,today,daysBetween,convert,entriesForBudget,MAIN_BUDGET_ID,type State,type Entry,type Currency} from '@/lib/finance';
import {CatIcon,Picker,categoryOptions} from './ui';
import type {Draft} from './entry-form';
export function BudgetHome({data,day,ready,onBudget,onBudgets,onSave,onDraft,tracked,setTracked}:{data:State;day:string;ready:boolean;tracked:string;setTracked:(id:string)=>void;onBudgets:(b:CategoryBudget[])=>Promise<void>;onBudget:(b:Budget)=>Promise<void>;onSave:(e:Entry[])=>Promise<void>;onDraft:(d:Draft)=>void}){
 const scoped=data.categoryBudgets?.find(b=>b.id===tracked);
 const b=tracked===MAIN_BUDGET_ID?data.budget:scoped;
 const trackedEntries=entriesForBudget(data.entries,tracked).map(e=>({...e,rates:data.rates}));
 const [moreCategories,setMoreCategories]=useState(false);
 const [editing,setEditing]=useState(false),[expr,setExpr]=useState(''),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);const directCamera=useRef<HTMLInputElement>(null);
 const currency=data.display;
 const convertedAmount=b?convert(b.amount,b.currency,currency,data.rates):null;
 const shownBudget=b&&convertedAmount!==null?{...b,amount:Math.round(convertedAmount*100)/100,currency,...(b.dailyLimit===undefined?{}:{dailyLimit:Math.round((convert(b.dailyLimit,b.currency,currency,data.rates)??b.dailyLimit)*100)/100})}:b;
 const status=b?budgetStatus(shownBudget!,trackedEntries,day):null;
 const quick=quickCategories(data).map(id=>data.categories.find(c=>c.id===id&&!c.archived)).filter(c=>!!c);
 const activeCats=data.categories.filter(c=>!c.archived);
 const budgetOptions=[[MAIN_BUDGET_ID,<span className="budget-choice"><Wallet/><span><b>{tr("Основной бюджет")}</b><small>{tr("Все прежние операции")}</small></span></span>],...(data.categoryBudgets||[]).map(item=>[item.id,<span className="budget-choice"><Wallet/><span><b>{item.name}</b><small>{item.categories.map(id=>categoryLabel(data.categories.find(c=>c.id===id))||id).join(' · ')}</small></span></span>])];
 let amount:number|null=null;try{amount=currency==='THB'?Math.round(calculate(expr)):calculate(expr)}catch{}
 async function save(){if(lock.current)return;setError('');if(!amount||amount<=0){setError(tr("Введите сумму расхода"));return;}if(selected&&!activeCats.some(c=>c.id===selected)){setError(tr("Выберите категорию"));return;}lock.current=true;setBusy(true);try{await onSave([{id:crypto.randomUUID(),group:crypto.randomUUID(),amount,currency,kind:'expense',category:selected||'cat-unknown',date:day,note:'',rates:{...data.rates},created:new Date().toISOString(),budgetId:tracked}]);setExpr('');setSelected('');}catch(e:any){setError(tr(e.message))}finally{lock.current=false;setBusy(false);}}
 if(editing)return <Screen title={tr("Бюджеты")} heading={<span/>} back={()=>setEditing(false)}><BudgetEditor value={b} data={data} scope={scoped?.categories} available={visibleCurrencies(data)} categories={data.categories} ready={ready} onSave={async next=>{if(scoped)await onBudgets((data.categoryBudgets||[]).map(old=>old.id===scoped.id?{...old,...next}:old));else await onBudget(next);setEditing(false)}}/><CategoryBudgets data={data} day={day} ready={ready} onSave={onBudgets}/></Screen>;
 return <div className="budget-home"><div className="tracked-budget"><Picker value={tracked} onChange={setTracked} options={budgetOptions} label={tr("Отслеживаемый бюджет")}/></div>
  <DailySummary budget={shownBudget} entries={trackedEntries} day={day} onEdit={()=>setEditing(true)}/>
 <section className="quick-expense" aria-label={tr("Быстрый расход")}><input ref={directCamera} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)onDraft({category:selected,method:'photo',file,budgetId:tracked})}}/>
   <div className="quick-categories">{quick.map(c=><button key={c.id} title={categoryLabel(c)} aria-label={categoryLabel(c)} className={selected===c.id?'chosen':''} aria-pressed={selected===c.id} onClick={()=>setSelected(selected===c.id?'':c.id)}><CatIcon category={c}/></button>)}<button className={moreCategories?'chosen':''} aria-label={tr("Другая категория")} title={tr("Другая категория")} aria-expanded={moreCategories} aria-controls="quick-category-picker" onClick={()=>setMoreCategories(!moreCategories)}><MoreHorizontal size={24}/></button></div>
   {moreCategories&&<div className="other-category" id="quick-category-picker"><Picker value={selected} onChange={id=>{setSelected(id);setMoreCategories(false)}} options={categoryOptions(activeCats)} label={tr("Категория расхода")} autoOpen onDismiss={()=>setMoreCategories(false)}/></div>}
   <p className="selected-category" aria-live="polite">{selected?categoryLabel(activeCats.find(c=>c.id===selected)):""}</p>
   {error&&<p className="error" role="alert">{tr(error)}</p>}
   <div className="expense-control-row"><div className="entry-methods"><button data-direct-action="true" aria-label={tr("Чек")} onClick={()=>directCamera.current?.click()}><Camera/></button><button aria-label={tr("Голос")} onClick={()=>onDraft({category:selected,method:'voice',budgetId:tracked})}><Mic/></button></div><AmountDisplay text={expr||'0'} currency={currency}/><button className="primary save-circle" aria-label={tr("Сохранить расход")} disabled={!ready||busy||!amount||amount<=0} onClick={save}><Check/></button></div>
   <div className="home-keypad">{['7','8','9','÷','4','5','6','×','1','2','3','−','0','⌫','=','+'].map(key=><button key={key} className={['÷','×','−','+','='].includes(key)?'operator':''} aria-label={key==='⌫'?tr("Удалить цифру"):key} onClick={()=>{setError('');if(key==='C')setExpr('');else if(key==='⌫')setExpr(expr.slice(0,-1));else if(key==='='){try{setExpr(String(currency==='THB'?Math.round(calculate(expr)):calculate(expr)))}catch(e:any){setError(tr(e.message))}}else setExpr(expr+({'÷':'/','×':'*','−':'-'}[key]||key))}}>{key}</button>)}</div>
  {currency!=='THB'&&<button className="decimal-key" aria-label={tr("Десятичная точка")} onClick={()=>setExpr(expr+'.')}>.</button>}</section>

 </div>;
}
export function BudgetEditor({value,categories,ready,onSave,onCancel,available,data,scope}:{value?:Budget;data?:State;scope?:string[];available?:Currency[];categories:State['categories'];ready:boolean;onSave:(b:Budget)=>Promise<void>;onCancel?:()=>void}){
 const now=today(),endOfMonth=new Date(Number(now.slice(0,4)),Number(now.slice(5,7)),0).getDate();
 const [amount,setAmount]=useState(String(value?.amount?(value.currency==='THB'?Math.round(value.amount):value.amount):'')),[daily,setDaily]=useState(value?.dailyLimit!==undefined?String(value.dailyLimit):''),[currency]=useState<Currency>(data?.display||value?.currency||'THB'),[start,setStart]=useState(value?.start||now),[end,setEnd]=useState(value?.end||now.slice(0,8)+endOfMonth),[policy,setPolicy]=useState<Budget['policy']>(value?.policy||'spread'),[quick,setQuick]=useState(value?.quick||['cat-0','cat-1','cat-fun']),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function save(){setError('');try{if(daily&&currencyInput(daily,currency)<=0)throw Error(tr('Дневной лимит должен быть больше нуля'));const next={amount:currencyInput(amount,currency),currency,start,end,policy,quick,dailyLimit:daily?currencyInput(daily,currency):undefined};if(!validBudget(next))throw Error(tr("Укажите сумму больше нуля и период до 366 дней"));setBusy(true);await onSave(next)}catch(e:any){setError(tr(e.message))}finally{setBusy(false)}}
 return <section className="budget-editor"><div className="row spaced">{onCancel&&<button className="text-button budget-back" aria-label={tr("Назад")} onClick={onCancel}>←</button>}</div>
 <div className="input-pair"><div className="field"><BudgetAmount value={amount} currency={currency} onChange={setAmount}/></div><span className="budget-currency-mark" aria-label={tr("Тайский бат")}>฿</span></div>
 <BudgetPeriod start={start} end={end} onStart={setStart} onEnd={setEnd}/><BudgetPlan amount={amount} currency={currency} start={start} end={end} daily={daily} onDaily={setDaily} data={data} scope={scope}/>


 {error&&<p className="error" role="alert">{tr(error)}</p>}<div className="budget-footer"><div className="field"><Picker value={policy} onChange={v=>setPolicy(v as Budget['policy'])} options={[["spread",tr("Распределять на оставшиеся дни")],["reserve",tr("Откладывать в резерв")]]} label={tr("Как учитывать экономию")}/></div><button className="primary save-circle" aria-label={tr("Сохранить бюджет")} disabled={!ready||busy} onClick={save}><Check/></button></div></section>;
}
