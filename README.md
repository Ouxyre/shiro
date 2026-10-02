# Shiro (SUB) for Sora / Shiroxi

This module searches Shiro's catalog, lists aired episodes, and returns Shiro's available Japanese-audio **Sub** and **Hard Sub** sources. Dub is excluded. When a source has an English subtitle track, it is included with the server name so you can match it to that server.

Shiro provides HLS and MP4 servers. Each is returned separately so you can switch servers if one buffers or drifts. The module passes through the site's original media and cannot correct a timing problem already present in a stream or in the app's player.

## Host and install

1. Upload `shiro-sub.js` and `shiro-sub.json` to a public GitHub repository or another HTTPS file host.
2. Open `configure.html` on your computer. Paste the public **raw folder URL** containing the files, for example `https://raw.githubusercontent.com/YOURNAME/sora-sources/main/`.
3. Download the configured JSON and upload it to the same folder, replacing `shiro-sub.json`.
4. In Sora or Shiroxi, import the raw JSON URL, for example `https://raw.githubusercontent.com/YOURNAME/sora-sources/main/shiro-sub.json`.

Use the raw GitHub URL, not a page address containing `/blob/`. The helper works locally and only prepares the JSON; the module files must be hosted publicly for the app to load them.

## Notes

The source needs a Sora/Shiroxi version whose `fetchv2` supports POST requests and returns response headers. It uses a short-lived Shiro watch cookie and passes it to the selected stream and subtitle. If stream loading fails, update the app and retry. Native in-app playback and long-duration audio sync could not be verified from this module build environment.

The module does not transcode or alter media timestamps. Try the MP4 server or another server if HLS drifts; if every server drifts at the same point, the issue may be in the source encoding or the app's playback.
