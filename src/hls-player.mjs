function videoCodec(value=''){
  return value.split(',').map(part=>part.trim()).find(part=>/^(avc[13]|hev1|hvc1|vp09|vp9|av01)/i.test(part)) || '';
}
function family(value=''){
  const codec=videoCodec(value).toLowerCase();
  if(/^avc[13]/.test(codec))return 'avc';
  if(/^(hev1|hvc1)/.test(codec))return 'hevc';
  if(/^(vp09|vp9)/.test(codec))return 'vp9';
  return codec.split('.')[0];
}

// The library filters/reorders unsupported variants. Never use the provider's
// playlist index as the runtime level index, and never silently lower quality.
export function findHlsLevel(levels,format){
  if(format.id==='auto'||!format.height)return -1;
  const wantedCodec=videoCodec(format.codec || format.videoCodec),wantedFps=Number(format.fps || format.frameRate || 0);
  const candidates=levels.map((level,index)=>({level,index})).filter(({level})=>
    Number(level.height)===Number(format.height)&&
    (!wantedCodec||family(level.videoCodec || level.codec)===family(wantedCodec))&&
    (!wantedFps||Math.abs(Number(level.frameRate || level.fps || 0)-wantedFps)<1));
  if(!candidates.length)return null;
  candidates.sort((a,b)=>{
    const exactA=videoCodec(a.level.videoCodec || a.level.codec)===wantedCodec;
    const exactB=videoCodec(b.level.videoCodec || b.level.codec)===wantedCodec;
    return Number(exactB)-Number(exactA)||
      Math.abs(Number(a.level.bitrate)-Number(format.bitrate || 0))-Math.abs(Number(b.level.bitrate)-Number(format.bitrate || 0));
  });
  return candidates[0].index;
}

function levelInfo(level,index){
  const codec=level.videoCodec || level.codec || '';
  return {level:index,height:level.height || 0,width:level.width || 0,codec,videoCodec:codec,
    bitrate:level.bitrate || 0,maxBitrate:level.maxBitrate || level.bitrate || 0,
    fps:level.frameRate || 0,frameRate:level.frameRate || 0};
}

// Hls is injected so this module is testable without browser globals. Use the
// full hls.js build: its light build omits the alternate-audio controller.
export function createHlsPlayer(video,source,hooks,Hls){
  if(!Hls?.isSupported())throw Error('MediaSource playback is not supported on this TV.');
  const hls=new Hls({enableWorker:false,autoStartLoad:false,debug:false,
    maxBufferLength:20,maxMaxBufferLength:40,backBufferLength:20});
  let destroyed=false,failed=false,ready=false,manifestReady=false,pendingFormat=source;
  const active=()=>!destroyed&&!failed&&(hooks.isCurrent?.() ?? true);
  const fail=error=>{
    if(!active())return;
    failed=true;hls.stopLoad();hooks.onError?.(error instanceof Error?error:Error(String(error)));
  };
  const guard=callback=>(...args)=>{
    if(active())try{callback(...args);}catch(error){fail(error);}
  };
  const listeners=[];
  const listen=(name,callback)=>{const fn=guard(callback);listeners.push([name,fn]);video.addEventListener(name,fn);};
  const requireLevel=format=>{
    const index=findHlsLevel(hls.levels,format);
    if(index===null){const error=Error('This quality/codec is not supported by the TV media engine.');error.code='UNSUPPORTED_FORMAT';throw error;}
    return index;
  };
  hls.on(Hls.Events.MEDIA_ATTACHED,guard(()=>hls.loadSource(source.masterUrl || source.url)));
  hls.on(Hls.Events.MANIFEST_PARSED,guard(()=>{
    const index=requireLevel(pendingFormat);
    manifestReady=true;
    // loadLevel pins subsequent fragments; startLevel alone only picks the first.
    hls.startLevel=index;hls.loadLevel=index;
    hooks.onEvent?.('HLS_MANIFEST_PARSED',{levels:hls.levels.map(levelInfo)});
    if(!active())return;
    const position=Number(hooks.startPosition);
    hls.startLoad(Number.isFinite(position)&&position>=0?position:-1);
  }));
  hls.on(Hls.Events.LEVEL_SWITCHED,guard((event,data)=>{
    const level=hls.levels[data.level];
    if(level)hooks.onEvent?.('HLS_LEVEL_SWITCHED',levelInfo(level,data.level));
  }));
  hls.on(Hls.Events.ERROR,guard((event,data)=>{
    // Error payloads include signed stream URLs; expose only library enums.
    if(data.fatal)fail(Error(`HLS playback failed (${data.type || 'error'}: ${data.details || 'unknown'}).`));
  }));
  listen('canplay',()=>{
    hooks.onBuffered?.();
    if(ready)return;
    ready=true;
    // The first appended fragment can start before the requested time. Once
    // media is playable, restore the exact position (including paused starts).
    const resume=Number(hooks.startPosition);
    if(Number.isFinite(resume)&&resume>0&&Math.abs(video.currentTime-resume)>.1)video.currentTime=resume;
    if(hooks.paused){video.pause();hooks.onReady?.();}
    else Promise.resolve(video.play()).then(guard(()=>hooks.onReady?.()),guard(fail));
  });
  listen('waiting',()=>hooks.onBuffering?.());
  listen('playing',()=>hooks.onBuffered?.());
  listen('ended',()=>hooks.onEnded?.());
  listen('error',()=>fail(Error(`TV media element failed (code ${video.error?.code || 'unknown'}).`)));
  try{hls.attachMedia(video);}catch(error){fail(error);}
  return {hls,
    selectFormat(format){
      if(!active())return null;
      pendingFormat=format;
      if(!manifestReady)return null;
      const index=requireLevel(format);
      hls.currentLevel=index;
      return index;
    },
    destroy(){
      if(destroyed)return;
      destroyed=true;
      for(const [name,fn] of listeners)video.removeEventListener(name,fn);
      hls.destroy();
    }
  };
}
