// Test locale degli user_tags FINALI (sponsor + giocatori) di una tappa — SENZA pubblicare.
// Usa la fixture HTML reale (niente rete), la rubrica demo per i giocatori e una mappa
// sponsor di prova (con un handle volutamente errato, per mostrare validazione + log).
//   node test/sponsor.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseTappa } from '../lib/parse.mjs';
import { loadRubrica, buildUserTags } from '../lib/tags.mjs';
import { sponsorTags, mergeTags } from '../lib/sponsors.mjs';
import { tappaIdFromUrl } from '../lib/util.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const html = readFileSync(here('./fixture-termoli-u20.html'), 'utf8');
const tappaId = tappaIdFromUrl('https://beachvolley.federvolley.it/node/66780');
const { info, notable } = parseTappa(html);
const tappaLabel = info.luogo ? `${tappaId} ${info.luogo}` : tappaId;
const demo = loadRubrica(here('./rubrica-demo.csv'));

// Mappa sponsor di PROVA: la tappa 66780 ha 2 sponsor validi + 1 handle errato (scartato),
// e un @ da ripulire. Serve a mostrare validazione, dedup e posizionamento in alto.
const sponsors = {
  '66780': ['@MainSponsor', 'beach club ok', 'secondo_sponsor', '@MainSponsor'],
  'default': []
};

console.log(`Tappa ${tappaId} — ${info.luogo} (${info.categoria}) — ${notable.length} partite candidate.`);
console.log(`Rubrica DEMO: ${demo.handles.size} handle.\n`);

const spTags = sponsorTags(sponsors, tappaId);
console.log(`Sponsor tappa ${tappaId} (in alto, y~0.12): ${JSON.stringify(spTags)}\n`);

for (const m of notable.slice(0, 3)){
  const { userTags } = buildUserTags(m, demo, { tappa: tappaLabel });   // giocatori (in basso)
  const finalTags = mergeTags(spTags, userTags);                        // sponsor + giocatori
  console.log(`■ ${m.id} ${m.round}: ${m.teamA} ${m.setsA}-${m.setsB} ${m.teamB}`);
  console.log(`  user_tags FINALI (${finalTags.length}): ${JSON.stringify(finalTags)}\n`);
}
