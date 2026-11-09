import {currencies,type Entry,type Currency,type Rates} from './finance';
/** Newly added reporting currencies use today's available FX when absent in an old snapshot. Never mutate the stored snapshot. */
export function reportInCurrency(rows:Entry[],currency:Currency,current:Rates):Entry[]{if(currencies.includes(currency))return rows;return rows.map(e=>e.rates[currency]===undefined?{...e,rates:{...current}}:e)}
