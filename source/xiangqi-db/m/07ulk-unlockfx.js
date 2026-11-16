/* ================= 🌅 新地點開放的過場（開發者 11/16；前綴 ulk）=================
   開發者原話：「完成解鎖任務開啟觀星臺或西市後，有個過場動畫，讓玩家看到這兩個場景的風景照，加上一兩句文字描述，大約 4-5 秒」。
   選單定：解鎖後第一次回到首頁棋鎮時播；去過那個地方的就不播（照 07gxt gxtSeen、07xsm xsmSeen）；文字用下面 ULK_PLACES 的兩句。
   播法：全螢幕風景圖（觀星臺 data/guanxing、西市 data/ximarket 現有的圖，白天、夜裡照時辰換）慢慢推近、地名＋一句淡入，約 4.5 秒自己收；點一下跳過。
   地名不放 emoji（App 會把 🏮 這類換成大張插畫圖示，蓋住字）。
   播過記 store "ulkFx"＝{gxt:1, xsm:1}（05b JOURNEY_KEYS）。判斷 ulkPick 是純函式（node 測試用 vm 跑）。 */
const ULK_ON=true,ULK_MS=4500;
/* [代號, 地名, 一句, 開放了沒, 去過了沒（存檔鍵）, 圖（白天, 夜裡）] */
const ULK_PLACES=[
  {k:"gxt",nm:"觀星臺",say:"雲河的盡頭，星斗垂得最低。青銅渾儀還在轉，天頂的黑洞在等你。",open:()=>typeof gxtOpen==="function"&&gxtOpen(),seen:"gxtSeen",at:"點頂欄右上的地圖鈕就找得到；入口在千秋時光之苑的橋右邊。",img:["data/guanxing/gx_tai_day.webp","data/guanxing/gx_tai.webp"]},
  {k:"xsm",nm:"西市",say:"西市開市了。胡商與棋客擠在同一條街上，聽雨茶坊的簾子後頭，有人在擺暗棋。",open:()=>typeof xsmOpen==="function"&&xsmOpen(),seen:"xsmSeen",at:"點頂欄右上的地圖鈕就找得到；入口在千秋時光之苑的橋左邊。",img:["data/ximarket/xm_day.webp","data/ximarket/xm_night.webp"]}];
/* 11/17 Windows 測試員 B-3：觀星臺、西市的入口只在千秋時光之苑首頁（07gxt／07xsm 只在 hbIsCl 才放），停在各朝代棋鎮時過場播完卻找不到入口。
   不在時光之苑（ulkWhere 回 at）就在那一句下面多一行「在哪裡」；在時光之苑照舊不多寫（橋兩邊就看得到）。cl＝現在是不是時光之苑 */
function ulkWhere(p,cl){return p&&!cl&&p.at?p.at:""}
const ulkCl=()=>{try{return typeof hbIsCl==="function"&&hbIsCl()}catch(e){return true}};
/* 要播哪一個（純函式）：開了、沒去過、沒播過的第一個；都沒有回 null。S＝{open:{k:bool}, seen:{k:bool}, done:{k:1}} */
function ulkPick(S){for(const p of ULK_PLACES){const k=p.k;if(S.open[k]&&!S.seen[k]&&!(S.done&&S.done[k]))return k}return null}
function ulkState(){const st=k=>{try{return!!store.get(k,0)}catch(e){return true}};let done={};try{done=store.get("ulkFx",null)||{}}catch(e){}
  const o={open:{},seen:{},done};for(const p of ULK_PLACES){let on=false;try{on=!!p.open()}catch(e){}o.open[p.k]=on;o.seen[p.k]=st(p.seen)}return o}
const ulkDay=()=>{try{if(typeof gxtDay==="function")return gxtDay()}catch(e){}const h=new Date().getHours();return h>=5&&h<17};
let ULK_BUSY=false;
/* 現在能不能播：在首頁、沒有別的視窗或過場蓋著 */
function ulkCan(){if(ULK_BUSY||typeof document==="undefined")return false;const h=location.hash||"#/";if(!(h==="#/"||h==="#"||h===""))return false;
  return!document.querySelector(".modal-bg,.modal,.sheet-bg,#stmOv,.mnf-ov,.bhx-ov,.dgl-o,#ulkOv")}
function ulkCss(){if(document.getElementById("ulkCss"))return;const s=document.createElement("style");s.id="ulkCss";s.textContent=`
#ulkOv{position:fixed;inset:0;z-index:9500;background:#0b0a12;overflow:hidden;opacity:0;transition:opacity .5s;cursor:pointer}
#ulkOv.on{opacity:1}#ulkOv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.02);transition:transform ${ULK_MS+600}ms ease-out}
#ulkOv.on img{transform:scale(1.12)}
#ulkOv .cap{position:absolute;left:0;right:0;bottom:0;padding:22% 20px calc(28px + env(safe-area-inset-bottom));background:linear-gradient(transparent,rgba(8,6,14,.86) 45%);color:#f6eedd;text-align:center;opacity:0;transform:translateY(10px);transition:opacity .8s .5s,transform .8s .5s}
#ulkOv.on .cap{opacity:1;transform:none}#ulkOv .cap small{display:block;font-size:13px;letter-spacing:.2em;color:#FFE08A;margin-bottom:6px}
#ulkOv .cap b{display:block;font:900 30px/1.2 var(--serif,serif);letter-spacing:.08em;margin-bottom:10px}#ulkOv .cap p{margin:0 auto;max-width:30em;font:600 16px/1.7 var(--serif,serif)}#ulkOv .cap p.at{margin-top:8px;color:#FFE08A}
#ulkOv .skip{position:absolute;top:calc(10px + env(safe-area-inset-top));right:12px;font:600 13px var(--sans,sans-serif);color:rgba(246,238,221,.75);background:rgba(0,0,0,.3);border:1px solid rgba(246,238,221,.35);border-radius:99px;padding:4px 12px}
@media (prefers-reduced-motion:reduce){#ulkOv,#ulkOv img,#ulkOv .cap{transition:opacity .3s}#ulkOv img,#ulkOv.on img{transform:none}}`;document.head.append(s)}
/* 播一個；播完（或點一下）收起來、記下播過 */
function ulkPlay(k,after){const p=ULK_PLACES.find(x=>x.k===k);if(!p)return;ULK_BUSY=true;ulkCss();
  try{const d=store.get("ulkFx",null)||{};d[k]=1;store.set("ulkFx",d)}catch(e){}
  const o=document.createElement("div");o.id="ulkOv";o.setAttribute("role","dialog");o.setAttribute("aria-label",p.nm+"開放了");
  o.innerHTML=`<img src="${p.img[ulkDay()?0:1]}" alt=""><button type="button" class="skip">點一下繼續</button><div class="cap"><small>新地點開放</small><b>${esc(p.nm)}</b><p>${esc(p.say)}</p>${(w=>w?`<p class="at">${esc(w)}</p>`:"")(ulkWhere(p,ulkCl()))}</div>`;
  document.body.append(o);let gone=false,t=0;
  const end=()=>{if(gone)return;gone=true;clearTimeout(t);o.classList.remove("on");setTimeout(()=>{o.remove();ULK_BUSY=false;try{if(after)after()}catch(e){}},500)};
  o.onclick=()=>{try{vibrate(5)}catch(e){}end()};
  const go=()=>{requestAnimationFrame(()=>o.classList.add("on"));t=setTimeout(end,ULK_MS+500)};const im=o.querySelector("img");
  if(im.complete)go();else{im.onload=go;im.onerror=()=>{im.remove();go()};setTimeout(()=>{if(!o.classList.contains("on"))go()},1500)}}
/* 回到首頁時看一次（換頁時、每隔幾秒）；兩個都開了就一個接一個 */
function ulkCheck(){if(!ULK_ON||!ulkCan())return;const k=ulkPick(ulkState());if(k)ulkPlay(k,()=>setTimeout(ulkCheck,600))}
if(ULK_ON&&typeof window!=="undefined"&&typeof document!=="undefined"){addEventListener("hashchange",()=>setTimeout(ulkCheck,900));setInterval(ulkCheck,4000);setTimeout(ulkCheck,2500)}
