import {convert,entriesForBudget,today,type State,type Currency} from './finance';
export function budgetSpent(data:State|undefined,budgetId:string,start:string,end:string,currency:Currency){let spent=0;if(!data)return 0;for(const e of entriesForBudget(data.entries,budgetId)){if(e.kind!=='expense'||e.date<start||e.date>end||e.date>today())continue;const n=convert(e.amount,e.currency,currency,e.rates);if(n===null)return null;spent+=n}return Math.round(spent*100)/100}

export function projectedBudgetRemainder(left:number|null,daily:number,days:number,spentToday:number){return left===null?null:left-Math.max(0,daily-spentToday)-daily*Math.max(0,days-1)}
