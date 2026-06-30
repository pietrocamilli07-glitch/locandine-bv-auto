// Test locale dei tag-utente (menzioni) per le Storie — SENZA pubblicare nulla.
// Usa la fixture HTML reale (niente rete) e mostra gli user_tags risolti.
//   node test/tags.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseTappa } from '../lib/parse.mjs';
import { loadRubrica, buildUserTags } from '../lib/tags.mjs';
import { tappaIdFromUrl } from '../lib/util.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const DRY = /^(0|false|no)$/i.test(process.env.DRY_RUN || '') ? false : true;  // niente publish: sempre prova

const html = readFileSync(here('./fixture-termoli-u20.html'), 'utf8');
const tappaId = tappaIdFromUrl('https://beachvolley.federvolley.it/node/66780');
const { info, notable } = parseTappa(html);
const tappaLabel = info.luogo ? `${tappaId} ${info.luogo}` : tappaId;

console.log(`DRY_RUN=${DRY} — nessuna pubblicazione.`);
console.log(`Tappa ${tappaId} — ${info.luogo} (${info.categoria}) — ${notable.length} partite candidate.\n`);

// 1) Rubrica REALE (stato attuale del repo): oggi gli handle sono ancora vuoti.
const real = loadRubrica(here('../rubrica-giocatori-2026.csv'));
console.log(`Rubrica reale: ${real.handles.size} handle su ${real.names.size} giocatori censiti.`);

// 2) Rubrica DEMO (handle finti per i giocatori della fixture): mostra i tag risolti.
const demo = loadRubrica(here('./rubrica-demo.csv'));
console.log(`Rubrica DEMO: ${demo.handles.size} handle.\n`);

const missingAll = [];
for (const m of notable.slice(0, 3)){
  const { userTags, missing } = buildUserTags(m, demo, { tappa: tappaLabel });
  missingAll.push(...missing);
  console.log(`■ ${m.id} ${m.round}: ${m.teamA} ${m.setsA}-${m.setsB} ${m.teamB}`);
  console.log(`  user_tags (${userTags.length}): ${JSON.stringify(userTags)}`);
  if (missing.length) console.log(`  senza handle: ${missing.map(x => `${x.id} ${x.nome || '(?)'}`).join(', ')}`);
  console.log('');
}

if (missingAll.length){
  console.log('tag-mancanti accumulati (id, nome, tappa):');
  console.log(JSON.stringify(missingAll, null, 2));
}
