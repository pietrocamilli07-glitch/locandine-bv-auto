// Pubblicazione su Instagram via Graph API ufficiale Meta.
// Default: STORIA (la grafica è 9:16, formato perfetto). Feed opzionale (richiede immagine 4:5/1:1).
const G = 'https://graph.facebook.com/v23.0';

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

// userTags: array di { username, x, y } (menzioni). Sulle Storie sono supportate dal 9/7/2025.
// I tag vanno passati alla creazione del container: non si possono aggiungere dopo la pubblicazione.
export async function publishToInstagram({ igUserId, token, imageUrl, caption, asStory, userTags }){
  const params = { image_url: imageUrl, access_token: token };
  if (asStory) params.media_type = 'STORIES';
  else if (caption) params.caption = caption;
  if (Array.isArray(userTags) && userTags.length) params.user_tags = JSON.stringify(userTags);
  const container = await post(`${igUserId}/media`, params);
  await waitReady(container.id, token);
  const published = await post(`${igUserId}/media_publish`, { creation_id: container.id, access_token: token });
  return published.id;
}
