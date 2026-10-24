import test from 'node:test';
import assert from 'node:assert/strict';
import {createHlsPlayer, findHlsLevel} from '../src/hls-player.mjs';
const levels=[
 {height:144,width:256,videoCodec:'avc1.4d400c',frameRate:30,bitrate:300000},
 {height:720,width:1280,videoCodec:'vp09.00.31.08',frameRate:60,bitrate:1800000},
 {height:720,width:1280,videoCodec:'avc1.4d401f',frameRate:30,bitrate:2500000},
 {height:720,width:1280,videoCodec:'avc1.4d4020',frameRate:60,bitrate:4000000},
];
const manual={id:'720',height:720,fps:30,codec:'avc1.4d401f,mp4a.40.2',bitrate:2570000,url:'https://manifest.googlevideo.com/master.m3u8',protocol:'hls'};
class FakeHls {
 static Events={MEDIA_ATTACHED:'attached',MANIFEST_PARSED:'manifest',LEVEL_SWITCHED:'level',ERROR:'error'};
 static isSupported(){return true;}
 constructor(config){this.config=config;this.handlers=new Map();this.levels=levels;this.calls=[];}
 on(name,fn){this.handlers.set(name,fn);}
 emit(name,data={}){this.handlers.get(name)?.(name,data);}
 attachMedia(video){this.video=video;}
 loadSource(url){this.url=url;}
 startLoad(position){this.calls.push([position,this.startLevel,this.loadLevel]);}
 stopLoad(){this.stopped=true;}
 destroy(){this.destroyed=true;}
}
class FakeVideo extends EventTarget{
 currentTime=0;playCount=0;pauseCount=0;
 play(){this.playCount++;return Promise.resolve();}
 pause(){this.pauseCount++;}
 emit(name){this.dispatchEvent(new Event(name));}
}
function setup(extra={}){
 const video=new FakeVideo(),errors=[],events=[];let ready=0,current=true;
 const hooks={isCurrent:()=>current,onError:e=>errors.push(e),onReady:()=>ready++,onEvent:(...a)=>events.push(a),...extra};
 const controller=createHlsPlayer(video,manual,hooks,FakeHls);
 return {video,controller,hls:controller.hls,errors,events,get ready(){return ready;},stale(){current=false;}};
}
test('quality matches resolution, video codec and frame rate instead of sorted index or label',()=>{
 assert.equal(findHlsLevel(levels,manual),2);
 assert.equal(findHlsLevel(levels,{...manual,fps:60}),3);
 assert.equal(findHlsLevel(levels,{id:'auto'}),-1);
 assert.equal(findHlsLevel(levels,{...manual,height:1080}),null);
 assert.equal(findHlsLevel(levels,{...manual,codec:'av01.0.08M.08'}),null);
});
test('manual quality is locked before loading, keeping master URL and restored position',async()=>{
 const s=setup({startPosition:91.5});
 assert.equal(s.hls.config.enableWorker,false);assert.equal(s.hls.config.autoStartLoad,false);
 s.hls.emit('attached');assert.equal(s.hls.url,manual.url);
 s.hls.emit('manifest');assert.deepEqual(s.hls.calls,[[91.5,2,2]]);
 s.video.emit('canplay');assert.equal(s.video.playCount,1);assert.equal(s.ready,0);
 await Promise.resolve();assert.equal(s.ready,1);
 s.video.emit('canplay');assert.equal(s.video.playCount,1);
});
test('paused starts stay paused and changing quality supports auto',()=>{
 const s=setup({paused:true,startPosition:42});s.hls.emit('manifest');s.video.emit('canplay');
 assert.equal(s.video.playCount,0);assert.equal(s.video.pauseCount,1);assert.equal(s.ready,1);assert.equal(s.video.currentTime,42);
 assert.equal(s.controller.selectFormat({...manual,fps:60}),3);assert.equal(s.hls.currentLevel,3);
 assert.equal(s.controller.selectFormat({id:'auto'}),-1);assert.equal(s.hls.currentLevel,-1);
 assert.throws(()=>s.controller.selectFormat({...manual,height:2160}),/not supported/);
});
test('unsupported requested quality fails before loading, without silently selecting 144p',()=>{
 const s=setup();s.hls.levels=levels.slice(0,1);s.hls.emit('manifest');
 assert.equal(s.hls.calls.length,0);assert.match(s.errors[0].message,/not supported/);assert.equal(s.errors[0].code,'UNSUPPORTED_FORMAT');
});
test('fatal errors and level events expose safe metadata; destroy prevents late callbacks',()=>{
 const s=setup();s.hls.emit('level',{level:2,url:'private'});
 assert.equal(s.events[0][1].height,720);assert.equal(JSON.stringify(s.events).includes('private'),false);
 s.hls.emit('error',{fatal:false,details:'fragLoadError'});assert.equal(s.errors.length,0);
 s.hls.emit('error',{fatal:true,type:'networkError',details:'fragLoadError',url:'private'});
 assert.match(s.errors[0].message,/fragLoadError/);assert.equal(s.hls.stopped,true);
 s.controller.destroy();s.hls.emit('manifest');s.video.emit('canplay');
 assert.equal(s.hls.destroyed,true);assert.equal(s.ready,0);assert.equal(s.hls.calls.length,0);
});
test('stale operation cannot autoplay or send errors/events',()=>{
 const s=setup();s.stale();s.hls.emit('manifest');s.hls.emit('error',{fatal:true});s.video.emit('canplay');
 assert.equal(s.errors.length,0);assert.equal(s.events.length,0);assert.equal(s.video.playCount,0);
});

test('ready waits for successful playback; autoplay rejection remains a startup failure',async()=>{
 const s=setup();s.video.play=()=>Promise.reject(Error('autoplay blocked'));
 s.hls.emit('manifest');s.video.emit('canplay');
 assert.equal(s.ready,0);await Promise.resolve();await Promise.resolve();
 assert.equal(s.ready,0);assert.match(s.errors[0].message,/autoplay blocked/);
});
test('late successful play from an obsolete session cannot mark it ready',async()=>{
 const s=setup();let resolve;s.video.play=()=>new Promise(done=>{resolve=done;});
 s.hls.emit('manifest');s.video.emit('canplay');s.stale();resolve();
 await Promise.resolve();assert.equal(s.ready,0);
});

test('manual multiplexed variants load the master to retain runtime quality metadata',()=>{
 const video=new FakeVideo();
 const controller=createHlsPlayer(video,{...manual,url:'https://r1.googlevideo.com/media.m3u8',masterUrl:manual.url},{isCurrent:()=>true},FakeHls);
 controller.hls.emit('attached');assert.equal(controller.hls.url,manual.url);
});
