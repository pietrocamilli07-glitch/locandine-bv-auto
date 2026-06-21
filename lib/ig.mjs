// Pubblicazione su Instagram via Graph API ufficiale Meta.
// Default: STORIA (la grafica è 9:16, formato perfetto). Feed opzionale (richiede immagine 4:5/1:1).
const G = 'https://graph.facebook.com/v21.0';

async function post(pathName, params){
  const r = await fetch(`${G}/${pathName}`, { method: 'POST', body: new URLSearchParams(params) });
  const j = await r.json();
  if (j.error) throw new Error('IG ' + (j.error.message || JSON.stringify(j.error)));
  return j;
}

async function waitReady(containerId, token, tries = 6){
  for (let i = 0; i < tries; i++){
    const r = await fetch(`${G}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    const j = await r.json();
    if (j.status_code === 'FINISHED') return;
    if (j.status_code === 'ERROR') throw new Error('IG: container in ERROR');
    await new Promise(res => setTimeout(res, 1500));
  }
  // se non FINISHED dopo i tentativi, proviamo comunque a pubblicare
}

export async function publishToInstagram({ igUserId, token, imageUrl, caption, asStory }){
  const params = { image_url: imageUrl, access_token: token };
  if (asStory) params.media_type = 'STORIES';
  else if (caption) params.caption = caption;
  const container = await post(`${igUserId}/media`, params);
  await waitReady(container.id, token);
  const published = await post(`${igUserId}/media_publish`, { creation_id: container.id, access_token: token });
  return published.id;
}
