// EN 81-20, 5.4.2: Table 6 (maximum area), Table 8 (passenger count).
// Primary text: https://www.ciy-led.com/editor/file/20240509/EN%2081-20-2014.pdf pp.64,67.
// 2020 revision has no substantive technical changes: EU Decision 2021/76, recital 3.
// The lower bound below is an APP SELECTION POLICY for floor(Q/75) persons,
// not a claim that EN prohibits a high-load car rated for fewer persons.
const MAX_AREA=[[100,.37],[180,.58],[225,.70],[300,.90],[375,1.10],[400,1.17],[450,1.30],[525,1.45],[600,1.60],[630,1.66],[675,1.75],[750,1.90],[800,2],[825,2.05],[900,2.20],[975,2.35],[1000,2.40],[1050,2.50],[1125,2.65],[1200,2.80],[1250,2.90],[1275,2.95],[1350,3.10],[1425,3.25],[1500,3.40],[1600,3.56],[2000,4.20],[2500,5]];
const MIN_AREA=[0,.28,.49,.60,.79,.98,1.17,1.31,1.45,1.59,1.73,1.87,2.01,2.15,2.29,2.43,2.57,2.71,2.85,2.99,3.13];
export function maximumArea(load){
 if(!Number.isFinite(load)||load<100)throw new Error('Tải trọng ngoài phạm vi Bảng 6 EN 81-20.');
 if(load>2500)return 5+(load-2500)*.0016;
 const i=MAX_AREA.findIndex(([q])=>q>=load);if(i===0)return MAX_AREA[0][1];
 const [q0,a0]=MAX_AREA[i-1],[q1,a1]=MAX_AREA[i];return a0+(load-q0)*(a1-a0)/(q1-q0);
}
export function minimumArea(persons){
 if(!Number.isInteger(persons)||persons<1)throw new Error('Số người phải là số nguyên dương.');
 return persons<=20?MIN_AREA[persons]:3.13+(persons-20)*.115;
}
export function areaBand(load,goods=false){const persons=goods?null:Math.floor(load/75);return {minimum:goods?null:minimumArea(persons),maximum:maximumArea(load),persons};}
export function areaAssessment(w){
 const load=w.get('CAP'),goods=w.model.id.endsWith('-G'),band=areaBand(load,goods);
 const name=goods?'AREA':'ARE_2';
 // Source ARE_2 includes the full 2CO entrance with a 120 mm deep panel;
 // other passenger doors have <=100 mm entrance depth. Cargo AREA includes
 // the full 85+37 mm entrance. Never substitute AA*BB for the upper-area check.
 const area=w.get(name)/1e6,floorArea=w.get('AA')*w.get('BB')/1e6;
 if(!Number.isFinite(area)||area<=0)throw new Error('Không xác định được diện tích sử dụng từ bảng tính.');
 const below=band.minimum!==null&&area<band.minimum-1e-9,above=area>band.maximum+1e-9;
 let permittedPersons=0;while(minimumArea(permittedPersons+1)<=area+1e-9&&permittedPersons<Math.floor(load/75))permittedPersons++;
 return {...band,area,floorArea,below,above,permittedPersons,areaSource:w.model.names[name],policy:goods?'upper-only':'full-passenger-band'};
}
export function areaErrors(a){
 const fmt=x=>x.toLocaleString('vi-VN',{maximumFractionDigits:4});const errors=[];
 if(a.below)errors.push({cell:'EN 81-20 · Bảng 8',text:`Diện tích ${fmt(a.area)} m² nhỏ hơn biên chọn ${fmt(a.minimum)} m² cho ${a.persons} người. Cabin này chỉ đủ diện tích cho ${a.permittedPersons} người; ngoài chính sách chọn đủ số người theo tải trọng.`});
 if(a.above)errors.push({cell:'EN 81-20 · Bảng 6',text:`Diện tích ${fmt(a.area)} m² vượt giới hạn ${fmt(a.maximum)} m² theo tải trọng.`});
 return errors;
}
