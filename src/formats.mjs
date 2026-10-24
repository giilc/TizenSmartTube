export function mediaUrl(value,base){
  const url=new URL(value,base);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.googlevideo.com')||url.username||url.password)
    throw Error('Untrusted video URL.');
  return url.href;
}

function attributes(line){
  const result={};const pattern=/(?:^|,)([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;let match;
  while((match=pattern.exec(line)))result[match[1]]=match[2].replace(/^"|"$/g,'');
  return result;
}

export function codecLabel(codec=''){
  const video=/avc1|avc3/i.test(codec)?'H.264':/hvc1|hev1/i.test(codec)?'HEVC':/vp09|vp9/i.test(codec)?'VP9':/av01/i.test(codec)?'AV1':'';
  const audio=/mp4a/i.test(codec)?'AAC':/opus/i.test(codec)?'Opus':/ec-3/i.test(codec)?'E-AC-3':/ac-3/i.test(codec)?'AC-3':'';
  return [video,audio].filter(Boolean).join(' / ') || codec || 'Unknown codec';
}

export function formatLabel({height=0,fps=0,codec='',protocol='',bitrate=0}){
  return `${height?height+'p'+(fps>30?Math.round(fps):''):'Adaptive'} · ${codecLabel(codec)} · ${protocol.toUpperCase()}${bitrate?' · '+(bitrate/1e6).toFixed(2)+' Mbps':''}`;
}

export function parseHlsFormats(text,masterUrl){
  const master=mediaUrl(masterUrl);
  const auto={id:'auto',label:'Auto · HLS',url:master,masterUrl:master,protocol:'hls',height:0,fps:0,codec:'',bitrate:0};
  if(!text.trimStart().startsWith('#EXTM3U'))throw Error('Invalid HLS playlist.');
  const lines=text.split(/\r?\n/).map(line=>line.trim());
  const audioGroups=new Map();
  for(const line of lines){
    if(!line.startsWith('#EXT-X-MEDIA:'))continue;
    const data=attributes(line.slice(13));
    if(data.TYPE==='AUDIO'&&data['GROUP-ID']){
      const group=audioGroups.get(data['GROUP-ID']) || [];
      group.push(data);audioGroups.set(data['GROUP-ID'],group);
    }
  }
  const choices=[];const seen=new Set();
  for(let i=0;i<lines.length;i++){
    if(!lines[i].startsWith('#EXT-X-STREAM-INF:'))continue;
    const data=attributes(lines[i].slice(18));
    const resolution=/^(\d+)x(\d+)$/i.exec(data.RESOLUTION || '');
    const bitrate=Number(data.BANDWIDTH),height=Number(resolution?.[2]),fps=Number(data['FRAME-RATE']) || 0;
    if(!height||!Number.isSafeInteger(bitrate)||bitrate<=0)continue;
    let j=i+1;while(j<lines.length&&(!lines[j]||lines[j].startsWith('#')))j++;
    if(!lines[j])continue;
    try{
      const variant=mediaUrl(lines[j],master);const codec=data.CODECS || '';
      const group=data.AUDIO?audioGroups.get(data.AUDIO):null;
      // A video playlist referring to separate audio must stay on the master.
      // Dropping that relation makes otherwise valid quality choices silent.
      if(data.AUDIO&&!group?.length)continue;
      const external=!!group?.some(track=>track.URI);
      if(group)for(const track of group)if(track.URI)mediaUrl(track.URI,master);
      const hasAudio=/mp4a|opus|ac-3|ec-3/i.test(codec);
      if(!group&&!hasAudio)continue;
      const key=external?'bitrate-'+bitrate:variant;
      if(seen.has(key))continue;seen.add(key);
      const choice={id:'hls-'+bitrate+'-'+height+'-'+choices.length,url:external?master:variant,
        protocol:'hls',masterUrl:master,height,fps,codec,bitrate};
      // Samsung's adaptive-streaming guide defines SKIPBITRATE as a bitrate
      // to exclude. Do not accidentally exclude the one requested rendition.
      if(external)choice.adaptiveInfo=`BITRATES=${bitrate}|STARTBITRATE=HIGHEST`;
      choice.label=formatLabel(choice);choices.push(choice);
    }catch{/* Ignore a malformed/untrusted variant rather than offering it. */}
  }
  choices.sort((a,b)=>b.height-a.height||b.fps-a.fps||b.bitrate-a.bitrate);
  return [auto,...choices];
}
