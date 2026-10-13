import Phaser from 'phaser';
import { BALANCE, SPECIES, SPECIES_KEYS, type FoodKind, type SpeciesKind } from './config';
import { attackAt, angleDiff, canGrow, canWin, copyRun, eat, grow, maxHealth, mouthAt, newRun, protection, radius, stats, type Run } from './model';
import { createCreature, renderCreature, type Creature } from './creatures';
import { think } from './ai';
import { Spatial } from './spatial';
import { Controls } from './controls';
import { Sound } from './audio';
import { saveRun } from './storage';
export interface Food {x:number;y:number;radius:number;kind:FoodKind;active:boolean;sprite:Phaser.GameObjects.Image;phase:number}
export interface SceneHooks { tick:(run:Run,cooldown:number)=>void;adapt:(run:Run)=>void;result:(run:Run,won:boolean)=>void;notice:(text:string)=>void;pause:()=>void;ready:()=>void }
export class TideScene extends Phaser.Scene {
  run:Run=newRun();player!:Creature;paused=true;controls:Controls;audio:Sound;
  private creatures:Creature[]=[];private foods:Food[]=[];private foodGrid=new Spatial<Food>(BALANCE.spatialCell);private creatureGrid=new Spatial<Creature>(BALANCE.spatialCell);
  private clock=0;private cooldown=0;private dash=0;private currentRadius=22;private nextId=1;
  private hits=new Map<string,number>();private maintenance=0;private hudTimer=0;private saveTimer=0;private soundTimer=0;
  private worldArt!:Phaser.GameObjects.Graphics;private motes!:Phaser.GameObjects.Graphics;private zoneLabel!:Phaser.GameObjects.Text;private boundsGlow!:Phaser.GameObjects.Graphics;
  private ending=false;private quality=1;private frames=0;private slowFrames=0;private tutorial=0;private ready=false;
  constructor(private hooks:SceneHooks,sound:Sound) {super('tide');this.audio=sound;this.controls=new Controls(()=>this.hooks.pause());}
  get isReady(){return this.ready;}
  create() {
    this.makeTextures();this.worldArt=this.add.graphics().setDepth(-10);this.motes=this.add.graphics().setDepth(-9);this.boundsGlow=this.add.graphics().setDepth(-8);
    this.drawWorld();this.add.tileSprite(0,0,BALANCE.world,BALANCE.world,'water-volume').setOrigin(0).setDepth(-9.5).setAlpha(.68);const z=BALANCE.finalZone;
    this.zoneLabel=this.add.text(z.x,z.y-z.radius*.7,'EL JARDÍN DE ORIGEN\nRefugio de nutrientes',{fontFamily:'sans-serif',fontSize:'30px',align:'center',color:'#cce8c1'}).setOrigin(.5).setAlpha(.6);
    this.cameras.main.setBackgroundColor('#0b414b');this.cameras.main.setBounds(0,0,BALANCE.world,BALANCE.world);
    this.controls.bindWorld(this.game.canvas,(x,y)=>{const world=this.cameras.main.getWorldPoint(x,y),dx=world.x-this.player.x,dy=world.y-this.player.y,d=Math.hypot(dx,dy);return d<this.player.radius*.3?{x:0,y:0}:{x:dx/d,y:dy/d};});
    this.ready=true;this.begin(newRun(),true);this.hooks.ready();
  }
  begin(run:Run,menu=false) {
    if(!this.ready) return;
    this.tweens.killAll();this.ending=false;this.creatures.forEach(c=>c.view.destroy());this.creatures=[];this.foods.forEach(f=>f.sprite.destroy());this.foods=[];
    this.player?.view.destroy();this.run=copyRun(run);this.clock=0;this.currentRadius=radius(run.scale);this.cooldown=0;this.dash=0;this.hits.clear();this.nextId=1;this.saveTimer=0;this.tutorial=0;
    this.player=createCreature(this,{id:0,x:run.x,y:run.y,vx:0,vy:0,angle:-.3,radius:this.currentRadius,health:run.health,maxHealth:maxHealth(run.scale),parts:[...run.parts],angles:[...run.angles],species:null,shape:run.shape,color:run.color,speed:stats(run.parts,run.scale,run.angles).speed,hurtUntil:0,chase:0,rest:0,intent:0,charge:0,wander:0,fade:1});
    this.player.view.setDepth(5);
    for(let i=0;i<BALANCE.foodCount;i++)this.spawnFood(i<125?'algae':i<220?'particle':'remains',i<25||(i>=125&&i<140)||(i>=220&&i<230));
    for(let i=0;i<BALANCE.population;i++)this.spawnCreature();
    this.foodGrid.rebuild(this.foods);this.creatureGrid.rebuild(this.creatures);
    this.cameras.main.setZoom(this.zoom()).centerOn(run.x,run.y);
    this.setPaused(menu);renderCreature(this.player,0,true);this.creatures.forEach(c=>renderCreature(c,0));
    this.hooks.tick(this.run,0);
    if(!menu){this.hooks.notice(run.scale===4?'Madurez: sigue la señal hacia el Jardín de Origen.':'Muévete con WASD, flechas o el joystick. Tu boca frontal recoge algas.');this.checkpoint();}
  }
  setPaused(paused:boolean){this.paused=paused;this.controls.reset();this.player && (this.player.vx=this.player.vy=0);}
  applyAdaptation(run:Run){this.run=copyRun(run);this.player.parts=[...run.parts];this.player.angles=[...run.angles];this.player.shape=run.shape;this.player.color=run.color;this.player.health=run.health;this.player.maxHealth=maxHealth(run.scale);
    // Introduce this scale's organisms outside the visible area, preserving those still on screen.
    let replaced=0;const area=this.cameras.main.worldView;
    this.creatures=this.creatures.filter(c=>{if(replaced<6&&!area.contains(c.x,c.y)){c.view.destroy();replaced++;return false;}return true;});
    while(this.creatures.length<BALANCE.population)this.spawnCreature();
    this.creatures.forEach(c=>{c.rest=6;c.charge=0;c.chase=0;});this.setPaused(false);this.checkpoint();this.hooks.tick(this.run,this.cooldown);this.hooks.notice(run.scale===4?'Último viaje: busca el Jardín de Origen →':'Adaptación lista. Prueba cómo cambia tu nueva construcción.');}
  checkpoint(){if(this.run.health>0&&!saveRun(this.run))this.hooks.notice('El navegador no permite guardar. La partida sigue disponible mientras esta pestaña esté abierta.');}
  private zoom(){return 1.65/BALANCE.scales[this.run.scale].size * Math.min(1,Math.max(.78,this.scale.width/900));}
  update(_time:number,delta:number){
    if(!this.ready||this.paused||this.ending) return;
    // Consume the full frame using short simulation steps, even on slow renderers.
    const elapsed=Math.min(delta/1000,.25),steps=Math.max(1,Math.ceil(elapsed/.025));
    for(let i=0;i<steps;i++){this.simulate(elapsed/steps);if(this.paused||this.ending)break;}
    this.frames++;if(delta>28)this.slowFrames++;if(this.frames>=180){this.quality=this.slowFrames>75?.5:1;this.frames=0;this.slowFrames=0;}
    this.creatures.forEach(c=>renderCreature(c,this.clock));
    if(!this.ending)renderCreature(this.player,this.clock,true);
    const camera=this.cameras.main;camera.setZoom(Phaser.Math.Linear(camera.zoom,this.zoom(),1-Math.exp(-elapsed*2)));
    const look=this.player.radius*1.7*Math.min(1,Math.hypot(this.player.vx,this.player.vy)/this.player.speed);
    const cx=this.player.x+Math.cos(this.player.angle)*look,cy=this.player.y+Math.sin(this.player.angle)*look;
    camera.centerOn(Phaser.Math.Linear(camera.midPoint.x,cx,1-Math.exp(-elapsed*5)),Phaser.Math.Linear(camera.midPoint.y,cy,1-Math.exp(-elapsed*5)));
    this.animateEnvironment();
  }
  private simulate(dt:number){
    this.clock+=dt;this.run.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.dash=Math.max(0,this.dash-dt);
    const input=this.controls.read(),s=stats(this.run.parts,this.run.scale,this.run.angles);
    if(input.dash&&this.cooldown===0){this.dash=BALANCE.dashDuration;this.cooldown=s.cooldown;this.audio.play('dash');if(this.tutorial<3){this.tutorial=3;this.hooks.notice('El impulso ayuda a escapar. Los pinchos siguen haciendo daño.');}}
    this.currentRadius=Phaser.Math.Linear(this.currentRadius,radius(this.run.scale),1-Math.exp(-dt*2.2));this.player.radius=this.currentRadius;this.player.speed=s.speed;
    this.drive(this.player,input.x,input.y,this.dash>0?2.3+.55*Math.sqrt(s.propulsion):1,dt);
    this.run.x=this.player.x;this.run.y=this.player.y;
    this.foodGrid.rebuild(this.foods);this.creatureGrid.rebuild([this.player,...this.creatures]);
    this.feed(this.player);
    for(const c of this.creatures){
      if(c.health<=0)continue;
      const relevant=Math.hypot(c.x-this.player.x,c.y-this.player.y)<this.simRadius();
      if(relevant){const neighbors=this.creatureGrid.query(c.x,c.y,c.radius*12+230);const food=this.foodGrid.query(c.x,c.y,c.radius*8+100);
        const intent=think(c,neighbors,food,this.player,dt,this.clock);this.drive(c,intent.x,intent.y,intent.boost?2.15:1,dt);this.feed(c);
        for(const target of this.creatureGrid.query(c.x,c.y,c.radius*3+radius(this.run.scale)*2)){if(c.id===target.id||target.health<=0)continue;this.hit(c,target);}
      }
      c.fade=Phaser.Math.Linear(c.fade,c.radius<this.player.radius*.24?.15:1,dt*2);
    }
    for(const target of this.creatureGrid.query(this.player.x,this.player.y,this.player.radius*5)){if(target.id===0||target.health<=0)continue;this.hit(this.player,target);this.separate(this.player,target);}
    this.run.health=this.player.health;
    this.maintenance+=dt;this.hudTimer+=dt;this.saveTimer+=dt;
    if(this.maintenance>1){this.maintain();this.maintenance=0;}
    if(this.hudTimer>.1){this.hooks.tick(this.run,this.cooldown);this.hudTimer=0;}
    if(this.saveTimer>12 && !this.creatures.some(c=>c.parts.includes('jaw')&&Math.hypot(c.x-this.player.x,c.y-this.player.y)<this.player.radius*8)){this.checkpoint();this.saveTimer=0;}
    if(this.player.health<=0){this.setPaused(true);this.hooks.result(copyRun(this.run),false);return;}
    if(canGrow(this.run)){grow(this.run);this.player.health=this.run.health;this.player.maxHealth=maxHealth(this.run.scale);this.setPaused(true);this.audio.play('grow');this.hooks.adapt(copyRun(this.run));return;}
    if(canWin(this.run))this.win();
  }
  private drive(c:Creature,x:number,y:number,mult:number,dt:number){
    const moving=Math.hypot(x,y)>.05,blend=1-Math.exp(-(moving?BALANCE.acceleration:BALANCE.friction)*dt);
    c.vx=Phaser.Math.Linear(c.vx,x*c.speed*mult,blend);c.vy=Phaser.Math.Linear(c.vy,y*c.speed*mult,blend);
    if(moving){const desired=Math.atan2(y,x);c.angle+=angleDiff(desired,c.angle)*(1-Math.exp(-dt*stats(c.parts,0,c.angles).turnRate));}
    const margin=c.radius+30,bound=BALANCE.world-margin;
    if(c.x<margin+150)c.vx+=((margin+150-c.x)/150)*c.speed*.6*dt;
    if(c.x>bound-150)c.vx-=((c.x-bound+150)/150)*c.speed*.6*dt;
    if(c.y<margin+150)c.vy+=((margin+150-c.y)/150)*c.speed*.6*dt;
    if(c.y>bound-150)c.vy-=((c.y-bound+150)/150)*c.speed*.6*dt;
    c.x=Phaser.Math.Clamp(c.x+c.vx*dt,margin,bound);c.y=Phaser.Math.Clamp(c.y+c.vy*dt,margin,bound);
  }
  private feed(c:Creature){
    for(const food of this.foodGrid.query(c.x,c.y,c.radius*2.5+20)){
      if(!food.active||food.radius>c.radius*.7||!mouthAt(c.parts,c.x,c.y,c.angle,c.radius,food,c.angles,c.shape))continue;
      food.active=false;food.sprite.setVisible(false);c.biteUntil=this.clock+.3;
      if(c.id===0){this.run.health=c.health;eat(this.run,food.kind);c.health=this.run.health;
        if(this.clock-this.soundTimer>.08){this.audio.play('eat');this.soundTimer=this.clock;}
        if(this.tutorial<1){this.tutorial=1;this.hooks.notice('¡Tu primera comida! Comer también restaura un poco de salud.');}
      }else c.health=Math.min(c.maxHealth,c.health+2);
    }
  }
  private hit(attacker:Creature,target:Creature){
    if(attacker.radius<target.radius*.24||target.radius<attacker.radius*.24||target.hurtUntil>this.clock)return;
    const key=`${attacker.id}:${target.id}`;if((this.hits.get(key)??-10)+BALANCE.hitInterval>this.clock)return;
    const base=attackAt(attacker.parts,attacker.x,attacker.y,attacker.angle,attacker.radius,{x:target.x,y:target.y,radius:target.radius*.88},attacker.angles,attacker.shape);if(!base)return;
    attacker.biteUntil=this.clock+.3;this.hits.set(key,this.clock);const incoming=Math.atan2(attacker.y-target.y,attacker.x-target.x);
    const size=Phaser.Math.Clamp(attacker.radius/target.radius,.65,1.7);
    target.health=Math.max(0,target.health-base*size*protection(target.parts,target.angle,incoming,target.angles));target.hurtUntil=this.clock+BALANCE.hurtProtection;
    target.vx-=Math.cos(incoming)*target.speed*.5;target.vy-=Math.sin(incoming)*target.speed*.5;
    if(target.id===0){this.audio.play('hurt');if(this.tutorial<2){this.tutorial=2;this.hooks.notice('¡Cuidado! Aléjate de las mandíbulas y puntas. Espacio o ◇ para escapar.');}}
    if(target.health<=0 && target.id!==0){for(let i=0;i<5;i++)this.spawnRemains(target.x+Math.cos(i*1.25)*target.radius*.5,target.y+Math.sin(i*1.25)*target.radius*.5,target.radius*.17);}
  }
  private separate(a:Creature,b:Creature){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),limit=(a.radius+b.radius)*.78;if(d>0&&d<limit){const push=(limit-d)*.2;a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;}}
  private simRadius(){const camera=this.cameras.main;return Math.max(camera.width/camera.zoom,camera.height/camera.zoom)*.8+this.player.radius*10;}
  private foodLocation(kind:FoodKind,near=false){
    const a=Math.random()*Math.PI*2,rr=this.player.radius*(near?2+Math.random()*14:6+Math.random()*53);
    let x=this.player.x+Math.cos(a)*rr,y=this.player.y+Math.sin(a)*rr;
    // Fixed world-space patch centers; food within a patch moves independently.
    if(!near&&kind!=='remains'){
      const cell=520,offset=kind==='algae'?.25:.72;
      x=(Math.floor(x/cell)+offset)*cell+Math.cos(a)*this.player.radius*(2+Math.random()*4);
      y=(Math.floor(y/cell)+offset)*cell+Math.sin(a)*this.player.radius*(2+Math.random()*4);
    }
    return {x:Phaser.Math.Clamp(x,70,BALANCE.world-70),y:Phaser.Math.Clamp(y,70,BALANCE.world-70)};
  }
  private spawnFood(kind:FoodKind,near=false,reuse?:Food){
    const position=this.foodLocation(kind,near),r=this.player.radius*(kind==='particle'?.085:kind==='remains'?.22:.21)*( .8+Math.random()*.5);
    const f=reuse??{...position,radius:r,kind,active:true,sprite:this.add.image(position.x,position.y,kind).setDepth(-1),phase:Math.random()*6.28};
    Object.assign(f,position,{radius:r,kind,active:true});f.sprite.setTexture(kind).setVisible(true).setDisplaySize(r*2.5,r*2.5).setPosition(f.x,f.y).setAlpha(kind==='particle'?.65:1);if(!reuse)this.foods.push(f);
  }
  private spawnRemains(x:number,y:number,r:number){const f=this.foods.find(f=>!f.active)||this.foods.find(f=>Math.hypot(f.x-this.player.x,f.y-this.player.y)>this.simRadius());if(!f)return;this.spawnFood('remains',false,f);f.x=x;f.y=y;f.radius=r;f.sprite.setPosition(x,y).setDisplaySize(r*2.5,r*2.5);}
  private spawnCreature(){
    const idx=this.nextId++;
    const a=Math.random()*6.28,d=this.player.radius*(25+Math.random()*40);
    let x=Phaser.Math.Clamp(this.player.x+Math.cos(a)*d,100,BALANCE.world-100),y=Phaser.Math.Clamp(this.player.y+Math.sin(a)*d,100,BALANCE.world-100);
    const dangerous=x>6200&&y<4300;
    const kind:SpeciesKind=dangerous&&idx%3!==0?(idx%2?'hunter':'thorn'):SPECIES_KEYS[(idx%10<6?idx%3:3+idx%3)],spec=SPECIES[kind];
    if(idx<=6&&spec.behavior!=='hunt'){const calmDistance=this.player.radius*(8+Math.random()*9);x=Phaser.Math.Clamp(this.player.x+Math.cos(a)*calmDistance,100,BALANCE.world-100);y=Phaser.Math.Clamp(this.player.y+Math.sin(a)*calmDistance,100,BALANCE.world-100);}
    const tier=this.run.scale===0?(idx%4===0?1.7:.75+Math.random()*.6):BALANCE.scales[Math.max(0,this.run.scale-(idx%4===0?1:0))].size*(.75+Math.random()*.8);
    const r=22*tier*spec.size;
    const c=createCreature(this,{id:idx,x,y,vx:0,vy:0,angle:Math.random()*6.28,radius:r,health:60*tier,maxHealth:60*tier,parts:[...spec.parts],species:kind,shape:spec.shape,color:spec.color,speed:BALANCE.baseSpeed*tier*spec.speed,hurtUntil:0,chase:0,rest:8,intent:a,charge:0,wander:2,fade:0});this.creatures.push(c);
  }
  private maintain(){
    const range=this.simRadius()*1.6;
    this.foods.forEach((f,i)=>{if(!f.active||Math.hypot(f.x-this.player.x,f.y-this.player.y)>range)this.spawnFood(i<125?'algae':i<220?'particle':'remains',false,f);});
    this.creatures=this.creatures.filter(c=>{if(c.health<=0||Math.hypot(c.x-this.player.x,c.y-this.player.y)>range*1.15){c.view.destroy();return false;}return true;});
    while(this.creatures.length<BALANCE.population)this.spawnCreature();
    if(this.hits.size>300)for(const [key,time]of this.hits)if(time<this.clock-10)this.hits.delete(key);
  }
  private win(){
    this.ending=true;this.setPaused(true);this.audio.play('win');this.hooks.notice('Una vida se convierte en dos…');
    const p=this.player,child=createCreature(this,{...p,id:9999,x:p.x,y:p.y,parts:[...p.parts]});renderCreature(child,this.clock,true);
    this.tweens.add({targets:child.view,x:p.x+p.radius*1.3,scale:.72,duration:1700,ease:'Sine.easeInOut'});
    this.tweens.add({targets:p.view,x:p.x-p.radius*1.3,scale:.72,duration:1700,ease:'Sine.easeInOut',onComplete:()=>{child.view.destroy();this.hooks.result(copyRun(this.run),true);}});
  }
  private makeTextures(){
    const water=this.textures.createCanvas('water-volume',1024,1024)!,ctx=water.context;
    ctx.fillStyle='#257c94';ctx.fillRect(0,0,1024,1024);
    const volume=ctx.createRadialGradient(512,512,0,512,512,740);volume.addColorStop(0,'#5ab9bd');volume.addColorStop(.45,'#389aaf');volume.addColorStop(1,'#1c6389');ctx.fillStyle=volume;ctx.fillRect(0,0,1024,1024);
    for(let i=0;i<42;i++){ctx.beginPath();const x=(Math.sin(i*18.37)*.5+.5)*1024,y=(Math.cos(i*31.12)*.5+.5)*1024;for(const dx of [-1024,0,1024])for(const dy of [-1024,0,1024]){ctx.beginPath();ctx.ellipse(x+dx,y+dy,50+i%5*24,27+i%4*15,i*.7,0,Math.PI*2);ctx.strokeStyle='rgba(190,246,223,.034)';ctx.lineWidth=2;ctx.stroke();}}water.refresh();
    for(const kind of ['algae' ,'particle','remains'] as FoodKind[]){const g=this.make.graphics({x:0,y:0});
      if(kind==='algae'){g.fillStyle(0x49685b,.35);g.fillEllipse(18,21,27,24);g.fillStyle(0xa8cc68);g.fillEllipse(18,17,25,25);g.fillStyle(0xdfeca3);g.fillEllipse(14,12,15,12);g.fillStyle(0x86b35d);g.fillCircle(21,20,5);g.lineStyle(1.4,0xdce599,.8);g.lineBetween(14,25,21,10);}
      else if(kind==='particle'){g.fillStyle(0xa5e2dc,.2);g.fillCircle(18,18,16);g.fillStyle(0xcff2dc,.8);g.fillCircle(18,18,6);g.fillStyle(0xffffff,.7);g.fillCircle(16,16,2);}
      else{g.fillStyle(0x875d60,.45);g.fillTriangle(7,14,29,12,24,30);g.fillStyle(0xde9285);g.fillTriangle(7,11,27,9,25,27);g.fillStyle(0xffc4a9);g.fillTriangle(11,13,24,12,16,23);g.fillStyle(0xad6967);g.fillCircle(21,21,4);}
      g.generateTexture(kind,36,36);g.destroy();
    }
  }
  private drawWorld(){
    const g=this.worldArt,w=BALANCE.world;
    g.fillStyle(0x1c7184);g.fillRect(0,0,w,w);
    for(let i=0;i<85;i++){const x=(Math.sin(i*78.23)*.5+.5)*w,y=(Math.cos(i*41.71)*.5+.5)*w;g.fillStyle(i%3===0?0x123e65:0x2b9f9e,.3);g.fillEllipse(x,y,600+(i%7)*200,450+(i%5)*130);}
    for(let i=0;i<60;i++){const x=(Math.sin(i*22.1)*.5+.5)*w,y=(Math.cos(i*63.27)*.5+.5)*w;g.fillStyle(0x2b6060,.3);for(let k=0;k<4;k++)g.fillEllipse(x+k*60,y+Math.sin(k)*70,210,360);}
    g.fillStyle(0x071f34,.25);g.fillEllipse(8000,2700,3400,3000);g.lineStyle(3,0x476e74,.15);g.strokeEllipse(8000,2700,3100,2800);
    const z=BALANCE.finalZone;g.fillStyle(0x55856a,.22);g.fillCircle(z.x,z.y,z.radius);g.lineStyle(5,0xb3d795,.25);g.strokeCircle(z.x,z.y,z.radius);
    this.boundsGlow.lineStyle(100,0x061f2c,.8);this.boundsGlow.strokeRect(0,0,w,w);this.boundsGlow.lineStyle(4,0x9ecaba,.2);this.boundsGlow.strokeRect(65,65,w-130,w-130);
  }
  private animateEnvironment(){
    const camera=this.cameras.main,area=camera.worldView,g=this.motes;g.clear();
    const count=this.quality===1?52:22;
    for(let i=0;i<this.foods.length;i+=10){const f=this.foods[i];if(f.kind==='algae'&&area.contains(f.x,f.y)){g.fillStyle(0x619c76,.065);g.fillEllipse(f.x,f.y,f.radius*26,f.radius*19);g.fillStyle(0x86b088,.045);g.fillEllipse(f.x+f.radius*3,f.y-f.radius*4,f.radius*15,f.radius*23);}}
    for(let i=0;i<count;i++){const x=area.x+(((i*173.17+this.clock*(i%3+1)*3)%Math.max(1,area.width))),y=area.y+((i*91.83)%Math.max(1,area.height));g.fillStyle(0xbde2d8,.09+(i%3)*.035);g.fillCircle(x,y,(1+i%3)/camera.zoom);}
    for(const food of this.foods){if(!food.active)continue;const onCamera=area.contains(food.x,food.y);food.sprite.setVisible(onCamera);if(onCamera){food.sprite.setPosition(food.x,food.y+Math.sin(this.clock*1.6+food.phase)*food.radius*.18);if(food.kind==='remains')food.sprite.setRotation(food.phase+this.clock*.1);}}
    this.zoneLabel.setVisible(this.run.scale>=3);
  }
}
