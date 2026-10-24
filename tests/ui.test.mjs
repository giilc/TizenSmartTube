import test from 'node:test';
import assert from 'node:assert/strict';
import {gridTarget,rememberVideo,readHistory,preferredFormat} from '../src/ui-state.mjs';
test('left edge enters sidebar and top row enters search without wrapping',()=>{
 assert.equal(gridTarget(3,'left',8,3),'sidebar');
 assert.equal(gridTarget(2,'up',8,3),'header');
 assert.equal(gridTarget(5,'right',8,3),5);
 assert.equal(gridTarget(6,'down',8,3),6);
 assert.equal(gridTarget(4,'down',8,3),7);
});
test('history keeps recent metadata without streams and ignores malformed stored items',()=>{
 const video={id:'abcdefghijk',title:'One',author:'Author',thumbnail:'https://i.ytimg.com/a.jpg',url:'secret-expiring-stream'};
 const history=rememberVideo([{...video,title:'Old'}],video);
 assert.equal(history.length,1); assert.equal(history[0].title,'One');assert.equal(history[0].url,undefined);
 assert.deepEqual(readHistory('[{"id":"bad"}]'),[]);assert.deepEqual(readHistory('invalid'),[]);
});
test('quality preference chooses available resolution at or below cap, otherwise auto',()=>{
 const formats=[{id:'auto'},{id:'1080',height:1080},{id:'720',height:720},{id:'360',height:360}];
 assert.equal(preferredFormat(formats,720).id,'720');
 assert.equal(preferredFormat(formats,480).id,'360');
 assert.equal(preferredFormat(formats,0).id,'auto');
 assert.equal(preferredFormat([{id:'auto'}],1080).id,'auto');
});
test('changing formats preserves video identity and clears a previous adaptive constraint',async()=>{
 const {withFormat}=await import('../src/ui-state.mjs');
 const video={id:'abcdefghijk',selectedFormatId:'720',adaptiveInfo:'BITRATES=100',formats:[{id:'auto'}]};
 const state=withFormat(video,{id:'auto',url:'https://media',label:'Auto'});
 assert.equal(state.id,'abcdefghijk');assert.equal(state.selectedFormatId,'auto');assert.equal(state.adaptiveInfo,undefined);assert.equal(state.formats,video.formats);
});
