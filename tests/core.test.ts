import {transactionDisplay} from '../lib/transaction-edit';
import {entriesForBudget} from '../lib/finance';
import {today} from '../lib/finance';
import {shiftDate} from '../lib/finance';
import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {
  calculate,
  convert,
  exportText,
  initialState,
  parseVoice,
  receiptCandidates,
  splitAmounts,
  sumEntries,
  validateState,
  validDate,
  daysBetween,
  type Entry,
} from '../lib/finance';
import { loadState, saveState } from '../lib/storage';
import { parseSingleVoice } from '../lib/finance';
import { groupReceipt } from '../lib/receipt';
import worker from '../server/worker';
test('single-category voice never silently drops later amounts', () => {
  const cats = initialState().categories;
  assert.throws(
    () =>
      parseSingleVoice(
        'Купил на 150 бат выпивки и на 200 бат еды, ещё 30 бат на разное',
        cats,
      ),
    /одну итоговую/,
  );
  assert.equal(
    parseSingleVoice('Потратил двести пятьдесят бат', cats).amount,
    250,
  );
  assert.equal(parseSingleVoice('2 кофе за 150 бат', cats).amount, 150);
  assert.equal(parseSingleVoice('7 eleven на 150 бат', cats).amount, 150);
  assert.throws(() => parseSingleVoice('100 и 200', cats));
});
test('receipt writes one exact total per category and merges edited duplicate categories', () => {
  const cats = initialState().categories;
  const r = parseReceipt(
    'MILK 0.10\nBREAD 0.20\nLEO BEER 65.00\nTOTAL 65.30',
    cats,
  );
  const g = groupReceipt(r, cats);
  assert.equal(g.items.length, 2);
  assert.equal(g.items[0].amount, 0.3);
  assert.equal(g.items[0].name, cats[0].name);
  const merged = groupReceipt(
    { ...g, items: g.items.map((i) => ({ ...i, category: 'cat-0' })) },
    cats,
  );
  assert.equal(merged.items.length, 1);
  assert.equal(merged.items[0].amount, 65.3);
});
test('AI endpoint denies anonymous requests and keeps server secret out of status', async () => {
  const env = {
    AI_ACCESS_TOKEN: 'private-access',
    GEMINI_API_KEY: 'server-only-key',
  };
  const denied = await worker.fetch(
    new Request('https://app.test/api/analyze'),
    env,
  );
  assert.equal(denied.status, 401);
  const ok = await worker.fetch(
    new Request('https://app.test/api/analyze', {
      headers: { Authorization: 'Bearer private-access' },
    }),
    env,
  );
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ready: true });
  const bad = await worker.fetch(
    new Request('https://app.test/api/analyze', {
      method: 'POST',
      headers: { Authorization: 'Bearer private-access' },
      body: '{}',
    }),
    env,
  );
  assert.equal(bad.status, 400);
});
import {
  validateAIReceipt,
  configureGemini,
  analyzeGemini,
  encodeWav,
} from '../lib/gemini';

test('AI receipt preserves translations, all categories and does not hide a total mismatch', () => {
  const parsed = validateAIReceipt(
    {
      currency: 'THB',
      date: '2026-09-07',
      total: 150,
      warnings: [],
      items: [
        {
          name: 'Молоко',
          original: 'นมสด',
          amount: 50,
          category: 'cat-0',
          review: false,
        },
        {
          name: 'Пиво',
          original: 'LEO BEER',
          amount: 65,
          category: 'cat-16',
          review: false,
        },
        {
          name: 'Средство для посуды',
          original: 'Dishwash',
          amount: 30,
          category: 'cat-17',
          review: false,
        },
      ],
    },
    initialState().categories,
  );
  assert.equal(parsed.receipt.items.length, 3);
  assert.equal(parsed.receipt.items[0].original, 'นมสด');
  assert.equal(parsed.receipt.items[1].category, 'cat-16');
  assert.equal(
    parsed.receipt.items.reduce((n, i) => n + i.amount, 0),
    145,
  );
  assert.equal(parsed.receipt.total, 150);
  assert.equal(new Set(parsed.receipt.items.map((i) => i.id)).size, 3);
  const unknown = validateAIReceipt(
    {
      currency: 'THB',
      date: '2026-09-07',
      total: 10,
      items: [
        {
          name: 'Товар',
          original: 'X',
          amount: 10,
          category: 'invented',
          review: false,
        },
      ],
    },
    initialState().categories,
  );
  assert.equal(unknown.receipt.items[0].review, true);
  assert.equal(unknown.receipt.items[0].category, 'cat-15');
  assert.throws(() =>
    validateAIReceipt(
      {
        currency: 'THB',
        total: 10,
        items: [{ name: 'X', original: 'X', amount: -10 }],
      },
      initialState().categories,
    ),
  );
});
test('audio encoder writes valid mono 16kHz PCM WAV with clipped samples', () => {
  const b = encodeWav(new Float32Array([-2, 0, 2])),
    v = new DataView(b);
  assert.equal(new TextDecoder().decode(b.slice(0, 4)), 'RIFF');
  assert.equal(v.getUint32(24, true), 16000);
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(40, true), 6);
  assert.equal(v.getInt16(44, true), -32768);
  assert.equal(v.getInt16(48, true), 32767);
});
test('Gemini adapter sends only selected content and handles quota and incomplete output', async () => {
  const originalFetch = globalThis.fetch;
  configureGemini('unit-test-key', 'models/test-flash');
  try {
    globalThis.fetch = async (url, opts) => {
      assert.equal(
        String(url),
        'https://generativelanguage.googleapis.com/v1beta/models/test-flash:generateContent',
      );
      assert.ok(!String(url).includes('unit-test-key'));
      const body = JSON.parse(String(opts?.body));
      assert.match(body.contents[0].parts[0].text, /Бензин 300/);
      assert.equal(body.entries, undefined);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      currency: 'THB',
                      date: '2026-09-07',
                      total: 300,
                      items: [
                        {
                          name: 'Бензин',
                          original: 'Бензин',
                          amount: 300,
                          category: 'cat-5',
                          review: false,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );
    };
    const r = await analyzeGemini(
      { text: 'Бензин 300' },
      initialState().categories,
    );
    assert.equal(r.receipt.items[0].category, 'cat-5');
    globalThis.fetch = async () => new Response('', { status: 429 });
    await assert.rejects(
      () => analyzeGemini({ text: 'X' }, initialState().categories),
      /Лимит/,
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] }),
      );
    await assert.rejects(
      () => analyzeGemini({ text: 'X' }, initialState().categories),
      /не закончил/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    configureGemini('');
  }
  await assert.rejects(
    () => analyzeGemini({ text: 'X' }, initialState().categories),
    /Подключите/,
  );
});
const rate = {
  THB: 1,
  USD: 35,
  UAH: 0.85,
  date: '2026-09-06',
  source: 'test fixture, not real exchange rate',
};
const entry: Entry = {
  id: 'entry-1',
  group: 'group-1',
  amount: 850,
  currency: 'THB',
  kind: 'expense',
  category: 'cat-0',
  date: '2026-09-06',
  note: 'Покупка',
  rates: rate,
  created: '2026-09-06T09:00:00Z',
};
test('calculator respects precedence, commas and rejects code/zero division', () => {
  assert.equal(calculate('850 − 200'), 650);
  assert.equal(calculate('(100 + 20) × 2 ÷ 3'), 80);
  assert.equal(calculate('0,1+0,2'), 0.3);
  assert.throws(() => calculate('1/0'));
  assert.throws(() => calculate('alert(1)'));
  assert.throws(() => calculate('5+'));
});
test('split never double counts and uses cents', () => {
  assert.equal(splitAmounts(850, [200]), 650);
  assert.equal(splitAmounts(0.3, [0.1]), 0.2);
  assert.throws(() => splitAmounts(850, [850]));
  assert.throws(() => splitAmounts(850, [-10]));
  assert.throws(() => splitAmounts(850, [900]));
});
test('currency conversion and incomplete rates', () => {
  assert.equal(convert(35, 'THB', 'USD', rate), 1);
  assert.equal(convert(100, 'UAH', 'THB', rate), 85);
  assert.equal(convert(10, 'USD', 'USD', { ...rate, USD: null }), 10);
  assert.equal(convert(10, 'USD', 'THB', { ...rate, USD: null }), null);
  assert.deepEqual(
    sumEntries(
      [
        entry,
        {
          ...entry,
          id: 'other',
          currency: 'USD',
          rates: { ...rate, USD: null },
        },
      ],
      'THB',
    ),
    { total: 850, missing: 1 },
  );
});
test('voice parses numeric and Russian spoken amounts', () => {
  const cats = initialState().categories;
  assert.equal(parseVoice('Обед в кафе 250 бат', cats).amount, 250);
  assert.equal(
    parseVoice('Обед в кафе двести пятьдесят бат', cats).amount,
    250,
  );
  assert.equal(parseVoice('Бензин 300 бат', cats).category, 'cat-5');
  assert.equal(parseVoice('Подарок 20 долларов', cats).currency, 'USD');
});
test('receipt prioritizes total, ignores cash/change', () => {
  const c = receiptCandidates(
    'SUBTOTAL 800.00\nGrand Total 850.00\nCASH 1000.00\nCHANGE 150.00',
  );
  assert.equal(c[0].amount, 850);
  assert.ok(!c.some((c) => c.amount === 1000 || c.amount === 150));
});
test('dates and backup validation reject malformed data', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(daysBetween('2026-09-01', '2026-09-06'), 6);
  assert.throws(() =>
    validateState({ ...initialState(), entries: [{ ...entry, amount: -5 }] }),
  );
  assert.throws(() =>
    validateState({ ...initialState(), entries: [entry, entry] }),
  );
  assert.throws(() =>
    validateState({
      ...initialState(),
      entries: [{ ...entry, category: 'absent' }],
    }),
  );
});
test('full text includes all operations and round-trips exact JSON', () => {
  const s = {
    ...initialState(),
    entries: [entry],
    rates: rate,
    savings: { THB: 200, USD: 100, UAH: null },
  };
  const text = exportText(s);
  assert.match(text, /850 THB/);
  assert.match(text, /Продукты в магазинах/);
  const marker =
    'ИСХОДНЫЕ ДАННЫЕ JSON — все поля для анализа и восстановления\n';
  assert.deepEqual(validateState(JSON.parse(text.split(marker)[1])), s);
});
test('IndexedDB persists, serializes writes, rejects stale tabs without losing data', async () => {
  const original = await loadState();
  assert.equal(original.entries.length, 0);
  const saved = await saveState(
    { ...original, entries: [entry] },
    original.revision,
  );
  assert.equal(saved.revision, 1);
  assert.deepEqual((await loadState()).entries, [entry]);
  await assert.rejects(
    () => saveState({ ...original, entries: [] }, 0),
    /другой вкладке/,
  );
  assert.equal((await loadState()).entries.length, 1);
  const deleted = await saveState({ ...saved, entries: [] }, 1);
  assert.equal(deleted.revision, 2);
  assert.equal((await loadState()).entries.length, 0);
});

import { parseReceipt, reconcileItems, classifyItem } from '../lib/receipt';
import { loadSnapshots } from '../lib/storage';
import { appendEntries } from '../lib/storage';
import { entryTime } from '../lib/timeline';
import { receiptFetch } from '../lib/gemini';
import {budgetStatus,validBudget,type Budget} from '../lib/budget';
const budget:Budget={amount:100,currency:'THB',start:'2026-11-01',end:'2026-11-10',policy:'spread',quick:['cat-0','cat-1','cat-fun']};
test('daily budget redistributes underspending and overspending without counting income',()=>{
 const spend={...entry,date:'2026-11-01',amount:20,currency:'THB' as const};
 assert.equal(budgetStatus(budget,[],budget.start).todayLeft,10);
 const d=budgetStatus(budget,[spend],budget.start);assert.equal(d.todayLeft,-10);assert.equal(d.totalLeft,80);assert.equal(d.future,8.88);
 assert.equal(budgetStatus(budget,[spend],'2026-11-02').allowance,8.88);
 assert.equal(budgetStatus(budget,[],'2026-11-02').allowance,11.11);
 assert.equal(budgetStatus(budget,[{...spend,kind:'income'}],'2026-11-02').totalLeft,100);
});
test('reserve mode isolates past savings and switching to spread releases them',()=>{
 const d=budgetStatus({...budget,policy:'reserve'},[],'2026-11-02');assert.equal(d.reserve,10);assert.equal(d.allowance,10);assert.equal(d.totalLeft,100);assert.equal(d.spendable,90);
 assert.equal(budgetStatus(budget,[],'2026-11-02').reserve,0);
});
test('last day keeps exact cents; expired and future budgets are explicit',()=>{
 const d=budgetStatus(budget,[],'2026-11-10');assert.equal(d.todayLeft,100);assert.equal(d.futureDays,0);
 assert.equal(budgetStatus(budget,[],'2026-11-11').active,false);
 assert.equal(budgetStatus(budget,[],'2026-10-31').active,false);
 assert.equal(validBudget({...budget,start:'2026-11-11'}),false);
 assert.equal(validBudget({...budget,amount:NaN}),false);
 const state={...initialState(),budget};assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))).budget,budget);
 assert.equal(validateState({...state,budget:{...budget,amount:-1}}).budget?.amount,-1);
});
test('budget flags missing FX rather than silently showing a usable balance',()=>{
 const d=budgetStatus(budget,[{...entry,date:'2026-11-01',currency:'USD',rates:{THB:1,USD:null,UAH:null,date:'2026-11-01',source:'test'}}],'2026-11-01');assert.equal(d.missing,1);
});

test('a whole receipt persists after reload, keeps product names and retries do not duplicate it', async () => {
  const rows = [
    {...entry,id:'receipt-food',group:'receipt-test',amount:200,note:'Молоко — 100 ฿\nХлеб — 100 ฿'},
    {...entry,id:'receipt-beer',group:'receipt-test',category:'cat-16',amount:150,note:'Пиво — 150 ฿'},
  ];
  await appendEntries(rows);
  await appendEntries(rows);
  const loaded=await loadState();
  assert.deepEqual(loaded.entries.filter(e=>e.group==='receipt-test'),rows);
  assert.equal(loaded.entries.filter(e=>e.group==='receipt-test').reduce((s,e)=>s+e.amount,0),350);
});
test('daily time uses Bangkok and does not invent times for backdated entries',()=>{
  assert.equal(entryTime({...entry,date:'2026-09-07',created:'2026-09-07T11:25:00Z'}),'18:25');
  assert.equal(entryTime({...entry,date:'2026-09-06',created:'2026-09-07T11:25:00Z'}),null);
});
test('recognition retries one network interruption',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{if(++calls===1)throw new TypeError('Load failed');return new Response('{}');};
  try {assert.equal((await receiptFetch('/api/analyze',{})).status,200);assert.equal(calls,2);}
  finally {globalThis.fetch=original;}
});

test('receipt keeps original names, reads all line totals and separates alcohol/household', () => {
  const receipt = parseReceipt(
    '7 ELEVEN\nMILK 2 x 25.00 50.00\nLEO BEER 65.00\nDishwash liquid 30.00\nGrand Total 145.00\nCash 200.00\nChange 55.00',
    initialState().categories,
  );
  assert.equal(receipt.items.length, 3);
  assert.equal(receipt.items[0].name, 'MILK');
  assert.equal(receipt.items[0].amount, 50);
  assert.equal(receipt.items[1].category, 'cat-16');
  assert.equal(receipt.items[2].category, 'cat-17');
  assert.equal(receipt.total, 145);
  assert.equal(
    receipt.items.reduce((s, i) => s + i.amount, 0),
    145,
  );
});
test('receipt preserves Thai text and flags unidentified products', () => {
  const r = parseReceipt(
    'นมสด 45.00\nสินค้าXYZ 70.00\nยอดสุทธิ 115.00',
    initialState().categories,
  );
  assert.equal(r.items[0].name, 'นมสด');
  assert.equal(r.items[0].category, 'cat-0');
  assert.equal(r.items[1].review, true);
  assert.equal(r.items[1].category, 'cat-15');
});
test('receipt reconciles discounts to exact cents only on explicit action', () => {
  const r = parseReceipt(
    'MILK 50.00\nBREAD 30.00\nDiscount 5.00\nTOTAL 75.00',
    initialState().categories,
  );
  assert.equal(
    r.items.reduce((s, i) => s + i.amount, 0),
    80,
  );
  const reconciled = reconcileItems(r.items, 75);
  assert.equal(
    reconciled.reduce((s, i) => s + Math.round(i.amount * 100), 0),
    7500,
  );
  assert.equal(reconciled[0].sourceAmount, 50);
  assert.throws(() => reconcileItems(r.items, 0));
});
test('a deletion leaves a recoverable local snapshot', async () => {
  const snapshots = await loadSnapshots();
  assert.ok(
    snapshots.some((s) => s.state.entries.some((e) => e.id === 'entry-1')),
  );
});

import {checkpointBeforeUpdate as updateCheckpoint,loadSnapshots as updateSnapshots} from '../lib/storage';
import {checkUpdatePage} from '../lib/app-update';
test('update checkpoint preserves the complete ledger and revision',async()=>{
 const before=await loadState();await updateCheckpoint();
 assert.deepEqual(await loadState(),before);
 assert.ok((await updateSnapshots()).some(s=>JSON.stringify(s.state)===JSON.stringify(before)));
});
test('update verifies fresh app HTML and refuses failed or login responses',async()=>{
 let policy='';await checkUpdatePage((async (_url:any,options:any)=>{policy=options.cache;return new Response('<div id="root"></div><script src="/assets/main.js"></script>')}) as typeof fetch);assert.equal(policy,'no-store');
 await assert.rejects(()=>checkUpdatePage((async()=>new Response('offline',{status:503})) as typeof fetch));
 await assert.rejects(()=>checkUpdatePage((async()=>new Response('<html>Sign in</html>')) as typeof fetch));
});

import './paired.test';
import {savingsBalance} from '../lib/savings-ledger';
test('savings checkpoint subtracts only later expenses and keeps originals',()=>{
 const data={...initialState(),savings:{THB:100,USD:null,UAH:null},savingsCheckpoint:'2026-11-03T00:00:00Z'};
 const row={id:'future-save',group:'future-save',category:'cat-0',kind:'expense',amount:30,currency:'THB',date:'2026-11-03',created:'2026-11-03T01:00:00Z',note:'',rates:data.rates} as Entry;
 const state={...data,entries:[{...row,id:'old',created:'2026-11-02T01:00:00Z'},row]};
 assert.equal(savingsBalance(state,'THB'),70);assert.equal(state.savings.THB,100);
 assert.equal(savingsBalance({...state,entries:[...state.entries,{...row,id:'income',kind:'income',amount:10}]},'THB'),80);
 assert.equal(savingsBalance({...state,savingsCheckpoint:'2026-11-03T02:00:00Z'},'THB'),100);
 assert.equal(savingsBalance({...state,entries:[{...row,currency:'USD'}],rates:{...state.rates,USD:null}},'THB'),null);
});

test('signed savings and goal survive backup roundtrip without altering ledger',()=>{const s=initialState();s.savings.THB=-200;s.savingsGoal={amount:1000,daily:50,currency:'THB'};const restored=validateState(JSON.parse(JSON.stringify(s)));assert.equal(restored.savings.THB,-200);assert.deepEqual(restored.savingsGoal,s.savingsGoal);assert.deepEqual(restored.entries,s.entries);assert.equal(savingsBalance(restored,'THB'),-200);assert.throws(()=>validateState({...s,savingsGoal:{...s.savingsGoal,daily:0}}));});

import {curatedPalettes,contrast,nextCuratedPalette} from '../lib/curated-palettes';
test('curated palette cycle covers every pair without repeats; contrast survives matte surfaces',()=>{
 const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
 for(const p of curatedPalettes){assert.ok(contrast(p.accent,p.background)>=4.5);assert.ok(contrast('#ffffff',p.accent)>=3);const surface=mix(p.background,'#fffaff',.08);assert.ok(contrast(p.accent,surface)>=4.5);const reflected=mix(mix(p.background,'#ffffff',.03),p.accent,.08);assert.ok(contrast(p.accent,reflected)>=4.5)}
 let current={accent:'#ed2946',background:'#09090b'},bag:number[]=[],seen=new Set<string>();for(let i=0;i<curatedPalettes.length;i++){const next=nextCuratedPalette(current,bag,()=>.37);assert.notDeepEqual(next.palette,current);assert.ok(!seen.has(next.palette.accent));seen.add(next.palette.accent);current=next.palette;bag=next.remaining}assert.equal(seen.size,curatedPalettes.length);assert.notDeepEqual(nextCuratedPalette(current,bag).palette,current);
});

import {hexToHsv,hsvToHex} from '../lib/color-field';
test('touch color field roundtrips muted colors, endpoints and palette colors',()=>{for(const hex of ['#000000','#ffffff','#ed2946','#09090b','#a39178',...curatedPalettes.flatMap(p=>[p.accent,p.background])]){const h=hexToHsv(hex);assert.equal(hsvToHex(h.h,h.s,h.v),hex)}assert.equal(hsvToHex(0,1,1),'#ff0000');assert.equal(hsvToHex(120,1,1),'#00ff00');assert.equal(hsvToHex(240,1,1),'#0000ff');assert.equal(hsvToHex(360,1,1),'#ff0000');assert.equal(hsvToHex(180,0,1),'#ffffff');assert.equal(hsvToHex(180,1,0),'#000000')});

import {parseRateResponse} from '../lib/rate-providers';
test('custom FX API normalizes USD and THB bases, supports value maps and rejects incomplete responses',()=>{assert.equal(parseRateResponse({base:'USD',date:'2026-11-04',rates:{THB:34,UAH:42}},'custom').USD,34);assert.equal(parseRateResponse({base_code:'THB',date:'2026-11-04',conversion_rates:{USD:1/34,UAH:42/34}},'custom').USD,34);assert.equal(parseRateResponse({meta:{base_currency:'USD'},date:'2026-11-04',data:{THB:{value:34},UAH:{value:42}}},'custom').UAH,34/42);assert.throws(()=>parseRateResponse({base:'EUR',rates:{THB:34,UAH:42,USD:1}},'custom'));assert.throws(()=>parseRateResponse({base:'USD',rates:{THB:34}},'custom'));assert.throws(()=>parseRateResponse({base:'USD',rates:{THB:-1,UAH:42}},'custom'));const state=initialState();state.rateProvider='custom';state.rateHistory=[{rates:state.rates,updated:'2026-11-04T00:00:00Z'}];assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))).rateHistory,state.rateHistory);assert.throws(()=>validateState({...state,rateHistory:[{rates:state.rates,updated:'bad'}]}));});

import {editTransaction,reportBudgetEntries} from '../lib/transaction-edit';
test('transaction category-only edit preserves original currency, rate snapshot and timestamp',()=>{const data=initialState();data.rates={THB:1,USD:34,UAH:0.8,date:'2026-11-01',source:'test'};data.display='THB';const e={id:'edit',group:'edit',amount:10,currency:'USD',category:'cat-0',kind:'expense',date:'2026-11-01',created:'2026-11-01T03:00:00Z',note:'original',rates:{...data.rates,USD:33}} as Entry;const unchanged=editTransaction(e,data,'340','cat-1','2026-11-01T10:00','2026-11-01T10:00');assert.equal(unchanged.amount,10);assert.equal(unchanged.currency,'USD');assert.equal(unchanged.rates.USD,33);assert.equal(unchanged.created,e.created);assert.equal(unchanged.note,'original');const changed=editTransaction(e,data,'350','cat-1','2026-11-01T10:00','2026-11-01T10:00');assert.equal(changed.amount,350);assert.equal(changed.currency,'THB');assert.equal(changed.rates.USD,34);assert.throws(()=>editTransaction(e,data,'0','cat-1','2026-11-01T10:00','2026-11-01T10:00'))});
test('analysis scopes all categories to tracked budget and retains general fallback',()=>{const d=initialState();d.budget={amount:1000,currency:'THB',start:'2026-11-01',end:'2026-11-30',quick:[],policy:'spread'};d.categoryBudgets=[{...d.budget,id:'food',name:'Food',categories:['cat-0']}];const row={id:'a',group:'a',amount:10,currency:'THB',category:'cat-0',kind:'expense',date:'2026-11-01',created:'2026-11-01T03:00:00Z',note:'',rates:d.rates,budgetId:'food'} as Entry;d.entries=[row,{...row,id:'b',category:'cat-1',budgetId:'main'},{...row,id:'c',date:'2026-10-01',budgetId:'main'}];assert.deepEqual(reportBudgetEntries(d,'food').map(e=>e.id),['a']);assert.deepEqual(reportBudgetEntries(d,'all').map(e=>e.id),['a','b','c']);assert.deepEqual(reportBudgetEntries(d,'removed').map(e=>e.id),[])});

import {paletteSlots,refreshPaletteSlots} from '../lib/curated-palettes';
test('fixed palette slots retain edits, fill exactly ten and refresh only from approved pairs',()=>{const custom={accent:'#123456',background:'#080808'};const slots=paletteSlots([custom]);assert.equal(slots.length,10);assert.deepEqual(slots[0],custom);assert.equal(paletteSlots().length,10);const fresh=refreshPaletteSlots(()=>.4);assert.equal(fresh.length,10);assert.equal(new Set(fresh.map(c=>c.accent+c.background)).size,10);assert.ok(fresh.every(c=>curatedPalettes.some(p=>p.accent===c.accent&&p.background===c.background)));assert.deepEqual(slots[0],custom)});

import {deficitVisibility} from '../lib/budget';
test('deficit fade counts purchases after daily limit, caps at five and treats split receipt as one',()=>{const b={amount:100,currency:'THB',start:'2026-11-01',end:'2026-11-01',policy:'spread',quick:[]} as Budget;const row=(i:number,amount:number,group='g'+i)=>({id:'fade'+i,group,amount,currency:'THB',category:'cat-0',kind:'expense',date:'2026-11-01',created:'2026-11-01T0'+i+':00:00Z',note:'',rates:initialState().rates}) as Entry;const entries=[row(0,100)];assert.equal(deficitVisibility(b,entries,'2026-11-01').opacity,1);for(let i=1;i<=5;i++){entries.push(row(i,1));const s=deficitVisibility(b,entries,'2026-11-01');assert.equal(s.count,i);assert.ok(Math.abs(s.opacity-Math.max(.05,1-i*.19))<.0001)}entries.push(row(6,1));assert.equal(deficitVisibility(b,entries,'2026-11-01').opacity,.05);assert.equal(deficitVisibility(b,[row(0,90),row(1,6,'receipt'),row(2,6,'receipt')],'2026-11-01').count,1);assert.equal(deficitVisibility(b,entries,'2026-11-02').opacity,1);assert.equal(deficitVisibility(b,[row(0,90)],'2026-11-01').opacity,1)});

import {inferVoiceCategory} from '../lib/voice-category';import {refreshOtherPalettes} from '../lib/curated-palettes';
test('voice category matches explicit names and purchase phrases without forcing unknown speech',()=>{const cats=initialState().categories;assert.equal(inferVoiceCategory('В кафе потратил 150 бат',cats),'cat-1');assert.equal(inferVoiceCategory('Купил пиво на 100 бат',cats),'cat-16');assert.equal(inferVoiceCategory('Продукты в магазинах 200 бат',cats),'cat-0');assert.equal(inferVoiceCategory('Потратил 50 бат',cats),null);assert.equal(inferVoiceCategory('В кафе 20 бат',cats.map(c=>c.id==='cat-1'?{...c,archived:true}:c)),null)});
test('palette refresh preserves custom slot and whole baht display leaves original amounts intact',()=>{const custom={accent:'#ab1234',background:'#08080a'},slots=paletteSlots([custom]);const next=refreshOtherPalettes(slots,()=>.2);assert.equal(next.length,10);assert.deepEqual(next[0],custom);assert.equal(new Set(next.map(c=>c.accent+c.background)).size,10);assert.equal(money(10.6,'THB'),'11 ฿');assert.equal(money(10.6,'USD'),'10,6 $')});

import {money} from '../lib/finance';

import {quickCategories,orderedCategories} from '../lib/category-priority';
test('global three-category priority survives backups and orders all categories without changing originals',()=>{const data=initialState();data.quickCategories=['cat-5','cat-1','cat-10'];assert.deepEqual(quickCategories(data),data.quickCategories);const ordered=orderedCategories(data.categories,quickCategories(data));assert.deepEqual(ordered.slice(0,3).map(c=>c.id),data.quickCategories);assert.equal(data.categories[0].id,'cat-0');assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))).quickCategories,data.quickCategories);assert.throws(()=>validateState({...data,quickCategories:['cat-1','cat-1']}));assert.deepEqual(quickCategories({...data,categories:data.categories.map(c=>c.id==='cat-5'?{...c,archived:true}:c)}),['cat-1','cat-10'])});

import {currencyInput,rateInput} from '../lib/currency-input';
test('whole-baht manual input rejects fractions without reducing FX rate precision',()=>{assert.equal(currencyInput('-20','THB'),-20);assert.equal(currencyInput('157-7','THB'),150);assert.throws(()=>currencyInput('100.5','THB'));assert.throws(()=>currencyInput('100,5','THB'));assert.throws(()=>currencyInput('1/2','THB'));assert.equal(currencyInput('10.5','USD'),10.5);assert.equal(rateInput('0,7389894722859454'),.7389894722859454);assert.equal(rateInput('33.757532'),33.757532);assert.throws(()=>rateInput('0'));assert.throws(()=>rateInput('not a number'))});

import {recordRateUpdate} from '../lib/rate-history';import {amountFontSize} from '../lib/amount-fit';
test('every successful FX refresh records a timestamp even for unchanged rates and survives export',()=>{const before=initialState(),first=recordRateUpdate(before,before.rates,'exchange','2026-11-04T00:00:00Z'),second=recordRateUpdate(first,first.rates,'exchange','2026-11-04T00:01:00Z');assert.equal(second.rateHistory?.length,2);assert.equal(second.rateHistory?.[1].updated,'2026-11-04T00:01:00Z');assert.deepEqual(second.rateHistory?.[0].rates,before.rates);assert.equal(before.rateHistory,undefined);assert.deepEqual(validateState(JSON.parse(JSON.stringify(second))).rateHistory,second.rateHistory)});
test('amount fitting reduces measured text width to available one-line space',()=>{for(const width of [40,70,120,180])for(const measured of [30,100,300,900]){const size=amountFontSize(width,measured);assert.ok(measured*size/50<=width);assert.ok(size<=50&&size>=1)}assert.equal(amountFontSize(180,100),50);assert.ok(amountFontSize(60,300)<amountFontSize(120,300))});

// Language changes must preserve money, user text and portable backups.
import {setLanguage,getLanguage,tr,categoryLabel,localeCode,speechLocale,subscribeLanguage} from '../lib/i18n';
import translations from '../lib/translations.json';
import {normalizeSpeech} from '../lib/speech-normalize';
test('all four locales translate dynamic values and preserve custom category names',()=>{const before=initialState();const snapshot=JSON.stringify(before);let events=0;const unsubscribe=subscribeLanguage(()=>events++);for(const lang of ['en','th','uk','ru'] as const){setLanguage(lang);assert.equal(getLanguage(),lang);assert.ok(tr('Потрачено за сегодня: {0}',['150']).includes('150'));assert.equal(categoryLabel({id:'custom',name:'My personal café'}),'My personal café');assert.equal(JSON.stringify(before),snapshot);assert.ok(localeCode().startsWith(lang));assert.ok(speechLocale().startsWith(lang));}unsubscribe();assert.equal(events,4)});
test('all translated templates retain their substitution parameters',()=>{for(const [key,values]of Object.entries(translations)){const placeholders=(key.match(/\{\d+\}/g)||[]).sort();for(const [lang,value]of Object.entries(values)){assert.ok(value.trim(),lang+': '+key);assert.deepEqual((value.match(/\{\d+\}/g)||[]).sort(),placeholders,lang+': '+key)}}});
test('locale survives JSON export and optional locale preserves legacy backups',()=>{const s=initialState();assert.equal(validateState(s).language,undefined);for(const language of ['en','th','uk','ru'] as const){s.language=language;assert.equal(validateState(JSON.parse(JSON.stringify(s))).language,language)}assert.throws(()=>validateState({...s,language:'xx'}));setLanguage('ru')});
test('built-in categories translate but renamed built-ins are preserved',()=>{setLanguage('en');assert.equal(categoryLabel(initialState().categories[0]),'Groceries');assert.equal(categoryLabel({id:'cat-0',name:'My groceries budget'}),'My groceries budget');setLanguage('th');assert.equal(categoryLabel(initialState().categories[0]),'ของกินจากร้านค้า');setLanguage('uk');assert.equal(categoryLabel(initialState().categories[0]),'Продукти в магазинах');setLanguage('ru')});
test('English Thai and Ukrainian spoken amounts retain a single expense',()=>{for(const phrase of ['one hundred fifty baht groceries','หนึ่งร้อยห้าสิบบาท ซื้อของกิน','сто пятдесят батів продукти']){assert.equal(parseSingleVoice(phrase,initialState().categories).amount,150);assert.equal(parseSingleVoice(phrase,initialState().categories).currency,'THB')}assert.equal(parseSingleVoice('๓๐๐ บาท',initialState().categories).amount,300);assert.equal(parseSingleVoice('twenty dollars',initialState().categories).currency,'USD');assert.equal(parseSingleVoice('двісті гривень',initialState().categories).currency,'UAH');assert.throws(()=>parseSingleVoice('150 baht groceries and 200 baht cafe',initialState().categories));assert.equal(normalizeSpeech('twenty one baht'),'21 бат')});
test('category inference follows multilingual speech',()=>{const cats=initialState().categories;for(const phrase of ['groceries 150 baht','ซื้อของกิน 150 บาท','продукти 150 батів'])assert.equal(inferVoiceCategory(phrase,cats),'cat-0');for(const phrase of ['coffee 50 baht','กาแฟ 50 บาท','кава 50 батів'])assert.equal(inferVoiceCategory(phrase,cats),'cat-1')});

import {appShareUrl,shareApplication} from '../lib/app-share';
test('sharing strips query, hash and personal connection tokens',async()=>{const url='https://example.com/?ai_connect=private-code&app_update=12#secret';assert.equal(appShareUrl(url),'https://example.com/');let payload:unknown;assert.equal(await shareApplication(url,{share:async data=>{payload=data}}),'shared');assert.deepEqual(payload,{url:'https://example.com/'});let copied='';assert.equal(await shareApplication(url,{clipboard:{writeText:async text=>{copied=text}}}),'copied');assert.equal(copied,'https://example.com/');assert.equal(await shareApplication(url,{}),'manual')});
test('sharing cancellation does not copy anything and unavailable sharing falls back safely',async()=>{let copies=0;assert.equal(await shareApplication('https://example.com/',{share:async()=>{throw Object.assign(new Error(),{name:'AbortError'})},clipboard:{writeText:async()=>{copies++}}}),'cancelled');assert.equal(copies,0);assert.equal(await shareApplication('https://example.com/',{share:async()=>{throw Error('unsupported')},clipboard:{writeText:async()=>{copies++}}}),'copied');assert.equal(copies,1);assert.equal(await shareApplication('https://example.com/',{clipboard:{writeText:async()=>{throw Error('denied')}}}),'manual')});

import {budgetDailyPreview} from '../lib/budget-preview';test('budget preview uses the full inclusive period and updates amounts without modifying a budget',()=>{assert.equal(budgetDailyPreview('3000','THB','2026-11-01','2026-11-30'),100);assert.equal(budgetDailyPreview('3000+300','THB','2026-11-01','2026-11-30'),110);assert.equal(budgetDailyPreview('125','USD','2026-11-04','2026-11-04'),125);assert.equal(budgetDailyPreview('3000','THB','2026-11-30','2026-11-01'),null);assert.equal(budgetDailyPreview('','THB','2026-11-01','2026-11-30'),null);assert.equal(budgetDailyPreview('30.5','THB','2026-11-01','2026-11-30'),null);assert.equal(budgetDailyPreview('3000','THB','bad','2026-11-30'),null)});

import {applyCurrencyList,visibleCurrencies} from '../lib/currency-settings';
test('currency list defaults, add, hide and replace retain records and hidden savings',()=>{const old=initialState();assert.deepEqual(visibleCurrencies(old),['THB','USD','UAH']);const expanded=applyCurrencyList({...old,savings:{...old.savings,EUR:20},rates:{...old.rates,USD:34,UAH:.8,EUR:37}},['THB','EUR'],'EUR');assert.equal(validateState(JSON.parse(JSON.stringify(expanded))).display,'EUR');const hidden=applyCurrencyList(expanded,['USD'],'USD');assert.equal(hidden.savings.EUR,20);assert.deepEqual(hidden.entries,old.entries);assert.equal(savingsBalance(hidden,'THB'),740);assert.throws(()=>applyCurrencyList(old,[],'THB'));assert.throws(()=>applyCurrencyList(old,['THB','THB'],'THB'));assert.throws(()=>validateState({...old,enabledCurrencies:['USD']}));assert.equal(convert(100,'EUR','THB',expanded.rates),3700);assert.equal(convert(1,'THB','EUR',old.rates),null)});
test('API normalizes added currencies while historical snapshots and backup validation remain safe',()=>{const rates=parseRateResponse({base:'USD',rates:{THB:34,UAH:42,EUR:.9,JPY:150},date:'2026-11-04'},'exchange');assert.ok(Math.abs(rates.EUR!-34/.9)<1e-9);assert.ok(Math.abs(rates.JPY!-34/150)<1e-9);const data=initialState();assert.throws(()=>validateState({...data,rates:{...data.rates,EUR:-3}}));const next={...data,display:'EUR' as const,enabledCurrencies:['THB','EUR'] as import('../lib/finance').Currency[],rates};assert.equal(validateState(next).rates.EUR,rates.EUR);assert.equal(data.rates.EUR,undefined);assert.equal(validBudget({amount:100,currency:'EUR',start:'2026-11-01',end:'2026-11-30',policy:'spread',quick:[]}),true)});

import {reportInCurrency} from '../lib/report-currency';test('new report currency uses available current rates without overwriting old snapshots',()=>{const s=initialState();const entry={id:'fx',group:'fx',amount:100,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:'2026-11-04',note:'',created:'2026-11-04T00:00:00Z',rates:s.rates};const current={...s.rates,EUR:40};const projected=reportInCurrency([entry],'EUR',current);assert.equal(sumEntries(projected,'EUR').total,2.5);assert.equal(entry.rates.EUR,undefined);assert.equal(parseSingleVoice('100 евро',s.categories).currency,'EUR');assert.equal(parseSingleVoice('50 GBP',s.categories).currency,'GBP')});

import {dailyExpenses} from '../lib/daily-expenses';import {parseAICredential} from '../lib/ai-credential';import {languagePackExample,validateLanguagePack} from '../lib/language-packs';import {registerLanguagePacks} from '../lib/i18n';
test('daily chart retains empty days, excludes income and out-of-range entries, and preserves originals',()=>{const s=initialState(),rows=[{id:'a',group:'a',amount:10,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:'2026-11-01',note:'',rates:s.rates,created:'2026-11-01T00:00:00Z'},{id:'b',group:'b',amount:30,currency:'THB' as const,kind:'expense' as const,category:'cat-1',date:'2026-11-03',note:'',rates:s.rates,created:'2026-11-03T00:00:00Z'}];const before=JSON.stringify(rows);const result=dailyExpenses([...rows,{...rows[0],kind:'income'}],'THB','2026-11-01','2026-11-04',s.rates);assert.deepEqual(result.map(d=>d.total),[10,0,30,0]);assert.deepEqual(result[1].parts,{});assert.equal(result.length,4);assert.equal(JSON.stringify(rows),before);assert.deepEqual(dailyExpenses(rows,'THB','1900-01-01','9999-12-31',s.rates),[])});
test('credential entry accepts copied connection links and valid non-hex personal codes without exporting them',()=>{const code='personal-access-token-2026';assert.deepEqual(parseAICredential('https://example.com/#connect='+code),{kind:'hosted',value:code});assert.deepEqual(parseAICredential('  '+code+'  '),{kind:'hosted',value:code});assert.equal(parseAICredential('AIza'+'a'.repeat(30)).kind,'google');assert.throws(()=>parseAICredential(''));assert.throws(()=>parseAICredential('https://example.com/'));assert.throws(()=>parseAICredential('bad key with spaces'))});
test('custom language roundtrips backups and missing new labels do not block old packs after an update',()=>{const pack=languagePackExample();validateLanguagePack(pack,true);registerLanguagePacks([pack]);setLanguage(pack.code);assert.equal(tr('Расходы по дням'),pack.translations['Расходы по дням']);const state={...initialState(),language:pack.code,languagePacks:[pack]};assert.equal(validateState(JSON.parse(JSON.stringify(state))).language,pack.code);const old={...pack,translations:{...pack.translations}};delete old.translations['Расходы по дням'];validateLanguagePack(old);assert.throws(()=>validateLanguagePack(old,true));assert.throws(()=>validateLanguagePack({...pack,code:'ru'}));const broken={...pack,translations:{...pack.translations,'Потрачено за сегодня: {0}':'No amount'}};assert.throws(()=>validateLanguagePack(broken,true));setLanguage('ru');registerLanguagePacks([])});

import {connectHosted,disconnectHosted,geminiEnabled} from '../lib/gemini';test('hosted code confirms server readiness and works even when localStorage is unavailable',async()=>{const previous=globalThis.fetch;disconnectHosted();let authorization='';try{globalThis.fetch=async(_url,options)=>{authorization=new Headers(options?.headers).get('Authorization')||'';return Response.json({ready:true})};await connectHosted('https://example.com/#connect=personal-access-token-2026');assert.equal(authorization,'Bearer personal-access-token-2026');assert.equal(geminiEnabled(),true);globalThis.fetch=async()=>Response.json({error:'denied'},{status:401});await assert.rejects(connectHosted('another-personal-token-2026'));}finally{disconnectHosted();globalThis.fetch=previous}});

import {analysisBounds,analysisEntries,previousRange} from '../lib/analysis-periods';import {budgetRemainder} from '../lib/budget-plan';import {acquirePageScrollLock} from '../app/page-scroll-lock';
test('rolling analysis periods end today and compare equal previous intervals',()=>{const s=initialState(),day='2026-11-07';for(const [period,count] of [['today',1],['week',7],['month',30],['year',365]] as const){const range=analysisBounds(period,'','',day,[]);assert.equal(range.end,day);assert.equal(daysBetween(range.start,range.end),count);assert.equal(dailyExpenses([],'THB',range.start,range.end,s.rates).length,count);const previous=previousRange(period,range)!;assert.equal(previous.end,shiftDate(range.start,-1));assert.equal(daysBetween(previous.start,previous.end),count)}const leap=analysisBounds('month','','','2024-02-10',[]);assert.equal(daysBetween(leap.start,leap.end),30);assert.equal(leap.end,'2024-02-10');const all=analysisBounds('all','','',day,[],'2026-11-01');assert.deepEqual(all,{start:'2026-11-01',end:day});assert.equal(previousRange('all',all),null)});
test('analysis category scope can compare earlier periods outside the budget dates',()=>{const s=initialState();const entry={id:'prev',group:'prev',amount:120,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:'2026-10-03',note:'',rates:s.rates,created:'2026-10-03T00:00:00Z',budgetId:'food'};const state={...s,entries:[entry],categoryBudgets:[{id:'food',name:'Food',amount:5000,currency:'THB' as const,start:'2026-11-01',end:'2026-11-30',policy:'spread' as const,quick:[],categories:['cat-0']}]};assert.equal(analysisEntries(state,'food').length,1);assert.equal(analysisEntries({...state,entries:[{...entry,category:'cat-1'}]},'food').length,1);assert.equal(analysisEntries(state,'all').length,1)});
test('manual daily cap is independent of total funds and persists with changing remaining balance',()=>{const s=initialState();const b={amount:5000,currency:'THB' as const,start:'2026-11-01',end:'2026-11-30',policy:'spread' as const,quick:[],dailyLimit:100};const entry={id:'cap',group:'cap',amount:150,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:'2026-11-01',note:'',rates:s.rates,created:'2026-11-01T00:00:00Z'};assert.equal(validBudget(b),true);const summary=budgetStatus(b,[entry],'2026-11-01');assert.equal(summary.allowance,100);assert.equal(summary.todayLeft,-50);assert.equal(summary.totalLeft,4850);assert.equal(summary.future,100);assert.equal(budgetRemainder('5000','THB',b.start,b.end,[entry],s.rates,undefined,'2026-11-01'),4850);assert.equal(budgetRemainder('5000','THB',b.start,b.end,[entry],s.rates,['cat-1'],'2026-11-01'),5000);assert.equal(validateState(JSON.parse(JSON.stringify({...s,budget:b,entries:[entry]}))).budget?.dailyLimit,100);assert.equal(validBudget({...b,dailyLimit:0}),false);assert.equal(validBudget({...b,dailyLimit:-1}),false);assert.equal(validBudget({...b,dailyLimit:undefined}),true)});
test('nested modal locks preserve the background position until the last overlay closes',()=>{const originalWindow=(globalThis as any).window,originalDocument=(globalThis as any).document;const style={overflow:'',position:'',top:'',left:'',right:'',width:'',paddingRight:''};const scrolls:number[][]=[];try{(globalThis as any).document={body:{style},documentElement:{style:{overflow:''},clientWidth:390}};(globalThis as any).window={innerWidth:390,scrollY:135,scrollTo:(x:number,y:number)=>scrolls.push([x,y])};const first=acquirePageScrollLock(),second=acquirePageScrollLock();assert.equal(style.position,'fixed');assert.equal(style.top,'-135px');first();assert.equal(style.position,'fixed');assert.equal(scrolls.length,0);second();assert.equal(style.position,'');assert.deepEqual(scrolls,[[0,135]]);second();assert.equal(scrolls.length,1)}finally{if(originalWindow===undefined)delete (globalThis as any).window;else (globalThis as any).window=originalWindow;if(originalDocument===undefined)delete (globalThis as any).document;else (globalThis as any).document=originalDocument}});

import {currencyQuote} from '../lib/currency-converter';
test('converter quantity is independent from balances and respects the selected base',()=>{const s=initialState();s.rates.USD=35;s.rates.UAH=0.8;const before=JSON.stringify(s);assert.equal(currencyQuote('100','USD','THB',s.rates),3500);assert.equal(currencyQuote('70','THB','USD',s.rates),2);assert.equal(currencyQuote('100-20','UAH','THB',s.rates),64);assert.equal(currencyQuote('oops','THB','USD',s.rates),null);assert.equal(currencyQuote('1','EUR','THB',{...s.rates,EUR:null}),null);assert.equal(JSON.stringify(s),before)});

import {budgetSpent} from '../lib/budget-funding';
import {searchExpenses} from '../lib/expense-search';
test('share keeps the GitHub project directory and removes private URL parameters',()=>{assert.equal(appShareUrl('https://stilltripsih.github.io/whereismymoney/?ai_connect=secret#connect=private'),'https://stilltripsih.github.io/whereismymoney/');assert.throws(()=>appShareUrl('javascript:alert(1)'))});
test('remaining budget isolates cash and card purchases even with the same category',()=>{const state=initialState(),day=today();const entry={id:'cash',group:'cash',amount:200,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:day,note:'Groceries',rates:{...state.rates,USD:35},created:day+'T10:00:00Z',budgetId:'cash'};state.entries=[entry,{...entry,id:'card',group:'card',budgetId:'card',amount:400},{...entry,id:'usd',group:'usd',budgetId:'cash',currency:'USD',amount:10}];assert.equal(budgetSpent(state,'cash',day,day,'THB'),550);assert.equal(budgetSpent(state,'card',day,day,'THB'),400);assert.equal(budgetSpent(state,'main',day,day,'THB'),0);assert.equal(5000-budgetSpent(state,'cash',day,day,'THB')!,4450);assert.equal(JSON.parse(JSON.stringify(state)).entries.length,3)});
test('expense search combines description, date, amount range and approximate hour',()=>{const state=initialState(),day='2026-11-19';state.rates.USD=35;const entry={id:'e',group:'e',amount:200,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:day,note:'Rice market',rates:state.rates,created:day+'T10:25:00Z'};state.entries=[entry,{...entry,id:'other',amount:900,note:'Taxi'}];assert.equal(searchExpenses(state.entries,state,'rice 19.11.2026','THB','150','250','17:00').length,1);assert.equal(searchExpenses(state.entries,state,'200','THB').length,1);assert.equal(searchExpenses(state.entries,state,'','THB','300','1000').length,1);assert.equal(searchExpenses(state.entries,state,'rice','THB','','','18:00').length,0)});

import {projectedBudgetRemainder} from '../lib/budget-funding';
test('daily plan forecasts leftover without charging today twice',()=>{assert.equal(projectedBudgetRemainder(4900,200,10,100),3000);assert.equal(projectedBudgetRemainder(4700,200,10,300),2900);assert.equal(projectedBudgetRemainder(500,200,10,0),-1500);assert.equal(projectedBudgetRemainder(null,200,10,0),null)});

import {chartViewport} from '../lib/chart-viewport';
test('chart pan keeps the interval length, respects history endpoints and crosses year boundaries',()=>{const limits={start:'2024-01-01',end:'2026-11-19'},base={start:'2026-10-21',end:'2026-11-19'};const shifted=chartViewport(base,limits,-30);assert.deepEqual(shifted,{start:'2026-09-21',end:'2026-10-20'});assert.equal(daysBetween(shifted.start,shifted.end),30);assert.deepEqual(chartViewport(base,limits,500),base);assert.deepEqual(chartViewport(base,limits,-50000),{start:'2024-01-01',end:'2024-01-30'});assert.deepEqual(chartViewport({start:'2026-01-01',end:'2026-01-07'},limits,-7),{start:'2025-12-25',end:'2025-12-31'})});
test('chart pinch zooms around its anchor, supports one day and cannot exceed available history',()=>{const limits={start:'2024-01-01',end:'2026-11-19'},base={start:'2026-10-21',end:'2026-11-19'};const zoomed=chartViewport(base,limits,0,2,.5);assert.equal(daysBetween(zoomed.start,zoomed.end),15);assert.deepEqual(chartViewport(base,limits,0,2,0),{start:'2026-10-21',end:'2026-11-04'});assert.deepEqual(chartViewport(base,limits,0,2,1),{start:'2026-11-05',end:'2026-11-19'});assert.equal(daysBetween(...Object.values(chartViewport(base,limits,0,10000)) as [string,string]),1);assert.deepEqual(chartViewport(base,limits,0,.0001),limits);assert.deepEqual(chartViewport(base,limits,0,NaN),base);assert.throws(()=>chartViewport({start:'oops',end:'2026-11-19'},limits,0))});
test('moving the chart interval changes the underlying expense selection and totals without modifying records',()=>{const state=initialState();const entries=[{id:'old',group:'old',amount:150,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:'2026-10-20',note:'',rates:state.rates,created:'2026-10-20T00:00:00Z'},{id:'new',group:'new',amount:400,currency:'THB' as const,kind:'expense' as const,category:'cat-1',date:'2026-11-19',note:'',rates:state.rates,created:'2026-11-19T00:00:00Z'}];const snapshot=JSON.stringify(entries),base={start:'2026-10-21',end:'2026-11-19'},moved=chartViewport(base,{start:'2024-01-01',end:'2026-11-19'},-30);assert.equal(dailyExpenses(entries,'THB',base.start,base.end,state.rates).reduce((n,d)=>n+d.total,0),400);assert.equal(dailyExpenses(entries,'THB',moved.start,moved.end,state.rates).reduce((n,d)=>n+d.total,0),150);assert.equal(JSON.stringify(entries),snapshot)});

import {chartDayAtPosition} from '../lib/chart-viewport';
test('chart taps select the displayed day including both boundaries and single-day zoom',()=>{const range={start:'2026-11-01',end:'2026-11-30'};assert.equal(chartDayAtPosition(range,0),'2026-11-01');assert.equal(chartDayAtPosition(range,1),'2026-11-30');assert.equal(chartDayAtPosition(range,.5),'2026-11-16');assert.equal(chartDayAtPosition(range,-1),'2026-11-01');assert.equal(chartDayAtPosition({start:'2026-11-19',end:'2026-11-19'},.9),'2026-11-19')});

test('moving an expense between budgets changes only budget assignment and preserves receipt identity and original FX',()=>{const state=initialState();state.rates.USD=35;state.categoryBudgets=[{id:'card',name:'Card',amount:1000,currency:'USD',start:'2026-11-01',end:'2026-11-30',policy:'spread',quick:[],categories:['cat-0']}];const entry={id:'transfer',group:'receipt',amount:12.5,currency:'USD' as const,kind:'expense' as const,category:'cat-0',date:'2026-11-19',note:'Market',rates:{...state.rates,USD:34},created:'2026-11-19T10:25:40Z'};const before=JSON.stringify(entry),when='2026-11-19T17:25',moved=editTransaction(entry,state,transactionDisplay(entry,state),entry.category,when,when,'card');assert.deepEqual(moved,{...entry,budgetId:'card'});assert.equal(entriesForBudget([moved],'main').length,0);assert.equal(entriesForBudget([moved],'card').length,1);assert.equal(moved.currency,'USD');assert.equal(moved.rates.USD,34);assert.equal(JSON.stringify(entry),before);assert.deepEqual(editTransaction(moved,state,transactionDisplay(moved,state),moved.category,when,when,'main'),{...entry,budgetId:'main'});assert.throws(()=>editTransaction(entry,state,transactionDisplay(entry,state),entry.category,when,when,'all'));assert.throws(()=>editTransaction(entry,state,transactionDisplay(entry,state),entry.category,when,when,'missing'))});

import {currentBudgetBalance,budgetFundingForBalance,walletBudgetBalances} from '../lib/budget-balance';
import {amountKey} from '../lib/amount-keypad';
test('signed and zero budgets roundtrip backups, while out-of-range amounts and invalid daily caps remain rejected',()=>{const state=initialState(),day=today();for(const amount of [-5000,0,1000]){const b={amount,currency:'THB' as const,start:day,end:shiftDate(day,29),policy:'spread' as const,quick:[]};assert.equal(validBudget(b),true);state.budget=b;state.categoryBudgets=[{...b,id:'credit',name:'Credit',categories:['cat-0']}];const restored=validateState(JSON.parse(JSON.stringify(state)));assert.equal(restored.budget?.amount,amount);assert.equal(restored.categoryBudgets?.[0].amount,amount)}assert.equal(validBudget({...state.budget,amount:-1e13}),false);assert.equal(validBudget({...state.budget,amount:Infinity}),false);assert.equal(validBudget({...state.budget,dailyLimit:-100}),false)});
test('editing a current balance restarts planning today and does not count prior purchases twice',()=>{const state=initialState(),day=today(),old={amount:3000,currency:'THB' as const,start:shiftDate(day,-29),end:shiftDate(day,10),policy:'reserve' as const,quick:[],dailyLimit:98};state.budget=old;const row={id:'old',group:'old',amount:1933,currency:'THB' as const,kind:'expense' as const,category:'cat-0',date:shiftDate(day,-1),note:'',rates:state.rates,created:shiftDate(day,-1)+'T10:00:00Z'};state.entries=[row];assert.equal(currentBudgetBalance(state,old,'main',day),1067);const funding=budgetFundingForBalance(1067,'THB',day,old.end,state,'main',day),updated={...old,amount:funding,start:day};assert.equal(budgetStatus(updated,state.entries,day).totalLeft,1067);assert.equal(budgetStatus(updated,state.entries,day).todayLeft,98);state.entries.push({...row,id:'today',group:'today',date:day,amount:67,created:day+'T10:00:00Z'});const corrected={...updated,amount:budgetFundingForBalance(1000,'THB',day,old.end,state,'main',day)};assert.equal(budgetStatus(corrected,state.entries,day).totalLeft,1000);assert.equal(state.entries.length,2)});
test('credit balance continues decreasing with purchases and can be replenished by editing the current balance',()=>{const state=initialState(),day=today(),b={amount:-5000,currency:'THB' as const,start:day,end:shiftDate(day,29),policy:'spread' as const,quick:[]};state.budget=b;state.entries=[{id:'credit',group:'credit',budgetId:'main',amount:200,currency:'THB',kind:'expense',category:'cat-0',date:day,note:'',rates:state.rates,created:day+'T10:00:00Z'}];assert.equal(budgetStatus(b,state.entries,day).totalLeft,-5200);assert.equal(budgetStatus(b,state.entries,day).todayLeft,-5200);const topup=budgetFundingForBalance(-4200,'THB',day,b.end,state,'main',day);assert.equal(budgetStatus({...b,amount:topup},state.entries,day).totalLeft,-4200);assert.equal(budgetStatus({...b,amount:budgetFundingForBalance(0,'THB',day,b.end,state,'main',day)},state.entries,day).totalLeft,0)});
test('wallet includes every budget and converts signed balances without changing stored amounts or old savings',()=>{const state=initialState(),day=today();state.rates.USD=35;state.budget={amount:1000,currency:'THB',start:day,end:shiftDate(day,29),policy:'spread',quick:[]};state.categoryBudgets=[{...state.budget,id:'card',name:'Card',amount:-100,currency:'USD',categories:['cat-0']}];state.savings.THB=9999;state.entries=[{id:'one',group:'one',amount:100,currency:'THB',kind:'expense',category:'cat-0',date:day,note:'',rates:state.rates,created:day+'T10:00:00Z',budgetId:'main'}];const before=JSON.stringify(state),rows=walletBudgetBalances(state,day,'THB');assert.equal(rows.length,2);assert.equal(rows[0].balance,900);assert.equal(rows[1].balance,-100);assert.equal(rows[1].converted,-3500);assert.equal(rows.reduce((n,b)=>n+(b.converted||0),0),-2600);assert.equal(walletBudgetBalances(state,day,'USD')[1].converted,-100);assert.equal(JSON.stringify(state),before);assert.equal(walletBudgetBalances({...state,rates:{...state.rates,USD:null}},day,'THB')[1].converted,null)});
test('shared keypad supports signed balances, clear, arithmetic and whole-baht evaluation',()=>{assert.equal(amountKey('0','5','THB'),'5');assert.equal(amountKey('500','±','THB'),'-500');assert.equal(amountKey('-500','±','THB'),'500');assert.equal(amountKey('-500+200','=','THB'),'-300');assert.equal(amountKey('100/3','=','THB'),'33');assert.equal(amountKey('12','⌫','THB'),'1');assert.equal(amountKey('-100','C','THB'),'');assert.equal(currencyInput('-500+200','THB'),-300);assert.throws(()=>currencyInput('-1.5','THB'))});

test('a new budget needs no category assignment and records expenses in any category by budget ID',()=>{const state=initialState(),day=today(),card={id:'free-card',name:'Card',amount:1000,currency:'THB' as const,start:day,end:shiftDate(day,29),policy:'spread' as const,quick:[],categories:[]};state.categoryBudgets=[card];const base={group:'receipt',currency:'THB' as const,kind:'expense' as const,date:day,note:'',rates:state.rates,created:day+'T10:00:00Z',budgetId:card.id};state.entries=[{...base,id:'food',amount:100,category:'cat-0'},{...base,id:'other',amount:200,category:'cat-1'},{...base,id:'elsewhere',amount:900,category:'cat-0',budgetId:'main'}];const restored=validateState(JSON.parse(JSON.stringify(state)));assert.deepEqual(restored.categoryBudgets![0].categories,[]);assert.equal(walletBudgetBalances(restored,day,'THB')[0].balance,700);assert.equal(analysisEntries(restored,card.id).length,2);assert.equal(restored.entries.length,3)});

// Connection checks use synthetic credentials and never contact Google.
import {verifyGoogle,googleFailure} from '../lib/google-connection';
test('Google connection verifies generation and skips unavailable model',async()=>{const original=globalThis.fetch;const calls:string[]=[];globalThis.fetch=async(url:any)=>{calls.push(String(url));return new Response(JSON.stringify(calls.length===1?{models:[{name:'models/gemini-9.9-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-9.8-flash',supportedGenerationMethods:['generateContent']}]}:calls.length===2?{error:{}}:{candidates:[{content:{parts:[{text:'OK'}]}}]}),{status:calls.length===2?404:200})};try{assert.equal(await verifyGoogle('synthetic-test-key'),'models/gemini-9.8-flash');assert.equal(calls.length,3)}finally{globalThis.fetch=original}});
test('Google connection does not call a metadata-only success connected',async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>new Response(JSON.stringify(++calls===1?{models:[{name:'models/gemini-9.9-flash',supportedGenerationMethods:['generateContent']}]}:{}),{status:calls===1?200:403});try{await assert.rejects(verifyGoogle('synthetic-test-key'),/запретил доступ/)}finally{globalThis.fetch=original}});
test('Modern Google credentials and temporary errors remain distinct',()=>{assert.equal(parseAICredential('AQ.'+'a'.repeat(40)).kind,'google');assert.match(googleFailure(503),/временно/);assert.match(googleFailure(429),/Квота/);assert.match(googleFailure(400),/не принял/)});

import {createHomeScrollReturn,HOME_RETURN_DELAY} from '../lib/home-scroll-return';
function homeScrollHarness(){let scrolled=true,blocked=false,resets=0,id=0,now=0;const jobs=new Map<number,{due:number;fn:()=>void}>();const controller=createHomeScrollReturn({isScrolled:()=>scrolled,isBlocked:()=>blocked,reset:()=>{resets++;scrolled=false},scheduler:{set:(fn,delay)=>{jobs.set(++id,{fn,due:now+delay});return id},clear:key=>{jobs.delete(key as number)}}});function tick(ms=2000){const until=now+ms;for(;;){const pending=[...jobs.entries()].filter(([,job])=>job.due<=until).sort((a,b)=>a[1].due-b[1].due)[0];if(!pending)break;now=pending[1].due;jobs.delete(pending[0]);pending[1].fn()}now=until}return{controller,jobs,block:(value:boolean)=>blocked=value,scroll:()=>scrolled=true,resets:()=>resets,tick}}
test('Home returns one second after release, without counting held time',()=>{const h=homeScrollHarness();assert.equal(HOME_RETURN_DELAY,1000);h.block(true);h.controller.hold();h.tick(10000);assert.equal(h.resets(),0);h.block(false);h.controller.release();h.tick(999);assert.equal(h.resets(),0);h.tick(1);assert.equal(h.resets(),1);assert.equal(h.jobs.size,0)});
test('Home does not fight active touch or reset behind an editor',()=>{const h=homeScrollHarness();h.block(true);h.controller.activity();h.tick();assert.equal(h.resets(),0);h.controller.release();assert.equal(h.resets(),0);h.block(false);h.tick();assert.equal(h.resets(),1)});
test('Home cancels stale return tasks on further gestures and unmount',()=>{const h=homeScrollHarness();h.controller.activity();assert.equal(h.jobs.size,1);h.controller.hold();assert.equal(h.jobs.size,0);h.controller.activity();h.controller.dispose();h.tick();h.controller.release();assert.equal(h.resets(),0)});
test('Home does not schedule returns when already at the entry keypad',()=>{const h=homeScrollHarness();h.controller.reset();h.controller.activity();assert.equal(h.jobs.size,0);assert.equal(h.resets(),1)});

test('Inertial scroll does not restart the one-second release deadline',()=>{const h=homeScrollHarness();h.controller.hold();h.controller.release();h.tick(500);h.controller.activity();h.tick(500);assert.equal(h.resets(),1)});
test('A new touch cancels the pending return and starts a fresh release delay',()=>{const h=homeScrollHarness();h.controller.release();h.tick(500);h.controller.hold();h.tick(5000);assert.equal(h.resets(),0);h.controller.release();h.tick(999);assert.equal(h.resets(),0);h.tick(1);assert.equal(h.resets(),1)});

import {amountEntryValue} from '../lib/amount-entry';
test('Shared amount entry preserves credit balances, receipt cents and precise exchange rates',()=>{assert.equal(amountEntryValue('-1500+200','THB'),-1300);assert.equal(amountEntryValue('109.75','THB',{fractional:true,allowNegative:false}),109.75);assert.equal(amountEntryValue('0.00012345','THB',{fractional:true,allowNegative:false}),0.00012345);assert.equal(amountEntryValue('1/100000','THB',{fractional:true,allowNegative:false}),0.00001);assert.equal(calculate('1/3'),0.33);assert.equal(amountEntryValue('0','USD',{allowNegative:false,allowZero:true}),0);assert.throws(()=>amountEntryValue('-1','USD',{allowNegative:false}));assert.throws(()=>amountEntryValue('0','USD',{allowNegative:false}));assert.throws(()=>amountEntryValue('12.25','THB'));assert.throws(()=>amountEntryValue('1000000000001','USD'))});

test('A tap at the top does not disable subsequent wheel scroll return',()=>{const h=homeScrollHarness();h.controller.reset();h.controller.release();h.scroll();h.controller.activity();h.tick(999);assert.equal(h.resets(),1);h.tick(1);assert.equal(h.resets(),2)});

import {googleCredentials} from '../lib/google-credential-store';
test('Unverified key survives a reload and temporary failure without replacing a verified key',()=>{const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}};const first=googleCredentials(storage);first.verified('old-synthetic','models/test');first.pending('new-synthetic');first.failed('new-synthetic','Gemini unavailable',503);const reloaded=googleCredentials(storage);assert.equal(reloaded.key(),'new-synthetic');assert.equal(reloaded.active()?.key,'old-synthetic');assert.equal(reloaded.status()?.state,'unavailable');assert.equal(JSON.stringify(reloaded.status()).includes('synthetic'),false);reloaded.verified('new-synthetic','models/test-2');assert.equal(reloaded.status()?.state,'verified');assert.equal(reloaded.active()?.key,'new-synthetic');reloaded.clear();assert.equal(reloaded.key(),'');assert.equal(reloaded.status(),null)});
test('Blocked browser storage is not reported as saved',()=>{const store=googleCredentials({getItem:()=>null,setItem:()=>{},removeItem:()=>{}});assert.throws(()=>store.pending('synthetic'),/не сохранил/)});
test('Gemini verification tries another model after a 503 instead of rejecting the key',async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify(calls===1?{models:[{name:'models/gemini-9.9-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-9.8-flash',supportedGenerationMethods:['generateContent']}]}:calls===2?{}:{candidates:[{content:{parts:[{text:'OK'}]}}]}),{status:calls===2?503:200})};try{assert.equal(await verifyGoogle('synthetic'),'models/gemini-9.8-flash');assert.equal(calls,3)}finally{globalThis.fetch=original}});
test('Aborted Google requests show a retryable timeout without raw browser error',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>{throw new DOMException('fetch is aborted','AbortError')};try{await assert.rejects(verifyGoogle('synthetic'),/не пришёл вовремя/)}finally{globalThis.fetch=original}});
