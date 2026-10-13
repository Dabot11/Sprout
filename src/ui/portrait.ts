import { drawOrganism } from '../game/art';
import { PARTS, type Parts } from '../game/config';
import type { Run } from '../game/model';
export function portrait(parts:Parts,uid='cell',large=false):string{
  return `<canvas class="cell-portrait ${large?'large':''}" width="640" height="560" data-portrait="${uid}" role="img" aria-label="Criatura con ${parts.filter(Boolean).map(p=>PARTS[p!].name).join(', ')}"></canvas>`;
}
export function animatePortraits(root:HTMLElement,run:Pick<Run,'parts'|'angles'|'shape'|'color'|'profile'|'eyes'|'pattern'>,orientation=0){
  const canvases=Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas[data-portrait]'));
  const start=performance.now();let frame=0,lastDraw=-100;
  const draw=(now:number)=>{
    const live=canvases.filter(c=>c.isConnected);if(!live.length)return;
    if(now-lastDraw<33||document.hidden){frame=requestAnimationFrame(draw);return;}lastDraw=now;
    for(const canvas of live){const bounds=canvas.getBoundingClientRect();if(bounds.bottom<0||bounds.top>window.innerHeight)continue;const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,640,560);ctx.save();ctx.translate(330,280);
      drawOrganism(ctx,{...run,radius:Math.min(118,260/(run.profile.length/2+1.5)),time:(now-start)/1000,movement:.12,orientation});ctx.restore();}
    frame=requestAnimationFrame(draw);
  };draw(start);return ()=>cancelAnimationFrame(frame);
}
