// Segue UNA O PIÙ tappe (maschile + femminile insieme), trova le partite finite,
// genera la grafica e PUBBLICA come STORIA Instagram.
// Anti-doppioni: (1) un solo controllo alla volta (lock); (2) la partita viene marcata
// come "fatta" e salvata PRIMA di pubblicare, così un eventuale timeout dopo la pubblicazione
// non la fa ripubblicare al giro successivo.
import { parseTappa, pairSurnames } from './parse.mjs';
import { renderRisultato } from './render.mjs';
import { buildResultCaption } from './caption.mjs';
import { loadState, saveState, putImage, matchKey, getConfig, getIgCreds, acquireLock, releaseLock } from './store.mjs';
import { sendPreview } from './telegram.mjs';
import { publishToInstagram } from './ig.mjs';
import { readConfig, fetchTappa, tappaIdFromUrl } from './util.mjs';

const MAX_PER_RUN = 10;
const ALL = /.*/;

export function splitTappe(raw){
  return String(raw||'').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
}

export async function runWatch(){
  const cfg = readConfig();
  const log = [];
  const conf = await getConfig();
  const ig = await getIgCreds();
  const tappe = splitTappe(conf.tappaUrl || cfg.tappaUrls.join('\n'));
  if (!tappe.length) return { ok:false, added:0, log:['Nessuna tappa impostata: apri la pagina di controllo e incolla i link.'] };
  const canIG = !!(ig.igUserId && ig.igToken);
  const canTG = !!(cfg.tgToken && cfg.tgChat);
  if (!canIG && !canTG) return { ok:false, added:0, log:['Instagram non collegato (apri /oauth) e Telegram non configurato.'] };
  const roundsRe = (conf.rounds === 'notable') ? /semifinal|finale/i : ALL;

  // Un solo controllo alla volta: se ce n'è già uno in corso, esci subito (anti-doppioni).
  if (!(await acquireLock())) {
    return { ok:true, added:0, log:['Un altro controllo è già in corso: salto per evitare doppioni.'] };
  }

  let added = 0;
  try {
    const state = await loadState();
    for (const tappaUrl of tappe) {
      if (added >= MAX_PER_RUN) break;
      let html;
      try { html = await fetchTappa(tappaUrl); }
      catch (e) { log.push('lettura fallita ' + tappaUrl + ': ' + e.message); continue; }
      const tappaId = tappaIdFromUrl(tappaUrl);
      const { info, notable } = parseTappa(html, { rounds: roundsRe });
      log.push(`Tappa ${tappaId} — ${info.luogo || '?'} (${info.genere||'?'}) — ${notable.length} partite finite.`);
      for (const m of notable) {
        if (added >= MAX_PER_RUN) { log.push(`(limite ${MAX_PER_RUN}/giro: il resto al prossimo controllo)`); break; }
        const key = matchKey(tappaId, m);
        if (state.posted[key] || state.pending[key]) continue;
        let png;
        try { png = await renderRisultato(m, info); }
        catch (e) { log.push('render fail ' + key + ': ' + e.message); continue; }

        // PRENOTA prima di pubblicare: marca "fatta" e salva SUBITO. Così se la funzione
        // va in timeout dopo la pubblicazione (ma prima del salvataggio), al giro dopo non ripubblica.
        state.posted[key] = { at: Date.now() };
        await saveState(state);
        try {
          if (canIG) {
            await putImage(key, png);
            const imageUrl = `${cfg.siteUrl}/.netlify/functions/image?key=${encodeURIComponent(key)}`;
            await publishToInstagram({ igUserId: ig.igUserId, token: ig.igToken, imageUrl, asStory: true });
          } else {
            await sendPreview({ token: cfg.tgToken, chatId: cfg.tgChat, png, caption: buildResultCaption(m, info) });
          }
          added++;
          if (canIG && canTG) {
            try { await sendPreview({ token: cfg.tgToken, chatId: cfg.tgChat, png,
              caption: `✅ Storia pubblicata su Instagram\n${pairSurnames(m.teamA)} ${m.setsA}-${m.setsB} ${pairSurnames(m.teamB)} (${m.round||''})` }); } catch(e){}
          }
        } catch (e) {
          // Errore "pulito" (token errato, rete...): annulla la prenotazione così riprova al prossimo giro.
          delete state.posted[key];
          await saveState(state);
          log.push('pubblica fail ' + key + ': ' + e.message);
        }
      }
    }
    log.push((canIG ? 'Storie pubblicate: ' : 'Inviate su Telegram: ') + added);
    return { ok:true, added, log };
  } finally {
    await releaseLock();
  }
}
