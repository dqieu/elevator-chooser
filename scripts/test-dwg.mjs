import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import init,{encode_dwg} from '../dist/cad-assets/dwg/elevator_dwg.js';
await init({module_or_path:readFileSync(new URL('../dist/cad-assets/dwg/elevator_dwg_bg.wasm',import.meta.url))});
const base=new URL('../analysis/cad/model-review/',import.meta.url);
const output=new URL('../analysis/cad/dwg-wasm/',import.meta.url);mkdirSync(output,{recursive:true});
const rows=JSON.parse(readFileSync(new URL('manifest.json',base)));
for(const {name} of rows){
 const start=performance.now(),bytes=encode_dwg(readFileSync(new URL(name+'.dxf',base)));
 assert.equal(new TextDecoder().decode(bytes.slice(0,6)),'AC1032');
 writeFileSync(new URL(name+'.dwg',output),bytes);
 console.log(`${name}: ${bytes.length} bytes, ${Math.round(performance.now()-start)} ms`);
}
assert.throws(()=>encode_dwg(new TextEncoder().encode('invalid drawing')));
console.log(`${rows.length} WASM exports passed; invalid input rejected.`);
