// Service worker：
// 1) 離線快取：App、古譜、引擎存在手機裡；神經網路檔（48 MB）放在另一個快取，更新 App 時不用重新下載
// 2) 多執行緒：幫每個回應加上 COOP/COEP 標頭（WebAssembly 多執行緒需要「跨來源隔離」，GitHub Pages 自己不能設）
const VERSION="20261110-0545";
const APP_CACHE="xqlab-app-"+VERSION,ENGINE_CACHE="xqlab-engine";
const APP_FILES=["./","index.html","core.js","engine.js","local.js","manifest.json","icon.svg","icon-180.png","icon-512.png","icon-512-mask.png","qrcode.min.js","jsQR.min.js","net.js","zh.js","opencc-cn2t.js","opencc-t2cn.js","bot3d.js","park3d.js","engine/pikafish.js","engine/pikafish.wasm",
  "data/books.json","data/shiqingyaqu.json","data/juzhongmi.json","data/meihuapu.json","data/kaiju.json","data/canju.json","data/xuyinchuan.json","data/big-books.json","data/quiz.json","data/terms.json","data/gmbios.json","data/cars.json","three.min.js","map3d.js","data/park-legend.json","data/park-novel.json","data/preload.json"];   /* 意見回饋 422：3D 程式和故事也一起先存 */
/* 回饋 853（開發者 11/9：圖和大檔改由 Cloudflare 提供，網址不變）：
   data/、engine/ 的檔改去 Cloudflare Pages（CDN）拿，快取鍵照舊用原本的同源網址——舊玩家手機裡已經存的檔全部繼續有效，不會重下載。
   CDN 失敗（網路錯、10 秒沒回應、404、5xx、內容指紋對不上）就退回原本的 GitHub 網址；CDN_ON=false 就完全照舊走 GitHub。
   不轉 CDN：data/banlist.json（回饋 852，停權名單要即時，一律直接上網、不快取）、data/preload.json、data/big-books.json（內容指紋的正本，拿來檢查 CDN 上的檔是不是舊的）。
   網址上的 ?v=、?pre=1、?fresh= 不帶去 CDN（CDN 只認路徑）；要不要繞過瀏覽器快取照原本的 cache 模式（no-cache／no-store／reload），CDN 回應一律 max-age=0 要重新確認。
   preload.json／big-books.json 有記指紋的檔（圖、音效、特級大師對局、比賽對局），CDN 抓到的內容指紋不同就當作 CDN 還沒同步，改抓 GitHub。
   超過 20 MB 的檔在 CDN 上切成幾塊（tools/cdn-deploy.js）：讀 <檔名>.parts.json，照順序把各塊接成一個回應，Content-Type、Content-Length 照整檔。 */
const CDN_ON=true,CDN="https://xiangqi-cdn.pages.dev/";
const BASE=new URL("./",self.location.href).pathname,GH_ONLY=/^data\/(banlist|preload|big-books)\.json$/,SPLIT=/^(data\/(gmgames|tour-[\d-]+)\.json|engine\/pikafish\.nnue)$/;
let cdnDown=0,FP=null;
const relOf=u=>u.pathname.startsWith(BASE)?u.pathname.slice(BASE.length):"";
/* Range（分段）請求照舊走 GitHub */
const useCdn=(rel,req)=>CDN_ON&&/^(data|engine)\//.test(rel)&&!GH_ONLY.test(rel)&&Date.now()>cdnDown&&!(req&&req.headers.has("range"));
const hex=async b=>[...new Uint8Array(await crypto.subtle.digest("SHA-1",b))].map(x=>x.toString(16).padStart(2,"0")).join("");
/* 內容指紋（檔案路徑 → sha1 前 8 碼）：讀這一版快取裡的 preload.json、big-books.json（都在 GitHub 上） */
function fpLoad(){return FP||(FP=(async()=>{const m=new Map();try{const c=await caches.open(APP_CACHE);
    const get=async u=>{const k=new URL(u,self.location.href).href,r=(await c.match(k))||(await fetch(k,{cache:"no-cache"}));return r.ok?r.json():null};
    const P=await get("data/preload.json");if(P)for(const x of[...(P.items||[]),...(P.big||[])])if(x[2])m.set(x[0],x[2]);
    const B=await get("data/big-books.json");if(Array.isArray(B))for(const g of B)if(g.h)m.set("data/"+g.key+".json",g.h)}catch(e){FP=null}return m})())}
/* 跟 CDN 要一個檔：10 秒內沒有回應就放棄（之後傳到一半卡住，由呼叫的地方用 r.xqAbort() 中斷）；網路錯或 5xx 之後 2 分鐘都直接走 GitHub。回傳 Response（可能是 404）或 null */
async function cdnRaw(rel,mode,sig){if(sig&&sig.aborted)return null;const ac=new AbortController(),t=setTimeout(()=>ac.abort(),10000);if(sig)sig.addEventListener("abort",()=>ac.abort(),{once:true});
  try{const r=await fetch(CDN+rel,{mode:"cors",credentials:"omit",cache:mode==="no-store"||mode==="reload"?mode:"no-cache",signal:ac.signal});clearTimeout(t);r.xqAbort=()=>ac.abort();if(r.status>=500)cdnDown=Date.now()+120000;return r}
  catch(e){clearTimeout(t);if(!(sig&&sig.aborted))cdnDown=Date.now()+120000;return null}}
/* 切塊的大檔：先拿到第一塊才回應（拿不到就退回 GitHub）；中途斷掉時回應會出錯，接下來 2 分鐘改走 GitHub */
async function cdnParts(rel,mode,sig,want){const m=await cdnRaw(rel+".parts.json",mode,sig);if(!m)return null;if(m.status===404)return undefined;if(!m.ok)return null;
  let P;try{P=await m.json()}catch(e){return null}if(!P||!Array.isArray(P.parts)||!P.parts.length||(want&&String(P.sha1).slice(0,want.length)!==want))return null;
  const dir=rel.slice(0,rel.lastIndexOf("/")+1),first=await cdnRaw(dir+P.parts[0].f,mode,sig);if(!first||!first.ok||!first.body)return null;
  let i=0,pg=0,cur=first,rd=first.body.getReader();
  /* 某一塊 30 秒都沒有新資料就中斷（回應出錯，接下來 2 分鐘改走 GitHub） */
  const body=new ReadableStream({async pull(ctl){try{for(;;){const st=setTimeout(()=>cur.xqAbort(),30000);let x;try{x=await rd.read()}finally{clearTimeout(st)}const{done,value}=x;if(!done){pg+=value.byteLength;ctl.enqueue(value);return}
        if(pg!==P.parts[i].size)throw new Error("CDN 塊大小不對 "+P.parts[i].f);if(++i>=P.parts.length){ctl.close();return}
        const r=await cdnRaw(dir+P.parts[i].f,mode,sig);if(!r||!r.ok||!r.body)throw new Error("CDN 抓不到 "+P.parts[i].f);cur=r;rd=r.body.getReader();pg=0}}
      catch(err){cdnDown=Date.now()+120000;ctl.error(err)}},cancel(){try{rd.cancel()}catch(err){}}});
  const ty=/json/.test(P.type)?"application/json; charset=utf-8":P.type||"application/octet-stream";
  return new Response(body,{status:200,headers:{"content-type":ty,"content-length":String(P.size),"x-xq-cdn":"parts"}})}
/* 收完整個回應；30 秒都沒有新資料就中斷（傳到一半卡住時改抓 GitHub） */
async function readAll(r){const rd=r.body.getReader(),cs=[];let n=0;for(;;){const st=setTimeout(()=>r.xqAbort(),30000);let x;try{x=await rd.read()}finally{clearTimeout(st)}if(x.done)break;cs.push(x.value);n+=x.value.byteLength}
  const out=new Uint8Array(n);let o=0;for(const c of cs){out.set(c,o);o+=c.byteLength}return out.buffer}
/* 從 CDN 拿 rel；拿不到或內容不對回傳 null（呼叫的地方就照原本的方式抓 GitHub）。一般檔整個收完才回應：Content-Length 是真正的大小（App 用它比對手機裡的檔），順便核對指紋 */
async function cdnGet(rel,url,mode,sig){try{const fr=url&&url.searchParams.get("fresh"),want=(await fpLoad()).get(rel)||(/^[0-9a-f]{8}$/.test(fr||"")?fr:null);
    if(SPLIT.test(rel)){const p=await cdnParts(rel,mode,sig,want);if(p!==undefined)return p}
    const r=await cdnRaw(rel,mode,sig);if(!r)return null;
    if(r.status===404&&!SPLIT.test(rel))return(await cdnParts(rel,mode,sig,want))||null;
    if(!r.ok)return null;
    const buf=await readAll(r);if(want&&(await hex(buf)).slice(0,want.length)!==want)return null;
    const h=new Headers(r.headers);h.delete("content-encoding");h.set("content-length",String(buf.byteLength));h.set("x-xq-cdn","1");
    return new Response(buf,{status:200,statusText:"OK",headers:h})}catch(e){return null}}
/* 先試 CDN，不行就照原本的方式（gh）抓 */
async function viaCdn(req,rel,url,mode,gh){if(useCdn(rel,req)){const r=await cdnGet(rel,url,mode,req&&req.signal);if(r)return r}return gh()}
// 安裝新版時一律從網路抓最新檔案（cache:"reload"），不要拿到瀏覽器裡的舊檔
/* 意見回饋 593：每存好一個檔就告訴畫面「第幾個／共幾個」，更新提示才能顯示進度；任何一個檔失敗就整個重來（跟 addAll 一樣） */
const updTell=m=>self.clients.matchAll({includeUncontrolled:true,type:"window"}).then(cs=>cs.forEach(c=>c.postMessage(m))).catch(()=>{});
self.addEventListener("install",e=>{let got=0;const total=APP_FILES.length;updTell({xqUpd:[0,total,VERSION]});
  e.waitUntil(caches.open(APP_CACHE).then(c=>Promise.all(APP_FILES.map(u=>{const q=new Request(u,{cache:"reload"});
    return viaCdn(null,u,null,"reload",()=>fetch(q)).then(r=>{if(!r.ok)throw new Error(u+" "+r.status);return c.put(q,r)}).then(()=>updTell({xqUpd:[++got,total,VERSION]}))}))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("xqlab-app-")&&k!==APP_CACHE).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim()))});
// 加上跨來源隔離標頭
function isolate(res){
  if(!res||res.status===0||res.type==="opaque")return res;
  const h=new Headers(res.headers);
  h.set("Cross-Origin-Embedder-Policy","require-corp");h.set("Cross-Origin-Opener-Policy","same-origin");h.set("Cross-Origin-Resource-Policy","same-origin");
  return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h})}
self.addEventListener("fetch",e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=="GET"||url.origin!==self.location.origin)return;
  if(url.pathname.endsWith("/sw.js"))return;   // 版本檔一律直接問網路，不能拿快取（不然永遠以為沒有新版）   // 連電腦的請求、外站一律不攔
  const rel=relOf(url);
  /* 回饋 852：停權名單一律直接上網（GitHub），不快取、不轉 CDN */
  if(rel==="data/banlist.json")return;
  const isNnue=url.pathname.endsWith("/pikafish.nnue"),isPage=req.mode==="navigate",isBig=/\/data\/gmgames\.json$/.test(url.pathname);
  // 比賽對局分包（20 多 MB）：App 下載後自己存在手機資料庫，這裡不再另存一份
  /* 回饋 853：照樣不存，但改從 CDN 拿（CDN 不通就退回 GitHub） */
  if(/\/data\/tour-[\d-]+\.json$/.test(url.pathname)){if(useCdn(rel,req))e.respondWith(viaCdn(req,rel,url,req.cache,()=>fetch(req)).then(isolate));return}
  /* 意見回饋 605：開 App 預先下載的請求帶 ?pre=1，直接走網路（App 自己存進 xqlab-look），不要在這裡再存一次、也不用等整個檔存完才回應 */
  /* 回饋 853：照樣不存（App 自己存），但 data/、engine/ 改從 CDN 拿；CDN 不通就退回 GitHub */
  if(url.searchParams.has("pre")){if(useCdn(rel,req))e.respondWith(viaCdn(req,rel,url,req.cache,()=>fetch(req)).then(isolate));return}
  /* 意見回饋 689：背景音樂（mp3）不經過 service worker，讓 iPhone 自己用分段下載（Range）直接跟網站要，避免轉手後播不出來 */
  if(/\/data\/bgm\/.+\.mp3$/.test(url.pathname))return;
  e.respondWith((async()=>{
    // 神經網路檔：有存就用存的；沒有就直接從網路拿（不在這裡邊下載邊存，48 MB 邊傳邊存容易中斷，改由 engine.js 下載完整後自己存）
    // 特級大師對局（33 MB）：存在不跟版本走的快取，發新版不用重新下載
    if(isBig){const c=await caches.open("xqlab-data"),hit=await c.match(req.url);if(hit)return isolate(hit);
      /* 回饋 853：CDN 拼好的整檔存進快取；中途斷掉（存不進去）就改抓 GitHub */
      if(useCdn(rel,req)){const r=await cdnGet(rel,url,"no-cache",req.signal);if(r)try{await c.put(req.url,r.clone());return isolate(r)}catch(err){}}
      const res=await fetch(req.url,{cache:"no-cache"});if(res.ok)await c.put(req.url,res.clone());return isolate(res)}
    // 外觀圖（朝代棋盤、棋子、字形）：存在獨立快取，改版也不用重抓
    if(/\/data\/(boards|pieces|glyphs|sfx|voice|qa|park|park3d|pika|pika2|path|inn|map|stonetable|treasure|legend|champ|stones|seat|pano|pieceset|journey|xs|people|icons|arenagate|parkgate|pset|map3d|levels|npc|loading|blind|actors|tripo_app|eramap|relics|lines|fonts|canju|qianqiu|shipmap|battles|yizhan|hubmap|homemap|lobbymap|setmap|libmap|tabink|feedback|campmap|canjumap|thememap|termsmap|todaymap|gmmap|cupmap|redomap|exammap|statmap|studymap|openmap|deskmap|rostermap|passmap|seasonbox|tabtube)\//.test(url.pathname)&&!url.searchParams.has("fresh")){const c=await caches.open("xqlab-look");
      /* 意見回饋 507：清單檔（tripo.json、xs.json、faces.json…）一律先抓網路上最新的，沒網路才用存的——之前 tripo.json 第一次存下來（只有 5 個角色）就永遠不更新，手機上大部分角色都退回 Q 版 */
      if(/\.json$/.test(url.pathname)){try{const res=await viaCdn(req,rel,url,"no-cache",()=>fetch(req.url,{cache:"no-cache"}));if(res.ok){await c.put(req.url,res.clone());return isolate(res)}}catch(err){}const old=await c.match(req.url);if(old)return isolate(old)}
      const hit=await c.match(req.url);if(hit)return isolate(hit);const res=await viaCdn(req,rel,url,"no-cache",()=>fetch(req.url,{cache:"no-cache"}));if(res.ok)await c.put(req.url,res.clone());return isolate(res)}
    if(isNnue){const c=await caches.open(ENGINE_CACHE),hit=await c.match(req.url);if(hit)return isolate(hit);return isolate(await viaCdn(req,rel,url,req.cache,()=>fetch(req)))}
    const c=await caches.open(APP_CACHE);
    // 頁面：用這一版快取裡的（跟 JS 檔同一版，不會新頁面配舊程式）；新版由 App 檢查更新後重新載入
    if(isPage){const hit=(await c.match("index.html"))||(await c.match("./"));if(hit)return isolate(hit);
      try{return isolate(await fetch(req.url,{cache:"no-store",credentials:"same-origin"}))}catch(err){return new Response("離線中",{status:503})}}
    const hit=await c.match(req,{ignoreSearch:true});if(hit)return isolate(hit);
    // 一般的 js／json 檔：抓到就存進這一版的快取（特級大師對局上面已經另外存了）
    try{const res=await viaCdn(req,rel,url,"no-cache",()=>fetch(req,{cache:"no-cache"}));if(res.ok&&url.pathname.match(/\.(js|json|svg|wasm)$/)&&!isBig)c.put(req,res.clone());return isolate(res)}
    catch(err){return new Response("離線中，找不到 "+url.pathname,{status:503,headers:{"content-type":"text/plain; charset=utf-8"}})}})())});
