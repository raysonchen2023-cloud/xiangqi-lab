/* ================= 🏯 千秋盃（意見回饋 635，開發者：每週擂台大賽，16 強，線上虛擬玩家也可以報名）=================
   開發者電腦上的裁判台（xiangqi-lab/tools/cup-host.js）主辦：報名名單、籤表、賽果都簽名後放在大廳 cup/state，App 只認簽名對得上的那一份（XQNet.cup()）。
   每週：週一～週五 22:00 報名 → 週六 13:30～13:55 點將（報到）→ 14:00 開打，16 強單淘汰，大約 17:15 頒獎。
   獎品（開發者 11/5 選了「先做基本的」）：本週擂主頭銜、大廳名字旁的🏆、刻上千秋擂主碑、將令／提示棋／悔棋符／修為；
   不給棋罐的子（棋罐綁劇情進度）；虛擬棋客拿到名次只上擂主碑，不發東西 */
/* 第 9 輪評審（千秋盃報名簽名）：報名、取消、點將要用這支手機的對局金鑰簽名，瀏覽器不能簽名（太舊、不是 https）就送不出去 */
const CUP_NOSEND="沒有送出：目前不能報名，或這支手機的瀏覽器沒辦法簽名（請更新瀏覽器）";
const CUP_RN={1:"兵卒過河",2:"車馬爭先",3:"炮震中原",4:"九宮論劍",5:"雙士爭輝"};
const CUP_RN_SUB={1:"十六強",2:"八強",3:"準決賽",4:"決賽（紅黑各一盤）",5:"季軍戰"};
/* 意見回饋 643（開發者 11/6）：千秋週擂唸起來不順，改名「千秋盃」。裁判台還沒重開前送來的舊名字，顯示時也換成新名字 */
const cupNm=n=>String(n||"千秋盃").split("千秋週擂").join("千秋盃");
const CUP_PRIZE={1:{t:"本週擂主",ling:3,xp:120},2:{t:"攻擂英雄（亞軍）",ling:2,xp:90},3:{t:"守城大將（季軍）",ling:1,xp:60},4:{t:"四強",ling:1,xp:60},8:{t:"八強",hint:3,xp:40},16:{t:"十六強",hint:2,undo:1,xp:30}};
const cupGot=()=>store.get("cupGot",{});
const cupPrizeText=p=>{const z=CUP_PRIZE[p];if(!z)return"";return[z.ling?`🪙 將令 ${z.ling} 枚`:"",z.hint?`💡 提示棋 ${z.hint} 顆`:"",z.undo?`↶ 悔棋符 ${z.undo} 張`:"",z.xp?`修為 +${z.xp}`:""].filter(Boolean).join("、")};
/* 稱號：當週擂主 7 天內最優先；拿過擂主、參加 4 屆以上另有稱號（XQ_TITLE 會先問這裡） */
function cupTitle(){try{const c=window.XQNet&&XQNet.cupChamp&&XQNet.cupChamp();if(c&&!c.test&&c.id===meInfo().id)return"本週擂主";const G=Object.values(cupGot());
  if(G.filter(x=>x===1).length>=3)return"三屆擂主";if(G.includes(1))return"千秋擂主";if(G.length>=4)return"擂台常客"}catch(e){}return""}
/* 大廳名字旁的🏆：只認裁判台簽名的擂主碑（自己改 App 改不出來） */
/* Gemini 評估 11/8（開發者核准）：常駐棋友不再偽裝成真人——人人都看得到「☁ 雲遊棋客」小標籤，名字照舊；大廳名單、千秋盃對陣表、對局名牌、棋友資料都用這一個。
   滑過看 title、點一下跳說明（點標籤不會同時打開棋友資料） */
function cloudTip(){return"雲遊棋客是星槎上的電腦棋友，隨時陪你下棋"}
/* 意見回饋 750：名單、對戰卡、對陣表只放一個小「☁」緊貼名字（滑過、點一下才有說明）；整顆「☁ 雲遊棋客」膠囊只在棋友資料卡（full）；區塊標題旁用 cloudLegend() 放一次圖例 */
function cloudTag(on,full){return on?'<span class="cloudtag'+(full?" full":"")+'" role="note" tabindex="0" title="'+cloudTip()+'" aria-label="雲遊棋客・電腦：'+cloudTip()+'">'+(full?"☁ 雲遊棋客・電腦":"☁電腦")+"</span>":""}
function cloudLegend(on){return on?'<span class="cloudleg">☁電腦＝雲遊棋客（電腦棋友）</span>':""}   /* 開發者 11/11 選大廳規劃書案 01：名冊、棋桌名牌直接寫出「電腦」，不用點才知道 */
/* 開發者 11/11 選「電腦標示全入口核對」：這支手機認過的雲遊棋客代號記下來（最多 300 個），離線、重開 App、角色程式沒開的時候，
   歷史棋譜、對手資料、錯題本一樣標得出「電腦」（原本只有連上大廳、收到名單時才認得） */
let CLOUD_IDS=null;
function isCloud(id){try{if(!id)return false;if(!CLOUD_IDS)CLOUD_IDS=new Set(store.get("cloudIds",[])||[]);
  if(window.XQNet&&XQNet.isBot&&XQNet.isBot(id)){if(!CLOUD_IDS.has(id)){CLOUD_IDS.add(id);store.set("cloudIds",[...CLOUD_IDS].slice(-300))}return true}
  return CLOUD_IDS.has(id)}catch(e){return false}}
function devBotTag(id){return cloudTag(isCloud(id))}
document.addEventListener("click",e=>{const t=e.target&&e.target.closest&&e.target.closest(".cloudtag");if(!t)return;e.stopPropagation();e.preventDefault();toast("☁ "+cloudTip())},true);
function cupBadge(id){let t="";try{const c=window.XQNet&&XQNet.cupChamp&&XQNet.cupChamp();t=c&&!c.test&&c.id===id?' <span title="本週擂主" style="font-size:13px">🏆</span>':""}catch(e){}return t+devBotTag(id)}
const cupT=t=>{try{return new Date(t).toLocaleString("zh-TW",{weekday:"short",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false})}catch(e){return""}};
function cupMine(S){S=S||(window.XQNet&&XQNet.cup());if(!S||!S.m)return null;const me=meInfo().id;let last=null;
  for(const id of S.order||[]){const m=S.m[id];if(m&&((m.a&&m.a.id===me)||(m.b&&m.b.id===me))){last=m;if(m.st!=="done")return m}}return last}
/* 比賽結束：自己有名次就發獎（每一屆只發一次） */
function cupGrant(S){if(!S||S.ph!=="done"||!S.place)return;const me=meInfo().id,p=S.place[me];if(!p)return;const G=cupGot();if(G[S.wk])return;
  const pz=S.practice&&p!==16?CUP_PRIZE[16]:CUP_PRIZE[p];G[S.wk]=p;store.set("cupGot",G);if(!pz)return;
  if(pz.ling&&typeof lingAdd==="function"){lingN();lingAdd(pz.ling)}if(pz.hint)store.set("hintBonus",(store.get("hintBonus",0)||0)+pz.hint);if(pz.undo)store.set("undoBonus",undoLeft()+pz.undo);
  if(pz.xp&&typeof addXP==="function")addXP(pz.xp,"千秋盃","cup:"+S.wk);vibrate([20,40,20,40,60]);
  const head=p===1?"🏆 你是本週擂主！":p===2?"🥈 攻擂英雄！":p<=4?"🥉 闖進四強！":p===8?"🎖 闖進八強！":"🎖 謝謝你上擂台！";
  setTimeout(()=>modal(`<div class="em">${p===1?"🏆":"🏯"}</div><h2>${head}</h2><p>${esc(cupNm(S.name))}${S.ed?` 第 ${S.ed} 屆`:""}：你拿到「${esc((S.practice&&p!==16?CUP_PRIZE[16]:CUP_PRIZE[p]).t)}」</p><p class="muted">${esc(cupPrizeText(S.practice&&p!==16?16:p))}${S.practice?"<br>（這一屆真人不到 2 位，是闖擂練習，只發參加獎）":""}${p===1&&!S.practice?"<br>這一週你的名字旁邊會有 🏆，也刻上了千秋擂主碑。":""}</p>`,[["好",null]]),900)}
/* 不管在哪個畫面：輪到自己的比賽開打就提醒入座 */
let CUP_ASKED="";
function cupWatch(){if(!(OFF&&window.XQNet&&XQNet.on))return;XQNet.on("cup",k=>{if(k!=="state")return;const S=XQNet.cup();if(!S)return;cupGrant(S);
  const m=cupMine(S);if(m&&m.st==="live"&&m.gid&&XQNet.gid()!==m.gid&&CUP_ASKED!==m.gid){CUP_ASKED=m.gid;vibrate([40,60,40,60,40]);
    modal(`<div class="em">🏯</div><h2>你的擂台比賽開始了！</h2><p>${esc(cupNm(S.name))}・${esc(CUP_RN[m.r]||"")}<br>${esc(m.a.name)} 對 ${esc(m.b.name)}</p><p class="muted">5 分鐘內沒有入座算棄擂。比賽中不能悔棋，下滿 20 回合才能提和。</p>`,[["⚔ 入座",()=>cupJoin(m.gid)],["等一下",null,true]])}})}
function cupJoin(gid){if(!gid)return;const go=()=>{XQNet.watch(gid);location.hash="#/pvp"};if(XQNet.playing()&&XQNet.gid()!==gid)confirmBox("你有一盤進行中的對局，去打擂台會離開它，確定？",()=>{XQNet.leave();go()},"去打擂台");else go()}
setTimeout(cupWatch,600);

function CupPage(v){setTop("🏯 千秋盃","#/hub/battle");setTabs(true,"#/hub/battle");   /* 11/10 開發者「千秋盃只留一個」：入口只剩茶坊二樓，下樓回茶坊 */
  v.className="view";
  if(!OFF||!window.XQNet){v.innerHTML='<div class="pad"><div class="card">千秋盃要用安裝在手機上的 App（GitHub 版）。</div></div>';return{}}
  XQNet.start();v.innerHTML='<div class="pad" id="cupb"><div class="card muted">連線到大廳，讀取本週的擂台…</div></div>';
  const pn=(p,w)=>!p?'<div class="nmx muted">（等前一場的勝者）</div>':p.none?'<div class="nmx muted">（從缺）</div>':`<div class="nmx"><b${w?' style="color:var(--accent)"':""}>${esc(p.name)}</b>${cloudTag(p.bot||isCloud(p.id))}${p.seed?`<small class="muted">${p.seed} 號</small>`:""}</div>`;
  function paint(){const box=v.querySelector("#cupb");if(!box)return;const S=XQNet.cup(),H=XQNet.cupHall(),me=meInfo().id,now=Date.now();
    if(!S){box.innerHTML=`<div class="card" style="line-height:1.8">${XQNet.status()==="up"?"還沒收到本週的擂台資訊。裁判台在開發者的電腦上，電腦開著的時候才有比賽；過一會兒再來看看。":"連線到大廳中…"}</div>`+rules()+hall(H);return}
    const reg=S.reg||[],ri=reg.findIndex(r=>r.id===me),inMain=ri>=0&&ri<16,ck=(S.ck||[]).includes(me),mine=cupMine(S);
    const ttl=`${esc(cupNm(S.name))}${S.ed?` 第 ${S.ed} 屆`:""}`;let top="";
    if(S.ph==="reg")top=`<p style="line-height:1.8;margin:0 0 8px">週六下午 ${cupT(S.t.r[0]).replace(/^.*?(\d+:\d+)$/,"$1")} 開打（${cupT(S.t.r[0])}）。報名到 ${cupT(S.t.reg1)}，比賽當天 ${cupT(S.t.ck0)}～${cupT(S.t.ck1).replace(/^.*?(\d+:\d+)$/,"$1")} 要回來按「點將」報到。</p>
      <div class="muted" style="margin-bottom:8px">已報名 ${Math.min(16,reg.length)}／16${reg.length>16?`・候補 ${reg.length-16} 位`:""}</div>
      ${ri>=0?`<div class="card" style="margin-bottom:8px;border:2px solid var(--accent2)">✅ 你已經報名了${inMain?"":`（候補第 ${ri-15} 位）`}。週六 ${cupT(S.t.ck0).replace(/^.*?(\d+:\d+)$/,"$1")} 記得回來點將。</div><button class="btn ghost" id="cuU">取消報名</button>`:`<button class="btn" id="cuR">🏯 我要報名</button>`}`;
    else if(S.ph==="wait")top=`<p style="line-height:1.8">報名截止了（${Math.min(16,reg.length)} 位${reg.length>16?`、候補 ${reg.length-16} 位`:""}）。${cupT(S.t.ck0)} 開始點將。</p>${ri>=0?'<div class="card">✅ 你有報名，記得準時回來點將。</div>':'<div class="muted">這一屆報名已經截止，下週一再來報名。</div>'}`;
    else if(S.ph==="ck")top=`<p style="line-height:1.8">點將中！${cupT(S.t.ck1).replace(/^.*?(\d+:\d+)$/,"$1")} 截止，${cupT(S.t.r[0]).replace(/^.*?(\d+:\d+)$/,"$1")} 擊鼓開擂。沒點將的位子會讓給候補，還有空位才由虛擬棋客補上。</p>
      <div class="muted" style="margin-bottom:8px">已點將 ${(S.ck||[]).length} 位</div>${ri<0?'<div class="muted">你這一屆沒有報名，可以等開打後來觀戰。</div>':ck?'<div class="card" style="border:2px solid var(--accent2)">✅ 點將完成！開打時會跳出「入座」，留在 App 裡等一下。</div>':'<button class="btn" id="cuK">🥁 點將（我到了）</button>'}`;
    else if(S.ph==="off")top=`<div class="card">${esc(S.why||"這一週休賽")}</div>`;
    else if(S.ph==="play"){const live=mine&&mine.st==="live"&&mine.gid;
      top=`${S.practice?'<div class="card muted" style="margin-bottom:8px">這一屆真人不到 2 位，是「闖擂練習」：照常比賽，只發參加獎。</div>':""}${live?`<button class="btn" id="cuJ" data-g="${esc(mine.gid)}">⚔ 入座：${esc(CUP_RN[mine.r])}</button>`:mine&&mine.st!=="done"?`<div class="card" style="border:2px solid var(--accent2)">⏳ 你的下一場是「${esc(CUP_RN[mine.r])}」，前面的比賽打完就開始，開打時會跳出「入座」。</div>`:mine&&mine.st==="done"&&mine.w!==me?'<div class="card">這一屆你止步了，謝謝你上擂台！可以留下來觀戰，看誰當上擂主。</div>':""}`}
    else if(S.ph==="done"){const c=S.champ,p=S.place&&S.place[me];
      top=`<div class="card" style="text-align:center;line-height:1.8"><div style="font-size:40px">🏆</div><b style="font-size:20px">${c?esc(c.name):"（從缺）"}</b>${c?cloudTag(c.bot||isCloud(c.id)):""}<div class="muted">本週擂主</div>${p?`<div style="margin-top:6px">你的成績：<b>${esc((CUP_PRIZE[p]||{}).t||"")}</b>${S.practice&&p!==16?"（闖擂練習只發參加獎）":""}</div>`:""}<div class="muted" style="font-size:13px;margin-top:4px">技壓群雄，登頂擂主！下週擂台虛位以待，誰來攻擂？</div></div>`}
    box.innerHTML=`<div class="abn" style="height:120px;background-image:url(data/arenagate/classic.webp);background-position:center 40%;margin-bottom:10px"><div class="hc"><b>🏯 ${ttl}</b><small>每週六下午・16 強擂台・每方 ${S.tc?S.tc.m:10} 分鐘＋每步 ${S.tc?S.tc.inc:5} 秒</small></div></div>${top}${bracket(S)}${rules()}${hall(H)}`;
    const b=k=>box.querySelector(k);
    if(b("#cuR"))b("#cuR").onclick=()=>{if(!myName())return nameSheet(true);if(!XQNet.cupReq("reg"))return toast(CUP_NOSEND);vibrate(10);toast("🏯 報名送出了，等裁判台確認…")};
    if(b("#cuU"))b("#cuU").onclick=()=>confirmBox("確定取消這一屆的報名？",()=>{if(!XQNet.cupReq("unreg"))return toast(CUP_NOSEND);toast("已送出取消")},"取消報名");
    if(b("#cuK"))b("#cuK").onclick=()=>{if(!XQNet.cupReq("ck"))return toast(CUP_NOSEND);vibrate([20,40,20]);toast("🥁 點將送出了")};
    if(b("#cuJ"))b("#cuJ").onclick=e=>cupJoin(e.currentTarget.dataset.g);
    box.querySelectorAll("[data-cw]").forEach(x=>x.onclick=()=>{XQNet.watch(x.dataset.cw);location.hash="#/pvp"})}
  function bracket(S){if(!S.m||!S.order||!S.order.length)return"";const me=meInfo().id;let h="";
    for(const r of[1,2,3,4,5]){const ms=S.order.map(id=>S.m[id]).filter(m=>m&&m.r===r);if(!ms.length)continue;
      h+=`<div class="sec-t">${esc(CUP_RN[r])}・${esc(CUP_RN_SUB[r])}</div>`+ms.map(m=>{const mine=(m.a&&m.a.id===me)||(m.b&&m.b.id===me),aw=m.w&&m.a&&m.w===m.a.id,bw=m.w&&m.b&&m.w===m.b.id;
        const st=m.st==="live"?`<button class="pill" data-cw="${esc(m.gid)}" style="flex:none">👀 觀戰</button>`:m.st==="done"?`<span class="muted" style="font-size:12px;flex:none">${m.r===4?esc(m.sc.join(" : ")):"✔"}</span>`:m.st==="tb"||m.st==="next"?'<span class="muted" style="font-size:12px;flex:none">下一盤</span>':"";
        return`<div class="card row" style="justify-content:space-between;gap:8px;margin-bottom:6px${mine?";border:2px solid var(--accent2)":""}"><span style="flex:1;min-width:0;line-height:1.7">${pn(m.a,aw)}${pn(m.b,bw)}${m.why?`<div class="muted" style="font-size:12px">${esc(m.why)}</div>`:""}</span>${st}</div>`}).join("")}
    const bt=Object.values(S.m).some(m=>m&&[m.a,m.b].some(p=>p&&!p.none&&(p.bot||isCloud(p.id))));
    return h?(bt?h.replace('</div>',cloudLegend(1)+"</div>"):h):""}
  function rules(){return`<details class="card" style="margin-top:10px;line-height:1.8"><summary><b>📜 比賽規則</b></summary>
    <p>・16 強單淘汰：兵卒過河（16 強）→ 車馬爭先（8 強）→ 炮震中原（準決賽）→ 九宮論劍（決賽，紅黑各一盤）；另有一盤雙士爭輝（季軍戰）。<br>・每方 10 分鐘，每走一步加 5 秒；每一步最多 3 分鐘。<br>・和棋就加賽一盤超快棋（紅 5 分、黑 4 分），正局拿黑的人拿紅；加賽再和，算黑方勝。<br>・落子無悔：比賽中不能悔棋，下滿 20 回合才能提和。<br>・開打 5 分鐘還沒入座算棄擂。比賽中斷線不會中止，時間照走，回來可以接著下。<br>・對手是不是本人：裁判台用報名時的簽名核對雙方手機的金鑰，比賽中兩支手機互傳的連線訊息也都簽名（點棋盤右下角的訊號膠囊，看得到「裁判台認證」和指紋）。<br>・名次獎：擂主 🪙將令 3 枚、亞軍 2 枚、四強 1 枚，八強 💡提示棋 3 顆，十六強 💡2 顆＋↶1 張，另有修為。</p></details>
    <details class="card" style="margin-top:8px;line-height:1.8"><summary><b>👨‍👩‍👧 家長看這裡</b></summary><p>千秋盃每週六下午 14:00 開始，大約 17:15 結束；每盤大約 20 分鐘，輸了就結束，最多下 5 盤。完全免費、沒有任何付費，獎品只是 App 裡的徽章和道具。比賽在公開伺服器上進行，只傳暱稱和棋步，建議不要用本名。人數不夠時，空位由 App 的常駐「虛擬棋客」補上，籤表上會標出來。</p></details>`}
  function hall(H){const L=(H&&H.list||[]).filter(x=>!x.test).slice(0,12);if(!L.length)return"";
    return`<div class="sec-t">🪨 千秋擂主碑${cloudLegend(L.some(x=>x.bot))}</div><div class="card" style="line-height:1.9">${L.map(x=>`<div class="nmx"><span class="muted" style="flex:none">第 ${x.ed} 屆</span><b>${esc(x.name)}</b>${cloudTag(x.bot)}${x.practice?'<small class="muted">練習</small>':""}<small class="muted" style="margin-left:auto">${new Date(x.at).toLocaleDateString()}</small></div>`).join("")}</div>`}
  const offs=[XQNet.on("cup",paint),XQNet.on("status",paint)];paint();const t=setInterval(paint,20000);
  return{stop:()=>{offs.forEach(f=>f());clearInterval(t)}}}
