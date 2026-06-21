// Ogni 15 minuti controlla la tappa scelta e manda su Telegram le nuove partite finite.
import { runWatch } from '../../lib/run.mjs';
export const config = { schedule: '*/30 * * * *' };
export default async () => {
  const r = await runWatch();
  console.log(r.log.join(' | '));
  return new Response(r.log.join('\n'), { status: 200 });
};
