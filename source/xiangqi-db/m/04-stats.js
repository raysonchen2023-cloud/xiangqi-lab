// ================= 學習：錯棋重練、我的開局（都從自己下過的對局算） =================
// 讀自己下過、Pikafish 評過等的對局（挑戰電腦＋線上對戰），每盤附上自己執哪一方
async function myGames(maxPer){
  const me=myName(),out=[];
  for(const c of["play","pvp"]){let d;try{d=await api("/db/items?c="+c+"&limit="+(maxPer||120))}catch(e){continue}
    for(const s of d.items.slice(0,maxPer||120)){const side=c==="play"?(s.red==="你"?"r":"b"):me&&s.red===me?"r":me&&s.black===me?"b":null;if(!side)continue;
      let it;try{it=await api(`/db/item?c=${c}&id=${encodeURIComponent(s.id)}`)}catch(e){continue}
      const L=it.lines&&it.lines[0];if(!L||!it.board||!L.moves.length)continue;
      const moves=L.moves.map((m,i)=>({...m,by:m.by||(i%2?"b":"r")}));
      out.push({c,id:s.id,side,it,moves,opp:side==="r"?s.black:s.red,res:resultFor(it.result,side)})}}
  return out}
// 跟「我的戰績」同一套判斷：「紅…勝」「黑…勝」，中途取消不算
const resultFor=(r,side)=>{r=String(r||"");const w=/^紅/.test(r)&&/勝|胜/.test(r)?"r":/^黑/.test(r)&&/勝|胜/.test(r)?"b":null;
  if(!w&&/中止|取消/.test(r))return"";return w?(w===side?"w":"l"):r?"d":""};
const QGOOD=["妙著","正著"],QOK=["穩著","緩著"],QBAD=["失著","敗著"];
const isStdStart=b=>b&&b.join()===XQ_START_BOARD().join();
function XQ_START_BOARD(){if(!XQ_START_BOARD.b){const b=Array(90).fill(null),rows="rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR".split("/");
  rows.forEach((r,y)=>{let x=0;for(const ch of r){if(/\d/.test(ch))x+=+ch;else{b[y*9+x]=ch;x++}}});XQ_START_BOARD.b=b}return XQ_START_BOARD.b}

// ---------- 🔁 錯棋重練 ----------
// 從自己下過的失著／敗著那一步之前開始，跟第 16 級「專2-1」的 Pikafish 重下（舊 8 級制的第 7 級＝職業頂尖，換到 18 級制就是 16）；不算戰績。意見回饋 714：說明原本還寫舊名稱
function Redo(v){
  setTop("錯棋重練","#/");setTabs(true,"#/");
  /* 意見回饋 338：錯棋重練自己留一盤——有沒下完的就提醒，點了接著下 */
  api("/play/state").then(st=>{const box=v.querySelector("#rRes");if(!box)return;const cur=st.practice&&!st.result?{n:st.moves.length-(st.practice.base||0)}:null,o=(st.others||[]).find(z=>z.kind==="practice");if(!cur&&!o)return;
    {const RD=store.get("redoDone",{})||{},won=g=>{if(!(g&&g.practice))return false;const d=RD[g.practice.key]||{};if(g.id&&d.won===g.id)return true;const m=g.moves&&g.moves[g.practice.base||0];return!!(m&&d.ok&&d.due-Date.now()>36e5&&d.last===m.f+"-"+m.t)};if((!cur||won(st))&&(!o||won(o))){   /* 意見回饋 648：這盤錯棋重練已經練會了，只淡淡提醒，可以接著下完或不理它 */
      box.innerHTML=`<p class="muted" style="font-size:13px;margin:10px 2px 0">✅ 上一題已經練會了，對局還留著，想下完可以 <a href="#/redo/play">接著下</a></p>`;return}}
    box.innerHTML=`<button class="card row" style="width:100%;margin-top:10px;justify-content:space-between;border:2px solid var(--red);font:inherit;color:inherit;text-align:left"><span>⏳ <b>還有一題錯棋重練沒下完</b></span><b>繼續下 ›</b></button>`;
    box.querySelector("button").onclick=()=>{vibrate(5);location.hash="#/redo/play"}}).catch(()=>{});
  v.innerHTML=`<div class="home"><div class="card" style="line-height:1.7">找出你下過的<b style="color:var(--red)">失著、敗著</b>，從那一步之前的局面重新開始，跟很強的電腦（第 16 級「專2-1」）再下一次。<br><span class="muted">想出比上次好的一步，就算練會了；練會的題目會在 1、3、7、14、30 天後再出現讓你複習（間隔重複），練錯就縮短間隔。練習的對局不算戰績。</span></div>
    <div id="rRes"></div><div class="st-res" id="rf" style="margin:12px 0 4px"></div><div id="rl"><div class="muted" style="text-align:center;padding:20px">找你下過的錯棋中…</div></div></div>`;
  // 清單變長的整理（意見回饋 132）：
  // 1. 同一盤裡連續的錯（相隔 2 步以內）合成一題：從第一個錯開始練，後面那幾步本來就會一起重下
  // 2. 不同盤走到同一個局面、犯同一個錯（常見於同一個開局）合成一題，標「犯過 N 次」
  // 3. 依對局分組，一盤一張卡；最近 3 盤展開，其他收合；一次列 10 盤
  let list=null,show=null,lim=10;const done=store.get("redoDone",{});
  const isOk=x=>x.keys.some(k=>done[k]&&done[k].ok),tries=x=>x.keys.reduce((n,k)=>n+(done[k]?done[k].n||0:0),0);
  /* 間隔重複：練會的題目到了複習日（或剛練錯的）就算「該複習」 */
  const dueAt=x=>{const ds=x.keys.map(k=>done[k]).filter(d=>d&&d.n);return ds.length?Math.min(...ds.map(d=>d.due||0)):null},isDue=x=>{const d=dueAt(x);return d!=null&&d<=Date.now()};
  const dueTxt=x=>{const d=dueAt(x);if(d==null)return"";const dd=Math.ceil((d-Date.now())/864e5);return d<=Date.now()?"📅 該複習":dd<=1?"明天複習":dd+" 天後複習"};
  (async()=>{const gs=await myGames(120),raw=[];
    for(const g of gs){if(!isStdStart(g.it.board))continue;
      g.moves.forEach((m,i)=>{if(m.by===g.side&&QBAD.includes(qNow(m)))raw.push({g,ply:i+1,m,key:g.c+"/"+g.id+"/"+(i+1)})})}
    raw.sort((a,b)=>String(b.g.id).localeCompare(String(a.g.id))||a.ply-b.ply);
    const cl=[];for(const x of raw){const last=cl[cl.length-1];
      if(last&&last.g===x.g&&x.ply-last.end<=4){last.end=x.ply;last.n++;last.loss=Math.max(last.loss,x.m.loss||0);last.keys.push(x.key);if(x.m.q==="敗著")last.m={...last.m,q:"敗著"}}
      else cl.push({g:x.g,ply:x.ply,end:x.ply,n:1,m:x.m,loss:x.m.loss||0,key:x.key,keys:[x.key],dup:0})}
    const bySig=new Map();list=[];
    for(const c of cl){const sig=c.g.side+"|"+c.g.moves.slice(0,c.ply).map(m=>m.cn).join(" "),rep=bySig.get(sig);
      if(rep){rep.dup++;rep.keys.push(...c.keys);continue}bySig.set(sig,c);list.push(c)}
    paint()})().catch(e=>{v.querySelector("#rl").innerHTML=`<div class="muted">⚠ ${esc(e.message)}</div>`});
  function paint(){if(!v.isConnected||!list)return;
    const f=k=>x=>k==="all"||(k==="due"?isDue(x):(k==="ok")===isOk(x)),n=k=>list.filter(f(k)).length;if(show==null)show=n("due")?"due":"todo";const pass=f(show);
    v.querySelector("#rf").innerHTML=[["due","📅 該複習"],["todo","還沒練會"],["ok","✅ 練會了"],["all","全部"]].map(([k,l])=>`<button data-k="${k}" class="${show===k?"on":""}">${l} ${n(k)}</button>`).join("");
    v.querySelectorAll("#rf [data-k]").forEach(b=>b.onclick=()=>{show=b.dataset.k;lim=10;paint()});
    const box=v.querySelector("#rl");
    if(!list.length){box.innerHTML='<div class="card muted" style="text-align:center;line-height:1.7">還沒有找到失著或敗著 👍<br>下完一盤挑戰電腦或線上對戰，等 Pikafish 評完等，下錯的步就會出現在這裡。</div>';return}
    const games=[];for(const x of list){if(!pass(x))continue;let G=games.find(y=>y.g===x.g);if(!G)games.push(G={g:x.g,xs:[]});G.xs.push(x)}
    if(!games.length){box.innerHTML=`<div class="card muted" style="text-align:center">${show==="ok"?"還沒有練會的，挑一題試試看！":show==="due"?"今天沒有要複習的 👍 練會的題目會在 1、3、7、14、30 天後再出現。":"全部都練會了 🎉"}</div>`;return}
    const row=x=>{const ok=isOk(x),t=tries(x),q=x.m.q;
      return`<button class="st-g" data-i="${list.indexOf(x)}"><span class="dot ${q==="敗著"?"l":""}" style="${q==="失著"?"background:var(--warn)":""}">${q==="敗著"?"露":"錯"}</span>
        <span class="tx"><b>${x.n>1?`第 ${x.ply}～${x.end} 步・連續 ${x.n} 處`:`第 ${x.ply} 步「${esc(x.m.cn||"")}」`}</b><span>少了${pawnAbout(x.loss)}${x.dup?`・<b style="color:var(--red)">同一個錯犯過 ${x.dup+1} 次</b>`:""}</span></span>
        <b class="r" style="font-size:13px;${isDue(x)?"color:var(--red)":ok?"color:var(--accent2)":""}">${isDue(x)?"📅 該複習":ok?"✅ 練會"+(dueTxt(x)?"<br><small class=muted>"+dueTxt(x)+"</small>":""):t?"試過 "+t+" 次":"練習 ›"}</b></button>`};
    box.innerHTML=games.slice(0,lim).map((G,gi)=>{const id=String(G.g.id),okN=G.xs.filter(isOk).length;
      return`<details class="rd-g" ${gi<3?"open":""}><summary><span>${id.slice(5,10).replace("-","/")}・${G.g.c==="play"?"🤖":"👥"} ${esc(G.g.opp||"")}${G.g.c!=="play"&&oppHist().some(h=>String(h.rid)===id&&isCloud(h.oid))?cloudTag(true):""}・執${G.g.side==="r"?"紅":"黑"}${G.g.res?`・${G.g.res==="w"?"勝":G.g.res==="l"?"負":"和"}`:""}</span><b>${G.xs.length} 題${okN?`・${okN} 練會`:""}</b></summary>
        <div class="st-list">${G.xs.map(row).join("")}</div></details>`}).join("")+
      (games.length>lim?`<button class="btn ghost" id="rmore" style="margin-top:10px">再顯示 10 盤（還有 ${games.length-lim} 盤）</button>`:"");
    box.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>start(list[+b.dataset.i]));
    const mo=box.querySelector("#rmore");if(mo)mo.onclick=()=>{lim+=10;paint()}}
  async function start(x){vibrate(8);
    const go=async()=>{try{const pre={moves:x.g.moves.slice(0,x.ply-1).map(m=>({f:m.f,t:m.t,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc,bm:m.bm,bp:m.bp})),
        info:{key:x.key,ply:x.ply,cn:x.m.cn,q:x.m.q,loss:x.m.loss,bc:x.m.bc||"",opp:x.g.opp||"",date:String(x.g.id).slice(0,10)}};
      await api("/play/new",{human:x.g.side,lx:16,pre});location.hash="#/redo/play"}catch(e){toast(e.message)}};
    let s=null;try{s=await api("/play/state")}catch(e){}
    if(s&&s.ranked&&!s.result&&s.moves.length>=2)confirmBox("晉級賽還沒下完，開始練習會算輸，確定？",go,"開始練習");
    else if(s&&!s.ranked&&!s.practice&&!s.result&&s.moves.length>=2)confirmBox("挑戰電腦還有一盤沒下完，開始練習會蓋掉它，確定？",go,"開始練習");else go()}
  return{}}

// ---------- 📊 我的開局 ----------
// 紅方看第一步，黑方看怎麼應；再加上各開局的勝負、開局準確度，以及中局正招／次好／失誤的比例
const NORM=s=>String(s||"").replace(/傌/g,"馬").replace(/俥/g,"車").replace(/砲/g,"炮").replace(/卒/g,"兵").replace(/象/g,"相").replace(/士/g,"仕").replace(/帥|將/g,"帥");
function redOpening(cn){const m=NORM(cn);
  if(/^炮[二八]平五/.test(m))return"中炮";if(/^兵[三七]進一/.test(m))return"仙人指路";if(/^相[三七]進五/.test(m))return"飛相局";
  if(/^馬[二八]進[三七]/.test(m))return"起馬局";if(/^炮二平六|^炮八平四/.test(m))return"過宮炮";if(/^炮二平四|^炮八平六/.test(m))return"士角炮";
  if(/^炮[二八]進二/.test(m))return"巡河炮";if(/^炮[二八]進四/.test(m))return"過河炮";if(/^兵[一九]進一/.test(m))return"邊兵局";if(/^炮[二八]平[三七]/.test(m))return"金鉤炮";return"其他開局"}
function blackDefence(moves){const r1=NORM(moves[0]&&moves[0].cn),bs=[1,3,5].map(i=>NORM(moves[i]&&moves[i].cn)).filter(Boolean);const b1=bs[0]||"";
  if(/^炮[28]平5/.test(b1)){if(/^炮二/.test(r1)&&/^炮8/.test(b1)||/^炮八/.test(r1)&&/^炮2/.test(b1))return"順炮";if(/^炮[二八]平五/.test(r1))return"列炮";return"還架中炮"}
  if(bs.some(m=>/^炮[28]平5/.test(m))&&/^炮[二八]平五/.test(r1))return"半途列炮";
  const h2=bs.filter(m=>/^馬[28]進[37]/.test(m)).length;
  if(h2>=1&&bs.some(m=>/^炮8平6|^炮2平4/.test(m)))return"反宮馬";if(h2>=2)return"屏風馬";
  if(/^炮[28]平[37]/.test(b1))return"卒底炮";if(/^相[37]進5/.test(b1))return"飛象";if(/^兵[37]進1/.test(b1))return"挺卒";
  if(/^馬[28]進[37]/.test(b1))return"起馬應對";if(/^炮[28]平[46]/.test(b1))return"士角炮應對";return"其他應法"}
function Openings(v){
  setTop("我的開局","#/");setTabs(true,"#/");
  v.innerHTML=`<div class="home"><div id="ob"><div class="muted" style="text-align:center;padding:20px">整理你下過的對局中…</div></div></div>`;
  (async()=>{const gs=(await myGames(150)).filter(g=>!g.it.mid);if(!v.isConnected)return;const box=v.querySelector("#ob");   /* 我的開局：故事裡從中局開始的那盤不算 */
    if(!gs.length){box.innerHTML='<div class="card muted" style="text-align:center;line-height:1.7">還沒有自己的對局。<br>下幾盤挑戰電腦或線上對戰，這裡就會統計你常用的開局。</div>';
      recommendGames(box,{r:{},b:{}},{g:0,o:0,b:0},{}).catch(()=>{});return}
    const T={r:{},b:{}},mid={g:0,o:0,b:0},midBy={};
    for(const g of gs){if(!isStdStart(g.it.board))continue;
      const name=g.side==="r"?redOpening(g.moves[0].cn):blackDefence(g.moves)+(g.moves[0]?`（對${redOpening(g.moves[0].cn)}）`:"");
      const R=gameReport(g.it.board,g.moves),me=R.sides[g.side]||{},row=T[g.side][name]||(T[g.side][name]={n:0,w:0,l:0,d:0,acc:[],first:g.moves[g.side==="r"?0:1]});
      row.n++;if(g.res)row[g.res]++;if(me.phases&&me.phases.open)row.acc.push(me.phases.open.score);
      for(const p of R.plies)if(p.by===g.side&&p.phase==="mid"&&p.q&&p.q!=="—"){const k=QGOOD.includes(p.q)?"g":QOK.includes(p.q)?"o":QBAD.includes(p.q)?"b":null;if(!k)continue;
        mid[k]++;const mb=midBy[name]||(midBy[name]={g:0,o:0,b:0});mb[k]++}}
    const pct=(a,n)=>n?Math.round(a*100/n):0,avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
    const tbl=(sd,title)=>{const rows=Object.entries(T[sd]).sort((a,b)=>b[1].n-a[1].n);if(!rows.length)return"";const tot=rows.reduce((s,[,r])=>s+r.n,0);
      return`<div class="sec-t">${title}<small>${tot} 盤</small></div><div class="card op-card">`+rows.map(([nm,r])=>{const a=avg(r.acc),mb=midBy[nm],mn=mb?mb.g+mb.o+mb.b:0;
        return`<div class="op-row"><div class="op-h"><b>${esc(nm)}</b><span class="muted">${r.n} 盤・${pct(r.n,tot)}%</span></div>
          <div class="op-bar"><i style="width:${pct(r.n,tot)}%"></i></div>
          <div class="op-m"><span><b class="w">${r.w}</b> 勝 <b class="l">${r.l}</b> 負 <b>${r.d}</b> 和</span>${a!=null?`<span>開局準確度 <b style="color:${gradeFor(a)[2]}">${a}</b></span>`:""}${mn?`<span>中局正招 ${pct(mb.g,mn)}%</span>`:""}</div></div>`}).join("")+"</div>"};
    const mn=mid.g+mid.o+mid.b,fav=Object.entries(T.r).sort((a,b)=>b[1].n-a[1].n)[0];
    box.innerHTML=(fav?`<div class="card" style="line-height:1.7">你執紅最常下 <b>${esc(fav[0])}</b>（${fav[1].n} 盤）。${Object.keys(T.r).length<=1&&fav[1].n>=5?"可以試試其他開局，例如飛相局或仙人指路，讓對手比較難準備。":""}</div>`:"")+
      tbl("r","執紅：我的開局")+tbl("b","執黑：我怎麼應")+
      `<div class="sec-t">中局的著法<small>${mn} 步</small></div><div class="card">`+(mn?
      `<div class="op-stack"><i class="g" style="width:${pct(mid.g,mn)}%"></i><i class="o" style="width:${pct(mid.o,mn)}%"></i><i class="b" style="width:${pct(mid.b,mn)}%"></i></div>
       <div class="op-leg"><span><i class="g"></i>正招（妙著、正著）${pct(mid.g,mn)}%</span><span><i class="o"></i>次好（穩著、緩著）${pct(mid.o,mn)}%</span><span><i class="b"></i>失誤（失著、敗著）${pct(mid.b,mn)}%</span></div>
       <p class="muted" style="margin:8px 0 0;line-height:1.6">中局＝第 11 回合以後、還沒進入殘局的部分。${pct(mid.b,mn)>=15?"失誤偏多，可以到「🔁 錯棋重練」把下錯的步再練一次。":pct(mid.g,mn)>=60?"大部分都跟 Pikafish 的首選一樣，很穩！":""}</p>`
      :'<div class="muted">還沒有評過等的中局著法。</div>')+`</div>
      <p class="muted" style="font-size:12px;line-height:1.6;margin-top:10px">開局名稱依第一、二回合的走法自動判斷，只是大致分類。統計最近 150 盤挑戰電腦和 150 盤線上對戰。</p>`;
    recommendGames(box,T,mid,midBy).catch(()=>{})})().catch(e=>{const b=v.querySelector("#ob");if(b)b.innerHTML=`<div class="muted">⚠ ${esc(e.message)}</div>`});
  return{}}

// 開局準確度或中局正招比例偏低時，從棋譜庫挑 3 盤大師對局給玩家練：
// 開局弱＝挑「準確度最低的那個開局」、同一方贏的大師對局（看開局怎麼下）；中局弱＝挑「中局正招最少的那個開局」、同一方贏的對局（看中局怎麼贏）
// 先找許銀川對局（檔案小），不夠再找特級大師對局；每次換不同的 3 盤（記住最近推薦過的）
const OPEN_KW={"中炮":["中炮"],"仙人指路":["仙人指路"],"飛相局":["飞相"],"起馬局":["起马"],"過宮炮":["过宫炮"],"士角炮":["士角炮"],"巡河炮":["巡河炮"],"過河炮":["过河炮"],"邊兵局":["边兵"],"金鉤炮":["金钩炮"],
  "順炮":["顺炮"],"列炮":["列炮"],"還架中炮":["列炮"],"半途列炮":["半途列炮"],"反宮馬":["反宫马"],"屏風馬":["屏风马"],"卒底炮":["卒底炮"],"飛象":["飞象"],"挺卒":["挺卒"],"起馬應對":["起马"],"士角炮應對":["士角炮"]};
async function recommendGames(box,T,mid,midBy){const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null,pct=(a,n)=>n?Math.round(a*100/n):0;
  const rows=[...Object.entries(T.r).map(([n,r])=>({n,sd:"r",r})),...Object.entries(T.b).map(([n,r])=>({n,sd:"b",r}))];
  const oa=avg(rows.flatMap(x=>x.r.acc)),mn=mid.g+mid.o+mid.b,mg=pct(mid.g,mn);
  // 一定會推薦（意見回饋 133：新帳號沒資料或分數都及格時原本什麼都不顯示，看起來像功能不見）
  // 低於門檻＝「加強」；都及格＝挑相對弱的那項「保持手感」；還沒有評過等的對局＝先看最常見的中炮
  const OPEN_MIN=75,MID_MIN=55,hasO=oa!=null,hasM=mn>=20,wo=hasO&&oa<OPEN_MIN,wm=hasM&&mg<MID_MIN,mode=wo||wm?"weak":hasO||hasM?"ok":"none";
  const gapO=hasO?(OPEN_MIN-oa)/OPEN_MIN:-9,gapM=hasM?(MID_MIN-mg)/MID_MIN:-9;
  const focus=mode==="none"?"open":(mode==="weak"?(wo&&wm?(gapO>=gapM?"open":"mid"):wo?"open":"mid"):(gapO>=gapM?"open":"mid"));
  const base=nm=>nm.replace(/（對.*）$/,"");
  let tg;if(focus==="open")tg=rows.filter(x=>x.r.acc.length&&OPEN_KW[base(x.n)]).sort((a,b)=>avg(a.r.acc)-avg(b.r.acc))[0];
  else{const g=x=>{const m=midBy[x.n];return m&&m.g+m.o+m.b>=5?m.g/(m.g+m.o+m.b):1};tg=rows.filter(x=>OPEN_KW[base(x.n)]).sort((a,b)=>g(a)-g(b)||b.r.n-a.r.n)[0]}
  if(!tg)tg=rows.filter(x=>OPEN_KW[base(x.n)]).sort((a,b)=>b.r.n-a.r.n)[0]||{n:"中炮",sd:"r",r:{n:0,acc:[]}};
  const kw=OPEN_KW[base(tg.n)],vsRed=tg.sd==="b"&&(tg.n.match(/（對(.*)）$/)||[])[1],kw2=vsRed&&OPEN_KW[vsRed]?OPEN_KW[vsRed]:[],win=tg.sd==="r"?"紅勝":"黑勝";
  const seen=store.get("recShown",[]),pick=[];
  for(const c of["xuyinchuan","gmgames"]){if(pick.length>=3)break;let d;try{d=await api("/db/items?c="+c)}catch(e){continue}
    // 開局名稱像「中炮过河车…对屏风马…」：紅方開局看「对」前面那段的開頭，黑方應法看「对」後面那段（避免「仙人指路转左中炮」被當成中炮）
    const parts=it=>{const nm=String(it.open||"").replace(/^[A-E]\d\d\s*/,""),i=nm.indexOf("对");return i<0?[nm,""]:[nm.slice(0,i),nm.slice(i+1)]};
    const fit=(it,ks,sd)=>{const[rp,bp]=parts(it);return ks.every(k=>sd==="r"?rp.startsWith(k):bp.includes(k))};
    const ok=it=>it.open&&fit(it,kw,tg.sd)&&it.result===win&&!seen.includes(c+"/"+it.id)&&!pick.some(p=>p.it.id===it.id);
    let L=d.items.filter(it=>ok(it)&&fit(it,kw2,"r"));if(L.length<3-pick.length)L=L.concat(d.items.filter(it=>ok(it)&&!L.includes(it)));
    for(let i=L.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[L[i],L[j]]=[L[j],L[i]]}
    for(const it of L.slice(0,3-pick.length))pick.push({c,it})}
  if(!pick.length||!box.isConnected)return;
  store.set("recShown",pick.map(p=>p.c+"/"+p.it.id).concat(seen).slice(0,60));
  const side=tg.sd==="r"?"紅方":"黑方",look=focus==="open"?"重點看<b>前 10 回合</b>怎麼出子、佔位。":"重點看<b>第 11 回合以後</b>怎麼找攻擊點、怎麼兌子。";
  const why=mode==="none"?`還沒有足夠評過等的對局可以判斷你的強弱（下完幾盤、Pikafish 評完等就會改成針對你的弱點推薦）。先看大師下最常見的 <b>中炮</b>，${look}`
    :mode==="ok"?`你的${hasO?`開局準確度 <b>${Math.round(oa)}</b>`:""}${hasO&&hasM?"、":""}${hasM?`中局正招 <b>${mg}%</b>`:""}都不錯 👍 再加強相對弱的${focus==="open"?"開局":"中局"}：下面 3 盤是大師下 <b>${esc(tg.n)}</b>、${side}贏的對局，${look}`
    :focus==="open"?`你的開局準確度平均 <b>${Math.round(oa)}</b>（低於 ${OPEN_MIN}），其中 <b>${esc(tg.n)}</b> 最弱。下面 3 盤是大師下這個開局、${tg.sd==="r"?"紅方":"黑方"}贏的對局，重點看<b>前 10 回合</b>怎麼出子、佔位。`
    :`你的中局正招只有 <b>${mg}%</b>（低於 ${MID_MIN}%），<b>${esc(tg.n)}</b> 進入中局後最容易失誤。下面 3 盤是大師下這個開局、${tg.sd==="r"?"紅方":"黑方"}贏的對局，重點看<b>第 11 回合以後</b>怎麼找攻擊點、怎麼兌子。`;
  const el=document.createElement("div");
  el.innerHTML=`<div class="sec-t">推薦練習<small>${mode==="none"?"入門":mode==="ok"?"保持手感":focus==="open"?"加強開局":"加強中局"}</small></div><div class="card"><p style="margin:0 0 8px;line-height:1.7">${why}</p>
    <div class="st-list">${pick.map(({c,it})=>`<button class="st-g" data-c="${c}" data-id="${esc(it.id)}"><span class="dot w">${tg.sd==="r"?"紅":"黑"}</span><span class="tx"><b>${esc(oppTw(it.red||""))} 對 ${esc(oppTw(it.black||""))}</b><span>${esc(String(it.year||""))}・${esc(String(it.open||"").replace(/^[A-E]\d\d\s*/,""))}</span></span><span class="r muted">›</span></button>`).join("")}</div>
    <p class="muted" style="font-size:12px;margin:8px 0 0">每次打開這頁會換不同的 3 盤。<!-- 意見回饋 607：推演的位置寫錯，改成實際的按鈕 -->也可以用下面的「🔍 分析 →『▶ 推演這條變化』」，或直接點棋子試走別的走法。</p></div>`;
  const ref=box.querySelector(".sec-t");box.insertBefore(el,ref||null);
  el.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{vibrate(5);location.hash=`#/db/${b.dataset.c}/${encodeURIComponent(b.dataset.id)}`})}
// ================= 我的戰績（跟電腦下的勝負和、賽後報告分數、棋力測驗） =================
// 我的戰績：所有下過的棋（挑戰電腦＋對人），可以分類、篩勝負，依月份分組，點一下打開棋譜
// ================= 棋友資料（意見回饋 182）：下過的棋友也能看完整資料 =================
// 線上大廳收到下過棋的棋友狀態時，把他最新的資料存在手機（oppSnap），離線時也看得到「上次看到」的資料
function oppHist(){try{return(window.XQNet&&XQNet.rating?XQNet.rating().hist:[])||[]}catch(e){return[]}}
/* 意見回饋（開發者 11/6 分數審查）：線上對局（pvp）存檔的 red／black 是真名，我是哪一方要另外認：
   先看存檔裡記的 mine（新版 local.js 存的）、再看線上戰績裡這盤記的 sd、最後才比名字；都認不出就回 null（不要硬當紅方）。
   10-db.js 的賽後報告存分數、對局紀錄、skillRows 三處都用這一個 */
function pvpMySide(it,id){if(!it)return null;if(it.mine==="r"||it.mine==="b")return it.mine;const rid=id!=null?id:it.id;
  const h=oppHist().find(x=>x.rid===rid);if(h&&(h.sd==="r"||h.sd==="b"))return h.sd;
  const me=myName();return me&&it.red===me?"r":me&&it.black===me?"b":null}
/* 一盤的純準確度：talentCache5 那列 pa（開局／中局／殘局各＝[準確度加總, 步數]）三段加總÷步數；沒有 pa 的舊列回 null */
const rowAcc=g=>{if(!g||!g.pa)return null;let s=0,n=0;for(const k of["open","mid","end"]){const x=g.pa[k];if(x&&x[1]){s+=+x[0]||0;n+=x[1]}}return n?s/n:null};
function oppSnapSave(ps){const ids=new Set(oppHist().map(h=>h.oid).filter(Boolean));if(!ids.size)return;const S=store.get("oppSnap",{});let ch=false;
  for(const p of ps||[])if(p&&ids.has(p.id)){S[p.id]={id:p.id,name:p.name,pts:p.pts,w:p.w,l:p.l,d:p.d,city:p.city||"",kind:p.kind||"",at:p.at||Date.now()};ch=true}if(ch)store.set("oppSnap",S)}
/* 意見回饋 619：戰績裡帶的棋步（mv，每步 4 個數字＝起點、終點格號）直接重建棋譜，不用靠伺服器 */
async function histRebuild(h){if(!h||!h.rid||!h.mv||!window.XQ_saveNetGame)return false;try{const mv=[];for(let i=0;i+3<h.mv.length;i+=4)mv.push([+h.mv.slice(i,i+2),+h.mv.slice(i+2,i+4)]);if(!mv.length)return false;
  const me=h.me||(typeof myName==="function"&&myName())||"我",sd=h.sd||"r",os=sd==="r"?"b":"r",red={name:sd==="r"?me:h.opp||"對手"},black={name:sd==="r"?h.opp||"對手":me};
  return await XQ_saveNetGame({id:h.rid,red,black,result:{w:h.res==="w"?sd:h.res==="l"?os:null,why:h.why||""},moves:mv})}catch(e){return false}}
/* 漏存的網路對局（斷線、不在對局畫面時結束）：從伺服器保留的最後狀態補回棋譜（意見回饋 280） */
async function netRecover(h){if(!h||!h.gid||!h.rid||!window.XQNet||!XQNet.fetchGame||!window.XQ_saveNetGame)return false;
  if(h.mv&&await histRebuild(h))return true;   /* 意見回饋 619：先用戰績裡的棋步補，補不到才去伺服器找 */
  try{const g=await XQNet.fetchGame(h.gid,6000);if(!g||g.id!==h.rid||!g.result)return false;return await XQ_saveNetGame(g)}catch(e){return false}}
if(OFF&&window.XQNet)setTimeout(async()=>{try{const tried=store.get("netRecTried",[]),r=await api("/db/items?c=pvp&limit=500"),ids=new Set((r.items||[]).map(it=>it.id));
  const miss=oppHist().filter(h=>h.rid&&h.gid&&!ids.has(h.rid)&&!tried.includes(h.rid)).slice(0,8);
  for(const h of miss){await netRecover(h);tried.push(h.rid)}if(miss.length)store.set("netRecTried",tried.slice(-100))}catch(e){}},15000);
if(window.XQNet&&XQNet.on)setTimeout(()=>{try{XQNet.on("people",()=>oppSnapSave(XQNet.people()));oppSnapSave(XQNet.people())}catch(e){}},500);
function oppCard(oid,name,opt){opt=opt||{};let live=null;try{live=window.XQNet&&XQNet.people?XQNet.people().find(x=>oid?x.id===oid:x.name===name):null}catch(e){}
  if(live)oppSnapSave([live]);const snap=(store.get("oppSnap",{})||{})[oid]||null,p=live||snap||{name,id:oid};
  const mine=oppHist().filter(h=>oid?h.oid===oid:h.opp===name),mw=mine.filter(h=>h.res==="w").length,ml=mine.filter(h=>h.res==="l").length,md=mine.filter(h=>h.res==="d").length;
  const N=(p.w||0)+(p.l||0)+(p.d||0),ago=p.at?Math.max(0,Math.round((Date.now()-p.at)/60000)):null;
  const agoTx=ago==null?"":ago<1?"剛剛":ago<60?ago+" 分鐘前":ago<1440?Math.round(ago/60)+" 小時前":Math.round(ago/1440)+" 天前";
  const ST2={idle:"閒置中",seeking:"找對手中",playing:"對局中",watching:"觀戰中"};
  sheet("棋友資料",b=>{b.innerHTML=`<div style="text-align:center"><div style="font-size:22px;font-weight:900;font-family:var(--serif)">${esc(p.name||name||"棋友")}</div>${isCloud(oid)||p.bot?`<div style="margin-top:4px">${cloudTag(true,true)}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${cloudTip()}</div>`:""}${p.title?`<div style="color:#C8102E;font-weight:900;margin-top:2px">🏯 ${esc(p.title)}</div>`:""}
      <div style="margin:6px 0">${p.pts!=null&&window.XQNet?`<span class="pill" style="font-size:15px;padding:4px 12px">🏅 ${esc(XQNet.rankOf(p.pts))}・${p.pts||0} 分</span>`:""}</div>
      <div class="muted">${live?"🟢 在線上・"+(ST2[live.st]||""):"⚪ 不在線上"+(agoTx?"・上次看到 "+agoTx:"")}${p.city?"・📍"+esc(p.city):""}${p.kind?"・"+esc(p.kind):""}</div></div>
    <div class="card" style="margin-top:12px"><div class="muted" style="margin-bottom:6px">他的線上戰績${live?"":snap?"（上次看到的資料）":""}</div>${p.w==null?'<div class="muted">還沒有他的戰績資料（他上線時會更新）</div>':`<div style="display:grid;grid-template-columns:repeat(4,1fr);text-align:center">
      ${[["勝",p.w,"var(--accent2)"],["負",p.l,"var(--red)"],["和",p.d,"var(--muted)"],["勝率",N?Math.round(p.w*100/N)+"%":"—",""]].map(([l,x,c])=>`<div><div style="font-size:22px;font-weight:900;color:${c}">${x}</div><div class="muted">${l}</div></div>`).join("")}</div>`}</div>
    <div class="card" style="margin-top:8px"><div class="muted" style="margin-bottom:4px">你跟他下過</div>${mine.length?`<b style="font-size:17px">${mw} 勝 ${ml} 負 ${md} 和</b><span class="muted">・共 ${mine.length} 盤</span>
      <div class="items" style="padding:0;margin-top:8px">${mine.slice(0,20).map(h=>`<button class="item" data-rid="${esc(h.rid||"")}"><span class="lb">${h.res==="w"?"🏆":h.res==="l"?"💪":"🤝"}</span><span class="tx"><b>${h.res==="w"?"勝":h.res==="l"?"負":"和"}${h.d?`（積分 ${h.d>0?"+":""}${h.d}）`:""}</b><span>${new Date(h.at).toLocaleDateString()}・${h.n||0} 步${h.why?"・"+esc(h.why):""}</span></span><span class="muted">${h.rid?"看棋譜 ›":""}</span></button>`).join("")}</div>`:'<span class="muted">還沒下過</span>'}</div>
    ${window.XQNet&&XQNet.fetchHist?'<button class="btn ghost" id="pg" style="margin-top:8px">📜 他的線上棋譜・戰績分析</button>':""}
    ${live&&(live.st==="idle"||live.st==="seeking")&&opt.invite?'<button class="btn" id="pi">⚔ 邀請對戰</button>':live&&live.st==="playing"&&live.gid?'<button class="btn" id="pw">👀 觀看他的對局</button>':""}`;
    b.querySelectorAll("[data-rid]").forEach(x=>x.onclick=()=>{if(!x.dataset.rid)return;closeSheet();location.hash="#/db/pvp/"+encodeURIComponent(x.dataset.rid)});
    if(mine.length)api("/db/items?c=pvp&limit=500").then(r=>{const ids=new Set((r.items||[]).map(it=>it.id));b.querySelectorAll("[data-rid]").forEach(x=>{const rid=x.dataset.rid;if(rid&&!ids.has(rid)){x.dataset.rid="";const m=x.querySelector(".muted");if(m)m.textContent="找棋譜中…";
      const h=mine.find(q=>q.rid===rid);netRecover(h).then(ok=>{if(ok){x.dataset.rid=rid;if(m)m.textContent="看棋譜 ›"}else if(m)m.textContent="沒存到棋譜"})}})}).catch(()=>{});
    {const pg=b.querySelector("#pg");if(pg)pg.onclick=()=>{closeSheet();setTimeout(()=>playerGames(p.id||oid,p.name||name),250)}}
    const pi=b.querySelector("#pi"),pw=b.querySelector("#pw");if(pi)pi.onclick=()=>{closeSheet();opt.invite(live)};
    if(pw)pw.onclick=()=>{closeSheet();XQNet.watch(live.gid);location.hash="#/pvp"}})}
/* 意見回饋 494（開發者：「這個叫做愈練愈穩？」）：「越練越穩」原本是給進步最慢那一群的委婉說法（舊名「慢熱型」），跟「比 4% 的學棋者長得快」放在一起互相矛盾。
   改成照長棋速度的排名直接說：前 10% 學得飛快、前 30% 學習速度快、中間穩定成長、15～35% 進步偏慢、最後 15% 還沒明顯進步 */
const speedLab=p=>p==null||!isFinite(p)?"還在觀察中":p>=90?"學得飛快":p>=70?"學習速度快":p>=35?"穩定成長":p>=15?"進步偏慢":"還沒明顯進步";
/* 意見回饋 283：棋友（含虛擬玩家）公開的最近 30 盤：勝負、執紅執黑、怎麼輸的、常用開局，整理出弱點；點一盤就打開棋譜 */
function playerGames(oid,name){sheet(`📜 ${name||"棋友"} 的線上棋譜`,async b=>{b.innerHTML='<p class="muted">從大廳讀取他的對局…</p>';
  const H=await XQNet.fetchHist(oid,5000).catch(()=>null);if(!b.isConnected)return;
  /* 意見回饋 415：公開資料卡只畫一組分數——他的「我的棋力」五邊形（新版有 penK 軸名、penS 步數／題數、penL 樣本還少）＋進步速度；
     不再畫舊版的天賦長條（那是另一把尺，會跟五邊形的開局、中局、殘局對不起來） */
  const PF=H&&H.prof&&typeof H.prof==="object"?H.prof:null,num=x=>x==null||!isFinite(x)?null:Math.max(0,Math.min(100,Math.round(+x)));
  const PK=PF&&Array.isArray(PF.penK)&&PF.penK.length===5?PF.penK.map(k=>esc(String(k).slice(0,4))):["開局","中局","殘局","精準","穩定"],PL=i=>!!(PF&&Array.isArray(PF.penL)&&PF.penL[i]);
  const PS=i=>PF&&Array.isArray(PF.penS)&&isFinite(PF.penS[i])?Math.max(0,Math.round(+PF.penS[i])):null,hasPen=PF&&Array.isArray(PF.pen)&&PF.pen.some(x=>num(x)!=null);
  /* 數學修正 11/11（審查 6-A、10-A）：別人資料卡上的「勝過 X%」「比 X% 長得快」只在對方的 App 標 cal＝1（有 ≥200 人校正）時才顯示；舊版 App 發的 rPct 是先驗算的，不顯示百分比，只顯示段位文字 penT（有的話） */
  const PT=i=>PF&&Array.isArray(PF.penT)&&PF.penT[i]?esc(String(PF.penT[i]).slice(0,8)):"",pfCard=PF&&(hasPen||PF.tal)?`<div class="card" style="margin-top:8px"><b>⚔ 棋力</b>${hasPen?penSVG(PK.map((k,i)=>[k,num(PF.pen[i]),PL(i),k==="殺法"&&num(PF.pen[i])!=null?(PT(i)||"測驗"):""]),260):""}
      ${hasPen&&PK.some((_,i)=>PS(i)!=null)?`<p class="muted" style="font-size:12px;margin:4px 0 0;text-align:center">${PK.map((k,i)=>PS(i)==null?"":`${k} ${PS(i)} ${k==="殺法"?"題":"步"}`).filter(Boolean).join("・")}${PK.some((_,i)=>PL(i))?"<br>虛線、淡色＝樣本還少":""}</p>`:""}
      ${PF.tal?`<p style="margin:6px 0 0">📈 進步速度：<b>${esc(PF.tal.cal&&num(PF.tal.rPct)!=null&&PF.tal.lab!=="還在觀察中"?speedLab(num(PF.tal.rPct)):String(PF.tal.lab||"還在觀察中").replace(/慢熱型|越練越穩|學得飛快|學習速度快|穩定成長|進步偏慢|還沒明顯進步/,"還在觀察中").slice(0,8))}</b>${PF.tal.cal&&num(PF.tal.rPct)!=null?`（比 ${num(PF.tal.rPct)}% 用這個 App 的棋友長得快）`:""}</p>`:""}
      <p class="muted" style="font-size:12px;margin:6px 0 0">他自己的 App 算出來公開的${PF.at?`（${new Date(+PF.at).toLocaleDateString()}）`:""}</p></div>`:`<p class="muted" style="font-size:12.5px;margin:8px 2px 0">他還沒公開棋力五邊形（對方用新版 App 打開「我的戰績」後就會公開）。</p>`;
  /* 意見回饋 289：他還沒公開（舊版 App、虛擬玩家剛更新還沒下完新的一盤）：先用你跟他下過的對局（換成他的角度）來看 */
  const mineL=oppHist().filter(h=>h.oid===oid&&h.rid).map(h=>({gid:h.gid,id:h.rid,opp:"你",oid:"",res:h.res==="w"?"l":h.res==="l"?"w":"d",why:h.why||"",n:h.n||0,at:h.at,sd:h.sd?(h.sd==="r"?"b":"r"):null,local:1}));
  const pub=H&&H.list.length?H.list:[],L0=pub.length?pub:mineL;
  if(!L0.length){b.innerHTML=pfCard+'<p class="muted" style="line-height:1.7">他還沒有公開的線上棋譜，你也還沒跟他下過。等他下完下一盤（對方要用新版 App），這裡就會出現他最近的對局。</p>';return}
  const L=L0,N=L.length,cnt=(a,f)=>a.filter(f).length,pc=(a,b)=>b?Math.round(a*100/b):0;
  const W=cnt(L,x=>x.res==="w"),Ls=L.filter(x=>x.res==="l"),D=cnt(L,x=>x.res==="d");
  const R=L.filter(x=>x.sd==="r"),B=L.filter(x=>x.sd==="b"),wr=a=>pc(cnt(a,x=>x.res==="w"),a.length);
  const kind=x=>/超時|時間用完|沒走/.test(x.why)?"t":/離開|離線/.test(x.why)?"x":/認輸/.test(x.why)?"r":"m";
  const lk={t:0,x:0,r:0,m:0};Ls.forEach(x=>lk[kind(x)]++);
  const tips=[];
  /* ChatGPT 數值盤查 11/11（一側沒有對局卻顯示 0%）：紅黑分開寫「勝／總盤數」，沒下過的那一邊寫「尚無對局」，不寫 0%；
     「執某色比較弱」要兩邊各 ≥ 5 盤、勝率差 ≥ 25 個百分點、勝場換算差 ≥ 2 場才說（3 紅對 3 黑差 33 個百分點其實只差一場），而且附上盤數 */
  const wn=a=>cnt(a,x=>x.res==="w"),sideTx=(l,a)=>a.length?`執${l} ${wn(a)} 勝／${a.length} 盤`:`執${l}尚無對局`,gapG=Math.abs(wn(R)/Math.max(1,R.length)-wn(B)/Math.max(1,B.length))*Math.min(R.length,B.length);
  if(R.length>=5&&B.length>=5&&Math.abs(wr(R)-wr(B))>=25&&gapG>=2)tips.push(`執${wr(R)<wr(B)?"紅":"黑"}的成績差一些：${sideTx("紅",R)}、${sideTx("黑",B)}（盤數還不多，參考就好）。`);
  if(lk.t>=2||(Ls.length>=3&&lk.t/Ls.length>=.3))tips.push(`常超時：輸的 ${Ls.length} 盤裡有 ${lk.t} 盤是時間到。跟他下可以穩穩地下，把時間拖長。`);
  if(lk.r>=2&&lk.r/Math.max(1,Ls.length)>=.4)tips.push(`遇到劣勢容易提早認輸（${lk.r} 盤）：先取得一點優勢，他可能就放棄了。`);
  if(lk.x>=2)tips.push(`常中途離開（${lk.x} 盤）。`);
  const quick=cnt(Ls,x=>x.n<40),longL=cnt(Ls,x=>x.n>=80);
  if(Ls.length>=3&&quick/Ls.length>=.5)tips.push(`開局、中局容易出錯：輸的棋有 ${quick} 盤不到 20 回合就輸了。`);
  if(Ls.length>=3&&longL/Ls.length>=.5)tips.push(`殘局比較弱：輸的棋有 ${longL} 盤拖到 40 回合以後才輸。`);
  /* 意見回饋 307：先看他公開的五角形和天賦（有的話），再看勝負；不再一律說「穩定」 */
  /* 意見回饋 415：只說一句五邊形的強弱，而且只從樣本夠的軸挑；不再另外說「天賦分析裡比較弱的是…」 */
  if(PF&&Array.isArray(PF.pen)){const arr=PF.pen.map((x,i)=>[PK[i],num(x),PL(i)]).filter(x=>x[1]!=null&&!x[2]&&x[0]!=="殺法").sort((a,b)=>a[1]-b[1]);if(arr.length>=3&&arr[arr.length-1][1]-arr[0][1]>=8)tips.unshift(`棋力五邊形最弱的是「${arr[0][0]}」（${arr[0][1]} 分），最強的是「${arr[arr.length-1][0]}」（${arr[arr.length-1][1]} 分）。`)}   /* 意見回饋（開發者 11/6 分數審查）：殺法是百分位，不跟準確度比強弱 */
  if(!tips.length)tips.push(N<5?"對局還不多，看不出明顯的弱點。":pc(W,N)>=65?`最近 ${N} 盤贏了 ${W} 盤，整體很強；輸的棋沒有固定的輸法，要靠實力硬拚。`:pc(W,N)<=35?`最近 ${N} 盤只贏 ${W} 盤，整體還在進步中；輸的棋沒有集中在同一種輸法。`:`勝負差不多（${W} 勝 ${Ls.length} 負），輸的棋沒有集中在同一種輸法。`);
  const rl=x=>x.res==="w"?"勝":x.res==="l"?"負":"和";
  b.innerHTML=`<div class="card"><div style="display:grid;grid-template-columns:repeat(4,1fr);text-align:center">${[["勝",W,"var(--accent2)"],["負",Ls.length,"var(--red)"],["和",D,"var(--muted)"],["勝率",pc(W,N)+"%",""]].map(([l,x,c])=>`<div><div style="font-size:20px;font-weight:900;color:${c}">${x}</div><div class="muted">${l}</div></div>`).join("")}</div>
      <div class="muted" style="font-size:12.5px;margin-top:6px;text-align:center">最近 ${N} 盤${R.length||B.length?`・${sideTx("紅",R)}・${sideTx("黑",B)}`:""}</div></div>
    ${pfCard}
    ${pub.length?"":`<p class="muted" style="font-size:12.5px;margin:8px 2px 0">他還沒公開自己的對局（等他下完下一盤就會有），下面先用你跟他下過的 ${N} 盤來分析。</p>`}
    <div class="card" style="margin-top:8px"><b>🔎 弱點分析</b>${tips.map(t=>`<p style="margin:6px 0 0;line-height:1.6">・${esc(t)}</p>`).join("")}<p id="pgop" class="muted" style="margin:6px 0 0;font-size:13px">讀取開局習慣中…</p></div>
    <div class="sec-t">對局（點一盤看棋譜）</div><div class="items" style="padding:0">${L.map(x=>`<button class="item" data-g="${esc(x.gid)}" data-id="${esc(x.id)}"><span class="lb">${x.res==="w"?"🏆":x.res==="l"?"💪":"🤝"}</span><span class="tx"><b>${rl(x)}・對 ${esc(x.opp||"")}</b><span>${new Date(x.at).toLocaleDateString()}・${x.sd?"執"+(x.sd==="r"?"紅":"黑")+"・":""}${x.n||0} 步${x.why?"・"+esc(x.why):""}</span></span><span class="muted">›</span></button>`).join("")}</div>`;
  b.querySelectorAll("[data-g]").forEach(x=>x.onclick=async()=>{vibrate(5);
    if(!pub.length){const id=x.dataset.id,has=(await api("/db/items?c=pvp&limit=500").catch(()=>({items:[]}))).items.some(i=>i.id===id)||await netRecover({gid:x.dataset.g,rid:id});
      if(has){closeSheet();location.hash="#/db/pvp/"+encodeURIComponent(id)}else toast("這盤沒存到棋譜，伺服器上也找不到了");return}
    toast("讀取棋譜…");const g=await XQNet.fetchGame(x.dataset.g,6000).catch(()=>null);
    if(!g||g.id!==x.dataset.id){toast("伺服器上找不到這盤了（可能太久以前）");return}await XQ_savePeek(g);closeSheet();location.hash="#/db/peek/"+encodeURIComponent(g.id)});
  /* 開局習慣：抓最近 8 盤的前幾步 */
  const gs=(await Promise.all(L.slice(0,8).map(x=>XQNet.fetchGame(x.gid,4000).then(g=>g&&g.id===x.id?{g,x}:null).catch(()=>null)))).filter(Boolean);if(!b.isConnected)return;
  const red={},blk={};for(const{g,x}of gs){const cn=window.XQ_netMovesCn?XQ_netMovesCn(g,6):[];if(!cn.length)continue;const mv=cn.map(c=>({cn:c}));
    if(x.sd==="r"){const o=redOpening(cn[0]);if(o&&!/其他/.test(o))red[o]=(red[o]||0)+1}else if(x.sd==="b"&&cn.length>1){const d=blackDefence(mv);if(d&&!/其他/.test(d))blk[d]=(blk[d]||0)+1}}
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,n])=>`${k}（${n}）`).join("、");
  const op=b.querySelector("#pgop");if(op)op.textContent=gs.length?[top(red)&&"執紅常用："+top(red),top(blk)&&"執黑常用："+top(blk)].filter(Boolean).join("；")||"開局沒有固定習慣。":"伺服器上找不到他最近對局的棋步，暫時看不出開局習慣。"})}
function histList(box,reps){let kind=store.get("histKind","all"),res="",limit=40,all=null;
  const me=myName(),nh=window.XQNet&&XQNet.rating?XQNet.rating().hist:[];
  const resOf=(it,mySide)=>{const r=String(it.result||""),w=/^紅/.test(r)&&/勝|胜/.test(r)?"r":/^黑/.test(r)&&/勝|胜/.test(r)?"b":null;
    if(!w&&/中止|取消/.test(r))return"x";   // 中途取消、斷線中止：不是和棋，不計分
    if(!mySide)return w?(w==="r"?"紅勝":"黑勝"):r?"和":"";return w?(w===mySide?"w":"l"):r?"d":""};
  async function load(){const[a,b]=await Promise.all([api("/db/items?c=play&limit=500").catch(()=>({items:[]})),api("/db/items?c=pvp&limit=500").catch(()=>({items:[]}))]);
    all=a.items.map(it=>({c:"play",it,side:it.red==="你"?"r":"b",opp:it.red==="你"?it.black:it.red,k:"cpu"}))
      .concat(b.items.map(it=>{const side=pvpMySide(it);return{c:"pvp",it,side,opp:side?(side==="r"?it.black:it.red):`${it.red||"紅方"} 對 ${it.black||"黑方"}`,k:"pvp"}}))   /* 意見回饋（開發者 11/6 分數審查）：用 pvpMySide 認自己 */
      .filter(x=>x.it.result).sort((x,y)=>String(y.it.id).localeCompare(String(x.it.id)));paint()}
  function paint(){if(!all){box.innerHTML='<div class="st-list st-empty">載入中…</div>';return}
    const L=all.filter(x=>(kind==="all"||x.k===kind)&&(!res||resOf(x.it,x.side)===res));
    const cnt=k=>all.filter(x=>k==="all"||x.k===k).length;
    let h=`<div class="st-seg">${[["all","全部"],["cpu","🤖 電腦"],["pvp","👥 對人"]].map(([k,l])=>`<button data-k="${k}" class="${kind===k?"on":""}">${l}<small>${cnt(k)}</small></button>`).join("")}</div>
      <div class="st-res">${[["","全部"],["w","勝"],["l","負"],["d","和"]].map(([k,l])=>`<button data-r="${k}" class="${res===k?"on":""}">${l}</button>`).join("")}</div>`;
    if(!L.length)h+=`<div class="st-list st-empty" style="margin-top:12px">${all.length?"沒有符合的對局":"還沒有下完的對局。去挑戰電腦或線上對戰下一盤吧！"}</div>`;
    const TC5=store.get("talentCache5",{});let mon="",grp=[];const out=[],flush=()=>{if(grp.length)out.push(`<div class="st-list">${grp.join("")}</div>`);grp=[]};
    /* 意見回饋（開發者 11/6 分數審查）：gameId 是 UTC 時間，月份標題和日期改用本地時間（臺灣清晨的棋不再跑到前一天／前一個月）；id 不是時間格式的舊存檔照字面切 */
    const ld=id=>{const t=tlTime(id);if(!t)return{m:id.slice(0,7),y:id.slice(0,4),mo:+id.slice(5,7),d:id.slice(5,10).replace("-","/")};const dt=new Date(t),p=n=>String(n).padStart(2,"0");return{m:`${dt.getFullYear()}-${p(dt.getMonth()+1)}`,y:dt.getFullYear(),mo:dt.getMonth()+1,d:`${p(dt.getMonth()+1)}/${p(dt.getDate())}`}};
    for(const x of L.slice(0,limit)){const id=String(x.it.id),LD=ld(id),m=LD.m;
      if(m!==mon){flush();mon=m;out.push(`<div class="st-mon">${LD.y} 年 ${LD.mo} 月</div>`)}
      /* 意見回饋 351：人機、真人每一盤都標出我這盤的評等（S／A／B…）：賽後報告算過的、或天賦頁評好的都用
         意見回饋（開發者 11/6 分數審查）：評等改成優先用 talentCache5 的純準確度（跟五邊形同一把尺），沒有才用 reports；
         舊 reports 裡 pvp 執黑的那筆存的是對手的分數（存檔時沒記 side），認得出是執黑就不用它 */
      const r=resOf(x.it,x.side),tc=TC5[x.c+"/"+x.it.id],ta=rowAcc(tc),rp=reps[x.it.id],rpOk=rp&&!(x.c==="pvp"&&!rp.side&&x.side==="b")&&!(rp.side&&x.side&&rp.side!==x.side),
        R=ta!=null?{score:Math.round(ta),grade:gradeFor(Math.round(ta))[0]}:rpOk?rp:null,nr=x.c==="pvp"&&nh.find(hh=>hh.rid===x.it.id);
      const lab=r==="w"?"勝":r==="l"?"負":r==="d"?"和":r==="x"?"✕":(r||"—").slice(0,1);
      const why=String(x.it.result||"").replace(/^.*?（/,"").replace(/）$/,"");
      grp.push(`<button class="st-g" data-c="${x.c}" data-id="${esc(id)}"><span class="dot ${r==="w"||r==="l"?r:""}">${esc(lab)}</span><span class="tx"><b>${x.k==="cpu"?"🤖 ":"👥 "}${/-s\d+$/.test(String(x.it.id))?"🀄 車輪戰・":""}${esc(x.opp||"")}${nr&&isCloud(nr.oid)?cloudTag(true):""}${x.c==="pvp"&&x.side?` <i class="opp-i" data-oid="${esc(nr&&nr.oid||"")}" data-on="${esc(x.opp||"")}" style="font-style:normal;font-size:12px;color:var(--accent);border:1px solid var(--line);border-radius:10px;padding:0 6px;margin-left:4px">ⓘ 棋友</i>`:""}</b><span>${LD.d}・${x.side?"執"+(x.side==="r"?"紅":"黑")+"・":""}${esc(why)}${R&&nr?`・積分 ${nr.d>=0?"+":""}${nr.d}`:""}${x.it.pend>0?`・📈 還有 ${+x.it.pend} 步待分析`:""}</span></span>${R?`<b class="r gl" style="background:${gradeFor(R.score)[2]}">${R.grade}</b>`:nr?`<b class="r ${nr.d>=0?"w":"l"}">${nr.d>=0?"+":""}${nr.d}</b>`:'<span class="r muted">›</span>'}</button>`)}
    flush();h+=out.join("");
    if(L.length>limit)h+=`<button class="btn ghost" id="more" style="margin-top:12px">再顯示 40 盤（還有 ${L.length-limit} 盤）</button>`;
    if(L.length&&typeof pgnExportList==="function")h+=`<button class="btn ghost" id="stPgn" style="margin-top:8px">📤 匯出${L.length>1?`這 ${Math.min(L.length,100)} 盤`:"這盤"}的棋譜（PGN／中文記譜）</button>`;   /* 評比第 3 輪 P17：照上面的篩選一起匯出，最多 100 盤（m/10d-coach.js） */
    box.innerHTML=h;
    {const px=box.querySelector("#stPgn");if(px)px.onclick=()=>{vibrate(5);pgnExportList(L.slice(0,100).map(x=>({c:x.c,id:String(x.it.id)})))}}
    box.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{kind=b.dataset.k;store.set("histKind",kind);limit=40;paint()});
    box.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{res=b.dataset.r;limit=40;paint()});
    box.querySelectorAll("[data-id]").forEach(b=>b.onclick=e=>{const oi=e.target.closest(".opp-i");if(oi){e.stopPropagation();return oppCard(oi.dataset.oid,oi.dataset.on)}vibrate(5);if(b.dataset.c==="play"&&!reps[b.dataset.id])store.set("openReport","play/"+b.dataset.id);location.hash=`#/db/${b.dataset.c}/${encodeURIComponent(b.dataset.id)}`});
    const mo=box.querySelector("#more");if(mo)mo.onclick=()=>{limit+=40;paint()}}
  paint();load();return{paint}}   /* 意見回饋（開發者 11/6 分數審查）：回傳 paint，五邊形算完 talentCache5 有新列時可以重畫評等 */
/* 意見回饋 307、415：五角形圖（自己的戰績頁、棋友資料卡共用）。A＝[[名稱,分數,樣本還少?],…]；
   樣本還少的那一軸：連到它的邊畫虛線、點畫空心、數字變淡 */
function penSVG(A,maxW){const W=300,H=270,cx=150,cy=142,R0=92,K=A.length,pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/5,r=R0*(v||0)/100;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]};
  const ring=v=>A.map((_,i)=>pt(i,v).join(",")).join(" "),low=x=>!!x[2]||x[1]==null;
  return`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${maxW||340}px;display:block;margin:0 auto">
    ${[20,40,60,80,100].map(v=>`<polygon points="${ring(v)}" fill="none" stroke="var(--line)" stroke-width="${v===100?1.5:1}"/>`).join("")}
    ${A.map((_,i)=>{const[x,y]=pt(i,100);return`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`}).join("")}
    <polygon points="${A.map((x,i)=>pt(i,x[1]==null?0:x[1]).join(",")).join(" ")}" fill="var(--accent)" fill-opacity=".22" stroke="none"/>
    ${A.map((x,i)=>{const y=A[(i+1)%K],[x1,y1]=pt(i,x[1]||0),[x2,y2]=pt((i+1)%K,y[1]||0),d=low(x)||low(y);return`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"${d?' stroke-dasharray="5 4" stroke-opacity=".5"':""}/>`}).join("")}
    ${A.map((x,i)=>{if(x[1]==null)return"";const[px,py]=pt(i,x[1]);return x[2]?`<circle cx="${px}" cy="${py}" r="4.5" fill="var(--card)" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="2 1.6"/>`:`<circle cx="${px}" cy="${py}" r="4" fill="var(--accent)"/>`}).join("")}
    ${A.map((x,i)=>{const[lx,ly]=pt(i,128);return`<text x="${lx}" y="${ly-4}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)" font-family="var(--sans)">${x[0]}</text><text x="${lx}" y="${ly+13}" text-anchor="middle" font-size="${x[3]?11:13}" fill="var(--accent)"${x[2]?' fill-opacity=".45"':""} font-weight="900" font-family="var(--sans)">${x[1]==null?(x[3]||"—"):x[3]||x[1]}</text>`}).join("")}</svg>`}   /* 意見回饋（開發者 11/6 分數審查）：A[i][3] 可以給顯示文字（殺法軸寫「勝過 X%」） */
/* 意見回饋 307：公開自己的棋力摘要（五邊形＋進步速度），附在大廳的公開戰績裡，別人點你的資料卡就看得到 */
window.XQ_prof=()=>{const p=store.get("pubProf",null);return p&&(p.pen||p.tal)?p:null};
function setProf(x){const p={...store.get("pubProf",{}),...x,v:1,at:Date.now()};store.set("pubProf",p);try{if(window.XQNet&&XQNet.pubProf)XQNet.pubProf()}catch(e){}}
/* ================= 我的棋力（意見回饋 415：三位特級大師討論後的第一階段） =================
   一、同一把尺：開局／中局／殘局的分數全 App 只有這一套——該階段每一步的準確度 100·e^(−損失/200)，取最近約 150 步平均。
       這條式子跟賽後報告每一盤的開局／中局／殘局分一樣，所以賽後報告、我的棋力（五邊形）、大廳公開資料卡三處的數字對得起來。
       為什麼不用「3100−23×平均損失 → 等級分 → (等級分−600)/24」那條：賽後報告每盤都還是準確度，換尺就又變成一邊 89、一邊 51；
       那條對一步敗著非常敏感（一步差 800 分，殘局就從 89 掉到 51），初學者常常只剩 10～20 分。
       大錯的懲罰交給「穩定」軸，不在階段分裡重複扣；等級分那條只留給「著法品質」（我的成長 → 詳細數字），不再跟開局／中局／殘局同名。
   二、五軸：開局、中局、殘局、殺法（棋力測驗的殺法＋戰術題，分數＝勝過多少學棋者）、穩定（最近約 150 步裡失著＋敗著的比例，每 1% 扣 3 分）。
       原本的「精準」跟三個階段分是同一批著法，改成小字「走出電腦首選 X%」。
   三、樣本：實戰軸不到 30 步、殺法不到 10 題＝樣本還少：畫虛線、淡色，不拿來挑「建議先練」。全 App 只有這裡一個「建議先練」。
   四、公平：用過提示或悔棋的那盤（local.js 存檔時記 hintN／undoN）整盤不算；舊存檔沒有這兩欄就照算。 */
/* 數學修正 11/11（審查 3-B、4.2；開發者 11/11 照三方審查「先上不改分數的部分」）：
   ・每步準確度「不改」：照舊 100·e^(−損失/200)（SK.acc）。勝率尺度的新算法只在影子模式背景算（05-settings.js 的 MXS／mxShadowReport），畫面不顯示，所以快取照舊叫 talentCache5、不用重算。
   ・五軸的時間窗統一：每一盤的權重 λ^(盤序)，λ＝2^(−1/HL)（半衰期 15 盤，有效視窗約 22 盤），三個階段用同一批最近的盤，不再各自往回找 150 步（殘局軸原本反映的是很舊的自己）。
     盤序用「全部的盤」排（Claude 複審 #11：原本是「這一軸有資料的第幾盤」，殘局只有一半的盤有，時間窗會長一倍）。
     指數加權還有一個好處：加進新的一盤，軸的變化方向一定跟「這盤 − 原本」同號（滑動視窗有 14% 反號：其實是新盤減掉被擠出去的舊盤）。
   ・每軸附標準誤（以盤為群集的穩健估計；盤少時退回 σ²·deff／n，deff＝3 是同一盤的步彼此相關的設計效應——工程判斷，待資料估）。
   ・DEFF＝3、SD0＝26（一步準確度的標準差）都標「需要資料驗證」；有匿名資料後由 tools/calibrate-axes.js 估。 */
const SK={WIN:150,MIN:30,QMIN:10,HL:15,DEFF:3,SD0:26,acc:l=>100*Math.exp(-Math.max(0,+l||0)/200),
  GO:{開局:["#/openings","我的開局"],中局:["#/redo","錯棋重練"],殘局:["#/db/canju","古典殘局譜"],殺法:["#/quiz","棋力測驗"],穩定:["#/redo","錯棋重練"]}};
/* 校正檔（store calib，後台每天發）夠不夠多人：tal.people＝成長曲線人數、irtPeople＝測驗作答人數。沒有夠多人之前，百分位、「一般棋友」都只能標「暫用假設」（審查 6-A、10-A）
   開發者 11/11 照三方審查（ChatGPT）：「一般棋友」的先驗至少 100 人才當真（原本 10 人太少）；「勝過 X%」的分位表至少 200 人（下限，500～1000 人才穩） */
const MX_RK=["新手","入門1","入門2","入門3","業1","業2","業3","業4","業5","業6","業7","業8","業9","專1","專2"];
function mxCal(){const C=store.get("calib",null)||{};return{tal:C.tal&&C.tal.people>=100?C.tal:null,talN:C.tal?+C.tal.people||0:0,irtN:+C.irtPeople||0,thQ:Array.isArray(C.thQ)&&C.thQ.length>=9&&(+C.irtPeople||0)>=200?C.thQ:null,
  lrQ:C.tal&&Array.isArray(C.tal.lrQ)&&C.tal.lrQ.length>=9&&(+C.tal.people||0)>=200?C.tal.lrQ:null,ax:C.ax&&(+C.ax.people||0)>=30?C.ax:null}}
/* 經驗百分位：Q＝校正檔給的 5%、10%、…、95% 分位（19 個），線性內插；pct＝(#{θ_j<θ}＋0.5·#{θ_j＝θ})／N 的連續版（審查 6-A 的修法） */
function mxPct(x,Q){if(!Q||!Q.length)return null;const n=Q.length,p=i=>100*(i+1)/(n+1);if(x<=Q[0])return Math.max(1,Math.round(p(0)*Math.max(0,1-(Q[0]-x)/Math.max(1e-6,Q[1]-Q[0]))));
  for(let i=0;i<n-1;i++)if(x<=Q[i+1]){const f=(x-Q[i])/Math.max(1e-6,Q[i+1]-Q[i]);return Math.round(p(i)+f*(p(i+1)-p(i)))}return Math.min(99,Math.round(p(n-1)+(100-p(n-1))*Math.min(1,(x-Q[n-1])/Math.max(1e-6,Q[n-1]-Q[n-2]))))}
const mxTierName=th=>MX_RK[Math.max(0,Math.min(MX_RK.length-1,Math.round(th/QZ.S+QZ.MID)))];
/* 每盤一列（我的棋力、我的成長共用，存在 talentCache5；開發者 11/11：每步準確度照舊，快取不升版；新欄位 id／lv／A 只有新算的列有，舊列沒有就退回 SK.SD0）：我這邊評過等的步——各階段準確度加總 pa＝[加總,步數]、首選 best、失著＋敗著 bad、
   這盤用過提示或悔棋 hu；舊的列沒有 pa 就重新讀那盤算一次。只有我這邊每一步都評好才存快取，還沒評完的回傳在 pend */
async function skillRows(){
  const me=myName(),games=[];
  for(const c of["play","pvp"]){let d;try{d=await api("/db/items?c="+c+"&limit=200")}catch(e){continue}
    for(const it of d.items){const side=c==="play"?(it.red==="你"?"r":"b"):pvpMySide(it);if(side)games.push({c,id:it.id,side,res:String(it.result||""),opp:side==="r"?it.black:it.red})}}   /* 意見回饋（開發者 11/6 分數審查）：pvp 用 pvpMySide 認自己 */
  games.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const cache=store.get("talentCache5",{}),G=[],pend=[];let ch=false,smN=0;
  /* 改善單 R08 車輪戰審查（11/11）：先拿掉車輪戰、盲棋再取最近 150 盤，一場 10 桌不會擠掉一般對局的名額，也不用白評那些盤 */
  {const EX=/-(s\d+|b)$/;smN=games.filter(g=>EX.test(String(g.id))).length;const keep=games.filter(g=>!EX.test(String(g.id)));games.length=0;games.push(...keep)}
  for(const g of games.slice(-150)){const key=g.c+"/"+g.id;let row=cache[key];
    if(!row||!row.pa){let it=null;try{it=await api(`/db/item?c=${g.c}&id=${encodeURIComponent(g.id)}`)}catch(e){}
      const L=it&&it.lines&&it.lines[0];
      if(L&&it.board){const mv=L.moves.map((m,i)=>({...m,by:m.by||(i%2?"b":"r")}));
        const miss=await fillGrades(it.board,mv,g.side);if(miss)pend.push({b0:it.board,mv,side:g.side,t:tlTime(g.id),k:g.c+"/"+g.id});
        const rep=mv.some(m=>m.by===g.side&&m.q&&m.q!=="—")?gameReport(it.board,mv):null,R=rep&&rep.sides[g.side];
        if(R&&R.graded&&R.score!=null){
          const mine=rep.plies.filter(m=>m.by===g.side&&m.loss!=null&&m.q&&m.q!=="—"),ok=m=>QGOOD.includes(m.q)?1:0,of=k=>mine.filter(m=>m.phase===k);
          const w=/^紅/.test(g.res)&&/勝|胜/.test(g.res)?"r":/^黑/.test(g.res)&&/勝|胜/.test(g.res)?"b":null,res=/中止|取消/.test(g.res)?null:w?(w===g.side?"w":"l"):g.res?"d":null;
          row={score:R.score,n:R.graded,bad:(R.cnt["失著"]||0)+(R.cnt["敗著"]||0),best:(R.cnt["正著"]||0)+(R.cnt["妙著"]||0),hu:(+it.hintN||0)+(+it.undoN||0)>0?1:0,
            t:tlTime(g.id),id:key,res,opp:g.c==="play"?tlOppElo(g.opp):null,lv:g.c==="play"?tlOppLv(g.opp):null,   /* 數學修正 11/11：id 給 skillDiff 認這盤（不用時間撞號）；lv＝對手級數（成長模型的對手強度共變量） */
            pa:Object.fromEntries(["open","mid","end"].map(k=>{const a=of(k);return[k,[Math.round(a.reduce((x,m)=>x+SK.acc(m.loss),0)*10)/10,a.length]]})),
            ph:{open:of("open").map(ok).join(""),mid:of("mid").map(ok).join(""),end:of("end").map(ok).join("")},L:mine.map(m=>Math.round(m.loss)),A:mine.map(m=>Math.round(SK.acc(m.loss))),
            ek:rep.endFrom!=null?(()=>{let bb=it.board.slice();for(let i=0;i<rep.endFrom&&i<mv.length;i++){bb[mv[i].t]=bb[mv[i].f];bb[mv[i].f]=null}return endTech(bb,g.side)})():""};
          if(!miss){cache[key]=row;ch=true}}}}
    /* 開發者 11/11 選（統計複查）：車輪戰的盤（id 結尾 -s桌號）同時下很多盤、注意力分散，不算進我的棋力、準確度、成長曲線、等級分；照樣評等，檢討看得到 */
    if(row&&!row.skip){if(/-(s\d+|b)$/.test(g.id))smN++;else G.push(row)}}   /* 11/11：盲棋（id 結尾 -b）也不算 */
  if(ch)store.set("talentCache5",cache);
  return{G,pend,smN}}
/* 五軸的分數。G＝skillRows 的列，IR＝tlIRT(測驗紀錄)。每軸回傳 {k 名稱, v 分數, n 步數或題數, u 單位, g 盤數, ok 樣本夠, go [入口, 名稱]} */
/* 數學修正 11/11（審查 3-A、3-B）：每軸＝指數加權平均（同一個時間窗）＋標準誤 se；穩定＝沒有失著、敗著的步數比例（0～100，跟準確度一樣「越高越好、100 滿分」，不再是 100−300×失誤率）。
   z＝(軸值−同段位棋友平均)／同段位標準差，只有校正檔 calib.ax（tools/calibrate-axes.js，≥30 人）有這一軸、這一段的基準時才算得出來；沒有就 null。
   綜合＝三個階段加權合起來的每步準確度（＝全部步的準確度平均），穩定另外看、不進綜合（原本穩定軸跟階段分重複扣大錯，審查 3-A） */
/* 開發者 11/11 照三方審查（Claude 複審 #11）：權重用「全部的盤」的盤序 j（R 已經新到舊排好），不是「這一軸有資料的第幾盤」，三個階段才真的看同一段時間；gn 只算這一軸有資料的盤數（畫面寫「近 X 盤」） */
function mxAxisPt(R,pick,lam,sd0){let S=0,N=0,n0=0,gn=0,j=-1;const J=[];
  for(const g of R){j++;const x=pick(g);if(!(x&&x[1]>0))continue;const w=Math.pow(lam,j);S+=w*x[0];N+=w*x[1];n0+=x[1];gn++;J.push([w,x[0],x[1],x[2]])}
  if(!N)return{v:null,m:null,se:null,n:0,n0:0,g:0};const m=S/N;
  /* 標準誤：以盤為群集 SE²＝Σ(W_j·(ā_j−m))²／(ΣW_j)²（W_j＝w_j·n_j；Cameron & Miller 2015 的 cluster-robust 寫法）；盤數 <4 或算出來比模型值小就用 σ²·deff·Σ(w²n)／(Σw·n)² */
  let s1=0,s2=0,sv=0,sn=0;for(const[w,s,n,ss]of J){const d=s/n-m;s1+=w*n*w*n*d*d;s2+=w*w*n;if(ss!=null){sv+=ss;sn+=n}}
  const sdm=sn>1?Math.sqrt(Math.max(0,sv/sn)):sd0,seM=Math.sqrt(sdm*sdm*(gn>=8?1:SK.DEFF)*s2)/N,seC=gn>=4?Math.sqrt(s1)/N:0;   /* 盤數夠（≥8）時以群集估計為主，模型值只當下限（deff 不再乘；模擬 sim-pick-se.js：乘了會把 se 高估 1.5 倍、抓不到真的弱項） */
  return{v:Math.round(m),m,se:Math.max(seM,seC),n:Math.round(N),n0,g:gn}}
function skillAxes(G,IR){const R=(G||[]).filter(g=>g&&g.pa&&!g.hu).sort((a,b)=>(b.t||0)-(a.t||0)),out=[],lam=Math.pow(.5,1/SK.HL),CAL=mxCal(),AX=CAL.ax,NR=(()=>{try{return window.XQNet&&XQNet.rating?XQNet.rating().rank:null}catch(e){return null}})();
  const sq=g=>{if(!g.A||!g.A.length)return null;const m=g.A.reduce((a,b)=>a+b,0)/g.A.length;return g.A.reduce((a,b)=>a+(b-m)*(b-m),0)};   /* 這盤每步準確度的離均差平方和（估 σ 用）；舊列沒有 A → 用 SK.SD0 */
  for(const[k,l]of[["open","開局"],["mid","中局"],["end","殘局"]]){const a=mxAxisPt(R,g=>{const x=g.pa[k];return x?[x[0],x[1],x[1]===g.n?sq(g):null]:null},lam,SK.SD0);out.push({k:l,...a,u:"步",key:k})}
  /* 意見回饋（開發者 11/6 分數審查）：殺法軸跟另外四軸不同尺——標 pct:1，不進「綜合」、不進「建議先練」。
     數學修正 11/11（審查 6-A）：Φ(θ)×100 不是「勝過 X% 學棋者」（那是假設全體 θ～N(0,1) 且平均在業4，新手會看到 0%）。
     校正檔有 ≥200 人的 θ 分位（calib.thQ）才算經驗百分位；沒有就顯示「約 業2 程度」這種段位名稱，五邊形的長度用階數換算（0～100） */
  const ir=IR&&IR.殺戰,pq=ir?mxPct(ir.th,CAL.thQ):null,tier=ir?Math.max(0,Math.min(14,ir.th/QZ.S+QZ.MID)):null;
  out.push({k:"殺法",v:ir?(pq!=null?pq:Math.round(100*tier/14)):null,txt:ir?(pq!=null?`勝過${pq}%`:`約${mxTierName(ir.th)}`):"",est:pq==null,n:ir?ir.n:0,g:0,u:"題",pct:1});
  const st=mxAxisPt(R,g=>g.n?[100*(g.n-(g.bad||0)),g.n,null]:null,lam,45);let best=0,bn=0,j=0;for(const g of R){const w=Math.pow(lam,j++);if(!g.n)continue;best+=w*(g.best||0);bn+=w*g.n}
  out.push({k:"穩定",...st,u:"步",key:"stab",best:bn?Math.round(best*100/bn):null});
  for(const a of out){a.ok=a.v!=null&&a.n>=(a.u==="題"?SK.QMIN:SK.MIN);a.go=SK.GO[a.k];
    const B=AX&&a.key&&AX.byRank&&NR&&AX.byRank[NR]&&AX.byRank[NR][a.key];if(B&&B.n>=30&&B.sd>0&&a.m!=null){a.z=(a.m-B.mu)/B.sd;a.zse=a.se/B.sd;a.grp=B.n}else{a.z=null;a.zse=null}}
  return out}
/* 綜合＝三個階段合起來的每步準確度（各軸 m 用加權步數合成），附標準誤 */
function mxTotal(A){let s=0,n=0,v=0;for(const a of A){if(a.pct||a.key==="stab"||a.m==null||!a.n)continue;s+=a.m*a.n;n+=a.n;v+=a.se*a.se*a.n*a.n}return n?{v:Math.round(s/n),m:s/n,se:Math.sqrt(v)/n,n}:null}
/* 建議先練（審查 3-B）：四軸不是同一把尺——有同段位基準時比 z 分數（含穩定）；沒有時只比三個階段的準確度（同一單位），穩定不進來。
   最高、最低差距要超過 2·√(se_lo²＋se_hi²)（約 2 個標準誤，雙側 95%）才說有弱項，不然說「差不多」（原本的「差 5 分」還不到 1 個標準誤）。
   開發者 11/11 照三方審查（ChatGPT 建議、Claude 複審的 1.64 與 2 的取捨）：說法分三級信心，conf 欄位——
     hi  差距 ≥ 2 個標準誤 →「建議先練〇〇」（回傳 weak；07z2-statmap 只看 weak，地圖上的朱圈只畫高信心的）
     mid 1.64 ≤ 差距／標準誤 < 2（單側 95%）→「可能先看〇〇」（回傳 maybe，不回傳 weak）
     lo  樣本不夠（none），或差距 < 1.64 個標準誤而且門檻還很寬（2 個標準誤 > 8 分，約 20 盤以下；z 尺度 > 0.8）→「資料還少，先多下幾盤」
     even 差距 < 1.64 個標準誤、門檻已經夠窄（資料夠多）→ 各項差不多
   8 分、0.8 是工程判斷（sim/sim-pick-conf.js 看各級出現的比例） */
function skillPick(A){const grp=A.filter(a=>a.ok&&!a.pct).every(a=>a.z!=null)&&A.some(a=>a.z!=null),ok=A.filter(a=>a.ok&&!a.pct&&(grp||a.key!=="stab"));if(ok.length<2)return{none:true,conf:"lo"};
  const val=a=>grp?a.z:a.m,sev=a=>grp?a.zse:a.se,s=ok.slice().sort((a,b)=>val(a)-val(b)),lo=s[0],hi=s[s.length-1],gap=val(hi)-val(lo),se=Math.sqrt(sev(lo)**2+sev(hi)**2),th=2*se;
  return gap>=th?{weak:lo,hi,th,grp,conf:"hi"}:gap>=1.64*se?{maybe:lo,hi,th,grp,conf:"mid"}:{even:true,lo,hi,th,grp,conf:th>(grp?.8:8)?"lo":"even"}}
/* 開發者 11/11「下完一局接著看到我的成長變化」：這一盤（挑戰電腦 id）算進去前、後的我的棋力——跟五邊形同一套（skillRows／skillAxes，綜合＝樣本夠的準確度軸平均）。
   回傳 {hu 用過提示或悔棋, acc 這盤每步準確度, avg 這盤之前最近約 150 步的平均, t0／t1 綜合前後, ax 四個準確度軸前後}；這盤還沒評好等＝null */
/* 開發者 11/11 選「下一盤目標」（ChatGPT 15 號方案 2「下一盤只練一件事」＋Gemini 76 號方案 4「零失誤挑戰」合併）：
   跟電腦下完（快局、練功房、晉級賽），從這盤挑一件事當下一盤的目標；下一盤開局提示一次，下完結算說達成沒有，再給新目標。
   挑法：有敗著→零敗著；失著 2 步以上→失著 ≤ 1；都乾淨→每步準確度守住（用最近平均＋2 往下取 5 的倍數；統計審查 4.3(5)：用單一盤訂門檻會吃到回歸平均，下一盤大多達不到）。我方評過等的步不到 8 步＝太短，不出目標也不判定。
   存在 nextGoal {k,v,from 出題那盤 id,at,shown 提示過的那盤}，兩天沒下就作廢 */
const NG_TXT=g=>g.k==="blun"?"零敗著":g.k==="mist"?`失著 ≤ ${g.v}`:`每步準確度守住 ${g.v}`;
function ngCount(mv,hu){const o={n:0,mist:0,blun:0};for(const m of mv||[]){if(m.by!==hu)continue;const q=qNow(m);if(!q||q==="—")continue;o.n++;if(q==="失著")o.mist++;if(q==="敗著")o.blun++}return o}
function ngPick(c,acc){if(!c||c.n<8)return null;if(c.blun)return{k:"blun",v:0};if(c.mist>=2)return{k:"mist",v:1};if(acc!=null&&acc>=10)return{k:"acc",v:Math.floor((acc+2)/5)*5};return null}
function ngJudge(g,c,acc){if(!g||!c||c.n<8)return null;const ok=g.k==="blun"?c.blun===0:g.k==="mist"?c.mist<=g.v:acc!=null&&acc>=g.v;return{ok,got:g.k==="blun"?`敗著 ${c.blun} 步`:g.k==="mist"?`失著 ${c.mist} 步`:`準確度 ${acc==null?"—":acc}`}}
function ngGet(){const g=store.get("nextGoal",null);return g&&Date.now()-(g.at||0)<2*864e5?g:null}
async function skillDiff(id){const{G}=await skillRows(),t=tlTime(id),row=G.find(g=>g.id==="play/"+id)||G.find(g=>g.t===t);if(!row||!row.pa)return null;   /* 數學修正 11/11：先用 c/id 認這盤，舊列才用時間（同一秒結束會撞） */
  const IR=tlIRT(store.get("quizLog",[])),G0=G.filter(g=>g!==row),A0=skillAxes(G0,IR),A1=skillAxes(G,IR),T0=mxTotal(A0),T1=mxTotal(A1),a=rowAcc(row);
  /* 統計審查（數學模型審查_20261111.md 4.2、4.3）：①這盤 vs 最近平均用 z＝(這盤−平均)／√(單盤標準誤²＋4²)（4＝盤與盤之間的起伏，工程判斷待資料驗證），|z|<1＝跟平常差不多，≥2 才算明顯；
     ②綜合、各軸都是指數加權平均（skillAxes），所以 t1−t0、各軸的 Δ 就是「加進這盤」的效果，正負號一定跟這盤表現一致，不再另外算一套；
     ③某一項只有 |Δ| ≥ 2 倍標準誤（Δ 的標準誤＝w·√(這盤的標準誤²＋舊軸的標準誤²)，w＝這盤在新軸裡的權重）才拿出來講，避免從四個雜訊裡挑最大的。
     開發者 11/11 照三方審查（Claude 複審 #10）：盤與盤之間的起伏從 4 改 6（36）——修正者自己的模擬就假設 6，用 4 時「明顯」出現約 10%（理想 5%）；仍標「需資料驗證」 */
  const As=row.A||[],nL=As.length||row.n||0,mu=As.length?As.reduce((x,y)=>x+y,0)/As.length:0,sd=Math.max(15,As.length>1?Math.sqrt(As.reduce((x,y)=>x+(y-mu)**2,0)/(As.length-1)):SK.SD0),
    AV=T0?T0.v:null,z=a!=null&&AV!=null&&nL?(a-AV)/Math.sqrt(sd*sd/nL+36):null,
    eff=A0.filter(x=>!x.pct&&x.m!=null&&x.ok).map(x=>{const y=A1.find(q=>q.k===x.k);if(!y||y.m==null)return null;let k,g;if(x.key==="stab"){k=row.n||0;if(!k)return null;g=100*(k-(row.bad||0))/k}else{const q=row.pa[x.key];if(!q||!q[1])return null;k=q[1];g=q[0]/k}
      const w=k/(k+x.n),seg=x.key==="stab"?Math.sqrt(Math.max(g*(100-g),400)/k):Math.sqrt(sd*sd/k),seD=w*Math.sqrt(seg*seg+x.se*x.se),d=y.m-x.m;return{k:x.k,d,sig:Math.abs(d)>=2*seD}}).filter(Boolean),
    dT=T0&&T1?T1.m-T0.m:null,big=eff.filter(e=>e.sig&&Math.abs(e.d)>=1).sort((p,q)=>Math.abs(q.d)-Math.abs(p.d))[0]||null;
  return{hu:!!row.hu,acc:a==null?null:Math.round(a),avg:AV,z,dT,big,t0:T0?T0.v:null,t1:T1?T1.v:null}}
async function skillPentagon(box){
  const{G,smN}=await skillRows();if(!box.isConnected)return;
  const A=skillAxes(G,tlIRT(store.get("quizLog",[]))),hu=G.filter(g=>g.hu).length;
  if(A.every(a=>a.v==null)){box.innerHTML='<div class="muted" style="text-align:center;padding:10px">還沒有評過等的對局。下完一盤挑戰電腦或線上對戰，Pikafish 評完等就會畫出你的棋力五邊形。</div>';return{G,A}}
  /* 意見回饋（開發者 11/6 分數審查）：「綜合」只平均四個準確度軸（開局、中局、殘局、穩定）；殺法是「勝過 X% 學棋者」的百分位，畫在五邊形上但不進平均、不進建議先練 */
  /* 數學修正 11/11：綜合＝三個階段合起來的每步準確度（mxTotal，附標準誤）；穩定、殺法不進綜合。綜合不再掛 S～D（GRADES 是給一盤棋設計的，審查 2-A），只給分數和 ± 範圍 */
  const nG=Math.max(0,...A.map(a=>a.g||0)),TT=mxTotal(A),total=TT?TT.v:null,pk=skillPick(A),st=A[4],cal=mxCal();
  setProf({pen:A.map(a=>a.v),penK:A.map(a=>a.k),penS:A.map(a=>a.n),penL:A.map(a=>a.v!=null&&!a.ok?1:0),penT:A.map(a=>a.txt||""),penN:nG});
  /* 開發者 11/11 照三方審查：建議先練分三級信心（skillPick 的 conf）——高「建議先練〇〇」、中「可能先看〇〇」、低「資料還少，先多下幾盤」；資料夠多、差距又在正常起伏內才說「差不多」 */
  const thTx=pk.th!=null?(pk.grp?`${pk.th.toFixed(1)} 個標準差`:`${Math.round(pk.th)} 分`):"",
    tip=pk.weak?`<button class="btn" data-go="${pk.weak.go[0]}" style="width:100%;margin-top:10px">🎯 建議先練：${pk.weak.k}（${pk.weak.v} 分）・${pk.weak.go[1]} ›</button><div class="muted" style="font-size:12px;margin-top:4px;text-align:center">${pk.grp?"跟同段位棋友比，這一項落後最多（差距超過正常起伏）":`開局、中局、殘局裡最低，而且跟最高的差距（${pk.hi.v}−${pk.weak.v}）超過正常起伏（約 ${thTx}）；穩定、殺法另外看`}</div>`
    :pk.maybe?`<button class="btn ghost" data-go="${pk.maybe.go[0]}" style="width:100%;margin-top:10px">🔎 可能先看：${pk.maybe.k}（${pk.maybe.v} 分）・${pk.maybe.go[1]} ›</button><div class="muted" style="font-size:12px;margin-top:4px;text-align:center">${pk.grp?"跟同段位棋友比，這一項好像落後一點":`開局、中局、殘局裡最低（${pk.hi.v}−${pk.maybe.v}）`}，但差距只比正常起伏（約 ${thTx}）小一點，還不能確定；再下幾盤會更準</div>`
    :pk.even&&pk.conf==="even"?`<p class="muted" style="margin:8px 0 0;line-height:1.6">${pk.grp?"跟同段位棋友比，各項":"開局、中局、殘局"}差不多（${pk.lo.k} ${pk.lo.v}～${pk.hi.k} ${pk.hi.v}，差距在正常起伏 ${thTx} 以內），還看不出明顯的弱項。想再上一層，挑一項按「去練」。</p>`
    :pk.even?`<p class="muted" style="margin:8px 0 0;line-height:1.6">📋 資料還少，先多下幾盤。現在${pk.grp?"各項":"開局、中局、殘局"}的差距（${pk.lo.k} ${pk.lo.v}～${pk.hi.k} ${pk.hi.v}）還在正常起伏（約 ${thTx}）以內，看不出哪一項比較弱${pk.grp?"":"；如果想挑一個練，殘局的步數通常最少、最值得多下幾盤"}。</p>`
    :`<p class="muted" style="margin:8px 0 0;line-height:1.6">📋 資料還少，先多下幾盤。開局、中局、殘局每項要有 ${SK.MIN} 步（至少兩項夠了），才能告訴你先練哪一項；多下幾盤挑戰電腦就有了。</p>`;
  /* 開發者 11/12：「我的戰績五邊形的殺法都是—」——殺法只從棋力測驗的殺法、戰術題算（滿 3 題才估得出），沒分數時原本只寫「—」、按鈕卻叫人去主題訓練（練了也不會有分數）。
     改成：沒分數寫「未測」、說已做幾題還差幾題、按鈕改「做棋力測驗」；有分數才照舊去主題訓練 */
  const KQ=(store.get("quizLog",[])||[]).reduce((s,e)=>s+((e&&e.a)||[]).filter(x=>{const k=x[4]||(x[2]?"殺法":null);return k==="殺法"||k==="戰術"}).length,0),KQ_MIN=3;
  const rowH=a=>`<div class="skr${a.v!=null&&!a.ok?" low":""}"><div class="nm"><b>${a.k}</b><small>${a.k==="殺法"&&a.v==null?(KQ?`棋力測驗做了 ${KQ} 題殺法、戰術題，滿 ${KQ_MIN} 題才算得出來（還差 ${Math.max(1,KQ_MIN-KQ)} 題）`:"殺法只從「棋力測驗」的殺法、戰術題算，還沒做過"):a.n?`約 ${a.n} ${a.u}${a.g?`・近 ${a.g} 盤`:""}`:a.u==="題"?"還沒做測驗":"還沒有"}${a.v!=null&&!a.ok?"・樣本還少":""}${a.pct?(a.est?"・棋友資料還不夠多，先用測驗的段位估・不進綜合":"・跟用這個 App 的棋友比・不進綜合"):a.key==="stab"?"・不進綜合":""}${a.z!=null?`・同段位 z ${a.z>=0?"+":""}${a.z.toFixed(1)}`:""}</small></div><b class="sc">${a.v==null?(a.k==="殺法"?"未測":"—"):a.pct?a.txt:`${a.v}<small class="muted" style="font-weight:400"> ±${Math.round(1.28*(a.se||0))}</small>`}</b>${(g=>`<button data-go="${g[0]}">去練：${g[1]} ›</button>`)(a.k==="殺法"?(a.v==null?["#/quiz","做棋力測驗"]:["#/theme/"+encodeURIComponent(weakTheme()),"主題訓練・"+weakTheme()]):a.go)}</div>`;
  box.innerHTML=penSVG(A.map(a=>[a.k,a.v,a.v!=null&&!a.ok,a.pct&&a.v!=null?a.txt:a.k==="殺法"&&a.v==null?"未測":""]))+`<div class="row" style="justify-content:space-between;margin-top:4px"><span class="muted">最近 ${nG} 盤${st.best!=null?`・走出好棋 ${st.best}%`:""}</span><b>${total==null?"綜合 —":`綜合 ${total} 分<small class="muted" style="font-weight:400"> ±${Math.round(1.28*TT.se)}</small>`}</b></div>
    ${tip}<div class="skl">${A.map(rowH).join("")}</div>
    <p class="muted" style="font-size:12px;margin:6px 0 0;line-height:1.6">虛線、淡色＝樣本還少（實戰不到 ${SK.MIN} 步、殺法不到 ${SK.QMIN} 題），先參考就好。「±」＝十次裡大約八次會落在這個範圍。${hu?`用過提示或悔棋的 ${hu} 盤不算。`:""}${smN?`車輪戰、盲棋的 ${smN} 盤不算。`:""}</p>
    <details style="margin-top:6px"><summary class="muted">五項怎麼算？</summary><p class="muted" style="line-height:1.7;margin:6px 0 0">每一步的準確度＝100×e^(−少掉的分數÷200)（100＝走到電腦首選；比首選少 1 兵約 61 分），跟賽後報告同一條式子。開局、中局、殘局：最近的對局裡該階段每一步準確度的平均，越近的盤越重（半衰期 ${SK.HL} 盤，三個階段看的是同一段時間），跟賽後報告每盤的開局、中局、殘局分同一把尺。穩定：最近對局裡沒有失著、敗著的步數比例。綜合：開局、中局、殘局合起來的每步準確度。「走出好棋」＝正著、妙著（跟電腦首選差不到 30 分）的步數比例。殺法：棋力測驗的殺法、戰術題；${cal.thQ?"分數＝勝過多少用這個 App 的棋友（匿名資料算的）":"現在棋友資料還不夠多，先用測驗估的段位表示（等資料夠了會改成勝過多少棋友）"}，跟準確度不是同一把尺，不進綜合。建議先練：差距超過正常起伏（約 2 個標準誤）才說「建議先練」，接近（1.64～2 個）說「可能先看」，再小就是「資料還少」或「差不多」${cal.ax?"，而且是跟同段位棋友比":"；等同段位棋友的資料夠了，會改成跟同段位比（開局本來就比較容易拿高分）"}。只算 Pikafish 評過等的著法；用過提示或悔棋的那盤不算；還沒評等的對局，打開賽後報告評等後就會算進來。進步得多快看「📈 我的成長」。</p></details>`;
  box.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{vibrate(5);location.hash=b.dataset.go});return{G,A}}
/* 意見回饋 301：記錄練習時間（對局、測驗、猜著法、錯棋重練的畫面開著、而且 2 分鐘內有操作，每 15 秒記 0.25 分鐘） */
let PRACT_ACT=Date.now();addEventListener("pointerdown",()=>PRACT_ACT=Date.now(),{passive:true});
setInterval(()=>{try{if(document.visibilityState!=="visible"||Date.now()-PRACT_ACT>120000)return;const r=(location.hash.split("/")[1]||"");
  if(!["cpu","pvp","quiz","guess","redo"].includes(r))return;const d=localDay(),m=store.get("practiceMin",{});m[d]=Math.round(((m[d]||0)+.25)*100)/100;
  const ks=Object.keys(m).sort();while(ks.length>400)delete m[ks.shift()];store.set("practiceMin",m)}catch(e){}},15000);
/* 意見回饋 307：後台每天用大家的資料校正的參數（題目難度、各段位的成長參數），從大廳拿，不用等改版 */
setTimeout(()=>{try{if(OFF&&window.XQNet&&XQNet.calib&&Date.now()-((store.get("calib",null)||{}).got||0)>6*36e5)XQNet.calib(8000).then(s=>{try{const x=JSON.parse(s);if(x&&x.at)store.set("calib",{...x,got:Date.now()})}catch(e){}})}catch(e){}},12000);
const practiceTotal=()=>Object.values(store.get("practiceMin",{})).reduce((a,b)=>a+b,0);
/* ================= 🧬 天賦系統 v2（意見回饋 296、297：照開發者的〈用數學模型建構棋藝「天賦系統」〉） =================
   天賦≠目前很強。把天賦拆成可以分別估計的參數 τ＝(起點 S₀、學習速率 r、天花板 A、能力剖面 θ⃗、穩定度 σ)，每一項都附不確定度。
   測量層：Glicko（對電腦的勝負→等級分＋不確定度 RD）、多維 IRT 3PL（測驗：殺棋題／一般題各一個 θ）、
           Regan 著法品質模型（每一步的損失 δ：P(δ)∝exp(−(δ/s)^c)，s＝敏感度、c＝一致性）
   動態層：階層貝氏成長模型 S(P)＝A−(A−S₀)·e^(−r·P)，P＝累積練習量（對局數＋測驗次數×0.5），用群體先驗收縮、網格求後驗；
           Kalman 濾波即時追蹤目前能力；BKT（貝氏知識追蹤）估開局／中局／殘局各自的學習機率 P(T) 與掌握度
           （開發者 11/11 照三方審查：Regan 改成只算平均、中位數的 tlAcpl；BKT 改成 Beta-二項式 tlBeta；Kalman 這次先留著，換掉會改到「每步準確度」那格的數字）
   應用層：里程碑預測（後驗算出「再練多少可到某準確度」，並含「可能到不了」的機率）、找弱項推薦練習
   群體先驗（一般學棋者的平均）是模型假設；資料越多，個人資料的權重越大 */
const PHI=z=>{const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),q=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-q:q};
const lnGamma=x=>{const g=7,c=[.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(x<.5)return Math.log(Math.PI/Math.sin(Math.PI*x))-lnGamma(1-x);x-=1;let a=c[0];const t=x+g+.5;for(let i=1;i<9;i++)a+=c[i]/(x+i);return .5*Math.log(2*Math.PI)+(x+.5)*Math.log(t)-t+Math.log(a)};
const TL={S0:[55,12],A:[82,8],lr:[Math.log(.06),.8],LV:[800,1000,1300,1600,1900,2200,2500,2800],
  RK:["新手","入門1","入門2","入門3","業1","業2","業3","業4","業5","業6","業7","業8","業9","專1-1","專1-2","專2-1","專2-2"]};
/* 18 級（新手～專3）對手強度：舊 8 級的估值放在對應的新級數上，中間補平 */
const TL_LV18=[700,800,900,1000,1150,1300,1400,1500,1600,1750,1900,1975,2050,2125,2200,2500,2650,2800];
/* 意見回饋（開發者 11/6 分數審查）：積分挑戰（段位）也查 TL_LV18（第 N 級＝TL.RK[N−1]，local.js 的 LEVELS 同一張表），同一強度不再變成兩種 Elo */
const tlOppElo=n=>{n=String(n||"");let m=/第(\d+)級/.exec(n);if(m)return TL_LV18[+m[1]-1]||null;m=/(?:積分挑戰|晉級賽)（([^）]+)）/.exec(n);if(m){const i=TL.RK.indexOf(m[1]);return i>=0?TL_LV18[i]||null:null}return null};
/* 數學修正 11/11（審查 10-C）：對手級數（1～18），成長模型的對手強度共變量用；積分挑戰照段位名對回級數 */
const tlOppLv=n=>{n=String(n||"");let m=/第(\d+)級/.exec(n);if(m)return+m[1];m=/(?:積分挑戰|晉級賽)（([^）]+)）/.exec(n);if(m){const i=TL.RK.indexOf(m[1]);return i>=0?i+1:null}return null};
const tlTime=id=>{const m=/^(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)/.exec(String(id));return m?Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`):0};
const wq=(xs,ws,q)=>{const o=xs.map((x,i)=>[x,ws[i]]).sort((a,b)=>a[0]-b[0]);let s=0;const T=o.reduce((a,b)=>a+b[1],0);for(const[x,w]of o){s+=w;if(s>=q*T)return x}return o.length?o[o.length-1][0]:null};
/* 測量層 1：Glicko（每盤一個評分期，RD 隨時間變大；Glickman 1999 的 g(RD)、E、d²、r'、RD'）
   數學修正 11/11（審查 7-A）：對手（18 級電腦）的 RD 從 50 改 150——TL_LV18 是估的，不確定度應有 150～200；等 tools/calibrate-levels.js 用循環賽校準過再降 */
function tlGlicko(G){let r=1200,RD=350;const q=Math.LN10/400,gf=d=>1/Math.sqrt(1+3*q*q*d*d/(Math.PI*Math.PI));let n=0;
  for(const x of G){if(x.opp==null||!x.res)continue;RD=Math.min(350,Math.sqrt(RD*RD+30*30));const g=gf(150),E=1/(1+Math.pow(10,-g*(r-x.opp)/400)),s=x.res==="w"?1:x.res==="d"?.5:0;
    const d2=1/(q*q*g*g*E*(1-E)),den=1/(RD*RD)+1/d2;r+=q/den*g*(s-E);RD=Math.sqrt(1/den);n++}
  return n?{r,RD,n}:null}
/* 測量層 2：多維 IRT（3PL，猜對率 c=0.05；殺棋題、一般題各估一個 θ，網格求後驗）
   數學修正 11/11（審查 6-B、6-D）：題目參數改用測驗當時存進 quizLog 的 a、b（x[7]、x[8]：含 gap 推的鑑別度、吃子題 −0.15、校正檔），跟測驗結果頁同一套，不再固定 a＝1.2；
   舊紀錄沒有 a、b 的才退回 (階−(n−1)/2)·0.55、a＝1.2。先驗不再是 N(0,1)（會把新手往業4 拉 0.8 階）：校正檔有 ≥30 人的群體平均、標準差（calib.thMu／thSd）就用它，
   沒有就用弱資訊的 N(−1.5, 2²)（工程判斷：使用者多半入門～業1；對真實 θ＝−3、20 題 a＝1.2 的偏差從 +0.8 降到約 +0.1，見 sim/sim-irt-prior.js） */
function tlIRT(QL){const C=store.get("calib",null)||{},pm=isFinite(+C.thMu)&&(+C.irtPeople||0)>=30?[+C.thMu,Math.max(.5,+C.thSd||1)]:[-1.5,2];
  const dims={all:[],殺法:[],戰術:[],局面:[],殘局:[],殺戰:[]};for(const s of QL)for(const x of s.a){const it={b:x[8]!=null&&isFinite(+x[8])?+x[8]:(x[0]-(s.n-1)/2)*.55,a:x[7]!=null&&isFinite(+x[7])&&+x[7]>0?+x[7]:1.2,u:x[1]};dims.all.push(it);const k=x[4]||(x[2]?"殺法":null);if(k&&dims[k]){dims[k].push(it);if(k==="殺法"||k==="戰術")dims.殺戰.push(it)}}
  const est=A=>{if(A.length<3)return null;const th=[],w=[];for(let t=-5;t<=5.001;t+=.05){let L=-(t-pm[0])*(t-pm[0])/(2*pm[1]*pm[1]);for(const q of A){const P=.05+.95/(1+Math.exp(-q.a*(t-q.b)));L+=q.u?Math.log(P):Math.log(1-P)}th.push(t);w.push(L)}
    const mx=Math.max(...w),W=w.map(x=>Math.exp(x-mx)),S=W.reduce((a,b)=>a+b,0),m=th.reduce((a,t,i)=>a+t*W[i],0)/S,sd=Math.sqrt(th.reduce((a,t,i)=>a+(t-m)**2*W[i],0)/S);return{th:m,sd,n:A.length}};
  const o={all:est(dims.all)};for(const k of["殺法","戰術","局面","殘局","殺戰"])o[k]=est(dims[k]);return o}   /* 殺戰＝殺法＋戰術（意見回饋 415：我的棋力的殺法軸）。開發者 11/11 照三方審查（Claude 複審 #13）：網格從 ±4 放寬到 ±5——新手 θ≈−3.85 貼著 −4 的邊界，20 題時仍偏高約 0.3 */
/* 數學修正 11/11（審查 8-A、8-B）：原本的 tlRegan 不是 Regan & Haworth (2011) 的著法選擇模型（那要每步的 multi-PV），只是「實現損失」的單變數分布，s、c、3100−23·acpl 的等級分也都沒顯示；
   改成只算平均每步少幾分（acpl）和中位數（對一步敗著不敏感），名稱照畫面「平均每步少」 */
function tlAcpl(L){if(L.length<30)return null;const D=L.map(x=>Math.max(0,Math.min(1000,+x||0))),N=D.length,s=D.slice().sort((a,b)=>a-b);return{acpl:D.reduce((a,b)=>a+b,0)/N,med:s[N>>1],n:N}}
/* 數學修正 11/11（審查 9-A～9-C）：BKT 拿掉——同一盤殘局連續的步不是獨立的「練習機會」、四參數可辨識性差（Beck & Chang 2007），而且原本把資料接自己一次湊 15 筆。
   改成 Beta-二項式收縮（Gelman et al., Bayesian Data Analysis 2.4 節）：p̂＝(k＋α)／(n＋α＋β)，α＝β＝2；80% 區間用常態近似；排序用 80% 上界（越不確定越值得先練，UCB／Thompson 的想法） */
function tlBeta(k,n){const a=2,b=2,N=n+a+b,m=(k+a)/N,v=m*(1-m)/(N+1),s=Math.sqrt(v);return{now:m,lo:Math.max(0,m-1.28*s),hi:Math.min(1,m+1.28*s),n}}
/* ChatGPT 數值盤查 11/11（猜大師著法的分母）：一局猜著法真的「猜」了幾步（不含「看大師怎麼走」）。新存檔有 tr（03-home-quiz.js 拆存的嘗試數）；
   舊存檔從 h 回算（每步一個字：1 猜中、0 沒中、- 看答案）；更舊、沒有 h 的只能用 n。天賦的練習量、週報都用它 */
function gsTried(q){if(!q)return 0;if(q.tr!=null&&isFinite(+q.tr))return+q.tr;if(typeof q.h==="string")return q.h.replace(/-/g,"").length;return q.n!=null?+q.n||0:15}
/* 動態層 2：階層貝氏成長模型（群體先驗收縮），網格後驗 */
function tlGrowth(Y,P){const N=Y.length;if(N<3)return null;const S0s=[],As=[],Rs=[];for(let v=30;v<=85.01;v+=2.5)S0s.push(v);for(let v=50;v<=99.01;v+=2)As.push(v);for(let i=0;i<30;i++)Rs.push(.004*Math.pow(250,i/29));
  const lp=(S0,A,r,sg)=>{if(A<S0)return-Infinity;let ll=0;for(let j=0;j<N;j++){const m=A-(A-S0)*Math.exp(-r*P[j]),e=Y[j]-m;ll-=e*e/(2*sg*sg)}
    return ll-N*Math.log(sg)-((S0-TL.S0[0])**2)/(2*TL.S0[1]**2)-((A-TL.A[0])**2)/(2*TL.A[1]**2)-((Math.log(r)-TL.lr[0])**2)/(2*TL.lr[1]**2)};
  /* ChatGPT 數值盤查 11/11（成長模型的雜訊版本）：第二輪用 sg₁ 算出網格權重後，原本又把 sg 更新成 sg₂ 才回傳——權重是 sg₁ 的、下游（「發揮穩不穩」、Kalman 的觀測雜訊）拿到的卻是 sg₂。
     改成最後一輪算完網格就停，回傳的 sg 就是產生這組權重的那個 */
  let sg=10,G=[];for(let pass=0;pass<2;pass++){G=[];let best=null;for(const S0 of S0s)for(const A of As)for(const r of Rs){const v=lp(S0,A,r,sg);if(v>-Infinity){G.push([S0,A,r,v]);if(!best||v>best[3])best=[S0,A,r,v]}}
    if(pass===1)break;let ss=0;for(let j=0;j<N;j++){const e=Y[j]-(best[1]-(best[1]-best[0])*Math.exp(-best[2]*P[j]));ss+=e*e}sg=Math.max(4,Math.sqrt(ss/Math.max(1,N-1)))}
  const mx=Math.max(...G.map(g=>g[3]));const W=G.map(g=>Math.exp(g[3]-mx));const T=W.reduce((a,b)=>a+b,0);
  const post=k=>({m:G.reduce((a,g,i)=>a+g[k]*W[i],0)/T,lo:wq(G.map(g=>g[k]),W,.1),hi:wq(G.map(g=>g[k]),W,.9)});
  const rr=post(2),lrMed=Math.log(wq(G.map(g=>g[2]),W,.5)),p75=Math.exp(TL.lr[0]+.674*TL.lr[1]),p95=Math.exp(TL.lr[0]+1.645*TL.lr[1]);
  const pr=t=>G.reduce((a,g,i)=>a+(g[2]>t?W[i]:0),0)/T;
  /* 數學修正 11/11（審查 10-B）：lrSd＝ln r 的後驗標準差——小於先驗標準差的 0.6 倍才表示資料真的認得出 r（不然百分位大多是先驗）；slope(P)＝每 10 盤進步幾分＝10·(A−S₀)·r·e^(−rP)，資料少時也認得到的量 */
  const lrSd=Math.sqrt(G.reduce((a,g,i)=>a+(Math.log(g[2])-lrMed)**2*W[i],0)/T),slope=p=>{const xs=G.map(g=>10*(g[1]-g[0])*g[2]*Math.exp(-g[2]*p));return{m:xs.reduce((a,x,i)=>a+x*W[i],0)/T,lo:wq(xs,W,.1),hi:wq(xs,W,.9)}};
  return{G,W,T,sg,S0:post(0),A:post(1),r:rr,lrSd,rInf:lrSd<.6*TL.lr[1],slope,rPct:Math.round(PHI((lrMed-TL.lr[0])/TL.lr[1])*100),top25:pr(p75),top5:pr(p95),N}}
/* 預測曲線與里程碑（含「到不了」的機率） */
function tlCurve(M,p){const xs=M.G.map(g=>g[1]-(g[1]-g[0])*Math.exp(-g[2]*p));return{m:xs.reduce((a,x,i)=>a+x*M.W[i],0)/M.T,lo:wq(xs,M.W,.1),hi:wq(xs,M.W,.9)}}
/* ChatGPT 數值盤查 11/11（目標已達卻算永遠達不到）：每一組 (S₀,A,r) 先看「現在」的曲線值 A−(A−S₀)·e^(−r·Pnow)：已經 ≥ 目標＝還要 0；
   沒到、而且上限 A ≤ 目標（含 A＝S₀ 的平線）＝到不了；其餘才解 A−(A−S₀)·e^(−r·P)＝目標。以前先看 A ≤ 目標，S₀＝A＝80、目標 80 會被算成「永遠到不了」。
   med／lo／hi 是「到得了的那些情況」裡還要練多少的分位數（cond＝1 標明是條件分位數），到不了的機率另外看 pNever */
function tlMilestone(M,goal,Pnow){let never=0;const need=[],w=[];M.G.forEach((g,i)=>{const[S0,A,r]=g,now=A-(A-S0)*Math.exp(-r*Pnow);if(now>=goal){need.push(0);w.push(M.W[i]);return}
    if(A<=goal){never+=M.W[i];return}const P=-Math.log((A-goal)/(A-S0))/r;need.push(Math.max(0,P-Pnow));w.push(M.W[i])});
  return{goal,pNever:never/M.T,cond:1,med:need.length?wq(need,w,.5):null,lo:need.length?wq(need,w,.1):null,hi:need.length?wq(need,w,.9):null}}
/* Kalman：每盤更新一次目前能力（狀態方程照成長模型、觀測雜訊＝σ²）
   ChatGPT 數值盤查 11/11 P1「準確度超過 100」：原本用線性近似 th＋＝r·(A−th)·ΔP，練習量跨很大（r·ΔP＞1）時會衝過上限 A、甚至超過 100
   （起點 55、上限 82、速率 0.3、跨 50、觀測 80、σ 10 → 165.39）。改成成長曲線同一條指數的精確離散化：
     預測 th＝A＋(th−A)·F，F＝e^(−r·ΔP)（0＜F≤1，預測值一定落在 th 和 A 之間）；
     變異數 v＝F²·v＋Q·ΔP（轉移係數 F 平方乘上原變異數，加過程雜訊；Q＝5／單位練習量，ΔP＝1 時正好等於原本的 4·1＋1，ΔP＝0（同一時刻重複觀測）不加雜訊）。
   更新照舊 K＝v／(v＋σ²)、th＋＝K·(Y−th)——是預測和觀測的加權平均，所以觀測在 0～100、A 在 0～100 時點估計一定在 0～100；同一個例子現在是 80.57 */
function tlKalman(Y,P,M){let th=M.S0.m,v=144;for(let j=0;j<Y.length;j++){const dP=Math.max(0,j?P[j]-P[j-1]:P[0]),F=Math.exp(-M.r.m*dP);th=M.A.m+(th-M.A.m)*F;v=F*F*v+5*dP;const K=v/(v+M.sg*M.sg);th+=K*(Y[j]-th);v*=1-K}return{th,sd:Math.sqrt(v)}}
/* 用手機裡存過的評等補上還沒評的步，回傳我這邊還缺幾步 */
async function fillGrades(b0,mv,side){const C=window.XQCore;if(!C)return 0;let b=b0.slice();const keys=[],idx=[];
  for(let i=0;i<mv.length;i++){const m=mv[i];if(!(m.q&&m.q!=="—")){try{keys.push(C.fen(b,m.by)+"|"+C.iccs(m.f,m.t));idx.push(i)}catch(e){}}try{b=C.make(b,m.f,m.t)}catch(e){break}}
  if(keys.length){let r={};try{r=(await api("/an/lookup",{grade:keys})).grade||{}}catch(e){}keys.forEach((k,j)=>{const g=r[k],m=mv[idx[j]];if(g&&g.q&&!(g.loss===0&&g.bm&&g.bm!==C.iccs(m.f,m.t)&&g.bmt===undefined))Object.assign(m,g)})}   /* ChatGPT 數值盤查 11/11 P1：舊 g: 快取裡「不是最佳著、loss＝0、沒有 bmt」的可能是缺 PV 的舊回退值，不拿來補，留給背景補評（/an/classify 會重評） */
  return mv.filter(m=>m.by===side&&!(m.q&&m.q!=="—")).length}
/* 開發者 11/11 錄影「頁面一直跳動」：有些步評等算不出結果（記成「—」，例如已經將死的局面），原本仍算「沒評過」，評完重畫→又看到沒評→再評，無限循環，
   每次重畫都把整頁（含「詳細數字」）重來一次。改成：這次開 App 期間試過的步不再重試；沒有新的評等結果就不重畫；沒有要評的就不顯示進度列 */
let TALENT_BG=false;const TALENT_TRIED=new Set();
async function talentBackfill(box,pend){if(TALENT_BG||!pend.length)return;const C=window.XQCore;
  const key=(x,i)=>(x.k||x.t||0)+"|"+i,   /* 統計複查：車輪戰同一場每桌時間一樣，改用 c/id 當 key，不然會撞號 */left=x=>x.mv.filter((m,i)=>m.by===x.side&&!(m.q&&m.q!=="—")&&!TALENT_TRIED.has(key(x,i))).length;
  const todo=pend.filter(x=>left(x)>0).sort((a,b)=>b.t-a.t).slice(0,3);if(!todo.length)return;TALENT_BG=true;
  const total=todo.reduce((a,x)=>a+left(x),0);let n=0,got=0;
  const bar=document.createElement("div");bar.className="card muted";bar.style.cssText="margin-top:4px;font-size:13px";const up=()=>{bar.textContent=`🧬 正在幫最近 ${todo.length} 盤棋評等（${n}／${total} 步），評好會自動更新`};up();if(box.isConnected)box.prepend(bar);
  try{for(const x of todo){let b=x.b0.slice();for(let i=0;i<x.mv.length;i++){const m=x.mv[i];if(!box.isConnected)return;
    if(m.by===x.side&&!(m.q&&m.q!=="—")&&!TALENT_TRIED.has(key(x,i))){TALENT_TRIED.add(key(x,i));try{const g=await api("/an/classify",{board:b,side:m.by,f:m.f,t:m.t});if(g){Object.assign(m,g);if(g.q&&g.q!=="—")got++}}catch(e){}n++;up()}
    b=C.make(b,m.f,m.t)}}}
  finally{TALENT_BG=false;bar.remove()}
  if(got&&box.isConnected)talentReport(box)}
/* 意見回饋 339：天賦加一項「改錯力」——錯棋重練時找到 Pikafish 最好那步（正著、妙著）的比例；
   題數少的時候往中間值（50）拉一點，不會練一題就 0 分或 100 分 */
function redoPower(){const D=Object.values(store.get("redoDone",{})).filter(d=>d&&d.n>0);if(!D.length)return null;
  const tries=D.reduce((a,d)=>a+d.n,0),good=D.reduce((a,d)=>a+Math.max(0,d.n-(d.fail||0)),0),first=D.filter(d=>d.n>=1&&!(d.fail>0&&d.n===d.fail)).length,
    fixed=D.filter(d=>d.ok).length,kept=D.filter(d=>(d.box||0)>=3).length,score=Math.round((good+2)/(tries+4)*100);
  return{q:D.length,tries,good,fixed,kept,score,rate:Math.round(good*100/tries)}}
function redoPowerHTML(){const R=redoPower();
  if(!R)return`<div class="sec-t">改錯力</div><div class="card" style="line-height:1.7">還沒練過錯棋。去「🔁 錯棋重練」從下錯的那一步重下幾題，這裡就會算出你改錯的能力。<button class="btn ghost" style="width:100%;margin-top:8px" onclick="location.hash='#/redo'">去錯棋重練</button></div>`;
  const lab=R.score>=80?"很會改錯":R.score>=60?"改得不錯":R.score>=40?"還在摸索":"常常還是走錯";
  return`<div class="sec-t">改錯力</div><div class="card" style="line-height:1.6"><div class="muted" style="font-size:13px;margin-bottom:6px">回到你下錯的局面重下，找到 Pikafish 最好那一步（正著、妙著）的比例，0～100 分。</div>
    <table class="ttab"><tr><th>項目</th><th>數值</th><th>說明</th></tr>
    <tr><td>改錯力</td><td><span class="big">${R.score}</span> 分</td><td>${lab}</td></tr>
    <tr><td>練過的錯棋</td><td>${R.q} 題</td><td>從你下過的對局挑出來的失著、敗著</td></tr>
    <tr><td>重下的次數</td><td>${R.tries} 次</td><td>找到最好那步 ${R.good} 次（${R.rate}%）</td></tr>
    <tr><td>改對了</td><td>${R.fixed} 題</td><td>至少有一次走出好棋（穩著以上）</td></tr>
    <tr><td>記熟了</td><td>${R.kept} 題</td><td>隔幾天複習，連續 3 次都走對</td></tr></table></div>`}
/* ================= 📚 棋譜庫讀懂地圖（意見回饋 737；方案：xiangqi-db/story/棋譜庫讀懂比例_737.md） =================
   讀懂一盤＝看得懂這盤的主要手段（最難的那一手關鍵手）。每盤、每題的難度 b 在 data/lines/read-index.json（tools/build-read-index.js：
   Pikafish 找關鍵手，難度跟棋力測驗同一把尺）。玩家的 θ＝棋力測驗的 IRT（必要），再合併對電腦的 Glicko、一盞茶殘局棋力（各自換到同一把尺、加上換算誤差）。
   P(看懂)＝Φ((θ−b＋1 級)/√((1.702/a)²＋σ_b²))：「看懂」比「自己想到」容易一級（先這樣假設，等連猜資料校正）；σ_b＝難度還沒校正的不確定。
   百分比＝(已親手讀懂的＋其他每盤的 P)÷全部；區間＝θ±1.28se 代進去（比例對 θ 單調）。後台每天用大家的匿名作答校正（store calib 的 read／readShift）。
   特級大師對局是抽樣代表全庫（索引裡的 n 盤），古譜殘局、妙棋精選是全部題目。 */
let RD_P=null;
const readIdx=()=>RD_P||(RD_P=fetch("data/lines/read-index.json").then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).catch(()=>{RD_P=null;return null}));
const rdP=(th,b,I)=>PHI((th-b)/Math.sqrt(Math.pow(1.702/((I&&I.a)||1.2),2)+Math.pow((I&&I.sigB)||.5,2)));
/* 對電腦的等級分 → 段位序號（TL_LV18 內插；第 13 級以後是專業段，對到測驗的專1、專2） → θ */
function rdEloTh(r){const L=TL_LV18;let i=0;if(r<=L[0])i=0;else if(r>=L[L.length-1])i=L.length-1;else{for(let k=1;k<L.length;k++)if(r<=L[k]){i=k-1+(r-L[k-1])/(L[k]-L[k-1]);break}}
  /* 數學修正 11/11（審查 7-C）：第 13、14 級（專1-1、專1-2）對到測驗的專1（13 階）、第 15、16 級（專2-1、專2-2）對到專2（14 階），原本差了半階（專1-1 變 12.5） */
  const tier=i<=12?i:i<=14?13+(i-13)/2:Math.min(14.5,14+(i-15)/2),k=Math.max(1,Math.min(L.length-1,Math.round(i))),slope=Math.max(40,L[k]-L[k-1]);return{th:(tier-QZ.MID)*QZ.S,per:slope/QZ.S}}
/* 讀懂比例用的 θ：一定要做過棋力測驗；有樣本夠的殘局、對電腦紀錄再一起算（精確度加權） */
function readTheta(G){const QL=store.get("quizLog",[]),qt=store.get("quizTheta",null);
  if(!QL.some(q=>q&&!q.part&&(q.a||[]).length)&&!(qt&&isFinite(qt.th)))return null;
  const src=[],IR=tlIRT(QL).all;if(IR)src.push([IR.th,Math.max(.25,IR.sd),"棋力測驗"]);else if(qt&&isFinite(qt.th))src.push([qt.th,Math.max(.3,qt.se||.5),"棋力測驗"]);
  const cj=store.get("cj",null),nCj=cj&&cj.solved?Object.keys(cj.solved).length:0;if(cj&&cj.r>0&&nCj>=10)src.push([(cj.r-5.15)/.818,.7,"一盞茶殘局"]);
  const GL=G?tlGlicko(G):null;if(GL&&GL.n>=10){const e=rdEloTh(GL.r);src.push([e.th,Math.sqrt(Math.pow(GL.RD/e.per,2)+.09),"對電腦"])}
  if(!src.length)return null;let w=0,s=0;for(const[t,se]of src){w+=1/(se*se);s+=t/(se*se)}return{th:s/w,se:Math.sqrt(1/w),src:src.map(x=>x[2])}}
/* 讀譜作答匿名送出（跟棋力測驗同一個管道 XQNet.shareIRT → 後台 calibrate-irt.js），r＝[[題號,對錯,秒數,選項數]]；只有題號、對錯、θ */
function readShare(r){try{if(!r||!r.length||!window.XQNet||!XQNet.shareIRT)return;const T=readTheta(null);let aid=store.get("anonId",null);if(!aid){aid=Math.random().toString(36).slice(2,10);store.set("anonId",aid)}
  for(let i=0;i<r.length;i+=40)XQNet.shareIRT({t:"rd",v:2,aid,th:T?+T.th.toFixed(2):null,r:r.slice(i,i+40)})}catch(e){}}
/* 已親手讀懂：猜著法這盤猜了 5 步以上、猜中一半以上；一盞茶不看答案解開；妙棋精選連猜三步都一次猜中（有心得） */
/* 意見回饋 737 第二期：store "rdLog"（存檔清單 05b-save.js 有它）＝實際讀過、答過哪些棋譜，只存 id，不存棋譜：
   o＝{書: "id,id,…"} 棋譜頁打開過的盤；g＝{書: "id:猜中:猜了,…"} 猜著法每盤最好的一次；m＝{"2026-11":[特級大師%,古譜殘局%,妙棋%]} 每月一筆讀懂比例。
   特級大師對局的 id（gm01234）存成 36 進位數字（gm01234→"yi"），一盤約 4 個字；每本書最多記 5000 盤 */
const RDL={MAX:5000,k:(c,id)=>c==="gmgames"&&/^gm[0-9]+$/.test(id)?(+id.slice(2)).toString(36):String(id).replace(/[,:]/g,"_"),id:(c,k)=>c==="gmgames"&&!/^gm/.test(k)?"gm"+String(parseInt(k,36)).padStart(5,"0"):k};
const rdLog=()=>{const L=store.get("rdLog",null)||{};L.v=1;L.o=L.o||{};L.g=L.g||{};L.m=L.m||{};return L};
function rdOpen(c,id){try{if(!c||!id||/^(play|pvp|study|ai|peek)$/.test(c))return;const L=rdLog(),k=RDL.k(c,id),a=L.o[c]?L.o[c].split(","):[];if(a.includes(k))return;a.push(k);L.o[c]=a.slice(-RDL.MAX).join(",");store.set("rdLog",L)}catch(e){}}
function rdGuess(c,id,h,n){try{if(!c||!id||!(n>0))return;const L=rdLog(),k=RDL.k(c,id),M=new Map((L.g[c]?L.g[c].split(","):[]).map(x=>{const p=x.split(":");return[p[0],[+p[1]||0,+p[2]||0]]})),o=M.get(k);
  if(o&&(o[0]>h||(o[0]===h&&o[1]>=n)))return;M.delete(k);M.set(k,[h,n]);L.g[c]=[...M].slice(-RDL.MAX).map(([x,[a,b]])=>x+":"+a+":"+b).join(",");store.set("rdLog",L)}catch(e){}}
/* 已親手答過的：猜著法這盤猜了 5 步以上 → 猜中比例 q，看懂的程度＝min(1, q÷0.5)（猜中一半以上＝讀懂）；一盞茶不看答案解開＝1；妙棋連猜三步都一次猜中＝1。
   答過的盤用實際結果，不再用模型的機率（方案第 2 節）；舊版 guessLog（有 gid 的）也算進來 */
function readMine(){const L=rdLog(),gv=new Map(),put=(id,h,n)=>{if(n<5)return;const v=Math.min(1,h/n/.5);if(!gv.has(id)||gv.get(id)<v)gv.set(id,v)};
  for(const x of(L.g.gmgames?L.g.gmgames.split(","):[])){const p=x.split(":");put(RDL.id("gmgames",p[0]),+p[1]||0,+p[2]||0)}
  for(const e of store.get("guessLog",[])){if(!e||!e.gid||e.src!=="gmgames"||!e.h)continue;const t=e.h.replace(/-/g,"");put(e.gid,(t.match(/1/g)||[]).length,t.length)}
  const gm=new Set([...gv].filter(([,v])=>v>=1).map(([k])=>k));
  const cj=new Set(Object.entries((store.get("cj",null)||{}).solved||{}).filter(([,s])=>s&&!s.a).map(([k])=>k));
  const br=new Set(Object.entries(store.get("study",{})||{}).filter(([k,g])=>/^brilliant:/.test(k)&&g&&g.i).map(([k])=>k.slice(10)));
  const opened=c=>L.o[c]?L.o[c].split(",").length:0;return{gm,gv,cj,br,opened}}
function readCalc(I,th,G){const CAL=store.get("calib",null)||{},CR=CAL.read||{},SH=CAL.readShift||{},sh=k=>(SH[k]&&isFinite(SH[k].d)?SH[k].d:0),off=(I.off==null?1:I.off)*(I.S||.55),M=readMine();
  const gmB=g=>{const c=CR[g[0]+"@"+g[2]];return(c&&isFinite(c.b)?c.b:g[1]+sh("gm"))-off};
  const gmPct=t=>{const o=M.gv.size,sv=[...M.gv.values()].reduce((a,v)=>a+v,0),U=I.gm.games.filter(g=>!M.gv.has(g[0])),m=U.reduce((a,g)=>a+rdP(t,gmB(g),I),0)/Math.max(1,U.length);return Math.min(1,(sv+(I.gm.N-o)*m)/I.gm.N)};   /* 答過的盤用實際結果 gv（0～1），其他盤用抽樣盤的平均機率 */
  const cjS=store.get("cj",null),useR=cjS&&cjS.r>0&&Object.keys(cjS.solved||{}).length>=5,cjR=t=>useR?cjS.r+(t-th)*.818:5.15+.818*t;
  const cjPct=t=>I.cj.items.reduce((a,[id,d])=>{if(M.cj.has(id))return a+1;const c=CR[id],r=cjR(t);return a+(c&&isFinite(c.b)?1/(1+Math.exp(-.68*((r-5.15)/.818-c.b))):1/(1+Math.exp(-(r-d-sh("cj")*.818)/1.2)))},0)/I.cj.N;   /* 殘局棋力 r：自己解過 5 題以上就用 App 裡的 r，否則從 θ 換（r＝5.15＋0.818θ） */
  const brPct=t=>I.br.items.reduce((a,[id,b])=>{const c=CR[id];return a+(M.br.has(id)?1:rdP(t,(c&&isFinite(c.b)?c.b:b+sh("br"))-off,I))},0)/I.br.N;
  const phPct=(k,t)=>{const L=(I.gm.ph||{})[k]||[];return L.length>=20?L.reduce((a,b)=>a+rdP(t,b+sh("gm"),I),0)/L.length:null};
  return{M,gmPct,cjPct,brPct,phPct,gmB}}
async function readMap(el,G){if(!el)return;const T=readTheta(G);
  if(!T){el.innerHTML=`<div class="sec-t">📚 棋譜庫讀懂地圖</div><div class="card" style="line-height:1.7"><div style="font-size:15px"><b>你看得懂多少大師的棋？</b></div>
      <p class="muted" style="margin:6px 0 0">31,531 盤特級大師對局、621 題古譜殘局、484 手妙棋，你大概看得懂幾成？<b>做一次棋力測驗（大約 3 分鐘）就能算出來。</b></p>
      <button class="btn" id="rdQ" style="width:100%;margin-top:10px">🧩 去做棋力測驗</button></div>`;el.querySelector("#rdQ").onclick=()=>{vibrate(5);location.hash="#/quiz"};return}
  const I=await readIdx();if(!el.isConnected)return;if(!I||!I.gm||!I.gm.games||!I.gm.games.length){el.innerHTML="";return}
  const C=readCalc(I,T.th,G),z=1.28*T.se,lo=T.th-z,hi=T.th+z,P0=x=>Math.round(x*100),N0=x=>{const r=x>=1000?100:x>=100?10:1;return(Math.round(x/r)*r).toLocaleString()};   /* 盤數只說到百位：抽樣估的，不假裝精準到個位 */
  const wide=T.se>.6,row=(ic,nm,N,unit,f,mine,verb,tip)=>{const v=f(T.th),a=f(lo),b=f(hi),mineP=Math.min(100,mine*100/N);
    return`<div style="margin:12px 0 4px${wide?";opacity:.75":""}"><div class="row" style="justify-content:space-between;align-items:baseline;gap:6px"><b style="font-size:15px">${ic} ${nm}</b><span style="white-space:nowrap"><b style="font-size:20px;color:var(--accent)">約 ${P0(v)}%</b> <small class="muted">（${P0(a)}～${P0(b)}%）</small></span></div>
      <div style="position:relative;height:12px;border-radius:6px;background:var(--line);overflow:hidden;margin:5px 0 4px${wide?";outline:1px dashed var(--accent)":""}"><i style="position:absolute;left:0;top:0;bottom:0;width:${P0(b)}%;background:var(--accent);opacity:.18"></i><i style="position:absolute;left:0;top:0;bottom:0;width:${P0(v)}%;background:var(--accent);opacity:.55"></i><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(mine?1.2:0,mineP).toFixed(1)}%;background:var(--accent)"></i></div>
      <small class="muted" style="line-height:1.55;display:block">${N.toLocaleString()} ${unit}裡，大約 ${N0(v*N)} ${unit}你${verb}${mine?`・已經親手讀懂 <b>${mine}</b> ${unit}`:""}${tip?"・"+tip:""}</small></div>`};
  const ph=[["open","開局"],["mid","中局"],["end","殘局"]].map(([k,l])=>{const v=C.phPct(k,T.th);return v==null?"":`<span class="pill" style="font-size:12.5px">${l} ${P0(v)}%</span>`}).join(" ");
  const up=(C.gmPct(T.th+(I.S||.55))-C.gmPct(T.th))*I.gm.N;
  /* 意見回饋 737 第二期：每月記一筆（同一個月以最後一次為準，留 24 個月），畫「比上個月」和小折線；測驗資料還少（虛線）的時候不記 */
  const now=[P0(C.gmPct(T.th)),P0(C.cjPct(T.th)),P0(C.brPct(T.th))],mk=(d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"))(new Date());
  if(!wide)try{const L=rdLog();if(String(L.m[mk])!==String(now)){L.m[mk]=now;const ks=Object.keys(L.m).sort();while(ks.length>24)delete L.m[ks.shift()];store.set("rdLog",L)}}catch(e){}
  const MH=Object.entries(rdLog().m).sort((a,b)=>a[0]<b[0]?-1:1),prev=MH.filter(([k])=>k<mk).pop(),dGm=prev?now[0]-prev[1][0]:null;
  /* ChatGPT 數值盤查 11/11（同週報）：比較的那筆不一定是上個月（中間沒打開過就會跳過幾個月），寫實際年月；百分比相減寫「個百分點」 */
  const pvLb=!prev?"":(()=>{const y=+mk.slice(0,4),m=+mk.slice(5,7),pk=m>1?y+"-"+String(m-1).padStart(2,"0"):(y-1)+"-12",py=+prev[0].slice(0,4),pm=+prev[0].slice(5,7);return prev[0]===pk?"上個月":py===y?" "+pm+" 月":" "+py+" 年 "+pm+" 月"})();
  const spark=MH.length>=2?(()=>{const W=120,H=28,xs=i=>4+(W-8)*i/(MH.length-1),ys=v=>H-4-(H-8)*v/100;return`<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;height:${H}px;vertical-align:middle"><polyline points="${MH.map(([,v],i)=>xs(i).toFixed(1)+","+ys(v[0]).toFixed(1)).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${MH.map(([,v],i)=>`<circle cx="${xs(i).toFixed(1)}" cy="${ys(v[0]).toFixed(1)}" r="2.4" fill="var(--accent)"/>`).join("")}</svg>`})():"";
  const nOpen=C.M.opened("gmgames");
  /* 推薦：還沒讀懂、看懂機率 0.55～0.75 的盤（剛好讀得懂），打開就停在最難那一手的前面 */
  const cand=I.gm.games.filter(g=>g[2]>=0&&!C.M.gm.has(g[0])).map(g=>[g,rdP(T.th,C.gmB(g),I)]).filter(([,p])=>p>=.55&&p<=.75);
  el.innerHTML=`<div class="sec-t">📚 棋譜庫讀懂地圖</div><div class="card" style="line-height:1.6">
      ${prev?`<div class="row" style="justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px"><small class="muted" style="white-space:nowrap">📈 每月變化</small><span style="white-space:nowrap">${spark}<b style="font-size:13.5px;margin-left:6px;color:${dGm>0?"var(--accent)":"var(--muted)"}">${dGm>0?"比"+pvLb+"多 "+dGm+" 個百分點":dGm<0?"比"+pvLb+"少 "+(-dGm)+" 個百分點":"跟"+pvLb+"一樣"}</b></span></div>`:""}
      <div class="muted" style="font-size:12.5px">「讀懂」＝看得懂那盤棋最關鍵的一手在做什麼。${wide?"<b>資料還少，先參考（虛線＝還在觀察）</b>":""}</div>
      ${row("🏆","特級大師對局",I.gm.N,"盤",C.gmPct,C.M.gm.size,"看得懂主要手段",nOpen?`打開讀過 ${nOpen.toLocaleString()} 盤`:"")}
      ${ph?`<div style="margin:2px 0 6px"><small class="muted">關鍵那一手自己想得到：</small> ${ph}</div>`:""}
      ${row("🍵","古譜殘局",I.cj.N,"題",C.cjPct,C.M.cj.size,"不用提示就解得開")}
      ${row("💎","妙棋精選",I.br.N,"手",C.brPct,C.M.br.size,"看得懂妙在哪裡")}
      ${up>=50?`<p style="margin:10px 0 4px;font-size:14.5px">🎯 再升一段，特級大師對局還能多看懂約 <b>${N0(up)}</b> 盤</p>`:""}
      ${cand.length?`<button class="btn" id="rdGo" style="width:100%;margin-top:6px">📖 挑一盤剛好看得懂的大師對局</button>`:""}
      <div class="muted" style="font-size:12px;margin-top:8px">深色＝已經親手讀懂（猜著法、解殘局、連猜）・中間色＝你的棋力看得懂・淡色＝最多可能到這裡。根據${T.src.join("、")}。</div>
      <details style="margin-top:6px"><summary class="muted" style="font-size:13px">這個數字怎麼算？</summary><p class="muted" style="font-size:12.5px;line-height:1.7;margin:6px 0 0">
        Pikafish 先找出每盤棋的「關鍵手」（大師走的就是最好、而且比第二好的著法多一兵以上，要想幾步才看得出來），用要想多深、差多少算出難度，跟棋力測驗是同一把尺。
        你的棋力（棋力測驗為主，殘局、對電腦的紀錄也算）越高、那一手越簡單，看懂的機會越大；把每一盤的機會加起來就是百分比。括號是大概的範圍：測驗做越多、範圍越窄。
        特級大師對局是從全部 ${I.gm.N.toLocaleString()} 盤抽 ${I.gm.n.toLocaleString()} 盤算的；大家匿名的猜著法、連猜結果（只有題號和對錯）每天會拿來校正難度。</p></details></div>`;
  const go=el.querySelector("#rdGo");if(go)go.onclick=()=>{vibrate(5);const[g]=cand[Math.floor(Math.random()*cand.length)];
    try{const r=store.get("recent",[]).filter(x=>!(x.c==="gmgames"&&x.id===g[0]));r.unshift({c:"gmgames",id:g[0],title:"特級大師對局",book:"特級大師對局",ply:g[2]});store.set("recent",r.slice(0,10))}catch(e){}
    toast("停在這盤最關鍵的那一手前面，想想看大師下一步怎麼走");location.hash="#/db/gmgames/"+encodeURIComponent(g[0])}}
async function talentReport(box){
  const CAL=store.get("calib",null),CT=CAL&&CAL.tal&&CAL.tal.people>=100?CAL.tal:null;   /* 開發者 11/11 照三方審查（ChatGPT）：「一般棋友」至少 100 人才用校正值（原本 10 人），跟 mxCal 同一個門檻 */
  if(CT&&Array.isArray(CT.S0)&&Array.isArray(CT.A)&&Array.isArray(CT.lr)){TL.S0=CT.S0;TL.A=CT.A;TL.lr=CT.lr}   /* 意見回饋 307：大家的資料夠多了，就用校正過的「一般棋友」 */
  /* 意見回饋 325：下完棋馬上算進來——先補手機裡已經評過的步，還沒評完的最近幾盤，畫完之後在背景請 Pikafish 補算，算好自動重新整理。
     意見回饋 415：每盤的資料跟「我的棋力」共用 skillRows()（同一個快取、同一套排除規則）。成長模型只用我這邊評過 8 步以上的盤；
     用過提示或悔棋的那盤不算進分數（不進成長曲線、等級分、著法品質、殘局功夫），但下了一盤還是算一次練習量 */
  /* 意見回饋（開發者 11/6 分數審查）：成長曲線的 Y 改用純準確度（rowAcc：pa 三階段加總÷步數），不再用賽後報告的 score（含妙著加分、69／79／89 上限）；
     沒有 pa 的舊列（skillRows 重讀不到棋譜的）排除。先驗 S₀≈55、A≈82 本來就是對準確度設的，維持不動 */
  const{G:G0,pend}=await skillRows(),GA=G0.filter(g=>g.n>=8&&rowAcc(g)!=null),G=GA.filter(g=>!g.hu);
  if(!box.isConnected)return;
  const QL=store.get("quizLog",[]),GL0=store.get("guessLog",[]);
  /* 累積練習量 P：每盤對局 1、做完一次測驗 0.5、猜完一盤 0.5；沒做完的照做了幾題按比例算（意見回饋 309，測驗 8 題、猜著法 15 步算一整次） */
  /* ChatGPT 數值盤查 11/11（猜大師著法的分母）：猜著法的練習量改用實猜步數 gsTried（不含「看大師怎麼走」）——以前用存檔的 n（含看答案），連看 15 手也算半盤練習 */
  const ev=GA.map(g=>({t:g.t,k:"g",g})).concat(QL.map(q=>({t:q.at,k:"q",w:.5*Math.min(1,(q.a||[]).length/8)})),GL0.map(q=>({t:q.at,k:"q",w:.5*Math.min(1,gsTried(q)/15)}))).sort((a,b)=>a.t-b.t);let P=0;const Y=[],PP=[];
  const LV=[];for(const e of ev){if(e.k==="g"){if(!e.g.hu){Y.push(rowAcc(e.g));PP.push(P);LV.push(e.g.lv!=null?+e.g.lv:null)}P+=1}else P+=e.w}
  /* 數學修正 11/11（審查 10-C）：對手強度共變量 Y'＝Y−β·(級數−自己的平均級數)，β 由後台用大家的資料估（calib.tal.beta，每升一級準確度平均掉幾分）；沒有校正檔就 β＝0（不調） */
  const beta=CT&&isFinite(+CT.beta)?+CT.beta:0,lvs=LV.filter(x=>x!=null),lvM=lvs.length?lvs.reduce((a,b)=>a+b,0)/lvs.length:null,Yf=Y.map((y,j)=>beta&&LV[j]!=null&&lvM!=null?y-beta*(LV[j]-lvM):y);
  /* 殘局技巧：實戰殘局的每一步＋測驗殘局題，依技巧分組（原本做 BKT，數學修正 11/11 改 Beta-二項式 tlBeta） */
  /* ChatGPT 數值盤查 11/11（練習序列）：實戰和測驗原本分兩批接（先全部實戰、再全部測驗），「最近」那 60 筆會偏向測驗；改成每筆帶時間、照時間排好再接。每筆觀測只放一次（不複製） */
  const TQ0={};for(const g of G)if(g.ek&&g.ph&&g.ph.end)for(const x of g.ph.end.split(""))(TQ0[g.ek]=TQ0[g.ek]||[]).push([g.t||0,Number(x)]);
  for(const s0 of QL)for(const x of s0.a)if(x[6])(TQ0[x[6]]=TQ0[x[6]]||[]).push([s0.at||0,x[1]]);
  const TQ={};for(const[k,a]of Object.entries(TQ0))TQ[k]=a.map((x,i)=>[x[0],i,x[1]]).sort((p,q)=>p[0]-q[0]||p[1]-q[1]).map(x=>x[2]);
  /* 意見回饋 415：殘局功夫的分數也用「我的棋力」那把尺（每步準確度平均），並標出實戰步數 */
  const accOf=rows=>{let s=0,n=0;for(const x of rows){s+=x[0];n+=x[1]}return n?{v:Math.round(s/n),n}:null};
  const EKL={};for(const g of G)if(g.ek&&g.pa&&g.pa.end&&g.pa.end[1])(EKL[g.ek]=EKL[g.ek]||[]).push(g.pa.end);
  /* 數學修正 11/11（審查 9）：BKT 換成 Beta-二項式收縮（tlBeta），不再把資料接自己一次；排序用 80% 上界（越不確定、越弱的越前面）。
     開發者 11/11 照三方審查「不改玩家看到的分數」：畫面照舊顯示「最近走出好棋 X%」（b.recent，跟原本同一個數字），只有六類的排序改用 Beta 上界 */
  /* ChatGPT 數值盤查 11/11（8 筆練習被當 16 筆）：8～14 筆不擬合也不複製，畫面直接寫「好棋（答對）k／n」（kk、n 是真的觀測數）；滿 15 筆才寫比例。tlBeta 每筆觀測只算一次 */
  const TK=Object.entries(TQ).map(([k,seq])=>{if(seq.length<8)return null;const kk=seq.reduce((a,b)=>a+(+b||0),0),b=tlBeta(kk,seq.length),rc=seq.slice(-60);b.recent=rc.reduce((a,x)=>a+(+x||0),0)/rc.length;return{k,b,kk,n:seq.length}}).filter(Boolean).sort((a,b)=>a.b.hi-b.b.hi);
  /* 意見回饋（開發者 11/6 分數審查）：畫面上只留一種「等級分」（電腦／線上分頁的段位積分）。Glicko 那個 700～2800 的數字不再顯示（tlGlicko 留著沒用），
     著法品質也不再換算成等級分，只顯示「平均每步少 X 分」。猜著法引擎失敗那步現在存 d=null（03-home-quiz.js），不會混進 acpl */
  const M=tlGrowth(Yf,PP),IR=tlIRT(QL),RG=tlAcpl(G.flatMap(g=>g.L||[]).concat(GL0.flatMap(x=>(x.d||[]).filter(d=>d!=null))));   /* 數學修正 11/11：tlRegan → tlAcpl（只算平均、中位數） */
  if(!M&&!IR.all){box.innerHTML=`<div class="card" style="margin-top:4px;line-height:1.7"><b>資料還不夠</b><p class="muted" style="margin:6px 0 0">成長曲線要從你的練習歷程推估：至少要有 3 盤 Pikafish 評過等、各下了 8 步以上的對局（挑戰電腦或線上對戰），或做一次棋力測驗。目前有 ${G.length} 盤、測驗 ${QL.length} 次。</p>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="tg1" style="flex:1">挑戰電腦</button><button class="btn ghost" id="tg2" style="flex:1">棋力測驗</button></div></div><div id="rdMap"></div>`;readMap(box.querySelector("#rdMap"),G);
    box.querySelector("#tg1").onclick=()=>location.hash="#/cpu";box.querySelector("#tg2").onclick=()=>location.hash="#/quiz";if(pend.length)setTimeout(()=>talentBackfill(box,pend),300);return}
  const f1=x=>x==null?"—":x.toFixed(1),f0=x=>x==null?"—":Math.round(x),pc=x=>Math.round(x*100)+"%";
  /* 開發者 11/11 照三方審查：Kalman（KF＝「每步準確度」那格的數字）這次「不換」——換成成長模型的後驗預測（mathfix 的 tlNow）會改到玩家看到的數字，留到影子模式之後再換（合併說明.md 列為待辦）。
     一般棋友 popNow 仍是先驗中位數曲線——校正人數不夠（CT 為 null）時只能標「暫用假設」（審查 10-A）。沒有校正檔時 β＝0、Yf＝Y，KF 跟原本完全一樣 */
  const KF=M?tlKalman(Yf,PP,M):null,popNow=TL.A[0]-(TL.A[0]-TL.S0[0])*Math.exp(-Math.exp(TL.lr[0])*P),MXC=mxCal(),calOK=!!CT,pctOK=!!(M&&M.N>=5&&M.rInf&&MXC.lrQ),rPct=pctOK?mxPct(Math.log(M.r.m),MXC.lrQ):null,SL=M?M.slope(P):null;
  /* 數學修正 11/11（審查 10-B、10.4）：進步速度的百分位只在 (a) 校正檔有 ≥200 人的 ln r 分位、(b) 自己的資料真的認得出 r 時才顯示；不然只講資料認得到的「每 10 盤大約進步幾分」，不貼「學得飛快／進步偏慢」標籤 */
  const lab=!M?"":!pctOK?"還在觀察中":speedLab(rPct),slTx=SL?`每 10 盤大約進步 ${SL.m>=0?"+":""}${SL.m.toFixed(1)} 分（${SL.lo.toFixed(1)}～${SL.hi.toFixed(1)}）`:"";
  const NR=window.XQNet&&XQNet.rating?XQNet.rating().rank:null,SR=CT&&CT.byRank&&NR&&CT.byRank[NR]&&CT.byRank[NR].n>=5?CT.byRank[NR]:null;
  /* τ 表：每一項都附 80% 區間 */
  /* 意見回饋 357：棋路底子也用同一種表格（項目／數值／說明），範圍併進說明 */
  const row=(k,v,iv,note)=>`<tr><td>${k}</td><td>${v}</td><td>${[iv?"大概 "+iv:"",note||""].filter(Boolean).join("・")}</td></tr>`;
  const tau=M?`<table class="ttab"><tr><th>項目</th><th>數值</th><th>說明</th></tr>
      ${row("剛學時的底子",f0(M.S0.m)+" 分",`${f0(M.S0.lo)}～${f0(M.S0.hi)}`,"剛開始下棋時，每步走得好不好（100 分＝步步都是電腦首選）")}
      ${row("長棋速度",(M.r.m*100).toFixed(1)+"%",`${(M.r.lo*100).toFixed(1)}～${(M.r.hi*100).toFixed(1)}%`,`每多下一盤，離自己的極限又近了幾成${pctOK?`；比 ${rPct}% 用這個 App 的棋友長得快`:M.rInf?"；棋友資料還不夠多，先不比排名":"；下得還不多，這個數字大部分還是先驗"}`)}
      ${row("能長到多高",f0(M.A.m)+" 分",`${f0(M.A.lo)}～${f0(M.A.hi)}`,M.A.hi-M.A.lo>18?"還沒碰到瓶頸，這一項現在還看不準（正常）":"")}
      ${row("發揮穩不穩",f1(M.sg)+" 分","",M.sg<=7?"每盤發揮都差不多":M.sg<=12?"偶爾失常":"忽好忽壞，常常一盤好一盤壞")}</table>`:"";
  /* 意見回饋 415：開局／中局／殘局三條搬走（看「我的棋力」，同一把尺），這頁只留「多快變強」。
     棋力測驗的題目功力收進詳細數字：殺法＋戰術跟「我的棋力」的殺法軸是同一個數字；分數＝勝過多少學棋者，不跟實戰分數比大小、不拿來挑建議先練 */
  /* 數學修正 11/11（審查 6-A）：Φ(θ)×100 不是「勝過 X% 學棋者」；校正檔有 ≥200 人的 θ 分位才算經驗百分位，不然寫測驗估的段位 */
  const QZT=[["殺戰","殺法＋戰術","就是「我的棋力」的殺法"],["局面","局面判斷題",""],["殘局","殘局題","跟實戰的殘局不是同一把尺"]].map(([k,l,n])=>{const r=IR[k];if(!r)return"";const pq=mxPct(r.th,MXC.thQ);
    return row(l,pq!=null?`勝過 ${pq}%`:`約 ${mxTierName(r.th)}`,"",`${pq!=null?"跟用這個 App 的棋友比":"棋友資料還不夠多，先用測驗估的段位"}・做了 ${r.n} 題${r.n<SK.QMIN||r.sd>.8?"・題目還少，看不太準":""}${n?"・"+n:""}`)}).join("");
  const bar=q=>`<div style="margin:8px 0${q.low?";opacity:.6":""}"><div class="row" style="justify-content:space-between"><b>${q.k}</b><span style="font-variant-numeric:tabular-nums">${q.v==null?"—":q.v}</span></div><div class="st-bar"><i style="width:${q.v||0}%"></i></div><div class="muted" style="font-size:12.5px">${esc(q.t)}</div></div>`;
  /* 成長軌跡圖：點＝每盤準確度，線＝後驗平均，色帶＝80% 區間，往後延伸一半的練習量 */
  let chart="",ms=null;if(M){const Pmax=Math.max(4,P*1.5),W=320,H=170,L0=28,xs=p=>L0+(W-L0-8)*p/Pmax,ys=v=>H-24-(H-34)*Math.max(0,Math.min(100,v))/100;
    const K=24,cv=[...Array(K+1)].map((_,i)=>{const p=Pmax*i/K;return[p,tlCurve(M,p)]});
    const band=cv.map(([p,c])=>`${xs(p).toFixed(1)},${ys(c.hi).toFixed(1)}`).join(" ")+" "+cv.slice().reverse().map(([p,c])=>`${xs(p).toFixed(1)},${ys(c.lo).toFixed(1)}`).join(" ");
    /* 意見回饋（開發者 11/6 分數審查）：目標至少是 ceil(目前值)+2，不會再出現「每步準確度 71」卻說「很難超過 68」；A 比現況低時不引用 A */
    const cur=KF?KF.th:Y[Y.length-1];let goal=Math.min(95,Math.floor(cur/5)*5+5);if(goal>M.A.m&&M.A.m>cur+1)goal=Math.floor(M.A.m);goal=Math.min(99,Math.max(goal,Math.ceil(cur)+2));ms=tlMilestone(M,goal,P);ms.cur=cur;
    chart=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">${[0,50,100].map(v=>`<line x1="${L0}" x2="${W-8}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)"/><text x="${L0-4}" y="${ys(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join("")}
      <line x1="${L0}" x2="${W-8}" y1="${ys(goal)}" y2="${ys(goal)}" stroke="var(--accent)" stroke-dasharray="4 4" stroke-opacity=".6"/><text x="${W-10}" y="${ys(goal)-4}" text-anchor="end" font-size="10" fill="var(--accent)">目標 ${goal}</text>
      <line x1="${xs(P)}" x2="${xs(P)}" y1="${ys(100)}" y2="${ys(0)}" stroke="var(--muted)" stroke-dasharray="2 3"/><text x="${xs(P)+3}" y="${ys(100)+10}" font-size="10" fill="var(--muted)">現在</text>
      <polygon points="${band}" fill="var(--accent)" fill-opacity=".14"/><polyline points="${cv.map(([p,c])=>`${xs(p).toFixed(1)},${ys(c.m).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      ${Y.map((y,j)=>`<circle cx="${xs(PP[j]).toFixed(1)}" cy="${ys(y).toFixed(1)}" r="3" fill="var(--muted)" fill-opacity=".6"/>`).join("")}
      <text x="${W-8}" y="${H-6}" text-anchor="end" font-size="10" fill="var(--muted)">累積練習量（盤）</text></svg>`}
  /* 意見回饋 415：公開資料卡只發五邊形（我的棋力）一組分數；這裡只公開進步速度，不再發另一組開局／中局／殘局 */
  setProf({tal:{rPct:pctOK?rPct:null,cal:pctOK?1:0,lab,now:KF?Math.round(KF.th):null}});   /* 數學修正 11/11：cal＝1 才是真的百分位（別人的資料卡只在 cal＝1 時顯示「比 X% 長得快」） */
  /* 意見回饋 307：成長曲線（只有練習量和準確度，加上段位；沒有名字和代號）每兩天匿名送一次到後台，跟大家的資料一起校正「一般棋友」 */
  if(Y.length>=5&&window.XQNet&&XQNet.shareIRT&&Date.now()-store.get("talShareAt",0)>2*864e5){store.set("talShareAt",Date.now());let aid=store.get("anonId",null);if(!aid){aid=Math.random().toString(36).slice(2,10);store.set("anonId",aid)}
    /* 數學修正 11/11：成長曲線每點多帶對手級數 lv（估 β 用）；ax＝最近約 150 步各階段的 [準確度加總, 步數] 和失誤 [失著＋敗著, 步數]（給 calibrate-axes.js 算各段位的階段基準） */
    api("/play/state").then(st=>st&&st.cpuRate&&st.cpuRate.rank).catch(()=>null).then(crk=>{try{const ax={};let an=0;for(const g of G.slice().sort((a,b)=>(b.t||0)-(a.t||0))){if(an>=SK.WIN)break;for(const k of["open","mid","end"]){const x=g.pa[k];if(x&&x[1]){const o=ax[k]||(ax[k]=[0,0]);o[0]+=x[0];o[1]+=x[1]}}const o=ax.bad||(ax.bad=[0,0]);o[0]+=g.bad||0;o[1]+=g.n||0;an+=g.n||0}
      XQNet.shareIRT({t:"tal",v:2,aid,rk:NR,crk:crk||null,pts:Y.map((y,j)=>[+PP[j].toFixed(1),Math.round(y),LV[j]]).slice(-80),ax})}catch(e){}})}
  /* 意見回饋 358、415：最上面一張重點卡（三個大數字＋一句總結），「建議先練」只在「我的棋力」，這裡放一個帶過去的按鈕 */
  const RP=redoPower(),dPop=KF?Math.round(KF.th-popNow):null,nHU=GA.length-G.length;
  const tile=(lab,v,unit,sub)=>`<div class="tstat"><small>${lab}</small><b>${v}<i>${unit}</i></b><span>${sub}</span></div>`;
  /* 意見回饋（開發者 11/6 分數審查）：「每步品質」改叫「每步準確度」（Y 已是純準確度）；「進步速度」是百分位，單位從「分」改成「%」 */
  /* 數學修正 11/11（審查 10-A）：校正人數不夠（calOK 為 false）時，「一般棋友」是作者假設，不能當事實講——只說自己的數字，另外標「暫用假設」 */
  const sumTxt=[pctOK?`你比 <b>${rPct}%</b> 用這個 App 的棋友進步得快`:slTx?`照目前的曲線，${slTx}`:"資料還不多，先看每盤的準確度",KF&&calOK?`每步準確度比同樣練習量的棋友${dPop>=0?"多":"少"} <b>${Math.abs(dPop)}</b> 分`:KF?`每步準確度大概 <b>${f0(KF.th)}</b> 分（還沒有夠多棋友的資料可以比）`:""].filter(Boolean).join("；")+"。";
  box.innerHTML=`<div class="card thero">
      <div class="muted" style="font-size:12.5px;margin-bottom:8px;text-align:center">這裡看你<b>多快變強</b>；現在多強、先練什麼，看「我的棋力」</div>
      <div class="tstats">${tile("進步速度",pctOK?rPct:SL?(SL.m>=0?"+":"")+SL.m.toFixed(1):"?",pctOK?"%":SL?"分/10盤":"",pctOK?`勝過 ${rPct}% 棋友・${esc(lab)}`:SL?"每 10 盤大約進步幾分・還在觀察":esc(lab||"還在觀察"))}${tile("每步準確度",KF?f0(KF.th):"—","分",KF?(calOK?`一般棋友 ${f0(popNow)}`:`假設的一般棋友 ${f0(popNow)}`):"再下幾盤")}${tile("改錯力",RP?RP.score:"—","分",RP?`練過 ${RP.q} 題`:"還沒練")}</div>
      <p class="tsum">${sumTxt}</p>
      <button class="btn ghost" id="tgo" style="width:100%">想知道先練什麼？看「我的棋力」 ›</button>
      <div class="muted" style="font-size:12px;margin-top:8px;text-align:center">根據 ${G.length} 盤對局・${QL.length} 次測驗・${GL0.length} 局猜著法${nHU?`・用過提示或悔棋的 ${nHU} 盤不算分數`:""}${M&&M.N<20?"・下得還不多，下越多越準":""}</div></div>
    <div id="rdMap"></div>
    ${chart?`<div class="sec-t">成長軌跡與預測</div><div class="card">${chart}<div class="muted" style="font-size:12px;margin-top:2px">● 灰點＝每一盤　━ 線＝照你的進步速度預測　▒ 淺色＝大概範圍</div>${ms?`<p style="margin:8px 0 0;font-size:14px;line-height:1.6">${ms.med==null||ms.pNever>=.5?(M.A.hi-M.A.lo>18?`📌 「能長到多高」現在還看不準（大概 ${f0(M.A.lo)}～${f0(M.A.hi)} 分），再多下幾盤才知道；回「我的棋力」照建議先練最弱的那一項。`:M.A.m>=ms.cur+1?`📌 照目前的練法，每步準確度大概會停在 <b>${f0(M.A.m)}</b> 分上下；回「我的棋力」照建議先練最弱的那一項，天花板才會往上。`:`📌 目前已接近模型估的上限，再多下幾盤才看得出能不能再上去；回「我的棋力」照建議先練最弱的那一項。`):ms.med<.5?`📌 照成長曲線估，你的每步準確度已經到 <b>${ms.goal}</b> 分左右了；回「我的棋力」照建議先練最弱的那一項，再往上拉。`:`📌 再練約 <b>${f0(ms.med)}</b> 盤，每步準確度可以到 <b>${ms.goal}</b> 分${ms.pNever>=.1?`（這是「到得了」的情況下估的；也有約 ${pc(ms.pNever)} 的可能會停在 ${ms.goal} 分以下）`:""}。`}</p>`:""}</div>`:""}${/* 數值盤查 11/11：已達目標說「已經到了」；剩餘盤數是到得了的情況下的中位數，到不了的機率 ≥ 10% 時寫出來 */""}
    ${redoPowerHTML()}
    <div class="tdet"><button type="button" class="tdet-h" aria-expanded="false">📊 詳細數字<br><small class="muted" style="font-weight:400;font-size:12px">進步速度、每步準確度、題目功力、棋路底子、殘局功夫</small></button><div class="tdet-b">
    <div class="sec-t" style="margin-top:4px">進步速度</div><div class="card" style="line-height:1.6">${/* 意見回饋 354、357：表格；進步速度和進步很快合併成一列 */""}<div class="muted" style="font-size:13px;margin-bottom:6px">同樣多的練習，你的每步準確度漲得多快。${pctOK?"排名是「勝過多少用這個 App 的棋友」，不是分數。":"棋友資料還不夠多（或你的盤數還少），先只講每 10 盤大約進步幾分，不排名。"}</div>
      ${M?`<table class="ttab"><tr><th>項目</th><th>數值</th><th>說明</th></tr>
      <tr><td>進步速度</td><td>${pctOK?`<span class="big">${rPct}</span> %`:SL?`<span class="big">${SL.m>=0?"+":""}${SL.m.toFixed(1)}</span> 分/10盤`:"?"}</td><td>${pctOK?`${esc(lab)}・勝過 ${rPct}% 的棋友；有 ${pc(M.top25)} 機會是「進步很快」的人（每 4 人最快的 1 個）`:`${slTx||"還在觀察"}・${M.rInf?"排名要等棋友資料夠多":"下得還不多，長棋速度還看不準"}`}</td></tr>
      ${pctOK?`<tr><td>頂尖</td><td>${pc(M.top5)}</td><td>機會是每 20 人裡最快的 1 個</td></tr>`:""}
      <tr><td>根據</td><td>${G.length} 盤</td><td>測驗 ${QL.length} 次・猜著法 ${GL0.length} 局・練習量約 ${f1(P)} 盤${practiceTotal()>=1?`・練習 ${practiceTotal()>=60?(practiceTotal()/60).toFixed(1)+" 小時":Math.round(practiceTotal())+" 分鐘"}`:""}</td></tr></table>
      ${M.N<20?`<div class="muted" style="font-size:12.5px;margin-top:4px">下得還不多，先參考${calOK?"":"（假設的）"}一般棋友的樣子，下越多越準</div>`:""}`:`<div style="margin:8px 0">再下 3 盤評過等的對局就能估</div>`}</div>
    ${KF||RG?`<div class="sec-t">每步準確度</div><div class="card" style="line-height:1.6">${/* 意見回饋 353：改成表格＋一句說明 */""}<div class="muted" style="font-size:13px;margin-bottom:6px">每盤每一步的準確度平均（跟「我的棋力」五邊形同一把尺，100＝步步都是電腦首選）一路追下來，越高越好。</div>
      <table class="ttab"><tr><th>項目</th><th>數值</th><th>說明</th></tr>
      ${KF?`<tr><td>每步準確度</td><td><span class="big">${f0(KF.th)}</span> 分</td><td>大概在 ${f0(Math.max(0,KF.th-1.28*KF.sd))}～${f0(Math.min(100,KF.th+1.28*KF.sd))} 分之間${/* 數值盤查 11/11 P1：區間夾在準確度的尺度 0～100 裡 */""}</td></tr>
      <tr><td>${calOK?"一般棋友":"一般棋友（暫用假設）"}</td><td>${f0(popNow)} 分</td><td>${calOK?`下了一樣多盤的棋友（${MXC.talN} 人的資料）・你${KF.th>=popNow?"多":"少"} <b>${f0(Math.abs(KF.th-popNow))}</b>`:"還沒有夠多棋友的資料，這是作者先假設的樣子，等資料夠了會換成真的"}</td></tr>`:""}
      ${SR?`<tr><td>同段位</td><td>${SR.now} 分</td><td>${esc(NR)}・${SR.n} 人・進步速度中間值 ${(SR.r*100).toFixed(1)}%</td></tr>`:""}
      ${RG?`<tr><td>平均每步少</td><td>${Math.round(RG.acpl)} 分</td><td>每一步比電腦最好的著法平均少幾分（棋力單位，越小越好；中位數 ${Math.round(RG.med)}；看了 ${RG.n} 步，含猜著法）</td></tr>`:""}</table></div>`:""}
    <div class="sec-t">題目功力（棋力測驗）</div><div class="card">${QZT?`<div class="muted" style="font-size:13px;margin-bottom:6px">${MXC.thQ?"分數＝勝過多少用這個 App 的棋友":"棋友資料還不夠多，先用測驗估的段位表示"}，跟實戰的分數不是同一把尺，不要直接比大小。</div><table class="ttab"><tr><th>項目</th><th>分數</th><th>說明</th></tr>${QZT}</table>`:'<div class="muted" style="font-size:13px">做一次<a href="#/quiz">棋力測驗</a>，就會算出殺法、戰術、局面判斷、殘局題的功力。</div>'}</div>
    ${tau?`<div class="sec-t">你的棋路底子</div><div class="card">${tau}</div>`:""}
    ${TK.length?`<div class="sec-t">殘局功夫</div><div class="card">${TK.slice(0,6).map(t=>{const x=accOf(EKL[t.k]||[]);return bar(x?{k:t.k,v:x.v,low:x.n<SK.MIN,t:`實戰 ${x.n} 步每步準確度平均${x.n<SK.MIN?"（樣本還少）":""}・${t.n<15?`走出好棋 ${t.kk}／${t.n}`:`最近走出好棋 ${pc(t.b.recent)}`}`}:{k:t.k,v:null,low:true,t:`還沒有實戰的這種殘局，只有測驗題 ${t.n} 題・${t.n<15?`答對 ${t.kk}／${t.n}`:`最近答對 ${pc(t.b.recent)}`}`})}).join("")}<p class="muted" style="font-size:12.5px;margin:6px 0 0">照進攻方剩下的大子分類（例如「車兵對士象全」）；分數跟「我的棋力」的殘局同一把尺。</p></div>`:""}
    </div></div>
    <details class="card" style="margin-top:8px"><summary><b>這些數字怎麼算的？</b></summary><div class="muted" style="font-size:13px;line-height:1.75;margin-top:6px">
      <p><b>這一頁就是「棋藝天賦」：</b>天賦不是現在多強，是同樣的練習量你進步得多快。同樣下 50 盤，有人進步很多、有人進步一點點，差別就在「長棋速度」。所以這裡看的是你的進步曲線，而不是現在的段位。它只用來決定怎麼練，不是給人打分數。</p>
      <p><b>每一步走得好不好：</b>Pikafish 幫每一盤的每一步評等，算出這盤每步準確度的平均（100 分＝步步都是電腦首選；跟「我的棋力」五邊形同一把尺，不含賽後報告的妙著加分和上限）。把一盤一盤的準確度照順序排起來，就是你的成長曲線。</p>
      <p><b>成長曲線怎麼看：</b>一般人學棋都是一開始進步快、後來慢慢變慢，最後碰到自己的瓶頸。從你的曲線可以估出三件事：剛學時的底子、長棋速度、能長到多高。下得還不多時，先參考一般棋友的樣子，下得越多就越貼近你自己。</p>
      <p><b>開局、中局、殘局呢：</b>現在多強看「我的棋力」五邊形，跟賽後報告同一把尺（每一步的準確度平均）；這一頁不再另外算一套。殘局功夫也用同一把尺。「平均每步少幾分」是棋力單位的損失，不換算成等級分；等級分只看電腦、線上分頁的段位積分。</p>
      <p><b>公平：</b>用過提示或悔棋的那盤不算進分數（還是算一次練習量）。</p>
      <p><b>資料從哪裡來：</b>對局、棋力測驗、猜著法、錯棋重練，沒做完的也算。大家的答題結果（只有題號和對錯）和成長曲線（只有練習量、準確度和段位）會匿名送到後台，每天校正一次題目難度和「一般棋友」的樣子，不含名字和代號。</p>
      <p><b>要注意：</b>剛開始特別好或特別差，之後常會回到平常的樣子，所以下得少時估計會比較保守；「能長到多高」在還沒碰到瓶頸前很難看準。</p>
      <details style="margin-top:4px"><summary>想再多知道一點（給家長）</summary><p><b>成長曲線：</b>每步準確度會從「剛學時的底子」往「能長到多高」慢慢靠近，練得越多越接近；靠近得多快，就是「長棋速度」。練習量這樣算：下一盤算 1，做一次測驗或猜一局著法算半盤，沒做完的按比例算。</p><p><b>「大概範圍」：</b>每個數字都只是估計，所以會附一個範圍，意思是「十次裡大約有八次會落在這中間」。下得越多，範圍就越窄、越準。</p><p><b>現在的棋力：</b>每下完一盤就小小修正一次，不會因為一盤特別好或特別差就大起大落。</p><p><b>棋力測驗：</b>題目有難有易，答對難題加得多、答錯簡單題扣得多；選擇題用猜的也可能猜對，這點也有算進去。</p><p><b>一般棋友：</b>拿來比較的「一般棋友」，是後台用大家匿名送來的成長曲線每天校正出來的（人還少的時候，先用「剛學約 55 分、最高約 82 分、每盤進步約 6%」當起點）。</p></details></div></details>`;
  const tg=box.querySelector("#tgo");if(tg)tg.onclick=()=>{vibrate(5);const b=document.querySelector('#sTabs button[data-k="all"]');if(b){b.click();scrollTo(0,0)}else location.hash="#/stats"};
  readMap(box.querySelector("#rdMap"),G);   /* 意見回饋 737 */
  if(pend.length)setTimeout(()=>talentBackfill(box,pend),300)}
function Stats(v){
  setTop("我的戰績","#/");setTabs(true,"#/");
  // 版面：上面一排「總覽／電腦／線上／獎勵」分頁，一次只看一類，不會越堆越長
  // 總覽＝三個重點數字＋棋力五邊形＋各模式勝負對照表＋對局紀錄；其他分頁各自的段位卡和細表
  const NET=!!(OFF&&window.XQNet),pct=(w,n)=>n?Math.round(w*100/n)+"%":"—";
  const reps=store.get("reports",{}),qz=store.get("quizBest",null);
  /* 意見回饋（開發者 11/6 分數審查）：總覽的「賽後報告平均」改成「每步準確度」——跟五邊形同一批資料（skillRows／talentCache5），
     每盤 pa 三階段加總÷步數的純準確度，排除用過提示或悔棋的盤，從最近一盤往回取到約 SK.WIN 步（跟五邊形同視窗）；等級用同一個 gradeFor。
     不再讀 store.reports（那只有打開過賽後報告的盤、含妙著加分和 69／79／89 上限、沒排除提示悔棋） */
  const accKPI=G=>{const R=(G||[]).filter(g=>g&&g.pa&&!g.hu&&rowAcc(g)!=null).sort((a,b)=>(b.t||0)-(a.t||0));let s=0,n=0,gn=0;
    for(const g of R){if(n>=SK.WIN)break;for(const k of["open","mid","end"]){const x=g.pa[k];if(x&&x[1]){s+=+x[0]||0;n+=x[1]}}gn++}
    return n?{v:Math.round(s/n),n,g:gn}:null};
  const rk=(hd,R,foot)=>{const N=R.w+R.l+R.d,pc=R.hi?Math.max(0,Math.min(100,Math.round((R.pts-R.lo)*100/(R.hi-R.lo)))):100;
    return`<div class="hd">${hd}</div><div class="mid"><span class="rk">${esc(R.rank)}</span><span class="pt"><b>${R.pts}</b> 分</span></div>
      <div class="st-bar"><i style="width:${pc}%"></i></div><div class="nx">${R.next?`再 ${R.toNext} 分升 ${esc(R.next)}`:"已是最高段位"}</div>
      <div class="st-wld"><div><b class="w">${R.w}</b><span>勝</span></div><div><b class="l">${R.l}</b><span>負</span></div><div><b class="d">${R.d}</b><span>和</span></div><div><b>${pct(R.w,N)}</b><span>勝率</span></div></div>${foot||""}`};
  const tabs=[["all","總覽","s_overview","📋"],["talent","我的成長","s_growth","📈"],["cpu","電腦","cpu","🤖"]].concat(NET?[["net","線上","online","🌐"]]:[]);
  let tab=store.get("statsTab","all");if(!tabs.some(t=>t[0]===tab))tab="all";
  v.innerHTML=`<div class="home st"><div class="st-tabs" id="sTabs">${tabs.map(([k,l,ic,em])=>`<button data-k="${k}">${ic?ETIMG(ic,"",em):em} ${l}</button>`).join("")}</div><div id="sWk"></div><div id="sBody"></div></div>`;
  let ST=null;const ld=Promise.all([api("/play/state").then(s=>ST=s).catch(()=>null)]);
  const sum=r=>({w:r.w||0,l:r.l||0,d:r.d||0});
  function rows(){const out=[];if(NET){const R=XQNet.rating();out.push(["🌐 線上對戰",sum(R)])}
    if(ST){let W=0,L=0,D=0;for(const[k,r]of Object.entries(ST.record||{})){if(k==="0")continue;W+=r.w||0;L+=r.l||0;D+=r.d||0}   /* 11/11：record 的第 0 級＝晉級賽（local.js playEnd 也記一份），晉級賽已經在積分挑戰那列，不重算 */
      out.push(["🏅 晉級賽",sum(ST.cpuRate||{})],["📚 練功房",{w:W,l:L,d:D}])}
    return out}
  const tbl=(head,list,extra)=>`<table class="st-lv"><tr><th>${head}</th><th>勝</th><th>負</th><th>和</th><th>勝率</th>${extra?`<th>${extra[0]}</th>`:""}</tr>
    ${list.map(([n,r,x])=>{const N=r.w+r.l+r.d;return`<tr><td>${n}</td><td>${r.w}</td><td>${r.l}</td><td>${r.d}</td><td>${pct(r.w,N)}</td>${extra?`<td>${x==null?"":x}</td>`:""}</tr>`}).join("")}</table>`;
  async function paint(){
    v.querySelectorAll("#sTabs button").forEach(b=>b.classList.toggle("on",b.dataset.k===tab));
    const box=v.querySelector("#sBody");{const w=v.querySelector("#sWk");if(w)w.innerHTML=tab==="talent"&&typeof weeklyEntryHTML==="function"?weeklyEntryHTML():""}   /* 開發者 11/8 核准：我的成長最上面放「本週學習週報」入口（m/04c-weekly.js） */
    if(tab==="all"){await ld;if(!v.isConnected||tab!=="all")return;
      const rs=rows(),T=rs.reduce((a,[,r])=>({w:a.w+r.w,l:a.l+r.l,d:a.d+r.d}),{w:0,l:0,d:0}),N=T.w+T.l+T.d;
      box.innerHTML=`<div class="st-kpi"><div><b>${pct(T.w,N)}</b><span>總勝率</span><small>${N} 盤</small></div>
          <div id="sAcc"><b>…</b><span>每步準確度</span><small>計算中</small></div>
          <div><b>${qz?esc(qz.rank):"—"}</b><span>棋力測驗</span><small>${qz?`答對 ${qz.ok}/${qz.n}`:'<a href="#/quiz">去測驗 ›</a>'}</small></div></div>
        <div class="sec-t">我的棋力<small class="muted" style="font-weight:400;font-size:12px;margin-left:6px">現在多強・最近約 150 步</small></div><div class="card" id="sPent"><div class="muted" style="text-align:center">計算中…</div></div>
        <div class="sec-t">各模式勝負</div><div class="card">${rs.length?tbl("模式",rs.concat([["<b>合計</b>",T]])):'<span class="muted">還沒有對局</span>'}</div>
        <div class="sec-t">對局紀錄</div><div id="sHist"></div>`;
      const HL=histList(box.querySelector("#sHist"),reps);
      skillPentagon(box.querySelector("#sPent")).then(r=>{const el=box.querySelector("#sAcc");if(!el||!r)return;const a=accKPI(r.G);
        el.innerHTML=a?`<b style="color:${gradeFor(a.v)[2]}">${a.v} ${gradeFor(a.v)[0]}</b><span>每步準確度</span><small>最近 ${a.g} 盤・${a.n} 步</small>`:`<b>—</b><span>每步準確度</span><small>還沒評過等</small>`;
        if(HL&&HL.paint)HL.paint()}).catch(e=>{const b=box.querySelector("#sPent");if(b)b.innerHTML=`<span class="muted">⚠ ${esc(e.message)}</span>`;const el=box.querySelector("#sAcc");if(el)el.innerHTML=`<b>—</b><span>每步準確度</span><small>算不出來</small>`})}
    else if(tab==="talent"){box.innerHTML='<div class="card muted" style="text-align:center;margin-top:4px">Pikafish 正在看你的每一盤棋…</div>';
      talentReport(box).then(()=>{if(box.isConnected&&tab!=="talent")paint();else{const d=box.querySelector(".tdet");if(d&&window.__tdetOpen){d.classList.add("open");const h=d.querySelector(".tdet-h");if(h)h.setAttribute("aria-expanded","true")}}}).catch(e=>{if(box.isConnected&&tab==="talent")box.innerHTML=`<div class="card muted">⚠ ${esc(e.message)}</div>`;else if(box.isConnected)paint()})}   /* hspx 11/11「紗燈・線上、棋桌・電腦打開跟我的成長一模一樣」：我的成長算得慢（手機、資料多），算完會蓋掉已經換過去的分頁；算完發現已經換頁，就重畫目前那一頁 */
    else if(tab==="cpu"){await ld;if(!v.isConnected||tab!=="cpu")return;
      if(!ST){box.innerHTML='<div class="card muted">載入失敗</div>';return}
      const CR=ST.cpuRate;
      box.innerHTML=`<div class="st-rk" style="margin-top:4px">${CR?rk(`${ETIMG("s_rank","","🏅")} 電腦段位・晉級賽`,CR):`<div class="hd">${ETIMG("s_rank","","🏅")} 電腦段位・晉級賽</div><div class="muted">還沒有晉級賽紀錄</div>`}<button class="go" id="cpuGo">開始晉級賽 ›</button></div>
        <div class="sec-t">練功房・各級</div><div class="card">${tbl("難度",ST.levels.map(l=>{const r=ST.record[l.n]||{};return[`<b>${l.n}</b> ${esc(l.name)}`,sum(r),r.w?'<span class="w">✔</span>':""]}),["過關"])}</div>`;
      box.querySelector("#cpuGo").onclick=()=>{store.set("cpuRanked",true);store.set("cpuWant","rank");location.hash="#/cpu"};
      if(typeof simAchHTML==="function")box.insertAdjacentHTML("beforeend",simAchHTML())}   /* 開發者 11/11 hspx：車輪戰戰績與特殊成就（08s-simul.js） */
    else if(tab==="net"){const R=XQNet.rating();
      box.innerHTML=`<div class="st-rk" style="margin-top:4px">${rk(`${ETIMG("online","","🌐")} 線上段位`,R)}<button class="go" id="lbGo">去線上大廳 ›</button></div>
        <div class="sec-t">段位怎麼算</div><div class="card" style="font-size:14px;line-height:1.7">從 0 分（新手）開始，用等級分的算法：先算你贏的機率（跟實力差不多的人是一半），加減＝K×（結果−贏的機率）。前 15 盤 K＝48，跟實力差不多的人下，贏約 +24、輸約 −24；之後 K＝32，約 ±16。對手比你強，贏得更多、輸得更少，反過來也一樣；和棋也會依對手強弱小幅加減（對手比你強就加一點、比你弱就扣一點）。分數不會低於 0。中途取消、對方斷線中止、雙方還沒各走一步就結束的對局不計分。${/* 意見回饋（開發者 11/6 分數審查）：照 net.js record() 實作的 K 值改寫 */""}<div class="muted" style="margin-top:6px">${XQNet.ranks().map(([n,p])=>`${esc(n)} ${p}`).join("・")}</div></div>`;
      box.querySelector("#lbGo").onclick=()=>location.hash="#/lobby"}
  }
  v.querySelectorAll("#sTabs button").forEach(b=>b.onclick=()=>{vibrate(5);tab=b.dataset.k;store.set("statsTab",tab);paint()});
  paint();return{}}
/* hspx 11/11「詳細數字無法展開」→「展開後又瞬間收起」→錄影「一直頁面跳動」（iPhone）：iPhone Safari 的原生 details 在手卷裡會自己多切換一次。
   改成不用 details：一顆按鈕（.tdet-h）加內容區（.tdet-b），開合只由這裡切 class；0.35 秒內重複的點選不理；內容被重畫後記得重新打開 */
(()=>{const st=document.createElement("style");st.textContent=".tdet>.tdet-h{display:block;width:100%;text-align:left;cursor:pointer;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:inherit;font:inherit;font-weight:700;font-size:14px;line-height:1.5;-webkit-tap-highlight-color:transparent;touch-action:manipulation}.tdet>.tdet-h::after{content:\" ▾\";color:var(--muted)}.tdet.open>.tdet-h::after{content:\" ▴\"}.tdet:not(.open)>.tdet-b{display:none}";document.head.append(st)})();
document.addEventListener("click",e=>{const h=e.target&&e.target.closest&&e.target.closest(".tdet>.tdet-h");if(!h)return;e.preventDefault();const d=h.parentElement,now=Date.now();if(d._tgAt&&now-d._tgAt<350)return;d._tgAt=now;
  const on=!d.classList.contains("open");d.classList.toggle("open",on);h.setAttribute("aria-expanded",String(on));window.__tdetOpen=on});
