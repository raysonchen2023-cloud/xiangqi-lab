// ================= AI 對戰直播 =================
// ================= 觀戰：線上棋友正在下的棋＋AI 對戰 =================
function WatchHub(v){setTop("觀戰",false);setTabs(true,"#/watch");const RI=!OFF||DEVREMOTE();   // 一般玩家（沒連過電腦）看不到 AI 對戰
  v.innerHTML=`<div class="pad home"><div class="sec-t" style="margin-top:4px">線上對局 <button id="lb">線上大廳 ›</button></div><div id="wl"></div>
    ${RI?`<div class="sec-t">AI 對戰</div><button class="item card" id="ai" style="width:100%;display:flex;gap:12px;align-items:center;text-align:left">
      <span style="font-size:30px">📺</span><span style="flex:1;min-width:0"><b>GPT 對 Claude</b><br><span class="muted" id="aiS">電腦上的兩個 AI 在下棋</span></span><span class="muted">›</span></button>`:""}
    <p class="muted" style="font-size:12px;text-align:center;margin-top:18px">觀戰時可以看雙方走棋、聊天，不會影響對局。</p></div>`;
  (v.querySelector("#lb")||{}).onclick=()=>location.hash="#/lobby";const aiB=v.querySelector("#ai");if(aiB)aiB.onclick=()=>location.hash="#/watch/ai";
  if(RI)api("/state").then(st=>{const e=v.querySelector("#aiS");if(e)e.innerHTML=st.running?'<span class="live">直播中</span>・第 '+Math.ceil(st.moves.length/2)+" 回合":st.result?"上一盤："+(st.result.w?PLAYER[st.result.w]+"勝":"和局"):"按進去可以開始"}).catch(()=>{const e=v.querySelector("#aiS");if(e)e.textContent="連不到電腦"});
  const ST={idle:"閒置中",seeking:"找對手中",watching:"觀戰中"};
  function paint(){const box=v.querySelector("#wl");if(!box)return;
    if(!OFF||!window.XQNet){box.innerHTML='<div class="card muted">線上對局要用安裝在手機上的 App（GitHub 版）。</div>';return}
    const up=XQNet.status()==="up",ps=XQNet.people(),games={};
    for(const p of ps)if(p.st==="playing"&&p.gid&&p.gid!==XQNet.gid())(games[p.gid]=games[p.gid]||[]).push(p);
    const list=Object.entries(games);
    if(!list.length){box.innerHTML=`<div class="card" style="text-align:center;padding:20px 14px"><div style="font-size:34px">♟</div><b>${up?"目前沒有人在下棋":"連線到大廳中…"}</b>
      <div class="muted" style="margin:4px 0 10px">${up?`線上 ${ps.length} 位棋友・有人開始下棋就會出現在這裡`:"稍等一下"}</div><button class="btn ghost" id="go">去線上大廳找人下棋</button></div>`;
      box.querySelector("#go").onclick=()=>location.hash="#/lobby";return}
    box.innerHTML=list.map(([g,l])=>{const w=ps.filter(x=>x.gid===g&&x.st==="watching").length;
      return`<div class="card row" style="justify-content:space-between;margin-bottom:8px"><span style="min-width:0"><b>${l.map(p=>`<span data-pid="${esc(p.id)}" data-pn="${esc(p.name)}" role="button" tabindex="0" data-axk style="text-decoration:underline dotted;cursor:pointer">${esc(p.name)}</span> <span class="pill">${esc(XQNet.rankOf(p.pts))}</span>`).join(" 對 ")}</b><br>
        <span class="muted"><span class="live">對戰中</span>${w?`・${w} 人觀戰`:""}</span></span><button class="pill pill-main" data-w="${esc(g)}" style="padding:8px 14px;flex:none">👀 觀看</button></div>`}).join("");
    box.querySelectorAll("[data-pid]").forEach(x=>x.onclick=e=>{e.stopPropagation();oppCard(x.dataset.pid,x.dataset.pn)});
    box.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{const go=()=>{XQNet.watch(b.dataset.w);location.hash="#/pvp"};
      if(XQNet.playing())confirmBox("你有一盤進行中的對局，去觀戰會離開它，確定？",go,"確定");else go()})}
  let offs=[];if(OFF&&window.XQNet){XQNet.start();offs=[XQNet.on("people",paint),XQNet.on("status",paint)]}
  paint();const t=setInterval(paint,10000);
  return{stop:()=>{offs.forEach(f=>f());clearInterval(t)}}}
function Watch(v){
  if(OFF&&!XQ.remoteInfo()){setTop("AI 對戰","#/lobby");setTabs(false);
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center;padding:24px 16px"><div style="font-size:52px">📺</div><h2 style="font-family:var(--serif);margin:8px 0">要連上電腦才能看 AI 對戰</h2>
      <p class="muted">AI 對戰是電腦上的 GPT 和 Claude 在下棋，手機要連上電腦才看得到。挑戰電腦、雙人對戰、古譜研究不需要連線。</p><button class="btn" id="cn">怎麼連線</button></div></div>`;
    (v.querySelector("#cn")||{}).onclick=connectSheet;return{}}
  setTop("AI 對戰","#/lobby");setTabs(false);gameLayout(v);
  let st=null,view=null,clockBase=null;
  const bd=Board(null,d=>{if(!st)return;const n=st.moves.length;let x=view==null?n:view;x=Math.max(0,Math.min(n,x+d));view=x>=n?null:x;draw()});
  v.querySelector("#bbox").append(bd.svg);
  const note=document.createElement("div");note.className="note";note.id="think";v.querySelector("#acts").before(note);v.querySelector("#acts").previousElementSibling.previousElementSibling.remove();
  const acts=actionBar(v.querySelector("#acts"),[["start","▶","開始",()=>post("/start")],["pause","⏸","暫停",()=>post("/pause")],["live","⏭","回到最新",()=>{view=null;draw()}],
    ["rec","📖","棋譜",()=>location.hash="#/db/ai/"+encodeURIComponent(st&&st.id||"current")],["new","＋","新局",()=>confirmBox("放棄目前對局、開新局？",()=>post("/new"),"開新局")]]);
  async function post(u){try{await api(u,{});render(await api("/state"))}catch(e){toast(e.message)}}
  function boardAtN(n){const b=parseFen(START);for(const m of st.moves.slice(0,n)){b[m.t]=b[m.f];b[m.f]=null}return b}
  function draw(){if(!st)return;const n=view==null?st.moves.length:view;
    bd.draw(view==null?st.board:boardAtN(n),{last:st.moves[n-1],check:view==null?st.check:-1});
    const m=st.moves[n-1],ev=view==null?(st.ev&&st.ev.v):m&&m.ev;v.querySelector("#evf").style.width=evPct(ev)+"%";
    renderStrip(v.querySelector("#strip"),st.moves,n-1,i=>{view=i+1>=st.moves.length?null:i+1;draw()});
    const s2=v.querySelector("#stat");s2.classList.toggle("hot",view!=null);
    s2.textContent=view!=null?`回顧第 ${n} 步${m?" "+m.cn:""}${m&&m.q?"【"+m.q+"】":""}・按 ⏭ 回到最新`:st.status;
    const th=v.querySelector("#think");
    th.textContent=view!=null&&m?`${PLAYER[m.by]}：${m.cm||""}`+(m.q&&m.q!=="正著"&&m.q!=="妙著"?`\nPikafish：比最佳著法少 ${m.loss} 分，建議 ${m.bc}`:""):st.liveSide?`${PLAYER[st.liveSide]}思考中…\n${(st.live||"").slice(-600)}`:(m&&m.cm?`${PLAYER[m.by]}：${m.cm}`:"");
    if(view==null&&st.liveSide)th.scrollTop=th.scrollHeight;
    acts.live.disabled=view==null}
  function clocks(){if(!clockBase)return;for(const s of["r","b"]){const el=v.querySelector("#ck_"+s);if(el){const x=clockBase.c[s]-(clockBase.run&&clockBase.turn===s?Date.now()-clockBase.at:0);el.textContent=st.clock?fmt(x):"--:--"}}}
  const ckT=setInterval(clocks,500);
  function render(s){const n0=st?st.moves.length:-1;st=s;
    v.querySelector("#pTop").innerHTML=playerHTML("b",st.black,"黑方・Claude","").replace('<div class="clk">','<div class="clk" id="ck_b">');
    v.querySelector("#pBot").innerHTML=playerHTML("r",st.red,"紅方・GPT","").replace('<div class="clk">','<div class="clk" id="ck_r">');
    v.querySelector("#pTop").classList.toggle("on",!st.result&&st.turn==="b");v.querySelector("#pBot").classList.toggle("on",!st.result&&st.turn==="r");
    clockBase={at:Date.now(),c:st.clocks,turn:st.turn,run:st.running&&!st.result};clocks();
    $("#title").innerHTML=st.running?'AI 對戰 <span class="live" style="color:#ff8a7a">直播</span>':"AI 對戰";
    acts.start.hidden=st.running||!!st.result;acts.pause.hidden=!st.running;acts.start.querySelector("span").nextSibling.textContent=st.started?"繼續":"開始";
    if(n0>=0&&st.moves.length>n0&&view==null)vibrate(8);draw()}
  let warned=false;
  const stop=poller(async()=>{try{render(await api("/state"));warned=false}catch(e){if(!warned){warned=true;v.querySelector("#stat").textContent="⚠ "+e.message}}},1500);
  return{stop:()=>{stop();clearInterval(ckT)}}}

route();
