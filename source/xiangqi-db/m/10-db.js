// ================= 棋譜庫（清單） =================
const libState={c:null,q:"",player:"",side:"",res:"",limit:60};
function Library(v,c0){
  setTop("棋譜庫",false);setTabs(true,"#/db");
  v.innerHTML=`<div class="lib"><div id="libRecent"></div><div id="libTools" class="row" style="gap:8px;padding:8px 12px 0;flex-wrap:wrap"></div><div class="lib-seg" id="grp" hidden></div><div class="chips" id="cols"></div>
    <div class="lib-bar"><div class="search"><label class="lib-q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg><input id="q" type="search" placeholder="搜尋局名、棋手、賽事" enterkeyhint="search" autocomplete="off"></label><button id="pf" hidden>👤 棋手</button></div>
    <div class="lib-meta"><span id="cnt"></span><button id="clr" hidden>清除篩選</button></div></div>
    <div class="items" id="items"></div><div class="more" id="more"></div></div>`;
  /* 意見回饋 340：棋譜庫最上面寫「繼續研究」——最近在看哪幾盤、看到第幾步，點了接著看 */
  {const r=store.get("recent",[])[0],box=v.querySelector("#libRecent");if(r&&box){
    box.innerHTML=`<button class="card row" id="lrGo" style="width:calc(100% - 24px);margin:10px 12px 0;padding:10px 12px;gap:10px;justify-content:space-between;font:inherit;color:inherit;text-align:left"><span style="font-size:22px">📖</span><span style="flex:1;min-width:0"><small class="muted">繼續研究</small><br><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.title)}</b><small class="muted">${esc(r.book)}${r.ply?"・看到第 "+r.ply+" 步":""}</small></span><span class="muted">›</span></button>`;
    box.querySelector("#lrGo").onclick=()=>location.hash=`#/db/${encodeURIComponent(r.c)}/${encodeURIComponent(r.id)}`}}
  let books=[],data=null,shown=[],grp=null,big=[];   // big：可以從網站下載的大型棋譜（例如特級大師對局）
  // 書目分三類：古譜／大師對局／我的對局
  const MINE=["ai","play","pvp","study"],GRPS=[["old","古譜"],["gm","大師對局"],["me","我的對局"]];
  const grpOf=b=>MINE.includes(b.key)?"me":(b.synced||/^(xuyinchuan|gmgames|brilliant)$/.test(b.key))?"gm":"old";
  const empty=(e,t,btn)=>{const box=v.querySelector("#items");box.innerHTML=`<div class="lib-empty"><span class="e">${e}</span>${t}</div>`;
    if(btn){const b=document.createElement("button");b.className="btn";b.textContent=btn[0];b.onclick=btn[1];box.firstChild.append(b)}};
  const toBar=()=>{const t=v.querySelector("#cols").getBoundingClientRect().bottom-v.getBoundingClientRect().top+v.scrollTop;if(v.scrollTop>t)v.scrollTop=t};
  const resOf=it=>{const r=s2(it.result);return/红[方先]?胜/.test(r)?"r":/黑[方先]?胜/.test(r)?"b":/和/.test(r)?"d":""};
  const T2S={};"馬马車车將将帥帅砲炮龍龙鳳凤雲云風风門门關关陣阵戰战劍剑書书歸归飛飞騎骑雙双營营師师寶宝鐵铁蘭兰燈灯陽阳陰阴們们長长東东應应開开從从來来見见說说過过還还進进對对漢汉蘇苏韓韩趙赵張张劉刘孫孙鄭郑齊齐萬万與与為为無无個个這这邊边轉转難难興兴廣广鄉乡聖圣靈灵條条樓楼鶴鹤鷹鹰雞鸡魚鱼鳥鸟龜龟園园圍围國国華华紅红綠绿藍蓝黃黄詩诗畫画夢梦蓮莲樂乐歡欢壽寿勝胜敗败殺杀奪夺斬斩鬥斗會会盤盘陳陈縱纵橫横險险絕绝銀银呂吕楊杨許许謝谢單单趙赵陶陶黎黎譜谱齡龄偉伟濤涛榮荣輝辉鵬鹏騰腾傑杰軍军強强葉叶鄧邓閻阎蔣蒋聶聂賴赖錢钱鍾钟鐘钟顧顾嚴严馮冯盧卢羅罗蕭萧陸陆寧宁聯联賽赛屆届級级團团隊队錦锦標标運运動动協协晉晋遼辽滬沪範范慶庆憲宪紀纪".replace(/(.)(.)/g,(_,a,b)=>{T2S[a]=b;return""});
  const s2=t=>[...String(t||"")].map(c=>T2S[c]||c).join("");
  const qi=v.querySelector("#q");qi.value=libState.q;
  qi.oninput=()=>{libState.q=qi.value;libState.limit=60;filter(true)};
  (v.querySelector("#pf")||{}).onclick=()=>playerSheet();
  (v.querySelector("#clr")||{}).onclick=()=>{libState.q="";qi.value="";libState.player="";libState.side="";libState.res="";libState.limit=60;filter(true)};
  const pick=c=>{libState.player="";libState.q="";qi.value="";libState.limit=60;load(c)};
  /* 評比第 4 輪 P17.2：📥 匯入棋譜（PGN／中文記譜，存到「我的研究」）、♟ 局面還原（FEN、擺子）——m/10d-coach.js pgnISheet、PosRestore */
  /* 11/11 ChatGPT 介面報告 P2：功能名不變，各加一行例子（PGN_TOOLS：「我有整盤棋譜」「我只有一個局面」）；進局面還原前記下從棋譜庫來（posRFromSet），返回回棋譜庫 */
  {const tb=v.querySelector("#libTools");if(tb&&typeof pgnISheet==="function"){const T=typeof PGN_TOOLS!=="undefined"?PGN_TOOLS:[{id:"libImp",nm:"📥 匯入棋譜",ex:""},{id:"libPos",nm:"♟ 局面還原",ex:""}];
    tb.innerHTML=T.map(x=>`<button class="pill lib-tool" id="${x.id}"><b>${esc(x.nm)}</b>${x.ex?`<small>${esc(x.ex)}</small>`:""}</button>`).join("");
    tb.querySelector("#libImp").onclick=()=>{vibrate(5);pgnISheet(()=>api("/db/books").then(bs=>{if(!v.isConnected)return;books=bs.filter(x=>x.key!=="ai"||!OFF||DEVREMOTE());pick("study")}).catch(()=>{}))};
    tb.querySelector("#libPos").onclick=()=>{vibrate(5);if(typeof posRFromSet==="function")posRFromSet(location.hash||"#/db");location.hash="#/pos"}}else if(tb)tb.remove()}
  function paintCols(){const seg=v.querySelector("#grp"),box=v.querySelector("#cols");
    const gs=GRPS.filter(([g])=>books.some(b=>grpOf(b)===g)||(g==="gm"&&DEVREMOTE()));
    if(!seg||!seg.isConnected)return;seg.hidden=gs.length<2;seg.innerHTML="";
    for(const[g,l]of gs){const x=document.createElement("button");x.textContent=l;x.classList.toggle("on",g===grp);
      x.onclick=()=>{if(g===grp)return;grp=g;const f=books.find(b=>grpOf(b)===g);if(f)pick(f.key);else{paintCols();libState.c=null;data=null;showNone()}};seg.append(x)}
    box.innerHTML="";
    for(const b of books.filter(b=>grpOf(b)===grp)){const x=document.createElement("button");x.dataset.c=b.key;x.classList.toggle("on",b.key===libState.c);
      x.innerHTML=`<b>${esc(b.name)}</b>${b.count?`<small>${b.count.toLocaleString()} 局</small>`:""}`;x.onclick=()=>{if(b.key!==libState.c)pick(b.key)};box.append(x)}
    if(grp==="gm")for(const g of big.filter(g=>!books.some(b=>b.key===g.key))){const x=document.createElement("button");x.className="sync";x.textContent=`⬇ ${g.name}（${Math.round(g.size/1048576)} MB）`;x.onclick=()=>bigSheet(g);box.append(x)}
    if(grp==="gm"&&big.length&&books.some(b=>b.synced&&big.some(g=>g.key===b.key))){const x=document.createElement("button");x.className="sync";x.textContent="🗑 管理下載";x.onclick=()=>dlSheet();box.append(x)}
    if(DEVREMOTE()&&grp==="gm"){const x=document.createElement("button");x.className="sync";x.textContent="☁ 從電腦同步";x.onclick=()=>syncSheet();box.append(x)}
    const on=box.querySelector(".on"),x=on?on.offsetLeft-box.offsetLeft:0;box.scrollLeft=on&&x+on.offsetWidth>box.clientWidth-12?x-(box.clientWidth-on.offsetWidth)/2:0}
  function showNone(){v.querySelector("#pf").hidden=true;v.querySelector("#clr").hidden=true;v.querySelector("#cnt").textContent="";v.querySelector("#more").innerHTML="";
    empty("🏆","還沒有大師對局<br>從電腦同步到手機，沒網路也能看",["☁ 從電腦同步",()=>syncSheet()])}
  async function load(c){libState.c=c;store.set("libC",c);const bk=books.find(b=>b.key===c);grp=bk?grpOf(bk):grp||"old";paintCols();v.scrollTop=0;
    v.querySelector("#items").innerHTML='<div class="lib-empty">載入中…</div>';v.querySelector("#more").innerHTML="";
    try{data=await api("/db/items?c="+encodeURIComponent(c))}catch(e){data=null;empty("⚠",esc(e.message));return}
    if(libState.c!==c)return;
    const hasP=data.items.some(x=>x.red||x.black);{const pf=v.querySelector("#pf");if(!pf)return;pf.hidden=!hasP}if(!hasP)libState.player="";filter()}
  function filter(top){if(!data)return;if(top)libState.pg=0;const q=s2(libState.q.trim()),pn=libState.player;
    shown=data.items.filter(it=>{
      if(pn){const r=(it.red||"").includes(pn),b=(it.black||"").includes(pn);if(libState.side==="r"?!r:libState.side==="b"?!b:!(r||b))return false;
        if(libState.res){const me=r?"r":"b",w0=resOf(it),w=w0==="r"||w0==="b"?w0:null;if(libState.res==="d"?w0!=="d":libState.res==="w"?w!==me:!(w&&w!==me))return false}}
      return!q||[it.no,it.year,it.name,it.title,it.red,it.black,it.event,it.open,it.part,it.label].some(x=>s2(x).includes(q))});
    const pb=v.querySelector("#pf");pb.classList.toggle("on",!!pn);pb.textContent=pn?"👤 "+pn:"👤 棋手";
    const fil=!!(q||pn);v.querySelector("#clr").hidden=!fil;
    const tags=pn?[{r:"執紅",b:"執黑"}[libState.side],{w:"他贏的",l:"他輸的",d:"和局"}[libState.res]].filter(Boolean):[];
    v.querySelector("#cnt").textContent=(fil?`找到 ${shown.length} 局・共 ${data.items.length} 局`:`共 ${shown.length} 局`)+tags.map(t=>"・"+t).join("")+(data.note?"・"+data.note:"");
    const box=v.querySelector("#items");box.innerHTML="";if(top)toBar();
    if(pn&&bios&&bios[pn]){const p=bios[pn],c=document.createElement("button");c.className="card bio-card";
      c.innerHTML=`<b>${esc(p.zh||pn)}</b>${p.revoked?' <span class="muted">（稱號已撤銷）</span>':""}<div class="muted">${esc([p.born&&p.born.slice(0,4)+" 年生",p.from,p.gm&&p.gm+" 年特級大師"].filter(Boolean).join("・"))}</div><div class="bio-s">${esc(p.bio||"")}</div><span class="bio-more">看完整生平 ›</span>`;
      c.onclick=()=>bioSheet(pn);box.append(c)}else if(pn&&!bios)getBios().then(()=>{if(bios[pn]&&libState.player===pn)filter()});
    if(!shown.length){const go={pvp:["#/lobby","去線上對戰下一盤"],play:["#/cpu","去挑戰電腦"],ai:["#/watch/ai","去看 AI 對戰"]}[libState.c];
      if(data.items.length)empty("🔍","沒有符合的棋局",["清除篩選",()=>v.querySelector("#clr").onclick()]);
      else empty("📭","這裡還沒有棋局",go&&[go[1],()=>location.hash=go[0]])}
    /* 意見回饋 404：我的對局（人機、真人、研究）每頁 10 局、上一頁／下一頁；古譜和大師對局照舊「再顯示 60 局」 */
    const PER=MINE.includes(libState.c)?10:0,NP=PER?Math.max(1,Math.ceil(shown.length/PER)):1;if(PER)libState.pg=Math.min(Math.max(0,libState.pg||0),NP-1);
    for(const it of PER?shown.slice(libState.pg*PER,libState.pg*PER+PER):shown.slice(0,libState.limit)){const b=document.createElement("button");b.className="item";
      const isG=it.red||it.black,R={r:["紅勝","r"],b:["黑勝","b"],d:["和","d"]}[resOf(it)];
      const tail=R?`<span class="lib-r ${R[1]}">${R[0]}</span>`:'<span class="lib-go">›</span>';
      b.innerHTML=isG?`<span class="lb">${esc(it.year||"")}</span><span class="tx"><b><span class="rn">${esc(oppTw(it.red||"？"))}</span> 對 ${esc(oppTw(it.black||"？"))}</b><span>${esc(it.event||it.open||it.date||(it.title&&it.name?it.name.replace(it.title,"").trim():"")||it.name||"")}${it.pend>0?`・📈 還有 ${+it.pend} 步待分析`:""}</span></span>${tail}`
        :`<span class="lb">${esc(it.label||it.no||"")}</span><span class="tx"><b>${esc(it.title||it.name)}</b><span>${esc([it.part,R?"":it.result,it.type].filter(Boolean).join("・"))}</span></span>${tail}`;
      b.onclick=()=>{vibrate(5);location.hash=`#/db/${encodeURIComponent(libState.c)}/${encodeURIComponent(it.id)}`};box.append(b)}
    const more=v.querySelector("#more");more.innerHTML="";
    if(PER){if(NP>1){more.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><button class="pill" data-pg="-1"${libState.pg?"":" disabled"}>‹ 上一頁</button><span class="muted">第 ${libState.pg+1}／${NP} 頁・共 ${shown.length} 局</span><button class="pill" data-pg="1"${libState.pg<NP-1?"":" disabled"}>下一頁 ›</button></div>`;
      more.querySelectorAll("[data-pg]").forEach(x=>x.onclick=()=>{libState.pg+= +x.dataset.pg;vibrate(5);filter();try{v.querySelector("#items").scrollIntoView({block:"start"})}catch(e){}})}}
    else if(shown.length>libState.limit){const b=document.createElement("button");b.className="btn ghost";b.textContent=`再顯示 60 局（還有 ${shown.length-libState.limit} 局）`;b.onclick=()=>{libState.limit+=60;filter()};more.append(b)}}
  // 特級大師生平（data/gmbios.json，第一次用到才讀）
  let bios=null;const getBios=()=>bios?Promise.resolve(bios):XQ_BIOS().then(x=>bios=x).catch(()=>bios={});
  function bioHtml(p){const L=[p.born&&("生於 "+p.born+(p.died?"，卒於 "+p.died:"")),p.from,p.gm&&(p.gm+" 年獲特級大師")].filter(Boolean).join("・");
    return`<div class="muted" style="margin-bottom:6px">${esc(L)}</div>${p.titles&&p.titles.length?`<ul style="margin:0 0 6px;padding-left:20px">${p.titles.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}${p.style?`<div><b>棋風：</b>${esc(p.style)}</div>`:""}<p style="margin:6px 0 0;line-height:1.7">${esc(p.bio||"")}</p>`}
  function bioSheet(name){getBios().then(B=>{const p=B[name];if(!p)return toast("還沒有這位棋手的介紹");
    sheet((p.zh||name)+"・生平",b=>{b.innerHTML=bioHtml(p)+`<p class="muted" style="font-size:12px;margin-top:10px">資料整理自公開網路資料，如有錯誤歡迎回饋。${(p.src||[]).length?"<br>參考："+p.src.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${i+1}</a>`).join("、"):""}</p>`})})}
  function playerSheet(){const pl=data.players||Object.entries(data.items.reduce((m,it)=>{for(const n of[it.red,it.black])if(n)m[n]=(m[n]||0)+1;return m},{})).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
    sheet("篩選棋手",b=>{const paint=()=>{b.innerHTML=`<div class="muted">執</div><div class="opt">${[["","紅黑都看"],["r","只看執紅"],["b","只看執黑"]].map(([k,l])=>`<button data-s="${k}" class="${libState.side===k?"on":""}">${l}</button>`).join("")}</div>
        <div class="muted">結果</div><div class="opt">${[["","全部"],["w","他贏的"],["l","他輸的"],["d","和局"]].map(([k,l])=>`<button data-r="${k}" class="${libState.res===k?"on":""}">${l}</button>`).join("")}</div>
        <div class="search" style="padding:4px 0"><input id="ps" placeholder="找棋手"></div><div class="pl-list" id="pl"></div>`;
        b.querySelectorAll("[data-s]").forEach(x=>x.onclick=()=>{libState.side=x.dataset.s;paint();filter(true)});b.querySelectorAll("[data-r]").forEach(x=>x.onclick=()=>{libState.res=x.dataset.r;paint();filter(true)});
        const list=()=>{const q=s2(b.querySelector("#ps").value.trim()),box=b.querySelector("#pl");box.innerHTML="";
          const all=[{name:"",count:data.items.length}].concat(pl).filter(p=>!q||s2(p.name).includes(q)).slice(0,120);
          for(const p of all){const x=document.createElement("button");const hb=p.name&&bios&&bios[p.name];
            x.innerHTML=`<span>${p.name?esc(p.name)+(p.revoked?" ＊":""):"全部棋手"}${p.name===libState.player?' <span class="badge">已選</span>':""}</span><span class="muted">${hb?'<span class="bio-i" role="button" tabindex="0" aria-label="生平">ⓘ</span> ':""}${p.count} 局</span>`;
            x.onclick=e=>{if(e.target.closest(".bio-i"))return bioSheet(p.name);libState.player=p.name;libState.limit=60;closeSheet();filter(true)};box.append(x)}};
        getBios().then(()=>{if(b.isConnected)list()});
        b.querySelector("#ps").oninput=list;list()};paint()})}
  // 已下載的比賽對局：可以從手機刪掉，騰出空間
  function dlSheet(){sheet("已下載的比賽對局",b=>{b.innerHTML='<p class="muted">存在這支手機裡，沒網路也能看。刪掉後要再看可以重新下載。</p><div id="dl"></div>';
    for(const g of big){const h=books.find(x=>x.key===g.key&&x.synced);if(!h)continue;const row=document.createElement("div");row.className="card";row.style.marginBottom="8px";
      row.innerHTML=`<b>${esc(g.name)}</b> <span class="muted">${h.count} 局・約 ${Math.round(g.size/1048576)} MB</span><div class="opt" style="margin:6px 0 0"><button>從手機刪除</button></div>`;
      row.querySelector("button").onclick=()=>confirmBox(`從這支手機刪除「${g.name}」？`,async()=>{await XQ.unsync(g.key);closeSheet();toast("已刪除");if(libState.c===g.key)libState.c=null;route()},"刪除");
      b.querySelector("#dl").append(row)}})}
  // 下載大型棋譜：存在手機裡，之後沒網路也能看
  function bigSheet(g){sheet("下載"+g.name,b=>{b.innerHTML=`<p>${esc(g.name)}${g.count?`：${g.count.toLocaleString()} 局`:""}，約 ${Math.round(g.size/1048576)} MB。${/^tour-/.test(g.key)?"收這幾年全國賽、各地公開賽等比賽裡，「特級大師對局」沒收的對局。":""}下載一次存在手機裡，之後沒網路也能看。建議用 Wi-Fi 下載。</p><p class="muted" id="bp"></p><button class="btn" id="bg">開始下載</button>`;
    const bt=b.querySelector("#bg"),bp=b.querySelector("#bp");bt.onclick=async()=>{bt.disabled=true;bt.textContent="下載中…";
      try{const n=await XQ.syncSite(g.key,g.name,(got,total)=>{bp.textContent=`已下載 ${(got/1048576).toFixed(1)}${total?" / "+(total/1048576).toFixed(1):""} MB`},g.h);
        bp.textContent=`✅ 完成，共 ${n} 局`;toast("下載完成");setTimeout(()=>{closeSheet();libState.c=g.key;const h="#/db/"+encodeURIComponent(g.key);if(location.hash===h)route();else location.hash=h},700)}
      catch(e){bp.textContent="⚠ "+e.message+"，請確認網路後再試";bt.disabled=false;bt.textContent="再試一次"}}})}
  if(OFF&&window.XQ&&XQ.bigBooks)XQ.bigBooks().then(x=>{big=x||[];if(grp)paintCols()});
  api("/db/books").then(bs=>{books=bs.filter(x=>x.key!=="ai"||!OFF||DEVREMOTE());
    let c=c0||libState.c||store.get("libC",null);if(!c0&&!bs.some(b=>b.key===c))c=(bs[0]||{}).key;
    if(c)load(c);else{grp="gm";paintCols();showNone()}}).catch(e=>empty("⚠","連不到電腦上的程式："+esc(e.message)));
  return{}}

// 特級大師生平：網站版放在 data/gmbios.json（約 60 KB，跟著 App 一起存）；電腦版沒有就不顯示
function XQ_BIOS(){return fetch(OFF?"data/gmbios.json":"/m/gmbios.json").then(r=>r.ok?r.json():{})}
// 離線版：把電腦上的對局集同步到手機（之後離線也能看）
const SYNCABLE=[["xuyinchuan","許銀川對局","887 局，約 1 MB"],["gmgames","特級大師對局","31,531 局，約 32 MB"]];
function syncSheet(){
  sheet("從電腦同步棋譜",async b=>{
    b.innerHTML='<p class="muted">檢查連線中…</p>';
    const ok=await XQ.ping(),have=await XQ.syncedBooks();
    b.innerHTML=`<p class="muted">${ok?"已連上電腦。同步後存在這支手機裡，沒網路也能看。":"⚠ 現在沒有連上電腦，只能管理已經同步的資料。"}</p><div id="sl"></div>`+(ok?"":'<button class="btn ghost" id="hc">怎麼連線</button>');
    const hc=b.querySelector("#hc");if(hc)hc.onclick=connectSheet;
    for(const[key,name,size]of SYNCABLE){const h=have.find(x=>x.key===key),row=document.createElement("div");row.className="card";row.style.marginBottom="8px";
      row.innerHTML=`<b>${name}</b> <span class="muted">${size}</span><div class="muted" id="st_${key}">${h?`已同步 ${h.count} 局（${h.at.slice(0,10)}）`:"還沒同步"}</div>
        <div class="opt" style="margin-bottom:0">${ok?`<button data-k="${key}" class="on">${h?"重新同步":"同步到手機"}</button>`:""}${h?`<button data-d="${key}">從手機刪除</button>`:""}</div>`;
      b.querySelector("#sl").append(row)}
    b.querySelectorAll("[data-k]").forEach(x=>x.onclick=async()=>{const k=x.dataset.k,st=b.querySelector("#st_"+k);x.disabled=true;
      try{const n=await XQ.sync(k,SYNCABLE.find(s=>s[0]===k)[1],(got,total)=>{st.textContent=`下載中 ${(got/1048576).toFixed(1)}${total?" / "+(total/1048576).toFixed(1):""} MB`});
        st.textContent=`✅ 已同步 ${n} 局`;toast("同步完成");setTimeout(()=>{closeSheet();route()},700)}catch(e){st.textContent="⚠ "+e.message;x.disabled=false}});
    b.querySelectorAll("[data-d]").forEach(x=>x.onclick=()=>confirmBox("從這支手機刪除這個資料夾？",async()=>{await XQ.unsync(x.dataset.d);closeSheet();toast("已刪除");route()},"刪除"))})}

// ================= 棋譜閱讀＋研究 =================
// 賽後：Pikafish 建議的走法寫成「建議 1. 炮二平五 2. 馬8進7 3. …（藍色箭頭）」
// 舊棋譜只存了建議的文字（例如「炮二平五」）：用規則找出是哪一步，才能畫箭頭
function bcMove(b,s,cn){try{const C=window.XQCore;if(!C)return null;const m=C.legal(b,s).find(([f,t])=>C.notate(b,f,t)===cn);return m?{f:m[0],t:m[1]}:null}catch(e){return null}}
// 每一步下面的說明：好棋說清楚「就是最佳著法」，不好的棋列出藍色箭頭的建議，還沒評等的提示怎麼補算
function gradeNote(g,b){if(!g||!g.q)return"這步還沒評等（按 📊 賽後報告，Pikafish 會補算，再顯示藍色建議箭頭）";
  if(g.q==="—")return"";if(g.q==="妙著")return"✨ 妙著：就是 Pikafish 的首選，而且是不容易找到的好棋，沒有更好的走法。";
  if(g.q==="正著")return g.loss?`✅ 正著：跟 Pikafish 的首選只差 ${g.loss} 分（30 分以內都算正著，手機上快速評等本來就會差這麼一點）。`:"✅ 正著：跟 Pikafish 的首選一樣，沒有更好的走法（所以沒有藍色箭頭）。";
  return`Pikafish：這步比最佳著法${lossAbout(g.loss)}${+g.loss<2000?`（${g.loss} 分）`:""}。`+sugText(g,b)+(/失著|敗著/.test(g.q)?"\n想知道為什麼不好？按下面 🔍 分析，看對方最好怎麼應。":"")}
/* 意見回饋 562：「實際走的」那條箭頭顏色跟著棋盤風格（T.mv），說明文字原本寫死「綠色」；改成照目前棋盤的箭頭顏色說顏色名稱 */
/* 意見回饋 607：選了朝代風格時，棋盤畫的是朝代箭頭（ERA_ARROW，例如明朝是紅色連珠），說明文字要照畫出來的那條說顏色，不是棋盤風格的 mv 色 */
function mvColorName(){try{const eR=curEra(),EA=eR&&ERA_ARROW[eR.k];let c=EA?EA.c:String((boardTheme()||{}).mv||"");if(/^var\(/.test(c))c=getComputedStyle(document.documentElement).getPropertyValue(c.slice(4,-1).split(",")[0].trim()).trim();
  const m=c.match(/^#?([0-9a-f]{6})$/i);if(!m)return"另一條";const n=parseInt(m[1],16),r=(n>>16)/255,g=((n>>8)&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(d<.12)return mx>.6?"白色":mx<.25?"黑色":"灰色";
  let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;if(h<15||h>=340)return"紅色";if(h<40)return mx<.6?"棕色":"橘色";if(h<65)return"黃色";if(h<165)return"綠色";if(h<200)return"青色";if(h<260)return"藍色";return"紫色"}catch(e){return"另一條"}}
/* 意見回饋 607（圖文不符盤查）：元朝（彩帶 #2456A6）、五代（毛筆 #23395B）的朝代箭頭也是藍色，跟 Pikafish 建議的藍色箭頭撞色。
   建議的說成「藍色直線箭頭（標 1、2、3）」；實際走的那條，選了朝代就用形狀說（矛形／毛筆／彩帶／連珠箭頭），經典（沒選朝代）才用顏色說 */
function mvArrowName(){try{const eR=curEra(),EA=eR&&ERA_ARROW[eR.k];if(EA){const n={spear:"矛形箭頭",brush:"毛筆箭頭",ribbon:"彩帶箭頭",dots:"連珠箭頭"}[EA.k];if(n)return n}}catch(e){}return mvColorName()+"箭頭"}
function sugText(g,b){const L=(g.bp&&g.bp.length?g.bp:g.bm?[g.bm]:[]).slice(0,3);if(!L.length)return g.bc?`建議 ${g.bc}（藍色直線箭頭）`:"";
  const out=[];try{const C=window.XQCore;for(const u of L){const f=sqI(u.slice(0,2)),t=sqI(u.slice(2,4));if(!b[f]||!C)break;out.push(C.notate(b,f,t));b=b.slice();b[t]=b[f];b[f]=null}}catch(e){}
  if(!out.length)return`建議 ${g.bc||""}（藍色直線箭頭）`;return(out.length>1?"建議走法（藍色直線箭頭，標 1、2、3）："+out.map((x,i)=>`${i+1}. ${x}`).join("　"):`建議 ${out[0]}（藍色直線箭頭）`)+"\n"+mvArrowName()+"是實際走的"}
function Viewer(v,c,id){
  setTabs(false);v.className="view fixed vw";
  v.innerHTML=`<div class="player vpl" id="vTop" style="padding:3px 12px"></div><div class="evline"><div id="evf"></div></div><div class="boardbox" id="bbox"></div>
    <div class="player vpl" id="vBot" style="padding:3px 12px"></div><div class="status" id="stat"></div><div class="strip" id="strip"></div><div class="strip" id="alts" style="padding-top:0"></div>
    <div class="note" id="note"></div><div class="actions" id="acts"></div>`;
  let it=null,L=new Map(),line=0,ply=0,FREE=null,sel=-1,LEGAL=null,AN=null,grades={},bookName="",vFlip=null;
  /* 意見回饋（開發者 11/6 分數審查）：我是哪一方——人機對局看「你」在哪邊；線上對局（pvp）red／black 是真名，用 pvpMySide（存檔的 mine → 戰績的 sd → 比名字）；
     其他棋譜或認不出的回 null */
  const mySide=()=>{if(!it)return null;if(c==="play")return it.black==="你"?"b":"r";if(c==="pvp")return typeof pvpMySide==="function"?pvpMySide(it,id):null;return null};
  // 紅方／黑方名字條＋翻轉（意見回饋 187）：下面是「靠近你的那一方」，翻轉後上下對調
  function players(){if(!it)return;const me=myName(),oh=c==="pvp"?oppHist().find(h=>h.rid===id):null;
    if(vFlip==null)vFlip=mySide()==="b";   /* 意見回饋（開發者 11/6 分數審查）：跟賽後報告存分數用同一個判斷 */
    const res=String(it.result||""),rw=/^紅/.test(res)&&/勝|胜/.test(res),bw=/^黑/.test(res)&&/勝|胜/.test(res),dr=/和/.test(res);
    const nm=x=>(x==="r"?it.red:it.black)||(x==="r"?"紅方":"黑方"),team=x=>x==="r"?it.redteam:it.blackteam;
    const sub=x=>[PLAYER[x],team(x)||"",(x==="r"?rw:bw)?"🏆 勝":dr&&res?"和":res&&(rw||bw)?"負":""].filter(Boolean).join("・");
    const top=vFlip?"r":"b",bot=vFlip?"b":"r";
    for(const[el,x]of[[v.querySelector("#vTop"),top],[v.querySelector("#vBot"),bot]]){const isOpp=oh&&nm(x)===oh.opp;el.innerHTML=playerHTML(x,nm(x),sub(x)+(isOpp&&isCloud(oh.oid)?"・☁ 雲遊棋客・電腦":""));   /* 開發者 11/11：看歷史棋譜時對手是電腦也標出來 */
      el.style.cursor=isOpp?"pointer":"";el.onclick=isOpp?()=>oppCard(oh.oid,oh.opp):null}}
  const bd=Board(i=>tap(i),d=>step(d));v.querySelector("#bbox").append(bd.svg);
  /* 意見回饋 316：從棋童資料打開的棋譜，返回時回到石桌往事 */
  const dbBack=c==="tmp"?"#/pos":(()=>{const r=store.get("dbReturn",null);return r&&r.c===c&&Date.now()-r.at<6*36e5?r.to:"#/db/"+encodeURIComponent(c)})();   /* 評比第 4 輪：tmp＝局面還原的暫存棋譜（m/10d-coach.js posRGo），返回局面還原 */
  setTop("載入中…",dbBack,[["ℹ",()=>info(),"棋局資訊"]]);
  const acts=actionBar(v.querySelector("#acts"),[["first","⏮","開局",()=>go(0)],["prev","◀","上一步",()=>step(-1)],["an","🔍","分析",()=>anSheet(),true],["next","▶","下一步",()=>step(1)],["last","⏭","回到最新",()=>go(1e9)]   /* 開發者 11/11 選 ChatGPT UI 報告 UI-11：停在前面的步數時，狀態列寫「回顧中・第 N／共 M 步」，按鈕改叫「回到最新」 */]);
  const seq=(lid,p)=>{const l=L.get(lid);if(!l)return[];if(p<l.start)return l.parent==null?[]:seq(l.parent,p);return(l.parent==null?[]:seq(l.parent,l.start-1)).concat(l.moves.slice(0,p-l.start+1))};
  const endPly=lid=>{const l=L.get(lid);return l.start+l.moves.length-1};
  const owner=(lid,p)=>{const l=L.get(lid);return l.parent!=null&&p<l.start?owner(l.parent,p):lid};
  const boardAt=(lid,p)=>{const b=it.board.slice();for(const m of seq(lid,p)){b[m.t]=b[m.f];b[m.f]=null}return b};
  const firstSide=()=>{const m=it.lines[0].moves[0];return m?sideOf(it.board[m.f]):it.startTurn==="b"?"b":"r"};   /* 評比第 4 輪：局面還原（沒有著法）黑先時照 startTurn */
  const moverAt=p=>(p-1)%2===0?firstSide():opp(firstSide());
  // FREE：自由走棋或推演中的變化。start＝起點局面，all＝整條著法（含 Pikafish 推演的），cur＝目前走到第幾步
  const freeAt=n=>{const b=FREE.start.board.slice();let s=FREE.start.side;for(const m of FREE.all.slice(0,n==null?FREE.cur:n)){b[m.t]=b[m.f];b[m.f]=null;s=opp(s)}return{board:b,side:s}};
  const freeLast=()=>FREE&&FREE.cur>0?FREE.all[FREE.cur-1]:null;
  const curPos=()=>FREE?freeAt():{board:boardAt(line,ply),side:ply%2===0?firstSide():opp(firstSide())};
  const posKey=p=>fenC(p.board,p.side);
  const gradeOf=p=>{const m=seq(line,p)[p-1];if(m&&m.q&&m.q!=="—")return m;return grades[owner(line,p)+"|"+p]||null};
  function alternatives(p){const key=ms=>ms.map(m=>m.f+"-"+m.t).join(","),pre=key(seq(line,p-1)),groups=new Map();
    for(const l of it.lines){if(endPly(l.id)<p)continue;const s=seq(l.id,p);if(s.length!==p||key(s.slice(0,p-1))!==pre)continue;
      const m=s[p-1],k=m.f+"-"+m.t;if(!groups.has(k))groups.set(k,{m,ids:[]});groups.get(k).ids.push(l.id)}return[...groups.values()]}
  function go(p,lid){if(FREE&&lid==null){FREE.cur=Math.max(0,Math.min(p,FREE.all.length));sel=-1;AN=null;show();return}
    FREE=null;sel=-1;if(lid!=null)line=lid;ply=Math.max(0,Math.min(p,endPly(line)));show();remember()}
  function step(d){if(!it)return;vibrate(5);if(FREE)return go(FREE.cur+d);go(ply+d)}
  function remember(){if(c==="tmp")return;const r=store.get("recent",[]).filter(x=>!(x.c===c&&x.id===id));r.unshift({c,id,title:title(),book:bookName,ply});store.set("recent",r.slice(0,10))}
  const title=()=>it?(it.red||it.black?`${it.red||"？"} 對 ${it.black||"？"}`:it.no?`${it.part?it.part+"・":""}第 ${it.no} 局 ${it.title||""}`:it.name||it.title):"";
  async function tap(i){if(!it)return;const pos=curPos(),k=posKey(pos);
    try{if(!LEGAL||LEGAL.k!==k)LEGAL={k,list:(await api("/an/legal",pos)).legal}}catch(e){return toast(e.message)}
    if(sel>=0&&LEGAL.list.some(([f,t])=>f===sel&&t===i)){const f=sel;sel=-1;return freeMove(f,i)}
    sel=LEGAL.list.some(([f])=>f===i)?i:-1;if(sel>=0)vibrate(5);show()}
  // 自己點棋子走：從目前這一步分叉（後面原本的著法拿掉）
  async function freeMove(f,t){const pos=curPos();if(!FREE)FREE={start:pos,all:[],cur:0,base:ply,src:""};
    try{const r=await api("/an/line",{...pos,moves:[iccsC(f,t)]}),m=r.moves[0];if(!m)throw new Error("這步不合法");vibrate(15);
      FREE.all=FREE.all.slice(0,FREE.cur);FREE.all.push(m);FREE.cur++;FREE.src=FREE.src&&FREE.src.startsWith("Pikafish")?FREE.src+"＋自己改走":FREE.src||"自由走棋";
      LEGAL=null;AN=null;show();gradeFree()}catch(e){toast(e.message)}}
  // 依序評等變化裡還沒評等的步
  let gfBusy=false;
  async function gradeFree(){if(gfBusy)return;gfBusy=true;
    try{for(;;){if(!FREE||screen!==self)break;const F=FREE,i=F.all.findIndex(m=>!m.g);if(i<0)break;const m=F.all[i],p=freeAt(i);
        try{m.g=await api("/an/classify",{...p,f:m.f,t:m.t})}catch(e){m.g={q:"—"}}if(FREE===F)show()}}finally{gfBusy=false}}
  // ▶ 推演：把 Pikafish 的某一條變化接在目前局面後面
  async function playLine(i){const l=AN&&AN.lines&&AN.lines[i];if(!l)return;const pos=curPos(),k=posKey(pos);
    try{let pvm=l.pvm,src=l;
      if(!pvm){const d=await api("/an/engine",{...pos,ms:1500,multipv:3,fresh:true});AN={k,...d};src=d.lines[i]||d.lines[0];pvm=src.pvm}
      const r=await api("/an/line",{...pos,moves:pvm||[]});if(!r.moves.length)throw new Error("這條變化沒有可以推演的著法");
      if(!FREE)FREE={start:pos,all:[],cur:0,base:ply,src:""};
      const keep=FREE.cur;FREE.all=FREE.all.slice(0,keep).concat(r.moves);FREE.src=`Pikafish 第 ${i+1} 條變化（${evt(src.vr)}）`;
      AN=null;sel=-1;show();if(r.moves.length<10)await extendLine(10-r.moves.length);FREE.cur=keep;show();gradeFree();toast("按 ▶ 或往左滑，一步一步看")}catch(e){toast(e.message)}}
  // 從變化的最後一步請 Pikafish 接著算，接到至少多 want 步（Pikafish 有時只回很短的變化，就多算幾次）
  async function extendLine(want){const F=FREE;let added=0;
    for(let k=0;k<Math.max(5,Math.ceil(want/3))&&added<want&&FREE===F;k++){const pos=freeAt(F.all.length);
      const d=await api("/an/engine",{...pos,ms:1500,multipv:1,fresh:true});if(d.dead||!d.lines.length)break;
      const r=await api("/an/line",{...pos,moves:d.lines[0].pvm||[]});if(!r.moves.length||FREE!==F)break;F.all=F.all.concat(r.moves);added+=r.moves.length;show()}
    return added}
  // ⏩ 繼續推演：從變化的最後一步，請 Pikafish 接著往下算（至少 10 步）
  async function contLine(){if(!FREE)return;FREE.cur=FREE.all.length;AN=null;sel=-1;show();toast("Pikafish 接著往下算…");
    try{const n=await extendLine(10);toast(n?`⏩ 多推演了 ${n} 步，按 ▶ 往下看`:"這條變化已經分出勝負了");gradeFree()}catch(e){toast(e.message)}}
  // 🤝 為什麼和棋／認輸：看最後局面的評分和子力，再讓 Pikafish 雙方接著下
  const resKind=()=>{const r=String(it.result||"");return/和/.test(r)?"d":/[红紅黑].*[胜勝]|[胜勝]/.test(r)?"w":""};
  function matText(b){const NM={r:{R:"俥",N:"傌",C:"炮",P:"兵",A:"仕",B:"相"},b:{R:"車",N:"馬",C:"砲",P:"卒",A:"士",B:"象"}},cnt={r:{},b:{}};let sc={r:0,b:0};
    for(const x of b){if(!x||/[kK]/.test(x))continue;const sd=x===x.toUpperCase()?"r":"b",u=x.toUpperCase();cnt[sd][u]=(cnt[sd][u]||0)+1;sc[sd]+={R:9,C:4.5,N:4,B:2,A:2,P:1}[u]}
    const one=sd=>["R","N","C","P","A","B"].filter(u=>cnt[sd][u]).map(u=>NM[sd][u]+(cnt[sd][u]>1?"×"+cnt[sd][u]:"")).join("、")||"只剩將帥";
    const atk=sd=>(cnt[sd].R||0)+(cnt[sd].N||0)+(cnt[sd].C||0);
    return{r:one("r"),b:one("b"),diff:sc.r-sc.b,atkR:atk("r"),atkB:atk("b")}}
  function whySheet(){const pos=curPos(),kind=resKind(),T=kind==="d"?"為什麼和棋？":"為什麼結束？";
    sheet(T,async b=>{b.innerHTML='<p class="muted">Pikafish 正在看最後這個局面…</p>';
      let d;try{d=await api("/an/engine",{...pos,ms:3000,multipv:3})}catch(e){b.innerHTML='<p>⚠ '+esc(e.message)+'</p>';return}
      if(!b.isConnected)return;const k=posKey(pos);AN={k,...d};show();
      const L=d.lines||[],ev=L[0]?L[0].vr:0,a=Math.abs(ev),who=ev>0?"紅方":"黑方",m=matText(pos.board);
      const spread=L.length>1?Math.max(...L.map(l=>Math.abs(l.vr))):a;
      const why=[];
      /* 意見回饋 284：先看棋局是怎麼結束的（超時、斷線、離開、認輸…），再用當時局面補充，不要硬說成認輸 */
      const R=String(it.result||""),wS=/^紅/.test(R)?"紅方":/^黑/.test(R)?"黑方":null,lS=wS==="紅方"?"黑方":wS==="黑方"?"紅方":null,rs=(R.match(/（(.*)）/)||[])[1]||"";
      /* 開發者 11/11 截圖（夢入神機第 1 局，紅傌已將死黑將，卻寫「Pikafish 評分均勢，可能看錯才認輸」）：殺棋局面輪到的一方沒有著法，引擎回不出分數就被當成 0＝均勢。
         先用規則判斷最後局面：輪到的一方沒有合法著＝已經分出勝負（被將軍＝將死，沒被將軍＝困斃，象棋無子可動也算輸），直接這樣寫，也不再提「讓 Pikafish 接著下」 */
      let term="";try{const XC=window.XQCore,sd=pos.side;if(XC&&sd&&!XC.legal(pos.board,sd).length)term=XC.inCheck(pos.board,sd)?"mate":"stuck"}catch(e){}
      const tLose=pos.side==="r"?"紅方":"黑方",tWin=pos.side==="r"?"黑方":"紅方";
      const evNote=cz=>a>=20000?`當時 Pikafish 算出${who}已經有殺棋。`:a<80?`當時局面還算平衡（${Math.abs(ev)<30?"均勢":evt(ev,1)}），勝負是規則決定的，不是棋下輸了。`:who===wS?`當時局面 Pikafish 也認為${wS}較好（${evt(ev,1)}）。`:`其實當時 Pikafish 認為${lS}還佔上風（${evt(ev,1)}），可惜${cz}，還是算輸。`;
      if(term)why.push(term==="mate"?`${tLose}已經被將死：${tWin}正在將軍，${tLose}不管怎麼走都躲不掉，所以${tWin}勝。`:`${tLose}已經無路可走（困斃）：雖然沒有被將軍，但每一步都走不了；照象棋規則，無子可動就算輸，所以${tWin}勝。`);
      else if(kind!=="d"&&wS&&/超時|時間用完|沒走/.test(rs)){why.push(`${lS}${/時間用完/.test(rs)?"的總時間用完了":"超過 3 分鐘沒有走下一步"}（可能是想太久、斷線或離開了 App），依照比賽規則判${lS}負、${wS}勝。`);why.push(evNote("沒在時間內走棋"))}
      else if(kind!=="d"&&wS&&/離開|斷線|離線/.test(rs)){why.push(`${lS}在對局中離開了（關掉對局畫面、離開 App 或斷線太久），依照規則算${lS}輸。`);why.push(evNote("中途離開"))}
      else if(/中止|取消/.test(R)){why.push("這盤在雙方還沒分出勝負前就中止了（例如對方離線太久），不計勝負、也不計分。")}
      else if(a>=20000)why.push(`Pikafish 算出 ${who}已經有殺棋，所以另一方認輸。`);
      else if(kind==="d"){
        if(a<40)why.push(`Pikafish 的評分幾乎是 0（${evt(ev)}）：局面平衡${L.length>1&&spread<60?"，連 Pikafish 想到的前幾種走法也都差不多":""}，誰都找不到能贏的突破點。`);
        else if(a<150)why.push(`Pikafish 認為${who}稍好（${evt(ev,1)}），但優勢不到 1.5 個兵。高手防守很穩，這點優勢通常贏不下來，硬攻反而可能出錯。`);
        else why.push(`Pikafish 認為${who}明顯較好（${evt(ev,1)}）。這盤選擇和棋可能另有原因，例如比賽名次（和棋就夠出線）、時間不夠，或${who}自己沒看出贏法。`);
        if(!m.atkR&&!m.atkB)why.push("雙方都沒有車、馬、炮可以進攻，剩下的子力殺不了對方的將帥。");
        else if(Math.abs(m.diff)<1.5)why.push("雙方子力幾乎一樣多，沒有誰多出能決勝的子。");
        if(pos.board.filter(Boolean).length<=12)why.push("棋盤上的子已經不多，進入殘局後很多組合在理論上就是和棋。")}
      else if(a<150)why.push(`Pikafish 評分 ${evt(ev)}，局面其實還沒分出明顯優劣；可能是時間不夠、或輸的一方看錯了才認輸。`);
      else if(wS&&who!==wS)why.push(`Pikafish 其實認為${who}佔優（${evt(ev,1)}），結果卻是${wS}勝；可能是${who}看錯局面、時間不夠而認輸。`);
      else why.push(`Pikafish 認為${who}大優（${evt(ev,1)}），${lS||"另一方"}再下去也很難守住，所以提早認輸。`);
      b.innerHTML=`<div class="card" style="margin-bottom:10px"><div class="muted">最後局面（第 ${ply} 步後）・比賽結果：${esc(it.result||"")}</div>
        <div style="margin-top:6px"><span class="rn">紅方</span>：${esc(m.r)}<br>黑方：${esc(m.b)}</div></div>
        ${why.map(t=>`<p style="line-height:1.7;margin:0 0 8px">${esc(t)}</p>`).join("")}
        ${term?"":`<p class="muted" style="font-size:13px">想親眼看：讓 Pikafish 幫雙方接著下，看局面會不會有變化。</p>
        <button class="btn" id="wgo">▶ 讓 Pikafish 雙方接著下 30 步</button>`}`;
      if(b.querySelector("#wgo"))b.querySelector("#wgo").onclick=async()=>{const bt=b.querySelector("#wgo");bt.disabled=true;bt.textContent="Pikafish 推演中…（約 20 秒）";
        try{FREE={start:pos,all:[],cur:0,base:ply,src:"Pikafish 雙方接著下"};AN=null;sel=-1;
          await extendLine(30);if(!FREE)return;FREE.all=FREE.all.slice(0,30);const n=FREE.all.length;FREE.cur=0;closeSheet();show();gradeFree();
          let tail="";try{const e2=await api("/an/engine",{...freeAt(FREE.all.length),ms:1500,multipv:1});const v2=e2.lines&&e2.lines[0]?e2.lines[0].vr:null;
            if(v2!=null)tail=`，最後評分「${evt(v2)}」${kind==="d"?Math.abs(v2)<80?"，還是和棋的局面":Math.abs(v2)<150?"，只有小優，多半還是和棋":"":""}`}catch(e){}
          toast(n?`推演了 ${n} 步${tail}。按 ▶ 一步一步看`:"這個局面已經分出勝負，沒有可以再走的")}
        catch(e){toast(e.message);bt.disabled=false;bt.textContent="▶ 再試一次"}}})}
  // 💾 存成棋譜
  function saveLine(){if(!FREE||!FREE.all.length)return;
    const def=`${title()} 第${FREE.base}步後：${FREE.src||"自由走棋"}`.slice(0,80);
    sheet("存成棋譜",b=>{b.innerHTML=`<p class="muted">存到「我的研究」資料夾，之後可以重看、評等。</p><div class="field"><label>名稱</label><input id="sn" maxlength="80"></div><button class="btn" id="sv">儲存</button>`;
      b.querySelector("#sn").value=def;
      b.querySelector("#sv").onclick=async()=>{const comments={"0_0":`來源：${title()}，第 ${FREE.base} 步之後的局面。`+(FREE.src?"\n"+FREE.src:"")};
        FREE.all.forEach((m,i)=>{const t=[m.tags&&m.tags.length?m.tags.join("、"):"",m.g&&m.g.q&&m.g.q!=="—"?m.g.q+(m.g.ev!=null?"；走完後"+evt(m.g.ev):""):""].filter(Boolean).join("；");if(t)comments["0_"+(i+1)]=t});
        try{await api("/an/study-save",{board:FREE.start.board,side:FREE.start.side,moves:FREE.all.map(m=>[m.f,m.t]),title:b.querySelector("#sn").value,src:FREE.src,comments});
          closeSheet();toast("💾 已存到「我的研究」")}catch(e){toast(e.message)}}})}
  let vwPly=null,vwLine=null;const maxPly=lid=>{const l=L.get(lid);return l?l.start+l.moves.length-1:0};
  /* ChatGPT 改善單 T01（開發者 11/11 核准）：「看懂這盤最關鍵的一步」的關鍵步模式。store mflKey 指的是這一盤（08b-cpugame.js 結算視窗寫的），主線停在那一步之前（ply＝K.ply−1）時：
     棋盤畫你實際走的（上一步那種箭頭）和 Pikafish 建議的（藍色直線箭頭，只畫第一步）；狀態列寫「最關鍵的一步」；評註＝賽後報告那一步的評語（gameReport 的 talk，沒有就照評等）＋一句白話為什麼（05-settings mflWhy）；
     下面一排「↻ 從這步重下」（rpRetry：同一個難度、練習模式、不算段位；練會了錯棋重練那邊也打勾）、「🧠 練一題「棋理」」（G01，mflDemo）。往前、往後走開就是一般的檢討畫面，走回這一步又出現 */
  const MK=(()=>{const k=store.get("mflKey",null);return k&&k.c===c&&k.id===id&&k.ply>0?k:null})();
  let mkC=null;
  const mkOn=()=>!!(MK&&!FREE&&it&&line===0&&ply===MK.ply-1&&endPly(0)>=MK.ply);
  function mkData(){const p=MK.ply,m=seq(0,p)[p-1];if(!m)return null;const g=gradeOf(p)||{q:MK.q,loss:MK.loss,bc:MK.bc,bm:MK.bm,rr:MK.rr,bmt:MK.bmt},q=qNow(g)||g.q||"",key=p+"|"+q+"|"+g.loss+"|"+(g.rr?g.rr.m:"");
    if(mkC&&mkC.key===key)return mkC;const b0=boardAt(0,p-1),side=moverAt(p),W=mflWhy(b0,side,m,g);let best=null,bcn="",tk="";
    /* ChatGPT 評審 11/11（失著的具體後果）：失著、敗著再加一句「這手讓對方下一手可以吃你的車（車8進3）」——只在分析線（g.rr）有吃子／將軍／殺棋時才有（05-settings mflRisk）；
       已經說了「將死」，mflWhy 那句「走完這步，對方就有一套連續將軍的殺法」就不重複 */
    const rk=(q==="失著"||q==="敗著")&&typeof mflRisk==="function"?mflRisk(b0,side,m,g):"";if(rk&&/將死/.test(rk)&&W.tag==="殺棋"&&!/已經有殺棋/.test(W.say||""))W.say="";
    try{best=g.bm&&/^[a-i]\d[a-i]\d$/.test(g.bm)?{f:sqI(g.bm.slice(0,2)),t:sqI(g.bm.slice(2,4))}:g.bc?bcMove(b0,side,g.bc):null;if(best&&(!b0[best.f]||(best.f===m.f&&best.t===m.t)))best=null;if(best)bcn=XQCore.notate(b0,best.f,best.t)}catch(e){best=null}
    try{const mv=seq(0,endPly(0)).map((x,i)=>{const r=gradeOf(i+1)||{};return{f:x.f,t:x.t,cn:x.cn,by:moverAt(i+1),q:r.q,loss:r.loss,ev:r.ev,bv:r.bv,bmt:r.bmt,pmt:r.pmt,bc:r.bc,bm:r.bm,bp:r.bp,ck:x.ck}}),
      R=gameReport(it.board,mv).sides[side],t=R&&R.talk.find(x=>x.ply===p&&x.bad);if(t)tk=String(t.x).replace(/^第 \d+ 回合 [^：]*：/,"")}catch(e){}
    return mkC={key,p,m,g,q,b0,side,best,bcn,tk,rk,why:W.gen?"":W.say,tag:W.tag||(typeof weakTheme==="function"?weakTheme():"將軍")}}
  /* 評比循環第 1 輪（Gemini、ChatGPT 都列第一；AI 模擬玩家第二輪問題 3）：以前同一段先說「『失著』＝走錯了，局面明顯變差」又說「走完之後紅方稍好」，
     而且「少了幾個兵」講了三次（評語、Pikafish 評語、💡）。改成：
     ① 主句一次講完兩件事——這步跟最好的走法比少了多少（評等）；走完整盤誰好（局面句，evLink 接「不過…還是…」）；
     ② 評等字的定義用固定區間（tmxPlain 不帶 loss），標明「只跟最好的走法比，不是整盤誰好」；
     ③ 賽後講解裡錯過殺棋、錯失明顯優勢這種特別的評語才另外引用；💡 只放規則看得出來的原因（mflWhy 的通用句 gen 不再重複）；
     ④ 最後補一句「幾個兵」不是棋子數。兵數一律 pawnAbout（00-util.js），跟著法條泡泡同一個數字 */
  function mkNote(K){const L=+K.g.loss||0,lk=typeof evLink==="function"?evLink(K.g.ev,K.side):"",big=!isFinite(L)||L>=2000,
      head=(big?`這步比 Pikafish ${K.bcn?`建議的「${K.bcn}」`:"的首選"}差很多`:`這步比 Pikafish ${K.bcn?`建議的「${K.bcn}」`:"的首選"}少了${pawnAbout(L)}的價值`)+(K.q?`（${K.q}）`:"")+(lk?`；${lk}`:"")+"。",
      sp=K.tk&&/^這時(已經有殺棋|原本有明顯優勢)/.test(K.tk)?"Pikafish 評語："+K.tk:"";
    return[`🔎 這盤最關鍵的一步：第 ${K.p} 步你走「${K.m.cn}」${K.q?`【${K.q}】`:""}`,
      head,
      K.q&&typeof tmxPlain==="function"?tmxPlain(K.q).replace(/。$/,"（只跟最好的走法比，不是整盤誰好）。"):"",
      sp,
      K.best?`藍色直線箭頭＝Pikafish 建議的走法；${mvArrowName()}＝你實際走的。`:"",
      K.rk?"⚠ "+K.rk:"",   /* ChatGPT 評審 11/11：失著的具體後果（只在分析線支持時） */
      K.why||!K.rk?"💡 "+(K.why||"想知道為什麼不好？按下面 🔍 分析，看對方最好怎麼應。"):"",
      L>=30&&!big&&typeof TMX_PW==="string"?TMX_PW:"",
      "按 ▶ 看你走完以後的局面；想換一步試試，按「↻ 從這步重下」。"].filter(Boolean).join("\n")}
  function mkRetry(){const end=endPly(0),ms=mySide(),opp=ms==="r"?it.black:it.red,
      moves=seq(0,end).map((x,i)=>{const g=gradeOf(i+1)||{};return{f:x.f,t:x.t,cn:x.cn,by:moverAt(i+1),q:qNow(g)||g.q,loss:g.loss,ev:g.ev,bc:g.bc,bm:g.bm,bp:g.bp}}),
      lx=MK.lx||(c==="play"&&typeof tlOppLv==="function"?tlOppLv(opp):null)||16;
    rpRetry({c,id,side:ms,opp,moves,lx,t01:{back:location.hash,lx,tag:mkC?mkC.tag:null,ply:MK.ply}},MK.ply)}
  function show(){if(!it)return;const s=seq(line,ply),pos=curPos();
    const KM=mkOn()?mkData():null;   /* T01 關鍵步模式（上面 mkOn） */
    const last=KM?{f:KM.m.f,t:KM.m.t}:FREE?freeLast():s[s.length-1];
    const hint=AN&&AN.k===posKey(pos)&&AN.lines&&AN.lines[0]?[sqI(AN.lines[0].mv.slice(0,2)),sqI(AN.lines[0].mv.slice(2,4))]:null;
    // 棋譜也有將軍／吃子／開局動畫和音效，小人也會反應（意見回饋 166）：只在「往前一步」時觸發，跳步或倒退不放
    const ckSq=FREE?(last&&last.ck?pos.board.indexOf(pos.side==="r"?"K":"k"):-1):(window.XQCore&&XQCore.inCheck&&XQCore.inCheck(pos.board,pos.side)?pos.board.indexOf(pos.side==="r"?"K":"k"):-1);
    const stepFwd=!FREE&&vwPly!=null&&ply===vwPly+1&&vwLine===line;vwPly=ply;vwLine=line;
    if(stepFwd&&s.length&&s.every(m=>m&&m.cn)){const cue=openingCue(s);if(cue)setTimeout(()=>openFx(bd.svg,cue[1],cue[0]),350)}
    if(stepFwd&&typeof BOT!=="undefined"&&BOT&&ply===maxPly(line)&&ply>10)setTimeout(()=>{BOT.act("clap");BOT.say("精彩的一盤！",2.4,{auto:1})},900);
    // 這步不是好棋：把 Pikafish 建議的走法（最多 3 步）畫成藍色箭頭
    let sugg=null;if(KM)sugg=KM.best?[KM.best]:null;   /* T01 關鍵步模式：只畫 Pikafish 建議的第一步 */
    else if(!FREE&&ply>0){   // 開著 🔍 分析（橘色虛線框）時也要畫建議箭頭
      const g=gradeOf(ply);if(g&&g.q&&!["正著","妙著","—"].includes(g.q)&&(g.bp&&g.bp.length||g.bm))
      sugg=(g.bp&&g.bp.length?g.bp:[g.bm]).slice(0,3).map(u=>({f:sqI(u.slice(0,2)),t:sqI(u.slice(2,4))}))
      else if(g&&g.bc&&g.q&&!["正著","妙著","—"].includes(g.q)){const m=bcMove(boardAt(line,ply-1),moverAt(ply),g.bc);if(m)sugg=[m]}}
    players();bd.draw(pos.board,{flip:!!vFlip,last,sel,targets:sel>=0&&LEGAL?LEGAL.list.filter(([f])=>f===sel).map(x=>x[1]):[],hint,check:ckSq,sugg,fx:stepFwd||!!FREE,forceArrow:!!(sugg&&sugg.length)||!!KM});   /* 意見回饋 607：有建議箭頭時，實際走的那條一定畫（說明寫了「…是實際走的」，設定裡關掉走棋箭頭也要畫） */
    // 優勢條：分析結果優先，其次是上一步的評等
    let ev=AN&&AN.k===posKey(pos)&&AN.lines&&AN.lines[0]?AN.lines[0].vr:null;
    if(ev==null){const g=FREE?(last&&last.g):ply>0&&gradeOf(ply);if(g&&g.ev!=null)ev=g.ev}
    v.querySelector("#evf").style.width=evPct(ev)+"%";
    const st=v.querySelector("#stat");st.classList.toggle("hot",!!FREE);
    if(FREE)st.textContent=`🔭 ${FREE.src||"自由走棋"}・${FREE.cur}／${FREE.all.length}`+(ev!=null?"・"+evt(ev):"");
    else if(KM){st.classList.add("hot");st.textContent=`🔎 最關鍵的一步・第 ${KM.p} 步之前，輪到${PLAYER[KM.side]}走`}   /* T01 關鍵步模式 */
    else{const g=ply>0&&gradeOf(ply);st.textContent=ply===0?"開局局面・左右滑棋盤可換步":`${ply<maxPly(line)?"📖 回顧中・":""}第 ${ply}／${maxPly(line)} 步 ${s[ply-1].cn}`+(g?`【${g.q}】`:"")+(ev!=null?"・"+(g&&g.q?"走完後":"")+evt(ev):"")}   /* 評比循環第 1 輪：評等字後面的局面句加「走完後」，看得出評等（這步跟最好的比）和局面（走完整盤誰好）是兩件事 */
    const moves=FREE?FREE.all.map(m=>({...m,q:m.g&&m.g.q,loss:m.g&&m.g.loss,ev:m.g&&m.g.ev})):seq(line,endPly(line)).map((m,i)=>{const g=gradeOf(i+1);return{...m,by:moverAt(i+1),q:g&&g.q,loss:g&&g.loss,ev:g&&g.ev,rr:g&&g.rr,bmt:g&&g.bmt}});   /* ev：評等字泡泡接「走完整盤誰好」（01-board tmxPlain） */   /* rr、bmt：評等字泡泡講失著的具體後果（01-board tmx） */   /* 11/11 v6 第 3 點：帶 loss，點評等字時能說「少了約幾個兵」 */
    renderStrip(v.querySelector("#strip"),moves,FREE?FREE.cur-1:ply-1,FREE?i=>go(i+1):i=>go(i+1));
    // 變著；推演中則改放推演用的按鈕
    const ab=v.querySelector("#alts");ab.innerHTML="";
    /* T01 關鍵步模式：「↻ 從這步重下」（標準開局擺起、是自己那一方才有，跟賽後報告的 retry 同一個條件）、「🧠 練一題「棋理」」（G01） */
    if(KM){const mk=(t,fn,main)=>{const b=document.createElement("button");b.className="chip";b.style.cssText="font-family:var(--sans);font-weight:800"+(main?";border-color:var(--accent);color:var(--accent)":"");b.textContent=t;b.onclick=()=>{vibrate(5);fn()};ab.append(b)};
      if((c==="play"||c==="pvp")&&isStdStart(it.board)&&mySide()===KM.side)mk("↻ 從這步重下",mkRetry,true);
      mk("🧠 練一題「"+KM.tag+"」",()=>mflDemo(KM.tag,location.hash))}
    if(FREE){for(const[t,fn]of[["⏩ 繼續推演",contLine],["💾 存成棋譜",saveLine],["✕ 回到棋譜",()=>{FREE=null;AN=null;sel=-1;show()}]]){const b=document.createElement("button");b.className="chip";b.style.fontFamily="var(--sans)";b.textContent=t;b.onclick=()=>{vibrate(5);fn()};ab.append(b)}}
    if(!FREE){const alts=alternatives(ply+1);if(alts.length>1){const lb=document.createElement("span");lb.className="muted";lb.style.cssText="flex:none;align-self:center;font-size:12px";lb.textContent="下一步變著：";ab.append(lb);
      for(const g of alts){const mine=g.ids.includes(line),b=document.createElement("button");b.className="chip var"+(mine?" on":"");b.textContent=g.m.cn;b.onclick=()=>go(ply+1,mine?line:g.ids[0]);ab.append(b)}}}
    if(!FREE&&ply>0&&ply===endPly(line)&&resKind()){const b=document.createElement("button");b.className="chip";b.style.fontFamily="var(--sans)";
      b.textContent=resKind()==="d"?"🤝 為什麼和棋？":"🏳 為什麼結束？";b.onclick=()=>{vibrate(5);whySheet()};ab.append(b)}
    ab.hidden=!ab.children.length;
    // 評註
    const note=v.querySelector("#note");
    if(FREE){const m=last,g=m&&m.g;
      note.textContent=!m?`起點局面（第 ${FREE.base} 步之後）。按 ▶ 或往左滑，一步一步看${FREE.src&&FREE.src.startsWith("Pikafish")?" Pikafish 怎麼預判、在哪裡埋伏":""}；點棋子可以自己改走。`
        :`${FREE.base+FREE.cur}. ${PLAYER[m.by]} ${m.cn}`+(m.tags&&m.tags.length?`【${m.tags.join("、")}】`:"")+(g&&g.q&&g.q!=="—"?`　${g.q}`:"")
         +(g&&g.q&&g.q!=="正著"&&g.q!=="妙著"&&g.bc?`\nPikafish 認為更好的是：${g.bc}`:"")}
    else if(KM)note.textContent=mkNote(KM)+pendLine();   /* T01 關鍵步模式 */
    else{const ck=owner(line,ply)+"_"+ply,g=ply>0&&gradeOf(ply),
        rk=g&&(g.q==="失著"||g.q==="敗著")&&typeof mflRisk==="function"?mflRisk(boardAt(line,ply-1),moverAt(ply),s[ply-1],g):"";   /* ChatGPT 評審 11/11：失著的具體後果（只在分析線支持時） */
      note.textContent=([ply===0?(it.comments["0_0"]||it.note||""):it.comments[ck]||"",ply>0?gradeNote(g,boardAt(line,ply-1)):"",rk?"⚠ "+rk:""].filter(Boolean).join("\n")||(ply===0?"點棋子可以自由走棋；按 🔍 看 Pikafish 分析。":""))+pendLine()}
    if(FREE){acts.first.disabled=acts.prev.disabled=FREE.cur===0;acts.next.disabled=acts.last.disabled=FREE.cur>=FREE.all.length}
    else{acts.first.disabled=acts.prev.disabled=ply===0;acts.next.disabled=acts.last.disabled=ply>=endPly(line)}
    if(!(AN&&AN.k===posKey(pos)))lookupSoon()}
  let lt=null;function lookupSoon(){clearTimeout(lt);lt=setTimeout(async()=>{const pos=curPos(),k=posKey(pos);try{const d=await api("/an/lookup",{engine:[k]});const e=Object.values(d.engine)[0];if(e&&posKey(curPos())===k){AN={k,...e,cached:true};show()}}catch(e){}},150)}
  /* ChatGPT 評審 11/11（未評完的狀態）：人機、真人對局打開時，我方主線還沒評的步（含缺 PV 等重評的）在背景補評；說明最後一行寫「📈 還有 N 步在分析」，評好一步更新一次，
     不寫成正著、也不留白。評好的寫回存檔（local.js /db/grades），下次打開、對局紀錄清單就不再缺。線上對局一步都沒評過的照舊不自動評（不顯示） */
  let PF=null;
  const g0=(ms,p)=>{const m=ms[p-1];return m&&m.q?m:grades["0|"+p]||null};   /* 主線第 p 步評過了沒（gradeOf 看的是目前這條線，看變著時會不一樣；「—」＝評過、終局沒有評等，不算還在分析） */
  const pendN=()=>{const sd=mySide();if(!it||!sd||!L.get(0))return 0;const ms=seq(0,endPly(0));let n=0;for(let p=1;p<=ms.length;p++)if(moverAt(p)===sd&&!g0(ms,p))n++;return n};
  function pendLine(){if(!PF||FREE)return"";const n=pendN();if(!n)return"";return PF.run?`\n📈 這盤你還有 ${n} 步在分析，好了會自動更新`:`\n📈 這盤你還有 ${n} 步還沒分析完，下次打開會再分析`}
  async function pendFill(){const sd=mySide();if(PF||!it||!sd||(c!=="play"&&c!=="pvp")||!L.get(0))return;const end=endPly(0),ms=seq(0,end);
    if(c==="pvp"&&!ms.some((m,i)=>g0(ms,i+1)))return;if(!pendN())return;PF={run:true};const G={};let fail=0;show();
    try{for(let p=1;p<=end;p++){if(screen!==self||!it)return;if(moverAt(p)!==sd||g0(ms,p))continue;const m=ms[p-1];let g=null;
      try{g=await api("/an/classify",{board:boardAt(0,p-1),side:sd,f:m.f,t:m.t});fail=0}catch(e){if(++fail>=3)break;continue}   /* 缺 PV（e.retry）先跳過；連續 3 次失敗（引擎沒載好）就先停 */
      if(g&&g.q){grades["0|"+p]=g;G[p]={f:m.f,t:m.t,...g};if(screen===self)show()}}}
    finally{PF.run=false;if(screen===self&&it)show();if(Object.keys(G).length)api("/db/grades",{c,id,g:G}).catch(()=>{})}}
  async function loadGrades(){const want=new Map();
    for(const l of it.lines){let b=boardAt(l.id,l.start-1);l.moves.forEach((m,i)=>{const p=l.start+i;want.set(fenC(b,moverAt(p))+"|"+iccsC(m.f,m.t),l.id+"|"+p);b=b.slice();b[m.t]=b[m.f];b[m.f]=null})}
    if(!want.size)return;try{const d=await api("/an/lookup",{grade:[...want.keys()].slice(0,5000)});for(const[k,g]of Object.entries(d.grade))grades[want.get(k)]=g;show()}catch(e){}}
  function anSheet(){const pos=curPos(),k=posKey(pos);
    sheet("Pikafish 分析",b=>{
      const paint=()=>{const a=AN&&AN.k===k?AN:null;
        b.innerHTML=a?(a.dead?`<p>${PLAYER[pos.side]}沒有合法著法（被將死或困斃）。</p>`:`${a.cached?'<p class="muted">📁 之前存的分析，不用重算</p>':""}<div class="anl">${a.lines.map((l,i)=>`<div class="ln"><b>${i+1}. ${esc(l.cn)}</b>　<span class="pill">${evt(l.vr)}</span><div class="pv">${esc(l.pv.join(" "))}</div><div class="muted" style="font-size:11px">往後算 ${l.depth||"?"} 步（約 ${Math.round((l.depth||0)/2)} 回合）</div><button class="pill" data-play="${i}" style="margin-top:6px;border-color:var(--accent);color:var(--accent);font-weight:700;padding:5px 12px">▶ 推演這條變化（${l.pv.length} 步）</button></div>`).join("")}</div>`)
          :'<p class="muted" style="text-align:center;padding:20px">Pikafish 思考中…（約 1.5 秒）</p>';
        b.insertAdjacentHTML("beforeend",`<div class="opt" style="margin-top:12px"><button id="re">🔄 重新分析</button><button id="gr">📊 評等這條著法</button></div>
          <div class="opt"><button id="ec">💬 請 Claude 講解</button><button id="eg">💬 請 GPT 講解</button></div><div id="llm" style="white-space:pre-wrap;font-size:14px"></div>
          <p class="muted" style="font-size:12px">分數是紅方視角，1.0 約等於一個兵。講解會用到你的 Claude 或 ChatGPT 額度，分析和評等不會。</p>`);
        b.querySelectorAll("[data-play]").forEach(x=>x.onclick=()=>{closeSheet();playLine(+x.dataset.play)});
        b.querySelector("#re").onclick=()=>run(true);b.querySelector("#gr").onclick=()=>{closeSheet();gradeLine()};
        b.querySelector("#ec").onclick=()=>explain("claude");b.querySelector("#eg").onclick=()=>explain("gpt")};
      const run=async fresh=>{if(fresh)AN=null;paint();try{const d=await api("/an/engine",{...pos,ms:1500,multipv:3,fresh:!!fresh});AN={k,...d};show();if($("#sheet"))paint()}catch(e){toast(e.message)}};
      const explain=async who=>{const box=b.querySelector("#llm");box.textContent=(who==="gpt"?"GPT":"Claude")+" 講解中…（大約半分鐘到幾分鐘）";
        const hist=(FREE?seq(line,FREE.base).map(m=>m.cn).concat(FREE.all.slice(0,FREE.cur).map(m=>m.cn)):seq(line,ply).map(m=>m.cn)).join(" ");
        try{const d=await api("/an/explain",{...pos,who,lines:(AN&&AN.lines)||[],history:hist});box.textContent=d.text}catch(e){box.textContent="⚠ "+e.message}};
      if(AN&&AN.k===k)paint();else run(false)})}
  async function gradeLine(){const end=endPly(line);toast("開始評等，每步約 0.6 秒");
    for(let p=1;p<=end;p++){if(screen!==self||!it)return;if(gradeOf(p))continue;const m=seq(line,p)[p-1];
      try{grades[owner(line,p)+"|"+p]=await api("/an/classify",{board:boardAt(line,p-1),side:moverAt(p),f:m.f,t:m.t});show()}catch(e){toast(e.message);return}}
    toast("評等完成")}
  // 📊 賽後報告：主線每步都要評等過；還沒評等的先請 Pikafish 補算
  let rpBusy=false,rpNew=0;   /* 開發者 11/11 選規劃書方案 03：rpNew＝這次剛請 Pikafish 評的手數（0＝整份讀之前存的） */
  async function report(direct){if(!it||rpBusy)return;FREE=null;const end=endPly(line);
    const miss=[];for(let p=1;p<=end;p++)if(!gradeOf(p))miss.push(p);
    // 還沒評等完：在背景評，下面一條進度列，評等時照樣可以看棋、上一步下一步；評好了進度列變成「看報告」
    if(miss.length){if(rpBusy)return toast("賽後報告還在評等，好了會通知你");rpBusy=true;
      document.querySelectorAll(".rp-bar").forEach(x=>x.remove());
      const bar=document.createElement("div");bar.className="rp-bar";
      bar.innerHTML=`<span><em>📊 評等中 <b class="rpn">0</b>/${miss.length}${end>miss.length?`・另外 ${end-miss.length} 手讀之前存的，不用重算`:""}</em></span><button class="pill" aria-label="取消評等">✕</button>`;toast("📊 Pikafish 在背景評等，可以先看棋，評好會通知你");document.body.append(bar);
      /* 意見回饋 337：換到別的頁面也繼續評（評好的存在手機裡），不用回來再按一次；評好了點「看報告」會帶你回這盤 */
      const home=location.hash;let stop=false,done=false;bar.querySelector("button").onclick=()=>{stop=true;bar.remove()};
      try{for(let k=0;k<miss.length;k++){if(stop||!it)return;const p=miss[k],m=seq(line,p)[p-1];
        grades[owner(line,p)+"|"+p]=(await api("/an/classify",{board:boardAt(line,p-1),side:moverAt(p),f:m.f,t:m.t}))||{q:"—"};
        const n=bar.querySelector(".rpn");if(n)n.textContent=k+1;if(screen===self&&!FREE&&k%4===3)show()}
        done=true;rpNew=miss.length}
      catch(e){toast(e.message);return}finally{rpBusy=false;if(!done)bar.remove()}
      if(!it){bar.remove();return}
      const here=screen===self;if(here&&direct){bar.remove();return report()}if(here)show();vibrate([20,40,20]);
      bar.classList.add("done");bar.innerHTML=`<span>📊 評好了</span><button class="pill go">看報告 ›</button>`;
      bar.querySelector(".go").onclick=()=>{bar.remove();if(screen===self)report();else{store.set("openReport",c+"/"+id);location.hash=home}};setTimeout(()=>bar.remove(),here?20000:60000);return}
    const moves=seq(line,end).map((m,i)=>{const g=gradeOf(i+1)||{};return{f:m.f,t:m.t,cn:m.cn,by:moverAt(i+1),q:g.q,loss:g.loss,ev:g.ev,bc:g.bc,bm:g.bm,bp:g.bp,ck:m.ck}});
    /* 意見回饋（開發者 11/6 分數審查）：原本 side=it.black==="你"?"b":"r"，線上對局執黑時 reports 會存成對手（紅方）的分數。
       改用 mySide()；認不出是哪一方（例如改過名字的舊 pvp 存檔）就不存 reports。存的時候多記 side，讀的人才分得出新舊資料 */
    const rep=gameReport(it.board,moves),names={r:it.red||"紅方",b:it.black||"黑方"},ms=mySide(),side=ms||"r";
    if((c==="play"||c==="pvp")&&ms&&rep.sides[ms]&&rep.sides[ms].score!=null){const all=store.get("reports",{}),R=rep.sides[ms];
      all[id]={score:R.score,grade:R.grade[0],side:ms,ph:{open:R.phases.open&&R.phases.open.score,mid:R.phases.mid&&R.phases.mid.score,end:R.phases.end&&R.phases.end.score},at:Date.now()};store.set("reports",all)}
    const nNew=rpNew;rpNew=0;
    reportSheet(rep,{title:"賽後報告",side,names,goto:p=>go(p),retry:ms&&(c==="play"||c==="pvp")&&isStdStart(it.board)?{side:ms,go:p=>rpRetry({c,id,side:ms,opp:ms==="r"?it.black:it.red,moves},p)}:null,note:nNew?`🆕 剛請電腦分析（Pikafish）評了 ${nNew} 手${end>nNew?`；其餘 ${end-nNew} 手讀之前存的`:""}，結果已存在手機裡，下次打開不用重算。`:`📁 這份報告讀的是之前存在手機裡的評等，不用重算。`})}   /* hspx 11/10「不要換行」：標題只寫賽後報告，雙方名字本來就在下面的名牌上 */
  function info(){if(!it)return;sheet(title(),b=>{
    b.innerHTML=[it.red||it.black?`<p><span style="color:var(--red);font-weight:700">紅方 ${esc(oppTw(it.red||"？"))}</span>　對　<b>黑方 ${esc(oppTw(it.black||"？"))}</b></p>`:"",
      it.event?`<p class="muted">${esc(it.event)}${it.date?"　"+esc(it.date):""}</p>`:"",it.result?`<p>結果：${esc(it.result)}</p>`:"",it.nnote&&typeof nsgNoteHtml==="function"?nsgNoteHtml(it.nnote):"",it.open?`<p>開局：${esc(it.open.replace(/^[A-E]\d\d\s*/,""))}</p>`:"",
      `<p class="muted">${esc(bookName)}</p>`,
      it.lessons?`<div class="sec-t" style="margin-left:0">賽後心得</div>${["r","b"].map(s=>(it.lessons[s]||[]).map(x=>`<div class="lesson">${s==="r"?"🔴":"⚫"} ${esc(x)}</div>`).join("")).join("")}`:""].join("")+'<div id="vwTh"></div>'
      +(typeof posRGo==="function"?`<div class="sec-t" style="margin-left:0">目前這一步的局面${(()=>{try{return"・輪到"+PLAYER[curPos().side]+"走"}catch(e){return""}})()}</div><div class="opt" style="margin:4px 0 0"><button id="vwPlay">🤖 從這一步和電腦下</button><button id="vwFen">📋 複製 FEN</button><button id="vwEd">♟ 改這個局面</button></div><p class="muted" style="font-size:12px;margin:4px 0 0">和電腦下是練習，不算戰績、不影響段位。</p>`:"");
    if(typeof cjThFor==="function")cjThFor(c,id,b.querySelector("#vwTh"));
    /* 評比第 4 輪 P01.3／P17.2：從檢討頁目前這一步（含自己改走的變化）接到局面還原：和電腦下、複製 FEN、改局面（m/10d-coach.js） */
    if(typeof posRGo==="function"){const P=curPos();b.querySelector("#vwPlay").onclick=()=>{closeSheet();posRGo(P.board,P.side,"play")};
      b.querySelector("#vwFen").onclick=()=>pgnOut(fenC(P.board,P.side),"FEN","txt","copy");b.querySelector("#vwEd").onclick=()=>{closeSheet();posRGo(P.board,P.side,"edit")}}})}   /* 評比第 3 輪 P17.1：古譜這一局若是一盞茶殘局題，列出戰術主題（07c-canju.js） */
  /* 評比第 3 輪 P17（專業象棋教練）：📤 匯出目前看的這一條著法（主線或選的變著）；評等用 gradeOf（含剛請 Pikafish 補算的）；
     自己的對局（play、pvp）不帶 comments（可能是對局中的留言），古譜、大師對局帶書上的批註。不含玩家 ID、裝置代號（m/10d-coach.js pgnName） */
  function exportPgn(){if(!it||typeof pgnSheet!=="function")return;const mine=c==="play"||c==="pvp",g=pgnFromItem(it,{notes:!mine,book:bookName});if(!g)return toast("這盤沒有著法可以匯出");
    g.moves=seq(line,endPly(line)).map((m,i)=>{const r=gradeOf(i+1)||{};return{f:m.f,t:m.t,cn:m.cn,q:r.q,loss:r.loss,bc:r.bc,ev:r.ev,note:mine?"":it.comments[owner(line,i+1)+"_"+(i+1)]||""}});
    if(typeof pgnAltsOf==="function")pgnAltsOf(g.moves,it,line,{notes:!mine,free:FREE&&FREE.all.length?{base:FREE.base,moves:FREE.all,src:FREE.src||"自由走棋"}:null});   /* 第 11 輪 X1：其他分支（書上的變著、存檔的支線）和正在看的自由走棋／Pikafish 推演一起寫成變著 */
    g.side=firstSide();if(!(it.red||it.black))g.title=title();pgnSheet([g],{name:g.title})}
  const self={stop(){clearTimeout(lt)}};
  Promise.all([c==="tmp"&&typeof posRTmp==="function"?posRTmp():api(`/db/item?c=${encodeURIComponent(c)}&id=${encodeURIComponent(id)}`),api("/db/books").catch(()=>[])]).then(([d,bs])=>{
    it=d;L=new Map(it.lines.map(l=>[l.id,l]));bookName=c==="tmp"?"局面還原（沒有存檔，要留下來請自己走幾步再按 💾 存成棋譜）":(bs.find(b=>b.key===c)||{}).name||"";
    {const oh=c==="pvp"?oppHist().find(h=>h.rid===id):null;
    setTop(oppTw(title()),dbBack,[["🔄",()=>{vFlip=!vFlip;vibrate(5);show()},"翻轉棋盤"],...(oh?[["👤",()=>oppCard(oh.oid,oh.opp),"對手資料"]]:[]),["📊",()=>report(),"賽後報告"],["📤",()=>exportPgn(),"匯出棋譜"],["ℹ",()=>info(),"棋局資訊"]])}   /* 評比第 3 輪 P17：📤 匯出棋譜（PGN／中文記譜，m/10d-coach.js） */
    const r=store.get("recent",[]).find(x=>x.c===c&&x.id===id);ply=r&&r.ply?Math.min(r.ply,endPly(0)):it.jump?Math.min(+it.jump||0,endPly(0)):0;   /* 意見回饋 310：妙棋精選第一次打開就停在妙棋那一步 */
    const oa=store.get("openAt",null);if(oa&&oa.c===c&&oa.id===id){store.set("openAt",null);ply=Math.min(oa.ply,endPly(0));if(!oa.mfl)setTimeout(()=>toast(`從第 ${ply} 步開始：${oa.why}（可以往前看）`),400)}
    show();remember();if(c!=="tmp"&&typeof rdOpen==="function")rdOpen(c,id);   /* 意見回饋 737 第二期：記下打開讀過這盤（只存 id） */
    loadGrades().then(()=>{if(store.get("openReport")===c+"/"+id){store.set("openReport",null);report(true)}else pendFill()})}).catch(e=>{v.querySelector("#note").textContent="⚠ "+e.message});
  return self}

