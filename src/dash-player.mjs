import {dashManifest} from './adaptive.mjs';

// A single chosen video representation plus audio keeps a manual choice exact.
// dash.js handles byte-range loading, synchronization and seek scheduling.
export function createDashPlayer(video,source,hooks,dashjs,urlAPI=URL){
 const manifest=dashManifest(source);
 const objectUrl=urlAPI.createObjectURL(new Blob([manifest],{type:'application/dash+xml'}));
 let player;
 try{player=dashjs.MediaPlayer().create();}catch(e){urlAPI.revokeObjectURL(objectUrl);throw e;}
 let destroyed=false,failed=false,started=false;
 const active=()=>!destroyed&&!failed&&(hooks.isCurrent?.() ?? true);
 let timer;
 const fail=error=>{if(!active())return;failed=true;clearTimeout(timer);Promise.resolve().then(()=>{if(!destroyed&&(hooks.isCurrent?.() ?? true))hooks.onError?.(error instanceof Error?error:Error(String(error)));});};
 const guard=fn=>(...args)=>{if(active())try{fn(...args);}catch(e){fail(e);}};
 const listeners=[];
 const listen=(name,fn)=>{const callback=guard(fn);listeners.push([name,callback]);video.addEventListener(name,callback);};
 const ready=guard(()=>{clearTimeout(timer);hooks.onReady?.();});
 listen('canplay',()=>{
  hooks.onBuffered?.();if(started)return;started=true;
  const target=Number(hooks.startPosition)||0;
  if(target>0&&Math.abs(video.currentTime-target)>.1)video.currentTime=target;
  if(hooks.paused){video.pause();ready();}else Promise.resolve(video.play()).then(ready,fail);
 });
 listen('waiting',()=>hooks.onBuffering?.());listen('playing',()=>hooks.onBuffered?.());
 listen('ended',()=>hooks.onEnded?.());listen('error',()=>fail(Error(`TV media element failed (code ${video.error?.code||'unknown'}).`)));
 player.on(dashjs.MediaPlayer.events.ERROR,guard(event=>{
  // dash.js errors may contain signed URLs. Expose only numeric library codes.
  const code=Number(event.error?.code),data=event.error?.data;
  const status=Number(data?.response?.status),httpStatus=Number.isInteger(status)&&status>=100&&status<=599?status:0;
  const mediaType=['audio','video','text'].includes(data?.request?.mediaType)?data.request.mediaType:'media';
  const download=[25,26,27,28].includes(code);
  const error=Error(download?`DASH ${mediaType} download failed (${httpStatus?'HTTP '+httpStatus:'network error'}, code ${code}).`:`DASH playback failed (code ${Number.isFinite(code)?code:'unknown'}).`);
  Object.assign(error,{dashCode:Number.isFinite(code)?code:null,httpStatus,mediaType,position:Number.isFinite(video.currentTime)?video.currentTime:0});
  fail(error);
 }));
 timer=setTimeout(()=>fail(Error('DASH playback startup timed out.')),30000);
 try{
  player.updateSettings({debug:{logLevel:0},streaming:{abr:{autoSwitchBitrate:{video:false,audio:false}},buffer:{stableBufferTime:12,bufferTimeAtTopQuality:15,bufferTimeAtTopQualityLongForm:15},text:{defaultEnabled:false}}});
  player.initialize(video,objectUrl,false,Number(hooks.startPosition)||0);
 }catch(e){fail(e);}
 return {player,destroy(){
  if(destroyed)return;destroyed=true;clearTimeout(timer);
  for(const [name,fn] of listeners)video.removeEventListener(name,fn);
  try{player.reset();}finally{urlAPI.revokeObjectURL(objectUrl);}
 }};
}
