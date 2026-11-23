/* ---------- W72 遠端開關（開發者 11/23 選單「先做遠端開關，分版先盤點」）----------
   用途：上線後某個功能出問題時，不用重新建包、不用送審，改 GitHub 上一行設定就能把它關掉（業界叫 kill switch／feature flag）。
   設定檔：正本 source/xiangqi-db/art/flags.json，發布 PR 複製到倉庫根目錄 data/flags.json（功能 PR 不能改根目錄 data/）。
   例如 {"v":1,"off":{"halls8":"11/28 列炮門門內圖破圖，先關"}}；只列要關的，沒列＝開著。
   只能關、不能開：沒有「打開隱藏功能」的寫法，送審時看得到的功能就是全部（Apple 準則 2.5.2，Windows Claude 2 11/23 合規審查）。
   兒童模式照樣抓：它只是用來關掉壞掉的功能，只下載一份公開檔，不帶任何資料（隱私政策要寫明，跟發布 PR 一起改 data/docs/privacy.md）。
   怎麼抓：
   - 一律向 raw.githubusercontent.com 讀 main 分支上的 data/flags.json：合併到 main 就生效，不用等 GitHub Pages 部署。
     網址加 ?t= 時間繞過 GitHub 的 5 分鐘邊緣快取（11/23 實測 ?t= 會 MISS），cache:no-store 繞過手機快取；回應有 Access-Control-Allow-Origin: *。
   - 不用 github.io：網頁版本身就在 github.io，同源請求會被 sw.js 當一般 data/*.json 存進這一版的快取，之後一直拿舊的。
     raw.githubusercontent.com 對三平台都是跨網域：網頁版 sw.js 不攔（只攔同源）；iOS native-bridge 只改寫 data/ 開頭的相對路徑；Android 沒有改寫 fetch。
   - 安裝包裡不放 flags.json，不會被 CDN 或安裝包的舊版本蓋掉。
   抓不到（離線、逾時 5 秒、格式不對）：用這支手機上一次成功抓到的那份；從來沒抓到過就全部開著。
   所以「關掉」要玩家上線過一次才生效；離線玩家維持原樣，不會因為抓不到就把功能關掉。
   不送任何玩家資料：請求只有網址＋時間參數，沒有帳號、裝置或存檔資訊。
   用法：xqFlag("halls8") 回傳 true＝開著；設定檔到了會發 window 事件 "xqflags"，畫面已經畫好的功能可以聽這個事件再收起來。 */
const XQ_FLAGS_URL="https://raw.githubusercontent.com/raysonchen2023-cloud/xiangqi-lab/main/data/flags.json";
let XQ_FLAGS_OFF={};
function xqFlag(k){return !Object.prototype.hasOwnProperty.call(XQ_FLAGS_OFF,k)}
function xqFlagsApply(j){
  if(!j||typeof j!=="object"||typeof j.off!=="object"||j.off===null||Array.isArray(j.off))return false;
  const o={};for(const k of Object.keys(j.off))if(/^[a-z0-9_-]{1,40}$/i.test(k))o[k]=String(j.off[k]||"").slice(0,200);
  XQ_FLAGS_OFF=o;try{window.dispatchEvent(new CustomEvent("xqflags",{detail:{off:Object.keys(o)}}))}catch(e){}return true}
/* 抓一次開關清單。W76（11/23 開發者看外部評論後選的「上線前相容、開關與 go/no-go」）：
   App 回到前景時也要重讀，不然玩家把 App 放在背景好幾天，關掉的功能一直不會關。
   回到前景：網頁標準 visibilitychange（網頁、Android、iOS 的 WebView 都有）；iOS 另有 Capacitor App 外掛的 resume 也接上。
   同一份規則：只能關、不能開；讀不到就維持手上那份（上一次成功的）。60 秒內不重抓，免得切來切去一直連線。 */
let XQ_FLAGS_AT=0,XQ_FLAGS_BUSY=false;
function xqFlagsFetch(){
  if(typeof fetch!=="function"||XQ_FLAGS_BUSY)return;
  const now=Date.now();if(XQ_FLAGS_AT&&now-XQ_FLAGS_AT<60000)return;XQ_FLAGS_AT=now;XQ_FLAGS_BUSY=true;
  let ac=null;try{ac=new AbortController();setTimeout(()=>{try{ac.abort()}catch(e){}},5000)}catch(e){}
  fetch(XQ_FLAGS_URL+"?t="+now,{cache:"no-store",mode:"cors",credentials:"omit",signal:ac?ac.signal:undefined})
    .then(r=>r.ok?r.json():null)
    .then(j=>{if(j&&xqFlagsApply(j)){try{localStorage.setItem("xqFlags",JSON.stringify({v:j.v||1,off:XQ_FLAGS_OFF}))}catch(e){}}})
    .catch(()=>{}).then(()=>{XQ_FLAGS_BUSY=false});
}
(function(){
  try{const s=localStorage.getItem("xqFlags");if(s)xqFlagsApply(JSON.parse(s))}catch(e){}
  xqFlagsFetch();
  try{document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")xqFlagsFetch()})}catch(e){}
  try{const A=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(A&&typeof A.addListener==="function")A.addListener("resume",()=>xqFlagsFetch())}catch(e){}
})();
