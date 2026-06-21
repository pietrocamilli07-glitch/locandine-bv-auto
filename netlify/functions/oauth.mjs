// Pagina di collegamento Instagram: scambia il "code" con un token NON in scadenza (token Pagina)
// e salva token + ID Instagram su Blobs. Da qui in poi il watcher pubblica le storie da solo.
import { setIgCreds } from '../../lib/store.mjs';

const APP_ID = '28254067534194784';
const G = 'https://graph.facebook.com/v21.0';
const SCOPE = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management';

function page(body){
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collega Instagram</title>
<style>body{font-family:system-ui,Arial;background:#0f1326;color:#eef0f5;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}
.box{max-width:540px;background:#161b34;padding:30px;border-radius:16px;line-height:1.6}
h2{margin:0 0 8px} b{color:#ff9100}
a.btn{display:inline-block;margin-top:16px;background:#ff9100;color:#14141c;font-weight:800;padding:14px 22px;border-radius:11px;text-decoration:none}
code{background:#0c1024;padding:2px 6px;border-radius:6px;font-size:12px;word-break:break-all}</style></head><body><div class="box">${body}</div></body></html>`;
}

export default async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;
  const redirect = `${origin}/.netlify/functions/oauth`;
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error_description') || url.searchParams.get('error_message') || url.searchParams.get('error');
  const secret = process.env.APP_SECRET || '';

  if (err) return new Response(page(`<h2>⚠️ Errore da Facebook</h2><p>${err}</p><p><a class="btn" href="${redirect}">Riprova</a></p>`), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  if (!code) {
    const auth = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(SCOPE)}`;
    return new Response(page(`<h2>🏐 Collega <b>Instagram</b></h2><p>Premi il bottone, accedi con Facebook e autorizza <b>Beach volley ita</b> + <b>beachvolleyita_</b>. Poi torni qui in automatico e il collegamento è fatto.</p><p><a class="btn" href="${auth}">Collega Instagram</a></p>`), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  if (!secret) return new Response(page(`<h2>⚠️ Manca APP_SECRET</h2><p>Aggiungi su Netlify la variabile <code>APP_SECRET</code> (è la "Chiave segreta" dell'app Meta), rifai il deploy e ricarica questa pagina.</p>`), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  try {
    let r = await fetch(`${G}/oauth/access_token?client_id=${APP_ID}&client_secret=${encodeURIComponent(secret)}&redirect_uri=${encodeURIComponent(redirect)}&code=${encodeURIComponent(code)}`);
    let j = await r.json(); if (j.error) throw new Error('scambio code: ' + j.error.message);
    const shortTok = j.access_token;
    r = await fetch(`${G}/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${encodeURIComponent(secret)}&fb_exchange_token=${encodeURIComponent(shortTok)}`);
    j = await r.json(); if (j.error) throw new Error('token lungo: ' + j.error.message);
    const longTok = j.access_token;
    r = await fetch(`${G}/me/accounts?fields=name,access_token,instagram_business_account&access_token=${encodeURIComponent(longTok)}`);
    j = await r.json(); if (j.error) throw new Error('pagine: ' + j.error.message);
    const pageWithIg = (j.data || []).find(p => p.instagram_business_account);
    if (!pageWithIg) throw new Error('Nessuna Pagina Facebook con account Instagram collegato trovata.');
    const igUserId = pageWithIg.instagram_business_account.id;
    const igToken = pageWithIg.access_token; // token Pagina: non scade
    await setIgCreds({ igUserId, igToken, connectedAt: Date.now(), pageName: pageWithIg.name });
    return new Response(page(`<h2>✅ Instagram collegato!</h2><p>Pagina: <b>${pageWithIg.name}</b></p><p>ID Instagram: <code>${igUserId}</code></p><p>Da ora il servizio pubblica le <b>storie</b> in automatico. Puoi chiudere questa pagina.</p>`), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    return new Response(page(`<h2>⚠️ Errore</h2><p>${e.message}</p><p><a class="btn" href="${redirect}">Riprova da capo</a></p>`), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};
