export function gridTarget(index,direction,count,columns=3){
 if(direction==='left')return index%columns===0?'sidebar':index-1;
 if(direction==='right')return index%columns===columns-1||index===count-1?index:index+1;
 if(direction==='up')return index<columns?'header':index-columns;
 if(direction==='down')return index+columns<count?index+columns:index;
 return index;
}
export function readHistory(raw){
 try{return JSON.parse(raw).filter(v=>/^[\w-]{11}$/.test(v?.id)&&typeof v.title==='string').slice(0,60).map(cleanVideo);}catch{return [];}
}
function cleanVideo(v){return {id:v.id,title:String(v.title),author:String(v.author||''),thumbnail:/^https:\/\//.test(v.thumbnail||'')?v.thumbnail:'',duration:typeof v.duration==='string'?v.duration:''};}
export function rememberVideo(history,video){return [cleanVideo(video),...history.filter(v=>v.id!==video.id)].slice(0,60);}
export function preferredFormat(formats,height=0){
 return (height>0?formats.filter(f=>f.height>0&&f.height<=height).sort((a,b)=>b.height-a.height||b.fps-a.fps)[0]:null)||formats.find(f=>f.id==='auto')||formats[0];
}
export function withFormat(video,format){return {...video,...format,id:video.id,adaptiveInfo:format.adaptiveInfo,quality:format.label||video.quality,selectedFormatId:format.id||video.selectedFormatId};}
