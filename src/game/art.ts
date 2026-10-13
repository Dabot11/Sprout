import { anchor, bodyRadius, localAngle, tailPoints } from './anatomy';
import type { PartKind, Parts } from './config';
const hex=(color:number)=>`#${color.toString(16).padStart(6,'0')}`;
function tint(color:number,amount:number){const rgb=[color>>16&255,color>>8&255,color&255].map(v=>Math.round(amount>=0?v+(255-v)*amount:v*(1+amount)));return `rgb(${rgb.join(',')})`;}
function contour(ctx:CanvasRenderingContext2D,r:number,shape:number){
  const points=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24,d=bodyRadius(a,shape)*r;return {x:Math.cos(a)*d,y:Math.sin(a)*d};});
  ctx.beginPath();ctx.moveTo((points[47].x+points[0].x)/2,(points[47].y+points[0].y)/2);
  points.forEach((p,i)=>{const n=points[(i+1)%48];ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);});ctx.closePath();
}
export function drawBody(ctx:CanvasRenderingContext2D,r:number,shape:number,color:number){
  ctx.save();ctx.translate(-r*.05,r*.14);contour(ctx,r*1.02,shape);ctx.fillStyle='rgba(0,30,47,.22)';ctx.fill();ctx.restore();
  contour(ctx,r,shape);
  const membrane=ctx.createRadialGradient(-r*.4,-r*.4,r*.12,0,r*.14,r*1.36);membrane.addColorStop(0,tint(color,.68));membrane.addColorStop(.42,tint(color,.13));membrane.addColorStop(.77,hex(color));membrane.addColorStop(1,tint(color,-.47));
  ctx.fillStyle=membrane;ctx.fill();ctx.strokeStyle=tint(color,-.26);ctx.lineWidth=r*.045;ctx.stroke();
  ctx.save();ctx.clip();
  const glow=ctx.createRadialGradient(-r*.45,-r*.45,0,-r*.2,-r*.2,r);glow.addColorStop(0,'rgba(248,255,229,.54)');glow.addColorStop(.55,'rgba(232,255,209,.05)');glow.addColorStop(1,'rgba(224,255,241,0)');ctx.fillStyle=glow;ctx.fillRect(-r*1.5,-r*1.5,r*3,r*3);
  for(let i=0;i<7;i++){const a=i*2.4+shape,rho=r*(.43+(i%3)*.1),x=Math.cos(a)*rho,y=Math.sin(a)*rho;ctx.beginPath();ctx.ellipse(x,y,r*(.07+i%2*.025),r*.06,a,0,Math.PI*2);ctx.fillStyle=i%2?tint(color,.4):tint(color,-.12);ctx.globalAlpha=.52;ctx.fill();}ctx.globalAlpha=1;
  ctx.beginPath();ctx.ellipse(-r*.23,r*.05,r*.38,r*.35,-.2,0,Math.PI*2);ctx.fillStyle='rgba(13,81,79,.2)';ctx.fill();
  const core=ctx.createRadialGradient(-r*.36,-r*.12,r*.01,-r*.22,0,r*.35);core.addColorStop(0,'#f6f0ad');core.addColorStop(.32,'#d9df85');core.addColorStop(.8,'#96bb66');core.addColorStop(1,'#6e9c66');ctx.beginPath();ctx.ellipse(-r*.25,-r*.025,r*.31,r*.3,-.2,0,Math.PI*2);ctx.fillStyle=core;ctx.fill();ctx.strokeStyle='rgba(219,240,160,.45)';ctx.lineWidth=r*.025;ctx.stroke();
  ctx.beginPath();ctx.ellipse(-r*.34,-r*.13,r*.15,r*.07,-.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,216,.45)';ctx.fill();ctx.restore();
  contour(ctx,r*.985,shape);ctx.strokeStyle='rgba(218,255,226,.42)';ctx.lineWidth=r*.035;ctx.stroke();
}
export function drawEyes(ctx:CanvasRenderingContext2D,r:number,time:number){
  const blink=Math.sin(time*.67)> .995?.12:1;
  for(const side of [-1,1]){const x=r*.47,y=side*r*.36;ctx.save();ctx.translate(x,y);ctx.scale(1,blink);
    ctx.beginPath();ctx.ellipse(-r*.005,r*.035,r*.18,r*.2,0,0,Math.PI*2);ctx.fillStyle='rgba(31,93,89,.25)';ctx.fill();
    const white=ctx.createRadialGradient(-r*.04,-r*.06,0,0,0,r*.17);white.addColorStop(0,'#fffee9');white.addColorStop(1,'#d1e9c6');ctx.beginPath();ctx.ellipse(0,0,r*.155,r*.173,0,0,Math.PI*2);ctx.fillStyle=white;ctx.fill();
    ctx.beginPath();ctx.ellipse(r*.047,0,r*.07,r*.09,0,0,Math.PI*2);ctx.fillStyle='#173b47';ctx.fill();ctx.beginPath();ctx.arc(r*.063,-r*.038,r*.023,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();ctx.restore();
  }
}
export function drawPart(ctx:CanvasRenderingContext2D,part:PartKind,r:number,time=0,bite=0){
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  const fill=ctx.createLinearGradient(0,-r*.28,r*.24,r*.3);fill.addColorStop(0,part==='jaw'?'#fff2c7':part==='plate'?'#b6dede':'#ceebba');fill.addColorStop(.42,part==='jaw'?'#e2bc82':part==='plate'?'#709ca8':'#99c697');fill.addColorStop(1,part==='jaw'?'#a97962':part==='plate'?'#3b626f':'#4f9c86');
  ctx.fillStyle=fill;ctx.strokeStyle=part==='jaw'?'#99725f':'#4a8e82';ctx.lineWidth=r*.035;
  if(part==='gather'){
    ctx.beginPath();ctx.moveTo(-r*.18,-r*.19);ctx.bezierCurveTo(r*.12,-r*.3,r*.42,-r*.29,r*.46,-r*.22);ctx.lineTo(r*.46,r*.22);ctx.bezierCurveTo(r*.24,r*.29,0,r*.3,-r*.18,r*.18);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(r*.37,0,r*.14,r*(.24+bite*.05),0,0,Math.PI*2);ctx.fillStyle='#35665e';ctx.fill();ctx.strokeStyle='#e5f4b8';ctx.lineWidth=r*.073;ctx.stroke();ctx.beginPath();ctx.ellipse(r*.38,r*.025,r*.065,r*.115,0,0,Math.PI*2);ctx.fillStyle='#204a4b';ctx.fill();
    ctx.strokeStyle='rgba(245,255,206,.48)';ctx.lineWidth=r*.023;ctx.beginPath();ctx.moveTo(-r*.1,-r*.12);ctx.quadraticCurveTo(r*.08,-r*.18,r*.26,-r*.16);ctx.stroke();
  } else if(part==='jaw'){
    const open=.1+(Math.sin(time*2.5)*.015)+bite*.11;
    for(const sign of [-1,1]){ctx.save();ctx.scale(1,sign);ctx.beginPath();ctx.moveTo(-r*.22,-r*.18);ctx.bezierCurveTo(r*.05,-r*.45,r*.47,-r*.39,r*.62,-r*open);ctx.bezierCurveTo(r*.24,-r*(open+.02),r*.07,-r*.09,-r*.22,-r*.02);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.stroke();
      for(let k=0;k<3;k++){const x=r*(.16+k*.15);ctx.beginPath();ctx.moveTo(x-r*.055,-r*(open+.095));ctx.lineTo(x+r*.06,-r*(open+.11));ctx.lineTo(x+r*.02,-r*(open-.04));ctx.closePath();ctx.fillStyle='#fff3cc';ctx.fill();}ctx.restore();}
  } else if(part==='filter'){
    ctx.beginPath();ctx.ellipse(r*.03,0,r*.23,r*.22,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(let i=-3;i<=3;i++){ctx.strokeStyle=i%2?'#afdfdc':'#d0f6db';ctx.lineWidth=r*.027;ctx.beginPath();ctx.moveTo(r*.13,i*r*.035);ctx.quadraticCurveTo(r*.44,i*r*.12,r*(.56+Math.cos(i)*.06),i*r*.14+Math.sin(time*3+i)*r*.015);ctx.stroke();}
    ctx.beginPath();ctx.ellipse(r*.13,0,r*.08,r*.14,0,0,Math.PI*2);ctx.fillStyle='#366d70';ctx.fill();
  } else if(part==='spike'){
    ctx.beginPath();ctx.moveTo(-r*.21,-r*.18);ctx.quadraticCurveTo(r*.21,-r*.24,r*.76,0);ctx.quadraticCurveTo(r*.25,r*.12,-r*.21,r*.2);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.02,-r*.12);ctx.lineTo(r*.7,0);ctx.lineTo(-r*.02,r*.03);ctx.fillStyle='#f4e9bd';ctx.fill();
  } else if(part==='plate'){
    ctx.beginPath();ctx.moveTo(-r*.18,-r*.36);ctx.quadraticCurveTo(r*.34,-r*.23,r*.19,r*.09);ctx.quadraticCurveTo(r*.23,r*.3,-r*.18,r*.36);ctx.quadraticCurveTo(-r*.05,0,-r*.18,-r*.36);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#d6e5d6';ctx.lineWidth=r*.032;ctx.beginPath();ctx.moveTo(0,-r*.24);ctx.quadraticCurveTo(r*.17,0,0,r*.24);ctx.stroke();
  } else {ctx.beginPath();ctx.ellipse(-r*.01,0,r*.2,r*.15,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.restore();
}
export interface OrganismArt {parts:Parts;angles?:number[];shape:number;color:number;radius:number;time:number;movement:number;orientation?:number;bite?:number;ghost?:{part:PartKind;angle:number}}
export function drawOrganism(ctx:CanvasRenderingContext2D,data:OrganismArt){
  const {radius:r,parts,angles,shape,color,time,movement}=data;ctx.save();ctx.rotate(data.orientation??0);
  parts.forEach((p,i)=>{if(p!=='flagellum')return;const a=localAngle(i,angles),points=tailPoints(a,r,shape,time,movement,i*.7);ctx.beginPath();points.forEach((p,j)=>{const n=points[Math.min(j+1,points.length-1)],direction=Math.atan2(n.y-p.y,n.x-p.x);const x=p.x-Math.sin(direction)*p.width,y=p.y+Math.cos(direction)*p.width;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});[...points].reverse().forEach(p=>ctx.lineTo(p.x+Math.sin(a)*p.width,p.y-Math.cos(a)*p.width));ctx.closePath();const grad=ctx.createLinearGradient(points[0].x,points[0].y,points[26].x,points[26].y);grad.addColorStop(0,hex(color));grad.addColorStop(.4,'#89cdd0');grad.addColorStop(1,'#b5e6d8');ctx.fillStyle=grad;ctx.fill();});
  drawBody(ctx,r,shape,color);
  parts.forEach((p,i)=>{if(!p)return;const a=localAngle(i,angles),pos=anchor(a,r,shape);ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(a);drawPart(ctx,p,r,time,data.bite??0);ctx.restore();});
  drawEyes(ctx,r,time);
  if(data.ghost){const a=data.ghost.angle,pos=anchor(a,r,shape);ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(a);ctx.globalAlpha=.5;drawPart(ctx,data.ghost.part,r,time);ctx.restore();}
  ctx.restore();
}
