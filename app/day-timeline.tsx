import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {useState} from 'react';
import {convert,money,today,type Entry,type Currency} from '@/lib/finance';
import {entryTime} from '@/lib/timeline';
export function DayTimeline({entries,currency,onSelect}:{entries:Entry[];currency:Currency;onSelect:(entry:Entry)=>void}) {
  const [day,setDay]=useState(today());
  const rows=entries.filter(e=>e.kind==='expense' && e.date===day).sort((a,b)=>a.created.localeCompare(b.created));
  const points=rows.map(e=>({e,time:entryTime(e),amount:convert(e.amount,e.currency,currency,e.rates)}));
  const max=Math.max(1,...points.map(p=>p.amount??0));
  return <section className="day-timeline" aria-label={tr("Расходы за сутки")}>
    <div className="row spaced"><b>{tr("За сутки")}</b><input type="date" aria-label={tr("День на шкале")} max={today()} value={day} onChange={e=>e.target.value && setDay(e.target.value)}/></div>
    <div className="hour-plot">{points.filter(p=>p.time && p.amount!==null).map(p=><button className="hour-marker" key={p.e.id} aria-label={p.time+' — '+money(p.amount,currency)} style={{left:((Number(p.time!.slice(0,2))*60+Number(p.time!.slice(3)))/1440*100)+'%'}} onClick={()=>onSelect(p.e)}><i style={{height:Math.max(4,(p.amount!/max)*90)+'%'}}/></button>)}</div>
    <div className="hour-axis">{['00:00','06:00','12:00','18:00','24:00'].map(t=><span key={t}>{t}</span>)}</div>
    <div className="timeline-events">{points.map(p=><button key={p.e.id} onClick={()=>onSelect(p.e)}>{p.time??tr("Время неизвестно")} · {p.amount===null?money(p.e.amount,p.e.currency):money(p.amount,currency)}</button>)}</div>
    {!rows.length && <p className="muted">{tr("За этот день расходов нет")}</p>}
    {!!rows.length && <p className="muted small">{tr("Время добавления · Таиланд")}</p>}
  </section>;
}
