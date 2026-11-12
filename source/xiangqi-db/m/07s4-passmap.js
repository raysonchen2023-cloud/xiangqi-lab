/* ================= 📜 關於＋換手機「書案合券＋一炷香」（42 案第 7 頁：Gemini 方案 1＋2，Claude 依考究清單修正；考究說明 park/passmap/考究說明.md）=================
   圖：park/passmap/pass_day_v2.png（Gemini 第一張＋宣紙濾鏡 0.6）、夜版 pass_night_v2.png（窗外夜色、案上一盞明式小油燈；Gemini 把燈放在券的位置，程式把燈移到香插旁邊）
       → art/passmap/。小素材 3 件（綠幕去背）：hq_quan_l／hq_quan_r 剖成兩半的驛券（鋸齒切口相合）、hq_seal 空白封條。
   天字客房窗下書案的特寫，包一層 setMap：設定頁的「驛路文牒」和「包袱書箱」不再打開設定畫軸，一下直接打開這頁（滿版面板，xqPanelNav：返回鍵先收面板）。
     左邊攤開的文牒＝關於：App、開發者、開始開發、版本（朱印「檢查更新」＝原本的 #aUpd）、整包大小和這支手機已用（朱線長條）、隱私說明；字照原本 #about 的內容寫。
     右邊兩半驛券＝換手機：左半「舊手機・產生轉移碼」＝原本的 #xfOut（xfSend）；右半「新手機・輸入轉移碼」＝原本的 #xfIn（xfRecv）。
       產生碼之後：左半券寫上轉移碼、騎縫蓋半方印；香插點上一炷香，30 分鐘內照剩下的時間燒短；書笈口貼一條空白封條。按「作廢這組碼」或過期就收掉。
       新手機收齊資料、跳出「用舊手機的資料取代這支手機？」時：右半券滑過去跟左半合上、半印對成一方、發金光，角色歡呼。
     轉移碼、30 分鐘、資料大小、作廢、輸入、下載進度、確認取代全部照原本 05-settings 的流程（卡片和確認視窗都是原本的）。
   角色：站在書案前；點書笈時鞠躬；合券時歡呼。字最小 13px。開關 PASSMAP_ON（false＝照舊打開設定畫軸）；圖片網址帶 HQ_IMGV；前綴 hq */
const PASSMAP_ON=true;
const HQ_IMGV="2500";
const HQ_DOC=[82,392,440,632],HQ_Q=[446,428,686,553],HQ_CEN=[646,352],HQ_BOX=[560,1130];   /* 文牒可寫範圍、券的位置、香插插香口、書笈（像素 768×1376） */
const SHW_HQ={W:768,H:1376,el:45,h:[.08,72,.0012],look0:[50,40],home:"home",N:{home:[24,88],front:[40,70],box:[62,80]},E:"home-front front-box home-box",
  HS:{hqBox:["box",70,85,"bow"],hqCheer:["front",60,40,"cheer"]}};
let HQ_ACT=null;   /* 這支手機剛產生、還有效的轉移碼 {code, exp}（只放記憶體） */
const hqDark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
function hqCss(){if(document.getElementById("hqCss"))return;const s=document.createElement("style");s.id="hqCss";s.textContent=`
.hq-pn{position:fixed;left:0;right:0;top:var(--xqT,0px);bottom:var(--xqB,0px);z-index:950;background:#2a2018;overflow:hidden;transform:translateY(calc(100% + var(--xqB,0px) + 24px));transition:transform .3s ease;color:#2a1f15}
.hq-pn.open{transform:none}.hq-pn.hq-dk{background:#121826}
.hq-h{position:absolute;left:0;right:0;top:0;z-index:6;display:flex;align-items:center;gap:8px;padding:8px 14px 10px;font:900 16px var(--serif,serif);background:linear-gradient(rgba(246,239,223,.94) 70%,rgba(246,239,223,0))}
.hq-dk .hq-h{background:linear-gradient(rgba(22,28,42,.94) 70%,rgba(22,28,42,0));color:#efe6d2}
.hq-h button{margin-left:auto;border:0;background:none;font-size:22px;cursor:pointer;color:inherit}
.hq-sc{position:absolute;inset:0;overflow:hidden}.hq-fr{position:absolute;left:0;top:0}
.hq-fr>img.hq-bg{display:block;width:100%;height:100%;pointer-events:none;user-select:none;-webkit-user-drag:none}
.hq-doc{position:absolute;display:flex;flex-direction:column;justify-content:center;padding:2px 6px;color:#2a1f15}
.hq-di{font:600 13px/1.25 var(--serif,serif);transform-origin:0 50%}
.hq-nw .v{white-space:nowrap}.hq-nw .hq-ft{flex-wrap:nowrap}
.hq-doc .t{font:900 1.2em/1.2 var(--kai,var(--serif,serif));color:#3a2618;letter-spacing:2px}
.hq-dl{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:.5em;align-items:baseline}
.hq-dl .k{color:#7a6650;white-space:nowrap}
.hq-dl .v{min-width:0;font-weight:700;word-break:keep-all;overflow-wrap:anywhere}
.hq-ft{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:3px 6px;margin-top:2px}
.hq-upd{flex:none;border:1.5px solid #f6e6cc;box-shadow:0 0 0 1.5px #a8321e;background:#a8321e;color:#f6e6cc;border-radius:2px;padding:2px 5px;font:900 1em/1.15 var(--kai,var(--serif,serif));white-space:nowrap;cursor:pointer}
.hq-upd:disabled{opacity:.6}
.hq-bar{display:block;height:4px;margin:1px 0 0;background:rgba(42,31,21,.18);border-radius:1px;overflow:hidden}.hq-bar i{display:block;height:100%;background:#b23a26}
.hq-pv{border:0;background:none;padding:0;color:#8a2a18;font:800 1em/1.25 var(--kai,var(--serif,serif));white-space:nowrap;cursor:pointer}
.hq-q{position:absolute;font-size:13px}
.hq-q img{position:absolute;top:0;height:100%;pointer-events:none;transition:transform .7s cubic-bezier(.3,1.2,.5,1),filter .5s}
.hq-q .il{left:0;width:52.03%;transform:translateX(-4%)}.hq-q .ir{left:47.89%;width:52.11%;transform:translateX(5%)}
.hq-q.join .il,.hq-q.join .ir{transform:none}
.hq-q.join img{filter:drop-shadow(0 0 6px rgba(255,214,100,.95)) drop-shadow(0 0 16px rgba(255,196,80,.7))}
.hq-hb{position:absolute;top:0;height:100%;border:0;background:none;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;color:#2a1f15;-webkit-tap-highlight-color:transparent}
.hq-hb.l{left:0;width:48%}.hq-hb.r{right:0;width:48%;transform:translateX(5%)}.hq-q.join .hq-hb.r{transform:none}
.hq-bi{display:flex;flex-direction:column;align-items:center;gap:1px;transform-origin:50% 50%;text-align:center}
.hq-bi span{display:block;white-space:nowrap;font:900 1.08em/1.2 var(--kai,var(--serif,serif));letter-spacing:1px}
.hq-bi span+span{font:700 1em/1.2 var(--kai,var(--serif,serif));letter-spacing:0;color:#5a4630}
.hq-bi .code{display:block;white-space:nowrap;font:900 1.12em/1.15 ui-monospace,Menlo,Consolas,monospace;color:#1e130c;letter-spacing:1px}
.hq-bi small{display:block;white-space:nowrap;font:700 1em/1.2 var(--kai,var(--serif,serif));color:#7a2a18;letter-spacing:0}
.hq-seal{position:absolute;left:50%;top:50%;width:13%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(-6deg);border:2px solid #b23a26;background:rgba(178,58,38,.12);pointer-events:none;opacity:0;transition:opacity .4s}
.hq-on .hq-seal{opacity:1;clip-path:inset(0 50% 0 0)}.hq-q.join .hq-seal{opacity:1;clip-path:none;background:rgba(178,58,38,.25)}
.hq-sl{position:absolute;width:23%;transform:translate(-50%,-50%) rotate(14deg);pointer-events:none;opacity:0;transition:opacity .4s;filter:drop-shadow(1px 1px 1px rgba(0,0,0,.3))}
.hq-on .hq-sl{opacity:1}
.hq-ink{position:absolute;width:4%;transform:translate(-50%,-100%);pointer-events:none;display:none}
.hq-on .hq-ink{display:block}
.hq-ink i{position:absolute;left:50%;bottom:0;width:2px;margin-left:-1px;background:linear-gradient(#5a3a22,#7a4a2a);border-radius:1px}
.hq-ink b{position:absolute;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:#ff8a3a;box-shadow:0 0 6px 2px rgba(255,140,60,.8)}
.hq-ink em{position:absolute;left:50%;width:10px;height:28px;margin-left:-5px;border-radius:50%;background:radial-gradient(rgba(220,220,220,.5),rgba(220,220,220,0) 70%);animation:hqSmoke 3.2s ease-in infinite}
@keyframes hqSmoke{from{transform:translateY(0) scale(.6);opacity:.7}to{transform:translateY(-34px) scale(1.4) translateX(4px);opacity:0}}
.hq-lb{position:absolute;transform:translate(-50%,0);background:#f3ead2;border:1px solid #8a6a3a;color:#3a2618;border-radius:3px;font:800 13px/1.2 var(--kai,var(--serif,serif));padding:2px 6px;white-space:nowrap;pointer-events:none;box-shadow:0 1px 2px rgba(0,0,0,.3)}
.hq-hs{position:absolute;transform:translate(-50%,-50%);border:0;background:none;padding:0;cursor:pointer}
.hq-cheer{position:absolute;left:40%;top:70%;width:1px;height:1px;opacity:0;pointer-events:none;border:0;padding:0}
.hq-flash{animation:hqFlash 1.2s ease}@keyframes hqFlash{0%,100%{box-shadow:none}30%{box-shadow:0 0 0 3px rgba(242,201,76,.8),0 0 18px 6px rgba(242,201,76,.45)}}
@media (prefers-reduced-motion:reduce){.hq-pn,.hq-q img{transition:none}.hq-ink em{animation:none;display:none}}`;document.head.append(s)}
const hqMB=t=>{const m=String(t||"").replace(/,/g,"").match(/([\d.]+)\s*(KB|MB|GB)/i);if(!m)return null;const x=+m[1],u=m[2].toUpperCase();return u==="GB"?x*1024:u==="KB"?x/1024:x};
/* 回饋 827（開發者 11/9「排版雜亂、版本號沒寫完整」）：文牒改成整齊的兩欄（標籤／值），不再用「…」截斷，太長就換行；版本 20261109-1415 寫成 2026/11/09 14:15、開始開發寫成 2026/10/29；
   檢查更新的朱印和「隱私說明」放最後一列。合券紙條改橫排、文案縮短（舊手機／產生碼、新手機／輸入碼），整包和已用併成一列「已用 96.4 MB／671 MB」＋進度條，不再直排斷成碎片。
   字放不下（窄螢幕、Safari 放大字）時：先縮一級（13→12px），再放不下才把整塊等比縮小，不跑出紙外。 */
const hqVer=s=>{const m=String(s||"").match(/^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(.*)$/);return m?m[1]+"/"+m[2]+"/"+m[3]+" "+m[4]+":"+m[5]+m[6]:String(s||"")};
const hqDay=s=>{const m=String(s||"").match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);return m?m[1]+"/"+m[2].padStart(2,"0")+"/"+m[3].padStart(2,"0"):String(s||"")};
function hqAvail(b){const c=getComputedStyle(b);return[b.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight),b.clientHeight-parseFloat(c.paddingTop)-parseFloat(c.paddingBottom)]}
function hqFitAll(host,pairs,f0,f1){const L=pairs.filter(p=>p[0]&&p[1]);L.forEach(p=>{p[0].style.transform="";p[0].style.width="";p[0].classList.remove("hq-nw")});const A=L.map(p=>hqAvail(p[1]));if(!L.length||A.some(a=>a[0]<=0||a[1]<=0))return;
  const sz=e=>[Math.max(e.offsetWidth,e.scrollWidth),e.offsetHeight],ov=i=>{const z=sz(L[i][0]);return z[0]>A[i][0]+.5||z[1]>A[i][1]+.5};
  let f=f0;host.style.fontSize=f+"px";while(f>f1&&L.some((p,i)=>ov(i))){f-=.5;host.style.fontSize=f+"px"}
  L.forEach((p,i)=>{if(!ov(i))return;const e=p[0];e.classList.add("hq-nw");if(e.classList.contains("hq-di")){e.style.width="max-content";if(sz(e)[0]<A[i][0])e.style.width=""}
    const z=sz(e),k=Math.min(1,A[i][0]/(z[0]||1),A[i][1]/(z[1]||1));if(k<.995)e.style.transform="scale("+k.toFixed(3)+")"})}   /* 縮一級還放不下：不再換行（免得剩一個「MB」掉到下一行），整塊等比縮小 */
function hqOpen(v,focus){const root=v.querySelector(".pad.home");if(!root)return;hqCss();let pn=v.querySelector(".hq-pn");if(!pn)pn=hqBuild(v,root);if(!pn)return;
  if(!pn.classList.contains("open")){pn.classList.add("open");if(typeof xqPanelNav==="function")pn._un=xqPanelNav(()=>{pn._un=null;pn.classList.remove("open")})}
  pn._fit();pn._paint();const el=pn.querySelector(focus==="about"?".hq-doc":".hq-q");if(el){el.classList.remove("hq-flash");void el.offsetWidth;el.classList.add("hq-flash")}}
function hqBuild(v,root){const dk=hqDark(),pn=document.createElement("div");pn.className="hq-pn"+(dk?" hq-dk":"");
  const pct=(x,y)=>`left:${(x/7.68).toFixed(2)}%;top:${(y/13.76).toFixed(2)}%`,box=(r)=>`left:${(r[0]/7.68).toFixed(2)}%;top:${(r[1]/13.76).toFixed(2)}%;width:${((r[2]-r[0])/7.68).toFixed(2)}%;height:${((r[3]-r[1])/13.76).toFixed(2)}%`;
  pn.innerHTML=`<div class="hq-sc"><div class="hq-fr"><img class="hq-bg" src="${xqClImg(`data/passmap/${dk?"pass_night":"pass_day"}.webp?v=${HQ_IMGV}`)}" alt="客房窗下的書案：攤開的文牒、剖成兩半的驛券、香插、書笈和包袱">
      <div class="hq-doc" style="${box(HQ_DOC)}"></div>
      <div class="hq-ink" style="${pct(HQ_CEN[0],HQ_CEN[1])};height:7.5%"><i></i><b></b><em></em></div>
      <div class="hq-q" style="${box(HQ_Q)}"><img class="il" src="data/passmap/hq_quan_l.webp?v=${HQ_IMGV}" alt=""><img class="ir" src="data/passmap/hq_quan_r.webp?v=${HQ_IMGV}" alt=""><i class="hq-seal"></i>
        <button type="button" class="hq-hb l" id="hqOld"></button><button type="button" class="hq-hb r" id="hqNew" aria-label="新手機：輸入轉移碼"><i class="hq-bi"><span>新手機</span><span>輸入碼</span></i></button></div>
      <span class="hq-lb" style="${pct((HQ_Q[0]+HQ_Q[2])/2,HQ_Q[3]+8)}">換手機</span>
      <img class="hq-sl" src="data/passmap/hq_seal.webp?v=${HQ_IMGV}" alt="" style="${pct(HQ_BOX[0]-30,HQ_BOX[1]+10)}">
      <button type="button" class="hq-hs" id="hqBox" style="${pct(HQ_BOX[0],HQ_BOX[1])};width:34%;height:20%" aria-label="書笈：換手機"></button>
      <button type="button" class="hq-cheer" id="hqCheer" tabindex="-1" aria-hidden="true"></button></div></div>
    <div class="hq-h"><span>驛路文牒・換手機</span><button type="button" aria-label="收起">✕</button></div>`;
  v.append(pn);
  const fr=pn.querySelector(".hq-fr"),doc=pn.querySelector(".hq-doc"),q=pn.querySelector(".hq-q"),old=pn.querySelector("#hqOld"),ink=pn.querySelector(".hq-ink");
  const close=()=>{pn.classList.remove("open");if(pn._un){const f=pn._un;pn._un=null;f()}};pn.querySelector(".hq-h button").onclick=close;
  pn._fit=()=>{const W=pn.clientWidth,H=pn.clientHeight;if(!W||!H)return;const k=W/H>.7?H/1376:Math.max(W/768,H/1376);   /* 827：小手機（例如 375×667）也照寬度放，文牒的字才不會縮太小；上下各裁掉一點窗和地板 */Object.assign(fr.style,{width:768*k+"px",height:1376*k+"px",left:(W-768*k)/2+"px",top:(H-1376*k)/2+"px"});pn._tf()};
  pn._tf=()=>{try{const di=doc.querySelector(".hq-di");if(di)hqFitAll(di,[[di,doc]],13,12);hqFitAll(q,[...q.querySelectorAll(".hq-hb")].map(b=>[b.querySelector(".hq-bi"),b]),13,12)}catch(e){}};
  /* 文牒＝原本「關於」那張卡片的內容 */
  const about=()=>{const A=root.querySelector("#about"),R={};if(A)A.querySelectorAll(":scope>.row").forEach(r=>{const k=r.querySelector(".muted"),b=r.querySelector("b");if(k&&b)R[k.textContent.trim()]=b.textContent.trim()});return R};
  pn._paint=()=>{const R=about(),u=root.querySelector("#aUpd"),all=hqMB(R["整包下載"]),use=hqMB(R["這支手機已用"]);
    doc.innerHTML=`<div class="hq-di"><div class="t">${esc(R["App"]||"象棋千秋")}</div><div class="hq-dl">
      <span class="k">版本</span><span class="v">${esc(hqVer(R["版本"]))}</span><span class="k">開發者</span><span class="v">${esc(R["開發者"]||"")}</span><span class="k">開始開發</span><span class="v">${esc(hqDay(R["開始開發"]))}</span>
      ${R["整包下載"]?`<span class="k">已下載</span><span class="v" style="white-space:nowrap">${(()=>{/* 回饋 843（開發者 11/9「不要換行，或是其他方式表示」）：寫成「332／687 MB」一行，單位相同就只寫一次；底下進度條照舊 */const u=String(R["這支手機已用"]||"—"),t=String(R["整包下載"]).replace(/^約\s*/,""),uu=u.match(/^([\d.,]+)\s*([KMG]B)$/i),tt=t.match(/^([\d.,]+)\s*([KMG]B)$/i);return uu&&tt&&uu[2].toUpperCase()===tt[2].toUpperCase()?esc(uu[1])+"／"+esc(tt[1])+" "+esc(tt[2]):esc(u)+"／"+esc(t)})()}<i class="hq-bar" aria-hidden="true"><i style="width:${all&&use!=null?Math.min(100,Math.round(use*100/all)):0}%"></i></i></span>`:""}</div>
      <div class="hq-ft"><button type="button" class="hq-pv">隱私說明 ›</button>${u?`<button type="button" class="hq-upd"${u.disabled?" disabled":""}>${esc(u.textContent.trim())}</button>`:""}</div></div>`;
    const ub=doc.querySelector(".hq-upd");if(ub)ub.onclick=()=>{vibrate(5);const o=root.querySelector("#aUpd");if(o)o.click()};
    doc.querySelector(".hq-pv").onclick=()=>{vibrate(5);const st=[...root.querySelectorAll(".sec-t")].find(x=>x.textContent.trim()==="隱私"),c=st&&st.nextElementSibling;
      sheet("隱私說明",b=>{const sel=c&&c.querySelector("#myCityS");   /* 11/9 開發者「長話短說講重點」：只講重點三句；城市選單用真的下拉選單（原本 textContent 把選項攤成一串字） */
        b.innerHTML=c?`<ul style="line-height:1.8;margin:0;padding-left:1.2em"><li>每 7 天送名字、段位、App 版本、手機型號給開發者，用來查問題。</li><li>不送棋譜、聊天和其他個人資料。</li><li>不查你在哪裡；城市要不要在大廳顯示，你自己選。</li></ul>`:`<p style="line-height:1.8;margin:0">這個版本沒有送出任何資料。</p>`;if(c&&typeof xqDocBtns==="function")b.insertAdjacentHTML("beforeend",xqDocBtns());   /* 11/11 送審：完整的隱私、授權、版本、限制四份說明（05-settings.js xqDoc） */
        if(sel){const l=document.createElement("label");l.style.cssText="display:flex;align-items:center;gap:8px;margin-top:12px";l.innerHTML=`<span style="flex:1">🏙 大廳顯示我的城市</span>`;const s2=sel.cloneNode(true);s2.removeAttribute("id");s2.value=sel.value;s2.onchange=()=>{sel.value=s2.value;if(typeof sel.onchange==="function")sel.onchange()};l.append(s2);b.append(l)}})};
    act()};
  /* 轉移碼的狀態：左半券、半印、一炷香、書笈封條 */
  const act=()=>{if(HQ_ACT&&Date.now()>HQ_ACT.exp)HQ_ACT=null;const A=HQ_ACT;pn.classList.toggle("hq-on",!!A);
    if(A){const left=Math.max(0,A.exp-Date.now()),mn=Math.ceil(left/60000);old.innerHTML=`<i class="hq-bi"><small>轉移碼</small><b class="code">${esc(A.code.slice(0,4))}</b><b class="code">${esc(A.code.slice(4))}</b><small>剩 ${mn} 分</small></i>`;old.setAttribute("aria-label",`轉移碼 ${A.code}，還剩 ${mn} 分鐘`);
      ink.querySelector("i").style.height=(Math.max(.04,left/1800000)*100).toFixed(1)+"%";ink.querySelector("b").style.bottom=`calc(${(Math.max(.04,left/1800000)*100).toFixed(1)}% - 3px)`;ink.querySelector("em").style.bottom=(Math.max(.04,left/1800000)*100).toFixed(1)+"%"}
    else{old.innerHTML='<i class="hq-bi"><span>舊手機</span><span>產生碼</span></i>';old.setAttribute("aria-label","舊手機：產生轉移碼")}if(pn._tf)pn._tf()};
  const tk=setInterval(()=>{if(!pn.isConnected){clearInterval(tk);mo.disconnect();return}if(pn.classList.contains("open"))act()},15000);
  const gen=()=>{const o=root.querySelector("#xfOut");if(o)o.click();else if(typeof xfSend==="function")xfSend()};
  old.onclick=()=>{vibrate(5);if(!HQ_ACT){gen();return}const A=HQ_ACT;
    sheet("轉移碼",b=>{b.innerHTML=`<p style="margin:0 0 6px">在新手機打開象棋千秋，點設定頁的包袱書箱，再點「新手機・輸入轉移碼」，輸入：</p><div style="font:900 30px/1.3 ui-monospace,monospace;letter-spacing:.12em;text-align:center;margin:10px 0">${esc(A.code.slice(0,4)+"-"+A.code.slice(4))}</div><p class="muted" style="font-size:13px">到 ${new Date(A.exp).toLocaleTimeString().slice(0,-3)} 前有效。要作廢這組碼，就產生一組新的（舊的會在 30 分鐘後自動失效）。</p><button class="btn ghost" id="hqRe" style="width:100%">產生新的轉移碼</button>`;
      b.querySelector("#hqRe").onclick=()=>{closeSheet();setTimeout(gen,260)}})};
  pn.querySelector("#hqNew").onclick=()=>{vibrate(5);const o=root.querySelector("#xfIn");if(o)o.click();else if(typeof xfRecv==="function")xfRecv()};
  pn.querySelector("#hqBox").onclick=()=>{old.click()};
  pn.querySelector("#hqCheer").onclick=()=>{};
  /* 看原本的卡片：產生轉移碼的卡片出現碼＝記下來；按「作廢這組碼」＝收掉；「用舊手機的資料取代這支手機？」出現＝合券 */
  const mo=new MutationObserver(()=>{if(!pn.isConnected){mo.disconnect();return}
    const sh=document.getElementById("sheet");if(sh&&!sh.dataset.hq){const c=[...sh.querySelectorAll(".sh-b div")].find(d=>/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(d.textContent.trim()));
      if(c){sh.dataset.hq="1";HQ_ACT={code:c.textContent.trim().replace("-",""),exp:Date.now()+30*60000};act();const x=sh.querySelector("#xfX");if(x)x.addEventListener("click",()=>{HQ_ACT=null;act()})}}
    const md=[...document.querySelectorAll(".modal h2")].find(h=>h.textContent.includes("取代這支手機"));if(md&&!md.dataset.hq){md.dataset.hq="1";q.classList.remove("join");void q.offsetWidth;q.classList.add("join");
      try{const c=pn.querySelector("#hqCheer");if(c)c.click()}catch(e){}}
    if(q.classList.contains("join")&&!md&&!q._uj)q._uj=setTimeout(()=>{q._uj=0;if(!document.querySelector(".modal h2[data-hq]"))q.classList.remove("join")},1500)});   /* 按了「取消」：券再分開 */
  mo.observe(document.body,{childList:true,subtree:true});
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!pn.isConnected){ro.disconnect();return}pn._fit()});ro.observe(pn)}
  /* 面板打開才放角色 */
  const walk=on=>{if(typeof shwMount!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;
    if(!on){fr.querySelectorAll(".shw,.shw-me,.shw-hint,.shw-say").forEach(x=>x.remove());delete pn.dataset.shw;return}
    if(pn.dataset.shw)return;try{shwMount({v,cfg:Object.assign({},SHW_PG0,SHW_HQ),root:pn,frame:fr,layer:fr,before:doc,sel:"#hqBox,#hqCheer",keyOf:b=>b.id,find:h=>pn.querySelector("#"+h),mem:"hq"})}catch(e){}};
  let o0=null;new MutationObserver(()=>{const o=pn.classList.contains("open");if(o===o0)return;o0=o;walk(o);if(!o)q.classList.remove("join")}).observe(pn,{attributes:true,attributeFilter:["class"]});
  /* 原本的「關於」內容有變（檢查更新的結果、這支手機已用多少算好了）就重寫文牒 */
  {const A=root.querySelector("#about");if(A)new MutationObserver(()=>{if(pn.isConnected&&pn.classList.contains("open"))pn._paint()}).observe(A,{childList:true,subtree:true,characterData:true,attributes:true})}
  return pn}
if(typeof setMap==="function"){const f0=setMap;setMap=function(v){const r=f0.apply(this,arguments);try{if(PASSMAP_ON){const P=v.querySelector(".set-page");
    const a=P&&P.querySelector("#smPack"),b=P&&P.querySelector("#smPass");if(a)a.onclick=()=>{vibrate(5);hqOpen(v,"xf")};if(b)b.onclick=()=>{vibrate(5);hqOpen(v,"about")}}}catch(e){}return r}}
