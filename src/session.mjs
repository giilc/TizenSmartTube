import {Innertube,Platform} from 'youtubei.js/web';
import {timedFetch} from './provider.mjs';

// The player decipher script is retrieved by YouTube.js from YouTube itself.
Platform.shim.eval=async data=>new Function(data.output)();
// Avoid YouTube.js calling randomUUID on older Tizen web engines.
Platform.shim.uuidv4=()=> '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>
  (Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));
export const createSession=()=>Innertube.create({
  // Keep the visitor/session context issued by YouTube. Fabricating it locally
  // caused otherwise available VISIONOS HLS playback to return a bot challenge.
  // Surface initialization failure instead of silently falling back to that path.
  lang:'en',location:'PH',generate_session_locally:false,fail_fast:true,fetch:timedFetch
});
