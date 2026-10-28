(() => {
  'use strict';
  if(!window.gsap || !window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  const gallery=document.querySelector('#gallery');
  const story=document.querySelector('.process-story');
  const stage=document.querySelector('#atlas-stage');
  const root=document.documentElement;
  let triggers=[], deferredRefresh=0, suspended=gallery.hidden;
  function refresh(){
    cancelAnimationFrame(deferredRefresh);
    deferredRefresh=requestAnimationFrame(()=>{
      if(gallery.hidden || root.hasAttribute('data-transitioning'))return;
      const active=new Set(ScrollTrigger.getAll());
      triggers=triggers.filter(trigger=>trigger && active.has(trigger));
      triggers.forEach(trigger=>trigger.enable(false,false));
      suspended=false;ScrollTrigger.refresh();
      triggers.forEach(trigger=>trigger.refresh());
      ScrollTrigger.update();
    });
  }
  gallery.addEventListener('atlas:conceal',()=>{
    suspended=true;
    triggers.forEach(trigger=>trigger.disable(false));
    gsap.set('.pointer-label',{opacity:0});
  });
  gallery.addEventListener('atlas:reveal',refresh);
  new MutationObserver(()=>{if(!root.hasAttribute('data-transitioning') && !gallery.hidden)refresh();}).observe(root,{attributes:true,attributeFilter:['data-transitioning']});
  new MutationObserver(refresh).observe(document.querySelector('#cards'),{subtree:true,attributes:true,attributeFilter:['hidden']});
  document.fonts.ready.then(refresh);
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
    root.classList.add('has-scroll-motion');
    gsap.set('.process-implementation',{clipPath:'inset(0% 100% 0% 0%)'});
    const local=[];
    const track=animation=>{if(animation.scrollTrigger)local.push(animation.scrollTrigger);return animation;};
    track(gsap.to('.wall-camera',{
      y:95,x:38,scale:1.14,rotation:6,ease:'none',
      scrollTrigger:{trigger:'.hero-exhibit',start:'top top',end:'bottom top',scrub:true,invalidateOnRefresh:true}
    }));
    track(gsap.to('.hero-figure',{
      y:-115,rotation:-7,ease:'none',
      scrollTrigger:{trigger:'.hero-exhibit',start:'top top',end:'bottom top',scrub:true}
    }));
    track(gsap.to('.ribbon-track',{
      xPercent:-24,ease:'none',
      scrollTrigger:{trigger:'.design-ribbon',start:'top bottom',end:'bottom top',scrub:true}
    }));
    const states=[...document.querySelectorAll('[data-process-state]')];
    const process=gsap.timeline({scrollTrigger:{
      trigger:story,
      start:()=>story.getBoundingClientRect().top+scrollY,
      end:()=>story.getBoundingClientRect().top+scrollY+story.offsetHeight-innerHeight,
      scrub:true,invalidateOnRefresh:true,
      onUpdate:self=>{
        story.dataset.progress=self.progress.toFixed(3);
        states.forEach((state,i)=>state.classList.toggle('is-current',i===(self.progress<.5?0:1)));
      }
    }});
    local.push(process.scrollTrigger);
    process.to('.process-art',{rotation:0,scale:1.08,y:-5,ease:'none',duration:1},0)
      .to('.process-implementation',{clipPath:'inset(0% 0% 0% 0%)',ease:'none',duration:.8},.1)
      .to('.process-meter>span',{scaleX:1,ease:'none',duration:1},0)
      .fromTo('.process-scanline',{opacity:0},{opacity:1,duration:.03},.1)
      .to('.process-scanline',{x:()=>document.querySelector('.process-image-stack').clientWidth,ease:'none',duration:.8},.1)
      .to('.process-scanline',{opacity:0,duration:.05},.9);
    for(const card of document.querySelectorAll('.atlas-card')){
      track(gsap.fromTo(card.querySelector('.card-image'),
        {clipPath:'inset(10% 0% 0% 0%)',y:26},
        {clipPath:'inset(0% 0% 0% 0%)',y:0,duration:.75,ease:'power3.out',immediateRender:false,
          scrollTrigger:{trigger:card,start:'top 95%',once:true,invalidateOnRefresh:true}}
      ));
    }
    for(const article of document.querySelectorAll('.method-steps article')){
      track(gsap.fromTo(article,{x:30,opacity:.25},{x:0,opacity:1,duration:.65,ease:'power3.out',immediateRender:false,
        scrollTrigger:{trigger:article,start:'top 94%',once:true}}));
    }
    track(gsap.to('.reading-progress',{scaleX:1,ease:'none',scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:true}}));
    triggers=local;
    if(suspended)triggers.forEach(trigger=>trigger.disable(false));
    // A short, event-driven pointer cue on the large gallery images; native cursor remains available.
    const pointer=document.querySelector('.pointer-label');
    const fine=matchMedia('(hover:hover) and (pointer:fine)');
    const setX=gsap.quickTo(pointer,'x',{duration:.18,ease:'power3.out'});
    const setY=gsap.quickTo(pointer,'y',{duration:.18,ease:'power3.out'});
    let pointerActive=false;
    const onMove=event=>{
      if(!fine.matches)return;
      const active=!gallery.hidden && !root.hasAttribute('data-transitioning') && !!event.target.closest('.atlas-card .card-image');
      if(active!==pointerActive){pointerActive=active;gsap.to(pointer,{opacity:active?1:0,scale:active?1:.6,duration:.18,overwrite:'auto'});}
      if(active){setX(event.clientX);setY(event.clientY);}
    };
    const onLeave=()=>{pointerActive=false;gsap.to(pointer,{opacity:0,scale:.6,duration:.15,overwrite:'auto'});};
    document.addEventListener('pointermove',onMove,{passive:true});
    document.documentElement.addEventListener('pointerleave',onLeave);
    refresh();
    return ()=>{
      document.removeEventListener('pointermove',onMove);
      document.documentElement.removeEventListener('pointerleave',onLeave);
      root.classList.remove('has-scroll-motion');
      gsap.set(pointer,{clearProps:'all'});triggers=[];delete story.dataset.progress;
    };
  });
  // Keep the header reading indicator useful on static/reduced-motion routes too.
  addEventListener('pagehide',()=>cancelAnimationFrame(deferredRefresh),{once:true});
})();
