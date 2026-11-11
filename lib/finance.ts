import {validateLanguagePack,type LanguagePack} from './language-packs';
import {spokenCurrency} from './spoken-currency';
import {currencyCodes,type Currency} from './currency-catalog';
export type {Currency} from './currency-catalog';
import {normalizeSpeech} from './speech-normalize';
import {tr} from './i18n';
import {localeCode,type Language} from './i18n';
import {validBudget,validCategoryBudgets,type CategoryBudget,type Budget} from './budget';
export const allCurrencies:readonly Currency[]=currencyCodes;
export const currencies: Currency[] = ['THB', 'USD', 'UAH'];
export const symbols: Record<Currency,string> = {"THB":"฿","USD":"$","UAH":"₴","EUR":"€","GBP":"£","RUB":"₽","CNY":"¥","JPY":"¥","KRW":"₩","SGD":"S$","MYR":"RM","AUD":"A$","CAD":"C$","CHF":"CHF","INR":"₹","VND":"₫","IDR":"Rp","HKD":"HK$"};
export type Category = {
  id: string;
  name: string;
  icon: number;
  archived: boolean;
};
export type Rates = {
  THB: number;
  USD: number | null;
  UAH: number | null;
  date: string;
  source: string;
} & Partial<Record<Currency,number|null>>;
export type Entry = {
  id: string;
  group: string;
  amount: number;
  currency: Currency;
  kind: 'expense' | 'income';
  category: string;
  date: string;
  note: string;
  rates: Rates;
  created: string;
  /** Missing on records created before multi-budget support: they belong to the main budget. */
  budgetId?: string;
};
export const MAIN_BUDGET_ID = 'main';
export const ALL_BUDGETS_ID = 'all';
export function entryBudgetId(entry: Pick<Entry,'budgetId'>) { return entry.budgetId || MAIN_BUDGET_ID; }
export function entriesForBudget(entries: Entry[], budgetId: string) {
  return budgetId === ALL_BUDGETS_ID ? entries : entries.filter(entry => entryBudgetId(entry) === budgetId);
}
export type State = {
  language?: Language;
  languagePacks?: LanguagePack[];
  enabledCurrencies?: Currency[];
  quickCategories?:string[];
  savingsCheckpoint?: string;
  savingsGoal?: {amount:number;daily:number;currency:Currency};
  rateProvider?: 'exchange'|'currency-api'|'manual'|'custom';
  rateHistory?: {rates:Rates;updated:string}[];
  userColors?: {accent:string;background:string}[];
  budget?: Budget;
  categoryBudgets?: CategoryBudget[];
  colorTheme?: {accent:string;background:string};
  schema: 1;
  revision: number;
  categories: Category[];
  entries: Entry[];
  rates: Rates;
  savings: Record<'THB'|'USD'|'UAH',number|null> & Partial<Record<Currency,number|null>>;
  savingsDate: string;
  display: Currency;
};
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function shiftDate(date: string, days: number) {
  return new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function validDate(s: unknown): s is string {
  return (
    typeof s === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s + 'T12:00:00Z')) &&
    new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s
  );
}
export const names = [
  'Продукты в магазинах',
  'Кафе и рестораны',
  'Аренда жилья',
  'Коммунальные платежи',
  'Мотобайк',
  'Бензин',
  'Виза',
  'Медицина',
  'Уход за собой',
  'Подарки',
  'Связь и интернет',
  'Спорт и хобби',
  'Одежда',
  'Свидания',
  'Путешествия и приключения',
  'Разное',
  'Алкоголь',
  'Товары для дома',
];
export function initialState(): State {
  return {
    schema: 1,
    revision: 0,
    categories: [...names.map((name, icon) => ({
      id: 'cat-' + icon,
      name,
      icon,
      archived: false,
    })), {id:'cat-fun',name:'Развлечения',icon:16,archived:false},{id:'cat-unknown',name:'Неопознано',icon:15,archived:false}],
    entries: [],
    rates: { THB: 1, USD: null, UAH: null, date: today(), source: 'Не заданы' },
    savings: { THB: null, USD: null, UAH: null },
    savingsDate: '',
    display: 'THB',
  };
}
export function money(n: number | null, c: Currency) {
  return n === null
    ? '—'
    : new Intl.NumberFormat(localeCode(), {
        maximumFractionDigits: c==='THB'?0:2,
        minimumFractionDigits: 0,
      }).format(n) +
        ' ' +
        symbols[c];
}
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  r: Rates,
) {
  if (from === to) return amount;
  const a = r[from],
    b = r[to];
  return a && b ? (amount * a) / b : null;
}
export function sumEntries(entries: Entry[], currency: Currency) {
  let total = 0,
    missing = 0;
  for (const e of entries) {
    const n = convert(e.amount, e.currency, currency, e.rates);
    if (n === null) missing++;
    else total += n;
  }
  return { total: Math.round(total * 100) / 100, missing };
}
export function periodBounds(
  period: string,
  customStart: string,
  customEnd: string,
) {
  const end = today();
  if (period === 'today') return { start: end, end };
  if (period === 'week') return { start: shiftDate(end, -6), end };
  if (period === 'month') return { start: end.slice(0, 8) + '01', end };
  if (period === 'year') return { start: end.slice(0, 4) + '-01-01', end };
  if (period === 'all') return { start: '1900-01-01', end: '9999-12-31' };
  return { start: customStart, end: customEnd };
}
export function daysBetween(start: string, end: string) {
  return (
    Math.round(
      (Date.parse(end + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) /
        86400000,
    ) + 1
  );
}
// Recursive descent: arithmetic only; never execute user text as JavaScript.
export function calculate(input: string): number {
  const text = input
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');
  if (!text || text.length > 150 || /[^\d.+*/()\-]/.test(text))
    throw new Error('Введите сумму или арифметическое выражение');
  const tokens = text.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]/g) || [];
  let p = 0;
  function atom(): number {
    const t = tokens[p++];
    if (t === '-') return -atom();
    if (t === '+') return atom();
    if (t === '(') {
      const n = expr();
      if (tokens[p++] !== ')') throw Error(tr("Закройте скобку"));
      return n;
    }
    if (!t || !/^\d|^\.\d/.test(t)) throw Error(tr("Проверьте выражение"));
    return Number(t);
  }
  function term(): number {
    let n = atom();
    while (tokens[p] === '*' || tokens[p] === '/') {
      const op = tokens[p++],
        b = atom();
      if (op === '/' && b === 0) throw Error(tr("На ноль делить нельзя"));
      n = op === '*' ? n * b : n / b;
    }
    return n;
  }
  function expr(): number {
    let n = term();
    while (tokens[p] === '+' || tokens[p] === '-') {
      const op = tokens[p++],
        b = term();
      n = op === '+' ? n + b : n - b;
    }
    return n;
  }
  const result = expr();
  if (
    p !== tokens.length ||
    !Number.isFinite(result) ||
    Math.abs(result) > 1e12
  )
    throw Error(tr("Проверьте выражение"));
  return Math.round((result + Number.EPSILON) * 100) / 100;
}
export function splitAmounts(total: number, parts: number[]) {
  const cents = Math.round(total * 100);
  const allocated = parts.reduce((s, n) => s + Math.round(n * 100), 0);
  if (parts.some((n) => !Number.isFinite(n) || n <= 0) || allocated >= cents)
    throw Error(tr("Выделенные суммы должны быть больше нуля и меньше итога чека"));
  return (cents - allocated) / 100;
}
const numberWords: Record<string, number> = {
  ноль: 0,
  один: 1,
  одна: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  одиннадцать: 11,
  двенадцать: 12,
  тринадцать: 13,
  четырнадцать: 14,
  пятнадцать: 15,
  шестнадцать: 16,
  семнадцать: 17,
  восемнадцать: 18,
  девятнадцать: 19,
  двадцать: 20,
  тридцать: 30,
  сорок: 40,
  пятьдесят: 50,
  шестьдесят: 60,
  семьдесят: 70,
  восемьдесят: 80,
  девяносто: 90,
  сто: 100,
  двести: 200,
  триста: 300,
  четыреста: 400,
  пятьсот: 500,
  шестьсот: 600,
  семьсот: 700,
  восемьсот: 800,
  девятьсот: 900,
};
function wordsToDigits(s: string) {
  return s.replace(/(?:[а-яё]+\s*)+/gi, (phrase) => {
    const words = phrase.trim().split(/\s+/);
    let result = '',
      sum = 0,
      block = 0,
      active = false;
    const flush = () => {
      if (active) {
        result += sum + block + ' ';
        sum = block = 0;
        active = false;
      }
    };
    for (const w of words) {
      if (w in numberWords) {
        block += numberWords[w];
        active = true;
      } else if (/^тысяч[аиу]?$/.test(w)) {
        sum += (block || 1) * 1000;
        block = 0;
        active = true;
      } else {
        flush();
        result += w + ' ';
      }
    }
    flush();
    return result;
  });
}
export function parseVoice(text: string, categories: Category[]) {
  const low = text.toLowerCase();
  const s = wordsToDigits(low);
  const currency: Currency = spokenCurrency(text) || (/доллар|usd|\$/.test(low)
    ? 'USD'
    : /грив|uah|₴/.test(low)
      ? 'UAH'
      : 'THB');
  const match =
    s.match(/(\d[\d ]*(?:[.,]\d{1,2})?)\s*(?:бат|thb|доллар|usd|грив|uah)/) ||
    s.match(/(\d+(?:[.,]\d{1,2})?)/);
  const amount = match
    ? Number(match[1].replace(/ /g, '').replace(',', '.'))
    : null;
  const patterns = [
    /магазин|продукт|севен|7.eleven|лотус/,
    /кафе|ресторан|обед|ужин|завтрак|кофе/,
    /аренд.*(?:жиль|кварт|дом)|квартплат/,
    /коммун|электрич|водоснаб/,
    /мотобайк|байк|ремонт|обслужив/,
    /бензин|заправ/,
    /виз[ауеы]/,
    /врач|больниц|медицин|лекарств|клиник/,
    /витамин|стриж|парикмах|массаж/,
    /подар/,
    /интернет|связь|сим.?карт|мобильн/,
    /спорт|хобби|тренир|фитнес/,
    /одежд|футболк|обув|шорт/,
    /свидани/,
    /путешеств|поездк|приключ|билет|отел/,
  ];
  const idx = patterns.findIndex((r) => r.test(low));
  const category =
    categories.find(
      (c) => c.id === 'cat-' + (idx < 0 ? 15 : idx) && !c.archived,
    )?.id ||
    categories.find((c) => !c.archived)?.id ||
    '';
  return {
    amount,
    currency,
    category,
    date: /вчера/.test(low) ? shiftDate(today(), -1) : today(),
    note: text.trim(),
  };
}
export function parseSingleVoice(text: string, categories: Category[]) {
  const normalized=normalizeSpeech(text);
  const s = wordsToDigits(normalized);
  const number = '(?:\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d+)(?:[.,]\\d{1,2})?';
  const monetary = [
    ...s.matchAll(
      new RegExp(
        '(' + number + ')\\s*(?:бат|thb|доллар|usd|грив|uah|฿|₴|\\$)',
        'g',
      ),
    ),
  ];
  const matches = monetary.length
    ? monetary
    : [...s.matchAll(new RegExp('(' + number + ')', 'g'))];
  if (matches.length !== 1)
    throw Error(
      matches.length
        ? 'Назовите одну итоговую сумму для выбранной категории. Несколько расходов запишите отдельно.'
        : 'Назовите сумму расхода, например: 250 бат.',
    );
  const parsed = parseVoice(normalized, categories);
  parsed.note=text.trim();
  parsed.amount = Number(
    matches[0][1].replace(/[ \u00a0]/g, '').replace(',', '.'),
  );
  if (
    !Number.isFinite(parsed.amount) ||
    parsed.amount <= 0 ||
    parsed.amount > 1e12
  )
    throw Error(tr("Проверьте сумму расхода"));
  return parsed;
}
export function receiptCandidates(text: string) {
  const lines = text.split(/\r?\n/);
  const found: { amount: number; line: string; priority: number }[] = [];
  for (const line of lines) {
    if (/change|cash|tender|เงินทอน|เงินสด|сдач|налич/i.test(line)) continue;
    const priority =
      /grand\s*total|amount\s*due|net\s*total|ยอดสุทธิ|รวมทั้งสิ้น|итого/i.test(line)
        ? 3
        : /\btotal\b|รวม|итог/i.test(line) && !/subtotal/i.test(line)
          ? 2
          : 0;
    const amounts = line.match(/(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\b/g) || [];
    for (const a of amounts) {
      const amount = Number(a.replace(/,/g, ''));
      if (amount > 0) found.push({ amount, line: line.trim(), priority });
    }
  }
  return found
    .sort((a, b) => b.priority - a.priority)
    .filter((a, i, arr) => arr.findIndex((b) => b.amount === a.amount) === i)
    .slice(0, 12);
}
function validRates(r: any) {
  return (
    r &&
    r.THB === 1 &&
    ['USD', 'UAH'].every(
      (c) =>
        r[c] === null ||
        (typeof r[c] === 'number' &&
          Number.isFinite(r[c]) &&
          r[c] > 0 &&
          r[c] < 1e9),
    ) &&
    allCurrencies.every(c=>currencies.includes(c)||r[c]===undefined||r[c]===null||(typeof r[c]==='number'&&Number.isFinite(r[c])&&r[c]>0&&r[c]<1e9)) &&
    validDate(r.date) &&
    typeof r.source === 'string' &&
    r.source.length <= 200
  );
}
export function validateState(s: any): State {
 if(s?.enabledCurrencies!==undefined&&(!Array.isArray(s.enabledCurrencies)||!s.enabledCurrencies.length||s.enabledCurrencies.length>allCurrencies.length||new Set(s.enabledCurrencies).size!==s.enabledCurrencies.length||s.enabledCurrencies.some((c:any)=>!allCurrencies.includes(c))||!s.enabledCurrencies.includes(s.display)))throw Error(tr('Проверьте список валют'));
 if(s?.savings&&allCurrencies.some(c=>!currencies.includes(c)&&s.savings[c]!==undefined&&s.savings[c]!==null&&(!Number.isFinite(s.savings[c])||Math.abs(s.savings[c])>1e12)))throw Error(tr('Проверьте остатки валют'));
 if(s?.languagePacks!==undefined){if(!Array.isArray(s.languagePacks)||s.languagePacks.length>20||new Set(s.languagePacks.map((p:any)=>p?.code)).size!==s.languagePacks.length)throw Error('Проверьте файл языка');s.languagePacks.forEach((pack:LanguagePack)=>validateLanguagePack(pack))}
 if(s?.language!==undefined&&(!['ru','th','en','uk'].includes(s.language)&&!s?.languagePacks?.some((p:LanguagePack)=>p.code===s.language)))throw Error(tr("Invalid language"));
 if(s?.quickCategories!==undefined&&(!Array.isArray(s.quickCategories)||s.quickCategories.length>3||new Set(s.quickCategories).size!==s.quickCategories.length||s.quickCategories.some((id:any)=>typeof id!=="string"||!s.categories?.some((c:any)=>c.id===id))))throw Error(tr("Проверьте быстрые категории"));
 if(s?.rateHistory!==undefined&&(!Array.isArray(s.rateHistory)||s.rateHistory.length>100000||s.rateHistory.some((h:any)=>!h||!validRates(h.rates)||!Number.isFinite(Date.parse(h.updated)))))throw Error(tr("Некорректная история курсов"));
 if(s?.savingsGoal!==undefined&&(!s.savingsGoal||!Number.isFinite(s.savingsGoal.amount)||s.savingsGoal.amount<=0||s.savingsGoal.amount>1e12||!Number.isFinite(s.savingsGoal.daily)||s.savingsGoal.daily<=0||s.savingsGoal.daily>1e12||!allCurrencies.includes(s.savingsGoal.currency)))throw Error(tr("Проверьте цель накопления"));
 if(s?.savingsCheckpoint!==undefined&&(typeof s.savingsCheckpoint!=="string"||!Number.isFinite(Date.parse(s.savingsCheckpoint))))throw Error(tr("Invalid savings checkpoint"));
 if(s?.rateProvider!==undefined&&!["exchange","currency-api","manual","custom"].includes(s.rateProvider))throw Error(tr("Invalid rate provider"));
 if(s?.userColors!==undefined&&(!Array.isArray(s.userColors)||s.userColors.length>30||s.userColors.some((c:any)=>!c||!/^#[0-9a-f]{6}$/i.test(c.accent)||!/^#[0-9a-f]{6}$/i.test(c.background))))throw Error(tr("Invalid colors"));
 if(s?.colorTheme!==undefined&&(!s.colorTheme||!/^#[0-9a-f]{6}$/i.test(s.colorTheme.accent)||!/^#[0-9a-f]{6}$/i.test(s.colorTheme.background)))throw Error(tr("Некорректные цвета"));
  if(s?.categoryBudgets!==undefined&&!validCategoryBudgets(s.categoryBudgets))throw Error(tr("Проверьте бюджеты категорий"));
  if (s?.budget !== undefined && !validBudget(s.budget)) throw Error(tr("Проверьте настройки бюджета"));
  if (
    !s ||
    s.schema !== 1 ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0 ||
    !Array.isArray(s.entries) ||
    s.entries.length > 100000 ||
    !Array.isArray(s.categories) ||
    s.categories.length < 1 ||
    s.categories.length > 500 ||
    !validRates(s.rates) ||
    !allCurrencies.includes(s.display) ||
    !s.savings ||
    !currencies.every(
      (c) =>
        s.savings[c] === null ||
        (typeof s.savings[c] === 'number' &&
          Number.isFinite(s.savings[c]) &&
          s.savings[c] >= -1e12 &&
          s.savings[c] <= 1e12),
    ) ||
    !(s.savingsDate === '' || validDate(s.savingsDate))
  )
    throw Error(tr("Неверный формат резервной копии"));
  const ids = new Set<string>();
  for (const c of s.categories) {
    if (
      !c ||
      typeof c.id !== 'string' ||
      c.id.length > 80 ||
      ids.has(c.id) ||
      typeof c.name !== 'string' ||
      !c.name.trim() ||
      c.name.length > 80 ||
      !Number.isInteger(c.icon) ||
      c.icon < 0 ||
      c.icon > 17 ||
      typeof c.archived !== 'boolean'
    )
      throw Error(tr("Ошибка в категориях резервной копии"));
    ids.add(c.id);
  }
  const tx = new Set();
  for (const e of s.entries) {
    if (
      !e ||
      typeof e.id !== 'string' ||
      e.id.length > 80 ||
      tx.has(e.id) ||
      typeof e.group !== 'string' ||
      e.group.length > 80 ||
      typeof e.amount !== 'number' ||
      !Number.isFinite(e.amount) ||
      e.amount <= 0 ||
      e.amount > 1e12 ||
      Math.abs(e.amount * 100 - Math.round(e.amount * 100)) > 0.001 ||
      !allCurrencies.includes(e.currency) ||
      !['expense', 'income'].includes(e.kind) ||
      !ids.has(e.category) ||
      !validDate(e.date) ||
      typeof e.note !== 'string' ||
      e.note.length > 5000 ||
      !validRates(e.rates) ||
      typeof e.created !== 'string' ||
      Number.isNaN(Date.parse(e.created)) ||
      (e.budgetId !== undefined && (typeof e.budgetId !== 'string' || !e.budgetId || e.budgetId.length > 80))
    )
      throw Error(tr("Ошибка в операциях резервной копии"));
    tx.add(e.id);
  }
  return s;
}
export function exportText(s: State) {
  const cat = new Map(s.categories.map((c) => [c.id, c.name]));
  let text =
    'ДЕНЬГИ РЯДОМ — ПОЛНЫЙ ЭКСПОРТ\nДата экспорта: ' +
    new Date().toISOString() +
    '\nЧасовой пояс дат: Asia/Bangkok\nДоходы могут быть неполными. Сбережения — отдельный снимок, не расчётный баланс.\nКурсы указаны как количество THB за единицу валюты. Исторические операции содержат собственный снимок курса.\n\n';
  for (const c of allCurrencies) {
    text += 'Сбережения ' + c + ': ' + (s.savings[c] ?? 'не указаны') + '\n';
  }
  if (s.budget) text += '\nБЮДЖЕТ: ' + s.budget.amount + ' ' + s.budget.currency + '\nПериод: ' + s.budget.start + ' — ' + s.budget.end + '\nЭкономия: ' + (s.budget.policy === 'spread' ? 'распределять' : 'резерв') + '\n';
  text +=
    'Дата сбережений: ' +
    (s.savingsDate || 'не указана') +
    '\nТекущие курсы: ' +
    JSON.stringify(s.rates) +
    '\n\nКАТЕГОРИИ\n';
  for (const c of s.categories)
    text += c.id + ' | ' + c.name + (c.archived ? ' [архив]' : '') + '\n';
  text += '\nОПЕРАЦИИ (все периоды)\n';
  for (const e of [...s.entries].sort((a, b) => a.date.localeCompare(b.date)))
    text +=
      [
        e.date,
        e.kind === 'expense' ? 'РАСХОД' : 'ДОХОД',
        e.amount + ' ' + e.currency,
        cat.get(e.category),
        JSON.stringify(e.note),
        'id=' + e.id,
        'чек=' + e.group,
        'курсы=' + JSON.stringify(e.rates),
      ].join(' | ') + '\n';
  text +=
    '\nИСХОДНЫЕ ДАННЫЕ JSON — все поля для анализа и восстановления\n' +
    JSON.stringify(s, null, 2);
  return text;
}
