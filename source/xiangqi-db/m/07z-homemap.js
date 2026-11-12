/* ================= 🏞 首頁滿版水墨圖「楚河渡口棋鎮」（開發者 11/8 定案：Gemini 方案 1＋2 合體，史學顧問核過）=================
   規劃：story/gemini_app/36 號 md；圖：park/homemap/home_v5.png（Gemini 水墨重畫＋程式宣紙後製、石桌程式畫完整開局、左下西式小船抹掉）→ art/homemap/home.webp → data/homemap/。
   包一層 Home(v)（沒有 hub 的那一種）：原本的首頁照舊畫出來（今天的路、對戰卡的即時段位、新手卡…都照舊），只是藏起來；上面換成一張滿版圖：
     中間一條真的楚河，星槎停在河中（木棧道走到跳板＝⛵ 雲河星槎 #/adventure）；
     左岸（黑方）徽州巷口牌坊＝⚔ 對戰 #/hub/battle；右岸（紅方）書院山門＝📚 學習 #/hub/learn；
     青石拱橋中央廣場＝角色起點，廣場上的石桌＝⚡ 下一盤（跟 hQuick 一樣直接挑戰電腦）；完全沒下過棋的新手：石桌上有天光照下來，標籤改「🔰 第一次下象棋？」，點了開 #/camp；
     左岸橋頭告示牌＝📜 今日推薦：點了從下方拉出原本的「今天的路」卡（07l homePathHTML／homePathBind；沒有那個檔就用今日推薦 homeRecHTML）；
     點 3D 角色＝我的角色 #/me。標籤只有大字（開發者 11/8：小字都拿掉）。
   小帥（.xqbot）在這一頁照舊出現、照舊講棋語小教室（07w 有角色時會把小帥藏起來，這一頁例外：body.hm-on）。
   加到主畫面：圖下方一條浮動小條（原本首頁的提示卡藏起來了）。
   接 07w 走路（座標表 SHW_HOMEMAP）、07x 兩指縮放。圖片網址帶 HM_IMGV（data/homemap 在不跟版本走的快取裡，換圖要改這個數字）。
   開關 HOME_MAP_ON（false＝照舊卡片首頁）；樣式在 hmCss */
const HOME_MAP_ON=true;   /* 開發者 11/8 說打開 */
const HM_IMGV="2215";   /* 圖的版本：同檔名換圖時改掉，手機才會重抓 */
/* 入口：[標籤 id（也是 07w 的入口代號）, 標籤左%, 上%, 大字]（量 768×1376 的 home_v5，標籤放在東西上方） */
/* 開發者 11/9「把首頁的學習和對戰用不同朝代的詞彙來表示」：照星槎停靠的朝代換說法（學習頁、對戰頁頂欄標題也用這個）；還沒登船、在雲河＝學習、對戰。
   學：秦學室（睡虎地秦簡）、漢與三國太學、魏晉國子學（西晉咸寧二年）、南北朝國學、隋國子寺、唐五代國子監、宋以後書院；
   弈：秦漢三國酒肆、魏晉酒壚（《世說新語》黃公酒壚）、南北朝隋酒肆、唐旗亭（旗亭畫壁）、五代茶肆、宋茶坊（《東京夢華錄》）、元茶肆、明茶樓、清茶館 */
const HUB_NAME={learn:{classic:"藏譜石窟",qin:"學室",han:"太學",sanguo:"太學",weijin:"國子學",nanbei:"國學",sui:"國子寺",tang:"國子監",wudai:"國子監",song:"書院",yuan:"書院",ming:"書院",qing:"書院"},
  quick:{qin:"博一局",han:"博一局",sanguo:"博一局",weijin:"博一局",nanbei:"象戲一局",sui:"象戲一局",tang:"象戲一局",wudai:"象戲一局",song:"著一局",yuan:"著一盤",ming:"下一盤",qing:"殺一盤"},   /* 11/9 開發者：「下一盤」也照朝代：秦漢到魏晉叫「博」（六博）；南北朝、隋用北周《象經》的「象戲」（11/10 開發者：圍棋用語「弈、手談、坐隱」都拿掉）；唐牛僧孺《玄怪錄》寶應象戲；宋元「著棋」；清俗話「殺一盤」 */
    battle:{classic:"觀星閣",qin:"酒肆",han:"酒肆",sanguo:"酒肆",weijin:"酒壚",nanbei:"酒肆",sui:"酒肆",tang:"旗亭",wudai:"茶肆",song:"茶坊",yuan:"茶肆",ming:"茶樓",qing:"茶館"}};
function xqHubName(k){let e="";try{e=typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt():""}catch(x){}try{if(!e&&typeof hbIsCl==="function"&&hbIsCl())e="classic"}catch(x){}const n=(HUB_NAME[k]||{})[e];   /* 11/10：還沒登船也是經典世界，頁名用藏譜石窟、觀星閣（原本顯示學習、對戰） */return(k==="quick"?"♟ ":k==="battle"?"⚔ ":"📚 ")+(n||(k==="quick"?"下一盤":k==="battle"?"對戰":"學習"))}
/* 11/9 開發者：「下一盤」前面的閃電跟水墨圖示融合不了，換成 ♟（e_piece 手繪棋子圖示） */
/* 11/12 ChatGPT UI 冗餘盤查（story/104 號）第 5 項：橋上石桌跟對戰頁同一個東西（#/pvp），統一叫「同桌對弈」（螢幕報讀另外說兩人共用這台裝置，畫面不加小字）；
   底部大按鈕第一次（hmNew）原本寫「立即開始」，其實是進新手訓練營，改成「學走第一手」；有下到一半的棋照舊「接著下」、回訪照舊「快速對局」 */
const HM_PVP_NM="👥 同桌對弈",HM_PVP_AL="同桌對弈：兩人共用這台裝置",hmAl=t=>String(t||"").replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u,"")||String(t||"")   /* 11/13 開發者實機旁白錄影：入口前面的圖示被念成「帆船」「交叉的劍」「羊皮紙卷」，語音標籤去掉開頭的圖示 */;
const HM_FIRST={go:"#/camp",t:"🔰 學走第一手",s:"從新手訓練營開始"};
const HM_SPOTS=[["hmShip",52,15,"⛵ 雲河星槎"],["hmBattle",14,25.5,"⚔ 對戰"],["hmLearn",86,26.5,"📚 學習"],["hmRec",12,44,"📜 今日推薦"],["hmQuick",52,47.5,"👥 同桌對弈"]];
/* 開發者 11/11 選 ChatGPT 77 號方案一「地圖主路收斂版」（主張「看懂一步，敢下一盤」）。
   開發者 11/11 hspx「把首頁看棋譜和練一題改回之前的版本（學習），不然看棋譜這個入口太冗餘了」：1815 加的「📜 看棋譜」拿掉、「🧩 練一題」改回學習入口原名（藏譜石窟／書院…），
   棋譜庫照舊從學習入口進。只留下地圖上方一條宣紙主張紙條：完全沒下過棋的新手一直顯示；其他人每天第一次進首頁顯示 3 秒後淡出，之後當天不再出現 */
/* 07w 的座標表（腳底的位置）：起點在橋中央廣場（石桌左前方）；石桌四周繞著走，不穿過桌子；往後經廣場後緣走木棧道到星槎跳板；
   左右各從拱橋兩端的石階下到碼頭步道：左岸沿河岸步道上去到牌坊前、橋頭告示牌前；右岸過草地到書院山門石階下 */
const SHW_HOMEMAP={el:40,h:[.05,60,.0008],look0:[50,99],
  N:{home:[44,60.5],tbl:[44.5,58],pl:[33,55],plc:[37,51.6],pb:[51,50.5],pr:[67,55],prc:[64,51.6],j1:[52.5,44.5],ship:[60,38.5],
    ls:[22,57],brd:[13,56],lq:[24,47],arch:[18,41.5],rs:[78,57],rq:[80,49],gate:[84,45]},
  E:"home-tbl home-pl home-pr pl-plc plc-pb pr-prc prc-pb pb-j1 j1-ship pl-ls ls-brd ls-lq lq-arch pr-rs rs-rq rq-gate",
  HS:{hmShip:["ship",62,30,"wave"],hmBattle:["arch",12,36,"bow"],hmLearn:["gate",87,38,"bow"],hmRec:["brd",12,50,"wave"],hmQuick:["tbl",52,54,"bow"]}};
function hmCss(){if(document.getElementById("hmCss"))return;const s=document.createElement("style");s.id="hmCss";s.textContent=`
.home-page{margin:0 0 6px}.home-page .shp-spot{max-width:46%;padding:4px 11px}.home-page .shp-spot b{white-space:nowrap;font-size:14px}.home-page .shp-spot.hot{padding:5px 13px}.home-page .shp-spot.hot b{font-size:15px}
.hm-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.hm-sky{position:absolute;left:52%;top:22%;width:34%;height:36%;transform:translateX(-50%);background:linear-gradient(to bottom,rgba(255,244,200,0),rgba(255,236,170,.42) 70%,rgba(255,236,170,.55));clip-path:polygon(42% 0,58% 0,100% 100%,0 100%);mix-blend-mode:screen;animation:hmSky 4.5s ease-in-out infinite}
.hm-sky::after{content:"";position:absolute;left:12%;right:12%;bottom:-4%;height:22%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,240,190,.75),rgba(255,230,160,0))}
@keyframes hmSky{0%,100%{opacity:.75}50%{opacity:1}}
.hm-me{position:absolute;z-index:3;background:transparent;border:0;padding:0;border-radius:40%;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hm-go-bar{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;display:flex;flex-direction:column;align-items:center;gap:8px;width:max-content;max-width:calc(100vw - 32px);pointer-events:none}
.hm-go-bar>*{pointer-events:auto}.hm-go-bar .hm-inst{position:relative;left:auto;bottom:auto;transform:none}.hm-slogan{position:absolute;left:50%;top:1.4%;transform:translateX(-50%);z-index:5;padding:6px 18px;border-radius:6px;border:1px solid rgba(90,58,26,.35);background:rgba(246,238,220,.92);box-shadow:0 2px 10px rgba(0,0,0,.18);color:#3b2a1a;font:900 17px/1.3 var(--serif,serif);letter-spacing:.18em;white-space:nowrap;pointer-events:none;transition:opacity .8s}.hm-slogan.out{opacity:0}
.hm-pills{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.hm-fb{font-size:14px;padding:8px 16px}
.hm-go{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:220px;max-width:100%;min-height:52px;padding:9px 26px;border:2px solid #f2c94c;border-radius:999px;background:linear-gradient(180deg,#b3261e,#7d1611);color:#fff6dc;box-shadow:0 4px 14px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.25);font:900 19px/1.15 var(--serif,serif);letter-spacing:.06em;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hm-go small{font:700 12px/1.2 var(--serif,serif);letter-spacing:0;color:#ffe08a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.hm-go small:empty{display:none}
.hm-go:active{transform:translateY(1px);filter:brightness(.95)}
.hm-inst{position:absolute;left:50%;bottom:1.4%;transform:translateX(-50%);z-index:4;border:1.5px solid #f2c94c;border-radius:999px;background:rgba(20,16,12,.72);color:#ffe08a;font:800 13px/1 var(--serif,serif);padding:7px 14px;white-space:nowrap;cursor:pointer}
.hm-inst::before{content:"";position:absolute;left:-3px;right:-3px;top:50%;height:46px;transform:translateY(-50%);border-radius:999px}   /* 第 12 輪 F2：「加到主畫面」「回報問題」外觀不變（33 高），透明點選範圍撐到 46 高；上下各多 6.5px，跟大按鈕之間的 8px 空隙不重疊 */
${typeof WALK_BOT_MERGE!=="undefined"&&WALK_BOT_MERGE?"":"body.hm-on.shw-on .xqbot{visibility:visible}"}
@media (prefers-reduced-motion:reduce){.hm-sky{animation:none}}`;document.head.append(s)}
/* 開發者 11/11 hspx（規劃書方案 02「下棋不被其他系統打斷」，選了「底部固定大按鈕」）：首頁滿版圖底部固定一顆大按鈕，不用先認得石桌、朝代說法。
   平常＝「♟ 立即對局」直接挑戰電腦（跟石桌一樣 #/cpu）；有下到一半的棋＝「▶ 接著下」＋小字哪一盤、第幾手（判斷跟今日推薦同一個 homeRecGame，線上對局優先）；
   完全沒下過棋＝「🔰 立即開始」進新手訓練營（跟石桌一樣）。「📲 加到主畫面」原本在圖的底部，有這顆按鈕時搬進同一條，疊在上面不互相擋。
   按鈕放在 .home-page 裡（position:fixed），離開首頁跟著頁面一起拿掉 */
/* v5 改善單 R07（小標籤）：窄手機（390 寬）時滿版地圖比畫面寬、左右各裁掉約 20px，貼邊的標籤（觀星閣、今日推薦、右邊的學習入口）會被切掉一截；
   畫好後把超出畫面的標籤往內推回 8px（只動 marginLeft，不改座標表），轉向、縮放時重算 */
/* v5 改善單 R07（桌面／矮螢幕）：寬螢幕時 07t3 r07Wide 把地圖限寬置中（或靠左＋側欄選單），圖比畫面窄，貼邊標籤要推回「圖和畫面重疊的那一塊」裡（圖的框 overflow:hidden，推到畫面內還是會被圖切掉）；
   手機直向圖比畫面寬（左右各裁約 20px），重疊那一塊就是畫面本身，結果跟原本一樣。推完通知 r07HitSoon 重算點選範圍 */
function hmClamp(P){const vw=document.documentElement.clientWidth,pad=8,pr=P.getBoundingClientRect(),L=Math.max(pad,pr.left+pad),R=Math.min(vw-pad,pr.right-pad);P.querySelectorAll(".shp-spot").forEach(b=>{const m0=parseFloat(b.style.marginLeft)||0,r=b.getBoundingClientRect();if(!r.width)return;
  /* 開發者 11/12 hspx「回棋鎮的時候，今日推薦都會左右抖一下」：原本先把 marginLeft 清掉再量、再推回去，貼邊的標籤會先彈出去再回來；改成從目前位置扣掉現在的推移量算出原位，值有變才改 */
  const l=r.left-m0,rr=r.right-m0,dx=l<L?L-l:rr>R?R-rr:0,nv=dx?Math.round(dx)+"px":"";if(b.style.marginLeft!==nv)b.style.marginLeft=nv});if(typeof r07HitSoon==="function")r07HitSoon()}
/* 首頁主張紙條（ChatGPT 77 號方案一）：新手一直顯示；其他人每天第一次 3 秒後淡出（store hmSloganDay）；不能點、不擋地圖標籤 */
function hmSlogan(P,nw){const d=typeof localDay==="function"?localDay():new Date().toDateString();if(!nw&&store.get("hmSloganDay","")===d)return;
  const s=document.createElement("div");s.className="hm-slogan";s.setAttribute("role","note");s.textContent="看懂一步，敢下一盤";P.append(s);if(nw)return;
  store.set("hmSloganDay",d);setTimeout(()=>{s.classList.add("out");setTimeout(()=>s.remove(),900)},3000)}
function hmGoBar(P,nw){const bar=document.createElement("div");bar.className="hm-go-bar";const b=document.createElement("button");b.type="button";b.className="hm-go";b.id="hmGo";
  /* 開發者 11/11 選 ChatGPT 13 號方案 1「快下 vs 選場」：平常寫「♟ 快速對局」；上一盤是挑戰電腦而且下完了＝小字「用上次難度，馬上跟電腦下」，
     點了直接用那盤的等級和模式（晉級賽／練功房）開新局（fresh）——原本只會打開那盤已經結束的棋，要再按新局，不算「馬上」 */
  let R=nw?Object.assign({},HM_FIRST):{go:"#/cpu",t:"♟ 快速對局",s:"不用選・不算段位",fresh:{human:"r",lx:3,ranked:false}};   /* 11/11 方案 1：沒有下到一半的棋＝一律開一盤不算分的新局（原本會打開預設的晉級賽） */
  const set=r=>{R=r;b.innerHTML=`<span>${esc(r.t)}</span><small>${esc(r.s||"")}</small>`;b.setAttribute("aria-label",r.t+(r.s?"："+r.s:""))};set(R);
  const row=document.createElement("div");row.className="hm-pills";const ib=P.querySelector("#hmInst");if(ib)row.append(ib);
  /* 開發者 11/11「把意見回饋放在明顯的首頁地方，讓玩家一眼看出可以回報問題」：大按鈕正上方固定一顆「💬 回報問題」（原本只在設定頁裡） */
  const fb=document.createElement("button");fb.type="button";fb.className="hm-inst hm-fb";fb.id="hmFb";fb.textContent="💬 回報問題";fb.setAttribute("aria-label","回報問題");fb.onclick=e=>{e.stopPropagation();vibrate(5);if(typeof feedbackSheet==="function")feedbackSheet();else location.hash="#/settings"};row.append(fb);
  bar.append(row);bar.append(b);P.append(bar);
  /* ChatGPT 改善單 T01（開發者 11/11 核准）安全接續：按鈕一開始是「快下一盤」（fresh＝開新局），問完 /play/state 才知道有沒有下到一半的棋要改成「▶ 接著下」。
     這中間就按下去，/play/new 會把桌上那盤沒下完的挑戰電腦換掉（晉級賽還會算輸）——所以先等那一問（RD，最多 1.5 秒）再照最新的 R 走 */
  let RD=Promise.resolve();
  b.onclick=async e=>{e.stopPropagation();vibrate(5);try{await Promise.race([RD,new Promise(z=>setTimeout(z,1500))])}catch(err){}if(R.fresh)try{await api("/play/new",{...R.fresh});   /* hspx 開發者 11/12「笑面掌櫃只會在茶肆出現，橋上對戰是幻影」：首頁快速對局一律幻影棋客 */const s2=await api("/play/state");if(s2&&s2.id)store.set("hmQuickId",s2.id)}catch(err){}if(R.sw)try{await api("/play/switch",{kind:R.sw})}catch(err){}if(R.park)store.set("park3d",true);/* 11/11 第二輪模擬玩家：「接著下」回到晉級賽、練功房時不能帶「從首頁來」的記號，不然會被當成快速對局（標題、結算都錯）；只有回到首頁開的那盤快局才帶 */try{if(/接著下/.test(R.t)&&R.gid&&R.gid!==store.get("hmQuickId",""))sessionStorage.removeItem("xqFromHome");else sessionStorage.setItem("xqFromHome","1");if(/接著下/.test(R.t))sessionStorage.setItem("rsGoOnce","1")}catch(err){}location.hash=R.go};   /* 11/11：記下從首頁進來（07y hbFromHome） */
  /* 11/11 AI 模擬玩家：新手（還沒下完過一盤）也要先查有沒有下到一半的棋——原本新手直接 return，晉級賽、練功房下到一半重開網頁，首頁還是「立即開始」 */
  try{if(window.XQNet&&XQNet.playing&&XQNet.playing())return set({go:"#/pvp",t:"▶ 接著下",s:"線上對局"})}catch(e){}
  if(typeof homeRecGame!=="function")return;
  RD=api("/play/state").then(st=>{const g=homeRecGame(st);if(!b.isConnected)return;
    /* 開發者 11/11 選 ChatGPT 14 號方案 1「快局不留名、茶肆才算帳」：快局一律不算段位分（上一盤是晉級賽也一樣，只沿用它的強度）；算分、選級數都在茶肆 */
    /* ChatGPT 改善單 T01：主流程的「從這步重下」（練習，practice.t01）還沒下完＝「▶ 接著下」回那盤；下完了＝快下一盤沿用原本那盤的難度（不是預設第 3 級） */
    if(!g){if(nw)return;const T1=st&&st.kind==="practice"&&st.practice&&st.practice.t01;
      if(T1&&!st.result&&(st.moves||[]).length)return set({go:"#/redo/play",t:"▶ 接著下",s:`從這步重下・第 ${st.moves.length} 手`});
      if(st&&st.kind==="cpu"&&st.result&&!st.practice)set({go:"#/cpu",t:"♟ 快速對局",s:"沿用上次難度・不算段位",fresh:{human:st.human||"r",lx:st.level,ranked:false}});
      else if(T1&&T1.lx)set({go:"#/cpu",t:"♟ 快速對局",s:"沿用上次難度・不算段位",fresh:{human:st.human||"r",lx:T1.lx,ranked:false}});return}const o=g.sw&&(st.others||[]).find(z=>z&&z.kind===g.sw),n=o?+o.n:st&&st.moves?st.moves.length:0;
    set({gid:st&&st.id,go:g.go,sw:g.sw,park:g.park,t:"▶ 接著下",s:String(g.t).replace(/^.*：/,"")+(n>0?`・第 ${n} 手`:"")})}).catch(()=>{})}
/* 完全沒下過棋（跟原本首頁「🔰 第一次下象棋？」卡同一個判斷） */
const hmNew=()=>!store.get("campSeen",false)&&!Object.keys(store.get("record",{})).length&&!(typeof tsmProgNow==="function"&&tsmProgNow().any);   /* 11/11 第二輪問題 1：store "record"（m_record）其實沒有人寫，跟電腦下完的戰績在 xq_record——原本只要沒進過訓練營，下過幾十盤也是「🔰 立即開始」；改成也看 05b 狀態機的「有沒有任何進度」 */
/* 📜 今日推薦：從下方拉出原本首頁的「今天的路」卡 */
function hmRecSheet(){sheet("📜 今日推薦",b=>{if(typeof homePathHTML==="function"){b.innerHTML=homePathHTML();try{homePathBind(b)}catch(e){}b.querySelectorAll("button").forEach(x=>x.addEventListener("click",()=>setTimeout(()=>{if(location.hash!=="#/")closeSheet()},0),true))}
  else if(typeof homeRecHTML==="function"){b.innerHTML=homeRecHTML();try{homeRecBind(b)}catch(e){}b.querySelectorAll("[data-go]").forEach(x=>x.addEventListener("click",()=>closeSheet(),true))}
  else b.innerHTML='<p class="muted">今天先跟電腦下一盤吧！</p>'})}
/* 點 3D 角色＝我的角色：一顆透明按鈕跟著 07w 的角色（看它每格寫的 translate／scale 和畫布的大小） */
function hmMe(P){if(typeof WALK_BOT_MERGE!=="undefined"&&WALK_BOT_MERGE)return;   /* 回饋 802：角色兼小帥時，點角色由 07w 的小選單接手（裡面有「我的角色」） */const box=P.querySelector(".shw");if(!box)return;const btn=document.createElement("button");btn.type="button";btn.className="hm-me";btn.setAttribute("aria-label","我的角色");btn.style.display="none";P.append(btn);
  btn.onclick=e=>{e.stopPropagation();vibrate(5);location.hash="#/me"};
  const upd=()=>{if(!box.isConnected){mo.disconnect();return}const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(box.style.transform),cv=box.querySelector("canvas");
    if(!m||!cv||!box.classList.contains("on")||box.style.opacity==="0"){btn.style.display="none";return}
    const k=+m[3],cw=parseFloat(cv.style.width)||cv.clientWidth,ch=parseFloat(cv.style.height)||cv.clientHeight,L=parseFloat(cv.style.left)||0,T=parseFloat(cv.style.top)||0;
    Object.assign(btn.style,{display:"",left:(+m[1]+(L+cw*.28)*k).toFixed(1)+"px",top:(+m[2]+(T+ch*.12)*k).toFixed(1)+"px",width:(cw*.44*k).toFixed(1)+"px",height:(Math.max(0,-T-ch*.12)*k).toFixed(1)+"px"})};
  const mo=new MutationObserver(upd);mo.observe(box,{attributes:true,attributeFilter:["style","class"]});upd()}
function homeMap(v){const home=v.querySelector(".home");if(!home||v.querySelector(".home-page"))return;hmCss();
  const nw=hmNew(),standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone,inst=OFF&&!standalone&&!(store.get("instAsk",null)||{}).no;
  /* 開發者 11/11（截圖圈出石桌「著一盤」和底部「立即對局」重複，選「石桌改成同桌對弈」）：石桌旁本來就擺兩張石凳＝兩人面對面下（#/pvp）；
     跟電腦下、接著下、新手第一次都交給底部大按鈕（hmGoBar），石桌不再有新手天光和「第一次下象棋？」 */
  const lab=id=>id==="hmQuick"?HM_PVP_NM:id==="hmLearn"?xqHubName("learn"):id==="hmBattle"?xqHubName("battle"):HM_SPOTS.find(s=>s[0]===id)[3];
  const d=document.createElement("div");
  d.innerHTML=`<div class="shp-page cq home-page"><img src="data/homemap/${typeof hbIsCl==="function"&&hbIsCl()?"home_classic":"home"}.webp?v=${HM_IMGV}" alt="${typeof hbIsCl==="function"&&hbIsCl()?"千秋時光之苑":"楚河渡口棋鎮"}"><div class="hm-fx" aria-hidden="true"></div>${HM_SPOTS.map(([id,x,y])=>`<button class="shp-spot" id="${id}" style="left:${x}%;top:${y}%" aria-label="${esc(id==="hmQuick"?HM_PVP_AL:hmAl(lab(id)))}"><b>${esc(lab(id))}</b></button>`).join("")}${inst?'<button class="hm-inst" id="hmInst" aria-label="加到主畫面">📲 加到主畫面</button>':""}</div>`;
  const P=d.firstElementChild;v.insertBefore(P,home);home.classList.add("hb-hidden");if(typeof hbCss==="function")hbCss();else home.style.display="none";
  {const wv=typeof sw7HomeWx==="function"?sw7HomeWx():"",im0=P.querySelector(":scope>img");if(wv&&im0){const pre=new Image();pre.onload=()=>{if(!im0.isConnected)return;try{if(typeof sw7SeaTurn==="function"&&sw7SeaTurn(P,im0,pre.src))return}catch(e){}im0.src=pre.src};pre.src="data/homemap/home_"+wv+".webp?v="+HM_IMGV}}   /* 回饋 811：下雪、下雨天換積雪版 home_snow／雨景版 home_rain（07w7-seasons.js 判斷；先載好再換，載不到留原圖） */
  const GO={hmShip:"#/adventure",hmBattle:"#/hub/battle",hmLearn:"#/hub/learn"};
  for(const[id]of HM_SPOTS){const b=P.querySelector("#"+id);if(!b)continue;
    b.onclick=()=>{vibrate(5);if(GO[id]){location.hash=GO[id];return}if(id==="hmRec"){if(typeof TODAY_MAP_ON!=="undefined"&&TODAY_MAP_ON){location.hash="#/today";return}hmRecSheet();return}if(id==="hmQuick"){try{sessionStorage.setItem("xqFromHome","1")}catch(e){}location.hash="#/pvp"}}}   /* 11/11：記下從首頁進來（07y hbFromHome：回首頁、不走後園） */
  {const ib=P.querySelector("#hmInst");if(ib)ib.onclick=e=>{e.stopPropagation();vibrate(5);installGuide(true)}}
  hmGoBar(P,nw);try{hmSlogan(P,nw)}catch(e){}
  /* v5 改善單 R07：轉向／縮放時 07t3 ttFill 要 120ms 後才重排圖的寬度，這裡等 300ms 再推標籤（原本 resize 當下就推，量到的是還沒重排的舊圖） */
  {const cl=()=>{if(!P.isConnected)return;try{hmClamp(P)}catch(e){}},rs=()=>{if(!P.isConnected){removeEventListener("resize",rs);return}setTimeout(cl,300)};addEventListener("resize",rs);cl();requestAnimationFrame(cl);setTimeout(cl,60);setTimeout(cl,700);   /* 11/13 開發者截圖「今日推薦會左右抖一下」：原本 60 毫秒後才推回畫面內，第一幀先畫在超出畫面的位置；改成建好立刻推、下一幀前再推一次 */const im=P.querySelector(":scope>img");if(im)im.addEventListener("load",cl)}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof shwPage==="function"&&SHIP_WALK_ON){shwPage(v,Object.assign({},SHW_PG0,SHW_HOMEMAP),"home");hmMe(P)}}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  document.body.classList.add("hm-on");const t=setInterval(()=>{if(!P.isConnected){clearInterval(t);if(!document.querySelector(".home-page"))document.body.classList.remove("hm-on")}},800)}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(HOME_MAP_ON&&!hub)homeMap(v)}catch(e){}return r}}
/* 開發者 11/11 選 ChatGPT UI 報告 UI-03：所有場景標籤（首頁、學習、對戰、設定、渡口…的 .shp-spot）上下各多 9px、左右各多 4px 的透明點選範圍，
   看起來一樣大，手指點偏一點也點得到（設定頁的小標籤原本只有約 24px 高）；::after 已經拿去做呼吸光，這裡用 ::before */
/* v5 改善單 R07（有效命中區）：上面那條「上下 9px、左右 4px」量出來不夠——::before 是從框線內緣往外擴，設定頁 23.6px 高的小標籤實際只有約 38.6px 高，也沒有管相鄰標籤的點選範圍會不會疊到。改成：
   ① 樣式（JS 還沒算之前的底線）：每個方向至少擴 4px，而且整塊至少 44×44（min() 算出要擴多少）；::before 不再跟著圓角（圓角的角落點不到），是方的。
   ② r07Hit：每頁標籤畫好、圖重排、字級改變、換頁後，量出同一個框裡所有場景標籤（首頁、學習、對戰、設定、棋譜庫、渡口的 .shp-spot，星槎的 .shp-hs，渡口景點 .po-sight），
      用 r07Solve 算每個標籤的點選範圍：先以標籤為中心擴成至少 44×44（每邊至少多 4px），超出圖（或畫面左右）就往內挪；兩個標籤的點選範圍疊到＝在兩個標籤之間的空隙正中間切開，
      切完不到 44 就往另一邊補；最後一輪只切不補，保證相鄰點選範圍不重疊。算好寫進每個標籤的 --r7l／--r7r／--r7t／--r7b。
      標籤本身就疊在一起、或兩個標籤中間空隙不夠各分 44 的，記在 r07HitReport()（瀏覽器主控台打 r07HitReport() 可以看這一頁每個標籤的點選範圍大小和問題）。
   ③ 高對比圖示（html[data-hicon]）的 .hot 標籤 ::before 是右上角的「！」徽章，原本被這裡的 inset 拉到左上角；這種標籤讓給徽章（left、bottom 改回 auto），不擴點選範圍。
   r07Solve 是純計算，tools/r07-hitcheck.js（工作區 r07\tools）用同一段程式在 390×844、375×667 換算各頁座標表檢查重疊；改這段要保留 R07SOLVE 標記 */
const R07_HIT_ON=true;
const R07_HIT_SEL=".shp-spot,.shp-hs,.po-sight";
/*R07SOLVE{*/
function r07Solve(L,o){o=o||{};const M=o.min||44,pd=o.pad==null?4:o.pad,B=o.b||{l:-1e9,t:-1e9,r:1e9,b:1e9},iss=[];
  const H=L.map(a=>{const w=Math.max(a.w+2*pd,M),h=Math.max(a.h+2*pd,M),cx=a.x+a.w/2,cy=a.y+a.h/2,q={l:cx-w/2,r:cx+w/2,t:cy-h/2,b:cy+h/2};
    if(q.l<B.l){const d=Math.max(0,Math.min(B.l-q.l,a.x-q.l));q.l+=d;q.r+=d}else if(q.r>B.r){const d=Math.max(0,Math.min(q.r-B.r,q.r-a.x-a.w));q.l-=d;q.r-=d}
    if(q.t<B.t){const d=Math.max(0,Math.min(B.t-q.t,a.y-q.t));q.t+=d;q.b+=d}else if(q.b>B.b){const d=Math.max(0,Math.min(q.b-B.b,q.b-a.y-a.h));q.t-=d;q.b-=d}
    return q});
  const ov=(p,q)=>Math.min(p.r,q.r)-Math.max(p.l,q.l)>.5&&Math.min(p.b,q.b)-Math.max(p.t,q.t)>.5,bad=new Set();
  const split=(i,j,grow)=>{const a=L[i],b=L[j],gx=Math.max(b.x-a.x-a.w,a.x-b.x-b.w),gy=Math.max(b.y-a.y-a.h,a.y-b.y-b.h);
    if(gx<-.5&&gy<-.5){bad.add(i+","+j);return false}   /* 兩個標籤本身疊超過半個像素：切不開，留給報告 */
    if(gx>=gy){const[p,A,q,C]=a.x<b.x?[H[i],a,H[j],b]:[H[j],b,H[i],a],m=(A.x+A.w+C.x)/2;p.r=Math.min(p.r,m);q.l=Math.max(q.l,m);
      if(grow){if(p.r-p.l<M)p.l=Math.max(B.l,p.r-M);if(q.r-q.l<M)q.r=Math.min(B.r,q.l+M)}}
    else{const[p,A,q,C]=a.y<b.y?[H[i],a,H[j],b]:[H[j],b,H[i],a],m=(A.y+A.h+C.y)/2;p.b=Math.min(p.b,m);q.t=Math.max(q.t,m);
      if(grow){if(p.b-p.t<M)p.t=Math.max(B.t,p.b-M);if(q.b-q.t<M)q.b=Math.min(B.b,q.t+M)}}
    return true};
  for(let it=0;it<10;it++){let ch=false;for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)if(ov(H[i],H[j])&&split(i,j,it<7))ch=true;if(!ch&&it>=7)break;if(!ch&&it<7)it=6}
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){if(bad.has(i+","+j))iss.push({t:"label",i,j});else if(ov(H[i],H[j]))iss.push({t:"overlap",i,j})}
  H.forEach((q,i)=>{const w=Math.min(q.r,B.r)-Math.max(q.l,B.l),h=Math.min(q.b,B.b)-Math.max(q.t,B.t);if(w<M-.5||h<M-.5)iss.push({t:"small",i,w:Math.round(w*10)/10,h:Math.round(h*10)/10})});
  return{H,iss}}
/*}R07SOLVE*/
let R07_LAST=[];
function r07Hit(){if(!R07_HIT_ON)return;const G=new Map(),V=document.getElementById("view"),vr=V?V.getBoundingClientRect():null;R07_LAST=[];
  document.querySelectorAll(R07_HIT_SEL).forEach(e=>{if(!e.getClientRects().length||!e.offsetWidth)return;const C=e.offsetParent;if(!C)return;if(!G.has(C))G.set(C,[]);G.get(C).push(e)});
  G.forEach((E,C)=>{const cr=C.getBoundingClientRect(),k=C.offsetWidth?cr.width/C.offsetWidth:1;if(!k||!cr.width)return;
    const E2=E.filter(e=>getComputedStyle(e).visibility!=="hidden");if(!E2.length)return;
    const clip=getComputedStyle(C).overflowX!=="visible",W=cr.width/k,Hh=cr.height/k;let l=clip?0:-1e9,r=clip?W:1e9;
    if(vr&&V.contains(C)){l=Math.max(l,(vr.left-cr.left)/k);r=Math.min(r,(vr.right-cr.left)/k)}
    const L=E2.map(e=>{const q=e.getBoundingClientRect();return{x:(q.left-cr.left)/k,y:(q.top-cr.top)/k,w:q.width/k,h:q.height/k}});
    const S=r07Solve(L,{b:{l,r,t:clip?0:-1e9,b:clip?Hh:1e9}});
    E2.forEach((e,i)=>{const a=L[i],q=S.H[i],cs=getComputedStyle(e),own=a.w/(e.offsetWidth||a.w)||1,bl=parseFloat(cs.borderLeftWidth)||0,br=parseFloat(cs.borderRightWidth)||0,bt=parseFloat(cs.borderTopWidth)||0,bb=parseFloat(cs.borderBottomWidth)||0;
      const f=v=>(Math.round(v*10)/10)+"px";e.style.setProperty("--r7l",f((q.l-a.x)/own-bl));e.style.setProperty("--r7r",f((a.x+a.w-q.r)/own-br));e.style.setProperty("--r7t",f((q.t-a.y)/own-bt));e.style.setProperty("--r7b",f((a.y+a.h-q.b)/own-bb))});
    const nm=i=>(E2[i].textContent||E2[i].id||"").trim().slice(0,16);
    R07_LAST.push({box:C.className||C.id,hit:S.H.map((q,i)=>({label:nm(i),w:Math.round(Math.min(q.r,r)-Math.max(q.l,l)),h:Math.round(Math.min(q.b,clip?Hh:1e9)-Math.max(q.t,clip?0:-1e9))})),
      issues:S.iss.map(z=>z.t==="small"?{t:"不足44",label:nm(z.i),w:z.w,h:z.h}:{t:z.t==="label"?"標籤本身相疊":"點選範圍相疊",a:nm(z.i),b:nm(z.j)})})});
  try{if(typeof r07MenuSync==="function")r07MenuSync()}catch(e){}}
function r07HitReport(){try{r07Hit()}catch(e){}return R07_LAST}
function r07HitSoon(d){if(r07HitSoon.t)return;r07HitSoon.t=setTimeout(()=>{r07HitSoon.t=0;requestAnimationFrame(()=>{try{r07Hit()}catch(e){}})},d||150)}
(()=>{try{const s=document.createElement("style");s.id="spotHit";s.textContent=`.shp-spot::before,.shp-hs::before,.po-sight::before{content:"";position:absolute;
  left:var(--r7l,min(-4px,calc((100% - 44px) / 2)));right:var(--r7r,min(-4px,calc((100% - 44px) / 2)));top:var(--r7t,min(-4px,calc((100% - 44px) / 2)));bottom:var(--r7b,min(-4px,calc((100% - 44px) / 2)))}
html[data-hicon] .shp-spot.hot::before,html[data-hicon] .shp-hs.hot::before{left:auto;bottom:auto}`;document.head.append(s)}catch(e){}
  try{if(!R07_HIT_ON)return;const go=()=>r07HitSoon();addEventListener("resize",()=>r07HitSoon(300));addEventListener("hashchange",()=>{r07HitSoon(450);setTimeout(go,1500);setTimeout(go,4500)});
    addEventListener("pointerup",()=>r07HitSoon(300),true);addEventListener("click",()=>r07HitSoon(300),true);
    document.addEventListener("load",e=>{if(e.target&&e.target.tagName==="IMG")r07HitSoon()},true);
    const V=document.getElementById("view");if(V)new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&(n.matches(R07_HIT_SEL)||n.querySelector(R07_HIT_SEL))){r07HitSoon();return}}).observe(V,{childList:true,subtree:true});
    new MutationObserver(go).observe(document.documentElement,{attributes:true,attributeFilter:["data-fz","data-hicon","class"]});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(go);go()}catch(e){}})();
