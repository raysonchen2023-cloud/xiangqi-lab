/* ================= 🧩 棋理體驗（ChatGPT 改善單 I01，開發者 11/11）=================
   #/lesson/<站>：從星槎一站挑一個棋理，五步走完：
     ① 棋理卡：SHIP_STOP 的地點、人物一句＋SHIP_LESSON 的棋理、說明、口訣
     ② 先看懂威脅：點出「對方下一步會從哪裡殺你」的那顆子。威脅用 XQCore 規則現算（對方若先走，哪一步直接將死：legal＋inCheck，lsnMates），不寫死；點錯直接指出、畫紅箭頭
     ③ 走一步：錯了演題庫 tree.w 的真實反駁線（Pikafish 預先算的）＋一句 cjWhy（07c-canju.js）；對了演後續，顯示 cmt 和題目台詞 say.done；可以一直重試，錯兩次以上可看正解
     ④ 換一盤不同局面、不給威脅提示，同樣的回饋
     ⑤ 結果卡：兩題各第幾次走對、一句總結（照實際結果組）、回原處／再做一次／下一個小實驗（#/lab/grab，07z8-grablab.js）
   全程只放在記憶體：不寫進度、修為、題目統計、殘局棋力（比照 G01 示範模式）；只有「從哪一頁來」放 sessionStorage xqLabBack（回原處用）。
   目前只有唐站：第 1 題 xs-tang-0（星槎石桌・讓出那個角；跟《雲河七星》第八章故事標記 at:111「唐站・該撐仕還是棄仕解殺」是同一題）；
     第 2 題 gm1991（1991 趙國榮對李智屏，SHIP_PLAN.tang.byDiff[4] 的第一題；題庫 cmt「第一步就要捨得士」）。q2 可以放好幾題，進來時抽一題。
   入口：棋話一頁（07f-ship.js ShipLesson 呼叫 lsnShipAdd，只有 LSN_SET 有的站才出現）、主題訓練清單最下面「小實驗」（07-legend.js Theme 呼叫 lsnThemeAdd）。
   共用小工具（07z8-grablab.js 也用）：lsnGo／lsnBack（從哪來回哪去）、lsnMates、lsnArrows（棋盤上疊紅箭頭）、lsnPlay（一步一步演一串著法）、lsnCss。前綴 lsn */
const LSN_SET={tang:{q1:"xs-tang-0",q2:["gm1991-44A4r3KAB2r"]}};
/* 換到小實驗頁，記下從哪一頁來（每個目的地各記一筆，從 I01 結果卡去 I02 再回來，I01 的「回原處」還是原本那頁） */
function lsnGo(h){try{const M=JSON.parse(sessionStorage.getItem("xqLabBack")||"{}")||{};M[navKey(h)]=location.hash||"#/";sessionStorage.setItem("xqLabBack",JSON.stringify(M))}catch(e){}try{vibrate(5)}catch(e){}location.hash=h}
function lsnBack(def){try{const M=JSON.parse(sessionStorage.getItem("xqLabBack")||"{}")||{},b=M[navKey(location.hash)];if(b&&navKey(b)!==navKey(location.hash))return b}catch(e){}return def}
const lsnSq=u=>[XQCore.parseSq(u.slice(0,2)),XQCore.parseSq(u.slice(2,4))];
/* s 走一步就將死對方的著法 [{f,t}] */
function lsnMates(b,s){const C=XQCore,o=C.opp(s),R=[];for(const[f,t]of C.legal(b,s)){const nb=C.make(b,f,t);if(C.inCheck(nb,o)&&!C.legal(nb,o).length)R.push({f,t})}return R}
/* 對方走 a 將死以後，帥（將）為什麼走不了：旁邊九宮裡的格子，被自己的子擋住的列出子名，其他的都被對方看著 */
function lsnNoWay(b,me,a){const C=XQCore,nb=C.make(b,a.f,a.t),k=C.kingSq(nb,me),r0=k/9|0,c0=k%9,KN=C.NAMES[me].K,own=new Set();let free=0;
  for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){const r=r0+dr,c=c0+dc;if(c<3||c>5||(me==="r"?r<7||r>9:r<0||r>2))continue;const p=nb[r*9+c];if(p&&C.sideOf(p)===me)own.add(C.NAMES[me][p.toUpperCase()]);else free++}
  const w=[];if(own.size)w.push(`旁邊被自己的${[...own].join("、")}擋住`);if(free)w.push((own.size?"能去的格子":"旁邊的格子")+"都被對方看著");return`${KN}被將軍，${w.concat("無路可逃").join("，")}。`}
/* ---- 規則白話（11/11 AI 模擬玩家報告問題 7、15）：一步為什麼不能走、一顆子為什麼沒路走、一步將軍對方怎麼解。全部用 XQCore 現算，不寫死；
   07-legend.js 的練一題（jPuzzle）、訓練營（jLevel puzzle）也用。lsnPseudo＝照走法能到的格子（不管走完會不會被將），跟 xiangqi-referee.js 的 pseudo 同一套 */
function lsnPseudo(b,q){const C=XQCore,p=b[q];if(!p)return[];const r=q/9|0,c=q%9,s=C.sideOf(p),t=p.toUpperCase(),out=[],inb=(rr,cc)=>rr>=0&&rr<10&&cc>=0&&cc<9;
  const add=(rr,cc)=>{if(!inb(rr,cc))return;const x=b[rr*9+cc];if(!x||C.sideOf(x)!==s)out.push(rr*9+cc)},pal=(rr,cc)=>cc>=3&&cc<=5&&(s==="r"?rr>=7&&rr<=9:rr>=0&&rr<=2);
  const D4=[[1,0],[-1,0],[0,1],[0,-1]],DG=[[1,1],[1,-1],[-1,1],[-1,-1]],NJ=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
  if(t==="K"){for(const[a,d]of D4)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="A"){for(const[a,d]of DG)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="B"){for(const[a,d]of DG){const rr=r+2*a,cc=c+2*d;if(!inb(rr,cc)||(s==="r"?rr<5:rr>4)||b[(r+a)*9+c+d])continue;add(rr,cc)}}
  else if(t==="N"){for(const[a,d,la,ld]of NJ){const rr=r+a,cc=c+d;if(!inb(rr,cc)||b[(r+la)*9+c+ld])continue;add(rr,cc)}}
  else if(t==="R"||t==="C"){for(const[a,d]of D4){let rr=r+a,cc=c+d,j=false;while(inb(rr,cc)){const x=b[rr*9+cc];
      if(t==="R"){if(!x)out.push(rr*9+cc);else{if(C.sideOf(x)!==s)out.push(rr*9+cc);break}}else{if(!j){if(!x)out.push(rr*9+cc);else j=true}else if(x){if(C.sideOf(x)!==s)out.push(rr*9+cc);break}}rr+=a;cc+=d}}}
  else if(t==="P"){const f=s==="r"?-1:1;add(r+f,c);if(s==="r"?r<=4:r>=5){add(r,c-1);add(r,c+1)}}
  return out}
function lsnFacing(b){const C=XQCore,a=C.kingSq(b,"r"),k=C.kingSq(b,"b");if(a<0||k<0||a%9!==k%9)return false;for(let i=k+9;i<a;i+=9)if(b[i])return false;return true}
/* by 這一方哪些子吃得到 sq */
function lsnHitBy(b,sq,by){const C=XQCore,R=[];for(let i=0;i<90;i++){const p=b[i];if(p&&C.sideOf(p)===by&&lsnPseudo(b,i).includes(sq))R.push(i)}return R}
function lsnPN(b,i){const C=XQCore,p=b[i];return p?C.NAMES[C.sideOf(p)][p.toUpperCase()]:""}
function lsnNames(b,L){return[...new Set(L.map(i=>lsnPN(b,i)))].join("、")}
/* f→t 為什麼不能走（一句白話）；能走、點到自己的子、或走法本來就到不了（沒被擋，只是走錯形狀）回 "" */
function lsnWhyNot(b,f,t){const C=XQCore,p=b[f];if(!p||f===t||t<0)return"";const s=C.sideOf(p),o=C.opp(s),T=p.toUpperCase(),PN=C.NAMES[s][T],KN=C.NAMES[s].K,EK=C.NAMES[o].K;
  if(b[t]&&C.sideOf(b[t])===s)return"";if(C.legal(b,s).some(([x,y])=>x===f&&y===t))return"";
  if(lsnPseudo(b,f).includes(t)){const nb=C.make(b,f,t);
    if(lsnFacing(nb))return T==="K"?`${KN}走到這格會跟${EK}面對面（同一條直線、中間沒有子），不能走。`:`這顆${PN}一走開，${KN}和${EK}就面對面了（同一條直線、中間沒有子），不能走。`;
    const A=lsnHitBy(nb,C.kingSq(nb,s),o),an=A.length?`對方的${lsnNames(nb,A)}`:"對方";
    if(T==="K")return`${KN}走到這格會被${an}吃掉。`;
    if(C.inCheck(b,s))return`你的${KN}正被將軍，這步沒解掉：${an}還是吃得到${KN}。`;
    return`這顆${PN}一走開，${an}就能直接吃${KN}。`}
  const r=f/9|0,c=f%9,dr=(t/9|0)-r,dc=t%9-c,ar=Math.abs(dr),ac=Math.abs(dc);
  const between=()=>{let n=0;if(dr&&dc)return-1;const sr=Math.sign(dr),sc=Math.sign(dc);for(let rr=r+sr,cc=c+sc;rr*9+cc!==t;rr+=sr,cc+=sc)if(b[rr*9+cc])n++;return n};
  if(T==="N"&&((ar===2&&ac===1)||(ar===1&&ac===2))){const leg=ar===2?(r+dr/2)*9+c:r*9+c+dc/2;if(b[leg])return`${PN}腳被${lsnPN(b,leg)}絆住了（蹩馬腳），跳不過去。`}
  if(T==="B"&&ar===2&&ac===2){if(s==="r"?(t/9|0)<5:(t/9|0)>4)return`${PN}不能過河。`;const eye=(r+dr/2)*9+c+dc/2;if(b[eye])return`${PN}眼被${lsnPN(b,eye)}塞住了（塞象眼），飛不過去。`}
  if((T==="K"&&ar+ac===1)||(T==="A"&&ar===1&&ac===1))return`${PN}不能走出九宮（畫著斜線的那一塊）。`;
  if((T==="R"||T==="C")&&(!dr||!dc)){const n=between();if(T==="R"&&n>0)return`${PN}走直線，中間有子擋著，過不去。`;
    if(T==="C"&&b[t])return n?`${PN}吃子要剛好隔一顆子（炮架），這裡隔了 ${n} 顆。`:`${PN}吃子要隔一顆子當炮架，中間沒有子就吃不到。`;
    if(T==="C"&&n>0)return`${PN}不吃子的時候，中間不能有子擋著。`}
  return""}
/* sq 這顆子現在一步都走不了的白話原因；還能走回 "" */
function lsnStuck(b,sq){const C=XQCore,p=b[sq];if(!p)return"";const s=C.sideOf(p),o=C.opp(s),T=p.toUpperCase(),PN=C.NAMES[s][T];if(C.legal(b,s).some(([x])=>x===sq))return"";
  if(T==="K"){const r0=sq/9|0,c0=sq%9,own=new Set(),hit=new Set();let face=false,free=0;
    for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){const r=r0+dr,c=c0+dc;if(c<3||c>5||(s==="r"?r<7||r>9:r<0||r>2))continue;const q=r*9+c,x=b[q];
      if(x&&C.sideOf(x)===s){own.add(lsnPN(b,q));continue}free++;const nb=C.make(b,sq,q);if(lsnFacing(nb))face=true;else for(const i of lsnHitBy(nb,q,o))hit.add(lsnPN(nb,i))}
    const w=[];if(own.size)w.push(`旁邊被自己的${[...own].join("、")}擋住`);if(hit.size)w.push(`${own.size?(free>1?"空著的格子":"空著的那格"):"能去的格子"}會被對方的${[...hit].join("、")}吃掉`);if(face)w.push(`有一格走過去會跟${C.NAMES[o].K}面對面`);
    return`${PN}現在無路可走：${w.join("，")||"四周都走不了"}。`}
  const y=lsnPseudo(b,sq).map(t=>lsnWhyNot(b,sq,t)).find(Boolean);return y?`這顆${PN}現在不能動：${y}`:`這顆${PN}現在沒有路可走（四周被擋住了）。`}
/* s 走 f→t 是將軍時，對方怎麼解（舉一個）：先找吃掉這顆子，再找帥（將）走開，最後是擋；將死回 null、不是將軍回 "" */
function lsnCheckWhy(b,f,t){const C=XQCore,p=b[f];if(!p)return"";const s=C.sideOf(p),o=C.opp(s),nb=C.make(b,f,t);if(!C.inCheck(nb,o))return"";
  const L=C.legal(nb,o);if(!L.length)return null;const PN=C.NAMES[s][p.toUpperCase()],EK=C.NAMES[o].K,k=C.kingSq(nb,o);
  const cap=L.find(([x,y])=>y===t),run=L.find(([x])=>x===k),a=cap||run||L[0],cn=C.notate(nb,a[0],a[1]);
  return cap?`對方可以用${lsnPN(nb,a[0])}吃掉你的${PN}（${cn}）`:run?`對方的${EK}可以躲開（${cn}）`:`對方可以用${lsnPN(nb,a[0])}擋住（${cn}）`}
/* 棋盤上疊箭頭（每次重畫棋盤後呼叫）：list＝[{f,t,c,o}]；沒有 t＝只在 f 畫一圈 */
function lsnArrows(svg,list,flip){svg.querySelectorAll(".lsn-ov").forEach(x=>x.remove());if(!list||!list.length)return;
  const g=document.createElementNS("http://www.w3.org/2000/svg","g");g.setAttribute("class","lsn-ov");g.setAttribute("pointer-events","none");g.setAttribute("aria-hidden","true");
  const X=i=>40+(flip?8-i%9:i%9)*60,Y=i=>40+(flip?9-(i/9|0):(i/9|0))*60,F=n=>n.toFixed(1);let h="";
  for(const a of list){const c=a.c||"#D23A2A",op=a.o||.92,x1=X(a.f),y1=Y(a.f);h+=`<circle cx="${x1}" cy="${y1}" r="31" fill="none" stroke="${c}" stroke-width="5" opacity="${op}"/>`;if(a.t==null)continue;
    const x2=X(a.t),y2=Y(a.t),len=Math.hypot(x2-x1,y2-y1)||1,ux=(x2-x1)/len,uy=(y2-y1)/len,ex=x2-ux*20,ey=y2-uy*20,hx=ex-ux*24,hy=ey-uy*24,nx=-uy*17,ny=ux*17;
    h+=`<g opacity="${op}"><line x1="${F(x1+ux*31)}" y1="${F(y1+uy*31)}" x2="${F(hx)}" y2="${F(hy)}" stroke="#fff" stroke-width="15" stroke-linecap="round" opacity=".7"/><line x1="${F(x1+ux*31)}" y1="${F(y1+uy*31)}" x2="${F(hx)}" y2="${F(hy)}" stroke="${c}" stroke-width="10" stroke-linecap="round"/><polygon points="${F(ex)},${F(ey)} ${F(hx+nx)},${F(hy+ny)} ${F(hx-nx)},${F(hy-ny)}" fill="${c}" stroke="#fff" stroke-width="2"/></g>`}
  g.innerHTML=h;svg.append(g)}
/* 一步一步演一串著法：st＝{tok,fast}（換頁或重來時 tok++ 就停；fast＝快轉）；step(盤面,{f,t},中文記譜,被吃的子,第幾步)；遇到不合法的著法就停在那裡 */
function lsnPlay(st,seq,b0,step,done){const C=XQCore,my=++st.tok;let b=b0,i=0;
  const one=()=>{if(my!==st.tok)return;if(i>=seq.length){done&&done(b,i);return}const[f,t]=lsnSq(seq[i]);
    if(!b[f]||!C.legal(b,C.sideOf(b[f])).some(([x,y])=>x===f&&y===t)){done&&done(b,i);return}
    const tx=C.notate(b,f,t),cap=b[t];b=C.make(b,f,t);i++;step&&step(b,{f,t},tx,cap,i);if(st.fast)return one();setTimeout(one,i>=seq.length?450:800)};one()}
/* 答案樹從 u 往下的主線（跟解題頁「看答案」一樣：每層取第一條） */
function lsnRest(node,u){const o=node&&node.o&&node.o[u];if(!o)return[];if(!o[1])return cjSplit(o[0]);const s=[o[0]];let n=o[1];
  while(n&&n.o){const k=Object.keys(n.o)[0];if(!k)break;const x=n.o[k];s.push(k);if(x[1]){s.push(x[0]);n=x[1]}else{s.push(...cjSplit(x[0]));n=null}}return s}
function lsnCss(){if(document.getElementById("lsnCss"))return;const s=document.createElement("style");s.id="lsnCss";s.textContent=`
body:has(.lsn-note) .xqbot{visibility:hidden}
.lsn .lsn-card h2{font-family:var(--serif);font-size:20px;margin:4px 0 8px}
.lsn .lsn-card p{margin:6px 0;line-height:1.7}
.lsn .lsn-where{color:var(--muted);font-size:14px}
.lsn .lsn-k{font-weight:900;color:var(--accent);margin-top:10px}
.lsn .lsn-plan{margin-top:10px;line-height:1.7}
.lsn .lsn-plan ol{margin:6px 0 0;padding-left:1.4em}
.lsn .btn{text-align:center}
.lsn-free{text-align:center;color:var(--muted);font-size:13px;margin:10px 0}
.lsn-say{font-size:13px;color:var(--muted);margin-top:2px}
.view.fixed .lsn-note{color:var(--ink);font-size:14px;line-height:1.65;max-height:26vh}
.lsn-res{width:100%;border-collapse:collapse;margin:8px 0;font-size:14px}
.lsn-res th{text-align:left;white-space:nowrap;padding:8px 10px 8px 0;vertical-align:top;font-family:var(--serif)}
.lsn-res td{padding:8px 0;line-height:1.6}
.lsn-res tr+tr th,.lsn-res tr+tr td{border-top:1px solid var(--line)}
.lsn-sum{font-weight:700}
.lsn-entry{margin:0 0 10px}
.grb-ch{flex:none;display:flex;flex-direction:column;gap:8px;padding:6px 12px}
.grb-ch .btn{margin:0;text-align:center}
.grb-ch .btn.grb-a{background:var(--bg);color:var(--ink);border:2px solid #C8962E}
.grb-cmp{width:100%;border-collapse:collapse;font-size:14px;margin:6px 0 10px}
.grb-cmp th,.grb-cmp td{padding:7px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;line-height:1.5}
.grb-cmp thead th{font-family:var(--serif);font-size:15px}
.grb-cmp .bad{color:var(--red);font-weight:700}
.grb-cmp .good{font-weight:700}
.grb-con{font-weight:700;line-height:1.7;margin:8px 0}
.grb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.grb-row .btn{flex:1 1 140px;margin-top:0;text-align:center}
`;document.head.append(s)}
/* 棋話一頁（07f-ship.js ShipLesson）最上面加一顆入口：只有 LSN_SET 有的站 */
/* 11/11 AI 模擬玩家：停在別站的人找不到唐站體驗；別站也放一顆，寫明是唐站的，並加「先吃子還是先解圍」 */
function lsnShipAdd(v,k){const box=v.querySelector(".shl-more");if(!box||box.querySelector("#slTry"))return;lsnCss();
  const own=!!LSN_SET[k],to=own?k:Object.keys(LSN_SET)[0];if(!to)return;
  const b=document.createElement("button");b.className="btn ghost lsn-entry";b.id="slTry";b.textContent=own?"🧩 動手試這一頁棋理":"🧩 小實驗：唐站棋理體驗";b.onclick=()=>lsnGo("#/lesson/"+to);
  const g=document.createElement("button");g.className="btn ghost lsn-entry";g.textContent="⚖️ 小實驗：先吃子還是先解圍";g.onclick=()=>lsnGo("#/lab/grab");box.prepend(b,g)}
/* 主題訓練清單（07-legend.js Theme）最下面加「小實驗」：棋理體驗、先吃子還是先解圍 */
function lsnThemeAdd(v){const pad=v.querySelector(".pad");if(!pad||pad.querySelector(".lsn-lab"))return;lsnCss();
  const L=Object.keys(LSN_SET).filter(k=>typeof SHIP_LESSON!=="undefined"&&SHIP_LESSON[k]).map(k=>[`#/lesson/${k}`,"🧩",`棋理體驗・${SHIP_LESSON[k].t}`]);
  if(typeof GrbLab==="function")L.push(["#/lab/grab","⚖️","先吃子還是先解圍"]);if(!L.length)return;
  const d=document.createElement("div");d.className="lsn-lab";d.innerHTML=`<div class="sec-t">小實驗</div><div class="items" style="padding:0">${L.map(([h,ic,t])=>`<button class="item" data-lsn="${esc(h)}"><span class="lb">${ic}</span><span class="tx"><b>${esc(t)}</b></span><span class="muted">›</span></button>`).join("")}</div>`;
  pad.append(d);d.querySelectorAll("[data-lsn]").forEach(b=>b.onclick=()=>lsnGo(b.dataset.lsn))}

function LsnPage(v,k){const L=LSN_SET[k],Ls=typeof SHIP_LESSON!=="undefined"&&SHIP_LESSON[k];if(!L||!Ls||!window.XQCore){navReplace("#/theme");return{}}
  lsnCss();if(typeof cjCSS==="function")cjCSS();
  const C=window.XQCore,T=(typeof SHIP_STOP!=="undefined"&&SHIP_STOP[k])||{},nm=typeof shipShort==="function"?shipShort(k):k,BK=lsnBack("#/ship/lesson"),H0=location.hash,here=()=>v.isConnected&&location.hash===H0,q=s=>v.querySelector(s);
  setTop("🧩 棋理體驗・"+nm+"站",BK);setTabs(false);
  const st={tok:0,fast:false};let R=null,D=null,P2=null;const reset=()=>{R={q1:{n:0,at:0,ans:false,th:0,thAt:0},q2:{n:0,at:0,ans:false,id:""}}};reset();
  function intro(){st.tok++;v.className="view";v.innerHTML=`<div class="pad lsn">
    <div class="card lsn-card"><p class="lsn-where">📍 ${esc(T.place||nm)}${T.meet?"・遇見"+esc(T.meet):""}</p><h2>${esc(Ls.t)}</h2>${(Ls.x||[]).map(x=>`<p>${esc(x)}</p>`).join("")}${Ls.k?`<p class="lsn-k">口訣：${esc(Ls.k)}</p>`:""}</div>
    <div class="card lsn-plan"><b>三步走完</b><ol><li>先看懂：對方下一步會從哪裡殺你</li><li>換你走一步解圍</li><li>換一盤棋，不給提示再試一次</li></ol></div>
    <button class="btn" id="lsGo">開始 ›</button><p class="lsn-free">這是練習：不記進度、不加修為。</p></div>`;
    const g=q("#lsGo");g.onclick=()=>{try{vibrate(5)}catch(e){}g.disabled=true;g.textContent="載入中…";
      cjData().then(d=>{if(!here())return;D=d;const P=D.byId[L.q1];if(!P)throw new Error("找不到題目（題庫可能更新了）");puzzle(P,"q1")}).catch(e=>{if(!here())return;g.disabled=false;g.textContent="開始 ›";toast(e.message)})}}
  /* 一題：slot＝"q1"（先看威脅）或 "q2"（不給提示） */
  function puzzle(P,slot){st.tok++;const r=R[slot],me=P.side,op=C.opp(me),flip=me==="b",b0=C.parseFen(P.fen),node=P.tree,W=cjW(node),say=P.say||{},first=slot==="q1";
    const TH=lsnMates(b0,op),thFrom=new Set(TH.map(a=>a.f));let b=b0,sel=-1,busy=false,last=null,over=[],phase="move";
    v.className="view fixed";v.innerHTML=`<div class="cj-top" id="lsH"></div><div class="boardbox" id="lsB"></div><div class="status" id="lsS"></div><div class="note cj-note lsn-note" id="lsN"></div><div style="flex:1"></div><div class="actions" id="lsA"></div>`;
    const bd=Board(x=>tap(x));q("#lsB").append(bd.svg);
    const stat=t=>{const e=q("#lsS");if(e)e.textContent=t},note=t=>{const e=q("#lsN");if(e)e.textContent=t||""},acts=a=>{const e=q("#lsA");if(e)actionBar(e,a)};
    const ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
    const draw=bb=>{bb=bb||b;bd.draw(bb,{flip,sel,last,check:ck(bb),targets:phase==="move"&&sel>=0&&!busy?C.legal(bb,me).filter(([f])=>f===sel).map(x=>x[1]):[]});lsnArrows(bd.svg,over,flip)};
    const pre=(say.pre||[])[0],pn=sq=>C.NAMES[C.sideOf(b0[sq])][b0[sq].toUpperCase()],end=s=>/[。！？」]$/.test(s)?s:s+"。";
    q("#lsH").innerHTML=first?`<b>第 1 題・${esc((P.src||{}).title||P.t)}</b>${pre?`<div class="lsn-say">${esc(pre[0])}：「${esc(pre[1])}」</div>`:""}`
      :`<b>第 2 題・換一盤棋，不給提示</b><div class="lsn-say">${cjSrc(P,true)}</div>`;
    const danger=C.inCheck(b0,me)?`${C.PLAYER[op]}正在將你的軍。`:TH.length?`${C.PLAYER[op]}下一步就要將死你。`:"";
    function startThreat(){phase="threat";over=[];sel=-1;stat("① 先看懂威脅");note(`${danger}先別急著走——點一下那顆要來殺你的${C.PLAYER[op].slice(0,1)}子。`);acts([["skip","👀","我看不出來",()=>threatShow(-1)]]);draw()}
    function threatShow(x){const hit=x>=0&&thFrom.has(x);r.th++;if(hit&&r.th===1)r.thAt=1;const A=hit?TH.filter(a=>a.f===x):TH,a=A[0];over=A.map(z=>({f:z.f,t:z.t}));phase="seen";
      stat(hit?"✔ 看懂了":x>=0?"✘ 不是這顆":"👀 威脅在這裡");
      note((hit?`對，就是這顆${pn(a.f)}。`:x>=0?`不是這顆${pn(x)}。真正要來殺你的是這顆${pn(a.f)}（看紅色箭頭）。`:`要來殺你的是這顆${pn(a.f)}（看紅色箭頭）。`)+`\n它走「${C.notate(b0,a.f,a.t)}」就將死你：${lsnNoWay(b0,me,a)}`);
      acts([["go","♟","換你走一步",startMove,true]]);draw()}
    let mvNote="";
    function startMove(){st.tok++;phase="move";sel=-1;busy=false;b=b0;last=null;over=first?TH.map(a=>({f:a.f,t:a.t,o:.45})):[];
      stat(first?"② 換你走一步解圍":"自己來：走一步");
      mvNote=first?end(P.task||cjTask(P)):`${danger}${end(cjTask(P))}\n這次沒有提示。用剛才的口訣「${Ls.k}」想一想。`;note(mvNote);
      acts(r.n>=2?[["ans","👁","看答案",reveal]]:[]);draw()}
    /* 11/11 AI 模擬玩家報告問題 15：點了不能走的格子、或點到一步都走不了的子（例如被兩個仕夾住的帥），用規則說白話原因，不再毫無反應 */
    const why1=w=>{note(`✋ ${w}\n${mvNote}`);try{vibrate([10,30,10])}catch(e){}};
    function tap(x){if(busy)return;
      if(phase==="threat"){if(x<0||!b0[x])return;if(C.sideOf(b0[x])===me){toast(`點${C.PLAYER[op]}的子：哪一顆下一步能將死你？`);return}try{vibrate(5)}catch(e){}threatShow(x);return}
      if(phase!=="move")return;const Lg=C.legal(b,me);if(sel>=0&&Lg.some(([f,t])=>f===sel&&t===x)){const u=C.iccs(sel,x);sel=-1;return move(u)}
      const mine=x>=0&&!!b[x]&&C.sideOf(b[x])===me;if(sel>=0&&!mine){const w=lsnWhyNot(b,sel,x);if(w){sel=-1;draw();why1(w);return}}
      sel=Lg.some(([f])=>f===x)?x:-1;if(sel>=0)try{vibrate(5)}catch(e){}else if(mine){const w=lsnStuck(b,x);if(w)why1(w)}draw()}
    function move(u){const[f,t]=lsnSq(u),cn=C.notate(b,f,t),o=node.o[u];r.n++;busy=true;over=[];acts([]);
      if(o||(node.s&&node.s[u])){if(!r.at)r.at=r.n;return good(u,o?lsnRest(node,u):[],!o)}
      const e=W[u],nb=C.make(b,f,t),M=lsnMates(nb,op);let seq,why;
      if(e){seq=e.line;why=cjWhy(P,e.c)}else{seq=M.length?[C.iccs(M[0].f,M[0].t)]:[];why=M.length?"對方下一步就能將死你。":"這步不在題目的分析裡，換一步試試。"}   /* 題庫沒列到的著法：用規則現算對方有沒有一步殺 */
      /* 11/11 AI 模擬玩家報告問題 15：台詞前先講一句白話原因（規則現算）：對方一步殺＝直接說哪一步；帥還是被困住＝說被誰擋、被誰看著；都不是就用題庫的 cjWhy */
      const ks=TH.length?lsnStuck(nb,C.kingSq(nb,me)):"",plain=M.length?`走完這步，對方走「${C.notate(nb,M[0].f,M[0].t)}」就直接將死你。`:ks?"走完這步，"+ks.replace("現在","還是"):"";
      const sw=say.wrong&&say.wrong[u],head=(plain||"這步不行："+why)+"\n"+(sw?`💬 ${sw[0]}：「${sw[1]}」\n`:"")+"對方的反駁：",acc=[];stat("✘ "+cn);note(head);try{vibrate([20,40,20])}catch(x){}
      lsnPlay(st,[u].concat(seq),b0,(bb,mv,tx,cap,i)=>{b=bb;last=mv;draw();if(i>1){acc.push(tx);note(head+acc.join("　"))}},()=>{if(!here())return;
        note(head+(acc.join("　")||"（直接看局面）")+(plain&&!M.length?"\n結果："+why:""));busy=false;phase="wrong";const a=[["back","↩","退回重想",startMove,true]];if(r.n>=2)a.push(["ans","👁","看答案",reveal]);acts(a)})}
    function good(u,rest,slow){stat(slow?"👍 這步也能贏":`✔ 對了！${r.at>1?`（第 ${r.at} 次走對）`:""}`);const acc=[];
      lsnPlay(st,[u].concat(rest),b0,(bb,mv,tx,cap,i)=>{b=bb;last=mv;draw();if(i>1){acc.push(tx);note("後續："+acc.join("　"))}},()=>done(acc,false))}
    function reveal(){if(busy&&phase!=="wrong")return;r.ans=true;busy=true;over=[];const u=Object.keys(node.o)[0];stat("👁 正解");const acc=[];acts([]);
      lsnPlay(st,[u].concat(lsnRest(node,u)),b0,(bb,mv,tx,cap,i)=>{b=bb;last=mv;draw();acc.push(tx);note("正解："+acc.join("　"))},()=>done(acc,true))}
    function done(acc,ans){if(!here())return;phase="done";busy=false;const dn=ans?"":(say.done||[]).map(x=>`💬 ${x[0]}：「${x[1]}」`).join("\n");
      note((acc.length?(ans?"正解：":"後續：")+acc.join("　")+"\n":"")+(P.cmt?"解說："+P.cmt:"")+(dn?"\n"+dn:""));
      acts(first?[["next","›","換一題・不給提示",q2,true]]:[["res","🏁","看結果",result,true]])}
    if(first&&TH.length&&!C.inCheck(b0,me))startThreat();else startMove()}
  function q2(){const ids=L.q2.filter(id=>D&&D.byId[id]);if(!ids.length)return result();if(!P2||!ids.includes(P2))P2=ids[Math.floor(Math.random()*ids.length)];R.q2.id=P2;puzzle(D.byId[P2],"q2")}
  function result(){st.tok++;v.className="view";const a=R.q1,c=R.q2,Q=D&&D.byId[c.id],P=D&&D.byId[L.q1];
    const ln=r=>r.at===1?"第 1 次就走對 ✔":r.at?`第 ${r.at} 次走對`:r.ans?"看了正解":"還沒走";
    const sum=c.at===1?"換了一盤棋，第一次就走對：你用的是棋理，不是背答案。":c.at?`換了一盤棋，試了 ${c.at} 次走對。下次先問自己：帥有沒有路？仕該不該讓？`:`第二題看了正解。記住口訣「${Ls.k}」，再做一次看看。`;
    v.innerHTML=`<div class="pad lsn"><div class="card lsn-card"><h2>🏁 ${esc(Ls.t)}</h2>
      <table class="lsn-res"><tr><th>第 1 題</th><td>${esc(P&&P.src&&P.src.title||"")}<br>看懂威脅：${a.thAt?"一次就找到 ✔":"看了箭頭才知道"}<br>走一步解圍：${ln(a)}</td></tr>
      <tr><th>第 2 題</th><td>${Q?cjSrc(Q):""}<br>不給提示：${ln(c)}</td></tr></table>
      <p class="lsn-sum">${esc(sum)}</p>${Ls.k?`<p class="lsn-k">口訣：${esc(Ls.k)}</p>`:""}</div>
      <button class="btn" id="lsBack">回原處</button><button class="btn ghost" id="lsAgain">再做一次</button>${typeof GrbLab==="function"?`<button class="btn ghost" id="lsLab">⚖️ 下一個小實驗：先吃子還是先解圍</button>`:""}
      <p class="lsn-free">這是練習：不記進度、不加修為、不算題目統計。</p></div>`;
    q("#lsBack").onclick=()=>{try{vibrate(5)}catch(e){}goUp(BK)};q("#lsAgain").onclick=()=>{reset();P2=null;puzzle(D.byId[L.q1],"q1")};const lb=q("#lsLab");if(lb)lb.onclick=()=>lsnGo("#/lab/grab")}
  intro();return{stop(){st.tok++}}}
