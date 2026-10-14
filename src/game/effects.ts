import type Phaser from 'phaser';
export type EffectKind='eat'|'hit'|'dash'|'grow'|'death'|'poison'|'electric';
interface Particle{x:number;y:number;vx:number;vy:number;age:number;life:number;radius:number;color:number;kind:'bubble'|'glow'|'chip'|'ring';angle:number}
/** One bounded graphics layer: no new game objects or tweens per particle. */
export class Feedback {
  private particles:Particle[]=[];private trailClock=0;
  constructor(private g:Phaser.GameObjects.Graphics,readonly reduced=false){}
  get count(){return this.particles.length;}
  reset(){this.particles=[];this.trailClock=0;this.g.clear();}
  burst(kind:EffectKind,x:number,y:number,r:number,color=0xcdecd6,angle=0){
    const count=this.reduced?3:kind==='death'?22:kind==='grow'?28:kind==='dash'?14:kind==='electric'?16:9;
    for(let i=0;i<count;i++){const a=angle+(i/count)*Math.PI*2,speed=r*(kind==='death'?2.8:kind==='grow'?2:1.5)*(.5+Math.random()),life=kind==='grow'?1.1:kind==='death'?.85:.35+Math.random()*.4;
      this.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,age:0,life,radius:r*(kind==='death'?.08:.025+Math.random()*.04),color,angle:a,kind:kind==='death'?'chip':kind==='electric'||kind==='poison'?'glow':'bubble'});}
    if(kind==='grow'||kind==='dash'||kind==='death')this.push({x,y,vx:0,vy:0,age:0,life:kind==='grow'?1.2:.65,radius:r*.5,color,angle:0,kind:'ring'});
  }
  trail(x:number,y:number,r:number,vx:number,vy:number,dt:number){
    this.trailClock+=dt;const speed=Math.hypot(vx,vy);if(speed<r*1.8){this.trailClock=0;return;}const period=this.reduced?.16:.045;
    while(this.trailClock>=period){this.trailClock-=period;const a=Math.atan2(vy,vx),side=(Math.random()-.5)*r*.9;
      this.push({x:x-Math.cos(a)*r*1.1-Math.sin(a)*side,y:y-Math.sin(a)*r*1.1+Math.cos(a)*side,vx:-vx*.12,vy:-vy*.12,age:0,life:.65+Math.random()*.3,radius:r*(.018+Math.random()*.035),color:0xb5e6e3,kind:'bubble',angle:a});}
  }
  private push(p:Particle){if(this.particles.length>=180)this.particles.shift();this.particles.push(p);}
  update(dt:number){for(const p of this.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*2);p.vy*=Math.exp(-dt*2);}this.particles=this.particles.filter(p=>p.age<p.life);}
  draw(){const g=this.g;g.clear();for(const p of this.particles){const t=p.age/p.life,alpha=(1-t)**1.4,r=p.kind==='ring'?p.radius*(1+t*5):p.radius*(1+t*.4);
    if(p.kind==='ring'){g.lineStyle(Math.max(.6,r*.015),p.color,alpha*.25);g.strokeCircle(p.x,p.y,r);}
    else if(p.kind==='bubble'){g.lineStyle(Math.max(.4,r*.2),p.color,alpha*.5);g.strokeCircle(p.x,p.y,r);g.fillStyle(0xf0fff3,alpha*.6);g.fillCircle(p.x-r*.3,p.y-r*.35,r*.25);}
    else if(p.kind==='chip'){g.fillStyle(p.color,alpha*.75);g.fillEllipse(p.x,p.y,r*2.6,r*1.4);}
    else {g.fillStyle(p.color,alpha*.12);g.fillCircle(p.x,p.y,r*3.2);g.fillStyle(p.color,alpha*.8);g.fillCircle(p.x,p.y,r);}}
  }
}
