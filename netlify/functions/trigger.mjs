// Lancia un controllo a mano (apri questo indirizzo nel browser).
import { runWatch } from '../../lib/run.mjs';
export default async () => {
  const r = await runWatch();
  return new Response(r.log.join('\n'), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
