import { drawOrganism } from '../game/art';
import { PARTS, type Parts } from '../game/config';
import type { Run } from '../game/model';
export function portrait(parts:Parts,uid='cell',large=false):string{
  return `<canvas class="cell-portrait ${large?'large':''}" width="640" height="560" data-portrait="${uid}" role="img" aria-label="Criatura con ${parts.filter(Boolean).map(p=>PARTS[p!].name).join(', ')}"></canvas>`;
}
export function animatePortraits(root:HTMLElement,run:Pick<Run,'parts'|'angles'|'shape'|'color'>,orientation=0){
  const canvases=Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas[data-portrait]'));
  const start=performance.now();let frame=0;
  const draw=(now:number)=>{
    const live=canvases.filter(c=>c.isConnected);if(!live.length)return;
    for(const canvas of live){const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,640,560);ctx.save();ctx.translate(330,280);
      drawOrganism(ctx,{parts:run.parts,angles:run.angles,shape:run.shape,color:run.color,radius:118,time:(now-start)/1000,movement:.12,orientation});ctx.restore();}
    frame=requestAnimationFrame(draw);
  };draw(start);return ()=>cancelAnimationFrame(frame);
}
