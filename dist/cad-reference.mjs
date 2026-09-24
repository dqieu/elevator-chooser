import {drawingHashes,lsPlanSamples} from './cad-assets/references.mjs?v=20260924-specdefaults';

const numbered=(prefix,n)=>`${prefix}-${String(n).padStart(2,'0')}-1.dwg`;
export function cadReference(r,kind='plan',geometry=null){
 const i=r.inputs,through=i.ENTR==='1D/2D-2G',co=i.DRKI==='CO',so=['2SL','2SR'].includes(i.DRKI),mrl=r.model.startsWith('LEHY-L-');
 let file=null,basis='',sample=null;
 const ls=r.model==='LEHY-L-S'||r.model==='LEHY-L-Pro'&&i.CAP<=1050&&i.SPD<=1.75;
 if(ls&&(co||so)&&i.CAP<=1050&&i.SPD<=1.75){
  if(kind==='section')file=numbered('LEHY-L-S',through?(co?24:25):(co?12:13));
  else{
   sample=lsPlanSamples.find(p=>p.AA===i.AA&&p.BB===i.BB&&p.through===through&&p.door===(co?'CO':'SO'));
   file=sample?.file??'LEHY-L-S-S02-1.dwg';
  }
  basis=r.model==='LEHY-L-Pro'?'LEHY-L-Pro-01/02/03/04 và -21 dẫn chiếu LEHY-L-S.':'Bộ mẫu LEHY-L-S.';
 }
 if(r.model==='LEHY-L-Pro'&&!file){
  if(kind==='section')file='LEHY-L-Pro-21-1.dwg';
  else if(co||so){
   let n;
   if(i.CAP>=825&&i.CAP<=1050&&i.SPD>=2&&i.SPD<=2.5)n=co?5:7;
   else if(i.CAP>=1200&&i.CAP<=1600&&i.SPD<=2.5)n=co?9:11;
   else if(i.CAP>=1800&&i.CAP<=2500&&i.SPD<=1.75||i.CAP>=1800&&i.CAP<=2000&&i.SPD<=2.5)n=co?13:15;
   else if(i.CAP>=1050&&i.CAP<=1600&&i.SPD===3&&co)n=17;
   if(n)file=numbered('LEHY-L-Pro',n+(through?1:0));
  }
  basis='Chọn theo tải trọng, tốc độ, cửa và lối vào trong mục lục LEHY-L-Pro.';
 }
 if(r.model==='LEHY-Pro'){
  if(kind==='section')file=numbered('LEHY-Pro',i.CAP<=1600?21:22);
  else if(co||so){
   let n;
   if(i.POCW==='BACK'&&!through){
    if((i.CAP===630&&i.SPD<=1.75||i.CAP>=825&&i.CAP<=1050&&i.SPD<=2.5))n=i.BB<1300?3:1;
    else if(i.CAP>=1200&&i.CAP<=1600)n=5;
    else if(i.CAP>=1800&&i.CAP<=2025&&i.SPD<=2.5||i.CAP>=2250&&i.CAP<=2500&&i.SPD<=1.75)n=7;
   }else if(['LB','RB'].includes(i.POCW)){
    const low=i.CAP===630&&(so?i.SPD<=1.75:i.SPD===1.75)||i.CAP>=825&&i.CAP<=1600&&i.SPD<=3;
    const high=i.CAP>=1800&&i.CAP<=2025&&i.SPD<=2.5||i.CAP>=2250&&i.CAP<=2500&&i.SPD<=1.75;
    if(low||high)n=(low?11:15)+(through?2:0);
   }
   if(n)file=numbered('LEHY-Pro',n+(so?1:0));
   if(i.POCW==='BACK'&&!through&&co&&i.CAP>=825&&i.CAP<=1050&&i.SPD===3)file='LEHY-Pro-01-3.dwg';
  }
  basis='Chọn nhóm mặt bằng theo vị trí đối trọng, cửa, tải trọng và chiều sâu cabin.';
 }
 if(r.model==='LEHY-S LEHY-III-S'){
  if(kind==='section'&&i.CAP<=1150){
   if(i.POCW==='BACK'&&!through)file='LEHY-III-S(NS3L1)-31-1.dwg';
   else if(['LB','RB'].includes(i.POCW))file='LEHY-III-S(NS3L1)-31-2.dwg';
  }
  else if(kind==='plan'&&i.POCW==='BACK'&&!through&&i.CAP===630&&(co||so))file=numbered('LEHY-III-S(NS3L1)',co?1:2);
  else if(kind==='plan')file='LEHY-III-S(NS3L1)-S02-1.dwg';
  basis='Đối chiếu bộ LEHY-III-S; không coi đây là xác nhận riêng cho mọi biến thể LEHY-S.';
 }
 if(r.model==='LEHY-G'){
  file=kind==='section'?'LEHY-G(NS3G1)-50-1.dwg':geometry?.template?.file??null;
  basis='Chuỗi kích thước và bảng thông số LEHY-G(NS3G1).';
 }
 const issues=[];
 if(r.model==='LEHY-G'&&through&&[3000,10000].includes(i.CAP))issues.push('Mẫu có dòng biểu thức BS không khớp hàng kích thước chuẩn; giữ BS theo Excel và quy tắc EE=BS/2 của mẫu.');
 if(sample&&geometry)for(const key of ['BG','EE']){
  const actual=geometry.source[key]?.value,expected=sample[key];
  if(Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)>.5)issues.push(`${key}: Excel ${actual} mm; mẫu tiêu chuẩn ${expected} mm. Giữ số Excel, cần đối chiếu cấu hình.`);
 }
 if(!file||!drawingHashes[file])return {file:null,mrl,basis:'Chưa có mẫu đúng cấu hình đã xác minh.',issues:[...issues,...r.model==='LEHY-L-G'?['Đã tìm thấy LEHY-MRL-IIG nhưng không tự coi là LEHY-L-G; cần đúng bản LEHY-L-G.']:[]]};
 return {file,sha256:drawingHashes[file],mrl,basis,sample,issues,
  scope:sample?'Đối chiếu kích thước cabin tiêu chuẩn; thiết bị và cấu hình phi tiêu chuẩn cần kiểm tra.':'Tham chiếu bố cục và chuỗi kích thước; hình học thực tế tính bằng Excel.'};
}
