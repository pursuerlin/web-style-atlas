(() => {
  'use strict';
  const themes={forest:'#162720',cobalt:'#10283c',plum:'#302036',ember:'#34231f',sky:'#eaf5ff',mint:'#edf9f1'};
  const root=document.documentElement;
  function setTheme(theme){
    if(!Object.hasOwn(themes,theme))theme='sky';
    root.dataset.theme=theme;
    root.toggleAttribute('data-light',theme==='sky'||theme==='mint');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',themes[theme]);
    document.querySelectorAll('[data-theme-option]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeOption===theme)));
  }
  let saved='sky';try{saved=localStorage.getItem('atlas-theme')||saved;}catch{}
  setTheme(saved);
  document.addEventListener('DOMContentLoaded',()=>{
    setTheme(root.dataset.theme);
    const picker=document.querySelector('.theme-picker');
    picker.addEventListener('click',event=>{
      const button=event.target.closest('[data-theme-option]');if(!button)return;
      setTheme(button.dataset.themeOption);
      try{localStorage.setItem('atlas-theme',button.dataset.themeOption);}catch{}
      picker.open=false;picker.querySelector('summary').focus({preventScroll:true});
    });
    document.addEventListener('click',event=>{if(!picker.contains(event.target))picker.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape' && picker.open){event.preventDefault();event.stopImmediatePropagation();picker.open=false;picker.querySelector('summary').focus({preventScroll:true});}},true);
    addEventListener('storage',event=>{if(event.key==='atlas-theme')setTheme(event.newValue);});
    const stack=document.querySelector('.process-image-stack');
    const button=document.querySelector('.process-shuffle');
    const caption=document.querySelector('#process-caption');
    let current=7,bag=[],busy=false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const preload=src=>new Promise((resolve,reject)=>{
      const img=new Image();
      const finish=error=>{clearTimeout(timer);img.onload=img.onerror=null;error?reject(error):resolve(img);};
      const timer=setTimeout(()=>finish(new Error('Image load timed out')),15000);
      img.onload=()=>finish();img.onerror=()=>finish(new Error('Image unavailable'));img.src=src;
    });
    button.addEventListener('click',async()=>{
      if(busy)return;busy=true;button.disabled=true;stack.setAttribute('aria-busy','true');
      if(!bag.length)bag=window.ATLAS.map(item=>item.id).filter(id=>id!==current);
      const index=Math.floor(Math.random()*bag.length),id=bag[index];
      const item=window.ATLAS.find(item=>item.id===id);
      try{
        await Promise.all([preload(item.original_webp),preload(item.preview)]);
        if(!reduced.matches)await stack.animate([{opacity:1},{opacity:.3}],{duration:110,fill:'forwards'}).finished;
        const concept=stack.querySelector('.process-concept'),implementation=stack.querySelector('.process-implementation img');
        concept.src=item.original_webp;concept.alt=`${item.name} ${item.zh}的概念原图`;
        implementation.src=item.preview;implementation.alt=`相同风格落地后的 ${item.name} 真实网页`;
        stack.querySelector('.process-browser b').textContent=`${item.name.toLowerCase()} / live preview`;
        const link=document.querySelector('.process-art-caption a');link.href=`#case/${id}`;link.dataset.open=String(id);
        caption.textContent=`${item.name} · ${item.zh} / ${String(id).padStart(2,'0')}`;
        current=id;bag.splice(index,1);
        stack.getAnimations().forEach(animation=>animation.cancel());
        if(!reduced.matches)stack.animate([{opacity:.3},{opacity:1}],{duration:220,easing:'ease-out'});
      }catch{
        caption.textContent='图片暂时未能加载，请再试一次。';
        stack.getAnimations().forEach(animation=>animation.cancel());
      }finally{busy=false;button.disabled=false;stack.removeAttribute('aria-busy');}
    });
  });
})();
