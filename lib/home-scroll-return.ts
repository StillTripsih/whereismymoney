/** Home returns to entry after reading, never during touch, editing or a dialog. */
export const HOME_RETURN_DELAY=0;
type Scheduler={set:(callback:()=>void,delay:number)=>unknown;clear:(id:unknown)=>void};
export function createHomeScrollReturn({isScrolled,isBlocked,reset,scheduler={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)}}:{isScrolled:()=>boolean;isBlocked:()=>boolean;reset:()=>void;scheduler?:Scheduler}){
 let timer:unknown=null,disposed=false;
 function cancel(){if(timer!==null)scheduler.clear(timer);timer=null}
 function arm(delay=HOME_RETURN_DELAY){cancel();if(disposed||!isScrolled())return;timer=scheduler.set(()=>{timer=null;if(disposed||!isScrolled())return;if(isBlocked()){arm(50);return}reset()},delay)}
 return{activity:()=>arm(),release:()=>arm(0),hold:cancel,reset:()=>{cancel();if(!disposed)reset()},dispose:()=>{disposed=true;cancel()}};
}
