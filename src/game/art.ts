import { anchor, bodyRadius, localAngle, tailPoints, eyeAnchors, widthAt, profileFor, DEFAULT_EYES, type BodyProfile, type Eyes, type SkinPattern } from './anatomy';
import type { PartKind, Parts } from './config';
const hex=(c:number)=>`#${c.toString(16).padStart(6,'0')}`;
const tint=(c:number,a:number)=>`rgb(${[c>>16&255,c>>8&255,c&255].map(v=>Math.round(a>=0?v+(255-v)*a:v*(1+a))).join(',')})`;
export const anatomyKey=(p:BodyProfile)=>`${p.length.toFixed(3)}:${p.knots.map(x=>x.toFixed(3)).join(',')}:${p.widths.map(x=>x.toFixed(3)).join(',')}`;
const bodyCache=new Map<string,HTMLCanvasElement>();
/** Cached cross-section lighting: skin is shaded as a rounded volume, not a flat disk. */
function bodyBitmap(p:BodyProfile,color:number,pattern:SkinPattern){
  const key=`${anatomyKey(p)}:${color}:${pattern}`;const cached=bodyCache.get(key);if(cached)return cached;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const ctx=canvas.getContext('2d')!,image=ctx.createImageData(512,384),rgb=[color>>16&255,color>>8&255,color&255];
  for(let px=0;px<512;px++){
    const x=(px-256)/128,w=widthAt(x,p);if(w<=0)continue;const derivative=(widthAt(x+.006,p)-widthAt(x-.006,p))/.012;
    for(let py=Math.max(0,Math.floor(192-w*128));py<Math.min(384,Math.ceil(192+w*128));py++){
      const y=(py-192)/128,t=y/w;if(Math.abs(t)>=1)continue;const z=Math.sqrt(1-t*t),nx=-derivative*z*.32,ny=t,nz=z,n=Math.hypot(nx,ny,nz);
      const light=Math.max(0,(-.35*nx-.5*ny+.8*nz)/n),shine=Math.max(0,(-.2*nx-.32*ny+.92*nz)/n)**18;
      const grain=Math.sin(px*12.9898+py*78.233)*43758.5453,noise=(grain-Math.floor(grain)-.5)*.038;
      const mirrorY=Math.abs(y),spot=Math.sin(x*14+Math.sin(mirrorY*9))*Math.sin(mirrorY*16+x*3),bands=Math.cos(x*15+y*y*4);
      const skin=pattern==='mottled'?(spot>.68?-.17:spot<-.78?.06:0):pattern==='bands'?(bands>.55?-.16:0):pattern==='granules'?Math.sin(x*57+mirrorY*31)*Math.sin(x*83-mirrorY*43)*.045:0;
      const shade=.49+.54*light+skin+noise,edge=Math.min(1,(1-Math.abs(t))*w*128),index=(py*512+px)*4;
      for(let k=0;k<3;k++)image.data[index+k]=Math.min(255,rgb[k]*shade+shine*(k===2?36:48));image.data[index+3]=Math.round(edge*255);
    }
  }
  ctx.putImageData(image,0,0);bodyCache.set(key,canvas);if(bodyCache.size>28)bodyCache.delete(bodyCache.keys().next().value!);return canvas;
}
export function drawBody(ctx:CanvasRenderingContext2D,r:number,shape:number,color:number,profile=profileFor(shape),pattern:SkinPattern='mottled'){
  ctx.save();ctx.globalAlpha=.16;ctx.drawImage(bodyBitmap(profile,0x143644,'plain'),-r*2-r*.04,-r*1.5+r*.13,r*4,r*3);ctx.restore();ctx.drawImage(bodyBitmap(profile,color,pattern),-r*2,-r*1.5,r*4,r*3);
  const x=-profile.length*.16*r,w=widthAt(x/r,profile)*r;ctx.save();ctx.globalAlpha=.16;const core=ctx.createRadialGradient(x-r*.07,r*.05,0,x,r*.11,Math.min(r*.22,w*.6));core.addColorStop(0,'#f2efbf');core.addColorStop(.65,tint(color,.2));core.addColorStop(1,'rgba(30,65,82,0)');ctx.fillStyle=core;ctx.beginPath();ctx.arc(x,r*.11,Math.min(r*.22,w*.6),0,Math.PI*2);ctx.fill();ctx.restore();
}
function lens(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:number,blink:number){
  ctx.save();ctx.translate(x,y);ctx.scale(1,blink);const globe=ctx.createRadialGradient(-r*.36,-r*.38,r*.05,0,0,r);globe.addColorStop(0,'#fff7da');globe.addColorStop(.52,'#e1e8d2');globe.addColorStop(1,'#8faaa4');ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle=globe;ctx.fill();
  const iris=ctx.createRadialGradient(r*.15,-r*.03,0,r*.12,0,r*.72);iris.addColorStop(0,'#152c36');iris.addColorStop(.6,'#536d41');iris.addColorStop(.94,'#859351');iris.addColorStop(1,tint(color,-.25));ctx.fillStyle=iris;ctx.beginPath();ctx.ellipse(r*.18,0,r*.63,r*.71,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0f2026';ctx.beginPath();ctx.ellipse(r*.23,0,r*.39,r*.49,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,247,.82)';ctx.beginPath();ctx.ellipse(r*.01,-r*.34,r*.13,r*.09,-.3,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function drawEyes(ctx:CanvasRenderingContext2D,r:number,time:number,eyes:Eyes=DEFAULT_EYES,profile=profileFor(0),color=0xd9b45c){
  const blink=Math.sin(time*.69)>.998?.17:1;
  for(const p of eyeAnchors(eyes,profile,r)){
    let x=p.x,y=p.y;
    if(eyes.kind==='stalk'){
      const rootY=p.side*widthAt(x/r,profile)*r*.77,rootX=x-r*.1,extend=r*.32,pulse=Math.sin(time*1.6+x/r*1.3)*r*.018;
      x+=r*.11+pulse;y=p.side*(Math.abs(rootY)+extend);
      ctx.lineCap='round';ctx.lineWidth=r*.105;ctx.strokeStyle=tint(color,-.2);ctx.beginPath();ctx.moveTo(rootX,rootY);ctx.quadraticCurveTo(rootX-r*.11,y,x,y);ctx.stroke();ctx.lineWidth=r*.065;ctx.strokeStyle=tint(color,.23);ctx.stroke();lens(ctx,x,y,r*.18,color,blink);
    }else if(eyes.kind==='compound'){
      ctx.fillStyle=tint(color,-.3);ctx.beginPath();ctx.ellipse(x,y,r*.23,r*.19,0,0,Math.PI*2);ctx.fill();for(let i=0;i<3;i++){const a=i*2.094;lens(ctx,x+Math.cos(a)*r*.115,y+p.side*Math.sin(a)*r*.1,r*.107,color,blink);}
    }else {ctx.fillStyle=tint(color,-.25);ctx.beginPath();ctx.ellipse(x-r*.015,y+r*.03,r*.26,r*.25,0,0,Math.PI*2);ctx.fill();lens(ctx,x,y,r*.225,color,blink);}
  }
}
export function drawPart(ctx:CanvasRenderingContext2D,part:PartKind,r:number,time=0,bite=0,color=0xd9b45c){
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';const fill=ctx.createLinearGradient(0,-r*.3,r*.32,r*.3);fill.addColorStop(0,tint(color,.5));fill.addColorStop(.48,tint(color,.15));fill.addColorStop(1,tint(color,-.38));ctx.fillStyle=fill;ctx.strokeStyle=tint(color,-.38);ctx.lineWidth=r*.028;
  if(part==='gather'){
    ctx.beginPath();ctx.moveTo(-r*.17,-r*.18);ctx.bezierCurveTo(r*.19,-r*.11,r*.33,-r*.16,r*.62,-r*.29);ctx.lineTo(r*.62,r*.29);ctx.bezierCurveTo(r*.31,r*.17,r*.19,r*.11,-r*.17,r*.18);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=tint(color,.44);ctx.beginPath();ctx.ellipse(r*.6,0,r*.13,r*(.29+bite*.035),0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#355b41';ctx.beginPath();ctx.ellipse(r*.62,0,r*.095,r*.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#15392c';ctx.beginPath();ctx.ellipse(r*.63,r*.015,r*.055,r*.14,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,242,195,.42)';ctx.lineWidth=r*.018;for(const y of [-.07,.07]){ctx.beginPath();ctx.moveTo(-r*.02,r*y);ctx.quadraticCurveTo(r*.35,r*y*.7,r*.5,r*y*2.4);ctx.stroke();}
  }else if(part==='jaw'){
    const gap=.105+Math.sin(time*2.5)*.008+bite*.105;
    for(const side of [-1,1]){ctx.save();ctx.scale(1,side);ctx.beginPath();ctx.moveTo(-r*.2,-r*.18);ctx.bezierCurveTo(r*.11,-r*.4,r*.56,-r*.48,r*.72,-r*gap);ctx.bezierCurveTo(r*.38,-r*(gap+.015),r*.01,-r*.07,-r*.2,-r*.02);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.stroke();
      for(let i=0;i<4;i++){const x=r*(.13+i*.145);ctx.beginPath();ctx.moveTo(x-r*.035,-r*(gap+.105));ctx.lineTo(x+r*.1,-r*(gap+.13));ctx.quadraticCurveTo(x+r*.07,-r*(gap-.07),x+r*.025,-r*(gap-.01));ctx.closePath();ctx.fillStyle='#e5d29b';ctx.fill();ctx.strokeStyle='#b59b73';ctx.lineWidth=r*.012;ctx.stroke();}ctx.restore();}
  }else if(part==='filter'){
    ctx.beginPath();ctx.ellipse(-r*.01,0,r*.23,r*.21,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(let i=-2;i<=2;i++){ctx.lineWidth=r*.045;ctx.strokeStyle=tint(color,.38);ctx.beginPath();ctx.moveTo(r*.09,i*r*.04);ctx.bezierCurveTo(r*.31,i*r*.1,r*.37,i*r*.25,r*(.62-Math.abs(i)*.08),i*r*.24+Math.sin(time*3+i)*r*.018);ctx.stroke();ctx.lineWidth=r*.016;ctx.strokeStyle='#e2d9ab';ctx.stroke();}
  }else if(part==='spike'){
    ctx.beginPath();ctx.moveTo(-r*.2,-r*.17);ctx.quadraticCurveTo(r*.31,-r*.21,r*.86,-r*.06);ctx.quadraticCurveTo(r*.35,r*.09,-r*.2,r*.19);ctx.closePath();ctx.fill();ctx.stroke();const horn=ctx.createLinearGradient(0,-r*.15,0,r*.2);horn.addColorStop(0,'#fff1cd');horn.addColorStop(.6,'#d7c291');horn.addColorStop(1,'#958362');ctx.fillStyle=horn;ctx.beginPath();ctx.moveTo(r*.02,-r*.13);ctx.lineTo(r*.85,-r*.06);ctx.lineTo(r*.04,r*.1);ctx.closePath();ctx.fill();
  }else if(part==='plate'){
    ctx.beginPath();ctx.moveTo(-r*.21,-r*.39);ctx.quadraticCurveTo(r*.31,-r*.2,r*.22,r*.06);ctx.quadraticCurveTo(r*.32,r*.31,-r*.21,r*.39);ctx.quadraticCurveTo(-r*.05,0,-r*.21,-r*.39);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=tint(color,.63);ctx.lineWidth=r*.025;ctx.beginPath();ctx.moveTo(0,-r*.28);ctx.quadraticCurveTo(r*.19,0,0,r*.28);ctx.stroke();
  }else if(part==='cilia'){
    ctx.beginPath();ctx.ellipse(0,0,r*.14,r*.38,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=tint(color,.23);ctx.beginPath();ctx.moveTo(0,-r*.29);ctx.quadraticCurveTo(r*.4,-r*.39,r*.57,-r*.24);ctx.quadraticCurveTo(r*.35,0,r*.54,r*.33);ctx.quadraticCurveTo(r*.18,r*.27,0,r*.3);ctx.closePath();ctx.globalAlpha=.65;ctx.fill();ctx.globalAlpha=1;
    for(let i=-3;i<=3;i++){ctx.strokeStyle=i%2?'#e1d6ac':tint(color,.38);ctx.lineWidth=r*.035;ctx.beginPath();ctx.moveTo(0,i*r*.08);ctx.quadraticCurveTo(r*.3,i*r*.12+Math.sin(time*6+i)*r*.045,r*(.53+Math.cos(i)*.08),i*r*.115);ctx.stroke();}
  }else if(part==='jet'){
    ctx.beginPath();ctx.moveTo(-r*.21,-r*.2);ctx.lineTo(r*.5,-r*.2);ctx.lineTo(r*.5,r*.2);ctx.lineTo(-r*.21,r*.2);ctx.closePath();ctx.fill();
    for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(r*(.02+i*.16),0,r*.07,r*(.23-i*.025),0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.beginPath();ctx.ellipse(r*.5,0,r*.09,r*.17,0,0,Math.PI*2);ctx.fillStyle='#273f40';ctx.fill();ctx.strokeStyle='#e1d4ac';ctx.lineWidth=r*.05;ctx.stroke();
  }else if(part==='poison'){
    ctx.beginPath();ctx.moveTo(-r*.21,-r*.16);ctx.bezierCurveTo(r*.02,-r*.25,r*.35,-r*.32,r*.44,-r*.08);ctx.bezierCurveTo(r*.68,r*.12,r*.18,r*.36,-r*.21,r*.18);ctx.closePath();ctx.fill();ctx.stroke();const toxin=ctx.createRadialGradient(r*.24,-r*.04,0,r*.27,0,r*.2);toxin.addColorStop(0,'#d2e675');toxin.addColorStop(1,'#779947');ctx.fillStyle=toxin;ctx.beginPath();ctx.ellipse(r*.28,0,r*.18,r*.16,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(r*.47,0,r*.06,r*.075,0,0,Math.PI*2);ctx.fillStyle='#36552b';ctx.fill();
  }else if(part==='electric'){
    ctx.beginPath();ctx.moveTo(-r*.2,-r*.19);ctx.quadraticCurveTo(r*.1,-r*.35,r*.49,-r*.02);ctx.quadraticCurveTo(r*.32,r*.32,-r*.2,r*.19);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#aacaf7';ctx.lineWidth=r*.05;ctx.beginPath();ctx.moveTo(-r*.03,-r*.17);ctx.lineTo(r*.23,-r*.06);ctx.lineTo(r*.04,r*.06);ctx.lineTo(r*.33,r*.14);ctx.stroke();
  }else {ctx.beginPath();ctx.ellipse(-r*.035,0,r*.17,r*.14,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.restore();
}
export interface OrganismArt{parts:Parts;angles?:number[];shape:number;color:number;radius:number;time:number;movement:number;profile?:BodyProfile;eyes?:Eyes;pattern?:SkinPattern;orientation?:number;bite?:number;ghost?:{part:PartKind;angle:number}}
export function drawOrganism(ctx:CanvasRenderingContext2D,data:OrganismArt){
  const {radius:r,parts,angles,shape,color,time,movement}=data,profile=data.profile??profileFor(shape);ctx.save();ctx.rotate(data.orientation??0);
  parts.forEach((p,i)=>{if(p!=='flagellum')return;const a=localAngle(i,angles),points=tailPoints(a,r,shape,time,movement,i*.7,profile);ctx.beginPath();points.forEach((p,j)=>{const n=points[Math.min(j+1,26)],angle=Math.atan2(n.y-p.y,n.x-p.x),x=p.x-Math.sin(angle)*p.width,y=p.y+Math.cos(angle)*p.width;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});[...points].reverse().forEach(p=>ctx.lineTo(p.x+Math.sin(a)*p.width,p.y-Math.cos(a)*p.width));ctx.closePath();const grad=ctx.createLinearGradient(points[0].x,points[0].y,points[26].x,points[26].y);grad.addColorStop(0,hex(color));grad.addColorStop(.5,tint(color,.45));grad.addColorStop(1,'#ddd4af');ctx.fillStyle=grad;ctx.fill();});
  drawBody(ctx,r,shape,color,profile,data.pattern);
  parts.forEach((p,i)=>{if(!p)return;const a=localAngle(i,angles),pos=anchor(a,r,shape,profile);ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(a);drawPart(ctx,p,r,time,data.bite??0,color);ctx.restore();});
  drawEyes(ctx,r,time,data.eyes,profile,color);
  if(data.ghost){const a=data.ghost.angle,p=anchor(a,r,shape,profile);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.globalAlpha=.5;drawPart(ctx,data.ghost.part,r,time,0,color);ctx.restore();}ctx.restore();
}
