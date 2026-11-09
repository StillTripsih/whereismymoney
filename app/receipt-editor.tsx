import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import { Plus, Trash2 } from 'lucide-react';
import { Picker, categoryOptions } from './ui';
import { money, type Currency, type Category } from '@/lib/finance';
import { reconcileItems, type Receipt, type ReceiptItem } from '@/lib/receipt';
export function ReceiptEditor({
  value,
  onChange,
  categories,
  currency,
}: {
  value: Receipt;
  onChange: (r: Receipt) => void;
  categories: Category[];
  currency: Currency;
}) {
  const sum =
    Math.round(value.items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const groups = categories
    .map((c) => ({
      name: categoryLabel(c),
      sum: value.items
        .filter((i) => i.category === c.id)
        .reduce((s, i) => s + i.amount, 0),
    }))
    .filter((c) => c.sum);
  function edit(id: string, patch: Partial<ReceiptItem>) {
    onChange({
      ...value,
      items: value.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  }
  return (
    <div className="receipt-editor">
      <label className="field">
        {tr("Итог чека")}<input
          inputMode="decimal"
          type="number"
          step="0.01"
          min="0"
          value={value.total ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              total: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
      </label>
      {value.items.map((item, i) => (
        <div className="receipt-item" key={item.id}>
          <div className="row">
            <span className="muted">{i + 1}</span>
            <input
              className="item-name"
              aria-label={tr("Название позиции ") + (i + 1)}
              value={item.name}
              onChange={(e) => edit(item.id, { name: e.target.value })}
            />
            <button
              className="icon-btn"
              aria-label={tr("Убрать позицию")}
              onClick={() =>
                onChange({
                  ...value,
                  items: value.items.filter((x) => x.id !== item.id),
                })
              }
            >
              <Trash2 size={19} />
            </button>
          </div>
          {item.original && item.original !== item.name && (
            <p className="muted small original-name">{item.original}</p>
          )}
          <div className="row">
            <Picker
              label={tr("Категория ") + item.name}
              value={item.category}
              options={categoryOptions(categories.filter((c) => !c.archived))}
              onChange={(category) =>
                edit(item.id, { category, review: false })
              }
            />
            <input
              aria-label={tr("Сумма ") + item.name}
              className="item-amount"
              inputMode="decimal"
              type="number"
              step="0.01"
              value={item.amount || ''}
              onChange={(e) =>
                edit(item.id, { amount: Number(e.target.value) })
              }
            />
            <span>{currency}</span>
          </div>
          {item.review && (
            <small className="review-flag">
              {tr("Категория не определена — проверьте")}</small>
          )}
        </div>
      ))}
      <button
        className="text-button"
        onClick={() =>
          onChange({
            ...value,
            items: [
              ...value.items,
              {
                id: crypto.randomUUID(),
                name: '',
                amount: 0,
                sourceAmount: 0,
                category:
                  categories.find((c) => c.id === 'cat-15')?.id ||
                  categories[0].id,
                review: true,
              },
            ],
          })
        }
      >
        <Plus size={16} style={{ display: 'inline' }} /> {tr("Позиция")}</button>
      {value.total === null && (
        <p className="error">{tr("Итог чека не найден. Укажите его для проверки.")}</p>
      )}
      {value.total !== null && Math.abs(sum - value.total) > 0.009 && (
        <div className="error">
          {tr("Позиции:")}{money(sum, currency)}{tr(". Разница с чеком:")}{' '}
          {money(value.total - sum, currency)}.
          <button
            className="text-button full"
            onClick={() => {
              try {
                onChange({
                  ...value,
                  items: reconcileItems(value.items, value.total!),
                });
              } catch (e: any) {
                onChange({ ...value, warnings: [e.message] });
              }
            }}
          >
            {tr("Свести с итогом: распределить скидку / доплату")}</button>
        </div>
      )}
      {value.warnings.map((w, i) => (
        <p className="muted small" key={i}>
          {w}
        </p>
      ))}
      <div className="receipt-summary">
        {groups.map((g) => (
          <div className="row spaced" key={g.name}>
            <span>{g.name}</span>
            <b>{money(g.sum, currency)}</b>
          </div>
        ))}
        <div className="row spaced">
          <b>{tr("Всего")}</b>
          <b>{money(sum, currency)}</b>
        </div>
      </div>
    </div>
  );
}
