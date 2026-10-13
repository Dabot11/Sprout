import type { Parts } from './config';
export const DEFAULT_ANGLES=Array.from({length:8},(_,i)=>i*Math.PI/4);
export const FORMS=[{name:'Gota',rx:1.15,ry:.88},{name:'Vesícula',rx:1,ry:1},{name:'Nadadora',rx:1.37,ry:.76},{name:'Lobulada',rx:1.12,ry:.94}];
export const PALETTES=[{name:'Jade',color:0x66cab1},{name:'Lima',color:0xb2d578},{name:'Coral',color:0xe99b87},{name:'Ámbar',color:0xdfbd71},{name:'Lila',color:0xaaa1d3}];
export function localAngle(slot:number,angles?:number[]){return angles?.[slot]??DEFAULT_ANGLES[slot];}
export function bodyRadius(angle:number,shape=0){
  const form=FORMS[shape%4],c=Math.cos(angle),s=Math.sin(angle);
  const ellipse=1/Math.sqrt((c/form.rx)**2+(s/form.ry)**2);
  const contour=shape%4===0?1+.075*c+.035*Math.cos(3*angle):shape%4===3?1+.095*Math.cos(3*angle):1+.025*Math.cos(3*angle);
  return ellipse*contour;
}
export function anchor(angle:number,r:number,shape=0){const distance=bodyRadius(angle,shape)*r*.96;return {x:Math.cos(angle)*distance,y:Math.sin(angle)*distance};}
export function propulsion(parts:Parts,angles?:number[]){return parts.reduce((sum,p,i)=>sum+(p==='flagellum'?.35+.65*(1-Math.cos(localAngle(i,angles)))/2:0),0);}
export function tailPoints(a:number,r:number,shape:number,time:number,movement:number,phase:number){
  const root=anchor(a,r,shape),speed=Math.min(1.7,movement),result:{x:number;y:number;width:number}[]=[];
  for(let i=0;i<=26;i++){
    const u=i/26,wave=Math.sin(time*(2.3+speed*7)-u*7+phase)*r*(.035+speed*.19)*u;
    result.push({x:root.x+Math.cos(a)*r*1.62*u-Math.sin(a)*wave,y:root.y+Math.sin(a)*r*1.62*u+Math.cos(a)*wave,width:r*(.1*(1-u)**1.15+.009)});
  }return result;
}

export function turningPropulsion(parts:Parts,angles?:number[]){return parts.reduce((sum,p,i)=>sum+(p==='flagellum'?.35+.65*Math.abs(Math.sin(localAngle(i,angles))):0),0);}
