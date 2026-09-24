// Site dimensions are separate from the manufacturer's calculated minimums.
export function projectDimensions(result,options={}){
 const values={},minimums={OH:result.outputs.OH,PD:result.outputs.PD};
 for(const [key,label] of [['OH','OH'],['PD','PIT']]){
  const raw=options[key],value=raw==null||String(raw).trim()===''?minimums[key]:Number(raw);
  if(!Number.isFinite(value)||value<=0)throw new Error(`${label}: nhập số dương (mm).`);
  if(value<minimums[key])throw new Error(`${label} phải từ ${minimums[key]} mm theo cấu hình đã tính lại.`);
  values[key]=value;
 }
 return {values,minimums};
}
