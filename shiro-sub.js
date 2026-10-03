/* Shiro SUB 1.0.7. MIT. Japanese/sub variants only; original media timelines. */
var SH_BASE='https://www.shiro.so',SH_COOKIE='',SH_CACHE={},SH_WEB=false,SH_RATE_RETRIED=false;
var SH_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
function shLog(e){console.log('Shiro: '+String(e&&e.message||e));}
function shURL(p){if(/^https:\/\/(?:www\.)?shiro\.so\//.test(p))return p.replace(/^https:\/\/(?:www\.)?shiro\.so/,SH_BASE);if(/^https:\/\//.test(p))return p;if(/^\/(?!\/)/.test(p))return SH_BASE+p;throw Error('Invalid media URL');}
function shHeaders(){var h={'User-Agent':SH_UA,Referer:SH_BASE+'/',Origin:SH_BASE};if(SH_COOKIE)h.Cookie=SH_COOKIE;return h;}
function shHeader(r,name){if(!r||!r.headers)return '';if(typeof r.headers.get==='function')return r.headers.get(name)||'';var value='';Object.keys(r.headers).forEach(function(k){if(k.toLowerCase()===name.toLowerCase())value=String(r.headers[k]);});return value;}
async function shFetch(url,method,body){
 if(typeof fetchv2!=='function')throw Error('This source requires fetchv2 with POST support');
 var h=shHeaders();if(body)h['Content-Type']='application/json';
 // Do not send the site cookie to the catalog provider.
 if(url.indexOf(SH_BASE+'/')!==0){delete h.Cookie;delete h.Origin;delete h.Referer;}
 // Shiroxi's fetchv2 bridge converts its body argument with JS toString().
 // Pass JSON text explicitly; passing an object becomes "[object Object]".
 var payload=body==null?null:typeof body==='string'?body:JSON.stringify(body);
 var site=url.indexOf(SH_BASE+'/')===0,r;
 try{r=await fetchv2(url,h,method||'GET',payload,site&&SH_WEB?{engine:'webview'}:null);}
 catch(e){var failure=Error('Shiro 1.0.7 '+(SH_WEB&&site?'WebKit':'native')+' '+(method||'GET')+' '+url.split('?')[0]+': '+String(e&&e.message||e));failure.transport=site;throw failure;}
 if(site){var m=shHeader(r,'set-cookie').match(/(?:^|[,;]\s*)(shiro_watch=[^;,\s]+)/);if(m)SH_COOKIE=m[1];}
 if(site&&r&&r.status===429){
  var retry=shHeader(r,'retry-after'),seconds=Number(retry);
  if(!isFinite(seconds)||seconds<=0)seconds=retry?Math.ceil((Date.parse(retry)-Date.now())/1000):10;
  if(!isFinite(seconds)||seconds<=0)seconds=10;
  if(!SH_RATE_RETRIED&&seconds<=60&&typeof setTimeout==='function'){
   SH_RATE_RETRIED=true;console.log('Shiro 1.0.7: site rate limit; retrying after '+seconds+' seconds');
   await shDelay(seconds*1000);return await shFetch(url,method,body);
  }
  throw Error('Shiro 1.0.7: site rate limit; retry after '+seconds+' seconds');
 }
 if(r&&r.status>=400){var failure=Error('Shiro 1.0.7 HTTP '+r.status+' '+(method||'GET')+' '+url.split('?')[0]);failure.session=site&&(r.status===401||r.status===403);throw failure;}
 return typeof r==='string'?r:typeof r.text==='function'?await r.text():r._data||r.body;
}
async function shJSON(url,method,body){var s=await shFetch(url,method,body);if(typeof s!=='string'||/^\s*</.test(s))throw Error('Expected JSON response');return JSON.parse(s);}
var SH_FIELDS='id idMal title { english romaji native } description startDate { year } coverImage { large } episodes status nextAiringEpisode { episode } streamingEpisodes { title }';
async function shGraph(query,variables){var r=await shJSON('https://graphql.anilist.co','POST',{query:query,variables:variables});if(r.errors||!r.data)throw Error('Catalog unavailable');return r.data;}
function shID(url){var m=String(url).trim().match(/^https:\/\/(?:www\.)?shiro\.so\/anime\/(\d+)(?:-|\/|$)/);if(!m)throw Error('Invalid Shiro URL');return Number(m[1]);}
function shTitle(x){return x.title.english||x.title.romaji||String(x.id);}
function shHref(x){var name=shTitle(x);try{name=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}catch(e){}return SH_BASE+'/anime/'+x.id+'-'+name.toLowerCase().replace(/&/g,' and ').replace(/[×✕]/g,' x ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/-{2,}/g,'-');}
async function shDetail(id){if(SH_CACHE[id])return SH_CACHE[id];var d=await shGraph('query($id:Int){Media(id:$id,type:ANIME){'+SH_FIELDS+'}}',{id:id});if(!d.Media)throw Error('Title missing');if(Object.keys(SH_CACHE).length>40)SH_CACHE={};return SH_CACHE[id]=d.Media;}
function shCount(d){var cap=Number(d.episodes)||0,n=d.status==='FINISHED'?cap:0;if(d.nextAiringEpisode)n=Math.max(n,Number(d.nextAiringEpisode.episode)-1);(d.streamingEpisodes||[]).forEach(function(ep,i){var m=String(ep.title).match(/\b(?:episode|ep\.?)\s*(\d+)/i);var x=m?Number(m[1]):i+1;if(!cap||x<=cap)n=Math.max(n,x);});return cap?Math.min(n,cap):n;}
async function searchResults(keyword){try{keyword=String(keyword||'').trim();if(keyword.length<2)return '[]';var r=await shGraph('query($q:String){Page(page:1,perPage:40){media(search:$q,type:ANIME){'+SH_FIELDS+'}}}',{q:keyword});return JSON.stringify(r.Page.media.filter(function(x){return shCount(x)>0;}).map(function(x){SH_CACHE[x.id]=x;return{title:shTitle(x),image:x.coverImage.large,href:shHref(x)};}));}catch(e){shLog(e);return '[]';}}
async function extractDetails(url){try{var d=await shDetail(shID(url));return JSON.stringify({description:String(d.description||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&'),aliases:[d.title.romaji,d.title.native].filter(Boolean).join(' / '),airdate:String(d.startDate.year||'')});}catch(e){shLog(e);return '{}';}}
async function extractEpisodes(url){try{var d=await shDetail(shID(url)),out=[],n=shCount(d);for(var i=1;i<=n;i++)out.push({number:i,href:shHref(d)+'/'+i});return JSON.stringify(out);}catch(e){shLog(e);return '[]';}}
async function shResults(data){
 if(data.status!=='ready'||!Array.isArray(data.variants))throw Error('Episode unavailable: '+(data.reason||data.status));
 var streams=[],seen={};
 data.variants.filter(function(v){return v.id==='sub'||v.id==='hsub';}).forEach(function(v){(v.sources||[]).forEach(function(s){
  if(!s.url||!(/mpegurl/i.test(s.type)||s.type==='video/mp4'))return;
  var u=shURL(s.url);if(seen[u])return;seen[u]=true;
  var label=String(s.label||'Server')+' • '+(v.id==='hsub'?'Hard Sub':'Sub')+(s.type==='video/mp4'?' • MP4':' • HLS');
  // Return signed URLs immediately. Shiroxi converts binary probe reads to text,
  // which can make valid MP4 or HLS streams look empty before playback starts.
  streams.push({title:label,streamUrl:u,headers:shHeaders()});
 });});
 streams.sort(function(a,b){return Number(b.title.indexOf('MP4')>=0)-Number(a.title.indexOf('MP4')>=0);});
 if(!streams.length)throw Error('Shiro 1.0.7: this episode returned no Sub or Hard Sub sources');
 // Shiroxi applies top-level subtitle files to every server, including Hard Sub.
 // Omit subtitle/subtitles/allSubtitles so it cannot auto-load a second overlay.
 return {streams:streams};
}
function shDelay(ms){return typeof setTimeout==='function'?new Promise(function(resolve){setTimeout(resolve,ms);}):Promise.resolve();}
async function shEpisodeData(request){
 var data=null;
 for(var attempt=0;attempt<4;attempt++){
  data=await shJSON(SH_BASE+'/api/episode','POST',request);
  if(data.status==='ready'&&Array.isArray(data.variants))return data;
  if(attempt<3)await shDelay(350*(attempt+1));
 }
 return data;
}
async function shOpenEpisode(url){
 if(!SH_WEB){await shFetch(url);return;}
 if(typeof networkFetch!=='function')throw Error('Shiro 1.0.7: this Shiroxi version does not provide the browser request engine');
 // WebKit hides Set-Cookie from fetch responses. Read its shared cookie store
 // through networkFetch so native video playback receives the same watch cookie.
 var page=await networkFetch(url,{timeoutSeconds:8,returnHTML:false,returnCookies:true,headers:{'User-Agent':SH_UA}});
 var watch=page&&page.cookies&&page.cookies.shiro_watch;
 if(!watch||!/^[^\x00-\x20\x7f;,]+$/.test(String(watch)))throw Error('Shiro 1.0.7 browser session: '+(page&&page.error||'watch cookie missing'));
 SH_COOKIE='shiro_watch='+watch;
}
async function shLoadStreams(d,episode){
 var id=d.id;
 await shOpenEpisode(shHref(d)+'/'+episode);
 var request={anilistId:id,malId:d.idMal||null,episode:episode};
 // Shiro primes the preferred SUB source, then asks for every available source.
 var first=await shJSON(SH_BASE+'/api/episode','POST',{anilistId:id,malId:d.idMal||null,episode:episode,first:true,prefer:'sub'});
 var data;
 try{data=await shEpisodeData(request);}
 catch(e){if(first.status!=='ready'||e.transport||e.session)throw e;shLog('Additional servers: '+String(e&&e.message||e));data=first;}
 if(data.status==='ready'&&first.status==='ready'&&Array.isArray(first.variants)){
  first.variants.forEach(function(v){var found=data.variants.find(function(x){return x.id===v.id;});if(!found)data.variants.push(v);else{found.sources=found.sources||[];(v.sources||[]).forEach(function(s){if(!found.sources.some(function(x){return x.id===s.id;}))found.sources.unshift(s);});}});
 }else if(data.status!=='ready'&&first.status==='ready')data=first;
 return await shResults(data);
}
async function extractStreamUrl(url){try{
 SH_RATE_RETRIED=false;
 console.log('Shiro SUB 1.0.7: resolving episode');
 var id=shID(url),m=String(url).trim().match(/\/(\d+)(?:[?#].*)?$/);if(!m)throw Error('Select an episode');
 var episode=Number(m[1]),d=await shDetail(id);if(episode<1||episode>shCount(d))throw Error('Episode outside aired range');
 var result;
 try{result=await shLoadStreams(d,episode);}
 catch(e){
  if(SH_WEB||!(e.transport||e.session))throw e;
  console.log('Shiro SUB 1.0.7: native request failed; retrying in WebKit');
  SH_WEB=true;SH_COOKIE='';
  result=await shLoadStreams(d,episode);
 }
 return JSON.stringify(result);
 }catch(e){if(typeof console.error==='function')console.error(String(e&&e.message||e));else shLog(e);throw e;}}
