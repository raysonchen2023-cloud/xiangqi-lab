// 評比循環第 2 輪（ChatGPT：分析一致性回歸案例庫）：34 個真實局面（tools/analysis-cases.json，Pikafish 固定深度的快照，見 make-analysis-cases.js），
// 用 vm 載入 App 真正的前端白話函式（00-util evt／pawnAbout／evLink、01-board tmxPlain／tmxRisk、05-settings qNow／talk／mflWhy／mflRisk、10-db gradeNote／mkNote），
// 每個案例產生「評等字白話＋兵值＋局面句＋原因句」和賽後講解、關鍵一步、逐步說明的完整文字：
//   ① 跟快照 tools/analysis-cases.snap.md 逐字比對（文字改了要看過差異再更新：UPDATE_SNAP=1 node --test tools/test-analysis-cases.js，同時重寫 story/89_分析一致性案例庫.md）；
//   ② 一致性規則：各處兵數一樣、評等跟 loss 區間相符、「白送」只在吃不回時、「錯過殺棋」只在有殺棋訊號時、局面句方向跟 ev 正負一致、沒有「局面明顯變差」配正分。
// 不開瀏覽器、不開引擎。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const LAB=path.join(__dirname,".."),M=path.join(LAB,"../xiangqi-db/m"),SNAP=path.join(__dirname,"analysis-cases.snap.md"),DOC=path.join(LAB,"../xiangqi-db/story/89_分析一致性案例庫.md");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const U=rd(path.join(M,"00-util.js")),S=rd(path.join(M,"05-settings.js")),B=rd(path.join(M,"01-board.js")),D=rd(path.join(M,"10-db.js"));
const C=require("../site/core.js"),DATA=JSON.parse(fs.readFileSync(path.join(__dirname,"analysis-cases.json"),"utf8"));
const sl=(s,a,b,name)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+(name||a));return s.slice(i,j)};
const SRC=[sl(U,"const sqI=","\n/* 11/11 v6 第 3 點：段位簡稱","00-util evt／pawnN／evLink"),sl(S,"const GRADES=","// 報告畫面","05-settings qNow／talk"),
  sl(S,"function mflRisk(","/* G01 示範練習","05-settings mflRisk／mflWhy"),sl(B,"const TMX_QS=","/* 小泡泡：","01-board tmxPlain"),sl(B,"function tmxRisk(","function tmxMove(","01-board tmxRisk"),
  sl(D,"function bcMove(","/* 意見回饋 562","10-db gradeNote"),sl(D,"function sugText(","function Viewer(","10-db sugText"),sl(D,"function mkNote(K){","\n  function mkRetry(","10-db mkNote")].join("\n");
const ctx={console,isFinite,store:{get:(k,d)=>d,set(){}},mvArrowName:()=>"綠色箭頭",setTimeout:()=>0,clearTimeout(){},addEventListener(){}};
ctx.window=ctx;ctx.XQCore=C;vm.createContext(ctx);
vm.runInContext(SRC+";this.R={evt,evLink,pawnN,pawnAbout,lossAbout,qNow,talk,mflWhy,mflRisk,tmxPlain,tmxRisk,gradeNote,mkNote,TMX_PW,TMX_RNG}",ctx,{filename:"m(片段)"});
const R=ctx.R,sq=C.parseSq,QS=["妙著","正著","穩著","緩著","失著","敗著"],BAD=["穩著","緩著","失著","敗著"];

/* 一個案例在 App 各處會看到的文字（照 App 的接法：10-db mkData／mkNote、05-settings mflPick／talk、01-board tmxStrip） */
function render(c){const b0=C.parseFen(c.fen.split(" ")[0]),by=c.by,f=sq(c.mv.slice(0,2)),t=sq(c.mv.slice(2,4)),m={f,t,cn:c.cn},g={...c.g},q=R.qNow({...g,by}),G={...g,q,by};
  const tr=R.tmxRisk(q,{...G}),plain=R.tmxPlain(q,g.loss,g.ev,by)+(tr?"⚠ "+tr:"");
  const ply={ply:c.ply,by,cn:c.cn,f,t,...G},tk0=R.talk(by,[ply],[ply],{},70).find(x=>x.ply===c.ply),talk=tk0?`【${tk0.t}】${tk0.x}`:"";
  let why="",risk="",key="";
  if(BAD.includes(q)&&g.loss>=30){const W={...R.mflWhy(b0,by,m,G)};risk=(q==="失著"||q==="敗著")?R.mflRisk(b0,by,m,G):"";
    if(risk&&/將死/.test(risk)&&W.tag==="殺棋"&&!/已經有殺棋/.test(W.say||""))W.say="";
    let best=null,bcn="";try{best=g.bm?{f:sq(g.bm.slice(0,2)),t:sq(g.bm.slice(2,4))}:null;if(best&&(!b0[best.f]||(best.f===f&&best.t===t)))best=null;if(best)bcn=C.notate(b0,best.f,best.t)}catch(e){best=null}
    const tk=tk0&&tk0.bad?String(tk0.x).replace(/^第 \d+ 回合 [^：]*：/,""):"";
    why=W.gen?"":W.say;key=R.mkNote({p:c.ply,m,g:G,q,side:by,best,bcn,tk,rk:risk,why})}
  const reason=q==="妙著"?(tk0?tk0.x.replace(/^第 \d+ 回合 [^：]*：/,""):""):[why,risk?"⚠ "+risk:""].filter(Boolean).join(" ");
  return{q,pawn:g.loss>=30&&g.loss<2000&&!["正著","妙著"].includes(q)?R.pawnAbout(g.loss):g.loss>=2000?"差很多（牽涉殺棋，不換算成兵）":"—",
    pos:R.evt(g.ev),plain,reason,talk,key,note:R.gradeNote(G,b0.slice())}}
const ALL=DATA.cases.map(c=>({c,x:render(c)}));
const texts=x=>[x.plain,x.reason,x.talk,x.key,x.note].join("\n");

/* ---------- 規則：用 core.js 的走子規則重驗 ---------- */
const afterOf=c=>{const b0=C.parseFen(c.fen.split(" ")[0]),f=sq(c.mv.slice(0,2)),t=sq(c.mv.slice(2,4));return{b0,f,t,a:C.make(b0,f,t),os:c.by==="r"?"b":"r"}};
/* 走完以後，對方能吃走方的哪些子；re＝走方吃得回來 */
function grabs(c){const{a,os}=afterOf(c);return C.legal(a,os).filter(([x,y])=>a[y]&&C.sideOf(a[y])===c.by&&!/[kK]/.test(a[y])).map(([x,y])=>{const nb=C.make(a,x,y);return{x,y,pc:a[y],by:a[x],re:C.legal(nb,c.by).some(z=>z[1]===y)}})}
const isMiss=g=>g.bmt!=null&&g.bmt>0&&!(g.pmt!=null&&g.pmt>0),isWalk=g=>g.pmt!=null&&g.pmt<0&&!(g.bmt!=null&&g.bmt<0);
const BAND={正著:[0,29],穩著:[30,60],緩著:[61,150],失著:[151,400],敗著:[401,1e9]};
const evSide=v=>v>=30?"紅方":v<=-30?"黑方":"均勢";
const lossNums=s=>(s.match(/少了(約半個兵|約 [\d.]+ 個兵)/g)||[]).map(x=>x.slice(2));
const leadNums=s=>(s.match(/約領先(半個兵| [\d.]+ 個兵)/g)||[]);

test("案例庫：至少 24 個、紅黑各半左右、該有的情況都有",()=>{
  const n=ALL.length,red=ALL.filter(({c})=>c.by==="r").length;assert.ok(n>=24,"案例數 "+n);assert.ok(red>=n*.4&&red<=n*.6,`紅方 ${red}／${n}`);
  const need=["妙著","正著","穩著","緩著","失著","敗著","白送","可吃回但虧","錯過白吃","錯過殺棋","將軍被化解","走進殺棋","殺棋分數","均勢","稍好","明顯好","大占上風","開局","吃子後被吃回"];
  for(const k of need)assert.ok(ALL.some(({c})=>c.want.includes(k)),"缺少案例："+k);
  for(const s of["r","b"])for(const k of["正著","失著","敗著","錯過殺棋","白送","可吃回但虧","錯過白吃"])assert.ok(ALL.some(({c})=>c.by===s&&c.want.includes(k)),(s==="r"?"紅":"黑")+"方缺少："+k);
});
for(const{c,x}of ALL){const g=c.g,mover=c.by==="r"?1:-1,T=texts(x);
  test(`${c.id} ${c.by==="r"?"紅":"黑"} ${c.cn}【${x.q}】：一致性`,()=>{
    /* want 標籤真的有涵蓋到 */
    const{b0,f,t,a,os}=afterOf(c),cap=b0[t],chk=C.inCheck(a,os);
    for(const w of c.want){const ok={妙著:()=>x.q==="妙著",正著:()=>x.q==="正著",穩著:()=>x.q==="穩著",緩著:()=>x.q==="緩著",失著:()=>x.q==="失著",敗著:()=>x.q==="敗著",
      開局:()=>c.ply<=10,吃子:()=>!!cap,將軍:()=>chk,均勢:()=>x.pos.startsWith("均勢"),稍好:()=>/稍好/.test(x.pos),明顯好:()=>/明顯好/.test(x.pos),大占上風:()=>/大占上風/.test(x.pos),有殺:()=>/有殺/.test(x.pos),
      白送:()=>/白送/.test(x.reason),可吃回但虧:()=>/吃回/.test(x.reason)&&/虧/.test(x.reason)&&!/白送/.test(x.reason),錯過白吃:()=>/白吃/.test(x.reason),
      錯過殺棋:()=>isMiss(g)&&/已經有殺棋/.test(x.reason),走進殺棋:()=>isWalk(g)||(g.pmt!=null&&g.pmt<0),殺棋分數:()=>Math.abs(g.ev)>=20000&&g.pmt>0,
      將軍被化解:()=>chk&&BAD.includes(x.q)&&mover*g.ev<20000,吃子後被吃回:()=>!!cap&&!!g.rr&&g.rr.m.slice(2)===c.mv.slice(2)&&/吃掉對方的/.test(x.reason),
      評等和局面不同方向:()=>["失著","敗著"].includes(x.q)&&mover*g.ev>=30,沒處理被捉的子:()=>/本來就在捉/.test(x.reason)}[w];
      assert.ok(ok,"不認得的標籤 "+w);assert.ok(ok(),`${c.id} 標了「${w}」但不符合：${JSON.stringify(x)}`)}
    /* ② 評等區間與 loss 相符（core.js gradeLoss、05-settings qNow、01-board TMX_RNG 同一組分界） */
    assert.equal(x.q,g.q,"畫面評等＝core.js 評等");
    if(x.q==="妙著"){assert.equal(g.loss,0);assert.ok(g.gap>=200,"妙著要第二好差 200 分以上")}
    else{const[lo,hi]=BAND[x.q];assert.ok(g.loss>=lo&&g.loss<=hi,`${x.q} 的 loss ${g.loss} 不在 ${lo}～${hi}`);assert.equal(C.gradeLoss(g.loss),x.q)}
    assert.ok(x.plain.startsWith(`「${x.q}」＝`),"評等白話開頭就是評等字");
    if(g.loss>=2000)assert.match(x.plain,/4 個兵以上/,"殺棋相關的大損失只寫固定區間");
    /* ① 同一案例各處兵數相同：「少了…」都等於 pawnAbout(loss)；loss ≥ 2000（殺棋夾值）不寫兵數；「約領先…」都等於 evt(ev) 的數字 */
    const ln=lossNums(T);if(g.loss>=2000||g.loss<30)assert.deepEqual(ln,[],"不該寫少幾個兵："+T);else for(const v of ln)assert.equal(v,R.pawnAbout(g.loss),`${c.id} 兵數不一致：${T}`);
    if(BAD.includes(x.q)&&g.loss>=30&&g.loss<2000)assert.ok(ln.length>=(x.q==="穩著"?2:3),"關鍵一步、逐步說明（緩著以上再加評等白話）都要講少幾個兵："+T);
    const evLead=leadNums(x.pos);for(const v of leadNums(T))assert.deepEqual([v],evLead,`${c.id} 領先幾個兵不一致：${T}`);
    if(BAD.includes(x.q))assert.ok(g.loss>=2000?/差很多/.test(x.note):x.note.includes("少了"+R.pawnAbout(g.loss)),"逐步說明寫分數也要附上同一個兵數："+x.note);
    /* ⑤ 局面句方向與 ev 正負相符；evLink 接的局面句就是 evt(ev) */
    const sd=evSide(g.ev);if(Math.abs(g.ev)>=20000)assert.match(x.pos,new RegExp("^"+(g.ev>0?"紅方":"黑方")+"有殺"));else assert.ok(x.pos.startsWith(sd),`ev ${g.ev} 卻寫「${x.pos}」`);
    for(const s of[x.plain,x.talk,x.key])if(/走完整盤/.test(s))assert.ok(s.includes(x.pos),"evLink 用的局面句要跟 evt 一樣："+s);
    for(const s of T.split("\n")){const k=s.match(/不過走完整盤還是(紅方|黑方)/);if(k)assert.equal(k[1],c.by==="r"?"紅方":"黑方","「不過…還是」只用在走方還領先")}
    /* ⑥ 沒有「局面明顯變差」；走方走完還領先時不說輸棋、不說對方好 */
    assert.doesNotMatch(T,/局面明顯變差|很可能因此輸棋/);
    if(mover*g.ev>=30)assert.doesNotMatch(T,new RegExp((c.by==="r"?"黑方":"紅方")+"(稍好|明顯好|大占上風|有殺)|因此輸棋|局面變差"),"走方還領先，卻說對方好："+T);
    /* ③ 「白送」「白白吃掉」只在規則上吃不回時；說「吃回來／能吃回」就要真的吃得回 */
    const G=grabs(c);
    if(/白送|白白吃掉/.test(T)){const hit=G.filter(z=>!z.re&&!(z.y===t&&cap));assert.ok(hit.length,`${c.id} 說白送，但規則上沒有吃不回的子：${T}`);
      if(g.rr)assert.ok(hit.some(z=>sq(g.rr.m.slice(2,4))===z.y),"分析線對方最佳回應要正好吃那顆子")}
    if(/能吃回|吃回來|再吃回/.test(x.reason))assert.ok(G.some(z=>z.re),`${c.id} 說吃得回來，但規則上吃不回：${x.reason}`);
    if(/可以白吃/.test(T)){const bf=sq(g.bm.slice(0,2)),bt=sq(g.bm.slice(2,4)),ab=C.make(b0,bf,bt);assert.ok(b0[bt]&&C.sideOf(b0[bt])===os,"建議著要吃子");assert.ok(!C.legal(ab,os).some(z=>z[1]===bt),"說白吃，對方要吃不回")}
    if(/可以白吃|可以吃掉|錯過了/.test(x.reason))assert.ok(["緩著","失著","敗著"].includes(x.q),"穩著（只差一點點）不說錯過吃子");
    /* ④ 「錯過殺棋／已經有殺棋」只在有殺棋訊號（最佳著有殺 bmt>0、這步走完沒殺）時出現；有這個訊號一定要講 */
    if(/錯過殺棋|已經有殺棋/.test(T))assert.ok(isMiss(g),`${c.id} 沒有殺棋訊號卻說錯過殺棋`);
    if(isMiss(g)&&BAD.includes(x.q))assert.match(x.reason+x.talk,/已經有殺棋/,"有殺棋沒走，要講出來");
    if(/有一套連續將軍的殺法|將死你/.test(T))assert.ok(g.pmt!=null&&g.pmt<0,"說對方能殺，要有走完被殺的訊號（pmt<0）");
    if(/有殺/.test(T))assert.ok(Math.abs(g.ev)>=20000||isMiss(g),"「有殺」只在殺棋分數時");
    /* 妙著：講解說的「至少少了 2 個兵」要對得上 gap */
    if(x.q==="妙著")assert.match(x.talk,/至少少了 2 個兵/);
  });}

test("穩著不講錯過吃子：b10 同一個局面，loss 改成 57（穩著）就不說「白吃對方的相」，71（緩著）才說",()=>{
  const c=DATA.cases.find(x=>x.id==="b10"),b0=C.parseFen(c.fen.split(" ")[0]),m={f:sq(c.mv.slice(0,2)),t:sq(c.mv.slice(2,4)),cn:c.cn};
  assert.match(R.mflWhy(b0,"b",m,{...c.g}).say,/白吃對方的「相」/);const w=R.mflWhy(b0,"b",m,{...c.g,loss:57,q:"穩著"});
  assert.doesNotMatch(w.say,/白吃|錯過了/,w.say);assert.equal(w.gen,1);assert.match(w.say,/少了約半個兵的價值/);
});
test("lossAbout：loss ≥ 2000（殺棋夾值）一律「差很多」，其他跟 pawnAbout 同一個數字",()=>{
  assert.equal(R.lossAbout(2141),"差很多");assert.equal(R.lossAbout(4000),"差很多");assert.equal(R.lossAbout(237),"少了約 2.4 個兵的價值");assert.equal(R.lossAbout(60),"少了約半個兵的價值");
});

/* ---------- 快照：人看得懂的表格 ---------- */
const cell=s=>String(s==null?"":s).replace(/\|/g,"｜").replace(/\n+/g,"<br>")||"—";
const sideN=s=>s==="r"?"紅":"黑";
function judge(c,x){const g=c.g,o=[];
  if(x.q==="妙著")o.push(`走的就是 Pikafish 首選，第二好的走法少 ${g.gap} 分（≥200）→ 妙著`);
  else if(x.q==="正著")o.push(g.loss?`比首選少 ${g.loss} 分（不到 30）→ 正著`:"就是 Pikafish 首選 → 正著");
  else if(g.loss>=2000)o.push(`loss ${g.loss}：最佳著或走完是殺棋，兩邊夾到 ±2000 才相減，只代表「差很多」→ ${x.q}，不換算成兵`);
  else{const[lo,hi]=BAND[x.q];o.push(`比首選「${g.bc}」少 ${g.loss} 分（${hi>1e8?"超過 400":lo+"～"+hi} 分）→ ${x.q}`)}
  o.push(Math.abs(g.ev)>=20000?`走完 ev ${g.ev} 是殺棋分數（${g.pmt>0?"走方 "+g.pmt+" 步殺":"對方 "+(-g.pmt)+" 步殺"}）→「${g.ev>0?"紅":"黑"}方有殺」`:`走完 ev ${g.ev>0?"+":""}${g.ev}（紅方視角）→「${x.pos.split("，")[0]}」`);
  if(isMiss(g))o.push(`最佳著 ${g.bmt} 步殺（bmt），這步走完${g.pmt<0?"反被 "+(-g.pmt)+" 步殺":"沒有殺"}（pmt）→ 錯過殺棋`);
  else if(isWalk(g))o.push(`最佳著不會被殺，這步走完對方 ${-g.pmt} 步殺（pmt<0）→ 走進殺棋`);
  const G=grabs(c),{b0,t}=afterOf(c);
  if(/白送|白白吃掉/.test(x.reason))o.push(`規則重驗：對方「${g.rr?g.rr.c:"?"}」吃得到，走方吃不回 → 白送`);
  else if(/吃回/.test(x.reason))o.push(`規則重驗：被吃的子走方吃得回來，但換算子力還是虧 → 不說白送`);
  if(b0[t]&&/吃掉對方的/.test(x.reason))o.push(`這步自己先吃了「${C.NAMES[C.sideOf(b0[t])][b0[t].toUpperCase()]}」，要一起算 → 不說白送`);
  if(/白吃/.test(x.reason))o.push(`建議著「${g.bc}」吃子，規則上對方吃不回 → 錯過白吃`);
  if(/讓對方下一手/.test(x.reason))o.push(`分析線對方最佳回應「${g.rr.c}」${g.rr.x?"吃子":g.rr.k?"將軍":""} → 具體後果`);
  if(BAD.includes(x.q)&&!x.reason)o.push("規則看不出具體戰術 → 只講少幾個兵和走完誰好");
  return o.join("；")}
function snapMd(){const L=[`# 分析一致性案例庫（快照）`,"",`自動產生：tools/test-analysis-cases.js（UPDATE_SNAP=1 重寫）。引擎快照：tools/analysis-cases.json（Pikafish 深度 ${DATA.depth}、${DATA.made}）。`,"",
  "| 案例 | 方 | 局面 | 走法 | 評等 | 兵值 | 局面句 | 原因句 |","|---|---|---|---|---|---|---|---|"];
  for(const{c,x}of ALL)L.push(`| ${c.id} | ${sideN(c.by)} | ${cell(c.src)} | ${cell(c.cn)} | ${x.q} | ${cell(x.pawn)} | ${cell(x.pos)} | ${cell(x.reason)} |`);
  L.push("");for(const{c,x}of ALL){L.push(`## ${c.id} ${sideN(c.by)} ${c.cn}【${x.q}】`,"",`- FEN：\`${c.fen}\`　著法：${c.mv}　第 ${c.ply} 步`,`- 引擎：q=${c.g.q} loss=${c.g.loss} gap=${c.g.gap} ev=${c.g.ev} bv=${c.g.bv} bmt=${c.g.bmt} pmt=${c.g.pmt} bc=${c.g.bc} rr=${c.g.rr?c.g.rr.c+(c.g.rr.x?"（吃 "+c.g.rr.x+"）":"")+(c.g.rr.k?"（將軍）":""):"—"}`,
    `- 評等白話：${cell(x.plain)}`,`- 原因句：${cell(x.reason)}`,`- 賽後講解：${cell(x.talk)}`,`- 逐步說明：${cell(x.note)}`,`- 關鍵一步：${cell(x.key)}`,"")}
  return L.join("\n")}
function docMd(){const n=ALL.length,red=ALL.filter(({c})=>c.by==="r").length,cnt={};for(const{x}of ALL)cnt[x.q]=(cnt[x.q]||0)+1;
  const L=["# 89 分析一致性案例庫（評比循環第 2 輪）","",
    "ChatGPT 第 2 輪要求：「擴充分析一致性回歸案例庫：至少 20 個『評等字＋兵值＋局面句＋原因句』案例，含失著、疑問、白送、可吃回但虧、錯過吃子；自動測試截圖或快照。」",
    "",`這裡是 ${n} 個真實局面（紅方 ${red} 個、黑方 ${n-red} 個；${QS.map(q=>q+" "+(cnt[q]||0)).join("、")}）。每個案例用本機 Pikafish（深度 ${DATA.depth}、單執行緒、每次清空雜湊表，結果可重現）跑一次 App 真正的評等程式（core.js classifyRaw），存成快照；`,
    "再用 App 真正的白話函式產生畫面上的每一句話（著法條評等泡泡、賽後講解、關鍵一步、逐步說明）。自動測試每次都重產一遍、跟快照逐字比對，並檢查下面的一致性規則。",
    "局面來源：開局（從第一步走起）、大師對局中局、殘局殺法題；黑方的殺棋案例用同一題紅黑對調。ChatGPT 說的「疑問手」對應 App 的「緩著」（不算錯，但有更好的走法）。","",
    "## 自動檢查的一致性規則","",
    "1. 同一步各處寫的「少了約幾個兵」都一樣（00-util pawnAbout）；殺棋相關的大損失（loss ≥ 2000）不換算成兵，只說「差很多／4 個兵以上」。",
    "2. 評等字跟 loss 區間相符：正著 <30、穩著 30～60、緩著 61～150、失著 151～400、敗著 >400 分；妙著＝首選而且第二好差 200 分以上。",
    "3. 「白送／白白吃掉」只在規則重驗吃不回時出現；這步自己有吃子就一起算，不說白送；說「吃得回來」就要真的吃得回。",
    "4. 「錯過殺棋／已經有殺棋」只在引擎殺棋訊號（最佳著有殺 bmt>0、這步走完沒殺）時出現；「對方能將死你」只在走完被殺（pmt<0）時出現。",
    "5. 局面句方向跟 ev 正負一致（≥0.3 兵紅方、≤−0.3 兵黑方、中間均勢）；評等句後面接的「走完整盤…」就是同一句局面句。",
    "6. 沒有「局面明顯變差」；走方走完還領先時，不會說對方好。","7. 穩著（只差一點點）不說「錯過吃子」。","",
    "## 案例表","","| 案例 | 局面描述 | 評等 | 兵值 | 局面句 | 原因句 | 為什麼這樣判 |","|---|---|---|---|---|---|---|"];
  for(const{c,x}of ALL)L.push(`| ${c.id}（${sideN(c.by)}）${cell(c.cn)} | ${cell(c.note)}<br><small>${cell(c.src)}</small> | ${x.q} | ${cell(x.pawn)} | ${cell(x.pos)} | ${cell(x.reason)} | ${cell(judge(c,x))} |`);
  L.push("","## 這一輪測出來、已修好的矛盾","",
    "- **吃了子還說「白送」**：開局炮二進七（炮打馬）、大師對局俥六進五（俥吃士將軍）——這步自己先吃了對方的子，被吃回去以前說「你換不回來，等於白送」。改成把自己吃到的子一起算：子力差不多就說「等於拿炮換馬」，差很多才說虧（05-settings mflWhy）。",
    "- **殺棋相關的大損失被換算成「約 20 個兵」**：走進殺棋、錯過殺棋時 loss 是殺棋分數夾到 ±2000 相減，賽後講解卻寫「少了約 21.4 個兵的價值」，著法條泡泡寫「4 個兵以上」、關鍵一步寫「差很多」。統一成不換算：講解和原因句說「差很多」（05-settings talk、mflWhy）。",
    "- **逐步說明只寫分數**：檢討頁每一步下面寫「少 237 分」，同一步別處寫「約 2.4 個兵」。改成「少了約 2.4 個兵的價值（237 分）」，殺棋相關的寫「差很多」（10-db gradeNote）。",
    "- **穩著也說「錯過白吃」**：b10 這個局面在引擎算得比較淺時會評成穩著（少 57 分），泡泡說「只比最好的走法差一點點」，原因句卻說「錯過白吃對方的相」，兩句打架。穩著不再講錯過吃子，緩著以上才講（05-settings mflWhy；測試用 loss 57 固定驗證）。",
    "- 順手發現：大師對局資料 gmgames.json 有一盤日期打錯（余貴燊對胡榮華寫成 1876.6.23，year 欄是 1976），案例來源改用 year 欄；資料本身沒改。","",
    "## 每個案例的完整文字","","逐字快照在 `xiangqi-lab/tools/analysis-cases.snap.md`（評等白話、原因句、賽後講解、逐步說明、關鍵一步全文）；引擎原始數字在 `xiangqi-lab/tools/analysis-cases.json`。",
    "重跑：`node xiangqi-lab/tools/make-analysis-cases.js`（要本機 Pikafish）→ `node --test xiangqi-lab/tools/test-analysis-cases.js`。","");
  return L.join("\n")}
test("快照：全部案例的完整文字跟 analysis-cases.snap.md 一樣",()=>{const now=snapMd();
  if(process.env.UPDATE_SNAP==="1"){fs.writeFileSync(SNAP,now);fs.writeFileSync(DOC,docMd());return}
  assert.ok(fs.existsSync(SNAP),"還沒有快照：UPDATE_SNAP=1 node --test tools/test-analysis-cases.js");
  const old=rd(SNAP);if(old!==now){const a=old.split("\n"),b=now.split("\n");const i=a.findIndex((l,k)=>l!==b[k]);assert.fail(`快照不一樣（第 ${i+1} 行）：\n舊：${a[i]}\n新：${b[i]}\n看過沒問題再 UPDATE_SNAP=1 重寫`)}
});
