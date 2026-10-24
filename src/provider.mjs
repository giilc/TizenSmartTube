import {normalizeVideos, normalizeSegments} from './core.mjs';
import {mediaUrl,parseHlsFormats,formatLabel} from './formats.mjs';

// Metadata/player-script requests only; media playback goes directly to AVPlay.
// Buffer with a cap so the deadline includes the response body, not just headers.
export async function timedFetch(input, options = {}, timeoutMs = 18000) {
  const controller = new AbortController();
  const abort=()=>controller.abort();
  if(options.signal?.aborted)abort();
  options.signal?.addEventListener('abort',abort,{once:true});
  const timeout = setTimeout(abort,timeoutMs);
  let reader;
  try {
    const response=await fetch(input,{...options,signal:controller.signal});
    const chunks=[];let size=0;
    if(response.body){
      reader=response.body.getReader();
      while(true){
        const {done,value}=await reader.read();if(done)break;
        size+=value.byteLength;
        if(size>16*1024*1024)throw Error('Metadata response exceeded 16 MiB.');
        chunks.push(value);
      }
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const result=new Response([204,205,304].includes(response.status)?null:bytes,
      {status:response.status,statusText:response.statusText,headers:response.headers});
    Object.defineProperty(result,'url',{value:response.url});
    return result;
  }catch(error){abort();throw error;}
  finally { clearTimeout(timeout);options.signal?.removeEventListener('abort',abort);reader?.releaseLock(); }
}

export class VideoProvider {
  constructor(create, request = timedFetch) { this.create=create; this.request=request; this.session=null; }
  async client() {
    if(!this.session) this.session=this.create().catch(e=>{this.session=null; throw e;});
    return this.session;
  }
  async search(query) {
    if (!query.trim()) return [];
    const client=await this.client();
    const result=await client.search(query.trim(),{type:'video'});
    return normalizeVideos(result.videos).slice(0,32);
  }
  async home(){
    const client=await this.client();
    const feed=await client.getHomeFeed();
    return normalizeVideos(feed.videos).slice(0,24);
  }
  async playback(id) {
    if(!/^[\w-]{11}$/.test(id)) throw Error('Invalid video ID.');
    const client=await this.client();
    // VISIONOS supplies adaptive HLS on this TV's tested path; TV may only
    // expose 360p combined MP4. Prefer the complete manifest before fallback.
    let lastError='YouTube did not supply a playable stream.';
    for(const clientName of ['VISIONOS','TV','IOS','ANDROID_VR']) {
      const info=await client.getBasicInfo(id,{client:clientName});
      const state=info.playability_status?.status;
      if(state!=='OK') {
        lastError=info.playability_status?.reason || 'YouTube did not allow playback.';
        // Do not turn an account/age/bot challenge into an automatic retry loop.
        if(state!=='UNPLAYABLE'&&state!=='ERROR')throw Error(lastError);
        continue;
      }
      const data=info.streaming_data || {};
      const manifest=data.hls_manifest_url || data.dash_manifest_url;
      const protocol=data.hls_manifest_url?'hls':'dash';
      let formats=[],formatsError;
      if(manifest){
        const url=mediaUrl(manifest);
        formats=[{id:'auto',label:'Auto · '+protocol.toUpperCase(),url,protocol,height:0,fps:0,codec:'',bitrate:0}];
        if(protocol==='hls')try{
          const response=await this.request(url);
          if(!response.ok)throw Error('Playlist request failed ('+response.status+').');
          formats=parseHlsFormats(await response.text(),url);
        }catch{formatsError='Quality list unavailable; automatic playback remains available.';}
      }else{
        const progressive=(data.formats || []).filter(f=>f.has_video&&f.has_audio&&f.mime_type?.startsWith('video/mp4'))
          .sort((a,b)=>(b.height || 0)-(a.height || 0));
        if(!progressive.length){
          lastError=data.server_abr_streaming_url?'This stream requires SABR playback, which is not implemented yet.':
            'YouTube supplied no compatible HLS, DASH or combined MP4 stream.';
          continue;
        }
        for(const f of progressive){
          const url=mediaUrl(await f.decipher(client.session?.player));
          const choice={id:'mp4-'+(f.itag ?? formats.length),url,protocol:'mp4',height:f.height || 0,
            fps:f.fps || 0,codec:f.mime_type?.match(/codecs="([^"]+)"/)?.[1] || '',bitrate:f.bitrate || 0};
          choice.label=formatLabel(choice);formats.push(choice);
        }
      }
      const selected=formats[0];
      return {...selected,formats,selectedFormatId:selected.id,formatsError,client:clientName,
        title:info.basic_info?.title || '',duration:info.basic_info?.duration || 0,
        quality:selected.label,live:!!info.basic_info?.is_live};
    }
    throw Error(lastError);
  }
  async segments(id,duration,categories=['sponsor']) {
    if(!/^[\w-]{11}$/.test(id)) throw Error('Invalid video ID.');
    const url='https://sponsor.ajay.app/api/skipSegments?videoID='+encodeURIComponent(id)+
      '&categories='+encodeURIComponent(JSON.stringify(categories));
    const response=await this.request(url);
    if(response.status===404) return [];
    if(!response.ok) throw Error('SponsorBlock unavailable ('+response.status+').');
    return normalizeSegments(await response.json(),categories,duration || Infinity);
  }
}
