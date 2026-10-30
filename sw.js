// Service worker：
// 1) 離線快取：App、古譜、引擎存在手機裡；神經網路檔（48 MB）放在另一個快取，更新 App 時不用重新下載
// 2) 多執行緒：幫每個回應加上 COOP/COEP 標頭（WebAssembly 多執行緒需要「跨來源隔離」，GitHub Pages 自己不能設）
const VERSION="20261031-0708";
const APP_CACHE="xqlab-app-"+VERSION,ENGINE_CACHE="xqlab-engine";
const APP_FILES=["./","index.html","core.js","engine.js","local.js","manifest.json","icon.svg","icon-180.png","icon-512.png","qrcode.min.js","jsQR.min.js","net.js","engine/pikafish.js","engine/pikafish.wasm",
  "data/books.json","data/shiqingyaqu.json","data/juzhongmi.json","data/meihuapu.json","data/kaiju.json","data/canju.json","data/quiz.json","data/terms.json"];
// 安裝新版時一律從網路抓最新檔案（cache:"reload"），不要拿到瀏覽器裡的舊檔
self.addEventListener("install",e=>{e.waitUntil(caches.open(APP_CACHE).then(c=>c.addAll(APP_FILES.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()))});
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
  const isNnue=url.pathname.endsWith("/pikafish.nnue"),isPage=req.mode==="navigate";
  e.respondWith((async()=>{
    // 神經網路檔：有存就用存的；沒有就直接從網路拿（不在這裡邊下載邊存，48 MB 邊傳邊存容易中斷，改由 engine.js 下載完整後自己存）
    if(isNnue){const c=await caches.open(ENGINE_CACHE),hit=await c.match(req.url);if(hit)return isolate(hit);return isolate(await fetch(req))}
    const c=await caches.open(APP_CACHE);
    // 頁面：用這一版快取裡的（跟 JS 檔同一版，不會新頁面配舊程式）；新版由 App 檢查更新後重新載入
    if(isPage){const hit=(await c.match("index.html"))||(await c.match("./"));if(hit)return isolate(hit);
      try{return isolate(await fetch(req.url,{cache:"no-store",credentials:"same-origin"}))}catch(err){return new Response("離線中",{status:503})}}
    const hit=await c.match(req,{ignoreSearch:true});if(hit)return isolate(hit);
    try{const res=await fetch(req);if(res.ok&&url.pathname.match(/\.(js|json|svg|wasm)$/))c.put(req,res.clone());return isolate(res)}
    catch(err){return new Response("離線中，找不到 "+url.pathname,{status:503,headers:{"content-type":"text/plain; charset=utf-8"}})}})())});
