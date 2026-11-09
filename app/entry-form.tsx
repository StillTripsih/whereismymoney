import {visibleCurrencies} from '@/lib/currency-settings';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {WheelDate} from './wheel-date';
'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Mic,
  Keyboard,
  Trash2,
  Check,
  StopCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Picker, categoryOptions } from './ui';
import { Screen, useScreenHistory } from './screen';
import { ReceiptEditor } from './receipt-groups';
import { VoiceEntry } from './voice-entry';
import { AISettings } from './ai-settings';
import { groupReceipt, type Receipt } from '@/lib/receipt';
import { analyzeGemini, geminiEnabled } from '@/lib/gemini';
import {
  calculate,
  currencies,
  money,
  parseVoice,
  receiptCandidates,
  splitAmounts,
  symbols,
  today,
  validDate,
  type Currency,
  type Entry,
  type State,
} from '@/lib/finance';
export type Draft = {
  token?: string;
  file?: File;
  category?: string;
  entry?: Entry;
  method?: string;
  amount?: number;
  currency?: Currency;
  note?: string;
};
export function EntryForm({
  data,
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  data: State;
  draft: Draft;
  onClose: () => void;
  onSave: (entries: Entry[], oldId?: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const old = draft.entry;
  const {
    page: mode,
    go: setMode,
    back,
    forward,
  } = useScreenHistory(draft.method || 'form', onClose);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [receipt, setReceipt] = useState<Receipt>({
    items: [],
    total: null,
    adjustment: 0,
    warnings: [],
  });
  const [expr, setExpr] = useState(String(old?.amount ?? draft.amount ?? '')),
    [currency, setCurrency] = useState<Currency>(
      old?.currency || draft.currency || data.display,
    ),
    [category, setCategory] = useState(
      old?.category ||
        draft.category ||
        'cat-unknown',
    ),
    [date, setDate] = useState(old?.date || today()),
    [note, setNote] = useState(old?.note || draft.note || ''),
    [kind, setKind] = useState<'expense' | 'income'>(old?.kind || 'expense'),
    [parts, setParts] = useState<{ expr: string; category: string }[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [fillRates, setFillRates] = useState(false);
  const [files, setFiles] = useState<File[]>([]),
    [photo, setPhoto] = useState(''),
    [progress, setProgress] = useState(''),
    [connect, setConnect] = useState(false);
  const camera = useRef<HTMLInputElement>(null),
    upload = useRef<HTMLInputElement>(null),
    job = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      job.current++;
    };
  }, []);
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo);
    },
    [photo],
  );
  let result: number | null = null;
  try {
    result = calculate(expr);
  } catch {}
  let remainder = result;
  try {
    if (parts.length && result !== null)
      remainder = splitAmounts(
        result,
        parts.map((p) => calculate(p.expr)),
      );
  } catch {
    remainder = null;
  }
  const options = categoryOptions(
    data.categories.filter((c) => !c.archived || c.id === category),
  );
  function switchMode(m: string) {
    setError('');
    setMode(m);
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (result === null || result <= 0)
        throw Error(tr("Введите сумму больше нуля"));
      if (!validDate(date) || date > today())
        throw Error(tr("Проверьте дату: будущие расходы пока не записываются"));
      if (!data.categories.some((c) => c.id === category) || note.length > 5000)
        throw Error(tr("Проверьте категорию и описание"));
      const extra = parts.map((p) => ({
        amount: calculate(p.expr),
        category: p.category,
      }));
      const base = parts.length
        ? splitAmounts(
            result,
            extra.map((p) => p.amount),
          )
        : result;
      const rows = [{ amount: base, category }, ...extra];
      if (rows.some((r) => !data.categories.some((c) => c.id === r.category)))
        throw Error(tr("Выберите категорию каждой части"));
      const group = old?.group || crypto.randomUUID();
      let rates = old?.rates || data.rates;
      if (fillRates)
        rates = {
          ...rates,
          USD: rates.USD ?? data.rates.USD,
          UAH: rates.UAH ?? data.rates.UAH,
          source: rates.source + tr("; дополнено ") + data.rates.date,
        };
      const entries: Entry[] = rows.map((r, i) => ({
        ...r,
        id: i === 0 && old ? old.id : crypto.randomUUID(),
        group,
        currency,
        kind,
        date,
        note: note.trim(),
        rates: { ...rates },
        created: old?.created || new Date().toISOString(),
      }));
      await onSave(entries, old?.id);
      onClose();
    } catch (e: any) {
      setError(tr(e.message));
    } finally {
      setBusy(false);
    }
  }
  function choosePhoto(f?: File) {
    if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 20 * 1024 * 1024) {
      setError(tr("Выберите изображение до 20 МБ"));
      return;
    }
    setFiles((prev) => (mode === 'photo' ? [...prev, f].slice(-6) : [f]));
    setPhoto(URL.createObjectURL(f));
    switchMode('photo');
  }
  const photoLoaded=useRef(false);useEffect(()=>{if(draft.file&&!photoLoaded.current){photoLoaded.current=true;choosePhoto(draft.file)}},[]);
  async function ocr() {
    if (!files.length || progress) return;
    if (!geminiEnabled()) {
      setError('');
      return;
    }
    const id = ++job.current;
    setProgress(tr("Gemini: перевод и распределение…"));
    setError('');
    try {
      const parsed = await analyzeGemini({ images: files }, data.categories);
      if (id !== job.current || !alive.current) return;
      setReceipt(parsed.receipt);
      setCurrency(parsed.currency);
      setDate(parsed.date);
    } catch (e: any) {
      if (id === job.current && alive.current) setError(tr(e.message));
    } finally {
      if (id === job.current && alive.current) setProgress('');
    }
  }
  useEffect(() => {
    if (files.length) void ocr();
  }, [files]);
  useEffect(() => {
    if (mode !== 'photo') {
      job.current++;
      setProgress('');
    }
  }, [mode]);
  async function saveReceipt() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const sum = receipt.items.reduce(
        (n, i) => n + Math.round(i.amount * 100),
        0,
      );
      if (
        !receipt.items.length ||
        receipt.items.some(
          (i) =>
            !i.name.trim() ||
            !Number.isFinite(i.amount) ||
            i.amount <= 0 ||
            i.name.length > 5000,
        )
      )
        throw Error(tr("Проверьте названия и суммы позиций"));
      if (
        receipt.total === null ||
        Math.abs(sum - Math.round(receipt.total * 100)) > 0
      )
        throw Error(tr("Сумма позиций должна совпадать с итогом чека"));
      if (!validDate(date) || date > today()) throw Error(tr("Проверьте дату чека"));
      const group = crypto.randomUUID();
      await onSave(
        groupReceipt(receipt, data.categories).items.map((i) => ({
          id: crypto.randomUUID(),
          group,
          amount: i.amount,
          currency,
          kind: 'expense',
          category: i.category,
          date,
          note: receipt.items.filter((p) => p.category === i.category).map((p) => p.name + ' — ' + money(p.amount, currency)).join('\n'),
          rates: { ...data.rates },
          created: new Date().toISOString(),
        })),
      );
      onClose();
    } catch (e: any) {
      setError(tr(e.message));
    } finally {
      setBusy(false);
    }
  }
  if (!mode) return null;
  return (
    <Screen
      forward={forward}
      hideBack={mode === 'form' || mode === 'voice'}
      heading={
        old?<button className="primary save-circle delete-top" aria-label={tr("Удалить операцию")} disabled={busy} onClick={()=>onDelete(old.id)}><Trash2/></button>:mode === 'form' ? (
          <Picker
            value={category}
            onChange={setCategory}
            options={options}
            label={tr("Категория")}
          />
        ) : undefined
      }
      title={
        mode === 'photo' || mode === 'review'
          ? tr("Чек")
          : mode === 'voice'
            ? tr("Голос")
            : mode === 'choice'
              ? tr("Добавить")
              : categoryLabel(data.categories.find((c) => c.id === category)) ||
                tr("Операция")
      }
      back={() => {
        if (!busy) back();
      }}
      busy={busy}
      action={
        mode !== 'choice' &&
        mode !== 'voice' && mode !== 'form' && (
          <button
            aria-label={tr("Сохранить")} className="primary save-top"
            disabled={
              busy || !!progress || (mode === 'photo' && !receipt.items.length)
            }
            onClick={mode === 'photo' ? saveReceipt : save}
          >
            <Check/>
          </button>
        )
      }
    >
      {old&&mode==='form'&&<Picker value={category} onChange={setCategory} options={options} label={tr("Категория")}/>}
      {error && (
        <div className="error" role="alert">
          {tr(error)}
        </div>
      )}
      <input
        ref={camera}
        type="file"
        hidden
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          choosePhoto(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={upload}
        type="file"
        hidden
        accept="image/*"
        onChange={(e) => {
          choosePhoto(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {mode === 'choice' && (
        <div className="options">
          <button data-direct-action="true" onClick={() => camera.current?.click()}>
            <Camera />
            {tr("Камера")}</button>
          <button onClick={() => upload.current?.click()}>
            <Upload />
            {tr("Фото чека")}</button>
          <button onClick={() => switchMode('voice')}>
            <Mic />
            {tr("Голос")}</button>
          <button onClick={() => switchMode('form')}>
            <Keyboard />
            {tr("Вручную")}</button>
        </div>
      )}
      {mode === 'form' && (
        <>
          <Tabs
            value={kind}
            onValueChange={(v) => setKind(v as 'expense' | 'income')}
          >
            <TabsList>
              <TabsTrigger value="expense">{tr("Расход")}</TabsTrigger>
              <TabsTrigger value="income">{tr("Доход")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="row spaced">
            <span className="muted">{tr("Сумма")}</span>
            <Picker
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              label={tr("Валюта операции")}
              options={visibleCurrencies(data).map((c) => [c, c + ' ' + symbols[c]])}
            />
          </div>
          <div className="expense-control-row editor-expense-row"><button data-direct-action="true" aria-label={tr("Чек")} onClick={()=>camera.current?.click()}><Camera/></button><button aria-label={tr("Голос")} onClick={()=>switchMode('voice')}><Mic/></button><output className="expense-display" aria-label={tr("Сумма или выражение")}>{expr||'0'}</output><button className="primary save-circle" aria-label={tr("Сохранить операцию")} disabled={busy||result===null||result<=0} onClick={save}><Check/></button></div>
          <div className="calc-result">
            {result !== null
              ? '= ' + money(result, currency)
              : tr("Например: 850 − 200")}
          </div>
          <div className="calculator">
            {[
              '7',
              '8',
              '9',
              '÷',
              '4',
              '5',
              '6',
              '×',
              '1',
              '2',
              '3',
              '−',
              '.',
              '0',
              '⌫',
              '+',
              'C',
              '=',
            ].map((k) => (
              <button
                key={k}
                className={['÷', '×', '−', '+'].includes(k) ? 'operator' : ''}
                onClick={() =>
                  setExpr(k==='C'?'':k==='='?(result===null?expr:String(result)):k === '⌫' ? expr.slice(0, -1) : expr + k)
                }
              >
                {k}
              </button>
            ))}
          </div>
          <button className="text-button editor-upload" aria-label={tr("Загрузить фото чека")} onClick={()=>upload.current?.click()}><Upload size={20}/></button>
          <label className="field">
            {tr("Дата")}<WheelDate value={date} onChange={setDate} label={tr("Дата операции")}/>
          </label>
          {!old && (
            <>
              <button
                className="text-button"
                onClick={() => setParts([...parts, { expr: '', category }])}
              >
                {tr("+ Выделить часть в другую категорию")}</button>
              {parts.map((p, i) => (
                <div className="split-item" key={i}>
                  <div className="row spaced">
                    <span className="muted">{tr("Часть")}{i + 1}</span>
                    <button
                      className="icon-btn"
                      aria-label={tr("Удалить часть ") + (i + 1)}
                      onClick={() => setParts(parts.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="input-pair">
                    <label className="field">
                      {tr("Сумма")}<input
                        inputMode="decimal"
                        value={p.expr}
                        onChange={(e) =>
                          setParts(
                            parts.map((x, j) =>
                              j === i ? { ...x, expr: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      {tr("Категория")}<Picker
                        value={p.category}
                        onChange={(category) =>
                          setParts(
                            parts.map((x, j) =>
                              j === i ? { ...x, category } : x,
                            ),
                          )
                        }
                        label={tr("Категория части ") + (i + 1)}
                        options={options}
                      />
                    </label>
                  </div>
                </div>
              ))}
              {parts.length > 0 && (
                <p className={remainder === null ? 'error' : 'notice'}>
                  {tr("Остаток:")}{money(remainder, currency)}{tr(". Итог чека:")}{' '}
                  {money(result, currency)}{tr(". Все части сохранятся одним действием.")}</p>
              )}
            </>
          )}
          {old && (
            <>
              <p className="muted small">
                {tr("Если это часть чека, изменяется только выбранная запись.")}</p>
              {(!old.rates.USD || !old.rates.UAH) && (
                <button
                  className="secondary"
                  onClick={() => setFillRates(!fillRates)}
                >
                  {fillRates
                    ? tr("✓ При сохранении дополнить курс")
                    : tr("Дополнить недостающий курс из настроек")}
                </button>
              )}
            </>
          )}
          {!old && (!data.rates.USD || !data.rates.UAH) && (
            <p className="muted small">
              {tr("Не все курсы заданы. Исходная сумма сохранится. Пересчёт можно дополнить позже.")}</p>
          )}

        </>
      )}
      {mode === 'photo' && (
        <>
          <p className="ai-status">
            {geminiEnabled() ? tr("Gemini подключён") : tr("ИИ не подключён")}
          </p>
          {!geminiEnabled() && (
            <button className="primary full" onClick={() => setConnect(true)}>
              {tr("Подключить разбор чека")}</button>
          )}
          <img className="receipt-thumb" src={photo} alt={tr("Чек")} />
          <div className="row spaced">
            <Picker
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              label={tr("Валюта чека")}
              options={visibleCurrencies(data).map((c) => [c, c])}
            />
            <button
              className="text-button"
              disabled={!!progress || files.length >= 6}
              onClick={() => upload.current?.click()}
            >
              {tr("+ Фото (")}{files.length}/6)
            </button>
          </div>
          {progress && <p role="status">{progress}</p>}
          {receipt.items.length > 0 && <label className="field">{tr("Дата чека")}<input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/></label>}
          {receipt.items.length > 0 && (
            <ReceiptEditor
              value={receipt}
              onChange={setReceipt}
              categories={data.categories}
              currency={currency}
            />
          )}
          {geminiEnabled() && (
            <button className="text-button" disabled={!!progress} onClick={ocr}>
              {tr("Прочитать заново")}</button>
          )}
        </>
      )}
      <VoiceEntry
        active={mode === 'voice'}
        data={data}
        category={category}
        onSave={onSave}
        onClose={onClose}
      />
      {connect && (
        <AISettings
          onClose={() => {
            setConnect(false);
            if (geminiEnabled()) void ocr();
          }}
        />
      )}
    </Screen>
  );
}

