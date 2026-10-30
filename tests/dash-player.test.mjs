import test from 'node:test';
import assert from 'node:assert/strict';
import {createDashPlayer} from '../src/dash-player.mjs';
const t={itag:1,url:'https://video.googlevideo.com/test',mime:'video/mp4',codec:'avc1.640028',bitrate:1000000,width:1920,height:1080,fps:30,init:'0-600',index:'601-1000'};
const source={video:t,audio:{...t,mime:'audio/mp4',codec:'mp4a.40.2',sampleRate:44100,channels:2},duration:120};
class Video extends EventTarget{currentTime=0;play(){this.plays=(this.plays||0)+1;return Promise.resolve();}pause(){this.pauses=(this.pauses||0)+1;}emit(n){this.dispatchEvent(new Event(n));}}
function setup(extra={}){
 const events={},video=new Video(),errors=[];let ready=0,revoked=0,current=true;
 const player={on:(n,fn)=>events[n]=fn,updateSettings(s){this.settings=s;},initialize(...args){this.args=args;},reset(){this.resets=(this.resets||0)+1;}};
 const MediaPlayer=()=>({create:()=>player});MediaPlayer.events={ERROR:'error'};
 const controller=createDashPlayer(video,source,{isCurrent:()=>current,onReady:()=>ready++,onError:e=>errors.push(e),...extra},{MediaPlayer},{createObjectURL:()=> 'blob:manifest',revokeObjectURL:()=>revoked++});
 return {video,player,controller,events,errors,get ready(){return ready;},get revoked(){return revoked;},stale(){current=false;}};
}
test('DASH loads a paired manifest, restores position, and waits for play before ready',async()=>{
 const s=setup({startPosition:42});assert.equal(s.player.args[1],'blob:manifest');assert.equal(s.player.args[2],false);assert.equal(s.player.args[3],42);
 s.video.emit('canplay');assert.equal(s.ready,0);await Promise.resolve();assert.equal(s.ready,1);assert.equal(s.video.currentTime,42);s.controller.destroy();
});
test('DASH paused quality changes do not autoplay and clean up the player and object URL',()=>{
 const s=setup({paused:true,startPosition:10});s.video.emit('canplay');assert.equal(s.ready,1);assert.equal(s.video.plays,undefined);assert.equal(s.video.currentTime,10);
 s.controller.destroy();s.controller.destroy();assert.equal(s.player.resets,1);assert.equal(s.revoked,1);
});
test('stale callbacks cannot autoplay; fatal errors expose codes without signed URLs',async()=>{
 const s=setup();s.stale();s.video.emit('canplay');assert.equal(s.video.plays,undefined);s.controller.destroy();
 const e=setup();e.events.error({error:{code:27,message:'https://video.googlevideo.com/private?token=secret'}});await Promise.resolve();assert.equal(e.errors.length,1);assert.match(e.errors[0].message,/27/);assert.doesNotMatch(e.errors[0].message,/secret/);e.controller.destroy();
});
test('play rejection reports failure instead of successful readiness',async()=>{
 const s=setup();s.video.play=()=>Promise.reject(Error('denied'));s.video.emit('canplay');await Promise.resolve();await Promise.resolve();assert.equal(s.ready,0);assert.equal(s.errors.length,1);s.controller.destroy();
});

test('synchronous initialization failure reports only after the controller can be owned',async()=>{
 const video=new Video();let owned,observed,revoked=0,resets=0;
 const MediaPlayer=()=>({create:()=>({on(){},updateSettings(){},initialize(){throw Error('init failed');},reset(){resets++;}})});MediaPlayer.events={ERROR:'error'};
 owned=createDashPlayer(video,source,{onError(){observed=owned;owned.destroy();}},{MediaPlayer},{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>revoked++});
 assert.equal(observed,undefined);await Promise.resolve();assert.equal(observed,owned);assert.equal(resets,1);assert.equal(revoked,1);
});

test('segment failures retain safe HTTP and track diagnostics without leaking signed request data',async()=>{
 const s=setup();s.video.currentTime=62;
 s.events.error({error:{code:27,message:'private signed url',data:{request:{mediaType:'audio',type:'MediaSegment',range:'974957-1136724',url:'https://video.googlevideo.com/private?token=secret'},response:{status:403,statusText:'secret'}}}});
 await Promise.resolve();const e=s.errors[0];assert.equal(e.httpStatus,403);assert.equal(e.mediaType,'audio');assert.equal(e.position,62);assert.match(e.message,/HTTP 403/);assert.match(e.message,/audio/);assert.doesNotMatch(JSON.stringify(e),/secret|googlevideo/);s.controller.destroy();
});
test('network failures do not invent an HTTP status or expose untrusted track text',async()=>{
 const s=setup();s.events.error({error:{code:28,data:{request:{mediaType:'secret'},response:{status:0}}}});await Promise.resolve();assert.equal(s.errors[0].httpStatus,0);assert.match(s.errors[0].message,/network/);assert.doesNotMatch(s.errors[0].message,/secret|HTTP 0/);s.controller.destroy();
});
