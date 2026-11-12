/* ================= 🀄 茶坊雅間：挑戰電腦的入口（開發者 11/10，Gemini 58 號、story/挑戰電腦雅間_設計定案_1110.md）=================
   茶坊「挑戰電腦」不再直接開一盤，先進這間雅間（#/cpuroom）：第一人稱坐在棋桌前，桌上的器物就是按鈕——
     左邊朱紅戰帖＝🥇 晉級賽（原「積分挑戰」：段位自動配對手、算分、不能悔棋提示）；右邊棋譜＝📚 練功房（原「自選難度」：18 級任選、可悔棋提示、不扣分）；
     左牆木腰牌＝我的段位、分數、勝負；桌前兩個棋罐＝執紅／執黑；右牆四卷卷軸＝練功房四段難度（初學乍練 1～4、略有小成 5～9、登堂入室 10～14、宗師之境 15～18）；
     桌子正中的茶爐（秦～五代是溫酒爐）＝開局；對面空座疊一個半透明的「幻影棋客」（挑戰電腦的對手圖 data/pika2/）；最下方竹簾＝回茶坊（07w9 出口）。
   後兩卷在前一卷還沒通關任何一級時畫淡一點（只是提醒，照樣可以選）。
   圖分三組：明清（原圖，不分朝代也用這張）、宋元（_song：湯瓶風爐、建盞、書卷）、秦～五代（_han：矮案坐席、溫酒爐、竹簡、漆奩）。
   開關 CPUROOM_ON（false＝茶坊照舊直接進 #/cpu）；圖片網址帶 CR_IMGV；前綴 cr */
const CPUROOM_ON=true;
const CR_IMGV="1110";
const CR_GRP_HAN=["qin","han","sanguo","weijin","nanbei","sui","tang"],CR_GRP_SONG=["wudai","song","yuan"];   /* 史學顧問 11/10：五代已是高桌靠背椅、點茶，歸宋元組 */
const CR_LV=[[1,4,"初學乍練",""],[5,9,"略有小成",""],[10,14,"登堂入室",""],[15,18,"宗師之境","高手也難勝"]];
const CR_TXT={rank:["🥇 晉級賽","與實力相當的幻影棋客對決，爭取更高段位！","算分升降段；中途離開可以回來接著下，沒下完就開新局才算輸。"],   /* 11/11 AI 模擬玩家報告問題 7：照實際行為寫——離開頁面、關 App 這盤都留著（local.js 只有開新局時 forfeit） */
  free:["📚 練功房","十八級難度任你挑，放心試新招。","不扣段位分；贏了那一級蓋「通關」印。"],
  blind:["🙈 盲棋","不走故事也能蒙目對弈：棋盤不顯示棋子，只靠著法列和記憶跟電腦下一盤。","不算段位、不記通關；每盤可以偷看 3 次，每次 3 秒。"]};   /* 開發者 11/11 選 ChatGPT 18 號方案一 */   /* 11/10 開發者：跟電腦下不能用寶物（提示棋、悔棋符），練功房不寫「可以悔棋、看提示」 */
const CR_GUIDE="想升段就進晉級賽，想練新招就進練功房，想考記性就下盲棋。";
/* 11/12 ChatGPT UI 冗餘盤查第 1 項（story/104 號）：選了模式以後，卡片不再重複模式名稱和三種模式的說明——只留一行會影響決定的資訊（crInfo），
   晉級賽另加「中途重開判負」規則（CR_RULE）；三種模式比較收進「模式差在哪？」（點開才看，crDiffSheet）。中央主按鈕照已選模式寫 CR_GO（螢幕報讀名稱＝主按鈕字＋那一行資訊）。
   卡片標 data-bot-avoid（小帥照 bot3d 禁區避開）；ttFill 把圖放大、左右裁掉一點時，卡片照看得到的範圍重排（crFit），說明不被裁切 */
const CR_GO={rank:"開始晉級賽",free:"開始練習",blind:"開始盲棋"};
const CR_RULE="可回來續下；若未下完就另開新局，原局判負。";   /* 11/12 ChatGPT 文案檢查第 1 條（開發者核准）：改短、像規則判定 */
const crMode=()=>crRanked()?"rank":crBlind()?"blind":"free";
function crInfo(md,lv,sd,o){o=o||{};const s=sd==="b"?"執黑後走":"執紅先走";
  if(md==="rank")return`對手照段位「${o.rank||"新手"}」配 · ${s} · 算段位分`;
  return`第 ${lv} 級${o.passed?"（已通關）":""} · ${s} · ${md==="blind"?"不算段位、可偷看 3 次":"不扣段位分"}`}
function crDiffSheet(){sheet("模式差在哪？",b=>{b.innerHTML=`<p class="muted" style="margin:0 0 8px">${esc(CR_GUIDE)}</p>`+["rank","free","blind"].filter(k=>k!=="rank"||OFF).map(k=>{const T=CR_TXT[k];
  return`<div class="card" style="padding:8px 12px;margin:0 0 8px"><b>${T[0]}</b><p style="margin:4px 0 2px">${esc(T[1])}</p><p class="muted" style="margin:0;font-size:13.5px">${esc(T[2])}</p></div>`}).join("")})}
function crFit(P){const c=P&&P.querySelector(".cr-card");if(!c||!P.isConnected)return;const V=document.getElementById("view")||document.documentElement,vr=V.getBoundingClientRect(),pr=P.getBoundingClientRect();if(!pr.width)return;
  const m=10,k=pr.width*.05;c.style.left=Math.round(Math.max(k,vr.left+m-pr.left))+"px";c.style.right=Math.round(Math.max(k,pr.right-(vr.right-m)))+"px"}
/* 11/11 規格表 87「等級四套」白話對照：第 N 級＝電腦強度；括號＝同等棋力的段位（晉級賽升的就是它）；修為 Lv 是另一條、跟棋力無關（#/terms 玩法頁也有同一段） */
const CR_LVTIP="📏 <b>第 N 級</b>是電腦對手的強度（1 最弱、18 最強；幻影棋客、笑面掌櫃都照這個級數）；括號裡是同等棋力的<b>段位</b>：新手→入門 1～3→業餘 1～9 級→專業。晉級賽贏棋升的就是這個段位。<b>修為 Lv</b> 是走故事、做題累積的經驗，跟棋力無關。";
/* 熱點（原圖像素 768×1376）：[id, x, y, 標籤] */
const CR_SPOT={crRank:[150,250],crScroll:[650,352],crRankT:[155,672],crFree:[640,662],crRed:[165,812],crBlack:[635,812],crGo:[384,850],crBlind:[610,505]};   /* 盲棋＝書架上的青花瓶 */
function crEra(){let e="";try{e=typeof hbDockEra==="function"?hbDockEra():""}catch(x){}return CR_GRP_HAN.includes(e)?"han":CR_GRP_SONG.includes(e)?"song":""}
const crPc=(x,y)=>`left:${(x/7.68).toFixed(2)}%;top:${(y/13.76).toFixed(2)}%`;
function crCss(){if(document.getElementById("crCss"))return;const s=document.createElement("style");s.id="crCss";s.textContent=`
.cr-page{margin:0 0 6px}.cr-page .shp-spot{max-width:46%;padding:4px 11px;z-index:3}.cr-page .shp-spot b{white-space:nowrap;font-size:14px}
.cr-page .shp-spot.on{background:#8a1e12;border-color:#f2c94c;color:#fbeee0;box-shadow:0 0 0 2px rgba(242,201,76,.55),0 2px 8px rgba(0,0,0,.35)}
.cr-page .shp-spot.on b{color:#fbeee0}
.cr-ghost{position:absolute;left:50%;bottom:49.6%;width:33%;aspect-ratio:437/640;transform:translateX(-50%);z-index:1;pointer-events:none;opacity:.6;filter:grayscale(.85) sepia(.3) contrast(.95) brightness(1.04);-webkit-mask-image:linear-gradient(#000 62%,rgba(0,0,0,.15));mask-image:linear-gradient(#000 62%,rgba(0,0,0,.15));animation:crBreath 5s ease-in-out infinite}
.cr-ghost.han{bottom:50.4%}.cr-ghost>img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;display:block}
.cr-ghost>i{position:absolute;left:50.4%;top:58.9%;width:34%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 normal 0/1 var(--kai,var(--serif,serif))}.cr-ghost>i b{font-size:min(9cqw,40px);color:#1e1a16}

@keyframes crBreath{0%,100%{opacity:.52;transform:translateX(-50%) translateY(0)}50%{opacity:.66;transform:translateX(-50%) translateY(-1.2%)}}
.cr-name{position:absolute;left:50%;top:21%;transform:translateX(-50%);z-index:2;font:800 13px/1 var(--kai,var(--serif,serif));color:#3a2618;background:rgba(243,234,210,.82);border:1px solid rgba(138,106,58,.7);border-radius:3px;padding:3px 8px;white-space:nowrap;pointer-events:none}
.cr-card{position:absolute;left:5%;right:5%;top:69.5%;z-index:2;background:rgba(250,244,230,.93);border:1px solid #8a6a3a;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,.3);padding:10px 12px 9px;color:#2a1f15;font:600 14px/1.55 var(--serif,serif)}
.cr-card h3{margin:0 0 3px;font:900 16px/1.3 var(--kai,var(--serif,serif));color:#8a1e12}
.cr-card p{margin:0}.cr-card small{display:block;margin-top:3px;font-size:13px;color:#5a4630}
.cr-card .cr-lv{margin-top:6px;padding-top:6px;border-top:1px dashed rgba(90,70,48,.4);font-size:13.5px}
.cr-card .cr-g{margin-top:6px;font-size:13px;color:#6a5a48}
.cr-card .cr-cont{margin-top:7px;display:flex;gap:8px;align-items:center;font-size:13.5px}
.cr-card .cr-one{font:800 15px/1.45 var(--kai,var(--serif,serif));color:#3a2618}.cr-card .cr-rule{margin-top:3px;font-size:13.5px;color:#8a1e12}
.cr-card .cr-more{display:inline-block;margin-top:4px;min-height:32px;border:0;background:none;padding:4px 0;color:#6a4a2a;text-decoration:underline;text-underline-offset:3px;font:700 13.5px/1.3 var(--serif,serif);cursor:pointer}
.cr-card .cr-cont button{border:1px solid #8a6a3a;background:#f3ead2;color:#3a2618;border-radius:3px;padding:4px 10px;font:800 13.5px/1.2 var(--kai,var(--serif,serif))}
.cr-pick{display:grid;gap:10px}.cr-pick .cr-sec{border:1px solid var(--line);border-radius:10px;padding:8px 10px}.cr-pick .cr-sec.dim{opacity:.5}
.cr-pick .cr-sec h4{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between;gap:6px}.cr-pick .cr-sec h4 small{font-weight:400;color:var(--muted);font-size:13px}
.cr-pick .cr-lvs{display:flex;flex-wrap:wrap;gap:6px}.cr-pick .cr-lvs button{min-width:62px;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--card,#fff);font:600 13.5px/1.25 var(--sans);text-align:center}
.cr-pick .cr-lvs button.on{border-color:#8a1e12;box-shadow:0 0 0 2px rgba(138,30,18,.25)}.cr-pick .cr-lvs button b{display:block;font-size:15px}.cr-pick .cr-lvs button i{display:block;font-style:normal;font-size:12.5px;color:#8a1e12}
button.cr-name{pointer-events:auto;cursor:pointer;font-size:14px;padding:5px 10px}
.cr-ghost .cr-zg{display:none}.cr-ghost.zg{filter:none;opacity:.96;-webkit-mask-image:none;mask-image:none;animation:none}.cr-ghost.zg>img,.cr-ghost.zg>i{display:none}
.cr-ghost.zg .cr-zg{display:flex;position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:58%;aspect-ratio:1;border-radius:50%;align-items:center;justify-content:center;font:900 normal min(16cqw,64px)/1 var(--kai,var(--serif,serif));color:#5a1806;background:radial-gradient(circle at 35% 30%,#f7d98a,#d0843a 62%,#93461a);border:3px solid #8a3e12;box-shadow:0 2px 10px rgba(0,0,0,.35)}
.cr-ghost .cr-zgimg{display:none}.cr-ghost.zg .cr-zgimg{display:block;position:absolute;inset:0;width:100%;height:100%;-webkit-mask-size:100% 100%;mask-size:100% 100%}.cr-ghost.zg.g-def .cr-zgimg{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M28 93 L38 91.5 L45 89.5 L55 89.5 L62 91.5 L72 93 L72 100 L28 100Z'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M28 93 L38 91.5 L45 89.5 L55 89.5 L62 91.5 L72 93 L72 100 L28 100Z'/%3E%3C/svg%3E")}.cr-ghost.zg.g-classic .cr-zgimg{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M28 93 L38 91.5 L45 89.5 L55 89.5 L62 91.5 L72 93 L72 100 L28 100Z'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M28 93 L38 91.5 L45 89.5 L55 89.5 L62 91.5 L72 93 L72 100 L28 100Z'/%3E%3C/svg%3E")}.cr-ghost.zg.g-han .cr-zgimg{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M34 86 L40 82.5 L48 81 L58 82.5 L66 86 L80 92 L80 100 L34 100Z'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M34 86 L40 82.5 L48 81 L58 82.5 L66 86 L80 92 L80 100 L34 100Z'/%3E%3C/svg%3E")}.cr-ghost.zg.g-song .cr-zgimg{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M54.5 71.5 L57.5 72.5 L58 85 L64.5 88 L66 100 L43 100 L43 92 L29 80.5 L25.5 78 L29.5 79 L43 88.5 L51.5 85 L52 73Z'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill-rule='evenodd' d='M0 0H100V100H0Z M54.5 71.5 L57.5 72.5 L58 85 L64.5 88 L66 100 L43 100 L43 92 L29 80.5 L25.5 78 L29.5 79 L43 88.5 L51.5 85 L52 73Z'/%3E%3C/svg%3E")}.cr-ghost.zg.zgimg .cr-zg{display:none}
@media (prefers-reduced-motion:reduce){.cr-ghost{animation:none}}`;document.head.append(s)}
/* 段位資料、目前這盤：/play/state（local.js playState） */
let CR_ST=null;
async function crState(){try{CR_ST=await api("/play/state")}catch(e){}return CR_ST}
const crRanked=()=>OFF&&!!store.get("cpuRanked",true);
const crBlind=()=>!crRanked()&&!!store.get("cpuBlind",false);
const crLevel=()=>Math.max(1,Math.min(18,store.get("cpuLevel",6)|0||6));
const crSide=()=>store.get("cpuSide","r")==="b"?"b":"r";
const crPassed=n=>!!(((CR_ST&&CR_ST.record)||{})[n]||{}).w;
function crGrpDim(i){if(i<2)return false;const[a,b]=CR_LV[i-1];for(let n=a;n<=b;n++)if(crPassed(n))return false;return true}
function crLvName(n){const L=(CR_ST&&CR_ST.levels||[])[n-1];return L?L.name:""}
function crLive(){const s=CR_ST;return!!(s&&s.kind==="cpu"&&!s.result&&(s.moves||[]).length>=2)}
/* hspx（開發者 11/12 07:39「這邊視覺怪怪的，掌櫃不應該透明」）：改用上半身圖 data/zhanggui/seat.webp（坐在椅子上、下半身在桌子後面），不透明；四種場景（明清／經典／秦～五代／宋元）的壺具用 SVG 輪廓遮罩，壺留在他前面（座位框百分比座標，tools 端 zgbust.py 同一組） */
/* hspx（開發者 11/12「沒有換到 3D 角色」）：選笑面掌櫃時，對面座位原本只放「掌」字圓牌；改放掌櫃立繪 data/zhanggui/idle.webp（Gemini 畫、開發者看過，也是 3D k_zg 的來源），圖載不到才退回圓牌 */
/* 11/11 笑面掌櫃：練功房、盲棋可以選對手（store cpuOpp）；晉級賽固定幻影棋客 */
const crOpp=()=>crRanked()?"km":cpuOppPref();
function crPaint(P){const rk=crRanked(),bl=crBlind(),lv=crLevel(),sd=crSide(),CR=(CR_ST&&CR_ST.cpuRate)||{},zo=crOpp()==="zhanggui";
  {const gh=P.querySelector(".cr-ghost");if(gh)gh.classList.toggle("zg",zo);const nb=P.querySelector("#crOpp");if(nb){nb.textContent="👤 "+(zo?OPT_ZG.name:OPT_KM.name)+(rk?"":" ▾");nb.setAttribute("aria-label",rk?"名牌，晉級賽固定對手：幻影棋客":"名牌，按下可換對手，目前對手："+(zo?OPT_ZG.name:OPT_KM.name))}}{const gb=P.querySelector(".cr-ghost i b");if(gb){gb.textContent=sd==="b"?"帥":"將";gb.style.color=sd==="b"?"#C8102E":"#1e1a16"}}
  {const rt=P.querySelector("#crRankT");if(rt){rt.classList.toggle("on",rk);rt.setAttribute("aria-pressed",String(rk))}}P.querySelector("#crFree").classList.toggle("on",!rk&&!bl);P.querySelector("#crBlind").classList.toggle("on",bl);
  P.querySelector("#crFree").setAttribute("aria-pressed",String(!rk&&!bl));P.querySelector("#crBlind").setAttribute("aria-pressed",String(bl));
  P.querySelector("#crRed").classList.toggle("on",sd==="r");P.querySelector("#crBlack").classList.toggle("on",sd==="b");
  P.querySelector("#crScroll").style.display=rk?"none":"";
  /* 11/12 ChatGPT 文案檢查第 4、5 條（開發者核准）：段位牌寫「還差幾分升段」（卡片拿掉「再 N 分升段」後，想升段的人在這裡看進度）；卷軸、名牌、段位牌的螢幕報讀名稱說出用途與目前狀態 */
  {const rb=P.querySelector("#crRank"),rn=CR.rank||"新手";rb.querySelector("b").textContent=CR.next&&CR.toNext!=null?`🏅 ${rn}・差 ${CR.toNext} 分升段`:CR.rank?`🏅 ${rn}・最高段位`:`🏅 ${rn}`;
    rb.setAttribute("aria-label",`段位牌：${rn}，${CR.pts||0} 分`+(CR.next&&CR.toNext!=null?`，還差 ${CR.toNext} 分升「${CR.next}」`:"")+"，按下看詳細")}
  {const sb=P.querySelector("#crScroll");if(sb)sb.setAttribute("aria-label",`卷軸，按下可換難度，目前第 ${lv} 級`+(crPassed(lv)?"，已通關":""))}
  const live=crLive(),lm=live?(CR_ST.ranked?"晉級賽":CR_ST.blind?`盲棋第 ${CR_ST.level} 級`:`練功房第 ${CR_ST.level} 級`):"";
  const md=rk?"rank":bl?"blind":"free",zx=!rk&&zgXOn(crOpp()),info=zx?`${OPT_ZG.name}・${ZG_X.name}：${ZG_X.desc}你執${sd==="b"?"黑方（後走）":"紅方（先走）"}。`:crInfo(md,lv,sd,{rank:rkTw(CR.rank||"新手"),passed:crPassed(lv)});   /* 掌櫃真功夫：不跟等級走，說明換成這一格的 */
  {const gb=P.querySelector("#crGo"),ic=crEra()==="han"?"🍶":"🍵";if(gb){gb.querySelector("b").textContent=ic+" "+CR_GO[md];gb.setAttribute("aria-label",CR_GO[md]+"："+info)}}
  P.querySelector(".cr-card").innerHTML=`<p class="cr-one">${esc(info)}</p>`+(rk?`<p class="cr-rule">⚠ ${esc(CR_RULE)}</p>`:"")+
    (live?`<div class="cr-cont"><span>上一盤${lm}還沒下完</span><button type="button" id="crCont">繼續上一盤 ›</button></div>`:"")+
    `<button type="button" class="cr-more" id="crDiff" aria-haspopup="dialog">模式差在哪？</button>`;
  const cb=P.querySelector("#crCont");if(cb)cb.onclick=e=>{e.stopPropagation();vibrate(5);location.hash="#/cpu"};
  const db=P.querySelector("#crDiff");if(db)db.onclick=e=>{e.stopPropagation();vibrate(5);crDiffSheet()};
  try{crFit(P)}catch(e){}}
function crPick(P){const lv0=crLevel();
  sheet("📚 練功房・選難度",b=>{b.innerHTML=`<p class="muted" style="margin:0 0 10px;font-size:13.5px;line-height:1.6">${CR_LVTIP}</p><div class="cr-pick">${CR_LV.map(([a,z,nm,note],i)=>{const dim=crGrpDim(i);let h="";for(let n=a;n<=z;n++)h+=`<button type="button" data-l="${n}" class="${n===lv0?"on":""}"><b>${n}</b>${esc(rkTw(crLvName(n)||""))}${crPassed(n)?"<i>✔ 通關</i>":""}</button>`;
      return`<div class="cr-sec${dim?" dim":""}"><h4><span>${esc(nm)}</span><small>第 ${a}～${z} 級${note?"・"+esc(note):""}${dim?"・前一卷還沒通關":""}</small></h4><div class="cr-lvs">${h}</div></div>`}).join("")}${crOpp()==="zhanggui"?`<div class="cr-sec"><h4><span>${esc(OPT_ZG.name)}</span><small>${esc(ZG_X.desc)}</small></h4><div class="cr-lvs"><button type="button" data-zx="1" class="${zgXOn("zhanggui")?"on":""}"><b>${esc(ZG_X.short)}</b>${esc(ZG_X.name)}</button></div></div>`:""}</div>`;   /* 開發者 11/12：笑面掌櫃多一格「掌櫃真功夫」 */
    b.querySelectorAll("[data-l]").forEach(x=>x.onclick=()=>{vibrate(5);store.set("cpuLevel",+x.dataset.l);store.set("zgX",false);closeSheet();crPaint(P)});
    {const z=b.querySelector("[data-zx]");if(z)z.onclick=()=>{vibrate(5);store.set("zgX",true);closeSheet();crPaint(P)}}})}
function crRankSheet(){const CR=(CR_ST&&CR_ST.cpuRate)||{},span=CR.hi!=null?CR.hi-CR.lo:0,pct=span?Math.round(100*(CR.pts-CR.lo)/span):100;
  sheet("🏅 我的晉級賽段位",b=>{b.innerHTML=`<div class="cpu-rk"><div class="mid"><span class="muted">段位</span><span class="pt"><b>${CR.pts||0}</b> 分</span></div><div class="rk">${esc(CR.rank||"新手")}</div>
    <div class="st-bar"><i style="width:${pct}%"></i></div><div class="muted" style="font-size:13px">${CR.next?`再 ${CR.toNext} 分升「${esc(CR.next)}」`:"已經是最高段位"}・${CR.w||0} 勝 ${CR.l||0} 負 ${CR.d||0} 和</div>
    <p>晉級賽的對手照你的段位配：跟實力差不多的幻影棋客下，贏約 +16、輸約 −16，跟線上對戰分開記分。</p></div>`})}
async function crStart(){const rk=crRanked(),lv=crLevel(),sd=crSide();
  const go=async()=>{try{await api("/play/new",{human:sd,lx:lv,ranked:rk,...(crBlind()?{blind:true}:{}),...zgArg(crOpp(),rk,zgXOn(crOpp()))});if(OFF)store.set("cpuRanked",rk);location.hash="#/cpu"}catch(e){toast(e.message||"開不了局")}};
  if(crLive()){const s=CR_ST;modal(`<div class="em">🀄</div><h2>上一盤還沒下完</h2><p class="muted">${s.ranked?"晉級賽下到一半開新局會算輸。":"可以接著下，或放棄那盤開新局。"}</p>`,
    [["繼續上一盤",()=>{location.hash="#/cpu"}],[s.ranked?"開新局（上一盤算輸）":"開新局",go],["取消",null,true]]);return}
  go()}
/* 11/12 ChatGPT 文案檢查第 2、3 條（開發者核准）：卡片拿掉「點書架上的卷軸換」「點對面的名牌換」後，第一次進雅間用一次性的短暫泡泡指給玩家看（不加常駐小字）；各只出現一次，晉級賽不換難度、不換對手就不提示 */
function crTips(P){if(typeof tmxBub!=="function")return;
  const one=(k,id,t,d)=>setTimeout(()=>{try{if(!P.isConnected||store.get(k,false)||crRanked())return;const el=P.querySelector("#"+id);if(!el||el.style.display==="none"||!el.getClientRects().length)return;if(document.querySelector(".tmx-bub,#sheet.show"))return;if(tmxBub(el,esc(t),4500))store.set(k,true)}catch(e){}},d);
  one("crTipScroll","crScroll","點卷軸換難度",1200);one("crTipOpp","crOpp","點名牌換對手",6500)}
function CpuRoom(v){setTop("挑戰電腦","#/hub/battle");setTabs(true,"#/hub/battle");v.className="view";crCss();
  const g=crEra(),P=document.createElement("div");P.className="shp-page cq cr-page";
  const sp=(id,t)=>{const[x,y]=CR_SPOT[id];return`<button type="button" class="shp-spot" id="${id}" style="${crPc(x,y)}"><b>${t}</b></button>`};
  P.innerHTML=`<img src="${xqClImg(`data/cpuroom/cpuroom_day${g?"_"+g:""}.webp?v=${CR_IMGV}`)}" alt="茶坊深處的對弈雅間：棋桌、戰帖、棋譜、棋罐、茶爐">
    <div class="cr-ghost${g==="han"?" han":""} g-${g||"def"}" aria-hidden="true"><img src="${typeof PIKA_DIR==="function"?PIKA_DIR():"data/pika2/"}idle.webp" alt=""><i><b>${crSide()==="b"?"帥":"將"}</b></i><span class="cr-zg">掌</span><img class="cr-zgimg" src="data/zhanggui/seat.webp" alt="" onload="this.parentNode.classList.add('zgimg')" onerror="this.remove()"></div><button type="button" class="cr-name" id="crOpp">👤 幻影棋客</button>
    ${sp("crRank","🏅 段位")}${sp("crScroll","📜 選難度")}${OFF?sp("crRankT","🥇 晉級賽"):""}${sp("crFree","📚 練功房")}${sp("crBlind","🙈 盲棋")}${sp("crRed","🔴 執紅")}${sp("crBlack","⚫ 執黑")}${sp("crGo",(g==="han"?"🍶 ":"🍵 ")+CR_GO[crMode()])}
    <div class="cr-card" data-bot-avoid></div>`;
  v.append(P);
  if(!OFF)store.set("cpuRanked",false);
  const on=(id,fn)=>{const b=P.querySelector("#"+id);if(b)b.onclick=e=>{e.stopPropagation();vibrate(5);fn()}};
  on("crRankT",()=>{store.set("cpuRanked",true);store.set("cpuBlind",false);crPaint(P)});on("crFree",()=>{store.set("cpuRanked",false);store.set("cpuBlind",false);crPaint(P)});
  on("crBlind",()=>{store.set("cpuRanked",false);store.set("cpuBlind",true);crPaint(P)});
  on("crRed",()=>{store.set("cpuSide","r");crPaint(P)});on("crBlack",()=>{store.set("cpuSide","b");crPaint(P)});
  on("crScroll",()=>crPick(P));on("crOpp",()=>zgOppSheet(crRanked(),()=>crPaint(P)));on("crRank",()=>crRankSheet());on("crGo",()=>crStart());
  crPaint(P);crState().then(()=>{if(P.isConnected)crPaint(P)});crTips(P);
  {const fit=()=>{try{crFit(P)}catch(e){}},rs=()=>{if(!P.isConnected){removeEventListener("resize",rs);return}setTimeout(fit,300)};addEventListener("resize",rs);setTimeout(fit,60);setTimeout(fit,700);const im=P.querySelector(":scope>img");if(im)im.addEventListener("load",()=>setTimeout(fit,200))}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  return{}}
/* 茶坊圖上的「挑戰電腦」改進雅間（07y-hubmap 的熱點原本按清單裡的 #/cpu 卡片） */
if(typeof hubMap==="function"){const f0=hubMap;hubMap=function(v,hub){const r=f0.apply(this,arguments);try{if(CPUROOM_ON&&hub==="battle"){const b=v.querySelector("#hbCpu");if(b)b.onclick=()=>{location.hash="#/cpuroom"}}}catch(e){}return r}}
