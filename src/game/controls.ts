export class Controls {
  x=0;y=0;dash=false;private mouseHeld=false;private mousePosition={x:0,y:0};private mouseDirection:((x:number,y:number)=>{x:number;y:number})|null=null;private keys=new Set<string>();private stickId:number|null=null;private dashId:number|null=null;
  private stickOrigin={x:0,y:0};private touch={x:0,y:0};private abort=new AbortController();
  constructor(private pause:()=>void) {
    const options={signal:this.abort.signal};
    window.addEventListener('keydown',e=>{if((e.target as HTMLElement).closest?.('input,textarea,select,[contenteditable=true]'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Escape'].includes(e.key)) e.preventDefault();if(e.key==='Escape'&&!e.repeat)this.pause();this.keys.add(e.key.toLowerCase());},options);
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()),options);
    window.addEventListener('blur',()=>this.reset(),options);
  }
  bind(stick:HTMLElement,boost:HTMLElement) {
    const options={signal:this.abort.signal};
    stick.addEventListener('pointerdown',e=> {
      if(this.stickId!==null) return;
      this.stickId=e.pointerId;stick.setPointerCapture(e.pointerId);
      const box=stick.getBoundingClientRect();this.stickOrigin={x:box.x+box.width/2,y:box.y+box.height/2};this.updateStick(e,stick);
    },options);
    stick.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId)this.updateStick(e,stick);},options);
    const release=(e:PointerEvent)=>{if(e.pointerId===this.stickId){this.stickId=null;this.touch={x:0,y:0};stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');}};
    stick.addEventListener('pointerup',release,options);stick.addEventListener('pointercancel',release,options);
    boost.addEventListener('pointerdown',e=>{this.dashId=e.pointerId;boost.setPointerCapture(e.pointerId);this.dash=true;},options);
    const endBoost=(e:PointerEvent)=>{if(e.pointerId===this.dashId){this.dashId=null;this.dash=false;}};
    boost.addEventListener('pointerup',endBoost,options);boost.addEventListener('pointercancel',endBoost,options);
  }
  private updateStick(e:PointerEvent,stick:HTMLElement) {
    let x=(e.clientX-this.stickOrigin.x)/42,y=(e.clientY-this.stickOrigin.y)/42;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    this.touch={x,y};stick.style.setProperty('--stick-x',`${x*30}px`);stick.style.setProperty('--stick-y',`${y*30}px`);
  }
  bindWorld(canvas:HTMLCanvasElement,direction:(x:number,y:number)=>{x:number;y:number}){
    this.mouseDirection=direction;const options={signal:this.abort.signal};
    canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;this.mouseHeld=true;canvas.setPointerCapture(e.pointerId);const b=canvas.getBoundingClientRect();this.mousePosition={x:e.clientX-b.left,y:e.clientY-b.top};},options);
    canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const b=canvas.getBoundingClientRect();this.mousePosition={x:e.clientX-b.left,y:e.clientY-b.top};},options);
    const release=(e:PointerEvent)=>{if(e.pointerType==='mouse')this.mouseHeld=false;};
    canvas.addEventListener('pointerup',release,options);canvas.addEventListener('pointercancel',release,options);
  }
  read() {
    let x=this.touch.x+Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'));
    let y=this.touch.y+Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));
    if(x===0&&y===0&&this.mouseHeld&&this.mouseDirection){const d=this.mouseDirection(this.mousePosition.x,this.mousePosition.y);x=d.x;y=d.y;}
    const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    this.x=x;this.y=y;return {x,y,dash:this.dash||this.keys.has(' ')};
  }
  reset(){this.mouseHeld=false;this.keys.clear();this.touch={x:0,y:0};this.x=0;this.y=0;this.dash=false;this.stickId=null;this.dashId=null;document.querySelector<HTMLElement>('#joystick')?.style.setProperty('--stick-x','0px');document.querySelector<HTMLElement>('#joystick')?.style.setProperty('--stick-y','0px');}
  destroy(){this.abort.abort();}
}
