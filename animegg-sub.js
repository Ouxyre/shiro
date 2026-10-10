// AnimeGG (SUB) 1.0.0 — Shirox/Sora async module.
// Return only the site's subbed players, with no external subtitle overlay.
var AG_BASE = 'https://www.animegg.org';
var AG_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

function agDecode(value) {
  var named = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',hellip:'…',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“'};
  return String(value || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function(all, key) {
    if (key.charAt(0) === '#') {
      var code = key.charAt(1).toLowerCase() === 'x' ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
    }
    return Object.prototype.hasOwnProperty.call(named,key.toLowerCase()) ? named[key.toLowerCase()] : all;
  });
}
function agText(value) { return agDecode(String(value || '').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim(); }
function agAttrs(tag) {
  var result = {}, match, re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  while ((match = re.exec(tag))) result[match[1].toLowerCase()] = agDecode(match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4]);
  return result;
}
function agURL(value) {
  var s = agDecode(value).trim().replace(/\\\//g,'/');
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s.replace(/^http:/i,'https:');
  if (s.slice(0,2) === '//') return 'https:' + s;
  if (s.charAt(0) === '/') return AG_BASE + s;
  return '';
}
function agSiteURL(value, series) {
  var s = agURL(value).replace(/^https:\/\/animegg\.org(?=\/)/i,AG_BASE).split('#')[0];
  if (!/^https:\/\/www\.animegg\.org\//i.test(s)) throw Error('AnimeGG: invalid page URL');
  if (series && !/^https:\/\/www\.animegg\.org\/series\/[^/?]+\/?$/i.test(s)) throw Error('AnimeGG: expected a series URL');
  return s;
}
async function agGet(url, referer) {
  if (typeof fetchv2 !== 'function') throw Error('AnimeGG requires a Shirox/Sora version with fetchv2');
  var response;
  try {
    response = await fetchv2(url, {'User-Agent':AG_UA, 'Referer':referer || AG_BASE + '/', 'Accept':'text/html,application/json;q=0.9,*/*;q=0.8'}, 'GET', null, null);
  } catch (e) { throw Error('AnimeGG request failed for ' + url + ': ' + String(e.message || e)); }
  var status = Number(response && (response.status || response.statusCode) || 200);
  if (status >= 400) throw Error('AnimeGG HTTP ' + status + ' for ' + url);
  var body = typeof response === 'string' ? response : response && typeof response.text === 'function' ? await response.text() : response && (response._data || response.body);
  if (typeof body !== 'string' || !body.trim()) throw Error('AnimeGG returned an empty page for ' + url);
  if (/Just a moment\.\.\.|cf-chl-|Attention Required!/.test(body)) throw Error('AnimeGG returned a browser verification page; open animegg.org in Safari first');
  return body;
}

async function searchResults(keyword) {
  var query = String(keyword || '').trim();
  if (!query) return '[]';
  var html = await agGet(AG_BASE + '/search/?q=' + encodeURIComponent(query));
  var results = [], seen = {}, match, re = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  while ((match = re.exec(html))) {
    var attrs = agAttrs(match[1]), href = agURL(attrs.href), heading = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(match[2]);
    if (!/\/series\//.test(href) || !heading || !/\bmse\b/.test(attrs['class'] || '') || seen[href]) continue;
    var img = /<img\b([^>]*)>/i.exec(match[2]), image = (img ? agURL(agAttrs(img[1]).src) : '') || AG_BASE + '/images/animegg-favicon.png';
    var title = agText(heading[1]);
    if (title) { seen[href] = true; results.push({title:title, image:image, href:href}); }
  }
  return JSON.stringify(results);
}

async function extractDetails(url) {
  var html = await agGet(agSiteURL(url,true));
  var plot = /<p\b[^>]*class\s*=\s*["'][^"']*\bptext\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(html);
  var aliases = /<span\b[^>]*>\s*Alternate Titles\s*:\s*([\s\S]*?)<\/span>/i.exec(html);
  return JSON.stringify({description:plot ? agText(plot[1]).replace(/^Plot Summary:\s*/i,'') : '', aliases:aliases ? agText(aliases[1]) : '', airdate:''});
}

async function extractEpisodes(url) {
  var html = await agGet(agSiteURL(url,true)), episodes = [], seen = {}, row, link;
  var rows = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  while ((row = rows.exec(html))) {
    var links = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
    while ((link = links.exec(row[1]))) {
      var attrs = agAttrs(link[1]);
      if (!/#subbed$/i.test(attrs.href || '')) continue;
      var href = agURL(attrs.href).split('#')[0], number = /-episode-(\d+(?:\.\d+)?)\/?$/i.exec(href);
      if (!number || seen[href]) continue;
      seen[href] = true;
      episodes.push({number:Number(number[1]), href:href + '#subbed'});
    }
  }
  episodes.sort(function(a,b) { return a.number - b.number; });
  if (!episodes.length) throw Error('AnimeGG: this series has no listed subbed episodes');
  return JSON.stringify(episodes);
}

function agPlayers(html) {
  var players = [], seen = {}, match, re = /<a\b([^>]*)>/gi;
  while ((match = re.exec(html))) {
    var attrs = agAttrs(match[1]);
    if (String(attrs['data-version'] || '').toLowerCase() !== 'subbed' || !/^\d+$/.test(attrs['data-id'] || '')) continue;
    var url = AG_BASE + '/embed/' + attrs['data-id'];
    if (!seen[url]) { seen[url] = true; players.push({url:url, name:agText(attrs['data-mirror']) || 'AnimeGG'}); }
  }
  return players;
}
function agLiteral(object, key) {
  var re = new RegExp('\\b' + key + '\\s*:\\s*("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')'), match = re.exec(object);
  if (!match) return '';
  if (match[1].charAt(0) === '"') { try { return JSON.parse(match[1]); } catch (_) { return ''; } }
  return match[1].slice(1,-1).replace(/\\(['"\\/])/g,'$1');
}
function agSources(html, player) {
  var array = /\b(?:var|let|const)\s+videoSources\s*=\s*\[([\s\S]*?)\]\s*;/i.exec(html);
  var out = [], item, re = /\{[^{}]*\}/g;
  if (!array) return out;
  while ((item = re.exec(array[1]))) {
    var file = agURL(agLiteral(item[0],'file')), label = agText(agLiteral(item[0],'label'));
    if (!file || !/\/[^?#]*\.mp4(?:[?#]|$)/i.test(file)) continue;
    var pixels = parseInt(label,10) || 0;
    out.push({pixels:pixels, label:label || 'Original', name:player.name, streamUrl:file,
      headers:{'User-Agent':AG_UA, 'Referer':player.url, 'Origin':AG_BASE}});
  }
  return out;
}

async function extractStreamUrl(url) {
  var page = agSiteURL(url,false), html = await agGet(page), players = agPlayers(html), sources = [], failures = [];
  if (!players.length) throw Error('AnimeGG: no subbed player listed for this episode; it may be unavailable or not released');
  for (var i = 0; i < players.length; i++) {
    try {
      // Resolve afresh for every playback; the /play URLs contain temporary signatures.
      var embed = await agGet(players[i].url,page), found = agSources(embed,players[i]);
      if (!found.length) throw Error('no MP4 video sources in player');
      sources = sources.concat(found);
    } catch (e) { failures.push(players[i].name + ': ' + String(e.message || e)); }
  }
  if (!sources.length) throw Error('AnimeGG: could not resolve subbed video. ' + failures.join('; '));
  sources.sort(function(a,b) { return b.pixels - a.pixels || a.name.localeCompare(b.name); });
  var qualities = [], seen = {}, streams = [];
  sources.forEach(function(s) { if (qualities.indexOf(s.pixels) < 0) qualities.push(s.pixels); });
  sources.forEach(function(s) {
    if (seen[s.streamUrl]) return;
    seen[s.streamUrl] = true;
    // Shirox sorts stream titles alphabetically, including when advancing episodes.
    var rank = String(qualities.indexOf(s.pixels) + 1);
    if (rank.length < 2) rank = '0' + rank;
    streams.push({title:rank + ' - ' + s.label + ' - ' + s.name + ' (SUB)', streamUrl:s.streamUrl, headers:s.headers});
  });
  if (failures.length && typeof console !== 'undefined') console.log('AnimeGG skipped unavailable player: ' + failures.join('; '));
  return JSON.stringify({streams:streams});
}
