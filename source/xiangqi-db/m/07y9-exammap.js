/* ================= 🎯 棋力測驗「香案開考＋十五格題名榜」（42 案第 2 頁：Gemini 方案 1，Claude 依考究清單修正；考究說明 park/exammap/考究說明.md，史學顧問核圖中）=================
   圖：park/exammap/exam_day_v3.png（Gemini 第一張；榜上 12 條格線用程式抹白、桌上厚書和走道局部修、宣紙濾鏡 0.6）、夜版 exam_night_v1.png（考桌兩端兩座落地燭台，無燈罩）；
     小素材 ex_paper（攤開的試卷，綠幕去背）→ art/exammap/ → data/exammap/。
   從學習頁的「大考桌」進來（#/quiz）。開考前：角色走到香案前鞠躬（宋代「設香案，主司與舉人對拜」），再開考。
     案上三份卷子＝三個開始鈕：素封＝我是新手、朱封＝從上次的程度開始（沒考過就不顯示）、墨封＝我會下棋。點了＝按原本 03 的按鈕。
     桌左疊的冊子＝題源（《適情雅趣》《橘中秘》《梅花譜》、名局），點了看出處。
   牆上十五格題名榜（程式畫 15 格和級名）：最近一次估計的那一級蓋朱印「吾」；80% 範圍用一道朱筆括號括住；破紀錄（這次就是最好成績）在印外再加一個朱圈。
   結果頁的大卡做成一份「批回的試卷」（底用 ex_paper）。開關 EXAM_MAP_ON；圖片網址帶 EX2_IMGV；前綴 ex2。包一層 Quiz */
const EXAM_MAP_ON=true;
const EX2_IMGV="2390";
const EX2_RK=["新手","入門1","入門2","入門3","業1","業2","業3","業4","業5","業6","業7","業8","業9","專1","專2"];
const EX2_BOARD=[106,134,664,519];   /* 榜面（左、上、右、下，像素 768×1376） */
/* [id, 原本的按鈕, 卷子位置, 標籤位置（中間那份放高一排，免得三個標籤疊在一起）, 標籤] */
const EX2_SCROLL=[["ex2S0","#go",385,718,372,652,"我是新手"],["ex2S1","#go3",462,712,462,598,"從上次開始"],["ex2S2","#go2",548,722,558,652,"我會下棋"]];   /* 11/10 開發者「排版很醜很歪」：我是新手、我會下棋往中間靠，各自對齊底下那卷 */
const SHW_EX2={el:40,h:[.09,92,.003],look0:[50,60],home:"home",N:{home:[50,97],altar:[50,83]},E:"home-altar",
  HS:{ex2S0:["altar",50,64,"bow"],ex2S1:["altar",50,64,"bow"],ex2S2:["altar",50,64,"bow"],ex2Book:["altar",25,50,"idle"]}};
const ex2Pc=(x,y)=>[(x/7.68).toFixed(2),(y/13.76).toFixed(2)];
const ex2Dark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
function ex2Css(){if(document.getElementById("ex2Css"))return;const s=document.createElement("style");s.id="ex2Css";s.textContent=`
.ex2-page{margin:0 0 6px}
.ex2-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.ex2-board{position:absolute}
.ex2-board svg{display:block;width:100%;height:100%}
.ex2-night .ex2-board{filter:brightness(.92) sepia(.15)}
.ex2-page .shp-spot.ex2-tag b{white-space:nowrap}
.ex2-page .shp-spot.ex2-small{padding:2px 9px}.ex2-page .shp-spot.ex2-small b{font-size:12px}
.ex2-paper{background:url(data/exammap/ex_paper.webp?v=${EX2_IMGV}) center/100% 100% no-repeat !important;border:0 !important;box-shadow:0 3px 10px rgba(60,40,20,.25) !important;padding:44px 26px 34px !important;color:#2a1d12}
.ex2-paper .muted{color:#6a5640 !important}.ex2-paper .card{background:rgba(255,250,238,.55) !important}
.ex2-paper b[style*="font-size:18px"]{color:#b23a26}`;document.head.append(s)}
/* 十五格題名榜：級名直寫；目前那一級蓋「吾」印；80% 範圍用朱筆括號；破紀錄在印外加朱圈 */
function ex2BoardSVG(){const W=558,H=385,n=15,cw=W/n,qt=store.get("quizTheta",null),best=store.get("quizBest",null);
  const tier=th=>Math.max(0,Math.min(n-1,Math.round(th/.55+7)));
  let g="";for(let i=1;i<n;i++)g+=`<line x1="${(i*cw).toFixed(1)}" y1="6" x2="${(i*cw).toFixed(1)}" y2="${H-6}" stroke="rgba(60,40,24,.55)" stroke-width="1.1"/>`;
  g+=EX2_RK.map((r,i)=>`<text x="${(i*cw+cw/2).toFixed(1)}" y="26" style="writing-mode:vertical-rl;text-orientation:upright" text-anchor="start" font-size="17" font-weight="800" letter-spacing="1" fill="#2a1d12" font-family="var(--kai,serif)">${esc(r)}</text>`).join("");
  if(qt&&isFinite(qt.th)){const ti=tier(qt.th),lo=tier(qt.th-1.28*(qt.se||1)),hi=tier(qt.th+1.28*(qt.se||1)),x=ti*cw+cw/2,y=H-92,rec=best&&best.at&&qt.at&&Math.abs(best.at-qt.at)<5000;
    g+=`<path d="M${(lo*cw+5).toFixed(1)} ${H-30}q0 14 10 14H${((hi+1)*cw-15).toFixed(1)}q10 0 10 -14" fill="none" stroke="#b23a26" stroke-width="2.4" stroke-linecap="round"/>`;
    g+=`<g transform="rotate(-8 ${x.toFixed(1)} ${y})"><rect x="${(x-15).toFixed(1)}" y="${y-15}" width="30" height="30" rx="2" fill="rgba(255,236,226,.35)" stroke="#b23a26" stroke-width="2.4"/><text x="${x.toFixed(1)}" y="${y+7}" text-anchor="middle" font-size="20" font-weight="900" fill="#b23a26" font-family="var(--kai,serif)">吾</text></g>`;
    if(rec)g+=`<circle cx="${x.toFixed(1)}" cy="${y}" r="27" fill="none" stroke="#b23a26" stroke-width="2" stroke-dasharray="150 10" opacity=".9"/>`}
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${g}</svg>`}
/* 題源：古譜的年代（書院跨時代收藏，不是宋版） */
function ex2Books(){sheet("📚 題源",b=>{b.innerHTML=`<div style="line-height:1.85;font-size:15px">
  <p>書院案頭收著幾部棋譜（跨時代的收藏，不是宋版）：</p>
  <p>・《適情雅趣》：明代隆慶四年（1570）出版，金陵徐芝編著的象棋譜。<br>・《橘中秘》：明末朱晉楨著的象棋譜。<br>・《梅花譜》：清初王再越（康熙年間人）著的象棋譜。<br>・名局：特級大師和全國比賽的實戰局面。</p>
  <p class="muted">四類題：殺法、戰術、局面判斷、殘局。答案由 Pikafish 深度計算。</p></div>`})}
function ex2Mount(v){if(!EXAM_MAP_ON||v.querySelector(".ex2-page"))return;const intro=!!v.querySelector("#go"),res=!intro&&/估計棋力/.test(v.textContent||"");if(!intro&&!res)return;ex2Css();
  const dk=ex2Dark(),P=document.createElement("div");P.className="shp-page cq ex2-page"+(dk?" ex2-night":"");
  const sp=(id,x,y,t,cl,hide)=>{const[a,b]=ex2Pc(x,y);return`<button class="shp-spot ex2-tag${cl?" "+cl:""}" id="${id}" style="left:${a}%;top:${b}%${hide?";display:none":""}"><b>${t}</b></button>`};
  const[bl,bt,br,bb]=EX2_BOARD;
  P.innerHTML=`<img src="${xqClImg(`data/exammap/${dk?"exam_night":"exam_day"}.webp?v=${EX2_IMGV}`)}" alt="書院講堂的考桌和題名榜">
    <div class="ex2-fx"><div class="ex2-board" style="left:${(bl/7.68).toFixed(2)}%;top:${(bt/13.76).toFixed(2)}%;width:${((br-bl)/7.68).toFixed(2)}%;height:${((bb-bt)/13.76).toFixed(2)}%">${ex2BoardSVG()}</div></div>
    ${intro?EX2_SCROLL.map(([id,sel,,,lx,ly,t])=>sp(id,lx,ly,t,"",!v.querySelector(sel))).join(""):""}${sp("ex2Book",195,640,"📚 題源","ex2-small")}`;
  const pad=v.querySelector(".pad");v.insertBefore(P,pad||v.firstChild);
  if(intro)for(const[id,sel]of EX2_SCROLL){const b=P.querySelector("#"+id);if(b)b.onclick=()=>{const t=v.querySelector(sel);if(t)t.click()}}
  P.querySelector("#ex2Book").onclick=()=>ex2Books();
  if(res){const c=pad&&pad.querySelector(".card");if(c)c.classList.add("ex2-paper")}
  if(!P.dataset.shw){try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_EX2),"ex2")}catch(e){}}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Quiz==="function"){const f0=Quiz;Quiz=function(v){const R=f0.apply(this,arguments);try{if(EXAM_MAP_ON){ex2Mount(v);const mo=new MutationObserver(()=>{if(!v.isConnected||!/^#\/quiz/.test(location.hash)){mo.disconnect();return}try{ex2Mount(v)}catch(e){}});mo.observe(v,{childList:true})}}catch(e){}return R}}
