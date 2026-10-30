import test from 'node:test';import assert from 'node:assert/strict';import {withTvPlayback} from '../src/session.mjs';
test('TV playback lazily uses its own client while browsing and other profiles keep their session',async()=>{
 let factories=0,tvCalls=0,otherCalls=0;const client={session:{},getBasicInfo:async()=>{otherCalls++;return {streaming_data:{formats:[]}};}};
 withTvPlayback(client,{createTv:()=>{factories++;return {getBasicInfo:async()=>{tvCalls++;return {tv:true};}};},loadLegacyPlayer:async()=>{throw Error('not needed');}});
 await client.getBasicInfo('TsRyPXO4Quw',{client:'VISIONOS'});assert.equal(factories,0);
 assert.deepEqual(await client.getBasicInfo('TsRyPXO4Quw',{client:'TV'}),{tv:true});await client.getBasicInfo('AyZNnxLGGlw',{client:'TV'});assert.equal(factories,1);assert.equal(tvCalls,2);assert.equal(otherCalls,1);assert.equal(client.session.player,undefined);
});
test('legacy deciphering is initialized only when a fallback needs it, once for concurrent requests',async()=>{
 let loaded=0;const player={};const c=withTvPlayback({session:{},getBasicInfo:async()=>({streaming_data:{adaptive_formats:[{url:'https://video.googlevideo.com/media?n=abc'}]}})},{loadLegacyPlayer:async()=>{loaded++;await Promise.resolve();return player;}});
 await Promise.all([c.getBasicInfo('TsRyPXO4Quw',{client:'IOS'}),c.getBasicInfo('AyZNnxLGGlw',{client:'IOS'})]);assert.equal(loaded,1);assert.equal(c.session.player,player);
});
