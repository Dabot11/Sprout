import { BALANCE } from '../game/config';
import { copyRun, newRun, stats, maxHealth, type Run } from '../game/model';
import { clearRun, loadBest, loadRun, loadSettings, recordResult, saveSettings } from '../game/storage';
import { TideScene } from '../game/scene';
import { Sound } from '../game/audio';
import { portrait, animatePortraits } from './portrait';
import { Editor } from './editor';
const timeText=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export class App {
  private root=document.querySelector<HTMLElement>('#ui')!;private screen:'menu'|'game'|'pause'|'editor'|'result'='menu';
  private settings=loadSettings();
  private toastTimer=0;private latest:Run=newRun();
  constructor(private scene:TideScene,private sound:Sound) {
    this.sound.muted=this.settings.muted;this.menu();
    document.addEventListener('pointerdown',()=>this.sound.unlock(),{once:true});
    document.addEventListener('keydown',()=>this.sound.unlock(),{once:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.screen==='game')this.pause();else this.scene.controls.reset();});
    window.addEventListener('pagehide',()=>{if(this.screen==='game'||this.screen==='pause')this.scene.checkpoint();});
  }
  ready(){this.menu();}
  private audioToggle(){this.settings.muted=!this.settings.muted;this.sound.muted=this.settings.muted;saveSettings(this.settings);this.sound.unlock();this.root.querySelectorAll<HTMLElement>('[data-audio]').forEach(e=>e.textContent=this.audioLabel());}
  private audioLabel(){return this.settings.muted?'Sonido: apagado':'Sonido: activo';}
  private bindAudio(){this.root.querySelectorAll<HTMLElement>('[data-audio]').forEach(e=>e.onclick=()=>this.audioToggle());}
  menu(){
    this.screen='menu';this.scene.setPaused(true);const saved=loadRun(),best=loadBest();
    this.root.innerHTML=`<main class="menu"><header class="masthead"><a class="brand" href="#" aria-label="SPROUT inicio"><span class="brand-mark">✳</span> SPROUT</a><div class="menu-links"><button class="text-button" id="controls-help">Cómo jugar</button><button class="text-button" data-audio>${this.audioLabel()}</button></div></header><div class="landing"><section class="intro"><p class="eyebrow"><span></span> UN PEQUEÑO MUNDO. UNA GRAN AVENTURA.</p><h1>La vida empieza<br>en <em>pequeño.</em></h1><p class="lead">Sobrevive, crece y encuentra tu propia forma.<br>Una aventura al otro lado del microscopio.</p><div class="menu-actions"><button class="primary" id="play" ${this.scene.isReady?'':'disabled'}>${saved?'Nueva aventura':'Crear una célula'} <span class="diagonal-arrow" aria-hidden="true"></span></button>${saved?`<button class="secondary" id="continue" ${this.scene.isReady?'':'disabled'}>Continuar partida →</button>`:''}</div><p class="session-note">15–20 min aprox. <span>·</span> Teclado o táctil <span>·</span> Guardado local</p>${best?`<p class="best">Tu mejor vida: ${best.won?'Madurez completa':BALANCE.scales[best.scale].name} · ${timeText(best.time)}</p>`:''}</section><div class="specimen"><div class="specimen-ring"></div><div class="specimen-ring inner"></div><span class="specimen-tag">ESPÉCIMEN 001</span>${portrait(newRun().parts,'hero',true)}<div class="specimen-caption"><span class="live-dot"></span> Recién nacido <small>Todo está por descubrir</small></div><span class="dimension">22 μm — — —</span></div></div><footer class="menu-footer"><div><b>01</b><span>Explora<small>Un ecosistema vivo</small></span></div><div><b>02</b><span>Adáptate<small>Diseña tu criatura</small></span></div><div><b>03</b><span>Florece<small>Encuentra tu lugar</small></span></div><span class="version">SPROUT / V.02</span></footer></main>`;
    animatePortraits(this.root,newRun(),-.2);
    this.root.querySelector<HTMLAnchorElement>('.brand')!.onclick=e=>e.preventDefault();
    this.root.querySelector<HTMLButtonElement>('#play')!.onclick=()=>{if(saved)this.confirmNew();else this.createNew();};
    this.root.querySelector<HTMLButtonElement>('#continue')?.addEventListener('click',()=>{const run=loadRun();if(run)this.start(run);else this.menu();});
    this.root.querySelector<HTMLButtonElement>('#controls-help')!.onclick=()=>this.help();this.bindAudio();
  }
  private confirmNew(){
    const modal=document.createElement('div');modal.className='overlay';modal.innerHTML='<section class="dialog compact"><p class="eyebrow">OTRA PEQUEÑA VIDA</p><h2>¿Empezar de nuevo?</h2><p>La nueva aventura reemplazará tu partida en curso.</p><div class="dialog-actions"><button class="secondary" id="keep">Conservar partida</button><button class="primary" id="new">Empezar</button></div></section>';this.root.append(modal);
    modal.querySelector<HTMLButtonElement>('#keep')!.onclick=()=>modal.remove();modal.querySelector<HTMLButtonElement>('#new')!.onclick=()=>this.createNew();
  }
  private help(){
    const modal=document.createElement('div');modal.className='overlay';modal.innerHTML=`<section class="dialog help"><p class="eyebrow">GUÍA DE CAMPO</p><h2>Una pequeña vida</h2><div class="help-grid"><p><b>Muévete</b>WASD / flechas, clic mantenido o joystick. Tu criatura gira al moverse.</p><p><b>Escapa</b>Espacio o ◇ para un impulso. La recarga dura unos 3 segundos.</p><p><b>Aliméntate</b>Acerca la boca a las algas ovaladas. Las mandíbulas comen restos triangulares y las filtradoras, puntos brillantes.</p><p><b>Adáptate</b>Al crecer, lleva piezas directamente a la membrana. El frente apunta hacia arriba. Puedes colocar pares simétricos y cambiar forma o color.</p><p><b>Sobrevive</b>Las puntas y bocas atacan desde su posición. Cada placa protege solo su lado. Las criaturas contraen el cuerpo antes de embestir.</p><p><b>Florece</b>Al llegar a Madurez, reúne alimento dentro del Jardín de Origen. No hace falta derrotar a un jefe.</p></div><button class="primary" id="close-help">Entendido →</button></section>`;this.root.append(modal);modal.querySelector<HTMLButtonElement>('#close-help')!.onclick=()=>modal.remove();
  }
  private createNew(){const run=newRun();run.points=3;this.scene.begin(run,true);this.adapt(run);this.sound.unlock();}
  private start(run:Run){this.screen='game';this.gameHUD();this.scene.begin(run);this.sound.unlock();}
  private gameHUD(){
    this.root.innerHTML=`<div class="hud"><div class="hud-brand"><span class="brand-mark">✳</span><span>SPROUT</span></div><div class="vitals"><div class="vital-label"><span>Salud</span><span id="hp-text"></span></div><div class="meter health"><i id="hp-fill"></i></div></div><div class="growth"><div class="vital-label"><span id="scale-name">Recién nacido</span><span id="growth-text"></span></div><div class="meter"><i id="growth-fill"></i></div></div><button class="icon-button" id="pause" aria-label="Pausar"><span class="pause-symbol" aria-hidden="true"></span></button></div><div class="scale-pips" aria-label="Cinco escalas">${BALANCE.scales.map((s,i)=>`<span id="pip-${i}" title="${s.name}"></span>`).join('')}</div><div class="objective" id="objective"></div><div class="toast" id="toast" role="status"></div><div class="touch-controls"><div class="joystick" id="joystick" aria-label="Joystick de movimiento"><span></span><small>MOVER</small></div><button class="boost" id="boost" aria-label="Impulso"><span>◇</span><small>IMPULSO</small><i id="boost-progress"></i></button></div><div class="keyboard-note">WASD · mover <span>ESPACIO · impulso</span></div><div class="rotate-note">↻ Más espacio al girar tu pantalla</div>`;
    this.root.querySelector<HTMLButtonElement>('#pause')!.onclick=()=>this.pause();this.scene.controls.bind(this.root.querySelector<HTMLElement>('#joystick')!,this.root.querySelector<HTMLElement>('#boost')!);this.tick(this.latest,0);
  }
  tick(run:Run,cooldown:number){
    this.latest=copyRun(run);if(this.screen!=='game')return;
    const set=(id:string,value:string)=>{const el=this.root.querySelector<HTMLElement>(id);if(el)el.textContent=value;};
    set('#hp-text',`${Math.ceil(run.health)} / ${maxHealth(run.scale)}`);this.root.querySelector<HTMLElement>('#hp-fill')!.style.width=`${Math.max(0,run.health/maxHealth(run.scale)*100)}%`;
    set('#scale-name',BALANCE.scales[run.scale].name);const progress=run.scale===4?run.finalFood:run.food,target=BALANCE.scales[run.scale].food;
    set('#growth-text',`${Math.min(100,Math.floor(progress/target*100))}%`);this.root.querySelector<HTMLElement>('#growth-fill')!.style.width=`${Math.min(100,progress/target*100)}%`;
    this.root.querySelector<HTMLElement>('#boost-progress')!.style.transform=`scaleX(${1-cooldown/stats(run.parts,run.scale,run.angles).cooldown})`;
    this.root.querySelector<HTMLButtonElement>('#boost')!.classList.toggle('charging',cooldown>0);
    BALANCE.scales.forEach((_,i)=>this.root.querySelector<HTMLElement>(`#pip-${i}`)!.classList.toggle('filled',i<=run.scale));
    const objective=this.root.querySelector<HTMLElement>('#objective')!;
    if(run.scale===4){const z=BALANCE.finalZone,d=Math.hypot(run.x-z.x,run.y-z.y),angle=Math.atan2(z.y-run.y,z.x-run.x)*180/Math.PI;objective.innerHTML=d<z.radius?`<span>✳</span> Jardín de Origen · ${run.finalFood} / ${BALANCE.finalFood}`:`<span style="display:inline-block;transform:rotate(${angle}deg)">➜</span> Jardín de Origen · ${Math.round(d/10)} μm`;objective.classList.add('visible');}else objective.classList.remove('visible');
  }
  notice(text:string){const toast=this.root.querySelector<HTMLElement>('#toast');if(!toast)return;clearTimeout(this.toastTimer);toast.textContent=text;toast.classList.add('show');this.toastTimer=window.setTimeout(()=>toast.classList.remove('show'),6500);}
  pause(){
    if(this.screen==='pause'){this.resume();return;}if(this.screen!=='game')return;
    this.scene.setPaused(true);this.scene.checkpoint();this.screen='pause';
    const modal=document.createElement('div');modal.className='overlay';modal.id='pause-modal';modal.innerHTML=`<section class="dialog compact"><p class="eyebrow">UN MOMENTO PARA RESPIRAR</p><h2>La corriente puede esperar.</h2><p>Tu aventura queda guardada en este navegador.</p><button class="primary" id="resume">Seguir explorando →</button><div class="dialog-actions"><button class="secondary" data-audio>${this.audioLabel()}</button><button class="secondary" id="menu">Volver al menú</button></div></section>`;this.root.append(modal);modal.querySelector<HTMLButtonElement>('#resume')!.onclick=()=>this.resume();modal.querySelector<HTMLButtonElement>('#menu')!.onclick=()=>this.menu();this.bindAudio();
  }
  private resume(){this.screen='game';this.root.querySelector('#pause-modal')?.remove();this.scene.setPaused(false);this.tick(this.latest,0);}
  adapt(run:Run){
    this.screen='editor';new Editor(this.root,run,this.sound,next=>{
      this.screen='game';this.latest=copyRun(next);this.gameHUD();this.scene.applyAdaptation(next);
    });
  }
  result(run:Run,won:boolean){
    this.screen='result';clearRun();recordResult(run,won);
    this.root.innerHTML=`<div class="overlay result-overlay"><section class="dialog result"><p class="eyebrow">${won?'UNA VIDA QUE FLORECE':'CADA VIDA DEJA UNA HUELLA'}</p><h2>${won?'Y todo vuelve a empezar.':'La corriente sigue.'}</h2><p>${won?'Llegaste al Jardín de Origen. Tu célula se dividió y una nueva vida comienza.':'Tu pequeña criatura encontró su límite. Hay muchas otras formas de sobrevivir.'}</p><div class="result-creature">${portrait(run.parts,'result')}</div><div class="result-stats"><div><b>${BALANCE.scales[run.scale].name}</b><span>escala alcanzada</span></div><div><b>${timeText(run.time)}</b><span>tiempo de vida</span></div><div><b>${run.totalFood}</b><span>alimento recogido</span></div></div><div class="dialog-actions"><button class="secondary" id="result-menu">Menú</button><button class="primary" id="replay">Otra pequeña vida ↗</button></div></section></div>`;
    animatePortraits(this.root,run);
    this.root.querySelector<HTMLButtonElement>('#replay')!.onclick=()=>this.createNew();this.root.querySelector<HTMLButtonElement>('#result-menu')!.onclick=()=>{this.scene.begin(newRun(),true);this.menu();};
  }
}
