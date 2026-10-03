import { it, expect, vi } from 'vitest';
import { applyPhysics, handlePlatformCollisions, handleScreenWrap } from '../game/physics.js';
import { isLandingOnPlatform } from '../game/collision.js';
import { render } from '../game/render.js';
import { createWorld, updatePlatforms } from '../game/world.js';
import { createGame } from '../game/engine.js';
it('gravity preserves horizontal ownership and landing catches fast crossings', () => {
 const p={x:20,y:0,width:34,height:42,vy:900,vx:100};
 applyPhysics(p,0.1); expect(p.x).toBe(20);expect(p.prevY).toBe(0);
 const b={x:0,y:70,width:120,height:14};
 expect(isLandingOnPlatform(p,b)).toBe(true);
 handlePlatformCollisions(p,[{...b,y:100},b]);expect(p.y).toBe(28);expect(p.vy).toBeLessThan(0);
 expect(isLandingOnPlatform(p,b)).toBe(false);
 expect(isLandingOnPlatform({...p,prevY:80,y:90,vy:100},b)).toBe(false);
});
it('bouncy, fragile, and screen wrap use dev coordinates',()=>{
 const p={x:20,y:50,prevY:0,width:34,height:42,vy:100};
 const b={x:0,y:70,width:120,height:14,type:'bouncy',bounceMultiplier:1.45};
 handlePlatformCollisions(p,[b]);expect(p.vy).toBe(-754);
 Object.assign(p,{y:50,prevY:0,vy:100}); b.type='fragile';handlePlatformCollisions(p,[b]);expect(b.broken).toBe(true);
 p.x=961;handleScreenWrap(p,960);expect(p.x).toBe(-34);
 p.x=-35;handleScreenWrap(p,960);expect(p.x).toBe(960);
});
it('renderer keeps generated platforms inside the 960px viewport during scrolling',()=>{
 const world=createWorld();world.cameraY=-400;updatePlatforms(world);
 const ctx={canvas:{width:960,height:540},clearRect:vi.fn(),save:vi.fn(),restore:vi.fn(),fillRect:vi.fn(),translate:vi.fn(),setLineDash:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),fillText:vi.fn()};
 render(ctx,{world,player:{x:300,y:0,width:34,height:42}});
 expect(ctx.translate).not.toHaveBeenCalled();
 for(const [x,,width] of ctx.fillRect.mock.calls){expect(x).toBeGreaterThanOrEqual(0);expect(x+width).toBeLessThanOrEqual(960);}
 expect(Math.min(...world.platforms.map(p=>p.y))).toBeLessThanOrEqual(-600);
});
it('real engine bounces, rises and scrolls with physics enabled',()=>{
 let next;vi.stubGlobal('requestAnimationFrame',fn=>{next=fn;return 1});vi.stubGlobal('cancelAnimationFrame',vi.fn());
 const ctx={canvas:{width:960,height:540},clearRect:vi.fn(),save:vi.fn(),restore:vi.fn(),fillRect:vi.fn(),setLineDash:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),fillText:vi.fn()};
 const game=createGame({width:960,height:540,getContext:()=>ctx},{});
 try {for(let i=0;i<120;i++) next(i*1000/60);expect(game.getSnapshot().maxHeight).toBeGreaterThan(38);expect(ctx.fillRect.mock.calls.every(c=>c.every(Number.isFinite))).toBe(true);}finally{game.destroy();vi.unstubAllGlobals();}
});
