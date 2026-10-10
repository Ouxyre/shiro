# AnimeGG (SUB) 1.0.0

Shirox/Sora source for https://www.animegg.org/.

## Install

Import this URL in Shirox's module/source importer:

https://raw.githubusercontent.com/Ouxyre/shiro/main/animegg-sub.json

The JSON and JavaScript must both be present in the root of Ouxyre/shiro on the main branch. The included JSON is already configured for that location. No configure.html step is needed. This is a separate source named **AnimeGG (SUB)**.

## Quality and subtitles

Every MP4 quality exposed by each listed subbed player is returned. The highest available resolution appears first, followed by the lower qualities, so you can select 1080p directly inside Shirox when the episode offers it. Numbered labels preserve that ordering when Shirox sorts the options alphabetically. The app may remember a quality you manually selected; choose the first option to use the best quality.

An episode that only offers SD cannot be upgraded to 1080p. For example, Naruto episode 1 currently has only the site's 480p option (the actual PAL video is 576 lines).

Dub players are excluded. `softsub` is false and the script supplies no subtitle URLs or caption tracks, preventing the module from adding a second subtitle overlay. Existing subtitles embedded in the video remain visible. Episode links come from the site's actual SUBBED listings; missing episodes are not invented. The site's separate “The apothecary diaries season 2” listing was dub-only when tested; use a subbed listing if available.

## If NextDNS blocks playback

If Safari cannot open the site, check NextDNS's log for the blocked hostname. Allow `animegg.org` including `www.animegg.org` as needed. The tested videos and posters use `vidcache.net` and its subdomains, with video delivery on port 8166 and posters on port 8161. Allow those media hostnames if NextDNS blocks them. There is no need to allow advertising domains to use this module.

## Verification

Live checks passed on October 10, 2026:

- Searches: One Piece, Naruto, Apothecary, and a nonexistent title.
- Series details and real subbed episode lists: One Piece, Naruto, Kusuriya no Hitorigoto.
- One Piece episode 1180: 1080p, 720p, 480p.
- Naruto episode 1: subbed player only; the separate dub player was not requested.
- Kusuriya no Hitorigoto episode 2: 1080p, 720p, 480p, 360p.
- All eight quality links returned MP4 video bytes with HTTP 206 range support. Both tested 1080p files have 1920×1080 track dimensions.
- A 720p/480p fixture confirmed 720p stays first after Shirox's alphabetic sorting.
- No external subtitle fields are returned.

The script was executed with a fetchv2-shaped response in a JavaScript VM without browser globals. These checks verify extraction and media delivery; they do not constitute a test inside your iPhone's Shirox app or a full-episode audio/video synchronization test. The module leaves the original MP4 audio/video tracks and timestamps unchanged.

The resolver fetches player pages afresh for every playback because their media signatures expire. Retrying an episode obtains current links.
