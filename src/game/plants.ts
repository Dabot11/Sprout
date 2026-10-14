import Phaser from 'phaser';
export interface Plant{id:number;x:number;y:number;radius:number;phase:number;garden?:boolean;g:Phaser.GameObjects.Graphics}
export function fruitPosition(plant:Pick<Plant,'x'|'y'|'radius'|'phase'>,index:number,time:number){
  const arm=index%6,layer=Math.floor(index/6),a=arm*Math.PI/3+plant.phase+Math.sin(time*.45+arm)*.035,rr=plant.radius*(layer===0?.56:.9);
  return {x:plant.x+Math.cos(a+.16*(layer+1))*rr,y:plant.y+Math.sin(a+.16*(layer+1))*rr};
}
export function renderPlant(p:Plant,time:number){
  const g=p.g,r=p.radius;g.clear();g.setPosition(p.x,p.y);
  g.fillStyle(0x122c49,.14);g.fillEllipse(r*.03,r*.12,r*1.8,r*1.35);
  g.fillStyle(0x83b432,.16);g.fillCircle(0,0,r*.48);
  for(let arm=0;arm<6;arm++){
    const a=arm*Math.PI/3+p.phase+Math.sin(time*.45+arm)*.035;g.lineStyle(r*.065,0x25482b,.55);g.beginPath();g.moveTo(0,0);
    for(let i=1;i<=12;i++){const t=i/12,angle=a+.3*t;g.lineTo(Math.cos(angle)*r*t,Math.sin(angle)*r*t);}g.strokePath();g.lineStyle(r*.027,0x85b248,.95);g.strokePath();g.lineStyle(r*.008,0xd0e987,.65);g.strokePath();
    for(let i=1;i<=4;i++){const t=.17+i*.15,angle=a+.3*t,x=Math.cos(angle)*r*t,y=Math.sin(angle)*r*t;
      for(const side of [-1,1]){const leafAngle=angle+side*.75,cx=x+Math.cos(leafAngle)*r*.082,cy=y+Math.sin(leafAngle)*r*.082;g.fillStyle(i%2?0xa0c744:0x739e31,.92);g.fillPoints(Array.from({length:12},(_,n)=>{const t=n*Math.PI/6,along=Math.cos(t)*r*.095,across=Math.sin(t)*r*.036;return {x:cx+Math.cos(leafAngle)*along-Math.sin(leafAngle)*across,y:cy+Math.sin(leafAngle)*along+Math.cos(leafAngle)*across};}),true);g.lineStyle(r*.012,0xbddc67,.7);g.lineBetween(x,y,cx+Math.cos(leafAngle)*r*.06,cy+Math.sin(leafAngle)*r*.06);}
    }
    const tip=a+.34;g.lineStyle(r*.018,0xb1d852,.8);g.beginPath();g.arc(Math.cos(tip)*r*.95,Math.sin(tip)*r*.95,r*.095,tip,tip+Math.PI*1.5);g.strokePath();
  }
  g.fillStyle(0x587a24);g.fillCircle(0,0,r*.14);g.fillStyle(0xabcb47);g.fillCircle(-r*.035,-r*.035,r*.08);
}
