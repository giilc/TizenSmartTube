# yt-dlp EJS 0.8.0

Upstream: https://github.com/yt-dlp/ejs

The two text files are unchanged solver bundles from the official PyPI wheel:
https://files.pythonhosted.org/packages/py3/y/yt-dlp-ejs/yt_dlp_ejs-0.8.0-py3-none-any.whl

Wheel SHA-256: `79300e5fca7f937a1eeede11f0456862c1b41107ce1d726871e0207424f4bdb4`

Archive entries: `yt_dlp_ejs/yt/solver/lib.min.js` and `yt_dlp_ejs/yt/solver/core.min.js`. The `.txt` suffix lets the worker load them as source strings through esbuild. `solver-context.mjs` confines their generated environment shims to a separate object; the code must not run against the widget's Window.

EJS is Unlicense. Bundled Meriyah6.1.4 is ISC; Astring1.9.0 is MIT. Full notices are preserved in the bundles and in `licenses/yt-dlp-ejs.txt` and `licenses/ejs-bundled.txt`.

YouTube's player script is downloaded on the TV when needed. No generated YouTube player script is checked into the source or normal package.
