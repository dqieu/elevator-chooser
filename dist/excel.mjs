export function e(message){throw new Error(message)}
export function n(v){if(v===null||v==='')return 0;const x=Number(v);return Number.isFinite(x)?x:e('Expected number: '+v)}
export function s(v){return v===null?'':typeof v==='boolean'?(v?'TRUE':'FALSE'):String(v)}
export function b(op,a,z){
 if(a===null)a=typeof z==='string'?'':0;if(z===null)z=typeof a==='string'?'':0;
 if(typeof a==='string')a=a.toUpperCase();if(typeof z==='string')z=z.toUpperCase();
 const rank=v=>typeof v==='boolean'?2:typeof v==='string'?1:0;
 const cmp=rank(a)!==rank(z)?Math.sign(rank(a)-rank(z)):a===z?0:a<z?-1:1;
 return {'=':cmp===0,'<>':cmp!==0,'<':cmp<0,'>':cmp>0,'<=':cmp<=0,'>=':cmp>=0}[op];
}
export function f(name,args){
 const all=args.flat(Infinity),nums=all.filter(v=>typeof v==='number');
 switch(name){
 case 'SUM':return nums.reduce((a,v)=>a+v,0);
 case 'PRODUCT':return nums.length?nums.reduce((a,v)=>a*v,1):0;
 case 'MAX':return Math.max(0,...nums);
 case 'MOD':return n(args[0])-n(args[1])*Math.floor(n(args[0])/n(args[1]));
 case 'CONCATENATE':return all.map(s).join('');
 case 'COUNTIF':return args[0].filter(v=>b('=',v,args[1])).length;
 case 'ROUND':case 'ROUNDUP':case 'ROUNDDOWN':{
 const value=n(args[0]),scale=10**n(args[1]),abs=Math.abs(value)*scale;
 return Math.sign(value)*(name==='ROUNDUP'?Math.ceil(abs-1e-10):name==='ROUNDDOWN'?Math.floor(abs+1e-10):Math.floor(abs+0.5+1e-10))/scale;
 }
 default:return e('Unsupported function '+name);
 }
}
export class Workbook{
 constructor(model){this.model=model;this.overrides={};this.cache=new Map();this.active=new Set();this.reverse={};for(const [key,refs] of Object.entries(model.dependencies))for(const ref of refs)(this.reverse[ref]??=[]).push(key);this.c=this.cell.bind(this)}
 cell(key){
 if(Object.hasOwn(this.overrides,key))return this.overrides[key];
 if(this.cache.has(key))return this.cache.get(key);
 if(this.active.has(key))return e('Circular reference '+key);
 this.active.add(key);
 try{const v=this.model.formulas[key]?this.model.formulas[key](this.c):(this.model.values[key]??null);if(typeof v==='number'&&!Number.isFinite(v))e('Non-finite '+key);this.cache.set(key,v);return v}finally{this.active.delete(key)}
 }
 get(name){const key=this.model.inputs[name]??this.model.outputs[name]??this.model.names[name.toUpperCase()];if(!key)return e('Unknown name '+name);return this.cell(key)}
 set(inputs){const queue=[];for(const [name,value] of Object.entries(inputs)){const key=this.model.inputs[name];if(!key)continue;if(this.cell(key)!==value){this.overrides[key]=value;queue.push(key)}}const seen=new Set();while(queue.length){const key=queue.pop();if(seen.has(key))continue;seen.add(key);this.cache.delete(key);queue.push(...(this.reverse[key]??[]))}return this}
 options(name){return [...new Set((this.model.options[name]??[]).map(this.c).filter(v=>v!==null&&v!==''))]}
 messages(){return this.model.messages.map(key=>({cell:key,text:this.cell(key)})).filter(v=>v.text)}
 snapshot(){return Object.fromEntries(Object.keys(this.model.inputs).map(k=>[k,this.get(k)]))}
}
