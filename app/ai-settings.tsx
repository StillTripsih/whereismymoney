import {useRef,useState} from 'react';
import {Check,ClipboardPaste,Sparkles,Unplug} from 'lucide-react';
import {Screen} from './screen';
import {connectHosted,connectGoogle,recheckGoogle,disconnectHosted,savedGoogleKey,geminiConnectionStatus,geminiEnabled} from '@/lib/gemini';
import {parseAICredential} from '@/lib/ai-credential';
import {tr} from '@/lib/i18n';
export function AISettings({onClose}:{onClose:()=>void}){
 const input=useRef<HTMLInputElement>(null);
 const [draft,setDraft]=useState(savedGoogleKey),[busy,setBusy]=useState(false),[saved,setSaved]=useState(geminiConnectionStatus),[error,setError]=useState(()=>geminiConnectionStatus()?.error||''),[notice,setNotice]=useState(''),[hosted,setHosted]=useState(geminiEnabled);
 async function paste(){setError('');try{const text=await navigator.clipboard.readText();if(!text.trim()){setError(tr('Буфер обмена пуст. Скопируйте ключ в Google AI Studio.'));return}setDraft(text.trim());setNotice(tr('Ключ вставлен в поле'));input.current?.focus()}catch{input.current?.focus();setError(tr('Safari или браузер не разрешил чтение буфера. Подтвердите системную вставку либо вставьте ключ в поле вручную.'))}}
 async function connect(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{if(!draft.trim())await recheckGoogle();else{const key=parseAICredential(draft);if(key.kind==='hosted')await connectHosted(key.value);else await connectGoogle(key.value)}setNotice(tr('Готово к работе. Gemini ответил, ключ сохранён на этом устройстве.'));setHosted(geminiEnabled())}catch(e:any){setError(tr(e.message||'Не удалось завершить проверку Gemini'))}finally{setSaved(geminiConnectionStatus());setBusy(false)}}
 const status=saved?.state==='verified'?tr('Подключение проверено. Ключ сохранён'):saved?.state==='invalid'?tr('Ключ сохранён, но Google не разрешил подключение'):saved?tr('Ключ сохранён. Доступ Gemini пока не подтверждён'):hosted?tr('Личный код подключён'):tr('Подключение не настроено');
 return <Screen title="Gemini" heading={<Sparkles size={28}/>} back={onClose} busy={busy}><form className="ai-compact compact-form" onSubmit={connect}>
 <p className="small" role="status">{status}</p>{saved?.checkedAt&&<p className="ai-help">{tr('Последняя успешная проверка')}: {new Date(saved.checkedAt).toLocaleString()}</p>}
 <input ref={input} value={draft} disabled={busy} onChange={e=>{setDraft(e.target.value);setError('');setNotice('')}} className="plain-input" type="password" aria-label={tr('Ключ Gemini или код подключения')} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
 <button type="button" className="ai-paste" disabled={busy} onClick={paste}><ClipboardPaste/>{tr('Вставить из буфера')}</button>
 <p className="ai-help"><a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio ↗</a> {tr('→ API Keys → Create API key → скопируйте ключ → Вставить из буфера → ✓. Проверка использует вашу квоту.')}</p>
 <p className="ai-help">{tr('Ключ сохраняется при нажатии галочки, даже если Gemini перегружен. После обновления он останется в этом браузере и не войдёт в экспорт расходов. Сохранение ключа и успешное подключение показываются отдельно.')}</p>
 <div className="ai-actions">{(saved||hosted)&&<button type="button" disabled={busy} aria-label={tr('Удалить ключ с устройства')} onClick={()=>{disconnectHosted();setHosted(false);setSaved(null);setDraft('');setNotice(tr('Ключ удалён с устройства'));setError('')}}><Unplug/></button>}<button type="submit" className="primary save-circle" aria-label={tr('Сохранить ключ и проверить Gemini')} disabled={busy}><Check/></button></div>
 {busy&&<p className="small" role="status">{tr('Сохраняю ключ и проверяю ответ Gemini…')}</p>}{notice&&<p className="ai-verified" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
 </form></Screen>
}
