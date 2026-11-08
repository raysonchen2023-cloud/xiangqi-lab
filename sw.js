// Service worker：
// 1) 離線快取：App、古譜、引擎存在手機裡；神經網路檔（48 MB）放在另一個快取，更新 App 時不用重新下載
// 2) 多執行緒：幫每個回應加上 COOP/COEP 標頭（WebAssembly 多執行緒需要「跨來源隔離」，GitHub Pages 自己不能設）
const VERSION="20261108-1810";
const APP_CACHE="xqlab-app-"+VERSION,ENGINE_CACHE="xqlab-engine";
const APP_FILES=["./","index.html","core.js","engine.js","local.js","manifest.json","icon.svg","icon-180.png","icon-512.png","icon-512-mask.png","qrcode.min.js","jsQR.min.js","net.js","zh.js","opencc-cn2t.js","opencc-t2cn.js","bot3d.js","park3d.js","engine/pikafish.js","engine/pikafish.wasm",
  "data/books.json","data/shiqingyaqu.json","data/juzhongmi.json","data/meihuapu.json","data/kaiju.json","data/canju.json","data/xuyinchuan.json","data/big-books.json","data/quiz.json","data/terms.json","data/gmbios.json","data/cars.json","three.min.js","map3d.js","data/park-legend.json","data/park-novel.json","data/preload.json"];   /* 意見回饋 422：3D 程式和故事也一起先存 */
// 安裝新版時一律從網路抓最新檔案（cache:"reload"），不要拿到瀏覽器裡的舊檔
/* 意見回饋 593：每存好一個檔就告訴畫面「第幾個／共幾個」，更新提示才能顯示進度；任何一個檔失敗就整個重來（跟 addAll 一樣） */
const updTell=m=>self.clients.matchAll({includeUncontrolled:true,type:"window"}).then(cs=>cs.forEach(c=>c.postMessage(m))).catch(()=>{});
self.addEventListener("install",e=>{let got=0;const total=APP_FILES.length;updTell({xqUpd:[0,total,VERSION]});
  e.waitUntil(caches.open(APP_CACHE).then(c=>Promise.all(APP_FILES.map(u=>{const q=new Request(u,{cache:"reload"});
    return fetch(q).then(r=>{if(!r.ok)throw new Error(u+" "+r.status);return c.put(q,r)}).then(()=>updTell({xqUpd:[++got,total,VERSION]}))}))).then(()=>self.skipWaiting()))});
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
  const isNnue=url.pathname.endsWith("/pikafish.nnue"),isPage=req.mode==="navigate",isBig=/\/data\/gmgames\.json$/.test(url.pathname);
  // 比賽對局分包（20 多 MB）：App 下載後自己存在手機資料庫，這裡不再另存一份
  if(/\/data\/tour-[\d-]+\.json$/.test(url.pathname))return;
  /* 意見回饋 605：開 App 預先下載的請求帶 ?pre=1，直接走網路（App 自己存進 xqlab-look），不要在這裡再存一次、也不用等整個檔存完才回應 */
  if(url.searchParams.has("pre"))return;
  /* 意見回饋 689：背景音樂（mp3）不經過 service worker，讓 iPhone 自己用分段下載（Range）直接跟網站要，避免轉手後播不出來 */
  if(/\/data\/bgm\/.+\.mp3$/.test(url.pathname))return;
  e.respondWith((async()=>{
    // 神經網路檔：有存就用存的；沒有就直接從網路拿（不在這裡邊下載邊存，48 MB 邊傳邊存容易中斷，改由 engine.js 下載完整後自己存）
    // 特級大師對局（33 MB）：存在不跟版本走的快取，發新版不用重新下載
    if(isBig){const c=await caches.open("xqlab-data"),hit=await c.match(req.url);if(hit)return isolate(hit);const res=await fetch(req.url,{cache:"no-cache"});if(res.ok)await c.put(req.url,res.clone());return isolate(res)}
    // 外觀圖（朝代棋盤、棋子、字形）：存在獨立快取，改版也不用重抓
    if(/\/data\/(boards|pieces|glyphs|sfx|voice|qa|park|park3d|pika|pika2|path|inn|map|stonetable|treasure|legend|champ|stones|seat|pano|pieceset|journey|xs|people|icons|arenagate|parkgate|pset|map3d|levels|npc|loading|blind|actors|tripo_app|eramap|relics|lines|fonts|canju|qianqiu|shipmap|battles|yizhan)\//.test(url.pathname)&&!url.searchParams.has("fresh")){const c=await caches.open("xqlab-look");
      /* 意見回饋 507：清單檔（tripo.json、xs.json、faces.json…）一律先抓網路上最新的，沒網路才用存的——之前 tripo.json 第一次存下來（只有 5 個角色）就永遠不更新，手機上大部分角色都退回 Q 版 */
      if(/\.json$/.test(url.pathname)){try{const res=await fetch(req.url,{cache:"no-cache"});if(res.ok){await c.put(req.url,res.clone());return isolate(res)}}catch(err){}const old=await c.match(req.url);if(old)return isolate(old)}
      const hit=await c.match(req.url);if(hit)return isolate(hit);const res=await fetch(req.url,{cache:"no-cache"});if(res.ok)await c.put(req.url,res.clone());return isolate(res)}
    if(isNnue){const c=await caches.open(ENGINE_CACHE),hit=await c.match(req.url);if(hit)return isolate(hit);return isolate(await fetch(req))}
    const c=await caches.open(APP_CACHE);
    // 頁面：用這一版快取裡的（跟 JS 檔同一版，不會新頁面配舊程式）；新版由 App 檢查更新後重新載入
    if(isPage){const hit=(await c.match("index.html"))||(await c.match("./"));if(hit)return isolate(hit);
      try{return isolate(await fetch(req.url,{cache:"no-store",credentials:"same-origin"}))}catch(err){return new Response("離線中",{status:503})}}
    const hit=await c.match(req,{ignoreSearch:true});if(hit)return isolate(hit);
    // 一般的 js／json 檔：抓到就存進這一版的快取（特級大師對局上面已經另外存了）
    try{const res=await fetch(req,{cache:"no-cache"});if(res.ok&&url.pathname.match(/\.(js|json|svg|wasm)$/)&&!isBig)c.put(req,res.clone());return isolate(res)}
    catch(err){return new Response("離線中，找不到 "+url.pathname,{status:503,headers:{"content-type":"text/plain; charset=utf-8"}})}})())});
