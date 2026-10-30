import {YT} from 'youtubei.js/web';
import {timedFetch} from './provider.mjs';
import {createTvSolver} from './tv-solver.mjs';
import {mediaUrl} from './formats.mjs';
// Keep the request profile, timestamp and decipher script from the same TV
// player family. A desktop-player solver cannot decipher these TV URLs.
export const TV_CLIENT_VERSION='5.20260707';
const TV_CLIENT={clientName:'TVHTML5',clientVersion:TV_CLIENT_VERSION,deviceMake:'Samsung',deviceModel:'UKS9800',osName:'Tizen',osVersion:'2.4.0',userAgent:'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1'};
export function createTvPlaybackClient({request=timedFetch,solverFactory=createTvSolver}={}){
 let initialization,activeWorker,closed=false,queue=Promise.resolve();
 const text=async url=>{const r=await request(url);if(!r.ok)throw Error(`YouTube TV initialization failed (HTTP ${r.status}).`);return r.text();};
 const initialize=()=>initialization??=(async()=>{
  const page=await text('https://www.youtube.com/');const visitor=page.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];if(!visitor)throw Error('YouTube did not supply TV visitor data.');
  const tv=await text('https://www.youtube.com/tv');const path=tv.match(/\/s\/player\/[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+\.js/)?.[0];if(!path)throw Error('YouTube TV player script was not found.');
  const script=await text('https://www.youtube.com'+path);const timestamp=Number(script.match(/(?:signatureTimestamp|sts)\s*:\s*(\d{5,8})/)?.[1]);if(!Number.isSafeInteger(timestamp)||timestamp<=0)throw Error('YouTube TV signature timestamp was not found.');
  return {visitor,timestamp,script};
 })().catch(error=>{initialization=null;throw error;});
 const resolveVideo=async id=>{
  if(closed)throw Error('TV provider stopped.');const {visitor,timestamp,script}=await initialize();if(closed)throw Error('TV provider stopped.');
  const r=await request('https://www.youtube.com/youtubei/v1/player?prettyPrint=false',{method:'POST',headers:{'Content-Type':'application/json','X-YouTube-Client-Name':'7','X-YouTube-Client-Version':TV_CLIENT_VERSION,'X-Goog-Visitor-Id':visitor},body:JSON.stringify({context:{client:{...TV_CLIENT,hl:'en',gl:'PH',visitorData:visitor}},videoId:id,contentCheckOk:true,racyCheckOk:true,playbackContext:{contentPlaybackContext:{html5Preference:'HTML5_PREF_WANTS',signatureTimestamp:timestamp}}})});
  if(!r.ok)throw Error(`YouTube TV metadata failed (HTTP ${r.status}).`);const data=await r.json();if(closed)throw Error('TV provider stopped.');
  if(data.playabilityStatus?.status!=='OK')return {playability_status:{status:data.playabilityStatus?.status||'ERROR',reason:data.playabilityStatus?.reason||'YouTube did not allow playback.'}};
  try{
   for(const key of ['adaptiveFormats','formats']){
    const decoded=[];
    for(const format of data.streamingData?.[key]||[]){
     if(format.drmFamilies?.length||format.drmTrackType)continue;
     const cipher=format.signatureCipher||format.cipher,raw=format.url||'';
     const needsSolver=!!cipher||/[?&]n=/.test(raw);
     if(needsSolver&&!activeWorker){activeWorker=solverFactory();await activeWorker.prepare(script);}
     try{
      let url;
      if(needsSolver)url=await activeWorker.decipher(raw,cipher);
      else url=mediaUrl(raw);
      const clean={...format,url};delete clean.signatureCipher;delete clean.cipher;decoded.push(clean);
     }catch(error){if(closed||activeWorker?.stopped)throw error;}
    }
    if(data.streamingData)data.streamingData[key]=decoded;
   }
  }finally{activeWorker?.destroy();activeWorker=null;}
  if(closed)throw Error('TV provider stopped.');
  const info=new YT.VideoInfo([{data}],undefined,'tizen-tv-session');
  // URLs are already deciphered. Release the large parser worker before MSE
  // allocates its video/audio buffers, and keep only the resulting strings.
  for(const f of [...(info.streaming_data?.adaptive_formats||[]),...(info.streaming_data?.formats||[])])f.decipher=async()=>f.url;
  return info;
 };
 return {
  async getBasicInfo(id){
   if(!/^[\w-]{11}$/.test(id))throw Error('Invalid video ID.');if(closed)throw Error('TV provider stopped.');
   const task=queue.then(()=>resolveVideo(id));queue=task.catch(()=>{});return task;
  },
  destroy(){closed=true;activeWorker?.destroy();activeWorker=null;}
 };
}
