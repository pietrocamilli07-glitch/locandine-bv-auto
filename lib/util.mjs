// Config da variabili d'ambiente + fetch della pagina tappa (lato server, niente CORS).
import { NOTABLE_DEFAULT } from './parse.mjs';

export function readConfig(){
  const e = process.env;
  return {
    tappaUrls: (e.TAPPA_URLS || '').split(',').map(s => s.trim()).filter(Boolean),
    tgToken:  e.TELEGRAM_BOT_TOKEN || '',
    tgChat:   e.TELEGRAM_CHAT_ID || '',
    igUser:   e.IG_USER_ID || '',
    igToken:  e.IG_TOKEN || '',
    publishMode: (e.PUBLISH_MODE || 'story').toLowerCase(),   // 'story' (default) | 'feed'
    makeWebhook: (e.MAKE_WEBHOOK_URL || '').trim(),
    siteUrl: (e.SITE_URL || e.URL || '').replace(/\/+$/, ''),
    roundsRe: e.ROUNDS_REGEX ? new RegExp(e.ROUNDS_REGEX, 'i') : NOTABLE_DEFAULT,
  };
}

export async function fetchTappa(url){
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (AutoBV)' }, redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.text();
}

export function tappaIdFromUrl(url){
  const m = url.match(/(\d{3,})/);
  return m ? m[1] : url.replace(/[^a-z0-9]+/gi, '').slice(-12);
}
