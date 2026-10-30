import {mediaUrl} from './formats.mjs';
export function createTvSolver({workerFactory=()=>new Worker('tv-decipher-worker.js'),loadTimeout=45000,solveTimeout=8000}={}){
 const worker=workerFactory(),pending=new Map(),cache=new Map();let nextId=0,stopped=false,preparation;
 const stop=(message='TV decipher worker stopped.')=>{
  if(stopped)return;stopped=true;worker.terminate();
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}pending.clear();cache.clear();
 };
 worker.addEventListener('message',event=>{
  const p=pending.get(event.data?.id);if(!p)return;pending.delete(event.data.id);clearTimeout(p.timer);
  if(event.data.error)p.reject(Error(p.kind==='prepare'?'TV player solver preparation failed.':'TV decipher failed.'));
  else p.resolve(event.data.result);
 });
 worker.addEventListener('error',()=>stop('TV decipher worker failed.'));
 const request=(type,data,timeout)=>new Promise((resolve,reject)=>{
  if(stopped){reject(Error('TV decipher worker stopped.'));return;}
  const id=++nextId,timer=setTimeout(()=>stop('TV decipher worker timed out.'),timeout);pending.set(id,{resolve,reject,timer,kind:type});
  try{worker.postMessage({id,type,...data});}catch{stop('TV decipher worker failed.');}
 });
 const solve=async(type,value)=>{
  const key=type+':'+value;if(cache.has(key))return cache.get(key);
  const result=await request('solve',{operation:type,value},solveTimeout);
  if(typeof result!=='string'||!result.length||result.startsWith('enhanced_except_'))throw Error('TV decipher returned an invalid result.');
  if(cache.size>=256)cache.clear();cache.set(key,result);return result;
 };
 return {
  get stopped(){return stopped;},
  prepare(source){
   if(typeof source!=='string'||!source.length)return Promise.reject(Error('Missing TV player script.'));
   preparation??=request('prepare',{source},loadTimeout).then(result=>{if(result!==true)throw Error('TV player solver preparation failed.');}).catch(e=>{stop();throw e;});return preparation;
  },
  async decipher(raw,cipher){
   if(!preparation)throw Error('TV solver is not prepared.');await preparation;
   const params=cipher?new URLSearchParams(cipher):null;const url=new URL(mediaUrl(params?.get('url')||raw));
   if(params?.get('s')){const field=params.get('sp')||'signature';if(!['sig','signature'].includes(field))throw Error('Unsupported signature field.');url.searchParams.set(field,await solve('sig',params.get('s')));}
   if(url.searchParams.has('n'))url.searchParams.set('n',await solve('n',url.searchParams.get('n')));
   return mediaUrl(url.href);
  },
  destroy:()=>stop()
 };
}
