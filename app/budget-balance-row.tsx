import type {ReactNode} from 'react';
import {Plus} from 'lucide-react';
import {tr} from '@/lib/i18n';
export function BudgetBalanceRow({children,currency,onTopUp,disabled=false}:{children:ReactNode;currency:ReactNode;onTopUp?:()=>void;disabled?:boolean}){
 return <div className="budget-balance-row"><div className="budget-balance-value">{children}</div><div className="budget-balance-tools">{currency}{onTopUp&&<button type="button" className="budget-top-up-trigger" aria-label={tr('Пополнить бюджет')} title={tr('Пополнить бюджет')} disabled={disabled} onClick={onTopUp}><Plus aria-hidden="true"/></button>}</div></div>;
}
