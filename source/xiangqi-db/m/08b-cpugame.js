/* 第 15 輪 X3 鍵值化：核心字串用鍵，英文模式回 07i18n.js I18N_KEY 的英文，其他（或沒有 07i18n）照原文 */
function cgT(k,z,v){return typeof i18nT==="function"?i18nT(k,z,v):z}
/* hspx P0 開發者 11/13「點下我的棋力沒反應，甚至出現第二張圖（畫面整個往上捲、下面一片空白）」：結果視窗的「看我的棋力 ›」以前靠 tick 事後綁 onclick，沒綁上就點不動；
   改成全域點擊委派：什麼時候按都有反應。先關視窗、把被 iOS 捲走的頁面捲回頂，再去「我的棋力」 */
document.addEventListener("click",e=>{const g=e.target&&e.target.closest&&e.target.closest(".modal .rg-go");if(!g)return;e.preventDefault();e.stopPropagation();
  const m=g.closest(".modal");if(m)m.remove();try{vibrate(5)}catch(x){}try{(document.scrollingElement||document.documentElement).scrollTop=0;window.scrollTo(0,0)}catch(x){}store.set("statsTab","all");location.hash="#/stats"},true);
function CpuGame(v,practicePage,mode){
  /* 意見回饋 413：這一頁是哪個模式由網址決定（#/cpu 挑戰電腦、#/arena 朝代擂台、#/journey/play 石桌往事、#/redo/play 練習）；標題、返回、上面的按鈕、新局、結果視窗都只看 MODE。守關算石桌往事（KIND 跟 local.js 的 kindOf 一樣：journey 優先） */
  const MODE=practicePage?"practice":mode||"cpu",KIND=s=>s.kind||(s.practice?"practice":s.journey?"journey":s.arena?"arena":"cpu"),MODE_URL={cpu:"#/cpu",arena:"#/arena",journey:"#/journey/play",practice:"#/redo/play"};let opened=false;
  const openArgs=()=>{if(MODE==="arena"){const e=(typeof rsArenaEra==="function"&&rsArenaEra())||store.get("era","classic"),k=ARENA[e]?e:"classic";   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：有沒下完的擂台那盤，強度照那盤的朝代算（不照現在停的朝代，免得石桌棋仙那盤被降級、別朝擂主被升到第 7 級） */return{kind:"arena",arena:k,level:arenaLevel(k),dx:typeof diffDx==="function"?diffDx():0}}   /* 意見回饋 675：擂主照航行難度加減幾段 */
    if(MODE==="journey"||MODE==="practice")return{kind:MODE};
    {const rk=OFF&&store.get("cpuRanked",true);return{kind:"cpu",ranked:rk,lx:store.get("cpuLevel",6),human:"r",...zgArg(cpuOppPref(),rk,zgXOn(cpuOppPref()))}}};
  setTabs(false);gameLayout(v);
  let st=null,sel=-1,shownResult=null,busy=false,pHint=null;   // pHint：錯棋重練時在棋盤上畫 Pikafish 的建議
  const bd=Board(i=>tap(i));v.querySelector("#bbox").append(bd.svg);
  // 🏯 朝代擂台：在公園 3D 裡打（意見回饋 319），沒開公園時先帶你去公園
  const arenaStart=(era,lv)=>{if(!parkOn()){store.set("park3d",true);setTimeout(()=>{draw();topBar()},0)}if(PARK&&PARK.era!==era){try{PARK.v.destroy()}catch(e){}PARK=null}
    store.set("cpuRanked",false);shownResult=null;sel=-1;post("/play/new",{human:"r",level:lv,arena:era,dx:typeof diffDx==="function"?diffDx():0}).then(()=>{toast(`🏯 ${ARENA[era].name}：${ARENA[era].hi}`)})};
  const arenaBtn=["🏯",()=>{const go=()=>arenaSheet(store.get("era","classic"),arenaStart);if(!parkOn()){store.set("park3d",true);toast("🌳 朝代擂台在園子裡，帶你過去");draw();topBar();setTimeout(go,400)}else go()},"朝代擂台"];
  // 意見回饋 273：上方列精簡——🏯 只在公園裡出現（擂台本來就在公園），返回鍵已經是回首頁所以不放 🏠；切公園時整列重畫
  const topBar=()=>{const lk=!!(typeof st!=="undefined"&&st&&st.arena&&!st.result),pr=!!(st&&st.practice);
    /* 意見回饋 335：錯棋重練是自己的頁面——標題寫「錯棋重練」，上面沒有積分／自選／擂台／公園，返回回到錯棋清單 */
    /* 意見回饋 349：朝代擂台（和石桌往事）的上方不放積分／自選，只寫是哪裡 */
    /* ChatGPT 改善單 T01（開發者 11/11 核准）：主流程來的練習（practice.t01）標題寫「↻ 從這步重下」，返回回到剛才那一步（關鍵步那一頁），不是錯棋列表 */
    setTop(pr?(st.practice.drill?"🎯 "+(st.practice.title||"練習"):st.practice.t01?"↻ 從這步重下":"🔁 錯棋重練"):MODE==="arena"?"🏯 朝代擂台":MODE==="journey"?(st&&st.journey==="park"?"🌳 "+parkName(store.get("era","classic")):(String(st&&st.journey||"").startsWith("bt:")?"⚔ ":"🪨 ")+jName(st&&st.journey)):cgT("cpu.title","挑戰電腦"),pr?(st.practice.drill?"#/":st.practice.t01&&st.practice.t01.back||"#/redo"):MODE==="journey"?(st&&st.journey==="park"?"^#/port":st&&st.journey?jBack(st.journey):"#/adventure"):MODE==="arena"?"^#/port":(typeof CPUROOM_ON!=="undefined"&&CPUROOM_ON?"#/cpuroom":"#/"),   /* 意見回饋 697：園子、擂台的「‹」回這一朝的渡口 */pr?[]:[/* 意見回饋 346：挑戰電腦看不到擂台、驛站的入口——🏯 只在擂台那盤出現（換擂主）、🏮 只在石桌往事的公園出現 */...(MODE==="arena"?[arenaBtn]:[]),...(MODE==="journey"&&OFF&&st&&st.journey==="park"?[["🏮",()=>walk("inn",()=>navReplace("#/journey/inn")),"走去驛站"]]:[]),...(lk?[]:[parkBtn(()=>{draw();topBar()})]),...(MODE==="arena"||(MODE==="journey"&&st&&/^(park$|inn:)/.test(String(st.journey||"")))?[["⛵",()=>goUp("#/adventure"),"回星槎"]]:[])].concat(vcOn()?[["🎤",()=>voiceMove(()=>!st||st.result?{why:"這盤已經結束"}:st.turn!==st.human||st.thinking?{why:"還沒輪到你"}:{board:st.board,legal:st.legal,play:(f,t)=>{sel=-1;post("/play/move",{f,t})}}),"聲控走棋"]]:[]));
    try{if(seg&&MODE==="cpu"){const t=$("#title");t.textContent="";if(typeof hbFromHome==="function"&&hbFromHome())t.textContent="♟ 快速對局";else if(st&&st.blind)t.textContent="🙈 盲棋";else t.append(seg)}}catch(e){}   /* 11/11：橋上快速對局不放晉級賽／練功房分頁 */
    try{if(MODE==="cpu"&&!pr&&typeof CPUROOM_ON!=="undefined"&&CPUROOM_ON){const b=$("#back");if(b&&String(b.dataset.to||"").indexOf("/cpuroom")>=0)b.innerHTML="<b>‹</b>走回雅間"}}catch(e){}if(typeof hbHomeBack==="function")hbHomeBack()};   /* 11/11：從首頁石桌／立即對局進來的，返回回首頁（07y hbHomeBack） */   /* 11/10：從茶坊後園走回雅間 */   /* 第一次呼叫時 seg 還沒建立 */
  topBar();
  /* 意見回饋 276、403、413：首頁「🏯 朝代擂台」改走 #/arena，進頁時 /play/open 先換到擂台那一盤（沒有就開目前朝代的），還沒開始才打開擂主卡；不再用 openArena 計時 */
  // 模式切換直接放在頂部列（取代標題）：積分挑戰／自選難度／獎勵一眼就看得到，點一下就換（離線版才有積分挑戰和獎勵）
  const modeOf=s=>s.ranked?"rank":"free",prefMode=()=>store.get("cpuRanked",true)?"rank":"free";
  const seg=OFF&&MODE==="cpu"?document.createElement("div"):null;
  if(seg){seg.className="cpu-seg";seg.setAttribute("role","tablist");
    seg.innerHTML=`<button data-m="rank" role="tab">🥇 晉級賽</button><button data-m="free" role="tab">📚 練功房</button>`;
    const t=$("#title");t.textContent="";t.append(seg);paintSeg(prefMode());
    seg.querySelectorAll("button").forEach(b=>b.onclick=()=>{vibrate(8);switchMode(b.dataset.m)})}
  function paintSeg(m){if(seg)seg.querySelectorAll("button").forEach(b=>{const on=b.dataset.m===m;b.classList.toggle("on",on);b.setAttribute("aria-selected",on)})}
  /* 意見回饋 431：點對手頭像看他的 3D 人物（拖曳可以轉） */
  const oppInfo=()=>{if(!st)return null;const bot=st.human==="r"?"b":"r",N=parkNpcOf(st),L0=lvPlayOf(st),jk=(L0&&L0.lvp.opp)||(String(st.journey||"").startsWith("char:")?st.journey.slice(5):null);
    if(jk&&JCHAR[jk])return{look:JCHAR_LOOK(jk,bot),name:JCHAR[jk].name,img:`data/journey/char_${jk}_idle.webp`,say:JCHAR[jk].hi,age:AGE["j:"+jk]};
    {const ia=innActor(st.journey);if(ia)return{look:ACTOR_LOOK(ia.id,bot),name:ia.name,img:ia.img,say:ia.say.replace(/^「|」$/g,""),age:AGE["n:"+ia.id]}}
    {const ig=igAct(st.journey);if(ig)return{look:ig.look(bot),name:ig.name,img:ig.img,say:ig.hi,age:ig.age}}   /* 意見回饋 826：驛站今天路過的客人（07m2-innguest.js） */
    if(st.arena&&ARENA[st.arena])return{look:CHAMP_LOOK(st.arena,bot)||{p:bot==="r"?"帥":"將",e:st.arena,g:9},name:ARENA[st.arena].name,img:`data/champ/${st.arena}_idle.webp`,say:ARENA[st.arena].hi,age:AGE["c:"+st.arena]};
    if(N)return{look:NPC_LOOK(N,bot),name:N.name,img:`data/npc/${N.id}.webp`,say:N.say,age:AGE["n:"+N.id]};
    {const T=oppTalk(st,null,null);return{look:zgIs(st)?ZG_LOOK(bot):PIKA_LOOK(bot),name:T.name||"對手",img:null,say:T.hi}}};   /* 826 追加：電腦對手不再自稱 Pikafish（挑戰電腦＝冷面國手；章回棋路沒指定對手的關＝不報名字） */
  (v.querySelector("#pTop")||{}).onclick=e=>{if(e.target.closest(".cpu-chip")){vibrate(8);newSheet();return}
    if(e.target.closest(".av")){const o=oppInfo();if(!o)return;vibrate(5);figView(oppArt()&&o.img?null:oppFig(o.look),"👤 "+o.name,`<p style="font-size:16px;line-height:1.8;margin:0 0 4px">「${esc(o.say)}」</p>${ageLine(o.age)}`,[["關閉",()=>closeSheet(),true]],o.img)}};   /* 意見回饋 445：跟坐在位子上的同一個形象（立繪就看立繪、3D 就看 3D） */
  const acts=actionBar(v.querySelector("#acts"),[["bag","🎒",cgT("game.items","寶物"),()=>bagSheet()],["undo","↶",cgT("game.undo","悔棋"),()=>undoAsk()],
    ["new","＋",cgT("game.new","新局"),()=>newSheet(),true],["resign","🏳",cgT("game.resign","認輸"),()=>confirmBox(cgT("game.resignAsk","確定認輸？"),()=>post("/play/resign"),cgT("game.resign","認輸"))],["review","📖",cgT("game.review","檢討"),()=>review(false,st&&st.id)],["setup","🧪",cgT("game.setup","擺盤"),()=>st&&setupSheet(st.board,st.turn,st.human==="b",!st.ranked)],["peek","👁",cgT("game.peek","偷看"),()=>peek()]]);
  /* 開發者 11/11 茶肆盲棋：每盤偷看 3 次、每次 3 秒（次數記在 blindPeek，換一盤重算） */
  function peek(){if(!st||!st.blind||st.result)return;const K=store.get("blindPeek",{})||{},n=K[st.id]||0;if(n>=3)return toast("這盤的 3 次偷看用完了");
    store.set("blindPeek",{[st.id]:n+1});vibrate(5);peekUntil=Date.now()+3000;draw();peekLbl();setTimeout(draw,3050)}
  const peekLbl=()=>{if(!acts.peek||!st)return;const n=(store.get("blindPeek",{})||{})[st.id]||0;acts.peek.innerHTML='<span class="ic">👁</span>偷看（'+Math.max(0,3-n)+'）'};
  let repAsked=null,peekUntil=0,bOff=false;   /* 盲棋：偷看到什麼時候、是不是盲棋暫時關掉了 3D 園子 */   /* 這盤這一手已經問過待核了 */
  async function post(u,b){if(busy)return false;busy=true;try{render(await api(u,b||{}));return true}catch(e){toast(e.message);return false}finally{busy=false}}
  /* 意見回饋 594：悔棋要用悔棋符（練習不用） */
  /* 開發者 11/11 選 v3 規劃書 B03：悔棋確認框多一行「這一盤不算進我的棋力」（提示棋用的時候本來就有說，悔棋以前沒說） */
  function undoBox(text,yes,label){modal(`<h2 style="font-size:19px">${esc(text)}</h2><p class="muted" style="font-size:13px">${cgT("undo.note","悔棋以後，這一盤不算進「我的棋力」（輸贏照常算）。")}</p>`,[[label||cgT("dlg.ok","確定"),yes],[cgT("dlg.cancel","取消"),null,true]])}
  function undoAsk(){if(!st)return;if(st.practice)return post("/play/undo");{const no=itemBlock(st);if(no)return toast(no)}const n=undoLeft();
    /* 意見回饋 675：照航行難度，星槎和擂台的對局每盤有幾次免費悔棋（聽書不限） */
    {const fr=typeof undoFreeLeft==="function"?undoFreeLeft(st):0;if(fr){if(!st.moves.some(m=>m.by===st.human))return toast("你還沒走棋，不用悔棋");return undoBox(`免費悔棋：退回你的上一步？（${fr<0?"這個難度不限次數":"這盤還有 "+fr+" 次"}）`,()=>{post("/play/undo").then(ok=>{if(ok&&fr>0)undoFreeUse(st)})},"↶ 悔棋")}}
    if(n<=0)return toast("沒有悔棋符了");
    /* 意見回饋 651（開發者）：還沒走棋就能用掉悔棋符——先確認這盤自己走過棋；而且悔棋真的成功才扣悔棋符（之前先扣再悔，悔不成也白扣） */
    if(!st.moves.slice(st.practice?st.practice.base||0:0).some(m=>m.by===st.human))return toast("你還沒走棋，不用悔棋");
    undoBox("用 1 張悔棋符，退回你的上一步？（現在有 "+n+" 張）",()=>{if(undoLeft()<=0)return;post("/play/undo").then(ok=>{if(ok)store.set("undoBonus",Math.max(0,undoLeft()-1))})},"↶ 用悔棋符")}
  /* 意見回饋 597（開發者）：對局中多一顆「🎒 寶物」，打開就看到提示棋、悔棋符，按了直接用；積分挑戰、獎勵模式、練習會擋下來並說明原因
     意見回饋 600：排版整理——兩樣並排成一樣大的方格（圖示、張數、按鈕上下對齊），說明收成一行，點「怎麼拿到？」才展開 */
  function bagSheet(){if(!st)return;const no=itemBlock(st),H=hintInfo(),hn=H.left+H.bonus,fr=typeof undoFreeLeft==="function"?undoFreeLeft(st):0,un=fr<0?99:undoLeft()+Math.max(0,fr),mine=st.moves.some(m=>m.by===st.human),myTurn=!st.result&&st.turn===st.human&&!st.thinking;
    const why=(n,ok,need)=>no?"這盤不能用":!n?"沒有了":!ok?need:"";
    sheet("🎒 寶物",b=>{b.innerHTML=(no?`<div class="bag-no">⛔ ${esc(no)}</div>`:"")+
      `<div class="bagg">
        <div class="bagt"><div class="bag-ic">💡</div><div class="bag-nm">提示棋</div><div class="bag-n">${hn}<small>顆</small></div><div class="bag-d">指出關鍵的那顆子</div>
          <button class="btn" id="bgH">使用</button><div class="bag-w">${esc(why(hn,myTurn,"輪到你才能用"))}</div></div>
        <div class="bagt"><div class="bag-ic">↶</div><div class="bag-nm">悔棋符</div><div class="bag-n">${fr<0?"不限":un}<small>${fr<0?"":"張"}</small></div><div class="bag-d">${fr?"這盤有免費悔棋（航行難度）":"退回你的上一步"}</div>
          <button class="btn" id="bgU">使用</button><div class="bag-w">${esc(why(un,mine,"你還沒走棋"))}</div></div></div>
      <p class="muted" style="font-size:12.5px;margin:10px 0 0">💡 用過提示棋或悔棋的那盤不算進我的棋力（輸贏照常算）。線上對戰、挑戰電腦（晉級賽、練功房）不能用寶物。</p>`;   /* 意見回饋 609：不寫掉落規則 */
      const bh=b.querySelector("#bgH"),bu=b.querySelector("#bgU");
      bh.disabled=!!no||!hn||!myTurn;bu.disabled=!!no||!un||!mine;
      bh.onclick=()=>{closeSheet();jBattleHint(st,h=>{pHint=h;try{if(h&&st){store.set("rsHint",{...h,id:st.id});st.hintN=(+st.hintN||0)+1;asstNote(v,st)}}catch(e){}draw()})};   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：用掉的提示棋黃框記下來，關掉 App 再打開同一盤同一步還看得到 */bu.onclick=()=>{closeSheet();undoAsk()}})}
  /* 第 12 輪 F3 預走（07pm-premove.js）：電腦還在想時，平面棋盤上的點選交給 pmvTap 排預走；輪到你時 render 叫 pmFire，合法就照一般點選的路走出（黑洞序局的 bhxGuard 照樣把關） */
  const pmFire=()=>{if(typeof pmvFire==="function"&&st)pmvFire(st,st.human,(f,t)=>{if(busy)return false;sel=f;tap(t);return true},pmFire)};
  /* 第 13 輪 F4：3D 園子（含朝代擂台、黑洞巨盤）也排得了預走（park3d 照 o.pre 畫標記），不再只限平面棋盤 */
  function tap(i){if(st&&!st.result&&(st.turn!==st.human||st.thinking)&&typeof pmvTap==="function"&&pmvTap(st,st.human,i,{redraw:()=>{if(st)render(st)}}))return;
    if(!st||st.result||st.turn!==st.human||st.thinking)return;
    if(sel>=0&&st.legal.some(([f,t])=>f===sel&&t===i)){const f=sel;sel=-1;
      {const g=typeof bhxGuard==="function"?bhxGuard(st,f,i):null;if(g){if(g.hint)pHint={n:st.moves.length,f:g.hint[0],t:g.hint[1]};draw();return}}   /* 黑洞序局走錯：不送出，星樞提示（07bh-blackhole.js） */
      vibrate(15);return post("/play/move",{f,t:i})}
    sel=i===sel?-1:st.legal.some(([f])=>f===i)?i:-1;if(sel>=0)vibrate(5);draw()}
  function draw(){if(!st)return;const last=st.moves[st.moves.length-1],N=parkNpcOf(st),hb=v.querySelector("#bbox"),pk0=!!(PARK&&PARK.host===hb&&document.body.contains(PARK.v.el));
    const o={flip:st.human==="b",me:st.human,axOpp:"電腦",last,sel,targets:sel>=0?st.legal.filter(([f])=>f===sel).map(x=>x[1]):[],hint:st.hint?[st.hint.f,st.hint.t]:pHint&&pHint.n===st.moves.length?(pHint.t==null?[pHint.f]:[pHint.f,pHint.t]):null,check:st.check,fx:true};if(typeof pmvOpts==="function")pmvOpts(st,st.human,o);   /* 第 12 輪 F3：預走選子、排好的預走、對方剛走那步（07pm-premove.js） */const LVB=lvPlayOf(st),BLD=!st.result&&(LVB&&LVB.lvp.blind||st.blind&&Date.now()>=peekUntil);hb.classList.toggle("lvblind",!!BLD);
    /* 茶肆盲棋：3D 園子會畫出棋子，這盤先用平面棋盤（下完、換一般對局就恢復） */
    if(st.blind&&!st.result){if(!PARK_OFF){PARK_OFF=true;bOff=true}try{parkDraw(hb,bd,st.board,o,{tap})}catch(e){}}else if(bOff){PARK_OFF=false;bOff=false}
    if(BLD){bd.draw(st.board.map(()=>null),o);return}bd.draw(st.board,o);
    legendCheck(st);legendBadge(v.querySelector("#bbox"),!parkOn()&&legendVisit(st).length>0);
    const JS0=st.journey&&/^(b2)?h\d\d$/.test(st.journey)?jFindStage(st.journey):null,JOPP=LVB&&LVB.lvp.opp&&JCHAR[LVB.lvp.opp]?LVB.lvp.opp:String(st.journey||"").startsWith("char:")&&JCHAR[st.journey.slice(5)]?st.journey.slice(5):null;
    const BRG=!JS0&&!st.journey&&!st.arena&&!st.practice&&typeof hbBridge==="function"?hbBridge():null;   /* 11/11：從首頁進來的挑戰電腦＝橋上環景 */
    const OT=oppTalk(st,JOPP,N);   /* 意見回饋 826 追加：對面的人開口、贏、輸、和棋各說自己的話（07m3-opptalk.js） */
    parkDraw(v.querySelector("#bbox"),bd,st.board,o,{tap,gid:st.id?"cpu:"+st.id:null,...(BRG?{bridge:true,ground:BRG.ground}:{}),bg:JS0?`data/park/j${JR[JS0.r].k}_360.webp`:BRG?BRG.bg:null,bgName:JS0?"雲河鎮・"+JR[JS0.r].name:innAnyAct(st.journey)?"🏮 "+innName(store.get("era","classic")):!st.journey&&!st.arena&&!st.practice&&typeof hbYardName==="function"?hbYardName():null,   /* 11/10：挑戰電腦在茶坊後園下 */   /* 意見回饋 530：在驛站下棋，標籤寫驛站，不是朝代園林 */arena:st.arena||null,gate:st.journey&&!st.arena?(k=>innAnyAct(st.journey)?{img:["data/inn/"+k+"_ink.webp","data/parkgate/"+k+"_ink.webp","data/inn/"+k+".webp"],icon:"🏮",title:"走進"+innName(k),sub:"旅人在燈下擺好棋盤了",bg:"#2b2a22",qk:k}:{img:["data/parkgate/"+k+"_ink.webp","data/parkgate/"+k+".webp","data/park/"+k+"_360.webp"],icon:"🍃",title:"走進"+parkName(k),sub:"石桌就在前面",bg:"#2b2a22",qk:k})(store.get("era","classic"))   /* 意見回饋 697：驛站旅人的對局，載入畫面和標籤都寫「〇〇的驛站」 */:(!st.journey&&!st.arena&&!st.practice&&!st.net?(typeof hbYardGate==="function"?hbYardGate("cpu"):typeof hbGate==="function"?hbGate("🤖","挑戰電腦","對手擺好棋盤了"):null):null),watchers:legendVisit(st),thinking:!!st.thinking||(!st.result&&st.turn!==st.human),botSide:st.human==="r"?"b":"r",result:st.result?(st.result.w||"draw"):null,hint:o.hint&&o.hint.length===1?[o.hint[0],o.hint[0]]:o.hint,   /* 意見回饋 607：只提示一顆子（錯棋重練提示一、二、提示棋）時傳同一格兩次，園子 3D 才畫得出黃圈（park3d 只畫兩格的提示） */
      opp:(JOPP&&JCHAR_LOOK(JOPP,st.human==="r"?"b":"r"))||(innAnyAct(st.journey)?innLook(innAnyAct(st.journey),st.human==="r"?"b":"r"):null)||(st.arena&&CHAMP_LOOK(st.arena,st.human==="r"?"b":"r"))||(N?NPC_LOOK(N,st.human==="r"?"b":"r"):zgIs(st)?ZG_LOOK(st.human==="r"?"b":"r"):PIKA_LOOK(st.human==="r"?"b":"r")),oppHello:OT.hi,oppWin:OT.win,oppLose:OT.lose,...(typeof bhParkEx==="function"?bhParkEx(st):null),...(typeof bhOrbEx==="function"&&!(typeof bhIs==="function"&&bhIs(st))?bhOrbEx(st):null),...(typeof gxParkEx==="function"?gxParkEx(st):null)});   /* hspx（開發者 11/12）：黑洞星樞棋局換成巨盤模式、黑洞環景（07bh-blackhole.js） */
    if(typeof bhTick==="function")bhTick(st);if(typeof gxTick==="function")gxTick(st);
    if(typeof meGameTalk==="function")meGameTalk(st);   /* 意見回饋 668：你扮演的雲河七星開局、吃子時說一句 */
    if(NPC_HI!==st.id){NPC_HI=st.id;if(pk0&&!st.moves.length&&!st.result)setTimeout(()=>{try{if(PARK&&PARK.host===hb)PARK.v.oppSay(meHi((N&&typeof npcHello==="function"&&npcHello(N))||OT.hi),2.6)}catch(e){}},900);if(N&&typeof npcAskMaybe==="function")npcAskMaybe(N,st,hb)}}   /* 826 追加：園子 3D 已經開著、換一盤新棋時，不只園子路人，每一位對手都開口打招呼 */   /* 意見回饋 658：有羈絆的女棋手打招呼換成新台詞；開局偶爾來委託（小卡，不打斷對局） */
  let lastN=null;   // 上一次畫的步數：步數剛好多一步才秀開局名（重新整理、開新局不秀）
  // 意見回饋 274：擂台賽下到結束前只能在公園裡（不能切回棋盤模式）；結束後按鈕恢復
  let arenaLock=null,jKey=null,renderSwitched=false;
  function render(s){
    if(!practicePage&&s.practice&&!renderSwitched){renderSwitched=true;api("/play/open",openArgs()).then(render).catch(e=>toast(e.message));return}
    if(practicePage&&!s.practice){if(!renderSwitched&&(s.others||[]).some(o=>o.kind==="practice")){renderSwitched=true;api("/play/switch",{kind:"practice"}).then(render).catch(e=>toast(e.message));return}
      navReplace("#/cpu");return}   /* 在練習頁按了「新局」：開的是挑戰電腦，換到挑戰電腦頁 */
    /* 意見回饋 413：在這頁開出了別的模式的棋（例如舊的按鈕），換到那個模式的網址，不在這一頁畫 */
    if(opened&&!practicePage&&KIND(s)!==MODE){navReplace(MODE_URL[KIND(s)]||"#/cpu");return}
    /* 意見回饋 342：擂台的棋，公園一定是那個擂主的朝代（例如選過別的朝代公園，回來下擂台也會換回來） */
    if(s.arena&&ARENA[s.arena]&&!s.result&&store.get("era","classic")!==s.arena){if(typeof shipEra==="function"&&!eraLocked(s.arena)){shipEra(s.arena);toast(`🏯 ${eraLabel(s.arena)}擂台還有一盤沒下完，星槎也停到${eraLabel(s.arena)}`)}else{store.set("era",s.arena);try{applyEra()}catch(e){}}}   /* 意見回饋 697：換朝代時 era 和星槎停靠一起改；已經下完的別朝擂台那盤不換朝代（不然進擂台就被帶走） */
    /* 回饋 838（開發者 11/9 選：全模式中斷接續）：園子路人那盤換回開局時的那一朝（跟上面擂台一樣；07m4-resume.js rsParkEra，舊存檔沒記就不動） */
    {const pe=s.journey==="park"&&!s.result&&typeof rsParkEra==="function"?rsParkEra(s.id):null;if(pe&&ARENA[pe]&&store.get("era","classic")!==pe){if(typeof shipEra==="function"&&!eraLocked(pe)){shipEra(pe);toast(`🌳 ${eraLabel(pe)}園子還有一盤沒下完，星槎也停到${eraLabel(pe)}`)}else{store.set("era",pe);try{applyEra()}catch(e){}}}}
    if(!pHint&&!s.result){const H=store.get("rsHint",null);if(H&&H.id===s.id&&H.n===s.moves.length)pHint=H}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：讀回用掉的提示棋黃框 */
    const n0=lastN;st=s;lastN=s.moves.length;if(lastN>(n0||0))setTimeout(()=>repWarn(st,st.human),700);   /* 開發者 11/11 選規劃書方案 01 */if(typeof rsTouch==="function")try{rsTouch(s)}catch(e){}   /* 對局中途可接續：記下最後動到的時間（07m4-resume.js） */
    PARK_LK=!!s.arena;if(s.arena&&!s.result&&!parkOn()){store.set("park3d",true);setTimeout(()=>{draw();topBar()},0)}/* 意見回饋 319：朝代擂台的棋一律在公園 3D 裡 */if(!st.legal.some(([f])=>f===sel))sel=-1;
    const lk=!!(st.arena&&!st.result);if(lk&&!parkOn())store.set("park3d",true);PARK_J=st.journey||null;const pr=!!st.practice;if(pr!==PARK_OFF){PARK_OFF=pr;arenaLock=null}
    if(lk!==arenaLock||(st.journey||null)!==jKey){arenaLock=lk;jKey=st.journey||null;topBar()}draw();try{lvWatch(st,v)}catch(e){}pmFire();   /* 第 12 輪 F3：輪到你、有排好的預走就走出 */
    if(!st.result&&!st.practice&&st.id&&st.moves.length<=(st.human==="b"?1:0)&&(st.board||[]).filter(Boolean).length>=32&&KJ_LAST!==st.id){   /* hspx 開發者 11/13「黑洞因為是殘局了，不應該再出現開頭通用的開局動畫」（序局黑洞 BHX_FEN）：從殘局開始的盤（第 0、1 步就不到 32 子）不播開局特效 */KJ_LAST=st.id;loadKaiju();const kj=()=>kaijuFx(bd.svg,"r");if(parkOn())kjWait(kj);else setTimeout(kj,350)}   /* 意見回饋 416：開局特效 */
    if(n0!=null&&lastN===n0+1&&!st.practice){const cue=openingCue(st.moves);if(cue)setTimeout(()=>openFx(bd.svg,cue[1],cue[0]),350)}
    const lv=st.levels[st.level-1]||{},me=st.human,bot=opp(me);
    const CR=st.cpuRate||{};paintSeg(modeOf(st));if(!st.ranked&&st.level&&!st.practice&&!st.journey)store.set("cpuLevel",st.level);   /* 11/12 星系地面工作階段回報：旅程關卡（黑洞星系、石桌往事）的級數是關卡自己定的，不能記成你選的難度——玩過權星（固定 18 級）後 bhLevel 讀到 18，之後每個星系都變 18 級 */
    // 對手列右邊：目前的段位／難度，點了開「開新局」選單（換難度、換紅黑）
    const JP=(()=>{const L=lvPlayOf(st),k=(L&&L.lvp.opp)||(String(st.journey||"").startsWith("char:")?st.journey.slice(5):null);return k&&JCHAR[k]?{...JCHAR[k],say:JCHAR[k].hi,img:`data/journey/char_${k}_idle.webp`}:innAnyAct(st.journey)})(),NP=parkNpcOf(st)||JP,top=(NP?npcHTML(bot,NP,(JP&&NP===JP?(NP.name&&NP.name===(innAnyAct(st.journey)||{}).name?"驛站的棋友・":"石桌往事・"):"園子裡的路人棋友・")+(lv.desc||""))   /* 意見回饋 530：驛站的對手不是「石桌往事」 */:(H=>zgIs(st)?(zgCss(),zgAvHTML(H)):H)(playerHTML(bot,st.arena&&ARENA[st.arena]?`🏯 ${ARENA[st.arena].name}`:cpuOppName(st),st.arena&&ARENA[st.arena]?`${eraLabel(st.arena)}擂主${st.arena==="classic"?"・職業頂尖":""}`:String(st.journey||"").startsWith("bh:")?"黑洞星盤・不計分":String(st.journey||"").startsWith("gx:")?"幻譜星門・不計分":st.ranked?"🥇 晉級賽":lv.desc||"練功房")))   /* 11/10 開發者：電腦對手叫「幻影棋客」，不再顯示 Pikafish */+
      `<button class="cpu-chip${st.ranked?" rk":""}" aria-label="${st.ranked?"段位與開新局":"換難度"}"><span><b>${st.ranked?"🏅 "+esc(rkTw(st.rkName||CR.rank||"")):"第 "+st.level+" 級"}</b><small>${st.ranked?(CR.pts||0)+" 分":esc(rkTw(lv.name||""))}</small></span><i>›</i></button>`;
    const pT=v.querySelector("#pTop");if(pT.dataset.h!==top){pT.dataset.h=top;pT.innerHTML=top}
    /* 11/13 開發者：開頭黑洞序局（BHX_ID）名牌一律寫「你」，不用存檔裡前一次的角色名（也不放角色頭像：playerHTML 只在名字＝meName() 時放） */
    const bt=playerHTML(me,typeof BHX_ID!=="undefined"&&st.journey===BHX_ID?"你":meCall(),PLAYER[me]+(st.ranked&&CR.next?`・再 ${CR.toNext} 分升 ${CR.next}`:""));
    const pB=v.querySelector("#pBot");if(pB.dataset.h!==bt){pB.dataset.h=bt;pB.innerHTML=bt}
    v.querySelector("#pTop").classList.toggle("on",!st.result&&st.turn===bot);v.querySelector("#pBot").classList.toggle("on",!st.result&&st.turn===me);
    v.querySelector("#evf").style.width=evPct(st.eval&&st.eval.v)+"%";evMark(v,st.eval?st.eval.v:null);   /* 11/11 UI-11 */
    /* 意見回饋 749（開發者）：錯棋重練的狀態列一直閃——每次輪詢（1.5 秒）都重寫 #stat 的文字，「」裡的著法（藍色可點的 .mvt，250 毫秒後才由 mvtWrap 加回）和 🔁 圖示（emoWalk）被洗掉又加回。
       改成先在 S2 算好要顯示的文字和 hot／wrap，跟上次寫進去的一樣就不動 DOM */
    const s2=v.querySelector("#stat"),S2={textContent:"",cls:{},classList:{add:(...a)=>a.forEach(k=>{S2.cls[k]=1}),toggle:(k,on)=>{if(on)S2.cls[k]=1;else delete S2.cls[k]}},after:x=>s2.after(x)};{const pa=v.querySelector("#pAct");if(pa&&!st.practice&&!pa.hidden)pa.hidden=true}
    if(!st.result&&st.repetition&&st.repetition.pending){S2.textContent=st.repetition.why;const pk=(st.id||"")+"|"+st.moves.length;if(repAsked!==pk){repAsked=pk;setTimeout(()=>{if(!st||st.result||!(st.repetition&&st.repetition.pending))return;   /* 開發者 11/11 選「人機遇待核給和局／悔棋」 */
      modal(`<div class="em">⚖️</div><h2>循環待核</h2><p>${esc(st.repetition.why||"這個循環裁判沒辦法自動判。")}</p><p class="muted" style="font-size:13px">跟電腦下沒有人工裁判，你可以直接選和局，或退回你上一步之前換一步走。</p><p style="font-size:13.5px;text-align:left;line-height:1.7">🤝 同意和局：這盤記一盤和局${st.ranked?"（晉級賽照和局算分）":""}。<br>↶ 悔一步變著：退回你上一步再換一步，不算用悔棋，也不影響「我的棋力」。</p>`   /* 開發者 11/11 選 ChatGPT UI-13：寫清楚兩個選擇的後果（local.js /play/repdraw＝playEnd 和局、晉級賽 cpuRateApply；/play/repundo 不加 undoN） */,[["🤝 同意和局",()=>post("/play/repdraw")],["↶ 悔一步變著",()=>post("/play/repundo")],["繼續下",null]])},500)}}else if(st.msg)S2.textContent=st.msg;else if(st.result)S2.textContent=st.result.why;
    else if(st.thinking)S2.textContent=cgT("game.thinking","🤔 思考中…")+(typeof pmvLabel==="function"?pmvLabel(st):"");   /* 第 12 輪 F3：排了預走就寫「⏳ 已預走」 */   /* Gemini 評估 11/8（介面圖示化）：狀態列短字加圖示；誰在想看上面那排亮起來的頭像 */
    else{S2.textContent=st.check>=0?cgT("game.check","⚠ 被將軍！"):st.hint?"💡 提示："+st.hint.cn:cgT("game.yourMove","👉 輪到你")+(st.eval?`・${evt(st.eval.v)}`:"");S2.classList.toggle("hot",st.check>=0||!!st.hint)}
    if(st.practice&&!st.result&&!st.msg&&!(st.repetition&&st.repetition.pending))practiceBar(S2);
    if(s2.dataset.t!==S2.textContent){s2.dataset.t=S2.textContent;s2.textContent=S2.textContent}
    for(const k of["hot","wrap"])if(s2.classList.contains(k)!==!!S2.cls[k])s2.classList.toggle(k,!!S2.cls[k]);
    ruleNote(v,st);asstNote(v,st);
    /* 11/11 笑面掌櫃：開局、玩家妙著／失著、領先落後、過 60 手時開口（07m3 zgWatch）；3D 園子開著就在園子裡說 */
    if(zgIs(st)){const hb=v.querySelector("#bbox"),inP=!!(parkOn()&&PARK&&PARK.host===hb);zgWatch(st,t=>{if(inP)PARK.v.oppSay(t,3);else toast("🧮 "+OPT_ZG.name+"：「"+t+"」")},inP)}
    renderStrip(v.querySelector("#strip"),st.moves,st.moves.length-1);
    acts.undo.disabled=st.ranked||!st.moves.some(m=>m.by===st.human);   /* 意見回饋 597：擂台也能用悔棋符 */
    {const cpuK=KIND(st)==="cpu";acts.bag.hidden=!!st.practice||cpuK;acts.undo.hidden=cpuK;   /* 11/10 開發者「跟電腦或線上不能使用寶物」：挑戰電腦（晉級賽、練功房）不放寶物和悔棋（悔棋符也是寶物）；擂台、石桌往事照舊 */
      if(!st.practice&&!acts.undo.disabled)acts.undo.innerHTML='<span class="ic">↶</span>'+(undoLeft()?cgT("game.undoN","悔棋（"+undoLeft()+"）",{n:undoLeft()}):cgT("game.undo","悔棋"));else acts.undo.innerHTML='<span class="ic">↶</span>'+cgT("game.undo","悔棋")}   /* 意見回饋 380：電腦還在想也能悔棋；382：朝代擂台不能悔棋 */
    acts.resign.hidden=!!st.result;acts.review.hidden=!st.result;acts.peek.hidden=!(st.blind&&!st.result);acts.setup.hidden=!!(st.blind&&!st.result);if(st.blind)peekLbl();
    /* 開發者 11/11「下一盤目標」：跟電腦的新一盤開始時提示一次上盤留下的目標 */
    if(!st.result&&!st.practice&&KIND(st)==="cpu"&&st.id&&typeof ngGet==="function"){const g=ngGet();if(g&&g.from!==st.id&&g.shown!==st.id){store.set("nextGoal",{...g,shown:st.id});setTimeout(()=>toast("🎯 本盤目標："+NG_TXT(g)),900)}}
    if(st.result&&shownResult!==JSON.stringify(st.result)+st.moves.length){shownResult=JSON.stringify(st.result)+st.moves.length;const xp0=store.get("xp",0);try{journeyGameEnd(st)}catch(e){}try{if(typeof shipGameDone==="function")shipGameDone(st)}catch(e){}try{if(typeof chdGameEnd==="function")chdGameEnd(st,MODE)}catch(e){}   /* 意見回饋 774：千秋起手式、七星破擂（07q-chardiff.js） */
      {const ud=undoDrop(st);if(ud)setTimeout(()=>{vibrate([20,40,60]);toast(ud)},1200)}
      /* 意見回饋 376：結果視窗寫出這盤的修為變化（石桌往事、驛站、擂台、挑戰電腦都一樣），不再只靠一閃而過的小提示 */
      const xpD=store.get("xp",0)-xp0,XI=xpInfo(),XPR=xpD>0?`<div class="xpres">✨ 修為 <b>+${xpD}</b><small>Lv ${XI.L}・${esc(XI.title)}${XI.need?`・${XI.rest}／${XI.need}`:""}</small><div class="st-bar"><i style="width:${XI.need?Math.round(XI.rest*100/XI.need):100}%"></i></div></div>`:"";
      /* 開發者 11/11 選 v3 規劃書 B08：結算視窗多一行「這盤先看這一步」——挑我方評語是失著／敗著裡掉最多分的那一步，點了直接打開這盤棋譜停在那一步。
         評語是背景慢慢算的，視窗先留一個空位（hidden），每 1.5 秒問一次 /play/state；全部算完、或等了 6 秒就顯示目前最嚴重的一步，之後算出更嚴重的再換。
         沒有失著、敗著就什麼都不顯示（不硬湊一步）；練習題、錯棋重練、劇情對決的結算視窗不放 */
      /* ChatGPT 評審 11/11（失著的具體後果）：mf＝主流程（主要按鈕已經是「看懂這盤最關鍵的一步」）——不放按鈕，只在那一步（mflPick 挑的）有分析線支持的後果時，
         加一行「⚠ 第 N 步「…」：這手讓對方下一手可以吃你的車（車8進3）。」；一般的「這盤先看這一步」按鈕裡也多一行同樣的後果（05-settings mflRisk，沒有就不寫） */
      const resLook=mf=>{if(st.practice||!st.id)return"";const gid=st.id,hu=st.human,lxNow=mflLx(st);let n=0,seen=false;   /* lxNow：ChatGPT 改善單 T01「從這步重下」用同一個難度 */
        const pick=ms=>{if(mf){const r=mflPick(ms,hu);return{b:r.b&&(r.b.q==="失著"||r.b.q==="敗著")?r.b:null,all:r.all}}
          let b=null,all=true;ms.forEach((m,i)=>{if(m.by!==hu)return;const q=qNow(m);if(!q)all=false;if((q==="失著"||q==="敗著")&&(!b||(+m.loss||0)>b.loss))b={ply:i+1,cn:m.cn||"",q,loss:+m.loss||0,bc:m.bc||"",bm:m.bm||"",rr:m.rr,bmt:m.bmt}});return{b,all}};
        const show=b=>{const e=document.querySelector(".modal.res .reslook");if(!e)return false;seen=true;const rk=typeof mflRisk==="function"?mflRisk(null,hu,null,b):"";if(e.dataset.ply===b.ply+"|"+rk)return true;e.dataset.ply=b.ply+"|"+rk;
          if(mf){if(!rk){e.hidden=true;return true}e.textContent=`⚠ 第 ${b.ply} 步${b.cn?"「"+b.cn+"」":""}：${rk}`;e.style.cssText="width:100%;max-width:300px;box-sizing:border-box;margin:8px auto 2px;font-size:14px;line-height:1.6;text-align:left";e.hidden=false;return true}
          e.innerHTML=`<span>🔎 這盤先看這一步：<b>第 ${b.ply} 步${b.cn?"「"+esc(b.cn)+"」":""}</b>（${b.q}）${rk?`<br><small>⚠ ${esc(rk)}</small>`:""}</span><span style="flex:none;color:var(--accent);font-weight:900">看 ›</span>`;
          e.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;max-width:260px;margin:10px auto 4px;padding:10px 12px;border:1px solid var(--accent);border-radius:12px;background:var(--bg);color:inherit;font:inherit;font-size:14.5px;line-height:1.5;text-align:left;cursor:pointer";e.hidden=false;
          e.onclick=()=>{const m=e.closest(".modal");if(m)m.remove();vibrate(5);mflKeySet(gid,hu,b,lxNow);review(false,gid,{ply:b.ply-1,why:"這盤先看這一步（"+b.q+"）",mfl:1})};return true};   /* ChatGPT 改善單 T01：跟主流程同一個關鍵步模式（停在那一步之前、兩條箭頭、白話為什麼、從這步重下） */
        const tick=()=>{n++;const has=!!document.querySelector(".modal.res .reslook");if(has)seen=true;if((seen&&!has)||(!seen&&n>5))return;
          api("/play/state").then(s=>{if(!s||s.id!==gid)return;const r=pick(s.moves||[]);if(r.b&&(r.all||n>=4))show(r.b);if(n<14&&!(r.all&&(!r.b||seen)))setTimeout(tick,1500)}).catch(()=>{})};
        setTimeout(tick,300);return mf?`<div class="reslook" role="status" hidden></div>`:`<button type="button" class="reslook" hidden></button>`};
      /* 開發者 11/11「下完一局接著看到我的戰績或成長變化（diff value）」：結算視窗多一塊「這盤之後」——
         ①戰績（馬上有）：這一級／晉級賽幾勝幾負、跟電腦的總勝率前→後（晉級賽另記在 cpuRate，record 的第 0 級是晉級賽的重複，不重算）；
         ②成長（等 Pikafish 把我方每一步評完，每 2 秒問一次，最多約 90 秒）：這盤每步準確度跟最近平均比、我的棋力綜合前→後、變最多的一項（04-stats skillDiff）。
         用過提示或悔棋的那盤照我的棋力規則不算，直接說；練習題、錯棋重練不放 */
      const resGrow=()=>{if(st.practice||!st.id||st.blind)return"";const gid=st.id,hu=st.human,res=!st.result.w?"d":st.result.w===hu?"w":"l",UP="#2e8b57",DN="var(--red,#c8102e)",
        dl=(a,b,u)=>{if(a==null||b==null)return"";const d=b-a;return`<b style="color:${d>0?UP:d<0?DN:"var(--muted)"}">${d>0?"+":d<0?"−":"±"}${Math.abs(d)}${u||""}</b>`};
        let rec="";if(KIND(st)==="cpu"&&!(st.ranked&&st.moves.length<2)){const C=st.cpuRate||{};let W=C.w||0,L=C.l||0,D=C.d||0;for(const[k,r]of Object.entries(st.record||{})){if(k==="0")continue;W+=r.w||0;L+=r.l||0;D+=r.d||0}
          const N=W+L+D,pc=(w,n)=>n>0?Math.round(w*100/n):null,p0=pc(W-(res==="w"?1:0),N-1),p1=pc(W,N),me=st.ranked?C:(st.record||{})[st.level]||{};
          rec=`<div>📊 ${st.ranked?"晉級賽":"第 "+st.level+" 級"}：${me.w||0} 勝 ${me.l||0} 負${me.d?" "+me.d+" 和":""}（這盤 +1 ${res==="w"?"勝":res==="l"?"負":"和"}）${p1!=null?`<br>跟電腦總勝率 ${p0!=null&&p0!==p1?p0+"% → ":""}<b>${p1}%</b>${p0!=null&&p0!==p1?" "+dl(p0,p1):""}`:""}</div>`}
        let n=0,seen=false;const box=()=>document.querySelector(".modal.res .resgrow"),
        ngH=(c,acc,ref)=>{if(!c||KIND(st)!=="cpu")return"";let h="";const g0=ngGet(),j=g0&&g0.from!==gid&&g0.shown===gid?ngJudge(g0,c,acc):null;   /* 下一盤目標（04-stats ngPick／ngJudge） */
          if(j)h+=`<br>🎯 上盤目標「${NG_TXT(g0)}」：<b style="color:${j.ok?UP:DN}">${j.ok?"✅ 達成":"差一點"}</b>（這盤${j.got}）`;
          const nx=ngPick(c,ref!=null?ref:acc);if(nx){store.set("nextGoal",{...nx,from:gid,at:Date.now()});h+=`<br>🎯 下一盤目標：<b>${NG_TXT(nx)}</b>`}else if(j)store.set("nextGoal",null);return h},
        paint=(d,why,c)=>{const e=document.querySelector(".modal.res .resgrow .rg-sk");if(!e)return;e.classList.remove("muted");
          if(why||!d){e.classList.add("muted");e.textContent=why||"這盤還沒評完等，評完會算進「我的棋力」。";return}
          if(d.hu){e.classList.add("muted");e.textContent=`這盤用過提示或悔棋，不算進「我的棋力」${d.acc!=null?`（這盤每步準確度 ${d.acc}）`:""}。`;return}
          /* 統計審查：差異在正常起伏內就說「跟平常差不多」、「持平」，明顯的才上色（04-stats skillDiff 的 z、dT、big）。數學修正 11/11：五邊形改指數加權後 dT＝t1−t0（同一個數字），不再有「這盤比平常好、綜合卻下降」 */
          const zw=d.z==null?"":d.z>=2?`<b style="color:${UP}">明顯比平常好</b>`:d.z>=1?`<span style="color:${UP}">比平常好一點</span>`:d.z<=-2?`<b style="color:${DN}">明顯比平常差</b>`:d.z<=-1?`<span style="color:${DN}">比平常差一點</span>`:"跟平常差不多";
          e.innerHTML=`📈 這盤每步準確度 <b>${d.acc==null?"—":d.acc}</b>${zw?`・${zw}（最近平均 ${d.avg}）`:""}<br>`+
            (d.t0==null?`我的棋力綜合 <b>${d.t1==null?"—":d.t1}</b>（第一盤評好等的棋）`:`我的棋力綜合 <b>${d.t1==null?"—":d.t1}</b>・${d.dT==null||Math.abs(d.dT)<2?"持平":`這盤對綜合是<b style="color:${d.dT>0?UP:DN}">${d.dT>0?"加分":"扣分"}</b>`}${d.big?`（主要是${d.big.k}${d.big.d>0?"進步":"退步"}）`:""}`)+ngH(c,d.acc,d.avg)},
        tick=()=>{n++;const b=box();if(b)seen=true;else if(!seen){if(n<40)setTimeout(tick,700);return}   /* hspx P0 開發者 11/13「點下我的棋力沒反應」：結果視窗要等將死動畫播完才出來，第一次 tick（0.6 秒）時還不在，查完狀態就結束、不再排下一次——按鈕沒綁上、分析文字也停在「正在評這盤」。視窗還沒出來就每 0.7 秒再等（最多約 28 秒）；按鈕改用下面的全域點擊委派 */
          if((seen&&!b)||(!seen&&n>8))return;
          api("/play/state").then(s=>{if(!s||s.id!==gid)return;const mine=(s.moves||[]).filter(m=>m.by===hu);if(!mine.length)return paint(null,"這盤沒走幾步，不算進「我的棋力」。");
            if(mine.every(m=>qNow(m)))return skillDiff(gid).then(d=>paint(d,null,ngCount(s.moves,hu))).catch(()=>paint(null));
            /* ChatGPT 評審 11/11（未評完的狀態）：寫出我方還有幾步在分析（含缺 PV 等重評的），每 2 秒更新；等太久就說打開檢討會接著分析（10-db pendFill），不寫成正著或空白 */
            const left=mine.filter(m=>!qNow(m)).length,sk=document.querySelector(".modal.res .resgrow .rg-sk.muted");
            if(n<45){if(sk)sk.textContent=`📈 還有 ${left} 步在分析，評完就知道棋力變化…`;setTimeout(tick,2000)}else paint(null,`📈 還有 ${left} 步還沒分析完，打開「📊 檢討」會接著分析；評完會算進「我的棋力」。`)}).catch(()=>{})};
        setTimeout(tick,600);
        return`<div class="resgrow" style="width:100%;max-width:300px;box-sizing:border-box;margin:8px auto 2px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;font-size:14px;line-height:1.7;text-align:left">${rec}<div class="rg-sk muted">📈 電腦分析（Pikafish）正在評這盤，評完就知道棋力變化…</div><button type="button" class="rg-go" style="display:block;margin:2px 0 0 auto;padding:2px 0;border:0;background:none;color:var(--accent);font:inherit;font-size:13.5px;font-weight:900;cursor:pointer">看我的棋力 ›</button></div>`};
      /* ChatGPT 改善單 T01（開發者 11/11 核准）：首頁「快下一盤」（FH，不算段位的快局）下完、我方走過 3 步以上——結算視窗的主要按鈕改成「🔎 看懂這盤最關鍵的一步」（mflOpen），
         上面那顆「這盤先看這一步」小鈕就不重複放；「再來一局」「去茶肆正式上桌」退成次要。從首頁接著下的晉級賽、盲棋、其他模式照舊 */
      /* ChatGPT v6 重評（11/11）：一般挑戰電腦（含晉級賽、練功房）結算也要一鍵看關鍵著——不再限首頁快局；盲棋、練習、故事、擂台照舊 */
      const MF=!st.practice&&!st.blind&&!st.journey&&!st.arena&&st.moves.filter(m=>m.by===st.human).length>=3;
      const RLK=resLook(MF),RGW=resGrow(),XPL=XPR+RLK+RGW;   /* MF：只放「這一步的後果」那一行（resLook 的 mf） */
      /* 開發者 11/11 選 ChatGPT 14 號方案 9「快局結算給下一步」：橋上快局下完，結算視窗用一句話邀請去茶肆（贏了打晉級賽、輸了去練功房挑級數），配一顆可以不理的「去茶肆」；不另外跳視窗 */
      const QKH=typeof hbHubN==="function"?hbHubN():"茶肆",QKN=FH()?`<p style="font-size:14px;margin:8px 0 2px">${st.result.w===st.human?`手感不錯！要不要去${esc(QKH)}打晉級賽，讓這股氣勢算進段位？`:!st.result.w?`要不要去${esc(QKH)}挑個剛好的對手，再來一盤？`:`這盤有點可惜。要不要去${esc(QKH)}練功房，挑剛好的級數再戰？`}</p><p class="muted" style="font-size:12.5px;margin:0">${cgT("res.quickNote","這盤是快速對局，不算段位分。")}</p>`:"";
      const win=st.result.w===st.human,draw0=!st.result.w;vibrate([30,40,30]);if(draw0&&parkOn()&&PARK&&PARK.host===v.querySelector("#bbox")){const dl=oppTalk(st,optJk(st),parkNpcOf(st)).draw;setTimeout(()=>{try{PARK.v.oppSay(dl,3)}catch(e){}},1600)}   /* 826 追加：和棋時對面的人也說一句（園子 3D 原本只有我方說「和棋，不錯喔！」） */
      if(st.result.w&&/將死|困斃/.test(st.result.why||"")&&!(typeof blzSkip==="function"&&blzSkip("killFx"))){const loser=st.result.w==="r"?"b":"r",k=st.board.indexOf(loser==="r"?"K":"k");if(k>=0&&!(typeof bhMateFx==="function"&&bhMateFx(st,k))){MODAL_HOLD=Date.now()+2700;killFx(bd.svg,win,st.result.why,k,st.human==="b",{side:st.result.w})}}try{window.dispatchEvent(new CustomEvent("xq-result",{detail:win?"win":draw0?"draw":"lose"}))}catch(e){}
      /* 意見回饋 607（RPG 專家建議）：結果視窗統一成「主要按鈕一顆（整排）＋次要一排：📊 檢討・🏠 首頁・看看棋盤」；
         📊 檢討＝原本的「賽後報告」＋「檢討這盤」合併（打開時直接附報告）；看看棋盤＝原本的「關閉」；back＝[字, 動作]：次要列上面多一排（回驛站／園子、去車庫…） */
      const resBtns=(main,back,noRev,back2)=>[...(main?[main]:[]),...(back?[[back[0],back[1],"wide"]]:[]),...(back2?[[back2[0],back2[1],"wide"]]:[]),...(noRev?[]:[[cgT("res.review","📊 檢討"),()=>review(true,st&&st.id),true]]),[cgT("res.home","🏠 首頁"),()=>goHome(),true],[cgT("res.viewBoard","看看棋盤"),null,true]];
      if(st.practice&&st.practice.drill){const P0=st.practice;
        modal(`<div class="em">${win?"🎯":draw0?"🤝":"💪"}</div><h2>${win?"練習成功！":draw0?"和局":"這題沒下贏"}</h2><p class="muted">${esc(P0.title)}（局面取自 ${esc(P0.date||"")} ${esc(P0.opp||"")}）・不算戰績</p>`,
          resBtns(["再練一題 ›",()=>startDrill(P0.kind,P0.lv)]),"res");return}
      if(st.practice){const d=store.get("redoDone",{})[st.practice.key],T1=st.practice.t01;
        /* ChatGPT 改善單 T01／G01（開發者 11/11 核准）：主流程的「從這步重下」下完——主要按鈕「🧠 練一題同樣的棋理」（G01 示範，回來還是這一頁），
           次要「♟ 再下一盤快局」（同一個難度、不算段位；有沒下完的挑戰電腦就先接那盤）、「‹ 回到剛才那一步」（關鍵步那一頁）。按「練會了，結束這題」也落在這裡 */
        if(T1){const ok=!!(d&&d.ok),why=ok&&/認輸/.test(st.result.why||"")?"":esc(st.result.why)+"・";
          modal(`<div class="em">${ok?"✅":win?"🏆":draw0?"🤝":"💪"}</div><h2>${ok?"這步練會了！":win?"你贏了！":draw0?"和局":"這盤輸了"}</h2><p class="muted">${why}從這步重下（不算段位，也不算進「我的棋力」）</p>${ok?"":'<p style="font-size:14px">沒關係，回去再看一次那一步，或先練一題同樣的棋理。</p>'}`,
            resBtns(["🧠 練一題同樣的棋理 ›",()=>mflDemo(T1.tag,"#/redo/play")],["♟ 再下一盤快速對局",()=>mflQuick(st.human,T1.lx)],true,T1.back?["‹ 回到剛才那一步",()=>goUp(T1.back)]:null),"res");return}
        modal(`<div class="em">${win?"🏆":draw0?"🤝":"💪"}</div><h2 data-i18n="res.${win?"win":draw0?"draw":"lose"}">${win?"你贏了！":draw0?"和局":"這盤輸了"}</h2><p class="muted">${esc(st.result.why)}・錯棋重練（不算戰績）</p>${d&&d.ok?'<p>✅ 這步已經練會了</p>':""}`,
          resBtns(["回到錯棋列表 ›",()=>goUp("#/redo")],null,true),"res");return}   /* 意見回饋 607：退回錯棋列表那一層，不往前推一頁 */
      if(st.ranked){const R=st.rate;
        modal(`<div class="em">${win?"🏆":draw0?"🤝":"💪"}</div><h2 data-i18n="res.${win?"win":draw0?"draw":"lose"}">${win?"你贏了！":draw0?"和局":"這盤輸了"}</h2><p class="muted">${esc(st.result.why)}・晉級賽（${esc(rkTw(st.rkName))}）</p>`+
          (R?`<p style="font-size:18px;font-weight:900">積分 ${R.d>0?"+"+R.d:R.d<0?R.d:"±0"} → ${R.pts} 分${R.rank!==R.was?`<br><span style="color:var(--accent2)">${R.d>0?"🎉 升為":"降為"} ${esc(R.rank)}</span>`:""}</p>`:'<p class="muted">雙方還沒各走一步，這盤不計分</p>')+RLK+RGW,
          resBtns([cgT("res.rankedAgain","再挑戰一盤 ›"),()=>api("/play/new",{human:st.human,ranked:true}).then(render).catch(e=>toast(e.message))]),"res");return}
      if(MODE==="arena"&&ARENA[st.arena]){const A=ARENA[st.arena],Z=st.stamp;
        if(win&&Z&&Z.first)setTimeout(()=>stampFx(st.arena),MODAL_HOLD>Date.now()?MODAL_HOLD-Date.now():300);
        const t=arenaTitle(),newT=win&&Z&&Z.first&&ARENA_TITLES.some(([k])=>k===Z.total);
        modal(`<div class="em">${win?"🏯":draw0?"🤝":"💪"}</div><h2>${win?`擊敗${esc(A.name)}！`:draw0?"和局":"擂主守住了擂台"}</h2><p class="muted">${esc(st.result.why)}・${esc(eraLabel(st.arena))}擂台</p>`+
          `<p style="font-style:italic">「${esc(win?A.lose:A.win)}」</p>`+
          (win?(Z&&Z.first?`${(typeof sealLitHTML==="function"&&sealLitHTML(st.arena,"arena"))||`<p style="font-size:17px;font-weight:900">${sealHTML(st.arena,true)} 打贏了 ${Z.total} / 13 位擂主</p>`}${newT?`<p style="color:var(--accent);font-weight:900">🎉 得到稱號「${esc(t)}」</p>`:""}`:'<p class="muted">這一朝千秋印的「擂台」那一邊已經亮了，這盤當作練功。</p>'):'<p class="muted">和局、輸棋，千秋印不會亮，再挑戰一次吧！</p>')+XPL,
          /* 意見回饋 607：贏了主要按鈕是「下一位擂主 ›」（照集章簿順序找還沒蓋章的朝代，打開他的擂主卡），全部蓋完才是看集章簿；輸、和是再挑戰一次 */
          (()=>{const SS=arenaStamps(),nf=f=>ARENA_ORDER.find(k=>k!==st.arena&&ARENA[k]&&!SS[k]&&f(k)),nx=win?nf(k=>!eraLocked(k))||nf(()=>true):null,   /* 意見回饋 697：先找停靠過的；別朝的擂主卡只能看，要挑戰得回星槎開過去 */book=["🏮 看千秋印譜",()=>stampBook(arenaStart)];
            return resBtns(win?(nx?["下一位擂主 ›",()=>arenaSheet(nx,arenaStart)]:book):["再挑戰一次 ›",()=>arenaStart(st.arena,st.level)],win&&nx?book:null)})(),"res");return}
      /* 意見回饋 413：石桌往事（含守關）的結果：再挑戰同一關／同一位對手，或回雲河棋路、驛站、園子；不會變成挑戰電腦，也不是擂台 */
      if(MODE==="journey"){const j=st.journey,s0=jFindStage(j);
        if(String(j||"").startsWith("bt:")&&typeof battleResultModal==="function"){battleResultModal(st,win,draw0,XPR);return}
        if(String(j||"").startsWith("bh:")&&typeof bhResultModal==="function"){bhResultModal(st,win,draw0,XPR);return}
        if(String(j||"").startsWith("gx:")&&typeof gxResultModal==="function"){gxResultModal(st,win,draw0,XPR);return}   /* 幻譜星門：星印、玉宿下一局、北辰第二盤、回星圖 */   /* hspx（開發者 11/12）：黑洞星樞棋局——下完一律「星槎回航」，回到原本要停靠的那一站 */   /* 古戰場的讓子對弈：戰役印、下一場、再下一盤（同樣的讓子） */
        const NR=parkNpcOf(st);
        modal(`<div class="em">${win?"🏆":draw0?"🤝":"💪"}</div><h2 data-i18n="res.${win?"win":draw0?"draw":"lose"}">${win?"你贏了！":draw0?"和局":"這盤輸了"}</h2><p class="muted">${esc(st.result.why)}・🪨 ${esc(jName(j))}${NR?"・"+esc(NR.name)+"（第 "+st.level+" 級）":""}</p>`+(NR?`<p style="font-style:italic">${esc(NR.name)}：「${esc(win?NR.lose:draw0?"和了，改天再下一盤！":NR.win)}」</p>`:"")+XPL,
          (()=>{/* 意見回饋 607：劇情關「回到關卡」、回雲河棋路／驛站／園子都改成退回那一層（goUp），不再往前推一頁；雲河棋路的對弈關贏了，主要按鈕是「📖 下一回 ›」（下一關已經開放才有，做法跟過關畫面的「讀第 N 回」一樣） */
            const bk=["‹ 回"+jPlace(j),()=>goUp(jBack(j))],again=[s0?"再挑戰這一關 ›":"再下一盤 ›",()=>{shownResult=null;sel=-1;if(s0)jPlay(s0,true);else jAgain(st).then(render).catch(e=>toast(e.message))}];
            if(s0&&s0.t==="lv")return resBtns(["🎴 回到關卡 ›",()=>goUp("#/journey/"+j)]);
            /* 意見回饋 697（開發者 11/6）：園子下完一盤——換一位棋友、同一位再下一盤、回渡口（原本寫「回園子」其實回星槎） */
            if(j==="park")return resBtns(["🔄 換一位棋友",()=>{shownResult=null;sel=-1;jStart("park",{human:"r",level:parkNpcLv(),journey:"park"},()=>{api("/play/state").then(s=>{render(s);const r=store.get("parkNpc",null),n=r&&PARK_NPC.find(x=>x.id===r.id);if(n)toast(`🌳 ${n.name}坐了過來`)}).catch(e=>toast(e.message))},true)}],["⚔ 再下一盤（同一位）",again[1]],false,["‹ 回渡口",()=>upTo("#/port")]);
            if(win&&s0){const Ls=s0.book===2?jStages2():jStages(),i=Ls.findIndex(x=>x.id===s0.id),nx=i>=0&&i+1<Ls.length&&jOpen(Ls,i+1)?Ls[i+1]:null;
              return nx?resBtns(["📖 下一回 ›",()=>{if(nx.book===2)store.set("legBook",2);goUp(SHELF(nx.book===2?2:1),()=>nx.book===2?legendRead2(nx.n):legendRead(nx.n))}],bk):resBtns(bk)}
            return resBtns(again,bk)})(),"res");return}
      modal(`<div class="em">${win?"🏆":draw0?"🤝":"💪"}</div><h2 data-i18n="res.${win?"win":draw0?"draw":"lose"}">${win?"你贏了！":draw0?"和局":"這盤輸了"}</h2><p class="muted">${esc(st.result.why)}・${st.journey?`🪨 ${esc(jName(st.journey))}`:`對手${zgIs(st)?esc(OPT_ZG.name)+"・":""}${st.zgx?esc(ZG_X.name):`第 ${st.level} 級「${esc(rkTw(lv.name||""))}」`}`}</p>`+(zgIs(st)?`<p style="font-size:14px;margin:8px 0 2px">🧮 ${esc(OPT_ZG.name)}：「${esc(win?OPT_ZG.lose:draw0?OPT_ZG.draw:OPT_ZG.win)}」</p>`:"")+XPL+QKN+(st.blind?`<p style="font-size:14px;margin:8px 0 2px">${win?"你在看不見的棋盤上，走出了一盤清清楚楚的勝局。":draw0?"看不見棋子也守成和局，記盤功力不錯。":"這盤棋沒守住，但你已經把棋盤放進心裡了一步。"}</p><p class="muted" style="font-size:12.5px;margin:0">盲棋不算段位、不記通關，也不算進「我的棋力」。</p>`:""),
        (()=>{const up=win&&st.level<18&&!FH()&&!st.zgx,nx=[up?cgT("res.nextLevel","挑戰下一級 ›"):cgT("res.again","再來一局"),()=>api("/play/new",{human:st.human,lx:up?st.level+1:st.level,...(FH()?{ranked:false}:{}),...(st.blind?{blind:true}:{}),...zgArg(zgIs(st)&&!FH()?"zhanggui":"km",!!st.ranked,!!st.zgx&&!FH())})   /* 掌櫃真功夫沒有「下一級」，再來一局照樣是真功夫 */   /* 開發者 11/6 修：等級是細分的 1～18 級，用 lx 傳、上限 18；原本傳 level 會被再換算一次，難度暴跳 */.then(render).catch(e=>toast(e.message))],hub=FH()?["⚔ 去"+QKH+"正式上桌",()=>{location.hash="#/hub/battle"}]:null;
          /* ChatGPT 改善單 T01：快局的主要按鈕＝看懂最關鍵的一步（這盤的編號、執哪一方、難度先記下來，按的時候 st 可能已經換了） */
          if(MF){const gid=st.id,hu=st.human,lx=mflLx(st);return resBtns([cgT("res.keyMove","🔎 看懂這盤最關鍵的一步 ›"),()=>mflOpen(gid,hu,lx)],["♟ "+nx[0],nx[1]],false,hub)}
          return resBtns(nx,hub)})(),"res")}}
  /* ================= ChatGPT 改善單 T01（開發者 11/11 核准）：結算視窗 →「看懂這盤最關鍵的一步」=================
     mflLx：重下用的難度＝這盤的級數（晉級賽照段位名找回同強度的級數；找不到才用錯棋重練原本的第 16 級）。
     mflKeySet：把最關鍵的一步記在 store mflKey，檢討頁（10-db.js）看到這一盤、停在那一步之前就進關鍵步模式。
     mflOpen：等 Pikafish 把我方每步評完（最多約 9 秒，邊等邊提示），用 05-settings mflPick 挑少最多分的那一步，打開這盤的檢討頁停在那一步之前；
       這盤沒有明顯的錯著（都是正著、妙著）就直接打開整盤的賽後報告；換頁了就不跳過去 */
  function mflLx(s){if(!s)return 16;if(s.ranked){const i=(s.levels||[]).findIndex(l=>l.name===s.rkName);return i>=0?i+1:16}return s.level||16}
  function mflKeySet(gid,hu,b,lx){store.set("mflKey",{c:"play",id:gid,ply:b.ply,side:hu,lx,cn:b.cn||"",q:b.q,loss:b.loss,bc:b.bc||"",bm:b.bm||"",...(b.rr?{rr:b.rr,bmt:b.bmt}:{}),at:Date.now()})}   /* rr、bmt：檢討頁存檔還沒有這步評等時，關鍵步說明照樣講得出後果（ChatGPT 評審 11/11） */
  async function mflOpen(gid,hu,lx){const rn=ROUTE_N;let r=null;
    for(let k=0;k<8;k++){let s=null;try{s=await api("/play/state")}catch(e){}if(!s||s.id!==gid)break;r=mflPick(s.moves,hu);if(r.all)break;
      if(!k)toast("🔎 電腦分析（Pikafish）正在評這盤的每一步，馬上好…");await new Promise(z=>setTimeout(z,1200));if(rn!==ROUTE_N)return}
    if(rn!==ROUTE_N)return;
    if(r&&r.b){mflKeySet(gid,hu,r.b,lx);review(false,gid,{ply:r.b.ply-1,why:"這盤最關鍵的一步",mfl:1});return}
    if(r&&r.all&&r.n)toast("👍 這盤沒有明顯的錯著，帶你看整盤的賽後報告");review(true,gid)}
  // 賽後報告：用這一盤自己的編號打開（意見回饋 234：以前拿存檔清單第一筆，存檔還沒寫完或順序不同時會開到別盤）
async function review(rep,id,at){let it=null;for(let k=0;k<12&&!it;k++){try{const d=await api("/db/items?c=play");it=id?d.items.find(x=>x.id===id):d.items[0]}catch(e){}if(!it)await new Promise(r=>setTimeout(r,250))}
  if(!it)return toast("找不到這盤的存檔");if(rep)store.set("openReport","play/"+it.id);if(at)store.set("openAt",{c:"play",id:it.id,ply:at.ply,why:at.why,...(at.mfl?{mfl:1}:{})});   /* ChatGPT 改善單 T01：mfl＝關鍵步模式（10-db.js 不另跳「從第 N 步開始」的小提示） */REVIEW_BACK={id:it.id,h:location.hash};location.hash="#/db/play/"+encodeURIComponent(it.id)}   /* 意見回饋 607：記下從哪一盤去看報告，回來時不要自動開新局 */
  // 錯棋重練：在狀態列提示上次走了什麼，評等出來後告訴你這次有沒有進步（評過的結果記在 redoDone）
  // 錯棋重練：練習起點的盤面（重練開始前的著法擺好）
  function practiceBoard(){const b=parseFen(START);for(const m of st.moves.slice(0,st.practice.base)){b[m.t]=b[m.f];b[m.f]=null}return b}
  // Pikafish 推演：從練習起點往後算一條最佳變化，在小棋盤上一步一步播
  function pvSheet(bc){const b0=practiceBoard(),flip=st.human==="b";
    sheet("電腦推演（Pikafish）",b=>{b.innerHTML='<p class="muted" id="pvm" style="text-align:center;margin:0 0 6px">電腦分析中…（約 3 秒）</p><div id="pvb"></div><div class="pv-ctl"><button class="pill" id="pvp">◀ 上一步</button><button class="pill" id="pvg">▶ 自動播放</button><button class="pill" id="pvn">下一步 ▶</button></div><p id="pvl" style="font-size:14px;line-height:1.7;margin:8px 0 0"></p>';
      const mb=Board(()=>{});b.querySelector("#pvb").append(mb.svg);mb.draw(b0,{flip});
      // 第一步一定是建議的那步（跟提示一致），之後一段一段往後算，接到大約 12 步
      (async()=>{const C=window.XQCore,boards=[b0.slice()],lasts=[null],cns=[];let side=st.human,L=null;
        const push=(f,t)=>{const bb=boards[boards.length-1],cn=C?C.notate(bb,f,t):"";const nb=bb.slice();nb[t]=nb[f];nb[f]=null;boards.push(nb);lasts.push({f,t});cns.push(cn);side=side==="r"?"b":"r"};
        const first=bcMove(b0,st.human,bc||"");if(first)push(first.f,first.t);
        for(let round=0;round<5&&cns.length<12;round++){const d=await api("/an/engine",{board:boards[boards.length-1],side,ms:round?900:2000,multipv:1});const l=(d.lines||[])[0];if(!l)break;if(!L)L=l;
          const before=cns.length;for(const u of(l.pvm||[]).slice(0,12-cns.length)){const f=sqI(u.slice(0,2)),t=sqI(u.slice(2,4));if(!boards[boards.length-1][f])break;push(f,t)}if(cns.length===before)break}
        return{L,boards,lasts,cns}})().then(({L,boards,lasts,cns})=>{if(!L&&cns.length<2){b.querySelector("#pvm").textContent="這個局面算不出來";return}
        let k=0,tm=null;const ev=!L?"":"之後局面："+(L.mate!=null?(L.mate>0?"可以殺棋":"會被殺"):evt(L.vr));   /* 評比循環第 1 輪：局面句跟其他地方同一套白話（00-util evt），不再寫「優勢 1.2 兵」 */
        const show=()=>{mb.draw(boards[k],{flip,last:lasts[k]});b.querySelector("#pvm").textContent=k?"第 "+k+" 步："+cns[k-1]+(k===1?"（電腦建議）":""):"練習起點・按「自動播放」看電腦怎麼下"+(ev?"・"+ev:"");
          b.querySelector("#pvl").innerHTML=cns.slice(0,boards.length-1).map((c,i)=>'<span style="'+(i===k-1?"font-weight:900;color:var(--accent)":"")+'">'+(i+1)+". "+esc(c)+"</span>").join("　")};
        b.querySelector("#pvp").onclick=()=>{clearInterval(tm);k=Math.max(0,k-1);show()};b.querySelector("#pvn").onclick=()=>{clearInterval(tm);k=Math.min(boards.length-1,k+1);show()};
        b.querySelector("#pvg").onclick=()=>{clearInterval(tm);k=0;show();tm=setInterval(()=>{if(!b.isConnected||k>=boards.length-1)return clearInterval(tm);k++;show()},900)};show()}).catch(e=>{b.querySelector("#pvm").textContent="⚠ "+e.message})})}
  /* 意見回饋 607：提示的說法統一；11/11 起平面棋盤是藍色虛線框、園子 3D 是黃圈，用 hintMk()（07-legend.js）照模式說 */
  function practiceBar(s2){const P0=st.practice,m=st.moves[P0.base];
    if(P0.drill){if(st.moves.length>P0.base+1)return;s2.classList.add("hot","wrap");s2.textContent=`🎯 ${P0.title}：輪到你（${PLAYER[st.human]}），想辦法下贏電腦！`;return}
    let pa=v.querySelector("#pAct");if(!pa){pa=document.createElement("div");pa.id="pAct";pa.className="pv-ctl";s2.after(pa)}pa.hidden=true;
    if(st.moves.length>P0.base+2)return;   // 已經往下走了，回到一般狀態列
    s2.classList.add("hot","wrap");
    if(!m){s2.textContent=`🔁 第 ${P0.ply} 步：上次你走「${P0.cn}」是${P0.q}，這次呢？`;return}
    if(!m.q){s2.textContent=`這次走「${m.cn}」，電腦評分中…`;return}
    const all=store.get("redoDone",{}),d=all[P0.key]||{n:0,ok:false},sig=st.moves.length>P0.base?m.f+"-"+m.t:"";
    /* ChatGPT 改善單 T01（開發者 11/11 核准）／v5 R08（錯著重下跟完成標記一致）：「比上次好」要真的比原本那步的評語好才算練會（d.ok）。
       錯棋重練的題目原本都是失著、敗著，穩著、緩著一定比較好，照舊；主流程的最關鍵一步可能本來就是緩著、穩著，再走一樣的不能算練會。原本評語認不得（舊名稱）就照舊 */
    const QO=["妙著","正著","穩著","緩著","失著","敗著"],qi=x=>{const i=QO.indexOf(x);return i<0?9:i},good=["妙著","正著"].includes(m.q),ok=["穩著","緩著"].includes(m.q)&&qi(m.q)<qi(P0.q);
    // 每走一個不同的著法算一次；不是正著、妙著的都算一次「沒找到」
    let nz=false;   /* 卡關主動提示（07c-canju.js stuckNudge）：第 3 次沒找到時，小帥冒出來講一句（黃框照原本第 2 次就亮） */
    if(sig&&d.last!==sig){d.last=sig;d.n++;if(!good){d.fail=(d.fail||0)+1;nz=typeof STUCK_N!=="undefined"&&d.fail===STUCK_N}if(good||ok)d.ok=true;
      /* 意見回饋 301：間隔重複（萊特納盒）：練對升一格，下次在 1、3、7、14、30 天後複習；練錯退一格，10 分鐘後再來 */
      const IV=[0,1,3,7,14,30];d.box=good?(d.hint?(d.box||0):Math.min(5,(d.box||0)+1)):Math.max(0,(d.box||0)-1);if(good){d.hint=false;d.won=st.id}d.due=Date.now()+(good?IV[d.box]*864e5:6e5);
      all[P0.key]=d;store.set("redoDone",all)}
    const fail=d.fail||0,bc=m.bc||P0.bc;
    if(good){s2.textContent=`✅ 「${m.cn}」是${m.q}！比上次的${P0.q}進步了，這題練會了。可以繼續跟電腦下完，也可以直接結束這題`;
      /* 意見回饋 648（開發者）：練會了，這盤就不該再被「還有一題沒下完」催——給一顆結束鈕；錯棋重練頁看到這盤已練會，也只淡淡提醒 */
      pa.hidden=false;if(pa.dataset.k!=="end"){pa.dataset.k="end";   /* 意見回饋 749：按鈕一樣就不重畫（每次輪詢重畫會閃、也可能吃掉正在按的那一下） */
        pa.innerHTML='<button class="pill" id="pEnd">✅ 練會了，結束這題</button>';pa.querySelector("#pEnd").onclick=()=>{vibrate(5);post("/play/resign").catch(()=>{}).finally(()=>{toast("✅ 這題練會了");if(!P0.t01)location.hash="#/redo"})}}return}   /* ChatGPT 改善單 T01：主流程來的練習留在這頁，結算視窗接著給「練一題同樣的棋理」 */
    const HB=practiceBoard(),HM=bc?bcMove(HB,st.human,bc):null,C0=window.XQCore;let say="";
    if(HM&&fail>=3&&C0){const pc=HB[HM.f],cap=HB[HM.t],after=C0.make(HB,HM.f,HM.t),ck=C0.inCheck(after,opp(st.human)),nm=x=>C0.NAMES[C0.sideOf(x)][x.toUpperCase()];
      say=`動你的「${nm(pc)}」`+(cap?`，可以吃掉對方的「${nm(cap)}」`:"")+(ck?"，走了就是將軍":"")+(!cap&&!ck?"，先把它調到更好的位置，看看能威脅到什麼":"")}
    if(HM&&fail>=2){if(!d.hint){d.hint=true;all[P0.key]=d;store.set("redoDone",all)}const want=fail>=4?{f:HM.f,t:HM.t,n:P0.base}:{f:HM.f,t:null,n:P0.base};if(!pHint||pHint.t!==want.t||pHint.f!==want.f){pHint=want;setTimeout(draw,0)}}
    if(nz&&HM&&typeof stuckNudge==="function")setTimeout(()=>stuckNudge(`卡住了嗎？${say?say+"。":""}${hintMk()}那顆子就是關鍵，按 ↶ 悔棋再試一次！`),300);
    /* v5 R08：比上次好＝已經記成練會（d.ok，錯棋列表會打勾），這裡也照說；穩著、緩著但沒比原本好的，直接說沒有比上次好 */
    s2.textContent=(ok?`👍 「${m.cn}」是${m.q}，比上次的${P0.q}好，這題算練會了；想挑戰正著，按 ↶ 悔棋再試`:`❌ 「${m.cn}」${m.q===P0.q||(qi(P0.q)>=4&&qi(m.q)>=4)||qi(m.q)>=9?"還是"+m.q:`是${m.q}，沒有比上次的${P0.q}好`}，按 ↶ 悔棋再想一次`)+`（第 ${fail} 次）`+
      (!HM?"":fail>=4?`\n💡 提示三：${hintMk()}是建議的落點（電腦建議走「${bc}」）`:fail>=3?`\n💡 提示二：${say}（${hintMk()}是該動的子）`:fail>=2?`\n💡 提示一：${hintMk()}這顆子就是關鍵`:"・再錯一次就給提示");
    if(fail>=4&&bc&&pa.dataset.k===P0.key+"|"+bc)pa.hidden=false;
    else if(fail>=4&&bc){pa.hidden=false;pa.dataset.k=P0.key+"|"+bc;pa.innerHTML='<button class="pill" id="pHn">💡 在棋盤上看建議</button><button class="pill" id="pPv">▶ 推演後面</button>';
      pa.querySelector("#pHn").onclick=()=>{const mv=bcMove(practiceBoard(),st.human,bc);if(!mv)return toast("找不到這步");vibrate(5);
        pHint={...mv,n:P0.base};if(st.moves.length>P0.base)toast(`按 ↶ 悔棋回到起點，就看得到建議的那一步（${hintMk()}）`);draw()};
      pa.querySelector("#pPv").onclick=()=>{vibrate(5);pvSheet(bc)}}}
  // 開新局。下到一半（雙方都走過）：積分挑戰會算輸，一定要確認；自選難度換成積分挑戰也問一下，免得誤觸把棋丟掉
  function startNew(o){const ranked=OFF&&!!o.ranked,m=ranked?"rank":"free";
    const go=()=>{closeSheet();shownResult=null;sel=-1;if(OFF)store.set("cpuRanked",ranked);paintSeg(m);if(!ranked&&o.opp==="zhanggui")store.set("zgX",!!o.zx);post("/play/new",{human:o.human,lx:o.level,ranked,...zgArg(o.opp,ranked,o.zx)})   /* 590：挑戰電腦傳的是細分後的 18 級（lx），其他地方傳的舊 1～8 級由 local.js 換算 */};
    const live=st&&!st.result&&st.moves.length>=2;
    if(live&&st.ranked)confirmBox("晉級賽還沒下完，開新局會算輸，確定？",go,"確定");
    else if(live&&m!=="free"&&m!==modeOf(st))confirmBox("這盤還沒下完，要換成晉級賽開新局嗎？",go,"換成晉級賽");else go()}
  // 頂部模式切換：換到另一個模式＝用同樣的紅黑開一盤新局；點目前的模式＝打開開新局選單
  function switchMode(m){if(!st)return;if(modeOf(st)===m)return newSheet();
    startNew({human:st.human,level:st.level||store.get("cpuLevel",6),ranked:m==="rank",opp:cpuOppPref()})}
  // 開新局選單：只管這個模式的設定（紅黑、難度），模式本身在頂部切換
  /* 意見回饋 413：石桌往事的「新局」只有重下這一盤、回雲河棋路（驛站、園子），沒有挑戰電腦的難度選單 */
  function jNewSheet(){const j=st.journey,s0=jFindStage(j),live=!st.result&&st.moves.length>=2;
    modal(`<div class="em">🪨</div><h2>${esc(jName(j))}</h2><p class="muted">${live?"這盤還沒下完，重下就會放棄這一盤。":"跟同一位對手再下一盤，或回去換一位。"}</p>`,
      [["⚔ 重下這一盤",()=>{shownResult=null;sel=-1;if(s0)jPlay(s0,true);else jAgain(st).then(render).catch(e=>toast(e.message))}],["‹ 回"+jPlace(j),()=>goUp(jBack(j))],["取消",null,true]])}   /* 意見回饋 607：退回那一層 */
  /* 開發者 11/11（截圖：橋上快速對局也能選難度、切晉級賽）：從首頁快速對局進來的（07y hbFromHome），新局、等級按鈕只給「再來一盤（同樣難度）」，
   想換難度、打晉級賽就去茶肆（快局的價值是快，選難度留給茶肆）；頂欄不放晉級賽／練功房分頁，結算視窗也不給「挑戰下一級」 */
  const FH=()=>MODE==="cpu"&&typeof hbFromHome==="function"&&hbFromHome();
  function quickSheet(){const hub=typeof hbHubN==="function"?hbHubN():"茶肆";let qo="km";   /* hspx 11/12：橋上快速對局固定幻影棋客（笑面掌櫃只在茶肆），不給選對手 */sheet("♟ 快速對局",b=>{const paint=()=>{b.innerHTML=`<p class="muted" style="margin:0 0 10px">快速對局用上一盤的難度（${st.zgx?esc(ZG_X.name):`第 ${st.level} 級`}），不算段位分。想換難度、打晉級賽，請到${esc(hub)}正式上桌。</p>
      <div style="height:4px"></div>
      <button class="btn" id="qkAgain" style="width:100%;margin:0 0 8px">♟ 再來一盤（同樣難度）</button><button class="btn ghost" id="qkHub" style="width:100%;margin:0">⚔ 去${esc(hub)}選難度、打晉級賽</button>`;
    b.querySelector("#qkAgain").onclick=()=>{closeSheet();const go=()=>api("/play/new",{human:st.human,lx:st.level,ranked:false,...zgArg(qo,false,!!st.zgx&&qo==="zhanggui")}).then(render).catch(e=>toast(e.message));if(!st.result&&st.moves.length>=2)confirmBox(st.ranked?"這盤晉級賽還沒下完，重開會算輸，確定？":"這盤還沒下完，確定重開一盤？",go,"再來一盤");else go()};
    b.querySelector("#qkHub").onclick=()=>{closeSheet();location.hash="#/hub/battle"}};paint()})}
  function newSheet(){if(!st)return;if(FH())return quickSheet();if(MODE==="arena")return arenaSheet(ARENA[st.arena]?st.arena:store.get("era","classic"),arenaStart);if(MODE==="journey")return jNewSheet();   /* 意見回饋 396：擂台裡按「新局」只出現挑戰擂台（再挑戰擂主、集章簿），不出現自選難度 */
    let side=st.human,level=st.level||store.get("cpuLevel",6),opp=cpuOppPref(),zx=zgXOn(opp);const ranked=OFF&&!!st.ranked;   /* zx＝笑面掌櫃「掌櫃真功夫」檔位（07m3 ZG_X） */   /* 11/11 笑面掌櫃：練功房的新局可以換對手，晉級賽固定幻影棋客 */
    const sh=sheet(ranked?cgT("new.titleRanked","🥇 晉級賽・開新局"):cgT("new.titlePractice","📚 練功房・開新局"),b=>{const rec=st.record||{},CR=st.cpuRate||{};
      const paint=()=>{const span=CR.hi!=null?CR.hi-CR.lo:0,pct=span?Math.round(100*(CR.pts-CR.lo)/span):100;
        b.innerHTML=(ranked?`<div class="cpu-rk"><div class="mid"><span class="muted">你的電腦段位</span><span class="pt"><b>${CR.pts||0}</b> 分</span></div>
          <div class="rk">${esc(CR.rank||"新手")}</div><div class="st-bar"><i style="width:${pct}%"></i></div>
          <div class="muted" style="font-size:12px">${CR.next?`再 ${CR.toNext} 分升「${esc(CR.next)}」`:"已經是最高段位"}・${CR.w||0} 勝 ${CR.l||0} 負 ${CR.d||0} 和</div>
          <p>電腦的強度跟著你的段位走，段位越高越難。用等級分的算法：跟實力差不多的電腦下，贏約 +16、輸約 −16，跟線上對戰分開記分。不能悔棋、不能提示，下到一半開新局算輸。</p></div>`:"")+
        `<div class="cpu-lb" data-i18n="new.youPlay">你執</div><div class="opt"><button data-s="r" data-i18n="new.red" class="${side==="r"?"on":""}">🔴 紅方（先走）</button><button data-s="b" data-i18n="new.black" class="${side==="b"?"on":""}">⚫ 黑方（後走）</button></div>`+
        `<div class="cpu-lb" data-i18n="new.opp">對手</div>${zgOppHTML(ranked?"km":opp,ranked)}`+
        (ranked?"":`<div class="cpu-lb" data-i18n="new.level">難度</div><div class="lvl">${st.levels.map(l=>`<button data-l="${l.n}" class="${l.n===level&&!(zx&&opp==="zhanggui")?"on":""}"><b>${l.n}</b><span>${esc(l.name)}</span>${(rec[l.n]||{}).w?'<span class="ok">✔ 通關</span>':""}</button>`).join("")}${opp==="zhanggui"?`<button data-zx="1" class="${zx?"on":""}"><b>${esc(ZG_X.short)}</b><span>${esc(ZG_X.name)}</span></button>`:""}</div>
          <div class="cpu-desc">${esc(zx&&opp==="zhanggui"?ZG_X.desc:(st.levels[level-1]||{}).desc||"")} <button type="button" class="lk" data-xqdoc="ai">🤖 各級怎麼下</button></div>`)+   /* 評比第 10 輪 F3：電腦對手透明頁（data/docs/ai-levels.md，05-settings XQDOC.ai） */
        `<button class="btn" id="go"${ranked?' data-i18n="new.goRanked"':zx&&opp==="zhanggui"?"":` data-i18n="new.goLevel" data-i18n-n="${level}"`}>${ranked?"開始晉級賽":zx&&opp==="zhanggui"?"開始："+ZG_X.name:`開始第 ${level} 級`}</button>`+
        "";   /* 意見回饋 413：挑戰電腦裡不放朝代擂台入口，擂台從首頁 #/arena 進 */
        b.querySelectorAll("[data-s]").forEach(x=>x.onclick=()=>{side=x.dataset.s;paint()});b.querySelectorAll("[data-l]").forEach(x=>x.onclick=()=>{level=+x.dataset.l;zx=false;paint()});{const z=b.querySelector("[data-zx]");if(z)z.onclick=()=>{zx=true;paint()}}zgOppBind(b,o=>{opp=o;paint()});
        b.querySelector("#go").onclick=()=>startNew({human:side,level,ranked,opp,zx:zx&&opp==="zhanggui"});{const ga=b.querySelector("#goArena");if(ga)ga.onclick=()=>{closeSheet();setTimeout(()=>arenaBtn[1](),250)}}};paint()});
    sh.classList.add("cpu-sheet")}
  // 上一盤已經下完：一進來就直接開新局（同樣的難度和執子），不要讓人以為還沒下完
  let first=true;
  const stop=poller(async()=>{if(busy)return;let s;
    if(first&&!practicePage){try{s=await api("/play/open",openArgs())}catch(e){s=await api("/play/state")}}else s=await api("/play/state");
    if(first){first=false;opened=true;
      /* 意見回饋 607：從「📊 檢討」的報告退回來（REVIEW_BACK 對得上這盤）、或回到已經下完的錯棋重練：不自動開新局、不跳結果視窗，顯示終局盤面 */
      {const rb=REVIEW_BACK;REVIEW_BACK=null;if(s.result&&(practicePage&&s.practice||rb&&rb.id===s.id&&KIND(s)===MODE)){shownResult=JSON.stringify(s.result)+s.moves.length;render(s);return}}
      /* 回饋 838（開發者 11/9 選：全模式中斷接續）：古戰場讓子對弈先載戰役資料（冷啟動直接接續時 BATTLE_CARDS 還是空的：戰役名、下一場、集滿一卷的獎勵會對不上） */
      if(String(s.journey||"").startsWith("bt:")&&typeof battleData==="function")try{await battleData()}catch(e){}
      /* 回饋 838：這盤在對局頁開著時還沒下完、後來（電腦在背景走完、或關掉 App 前送出的那步）才分出勝負——照常跑一次結果（修為、闖關、驛站、擂台印、掉寶），不要直接跳走或開新局把它吞掉 */
      if(s.result&&KIND(s)===MODE&&!practicePage&&typeof rsWasOpen==="function"&&rsWasOpen(s.id)){render(s);return}
      /* 意見回饋 413：石桌往事頁沒有石桌往事那盤（或那盤已經下完）就回去選，不畫別的模式的棋 */
      if(MODE==="journey"&&(KIND(s)!=="journey"||s.result)){navReplace(KIND(s)==="journey"&&s.journey?jBack(s.journey):"#/adventure");return}
      /* 朝代擂台：還沒開始、或上一盤已經下完，先出擂主卡（選朝代、看集章簿） */
      if(MODE==="arena"&&(s.result||!s.moves.length)){if(s.result)shownResult=JSON.stringify(s.result)+s.moves.length;render(s);if(!NAV_POP)setTimeout(()=>arenaBtn[1](),300);return}   /* 意見回饋 607：只有新進來才自動彈擂主卡，用返回退回這頁不彈 */
      /* 戰績頁「開始積分挑戰」「下一盤獎勵棋」：這盤的模式不同就換（下到一半會先問） */
      if(MODE==="cpu"){const w=store.get("cpuWant",null);if(w){store.set("cpuWant",null);setTimeout(()=>{if(st&&modeOf(st)!==w)switchMode(w)},400)}}
      if(s.result){shownResult=JSON.stringify(s.result)+s.moves.length;const rk=OFF&&!!store.get("cpuRanked",!!s.ranked);await post("/play/new",{human:s.human,lx:s.level||store.get("cpuLevel",6),ranked:rk,...zgArg(cpuOppPref(),rk)});s.ranked=rk;
      toast(s.ranked?`新的一局・晉級賽`:cr?`新的一局・🚗 獎勵第 ${s.level} 級`:`新的一局・第 ${s.level} 級`);return}
      if(typeof rsEntry==="function")rsEntry(s,MODE,()=>{if(MODE==="journey")navReplace(s.journey?jBack(s.journey):"#/adventure");else route()})}   /* 對局中途可接續：隔了一陣子回到這盤，問要不要繼續（07m4-resume.js） */
    render(s)},()=>st&&st.thinking?500:1500);
  // 電腦一走完就馬上畫出來（不等下一次輪詢）
  const onPlay=()=>{if(!busy&&opened)api("/play/state").then(s=>{if(!busy&&s)render(s)}).catch(()=>{})};window.addEventListener("xq-play",onPlay);
  return{stop:()=>{stop();window.removeEventListener("xq-play",onPlay)}}}

// ================= 雙人對戰 =================
// 連線對戰的快捷表情（Gemini 評估 11/8：不傷人的句子；id 不能改，新舊版本和 lobby-bots 靠 id 互通）
/* 回饋 855（開發者 11/9）：「😂 哈哈哈」可能被拿來笑對手下錯，換成「😄 好好玩」（代號 lol 不變，舊版收到仍顯示原本的字） */
const EMOTES=[["smug","😊","好險好險"],["slow","🐢","慢慢想沒關係"],["good","👍","好棋！"],["oops","😅","哎呀走錯了"],["think","🤔","讓我想想"],["tea","🍵","先喝口茶"],["fire","🔥","我要進攻囉"],["mercy","🙏","受教了"],["lol","😄","好好玩"],["gg","🤝","再來一盤"]];
function showEmote(k,mine){const e=EMOTES.find(x=>x[0]===k);if(!e)return;const d=document.createElement("div");d.className="emo"+(mine?" mine":"");
  d.innerHTML=`<div class="big">${e[1]}</div><div class="t">${esc(e[2])}</div>`;document.body.append(d);d.getBoundingClientRect();d.classList.add("show");
  if(!mine)vibrate([20,40,20]);setTimeout(()=>{d.classList.remove("show");setTimeout(()=>d.remove(),300)},mine?1300:2600)}
// 聊天泡泡：對方說的話在畫面中間停 4 秒；自己說的話小一點、短一點
/* 意見回饋 347：線上對戰的聊天泡泡靠在說話的人旁邊——at＝那個人的玩家列（上面的人泡泡在名字下面、下面的人泡泡在名字上面） */
function showChat(text,mine,name,at){const d=document.createElement("div");d.className="emo"+(at?" at":mine?" mine":"");
  if(at){const r=at.getBoundingClientRect(),up=r.top>innerHeight/2;d.classList.toggle("up",up);d.style.setProperty("--x",Math.round(Math.max(8,Math.min(r.left+40,innerWidth-200)))+"px");d.style.setProperty("--y",Math.round(up?innerHeight-r.top+6:r.bottom+6)+"px")}
  d.innerHTML=`<div class="t" style="font-size:12px;opacity:.7">${esc(mine?"我":name||"")}</div><div style="font-size:18px;font-weight:700;max-width:70vw;white-space:pre-wrap;word-break:break-word">💬 ${esc(text)}</div>`;
  document.body.append(d);d.getBoundingClientRect();d.classList.add("show");if(!mine)vibrate([20,40,20]);
  setTimeout(()=>{d.classList.remove("show");setTimeout(()=>d.remove(),300)},mine?1500:4000)}
// 3D 象棋小人（意見回饋 159）：在畫面上自由走動、做手勢；開發者預設開、玩家預設關，設定「其他」可以切換
const botPc=()=>{{const x=typeof myChar==="function"?myChar():"";if(x&&WX_CHARS[x].pc)return WX_CHARS[x].pc}   /* 意見回饋 668：雲河七星鎖本命棋子 */const c=store.get("botPiece","帥");return typeof c==="string"&&c.length===1&&"帥仕相俥傌炮兵將士象車馬砲卒".includes(c)?c:"帥"},BOTN=()=>(typeof myChar==="function"&&myChar())?(WX_CHARS[myChar()].nk||WX_CHARS[myChar()].n):"小"+({俥:"車",傌:"馬",砲:"炮"}[botPc()]||botPc())+(store.get("pSex","m")==="f"?"妹":"");   /* 意見回饋 492：女生版叫小帥妹 */
let BOT=null,botBusy=false;const botOn=()=>store.get("bot3d",true);
window.addEventListener("xq-bot-hide",()=>{store.set("bot3d",false);syncBot();toast(BOTN()+"先休息了。在任何頁面點三下，就會回來")   /* 意見回饋 607：小人名字照角色（小帥／小帥妹…） */});
/* 意見回饋 528（開發者）：小帥藏起來以後，在任何頁面快速點三下就叫回來（點在按鈕、輸入框上不算） */
{let tp=[];document.addEventListener("pointerdown",e=>{if(store.get("bot3d",true))return;if(e.target.closest&&e.target.closest("button,a,input,textarea,select,label,canvas,.sheet,#sheet"))return;const now=Date.now();tp=tp.filter(t=>now-t.t<650&&Math.hypot(t.x-e.clientX,t.y-e.clientY)<60);tp.push({t:now,x:e.clientX,y:e.clientY});
  if(tp.length>=3){tp=[];store.set("bot3d",true);syncBot();vibrate(15);toast(BOTN()+"回來了！")}},{passive:true})}   // 意見回饋 167：預設打開
async function syncBot(){if(botBusy)return;botBusy=true;try{if(botOn()&&!BOT){await loadScript(OFF?"three.min.js":"/m/three.min.js");await loadScript((OFF?"bot3d.js":"/m/bot3d.js")+"?v="+encodeURIComponent(window.XQ_BUILD||""));if(botOn()&&window.XQBot3D)BOT=window.XQBot3D.start()}
  else if(!botOn()&&BOT){BOT.stop();BOT=null}}catch(e){}botBusy=false}
setTimeout(syncBot,0);   // 意見回饋 164：一打開就載入，不要等
/* 開發者 11/11 選規劃書方案 01：長將／長捉先提示；同日開發者選「提示改成直接問裁判」——不再自己用每步的將軍／捉子標記推輸贏
   （會跟亞洲棋例的裁判不一致，例如一將一捉），改成：輪到你、眼前這個局面已經第二次出現時，模擬「你照上一輪的走法再走一圈」，
   每一步都交給 core 的 judgeState 判；裁判說你會輸才警告，警告照抄裁判的判詞；裁判說待核就提醒可以提和或變著；判和或不判就不打擾。
   同一盤 8 手內只提醒一次。draw＝有提和的對局（同桌、線上）多一顆「提議和局」 */
const REPW_SEEN=new Map();   /* 對局代號 → 上次提醒時的手數 */
function repWarn(st,me,draw){try{const CLK=!!(st&&st.clocks);   /* 開發者 11/11 選 ChatGPT UI-13：跟電腦下沒有時鐘、同桌沒設時制也沒有，只有真的有時鐘才寫「時間照常在走」 */const C=window.XQCore;if(!C||!C.repetitionWarning)return;
  /* 11/11 Gemini 架構報告第一項（預警與判決分離）：「照上一輪再走一圈、每步問 judgeState」的模擬搬進 core 的 repetitionWarning（xiangqi-referee.js），這裡只照它回的警告事件顯示；不判長將長捉的關（noPerp）、棋規（st.rc）也由它處理 */
  const ev=C.repetitionWarning(st,me);if(!ev)return;const v=ev.verdict,n=ev.ply;
  const id=st.id||"",last=REPW_SEEN.get(id);if(last!=null&&n-last<8&&n>=last)return;REPW_SEEN.set(id,n);
  if(v.pending)modal(`<div class="em">🔁</div><h2>局面在重複</h2><p>照上一輪再走一圈，裁判會判「待核」：${esc(v.why||"")}</p><p class="muted" style="font-size:13px">${CLK?"時間照常在走。":""}可以換一步不一樣的棋${draw?"，或向對方提議和局":""}。</p>`,[...(draw?[["🤝 提議和局",draw]]:[]),["我來變著",null]]);
  else modal(`<div class="em">⚠️</div><h2>著法待確認</h2><p>這個局面已經重複出現。照上一輪再走一圈，裁判會判：<b>${esc(v.why||"")}</b>。請換一步不一樣的棋${draw?"，或向對方提議和局":""}。</p>${CLK?'<p class="muted" style="font-size:13px">時間照常在走。</p>':""}`,[...(draw?[["🤝 提議和局",draw]]:[]),["我來變著",null]])}catch(e){}}
