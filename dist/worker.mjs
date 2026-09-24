import {search} from './chooser.mjs?v=20260924-specdefaults';
self.onmessage=({data})=>{try{const result=search(data.request,progress=>self.postMessage({id:data.id,progress}));self.postMessage({id:data.id,result})}catch(error){self.postMessage({id:data.id,error:error.message})}};
