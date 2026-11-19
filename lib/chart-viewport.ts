import {daysBetween,shiftDate,validDate} from './finance';
export type ChartRange={start:string;end:string};
export function chartViewport(range:ChartRange,limits:ChartRange,shift:number,scale=1,anchor=.5):ChartRange{
if(![range.start,range.end,limits.start,limits.end].every(validDate)||range.start>range.end||limits.start>limits.end)throw Error('Invalid chart range');
const span=daysBetween(range.start,range.end),available=daysBetween(limits.start,limits.end),ratio=Number.isFinite(scale)&&scale>0?scale:1,pivot=Math.max(0,Math.min(1,anchor));
const length=Math.max(1,Math.min(available,Math.round(span/ratio))),move=Number.isFinite(shift)?Math.round(shift):0;
let start=shiftDate(range.start,Math.round((span-length)*pivot)+move),end=shiftDate(start,length-1);
if(start<limits.start){start=limits.start;end=shiftDate(start,length-1)}
if(end>limits.end){end=limits.end;start=shiftDate(end,1-length)}
return {start,end};
}

export function chartDayAtPosition(range:ChartRange,fraction:number){const span=daysBetween(range.start,range.end);return shiftDate(range.start,Math.min(span-1,Math.max(0,Math.floor(fraction*span))))}
