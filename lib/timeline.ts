import {today, type Entry} from './finance';
export function entryTime(entry: Entry): string | null {
  const date = new Date(entry.created);
  const day = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  if(day!==entry.date) return null;
  return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
}
