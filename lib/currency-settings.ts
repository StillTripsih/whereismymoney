import {currencies,allCurrencies,type Currency,type State} from './finance';
export function visibleCurrencies(data:State):Currency[]{return [...(data.enabledCurrencies||currencies)]}
export function applyCurrencyList(data:State,list:Currency[],display:Currency):State{if(!list.length||new Set(list).size!==list.length||list.some(c=>!allCurrencies.includes(c))||!list.includes(display))throw Error('Проверьте список валют');return {...data,enabledCurrencies:[...list],display}}
