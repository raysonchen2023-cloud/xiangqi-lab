/* ---------- W48-S7 仙人指路門門內玩法「探路猜陣勢」（推測）----------
   開發者 11/22：「把門派任務分給其他三個人平行做完剩下的門派」；Windows Claude 1 派給 iMac Claude 2。
   定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 4 節＋_Claude審稿.md（不用殘子數分難度；答錯由程式指出三條路線第一個分岔的那一步）。
   掌門季聽蘭是揚州鹽商家老太太：「園子裡岔路多，先探三步瞧瞧他走哪條道，老身看你猜得準不準。」
   題目：紅方先挺兵（兵七進一或兵三進一），盤上照課程主線走幾步，玩家從三種布局猜黑方走的是哪一路。
   題庫：仙人指路門課程（data/opening-school/pawn.json）第 7～16 課，每一課就是一種黑方應法（對挺卒、卒底炮、同側／另一側中炮、
     同側／另一側跳馬、同側／另一側飛象、士角炮、過宮炮），每課有兵七、兵三兩個例題。題目直接取例題主線（ex.pre＋每個 mv 節點的提示著法與回應），不用引擎。
     課程主線到黑方第 2 步為止（定稿寫「黑連走 3 步」，課程目前只有兩步；之後課程加長，這裡照主線多秀幾步即可）。
   難度（審稿：初級三個選項差很多、高級只差一步）：
     初級：三個選項三種不同的子（炮、馬、象、卒各算一類）；中級：一個同類、一個不同類；高級：兩個都同類（例如同側中炮對另一側中炮，只差左右；
       馬、象、卒類各只有兩課，湊不出三個同類，所以高級的答案都在炮類五課裡）。
   答錯：照三個選項各自的主線（同一邊挺兵的那一個例題）比對，指出黑方第一個分岔的那一步：「他第 N 步走了某某，只有這一路會這樣走」。
   提示：標出對手這幾步裡最特別的一步（另外兩個選項在同一步都不會這樣走的那一步）。
   修為：一輪 3 題全對，每天 +10（只給一次）；另記「揚州園林探路紀錄」（累計答對題數）。門內頁入口（山徑岔口指路奇岩）等仙人指路門門內圖出好再接；這裡先提供 jhXianrenOpen()。 */
const JH_XR_LV=[
  {k:"easy",zh:"初級",en:"Easy",same:0},
  {k:"mid",zh:"中級",en:"Medium",same:1},
  {k:"hard",zh:"高級",en:"Hard",same:2}];
const JH_XR_CAT={
  pawn_07:{zh:"對挺卒",en:"Pawn for pawn",fam:"p"},
  pawn_08:{zh:"卒底炮",en:"Cannon under the pawn",fam:"c"},
  pawn_09:{zh:"同側中炮",en:"Central cannon, same side",fam:"c"},
  pawn_10:{zh:"另一側中炮",en:"Central cannon, other side",fam:"c"},
  pawn_11:{zh:"同側跳馬",en:"Horse, same side",fam:"n"},
  pawn_12:{zh:"另一側跳馬",en:"Horse, other side",fam:"n"},
  pawn_13:{zh:"同側飛象",en:"Elephant, same side",fam:"b"},
  pawn_14:{zh:"另一側飛象",en:"Elephant, other side",fam:"b"},
  pawn_15:{zh:"士角炮",en:"Palace-corner cannon",fam:"c"},
  pawn_16:{zh:"過宮炮",en:"Cross-palace cannon",fam:"c"}};
function jhXrGet(){let o=null;try{o=store.get("jhXianren",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:JH_XR_LV.some(x=>x.k===o.lv)?o.lv:"easy",d:typeof o.d==="string"?o.d.slice(0,12):"",n:Math.max(0,Math.min(99999,+o.n||0))}}
function jhXrSet(o){try{store.set("jhXianren",o)}catch(e){}}
const jhXrHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
const jhXrIdx=(h,n)=>{h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return Math.floor((h>>>0)/4294967296*n)};
const jhXrDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
/* 課程裡第 7～16 課每個例題的主線：{cat, side:"c3c4"|"g3g4"（紅方先挺哪個兵）, mv} */
function jhXrLines(D){const out=[];
  for(const L of (D&&D.lessons)||[]){if(!JH_XR_CAT[L.id])continue;
    for(const ex of L.ex||[]){const mv=[...(ex.pre||[])];let n=ex.root;
      while(n){if(n.k==="mv"&&n.ok&&n.ok[n.h]){const o=n.ok[n.h];mv.push(n.h);if(o.r)mv.push(o.r);n=o.n}else n=n.n}
      if(mv.length>=4&&(mv[0]==="c3c4"||mv[0]==="g3g4"))out.push({cat:L.id,side:mv[0],mv})}}
  return out}
const jhXrBlack=mv=>mv.filter((u,i)=>i%2===1);
/* 出一題：答案主線＋另外兩個選項（照難度挑同類或不同類），選項各自取同一邊挺兵的例題 */
function jhXrMake(lines,L,seed){const pool=lines;if(!pool.length)return null;let h=jhXrHash("xr:"+seed);const R=()=>{h=jhXrHash(h+"|");return h};
  for(let t=0;t<40;t++){const ans=pool[jhXrIdx(R(),pool.length)],fam=JH_XR_CAT[ans.cat].fam;
    const others=[...new Set(lines.filter(x=>x.side===ans.side&&x.cat!==ans.cat).map(x=>x.cat))];
    const same=others.filter(c=>JH_XR_CAT[c].fam===fam),diff=others.filter(c=>JH_XR_CAT[c].fam!==fam);
    if(same.length<L.same||diff.length<2-L.same)continue;
    const pick=(arr,n,distinct)=>{const a=arr.slice(),o=[];while(o.length<n&&a.length){const c=a.splice(jhXrIdx(R(),a.length),1)[0];if(distinct&&o.some(x=>JH_XR_CAT[x].fam===JH_XR_CAT[c].fam))continue;o.push(c)}return o};
    /* 初級：三個選項三種不同的子（兩個錯的選項也不同類）；中、高級照 same 挑同類 */
    const dd=pick(diff,2-L.same,L.same===0),ss=pick(same,L.same,false);if(dd.length<2-L.same||ss.length<L.same)continue;
    const opts=[ans.cat,...ss,...dd];
    for(let k=opts.length-1;k>0;k--){const j=jhXrIdx(R(),k+1);[opts[k],opts[j]]=[opts[j],opts[k]]}
    const ref={};for(const c of opts)ref[c]=(lines.find(x=>x.cat===c&&x.side===ans.side)||{}).mv||[];
    return{mv:ans.mv,cat:ans.cat,side:ans.side,opts,ref,seed}}
  return null}
function jhXrRound(lines,L,day){const o=[],seen=new Set();for(let i=0;i<12&&o.length<3;i++){const q=jhXrMake(lines,L,day+":"+L.k+":"+i);if(q&&!seen.has(q.cat)){seen.add(q.cat);o.push(q)}}return o}   /* 一輪三題的答案各是不同的布局 */
/* 黑方第一個分岔的那一步：題目主線跟「選錯的那一路」比，回傳 {n:第幾步（黑方的第幾步）, ply, u} */
function jhXrFork(q,wrong){const A=jhXrBlack(q.mv),B=jhXrBlack(q.ref[wrong]||[]);for(let i=0;i<A.length;i++)if(A[i]!==B[i])return{n:i+1,ply:i*2+1,u:A[i]};return null}
/* 最特別的一步：另外兩個選項在同一步都不會這樣走的那一步（取最早的） */
function jhXrSpecial(q){const A=jhXrBlack(q.mv),O=q.opts.filter(c=>c!==q.cat).map(c=>jhXrBlack(q.ref[c]));
  for(let i=0;i<A.length;i++)if(O.every(B=>B[i]!==A[i]))return{n:i+1,ply:i*2+1,u:A[i]};return null}
function jhXrNt(mv,ply){const C=window.XQCore;let b=C.parseFen(C.START.split(" ")[0]);for(let i=0;i<ply;i++){const u=mv[i];b=C.make(b,C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4)))}
  const u=mv[ply];const cn=C.notate(b,C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4)));return typeof oscEn==="function"&&oscEn()&&typeof i18nWxf==="function"?(i18nWxf(cn)||cn):cn}
function jhXrDayXP(){const G=jhXrGet(),d=jhXrDay();if(G.d===d)return 0;G.d=d;jhXrSet(G);if(typeof addXP==="function")try{addXP(10,jhL("探路猜陣勢","Read the path"),"xianren:"+d)}catch(e){}return 10}
function jhXrCount(){const G=jhXrGet();G.n++;jhXrSet(G);return G.n}

async function jhXianrenOpen(lv0){const G=jhXrGet(),L=JH_XR_LV.find(x=>x.k===(lv0||G.lv))||JH_XR_LV[0];
  let D=null;try{D=typeof oscData==="function"?await oscData("pawn"):await (await fetch("data/opening-school/pawn.json")).json()}catch(e){D=null}
  const Q=D?jhXrRound(jhXrLines(D),L,jhXrDay()):[];
  if(!Q.length){toast(jhL("園子的岔路還沒理好，等一下再試。","The garden paths aren't ready. Try again shortly."));return}
  G.lv=L.k;jhXrSet(G);let qi=0,right=0;
  sheet(jhL("🪨 指路奇岩・探路猜陣勢","🪨 Signpost rock · Read the path"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("季聽蘭：「園子裡岔路多，先探三步瞧瞧他走哪條道，老身看你猜得準不準。」","Ji Tinglan: \"The garden has many forks. Watch his first steps and tell me which path he takes.\""))}</p>
      <div class="jh-gp-lv">${JH_XR_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhXrQ" class="jh-gp-q"></p><div id="jhXrB" class="jh-scr-bd"></div><ol id="jhXrM" class="jh-xr-mv"></ol>
      <div class="jh-actions" id="jhXrA"></div>
      <div class="jh-actions"><button class="btn ghost" id="jhXrH">${esc(jhL("💡 提示","💡 Hint"))}</button><button class="btn" id="jhXrN" style="display:none"></button></div>
      <p id="jhXrS" class="jh-mate-say" style="display:none"></p>`;
    const $=s=>b.querySelector(s),C=window.XQCore,brd=Board();$("#jhXrB").append(brd.svg);let q=null,done=false,mark=-1;
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{try{closeSheet()}catch(e){}setTimeout(()=>jhXianrenOpen(x.dataset.lv),250)});
    const say=t=>{const s=$("#jhXrS");s.style.display=t?"":"none";s.textContent=t||""};
    const draw=()=>{let bd=C.parseFen(C.START.split(" ")[0]),last=null;for(const u of q.mv){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));bd=C.make(bd,f,t);last={f,t}}brd.draw(bd,{last});
      $("#jhXrM").innerHTML=q.mv.map((u,i)=>`<li class="${i%2?"b":"r"}${i===mark?" on":""}">${esc(jhXrNt(q.mv,i))}</li>`).join("")};
    const start=()=>{q=Q[qi];done=false;mark=-1;say("");$("#jhXrN").style.display="none";
      $("#jhXrQ").textContent=jhL(`第 ${qi+1}／${Q.length} 題：紅方先挺兵試探，黑方這樣應。他走的是哪一路？`,`${qi+1}/${Q.length}: Red probes with a pawn and Black answers like this. Which path is he on?`);
      $("#jhXrA").innerHTML=q.opts.map(c=>`<button class="btn ghost" data-c="${c}">${esc(jhL(JH_XR_CAT[c].zh,JH_XR_CAT[c].en))}</button>`).join("");
      $("#jhXrA").querySelectorAll("[data-c]").forEach(x=>x.onclick=()=>answer(x.dataset.c));draw()};
    const answer=c=>{if(done)return;done=true;const ok=c===q.cat;if(ok){right++;jhXrCount()}
      $("#jhXrA").querySelectorAll("[data-c]").forEach(x=>{x.disabled=true;if(x.dataset.c===q.cat)x.classList.remove("ghost")});
      if(ok)say(jhL(`眼力夠老道！一眼看穿他走的是「${JH_XR_CAT[q.cat].zh}」。`,`A seasoned eye! He's on "${JH_XR_CAT[q.cat].en}".`));
      else{const f=jhXrFork(q,c);mark=f?f.ply:-1;draw();
        say(f?jhL(`他第 ${f.n} 步走了「${jhXrNt(q.mv,f.ply)}」，只有「${JH_XR_CAT[q.cat].zh}」這一路會這樣走（「${JH_XR_CAT[c].zh}」這一步不是這樣走）。`,`His move ${f.n} was ${jhXrNt(q.mv,f.ply)}; only "${JH_XR_CAT[q.cat].en}" goes that way.`):jhL(`這一路是「${JH_XR_CAT[q.cat].zh}」。`,`This is "${JH_XR_CAT[q.cat].en}".`))}
      const nb=$("#jhXrN");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("回園子","Done");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}nb.style.display="none";const xp=right===Q.length?jhXrDayXP():0;
        say(jhL(`這一輪猜對 ${right}／${Q.length} 題（揚州園林探路紀錄：累計 ${jhXrGet().n} 題）。${xp?`全對，修為 +${xp}`:""}`,`${right}/${Q.length} correct (${jhXrGet().n} in total).${xp?` All right: +${xp} XP`:""}`))}};
    $("#jhXrH").onclick=()=>{if(done)return;const s=jhXrSpecial(q);mark=s?s.ply:-1;draw();
      say(s?jhL(`留意他第 ${s.n} 步「${jhXrNt(q.mv,s.ply)}」：另外兩路在這一步都不會這樣走。`,`Watch his move ${s.n}, ${jhXrNt(q.mv,s.ply)}: the other two paths never play it.`):"")};
    start()})}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhXrCss";s.textContent=`
.jh-xr-mv{display:grid;grid-template-columns:repeat(2,1fr);gap:2px 10px;margin:6px 0 6px 1.4em;padding:0;font-size:15px}.jh-xr-mv li.r{color:#B3261E}.jh-xr-mv li.on{font-weight:800;outline:2px solid #F2B705;outline-offset:1px}`;
  if(!document.getElementById("jhXrCss"))document.head.append(s)})();
