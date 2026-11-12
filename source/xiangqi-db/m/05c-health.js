/* 第 10 輪 F2（ChatGPT 改善單 6「本機匿名營運健康與功能使用率匯出」）
   只存在這支手機（store "health"），App 不會自動送出；玩家在 設定 → 隱私「📊 本機使用與健康紀錄」自己看、自己決定要不要複製或存檔給開發者。
   記的東西（都不含名字、裝置代號、棋譜、存檔、玩家打的字）：
   ・功能使用次數：網址 # 後面第一段（頁面名，只收小寫英數和 -），記次數、第一次用到是安裝後第幾天
   ・使用天數：每天開幾次（只留最近 60 天）
   ・新手流程：讀 05b-save 已經記在本機的 store "funnel" 各步驟秒數，不另外記
   ・錯誤：window error／unhandledrejection 次數；最近 10 筆只留訊息前 80 字、檔名（去掉網址參數和路徑）、行號
   ・資源載入：圖片、程式、資料檔各載入幾次、多大（檔案實際大小；從離線快取讀的傳輸量是 0，所以用 encodedBodySize）、失敗幾個、最慢一個幾毫秒
   ・啟動時間：每次開 App 到畫面可用的毫秒數（最近 20 次）
   ・卡頓：瀏覽器回報的長任務（超過 50 毫秒）次數和總毫秒（Safari 沒有這項）
   ・儲存空間：navigator.storage.estimate 的用量
   前綴 heal（先 grep 過沒撞名）。測試：xiangqi-lab/tools/test-health.js */
const HEAL_KEY="health",HEAL_V=1,HEAL_DAY=864e5;
const healNew=()=>({v:HEAL_V,since:Date.now(),feat:{},first:{},days:{},err:{n:0,last:[]},res:{img:[0,0,0,0],js:[0,0,0,0],data:[0,0,0,0]},boot:[],lt:[0,0]});
let HEAL=null,healDirty=false;
function healGet(){if(!HEAL){const h=store.get(HEAL_KEY,null);HEAL=h&&h.v===HEAL_V?h:healNew()}return HEAL}
function healSave(){if(!healDirty||!HEAL)return;healDirty=false;store.set(HEAL_KEY,HEAL)}
const healToday=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
/* 頁面名：#/journey/3 → journey；# 或 #/ → home；不是小寫英數和 - 的一律不記（避免記到任何玩家輸入） */
function healPage(hash){const t=String(hash||"").replace(/^#?\/?/,"");if(!t)return"home";const g=t.split(/[/?]/)[0];return/^[a-z0-9-]{1,20}$/.test(g)?g:null}
function healFeat(k){if(!k)return;const h=healGet();h.feat[k]=(h.feat[k]||0)+1;if(h.first[k]==null)h.first[k]=Math.floor((Date.now()-h.since)/HEAL_DAY);healDirty=true}
function healOpen(){const h=healGet(),d=healToday();h.days[d]=(h.days[d]||0)+1;const ks=Object.keys(h.days).sort();while(ks.length>60)delete h.days[ks.shift()];healDirty=true}
/* 錯誤訊息只留前 80 字；檔名去掉網址參數和路徑（https://…/m.html?x=1 → m.html） */
function healFile(u){return String(u||"").split(/[?#]/)[0].split("/").pop().slice(0,40)}
function healErr(msg,file,line){const h=healGet();h.err.n++;h.err.last.push({d:healToday(),m:String(msg||"").replace(/\s+/g," ").slice(0,80),f:healFile(file),l:+line||0});if(h.err.last.length>10)h.err.last.shift();healDirty=true}
function healResKind(name){const u=String(name||"").split(/[?#]/)[0].toLowerCase();if(/\.(webp|png|jpe?g|gif|svg|avif)$/.test(u))return"img";if(/\.(m?js)$/.test(u))return"js";if(/\.(json|bin|nnue|wasm|glb|mp3|ogg|m4a|woff2?)$/.test(u))return"data";return null}
function healRes(name,kb,ms,fail){const k=healResKind(name);if(!k)return;const r=healGet().res[k];r[0]++;r[1]+=Math.round(kb||0);if(fail)r[2]++;r[3]=Math.max(r[3],Math.round(ms||0));healDirty=true}
function healBoot(ms){if(!(ms>0))return;const b=healGet().boot;b.push(Math.round(ms));if(b.length>20)b.shift();healDirty=true}
function healLong(ms){const l=healGet().lt;l[0]++;l[1]+=Math.round(ms||0);healDirty=true}
const healMed=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),i=s.length>>1;return s.length%2?s[i]:Math.round((s[i-1]+s[i])/2)};
async function healExport(){const h=healGet();healSave();let st=null;try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();st={usedMB:+(e.usage/1048576).toFixed(1),quotaMB:Math.round(e.quota/1048576)}}}catch(e){}
  let ver=null;try{ver=typeof appVer==="function"?await appVer():null}catch(e){}
  const fn=store.get("funnel",null),days=Object.keys(h.days).sort();
  const res={};for(const k of["img","js","data"]){const r=h.res[k];res[k]={count:r[0],kb:r[1],failed:r[2],slowestMs:r[3]}}
  return{about:"象棋千秋 本機使用與健康紀錄（只存在這支手機，不含名字、裝置代號、棋譜、存檔；要不要給開發者由你決定）",format:"xq-health-v"+HEAL_V,
    app:{version:ver,exportedAt:new Date().toISOString(),recordingSince:new Date(h.since).toISOString().slice(0,10)},
    usage:{activeDays:days.length,opens:days.reduce((s,d)=>s+h.days[d],0),perDay:Object.fromEntries(days.slice(-30).map(d=>[d,h.days[d]])),
      features:Object.fromEntries(Object.entries(h.feat).sort((a,b)=>b[1]-a[1])),firstUseDay:h.first},
    onboarding:fn&&fn.s?{steps:fn.s,finished:!!fn.end}:null,
    health:{errors:{count:h.err.n,recent:h.err.last},resources:res,bootMs:{median:healMed(h.boot),samples:h.boot.length},longTasks:{count:h.lt[0],totalMs:h.lt[1]},storage:st},
    device:{screen:[screen.width,screen.height],dpr:devicePixelRatio||1,installed:!!(matchMedia&&matchMedia("(display-mode: standalone)").matches)}}}
function healClear(){HEAL=healNew();healDirty=true;healSave()}
const HEAL_NAME={home:"首頁",journey:"雲河棋路",canju:"殘局",ship:"星槎",db:"大師對局",pvp:"同機對下",cpu:"挑戰電腦",adventure:"冒險",settings:"設定",shelf:"書架",lobby:"線上大廳",theme:"主題練習",me:"我的",stats:"我的棋力",redo:"錯棋重練",coop:"合作",hub:"主場",codex:"圖鑑",camp:"營地",watch:"觀戰",quiz:"測驗",profile:"個人頁",cup:"千秋盃",today:"今日",gm:"大師",arena:"擂台",cpuroom:"電腦房",battle:"戰役"};
async function healShow(){let x;try{x=await healExport()}catch(e){toast("讀不到紀錄");return}
  const U=x.usage,H=x.health,top=Object.entries(U.features).slice(0,12);
  const row=(a,b)=>`<tr><td style="text-align:left;padding:2px 6px">${a}</td><td style="text-align:right;padding:2px 6px">${b}</td></tr>`;
  const R=H.resources,sz=kb=>kb>=1024?(kb/1024).toFixed(1)+" MB":kb+" KB",rs=k=>`${R[k].count} 次・${sz(R[k].kb)}${R[k].failed?`・<b>失敗 ${R[k].failed}</b>`:""}`;
  const html=`<div class="em">📊</div><h2>本機使用與健康紀錄</h2>
    <p class="muted" style="font-size:13px;text-align:left">只存在這支手機，${typeof tlmOn==="function"&&tlmOn()?"<b>你開了「每天自動送匿名健康摘要」：其中錯誤、卡頓、啟動時間、資源失敗的摘要每天最多送一次</b>（其他項目不送，關掉就停）":"<b>App 不會自動送出</b>"}。不含名字、裝置代號、棋譜、存檔。回報問題時，如果你願意，可以按「複製」貼給開發者。從 ${esc(x.app.recordingSince)} 開始記。</p>
    <table style="width:100%;font-size:13.5px;border-collapse:collapse">${row("用過的天數",U.activeDays+" 天")}${row("開 App 次數",U.opens+" 次")}${row("啟動時間（中位數）",H.bootMs.median!=null?H.bootMs.median+" 毫秒":"還沒有")}${row("錯誤",H.errors.count+" 次")}${row("卡頓（長任務）",H.longTasks.count?H.longTasks.count+" 次・共 "+(H.longTasks.totalMs/1000).toFixed(1)+" 秒":"沒有紀錄")}${row("圖片載入",rs("img"))}${row("程式載入",rs("js"))}${row("資料檔載入",rs("data"))}${row("儲存空間",H.storage?H.storage.usedMB+" MB":"讀不到")}</table>
    <p style="text-align:left;margin:10px 0 4px"><b>最常用的功能</b></p><table style="width:100%;font-size:13.5px;border-collapse:collapse">${top.length?top.map(([k,n])=>row(esc(HEAL_NAME[k]||k),n+" 次")).join(""):row("還沒有紀錄","")}</table>`;
  const txt=()=>JSON.stringify(x,null,2);
  modal(html,[["📋 複製",()=>{try{navigator.clipboard.writeText(txt()).then(()=>toast("已複製，可以貼到意見回饋"),()=>toast("這台手機不能複製"))}catch(e){toast("這台手機不能複製")}}],
    ["💾 存成檔案",()=>{try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt()],{type:"application/json"}));a.download="xiangqi-health-"+healToday()+".json";document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}catch(e){toast("存不了檔")}}],
    ["🗑 清除",()=>{healClear();toast("已清除，從現在重新記")}],["關閉",null]])}
function healBootstrap(){try{healOpen();healFeat(healPage(location.hash));
  addEventListener("hashchange",()=>healFeat(healPage(location.hash)));
  addEventListener("error",e=>{if(e&&e.target&&e.target!==window&&e.target.tagName){const t=e.target.tagName;if(t==="IMG"||t==="SCRIPT")healRes(e.target.src||e.target.currentSrc,0,0,true);return}healErr(e&&e.message,e&&e.filename,e&&e.lineno)},true);
  addEventListener("unhandledrejection",e=>{const r=e&&e.reason;healErr("未處理的 Promise："+(r&&r.message||String(r)),r&&r.stack&&(String(r.stack).match(/\/([^/\s:]+\.(?:js|html))/)||[])[1],0)});
  if(window.PerformanceObserver){try{new PerformanceObserver(l=>l.getEntries().forEach(e=>healRes(e.name,(e.transferSize||e.encodedBodySize||0)/1024,e.duration,false))).observe({type:"resource",buffered:true})}catch(e){}
    try{new PerformanceObserver(l=>l.getEntries().forEach(e=>healLong(e.duration))).observe({type:"longtask",buffered:true})}catch(e){}}
  const bt=()=>{try{const n=performance.getEntriesByType("navigation")[0];healBoot(n?n.domContentLoadedEventEnd:performance.now())}catch(e){}};
  if(document.readyState==="complete")bt();else addEventListener("load",bt,{once:true});
  setInterval(healSave,30000);addEventListener("pagehide",healSave);document.addEventListener("visibilitychange",()=>{if(document.hidden)healSave()})}catch(e){}}
healBootstrap();
