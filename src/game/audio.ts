export class Sound {
  private context:AudioContext|null=null;
  muted=false;
  unlock() {if(!this.context) this.context=new AudioContext();void this.context.resume();}
  play(kind:'eat'|'hurt'|'dash'|'grow'|'win'|'click') {
    if(this.muted||!this.context||this.context.state!=='running') return;
    const notes={eat:[640,880],hurt:[150,85],dash:[220,520],grow:[392,523,659,784],win:[523,659,784,1047],click:[440]}[kind];
    notes.forEach((n,i)=> {
      const ctx=this.context!, osc=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+i*.09;
      osc.type=kind==='hurt'?'triangle':'sine';osc.frequency.setValueAtTime(n,at);osc.frequency.exponentialRampToValueAtTime(n*(kind==='dash'?2:1.04),at+.14);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.055,at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+.22);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.24);
    });
  }
}
