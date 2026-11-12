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
   App 每次打開、每次進大廳都抓一次（最多每 10 分鐘一次），fetch 用 no-store；網址帶 ?pre=1，src/sw.js 才不會攔下來拿舊的快取（sw.js 一般 json 是先看快取）。
   抓到存在 xq_banList，離線時用上次的。名單上的別人＝已封鎖（XQ_BLOCKED）；自己在名單上（XQ_SELFBANNED）：大廳只顯示說明，src/net.js 不公開在線狀態、不能邀請配對報名 ---------- */
const LBS_BAN_GAP=10*60000;
let LBS_BANC=null;
function lbsBanIds(){if(LBS_BANC)return LBS_BANC;const B=lbsLs.get("banList",null);LBS_BANC=B&&B.ids&&typeof B.ids==="object"?B.ids:{};return LBS_BANC}
function lbsBanned(id){return!!id&&Object.prototype.hasOwnProperty.call(lbsBanIds(),String(id))}
window.XQ_BANNED=id=>lbsBanned(id);
window.XQ_SELFBANNED=()=>{try{return lbsBanned(meInfo().id)}catch(e){return false}};
let LBS_BAN_P=null;
function lbsBanFetch(){if(LBS_BAN_P)return LBS_BAN_P;if(Date.now()-(+lbsLs.get("banAt",0)||0)<LBS_BAN_GAP)return Promise.resolve(false);lbsLs.set("banAt",Date.now());
  LBS_BAN_P=fetch("data/banlist.json?pre=1&t="+Math.floor(Date.now()/60000),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{if(!j||typeof j.ids!=="object"||!j.ids)return false;
    const old=JSON.stringify(lbsBanIds());lbsLs.set("banList",{v:j.v||1,at:j.at||"",ids:j.ids,got:Date.now()});LBS_BANC=null;if(JSON.stringify(j.ids)!==old)lbsPing();return true}).catch(()=>false).finally(()=>{LBS_BAN_P=null});return LBS_BAN_P}
setTimeout(()=>{try{if(OFF)lbsBanFetch()}catch(e){}},2500);
/* 改了名單：重送一次自己的在線狀態，伺服器回傳那一則時大廳就會重畫（net.js 收到 u/ 會發 people） */
function lbsPing(){LBS_SET=null;try{if(window.XQNet&&XQNet.refresh)XQNet.refresh()}catch(e){}try{window.dispatchEvent(new CustomEvent("xq-block"))}catch(e){}}
function lbsBlock(p){if(!p||!p.id)return;const L=lbsList().filter(x=>x.id!==p.id);L.push({id:String(p.id),name:String(p.name||"棋友").slice(0,16),at:Date.now()});store.set("lbBlock",L.slice(-300));lbsPing();toast(`🚫 已封鎖 ${p.name||"這位棋友"}`)}
function lbsUnblock(id){const L=lbsList(),x=L.find(q=>q.id===id);store.set("lbBlock",L.filter(q=>q.id!==id));lbsPing();toast(`已解除封鎖${x&&x.name?" "+x.name:""}`)}
function lbsInGameWith(id){try{const G=window.XQNet&&XQNet.game&&XQNet.game();return!!(G&&!G.result&&G.red&&G.black&&(G.red.id===id||G.black.id===id))}catch(e){return false}}
function lbsBlockAsk(p,after){if(!p||!p.id)return;const ing=lbsInGameWith(p.id)&&XQNet.side&&XQNet.side();
  modal(`<div class="em">🚫</div><h2>封鎖 ${esc(p.name||"這位棋友")}？</h2><div style="text-align:left;line-height:1.8;font-size:14.5px;margin:6px 0">封鎖以後，在這支手機上：<br>・他不會出現在名冊和大廳燈籠裡<br>・他送來的邀請會自動婉拒<br>・隨機配對會避開他<br>・對局中不顯示他的表情和聊天</div>
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
function lbsMineFetch(force){if(LBS_MINE_P)return LBS_MINE_P;if(!force&&Date.now()-LBS_MINE_AT<10*60000)return Promise.resolve([]);if(!lbsMine().some(x=>{const k=lbsMineState(x);return k==="sent"||k==="seen"||k==="q"}))return Promise.resolve([]);LBS_MINE_AT=Date.now();
  LBS_MINE_P=fetch("data/fixes.json?v="+encodeURIComponent(window.XQ_BUILD||"")).then(r=>r.ok?r.json():null).then(j=>j&&j.reports?lbsMineApply(j.reports):[]).catch(()=>[]).finally(()=>{LBS_MINE_P=null});return LBS_MINE_P}
setTimeout(()=>{try{if(OFF)lbsMineFetch().then(n=>{if(n&&n.length)toast(`🛠 你的檢舉 ${n[0]}${n.length>1?` 等 ${n.length} 筆`:""} 開發者已處理了`)})}catch(e){}},9000);
function lbsMineWhen(t){try{return new Date(+t||Date.now()).toLocaleString("zh-TW",{hour12:false,month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch(e){return""}}
function lbsMineSheet(){lbsCss();sheet("🚩 我的檢舉",b=>{const paint=()=>{const L=lbsMineSync(store.get("fbQueue",[])).slice().reverse();
    b.innerHTML=`<p style="margin:0 0 6px;font-size:14px;line-height:1.7">每一筆檢舉都有一個編號。<b>如果要詢問進度，告訴開發者這個編號。</b></p>
      <p class="muted" style="margin:0 0 10px;font-size:12.5px;line-height:1.7">📮 排隊中 → ✅ 已從手機送出 → 🛠 已處理。「已從手機送出」只代表手機送出去了（表單不會回收件確認）；開發者處理好、App 抓到新的處理紀錄以後，才會標「🛠 已處理」。這份清單只存在這支手機，只記編號、時間、對象名字和狀態。</p>`+
      (L.length?L.map(x=>{const k=lbsMineState(x),S=LBS_ST[k];return`<div class="card lbs-mi"><div class="lbs-mi-h"><b class="lbs-rid">${esc(x.rid)}</b><span class="lbs-st lbs-st-${k}">${S[0]} ${S[1]}</span></div>
        <div class="muted" style="font-size:13px">檢舉 ${esc(x.name||"棋友")}・${esc(lbsMineWhen(x.at))}${k==="done"&&x.dnAt?"・"+esc(x.dnAt)+" 處理":""}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${S[2]}</div></div>`}).join("")
        :'<div class="card muted" style="text-align:center">還沒有檢舉過任何人</div>')};
  paint();lbsMineFetch(true).then(()=>{if(b.isConnected)paint()})})}

/* ---------- 回饋 841：檢舉 ---------- */
function lbsWhere(id){let s="";try{const G=XQNet.game&&XQNet.game();if(G&&G.red&&G.black&&(G.red.id===id||G.black.id===id))s=(XQNet.side&&XQNet.side()?"對局中（他是我的對手）":"觀戰中（他在下這盤）")+"・對局代號 "+(G.gid||"")+"・第 "+(G.moves?G.moves.length:0)+" 步"}catch(e){}
  const h=location.hash||"#/";return(s||(/^#\/lobby/.test(h)?"線上大廳":/^#\/watch/.test(h)?"觀戰列表":/^#\/db/.test(h)?"棋譜":"其他頁"))+"（"+h+"）"}
function lbsReport(p){if(!p||!p.id)return;const R=store.get("lbRep",{})||{},last=+R[p.id]||0;
  if(Date.now()-last<LBS_REP_GAP)return toast(`${Math.max(1,Math.round((Date.now()-last)/60000))} 分鐘前已經檢舉過 ${p.name||"他"}，不用再送；編號和狀態在「🛡 線上大廳 → 🚩 我的檢舉」`);   /* 檢舉追蹤編號：原本說「報告已經記在手機裡」，現在手機真的有一份「我的檢舉」（編號、狀態） */
  sheet("🚩 檢舉",b=>{let why="";
    b.innerHTML=`<p style="margin:0 0 8px">檢舉 <b>${esc(p.name||"棋友")}</b></p><p class="muted" style="font-size:13px;margin:0 0 10px">開發者會收到他的代號、名字和你選的原因。他不會知道是誰檢舉的。送出後會給你一個檢舉編號。</p>
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
      const text=["["+rid+"] 🚩 檢舉線上玩家",`被檢舉的人：${p.name||"（沒有名字）"}`,`對方 ID：${p.id}`,`原因：${W?W[1]:why}`,note?`補充：${note}`:"",`在哪裡：${lbsWhere(p.id)}`,`時間：${tw}（臺灣時間）／${d.toISOString()}`,
        live&&live.pts!=null&&window.XQNet&&XQNet.rankOf?`對方資料：${XQNet.rankOf(live.pts)} ${live.pts} 分${live.city?"・"+live.city:""}${live.kind?"・"+live.kind:""}`:"",
        chat.length?"對方最近的聊天：\n"+chat.join("\n"):"",also?"（檢舉的人同時封鎖了他）":""].filter(Boolean).join("\n");
      lbsMineAdd(rid,p.name,Date.now());
      let ok=false;try{const info=await feedbackInfo();ok=await sendRecord(Object.assign({},info,{type:"🚩 檢舉",text,contact:"",rid}))}catch(err){ok=false;try{lbsMineSet(rid,"lost")}catch(e){}}   /* rid 不在 FEEDBACK_FORM.entries 裡，postForm 不會送出這一格，只拿來在 fbQueue 裡認出是哪一筆 */
      const R3=store.get("lbRep",{})||{};R3[p.id]=Date.now();for(const k in R3)if(Date.now()-R3[k]>864e5)delete R3[k];store.set("lbRep",R3);
      closeSheet();if(also)lbsBlock(p);setTimeout(()=>lbsReportDone(rid,ok),280)}})}   /* 開發者 11/11 選 ChatGPT UI-13、大廳規劃書案 01：表單送不回收件確認，所以只說「從手機送出」，不說「已收到」；沒網路時真的排在手機裡（fbQueue，開 App、恢復連線時補送） */
/* 送出後的回條：給編號、說現在是排隊中還是已從手機送出 */
function lbsReportDone(rid,ok){lbsCss();
  modal(`<div class="em">🚩</div><h2 style="margin-bottom:4px">檢舉編號</h2><div class="lbs-rid" style="font-size:24px;font-weight:900;margin:0 0 8px">${esc(rid)}</div>
    <p style="text-align:left;line-height:1.75;font-size:14.5px;margin:6px 0">${ok?"✅ <b>已從手機送出</b>：手機已把檢舉送出去。":"📮 <b>排隊中</b>：現在送不出去，檢舉先存在這支手機，有網路會自動補送。"}開發者處理好以後，「🚩 我的檢舉」會標成「🛠 已處理」。</p>
    <p class="muted" style="font-size:13px;margin:4px 0">如果要詢問進度，告訴開發者這個編號。對方不會知道是誰檢舉的。</p>`,[["知道了",null],["看我的檢舉",()=>lbsMineSheet(),true]])}

/* ---------- 回饋 841：資料卡加按鈕（包一層 oppCard；07x3-rostermap.js 的名帖外觀也包在裡面） ---------- */
function lbsCss(){if(document.getElementById("lbsCss"))return;const s=document.createElement("style");s.id="lbsCss";
  s.textContent=`.lbs-row{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin:12px 0 2px;padding-top:10px;border-top:1px dashed var(--line)}
.lbs-row button{font:inherit;font-size:14px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:inherit;cursor:pointer}
.lbs-row button[data-lbs="blk"]{color:var(--red,#b3261e)}.lbs-row .muted{font-size:13px}
.lbs-why .item.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--card))}
.lbs-bl{display:flex;align-items:center;gap:10px;margin-bottom:8px}.lbs-bl b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lbSafe .opt button{flex:1;min-width:0}
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
window.XQ_PUBNAME=m=>lbsMode()==="t"?lbsTitle(m&&m.id):"";
/* 線上有人跟我的稱號一樣（很少見）：不在對局時換一個（隨機起點，兩個人同時換也不會又撞在一起） */
let LBS_RER=0;
if(window.XQNet&&XQNet.on)XQNet.on("people",()=>{if(lbsMode()!=="t"||Date.now()-LBS_RER<60000)return;try{if(XQNet.active())return;const t=lbsTitle(),i=XQNet.me().id;
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

/* ---------- 設定「角色」分頁：🛡 線上大廳（#lbSafe） ---------- */
function lbsBlockSheet(){sheet("🚫 我封鎖的人",b=>{const paint=()=>{const L=lbsList().slice().reverse();
    b.innerHTML=`<p class="muted" style="margin:0 0 10px;font-size:13.5px">封鎖的人不會出現在名冊和燈籠裡，邀請會自動婉拒，配對會避開，對局中不顯示他的表情和聊天。名單只存在這支手機。</p>`+
      (L.length?L.map(x=>`<div class="card lbs-bl"><b>${esc(x.name||"棋友")}</b><span class="muted" style="font-size:12px">${new Date(x.at||Date.now()).toLocaleDateString()}</span><button class="pill" data-un="${esc(x.id)}" style="padding:6px 12px;font-size:13.5px">解除</button></div>`).join("")
        :'<div class="card muted" style="text-align:center">還沒有封鎖任何人</div>');
    b.querySelectorAll("[data-un]").forEach(x=>x.onclick=()=>{vibrate(5);lbsUnblock(x.dataset.un);paint();lbsSetPaint()})};paint()})}
function lbsSetHTML(){const t=lbsMode()==="t",n=lbsList().length,nm=(window.myName&&myName())||"";
  return`<div class="sec-t">🛡 線上大廳</div><div class="card"><div><b>在線上大廳顯示</b><br><span class="muted" style="font-size:13px">別人在大廳、對局、觀戰看到的名字。你自己的畫面照常顯示你取的名字。</span></div>
    <div class="opt" id="lbsNm" style="margin:8px 0 6px"><button data-nm="t"${t?' class="on"':""}>🏮 稱號</button><button data-nm="n"${t?"":' class="on"'}>✍ 我取的名字</button></div>
    <div class="muted" style="font-size:13px">現在別人看到：<b style="color:var(--ink,inherit)">${esc(t?lbsTitle():(nm||"棋友"))}</b>${t?"（系統給的稱號）":""}</div></div>
    <button class="item card" id="lbsBl" style="width:100%;margin:8px 0 4px;font:inherit;color:inherit"><span class="lb">🚫</span><span class="tx" style="flex:1"><b>我封鎖的人（${n}）</b><span class="muted" style="display:block;font-size:12.5px">看名單、解除封鎖</span></span><span class="muted">›</span></button>
    <button class="item card" id="lbsMy" style="width:100%;margin:4px 0;font:inherit;color:inherit"><span class="lb">🚩</span><span class="tx" style="flex:1"><b>我的檢舉（${lbsMine().length}）</b><span class="muted" style="display:block;font-size:12.5px">看檢舉編號和處理狀態</span></span><span class="muted">›</span></button>
    <button class="item card" id="lbsIn" style="width:100%;margin:4px 0;font:inherit;color:inherit"><span class="lb">📖</span><span class="tx" style="flex:1"><b>線上大廳安全須知</b><span class="muted" style="display:block;font-size:12.5px">快捷語、個資、檢舉封鎖、家長關閉大廳</span></span><span class="muted">›</span></button>
    <p class="muted" style="font-size:12.5px;margin:4px 2px 10px">遇到不舒服的名字或聊天：點他的名字，資料卡最下面有「🚩 檢舉」「🚫 封鎖」。</p>`}
function lbsSetPaint(){const w=document.getElementById("lbSafe");if(!w)return;w.innerHTML=lbsSetHTML();
  w.querySelectorAll("[data-nm]").forEach(x=>x.onclick=()=>{vibrate(5);lbsSetMode(x.dataset.nm,lbsSetPaint)});
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
      <h2 style="font-family:var(--serif);margin:6px 0 8px">兒童模式：線上大廳關著</h2><p style="margin:0 0 6px">兒童模式不跟陌生人互動：線上大廳、千秋盃、觀戰都不開，資料也不送出去。</p>
      <p style="margin:0 0 6px">想跟家人朋友下棋，可以用<b>同桌對弈</b>（同一支手機兩個人輪流下）；挑戰電腦、石桌往事、殘局、棋譜都照常可以玩。</p>
      <p class="muted" style="font-size:13.5px;margin:0 0 14px">想打開，請家長到「設定房間的 🔒 小鎖匣 → 👪 家長與護眼 → 👧 兒童模式」。</p>
      <button class="btn" id="lbpPvp">👥 同桌對弈</button><button class="btn ghost" id="lbpSet" style="margin-top:8px">⚙ 到設定</button><button class="btn ghost" id="lbpHome" style="margin-top:8px">回首頁</button></div></div>`;
    v.querySelector("#lbpPvp").onclick=()=>{location.hash="#/pvp"};v.querySelector("#lbpSet").onclick=()=>{location.hash="#/settings"};v.querySelector("#lbpHome").onclick=()=>{try{goHome()}catch(e){location.hash="#/"}};return{}}
  v.innerHTML=`<div class="pad"><div class="card" style="text-align:center;padding:26px 18px;margin-top:14px;line-height:1.8"><div style="font-size:44px">👪</div>
    <h2 style="font-family:var(--serif);margin:6px 0 8px">線上大廳已由家長關閉</h2><p style="margin:0 0 6px">挑戰電腦、石桌往事、殘局、棋譜這些單機功能都照常可以玩。</p>
    <p class="muted" style="font-size:13.5px;margin:0 0 14px">想打開，請家長到「設定房間的 🔒 小鎖匣 → 👪 家長與護眼 → 🔒 家長修改」。</p>
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
    <p>👪 <b>家長可以關掉大廳</b>：「設定房間的 🔒 小鎖匣 → 👪 家長與護眼」可以關閉線上大廳，或打開「👧 兒童模式」（不跟陌生人互動、資料不送出、提醒休息）。</p></div>
    <p class="muted" style="font-size:12.5px;margin:4px 0 0">${again?"":"這張說明只會自動跳一次；"}之後可以在「設定房間的 🔒 小鎖匣 → 🛡 大廳安全須知」再看。</p>`,[["我知道了",null]])}
if(typeof Lobby==="function"){const f2=Lobby;Lobby=function(v){const r=f2.apply(this,arguments);
  try{if(!store.get("lbIntro",0)&&!window.XQ_SELFBANNED())setTimeout(()=>{try{if(/^#\/lobby/.test(location.hash)&&!store.get("lbIntro",0)&&!window.XQ_SELFBANNED())lbsIntro(false)}catch(e){}},700)}catch(e){}return r}}
