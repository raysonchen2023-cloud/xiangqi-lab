/* ================= 🛡 線上大廳：檢舉、封鎖（回饋 841，開發者 11/9 選：大廳檢舉封鎖）＋兒童模式名字用稱號（回饋 842） =================
   背景：準備上架 App Store。App Review 規定 1.2（讓陌生人互動的 App）要能「檢舉」和「封鎖」；小朋友自取的名字最好不要給陌生人看到。
   回饋 841 檢舉：棋友資料卡 oppCard（大廳名冊、燈籠、對戰卡、觀戰名單、對局中點對手、觀戰時點雙方、棋譜裡點對手，全部開這一張）最下面加「🚩 檢舉」「🚫 封鎖」。
     檢舉：選原因（不當名字、騷擾、作弊、其他）＋可寫補充 → 照意見回饋的 sendRecord（postForm 送到開發者的 Google 表單；沒網路先排隊、之後補送）送一列，
     種類「🚩 檢舉」，內容寫對方 ID、名字、原因、在哪裡、時間、對局代號、他最近的聊天；同一個人 30 分鐘內不重複送（m_lbRep）。
   回饋 841 封鎖：名單存在這支手機（m_lbBlock，不跟存檔格走）。src/net.js 讀 window.XQ_BLOCKED：people() 藏起來（名冊、燈籠、觀戰清單）、
     邀請自動婉拒、隨機配對跳過、對局中他的表情和聊天不顯示；02-shell.js 熟面孔也不列。邀請視窗多一顆「🚫 婉拒並封鎖」（lbsInviteBtn）。
     「我封鎖的人」在設定「角色」分頁的「🛡 線上大廳」段（#lbSafe，lbsSetInject 插在「我的角色」卡後面）看、解除。
   回饋 842 稱號：App 沒有年齡資料，照開發者給的預設做——xq_pubNm＝"t"（稱號）／"n"（我取的名字）；
     新玩家預設稱號（00-util.js 在一開始判斷「沒有任何存檔、也沒取名字」），舊玩家沒有這個鍵＝照舊顯示自己取的名字；
     net.js 對外的名字問 window.XQ_PUBNAME；稱號存在 xq_pubTitle（地名 24 × 身分 24＝576 組，不重複），挑的時候避開線上已經有人用的名字。
     從「稱號」改成「我取的名字」要過家長算術題（lbsParentGate）。存檔裡的名字（xq_me）完全不動，自己畫面照常顯示自己的名字。前綴 lbs */
const LBS_REASONS=[["name","不當名字","名字有髒話、罵人，或不適合小朋友"],["harass","騷擾","聊天讓人不舒服、一直纏著邀請"],["cheat","作弊","好像用電腦軟體幫忙下棋"],["other","其他","其他想讓開發者知道的事"]];
const LBS_REP_GAP=30*60000;
const LBS_PLACE=["長安","洛陽","咸陽","汴京","臨安","金陵","大都","燕京","成都","揚州","姑蘇","錢塘","敦煌","廣陵","會稽","建康","江陵","襄陽","晉陽","鄴城","涼州","番禺","泉州","桂林"];
const LBS_ROLE=["小棋童","小棋生","小棋士","小棋客","小國手","小書生","小秀才","小舉人","小進士","小探花","小狀元","小學士","小翰林","小軍師","小謀士","小將軍","小校尉","小俠客","小遊俠","小琴童","小書僮","小雅士","小隱士","小行者"];
const lbsLs={get(k,d){try{const v=localStorage.getItem("xq_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("xq_"+k,JSON.stringify(v))}catch(e){}}};

/* ---------- 回饋 841：封鎖名單 ---------- */
let LBS_SET=null;
function lbsList(){const L=store.get("lbBlock",[]);return Array.isArray(L)?L.filter(x=>x&&x.id):[]}
function lbsSetOf(){if(!LBS_SET)LBS_SET=new Set(lbsList().map(x=>String(x.id)));return LBS_SET}
window.XQ_BLOCKED=id=>!!id&&(lbsSetOf().has(String(id))||lbsBanned(id));   /* 回饋 852：停權名單上的人也當成已封鎖 */

/* ---------- 回饋 852（停權名單）：開發者用 tools/ban.js 改 data/banlist.json 再發布（只有開發者能 push，所以不用另外簽名）。
   11/17 iMac G P3-1→P2（準則 5.1.1／5.1.2）：不再一開 App 就抓。只在進到用得到名單的連線功能（#/lobby、#/join、#/cup、#/coop/lobby、#/watch 對人）時抓，
   同一次開 App 只抓一次（抓失敗 1 分鐘後下次進大廳再試）；兒童模式或家長關掉線上大廳（fmNetOff）時不抓。fetch 用 no-store；網址帶 ?pre=1，src/sw.js 才不會攔下來拿舊的快取（sw.js 一般 json 是先看快取）。
   抓到存在 xq_banList，離線時用上次的。名單上的別人＝已封鎖（XQ_BLOCKED）；自己在名單上（XQ_SELFBANNED）：大廳只顯示說明，src/net.js 不公開在線狀態、不能邀請配對報名 ---------- */
const LBS_BAN_GAP=60000;
let LBS_BANC=null;
function lbsBanIds(){if(LBS_BANC)return LBS_BANC;const B=lbsLs.get("banList",null);LBS_BANC=B&&B.ids&&typeof B.ids==="object"?B.ids:{};return LBS_BANC}
function lbsBanned(id){return!!id&&Object.prototype.hasOwnProperty.call(lbsBanIds(),String(id))}
window.XQ_BANNED=id=>lbsBanned(id);
window.XQ_SELFBANNED=()=>{try{return lbsBanned(meInfo().id)}catch(e){return false}};
let LBS_BAN_P=null,LBS_BAN_OK=false,LBS_BAN_TRY=0;
function lbsNetQuiet(){try{return typeof fmNetOff==="function"&&!!fmNetOff()}catch(e){return false}}   /* 兒童模式或家長關掉線上大廳：停權名單、修正清單都不抓 */
function lbsBanFetch(){if(LBS_BAN_P)return LBS_BAN_P;if(LBS_BAN_OK||lbsNetQuiet()||Date.now()-LBS_BAN_TRY<LBS_BAN_GAP)return Promise.resolve(false);LBS_BAN_TRY=Date.now();lbsLs.set("banAt",Date.now());
  LBS_BAN_P=fetch("data/banlist.json?pre=1&t="+Math.floor(Date.now()/60000),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{if(!j||typeof j.ids!=="object"||!j.ids)return false;
    const old=JSON.stringify(lbsBanIds());LBS_BAN_OK=true;lbsLs.set("banList",{v:j.v||1,at:j.at||"",ids:j.ids,got:Date.now()});LBS_BANC=null;if(JSON.stringify(j.ids)!==old)lbsPing();return true}).catch(()=>false).finally(()=>{LBS_BAN_P=null});return LBS_BAN_P}
const LBS_BAN_RT=/^#\/(lobby|join|cup|coop\/lobby|watch(?!\/ai))(\/|\?|$)/;   /* 用到停權名單的連線功能 */
function lbsBanRoute(){try{if(OFF&&LBS_BAN_RT.test(location.hash||""))lbsBanFetch()}catch(e){}}
try{addEventListener("hashchange",lbsBanRoute);setTimeout(lbsBanRoute,1200)}catch(e){}   /* 直接用 #/lobby 網址開 App 也算進大廳 */
/* 改了名單：重送一次自己的在線狀態，伺服器回傳那一則時大廳就會重畫（net.js 收到 u/ 會發 people） */
function lbsPing(){LBS_SET=null;try{if(window.XQNet&&XQNet.refresh)XQNet.refresh()}catch(e){}try{window.dispatchEvent(new CustomEvent("xq-block"))}catch(e){}}
function lbsBlock(p){if(!p||!p.id)return;const L=lbsList().filter(x=>x.id!==p.id);L.push({id:String(p.id),name:String(p.name||"棋友").slice(0,16),at:Date.now()});store.set("lbBlock",L.slice(-300));lbsPing();toast(`🚫 已封鎖 ${lbnShow(p)||"這位棋友"}`)}
function lbsUnblock(id){const L=lbsList(),x=L.find(q=>q.id===id);store.set("lbBlock",L.filter(q=>q.id!==id));lbsPing();toast(`已解除封鎖${x&&x.name?" "+lbnShow(x):""}`)}
function lbsInGameWith(id){try{const G=window.XQNet&&XQNet.game&&XQNet.game();return!!(G&&!G.result&&G.red&&G.black&&(G.red.id===id||G.black.id===id))}catch(e){return false}}
function lbsBlockAsk(p,after){if(!p||!p.id)return;const ing=lbsInGameWith(p.id)&&XQNet.side&&XQNet.side();
  modal(`<div class="em">🚫</div><h2>封鎖 ${esc(lbnShow(p)||"這位棋友")}？</h2><div style="text-align:left;line-height:1.8;font-size:14.5px;margin:6px 0">封鎖以後，在這支手機上：<br>・他不會出現在名冊和大廳燈籠裡<br>・他送來的邀請會自動婉拒<br>・隨機配對會避開他<br>・對局中不顯示他的表情和聊天</div>
    <p class="muted" style="font-size:13px;margin:4px 0">他不會收到通知。${ing?"這盤棋還會繼續；不想下了可以認輸離開。":""}隨時可以到「設定 → 角色 → 🛡 線上大廳」解除。</p>`,
    [["封鎖",()=>{lbsBlock(p);after&&after()}],["取消",null,true]])}
/* 邀請視窗（02-shell.js）多的那一顆 */
function lbsInviteBtn(x){return["🚫 婉拒並封鎖",()=>{try{XQNet.respond(x,false)}catch(e){}lbsBlockAsk({id:x.from&&x.from.id,name:x.from&&x.from.name})},true]}

/* ---------- 檢舉追蹤編號（評審「互動安全與營運閉環」：檢舉要分排隊、送出、處理，給可追查的編號） ----------
   編號 R-月日-四碼（例 R-1111-7K3Q）：四碼從 LBS_RID_ABC 抽（去掉 0 O 1 I L，好念好抄），不含任何個資；送出時寫在表單「內容」最前面「[R-1111-7K3Q] 🚩 檢舉線上玩家…」，表單結構不動。
   手機自己存「我的檢舉」（m_lbRepMine，最多 100 筆；只存編號、時間、畫面上顯示的名字、狀態，不存原因、聊天、對方 ID）：
     q 📮 排隊中＝還沒送出（在 fbQueue 排隊，開 App、恢復連線時 flushFeedback 補送）
     sent ✅ 已從手機送出＝postForm 送出去了（sendBeacon／no-cors 只能確定手機送出；Google 表單不回收件確認，所以不說「已收到」）
     seen 👀 開發者已收到、done 🛠 已處理＝開發者在回饋表標了（「開發者決定」核准＝seen；「已修復」打勾或「不處理」＝done），
       tools/fixes-export.snippet.js 匯出到 fixes.json 的 reports：{"R-1111-7K3Q":{"s":"done","at":"11/12"}}（只有編號和狀態，看不出誰檢舉誰），發布後手機讀到就改狀態
     lost ⚠ 沒送出＝待送的太多（fbQueue 只留 30 筆）被擠掉了，老實講。
   沒網路時 sendBeacon 也會回 true（瀏覽器說「排進去了」但其實送不出），所以帶 rid 的那筆在 navigator.onLine===false 時先丟錯，讓 sendRecord 放進 fbQueue。
   這一段到「檢舉追蹤編號：以上」為止只用 store、navigator、crypto，xiangqi-lab/tools/test-report-id.js 直接切出來測 */
const LBS_RID_ABC="23456789ABCDEFGHJKMNPQRSTUVWXYZ",LBS_RID_RE=/^R-\d{4}-[2-9A-HJKMNP-Z]{4}$/,LBS_MINE_MAX=100;
function lbsRidNew(d,rnd){d=d||new Date();const p=n=>String(n).padStart(2,"0");
  const r=rnd||(()=>{try{const a=new Uint8Array(1);for(let k=0;k<64;k++){crypto.getRandomValues(a);if(a[0]<248)return a[0]%31}}catch(e){}return Math.floor(Math.random()*31)});
  let s="";for(let i=0;i<4;i++)s+=LBS_RID_ABC[((r()%31)+31)%31];return"R-"+p(d.getMonth()+1)+p(d.getDate())+"-"+s}
function lbsMine(){const L=store.get("lbRepMine",[]);return Array.isArray(L)?L.filter(x=>x&&typeof x.rid==="string"&&x.rid):[]}
function lbsMineSave(L){store.set("lbRepMine",L.slice(-LBS_MINE_MAX))}
function lbsMineRid(d){const have=new Set(lbsMine().map(x=>x.rid));let r=lbsRidNew(d);for(let k=0;k<20&&have.has(r);k++)r=lbsRidNew(d);return r}
function lbsMineAdd(rid,name,now){const L=lbsMine().filter(x=>x.rid!==rid);L.push({rid,at:now||Date.now(),name:String(name||"棋友").slice(0,16),st:"q"});lbsMineSave(L)}
function lbsMineSet(rid,st,now){const L=lbsMine(),x=L.find(q=>q.rid===rid);if(!x)return false;if(x.st!==st){x.st=st;if(st==="sent")x.sentAt=now||Date.now()}lbsMineSave(L);return true}
/* 看清單時對一次待送佇列：排隊中、佇列裡卻找不到（超過 2 分鐘，不是正在送）＝被擠掉了；又出現在佇列裡就改回排隊中 */
function lbsMineSync(queue,now){now=now||Date.now();const Q=new Set((Array.isArray(queue)?queue:[]).map(r=>r&&r.rid).filter(Boolean)),L=lbsMine();let ch=false;
  for(const x of L){if(x.st!=="sent"&&x.st!=="lost"&&!Q.has(x.rid)&&now-(+x.at||0)>12e4){x.st="lost";ch=true}else if(x.st==="lost"&&Q.has(x.rid)){x.st="q";ch=true}}
  if(ch)lbsMineSave(L);return L}
/* fixes.json 的 reports（也接受直接寫 "done"）；回傳這次新變成「已處理」的編號 */
function lbsMineApply(reports){const R=reports&&typeof reports==="object"&&!Array.isArray(reports)?reports:{},L=lbsMine(),news=[];let ch=false;
  for(const x of L){const v=Object.prototype.hasOwnProperty.call(R,x.rid)?R[x.rid]:null;if(!v)continue;const s=typeof v==="string"?v:v.s,at=v&&typeof v==="object"&&v.at?String(v.at).slice(0,20):"";
    if(s!=="done"&&s!=="seen")continue;if(x.dn!==s||(at&&x.dnAt!==at)){if(s==="done"&&x.dn!=="done")news.push(x.rid);x.dn=s;if(at)x.dnAt=at;ch=true}}
  if(ch)lbsMineSave(L);return news}
function lbsMineState(x){return!x?"q":x.dn==="done"?"done":x.dn==="seen"?"seen":x.st==="sent"?"sent":x.st==="lost"?"lost":"q"}
const LBS_ST={q:["📮","排隊中","還沒送出，有網路會自動補送"],sent:["✅","已從手機送出","手機已把檢舉送出去；開發者處理好會在這裡標「🛠 已處理」"],seen:["👀","開發者已收到","開發者看到了，正在處理"],done:["🛠","已處理","開發者看過並處理了"],lost:["⚠","沒送出","手機裡待送的東西太多被擠掉了，需要的話請再檢舉一次"]};
if(typeof postForm==="function"){const f0=postForm;postForm=async function(rec){if(rec&&rec.rid&&typeof navigator!=="undefined"&&navigator.onLine===false)throw new Error("沒有網路");
  const r=await f0.apply(this,arguments);if(rec&&rec.rid)try{lbsMineSet(rec.rid,"sent")}catch(e){}return r}}
/* ---------- 檢舉追蹤編號：以上 ---------- */
let LBS_MINE_AT=0,LBS_MINE_P=null;
function lbsMineFetch(force){if(LBS_MINE_P)return LBS_MINE_P;if(lbsNetQuiet()||(!force&&!xqfbSent()))return Promise.resolve([]);if(!force&&Date.now()-LBS_MINE_AT<10*60000)return Promise.resolve([]);if(!lbsMine().some(x=>{const k=lbsMineState(x);return k==="sent"||k==="seen"||k==="q"}))return Promise.resolve([]);LBS_MINE_AT=Date.now();
  LBS_MINE_P=fetch("data/fixes.json?v="+encodeURIComponent(window.XQ_BUILD||"")).then(r=>r.ok?r.json():null).then(j=>j&&j.reports?lbsMineApply(j.reports):[]).catch(()=>[]).finally(()=>{LBS_MINE_P=null});return LBS_MINE_P}
setTimeout(()=>{try{if(OFF)lbsMineFetch().then(n=>{if(n&&n.length)toast(`🛠 你的檢舉 ${n[0]}${n.length>1?` 等 ${n.length} 筆`:""} 開發者已處理了`)})}catch(e){}},9000);
function lbsMineWhen(t){try{return new Date(+t||Date.now()).toLocaleString("zh-TW",{hour12:false,month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch(e){return""}}
function lbsMineSheet(){lbsCss();sheet("🚩 我的檢舉",b=>{const paint=()=>{const L=lbsMineSync(store.get("fbQueue",[])).slice().reverse();
    b.innerHTML=`<p style="margin:0 0 6px;font-size:14px;line-height:1.7">每一筆檢舉都有一個編號。<b>如果要詢問進度，告訴開發者這個編號。</b></p>
      <p class="muted" style="margin:0 0 10px;font-size:12.5px;line-height:1.7">📮 排隊中 → ✅ 已從手機送出 → 🛠 已處理。「已從手機送出」只代表手機送出去了（表單不會回收件確認）；開發者處理好、App 抓到新的處理紀錄以後，才會標「🛠 已處理」。這份清單只存在這支手機，只記編號、時間、對象名字和狀態。</p>`+
      (L.length?L.map(x=>{const k=lbsMineState(x),S=LBS_ST[k];return`<div class="card lbs-mi"><div class="lbs-mi-h"><b class="lbs-rid">${esc(x.rid)}</b><span class="lbs-st lbs-st-${k}">${S[0]} ${S[1]}</span></div>
        <div class="muted" style="font-size:13px">檢舉 ${esc(lbnShow("",x.name)||"棋友")}・${esc(lbsMineWhen(x.at))}${k==="done"&&x.dnAt?"・"+esc(x.dnAt)+" 處理":""}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${S[2]}</div></div>`}).join("")
        :'<div class="card muted" style="text-align:center">還沒有檢舉過任何人</div>')};
  paint();lbsMineFetch(true).then(()=>{if(b.isConnected)paint()})})}

/* ---------- 回饋 841：檢舉 ---------- */
function lbsWhere(id){let s="";try{const G=XQNet.game&&XQNet.game();if(G&&G.red&&G.black&&(G.red.id===id||G.black.id===id))s=(XQNet.side&&XQNet.side()?"對局中（他是我的對手）":"觀戰中（他在下這盤）")+"・對局代號 "+(G.gid||"")+"・第 "+(G.moves?G.moves.length:0)+" 步"}catch(e){}
  const h=location.hash||"#/";return(s||(/^#\/lobby/.test(h)?"線上大廳":/^#\/watch/.test(h)?"觀戰列表":/^#\/db/.test(h)?"棋譜":"其他頁"))+"（"+h+"）"}
function lbsReport(p){if(!p||!p.id)return;const R=store.get("lbRep",{})||{},last=+R[p.id]||0;
  if(Date.now()-last<LBS_REP_GAP)return toast(`${Math.max(1,Math.round((Date.now()-last)/60000))} 分鐘前已經檢舉過 ${lbnShow(p)||"他"}，不用再送；編號和狀態在「🛡 線上大廳 → 🚩 我的檢舉」`);   /* 檢舉追蹤編號：原本說「報告已經記在手機裡」，現在手機真的有一份「我的檢舉」（編號、狀態） */
  sheet("🚩 檢舉",b=>{let why="";
    b.innerHTML=`<p style="margin:0 0 8px">檢舉 <b>${esc(lbnShow(p)||"棋友")}</b></p><p class="muted" style="font-size:13px;margin:0 0 10px">開發者會收到他的代號、名字和你選的原因。他不會知道是誰檢舉的。送出後會給你一個檢舉編號。</p>
      <div class="items lbs-why" style="padding:0">${LBS_REASONS.map(([k,t,h])=>`<button class="item" data-why="${k}"><span class="lb">⚪</span><span class="tx"><b>${t}</b><span>${h}</span></span></button>`).join("")}</div>
      <textarea id="lbsTx" maxlength="300" rows="3" placeholder="想多說一點可以寫在這裡（可以不寫）" style="width:100%;box-sizing:border-box;margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:inherit;font:inherit"></textarea>
      <label class="row" style="gap:8px;margin:8px 0 12px;align-items:center"><input type="checkbox" id="lbsAlso"${window.XQ_BLOCKED(p.id)?" checked disabled":""}><span>同時封鎖他</span></label>
      <button class="btn" id="lbsGo" disabled>送出檢舉</button>`;
    b.querySelectorAll("[data-why]").forEach(x=>x.onclick=()=>{vibrate(5);why=x.dataset.why;b.querySelectorAll("[data-why]").forEach(y=>{const on=y===x;y.classList.toggle("on",on);y.querySelector(".lb").textContent=on?"🔘":"⚪"});b.querySelector("#lbsGo").disabled=false});
    b.querySelector("#lbsGo").onclick=async e=>{if(!why)return toast("請先選一個原因");const R2=store.get("lbRep",{})||{};if(Date.now()-(+R2[p.id]||0)<LBS_REP_GAP){closeSheet();return toast("剛剛已經送過了")}
      e.target.disabled=true;e.target.textContent="送出中…";
      const W=LBS_REASONS.find(x=>x[0]===why),note=b.querySelector("#lbsTx").value.trim(),also=b.querySelector("#lbsAlso").checked&&!window.XQ_BLOCKED(p.id);
      let live=p.info||null;try{if(!live)live=(store.get("oppSnap",{})||{})[p.id]||null}catch(e){}
      let chat=[];try{chat=XQNet.chatOf?XQNet.chatOf(p.id).slice(-5).map(x=>x.text?"「"+x.text+"」":"〔快捷語〕"+(((typeof EMOTES!=="undefined"?EMOTES:[]).find(q=>q[0]===x.e)||[])[2]||x.e)):[]}catch(e){}   /* 回饋 850：快捷語（表情代號）也寫成原句 */   /* chatOf：這盤收到他的聊天（封鎖了也拿得到，給開發者當證據） */
      const d=new Date();let tw="";try{tw=d.toLocaleString("zh-TW",{hour12:false,timeZone:"Asia/Taipei"})}catch(e){tw=d.toLocaleString()}
      const rid=lbsMineRid(d);   /* 檢舉追蹤編號：寫在「內容」最前面 [R-1111-7K3Q]，表單結構不動 */
      const text=["["+rid+"] 🚩 檢舉線上玩家",`被檢舉的人：${p.name||"（沒有名字）"}${lbnShow(p)!==String(p.name||"")?"（畫面上顯示成「"+lbnShow(p)+"」）":""}`,`對方 ID：${p.id}`,`原因：${W?W[1]:why}`,note?`補充：${note}`:"",`在哪裡：${lbsWhere(p.id)}`,`時間：${tw}（臺灣時間）／${d.toISOString()}`,
        live&&live.pts!=null&&window.XQNet&&XQNet.rankOf?`對方資料：${XQNet.rankOf(live.pts)} ${live.pts} 分${live.city?"・"+live.city:""}${live.kind?"・"+live.kind:""}`:"",
        chat.length?"對方最近的聊天：\n"+chat.join("\n"):"",also?"（檢舉的人同時封鎖了他）":""].filter(Boolean).join("\n");
      lbsMineAdd(rid,lbnShow(p),Date.now());   /* R05：「我的檢舉」只存畫面上顯示的名字（不合格的、兒童在看的都是稱號） */
      let ok=false;try{const info=await feedbackInfo();ok=await sendRecord(Object.assign({},info,{type:"🚩 檢舉",text,contact:"",rid}))}catch(err){ok=false;try{lbsMineSet(rid,"lost")}catch(e){}}   /* rid 不在 FEEDBACK_FORM.entries 裡，postForm 不會送出這一格，只拿來在 fbQueue 裡認出是哪一筆 */
      let st=ok?"sent":"q";try{if(!ok)st=lbsMineState(lbsMine().find(x=>x.rid===rid))}catch(e){}   /* W158①：回條照「我的檢舉」的實際狀態講；沒送出（lost）不記 30 分鐘防重複，讓他可以馬上再檢舉一次 */
      if(st!=="lost"){const R3=store.get("lbRep",{})||{};R3[p.id]=Date.now();for(const k in R3)if(Date.now()-R3[k]>864e5)delete R3[k];store.set("lbRep",R3)}
      closeSheet();if(also)lbsBlock(p);setTimeout(()=>lbsReportDone(rid,st),280)}})}   /* 開發者 11/11 選 ChatGPT UI-13、大廳規劃書案 01：表單送不回收件確認，所以只說「從手機送出」，不說「已收到」；沒網路時真的排在手機裡（fbQueue，開 App、恢復連線時補送） */
/* 送出後的回條：給編號、說現在是排隊中還是已從手機送出 */
function lbsReportDone(rid,st){lbsCss();st=st===true?"sent":st==="sent"||st==="lost"?st:"q";   /* W158①：st＝sent／q／lost（舊呼叫傳 true／false 也接） */
  modal(`<div class="em">🚩</div><h2 style="margin-bottom:4px">檢舉編號</h2><div class="lbs-rid" style="font-size:24px;font-weight:900;margin:0 0 8px">${esc(rid)}</div>
    <p style="text-align:left;line-height:1.75;font-size:14.5px;margin:6px 0">${st==="sent"?"✅ <b>已從手機送出</b>：手機已把檢舉送出去。開發者處理好以後，「🚩 我的檢舉」會標成「🛠 已處理」。":st==="lost"?"⚠ <b>沒送出</b>：這筆檢舉沒有送出去，也沒有排進待送清單，請再檢舉一次。":"📮 <b>還沒送出</b>：現在送不出去，檢舉先存在這支手機，連上網路會自動再試。送出後，「🚩 我的檢舉」會更新狀態。"}</p>
    <p class="muted" style="font-size:13px;margin:4px 0">如果要詢問進度，告訴開發者這個編號。對方不會知道是誰檢舉的。</p>`,[["知道了",null],["看我的檢舉",()=>lbsMineSheet(),true]])}

/* ---------- 回饋 841：資料卡加按鈕（包一層 oppCard；07x3-rostermap.js 的名帖外觀也包在裡面） ---------- */
function lbsCss(){if(document.getElementById("lbsCss"))return;const s=document.createElement("style");s.id="lbsCss";
  s.textContent=`.lbs-row{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin:12px 0 2px;padding-top:10px;border-top:1px dashed var(--line)}
.lbs-row button{font:inherit;font-size:14px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:inherit;cursor:pointer}
.lbs-row button[data-lbs="blk"]{color:var(--red,#b3261e)}.lbs-row .muted{font-size:13px}
/* 11/17 iMac 測試員 G-1（準則 1.2，P1）：名帖在深色底上時「🚩 檢舉」字色 rgb(30,19,12) 疊在底色 rgb(31,26,21)，只看得到一面小旗子，審查員會以為沒有檢舉 →
   三顆鈕一律用自己的深底淺字＋框線，不管名帖是淺色還是深色都看得清楚（對比都在 9:1 以上）；高度 44（網頁版同一支程式，一起修） */
#sheet .lbs-row button[data-lbs],.lbs-row button[data-lbs]{min-height:44px;font-size:15px!important;font-weight:700;padding:8px 16px;border-radius:999px;border:2px solid #E2B13C!important;background:#7A1E14!important;color:#FFF4E0!important;opacity:1!important}
#sheet .lbs-row button[data-lbs="blk"],#sheet .lbs-row button[data-lbs="un"],.lbs-row button[data-lbs="blk"],.lbs-row button[data-lbs="un"]{border-color:#D9CDB8!important;background:#2E2721!important;color:#FFF4E0!important}
#sheet .lbs-row .muted,.lbs-row .muted{color:inherit!important;opacity:.9}
.lbs-why .item.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--card))}
.lbs-bl{display:flex;align-items:center;gap:10px;margin-bottom:8px}.lbs-bl b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lbSafe .opt button{flex:1;min-width:0}
#lbSafe #lbsNm button{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:9px 6px;font-size:clamp(12px,4.2vw,15px)}
#lbSafe .lbs-tp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 6px}#lbSafe .lbs-tp1{margin:0 0 8px}
#lbSafe .lbs-tp button,#lbSafe .lbs-tp1 button{font:inherit;font-size:min(17px,4.4vw);font-weight:700;padding:10px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbs-rid{font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;-webkit-user-select:text;user-select:text}
.lbs-mi{margin-bottom:8px}.lbs-mi-h{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px}
.lbs-st{font-size:13px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--line);white-space:nowrap}
.lbs-st-done{background:color-mix(in srgb,var(--accent) 18%,var(--card))}.lbs-st-lost{color:var(--red,#b3261e)}
.lbs-in{text-align:left;font-size:14.5px;line-height:1.7;margin:6px 0}.lbs-in p{margin:0 0 8px}`;document.head.append(s)}
function lbsCardRow(oid,name){if(!oid||!window.XQNet)return;let mid="";try{mid=XQNet.me().id}catch(e){}if(oid===mid)return;
  const b=document.querySelector("#sheet .sh-b");if(!b||b.querySelector(".lbs-row"))return;lbsCss();
  let nm=name||"";if(!nm){try{const s=(store.get("oppSnap",{})||{})[oid];nm=s&&s.name||""}catch(e){}}if(!nm){const h=b.querySelector("div[style*='font-size:22px']");nm=h?h.textContent.trim():"棋友"}
  let info=null;try{info=XQNet.people().find(x=>x.id===oid)||(store.get("oppSnap",{})||{})[oid]||null}catch(e){}
  const p={id:String(oid),name:nm,info},row=document.createElement("div");row.className="lbs-row";
  const paint=()=>{if(lbsBanned(p.id)){row.innerHTML='<span class="muted">⛔ 這個帳號已被開發者停權</span>';return}   /* 回饋 852 */
    const bl=window.XQ_BLOCKED(p.id);row.innerHTML=bl?`<span class="muted">🚫 你封鎖了他</span><button type="button" data-lbs="un">解除封鎖</button><button type="button" data-lbs="rep">🚩 檢舉</button>`
      :`<button type="button" data-lbs="rep">🚩 檢舉</button><button type="button" data-lbs="blk">🚫 封鎖</button>`;
    row.querySelectorAll("[data-lbs]").forEach(x=>x.onclick=e=>{e.stopPropagation();vibrate(5);const k=x.dataset.lbs;
      if(k==="rep"){closeSheet();setTimeout(()=>lbsReport(p),240)}else if(k==="blk"){closeSheet();setTimeout(()=>lbsBlockAsk(p),240)}else{lbsUnblock(p.id);paint()}})};
  paint();b.append(row)}
if(typeof oppCard==="function"){const f0=oppCard;oppCard=function(oid,name){const r=f0.apply(this,arguments);try{lbsCardRow(oid,name)}catch(e){console.error(e)}return r}}

/* ---------- 回饋 842：線上大廳顯示稱號 ---------- */
const lbsMode=()=>lbsLs.get("pubNm","n")==="t"?"t":"n";
function lbsHash(s){let h=2166136261;for(const c of String(s||""))h=Math.imul(h^c.codePointAt(0),16777619)>>>0;return h}
const lbsTitleAt=i=>{const n=LBS_PLACE.length*LBS_ROLE.length;i=((i%n)+n)%n;return LBS_PLACE[i%LBS_PLACE.length]+LBS_ROLE[Math.floor(i/LBS_PLACE.length)%LBS_ROLE.length]};
/* 挑一個線上沒人用的稱號：從 start 開始，每次跳 97 格（576 組都會走到） */
function lbsPick(start){let used=new Set();try{if(window.XQNet&&XQNet.people)XQNet.people().forEach(p=>used.add(p.name))}catch(e){}
  for(let k=0;k<576;k++){const i=start+k*97,t=lbsTitleAt(i);if(!used.has(t))return{i:((i%576)+576)%576,t}}return{i:start%576,t:lbsTitleAt(start)}}
function lbsTitle(id){const T=lbsLs.get("pubTitle",null);if(T&&T.t)return T.t;const x=lbsPick(lbsHash(id||(window.meInfo?meInfo().id:"")));lbsLs.set("pubTitle",x);return x.t}
/* 11/13 開發者選：自己取的名字不合格（lbnBad：聯絡方式、冒充官方、不雅字…）也對外改送稱號，自己畫面照常；名字改合格就恢復送自己的名字。空白名字照舊（net.js 補「棋友＋代號」） */
function lbsSelfBad(nm){if(nm==null){try{nm=myName()}catch(e){nm=""}}nm=nm==null?"":String(nm);if(!nm)return"";try{return lbnBad(nm)}catch(e){return""}}
const lbsPubT=m=>lbsMode()==="t"||!!lbsSelfBad(m&&m.name!=null?m.name:null);
window.XQ_PUBNAME=m=>lbsPubT(m)?lbsTitle(m&&m.id):"";
/* 改名字（00-util setMyName）以後對外的名字變了：馬上重送在線狀態和戰績摘要；合格↔不合格換了就提示一次 */
if(typeof setMyName==="function"){const f0=setMyName;setMyName=function(n){let a="",b0=false;try{a=window.XQ_PUBNAME(meInfo())||myName();b0=!!lbsSelfBad()}catch(e){}const r=f0.apply(this,arguments);
  try{const b1=!!lbsSelfBad();if((window.XQ_PUBNAME(meInfo())||myName())!==a)lbsPubNow();if(b1!==b0&&lbsMode()!=="t")setTimeout(()=>toast(b1?`⚠ 這個名字不能在大廳顯示，別人看到的是稱號「${lbsTitle()}」`:`✍ 線上大廳恢復顯示「${myName()}」`),1800)}catch(e){}return r}}
/* 選稱號：給 3 個線上沒人用的讓玩家挑（11/13 開發者選），「換一組」再給 3 個；選定存在 xq_pubTitle。從 start 每次跳 97 格，avoid 裡的（剛才那一組、現在的稱號）不再給；
   先挑地名都不一樣的（也跟 avoid 的地名不同），挑不滿再放寬 */
function lbsTitleCands(n,avoid,start){avoid=avoid||[];const used=new Set(avoid);let me="";try{me=XQNet.me().id}catch(e){}
  try{if(window.XQNet&&XQNet.people)XQNet.people().forEach(p=>{if(p&&p.id!==me)used.add(p.name)})}catch(e){}
  const N=LBS_PLACE.length*LBS_ROLE.length,out=[],pl=new Set(avoid.map(t=>String(t).slice(0,2)));if(start==null)start=Math.floor(Math.random()*N);
  for(const strict of[true,false])for(let k=0;k<N&&out.length<n;k++){const i=(((start+k*97)%N)+N)%N,t=lbsTitleAt(i),p=LBS_PLACE[i%LBS_PLACE.length];
    if(used.has(t)||strict&&pl.has(p))continue;used.add(t);pl.add(p);out.push({i,t})}return out}
let LBS_TPC=null;
function lbsTpGroup(){const cur=lbsTitle();if(!LBS_TPC||!LBS_TPC.length)LBS_TPC=[{i:(lbsLs.get("pubTitle",null)||{}).i,t:cur}].concat(lbsTitleCands(2,[cur]));return LBS_TPC}
function lbsTpMore(){const av=(LBS_TPC||[]).map(x=>x.t).concat(lbsTitle());LBS_TPC=lbsTitleCands(3,av);if(LBS_TPC.length<3)LBS_TPC=lbsTitleCands(3,[lbsTitle()]);return LBS_TPC}
function lbsTpSet(k){const x=(LBS_TPC||[]).find(q=>q.t===k);if(!x||x.t===lbsTitle())return false;lbsLs.set("pubTitle",{i:x.i,t:x.t});lbsPubNow();toast(`🏮 線上大廳改成顯示稱號「${x.t}」`);return true}
/* 線上有人跟我的稱號一樣（很少見）：不在對局時換一個（隨機起點，兩個人同時換也不會又撞在一起） */
let LBS_RER=0;
if(window.XQNet&&XQNet.on)XQNet.on("people",()=>{if(!lbsPubT(window.meInfo?meInfo():null)||Date.now()-LBS_RER<60000)return;try{if(XQNet.active())return;const t=lbsTitle(),i=XQNet.me().id;
  if(!XQNet.people().some(p=>p.id!==i&&p.name===t))return;LBS_RER=Date.now();lbsLs.set("pubTitle",lbsPick(Math.floor(Math.random()*576)));XQNet.refresh();if(XQNet.pubProf)XQNet.pubProf()}catch(e){}});
function lbsPubNow(){try{if(window.XQNet){if(XQNet.refresh)XQNet.refresh();if(XQNet.pubProf)XQNet.pubProf()}}catch(e){}}
/* 家長確認：兩位數乘一位數 */
function lbsParentGate(ok){const a=12+Math.floor(Math.random()*8),b=3+Math.floor(Math.random()*6);
  const m=modal(`<div class="em">👨‍👩‍👧</div><h2>請家長確認</h2><p style="font-size:14.5px;line-height:1.7">改成「我取的名字」以後，線上大廳的陌生人會看到孩子自己取的名字。請家長算一下：</p>
    <div style="font-size:26px;font-weight:900;margin:6px 0">${a} × ${b} ＝ ？</div><input id="lbsAns" type="text" inputmode="numeric" autocomplete="off" maxlength="4" aria-label="答案" style="width:7em;font:inherit;font-size:20px;text-align:center;padding:8px;border:1.5px solid var(--line);border-radius:12px;background:var(--card);color:inherit">`,
    [["確定",()=>{const v=m&&m.querySelector("#lbsAns");if(v&&+String(v.value).replace(/[^\d]/g,"")===a*b)ok();else toast("答案不對，還是顯示稱號")}],["取消",null,true]]);
  setTimeout(()=>{const v=m&&m.querySelector("#lbsAns");if(v)try{v.focus()}catch(e){}},80)}
function lbsSetMode(k,after){if(k===lbsMode())return after&&after();
  const go=()=>{lbsLs.set("pubNm",k);lbsPubNow();toast(k==="t"?`🏮 線上大廳改成顯示稱號「${lbsTitle()}」`:`✍ 線上大廳改成顯示「${(window.myName&&myName())||"你取的名字"}」`);after&&after()};
  if(k==="n")lbsParentGate(go);else go()}

/* ---------- 紅藍隊 R05（威脅模型 I6）：名字安全顯示 ----------
   名字是玩家自己打的（最多 16 字），可以放聯絡方式、不雅字，或冒充「開發者公告」。這裡管「這支手機怎麼顯示別人的名字」；
   自己的名字不合格時（11/13 開發者選），上面的 XQ_PUBNAME 對外改送稱號（舊版 App 的棋友也看不到原名），自己畫面照常顯示自己取的名字，名字改合格就恢復。
   lbnBad(名字)：低誤傷規則，回傳原因代號（""＝沒問題）：
     len 超過 16 字（App 改名時就截成 16 字，超過的一定是改過的 App）、empty 空白或全是看不見的字、
     invis 控制字元、零寬字元、雙向文字控制（RLO 等）、韓文填充字等看不見的字（emoji 中間的 ZWJ 不算）、mark 三個以上疊在一起的組合符號、html 有 < >、
     url 網址、mail Email、digit 4 位以上數字（全形、圈圈數字先用 NFKC 變成半形；中文〇零一～九、大寫壹～玖；中間可以夾一個空白或 - . 之類），
     contact LINE、IG、FB、Discord、微信、加我、私訊等，imp 官方、公告、開發者、裁判、客服、系統、管理員、admin 等，rude 不雅字詞清單 LBN_BAD_WORDS（開發者可以直接增刪）。
     比對前先 NFKC、轉小寫；關鍵字另外拿掉空白和標點再比一次（「開 發 者」「L.I.N.E」一樣擋）。英文短字（line、ig、fb、admin）前面不能接英文字母，
     後面也不能接（line、ig、fb 後面接 id 例外），所以 Caroline、Tiger、Badminton 不會被擋。App 自己給的預設名字「棋友＋4 碼」不算 4 位數字。
   lbnPick(代號, 名字, {me, kid})：要顯示的名字。自己＝照原樣；名字本來就是系統稱號＝照原樣；兒童在看（kid）＝一律稱號；不合格＝稱號。
     稱號用代號算 lbsTitleAt(lbsHash(代號))，同一個人每次都一樣（跟他自己選稱號時的第一個候選相同）；沒有代號就用名字算。
   評比第 19 輪第 3 項（紅藍隊 R05-bypass、R05-wire）：
     繞過：lbnBad 用原樣比完，再用「變體」各比一次 contact、imp、rude（lbnAlt）——注音換成字（ㄍㄢˋ→幹、ㄌㄞˊ→賴，LBN_ZY）、
       數字和符號代字母（sh1t、a$$hole、4dmin、Adm1n；1 當 i 和 l 各試一次、大寫 I 當 l：Iine、1ine，lbnLeet）；一段英數裡字母少於 2 個或比數字符號少就不換（A55、F4、2B 不動）。
       諧音字、形近字、拆字不做整句代換（「上官芳」會變成「上官方」），只在詞表加詞組：淦你、干你娘、管里員、公吿、弓雖女干…；「賴」當 LINE 只擋賴我、賴 id、賴：、＋賴、我的賴（lbnLai），賴小明、信賴我不擋。
       字典不可能列完：沒列到的諧音還是會照原樣顯示，靠預設稱號、檢舉、封鎖補。
     送出端：src/net.js 對外送名字前（自己的名字、開局時寫進對局的對方名字、戰績摘要裡的對手名字）用同一個 lbnBad、lbnPick 再檢查一次（window.XQ_NAMESAFE，在這一段後面），
       所以送出（XQ_PUBNAME、net.js）和顯示（lbnShow）是同一套規則。舊存檔、舊版送來的名字不改資料，只在送出和顯示的當下判斷。
   這一段到「名字安全顯示：以上」只用 String、RegExp、Set、LBS_PLACE、LBS_ROLE、lbsHash、lbsTitleAt，xiangqi-lab/tools/test-name-safe.js 直接切出來測 */
const LBN_D="0-9"+String.fromCharCode(0x3007,0x96F6,0x4E00,0x4E8C,0x4E09,0x56DB,0x4E94,0x516D,0x4E03,0x516B,0x4E5D,0x58F9,0x8CB3,0x8D30,0x8CAE,0x53C3,0x53C1,0x8086,0x4F0D,0x9678,0x9646,0x67D2,0x634C,0x7396);   /* 〇零一到九、大寫壹到玖（含簡體的貳、參、陸）；用字碼組：zh-lint 不准原始碼出現簡體字，i18n 測試也不會把它當成畫面文字 */
const LBN_RE={
  invis:/[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}ᅟᅠㅤﾠ⠀͏឴឵᠎ -   ]/u,
  zwj:/(\p{Extended_Pictographic}[\u{1F3FB}-\u{1F3FF}️]?)‍(?=\p{Extended_Pictographic})/gu,
  mark:/\p{M}{3,}/u,
  html:/[<>]/,
  url:/https?:|:\/\/|www\.|[a-z0-9]\s*\.\s*(?:com|net|org|tw|io|cc|gg|ly|xyz|top|info|link|site|online|shop|vip|club|app|tv|cn|hk|jp|kr|uk|ru|biz|live|fun|gl|ws|pw|tk|ml)(?![a-z])/,
  urlK:/www|(?:點|点|dot)(?:com|net|org|tw|cc|io)/,
  mail:/@\s*[a-z0-9]/,
  mailK:/gmail|yahoo|hotmail|outlook|icloud|protonmail/,
  digit:new RegExp("["+LBN_D+"](?:[\\s\\-_.,，、/|~～·・]?["+LBN_D+"]){3,}"),
  contactK:/加我|加賴|加赖|私訊|私讯|私聊|密我|微信|weixin|wechat|telegram|電報|电报|whatsapp|instagram|discord|facebook|臉書|脸书|推特|twitter|抖音|tiktok|小紅書|小红书|youtube|手機號|手机号|電話|电话|聯絡我|联系我|聯繫我/,
  contactW:/(?:^|[^a-z])(?:line|ig|fb|tg)(?:id|[^a-z]|$)/,
  laiOk:/[耍依信仰倚誣抵無要別别都全怪]賴/g,
  laiK:/賴我|賴id(?![a-z])|賴帳號|賴账号|我的賴|我賴是/,
  laiN:/賴\s*[:=]|\+\s*賴/,
  impK:/官方|宮方|倌方|公告|公吿|[開开][發发発]者|[開开][發发発][團团][隊队]|裁判|客服|[系係][統统]|管[理里裡哩][員员]|版主|站[長长]|工作人[員员]|官[網网]/,
  impW:/(?:^|[^a-z])(?:admin|official|moderator|developer|sysop)/,
  dflt:/^(棋友|Player )[0-9A-Fa-f]{4}$/   /* 11/17 第 25 輪 V3：系統給的預設名字一律放行——英文預設名「Player XXXX」（00-util defaultName，第 21 輪起）4 碼剛好全是數字（約 15%）時被「4 位以上數字」擋掉；net.js 的「棋友＋代號前 4 碼」是小寫 */
};
/* 不雅字詞清單（11/13 開發者選：髒話、性相關、歧視、人身攻擊；判成 rude）——開發者可以直接增刪：每一行是一個正規式，詞跟詞用 | 隔開。
   比對前名字已經 NFKC、轉小寫、拿掉空白和標點（「幹 你」「f.u.c.k」一樣擋）。
   中文一律寫詞組，不寫單字：寫「幹你」不寫「幹」（能幹、幹部、樹幹），寫「操你」不寫「操」（體操、操場），寫「去死吧」不寫「去死」（失去死黨）；
     只有沒有正常用法的字（屄、肏）才寫單字。簡體字可以直接寫在正規式裡（zh-lint 不掃正規式）。
   英文 enAny：出現在哪裡都擋（fuck、bitch…）。enW：前後都不能接英文字母才擋（Scunthorpe 問題：assassin、class、Dickens、Sussex、Ashita、Hancock、therapist 不擋），
     可以寫字尾變化，例如 shit(?:s|ty)?。人名本身就是正常英文名的（Dick）不放。
   英文 enN（第 19 輪）：兩個字的片語，只在還留著空白標點的名字上比，中間一定要隔開（fuk u 擋；Fukuoka、Fuk Wing 不擋）。
   第 19 輪加的諧音詞組（淦你、干你娘、靠腰…）一樣只寫詞組；數字符號代字母（sh1t）、注音（ㄍㄢˋ）不用寫進來，lbnAlt 會先換回字母和字再比這份清單。 */
const LBN_BAD_WORDS={
  zhSwear:/幹你|幹妳|幹您|幹林|幹拎|幹恁|恁娘|姦你|操你|操妳|操您|操他媽|屌你|屌妳|他媽的|你媽的|妳媽的|去你媽|你媽死|你老母|草泥馬|草泥马|他妈的|你妈的|操你妈|去你妈|靠北|靠杯|靠夭|雞掰|雞歪|機掰|機歪|基掰|鸡巴|雞巴|屄|肏|傻逼|傻b|煞筆|牛逼|懶叫|懶趴|仆街|撲街|冚家鏟|含撚|干你娘|干妳娘|干你媽|干你妈|干林娘|干拎娘|干恁娘|淦你|淦妳|淦您|淦林|淦拎|淦恁|贛你娘|贛林娘|靠腰|靠邀|靠盃|草尼馬|艹你/,
  zhSex:/做愛|做爱|性交|口交|肛交|性愛|性爱|援交|約炮|约炮|一夜情|嫖妓|嫖娼|賣淫|卖淫|妓女|強姦|强奸|強暴|强暴|輪姦|迷姦|戀童|恋童|陰莖|阴茎|陰道|阴道|陰蒂|自慰|手淫|打手槍|擼管|射精|精液|奶子|巨乳|爆乳|裸體|裸体|裸照|裸聊|a片|黃片|黄片|色情片|淫蕩|淫荡|淫賤|淫娃|淫穢|騷貨|骚货|破麻|婊子|弓雖女干|弓虽女干/,
  zhHate:/支那|黑鬼|尼哥|黑奴|娘炮|人妖|死gay|死同性戀|台巴子|高麗棒子|日本鬼子|白皮豬|猶太豬|納粹|纳粹|希特勒/,
  zhAttack:/去死吧|你去死|快去死|死全家|全家死光|白癡|白痴|智障|腦殘|脑残|低能兒|廢物(?!利用)|废物|人渣|賤人|贱人|賤貨|贱货|雜種|杂种|畜生|畜牲|王八蛋|狗娘養|狗娘养|龜兒子|孬種|死肥豬|死胖子/,
  enAny:/fuck|fvck|sexy|motherf|bitch|bastard|asshole|dumbass|jackass|dickhead|bullshit|shithead|nigger|nigga|faggot|whore|wanker|blowjob|jerkoff|dildo|pornhub|killyourself|phuck|fukyou|fukoff/,
  enW:/shit(?:s|ty)?|ass(?:es)?|arse|cunts?|cocks?|puss(?:y|ies)|penis|vaginas?|porno?|sex(?:ual)?|sluts?|fags?|retard(?:s|ed)?|rape[sd]?|rapists?|nazis?|hitler|twat|wank|boobs?|boobies|tits|titties|milf|idiots?|morons?|stfu|nmsl|fck|phuk|phuq|fuq/,
  enN:/fuk[^a-z]+(?:u|ya)/
};
let LBN_BADW=null,LBN_BADN=null;
function lbnRude(n,k){if(!LBN_BADW){LBN_BADW=new RegExp("(?:^|[^a-z])(?:"+LBN_BAD_WORDS.enW.source+")(?![a-z])");LBN_BADN=new RegExp("(?:^|[^a-z])(?:"+LBN_BAD_WORDS.enN.source+")(?![a-z])")}const B=LBN_BAD_WORDS;
  return B.zhSwear.test(k)||B.zhSex.test(k)||B.zhHate.test(k)||B.zhAttack.test(k)||B.enAny.test(k)||LBN_BADW.test(n)||LBN_BADW.test(k)||LBN_BADN.test(n)}
/* 第 19 輪 R05-bypass：變體。lbnStrip＝拿掉空白標點（跟 lbnBad 的 k 同一條）；lbnLai＝「賴」當 LINE；lbnZy＝注音換成字；lbnLeet＝數字符號換回字母（one＝1 要當 i 還是 l）；
   lbnWords＝contact、imp、rude 三類；lbnAlt＝要多比的變體（跟原樣一樣的不重複比） */
const lbnStrip=s=>s.replace(/[\s\p{P}\p{S}\p{Z}_]/gu,"");
function lbnLai(n,k){return LBN_RE.laiN.test(n)||LBN_RE.laiK.test(k.replace(LBN_RE.laiOk,""))||LBN_RE.laiK.test(n.replace(LBN_RE.laiOk,""))}
const LBN_ZY=[[/ㄋㄧㄤ/g,"娘"],[/ㄌㄧㄣ/g,"林"],[/ㄐㄧㄚ/g,"加"],[/ㄉㄧㄠ/g,"屌"],[/ㄍㄢ/g,"幹"],[/ㄘㄠ/g,"操"],[/ㄌㄞ/g,"賴"],[/ㄎㄠ/g,"靠"],[/ㄅㄟ/g,"北"],[/ㄅㄞ/g,"掰"],[/ㄋㄧ/g,"你"],[/ㄇㄚ/g,"媽"],[/ㄨㄛ/g,"我"],[/ㄐㄧ/g,"雞"]];
function lbnZy(n){let z=n.replace(/[ˊˇˋ˙ˉ]/g,"");for(const p of LBN_ZY)z=z.replace(p[0],p[1]);return z}
const LBN_LEET={"0":"o","1":"i","3":"e","4":"a","5":"s","7":"t","8":"b","$":"s","@":"a","!":"i","|":"l"};
function lbnLeet(s,one){return s.replace(/[a-z0-9$@!|]+/g,t=>{const a=t.replace(/[^a-z]/g,"").length;if(a<2||a*2<t.length||a===t.length)return t;let o="";for(const c of t)o+=c==="1"?one:LBN_LEET[c]||c;return o})}
function lbnWords(n,k){if(LBN_RE.contactK.test(k)||LBN_RE.contactW.test(n)||LBN_RE.contactW.test(k)||lbnLai(n,k))return"contact";
  if(LBN_RE.impK.test(k)||LBN_RE.impW.test(n)||LBN_RE.impW.test(k))return"imp";
  if(lbnRude(n,k))return"rude";
  return""}
function lbnAlt(r,n,k){const out=[],seen=new Set([n+"\n"+k]),add=(a,b)=>{const q=a+"\n"+b;if(!seen.has(q)){seen.add(q);out.push([a,b])}};
  if(/[ㄅ-ㄯ]/.test(n)){const z=lbnZy(n);add(z,lbnStrip(z))}
  const a=lbnLeet(n,"i"),ka=lbnLeet(k,"i");add(a,lbnStrip(a));add(ka,ka);
  const nb=r.replace(/I/g,"l").toLowerCase().replace(/[。｡]/g,"."),b=lbnLeet(nb,"l"),kb=lbnLeet(lbnStrip(nb),"l");add(b,lbnStrip(b));add(kb,kb);
  return out}
const LBN_WHY={len:"太長",empty:"是空白的",invis:"有看不見的字",mark:"有疊在一起的符號",html:"有角括號",url:"像網址",mail:"像 Email",digit:"有 4 位以上的數字",contact:"像聯絡方式（LINE、IG、加我…）",imp:"像官方或開發者（官方、公告、裁判、客服、系統…）",rude:"有不雅或罵人的字"};
let LBN_TSET=null;
function lbnIsTitle(nm){if(!LBN_TSET){LBN_TSET=new Set();for(const a of LBS_PLACE)for(const b of LBS_ROLE)LBN_TSET.add(a+b)}return LBN_TSET.has(String(nm))}
function lbnBad(nm){const s=nm==null?"":String(nm);
  if(s.length>16)return"len";
  if(LBN_RE.dflt.test(s)||lbnIsTitle(s))return"";
  if(LBN_RE.invis.test(s.replace(LBN_RE.zwj,"$1")))return"invis";
  if(!s.replace(/[\s　]/g,""))return"empty";
  if(LBN_RE.mark.test(s))return"mark";
  let r=s;try{r=s.normalize("NFKC")}catch(e){}const n=r.toLowerCase().replace(/[。｡]/g,".");
  if(LBN_RE.html.test(n))return"html";
  const k=lbnStrip(n);
  if(LBN_RE.url.test(n)||LBN_RE.urlK.test(k))return"url";
  if(LBN_RE.mail.test(n)||LBN_RE.mailK.test(k))return"mail";
  if(LBN_RE.digit.test(n)||LBN_RE.digit.test(k))return"digit";
  let w=lbnWords(n,k);if(w)return w;
  for(const v of lbnAlt(r,n,k)){w=lbnWords(v[0],v[1]);if(w)return w}
  return""}
function lbnTitleOf(id,nm){id=id==null?"":String(id);return lbsTitleAt(lbsHash(id||"n:"+String(nm==null?"":nm)))}
function lbnPick(id,nm,o){o=o||{};nm=nm==null?"":String(nm);if(o.me)return nm;if(lbnIsTitle(nm))return nm;if(!nm&&(id==null||id===""))return"";
  if(o.kid||lbnBad(nm))return lbnTitleOf(id,nm);return nm}
/* ---------- 名字安全顯示：以上 ---------- */
/* 第 19 輪 R05-wire：src/net.js 對外送名字前問這個（跟顯示端同一個 lbnBad、lbnPick）；net.js 找不到它、也沒有 XQ_PUBNAME 時，自由名字一律不送，改送「棋友＋代號」 */
window.XQ_NAMESAFE={bad:lbnBad,pick:lbnPick};
/* 兒童在看：07m5 的兒童模式（大廳本來就關著，這裡管棋譜、戰績這些還看得到名字的地方），或自己在大廳選了「稱號」（回饋 842：新玩家預設，App 拿它當「可能是小朋友」） */
const LBN_KID_T=true;
function lbnKid(){try{if(typeof fmKid==="function"&&fmKid())return true}catch(e){}try{return LBN_KID_T&&lbsMode()==="t"}catch(e){return false}}
/* 所有顯示別人名字的地方都走這一個：lbnShow(玩家物件) 或 lbnShow(代號, 名字)；回傳純文字，放進 innerHTML 時外面還是要 esc() */
function lbnShow(a,b){let id=a,nm=b;if(a&&typeof a==="object"){id=a.id;nm=a.name}id=id==null?"":String(id);
  let me=false;try{me=!!id&&id===meInfo().id}catch(e){}
  try{return lbnPick(id,nm,{me,kid:!me&&lbnKid()})}catch(e){return lbnTitleOf(id,nm)}}
window.XQ_SHOWNAME=lbnShow;
/* 殘篇閣（07q2）：名字是搭檔（不是小帥 AI）的才走 lbnShow，自己、小帥照原樣 */
function lbnPeer(p,nm){return p&&!p.ai&&nm!=null&&nm!==""&&nm===p.name?lbnShow(p.id,nm):nm}
/* 線上對局畫面（09b 的名牌、聊天泡泡）：照紅黑在 XQNet.game() 找到代號再走 lbnShow */
function lbnSeat(by,nm){try{const G=window.XQNet&&XQNet.game&&XQNet.game(),o=G&&(by==="r"?G.red:by==="b"?G.black:null);if(o)return lbnShow(o.id,nm||o.name)}catch(e){}let me="";try{me=myName()||""}catch(e){}return nm&&nm===me?nm:lbnShow("",nm)}
/* 棋譜庫裡存的線上對局（「真人對局」裡有 mine／net 標記的、「棋友的對局」peek）讀出來時，對手名字也走 lbnShow：存檔本身不改，只改這次讀出來的副本；
   自己那一方（mine，舊紀錄沒有 mine 就跟自己的名字比）照原樣，同桌對弈（沒有 mine、沒有 net）不動 */
function lbnLibIt(it,peek){if(!it||typeof it!=="object"||!(peek||it.net||it.mine))return it;let me="";try{me=myName()||""}catch(e){}
  const f=(nm,sd)=>nm==null||nm===""||(it.mine?it.mine===sd:!!me&&nm===me)?nm:lbnShow("",nm);
  return Object.assign({},it,{red:f(it.red,"r"),black:f(it.black,"b")})}
if(typeof api==="function"){const f0=api;api=async function(u){const r=await f0.apply(this,arguments);
  try{const m=/^\/db\/items?\?(?:.*&)?c=(pvp|peek)(?:&|$)/.exec(String(u||""));if(m&&r&&typeof r==="object"){const pk=m[1]==="peek";
    if(Array.isArray(r.items))return Object.assign({},r,{items:r.items.map(x=>lbnLibIt(x,pk))});if(/^\/db\/item\?/.test(String(u)))return lbnLibIt(r,pk)}}catch(e){}return r}}

/* ---------- 設定「角色」分頁：🛡 線上大廳（#lbSafe） ---------- */
function lbsBlockSheet(){sheet("🚫 我封鎖的人",b=>{const paint=()=>{const L=lbsList().slice().reverse();
    b.innerHTML=`<p class="muted" style="margin:0 0 10px;font-size:13.5px">封鎖的人不會出現在名冊和燈籠裡，邀請會自動婉拒，配對會避開，對局中不顯示他的表情和聊天。名單只存在這支手機。</p>`+
      (L.length?L.map(x=>`<div class="card lbs-bl"><b>${esc(lbnShow(x)||"棋友")}</b><span class="muted" style="font-size:12px">${new Date(x.at||Date.now()).toLocaleDateString()}</span><button class="pill" data-un="${esc(x.id)}" style="padding:6px 12px;font-size:13.5px">解除</button></div>`).join("")
        :'<div class="card muted" style="text-align:center">還沒有封鎖任何人</div>');
    b.querySelectorAll("[data-un]").forEach(x=>x.onclick=()=>{vibrate(5);lbsUnblock(x.dataset.un);paint();lbsSetPaint()})};paint()})}
function lbsSetHTML(){const t=lbsMode()==="t",n=lbsList().length,nm=(window.myName&&myName())||"";
  let bad="";try{bad=!t&&nm?lbnBad(nm):""}catch(e){}   /* R05＋11/13：自己的名字不合格，對外改送稱號（XQ_PUBNAME），這裡提示要改名 */
  const cur=t||bad?lbsTitle():"",G=t?lbsTpGroup():[];
  return`<div class="sec-t">🛡 線上大廳</div><div class="card"><div><b>在線上大廳顯示</b><br><span class="muted" style="font-size:13px">別人在大廳、對局、觀戰看到的名字。你自己的畫面照常顯示你取的名字。</span></div>
    <div class="opt" id="lbsNm" style="margin:8px 0 6px"><button data-nm="t"${t?' class="on"':""}>🏮 稱號</button><button data-nm="n"${t?"":' class="on"'}>✍ 我取的名字</button></div>
    ${t?`<div class="opt lbs-tp" id="lbsTp">${G.map(x=>`<button data-tp="${esc(x.t)}"${x.t===cur?' class="on"':""}>${esc(x.t)}</button>`).join("")}</div><div class="opt lbs-tp1"><button id="lbsTpMore">🔄 換一組</button></div>`:""}
    <div class="muted" style="font-size:13px">現在別人看到：<b style="color:var(--ink,inherit)">${esc(cur||nm||"棋友")}</b>${cur?"（系統給的稱號）":""}</div>
    ${bad?`<p id="lbsNmBad" style="font-size:13px;line-height:1.7;margin:8px 0 0;color:var(--red,#b3261e)">⚠ 這個名字不能在大廳顯示：<span>${esc(LBN_WHY[bad]||"")}</span>。別人看到的是稱號：<b>${esc(cur)}</b>。請到「我的角色」改名字。</p>`:""}</div>
    <button class="item card" id="lbsBl" style="width:100%;margin:8px 0 4px;font:inherit;color:inherit"><span class="lb">🚫</span><span class="tx" style="flex:1"><b>我封鎖的人（${n}）</b><span class="muted" style="display:block;font-size:12.5px">看名單、解除封鎖</span></span><span class="muted">›</span></button>
    <button class="item card" id="lbsMy" style="width:100%;margin:4px 0;font:inherit;color:inherit"><span class="lb">🚩</span><span class="tx" style="flex:1"><b>我的檢舉（${lbsMine().length}）</b><span class="muted" style="display:block;font-size:12.5px">看檢舉編號和處理狀態</span></span><span class="muted">›</span></button>
    <button class="item card" id="lbsIn" style="width:100%;margin:4px 0;font:inherit;color:inherit"><span class="lb">📖</span><span class="tx" style="flex:1"><b>線上大廳安全須知</b><span class="muted" style="display:block;font-size:12.5px">快捷語、個資、檢舉封鎖、家長關閉大廳</span></span><span class="muted">›</span></button>
    <p class="muted" style="font-size:12.5px;margin:4px 2px 10px">遇到不舒服的名字或聊天：點他的名字，資料卡最下面有「🚩 檢舉」「🚫 封鎖」。</p>`}
function lbsSetPaint(){const w=document.getElementById("lbSafe");if(!w)return;w.innerHTML=lbsSetHTML();
  w.querySelectorAll("[data-nm]").forEach(x=>x.onclick=()=>{vibrate(5);lbsSetMode(x.dataset.nm,lbsSetPaint)});
  w.querySelectorAll("[data-tp]").forEach(x=>x.onclick=()=>{vibrate(5);if(lbsTpSet(x.dataset.tp))lbsSetPaint()});
  const tm=w.querySelector("#lbsTpMore");if(tm)tm.onclick=()=>{vibrate(5);lbsTpMore();lbsSetPaint()};
  const bl=w.querySelector("#lbsBl");if(bl)bl.onclick=()=>{vibrate(5);lbsBlockSheet()};const my=w.querySelector("#lbsMy");if(my)my.onclick=()=>{vibrate(5);lbsMineSheet()};
  const li=w.querySelector("#lbsIn");if(li)li.onclick=()=>{vibrate(5);lbsIntro(true)}}
function lbsSetInject(v){if(!OFF||!window.XQNet)return;const pane=v.querySelector('[data-pane="bot"]');if(!pane||pane.querySelector("#lbSafe"))return;lbsCss();
  const w=document.createElement("div");w.id="lbSafe";const nl=pane.querySelector("#nmLook"),c=nl&&nl.closest(".card");
  if(c)c.after(w);else pane.append(w);lbsSetPaint()}
if(typeof Settings==="function"){const f0=Settings;Settings=function(v){const r=f0.apply(this,arguments);try{lbsSetInject(v)}catch(e){console.error(e)}return r}}

/* ---------- 回饋 850（線上聊天只能用快捷語，全部玩家都一樣）：src/net.js 收到文字時問這個——只認 EMOTES（08b-cpugame.js）裡的原句 ---------- */
window.XQ_CHAT_OK=t=>{t=String(t||"").trim();try{return!!t&&EMOTES.some(q=>q[2]===t)}catch(e){return false}};

/* ---------- 回饋 852：自己被停權時，進大廳只看到說明（單機功能照常）；每次進大廳順便抓一次停權名單（10 分鐘內抓過就不抓） ---------- */
function lbsBanPage(v){setTop("線上大廳",false);setTabs(true,"#/lobby");
  v.innerHTML=`<div class="pad"><div class="card" style="text-align:center;padding:26px 18px;margin-top:14px;line-height:1.8"><div style="font-size:44px">🏮</div>
    <h2 style="font-family:var(--serif);margin:6px 0 8px">線上大廳暫時不能使用</h2><p style="margin:0 0 6px">這個帳號暫時不能使用線上大廳，若有疑問請用意見回饋聯絡。</p>
    <p class="muted" style="font-size:13.5px;margin:0 0 14px">挑戰電腦、石桌往事、殘局、棋譜這些單機功能都照常可以玩。</p>
    <button class="btn" id="lbsFb">✍ 意見回饋</button><button class="btn ghost" id="lbsHome" style="margin-top:8px">回首頁</button></div></div>`;
  v.querySelector("#lbsFb").onclick=()=>{try{feedbackSheet()}catch(e){location.hash="#/settings"}};v.querySelector("#lbsHome").onclick=()=>{try{goHome()}catch(e){location.hash="#/"}};return{}}
if(typeof Lobby==="function"){const f0=Lobby;Lobby=function(v){const was=window.XQ_SELFBANNED();try{lbsBanFetch().then(ch=>{if(ch&&window.XQ_SELFBANNED()!==was&&/^#\/lobby/.test(location.hash))route()})}catch(e){}
  if(window.XQ_SELFBANNED())return lbsBanPage(v);return f0.apply(this,arguments)}}

/* ---------- 開發者 11/9：家長關掉線上大廳（07m5-family.js fmNetOff）：src/net.js 照停權處理；大廳只顯示說明，請家長到設定打開 ---------- */
{const sb0=window.XQ_SELFBANNED;window.XQ_SELFBANNED=()=>{try{if(typeof fmNetOff==="function"&&fmNetOff())return true}catch(e){}return sb0()}}
function lbsParentOffPage(v){setTop("線上大廳",false);setTabs(true,"#/lobby");
  if(typeof fmKid==="function"&&fmKid()){   /* 評比第 4 輪 P20：兒童模式（07m5-family.js）——不跟陌生人互動，同桌對弈照常 */
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center;padding:26px 18px;margin-top:14px;line-height:1.8"><div style="font-size:44px">👧</div>
      <h2 style="font-family:var(--serif);margin:6px 0 8px">兒童模式：線上大廳關著</h2><p style="margin:0 0 6px">兒童模式不跟陌生人互動：線上大廳、千秋盃、觀戰都不開，也不送使用資料（意見回饋只送文字，換手機要家長驗證）。</p>
      <p style="margin:0 0 6px">想跟家人朋友下棋，可以用<b>同桌對弈</b>（同一支手機兩個人輪流下）；挑戰電腦、石桌往事、殘局、棋譜都照常可以玩。</p>
      <p class="muted" style="font-size:13.5px;margin:0 0 14px">想打開，請家長到「設定房間的 🔒 系統・隱私・家長 → 👪 家長與護眼 → 👧 兒童模式」。</p>
      <button class="btn" id="lbpPvp">👥 同桌對弈</button><button class="btn ghost" id="lbpSet" style="margin-top:8px">⚙ 到設定</button><button class="btn ghost" id="lbpHome" style="margin-top:8px">回首頁</button></div></div>`;
    v.querySelector("#lbpPvp").onclick=()=>{location.hash="#/pvp"};v.querySelector("#lbpSet").onclick=()=>{location.hash="#/settings"};v.querySelector("#lbpHome").onclick=()=>{try{goHome()}catch(e){location.hash="#/"}};return{}}
  v.innerHTML=`<div class="pad"><div class="card" style="text-align:center;padding:26px 18px;margin-top:14px;line-height:1.8"><div style="font-size:44px">👪</div>
    <h2 style="font-family:var(--serif);margin:6px 0 8px">線上大廳已由家長關閉</h2><p style="margin:0 0 6px">挑戰電腦、石桌往事、殘局、棋譜這些單機功能都照常可以玩。</p>
    <p class="muted" style="font-size:13.5px;margin:0 0 14px">想打開，請家長到「設定房間的 🔒 系統・隱私・家長 → 👪 家長與護眼 → 🔒 家長修改」。</p>
    <button class="btn" id="lbpSet">⚙ 到設定</button><button class="btn ghost" id="lbpHome" style="margin-top:8px">回首頁</button></div></div>`;
  v.querySelector("#lbpSet").onclick=()=>{location.hash="#/settings"};v.querySelector("#lbpHome").onclick=()=>{try{goHome()}catch(e){location.hash="#/"}};return{}}
if(typeof Lobby==="function"){const f1=Lobby;Lobby=function(v){try{if(typeof fmNetOff==="function"&&fmNetOff())return lbsParentOffPage(v)}catch(e){}return f1.apply(this,arguments)}}

/* ---------- 評比第 4 輪 P20.1／P14.3：第一次進線上大廳的安全須知（store "lbIntro"＝第一次看到的時間）----------
   第一次真的進到大廳（不是停權頁、家長關閉頁、兒童模式頁）時跳一次：只能用快捷語、不要給個資、不舒服怎麼檢舉封鎖、家長可以關大廳。
   重看：設定「角色」分頁「🛡 線上大廳」（#lbSafe）、「系統」分頁「👪 家長與護眼」（07m5 的 #fmLbI）都呼叫 lbsIntro(true) */
function lbsIntro(again){lbsCss();try{store.set("lbIntro",+store.get("lbIntro",0)||Date.now())}catch(e){}
  return modal(`<div class="em">🛡</div><h2>線上大廳安全須知</h2><div class="lbs-in">
    <p>💬 <b>只能用快捷語</b>：大廳和對局裡不能打字，大家都只能用 App 內建的快捷語和表情。</p>
    <p>🙈 <b>不要給個資</b>：名字預設用系統給的「稱號」。不要把真名、學校、電話、住址、LINE、照片告訴任何人，也不要跟陌生人約到 App 外面。</p>
    <p>🚩 <b>不舒服就檢舉、封鎖</b>：點對方的名字，資料卡最下面有「🚩 檢舉」「🚫 封鎖」。對方不會知道是誰檢舉的；封鎖後他的邀請、表情、聊天都不會出現。下棋時不想下了，可以直接認輸離開。</p>
    <p>👪 <b>家長可以關掉大廳</b>：「設定房間的 🔒 系統・隱私・家長 → 👪 家長與護眼」可以關閉線上大廳，或打開「👧 兒童模式」（不跟陌生人互動、不送使用資料、提醒休息）。</p></div>
    <p class="muted" style="font-size:12.5px;margin:4px 0 0">${again?"":"這張說明只會自動跳一次；"}之後可以在「設定房間的 🔒 系統・隱私・家長 → 🛡 大廳安全須知」再看。</p>`,[["我知道了",null]])}
if(typeof Lobby==="function"){const f2=Lobby;Lobby=function(v){const r=f2.apply(this,arguments);
  try{if(!store.get("lbIntro",0)&&!window.XQ_SELFBANNED())setTimeout(()=>{try{if(/^#\/lobby/.test(location.hash)&&!store.get("lbIntro",0)&&!window.XQ_SELFBANNED())lbsIntro(false)}catch(e){}},700)}catch(e){}return r}}

/* ---------- 11/17 iMac 測試員 G P3-1 升 P2（準則 5.1.1／5.1.2，兒童取向）：修正清單 data/fixes.json 什麼時候抓（網頁版、原生版同一套；native-bridge 把網址轉去哪裡不變，只改什麼時候叫） ----------
   fixes.json 是飛鴿傳書（修好回信、開發者回覆）、修正通知（checkFixes）、信房告示榜、檢舉處理進度的共同來源。
   ① 這支手機真的送出成功過意見回饋或檢舉（store fbSentAt：postForm 送成功才記，排隊中、送失敗不算；兒童模式送的只有文字、沒有線上 ID、對不到回信，也不記）：開 App 時照舊抓一次。
   ② 沒送過：開 App 不抓；打開意見回饋頁（信房告示榜）、修正紀錄、我的檢舉時才抓。只打開、沒送出，不算送過。
   ③ 兒童模式或家長關掉線上大廳（fmNetOff）：一律不抓（告示榜寫明不下載；飛鴿不飛來——兒童模式的回饋本來就不帶線上 ID，開發者的回信對不到這支手機）。
   同一次開 App 最多真的連一次：00-util 的 fetch 共用，成功一次後整個工作階段共用同一份。
   舊存檔（這版以前沒有 fbSentAt）：有 fbMine（寄出時記下的那一句）而且不是全部還在排隊，或有已送出的檢舉，就當送過（只補記一次）。 */
function xqfbSent(){try{return(+store.get("fbSentAt",0)||0)>0}catch(e){return false}}
(function(){try{if(store.get("fbSentAt",null)!=null)return;const m=store.get("fbMine",[])||[],q=(store.get("fbQueue",[])||[]).filter(r=>r&&!/玩家/.test(String(r.type||"")));
  let rep=false;try{rep=lbsMine().some(x=>{const k=lbsMineState(x);return k==="sent"||k==="seen"||k==="done"})}catch(e){}
  store.set("fbSentAt",(m.length&&m.length>q.length)||rep?(m.length&&+m[m.length-1].at)||1:0)}catch(e){}})();
if(typeof postForm==="function"){const f0=postForm;postForm=async function(rec){const r=await f0.apply(this,arguments);
  try{if(rec&&!/玩家/.test(String(rec.type||""))&&!(typeof fmKid==="function"&&fmKid()))store.set("fbSentAt",Date.now())}catch(e){}return r}}   /* 丟錯（沒網路、排隊）就不會走到這裡 */
if(typeof checkFixes==="function"){const f0=checkFixes;checkFixes=function(){if(lbsNetQuiet()||!xqfbSent())return Promise.resolve();return f0.apply(this,arguments)}}
if(typeof myFixes==="function"){const f0=myFixes;myFixes=function(){if(lbsNetQuiet())return Promise.resolve({dev:false,items:[],quiet:1});return f0.apply(this,arguments)}}
if(typeof fblPending==="function"){const f0=fblPending;fblPending=function(){if(lbsNetQuiet()||!(xqfbSent()||window.XQ_FIXES_GOT))return Promise.resolve([]);return f0.apply(this,arguments)}}
/* 設定 → 隱私卡片（文字在 05-settings；這裡在開關前面補一段「什麼時候連網下載」，原生版、網頁版各一種寫法；英文在 07i18n 的 I18N_EN） */
const XQ_NETWHEN_NAT="如果你送過意見回饋，App 開啟時會從 Cloudflare 下載一次修正清單和開發者回覆，讓你收到飛鴿傳書；沒送過就只在打開意見回饋時下載。進入線上大廳時，會從 GitHub Pages 下載一次停權名單。這兩個網站跟任何連線一樣會看到你的 IP 位址，但不會收到你的名字、存檔或棋譜。兒童模式開著，或家長關閉線上大廳時，兩份都不下載。";
const XQ_NETWHEN_WEB="如果你送過意見回饋，開網頁時會下載一次修正清單和開發者回覆（跟這個網站的其他檔案一樣放在 GitHub Pages 和 Cloudflare），讓你收到飛鴿傳書；沒送過就只在打開意見回饋時下載。進入線上大廳時，會下載一次停權名單。這兩個網站跟任何連線一樣會看到你的 IP 位址，但不會收到你的名字、存檔或棋譜。兒童模式開著，或家長關閉線上大廳時，兩份都不下載。";
function xqNetWhenInject(v){const t=v&&v.querySelector('.sec-t[data-sm-title="隱私"]'),c=t&&t.nextElementSibling;if(!c||c.querySelector(".xq-netwhen"))return;
  const p=document.createElement("p");p.className="xq-netwhen";p.style.cssText="margin:8px 0 0";p.textContent=(typeof xqNat==="function"&&xqNat())?XQ_NETWHEN_NAT:XQ_NETWHEN_WEB;
  const l=c.querySelector("label");if(l)c.insertBefore(p,l);else c.append(p)}
if(typeof Settings==="function"){const f0=Settings;Settings=function(v){const r=f0.apply(this,arguments);try{xqNetWhenInject(v)}catch(e){}return r}}

/* ---------- 11/17 iMac 測試員 I P1-2（準則 5.1.1／5.1.2）：驛路文牒「隱私說明 ›」的摘要跟實際不一致 ----------
   原本（07s4 hq-pv）用中文標題「隱私」找設定的隱私卡片，英文介面標題翻成 Privacy 就找不到，退回「這個版本沒有送出任何資料」（This version sends no data）；
   中文摘要又寫死「每 7 天送名字…」（App 版玩家登記預設關），也沒提三個匿名上傳。07s4 是 reps 管的檔，不改它：在 document 捕獲階段先接走這顆鈕，
   改開 xqPrivSum()——照這支手機「現在的開關狀態」逐項寫（玩家登記、三個匿名上傳、健康摘要；兒童模式／家長關大廳時全部不送），不靠標題文字，中英各一份；
   下面接完整說明文件按鈕、「📜 關於與開源授權」（I P1-4：iOS 上的入口）和城市選單。 */
function xqPrivRows(){const en=typeof i18nLang==="function"&&i18nLang()==="en",nat=typeof xqNat==="function"&&xqNat(),S=(k,d)=>{try{return store.get(k,d)}catch(e){return d}};
  const quiet=lbsNetQuiet(),reg=!quiet&&!S("repOff",nat),stk=!quiet&&!S("stkOff",false),cpa=!quiet&&!S("cpuAnonOff",false),lrn=!quiet&&!S("learnAnonOff",false),tel=!quiet&&!!S("teleOptIn",false)&&lrn;
  const on=b=>en?(b?"On":"Off"):(b?"開著":"關著");
  return en?[
    `Player registration: <b>${on(reg)}</b>${reg?" — every 7 days (or when your name or rank changes) your lobby name, device ID, rank, app version and device type go to the developer for troubleshooting.":` — nothing is sent.${nat?" (Off by default in the app.)":""}`}`,
    `Anonymous stuck signals: <b>${on(stk)}</b>. Anonymous game scores: <b>${on(cpa)}</b>. Anonymous learning progress: <b>${on(lrn)}</b>.${nat?" (All three are off by default in the app.)":""} They contain no name or device ID.`,
    `Anonymous daily health summary: <b>${on(tel)}</b> (off by default).`,
    quiet?"Kids Mode or the parental lobby switch is on: none of the above is sent, and the fix list and ban list aren't downloaded.":"Feedback and reports are sent only when you tap Send. If you've sent feedback, the fix list is downloaded once when the app opens; the ban list only when you enter the lobby.",
    "Game records, saves and chat are never sent. The app doesn't look up where you are; you choose whether the lobby shows your city."
  ]:[
    `玩家登記：<b>${on(reg)}</b>${reg?"——每 7 天（或名字、段位改變時）送大廳名字、裝置代號、段位、App 版本、裝置種類給開發者，用來查問題。":`——不送。${nat?"（App 版預設關）":""}`}`,
    `匿名記錄卡住的地方：<b>${on(stk)}</b>；匿名對局評分：<b>${on(cpa)}</b>；匿名學習進度：<b>${on(lrn)}</b>。${nat?"（App 版這三個預設都關）":""}不含名字和裝置代號。`,
    `每天自動送匿名健康摘要：<b>${on(tel)}</b>（預設關）。`,
    quiet?"兒童模式或家長關閉線上大廳：以上全部不送，修正清單和停權名單也不下載。":"意見回饋、檢舉只在你按送出時送。送過意見回饋的話，開 App 時下載一次修正清單；停權名單只在進大廳時下載。",
    "不送棋譜、存檔和聊天內容；不查你在哪裡，城市要不要在大廳顯示由你自己選。"]}
function xqPrivSum(){const en=typeof i18nLang==="function"&&i18nLang()==="en";
  sheet(en?"Privacy notes":"隱私說明",b=>{b.innerHTML=`<ul data-noi18n style="line-height:1.8;margin:0;padding-left:1.2em">${xqPrivRows().map(x=>`<li>${x}</li>`).join("")}</ul>`
      +`<p class="muted" data-noi18n style="font-size:13px;margin:8px 0 0">${en?"Change these in Settings → “🔒 Privacy”.":"開關在設定房間的「🔒 隱私・家長」。"}</p>`
      +(()=>{let id="";try{id=(meInfo()||{}).id||""}catch(e){}return id?`<div class="card" data-noi18n style="margin-top:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="flex:1;min-width:0">${en?"Device ID":"裝置代號"}：<b style="font-family:ui-monospace,Menlo,Consolas,monospace;word-break:break-all">${esc(id)}</b><br><span class="muted" style="font-size:12.5px">${en?"A random code made by the app (not a phone serial number). Include it when you email to ask for deletion.":"App 自己產生的隨機代號（不是手機序號）；寫信申請刪除資料時附上。"}</span></span><button type="button" class="btn ghost" id="xqPsId" style="width:auto;min-height:44px;margin:0">📋 ${en?"Copy":"複製"}</button></div>`:""})()   /* 11/17 iMac I P3-10：支援文件請寫信的人附上裝置代號，App 裡要看得到——照 App 原本就有的匿名裝置代號（meInfo().id）顯示，不新增任何識別碼 */
      +(typeof xqDocBtns==="function"?xqDocBtns():"")+`<button type="button" class="btn ghost" id="xqPsLic" style="width:100%;margin-top:8px">📜 關於與開源授權</button>`;
    {const cp=b.querySelector("#xqPsId");if(cp)cp.onclick=async()=>{let id="";try{id=(meInfo()||{}).id||""}catch(e){}let ok=false;try{await navigator.clipboard.writeText(id);ok=true}catch(e){}toast(ok?(en?"Device ID copied":"裝置代號已複製"):id)}}
    const lic=b.querySelector("#xqPsLic"),al=document.querySelector("#aLic");if(lic){if(al)lic.onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>{try{al.click()}catch(e){}},120)};else lic.remove()}
    const sel=document.querySelector("#myCityS");if(sel){const l=document.createElement("label");l.style.cssText="display:flex;align-items:center;gap:8px;margin-top:12px";l.innerHTML=`<span style="flex:1">🏙 大廳顯示我的城市</span>`;const s2=sel.cloneNode(true);s2.removeAttribute("id");s2.value=sel.value;s2.onchange=()=>{sel.value=s2.value;if(typeof sel.onchange==="function")sel.onchange()};l.append(s2);b.append(l)}})}
/* 11/17 測試員 D 第 29 輪 Y6：「📜 關於與開源授權」英文介面大段中文、粗體前後黏字（afree、onThis phoneand）——05-settings 的 aboutLicSheet 是一段段中文組的，字典對不上。
   05-settings 不動（reps 管）：這裡換成中英兩份寫好的版本（內容同原本；「會送出去的」那句照現在實際寫：玩家登記、匿名統計看隱私的開關），#aLic、隱私說明裡那顆都叫 aboutLicSheet，換這一個就好 */
if(typeof aboutLicSheet==="function"&&!aboutLicSheet.__xq){const lic0=aboutLicSheet;aboutLicSheet=function(){try{const en=typeof i18nLang==="function"&&i18nLang()==="en",nat=typeof setNat==="function"&&setNat(),RP=typeof ABOUT_REPO!=="undefined"?ABOUT_REPO:"https://github.com/raysonchen2023-cloud/xiangqi-lab",R=RP+"/blob/main/",L=(u,t)=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  sheet(en?"📜 About and open-source licenses":"📜 關於與開源授權",b=>{b.innerHTML=`<div data-noi18n style="line-height:1.85;font-size:15px">`+(en?
    `<p style="margin:0 0 10px">Xiangqi Qianqiu is a <b>free, non-commercial</b> project to promote xiangqi (Chinese chess): no fees, no in-app purchases, no ads.</p>
    <p style="margin:0 0 10px">Xiangqi Qianqiu © 2026 Hung-Sheng Chen. The code (including interface text, scene stories and dialogue written in the code) is licensed under the GNU GPL version 3 or later (GPL-3.0-or-later). Source code: ${L(RP+"/tree/main/source","source/")}, full license: ${L(R+"LICENSE","LICENSE")}. Original images, music, 3D models and long-form story are licensed under CC BY-NC-SA 4.0 (${L(R+"LICENSE-ASSETS.md","details")}); grandmaster biographies follow their original sources. The third-party components below are used under their own licenses.</p>
    <div class="sec-t" style="margin-top:6px">The Pikafish chess engine</div>
    <p style="margin:0 0 6px">Computer play and game analysis use the open-source engine Pikafish (version Pikafish-2026-09-06), compiled to WebAssembly and run on your device. It is licensed under the GNU GPL version 3.</p>
    <p style="margin:0 0 6px">As the GPL requires, our modified engine source and build method are public: ${L(RP+"/tree/main/pikafish-src","pikafish-src (modified file + build script)")}; original source: ${L("https://github.com/official-pikafish/Pikafish","official-pikafish/Pikafish")}; full license: ${L(R+"LICENSE-Pikafish-GPL3.txt","GPL-3.0")}.</p>
    <p style="margin:0 0 10px">The engine's neural network weights (pikafish.nnue) follow Pikafish's ${L(R+"NNUE-License.md","NNUE license")}: lawful use only, no commercial use without permission. Xiangqi Qianqiu is not used commercially.</p>
    <div class="sec-t">Other open-source components</div>
    <ul style="margin:0 0 10px;padding-left:1.2em"><li>three.js (3D garden, raised pieces) — MIT</li><li>opencc-js (Traditional/Simplified conversion) — MIT (${L(R+"LICENSE-opencc-js.txt","full license")})</li><li>jsQR (QR code reading) — Apache-2.0</li><li>QRCode.js (QR code generation) — MIT</li>
      <li>Dynasty fonts: Iansui, TW-Kai, LXGW WenKai TC, GenRyuMin, Zhuque Fangsong, Cactus Serif, GenWanMin — SIL OFL 1.1, subset to the characters used, with internal names changed (${L(R+"data/fonts/LICENSES.md","font list and sources")})</li></ul>
    <div class="sec-t">Where your data is stored</div>
    <p style="margin:0 0 6px">Game records, puzzle progress, characters, collections and settings are stored on <b>this device</b>${nat?" inside the app":" in your browser"} and are not uploaded to a cloud.</p>
    <p style="margin:0 0 6px">What the app sends or downloads over the network, when, and which switches control it are all listed in the privacy notes: <button type="button" class="btn ghost" id="alPriv" style="min-height:44px;margin-top:6px">🔒 Privacy notes ›</button></p>
    <p style="margin:0 0 8px">To delete all data on this device, use the button below (you'll be asked twice); ${nat?"deleting the app does the same":"deleting the app or clearing this site's data in your browser does the same"}. Deletion <b>can't be undone</b>; before changing phones, move your save with “Move to a new phone” in Settings.</p>
    <button class="btn ghost" id="alWipe" style="width:100%;color:var(--red);border-color:var(--red)">🗑 Delete all data on this phone</button></div>
    <button class="btn" id="alOk" style="width:100%;margin-top:14px">OK</button>`
    :`<p style="margin:0 0 10px">《象棋千秋》是一個推廣中國象棋的<b>免費、非商業</b>學習計畫：不收費、沒有內購、沒有廣告。</p>
    <p style="margin:0 0 10px">《象棋千秋》© 2026 陳泓昇（Hung-Sheng Chen）。程式碼（包括寫在程式裡的介面文字、場景小故事和對白）依 GNU GPL 第 3 版或更新版（GPL-3.0-or-later）授權，原始碼公開：${L(RP+"/tree/main/source","source/")}、${L(R+"LICENSE","授權全文")}。自製的圖片、音樂、3D 模型和長篇劇情依 CC BY-NC-SA 4.0 授權（${L(R+"LICENSE-ASSETS.md","說明")}）；特級大師小傳照原來源的條件。下面這些別人做的元件，照它們各自的授權使用。</p>
    <div class="sec-t" style="margin-top:6px">象棋引擎 Pikafish</div>
    <p style="margin:0 0 6px">電腦下棋和複盤分析用的是開源引擎 Pikafish（版本 Pikafish-2026-09-06），編成 WebAssembly 在手機裡跑，授權是 GNU GPL 第 3 版。</p>
    <p style="margin:0 0 6px">照 GPL 的規定，我們改過的引擎原始碼和建置方法都公開：${L(RP+"/tree/main/pikafish-src","pikafish-src（改過的檔案＋建置腳本）")}；原版原始碼：${L("https://github.com/official-pikafish/Pikafish","official-pikafish/Pikafish")}；授權全文：${L(R+"LICENSE-Pikafish-GPL3.txt","GPL-3.0")}。</p>
    <p style="margin:0 0 10px">引擎的神經網路權重（pikafish.nnue）照 Pikafish 的 ${L(R+"NNUE-License.md","NNUE 授權")}：只能合法使用、未經許可不得商用。《象棋千秋》不做商業用途。</p>
    <div class="sec-t">其他開源元件</div>
    <ul style="margin:0 0 10px;padding-left:1.2em"><li>three.js（3D 園子、立體棋子）— MIT</li><li>opencc-js（繁簡轉換）— MIT（${L(R+"LICENSE-opencc-js.txt","授權全文")}）</li><li>jsQR（讀 QR 碼）— Apache-2.0</li><li>QRCode.js（產生 QR 碼）— MIT</li>
      <li>朝代字型：芫荽、全字庫正楷體、霞鶩文楷、源流明體、朱雀仿宋、仙人掌明體、源雲明體 — SIL OFL 1.1，只取用到的字、改了內部名稱（${L(R+"data/fonts/LICENSES.md","字型清單與來源")}）</li></ul>
    <div class="sec-t">你的資料存在哪裡</div>
    <p style="margin:0 0 6px">對局紀錄、解題進度、角色、收藏和設定，都存在<b>這支手機</b>${nat?"的 App 裡":"的瀏覽器裡"}，不會上傳到雲端。</p>
    <p style="margin:0 0 6px">App 什麼時候會連網、送出或下載哪些東西、由哪些開關管，都寫在隱私說明：<button type="button" class="btn ghost" id="alPriv" style="min-height:44px;margin-top:6px">🔒 隱私說明 ›</button></p>
    <p style="margin:0 0 8px">想把這支手機裡的資料全部刪掉，按下面這顆按鈕（會確認兩次）；${nat?"刪掉 App 也一樣":"刪掉 App、或在瀏覽器清除這個網站的資料也一樣"}。刪掉後<b>無法復原</b>；換手機前請先用設定裡的「換手機」把存檔搬過去。</p>
    <button class="btn ghost" id="alWipe" style="width:100%;color:var(--red);border-color:var(--red)">🗑 刪除這支手機的全部資料</button></div>
    <button class="btn" id="alOk" style="width:100%;margin-top:14px">知道了</button>`);
    b.querySelector("#alOk").onclick=closeSheet;b.querySelector("#alWipe").onclick=()=>{closeSheet();setTimeout(wipeAsk,120)};
    /* 11/17 E 第 29 輪 R29-3：「會送出去的」不再自己列一份（會跟隱私說明走樣）→ 直接開同一份隱私說明（xqPrivSum：摘要＋privacy 文件） */
    {const pv=b.querySelector("#alPriv");if(pv)pv.onclick=()=>{try{vibrate(5)}catch(x){}closeSheet();setTimeout(()=>{try{xqPrivSum()}catch(x){}},120)}}})}catch(e){return lic0.apply(this,arguments)}};aboutLicSheet.__xq=1}
/* 11/17 iMac I P3：換手機按「舊手機・產生轉移碼」原本直接產生、直接上傳，沒有確認 → 先說清楚會發生什麼（照 05-settings／05b 的實際規則：整份存檔和棋譜庫用 10 碼轉移碼加密，
   暫放線上大廳伺服器 30 分鐘，新手機收下或按作廢就刪；這支手機的存檔照樣留著），按「產生轉移碼」才做。設定頁的 #xfOut、驛路文牒的左半驛券都叫 xfSend，包這一層兩邊都有 */
if(typeof xfSend==="function"&&!xfSend.__ask){const f0=xfSend;xfSend=function(){const en=typeof i18nLang==="function"&&i18nLang()==="en",a=arguments,self=this;
    return new Promise(res=>{modal(en?`<div class="em">🎒</div><h2>Create a transfer code?</h2><p data-noi18n style="text-align:left;line-height:1.7">Your whole save and game library will be encrypted with a 10-character transfer code and held on the online lobby server for <b>30 minutes</b>. Enter the code on the new phone within 30 minutes; the copy on the server is deleted as soon as the new phone receives it, or when you cancel the code. <b>The save on this phone stays here.</b></p>`
      :`<div class="em">🎒</div><h2>產生轉移碼？</h2><p style="text-align:left;line-height:1.7">會把這支手機的整份存檔和棋譜庫，用一組 10 碼的轉移碼加密，暫放在線上大廳的伺服器 <b>30 分鐘</b>。請在 30 分鐘內到新手機輸入；新手機收下、或你按「作廢這組碼」，伺服器上那一份就刪掉。<b>這支手機上的存檔照樣留著。</b></p>`,
      [[en?"Create code":"產生轉移碼",()=>{if(typeof xf4KidOff==="function"&&xf4KidOff()){if(typeof fmGate!=="function"){toast(typeof XF4_KIDMSG==="string"?XF4_KIDMSG:"兒童模式要先通過家長確認，才能產生轉移碼。");return res(null)}fmGate("兒童模式：轉移碼會把整份存檔加密後暫放到線上伺服器，請家長先答一題。",()=>{xf4PgOk();res(f0.apply(self,a))});return}res(f0.apply(self,a))}],[en?"Cancel":"取消",()=>res(null),true]])})};xfSend.__ask=1}   /* W158②：兒童模式（或家長關掉大廳）產生轉移碼要先過家長確認題（07m5 fmGate），答對才 xf4PgOk()，xf4Upload 沒有這個許可就不上傳 */
/* 11/17 iMac I P2：驛路文牒整張圖照畫面縮放，文牒上的「隱私說明 ›」縮到約 6～8pt。07s4 不改（reps 管）：在文牒的標題列（.hq-h，不跟著縮放）補一顆正常大小的「🔒 隱私說明」（15px、44 高），點了一樣開 xqPrivSum */
try{setInterval(()=>{try{if(!/^#\/settings/.test(location.hash||""))return;document.querySelectorAll(".hq-pn .hq-h").forEach(h=>{if(h.querySelector(".xq-hq-pv"))return;const b=document.createElement("button");b.type="button";b.className="xq-hq-pv";
    b.textContent=(typeof i18nLang==="function"&&i18nLang()==="en")?"🔒 Privacy":"🔒 隱私說明";b.style.cssText="margin-left:auto;min-height:44px;padding:0 12px;border:1.5px solid #8a2a18;border-radius:99px;background:rgba(255,248,236,.9);color:#8a2a18;font:800 15px/1.2 var(--serif,serif);cursor:pointer";
    b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(x){}xqPrivSum()};const x=h.querySelector("button[aria-label]");if(x){x.style.marginLeft="6px";h.insertBefore(b,x)}else h.append(b)})}catch(e){}},700)}catch(e){}
/* 11/18 第 30 輪 R30-3：英文文牒的「Developer Hung-Sheng Chen」跟右邊驛券的「Generate code」黏在一起——07s4 的縮字（pn._tf → hqFitAll）是在中文時量的，
   翻譯器（外掛字典晚到）把字換成比較長的英文以後沒有重量，字超出文牒那一格。07s4 不改（reps 管）：文牒開著時文牒、驛券的字變了就叫 pn._tf() 重量一次 */
/* 11/18 第 32 輪 N32-1：英文文牒「關掉再打開第二次」驛券、版本那格又變回大字——07s4 hqOpen 是先 pn._fit()（量、縮）再 pn._paint()（重寫文牒內容），
   第二次打開時新寫的字沒有被量；字跟上次一樣，上面的簽名也就不再叫重量。另外面板還沒排好、量到 0 時 hqFitAll 會先拿掉縮放再直接 return。
   改：① 包住 pn._paint，每次重寫完下一格、再下一格、0.35 秒（英文翻譯換好字）各重量一次；② 包住 pn._tf，文牒或驛券那格量到 0 就延到下一格再量（最多 30 格）。打開第幾次都一樣（xqHqWrap 是給測試用的純包裝） */
function xqHqWrap(pn,raf,later){if(!pn||pn._xqWrap)return;pn._xqWrap=1;raf=raf||(f=>requestAnimationFrame(f));later=later||((f,ms)=>setTimeout(f,ms));
  if(typeof pn._tf==="function"){const t0=pn._tf;pn._tf=function(){const d=pn.querySelector(".hq-doc"),q=pn.querySelector(".hq-q"),ok=!!(d&&d.clientWidth>0&&d.clientHeight>0&&(!q||q.clientWidth>0&&q.clientHeight>0));
    if(!ok){pn._xqTfN=(pn._xqTfN|0)+1;if(pn._xqTfN<=30)raf(()=>pn._tf());return}pn._xqTfN=0;return t0.apply(this,arguments)}}
  if(typeof pn._paint==="function"){const p0=pn._paint;pn._paint=function(){const r=p0.apply(this,arguments);pn._xqSig=null;raf(()=>raf(()=>{try{pn._tf()}catch(e){}}));later(()=>{try{pn._tf()}catch(e){}},350);return r}}}
try{if(typeof hqOpen==="function"&&!hqOpen.__xq){const o0=hqOpen;hqOpen=function(v){const r=o0.apply(this,arguments);try{const pn=v&&v.querySelector&&v.querySelector(".hq-pn");if(pn){const first=!pn._xqWrap;xqHqWrap(pn);if(first)requestAnimationFrame(()=>requestAnimationFrame(()=>{try{pn._tf()}catch(e){}}))}}catch(e){}return r};hqOpen.__xq=1}}catch(e){}   /* 第一次打開就包上（不等下面每 0.5 秒的檢查） */
try{setInterval(()=>{try{if(!/^#\/settings/.test(location.hash||""))return;document.querySelectorAll(".hq-pn").forEach(pn=>{try{xqHqWrap(pn)}catch(e){}});document.querySelectorAll(".hq-pn.open").forEach(pn=>{if(typeof pn._tf!=="function")return;const di=pn.querySelector(".hq-di"),q=pn.querySelector(".hq-q"),sig=(di?di.textContent:"")+"|"+(q?q.textContent:"")+"|"+innerWidth;
    if(pn._xqSig===sig)return;pn._xqSig=sig;pn._tf()})}catch(e){}},500)}catch(e){}
/* 11/18 第 31 輪 N31-2：改過視窗大小（轉向、分割畫面）以後文牒又疊字——07s4 沒接 resize，框（.hq-fr）照舊、縮字也照舊；上面那個每 0.5 秒的檢查又可能在版面還沒排好時就量完記下來 →
   resize、orientationchange 時先照新尺寸排框（pn._fit，裡面會再叫 pn._tf：文牒和驛券兩格都重量），0.3 秒、0.9 秒後各再量一次；
   驛券下面的「換手機」小標（英文 Move to a new phone）原本不換行、置中在券下，比券寬就往左壓到「Check for updates」→ 最寬＝券的寬度（31%），放不下換兩行 */
try{const hqRe=()=>{try{document.querySelectorAll(".hq-pn.open").forEach(pn=>{pn._xqSig=null;try{if(typeof pn._fit==="function")pn._fit();else if(typeof pn._tf==="function")pn._tf()}catch(e){}})}catch(e){}};let hqT=[];
  const onRs=()=>{hqT.forEach(clearTimeout);hqT=[setTimeout(hqRe,300),setTimeout(hqRe,900)]};addEventListener("resize",onRs);addEventListener("orientationchange",onRs)}catch(e){}
try{const s=document.createElement("style");s.id="xqHqLbCss";s.textContent=".hq-pn .hq-lb{max-width:31%;white-space:normal;text-align:center;line-height:1.15}";document.head.append(s)}catch(e){}
try{document.addEventListener("click",e=>{const t=e.target&&e.target.closest&&e.target.closest(".hq-pv");if(!t)return;e.preventDefault();e.stopImmediatePropagation();try{vibrate(5)}catch(x){}xqPrivSum()},true)}catch(e){}
