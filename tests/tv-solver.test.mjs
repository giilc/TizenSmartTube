import test from 'node:test';import assert from 'node:assert/strict';import {createTvSolver} from '../src/tv-solver.mjs';
class Worker extends EventTarget{messages=[];terminated=0;postMessage(m){this.messages.push(m);queueMicrotask(()=>this.reply({id:m.id,result:m.type==='prepare'?true:m.value.split('').reverse().join('')}));}reply(data){this.dispatchEvent(new MessageEvent('message',{data}));}terminate(){this.terminated++;}}
test('worker prepares once and transforms n and signatures without sending media URLs',async()=>{
 const w=new Worker(),s=createTvSolver({workerFactory:()=>w});await s.prepare('TV script');
 const url=await s.decipher('https://video.googlevideo.com/media?n=abc');assert.equal(new URL(url).searchParams.get('n'),'cba');
 const cipher=new URLSearchParams({url:'https://video.googlevideo.com/media?n=abc',s:'xyz',sp:'sig'}).toString();const decoded=new URL(await s.decipher('',cipher));assert.equal(decoded.searchParams.get('sig'),'zyx');assert.equal(decoded.searchParams.get('n'),'cba');assert.equal(w.messages.filter(m=>m.type==='prepare').length,1);assert.equal(w.messages.filter(m=>m.type==='solve'&&m.value==='abc').length,1);assert.ok(w.messages.every(m=>!m.url));s.destroy();assert.equal(w.terminated,1);
});
test('solver rejects untrusted media and unsafe signature fields',async()=>{
 const s=createTvSolver({workerFactory:()=>new Worker()});await s.prepare('TV script');await assert.rejects(s.decipher('https://evil.example/media?n=abc'),/Untrusted/);await assert.rejects(s.decipher('',new URLSearchParams({url:'https://video.googlevideo.com/media',s:'abc',sp:'redirect'}).toString()),/signature/);s.destroy();
});
test('a stopped worker rejects pending work and ignores late messages',async()=>{
 const w=new Worker();w.postMessage=m=>w.messages.push(m);const s=createTvSolver({workerFactory:()=>w}),pending=s.prepare('TV script');s.destroy();await assert.rejects(pending,/stopped/);w.reply({id:1,result:true});assert.equal(w.terminated,1);
});
test('worker startup has a deadline and hides worker error payloads',async()=>{
 const w=new Worker();w.postMessage=()=>{};const s=createTvSolver({workerFactory:()=>w,loadTimeout:5});await assert.rejects(s.prepare('secret script'),e=>/timed out/.test(e.message)&&!/secret/.test(e.message));assert.equal(w.terminated,1);
});
