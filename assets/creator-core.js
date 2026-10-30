/* Portable project briefs and a dependency-free ZIP writer. Shared by UI and checks. */
(() => {
  'use strict';
  const defaults = {name:'',purpose:'',kind:'产品官网',language:'中文',audience:'',action:'了解产品',sections:'首屏介绍、核心亮点、内容展示、常见问题、页脚',stack:'html',route:'new'};
  const fields=Object.keys(defaults);
  function normalize(value={}) {
    const result={...defaults};
    for(const key of fields) if(typeof value[key]==='string') result[key]=value[key].trim().slice(0,key==='purpose'||key==='sections'?2000:200);
    if(!['html','react'].includes(result.stack))result.stack='html';
    if(!['new','reuse'].includes(result.route))result.route='new';
    if(!['中文','英文','中英双语'].includes(result.language))result.language='中文';
    return result;
  }
  function build(item,values,hasDesign=false) {
    const brief=normalize(values);
    const audience=brief.audience||'根据项目用途推断，并明确说明你的假设';
    const context=`项目名称：${brief.name}\n网站类型：${brief.kind}\n网站用途：${brief.purpose}\n目标用户：${audience}\n页面语言：${brief.language}\n主要行动：${brief.action||'根据项目用途设计一个明确的主要行动'}\n页面内容：${brief.sections||'根据项目用途规划必要内容'}`;
    const style=`参考风格：${item.zh}（${item.en}）\n原案例构图（借鉴空间与主次关系）：${item.hero}\n原案例结构（按项目内容调整）：${item.layout}\n字体层级：${item.type}\n参考配色：${item.colors.join(' / ')}（来自概念图的近似参考色，可为对比度微调）\n原案例图像与材质：${item.assets}\n原案例的代码组件：${item.code}\n落地注意：${item.pitfall}\n应用原则：以上描述来自原案例。保留色彩、材质、排版与构图规律，将产品主体、业务场景、文案与功能替换为本项目所需；原案例中的音箱、目的地、任务等对象只是风格分析，不是本项目的必做内容。项目需求优先于原案例结构，不为模仿而添加无关模块。`;
    const refs=hasDesign?'附件 reference/my-design.* 是我选定的项目设计图，优先遵循；reference/style-concept.webp 是风格来源，reference/website-preview.webp 是原案例的实作截图。':'附件 reference/style-concept.webp 是风格参考，reference/website-preview.webp 是原案例的实作截图。请借鉴视觉规则，内容以我的项目需求为准。';
    const image=`请为下面的项目生成一张桌面网页概念设计图。\n\n${context}\n\n${style}\n\n${refs}\n\n设计要求：\n1. 将上述风格应用到我的项目；使用项目名称“${brief.name}”，不要沿用原案例 ${item.name} 的品牌与业务文案。\n2. 以 1440px 宽桌面为构图基准，呈现首屏和主要内容的连续页面设计。确保首屏有清楚的主角、标题和主要行动。\n3. 按页面语言安排简洁、可读的概念文案；图中文字只用于设计表达，后续由 HTML 重新制作。\n4. 保持一致的光影、材质、字体层级和留白，保留足够的文字排版空间。\n5. 输出直接的网页设计图，不要设备外壳、浏览器窗口、水印或额外展示背景。\n6. 图片不代表移动端或交互规范；这些在开发阶段单独设计。\n\n只输出设计图。`;
    const assets=`请依据附件中的选定设计图，为下面的网页制作可单独使用的视觉素材。\n\n${context}\n\n${style}\n\n${refs}\n\n先列出素材清单：每张的用途、建议比例、文件名和需要为文案留白的位置，再逐张生成。\n- 参考原案例的材质、光影与图像处理：${item.assets}\n- 素材主体必须服务我的项目“${brief.name}”与上述网站用途；不要照搬原案例的产品、人物或业务场景。\n- 首屏背景建议命名 hero.webp，内容配图命名 feature-01.webp 等；尺寸与比例按选定设计图确定，移动端必要时单独构图。\n- 保持同一产品或角色的外观、色彩和光照一致；参考图中被文字遮住的部分需要补全。\n- 背景与产品素材中不包含导航、标题、按钮、卡片文案、表单或水印，这些由代码实现。\n- 装饰插画需要时提供透明背景；不要将整张网页截图作为背景素材。\n- 如果尚未提供我选定的新设计图，先说明需要这张图，待提供后再制作素材。\n\n素材输出到 assets/，同时给出一份文件名与用途对应表。`;
    const implementation=brief.stack==='react'?'使用 React 与 CSS；已有项目中遵循现有框架、组件约定和依赖，不随意重建工程。新项目提供完整文件与运行命令。':'使用语义化 HTML、CSS 和必要的原生 JavaScript，无构建依赖；交付 index.html、styles.css、script.js 和 assets/，可以通过本地 HTTP 服务运行。';
    const code=`请将我的项目需求、选定设计图和视觉素材实现为可运行的前端网页。\n\n${context}\n\n${style}\n\n${refs}\n${brief.route==='reuse'?'材料包中的 starter.html 是原案例源码，请以它为起点，先梳理结构，再替换为我的项目内容与素材。原案例不是我的项目成品。':'从我的需求与设计图建立页面，不直接复制原案例的业务内容。'}\n\n技术要求：${implementation}\n\n按以下顺序完成：\n1. 先检查附件与素材清单，简要说明实现计划及未确定之处。缺少素材时明确列出，不编造已收到的图片，不使用失效或无关图片地址。\n2. 先实现首屏，在浏览器中对照选定设计图检查构图、主视觉、字体层级、留白与图片裁切，再扩展其余区块。\n3. 标题、导航、按钮、表单、卡片文案和数据使用可编辑 DOM；图片只承担视觉素材，避免图片内外出现重复文字和按钮。\n4. 桌面参考 1440px，平板参考 768px，手机参考 390px；移动端重新组织布局，不能把桌面等比缩小。避免水平溢出。\n5. 主要行动“${brief.action||'根据项目用途确定'}”须有明确结果；导航、菜单、表单有可观察反馈。未接后端的操作准确说明状态，不伪造提交、支付或生成成功。\n6. 提供可见键盘焦点、语义标签与足够对比度；动效遵循 prefers-reduced-motion，不能阻挡阅读和操作。\n7. 实际运行后检查控制台、素材路径、手机布局、键盘操作与主要流程；报告已验证和未验证的部分。\n\n交付全部必要文件、启动说明和剩余事项。`;
    const review=`请在实际浏览器中检查我的网页，对照选定设计图和以下需求完成一轮修正。\n\n${context}\n\n${style}\n\n${refs}\n\n检查顺序：\n1. 主流程：从真实入口完成主要行动，检查等待、成功、失败状态；有保存的数据检查刷新读回。\n2. 视觉：在相同桌面视口对照构图、图像裁切、字体层级、色彩与留白。先列出影响最大的三个差异，再逐项修正。\n3. 响应式：检查 390px、768px、1440px；文字不重叠、不裁切，无横向溢出，手机导航和表单能用。\n4. 素材与可用性：图片无破损，正文可读，键盘可完成主要操作，减少动态效果时内容可见。\n5. 内容：替换残留原案例品牌；去除占位文案、重复标题和不真实的业务承诺。\n\n只报告实际观察到的问题。修正后重新验证受影响的流程，附截图及尚未解决的限制；没有运行环境时说明，不声称测试通过。`;
    const readme=`# ${brief.name} · AI 网页创作包\n\n${context}\n\n## 如何使用\n\n${brief.route==='reuse'?'你选择了复用源码路线，可以直接从第 3 步开始，将 starter.html 交给编程 AI 改写；需要新视觉时再完成前两步。\n\n':''}1. 将 01-image-prompt.md 和 reference/style-concept.webp 发给支持参考图片的生图 AI，选定一张自己的网页设计图。\n2. 将选定设计图与 02-assets-prompt.md 发给生图 AI，生成干净的背景、产品图或插画。概念设计图不等于已拆好的素材。\n3. 将 03-development-prompt.md、PROJECT.md、STYLE.md、选定设计图与素材文件一起交给编程 AI。${brief.route==='reuse'?'同时附上 starter.html 作为改写起点。':''}\n4. 运行网页，把 04-review-prompt.md 与需要修正的截图交给编程 AI，检查并迭代。\n\n${hasDesign?'你上传的设计图在 reference/my-design.* 中。':'本包提供原案例风格参考图；请另附你最终选定的新设计图，或明确要求以原图为设计方向。'}\n\n## 文件说明\n\n- PROJECT.md：你的项目需求\n- STYLE.md：当前案例的视觉规则\n- 01–04：分步提示词\n- reference/style-concept.webp：AI 概念参考图\n- reference/website-preview.webp：原案例的真实网页截图\n${brief.route==='reuse'?'- starter.html：原案例源码，需由 AI 改为你的项目\n':''}\n本网站只整理指令与材料，不会自动调用外部 AI。你可以将 Markdown 内容直接粘贴到 AI 对话中，并单独上传图片。\n\n参考图片与源码用于学习；公开使用前请核对图片、字体和第三方素材授权。案例英文生图 Prompt 是依据原始概念图反向撰写的学习参考，并非最初输入原文。\n`;
    return {brief,context,style,image,assets,code,review,readme};
  }
  const encoder=new TextEncoder();
  const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
  function zip(entries) {
    const parts=[],directory=[];let offset=0,centralSize=0;
    const stamp=new Date(),dosTime=(stamp.getHours()<<11)|(stamp.getMinutes()<<5)|(stamp.getSeconds()>>1),dosDate=((Math.max(1980,stamp.getFullYear())-1980)<<9)|((stamp.getMonth()+1)<<5)|stamp.getDate();
    const seen=new Set();
    for(const entry of entries) {
      if(!entry.name || entry.name.startsWith('/') || entry.name.includes('\\') || entry.name.split('/').some(s=>s==='..'||s==='.') || seen.has(entry.name))throw new Error('Invalid ZIP path');
      seen.add(entry.name);
      const name=encoder.encode(entry.name),data=typeof entry.data==='string'?encoder.encode(entry.data):new Uint8Array(entry.data);
      const crc=crc32(data),header=new Uint8Array(30+name.length),view=new DataView(header.buffer);
      view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(10,dosTime,true);view.setUint16(12,dosDate,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);
      const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
      cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(12,dosTime,true);cv.setUint16(14,dosDate,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
      parts.push(header,data);directory.push(central);offset+=header.length+data.length;centralSize+=central.length;
    }
    const end=new Uint8Array(22),ev=new DataView(end.buffer);
    ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
    return new Blob([...parts,...directory,end],{type:'application/zip'});
  }
  window.AtlasCreatorCore=Object.freeze({defaults,normalize,build,zip});
})();
