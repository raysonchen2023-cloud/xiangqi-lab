/* 第 11 輪 X3：可選的雲端匿名健康摘要（評審：「讓同意的玩家自動回傳崩潰與效能長任務日誌」）
   預設關（store "teleOptIn"＝false）。設定頁的開關由主控加在 05-settings.js；這支只讀 store.get("teleOptIn",false)。
   開了才送，每天最多一次；內容只取 05c-health.js 已經記在本機的匿名統計（上次送出後新增的部分）：
     e  錯誤次數；em 最近幾筆錯誤 [訊息前 80 字, 檔名, 行號]（最多 5 筆，訊息再洗一次：玩家名字、裝置代號、網址、像代號的英數串都換掉）
     lt 長任務 [次數, 總毫秒]；bt 啟動時間中位數（毫秒）；rf 資源載入失敗 [圖片, 程式, 資料檔]
     ver App 版本；dev 裝置類型（phone／tablet／desktop）；v 格式版本
   不送：名字、裝置代號、匿名碼、存檔、棋譜、玩家打的字、功能使用次數、使用天數、螢幕大小、日期。沒有任何 id，同一支手機每天送的對不起來。
   一律不送：兒童模式、家長關閉線上大廳（fmCfg）、開發者模式（DEVMODE）、自動化測試（navigator.webdriver）、
     送出端判斷 window.XQ_ANON_OK 回 false（目前 05b-save.js 把 hlt 也算進「📈 匿名送出學習進度」，那個開關關掉時也不送）。
   走現有匿名通道 XQNet.shareIRT（大廳 irt 頻道，t:"hlt"），開發者電腦的 collect-anon.js 存進 xiangqi-db/health-telemetry.jsonl，保留 90 天。
   什麼時候送：開 App 90 秒後、切到背景、關掉時，以及每小時檢查一次；今天送過（store "tlmDay"）就不送。
   關掉開關：下一次檢查時用 XQNet.dropIRT("hlt") 丟掉手機裡還沒送出的（設定頁也可以直接呼叫 tlmDrop()）。
   前綴 tlm（先 grep 過沒撞名）。測試：xiangqi-lab/tools/test-telemetry.js */
const TLM_V=1,TLM_MSG=5;
function tlmOn(){try{if(store.get("teleOptIn",false)!==true||navigator.webdriver)return false;
  if(typeof DEVMODE==="function"&&DEVMODE())return false;
  const c=store.get("fmCfg",null)||{};if(c.kid===true||c.net===false)return false;
  if(typeof fmNetOff==="function"&&fmNetOff())return false;return true}catch(e){return false}}
/* 錯誤訊息再洗一次：05c 已經只留前 80 字；這裡再把玩家名字、裝置代號、網址、含數字的長英數串（像代號）換掉 */
function tlmScrub(s){let t=String(s==null?"":s).replace(/\s+/g," ").slice(0,80),me=null;try{me=JSON.parse(localStorage.getItem("xq_me")||"null")}catch(e){}
  for(const w of[me&&me.name,me&&me.id])if(w&&String(w).length>=2)t=t.split(String(w)).join("＊");
  return t.replace(/(?:https?|blob|file|wss?):\/\/\S+/g,"(網址)").replace(/(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{8,}/g,"＊")}
const tlmDayStr=()=>typeof healToday==="function"?healToday():new Date().toISOString().slice(0,10);
/* 這次要送的內容＋送出後的新基準（只送上次送出以後新增的；本機紀錄被清掉過就從 0 算） */
function tlmPacket(){if(typeof healGet!=="function")return null;const h=healGet(),K=["img","js","data"],rf=K.map(k=>(h.res[k]&&h.res[k][2])|0);
  let B=store.get("tlmBase",null);const zero={e:0,lt:[0,0],rf:[0,0,0]};
  if(!B||typeof B!=="object"||!Array.isArray(B.lt)||!Array.isArray(B.rf)||h.err.n<B.e||h.lt[0]<B.lt[0]||h.lt[1]<B.lt[1]||rf.some((v,i)=>v<(B.rf[i]|0)))B=zero;
  const ne=Math.max(0,h.err.n-(B.e|0)),em=ne>0?h.err.last.slice(-Math.min(ne,TLM_MSG)).map(x=>[tlmScrub(x.m),String(x.f||"").slice(0,40),Math.max(0,+x.l|0)]):[];
  const p={t:"hlt",v:TLM_V,ver:String(window.XQ_BUILD||"").slice(0,20),dev:typeof fnDev==="function"?fnDev():"?",e:ne,em,
    lt:[Math.max(0,h.lt[0]-B.lt[0]),Math.max(0,h.lt[1]-B.lt[1])],bt:typeof healMed==="function"?healMed(h.boot):null,rf:rf.map((v,i)=>Math.max(0,v-(B.rf[i]|0))),
    ...(typeof fnTest==="function"&&fnTest()?{test:1}:{})};
  return{p,base:{e:h.err.n,lt:[h.lt[0],h.lt[1]],rf}}}
/* 丟掉手機裡排隊還沒送出的 hlt（只在送過以後才需要，避免每次都去改排隊清單） */
function tlmDrop(){try{if(!store.get("tlmQ",0))return;if(window.XQNet&&XQNet.dropIRT)XQNet.dropIRT("hlt");store.set("tlmQ",0)}catch(e){}}
/* 檢查一次：開了、今天還沒送、能送 → 送；回傳有沒有送 */
function tlmTry(){try{if(!tlmOn()){tlmDrop();return false}const d=tlmDayStr();if(store.get("tlmDay","")===d)return false;
  if(!window.XQNet||!XQNet.shareIRT)return false;const x=tlmPacket();if(!x)return false;
  if(typeof window.XQ_ANON_OK==="function"&&!window.XQ_ANON_OK(x.p))return false;
  XQNet.shareIRT(x.p);store.set("tlmDay",d);store.set("tlmBase",x.base);store.set("tlmQ",1);return true}catch(e){return false}}
function tlmBoot(){try{setTimeout(tlmTry,90000);setInterval(tlmTry,36e5);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)tlmTry()});addEventListener("pagehide",()=>tlmTry())}catch(e){}}
tlmBoot();
