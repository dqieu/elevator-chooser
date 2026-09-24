// A fresh worker bounds each export's lifetime and releases WASM memory afterwards.
export function toDwg(dxf) {
 return new Promise((resolve,reject) => {
  const worker = new Worker(new URL('./dwg-worker.mjs?v=20260924-specdefaults',import.meta.url),{type:'module'});
  const finish = (error,bytes) => {clearTimeout(timer);worker.terminate();error?reject(error):resolve(bytes)};
  const timer = setTimeout(()=>finish(new Error('Tạo DWG quá lâu. Vui lòng thử lại.')),60000);
  worker.onerror = ()=>finish(new Error('Không tải được bộ xuất DWG. Vui lòng tải lại trang và thử lại.'));
  worker.onmessage = ({data}) => {
   if(data.error){finish(new Error('Không tạo được DWG: '+data.error));return}
   if(!(data.bytes instanceof Uint8Array)||new TextDecoder().decode(data.bytes.slice(0,6))!=='AC1032'){
    finish(new Error('Dữ liệu DWG không hợp lệ.'));return;
   }
   finish(null,data.bytes);
  };
  worker.postMessage(dxf);
 });
}
