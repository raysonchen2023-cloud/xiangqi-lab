/* ================= 📚 棋譜庫書架面板「書案攤書換書體」（42 案第 5 頁：Gemini 方案 1，Claude 依考究清單修正；考究說明 park/deskmap/考究說明.md）=================
   圖：park/deskmap/desk_day_v3.png（Gemini 重畫第二張＋宣紙濾鏡 0.6）、夜版 desk_night_v1.png（窗外夜色、青瓷油盞點火）→ art/deskmap/ → data/deskmap/。
   小素材 4 件（綠幕去背）：sj_hantao 藍布函套＋線裝冊（古譜）、sj_juanzong 布袱包卷宗（大師對局）、sj_xiang 樟木箱分冊（比賽對局）、sj_shouchao 朱絲欄手抄冊（我的對局）。
   包一層 libMap：10b 的宣紙面板 .lb-pn 改成滿版書案（同一個面板、同一套開關、同一個 xqPanelNav：返回鍵先收面板）。
   書橫攤在案上、中縫是一條橫線：上頁排前幾列、下頁接著排；往上滑、滾輪、或點版心的「下一頁」翻頁。
   原本的 .lib 整份留著、照舊運作：分類（古譜／大師對局／我的對局）和書目、下載與管理下載都在上方照舊點；清單本身藏起來，由這裡照它的內容排到書頁上，點一列＝點原本那一列；
     翻過已載入的列數＝按原本的「再顯示 60 局」；我的對局翻頁＝按原本的上一頁／下一頁；生平卡＝第一列；沒有棋局時照原本的話和按鈕。
   版框、版心（書名、卷次、頁碼）由程式照透視畫：刻本（古譜、比賽對局）墨框白口單魚尾、卷宗細墨線、手抄冊朱絲欄。
   青瓷油盞＝搜尋（點了才出現原本的搜尋框）；書口上的紙籤＝棋手篩選（原本的棋手清單）、執紅／執黑、他贏／他輸／和局、清除。
   角色站在書案左前方待機；換分類（換書體）時走到案前；點一盤棋直接開、不等角色（開發者 11/9：一列一列翻，不能每次都等走路）。書頁上的字最小 13px，放不下先截短賽事名。開關 DESKMAP_ON（false＝照舊 10b 的宣紙面板）；圖片網址帶 SJ_IMGV；前綴 sj */
const DESKMAP_ON=true;
const SJ_IMGV="2500";
const SJ_PG=[[[172,416],[596,416],[611,678],[157,678]],[[155,684],[613,684],[639,966],[128,966]]];   /* 上頁、下頁四角（像素 768×1376） */
const SJ_LAMP=[241,262],SJ_TI=[190,1112];
const SJ_INK={hantao:["#2a2420",2.2,"刻本"],xiang:["#2a2420",2.2,"刻本"],juanzong:["#4a4038",1,"卷宗"],shouchao:["#b8402c",1.1,"手抄"]};
const SHW_SJ={W:768,H:1376,el:45,h:[.075,96,.001],look0:[50,60],home:"home",N:{home:[17,96],front:[50,96],fe:[50,91],tb:[50,82]},E:"home-front front-fe",
  T:{tb:"desk"},   /* 回饋 820：書案桌面可以走，繞過書、油盞、書體小素材、硯台、筆；從書案下方中間跳上去；俯視圖，身高不變 */
  TB:{desk:{poly:[[19,16],[81,16],[96,89],[5,89]],hy:[88,96,0],hops:[["fe",[47,85]]],
    ob:[[[22,29.5],[78,29.5],[84,71.6],[16,71.6]],[[24,15],[40,15],[40,25],[24,25]],[[11,74],[39,74],[39,88],[11,88]],[[62.5,73.2],[83.5,73.2],[83.5,80.5],[62.5,80.5]],[[55,79],[91,79],[91,87],[55,87]]]}},   /* 回饋 816：點書案桌面空處＝跳上書案（書頁上的列、題簽、紙籤是按鈕，照舊） */   /* 回饋 808：換分類＝跳上書案下方的空處（書頁下面、硯台左邊），不擋清單 */
  HS:{sjGrp:["tb",50,60,"idle"]}};
const sjKind=c=>["ai","play","pvp","study"].includes(c)?"shouchao":/^(gmgames|xuyinchuan)$/.test(c||"")?"juanzong":(typeof LB_OLD!=="undefined"&&LB_OLD.some(x=>x[0]===c))?"hantao":"xiang";
const sjDark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
const sjCn=n=>{const d="〇一二三四五六七八九";n=Math.max(1,n|0);if(n<10)return d[n];if(n<100)return(n>=20?d[Math.floor(n/10)]:"")+"十"+(n%10?d[n%10]:"");return String(n)};
/* 11/12 第 11 輪觸控測試（touch-stress）：觸控螢幕（粗指標或有觸控點）時，書頁一列、翻頁鍵、書口紙籤都至少 44px 高（面板加 .sj-co）；滑鼠照舊密排。
   觸控時一列 48px（書頁有透視，上頁的列在畫面上會縮到約 0.93 倍，48 才保證至少 44），上頁不放書名列、翻頁列搬到書下面的紙條上，兩頁只留 4px 邊，iPhone SE 每頁放得下 2 列 */
const sjCoarse=()=>{try{return matchMedia("(pointer:coarse)").matches||(navigator.maxTouchPoints||0)>0}catch(e){return false}};
/* 同一輪：青瓷油盞（搜尋）被上方「匯入棋譜／局面還原」那排卡片蓋住（.lib>* 整排都接點選）→ 油盞的按鈕往下挪到卡片下面（最多挪到書頁上緣）；
   書口紙籤若跟挪下來的油盞同一欄，紙籤整排往右讓開 */
function sjLampFit(pn,fr){try{const lp=fr.querySelector(".sj-lamp"),sl=fr.querySelector(".sj-slips"),pg=fr.querySelector(".sj-p");if(!lp)return;lp.style.marginTop="";if(sl)sl.style.paddingLeft="";
  const L=lp.getBoundingClientRect();if(!L.width)return;let bot=-1e9;
  pn.querySelectorAll(".lb-pn-b .lib>*,.lb-pn-h").forEach(e=>{const r=e.getBoundingClientRect();if(r.height<2||r.width<2||getComputedStyle(e).pointerEvents==="none")return;if(r.right<=L.left||r.left>=L.right||r.top>=L.bottom||r.bottom<=L.top)return;bot=Math.max(bot,r.bottom)});
  if(bot>-1e9){const d=Math.ceil(bot+6-L.top),lim=pg?pg.getBoundingClientRect().top+4-L.bottom:d;if(d>0&&d<=lim)lp.style.marginTop=d+"px"}
  if(sl){const A=lp.getBoundingClientRect(),S=sl.getBoundingClientRect();if(S.left<A.right&&S.right>A.left&&S.top<A.bottom&&S.bottom>A.top)sl.style.paddingLeft=Math.ceil(A.right+6-S.left)+"px"}}catch(e){}}
function sjM3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function sjCss(){if(document.getElementById("sjCss"))return;const s=document.createElement("style");s.id="sjCss";s.textContent=`
.lb-pn.sj-pn{top:var(--xqT,0px);bottom:var(--xqB,0px);height:auto;border:0;border-radius:0;background:#3a2c1e;overflow:hidden}
.lb-pn.sj-pn.sj-dk{background:#151b28}
.sj-sc{position:absolute;inset:0;overflow:hidden;z-index:0}
.sj-fr{position:absolute;left:0;top:0}
.sj-fr>img.sj-bg{display:block;width:100%;height:100%;user-select:none;-webkit-user-drag:none;pointer-events:none}
.sj-ti{position:absolute;width:27%;transform:translate(-50%,-50%);pointer-events:none;transition:opacity .25s;filter:drop-shadow(1px 2px 2px rgba(40,25,10,.35))}
.sj-dk .sj-ti{filter:brightness(.72) saturate(.85) drop-shadow(1px 2px 2px rgba(0,0,0,.4))}
.sj-p{position:absolute;left:0;top:0;transform-origin:0 0;color:#2a1f15}
.sj-p>svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sj-rows{position:absolute;left:14px;right:14px;display:flex;flex-direction:column}
.sj-row{display:flex;align-items:center;gap:6px;flex:none;height:var(--sj-rh,25px);width:100%;padding:0 2px;margin:0;border:0;border-bottom:1px dotted rgba(90,60,30,.28);border-radius:0;background:none;color:#2a1f15;font:700 13px/1 var(--serif,serif);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.sj-row:last-child{border-bottom:0}.sj-row:active{background:rgba(178,58,38,.1)}
.sj-pn .sj-row.shw-fade,.sj-pn #grp button.shw-fade{opacity:1!important}
.sj-n{flex:none;min-width:2.5em;color:#7a6650;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:4.6em}
.sj-row b{flex:0 1 auto;min-width:0;max-width:64%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:800}.sj-row b .rn{color:#b23a26}
.sj-e{flex:1 1 0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#7a6650;font-size:13px;font-weight:500}
.sj-s{flex:none;width:32px;height:19px;border-radius:2px;display:flex;align-items:center;justify-content:center;font:900 13px/1 var(--kai,var(--serif,serif));letter-spacing:-1px}
.sj-s.r{background:#b23a26;color:#fbeee0}.sj-s.b{background:#2a2420;color:#efe6d2}.sj-s.d{box-shadow:inset 0 0 0 1.2px #6a5640;color:#6a5640}
.sj-s.g{background:none;color:#9a8670;font-size:15px}
.sj-row.sj-bio b{color:#8a2a1a}.sj-row.sj-bio .sj-e{color:#8a2a1a}
.sj-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:100%;padding:0 10px;text-align:center;color:#5a4630;font:600 13px/1.5 var(--serif,serif)}
.sj-empty button{border:1px solid #8a5a2a;background:#f3ead2;color:#5a2a14;border-radius:4px;padding:5px 12px;font:800 13px var(--serif,serif);cursor:pointer}
.sj-hd,.sj-ft{position:absolute;left:14px;right:14px;height:20px;display:flex;align-items:center;justify-content:center;gap:8px;font:800 13px/1 var(--kai,var(--serif,serif));color:#4a3a28;white-space:nowrap}
.sj-hd{top:6px}.sj-ft{bottom:6px;justify-content:space-between}
.sj-hd span,.sj-ft span{overflow:hidden;text-overflow:ellipsis}
.sj-ft button{border:0;background:none;padding:6px 6px;margin:-6px -6px;font:800 13px/1 var(--kai,var(--serif,serif));color:#7a2a18;cursor:pointer}
.sj-ft button:disabled{color:rgba(74,58,40,.3);cursor:default}
.sj-co .sj-hd{display:none}
.sj-co .sj-ft{bottom:-54px;height:44px;left:2px;right:2px;padding:0 2px;background:rgba(243,234,210,.95);border:1px solid #8a6a3a;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.sj-co .sj-ft button{min-height:44px;min-width:44px;padding:0 8px;margin:0}
.sj-co .sj-slips button{min-height:44px;min-width:44px;padding-top:6px}.sj-co .sj-slips button.on{min-height:48px}
.sj-slips{position:absolute;display:flex;align-items:flex-end;gap:3px;overflow-x:auto;scrollbar-width:none;transform:translateY(-100%);padding-top:4px}.sj-slips::-webkit-scrollbar{display:none}
.sj-slips button{flex:none;border:1px solid #9a7a4a;border-bottom:0;border-radius:2px 2px 0 0;background:#efe4c8;color:#3a2618;padding:4px 7px 6px;font:800 13px/1 var(--kai,var(--serif,serif));cursor:pointer;box-shadow:0 -1px 2px rgba(0,0,0,.15);max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sj-slips button.on{background:#fffaf0;color:#9a2a18;border-color:#b23a26;padding-bottom:9px}
.sj-lamp{position:absolute;width:15%;aspect-ratio:1;transform:translate(-50%,-50%);border:0;padding:0;background:none;border-radius:50%;cursor:pointer;-webkit-tap-highlight-color:transparent}
.sj-lamp span{position:absolute;left:50%;top:100%;transform:translate(-50%,-30%);background:#f3ead2;border:1px solid #8a6a3a;color:#3a2618;border-radius:3px;font:800 13px/1 var(--kai,var(--serif,serif));padding:3px 5px;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.sj-qon .sj-lamp{box-shadow:0 0 0 2px rgba(242,201,76,.75),0 0 14px 4px rgba(242,201,76,.35)}
.lb-pn.sj-pn:not(.open){transform:translateY(calc(100% + var(--xqB,0px) + 24px))}   /* 822：面板夾在頂欄和底欄中間 */
.sj-pn .lb-pn-h{position:absolute;left:0;right:0;top:0;z-index:6;padding:8px 14px 10px;background:linear-gradient(rgba(246,239,223,.95) 72%,rgba(246,239,223,0));color:#2a1f15}
.sj-pn.sj-dk .lb-pn-h{background:linear-gradient(rgba(26,32,46,.95) 72%,rgba(26,32,46,0));color:#efe6d2}
.sj-pn .lb-pn-b{position:absolute;left:0;right:0;top:var(--sj-hb,46px);z-index:5;overflow:visible;flex:none;pointer-events:none}
.sj-pn .lb-pn-b .lib{max-width:680px;margin:0 auto;padding:0;pointer-events:none}
.sj-pn .lib>*{pointer-events:auto}
.sj-pn #libRecent,.sj-pn .lib #items,.sj-pn .lib #more,.sj-pn .lib-meta,.sj-pn .lib-bar #pf{display:none!important}
.sj-pn .lib-seg{margin:0 12px;background:rgba(243,234,210,.92);border:1px solid #8a6a3a;border-radius:6px}
.sj-pn .lib-seg button{height:30px;border-radius:4px;color:#6a5640;font-family:var(--serif,serif)}
.sj-pn .lib-seg button.on{background:#fffaf0;color:#8a2a1a;box-shadow:inset 0 0 0 1px #b23a26}
.sj-pn .lib .chips{padding:6px 12px 2px}
.sj-pn .lib .chips button{height:40px;min-width:60px;padding:0 10px;border-radius:3px;background:rgba(243,234,210,.95);border:1px solid #8a6a3a;color:#3a2618;font-family:var(--serif,serif);box-shadow:0 1px 2px rgba(0,0,0,.2)}
.sj-pn .lib .chips button small{color:#7a6650;font-size:13px}
.sj-pn .lib .chips button.on{background:#fffaf0;border-color:#b23a26;color:#8a2a1a}.sj-pn .lib .chips button.on small{color:#8a2a1a}
.sj-pn .lib-bar{display:none;position:static;background:none;padding:6px 12px 0}
.sj-pn.sj-qon .lib-bar{display:block}
.sj-pn .lib .search input{background:#fffaf0;border:1px solid #8a6a3a;color:#2a1f15}
@media (prefers-reduced-motion:reduce){.sj-ti{transition:none}}`;document.head.append(s)}
/* 一頁的版框＋版心（w×h 是這一頁在螢幕上的大小；版心在書口那一邊：上頁在上緣、下頁在下緣） */
function sjFrameSVG(w,h,top,kind,bare){const[c,sw]=SJ_INK[kind]||SJ_INK.hantao,m=6,y=top?m+20:h-m-20,fx=Math.round(w*.2),y0=top?m:h-m-20,y1=y0+20,my=(y0+y1)/2;
  if(bare)return`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><rect x="${m}" y="${m}" width="${w-2*m}" height="${h-2*m}" fill="none" stroke="${c}" stroke-opacity=".82" stroke-width="${sw}"/></svg>`;
  return`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="${c}" stroke-opacity=".82"><rect x="${m}" y="${m}" width="${w-2*m}" height="${h-2*m}" stroke-width="${sw}"/><line x1="${m}" y1="${y}" x2="${w-m}" y2="${y}" stroke-width="${Math.max(.8,sw*.5)}"/></g>`+
    (kind==="hantao"||kind==="xiang"?`<path d="M${fx} ${y0+3}h12l-6 ${(my-y0-3).toFixed(1)} 6 ${(y1-3-my).toFixed(1)}h-12z" fill="${c}" fill-opacity=".85"/>`:"")+`</svg>`}
function sjWrap(v){const pn=v.querySelector(".lb-pn"),root=pn&&pn.querySelector(".lib");if(!pn||!root||pn.classList.contains("sj-pn"))return;sjCss();
  const items=root.querySelector("#items"),more=root.querySelector("#more"),cnt=root.querySelector("#cnt"),qi=root.querySelector("#q"),pf=root.querySelector("#pf"),clr=root.querySelector("#clr");if(!items||!more)return;
  const dk=sjDark();pn.classList.add("sj-pn");pn.classList.toggle("sj-co",sjCoarse());pn.classList.toggle("sj-dk",dk);
  const hd=pn.querySelector(".lb-pn-h");if(hd&&hd.firstChild&&hd.firstChild.nodeType===3)hd.firstChild.textContent="";   /* 拿掉標題前的 📜 */
  const sc=document.createElement("div");sc.className="sj-sc";
  const pct=(x,y)=>`left:${(x/7.68).toFixed(2)}%;top:${(y/13.76).toFixed(2)}%`;
  sc.innerHTML=`<div class="sj-fr"><img class="sj-bg" src="${xqClImg(`data/deskmap/${dk?"desk_night":"desk_day"}.webp?v=${SJ_IMGV}`)}" alt="崇文書閣窗下的書案，上面攤著一部書"><img class="sj-ti" alt="" style="${pct(SJ_TI[0],SJ_TI[1])}">
    <div class="sj-p" data-p="0"><div class="sj-hd"></div><div class="sj-rows"></div></div><div class="sj-p" data-p="1"><div class="sj-rows"></div><div class="sj-ft"><button type="button" data-t="-1">‹ 上一頁</button><span></span><button type="button" data-t="1">下一頁 ›</button></div></div>
    <div class="sj-slips"></div><button type="button" class="sj-lamp" style="${pct(SJ_LAMP[0],SJ_LAMP[1])}" aria-label="搜尋"><span>搜尋</span></button></div>`;
  pn.insertBefore(sc,pn.firstChild);
  const fr=sc.querySelector(".sj-fr"),P=[...fr.querySelectorAll(".sj-p")],slips=fr.querySelector(".sj-slips"),ti=fr.querySelector(".sj-ti");
  const S={v,pn,fr,sp:0,sig:"",kind:"",C:12,n:0,k:1,w:[0,0],h:[0,0]};
  /* 圖照螢幕大小鋪滿（手機直立＝以高為準、左右各裁一點；畫面偏寬時改成整張放進來） */
  const fit=()=>{const W=pn.clientWidth,H=pn.clientHeight;if(!W||!H)return;const k=W/H>.62?H/1376:Math.max(W/768,H/1376),fw=768*k,fh=1376*k,L=(W-fw)/2,T=(H-fh)/2;S.k=k;
    Object.assign(fr.style,{width:fw+"px",height:fh+"px",left:L+"px",top:T+"px"});
    SJ_PG.forEach((q,i)=>{const Q=q.map(([x,y])=>[x*k,y*k]),w=Math.round((Q[1][0]-Q[0][0]+Q[2][0]-Q[3][0])/2),h=Math.round((Q[3][1]-Q[0][1]+Q[2][1]-Q[1][1])/2);S.w[i]=w;S.h[i]=h;
      Object.assign(P[i].style,{width:w+"px",height:h+"px",transform:sjM3(w,h,Q)})});
    const t=SJ_PG[0];Object.assign(slips.style,{left:(t[0][0]*k)+"px",top:(t[0][1]*k-1)+"px",width:((t[1][0]-t[0][0])*k)+"px"});
    if(hd)pn.style.setProperty("--sj-hb",hd.offsetHeight+"px");paint()};
  /* 原本清單的每一列 → 書頁上的一列 */
  const rowOf=(x,i)=>{if(x.classList.contains("bio-card")){const n=x.querySelector("b");return`<button type="button" class="sj-row sj-bio" data-i="${i}"><span class="sj-n">生平</span><b>${esc(n?n.textContent:"")}</b><span class="sj-e">看完整生平</span><span class="sj-s g">›</span></button>`}
    const lb=x.querySelector(".lb"),b=x.querySelector(".tx b"),e=x.querySelector(".tx>span"),r=x.querySelector(".lib-r"),rk=r?["r","b","d"].find(k=>r.classList.contains(k)):"";
    const seal=rk?`<span class="sj-s ${rk}">${esc(r.textContent)}</span>`:'<span class="sj-s g">›</span>';
    return`<button type="button" class="sj-row" data-i="${i}" aria-label="${esc((b?b.textContent:"")+(e&&e.textContent?"，"+e.textContent:"")+(r?"，"+r.textContent:""))}"><span class="sj-n">${esc(lb?lb.textContent:"")}</span><b>${b?b.innerHTML:""}</b><span class="sj-e">${esc(e?e.textContent:"")}</span>${seal}</button>`};
  const pager=()=>more.querySelector("[data-pg]");
  const total=()=>{const m=(cnt&&cnt.textContent||"").match(/[\d,]+/);return m?parseInt(m[0].replace(/,/g,""),10)||0:0};
  function paint(){const kd=sjKind(libState.c);if(kd!==S.kind){S.kind=kd;ti.style.opacity="0";const im=new Image();im.onload=()=>{ti.src=im.src;ti.style.opacity="1"};im.src=`data/deskmap/sj_${kd}.webp?v=${SJ_IMGV}`}
    const L=[...items.children],em=L.find(x=>x.classList.contains("lib-empty")),rows=L.filter(x=>x.classList.contains("item")||x.classList.contains("bio-card"));
    const co=pn.classList.contains("sj-co"),rh=co?48:Math.max(25,Math.min(29,Math.round(25*Math.max(1,Math.min(1.15,S.k/.6))))),pad=co?[4,4]:[6+20+3,7],pb1=pad[0],cap=S.h.map((h,i)=>Math.max(co?1:3,Math.floor((h-(i?pb1:pad[0])-pad[1])/rh))),C=cap[0]+cap[1];
    const sig=[libState.c,libState.q,libState.player,libState.side,libState.res,rows[0]?rows[0].textContent:""].join("|");if(sig!==S.sig){S.sig=sig;S.sp=0}
    S.C=C;S.n=rows.length;if(S.sp*C>=rows.length&&S.sp>0)S.sp=Math.max(0,Math.ceil(rows.length/C)-1);
    P.forEach((p,i)=>{p.style.setProperty("--sj-rh",rh+"px");const rs=p.querySelector(".sj-rows");Object.assign(rs.style,i?{top:pad[1]+"px",bottom:pb1+"px"}:{top:pad[0]+"px",bottom:pad[1]+"px"});
      let svg=p.querySelector("svg");if(svg)svg.remove();p.insertAdjacentHTML("afterbegin",sjFrameSVG(S.w[i]||300,S.h[i]||170,!i,S.kind,co))});
    const R0=P[0].querySelector(".sj-rows"),R1=P[1].querySelector(".sj-rows");
    if(!rows.length){R1.innerHTML="";R0.innerHTML=em?`<div class="sj-empty"><span>${esc([...em.childNodes].filter(n=>!(n.classList&&(n.classList.contains("e")||n.tagName==="BUTTON"))).map(n=>n.textContent).join(" ").trim())}</span>${em.querySelector("button")?`<button type="button" data-em="1">${esc(em.querySelector("button").textContent)}</button>`:""}</div>`:"";
      const eb=R0.querySelector("[data-em]");if(eb)eb.onclick=()=>{vibrate(5);const o=em.querySelector("button");if(o)o.click()}}
    else{const a=S.sp*C;R0.innerHTML=rows.slice(a,a+cap[0]).map((x,j)=>rowOf(x,a+j)).join("");R1.innerHTML=rows.slice(a+cap[0],a+C).map((x,j)=>rowOf(x,a+cap[0]+j)).join("");
      fr.querySelectorAll(".sj-row").forEach(b=>b.onclick=()=>{const o=rows[+b.dataset.i];if(o&&o.isConnected){vibrate(5);o.click()}})}
    /* 版心：書名・卷次（上頁）、第幾頁（下頁） */
    const on=root.querySelector("#cols button.on b"),name=on?on.textContent:(pn.querySelector("#lbT")||{}).textContent||"書目";
    let pg=S.sp+1,np=Math.max(1,Math.ceil((total()||rows.length)/C));const pgt=more.querySelector("span.muted");if(pager()&&pgt){const m=pgt.textContent.match(/(\d+)\D+(\d+)/);if(m){pg=+m[1];np=+m[2]}}else if(!pager()){np=Math.max(np,pg)}
    P[0].querySelector(".sj-hd").innerHTML=`<span>${esc(name)}</span><span>卷${sjCn(Math.ceil(pg/10))}</span>`;
    const ft=P[1].querySelector(".sj-ft");ft.querySelector("span").textContent=rows.length?`第 ${pg}／${np} 頁`:"";
    const pv=more.querySelector('[data-pg="-1"]'),nx=more.querySelector('[data-pg="1"]'),mb=more.querySelector("button.btn");
    ft.querySelector('[data-t="-1"]').disabled=S.sp<=0&&!(pv&&!pv.disabled);ft.querySelector('[data-t="1"]').disabled=!((S.sp+1)*C<rows.length||(nx&&!nx.disabled)||mb);
    /* 書口紙籤：棋手篩選 */
    const pn0=libState.player,sl=[];
    if(pf&&!pf.hidden)sl.push(["pf",pn0?"棋手・"+pn0:"棋手",!!pn0]);
    if(pn0){sl.push(["s:r","執紅",libState.side==="r"],["s:b","執黑",libState.side==="b"],["r:w","他贏",libState.res==="w"],["r:l","他輸",libState.res==="l"],["r:d","和局",libState.res==="d"])}
    if(clr&&!clr.hidden)sl.push(["clr","清除",false]);
    slips.innerHTML=sl.map(([k,t,o])=>`<button type="button" data-k="${k}" class="${o?"on":""}">${esc(t)}</button>`).join("");
    slips.querySelectorAll("button").forEach(b=>b.onclick=()=>{vibrate(5);const k=b.dataset.k;if(k==="pf"){pf.click();return}if(k==="clr"){clr.click();return}
      const[f,val]=k.split(":");if(f==="s")libState.side=libState.side===val?"":val;else libState.res=libState.res===val?"":val;libState.limit=60;if(qi)qi.dispatchEvent(new Event("input"))});
    qon();requestAnimationFrame(()=>sjLampFit(pn,fr))}
  /* 翻頁：這一批還有就翻到下一面；翻完了＝按原本的「下一頁」（我的對局）或「再顯示 60 局」 */
  const turn=d=>{const pg=more.querySelector(`[data-pg="${d}"]`),ok=pg&&!pg.disabled;
    if(d>0){if((S.sp+1)*S.C<S.n){S.sp++;vibrate(5);paint()}else if(ok){vibrate(5);pg.click()}else{const mb=more.querySelector("button.btn");if(mb){S.sp++;vibrate(5);mb.click()}}}
    else if(S.sp>0){S.sp--;vibrate(5);paint()}else if(ok){vibrate(5);pg.click()}};
  P[1].querySelectorAll(".sj-ft [data-t]").forEach(b=>b.onclick=e=>{e.stopPropagation();turn(+b.dataset.t)});
  let ty=null;fr.addEventListener("touchstart",e=>{ty=e.target.closest(".sj-p")?e.touches[0].clientY:null},{passive:true});
  fr.addEventListener("touchend",e=>{if(ty==null)return;const dy=e.changedTouches[0].clientY-ty;ty=null;if(Math.abs(dy)>40)turn(dy<0?1:-1)},{passive:true});
  let wt=0;fr.addEventListener("wheel",e=>{if(!e.target.closest(".sj-p"))return;e.preventDefault();const t=Date.now();if(t-wt<350||Math.abs(e.deltaY)<20)return;wt=t;turn(e.deltaY>0?1:-1)},{passive:false});
  /* 青瓷油盞＝搜尋：點了才出現原本的搜尋框（已經有字就一直顯示） */
  let qOpen=false;const qon=()=>pn.classList.toggle("sj-qon",qOpen||!!(qi&&(qi.value||document.activeElement===qi)));
  fr.querySelector(".sj-lamp").onclick=()=>{vibrate(5);qOpen=!(pn.classList.contains("sj-qon"));if(!qOpen&&qi){qi.blur();if(qi.value){qi.value="";qi.dispatchEvent(new Event("input"))}}qon();requestAnimationFrame(()=>sjLampFit(pn,fr));if(qOpen&&qi)setTimeout(()=>qi.focus(),30)};
  if(qi){qi.addEventListener("focus",()=>{qOpen=true;qon()});qi.addEventListener("blur",()=>setTimeout(qon,0))}
  /* 原本的清單一有變動（換書、篩選、再顯示 60 局、翻頁）就重排書頁 */
  let raf=0;const re=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(pn.isConnected)paint()})};
  const mo=new MutationObserver(re);[items,more,cnt,root.querySelector("#cols"),pf,clr].filter(Boolean).forEach(x=>mo.observe(x,x===pf||x===clr?{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["hidden"]}:{childList:true,subtree:true,characterData:true}));
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!pn.isConnected){ro.disconnect();mo.disconnect();return}fit()});ro.observe(pn)}
  /* 面板打開才放角色，收起就拿掉（免得藏在後面還在畫） */
  const walk=on=>{if(typeof shwMount!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;
    if(!on){fr.querySelectorAll(".shw,.shw-me,.shw-hint,.shw-say").forEach(x=>x.remove());delete pn.dataset.shw;return}
    if(pn.dataset.shw)return;try{shwMount({v,cfg:Object.assign({},SHW_PG0,SHW_SJ),root:pn,frame:fr,layer:fr,before:ti,sel:"#grp button",keyOf:()=>"sjGrp",find:()=>null,mem:"sj"})}catch(e){}};
  let o0=null;const st=()=>{const o=pn.classList.contains("open");if(o===o0)return;o0=o;walk(o);if(o)fit()};new MutationObserver(st).observe(pn,{attributes:true,attributeFilter:["class"]});
  fit();st()}
if(typeof libMap==="function"){const f0=libMap;libMap=function(v,c0){const r=f0.apply(this,arguments);try{if(DESKMAP_ON)sjWrap(v)}catch(e){}return r}}
