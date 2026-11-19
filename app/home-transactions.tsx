import type {ReactNode} from 'react';
import {today,shiftDate,type Entry,type Category} from '@/lib/finance';
import {tr} from '@/lib/i18n';
export function HomeTransactions({entries,categories,render}:{entries:Entry[];categories:Category[];render:(rows:Entry[])=>ReactNode}){
const day=today(),yesterday=shiftDate(day,-1),sorted=entries.filter(e=>e.kind==='expense').sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));
return <section className="home-transactions">{[day,yesterday].map((date,i)=><section key={date} className={i?'home-day yesterday':'home-day'}><h2>{tr(i?'Вчера':'Сегодня')}</h2>{sorted.some(e=>e.date===date)?render(sorted.filter(e=>e.date===date)):<div className="empty-day">{tr('Нет трат')}</div>}</section>)}</section>;
}