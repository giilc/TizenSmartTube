import './polyfills.mjs';
import libSource from '../vendor/ejs/lib.min.js.txt';
import coreSource from '../vendor/ejs/core.min.js.txt';
import {prepareEjsSolver} from './solver-context.mjs';
let solver;
self.onmessage=event=>{
 const {id,type,source,operation,value}=event.data||{};
 try{
  if(type==='prepare'){solver=prepareEjsSolver(libSource,coreSource,source);self.postMessage({id,result:true});}
  else if(type==='solve'&&solver)self.postMessage({id,result:solver.solve(operation,value)});
  else throw Error();
 }catch{self.postMessage({id,error:true});}
};
