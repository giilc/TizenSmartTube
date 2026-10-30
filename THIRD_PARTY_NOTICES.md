# Third-party notices

Unofficial experimental adaptation. Not endorsed by SmartTube, YouTube, Samsung or SponsorBlock.

## SmartTube

Source: https://github.com/yuliskov/SmartTube

SponsorBlock auto-skip timing in src/core.mjs is adapted from SponsorBlockController.java at commit 168e48483a000951a9c2b49689dd703405a7683b. The behavior was subsequently checked against the 32.68 release APK and release tag 32.68s (94553dd7151e8a911926ef2c9e3ef30fca007b48). Per-video skip state and category presets are adaptations, not complete parity. Android UI/player code is not included.

MIT License

Copyright (c) 2020-present yuliskov

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## YouTube.js

Source: https://github.com/LuanRT/YouTube.js

MIT License

Copyright (c) 2021 LuanRT

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## core-js 3.51.0

MIT License

Copyright (c) 2013–2025 Denis Pushkarev (zloirock.ru)
Copyright (c) 2025–2026 CoreJS Company (core-js.io)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Roboto Condensed font: Google Fonts contributors, SIL Open Font License 1.1. Bundled license: fonts/OFL.txt. Source: https://github.com/google/fonts/tree/main/ofl/robotocondensed

HLS.js 1.7.3: Copyright its contributors, Apache License 2.0. Source: https://github.com/video-dev/hls.js . Upstream copyright and attribution notice: HLS-LICENSE.txt. Full Apache 2.0 terms: licenses/Apache-2.0.txt.

## Additional bundled dependencies

Meriyah (ISC, https://github.com/meriyah/meriyah) and fflate (MIT, https://github.com/101arrowz/fflate) are included through YouTube.js. Their full notices are included in licenses/meriyah.txt and licenses/fflate.txt. Exact upstream licenses for YouTube.js and core-js are also preserved in licenses/.

@bufbuild/protobuf (https://github.com/bufbuild/protobuf-es) is bundled through YouTube.js. Buf Technologies modules are Apache-2.0; the Google varint implementation is BSD-3-Clause. Copyright notices and terms are preserved in licenses/protobuf-buf-notice.txt, licenses/Apache-2.0.txt and licenses/protobuf-google-bsd.txt.

## dash.js 4.7.4

Source: https://github.com/Dash-Industry-Forum/dash.js/tree/v4.7.4 . BSD-3-Clause; complete terms in licenses/dashjs.txt. The bundled media player includes third-party notices in licenses/dashjs-bundled-notices.txt, with full dependency licenses alongside them.

## yt-dlp EJS 0.8.0

Source: https://github.com/yt-dlp/ejs . Solver bundles in vendor/ejs/ are pinned to the0.8.0 PyPI wheel, SHA-25679300e5fca7f937a1eeede11f0456862c1b41107ce1d726871e0207424f4bdb4. EJS is Unlicense (licenses/yt-dlp-ejs.txt). Bundled Meriyah6.1.4 is ISC and Astring1.9.0 is MIT; full bundled notices are preserved in licenses/ejs-bundled.txt.

The TV request/profile and TV-script matching approach was investigated using OmegaTube (https://github.com/IIyn/omegatube , GPL-3.0). Its C++/C# source is not included in this app. The JavaScript provider here is independently implemented; the EJS solver is obtained separately from its upstream package.
