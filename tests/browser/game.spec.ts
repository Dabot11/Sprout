import { test, expect, type Page } from '@playwright/test';
async function boot(page:Page){
  await page.goto('/');await expect(page.locator('#play')).toBeVisible();
  await expect.poll(()=>page.evaluate(async()=>{const {scene}=(window as any).__sprout;return !!scene.player;})).toBe(true);
}
async function play(page:Page){await boot(page);await page.locator('#play').click();await expect(page.locator('#confirm-edit')).toBeVisible();await page.locator('#confirm-edit').click();await expect(page.locator('#pause')).toBeVisible();}
async function growth(page:Page){await page.evaluate(async()=>{const {scene}=(window as any).__sprout;const c='/src/game/config.ts';const {BALANCE}=await import(c);scene.run.food=BALANCE.scales[scene.run.scale].food;});await expect(page.locator('.editor')).toBeVisible();}
async function getRun(page:Page){return page.evaluate(async()=>{return structuredClone((window as any).__sprout.scene.run);});}
test('menú, movimiento con teclado, impulso, pausa y continuación',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await play(page);
  const initial=await getRun(page);await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.down(' ');await page.waitForTimeout(180);
  await expect.poll(async()=>(await getRun(page)).x-initial.x).toBeGreaterThan(40);
  await expect.poll(()=>page.evaluate(async()=>{return (window as any).__sprout.scene.cooldown;})).toBeGreaterThan(0);
  await page.keyboard.up(' ');await page.keyboard.up('d');await page.keyboard.press('Escape');await expect(page.locator('#resume')).toBeVisible();
  const paused=await getRun(page);await page.waitForTimeout(300);expect((await getRun(page)).time).toBe(paused.time);
  await page.locator('#menu').click();await page.locator('#continue').click();expect((await getRun(page)).x).toBeCloseTo(paused.x,0);
  expect(errors).toEqual([]);await page.screenshot({path:'test-results/game-desktop.png'});
});
async function dropAt(page:Page,angle:number){
  const stage=page.locator('#anatomy-stage'),box=(await stage.boundingBox())!;
  await stage.click({position:{x:(320+Math.sin(angle)*150)/640*box.width,y:(250-Math.cos(angle)*150)/560*box.height}});
}
async function choose(page:Page,part:string,angle:number){await page.locator(`[data-part="${part}"]`).click();await dropAt(page,angle);}
test('crear célula: elegir mandíbula directamente y pagar solo al colocar',async({page})=>{
  await boot(page);await page.locator('#play').click();await expect(page.locator('.sculpt-editor h2')).toHaveText('Tu pequeña vida empieza aquí.');
  await page.locator('[data-part="jaw"]').click();await expect(page.locator('.dna-bank b')).toHaveText('3');
  await page.locator('[data-mounted="0"]').click();await expect(page.locator('.dna-bank b')).toHaveText('0');await page.locator('#confirm-edit').click();
  const r=await getRun(page);expect(r.parts[0]).toBe('jaw');expect(r.inventory.gather).toBe(1);
});
test('editor: montaje libre, recolocación, retirada, reutilización y cancelación',async({page})=>{
  await play(page);await growth(page);const before=await getRun(page);await choose(page,'jaw',.65);await expect(page.locator('.dna-bank b')).toHaveText('6');
  await page.locator('[data-mounted="1"]').click();await dropAt(page,1.6);await page.locator('[data-mounted="1"]').click();await page.locator('#remove-part').click();
  await expect(page.locator('[data-part="jaw"] small')).toHaveText('1 en reserva');await choose(page,'jaw',0);await expect(page.locator('[data-part="gather"] small')).toHaveText('1 en reserva');
  await page.screenshot({path:'test-results/editor-desktop.png'});await page.locator('#cancel-edit').click();const r=await getRun(page);expect(r.points).toBe(before.points);expect(r.parts).toEqual(before.parts);expect(r.angles).toEqual(before.angles);
});
test('editor: rechazo atómico por capacidad, simetría, undo y guardado',async({page})=>{
  await play(page);await growth(page);await page.locator('#symmetry').check();await choose(page,'jaw',.65);
  await expect(page.locator('#capacity-label')).toHaveText('4 / 4 piezas');await expect(page.locator('.dna-bank b')).toHaveText('3');
  await choose(page,'flagellum',2.2);await expect(page.locator('#editor-message')).toContainText('Capacidad completa');await expect(page.locator('.dna-bank b')).toHaveText('3');
  await page.locator('#undo-edit').click();await expect(page.locator('#capacity-label')).toHaveText('2 / 4 piezas');await expect(page.locator('.dna-bank b')).toHaveText('9');
  await choose(page,'jaw',.65);await page.locator('[data-color="15309703"]').click();await page.locator('[data-form="2"]').click();await page.locator('#confirm-edit').click();
  const expected=await getRun(page);await page.reload();await expect(page.locator('#continue')).toBeEnabled();await page.locator('#continue').click();const restored=await getRun(page);
  expect(restored.parts).toEqual(expected.parts);expect(restored.angles).toEqual(expected.angles);expect(restored.inventory).toEqual(expected.inventory);expect(restored.color).toBe(expected.color);expect(restored.shape).toBe(2);
});
test('alimentación real: boca frontal, dieta y radio de filtrado',async({page})=>{
  await play(page);
  const result=await page.evaluate(async()=>{
    const {scene:s}=(window as any).__sprout;s.setPaused(true);const p=s.player;p.angle=0;const f=s.foods[0];
    const probe=(part:string,kind:string,x:number)=>{p.parts=['gather',null,null,null,null,null,null,null];p.parts[0]=part;f.kind=kind;f.radius=3;f.x=p.x+x;f.y=p.y;f.active=true;const before=s.run.totalFood;s.foodGrid.rebuild([f]);s.feed(p);return s.run.totalFood-before;};
    return {front:probe('gather','algae',p.radius*1.3),rear:probe('gather','algae',-p.radius*1.3),wrong:probe('gather','remains',p.radius*1.3),meat:probe('jaw','remains',p.radius*1.3),filter:probe('filter','particle',p.radius*1.8)};
  });expect(result).toEqual({front:4,rear:0,wrong:0,meat:8,filter:1});
});
test('combate real: sector de placa e intervalo por atacante y objetivo',async({page})=>{
  await play(page);
  const result=await page.evaluate(async()=>{
    const {scene:s}=(window as any).__sprout;s.setPaused(true);const p=s.player,c=s.creatures[0];p.radius=22;c.radius=22;p.angle=0;c.angle=0;p.x=4000;p.y=4000;c.x=4036;c.y=4000;
    p.parts=['jaw',null,null,null,null,null,null,null];c.parts=[null,null,null,null,'plate',null,null,null];c.health=100;c.hurtUntil=0;s.clock=20;s.hits.clear();s.hit(p,c);const armored=c.health;s.hit(p,c);const repeat=c.health;
    s.clock+=.4;c.hurtUntil=0;s.hit(p,c);const tooSoon=c.health;s.clock+=.4;c.hurtUntil=0;c.parts.fill(null);s.hit(p,c);const bare=c.health;
    return {armored,repeat,tooSoon,bare};
  });expect(result.armored).toBeCloseTo(95.1);expect(result.repeat).toBe(result.armored);expect(result.tooSoon).toBe(result.armored);expect(result.bare).toBeCloseTo(81.1);
});
test('cinco escalas, objetivo final y división celular',async({page})=>{
  await play(page);for(let i=1;i<=4;i++){await growth(page);expect((await getRun(page)).scale).toBe(i);await page.locator('#confirm-edit').click();}
  await expect(page.locator('#objective')).toBeVisible();
  await page.evaluate(async()=>{
    const {scene:s}=(window as any).__sprout;const config='/src/game/config.ts';const {BALANCE}=await import(config);s.player.x=BALANCE.finalZone.x;s.player.y=BALANCE.finalZone.y;s.player.angle=0;s.run.finalFood=BALANCE.finalFood-4;
    for(const c of s.creatures){c.x=100;c.y=100;}const f=s.foods[0];f.kind='algae';f.radius=5;f.active=true;f.x=s.player.x+s.player.radius*1.1;f.y=s.player.y;
  });
  await expect(page.locator('.result h2')).toHaveText('Y todo vuelve a empezar.',{timeout:10000});await page.locator('#replay').click();expect((await getRun(page)).scale).toBe(0);
});
test('derrota, resumen y reinicio',async({page})=>{
  await play(page);await page.evaluate(async()=>{const {scene}=(window as any).__sprout;scene.player.health=0;});
  await expect(page.locator('.result h2')).toHaveText('La corriente sigue.');await expect(page.locator('.result-creature canvas')).toBeVisible();await page.locator('#replay').click();expect((await getRun(page)).health).toBe(100);
});
test('ajustes, datos inválidos y tutorial accesible',async({page})=>{
  await boot(page);await page.getByRole('button',{name:'Sonido: activo'}).click();await page.reload();await expect(page.getByRole('button',{name:'Sonido: apagado'})).toBeVisible();
  await page.getByRole('button',{name:'Cómo jugar'}).click();await expect(page.locator('.help')).toContainText('Jardín de Origen');await page.getByRole('button',{name:'Entendido'}).click();
  await page.evaluate(()=>localStorage.setItem('sprout.save.v1','{broken'));await page.reload();await expect(page.locator('#continue')).toHaveCount(0);await expect(page.locator('#play')).toBeVisible();
});
for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:390,height:844},{width:1024,height:768}]){
  test(`interfaz sin desbordamiento: ${viewport.width}×${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);await boot(page);await page.screenshot({path:`test-results/menu-${viewport.width}.png`});
    const playBox=await page.locator('#play').boundingBox();expect(playBox!.y+playBox!.height).toBeLessThan(viewport.height);
    await page.locator('#play').click();await page.locator('#confirm-edit').click();await expect(page.locator('#game canvas')).toHaveJSProperty('width',viewport.width);await growth(page);
    await choose(page,'filter',Math.PI/2);await page.locator('#confirm-edit').scrollIntoViewIfNeeded();await page.locator('#confirm-edit').click();
    await page.screenshot({path:`test-results/game-${viewport.width}.png`});await page.locator('#pause').click();await expect(page.locator('#resume')).toBeVisible();
  });
}
test('multitáctil: movimiento e impulso simultáneos y cancelación',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});const page=await context.newPage();await play(page);
  const stick=(await page.locator('#joystick').boundingBox())!,boost=(await page.locator('#boost').boundingBox())!,cdp=await context.newCDPSession(page);
  const initial=await getRun(page),points=[{x:stick.x+stick.width/2+36,y:stick.y+stick.height/2,id:1},{x:boost.x+boost.width/2,y:boost.y+boost.height/2,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await page.waitForTimeout(600);
  await expect.poll(async()=>(await getRun(page)).x-initial.x).toBeGreaterThan(40);
  const state=await page.evaluate(async()=>{const {scene:s}=(window as any).__sprout;return {x:s.controls.x,dash:s.controls.dash,cooldown:s.cooldown};});expect(state.x).toBeGreaterThan(.5);expect(state.dash).toBe(true);expect(state.cooldown).toBeGreaterThan(0);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect.poll(()=>page.evaluate(async()=>{const {scene}=(window as any).__sprout;return scene.controls.read().x;})).toBe(0);await context.close();
});
test('arrastrar piezas y cambiar orientación sin perder la partida',async({page})=>{
  await play(page);await growth(page);
  const box=(await page.locator('#anatomy-stage').boundingBox())!;
  await page.locator('[data-part="jaw"]').dragTo(page.locator('#anatomy-stage'),{targetPosition:{x:box.width*.7,y:box.height*.42}});
  await expect(page.locator('[data-mounted="1"]')).toHaveAttribute('aria-label','Seleccionar Mandíbula');
  const handle=page.locator('[data-mounted="1"]'),start=(await handle.boundingBox())!;
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.7,{steps:8});await page.mouse.up();
  await page.locator('#confirm-edit').click();const r=await getRun(page);expect(r.angles[1]).toBeGreaterThan(2.5);
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#game canvas')).toHaveJSProperty('width',390);expect((await getRun(page)).parts[1]).toBe('jaw');
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#game canvas')).toHaveJSProperty('width',844);await page.locator('#pause').click();await expect(page.locator('#resume')).toBeVisible();
});
test('movimiento hacia el mouse y anatomía de mandíbula lateral',async({page})=>{
  await play(page);const before=await getRun(page);await page.mouse.move(1000,360);await page.mouse.down();await expect.poll(async()=>(await getRun(page)).x-before.x).toBeGreaterThan(35);await page.mouse.up();
  await growth(page);await choose(page,'jaw',Math.PI/2);await page.locator('#confirm-edit').click();
  const result=await page.evaluate(async()=>{const {scene:s}=(window as any).__sprout;s.setPaused(true);const p=s.player,c=s.creatures[0];p.angle=0;p.x=4000;p.y=4000;c.x=4000;c.y=4000+p.radius*1.5;c.radius=p.radius;c.health=100;c.hurtUntil=0;c.parts.fill(null);s.clock=20;s.hits.clear();s.hit(p,c);return c.health;});expect(result).toBeLessThan(100);
});
test('editor táctil: reemplazar la boca, cambiar el cuerpo y empezar',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await boot(page);await page.locator('#play').tap();
  await page.locator('[data-part="jaw"]').scrollIntoViewIfNeeded();await page.locator('[data-part="jaw"]').tap();await page.locator('[data-mounted="0"]').scrollIntoViewIfNeeded();await page.locator('[data-mounted="0"]').tap();await expect(page.locator('.dna-bank b')).toHaveText('0');
  await page.locator('[data-form="3"]').scrollIntoViewIfNeeded();await page.locator('[data-form="3"]').tap();await page.screenshot({path:'test-results/editor-touch.png'});await page.locator('#confirm-edit').tap();expect((await getRun(page)).shape).toBe(3);expect((await getRun(page)).parts[0]).toBe('jaw');await context.close();
});
