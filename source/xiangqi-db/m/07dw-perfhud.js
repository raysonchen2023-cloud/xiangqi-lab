/* ---------- 效能浮標（第 9 輪 Gemini 改善單「新增效能偵錯覆疊介面（供後續實機截圖用）」，開發者 11/12 選做）：前綴 phud ----------
   只在開發者模式、而且在「🧪 開發者測試台」打開時出現；畫面右上角（避開瀏海）一個不擋點選的小框，每半秒更新：
   ・整頁幀數（requestAnimationFrame 算，最近 1 秒）和最近 10 秒的最低幀數
   ・3D 園子／黑洞：park3d 的效能計數 window.__PK.perf（3D 幀數、省電模式開不開、原因、畫素比、抗鋸齒）
   ・JS 記憶體（只有 Chrome 系有 performance.memory；iPhone Safari 沒有就寫「不提供」）、長任務次數（Safari 沒有）
   ・時鐘到 0.1 秒、目前頁面：錄影時拿來對照幀數掉在哪一秒
   用法：設定 → 進階 → 開發者模式 → 🧪 開發者測試台 →「📈 效能浮標」。開著時才跑 requestAnimationFrame，切到背景暫停。測試：xiangqi-lab/tools/test-perfhud.js */
const PHUD={el:null,raf:0,iv:0,fr:[],lt:0,lo:null};
const phudOn=()=>typeof DEVMODE==="function"&&DEVMODE()&&!!store.get("perfHud",false);
/* 最近 1 秒幾格＝幀數；最近 10 秒切成 10 個一秒的格子，資料涵蓋到的格子取最少的那格＝最低幀數 */
function phudFps(now){const a=PHUD.fr;while(a.length&&now-a[0]>11000)a.shift();let n=0;for(let i=a.length-1;i>=0&&now-a[i]<1000;i--)n++;
  let lo=null;for(let k=1;k<=10;k++){const s=now-k*1000;if(!a.length||a[0]>s)break;let c=0;for(const t of a)if(t>s&&t<=s+1000)c++;if(lo==null||c<lo)lo=c}return{fps:n,lo}}
function phudText(now){const f=phudFps(now),P=window.__PK&&window.__PK.perf,m=performance.memory,d=new Date();
  const L=[`頁面 ${f.fps} fps`+(f.lo!=null?`（10 秒最低 ${f.lo}）`:"")];
  if(P&&P.live)L.push(`3D ${P.fps|0} fps・省電${P.power?"開":"關"}${P.power&&P.why&&P.why.length?"（"+P.why.join("、")+"）":""}・畫素比 ${(+P.pr||1).toFixed(2)}${P.aa?"・抗鋸齒":""}`);else L.push("3D 沒在畫");
  L.push(m&&m.usedJSHeapSize?`JS 記憶體 ${Math.round(m.usedJSHeapSize/1048576)}／${Math.round(m.jsHeapSizeLimit/1048576)} MB`:"JS 記憶體：這個瀏覽器不提供");
  L.push(`長任務 ${PHUD.lt} 次・${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}.${Math.floor(d.getMilliseconds()/100)}・${(location.hash||"#/").slice(0,18)}`);
  return L.join("\n")}
function phudStop(){cancelAnimationFrame(PHUD.raf);clearInterval(PHUD.iv);PHUD.raf=0;PHUD.iv=0;PHUD.fr=[];if(PHUD.el){PHUD.el.remove();PHUD.el=null}}
function phudStart(){if(!phudOn()){phudStop();return}if(PHUD.el)return;
  const el=PHUD.el=document.createElement("div");el.id="phud";el.setAttribute("aria-hidden","true");
  el.style.cssText="position:fixed;top:calc(env(safe-area-inset-top,0px) + 2px);right:calc(env(safe-area-inset-right,0px) + 4px);z-index:99999;pointer-events:none;white-space:pre;font:600 10.5px/1.35 ui-monospace,Menlo,monospace;color:#d8ffd8;background:rgba(0,0,0,.66);padding:3px 6px;border-radius:6px;max-width:72vw;overflow:hidden";
  document.body.append(el);
  if(window.PerformanceObserver&&!PHUD.lo){try{PHUD.lo=new PerformanceObserver(l=>{PHUD.lt+=l.getEntries().length});PHUD.lo.observe({type:"longtask",buffered:false})}catch(e){PHUD.lo=null}}
  const tick=t=>{PHUD.fr.push(t);PHUD.raf=requestAnimationFrame(tick)};PHUD.raf=requestAnimationFrame(tick);
  PHUD.iv=setInterval(()=>{if(!PHUD.el)return;if(document.hidden)return;const now=performance.now();PHUD.fr=PHUD.fr.filter(x=>now-x<=11000);PHUD.el.textContent=phudText(now)},500)}
function phudToggle(){store.set("perfHud",!store.get("perfHud",false));if(phudOn())phudStart();else phudStop();return phudOn()}
document.addEventListener("visibilitychange",()=>{if(!PHUD.el)return;if(document.hidden){cancelAnimationFrame(PHUD.raf);PHUD.raf=0}else if(!PHUD.raf){const tick=t=>{PHUD.fr.push(t);PHUD.raf=requestAnimationFrame(tick)};PHUD.raf=requestAnimationFrame(tick)}});
setTimeout(()=>{try{phudStart()}catch(e){}},1500);
