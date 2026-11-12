/* ================= 🕰 回到當年（意見回饋 313）=================
   石桌往事裡的對局，用「妙棋精選」裡 Pikafish 驗證過的特級大師實戰來演：你站在旁邊看，不能插手；
   棋自動一步一步下，下到那一步妙棋之前停下來——換作是你，會怎麼走？
   跟實戰（也是 Pikafish 唯一好棋）一樣：照難度加積分挑戰的段位積分（易 5、中 10、難 15）；Pikafish 評為好棋的給一半；每個轉折只能領一次 */
const SCENE_PTS=[["易",5],["中",10],["難",15]],sceneLevel=it=>{const s=+it.score||0;return s>=14?2:s>=9?1:0};
function LegendScene(v,key){
  setTop("回到當年","#/");setTabs(false);
  let S=null,it=null,mv=[],ply=0,stop=ply,board=null,hero="r",LEGAL=[],sel=-1,phase="intro",timer=null,busy=false,hk=null;
  const C=window.XQCore,bd=Board(x=>tap(x)),nm=s=>s===hero?S.hero:S.other;
  const cn=(b,m)=>{try{return C.notate(b,m.f,m.t)}catch(e){return""}},apply=(b,m)=>{const n=b.slice();n[m.t]=n[m.f];n[m.f]=null;return n};
  (async()=>{const D=await legendData();S=D&&(D.scenes||[]).find(x=>x.key===key);
    if(!S){v.innerHTML='<div class="pad"><div class="card muted">找不到這段往事。</div></div>';return}
    try{it=await api(`/db/item?c=${S.c}&id=${encodeURIComponent(S.id)}`)}catch(e){v.innerHTML=`<div class="pad"><div class="card muted">棋譜載入失敗：${esc(e.message)}</div></div>`;return}
    mv=it.lines[0].moves.map(m=>Array.isArray(m)?{f:m[0],t:m[1]}:m);stop=(+it.jump||1)-1;hero=stop%2?"b":"r";
    ply=Math.max(0,stop-(S.lead||14));board=it.board?it.board.slice():C.parseFen(C.START);for(let i=0;i<ply;i++)board=apply(board,mv[i]);
    intro()})();
  function intro(){v.className="view";const L=SCENE_PTS[sceneLevel(it)],done=!!(store.get("sceneDone",{})[key]);
    v.innerHTML=`<div class="pad"><div class="card" style="line-height:1.9">
      <div class="muted" style="font-size:13px">🕰 ${esc(S.when)}・${esc(S.where)}</div>
      <h2 style="margin:4px 0 10px;font-family:var(--serif)">${esc(S.title)}</h2>
      <div style="white-space:pre-wrap;font-size:15.5px">${esc(S.intro)}</div>
      <p class="muted" style="font-size:13px;margin-top:10px">你站在人群裡，不能插手。棋會一步一步下，下到關鍵的時候會停下來——換作是你，會怎麼走？跟他當年走的一樣，就加 <b>${L[1]}</b> 分段位積分（難度：${L[0]}）${done?"・這一段你已經領過了":""}。</p>
      <button class="btn" id="go">▶ 擠進人群去看</button></div></div>`;
    (v.querySelector("#go")||{}).onclick=start}
  function start(){gameLayout(v);v.querySelector("#strip").insertAdjacentHTML("beforebegin",'<div class="note" id="note" style="white-space:pre-wrap;padding:4px 12px;line-height:1.7"></div>');
    v.querySelector("#bbox").append(bd.svg);head();draw(null);phase="watch";say(S.open||"棋局正膠著，四周安靜得只剩下落子的聲音。");acts();next()}
  function head(){v.querySelector("#pTop").innerHTML=playerHTML(hero==="r"?"b":"r",nm(hero==="r"?"b":"r"),S.otherSub||"",null);
    v.querySelector("#pBot").innerHTML=playerHTML(hero,nm(hero),S.heroSub||"",null)}
  function draw(last,o){bd.draw(board,{flip:hero==="b",last,sel,targets:sel>=0?LEGAL.filter(([f])=>f===sel).map(x=>x[1]):[],...(hk&&phase==="ask"?{hint:hk}:{}),...(o||{})})}
  function hint(){if(phase!=="ask")return;if(hk)return toast("已經提示過了");const H=useHint();if(!H)return;const m=mv[stop];hk=H.full?[m.f,m.t]:[m.f];stat(H.full?"💡 藍框是他要動的子和落點":"💡 藍框這顆子就是關鍵")/* 意見回饋 607；11/11 提示框改藍色（01-board.js） */;acts();draw(mv[stop-1])}
  const say=t=>{const n=v.querySelector("#note");if(n)n.textContent=t},stat=t=>{const n=v.querySelector("#stat");if(n)n.textContent=t};
  function acts(){actionBar(v.querySelector("#acts"),phase==="ask"?[["hint","💡",hintLabel(),hint],["skip","👀","看他怎麼走",()=>judge(-1,-1)]]:phase==="end"?[["again","↺","再看一次",()=>route()/* 意見回饋 607：直接重畫這一頁，不要連設兩次網址（會多出兩筆上一頁） */],["book","📜","石桌往事",()=>legendBook()]]:[["fast","⏩","快轉到關鍵",()=>{clearTimeout(timer);while(ply<stop){board=apply(board,mv[ply]);ply++}draw(mv[stop-1]);ask()}]])}
  function next(){clearTimeout(timer);if(phase!=="watch")return;if(ply>=stop)return ask();
    timer=setTimeout(()=>{const m=mv[ply],s=ply%2?"b":"r",t=cn(board,m);board=apply(board,m);ply++;draw(m);stat(`${nm(s)}：${t}`);vibrate(4);next()},ply===Math.max(0,stop-(S.lead||14))?900:1500)}
  async function ask(){phase="ask";acts();head();stat(`輪到${nm(hero)}。`);say(S.ask||`${nm(hero)}捏著一顆棋子，想了很久很久。圍觀的人都屏住了氣。\n換作是你，這一步會怎麼走？（點棋子，再點要去的位置）`);
    try{LEGAL=(await api("/an/legal",{board,side:hero})).legal}catch(e){LEGAL=[]}draw(mv[stop-1])}
  function tap(x){if(phase!=="ask"||busy||!LEGAL.length)return;if(sel>=0&&LEGAL.some(([f,t])=>f===sel&&t===x)){const f=sel;sel=-1;return judge(f,x)}sel=LEGAL.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw(mv[stop-1])}
  async function judge(f,t){if(busy)return;busy=true;const m=mv[stop],hit=f===m.f&&t===m.t,real=cn(board,m),L=SCENE_PTS[sceneLevel(it)];let msg="",pts=0;
    if(f<0)msg=`${nm(hero)}走了 ${real}。`;
    else if(hit){pts=hk?Math.ceil(L[1]/2):L[1];msg=`✔ 你想的跟他一模一樣：${real}！${hk?"（用了提示，積分減半）":""}`}
    else{let c=null;try{c=await api("/an/classify",{board,side:hero,f,t})}catch(e){}const mine=cn(board,{f,t});
      if(c&&c.loss!=null&&c.loss<=40){pts=Math.ceil(L[1]/2);msg=`你想走 ${mine}，也是好棋（Pikafish 評為「${c.q||"好棋"}」）；不過${nm(hero)}走的是 ${real}。`}
      else msg=`你想走 ${mine}${c&&c.q?`（Pikafish 評為「${c.q}」）`:""}；${nm(hero)}走的是 ${real}。`}
    let got="";if(pts){try{const r=await api("/play/bonus",{key:"scene:"+key,pts,why:"回到當年・"+S.title});got=r.already?"（這一段之前領過了，不重複加分）":`段位積分 +${r.d}（${r.pts} 分・${r.rank}）${r.rank!==r.was?` 🎉 升上 ${r.rank}！`:""}`;
      if(!r.already){const D=store.get("sceneDone",{});D[key]=Date.now();store.set("sceneDone",D)}}catch(e){got=""}}
    addXP(30,"回到當年","sc:"+key);try{jSceneDone(key,Math.min(hk?2:3,hit?3:pts?2:1))}catch(e){}
    board=apply(board,m);ply=stop+1;draw(m);vibrate(hit?[15,30,15]:8);stat(msg);
    const why=String((it.comments||{})["0_"+(stop+1)]||"").replace(/^💎 妙棋：[^。]*。/,"");
    say((got?got+"\n":"")+(why?"這一步妙在："+why:""));phase="after";busy=false;
    actionBar(v.querySelector("#acts"),[["go","›","繼續看",()=>{phase="tail";tail(S.after||6)},true]])}
  function tail(n){clearTimeout(timer);if(n<=0||ply>=mv.length)return end();
    timer=setTimeout(()=>{const m=mv[ply],s=ply%2?"b":"r",t=cn(board,m);board=apply(board,m);ply++;draw(m);stat(`${nm(s)}：${t}`);tail(n-1)},1300)}
  function end(){phase="end";acts();say(S.outro||"");stat("");
    const src=`這盤棋取材自 ${it.year||""} ${it.red||""} 對 ${it.black||""} 的實戰（${it.event||"比賽"}），妙棋那一步經 Pikafish 驗證。`;
    v.querySelector("#note").insertAdjacentHTML("beforeend",`<div class="muted" style="font-size:12px;margin-top:6px">${esc(src)}</div>`)}
  return{stop:()=>clearTimeout(timer)}}

// 集章簿：13 個朝代的印章，蓋過的是朱紅色；點一格看那一朝的擂主卡（意見回饋 697：別朝只能看，要挑戰得回星槎開過去，不在這裡換朝代）
// 開發者 11/9：集章簿、路引合成「千秋印譜」（07i2-seal.js sealBook）；所有呼叫 stampBook 的地方都轉過去，下面舊的集章簿只在 SEAL_ON 關掉時用
function stampBook(start){if(typeof sealBook==="function"&&typeof SEAL_ON!=="undefined"&&SEAL_ON)return sealBook(start);const S=arenaStamps(),n=Object.keys(S).length,t=arenaTitle(),nx=ARENA_TITLES.slice().reverse().find(([k])=>n<k);
  sheet("📜 集章簿",b=>{b.innerHTML=`<p style="margin:0 0 8px">已蓋 <b>${n}</b> / 13 枚${t?`・稱號 <b style="color:var(--accent)">「${esc(t)}」</b>`:""}${nx?`<br><span class="muted" style="font-size:13px">再蓋 ${nx[0]-n} 枚得到稱號「${esc(nx[1])}」</span>`:""}</p>
    <div class="stamp-grid">${ARENA_ORDER.map(k=>`<button class="stamp-cell${typeof chdSealCls==="function"?chdSealCls(k):""}" data-e="${k}">${sealHTML(k,!!S[k])}<b>${esc(eraLabel(k))}</b><small>${S[k]?new Date(S[k].at).toLocaleDateString():esc(ARENA[k].name)}</small></button>`).join("")}</div>
    <p class="muted" style="font-size:12px;line-height:1.6;margin-top:10px">擂主只在自己那一朝守擂：坐星槎開到那一朝，下船走到渡口的 🏯 擂台（首頁 → ⚔ 對戰 → 🏯 朝代擂台也能進目前這一朝的擂台）。集到 3、7、13 枚會得到稱號，在大廳點你的資料卡大家都看得到。</p>
    ${OFF?`<button class="btn ghost" id="lgBk" style="width:100%;margin-top:6px">🪨 石桌往事（已解開 ${legendState().n}／36 回）</button>`:""}
    ${typeof yuBook==="function"?`<button class="btn ghost" id="yuBkS" style="width:100%;margin-top:6px">🧭 路引（輿圖遊歷 ${yuDoneN()}／13 條）</button>`:""}`;
    {const lb=b.querySelector("#lgBk");if(lb)lb.onclick=()=>legendBook()}
    {const yb=b.querySelector("#yuBkS");if(yb)yb.onclick=()=>yuBook()}   /* 意見回饋 658（B）：集章簿裡的新頁「路引」，跟擂主的印分開（07e-garden2.js） */
    b.querySelectorAll(".stamp-cell").forEach(c=>c.onclick=()=>arenaSheet(c.dataset.e,start))})}
// 蓋章動畫：畫面中間一方朱印「蓋」下去（11/9 起畫那一朝的千秋印，看得到剛亮的那一邊）
function stampFx(era){const A=ARENA[era];if(!A)return;const d=document.createElement("div");d.className="stampfx";d.innerHTML=typeof sealDraw==="function"?sealDraw(era,{fx:1}):sealHTML(era,true,true);document.body.append(d);vibrate([20,60,40]);setTimeout(()=>d.remove(),2600)}
