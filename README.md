# Style Atlas · 20 种网页视觉风格图鉴

在线访问：https://pursuerlin.github.io/web-style-atlas/

GitHub 仓库：https://github.com/pursuerlin/web-style-atlas

## 在线版交互

- 首页和每个案例均可进入「创作台」，从选风格、写需求到交给 AI 连续完成。
- 填写品牌、用途、主要行动和页面语言，按需补充目标用户、页面内容、HTML / React 技术选择。文字草稿与当前风格自动保存在此浏览器。
- 创作台提供设计图、拆素材、写前端、做检查四步个性化指令，可复制或下载 ZIP；选择「从现有网页开始」可同时带走案例源码。
- 可以加入自己生成的 PNG / JPG / WebP 设计图（20 MB 内），与简报、提示词和两张参考图一起打包。自己的图片只在当前页面内存中保留，刷新后需重新加入。
- 支持分类、关键词搜索、概念原图 / 网页实作切换。
- 点击列表图片放大进入详情；返回时缩回对应图片并恢复滚动位置，支持浏览器前进后退与 Escape。
- 原生 View Transitions 优先；不支持时使用 Web Animations 图片共享动画；系统开启“减少动态效果”时直接切换。
- 详情使用 `#case/1` 形式，可分享和刷新，不依赖服务器路由。
- 搜索、分类、图片类型会话内保留；详情可复制 Prompt 与色值、下载 Markdown、打开独立网页。

## 本地预览与发布

```sh
python3 -m http.server 4173
# 浏览器打开 http://localhost:4173
node scripts/check-site.mjs
node scripts/check-creator.mjs
node --check assets/atlas.js
node --check assets/creator.js
node --check assets/creator-core.js
```

纯静态 HTML / CSS / JavaScript，无构建依赖。GitHub Actions 在推送 `main` 后先检查 JS 语法、20 个案例资源与创作包指令，再自动部署 GitHub Pages。发布只打包网页和素材，不包含本地截图、检查录屏和设计过程。

`assets/` 为图鉴界面的样式、交互与内容数据；`DESIGN.md` 为设计与交互约定。

---

本合集中每个风格均包含：① 最初 AI 概念图（原始 PNG）② 最新精修 HTML ③ 浏览器真实预览 ④ 从设计图反向重构的英文生图 Prompt ⑤ 风格、排版、布局和可复用组件解析。

## 如何使用

1. 通过上面的本地 HTTP 服务或在线地址打开图鉴，筛选风格，体验真实网页与设计拆解。材料包下载需要 HTTP 服务。
2. 点击「用这个风格创作」，填写自己的项目需求，再生成创作包。
3. 按四步指令将参考图、需求、设计图与素材交给你常用的 AI。网站负责整理材料，不会自动调用外部 AI，也不需要在这里输入 API Key。
4. 想快速改写已有网页时，选择「从现有网页开始」，将包内 `starter.html` 与开发指令一起交给编程 AI。源码已去掉图鉴学习浮层；项目内容和素材仍需替换。
5. 原案例英文生图 Prompt 保留在详情的折叠区，供学习原图风格；每个独立 HTML 右下角仍保留「◈ 风格拆解」。
6. `originals/` 保存原始高清 PNG；`originals_webp/` 保存用于网页快速浏览的压缩版；`previews/` 是最新实现的实际浏览器截图。
7. `prompts/` 各风格独立 Markdown；根目录的 `ALL_20_PROMPTS.md` 汇总 20 条。

## 重要说明

- **概念图片确实来自最早那批设计图**，并非本次重新生成。
- **所有 Prompt 都是根据原图重新分析、反向撰写的参考 Prompt**，无法证明与最初输入模型的提示词相同。
- HTML 是各项目最后精修版本，除了新增不打断页面的「风格拆解」入口，保留原有结构和交互。
- 颜色 Token 为近似提炼，不能作为现有源码精确 CSS 变量的声明。
- 图片生图作品与网页源代码仅供学习与原用户使用，公开传播前请核对图片、字体与第三方素材的授权。

## 从设计图到网页的核心方法

1. 拆图：拍摄场景、材质纹理、复杂插画交给生图/摄影素材；字体、按钮、导航、卡片、表单、进度和数据交给 HTML/CSS/SVG/JS。
2. 先建立设计 Token（颜色、字号、边距、间距、阴影、边框、圆角），再建立布局，最后微调视觉素材与动效。
3. VTracer 可辅助把边缘清晰的二维扁平图形转换成矢量路径，不适合音响织物、建筑照片、人物等写实素材；按钮、字形仍更适合原生代码。
4. 保留移动端独立布局与键盘/触控交互，避免按桌面截图等比缩小。

## 目录

- `index.html`：完整风格学习画廊
- `guides/`：20 个可离线打开的学习页面
- `sites/`：20 个增强风格学习入口的独立 HTML
- `originals/`：20 张高清原始概念 PNG
- `originals_webp/`：20 张概念图 WebP 缩略版
- `previews/`：最新网页浏览器渲染图
- `prompts/`：各个风格的英文 Prompt
- `ALL_20_PROMPTS.md`：Prompt 合集
- `manifest.json`：逐项元数据与 SHA256
