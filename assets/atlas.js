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
  let immersiveState=null, studyReturnFocus=null, dockFrame;
  let searchTimer, routedFromGallery = false, pendingAnchor = null, backRequested = false;
  let modeRequest = 0, requestedMode = mode, detailModeRequest = 0, requestedDetailMode = detailMode;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const imagePath = (item, type) => type === 'original' ? item.original_webp : item.preview;
  const number = id => String(id).padStart(2, '0');
  const tags = item => item.keywords.map(k => `<span>${escape(k)}</span>`).join('');
  const visibleItems = () => items.filter(item => {
    const query = $('#search').value.trim().toLocaleLowerCase();
    return (category === 'All' || item.category === category) && [item.name,item.zh,item.en,item.description,item.reuse,item.layout,item.assets,item.code,...item.keywords].join(' ').toLocaleLowerCase().includes(query);
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
    const duration=[16,20,18,22,19][column], delay=[-4,-11,-6,-15,-8][column];
    return `<div class="wall-column" data-direction="${column%2?'down':'up'}"><div class="wall-track" style="--duration:${duration}s;--delay:${delay}s"><div class="wall-set">${ids.map((id,row)=>wallTile(id,row*5+column)).join('')}</div><div class="wall-set wall-repeat">${ids.map((id,row)=>wallTile(id,row*5+column,true)).join('')}</div></div></div>`;
  }).join('');
  function syncHeroImages(type) {
    $$('[data-hero-image]').forEach(img=>{const item=items.find(x=>x.id===Number(img.dataset.heroImage));img.src=imagePath(item,type);img.alt=`${item.name} ${type==='original'?'原始概念图':'网页实作预览'}`;});
  }
  const cardFor = id => $(`.atlas-card[data-open="${id}"]`);
  const originImage = () => origin?.closest('.process-art') ? $('.process-implementation img',origin.closest('.process-art')) : (origin ? $('img',origin) : null);
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
    if (reduced.matches) {await change();clearNames();return;}
    if (document.startViewTransition) {
      const transition = document.startViewTransition(async () => {
        await change();
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
    const clone = rect && (source.matches('.detail-media') ? $('#detail-image',source) : source).cloneNode(true);
    if (clone) {
      clone.removeAttribute('data-image');clone.removeAttribute('id');
      Object.assign(clone.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,maxWidth:'none',margin:'0',objectFit:'cover',objectPosition:'top',zIndex:'999',pointerEvents:'none',borderRadius:'6px',opacity:'1',transition:'none'});
      document.body.append(clone);
    }
    await change();
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
    detail.innerHTML = `<div class="detail-top"><button class="back" data-back><span aria-hidden="true">←</span> 返回风格图鉴</button><span class="detail-counter">${categories[item.category]} <span aria-hidden="true"> / </span> ${number(item.id)} / 20</span></div><div class="detail-intro"><div class="detail-identity"><h1>${escape(item.name)}<span class="accent">.</span></h1><div><p class="detail-description">${escape(item.description)}</p><p class="detail-en" lang="en">${escape(item.en)}</p></div></div><div class="detail-title-actions"><button type="button" class="button detail-create" data-create="${item.id}">用这个风格创作 <span aria-hidden="true">↗</span></button><a class="detail-live-link" href="${escape(item.site_file)}" target="_blank" rel="noopener">新页签体验 ↗</a></div></div><div class="media-tools"><div class="segmented" role="group" aria-label="详情展示方式"><span class="segment-indicator" aria-hidden="true"></span><button data-detail-mode="preview" class="${detailMode === 'preview' ? 'active' : ''}" aria-pressed="${detailMode === 'preview'}">网页实作</button><button data-detail-mode="original" class="${detailMode === 'original' ? 'active' : ''}" aria-pressed="${detailMode === 'original'}">概念原图</button></div><div class="media-actions"><button class="immersive-open" data-immersive-open type="button" ${detailMode === 'preview' ? '' : 'hidden'}>沉浸体验 <span aria-hidden="true">⛶</span></button><a id="full-image" href="${detailMode === 'original' ? item.original : item.preview}" target="_blank" rel="noopener">查看完整图片 ↗</a></div></div><div class="detail-media" data-mode="${detailMode}"><div class="immersive-bar" hidden><button type="button" data-immersive-close>← 退出沉浸</button><span>${escape(item.name)}</span><div class="immersive-actions"><button type="button" data-immersive-study aria-haspopup="dialog" aria-expanded="false">风格拆解</button><a href="${escape(item.site_file)}" target="_blank" rel="noopener">新页签 ↗</a></div></div><button class="immersive-shade" type="button" aria-label="关闭风格拆解" tabindex="-1" hidden></button><aside class="immersive-study" role="dialog" aria-modal="true" aria-labelledby="immersive-study-title" hidden><div class="immersive-study-head"><h2 id="immersive-study-title">${escape(item.name)} · 风格拆解</h2><button type="button" data-study-close aria-label="关闭风格拆解">关闭 ×</button></div><div class="immersive-study-body"></div></aside><img id="detail-image" src="${imagePath(item,detailMode)}" width="1440" height="900" alt="${escape(item.name)} ${detailMode === 'original' ? '原始概念图' : '网页实作预览'}"><iframe class="detail-frame" title="${escape(item.name)} 可交互网页" data-src="${escape(item.site_file)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" hidden></iframe><div class="frame-status" role="status" hidden><span>正在打开真实网页…</span><button type="button" data-retry-frame hidden>重新加载</button></div></div><p class="image-note">${detailMode === 'preview' ? '网页内可直接点击、滚动体验；下方查看设计拆解，或用这个风格开始创作。' : '概念原图 · 下方查看设计拆解，或用这个风格开始创作。'}</p><section class="study-grid"><div><h2>这套风格，好在哪里？</h2><p class="lead">${escape(item.hero)}</p>${[['布局结构',item.layout],['字体与层级',item.type],['图像素材',item.assets],['网页组件',item.code]].map(([title,body])=>`<div class="anatomy-row"><h3>${title}</h3><p>${escape(body)}</p></div>`).join('')}</div><aside class="detail-aside"><section><h3>视觉关键词</h3><div class="tags">${tags(item)}</div></section><section><h3>色彩参考 <span class="eyebrow">/ 点击复制</span></h3><div class="palette">${item.colors.map(color=>`<button class="color-button" data-color="${escape(color)}" aria-label="复制色值 ${escape(color)}"><span class="swatch" style="background:${escape(color)}"></span><code>${escape(color)}</code></button>`).join('')}</div><p style="margin-top:12px">从概念图提炼的近似配色。</p></section><section><h3>适合用在哪里</h3><p>${escape(item.reuse)}</p></section><section class="pitfall"><h3>落地时，留意这一点</h3><p>${escape(item.pitfall)}</p></section></aside></section><section class="prompt-section"><div class="detail-create-callout"><div><h2>让喜欢的风格，<br>成为你的下一页。</h2><p>把 ${escape(item.name)} 的视觉语言用到你的项目。填一份简短需求，带走生图、素材、开发与检查指令。</p><div class="detail-create-path"><span>01 选定风格</span><i aria-hidden="true">→</i><span>02 写需求</span><i aria-hidden="true">→</i><span>03 交给 AI</span></div></div><button type="button" class="button" data-create="${item.id}">用这个风格开始 <span aria-hidden="true">↗</span></button></div><details class="detail-original-prompt"><summary>查看原案例的生图参考 Prompt</summary><p class="prompt-note">根据原始概念图反向重构的学习提示词，并非最初输入模型的原文。用于继续生图，生成网页请使用创作台中的开发指令。</p><div class="prompt-header"><div class="prompt-actions"><button class="button secondary" data-copy-prompt>复制案例生图 Prompt</button><a class="button secondary" href="${escape(item.prompt_file)}" download>下载参考 Markdown</a></div></div><pre class="prompt-box" id="prompt" lang="en">${escape(item.prompt)}</pre></details></section><nav class="detail-bottom" aria-label="案例翻页"><button data-next="${previous?.id || ''}" ${previous ? '' : 'disabled'}>← ${previous ? `上一例 · ${escape(previous.name)}` : '已是第一例'}</button><button data-next="${next?.id || ''}" ${next ? '' : 'disabled'}>${next ? `下一例 · ${escape(next.name)}` : '已是最后一例'} →</button></nav><nav class="detail-dock" aria-label="快捷浏览案例" hidden><button type="button" data-back aria-label="返回风格图鉴">←<span> 返回</span></button><span class="dock-name">${escape(item.name)}</span><button type="button" data-next="${previous?.id || ''}" ${previous ? '' : 'disabled'} aria-label="${previous ? `上一例 ${escape(previous.name)}` : '已是第一例'}">上一例</button><button type="button" data-next="${next?.id || ''}" ${next ? '' : 'disabled'} aria-label="${next ? `下一例 ${escape(next.name)}` : '已是最后一例'}">下一例</button><button class="dock-copy" type="button" data-create="${item.id}">用这个风格</button></nav>`;
    syncIndicators();
  }
  function setImmersiveStudy(open,restoreFocus=true) {
    const panel=$('.immersive-study');if(!panel)return;
    if(open && immersiveState) {
    const study=$('.study-grid',detail).cloneNode(true), prompt=$('.prompt-section',detail).cloneNode(true);
    study.className='immersive-study-grid';prompt.className='immersive-study-prompt';
    [study,prompt].forEach(node=>{node.removeAttribute('inert');node.querySelectorAll('[inert]').forEach(el=>el.removeAttribute('inert'));});
    prompt.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    $('.immersive-study-body').append(study,prompt);
      studyReturnFocus=document.activeElement;panel.hidden=false;panel.scrollTo({top:0,behavior:'instant'});$('.immersive-shade').hidden=false;
      $('.detail-frame').inert=true;$('.immersive-bar').inert=true;
      $('[data-immersive-study]').setAttribute('aria-expanded','true');
      $('[data-study-close]').focus({preventScroll:true});
    } else {
      panel.hidden=true;$('.immersive-shade').hidden=true;$('.immersive-study-body').replaceChildren();panel.scrollTop=0;
      $('.detail-frame').inert=false;$('.immersive-bar').inert=false;
      $('[data-immersive-study]').setAttribute('aria-expanded','false');
      if(restoreFocus && studyReturnFocus?.isConnected)studyReturnFocus.focus({preventScroll:true});
      studyReturnFocus=null;
    }
  }
  function syncDetailDock() {
    cancelAnimationFrame(dockFrame);
    dockFrame=requestAnimationFrame(()=>{
      const dock=$('.detail-dock');if(!dock)return;
      dock.hidden=!current || detail.hidden || !!immersiveState || !!document.documentElement.dataset.transitioning || $('.detail-intro').getBoundingClientRect().bottom>=0 || $('.detail-bottom').getBoundingClientRect().top<innerHeight;
    });
  }
  addEventListener('scroll',syncDetailDock,{passive:true});
  function setImmersive(open,restoreFocus=true) {
    const media=$('.detail-media');if(!media)return;
    if(open) {
      if(immersiveState || detailMode!=='preview')return;
      const targets=[...detail.children].filter(el=>el!==media).concat([...document.body.children].filter(el=>el!==detail && el.id!=='toast' && !el.contains(detail) && !/SCRIPT|STYLE/.test(el.tagName)));
      immersiveState={focus:document.activeElement,scroll:scrollY,overflow:document.body.style.overflow,targets:targets.map(el=>[el,el.inert])};
      targets.forEach(el=>el.inert=true);
      document.body.style.overflow='hidden';media.dataset.immersive='true';
      media.setAttribute('role','dialog');media.setAttribute('aria-modal','true');media.setAttribute('aria-label',`${current.name} 沉浸体验`);
      $('.immersive-bar',media).hidden=false;
      $('[data-immersive-close]',media).focus({preventScroll:true});
    } else if(immersiveState) {
      setImmersiveStudy(false,false);
      const state=immersiveState;immersiveState=null;
      delete media.dataset.immersive;media.removeAttribute('role');media.removeAttribute('aria-modal');media.removeAttribute('aria-label');
      $('.immersive-bar',media).hidden=true;
      state.targets.forEach(([el,inert])=>el.inert=inert);
      document.body.style.overflow=state.overflow;
      scrollTo({top:state.scroll,behavior:'instant'});
      if(restoreFocus && state.focus?.isConnected)state.focus.focus({preventScroll:true});
    }
    syncDetailDock();
  }
  function configureEmbeddedPage(frame,doc) {
    doc.documentElement.dataset.atlasEmbedded='true';
    if(!doc.getElementById('atlas-embed-style')) {
      const style=doc.createElement('style');style.id='atlas-embed-style';
      style.textContent='#style-atlas-capsule,#style-atlas-shroud{display:none!important}';doc.head.append(style);
    }
    doc.addEventListener('keydown',event=>{
      if(!immersiveState)return;
      if(event.key==='Escape') {
        const hasDialog=doc.body.classList.contains('lock') || [...doc.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')].some(el=>el.getBoundingClientRect().height>0 && frame.contentWindow.getComputedStyle(el).visibility!=='hidden');
        if(hasDialog || event.defaultPrevented)return;
        event.preventDefault();setImmersive(false);
      } else if(event.key==='Tab' && !event.shiftKey) {
        const focusable=[...doc.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled && el.tabIndex>=0 && el.getBoundingClientRect().height>0 && frame.contentWindow.getComputedStyle(el).visibility!=='hidden');
        if(!focusable.length || doc.activeElement===focusable.at(-1)){event.preventDefault();$('[data-immersive-close]').focus();}
      }
    },true);
  }
  const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
  function revealDetailFrame(frame) {
    if(!frame?.isConnected || frame.dataset.ready!=='true')return;
    frame.closest('.detail-media').dataset.live='ready';
    $('.frame-status',frame.parentElement).hidden=true;
  }
  function activateDetailFrame(deferReveal=false) {
    const media=$('.detail-media'), frame=$('.detail-frame');
    if(!frame || detailMode!=='preview')return Promise.resolve();
    frame.hidden=false;
    if(!frame.readyPromise) {
      const status=$('.frame-status',media), label=$('span',status), retry=$('button',status);
      status.hidden=false;retry.hidden=true;label.textContent='正在打开真实网页…';
      const timer=setTimeout(()=>{
        if(!frame.isConnected)return;
        label.textContent='网页加载较慢，可重试或在新页签体验。';retry.hidden=false;
      },12000);
      frame.readyPromise=new Promise(resolve=>{
        frame.onload=async()=>{
          const doc=frame.contentDocument;
          if(!doc || doc.URL==='about:blank')return;
          configureEmbeddedPage(frame,doc);
          await Promise.race([Promise.all([doc.fonts?.ready,...[...doc.images].slice(0,6).map(img=>img.decode().catch(()=>{}))]),wait(800)]);
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          clearTimeout(timer);
          if(!frame.isConnected)return;
          frame.dataset.ready='true';resolve();
        };
        frame.dataset.started='true';frame.src=frame.dataset.src;
      });
    }
    if(!deferReveal)frame.readyPromise.then(()=>revealDetailFrame(frame));
    return frame.readyPromise;
  }
  async function prepareLiveDestination() {
    if(detailMode!=='preview')return;
    const frame=$('.detail-frame');
    await Promise.race([activateDetailFrame(true),wait(1100)]);
    if(frame.dataset.ready!=='true')frame.closest('.detail-media').dataset.cold='true';
    revealDetailFrame(frame);
  }
  // Warm only deliberate hover/focus targets, without running 20 live pages.
  const warmed=new Set();let warmTimer;
  function warmTarget(event) {
    const link=event.target.closest('[data-open]');
    if(!link || mode!=='preview' || navigator.connection?.saveData)return;
    clearTimeout(warmTimer);
    warmTimer=setTimeout(()=>{
      const item=items.find(x=>String(x.id)===link.dataset.open);
      if(!item || warmed.has(item.id) || warmed.size>=3)return;
      warmed.add(item.id);fetch(item.site_file,{cache:'force-cache'}).catch(()=>warmed.delete(item.id));
    },120);
  }
  document.addEventListener('pointerover',warmTarget);
  document.addEventListener('focusin',warmTarget);
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
    if(immersiveState)setImmersive(false,false);
    const request = ++sequence, id=routeId(), item=items.find(x=>x.id===id);
    if(current?.id!==id){clearTimeout(toastTimer);$('#toast').classList.remove('visible');}
    if (id && !item) {history.replaceState(null,'',location.pathname+location.search+'#collection');toast('这个案例不存在，已返回图鉴。');}
    if (item) await preload(imagePath(item, current ? detailMode : mode));
    if (request!==sequence) return;
    await enqueue(async()=>{
      if (request!==sequence) return;
      if (item && current?.id === item.id) return;
      if (item) {
        const fromList=!current;
        const source = fromList ? (origin?.dataset.open === String(item.id) ? originImage() : cardImage(item.id)) : $('.detail-media');
        if(fromList) {
          listScroll=window.scrollY;detailMode=mode;saveListState();
          document.documentElement.dataset.preparing='true';
          const loadingOrigin=origin;loadingOrigin?.setAttribute('aria-busy','true');
          renderDetail(item);detail.classList.add('detail-preparing');detail.inert=true;
          await prepareLiveDestination();
          loadingOrigin?.removeAttribute('aria-busy');delete document.documentElement.dataset.preparing;
          if(request!==sequence){detail.classList.remove('detail-preparing');detail.inert=false;detail.hidden=true;return;}
        }
        await animateChange(async()=>{
          current=item;if(!fromList)renderDetail(item);detail.classList.remove('detail-preparing');detail.inert=false;gallery.dispatchEvent(new Event('atlas:conceal'));gallery.hidden=true;detail.hidden=false;
          window.scrollTo({top:0,behavior:'instant'});document.title=`${item.name} · ${item.zh} — Style Atlas`;
          if(!fromList)await prepareLiveDestination();
        },{kind:'open',source:source && source.getBoundingClientRect().bottom>0 && source.getBoundingClientRect().top<innerHeight ? source : null,destination:()=>$('.detail-media')});
        activateDetailFrame();
        detail.focus({preventScroll:true});
      } else if(current) {
        const closing=current;
        // Restore the listing image to exactly the same content before shrinking.
        cardImage(closing.id).src=imagePath(closing,detailMode);
        const source=$('.detail-media');
        const sourceRect=source.getBoundingClientRect();
        if(sourceRect.bottom<0 || sourceRect.top>innerHeight) source.scrollIntoView({block:'center',behavior:'instant'});
        const returnImage = origin?.dataset.open === String(closing.id) ? originImage() : cardImage(closing.id);
        returnImage.src=imagePath(closing,detailMode);
        await animateChange(()=>{
          detail.hidden=true;gallery.hidden=false;current=null;$('.detail-frame')?.remove();
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
      syncIndicators();syncDetailDock();backRequested=false;
    });
  }
  document.addEventListener('click',event=>{
    const navigation=event.target.closest('.nav-link');
    if(navigation && current) pendingAnchor=navigation.getAttribute('href');
    const open=event.target.closest('[data-open]');
    if(open && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button===0) {
      event.preventDefault();origin=open;routedFromGallery=true;location.hash=`case/${open.dataset.open}`;return;
    }
    if(event.target.closest('[data-immersive-study]')){setImmersiveStudy(true);return;}
    if(event.target.closest('[data-study-close],.immersive-shade')){setImmersiveStudy(false);return;}
    if(event.target.closest('[data-immersive-open]')){setImmersive(true);return;}
    if(event.target.closest('[data-immersive-close]')){setImmersive(false);return;}
    const back=event.target.closest('[data-back]');
    if(back) {if(backRequested || !current) return;backRequested=true;if(routedFromGallery) history.back();else location.hash='collection';return;}
    const next=event.target.closest('[data-next]');
    if(next?.dataset.next) {history.replaceState(null,'',`#case/${next.dataset.next}`);route();return;}
    const color=event.target.closest('[data-color]');
    if(color) copy(color.dataset.color,`已复制色值 ${color.dataset.color}`);
    if(event.target.closest('[data-copy-prompt]') && current) copy(current.prompt,`已复制 ${current.name} 的 Prompt`);
    if(event.target.closest('[data-retry-frame]')){$('.detail-frame').readyPromise=null;delete $('.detail-frame').dataset.ready;activateDetailFrame();}
    const detailButton=event.target.closest('[data-detail-mode]');
    if(detailButton && detailButton.dataset.detailMode!==requestedDetailMode) {
      const desired=detailButton.dataset.detailMode, item=current, request=++detailModeRequest;
      requestedDetailMode=desired;selectButton(detailButton);detailButton.parentElement.setAttribute('aria-busy','true');
      preload(imagePath(item,desired)).then(()=>enqueue(async()=>{
        if(current!==item || request!==detailModeRequest) return;
        await animateChange(async()=>{detailMode=desired;$('.image-note').textContent=desired==='preview'?'网页内可直接点击、滚动体验；下方查看设计拆解，或用这个风格开始创作。':'概念原图 · 下方查看设计拆解，或用这个风格开始创作。';$('[data-immersive-open]').hidden=desired!=='preview';$('.detail-media').dataset.mode=desired;$('.detail-frame').hidden=desired!=='preview';const img=$('#detail-image');img.src=imagePath(item,desired);img.alt=`${item.name} ${desired==='original'?'原始概念图':'网页实作预览'}`;$('#full-image').href=desired==='original'?item.original:item.preview;selectButton(detailButton);await prepareLiveDestination();},{kind:'swap'});
        activateDetailFrame();
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
    if(event.defaultPrevented)return;
    if(immersiveState) {
      const panel=$('.immersive-study');
      if(!panel.hidden) {
        if(event.key==='Escape'){event.preventDefault();setImmersiveStudy(false);}
        if(event.key==='Tab') {
          const nodes=[...panel.querySelectorAll('button,a[href],[tabindex="0"]')].filter(el=>!el.disabled && el.getBoundingClientRect().height>0);
          const first=nodes[0],last=nodes.at(-1);
          if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
        }
        return;
      }
      if(event.key==='Escape'){event.preventDefault();setImmersive(false);return;}
      if(event.key==='Tab' && event.shiftKey && document.activeElement===$('[data-immersive-close]')) {
        event.preventDefault();$('.detail-frame').focus();
      }
      return;
    }
    if(event.key==='Escape' && current && !$('.theme-picker').open) {$('[data-back]').click();}
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
