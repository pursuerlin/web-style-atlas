(() => {
  'use strict';
  const stage=document.querySelector('#atlas-stage');
  const wall=document.querySelector('#atlas-wall');
  const label=document.querySelector('#wall-current');
  const index=document.querySelector('#wall-index');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton=document.querySelector('#wall-motion');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  let frame=0, point=null, routePhases=null;
  function syncMotionPreference(){
    stage.toggleAttribute('data-static',reduced.matches);
    motionButton.hidden=reduced.matches;
  }
  syncMotionPreference();
  reduced.addEventListener('change',syncMotionPreference);
  motionButton.addEventListener('click',()=>{
    const paused=!stage.hasAttribute('data-paused');
    stage.toggleAttribute('data-paused',paused);
    motionButton.setAttribute('aria-pressed',String(paused));
    motionButton.setAttribute('aria-label',paused?'继续作品墙滚动':'暂停作品墙滚动');
    motionButton.title=paused?'继续滚动':'暂停滚动';
    motionButton.querySelector('path').setAttribute('d',paused?'M9 5l10 7-10 7Z':'M9 6v12M15 6v12');
  });
  stage.addEventListener('pointerdown',event=>{if(event.target.closest('.wall-tile'))stage.setAttribute('data-pressing','');},{passive:true});
  const releasePress=()=>requestAnimationFrame(()=>stage.removeAttribute('data-pressing'));
  addEventListener('pointerup',releasePress,{passive:true});
  addEventListener('pointercancel',releasePress,{passive:true});
  // Hold the exact belt phase across image decoding, detail navigation and the return morph.
  stage.addEventListener('click',event=>{
    if(event.target.closest('.wall-tile') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button===0){
      stage.setAttribute('data-route-hold','');
      routePhases=[...wall.querySelectorAll('.wall-track')].map(track=>track.getAnimations()[0]?.currentTime);
    }
  });
  const gallery=document.querySelector('#gallery');
  // display:none cancels CSS animations; restore their clocks before the return snapshot.
  gallery.addEventListener('atlas:reveal',()=>{
    if(!routePhases)return;
    [...wall.querySelectorAll('.wall-track')].forEach((track,i)=>{
      const animation=track.getAnimations()[0];
      if(animation && routePhases[i]!=null)animation.currentTime=routePhases[i];
    });
    routePhases=null;
  });
  const releaseRoute=()=>{
    if(!gallery.hidden && !document.documentElement.dataset.transitioning && !/^#case\//.test(location.hash))stage.removeAttribute('data-route-hold');
  };
  new MutationObserver(releaseRoute).observe(document.documentElement,{attributes:true,attributeFilter:['data-transitioning']});
  new MutationObserver(releaseRoute).observe(gallery,{attributes:true,attributeFilter:['hidden']});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
    stage.toggleAttribute('data-offscreen',!entries[0].isIntersecting);
  },{threshold:0}).observe(stage);
  const syncVisibility=()=>stage.toggleAttribute('data-page-hidden',document.hidden);
  document.addEventListener('visibilitychange',syncVisibility);syncVisibility();

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
  wall.addEventListener('focusin',event=>{
    const tile=event.target.closest('.wall-tile');showTile(tile);
    if(!tile || tile.hasAttribute('data-repeat') || tile.hasAttribute('data-returning') || stage.hasAttribute('data-pressing') || reduced.matches || !tile.matches(':focus-visible'))return;
    const column=tile.closest('.wall-column'), track=tile.closest('.wall-track');
    const animation=track.getAnimations()[0];
    if(!animation)return;
    const height=track.querySelector('.wall-set').offsetHeight;
    const timing=animation.effect.getTiming();
    const offset=Math.max(0,Math.min(height-column.clientHeight,tile.offsetTop-(column.clientHeight-tile.offsetHeight)/2));
    const progress=column.dataset.direction==='down'?1-offset/height:offset/height;
    // Stay inside the current iteration: the next downward cycle starts one set higher.
    animation.currentTime=Math.min(progress,.999999)*timing.duration+timing.delay;
  });
  wall.addEventListener('focusout',event=>{if(!wall.contains(event.relatedTarget))resetLabel();});
  stage.addEventListener('pointerleave',()=>{
    cancelAnimationFrame(frame);frame=0;point=null;
    wall.style.removeProperty('--wall-x');wall.style.removeProperty('--wall-y');
    if(!wall.contains(document.activeElement)) resetLabel();
  },{passive:true});
})();
