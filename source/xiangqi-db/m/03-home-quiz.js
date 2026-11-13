// ================= 首頁 =================
// 線上版（電腦給的 trycloudflare 網址）被加到主畫面的話，電腦重開後網址就失效；請改裝 GitHub 版
function standaloneOnlineWarn(v){if(OFF||!(matchMedia("(display-mode: standalone)").matches||navigator.standalone))return;
  const c=document.createElement("div");c.className="card";c.style.cssText="margin:12px;border-color:var(--warn)";
  c.innerHTML=`<b>⚠ 這個主畫面圖示會失效</b><p class="muted" style="margin:6px 0">它記住的是電腦這次的臨時網址，電腦程式一重開就連不上。請改裝「象棋千秋」正式版：按下面按鈕，在 Safari 打開後選「加入主畫面」，再把這個舊圖示刪掉。正式版會自己找到電腦的新網址。</p><button class="btn" id="gh">打開正式版（已帶好連線設定）</button>`;
  v.prepend(c);c.querySelector("#gh").onclick=async()=>{let u=APP_HOME;try{const r=await api("/remote");u=(r.urls||[]).find(x=>x.includes("#connect="))||u}catch(e){}location.href=u}}
function Home(v,hub){   /* hub：沒有＝首頁三張大卡；"battle"＝對戰頁；"learn"＝學習頁（開發者看 Gemini UI／UX 審閱後決定） */
  const RI=DEVREMOTE()?XQ.remoteInfo():null;  // 這支手機連過主人的電腦嗎
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
  setTop("象棋千秋",false,OFF?[].concat(RI?[["🔗",connectSheet,"連線到電腦"]]:[]).concat(!hub&&DEVMODE()&&typeof openFbAdmin==="function"?[["📋",openFbAdmin,"意見回饋管理"]]:[])  :[["👥",whoSheet,"誰在線上"]]);   /* 11/10 開發者：首頁只留 📋 圖示，放在頂欄右上角角色頭像左邊 */meChip();   /* 意見回饋 570：📋 移到設定頁 */   /* 意見回饋 536：首頁左上角的頭像，點了進「我的角色」；531：首頁右上角的「分享給朋友」「意見回饋」拿掉（都在 設定 → 系統） */setTabs(true,"#/");   /* 意見回饋 409：意見回饋按鈕放在首頁最右上角 */
  if(hub){setTop(typeof xqHubName==="function"?xqHubName(hub==="battle"?"battle":"learn"):(hub==="battle"?"⚔ 對戰":"📚 學習"),"#/");setTabs(true,"#/")}
  const T=(k,go,ic,t,id,s,x,cta)=>`<button class="tile strip ${k}${x||""}" data-go="${go}"><span class="ic">${ic}</span><span class="tx"><span class="t">${t}</span><span class="s"${id?` id="${id}"`:""}>${s}</span></span><b class="go">${cta||"›"}</b></button>`;
  v.innerHTML=`<div class="home">
   ${RI?'<div class="card hstat" id="hStatus"><span class="muted">檢查中…</span></div>':""}
   <!-- 首頁三張大卡；對戰、學習各一頁（裡面還是原本那些長條） -->
   ${!hub&&OFF&&!standalone&&!(store.get("instAsk",null)||{}).no?`<button class="card instc" id="hInst2"><span class="ii">📲</span><span class="tx"><b>加到主畫面</b><small>全螢幕・沒網路也能下</small></span><b class="go">›</b></button>`:""}
    <!-- ChatGPT 接手改善 2026-11-10：棋盤、練習、研究優先；探索由玩家主動展開。 -->
    ${!hub?`<div class="hub3" aria-label="下棋與研究">
      <button class="tile hubc hb" data-go="#/cpu"><span class="hi">♟</span><span class="tx"><span class="t">直接下棋</span><span class="s" id="hCpu">挑戰電腦・接著下未完的一盤</span></span><b class="go">下棋 ›</b></button>
      <button class="tile hubc hl" data-go="#/hub/learn"><span class="hi">📚</span><span class="tx"><span class="t">學棋解題</span><span class="s">新手訓練・錯棋重練・每日殘局</span></span><b class="go">練習 ›</b></button>
      <button class="tile hubc hl" data-go="#/db"><span class="hi">📜</span><span class="tx"><span class="t">古譜研究</span><span class="s">古譜・大師名局・我的對局與複盤</span></span><b class="go">研究 ›</b></button>
    </div><div class="hero strips">${T("k2","#/hub/battle","👥","與人對弈","hNet","線上棋友・同桌對弈・每週比賽")}</div>`:""}
    ${!hub&&!store.get("campSeen",false)&&!Object.keys(store.get("record",{})).length?`<button class="card instc" data-go="#/camp"><span class="ii">🔰</span><span class="tx"><b>第一次下象棋？</b><small>${CAMP.length} 堂小課・一課一步</small></span><b class="go">›</b></button>`:""}
    ${!hub&&OFF?`<details class="card home-explore"><summary style="cursor:pointer;font-weight:700;min-height:44px;align-content:center">故事與探索（選看）</summary><p class="muted">想換個心情時再出發；下棋與研究不需要先完成故事。</p>${typeof homePathHTML==="function"?homePathHTML():typeof homeRecHTML==="function"?homeRecHTML():typeof shipHomeHTML==="function"?shipHomeHTML():`<button class="tile strip" data-go="#/adventure"><span class="tx"><span class="t">雲河星槎</span><span class="s">故事、戰役與角色探索</span></span><b class="go">›</b></button>`}</details>`:""}
   ${!hub&&OFF&&typeof canjuCardHTML==="function"&&typeof homePathHTML!=="function"?canjuCardHTML():""}
   ${hub==="battle"?`<div class="sec-t" style="margin-top:4px">實戰</div>
   <div class="hero strips">
    ${T("k1","#/cpu","🤖","挑戰電腦","hCpu","幻影棋客・晉級賽","","下棋 ›")}
    ${OFF?T("k2","#/lobby","🌐","線上對戰・觀戰","hNet","看誰在線上・邀請對戰・觀看別人下棋","","進大廳 ›"):T("k4","#/watch/ai","📺","AI 對戰","hAi","GPT 對 Claude")}
    ${T("k3","#/pvp","👥","同桌對弈","hPvp","兩個人用同一支手機輪流下・家人朋友面對面","","開一盤 ›")}
    ${T("k2","#/simul","🀄","車輪戰","hSim","一個人同時下 3／5／10 盤，像特級大師一樣繞場","","開一場 ›")}
   </div>
   ${OFF?`<div class="sec-t">每週比賽</div><div class="hero strips">${T("k1","#/cup","🏆","千秋盃","hCup",(()=>{try{const S=window.XQNet&&XQNet.cup&&XQNet.cup();if(S){const n=Math.min(16,(S.reg||[]).length);const ph={reg:"報名中・已報名 "+n+"／16・週六 14:00 開打",wait:"報名截止・週六 13:30 點將",ck:"🥁 點將中！快來報到",play:"⚔ 比賽進行中・可以觀戰",done:"🏆 本週擂主："+(S.champ?lbnShow(S.champ):"從缺"),off:"本週休賽"}[S.ph];if(ph)return esc(ph)}}catch(e){}return"每週六 14:00・16 強擂台・週一到週五報名・免費"})(),"","報名 ›")}</div>`:""}
   ${OFF?'<div class="sec-t">朝代擂台</div>':""}
${OFF?(()=>{const n=Object.keys(arenaStamps()).length,t=arenaTitle();return`<button class="card" id="hArena" style="display:flex;align-items:center;gap:12px;width:100%;margin:0 0 8px;padding:10px 14px;text-align:left;font:inherit;color:inherit;cursor:pointer;border-color:color-mix(in srgb,#C8102E 45%,var(--line))"><span style="font-size:30px">🏯</span><span style="flex:1;min-width:0"><b style="font-size:16px;font-family:var(--serif)">朝代擂台</b><span class="muted" style="display:block;font-size:12.5px">${n?`打贏 ${n}/13 位擂主${t?"・"+esc(t):""}・下一位擂主等你`:"園子裡 13 位朝代擂主，打贏了千秋印亮一邊"}</span></span><b style="color:#C8102E">挑戰 ›</b></button>`})():""}
   `:""}
   ${hub==="learn"?`<div class="sec-t">學習</div>
   <div class="hero strips">
    ${T("k2","#/camp","🔰","新手訓練營","",(()=>{const n=Object.keys(campStars()).length;return n?`已上完 ${n}／${CAMP.length} 課`:`第一次下象棋？${CAMP.length} 堂小課，親手走一步學一招`})())}
    ${T("k1","#/stats","🏅","我的戰績","","勝負・段位・🎯 我的棋力")}
    ${T("k3","#/openings","📊","我的開局","","你常用的開局・勝率・中局正招")}
    ${T("k2","#/redo","🔁","錯棋重練","","從下錯的那一步再下一次，練到對")}
    ${T("k3","#/quiz","🎯","棋力測驗","hQuiz","每級 2 題・估出你的段位（新手～專2）")}
    ${T("k1","#/theme","🧠","主題訓練","","將軍・捉雙・抽將・牽制…選一個主題連做 10 題")}
    ${T("k1","#/canju","🍵","一盞茶殘局","","每天 3 題・5～8 分鐘・古譜與大師殘局")}
    ${T("k1","#/guess","🎓","猜著法","hGuess","跟著大師名局一步步猜下一手・練局面判斷")}
    ${T("k4","#/db","📜","棋譜庫","","古譜・特級大師名局・我的對局")}
    ${T("k2","#/terms","📚","象棋規則","","玩法・記譜法・術語・殺法")}
   </div>`:""}
   <div class="hfoot">
    ${standalone?"":'<button class="lk" id="hInst" style="flex-basis:100%" aria-label="加到主畫面，像 App 一樣全螢幕使用">📲 加到主畫面</button>'}
   </div>
  </div>`;
  if(OFF){appVer().then(x=>{const e=v.querySelector("#hVer");if(e)e.textContent="版本 "+(!x?"未知":/^\d{8}-\d{4}$/.test(x)?`${x.slice(0,4)}/${x.slice(4,6)}/${x.slice(6,8)} ${x.slice(9,11)}:${x.slice(11,13)}`:x.slice(0,8))});
    const hc=v.querySelector("#hConn");if(hc)hc.onclick=connectSheet}
  const hi=v.querySelector("#hInst");if(hi)hi.onclick=()=>installGuide(true);{const h2=v.querySelector("#hInst2");if(h2)h2.onclick=()=>{vibrate(5);installGuide(true)}}
  v.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{vibrate(5);location.hash=b.dataset.go});
  try{if(!hub&&OFF)canjuCardBind(v)}catch(e){}   /* 一盞茶殘局：首頁「今日茶單」小卡更新文字 */
  try{if(!hub&&OFF){if(typeof homePathBind==="function")homePathBind(v);else if(typeof homeRecBind==="function")homeRecBind(v)}}catch(e){}   /* Gemini 評估 11/8：🛤 首頁路線圖（07l-homepath.js），取代 ⭐ 今日推薦、星槎大卡、今日茶單小卡；沒有那個檔就照舊 */
  {const hl=v.querySelector("#hLegend");if(hl){const t=hl.closest(".tile");if(t)t.onclick=()=>{vibrate(5);location.hash="#/adventure"}}}
  {const q=v.querySelector("#hQuick");if(q){const go=e=>{e.stopPropagation();e.preventDefault();vibrate(5);location.hash="#/cpu"};q.onclick=go;q.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")go(e)}}}   /* 意見回饋 674：⚡ 下一盤 */
  {const hx=v.querySelector("#hXP");if(hx){const t=hx.closest(".tile");if(t)t.onclick=()=>{vibrate(5);xpSheet()}}}
  {const ha=v.querySelector("#hArena");if(ha)ha.onclick=()=>{vibrate(5);store.set("park3d",true);location.hash="#/arena"}}
  standaloneOnlineWarn(v.firstElementChild||v);
  if(OFF){if(RI)homeStatus(v.querySelector("#hStatus"));if(window.XQ_justConnected){XQ_justConnected=false;if(DEVMODE())setTimeout(()=>toast("已連上電腦！"),300)}}
  const qb=store.get("quizBest",null);if(qb&&v.querySelector("#hQuiz"))v.querySelector("#hQuiz").textContent="最好："+qb.rank;
  let offNet=[];if(OFF&&window.XQNet){const upd=()=>{const e=v.querySelector("#hNet");if(!e)return;const n=XQNet.onlineCount?XQNet.onlineCount():XQNet.people().length;   /* 回饋 854（開發者 11/9：專用 MQTT 伺服器、降流量）：首頁不收整份在線名單，人數用大廳角色程式算好的；拿不到人數就只寫「線上大廳」 */
      e.textContent=(XQNet.playing()?"🔴 有一盤在下・":"")+(XQNet.status()!=="up"?(typeof offNow==="function"&&offNow()?"📴 沒有網路，連上才能用":"連線中…"):n==null?"🟢 線上大廳・邀請對戰・觀戰":n?`🟢 ${n} 人在線上`:"⚪ 只有你在線上");
      // 線上段位（XQNet.rating() 回傳 {pts,rank,w,l,d}）
      let rt=null;try{rt=XQNet.rating?XQNet.rating():null}catch(x){}
      const tile=e.closest(".tile");let bd=tile.querySelector(".bd");
      if(rt&&rt.rank){if(!bd){bd=document.createElement("span");bd.className="bd";const tt=tile.querySelector(".t");(tt||tile).append(bd)}bd.textContent=rt.rank;bd.title=`我的段位 ${rt.rank}・${rt.pts} 分`}else if(bd)bd.remove()};
    upd();offNet=[XQNet.on("people",upd),XQNet.on("status",upd)]}
  /* 意見回饋 340：「繼續研究」搬到棋譜庫那一頁 */
  api("/play/state").then(st=>{
    const won=st.levels.filter(l=>(st.record[l.n]||{}).w>0).length;
    /* 意見回饋 299：一定寫出電腦段位和積分；有下到一半的對局再接在後面 */
    const e=v.querySelector("#hCpu");if(e){const rk=st.cpuRate?`🏅 ${st.cpuRate.rank}・${st.cpuRate.pts} 分`:`已通關 ${won}／8 級`,on=st.cpuRate&&st.cpuRate.next?`・再 ${st.cpuRate.toNext} 分升 ${st.cpuRate.next}`:"";e.textContent=rk+on}
    /* 意見回饋 304、306、308：下到一半的棋就在自己那一條裡提醒（第二行寫模式、回合、輪到誰，右邊改成「繼續下」，外框加亮）：
       挑戰電腦的寫在「挑戰電腦」、擂台的寫在「朝代擂台」；兩種各留一盤，可以同時都還沒下完，點哪一條就接著下哪一盤 */
    const cur=!st.result&&st.moves&&st.moves.length?{kind:st.practice?"practice":st.journey?"journey":st.arena?"arena":"cpu",journey:st.journey,arena:st.arena,ranked:st.ranked,level:st.level,practice:st.practice,n:st.moves.length,me:st.turn===st.human}:null,
      O=(st.others||(st.other?[st.other]:[])).map(z=>({...z,me:(z.n%2?"b":"r")===z.human})),pick=k=>cur&&cur.kind===k?cur:O.find(z=>z.kind===k)||null,
      G={cpu:pick("cpu"),arena:pick("arena"),journey:pick("journey")},
      line=g=>`⏳ ${g.kind==="arena"?(typeof ARENA!=="undefined"&&ARENA[g.arena]?ARENA[g.arena].name:"擂台"):g.practice?"錯棋重練":g.ranked?"晉級賽":`第 ${g.level} 級`}下到第 ${Math.ceil(g.n/2)} 回合・${g.me?"輪到你走":"輪到電腦"}`,
      go=kind=>{vibrate(5);if(kind==="arena")store.set("park3d",true);location.hash=kind==="arena"?"#/arena":"#/cpu"};   /* 意見回饋 319：朝代擂台在公園 3D 裡 */
    if(e&&G.cpu){const tile=e.closest(".tile");e.innerHTML=`${esc(e.textContent)}<span class="rsm">${esc(line(G.cpu))}</span>`;
      if(tile){tile.classList.add("resume");const g=tile.querySelector(".go");if(g)g.textContent="繼續下 ›";tile.onclick=()=>go("cpu")}}
    else if(e&&cur&&cur.kind!=="cpu"){const tile=e.closest(".tile");   /* 擂台在桌上、挑戰電腦沒有收著的：點「挑戰電腦」開一盤新的，擂台那盤先收起來 */
      if(tile)tile.onclick=()=>{vibrate(5);location.hash="#/cpu"}}
    const ha=v.querySelector("#hArena");if(ha&&G.arena){const sub=ha.querySelector(".muted"),cta=ha.querySelector(":scope>b");if(sub)sub.textContent=line(G.arena);if(cta)cta.textContent="繼續下 ›";
      ha.style.borderWidth="2px";ha.style.borderColor="#C8102E";ha.onclick=()=>go("arena")}
    const hl=v.querySelector("#hLegend");if(hl&&G.journey)hl.textContent=`⏳ ${jName(G.journey.journey)}・${G.journey.me?"輪到你":"等電腦"}`}).catch(()=>{});
  if(!OFF)api("/state").then(st=>{const e=v.querySelector("#hAi");if(e)e.innerHTML=st.running?'<span class="live">直播中</span>':st.result?"上一盤："+(st.result.w?PLAYER[st.result.w]+"勝":"和局"):"按進去可以開始"}).catch(()=>{});
  return{stop:()=>offNet.forEach(f=>f())}}

// ================= 棋力測驗：11 個等級（業1～業9、專1、專2）各出 2 題，由淺到深 =================
// 題目來自公版古譜，答案由 Pikafish 算好存在題庫裡（離線也能測）。等級只是估計，不是正式段位。
/* ================= 棋力測驗：自適應（CAT，意見回饋 301） =================
   題目參數（3PL 試題反應理論）：難度 b＝(等級−7)×0.55、鑑別度 a 由「最佳著比第二好多幾分 gap」推、猜對率 c＝0.05；
   有校正檔（大家匿名分享的答題結果算出來的）就用校正過的 a、b。
   每題挑「在你目前能力 θ 的資訊量最大」的題，四類（殺法／戰術／局面／殘局）輪流出；能力用貝氏（EAP）估，
   誤差 SE ≤ 0.35 且至少 8 題、或滿 20 題就結束。每題記下對錯、類別、秒數，給天賦系統用。 */
const QZ={S:.55,MID:7,C:.05,CATS:["殺法","戰術","局面","殘局"]};
const qzCat=q=>q.cat||(q.mate?"殺法":String(q.board).split(",").filter(p=>p&&"RNCrnc".includes(p)).length<=6?"殘局":q.cap||q.gap>=300?"戰術":"局面");
const qzPar=q=>({a:q.ca||(.8+Math.min(1,(q.gap||100)/400)),b:q.cb!=null?q.cb:(q.tier-QZ.MID)*QZ.S-(q.cap?.15:0),c:QZ.C});
const qzP=(th,p)=>p.c+(1-p.c)/(1+Math.exp(-p.a*(th-p.b)));
const qzInfo=(th,p)=>{const P=qzP(th,p);return p.a*p.a*Math.pow(P-p.c,2)*(1-P)/(Math.pow(1-p.c,2)*P)};
/* 數學修正 11/11（審查 6-C）：先驗 N(mu, 1.5²)——點「我是新手」先驗平均 −3，其實是業4 的人 8 題就停會被拉低約 0.6 階；放寬成 1.5 後約 0.3 階（sim/sim-irt-prior.js）。quizLog 每題多存當時的 a、b（x[7]、x[8]），天賦系統的 tlIRT 用同一套參數 */
function qzEAP(ans,mu){const th=[],w=[];for(let t=-4.5;t<=4.501;t+=.05){let L=-Math.pow(t-mu,2)/(2*1.5*1.5);for(const x of ans){const P=qzP(t,x.p);L+=x.ok?Math.log(P):Math.log(1-P)}th.push(t);w.push(L)}
  const mx=Math.max(...w),W=w.map(x=>Math.exp(x-mx)),S=W.reduce((a,b)=>a+b,0),m=th.reduce((a,t,i)=>a+t*W[i],0)/S;return{th:m,se:Math.sqrt(th.reduce((a,t,i)=>a+(t-m)**2*W[i],0)/S)}}
/* 殘局技巧：依走棋方剩下的大子分類（單車、車馬、雙炮…，沒有大子就是兵殘局） */
const endTech=(b,side)=>{const up=side==="r",c={R:0,N:0,C:0};for(const p of b)if(p&&(p===p.toUpperCase())===up&&c[p.toUpperCase()]!=null)c[p.toUpperCase()]++;
  const nm={R:"車",N:"馬",C:"炮"},parts=[];for(const k of["R","N","C"])if(c[k])parts.push(c[k]>1?"雙"+nm[k]:nm[k]);return parts.length?(parts.length===1&&!/雙/.test(parts[0])?"單"+parts[0]:parts.join(""))+"殘局":"兵殘局"};
const qzTier=(th,n)=>Math.max(0,Math.min(n-1,Math.round(th/QZ.S+QZ.MID)));
/* 開發者 11/11 選規劃書方案 04：題目的招式標籤對到主題訓練（07-legend THEMES）；一題有好幾個標籤時，挑最具體的那個（將軍、殺棋最後） */
const QZ_TAG_ORDER=["抽將","捉雙","閃擊","牽制","引離","悶宮","殺棋","將軍"];
function qzTag(q){const T=(q&&q.tags)||[];return QZ_TAG_ORDER.find(k=>T.includes(k))||""}
function qzTagDesc(k){try{const T=typeof THEMES!=="undefined"&&THEMES.find(x=>x[0]===k);return T?T[1]+"。":""}catch(e){return""}}
function qzWeak(A){const c={};for(const x of A||[])if(!x.ok&&x.tg)c[x.tg]=(c[x.tg]||0)+1;const L=Object.entries(c).sort((a,b)=>b[1]-a[1]||QZ_TAG_ORDER.indexOf(a[0])-QZ_TAG_ORDER.indexOf(b[0]));return L[0]||null}
function Quiz(v){
  setTop("棋力測驗","#/");setTabs(false);
  let D=null,ans=[],sel=-1,LEGAL=[],q=null,board=null,answered=false,mu=0,est={th:0,se:1},asked=new Set(),t0=0,share=true,sid=0;   /* 意見回饋 302：不再顯示匿名分享的勾選框 */
  /* 意見回饋 309：每答一題就記進 quizLog（part＝還沒做完），中途離開也算數；做完才估段位、更新最好成績。
     沒做完的那幾題，下次打開測驗時再匿名送去校正題目難度 */
  function saveLog(final){if(!ans.length)return;const lg=store.get("quizLog",[]),i=lg.findIndex(x=>x.at===sid),e={at:sid,n:(D&&D.ranks.length)||15,mode:"cat",th:est.th,se:est.se,part:final?0:1,sh:final?1:0,a:ans.map(x=>[x.tier,x.ok?1:0,x.mate,x.ms,x.cat,x.id,x.tech||"",x.p&&isFinite(x.p.a)?+(+x.p.a).toFixed(2):null,x.p&&isFinite(x.p.b)?+(+x.p.b).toFixed(2):null])};
    if(i>=0)lg[i]=e;else lg.push(e);store.set("quizLog",lg.slice(-40))}
  /* 回饋 838（開發者 11/9 選：全模式中斷接續）：做到一半的測驗存在 store quizRun＝{sid,mu 起始程度,a [{id,ok,ms,tech}] 答過的題,cur 目前這題,an 這題答了沒,at}；
     打開測驗頁可以「繼續上次的測驗」：同一份（sid 一樣，修為不會重給）、同一題（不能關掉重開換題），7 天沒動就作廢。還能接續的那一份先不送去校正題目，免得做完又送一次 */
  const RUN=()=>{const r=store.get("quizRun",null);return r&&r.sid&&Array.isArray(r.a)&&Date.now()-(r.at||0)<7*864e5?r:null};
  const runSave=()=>{try{store.set("quizRun",{sid,mu,a:ans.map(x=>({id:x.id,ok:x.ok?1:0,ms:x.ms|0,tech:x.tech||""})),cur:q?q.id:null,an:answered?1:0,at:Date.now()});if(typeof rsPg==="function")rsPg("qz","quizRun",sid,"#/quiz","棋力測驗",ans.length,0)}catch(e){}};
  const runClear=()=>{store.set("quizRun",null);if(typeof rsPgClear==="function")rsPgClear("qz")};
  {const R0=RUN();if(!R0&&store.get("quizRun",null))runClear();const lg=store.get("quizLog",[]);let ch=false;for(const e of lg)if(e.part&&!e.sh&&e.a&&e.a.length&&!(R0&&e.at===R0.sid)){e.sh=1;ch=true;if(window.XQNet&&XQNet.shareIRT)try{XQNet.shareIRT({v:1,th:+(+e.th||0).toFixed(2),r:e.a.map(x=>[x[5],x[1],Math.round(x[3]/100)/10])})}catch(err){}}if(ch)store.set("quizLog",lg)}
  const bd=Board(x=>tap(x));
  function intro(){v.className="view";const best=store.get("quizBest",null),last=store.get("quizTheta",null);
    const RR=RUN();   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：有做到一半的就先給「繼續」 */
    v.innerHTML=`<div class="pad"><div class="card" style="line-height:1.8"><div style="font-size:40px;text-align:center">🎯</div>
      <h2 style="text-align:center;margin:4px 0 8px">測測你的棋力</h2>${RR?`<button class="btn" id="goR" style="margin-bottom:8px">⏳ 繼續上次的測驗（已經答了 ${RR.a.length} 題）</button>`:""}
      <p>這是<b>自適應測驗</b>：答對下一題就難一點，答錯就簡單一點，系統每題都挑「最能分辨你程度」的題目，大約 8～20 題就能估出你的段位（新手～專2）。題目輪流出<b>殺法、戰術、局面判斷、殘局</b>四類。</p>
      <p>每題輪到一方走，找出<b>最好的一步</b>：點棋子，再點要去的位置。不會的話按「不會，看答案」也沒關係，一樣能估得準。</p>
      <p class="muted">題目來自《適情雅趣》、《橘中秘》、《梅花譜》、古典殘局譜，以及特級大師和全國比賽的實戰局面；答案由 Pikafish 深度計算。結果是估計值，不是正式段位。</p>
      ${best?`<p>目前最好成績：<b>${esc(best.rank)}</b>（${new Date(best.at).toLocaleDateString()}）</p>`:""}
      ${last?`<button class="btn" id="go3">從上次的程度開始（約 ${esc(D0rank(last.th))}）</button>`:""}
      <button class="btn${last?" ghost":""}" id="go">我是新手</button><button class="btn ghost" id="go2">我會下棋</button></div></div>`;
    {const gr=v.querySelector("#goR");if(gr)gr.onclick=()=>resume()}   /* 回饋 838（開發者 11/9 選：全模式中斷接續） */
    (v.querySelector("#go")||{}).onclick=()=>start(-3);(v.querySelector("#go2")||{}).onclick=()=>start(-1.2);const g3=v.querySelector("#go3");if(g3)g3.onclick=()=>start(last.th)}
  const RK=["新手","入門1","入門2","入門3","業1","業2","業3","業4","業5","業6","業7","業8","業9","專1","專2"],D0rank=th=>RK[qzTier(th,RK.length)];
  const cal=()=>{const CAL=store.get("calib",null);if(CAL&&CAL.irt)for(const it of D.items){const k=CAL.irt[it.id];if(k&&isFinite(k.a)&&isFinite(k.b)){it.ca=k.a;it.cb=k.b}}};
  async function start(m0){try{D=D||await api("/quiz/data")}catch(e){return toast(e.message)}
    cal();runClear();   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：開新的一份＝上一份沒做完的就不接了（照原本：答過的題已經記進 quizLog，下次打開再送去校正） */
    mu=m0;ans=[];asked=new Set();est={th:m0,se:1};sid=Date.now();layout();next()}
  /* 回饋 838（開發者 11/9 選：全模式中斷接續）：接著上次那一份：照存下的題號把答過的題排回來（參數照現在的校正檔重算），回到同一題 */
  async function resume(){const r=RUN();if(!r)return intro();try{D=D||await api("/quiz/data")}catch(e){return toast(e.message)}cal();
    const by=new Map(D.items.map(x=>[String(x.id),x])),A=[];
    for(const a of r.a){const it=by.get(String(a.id));if(!it){runClear();toast("題庫更新了，這次重新測");return intro()}A.push({id:it.id,tier:it.tier,ok:!!a.ok,mate:it.mate?1:0,cat:qzCat(it),ms:a.ms|0,p:qzPar(it),tech:a.tech||""})}
    mu=+r.mu||0;sid=r.sid;ans=A;asked=new Set(A.map(x=>x.id));est=ans.length?qzEAP(ans,mu):{th:mu,se:1};layout();
    const c=r.cur!=null?by.get(String(r.cur)):null;
    if(c&&!r.an&&!asked.has(c.id)){q=c;q._p=qzPar(c);q._cat=qzCat(c);asked.add(q.id);show();runSave()}else if(done())result();else next()}
  function pick(){const seen=new Set(store.get("quizSeen",[])),n=D.ranks.length;
    const cc={};for(const x of ans)cc[x.cat]=(cc[x.cat]||0)+1;
    let cand=D.items.filter(x=>!asked.has(x.id)).map(x=>({x,p:qzPar(x),cat:qzCat(x)}));
    const fresh=cand.filter(c=>!seen.has(c.x.id));if(fresh.length>40)cand=fresh;
    cand.forEach(c=>c.i=qzInfo(est.th,c.p));cand.sort((a,b)=>b.i-a.i);
    const top=cand.slice(0,12),minC=Math.min(...QZ.CATS.map(k=>cc[k]||0)),pref=top.filter(c=>(cc[c.cat]||0)===minC);
    const pool=(pref.length?pref:top).slice(0,3);return pool[Math.floor(Math.random()*pool.length)]}
  function layout(){v.className="view fixed";
    v.innerHTML=`<div class="status" id="qh" style="margin-top:6px"></div><div class="boardbox" id="bbox"></div><div class="status" id="stat"></div><div class="note" id="note" style="white-space:pre-wrap"></div><div style="flex:1"></div><div class="actions" id="acts"></div>`;
    v.querySelector("#bbox").append(bd.svg)}
  function next(){const c=pick();if(!c)return result();q=c.x;q._p=c.p;q._cat=c.cat;asked.add(q.id);show();runSave()}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：記下這一題（關掉重開還是這題） */
  /* 開發者 11/12 hspx 第 1036 列：第 16 題被將軍只能走相、俥，開發者確認題目合理、畫面維持原樣（不加將軍提示）；只保留換題時先清掉上一題的合法步 */
  async function show(){board=q.board.split(",").map(x=>x||null);sel=-1;answered=false;LEGAL=[];
    const lo=D0rank(est.th-est.se),hi=D0rank(est.th+est.se);
    v.querySelector("#qh").innerHTML=`<b>第 ${ans.length+1} 題</b>・${esc(q._cat)}　<span class="muted">目前估計 ${esc(lo===hi?lo:lo+"～"+hi)}</span>${provLine(q)}`;   /* 開發者 11/11 選「題目標示出處」（規劃書 P04）；11/11 Gemini 架構報告第四項：改由 00-util.js 的 provLine（資料有 tags 就加真假標籤，沒有就跟原本一樣只寫出處，…練習不寫） */
    v.querySelector("#stat").textContent=`${PLAYER[q.side]}走，找出最好的一步`+(q.mate&&!/^(新手|入門1)$/.test(q.rank)?"（有殺棋）":"");v.querySelector("#stat").classList.add("hot");
    v.querySelector("#note").textContent="";
    actionBar(v.querySelector("#acts"),[["skip","⏭","不會，看答案",()=>judge(-1,-1)],["quit","✕","結束",()=>confirmBox(ans.length>=5?"現在結束，用已經答的題目估計？":ans.length?"結束測驗？答過的題目會記進我的棋力，只是題數太少，不估段位":"結束測驗？",()=>{if(ans.length>=5)result();else{runClear();intro()}},"結束")]]);   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：自己按結束就不留接續 */
    draw();t0=Date.now();try{LEGAL=(await api("/an/legal",{board,side:q.side})).legal}catch(e){toast(e.message)}}
  function draw(o){bd.draw(o&&o.board||board,{flip:q.side==="b",sel,targets:sel>=0?LEGAL.filter(([f])=>f===sel).map(x=>x[1]):[],...(o||{})})}
  function tap(x){if(!q||answered)return;
    if(sel>=0&&LEGAL.some(([f,t])=>f===sel&&t===x)){const f=sel;sel=-1;return judge(f,x)}
    sel=LEGAL.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw()}
  const done=()=>ans.length>=20||(ans.length>=8&&est.se<=.35);
  function judge(f,t){answered=true;const ok=f===q.f&&t===q.t,ms=Date.now()-t0;
    ans.push({id:q.id,tier:q.tier,ok,mate:q.mate?1:0,cat:q._cat,ms,p:q._p,tech:q._cat==="殘局"?endTech(board,q.side):"",tg:qzTag(q)});est=qzEAP(ans,mu);saveLog(false);runSave();/* 回饋 838（開發者 11/9 選：全模式中斷接續） */addXP(ok?5:2,"測驗",`q:${sid}:${q.id}`);vibrate(ok?15:[20,40,20]);
    store.set("quizSeen",[...new Set([...store.get("quizSeen",[]),q.id])].slice(-600));
    const nb=board.slice();nb[q.t]=nb[q.f];nb[q.f]=null;
    draw({board:nb,last:{f:q.f,t:q.t},sel:-1,targets:[]});
    const s=v.querySelector("#stat");s.classList.remove("hot");s.textContent=ok?"✔ 答對了！":f<0?"正解如下":"✘ 不是這步";
    const rv=q.side==="r"?q.v:-q.v;
    v.querySelector("#note").textContent=`正解：${q.cn}`+(q.mate?`，${q.mate} 步內殺棋`:`，走完${evt(rv)}`)+`\nPikafish 的後續：${q.pv.join(" ")}`+(q.src?`\n出處：${q.src}${q.title?"・"+toT(q.title):""}`:"");
    const tg=!ok&&qzTag(q);if(tg)v.querySelector("#note").textContent+=`\n這題考的是「${tg}」：${qzTagDesc(tg)}`;   /* 開發者 11/11 選規劃書方案 04 */
    if(typeof pvStepper==="function")pvStepper(v.querySelector("#note"),bd,board,q.pv,{draw:{flip:q.side==="b"}});   /* 開發者 11/12：後續可以一步一步看 */
    actionBar(v.querySelector("#acts"),[...(tg?[["tg","🎯",`練「${tg}」`,()=>{location.hash="#/theme/"+encodeURIComponent(tg)}]]:[]),["next",done()?"🏁":"›",done()?"看結果":"下一題",()=>{if(done())result();else next()},true]])}
  function result(){const n=D.ranks.length,ti=qzTier(est.th,n),rank=D.ranks[ti],ok=ans.filter(x=>x.ok).length;v.className="view";
    const best=store.get("quizBest",null),better=!best||ti>D.ranks.indexOf(best.rank);
    if(better)store.set("quizBest",{rank,ti,ok,n:ans.length,at:Date.now()});store.set("quizTheta",{th:est.th,se:est.se,at:Date.now()});
    saveLog(true);runClear();   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：做完了，清掉接續 */
    if(share&&window.XQNet&&XQNet.shareIRT)try{XQNet.shareIRT({v:1,th:+est.th.toFixed(2),r:ans.map(x=>[x.id,x.ok?1:0,Math.round(x.ms/100)/10])})}catch(e){}
    const lo=D.ranks[qzTier(est.th-1.28*est.se,n)],hi=D.ranks[qzTier(est.th+1.28*est.se,n)],avgS=Math.round(ans.reduce((a,x)=>a+x.ms,0)/ans.length/1000);
    const byC=QZ.CATS.map(k=>{const a=ans.filter(x=>x.cat===k);return[k,a.filter(x=>x.ok).length,a.length]}).filter(x=>x[2]);
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center"><div style="font-size:44px">🏅</div><div class="muted">估計棋力</div>
      <div style="font-size:42px;font-weight:900;font-family:var(--serif)">${esc(rank)}</div>
      <p class="muted" style="margin:2px 0">80% 的把握在 <b>${esc(lo)}～${esc(hi)}</b> 之間・答對 ${ok} / ${ans.length} 題・平均每題 ${avgS} 秒${better&&best?"・🎉 新紀錄！":""}</p>
      <div style="display:grid;grid-template-columns:repeat(${byC.length},1fr);gap:8px;margin:12px 0">${byC.map(([k,o,m])=>`<div class="card" style="padding:8px"><div class="muted" style="font-size:12px">${k}</div><b style="font-size:18px">${o}/${m}</b></div>`).join("")}</div>
      <p class="muted" style="font-size:12px;text-align:left;line-height:1.7">怎麼判定的：每一題的難易度都先請電腦（Pikafish）分析過；你每答一題，系統就重新估一次你的程度，答對難題升得多、答錯簡單題降得多，估得夠準了就停。四類題目的對錯會記進「我的戰績 → 📈 我的成長」；題目難度會用大家的答題結果（只有題號和對錯，不含名字）定期校正。結果只是估計，不是正式段位。</p>
      ${(()=>{const w=qzWeak(ans);return w?`<div class="card" style="text-align:left;margin:10px 0"><b>🎯 下一步練這一招：${esc(w[0])}</b><div class="muted" style="font-size:13px;margin:2px 0 8px">這次「${esc(w[0])}」的題目錯了 ${w[1]} 題。${esc(qzTagDesc(w[0]))}</div><button class="btn" id="qzWeak" style="width:100%">去主題訓練練「${esc(w[0])}」</button></div>`:""})()}
      <button class="btn" id="again">再測一次（換新題目）</button><button class="btn ghost" id="st">看我的成長</button><button class="btn ghost" id="qzBk">↩ 回書院</button></div></div>`;
    (v.querySelector("#again")||{}).onclick=()=>start(est.th);(v.querySelector("#st")||{}).onclick=()=>{store.set("statsTab","talent");location.hash="#/stats"};(v.querySelector("#qzBk")||{}).onclick=()=>goUp("#/hub/learn");{const w=qzWeak(ans),b=v.querySelector("#qzWeak");if(w&&b)b.onclick=()=>{location.hash="#/theme/"+encodeURIComponent(w[0])}}}
  intro();return{}}

/* ================= 🎓 猜著法（意見回饋 301） =================
   跟著大師名局一步一步猜下一手：你執贏的那一方，對方照實戰自動走。每步請 Pikafish 算你猜的那步比最佳著少幾分（δ），
   跟大師一樣得 10 分，否則 10·e^(−δ/150) 分。每步的 δ 存進 guessLog，給天賦系統的 Regan 著法品質模型和練習量用（不用對手也能累積）。 */
function Guess(v){
  setTop("猜著法","#/");setTabs(false);
  const SRC=[["xuyinchuan","許銀川對局"],["gmgames","特級大師對局"]],LEN=15;
  let src=store.get("guessSrc","xuyinchuan"),it=null,mv=[],ply=0,me="r",board=null,LEGAL=[],sel=-1,busy=false,res=[],startPly=0,gsid=0;
  /* 意見回饋 309：每猜一步就記進 guessLog（part＝這盤還沒猜完），中途離開也會算進天賦分析 */
  /* ChatGPT 數值盤查 11/11（猜大師著法的分母）：n 照舊是走過的步數（含看答案），另外拆存 vw＝看答案幾步、tr＝真的猜了幾步（嘗試數）、gr＝引擎評到品質的步數（可評數）；
     pts 只加有分數的步（引擎沒評到又沒猜中的那步是「品質待評」，不給固定分）。天賦練習量、週報改用 tr（04-stats.js gsTried，舊存檔從 h 的「-」回算） */
  const saveG=final=>{if(!res.length||!it)return;const lg=store.get("guessLog",[]),D=res.filter(x=>x.d!=null).map(x=>x.d),e={at:gsid,title:toT(`${it.red||""} 對 ${it.black||""}`)+(it.year?"（"+it.year+"）":""),src,n:res.length,vw:res.filter(x=>x.skip).length,tr:res.filter(x=>!x.skip).length,gr:D.length,m:res.filter(x=>x.hit).length,pts:Math.round(res.reduce((a,x)=>a+(x.pts||0),0)),d:D,part:final?0:1,gid:it.id,ps:res.map(x=>x.p),h:res.map(x=>x.skip?"-":x.hit?"1":"0").join("")},i=lg.findIndex(x=>x.at===gsid);   /* 意見回饋 737：記棋譜 id、每一步是第幾步、猜中與否（h：1 猜中、0 沒中、- 看大師怎麼走），算「已讀懂」用 */
    if(i>=0)lg[i]=e;else lg.push(e);store.set("guessLog",lg.slice(-60));
    if(typeof rdGuess==="function")rdGuess(src,it.id,res.filter(x=>x.hit).length,res.filter(x=>!x.skip).length)};   /* 意見回饋 737 第二期：這盤答對幾手，存進 rdLog（存檔會帶著走） */
  const bd=Board(x=>tap(x));
  function intro(){v.className="view";const lg=store.get("guessLog",[]),last=lg[lg.length-1];
    v.innerHTML=`<div class="pad"><div class="card" style="line-height:1.8"><div style="font-size:40px;text-align:center">🎓</div>
      <h2 style="text-align:center;margin:4px 0 8px">猜著法</h2>
      <p>跟著大師的實戰對局，<b>你執贏的那一方</b>，每一步先猜大師會怎麼走，再看大師實際走了什麼。對方的棋會照實戰自動走。</p>
      <p class="muted">每步請 Pikafish 算你猜的那步比最好的著法少幾分：跟大師一樣得 10 分，猜別的就看差多少給分。一局猜 ${LEN} 步。這些資料會進到「我的戰績 → 🧬 天賦」的著法品質。</p>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0 10px">${SRC.map(([k,l])=>`<button class="pill${k===src?" on":""}" data-s="${k}" style="${k===src?"background:var(--accent);color:#fff;border-color:var(--accent)":""}">${l}</button>`).join("")}</div>
      ${last?`<p class="muted">上一局：${esc(last.title||"")}・猜中 ${last.m}/${last.tr!=null?last.tr:last.n} 步・${last.pts} 分</p>`:""}
      <button class="btn" id="go">開始（隨機挑一盤）</button></div></div>`;
    v.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{src=b.dataset.s;store.set("guessSrc",src);intro()});
    (v.querySelector("#go")||{}).onclick=start}
  async function start(){v.innerHTML='<div class="pad"><div class="card muted" style="text-align:center">挑一盤對局…（特級大師對局第一次要下載，會久一點）</div></div>';
    let d;try{d=await api("/db/items?c="+src)}catch(e){toast(e.message);return intro()}
    const pool=d.items.filter(x=>/勝|胜/.test(String(x.result||"")));if(!pool.length){toast("找不到分出勝負的對局");return intro()}
    for(let k=0;k<8;k++){const s=pool[Math.floor(Math.random()*pool.length)];try{const full=await api(`/db/item?c=${src}&id=${encodeURIComponent(s.id)}`);const L=full.lines&&full.lines[0];if(L&&L.moves.length>=36){it=full;break}}catch(e){}}
    if(!it){toast("載入對局失敗，再試一次");return intro()}
    mv=it.lines[0].moves.map(m=>Array.isArray(m)?{f:m[0],t:m[1]}:m);const r=String(it.result||"");me=/^黑/.test(r)?"b":"r";
    board=it.board.slice();ply=0;res=[];gsid=Date.now();startPly=12+(me==="b"?1:0);
    while(ply<startPly){board=applyMv(board,mv[ply]);ply++}
    gameLayout(v);v.querySelector("#bbox").append(bd.svg);v.querySelector("#strip").insertAdjacentHTML("beforebegin",'<div class="note" id="note" style="white-space:pre-wrap"></div>');turn()}
  const applyMv=(b,m)=>{const n=b.slice();n[m.t]=n[m.f];n[m.f]=null;return n};
  function head(){const pts=res.reduce((a,x)=>a+(x.pts||0),0),m=res.filter(x=>x.hit).length;   /* 數值盤查 11/11：品質待評（pts＝null）的步當 0 加 */
    v.querySelector("#pTop").innerHTML=playerHTML(me==="r"?"b":"r",toT(me==="r"?it.black:it.red),"對方（照實戰走）",null);
    v.querySelector("#pBot").innerHTML=playerHTML(me,"你（"+toT(me==="r"?it.red:it.black)+" 的位置）",`第 ${res.length+1}/${LEN} 步・猜中 ${m}・${Math.round(pts)} 分`,null)}
  function draw(o){bd.draw(o&&o.board||board,{flip:me==="b",sel,targets:sel>=0?LEGAL.filter(([f])=>f===sel).map(x=>x[1]):[],...(o||{})})}
  async function turn(){if(res.length>=LEN||ply>=mv.length)return finish();head();sel=-1;busy=false;
    v.querySelector("#stat").textContent=`輪到你：大師在這裡會怎麼走？`;v.querySelector("#stat").classList.add("hot");
    actionBar(v.querySelector("#acts"),[["skip","👀","看大師怎麼走",()=>judge(-1,-1)],["quit","✕","結束",()=>confirmBox("結束這一局？",()=>res.length?finish():intro(),"結束")]]);
    draw();try{LEGAL=(await api("/an/legal",{board,side:me})).legal}catch(e){toast(e.message)}}
  function tap(x){if(busy||!LEGAL.length)return;
    if(sel>=0&&LEGAL.some(([f,t])=>f===sel&&t===x)){const f=sel;sel=-1;return judge(f,x)}
    sel=LEGAL.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw()}
  async function judge(f,t){if(busy)return;busy=true;   /* 意見回饋 305：連按「看大師怎麼走」會重複判同一步、往前跳好幾步，盤面跟棋譜對不上（棋子消失） */const gm=mv[ply],hit=f===gm.f&&t===gm.t;const st=v.querySelector("#stat");st.classList.remove("hot");st.textContent="電腦評分中…";
    let mine=null,his=null;try{his=await api("/an/classify",{board,side:me,f:gm.f,t:gm.t});if(f>=0)mine=hit?his:await api("/an/classify",{board,side:me,f,t})}catch(e){toast(e.message)}
    /* 意見回饋（開發者 11/6 分數審查）：引擎沒評到（mine.loss 缺）時 d 存 null，不混進天賦系統的 acpl／Regan
       ChatGPT 數值盤查 11/11：沒猜中又沒評到的那步原本照 300 分損失給 1.35／10 分，現在 pts＝null（品質待評）：「是否猜中」照記，總分和滿分都不算這步；猜中照舊 10 分（不用引擎也知道） */
    const ok=!!(mine&&mine.loss!=null),d=f<0?null:ok?Math.max(0,Math.round(mine.loss)):null,pts=f<0?0:hit?10:d!=null?10*Math.exp(-d/150):null;
    res.push({hit,d,pts,skip:f<0,p:ply});saveG(false);addXP(hit?5:2,"猜著法",`gs:${gsid}:${ply}`);vibrate(hit?15:f<0?5:[20,40,20]);
    const cnGM=gm.cn||"",nb=applyMv(board,gm);draw({board:nb,last:{f:gm.f,t:gm.t},sel:-1,targets:[]});
    st.textContent=f<0?`大師走：${cnGM}`:hit?`✔ 猜中！大師也走 ${cnGM}（+10）`:`大師走的是 ${cnGM}；你那步${mine&&mine.q?"是「"+mine.q+"」":""}，${d!=null?`比最佳少 ${d} 分`:"引擎沒評到，品質待評"}${pts!=null?`（+${pts.toFixed(1)}）`:"（這步不計分）"}`;
    v.querySelector("#note").textContent=his&&his.q?`大師這步 Pikafish 評為「${his.q}」${his.bc&&his.q!=="正著"&&his.q!=="妙著"?`，它覺得更好的是 ${his.bc}`:""}`:"";
    let went=false;head();actionBar(v.querySelector("#acts"),[["next","›","繼續",async()=>{if(went)return;went=true;board=nb;ply++;
      if(ply<mv.length){await new Promise(r=>setTimeout(r,250));board=applyMv(board,mv[ply]);draw({last:{f:mv[ply].f,t:mv[ply].t}});ply++}
      v.querySelector("#note").textContent="";turn()},true]])}
  function finish(){v.className="view";const n=res.filter(x=>!x.skip).length,m=res.filter(x=>x.hit).length,pts=Math.round(res.reduce((a,x)=>a+(x.pts||0),0)),D=res.filter(x=>x.d!=null).map(x=>x.d),
      pend=res.filter(x=>x.pts==null).length,vw=res.length-n;   /* 數值盤查 11/11：品質待評的步不算進滿分；猜中數的分母用實猜步數 n（不含看答案 vw） */
    const acpl=D.length?D.reduce((a,b)=>a+b,0)/D.length:null;   /* 意見回饋（開發者 11/6 分數審查）：著法品質不再換算成等級分 */
    const title=toT(`${it.red||""} 對 ${it.black||""}`)+(it.year?"（"+it.year+"）":"");
    saveG(true);
    /* 意見回饋 737：每一步猜的結果匿名送去校正棋譜庫的難度（題號＝棋譜 id@第幾步；自己走，不是選擇題）；看大師怎麼走的那步不送 */
    if(typeof readShare==="function"&&it&&it.id&&!res.shared){res.shared=1;readShare(res.filter(x=>!x.skip&&x.p!=null).map(x=>[it.id+"@"+x.p,x.hit?1:0,0,0]))}
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center"><div style="font-size:44px">🎓</div><div class="muted">${esc(title)}</div>
      <div style="font-size:40px;font-weight:900;font-family:var(--serif)">${pts}<span style="font-size:16px"> / ${(res.length-pend)*10} 分</span></div>
      <p>猜中大師 <b>${m}</b> / ${n} 步${vw?`・看答案 ${vw} 步`:""}${acpl!=null?`・平均每步比大師少 ${Math.round(acpl)} 分（${D.length} 步有評到）`:""}${pend?`・${pend} 步引擎沒評到，品質待評、不計分`:""}</p>
      <p class="muted" style="font-size:12.5px;text-align:left;line-height:1.7">每一步的損失 δ 會進到天賦系統的 Regan 著法品質模型：δ 越小、越常跟大師想的一樣，「著法品質」和「局面判斷」就越高。</p>
      <button class="btn" id="again">再猜一盤</button><button class="btn ghost" id="st">看我的成長</button><button class="btn ghost" id="gsBk">↩ 回書院</button></div></div>`;
    (v.querySelector("#again")||{}).onclick=start;(v.querySelector("#st")||{}).onclick=()=>{store.set("statsTab","talent");location.hash="#/stats"};(v.querySelector("#gsBk")||{}).onclick=()=>goUp("#/hub/learn")}
  intro();return{}}

// ================= 象棋術語：殺法、開局、戰術、棋形、規則 =================
// 象棋規則（意見回饋 137）：上方三個分頁「玩法／記譜法／術語」；術語＝原本的象棋術語
function Terms(v,pick){
  setTop("象棋規則","#/");setTabs(true,"#/");
  let tab=pick?"terms":store.get("rulesTab","play");
  v.innerHTML=`<div class="st-tabs" id="rTabs" style="margin:10px 12px 4px;position:static">${[["play","🎮 玩法"],["note","✍ 記譜法"],["terms","📚 術語"]].map(([k,l])=>`<button data-k="${k}">${l}</button>`).join("")}</div>
    <div id="rPlay" class="home" style="padding-top:4px"></div><div id="rNote" class="home" style="padding-top:4px"></div><div id="rTerms">`+`<div class="search"><input id="q" placeholder="搜尋術語，例如：馬後炮、屏風馬"></div><div class="chips" id="cats"></div><div class="items" id="list"></div>
    <p class="muted" id="src" style="padding:4px 16px 20px;font-size:12px"></p></div>`;
  const showTab=()=>{v.querySelectorAll("#rTabs button").forEach(b=>b.classList.toggle("on",b.dataset.k===tab));
    v.querySelector("#rPlay").hidden=tab!=="play";v.querySelector("#rNote").hidden=tab!=="note";v.querySelector("#rTerms").hidden=tab!=="terms";
    if(tab==="play"&&!v.querySelector("#rPlay").innerHTML)rulesPlay(v.querySelector("#rPlay"));if(tab==="note"&&!v.querySelector("#rNote").innerHTML)rulesNotation(v.querySelector("#rNote"))};
  v.querySelectorAll("#rTabs button").forEach(b=>b.onclick=()=>{vibrate(5);tab=b.dataset.k;store.set("rulesTab",tab);showTab()});showTab();
  let D=null,cat="全部";
  const qi=v.querySelector("#q");qi.oninput=()=>paint();
  function paint(){const k=qi.value.trim(),box=v.querySelector("#list");box.innerHTML="";
    const its=D.items.filter(t=>(cat==="全部"||t.k===cat)&&(!k||t.n.includes(k)||t.d.includes(k)));
    v.querySelectorAll("#cats button").forEach(b=>b.classList.toggle("on",b.textContent===cat));
    for(const t of its){const b=document.createElement("button");b.className="item";
      b.innerHTML=`<span class="lb">${{殺法:"⚔",開局:"🚩",戰術:"🎯",棋形:"🧩",規則:"⚖",俗語:"🏮"}[t.k]||"•"}</span><span class="tx"><b>${esc(t.n)}${t.ex||t.op||t.sh?' <span class="pill" style="font-size:11px">有例局</span>':""}</b><span>${esc(t.d.slice(0,40))}${t.d.length>40?"…":""}</span></span><span class="muted">›</span>`;
      b.onclick=()=>open(t);box.append(b)}
    if(!its.length)box.innerHTML='<div class="card muted">找不到這個術語</div>'}
  function open(t){sheet(t.n,b=>{b.innerHTML=`<p style="line-height:1.8">${esc(t.d)}</p>`;
    if(!t.ex&&!t.op&&!t.sh)return;
    const wrap=document.createElement("div");wrap.style.cssText="max-width:340px;margin:0 auto";const bd=Board(null);wrap.append(bd.svg);b.append(wrap);
    const cap=document.createElement("p");cap.style.textAlign="center";const ctl=document.createElement("div");ctl.className="opt";ctl.style.justifyContent="center";b.append(cap,ctl);
    if(t.ex){const b0=t.ex.board.split(",").map(x=>x||null);let solved=false;
      const draw=()=>{if(!solved){bd.draw(b0,{});cap.textContent=`${PLAYER[t.ex.side]}走一步就能將死，想想看是哪一步？`}
        else{const nb=b0.slice();nb[t.ex.t]=nb[t.ex.f];nb[t.ex.f]=null;bd.draw(nb,{last:{f:t.ex.f,t:t.ex.t},check:nb.indexOf(t.ex.side==="r"?"k":"K")});cap.textContent=`${t.ex.cn}，將死！`}
        ctl.innerHTML=`<button>${solved?"↺ 再看一次":"👀 看答案"}</button>`;ctl.firstChild.onclick=()=>{solved=!solved;draw()}};draw()}
    else if(t.sh){const S=t.sh,b0=S.board.split(",").map(x=>x||null),has=S.f>=0;let shown=!has;
      const draw=()=>{const mk=S.mark&&S.mark.length?S.mark:null;
        if(!shown){bd.draw(b0,{hint:mk});cap.textContent=S.illegal?"想想看：這步為什麼不能走？":`${PLAYER[S.side]}走，按「看示範」`}
        else if(S.illegal){bd.draw(b0,{hint:mk,sugg:[{f:S.f,t:S.t}]});cap.textContent="✘ "+S.msg}
        else if(has){const nb=b0.slice();nb[S.t]=nb[S.f];nb[S.f]=null;const k=nb.indexOf(S.side==="r"?"k":"K");
          bd.draw(nb,{last:{f:S.f,t:S.t},hint:mk,check:S.want==="check"||S.want==="mate"?k:-1});cap.textContent=`${S.cn}：${S.msg}`}
        else{bd.draw(b0,{hint:mk});cap.textContent=S.msg}
        ctl.innerHTML=has?`<button>${shown?"↺ 再看一次":"👀 看示範"}</button>`:"";if(has)ctl.firstChild.onclick=()=>{shown=!shown;draw()}};draw()}
    else{let n=0,auto=null;const b0=parseFen(START);   // 意見回饋 170：從頭自動播放，播完可以重播（原本一打開就在最後一步，按「下一步」沒反應）
      const stopAuto=()=>{clearInterval(auto);auto=null},play=()=>{stopAuto();n=0;draw();auto=setInterval(()=>{if(!document.body.contains(ctl)||n>=t.op.moves.length)return stopAuto();n++;draw()},1100)};
      const draw=()=>{const bb=b0.slice();t.op.moves.slice(0,n).forEach(([f,to])=>{bb[to]=bb[f];bb[f]=null});const l=t.op.moves[n-1];
        bd.draw(bb,{last:l?{f:l[0],t:l[1]}:null});
        cap.innerHTML=t.op.cn.map((c,j)=>`<span style="${j<n?"font-weight:700":"opacity:.45"}">${j%2?"":(j/2+1)+". "}${esc(c)}</span>`).join("　");
        const end=n>=t.op.moves.length;
        ctl.innerHTML=`<button id="p"${n>0?"":" disabled"}>◀ 上一步</button>${end?'<button id="r">↺ 重播</button>':'<button id="n">下一步 ▶</button>'}`;
        ctl.querySelector("#p").onclick=()=>{stopAuto();if(n>0){n--;draw()}};const nb=ctl.querySelector("#n");if(nb)nb.onclick=()=>{stopAuto();if(n<t.op.moves.length){n++;draw()}};
        const rb=ctl.querySelector("#r");if(rb)rb.onclick=play};play()}})}
  api("/terms/data").then(d=>{D=d;const cats=["全部",...new Set(d.items.map(x=>x.k))],cb=v.querySelector("#cats");
    for(const c of cats){const b=document.createElement("button");b.textContent=c;b.onclick=()=>{cat=c;paint()};cb.append(b)}
    v.querySelector("#src").textContent=d.note;paint();if(pick){const t=d.items.find(x=>x.n===pick);if(t)open(t)}}).catch(e=>{v.querySelector("#list").innerHTML=`<div class="card muted">⚠ ${esc(e.message)}</div>`});
  return{}}

// 玩法：目標、棋盤、七種棋子、勝負和
function rulesPlay(box){const P=(t,h)=>`<div class="sec-t">${t}</div><div class="card" style="line-height:1.8">${h}</div>`;
  box.innerHTML=P("🎯 目標","兩人對下，<b style=\"color:var(--red)\">紅方先走</b>，之後輪流各走一步。把對方的<b>帥／將</b>「將死」（被將軍而且怎麼走都躲不掉）就贏了；讓對方<b>無棋可走</b>（困斃）也算贏。")+
  P("🗺 棋盤","棋盤有 9 條直線、10 條橫線，棋子放在<b>交叉點</b>上，不是放在格子裡。中間空白的一條叫<b>河界</b>（楚河漢界），把棋盤分成紅黑兩邊。兩邊底部畫了斜線「米」字的 3×3 區域叫<b>九宮</b>，帥（將）和仕（士）只能待在裡面。")+
  P("♟ 七種棋子怎麼走",[
    ["帥／將","在九宮裡上下左右走一格。兩個將帥<b>不能在同一條直線上直接面對面</b>（中間沒有任何棋子）。"],
    ["仕／士","在九宮裡斜走一格。"],
    ["相／象","斜走兩格（走「田」字），<b>不能過河</b>。「田」字中間有棋子擋住就不能走，叫<b>塞象眼</b>。"],
    ["馬","先直走一格再斜走一格（走「日」字）。直走那一格有棋子擋住就不能走，叫<b>蹩馬腿</b>。"],
    ["車","直線、橫線走任意格，中間不能有棋子擋。威力最大。"],
    ["炮／砲","不吃子時跟車一樣走；<b>吃子時一定要隔一個棋子跳過去吃</b>（中間那顆叫「炮架」，紅黑都可以）。"],
    ["兵／卒","只能往前走一格；<b>過河以後</b>也可以往左右走一格。永遠不能後退。"]].map(([n,d],i)=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);align-items:flex-start"><b style="min-width:58px">${n}</b><span style="flex:1">${d}</span><button class="pill" data-pc="${i}" style="white-space:nowrap;font-size:13px">👀 看走法</button></div>`).join(""))+
  P("⚔ 吃子與將軍","走到對方棋子的位置就把它吃掉（拿下棋盤）。走完後可以直接吃到對方帥／將，就是<b>將軍</b>，對方下一步一定要解除：移開帥將、吃掉將軍的棋子、或擋在中間。解不了就是將死。")+
  P("🤝 和棋與禁止","這些情況是<b>和棋</b>：雙方同意；雙方都沒有車、馬、炮、兵；連續 60 回合都沒有吃子。<br>同一個局面<b>第 3 次</b>出現，裁判才看是誰在重複：<br>・<b>長將</b>（一直將軍）：一方長將判負，雙方都長將判和。<br>・<b>長捉</b>（一直追捉同一顆子）：判負。但捉有保護的子、捉對方也能吃回來的子、用帥或兵去捉，都不算；只有馬、炮捉車，車有保護也照算。<br>・一將一捉不判負，算和棋；雙方都只是來回走閒棋，也是和棋。<br>・電腦判不了的複雜循環，會標「循環待核」，讓你選和棋或換一步走。<br>讓對方<b>無棋可走</b>（困斃）就贏了。")+   /* 開發者 11/11：跟 core 的亞洲棋例（judgeState／repetitionVerdict）一致 */
  P("💡 新手小提醒","1. 開局先把馬、炮、車走出來，不要只動同一顆棋。<br>2. 每走一步前先看：對方剛剛那步在威脅我什麼？<br>3. 車最值錢（約 9 分），馬炮各約 4～5 分，仕相各約 2 分，兵過河前 1 分、過河後 2 分。<br>想知道某句術語是什麼意思，看「📚 術語」分頁。")+
  P("🏅 等級怎麼看","App 裡有四種「等級」，意思不一樣：<br>・<b>第 N 級</b>（1～18）：挑戰電腦時幻影棋客的強度，數字越大越強。<br>・<b>段位</b>（新手→入門 1～3→業餘 1～9 級→專業）：你的棋力，晉級賽、線上對局贏棋會升。第 N 級後面括號裡的段位，就是那一級電腦大約的棋力。<br>・<b>官階</b>：小帥跟著你的段位升官，只是換個好聽的叫法。<br>・<b>修為 Lv</b>：走雲河星槎故事、做題累積的經驗，<b>跟棋力無關</b>。");   /* 11/11 規格表 87：等級四套的白話對照（07z5 選難度那張也有一句） */
  // 範例（意見回饋 138）：棋盤上放這顆棋子，小圓點／圈＝可以走到的位置（意見回饋 607：點的顏色是 var(--accent2)，各朝代不同，文字不寫顏色），藍框＝擋路的棋子（蹩馬腿、塞象眼、炮架）
  // 格子編號＝列×9＋行（列 0 是黑方底線）
  const DEMO=[
    {t:"帥／將",b:{76:"K",3:"k"},tg:[67,85,75,77],cap:"帥在九宮中間，可以上下左右走一格（棋盤上的小圓點）。九宮外面不能去。"},
    {t:"仕／士",b:{76:"A",85:"K",3:"k"},tg:[66,68,84,86],cap:"仕在九宮中心，可以往四個斜角走一格。"},
    {t:"相／象",b:{67:"B",59:"P",85:"K",3:"k"},tg:[47,83,87],hl:[59],cap:"相走「田」字。右上那格「田」中間有兵擋住（藍框），叫塞象眼，不能走。相也不能過河。"},
    {t:"馬",b:{49:"N",40:"P",85:"K",3:"k"},tg:[38,42,56,60,66,68],hl:[40],cap:"馬走「日」字，最多 8 個點。上面被兵擋住（藍框）＝蹩馬腿，往上跳的兩個點都不能去。"},
    {t:"車",b:{49:"R",22:"P",52:"p",85:"K",3:"k"},tg:[45,46,47,48,50,51,52,40,31,58,67,76],cap:"車直線、橫線走任意格。右邊可以一路吃到黑卒（圈起來的）；上面被自己的兵擋住，過不去。"},
    {t:"炮／砲",b:{49:"C",51:"P",53:"p",85:"K",3:"k"},tg:[45,46,47,48,50,40,31,22,13,4,58,67,76,53],hl:[51],cap:"不吃子時跟車一樣走。要吃子一定要隔一顆棋子（藍框＝炮架）跳過去吃，所以吃得到最右邊的黑卒。"},
    {t:"兵／卒",b:{56:"P",42:"P",85:"K",3:"k"},tg:[47,33,41,43],cap:"左邊的兵還沒過河，只能往前一格；右邊的兵已經過河，可以往前或左右一格。兵永遠不能後退。"}];
  box.querySelectorAll("[data-pc]").forEach(btn=>btn.onclick=()=>{vibrate(5);const D=DEMO[+btn.dataset.pc];
    sheet(D.t+" 怎麼走",sb=>{const wrap=document.createElement("div");wrap.style.cssText="max-width:340px;margin:0 auto";const bd=Board(null);wrap.append(bd.svg);
      const cap=document.createElement("p");cap.style.cssText="line-height:1.7;text-align:center";cap.textContent=D.cap;sb.append(wrap,cap);
      const bb=Array(90).fill(null);for(const k in D.b)bb[+k]=D.b[k];bd.draw(bb,{anim:false,targets:D.tg,hint:D.hl||null})})})}
// 記譜法：四個字的規則＋範例（點一下在棋盤上畫出來）
function rulesNotation(box){
  // 格子編號＝列×9＋行（列 0 是黑方底線，行 0 是畫面最左邊）
  const EX=[["炮二平五","紅方第二路的炮，橫走到第五路（這就是「中炮」）",[[70,67]]],["馬8進7","黑方第 8 路的馬，往前跳到第 7 路",[[7,24]]],["兵三進一","紅方第三路的兵，往前走一步",[[60,51]]],
    ["車一進一","紅方第一路的車，往前走一步（直著走的棋子，最後一個字是步數）",[[89,80]]],["相三進五","紅方第三路的相，往前飛到第五路（斜著走的棋子，最後一個字是到達的路）",[[87,67]]],
    ["卒7進1","黑方第 7 路的卒，往前走一步",[[33,42]]],["車9平1","黑方第 9 路的車，橫走到第 1 路（先走了「車9進1」把車開出來）",[[8,17],[17,9]]]];
  box.innerHTML=`<div class="sec-t">一步棋怎麼寫</div><div class="card" style="line-height:1.85">每一步用<b>四個字</b>記：<br>
    <b>①棋子</b>（例如 兵、車）＋<b>②現在在第幾路</b>＋<b>③怎麼走</b>（進、退、平）＋<b>④走到哪</b>。<br>
    <div style="margin:8px 0;padding:8px 10px;background:var(--bg2,rgba(0,0,0,.04));border-radius:10px">例：<b>兵三進一</b>＝兵・在第三路・往前・走一步</div>
    <b>第幾路</b>：棋盤 9 條直線，<b style="color:var(--red)">紅方</b>從<b>自己右手邊</b>數起用國字「一～九」，<b>黑方</b>也從<b>自己右手邊</b>數起，用數字「1～9」。所以同一條線，紅方叫「二」，黑方叫「8」。<br>
    <b>進／退／平</b>：進＝往對方那邊走；退＝往自己那邊走；平＝橫著走。<br>
    <b>最後一個字</b>：「平」寫到達的那一路；「進、退」時，<b>直著走的棋子</b>（車、炮、兵、帥）寫<b>走幾步</b>，<b>斜著走的棋子</b>（馬、相、仕）寫<b>到達的那一路</b>。<br>
    <b>同一路有兩顆一樣的棋子</b>：用「前、後」分，例如「前炮進三」；三顆兵在同一路用「前、中、後」。</div>
    <div class="sec-t">點一下看範例</div><div class="card"><div id="nb" style="max-width:340px;margin:0 auto"></div><p id="ncap" style="text-align:center;line-height:1.6;min-height:3.2em;margin:6px 0"></p>
    <div class="opt" id="nex" style="justify-content:center;flex-wrap:wrap"></div></div>`;
  const bd=Board(null);box.querySelector("#nb").append(bd.svg);const b0=parseFen(START);
  const show=i=>{const[cn,d,mv]=EX[i],b=b0.slice();mv.slice(0,-1).forEach(([f,t])=>{b[t]=b[f];b[f]=null});const[f,t]=mv[mv.length-1];
    bd.svg._mvtHold=null;bd.draw(b,{anim:false,arrow:false,sugg:[{f,t}]});box.querySelector("#ncap").innerHTML=`<b>${cn}</b>：${d}`;
    box.querySelectorAll("#nex button").forEach((x,j)=>x.classList.toggle("on",j===i))};
  box.querySelector("#nex").innerHTML=EX.map(([cn],i)=>`<button data-i="${i}">${cn}</button>`).join("");
  box.querySelectorAll("#nex button").forEach(x=>x.onclick=()=>{vibrate(5);show(+x.dataset.i)});show(0)}
