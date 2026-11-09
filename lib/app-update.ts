import {checkpointBeforeUpdate} from './storage';
const appBase=typeof document==='undefined'?'/':new URL('.',document.baseURI).pathname;
export async function checkUpdatePage(fetcher:typeof fetch=fetch):Promise<void>{
 const response=await fetcher(appBase+'index.html?app_update='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('network');
 const html=await response.text();
 if(!html.includes('id="root"')||!html.includes('/assets/'))throw Error('network');
}
function activated(worker:ServiceWorker):Promise<void>{
 return new Promise((resolve,reject)=>{
  const finish=(error?:Error)=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);error?reject(error):resolve()};
  const changed=()=>{if(worker.state==='activated')finish();else if(worker.state==='redundant')finish(Error('worker'));else if(worker.state==='installed')worker.postMessage({type:'SKIP_WAITING'})};
  const timer=setTimeout(()=>finish(Error('worker')),30000);
  worker.addEventListener('statechange',changed);changed();
 });
}
export async function updateApplication(){
 await checkpointBeforeUpdate();
 await checkUpdatePage();
 if('serviceWorker' in navigator){
  const registration=await navigator.serviceWorker.getRegistration();
  if(registration){await registration.update();const worker=registration.installing||registration.waiting;if(worker)await activated(worker);}
 }
 const url=new URL(location.href);url.searchParams.set('app_update',String(Date.now()));location.replace(url.href);
}
