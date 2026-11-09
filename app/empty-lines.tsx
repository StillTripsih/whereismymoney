import {tr} from '@/lib/i18n';export function EmptyLines(){return <div className="empty-lines" role="status" aria-label={tr('Нет записей')}>{[0,1,2,3,4].map(n=><i key={n}/>)}</div>}
