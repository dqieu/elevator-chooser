import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
mkdirSync(new URL('analysis/',root),{recursive:true});
for(const file of ['test-en81.mjs','test-chooser.mjs','test-project-state.mjs','test-cad.mjs','test-lehy-g-cad.mjs','test-section.mjs','test-cad-pair.mjs','test-cad-template.mjs','test-dwg.mjs']){
 const result=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url))],{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
