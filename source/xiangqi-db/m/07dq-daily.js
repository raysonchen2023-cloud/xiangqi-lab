/* ================= 🌏 每日同題（評比循環第 13 輪 F1：rubric P68.1～P68.3、P49.1「每日殘局＋無雷分享」）=================
   像 Wordle：全世界同一天拿到同一題（一盞茶殘局題庫 data/canju/canju-set.json 裡挑），解完或看答案後可以分享一段「不劇透」的成績：
     象棋千秋 每日殘局 #1 🍵一盞
     🟩🟩🟨🟩 4 步・走錯 1 次・沒看提示
     https://…/#/daily/2026-11-13
   ・同題怎麼保證：只用「臺灣日期」（UTC+8，跟手機時區無關）和題目編號算雜湊（dqHash），不用匿名碼、存檔、解過哪些題；離線也一樣。
     星期決定份量：週一二 ☕一口（短殺、難度 ≤3.5）、週三到五 🍵一盞（短殺／中殺 3.5～5.5）、週六日 🫖一壺（中殺、多步大師收官 5.5～8）。
     同一份量前 DQ.NOREP 天「第一順位」挑到的題今天不再出（題庫夠大時幾乎不會重複）。
   ・方格：每一步一格。🟩 一次走對、🟨 走錯過才走對、🟦 用了提示（含免費的方向提示）、⬛ 看答案（從那一步起）；色弱模式（cbMode）改 🟧🟦⬜⬛。
     每一步的紀錄由 07c-canju.js CanjuPlay 記在解題進度 R.sx（cjSx），解完時 XM.fin 交給這裡記成績。
   ・網址：#/daily → 今天；#/daily/<日期> → 那天的題（解過就顯示成績頁）；#/daily/<日期>/play → 再解一次（不改成績）。
     過了當天也能補玩（記成「補玩」，不算連續天數）；比 DQ.EPOCH 早、或還沒到的日期不開。
   ・存檔：store "dqDaily"（localStorage m_dqDaily）＝{v:1,d:{日期:{id,n,sq,m,h,a,w,l,at,s}}}，每天只記第一次的結果；sq＝每步一個字母 g/y/h/x。
   ・分享的內容只有：App 名、第幾號、份量、方格、步數、走錯次數、有沒有看提示／答案、網址（帶日期）。沒有名字、裝置代號、匿名碼、存檔、著法。
   路由：02-shell.js 的 #/daily → DailyPage；一盞茶頁（07c-canju.js CanjuDaily）上面多一張「🌏 每日同題」卡（dqCardHTML／dqCardBind）。
   說明：art/docs/daily.md。測試：xiangqi-lab/tools/test-daily.js */
const DQ={EPOCH:"2026-11-13",KEY:"dqDaily",RK:"cjRunDQ",NOREP:28,KEEP:1200,
  SLOT:{sip:["一口","☕"],cup:["一盞","🍵"],pot:["一壺","🫖"]},
  WANT:{sip:x=>x.t==="短殺"&&x.d<=3.5,cup:x=>(x.t==="短殺"||x.t==="中殺")&&x.d>3.5&&x.d<=5.5,pot:x=>(x.t==="中殺"||(x.t==="大師收官"&&x.n>=3))&&x.d>5.5&&x.d<=8},
  EMO:{g:"🟩",y:"🟨",h:"🟦",x:"⬛"},EMO_CB:{g:"🟧",y:"🟦",h:"⬜",x:"⬛"},
  WORD:{g:"一次走對",y:"走錯過才走對",h:"用了提示",x:"看答案"}};

/* ---------- 日期、編號、挑題（純函式，測試直接呼叫） ---------- */
function dqToday(t){return new Date((t==null?Date.now():t)+8*36e5).toISOString().slice(0,10)}
const dqDN=k=>Math.round(Date.parse(k+"T12:00:00Z")/864e5);
function dqAdd(k,n){return new Date(Date.parse(k+"T12:00:00Z")+n*864e5).toISOString().slice(0,10)}
const dqNo=k=>dqDN(k)-dqDN(DQ.EPOCH)+1;
function dqSlot(k){const w=new Date(Date.parse(k+"T12:00:00Z")).getUTCDay();return w===1||w===2?"sip":w===0||w===6?"pot":"cup"}
function dqHash(s){let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}h^=h>>>16;h=Math.imul(h,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);h^=h>>>16;return h>>>0}
/* 日期不對就回傳原因（給畫面顯示），對就回傳 "" */
function dqBad(k,t){t=t||dqToday();if(!/^\d{4}-\d{2}-\d{2}$/.test(String(k||""))||isNaN(Date.parse(k+"T12:00:00Z"))||dqAdd(k,0)!==k)return"這個每日同題的網址看不懂（日期要像 2026-11-13）。";
  if(k<DQ.EPOCH)return`每日同題從 ${DQ.EPOCH.replace(/-/g,"/")} 開始，這一天還沒有題。`;
  if(k>t)return"這一天還沒到，題目還沒出（臺灣時間 0:00 換題）。";return""}
function dqPool(D,s){const c=D._dqP||(D._dqP={});if(!c[s]){const f=DQ.WANT[s],ok=x=>x&&x.id&&x.tree&&x.n>0;let p=D.items.filter(x=>ok(x)&&f(x));if(!p.length)p=D.items.filter(ok);c[s]=p}return c[s]}
function dqBest(P,k,no){let best=null,bh=0;for(const x of P){if(no&&no.has(x.id))continue;const h=dqHash(k+"|"+x.id);if(!best||h<bh||(h===bh&&x.id<best.id)){best=x;bh=h}}return best}
/* 那一天的題：同份量的題裡雜湊最小的；前 NOREP 天同份量第一順位的題跳過（題不夠時就不跳） */
function dqPick(D,k){const s=dqSlot(k),P=dqPool(D,s);if(!P.length)return null;const no=new Set();
  for(let i=1;i<=DQ.NOREP;i++){const j=dqAdd(k,-i);if(j<DQ.EPOCH)break;if(dqSlot(j)===s){const r=dqBest(P,j,null);if(r)no.add(r.id)}}
  return dqBest(P,k,no.size<P.length?no:null)}

/* ---------- 成績 ---------- */
function dqAll(){const A=store.get(DQ.KEY,null);return A&&A.d&&typeof A.d==="object"?A:{v:1,d:{}}}
const dqRec=k=>dqAll().d[k]||null;
/* 方格字串：每一步 g／y／h／x；看了答案的那一步起都是 x */
function dqSq(R,n){R=R||{};const X=R.sx||{},at=R.ans?Math.min(n,(R.path||[]).length):n;let s="";
  for(let i=0;i<n;i++){const e=X[i]||{};s+=i>=at?"x":(e.h|0)>0?"h":(e.m|0)>0?"y":"g"}return s}
/* 解完（XM.fin）：每天只記第一次；開始或解完是在那一天（臺灣時間）就不算補玩 */
function dqRecord(k,o){const A=dqAll();if(A.d[k])return A.d[k];o=o||{};const R=o.R||{},P=o.P||{},n=Math.max(1,P.n|0),now=Date.now();
  const late=k!==dqToday(now)&&!(R.t0&&dqToday(R.t0)===k);
  const r={id:String(P.id||""),n,sq:dqSq(R,n),m:R.mist|0,h:R.hm|0,a:R.ans?1:0,w:R.ans?0:1,l:late?1:0,at:now,s:Math.round((+o.ms||0)/1000)};
  A.d[k]=r;const ks=Object.keys(A.d).sort();while(ks.length>DQ.KEEP)delete A.d[ks.shift()];store.set(DQ.KEY,A);return r}
/* Wordle 式統計：已玩、勝率（沒看答案＝勝）、目前連續、最長連續（只算當天解開的，補玩不算）、走錯次數分佈 */
function dqStats(t){const D=dqAll().d,ks=Object.keys(D).sort(),t0=t||dqToday();const played=ks.length,wins=ks.filter(k=>D[k].w).length;
  const ok=k=>!!(D[k]&&D[k].w&&!D[k].l);let cur=0;
  if(!(D[t0]&&!ok(t0))){let k=ok(t0)?t0:dqAdd(t0,-1);while(ok(k)){cur++;k=dqAdd(k,-1)}}
  let max=0,run=0,prev=null;for(const k of ks){if(ok(k)){run=prev&&dqDN(k)-dqDN(prev)===1?run+1:1;prev=k;if(run>max)max=run}else{run=0;prev=null}}
  const dist=[0,0,0,0,0];for(const k of ks)if(D[k].w)dist[Math.min(4,D[k].m|0)]++;
  return{played,wins,pct:played?Math.round(wins*100/played):0,cur,max,dist,fail:played-wins}}

/* ---------- 分享文字、網址 ---------- */
function dqCb(){try{return typeof cbOn==="function"?!!cbOn():!!store.get("cbMode",false)}catch(e){return false}}
function dqEmo(sq,cb){const E=cb?DQ.EMO_CB:DQ.EMO;return[...String(sq||"")].map(c=>E[c]||E.x).join("")}
function dqLine(r){return`${r.n} 步・`+(r.a?"看了答案":(r.m?`走錯 ${r.m} 次・`:"")+(r.h?"用了提示":"沒看提示"))}
function dqBase(){let o="",p="/";try{o=location.origin||"";p=location.pathname||"/"}catch(e){}
  if(/^https:\/\//.test(o)&&!/^https:\/\/(localhost|127\.|\[::1\])/.test(o))return o+p;return typeof APP_HOME!=="undefined"?APP_HOME:"https://raysonchen2023-cloud.github.io/xiangqi-lab/"}
const dqUrl=(k,base)=>(base||dqBase())+"#/daily/"+k;
function dqText(k,o){o=o||{};const r=o.rec||dqRec(k);if(!r)return"";const sl=DQ.SLOT[dqSlot(k)];
  return`象棋千秋 每日殘局 #${dqNo(k)} ${sl[1]}${sl[0]}${r.l?"・補玩":""}\n${dqEmo(r.sq,o.cb==null?dqCb():o.cb)} ${dqLine(r)}\n${dqUrl(k,o.base)}`}

/* ---------- 成績圖（canvas；不支援就回傳 null） ---------- */
function dqImg(k){const r=dqRec(k);if(!r||typeof document==="undefined")return Promise.resolve(null);let cv,g;try{cv=document.createElement("canvas");g=cv.getContext&&cv.getContext("2d")}catch(e){}
  if(!g||!cv.toBlob)return Promise.resolve(null);const cb=dqCb(),C=cb?{g:"#E8812F",y:"#3B7BD8",h:"#F2F2F2",x:"#2E2E2E"}:{g:"#3A9D5D",y:"#D9A520",h:"#3B7BD8",x:"#2E2E2E"};
  const n=r.sq.length,S=n>6?44:56,G=10,W=Math.max(540,n*(S+G)+80),H=320,sl=DQ.SLOT[dqSlot(k)];cv.width=W;cv.height=H;
  g.fillStyle="#F6EFE0";g.fillRect(0,0,W,H);g.strokeStyle="#C9962B";g.lineWidth=4;g.strokeRect(8,8,W-16,H-16);g.textAlign="center";
  g.fillStyle="#8B1E1E";g.font="bold 32px serif";g.fillText("象棋千秋 每日殘局",W/2,62);
  g.fillStyle="#3A3226";g.font="24px sans-serif";g.fillText(`#${dqNo(k)}・${sl[0]}・${k.replace(/-/g,"/")}${r.l?"・補玩":""}`,W/2,100);
  const x0=(W-(n*S+(n-1)*G))/2;for(let i=0;i<n;i++){const c=r.sq[i];g.fillStyle=C[c]||C.x;g.fillRect(x0+i*(S+G),126,S,S);if(c==="h"&&cb){g.strokeStyle="#555";g.lineWidth=2;g.strokeRect(x0+i*(S+G)+1,127,S-2,S-2)}}
  g.fillStyle="#3A3226";g.font="bold 24px sans-serif";g.fillText(dqLine(r),W/2,126+S+48);
  g.fillStyle="#7A6E5E";g.font="18px sans-serif";g.fillText("每天一題・大家同一題・不劇透",W/2,H-28);
  return new Promise(res=>{try{cv.toBlob(b=>res(b||null),"image/png")}catch(e){res(null)}})}

/* ---------- 分享：手機用 Web Share API；不支援就複製到剪貼簿；圖片不能分享就存檔 ---------- */
const dqMobile=()=>{try{return/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent||"")}catch(e){return false}};
async function dqCopy(t){try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(t);if(typeof toast==="function")toast("📋 成績複製好了，貼給朋友吧");return"copy"}}catch(e){}
  try{if(typeof prompt==="function")prompt("複製這段成績",t)}catch(e){}return"prompt"}
async function dqShare(k,mode){const t=dqText(k);if(!t)return"none";const N=typeof navigator!=="undefined"?navigator:{};
  if(mode==="img"){try{const b=await dqImg(k);if(b){const f=new File([b],"xq-daily-"+dqNo(k)+".png",{type:"image/png"});
      if(N.share&&N.canShare&&N.canShare({files:[f]})&&dqMobile()){await N.share({files:[f],text:t});return"img"}
      const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
      await dqCopy(t);if(typeof toast==="function")toast("🖼 成績圖存好了，文字也複製了");return"file"}}catch(e){if(e&&e.name==="AbortError")return"abort"}}
  if(N.share&&dqMobile()){try{await N.share({text:t});return"share"}catch(e){if(e&&e.name==="AbortError")return"abort"}}
  return dqCopy(t)}

/* ---------- 畫面片段 ---------- */
function dqCSS(){if(typeof document==="undefined"||document.getElementById("dq-css"))return;const st=document.createElement("style");st.id="dq-css";st.textContent=`
.dq-sq{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:10px 0 6px}.dq-sq i{width:34px;height:34px;border-radius:6px;display:inline-block}
.dq-sq i.g{background:#3A9D5D}.dq-sq i.y{background:#D9A520}.dq-sq i.h{background:#3B7BD8}.dq-sq i.x{background:#3A3A3A}
[data-cbm] .dq-sq i.g{background:#E8812F}[data-cbm] .dq-sq i.y{background:#3B7BD8}[data-cbm] .dq-sq i.h{background:#F2F2F2;box-shadow:inset 0 0 0 2px #555}
.dq-ln{text-align:center;font-weight:700;margin:2px 0}.dq-lg{text-align:center;font-size:12px;color:var(--muted);margin:4px 0 0;line-height:1.6}
.dq-note{font-size:12.5px;line-height:1.6;margin:8px 0 0}
.dq-st{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center}.dq-st b{display:block;font-size:24px;font-family:var(--serif)}.dq-st small{font-size:11.5px;color:var(--muted)}
.dq-bars{margin-top:10px}.dq-bar{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:13px}.dq-bar span{flex:none;width:6.5em;text-align:right;color:var(--muted)}
.dq-bar i{display:block;height:20px;min-width:24px;line-height:20px;padding:0 6px;border-radius:4px;box-sizing:border-box;text-align:right;font-style:normal;font-weight:700;background:var(--line);color:inherit}.dq-bar i.on{background:#3A9D5D;color:#fff}
.dq-past{display:flex;flex-direction:column;gap:6px}.dq-past button{display:flex;justify-content:space-between;gap:8px;width:100%;font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;text-align:left;cursor:pointer}
`;document.head.append(st)}
function dqSqHTML(r){const cb=dqCb(),lab=[...r.sq].map((c,i)=>`第 ${i+1} 步${DQ.WORD[c]||""}`).join("、");
  return`<div class="dq-sq" role="img" aria-label="${esc(lab)}">${[...r.sq].map(c=>`<i class="${c}"></i>`).join("")}</div><p class="dq-ln">${esc(dqLine(r))}</p>
    <p class="dq-lg">${dqEmo("g",cb)} 一次走對　${dqEmo("y",cb)} 走錯過才走對　${dqEmo("h",cb)} 用了提示　${dqEmo("x",cb)} 看答案</p>`}
function dqBtnHTML(){return`<div class="cj-row"><button class="btn" data-dq-share>📤 分享成績</button><button class="btn ghost" data-dq-img>🖼 成績圖</button></div>`}
function dqBind(el,k){if(!el||!el.querySelectorAll)return;el.querySelectorAll("[data-dq-share]").forEach(b=>b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);dqShare(k,"text")});
  el.querySelectorAll("[data-dq-img]").forEach(b=>b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);dqShare(k,"img")})}
/* 解完卡（CanjuPlay card 的 XM.done）：方格＋分享鈕 */
function dqDoneHTML(k,re){const r=dqRec(k);if(!r)return"";return`<div class="card" style="margin:10px 0 0;padding:10px">${re?'<p class="muted" style="font-size:13px;margin:0">這是再解一次；分享的還是第一次的成績。</p>':""}<p style="margin:0;text-align:center"><b>🌏 每日同題 #${dqNo(k)}</b></p>${dqSqHTML(r)}${dqBtnHTML()}</div>`}
function dqStatsHTML(T,mine){const lab=["一次到位","走錯 1 次","走錯 2 次","走錯 3 次","4 次以上"],mx=Math.max(1,T.fail,...T.dist);
  const bar=(l,n,on)=>`<div class="dq-bar"><span>${l}</span><i${on?' class="on"':""} style="width:${Math.max(8,Math.round(n*100/mx))}%">${n}</i></div>`;
  return`<b>📊 我的每日同題</b><div class="dq-st" style="margin-top:8px"><div><b>${T.played}</b><small>已玩</small></div><div><b>${T.pct}</b><small>勝率 %</small></div><div><b>${T.cur}</b><small>目前連續</small></div><div><b>${T.max}</b><small>最長連續</small></div></div>
    <div class="dq-bars">${lab.map((l,i)=>bar(l,T.dist[i],mine&&mine.w&&Math.min(4,mine.m|0)===i)).join("")}${bar("看了答案",T.fail,mine&&!mine.w)}</div>
    <p class="muted" style="font-size:12px;margin:6px 0 0;line-height:1.6">沒看答案解開＝贏（用了提示也算）。連續天數只算當天解開的；補玩、看答案都會讓連續天數歸零重算。這些數字只存在這支手機。</p>`}
function dqLeft(t){const ms=864e5-(((t==null?Date.now():t)+8*36e5)%864e5),h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);return h?`${h} 小時 ${m} 分`:`${m} 分`}
function dqPastHTML(t){const D=dqAll().d,L=[];for(let i=1;i<=7;i++){const k=dqAdd(t,-i);if(k<DQ.EPOCH)break;L.push(k)}if(!L.length)return"";
  return`<div class="card"><b>🗓 前幾天的題</b><p class="muted" style="font-size:12.5px;margin:4px 0 8px">可以補玩，記成「補玩」，不算連續天數。</p><div class="dq-past">${L.map(k=>{const r=D[k],sl=DQ.SLOT[dqSlot(k)];
    return`<button data-dqd="${k}"><span>#${dqNo(k)}・${k.slice(5).replace("-","/")}・${sl[1]}${sl[0]}</span><span class="muted">${r?(r.w?"✔ 解開":"👁 看了答案")+(r.l?"（補玩）":""):"補玩 ›"}</span></button>`}).join("")}</div></div>`}

/* ---------- 一盞茶頁的入口卡 ---------- */
function dqCardHTML(){dqCSS();const k=dqToday(),r=dqRec(k),sl=DQ.SLOT[dqSlot(k)],T=dqStats(k);
  const sub=r?`${dqEmo(r.sq,dqCb())}　${dqLine(r)}`:`今天大家都解同一題・解完可以分享不劇透的成績${T.cur?`・🔥 連續 ${T.cur} 天`:""}`;
  return`<button class="cj-tea${r?" done":""}" id="dqGo" type="button"><span class="cj-ic">🌏</span><span class="tx"><b>每日同題 #${dqNo(k)}・${sl[1]}${sl[0]}</b><small>${esc(sub)}</small></span><span class="cj-st">${r?(r.w?"✔ 成績":"👁 成績"):"開始 ›"}</span></button>`}
function dqCardBind(v){const b=v&&v.querySelector&&v.querySelector("#dqGo");if(b)b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);location.hash="#/daily/"+dqToday()}}

/* ---------- 解題畫面設定（07c-canju.js CanjuPlay 的 XM）：id＝"dq/<日期>/<題號>" ---------- */
function dqXM(id){const m=/^dq\/(\d{4}-\d{2}-\d{2})\/(.+)$/.exec(String(id||""));if(!m)return null;const k=m[1],pid=m[2],back=()=>"#/canju",bad=dqBad(k);if(bad)return{err:bad,back};
  const re=!!dqRec(k),sl=DQ.SLOT[dqSlot(k)],res="#/daily/"+k,late=k!==dqToday();
  return{id:pid,rk:DQ.RK,back,top:"🌏 每日同題",icon:"🌏",
    ans:re?"這是再解一次，看答案不會改成績，確定？":"看答案就算這一天放棄了（成績記成「看了答案」，一樣可以分享），確定？",
    head:P=>`<b>🌏 每日同題 #${dqNo(k)}・${sl[1]}${sl[0]}${re?"（再解一次，不改成績）":late?"（補玩，不算連續天數）":""}</b>・${esc(P.t)}・${typeof cjLv==="function"?cjLv(P.d):""}　${typeof cjEra==="function"?cjEra(P):""}<span class="muted">${typeof cjSrc==="function"?cjSrc(P):""}</span>`,
    mark:()=>null,fin:o=>{if(!re)dqRecord(k,o)},done:()=>dqDoneHTML(k,re),bind:bx=>dqBind(bx,k),
    next:()=>{if(location.hash===res)setTimeout(()=>{if(location.hash===res&&typeof route==="function")route()},0);return res},nextL:()=>"📊 成績與統計"}}

/* ---------- 路由：#/daily、#/daily/<日期>、#/daily/<日期>/play ---------- */
function DailyPage(v,k,sub){dqCSS();const t=dqToday();if(typeof setTabs==="function")setTabs(false);
  if(!k){if(typeof navReplace==="function")navReplace("#/daily/"+t);else location.replace("#/daily/"+t);return{}}
  if(typeof setTop==="function")setTop("🌏 每日同題","#/canju");v.className="view";
  const bad=dqBad(k,t);if(bad){v.innerHTML=`<div class="cj-wrap"><div class="card"><p style="line-height:1.7;margin:0">${esc(bad)}</p><div class="cj-row"><button class="btn" id="dqT">去解今天的 #${dqNo(t)}</button></div></div></div>`;
    const b=v.querySelector("#dqT");if(b)b.onclick=()=>{location.hash="#/daily/"+t};return{}}
  if(sub!=="play"&&dqRec(k))return dqResult(v,k,t);
  v.innerHTML='<div class="pad muted">題目準備中…</div>';const H0=location.hash;
  cjData().then(D=>{if(!v.isConnected||location.hash!==H0)return;const P=dqPick(D,k);if(!P){v.innerHTML='<div class="pad"><div class="card muted">題庫裡找不到可以出的題。</div></div>';return}
    CanjuPlay(v,"dq/"+k+"/"+P.id)}).catch(e=>{if(v.isConnected)v.innerHTML=`<div class="pad"><div class="card muted">${esc(e&&e.message||"題庫載入失敗")}<br>題庫要先下載才能玩（連上網路再打開一次）。</div></div>`});
  return{}}
function dqResult(v,k,t){const r=dqRec(k),T=dqStats(t),sl=DQ.SLOT[dqSlot(k)];
  v.innerHTML=`<div class="cj-wrap">
    <div class="card"><div class="cj-head"><span class="cj-big">🌏</span><div style="flex:1;min-width:0"><b>每日同題 #${dqNo(k)}・${sl[1]}${sl[0]}</b><div class="muted">${k.slice(5).replace("-","/")}${k===t?"・今天":""}${r.l?"・補玩（不算連續天數）":""}</div></div></div>
      ${dqSqHTML(r)}${dqBtnHTML()}
      <p class="muted dq-note">分享的只有方格、步數、走錯幾次、有沒有看提示，不會洩漏著法，也沒有名字或裝置代號；朋友點網址會打開同一天這一題。</p></div>
    <div class="card">${dqStatsHTML(T,r)}</div>
    ${k===t?`<div class="card muted" style="text-align:center">下一題：${dqLeft()}後（臺灣時間 0:00 換題，全世界同一題）</div>`:""}
    ${dqPastHTML(t)}
    <div class="cj-row"><button class="btn ghost" id="dqRe">再解一次（不改成績）</button><button class="btn ghost" id="dqBk">回一盞茶</button></div></div>`;
  dqBind(v,k);const on=(q,f)=>{const e=v.querySelector(q);if(e)e.onclick=f};
  on("#dqRe",()=>{location.hash="#/daily/"+k+"/play"});on("#dqBk",()=>{location.hash="#/canju"});
  v.querySelectorAll("[data-dqd]").forEach(b=>b.onclick=()=>{location.hash="#/daily/"+b.dataset.dqd});return{}}
