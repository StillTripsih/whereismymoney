import {calculate,type Currency} from './finance';
import {currencyInput} from './currency-input';
export function amountEntryValue(raw:string,currency:Currency,{fractional=false,allowNegative=true,allowZero=false}:{fractional?:boolean;allowNegative?:boolean;allowZero?:boolean}={}){const n=fractional?calculate(raw,false):currencyInput(raw,currency);if(!Number.isFinite(n)||Math.abs(n)>1e12)throw Error('Проверьте сумму');if(!allowNegative&&(n<0||!allowZero&&n===0))throw Error(allowZero?'Сумма должна быть не меньше нуля':'Сумма должна быть больше нуля');return n}
