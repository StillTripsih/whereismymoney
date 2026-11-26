import {useRef,useState} from 'react';
import {Check,ClipboardPaste,Sparkles,Unplug} from 'lucide-react';
import {Screen} from './screen';
import {connectHosted,connectGoogle,recheckGoogle,disconnectHosted,geminiEnabled,geminiConnectionStatus} from '@/lib/gemini';
import {parseAICredential} from '@/lib/ai-credential';
import {tr} from '@/lib/i18n';
export function AISettings({onClose}:{onClose:()=>void}){
 const input=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saved,setSaved]=useState(geminiConnectionStatus),[enabled,setEnabled]=useState(geminiEnabled);
 async function paste(){try{const text=await navigator.clipboard.readText();if(!text.trim())throw Error();if(input.current)input.current.value=text.trim();setError('');setNotice(tr('Ключ вставлен. Нажмите галочку для проверки.'))}catch{input.current?.focus();setError(tr('Браузер не разрешил чтение буфера. Нажмите на поле и выберите «Вставить».'))}}
 async function connect(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{const raw=input.current?.value||'';if(!raw.trim())await recheckGoogle();else{const key=parseAICredential(raw);if(key.kind==='hosted')await connectHosted(key.value);else await connectGoogle(key.value)}setSaved(geminiConnectionStatus());setEnabled(true);setNotice(tr('Готово к работе. Подключение проверено, ключ сохранён на этом устройстве.'));if(input.current)input.current.value=''}catch(e:any){setError(e.name==='TimeoutError'||e.name==='TypeError'?tr('Не удалось связаться с Google. Проверьте интернет и повторите. Сохранённый ключ не удалён.'):tr(e.message))}finally{setBusy(false)}}
 return <Screen title="Gemini" heading={<Sparkles size={28}/>} back={onClose} busy={busy}><form className="ai-compact compact-form" onSubmit={connect}>
 <p className="small">{enabled?tr('Ключ сохранён на этом устройстве'):tr('Подключение не настроено')}</p>
 {saved&&<p className="ai-help">{tr('Последняя успешная проверка')}: {new Date(saved.checkedAt).toLocaleString()}</p>}
 <input ref={input} className="plain-input" type="password" aria-label={tr('Ключ Gemini или код подключения')} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} onInput={()=>{setError('');setNotice('')}}/>
 <button type="button" className="ai-paste" disabled={busy} onClick={paste}><ClipboardPaste/>{tr('Вставить из буфера')}</button>
 <p className="ai-help"><a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio ↗</a> {tr('→ API Keys → Create API key → скопируйте ключ → Вставить из буфера → ✓. Проверка отправляет короткий запрос Google и использует вашу квоту.')}</p>
 <p className="ai-help">{tr('Ключ хранится в браузере отдельно от расходов, не входит в экспорт и сохраняется после обновления приложения. При разборе выбранный чек отправляется Google.')}</p>
 <div className="ai-actions">{enabled&&<button type="button" disabled={busy} aria-label={tr('Отключить Gemini')} onClick={()=>{disconnectHosted();setEnabled(false);setSaved(null);setNotice(tr('Ключ удалён с устройства'));setError('')}}><Unplug/></button>}<button data-direct-action="true" type="submit" className="primary save-circle" aria-label={tr('Проверить и сохранить подключение')} disabled={busy}><Check/></button></div>
 {busy&&<p className="small" role="status">{tr('Проверяю доступ и ответ Gemini…')}</p>}{notice&&<p className="ai-verified" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
 </form></Screen>
}
