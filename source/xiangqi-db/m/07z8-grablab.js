/* ================= ⚖️ 先吃子還是先解圍（ChatGPT 改善單 I02，開發者 11/11）=================
   #/lab/grab：研究／練習用的小實驗；不碰正式對戰規則與積分，不記任何進度、修為、統計，也不送出任何資料（玩家的選擇只放在這一頁的記憶體裡）。
   題目：data/canju/lab-grab.json（tools/lab_grab.js 從一盞茶殘局題庫篩：輪到的一方沒被將軍、對方有一步殺或能白吃大子、
     某個吃子著法在 tree.w 裡代碼是 m（反被殺）或 l（變差）而且吃完威脅還在、正解不吃子不將軍而且走完威脅不見了）。
   每題：盤面＋對方的威脅（紅箭頭；一步殺用 XQCore 規則現算，算不到才用檔裡記的捉子）＋能吃的那顆子（金圈）；兩個按鈕「吃掉○○（著法）」「先處理威脅」。
   選完兩條路都演（先演你選的）：吃子路＝tree.w 的反駁線、解圍路＝答案樹第一條，都是 Pikafish 預先算好的真實著法，演之前逐步驗合法；
   最後一張比較卡：第一步、結果（有沒有被將死／將死對方）、子力（以兵計，跟現在比：車 9、炮 4.5、馬 4、相仕 2、兵 1），結論句全由這些數字和代碼組出來，不寫假的引擎台詞。
   共用 07z7-lesson.js 的 lsnPlay、lsnArrows、lsnMates、lsnBack、lsnCss。前綴 grb */
const GRB_URL="data/canju/lab-grab.json";let GRB_P=null;
function grbData(){return GRB_P||(GRB_P=fetch(GRB_URL).then(r=>{if(!r.ok)throw new Error("題目載入失敗（"+r.status+"）");return r.json()}).catch(e=>{GRB_P=null;throw e}))}
const grbMat=(b,s)=>{const C=XQCore;return b.reduce((a,p)=>p&&!/[kK]/.test(p)?a+(C.sideOf(p)===s?1:-1)*(C.VAL[p.toUpperCase()]||0):a,0)};
const grbFmt=x=>{x=Math.round(x*10)/10;return x>0?"+"+x:x<0?"−"+(-x):"±0"};
function GrbLab(v){const C=window.XQCore;if(!C){navReplace("#/theme");return{}}
  lsnCss();if(typeof cjCSS==="function")cjCSS();
  const BK=lsnBack("#/theme"),H0=location.hash,here=()=>v.isConnected&&location.hash===H0,q=s=>v.querySelector(s),st={tok:0,fast:false};
  setTop("⚖️ 先吃子還是先解圍",BK);setTabs(false);
  let J=null;const res=[];
  function intro(){st.tok++;res.length=0;v.className="view";v.innerHTML=`<div class="pad lsn"><div class="card lsn-card"><h2>⚖️ 先吃子還是先解圍？</h2>
    <p>同一盤棋：你可以先吃掉對方一顆子，也可以先處理對方的威脅。</p><p>選一條路。選完以後，兩條路都會照 Pikafish 算好的真實著法走給你看，最後比一比盤面。</p>
    <p class="lsn-free">這只是練習，不影響任何分數，也不會記錄你的選擇。</p></div><button class="btn" id="gbGo">開始 ›</button></div>`;
    const g=q("#gbGo");g.onclick=()=>{try{vibrate(5)}catch(e){}g.disabled=true;g.textContent="載入中…";
      grbData().then(d=>{if(!here())return;J=d;if(!J.items||!J.items.length)throw new Error("題目準備中");item(0)}).catch(e=>{if(!here())return;g.disabled=false;g.textContent="開始 ›";toast(e.message)})}}
  function item(i){st.tok++;st.fast=false;if(i>=J.items.length)return summary();const X=J.items[i],me=X.side,op=C.opp(me),flip=me==="b",b0=C.parseFen(X.fen),N=J.items.length;
    const ok=u=>{if(!/^[a-i]\d[a-i]\d$/.test(u||""))return false;const[f,t]=lsnSq(u);return!!b0[f]&&C.legal(b0,C.sideOf(b0[f])).some(([x,y])=>x===f&&y===t)};
    const gm=X.grab&&X.grab.mv,sl=(X.solve&&X.solve.line)||[];
    if(!ok(gm)||!sl.length||!ok(sl[0])||C.sideOf(b0[lsnSq(gm)[0]])!==me||!b0[lsnSq(gm)[1]])return item(i+1);   /* 資料跟盤面對不上就跳過這題 */
    const[gf,gt]=lsnSq(gm),gName=C.NAMES[op][b0[gt].toUpperCase()],gCn=C.notate(b0,gf,gt);
    const M=lsnMates(b0,op),mate=M.length>0,TH=mate?M:(X.threat&&X.threat.mv||[]).filter(ok).map(u=>{const[f,t]=lsnSq(u);return{f,t}}),t0=TH[0];
    const thTx=!t0?"":mate?`對方下一步「${C.notate(b0,t0.f,t0.t)}」就能將死你。`:`對方下一步「${C.notate(b0,t0.f,t0.t)}」能吃掉你的${b0[t0.t]?C.NAMES[me][b0[t0.t].toUpperCase()]:"子"}。`;
    v.className="view fixed";v.innerHTML=`<div class="cj-top" id="gbH"></div><div class="boardbox" id="gbB"></div><div class="status" id="gbS"></div><div class="note cj-note lsn-note" id="gbN"></div><div style="flex:1"></div><div class="grb-ch" id="gbC"></div><div class="actions" id="gbA"></div>`;
    const bd=Board(null);q("#gbB").append(bd.svg);
    const stat=t=>{const e=q("#gbS");if(e)e.textContent=t},note=t=>{const e=q("#gbN");if(e)e.textContent=t||""},acts=a=>{const e=q("#gbA");if(e)actionBar(e,a)};
    const ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
    const show=(bb,last,over)=>{bd.draw(bb,{flip,last,check:ck(bb)});lsnArrows(bd.svg,over||[],flip)};
    const over0=TH.slice(0,2).map(a=>({f:a.f,t:a.t})).concat([{f:gt,c:"#C8962E"}]);
    q("#gbH").innerHTML=`<b>第 ${i+1}／${N} 題</b>　<span class="muted">${esc(X.src||"")}</span>`;
    stat(`輪到你（${C.PLAYER[me]}）`);note(`⚠ ${thTx}\n可是你也吃得到對方的${gName}（金圈）。你先做哪一件？`);show(b0,null,over0);acts([]);
    /* 11/11 AI 模擬玩家：「先處理威脅」原本是紅色主按鈕、吃子是次要樣式，等於提示答案；改成兩顆同樣式、上下隨機 */
    {const bx=`<button class="btn ghost grb-a" id="gbX">吃掉${esc(gName)}（${esc(gCn)}）</button>`,by=`<button class="btn ghost grb-a" id="gbY">先處理威脅</button>`;q("#gbC").innerHTML=Math.random()<.5?bx+by:by+bx}
    q("#gbX").onclick=()=>choose("grab");q("#gbY").onclick=()=>choose("solve");
    function choose(c){try{vibrate(5)}catch(e){}q("#gbC").innerHTML="";const A={k:"grab",nm:"先吃子",seq:[gm].concat(X.grab.line||[])},B={k:"solve",nm:"先處理威脅",seq:sl},order=c==="grab"?[A,B]:[B,A],out={};
      const run=j=>{if(!here())return;if(j>=2)return compare(c,out);const p=order[j],acc=[],my=st.tok+1;st.fast=false;
        stat((j?"② 另一條路：":"① 你選的路：")+p.nm);note("");show(b0,null,[]);acts([["ff","⏩","快轉",()=>{st.fast=true}]]);
        setTimeout(()=>{if(!here()||st.tok!==my-1)return;
          lsnPlay(st,p.seq,b0,(bb,mv,tx)=>{acc.push(tx);show(bb,mv);note((j?"② ":"① ")+p.nm+"："+acc.join("　"))},bb=>{out[p.k]={b:bb,acc};const t2=st.tok;setTimeout(()=>{if(st.tok===t2)run(j+1)},st.fast?150:1000)})},500)};
      run(0)}
    function compare(c,out){const G=out.grab,S=out.solve,m0=grbMat(b0,me),dG=grbMat(G.b,me)-m0,dS=grbMat(S.b,me)-m0,
        dead=bb=>C.inCheck(bb,me)&&!C.legal(bb,me).length,win=bb=>C.inCheck(bb,op)&&!C.legal(bb,op).length,
        code=String(X.grab.code||""),mN=/^m\d+$/.test(code)?+code.slice(1):0,deadG=dead(G.b),deadS=dead(S.b),winS=win(S.b),winG=win(G.b);
      const resG=deadG?`被將死（吃完以後，對方${mN?" "+mN+" 回合":""}就殺）`:winG?"將死對方":mN?`還沒被將死，但 Pikafish 算出對方 ${mN} 回合內能殺你`:code==="l"?"沒被將死，但 Pikafish 判斷局面變差":"沒被將死",
        resS=deadS?"被將死":winS?"反過來將死對方":"沒被將死";
      const dF=Math.round((dS-dG)*10)/10;
      const con=deadG||mN?`吃掉${gName}，${deadG?`對方${mN?" "+mN+" 回合":""}就將死你`:`Pikafish 算出對方 ${mN} 回合內能殺你`}；先處理威脅，${winS?"反而將死對方":`沒被將死，子力${grbFmt(dS)}`}。`
        :`吃掉${gName}，走完這條路子力是${grbFmt(dG)}；先處理威脅是${grbFmt(dS)}${dF>0?`，多保住約 ${dF} 個兵的子力`:"，子力差不多，但 Pikafish 判斷吃子那條路局面變差"}。`;
      if(!res[i])res[i]={c,bad:deadG||!!mN||code==="l"||dF>0};   /* 同一題「再看一次」不重算，記第一次的選擇 */
      const html=`<p>你選的是：<b>${c==="grab"?"先吃子":"先處理威脅"}</b></p>
        <table class="grb-cmp"><thead><tr><th></th><th>先吃子</th><th>先處理威脅</th></tr></thead><tbody>
        <tr><th>第一步</th><td>${esc(G.acc[0]||gCn)}（吃${esc(gName)}）</td><td>${esc(S.acc[0]||"")}</td></tr>
        <tr><th>走了幾步</th><td>${G.acc.length} 步</td><td>${S.acc.length} 步</td></tr>
        <tr><th>結果</th><td class="${deadG||mN?"bad":""}">${esc(resG)}</td><td class="${winS?"good":deadS?"bad":""}">${esc(resS)}</td></tr>
        <tr><th>子力<br><span class="muted">跟現在比</span></th><td>${grbFmt(dG)}</td><td>${grbFmt(dS)}</td></tr></tbody></table>
        <p class="grb-con">${esc(con)}</p>${X.cmt?`<p class="muted">🐟 Pikafish：${esc(X.cmt)}</p>`:""}
        <p class="muted">「子力」＝棋子值多少，用兵來算：車 9、炮 4.5、馬 4、相仕 2、兵 1。表上是走完以後，你跟對方的差距比現在多了還是少了。</p>
        <div class="grb-row"><button class="btn ghost" id="gbR">再看一次</button><button class="btn" id="gbNx">${i+1<N?"下一題 ›":"看總結 ›"}</button></div>`;
      const card=()=>sheet("⚖️ 兩條路比一比",bx=>{bx.innerHTML=html;bx.querySelector("#gbR").onclick=()=>{closeSheet();item(i)};bx.querySelector("#gbNx").onclick=()=>{closeSheet();item(i+1)}});
      stat("兩條路都走完了");note(con);acts([["cmp","📊","比較",card],["nx","›",i+1<N?"下一題":"看總結",()=>item(i+1),true]]);card()}
    }
  function summary(){st.tok++;v.className="view";const R=res.filter(Boolean),n=R.length,s=R.filter(x=>x.c==="solve").length,g=n-s,bad=R.filter(x=>x.bad).length;
    v.innerHTML=`<div class="pad lsn"><div class="card lsn-card"><h2>⚖️ 小實驗做完了</h2>
      <p>${n} 盤裡，你有 <b>${s}</b> 盤先處理威脅、<b>${g}</b> 盤先吃子。</p>
      <p>這 ${n} 盤，照 Pikafish 算好的著法走下去，吃子那條路有 <b>${bad}</b> 盤比較差（被將死、會被殺，或 Pikafish 判斷局面變差）。</p>
      <p class="lsn-k">吃子之前，先看對方下一步想做什麼。</p>
      <p class="lsn-free">這只是練習，不影響任何分數，也沒有記錄你的選擇。</p></div>
      <button class="btn" id="gbBack">回原處</button><button class="btn ghost" id="gbAgain">再玩一次</button></div>`;
    q("#gbBack").onclick=()=>{try{vibrate(5)}catch(e){}goUp(BK)};q("#gbAgain").onclick=()=>{res.length=0;item(0)}}
  intro();return{stop(){st.tok++}}}
