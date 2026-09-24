import {models} from './rules.mjs?v=20260924-specdefaults';
import {Workbook} from './excel.mjs?v=20260924-specdefaults';
import {areaAssessment,areaErrors} from './en81.mjs?v=20260924-specdefaults';
export {models,Workbook};
export const labels={CAP:'Tải trọng',SPD:'Tốc độ',AA:'Rộng cabin',BB:'Sâu cabin',HL:'Cao thông thủy cabin',CeilingTH:'Dày trần cabin',DRKI:'Kiểu mở cửa',DRDI:'Hướng lệch cửa',DRE:'Độ lệch cửa',ENTR:'Lối vào',DRTP:'Cửa chống cháy',JJ:'Rộng thông thủy cửa',HH:'Cao thông thủy cửa',POCW:'Vị trí đối trọng',GOVO:'Bộ hãm an toàn đối trọng',WG:'Khoảng cách ray đối trọng',WW:'Bề dày đối trọng',FSGD:'Cao lan can nóc cabin',WADD:'Khối lượng trang trí dự phòng',TR:'Hành trình',QADD:'Nâng thêm máy kéo',SIZE:'Cabin cáng 2100 × 1100',YOTO:'Ứng dụng chở hàng',STD:'Tiêu chuẩn tính toán',AH:'Rộng giếng',BH:'Sâu giếng',OH:'Chiều cao tầng trên cùng',PD:'Độ sâu hố pit',HM:'Cao phòng máy',HC:'Cao ngoài cabin',HAXX:'Tâm cabin đến vách trái',DTL:'Tâm cửa đến vách trái',S_Q1XX:'Q theo chiều cao cabin',Q:'Q tổng'};
export const valueLabels={NO:'Không',YES:'Có',CO:'Mở tim · CO','2CO':'Mở tim 4 cánh · 2CO','2SL':'SO · Mở lùa trái (2SL)','2SR':'SO · Mở lùa phải (2SR)',LB:'Bên trái',RB:'Bên phải',BACK:'Phía sau','1D1G':'Một phía','1D/2D-2G':'Xuyên cabin',Default:'Mặc định',L:'Trái',R:'Phải','标准版':'Chở hàng tiêu chuẩn','叉车版':'Chở xe nâng','汽车版':'Chở ô tô','<=30':'Không quá 30 m','>30':'Trên 30 m'};
export const display=v=>valueLabels[v]??String(v);
export function translateMessage(text){return text
 .replaceAll('Calculation Error! Please check if the input is correct!','Có điều kiện tra bảng không hợp lệ. Kiểm tra lại các thông số.')
 .replaceAll('Car area exceeds the limit!','Diện tích cabin vượt giới hạn theo tải trọng.')
 .replaceAll('The position of the counterweight should be the same as the opening direction or the eccentric direction','Đối trọng phải cùng phía với hướng mở hoặc hướng lệch cửa')
 .replaceAll('Car of 1165kg must be 1600×1600.','Cabin 1.165 kg phải có kích thước 1.600 × 1.600 mm.')
 .replaceAll('Car of 1165kg must be 1300×2100 with POCW=LB/RB or 2100×1300 with POCW=BACK.','Cabin 1.165 kg phải là 1.300 × 2.100 mm với đối trọng bên, hoặc 2.100 × 1.300 mm với đối trọng sau.')
 .replaceAll('If WG=750, WW cannot be 400.','Khi WG = 750 mm, WW không được bằng 400 mm.')
 .replaceAll('It should be 0≤HL-HH≤200.','Chênh cao cabin và cửa phải từ 0 đến 200 mm.')
 .replaceAll('HH is too large for HL','Cửa quá cao so với cabin')
 .replaceAll('DRE is too large.','Độ lệch cửa quá lớn.')
 .replaceAll('Please select Default for DRE.','Đặt độ lệch cửa DRE về Default.')
 .replaceAll('Please specify DRE.','Cần nhập độ lệch cửa DRE.')
 .replaceAll('Please fill in TR correctly','Nhập hành trình TR lớn hơn 0')
 .replaceAll('Please re-select','Chọn lại giá trị')
 .replaceAll('should be an integer multiple of','phải là bội số nguyên của')
 .replaceAll('should be between','phải nằm trong khoảng').replaceAll(' and ',' đến ')
 .replaceAll('JJ is too large for AA','Cửa JJ quá rộng so với cabin AA')
 .replaceAll('JJ is too small for AA','Cửa JJ quá hẹp so với cabin AA')
 .replaceAll('JJ should be smaller than AA','Cửa JJ không được rộng hơn cabin AA');}
export const unit=k=>k==='CAP'||k==='WADD'?'kg':k==='SPD'?'m/s':k==='TR'?'m':['AA','BB','HL','CeilingTH','DRE','JJ','HH','WG','WW','FSGD','QADD','AH','BH','OH','PD','HM','HC','HAXX','DTL','S_Q1XX','Q'].includes(k)?'mm':'';
export function validate(w,{en81=true}={}){
 const errors=[];
 for(const [k,v] of Object.entries(w.snapshot()))if(['CAP','SPD','AA','BB','HL','JJ','HH','WG','WW'].includes(k)&&(!(typeof v==='number')||!Number.isFinite(v)||v<=0)||['CeilingTH','FSGD','WADD','QADD'].includes(k)&&(!(typeof v==='number')||!Number.isFinite(v)||v<0))errors.push({cell:w.model.inputs[k],text:`${labels[k]}: giá trị không hợp lệ.`});
 for(const k of Object.keys(w.model.options))if(!w.options(k).includes(w.get(k)))errors.push({cell:w.model.inputs[k],text:`${labels[k]??k}: giá trị ngoài danh sách cho phép (${w.get(k)}).`});
 for(const m of w.messages())if(!m.text.startsWith('P14R:'))errors.push({...m,original:m.text,text:translateMessage(m.text)});
 if(w.model.inputs.SIZE&&w.get('SIZE')==='YES'&&!(w.get('CAP')===1050&&w.get('AA')===2100&&w.get('BB')===1100&&['2SL','2SR'].includes(w.get('DRKI'))))errors.push({cell:'Layout',text:'Cabin cáng cần 1050 kg, 2100 × 1100 mm và cửa 2SL/2SR.'});
 if(en81&&!errors.length)errors.push(...areaErrors(areaAssessment(w)));
 return errors;
}
export function evaluate(modelId,inputs,{en81=true}={}){
 if(typeof en81!=='boolean')throw new Error('Tùy chọn EN 81-20 phải là bật hoặc tắt.');
 const model=models.find(m=>m.id===modelId);if(!model)throw new Error('Không tìm thấy dòng thang.');
 for(const [key,value] of Object.entries(inputs)){if(!model.inputs[key])throw new Error('Thông số không có trong bảng tính: '+key);if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Giá trị không hợp lệ: '+key)}
 const w=new Workbook(model).set(inputs),errors=validate(w,{en81});
 const outputs=errors.length?{}:Object.fromEntries(Object.keys(model.outputs).map(k=>[k,w.get(k)]));
 let area=null;try{area={...areaAssessment(w),enforced:en81}}catch{}
 return {model:model.id,en81,inputs:w.snapshot(),outputs,errors,area,options:Object.fromEntries(Object.keys(model.options).map(k=>[k,w.options(k)])),file:model.file,sha256:model.sha256};
}
export function validateRequest(q){
 if(q?.en81!==undefined&&typeof q.en81!=='boolean')throw new Error('Tùy chọn EN 81-20 phải là bật hoặc tắt.');
 if(!q||!Number.isFinite(q.capacity)||q.capacity<=0||q.capacity>10000)throw new Error('Nhập tải trọng từ 1 đến 10.000 kg.');
 for(const k of ['width','depth','overhead','pit','travel','speed','doorWidth','carWidth','carDepth'])if(q[k]!=null&&(!Number.isFinite(q[k])||q[k]<=0))throw new Error('Thông số phải lớn hơn 0: '+k);
 if(q.margin!=null&&(!Number.isFinite(q.margin)||q.margin<0))throw new Error('Dự phòng xây dựng phải từ 0 mm.');
 if(q.entrance&&!['1D1G','1D/2D-2G'].includes(q.entrance))throw new Error('Lối vào không hợp lệ.');
 if(q.application&&!['all','passenger','goods','forklift','car'].includes(q.application))throw new Error('Ứng dụng không hợp lệ.');
 if(q.doorType!=null&&!['auto','CO','SO','2CO'].includes(q.doorType))throw new Error('Loại cửa không hợp lệ.');
 for(const k of ['safety','fire'])if(q[k]!=null&&!['NO','YES'].includes(q[k]))throw new Error('Lựa chọn không hợp lệ: '+k);
 if(q.decoration!=null&&![0,100,200,300,400].includes(q.decoration))throw new Error('Khối lượng trang trí không hợp lệ.');
 return q;
}
const safe=(w,key,fallback)=>{try{return w.get(key)}catch{return fallback}};
export function search(q,onProgress=()=>{}){
 validateRequest(q);const en81=q.en81!==false;const results=[],excluded=[];let examined=0;
 for(const model of models){
  const goods=model.id.endsWith('-G');
  if(q.application==='passenger'&&goods||['goods','forklift','car'].includes(q.application)&&!goods)continue;
  if(['forklift','car'].includes(q.application)&&model.id!=='LEHY-G'){excluded.push({model:model.id,reason:'Bảng tính không có lựa chọn ứng dụng này.'});continue}
  const w=new Workbook(model),cap=w.options('CAP').filter(v=>typeof v==='number'&&v>=q.capacity).sort((a,b)=>a-b).find(value=>{if(!['forklift','car'].includes(q.application))return true;w.set({CAP:value});return w.options('YOTO').includes(q.application==='forklift'?'叉车版':'汽车版')});
  if(!cap){excluded.push({model:model.id,reason:'Không có tải trọng trong danh sách cho phép đáp ứng yêu cầu.'});continue}
  w.set({CAP:cap,ENTR:q.entrance??'1D1G',DRDI:'NO',DRE:'Default',SIZE:'NO',HL:2300,HH:2100,CeilingTH:goods?50:100,FSGD:goods?1100:700,GOVO:q.safety??'NO',DRTP:q.fire??'NO',WADD:q.decoration??0,QADD:0,AA:1500,BB:1500});
  if(en81&&model.inputs.STD)w.set({STD:'GB/T 7588.1/2-2020 or EN 81-20/50'});
  if(model.inputs.TR)w.set({TR:model.id==='LEHY-L-G'?((q.travel??30)<=30?'<=30':'>30'):(q.travel??30)});
  if(model.inputs.YOTO){const opts=w.options('YOTO');const wanted=q.application==='forklift'?'叉车版':q.application==='car'?'汽车版':opts[0];w.set({YOTO:wanted})}
  const speeds=w.options('SPD');w.set({SPD:q.speed??speeds[0]});
  if(!speeds.includes(w.get('SPD'))){excluded.push({model:model.id,reason:'Tốc độ không có trong danh sách cho tải trọng này.'});continue}
  const doors=w.options('DRKI').filter(v=>q.doorType==='SO'?['2SL','2SR'].includes(v):q.doorType&&q.doorType!=='auto'?v===q.doorType:v!=='2SR');let best=null;const failureCounts={};
  if(!doors.length){excluded.push({model:model.id,reason:'Loại cửa đã chọn không được bảng tính cho phép ở tải trọng này.'});continue}
  for(const door of doors){
   w.set({DRKI:door,POCW:door==='2SR'?'RB':'LB'});
   const positions=w.options('POCW').filter(v=>v!==(door==='2SR'?'LB':'RB'));
   for(const pos of positions){
    w.set({POCW:pos});
    const wg=model.inputs.WG?w.options('WG'):[null],ww=model.inputs.WW?w.options('WW'):[null];
    for(const g of wg)for(const thick of ww){
     w.set({...g!==null?{WG:g}:{},...thick!==null?{WW:thick}:{}});
     let minA=Infinity,maxA=0,minB=Infinity,maxB=0;
     for(const seed of [1100,1300,1700,2300,3200]){w.set({BB:seed});minA=Math.min(minA,safe(w,'AAmin',Infinity));maxA=Math.max(maxA,safe(w,'AAmax',0));minB=Math.min(minB,safe(w,'BBmin',Infinity));maxB=Math.max(maxB,safe(w,'BBmax',0))}
     const aStep=model.id==='LEHY-L-G'?10:50,bStep=goods||q.entrance==='1D/2D-2G'?10:50;
     if(!(minA>0&&minB>0&&maxA>=minA&&maxB>=minB))continue;
     for(let aa=q.carWidth??Math.ceil(minA/aStep)*aStep;aa<=(q.carWidth??maxA);aa+=aStep){
      if(q.width&&aa>q.width)break;
      w.set({AA:aa});
      const jjStep=goods?100:50,jj=q.doorWidth??Math.ceil(safe(w,'JJmin',700)/jjStep)*jjStep;
      w.set({JJ:jj});
      for(let bb=q.carDepth??Math.ceil(minB/bStep)*bStep;bb<=(q.carDepth??maxB);bb+=bStep){
       if(q.depth&&bb>q.depth)break;
       w.set({BB:bb});examined++;
       if(aa<w.get('AAmin')||aa>w.get('AAmax')||bb<w.get('BBmin')||bb>w.get('BBmax')||safe(w,'AREX',0)!==1)continue;
       const area={...areaAssessment(w),enforced:en81};if(en81&&(area.below||area.above))continue;
       let errors;
       try{errors=validate(w,{en81})}catch(error){errors=[{text:'Lỗi công thức: '+error.message}]}
       if(errors.length){for(const err of errors)failureCounts[err.text]=(failureCounts[err.text]??0)+1;continue}
       const output=Object.fromEntries(Object.keys(model.outputs).map(k=>[k,w.get(k)]));
       if(!['AH','BH','OH','PD'].every(k=>typeof output[k]==='number'&&Number.isFinite(output[k])&&output[k]>0))continue;
       const margin=q.margin??0;
       if(['width','depth','overhead','pit'].some((k,i)=>q[k]!=null&&output[['AH','BH','OH','PD'][i]]+margin>q[k]))continue;
       const score=output.AH*output.BH;
       if(!best||area.floorArea>best.area.floorArea+1e-9||Math.abs(area.floorArea-best.area.floorArea)<1e-9&&score<best.score)best={model:model.id,en81,inputs:w.snapshot(),outputs:output,area,score,file:model.file,sha256:model.sha256};
      }
     }
    }
   }
  }
  if(best)results.push(best);else excluded.push({model:model.id,reason:en81?'Chưa có cấu hình đồng thời thỏa biên diện tích EN 81-20, giới hạn hãng và kích thước đã nhập.':'Chưa có cấu hình đồng thời thỏa giới hạn hãng và kích thước đã nhập (biên EN 81-20 đã tắt).',details:Object.keys(failureCounts).slice(0,3)});
  onProgress({model:model.id,examined});
 }
 results.sort((a,b)=>a.inputs.CAP-b.inputs.CAP||b.area.floorArea-a.area.floorArea||a.score-b.score);
 return {results,excluded,examined,request:q};
}
