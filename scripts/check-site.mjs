/** Static resource validation. Run: node scripts/check-site.mjs */
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};
for(const name of ['atlas-data','prompts-data']) vm.runInNewContext(readFileSync(new URL(`../assets/${name}.js`,import.meta.url),'utf8'),context);
const items=context.window.ATLAS;
assert.equal(items.length,20);
assert.equal(new Set(items.map(x=>x.id)).size,20);
const counts={};
for(const item of items){
  counts[item.category]=(counts[item.category]||0)+1;
  for(const field of ['preview','original','original_webp','prompt_file','guide','site_file']) assert(existsSync(new URL(`../${item[field]}`,import.meta.url)),`${item.name}: missing ${field}`);
  assert(context.window.ATLAS_PROMPTS[item.id]?.length>80,`${item.name}: missing prompt`);
  for(const color of item.colors) assert(/^#[a-f\d]{6}$/i.test(color),`Invalid color ${color}`);
}
assert.deepEqual(counts,{'Lifestyle':5,'Editorial':4,'Experimental':5,'Product / AI':6});
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(!match[1].startsWith('http') && match[1] !== './') assert(existsSync(new URL(`../${match[1]}`,import.meta.url)),`Missing entry resource: ${match[1]}`);
}
console.log('PASS: 20 cases, category counts, 120 case resource paths, all prompts, colors and entry resources.');
