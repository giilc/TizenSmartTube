import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAvPlay} from '../src/player.mjs';

test('an asynchronous AVPlay start exception reaches cleanup/error handling',()=>{
 let success,error;
 const av={open(){},setDisplayRect(){},setDisplayMethod(){},setListener(){},
   prepareAsync(callback){success=callback;},play(){throw Error('decoder failed');}};
 prepareAvPlay(av,'https://video.googlevideo.com/test',{isCurrent:()=>true,onError:e=>error=e});
 assert.doesNotThrow(()=>success());assert.equal(error.message,'decoder failed');
});
test('a stale prepare callback cannot start the previous video',()=>{
 let success,active=true,plays=0;
 const av={open(){},setDisplayRect(){},setDisplayMethod(){},setListener(){},
   prepareAsync(callback){success=callback;},play(){plays++;}};
 prepareAvPlay(av,'https://video.googlevideo.com/test',{isCurrent:()=>active,onError:()=>{}});
 active=false;success();assert.equal(plays,0);
});

test('quality reopen applies adaptive settings while IDLE then restores position and pause',()=>{
 const calls=[];let ready,seeked;let state='NONE';
 const av={open(url){state='IDLE';calls.push(['open',url]);},setDisplayRect(){},setDisplayMethod(){},setListener(){},
  setStreamingProperty(name,value){assert.equal(state,'IDLE');calls.push([name,value]);},
  prepareAsync(callback){ready=()=>{state='READY';callback();};},
  seekTo(time,callback){assert.equal(state,'READY');calls.push(['seek',time]);seeked=callback;},
  play(){state='PLAYING';calls.push(['play']);},pause(){state='PAUSED';calls.push(['pause']);}};
 prepareAvPlay(av,{url:'https://manifest.googlevideo.com/master',adaptiveInfo:'BITRATES=2500000'},
  {isCurrent:()=>true,startPosition:42.5,paused:true,onReady:()=>calls.push(['ready']),onError:e=>{throw e;}});
 ready();assert.deepEqual(calls,[['open','https://manifest.googlevideo.com/master'],['ADAPTIVE_INFO','BITRATES=2500000'],['seek',42500]]);
 seeked();assert.deepEqual(calls.slice(-3),[['play'],['pause'],['ready']]);
});

test('stale seek completion cannot resume an obsolete quality switch',()=>{
 let ready,seeked,active=true,plays=0;
 const av={open(){},setDisplayRect(){},setDisplayMethod(){},setListener(){},prepareAsync(c){ready=c;},seekTo(t,c){seeked=c;},play(){plays++;}};
 prepareAvPlay(av,'https://manifest.googlevideo.com/master',{isCurrent:()=>active,startPosition:12,onError:e=>{throw e;}});
 ready();active=false;seeked();assert.equal(plays,0);
});

test('AVPlay adaptive events reach the current session only',()=>{
 let listener,active=true;const events=[];
 const av={open(){},setDisplayRect(){},setDisplayMethod(){},setListener(value){listener=value;},prepareAsync(){}};
 prepareAvPlay(av,'https://manifest.googlevideo.com/master',{isCurrent:()=>active,onError:e=>{throw e;},onEvent:(type,data)=>events.push([type,data])});
 listener.onevent('PLAYER_MSG_RESOLUTION_CHANGED','1280x720');active=false;
 listener.onevent('PLAYER_MSG_BITRATE_CHANGE','2500000');assert.deepEqual(events,[['PLAYER_MSG_RESOLUTION_CHANGED','1280x720']]);
});
