import init, {encode_dwg} from './cad-assets/dwg/elevator_dwg.js';
self.onmessage = async ({data}) => {
 try {
  await init();
  const bytes = encode_dwg(new TextEncoder().encode(data));
  self.postMessage({bytes}, [bytes.buffer]);
 } catch (error) {
  self.postMessage({error: String(error?.message ?? error)});
 }
};
