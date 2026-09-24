import {readFileSync,writeFileSync} from 'node:fs';
import {models} from '../dist/rules.mjs';
import {Workbook} from '../dist/excel.mjs';
const fixtures=JSON.parse(readFileSync(new URL('../analysis/fixtures.json',import.meta.url)));
const report=[];
for(let i=0;i<models.length;i++){
 const w=new Workbook(models[i]),failures=[];let passed=0;
 for(const [key,expected] of Object.entries(fixtures[i].cached)){
  try{const actual=w.cell(key);if(typeof actual==='number'&&typeof expected==='number'?Math.abs(actual-expected)<1e-7:actual===expected)passed++;else failures.push({key,expected,actual})}catch(error){failures.push({key,expected,error:error.message})}
 }
 const result={model:models[i].id,passed,failures,outputs:Object.fromEntries(Object.keys(models[i].outputs).map(k=>[k,w.get(k)])),messages:w.messages(),options:Object.fromEntries(Object.keys(models[i].options).map(k=>[k,w.options(k)]))};report.push(result);console.log(JSON.stringify(result,null,2));
}
writeFileSync(new URL('../analysis/verification.json',import.meta.url),JSON.stringify(report,null,2));
if(report.some(r=>r.failures.length))process.exitCode=1;
