export function normalizeVideos(videos) {
  const seen = new Set();
  return (videos || []).filter(v => {
    if (!/^[\w-]{11}$/.test(v.id || '') || seen.has(v.id)) return false;
    seen.add(v.id); return true;
  }).map(v => ({id:v.id, title:String(v.title || 'Untitled video'),
    author:v.author?.name || '', thumbnail:v.thumbnails?.[0]?.url || '',
    duration:v.duration?.text || ''}));
}

export function chooseProgressive(formats) {
  const found = (formats || []).filter(f => f.has_video && f.has_audio &&
    f.mime_type?.startsWith('video/mp4')).sort((a,b)=>(b.height || 0)-(a.height || 0))[0];
  if (!found) throw new Error('No compatible combined audio/video stream is available.');
  return found;
}

export function normalizeSegments(items, categories = ['sponsor'], duration = Infinity) {
  const sorted = (Array.isArray(items) ? items : []).filter(s =>
    categories.includes(s.category) && (!s.actionType || s.actionType === 'skip') &&
    Array.isArray(s.segment) && s.segment.length === 2 &&
    s.segment.every(Number.isFinite) && s.segment[0] >= 0 &&
    s.segment[1] > s.segment[0] && s.segment[0] < duration)
    .map(s => ({start:s.segment[0], end:Math.min(s.segment[1], duration)}))
    .sort((a,b)=>a.start-b.start);
  const merged=[];
  for (const s of sorted) {
    const previous=merged[merged.length-1];
    if (previous && s.start <= previous.end) previous.end=Math.max(previous.end,s.end);
    else merged.push({...s});
  }
  return merged;
}

// Tizen adaptation of SmartTube's position-window behavior. Upstream MIT notice
// is in THIRD_PARTY_NOTICES.md. Only auto-skip near the beginning of a segment,
// so a user can seek back into the middle to watch the skipped content.
export function skipTarget(seconds, segments, enabled, speed = 1) {
  if (!enabled || !Number.isFinite(seconds)) return null;
  const segment=segments.find(s => seconds >= s.start && seconds < s.end &&
    seconds <= Math.min(s.start + 2 * speed, s.end));
  return segment ? segment.end : null;
}

// Per-video state mirrors the APK's mActiveSegments removal. Confirm only after
// AVPlay reports a successful seek; failed seeks remain retryable.
export class SponsorSession {
  constructor(){this.setVideo(null,[]);}
  setVideo(id,segments){this.id=id;this.segments=segments;this.skipped=new Set();}
  target(seconds,{enabled=true,playing=true,speed=1}={}){
    if(!this.id||!playing)return null;
    return skipTarget(seconds,this.segments.filter(s=>!this.skipped.has(s.end)),enabled,speed);
  }
  confirm(end){this.skipped.add(end);}
}

export const SKIP_PRESETS=[
  {label:'Sponsors',categories:['sponsor']},
  {label:'Sponsors, intros & outros',categories:['sponsor','intro','outro']},
  {label:'All supported segments',categories:['sponsor','intro','outro','selfpromo','interaction','preview','music_offtopic','filler']}
];

export function controlTarget(current,direction){
  const controls=['query','search','sponsor','skip-options'];
  if(current==='query')return direction==='up'?'search':null;
  const index=controls.indexOf(current);
  if(index<0)return null;
  if(direction==='left'||direction==='right')
    return controls[Math.max(0,Math.min(controls.length-1,index+(direction==='left'?-1:1)))];
  return null;
}

export function nextIndex(current, direction, count, columns = 4) {
  if (count <= 0) return -1;
  const step={left:-1,right:1,up:-columns,down:columns}[direction] || 0;
  return Math.max(0,Math.min(count-1,current+step));
}
