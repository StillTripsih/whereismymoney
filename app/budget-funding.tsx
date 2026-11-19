import {budgetSpent} from '@/lib/budget-funding';
import {BudgetAmount} from './budget-amount';
import {convert,entriesForBudget,today,type State,type Currency} from '@/lib/finance';
import {tr} from '@/lib/i18n';
export function BudgetFunding({amount,currency,start,end,data,budgetId,onChange}:{amount:string;currency:Currency;start:string;end:string;data?:State;budgetId:string;onChange:(v:string)=>void}){
const spent=budgetSpent(data,budgetId,start,end,currency),remaining=spent===null?null:Math.round((Number(amount||0)-spent)*100)/100;
return <div className="budget-funding"><small>{tr('Остаток бюджета')}</small>{remaining===null?<p>{tr('Не хватает курса')}</p>:<BudgetAmount value={String(remaining)} currency={currency} onChange={v=>onChange(String(Math.round((Number(v)+(spent||0))*100)/100))}/>}</div>
}