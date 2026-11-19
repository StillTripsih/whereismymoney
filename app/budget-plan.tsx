import {RotateCcw} from 'lucide-react';
import {BudgetAmount} from './budget-amount';
import {budgetSpent,projectedBudgetRemainder} from '@/lib/budget-funding';
import {daysBetween,money,today,validDate,type Currency,type State} from '@/lib/finance';
import {tr} from '@/lib/i18n';
export function BudgetPlan({amount,currency,start,end,daily,onDaily,data,budgetId='main'}:{amount:string;currency:Currency;start:string;end:string;daily:string;onDaily:(v:string)=>void;data?:State;scope?:string[];budgetId?:string}){
const spent=budgetSpent(data,budgetId,start,end,currency),left=spent===null?null:Number(amount||0)-spent,day=today(),from=start>day?start:day,days=validDate(from)&&validDate(end)&&from<=end?daysBetween(from,end):0;
const auto=left===null||!days?0:Math.max(0,left/days),limit=daily?Number(daily):auto,projected=daily?projectedBudgetRemainder(left,limit,days,budgetSpent(data,budgetId,day,day,currency)||0):left===null?null:0;
return <div className="budget-plan"><div className="budget-day-row"><small>{tr('в день')}</small><BudgetAmount value={daily||String(currency==='THB'?Math.floor(auto):Math.floor(auto*100)/100)} currency={currency} onChange={onDaily}/><button data-direct-action="true" aria-label={tr('Рассчитывать автоматически')} disabled={!daily} onClick={()=>onDaily('')}><RotateCcw size={17}/></button></div><div className="budget-remainder-row"><small>{tr('Возможный остаток')}</small><strong>{money(projected,currency)}</strong></div></div>
}