import {tr} from './i18n';
import { receiptCandidates, type Category } from './finance';
export type ReceiptItem = {
  id: string;
  name: string;
  original?: string;
  amount: number;
  category: string;
  review: boolean;
  sourceAmount: number;
};
export type Receipt = {
  items: ReceiptItem[];
  total: number | null;
  adjustment: number;
  warnings: string[];
};
export function groupReceipt(receipt: Receipt, cats: Category[]): Receipt {
  const map = new Map<string, ReceiptItem>();
  for (const item of receipt.items) {
    if (!Number.isFinite(item.amount) || item.amount <= 0)
      throw Error(tr("Некорректная сумма в чеке"));
    const cat = cats.find((c) => c.id === item.category);
    if (!cat) throw Error(tr("Неизвестная категория чека"));
    const prev = map.get(cat.id);
    if (prev) {
      prev.amount =
        (Math.round(prev.amount * 100) + Math.round(item.amount * 100)) / 100;
      prev.sourceAmount = prev.amount;
      prev.review ||= item.review;
    } else
      map.set(cat.id, {
        id: crypto.randomUUID(),
        name: cat.name,
        category: cat.id,
        amount: Math.round(item.amount * 100) / 100,
        sourceAmount: Math.round(item.amount * 100) / 100,
        review: item.review,
      });
  }
  return { ...receipt, items: [...map.values()] };
}
const categories: [string, RegExp][] = [
  [
    'cat-16',
    /\b(beer|wine|vodka|whisk(?:y|ey)|rum|gin|tequila|cider|heineken|budweiser|chang|singha|leo|smirnoff)\b|เบียร์|ไวน์|เหล้า|пив[оа]|вин[оа]|водк|виски|алкогол/i,
  ],
  [
    'cat-17',
    /\b(detergent|cleaner|laundry|dishwash|tissue|toilet|sponge|bleach|garbage|household|dish soap)\b|น้ำยาล้าง|ผงซักฟอก|กระดาษ|น้ำยาซัก|салфет|моющ|порошок|губк|уборк|мусорн|туалетн/i,
  ],
  [
    'cat-8',
    /\b(vitamin|shampoo|toothpaste|deodorant|cosmetic|conditioner|sunscreen)\b|แชมพู|ยาสีฟัน|витамин|шампун|паст[аы]|космет/i,
  ],
  [
    'cat-0',
    /\b(milk|bread|rice|egg|chicken|pork|beef|fish|water|juice|cola|pepsi|coke|tea|coffee|fruit|banana|apple|mango|salad|noodle|yogurt|yoghurt|cheese|butter|snack|chips|chocolate|cookie|biscuit|ice cream|sandwich|sugar|salt|sauce|coconut|vegetable|tomato|potato|orange|lemon|cucumber|onion|carrot|nuts|cereal|sausage|ham|tuna|shrimp|prawn|soda|drink)\b|นม|ขนม|ข้าว|ไข่|ไก่|หมู|ปลา|น้ำดื่ม|กาแฟ|โยเกิร์ต|กล้วย|มะม่วง|ผัก|молок|хлеб|рис|яйц|куриц|свинин|говяд|рыб|вод[аы]|сок|кофе|чай|банан|яблок|сыр|масло|шоколад|печень|лапш|йогурт|овощ|фрукт/i,
  ],
  [
    'cat-12',
    /\b(shirt|shorts|dress|socks|shoes)\b|เสื้อ|กางเกง|футболк|одежд|носк|обув/i,
  ],
  [
    'cat-7',
    /\b(paracetamol|ibuprofen|medicine|pharmacy|aspirin)\b|парацетамол|лекарств|ибупрофен/i,
  ],
];
export function classifyItem(name: string, cats: Category[]) {
  for (const [id, pattern] of categories) {
    if (pattern.test(name)) {
      const cat = cats.find((c) => c.id === id && !c.archived);
      if (cat) return { category: cat.id, review: false };
    }
  }
  return {
    category:
      cats.find((c) => c.id === 'cat-15' && !c.archived)?.id ||
      cats.find((c) => !c.archived)?.id ||
      '',
    review: true,
  };
}
const excluded =
  /\b(sub\s*total|grand\s*total|total|amount\s*due|net\s*amount|balance|cash|change|tender|card|payment|visa|mastercard|vat|tax|receipt|invoice|tel|phone|member|points|cashier|date|time)\b|รวม|ยอดสุทธิ|เงินทอน|เงินสด|ภาษี|итог|сдача|наличн|оплата|ндс|телефон|кассир/i;
const discount = /\b(discount|coupon|promotion|saving)\b|ส่วนลด|скидк|купон/i;
const pricePattern = /(?:-?\d{1,3}(?:,\d{3})+|-?\d+)[.,]\d{2}(?!\d)/g;
function amount(s: string) {
  return Number(s.includes('.') ? s.replaceAll(',', '') : s.replace(',', '.'));
}
// Read item line totals, not unit prices. Keep original OCR text as the item name.
export function parseReceipt(text: string, cats: Category[]): Receipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items: ReceiptItem[] = [];
  let adjustment = 0;
  const warnings: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const prices = [...line.matchAll(pricePattern)];
    if (discount.test(line)) {
      if (prices.length)
        adjustment -= Math.abs(amount(prices[prices.length - 1][0]));
      continue;
    }
    if (excluded.test(line)) continue;
    // Common receipt layout: product title on one line, quantity/unit/line-total next.
    if (
      !prices.length &&
      /[a-zа-я\u0e00-\u0e7f]/i.test(line) &&
      i + 1 < lines.length
    ) {
      const next = lines[i + 1];
      if (
        /^\s*(?:\d+\s*[x×@]\s*)?[-\d.,\s฿*x×@]+$/.test(next) &&
        pricePattern.test(next)
      ) {
        line += ' ' + next;
        i++;
      }
    }
    pricePattern.lastIndex = 0;
    const found = [...line.matchAll(pricePattern)];
    if (!found.length) continue;
    const last = found[found.length - 1];
    const price = amount(last[0]);
    if (!Number.isFinite(price) || price <= 0 || price > 1e9) continue;
    let name = line
      .slice(0, found[0].index)
      .trim()
      .replace(/^\d{8,14}\s+/, '')
      .replace(/\s+\d+\s*[x×@]\s*$/, '')
      .trim();
    if (name.length < 2 || !/[a-zа-я\u0e00-\u0e7f]/i.test(name)) continue;
    items.push({
      id: 'line-' + items.length,
      name,
      amount: price,
      sourceAmount: price,
      ...classifyItem(name, cats),
    });
  }
  const best = receiptCandidates(text).find((c) => c.priority >= 2);
  let total = best?.amount ?? null;
  // Integer grand totals are also common in small shops.
  if (total === null) {
    for (const l of lines) {
      if (
        /(?:grand\s*total|amount\s*due|^total\b|ยอดสุทธิ|รวมทั้งสิ้น|итого)/i.test(l)
      ) {
        const n = l.match(/(\d+(?:[.,]\d{2})?)\s*(?:฿|THB)?\s*$/i);
        if (n) total = amount(n[1]);
      }
    }
  }
  if (!items.length)
    warnings.push(
      'Позиции не распознаны. Добавьте строки вручную или исправьте текст чека.',
    );
  if (adjustment)
    warnings.push(
      'Найдена скидка ' +
        adjustment.toFixed(2) +
        '. Распределите её кнопкой «Свести с итогом».',
    );
  return { items, total, adjustment, warnings };
}
export function reconcileItems(items: ReceiptItem[], total: number) {
  if (!items.length || !Number.isFinite(total) || total <= 0)
    throw Error(tr("Укажите итог больше нуля и добавьте позиции"));
  const sum = items.reduce((s, i) => s + Math.round(i.amount * 100), 0),
    target = Math.round(total * 100);
  if (sum <= 0) throw Error(tr("Проверьте суммы позиций"));
  const cents = items.map((i) =>
    Math.floor((Math.round(i.amount * 100) * target) / sum),
  );
  let remaining = target - cents.reduce((a, b) => a + b, 0);
  const order = items
    .map((i, n) => ({
      n,
      f: (Math.round(i.amount * 100) * target) / sum - cents[n],
    }))
    .sort((a, b) => b.f - a.f);
  for (let i = 0; i < remaining; i++) cents[order[i % order.length].n]++;
  if (cents.some((n) => n <= 0))
    throw Error(tr("После распределения есть нулевые позиции. Проверьте чек."));
  return items.map((item, i) => ({ ...item, amount: cents[i] / 100 }));
}
