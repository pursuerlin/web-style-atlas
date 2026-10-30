/** Verify personalized briefs and the actual ZIP format without browser dependencies. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{},TextEncoder,Uint8Array,DataView,Blob,Date};
for(const file of ['atlas-data','creator-core'])vm.runInNewContext(readFileSync(new URL(`../assets/${file}.js`,import.meta.url),'utf8'),context);
const {build,normalize,zip}=context.window.AtlasCreatorCore;
const values={name:'松间香氛 <松>',purpose:'展示天然植物香氛与居家生活',kind:'产品官网',language:'中文',action:'预约试香',stack:'html',route:'new'};
for(const item of context.window.ATLAS){
 const docs=build(item,values);
 for(const field of ['image','assets','code','review']){
  assert(docs[field].includes(values.name),`${item.name}/${field}: missing project name`);
  assert(docs[field].includes(values.purpose),`${item.name}/${field}: missing purpose`);
  assert(docs[field].includes(item.zh),`${item.name}/${field}: missing chosen style`);
  assert(docs[field].includes('项目需求优先'),`${item.name}/${field}: must adapt original subject`);
 }
 assert(docs.code.includes('无构建依赖'));
 assert(docs.code.includes('不能把桌面等比缩小'));
 assert(docs.assets.includes('不包含导航、标题、按钮'));
 assert(!docs.code.includes('starter.html'));
 const reuse=build(item,{...values,route:'reuse',stack:'react'},true);
 assert(reuse.code.includes('starter.html')&&reuse.code.includes('React')&&reuse.code.includes('reference/my-design.*'));
 assert(reuse.readme.includes('starter.html'));
 assert(reuse.readme.includes('可以直接从第 3 步开始'));
}
assert.equal(normalize({name:null,stack:'unknown',language:'unknown',route:'delete'}).stack,'html');
assert.equal(normalize({name:'  hello  '}).name,'hello');
assert.equal(normalize({purpose:'x'.repeat(4000)}).purpose.length,2000);
assert.throws(()=>zip([{name:'../escape',data:'x'}]));
assert.throws(()=>zip([{name:'file',data:'a'},{name:'file',data:'b'}]));
const docs=build(context.window.ATLAS[0],values);
const entries=[{name:'项目简报.md',data:docs.context},{name:'01-image-prompt.md',data:docs.image},{name:'binary/bytes.bin',data:new Uint8Array([0,1,128,255])}];
const blob=zip(entries);assert.equal(blob.type,'application/zip');
const output=new URL('../evidence/creation/',import.meta.url);mkdirSync(output,{recursive:true});
writeFileSync(new URL('core-check.zip',output),Buffer.from(await blob.arrayBuffer()));
console.log('PASS: all 20 styles personalized across 4 prompts; React/reuse/upload paths; normalization; ZIP traversal/duplicate rejection. ZIP fixture: evidence/creation/core-check.zip');
