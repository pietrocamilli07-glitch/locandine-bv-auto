// Stato persistente su Netlify Blobs: partite gia gestite (posted), in attesa di approvazione (pending),
// e i PNG generati (serviti pubblicamente da functions/image.mjs).
import { getStore } from '@netlify/blobs';

const STATE_KEY = 'state';
function store(){ return getStore({ name: 'auto-ig', consistency: 'strong' }); }

export function matchKey(tappaId, match){ return `${tappaId}_${match.id}`; }

// --- Lock anti-doppioni: un solo controllo (runWatch) alla volta. ---
// Senza questo, due controlli sovrapposti (es. il cron Netlify + il trigger ogni 15 min)
// leggono lo stato nello stesso momento, non vedono la partita come "gia fatta" e la pubblicano due volte.
const LOCK_KEY = 'lock';
const LOCK_TTL_MS = 5 * 60 * 1000; // oltre 5 min un lock e considerato "morto" (run interrotto/crashato)

export async function acquireLock(ttlMs = LOCK_TTL_MS){
  const s = store();
  const now = Date.now();
  const payload = JSON.stringify({ until: now + ttlMs, at: now });
  // 1) tentativo atomico: crea il lock solo se non esiste
  const res = await s.set(LOCK_KEY, payload, { onlyIfNew: true });
  if (res && res.modified) return true;
  // 2) esiste gia: leggi e controlla se e ancora valido o "morto"
  const cur = await s.getWithMetadata(LOCK_KEY, { type: 'text' });
  if (!cur){ // sparito nel frattempo: riprova la creazione atomica
    const r = await s.set(LOCK_KEY, payload, { onlyIfNew: true });
    return !!(r && r.modified);
  }
  let until = 0;
  try { until = (JSON.parse(cur.data || '{}').until) || 0; } catch {}
  if (until > now) return false; // un altro controllo e davvero in corso
  // 3) lock scaduto: prendilo in modo atomico (solo se nessuno lo ha cambiato nel frattempo)
  try {
    const r2 = await s.set(LOCK_KEY, payload, { onlyIfMatch: cur.etag });
    return !!(r2 && r2.modified);
  } catch { return false; }
}

export async function releaseLock(){
  try { await store().delete(LOCK_KEY); } catch {}
}

export async function loadState(){
  const s = await store().get(STATE_KEY, { type: 'json' });
  return s || { posted: {}, pending: {} };
}
export async function saveState(state){
  await store().setJSON(STATE_KEY, state);
}

export async function putImage(key, buffer){
  await store().set('img:' + key, buffer);
}
export async function getImage(key){
  const ab = await store().get('img:' + key, { type: 'arrayBuffer' });
  return ab ? Buffer.from(ab) : null;
}

// Config scelta dall'utente (tappa del giorno, quali partite)
export async function getConfig(){
  const c = await store().get('config', { type: 'json' });
  return c || {};
}
export async function setConfig(obj){
  const cur = await getConfig();
  await store().setJSON('config', { ...cur, ...obj });
}

// Credenziali Instagram (salvate dalla pagina /oauth)
export async function getIgCreds(){
  const c = await store().get('igcreds', { type: 'json' });
  return c || {};
}
export async function setIgCreds(obj){
  await store().setJSON('igcreds', obj);
}
