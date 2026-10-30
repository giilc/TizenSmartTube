import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptiveFormats,dashManifest,markFormatSupport} from '../src/adaptive.mjs';
import {resolutionLabel} from '../src/formats.mjs';
const track=(itag,height,fps=30,extra={})=>({itag,height,width:height?height*16/9:undefined,fps:height?fps:undefined,has_video:!!height,has_audio:!height,
 mime_type:height?'video/mp4; codecs="avc1.640028"':'audio/mp4; codecs="mp4a.40.2"',bitrate:height?4000000:128000,
 init_range:{start:0,end:700},index_range:{start:701,end:1200},audio_sample_rate:44100,audio_channels:2,
 decipher:async()=>`https://video.googlevideo.com/media?itag=${itag}&x=1`,...extra});
test('adaptive choices pair every resolution/FPS with default audio and preserve identity',async()=>{
 const choices=await adaptiveFormats([track(137,1080),track(299,1080,60),track(136,720),track(140,0)],{},120);
 assert.deepEqual(choices.map(f=>[f.height,f.fps]),[[1080,60],[1080,30],[720,30]]);
 assert.equal(new Set(choices.map(f=>f.id)).size,3);assert.equal(choices[0].audio.itag,140);
 const xml=dashManifest(choices[0]);assert.match(xml,/contentType="audio"/);assert.match(xml,/frameRate="60"/);assert.match(xml,/&amp;x=1/);assert.match(xml,/indexRange="701-1200"/);
});
test('invalid URLs, byte ranges and missing audio never become playable options',async()=>{
 assert.deepEqual(await adaptiveFormats([track(137,1080)],{},120),[]);
 const bad=track(137,1080,30,{decipher:async()=> 'https://evil.example/video'});
 assert.deepEqual(await adaptiveFormats([bad,track(140,0)],{},120),[]);
 assert.deepEqual(await adaptiveFormats([track(137,1080,30,{index_range:{start:100,end:2}}),track(140,0)],{},120),[]);
});
test('pairing prefers default language and excludes video-only audio candidates',async()=>{
 const choices=await adaptiveFormats([track(137,1080),track(141,0,0,{bitrate:256000,audio_track:{audio_is_default:false}}),track(140,0,0,{audio_track:{audio_is_default:true}})],{},120);
 assert.equal(choices[0].audio.itag,140);
});
test('capability checks keep unavailable formats visible and require both audio/video support',async()=>{
 const choices=await adaptiveFormats([track(137,1080),track(140,0)],{},120);
 const supported=markFormatSupport(choices,type=>type.startsWith('video/'));
 assert.equal(supported.length,1);assert.equal(supported[0].available,false);assert.match(supported[0].unavailableReason,/codec/i);
 assert.equal(markFormatSupport(choices,()=>true)[0].available,true);
});
test('resolution labels show 24, 30 and fractional FPS explicitly without inventing missing rates',()=>{
 assert.equal(resolutionLabel({height:1080,fps:30}),'1080p · 30 fps');
 assert.equal(resolutionLabel({height:720,fps:29.97}),'720p · 29.97 fps');
 assert.equal(resolutionLabel({height:480,fps:24}),'480p · 24 fps');
 assert.equal(resolutionLabel({height:360,fps:0}),'360p · FPS unknown');
});
