/* ================= 🏮 大廳名冊與棋友資料卡「茶樓門房迎客案」（42 案第 6 頁：Gemini 方案 1＋2，Claude 依考究清單修正；考究說明 park/rostermap/考究說明.md）=================
   圖：park/rostermap/roster_day_v5.png（Gemini 第一張；有玻璃罩的燈用局部修換成明式錫燈台、登記簿頁內框線用程式抹掉、水牌下像人頭肩的牆面水漬抹淡；宣紙濾鏡 0.6）、
       夜版 roster_night_v2.png（天井紅紗燈和錫燈點亮；案下地磚像人形的墨漬換成白天版乾淨地磚、牆上水漬抹淡）→ art/rostermap/ → data/rostermap/。小素材 1 件：mf_card 名帖紅紙底。
   包一層 lobbyMap：07x2 的「名冊」抽屜 .lm-dw 改成滿版門房（同一個抽屜、同一套開關與 xqPanelNav；大廳場景的「名冊」「＋N 人」「更多棋局」照舊打開它）。
   原本的清單 #lb 整份留著、照舊每 15 秒和有人進出時重畫，只是藏起來；這裡照它的內容畫到圖上，點哪裡＝點原本那一顆：
     水牌＝正在對戰的棋局（我的對局在最前面＝回到戰場；每盤「甲 對 乙」點了觀看、「幾人看」點了看是誰；放不下＝「還有幾盤」列出全部）；
     客簿＝熟面孔（在線朱點、不在線淡墨點）接著可以邀請的棋友；點名字＝原本的資料卡；點簿子＝湊近看（放大、一次看一頁、兩欄，翻頁，✕／返回鍵退回）；
     案上紅名帖＝我的狀態（對局中＝回到對局、找對手中＝取消、閒著＝隨機配對）；紅帖和筆＝千秋盃；拜匣＝路過的石桌往事人物（名帖露出匣口）；門口＝回天井。
   資料卡：在大廳裡打開原本的 oppCard 時，那張卡片改成畫面中央一張素紅名帖（內容、按鈕全部照舊；邀請、觀看做成朱印）。
   角色：從門口青磚地走到案前；點自己的名帖、千秋盃時鞠躬，點拜匣揮手；點名字、水牌不等角色。字最小 13px。開關 ROSTER_MAP_ON（false＝照舊抽屜）；圖片網址帶 MF_IMGV；前綴 mf */
const ROSTER_MAP_ON=true;
const MF_IMGV="2500";
/* 11/9 史學顧問盤查 C 類：門房照停靠朝代換圖（考究說明 park/rostermap/考究說明_各朝_1109.md）。分「宋以前、宋以後」兩組：
   秦到五代＝roster_<day|night>_han.webp（錫燈台→青銅豆形燈、拜匣→黑漆朱裡長方漆盒；門外紅紗燈→大廳唐以前的青銅懸燈、隔扇格心→直櫺）；宋以後、沒停靠用原圖。
   案上的客簿、名帖、紅帖、漆盒口（MF_BOX）、門口位置都沒動 */
const MF_ERA_HAN=["qin","han","sanguo","weijin","nanbei","sui","tang","wudai"];
function mfG(){let e="";try{e=typeof hbDockEra==="function"?hbDockEra():typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt()||"":""}catch(x){}return MF_ERA_HAN.includes(e)?"han":""}
const MF_PG=[[[140,772],[280,766],[268,893],[72,893]],[[302,766],[446,772],[470,893],[288,893]]];   /* 客簿左頁、右頁可寫的範圍（像素 768×1376） */
const MF_CARD=[[491,778],[608,778],[675,924],[524,924]],MF_BD=[93,245,368,397],MF_TIE=[610,735],MF_BOX=[132,695],MF_DOOR=[612,380];
const SHW_MF={W:768,H:1376,el:40,h:[.072,88,.0012],look0:[50,60],home:"home",N:{home:[34,95],front:[50,88],l:[20,88],r:[78,88]},E:"home-front front-l front-r home-l",
  HS:{mfMe:["r",75,62,"bow"],mfCup:["r",80,53,"bow"],mfBox:["l",17,50,"wave"]}};
let MF_GO=null;   /* 從大廳場景的「＋N 人」（翻開客簿）或「更多棋局」（列出全部棋局）進來 */
const mfDark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
const mfTx=t=>String(t||"").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{23E9}-\u{23FA}️‍›]/gu,"").replace(/\s+/g," ").trim();
function mfM3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function mfCss(){if(document.getElementById("mfCss"))return;const s=document.createElement("style");s.id="mfCss";s.textContent=`
.lm-dw.mf-pn{top:var(--xqT,0px);bottom:var(--xqB,0px);max-height:none;border:0;border-radius:0;background:#2a2018;overflow:hidden;box-shadow:none}
.lm-dw.mf-pn.mf-dk{background:#121826}
.mf-pn .lm-dw-b{display:none}
.lm-dw.mf-pn:not(.open){transform:translateY(calc(100% + var(--xqB,0px) + 24px))}   /* 822：面板夾在頂欄和底欄中間 */
.mf-pn .lm-dw-h{position:absolute;left:0;right:0;top:0;z-index:6;padding:8px 14px 10px;background:linear-gradient(rgba(246,239,223,.94) 70%,rgba(246,239,223,0));color:#2a1f15}
.mf-pn.mf-dk .lm-dw-h{background:linear-gradient(rgba(22,28,42,.94) 70%,rgba(22,28,42,0));color:#efe6d2}
.mf-pn.mf-z .lm-dw-h button{visibility:hidden}
.mf-sc{position:absolute;inset:0;overflow:hidden;z-index:0;transition:opacity .2s}.mf-sc.mf-fade{opacity:0;transition:none}
.mf-fr{position:absolute;left:0;top:0}
.mf-fr>img.mf-bg{display:block;width:100%;height:100%;user-select:none;-webkit-user-drag:none;pointer-events:none}
.mf-z .shw,.mf-z .shw-me,.mf-z .shw-hint,.mf-z .shw-say{visibility:hidden}
.mf-q{position:absolute;left:0;top:0;transform-origin:0 0}
.mf-p{cursor:zoom-in}.mf-z .mf-p{cursor:default}
.mf-g{position:absolute;inset:3px 6px;display:grid;align-content:start;column-gap:6px}
.mf-g>*{min-width:0}
.mf-e{display:flex;align-items:center;gap:5px;height:100%;padding:0 1px;margin:0;border:0;background:none;color:#2a1f15;font:700 13px/1 var(--serif,serif);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mf-e span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mf-e i{flex:none;width:8px;height:8px;border-radius:50%;background:#b23a26}.mf-e.off i{background:rgba(42,36,32,.35)}.mf-e.off{color:#6a5a48;cursor:default}
.mf-e:active{background:rgba(178,58,38,.1)}
.mf-h{grid-column:1/-1;display:flex;align-items:flex-end;font:800 13px/1 var(--kai,var(--serif,serif));color:#8a2a18;border-bottom:1px solid rgba(138,42,24,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:2px}
.mf-m{grid-column:1/-1;grid-row:span 3;font:600 13px/1.45 var(--serif,serif);color:#5a4630;overflow:hidden}
.mf-more{position:absolute;transform:translate(-50%,0);border:1px solid #8a6a3a;background:#f3ead2;color:#3a2618;border-radius:3px;padding:4px 9px;font:800 13px/1 var(--kai,var(--serif,serif));white-space:nowrap;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.3)}
.mf-bd{position:absolute;display:flex;flex-direction:column;gap:1px;padding:4px 8px;overflow:hidden;color:#2a1f15}
.mf-bd b{font:900 13px/19px var(--kai,var(--serif,serif));color:#7a2a18;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.mf-bl{display:flex;align-items:center;gap:6px;height:19px;flex:none}
.mf-bl button{border:0;background:none;padding:0;margin:0;color:inherit;font:700 13px/19px var(--serif,serif);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
.mf-bl button:first-child{flex:1;min-width:0}.mf-bl button.mf-w{flex:none;color:#8a2a18}
.mf-bl.mine button:first-child{color:#8a2a18;font-weight:900}
.mf-bd .mf-bm{font:600 13px/1.4 var(--serif,serif);color:#5a4630}
.mf-me{cursor:pointer;color:#1e130c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-align:center;font:700 15px/1.2 var(--serif,serif);padding:4px 2px;border:0;background:none}
.mf-me b{font:900 15.5px/1.15 var(--kai,var(--serif,serif));max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mf-me em{font-style:normal;display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;vertical-align:middle;border:1.5px solid #f6e6cc;border-radius:2px;background:#8a1e12;color:#f6e6cc;font:900 14px/1 var(--kai,var(--serif,serif))}
.mf-me small{font-size:14px;color:#f6e6cc;background:#8a1e12;border-radius:3px;padding:3px 8px;font-weight:800;white-space:nowrap;margin-top:2px}.mf-me span{white-space:nowrap;font-size:14px;color:#3a1a10}
.mf-hs{position:absolute;transform:translate(-50%,-50%);border:0;padding:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mf-hs span{position:absolute;left:50%;top:0;transform:translate(-50%,-100%);background:#f3ead2;border:1px solid #8a6a3a;color:#3a2618;border-radius:3px;font:800 13px/1.25 var(--kai,var(--serif,serif));padding:2px 6px;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.3);pointer-events:auto;cursor:pointer}
/* 回饋 834（開發者 11/9：棋史卡沒反應、盤查入口點選）：千秋盃、拜匣（路過的人物）、回天井的標籤畫在熱區外面（上方／右邊），原本 pointer-events:none，點標籤會穿過去沒反應；標籤是按鈕的子元素，改成可以點 */
.mf-hs[hidden]{display:none}
#mfBox span{left:50%;top:-90%;transform:translate(-50%,-100%)}   /* 11/10「有點亂」：路過的人物標籤移到名帖（少年阿古那幾張）上面，不再壓到客簿 */
.mf-jc{position:absolute;transform:translate(-50%,-100%) rotate(var(--r,0deg));transform-origin:50% 100%;border:1px solid #6a1a10;background:#c4472f;color:#fbeee0;border-radius:1px;padding:5px 4px;font:800 13px/1.1 var(--kai,var(--serif,serif));writing-mode:vertical-rl;cursor:pointer;box-shadow:1px 1px 2px rgba(0,0,0,.35)}
.mf-nav{position:absolute;left:0;right:0;bottom:14px;z-index:7;display:none;justify-content:center;align-items:center;gap:8px;padding:0 12px}
.mf-z .mf-nav{display:flex}
.mf-nav button,.mf-nav span{border:1px solid #8a6a3a;background:#f3ead2;color:#3a2618;border-radius:4px;padding:8px 12px;font:800 14px/1 var(--kai,var(--serif,serif));white-space:nowrap}
.mf-nav span{background:rgba(243,234,210,.85)}.mf-nav button:disabled{opacity:.4}
.mf-zx{position:absolute;right:12px;top:8px;z-index:7;display:none;border:1px solid #8a6a3a;background:#f3ead2;color:#3a2618;border-radius:4px;padding:6px 10px;font:800 14px/1 var(--kai,var(--serif,serif))}
.mf-z .mf-zx{display:block}
.sheet.mf-card{left:16px;right:16px;bottom:auto;top:calc((var(--xqT,56px) + 100vh - var(--xqB,64px))/2);max-width:420px;margin:0 auto;max-height:calc(100vh - var(--xqT,56px) - var(--xqB,64px) - 16px);border-radius:3px;color:#1e130c;background:#c8604a url(data/rostermap/mf_card.webp?v=${MF_IMGV}) center/cover;box-shadow:0 0 0 1px #5a1a10,inset 0 0 0 6px rgba(246,230,204,.0),0 10px 30px rgba(0,0,0,.45);transform:translateY(-40%) scale(.85);opacity:0;transition:transform .22s ease,opacity .18s;padding-bottom:0}
.sheet.mf-card.show{transform:translateY(-50%);opacity:1}
.sheet.mf-card::before{content:"";position:absolute;inset:7px;border:1.5px solid rgba(30,19,12,.75);pointer-events:none}
.sheet.mf-card .grab{display:none}
.sheet.mf-card .sh-t{text-align:center;font:900 15px var(--kai,var(--serif,serif));letter-spacing:4px;padding:16px 16px 4px;color:#3a120a}
.sheet.mf-card .sh-b{padding:0 20px 18px}
.sheet.mf-card .card{background:rgba(250,236,214,.2);border:0;border-top:1px solid rgba(30,19,12,.4);border-radius:0;box-shadow:none}
.sheet.mf-card .muted{color:#3a1a10;opacity:.85}
.sheet.mf-card .pill{background:rgba(250,236,214,.25);color:#1e130c;border:1px solid rgba(30,19,12,.45)}
.sheet.mf-card [style*="font-size:12"],.sheet.mf-card small{font-size:13px!important}
.sheet.mf-card [style*="color:var(--accent2)"],.sheet.mf-card [style*="color:var(--red)"],.sheet.mf-card [style*="color:var(--muted)"],.sheet.mf-card .tx span{color:#1e130c!important}
.sheet.mf-card .item{background:none;border-color:rgba(30,19,12,.25)}
.sheet.mf-card .item .lb{font:900 13px/1 var(--kai,var(--serif,serif));color:#f6e6cc;background:#8a1e12;border-radius:2px;width:24px;min-width:24px;height:24px;display:flex;align-items:center;justify-content:center}
.sheet.mf-card .btn.mf-seal{background:#8a1e12;color:#f6e6cc;border:1.5px solid #f6e6cc;box-shadow:0 0 0 1.5px #8a1e12;border-radius:3px;font:900 16px var(--kai,var(--serif,serif));letter-spacing:3px}
.sheet.mf-card .btn.ghost{background:rgba(250,236,214,.25);color:#1e130c;border-color:rgba(30,19,12,.5)}
@media (prefers-reduced-motion:reduce){.sheet.mf-card,.mf-sc{transition:none}}`;document.head.append(s)}
/* 資料卡改成名帖：原本 oppCard 的卡片照舊，只換外觀、拿掉表情符號，邀請和觀看做成朱印 */
function mfCard(){const sh=document.getElementById("sheet");if(!sh||sh.classList.contains("mf-card"))return;mfCss();sh.classList.add("mf-card");
  const t=sh.querySelector(".sh-t");if(t)t.textContent="名帖";
  sh.querySelectorAll(".item .lb").forEach(x=>{const b=x.parentNode.querySelector(".tx b");x.textContent=b?(b.textContent.trim()[0]||""):""});
  const w=document.createTreeWalker(sh.querySelector(".sh-b"),NodeFilter.SHOW_TEXT);const L=[];while(w.nextNode())L.push(w.currentNode);
  for(const n of L){const v=n.nodeValue,c=v.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️‍]/gu,"");if(c!==v)n.nodeValue=c.replace(/^\s+/,v.match(/^\s/)?" ":"")}
  sh.querySelectorAll("img").forEach(x=>{if(/emoji|ico|eti/i.test(x.className||"")||x.width<24)x.remove()});
  ["pi","pw"].forEach(id=>{const b=sh.querySelector("#"+id);if(b)b.classList.add("mf-seal")})}
function mfWrap(v){const dw=v.querySelector(".lm-dw"),lb=v.querySelector("#lb"),LP=v.querySelector(".lobby-page");if(!dw||!lb||dw.classList.contains("mf-pn"))return;mfCss();
  const dk=mfDark();dw.classList.add("mf-pn");dw.classList.toggle("mf-dk",dk);
  const hd=dw.querySelector(".lm-dw-h");if(hd&&hd.firstChild&&hd.firstChild.nodeType===3)hd.firstChild.textContent="名冊";
  const pct=(x,y)=>`left:${(x/7.68).toFixed(2)}%;top:${(y/13.76).toFixed(2)}%`;
  const sc=document.createElement("div");sc.className="mf-sc";
  sc.innerHTML=`<div class="mf-fr"><img class="mf-bg" src="${xqClImg(`data/rostermap/${dk?"roster_night":"roster_day"}${mfG()?"_"+mfG():""}.webp?v=${MF_IMGV}`)}" alt="${mfG()?"門房的迎客案：水牌、客簿、名帖、漆盒":"茶樓門房的櫃台案：水牌、客簿、名帖、拜匣"}">
    <div class="mf-bd" style="left:${(MF_BD[0]/7.68).toFixed(2)}%;top:${(MF_BD[1]/13.76).toFixed(2)}%;width:${((MF_BD[2]-MF_BD[0])/7.68).toFixed(2)}%;height:${((MF_BD[3]-MF_BD[1])/13.76).toFixed(2)}%"></div>
    <div class="mf-q mf-p" data-p="0"><div class="mf-g"></div></div><div class="mf-q mf-p" data-p="1"><div class="mf-g"></div></div>
    <button type="button" class="mf-q mf-me" id="mfMe"></button>
    <button type="button" class="mf-hs" id="mfCup" style="${pct(MF_TIE[0],MF_TIE[1])};width:17%;height:8%" hidden><span></span></button>
    <button type="button" class="mf-hs" id="mfBox" style="${pct(MF_BOX[0],MF_BOX[1])};width:20%;height:8%" hidden><span>路過的人物</span></button><div class="mf-jcs"></div>
    <button type="button" class="mf-hs" id="mfDoor" style="${pct(MF_DOOR[0],MF_DOOR[1])};width:20%;height:28%" aria-label="回天井"><span>回天井</span></button>
    <button type="button" class="mf-more" id="mfMore" hidden></button></div>
    <div class="mf-nav"><button type="button" data-t="-1">‹ 上一頁</button><span></span><button type="button" data-t="1">下一頁 ›</button></div><button type="button" class="mf-zx">✕ 收起客簿</button>`;
  dw.insertBefore(sc,dw.firstChild);
  const fr=sc.querySelector(".mf-fr"),P=[...fr.querySelectorAll(".mf-p")],me=fr.querySelector("#mfMe"),bd=fr.querySelector(".mf-bd"),more=fr.querySelector("#mfMore"),nav=sc.querySelector(".mf-nav");
  const S={Z:false,pi:0,k:1,k0:1,L:0,T:0,w:[0,0],h:[0,0],pages:[],rows:3,cols:1};
  const close=()=>{const x=dw.querySelector(".lm-dw-h button");if(x)x.click()};
  /* 圖照螢幕鋪滿；湊近看客簿時放大，一次對準一頁 */
  function fit(){const W=dw.clientWidth,H=dw.clientHeight;if(!W||!H)return;const k0=W/H>.62?H/1376:Math.max(W/768,H/1376);S.k0=k0;
    let k=k0,L,T;if(S.Z){const zf=Math.max(1.7,Math.min(2.2,W*.56/(170*k0)));k=k0*zf;const q=MF_PG[S.pi%2],cx=(q[0][0]+q[1][0]+q[2][0]+q[3][0])/4,cy=(q[0][1]+q[3][1])/2;L=W/2-cx*k;T=H*.46-cy*k}
    else{L=(W-768*k)/2;T=(H-1376*k)/2}
    S.k=k;S.L=L;S.T=T;Object.assign(fr.style,{width:768*k+"px",height:1376*k+"px",left:L+"px",top:T+"px"});
    /* 客簿上的字不跟著透視變形（透視會把上面幾列縮到 13px 以下）：取書頁裡最大的正長方形 */
    MF_PG.forEach((q,i)=>{const x0=Math.max(q[0][0],q[3][0])*k,x1=Math.min(q[1][0],q[2][0])*k,y0=Math.max(q[0][1],q[1][1])*k,y1=Math.min(q[2][1],q[3][1])*k,w=Math.round(x1-x0),h=Math.round(y1-y0);S.w[i]=w;S.h[i]=h;
      Object.assign(P[i].style,{left:x0+"px",top:y0+"px",width:w+"px",height:h+"px",transform:"none"})});
    {const Q=MF_CARD.map(([x,y])=>[x*k,y*k]),w=Math.round((Q[1][0]-Q[0][0]+Q[2][0]-Q[3][0])/2),h=Math.round((Q[3][1]-Q[0][1]+Q[2][1]-Q[1][1])/2);Object.assign(me.style,{width:w+"px",height:h+"px",transform:mfM3(w,h,Q)})}
    if(hd)hd.style.display=S.Z?"none":"";paint()}
  const unfade=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>sc.classList.remove("mf-fade")));
  const zoom=(on,fromNav)=>{if(on===S.Z)return;S.Z=on;S.pi=0;sc.classList.add("mf-fade");dw.classList.toggle("mf-z",on);
    /* 湊近看也登記一筆上一頁紀錄（自己記 mfZ；xqPanelNav 不能疊在名冊那一筆上面）：返回鍵先退出湊近，再按一次才收名冊 */
    if(on){try{const d=NAV_D+1;history.pushState({xqPanel:1,mfZ:1,d},"",location.href);NAV_D=d;if(typeof navMark==="function")navMark(d,true,true)}catch(e){}}
    else if(!fromNav){try{if((history.state||{}).mfZ)history.back()}catch(e){}}
    fit();unfade()};
  const pop=()=>{if(!dw.isConnected){removeEventListener("popstate",pop);return}if(S.Z&&!(history.state||{}).mfZ)zoom(false,true)};addEventListener("popstate",pop);
  /* 讀原本的清單 */
  const read=()=>{const st=t=>[...lb.querySelectorAll(".sec-t")].find(x=>x.textContent.includes(t)),E=[];
    const sh=t=>mfTx(t).replace(/（(\d+)／(\d+) 在線上）/," $1/$2").replace(/可以邀請的棋友（(\d+)）/,"可邀請 $1");
    const fs=st("熟面孔");if(fs){E.push({h:sh(fs.textContent)});lb.querySelectorAll(".famg .famc").forEach(x=>{const b=x.querySelector("b"),sm=x.querySelector("small");E.push({n:mfTx(b&&b.textContent),on:x.classList.contains("on"),el:x.dataset.p?x:null,a:mfTx(sm&&sm.textContent)})})}
    const is=st("可以邀請");if(is){E.push({h:sh(is.textContent)});let n=is.nextElementSibling;
      while(n&&!n.classList.contains("sec-t")){if(n.matches(".card.row[data-p]")){const b=n.querySelector(".gc-p b"),r=n.querySelector(".gc-p small"),sub=n.querySelector(".gc-sub");E.push({n:mfTx(b&&b.textContent),on:true,el:n,a:[mfTx(r&&r.textContent),mfTx(sub&&sub.textContent)].filter(Boolean).join("・")})}
        else if(n.classList.contains("muted"))E.push({m:mfTx(n.textContent)});n=n.nextElementSibling}}
    if(!E.length){const c=lb.querySelector(".muted");E.push({m:c?mfTx(c.textContent):"連線中"})}return E};
  /* 排頁：一列一格，標題佔一整列；說明文字佔三列 */
  const lay=(E,C,R)=>{const pages=[];let pg=[],r=0,c=0;const nl=()=>{if(c){r++;c=0}if(r>=R){pages.push(pg);pg=[];r=0}};
    for(const e of E){if(e.h||e.m){nl();if(e.m&&r+3>R){pages.push(pg);pg=[];r=0}pg.push(e);r+=e.m?3:1;c=0;if(r>=R){pages.push(pg);pg=[];r=0}continue}
      if(r>=R){pages.push(pg);pg=[];r=0}pg.push(e);c++;if(c>=C){c=0;r++}}if(pg.length)pages.push(pg);return pages.length?pages:[[]]};
  function paint(){const E=read(),C=S.Z?2:1,rh=S.Z?21:20,R=Math.max(2,Math.floor((Math.min(S.h[0],S.h[1])-6)/rh));S.rows=R;S.cols=C;S.pages=lay(E,C,R);
    if(S.pi>=S.pages.length)S.pi=Math.max(0,S.pages.length-1);
    const sp=S.Z?S.pi-(S.pi%2):0;
    P.forEach((p,i)=>{const g=p.querySelector(".mf-g");g.style.gridTemplateColumns=`repeat(${C},minmax(0,1fr))`;g.style.gridAutoRows=rh+"px";
      const pg=S.pages[sp+i]||[];g.innerHTML=pg.map((e,j)=>e.h?`<div class="mf-h">${esc(e.h)}</div>`:e.m?`<div class="mf-m">${esc(e.m)}</div>`:
        `<button type="button" class="mf-e${e.el?"":" off"}" data-k="${sp+i}:${j}" aria-label="${esc(e.n+(e.a?"，"+e.a:""))}"${e.el?"":" tabindex=\"-1\""}><i></i><span>${esc(e.n)}</span></button>`).join("");
      g.querySelectorAll(".mf-e").forEach(b=>b.onclick=ev=>{ev.stopPropagation();const[a,j]=b.dataset.k.split(":").map(Number),e=(S.pages[a]||[])[j];if(e&&e.el&&e.el.isConnected){vibrate(5);e.el.click()}})});
    const nNames=E.filter(e=>e.n).length,shown=S.pages.slice(0,2).reduce((t,p)=>t+p.filter(e=>e.n).length,0);
    if(!S.Z&&nNames>shown){const q=MF_PG[1];more.hidden=false;more.textContent=`還有 ${nNames-shown} 位・翻開`;more.style.left=((q[3][0]+q[2][0])/2/7.68).toFixed(2)+"%";more.style.top=((q[2][1]+34)/13.76).toFixed(2)+"%"}else more.hidden=true;
    const np=S.pages.length;nav.querySelector("span").textContent=`第 ${S.pi+1}／${np} 頁`;nav.querySelector('[data-t="-1"]').disabled=S.pi<=0;nav.querySelector('[data-t="1"]').disabled=S.pi>=np-1;
    board();mine();cup();box()}
  /* 水牌：正在對戰 */
  function board(){const H=bd.clientHeight||80,n=Math.max(1,Math.floor((H-8)/20)-1),sec=[...lb.querySelectorAll(".sec-t")].find(x=>x.textContent.includes("正在對戰"));
    const my=lb.querySelector("#myg"),G=[...lb.querySelectorAll("[data-w]")].map(w=>{const c=w.closest(".card"),ns=c?[...c.querySelectorAll(".gc-l1 .gc-p b")].map(b=>mfTx(b.textContent)):[],ws=c&&c.querySelector("[data-ws]");return{w,ws,t:ns.join(" 對 ")||"一盤棋",c:ws?(mfTx(ws.textContent).match(/\d+/)||[""])[0]:""}});
    const L=[];if(my)L.push(`<div class="mf-bl mine"><button type="button" data-my="1">我的對局・回到戰場</button></div>`);
    const room=n-L.length,show=G.length>room?G.slice(0,Math.max(0,room-1)):G;
    for(const[i,g]of show.entries())L.push(`<div class="mf-bl"><button type="button" data-g="${i}" aria-label="觀看 ${esc(g.t)}">${esc(g.t)}</button>${g.ws?`<button type="button" class="mf-w" data-gs="${i}">${g.c} 人看</button>`:""}</div>`);
    if(G.length>show.length)L.push(`<div class="mf-bl"><button type="button" data-all="1">還有 ${G.length-show.length} 盤・全部列出</button></div>`);
    if(!my&&!G.length){const m=sec&&sec.nextElementSibling;L.push(`<div class="mf-bm">${esc(m?mfTx(m.textContent):"目前沒有人在對戰")}</div>`)}
    bd.innerHTML=`<b data-all="1">${esc(sec?mfTx(sec.textContent).replace(/\s*[☁＝].*$/,""):"正在對戰")}</b>`+L.join("");
    bd.querySelectorAll("[data-g]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);const g=show[+b.dataset.g];if(g&&g.w.isConnected)g.w.click()});
    bd.querySelectorAll("[data-gs]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);const g=show[+b.dataset.gs];if(g&&g.ws&&g.ws.isConnected)g.ws.click()});
    bd.querySelectorAll("[data-my]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);if(my.isConnected)my.click()});
    bd.querySelectorAll("[data-all]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);allGames()})}
  function allGames(){const G=[...lb.querySelectorAll("[data-w]")],my=lb.querySelector("#myg");
    sheet("正在對戰",b=>{b.innerHTML=(my?'<button class="item" data-my="1"><span class="tx"><b>我的對局</b><span>回到戰場</span></span><span class="muted">›</span></button>':"")+
      G.map((w,i)=>{const c=w.closest(".card"),ns=c?[...c.querySelectorAll(".gc-l1 .gc-p b")].map(x=>mfTx(x.textContent)).join(" 對 "):"",l2=c?mfTx((c.querySelector(".gc-l2 .muted")||{}).textContent||""):"";
        return`<div class="item" style="gap:8px"><span class="tx"><b>${esc(ns||"一盤棋")}</b><span>${esc(l2)}</span></span>${c&&c.querySelector("[data-ws]")?`<button class="pill" data-gs="${i}">誰在看</button>`:""}<button class="pill" data-g="${i}">觀看</button></div>`}).join("")||'<p class="muted">目前沒有人在對戰</p>';
      b.querySelectorAll("[data-g]").forEach(x=>x.onclick=()=>{const w=G[+x.dataset.g];closeSheet();setTimeout(()=>{if(w.isConnected)w.click()},260)});
      b.querySelectorAll("[data-gs]").forEach(x=>x.onclick=()=>{const c=G[+x.dataset.gs].closest(".card"),ws=c&&c.querySelector("[data-ws]");if(ws)ws.click()});
      b.querySelectorAll("[data-my]").forEach(x=>x.onclick=()=>{closeSheet();setTimeout(()=>{if(my.isConnected)my.click()},260)})})}
  /* 我的名帖：狀態 */
  function mine(){const bk=lb.querySelector("#back"),s0=lb.querySelector("#sk0"),nm=(typeof myName==="function"&&myName())||"我";
    const[stx,act]=bk?["對局中","回到對局"]:s0?["找對手中","取消"]:["閒著","隨機配對"];
    me.innerHTML=`<b>${esc(nm)}</b><span>${stx}</span><small>${act} ›</small>`;   /* 11/10 開發者「名冊這頁有點亂」：名帖拿掉和狀態重複的朱印字（閒／閒著），只留名字、狀態、動作三行 */me.setAttribute("aria-label",`我的名帖：${stx}，點一下${act}`)}
  let meT=0;   /* 回饋 860（入口盤查後續）：「我」那一格會切換（找對手／取消），角色已經站在前面時快點兩下等於沒變；600ms 內只算一次 */
  me.onclick=()=>{const t=Date.now();if(t-meT<600)return;meT=t;vibrate(5);const b=lb.querySelector("#back")||lb.querySelector("#sk0")||lb.querySelector("#sk1");if(b)b.click()};
  /* 千秋盃（紅帖和筆） */
  function cup(){const c=null,b=fr.querySelector("#mfCup");b.hidden=true;if(!c)return;   /* 11/10 開發者「千秋盃只留一個」：名冊案上的千秋盃不再放，入口只剩茶坊二樓 */const t=mfTx(c.textContent),ph=t.split("擂台・")[1]||"";b.querySelector("span").textContent="千秋盃"+(ph?" "+ph.split("・")[0]:"");b.setAttribute("aria-label",t)}
  fr.querySelector("#mfCup").onclick=()=>{vibrate(5);const c=lb.querySelector("#cupE");if(c)c.click()};
  /* 拜匣：路過的石桌往事人物 */
  function box(){const J=[...lb.querySelectorAll("[data-jc]")],b=fr.querySelector("#mfBox"),w=fr.querySelector(".mf-jcs");b.hidden=!J.length;
    w.innerHTML=J.slice(0,3).map((x,i)=>{const n=mfTx((x.querySelector("b")||x).textContent);return`<button type="button" class="mf-jc" data-j="${i}" style="left:${((MF_BOX[0]+10+i*30)/7.68).toFixed(2)}%;top:${((MF_BOX[1]-12)/13.76).toFixed(2)}%;--r:${(i-1)*8}deg" aria-label="${esc(n)}">${esc(n.slice(0,4))}</button>`}).join("");
    b.querySelector("span").textContent=J.length>3?`路過的人物 ${J.length} 位`:"路過的人物";
    w.querySelectorAll("[data-j]").forEach(x=>x.onclick=e=>{e.stopPropagation();vibrate(5);const o=J[+x.dataset.j];if(o&&o.isConnected)o.click()})}
  fr.querySelector("#mfBox").onclick=()=>{vibrate(5);const J=[...lb.querySelectorAll("[data-jc]")];if(J.length===1){J[0].click();return}
    sheet("路過的石桌往事人物",b=>{b.innerHTML=J.map((x,i)=>`<button class="item" data-j="${i}"><span class="tx"><b>${esc(mfTx((x.querySelector("b")||x).textContent))}</b></span><span class="muted">›</span></button>`).join("");
      b.querySelectorAll("[data-j]").forEach(y=>y.onclick=()=>{const o=J[+y.dataset.j];if(o&&o.isConnected)o.click()})})};
  fr.querySelector("#mfDoor").onclick=()=>{vibrate(5);close()};
  more.onclick=e=>{e.stopPropagation();vibrate(5);zoom(true)};
  P.forEach(p=>p.addEventListener("click",e=>{if(!S.Z&&!e.target.closest(".mf-e:not(.off)")){vibrate(5);zoom(true)}}));
  const turn=d=>{const n=S.pi+d;if(n<0||n>=S.pages.length)return;vibrate(5);S.pi=n;sc.classList.add("mf-fade");fit();unfade()};
  nav.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>turn(+b.dataset.t));
  sc.querySelector(".mf-zx").onclick=()=>{vibrate(5);zoom(false)};
  let tx=null;fr.addEventListener("touchstart",e=>{tx=S.Z?[e.touches[0].clientX,e.touches[0].clientY]:null},{passive:true});
  fr.addEventListener("touchend",e=>{if(!tx)return;const dx=e.changedTouches[0].clientX-tx[0],dy=e.changedTouches[0].clientY-tx[1];tx=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))turn(dx<0?1:-1)},{passive:true});
  /* 原本的清單一重畫就跟著重畫 */
  let raf=0;const re=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(dw.isConnected)paint()})};
  const mo=new MutationObserver(re);mo.observe(lb,{childList:true,subtree:true,characterData:true});
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!dw.isConnected){ro.disconnect();mo.disconnect();return}fit()});ro.observe(dw)}
  /* 抽屜打開才放角色；收起時退出湊近、拿掉角色 */
  const walk=on=>{if(typeof shwMount!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;
    if(!on){fr.querySelectorAll(".shw,.shw-me,.shw-hint,.shw-say").forEach(x=>x.remove());delete dw.dataset.shw;return}
    if(dw.dataset.shw)return;try{shwMount({v,cfg:Object.assign({},SHW_PG0,SHW_MF),root:dw,frame:fr,layer:fr,before:fr.querySelector(".mf-bd"),sel:"#mfMe,#mfCup,#mfBox",keyOf:b=>b.id,find:h=>fr.querySelector("#"+h),mem:"mf"})}catch(e){}};
  let o0=null;const st=()=>{const o=dw.classList.contains("open");if(o===o0)return;o0=o;walk(o);
    if(!o&&S.Z){S.Z=false;dw.classList.remove("mf-z")}
    fit();if(o&&MF_GO){const g=MF_GO;MF_GO=null;setTimeout(()=>{if(g==="p")zoom(true);else if(g==="g")allGames()},60)}};
  new MutationObserver(st).observe(dw,{attributes:true,attributeFilter:["class"]});
  if(LP)LP.addEventListener("click",e=>{const m=e.target.closest&&e.target.closest(".lm-more");if(m)MF_GO=m.dataset.more==="g"?"g":"p"},true);
  fit();st()}
if(typeof lobbyMap==="function"){const f0=lobbyMap;lobbyMap=function(v){const r=f0.apply(this,arguments);try{if(ROSTER_MAP_ON)mfWrap(v)}catch(e){}return r}}
if(typeof oppCard==="function"){const f0=oppCard;oppCard=function(){const r=f0.apply(this,arguments);try{if(ROSTER_MAP_ON&&/^#\/lobby/.test(location.hash))mfCard()}catch(e){}return r}}
