(() => {
  'use strict';
  const items = window.ATLAS;
  items.forEach(item => {item.prompt = window.ATLAS_PROMPTS[item.id];});
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories = {'All':'全部风格','Lifestyle':'生活方式','Editorial':'杂志与品牌','Product / AI':'科技与产品','Experimental':'创意实验'};
  const gallery = $('#gallery'), detail = $('#detail'), cards = $('#cards');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let category = 'All', mode = 'preview', detailMode = 'preview', current = null;
  let listScroll = 0, origin = null, sequence = 0, activeTransition = null, work = Promise.resolve(), toastTimer;
  let searchTimer, routedFromGallery = false, pendingAnchor = null, backRequested = false;
  let modeRequest = 0, requestedMode = mode, detailModeRequest = 0, requestedDetailMode = detailMode;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const imagePath = (item, type) => type === 'original' ? item.original_webp : item.preview;
  const number = id => String(id).padStart(2, '0');
  const tags = item => item.keywords.map(k => `<span>${escape(k)}</span>`).join('');
  const visibleItems = () => items.filter(item => {
    const query = $('#search').value.trim().toLocaleLowerCase();
    return (category === 'All' || item.category === category) && [item.name,item.zh,item.en,item.description,...item.keywords].join(' ').toLocaleLowerCase().includes(query);
  });
  cards.innerHTML = items.map(item => `<a class="atlas-card" href="#case/${item.id}" data-open="${item.id}" aria-label="查看 ${escape(item.name)} · ${escape(item.zh)}"><div class="card-image"><img data-image="${item.id}" src="${imagePath(item, mode)}" width="1440" height="900" loading="lazy" decoding="async" alt="${escape(item.name)} 网页实作预览"><span class="image-action" aria-hidden="true">↗</span></div><div class="card-meta"><span>${categories[item.category]}</span><span class="card-index">${number(item.id)} / 20</span></div><div class="card-title"><h3>${escape(item.name)}</h3><span aria-hidden="true">↗</span></div><p class="card-description">${escape(item.zh)}</p><div class="tags">${tags(item)}</div></a>`).join('');
  // Interleave different visual families so the opening wall reads as a collection.
  const wallOrder = [1,7,3,20,5,11,2,14,4,8,18,6,9,16,10,15,19,12,13,17];
  function wallTile(id,index,repeat=false) {
    const item=items.find(x=>x.id===id);
    return `<a class="wall-tile" href="#case/${item.id}" data-open="${item.id}" data-name="${escape(item.name)}" data-style="${escape(item.zh)}" style="--shift:0px;--order:${index}" ${repeat?'data-repeat aria-hidden="true" tabindex="-1"':''} aria-label="查看 ${escape(item.name)} · ${escape(item.zh)}"><span class="tile-bar" aria-hidden="true"><i></i><i></i><i></i></span><img data-hero-image="${item.id}" src="${imagePath(item,mode)}" alt="${escape(item.name)} 网页风格预览" width="1440" height="900" decoding="async" ${index<5?'fetchpriority="high"':'loading="lazy"'}></a>`;
  }
  $('#atlas-wall').innerHTML = Array.from({length:5},(_,column)=>{
    const ids=wallOrder.filter((_,index)=>index%5===column);
    const duration=[34,41,37,44,39][column], delay=[-7,-19,-11,-27,-15][column];
    return `<div class="wall-column" data-direction="${column%2?'down':'up'}"><div class="wall-track" style="--duration:${duration}s;--delay:${delay}s"><div class="wall-set">${ids.map((id,row)=>wallTile(id,row*5+column)).join('')}</div><div class="wall-set wall-repeat">${ids.map((id,row)=>wallTile(id,row*5+column,true)).join('')}</div></div></div>`;
  }).join('');
  function syncHeroImages(type) {
    $$('[data-hero-image]').forEach(img=>{const item=items.find(x=>x.id===Number(img.dataset.heroImage));img.src=imagePath(item,type);img.alt=`${item.name} ${type==='original'?'原始概念图':'网页实作预览'}`;});
  }
  const cardFor = id => $(`.atlas-card[data-open="${id}"]`);
  const cardImage = id => $(`[data-image="${id}"]`, cardFor(id));
  function placeIndicator(group) {
    const button = $('button.active', group), indicator = $(':scope > span', group);
    if (!button || !indicator) return;
    indicator.style.width = `${button.offsetWidth}px`;
    indicator.style.transform = `translateX(${button.offsetLeft - indicator.offsetLeft}px)`;
  }
  function syncIndicators() { $$('.filters,.segmented').forEach(placeIndicator); }
  function selectButton(button) {
    const group = button.parentElement;
    $$('button', group).forEach(b => {b.classList.toggle('active', b === button);b.setAttribute('aria-pressed', String(b === button));});
    placeIndicator(group);
  }
  function filterCards() {
    const visible = new Set(visibleItems().map(x => x.id));
    items.forEach(item => {cardFor(item.id).hidden = !visible.has(item.id);});
    $('#count').textContent = `${visible.size} / 20 个案例`;
    $('#collection-label').textContent = categories[category];
    $('#empty').hidden = visible.size > 0;
  }
  function clearNames() { $$('[style*="view-transition-name"]').forEach(el => {el.style.viewTransitionName = '';}); }
  function nameVisibleImages() { $$('.atlas-card:not([hidden]) img').forEach(img => {img.style.viewTransitionName = `atlas-${img.dataset.image}`;}); }
  function enqueue(job) {
    if (activeTransition) activeTransition.skipTransition();
    work = work.catch(() => {}).then(job);
    return work;
  }
  async function animateChange(change, {kind='filter', source=null, destination=null, nameImages=false} = {}) {
    document.documentElement.dataset.transitioning='true';
    try {
    document.documentElement.dataset.motion = kind;
    clearNames();
    if (nameImages) nameVisibleImages();
    if (source) source.style.viewTransitionName = 'selected-image';
    if (reduced.matches) {change();clearNames();return;}
    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        change();
        if (nameImages) nameVisibleImages();
        const target = destination?.();
        if (target) target.style.viewTransitionName = 'selected-image';
      });
      activeTransition = transition;
      transition.ready.catch(() => {});
      transition.updateCallbackDone.catch(() => {});
      try {await transition.finished;} catch { /* Interrupted transitions still commit their update. */ }
      finally {if (activeTransition === transition) activeTransition = null;clearNames();}
      return;
    }
    // Shared-image fallback for browsers without native View Transitions.
    const rect = source?.getBoundingClientRect();
    const clone = rect && source.cloneNode(true);
    if (clone) {
      clone.removeAttribute('data-image');clone.removeAttribute('id');
      Object.assign(clone.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,maxWidth:'none',margin:'0',objectFit:'cover',objectPosition:'top',zIndex:'999',pointerEvents:'none',borderRadius:'6px'});
      document.body.append(clone);
    }
    change();
    const target = destination?.();
    if (clone && target) {
      const end = target.getBoundingClientRect();target.style.visibility = 'hidden';
      try {await clone.animate([{transform:'translate(0,0) scale(1,1)'},{transform:`translate(${end.left-rect.left}px,${end.top-rect.top}px) scale(${end.width/rect.width},${end.height/rect.height})`}],{duration:kind === 'back' ? 320 : 460,easing:'cubic-bezier(.22,.8,.25,1)',fill:'forwards'}).finished;}
      finally {target.style.visibility='';clone.remove();}
    } else clone?.remove();
    clearNames();
    } finally {delete document.documentElement.dataset.transitioning;}
  }
  async function preload(src) {
    const img = new Image();img.src = src;
    try {await img.decode();} catch { /* Broken images retain meaningful alt text. */ }
  }
  function toast(message) {
    clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');
    toastTimer=setTimeout(() => $('#toast').classList.remove('visible'),2500);
  }
  async function copy(text, success) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const input = document.createElement('textarea');input.value=text;
        Object.assign(input.style,{position:'fixed',opacity:'0'});document.body.append(input);input.select();
        const ok = document.execCommand('copy');input.remove();
        if (!ok) throw new Error('Copy unavailable');
      }
      toast(success);
    } catch {toast('暂时无法复制，请选中文字手动复制。');}
  }
  function renderDetail(item) {
    requestedDetailMode=detailMode;++detailModeRequest;
    const collection = visibleItems();
    const index = collection.findIndex(x => x.id === item.id);
    const previous = collection[index-1], next = collection[index+1];
    detail.innerHTML = `<div class="detail-top"><button class="back" data-back><span aria-hidden="true">←</span> 返回风格图鉴</button><span class="detail-counter">${categories[item.category]} <span aria-hidden="true"> / </span> ${number(item.id)} / 20</span></div><div class="detail-intro"><div><p class="eyebrow">${escape(item.zh)}</p><h1>${escape(item.name)}<span class="accent">.</span></h1><p class="detail-description">${escape(item.description)}</p><p class="detail-en" lang="en">${escape(item.en)}</p></div><a class="button" href="${escape(item.site_file)}" target="_blank" rel="noopener">体验真实网页 <span aria-hidden="true">↗</span></a></div><div class="detail-media"><img id="detail-image" src="${imagePath(item,detailMode)}" width="1440" height="900" alt="${escape(item.name)} ${detailMode === 'original' ? '原始概念图' : '网页实作预览'}"></div><div class="media-tools"><div class="segmented" role="group" aria-label="详情图片类型"><span class="segment-indicator" aria-hidden="true"></span><button data-detail-mode="preview" class="${detailMode === 'preview' ? 'active' : ''}" aria-pressed="${detailMode === 'preview'}">网页实作</button><button data-detail-mode="original" class="${detailMode === 'original' ? 'active' : ''}" aria-pressed="${detailMode === 'original'}">概念原图</button></div><a id="full-image" href="${detailMode === 'original' ? item.original : item.preview}" target="_blank" rel="noopener">查看完整图片 ↗</a></div><p class="image-note">切换查看概念与实作，或打开完整长图查看细节。</p><section class="study-grid"><div><h2>这套风格，好在哪里？</h2><p class="lead">${escape(item.hero)}</p>${[['布局结构',item.layout],['字体与层级',item.type],['图像素材',item.assets],['网页组件',item.code]].map(([title,body])=>`<div class="anatomy-row"><h3>${title}</h3><p>${escape(body)}</p></div>`).join('')}</div><aside class="detail-aside"><section><h3>视觉关键词</h3><div class="tags">${tags(item)}</div></section><section><h3>色彩参考 <span class="eyebrow">/ 点击复制</span></h3><div class="palette">${item.colors.map(color=>`<button class="color-button" data-color="${escape(color)}" aria-label="复制色值 ${escape(color)}"><span class="swatch" style="background:${escape(color)}"></span><code>${escape(color)}</code></button>`).join('')}</div><p style="margin-top:12px">从概念图提炼的近似配色。</p></section><section><h3>适合用在哪里</h3><p>${escape(item.reuse)}</p></section><section class="pitfall"><h3>落地时，留意这一点</h3><p>${escape(item.pitfall)}</p></section></aside></section><section class="prompt-section"><div class="prompt-header"><h2>带走这份灵感。</h2><div class="prompt-actions"><button class="button" data-copy-prompt>复制 Prompt <span aria-hidden="true">↗</span></button><a class="button secondary" href="${escape(item.prompt_file)}" download>下载 Markdown</a></div></div><pre class="prompt-box" id="prompt" lang="en">${escape(item.prompt)}</pre><p class="prompt-note">根据原始概念图反向重构的英文学习 Prompt，并非最初输入模型的原文。图片、字体与第三方素材的公开使用，请核对对应授权。</p></section><nav class="detail-bottom" aria-label="案例翻页"><button data-next="${previous?.id || ''}" ${previous ? '' : 'disabled'}>← ${previous ? `上一例 · ${escape(previous.name)}` : '已是第一例'}</button><button data-next="${next?.id || ''}" ${next ? '' : 'disabled'}>${next ? `下一例 · ${escape(next.name)}` : '已是最后一例'} →</button></nav>`;
    syncIndicators();
  }
  function saveListState() {
    try {sessionStorage.setItem('atlas-list',JSON.stringify({category,query:$('#search').value,mode,scroll:listScroll}));} catch {}
  }
  function restoreListState() {
    try {
      const state = JSON.parse(sessionStorage.getItem('atlas-list'));
      if (!state) return;
      category = categories[state.category] ? state.category : 'All';
      mode = state.mode === 'original' ? 'original' : 'preview';
      $('#search').value = state.query || '';listScroll=Number(state.scroll)||0;
      selectButton($(`[data-cat="${category}"]`));selectButton($(`[data-mode="${mode}"]`));
      items.forEach(item=>{cardImage(item.id).src=imagePath(item,mode);});syncHeroImages(mode);
    } catch {}
  }
  const routeId = () => {const m=location.hash.match(/^#case\/(\d+)$/);return m ? Number(m[1]) : null;};
  async function route() {
    const request = ++sequence, id=routeId(), item=items.find(x=>x.id===id);
    if (id && !item) {history.replaceState(null,'',location.pathname+location.search+'#collection');toast('这个案例不存在，已返回图鉴。');}
    if (item) await preload(imagePath(item, current ? detailMode : mode));
    if (request!==sequence) return;
    await enqueue(async()=>{
      if (request!==sequence) return;
      if (item && current?.id === item.id) return;
      if (item) {
        const fromList=!current;
        const source = fromList ? (origin?.dataset.open === String(item.id) ? $('img',origin) : cardImage(item.id)) : $('#detail-image');
        if(fromList) {listScroll=window.scrollY;detailMode=mode;saveListState();}
        await animateChange(()=>{
          current=item;renderDetail(item);gallery.hidden=true;detail.hidden=false;
          window.scrollTo({top:0,behavior:'instant'});document.title=`${item.name} · ${item.zh} — Style Atlas`;
        },{kind:'open',source:source && source.getBoundingClientRect().height ? source : null,destination:()=>$('#detail-image')});
        detail.focus({preventScroll:true});
      } else if(current) {
        const closing=current;
        // Restore the listing image to exactly the same content before shrinking.
        cardImage(closing.id).src=imagePath(closing,detailMode);
        const source=$('#detail-image');
        const sourceRect=source.getBoundingClientRect();
        if(sourceRect.bottom<0 || sourceRect.top>innerHeight) source.scrollIntoView({block:'center',behavior:'instant'});
        const returnImage = origin?.dataset.open === String(closing.id) ? $('img',origin) : cardImage(closing.id);
        returnImage.src=imagePath(closing,detailMode);
        await animateChange(()=>{
          detail.hidden=true;gallery.hidden=false;current=null;
          gallery.dispatchEvent(new Event('atlas:reveal'));
          window.scrollTo({top:listScroll,behavior:'instant'});
          const card=origin?.dataset.open === String(closing.id) ? origin : cardFor(closing.id);
          if(!card.hidden) {
            const rect=card.getBoundingClientRect();
            if(rect.top<0 || rect.top+Math.min(rect.height,200)>innerHeight) card.scrollIntoView({block:'center',behavior:'instant'});
          }
          document.title='Style Atlas — 网页风格图鉴';
        },{kind:'back',source,destination:()=>returnImage.closest('[hidden]') ? null : returnImage});
        const target=origin?.dataset.open === String(closing.id) && origin.getBoundingClientRect().height ? origin : cardFor(closing.id);
        if(!target.hidden) {
          target.setAttribute('data-returning','');
          (target.hasAttribute('data-repeat') ? $('#wall-motion') : target).focus({preventScroll:true});
          target.removeAttribute('data-returning');
        }
        // Keep the chosen image mode consistent across the whole listing.
        if(mode!==detailMode) {mode=detailMode;requestedMode=mode;items.forEach(x=>{cardImage(x.id).src=imagePath(x,mode);});syncHeroImages(mode);selectButton($(`[data-mode="${mode}"]`));}
        listScroll=scrollY;saveListState();
        if(pendingAnchor) {$(pendingAnchor)?.scrollIntoView({behavior:'instant',block:'start'});pendingAnchor=null;}
      }
      syncIndicators();backRequested=false;
    });
  }
  document.addEventListener('click',event=>{
    const navigation=event.target.closest('.nav-link');
    if(navigation && current) pendingAnchor=navigation.getAttribute('href');
    const open=event.target.closest('[data-open]');
    if(open && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button===0) {
      event.preventDefault();origin=open;routedFromGallery=true;location.hash=`case/${open.dataset.open}`;return;
    }
    const back=event.target.closest('[data-back]');
    if(back) {if(backRequested || !current) return;backRequested=true;if(routedFromGallery) history.back();else location.hash='collection';return;}
    const next=event.target.closest('[data-next]');
    if(next?.dataset.next) {history.replaceState(null,'',`#case/${next.dataset.next}`);route();return;}
    const color=event.target.closest('[data-color]');
    if(color) copy(color.dataset.color,`已复制色值 ${color.dataset.color}`);
    if(event.target.closest('[data-copy-prompt]') && current) copy(current.prompt,`已复制 ${current.name} 的 Prompt`);
    const detailButton=event.target.closest('[data-detail-mode]');
    if(detailButton && detailButton.dataset.detailMode!==requestedDetailMode) {
      const desired=detailButton.dataset.detailMode, item=current, request=++detailModeRequest;
      requestedDetailMode=desired;selectButton(detailButton);detailButton.parentElement.setAttribute('aria-busy','true');
      preload(imagePath(item,desired)).then(()=>enqueue(async()=>{
        if(current!==item || request!==detailModeRequest) return;
        await animateChange(()=>{detailMode=desired;const img=$('#detail-image');img.src=imagePath(item,desired);img.alt=`${item.name} ${desired==='original'?'原始概念图':'网页实作预览'}`;$('#full-image').href=desired==='original'?item.original:item.preview;selectButton(detailButton);},{kind:'swap'});
        if(request===detailModeRequest) detailButton.parentElement.removeAttribute('aria-busy');
      }));
    }
  });
  $$('[data-cat]').forEach(button=>button.addEventListener('click',()=>{
    if(category===button.dataset.cat) return;
    category=button.dataset.cat;selectButton(button);
    enqueue(()=>animateChange(()=>{filterCards();listScroll=scrollY;saveListState();},{nameImages:true}));
  }));
  $('#search').addEventListener('input',()=>{
    clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>enqueue(()=>animateChange(()=>{filterCards();listScroll=scrollY;saveListState();},{nameImages:true})),120);
  });
  $$('[data-mode]').forEach(button=>button.addEventListener('click',async()=>{
    const desired=button.dataset.mode;
    if(requestedMode===desired) return;
    requestedMode=desired;
    const request=++modeRequest;
    button.parentElement.setAttribute('aria-busy','true');selectButton(button);
    $('#collection-label').textContent=desired==='original'?'正在载入概念原图…':'正在载入网页实作…';
    const onScreen=visibleItems().filter(item=>{const rect=cardFor(item.id).getBoundingClientRect();return rect.top<innerHeight && rect.bottom>0;});
    await Promise.all(onScreen.map(item=>preload(imagePath(item,desired))));
    if(request!==modeRequest) return;
    enqueue(async()=>{
      if(request!==modeRequest) return;
      await animateChange(()=>{mode=desired;items.forEach(item=>{const img=cardImage(item.id);img.src=imagePath(item,mode);img.alt=`${item.name} ${mode==='original'?'原始概念图':'网页实作预览'}`;});syncHeroImages(mode);$('#collection-label').textContent=categories[category];saveListState();},{kind:'swap'});
      if(request===modeRequest) button.parentElement.removeAttribute('aria-busy');
    });
  }));
  $('#reset').addEventListener('click',()=>{category='All';$('#search').value='';selectButton($('[data-cat="All"]'));enqueue(()=>animateChange(()=>{filterCards();saveListState();},{nameImages:true}));});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && current) {$('[data-back]').click();}
    if(event.key==='/' && !current && !event.metaKey && !event.ctrlKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {event.preventDefault();$('#search').focus();}
  });
  document.addEventListener('pointerover',event=>{const link=event.target.closest('[data-open]');if(link){const item=items.find(x=>x.id===Number(link.dataset.open));preload(imagePath(item,mode));}},{passive:true});
  addEventListener('hashchange',route);
  addEventListener('resize',()=>{activeTransition?.skipTransition();syncIndicators();});
  addEventListener('pagehide',()=>{if(!current) listScroll=scrollY;saveListState();});
  document.fonts.ready.then(syncIndicators);
  restoreListState();requestedMode=mode;filterCards();syncIndicators();
  if(routeId()) route();
  else if(listScroll && !location.hash) window.scrollTo({top:listScroll,behavior:'instant'});
  if(!reduced.matches && !routeId()) {document.body.classList.add('first-entry');setTimeout(()=>document.body.classList.remove('first-entry'),700);}
})();
