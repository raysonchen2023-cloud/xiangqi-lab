/* ================= 🍵 一盞茶殘局（第一版）=================
   企劃：xiangqi-db/story/殘局企劃/殘局企劃.md。題庫：xiangqi-db/art/canju/canju-set.json（tools/canju/4_build.js 產生，建置時複製到網站 data/canju/canju-set.json）。

   ── 整合說明（給接手的人）──────────────────────────────
   1. m.html：在 //#include m/07-legend.js 之後加一行 //#include m/07c-canju.js
      （這檔用到 07-legend 的 addXP、hintInfo、useHint、undoLeft、insightN、relicsData、relicsMine、relicImg、relicEra、RELIC_RK，
       和 00-util／01-board／02-shell／05-settings 的 store、esc、toast、vibrate、sheet、closeSheet、confirmBox、setTop、setTabs、Board、actionBar；都有 typeof 防呆）。
   2. route()（11-watch.js）：
        #/canju          → return CanjuDaily(v)
        #/canju/<題號>    → return CanjuPlay(v,decodeURIComponent(<題號>))
      兩個函式都回傳 {}，跟 Theme／jPuzzle 一樣。題號可能含「-」，請整段 decode。
   3. 首頁「今日茶單」小卡：在 Home() 組字串的地方插入 ${canjuCardHTML()}，畫完後呼叫 canjuCardBind(v)
      （小卡本身也帶 data-go="#/canju"，如果首頁統一綁 [data-go] 也會自動生效；canjuCardBind 會順便非同步更新卡上的字）。
      學習頁：加一條 T("k1","#/canju","🍵","一盞茶殘局","","每天 3 題・5～8 分鐘・古譜與大師殘局")。
   4. 預先下載：請把 data/canju/canju-set.json 加進預先下載清單與 preload.json 的內容指紋（題庫改版時手機才會重抓）。
      頁面用 fetch("data/canju/canju-set.json") 讀，跟 data/relics/relics.json 同一種讀法。
   5. 匿名回傳：每解完一題呼叫 XQNet.shareIRT({t:"cj",v:1,aid,r:[[題號,對錯(1/0),提示層數0～4,走錯次數,秒數]]})，
      跟棋力測驗、天賦系統同一個佇列；後台 tools/calibrate-irt.js 目前不認得 t:"cj"，要另外加統計（題目真實答對率 → 校正 d）。
   6. 不會改玩家的朝代設定：書的年代只在畫面上顯示文字標籤（明／清／明清／現代）。
   ──────────────────────────────────────────────────

   存檔：store "cj"＝{r:棋力分（跟題目 d 同一把尺 1～10）,day,list:[{slot,id,st,res}],st:{n,last,best,fz,days,relics,gd 護天符張數,gdMsg 下次打開要說的話},solved:{題號:{at,p,a}},seen:[]}；
        store "cjRun"＝正在解的那一題 {id,path:[自己走過的著法],mist,hl,hintUsed,ans,slow,undo,t0}，每走一步就存。
   茶單每天凌晨 4 點換（cjDay）。一口＋一盞解完（或看完答案）、一壺解完或跳過＝今天完成；連續天數斷一天會自動用掉「每 7 天一次」的免簽，再不夠就用 🛡 護天符（cjGuard）；回饋 844（請假條）：還不夠、只漏了昨天，問要不要用 1 枚將令補（cjLeave）。
   每連續 7 天完成，從玩家還沒拿到的珍品裡掉一件（優先當天題目那本書的朝代）；130 件都收齊後，改成指名一局還沒解的珍品藏局。
   珍品藏局（意見回饋 644）：#/canju/z/<珍品 id> 用同一個解題畫面，但不算茶單；正在解的存在 store "cjRunZ"，不看答案解開記進 store "relicSolved"（07-legend.js）。 */
const CJ0={URL:"data/canju/canju-set.json",SHIP:"data/canju/ship-set.json",SLOT:{sip:["一口","☕"],cup:["一盞","🍵"],pot:["一壺","🫖"]},
  LV:[[2.5,"入門"],[4,"初級"],[5.5,"中級"],[7,"中高級"],[99,"高級"]],ERA:{"明":"ming","清":"qing","明清":"ming","現代":"classic"},
  TYPES:["一步定勝負","短殺","中殺","大師收官","古譜校錯"]};
let CJ_P=null;
/* 意見回饋 684、685：星槎石桌的手擺題（ship-set.json，tools/canju/6_ship.js）只併進 byId、不進 items——不排進今日茶單和自由練習；這個檔抓不到也不影響茶單 */
function cjData(){return CJ_P||(CJ_P=Promise.all([fetch(CJ0.URL).then(r=>{if(!r.ok)throw new Error("題庫載入失敗（"+r.status+"）");return r.json()}),fetch(CJ0.SHIP).then(r=>r.ok?r.json():null).catch(()=>null)])
  .then(([d,s])=>{d.byId={};for(const x of d.items)d.byId[x.id]=x;if(s&&Array.isArray(s.items))for(const x of s.items)if(!d.byId[x.id])d.byId[x.id]=x;return d}).catch(e=>{CJ_P=null;throw e}))}
const cjPad=n=>String(n).padStart(2,"0");
function cjDay(t){const d=new Date((t==null?Date.now():t)-4*36e5);return d.getFullYear()+"-"+cjPad(d.getMonth()+1)+"-"+cjPad(d.getDate())}
const cjDN=k=>Math.round(Date.parse(k+"T12:00:00Z")/864e5);
const cjLv=d=>CJ0.LV.find(x=>d<=x[0])[1];
function cjInitR(){const RK=["新手","入門1","入門2","入門3","業1","業2","業3","業4","業5","業6","業7","業8","業9","專1","專2"],qb=store.get("quizBest",null),i=qb?RK.indexOf(qb.rank):-1;return i>=0?Math.round((2+i*.45)*10)/10:3}
function cjState(){const S=store.get("cj",null)||{};if(!(S.r>0))S.r=cjInitR();S.st=S.st||{n:0,last:"",best:0,fz:"",days:0,relics:0};S.solved=S.solved||{};S.seen=S.seen||[];if(cjGuard(S))cjSave(S);return S}
/* 🛡 護天符（Gemini 評估、開發者 11/8 核准；像 Duolingo 的連勝凍結）：每連續 7 天得 1 張，最多存 2 張（st.gd）。
   漏了日子，一讀茶單狀態就結算：先用「每 7 天一次」的免簽，不夠再用護天符，一張補一天；補得起才用，連續天數照算（補的那幾天不加天數），st.last 記成昨天；
   補不起就不動（護天符留著），照舊斷掉重算。用掉時記 st.gdMsg，下次打開跳一句提示（cjGuardNote）。 */
const CJ_GD_MAX=2;
function cjGuard(S){const T=S.st;if(!T||!T.last||!(T.n>0))return false;const k=cjDay(),miss=cjDN(k)-cjDN(T.last)-1;if(miss<1)return false;
  const fzOk=!T.fz||cjDN(k)-cjDN(T.fz)>=7,gd=Math.min(CJ_GD_MAX,T.gd|0);if(miss>(fzOk?1:0)+gd)return false;
  const useF=fzOk?1:0,useG=miss-useF;if(useF)T.fz=k;T.gd=gd-useG;T.last=cjDay(Date.now()-864e5);
  const w=miss===1?"昨天沒來":`這 ${miss} 天沒來`,by=useG&&useF?`免簽和 ${useG} 張護天符`:useG?(useG>1?`${useG} 張護天符`:"護天符"):"這 7 天一次的免簽";
  T.gdMsg=`${w}，${by}替你守住了連續 ${T.n} 天。`+(useG?`（護天符還剩 ${T.gd} 張）`:"");return true}
function cjGuardNote(){try{const S=cjState(),m=S.st.gdMsg;if(!m)return;S.st.gdMsg="";cjSave(S);
  if(document.querySelector("#sheet,.modal"))return toast("🛡 "+m);
  modal(`<div class="em">🛡</div><h2>連續天數守住了</h2><p style="line-height:1.8">${esc(m)}</p><p class="muted" style="font-size:13px">一盞茶每連續 7 天得 1 張護天符，最多存 2 張；漏一天會自動用掉一張。</p>`,[["好",null]])}catch(e){}}
setTimeout(cjGuardNote,6000);
const cjSave=S=>store.set("cj",S);
function cjRand(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return(h>>>0)/4294967296}}
/* 評比第 13 輪 F1（每日同題的方格）：解題中每一步的紀錄 R.sx＝{第幾步:{m:走錯幾次,h:用到第幾層提示}}；f＝"m"／"h"，add＝累加（悔棋符收回時 v＝-1），不然取最大 */
function cjSx(R,i,f,v,add){if(!R)return;const X=R.sx||(R.sx={}),e=X[i]||(X[i]={m:0,h:0});e[f]=add?Math.max(0,(e[f]|0)+v):Math.max(e[f]|0,v|0)}
function cjAid(){let a=store.get("anonId",null);if(!a){a=Math.random().toString(36).slice(2,10);store.set("anonId",a)}return a}

/* ---------- 今日茶單 ---------- */
function cjToday(D,S){const k=cjDay();if(S.day===k&&Array.isArray(S.list)&&S.list.length===3&&S.list.every(x=>D.byId[x.id]))return S.list;
  const wd=new Date(Date.parse(k+"T12:00:00Z")).getUTCDay(),wkend=wd===0||wd===6,R=cjRand(k+cjAid()),used=new Set(),skip=new Set([...S.seen,...Object.keys(S.solved),...(typeof cjReserved==="function"?cjReserved():[]),...(typeof shipReserved==="function"?shipReserved(D):[]),...(typeof shipMoreIds==="function"?shipMoreIds():[])]);   /* 意見回饋 762：石桌續局分到的題也不排進茶單 */   /* 意見回饋 674：星槎主場殘局的題也不排進茶單 */   /* 意見回饋 658：棋史卡、輿圖遊歷、消寒圖的題不排進茶單（07e-garden2.js cjReserved） */
  const want=[["sip",["一步定勝負","短殺"],S.r-1.5],["cup",["短殺","中殺","大師收官"],S.r],["pot",wkend?["古譜校錯","中殺","大師收官"]:["中殺","大師收官","古譜校錯"],S.r+1]];
  S.list=want.map(([slot,ts,tg])=>{const w=slot==="pot"&&wkend?2.5:.4;let pool=D.items.filter(x=>ts.includes(x.t)&&!skip.has(x.id)&&!used.has(x.id));if(!pool.length)pool=D.items.filter(x=>ts.includes(x.t)&&!used.has(x.id));
    let best=pool[0]||D.items[0],bs=1e9;for(const x of pool){const s=Math.abs(x.d-tg)+ts.indexOf(x.t)*w+R()*1.2;if(s<bs){bs=s;best=x}}used.add(best.id);return{slot,id:best.id,st:"todo"}});
  S.day=k;cjSave(S);return S.list}
const cjCleared=L=>!!L&&L.length===3&&L[0].st==="done"&&L[1].st==="done"&&(L[2].st==="done"||L[2].st==="skip");
function cjStreakNow(S){const T=S.st,k=cjDay();const fzOk=!T.fz||cjDN(k)-cjDN(T.fz)>=7;if(!T.last)return{n:0,fzOk,today:false};const g=cjDN(k)-cjDN(T.last);
  return{n:g<=1||(g===2&&fzOk)?T.n:0,fzOk,today:g===0,willFz:g===2&&fzOk}}
function cjStreakHit(S){const k=cjDay(),T=S.st;if(T.last===k)return null;let msg="";const g=T.last?cjDN(k)-cjDN(T.last):99;
  if(g===1)T.n++;else if(g===2&&(!T.fz||cjDN(k)-cjDN(T.fz)>=7)){T.n++;T.fz=k;msg="昨天沒來，自動用掉這 7 天一次的免簽，連續天數照算。"}else{if(g===2&&T.n>0&&cjLeaveOk(T,k))T.lvBk={k,n:T.n};T.n=1}   /* 回饋 844（請假條）：只漏了昨天、還沒交請假條就先把今天解完了，記下斷掉前的天數，今天回茶單還能補 */
  T.last=k;T.best=Math.max(T.best||0,T.n);T.days=(T.days||0)+1;let gd=0;if(T.n%7===0&&(T.gd|0)<CJ_GD_MAX){T.gd=(T.gd|0)+1;gd=T.gd}   /* 每連續 7 天得 1 張護天符 */
  return{msg,relic:T.n%7===0,n:T.n,gd}}
/* 回饋 844（請假條）：免簽、護天符都補不起、只漏了「昨天」一天時，打開一盞茶問「要不要用 1 枚將令補上昨天？」（將令＝07-legend.js 的 lingN／lingAdd，章回棋路隱藏殘局、雲河棋寇、千秋盃會給）。
   每 7 天最多交 1 張（st.lv＝交的那天）；補的那天不算解題、不給題目獎勵，只保住天數（跟護天符一樣，補的那天不加天數）。
   兩種情況：①今天還沒完成（st.last＝前天）→ 補上就把 st.last 改成昨天；②今天已經先完成、天數被重算成 1（cjStreakHit 記了 st.lvBk）→ 補上＝斷掉前的天數＋今天這一天。
   今天第一次打開茶單自動問一次（st.lvAsk），之後茶單上留一顆「📝 請假條」按鈕；沒有將令就說明怎麼拿。 */
const CJ_LV_COST=1;
const cjLeaveOk=(T,k)=>!T.lv||cjDN(k)-cjDN(T.lv)>=7;
function cjLeave(S){const T=S&&S.st,k=cjDay();if(!T||!cjLeaveOk(T,k))return null;
  if(T.lvBk&&T.lvBk.k===k&&T.last===k&&T.n===1&&T.lvBk.n>0)return{n:T.lvBk.n,after:true};
  if(T.last&&T.n>0&&cjDN(k)-cjDN(T.last)===2)return{n:T.n,after:false};return null}
function cjLeaveUse(S){const L=cjLeave(S);if(!L||typeof lingN!=="function"||lingN()<CJ_LV_COST)return null;const T=S.st,k=cjDay();lingAdd(-CJ_LV_COST);T.lv=k;T.lvN=(T.lvN|0)+1;let hit=null;
  if(L.after){T.n=L.n+1;T.best=Math.max(T.best||0,T.n);delete T.lvBk;let gd=0;if(T.n%7===0&&(T.gd|0)<CJ_GD_MAX){T.gd=(T.gd|0)+1;gd=T.gd}if(T.n%7===0)hit={msg:"",relic:true,n:T.n,gd}}
  else T.last=cjDay(Date.now()-864e5);
  cjSave(S);return{hit,n:T.n,after:L.after}}
function cjLeaveAsk(v,D,force){try{const S=cjState(),L=cjLeave(S),k=cjDay();if(!L)return;if(!force){if(S.st.lvAsk===k||document.querySelector(".modal"))return;S.st.lvAsk=k;cjSave(S)}
  const n=typeof lingN==="function"?lingN():0,ic=typeof HIDN!=="undefined"?HIDN.ic:"🪙",rd=typeof ROAD_NAME!=="undefined"?ROAD_NAME:"章回棋路";
  const how=`<p class="muted" style="font-size:13px;line-height:1.7;text-align:left;margin:8px 0 0">${ic} 將令怎麼拿：${rd}收到「車」的時候，有機會出現隱藏殘局，解開得 1 枚；星槎航行遇到雲河棋寇，擋住了也可能掉 1 枚；千秋盃打進名次也會發。</p>`;
  const lead=L.after?"昨天沒來，今天的連續天數重新從 1 算了。":"昨天沒來喝茶，這 7 天的免簽已經用過，也沒有護天符可以補。";
  if(n<CJ_LV_COST)return modal(`<div class="em">📝</div><h2>請假條</h2><p style="line-height:1.8">${lead}用 1 枚將令寫一張請假條，就能補上昨天、連續 ${L.n} 天接回去。可是你現在還沒有將令。</p>${how}`,[["知道了",null]]);
  modal(`<div class="em">📝</div><h2>要不要寫請假條？</h2><p style="line-height:1.8">${lead}<br>要不要用 <b>1 枚將令</b>補上昨天？連續 <b>${L.n}</b> 天就能接回去${L.after?"，今天也算一天":""}。</p><p class="muted" style="font-size:13px;line-height:1.7">每 7 天最多補 1 天，只能補昨天；補的那天不算解題、沒有題目獎勵，只保住天數。你有 ${n} 枚將令。</p>`,
    [["📝 用 1 枚將令補上",()=>{const r=cjLeaveUse(cjState());if(!r)return toast("這張請假條用不了（可能已經補過了）");vibrate([15,30,15]);toast(`📝 請假條交了！連續 ${r.n} 天接回去了（將令還剩 ${lingN()} 枚）`);
      if(v&&v.isConnected)CanjuDaily(v);if(r.hit)setTimeout(()=>cjAfterClear(r.hit,cjState(),D),600)}],["不用了",null,true]])}catch(e){}}
/* 連續 7 天：從還沒拿到的珍品裡掉一件（優先 era 那個朝代），跟公園掉落同一套權重與存法 */
async function cjRelic(era,o){if(typeof relicsData!=="function"||typeof relicsMine!=="function")return null;const R=await relicsData(),mine=relicsMine();   /* o.quiet：先不播開箱，呼叫的地方自己挑時機播 relicFx（07g-battle.js） */
  const eras=[era].concat(Object.keys(R).filter(e=>e!==era));
  for(const e of eras){const L=R[e];if(!Array.isArray(L))continue;const have=mine[e]||[],left=L.filter(x=>!have.includes(x.id));if(!left.length)continue;
    const W={common:70,rare:25,legend:5},tot=left.reduce((a,x)=>a+(W[x.rarity]||10),0);let r=Math.random()*tot,it=left[0];for(const x of left){r-=W[x.rarity]||10;if(r<=0){it=x;break}}
    mine[e]=have.concat(it.id);store.set("relics",mine);if(!(o&&o.quiet)&&typeof relicFx==="function")relicFx(e,it,{from:(o&&o.from)||"一盞茶連續 7 天的獎勵",cnt:`${typeof relicEra==="function"?relicEra(e):e}的珍品 ${mine[e].length}／${L.length}`});return{era:e,it}}   /* Gemini 評估 11/8：得到珍品統一播開箱（07i-codex.js） */
  /* 意見回饋 644：珍品都收齊了——改成指名一局還沒解的藏局（優先 era 那個朝代）；藏局也全解開了才回傳 null */
  const Z=store.get("relicSolved",{}),cand=[];for(const e of eras)for(const x of R[e]||[])if(x.cj&&!Z[x.id])cand.push({era:e,it:x});if(!cand.length)return null;
  const pref=cand.filter(c=>c.era===era),pool=pref.length?pref:cand;return{...pool[Math.floor(Math.random()*pool.length)],named:true}}
const cjAllRelics=()=>typeof relicsMine==="function"&&Object.values(relicsMine()).reduce((a,x)=>a+(x||[]).length,0)>=130;
const cjZBind=b=>b.querySelectorAll("[data-rlgo]").forEach(y=>y.onclick=()=>{if(typeof relicGo==="function")return relicGo(y.dataset.rlgo);closeSheet();location.hash="#/canju/z/"+encodeURIComponent(y.dataset.rlgo)});

/* ---------- 出處、文字 ---------- */
function cjSrc(P,long){const s=P.src||{};if(s.book==="星槎石桌")return(typeof provChip==="function"?provChip(P):"")+"星槎石桌・"+esc(s.title);   /* 11/11 Gemini 架構報告第四項：手擺題標【遊戲創作】（00-util.js provChip） */   /* 意見回饋 685：手擺題不是古譜，不寫年份 */if(s.book==="特級大師對局")return`${esc(s.year)} ${esc(s.title)}${long&&s.red&&s.black?`・${esc(s.red)} 對 ${esc(s.black)}${s.result?"（"+esc(s.result)+"）":""}`:""}`;
  return`《${esc(s.book)}》〈${esc(s.title)}〉${long&&s.no?" "+esc(s.no):""}${long&&s.part?"・"+esc(s.part):""}`}
const cjEra=P=>(P.src||{}).era?`<span class="cj-era">${esc(P.src.era)}</span>`:"";
function cjTask(P){if(P.task)return P.task;if(P.t==="古譜校錯")return`古譜這裡走了「${P.book.cn}」。Pikafish 認為這步可以更好——你找得到嗎？`;
  if(P.n===1)return P.t==="大師收官"?"大師當年在這裡只有一步能保住勝勢，找出來":"只有一步能保住勝勢，找出來";return`${P.n} 步之內將死對方（對方每步都會用最頑強的應法）`}
const cjWhy=(P,c)=>c==="x"?(P.n===1?"對方還有棋可走，緩過氣來了。":`對方緩過氣來，${P.n} 步之內收不下來了。`):c&&c[0]==="m"?`對方反過來 ${c.slice(1)} 回合就能殺你。`:c==="l"?"局面反而變差了。":c==="d"?"這樣只能和棋。":c==="w"?(P.n===1?"還有優勢，但贏不下來了。":"還算不錯，但讓對方的將逃掉了。"):"這步不在解答裡。";
const cjSplit=s=>String(s||"").match(/.{4}/g)||[];
function cjW(N){if(!N._w){N._w={};for(const e of String(N.w||"").split(";")){if(!e)continue;const[u,c,l]=e.split(" ");N._w[u]={c,line:cjSplit(l)}}}return N._w}
function cjFeat(C,b,s,u){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4)),nb=C.make(b,f,t),PN={R:"車",N:"馬",C:"炮",P:"兵",K:"帥",A:"士",B:"象"};
  return{check:C.inCheck(nb,C.opp(s)),cap:!!b[t],sac:C.legal(nb,C.opp(s)).some(([,y])=>y===t),piece:PN[b[f].toUpperCase()],f,t}}
function cjHint1(F,P){const a=[P.t==="古譜校錯"?(F.check?"這步要將軍":"這步不是將軍"):(F.check?"先將軍":"不用急著將軍，先走一步安靜的棋")];if(F.sac)a.push("要捨得：走過去的子對方吃得到");else if(F.cap)a.push("可以吃子");a.push("關鍵在你的"+F.piece);return a.join("；")+"。"}

/* ---------- 樣式（執行時注入一次） ---------- */
function cjCSS(){if(document.getElementById("canju-css"))return;const st=document.createElement("style");st.id="canju-css";st.textContent=`
.cj-wrap{padding:12px 12px 24px;display:flex;flex-direction:column;gap:10px}
.cj-head{display:flex;align-items:center;gap:12px}.cj-head .cj-big{font-size:40px;line-height:1}.cj-head b{font-family:var(--serif);font-size:19px}
.cj-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.cj-chips span{font-size:12.5px;padding:3px 9px;border-radius:999px;background:var(--bg);border:1px solid var(--line)}
.cj-tea{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;cursor:pointer}
.cj-tea .cj-ic{font-size:32px;line-height:1;flex:none}.cj-tea .tx{flex:1;min-width:0}.cj-tea .tx b{display:block;font-size:16px}.cj-tea .tx small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cj-tea .cj-st{flex:none;font-size:13px;font-weight:700;color:var(--accent)}.cj-tea.done{opacity:.72}.cj-tea.done .cj-st{color:#2E8B57}
.cj-era{display:inline-block;font-size:11px;padding:0 6px;border-radius:6px;border:1px solid var(--line);margin-right:4px;color:var(--muted);vertical-align:1px}
.cj-skip{align-self:flex-end;font-size:12.5px;color:var(--muted);text-decoration:underline;padding:0 4px}
.cj-sec{font-weight:900;font-size:14px;margin:8px 2px 0;color:var(--muted)}
.cj-types{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}.cj-types button{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:10px;text-align:left;font:inherit;color:inherit}
.cj-types button b{display:block;font-size:14.5px}.cj-types button small{color:var(--muted);font-size:12px}
.cj-top{padding:6px 12px 0;font-size:13.5px;line-height:1.5}.cj-top b{font-size:14.5px}
.cj-note{white-space:pre-wrap;line-height:1.6}
.cj-th{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.cj-th small{color:var(--muted);font-size:11.5px}.cj-th button{font:inherit;font-size:13px;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:inherit}.cj-th .g{flex-basis:100%;font-size:12px;color:var(--muted);margin-top:2px}
.view.fixed .cj-note,.view.fixed #stat,.view.fixed .cj-step{flex:0 0 auto}.view.fixed .cj-note{max-height:22vh;overflow:auto}   /* 11/9 開發者截圖：答對後「後續 1：…」被下一步按鈕蓋住；文字列不准被壓扁，讓棋盤縮一點 */
.cj-card p{margin:6px 0;line-height:1.7}.cj-card .cj-q{border-left:3px solid var(--accent);padding:4px 10px;background:var(--bg);border-radius:0 8px 8px 0}
.cj-card .cj-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.cj-card .cj-row .btn{flex:1 1 140px;margin-top:0}
.cj-relic{display:flex;gap:12px;align-items:center;border:1px solid #C9962B;border-radius:12px;padding:8px;margin-top:8px}.cj-relic .im{width:72px;height:72px;flex:none;display:flex;align-items:center;justify-content:center;font-size:44px}
.cj-home{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;margin:0 0 8px}.cj-home .cj-hi{font-size:30px}.cj-home .tx{flex:1;min-width:0}.cj-home small{display:block;color:var(--muted);font-size:12.5px}
`;document.head.append(st)}

/* ---------- 首頁小卡 ---------- */
function cjCardText(){const S=cjState(),k=cjDay(),L=S.day===k?S.list:null,done=L?L.filter(x=>x.st==="done"||x.st==="skip").length:0,T=cjStreakNow(S);
  const t=L?(cjCleared(L)?"今天的茶喝完了 ✔":`今日茶單 ${done}／3`):"今日茶單・3 題";
  const s=(T.n?`🔥 連續 ${T.n} 天・`:"")+(L&&cjCleared(L)?`再 ${7-(T.n%7)} 天${cjAllRelics()?"指名一局珍品藏局":"得一件珍品"}`:"每天 3 題・5 分鐘");return{t,s}}
function canjuCardHTML(){cjCSS();const x=cjCardText();return`<button class="card cj-home" id="cjHome" data-go="#/canju"><span class="cj-hi">🍵</span><span class="tx"><b id="cjHomeT">${esc(x.t)}</b><small id="cjHomeS">${esc(x.s)}</small></span><b class="go">›</b></button>`}
function canjuCardBind(el){const c=el&&(el.id==="cjHome"?el:el.querySelector&&el.querySelector("#cjHome"));if(!c)return;c.onclick=()=>{if(typeof vibrate==="function")vibrate(5);location.hash="#/canju"};
  cjData().then(D=>{if(!c.isConnected)return;const S=cjState();cjToday(D,S);const x=cjCardText(),a=c.querySelector("#cjHomeT"),b=c.querySelector("#cjHomeS");if(a)a.textContent=x.t;if(b)b.textContent=x.s}).catch(()=>{})}

/* ---------- 今日茶單頁 ---------- */
function CanjuDaily(v){cjCSS();setTop("🍵 一盞茶殘局","#/hub/learn");if(typeof setTabs==="function")setTabs(true,"#/");v.className="view";v.innerHTML='<div class="pad muted">茶單準備中…</div>';
  setTimeout(cjGuardNote,400);cjData().then(D=>{if(!v.isConnected)return;const S=cjState(),L=cjToday(D,S),T=cjStreakNow(S),run=store.get("cjRun",null),nSolved=Object.keys(S.solved).length;
    const stTxt=x=>{if(x.st==="done")return x.res&&x.res.a?"👁 看過答案":x.res&&x.res.p?"✔ 完美":"✔ 解開";if(x.st==="skip")return"跳過";if(run&&run.id===x.id&&run.path&&run.path.length)return`解到第 ${run.path.length+1} 步`;return"開始 ›"};
    const tea=x=>{const P=D.byId[x.id],[nm,ic]=CJ0.SLOT[x.slot];return`<button class="cj-tea${x.st==="done"||x.st==="skip"?" done":""}" data-id="${esc(x.id)}"><span class="cj-ic">${ic}</span><span class="tx"><b>${nm}・${esc(P.t)}</b><small>${cjEra(P)}${cjLv(P.d)}・${cjSrc(P)}</small></span><span class="cj-st">${stTxt(x)}</span></button>`};
    const cnt=t=>{const a=D.items.filter(x=>x.t===t);return`${a.filter(x=>S.solved[x.id]).length}／${a.length}`};
    const left=7-(T.n%7),LV=cjLeave(S);   /* 回饋 844（請假條）：可以補昨天時，茶單上多一顆按鈕 */
    v.innerHTML=`<div class="cj-wrap">
      <div class="card"><div class="cj-head"><span class="cj-big">🍵</span><div style="flex:1;min-width:0"><b>今日茶單</b><div class="muted">${cjDay().slice(5).replace("-","/")}・一口、一盞、一壺，約 5～8 分鐘</div></div></div>
        <div class="cj-chips"><span>🔥 連續 ${T.n} 天${T.today?"":T.willFz?"（今天完成會用掉免簽）":""}</span><span>最長 ${S.st.best||0} 天</span><span>🎫 免簽 ${T.fzOk?"可用":"這 7 天已用"}</span><span>🛡 護天符 ${Math.min(CJ_GD_MAX,S.st.gd|0)}／${CJ_GD_MAX}</span><span>🏺 ${cjAllRelics()?(cjCleared(L)&&T.today&&S.st.n%7===0?"今天剛指名一局藏局":`再 ${left} 天指名藏局`):(cjCleared(L)&&T.today&&S.st.n%7===0?"今天剛拿到珍品":`再 ${left} 天得珍品`)}</span></div>${LV?`<button class="cj-skip" id="cjLv" style="margin-top:8px">📝 請假條：用 1 枚將令補上昨天，連續 ${LV.n} 天接回去</button>`:""}</div>
      ${typeof dqCardHTML==="function"?dqCardHTML():""}
      ${tea(L[0])}${tea(L[1])}${tea(L[2])}
      ${L[2].st==="todo"||L[2].st==="run"?'<button class="cj-skip" id="cjSkip">今天沒空，跳過一壺</button>':""}
      ${cjCleared(L)?'<div class="card muted" style="text-align:center">今天的茶喝完了，明天凌晨 4 點換新茶單。還想多練，就到下面的自由練習。</div>':""}
      <div class="cj-sec">自由練習（不算茶單）</div>
      <div class="cj-types">${CJ0.TYPES.map(t=>`<button data-t="${t}"><b>${t}</b><small>解過 ${cnt(t)}</small></button>`).join("")}</div>
      <div class="cj-sec">依主題選題（殺法、戰術）</div>
      <div class="cj-th" id="cjTh"></div>
      <button class="cj-tea" id="cjHw"><span class="cj-ic">🧑‍🏫</span><span class="tx"><b>教練出作業</b><small>挑幾題組成一份作業，產生連結傳給學生</small></span><span class="cj-st">›</span></button>
      <details class="card"><summary><b>怎麼玩</b></summary><p class="muted" style="line-height:1.7;margin:6px 0 0">輪到你走，對方會用 Pikafish 最頑強的應法。走錯了，對方會真的下出反駁給你看，看完可以退回重想（這題就不算完美），或用 1 張悔棋符收回。<br>提示有四層：①免費的方向提示 ②1 顆提示棋圈出關鍵子 ③指出落點（Lv 20 起跟第②層一起給）④看答案（沒有修為、沒有心得）。<br>沒用提示、沒走錯解開＝完美，第一次完美得 1 個心得（5 個換 1 顆提示棋）。一口＋一盞解完、一壺解完或跳過，今天就算完成；斷一天會自動用掉每 7 天一次的免簽，免簽用過了再用「🛡 護天符」（一張補一天）；都用完了、只漏了昨天，還可以用 1 枚將令寫一張「📝 請假條」補上（每 7 天最多一張）<!-- 回饋 844（請假條） -->。每連續 7 天得一件珍品（130 件收齊後，改成指名一局還沒解的珍品藏局），也得 1 張護天符（最多存 2 張）。<br>題目來自《適情雅趣》《橘中秘》、清代殘局譜與特級大師實戰，每題都由 Pikafish 深算驗證過。目前題庫 ${D.items.length} 題，你解過 ${nSolved} 題。</p></details>
    </div>`;
    v.querySelectorAll(".cj-tea").forEach(b=>b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);location.hash="#/canju/"+encodeURIComponent(b.dataset.id)});
    if(typeof dqCardBind==="function")dqCardBind(v);   /* 評比第 13 輪 F1：每日同題入口（m/07dq-daily.js） */
    const sk=v.querySelector("#cjSkip");if(sk)sk.onclick=()=>{const S2=cjState();const x=(S2.list||[])[2];if(!x||S2.day!==cjDay())return;x.st="skip";let hit=null;if(cjCleared(S2.list))hit=cjStreakHit(S2);cjSave(S2);if((store.get("cjRun",null)||{}).id===x.id)store.set("cjRun",null);
      CanjuDaily(v);if(hit)setTimeout(()=>cjAfterClear(hit,S2,D),300)};
    {const lvb=v.querySelector("#cjLv");if(lvb)lvb.onclick=()=>{if(typeof vibrate==="function")vibrate(5);cjLeaveAsk(v,D,true)};if(LV)setTimeout(()=>{if(v.isConnected)cjLeaveAsk(v,D)},900)}   /* 回饋 844（請假條）：今天第一次打開問一次，之後按按鈕再問 */
    cjThBox(v.querySelector("#cjTh"),D,S);{const hw=v.querySelector("#cjHw");if(hw)hw.onclick=()=>{if(typeof vibrate==="function")vibrate(5);location.hash="#/hw"}}   /* 評比第 3 輪 P17：依主題選題、教練出作業 */
    v.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{store.set("cjTh",null);const id=cjNext(D,cjState(),b.dataset.t);if(id)location.hash="#/canju/"+encodeURIComponent(id)})}).catch(e=>{v.innerHTML=`<div class="pad"><div class="card muted">${esc(e.message)}<br>題庫要先下載才能玩（連上網路再打開一次）。</div></div>`});
  return{}}
function cjNext(D,S,t,not){const pool=D.items.filter(x=>x.t===t&&!S.solved[x.id]&&x.id!==not);const P=pool.length?pool:D.items.filter(x=>x.t===t&&x.id!==not);if(!P.length)return null;
  const tg=t==="一步定勝負"?S.r-1:S.r;P.sort((a,b)=>Math.abs(a.d-tg)-Math.abs(b.d-tg));const k=Math.min(P.length,8);return P[Math.floor(Math.random()*k)].id}
/* 今天剛完成：連續天數訊息、7 天珍品 */
async function cjAfterClear(hit,S,D){let rel=null;if(hit.relic){const P=D&&S.list&&D.byId[S.list[1].id];rel=await cjRelic(CJ0.ERA[(P&&P.src&&P.src.era)||""]||"classic");if(rel&&!rel.named){S.st.relics=(S.st.relics||0)+1;cjSave(S)}}
  if(!hit.relic&&!hit.msg){toast(`🔥 今天的茶單完成！連續 ${hit.n} 天`);return null}
  if(!rel&&!hit.msg){toast(`🔥 連續 ${hit.n} 天！珍品和藏局都收齊了${hit.gd?`・🛡 護天符 +1（${hit.gd}／${CJ_GD_MAX}）`:""}`);return null}
  sheet(`🔥 連續 ${hit.n} 天`,b=>{b.innerHTML=`${hit.msg?`<p class="muted">${esc(hit.msg)}</p>`:""}${rel?cjRelicHTML(rel):""}${hit.gd?`<p style="line-height:1.7;margin:10px 0 0">🛡 另外得到 1 張<b>護天符</b>（現在 ${hit.gd}／${CJ_GD_MAX} 張）：哪天漏了，它會替你守住連續天數。</p>`:""}<button class="btn${rel&&rel.named?" ghost":""}" id="cjOk" style="margin-top:12px">好</button>`;b.querySelector("#cjOk").onclick=closeSheet;cjZBind(b)});return rel}
function cjRelicHTML(rel){const rk=(typeof RELIC_RK!=="undefined"&&RELIC_RK[rel.it.rarity])||["",""];const img=typeof relicImg==="function"?relicImg(rel.era,rel.it.id):"🏺",en=typeof relicEra==="function"?esc(relicEra(rel.era)):"";
  if(rel.named)return`<div class="cj-relic"><div class="im">${img}</div><div style="flex:1;min-width:0"><b>🎁 連續 7 天的獎勵：指名藏局〈${esc(rel.it.cjName||"")}〉</b><div class="muted">珍品都收齊了！這次指名你解${en}「${esc(rel.it.name||"")}」藏著的殘局。</div><div class="muted" style="font-size:12.5px;margin-top:4px">${esc(rel.it.bridge||"")}</div><button class="btn" data-rlgo="${esc(rel.it.id)}" style="margin-top:6px;width:100%">現在解</button></div></div>`;
  return`<div class="cj-relic"><div class="im">${img}</div><div style="flex:1;min-width:0"><b>🎁 連續 7 天的獎勵：${esc(rel.it.name||"")}</b><div class="muted">${en}・${esc(rk[0])}・收進「我的角色 → 🏺 珍品」</div><div class="muted" style="font-size:12.5px;margin-top:4px">${esc(rel.it.desc||"")}</div>${rel.it.cj?`<div style="font-size:13.5px;margin-top:6px"><b>🔍 這件珍品藏著一局〈${esc(rel.it.cjName||"")}〉</b></div><button class="btn ghost" data-rlgo="${esc(rel.it.id)}" style="margin-top:4px;width:100%">現在解</button>`:""}</div></div>`}

/* Gemini 評估 11/8（開發者核准）：卡關主動提示——同一題連續失敗 STUCK_N 次，小幫手「帥」小人冒出來說一句，棋盤上只亮第一步要動的那顆子（不給落點）。
   千秋殘局、一盞茶（CanjuPlay）、石桌往事的殘局題（07-legend.js puzzle、relay）、錯棋重練（08b-cpugame.js practiceBar）共用。
   用了照各自原本的規則算「用了提示」（收子、星數、完美照舊扣），但不扣提示棋；小人藏起來時改在畫面下方冒一個「帥」字泡泡 */
const STUCK_N=3;
function stuckNudge(t){t=t||"卡住了嗎？我把第一步要動的那顆子框起來了，想想它能走到哪裡！";try{vibrate(10)}catch(e){}
  try{if(typeof BOT!=="undefined"&&BOT&&BOT.say){if(BOT.act)BOT.act("point");setTimeout(()=>{try{BOT.say(t,4)}catch(e){}},400);return}}catch(e){}
  const nm=typeof ASKN==="function"?ASKN():"小帥",pc=nm!=="小帥"&&typeof botPc==="function"?botPc():"帥";
  const o=document.getElementById("stkPop");if(o)o.remove();const d=document.createElement("div");d.id="stkPop";d.className="stk-pop";d.setAttribute("role","status");
  d.innerHTML=`<span class="stk-pc">${esc(pc)}</span><span class="stk-t"><b>${esc(nm)}</b>${esc(t)}</span>`;d.onclick=()=>d.remove();document.body.append(d);
  requestAnimationFrame(()=>d.classList.add("show"));setTimeout(()=>{d.classList.remove("show");setTimeout(()=>d.remove(),400)},5200)}

/* ---------- 解題畫面 ---------- */
function CanjuPlay(v,id){cjCSS();const H0=location.hash,here=()=>v.isConnected&&location.hash===H0;   /* 畫面容器換頁後還是同一個：用網址判斷還在不在這一題（示範後續還在跑時換頁，解完卡不要跳到下一題上） */const C=window.XQCore;
  /* 意見回饋 644：#/canju/z/<珍品 id>＝珍品藏局（不算茶單，存檔用 cjRunZ） */
  /* 意見回饋 658：#/canju/h/<朝代>/<題號>＝棋史卡的古法殘局（07d-garden.js；不算茶單，存檔用 cjRunH，不看答案解開記進 store "histSolved"） */
  /* 意見回饋 658：#/canju/r/<朝代>/<第幾站>＝輿圖遊歷、#/canju/x/<冬至那年>/<第幾瓣>＝九九消寒圖（07e-garden2.js 的 cjXMode 給這一題的設定 XM；不算茶單，存檔用 XM.rk，不看答案解開才呼叫 XM.mark） */
  const XM=(typeof hwXM==="function"&&hwXM(id))||(typeof dqXM==="function"&&dqXM(id))||(typeof cjXMode==="function"?cjXMode(id):null);   /* 評比第 13 輪 F1：#/daily/<日期>＝每日同題（m/07dq-daily.js dqXM；XM.fin 記成績、XM.bind 綁解完卡的分享鈕） */   /* 評比第 3 輪 P17：#/canju/hw/<編碼>/<第幾題>＝教練作業的殘局題（m/10d-coach.js hwXM） */
  const zm=XM?null:/^z\/(.+)$/.exec(id),Z=zm?{rid:zm[1]}:null,hm=Z||XM?null:/^h\/(\w+)\/(.+)$/.exec(id),HS=hm?{era:hm[1]}:null,RK=XM?XM.rk||"cjRunX":Z?"cjRunZ":HS?"cjRunH":"cjRun";if(HS)id=hm[2];if(XM&&XM.id)id=XM.id;
  const hBack=()=>typeof histBackHash==="function"?histBackHash():"#/adventure",BK=XM?XM.back():Z?"#/me/relics":HS?hBack():"#/canju";
  /* 11/13 開發者「千秋殘局做完的返回鍵是回到選擇千秋殘局的入口處」：千秋殘局（XM）的返回鍵直接回那一層（^），不照瀏覽器上一頁（按過下一題會退回上一題） */
  setTop(XM?XM.top||"🍵 一盞茶殘局":Z?"🏺 珍品藏局":HS?"📜 古法殘局":"🍵 一盞茶殘局",XM&&BK[0]!=="^"?"^"+BK:BK);if(typeof setTabs==="function")setTabs(false);
  v.className="view fixed";v.innerHTML=`<div class="cj-top" id="cjH"></div><div class="boardbox" id="bbox"></div><div class="status" id="stat"></div><div class="note cj-note" id="note"></div><div class="cj-step" id="cjStep"></div><div style="flex:1"></div><div class="actions" id="acts"></div>`;
  const $=q=>v.querySelector(q);let D=null,P=null,S=null,R=null,b=null,node=null,step=0,sel=-1,busy=false,hk=null,tok=0,last=null,me="r",flip=false;
  const bd=Board(x=>tap(x));$("#bbox").append(bd.svg);
  const sq=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))],ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
  const stat=t=>{const e=$("#stat");if(e)e.textContent=t},note=t=>{const e=$("#note");if(e)e.textContent=t||""};
  const save=()=>{store.set(RK,R);if(typeof rsCj==="function")try{rsCj(RK,R,H0)}catch(e){}},later=(f,ms)=>{const my=tok;setTimeout(()=>{if(my===tok&&here())f()},ms)};
  const slotOf=()=>{if(Z||HS||XM)return null;const S2=cjState();return S2.day===cjDay()?(S2.list||[]).find(x=>x.id===id)||null:null};
  /* 藏局：先從 relics.json 找出這件珍品配的題號；還沒撿到的珍品不能解 */
  const zLoad=d=>relicsData().then(RL=>{const e=Object.keys(RL).find(k=>(RL[k]||[]).some(x=>x.id===Z.rid)),x=e&&RL[e].find(y=>y.id===Z.rid);if(!x||!x.cj)throw new Error("找不到這件珍品的藏局（資料可能更新了）。");
    if(!((typeof relicsMine==="function"?relicsMine():{})[e]||[]).includes(x.id))throw new Error("還沒找到這件珍品，撿到了才能解它藏著的殘局。");Object.assign(Z,{era:e,it:x,RL});id=x.cj;return d});
  if(XM&&XM.err){v.className="view";v.innerHTML=`<div class="pad"><div class="card muted">${esc(XM.err)}<br><a href="${BK}">回去</a></div></div>`;return{}}   /* 意見回饋 658：還沒走到的站、今天的份走完了、還沒到的花瓣 */
  cjData().then(d=>Z?zLoad(d):d).then(d=>{if(!v.isConnected)return;D=d;P=D.byId[id];if(!P){v.className="view";v.innerHTML=`<div class="pad"><div class="card muted">找不到這一題（題庫可能更新了）。<br><a href="${BK}">${Z?"回珍品冊":HS||XM?"回去":"回今日茶單"}</a></div></div>`;return}
    S=cjState();me=P.side;flip=me==="b";R=store.get(RK,null);if(!R||R.id!==id)R={id,path:[],mist:0,hl:0,hm:0,hintUsed:false,ans:false,slow:0,undo:0,t0:Date.now()};if(C.ruleConfigOf)R.rc=C.ruleConfigOf({rc:R.rc||C.ruleConfig(C.RULESET_DEFAULT,"puzzle")});   /* 11/11 Gemini 架構報告第一項：殘局也記棋規設定（解題照題目的解答樹判，不經循環裁判；固定千秋休閒規則、puzzle；舊進度沒有就補） */
    if(XM&&XM.hint1&&!R.path.length&&!R.hl&&!R.ans){R.hl=1;R.hm=Math.max(R.hm||0,1)}   /* 意見回饋 685：星槎聽書難度的劇情局，一開始就打開第一層（免費）提示 */
    {const sl=slotOf();if(sl&&sl.st==="todo"){const S2=cjState();const x=S2.list.find(y=>y.id===id);x.st="run";cjSave(S2)}}
    if(!rebuild())return finish();save();show()}).catch(e=>{v.className="view";v.innerHTML=`<div class="pad"><div class="card muted">${esc(e.message)}${Z?'<br><a href="#/me/relics">回珍品冊</a>':HS||XM?`<br><a href="${BK}">回去</a>`:""}</div></div>`});
  /* 照存檔的 path 重走一遍；回傳 false＝其實已經解完 */
  function rebuild(){b=C.parseFen(P.fen);node=P.tree;step=0;last=null;for(const u of R.path){const o=node&&node.o[u];if(!o){R.path=R.path.slice(0,step);break}
      const[f,t]=sq(u);b=C.make(b,f,t);last={f,t};step++;if(o[1]){const[f2,t2]=sq(o[0]);b=C.make(b,f2,t2);last={f:f2,t:t2};node=o[1]}else{node=null;return false}}return true}
  function draw(o){bd.draw(o&&o.board||b,{flip,sel,last,check:ck(o&&o.board||b),targets:sel>=0?C.legal(b,me).filter(([f])=>f===sel).map(x=>x[1]):[],...(hk?{hint:hk}:{}),...(o||{})})}
  function head(){if(XM){$("#cjH").innerHTML=XM.head(P);return}
    if(HS){$("#cjH").innerHTML=`<b>📜 ${esc(eraLabel(HS.era))}的古法殘局</b>・${esc(P.t)}・${cjLv(P.d)}　${cjEra(P)}<span class="muted">${cjSrc(P)}</span>`;return}
    if(Z){$("#cjH").innerHTML=`<b>🏺 ${esc(Z.it.name)}的藏局〈${esc(Z.it.cjName||P.src.title||"")}〉</b>・${esc(P.t)}・${cjLv(P.d)}　${cjEra(P)}<span class="muted">${cjSrc(P)}</span>`;return}
    const sl=slotOf(),tm=sl?null:cjThMode(P),nm=sl?CJ0.SLOT[sl.slot][0]+"・":tm?"主題「"+esc(tm)+"」・":"自由練習・";$("#cjH").innerHTML=`<b>${nm}${esc(P.t)}</b>・${cjLv(P.d)}　${cjEra(P)}<span class="muted">${cjSrc(P)}</span>`}
  function acts(){const H=typeof hintInfo==="function"?hintInfo():{left:0,bonus:0,full:false},n=H.left+(H.bonus||0);
    const hl=R.hl===0?"提示（免費）":R.hl===1?`提示棋（剩 ${n}）`:R.hl===2&&!H.full?`再一顆：落點（剩 ${n}）`:"已全部提示";
    const a=[["hint","💡",hl,hint],["ans","👁","看答案",reveal]];const sl=slotOf();if(sl&&sl.slot==="pot")a.push(["skip","⏭","跳過一壺",skipPot]);actionBar($("#acts"),a)}
  function show(){busy=false;sel=-1;head();stat(`${C.PLAYER[me]}走・第 ${step+1}／${P.n} 步`);note((Z&&step===0&&!R.hl&&Z.it.bridge?"🏺 "+Z.it.bridge+"\n":"")+cjTask(P)+(R.hl?"\n💡 "+hintTxt():""));acts();draw()}
  const key=()=>Object.keys(node.o)[0];
  function hintTxt(){const u=key();if(step<(P.hint||[]).length&&R.path.every((x,i)=>x===P.line[i*2]))return P.hint[step];return cjHint1(cjFeat(C,b,me,u),P)}
  function hint(){if(busy||!node)return;const u=key(),[f,t]=sq(u);
    if(R.hl===0){R.hl=1;R.hm=Math.max(R.hm||0,1);cjSx(R,step,"h",1);save();note(cjTask(P)+"\n💡 "+hintTxt());acts();return}
    if(R.hl>=3||(R.hl===2&&typeof hintInfo==="function"&&hintInfo().full))return toast("這一步已經全部提示了");
    if(typeof useHint!=="function")return toast("提示棋還不能用");const H=useHint();if(!H)return;R.hintUsed=true;
    if(R.hl===1&&!H.full){R.hl=2;hk=[f];stat("💡 藍框這顆子就是關鍵（再一顆提示棋會指出落點）")}else{R.hl=3;hk=[f,t];stat("💡 藍框：要動的子和要去的位置")}R.hm=Math.max(R.hm||0,R.hl);cjSx(R,step,"h",R.hl);save();acts();draw()}
  /* 卡關主動提示（stuckNudge）：這題走錯滿 3 次、還沒亮過那顆子，就免費亮出來（算用了提示）；擋寇那題（XM.noNudge）走錯 3 次就輸了，不用；XM.nudgeN＝改成走錯幾次就亮（07q-buddy.js 旅伴闖禍、驛站飛書用 2） */
  function stuck(){if(!node||busy||R.ng||R.ans||(R.mist|0)<((XM&&XM.nudgeN)||STUCK_N)||(XM&&XM.noNudge))return;R.ng=1;if((R.hl|0)>=2){save();return}
    const[f]=sq(key());R.hl=2;R.hm=Math.max(R.hm||0,2);R.hintUsed=true;cjSx(R,step,"h",2);hk=[f];save();show();stat("💡 藍框這顆子就是這一步要動的");stuckNudge()}
  function tap(x){if(busy||!node)return;const L=C.legal(b,me);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const u=C.iccs(sel,x);sel=-1;return move(u)}sel=L.some(([f])=>f===x)?x:-1;if(sel>=0&&typeof vibrate==="function")vibrate(5);draw()}
  function move(u){const o=node.o[u],[f,t]=sq(u);
    if(o){if(typeof vibrate==="function")vibrate(15);R.path.push(u);R.hl=0;hk=null;b=C.make(b,f,t);last={f,t};save();draw();
      if(!o[1]){node=null;const demo=cjSplit(o[0]);busy=true;if(demo.length){stat(P.hold?"✔ 守住了！按「下一步」看後續":"✔ 對了！按「下一步」看後續");anim(demo,b,(cnTxt,i)=>note(`後續 ${i}：${cnTxt}`),()=>finish(),false,true)}else{stat(C.legal(b,C.opp(me)).length?(P.hold?"✔ 守住了！":"✔ 對了！"):C.inCheck(b,C.opp(me))?"✔ 將死！":"✔ 困斃！對方一步都動不了");later(finish,700)}return}
      busy=true;stat("✔ 好棋");later(()=>{const[f2,t2]=sq(o[0]),tx=C.notate(b,f2,t2);b=C.make(b,f2,t2);last={f:f2,t:t2};node=o[1];step++;show();note(`對方應：${tx}\n`+cjTask(P))},550);return}
    if(node.s&&node.s[u]){R.slow++;save();busy=true;const nb=C.make(b,f,t);bd.draw(nb,{flip,last:{f,t},check:ck(nb)});stat("👍 這步也能贏");note(`${C.notate(b,f,t)}也能贏（${node.s[u]} 回合殺），但還有更快的殺法。再找找看！（不算走錯）`);later(()=>{busy=false;draw()},1100);return}
    wrong(u)}
  function wrong(u){const e=cjW(node)[u]||{c:"",line:[]},[f,t]=sq(u),t0=C.notate(b,f,t);R.mist++;cjSx(R,step,"m",1,1);save();busy=true;if(typeof vibrate==="function")vibrate([20,40,20]);
    let ws="";try{ws=XM&&XM.wrong?XM.wrong(u,step,P)||"":""}catch(x){}if(ws)ws="💬 "+ws+"\n";   /* 意見回饋 685：星槎題走了陷阱，角色先說一句 */
    const isBook=P.book&&P.book.mv===u;stat(`✘ ${t0}${isBook?"（就是古譜原來那一手）":""}`);note(ws+"對方的反駁：");const acc=[];
    anim([u].concat(e.line),b,(tx,i)=>{if(i>1){acc.push(tx);note(ws+"對方的反駁："+acc.join("　"))}},()=>{note(`${ws}對方的反駁：${acc.join("　")||"（直接看局面）"}\n這步不行：${cjWhy(P,e.c)}`);
      const a=[["back","↩","退回重想",()=>{tok++;show();stuck()}]];if(typeof undoLeft==="function"&&undoLeft()>0)a.push(["undo","↶",`悔棋符收回（剩 ${undoLeft()}）`,()=>{store.set("undoBonus",undoLeft()-1);R.mist=Math.max(0,R.mist-1);cjSx(R,step,"m",-1,1);R.undo++;save();tok++;show();toast("↶ 收回了，這一步不算走錯")}]);actionBar($("#acts"),a)},1)}
  /* 動畫：一步一步走 seq（第一步立刻走）；cap(中文記譜, 第幾步) */
  /* 意見回饋 696：man＝玩家自己按「下一步」看（答對後的後續）；不帶 man 照舊自動播 */
  function anim(seq,start,cap,done,first,man){const my=++tok;let bb=start,i=0;const sp=$("#cjStep"),clr=()=>{if(sp)sp.innerHTML=""},fin=()=>{clr();done&&done(bb)};
    const one=()=>{if(i>=seq.length)return false;const u=seq[i++],[f,t]=sq(u);if(!bb[f])return false;const tx=C.notate(bb,f,t);bb=C.make(bb,f,t);bd.draw(bb,{flip,last:{f,t},check:ck(bb)});cap&&cap(tx,i);return true};
    const go=()=>{if(my!==tok||!v.isConnected)return;if(!one()){fin();return}setTimeout(()=>{if(my!==tok||!v.isConnected)return;if(i>=seq.length)fin();else go()},i===1&&first?500:750)};
    if(man&&sp&&seq.length){const show=()=>{if(my!==tok||!v.isConnected)return;if(i>=seq.length){setTimeout(()=>{if(my===tok)fin()},600);clr();return}
        sp.innerHTML=`<button class="btn" data-nx>下一步 ›（${i+1}／${seq.length}）</button><button class="btn ghost" data-all>自動播完</button>`;
        sp.querySelector("[data-nx]").onclick=()=>{vibrate(5);if(my!==tok)return;if(!one()){fin();return}show()};sp.querySelector("[data-all]").onclick=()=>{vibrate(5);clr();go()}};show();return}
    go()}
  function reveal(){if(busy||!node)return;const go=()=>{R.ans=true;save();let n=node,bb=b;const seq=[];while(n){const u=Object.keys(n.o)[0],o=n.o[u];seq.push(u);if(o[1]){seq.push(o[0]);n=o[1]}else{seq.push(...cjSplit(o[0]));n=null}}
      busy=true;node=null;const acc=[];stat("👁 答案");anim(seq,bb,tx=>{acc.push(tx);note(acc.join("　"))},()=>later(finish,600))};
    if(typeof confirmBox==="function")confirmBox(XM?XM.ans:Z?"看答案這題就沒有修為和心得，珍品也不會打上「已解」，確定？":HS?"看答案這題就沒有修為和心得，也不算進棋史卡，確定？":"看答案這題就沒有修為和心得，確定？",go,"看答案");else go()}
  function skipPot(){if(busy)return;const S2=cjState(),x=(S2.list||[]).find(y=>y.id===id);if(!x)return;x.st="skip";let hit=null;if(cjCleared(S2.list))hit=cjStreakHit(S2);cjSave(S2);store.set("cjRun",null);tok++;
    location.hash="#/canju";if(hit)setTimeout(()=>cjAfterClear(hit,S2,D),500)}
  /* 意見回饋 737：匿名送出時附上解這題「之前」的殘局棋力換成測驗那把尺的 θ（r＝5.15＋0.818θ，cjInitR 的起點公式），後台校正題目難度用 */
  async function finish(){tok++;busy=true;node=null;S=cjState();const perfect=!R.ans&&R.mist===0&&!R.hintUsed,first=!S.solved[id],ms=Date.now()-(R.t0||Date.now());
    S.solved[id]={at:Date.now(),p:perfect?1:0,a:R.ans?1:0};S.seen=S.seen.filter(x=>x!==id).concat(id).slice(-800);
    const r0=S.r;{const sc=R.ans?0:(R.mist?.5:1)*(R.hintUsed?.6:1),p=1/(1+Math.exp(-(S.r-P.d)/1.2));S.r=Math.max(1,Math.min(10,Math.round((S.r+.35*(sc-p))*100)/100))}
    if(!R.ans&&!(XM&&XM.noXP)&&typeof addXP==="function")addXP(5,"殘局","cj:"+id);   /* 意見回饋 685：星槎的選做題（熱身、七星同局圖鑑）不給修為 */
    let ins="";if(perfect&&first&&typeof insightN==="function"){const c=insightN()+1;store.set("insightN",c);if(c%5===0){store.set("hintBonus",(store.get("hintBonus",0)||0)+1);ins="🎁 攢滿 5 個心得，換到 1 顆提示棋"}else ins=`💡 有心得（${c%5}／5，攢滿 5 個換 1 顆提示棋）`}
    let hit=null;const sl=!Z&&!HS&&!XM&&S.day===cjDay()?(S.list||[]).find(x=>x.id===id):null;if(sl&&sl.st!=="done"){sl.st="done";sl.res={p:perfect?1:0,a:R.ans?1:0};if(cjCleared(S.list))hit=cjStreakHit(S)}
    cjSave(S);store.set(RK,null);
    /* 藏局：不看答案解開就蓋「已解」印；這一朝 10 件都解開＝朝代名變金色 */
    let zs=null;if(Z&&!R.ans){const M=store.get("relicSolved",{}),zf=!M[Z.it.id];if(zf)M[Z.it.id]={at:Date.now(),p:perfect?1:0};else if(perfect)M[Z.it.id].p=1;store.set("relicSolved",M);
      const EL=Z.RL[Z.era]||[],n=EL.filter(x=>M[x.id]).length;zs={first:zf,n,all:EL.length,gold:EL.length>0&&n===EL.length,goldNew:zf&&EL.length>0&&n===EL.length};try{if(typeof qqHeldSolved==="function")qqHeldSolved(Z.it.id)}catch(e){}}   /* 千秋穿梭突發事件：寇船扣著的珍品，解開藏局就贖回 */
    const hs=HS&&!R.ans&&typeof histSolvedMark==="function"?histSolvedMark(HS.era,id):null;   /* 意見回饋 658：棋史卡的古法殘局 */
    let xs=null;if(XM&&!R.ans)try{xs=XM.mark({perfect,hint:!!R.hintUsed})}catch(e){console.warn(e)}   /* 意見回饋 658：輿圖遊歷的一站、消寒圖的一瓣 */
    if(XM&&XM.fin)try{XM.fin({R,P,perfect,ms})}catch(e){console.warn(e)}   /* 評比第 13 輪 F1：每日同題記成績（解開或看答案都記；R.sx＝每一步走錯幾次、用到第幾層提示） */
    try{if(window.XQNet&&XQNet.shareIRT&&!(XM&&XM.noShare))XQNet.shareIRT({t:"cj",v:2,aid:cjAid(),th:+((r0-5.15)/.818).toFixed(2),r:[[id,R.ans?0:1,R.ans?4:(R.hm||0),R.mist,Math.round(ms/100)/10]]})}catch(e){}
    let rel=null;if(hit&&hit.relic){rel=await cjRelic(CJ0.ERA[(P.src||{}).era]||"classic");if(rel&&!rel.named){S=cjState();S.st.relics=(S.st.relics||0)+1;cjSave(S)}}
    card({perfect,ins,hit,rel,zs,hs,xs})}
  /* 藏局：下一件還沒解的藏局（自己已經撿到的珍品，優先同一朝） */
  function zNext(){if(!Z)return null;const M=store.get("relicSolved",{}),mine=typeof relicsMine==="function"?relicsMine():{},eras=[Z.era].concat(Object.keys(Z.RL).filter(e=>e!==Z.era));
    for(const e of eras)for(const x of Z.RL[e]||[])if(x.cj&&x.id!==Z.it.id&&!M[x.id]&&(mine[e]||[]).includes(x.id))return x;return null}
  function zCardHTML(o){const en=typeof relicEra==="function"?esc(relicEra(Z.era)):"";if(!o.zs)return`<p class="muted">看了答案，「${esc(Z.it.name)}」還沒打上「已解」；下次不看答案解開就會打上。</p>`;
    return`<div class="cj-relic" style="border-color:#C0392B"><span class="rl-seal lg">已解</span><div style="flex:1;min-width:0"><b>🏺 ${esc(Z.it.name)}的藏局解開了！</b><div class="muted">${o.zs.first?"珍品冊那一格打上了紅色「已解」。":"這件珍品之前就打過「已解」了。"}${en}已解 ${o.zs.n}／${o.zs.all}。</div>${o.zs.goldNew?`<div style="color:#C8962E;font-weight:900;margin-top:4px">✦ ${en}的 ${o.zs.all} 件藏局全部解開，珍品冊上的朝代名變成金色了！</div>`:""}</div></div>`}
  const hNext=()=>HS&&typeof histNext==="function"?histNext(HS.era,id):null,nxL=()=>XM?XM.nextL():Z?(zNext()?"下一件藏局":"回珍品冊"):HS?(hNext()?"下一題":"回去"):"下一題";
  function card(o){if(!here())return;stat(o.perfect?"★ 完美解開":R.ans?"👁 答案看完了":"✔ 解開了");actionBar($("#acts"),[["card",XM?XM.icon||"🍵":Z?"🏺":HS?"📜":"🍵","解完卡",()=>card(o)],["next","›",nxL(),next,true]]);
    const s=P.src||{},trap=P.trap;
    sheet(R.ans?"📖 答案看完了":o.perfect?"🍵 完美解開！":"🍵 解開了！",bx=>{bx.innerHTML=`<div class="cj-card">
      <p><b>${esc(P.t)}</b>・${cjLv(P.d)}　${o.perfect?"★ 完美":R.ans?"看了答案（沒有修為、心得）":`走錯 ${R.mist} 次${R.hintUsed?"・用了提示棋":""}`}${R.slow?`・找到 ${R.slow} 次較慢的殺法`:""}</p>
      <p>${cjEra(P)}${cjSrc(P,true)}${s.year&&s.book!=="特級大師對局"?`（${esc(s.year)}${s.by?"・"+esc(s.by):""}）`:""}</p>
      ${P.kill?`<p>殺法：<b>${esc(P.kill)}</b></p>`:""}
      ${(P.th||[]).length?`<p class="muted" style="font-size:13px">主題：${P.th.map(esc).join("、")}</p>`:""}
      ${P.note?`<p class="cj-q">古譜批註：${esc(P.note)}${P.plain?`<br><span class="muted">白話：${esc(P.plain)}</span>`:""}</p>`:""}
      ${P.t==="古譜校錯"?`<p class="cj-q">古譜原著：${esc(P.book.cn)}。Pikafish 認為這步可以更好。${P.quote?`<br><span class="muted">書中後人校注：「${esc(P.quote)}」</span>`:""}</p>`:""}
      ${P.cmt?`<p>🐟 Pikafish：${esc(P.cmt)}</p>`:""}
      ${o.ins?`<p>${esc(o.ins)}</p>`:""}
      ${o.hit?`<p>🔥 今天的茶單完成！連續 ${o.hit.n} 天${o.hit.msg?`<br><span class="muted">${esc(o.hit.msg)}</span>`:""}</p>`:""}
      ${o.rel?cjRelicHTML(o.rel):""}
      ${Z?zCardHTML(o):""}
      ${HS&&typeof histCardDoneHTML==="function"?histCardDoneHTML(HS.era,o.hs,R.ans):""}
      ${XM?XM.done(o.xs,R.ans):""}
      <div class="cj-row">${trap?`<button class="btn ghost" id="cjTrap">如果走 ${esc(C.notate(C.parseFen(P.fen),...sq(trap.mv)))}？</button>`:""}${s.db?`<button class="btn ghost" id="cjBook">看整局</button>`:""}</div>
      <div class="cj-row">${(()=>{const bl=Z?"回珍品冊":HS||XM?"回去":"回茶單";return bl===nxL()?"":`<button class="btn ghost" id="cjBack">${bl}</button>`})()}<button class="btn" id="cjNext">${nxL()}</button></div></div>`;   /* 開發者 11/13 晚截圖：最後一題沒有下一題時兩顆都寫「回去」，同字就只留主按鈕 */
      const on=(q,f)=>{const e=bx.querySelector(q);if(e)e.onclick=f};
      on("#cjTrap",()=>{closeSheet();trapDemo(o)});on("#cjBook",()=>{closeSheet();location.hash="#/db/"+s.db});on("#cjBack",()=>{closeSheet();goUp(BK)});on("#cjNext",()=>{closeSheet();next()});cjZBind(bx);if(XM&&XM.bind)try{XM.bind(bx)}catch(e){}})}
  function trapDemo(o){const tr=P.trap,b0=C.parseFen(P.fen);stat(`如果走 ${C.notate(b0,...sq(tr.mv))}？`);note("");const acc=[];
    actionBar($("#acts"),[["card","🍵","回解完卡",()=>{tok++;card(o)}]]);
    anim([tr.mv].concat(tr.line||[]),b0,(tx,i)=>{acc.push(tx);note(acc.join("　"))},()=>note(acc.join("　")+"\n"+cjWhy(P,tr.code)),true)}
  function next(){if(XM){location.hash=XM.next()||BK;return}
    if(HS){const x=hNext();location.hash=x?"#/canju/h/"+HS.era+"/"+encodeURIComponent(x):BK;return}
    if(Z){const x=zNext();location.hash=x?"#/canju/z/"+encodeURIComponent(x.id):"#/me/relics";return}const S2=cjState(),L=S2.day===cjDay()?S2.list||[]:[];const t=L.find(x=>x.id!==id&&(x.st==="todo"||x.st==="run"));if(t){location.hash="#/canju/"+encodeURIComponent(t.id);return}
    if(L.some(x=>x.id===id)){location.hash="#/canju";return}{const tm=cjThMode(P),n2=tm?cjThNext(D,S2,tm,id):null;if(n2){location.hash="#/canju/"+encodeURIComponent(n2);return}}const n=cjNext(D,S2,P.t,id);location.hash=n?"#/canju/"+encodeURIComponent(n):"#/canju"}
  return{}}
/* ---------- 依主題選題（評比循環第 3 輪「專業象棋教練」P17.1）----------
   題庫每題的 th（tools/canju/10_themes.js 用走法規則標的：殺法、戰術、目標）。今日茶單頁「依主題選題」列出各主題（解過／題數），
   點了開一張清單（由易到難，✔＝解過），可以挑一題或「依序練」；從這裡進去的自由練習記 store "cjTh"＝{th}，解完「下一題」接同一個主題（cjThNext）。
   按上面「自由練習」的題型會清掉 cjTh，回到照題型出題。 */
const CJ_TH_HIDE=["殺棋","保勝"];
function cjThMode(P){const T=store.get("cjTh",null);return T&&T.th&&P&&(P.th||[]).includes(T.th)?T.th:null}
function cjThNext(D,S,th,not){const pool=D.items.filter(x=>(x.th||[]).includes(th)&&!S.solved[x.id]&&x.id!==not);if(!pool.length)return null;
  pool.sort((a,b)=>Math.abs(a.d-S.r)-Math.abs(b.d-S.r));return pool[Math.floor(Math.random()*Math.min(pool.length,6))].id}
function cjThBox(el,D,S){if(!el)return;const G=D.thGroups||[],by=D.byTheme||{};if(!G.length){el.innerHTML='<span class="muted" style="font-size:13px">題庫還沒有主題標籤（更新後就有）。</span>';return}
  const sv=t=>D.items.filter(x=>(x.th||[]).includes(t)&&S.solved[x.id]).length;
  el.innerHTML=G.map(([g,L])=>{const L2=L.filter(t=>by[t]&&!CJ_TH_HIDE.includes(t));return L2.length?`<span class="g">${esc(g)}</span>`+L2.map(t=>`<button data-th="${esc(t)}">${esc(t)} <small>${sv(t)}／${by[t]}</small></button>`).join(""):""}).join("");
  el.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);cjThSheet(D,b.dataset.th)})}
function cjThSheet(D,th){const S=cjState(),L=D.items.filter(x=>(x.th||[]).includes(th)).sort((a,b)=>a.d-b.d),n=L.filter(x=>S.solved[x.id]).length;
  const go=id=>{store.set("cjTh",{th});closeSheet();location.hash="#/canju/"+encodeURIComponent(id)};
  sheet("主題・"+th,b=>{b.innerHTML=`<p class="muted" style="margin:0 0 8px">${L.length} 題・解過 ${n} 題・由易到難。從這裡開始，解完的「下一題」會接同一個主題。</p>
    <button class="btn" id="cjThGo" style="width:100%">▶ 依序練「${esc(th)}」（從還沒解的開始）</button>
    <div class="items" style="padding:0;margin-top:8px">${L.slice(0,120).map(P=>`<button class="item" data-id="${esc(P.id)}"><span class="lb">${S.solved[P.id]?"✔":cjLv(P.d)}</span><span class="tx"><b>${esc(P.t)}・${cjLv(P.d)}</b><span>${cjSrc(P)}・${esc((P.th||[]).filter(x=>x!==th&&!CJ_TH_HIDE.includes(x)).slice(0,3).join("、"))}</span></span><span class="muted">›</span></button>`).join("")}</div>`;
    b.querySelector("#cjThGo").onclick=()=>{const id=cjThNext(D,S,th,null)||(L[0]&&L[0].id);if(id)go(id)};
    b.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>go(x.dataset.id))})}
/* 棋譜庫（10-db.js）看古譜時，ℹ 棋局資訊列出：這一局如果收進一盞茶殘局（src.db＝書/局號），它的題型、難度、戰術主題，按「練這題」直接去解 */
function cjThFor(c,id,el){if(!el)return;cjData().then(D=>{if(!el.isConnected)return;const key=c+"/"+id,L=D.items.filter(x=>(x.src||{}).db===key);if(!L.length)return;
  el.innerHTML='<div class="sec-t" style="margin-left:0">一盞茶殘局・戰術主題</div>'+L.map(P=>`<p style="margin:4px 0;line-height:1.7">${esc(P.t)}・${cjLv(P.d)}：${esc((P.th||[]).filter(x=>!CJ_TH_HIDE.includes(x)).join("、")||"—")} <button class="pill" data-cj="${esc(P.id)}">練這題 ›</button></p>`).join("");
  el.querySelectorAll("[data-cj]").forEach(b=>b.onclick=()=>{closeSheet();location.hash="#/canju/"+encodeURIComponent(b.dataset.cj)})}).catch(()=>{})}
