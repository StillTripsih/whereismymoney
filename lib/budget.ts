import {currencyCodes} from './currency-catalog';
import {convert,daysBetween,shiftDate,validDate,type Currency,type Entry} from './finance';
export type Budget = {dailyLimit?:number;amount:number;currency:Currency;start:string;end:string;policy:'spread'|'reserve';quick:string[]};
export function validBudget(b:any): b is Budget {
 return !!b && (b.dailyLimit===undefined||(Number.isFinite(b.dailyLimit)&&b.dailyLimit>0&&b.dailyLimit<=1e12&&Math.abs(b.dailyLimit*100-Math.round(b.dailyLimit*100))<.001)) && Number.isFinite(b.amount) && b.amount>0 && b.amount<=1e12 && Math.abs(b.amount*100-Math.round(b.amount*100))<0.001 && (currencyCodes as readonly string[]).includes(b.currency) && validDate(b.start) && validDate(b.end) && b.start<=b.end && daysBetween(b.start,b.end)<=366 && ['spread','reserve'].includes(b.policy) && Array.isArray(b.quick) && b.quick.length<=6 && b.quick.every((id:any)=>typeof id==='string' && id.length<=80);
}
export function budgetStatus(b:Budget,entries:Entry[],day:string) {
 const byDay=new Map<string,number>();let missing=0;
 for(const e of entries){if(e.kind!=='expense'||e.date<b.start||e.date>b.end||e.date>day)continue;const n=convert(e.amount,e.currency,b.currency,e.rates);if(n===null){missing++;continue;}byDay.set(e.date,(byDay.get(e.date)||0)+Math.round(n*100));}
 let pool=Math.round(b.amount*100),reserve=0;
 const active=day>=b.start&&day<=b.end;
 const until=day>b.end?shiftDate(b.end,1):day;
 for(let d=b.start;d<until;d=shiftDate(d,1)){
  const allowance=Math.max(0,b.dailyLimit===undefined?Math.floor(pool/daysBetween(d,b.end)):Math.min(Math.round(b.dailyLimit*100),pool));
  const spent=byDay.get(d)||0;
  const saved=b.policy==='reserve'?Math.max(0,allowance-spent):0;
  reserve+=saved;pool-=spent+saved;
 }
 const days=active?daysBetween(day,b.end):day<b.start?daysBetween(b.start,b.end):0;
 const allowance=days?Math.max(0,b.dailyLimit===undefined?Math.floor(pool/days):Math.min(Math.round(b.dailyLimit*100),pool)):0;
 const spent=active?(byDay.get(day)||0):0;
 const remaining=pool-spent;
 const futureDays=active?days-1:days;
 const futurePool=remaining-(b.policy==='reserve'&&active?Math.max(0,allowance-spent):0);
 return {active,missing,days,spent:spent/100,allowance:allowance/100,todayLeft:(allowance-spent)/100,totalLeft:(remaining+reserve)/100,reserve:reserve/100,spendable:remaining/100,future:futureDays?Math.max(0,b.dailyLimit===undefined?Math.floor(futurePool/futureDays):Math.min(Math.round(b.dailyLimit*100),futurePool))/100:0,futureDays};
}

export type CategoryBudget=Budget & {id:string;name:string;categories:string[]};
export function validCategoryBudgets(value:any): value is CategoryBudget[]{
 return Array.isArray(value)&&value.length<=50&&new Set(value.map(b=>b?.id)).size===value.length&&value.every(b=>!!b&&typeof b.id==='string'&&b.id.length>0&&b.id.length<=80&&typeof b.name==='string'&&b.name.trim().length>0&&b.name.length<=80&&Array.isArray(b.categories)&&b.categories.length>0&&b.categories.length<=100&&new Set(b.categories).size===b.categories.length&&b.categories.every((id:any)=>typeof id==='string'&&id.length>0&&id.length<=80)&&validBudget(b));
}
export function categoryBudgetStatus(b:CategoryBudget,entries:Entry[],day:string){return budgetStatus(b,entries.filter(e=>b.categories.includes(e.category)),day);}

// Derived from confirmed purchases: a split receipt counts once, not once per category.
export function deficitVisibility(b:Budget,entries:Entry[],day:string){const status=budgetStatus(b,entries,day);if(!status.active||status.missing||status.todayLeft>=0)return {count:0,opacity:1};const groups=new Map<string,{amount:number;created:string}>();for(const e of entries){if(e.kind!=='expense'||e.date!==day||e.date<b.start||e.date>b.end)continue;const v=convert(e.amount,e.currency,b.currency,e.rates);if(v===null)continue;const key=e.group||e.id,old=groups.get(key);groups.set(key,{amount:(old?.amount||0)+Math.round(v*100),created:old&&old.created<e.created?old.created:e.created})}let spent=0,count=0;for(const g of [...groups.values()].sort((a,b)=>a.created.localeCompare(b.created))){spent+=g.amount;if(spent>Math.round(status.allowance*100))count++}return {count,opacity:Math.max(5,100-Math.min(5,count)*19)/100}}

