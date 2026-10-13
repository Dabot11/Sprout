import { anchor, FORMS, PALETTES } from '../game/anatomy';
import { drawOrganism, drawPart } from '../game/art';
import { PARTS, type PartKind } from '../game/config';
import { capacity, copyRun, mount, normalizeAngle, relocate, remove, stats, usedCapacity, type Run } from '../game/model';
import type { Sound } from '../game/audio';
type Selection={kind:'mounted';slot:number}|{kind:'new';part:PartKind}|null;
const CATEGORIES=['Todas','Bocas','Movimiento','Defensa'] as const;
export class Editor {
  run:Run;private original:Run;private selected:Selection=null;private mirror=false;private category=0;
  private ghostAngle=0;private dragging:{slot:number;x:number;y:number;moved:boolean}|null=null;
  private history:Run[]=[];private raf=0;private start=performance.now();private aborted=new AbortController();private closed=false;
  constructor(private root:HTMLElement,run:Run,private sound:Sound,private done:(run:Run)=>void){
    this.original=copyRun(run);this.run=copyRun(run);this.render();this.animate();
    window.addEventListener('keydown',e=>{if(e.key==='Delete'||e.key==='Backspace'){if(this.selected?.kind==='mounted'){e.preventDefault();this.removeSelected();}}if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();this.undo();}if(e.key==='Escape'){e.preventDefault();this.finish(this.original);}}, {signal:this.aborted.signal});
  }
  private remember(){this.history.push(copyRun(this.run));if(this.history.length>30)this.history.shift();}
  private undo(){const previous=this.history.pop();if(previous){this.run=previous;this.selected=null;this.render('Último cambio deshecho.');}}
  private selectedPart(){return this.selected?.kind==='new'?this.selected.part:this.selected?.kind==='mounted'?this.run.parts[this.selected.slot]:null;}
  private render(message=''){
    const r=this.run,s=stats(r.parts,r.scale,r.angles),part=this.selectedPart();
    const library=(Object.keys(PARTS) as PartKind[]).filter(p=>this.category===0||this.category===1&&['gather','jaw','filter'].includes(p)||this.category===2&&p==='flagellum'||this.category===3&&['spike','plate'].includes(p));
    const mounted=r.parts.map((p,i)=>{
      if(!p)return '';const a=r.angles[i],pos=anchor(a,104,r.shape),x=320+pos.y+Math.sin(a)*22,y=250-pos.x-Math.cos(a)*22;
      return `<button class="mounted-part ${this.selected?.kind==='mounted'&&this.selected.slot===i?'is-selected':''}" data-mounted="${i}" style="left:${x/640*100}%;top:${y/560*100}%" aria-label="Seleccionar ${PARTS[p].name}" title="${PARTS[p].name}"></button>`;
    }).join('');
    this.root.innerHTML=`<div class="overlay sculpt-overlay"><section class="editor sculpt-editor"><header class="sculpt-header"><button class="editor-back" id="cancel-edit" aria-label="Cancelar cambios">←</button><div><p class="eyebrow">${r.scale===0?'CREACIÓN CELULAR':`ADAPTACIÓN ${r.scale} / 4`}</p><h2>${r.scale===0?'Tu pequeña vida empieza aquí.':'Dale forma a tu siguiente vida.'}</h2></div><div class="dna-bank"><span class="dna-symbol">✳</span><b>${r.points}</b><small>ADN disponible</small></div></header><div class="sculpt-body"><aside class="organ-library"><p class="panel-label">PIEZAS</p><div class="part-categories">${CATEGORIES.map((name,i)=>`<button data-category="${i}" class="${this.category===i?'active':''}">${name}</button>`).join('')}</div><div class="organ-grid">${library.map(p=>`<button class="organ-card ${this.selected?.kind==='new'&&part===p?'selected':''}" data-part="${p}" draggable="true" aria-label="Elegir ${PARTS[p].name}"><canvas width="104" height="80" data-icon="${p}" aria-hidden="true"></canvas><span>${PARTS[p].name}</span><small>${r.inventory[p]>0?`${r.inventory[p]} en reserva`: `${PARTS[p].cost} ADN`}</small></button>`).join('')}</div><p class="library-note">Arrastra una pieza al cuerpo.<br>O selecciónala y toca la membrana.</p></aside><section class="sculpt-workspace"><div class="workspace-label"><span>DISEÑO CELULAR</span><button class="undo-button" id="undo-edit" ${this.history.length?'':'disabled'}>↶ Deshacer</button></div><div class="anatomy-stage" id="anatomy-stage"><div class="dish-ring"></div><div class="dish-ring small"></div><span class="front-label">FRENTE <b>↑</b></span><canvas id="editor-canvas" width="640" height="560" aria-label="Membrana: coloca o mueve las piezas aquí"></canvas>${mounted}<span class="rear-label">COLA / PROPULSIÓN</span></div><div class="workspace-tools"><label class="symmetry-switch"><input type="checkbox" id="symmetry" ${this.mirror?'checked':''}><span></span>Simetría bilateral</label><span>Se cobra cada pieza nueva del par</span></div><div class="design-stats"><div><span>Velocidad</span><b>${Math.round(s.speed)}</b><i style="--stat:${Math.min(100,s.speed/350*100)}%"></i></div><div><span>Giro</span><b>${s.turnRate.toFixed(1)}</b><i style="--stat:${s.turnRate/12*100}%"></i></div><div><span>Impulso</span><b>${s.cooldown.toFixed(1)} s</b><i style="--stat:${(1-s.cooldown/5)*100}%"></i></div></div></section><aside class="organ-inspector"><p class="panel-label">${part?'ADAPTACIÓN SELECCIONADA':'TU CRIATURA'}</p><div class="part-detail">${part?`<canvas width="208" height="140" data-detail="${part}" aria-hidden="true"></canvas><h3>${PARTS[part].name}</h3><p>${PARTS[part].description}</p><div class="detail-tag">${this.selected?.kind==='mounted'?'Equipada · mover es gratis':r.inventory[part]?`En reserva · ${r.inventory[part]} disponibles`:`${PARTS[part].cost} ADN · se cobra al colocar`}</div>`:'<div class="anatomy-symbol">✳</div><h3>Construye sobre el cuerpo.</h3><p>Las bocas se abren al comer. Los pinchos y las placas actúan en su posición. Tu flagelo impulsa de verdad.</p>'}</div><button class="remove-organ" id="remove-part" ${this.selected?.kind==='mounted'?'':'disabled'}>Retirar al inventario</button><section class="appearance-tools"><p class="panel-label">MEMBRANA</p><div class="palette">${PALETTES.map(p=>`<button data-color="${p.color}" style="--swatch:#${p.color.toString(16)}" class="${r.color===p.color?'active':''}" aria-label="Color ${p.name}" title="${p.name}"></button>`).join('')}</div><p class="panel-label form-label">SILUETA</p><div class="body-forms">${FORMS.map((f,i)=>`<button data-form="${i}" class="${r.shape===i?'active':''}"><span style="--form-x:${f.rx};--form-y:${f.ry}"></span>${f.name}</button>`).join('')}</div></section></aside></div><footer class="sculpt-footer"><div class="body-capacity"><span id="capacity-label">${usedCapacity(r.parts)} / ${capacity(r.scale)} piezas</span><div>${Array.from({length:capacity(r.scale)},(_,i)=>`<i class="${i<usedCapacity(r.parts)?'used':''}"></i>`).join('')}</div></div><p id="editor-message" role="status">${message||'Coloca sobre una pieza para reemplazarla. Retirar la conserva en tu inventario.'}</p><button class="primary" id="confirm-edit">Nadar con esta criatura <span>→</span></button></footer></section></div>`;
    this.drawIcons();this.bind();
  }
  private drawIcons(){this.root.querySelectorAll<HTMLCanvasElement>('canvas[data-icon],canvas[data-detail]').forEach(canvas=>{const p=(canvas.dataset.icon??canvas.dataset.detail) as PartKind,ctx=canvas.getContext('2d')!;ctx.translate(canvas.width*.28,canvas.height*.5);const r=canvas.height*.53;drawPart(ctx,p,r,1);if(p==='flagellum'){ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(r*.5,-r*.25,r*.8,r*.4,r*1.55,0);ctx.strokeStyle='#9dddcf';ctx.lineWidth=r*.075;ctx.stroke();}});}
  private bind(){
    this.root.querySelector<HTMLButtonElement>('#cancel-edit')!.onclick=()=>this.finish(this.original);
    this.root.querySelector<HTMLButtonElement>('#confirm-edit')!.onclick=()=>{if(!this.run.parts.some(p=>p==='gather'||p==='jaw'||p==='filter')){this.render('Conserva al menos una boca para poder alimentarte.');return;}this.finish(this.run);};
    this.root.querySelector<HTMLButtonElement>('#undo-edit')!.onclick=()=>this.undo();
    this.root.querySelector<HTMLButtonElement>('#remove-part')!.onclick=()=>this.removeSelected();
    this.root.querySelector<HTMLInputElement>('#symmetry')!.onchange=e=>{this.mirror=(e.target as HTMLInputElement).checked;this.render(this.mirror?'Simetría activa: coloca pares a ambos lados; cada pieza cuenta para el coste y la capacidad.':'Colocación individual.');};
    this.root.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(b=>b.onclick=()=>{this.category=Number(b.dataset.category);this.render();});
    this.root.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.onclick=()=>{this.remember();this.run.color=Number(b.dataset.color);this.render();});
    this.root.querySelectorAll<HTMLButtonElement>('[data-form]').forEach(b=>b.onclick=()=>{this.remember();this.run.shape=Number(b.dataset.form);this.render();});
    this.root.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(b=>{
      const p=b.dataset.part as PartKind;
      b.onclick=()=>{this.selected={kind:'new',part:p};this.ghostAngle=p==='flagellum'?Math.PI:0;this.render('Elige un lugar en la membrana. El coste se descuenta solo al colocar.');};
      b.ondragstart=e=>{this.selected={kind:'new',part:p};e.dataTransfer?.setData('text/plain',p);};
    });
    const stage=this.root.querySelector<HTMLElement>('#anatomy-stage')!;
    stage.onpointermove=e=>{this.ghostAngle=this.pointerAngle(e,stage);if(this.dragging&&Math.hypot(e.clientX-this.dragging.x,e.clientY-this.dragging.y)>5)this.dragging.moved=true;};
    stage.onpointerdown=e=>{if((e.target as Element).closest('[data-mounted]'))return;if(this.selected && this.validDistance(e,stage))this.commit(this.pointerAngle(e,stage));};
    stage.ondragover=e=>{e.preventDefault();this.ghostAngle=this.pointerAngle(e,stage);};
    stage.ondrop=e=>{e.preventDefault();if(this.validDistance(e,stage))this.commit(this.pointerAngle(e,stage));};
    this.root.querySelectorAll<HTMLButtonElement>('[data-mounted]').forEach(button=>{
      const slot=Number(button.dataset.mounted);
      button.onpointerdown=e=>{e.preventDefault();e.stopPropagation();if(this.selected?.kind==='new'){this.commit(this.run.angles[slot]);return;}this.selected={kind:'mounted',slot};this.ghostAngle=this.run.angles[slot];this.dragging={slot,x:e.clientX,y:e.clientY,moved:false};button.setPointerCapture(e.pointerId);button.classList.add('is-selected');};
      button.onpointermove=e=>{if(this.dragging){this.ghostAngle=this.pointerAngle(e,stage);if(Math.hypot(e.clientX-this.dragging.x,e.clientY-this.dragging.y)>5)this.dragging.moved=true;}};
      button.onpointerup=e=>{if(this.dragging?.moved && this.validDistance(e,stage))this.commit(this.pointerAngle(e,stage));else this.render('Pieza seleccionada: arrastra, toca otro lugar del cuerpo o retírala.');this.dragging=null;};
      button.onpointercancel=()=>{this.dragging=null;this.render('Movimiento cancelado.');};
    });
  }
  private pointerAngle(e:{clientX:number;clientY:number},stage:HTMLElement){const b=stage.getBoundingClientRect(),x=(e.clientX-b.x)/b.width*640-320,y=(e.clientY-b.y)/b.height*560-250;return normalizeAngle(Math.atan2(y,x)+Math.PI/2);}
  private validDistance(e:{clientX:number;clientY:number},stage:HTMLElement){const b=stage.getBoundingClientRect(),x=(e.clientX-b.x)/b.width*640-320,y=(e.clientY-b.y)/b.height*560-250;const d=Math.hypot(x,y);return d>42&&d<260;}
  private commit(angle:number){
    if(!this.selected)return;const before=copyRun(this.run);let message='';
    if(this.selected.kind==='new'){const result=mount(this.run,this.selected.part,angle,this.mirror);if(!result.ok){this.render(result.message);return;}message=result.message;}
    else {relocate(this.run,this.selected.slot,angle,this.mirror);message='Pieza recolocada sin coste.';}
    this.history.push(before);if(this.history.length>30)this.history.shift();this.selected=null;this.dragging=null;this.sound.play('click');this.render(message);
  }
  private removeSelected(){if(this.selected?.kind!=='mounted')return;this.remember();remove(this.run,this.selected.slot);this.selected=null;this.render('Pieza guardada en el inventario. Puedes volver a colocarla gratis.');}
  private animate(){
    const frame=(now:number)=>{
      if(this.closed)return;
      const canvas=this.root.querySelector<HTMLCanvasElement>('#editor-canvas');if(canvas){const ctx=canvas.getContext('2d')!,time=(now-this.start)/1000,part=this.selectedPart();ctx.clearRect(0,0,640,560);ctx.save();ctx.translate(320,250);
        if(this.mirror){ctx.strokeStyle='rgba(151,189,189,.24)';ctx.setLineDash([5,8]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-220);ctx.lineTo(0,215);ctx.stroke();ctx.setLineDash([]);}
        const preview=copyRun(this.run);if(this.dragging?.moved)relocate(preview,this.dragging.slot,this.ghostAngle,this.mirror);
        drawOrganism(ctx,{...preview,radius:104,time,movement:.15,orientation:-Math.PI/2,ghost:this.selected?.kind==='new'&&part?{part,angle:this.ghostAngle}:undefined});
        if(this.selected?.kind==='new'&&part&&this.mirror){const a=-this.ghostAngle;if(Math.abs(Math.sin(a))>.17){ctx.save();ctx.rotate(-Math.PI/2);const p=anchor(a,104,this.run.shape);ctx.translate(p.x,p.y);ctx.rotate(a);ctx.globalAlpha=.4;drawPart(ctx,part,104,time);ctx.restore();}}
        if(this.selected?.kind==='new'){const p=anchor(this.ghostAngle,104,this.run.shape);ctx.strokeStyle='#c8e8b0';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.y,-p.x,19,0,Math.PI*2);ctx.stroke();}ctx.restore();
      }this.raf=requestAnimationFrame(frame);
    };this.raf=requestAnimationFrame(frame);
  }
  private finish(run:Run){this.closed=true;cancelAnimationFrame(this.raf);this.aborted.abort();this.done(copyRun(run));}
}
