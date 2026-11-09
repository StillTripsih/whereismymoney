import {tr, localeCode, categoryLabel} from '@/lib/i18n';
import {useState} from 'react';
import {hexToHsv,hsvToHex} from '../lib/color-field';
export function ColorField({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const [hsv,setHsv]=useState(()=>hexToHsv(value));
 const choose=(next:typeof hsv)=>{setHsv(next);onChange(hsvToHex(next.h,next.s,next.v))};
 const point=(e:React.PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect();choose({...hsv,s:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),v:Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))})};
 return <div className="touch-color-picker"><div className="color-plane" role="group" tabIndex={0} aria-label={tr("Цветовое поле: насыщенность и яркость")} style={{backgroundColor:hsvToHex(hsv.h,1,1)}} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);point(e)}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))point(e)}} onKeyDown={e=>{const steps:Record<string,[number,number]>={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,.01],ArrowDown:[0,-.01]};if(steps[e.key]){e.preventDefault();const [s,v]=steps[e.key];choose({...hsv,s:Math.max(0,Math.min(1,hsv.s+s)),v:Math.max(0,Math.min(1,hsv.v+v))})}}}><span className="color-point" style={{left:hsv.s*100+'%',top:(1-hsv.v)*100+'%',background:hsvToHex(hsv.h,hsv.s,hsv.v)}}/></div><input className="hue-strip" type="range" aria-label={tr("Оттенок")} min="0" max="359" value={Math.round(hsv.h)} onChange={e=>choose({...hsv,h:Number(e.target.value)})}/><output className="color-value" aria-live="polite">{value.toUpperCase()}</output></div>;
}

