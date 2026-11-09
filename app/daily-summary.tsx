import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {useState,useRef,useEffect} from 'react';
import {SlidersHorizontal,Layers,Sun,Wallet,CalendarDays} from 'lucide-react';
import {budgetStatus,type Budget} from '@/lib/budget';
import {money,symbols,type Entry} from '@/lib/finance';
import {labels as t} from '@/lib/paired-labels';
export function DailySummary({budget,entries,day,onEdit}:{budget?:Budget;entries:Entry[];day:string;onEdit:()=>void}){
 const [hint,setHint]=useState<string|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const show=(text:string)=>{if(timer.current)clearTimeout(timer.current);setHint(text);timer.current=setTimeout(()=>setHint(null),3000)};
 if(!budget)return <section className="daily-summary budget-start"><Wallet size={24}/><h2>{t.dailyTitle}</h2><p>{t.dailyIntro}</p><button className="primary" onClick={onEdit}>{t.setBudget}</button></section>;
 const s=budgetStatus(budget,entries,day),fmt=(n:number)=>s.missing?'—':money(n,budget.currency);
 const used=s.allowance>0?Math.min(100,Math.max(0,s.spent/s.allowance*100)):s.spent>0?100:0;
 const remaining=100-used;
 const amount=s.active?s.todayLeft:s.totalLeft;
 const metricHelp=[tr("Потрачено за сегодня: {0}", [fmt(s.spent)]),tr("Остаток бюджета на весь срок: {0}", [fmt(s.totalLeft)]),s.futureDays?tr("После сегодняшних трат на следующие {0} дней: {1} в день", [s.futureDays, fmt(s.future)]):tr("Это последний день выбранного бюджета")];
 return <section className="daily-summary" aria-label={t.dailyTitle}>
 <div className="budget-caption"><span className="sr-only">{s.active?t.todayLeft:day<budget.start?t.notStarted:t.ended}</span><button title={t.editBudget} aria-label={t.editBudget} onClick={onEdit}><SlidersHorizontal size={19}/></button></div>
 {s.active&&!s.missing&&s.todayLeft<0&&<p className="budget-encouragement">{tr("Сегодня в минусе, но завтра можно сэкономить и быть опять в плюсе.")}</p>}
 <div className={'budget-number '+(s.active&&!s.missing&&s.todayLeft<0?'over-budget deficit-pulse':'')} aria-label={fmt(amount)}><span>{s.missing?'—':new Intl.NumberFormat(localeCode(),{maximumFractionDigits:budget.currency==='THB'?0:2}).format(amount)}</span><small>{symbols[budget.currency]}</small></div>
 {s.active&&!s.missing&&<div className="daily-progress" role="progressbar" aria-label={tr("Осталось дневного бюджета")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(remaining)} aria-valuetext={fmt(s.todayLeft)+' / '+fmt(s.allowance)}><i style={{width:remaining+'%'}}/><span className="spent-word" style={{width:used+'%'}} aria-hidden="true">{['S','P','E','N','D',''].map((letter,i)=><span key={i}>{letter}</span>)}</span></div>}
 <div className="daily-metrics">{[{icon:Sun,label:t.spentToday,value:s.spent},{icon:Wallet,label:t.totalLeft,value:s.totalLeft},{icon:CalendarDays,label:tr("После сегодняшних трат"),value:s.future}].map((m,i)=><button key={i} data-direct-action="true" type="button" aria-label={metricHelp[i]} onClick={()=>show(metricHelp[i])}><m.icon/><span className="sr-only">{m.label}</span><b>{fmt(m.value)}</b></button>)}</div>{hint&&<div className="metric-hint" role="status" onClick={()=>setHint(null)}>{hint}</div>}
 {s.missing>0&&<p className="error">{t.missingRates}</p>}
{s.totalLeft<0&&<p className="budget-warning">{tr("Бюджет в минусе:")}{fmt(-s.totalLeft)}</p>}
 </section>;
}

