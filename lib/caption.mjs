// Didascalia per il post/storia di un risultato. Scheletro fisso, tono sobrio.
import { pairSurnames } from './parse.mjs';

export function buildResultCaption(match, info){
  const gen = (info.genere==='femminile') ? 'FEMMINILE' : 'MASCHILE';
  const loc = (info.luogo||'').toUpperCase();
  const dat = (info.data||'').toUpperCase();
  const a = pairSurnames(match.teamA).toUpperCase();
  const b = pairSurnames(match.teamB).toUpperCase();
  const round = (match.round||'').trim();
  const parz = (match.sets||[]).map(s=>s[0]+'-'+s[1]).join('  ');
  const L=[];
  L.push('🏐 RISULTATO · ' + gen);
  const ld = loc + (loc&&dat ? ' — ' : '') + dat;
  if(ld) L.push('📍 ' + ld);
  L.push('');
  if(round) L.push(round.toUpperCase());
  L.push(`${a}  ${match.setsA}-${match.setsB}  ${b}`);
  if(parz) L.push('Parziali: ' + parz);
  L.push('');
  L.push('Segui @beachvolleyita_ per tutti i risultati e gli aggiornamenti delle tappe.');
  L.push('');
  L.push('#beachvolley #beachvolleyita #beachvolleyitalia #fipav #campionatoitaliano #sandvolley #volley');
  return L.join('\n');
}
