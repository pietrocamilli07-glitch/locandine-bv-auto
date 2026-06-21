// Pagina di controllo: scegli una o più tappe, pubblica 1 storia di prova, azzera le "già viste".
import { getConfig, setConfig, loadState, saveState, putImage, getIgCreds, matchKey } from '../../lib/store.mjs';
import { runWatch, splitTappe } from '../../lib/run.mjs';
import { parseTappa, pairSurnames } from '../../lib/parse.mjs';
import { renderRisultato } from '../../lib/render.mjs';
import { publishToInstagram } from '../../lib/ig.mjs';
import { fetchTappa, tappaIdFromUrl, readConfig } from '../../lib/util.mjs';
import { sendPreview } from '../../lib/telegram.mjs';

function esc(s){ return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function page(conf, ig, msg){
  const url = conf.tappaUrl || '';
  const rounds = conf.rounds || 'all';
  const igState = ig.igUserId ? `✅ Instagram collegato (${esc(ig.pageName||'')})` : '⚠️ Instagram non collegato — apri /.netlify/functions/oauth';
  return `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Controllo Auto-Instagram</title>
<style>
 body{font-family:system-ui,Arial;background:#0f1326;color:#eef0f5;margin:0;padding:24px;display:flex;justify-content:center}
 .box{max-width:560px;width:100%}
 h2{margin:0 0 4px;font-size:22px} h2 b{color:#ff9100}
 p.s{color:#aab0c6;font-size:14px;margin:0 0 12px;line-height:1.5}
 .ig{font-size:13px;margin:0 0 16px;color:#cfe}
 label{display:block;font-weight:700;margin:16px 0 6px;font-size:14px}
 input,select,textarea{width:100%;box-sizing:border-box;padding:13px;border-radius:10px;border:1px solid #2a3050;background:#161b34;color:#fff;font-size:15px;font-family:inherit}
 textarea{min-height:130px;resize:vertical;line-height:1.7}
 button{margin-top:12px;width:100%;padding:14px;border:0;border-radius:11px;font-weight:800;font-size:15px;cursor:pointer}
 .save{background:#ff9100;color:#14141c}.run{background:#0c2bd6;color:#fff}.test{background:#0a8a3a;color:#fff}.reset{background:#3a2030;color:#ffb4c4}
 .msg{margin-top:18px;padding:13px;border-radius:10px;background:#16223a;white-space:pre-wrap;font-size:13px;color:#d6e6ff;line-height:1.5}
 .cur{margin-top:18px;font-size:13px;color:#aab0c6} .cur b{color:#fff;word-break:break-all;white-space:pre-wrap}
</style></head><body><div class="box">
<h2>🏐 Controllo <b>Auto-Instagram</b></h2>
<p class="ig">${igState}</p>
<p class="s">Incolla i link delle tappe da seguire — <b>uno per riga</b> (fino a 4, es. maschile + femminile in contemporanea; se servono di più, aggiungi righe). Poi premi <b>Salva</b>: quando le partite finiscono, escono le <b>storie</b> da sole.</p>
<form method="POST">
 <label>Link tappe (uno per riga, fino a 4)</label>
 <textarea name="url" rows="4" placeholder="https://beachvolley.federvolley.it/node/XXXXX   (es. maschile)
https://beachvolley.federvolley.it/node/YYYYY   (es. femminile)
https://beachvolley.federvolley.it/node/...
https://beachvolley.federvolley.it/node/..." autocomplete="off">${esc(url)}</textarea>
 <label>Quali partite seguire</label>
 <select name="rounds">
   <option value="all"${rounds==='all'?' selected':''}>Tutte le partite</option>
   <option value="notable"${rounds==='notable'?' selected':''}>Solo semifinali e finali</option>
 </select>
 <button class="save" name="action" value="save">💾 Salva tappe</button>
 <button class="run" name="action" value="run">▶️ Salva e controlla adesso</button>
 <button class="test" name="action" value="test">🧪 Pubblica 1 storia di PROVA</button>
 <button class="reset" name="action" value="reset">🔄 Azzera partite già viste</button>
</form>
${msg ? `<div class="msg">${esc(msg)}</div>` : ''}
<p class="cur">Tappe attuali:\n<b>${esc(url) || '(nessuna)'}</b></p>
</div></body></html>`;
}

export default async (req) => {
  const origin = new URL(req.url).origin;
  if (req.method === 'POST') {
    let url='', rounds='all', action='save';
    try { const f = await req.formData(); url=(f.get('url')||'').toString().trim(); rounds=(f.get('rounds')||'all').toString(); action=(f.get('action')||'save').toString(); } catch(e){}
    let msg = '';

    if (action === 'reset') {
      await saveState({ posted:{}, pending:{} });
      msg = '🔄 Fatto: il servizio ricomincia da zero (ripubblicherà le partite finite delle tappe impostate).';
    } else {
      await setConfig({ tappaUrl: url, rounds });
      if (action === 'save') msg = url ? '✅ Tappe salvate.' : '⚠️ Nessun link inserito.';
      else if (action === 'run') { const r = await runWatch(); msg = '✅ Tappe salvate.\n\n' + r.log.join('\n'); }
      else if (action === 'test') {
        const ig = await getIgCreds();
        const first = splitTappe(url)[0];
        if (!ig.igUserId) msg = '⚠️ Instagram non collegato.';
        else if (!first) msg = '⚠️ Incolla prima un link tappa.';
        else {
          try {
            const html = await fetchTappa(first);
            const { info, notable } = parseTappa(html, { rounds: rounds==='notable' ? /semifinal|finale/i : /.*/ });
            if (!notable.length) msg = 'Nessuna partita finita trovata in questa tappa.';
            else {
              const m = notable[notable.length-1];
              const tappaId = tappaIdFromUrl(first);
              const key = matchKey(tappaId, m);
              const png = await renderRisultato(m, info);
              await putImage(key, png);
              const imageUrl = `${origin}/.netlify/functions/image?key=${encodeURIComponent(key)}`;
              await publishToInstagram({ igUserId: ig.igUserId, token: ig.igToken, imageUrl, asStory: true });
              // marca come già fatta, così il controllo automatico NON la ripubblica (niente doppioni)
              const st = await loadState(); st.posted[key] = { at: Date.now() }; await saveState(st);
              const c = readConfig();
              if (c.tgToken && c.tgChat) { try { await sendPreview({ token: c.tgToken, chatId: c.tgChat, png, caption: `✅ Storia pubblicata su Instagram\n${pairSurnames(m.teamA)} ${m.setsA}-${m.setsB} ${pairSurnames(m.teamB)} (${m.round||''})` }); } catch(e){} }
              msg = `✅ Storia di PROVA pubblicata (e segnata come fatta, niente doppioni)!\n${pairSurnames(m.teamA)} ${m.setsA}-${m.setsB} ${pairSurnames(m.teamB)} (${m.round||''})\n\nControlla le tue storie su Instagram 📲`;
            }
          } catch (e) { msg = '⚠️ Errore pubblicazione: ' + e.message; }
        }
      }
    }
    const conf = await getConfig(); const ig = await getIgCreds();
    return new Response(page(conf, ig, msg), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const conf = await getConfig(); const ig = await getIgCreds();
  return new Response(page(conf, ig, ''), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
