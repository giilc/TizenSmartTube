import test from 'node:test';import assert from 'node:assert/strict';import {createTvPlaybackClient} from '../src/tv-provider.mjs';
const video={playabilityStatus:{status:'OK'},videoDetails:{videoId:'TsRyPXO4Quw',title:'Test',lengthSeconds:'120'},streamingData:{adaptiveFormats:[{itag:299,url:'https://video.googlevideo.com/media?n=abc',mimeType:'video/mp4; codecs="avc1.64002a"',qualityLabel:'1080p60',height:1080,width:1920,fps:60,bitrate:2000000,initRange:{start:'0',end:'600'},indexRange:{start:'601',end:'1000'}}]}};
function setup(status='OK'){
 const requests=[],deciphers=[];let prepares=0,destroys=0;
 const solver={prepare:async()=>{prepares++;},decipher:async(...args)=>{deciphers.push(args);return 'https://video.googlevideo.com/decoded';},destroy:()=>destroys++};
 const request=async(url,opts)=>{requests.push({url:String(url),opts});if(String(url).includes('/youtubei/'))return Response.json(status==='OK'?video:{playabilityStatus:{status,reason:'Sign-in needed'}});if(String(url).endsWith('/tv'))return new Response('<script src="/s/player/tv123/tv-player-ias.vflset/tv-player-ias.js"></script>');if(String(url).includes('/s/player/'))return new Response('signatureTimestamp:20756;');return new Response('"VISITOR_DATA":"server-issued-visitor"');};
 return {client:createTvPlaybackClient({request,solverFactory:()=>solver}),requests,deciphers,get prepares(){return prepares;},get destroys(){return destroys;}};
}
test('TV metadata uses the matching TV script timestamp and server-issued visitor',async()=>{
 const s=setup(),info=await s.client.getBasicInfo('TsRyPXO4Quw');const req=s.requests.find(r=>r.url.includes('/youtubei/')),body=JSON.parse(req.opts.body);
 assert.equal(body.context.client.clientName,'TVHTML5');assert.equal(body.context.client.clientVersion,'5.20260707');assert.equal(body.context.client.visitorData,'server-issued-visitor');assert.equal(body.playbackContext.contentPlaybackContext.signatureTimestamp,20756);assert.equal(req.opts.headers['X-YouTube-Client-Version'],body.context.client.clientVersion);
 assert.equal(await info.streaming_data.adaptive_formats[0].decipher(),'https://video.googlevideo.com/decoded');assert.equal(s.deciphers[0][0],'https://video.googlevideo.com/media?n=abc');s.client.destroy();assert.equal(s.destroys,1);
});
test('concurrent videos share initialization; access challenges are preserved',async()=>{
 const s=setup('LOGIN_REQUIRED');const info=await s.client.getBasicInfo('TsRyPXO4Quw');assert.equal(info.playability_status.status,'LOGIN_REQUIRED');assert.equal(s.prepares,0);assert.equal(s.requests.filter(r=>r.url.includes('/youtubei/')).length,1);s.client.destroy();
 const c=setup();await Promise.all([c.client.getBasicInfo('TsRyPXO4Quw'),c.client.getBasicInfo('AyZNnxLGGlw')]);assert.equal(c.prepares,2);c.client.destroy();
});
test('missing visitor or timestamp fails before any player metadata request and cleans up',async()=>{
 let prepared=0,destroyed=0;
 const s=createTvPlaybackClient({request:async()=>new Response('unusable page'),solverFactory:()=>({prepare:async()=>prepared++,destroy:()=>destroyed++})});await assert.rejects(s.getBasicInfo('TsRyPXO4Quw'),/visitor/);assert.equal(prepared,0);s.destroy();
 const c=setup();await assert.rejects(c.client.getBasicInfo('bad-id'),/Invalid video/);assert.equal(c.requests.length,0);c.client.destroy();
});

test('a terminated decipher worker is replaced on the next video request',async()=>{
 let count=0;const solvers=[];const request=async url=>String(url).includes('/youtubei/')?Response.json(video):String(url).endsWith('/tv')?new Response('<script src="/s/player/tv123/tv-player-ias.vflset/tv-player-ias.js"></script>'):String(url).includes('/s/player/')?new Response('signatureTimestamp:20756;'):new Response('"VISITOR_DATA":"issued"');
 const c=createTvPlaybackClient({request,solverFactory:()=>{count++;const s={stopped:false,prepare:async()=>{},decipher:async()=>{if(s.stopped)throw Error('stopped');return 'https://video.googlevideo.com/ok';},destroy:()=>{s.stopped=true;}};solvers.push(s);return s;}});
 await c.getBasicInfo('TsRyPXO4Quw');solvers[0].stopped=true;const info=await c.getBasicInfo('AyZNnxLGGlw');assert.equal(count,2);assert.equal(await info.streaming_data.adaptive_formats[0].decipher(),'https://video.googlevideo.com/ok');c.destroy();
});

test('an absent TV timestamp cannot reuse a desktop timestamp or request video metadata',async()=>{
 let prepared=0,metadata=0;const c=createTvPlaybackClient({solverFactory:()=>({prepare:async()=>prepared++,destroy(){}}),request:async url=>{if(String(url).includes('/youtubei/'))metadata++;return new Response(String(url).endsWith('/tv')?'<script src="/s/player/tv123/tv-player-ias.vflset/tv-player-ias.js"></script>':String(url).includes('/s/player/')?'no timestamp here':'"VISITOR_DATA":"issued"');}});
 await assert.rejects(c.getBasicInfo('TsRyPXO4Quw'),/timestamp/);assert.equal(prepared,0);assert.equal(metadata,0);c.destroy();
});

test('decipher workers are serialized and released before playable metadata is returned',async()=>{
 let active=0,peak=0;const request=async url=>String(url).includes('/youtubei/')?Response.json(video):String(url).endsWith('/tv')?new Response('<script src="/s/player/tv123/tv-player-ias.vflset/tv-player-ias.js"></script>'):String(url).includes('/s/player/')?new Response('signatureTimestamp:20756;'):new Response('"VISITOR_DATA":"issued"');
 const c=createTvPlaybackClient({request,solverFactory:()=>{active++;peak=Math.max(peak,active);let stopped=false;return {prepare:async()=>{await Promise.resolve();},decipher:async()=>{if(stopped)throw Error('worker gone');return 'https://video.googlevideo.com/decoded';},destroy:()=>{if(!stopped){stopped=true;active--;}}};}});
 const infos=await Promise.all([c.getBasicInfo('TsRyPXO4Quw'),c.getBasicInfo('AyZNnxLGGlw')]);assert.equal(active,0);assert.equal(peak,1);assert.equal(await infos[0].streaming_data.adaptive_formats[0].decipher(),'https://video.googlevideo.com/decoded');c.destroy();
});

test('worker startup failure is reported rather than converted into an empty successful source',async()=>{
 const request=async url=>String(url).includes('/youtubei/')?Response.json(video):String(url).endsWith('/tv')?new Response('<script src="/s/player/tv123/tv-player-ias.vflset/tv-player-ias.js"></script>'):String(url).includes('/s/player/')?new Response('signatureTimestamp:20756;'):new Response('"VISITOR_DATA":"issued"');
 const c=createTvPlaybackClient({request,solverFactory:()=>{throw Error('worker unavailable');}});await assert.rejects(c.getBasicInfo('TsRyPXO4Quw'),/worker unavailable/);c.destroy();
});

test('destroy during metadata fetch cannot create a new worker when the response arrives',async()=>{
 let started,release,workers=0;const began=new Promise(r=>started=r),response=new Promise(r=>release=r);
 const request=async url=>{if(String(url).includes('/youtubei/')){started();return response;}return new Response(String(url).endsWith('/tv')?'<script src="/s/player/tv123/tv-player-ias.vflset/tv-player-ias.js"></script>':String(url).includes('/s/player/')?'signatureTimestamp:20756;':'"VISITOR_DATA":"issued"');};
 const c=createTvPlaybackClient({request,solverFactory:()=>{workers++;return {prepare:async()=>{},decipher:async()=> 'https://video.googlevideo.com/ok',destroy(){}};}});const pending=c.getBasicInfo('TsRyPXO4Quw');await began;c.destroy();release(Response.json(video));await assert.rejects(pending,/stopped/);assert.equal(workers,0);
});
