# Shiro SUB 1.0.7 — no external subtitle overlay

This version keeps the Japanese Sub and Hard Sub server choices, sets `softsub` to `false`, and supplies no external subtitle files. Hard subtitles remain visible because they are already burned into the video. Servers that require external soft subtitles no longer receive those files; use a Hard Sub server when you want English captions.

The actual stream URLs, request handling, cookies, and media timestamps are unchanged from 1.0.6. Keep your NextDNS allowlist entry for `shiro.so`.

## Install

1. Replace **both** `shiro-sub.js` and `shiro-sub.json` in the `Ouxyre/shiro` GitHub repository using the files in this package.
2. Remove the previous Shiro source from Shiroxi and reimport `https://raw.githubusercontent.com/Ouxyre/shiro/main/shiro-sub.json`.
3. Confirm version **1.0.7**. Open the episode afresh and select a Hard Sub server. A saved Resume entry may still reference the subtitle track attached by the older version.

No configure.html step is needed; the JSON is already configured for your repository.

## Verification

A regression check compares mixed Sub, Hard Sub and Dub API responses against 1.0.6. All included video URLs and playback headers remain identical, Dub stays excluded, and no external subtitle fields are returned even when the API supplies subtitle tracks. The manifest version and hosted script URL are checked too. This change has not been tested inside your iPhone player.
