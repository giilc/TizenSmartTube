import './polyfills.mjs';
import Hls from 'hls.js';
import dashjs from 'dashjs/dist/dash.mediaplayer.min.js';
import {createDashPlayer} from './dash-player.mjs';
import {markFormatSupport} from './adaptive.mjs';
import {createHlsPlayer,findHlsLevel} from './hls-player.mjs';
import {VideoProvider} from './provider.mjs';
import {createSession} from './session.mjs';
import {SponsorSession,SKIP_PRESETS} from './core.mjs';
import {prepareAvPlay,runPlayerAction} from './player.mjs';
import {codecLabel,resolutionLabel} from './formats.mjs';
import {gridTarget,readHistory,rememberVideo,preferredFormat,withFormat} from './ui-state.mjs';

const $=id=>document.getElementById(id);
const provider=new VideoProvider(createSession),av=window.webapis?.avplay,html=$('html-player');
const sponsorSession=new SponsorSession();
let hlsPlayer=null,dashPlayer=null;
const useAv=()=>!!av&&!['hls','dash'].includes(current?.engine);
const get=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};
let videos=[],generation=0,current=null,seeking=false,hideTimer,page='home',lastCard=0,modalReturn=null;
let history=readHistory(get('watchHistory','[]')),sponsorEnabled=get('sponsorEnabled','true')!=='false';
let skipPreset=Number(get('skipPreset','0'));if(!SKIP_PRESETS[skipPreset])skipPreset=0;
let qualityPreference=Number(get('qualityHeight','0'));if(![0,2160,1440,1080,720,480,360,240,144].includes(qualityPreference))qualityPreference=0;
const state={events:[],version:'0.3.18'};
window.portDiagnostics=()=>({...state,player:playerState(),time:current?position():0,videoId:current?.id||null,
 results:videos.length,page,quality:current?.quality||null,format:current?.selectedFormatId||null,
 formats:current?.formats?.map(({id,label,height,fps,codec,available})=>({id,label,height,fps,codec,available}))||[]});
function log(event,detail=''){state.events.push({at:Date.now(),event,detail:String(detail).slice(0,500)});if(state.events.length>50)state.events.shift();console.info('[TizenPort]',event,detail);}
function status(message){$('status').textContent=message;}
function focus(element){element?.focus();element?.scrollIntoView({block:'nearest',inline:'nearest'});}
function activeNav(){return document.querySelector('.nav-item.active');}
function playerState(){try{return useAv()?av.getState():html.paused?'PAUSED':'PLAYING';}catch{return 'NONE';}}
function position(){try{return useAv()?av.getCurrentTime()/1000:html.currentTime;}catch{return 0;}}
function duration(){try{return useAv()?av.getDuration()/1000:html.duration;}catch{return 0;}}
function clock(seconds){const n=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;return (n>=3600?Math.floor(n/3600)+':':'')+String(Math.floor(n/60)%60).padStart(n>=3600?2:1,'0')+':'+String(n%60).padStart(2,'0');}
function updateClock(){const d=new Date();$('wall-clock').textContent=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});$('wall-date').textContent=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}
updateClock();setInterval(updateClock,30000);
function updateSettings(){
 $('sponsor').textContent='SponsorBlock: '+(sponsorEnabled?'On':'Off');$('sponsor').setAttribute('aria-pressed',String(sponsorEnabled));
 $('skip-options').textContent='Skip: '+SKIP_PRESETS[skipPreset].label;
 $('default-quality').lastElementChild.textContent=qualityPreference?qualityPreference+'p maximum':'Auto';
}
$('sponsor').onclick=()=>{sponsorEnabled=!sponsorEnabled;save('sponsorEnabled',sponsorEnabled);updateSettings();};
$('skip-options').onclick=()=>{skipPreset=(skipPreset+1)%SKIP_PRESETS.length;save('skipPreset',skipPreset);updateSettings();};
$('clear-history').onclick=()=>{history=[];save('watchHistory','[]');status('Watch history cleared.');};
updateSettings();
function render(){
 $('results').textContent='';
 videos.forEach((video,index)=>{
  const button=document.createElement('button');button.className='video-card';button.dataset.index=index;
  const thumb=document.createElement('span');thumb.className='thumbnail';
  const img=document.createElement('img');img.alt='';if(/^https:\/\//.test(video.thumbnail))img.src=video.thumbnail;
  const badge=document.createElement('span');badge.className='video-duration';badge.textContent=video.duration||'';if(!video.duration)badge.classList.add('hidden');thumb.append(img,badge);
  const title=document.createElement('span');title.className='title';title.textContent=video.title;
  const author=document.createElement('span');author.className='author';author.textContent=video.author;
  button.append(thumb,title,author);button.onclick=()=>{lastCard=index;play(video);};$('results').append(button);
 });
}
async function browse(next){
 const request=++generation;page=next;status('');
 document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 $('search-form').classList.toggle('hidden',page!=='search');$('settings-panel').classList.toggle('hidden',page!=='settings');
 $('results').classList.toggle('hidden',page==='settings');$('section-title').textContent={home:'Home',search:'Search',music:'Music',gaming:'Gaming',history:'Watch history',settings:'Settings'}[page];
 videos=[];render();$('content').scrollTop=0;
 if(page==='settings'){updateSettings();return;}
 if(page==='history'){videos=history;render();status(videos.length?'':'Videos you play will appear here.');return;}
 if(page==='search'){status('Find a video, channel or topic.');focus($('query'));return;}
 status('Loading…');
 try{
  let found=page==='home'?await provider.home():await provider.search(page==='music'?'music':'gaming');
  if(request!==generation)return;
  if(page==='home'&&!found.length){found=history.length?history:await provider.search('popular videos');if(request!==generation)return;$('section-title').textContent=history.length?'Recently watched':'Popular videos';}
  videos=found;render();status(videos.length?'':page==='home'?'Your home feed is empty. Select Search to find something to watch.':'No videos found.');
 }catch(error){if(request===generation){status('Unable to load videos. Select Search to try a specific video.');log('browse-error',error.message);}}
}
async function search(query){
 if(!query.trim()){status('Enter a search term.');focus($('query'));return;}
 const request=++generation;status('Searching…');log('search',query);
 try{const found=await provider.search(query);if(request!==generation)return;videos=found;render();$('section-title').textContent='Search results';status(videos.length?'':'No videos found. Try another search.');focus($('results').firstElementChild);log('search-complete',videos.length);}
 catch(error){if(request===generation){status('Search unavailable: '+error.message);log('search-error',error.message);}}
}
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>browse(b.dataset.page));
$('quick-search').onclick=()=>browse('search');$('search-form').onsubmit=e=>{e.preventDefault();search($('query').value);};

function openMenu(title,description,options,selected,onSelect){
 modalReturn=document.activeElement;$('modal-title').textContent=title;$('modal-description').textContent=description;$('modal-options').textContent='';
 options.forEach(option=>{
  const b=document.createElement('button');b.className='format-option'+(option.id===selected?' selected':'');b.setAttribute('role','radio');b.setAttribute('aria-checked',String(option.id===selected));
  const dot=document.createElement('span');dot.className='radio';const text=document.createElement('span');text.textContent=option.label;
  if(option.detail){const detail=document.createElement('span');detail.className='option-detail';detail.textContent=option.detail;text.append(detail);}
  if(option.available===false){b.setAttribute('aria-disabled','true');b.classList.add('unavailable');}
  b.append(dot,text);b.onclick=()=>{if(option.available===false)return;closeMenu();onSelect(option);};$('modal-options').append(b);
 });
 $('modal-options').setAttribute('role','radiogroup');$('modal').classList.remove('hidden');clearTimeout(hideTimer);focus($('modal-options').querySelector('.selected')||$('modal-options').firstElementChild);
}
function closeMenu(){const target=modalReturn;$('modal').classList.add('hidden');modalReturn=null;if(target?.isConnected)focus(target);if(current)showInfo();}
$('default-quality').onclick=()=>openMenu('Default video quality','Choose a maximum resolution. The closest available format will be used.',[0,2160,1440,1080,720,480,360,240,144].map(h=>({id:String(h),label:h?h+'p maximum':'Auto · adaptive quality'})),String(qualityPreference),o=>{qualityPreference=Number(o.id);save('qualityHeight',qualityPreference);updateSettings();});
function streamDetails(){
 if(!useAv())return html.videoWidth&&html.videoHeight?html.videoWidth+' × '+html.videoHeight:'';
 try{const info=av?.getCurrentStreamInfo?.().find(t=>t.type==='VIDEO');const data=JSON.parse(info?.extra_info||'{}');return data.Width&&data.Height?data.Width+' × '+data.Height+(data.fourCC?' · '+data.fourCC:''):'';}catch{return '';}
}
function qualityMenu(){
 if(!current||seeking)return;
 const formats=current.formats||[];
 if(!formats.length){$('player-status').textContent='No alternative formats are available.';showInfo();return;}
 openMenu('Video format','Available streams for this video.'+(streamDetails()?' Playing: '+streamDetails()+'.':'')+(current.live?' Live stream.':' Your position is kept.'),formats.map(f=>({...f,label:f.id==='auto'?'Auto · adaptive quality':(resolutionLabel(f)+' · '+codecLabel(f.codec)),detail:[f.available===false?(f.unavailableReason||'Unavailable on this TV'):'',f.protocol?.toUpperCase(),f.bitrate?(f.bitrate/1000000).toFixed(2)+' Mbps':''].filter(Boolean).join(' · ')})),current.selectedFormatId,option=>changeFormat(formats.find(f=>f.id===option.id)));
}
$('quality').onclick=qualityMenu;
function showInfo(){
 $('player-info').classList.remove('dim');clearTimeout(hideTimer);
 hideTimer=setTimeout(()=>{if(current&&!seeking&&$('modal').classList.contains('hidden')&&!$('player-controls').contains(document.activeElement))$('player-info').classList.add('dim');},5000);
}
function seek(seconds,onSuccess){
 if(!current||seeking||current.live)return;const request=generation;const total=duration()||current.duration||seconds;
 const target=Math.max(0,Math.min(seconds,Math.max(0,total-.25)));seeking=true;
 const done=()=>{if(request===generation){seeking=false;onSuccess?.();}};
 const failed=e=>{if(request===generation){seeking=false;log('seek-error',e?.message||e);}};
 try{if(useAv())av.seekTo(target*1000,done,failed);else{html.currentTime=target;done();}}catch(e){failed(e);}
}
function resumeHtml(){const request=generation;html.play().catch(error=>{if(request===generation)failPlayback(error);});}
function toggle(){
 if(!current)return;try{if(useAv()){const s=av.getState();if(s==='PLAYING')av.pause();else if(s==='PAUSED')av.play();}else if(html.paused)resumeHtml();else html.pause();showInfo();}catch(e){failPlayback(e);}
}
$('rewind').onclick=()=>{seek(position()-10);showInfo();};$('forward').onclick=()=>{seek(position()+10);showInfo();};$('play-pause').onclick=toggle;$('player-back').onclick=()=>stop();
function closePlayer(){dashPlayer?.destroy();dashPlayer=null;hlsPlayer?.destroy();hlsPlayer=null;html.onloadedmetadata=null;try{if(av&&av.getState()!=='NONE')av.close();html.pause();html.removeAttribute('src');html.load();}catch(e){log('close-error',e.message);}}
function stop(){
 ++generation;current=null;sponsorSession.setVideo(null,[]);seeking=false;clearTimeout(hideTimer);$('modal').classList.add('hidden');modalReturn=null;closePlayer();
 $('playback').classList.add('hidden');$('browser').classList.remove('hidden');document.body.classList.remove('playing');
 focus($('results').children[lastCard]||activeNav());log('stopped');
}
function failPlayback(error){state.lastPlaybackError={code:error?.dashCode??null,httpStatus:error?.httpStatus??null,mediaType:error?.mediaType??null,position:error?.position??null};log('player-error',error?.message||error);stop();status('Playback unavailable: '+(error?.message||error));}
function startSource(source,{request=generation,startPosition=0,paused=false,onError=failPlayback,onReady=()=>{}}={}){
 html.classList.toggle('hidden',useAv());$('av-player').classList.toggle('hidden',!useAv());
 const ready=()=>{if(request!==generation)return;seeking=false;$('player-status').textContent=source.label||source.quality||'Auto';$('quality-label').textContent=source.height?resolutionLabel(source):'Auto';log('playing',source.id||source.quality);showInfo();onReady();};
 const failed=e=>{if(request===generation){seeking=false;onError(e);}};
 if(current?.engine==='dash'){
  let next;try{next=createDashPlayer(html,source,{isCurrent:()=>request===generation,startPosition,paused,onError:failed,onReady:ready,
   onEnded:()=>{stop();status('Video finished.');},onBuffering:()=>{$('player-status').textContent='Buffering…';showInfo();},onBuffered:()=>{$('player-status').textContent=source.label||source.quality;}},dashjs);
  }catch(e){failed(e);return;}
  if(request===generation)dashPlayer=next;else next.destroy();
 }else if(current?.engine==='hls'){
  hlsPlayer=createHlsPlayer(html,source,{isCurrent:()=>request===generation,startPosition,paused,onError:failed,onReady:ready,
   onEnded:()=>{stop();status('Video finished.');},onBuffering:()=>{$('player-status').textContent='Buffering…';showInfo();},onBuffered:()=>{$('player-status').textContent=source.label||source.quality||'Auto';},
   onEvent:(type,data)=>{if(type==='HLS_LEVEL_SWITCHED')log('level',data.height+'p');if(type==='HLS_MANIFEST_PARSED'&&current){current.formats=current.formats.map(f=>f.protocol==='hls'?({...f,available:findHlsLevel(data.levels,f)!==null,unavailableReason:'Codec/format not supported by this TV'}):f);}}
  },Hls);
 }else if(av)prepareAvPlay(av,source,{isCurrent:()=>request===generation,onError:failed,startPosition,paused,
  onEvent:(type,data)=>{if(['PLAYER_MSG_RESOLUTION_CHANGED','PLAYER_MSG_BITRATE_CHANGE'].includes(type)){state.nativeEvent=type+': '+String(data).slice(0,180);log(type,data);}},onEnded:()=>{stop();status('Video finished.');},onBuffering:()=>{$('player-status').textContent='Buffering…';showInfo();},onBuffered:()=>{$('player-status').textContent=source.label||source.quality||'Auto';},onReady:ready});
 else{
  html.src=source.url;html.onloadedmetadata=()=>{if(request!==generation)return;if(startPosition)html.currentTime=startPosition;if(paused){html.pause();ready();}else html.play().then(ready).catch(failed);};html.load();
 }
}
function changeFormat(format){
 if(!current||!format||format.available===false||format.id===current.selectedFormatId)return;
 const previous={...current},t=current.live?0:position(),paused=playerState()==='PAUSED';const request=++generation;seeking=true;let switched=false;
 closePlayer();current=withFormat(current,format);$('player-status').textContent='Changing format…';showInfo();
 startSource(format,{request,startPosition:t,paused,onReady:()=>{switched=true;qualityPreference=format.height||0;save('qualityHeight',qualityPreference);updateSettings();},onError:error=>{
  if(switched){failPlayback(error);return;}log('format-error',error?.message||error);const restoreRequest=++generation;closePlayer();current=previous;
  startSource(previous,{request:restoreRequest,startPosition:t,paused,onReady:()=>{$('player-status').textContent='That format could not play. Previous format restored.';showInfo();}});
 }});
}
async function play(video){
 if(current)stop();const request=++generation;status('Opening '+video.title+'…');log('open',video.id);
 try{
  const source=await provider.playback(video.id);if(request!==generation)return;
  source.formats=markFormatSupport(source.formats||[],type=>window.MediaSource?.isTypeSupported(type)).map(f=>({...f,engine:f.engine||(f.protocol==='hls'&&Hls.isSupported()?'hls':'av')}));
  const format=preferredFormat(source.formats,qualityPreference);
  if(!format)throw Error('This TV cannot decode the available video/audio codecs.');
  current=withFormat({...video,...source,id:video.id,engine:source.engine||(source.protocol==='hls'&&Hls.isSupported()?'hls':'av')},format);sponsorSession.setVideo(video.id,[]);
  $('video-title').textContent=video.title;$('player-status').textContent='Loading video…';$('browser').classList.add('hidden');$('playback').classList.remove('hidden');document.body.classList.add('playing');
  $('html-player').classList.toggle('hidden',useAv());$('av-player').classList.toggle('hidden',!useAv());document.activeElement?.blur();showInfo();
  const remember=()=>{history=rememberVideo(history,video);save('watchHistory',JSON.stringify(history));};
  startSource(current,{request,onReady:remember,onError:error=>{
   const automatic=current?.formats?.find(f=>f.id==='auto');
   if(current?.engine==='hls'&&current.selectedFormatId!=='auto'&&automatic&&error.code==='UNSUPPORTED_FORMAT'){
    const retry=++generation;closePlayer();current=withFormat(current,automatic);
    startSource(current,{request:retry,onReady:()=>{remember();$('player-status').textContent='Saved format unavailable. Playing Auto.';showInfo();}});
   }else failPlayback(error);
  }});
  if(!source.live)provider.segments(video.id,source.duration,SKIP_PRESETS[skipPreset].categories).then(found=>{if(current?.id===video.id){sponsorSession.setVideo(video.id,found);log('segments',found.length);}}).catch(e=>{if(current?.id===video.id)log('sponsorblock-error',e.message);});
 }catch(e){if(request===generation)failPlayback(e);}
}
html.addEventListener('error',()=>{if(current&&!['hls','dash'].includes(current.engine))failPlayback('The media stream could not be played.');});html.addEventListener('ended',()=>{if(current&&!['hls','dash'].includes(current.engine)){stop();status('Video finished.');}});
setInterval(()=>{
 if(!current)return;const t=position(),d=duration()||current.duration||0;$('timeline').textContent=clock(t)+' / '+clock(d);$('progress-fill').style.width=Math.max(0,Math.min(100,d?t/d*100:0))+'%';
 const actual=streamDetails();$('stream-details').textContent=(actual?'Playing '+actual:'');
 const playing=playerState()==='PLAYING';$('play-pause').textContent=playing?'Pause':'Play';if(!playing||seeking)return;
 const target=sponsorSession.target(t,{enabled:sponsorEnabled,playing,speed:1});if(target!==null)seek(target,()=>{sponsorSession.confirm(target);$('player-status').textContent='Segment skipped';showInfo();log('sponsor-skipped',`${t} → ${target}`);});
},250);
document.addEventListener('keydown',e=>{
 const key=e.keyCode,direction={37:'left',38:'up',39:'right',40:'down'}[key],back=[10009,27].includes(key),focused=document.activeElement;
 if(!$('modal').classList.contains('hidden')){
  if(back){e.preventDefault();closeMenu();}else if(direction){e.preventDefault();const buttons=[...$('modal-options').children],i=buttons.indexOf(focused);focus(buttons[Math.max(0,Math.min(buttons.length-1,i+(key===38||key===37?-1:1)))]);}return;
 }
 if(current){
  if(back||key===413){e.preventDefault();if($('player-controls').contains(focused)&&key!==413){focused.blur();$('player-info').classList.add('dim');}else stop();return;}
  if([32,10252].includes(key)){e.preventDefault();toggle();return;}
  if(key===415||key===19){e.preventDefault();runPlayerAction(()=>{if(key===415){if(useAv()&&av.getState()==='PAUSED')av.play();else if(!useAv())resumeHtml();}else{if(useAv()&&av.getState()==='PLAYING')av.pause();else if(!useAv())html.pause();}showInfo();},failPlayback);return;}
  if($('player-controls').contains(focused)){
   if(direction){e.preventDefault();const buttons=[...$('player-controls').children],i=buttons.indexOf(focused);if(key===38){focused.blur();}else if(key!==40)focus(buttons[Math.max(0,Math.min(buttons.length-1,i+(key===37?-1:1)))]);showInfo();}return;
  }
  if(key===13){e.preventDefault();toggle();}else if(key===37||key===39){e.preventDefault();seek(position()+(key===37?-10:10));showInfo();}else if(key===38||key===40){e.preventDefault();showInfo();focus($('play-pause'));}return;
 }
 if(back){e.preventDefault();++generation;if(focused===activeNav()&&page==='home'){try{window.tizen?.application.getCurrentApplication().exit();}catch{}}else focus(activeNav());return;}
 if(!direction)return;
 if(focused.classList.contains('video-card')){
  e.preventDefault();const next=gridTarget(Number(focused.dataset.index),direction,videos.length,3);if(next==='sidebar')focus(activeNav());else if(next==='header')focus(page==='search'?$('query'):activeNav());else focus($('results').children[next]);
 }else if(focused.classList.contains('nav-item')||focused===$('quick-search')){
  e.preventDefault();const nav=[$('quick-search'),...document.querySelectorAll('.nav-item')],i=nav.indexOf(focused);
  if(key===39)focus(page==='settings'?$('default-quality'):page==='search'?$('query'):$('results').firstElementChild||activeNav());
  else if(key===38||key===40)focus(nav[Math.max(0,Math.min(nav.length-1,i+(key===38?-1:1)))]);
 }else if($('settings-panel').contains(focused)){
  e.preventDefault();const buttons=[...$('settings-panel').querySelectorAll('button')],i=buttons.indexOf(focused);if(key===37)focus(activeNav());else if(key===38||key===40)focus(buttons[Math.max(0,Math.min(buttons.length-1,i+(key===38?-1:1)))]);
 }else if(focused===$('query')){
  if(key===40){e.preventDefault();focus($('results').firstElementChild||$('search'));}else if(key===38){e.preventDefault();focus($('search'));}
 }else if(focused===$('search')){e.preventDefault();if(key===37)focus($('query'));else if(key===40)focus($('results').firstElementChild||$('query'));else if(key===38)focus(activeNav());}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&current){try{if(useAv()&&av.getState()==='PLAYING')av.pause();else if(!useAv())html.pause();}catch{}}});
try{window.tizen?.tvinputdevice.registerKeyBatch(['MediaPlayPause','MediaPlay','MediaPause','MediaStop']);}catch(e){log('remote-registration',e.message);}
window.addEventListener('unhandledrejection',e=>{log('unhandled',e.reason?.message||e.reason);status('Error: '+(e.reason?.message||e.reason));});
window.addEventListener('error',e=>{log('error',e.message);status('Error: '+e.message);});
focus(activeNav());browse('home');log('ready',navigator.userAgent);
