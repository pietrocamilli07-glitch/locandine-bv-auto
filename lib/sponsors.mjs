// Sponsor tag (menzioni) da applicare a OGNI storia/post di una tappa, oltre ai giocatori.
// sponsor.json mappa <tappaId> -> lista di @handle. Chiave "default" usata quando la tappa
// non ha una voce propria. Gli sponsor vanno posizionati IN ALTO (i giocatori restano in basso).
import { readFileSync, existsSync } from 'node:fs';
import { cleanHandle } from './tags.mjs';

// Handle IG valido: lettere/numeri/punto/underscore, 1..30 caratteri.
// Scarta i "palesemente errati" (spazi, @ interne, simboli, troppo lunghi).
const VALID_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
export function isValidHandle(h){ return VALID_HANDLE.test(h); }

// Legge sponsor.json. Se assente o illeggibile -> nessuno sponsor (non blocca la pubblicazione).
export function loadSponsors(path){
  if(!existsSync(path)) return {};
  try { const j = JSON.parse(readFileSync(path,'utf8')); return (j && typeof j==='object') ? j : {}; }
  catch(e){ console.log('sponsor.json illeggibile, ignoro gli sponsor: ' + e.message); return {}; }
}

// Coordinate sponsor: riga in ALTO (y di default 0.12), x distribuita ~0.2..0.8.
// (origine in alto a sinistra; specchia tagCoords che tiene i giocatori a y~0.9)
export function sponsorCoords(n, y=0.12){
  const out=[];
  for(let i=0;i<n;i++){
    const x = n<=1 ? 0.5 : 0.5 + ((i-(n-1)/2)/n)*0.6;
    out.push({ x:+x.toFixed(3), y:+y.toFixed(3) });
  }
  return out;
}

// Handle sponsor di una tappa: puliti (via @/spazi), validati e deduplicati.
// tappaId assente -> usa "default". Gli scarti vengono loggati ma non fermano il run.
export function sponsorHandlesFor(sponsors, tappaId){
  const raw = sponsors[String(tappaId)] || sponsors.default || [];
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const good = [];
  for(const item of list){
    const h = cleanHandle(item);
    if(!h) continue;
    if(!isValidHandle(h)){ console.log(`sponsor ignorato (handle non valido): "${item}" — tappa ${tappaId}`); continue; }
    const low = h.toLowerCase();
    if(seen.has(low)) continue;                 // niente duplicati tra gli sponsor
    seen.add(low); good.push(h);
  }
  return good;
}

// Trasforma una stringa libera (es. dal box del sito: "@a, b  c\n@a") in una lista di
// handle puliti, validati e deduplicati — stessa logica/severita' di sponsorHandlesFor.
// Separatori ammessi: spazi, virgole, punti e virgola, a capo. Handle non validi scartati.
export function parseSponsorHandles(input){
  const seen = new Set();
  const good = [];
  for(const item of String(input||'').split(/[\s,;]+/)){
    const h = cleanHandle(item);
    if(!h) continue;
    if(!isValidHandle(h)){ console.log(`sponsor ignorato (handle non valido): "${item}"`); continue; }
    const low = h.toLowerCase();
    if(seen.has(low)) continue;                 // niente duplicati tra gli sponsor
    seen.add(low); good.push(h);
  }
  return good;
}

// Tag sponsor {username,x,y} per una tappa, posizionati in alto.
export function sponsorTags(sponsors, tappaId, y=0.12){
  const handles = sponsorHandlesFor(sponsors, tappaId);
  const coords = sponsorCoords(handles.length, y);
  return handles.map((username,i)=>({ username, x:coords[i].x, y:coords[i].y }));
}

// Unisce sponsor (in cima) + giocatori, senza duplicati (match per username, case-insensitive).
// Gli sponsor vincono: se un giocatore coincide con uno sponsor si tiene la posizione sponsor.
export function mergeTags(sponsorTagList, playerTagList){
  const seen = new Set();
  const out = [];
  for(const t of [...(sponsorTagList||[]), ...(playerTagList||[])]){
    const low = String(t.username||'').toLowerCase();
    if(!low || seen.has(low)) continue;
    seen.add(low); out.push(t);
  }
  return out;
}
