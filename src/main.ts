/// <reference types="vite/client" />
import Phaser from 'phaser';
import './style.css';
import { TideScene } from './game/scene';
import { Sound } from './game/audio';
import { App } from './ui/app';
const audio=new Sound();export let app:App;
export const scene=new TideScene({tick:(run,cooldown)=>app?.tick(run,cooldown),adapt:run=>app.adapt(run),result:(run,won)=>app.result(run,won),notice:text=>app?.notice(text),pause:()=>app?.pause(),ready:()=>app?.ready()},audio);
// Software WebGL can be dramatically slower than the Canvas fallback.
function rendererType(){
  if(import.meta.env.DEV&&new URLSearchParams(location.search).get('renderer')==='webgl')return Phaser.WEBGL;
  const canvas=document.createElement('canvas');try{const gl=canvas.getContext('webgl',{failIfMajorPerformanceCaveat:true});if(!gl)return Phaser.CANVAS;const info=gl.getExtension('WEBGL_debug_renderer_info'),name=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):'';gl.getExtension('WEBGL_lose_context')?.loseContext();return /swiftshader|llvmpipe|software/i.test(name)?Phaser.CANVAS:Phaser.AUTO;}catch{return Phaser.CANVAS;}
}
const selectedRenderer=rendererType();document.documentElement.classList.toggle('canvas-renderer',selectedRenderer===Phaser.CANVAS);
new Phaser.Game({type:selectedRenderer,fps:{smoothStep:false},parent:'game',backgroundColor:'#0b414b',antialias:true,render:{powerPreference:'high-performance',roundPixels:false},scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},input:{activePointers:3},scene:[scene],audio:{noAudio:true}});
app=new App(scene,audio);

// Development-only inspection bridge for browser integration tests.
if(import.meta.env.DEV) Object.assign(window,{__sprout:{scene}});
