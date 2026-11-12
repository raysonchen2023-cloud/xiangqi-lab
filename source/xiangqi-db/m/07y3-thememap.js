/* ================= 🧠 主題訓練「演武迴廊殘局榜」（開發者 11/9 選定 Gemini 方案 1，不加八卦；Claude 依考究清單修正；考究說明 park/thememap/考究說明.md，史學顧問核圖中）=================
   圖：park/thememap/theme_day_v2.png（Gemini 一次到位＋宣紙後製）、夜版 theme_night_v1.png（樑下白絹紗燈）→ art/thememap/ → data/thememap/。
   宋代書院的長迴廊（素面圓柱、直欞欄杆），左右各掛 4 塊空白黑漆牌＝8 種戰術；由近到遠：將軍、殺棋、抽將、捉雙、閃擊、牽制、引離、悶宮。
   每塊牌由程式畫：金框主題名小牌（多遠都看得清楚）；牌面夠寬的（近處兩對）直接畫那種戰術的例局小棋盤（從題庫裡挑古譜的局，附出處，TM_EX）。
   狀態：沒練過＝牌面蒙一層淡灰塵；練過＝擦乾淨；練得很熟（做過 10 題以上、正確率九成）＝掛一條紅流蘇、牌邊泛金光。偶爾有一隻燕子飛過。
   點牌（或主題小牌）＝角色沿迴廊走到牌前（練熟的那塊歡呼），打開一張大卡：完整的例局棋盤、出處、說明、正確率，按「開始練習」進 #/theme/<主題>。
   包一層 Theme(v,tag)（只換主題清單那一頁，原本的清單留在圖下面）；接 07w 走路（SHW_TM）、07x 縮放。開關 THEME_MAP_ON；圖片網址帶 TM_IMGV */
const THEME_MAP_ON=true;
const TM_IMGV="2330";
/* 8 塊牌的牌面四角（像素，768×1376；左上、右上、右下、左下），順序＝THEMES */
const TM_Q=[[[66,430],[130,462],[130,858],[66,890]],[[646,462],[710,430],[710,890],[646,858]],[[213,526],[242,540],[242,750],[213,762]],[[532,540],[563,526],[563,764],[532,752]],
  [[276,562],[300,572],[300,705],[276,715]],[[482,572],[503,562],[503,715],[482,705]],[[310,582],[325,588],[325,682],[310,688]],[[452,588],[467,582],[467,688],[452,682]]];
/* 主題小牌放牌的上方（t）或下方（b）：遠處的錯開，不疊在一起 */
const TM_TAGAT=["t","t","t","t","b","b","t","t"];
/* 例局：[主題, 題號, 出處, 局名, 棋盤（90 格，第 0 格是黑方左上）, 先走, 妙手]（從 data/quiz.json 依古譜優先挑，每個主題一局、不重複；史學顧問 11/9：抽將改用真正的抽將局 q87，局名拿掉題庫內部編號，讓雙馬的局叫「讓雙馬局」） */
const TM_EX=[["將軍","q21","適情雅趣","第 527 局 孤軍四戰",",,,,k,,,,,,,,,,,,,,,,,,,,,,,,,,,p,,,,,,,N,,r,,,,,,,,,,,,,,,,,,,,,,,,,,,B,,,,,,,,,K,,,,,,,,,,,,,","r","傌七進六"],["殺棋","e66","適情雅趣","一步殺",",,b,,C,,b,,,,,,,P,,,,,,,,,,k,,,,,,,,P,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,p,,,p,,,,,,,p,,,,,,,,K,,,,,","r","後兵平四"],["抽將","q87","適情雅趣","第 101 局 震驚百里","R,,b,a,k,,,C,R,,,,,,P,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,r,B,,,,,,,,,,,,,,,,,,,,,,,,,,,,,p,,,,r,,,,,,K,B,,","r","炮二平六"],["捉雙","q18","適情雅趣","第 33 局 計定千里",",,,a,,k,,,C,,,R,,a,,,R,,,,,,b,,,,N,,,,,,,,,p,,,b,,,,,,,,,,,,,,n,,,,,,,,,,,,,,,C,,,,B,,,,r,A,r,,p,,,,,,K,A,B,,c","r","俥二進一"],["閃擊","q6","橘中秘","讓雙馬局・第 39 局 巡河炮破象局","r,,b,a,k,a,b,,r,,,,,,,,,,n,R,,,,,C,c,,p,,p,,p,,p,,p,,,,,,,,,,,,,,,,,,,P,,P,,c,,P,,P,,,,,C,,,,,,,,,,,,,,,,B,A,K,A,B,,R","r","炮五進四"],["牽制","q5","橘中秘","全局・第 3 局 順炮橫車破直車用馬","r,,b,,k,a,b,,,,R,,,a,,,,,n,,c,,c,,,,,,,p,,n,,,,p,R,,,,,,,,,,,P,,,p,,,,,,,,P,,r,,P,,C,,,C,,N,,,,,,,,,,,,,,B,A,K,A,B,,","r","炮五進四"],["引離","mg94dc761f","適情雅趣","悶宮・兩步殺（棄子）　第 339 局 星墜日升",",,b,a,k,,,r,,,,,,a,,,,,,,,,b,,,,,,,C,N,C,,,,,,,,,,,,,,,,,,,R,,,,,,,,,,,,,,,,p,,,,,,,,c,,p,,,,,,,,K,,,p,,","r","傌六進七"],["悶宮","e71","適情雅趣","一步殺",",,,a,,,,,P,,,,,a,k,,,,,,,,,,,,,,,,,,,,,,,,,,p,C,,,,c,,,,C,,,,,,,,,,,,,,,,,,,p,,,,,,r,p,,,,,,,,,,K,,,,","r","炮五平四"]];
const SHW_TM={el:30,h:[.073,70,.002],look0:[50,50],home:"home",
  N:{home:[50,94],c1:[50,76],c2:[50,64],c3:[50,57.4],c4:[50,53.8],l1:[29,72],r1:[71,72],l2:[39,60.5],r2:[61,60.5],l3:[44,55.3],r3:[56,55.3],l4:[45.8,52.7],r4:[54.2,52.7]},
  E:"home-c1 c1-l1 c1-r1 c1-c2 c2-l2 c2-r2 c2-c3 c3-l3 c3-r3 c3-c4 c4-l4 c4-r4"};
const TM_NODE=["l1","r1","l2","r2","l3","r3","l4","r4"];
const tmPc=(x,y)=>[x/7.68,y/13.76];
const tmDark=()=>{const t=store.get("pageTheme","auto");return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)};
const TM_GLYPH={K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵",k:"將",a:"士",b:"象",n:"馬",r:"車",c:"砲",p:"卒"};
/* 例局棋盤 SVG（9 直 10 橫、河界、九宮 X；紅子朱字、黑子墨字；小牌上只畫子不寫字） */
function tmBoard(bd,big){const L=[];for(let i=0;i<9;i++)L.push(i%8?`M${i} 0V4M${i} 5V9`:`M${i} 0V9`);for(let j=0;j<10;j++)L.push(`M0 ${j}H8`);L.push("M3 0L5 2M5 0L3 2M3 7L5 9M5 7L3 9");
  const c=String(bd||"").split(",");let P="";for(let k=0;k<90;k++){const p=c[k];if(!p)continue;const x=k%9,y=Math.floor(k/9),red=p===p.toUpperCase();
    P+=`<circle cx="${x}" cy="${y}" r=".42" fill="#f3e6c8" stroke="${red?"#b23a26":"#2a2420"}" stroke-width="${big?.07:.16}"/>`+(big?`<text x="${x}" y="${y+.17}" text-anchor="middle" font-size=".5" font-weight="900" fill="${red?"#b23a26":"#2a2420"}" font-family="serif">${TM_GLYPH[p]||""}</text>`:"")}
  return`<svg viewBox="-.6 -.6 9.2 10.2" aria-hidden="true"><rect x="-.6" y="-.6" width="9.2" height="10.2" fill="${big?"#e9d7ac":"rgba(233,215,172,.92)"}"/><path d="${L.join("")}" fill="none" stroke="#6b4a2a" stroke-width="${big?.06:.1}"/>${P}</svg>`}
/* 長方形（w×h）→ 牌面四邊形的 CSS matrix3d（透視貼圖） */
function tmM3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function tmCss(){if(document.getElementById("tmCss"))return;const s=document.createElement("style");s.id="tmCss";s.textContent=`
.tm-page{margin:0 0 8px}
.tm-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.tm-face{position:absolute;left:0;top:0;width:100px;height:300px;transform-origin:0 0;pointer-events:auto;cursor:pointer;border:0;padding:0;background:none}
.tm-face .tm-bd{position:absolute;left:8px;top:14px;width:84px}.tm-face .tm-bd svg{display:block;width:100%;height:auto}
.tm-face.dust::after{content:"";position:absolute;inset:0;background:rgba(196,192,182,.38);box-shadow:inset 0 0 18px rgba(160,156,146,.6)}
.tm-face.full{box-shadow:inset 0 0 0 3px rgba(242,201,76,.75),0 0 10px rgba(242,201,76,.6)}
.tm-tas{position:absolute;width:1.6%;transform:translate(-50%,0);pointer-events:none}.tm-tas svg{display:block;width:100%;height:auto}
.tm-page .shp-spot.tm-tag{padding:3px 8px}.tm-page .shp-spot.tm-tag b{font-size:12.5px;white-space:nowrap}
.tm-swallow{position:absolute;left:-8%;top:13%;width:6%;animation:tmFly 22s linear infinite;animation-delay:-6s;opacity:.85}
@keyframes tmFly{0%{transform:translate(0,0)}12%{transform:translate(130vw,-6vh)}100%{transform:translate(130vw,-6vh)}}
.tm-sheet .tm-big{max-width:300px;margin:0 auto 8px}.tm-sheet .tm-big svg{display:block;width:100%;height:auto;border:1px solid #8a6a44;border-radius:4px}
@media (prefers-reduced-motion:reduce){.tm-swallow{display:none}}`;document.head.append(s)}
function tmOpen(i,st){const[k,,src,title,bd,side,cn]=TM_EX[i],d=(THEMES.find(t=>t[0]===k)||[])[1]||"",x=st[k];
  sheet(`🧠 ${k}`,b=>{b.classList.add("tm-sheet");b.innerHTML=`<div class="tm-big">${tmBoard(bd,true)}</div>
    <p style="margin:4px 0;line-height:1.7"><b>${esc(d)}</b></p><p class="muted" style="margin:0 0 6px;font-size:13px">例局出處：${esc(src)}${title?"・"+esc(title):""}（${side==="r"?"紅先":"黑先"}）</p>
    <details style="margin:0 0 10px"><summary class="muted" style="font-size:13px">看妙手</summary><p style="margin:6px 0 0">${esc(cn||"")}</p></details>
    ${x&&x.n?`<p class="muted" style="font-size:13px;margin:0 0 8px">做過 ${x.n} 題・正確率 ${Math.round(x.ok*100/x.n)}%</p>`:""}
    <button class="btn" id="tmGo" style="width:100%">開始練習 ›</button>`;
    b.querySelector("#tmGo").onclick=()=>{closeSheet();location.hash="#/theme/"+encodeURIComponent(k)}})}
function themeMap(v){if(v.querySelector(".tm-page"))return;const pad=v.querySelector(".pad");if(!pad||!pad.querySelector("[data-t]"))return;tmCss();
  const TS=store.get("themeStat",{})||{},stOf=k=>{const x=TS[k];if(!x||!x.n)return"dust";return x.n>=10&&x.ok/x.n>=.9?"full":"done"};
  const P=document.createElement("div");P.className="shp-page cq tm-page";
  const tas='<svg viewBox="0 0 10 40"><path d="M5 0V10" stroke="#8a2a1a" stroke-width="1"/><circle cx="5" cy="11.5" r="2.2" fill="#b23a26"/><path d="M5 13C2 20 2 30 3 38M5 13C5 22 5 30 5 39M5 13C8 20 8 30 7 38" stroke="#c0402a" stroke-width="1.6" fill="none"/></svg>';
  const sw='<svg viewBox="0 0 40 20"><path d="M2 12C10 6 16 7 20 10C24 7 30 4 38 2C32 8 26 11 22 12L20 14L18 12C12 12 6 13 2 12Z" fill="#2a2420"/></svg>';
  let fx="";TM_Q.forEach((q,i)=>{if(stOf(TM_EX[i][0])!=="full")return;const[x,y]=tmPc((q[2][0]+q[3][0])/2,(q[2][1]+q[3][1])/2);fx+=`<span class="tm-tas" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">${tas}</span>`});
  P.innerHTML=`<img src="${xqClImg(`data/thememap/${tmDark()?"theme_night":"theme_day"}.webp?v=${TM_IMGV}`)}" alt="演武迴廊"><div class="tm-fx" aria-hidden="true">${fx}<span class="tm-swallow">${sw}</span></div>`+
    TM_Q.map((q,i)=>{const k=TM_EX[i][0];return`<button type="button" class="tm-face ${stOf(k)}" data-i="${i}" aria-label="${esc(k)}"><span class="tm-bd"></span></button>`}).join("")+
    TM_Q.map((q,i)=>{const k=TM_EX[i][0],top=TM_TAGAT[i]==="t",[x,y]=tmPc((q[0][0]+q[1][0])/2,top?Math.min(q[0][1],q[1][1])-16:Math.max(q[2][1],q[3][1])+16);
      return`<button class="shp-spot tm-tag" id="tmT${i}" data-i="${i}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"><b>${esc(k)}</b></button>`}).join("");
  v.insertBefore(P,pad);
  const fit=()=>{const k=P.clientWidth/768;if(!k)return;P.querySelectorAll(".tm-face").forEach(f=>{const i=+f.dataset.i,q=TM_Q[i].map(([x,y])=>[x*k,y*k]);f.style.transform=tmM3(100,300,q);
    const wide=(q[1][0]-q[0][0])>=16,bd=f.querySelector(".tm-bd");if(wide&&!bd.firstChild)bd.innerHTML=tmBoard(TM_EX[i][4],false);if(!wide)bd.innerHTML=""})};
  fit();if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}fit()});ro.observe(P)}
  const go=i=>{if(typeof vibrate==="function")vibrate(5);tmOpen(i,TS)};
  P.querySelectorAll(".tm-face").forEach(f=>f.onclick=e=>{e.stopPropagation();const t=P.querySelector("#tmT"+f.dataset.i);if(t)t.click();else go(+f.dataset.i)});
  P.querySelectorAll(".tm-tag").forEach(b=>b.onclick=()=>go(+b.dataset.i));
  if(typeof shpFit==="function")shpFit(v);
  const HS={};TM_Q.forEach((q,i)=>{const[x,y]=tmPc((q[0][0]+q[2][0])/2,(q[0][1]+q[2][1])/2);HS["tmT"+i]=[TM_NODE[i],+x.toFixed(2),+y.toFixed(2),stOf(TM_EX[i][0])==="full"?"cheer":"idle"]});
  try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_TM,{HS}),"tm")}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Theme==="function"){const f0=Theme;Theme=function(v,tag){const r=f0.apply(this,arguments);
  try{if(THEME_MAP_ON&&!tag){const mo=new MutationObserver(()=>{if(!v.isConnected){mo.disconnect();return}if(v.querySelector(".pad [data-t]")){mo.disconnect();try{themeMap(v)}catch(e){}}});mo.observe(v,{childList:true,subtree:true})}}catch(e){}return r}}
