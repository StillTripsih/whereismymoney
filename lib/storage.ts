import {tr} from './i18n';
import { initialState, validateState, type State, type Entry } from './finance';
let dbPromise: Promise<IDBDatabase> | null = null;
function db() {
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      const r = indexedDB.open('where-is-my-money', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('ledger');
      r.onerror = () =>
        reject(
          Error(
            tr("Браузер не разрешил хранение данных. Откройте приложение в обычном, не приватном режиме."),
          ),
        );
      r.onsuccess = () => resolve(r.result);
      r.onblocked = () =>
        reject(Error(tr("Закройте другие вкладки приложения и повторите.")));
    });
  return dbPromise;
}
export async function loadState(): Promise<State> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('ledger', 'readonly');
    const r = tx.objectStore('ledger').get('state');
    r.onsuccess = () => {
      try {
        const state = r.result ? validateState(r.result) : initialState();
        const added = initialState().categories.filter(
          (c) =>
            ['cat-16', 'cat-17', 'cat-fun','cat-unknown'].includes(c.id) &&
            !state.categories.some((x) => x.id === c.id),
        );
        resolve({ ...state, savingsCheckpoint:state.savingsCheckpoint||"2026-11-03T10:53:50.227Z", categories: [...state.categories, ...added] });
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(Error(tr("Не удалось прочитать сохранённые данные")));
  });
}
export async function saveState(next: State, expected: number): Promise<State> {
  validateState(next);
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('ledger', 'readwrite');
    const store = tx.objectStore('ledger');
    const r = store.get('state');
    let conflict = false;
    const saved = { ...next, revision: expected + 1 };
    r.onsuccess = () => {
      if ((r.result?.revision ?? 0) !== expected) {
        conflict = true;
        tx.abort();
        return;
      }
      if (r.result) {
        store.put(
          { state: r.result, date: new Date().toISOString() },
          'backup:' + String(expected).padStart(12, '0'),
        );
        const keys = store.getAllKeys();
        keys.onsuccess = () => {
          const backups = keys.result
            .filter((k) => String(k).startsWith('backup:'))
            .sort();
          for (const key of backups.slice(0, -10)) store.delete(key);
        };
      }
      store.put(saved, 'state');
      store.put(new Date().toISOString(), 'savedAt');
    };
    tx.oncomplete = () => resolve(saved);
    tx.onabort = () =>
      reject(
        Error(
          conflict
            ? 'Данные изменены в другой вкладке. Закройте форму и обновите страницу перед повтором.'
            : 'Не удалось сохранить. Возможно, на устройстве закончилось место. Данные формы не потеряны.',
        ),
      );
    tx.onerror = () => {};
  });
}
export async function storageInfo() {
  const d = await db();
  return new Promise<{ id: string; savedAt: string }>((resolve, reject) => {
    const tx = d.transaction('ledger', 'readwrite'),
      store = tx.objectStore('ledger'),
      id = store.get('storageId'),
      saved = store.get('savedAt');
    let key = '';
    id.onsuccess = () => {
      key = id.result || crypto.randomUUID();
      if (!id.result) store.put(key, 'storageId');
    };
    tx.oncomplete = () => resolve({ id: key, savedAt: saved.result || '' });
    tx.onabort = () => reject(Error(tr("Не удалось проверить хранилище")));
  });
}
export async function loadSnapshots() {
  const d = await db();
  return new Promise<{ state: State; date: string }[]>((resolve, reject) => {
    const tx = d.transaction('ledger', 'readonly'),
      s = tx.objectStore('ledger'),
      keys = s.getAllKeys(),
      result: { state: State; date: string }[] = [];
    keys.onsuccess = () => {
      for (const k of keys.result.filter((k) =>
        String(k).startsWith('backup:'),
      )) {
        const r = s.get(k);
        r.onsuccess = () => {
          try {
            result.push({
              date: r.result.date,
              state: validateState(r.result.state),
            });
          } catch {}
        };
      }
    };
    tx.oncomplete = () =>
      resolve(result.sort((a, b) => b.date.localeCompare(a.date)));
    tx.onabort = () => reject(Error(tr("Не удалось прочитать копии")));
  });
}
export function download(
  text: string,
  name: string,
  type = 'text/plain;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function exportBackup(
  text: string,
  name: string,
  type = 'application/json',
): Promise<boolean> {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'WHERE IS MY MONEY — all data',
      });
      return true;
    } catch (e: any) {
      if (e.name === 'AbortError') return false;
    }
  }
  download(text, name, type);
  return true;
}

// Append against the latest revision; retry a concurrent write without discarding it.
export async function appendEntries(entries: Entry[]): Promise<State> {
  for(let attempt=0;attempt<3;attempt++) {
    const latest=await loadState();
    const fresh=entries.filter(e=>!latest.entries.some(old=>old.id===e.id));
    if(!fresh.length) return latest;
    try { return await saveState({...latest,entries:[...latest.entries,...fresh]},latest.revision); }
    catch(e:any) { if(!e.message.includes('другой вкладке') || attempt===2) throw e; }
  }
  throw Error(tr("Повторите сохранение. Чек остался на экране."));
}

// Snapshot the latest committed state in the same transaction; never replace the ledger.
export async function checkpointBeforeUpdate():Promise<void>{
 const database=await db();
 return new Promise((resolve,reject)=>{
  const tx=database.transaction('ledger','readwrite'),store=tx.objectStore('ledger'),read=store.get('state');
  read.onsuccess=()=>{if(read.result){try{validateState(read.result);store.put({state:read.result,date:new Date().toISOString()},'backup:before-update')}catch{tx.abort()}}};
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(Error(tr("Не удалось создать резервную копию. Обновление не выполнено.")));tx.onerror=()=>{};
 });
}
