import {BudgetAmount} from './budget-amount';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import { Picker, categoryOptions, CatIcon } from './ui';
import { money, type Currency, type Category } from '@/lib/finance';
import { type Receipt } from '@/lib/receipt';
export function ReceiptEditor({value,onChange,categories,currency}: {
value:Receipt;onChange:(r:Receipt)=>void;categories:Category[];currency:Currency;
}) {
const sum=value.items.reduce((s,i)=>s+Math.round(i.amount*100),0)/100;
return <div className="receipt-groups">{categories.filter(c=>value.items.some(i=>i.category===c.id)).map(c=><section className="receipt-item" key={c.id}>
<div className="row spaced"><span className="category-option"><CatIcon category={c}/><b>{categoryLabel(c)}</b></span><b>{money(value.items.filter(i=>i.category===c.id).reduce((s,i)=>s+Math.round(i.amount*100),0)/100,currency)}</b></div>
{value.items.filter(i=>i.category===c.id).map(item=><div className="receipt-product" key={item.id}>
<div className="row spaced"><span>{item.name}</span><BudgetAmount compact fractional allowNegative={false} value={String(item.amount||0)} currency={currency} label={tr("Сумма: ")+item.name} onChange={amount=>onChange({...value,items:value.items.map(i=>i.id===item.id?{...i,amount:Number(amount)}:i)})}/></div>
<Picker value={item.category} label={tr("Перенести: ")+item.name} options={categoryOptions(categories.filter(c=>!c.archived))} onChange={category=>onChange({...value,items:value.items.map(i=>i.id===item.id?{...i,category,review:false}:i)})}/>
{item.review && <small className="review-flag">{tr("Проверьте категорию")}</small>}
</div>)}</section>)}
<div className="receipt-summary row spaced"><b>{tr("Всего")}</b><b>{money(sum,currency)}</b></div>
<label className="field">{tr("Итог с чека")}<BudgetAmount compact fractional allowNegative={false} value={String(value.total??0)} currency={currency} label={tr("Итог с чека")} onChange={total=>onChange({...value,total:Number(total)})}/></label>
{(value.total===null || Math.abs(sum-value.total)>0.009) && <p className="error">{value.total===null?tr("Укажите итог с чека для сохранения."):tr("Разница с чеком: ")+money(value.total-sum,currency)+tr(". Проверьте суммы товаров.")}</p>}
{value.warnings.map((w,i)=><p className="review-flag" key={i}>{w}</p>)}
</div>;
}
