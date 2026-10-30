// EJS emits environment shims, including a location assignment. Run those
// against a separate object, never the widget's Window or a worker's location.
// This prevents accidental page effects; it is not a security boundary.
export function createIsolatedFunctionFactory(){
 const names=['globalThis','window','self','global','document','navigator','location','XMLHttpRequest','Function'];
 const scope=Object.assign(Object.create(null),{Object,Array,Math,JSON,Date,RegExp,String,Number,Boolean,Symbol,Map,Set,WeakMap,WeakSet,ArrayBuffer,DataView,Uint8Array,Int8Array,Uint16Array,Int16Array,Uint32Array,Int32Array,Float32Array,Float64Array,Promise,Error,TypeError,RangeError,URL,parseInt,parseFloat,isNaN,isFinite,encodeURIComponent,decodeURIComponent});
 scope.document=Object.create(null);scope.navigator=Object.create(null);scope.XMLHttpRequest={prototype:{}};scope.location=new URL('https://www.youtube.com/');
 scope.globalThis=scope.window=scope.self=scope.global=scope;
 function compile(...args){const body=args.pop();return new Function(...names,...args,body).bind(scope,...names.map(n=>scope[n]));}
 compile.prototype=Function.prototype;
 scope.Function=compile;return compile;
}
export function prepareEjsSolver(libSource,coreSource,playerSource){
 let functions;
 const isolated=createIsolatedFunctionFactory();
 const compile=(...args)=>{
  const fn=isolated(...args);
  return (...values)=>{const result=fn(...values);if(args[0]==='_result')functions=values[0];return result;};
 };
 try{
  const jsc=new Function('Function',libSource+'\nconst {meriyah,astring}=lib;\n'+coreSource+'\nreturn jsc;')(compile);
  jsc({type:'player',player:playerSource,requests:[]});
 }catch{throw Error('TV player solver preparation failed.');}
 if(typeof functions?.n!=='function')throw Error('TV player solver did not expose a decipher function.');
 return {solve(type,value){
  if(!['n','sig'].includes(type))throw Error('Unsupported decipher operation.');
  if(typeof value!=='string'||!value.length||value.length>4096)throw Error('Invalid decipher challenge.');
  try{const result=functions[type]?.(value);if(typeof result!=='string'||!result.length||result.startsWith('enhanced_except_'))throw Error();return result;}
  catch{throw Error('TV decipher failed.');}
 }};
}
