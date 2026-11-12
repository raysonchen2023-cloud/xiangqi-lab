/* ================= ⏳ 對局中途可接續（開發者 11/9 選定）=================
   對電腦的棋本來就一步一存：local.js 的 xq_play＝桌上那盤、xq_play2＝收起來的各一盤（挑戰電腦 cpu／擂台 arena／石桌往事 journey／錯棋重練 practice），
   殘局類（一盞茶、珍品藏局、古法殘局、星槎、古戰場、輿圖、消寒圖…）各自存在 cjRun／cjRunS／cjRunB…。這裡只加「問一聲」：
     冷啟動（開頭畫面、載入畫面、其他視窗都關了、人在首頁）跳一張小卡「上次和○○的棋還沒下完，要繼續嗎？」——繼續＝回到同一盤同一步；放棄這盤＝不算輸、不扣東西、不進對局紀錄。
     回到對局頁（挑戰電腦、擂台、石桌往事、錯棋重練）時，那盤已經 10 分鐘以上沒動，也問一次（同一盤這次打開 App 只問一次）。
   積分挑戰：照原本的規矩，中途丟掉算輸（免得輸棋前放棄躲扣分），所以小卡只有「繼續」「先不要」，不給放棄。
   線上真人對戰（#/pvp、XQNet）不經過這裡；正在線上對局時也不跳小卡。
   存檔 store "resumeLast"（05b-save.js JOURNEY_KEYS 的 m_resumeLast）＝{r:最新一盤 {t:"play"|"cj",k 種類,g 對局 id,rk 殘局存檔鍵,id 題號,h 網址,nm 題名,n 步數,at 最後動到的時間},t:{對局 id:最後動到的時間}}；
     盤面本身照舊在 xq_play／xq_play2／cjRun…，這裡不另存一份。超過 7 天沒動的（積分挑戰除外）開 App 時自動清掉、不算輸。
   回饋 838（開發者 11/9 選：全模式中斷接續）：
     r.t 多了幾種「頁面型」的進度（跟殘局 cj 一樣：盤面存在各自的鍵，這裡只記最新一份）：lv＝石桌往事章回關卡、古戰場守城、星槎小關、女將守局…（07-legend.js jLevel，rk＝jRun／jRunB／jRunS／jRunW／jRunC）、
       tm＝主題訓練（store jpRun）、qz＝棋力測驗（store quizRun，03-home-quiz.js）；
     e＝{對局 id:朝代}＝園子路人那盤是在哪一朝的園子開的（接續時換回那一朝，不會把唐朝的路人帶到宋朝園子）；
     x＝[對局 id]＝「撐過 N 步」的關已經過了、但那盤棋沒有結果（local.js 沒有結束它），不再問要不要接續。舊存檔沒有 e、x 照常讀。 */
const RS_ON=true,RS_DAYS=7,RS_IDLE=10*60000,RS_URL={cpu:"#/cpu",arena:"#/arena",journey:"#/journey/play",practice:"#/redo/play"};
const rsKind=G=>G&&G.practice?"practice":G&&G.journey?"journey":G&&G.arena?"arena":"cpu";
const rsLs=k=>{try{return JSON.parse(localStorage.getItem("xq_"+k)||"null")}catch(e){return null}};
const rsUnf=G=>!!(G&&!G.result&&Array.isArray(G.moves)&&G.moves.length);
const rsT0=id=>{const t=Date.parse(String(id||"").replace(/^(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d).*$/,"$1T$2:$3:$4Z"));return isNaN(t)?0:t};
const rsData=()=>{const o=store.get("resumeLast",null);return o&&typeof o==="object"?{r:o.r||null,t:o.t||{},e:o.e&&typeof o.e==="object"?o.e:{},x:Array.isArray(o.x)?o.x:[]}:{r:null,t:{},e:{},x:[]}};   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：多了 e、x，舊存檔沒有就給空的 */
const rsAsked=()=>{try{return JSON.parse(sessionStorage.getItem("rsAsked")||"[]")}catch(e){return[]}};
const rsAsk=id=>{try{const a=rsAsked();if(!a.includes(id)){a.push(id);sessionStorage.setItem("rsAsked",JSON.stringify(a.slice(-20)))}}catch(e){}};
/* 收著的、沒下完的對電腦棋（cur＝桌上那盤） */
function rsGames(){const o=[],P=rsLs("play"),X=rsData().x;if(rsUnf(P)&&!X.includes(P.id))o.push({...P,k:rsKind(P),cur:true});let S=rsLs("play2");if(S&&S.moves)S={[rsKind(S)]:S};
  for(const k of["cpu","arena","journey","practice"]){const g=S&&S[k];if(rsUnf(g)&&!(P&&g.id===P.id)&&!X.includes(g.id))o.push({...g,k,cur:false})}return o}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：已經過關的「撐過 N 步」那盤（x）不算沒下完 */
/* 回饋 838（開發者 11/9 選：全模式中斷接續）：幾個給別的檔用的小工具
   rsFin(id)：「撐過 N 步」到了（07-legend.js lvWatch），這盤不再當成沒下完；rsFinGame(id)＝是不是這種盤
   rsJId(st)：石桌往事那一格（桌上或收著）的對局 id；rsArenaEra()：沒下完的擂台那盤是哪一朝（08b-cpugame.js 開擂台頁時照它算強度，不照現在停的朝代）
   rsParkEra(id)：園子路人那盤是在哪一朝開的；rsWasOpen(id)：這盤在對局頁開著時還沒下完（不在對局頁時才分出勝負，對局頁要補跑結算） */
function rsFin(id){if(!id)return;const D=rsData();if(!D.x.includes(id))D.x=D.x.concat(id).slice(-20);delete D.t[id];delete D.e[id];if(D.r&&D.r.g===id)D.r=null;store.set("resumeLast",D)}
const rsFinGame=id=>!!id&&rsData().x.includes(id);
function rsJId(st){if(st&&st.journey&&!st.result&&(st.moves||[]).length)return st.id;let S=rsLs("play2");if(S&&S.moves)S={[rsKind(S)]:S};const g=S&&S.journey;return rsUnf(g)?g.id:null}
function rsArenaEra(){const ok=g=>rsUnf(g)&&rsKind(g)==="arena"&&!g.ranked&&g.arena;const P=rsLs("play");if(ok(P))return P.arena;let S=rsLs("play2");if(S&&S.moves)S={[rsKind(S)]:S};return S&&ok(S.arena)?S.arena.arena:null}
const rsParkEra=id=>rsData().e[id]||null,rsWasOpen=id=>!!(id&&rsData().t[id]);
const rsLast=g=>rsData().t[g.id]||rsT0(g.id);
/* 對手是誰：有名字的人回 who；沒有角色的（故事關、古戰場、錯棋重練）回 title */
function rsWho(g){const j=String(g.journey||"");try{
  if(g.k==="practice")return{title:g.practice&&g.practice.drill?g.practice.title||"練習":"錯棋重練"};if(g.k==="arena")return{who:(ARENA[g.arena]||{}).name||"擂主"};   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：🎯 練習寫練習的題名 */
  if(g.k==="cpu")return{who:typeof cpuOppName==="function"?cpuOppName(g):typeof OPT_KM!=="undefined"?OPT_KM.name:"幻影棋客",tag:g.ranked?"晉級賽":"練功房"};   /* 11/11 笑面掌櫃：存檔有 opp:"zhanggui" 就寫掌櫃，舊存檔沒有＝幻影棋客 */   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：對局裡叫冷面國手（回饋 418），小卡也一樣 */
  if(j==="park"){const n=parkNpcOf({...g,journey:"park"});return{who:n?n.name:"園子裡的路人"}}
  {const a=typeof innAnyAct==="function"?innAnyAct(j):null;if(a)return{who:a.name}}
  if(j.startsWith("char:")&&JCHAR[j.slice(5)])return{who:JCHAR[j.slice(5)].name};
  {const L=typeof lvPlayOf==="function"?lvPlayOf({...g,journey:j}):null,k=L&&L.lvp&&L.lvp.opp;if(k&&JCHAR[k])return{who:JCHAR[k].name}}
  return{title:typeof jName==="function"?jName(j):"石桌往事"}}catch(e){return{title:"這盤棋"}}}
function rsCardHTML(g){const W=rsWho(g),n=g.moves.length,st0=g.startTurn||"r",turn=n%2?(st0==="r"?"b":"r"):st0,mine=turn===g.human,d=Math.floor((Date.now()-rsLast(g))/864e5);
  return`<div class="em">⏳</div><h2 style="font-size:19px;line-height:1.5">${W.who?`上次和${esc(W.who)}${W.tag?`（${esc(W.tag)}）`:""}的棋還沒下完，要繼續嗎？`:`上次「${esc(W.title)}」那盤棋還沒下完，要繼續嗎？`}</h2>
    <p class="muted" style="margin:4px 0 0">下到第 ${Math.ceil(n/2)} 回合・${mine?"輪到你走":"輪到對方"}${d>=1?`・${d} 天前`:""}</p>
    <p class="muted" style="font-size:13px;margin:6px 0 0">${g.ranked?"晉級賽中途放棄會算輸，這盤先幫你留著。":"放棄這盤不算輸，也不會扣任何東西。"}</p>`}
/* 繼續：不是桌上那盤就先換過來，再進那一種的對局頁 */
async function rsGo(g){rsAsk(g.id);if(!g.cur)try{await api("/play/switch",{kind:g.k})}catch(e){}if(g.k==="journey"&&g.journey==="park")store.set("park3d",true);
  if(String(g.journey||"").startsWith("bt:")&&typeof battleData==="function")try{await battleData()}catch(e){}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：古戰場讓子對弈——先載戰役資料，戰役名、下一場、集滿一卷的獎勵才對得上 */
  location.hash=RS_URL[g.k]||"#/cpu"}
/* 放棄：不呼叫認輸（認輸會進紀錄、積分局會扣分）。桌上那盤：挑戰電腦換一盤同設定的新棋，其他種類先換成挑戰電腦（那盤被收起來）；再把收著的那一份刪掉 */
async function rsDrop(g){if(!g||g.ranked)return false;try{if(window.XQ_saveLog)XQ_saveLog("drop",g)}catch(e){}   /* 評比循環第 2 輪：記進 🧾 對局保存紀錄 */
  if(g.cur){if(g.k==="cpu")await api("/play/new",{human:g.human||"r",lx:g.level||store.get("cpuLevel",6),...(g.opp==="zhanggui"&&!g.ranked?{opp:"zhanggui"}:{})});else await api("/play/switch",{kind:"cpu",human:"r",lx:store.get("cpuLevel",6)})}
  let S=rsLs("play2");if(S&&S.moves)S={[rsKind(S)]:S};if(S&&S[g.k]&&S[g.k].id===g.id){delete S[g.k];try{localStorage.setItem("xq_play2",JSON.stringify(Object.keys(S).length?S:null))}catch(e){}}
  if(g.k==="journey"){const P=store.get("jPending",null);if(P&&P.game===g.id)store.set("jPending",null)}
  const D=rsData();delete D.t[g.id];delete D.e[g.id];if(D.r&&D.r.g===g.id)D.r=null;store.set("resumeLast",D);return true}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：連同記下的朝代一起清 */
/* 對局頁每次畫面更新時記一下「最後動到的時間」（同一步一分鐘內不重寫）；下完就把最新一盤清掉 */
function rsTouch(s){if(!RS_ON||!s||!s.id||s.net)return;const D=rsData(),now=Date.now();if(D.x.includes(s.id))return;   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：「撐過 N 步」過了的那盤不再記 */
  /* 回饋 838（開發者 11/9 選：全模式中斷接續）：園子路人那盤第一次畫出來時記下是哪一朝；下完不管是不是最新一盤都把時間清掉（rsWasOpen 靠它分辨「離開對局頁以後才分出勝負」） */
  if(s.journey==="park"&&!s.result&&!D.e[s.id]){D.e[s.id]=store.get("era","classic");for(const k of Object.keys(D.e))if(!D.t[k]&&k!==s.id)delete D.e[k];store.set("resumeLast",D)}
  if(s.result||!(s.moves||[]).length){if(s.result&&(D.t[s.id]||D.e[s.id]||(D.r&&D.r.g===s.id))){if(D.r&&D.r.g===s.id)D.r=null;delete D.t[s.id];delete D.e[s.id];store.set("resumeLast",D)}return}
  const n=s.moves.length;if(D.r&&D.r.g===s.id&&D.r.n===n&&now-D.r.at<60000)return;
  D.r={t:"play",k:s.kind||rsKind(s),g:s.id,n,at:now};D.t[s.id]=now;for(const k of Object.keys(D.t))if(now-D.t[k]>RS_DAYS*864e5)delete D.t[k];store.set("resumeLast",D)}
/* 殘局類：每走一步存檔時記下是哪一題（07c-canju.js 的 save） */
function rsCj(rk,R,h){if(!RS_ON||!R||!R.id||!(R.path||[]).length||R.ans)return;const D=rsData(),t=document.querySelector("#title"),nm=(t&&t.textContent.trim())||"殘局";
  D.r={t:"cj",rk,id:R.id,h:h||location.hash,nm,n:R.path.length,at:Date.now()};store.set("resumeLast",D)}
const rsCjOk=r=>{const R=store.get(r.rk,null);return!!(R&&R.id===r.id&&(R.path||[]).length&&!R.ans)};
/* 回饋 838（開發者 11/9 選：全模式中斷接續）：頁面型的進度（lv 關卡、tm 主題訓練、qz 棋力測驗）跟殘局一樣記最新一份；rsPgOk＝那份還在、還沒做完；rsPgDrop＝放棄（清掉那份，不算輸、不扣東西） */
const RS_PGK={tm:"jpRun",qz:"quizRun"};
function rsPg(t,rk,id,h,nm,n,N){if(!RS_ON||!id)return;const D=rsData();D.r={t,rk:rk||RS_PGK[t],id,h:h||location.hash,nm:String(nm||"").slice(0,40),n:n|0,N:N|0,at:Date.now()};store.set("resumeLast",D)}
function rsPgOk(r){if(!r)return false;if(r.t==="cj")return rsCjOk(r);const R=store.get(r.rk||RS_PGK[r.t],null);if(!R)return false;
  if(r.t==="lv")return R.id===r.id&&!R.done&&!!(R.k>0||R.intro||R.si);if(r.t==="tm")return R.id===r.id&&Array.isArray(R.ids)&&R.k<R.ids.length;if(r.t==="qz")return R.sid===r.id&&Array.isArray(R.a);return false}
function rsPgDrop(r){if(!r)return;store.set(r.rk||RS_PGK[r.t],null);const D=rsData();if(D.r&&D.r.t===r.t&&D.r.id===r.id)D.r=null;store.set("resumeLast",D)}
function rsPgClear(t,id){const D=rsData();if(D.r&&D.r.t===t&&(id==null||D.r.id===id)){D.r=null;store.set("resumeLast",D)}}
/* 開 App 時：清掉 7 天沒動的；找出最新一盤 */
async function rsSweep(){const now=Date.now(),lim=RS_DAYS*864e5;for(const g of rsGames())if(!g.ranked&&now-rsLast(g)>lim)try{await rsDrop(g)}catch(e){}
  const D=rsData();if(D.r&&D.r.t!=="play"&&(!rsPgOk(D.r)||now-D.r.at>lim)){if(rsPgOk(D.r))store.set(D.r.rk||RS_PGK[D.r.t],null);D.r=null;store.set("resumeLast",D)}}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：頁面型的進度一樣 7 天沒動就清掉 */
function rsLatest(){const D=rsData(),G=rsGames();if(D.r&&D.r.t!=="play"&&rsPgOk(D.r)){if(!G.length||D.r.at>=Math.max(...G.map(rsLast)))return{cj:D.r}}
  if(!G.length)return null;return{g:G.slice().sort((a,b)=>rsLast(b)-rsLast(a))[0]}}
function rsCard(L,after){if(L.cj){const r=L.cj;rsAsk(r.t+":"+(r.rk||"")+":"+r.id);
    /* 回饋 838（開發者 11/9 選：全模式中斷接續）：關卡、主題訓練、棋力測驗也走這張卡，字照種類換 */
    const nm=esc(r.t==="cj"?String(r.nm||"").replace(/^\S*\s/,""):String(r.nm||"")),T=r.t==="lv"?[`上次「${nm}」那一關還沒過完，要繼續嗎？`,`做到第 ${Math.min(r.n+1,r.N||r.n+1)}${r.N?"／"+r.N:""} 步`,"放棄不算輸，也不會扣任何東西，下次從第一步開始。","放棄這關","好，這關下次從頭來"]
      :r.t==="tm"?[`上次的主題訓練「${nm}」還沒做完，要繼續嗎？`,`做到第 ${r.n+1}／${r.N||10} 題`,"放棄不算錯，也不會扣任何東西，下次換一組新題。","放棄這組","好，下次換一組新題"]
      :r.t==="qz"?["上次的棋力測驗還沒做完，要繼續嗎？",`答了 ${r.n} 題`,"放棄不影響最好成績，答過的題目照樣記進我的成長。","放棄這次","好，下次重新測"]
      :[`上次那題「${nm}」還沒解完，要繼續嗎？`,`已經走了 ${Math.ceil(r.n/2)} 步`,"放棄這題不算錯，也不會扣任何東西，下次從頭解。","放棄這題","好，這題下次從頭解"];
    return modal(`<div class="em">⏳</div><h2 style="font-size:19px;line-height:1.5">${T[0]}</h2><p class="muted" style="margin:4px 0 0">${T[1]}</p><p class="muted" style="font-size:13px;margin:6px 0 0">${T[2]}</p>`,
      [["▶ 繼續",()=>{location.hash=r.h}],[T[3],()=>{rsPgDrop(r);toast(T[4]);after&&after()},true]])}
  const g=L.g;rsAsk(g.id);
  return modal(rsCardHTML(g),g.ranked?[["▶ 繼續",()=>rsGo(g)],["先不要",null,true]]:[["▶ 繼續",()=>rsGo(g)],["放棄這盤",()=>rsDrop(g).then(()=>{toast("好，這盤不算，已經收掉了");after&&after()}).catch(e=>toast(e.message)),true]])}
/* 冷啟動：等開頭畫面、載入畫面、其他視窗都關掉，而且人在首頁，才問一次 */
function rsBoot(){if(!RS_ON)return;try{if(sessionStorage.getItem("rsBoot"))return;sessionStorage.setItem("rsBoot","1")}catch(e){}
  let tries=0;const home=()=>/^(#\/?(home)?)?$/.test(location.hash),busy=()=>document.getElementById("preov")||document.body.classList.contains("xqt-on")||document.querySelector(".modal,#sheet,.kx,.kx-dim");
  const tick=async()=>{if(++tries>90)return;if(busy())return setTimeout(tick,700);if(!home())return;
    try{if(window.XQNet&&XQNet.playing&&XQNet.playing())return}catch(e){}
    try{await rsSweep()}catch(e){}const L=rsLatest();if(!L||!home()||busy())return;
    if(L.g&&rsAsked().includes(L.g.id))return;rsCard(L,()=>{try{route()}catch(e){}})};
  setTimeout(tick,1500)}
/* 對局頁第一次打開（08b-cpugame.js）：這盤 10 分鐘以上沒動、這次打開 App 還沒問過，就問一次；放棄後 back() 決定畫面去哪 */
function rsEntry(s,mode,back){if(!RS_ON||!rsUnf(s)||!s.id)return;const g=rsGames().find(x=>x.id===s.id);if(!g||g.k!==mode||rsAsked().includes(g.id))return;
  if(Date.now()-rsLast(g)<RS_IDLE)return;rsAsk(g.id);
  /* 11/11：剛在首頁按了「▶ 接著下」（07z hmGoBar 寫的一次性記號）＝已經表態要繼續，不再問一次 */
  try{if(sessionStorage.getItem("rsGoOnce")){sessionStorage.removeItem("rsGoOnce");return}}catch(e){}
  modal(rsCardHTML(g),g.ranked?[["▶ 繼續",null],["先不要",()=>{location.hash="#/"},true]]:[["▶ 繼續",null],["放棄這盤",()=>rsDrop(g).then(()=>{toast("好，這盤不算，已經收掉了");back&&back()}).catch(e=>toast(e.message)),true]])}
rsBoot();
/* 11/11 AI 模擬玩家第二輪問題 1（多分頁）：另一個分頁開了別盤、或把桌上那盤換掉（local.js playSync 發 xq-play-other），這邊的記憶體已經改讀最新那盤；
   提醒一次（這次打開 App 只說一次），免得以為棋不見了。原本那盤怎麼處理照 local.js 平常的規矩（另一個分頁開了別種棋＝原本那盤收進 play2，首頁「▶ 接著下」接得回來；開了同一種的新局＝跟單一分頁一樣被換掉） */
let RS_OTHER=0;
function rsOther(){if(RS_OTHER)return;RS_OTHER=1;try{toast("另一個分頁也開著象棋千秋，棋盤已換成那邊最新的一盤。建議只留一個分頁，免得兩邊互相蓋掉。")}catch(e){}}
addEventListener("xq-play-other",rsOther);
/* 評比循環第 2 輪 ChatGPT（續局與分頁衝突的可視化復原紀錄）：
   兩個分頁幾乎同時落子：local.js savePlay 寫之前發現 xq_play 已經是別的分頁寫的新版（seq／tab 跟自己記得的不一樣）＝不覆蓋、改讀最新，發 xq-play-newer，這裡提示（4 秒內只說一次）。
   🧾 對局保存紀錄（rsLogSheet）：設定頁「💾 存檔」、行囊木箱的「存檔與讀檔」卡片裡的按鈕打開（05b-save.js saveList）。資料來自 local.js /play/log＝xq_saveLog 最近 20 筆＋哪幾盤還拿得回來（can）；
   「被另一個分頁換盤」那一筆、那盤還在 xq_play2 或 xq_playBak，旁邊有「↩ 回到那一盤」（/play/restore）。格式見 story/88 第 8 節 */
let RS_NEWER=0;
addEventListener("xq-play-newer",()=>{const t=Date.now();if(t-RS_NEWER<4000)return;RS_NEWER=t;try{toast("另一個分頁剛下了一步，已切換到最新")}catch(e){}});
const RS_LOGEV={auto:["💾","自動存檔"],reopen:["🔁","重開後接續"],take:["🪟","從另一個分頁接手"],swap:["⚠️","被另一個分頁換盤"],gone:["⚠️","另一個分頁清掉了桌上的棋（讀檔或開新旅程）"],
  clash:["⛔","兩個分頁同時下：這邊那一步沒存，已改讀最新"],stash:["📥","收起來（換下別種棋）"],back:["↩","回到那一盤"],keep:["🎭","選角保留進度"],drop:["🗑","放棄這盤"],fail:["❗","存檔失敗（手機空間可能不夠）"],fix:["🩹","存檔壞掉，改讀上一份完整存檔"]};
function rsLogWho(x){if(!x||!x.id)return"";const md={cpu:x.rkd?"晉級賽":"練功房",arena:"朝代擂台",journey:"石桌往事",practice:"練習"}[x.k]||"對局";
  let W={};try{W=rsWho({id:x.id,k:x.k,arena:x.ar||null,journey:x.jn||null,ranked:!!x.rkd,practice:x.k==="practice"?{drill:!!x.dr,title:x.pt||""}:null,moves:[]})||{}}catch(e){}
  return md+(W.who?"・對"+W.who:W.title&&W.title!==md?"・"+W.title:"")+"・第 "+(x.n|0)+" 手"+(x.end?"（已下完）":"")}
async function rsLogSheet(){let D=null;try{D=await api("/play/log")}catch(e){}
  sheet("🧾 對局保存紀錄",b=>{const L=D&&Array.isArray(D.log)?D.log:[],can=new Set(D&&Array.isArray(D.can)?D.can:[]),shown=new Set();
    b.innerHTML=`<p class="sv-h">這支手機最近 ${L.length} 筆對局保存事件（最多 20 筆；只記時間、哪一盤、發生什麼事，不存棋譜）。連續的自動存檔合成一筆。</p>`
      +(L.length?L.map(x=>{const E=RS_LOGEV[x.ev]||["•",String(x.ev||"")],bk=x.ev==="swap"&&can.has(x.id)&&!shown.has(x.id);if(bk)shown.add(x.id);
        return`<div style="padding:9px 0;border-bottom:1px solid var(--line)"><div><b>${E[0]} ${esc(E[1])}</b>${x.c>1?`<span class="muted">（${x.c|0} 次）</span>`:""}</div>`
          +`<div class="muted" style="font-size:13px;margin-top:2px">${esc(fmtAt(x.at))}${x.id?"・"+esc(rsLogWho(x)):""}${x.ev==="swap"&&x.to?"・換成另一盤"+(x.tk?"（"+esc({cpu:"練功房",arena:"朝代擂台",journey:"石桌往事",practice:"練習"}[x.tk]||"對局")+"）":""):""}</div>`
          +(bk?`<div class="sv-a" style="margin:6px 0 2px"><button class="main" data-rb="${esc(x.id)}">↩ 回到那一盤</button></div>`:"")+`</div>`}).join("")
        :`<p class="muted">還沒有紀錄。下棋、換盤、重開 App 接著下的時候，這裡會記下來。</p>`);
    b.querySelectorAll("[data-rb]").forEach(x=>x.onclick=async()=>{vibrate(6);x.disabled=true;const id=x.dataset.rb;
      try{const s=await api("/play/restore",{id});rsAsk(id);closeSheet();toast("已回到那一盤");const u=RS_URL[s&&s.kind]||"#/cpu";if(location.hash!==u)location.hash=u;else try{window.dispatchEvent(new Event("xq-play"))}catch(e){}}
      catch(e){x.disabled=false;toast(e.message||"拿不回那一盤")}})})}
