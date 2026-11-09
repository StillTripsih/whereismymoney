import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {updateApplication} from '@/lib/app-update';
export function UpdateButton({disabled=false}:{disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 return <section className="update-section"><button className="menu-item" disabled={disabled||busy} onClick={async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await updateApplication()}catch{setError(tr("Не удалось обновить приложение. Проверьте интернет и повторите. Данные не удалены."));setBusy(false);lock.current=false}}}><RefreshCw size={21}/><span>{busy?tr("Сохраняю копию и обновляю…"):tr("Обновить приложение")}</span></button>
 <p className="muted small">{tr("Обновляйте без удаления приложения. Перед обновлением создаётся локальная копия. Удаление приложения может удалить и записи, и эту копию — периодически экспортируйте данные в файл.")}</p>
 {error&&<p className="error" role="alert">{tr(error)}</p>}</section>;
}
