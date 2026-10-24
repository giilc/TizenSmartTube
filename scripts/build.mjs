import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/app.mjs'],outfile:'dist/app.js',bundle:true,format:'iife',
  platform:'browser',target:['chrome85'],minify:true,legalComments:'eof'});
for(const name of ['index.html','style.css','config.xml','icon.png','THIRD_PARTY_NOTICES.md','LICENSE'])
  await copyFile(name,'dist/'+name);
await copyFile('node_modules/hls.js/LICENSE','dist/HLS-LICENSE.txt');
await cp('fonts','dist/fonts',{recursive:true});
await cp('licenses','dist/licenses',{recursive:true});
const pkg=JSON.parse(await readFile('package.json','utf8'));
await writeFile('dist/build.json',JSON.stringify({version:pkg.version,dependencies:pkg.dependencies},null,2));
console.log('Built standalone Tizen assets in dist/');
