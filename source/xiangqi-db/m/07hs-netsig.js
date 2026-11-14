/* ================= 📶 線上對局：連線訊號格、對方沒回應（評比第 12 輪 X11，評審「連線與雲端架構師」P22.1、P22.2）=================
   資料都來自 src/net.js 的 LINK 區段：XQNet.latency()（延遲毫秒、訊號格 0～4）、XQNet.peer()（對方有沒有回應）、XQNet.syncInfo()（跟對方的局面 rev＋雜湊比對）。
   ① 訊號格：線上對局頁（#/pvp，自己是紅方或黑方；觀戰不顯示）棋盤右下角一顆小膠囊「▂▄▆█ 85 ms」，格數＋毫秒數字（不只靠顏色）；
      跟對方的局面對不上超過 4 秒加「🔄 同步中」，對方 30 秒沒回應加「⏳ 對方 N 秒沒回應」。點一下用 toast 說明。
   ② 對方沒回應 90 秒（peer().st＝"gone"）：跳一個視窗說明（輪到誰、輪到他的話再幾秒會照規則判他超時），三個選項：
      ⏳ 繼續等（2 分鐘內不再問）／🤝 判和（不計分）／🚪 離開這盤（不計分）。判和、離開都是 XQNet.peerAbort（結果是中止，不計積分；判負規則一條都沒改）。
      千秋盃沒有中止：只有「繼續等」和「回大廳（這盤保留）」。對方回來了，視窗自己收掉。
   ③ 評比第 13 輪 X2（評審 P22.1、P22.2、P22.5、P31.3）：點一下（或長按）訊號膠囊＝打開「連線狀態」小卡（以前是 toast）：
      延遲（最近 10 次、平均、抖動、伺服器心跳）、雙方 rev／步數／局面雜湊一不一致、對局簽名和對方版本、這盤重連幾次、計數、最近 20 則同步事件
      （時間、收／送、種類、序號、驗簽 ✓／✗／未驗證、丟掉的原因）；「📋 複製除錯資訊」複製成純文字（只有匿名統計：沒有金鑰、代號、名字、對局代號）。卡片開著每秒更新。
      資料來自 XQNet.linkDebug()；對方是上一版（同步訊息沒簽名）時，延遲標「未驗證」。
   ④ 評比第 14 輪 F2（開局公開金鑰驗證）：小卡多「對方金鑰」（已釘選／第一次見到／已變更⚠，千秋盃加「裁判台認證」）、對方金鑰指紋、我的指紋（兩人可以當面或用別的方式比對）；
      資料來自 XQNet.keyInfo()。指紋只顯示、不放進「複製除錯資訊」。對方金鑰「已變更」時膠囊多一個 🔑⚠；收到「金鑰跟上次不一樣」的邀請、或擋下可疑的邀請時跳 toast。
   沒有改 m.css：樣式在這裡用一個 <style id="nsgCss"> 放進去。前綴 nsg／NSG。測試 xiangqi-lab/tools/test-net-link.js、test-net-linksig.js、test-net-pin.js */
const NSG={el:null,hold:0,box:null,last:"",dbg:null,lp:null,lpOn:false,inv:false,kbAt:0};
/* 對方金鑰的狀態 → 文字（K＝XQNet.keyInfo() 或 linkDebug().key） */
const NSG_KS={pinned:"已釘選（跟上次對局同一把）",first:"第一次見到",changed:"已變更⚠（跟上次對局不是同一把）",none:"沒有金鑰（對方版本較舊）"};
const nsgKeyTxt=K=>!K?"—":(NSG_KS[K.st]||"—")+(K.cert?"・裁判台認證":"")+(K.iv?"・邀請有簽名":"");
/* 秒數 → 「45 秒」「2 分 05 秒」 */
const nsgSec=ms=>{const s=Math.max(0,Math.round((+ms||0)/1000));return s<120?s+" 秒":Math.floor(s/60)+" 分 "+String(s%60).padStart(2,"0")+" 秒"};
/* 膠囊的內容（純函式，測試直接呼叫）：L＝latency()、P＝peer()、S＝syncInfo()、now＝現在 → {bars 0～4 或 null, txt 文字, tip 點一下的說明, lv 顏色等級} */
function nsgView(L,P,S,now,K){L=L||{};const b=L.bars==null?null:L.bars|0,up=!(L.bars===0&&L.ms==null);
  let txt=!up?"斷線":L.ms==null?"—":L.ms+" ms";
  const syncBad=!!(S&&S.ok===false&&now-S.at>4000);if(syncBad)txt+=" 🔄 同步中";
  if(P&&(P.st==="slow"||P.st==="gone"))txt+=" ⏳ 對方 "+nsgSec(P.ms)+"沒回應";
  const kc=!!(K&&K.st==="changed");if(kc)txt+=" 🔑⚠";   /* 第 14 輪 F2：對方金鑰跟上次對局不一樣 */
  const tip=(!up?"網路斷了，重新連線中；斷線時走的棋，連上後會自動送出。":L.ms==null?"正在量連線延遲…":`連線延遲 ${L.ms} 毫秒（${L.src==="peer"?"跟對方手機來回一趟":"跟伺服器來回一趟"}）・訊號 ${b}／4 格。`+(L.src==="peer"&&L.ver===false?"（未驗證：對方版本較舊，同步訊息沒有簽名）":""))
    +(S&&S.ok===true?"棋局跟對方一致。":S&&S.ok===false?"棋局跟對方還沒對上，正在自動補齊。":"")+(P&&P.st!=="ok"&&P.st!=="self"?`對方已經 ${nsgSec(P.ms)}沒有回應。`:"")
    +(kc?"對方的手機金鑰跟上次對局不一樣（換手機、重裝 App 也會這樣），點一下看指紋。":"");
  return{bars:up?b:0,txt,tip,lv:!up?0:b==null?2:b}}
/* 對方沒回應的視窗內容（純函式）：P＝peer() → {html, opts:[{k:"wait"|"draw"|"leave"|"lobby", label}]} */
function nsgAskSpec(P){const w=P.winIn!=null?nsgSec(P.winIn):null;
  const html=`<div class="em">📵</div><h2>對方沒有回應</h2><p class="muted">已經 ${nsgSec(P.ms)}沒收到對方的訊息${P.kpeer?"":"（對方顯示離線）"}，可能網路斷了、或切到別的 App。</p>`
    +`<p class="muted">${P.oppTurn?(w?`現在輪到對方：再過 ${w}他還沒走，會照原本的規則判他超時。`:"現在輪到對方。"):"現在輪到你：可以先走，等他回來。"}</p>`
    +(P.canAbort?'<p class="muted">判和、離開都是「中止這盤、不計積分」。</p>':'<p class="muted">千秋盃沒有中止：可以先回大廳，這盤會保留。</p>');
  const opts=[{k:"wait",label:"⏳ 繼續等"}];
  if(P.canAbort)opts.push({k:"draw",label:"🤝 判和（不計分）"},{k:"leave",label:"🚪 離開這盤（不計分）"});else opts.push({k:"lobby",label:"🌐 回大廳（這盤保留）"});
  return{html,opts}}
/* ---- 連線狀態小卡（評比第 13 輪 X2）---- */
const NSG_T={p:"ping",q:"pong",st:"補狀態",nd:"要狀態"};
const NSG_PV={"new":"新版（同步訊息有簽名）","old-k":"上一版（同步訊息沒簽名，未驗證）","old":"舊版（沒有同步頻道）","?":"還不知道"};
const NSG_SG={signed:"雙方簽名",legacy:"對方版本較舊，無法驗證（不計分）",cup:"千秋盃（裁判台開局）",unknown:"還不知道"};
const NSG_PS={ok:"有回應",slow:"慢",gone:"很久沒回應",self:"自己斷線"};
const nsgEsc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* 開發者 11/13 選「只記在對局紀錄」（威脅模型 T9、T11）：這盤發生過的晚到推翻、千秋盃擋下沒有簽名的動作（net.js 的 notes()，存檔裡叫 nnote）→ 賽後紀錄的一行大字。
   不跳提示；只有發生過才有，一般對局回空陣列。英文走 07i18n 的 I18N_KEY（net.note.*）；nsgNoteHtml 的每一行照 toastFit 的規矩（先縮字、縮到 12px 還放不下才換行） */
const nsgT=(k,z,v)=>typeof i18nT==="function"?i18nT(k,z,v):z;
function nsgNotes(L){const out=[];try{for(const e of Array.isArray(L)?L:[]){if(!e)continue;const n=Math.max(1,+e.n||1);
  if(e.k==="late")out.push(e.keep?nsgT("net.note.lateKeep",`對方有一步晚到 ${n} 分鐘才送到，這盤改算友誼賽，你的勝場照算`,{n}):nsgT("net.note.late",`對方有一步晚到 ${n} 分鐘才送到，已照規則收下`,{n}));
  else if(e.k==="act")out.push(nsgT("net.note.act",`擋下 ${n} 個沒有簽名的動作（可能有人冒充）`,{n}));
  /* 評比第 16 輪第 5 項（net.js 的 NS 區段）：棋鐘可信度不足，這盤整盤（兩端、觀眾、伺服器）改為不計分。by：me＝這支手機宣告、opp＝對方宣告、x＝觀眾；why：late 晚到、clock 棋鐘少扣 */
  else if(e.k==="ns")out.push(e.by==="me"?(e.why==="clock"?nsgT("net.note.nsClock",`對方的棋鐘比這邊量的少扣了 ${n} 分鐘，這盤改為不計分（雙方都不加減分）`,{n}):nsgT("net.note.nsLate",`對方有一步晚了 ${n} 分鐘才到，這盤改為不計分（雙方都不加減分）`,{n})):e.by==="opp"?nsgT("net.note.nsOpp","對方回報這盤棋鐘不可信，改為不計分（雙方都不加減分）"):nsgT("net.note.nsSeen","這盤棋鐘不可信，改為不計分"))}}catch(err){}return out}
function nsgNoteHtml(L){const a=nsgNotes(L);if(!a.length)return"";setTimeout(()=>{try{document.querySelectorAll(".nsg-note").forEach(t=>{if(typeof toastFit==="function")toastFit(t)})}catch(e){}},0);
  return a.map(s=>`<p class="nsg-note" style="font-size:1.05em;font-weight:700;margin:6px 0">${nsgEsc(s)}</p>`).join("")}
const nsgHm=t=>{const d=new Date(t);return[d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,"0")).join(":")};
/* 小卡內容（純函式，測試直接呼叫）：D＝XQNet.linkDebug()、tip＝膠囊的說明、now → {body 卡片內文 html, html 整張, text 複製用的純文字}。
   text 只放 D 裡的匿名統計（D 本身就沒有金鑰、代號、名字、gid） */
function nsgDbgSpec(D,tip,now,K){
  if(!D){const t="象棋千秋 連線除錯：現在不在線上對局裡";return{body:'<p class="muted">現在不在線上對局裡。</p>',html:'<h2>📶 連線狀態</h2><p class="muted">現在不在線上對局裡。</p>',text:t}}
  const L=D.lat||{},S=D.sync||{},st=D.stats||{},ms=v=>v==null?"—":v+" ms",n=v=>v==null?"—":v;
  const src=L.src==="peer"?"跟對方手機來回"+(L.ver===false?"・未驗證":L.ver?"・已驗簽":""):L.src==="server"?"跟伺服器來回（對方沒回 pong）":"還沒量到";
  const pr=S.peer,side=o=>o?`rev ${n(o.rev)}・${n(o.n)} 步・雜湊 ${o.h||"—"}`:"還沒收到";
  const same=S.ok===true?"✅ 一致":S.ok===false?"⚠️ 不一致（自動補齊中）":"— 還沒比對";
  const rows=[["延遲",`${ms(L.ms)}（${src}）・訊號 ${L.bars==null?"—":L.bars}／4 格`],
    ["最近幾次",L.last&&L.last.length?L.last.join("、")+" ms":"—"],
    ["平均／抖動",`${ms(L.avg)}／${ms(L.jit)}・伺服器心跳 ${ms(L.server)}`],
    ["我這邊",side(S.me)],["對方報的",side(pr)],
    ["雙方局面",same+(S.ok!=null&&S.ver===false?"（對方的報告未驗證）":"")],
    ["對局簽名",NSG_SG[D.sign]||"—"],
    ["對方版本",(NSG_PV[D.peerVer]||"—")+(D.req?"・這盤同步訊息一律要簽名":"")],
    ["這盤重連",`${n(D.recon)} 次・對方${NSG_PS[D.peer]||"—"}`],
    ["收到的同步訊息",`驗過 ${n(st.sigOk)}・未驗證 ${n(st.unv)}`],
    ["丟掉的",`簽名不對 ${n(st.bad)}・沒簽名 ${n(st.nosig)}・重放 ${n(st.replay)}・時間窗外 ${n(st.win)}・重複 ${n(st.dup)}・舊心跳 ${n(st.old)}・太多 ${n(st.flood)}`],
    ["補齊",`補狀態 送 ${n(st.stOut)}／收 ${n(st.stIn)}・要狀態 ${n(st.nd)}・跳號 ${n(st.gap)}／補上 ${n(st.gapFix)}`]];
  /* 第 14 輪 F2：對方金鑰（K＝keyInfo()，有指紋；沒有就用 D.key，沒有指紋）。指紋那兩列只放畫面（第三個欄位 false＝不複製） */
  const KK=K||D.key||null;
  if(KK){rows.splice(7,0,["對方金鑰",nsgKeyTxt(KK)]);
    if(K&&K.st!=="none")rows.splice(8,0,["對方金鑰指紋",(K.fp||"計算中…")+(K.st==="changed"&&K.was?`（上次是 ${K.was}）`:""),false],["我的指紋",K.mine||"計算中…",false])}
  const kNote=KK&&KK.st==="changed"?"⚠ 對方的手機金鑰跟你上次跟他下棋時不一樣。換手機、重裝 App、清掉網站資料都會這樣；不確定是不是本人，請當面或用別的方式跟他比對：他小卡上的「我的指紋」要等於你這裡的「對方金鑰指紋」。"
    :KK&&KK.st==="first"&&!KK.cert?"第一次跟這把金鑰下棋。想確認是本人，可以跟他比對指紋：他小卡上的「我的指紋」要等於你這裡的「對方金鑰指紋」。":"";
  const E=(D.ev||[]).slice().reverse(),okTxt=e=>e.ok===true?"✓":e.ok===false?"✗":"未驗證",why=e=>e.why||(e.d==="out"?"送出":"收下");
  const body=(tip?`<p class="muted">${nsgEsc(tip)}</p>`:"")+'<table class="nsg-kv">'+rows.map(r=>`<tr${r[2]===false?' class="nsg-fp"':""}><th>${nsgEsc(r[0])}</th><td>${nsgEsc(r[1])}</td></tr>`).join("")+"</table>"
    +(kNote?`<p class="muted nsg-kn">${nsgEsc(kNote)}</p>`:"")
    +`<h3>最近 ${E.length} 則同步事件</h3>`+(E.length?'<div class="nsg-ev"><table><tr><th>時間</th><th></th><th>種類</th><th>序號</th><th>驗簽</th><th>結果</th></tr>'
    +E.map(e=>`<tr class="${e.why?"bad":""}"><td>${nsgHm(e.at)}</td><td>${e.d==="out"?"送":"收"}</td><td>${nsgEsc(NSG_T[e.t]||e.t)}</td><td>${e.sq==null?"—":"#"+e.sq}</td><td>${okTxt(e)}</td><td>${nsgEsc(why(e))}</td></tr>`).join("")+"</table></div>":'<p class="muted">還沒有。</p>');
  const text=["象棋千秋 連線除錯（匿名統計，不含金鑰、代號、名字）",new Date(now).toISOString()].concat(rows.filter(r=>r[2]!==false).map(r=>r[0]+"："+r[1]),["最近同步事件（新的在前）："],
    E.map(e=>`${nsgHm(e.at)} ${e.d==="out"?"送":"收"} ${NSG_T[e.t]||e.t} ${e.sq==null?"—":"#"+e.sq} ${okTxt(e)} ${why(e)}`)).join("\n");
  return{body,html:'<h2>📶 連線狀態</h2><div class="nsg-dbg-b">'+body+'</div><p class="nsg-cpw"><button type="button" class="btn ghost nsg-cp">📋 複製除錯資訊</button></p>',text}}
function nsgDbgData(){const N=window.XQNet;let D=null,tip="",K=null;try{D=N&&N.linkDebug?N.linkDebug():null;K=N&&N.keyInfo?N.keyInfo():null;tip=N?nsgView(N.latency(),N.peer(),N.syncInfo(),Date.now(),K).tip:""}catch(e){}return{D,tip,K}}
function nsgCopy(t){const ok=()=>{try{toast("已複製除錯資訊（不含金鑰、代號、名字）")}catch(e){}},old=()=>{try{const a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;left:-9999px;top:0";document.body.append(a);a.select();document.execCommand("copy");a.remove();ok()}catch(e){try{toast("這支手機不能複製")}catch(e2){}}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,old);else old()}catch(e){old()}}
function nsgDbgOpen(){try{if(NSG.dbg&&NSG.dbg.isConnected)return;nsgCss();const{D,tip,K}=nsgDbgData(),A=nsgDbgSpec(D,tip,Date.now(),K);
  const m=modal(A.html,[["關閉",()=>{NSG.dbg=null}]],"nsg-dbg");if(!m)return;NSG.dbg=m;
  const b=m.querySelector(".nsg-cp");if(b)b.onclick=()=>{const x=nsgDbgData();nsgCopy(nsgDbgSpec(x.D,x.tip,Date.now(),x.K).text)}}catch(e){}}
/* 卡片開著：每秒更新內文（離開對局頁就收掉） */
function nsgDbgTick(on){if(!NSG.dbg)return;if(!NSG.dbg.isConnected){NSG.dbg=null;return}if(!on){try{NSG.dbg.remove()}catch(e){}NSG.dbg=null;return}
  const b=NSG.dbg.querySelector(".nsg-dbg-b");if(b){const{D,tip,K}=nsgDbgData();b.innerHTML=nsgDbgSpec(D,tip,Date.now(),K).body}}
function nsgDo(k){const N=window.XQNet;if(!N)return;
  if(k==="wait"){NSG.hold=Date.now()+120000;return}
  if(k==="lobby"){NSG.hold=Date.now()+120000;location.hash="#/lobby";return}
  if(k==="draw"||k==="leave"){if(!N.peerAbort(k)){toast("對方剛好回來了，棋局繼續");return}if(k==="leave"){N.leave();location.hash="#/lobby"}}}
/* Android 三方實測 P2-1（11/13）：膠囊以前往上提 28px 壓在棋盤右下角那顆子的下半部，點偏下半部就點到膠囊（106 次走子有 9 次沒反應在那一帶）。
   改成放在棋盤下面那排名牌（#pBot）裡、時鐘的左邊，垂直置中；名字那欄留出膠囊的寬度（#view.nsg-on 的 --nsgw），名字太長就省略號，不會壓到。
   nsgPos 是純幾何（測試 tools/test-mp-p2.js）：e＝#nsg 的框（緊接在棋盤後面、高度 0）、p＝名牌列、c＝時鐘（沒有就 null）、w／h＝膠囊寬高 */
function nsgPos(e,p,c,w,h){const right=Math.max(6,Math.round(e.right-(c?c.left:p.right)+8)),top=Math.round((p.top-e.top)+Math.max(0,(p.height-h)/2));
  return{right,top,max:Math.max(48,Math.round((c?c.left:p.right)-p.left-56-8)),pad:Math.round(w+12)}}
function nsgPlace(el){try{const btn=el&&el.querySelector("button"),pb=el&&el.nextElementSibling,v=el&&el.parentElement;if(!btn||!v)return;
  if(!pb||pb.id!=="pBot"){["--nsgr","--nsgt","--nsgm"].forEach(k=>el.style.removeProperty(k));v.classList.remove("nsg-on");return}
  const ck=pb.querySelector(".clk"),r=nsgPos(el.getBoundingClientRect(),pb.getBoundingClientRect(),ck?ck.getBoundingClientRect():null,btn.offsetWidth||80,btn.offsetHeight||22);
  el.style.setProperty("--nsgr",r.right+"px");el.style.setProperty("--nsgt",r.top+"px");el.style.setProperty("--nsgm",r.max+"px");v.style.setProperty("--nsgw",r.pad+"px");v.classList.add("nsg-on")}catch(e){}}
function nsgCss(){if(document.getElementById("nsgCss"))return;const s=document.createElement("style");s.id="nsgCss";
  s.textContent="#nsg{position:relative;height:0;z-index:6}#nsg .nsg-p{position:absolute;right:var(--nsgr,6px);top:var(--nsgt,2px);display:flex;align-items:center;gap:5px;font:600 11px/1 system-ui,sans-serif;padding:4px 8px;min-height:22px;border-radius:11px;background:rgba(18,18,18,.62);color:#fff;border:0;cursor:pointer;max-width:var(--nsgm,calc(100% - 12px));white-space:nowrap;overflow:hidden}#view.nsg-on #pBot .nm{padding-right:var(--nsgw,0px)}"
    +"#nsg .nsg-b{display:inline-flex;align-items:flex-end;gap:1px;height:11px}#nsg .nsg-b i{display:block;width:3px;border-radius:1px;background:rgba(255,255,255,.28)}"
    +"#nsg .l4 i.on,#nsg .l3 i.on{background:#4ade80}#nsg .l2 i.on{background:#facc15}#nsg .l1 i.on{background:#fb923c}"
    +".nsg-dbg .box{max-width:440px;text-align:left}.nsg-dbg h2{text-align:center}.nsg-dbg h3{font-size:13px;margin:10px 0 4px}.nsg-dbg table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.4}"
    +".nsg-dbg th,.nsg-dbg td{padding:3px 4px;border-top:1px solid rgba(127,127,127,.22);vertical-align:top;text-align:left;font-weight:400}.nsg-kv th{white-space:nowrap;opacity:.75;width:6.5em}"
    +".nsg-ev{max-height:34vh;overflow:auto;-webkit-overflow-scrolling:touch}.nsg-ev th{opacity:.7;position:sticky;top:0;background:inherit}.nsg-ev td{font-variant-numeric:tabular-nums;word-break:break-all}.nsg-ev tr.bad td{color:#dc2626}"
    +".nsg-cpw{text-align:center;margin:10px 0 0}.nsg-dbg tr.nsg-fp td{font:700 14px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em}.nsg-dbg .nsg-kn{font-size:12px;line-height:1.5;margin:8px 0 0}";
  document.head.append(s)}
/* 第 14 輪 F2：邀請的金鑰跟上次對局不一樣＝提醒一下（照樣可以接受）；擋下可疑的邀請／接受＝提醒（30 秒內最多一次，免得被灌訊息時一直跳） */
const nsgInvTxt=x=>`🔑⚠ ${String((x&&x.from&&(typeof lbnShow==="function"?lbnShow(x.from):x.from.name))||"對方").slice(0,16)} 的手機金鑰跟上次對局不一樣（換手機、重裝 App 也會這樣）。不確定是不是本人，開局後點訊號膠囊比對指紋。`;
const nsgBadTxt=e=>`🔑 擋下一則可疑的${e&&e.type==="accept"?"接受":"邀請"}：${String(e&&e.why||"")}`;
function nsgKeyHook(N){if(NSG.inv||!N||!N.on)return;NSG.inv=true;
  N.on("invite",x=>{try{if(x&&x.ks==="changed")toast(nsgInvTxt(x))}catch(e){}});
  N.on("keybad",e=>{try{const t=Date.now();if(t-NSG.kbAt<30000)return;NSG.kbAt=t;toast(nsgBadTxt(e))}catch(err){}})}
function nsgTick(){try{nsgKeyHook(window.XQNet);const N=window.XQNet,on=/^#\/pvp(\/|$)/.test(location.hash||"")&&N&&N.latency&&N.peer&&N.active()&&!!N.side();
  const bb=on?document.querySelector("#view #bbox"):null;nsgDbgTick(!!bb);if(!bb){if(NSG.el){NSG.el.remove();NSG.el=null}try{document.querySelectorAll(".nsg-on").forEach(x=>x.classList.remove("nsg-on"))}catch(e){}nsgBoxOff();return}
  if(!NSG.el||!NSG.el.isConnected||NSG.el.previousElementSibling!==bb){if(NSG.el)NSG.el.remove();nsgCss();const d=document.createElement("div");d.id="nsg";
    d.innerHTML='<button type="button" class="nsg-p" aria-label="連線狀態"><span class="nsg-b"><i style="height:3px"></i><i style="height:5px"></i><i style="height:8px"></i><i style="height:11px"></i></span><span class="nsg-t"></span></button>';
    const btn=d.querySelector("button"),lpOff=()=>{clearTimeout(NSG.lp);NSG.lp=null};   /* 評比第 13 輪 X2：點一下或長按＝連線狀態小卡 */
    btn.onclick=()=>{if(NSG.lpOn){NSG.lpOn=false;return}nsgDbgOpen()};
    btn.addEventListener("pointerdown",()=>{lpOff();NSG.lpOn=false;NSG.lp=setTimeout(()=>{NSG.lp=null;NSG.lpOn=true;nsgDbgOpen()},550)});
    ["pointerup","pointerleave","pointercancel"].forEach(t=>btn.addEventListener(t,lpOff));btn.addEventListener("contextmenu",e=>e.preventDefault());bb.after(d);NSG.el=d}
  const P=N.peer(),V=nsgView(N.latency(),P,N.syncInfo(),Date.now(),N.keyInfo?N.keyInfo():null),k=V.bars+"|"+V.txt;
  if(k!==NSG.last){NSG.last=k;const p=NSG.el.querySelector(".nsg-b");p.className="nsg-b l"+V.lv;p.querySelectorAll("i").forEach((x,i)=>x.classList.toggle("on",V.bars!=null&&i<V.bars));
    NSG.el.querySelector(".nsg-t").textContent=V.txt;NSG.el.querySelector("button").setAttribute("aria-label","連線狀態："+V.tip+"點一下看詳細。")}
  nsgPlace(NSG.el);
  if(P&&P.st==="gone"){if(!NSG.box&&!document.hidden&&Date.now()>NSG.hold){const A=nsgAskSpec(P);NSG.box=modal(A.html,A.opts.map((o,i)=>[o.label,()=>{NSG.box=null;nsgDo(o.k)},i?true:false]),"nsg-ask")||{remove(){}}}}
  else nsgBoxOff(P&&P.st==="ok")}catch(e){}}
/* 對方回來了（或離開這頁）：還開著的「對方沒有回應」視窗收掉 */
function nsgBoxOff(back){if(NSG.box){try{NSG.box.remove()}catch(e){}NSG.box=null;if(back)try{toast("對方回來了，棋局繼續")}catch(e){}}}
setInterval(nsgTick,1000);
