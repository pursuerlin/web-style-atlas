(() => {
  'use strict';
  const stage=document.querySelector('#atlas-stage');
  const wall=document.querySelector('#atlas-wall');
  const label=document.querySelector('#wall-current');
  const index=document.querySelector('#wall-index');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  let frame=0, point=null;
  const resetLabel=()=>{label.textContent='二十种设计，二十个世界。';index.textContent='20 / 20';};
  function showTile(tile){
    if(!tile) return;
    label.textContent=`${tile.dataset.name} · ${tile.dataset.style}`;
    index.textContent=`${String(tile.dataset.open).padStart(2,'0')} / 20`;
  }
  stage.addEventListener('pointermove',event=>{
    if(!fine.matches || reduced.matches || document.documentElement.dataset.transitioning) return;
    point={x:event.clientX,y:event.clientY};
    if(frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      if(!point || stage.closest('[hidden]')) return;
      const rect=stage.getBoundingClientRect();
      const x=Math.max(-1,Math.min(1,(point.x-rect.left)/rect.width*2-1));
      const y=Math.max(-1,Math.min(1,(point.y-rect.top)/rect.height*2-1));
      wall.style.setProperty('--wall-x',`${(x*2).toFixed(2)}deg`);
      wall.style.setProperty('--wall-y',`${(-y*1.5).toFixed(2)}deg`);
    });
  },{passive:true});
  wall.addEventListener('pointerover',event=>showTile(event.target.closest('.wall-tile')),{passive:true});
  wall.addEventListener('focusin',event=>showTile(event.target.closest('.wall-tile')));
  wall.addEventListener('focusout',event=>{if(!wall.contains(event.relatedTarget))resetLabel();});
  stage.addEventListener('pointerleave',()=>{
    cancelAnimationFrame(frame);frame=0;point=null;
    wall.style.removeProperty('--wall-x');wall.style.removeProperty('--wall-y');
    if(!wall.contains(document.activeElement)) resetLabel();
  },{passive:true});
})();
