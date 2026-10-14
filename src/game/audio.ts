export type SoundKind='eat'|'hurt'|'dash'|'grow'|'win'|'click'|'poison'|'electric'|'death'|'defeat';
export type SoundMode='menu'|'editor'|'game'|'silent';
/** Original layered synthesis; also accepts OfflineAudioContext for measurable renders. */
export function createSoundGraph(ctx:BaseAudioContext){
  const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor(),dry=ctx.createGain(),send=ctx.createGain(),reverb=ctx.createConvolver(),wet=ctx.createGain();
  master.gain.value=.65;compressor.threshold.value=-18;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.006;compressor.release.value=.2;
  dry.connect(compressor);send.connect(reverb);reverb.connect(wet);wet.gain.value=.18;wet.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
  const impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*1.6),ctx.sampleRate);let seed=731;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*(1-i/data.length)**3*.4;}reverb.buffer=impulse;
  const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),samples=noise.getChannelData(0);let brown=0;
  for(let i=0;i<samples.length;i++){brown=(brown+(random()*2-1)*.08)/1.035;samples[i]=brown*2.4;}
  let voices=0;
  function voice(source:AudioScheduledSourceNode,gain:GainNode,at:number,duration:number,level:number,pan:number,filter?:BiquadFilterNode){
    if(voices>=32){source.disconnect();return;}voices++;
    const panner=ctx.createStereoPanner();panner.pan.value=Math.max(-.8,Math.min(.8,pan));source.connect(filter??gain);if(filter)filter.connect(gain);gain.connect(panner);panner.connect(dry);panner.connect(send);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    source.onended=()=>{voices--;source.disconnect();filter?.disconnect();gain.disconnect();panner.disconnect();};source.start(at);source.stop(at+duration+.02);
  }
  function tone(freq:number,end:number,at:number,duration:number,level:number,pan:number=0,type:OscillatorType='sine'){
    const source=ctx.createOscillator(),gain=ctx.createGain();source.type=type;source.frequency.setValueAtTime(freq,at);source.frequency.exponentialRampToValueAtTime(end,at+duration);voice(source,gain,at,duration,level,pan);
  }
  function splash(freq:number,end:number,at:number,duration:number,level:number,pan:number=0,q=.6){
    const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();source.buffer=noise;filter.type='bandpass';filter.Q.value=q;filter.frequency.setValueAtTime(freq,at);filter.frequency.exponentialRampToValueAtTime(end,at+duration);voice(source,gain,at,duration,level,pan,filter);
  }
  function play(kind:SoundKind,pan=0){const at=ctx.currentTime;
    if(kind==='eat'){tone(390,145,at,.16,.13,pan);tone(960,480,at+.028,.12,.035,pan);splash(1600,450,at,.13,.12,pan,1.5);}
    if(kind==='hurt'){tone(95,42,at,.28,.15,pan,'triangle');splash(1700,240,at,.2,.26,pan);}
    if(kind==='dash'){splash(350,2400,at,.18,.27,pan);splash(2200,300,at+.06,.46,.19,pan);tone(120,260,at,.22,.035,pan);}
    if(kind==='click'){tone(740,520,at,.11,.055,pan);tone(1110,1090,at+.018,.15,.025,pan);}
    if(kind==='poison'){splash(850,170,at,.45,.22,pan,2.3);tone(230,65,at,.35,.075,pan);}
    if(kind==='electric'){splash(3400,750,at,.22,.24,pan,3);for(let i=0;i<4;i++)tone(980+i*170,260,at+i*.036,.075,.045,pan,'sawtooth');}
    if(kind==='death'){splash(1300,180,at,.5,.2,pan);for(let i=0;i<3;i++)tone(380+i*140,100,at+i*.065,.2,.06,pan);}
    if(kind==='defeat'){[293.66,246.94,196,146.83].forEach((n,i)=>tone(n,n*.99,at+i*.18,.85,.065,pan));splash(600,120,at,1,.1,pan);}
    if(kind==='grow'||kind==='win'){const notes=kind==='grow'?[196,293.66,392,493.88,587.33]:[196,246.94,293.66,392,493.88,587.33,784];notes.forEach((n,i)=>{tone(n,n*1.002,at+i*.105,kind==='win'?1.3:.8,.058,(i%2?-.25:.25));tone(n*2,n*1.999,at+i*.105,.45,.013);});splash(350,1500,at,.8,.1);}
  }
  const ambient=ctx.createGain(),water=ctx.createBufferSource(),waterFilter=ctx.createBiquadFilter(),flow=ctx.createGain();ambient.gain.value=0;ambient.connect(master);water.buffer=noise;water.loop=true;waterFilter.type='lowpass';waterFilter.frequency.value=580;flow.gain.value=.04;water.connect(waterFilter);waterFilter.connect(flow);flow.connect(ambient);water.start();
  for(const [i,n]of [98,146.83,196,246.94].entries()){const osc=ctx.createOscillator(),gain=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();osc.frequency.value=n;osc.detune.value=i%2?3:-3;gain.gain.value=.01;osc.connect(gain);gain.connect(ambient);lfo.frequency.value=.06+i*.023;depth.gain.value=.004;lfo.connect(depth);depth.connect(gain.gain);osc.start();lfo.start();}
  return {play,master,ambient,flow,get voices(){return voices;}};
}
export class Sound {
  private context:AudioContext|null=null;private graph:ReturnType<typeof createSoundGraph>|null=null;private _muted=false;private mode:SoundMode='menu';private active=true;
  get muted(){return this._muted;}set muted(value:boolean){this._muted=value;this.mix();}
  unlock(){
    try{if(!this.context){const Constructor=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Constructor)return;this.context=new Constructor();this.graph=createSoundGraph(this.context);this.mix();}if(this.active&&this.context.state!=='running')void this.context.resume().catch(()=>{});}catch{/* Audio is optional; retry on a later user gesture. */try{void this.context?.close().catch(()=>{});}catch{}this.context=null;this.graph=null;}
  }
  setMode(mode:SoundMode){this.mode=mode;this.mix();}
  setActive(active:boolean){this.active=active;this.mix();if(!active&&this.context?.state==='running')void this.context.suspend().catch(()=>{});}
  private mix(){if(!this.context||!this.graph)return;const at=this.context.currentTime;this.graph.master.gain.setTargetAtTime(this._muted||!this.active?0:.65,at,.035);this.graph.ambient.gain.setTargetAtTime(this.mode==='silent'?0:this.mode==='game'?.85:this.mode==='editor'?.38:.52,at,.4);}
  update(speed:number,health:number){if(!this.context||!this.graph)return;this.graph.flow.gain.setTargetAtTime(.03+Math.min(1.8,Math.max(0,speed))*.018+(health<.3?.018:0),this.context.currentTime,.15);}
  play(kind:SoundKind,pan=0){if(this._muted||!this.active||!this.context||this.context.state!=='running')return;this.graph?.play(kind,pan);}
}
