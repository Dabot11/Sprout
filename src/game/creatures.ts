import Phaser from 'phaser';
import { type Parts, type SpeciesKind } from './config';
import { anchor, DEFAULT_ANGLES, localAngle, tailPoints } from './anatomy';
import { drawBody, drawPart } from './art';
export interface Creature {
  id:number;x:number;y:number;vx:number;vy:number;angle:number;radius:number;health:number;maxHealth:number;
  parts:Parts;angles?:number[];species:SpeciesKind|null;shape:number;color:number;speed:number;hurtUntil:number;
  chase:number;rest:number;intent:number;charge:number;wander:number;fade:number;biteUntil?:number;
  view:Phaser.GameObjects.Container;g:Phaser.GameObjects.Graphics;tail:Phaser.GameObjects.Graphics;
  body:Phaser.GameObjects.Image;attachments:Phaser.GameObjects.Image[];bodyKey:string;
}
function bodyTexture(scene:Phaser.Scene,shape:number,color:number){
  const key=`body-${shape}-${color}`;if(!scene.textures.exists(key)){
    const tex=scene.textures.createCanvas(key,448,448)!;const ctx=tex.context;ctx.translate(224,224);drawBody(ctx,128,shape,color);tex.refresh();
  }return key;
}
function partTexture(scene:Phaser.Scene,part:NonNullable<Parts[number]>){
  const key=`appendage-${part}`;if(!scene.textures.exists(key)){
    const tex=scene.textures.createCanvas(key,256,192)!;const ctx=tex.context;ctx.translate(64,96);drawPart(ctx,part,72);tex.refresh();
  }return key;
}
type CreatureData=Omit<Creature,'view'|'g'|'tail'|'body'|'attachments'|'bodyKey'>;
export function createCreature(scene:Phaser.Scene,data:CreatureData):Creature {
  const bodyKey=bodyTexture(scene,data.shape,data.color),tail=scene.add.graphics(),g=scene.add.graphics();
  const body=scene.add.image(0,0,bodyKey),attachments=Array.from({length:8},()=>scene.add.image(0,0,'__WHITE').setVisible(false).setOrigin(.25,.5));
  const view=scene.add.container(data.x,data.y,[tail,body,...attachments,g]);
  return {...data,angles:data.angles??[...DEFAULT_ANGLES],view,g,tail,body,attachments,bodyKey};
}
export function renderCreature(c:Creature,time:number,player=false){
  const r=c.radius,g=c.g,tail=c.tail,speed=Math.min(1.6,Math.hypot(c.vx,c.vy)/Math.max(1,c.speed));
  c.view.setPosition(c.x,c.y).setRotation(c.angle).setAlpha(c.fade);g.clear();tail.clear();
  const key=bodyTexture(c.view.scene,c.shape,c.color);if(key!==c.bodyKey){c.bodyKey=key;c.body.setTexture(key);}c.body.setScale(r/128);
  c.parts.forEach((part,i)=>{
    const image=c.attachments[i];if(!part){image.setVisible(false);return;}
    const a=localAngle(i,c.angles),point=anchor(a,r,c.shape),bite=Math.max(0,((c.biteUntil??0)-time)/.3);
    image.setVisible(true).setTexture(partTexture(c.view.scene,part)).setPosition(point.x,point.y).setRotation(a).setScale(r/72,r/72*(part==='jaw'?1+bite*.5:part==='gather'?1+bite*.2:1));
    if(part==='flagellum'){
      const points=tailPoints(a,r,c.shape,time,speed,i*.7);
      for(let j=0;j<points.length-1;j++){const p=points[j],n=points[j+1],angle=Math.atan2(n.y-p.y,n.x-p.x),sx=Math.sin(angle),sy=Math.cos(angle);
        const color=Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(c.color),Phaser.Display.Color.ValueToColor(0xb0e4d5),26,j);tail.fillStyle(Phaser.Display.Color.GetColor(color.r,color.g,color.b),.96);
        const v=[{x:p.x-sx*p.width,y:p.y+sy*p.width},{x:p.x+sx*p.width,y:p.y-sy*p.width},{x:n.x+sx*n.width,y:n.y-sy*n.width},{x:n.x-sx*n.width,y:n.y+sy*n.width}];tail.fillPoints(v,true);
      }
    }
  });
  const blink=Math.sin(time*.67+c.id*.5)>.995?.12:1;
  for(const side of [-1,1]){const x=r*.47,y=side*r*.36;
    g.fillStyle(0x1f5d59,.25);g.fillEllipse(x-r*.005,y+r*.035,r*.36,r*.4*blink);
    g.fillStyle(0xf8f7dd);g.fillEllipse(x,y,r*.31,r*.346*blink);
    g.fillStyle(0x173b47);g.fillEllipse(x+r*.047,y,r*.14,r*.18*blink);
    g.fillStyle(0xffffff);g.fillCircle(x+r*.063,y-r*.038,r*.023*blink);
  }
  const breath=1+Math.sin(time*2+c.id)*.008;
  c.view.setScale(c.charge>0&&c.charge<.65?.92:breath, c.charge>0&&c.charge<.65?1.05:1/breath);
  if(c.hurtUntil>time){g.lineStyle(r*.055,0xffd4ab,.7);g.strokeEllipse(0,0,r*2.65,r*2.05);}
  if(c.charge>0&&c.charge<.65){g.lineStyle(r*.055,0xffd9a2,.8);g.beginPath();g.arc(0,0,r*1.55,-.5,.5);g.strokePath();}
  if(!player&&c.health<c.maxHealth){g.lineStyle(r*.065,0x24566a,.65);g.lineBetween(-r*.6,-r*1.35,r*.6,-r*1.35);g.lineStyle(r*.065,0xd9e6ad,.9);g.lineBetween(-r*.6,-r*1.35,-r*.6+r*1.2*c.health/c.maxHealth,-r*1.35);}
}
