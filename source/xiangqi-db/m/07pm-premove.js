/* ================= ⚡ 快棋模式・預走（評比循環第 12 輪 F3；評審細項 P57.1 預走機制與響應、P57.3、P23.1、P58.4；評審「極限快棋玩家」）=================
   一、預走（premove）：電腦還在想（輪到對方、或 thinking）時，在平面棋盤上先點自己的子、再點目標格＝排好下一步。
     排好以後：起點、落點各一個紫色虛線框（落點框裡淡淡塗色），中間一條淡色虛線箭頭，落點右上角一個「預」字小牌；電腦思考中的狀態列多寫「⏳ 已預走 …」。
     輪到你那一刻（08b render 收到新盤面）就檢查：這步合法＝立刻走出（不用再點）；不合法（被擋、送將、那顆子被吃）＝自動取消，輕提示一句。
     取消：排好以後再點棋盤任何一下（點自己的另一顆子＝取消並改選那顆；其他地方＝只取消）；選了子還沒點落點時，再點同一顆或點空白＝不選。
     一次只排一步。悔棋、開新局、對局結束、換盤（對局 id 變了）都自動清掉。
     可排的落點：照棋子走法，但對方的子擋住的不算擋（對方這一步可能讓開），自己的子擋住的照擋；落點是自己的子不行（點自己的子＝換選）。真正能不能走，輪到你時照棋規判。
     預走走出後 2.5 秒內，對方剛剛那一步用灰色虛線標著（棋盤上「上一步」已經換成你的預走，不然看不到對方走了什麼）。
     開關：store「premove」（預設 true）；畫面上有 id="premoveSw" 的勾選框時，這裡負責存檔。
     第 13 輪 F3：線上對局（09b PvpGame，自己坐紅或黑時；觀戰、同一支手機輪流下不做）也接上同樣四個掛勾，走出時走線上原本的送步路徑（簽名、驗證不變）。
     第 13 輪 F4：3D 園子（含朝代擂台、黑洞巨盤）也能排：點選經 park3d onTap 進來同一個 pmvTap；標記由 park3d 照 o.pre／o.pmOpp 畫（PKCB 區塊 pkcbPre）。ex.flat===false 仍可讓某個畫面不開預走。
   二、快棋模式：store「blitz」（預設 false）；設定頁 id="blitzSw" 的勾選框由這裡存檔、套用（document 上的 change 事件委派）。
     打開時：走子滑動、被吃的子淡出、上一步外圈縮到最短；吃子水墨、將軍印章、開局特效、開局名稱、將死動畫（含擋住結果視窗的 2.7 秒）略過；結果視窗彈出動畫縮短；
     電腦節奏一律當作「快速」（xiangqi-lab/src/local.js 的 cpuPace 讀 m_blitz）。關掉＝全部照舊。減少動態效果（系統 prefers-reduced-motion、專注棋盤）原本的規則照舊。
     各動畫一般／快棋的毫秒數在 blzTab()（01-board、00-util、m.css 原本寫的數字；測試 test-blitz.js 會對）。
   三、量測：pmvStats() 回傳最近 20 次預走從「對方落子（xq-play 事件）」到「送出你的步」的毫秒數；離線量測腳本 xiangqi-lab/tools/blitz-measure.js。
   掛點：01-board（Board.draw 叫 pmvPaint 畫 o.pre／o.pmOpp；openFx、checkFx、kaijuFx、capFx 開頭問 blzSkip；走子動畫長度看 blzOn；將死動畫問 blzSkip）、
     08b-cpugame（tap 先問 pmvTap、draw 叫 pmvOpts、render 叫 pmvFire、狀態列 pmvLabel、將死動畫問 blzSkip）、09b-preload PvpGame（同樣四個＋pmvArrive 記對方落子時間、線上將死動畫問 blzSkip）、
     06-cpu parkDraw（ex.blitz＝blzOn()，park3d 走子動畫照 blzTab slide 的比例加快）。
   測試：xiangqi-lab/tools/test-blitz.js。文件：art/docs/blitz.md。前綴 pmv（預走）、blz（快棋）。 */
/* #PMV-PURE-BEGIN：不碰畫面、不碰 store 的純函式（測試、量測腳本切出來跑） */
function pmvSideOf(p){return p?(p===p.toUpperCase()?"r":"b"):null}
/* 預走可以排的落點（b＝90 格盤面，sq＝自己那顆子）：照棋子走法；車、炮不被對方的子擋（對方這一步可能讓開），車被自己的子擋；炮可以隔自己的子（當炮架）；馬腳、象眼先不管；落點不能是自己的子 */
function pmvReach(b,sq){const p=b&&b[sq];if(!p)return[];const s=pmvSideOf(p),t=p.toUpperCase(),r=sq/9|0,c=sq%9,out=[];
  const inb=(rr,cc)=>rr>=0&&rr<10&&cc>=0&&cc<9,own=i=>!!b[i]&&pmvSideOf(b[i])===s,add=(rr,cc)=>{if(inb(rr,cc)&&!own(rr*9+cc))out.push(rr*9+cc)};
  const pal=(rr,cc)=>cc>=3&&cc<=5&&(s==="r"?rr>=7&&rr<=9:rr>=0&&rr<=2);
  if(t==="K"){for(const[a,d]of[[1,0],[-1,0],[0,1],[0,-1]])if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="A"){for(const[a,d]of[[1,1],[1,-1],[-1,1],[-1,-1]])if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="B"){for(const[a,d]of[[2,2],[2,-2],[-2,2],[-2,-2]]){const rr=r+a;if(s==="r"?rr<5:rr>4)continue;add(rr,c+d)}}
  else if(t==="N"){for(const[a,d]of[[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[1,-2],[-1,2],[1,2]])add(r+a,c+d)}
  else if(t==="R"||t==="C"){for(const[a,d]of[[1,0],[-1,0],[0,1],[0,-1]]){let rr=r+a,cc=c+d;while(inb(rr,cc)){const i=rr*9+cc;if(own(i)){if(t==="R")break}else out.push(i);rr+=a;cc+=d}}}
  else if(t==="P"){const f=s==="r"?-1:1;add(r+f,c);if(s==="r"?r<=4:r>=5){add(r,c-1);add(r,c+1)}}
  return out}
/* 排好的預走 q＝{gid,n,f,t}（n＝排的時候棋譜有幾步）在新盤面 st 上該怎麼辦：
   wait＝還沒輪到你；fire＝合法、走出；illegal＝走不了；gone＝那顆子不在了（被吃）；stale＝悔棋、下完、步數對不上（安靜清掉）；other＝不是這一盤（別的對局的盤面，不動它）
   legalFn(b,side)：st 沒帶 legal 時自己算（core.js legal） */
function pmvCheck(q,st,me,legalFn){if(!q||!st)return"stale";if(st.id!==q.gid)return"other";if(st.result||!Array.isArray(st.moves)||st.moves.length<q.n)return"stale";
  if(st.turn!==me||st.thinking)return st.moves.length===q.n?"wait":"stale";
  if(st.moves.length!==q.n+1)return"stale";
  const p=st.board&&st.board[q.f];if(!p||pmvSideOf(p)!==me)return"gone";
  const L=Array.isArray(st.legal)&&st.legal.length?st.legal:typeof legalFn==="function"?legalFn(st.board,me):[];
  return L.some(m=>m[0]===q.f&&m[1]===q.t)?"fire":"illegal"}
/* 快棋模式各動畫：{代號:[名稱, 一般毫秒, 快棋毫秒]}；快棋 0＝略過。一般的數字照 01-board、00-util、m.css 原本寫的（test-blitz.js 會對） */
function blzTab(){return{
  slide:["走子滑動",280,90],
  capFade:["被吃的子淡出",450,120],
  ring:["上一步外圈（延遲＋淡入）",450,140],
  capFx:["吃子水墨「吃」（延遲 0.2 秒＋1.2 秒）",1400,0],
  checkFx:["將軍印章（延遲 0.2 秒＋1.9 秒）",2100,0],
  killFx:["將死動畫（擋住結果視窗）",2700,0],
  kaiju:["開局特效「開局」",2500,0],
  openFx:["開局名稱（延遲 0.35 秒＋2.2 秒）",2550,0],
  modal:["結果視窗彈出",280,60]}}
function blzMsOf(k,on){const T=blzTab()[k];return T?(on?T[2]:T[1]):0}
/* 統計：hist＝毫秒數（新的在前） */
function pmvSum(h){const a=(h||[]).filter(x=>typeof x==="number"&&isFinite(x));if(!a.length)return{n:0,last:null,avg:null,max:null,hist:[]};
  return{n:a.length,last:a[0],avg:Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10,max:Math.max(...a),hist:a}}
/* #PMV-PURE-END */
var PMV_S;
function pmvSt(){return PMV_S||(PMV_S={q:null,sel:null,fired:null,evAt:0,hist:[],tries:0})}
function pmvOn(){try{return store.get("premove",true)!==false}catch(e){return true}}
function blzOn(){try{return store.get("blitz",false)===true}catch(e){return false}}
/* 01-board、08b 問：這個動畫（blzTab 的代號）現在要不要略過 */
function blzSkip(k){return blzOn()&&blzMsOf(k,true)===0}
function pmvNow(){try{return performance.now()}catch(e){return Date.now()}}
function pmvMine(p,me){return!!p&&pmvSideOf(p)===me}
function pmvValid(st,x){return!!x&&!!st&&x.gid===st.id&&Array.isArray(st.moves)&&x.n===st.moves.length}
function pmvLegal(b,s){try{const C=typeof XQCore!=="undefined"?XQCore:window.XQCore;return C.legal(b,s)}catch(e){return[]}}
function pmvCn(b,f,t){try{const C=typeof XQCore!=="undefined"?XQCore:window.XQCore;return C&&C.notate?C.notate(b,f,t):""}catch(e){return""}}
function pmvSay(t){try{if(typeof axSay==="function")axSay(t)}catch(e){}}
function pmvVib(x){try{if(typeof vibrate==="function")vibrate(x)}catch(e){}}
function pmvClear(){const S=pmvSt();S.q=null;S.sel=null;S.tries=0}
/* 08b tap 在「還沒輪到你」時先問這個；回傳 true＝當成預走處理掉了。ex＝{flat:平面棋盤嗎, redraw:重畫} */
function pmvTap(st,me,i,ex){ex=ex||{};if(typeof bhtdPmv==="function"){const r=bhtdPmv(st,me,i,ex);if(r!=null)return r}   /* 11/14 黑洞塔防：電腦思考時只預選下一手的子（高亮、不排預走；07bht-td.js） */if(!pmvOn()||ex.flat===false||!st||st.result||!Array.isArray(st.moves)||!st.board)return false;
  const S=pmvSt(),b=st.board,n=st.moves.length,re=()=>{try{if(ex.redraw)ex.redraw()}catch(e){}};
  if(S.q&&S.q.gid===st.id){const q=S.q;S.q=null;S.sel=pmvMine(b[i],me)&&i!==q.f?{gid:st.id,n,sq:i}:null;pmvVib(5);pmvSay("已取消預走");re();return true}
  S.q=null;
  if(S.sel&&pmvValid(st,S.sel)){const f=S.sel.sq;
    if(i===f){S.sel=null;re();return true}
    if(pmvMine(b[i],me)){S.sel={gid:st.id,n,sq:i};pmvVib(5);re();return true}
    if(pmvReach(b,f).includes(i)){const cn=pmvCn(b,f,i);S.q={gid:st.id,n,f,t:i,cn};S.sel=null;S.tries=0;pmvVib(8);
      try{if(!store.get("pmvTip",0)){store.set("pmvTip",1);toast("⏳ 排好預走了：輪到你就自動走；再點一下棋盤就取消")}}catch(e){}
      pmvSay("預走"+(cn?"「"+cn+"」":"")+"，輪到你就自動走；再點一下棋盤取消");re();return true}
    S.sel=null;re();return true}
  S.sel=null;
  if(pmvMine(b[i],me)){S.sel={gid:st.id,n,sq:i};pmvVib(5);re();return true}
  return false}
/* 08b draw 組好棋盤選項 o 之後叫這個：還沒輪到你時，把預走選的子（o.sel、o.targets）、排好的預走（o.pre）、剛走出預走前對方那一步（o.pmOpp）放進去 */
function pmvOpts(st,me,o,flat){const S=pmvSt();if(!st||!o)return o;
  if(S.q&&pmvCheck(S.q,st,me,pmvLegal)==="stale")S.q=null;
  if(S.sel&&!pmvValid(st,S.sel))S.sel=null;
  if(!pmvOn()||flat===false||st.result)return o;
  if(st.turn!==me||st.thinking){
    if(S.sel&&pmvMine(st.board[S.sel.sq],me)){o.sel=S.sel.sq;o.targets=pmvReach(st.board,S.sel.sq)}
    if(S.q&&S.q.gid===st.id)o.pre={f:S.q.f,t:S.q.t};
    const F=S.fired;if(F&&F.gid===st.id&&st.moves.length===F.n&&F.f!=null&&Date.now()<F.until)o.pmOpp={f:F.f,t:F.t}}
  return o}
/* 08b 狀態列（電腦思考中）後面接的字 */
function pmvLabel(st){const S=pmvSt();return S.q&&st&&S.q.gid===st.id&&pmvOn()?"・⏳ 已預走"+(S.q.cn?"「"+S.q.cn+"」":""):""}
/* 08b render 每次拿到新盤面叫這個：輪到你、預走合法就呼叫 play(f,t) 走出。play 回 false＝畫面正忙（上一個請求還沒回來），25 毫秒後再試（again），最多 40 次 */
function pmvFire(st,me,play,again){const S=pmvSt();if(!S.q||!st)return"none";const q=S.q,r=pmvCheck(q,st,me,pmvLegal);
  if(r==="wait"||r==="other")return r;
  if(r==="stale"){S.q=null;S.tries=0;return r}
  if(r==="illegal"||r==="gone"){S.q=null;S.tries=0;const m=r==="gone"?"↩ 預走的那顆子被吃掉了，預走已取消":"↩ 預走"+(q.cn?"「"+q.cn+"」":"")+"現在走不了，已取消";
    try{toast(m)}catch(e){}pmvSay(m);return r}
  let ok=false;try{ok=play(q.f,q.t)}catch(e){ok=true}
  if(ok===false){if(++S.tries<=40&&typeof again==="function")setTimeout(again,25);else{S.q=null;S.tries=0}return"retry"}
  S.q=null;S.tries=0;const om=st.moves[q.n]||{};S.fired={gid:st.id,n:q.n+2,f:om.f,t:om.t,until:Date.now()+2500};
  const ms=S.evAt?pmvNow()-S.evAt:null;if(ms!=null&&ms>=0&&ms<60000){S.hist.unshift(Math.round(ms*10)/10);S.hist=S.hist.slice(0,20)}
  return"fire"}
/* 最近 20 次預走的反應時間（毫秒）：{n,last,avg,max,hist}；開發者在主控台看 pmvStats() */
function pmvStats(){return pmvSum(pmvSt().hist)}
/* 線上對局（09b）沒有 xq-play 事件：收到對方新的一步時叫這個，記下「對方落子」的時間給 pmvStats 量反應時間 */
function pmvArrive(){pmvSt().evAt=pmvNow()}
/* 01-board Board.draw 叫這個（棋子、上一步畫完以後）：el＝Board 的建 SVG 元素函式，X、Y＝格子→座標（已處理翻轉） */
function pmvPaint(svg,el,X,Y,o){try{if(!o||(!o.pre&&!o.pmOpp))return;const g=el("g",{"pointer-events":"none",class:"pmv"});
  const a=o.pmOpp;if(a&&a.f!=null&&a.t!=null){const GC="#6B6B6B";
    g.append(el("circle",{cx:X(a.f),cy:Y(a.f),r:20,fill:"none",stroke:GC,"stroke-width":3,"stroke-dasharray":"4 4",opacity:.7}));
    g.append(el("line",{x1:X(a.f),y1:Y(a.f),x2:X(a.t),y2:Y(a.t),stroke:GC,"stroke-width":4,"stroke-dasharray":"3 7","stroke-linecap":"round",opacity:.6}));
    g.append(el("circle",{cx:X(a.t),cy:Y(a.t),r:32,fill:"none",stroke:GC,"stroke-width":3,"stroke-dasharray":"4 4",opacity:.75}))}
  const p=o.pre;if(p&&p.f!=null&&p.t!=null){const PC="#7A3FD1",x1=X(p.f),y1=Y(p.f),x2=X(p.t),y2=Y(p.t),len=Math.hypot(x2-x1,y2-y1)||1,ux=(x2-x1)/len,uy=(y2-y1)/len;
    for(const q of[p.f,p.t])g.append(el("rect",{x:X(q)-29,y:Y(q)-29,width:58,height:58,rx:10,fill:q===p.t?"rgba(122,63,209,.14)":"none",stroke:PC,"stroke-width":4,"stroke-dasharray":"8 6"}));
    const ex=x2-ux*24,ey=y2-uy*24,hx=ex-ux*18,hy=ey-uy*18,nx=-uy*13,ny=ux*13;
    g.append(el("line",{x1:x1+ux*14,y1:y1+uy*14,x2:hx,y2:hy,stroke:PC,"stroke-width":7,"stroke-linecap":"round","stroke-dasharray":"12 8",opacity:.45}));
    g.append(el("polygon",{points:`${ex},${ey} ${hx+nx},${hy+ny} ${hx-nx},${hy-ny}`,fill:PC,opacity:.45}));
    const bx=x2+21,by=y2-21;g.append(el("circle",{cx:bx,cy:by,r:12,fill:"#fff",stroke:PC,"stroke-width":3}));
    g.append(el("text",{x:bx,y:by+5.5,"text-anchor":"middle","font-size":15,"font-weight":900,fill:PC,"font-family":"var(--sans)"},"預"))}
  if(g.childNodes.length)svg.append(g)}catch(e){}}
/* 快棋模式的畫面樣式：html.blz 時結果視窗彈出縮短（其他動畫在 01-board 直接略過或縮短） */
function blzApply(){try{const on=blzOn(),r=document.documentElement;r.classList.toggle("blz",on);
  if(!document.getElementById("blzCss")){const s=document.createElement("style");s.id="blzCss";s.textContent="html.blz .modal{animation-duration:.05s!important}html.blz .modal .box{animation-duration:.06s!important}";document.head.append(s)}}catch(e){}}
blzApply();
addEventListener("xq-play",()=>{pmvSt().evAt=pmvNow()});
document.addEventListener("change",e=>{const t=e.target;if(!t)return;
  if(t.id==="blitzSw"){store.set("blitz",!!t.checked);blzApply();try{toast(t.checked?"⚡ 快棋模式：開（動畫最短、電腦快速節奏）":"⚡ 快棋模式：關")}catch(x){}}
  else if(t.id==="premoveSw"){store.set("premove",!!t.checked);if(!t.checked)pmvClear();try{toast(t.checked?"⏳ 預走：開":"⏳ 預走：關")}catch(x){}}});
