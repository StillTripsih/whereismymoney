/** Share the public app address only, never a backup, auth code or current URL parameters. */
export function appShareUrl(href:string){const url=new URL(href);if(!['https:','http:'].includes(url.protocol))throw Error('Invalid app URL');return url.origin+'/'}
type ShareDevice={share?:(data:{url:string})=>Promise<void>;clipboard?:{writeText:(text:string)=>Promise<void>}};
export async function shareApplication(href:string,device:ShareDevice):Promise<'shared'|'copied'|'cancelled'|'manual'>{const url=appShareUrl(href);if(device.share){try{await device.share({url});return 'shared'}catch(e){if((e as {name?:string})?.name==='AbortError')return 'cancelled'}}if(device.clipboard){try{await device.clipboard.writeText(url);return 'copied'}catch{}}return 'manual'}
