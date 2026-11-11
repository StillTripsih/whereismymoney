import {Moon,CalendarRange,Infinity as InfinityIcon} from 'lucide-react';
import {EmptyLines} from './empty-lines';
import {analysisBounds,analysisEntries,previousRange} from '@/lib/analysis-periods';
import {registerLanguagePacks} from '@/lib/i18n';
import {DailyExpenseBars} from './daily-expense-bars';
import {HomeTransactions} from './home-transactions';
import {categoryColor} from '@/lib/daily-expenses';
import {allCurrencies} from '@/lib/finance';
import {reportInCurrency} from '@/lib/report-currency';
import {visibleCurrencies} from '@/lib/currency-settings';
import {ShareAppButton} from './share-app-button';
import {useSyncExternalStore} from 'react';
import {getLanguage,setLanguage,subscribeLanguage} from '@/lib/i18n';
import {Languages} from 'lucide-react';
import {LanguageSettings} from './language-settings';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {quickCategories} from '@/lib/category-priority';
import {AppGuide} from './app-guide';
import {reportBudgetEntries} from '@/lib/transaction-edit';
import {TransactionEditor} from './transaction-editor';
import {BudgetPeriod} from './budget-period';
import {CategoriesSettings} from './categories-settings';
import {Screen} from './screen';
import {fetchCurrentRates} from '@/lib/rate-providers';
import {WheelDate} from './wheel-date';
import {ExpenseRing} from './expense-ring';
import {SavingsPanel} from './savings-panel';
'use client';
import {ThemeSettings,useColors} from './theme-settings';
import {UpdateButton} from './update-button';
import { useEffect, useRef, useState } from 'react';
import {
  X,
  BookOpen,
  Database,
  Plus,
  ChartNoAxesCombined,
  Wallet,
  Layers,
  House,
  Settings,
  ChevronRight,
  Download,
  Upload,
  RotateCcw,
  Pencil,
  Check,
  ArrowDownLeft,
  ArrowLeft,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Picker, CatIcon, categoryOptions,CategoryPriorityContext } from './ui';
import {CategoryBudgets} from './category-budgets';
import {BudgetEditor} from './budget-home';
import { BudgetHome } from './budget-home';
import { DayTimeline } from './day-timeline';
import { EntryForm, type Draft } from './entry-form';
import { SettingsForm } from './settings-form';
import { StorageScreen } from './storage-screen';
import { AISettings } from './ai-settings';
import { connectHosted } from '@/lib/gemini';
import {
  convert,
  currencies,
  daysBetween,
  exportText,
  initialState,
  money,
  periodBounds,
  shiftDate,
  sumEntries,
  symbols,
  today,
  validateState,
  validDate,
  type Currency,
  type Entry,
  type State,
} from '@/lib/finance';
import { appendEntries, download, exportBackup, loadState, saveState } from '@/lib/storage';
const periods = [
  ['today', "Сегодня"],
  ['week', "7 дней"],
  ['month', "Месяц"],
  ['year', "Год"],
  ['all', "Всё"],
  ['custom', "Период"],
];
export default function FinanceApp() {
  useSyncExternalStore(subscribeLanguage,getLanguage,getLanguage);
  const [data, setData] = useState<State>(initialState),
    [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [view, setView] = useState('overview'),
    [trackedBudget,setTrackedBudget]=useState('main'),
    [walletBudget,setWalletBudget]=useState('all'),
    [display, setDisplay] = useState<Currency>('THB'),
    [period, setPeriod] = useState('month'),
    [start, setStart] = useState(today().slice(0, 8) + '01'),
    [end, setEnd] = useState(today()),
    [filter, setFilter] = useState('all'),
    [search, setSearch] = useState(''),
    [limit, setLimit] = useState(30),
    [draft, setDraft] = useState<Draft | null>(null),
    [settings, setSettings] = useState(''),
    [categoryName, setCategoryName] = useState(''),
    [categoryEdit, setCategoryEdit] = useState(''),
    [confirm, setConfirm] = useState<{
      deleteAction?: boolean;
      title: string;
      description: string;
      action: () => Promise<void>;
    } | null>(null),
    [install, setInstall] = useState<any>(null),
    [offlineReady, setOfflineReady] = useState(false);
  useColors(data.colorTheme);
  useEffect(()=>setDisplay(data.display),[data.display]);
  useEffect(()=>{if(!ready)return;registerLanguagePacks(data.languagePacks||[]);if(data.language&&getLanguage()!==data.language)setLanguage(data.language)},[ready,data.language,data.languagePacks]);
  const [homeSearch,setHomeSearch]=useState('');
  const [statsRates,setStatsRates]=useState<State['rates']|null>(null);
  useEffect(()=>{if(!['stats','history'].includes(view))return;const controller=new AbortController();(data.rateProvider==='manual'?Promise.resolve(data.rates):fetchCurrentRates(data.rateProvider,controller.signal)).then(setStatsRates).catch(()=>{});return()=>controller.abort()},[view,display,data.rateProvider]);
  const pageTouch=useRef<{x:number;y:number}|null>(null);
  const [currentDay, setCurrentDay] = useState(today());
  const [settingsKey, setSettingsKey] = useState(0);
  function openDraft(next: Draft) {
    setDraft({ ...next, token: crypto.randomUUID() });
  }
  function openSettings(next: string) {
    setSettingsKey((n) => n + 1);
    setSettings(next);
  }
  useEffect(() => {
    const refresh = () => setCurrentDay(today());
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const backup = useRef<HTMLInputElement>(null),
    stateRef = useRef(data),
    readyRef = useRef(false),
    busy = useRef(false);
  stateRef.current = data;
  readyRef.current = ready;
  useEffect(() => {
    const code = new URLSearchParams(location.hash.slice(1)).get('connect');
    if (code) {
      history.replaceState(
        history.state,
        '',
        location.pathname + location.search,
      );
      connectHosted(code)
        .then(() => setMessage(tr("Gemini подключён на этом устройстве")))
        .catch((e) => setError(tr(e.message)));
    }
    loadState()
      .then((s) => {
        setData(s); registerLanguagePacks(s.languagePacks||[]);if(s.language)setLanguage(s.language);
        setDisplay(s.display);
        setReady(true);
      })
      .catch((e) => setError(tr(e.message)));
    const handler = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if (
      'serviceWorker' in navigator &&
      !['localhost', '127.0.0.1'].includes(location.hostname)
    )
      navigator.serviceWorker
        .register(new URL('sw.js', document.baseURI).pathname, { updateViaCache: 'none' })
        .then(() => navigator.serviceWorker.ready)
        .then(() => setOfflineReady(true))
        .catch(() => {});
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 950);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    function register(tool: any) {
      try {
        Promise.resolve(
          ctx.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    register({
      name: 'get_expense_summary',
      description:
        'Read expenses for an inclusive date range. No data changes.',
      inputSchema: {
        type: 'object',
        properties: {
          start: { type: 'string' },
          end: { type: 'string' },
          currency: { type: 'string', enum: currencies },
        },
        required: ['start', 'end', 'currency'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ start, end, currency }: any) => {
        if (!readyRef.current) throw Error('Data not loaded');
        if (
          !validDate(start) ||
          !validDate(end) ||
          start > end ||
          !allCurrencies.includes(currency)
        )
          throw Error('Invalid dates or currency');
        const rows = stateRef.current.entries.filter(
          (e) => e.kind === 'expense' && e.date >= start && e.date <= end,
        );
        return { count: rows.length, ...sumReportEntries(rows, currency), currency };
      },
    });
    register({
      name: 'stage_expense',
      description: 'Open an expense draft. User must confirm to save.',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', exclusiveMinimum: 0 },
          currency: { type: 'string', enum: currencies },
          note: { type: 'string', maxLength: 5000 },
        },
        required: ['amount', 'currency'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: ({ amount, currency, note = '' }: any) => {
        if (!readyRef.current) throw Error('Data not loaded');
        if (
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > 1e12 ||
          !allCurrencies.includes(currency) ||
          typeof note !== 'string' ||
          note.length > 5000
        )
          throw Error('Invalid expense');
        openDraft({ amount, currency, note });
        return { status: 'draft_requires_confirmation' };
      },
    });
    return () => lifecycle.abort();
  }, []);
  async function persist(next: State) {
    if (busy.current || !ready)
      throw Error(tr("Дождитесь загрузки или сохранения"));
    busy.current = true;
    setSaving(true);
    try {
      if(next.rateHistory===data.rateHistory&&JSON.stringify(next.rates)!==JSON.stringify(data.rates))next={...next,rateHistory:[...(data.rateHistory||[]),{rates:next.rates,updated:new Date().toISOString()}]};
      const saved = await saveState(next, data.revision);
      setData(saved);
      setError('');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function saveEntries(entries: Entry[], oldId?: string) {
    if(oldId) {
      await persist({...data,display,entries:[...data.entries.filter(e=>e.id!==oldId),...entries]});
    } else {
      if(busy.current || !ready) throw Error(tr("Дождитесь загрузки или сохранения"));
      busy.current=true; setSaving(true);
      try { const saved=await appendEntries(entries); stateRef.current=saved; setData(saved); setError(''); }
      finally {busy.current=false;setSaving(false);}
    }
    setMessage(
      entries.length > 1
        ? tr("Чек разделён. Все части сохранены.")
        : tr("Операция сохранена"),
    );
    navigator.storage?.persist?.().catch(() => {});
  }
  function removeEntry(id: string) {
    setConfirm({deleteAction:true,title: tr("Удалить эту операцию?"),
      description: tr("Другие операции и части чека останутся."),
      action: async () => {
        await persist({
          ...data,
          entries: data.entries.filter((e) => e.id !== id),
        });
        setDraft(null);
        setMessage(tr("Операция удалена"));
      },
    });
  }
  function nav(screen: string) {
    if(!['stats','history'].includes(screen)||(screen==='stats'&&view!=='stats'))setFilter('all');
    setView(screen);
    setSearch('');
    setLimit(30);
    window.scrollTo({ top: 0 });
  }
  const analysisSource=analysisEntries(data,trackedBudget);
  const chosenBudget=trackedBudget==='main'?data.budget:data.categoryBudgets?.find(b=>b.id===trackedBudget);
  const bounds = analysisBounds(period,start,end,currentDay,analysisSource,chosenBudget?.start),
    rangeValid =
      validDate(bounds.start) &&
      validDate(bounds.end) &&
      bounds.start <= bounds.end;
  const range = analysisSource.map(e=>['stats','history'].includes(view)?{...e,rates:statsRates||data.rates}:e)
    .filter((e) => rangeValid && e.date >= bounds.start && e.date <= bounds.end)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.created.localeCompare(a.created),
    );
  const rows = range.filter(
    (e) =>
      (filter === 'all' || e.category === filter) &&
      (!search ||
        e.note.toLowerCase().includes(search.toLowerCase()) ||
        data.categories
          .find((c) => c.id === e.category)
          ?.name.toLowerCase()
          .includes(search.toLowerCase())),
  );
  function sumReportEntries(rows:Entry[],currency:Currency){return sumEntries(reportInCurrency(rows,currency,data.rates),currency)}
  const expenses = range.filter((e) => e.kind === 'expense' && (filter==='all'||e.category===filter)),
    summary = sumReportEntries(
      view === 'overview'
        ? data.entries.filter(
            (e) => e.kind === 'expense' && e.date === currentDay,
          )
        : expenses,
      display,
    ),
    income = sumReportEntries(
      range.filter((e) => e.kind === 'income'),
      display,
    );
  const categoryTotals = data.categories.map((c) => ({
    ...c,
    ...sumReportEntries(
      expenses.filter((e) => e.category === c.id),
      display,
    ),
    count: expenses.filter((e) => e.category === c.id).length,
  }));
  const first = expenses.reduce((a, e) => (e.date < a ? e.date : a), today()),
    last = expenses.reduce((a, e) => (e.date > a ? e.date : a), today()),
    graphStart = bounds.start,
    graphEnd = bounds.end,
    dayCount = rangeValid ? Math.max(1, daysBetween(graphStart, graphEnd)) : 1,
    bucket = Math.max(1, Math.ceil(dayCount / 31));
  const graph = Array.from(
    { length: Math.min(31, Math.ceil(dayCount / bucket)) },
    () => 0,
  );
  if (rangeValid)
    for (const e of expenses) {
      const n = convert(e.amount, e.currency, display, data.rates),
        i = Math.floor((daysBetween(graphStart, e.date) - 1) / bucket);
      if (n !== null && i >= 0 && i < graph.length) graph[i] += n;
    }
  const graphMax = Math.max(1, ...graph);
  const convertedSavings = currencies.map((c) =>
      data.savings[c] === null
        ? null
        : convert(data.savings[c]!, c, display, data.rates),
    ),
    missingSavings = currencies.some(
      (c, i) => data.savings[c] !== null && convertedSavings[i] === null,
    ),
    savingsTotal = missingSavings
      ? null
      : convertedSavings.some((n) => n !== null)
        ? convertedSavings.reduce<number>((s, n) => s + (n ?? 0), 0)
        : null;
  async function saveCategory() {
    try {
      const name = categoryName.trim();
      if (!name || name.length > 80)
        throw Error(tr("Название: от 1 до 80 символов"));
      if (
        data.categories.some(
          (c) =>
            c.id !== categoryEdit &&
            c.name.toLowerCase() === name.toLowerCase(),
        )
      )
        throw Error(tr("Такая категория уже есть"));
      await persist({
        ...data,
        categories: categoryEdit
          ? data.categories.map((c) =>
              c.id === categoryEdit ? { ...c, name } : c,
            )
          : [
              ...data.categories,
              { id: crypto.randomUUID(), name, icon: 15, archived: false },
            ],
      });
      setCategoryName('');
      setCategoryEdit('');
      setMessage(tr("Категория сохранена"));
    } catch (e: any) {
      setError(tr(e.message));
    }
  }
  async function restore(file: File) {
    try {
      if (file.size > 25 * 1024 * 1024)
        throw Error(tr("Максимальный размер копии — 25 МБ"));
      const text = await file.text(),
        marker =
          'ИСХОДНЫЕ ДАННЫЕ JSON — все поля для анализа и восстановления\n';
      const raw = text.includes(marker)
        ? text.slice(text.indexOf(marker) + marker.length)
        : text;
      const state = validateState(JSON.parse(raw.replace(/^\uFEFF/, '')));
      setConfirm({
        title: tr("Восстановить данные?"),
        description: tr("В файле {0} операций и {1} категорий. Они заменят текущие данные. Перед заменой будет скачана копия текущих записей.", [state.entries.length, state.categories.length]),
        action: async () => {
          download(
            JSON.stringify(data, null, 2),
            'wimm-before-restore-' + today() + '.json',
            'application/json',
          );
          await persist({ ...state, revision: data.revision });
          setDisplay(state.display);
          setMessage(tr("Данные восстановлены"));
        },
      });
    } catch (e: any) {
      setError(
        e instanceof SyntaxError
          ? tr("Файл не является резервной копией приложения")
          : e.message,
      );
    }
  }
  useEffect(() => {
    const refresh = () => {
      if (!draft && !settings && !busy.current)
        loadState()
          .then((s) => {
            setData(s); registerLanguagePacks(s.languagePacks||[]);if(s.language)setLanguage(s.language);
            setReady(true);
          })
          .catch((e) => setError(tr(e.message)));
    };
    window.addEventListener('focus', refresh);
    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [draft, settings]);
  const list = (entries: Entry[], compact = false) =>
    entries.length ? (
      <>
        {entries.slice(0, limit).map((e) => (
          <button
            className="entry category-entry"
            key={e.id}
            onClick={() => openDraft({ entry: e })}
          >
            {['stats','history'].includes(view)&&<i className="category-color-dot" style={{background:categoryColor(e.category)}}/>}<CatIcon
              category={data.categories.find((c) => c.id === e.category)}
              color={['stats','history'].includes(view)?categoryColor(e.category):undefined}
            />
            <span className="entry-copy">
              <b>
                {compact ? '' : (e.note || categoryLabel(data.categories.find((c) => c.id === e.category)))}
              </b>
              <small>
                {e.date.split('-').reverse().join('.')} · {new Intl.DateTimeFormat(localeCode(),{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Bangkok'}).format(new Date(e.created))}
                {!compact &&
                  ' · ' +
                    data.categories.find((c) => c.id === e.category)?.name}
              </small>
            </span>
            <span className="entry-money">{e.kind==='income'?'+':''}{new Intl.NumberFormat(localeCode(),{maximumFractionDigits:display==='THB'?0:2}).format(convert(e.amount,e.currency,display,data.rates)??e.amount)}<small className="entry-currency">{symbols[convert(e.amount,e.currency,display,data.rates)===null?e.currency:display]}</small></span>
            <ChevronRight size={14} color="#777" />
          </button>
        ))}
        {entries.length > limit && (
          <MoreRows onMore={() => setLimit((n) => n + 30)} />
        )}
      </>
    ) : (
      <div className="empty">
        <ArrowDownLeft size={25} />
        <h3>{tr("Пока нет операций")}</h3>
        <p>{tr("Выберите категорию и запишите первую покупку.")}</p>
      </div>
    );
  return (
    <CategoryPriorityContext.Provider value={quickCategories(data)}><main className={'phone view-'+view+' '+(view==='overview'?'home-minimal':'')} onTouchStart={e=>{if(draft||settings||!(e.target instanceof Element)||e.target.closest('button,input,textarea,[role="dialog"],.picker-overlay,.wheel-overlay'))return;pageTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{const p=pageTouch.current;pageTouch.current=null;if(!p||draft||settings)return;const dx=e.changedTouches[0].clientX-p.x,dy=e.changedTouches[0].clientY-p.y;if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.6)return;const pages=['overview','stats','savings','more'];const index=pages.indexOf(view==='history'?'stats':view);const next=index+(dx<0?1:-1);if(next>=0&&next<pages.length)nav(pages[next])}}>
      {error && (
        <div role="alert" className="error inline-message">
          {tr(error)}
          <button
            className="text-button full"
            onClick={() => location.reload()}
          >
            {tr("Обновить приложение")}</button>
        </div>
      )}
      {message && (
        <div className="done-toast" role="status">
          Done
        </div>
      )}
      {!ready && (
        <p className="muted">
          {error
            ? tr("Записи недоступны. Не очищайте данные браузера.")
            : tr("Загружаю ваши записи…")}
        </p>
      )}
      <div className="title-line">{['history','categories'].includes(view)&&<button className="modal-back title-back" aria-label={tr("Назад")} onClick={()=>nav('more')}><ArrowLeft size={28}/></button>}
        <h1>
          {view==='savings'?<Wallet/>:view==='categories'?<Layers/>:null}{
            (
              {
                overview: new Intl.DateTimeFormat(localeCode(), {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Bangkok',
                }).format(new Date(currentDay + 'T12:00:00+07:00')),
                stats: '',
                history: '',
                savings: '',
                categories: '',
                more: '',
              } as Record<string, string>
            )[view]
          }
        </h1>

      </div>
      {['stats', 'history'].includes(view) && (
        <>
          <div className="analysis-controls"><div className="analysis-overview-total">{summary.missing?'—':money(summary.total,display)}</div><BudgetPeriod start={period==='all'?graphStart:bounds.start} end={period==='all'?graphEnd:bounds.end} onStart={v=>{setStart(v);setEnd(period==='all'?graphEnd:bounds.end);setPeriod('custom')}} onEnd={v=>{setStart(period==='all'?graphStart:bounds.start);setEnd(v);setPeriod('custom')}}/><div className="stats-toolbar"><div className="analysis-budget-filter"><Picker value={trackedBudget} onChange={v=>{setTrackedBudget(v);setFilter('all');setLimit(30)}} label={tr('Выбор бюджета')} options={[["main",tr('Основной бюджет')],...(data.categoryBudgets||[]).map(b=>[b.id,b.name])]}/></div><div className="filters">
            {periods.filter(([v])=>v!=='custom').map(([v, label]) => (
              <button
                aria-label={tr(label)} title={tr(label)} className={'chip ' + (period === v ? 'selected' : '')}
                key={v}
                onClick={() => {
                  setPeriod(v);
                  setLimit(30);
                }}
              >
                {v==='today'||v==='week'?<span className="period-number-icon">{v==='today'?'1':'7'}</span>:v==='month'?<Moon size={24}/>:v==='year'?<CalendarRange size={24}/>:<InfinityIcon size={24}/>}
              </button>
            ))}
          </div>
          <div className="category-filter">
            <Picker
              value={filter}
              onChange={(v) => {
                setFilter(v);
                setLimit(30);
              }}
              trigger={<Layers size={24}/>} label={tr("Фильтр категории")}
              options={[
                ['all', <span className="category-option"><span className="entry-icon"><Layers/></span><span>{tr("Все категории")}</span></span>],
                ...categoryOptions(data.categories.map(c=>({...c,name:categoryLabel(c)+(c.archived?tr(" · архив"):'')}))),
              ]}
            />
          </div>
          </div></div>
          {!rangeValid && (
            <p className="error">{tr("Проверьте начало и конец периода.")}</p>
          )}
        </>
      )}
      {view === 'overview' && (
        <>
          <BudgetHome tracked={trackedBudget} setTracked={setTrackedBudget} onBudgets={async categoryBudgets=>{await persist({...data,categoryBudgets})}} data={data} day={currentDay} ready={ready} onBudget={async budget=>{await persist({...data,budget});setMessage(tr("Бюджет сохранён"))}} onSave={saveEntries} onDraft={openDraft}/>

          <HomeTransactions entries={analysisEntries(data,trackedBudget)} categories={data.categories} render={entries=>list(entries,true)}/>
        </>
      )}
      {view === 'stats' && (
        <>
          <section className="analysis-chart-block"><DailyExpenseBars entries={expenses} previousEntries={analysisSource.filter(e=>e.kind==='expense'&&(filter==='all'||e.category===filter)).map(e=>({...e,rates:statsRates||data.rates}))} period={period} currency={display} start={graphStart} end={graphEnd} rates={statsRates||data.rates}/></section>          <section className="section analysis-expense-list">{expenses.length?list(expenses):<EmptyLines/>}</section>
          <p className="footer-note">
            {tr("Итоги используют курс, сохранённый в каждой операции. Неполные доходы не влияют на расходы.")}</p>
        </>
      )}
      {view === 'history' && (
        <>
          <input
            className="search"
            aria-label={tr("Поиск операций")}
            placeholder={tr("Описание или категория")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="muted">
            {tr("Расходы в выборке:")}{' '}
            {sumReportEntries(
              rows.filter((e) => e.kind === 'expense'),
              display,
            ).missing
              ? '—'
              : money(
                  sumReportEntries(
                    rows.filter((e) => e.kind === 'expense'),
                    display,
                  ).total,
                  display,
                )}
          </p>
          {list(rows)}
        </>
      )}
      {view==='savings'&&<SavingsPanel data={data} ready={ready} onSave={persist} selectedBudget={walletBudget} onSelectedBudget={setWalletBudget}/>}
      {view==='categories'&&<Screen title={tr("Категории")} heading={<span/>} back={()=>nav('more')}><CategoriesSettings data={data} ready={ready} onSave={persist}/></Screen>}
      {view === 'more' && (
        <>
          <button className="language-settings-icon" data-direct-action="true" aria-label={tr('Язык')} onClick={()=>openSettings('language')}><Languages/></button><ThemeSettings saved={data.userColors} value={data.colorTheme} onSave={async(colorTheme,userColors)=>{await persist({...data,colorTheme,userColors});setMessage(tr("Цвета сохранены"))}}/>
          <button className="menu-item setting-budget" onClick={()=>openSettings("budgets")}><Wallet/>{tr("Бюджеты · быстрые категории")}</button><UpdateButton disabled={!ready||saving}/><p className="update-invite">{tr("Может быть, что-то интересное добавилось — попробую обновить.")}</p>
          <button className="menu-item setting-ai" onClick={() => openSettings('ai')}>
            <Settings size={21} />
            {tr("Gemini · чеки и голос")}<ChevronRight />
          </button>
          <button className="menu-item setting-data" onClick={() => openSettings('storage')}>
            <Database size={21} />
            {tr("Данные")}<ChevronRight />
          </button>
          <button className="menu-item setting-categories" onClick={() => nav('categories')}>
            <Layers size={21} />
            {tr("Категории")}<ChevronRight />
          </button>

          <button className="menu-item setting-guide" onClick={()=>openSettings('guide')}><BookOpen/><span>{tr("Руководство")}</span></button>
          <ShareAppButton/><button className="menu-item setting-install" onClick={() => openSettings('install')}>
            <Plus size={21} />
            {tr('Install on your phone')}
            <ChevronRight />
          </button>
          <section className="section">
            <h2>{tr("Без регистрации")}</h2>
            <p className="muted">
              {tr("Записи хранятся в этом браузере и остаются после обновления страницы. На другой телефон перенесите резервную копию.")}</p>
            <p className="muted">
              {tr("Очистка данных сайта или приватный режим могут удалить записи. Регулярно сохраняйте копию вне браузера.")}</p>
            <p className="muted">
              {tr("Без Gemini фото обрабатывается на устройстве. При подключении Gemini выбранные фото, аудиозаписи и текст отправляются Google. Без Gemini аудио может передаваться сервису распознавания браузера. Исходные фото и звук после закрытия формы не сохраняются — только подтверждённые суммы и описание.")}</p>
            <p className="footer-note">
              {offlineReady
                ? tr("Офлайн-режим подготовлен.")
                : tr("Откройте опубликованную ссылку с интернетом для подготовки офлайн-режима.")}{' '}
              {tr("Ручной ввод, расчёты и экспорт доступны без сети. Курсы и распознавание могут требовать интернет.")}</p>
          </section>
        </>
      )}
      <nav className="bottom-nav" aria-label={tr("Основная навигация")}>
        <button
          className={view === 'overview' ? 'active' : ''}
          onClick={() => nav('overview')}
        >
          <House />
          <span>{tr("Главная")}</span>
        </button>
        <button
          className={['stats', 'history'].includes(view) ? 'active' : ''}
          onClick={() => nav('stats')}
        >
          <ChartNoAxesCombined />
          <span>{tr("Статистика")}</span>
        </button>

        <button
          className={view === 'savings' ? 'active' : ''}
          onClick={() => nav('savings')}
        >
          <Wallet />
          <span>{tr("Сбережения")}</span>
        </button>
        <button
          className={['more', 'categories'].includes(view) ? 'active' : ''}
          onClick={() => nav('more')}
        >
          <Settings />
          <span>{tr("Ещё")}</span>
        </button>
      </nav>
      <input
        ref={backup}
        hidden
        type="file"
        accept=".json,.txt,application/json,text/plain"
        onChange={(e) => {
          if (e.target.files?.[0]) void restore(e.target.files[0]);
          e.target.value = '';
        }}
      />
      {draft?.entry?<TransactionEditor key={draft.token} data={data} entry={draft.entry} onSave={saveEntries} onDelete={removeEntry} onClose={()=>setDraft(null)}/>:draft && (
        <EntryForm
          key={draft.token}
          data={data}
          draft={draft}
          onClose={() => setDraft(null)}
          onSave={saveEntries}
          onDelete={removeEntry}
        />
      )}
      {settings==='budgets'&&<Screen title={tr("Бюджеты")} heading={<span/>} back={()=>setSettings('')}><div className="budget-settings-page"><details className="general-budget-card"><summary>{tr("Общий бюджет")}</summary><BudgetEditor value={data.budget} data={data} available={visibleCurrencies(data)} categories={data.categories} ready={ready} onSave={async budget=>{await persist({...data,budget})}}/></details><CategoryBudgets data={data} day={currentDay} ready={ready} onSave={async categoryBudgets=>{await persist({...data,categoryBudgets})}}/></div></Screen>}
      {settings === 'storage' && (
        <StorageScreen
          key={settingsKey}
          data={data}
          onImport={()=>{backup.current?.click();setSettings('')}}
          onClose={() => setSettings('')}
        />
      )}
      {settings==='language'&&<LanguageSettings data={data} onSavePack={async languagePacks=>{await persist({...data,languagePacks});registerLanguagePacks(languagePacks)}} onClose={()=>setSettings('')} onSave={async language=>{await persist({...data,language});setLanguage(language)}}/>}
      {settings==='guide'&&<AppGuide onClose={()=>setSettings('')}/>}
      {settings === 'ai' && (
        <AISettings key={settingsKey} onClose={() => setSettings('')} />
      )}
      {settings && !['storage', 'ai','budgets','guide','language'].includes(settings) && (
        <SettingsForm
          key={settingsKey}
          mode={settings}
          data={data}
          install={install}
          onSave={async (next) => {
            await persist(next);
            setMessage(tr("Сохранено"));
          }}
          onClose={() => setSettings('')}
        />
      )}
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !saving) setConfirm(null);
        }}
      >
        <AlertDialogContent className={'app-dialog '+(confirm?.deleteAction?'delete-confirm':'')}>
          <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.description}
          </AlertDialogDescription>
          <div className="row">
            <button
              className="confirm-cancel" aria-label={tr("Отмена")}
              disabled={saving}
              onClick={() => setConfirm(null)}
            >
              <X size={30}/>
            </button>
            <button
              className="primary save-circle" aria-label={tr("Подтвердить")}
              disabled={saving}
              onClick={async () => {
                try {
                  await confirm?.action();
                  setConfirm(null);
                } catch (e: any) {
                  setError(tr(e.message));
                  setConfirm(null);
                }
              }}
            >
              <Check/>
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main></CategoryPriorityContext.Provider>
  );
}

function MoreRows({ onMore }: { onMore: () => void }) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onMore();
      },
      { rootMargin: '220px' },
    );
    if (target.current) observer.observe(target.current);
    return () => observer.disconnect();
  }, [onMore]);
  return (
    <div
      ref={target}
      style={{ height: 20 }}
      aria-label={tr("Загрузка следующих операций")}
    />
  );
}



