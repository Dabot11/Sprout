import Phaser from 'phaser';
import { BALANCE, SPECIES, SPECIES_KEYS, speciesLoadout, type FoodKind, type SpeciesKind } from './config';
import { bodyRadius } from './anatomy';
import { ContactTools } from './combat';
import { fruitPosition, renderPlant, type Plant } from './plants';
import { attackAt, angleDiff, canGrow, canWin, copyRun, eat, grow, maxHealth, mouthAt, newRun, protection, radius, stats, type Run } from './model';
import { createCreature, renderCreature, type Creature } from './creatures';
import { think } from './ai';
import { Spatial } from './spatial';
import { Controls } from './controls';
import { Sound } from './audio';
import { saveRun } from './storage';
export interface Food {x:number;y:number;radius:number;kind:FoodKind;active:boolean;sprite:Phaser.GameObjects.Image;phase:number;plantId?:number;fruitIndex?:number;regrowAt?:number;ambient?:boolean;expires?:number}
export interface SceneHooks { tick:(run:Run,cooldown:number)=>void;adapt:(run:Run)=>void;result:(run:Run,won:boolean)=>void;notice:(text:string)=>void;pause:()=>void;ready:()=>void }
export class TideScene extends Phaser.Scene {
  run:Run=newRun();player!:Creature;paused=true;controls:Controls;audio:Sound;
  private creatures:Creature[]=[];private plants:Plant[]=[];private tools=new ContactTools();private effects!:Phaser.GameObjects.Graphics;private foods:Food[]=[];private foodGrid=new Spatial<Food>(BALANCE.spatialCell);private creatureGrid=new Spatial<Creature>(BALANCE.spatialCell);
  private clock=0;private cooldown=0;private dash=0;private currentRadius=22;private nextId=1;
  private hits=new Map<string,number>();private maintenance=0;private hudTimer=0;private saveTimer=0;private soundTimer=0;
  private worldArt!:Phaser.GameObjects.Graphics;private motes!:Phaser.GameObjects.Graphics;private zoneLabel!:Phaser.GameObjects.Text;private boundsGlow!:Phaser.GameObjects.Graphics;
  private gardenSeeded=false;private ending=false;private quality=1;private frames=0;private slowFrames=0;private tutorial=0;private ready=false;
  constructor(private hooks:SceneHooks,sound:Sound) {super('tide');this.audio=sound;this.controls=new Controls(()=>this.hooks.pause());}
  get isReady(){return this.ready;}
  create() {
    this.makeTextures();this.worldArt=this.add.graphics().setDepth(-10);this.motes=this.add.graphics().setDepth(-9);this.boundsGlow=this.add.graphics().setDepth(-8);
    this.effects=this.add.graphics().setDepth(4);this.drawWorld();this.add.tileSprite(0,0,BALANCE.world,BALANCE.world,'water-volume').setOrigin(0).setDepth(-9.5).setAlpha(.68);const z=BALANCE.finalZone;
    this.zoneLabel=this.add.text(z.x,z.y-z.radius*.7,'EL JARDÍN DE ORIGEN\nRefugio de nutrientes',{fontFamily:'sans-serif',fontSize:'30px',align:'center',color:'#cce8c1'}).setOrigin(.5).setAlpha(.6);
    this.cameras.main.setBackgroundColor('#0b414b');this.cameras.main.setBounds(0,0,BALANCE.world,BALANCE.world);
    this.controls.bindWorld(this.game.canvas,(x,y)=>{const world=this.cameras.main.getWorldPoint(x,y),dx=world.x-this.player.x,dy=world.y-this.player.y,d=Math.hypot(dx,dy);return d<this.player.radius*.3?{x:0,y:0}:{x:dx/d,y:dy/d};});
    this.ready=true;this.begin(newRun(),true);this.hooks.ready();
  }
  begin(run:Run,menu=false) {
    if(!this.ready) return;
    this.tweens.killAll();this.ending=false;this.gardenSeeded=false;this.plants.forEach(p=>p.g.destroy());this.plants=[];this.tools.reset();this.effects.clear();this.creatures.forEach(c=>c.view.destroy());this.creatures=[];this.foods.forEach(f=>f.sprite.destroy());this.foods=[];
    this.player?.view.destroy();this.run=copyRun(run);this.clock=0;this.currentRadius=radius(run.scale);this.cooldown=0;this.dash=0;this.hits.clear();this.nextId=1;this.saveTimer=0;this.tutorial=0;
    this.player=createCreature(this,{id:0,x:run.x,y:run.y,vx:0,vy:0,angle:-.3,radius:this.currentRadius,health:run.health,maxHealth:maxHealth(run.scale,run.profile),parts:[...run.parts],angles:[...run.angles],species:null,shape:run.shape,color:run.color,profile:run.profile,eyes:run.eyes,pattern:run.pattern,speed:stats(run.parts,run.scale,run.angles,run.profile).speed,hurtUntil:0,chase:0,rest:0,intent:0,charge:0,wander:0,fade:1});
    this.player.view.setDepth(5);
    for(let i=0;i<12;i++){const plant:Plant={id:i,x:0,y:0,radius:1,phase:Math.random()*6.28,g:this.add.graphics().setDepth(-4)};this.placePlant(plant,true);this.plants.push(plant);renderPlant(plant,0);}
    for(let i=0;i<BALANCE.foodCount;i++){
      const kind:FoodKind=i<144?'algae':i<264?'particle':'remains';this.spawnFood(kind,i<156||i>=264&&i<270);
      const food=this.foods[i];if(i<144){food.plantId=Math.floor(i/12);food.fruitIndex=i%12;this.attachFruit(food);}else if(i>=264){food.ambient=i<270;if(!food.ambient){food.active=false;food.sprite.setVisible(false);}}
    }
    for(let i=0;i<BALANCE.population;i++)this.spawnCreature();
    this.foodGrid.rebuild(this.foods);this.creatureGrid.rebuild(this.creatures);
    this.cameras.main.setZoom(this.zoom()).centerOn(run.x,run.y);
    this.setPaused(menu);renderCreature(this.player,0,true);this.creatures.forEach(c=>renderCreature(c,0));
    this.hooks.tick(this.run,0);
    if(!menu){this.hooks.notice(run.scale===4?'Madurez: sigue la señal hacia el Jardín de Origen.':'Muévete con WASD, flechas o el joystick. Acerca la trompa a los frutos de las plantas.');this.checkpoint();}
  }
  setPaused(paused:boolean){this.paused=paused;this.controls.reset();this.player && (this.player.vx=this.player.vy=0);}
  applyAdaptation(run:Run){this.run=copyRun(run);this.player.parts=[...run.parts];this.player.angles=[...run.angles];this.player.shape=run.shape;this.player.color=run.color;this.player.profile=run.profile;this.player.eyes=run.eyes;this.player.pattern=run.pattern;this.player.health=run.health;this.player.maxHealth=maxHealth(run.scale,run.profile);this.tools.reset();this.effects.clear();this.cooldown=0;this.dash=0;this.creatures.forEach(c=>{c.poisonedUntil=this.clock;c.stunUntil=this.clock;});
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
    const input=this.controls.read(),s=stats(this.run.parts,this.run.scale,this.run.angles,this.run.profile);
    if(input.dash&&this.cooldown===0){this.dash=s.dashDuration;this.cooldown=s.cooldown;this.audio.play('dash');if(this.tutorial<3){this.tutorial=3;this.hooks.notice('El impulso ayuda a escapar. Los pinchos siguen haciendo daño.');}}
    this.currentRadius=Phaser.Math.Linear(this.currentRadius,radius(this.run.scale),1-Math.exp(-dt*2.2));this.player.radius=this.currentRadius;this.player.speed=s.speed;
    this.drive(this.player,input.x,input.y,this.dash>0?s.dashPower:1,dt);
    this.run.x=this.player.x;this.run.y=this.player.y;
    this.foods.forEach(f=>{if(f.plantId!==undefined)this.attachFruit(f);});
    this.foodGrid.rebuild(this.foods);this.creatureGrid.rebuild([this.player,...this.creatures]);
    this.feed(this.player);
    for(const c of this.creatures){
      if(c.health<=0)continue;
      const relevant=Math.hypot(c.x-this.player.x,c.y-this.player.y)<this.simRadius();
      if(relevant){const neighbors=this.creatureGrid.query(c.x,c.y,c.radius*12+230);const food=this.foodGrid.query(c.x,c.y,c.radius*8+100);
        const intent=think(c,neighbors,food,this.player,dt,this.clock);this.drive(c,intent.x,intent.y,intent.boost?stats(c.parts,0,c.angles,c.profile).dashPower:1,dt);this.feed(c);
        for(const target of this.creatureGrid.query(c.x,c.y,c.radius*4+radius(this.run.scale)*3)){if(c.id===target.id||target.health<=0)continue;this.hit(c,target);if(c.rest===0)this.specialContact(c,target);if(target.id!==0&&c.id<target.id)this.separate(c,target,dt);}
      }
      c.fade=Phaser.Math.Linear(c.fade,c.radius<this.player.radius*.24?.15:1,dt*2);
    }
    for(const target of this.creatureGrid.query(this.player.x,this.player.y,this.player.radius*5)){if(target.id===0||target.health<=0)continue;this.hit(this.player,target);this.specialContact(this.player,target);this.separate(this.player,target,dt);}
    const actors=[this.player,...this.creatures];
    for(const [id,damage]of this.tools.tick(actors,this.clock,dt)){const c=actors.find(c=>c.id===id);if(!c)continue;c.health=Math.max(0,c.health-damage);c.poisonedUntil=this.clock+.45;if(c.health<=0&&c.id!==0)this.killCreature(c);}
    this.run.health=this.player.health;
    this.maintenance+=dt;this.hudTimer+=dt;this.saveTimer+=dt;
    if(this.maintenance>1){this.maintain();this.maintenance=0;}
    if(this.hudTimer>.1){this.hooks.tick(this.run,this.cooldown);this.hudTimer=0;}
    if(this.saveTimer>12 && !this.creatures.some(c=>c.parts.includes('jaw')&&Math.hypot(c.x-this.player.x,c.y-this.player.y)<this.player.radius*8)){this.checkpoint();this.saveTimer=0;}
    if(this.player.health<=0){this.setPaused(true);this.hooks.result(copyRun(this.run),false);return;}
    if(canGrow(this.run)){grow(this.run);this.player.health=this.run.health;this.player.maxHealth=maxHealth(this.run.scale,this.run.profile);this.setPaused(true);this.audio.play('grow');this.hooks.adapt(copyRun(this.run));return;}
    if(canWin(this.run))this.win();
  }
  private drive(c:Creature,x:number,y:number,mult:number,dt:number){
    if((c.stunUntil??0)>this.clock){x=0;y=0;}const build=stats(c.parts,0,c.angles,c.profile),slow=(c.poisonedUntil??0)>this.clock?.78:1;
    const moving=Math.hypot(x,y)>.05,blend=1-Math.exp(-(moving?build.acceleration:BALANCE.friction)*dt);
    c.vx=Phaser.Math.Linear(c.vx,x*c.speed*mult*slow,blend);c.vy=Phaser.Math.Linear(c.vy,y*c.speed*mult*slow,blend);
    if(moving){const desired=Math.atan2(y,x);c.angle+=angleDiff(desired,c.angle)*(1-Math.exp(-dt*build.turnRate));}
    const margin=c.radius*Math.max(1,c.profile.length/2)+30,bound=BALANCE.world-margin;
    if(c.x<margin+150)c.vx+=((margin+150-c.x)/150)*c.speed*.6*dt;
    if(c.x>bound-150)c.vx-=((c.x-bound+150)/150)*c.speed*.6*dt;
    if(c.y<margin+150)c.vy+=((margin+150-c.y)/150)*c.speed*.6*dt;
    if(c.y>bound-150)c.vy-=((c.y-bound+150)/150)*c.speed*.6*dt;
    c.x=Phaser.Math.Clamp(c.x+c.vx*dt,margin,bound);c.y=Phaser.Math.Clamp(c.y+c.vy*dt,margin,bound);
  }
  private feed(c:Creature){
    for(const food of this.foodGrid.query(c.x,c.y,c.radius*2.5+20)){
      if(!food.active||food.radius>c.radius*.7||!mouthAt(c.parts,c.x,c.y,c.angle,c.radius,food,c.angles,c.shape,c.profile))continue;
      food.active=false;food.sprite.setVisible(false);food.regrowAt=this.clock+(food.kind==='algae'?14+Math.random()*6:food.kind==='particle'?5:18);c.biteUntil=this.clock+.3;
      if(c.id===0){this.run.health=c.health;eat(this.run,food.kind);c.health=this.run.health;
        if(this.clock-this.soundTimer>.08){this.audio.play('eat');this.soundTimer=this.clock;}
        if(this.tutorial<1){this.tutorial=1;this.hooks.notice('¡Tu primera comida! Comer también restaura un poco de salud.');}
      }else c.health=Math.min(c.maxHealth,c.health+2);
    }
  }
  private hit(attacker:Creature,target:Creature){
    if(attacker.radius<target.radius*.24||target.radius<attacker.radius*.24||target.hurtUntil>this.clock)return;
    const key=`${attacker.id}:${target.id}`;if((this.hits.get(key)??-10)+BALANCE.hitInterval>this.clock)return;
    const base=attackAt(attacker.parts,attacker.x,attacker.y,attacker.angle,attacker.radius,{x:target.x,y:target.y,radius:target.radius*bodyRadius(Math.atan2(attacker.y-target.y,attacker.x-target.x)-target.angle,target.shape,target.profile)*.9},attacker.angles,attacker.shape,attacker.profile);if(!base)return;
    attacker.biteUntil=this.clock+.3;this.hits.set(key,this.clock);const incoming=Math.atan2(attacker.y-target.y,attacker.x-target.x);
    const size=Phaser.Math.Clamp(attacker.radius/target.radius,.65,1.7);
    target.health=Math.max(0,target.health-base*size*protection(target.parts,target.angle,incoming,target.angles));target.hurtUntil=this.clock+BALANCE.hurtProtection;
    target.vx-=Math.cos(incoming)*target.speed*.5;target.vy-=Math.sin(incoming)*target.speed*.5;
    if(target.id===0){this.audio.play('hurt');if(this.tutorial<2){this.tutorial=2;this.hooks.notice('¡Cuidado! Aléjate de las mandíbulas y puntas. Espacio o ◇ para escapar.');}}
    if(target.health<=0&&target.id!==0)this.killCreature(target);
  }
  private specialContact(attacker:Creature,target:Creature){
    if((attacker.stunUntil??0)>this.clock)return;
    for(const event of this.tools.contact(attacker,target,this.clock)){
      if(event.kind==='electric'){const incoming=Math.atan2(attacker.y-target.y,attacker.x-target.x);target.health=Math.max(0,target.health-event.damage);target.stunUntil=this.clock+event.stun;attacker.electricUntil=this.clock+.2;attacker.electricTarget={x:event.x,y:event.y};if(target.id===0)this.audio.play('hurt');if(target.health<=0&&target.id!==0)this.killCreature(target);}
    }
  }
  private killCreature(c:Creature){if(c.deathHandled)return;c.deathHandled=true;c.deathAt=this.clock;const chunks=Math.min(10,Math.max(4,Math.round(c.radius/this.player.radius*5)));for(let i=0;i<chunks;i++)this.spawnRemains(c.x+Math.cos(i*6.28/chunks)*c.radius*.45,c.y+Math.sin(i*6.28/chunks)*c.radius*.45,c.radius*(.15+Math.random()*.06));}
  private separate(a:Creature,b:Creature,dt=.025){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),limit=(a.radius*bodyRadius(angle-a.angle,a.shape,a.profile)+b.radius*bodyRadius(angle+Math.PI-b.angle,b.shape,b.profile))*.77;if(d>0&&d<limit){const push=(limit-d)*(1-Math.exp(-dt*8));a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;}}
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
  private spawnRemains(x:number,y:number,r:number){const f=this.foods.find(f=>f.kind==='remains'&&!f.active)??this.foods.find(f=>f.kind==='remains'&&!this.cameras.main.worldView.contains(f.x,f.y));if(!f)return;this.spawnFood('remains',false,f);f.x=x;f.y=y;f.radius=r;f.ambient=false;f.expires=this.clock+45;f.sprite.setPosition(x,y).setDisplaySize(r*2.5,r*2.5);}
  private placePlant(plant:Plant,near=false){const a=Math.random()*Math.PI*2,d=this.player.radius*(near?5+Math.random()*19:12+Math.random()*40);plant.x=Phaser.Math.Clamp(this.player.x+Math.cos(a)*d,120,BALANCE.world-120);plant.y=Phaser.Math.Clamp(this.player.y+Math.sin(a)*d,120,BALANCE.world-120);plant.radius=this.player.radius*(2.35+Math.random()*.55);}
  private attachFruit(f:Food){const p=this.plants[f.plantId!];if(!p)return;const point=fruitPosition(p,f.fruitIndex!,this.clock);f.x=point.x;f.y=point.y;f.radius=p.radius*.087;f.sprite.setPosition(f.x,f.y).setDisplaySize(f.radius*2.5,f.radius*2.5);}
  private spawnCreature(){
    const idx=this.nextId++;
    const a=Math.random()*6.28,d=this.player.radius*(25+Math.random()*40);
    let x=Phaser.Math.Clamp(this.player.x+Math.cos(a)*d,100,BALANCE.world-100),y=Phaser.Math.Clamp(this.player.y+Math.sin(a)*d,100,BALANCE.world-100);
    const dangerous=x>6200&&y<4300,available=SPECIES_KEYS.filter(k=>SPECIES[k].minimumScale<=this.run.scale);
    const calm=available.filter(k=>!['hunt','guard'].includes(SPECIES[k].behavior)),hostile=available.filter(k=>['hunt','guard'].includes(SPECIES[k].behavior));
    const pool=idx<=6?calm:idx%10<(dangerous?6:3)?hostile:calm,kind:SpeciesKind=pool[idx%pool.length],spec=SPECIES[kind];
    if(idx<=6){const d=this.player.radius*(8+Math.random()*9);x=Phaser.Math.Clamp(this.player.x+Math.cos(a)*d,100,BALANCE.world-100);y=Phaser.Math.Clamp(this.player.y+Math.sin(a)*d,100,BALANCE.world-100);}
    const tier=this.run.scale===0?(idx%4===0?1.7:.75+Math.random()*.6):BALANCE.scales[Math.max(0,this.run.scale-(idx%4===0?1:0))].size*(.75+Math.random()*.8);
    const r=22*tier*spec.size,loadout=speciesLoadout(spec),mobility=stats(loadout.parts,0,loadout.angles,spec.profile).speed/BALANCE.baseSpeed;
    const c=createCreature(this,{id:idx,x,y,vx:0,vy:0,angle:Math.random()*6.28,radius:r,health:60*tier,maxHealth:60*tier,...loadout,species:kind,shape:spec.shape,color:spec.color,profile:spec.profile,eyes:spec.eyes,pattern:spec.pattern,homeX:x,homeY:y,speed:BALANCE.baseSpeed*tier*spec.speed*mobility,hurtUntil:0,chase:0,rest:8,intent:a,charge:0,wander:2,fade:0});this.creatures.push(c);
  }
  private maintain(){
    const range=this.simRadius()*1.6;
    const zone=BALANCE.finalZone;
    if(this.run.scale===4&&!this.gardenSeeded&&Math.hypot(this.player.x-zone.x,this.player.y-zone.y)<zone.radius*2.3){
      const candidates=this.plants.filter(p=>!this.cameras.main.worldView.contains(p.x,p.y)).slice(0,6);
      for(const p of candidates){const a=p.id*Math.PI/3,d=zone.radius*.42;p.x=zone.x+Math.cos(a)*d;p.y=zone.y+Math.sin(a)*d;p.radius=this.player.radius*2.6;p.g.setAlpha(0);for(const f of this.foods)if(f.plantId===p.id){f.active=true;f.regrowAt=0;this.attachFruit(f);}}
      this.gardenSeeded=candidates.length>=4;
    }
    this.plants.forEach(p=>{if(Math.hypot(p.x-this.player.x,p.y-this.player.y)>this.simRadius()*1.05&&!this.cameras.main.worldView.contains(p.x,p.y)){this.placePlant(p);for(const f of this.foods)if(f.plantId===p.id){f.active=true;f.regrowAt=0;this.attachFruit(f);}}});
    this.foods.forEach(f=>{
      if(f.kind==='remains'){if(f.expires!==undefined&&f.expires<this.clock){f.active=false;f.sprite.setVisible(false);f.expires=undefined;}if(f.ambient&&(!f.active&&this.clock>(f.regrowAt??0)||Math.hypot(f.x-this.player.x,f.y-this.player.y)>range))this.spawnFood('remains',false,f);return;}
      if(f.plantId!==undefined){if(!f.active&&this.clock>(f.regrowAt??0)){f.active=true;f.sprite.setVisible(true);}return;}
      if(!f.active&&this.clock>(f.regrowAt??0)||Math.hypot(f.x-this.player.x,f.y-this.player.y)>range)this.spawnFood('particle',false,f);
    });
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
    ctx.fillStyle='#193f66';ctx.fillRect(0,0,1024,1024);
    const volume=ctx.createRadialGradient(512,512,0,512,512,740);volume.addColorStop(0,'#3f7e96');volume.addColorStop(.45,'#285677');volume.addColorStop(1,'#163453');ctx.fillStyle=volume;ctx.fillRect(0,0,1024,1024);
    for(let i=0;i<42;i++){ctx.beginPath();const x=(Math.sin(i*18.37)*.5+.5)*1024,y=(Math.cos(i*31.12)*.5+.5)*1024;for(const dx of [-1024,0,1024])for(const dy of [-1024,0,1024]){ctx.beginPath();ctx.ellipse(x+dx,y+dy,50+i%5*24,27+i%4*15,i*.7,0,Math.PI*2);ctx.strokeStyle='rgba(190,246,223,.034)';ctx.lineWidth=2;ctx.stroke();}}water.refresh();
    for(const kind of ['algae','particle','remains'] as FoodKind[]){
      const texture=this.textures.createCanvas(kind,64,64)!,ctx=texture.context;ctx.translate(32,32);
      if(kind==='algae'){const fill=ctx.createRadialGradient(-7,-8,1,2,3,22);fill.addColorStop(0,'#eff48b');fill.addColorStop(.4,'#b8d94b');fill.addColorStop(1,'#648c24');ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(251,255,181,.55)';ctx.beginPath();ctx.ellipse(-7,-7,7,4,-.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6c972a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(4,-22);ctx.stroke();}
      else if(kind==='particle'){const glow=ctx.createRadialGradient(0,0,0,0,0,27);glow.addColorStop(0,'rgba(226,239,249,.8)');glow.addColorStop(.3,'rgba(163,198,214,.32)');glow.addColorStop(1,'rgba(145,180,221,0)');ctx.fillStyle=glow;ctx.fillRect(-32,-32,64,64);ctx.strokeStyle='rgba(224,237,246,.65)';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*10,y=Math.sin(a)*10;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();}
      else {const flesh=ctx.createRadialGradient(-8,-9,0,3,4,30);flesh.addColorStop(0,'#f2cbb5');flesh.addColorStop(.5,'#de929b');flesh.addColorStop(1,'#995568');ctx.fillStyle=flesh;ctx.beginPath();ctx.moveTo(-21,-10);ctx.bezierCurveTo(-25,-25,4,-28,12,-18);ctx.bezierCurveTo(30,-22,27,7,16,12);ctx.bezierCurveTo(13,29,-10,27,-13,12);ctx.bezierCurveTo(-28,12,-24,-2,-21,-10);ctx.closePath();ctx.fill();ctx.strokeStyle='#edb3b5';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#a95a67';ctx.beginPath();ctx.ellipse(2,7,11,7,.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(249,206,190,.65)';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-12+i*6,-13);ctx.quadraticCurveTo(-14+i*6,-2,-6+i*7,7);ctx.stroke();}}
      texture.refresh();
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
    for(const plant of this.plants){const visible=plant.x+plant.radius>=area.x&&plant.x-plant.radius<=area.x+area.width&&plant.y+plant.radius>=area.y&&plant.y-plant.radius<=area.y+area.height;plant.g.setVisible(visible);if(visible){plant.g.setAlpha(Math.min(1,plant.g.alpha+.06));renderPlant(plant,this.clock);}}
    this.effects.clear();for(const cloud of this.tools.clouds){const life=Phaser.Math.Clamp((cloud.expires-this.clock)/BALANCE.poisonDuration,0,1);this.effects.fillStyle(0x9db953,.13*life);this.effects.fillCircle(cloud.x,cloud.y,cloud.radius);for(let i=0;i<7;i++){const a=i*.9+this.clock*.6;this.effects.fillStyle(0xc2d377,.10*life);this.effects.fillCircle(cloud.x+Math.cos(a)*cloud.radius*.5,cloud.y+Math.sin(a)*cloud.radius*.5,cloud.radius*.24);}}
    for(const food of this.foods){if(!food.active)continue;const onCamera=area.contains(food.x,food.y);food.sprite.setVisible(onCamera);if(onCamera){food.sprite.setPosition(food.x,food.y+(food.plantId===undefined?Math.sin(this.clock*1.6+food.phase)*food.radius*.18:0));if(food.kind==='remains'){food.sprite.setRotation(food.phase+this.clock*.1);food.sprite.setAlpha(food.expires===undefined?1:Math.min(1,(food.expires-this.clock)/7));}}}
    this.zoneLabel.setVisible(this.run.scale>=3);
  }
}
