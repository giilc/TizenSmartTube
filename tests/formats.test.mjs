import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHlsFormats} from '../src/formats.mjs';
const master='https://manifest.googlevideo.com/master.m3u8';

test('HLS external audio remains attached through master with exact bitrate constraint',()=>{
 const formats=parseHlsFormats(`#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",URI="audio.m3u8",NAME="English, stereo"\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1920x1080,FRAME-RATE=60,CODECS="avc1.64002a,mp4a.40.2",AUDIO="audio"\nvideo.m3u8\n`,master);
 assert.equal(formats[0].id,'auto');
 assert.equal(formats[1].url,master);
 assert.equal(formats[1].adaptiveInfo,'BITRATES=2500000|STARTBITRATE=HIGHEST');
 assert.equal(formats[1].height,1080);assert.equal(formats[1].fps,60);assert.match(formats[1].label,/1080p.*60 fps.*H.264/);
});
test('multiplexed HLS can choose a direct variant and excludes audio-only or untrusted variants',()=>{
 const formats=parseHlsFormats(`#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"\n720.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=120000,CODECS="mp4a.40.2"\naudio.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=9000000,RESOLUTION=3840x2160,CODECS="avc1.4d401f,mp4a.40.2"\nhttps://untrusted.example/video.m3u8\n`,master);
 assert.equal(formats.length,2);assert.equal(formats[1].url,'https://manifest.googlevideo.com/720.m3u8');assert.equal(formats[1].adaptiveInfo,undefined);
});
test('HLS missing audio group and bare video codec do not become silent quality choices',()=>{
 const formats=parseHlsFormats(`#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720,CODECS="avc1.4d401f",AUDIO="absent"\n720.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080,CODECS="avc1.4d401f"\n1080.m3u8\n`,master);
 assert.equal(formats.length,1);assert.equal(formats[0].id,'auto');
});
