# Shiro SUB 1.0.6 for Shiroxi / Sora

Japanese-audio Sub and Hard Sub servers; Dub excluded. Search and episode metadata come from AniList. Playback sources come from Shiro's episode API. An AniList listing does not guarantee that Shiro has that episode.

## Replace the hosted files

This JSON is already configured for your repository, `Ouxyre/shiro`, branch `main`.

1. Upload **both** `shiro-sub.js` and `shiro-sub.json` from this package to that repository, replacing the previous files with the same names.
2. Remove the previous Shiro source from Shiroxi, then import:
   `https://raw.githubusercontent.com/Ouxyre/shiro/main/shiro-sub.json`
3. The installed source must show version **1.0.6**. Its script URL ends with `shiro-sub.js?rev=1.0.6`.

Changing the JSON filename alone does not change the playback script. Both files need replacing.

For another host, open `configure.html`, enter the public HTTPS raw folder URL, download the configured JSON, then upload it alongside the JS file.

## What changed

- Uses `https://www.shiro.so` for site requests and media, while accepting saved episode links on `https://shiro.so`.
- If native site requests fail, starts a normal episode page in Shiroxi's browser engine, reads its watch cookie, and retries the API with `fetchv2(..., {engine: "webview"})`. The browser engines share their cookie store in the current Shiroxi source. The selected stream and subtitle receive that cookie too.
- Sends POST bodies as JSON text, matching Shiroxi's bridge.
- Returns all supplied Sub/Hard Sub servers without binary preloading. MP4 appears first when available.
- Honors the site's Retry-After delay once, up to 60 seconds. Keeps the preferred playable source if the additional-server request subsequently fails. Persistent limits are reported explicitly.
- Stream errors reject with the version, request engine and failed request. They are no longer silently converted to an empty stream list.

The browser fallback requires a Shiroxi version providing `networkFetch` and the WebKit option in `fetchv2`. If that feature is absent, the log says so. It does not click page controls or use the page's Dub selection.

## Verification, October 2, 2026

- Live search: One Piece, Frieren and Naruto.
- Live One Piece episode 1: six Sub servers, MP4 range response, HLS master and child playlists, sample media segment, and three English subtitle files.
- The exact AniList title from your screenshot (200637): all twelve episodes returned a Lemon Sub stream across the checks; playlists from episodes 1, 6 and 12 were fetched. One temporary unavailable response and one site rate limit occurred during repeated checks.
- Forced native "bad URL" on the episode page and API: browser fallback, watch-cookie transfer, saved links and Sub-only filtering passed regression tests.
- A curl simulation of the browser cookie-store contract recovered from a forced native "bad URL" against the live site; its stream playlist loaded with the returned playback headers.
- Rate-limit tests cover waiting as requested, bounded retries, retaining an already-found stream and explicit failure.

These checks do not run the module inside an iPhone or WKWebView. Installation on your specific Shiroxi build and long-duration audio/video synchronization remain unverified. The module passes through the original media and does not change its timestamps.
