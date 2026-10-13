import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BALANCE } from '../src/game/config';
import { attackAt, buy, canWin, mount, relocate, closestPart, compatible, copyRun, eat, grow, move, mouthAt, newRun, partPosition, place, protection, remove, stats, usedCapacity } from '../src/game/model';
import { clearRun, loadRun, saveRun, validRun } from '../src/game/storage';
import { anchor, propulsion, tailPoints } from '../src/game/anatomy';
import { Spatial } from '../src/game/spatial';
describe('Dietas y colisiones locales',()=>{
  it('acepta únicamente alimentos compatibles con cada boca',()=>{
    expect(compatible('gather','algae')).toBe(true);expect(compatible('jaw','remains')).toBe(true);expect(compatible('filter','particle')).toBe(true);
    for(const p of ['gather','jaw','filter','plate','spike','flagellum'] as const)for(const f of ['algae','remains','particle'] as const)
      expect(compatible(p,f)).toBe((p==='gather'&&f==='algae')||(p==='jaw'&&f==='remains')||(p==='filter'&&f==='particle'));
  });
  it('gira la zona de alimentación con el cuerpo, sin consumir por detrás',()=>{
    const p=newRun().parts;
    expect(mouthAt(p,0,0,0,20,{x:25,y:0,kind:'algae',radius:4})).toBe(true);
    expect(mouthAt(p,0,0,0,20,{x:-25,y:0,kind:'algae',radius:4})).toBe(false);
    expect(mouthAt(p,0,0,Math.PI,20,{x:-25,y:0,kind:'algae',radius:4})).toBe(true);
    expect(mouthAt(p,0,0,0,20,{x:25,y:0,kind:'remains',radius:4})).toBe(false);
  });
  it('filtra a corta distancia desde la parte, no desde todo el cuerpo',()=>{
    const p=newRun().parts;p[0]='filter';
    expect(mouthAt(p,0,0,0,20,{x:40,y:0,kind:'particle',radius:2})).toBe(true);
    expect(mouthAt(p,0,0,0,20,{x:-40,y:0,kind:'particle',radius:2})).toBe(false);
  });
  it('transforma los ocho puntos locales respecto a la orientación',()=>{
    expect(partPosition(0,0,Math.PI/2,20,0).y).toBeCloseTo(21.2);
    expect(partPosition(0,0,0,20,4).x).toBeCloseTo(-21.2);
  });
});
describe('Combate por sectores',()=>{
  it('una mandíbula frontal no ataca la espalda',()=>{
    const p=newRun().parts;p[0]='jaw';
    expect(attackAt(p,0,0,0,20,{x:36,y:0,radius:15})).toBe(BALANCE.attackDamage);
    expect(attackAt(p,0,0,0,20,{x:-36,y:0,radius:15})).toBe(0);
  });
  it('un pincho trasero castiga al perseguidor',()=>{
    const p=newRun().parts;p[4]='spike';
    expect(attackAt(p,0,0,0,20,{x:-36,y:0,radius:15})).toBe(BALANCE.spikeDamage);
    expect(attackAt(p,0,0,0,20,{x:36,y:0,radius:15})).toBe(0);
  });
  it('las placas protegen únicamente su sector y siguen el giro',()=>{
    const p=newRun().parts;p[2]='plate';
    expect(protection(p,0,Math.PI/2)).toBeCloseTo(.35);expect(protection(p,0,-Math.PI/2)).toBe(1);
    expect(protection(p,Math.PI/2,Math.PI)).toBeCloseTo(.35);
    expect(protection(p,0,Math.PI/2+.7)).toBe(1);
  });
  it('varias mandíbulas no acumulan daño en un mismo contacto',()=>{
    const p=newRun().parts;p[0]='jaw';p[1]='jaw';p[7]='jaw';
    expect(attackAt(p,0,0,0,20,{x:30,y:0,radius:25})).toBe(BALANCE.attackDamage);
  });
});
describe('Editor transaccional',()=>{
  it('impide comprar sin saldo y solo descuenta compras',()=>{
    const r=newRun();expect(buy(r,'jaw')).toBe(false);r.points=6;
    expect(buy(r,'jaw')).toBe(true);expect(r.points).toBe(3);expect(r.inventory.jaw).toBe(1);
    expect(place(r,'jaw',2)).toBe(true);expect(move(r,2,6)).toBe(true);expect(remove(r,6)).toBe(true);expect(r.points).toBe(3);expect(r.inventory.jaw).toBe(1);
  });
  it('limita la capacidad inicial a cuatro aunque haya ocho puntos',()=>{
    const r=newRun();r.inventory.spike=4;
    expect(place(r,'spike',1)).toBe(true);expect(place(r,'spike',2)).toBe(true);
    expect(place(r,'spike',3)).toBe(false);expect(usedCapacity(r.parts)).toBe(4);expect(r.inventory.spike).toBe(2);
  });
  it('permite reemplazar a capacidad completa y devuelve la pieza al inventario',()=>{
    const r=newRun();r.inventory.plate=3;place(r,'plate',1);place(r,'plate',2);r.inventory.jaw=1;
    expect(place(r,'jaw',0)).toBe(true);expect(r.inventory.gather).toBe(1);expect(usedCapacity(r.parts)).toBe(4);
  });
  it('mover a un punto ocupado intercambia piezas gratis',()=>{
    const r=newRun();expect(move(r,0,4)).toBe(true);expect(r.parts[0]).toBe('flagellum');expect(r.parts[4]).toBe('gather');expect(r.points).toBe(0);
  });
  it('una copia de edición puede cancelarse sin alterar el original',()=>{
    const r=newRun();r.points=6;const draft=copyRun(r);buy(draft,'jaw');remove(draft,0);place(draft,'jaw',3);
    expect(r.parts[0]).toBe('gather');expect(r.points).toBe(6);expect(r.inventory.jaw).toBe(0);
  });
  it('aplica peso y beneficios decrecientes de flagelos',()=>{
    const r=newRun(),base=stats(r.parts,0).speed;r.parts[2]='plate';expect(stats(r.parts,0).speed).toBeLessThan(base);
    r.parts[2]=null;r.parts[3]='flagellum';const second=stats(r.parts,0).speed-base;r.parts[5]='flagellum';const third=stats(r.parts,0).speed-base-second;
    expect(second).toBeGreaterThan(third);
  });
});
describe('Progresión y final',()=>{
  it('recorre las cinco escalas con capacidad y puntos separados del alimento',()=>{
    const r=newRun();expect(grow(r)).toBe(false);
    for(let i=0;i<4;i++){r.food=BALANCE.scales[i].food;expect(grow(r)).toBe(true);expect(r.scale).toBe(i+1);expect(r.food).toBe(0);}
    expect(stats(r.parts,r.scale).capacity).toBe(6);expect(r.points).toBe(22);expect(grow(r)).toBe(false);
  });
  it('la primera adaptación permite comprar cualquier familia',()=>{
    const r=newRun();r.food=BALANCE.scales[0].food;grow(r);expect(buy(r,'jaw')).toBe(true);expect(buy(r,'filter')).toBe(true);
  });
  it('comer sana y concede alimento, sin dar puntos de compra',()=>{
    const r=newRun();r.health=50;eat(r,'algae');expect(r.food).toBe(4);expect(r.totalFood).toBe(4);expect(r.health).toBeGreaterThan(50);expect(r.points).toBe(0);
  });
  it('solo permite ganar recolectando en el jardín durante Madurez',()=>{
    const r=newRun();r.scale=4;eat(r,'remains');expect(r.finalFood).toBe(0);expect(canWin(r)).toBe(false);
    r.x=BALANCE.finalZone.x;r.y=BALANCE.finalZone.y;
    for(let i=0;i<19;i++)eat(r,'remains');expect(canWin(r)).toBe(true);
  });
});
describe('Guardado versionado',()=>{
  let data:Map<string,string>;
  beforeEach(()=>{data=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)});});
  it('restaura construcción, inventario, salud, escala y progreso',()=>{
    const r=newRun();r.scale=2;r.inventory.jaw=2;r.points=7;r.health=71;r.food=15;r.time=142;saveRun(r);expect(loadRun()).toEqual(r);clearRun();expect(loadRun()).toBeNull();
  });
  it('rechaza datos corruptos, versiones desconocidas y piezas imposibles',()=>{
    data.set('sprout.save.v1','{broken');expect(loadRun()).toBeNull();data.set('sprout.save.v1',JSON.stringify({version:999,run:newRun()}));expect(loadRun()).toBeNull();
    const r=newRun();r.parts[0]='wrong' as never;expect(validRun(r)).toBe(false);r.parts[0]=null;expect(validRun(r)).toBe(false);
  });
  it('rechaza números inválidos y capacidad excedida',()=>{
    const r=newRun();r.health=NaN;expect(validRun(r)).toBe(false);r.health=100;r.parts.fill('plate');expect(validRun(r)).toBe(false);
  });
  it('maneja almacenamiento bloqueado sin interrumpir la partida',()=>{
    vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}});
    expect(loadRun()).toBeNull();expect(saveRun(newRun())).toBe(false);expect(()=>clearRun()).not.toThrow();
  });
});
it('consulta espacial limita vecinos y cubre fronteras de celdas',()=>{
  const grid=new Spatial<{x:number;y:number;id:number}>(100),items=[{x:99,y:99,id:1},{x:101,y:101,id:2},{x:999,y:999,id:3}];grid.rebuild(items);
  expect(grid.query(100,100,5).map(x=>x.id)).toEqual([1,2]);grid.rebuild([items[2]]);expect(grid.query(100,100,5)).toEqual([]);
});
describe('Montaje libre sobre la membrana',()=>{
  it('compra y coloca de forma atómica en una posición no numerada',()=>{
    const r=newRun();r.scale=1;r.points=6;
    expect(mount(r,'jaw',.43).ok).toBe(true);expect(r.points).toBe(3);
    const i=r.parts.indexOf('jaw');expect(r.angles[i]).toBeCloseTo(.43);expect(closestPart(r,.43)).toBe(i);
  });
  it('reemplaza la boca y devuelve la anterior al inventario',()=>{
    const r=newRun();r.points=3;expect(mount(r,'jaw',0).ok).toBe(true);expect(r.parts[0]).toBe('jaw');expect(r.inventory.gather).toBe(1);expect(r.points).toBe(0);
  });
  it('un montaje rechazado no cobra ni consume la boca reemplazada',()=>{
    const r=newRun();r.points=2;const before=copyRun(r);expect(mount(r,'jaw',0).ok).toBe(false);expect(r).toEqual(before);
  });
  it('un par simétrico usa dos piezas y cobra cada una',()=>{
    const r=newRun();r.points=6;expect(mount(r,'jaw',.65,true).ok).toBe(true);expect(r.points).toBe(0);expect(usedCapacity(r.parts)).toBe(4);
    const angles=r.parts.flatMap((p,i)=>p==='jaw'?[r.angles[i]]:[]);expect(angles[0]).toBeCloseTo(.65);expect(angles[1]).toBeCloseTo(-.65);
  });
  it('un par sin presupuesto se rechaza por completo',()=>{
    const r=newRun();r.points=3;const before=copyRun(r);expect(mount(r,'jaw',.65,true).ok).toBe(false);expect(r).toEqual(before);
  });
  it('la simetría no duplica piezas situadas en el eje central',()=>{
    const r=newRun();r.points=3;expect(mount(r,'jaw',0,true).ok).toBe(true);expect(r.parts.filter(p=>p==='jaw')).toHaveLength(1);
  });
  it('recolocar cambia el ángulo real sin gastar puntos ni piezas',()=>{
    const r=newRun();r.points=6;expect(relocate(r,0,.51)).toBe(true);expect(r.angles[0]).toBeCloseTo(.51);expect(r.points).toBe(6);expect(r.inventory.gather).toBe(0);
  });
  it('alimentación y armadura siguen los ángulos libres',()=>{
    const r=newRun();r.angles[0]=.61;const p=partPosition(0,0,0,20,0,r.angles,r.shape),a=anchor(.61,20,r.shape);
    expect(p.x).toBeCloseTo(a.x);expect(p.y).toBeCloseTo(a.y);
    expect(mouthAt(r.parts,0,0,0,20,{x:p.x,y:p.y,radius:3,kind:'algae'},r.angles,r.shape)).toBe(true);
    r.parts[2]='plate';r.angles[2]=.61;expect(protection(r.parts,0,.61,r.angles)).toBeCloseTo(.35);expect(protection(r.parts,0,Math.PI,r.angles)).toBe(1);
  });
  it('un flagelo trasero propulsa mejor que uno frontal',()=>{
    const r=newRun(),rear=stats(r.parts,0,r.angles).speed;r.angles[4]=Math.PI/2;const side=stats(r.parts,0,r.angles).speed;r.angles[4]=0;const front=stats(r.parts,0,r.angles).speed;
    expect(rear).toBeGreaterThan(side);expect(side).toBeGreaterThan(front);expect(propulsion(r.parts,r.angles)).toBeCloseTo(.35);
  });
  it('la ondulación del flagelo responde a la velocidad',()=>{
    const idle=tailPoints(Math.PI,20,0,1,0,0),moving=tailPoints(Math.PI,20,0,1,1,0);
    expect(idle[0]).toEqual(moving[0]);expect(moving[18].y).not.toBeCloseTo(idle[18].y);expect(moving[0].width).toBeGreaterThan(moving[26].width);
  });
});
describe('Migración de partidas',()=>{
  it('conserva el guardado original y le asigna anatomía compatible',()=>{
    const old=newRun();const legacy={...old,angles:undefined,shape:undefined,color:undefined};
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({version:1,run:legacy})});
    const restored=loadRun();expect(restored?.parts).toEqual(old.parts);expect(restored?.angles).toEqual(old.angles);expect(restored?.shape).toBe(0);expect(restored?.color).toBe(old.color);
  });
  it('rechaza anatomía corrupta en el nuevo formato',()=>{
    const r=newRun();r.angles[2]=Infinity;expect(validRun(r)).toBe(false);r.angles[2]=0;r.shape=50;expect(validRun(r)).toBe(false);
  });
});
it('un par recolocado al frente mantiene separación y no cobra',()=>{
  const r=newRun();r.points=6;mount(r,'jaw',.65,true);const slot=r.parts.indexOf('jaw');relocate(r,slot,0,true);
  const jawAngles=r.parts.flatMap((p,i)=>p==='jaw'?[r.angles[i]]:[]);expect(jawAngles[0]).toBeCloseTo(.22);expect(jawAngles[1]).toBeCloseTo(-.22);expect(r.points).toBe(0);expect(usedCapacity(r.parts)).toBe(4);
});
it('los flagelos laterales mejoran más el giro que los traseros',()=>{
  const r=newRun(),rear=stats(r.parts,0,r.angles).turnRate;r.angles[4]=Math.PI/2;expect(stats(r.parts,0,r.angles).turnRate).toBeGreaterThan(rear);
});
