import {mediaUrl,formatLabel} from './formats.mjs';
const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function range(value){
 const start=Number(value?.start),end=Number(value?.end);
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start)throw Error('Invalid media byte range.');
 return `${start}-${end}`;
}
async function resolveTrack(format,player){
 const mime=/^(video|audio)\/(mp4|webm);\s*codecs="([a-zA-Z0-9., _-]+)"/.exec(format.mime_type || '');
 if(!mime||!(Number(format.bitrate)>0))throw Error('Incomplete media format.');
 const init=range(format.init_range),index=range(format.index_range);
 const url=mediaUrl(await format.decipher(player));
 return {itag:format.itag,url,mime:mime[1]+'/'+mime[2],codec:mime[3],bitrate:format.bitrate,init,index,
  width:Math.round(format.width || 0),height:format.height || 0,fps:format.fps || 0,
  sampleRate:Number(format.audio_sample_rate)||48000,channels:Number(format.audio_channels)||2};
}
export async function adaptiveFormats(formats,player,duration){
 if(!Number.isFinite(duration)||duration<=0)return [];
 // Prefer the declared default language, then AAC for broad TV compatibility.
 const audioCandidates=formats.filter(f=>f.has_audio&&!f.has_video).sort((a,b)=>
  Number(!!b.audio_track?.audio_is_default)-Number(!!a.audio_track?.audio_is_default)||
  Number(/mp4a/.test(b.mime_type))-Number(/mp4a/.test(a.mime_type))||(b.bitrate||0)-(a.bitrate||0));
 let audio;
 for(const candidate of audioCandidates)try{audio=await resolveTrack(candidate,player);break;}catch{/* Try another valid audio track. */}
 if(!audio)return [];
 const choices=[],seen=new Set();
 for(const f of formats.filter(f=>f.has_video&&!f.has_audio&&f.height>0)){
  try{
   const video=await resolveTrack(f,player),id=`adaptive-${video.itag}-${audio.itag}`;
   if(seen.has(id))continue;seen.add(id);
   const choice={id,url:video.url,protocol:'dash',engine:'dash',video,audio,duration,
    height:video.height,fps:video.fps,codec:video.codec+','+audio.codec,bitrate:video.bitrate+audio.bitrate};
   choice.label=formatLabel(choice);choices.push(choice);
  }catch{/* Malformed or inaccessible tracks are not playback candidates. */}
 }
 return choices.sort((a,b)=>b.height-a.height||b.fps-a.fps||Number(/avc/.test(b.video.codec))-Number(/avc/.test(a.video.codec))||b.bitrate-a.bitrate);
}
export function markFormatSupport(formats,supports){
 return formats.map(f=>{
  if(!f.video||!f.audio)return f;
  let available=false;
  try{available=!!supports?.(`${f.video.mime}; codecs="${f.video.codec}"`)&&!!supports?.(`${f.audio.mime}; codecs="${f.audio.codec}"`);}catch{}
  return {...f,available,unavailableReason:available?'':'Codec not supported by this TV'};
 });
}
export function dashManifest(format){
 if(!format.video||!format.audio||!Number.isFinite(format.duration)||format.duration<=0)throw Error('Incomplete adaptive source.');
 const adaptation=(track,type)=>`<AdaptationSet contentType="${type}" mimeType="${xml(track.mime)}" segmentAlignment="true"><Representation id="${xml(type+'-'+track.itag)}" bandwidth="${xml(track.bitrate)}" codecs="${xml(track.codec)}" ${type==='video'?`width="${xml(track.width)}" height="${xml(track.height)}"${track.fps?` frameRate="${xml(track.fps)}"`:''}`:`audioSamplingRate="${xml(track.sampleRate)}"`}><BaseURL>${xml(mediaUrl(track.url))}</BaseURL><SegmentBase indexRange="${xml(track.index)}"><Initialization range="${xml(track.init)}"/></SegmentBase>${type==='audio'?`<AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="${xml(track.channels)}"/>`:''}</Representation></AdaptationSet>`;
 return `<?xml version="1.0" encoding="UTF-8"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" minBufferTime="PT1.5S" mediaPresentationDuration="PT${format.duration}S"><Period duration="PT${format.duration}S">${adaptation(format.video,'video')}${adaptation(format.audio,'audio')}</Period></MPD>`;
}
