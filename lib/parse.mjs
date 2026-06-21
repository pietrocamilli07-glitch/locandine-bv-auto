// Parsing federvolley lato server — porta le funzioni del sito Locandine BV.
// Converte l'HTML grezzo in testo "tipo innerText" e ne estrae partite + info tappa.

export function decodeEntities(s){
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)))
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n))
    .replace(/&nbsp;/gi,' ')
    .replace(/&(?:apos|rsquo|lsquo|#0?39|#8217|#8216);/gi,"'")
    .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"');
}

// HTML grezzo -> testo con a-capo tra i blocchi (come fa il browser con innerText).
// NB: non spezza <a>/<span> inline, così i due giocatori di una coppia restano sulla stessa riga.
export function htmlToText(raw){
  if(!/[<][a-z!\/]/i.test(raw)) return raw; // è già testo
  let s=raw;
  s=s.replace(/<!--[\s\S]*?-->/g,' ');
  s=s.replace(/<(script|style|head|noscript|svg)[\s\S]*?<\/\1>/gi,' ');
  s=s.replace(/<\/(td|th)>/gi,' | ');
  s=s.replace(/<br\s*\/?>/gi,'\n');
  s=s.replace(/<li[^>]*>/gi,'\n');
  s=s.replace(/<\/(p|div|li|ul|ol|h[1-6]|section|article|header|footer|tr|table|main)>/gi,'\n');
  s=s.replace(/<[^>]+>/g,'');           // via i tag rimasti (inline)
  s=decodeEntities(s);
  s=s.replace(/\r/g,'');
  s=s.split('\n').map(l=>l.replace(/[ \t ]+/g,' ').trim()).join('\n');
  s=s.replace(/\n{3,}/g,'\n\n');
  return s.trim();
}

export function stripLinks(t){return String(t).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1');}

/* ---- cognomi (formato federvolley: "COGNOME NOME") ---- */
export function surnames(pair){
  var ps=String(pair).split(/\s+-\s+/); if(ps.length<2) ps=String(pair).split(' - ');
  function sn(p){var t=p.trim().split(/\s+/);return t.length<=1?p.trim():t.slice(0,-1).join(' ');}
  return ps.map(sn);
}
export function pairSurnames(pair){return surnames(pair).join(' / ');}

/* ---- date e luogo ---- */
const MESI={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
const MESI_UP=['','GENNAIO','FEBBRAIO','MARZO','APRILE','MAGGIO','GIUGNO','LUGLIO','AGOSTO','SETTEMBRE','OTTOBRE','NOVEMBRE','DICEMBRE'];
function findDate(t,l){var re=new RegExp(l+"[\\s\\S]{0,40}?(\\d{1,2})\\s+([A-Za-z\\u00C0-\\u017F]+)\\s+(20\\d{2})","i");var m=t.match(re);if(!m)return null;var mo=MESI[m[2].toLowerCase()];if(!mo)return null;return{day:+m[1],m:mo,y:+m[3]};}
function fmtDate(d1,d2){if(!d1)return'';if(!d2)d2=d1;if(d1.y===d2.y&&d1.m===d2.m&&d1.day===d2.day)return d1.day+' '+MESI_UP[d1.m]+' '+d1.y;if(d1.y===d2.y&&d1.m===d2.m)return d1.day+'-'+d2.day+' '+MESI_UP[d1.m]+' '+d1.y;if(d1.y===d2.y)return d1.day+' '+MESI_UP[d1.m]+' - '+d2.day+' '+MESI_UP[d2.m]+' '+d1.y;return d1.day+' '+MESI_UP[d1.m]+' '+d1.y+' - '+d2.day+' '+MESI_UP[d2.m]+' '+d2.y;}
function extractLocation(title,text){var m=text.match(/Location\s+([^\n\r]+?)\s+-\s+[A-ZÀ-Ý][A-ZÀ-Ý'\s\-]+/);if(m&&m[1]&&m[1].trim().length>1)return m[1].trim();if(title){var t=title.replace(/\s*\|.*$/,'').trim();var i=t.lastIndexOf(' - ');if(i>=0)return t.slice(i+3).trim();}return null;}
function extractGenere(t){var m=t.match(/Genere\s+(Maschile|Femminile|Misto)/i);return m?m[1].toLowerCase():null;}
// Categoria torneo (UNDER 20 / ASSOLUTO / MASTER ...) dal titolo o dal testo. Da mostrare SEMPRE sulla grafica.
function catFrom(s){
  if(!s) return '';
  var m=s.match(/\bunder\s*-?\s*(\d{1,2})\b/i)||s.match(/\bU\s*-?\s*(\d{2})\b/);
  if(m) return 'UNDER '+m[1];
  if(/assolut/i.test(s)) return 'ASSOLUTO';
  if(/master/i.test(s)) return 'MASTER';
  if(/senior/i.test(s)) return 'SENIORES';
  if(/junior/i.test(s)) return 'JUNIORES';
  return '';
}
export function extractCategoria(title,text){ return catFrom(title)||catFrom((text||'').slice(0,400))||''; }

export function parsePageInfo(html){
  const text=htmlToText(html);
  let title='';
  const mt=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const mh=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  title=decodeEntities(((mh&&mh[1])||(mt&&mt[1])||'').replace(/<[^>]+>/g,'')).trim();
  const luogoRaw=extractLocation(title,text);
  return {
    luogo: luogoRaw?luogoRaw.toUpperCase():'',
    data: fmtDate(findDate(text,'Data inizio'),findDate(text,'Data fine')),
    genere: extractGenere(text)||'maschile',
    categoria: extractCategoria(title,text),
    title
  };
}

/* ---- partite: PARSER STRUTTURALE (legge vincitore/sconfitto, set in .punteggio-singolo-set,
   id giocatori /node/<id>). Molto piu' affidabile dello split a-testo su "Gara n.".
   Stessa logica del front-end (tools/bv-parse.js). teamA = VINCITORE, set orientati sul vincitore. ---- */
function bvName(n){return decodeEntities(n).replace(/\s+/g,' ').trim();}                              // nome intero (per i tag)
function bvDisp(n){return bvName(n).replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();}       // senza (REGIONE)
function bvText(h){return decodeEntities(String(h).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function bvPlayers(seg){
  const out=[]; const r=/<a[^>]*\/node\/(\d+)[^>]*>([^<]+)<\/a>/g; let m;
  while((m=r.exec(seg))) out.push({id:+m[1],name:bvName(m[2])});
  return out;
}
function bvBlocks(html){
  const re=/<div class="risultato-wrapper"([^>]*)>/g; let m; const idx=[];
  while((m=re.exec(html))) idx.push({s:m.index,a:m[1],b:re.lastIndex});
  return idx.map((o,i)=>({attrs:o.a, body:html.slice(o.b, i+1<idx.length?idx[i+1].s:html.length)}));
}
function bvAttr(a,name){const r=new RegExp(name+'="([^"]*)"').exec(a);return r?r[1]:null;}
function bvHeader(body){
  const r=/intestazione[^>]*>([\s\S]*?)<\/div>/i.exec(body);
  const head=r?bvText(r[1]):'';
  const dt=/(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/.exec(head);
  const campo=/Campo:\s*([^-|]+?)\s*-\s*Gara\s*n\.?\s*(\d+)/i.exec(head);
  const girone=/GIRONE\s*([A-Za-z0-9]+)/i.exec(head);
  const roundM=/Round\s*([^|]+?)\s*$/i.exec(head);                       // main draw: "...-- RoundSemifinale"
  const phase=/Main\s*draw/i.test(head)?'Main draw':(/Qualificazioni/i.test(head)?'Qualificazioni':'');
  const round=roundM?roundM[1].trim():(girone?('Girone '+girone[1].toUpperCase()):phase);
  return { datetime: dt?(dt[1]+' '+dt[2]):null, campo: campo?campo[1].trim():null, num: campo?+campo[2]:null,
    phase, girone: girone?girone[1].toUpperCase():null, round };
}
function bvSide(body,cls){
  const re=cls==='vincitore'
    ? /elemento-riga-risultato[^"]*vincitore"([^]*?)<\/div>/i
    : /elemento-riga-risultato[^"]*sconfitto"([^]*?)<\/div>/i;
  const r=re.exec(body); if(!r) return null;
  const pl=bvPlayers(r[1]); return pl.length?pl:null;
}
function bvScore(body){
  const pm=/punteggio-match[^>]*>\s*([0-9]+)\s*-\s*([0-9]+)/.exec(body);  // tally "n - n"
  const sets=[]; const sr=/punteggio-singolo-set[^>]*>\s*<span>\s*([0-9]+)\s*-\s*([0-9]+)\s*<\/span>/g; let s;
  while((s=sr.exec(body))) sets.push([+s[1],+s[2]]);                     // parziali in ordine sinistra-destra
  return {n1:pm?+pm[1]:null, n2:pm?+pm[2]:null, sets};
}
function bvBlock(block){
  const h=bvHeader(block.body);
  const win=bvSide(block.body,'vincitore'), los=bvSide(block.body,'sconfitto');
  if(!win||!los) return null;
  const sc=bvScore(block.body);
  const iW=block.body.search(/vincitore"/), iL=block.body.search(/sconfitto"/);
  const winLeft=iW>=0 && (iL<0 || iW<iL);                                // vincitore a sinistra?
  const setsW=winLeft?sc.n1:sc.n2, setsL=winLeft?sc.n2:sc.n1;
  const sets=sc.sets.map(p=>winLeft?[p[0],p[1]]:[p[1],p[0]]);            // parziali orientati sul vincitore
  let won=0; for(const p of sets) if(p[0]>p[1]) won++;
  const consistent=(setsW==null)?false:(setsW===won);                   // set vinti == punteggio finale
  const pair=pl=>pl.map(p=>bvDisp(p.name)).join(' - ');
  return {
    num:h.num, id:(h.num!=null?('g'+h.num):null), day:(+bvAttr(block.attrs,'data-day')||null),
    datetime:h.datetime, campo:h.campo, phase:h.phase, round:h.round, girone:h.girone,
    teamA:pair(win), teamB:pair(los), setsA:setsW, setsB:setsL, sets,
    winnerIds:win.map(p=>p.id), loserIds:los.map(p=>p.id), consistent
  };
}

export function parseMatches(html){
  const out=[];
  for(const b of bvBlocks(html)){
    const m=bvBlock(b); if(!m) continue;
    let real=false; for(const s of m.sets){ if(Math.min(s[0],s[1])>0){real=true;break;} }
    if(!real) continue; // esclude walkover (21-0) e bye
    out.push(m);
  }
  return out;
}

// Quali round pubblicare in automatico (default: solo semifinali e finali).
export const NOTABLE_DEFAULT=/semifinal|finale/i;

export function parseTappa(html, opts={}){
  const info=parsePageInfo(html);
  const matches=parseMatches(html);
  const re=opts.rounds||NOTABLE_DEFAULT;
  const notable=matches.filter(m=>re.test(m.round||''));
  return {info, matches, notable};
}
