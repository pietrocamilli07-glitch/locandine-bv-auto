import fs from 'node:fs';
import { parseTappa } from '../lib/parse.mjs';
import { renderRisultato } from '../lib/render.mjs';
import { buildResultCaption } from '../lib/caption.mjs';
import { matchKey } from '../lib/store.mjs';            // importa @netlify/blobs senza chiamarlo
import { tappaIdFromUrl } from '../lib/util.mjs';

const html = fs.readFileSync('test/fixture-termoli-u20.html','utf8'); // pagina HTML reale (parser strutturale)
const url = 'https://beachvolley.federvolley.it/node/66780';
const tappaId = tappaIdFromUrl(url);
console.log('tappaId:', tappaId);

// simula lo stato e il loop del watcher
const state = { posted:{}, pending:{} };
async function runWatcher(){
  let added=0;
  const { info, notable } = parseTappa(html);
  for(const m of notable){
    const key = matchKey(tappaId, m);
    if(state.posted[key] || state.pending[key]) continue;
    const png = await renderRisultato(m, info);
    fs.writeFileSync(`test/out_${key}.png`, png);
    const caption = buildResultCaption(m, info);
    state.pending[key] = { caption, round:m.round, at:Date.now() };
    added++;
    if(m.round && /Finale\s*1/i.test(m.round)){ console.log('\n--- DIDASCALIA esempio (finale) ---\n'+caption+'\n'); }
  }
  return added;
}

const a = await runWatcher();
console.log('1° giro — nuove in coda:', a, '| chiavi:', Object.keys(state.pending).join(', '));
const b = await runWatcher();
console.log('2° giro (dedup) — nuove in coda:', b, '(atteso 0)');
console.log('PNG generati:', fs.readdirSync('test').filter(f=>f.startsWith('out_')).join(', '));
