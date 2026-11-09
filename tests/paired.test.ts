import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryBudgetStatus,validCategoryBudgets,type CategoryBudget} from '../lib/budget';
import {initialState,validateState,exportText,type Entry} from '../lib/finance';
import {themeVars} from '../app/theme-settings';
const budget:CategoryBudget={id:'food',name:'Food',amount:100,currency:'THB',start:'2026-11-01',end:'2026-11-10',policy:'spread',quick:[],categories:['cat-0','cat-1']};
const entry=(category:string,amount:number,date='2026-11-01'):Entry=>({id:category+amount,group:'test',category,amount,date,currency:'THB',kind:'expense',note:'',created:date+'T05:00:00Z',rates:initialState().rates});
test('category budgets count selected categories once, exclude income and unrelated or future expenses',()=>{
 const entries=[entry('cat-0',12),entry('cat-1',8),entry('cat-fun',35),entry('cat-0',99,'2026-11-11'),{...entry('cat-0',300),kind:'income' as const}];
 const s=categoryBudgetStatus(budget,entries,'2026-11-01');
 assert.equal(s.spent,20);assert.equal(s.totalLeft,80);assert.equal(s.todayLeft,-10);assert.equal(s.future,8.88);
 assert.equal(categoryBudgetStatus({...budget,categories:['cat-fun']},entries,'2026-11-01').spent,35);
 assert.equal(categoryBudgetStatus(budget,entries,'2026-11-02').todayLeft,8.88);
 assert.equal(categoryBudgetStatus(budget,[],'2026-11-02').todayLeft,11.11);
 assert.equal(categoryBudgetStatus({...budget,policy:'reserve'},[],'2026-11-02').reserve,10);
});
test('category budgets signal missing FX and handle future or expired periods',()=>{
 const s=categoryBudgetStatus(budget,[{...entry('cat-0',5),currency:'USD',rates:{...initialState().rates,USD:null}}],'2026-11-01');assert.equal(s.missing,1);
 assert.equal(categoryBudgetStatus(budget,[],'2026-10-31').future,10);
 const ended=categoryBudgetStatus(budget,[entry('cat-0',20)],'2026-11-11');assert.equal(ended.active,false);assert.equal(ended.totalLeft,80);assert.equal(ended.futureDays,0);
});
test('budgets and theme round-trip without losing ledger; legacy exports remain valid',()=>{
 const old=initialState();assert.deepEqual(validateState(JSON.parse(JSON.stringify(old))),old);
 const state={...old,entries:[entry('cat-0',20)],categoryBudgets:[budget],colorTheme:{accent:'#ed2946',background:'#09090b'}};
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))),state);assert.ok(exportText(state).includes('"categoryBudgets"'));
 assert.throws(()=>validateState({...state,colorTheme:{accent:'red',background:'#ffffff'}}));
 assert.equal(themeVars(state.colorTheme)['--user-ink'],'#fffaff');assert.equal(themeVars({accent:'#ffffff',background:'#ffffff'})['--user-on-accent'],'#111111');
});
test('invalid budgets cannot be imported: empty scopes, duplicate IDs, amounts or dates',()=>{
 assert.equal(validCategoryBudgets([budget]),true);
 for(const value of [[budget,budget],[{...budget,categories:[]}],[{...budget,categories:['cat-0','cat-0']}],[{...budget,amount:-1}],[{...budget,end:'2026-10-31'}],[{...budget,name:' '}]] ){
 assert.equal(validCategoryBudgets(value),false);assert.throws(()=>validateState({...initialState(),categoryBudgets:value}));
 }
});
