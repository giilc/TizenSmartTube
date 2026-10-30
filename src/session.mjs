import {Innertube,Platform,Player} from 'youtubei.js/web';
import {timedFetch} from './provider.mjs';
import {createTvPlaybackClient} from './tv-provider.mjs';

// The player decipher script is retrieved by YouTube.js from YouTube itself.
Platform.shim.eval=async data=>new Function(data.output)();
// Avoid YouTube.js calling randomUUID on older Tizen web engines.
Platform.shim.uuidv4=()=> '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>
  (Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));
export function withTvPlayback(client,{createTv=createTvPlaybackClient,loadLegacyPlayer=()=>Player.create(undefined,timedFetch)}={}){
 const original=client.getBasicInfo.bind(client);let tv,legacy;
 client.getBasicInfo=async(id,options)=>{
  if(options?.client==='TV'){tv??=createTv();return tv.getBasicInfo(id);}
  const info=await original(id,options);
  const formats=[...(info.streaming_data?.formats||[]),...(info.streaming_data?.adaptive_formats||[])];
  if(!client.session.player&&formats.some(f=>f.signature_cipher||f.cipher||/[?&]n=/.test(f.url||''))){
   legacy??=loadLegacyPlayer().catch(e=>{legacy=null;throw e;});client.session.player=await legacy;
  }
  return info;
 };
 client.destroyPlayback=()=>{tv?.destroy();tv=null;};return client;
}
export const createSession=async()=>withTvPlayback(await Innertube.create({
  // Keep the visitor/session context issued by YouTube. Fabricating it locally
  // caused otherwise available VISIONOS HLS playback to return a bot challenge.
  // Surface initialization failure instead of silently falling back to that path.
  lang:'en',location:'PH',generate_session_locally:false,fail_fast:true,retrieve_player:false,fetch:timedFetch
}));
