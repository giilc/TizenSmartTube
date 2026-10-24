import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import {parseScript,parseModule} from 'meriyah';

before(async()=>{
  delete Array.prototype.findLast;
  delete globalThis.structuredClone;
  delete String.prototype.replaceAll;
  delete String.prototype.isWellFormed;
  await import('../src/polyfills.mjs');
});

test('TV compatibility supplies findLast with sparse-array and array-like behavior', ()=>{
  assert.equal(typeof Array.prototype.findLast,'function');
  assert.equal([1,4,3,2].findLast(n=>n%2===0),2);
  const seen=[];
  [,1].findLast((value,index)=>{seen.push([value,index]);return false;});
  assert.deepEqual(seen,[[1,1],[undefined,0]]);
  assert.equal(Array.prototype.findLast.call({0:'a',1:'b',length:2},v=>v==='a'),'a');
});

test('TV clone support preserves nested data, cycles and independent typed arrays',()=>{
  assert.equal(typeof structuredClone,'function');
  const source={nested:{value:42},bytes:new Uint8Array([1,2,3])};source.self=source;
  const copy=structuredClone(source);
  assert.notEqual(copy,source);assert.notEqual(copy.nested,source.nested);
  assert.equal(copy.self,copy);assert.deepEqual(copy.bytes,new Uint8Array([1,2,3]));
  copy.bytes[0]=9;assert.equal(source.bytes[0],1);
});

test('YouTube player parser works with shorthand cloning and numeric separators on the TV polyfills',()=>{
  const ast=parseScript('const x = 1_000n; const obj = {x};\r\nconst s = `a\r\nb`;');
  assert.equal(ast.body[0].declarations[0].init.value,1000n);
  const property=ast.body[1].declarations[0].init.properties[0];
  assert.equal(property.shorthand,true);
  assert.equal(property.key.name,'x');assert.equal(property.value.name,'x');
  assert.notEqual(property.key,property.value);
  assert.equal(ast.body[2].declarations[0].init.quasis[0].value.cooked,'a\nb');
  const module=parseModule('const x=1; export {x as "value"};');
  assert.equal(module.body[1].specifiers[0].exported.value,'value');
  assert.throws(()=>parseModule('const x=1; export {x as "\\uD800"};'),/surrogate|well|export/i);
});
