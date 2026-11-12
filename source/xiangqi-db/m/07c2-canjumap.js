/* ================= 🍵 一盞茶殘局「宋代點茶席」（11/9 起秦到隋、唐五代另有各朝版，見 CJM_ERA）（開發者 11/9 選定 Gemini 方案 1，Claude 依考究清單修正；考究說明 park/canjumap/考究說明.md，史學顧問核圖中）=================
   圖：park/canjumap/canju_day_v4.png（Gemini 重畫兩次＋一次局部修：宋式船形茶碾、朱漆盞托；程式把桌色壓成青石灰）、夜版 canju_night_v1.png（燭台、風爐炭火）→ art/canjumap/ → data/canjumap/。
   書院中庭青石茶桌：一口＝小青白瓷茶甌、一盞＝兔毫建盞配盞托、一壺＝宋式湯瓶（小口無蓋、長流），點了直接開那一題（#/canju/<題號>，跟原本的茶單按鈕一樣）。
   程式疊的狀態：解開的那件浮出白色湯花（湯瓶冒熱氣）；三題都解開＝「分茶／茶百戲」（陶穀《清異錄》），大盞湯花裡浮現一顆「帥」字棋子紋；
     每天依季節飄落一片花葉（春桃杏、夏荷、秋桂楓、冬梅，不用櫻）。角色站在茶桌前待機，三題都解開時點茶器改成歡呼。
   包一層 CanjuDaily(v)：原本的茶單、自由練習、說明都留在圖下面（還是那些按鈕，跳過一壺也照舊）。接 07w 走路（SHW_CJ）、07x 縮放。開關 CANJU_MAP_ON；圖片網址帶 CJM_IMGV */
const CANJU_MAP_ON=true;
const CJM_IMGV="2330";
/* 三件茶器（像素，768×1376）：[槽位, 口沿中心 x, y, 半寬, 半高, 點選框中心 x, y, 寬, 高] */
const CJM_VES=[["sip",241,638,50,12,241,652,120,70],["cup",401,555,73,16,401,590,190,120],["pot",586,417,24,6,586,520,150,230]];
const CJM_SPOUT=[500,430];
/* 11/9 史學顧問盤查 C 類：照星槎停靠的朝代換茶法（考究說明 park/canjumap/考究說明_各朝_1109.md；圖 canju_<day|night>_<組>.webp，宋以後、沒停靠用原圖）。
   weijin＝秦到隋「煮茶」：陶臼木杵、長柄瓢、青瓷碗配青瓷盤托、青瓷小碗、青瓷盤口壺（沒有流＝不冒壺嘴熱氣）、陶爐上架陶釜；湯是茶色，不是白色湯花；
     三題全解＝大碗湯面一圈圈漣漪、熱氣變濃，不出字（顧問：加蔥薑橘皮煮的茶湯不會浮出白紋）。
   tang＝唐五代「煎茶」（《茶經》）：木茶碾、竹夾竹則、越窯青瓷碗配朱漆盞托、白瓷小甌、青瓷執壺、風爐上架生鐵鍑；三題全解＝大碗浮起一層細白「沫餑」，不出字。
   宋以後照舊：白色湯花，三題全解＝分茶「帥」字紋。器物口沿座標各組量過（盤口壺比湯瓶高、口寬） */
const CJM_ERA={qin:"weijin",han:"weijin",sanguo:"weijin",weijin:"weijin",nanbei:"weijin",sui:"weijin",tang:"tang",wudai:"tang"};
const CJM_VES_G={weijin:[["sip",242,635,50,12,241,652,120,70],["cup",401,563,74,17,401,592,190,120],["pot",588,404,55,8,588,515,150,240]],
  tang:[["sip",241,638,50,12,241,652,120,70],["cup",401,567,76,17,401,595,190,120],["pot",587,427,46,8,587,522,150,230]]};
const CJM_SPOUT_G={weijin:null,tang:[510,474]};
function cjmG(){let e="";try{e=typeof hbDockEra==="function"?hbDockEra():typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt()||"":""}catch(x){}return CJM_ERA[e]||""}
const SHW_CJ_BASE={el:42,h:[.085,70,.0012],look0:[52,45],home:"home",N:{home:[50,96],mid:[46,90],tbl:[40,84],te:[62,84],tl2:[28,76],tt:[61,57]},E:"home-mid mid-tbl tbl-te mid-te tbl-tl2 mid-tl2",
  T:{tt:"tea"},   /* 回饋 820：石茶桌桌面可以走，繞過茶筅、茶碾、黑盞、白盞、執壺；前角、左前兩個跳點 */
  TB:{tea:{poly:[[0,39],[17,31],[60,31],[100,40],[100,44],[62,59],[0,49.5]],hy:[59,76,1],hops:[["te",[61,57]],["tl2",[26,52.5]]],
    ob:[[[26,33],[36,33],[36,39.5],[26,39.5]],[[34,32],[63,32],[63,40.5],[34,40.5]],[[41,40],[63,40],[63,48.5],[41,48.5]],[[24,45],[38,45],[38,50.5],[24,50.5]],[[65,29],[85,29],[85,45.5],[65,45.5]]]}}};   /* 回饋 816：點石茶桌桌面任何一處＝跳上桌角 */   /* 回饋 808：點茶具＝跳上石茶桌最前面的桌角（茶盞右下的空處，不擋茶具），鞠躬 */
const cjmPc=(x,y)=>[x/7.68,y/13.76];
/* 秦到隋組：陶臼挪到桌面左後角 (48–196, 438–572 像素)，桌面走路多一塊障礙 */
function cjmShw(g){if(g!=="weijin")return SHW_CJ_BASE;const B=JSON.parse(JSON.stringify(SHW_CJ_BASE));B.TB.tea.ob.push([[6,32],[25.5,32],[25.5,41.5],[6,41.5]]);return B}
const cjmDark=()=>{const t=store.get("pageTheme","auto");return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)};
/* 今天的季節花葉（依月份，一天一種）：[名稱, 顏色, 形狀] */
function cjmLeaf(){const m=new Date().getMonth()+1,d=new Date().getDate();
  const S=m>=3&&m<=5?[["桃花瓣","#f2b8c0","p"],["杏花瓣","#f6dcd8","p"]]:m>=6&&m<=8?[["荷花瓣","#f4c6cf","l"]]:m>=9&&m<=11?[["桂花","#f0c24a","s"],["楓葉","#c8442c","m"]]:[["梅花瓣","#fbf3ee","p"],["紅梅瓣","#d4505a","p"]];return S[d%S.length]}
function cjmLeafSvg(c,k){const P={p:"M0-6C4-6 6-1 0 6C-6-1-4-6 0-6Z",l:"M0-9C5-7 6 2 0 9C-6 2-5-7 0-9Z",s:"M-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M0-3a3 3 0 1 0 0 6",m:"M0-8L2-3L7-4L4 0L7 4L2 3L0 8L-2 3L-7 4L-4 0L-7-4L-2-3Z"}[k];
  return`<svg viewBox="-10 -10 20 20"><path d="${P}" fill="${c}" stroke="rgba(80,50,30,.45)" stroke-width=".6"/></svg>`}
function cjmCss(){if(document.getElementById("cjmCss"))return;const s=document.createElement("style");s.id="cjmCss";s.textContent=`
.cjm-page{margin:0 0 8px}
.cjm-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cjm-foam{position:absolute;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse at 45% 40%,#fffdf6 0,#f7f1e2 55%,#e8dcc0 80%,rgba(232,220,192,0) 100%);box-shadow:inset 0 1px 2px rgba(120,90,50,.25);opacity:.96}
.cjm-foam::after{content:"";position:absolute;inset:18% 14%;border-radius:50%;background:radial-gradient(circle at 30% 40%,rgba(255,255,255,.9) 0 6%,transparent 7%),radial-gradient(circle at 62% 55%,rgba(255,255,255,.8) 0 5%,transparent 6%),radial-gradient(circle at 48% 30%,rgba(255,255,255,.7) 0 4%,transparent 5%)}
.cjm-art{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.cjm-art svg{width:62%;height:100%;overflow:visible}
.cjm-steam{position:absolute;width:9%;aspect-ratio:1/2;transform:translate(-50%,-100%)}
.cjm-steam i{position:absolute;bottom:0;left:50%;width:30%;height:100%;border-radius:50%;background:linear-gradient(to top,rgba(255,255,255,.75),rgba(255,255,255,0));filter:blur(3px);animation:cjmSteam 3.2s ease-in-out infinite;opacity:0}
.cjm-steam i:nth-child(2){left:28%;animation-delay:-1.1s}.cjm-steam i:nth-child(3){left:66%;animation-delay:-2.1s}
@keyframes cjmSteam{0%{transform:translate(-50%,0) scaleY(.4);opacity:0}30%{opacity:.85}100%{transform:translate(-30%,-45%) scaleY(1.1);opacity:0}}
.cjm-leaf{position:absolute;width:4%;aspect-ratio:1;animation:cjmFall 9s linear infinite}
.cjm-leaf svg{width:100%;height:100%;display:block}
@keyframes cjmFall{0%{transform:translate(0,-40vh) rotate(0)}70%{transform:translate(-14vw,0) rotate(220deg)}100%{transform:translate(-16vw,0) rotate(240deg)}}
.cjm-hit{position:absolute;transform:translate(-50%,-50%);border:0;padding:0;background:none;cursor:pointer;pointer-events:auto;border-radius:30%;min-width:44px;min-height:44px}   /* 第 12 輪 F2：茶杯點區跟上面同名的標籤是同一個動作（點了就是按那個標籤），改成不是按鈕（aria-hidden、不進 Tab 順序，鍵盤與螢幕報讀用標籤），也至少 44×44；第 11 輪「一口」點區 59×34 又和標籤疊成兩個目標 */
.cjm-page .shp-spot.cjm-tag{padding:3px 9px}.cjm-page .shp-spot.cjm-tag b{font-size:13px;white-space:nowrap}
.cjm-page .shp-spot.cjm-tag.done{border-color:#B5452B}.cjm-page .shp-spot.cjm-tag.done b{color:#ffd9c8}
.cjm-foam.boil{background:radial-gradient(ellipse at 45% 40%,#d8b878 0,#c29a58 60%,#a67c42 86%,rgba(166,124,66,0) 100%);opacity:.92}.cjm-foam.boil::after{display:none}
.cjm-rip{position:absolute;inset:6% 4%}.cjm-rip i{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(255,238,205,.8);opacity:0;animation:cjmRip 2.8s ease-out infinite}.cjm-rip i:nth-child(2){animation-delay:-.93s}.cjm-rip i:nth-child(3){animation-delay:-1.86s}
@keyframes cjmRip{0%{transform:scale(.15);opacity:.95}100%{transform:scale(1);opacity:0}}
.cjm-mo{position:absolute;inset:5%;border-radius:50%;background:radial-gradient(circle,#fff 0 28%,rgba(255,255,255,0) 32%) 0 0/5px 4px,radial-gradient(circle,rgba(255,255,255,.9) 0 26%,rgba(255,255,255,0) 30%) 2px 2px/7px 5px,radial-gradient(ellipse,#fffdf7 0,#f5eedd 70%,rgba(245,238,221,.7) 100%);box-shadow:inset 0 0 3px rgba(150,120,70,.35)}
.cjm-steam.thick i{filter:blur(4px)}
@media (prefers-reduced-motion:reduce){.cjm-rip i{animation:none;opacity:.6}.cjm-steam i{animation:none;opacity:.6}.cjm-leaf{animation:none;transform:translate(-8vw,0) rotate(30deg)}}`;document.head.append(s)}
function canjuMap(v){if(v.querySelector(".cjm-page"))return;const wrap=v.querySelector(".cj-wrap");if(!wrap||typeof cjState!=="function")return;cjmCss();
  const S=cjState(),L=S.day===cjDay()&&Array.isArray(S.list)&&S.list.length===3?S.list:null;if(!L)return;
  const bySlot={};for(const x of L)bySlot[x.slot]=x;const solved=k=>bySlot[k]&&bySlot[k].st==="done",all=solved("sip")&&solved("cup")&&solved("pot");
  const P=document.createElement("div");P.className="shp-page cq cjm-page";const pc=cjmPc;let fx="";
  const g=cjmG(),VES=CJM_VES_G[g]||CJM_VES,SP=g in CJM_SPOUT_G?CJM_SPOUT_G[g]:CJM_SPOUT;
  for(const[k,x,y,rx,ry]of VES){if(!solved(k))continue;const[a,b]=pc(x,y);
    if(k==="pot"){if(!SP){fx+=`<span class="cjm-steam" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%"><i></i><i></i><i></i></span>`;continue}const[sx,sy]=pc(...SP);fx+=`<span class="cjm-steam" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%"><i></i><i></i><i></i></span><span class="cjm-steam" style="left:${sx.toFixed(2)}%;top:${sy.toFixed(2)}%;width:6%"><i></i><i></i></span>`;continue}
    fx+=`<span class="cjm-foam${g==="weijin"?" boil":""}" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%;width:${(rx*2/7.68).toFixed(2)}%;height:${(ry*2/13.76).toFixed(2)}%">${k==="cup"&&all?(g==="weijin"?'<span class="cjm-rip"><i></i><i></i><i></i></span>':g==="tang"?'<span class="cjm-mo"></span>':'<span class="cjm-art"><svg viewBox="-12 -12 24 24" preserveAspectRatio="none" aria-hidden="true"><circle r="10" fill="none" stroke="rgba(140,96,52,.55)" stroke-width="1.1"/><circle r="8.2" fill="none" stroke="rgba(140,96,52,.35)" stroke-width=".6"/><text y="4.2" text-anchor="middle" font-size="12" font-weight="900" fill="rgba(150,70,40,.62)" font-family="serif">帥</text></svg></span>'):""}</span>`;
    fx+=`<span class="cjm-steam${k==="cup"&&all&&g==="weijin"?" thick":""}" style="left:${a.toFixed(2)}%;top:${(b-1).toFixed(2)}%;width:${k==="cup"?(all&&g==="weijin"?13:9):6}%"><i></i><i></i><i></i></span>`}
  const[lfN,lfC,lfK]=cjmLeaf();fx+=`<span class="cjm-leaf" title="${esc(lfN)}" style="left:62%;top:58%">${cjmLeafSvg(lfC,lfK)}</span>`;
  const NM={sip:"一口",cup:"一盞",pot:"一壺"};
  P.innerHTML=`<img src="${xqClImg(`data/canjumap/${cjmDark()?"canju_night":"canju_day"}${g?"_"+g:""}.webp?v=${CJM_IMGV}`)}" alt="${g==="weijin"?"煮茶席":g==="tang"?"煎茶席":"宋代點茶席"}"><div class="cjm-fx" aria-hidden="true">${fx}</div>`+
    VES.map(([k,,,,,hx,hy,w,h])=>{const[a,b]=pc(hx,hy),it=bySlot[k];return`<span class="cjm-hit" aria-hidden="true" data-id="${esc(it.id)}" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%;width:${(w/7.68).toFixed(2)}%;height:${(h/13.76).toFixed(2)}%"></span>`}).join("")+
    VES.map(([k,mx,my])=>{const[a,b]=pc(mx,my-(k==="cup"?62:k==="pot"?40:44)),it=bySlot[k];return`<button class="shp-spot cjm-tag${solved(k)?" done":""}" id="cjm_${k}" data-id="${esc(it.id)}" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%"><b>${NM[k]}</b></button>`}).join("");
  v.insertBefore(P,wrap);
  const open=id=>{if(typeof vibrate==="function")vibrate(5);location.hash="#/canju/"+encodeURIComponent(id)};
  P.querySelectorAll(".cjm-hit").forEach(b=>b.onclick=e=>{e.stopPropagation();const t=P.querySelector(`.cjm-tag[data-id="${CSS.escape(b.dataset.id)}"]`);if(t)t.click();else open(b.dataset.id)});
  P.querySelectorAll(".cjm-tag").forEach(b=>b.onclick=()=>open(b.dataset.id));
  if(typeof shpFit==="function")shpFit(v);
  const HS={};VES.forEach(([k,x,y])=>{const[a,b]=pc(x,y);HS["cjm_"+k]=[typeof WALK_HOP_ON!=="undefined"&&WALK_HOP_ON?"tt":"tbl",+a.toFixed(2),+b.toFixed(2),all?"cheer":"bow"]});
  try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,cjmShw(g),{HS}),"cjm")}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof CanjuDaily==="function"){const f0=CanjuDaily;CanjuDaily=function(v){const r=f0.apply(this,arguments);
  try{if(CANJU_MAP_ON){const mo=new MutationObserver(()=>{if(!v.isConnected){mo.disconnect();return}if(v.querySelector(".cj-wrap")){mo.disconnect();try{canjuMap(v)}catch(e){}}});mo.observe(v,{childList:true});if(v.querySelector(".cj-wrap"))canjuMap(v)}}catch(e){}return r}}
