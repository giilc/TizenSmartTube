import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVideos, chooseProgressive, normalizeSegments, skipTarget, nextIndex, SponsorSession, controlTarget} from '../src/core.mjs';

test('search omits nonvideos and duplicate IDs, preserving display text', () => {
  assert.deepEqual(normalizeVideos([
    {id:'aqz-KE-bpKQ', title:'<Bunny>',author:{name:'Blender'}, thumbnails:[{url:'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg'}]},
    {id:'aqz-KE-bpKQ',title:'duplicate'}, {id:'channel-id'}, {id:'bad'}
  ]).map(v=>[v.id,v.title]), [['aqz-KE-bpKQ','<Bunny>']]);
});
test('skip-once state resets on a new video and only commits successful seeks',()=>{
 const s=new SponsorSession();s.setVideo('one',[{start:10,end:20}]);
 assert.equal(s.target(10,{playing:false}),null);
 assert.equal(s.target(10,{playing:true}),20);
 assert.equal(s.target(10,{playing:true}),20); // a failed seek can be retried
 s.confirm(20);assert.equal(s.target(10,{playing:true}),null);
 s.setVideo('two',[{start:10,end:20}]);assert.equal(s.target(10,{playing:true}),20);
 assert.equal(s.target(10,{playing:true,enabled:false}),null);
});
test('every top control is reachable with arrows without stealing text cursor keys',()=>{
 assert.equal(controlTarget('query','up'),'search');
 assert.equal(controlTarget('query','right'),null);
 assert.equal(controlTarget('search','right'),'sponsor');
 assert.equal(controlTarget('sponsor','right'),'skip-options');
 assert.equal(controlTarget('search','left'),'query');
});
test('progressive playback requires both audio and video and selects highest compatible MP4', () => {
  const formats=[{itag:137,mime_type:'video/mp4',has_video:true,has_audio:false,height:1080},
    {itag:18,mime_type:'video/mp4',has_video:true,has_audio:true,height:360},
    {itag:22,mime_type:'video/mp4',has_video:true,has_audio:true,height:720}];
  assert.equal(chooseProgressive(formats).itag,22);
  assert.throws(()=>chooseProgressive([formats[0]]),/combined/);
});
test('SponsorBlock filters invalid intervals and non-skippable actions, merges overlapping sponsorships', () => {
  const segments=normalizeSegments([
    {segment:[10,20],category:'sponsor',actionType:'skip'},
    {segment:[19,30],category:'sponsor',actionType:'skip'},
    {segment:[0,5],category:'intro',actionType:'skip'},
    {segment:[40,35],category:'sponsor'},
    {segment:[40,45],category:'sponsor',actionType:'mute'}
  ],['sponsor'],60);
  assert.deepEqual(segments,[{start:10,end:30}]);
  assert.equal(skipTarget(9.9,segments,true),null);
  assert.equal(skipTarget(10,segments,true),30);
  assert.equal(skipTarget(30,segments,true),null);
  assert.equal(skipTarget(10,segments,false),null);
});
test('remote navigation clamps an incomplete final row without losing focus', () => {
  assert.equal(nextIndex(6,'down',10,4),9);
  assert.equal(nextIndex(0,'left',10,4),0);
  assert.equal(nextIndex(9,'right',10,4),9);
  assert.equal(nextIndex(0,'down',0,4),-1);
});
