import test from 'node:test';import assert from 'node:assert/strict';
import {createIsolatedFunctionFactory,prepareEjsSolver} from '../src/solver-context.mjs';
test('solver globals cannot navigate or modify the application document',()=>{
 const original=globalThis.location;const documentBefore=globalThis.document;
 const compile=createIsolatedFunctionFactory();const value=compile('globalThis.location=new URL("https://www.youtube.com/watch?v=test");globalThis.document.changed=true;return [window===globalThis,self===globalThis,globalThis.Math===Math,location.href];')();
 assert.deepEqual(value.slice(0,3),[true,true,true]);assert.equal(globalThis.location,original);assert.equal(globalThis.document,documentBefore);
});
test('EJS prepares once and exposes only string transformations',()=>{
 const lib='var lib={meriyah:{},astring:{}};';
 const body='globalThis.location=new URL("https://www.youtube.com/");_result.n=x=>x.split("").reverse().join("");_result.sig=x=>x+"!";';
 const core=`var jsc=function(input){const result={};Function("_result",${JSON.stringify(body)})(result);return {type:"result",responses:[]};};`;
 const solver=prepareEjsSolver(lib,core,'trusted player source');assert.equal(solver.solve('n','abc'),'cba');assert.equal(solver.solve('sig','abc'),'abc!');assert.throws(()=>solver.solve('other','secret'),/Unsupported/);assert.throws(()=>solver.solve('n',null),/Invalid/);
});
test('missing or invalid solver functions fail without exposing source or challenge',()=>{
 const lib='var lib={meriyah:{},astring:{}};';assert.throws(()=>prepareEjsSolver(lib,'var jsc=()=>({});','private script'),/TV player solver/);
 const core='var jsc=()=>{const r={};Function("_result","_result.n=()=>null")(r);return {};};';const s=prepareEjsSolver(lib,core,'private script');assert.throws(()=>s.solve('n','private challenge'),e=>/TV decipher/.test(e.message)&&!/private/.test(e.message));
});

test('isolated Function retains Function.prototype and constructor behavior used by the TV script',()=>{
 const compile=createIsolatedFunctionFactory();const result=compile('return [typeof Function.prototype.bind,typeof(new Function("return 42")),new Function("return 42")()];')();assert.deepEqual(result,['function','function',42]);
});
