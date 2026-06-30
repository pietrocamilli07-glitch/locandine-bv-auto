// Tag-utente (menzioni) per le Storie Instagram.
// Legge la rubrica giocatori (id federvolley -> @handle IG) e, per ogni partita,
// mappa i 4 giocatori (vincitori + sconfitti) sui rispettivi handle.
// Chi non ha handle NON blocca: viene saltato e registrato tra i "tag mancanti".
import { readFileSync, existsSync } from 'node:fs';

// CSV minimale ma robusto: gestisce i campi "tra virgolette" (cognome_nome) e le "" interne.
function splitCsvLine(line){
  const out=[]; let cur=''; let q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(q){ if(c==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else q=false; } else cur+=c; }
    else { if(c==='"') q=true; else if(c===','){ out.push(cur); cur=''; } else cur+=c; }
  }
  out.push(cur); return out;
}

// Normalizza un handle: via spazi e @ iniziale (Instagram non li vuole nel param). '' se vuoto.
export function cleanHandle(h){
  return String(h||'').trim().replace(/^@+/,'').trim();
}

// rubrica CSV -> { handles: Map(id->handle pulito senza @), names: Map(id->cognome_nome) }
// La rubrica puo' avere righe duplicate per lo stesso id (ASSOLUTO + UNDER 20):
// un handle non vuoto vince sempre su una riga duplicata senza handle.
export function loadRubrica(path){
  const handles=new Map(), names=new Map();
  if(!existsSync(path)) return { handles, names };
  const lines=readFileSync(path,'utf8').split(/\r?\n/).filter(l=>l.length);
  if(!lines.length) return { handles, names };
  const head=splitCsvLine(lines[0]).map(s=>s.trim().toLowerCase());
  const iId=head.indexOf('id'), iNome=head.indexOf('cognome_nome'), iH=head.indexOf('handle');
  for(let k=1;k<lines.length;k++){
    const c=splitCsvLine(lines[k]); if(iId<0||c.length<=iId) continue;
    const id=Number(String(c[iId]).trim()); if(!id) continue;
    const nome=iNome>=0?String(c[iNome]||'').trim():'';
    const handle=iH>=0?cleanHandle(c[iH]):'';
    if(nome && !names.has(id)) names.set(id, nome);
    if(handle && !handles.get(id)) handles.set(id, handle);   // il primo handle valido vince
  }
  return { handles, names };
}

// Coordinate "sfalsate" per n tag: una riga in basso, x distribuita ~0.2..0.8,
// y leggermente alternata cosi' i tag non si sovrappongono. (origine in alto a sinistra)
export function tagCoords(n){
  const out=[];
  for(let i=0;i<n;i++){
    const x = n<=1 ? 0.5 : 0.5 + ((i-(n-1)/2)/n)*0.6;
    const y = 0.9 + ((i%2)? 0.04 : -0.04);                    // alterna 0.86 / 0.94
    out.push({ x:+x.toFixed(3), y:+y.toFixed(3) });
  }
  return out;
}

// Per una partita: { userTags:[{username,x,y}], missing:[{id,nome,tappa}] }.
// match.winnerIds + match.loserIds sono gli id federvolley dei 4 giocatori.
export function buildUserTags(match, rubrica, { tappa='' }={}){
  const ids=[...(match.winnerIds||[]), ...(match.loserIds||[])];
  const resolved=[], missing=[];
  for(const id of ids){
    const h=rubrica.handles.get(id);
    if(h) resolved.push(h);
    else missing.push({ id, nome: rubrica.names.get(id) || '', tappa });
  }
  const coords=tagCoords(resolved.length);
  const userTags=resolved.map((username,i)=>({ username, x:coords[i].x, y:coords[i].y }));
  return { userTags, missing };
}
