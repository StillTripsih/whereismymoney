import {createPortal} from 'react-dom';
import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {ColorField} from './color-field';
import {paletteSlots,refreshOtherPalettes} from '../lib/curated-palettes';
import {RefreshCw,ArrowLeft,Check} from 'lucide-react';
import {useEffect,useState,useRef} from 'react';
import {labels as t} from '../lib/paired-labels';
type Colors={accent:string;background:string};
const defaults:Colors={accent:'#ed2946',background:'#09090b'};
export function themeVars(value:Colors=defaults){
 const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const luminance=(hex:string)=>rgb(hex).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
 const light=luminance(value.background)>.179;
 const mix=(a:string,b:string,t:number)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-t)+rgb(b)[i]*t).toString(16).padStart(2,'0')).join('');
 const ink=light?'#17131b':'#fffaff';
 return {'color-scheme':light?'light':'dark','--user-bg':value.background,'--user-accent':value.accent,'--user-ink':ink,'--user-muted':mix(value.background,ink,.68),'--user-surface':mix(value.background,ink,.055),'--user-border':mix(value.background,ink,.22),'--user-soft':mix(value.background,value.accent,.13),'--user-on-accent':luminance(value.accent)>.179?'#111111':'#ffffff'};
}
export function useColors(value?:Colors){useEffect(()=>{for(const [key,val]of Object.entries(themeVars(value)))document.documentElement.style.setProperty(key,val);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',value?.background||defaults.background)},[value?.accent,value?.background]);}
export function ThemeSettings({value,onSave,saved=[]}:{saved?:Colors[];value?:Colors;onSave:(v:Colors,sets:Colors[])=>Promise<void>}){
 const [sets,setSets]=useState(()=>paletteSlots(saved)),[draft,setDraft]=useState(value||defaults),[selected,setSelected]=useState(()=>{const i=paletteSlots(saved).findIndex(c=>c.accent===value?.accent&&c.background===value?.background);return i<0?null:i}),[edit,setEdit]=useState<'accent'|'background'|null>(null),[custom,setCustom]=useState('#ed2946'),[before,setBefore]=useState(value||defaults),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const panel=useRef<HTMLDetailsElement>(null),applied=useRef(value);applied.current=value;useColors(draft);
 useEffect(()=>()=>{for(const[k,v]of Object.entries(themeVars(applied.current)))document.documentElement.style.setProperty(k,v)},[]);
 const lock=useRef(false);
 const saveTheme=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');const finalSets=edit?sets.map((c,i)=>i===0?{...draft}:c):sets;try{await onSave(draft,finalSets);setSets(finalSets);if(edit)setSelected(0);setEdit(null);if(panel.current)panel.current.open=false}catch(e:any){setError(tr(e.message));if(panel.current)panel.current.open=true}finally{lock.current=false;setBusy(false)}};
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(panel.current?.open&&e.target instanceof Node&&!panel.current.contains(e.target)&&!(e.target instanceof Element&&e.target.closest('.color-overlay'))){if(panel.current)panel.current.open=false;void saveTheme()}};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[draft,sets,edit]);
 const chooseColor=(next:string)=>{setCustom(next);if(edit)setDraft(old=>({...old,[edit]:next}))};
 const acceptColor=()=>{const index=0;setSets(old=>old.map((c,i)=>i===index?{...draft}:c));setSelected(index);setEdit(null)};
 return <details ref={panel} className="theme-settings theme-live theme-slots"><summary aria-label={tr("Палитра")}><span className="palette-summary-dot" style={{background:draft.accent}}/><span className="palette-summary-dot" style={{background:draft.background}}/></summary><div className="palette-command-row"><button className="palette-refresh" aria-label={tr("Обновить девять палитр, сохранив первую")} disabled={busy} onClick={()=>{const next=refreshOtherPalettes(sets);setSets(next);if(selected!==0&&selected!==null){setSelected(1);setDraft(next[1])}}}><RefreshCw size={27}/></button><button className="primary save-circle" aria-label={tr("Применить палитру и сохранить наборы")} disabled={busy} onClick={saveTheme}><Check/></button></div><div className="color-circles">{(['accent','background'] as const).map(key=><button key={key} aria-label={key==='accent'?tr("Цвет акцента"):tr("Цвет фона")} style={{background:draft[key]}} onClick={()=>{setBefore(draft);setCustom(draft[key]);setEdit(key)}}/>)}</div><div className="saved-user-colors fixed-palettes">{sets.map((c,i)=><button key={i} aria-label={tr("Палитра ")+(i+1)} aria-pressed={selected===i} onClick={()=>{setSelected(i);setDraft({...c})}}><span style={{background:c.background}}/><span style={{background:c.accent}}/></button>)}</div>{error&&<p className="error" role="alert">{tr(error)}</p>}{edit&&createPortal(<div className="color-overlay" role="dialog" aria-modal="true" aria-label={tr("Выбрать цвет")} onClick={e=>{if(e.target===e.currentTarget){void saveTheme()}}}><section><div className="custom-color-sample" style={{background:custom}}/><ColorField key={edit} value={custom} onChange={chooseColor}/><div className="theme-actions"><button aria-label={tr("Отмена выбора цвета")} onClick={()=>{setDraft(before);setEdit(null)}}><ArrowLeft size={28}/></button><button className="primary save-circle" aria-label={tr("Подтвердить цвет")} onClick={acceptColor}><Check/></button></div></section></div>,document.body)}</details>;
}


