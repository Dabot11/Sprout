import Phaser from 'phaser';
import { type Parts, type SpeciesKind } from './config';
import { anchor, DEFAULT_ANGLES, DEFAULT_EYES, localAngle, profileFor, tailPoints, type BodyProfile, type Eyes, type SkinPattern } from './anatomy';
import { anatomyKey, drawBody, drawEyes, drawPart } from './art';
export interface Creature{
  id:number;x:number;y:number;vx:number;vy:number;angle:number;radius:number;health:number;maxHealth:number;parts:Parts;angles?:number[];species:SpeciesKind|null;shape:number;color:number;speed:number;hurtUntil:number;
  profile:BodyProfile;eyes:Eyes;pattern:SkinPattern;homeX?:number;homeY?:number;chase:number;rest:number;intent:number;charge:number;wander:number;fade:number;biteUntil?:number;poisonedUntil?:number;stunUntil?:number;electricUntil?:number;electricTarget?:{x:number;y:number};escapeUntil?:number;nextEscape?:number;deathHandled?:boolean;deathAt?:number;
  view:Phaser.GameObjects.Container;g:Phaser.GameObjects.Graphics;tail:Phaser.GameObjects.Graphics;body:Phaser.GameObjects.Image;eyeImage:Phaser.GameObjects.Image;attachments:Phaser.GameObjects.Image[];bodyKey:string;
}
function bodyTexture(scene:Phaser.Scene,c:Pick<Creature,'shape'|'color'|'profile'|'pattern'>){const key=`body-${c.color}-${c.pattern}-${anatomyKey(c.profile)}`;if(!scene.textures.exists(key)){const t=scene.textures.createCanvas(key,640,512)!;t.context.translate(320,256);drawBody(t.context,128,c.shape,c.color,c.profile,c.pattern);t.refresh();}return key;}
function eyesTexture(scene:Phaser.Scene,c:Creature,blink:boolean){const key=`eyes-${c.color}-${anatomyKey(c.profile)}-${JSON.stringify(c.eyes)}-${blink}`;if(!scene.textures.exists(key)){const t=scene.textures.createCanvas(key,640,576)!;t.context.translate(320,288);drawEyes(t.context,128,blink?Math.PI/2/.69:0,c.eyes,c.profile,c.color);t.refresh();}return key;}
function partTexture(scene:Phaser.Scene,part:NonNullable<Parts[number]>,color:number,frame=0){const key=`organ-${part}-${color}-${frame}`;if(!scene.textures.exists(key)){const t=scene.textures.createCanvas(key,256,192)!;t.context.translate(64,96);drawPart(t.context,part,72,frame*.26,part==='jaw'?frame/3:0,color);t.refresh();}return key;}
type CreatureData=Omit<Creature,'view'|'g'|'tail'|'body'|'eyeImage'|'attachments'|'bodyKey'|'profile'|'eyes'|'pattern'>&Partial<Pick<Creature,'profile'|'eyes'|'pattern'>>;
export function createCreature(scene:Phaser.Scene,data:CreatureData):Creature{
  const value={...data,profile:data.profile??profileFor(data.shape),eyes:data.eyes??{...DEFAULT_EYES},pattern:data.pattern??'mottled' as SkinPattern};
  const bodyKey='',tail=scene.add.graphics(),g=scene.add.graphics(),body=scene.add.image(0,0,'__WHITE'),eyeImage=scene.add.image(0,0,'__WHITE');
  const attachments=Array.from({length:data.parts.length},()=>scene.add.image(0,0,'__WHITE').setVisible(false).setOrigin(.25,.5)),view=scene.add.container(data.x,data.y,[tail,body,...attachments,eyeImage,g]);
  return {...value,angles:data.angles??[...DEFAULT_ANGLES],view,g,tail,body,eyeImage,attachments,bodyKey};
}
export function renderCreature(c:Creature,time:number,player=false){
  const r=c.radius,g=c.g,tail=c.tail,speed=Math.min(1.7,Math.hypot(c.vx,c.vy)/Math.max(1,c.speed));c.view.setPosition(c.x,c.y).setRotation(c.angle).setAlpha(c.deathHandled?Math.max(0,1-(time-(c.deathAt??time))/.65):c.fade);g.clear();tail.clear();
  const key=bodyTexture(c.view.scene,c);if(key!==c.bodyKey){c.bodyKey=key;c.body.setTexture(key);}c.body.setScale(r/128).setTint(c.hurtUntil>time?0xffd4c4:(c.poisonedUntil??0)>time?0xc6e89b:0xffffff);c.eyeImage.setTexture(eyesTexture(c.view.scene,c,Math.sin(time*.69+c.id*.13)>.998)).setScale(r/128).setPosition(Math.sin(time*1.4+c.id)*r*.012,Math.sin(time*1.8+c.id)*r*.01);
  c.parts.forEach((part,i)=>{const image=c.attachments[i];if(!part){image.setVisible(false);return;}const a=localAngle(i,c.angles),pos=anchor(a,r,c.shape,c.profile),bite=Math.max(0,((c.biteUntil??0)-time)/.3);
    image.setVisible(true).setTexture(partTexture(c.view.scene,part,c.color,part==='jaw'?Math.min(3,Math.floor(bite*4)):part==='cilia'||part==='filter'?Math.floor(time*(part==='cilia'?7:3))%4:0)).setPosition(pos.x,pos.y).setRotation(a).setScale(r/72,r/72*(part==='jaw'?1+bite*.06:part==='gather'?1+bite*.17:part==='cilia'?1+Math.sin(time*(5+speed*3)+i)*.11:1));
    if(part==='flagellum'){
      const points=tailPoints(a,r,c.shape,time,speed,i*.7,c.profile),normals=points.map((p,j)=>{const before=points[Math.max(0,j-1)],after=points[Math.min(26,j+1)];return Math.atan2(after.y-before.y,after.x-before.x);});
      const left=points.map((p,j)=>({x:p.x-Math.sin(normals[j])*p.width,y:p.y+Math.cos(normals[j])*p.width})),right=points.map((p,j)=>({x:p.x+Math.sin(normals[j])*p.width,y:p.y-Math.cos(normals[j])*p.width})).reverse();
      const tone=Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(c.color),Phaser.Display.Color.ValueToColor(0xe1d7b6),100,28);tail.fillStyle(Phaser.Display.Color.GetColor(tone.r,tone.g,tone.b));tail.fillPoints([...left,...right],true);
      tail.lineStyle(r*.019,0xf5edcb,.42);tail.beginPath();points.forEach((p,j)=>j===0?tail.moveTo(p.x,p.y-p.width*.2):tail.lineTo(p.x,p.y-p.width*.2));tail.strokePath();
    }
    if(part==='jet'&&speed>1.3){for(let j=1;j<7;j++){tail.fillStyle(0xc4f3ee,(1-j/7)*.34);tail.fillCircle(pos.x+Math.cos(a)*r*(.6+j*.18),pos.y+Math.sin(a)*r*(.6+j*.18),r*(.08+j*.012));}}
  });
  const breathe=1+Math.sin(time*1.6+c.id)*.012;c.view.setScale(c.charge>0&&c.charge<.65?.92:breathe,c.charge>0&&c.charge<.65?1.05:1/breathe);
  if(c.hurtUntil>time){g.lineStyle(r*.035,0xffd4ab,.7);g.strokeEllipse(0,0,r*c.profile.length*1.05,r*Math.max(...c.profile.widths)*2.04);}
  if((c.poisonedUntil??0)>time){g.lineStyle(r*.04,0x9cca52,.6);g.strokeEllipse(0,0,r*c.profile.length*1.08,r*Math.max(...c.profile.widths)*2.1);}
  if(c.charge>0&&c.charge<.65){g.lineStyle(r*.035,0xffd9a2,.7);g.beginPath();g.arc(0,0,r*c.profile.length*.65,-.4,.4);g.strokePath();}
  if((c.electricUntil??0)>time&&c.electricTarget){const dx=c.electricTarget.x-c.x,dy=c.electricTarget.y-c.y,x=Math.cos(c.angle)*dx+Math.sin(c.angle)*dy,y=-Math.sin(c.angle)*dx+Math.cos(c.angle)*dy;g.lineStyle(r*.045,0xbedafb,.85);g.beginPath();g.moveTo(0,0);g.lineTo(x*.3,y*.3+r*.16);g.lineTo(x*.55,y*.55-r*.15);g.lineTo(x,y);g.strokePath();}
  if(!player&&c.health<c.maxHealth){const y=-r*(Math.max(...c.profile.widths)+.3);g.lineStyle(r*.06,0x203b55,.6);g.lineBetween(-r*.6,y,r*.6,y);g.lineStyle(r*.06,0xd9dfa6,.9);g.lineBetween(-r*.6,y,-r*.6+r*1.2*c.health/c.maxHealth,y);}
}
