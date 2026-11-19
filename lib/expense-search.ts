import {convert,type Entry,type State,type Currency} from './finance';
import {categoryLabel} from './i18n';
export function searchExpenses(entries:Entry[],data:State,query:string,currency:Currency,min='',max='',time=''){
const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),low=min===''?null:Number(min),high=max===''?null:Number(max);
return entries.filter(e=>{const amount=convert(e.amount,e.currency,currency,data.rates);if(low!==null&&(amount===null||amount<low))return false;if(high!==null&&(amount===null||amount>high))return false;const clock=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}).format(new Date(e.created));if(time&&clock.slice(0,2)!==time.slice(0,2))return false;const hay=[e.note,categoryLabel(data.categories.find(c=>c.id===e.category)),String(e.amount),amount?.toFixed(2),e.date,e.date.split('-').reverse().join('.'),clock].join(' ').toLocaleLowerCase();return words.every(w=>hay.includes(w))});
}