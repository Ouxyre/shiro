/* Shiro SUB 1.0.3. MIT. Japanese/sub variants only; original media timelines. */
var SH_BASE='https://shiro.so',SH_COOKIE='',SH_CACHE={};
var SH_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
function shLog(e){console.log('Shiro: '+String(e&&e.message||e));}
function shURL(p){if(/^https:\/\//.test(p))return p;if(/^\/(?!\/)/.test(p))return SH_BASE+p;throw Error('Invalid media URL');}
function shHeaders(){var h={'User-Agent':SH_UA,Referer:SH_BASE+'/',Origin:SH_BASE};if(SH_COOKIE)h.Cookie=SH_COOKIE;return h;}
async function shFetch(url,method,body){
 if(typeof fetchv2!=='function')throw Error('This source requires fetchv2 with POST support');
 var h=shHeaders();if(body)h['Content-Type']='application/json';
 // Do not send the site cookie to the catalog provider.
 if(url.indexOf(SH_BASE+'/')!==0){delete h.Cookie;delete h.Origin;delete h.Referer;}
 // Shiroxi's fetchv2 bridge converts its body argument with JS toString().
 // Pass JSON text explicitly; passing an object becomes "[object Object]".
 var payload=body==null?null:typeof body==='string'?body:JSON.stringify(body);
 var r=await fetchv2(url,h,method||'GET',payload);
 if(r&&r.headers){var value='';if(typeof r.headers.get==='function')value=r.headers.get('set-cookie')||'';else Object.keys(r.headers).forEach(function(k){if(k.toLowerCase()==='set-cookie')value=String(r.headers[k]);});var m=value.match(/(?:^|[,;]\s*)(shiro_watch=[^;,\s]+)/);if(m)SH_COOKIE=m[1];}
 if(r&&r.status>=400)throw Error('HTTP '+r.status+' from '+url.split('/')[2]);
 return typeof r==='string'?r:typeof r.text==='function'?await r.text():r._data||r.body;
}
async function shJSON(url,method,body){var s=await shFetch(url,method,body);if(typeof s!=='string'||/^\s*</.test(s))throw Error('Expected JSON response');return JSON.parse(s);}
var SH_FIELDS='id idMal title { english romaji native } description startDate { year } coverImage { large } episodes status nextAiringEpisode { episode } streamingEpisodes { title }';
async function shGraph(query,variables){var r=await shJSON('https://graphql.anilist.co','POST',{query:query,variables:variables});if(r.errors||!r.data)throw Error('Catalog unavailable');return r.data;}
function shID(url){var m=String(url).match(/^https:\/\/shiro\.so\/anime\/(\d+)(?:-|\/|$)/);if(!m)throw Error('Invalid Shiro URL');return Number(m[1]);}
function shTitle(x){return x.title.english||x.title.romaji||String(x.id);}
function shHref(x){var name=shTitle(x);try{name=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}catch(e){}return SH_BASE+'/anime/'+x.id+'-'+name.toLowerCase().replace(/&/g,' and ').replace(/[×✕]/g,' x ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/-{2,}/g,'-');}
async function shDetail(id){if(SH_CACHE[id])return SH_CACHE[id];var d=await shGraph('query($id:Int){Media(id:$id,type:ANIME){'+SH_FIELDS+'}}',{id:id});if(!d.Media)throw Error('Title missing');if(Object.keys(SH_CACHE).length>40)SH_CACHE={};return SH_CACHE[id]=d.Media;}
function shCount(d){var cap=Number(d.episodes)||0,n=d.status==='FINISHED'?cap:0;if(d.nextAiringEpisode)n=Math.max(n,Number(d.nextAiringEpisode.episode)-1);(d.streamingEpisodes||[]).forEach(function(ep,i){var m=String(ep.title).match(/\b(?:episode|ep\.?)\s*(\d+)/i);var x=m?Number(m[1]):i+1;if(!cap||x<=cap)n=Math.max(n,x);});return cap?Math.min(n,cap):n;}
async function searchResults(keyword){try{keyword=String(keyword||'').trim();if(keyword.length<2)return '[]';var r=await shGraph('query($q:String){Page(page:1,perPage:40){media(search:$q,type:ANIME){'+SH_FIELDS+'}}}',{q:keyword});return JSON.stringify(r.Page.media.filter(function(x){return shCount(x)>0;}).map(function(x){SH_CACHE[x.id]=x;return{title:shTitle(x),image:x.coverImage.large,href:shHref(x)};}));}catch(e){shLog(e);return '[]';}}
async function extractDetails(url){try{var d=await shDetail(shID(url));return JSON.stringify({description:String(d.description||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&'),aliases:[d.title.romaji,d.title.native].filter(Boolean).join(' / '),airdate:String(d.startDate.year||'')});}catch(e){shLog(e);return '{}';}}
async function extractEpisodes(url){try{var d=await shDetail(shID(url)),out=[],n=shCount(d);for(var i=1;i<=n;i++)out.push({number:i,href:shHref(d)+'/'+i});return JSON.stringify(out);}catch(e){shLog(e);return '[]';}}
async function shResults(data){
 if(data.status!=='ready'||!Array.isArray(data.variants))throw Error('Episode unavailable: '+(data.reason||data.status));
 var candidates=[],seen={};
 data.variants.filter(function(v){return v.id==='sub'||v.id==='hsub';}).forEach(function(v){(v.sources||[]).forEach(function(s){
 if(!s.url||!(/mpegurl/i.test(s.type)||s.type==='video/mp4'))return;
 var u=shURL(s.url);if(seen[u])return;seen[u]=true;
 var label=String(s.label||'Server')+' • '+(v.id==='hsub'?'Hard Sub':'Sub')+(s.type==='video/mp4'?' • MP4':' • HLS');
 candidates.push({title:label,streamUrl:u,headers:shHeaders(),format:s.type==='video/mp4'?'mp4':'hls',source:s});
 });});
 // Check each signed link before offering it so temporary upstream failures do not
 // appear as usable servers. MP4 is checked with a tiny byte range.
 var checks=await Promise.all(candidates.map(async function(candidate){
  var headers=shHeaders();
  if(candidate.format==='mp4')headers.Range='bytes=0-1023';
  try{
   var response=await fetchv2(candidate.streamUrl,headers),status=response&&response.status||200;
   if(status>=400)throw Error('HTTP '+status);
   var body=typeof response==='string'?response:typeof response.text==='function'?await response.text():response._data||response.body||'';
   if(candidate.format==='hls'&&!/^\s*#EXTM3U/.test(body))throw Error('Invalid HLS playlist');
   if(candidate.format==='mp4'&&(status!==206||!body.length))throw Error('MP4 server does not support byte ranges');
   var linkedTracks=(candidate.source.tracks||[]).filter(function(t){return /^(en|eng)(-|$)/i.test(t.language||'')||/^English/i.test(t.label||'');}).map(function(t){return{title:String(candidate.source.label)+' — '+(t.label||'English'),url:shURL(t.src),headers:shHeaders()};});
   return {stream:{title:candidate.title,streamUrl:candidate.streamUrl,headers:candidate.headers},tracks:linkedTracks};
  }catch(error){shLog(candidate.title+': '+String(error&&error.message||error));return null;}
 }));
 var streams=[],tracks=[],trackSeen={};
 checks.forEach(function(result){if(!result)return;streams.push(result.stream);result.tracks.forEach(function(t){if(!trackSeen[t.url]){trackSeen[t.url]=true;tracks.push(t);}});});
 // Prefer MP4 as the first alternative to adaptive HLS.
 streams.sort(function(a,b){return Number(b.title.indexOf('MP4')>=0)-Number(a.title.indexOf('MP4')>=0);});
 // Keep only English subtitle files that the selected sub servers can currently serve.
 var checkedTracks=await Promise.all(tracks.map(async function(track){try{
  var r=await fetchv2(track.url,track.headers),status=r&&r.status||200;
  if(status>=400)return null;
  var content=typeof r==='string'?r:typeof r.text==='function'?await r.text():r._data||r.body||'';
  return /WEBVTT|\[Script Info\]|^\s*\d+\s*\r?\n\s*\d{2}:\d{2}/.test(content)?track:null;
 }catch(error){shLog('Subtitle: '+String(error&&error.message||error));return null;}}));
 // Shiroxi applies top-level subtitles to all streams. Never automatically attach
 // one server's subtitles to other releases; offer explicitly labelled tracks.
 return {streams:streams,allSubtitles:checkedTracks.filter(Boolean)};
}
async function extractStreamUrl(url){try{
 var id=shID(url),m=String(url).match(/\/(\d+)(?:[?#].*)?$/);if(!m)throw Error('Select an episode');
 var episode=Number(m[1]),d=await shDetail(id);if(episode<1||episode>shCount(d))throw Error('Episode outside aired range');
 await shFetch(shHref(d)+'/'+episode);
 var request={anilistId:id,malId:d.idMal||null,episode:episode};
 // Shiro primes the preferred SUB source, then asks for every available source.
 var first=await shJSON(SH_BASE+'/api/episode','POST',{anilistId:id,malId:d.idMal||null,episode:episode,first:true,prefer:'sub'});
 var data=await shJSON(SH_BASE+'/api/episode','POST',request);
 if(data.status==='ready'&&first.status==='ready'&&Array.isArray(first.variants)){
  first.variants.forEach(function(v){var found=data.variants.find(function(x){return x.id===v.id;});if(!found)data.variants.push(v);else{found.sources=found.sources||[];(v.sources||[]).forEach(function(s){if(!found.sources.some(function(x){return x.id===s.id;}))found.sources.unshift(s);});}});
 }else if(data.status!=='ready'&&first.status==='ready')data=first;
 return JSON.stringify(await shResults(data));
 }catch(e){shLog(e);return JSON.stringify({streams:[]});}}
