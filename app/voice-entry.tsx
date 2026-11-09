import {spokenCurrency} from '@/lib/spoken-currency';
import {visibleCurrencies} from '@/lib/currency-settings';
import {speechLocale} from '@/lib/i18n';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {quickCategories} from '@/lib/category-priority';
import {inferVoiceCategory} from '@/lib/voice-category';
import { useEffect, useRef, useState } from 'react';
import { Mic, X,RefreshCw,Check } from 'lucide-react';
import {CategoryTiles} from './category-tiles';
import {
  currencies,
  money,
  parseSingleVoice,
  today,
  type Currency,
  type Entry,
  type State,
} from '@/lib/finance';

export function VoiceEntry({
  active,
  data,
  category,
  onSave,
  onClose,
}: {
  active: boolean;
  data: State;
  category: string;
  onSave: (e: Entry[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected,setSelected]=useState(category||'cat-unknown');
 const quickIds=quickCategories(data);const activeCategories=data.categories.filter(c=>!c.archived);
 const [text, setText] = useState(''),
    [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const manualEdit=useRef(false);
  const rec = useRef<any>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    alive = useRef(true);
  function stop() {
    try{rec.current?.stop()}catch{}
    setRecording(false);
    if (timer.current) clearTimeout(timer.current);
  }
  useEffect(() => {
    if (!active) stop();
  }, [active]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      rec.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  let parsed: ReturnType<typeof parseSingleVoice> | null = null,
    problem = '';
  try {
    if (text.trim()) parsed = parseSingleVoice(text, data.categories);
  } catch (e: any) {
    problem = tr(e.message);
  }
  const voiceCurrency=spokenCurrency(text)||data.display;
  useEffect(()=>{const inferred=inferVoiceCategory(text,data.categories);if(inferred)setSelected(inferred)},[text,data.categories]);
  function start() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError(
        tr("В этом браузере нет распознавания речи. Используйте ручной ввод."),
      );
      return;
    }
    if(timer.current)clearTimeout(timer.current);try{rec.current?.abort()}catch{}
    setError('');
    manualEdit.current=false;setText('');
    const r = new SR();
    rec.current = r;
    r.lang = speechLocale();
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      if (!alive.current||rec.current!==r||manualEdit.current) return;
      let t = '';
      for (let i = 0; i < e.results.length; i++)
        t += e.results[i][0].transcript + ' ';
      setText(t.trim());
    };
    r.onend = () => {
      if(rec.current!==r)return;
      if (alive.current&&rec.current===r) setRecording(false);
      if (timer.current) clearTimeout(timer.current);
    };
    r.onerror = (e: any) => {
      if (alive.current && rec.current===r && e.error !== 'aborted')
        setError(
          e.error === 'not-allowed'
            ? tr("Разрешите доступ к микрофону.")
            : tr("Не удалось расслышать. Повторите запись или исправьте транскрипцию."),
        );
    };
    try {
      r.start();
      setRecording(true);
      timer.current = setTimeout(stop, 120000);
    } catch {
      setError(tr("Не удалось начать запись"));
    }
  }
  async function save() {
    if (!parsed || recording || busy) return;
    setBusy(true);
    setError('');
    try {
      if(voiceCurrency==='THB'&&Math.round(parsed.amount!)<1)throw Error(tr("Минимум 1 бат"));
      await onSave([
        {
          id: crypto.randomUUID(),
          group: crypto.randomUUID(),
          amount: voiceCurrency==='THB'?Math.round(parsed.amount!):parsed.amount!,
          currency: voiceCurrency,
          category:selected,
          kind: 'expense',
          date: parsed.date || today(),
          note: '',
          rates: { ...data.rates },
          created: new Date().toISOString(),
        },
      ]);
      onClose();
    } catch (e: any) {
      setError(tr(e.message));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  if (!active) return null;
  return (
    <div className="voice-minimal">
      <button
        data-direct-action="true"
        className={'voice-circle' + (recording ? ' recording' : '')}
        onClick={recording ? stop : start}
        disabled={busy}
        aria-label={recording ? tr("Остановить запись") : tr("Начать запись")}
      >
        <Mic size={96} strokeWidth={1.4} />
      </button>
      {recording&&<div className="recording-actions"><button data-direct-action="true" className="recording-wave" aria-label={tr("Запись идёт. Остановить")} onClick={stop}>{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:i*.11+'s'}}/>)}</button><button data-direct-action="true" className="recording-stop" aria-label={tr("Остановить запись")} onClick={stop}><X size={28}/></button></div>}
      {!recording&&text&&<button data-direct-action="true" className="voice-redo" aria-label={tr("Перезаписать")} onClick={start}><RefreshCw size={24}/></button>}
      <textarea className="voice-transcript" aria-label={tr("Распознанный текст")} value={text} onChange={e=>{manualEdit.current=true;rec.current?.abort();rec.current=null;setRecording(false);if(timer.current)clearTimeout(timer.current);setText(e.target.value)}} disabled={busy} placeholder={recording?'…':''}/>
      {parsed && (
        <div className="voice-total">
          {money(parsed.amount, voiceCurrency)}
        </div>
      )}
      {(error || problem) && (
        <p className="error" role="alert">
          {error || problem}
        </p>
      )}
      <button
        aria-label={tr("Сохранить расход")} className="primary save-circle"
        disabled={!parsed || recording || busy}
        onClick={save}
      >
        <Check/>
      </button>
      <CategoryTiles categories={activeCategories.filter(c=>quickIds.includes(c.id))} selected={[selected]} onSelect={setSelected} label={tr("Быстрые категории")}/><details className="other-categories-disclosure"><summary>{tr("Остальные категории")}</summary><CategoryTiles categories={activeCategories.filter(c=>!quickIds.includes(c.id))} selected={[selected]} onSelect={setSelected} label={tr("Остальные категории")}/></details>
    </div>
  );
}

