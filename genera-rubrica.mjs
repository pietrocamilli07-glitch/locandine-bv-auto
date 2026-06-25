// genera-rubrica.mjs - costruisce l'elenco giocatori 2026 (id + nome) diviso per
// genere -> categoria, deduplicato per ID federvolley e ordinato per cognome.
//
// Uso (ambiente Node, dove il fetch verso federvolley e' permesso):
//   node genera-rubrica.mjs            -> scrive players_all.json + rubrica-giocatori-2026.csv
// Poi:  python build_xlsx.py players_all.json   -> Excel formattato (3 colonne).
//
// Le tappe senza lista ancora pubblicata danno 0 giocatori: ri-eseguendo lo script
// ogni settimana il file si completa da solo man mano che escono le liste.

import { writeFileSync } from 'node:fs';

/* ---- Tutte le tappe del Campionato 2026 (nazionali): Giovanile U14-U20 + Assoluto ---- */
const T = [];
const add = (genere, categoria, ids) => ids.forEach(id => T.push({ id, genere, categoria }));

add('MASCHILE',  'ASSOLUTO', [66727, 66729, 66731, 66733, 66737, 66738, 66740, 66742, 66744]);
add('FEMMINILE', 'ASSOLUTO', [66728, 66730, 66732, 66734, 66736, 66739, 66741, 66743, 66745]);

add('MASCHILE',  'UNDER 14', [66749, 66746, 66754, 66752, 66755]);
add('FEMMINILE', 'UNDER 14', [66750, 66747, 66753, 66751, 66756]);

add('MASCHILE',  'UNDER 16', [66767, 66769, 66773, 66775, 66771, 66778]);
add('FEMMINILE', 'UNDER 16', [66768, 66770, 66774, 66776, 66772, 66777]);

add('MASCHILE',  'UNDER 18', [66782, 66784, 66786, 66789, 66791, 66793]);
add('FEMMINILE', 'UNDER 18', [66781, 66783, 66785, 66790, 66792, 66794]);

add('MASCHILE',  'UNDER 20', [66780, 66788, 66800, 66797, 66796, 66801]);
add('FEMMINILE', 'UNDER 20', [66779, 66787, 66799, 66798, 66795, 66802]);

const BASE = 'https://beachvolley.federvolley.it/node/';

async function fetchTappa(id) {
  const r = await fetch(BASE + id, { headers: { 'User-Agent': 'Mozilla/5.0 (RubricaBV)' }, redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

// Estrae {id,name} da tutti i link <a .../node/ID>NOME</a>; tiene solo nomi di persona
// (MAIUSCOLI con almeno due parole) -> scarta i link di navigazione.
const A_RX = /<a[^>]*\/node\/(\d+)[^>]*>([^<]+)<\/a>/g;
const isPlayer = n => /^[A-ZÀ-Þ][A-ZÀ-Þ'.\- ]+$/.test(n) && n.trim().includes(' ');

function extractPlayers(html) {
  const map = new Map();
  let m;
  while ((m = A_RX.exec(html))) {
    const id = +m[1];
    const name = m[2].replace(/\s+/g, ' ').trim();
    if (isPlayer(name) && !map.has(id)) map.set(id, name);
  }
  return map; // id -> name
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const groups = new Map(); // "GEN|CAT" -> Map(id->name)
  let okTappe = 0;
  for (const t of T) {
    let html;
    try { html = await fetchTappa(t.id); }
    catch (e) { console.log('tappa ' + t.id + ' (' + t.genere + ' ' + t.categoria + '): lettura fallita ' + e.message); continue; }
    const players = extractPlayers(html);
    const key = t.genere + '|' + t.categoria;
    if (!groups.has(key)) groups.set(key, new Map());
    const g = groups.get(key);
    for (const [id, name] of players) if (!g.has(id)) g.set(id, name);
    if (players.size) okTappe++;
    console.log('tappa ' + t.id + ' (' + t.genere + ' ' + t.categoria + '): ' + players.size + ' giocatori');
    await sleep(400);
  }
  const flat = [];
  for (const [key, g] of groups) {
    const [genere, categoria] = key.split('|');
    for (const [id, name] of g) flat.push({ id, name, genere, categoria });
  }
  writeFileSync('players_all.json', JSON.stringify(flat, null, 2));
  const csv = ['id,genere,categoria,cognome_nome,handle']
    .concat(flat.map(p => p.id + ',' + p.genere + ',' + p.categoria + ',"' + p.name + '",'))
    .join('\n');
  writeFileSync('rubrica-giocatori-2026.csv', csv);
  const uniq = new Set(flat.map(p => p.id)).size;
  console.log('\nTappe con lista: ' + okTappe + '/' + T.length);
  console.log('Righe (giocatore x categoria): ' + flat.length + ' - atleti unici: ' + uniq);
  console.log('Scritti: players_all.json, rubrica-giocatori-2026.csv');
}

export { extractPlayers, T };
// esegue il fetch solo se lanciato direttamente (i test possono importarlo senza scaricare)
if (import.meta.url === `file://${process.argv[1]}`) main();
