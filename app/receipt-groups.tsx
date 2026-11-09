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
<div className="row spaced"><span>{item.name}</span><input className="item-amount" aria-label={tr("Сумма: ")+item.name} type="number" min="0.01" step="0.01" inputMode="decimal" value={item.amount || ''} onChange={e=>onChange({...value,items:value.items.map(i=>i.id===item.id?{...i,amount:Number(e.target.value)}:i)})}/></div>
<Picker value={item.category} label={tr("Перенести: ")+item.name} options={categoryOptions(categories.filter(c=>!c.archived))} onChange={category=>onChange({...value,items:value.items.map(i=>i.id===item.id?{...i,category,review:false}:i)})}/>
{item.review && <small className="review-flag">{tr("Проверьте категорию")}</small>}
</div>)}</section>)}
<div className="receipt-summary row spaced"><b>{tr("Всего")}</b><b>{money(sum,currency)}</b></div>
<label className="field">{tr("Итог с чека")}<input type="number" min="0.01" step="0.01" inputMode="decimal" value={value.total ?? ''} onChange={e=>onChange({...value,total:e.target.value?Number(e.target.value):null})}/></label>
{(value.total===null || Math.abs(sum-value.total)>0.009) && <p className="error">{value.total===null?tr("Укажите итог с чека для сохранения."):tr("Разница с чеком: ")+money(value.total-sum,currency)+tr(". Проверьте суммы товаров.")}</p>}
{value.warnings.map((w,i)=><p className="review-flag" key={i}>{w}</p>)}
</div>;
}
