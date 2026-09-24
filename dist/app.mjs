import {specificationDefaults} from './cad-template.mjs?v=20260924-specdefaults';
import {sectionDefaults,siteErrors} from './project-state.mjs?v=20260924-specdefaults';
import {toDwg} from './dwg.mjs?v=20260924-specdefaults';
import {drawingPackageFor} from './cad-pair.mjs?v=20260924-specdefaults';
import {sectionDrawingFor} from './cad-section.mjs?v=20260924-specdefaults';
import {planGeometry,geometryLabels} from './cad-geometry.mjs?v=20260924-specdefaults';
import {drawingFor,toDxf,toSvg} from './cad.mjs?v=20260924-specdefaults';
import {models,Workbook,labels,display,unit,evaluate,validateRequest} from './chooser.mjs?v=20260924-specdefaults';
const $=s=>document.querySelector(s),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#more-info').onclick=()=>$('#info-dialog').showModal();
$('#close-info').onclick=()=>$('#info-dialog').close();
let worker,serial=0,lastResult=null,pending=null;
try{$('#apply-en81').checked=localStorage.getItem('viet-chao.en81')!=='false'}catch{}
function saveEn81(){try{localStorage.setItem('viet-chao.en81',String($('#apply-en81').checked))}catch{}}
const format=v=>typeof v==='number'?v.toLocaleString('vi-VN',{maximumFractionDigits:2}):display(v);
const areaFormat=v=>v.toLocaleString('vi-VN',{maximumFractionDigits:4});
function areaPanel(a){if(!a)return '';return `<div class="area-band ${a.enforced!==false&&(a.below||a.above)?'area-fail':''}"><strong>${areaFormat(a.area)} m²</strong><span>${a.enforced===false?'':a.minimum===null?`≤ ${areaFormat(a.maximum)} m²`:`${a.persons} người · ${areaFormat(a.minimum)}–${areaFormat(a.maximum)} m²`}</span><details><summary>Diện tích</summary><p>Sàn AA × BB: ${areaFormat(a.floorArea)} m². Diện tích sử dụng tính theo công thức nguồn, gồm phần lối vào khi áp dụng. ${a.minimum===null?'Bảng 6: giới hạn trên.':`Bảng 6 / 8: ${areaFormat(a.minimum)}–${areaFormat(a.maximum)} m².`}</p></details></div>`;}

function specRows(values){return Object.entries(values).map(([k,v])=>`<tr><th>${esc(labels[k]??k)} <small>${esc(k)}</small></th><td>${esc(format(v))} ${unit(k)}</td></tr>`).join('')}
function card(r,index,technicalView=false){const i=r.inputs,o=r.outputs;return `<article class="card"><div class="card-head"><div><h3>${esc(r.model.replace(' LEHY-',' / LEHY-'))}</h3><p>${format(i.CAP)} kg · ${format(i.SPD)} m/s · ${display(i.ENTR)}</p></div></div><div class="dimensions">${[['AH','Rộng giếng'],['BH','Sâu giếng'],['OH','Tầng trên cùng'],['PD','Hố pit']].map(([k,label])=>`<div class="dimension"><span>${label} · ${k}</span><strong>${format(o[k])}</strong><small>mm</small></div>`).join('')}</div>${areaPanel(r.area)}<div class="card-bottom"><span>Cabin ${format(i.AA)} × ${format(i.BB)} · Cửa ${format(i.JJ)} mm · ${esc(display(i.DRKI))}</span><button class="text-button" data-cad="${technicalView?'technical':index}">Kiểm tra & xuất bản vẽ →</button></div><details><summary>Thông số & nguồn</summary><table class="spec-table"><tbody>${specRows(i)}${specRows(Object.fromEntries(Object.entries(o).filter(([k])=>!['AH','BH','OH','PD'].includes(k))))}</tbody></table><p class="source">Nguồn: ${esc(r.file)}<br>Kết quả: ${Object.entries(models.find(m=>m.id===r.model).outputs).filter(([k])=>['AH','BH','OH','PD'].includes(k)).map(([k,v])=>k+' → '+v).join('; ')}<br>SHA-256: ${r.sha256}</p></details></article>`}
function saveSearch(){try{localStorage.setItem('viet-chao.search',JSON.stringify(Object.fromEntries(new FormData($('#search-form')))))}catch{}}
function restoreSearch(){try{const saved=JSON.parse(localStorage.getItem('viet-chao.search')??'{}');for(const [k,v] of Object.entries(saved)){const field=$('#search-form').elements.namedItem(k);if(field)field.value=v}}catch{}}
$('#search-form').addEventListener('input',()=>{saveSearch();if(pending){worker?.terminate();pending.reject(new Error('Thông số đã thay đổi.'));pending=null;$('#search-button').disabled=false}if(lastResult){lastResult=null;$('#cards').innerHTML='';$('#excluded').innerHTML='';$('#status').textContent='Thông số đã đổi. Bấm Tìm thang để cập nhật.';$('#result-count').textContent=''}});
function requestFromForm(){const data=new FormData($('#search-form')),q={en81:$('#apply-en81').checked};for(const [k,v] of data){if(v==='')continue;q[k]=['application','entrance','fire','safety','doorType'].includes(k)?v:Number(v)}return validateRequest(q)}
function renderResults(result){lastResult=result;$('#result-title').textContent=result.results.length?'Phương án':'Chưa có phương án';$('#result-count').textContent=String(result.results.length).padStart(2,'0');const q=result.request;$('#status').textContent=q.travel==null?'Hành trình giả định: 30 m':'';$('#cards').innerHTML=(result.results.length?result.results.map((r,i)=>card(r,i)).join(''):'<div class="empty"><h3>Chưa có cấu hình phù hợp.</h3><p>Thử tải trọng khác hoặc nới kích thước giếng.</p></div>');$('#excluded').innerHTML=result.excluded.length?`<details><summary>${result.excluded.length} dòng chưa có phương án</summary><ul>${result.excluded.map(e=>`<li><strong>${esc(e.model)}</strong>: ${esc(e.reason)}</li>`).join('')}</ul></details>`:'';}
function runSearch(q){validateRequest(q);saveSearch();if(pending){pending.reject(new Error('Đã thay bằng yêu cầu mới.'));pending=null}worker?.terminate();worker=new Worker('./worker.mjs?v=20260924-specdefaults',{type:'module'});const id=++serial;$('#search-button').disabled=true;$('#form-error').textContent='';$('#status').textContent='Đang đối chiếu công thức và kích thước…';$('#cards').innerHTML='';$('#excluded').innerHTML='';$('#result-title').textContent='Đang tính…';$('#result-count').textContent='';lastResult=null;return new Promise((resolve,reject)=>{pending={resolve,reject};const fail=message=>{$('#search-button').disabled=false;$('#form-error').textContent=message;$('#status').textContent='Chưa có kết quả cho yêu cầu này.';pending=null;reject(new Error(message))};worker.onerror=e=>fail('Không thể chạy bộ tính. Vui lòng tải lại trang.');worker.onmessage=({data})=>{if(data.id!==serial)return;if(data.progress){$('#status').textContent='Đã kiểm tra '+data.progress.model+'…';return}$('#search-button').disabled=false;if(data.error){fail(data.error);return}renderResults(data.result);pending=null;resolve(data.result)};worker.postMessage({id,request:q})})}
$('#search-form').addEventListener('submit',event=>{event.preventDefault();try{runSearch(requestFromForm()).catch(()=>{})}catch(error){$('#form-error').textContent=error.message}});
document.querySelectorAll('[data-cap]').forEach(button=>button.addEventListener('click',()=>{$('#capacity').value=button.dataset.cap;$('#search-form').requestSubmit()}));
$('#reset').addEventListener('click',()=>{drafts.clear();cadPreferences={};try{sessionStorage.removeItem('viet-chao.drafts');localStorage.removeItem('viet-chao.search');localStorage.removeItem('viet-chao.cad-project')}catch{};HTMLFormElement.prototype.reset.call($('#search-form'));$('#search-form').requestSubmit()});
function technicalFields(r){
 const main=['CAP','SPD','AA','BB','DRKI','JJ'];
 const common=Object.keys(models[0].inputs).filter(k=>models.every(m=>m.inputs[k]));
 const field=([k,v])=>{const opts=r.options[k],numeric=typeof v==='number'&&k!=='DRE';return `<div><label for="tech-${k}">${esc(labels[k]??k)} <span>${k} · ${unit(k)}</span></label>${opts?`<select id="tech-${k}" name="${k}">${[...new Set([v,...opts])].map(o=>`<option value="${esc(o)}" ${o===v?'selected':''}>${esc(display(o))}${!opts.includes(o)?' — ngoài danh sách':''}</option>`).join('')}</select>`:`<input id="tech-${k}" name="${k}" type="${numeric?'number':'text'}" ${numeric?'step="any"':''} value="${esc(v)}" required>`}</div>`};
 const entries=Object.entries(r.inputs).filter(([k])=>k!=='TR');
 const group=(title,items)=>items.length?'<details><summary>'+title+'</summary><div class="parameter-grid">'+items.map(field).join('')+'</div></details>':'';
 $('#technical-fields').innerHTML='<div class="parameter-grid">'+entries.filter(([k])=>main.includes(k)).map(field).join('')+'</div>'+group('Nâng cao dùng chung',entries.filter(([k])=>!main.includes(k)&&common.includes(k)))+group('Riêng dòng '+esc(r.model),entries.filter(([k])=>!common.includes(k)));
}
function readTechnical(){const inputs={...cadResult.inputs};for(const [k,v] of new FormData($('#technical-form')))inputs[k]=k==='DRE'?(v==='Default'?v:Number(v)):typeof inputs[k]==='number'?Number(v):v;return inputs}
if(new Date()>new Date('2026-12-31T23:59:59+07:00')){$('#validity').textContent='Bộ quy tắc đã hết hiệu lực ngày 31/12/2026. Cần cập nhật từ Shanghai Mitsubishi.';$('#validity').classList.add('error')}
$('#apply-en81').onchange=()=>{saveEn81();$('#search-form').requestSubmit()};
restoreSearch();
$('#search-form').requestSubmit();
if(document.modelContext?.registerTool){
 const lifetime=new AbortController();
 const properties={en81:{type:'boolean',description:'Bật bộ lọc diện tích EN 81-20; mặc định bật.'},doorType:{type:'string',enum:['auto','CO','SO','2CO']},capacity:{type:'number',exclusiveMinimum:0,maximum:10000},application:{type:'string',enum:['all','passenger','goods','forklift','car']},entrance:{type:'string',enum:['1D1G','1D/2D-2G']},fire:{type:'string',enum:['NO','YES']},safety:{type:'string',enum:['NO','YES']},margin:{type:'number',minimum:0}};
 for(const k of ['width','depth','overhead','pit','travel','speed','doorWidth','carWidth','carDepth'])properties[k]={type:'number',exclusiveMinimum:0};
 try{Promise.resolve(document.modelContext.registerTool({name:'find_elevator_configurations',title:'Tìm cấu hình thang máy',description:'Đặt điều kiện trong giao diện và tìm cấu hình sơ bộ từ sáu bảng tính Shanghai Mitsubishi. Chỉ đánh giá bố trí hình học, không xác nhận đặt hàng.',inputSchema:{type:'object',properties,required:['capacity'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{
  if(Object.keys(input).some(k=>!Object.hasOwn(properties,k)))throw new Error('Có trường không được hỗ trợ.');
  validateRequest(input);for(const [k,v] of Object.entries(input)){if(k==='en81')continue;const field=$('#search-form').elements.namedItem(k);if(field.tagName==='SELECT'&&![...field.options].some(o=>o.value===String(v)))throw new Error('Giá trị không được hỗ trợ: '+k)}HTMLFormElement.prototype.reset.call($('#search-form'));for(const [k,v] of Object.entries(input)){if(k==='en81'){$('#apply-en81').checked=v;saveEn81();}else $('#search-form').elements.namedItem(k).value=v}const r=await runSearch({...input,en81:$('#apply-en81').checked});return {results:r.results.map(x=>({model:x.model,en81:x.en81,inputs:x.inputs,dimensions:x.outputs,area:x.area})),excluded:r.excluded,assumptions:'Tìm nhanh theo giả định hiển thị; cần xác nhận phi tiêu chuẩn và kích thước chưa cung cấp.'};
 }},{signal:lifetime.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifetime.abort(),{once:true});
}

const cadDialog=document.createElement('dialog');cadDialog.className='cad-dialog';
cadDialog.innerHTML='<div class="cad-toolbar"><h2>Kiểm tra & xuất bản vẽ</h2><button type="button" data-close>Đóng</button></div><label class="cad-kind">Loại bản vẽ <select data-cad-kind><option value="pair">Đủ bộ theo mẫu · mặt bằng, mặt cắt, thông số</option><option value="plan">Mặt bằng cabin</option><option value="section">Mặt cắt theo số điểm dừng</option></select></label><details class="cad-help"><summary>Thông tin thêm</summary><p data-cad-description></p><p class="cad-details"></p><p>DWG mở bằng AutoCAD, đơn vị mm. Bản vẽ dự thảo; kiểm tra thiết bị và thông số công trình trước khi sử dụng.</p></details><details class="parameter-menu" open><summary>Thông số cấu hình & công trình</summary><form id="technical-form"><div id="technical-fields"></div></form><details open><summary>Công trình & bản vẽ</summary><p class="site-constraints"></p><form class="cad-geometry-form"></form></details></details><p class="cad-error" role="alert"></p><p class="cad-summary" role="status"></p><div class="cad-toolbar cad-zoom"><label>Xem bản vẽ <select data-cad-sheet><option value="all">Toàn bộ</option></select></label><div><button type="button" data-zoom="1">Vừa khung</button> <button type="button" data-zoom="2">Phóng to 2×</button> <button type="button" data-zoom="3">3×</button></div></div><div class="cad-preview"></div><div class="cad-toolbar"><button type="button" data-download>Tải CAD (.dwg)</button><span role="status" class="cad-status"></span></div>';
document.body.append(cadDialog);let cadDrawing=null,cadResult=null,cadExportBusy=false;
let cadPreferences={};try{cadPreferences=JSON.parse(localStorage.getItem('viet-chao.cad-project')??'{}')??{}}catch{}
if(typeof cadPreferences!=='object'||Array.isArray(cadPreferences))cadPreferences={};
let drafts;try{drafts=new Map(JSON.parse(sessionStorage.getItem('viet-chao.drafts')??'[]'))}catch{drafts=new Map()}
let draftKey=null;
const cadForm=cadDialog.querySelector('.cad-geometry-form'),cadKind=()=>cadDialog.querySelector('[data-cad-kind]').value;
cadDialog.querySelector('[data-close]').onclick=()=>cadDialog.close();
cadDialog.addEventListener('cancel',event=>{event.preventDefault();cadDialog.close()});
cadDialog.addEventListener('close',saveDraft);
function saveDraft(){if(draftKey&&cadResult)drafts.set(draftKey,{inputs:readTechnical(),options:Object.fromEntries([...cadForm.elements].filter(e=>e.name).map(e=>[e.name,e.value])),kind:cadKind()});try{sessionStorage.setItem('viet-chao.drafts',JSON.stringify([...drafts]))}catch{}}
cadDialog.querySelectorAll('[data-zoom]').forEach(button=>button.onclick=()=>{const svg=cadDialog.querySelector('.cad-preview svg');if(svg)svg.style.width=(Number(button.dataset.zoom)*100)+'%'});
function cadOptions(){return Object.fromEntries([...new FormData(cadForm)].map(([k,v])=>[k,['wallThickness','openingAllowance','stops','floorHeight','railGauge','railY','counterY','rearDoorX'].includes(k)?Number(v):v]))}
function refreshGeometryFields(){
 let required=[];try{required=planGeometry(cadResult).required}catch{}
 const group=cadForm.querySelector('[data-manual-geometry]');
 const saved=Object.fromEntries([...group.querySelectorAll('input')].map(e=>[e.name,e.value]));
 group.innerHTML=required.map(k=>`<label>${esc(geometryLabels[k])} · mm<input name="${k}" type="number" min="0.001" step="any" value="${esc(saved[k]??'')}" required></label>`).join('');
}
function renderCad(manual={}){
 cadDrawing=null;cadDialog.querySelector('[data-download]').disabled=true;cadDialog.querySelector('.cad-preview').innerHTML='';cadDialog.querySelector('.cad-error').textContent='';cadDialog.querySelector('.cad-status').textContent='';cadDialog.querySelector('.cad-summary').textContent='';cadDialog.querySelector('.cad-details').textContent='';
 try{
  const inputs=readTechnical();
  if(Object.hasOwn(inputs,'TR'))inputs.TR=cadResult.model==='LEHY-L-G'?(Number($('#travel').value||30)<=30?'<=30':'>30'):Number($('#travel').value||30);
  cadResult=evaluate(cadResult.model,inputs,{en81:$('#apply-en81').checked});
  if(cadResult.errors.length)throw new Error(cadResult.errors.map(e=>e.text).join(' '));
  refreshGeometryFields();
  manual={...manual,...cadOptions()};
  cadDrawing=cadKind()==='pair'?drawingPackageFor(cadResult,manual):cadKind()==='section'?sectionDrawingFor(cadResult,manual):drawingFor(cadResult,manual);
  cadResult=cadDrawing.result;
  const errors=siteErrors(cadResult,{...lastResult?.request,overhead:Number($('#overhead').value)||undefined,pit:Number($('#pit').value)||undefined});if(errors.length){cadDrawing=null;throw new Error(errors.join(' '))}
  if(cadKind()!=='plan'){
   const travel=(cadDrawing.sheets?.section.geometry??cadDrawing.geometry).travel/1000;
   $('#travel').value=travel;saveSearch();
   $('#status').textContent='Hành trình công trình: '+format(travel)+' m. Tìm lại để cập nhật các phương án khác.';
  }
  saveDraft();
  for(const key of ['stops','floorHeight','floorHeights','wallThickness','openingAllowance'])if(manual[key]!=null)cadPreferences[key]=manual[key];
  try{localStorage.setItem('viet-chao.cad-project',JSON.stringify(cadPreferences))}catch{}
  const sheetSelect=cadDialog.querySelector('[data-cad-sheet]');
  sheetSelect.innerHTML='<option value="all">Toàn bộ</option>'+Object.keys(cadDrawing.sheets??{}).map(key=>`<option value="${key}">${({plan:'Mặt bằng',section:'Mặt cắt',specification:'Bảng thông số',machineRoom:'Lỗ chờ phòng máy'})[key]}</option>`).join('');
  sheetSelect.value=cadDrawing.sheets?'plan':'all';
  cadDialog.querySelector('.cad-preview').innerHTML=toSvg(cadDrawing.sheets?.plan??cadDrawing);
  cadDialog.querySelector('[data-download]').disabled=cadExportBusy;
  const o={...cadResult.outputs,...(cadDrawing.sheets?.section.geometry.project?.values??cadDrawing.geometry.project?.values??cadDrawing.project?.values)},sg=cadDrawing.sheets?.section.geometry??cadDrawing.geometry;
  cadDialog.querySelector('.cad-summary').textContent=(cadKind()!=='plan'?`${sg.stops} điểm dừng · ${format(sg.travel/1000)} m · `:'')+`Giếng ${format(o.AH)} × ${format(o.BH)} · OH ${format(o.OH)} · PIT ${format(o.PD)} mm`;
  cadDialog.querySelector('.cad-details').textContent=(cadKind()!=='plan'?sg.warnings.join(' ')+' Chi tiết máy/cáp dựng lại từ DWG mẫu. Lỗ cáp mặc định 300×300 mm theo xác nhận; chiều sâu cabin bb theo cấu hình thực tế.':'')+' ';
 const refs=cadDrawing.sheets?[cadDrawing.sheets.plan.reference,cadDrawing.sheets.section.reference]:[cadDrawing.reference];
  cadDialog.querySelector('.cad-details').textContent+=' '+refs.map((ref,n)=>(cadDrawing.sheets?(n?'Mặt cắt: ':'Mặt bằng: '):'Mẫu: ')+(ref.file??ref.basis)+(ref.issues.length?' '+ref.issues.join(' '):'')).join(' · ');
 }catch(error){cadDialog.querySelector('.cad-error').textContent=error.message}
}
function selectCadKind(){
 const section=cadKind()!=='plan';
 for(const fieldset of cadForm.querySelectorAll('fieldset')){const active=cadKind()==='pair'||fieldset.dataset.kind===cadKind();fieldset.hidden=!active;fieldset.disabled=!active}
 cadForm.elements.wallThickness.min=section?'1':'0';
 cadForm.querySelector('[type="submit"]').textContent=cadKind()==='pair'?'Dựng đủ bộ bản vẽ':section?'Dựng mặt cắt':'Dựng mặt bằng';
 cadDialog.querySelector('[data-cad-description]').textContent=section?'Mặt cắt đứng có đầy đủ cụm thiết bị và đường cáp từ DWG mẫu, thích ứng theo cabin, hành trình, OH/PIT. Chi tiết là hình tham khảo; bảng thông số thể hiện giá trị cấu hình và các mục công trình đã nhập.':'Mặt bằng cabin trong giếng, có tim cửa, tim cabin, tim ray và tim đối trọng. Đơn vị mm; hình học 1:1.';
 renderCad(cadOptions());
}
cadDialog.querySelector('[data-cad-kind]').onchange=selectCadKind;
cadDialog.querySelector('[data-cad-sheet]').onchange=event=>{if(cadDrawing)cadDialog.querySelector('.cad-preview').innerHTML=toSvg(cadDrawing.sheets?.[event.target.value]??cadDrawing)};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-cad]');if(!button)return;
 if(!lastResult)return;
 cadDrawing=null;cadResult=lastResult.results[Number(button.dataset.cad)];
 draftKey=JSON.stringify([cadResult.model,cadResult.inputs,lastResult.request]);
 const draft=drafts.get(draftKey);cadResult=evaluate(cadResult.model,draft?.inputs??cadResult.inputs,{en81:$('#apply-en81').checked});
 technicalFields(cadResult);
 cadDialog.querySelector('[data-cad-kind]').value=draft?.kind??'pair';
 cadDialog.querySelector('.site-constraints').textContent=Object.entries({width:'Rộng giếng',depth:'Sâu giếng',overhead:'OH',pit:'Pit',margin:'Dự phòng'}).filter(([k])=>lastResult.request[k]!=null).map(([k,label])=>label+': '+format(lastResult.request[k])+' mm').join(' · ');
 let required=[];try{required=planGeometry(cadResult).required}catch{}
 const mrl=cadResult.model.startsWith('LEHY-L-');
 cadForm.innerHTML='<label>OH công trình · mm<input name="OH" type="number" min="1" step="any" placeholder="Để trống dùng mức tối thiểu"></label><label>PIT công trình · mm<input name="PD" type="number" min="1" step="any" placeholder="Để trống dùng mức tối thiểu"></label><label>Dày vách / sàn dự thảo · mm<input name="wallThickness" type="number" min="0" max="1000" value="200" required></label><fieldset data-kind="plan"><label>Chừa cửa: cộng thêm vào JJ · mm<input name="openingAllowance" type="number" min="0" max="1000" value="200" required></label>'+ (required.length?'<p>Nhập các tọa độ thiếu theo bản kỹ thuật: gốc tại góc trong trái, phía cửa trước.</p>':'')+'<div data-manual-geometry>'+required.map(k=>`<label>${esc(geometryLabels[k])} · mm<input name="${k}" type="number" min="0.001" step="any" required></label>`).join('')+'</div></fieldset><fieldset data-kind="section"><label>Số điểm dừng<input name="stops" type="number" min="2" max="60" step="1" value="5" required></label><label>Chiều cao tầng mặc định · mm<input name="floorHeight" type="number" min="1" step="any" value="3300" required></label><label data-machine-room>Cao phòng máy HM · mm<input name="machineRoomHeight" type="number" min="1" max="10000" step="any" placeholder="Theo HM nguồn; nếu chưa có dùng 2200 theo mẫu"></label><details class="cad-floor-options"><summary>Tầng cao khác nhau</summary><label>Chiều cao từng khoảng tầng, từ dưới lên · mm<input name="floorHeights" type="text" placeholder="Ví dụ 4200; 3300; 3300; 3600"></label><small>Để trống dùng chiều cao mặc định. Với 5 điểm dừng, nhập 4 số cách nhau bằng dấu ; hoặc dấu cách.</small></details></fieldset><button type="submit">Dựng bản vẽ</button>';
 const specFields={liftName:'Tên thang',usage:'Sử dụng',client:'Chủ đầu tư',director:'Tổng giám đốc',designer:'Thiết kế',checker:'Kiểm tra',approver:'Duyệt',revision:'Hiệu chỉnh',issueDate:'Ngày xuất bản',projectName:'Dự án',location:'Địa điểm',control:'Điều khiển',operation:'Vận hành',doorCount:'Số cửa tầng',servedFloors:'Tên tầng phục vụ',unservedFloors:'Tầng không phục vụ',roping:'Tỷ số truyền',motorPower:'Công suất động cơ · kW',powerSupply:'Nguồn động lực',lightingSupply:'Nguồn chiếu sáng',powerBreaker:'CB động lực · A',powerCable:'Dây chính · mm²',earthCable:'Dây tiếp địa · mm²',lightingBreaker:'CB chiếu sáng · A',lightingCable:'Dây chiếu sáng · mm²'};
 const extra=document.createElement('details');extra.className='cad-floor-options';extra.innerHTML='<summary>Khung tên / bảng thông số</summary>'+Object.entries(specFields).map(([key,label])=>`<label>${label}<input name="${key}" type="text" maxlength="100" placeholder="${esc(specificationDefaults[key]??({doorCount:'Theo số điểm dừng',servedFloors:'Theo số điểm dừng'}[key])??'Chưa xác định')}"></label>`).join('');cadForm.insertBefore(extra,cadForm.querySelector('button[type="submit"]'));
 if(!mrl){const room=document.createElement('details');room.className='cad-floor-options';
  const fields={cableHoleSize:['Cạnh lỗ cáp · mm',300],installationHoleSize:['Cạnh lỗ thi công · mm',800],beamWidth:['Rộng lỗ chờ dầm · mm',1200],beamDepth:['Sâu lỗ chờ dầm · mm',150],beamHeight:['Cao lỗ chờ dầm · mm',650],hookLoad:['Tải móc treo tham khảo · kN',25]};
  room.innerHTML='<summary>Lỗ chờ / kết cấu theo mẫu</summary><p class="helper">Mặc định theo mẫu: lỗ cáp, lỗ thi công, lỗ chờ dầm và móc treo. Có thể sửa theo công trình.</p>'+Object.entries(fields).map(([key,[label,value]])=>`<label>${label}<input name="${key}" type="number" min="0.001" step="any" value="${value}"></label>`).join('')+'<label>Tọa độ lỗ chờ riêng: tên, X, Y, rộng, sâu · mm<textarea name="roomOpenings" rows="4" placeholder="Để trống dùng bố trí mẫu; mỗi dòng một lỗ"></textarea></label>';
  cadForm.insertBefore(room,cadForm.querySelector('button[type="submit"]'));}

 const defaults={...sectionDefaults({...lastResult.request,travel:Number($('#travel').value||30)},cadPreferences),...draft?.options,OH:$('#overhead').value,PD:$('#pit').value};
 for(const [key,value] of Object.entries(defaults))if(cadForm.elements.namedItem(key))cadForm.elements.namedItem(key).value=value;
 cadForm.insertAdjacentHTML('afterbegin','<p class="helper">Hành trình lấy từ bước chọn; chiều cao tầng được chia đều theo số điểm dừng dự thảo. Sửa số tầng hoặc chiều cao sẽ tính lại hành trình.</p>');
 const roomLabel=cadForm.querySelector('[data-machine-room]');roomLabel.hidden=mrl;roomLabel.querySelector('input').disabled=mrl;
 selectCadKind();cadDialog.showModal();
});
cadForm.onsubmit=event=>{event.preventDefault();if($('#technical-form').reportValidity())renderCad(cadOptions())};
$('#technical-form').onsubmit=event=>{event.preventDefault();cadForm.requestSubmit()};
function invalidateCad(){saveDraft();cadDrawing=null;cadDialog.querySelector('[data-download]').disabled=true;cadDialog.querySelector('.cad-summary').textContent='';cadDialog.querySelector('.cad-status').textContent='Cần dựng lại bản vẽ.'};
cadForm.oninput=event=>{const key={OH:'overhead',PD:'pit'}[event.target.name];if(key){$('#'+key).value=event.target.value;saveSearch()}invalidateCad()};
$('#technical-form').oninput=event=>{
 const mapping={SPD:'speed',AA:'carWidth',BB:'carDepth',JJ:'doorWidth',ENTR:'entrance',DRTP:'fire',GOVO:'safety',DRKI:'doorType'};
 const name=event.target.name,key=mapping[name];if(key){$('#search-form').elements.namedItem(key).value=name==='DRKI'&&['2SL','2SR'].includes(event.target.value)?'SO':event.target.value;saveSearch();$('#status').textContent='Cấu hình đã chỉnh. Tìm lại để cập nhật các phương án khác.'}
 invalidateCad();
};
cadDialog.querySelector('[data-download]').onclick=async()=>{
 if(!cadDrawing||cadExportBusy)return;
 const drawing=cadDrawing,button=cadDialog.querySelector('[data-download]'),status=cadDialog.querySelector('.cad-status');
 cadExportBusy=true;button.disabled=true;status.textContent='Đang tạo DWG…';
 try{
  const bytes=await toDwg(toDxf(drawing));
  if(cadDrawing!==drawing||!cadDialog.open)return;
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/acad'})),a=document.createElement('a');
  a.href=url;a.download=drawing.filename+'.dwg';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='Đã tạo DWG.';
 }catch(error){if(cadDrawing===drawing&&cadDialog.open)status.textContent=error.message}
 finally{cadExportBusy=false;button.disabled=!cadDrawing}
};
