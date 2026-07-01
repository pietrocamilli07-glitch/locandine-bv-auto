// Applica i tag sponsor di una tappa a sponsor.json, a partire dagli input del workflow.
// Env:
//   TAPPE_IN     = link tappe (uno per riga o separati da virgola/;)  — stessi link del box "Pubblica"
//   SPONSOR_IN   = handle sponsor liberi (spazi/virgole/a capo, con o senza @)
//   SPONSOR_FILE = (opzionale) percorso del file da scrivere; default ./sponsor.json (usato dai test)
//
// Per ogni node id estratto dai link scrive sponsor.json[<id>] = [handle puliti/validati/deduplicati].
// Box sponsor vuoto (o senza link) => sponsor.json NON viene toccato.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { tappaIdFromUrl } from './lib/util.mjs';
import { parseSponsorHandles } from './lib/sponsors.mjs';

const FILE = process.env.SPONSOR_FILE
  ? resolve(process.env.SPONSOR_FILE)
  : fileURLToPath(new URL('./sponsor.json', import.meta.url));

const sponsorRaw = process.env.SPONSOR_IN || '';
const tappeRaw = process.env.TAPPE_IN || '';

// Box vuoto => non tocco nulla (belt-and-suspenders: il workflow gia' salta lo step).
if(!sponsorRaw.trim()){
  console.log('Nessun tag sponsor in input: sponsor.json invariato.');
  process.exit(0);
}

const handles = parseSponsorHandles(sponsorRaw);

// Un id per ogni link (stessa estrazione del motore: primo numero di 3+ cifre). Deduplicati.
const ids = [...new Set(
  tappeRaw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).map(tappaIdFromUrl)
)];
if(!ids.length){
  console.log('Nessun link tappa in input: sponsor.json invariato.');
  process.exit(0);
}

// Rileggo sponsor.json esistente per preservare le altre tappe (e "default"/"_come_compilare").
let data = {};
if(existsSync(FILE)){
  try { const j = JSON.parse(readFileSync(FILE, 'utf8')); if(j && typeof j === 'object') data = j; }
  catch(e){ console.log('sponsor.json illeggibile, lo riscrivo da zero: ' + e.message); }
}

for(const id of ids){ data[String(id)] = handles; }

writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`sponsor.json aggiornato: tappe [${ids.join(', ')}] => [${handles.map(h => '@' + h).join(' ') || '(nessuno)'}]`);
