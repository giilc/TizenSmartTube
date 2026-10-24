export function runPlayerAction(action,onError){
  try{action();return true;}catch(error){onError(error);return false;}
}

export function prepareAvPlay(av,sourceOrUrl,hooks){
  const source=typeof sourceOrUrl==='string'?{url:sourceOrUrl}:sourceOrUrl;
  const guard=action=>(...args)=>{
    if(hooks.isCurrent())runPlayerAction(()=>action?.(...args),hooks.onError);
  };
  runPlayerAction(()=>{
    av.open(source.url);
    if(source.adaptiveInfo)av.setStreamingProperty('ADAPTIVE_INFO',source.adaptiveInfo);
    av.setDisplayRect(0,0,1920,1080);av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
    av.setListener({onerror:guard(hooks.onError),onstreamcompleted:guard(hooks.onEnded),onevent:guard(hooks.onEvent),
      onbufferingstart:guard(hooks.onBuffering),onbufferingcomplete:guard(hooks.onBuffered)});
    const start=guard(()=>{av.play();if(hooks.paused)av.pause();hooks.onReady?.();});
    av.prepareAsync(guard(()=>{
      const position=Number(hooks.startPosition);
      if(Number.isFinite(position)&&position>0)
        av.seekTo(Math.round(position*1000),start,guard(hooks.onError));
      else start();
    }),guard(hooks.onError));
  },hooks.onError);
}
