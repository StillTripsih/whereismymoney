import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {fetchCurrentRates} from '@/lib/rate-providers';
import {Picker} from './ui';
'use client';
import { useState } from 'react';
import { Screen, useScreenHistory } from './screen';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  calculate,
  currencies,
  today,
  validDate,
  type State,
  type Rates,
} from '@/lib/finance';
export function SettingsForm({
  mode,
  data,
  onSave,
  onClose,
  install,
}: {
  mode: string;
  data: State;
  onSave: (next: State) => Promise<void>;
  onClose: () => void;
  install: any;
}) {
  const { page, back, forward } = useScreenHistory(mode, onClose);
  const [provider,setProvider]=useState(data.rateProvider||'exchange');
  const [usd, setUsd] = useState(data.rates.USD?.toString() || ''),
    [uah, setUah] = useState(data.rates.UAH?.toString() || ''),
    [date, setDate] = useState(
      mode === 'rates' ? data.rates.date : data.savingsDate || today(),
    ),
    [balances, setBalances] = useState<Record<string,string>>({
      THB: data.savings.THB?.toString() || '',
      USD: data.savings.USD?.toString() || '',
      UAH: data.savings.UAH?.toString() || '',
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save(rates?: Rates) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!validDate(date) || date > today()) throw Error(tr("Проверьте дату"));
      if (mode === 'rates') {
        const r = rates || {
          THB: 1,
          USD: usd.trim() ? calculate(usd) : null,
          UAH: uah.trim() ? calculate(uah) : null,
          date,
          source: tr("Введён вручную"),
        };
        if ([r.USD, r.UAH].some((v) => v !== null && v <= 0))
          throw Error(tr("Курс должен быть больше нуля"));
        await onSave({ ...data, rates: r,rateProvider:provider });
      } else {
        const savings = Object.fromEntries(
          currencies.map((c) => [
            c,
            balances[c].trim() ? calculate(balances[c]) : null,
          ]),
        ) as State['savings'];
        if (currencies.some((c) => savings[c] !== null && savings[c]! < 0))
          throw Error(tr("Остатки не могут быть отрицательными"));
        await onSave({ ...data, savings:{...data.savings,...savings}, savingsDate: date });
      }
      onClose();
    } catch (e: any) {
      setError(tr(e.message));
    } finally {
      setBusy(false);
    }
  }
  async function fetchRates() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const rates=provider==='manual'?data.rates:await fetchCurrentRates(provider);
      await onSave({...data,rates,rateProvider:provider});
      onClose();
    } catch {
      setError(tr("Не удалось получить курс. Введите его вручную."));
    } finally {
      setBusy(false);
    }
  }
  if (!page) return null;
  return (
    <Screen
      forward={forward}
      title={
        mode === 'rates'
          ? tr("Курсы")
          : mode === 'balances'
            ? tr("Сбережения")
            : tr("Установка")
      }
      back={back}
      busy={busy}
      action={
        mode !== 'install' && (
          <button
            className="primary save-top"
            disabled={busy}
            onClick={() => save()}
          >
            {busy ? '…' : tr("Сохранить")}
          </button>
        )
      }
    >
      {error && (
        <p className="error" role="alert">
          {tr(error)}
        </p>
      )}
      {mode === 'rates' && (
        <><Picker value={provider} onChange={v=>setProvider(v as typeof provider)} options={[["exchange","ExchangeRate-API"],["currency-api","Currency API"],["manual",tr("Вручную")]]} label={tr("Источник курса")}/>
          <label className="field">
            1 USD = … THB
            <input
              inputMode="decimal"
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
            />
          </label>
          <label className="field">
            1 UAH = … THB
            <input
              inputMode="decimal"
              value={uah}
              onChange={(e) => setUah(e.target.value)}
            />
          </label>
          <p className="muted small">
            {tr("Сейчас:")}{data.rates.source}, {data.rates.date}{tr(". Новый курс применяется к новым операциям и сбережениям. Старые расходы не меняются.")}</p>
        </>
      )}
      {mode === 'balances' &&
        currencies.map((c) => (
          <label className="field" key={c}>
            {c}
            <input
              inputMode="decimal"
              value={balances[c]}
              onChange={(e) =>
                setBalances({ ...balances, [c]: e.target.value })
              }
              placeholder={tr("Не указано")}
            />
          </label>
        ))}
      {mode !== 'install' && (
        <>
          <label className="field">
            {tr("Дата")}<input
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </>
      )}
      {mode === 'rates' && (
        <>
          <button
            className="primary save-circle icon-refresh" aria-label={tr("Обновить курс")}
            disabled={busy||provider==='manual'}
            onClick={fetchRates}
          >
            {busy ? tr("Подождите…") : tr("Получить справочный курс из интернета")}
          </button>
          <a
            className="muted small"
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noreferrer"
          >
            {tr("Курсы: ExchangeRate-API")}</a>
        </>
      )}
      {mode === 'install' && (
        <>
          <p>
            <b>iPhone:</b> {tr("Safari → «Поделиться» → «На экран Домой».")}</p>
          <p>
            <b>Android:</b> {tr("Chrome → меню ⋮ → «Добавить на главный экран» или «Установить приложение».")}</p>
          {install && (
            <button className="primary full" onClick={() => install.prompt()}>
              {tr("Установить приложение")}</button>
          )}
          <p className="muted">
            {tr("Откройте опубликованную ссылку в обычном браузере. Перед переносом между браузерами экспортируйте резервную копию.")}</p>
        </>
      )}
    </Screen>
  );
}
