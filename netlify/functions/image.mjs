// Serve l'immagine generata a un URL pubblico (Instagram la scarica da qui). JPEG.
import { getImage } from '../../lib/store.mjs';
export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  if (!key) return new Response('missing key', { status: 400 });
  const buf = await getImage(key);
  if (!buf) return new Response('not found', { status: 404 });
  return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
};
