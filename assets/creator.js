(() => {
  'use strict';
  const core=window.AtlasCreatorCore,items=window.ATLAS;
  if(!core||!items)return;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arrow='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>';
  const key='atlas-project-v1';
  let selected=items[0],values={...core.defaults},stage=0,tabName='image',returnFocus=null,saveTimer,copyTimer,attachment=null,attachmentURL=null,previewMode='concept',request=null,uploadVersion=0,uploading=false;
  try {
    const saved=JSON.parse(localStorage.getItem(key));
    if(saved?.version===1){values=core.normalize(saved.values);selected=items.find(item=>item.id===saved.selectedId)||selected;}
  }catch{/* A fresh brief remains usable without storage. */}
  const dialog=document.createElement('dialog');
  dialog.id='creator';dialog.className='creator';dialog.setAttribute('aria-labelledby','creator-title');
  dialog.innerHTML=`<div class="creator-shell">
    <header class="creator-header"><div class="creator-brand"><span aria-hidden="true">✳</span><span>Style Atlas <b>创作台</b></span></div><nav class="creator-steps" aria-label="创作步骤"><button type="button" data-stage="0"><span>01</span> 选风格</button><i aria-hidden="true"></i><button type="button" data-stage="1"><span>02</span> 写需求</button><i aria-hidden="true"></i><button type="button" data-stage="2"><span>03</span> 交给 AI</button></nav><button type="button" class="creator-close" data-close aria-label="关闭创作台"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    <div class="creator-body">
      <aside class="creator-reference" aria-label="当前风格参考"><div class="reference-top"><span>你的视觉起点</span><button type="button" class="creator-quiet" data-change>更换风格 ↗</button></div>
        <div class="reference-art"><span class="reference-number" aria-hidden="true">01</span><div class="reference-back" aria-hidden="true"></div><figure class="reference-front"><div class="reference-browser" aria-hidden="true"><i></i><i></i><i></i><span>风格参考</span></div><img class="reference-image" alt="" width="1440" height="900"><figcaption class="reference-image-caption">概念设计图</figcaption></figure></div>
        <div class="reference-info"><div class="reference-name-row"><h2 class="reference-name"></h2><span class="reference-count"></span></div><p class="reference-style"></p><div class="reference-palette" aria-label="参考配色"></div><p class="reference-description"></p></div>
        <div class="reference-switch" role="group" aria-label="创作台参考图类型"><button type="button" data-preview="concept" aria-pressed="true">概念原图</button><button type="button" data-preview="website" aria-pressed="false">网页实作</button></div>
        <label class="reference-upload"><input type="file" id="creator-design" accept="image/png,image/jpeg,image/webp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/></svg><span class="upload-label">换成我生成的设计图</span><span class="upload-limit">PNG / JPG / WebP · 20 MB 内</span></label><div class="upload-feedback" role="status" aria-live="polite"></div><button type="button" class="creator-quiet remove-design" data-remove-design hidden>移除我的设计图</button>
        <p class="reference-footnote">参考图确定风格，文字与按钮交给代码。<br>刷新页面后，自己的设计图需重新添加。</p>
      </aside>
      <div class="creator-workspace">
        <section class="creator-panel" data-panel="0"><p class="creator-kicker">01 / 选一个视觉起点</p><h1 id="creator-title" tabindex="-1">喜欢的风格，<br>可以成为你的。</h1><p class="creator-description">从真实作品中选一种语言，再把它写进你的项目。</p><label class="creator-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" placeholder="试试：香氛、作品集、AI、像素" aria-label="搜索创作风格"></label><div class="creator-style-grid"></div><p class="creator-no-results" hidden>没有匹配的风格，试试「产品」或「极简」。</p><div class="creator-stage-footer"><p>已选 <strong class="selected-style-label"></strong></p><button type="button" class="creator-primary" data-continue>写我的项目需求 ${arrow}</button></div></section>
        <section class="creator-panel" data-panel="1" hidden><p class="creator-kicker">02 / 给灵感一个真实项目</p><h1 id="brief-title" tabindex="-1">好风格，<br>现在为你所用。</h1><p class="creator-description">告诉 AI 你要做什么。我们把风格、需求和实现要求整理好。</p>
          <form id="creator-form" novalidate><fieldset class="creator-kinds"><legend>你想做哪种网站？</legend>${['产品官网','作品集','内容博客','工具应用'].map((kind,i)=>`<button type="button" data-kind="${kind}" aria-pressed="${i===0}">${kind}</button>`).join('')}</fieldset>
          <div class="creator-field"><label for="project-name">项目 / 品牌名称 <span>必填</span></label><input id="project-name" name="name" required maxlength="120" placeholder="例如：拾光声学" autocomplete="organization" aria-describedby="name-error"><p class="field-error" id="name-error" hidden>给你的项目起一个名字。</p></div>
          <div class="creator-field"><label for="project-purpose">这个网站要做什么？ <span>必填</span></label><textarea id="project-purpose" name="purpose" required maxlength="2000" rows="3" placeholder="例如：为一款家用无线音箱做品牌官网，强调自然材质和温暖的居家体验。" aria-describedby="purpose-error"></textarea><p class="field-error" id="purpose-error" hidden>写一句网站用途，AI 才能围绕你的内容设计。</p></div>
          <div class="creator-field-pair"><div class="creator-field"><label for="project-action">希望访客做什么</label><input id="project-action" name="action" maxlength="120" placeholder="了解产品 / 预约咨询"></div><div class="creator-field"><label for="project-language">页面语言</label><select id="project-language" name="language"><option>中文</option><option>英文</option><option>中英双语</option></select></div></div>
          <details class="creator-more"><summary>再具体一点 <span>目标用户、页面内容与技术栈</span><i aria-hidden="true">＋</i></summary><div class="creator-more-content"><div class="creator-field"><label for="project-audience">网站面向谁</label><input id="project-audience" name="audience" maxlength="200" placeholder="例如：注重设计与生活品质的年轻家庭"></div><div class="creator-field"><label for="project-sections">希望包含的内容</label><textarea id="project-sections" name="sections" maxlength="2000" rows="2"></textarea></div><div class="creator-field"><label for="project-stack">前端技术</label><select id="project-stack" name="stack"><option value="html">HTML / CSS / JavaScript · 无需构建</option><option value="react">React · 适合继续开发</option></select></div></div></details>
          <fieldset class="creator-route"><legend>从哪里开始？</legend><label><input type="radio" name="route" value="new" checked><span><strong>从设计图开始</strong><small>先生图，再让 AI 写前端</small></span></label><label><input type="radio" name="route" value="reuse"><span><strong>从现有网页开始</strong><small>带走案例源码，让 AI 改成你的项目</small></span></label></fieldset>
          <div class="creator-form-bottom"><button type="button" class="creator-quiet" data-example>试填一份需求</button><span class="creator-save" role="status" aria-live="polite"></span></div><div class="creator-stage-footer"><button type="button" class="creator-quiet" data-stage="0">← 换个风格</button><button type="submit" class="creator-primary">生成我的创作包 ${arrow}</button></div></form>
        </section>
        <section class="creator-panel" data-panel="2" hidden><p class="creator-kicker">03 / 灵感已经有了下一步</p><h1 id="handoff-title" tabindex="-1"><span class="handoff-project"></span>，<br>可以开始了。</h1><p class="creator-description">按顺序把指令与图片交给 AI，一步步做出你的网页。</p><div class="handoff-summary"><span class="handoff-kind"></span><span class="handoff-language"></span><button type="button" data-stage="1">修改需求 ↗</button></div>
          <div class="handoff-tabs" role="tablist" aria-label="AI 创作步骤">${[['image','设计图'],['assets','拆素材'],['code','写前端'],['review','做检查']].map(([id,label],i)=>`<button type="button" role="tab" id="handoff-tab-${id}" data-prompt-tab="${id}" aria-controls="handoff-output" aria-selected="${i===0}" tabindex="${i===0?0:-1}"><span>0${i+1}</span>${label}</button>`).join('')}</div>
          <div class="handoff-step" role="tabpanel" id="handoff-output" aria-labelledby="handoff-tab-image"><div class="handoff-instruction"><span class="handoff-step-number" aria-hidden="true">01</span><div><h2 class="handoff-step-title"></h2><p class="handoff-step-copy"></p></div></div><div class="handoff-attachments"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2"/></svg><p class="handoff-attachment-copy"></p><a class="handoff-reference-link" download>下载参考图 ↗</a></div><div class="handoff-code"><div class="handoff-code-bar"><span class="handoff-filename"></span><button type="button" data-copy-current>复制本步指令 <span aria-hidden="true">⧉</span></button></div><pre class="handoff-prompt" tabindex="0" aria-label="当前步骤的完整指令"></pre></div></div>
          <div class="handoff-feedback" role="status" aria-live="polite"></div><div class="handoff-secondary"><a class="handoff-source" download>下载原案例 HTML ↗</a><button type="button" class="creator-quiet" data-download-brief>只下载项目简报 ↗</button></div><p class="handoff-note">无需在这里连接 AI 账号。复制指令后，在你常用的 AI 中粘贴，并附上对应图片。<br>参考素材用于学习，公开使用前请核对授权。</p><div class="handoff-download"><div><h3>把整套材料，一起带走。</h3><p class="handoff-package-description"></p></div><button type="button" class="creator-primary" data-download>下载完整材料包 <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/></svg></button></div>
        </section>
      </div>
    </div><div class="creator-announcement" role="status" aria-live="polite"></div></div>`;
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s),$$=s=>[...dialog.querySelectorAll(s)];
  const panels=$$('[data-panel]'),form=$('#creator-form'),workspace=$('.creator-workspace');
  const tabInfo={
    image:{number:'01',title:'先让风格，变成你的设计图。',copy:'发给支持参考图的生图 AI，挑选你满意的设计方向。',attachments:'一起附上：风格概念图。生成后，可在左侧换入你选定的新设计图。',file:'01-image-prompt.md'},
    assets:{number:'02',title:'把画面，拆成可用的素材。',copy:'发给生图 AI，为网页准备干净的背景、产品图与插画。',attachments:'一起附上：你选定的设计图。素材图中不包含文字、导航和按钮。',file:'02-assets-prompt.md'},
    code:{number:'03',title:'现在，交给编程 AI。',copy:'发给 Codex、Claude Code 或你常用的编程 AI，先做好首屏，再扩展整页。',attachments:'一起附上：项目简报、设计图、生成好的素材；复用路线还需附上原案例源码。',file:'03-development-prompt.md'},
    review:{number:'04',title:'让好看的页面，也好用。',copy:'发给编程 AI，对照设计图检查实际网页，修正最影响体验的差异。',attachments:'一起附上：可运行网页、选定设计图，以及需要修正的页面截图。',file:'04-review-prompt.md'}
  };
  const feedback=message=>{$('.handoff-feedback').textContent=message;};
  function uploadState(loading){uploading=loading;$('.reference-upload').setAttribute('aria-busy',String(loading));$('[data-download]').disabled=loading||!!request;}
  function copyState(message='复制本步指令',success=false){const button=$('[data-copy-current]');clearTimeout(copyTimer);button.innerHTML=`${message} <span aria-hidden="true">${success?'✓':'⧉'}</span>`;button.classList.toggle('is-copied',success);if(message!=='复制本步指令')copyTimer=setTimeout(()=>copyState(),2400);}
  function readValues(){for(const name of Object.keys(core.defaults)){const control=form.elements.namedItem(name);if(control)values[name]=control.value;}return core.normalize(values);}
  function fillForm(){for(const [name,value]of Object.entries(values)){const control=form.elements.namedItem(name);if(control)control.value=value;}$$('[data-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kind===values.kind)));}
  function save(){clearTimeout(saveTimer);values=readValues();try{localStorage.setItem(key,JSON.stringify({version:1,selectedId:selected.id,values}));$('.creator-save').textContent='草稿已保存在此浏览器';}catch{$('.creator-save').textContent='浏览器无法保存，请在离开前下载简报';}}
  function updateReference(){
    const own=previewMode==='concept'&&attachmentURL;
    const img=$('.reference-image');img.src=own|| (previewMode==='concept'?selected.original_webp:selected.preview);img.alt=own?'你上传的项目设计图':`${selected.name} · ${previewMode==='concept'?'概念原图':'网页实作截图'}`;
    $('.reference-image-caption').textContent=own?'你的项目设计图':previewMode==='concept'?'概念设计图':'真实网页截图';
    $('.reference-number').textContent=String(selected.id).padStart(2,'0');
    $('.reference-name').textContent=selected.name;$('.reference-style').textContent=selected.zh;
    $('.reference-count').textContent=`${String(selected.id).padStart(2,'0')} / 20`;
    $('.reference-description').textContent=selected.hero;
    $('.reference-palette').innerHTML=selected.colors.map(color=>`<span style="background:${color}" title="参考色 ${color}"></span>`).join('');
    $('.reference-back').style.backgroundImage=`url("${selected.preview}")`;
    $('.creator-reference').style.setProperty('--case-tone',selected.colors[1]);
    $('.selected-style-label').textContent=`${selected.name} · ${selected.zh}`;
    $$('[data-preview]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preview===previewMode)));
    $('.upload-label').textContent=attachment?attachment.name:'换成我生成的设计图';$('.remove-design').hidden=!attachment;
    if(stage===2)renderOutput();
  }
  function renderStyles(query=''){
    const needle=query.trim().toLocaleLowerCase();
    const matches=items.filter(item=>[item.name,item.zh,item.en,item.description,item.reuse,item.layout,...item.keywords].join(' ').toLocaleLowerCase().includes(needle));
    $('.creator-style-grid').innerHTML=matches.map(item=>`<button type="button" class="creator-style" data-select-style="${item.id}" aria-pressed="${selected.id===item.id}"><span class="creator-style-image"><img src="${item.preview}" width="1440" height="900" loading="lazy" alt="${esc(item.zh)}网页预览"><span class="style-check" aria-hidden="true">✓</span></span><span class="creator-style-label"><strong>${esc(item.name)}</strong><small>${esc(item.zh)}</small></span></button>`).join('');
    $('.creator-no-results').hidden=!!matches.length;
  }
  function validate(){
    values=readValues();let first=null;
    for(const name of ['name','purpose']){const control=form.elements.namedItem(name),error=$(`#${name}-error`);const invalid=!values[name];error.hidden=!invalid;control.setAttribute('aria-invalid',String(invalid));if(invalid&&!first)first=control;}
    first?.focus();return !first;
  }
  function renderOutput(){
    copyState();
    const docs=core.build(selected,readValues(),!!attachment),info=tabInfo[tabName];
    $('.handoff-project').textContent=docs.brief.name;
    $('.handoff-kind').textContent=docs.brief.kind;$('.handoff-language').textContent=docs.brief.language;
    $('.handoff-step-number').textContent=info.number;$('.handoff-step-title').textContent=info.title;$('.handoff-step-copy').textContent=info.copy;
    $('.handoff-attachment-copy').textContent=info.attachments;
    $('.handoff-filename').textContent=info.file;$('.handoff-prompt').textContent=docs[tabName];$('.handoff-prompt').scrollTop=0;
    $('.handoff-reference-link').href=attachmentURL||selected.original_webp;
    $('.handoff-reference-link').download=attachment?`my-design.${attachment.type==='image/png'?'png':attachment.type==='image/jpeg'?'jpg':'webp'}`:`${selected.name}-style-concept.webp`;
    $('.handoff-reference-link').textContent=attachment?'下载我的设计图 ↗':'下载参考图 ↗';
    $('.handoff-source').href=selected.site_file;
    $('.handoff-package-description').textContent=`项目简报、风格规则、4 步指令、2 张参考图${attachment?'、你的设计图':''}${docs.brief.route==='reuse'?'与原案例 HTML':''}。`;
    $$('[data-prompt-tab]').forEach(button=>{const active=button.dataset.promptTab===tabName;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#handoff-output').setAttribute('aria-labelledby',`handoff-tab-${tabName}`);
  }
  function setStage(next,focus=true){
    if(next===2&&!validate()){if(stage!==1){setStage(1,false);validate();}return;}
    stage=next;dialog.dataset.step=String(stage);
    $('.reference-footnote').innerHTML=stage===2?'参考图确定风格，文字与按钮交给代码。<br>刷新页面后，自己的设计图需重新添加。':'保留风格的规则，<br>写进你自己的内容。';
    dialog.setAttribute('aria-labelledby',['creator-title','brief-title','handoff-title'][stage]);
    panels.forEach((panel,index)=>panel.hidden=index!==stage);
    $$('[data-stage]').forEach(button=>{if(button.closest('.creator-steps')){button.setAttribute('aria-current',Number(button.dataset.stage)===stage?'step':'false');button.classList.toggle('is-complete',Number(button.dataset.stage)<stage);}});
    if(stage===0)renderStyles($('.creator-search input').value);
    if(stage===2)renderOutput();
    workspace.scrollTo({top:0,behavior:'instant'});
    $('.creator-body').scrollTo({top:0,behavior:'instant'});
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)panels[stage].animate([{opacity:.25,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.22,.8,.25,1)'});
    if(focus)panels[stage].querySelector('h1').focus({preventScroll:true});
  }
  function open(id){
    if(dialog.open)return;
    returnFocus=document.activeElement;
    if(id){selected=items.find(item=>item.id===Number(id))||selected;}
    fillForm();renderStyles();updateReference();
    document.documentElement.dataset.creating='true';
    dialog.showModal();setStage(id?1:0);save();
  }
  function close(){save();request?.abort();dialog.close();delete document.documentElement.dataset.creating;returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});}
  function clearAttachment(){uploadVersion++;uploadState(false);if(attachmentURL)URL.revokeObjectURL(attachmentURL);attachment=null;attachmentURL=null;$('#creator-design').value='';$('.upload-feedback').textContent='';updateReference();}
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  const safeName=name=>name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').slice(0,64)||'my-project';
  async function copyCurrent(){
    const text=core.build(selected,readValues(),!!attachment)[tabName],scrollTop=workspace.scrollTop,bodyTop=$('.creator-body').scrollTop;
    try {
      const input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';dialog.append(input);input.focus({preventScroll:true});input.select();
      let copied=false;try{copied=document.execCommand('copy');}finally{input.remove();}
      if(!copied){let timeout;try{await Promise.race([navigator.clipboard?.writeText(text)||Promise.reject(new Error('Unavailable')),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Clipboard timeout')),1800);})]);}finally{clearTimeout(timeout);}}
      $('[data-copy-current]').focus({preventScroll:true});
      feedback(`已复制「${tabInfo[tabName].title.replace(/[。，]/g,'')}」的完整指令。记得附上提示中的图片与材料。`);
      copyState('已复制指令',true);
    }catch{copyState('请手动复制');feedback('浏览器未允许复制。可选中下方指令手动复制，或下载完整材料包。');$('.handoff-prompt').focus({preventScroll:true});const range=document.createRange();range.selectNodeContents($('.handoff-prompt'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}
    finally{workspace.scrollTop=scrollTop;$('.creator-body').scrollTop=bodyTop;}
  }
  async function packageProject(){
    if(request||uploading)return;
    save();const item=selected,file=attachment,docs=core.build(item,values,!!file),button=$('[data-download]');
    const controller=new AbortController();request=controller;let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort();},15000);button.disabled=true;button.setAttribute('aria-busy','true');feedback('正在整理指令与参考图…');
    try{
      const load=async(path,label)=>{const response=await fetch(path,{signal:controller.signal});if(!response.ok)throw new Error(`${label}暂时无法下载`);return response.arrayBuffer();};
      const [concept,preview,source]=await Promise.all([load(item.original_webp,'概念参考图'),load(item.preview,'网页截图'),docs.brief.route==='reuse'?load(item.site_file,'案例源码'):Promise.resolve(null)]);
      const entries=[{name:'README.md',data:docs.readme},{name:'PROJECT.md',data:`# 项目简报\n\n${docs.context}\n\n制作路线：${docs.brief.route==='reuse'?'复用案例源码':'从设计图开始'}\n技术选择：${docs.brief.stack==='react'?'React':'HTML / CSS / JavaScript'}\n`},{name:'STYLE.md',data:`# ${item.name} · 风格规则\n\n${docs.style}\n\n这些规则提炼自原案例，应用时请使用项目自己的品牌、内容和素材。\n`},...Object.entries(tabInfo).map(([name,info])=>({name:info.file,data:docs[name]})),{name:'reference/style-concept.webp',data:concept},{name:'reference/website-preview.webp',data:preview}];
      if(file)entries.push({name:`reference/my-design.${file.type==='image/png'?'png':file.type==='image/jpeg'?'jpg':'webp'}`,data:await file.arrayBuffer()});
      if(source){
        const documentSource=new DOMParser().parseFromString(new TextDecoder().decode(source),'text/html');
        ['style-atlas-capsule','style-atlas-shroud','style-atlas-explain-styles','style-atlas-explain-js'].forEach(id=>documentSource.getElementById(id)?.remove());
        entries.push({name:'starter.html',data:'<!doctype html>\n'+documentSource.documentElement.outerHTML});
      }
      if(controller.signal.aborted)return;
      downloadBlob(core.zip(entries),`${safeName(docs.brief.name)}-创作包.zip`);
      feedback('材料包已准备好，下载已开始。解压后，从 README.md 的步骤开始。');
    }catch(error){if(timedOut)feedback('参考图加载超时，请检查网络后重试。你的需求仍保留，也可以先下载项目简报。');else if(error.name!=='AbortError')feedback('材料包未能下载，请重试。你的需求仍保留在创作台中。');}
    finally{clearTimeout(timeout);if(request===controller)request=null;button.disabled=uploading;button.removeAttribute('aria-busy');}
  }
  fillForm();renderStyles();updateReference();
  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-create]');if(trigger){event.preventDefault();open(trigger.dataset.create);}});
  dialog.addEventListener('click',event=>{
    const target=event.target;
    if(target.closest('[data-close]')){close();return;}
    if(target.closest('[data-change]')){setStage(0);return;}
    const step=target.closest('[data-stage]');if(step){setStage(Number(step.dataset.stage));return;}
    const choice=target.closest('[data-select-style]');if(choice){selected=items.find(item=>item.id===Number(choice.dataset.selectStyle));$$('[data-select-style]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.selectStyle)===selected.id)));updateReference();save();return;}
    if(target.closest('[data-continue]')){setStage(1);return;}
    const kind=target.closest('[data-kind]');if(kind){values.kind=kind.dataset.kind;const presets={'产品官网':['了解产品','首屏介绍、核心亮点、产品展示、常见问题、页脚'],'作品集':['联系合作','个人介绍、精选项目、创作过程、关于我、联系方式'],'内容博客':['阅读文章','首页导语、精选文章、内容分类、关于作者、订阅入口'],'工具应用':['开始使用','产品介绍、核心工具、使用流程、常见问题、页脚']};const old=core.defaults.action; if(Object.values(presets).some(([action])=>action===form.elements.action.value)||form.elements.action.value===old)form.elements.action.value=presets[values.kind][0];if(form.elements.sections.value===core.defaults.sections||Object.values(presets).some(([,sections])=>sections===form.elements.sections.value))form.elements.sections.value=presets[values.kind][1];$$('[data-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button===kind)));save();return;}
    if(target.closest('[data-example]')){values={...values,name:'拾光声学',purpose:'为一款家用无线音箱制作品牌官网，强调自然材质、温暖的居家体验与简洁易用的设计。',kind:'产品官网',audience:'注重设计与生活品质的年轻家庭',action:'了解音箱',sections:'品牌首屏、产品亮点、材质故事、聆听体验、常见问题、页脚'};fillForm();save();validate();return;}
    const preview=target.closest('[data-preview]');if(preview){previewMode=preview.dataset.preview;updateReference();return;}
    const prompt=target.closest('[data-prompt-tab]');if(prompt){tabName=prompt.dataset.promptTab;feedback('');renderOutput();return;}
    if(target.closest('[data-copy-current]')){copyCurrent();return;}
    if(target.closest('[data-download]')){packageProject();return;}
    if(target.closest('[data-download-brief]')){save();const docs=core.build(selected,values,!!attachment);downloadBlob(new Blob([`# ${docs.brief.name}\n\n${docs.context}\n\n${docs.style}`],{type:'text/markdown;charset=utf-8'}),`${safeName(values.name)}-项目简报.md`);feedback('项目简报下载已开始。');return;}
    if(target.closest('[data-remove-design]'))clearAttachment();
  });
  form.addEventListener('submit',event=>{event.preventDefault();if(validate()){save();tabName=values.route==='reuse'?'code':'image';feedback('');setStage(2);}});
  form.addEventListener('input',event=>{if(event.target.name==='name'||event.target.name==='purpose'){const invalid=!event.target.value.trim();event.target.setAttribute('aria-invalid',String(invalid));$(`#${event.target.name}-error`).hidden=!invalid;}$('.creator-save').textContent='正在保存…';clearTimeout(saveTimer);saveTimer=setTimeout(save,350);});
  form.addEventListener('change',save);
  $('.creator-search input').addEventListener('input',event=>renderStyles(event.target.value));
  $('#creator-design').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    const version=++uploadVersion;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){uploadState(false);$('.upload-feedback').textContent='请选择 20 MB 内的 PNG、JPG 或 WebP 图片。';event.target.value='';return;}
    const url=URL.createObjectURL(file),probe=new Image();let timeout;
    uploadState(true);
    $('.upload-feedback').textContent='正在读取设计图…';
    try{probe.src=url;await Promise.race([probe.decode(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Image timeout')),15000);})]);if(version!==uploadVersion){URL.revokeObjectURL(url);return;}if(attachmentURL)URL.revokeObjectURL(attachmentURL);attachment=file;attachmentURL=url;previewMode='concept';$('.upload-feedback').textContent='已加入设计图，下载材料包时会一并带走。';updateReference();}
    catch{URL.revokeObjectURL(url);if(version===uploadVersion){$('.upload-feedback').textContent='这张图片无法读取，请重新选择。';event.target.value='';}}
    finally{clearTimeout(timeout);if(version===uploadVersion)uploadState(false);}
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  document.addEventListener('keydown',event=>{
    if(!dialog.open)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
    if(event.target.closest('.handoff-tabs')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();const keys=Object.keys(tabInfo),index=keys.indexOf(tabName);tabName=event.key==='Home'?keys[0]:event.key==='End'?keys[3]:keys[(index+(event.key==='ArrowRight'?1:3))%4];renderOutput();$(`[data-prompt-tab="${tabName}"]`).focus();
    }
  },true);
  addEventListener('pagehide',()=>{if(dialog.open)save();});
})();
