export type Palette={accent:string;background:string};
// Deliberately paired tinted neutrals and accents; no arbitrary RGB generation.
export const curatedPalettes: readonly Palette[] = [
 {accent:"#e55870",background:"#100c10"},
 {accent:"#d16d87",background:"#160f15"},
 {accent:"#c4709e",background:"#140e17"},
 {accent:"#a580c8",background:"#110f19"},
 {accent:"#8d8ad4",background:"#0e101b"},
 {accent:"#668fcb",background:"#0c131d"},
 {accent:"#549cba",background:"#0b161c"},
 {accent:"#419fa3",background:"#0b1718"},
 {accent:"#539d88",background:"#0c1814"},
 {accent:"#76996b",background:"#12170f"},
 {accent:"#9a9255",background:"#17160e"},
 {accent:"#b68c4d",background:"#19130d"},
 {accent:"#c67e52",background:"#1b110e"},
 {accent:"#cf7368",background:"#1b0f11"},
 {accent:"#b58a85",background:"#171212"},
 {accent:"#8e93a0",background:"#111318"},
];
export function contrast(a:string,b:string){const light=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const x=light(a),y=light(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
export function nextCuratedPalette(current:Palette,remaining:number[],rng:()=>number=Math.random){
 const same=(i:number)=>curatedPalettes[i].accent===current.accent&&curatedPalettes[i].background===current.background;
 let bag=remaining.filter(i=>Number.isInteger(i)&&i>=0&&i<curatedPalettes.length&&!same(i));
 if(!bag.length)bag=curatedPalettes.map((_,i)=>i).filter(i=>!same(i));
 const index=Math.min(bag.length-1,Math.max(0,Math.floor(rng()*bag.length))),id=bag[index];
 return {palette:{...curatedPalettes[id]},remaining:bag.filter((_,i)=>i!==index)};
}


export function paletteSlots(saved:Palette[]=[]):Palette[]{const result=saved.slice(0,10).map(c=>({...c}));for(const c of curatedPalettes){if(result.length===10)break;if(!result.some(p=>p.accent===c.accent&&p.background===c.background))result.push({...c})}return result}
export function refreshPaletteSlots(rng:()=>number=Math.random):Palette[]{const pool=curatedPalettes.map(c=>({...c}));for(let i=pool.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(rng()*(i+1))));[pool[i],pool[j]]=[pool[j],pool[i]]}return pool.slice(0,10)}

export function refreshOtherPalettes(current:Palette[],rng:()=>number=Math.random):Palette[]{const first=paletteSlots(current)[0];const options=refreshPaletteSlots(rng).filter(c=>c.accent!==first.accent||c.background!==first.background);for(const c of curatedPalettes){if(options.length>=9)break;if((c.accent!==first.accent||c.background!==first.background)&&!options.some(p=>p.accent===c.accent&&p.background===c.background))options.push({...c})}return [{...first},...options.slice(0,9)]}
