// Riceve il tap sui bottoni Telegram: "Pubblica" -> posta su Instagram; "Scarta" -> elimina dalla coda.
import { loadState, saveState } from '../../lib/store.mjs';
import { answerCallback, finalizeMessage } from '../../lib/telegram.mjs';
import { publishToInstagram } from '../../lib/ig.mjs';
import { readConfig } from '../../lib/util.mjs';

export default async (req) => {
  const cfg = readConfig();
  let update;
  try { update = await req.json(); } catch (e) { return new Response('bad', { status: 400 }); }
  const cq = update.callback_query;
  if (!cq) return new Response('ok');                          // ignora messaggi non-bottone

  const fromChat = String(cq.message && cq.message.chat ? cq.message.chat.id : '');
  if (cfg.tgChat && fromChat !== String(cfg.tgChat)) {
    await answerCallback({ token: cfg.tgToken, id: cq.id, text: 'Non autorizzato' });
    return new Response('ok');
  }
  const [action, key] = String(cq.data || '').split(':');
  const state = await loadState();
  const item = state.pending[key];
  if (!item) {
    await answerCallback({ token: cfg.tgToken, id: cq.id, text: 'Già gestito' });
    return new Response('ok');
  }
  const msgId = cq.message.message_id;

  if (action === 'del') {
    delete state.pending[key]; await saveState(state);
    await finalizeMessage({ token: cfg.tgToken, chatId: fromChat, messageId: msgId, caption: (item.caption || '') + '\n\n— ❌ Scartato' });
    await answerCallback({ token: cfg.tgToken, id: cq.id, text: 'Scartato' });
    return new Response('ok');
  }

  if (action === 'pub') {
    try {
      const imageUrl = `${cfg.siteUrl}/.netlify/functions/image?key=${encodeURIComponent(key)}`;
      const asStory = cfg.publishMode !== 'feed';
      await publishToInstagram({ igUserId: cfg.igUser, token: cfg.igToken, imageUrl, caption: item.caption, asStory });
      state.posted[key] = { at: Date.now() }; delete state.pending[key]; await saveState(state);
      await finalizeMessage({ token: cfg.tgToken, chatId: fromChat, messageId: msgId, caption: (item.caption || '') + `\n\n— ✅ Pubblicato su Instagram (${asStory ? 'storia' : 'feed'})` });
      await answerCallback({ token: cfg.tgToken, id: cq.id, text: 'Pubblicato ✅' });
    } catch (e) {
      await answerCallback({ token: cfg.tgToken, id: cq.id, text: 'Errore: ' + String(e.message).slice(0, 180) });
    }
    return new Response('ok');
  }
  await answerCallback({ token: cfg.tgToken, id: cq.id, text: '' });
  return new Response('ok');
};
