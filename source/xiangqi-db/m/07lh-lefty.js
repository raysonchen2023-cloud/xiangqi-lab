/* ================= 🫲 左撇子單手模式（第 12 輪 F1；評審「左撇子單手玩家」，細項 P70.1、P70.3、P39.1）=================
   開關：store「lefty」（預設 false）。設定頁的勾選框（id="leftySw"）由 05-settings 加，這個檔不碰設定頁；
     畫面上有 #leftySw 時，這裡用 document 上的 change 事件委派負責存檔＋馬上套用（不用重開 App）。
   打開時 <html data-lefty>。不是整頁 CSS 鏡像：字照常由左往右，棋盤不鏡像（棋規方向不變），只把單手常按的東西搬到左手拇指好按的地方：
   ① 左下「拇指鍵」#lhDock：‹ 返回（代按頂欄的返回鍵 #back）＋ ⋯ 更多（代按頂欄收起來的「更多」）。
      位置（lhPlan）：① 對局、看譜頁的底部動作列夠寬（讓出拇指鍵後每顆還 ≥44px）就排進動作列最左邊，兩顆放不下只放返回；
      ② 不然排進著法籤那一列（#strip）最左邊；③ 都沒有才浮在底部構件（動作列、底部導覽列）上方 8px、靠左（安全區照算）。①② 版面高度不變，不蓋棋盤。
      頂欄的鍵照舊在（右手、螢幕報讀、鍵盤照舊用）；拇指鍵是同一個動作的第二個入口，頂欄的返回鍵藏起來時（場景頁用出口）拇指鍵也藏。
   ② 面板、卡片的 ✕ 搬到左上角；滿版面板（07w 的 xqSheet、棋譜書目、設定畫軸、修正紀錄、換手機文牒）左下角多一顆「✕ 收起」（按的是同一顆 ✕）。
   ③ 靠右的浮動控制項（聲音膠囊、覆盤列、合作棋門、黑洞的下一頁、片頭略過）搬到左邊。樣式寫在 m.css 的 html[data-lefty] 底下。
   底部動作列（新局、認輸…）的順序不鏡像：原本左邊就是常用的（翻轉、新局、寶物、悔棋），量過鏡像以後左手反而比較遠（art/docs/touch-stress.md 第 12 輪）。
   前綴 lh。測試：xiangqi-lab/tools/test-lefty.js；量測：xiangqi-lab/tools/qa/touch-stress.js --lefty */
/* #LH-PURE-BEGIN：不碰畫面的純函式 */
function lhOn(){try{return store.get("lefty",false)===true}catch(e){return false}}
/* 拇指鍵放哪（純計算）。o＝{vh 視窗高, tops 底部構件（底部動作列、底部導覽列）上緣, strip 著法籤列 {top,bottom}（夠高才給）, acts 底部動作列 {w 列寬, n 幾顆, gap 按鈕間距, cy 按鈕中線}, back 要不要返回, more 要不要更多}
   順序：① 排進底部動作列最左邊（讓出拇指鍵後每顆還 ≥44px；兩顆放不下就只放返回，更多留在頂欄；還放不下就把按鈕間距縮成 4px 再試）② 排進著法籤那一列最左邊 ③ 浮在最上面那條底部構件上方 8px。
   回傳 {mode:"acts"|"strip"|"float", bottom 離視窗下緣幾 px, back, more, dw 要讓出的寬} */
function lhDockW(k){return k>0?8+k*46+(k-1)*8+8:0}   /* 左邊 8＋每顆 46＋兩顆之間 8＋跟右邊按鈕之間 8 */
function lhPlan(o){o=o||{};const vh=+o.vh||0,H=46,back=!!o.back,more=!!o.more,k=(back?1:0)+(more?1:0);if(!k)return{mode:"none",bottom:0,back,more,dw:0};
  const A=o.acts,g0=A?+A.gap||0:0,fit=(n,g)=>!!(A&&A.n>0&&isFinite(A.cy)&&(A.w-lhDockW(n)-4-g*(A.n-1))/A.n>=44);
  /* 先用原本的按鈕間距；放不下再把間距縮成 4px 試一次（tight＝要縮） */
  for(const g of g0>4?[g0,4]:[g0]){const tight=g!==g0;
    if(fit(k,g))return{mode:"acts",bottom:Math.round(vh-A.cy-H/2),back,more,dw:lhDockW(k),tight};
    if(k===2&&fit(1,g))return{mode:"acts",bottom:Math.round(vh-A.cy-H/2),back:true,more:false,dw:lhDockW(1),tight}}
  const t=(o.tops||[]).filter(x=>typeof x==="number"&&isFinite(x)&&x>0&&x<=vh),floor=t.length?Math.min(...t):vh,st=o.strip;
  if(st&&isFinite(st.top)&&isFinite(st.bottom)&&st.bottom<=floor+1&&floor-st.bottom<=90&&st.bottom-st.top>=40)
    return{mode:"strip",bottom:Math.round(vh-(st.top+st.bottom)/2-H/2),back,more,dw:lhDockW(k)};
  return{mode:"float",bottom:Math.round(vh-floor+8),back,more,dw:0}}
/* 頂欄「更多」鍵：#topRight 裡看得到、aria-label 以「更多」開頭或字是 ⋯ 的那顆（list＝[{label,text,hidden}]，回傳索引，沒有＝-1） */
function lhMoreIdx(list){for(let i=0;i<(list||[]).length;i++){const b=list[i]||{};if(b.hidden)continue;if(/^更多/.test(b.label||"")||/^\s*⋯\s*$/.test(b.text||""))return i}return-1}
/* 返回鍵的念法：沿用頂欄返回鍵上的字（「‹回首頁」→「返回：回首頁」），讓螢幕報讀與量測都認得是返回 */
function lhBackLabel(t){t=String(t||"").replace(/\s+/g,"").replace(/^‹/,"");return t&&t!=="返回"?"返回："+t:"返回"}
/* 有左下「✕ 收起」的滿版面板：[面板, 它原本的 ✕, 開著的 class] */
function lhPanels(){return[[".xqs",".xqs-h button","open"],[".lb-pn",".lb-pn-h button","open"],[".sm-dw",".sm-dw-h button","open"],[".fbp-bw",".fbp-bw-h button","open"],[".hq-pn",".hq-h button","open"]]}
/* #LH-PURE-END */
var LH_S;
function lhSt(){return LH_S||(LH_S={dock:null,raf:0,obs:null,strip:null})}
/* 套用／取消：html[data-lefty]＋拇指鍵＋面板的收起鍵；開關切換時叫 */
function lhApply(on){if(on==null)on=lhOn();const R=document.documentElement;if(on)R.setAttribute("data-lefty","");else R.removeAttribute("data-lefty");
  if(on){lhDockMake();lhWatch();lhSync()}else{const S=lhSt();if(S.dock)S.dock.hidden=true;lhUnpad()}
  return on}
function lhUnpad(){const S=lhSt();if(S.strip){S.strip.classList.remove("lh-sp");S.strip=null}if(S.acts){S.acts.classList.remove("lh-ap","lh-g4");S.acts=null}}
function lhDockMake(){const S=lhSt();if(S.dock&&S.dock.isConnected)return S.dock;const d=document.createElement("div");d.id="lhDock";d.setAttribute("role","group");d.setAttribute("aria-label","左手拇指鍵");d.hidden=true;
  const mk=(id,lab,ch)=>{const b=document.createElement("button");b.type="button";b.id=id;b.className="lh-k";b.setAttribute("aria-label",lab);const i=document.createElement("b");i.setAttribute("aria-hidden","true");i.textContent=ch;b.append(i);return b};
  const bk=mk("lhBk","返回","‹"),mo=mk("lhMore","更多","⋯");mo.hidden=true;
  bk.onclick=()=>{const b=document.querySelector("#topbar #back");if(b&&!b.hidden){try{vibrate(5)}catch(e){}b.click()}};
  mo.onclick=()=>{const m=lhMoreBtn();if(m){try{vibrate(5)}catch(e){}m.click()}};
  d.append(bk,mo);(document.querySelector(".app")||document.body).append(d);S.dock=d;S.bk=bk;S.mo=mo;return d}
function lhVis(e){if(!e||e.hidden)return false;const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;const c=getComputedStyle(e);return c.display!=="none"&&c.visibility!=="hidden"}
function lhMoreBtn(){const tr=document.getElementById("topRight");if(!tr)return null;const bs=[...tr.querySelectorAll("button")];
  const i=lhMoreIdx(bs.map(b=>({label:b.getAttribute("aria-label")||"",text:b.textContent||"",hidden:!lhVis(b)})));return i>=0?bs[i]:null}
/* 重算拇指鍵：要不要出現、放哪；面板補「✕ 收起」 */
function lhSync(){const S=lhSt();S.raf=0;if(!lhOn())return;const d=lhDockMake(),bk=document.querySelector("#topbar #back"),more=lhMoreBtn();
  const wantBk=lhVis(bk),wantMore=!!more;
  /* 蓋在對話框、卡片底下的時候不出來（避免點穿） */
  const busy=!!document.querySelector(".modal,#sheet.show");lhPanelFoot();
  if(!(wantBk||wantMore)||busy){d.hidden=true;lhUnpad();return}
  const v=document.getElementById("view"),vh=innerHeight,tops=[];
  const st=v?[...v.querySelectorAll(".strip")].filter(lhVis).pop():null,ac=v?[...v.querySelectorAll(".actions")].filter(lhVis).pop():null;
  if(ac)tops.push(ac.getBoundingClientRect().top);
  const tb=document.getElementById("tabbar");if(lhVis(tb)){const bt=[...tb.querySelectorAll("button")].filter(lhVis).map(b=>b.getBoundingClientRect().top);tops.push(bt.length?Math.min(...bt):tb.getBoundingClientRect().top)}
  let AI=null;if(ac){const bs=[...ac.querySelectorAll(":scope > button")].filter(lhVis);if(bs.length){const r=bs[0].getBoundingClientRect();AI={w:ac.getBoundingClientRect().width,n:bs.length,gap:ac.classList.contains("lh-g4")?(+ac.dataset.lhGap||0):(parseFloat(getComputedStyle(ac).columnGap)||0),cy:r.top+r.height/2}   /* 已經縮過間距的，用縮之前記下的原本間距算，免得下一次又放回去（來回跳） */}}
  const sr=st?st.getBoundingClientRect():null;
  /* 安全區由 CSS 的 max(var(--lhB), safe-area＋8px) 管 */
  const P=lhPlan({vh,tops,strip:sr?{top:sr.top,bottom:sr.bottom}:null,acts:AI,back:wantBk,more:wantMore});
  S.bk.hidden=!P.back;S.mo.hidden=!P.more;
  if(P.back)S.bk.setAttribute("aria-label",lhBackLabel(bk.textContent));
  if(P.more)S.mo.setAttribute("aria-label",more.getAttribute("aria-label")||"更多");
  if(S.acts&&(S.acts!==ac||P.mode!=="acts")){S.acts.classList.remove("lh-ap","lh-g4");S.acts=null}
  if(S.strip&&(S.strip!==st||P.mode!=="strip")){S.strip.classList.remove("lh-sp");S.strip=null}
  if(P.mode==="acts"){ac.classList.add("lh-ap");if(P.tight)ac.dataset.lhGap=String(AI.gap);ac.classList.toggle("lh-g4",!!P.tight);ac.style.setProperty("--lhW",P.dw+"px");S.acts=ac}
  if(P.mode==="strip"){st.classList.add("lh-sp");st.style.setProperty("--lhW",P.dw+"px");S.strip=st}
  d.hidden=false;d.dataset.mode=P.mode;d.style.setProperty("--lhB",Math.max(0,P.bottom)+"px")}
function lhKick(){const S=lhSt();if(S.raf||!lhOn())return;S.raf=setTimeout(lhSync,60)}   /* 用 setTimeout 不用 requestAnimationFrame：分頁在背景時 rAF 不跑 */
function lhWatch(){const S=lhSt();if(S.obs)return;try{const mo=new MutationObserver(lhKick);
  const tb=document.getElementById("topbar"),v=document.getElementById("view");if(tb)mo.observe(tb,{subtree:true,childList:true,attributes:true,attributeFilter:["hidden","class","style"]});
  if(v)mo.observe(v,{childList:true,subtree:true});mo.observe(document.body,{childList:true});S.obs=mo}catch(e){}
  addEventListener("resize",lhKick);addEventListener("hashchange",()=>setTimeout(lhKick,60));document.addEventListener("transitionend",lhKick,true);
  setInterval(()=>{if(lhOn())lhKick()},1500)}   /* 保險：面板開關（class 變化）不一定觸發上面的監聽 */
/* 滿版面板左下角的「✕ 收起」（按原本那顆 ✕）；只建一次，沒開左撇子模式時 CSS 藏著 */
function lhPanelFoot(){for(const[ps,xs]of lhPanels())for(const p of document.querySelectorAll(ps)){if(p.querySelector(":scope > .lh-x"))continue;const x=p.querySelector(xs);if(!x)continue;
  const b=document.createElement("button");b.type="button";b.className="lh-x";b.setAttribute("aria-label",x.getAttribute("aria-label")||"收起");
  for(const[t,s]of[["b","✕"],["span","收起"]]){const i=document.createElement(t);i.setAttribute("aria-hidden","true");i.textContent=s;b.append(i)}
  b.onclick=e=>{e.stopPropagation();const y=p.querySelector(xs);if(y)y.click()};p.append(b)}}
document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="leftySw")return;store.set("lefty",!!t.checked);lhApply(!!t.checked);
  try{toast(t.checked?"🫲 左撇子單手模式：開（返回、更多在左下角）":"🫲 左撇子單手模式：關")}catch(x){}});
/* 開 App 就套用（這個檔在 m.html 後段，DOM 已經在） */
try{if(lhOn()){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>lhApply(true));else lhApply(true)}}catch(e){}
