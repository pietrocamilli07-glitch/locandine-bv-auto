// Bot Telegram: invia l'anteprima con i bottoni Pubblica/Scarta e gestisce le risposte.
const API = (token) => `https://api.telegram.org/bot${token}`;

export async function sendApprovalPhoto({ token, chatId, png, caption, key }){
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('caption', (caption||'').slice(0, 1024));
  fd.append('reply_markup', JSON.stringify({
    inline_keyboard: [[
      { text: '✅ Pubblica', callback_data: 'pub:' + key },
      { text: '❌ Scarta',   callback_data: 'del:' + key }
    ]]
  }));
  fd.append('photo', new Blob([png], { type: 'image/png' }), 'risultato.png');
  const r = await fetch(`${API(token)}/sendPhoto`, { method: 'POST', body: fd });
  return r.json();
}

export async function answerCallback({ token, id, text }){
  await fetch(`${API(token)}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text: text || '' })
  });
}

// Toglie i bottoni e aggiorna la didascalia con l'esito.
export async function finalizeMessage({ token, chatId, messageId, caption }){
  await fetch(`${API(token)}/editMessageCaption`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId, message_id: messageId,
      caption: (caption||'').slice(0,1024), reply_markup: { inline_keyboard: [] }
    })
  });
}

export async function sendMessage({ token, chatId, text }){
  await fetch(`${API(token)}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// Versione "leggera": foto + didascalia, SENZA bottoni (pubblichi a mano).
export async function sendPreview({ token, chatId, png, caption }){
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('caption', (caption||'').slice(0, 1024));
  fd.append('photo', new Blob([png], { type: 'image/png' }), 'risultato.png');
  const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: fd });
  return r.json();
}
