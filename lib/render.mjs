// Render lato server della grafica "Risultato" (1080x1920) — stesso codice canvas del sito.
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { surnames } from './parse.mjs';
import { FONTS, LOGO_BV, LOGO_CAMP } from './assets.mjs';

let _fonts=false;
function ensureFonts(){
  if(_fonts) return; _fonts=true;
  for(const f of FONTS){ try{ GlobalFonts.register(Buffer.from(f.b64,'base64'), f.name); }catch(e){} }
}
let _logos=null;
async function ensureLogos(){
  if(_logos) return _logos;
  async function ld(b64){ try{ return await loadImage(Buffer.from(b64,'base64')); }catch(e){ return null; } }
  _logos={ bv: await ld(LOGO_BV), camp: await ld(LOGO_CAMP) };
  return _logos;
}

/* ===== helpers + tema (identici al sito) ===== */
function rr(ctx,x,y,w,h,r){ // rounded-rect path
  if(typeof r==='number') r={tl:r,tr:r,br:r,bl:r};
  ctx.beginPath();
  ctx.moveTo(x+r.tl,y);
  ctx.lineTo(x+w-r.tr,y); ctx.arcTo(x+w,y,x+w,y+r.tr,r.tr);
  ctx.lineTo(x+w,y+h-r.br); ctx.arcTo(x+w,y+h,x+w-r.br,y+h,r.br);
  ctx.lineTo(x+r.bl,y+h); ctx.arcTo(x,y+h,x,y+h-r.bl,r.bl);
  ctx.lineTo(x,y+r.tl); ctx.arcTo(x,y,x+r.tl,y,r.tl);
  ctx.closePath();
}
function grad(ctx,x0,y0,x1,y1,stops){var g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach(function(s){g.addColorStop(s[0],s[1]);});return g;}
function lsWidth(ctx,t,ls){var w=0;for(var i=0;i<t.length;i++){w+=ctx.measureText(t[i]).width+(i?ls:0);}return w;}
function drawLS(ctx,t,x,y,ls,align){ // letter-spaced upright text, baseline alphabetic
  ctx.textBaseline='alphabetic';ctx.textAlign='left';
  if(align==='center'){x-=lsWidth(ctx,t,ls)/2;}
  for(var i=0;i<t.length;i++){ctx.fillText(t[i],x,y);x+=ctx.measureText(t[i]).width+ls;}
}
function ital(ctx,t,x,base,font,fill,align,shear){ // sheared (italic) text
  shear=(shear==null?0.16:shear);ctx.save();ctx.font=font;ctx.fillStyle=fill;
  ctx.textBaseline='alphabetic';ctx.textAlign=align||'left';
  ctx.transform(1,0,-shear,1,shear*base,0);ctx.fillText(t,x,base);ctx.restore();
}
function fit(ctx,t,tpl,size,maxW){var s=size;ctx.font=tpl.replace('@',s);while(maxW&&ctx.measureText(t).width>maxW&&s>14){s--;ctx.font=tpl.replace('@',s);}return s;}

var ORANGE='#ff9100',ORANGE_D='#ec7c00',WHITE='#ffffff';
var THEME={
 femminile:{a1:'#c4156f',a2:'#f72a8c',card1:'#be1268',card2:'#f31f8c',glow:'247,42,140',sym:'♀',label:'FEMMINILE'},
 maschile :{a1:'#081aa0',a2:'#2e5bff',card1:'#0818a0',card2:'#2850f0',glow:'46,91,255',sym:'♂',label:'MASCHILE'}
};

// data: {teamA:[s1,s2],teamB:[s1,s2],setsA,setsB,parziali:["18-21",...],luogo,torneo,data}

/* ===== grafica Risultato (identica al sito) ===== */
function drawRisultato(ctx,data,gender,logos){
  var th=THEME[gender],W=1080,H=1920,M=64;
  // background
  ctx.fillStyle=grad(ctx,0,0,0,H,[[0,'#181b29'],[1,'#0c0e17']]);ctx.fillRect(0,0,W,H);
  // glow behind card
  var rg=ctx.createRadialGradient(W/2,860,40,W/2,860,560);
  rg.addColorStop(0,'rgba('+th.glow+',0.34)');rg.addColorStop(1,'rgba('+th.glow+',0)');
  ctx.fillStyle=rg;ctx.fillRect(0,520,W,640);
  // top accent bar
  ctx.fillStyle=grad(ctx,0,0,W,0,[[0,th.a1],[1,ORANGE]]);ctx.fillRect(0,0,W,12);
  // logos
  if(logos.bv){var bh=132,bw=bh*logos.bv.width/logos.bv.height;ctx.drawImage(logos.bv,M-6,48,bw,bh);}
  if(logos.camp){var ch=96,cw=ch*logos.camp.width/logos.camp.height;ctx.drawImage(logos.camp,W-64-cw,66,cw,ch);}
  // pills
  var py=212,ph=56;
  function pill(x,text,c1,c2,fg){ctx.font='800 25px Inter';var tw=lsWidth(ctx,text,2),w=tw+52;
    ctx.fillStyle=grad(ctx,x,py,x+w,py+ph,[[0,c1],[1,c2]]);rr(ctx,x,py,w,ph,ph/2);ctx.fill();
    ctx.fillStyle=fg;drawLS(ctx,text,x+26,py+ph/2+9,2,'left');return x+w;}
  var nx=pill(M,th.sym+'  '+th.label,th.a1,th.a2,WHITE);
  var nx2=pill(nx+12,'BEACH VOLLEY',ORANGE,ORANGE_D,'#14141c');
  if(data.categoria) pill(nx2+12,data.categoria,'#ffffff','#e9ecf5','#14141c'); // categoria torneo (sempre visibile)
  // title
  ital(ctx,'RISULTATO',M-4,392,'400 118px Anton',WHITE,'left',0.16);
  // torneo + date
  ctx.font='italic 900 34px Archivo';ctx.fillStyle=WHITE;ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.fillText((data.torneo||'').toUpperCase(),M,452);
  ctx.font='700 24px Inter';ctx.fillStyle=ORANGE;
  drawLS(ctx,'●  '+(data.data||'').toUpperCase(),M,496,1.5,'left');
  // ===== score card =====
  var cx=M,cy=556,cw=W-128,chh=624,cr=46,ccx=cx+cw/2;
  ctx.fillStyle=grad(ctx,cx,cy,cx+cw,cy+chh,[[0,th.card1],[1,th.card2]]);rr(ctx,cx,cy,cw,chh,cr);ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,0.24)';rr(ctx,cx+1.5,cy+1.5,cw-3,chh-3,cr-1);ctx.stroke();
  // label
  ctx.font='800 24px Inter';ctx.fillStyle='rgba(255,255,255,0.82)';drawLS(ctx,'PUNTEGGIO SET',ccx,cy+64,4,'center');
  // giant score
  ital(ctx,data.setsA+'-'+data.setsB,ccx,cy+330,'400 250px Anton','rgba(0,0,0,0.16)','center',0.14); // shadow
  ital(ctx,data.setsA+'-'+data.setsB,ccx-4,cy+325,'400 250px Anton',WHITE,'center',0.14);
  // partials strip (clipped to bottom rounded corners)
  var sh=120;ctx.save();rr(ctx,cx,cy,cw,chh,cr);ctx.clip();
  ctx.fillStyle='rgba(0,0,0,0.28)';ctx.fillRect(cx,cy+chh-sh,cw,sh);ctx.restore();
  ctx.font='800 20px Inter';ctx.fillStyle='rgba(255,255,255,0.78)';drawLS(ctx,'PARZIALI',ccx,cy+chh-sh+34,5,'center');
  ctx.font='italic 900 40px Archivo';ctx.fillStyle=WHITE;
  drawLS(ctx,(data.parziali||[]).join('    '),ccx,cy+chh-sh+86,3,'center');
  // ===== team bar =====
  var bx=M,by=1238,bw=W-128,bh2=150,bcx=bx+bw/2,bcy=by+bh2/2;
  ctx.fillStyle='rgba(255,255,255,0.06)';rr(ctx,bx,by,bw,bh2,30);ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle='rgba('+th.glow+',0.65)';rr(ctx,bx+1.5,by+1.5,bw-3,bh2-3,29);ctx.stroke();
  var win=data.setsA>data.setsB;
  function team(names,side,winner){ctx.font='italic 900 40px Archivo';ctx.fillStyle=winner?WHITE:'#d2d6e4';ctx.textBaseline='alphabetic';
    for(var i=0;i<names.length;i++){var nm=names[i].toUpperCase(),yy=bcy-16+i*44;
      if(side<0){ctx.textAlign='right';ctx.fillText(nm,bcx-70,yy);}else{ctx.textAlign='left';ctx.fillText(nm,bcx+70,yy);}}}
  team(data.teamA,-1,win);team(data.teamB,1,!win);
  // VS circle
  var vsd=96,vx=bcx-vsd/2,vy=bcy-vsd/2;
  ctx.save();rr(ctx,vx,vy,vsd,vsd,vsd/2);ctx.clip();
  ctx.fillStyle=grad(ctx,vx,vy,vx+vsd,vy+vsd,[[0,th.a1],[1,ORANGE]]);ctx.fillRect(vx,vy,vsd,vsd);ctx.restore();
  ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.beginPath();ctx.arc(bcx,bcy,vsd/2-3,0,7);ctx.stroke();
  ctx.font='italic 900 36px Archivo';ctx.fillStyle=WHITE;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('VS',bcx,bcy+2);
  // ===== location =====
  ital(ctx,(data.luogo||'').toUpperCase(),W/2,1546,'400 92px Anton',WHITE,'center',0.14);
  var tw3=210,tx=W/2-tw3/2,ty=1592,thh=12;var tri=['#008c45','#ffffff','#ce2b37'];
  for(var i=0;i<3;i++){ctx.fillStyle=tri[i];rr(ctx,tx+i*tw3/3,ty,tw3/3-2,thh,3);ctx.fill();}
  // ===== footer =====
  var fy=1828;ctx.fillStyle=grad(ctx,0,fy,W,H,[[0,th.a1],[1,ORANGE]]);ctx.fillRect(0,fy,W,H-fy);
  ctx.font='800 34px Inter';ctx.fillStyle=WHITE;drawLS(ctx,'@BEACHVOLLEYITA_',W/2,fy+58,4,'center');
}

/* ===== API ===== */
// match: {teamA,teamB,setsA,setsB,sets:[[a,b],...],round,id}
// info:  {luogo,data,genere}
export async function renderRisultato(match, info){
  ensureFonts();
  const logos = await ensureLogos();
  const gender = (info.genere==='femminile')?'femminile':'maschile';
  const a = surnames(match.teamA), b = surnames(match.teamB);
  const parziali = (match.sets||[]).map(s=>s[0]+'-'+s[1]);
  const data = {
    teamA:a, teamB:b, setsA:match.setsA, setsB:match.setsB,
    parziali, luogo:info.luogo||'', torneo:'Campionato Italiano', data:info.data||'',
    categoria:info.categoria||''
  };
  const canvas = createCanvas(1080,1920);
  const ctx = canvas.getContext('2d');
  drawRisultato(ctx, data, gender, logos);
  return await canvas.encode('jpeg', 92);
}
