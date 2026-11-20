import {BudgetAmount} from './budget-amount';
import {tr} from '@/lib/i18n';
import type {State,Currency} from '@/lib/finance';
export function BudgetFunding({amount,currency,onChange}:{amount:string;currency:Currency;start:string;end:string;data?:State;budgetId:string;onChange:(value:string)=>void}){return <div className="budget-funding"><small>{tr('Остаток бюджета')}</small><BudgetAmount value={amount||'0'} currency={currency} onChange={onChange}/></div>}
