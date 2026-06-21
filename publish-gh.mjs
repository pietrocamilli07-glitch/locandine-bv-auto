// Auto-pubblicatore per GitHub Actions — gratis per sempre, nessun credito di hosting.
// Due modalita' (chiamate dal workflow attorno al commit delle immagini):
//   node publish-gh.mjs render   -> legge le tappe, genera i JPEG nuovi in published/, prepara la coda
//   node publish-gh.mjs publish  -> pubblica la coda come Storie Instagram (immagini ormai online su raw)
//
// Le tappe arrivano da TAPPA_URLS (input "Run workflow") oppure dal file tappe.txt nel repo.
// Le credenziali IG (IG_USER_ID, IG_TOKEN) arrivano dai Secrets del repo: mai scritte su file.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseTappa, pairSurnames } from './lib/parse.mjs';
import { renderRisultato } from './lib/render.mjs';
import { buildResultCaption } from './lib/caption.mjs';
import { publishToInstagram } from './lib/ig.mjs';
import { fetchTappa, tappaIdFromUrl } from './lib/util.mjs';
import { loadState, saveState, matchKey, putImage, loadQueue, saveQueue, clearQueue, rawUrl } from './lib/store-fs.mjs';
import { sendPreview } from './lib/telegram.mjs';

const ROOT = process.env.REPO_DIR || process.cwd();
const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 10);   // tetto per giro (rispetta i limiti API IG ~50/24h)
// Quali partite pubblicare: default = TUTTE quelle reali. Per limitarle: ROUNDS_REGEX="semifinal|finale".
const ROUNDS = process.env.ROUNDS_REGEX ? new RegExp(process.env.ROUNDS_REGEX, 'i') : /.*/;

function getTappe(){
  const fromEnv = (process.env.TAPPA_URLS || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  if (fromEnv.length) return fromEnv;
  const f = join(ROOT, 'tappe.txt');
  if (existsSync(f)) return readFileSync(f, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  return [];
}

async function doRender(){
  const tappe = getTappe();
  if (!tappe.length){ console.log('Nessuna tappa: incolla i link nella "Run workflow" o nel file tappe.txt.'); saveQueue([]); return; }
  const state = loadState();
  const queue = [];
  for (const url of tappe){
    if (queue.length >= MAX_PER_RUN) break;
    let html;
    try { html = await fetchTappa(url); }
    catch (e){ console.log('lettura fallita ' + url + ': ' + e.message); continue; }
    const tappaId = tappaIdFromUrl(url);
    const { info, matches } = parseTappa(html, { rounds: ROUNDS });
    const notable = matches.filter(m => ROUNDS.test(m.round || ''));
    console.log(`Tappa ${tappaId} — ${info.luogo || '?'} (${info.genere || '?'}) — ${notable.length} partite candidate.`);
    for (const m of notable){
      if (queue.length >= MAX_PER_RUN){ console.log(`(tetto ${MAX_PER_RUN}/giro: il resto al prossimo run)`); break; }
      const key = matchKey(tappaId, m);
      if (state.posted[key]) continue;                       // gia pubblicata
      if (!m.consistent) { console.log('salto (incoerente) ' + key); continue; }
      let buf;
      try { buf = await renderRisultato(m, info); }
      catch (e){ console.log('render fail ' + key + ': ' + e.message); continue; }
      const rel = putImage(key, buf);
      queue.push({ key, imageRel: rel, caption: buildResultCaption(m, info),
        label: `${pairSurnames(m.teamA)} ${m.setsA}-${m.setsB} ${pairSurnames(m.teamB)} (${m.round || ''})` });
    }
  }
  saveQueue(queue);
  console.log(`Pronte da pubblicare: ${queue.length}`);
}

async function doPublish(){
  const queue = loadQueue();
  if (!queue.length){ console.log('Coda vuota: niente da pubblicare.'); return; }
  const DRY = /^(1|true|yes|si)$/i.test(process.env.DRY_RUN || '');   // prova: mostra senza pubblicare
  const igUserId = process.env.IG_USER_ID || '';
  const token = process.env.IG_TOKEN || '';
  if (!DRY && (!igUserId || !token)){ console.log('IG_USER_ID/IG_TOKEN mancanti nei Secrets: niente pubblicazione.'); return; }
  // Telegram (facoltativo): un messaggio con la grafica per ogni storia pubblicata.
  const tgToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const tgChat = process.env.TELEGRAM_CHAT_ID || '';
  async function notify(item, testo){
    if (!tgToken || !tgChat) return;
    try { const png = readFileSync(join(ROOT, item.imageRel));
      await sendPreview({ token: tgToken, chatId: tgChat, png, caption: testo }); }
    catch (e){ console.log('telegram fail ' + item.key + ': ' + e.message); }
  }
  const state = loadState();
  let ok = 0;
  for (const item of queue){
    if (state.posted[item.key]) continue;
    const imageUrl = rawUrl(item.imageRel);
    if (DRY){
      console.log('[PROVA] pubblicherei ' + item.key + ' — ' + item.label + '\n        immagine: ' + imageUrl);
      await notify(item, '🧪 PROVA — pubblicherei questa storia:\n' + item.label);
      ok++; continue;
    }
    try {
      const id = await publishToInstagram({ igUserId, token, imageUrl, asStory: true });
      state.posted[item.key] = { at: Date.now(), igId: id };
      saveState(state);                                      // salva dopo OGNI pubblicazione (progresso parziale)
      ok++;
      console.log('✓ pubblicata ' + item.key + ' — ' + item.label);
      await notify(item, '✅ Storia pubblicata su Instagram\n' + item.label);
    } catch (e){
      console.log('✗ pubblica fail ' + item.key + ': ' + e.message);
    }
  }
  clearQueue();
  console.log(DRY ? `[PROVA] pubblicherei ${ok}/${queue.length} storie (niente postato davvero).`
                  : `Storie pubblicate: ${ok}/${queue.length}`);
}

const mode = process.argv[2];
if (mode === 'render') await doRender();
else if (mode === 'publish') await doPublish();
else { console.error('Uso: node publish-gh.mjs render|publish'); process.exit(2); }
