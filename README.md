# Shiro (SUB) for Sora / Shiroxi

This module searches Shiro's catalog, lists aired episodes, and returns Shiro's available Japanese-audio **Sub** and **Hard Sub** sources. Dub is excluded. It checks each signed stream when loading an episode and omits servers that are currently failing. When a working source has an English subtitle track, it is included with the server name so you can match it to that server.

Shiro provides HLS and MP4 servers. Each is returned separately so you can switch servers if one buffers or drifts. The module passes through the site's original media and cannot correct a timing problem already present in a stream or in the app's player.

## Host and install

1. Upload `shiro-sub.js` and `shiro-sub.json` to a public GitHub repository or another HTTPS file host.
2. Open `configure.html` on your computer. Paste the public **raw folder URL** containing the files, for example `https://raw.githubusercontent.com/YOURNAME/sora-sources/main/`.
3. Download the configured JSON and upload it to the same folder, replacing `shiro-sub.json`.
4. In Sora or Shiroxi, import the raw JSON URL, for example `https://raw.githubusercontent.com/YOURNAME/sora-sources/main/shiro-sub.json`.

The manifest's search route points to Shiro's Browse search (`/browse?q=`); the module then queries Shiro's catalog source for matching titles.

Use the raw GitHub URL, not a page address containing `/blob/`. The helper works locally and only prepares the JSON; the module files must be hosted publicly for the app to load them.

## Notes

The source needs a Sora/Shiroxi version whose `fetchv2` supports POST requests and returns response headers. It uses a short-lived Shiro watch cookie and passes it to the selected stream and subtitle. On October 2, 2026, live checks returned search results for One Piece, Frieren and Naruto; details and episodes loaded; five Sub servers, a nested HLS playlist and sample segment, and two English subtitle tracks passed. A sixth server returned HTTP 502 and was automatically omitted. This confirms the module filters failed links; it does not verify long-duration audio sync. Network or Cloudflare restrictions may still affect the app.

The module does not transcode or alter media timestamps. Try the MP4 server or another server if HLS drifts; if every server drifts at the same point, the issue may be in the source encoding or the app's playback.
