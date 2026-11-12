/* ================= 🗺 找地方：全站總覽地圖（開發者 11/11 選 Gemini 規劃書方案 01「找地方／象棋千秋總覽」，先做第 1、2 期） =================
   頂欄右側（角色頭像左邊）一顆「🗺 找地方」，每一頁都有。按了是蓋在畫面上的一層（不換頁，背後的棋照樣在），關掉就回原處。
   六個區：對弈茶樓、練棋書院、藏書閣、雲河渡口、個人小院、服務亭；點區塊展開那一區的入口，點入口才換頁。
   最下面「≡ 全部入口清單」是文字版（螢幕報讀軟體、不愛看圖的人用），上面的搜尋框打「規則」「殘局」就篩出來。
   下棋下到一半（挑戰電腦、擂台、同桌、雲河棋路、殘局、古戰場、線上對局）要換頁，先問一句；線上對局特別提醒可能算輸。
   底圖之後請 Gemini 畫（規劃書第 5 節），現在先用水墨色塊。開關 SITEMAP_ON；前綴 stm */
const SITEMAP_ON=true;
/* [區代號, 圖示, 區名, 一句說明, 入口[[名字, 網址, 搜尋關鍵字]]] */
const STM_AREAS=[
  ["tea","🍵","對弈茶樓","真人、電腦、擂台",[["對戰總覽","#/hub/battle","下棋 對戰"],["挑戰電腦","#/cpu","電腦 AI 人機 練功房 晉級賽"],["車輪戰","#/simul","一對多 車輪 多盤 同時 大師 表演"],["同桌對弈","#/pvp","兩人 雙人 面對面 家人 身邊同桌 石桌"],["線上大廳","#/lobby","真人 網路 連線 觀戰 線上"],["千秋盃","#/cup","比賽 盃賽 週六"],["朝代擂台","#/arena","擂主 擂台"],["同桌合作殘譜","#/coop","合作 一起"]]],
  ["acad","🎍","練棋書院","新手、殘局、測驗",[["學習總覽","#/hub/learn","學棋 學習"],["新手訓練營","#/camp","新手 入門 教學 第一次 怎麼走"],["棋力測驗","#/quiz","測驗 考試 程度"],["一盞茶殘局","#/canju","每日 殘局 解題"],["千秋殘局","#/ship/pz","殘局 解題 星槎"],["猜著法","#/guess","猜 大師"],["主題訓練","#/theme","主題 殺法 練習"],["錯棋重練","#/redo","錯題 複習 重練"],["象棋規則","#/terms","規則 術語 走法 怎麼下 名詞 碑林 等級 段位 修為"],["這站棋理（目前停靠的站）","#/ship/lesson","棋理 這一站"],["小實驗：棋理體驗・唐站","#/lesson/tang","棋理 體驗 唐 唐站 棄仕 解殺 實驗 小實驗"],["小實驗：先吃子還是先解圍","#/lab/grab","吃子 解圍 威脅 實驗 小實驗 貪吃"]]],
  ["lib","📚","藏書閣","古譜、大師、棋譜",[["棋譜庫","#/db","古譜 大師 棋譜 對局 比賽 研究"],["我的開局","#/openings","開局 布局"]]],
  ["ship","☁️","雲河渡口","星槎、故事、朝代",[["雲河星槎","#/adventure","星槎 冒險 故事 船"],["雲河棋路","#/journey","棋路 關卡 闖關"],["朝代渡口","#/port","渡口 園子 驛站 下船"],["古戰場","#/battle","戰役 戰場"],["星槎書架","#/ship/shelf","小說 書架 書"],["繼續閱讀","#/ship/read","閱讀 小說 章"],["起航","#/ship/sail","起航 換朝代 開船"]]],
  ["yard","🏡","個人小院","角色、戰績、收藏",[["我的角色","#/me","角色 頭像 官階 修為"],["我的戰績","#/stats","戰績 勝率 成長"],["學習週報","#/weekly","週報 一週"],["行囊","#/ship/bag","行囊 寶物 收藏"],["珍品冊","#/me/relics","珍品 收藏"],["千秋大百科","#/codex","百科 文化 圖鑑"],["九九消寒圖","#/xiaohan","消寒 節氣 冬天"]]],
  ["svc","⚙️","服務亭","設定、回首頁",[["回首頁","#/","首頁 回家"],["今日推薦（首頁告示牌）","#/today","推薦 今天 每日 告示 榜文"],["設定","#/settings","設定 家長 回饋 存檔 字級 隱私 音樂"]]]];
/* hspx 11/11「地圖底圖請找 gemini 繪製」：data/sitemap/sitemap.webp（768×1376，park/sitemap/sitemap_a.png）。
   hit＝點得到的範圍、card＝圖上那張空白直條紙籤（地名直書貼在上面），單位都是圖寬／圖高的 %，照圖量的；paper＝圖上沒有紙籤（修圖時被燈籠杆取代），標籤自己帶宣紙底。
   史學顧問 11/11 必改 4 項修過兩輪：日式石燈籠→木杆紅燈籠、泳池→湖石池、茶樓／書院／小院棋盤照 9 直 10 橫＋河界重畫；書院牆上那面最後用程式貼一面乾淨的象棋盤（park/sitemap/sitemap_a_fix3.png） */
const STM_IMGV="1111c";
const STM_MAP={ship:{hit:[0,0,50,34],card:[4.5,5,12,16]},tea:{hit:[50,4,100,37],card:[51,11,58,22]},lib:{hit:[0,34,48,64],card:[3.5,35,11,46]},
  acad:{hit:[48,37,100,64],card:[89,38,96,48.5]},yard:{hit:[0,64,55,100],card:[3.5,66,11,77]},svc:{hit:[55,64,100,100],card:[86.5,59.5,94,70],paper:1}};
/* 11/11 規格表 87（story/87_名稱與按鈕規格表.md）：首頁、頂欄用的是場景名（觀星閣、藏譜石窟、茶坊、國子監…，07z HUB_NAME 照停靠朝代換），
   地圖的區名是功能名（對弈茶樓、練棋書院）。兩個總覽入口照「場景名（功能）」寫，區塊展開時標題後面也註明首頁上叫什麼；圖上紙籤字不動（尺寸照圖量的） */
function stmHubNm(k){let n="";try{n=typeof xqHubName==="function"?xqHubName(k).split(" ").slice(1).join(" "):""}catch(e){}return n&&!/^(學習|對戰)$/.test(n)?n:""}
function stmNm(e){const k=e[1]==="#/hub/battle"?"battle":e[1]==="#/hub/learn"?"learn":"";if(!k)return e[0];const n=stmHubNm(k);return n?n+(k==="battle"?"（對弈總覽）":"（學棋總覽）"):e[0]}
const STM_AKA={tea:()=>{const n=stmHubNm("battle");return n?"首頁的「"+n+"」":"首頁的「⚔ 對戰」"},acad:()=>{const n=stmHubNm("learn");return n?"首頁的「"+n+"」":"首頁的「📚 學習」"},ship:()=>"首頁的「⛵ 雲河星槎」",yard:()=>"首頁點自己的角色"};
function stmAka(a){try{const f=STM_AKA[a];return f?`<small style="display:block;font:600 13px/1.4 var(--sans,sans-serif);letter-spacing:0;color:var(--muted)">＝${esc(f())}</small>`:""}catch(e){return""}}
/* 現在在哪：最長的網址前綴對得上的那一個入口 */
/* 開發者 11/11：在首頁時顯示「首頁」，不要說成「服務亭｜回首頁」（「回首頁」是按鈕，不是地方），服務亭也不標 📍 */
const stmAtHome=h=>h==="#/"||h===""||h==="#";
function stmHere(){const h=location.hash||"#/";if(stmAtHome(h))return"首頁";let best=null,bl=-1;
  for(const A of STM_AREAS)for(const e of A[4]){const r=e[1];const hit=r!=="#/"&&(h===r||h.startsWith(r+"/"));if(hit&&r.length>bl){best=[A,e];bl=r.length}}
  if(best)return best[0][2]+"｜"+stmNm(best[1]);const t=document.getElementById("title");return(t&&t.textContent.trim())||"象棋千秋"}
const stmBusy=()=>/^#\/(cpu|arena|pvp|journey\/play|redo\/play)(\/|$)|^#\/battle\/[a-z]+\/\d+|^#\/canju\/.+|^#\/theme\/.+/.test(location.hash);
const stmOnline=()=>{try{return !!(window.XQNet&&XQNet.playing&&XQNet.playing())}catch(e){return false}};
function stmCss(){if(document.getElementById("stmCss"))return;const s=document.createElement("style");s.id="stmCss";s.textContent=`
#topRight .stm-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:2px 4px;line-height:1}
#topRight .stm-btn b{font-size:20px;font-weight:400}#topRight .stm-btn small{font-size:10.5px;margin-top:1px;white-space:nowrap;letter-spacing:.02em}
#stmOv{--text:#2a2018;--muted:#6f5f4c;--card:#FFF9EE;--line:#d8c8b0;--accent:#A8322A;position:fixed;inset:0;z-index:9000;background:#F4EDE0;color:var(--text);overflow:auto;-webkit-overflow-scrolling:touch;opacity:0;transition:opacity .2s;padding:max(8px,env(safe-area-inset-top)) 14px calc(24px + env(safe-area-inset-bottom))}
#stmOv.on{opacity:1}#stmOv .in{max-width:600px;margin:0 auto}
#stmOv .hd{display:flex;align-items:center;gap:8px;position:sticky;top:calc(-1 * max(8px,env(safe-area-inset-top)));background:#F4EDE0;padding:6px 0;z-index:2}
#stmOv .hd h2{flex:1;margin:0;font:900 20px/1.2 var(--serif,serif);text-align:center;letter-spacing:.08em}
#stmOv .x{min-height:44px;min-width:44px;padding:0 10px;border-radius:10px;border:1.5px solid var(--line,#cbb);background:var(--card,#fff);color:inherit;font:700 14px/1 var(--sans,sans-serif)}
#stmOv .q{width:100%;box-sizing:border-box;min-height:44px;margin:6px 0 4px;padding:8px 12px;border-radius:12px;border:1.5px solid var(--line,#cbb);background:var(--card,#fff);color:inherit;font:16px var(--sans,sans-serif)}
#stmOv .tip{margin:2px 0;color:var(--muted,#777);font-size:13.5px;text-align:center}
#stmOv .here{margin:8px 0 12px;padding:8px 12px;border-radius:12px;background:color-mix(in srgb,var(--accent,#a33) 10%,transparent);font-size:14.5px}
#stmOv .warn{margin:0 0 10px;padding:8px 12px;border-radius:12px;background:#FFF3C4;color:#5A4300;font-size:14px;border:1px solid #E8C860}
#stmOv .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#stmOv .ar{display:flex;flex-direction:column;align-items:center;gap:2px;min-height:96px;padding:12px 8px;border-radius:16px;border:2px solid var(--line,#cbb);background:var(--card,#fff);color:inherit;font:inherit;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.06)}
#stmOv .ar i{font-style:normal;font-size:30px;line-height:1.1}#stmOv .ar b{font:900 17px/1.3 var(--serif,serif);letter-spacing:.06em}#stmOv .ar small{color:var(--muted,#777);font-size:12.5px}
#stmOv .ar.on{border-color:var(--accent,#a33);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#a33) 30%,transparent)}
#stmOv .ar.cur{background:color-mix(in srgb,var(--accent,#a33) 8%,var(--card,#fff))}
#stmOv .sub{margin-top:10px;padding:10px;border-radius:14px;border:1.5px dashed var(--line,#cbb);display:flex;flex-wrap:wrap;gap:8px;background:var(--card)}
#stmOv .sub .st{width:100%;font:900 16px var(--serif,serif);letter-spacing:.06em}
#stmOv .mp{position:relative;container-type:inline-size;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(60,40,20,.18);user-select:none;-webkit-user-select:none}
#stmOv .mp[hidden],#stmOv .grid[hidden]{display:none}
#stmOv .mp img{display:block;width:100%;height:auto}
#stmOv .hs{position:absolute;background:transparent;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:12px}
#stmOv .hs:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
#stmOv .hs.on{background:radial-gradient(closest-side,rgba(255,236,190,.0),rgba(255,226,160,.22))}
#stmOv .lb{position:absolute;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;text-orientation:upright;pointer-events:none;
  font:900 4.1cqw/1.05 var(--serif,serif);letter-spacing:.06em;color:#2a2018;border-radius:4px;box-sizing:border-box;transition:color .2s,box-shadow .2s}
#stmOv .lb.pp{background:#F6EFE2;border:1px solid #d8c8b0;box-shadow:0 1px 3px rgba(60,40,20,.18)}#stmOv .lb.cur{color:var(--accent)}#stmOv .lb.cur::after{content:"📍";position:absolute;top:-3.4cqw;font-size:3.4cqw;writing-mode:horizontal-tb}
#stmOv .lb.on{box-shadow:0 0 0 2px var(--accent),0 0 12px rgba(168,50,42,.45);color:var(--accent)}
#stmOv .go{min-height:44px;padding:8px 14px;border-radius:12px;border:1.5px solid var(--line,#cbb);background:var(--card,#fff);color:inherit;font:700 15px/1.2 var(--sans,sans-serif);cursor:pointer}
#stmOv .go.cur{border-color:var(--accent,#a33);color:var(--accent,#a33)}#stmOv .go[disabled]{opacity:.5}
#stmOv .all{width:100%;min-height:44px;margin:14px 0 6px;border-radius:12px;border:1.5px solid var(--line,#cbb);background:transparent;color:inherit;font:700 15px var(--sans,sans-serif)}
#stmOv .list h3{margin:12px 0 6px;font:900 15px var(--serif,serif)}#stmOv .list ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
#stmOv .none{color:var(--muted,#777);font-size:14px;margin:8px 0}
@media (prefers-reduced-motion:reduce){#stmOv{transition:none}}`;document.head.append(s)}
/* 頂欄的 🗺 地圖鈕（11/11 起只有圖示）：每次 setTop 重畫頂欄後補上（放在 #topRight 最後＝角色頭像左邊） */
function stmBtn(){if(!SITEMAP_ON)return;const tr=document.getElementById("topRight");if(!tr||tr.querySelector(".stm-btn"))return;stmCss();
  const b=document.createElement("button");b.type="button";b.className="ib stm-btn";b.setAttribute("aria-label","地圖：打開全站地圖");b.title="地圖";b.innerHTML="<b aria-hidden=\"true\">🗺</b>";   /* 開發者 11/11：拿掉「找地方」三個字，只留地圖圖示 */
  b.onclick=()=>{try{vibrate(5)}catch(e){}stmOpen()};tr.append(b)}
if(SITEMAP_ON&&typeof setTop==="function"){const stmTop0=setTop;setTop=function(){const r=stmTop0.apply(this,arguments);try{stmBtn()}catch(e){}return r}}
let stmLast=null;
function stmClose(){const o=document.getElementById("stmOv");if(!o)return;o.classList.remove("on");removeEventListener("hashchange",stmClose);document.removeEventListener("keydown",stmKey,true);setTimeout(()=>o.remove(),200);if(stmLast&&stmLast.isConnected)try{stmLast.focus()}catch(e){}stmLast=null}
function stmKey(e){const o=document.getElementById("stmOv");if(!o)return;if(e.key==="Escape"){e.preventDefault();stmClose();return}
  if(e.key==="Tab"){const f=[...o.querySelectorAll("button,input")].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}}
/* 換頁：下棋下到一半先問 */
function stmGo(name,route){const go=()=>{stmClose();if(route==="#/"&&typeof goHome==="function")goHome();else location.hash=route};
  const h=location.hash||"#/";if(h===route||(route!=="#/"&&h.startsWith(route+"/")&&!stmBusy())){stmClose();return}
  /* 開發者 11/11 選 ChatGPT UI-13：照模式說清楚離開的後果——跟電腦下、擂台、同桌、雲河棋路、殘局、古戰場都一步一存（07m4-resume.js），回來接著下、不算輸；
     線上對戰對方那邊時鐘照走，時間到會判負 */
  if(stmOnline())return confirmBox(`線上這盤還沒下完：對方那邊時鐘照走，時間到會判你輸。確定要去「${name}」嗎？`,go,"確定前往");
  if(stmBusy())return confirmBox(`這盤會先存起來，回來可以接著下。要去「${name}」嗎？`,go,"確定前往");go()}
function stmOpen(){if(document.getElementById("stmOv"))return;stmCss();stmLast=document.activeElement;
  const here=stmHere(),h=location.hash||"#/",net=navigator.onLine!==false,cur=r=>r!=="#/"&&(h===r||h.startsWith(r+"/"));
  const o=document.createElement("div");o.id="stmOv";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label","象棋千秋總覽");
  const entry=e=>{const off=e[1]==="#/lobby"&&!net,nm=stmNm(e);return`<button class="go${cur(e[1])?" cur":""}" data-r="${esc(e[1])}" data-n="${esc(nm)}"${off?" disabled":""}>${esc(nm)}${off?"（要連網路）":""}</button>`};
  o.innerHTML=`<div class="in"><div class="hd"><button class="x" id="stmX">✕ 關閉地圖</button><h2>象棋千秋總覽</h2><span style="min-width:44px"></span></div>
    <input class="q" id="stmQ" type="search" placeholder="🔍 搜尋入口，例如「規則」「殘局」" aria-label="搜尋入口" enterkeyhint="search">
    <p class="tip">點地圖上的地方，馬上帶你過去！</p>
    <div class="here">📍 你現在在：<b>${esc(here)}</b></div>
    ${stmOnline()?'<div class="warn">⚠ 線上對局進行中：看地圖不會停下時鐘，換頁可能算輸。</div>':stmBusy()?'<div class="warn">⚠ 這盤棋還沒下完：看地圖沒關係，換頁前會先問你。</div>':""}
    <div class="mp" id="stmM"><img src="data/sitemap/sitemap.webp?v=${STM_IMGV}" alt="" aria-hidden="true" draggable="false">${STM_AREAS.map(A=>{const M=STM_MAP[A[0]],h=M.hit,c=M.card,on=A[4].some(e=>cur(e[1]));
      return`<button class="hs" data-a="${A[0]}" aria-expanded="false" aria-label="${esc(A[2]+"："+A[3])}${on?"（你在這裡）":""}" style="left:${h[0]}%;top:${h[1]}%;width:${h[2]-h[0]}%;height:${h[3]-h[1]}%"></button><span class="lb${on?" cur":""}${M.paper?" pp":""}" data-l="${A[0]}" aria-hidden="true" style="left:${c[0]}%;top:${c[1]}%;width:${c[2]-c[0]}%;height:${c[3]-c[1]}%">${esc(A[2])}</span>`}).join("")}</div>
    <div class="grid" id="stmG">${STM_AREAS.map(A=>`<button class="ar${A[4].some(e=>cur(e[1]))?" cur":""}" data-a="${A[0]}" aria-expanded="false"><i aria-hidden="true">${A[1]}</i><b>${esc(A[2])}</b><small>${esc(A[3])}</small></button>`).join("")}</div>
    <div id="stmSub"></div>
    <button class="all" id="stmAll" aria-expanded="false">≡ 顯示全部入口清單</button>
    <div class="list" id="stmL" hidden>${STM_AREAS.map(A=>`<section data-a="${A[0]}"><h3>${A[1]} ${esc(A[2])}</h3><ul>${A[4].map(e=>`<li data-k="${esc((e[0]+" "+stmNm(e)+" "+e[2]+" "+A[2]).toLowerCase())}">${entry(e)}</li>`).join("")}</ul></section>`).join("")}<p class="none" id="stmNone" hidden>找不到這個入口，換個字試試看。</p></div></div>`;
  document.body.append(o);requestAnimationFrame(()=>o.classList.add("on"));
  const G=o.querySelector("#stmG"),L=o.querySelector("#stmL"),Q=o.querySelector("#stmQ"),AL=o.querySelector("#stmAll");
  const bind=root=>root.querySelectorAll(".go[data-r]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}stmGo(b.dataset.n,b.dataset.r)});
  /* 底圖載得到＝點圖上的地方；載不到（離線、CDN 慢）＝退回色塊卡片。點了在圖下方展開那一區的入口（再點一次收起） */
  const MP=o.querySelector("#stmM"),IM=MP.querySelector("img"),SB=o.querySelector("#stmSub");
  let imgOk=false,qOn=false;const useImg=ok=>{imgOk=ok;MP.hidden=!ok||qOn;G.hidden=ok||qOn};useImg(false);IM.onload=()=>useImg(true);IM.onerror=()=>useImg(false);if(IM.complete&&IM.naturalWidth)useImg(true);
  o.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}const k=b.dataset.a,was=b.classList.contains("on");SB.innerHTML="";
    o.querySelectorAll("[data-a]").forEach(x=>{x.classList.remove("on");x.setAttribute("aria-expanded","false")});o.querySelectorAll(".lb").forEach(x=>x.classList.remove("on"));if(was)return;
    const A=STM_AREAS.find(x=>x[0]===k);o.querySelectorAll(`[data-a="${k}"]`).forEach(x=>{x.classList.add("on");x.setAttribute("aria-expanded","true")});const lb=o.querySelector(`.lb[data-l="${k}"]`);if(lb)lb.classList.add("on");
    SB.innerHTML=`<div class="sub" role="group" aria-label="${esc(A[2])}"><b class="st">${A[1]} ${esc(A[2])}${stmAka(A[0])}</b>${A[4].map(entry).join("")}</div>`;bind(SB);
    const f=SB.querySelector(".go:not([disabled])");if(f)f.focus({preventScroll:true});SB.scrollIntoView({block:"nearest",behavior:"smooth"})});
  const showList=on=>{L.hidden=!on;AL.setAttribute("aria-expanded",String(on));AL.textContent=on?"≡ 收起全部入口清單":"≡ 顯示全部入口清單"};
  AL.onclick=()=>showList(L.hidden);bind(L);
  /* 開發者 11/11 選 ChatGPT UI 報告 UI-04：搜尋有字時，地圖、說明、區域卡、展開的入口、「顯示全部」都先收起來，結果直接接在搜尋框下面，上面寫「找到 N 個入口」；
     清空就照原樣放回（清單原本開著就開著）。Enter 只有剛好一個結果才直接過去，好幾個就把焦點移到第一個，讓玩家自己選 */
  const QH=[...o.querySelectorAll(".tip,.here,.warn"),SB,AL],QC=document.createElement("p");QC.className="tip";QC.id="stmCnt";QC.setAttribute("aria-live","polite");QC.hidden=true;L.before(QC);let listWas=false;
  Q.oninput=()=>{const k=Q.value.trim().toLowerCase();
    if(k&&!qOn){qOn=true;listWas=!L.hidden;QH.forEach(x=>x.hidden=true);useImg(imgOk);showList(true);o.scrollTop=0}
    else if(!k&&qOn){qOn=false;QH.forEach(x=>x.hidden=false);useImg(imgOk);showList(listWas)}
    let n=0;L.querySelectorAll("li").forEach(li=>{const ok=!k||k.split(/\s+/).every(w=>li.dataset.k.includes(w));li.hidden=!ok;if(ok)n++});
    L.querySelectorAll("section").forEach(s=>s.hidden=![...s.querySelectorAll("li")].some(li=>!li.hidden));o.querySelector("#stmNone").hidden=n>0;
    QC.hidden=!k||!n;QC.textContent=n?`找到 ${n} 個入口，點一下就過去`:""};
  Q.onkeydown=e=>{if(e.key==="Enter"){const F=[...L.querySelectorAll("li:not([hidden]) .go:not([disabled])")];if(F.length===1)F[0].click();else if(F.length)F[0].focus()}};
  o.querySelector("#stmX").onclick=stmClose;addEventListener("hashchange",stmClose);document.addEventListener("keydown",stmKey,true);setTimeout(()=>{try{o.querySelector("#stmX").focus()}catch(e){}},30)}
