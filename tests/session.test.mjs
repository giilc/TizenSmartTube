import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../src/session.mjs';

test('session starts with server-issued visitor data and fails without fabricating a replacement', async()=>{
  const previous=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async input=>{
    requests.push(new URL(typeof input==='string'?input:input.url || input));
    throw Error('session endpoint unavailable');
  };
  try {
    await assert.rejects(createSession());
    assert.equal(requests[0].pathname,'/sw.js_data');
    assert.equal(requests.length,1,'must not continue with a fabricated visitor after session failure');
  }finally{globalThis.fetch=previous;}
});
