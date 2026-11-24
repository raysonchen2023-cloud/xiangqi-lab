/* ---------- W48-S4 反宮馬門門內玩法「活字排局陣」（排序）----------
   開發者 11/22「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 1 節＋_Claude審稿.md 第 1、2 點。
   掌門陶秉衡是歙縣刻書坊刻版師傅。一段反宮馬開局被拆成一張張「活字」打散，玩家照順序排回（一張一張點，棋盤當場照走）。
   題目取自反宮馬門 22 課的主線（data/opening-school/palace_horse.json，ex.pre＋每個 mv 節點的 h 與回應 r），不用引擎；一律從開局第一步開始（審稿第 1 點：開局題不能用「剩幾顆子」分級）：
     初級：6 步，只打散黑方的步（紅方照主線固定）；中級：8 步，只打散黑方；高級：8 步，紅黑都打散。
   判對錯（審稿第 2 點，由程式指出錯在哪）：每排一張就照走——走不下去當場說「第幾步、哪一張、為什麼」（那一格沒有這顆子、這步不合法）；
     排完比最後局面：跟主線一樣就算對（換了次序但走到同一個局面也算），不一樣就說哪幾格不同。
   修為：一輪 3 題全對，每天 +10（只給一次）。門內頁入口（雕版案）等反宮馬門門內圖出好再接；這裡先提供 jhFanggongOpen()。 */
const JH_FG_LV=[
  {k:"easy",zh:"初級",en:"Easy",n:6,both:false},
  {k:"mid",zh:"中級",en:"Medium",n:8,both:false},
  {k:"hard",zh:"高級",en:"Hard",n:8,both:true}];
const JH_FG_SID="palace_horse";
function jhFgGet(){let o=null;try{o=store.get("jhFanggong",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:JH_FG_LV.some(x=>x.k===o.lv)?o.lv:"easy",d:typeof o.d==="string"?o.d.slice(0,12):""}}
function jhFgSet(o){try{store.set("jhFanggong",o)}catch(e){}}
const jhFgHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
/* FNV 低位元混得不夠：先打散再取高位元（同 07z9e 的經驗） */
const jhFgIdx=(h,n)=>{h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return Math.floor((h>>>0)/4294967296*n)};
const jhFgDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
/* W73（11/23 Windows Claude 1 用 Pikafish 驗出）：palace_horse_06 例題 b 的前置步序「炮二平五 砲8平6 傌二進三…」第 2 手就漏中卒
   （紅方炮五進四吃掉後 +402），玩家不該照這條背；課程資料在 data/（網站成品，要走發布 PR），這裡先不出這條 */
const JH_FG_SKIP=new Set(["palace_horse_06/b"]);
/* 課程主線：每個例題 pre ＋ 一路照提示著法（h）與回應（r）走到底；去掉重複；JH_FG_SKIP 列的例題不出 */
function jhFgLines(D){const out=[],seen=new Set();
  for(const L of (D&&D.lessons)||[])for(const ex of L.ex||[]){if(JH_FG_SKIP.has(L.id+"/"+ex.id))continue;const mv=[...(ex.pre||[])];let n=ex.root;
    while(n){if(n.k==="mv"&&n.ok&&n.ok[n.h]){const o=n.ok[n.h];mv.push(n.h);if(o.r)mv.push(o.r);n=o.n}else n=n.n}
    const k=mv.join(" ");if(mv.length&&!seen.has(k)){seen.add(k);out.push(mv)}}
  return out}
/* 照主線走一遍：回傳每一步的中文記法與最後局面 */
function jhFgWalk(seq){const C=window.XQCore;let b=C.parseFen(C.START.split(" ")[0]);const nt=[];
  for(const u of seq){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));nt.push(C.notate(b,f,t));b=C.make(b,f,t)}return{nt,b}}
/* 出一題：照種子挑一條夠長的主線，取前 n 步；要打散的步（只黑方＝奇數步，或全部）洗牌成活字，洗完不能跟原本一樣 */
/* 11/24 Pikafish 盤整 P2：初級 42 條主線只有 10 種前 6 步（17 條一模一樣），一輪 3 題常重複——先照「前 n 步」去重，同一輪也不出一樣的（avoid） */
function jhFgPool(lines,n,avoid){const seen=new Set(),pool=[];for(const l of lines){if(l.length<n)continue;const k=l.slice(0,n).join(" ");if(!seen.has(k)){seen.add(k);pool.push(l)}}
  const rest=avoid&&avoid.size?pool.filter(l=>!avoid.has(l.slice(0,n).join(" "))):pool;return rest.length?rest:pool}
function jhFgMake(lines,L,seed,avoid){const C=window.XQCore,pool=jhFgPool(lines,L.n,avoid);if(!pool.length)return null;
  const line=pool[jhFgIdx(jhFgHash("fg:"+seed),pool.length)],seq=line.slice(0,L.n),{nt}=jhFgWalk(seq);
  const slots=seq.map((u,i)=>L.both||i%2===1?i:-1).filter(i=>i>=0);
  let cards=slots.map(i=>({u:seq[i],nt:nt[i],side:i%2?"b":"r"}));
  for(let k=cards.length-1;k>0;k--){const j=jhFgIdx(jhFgHash(seed+"|"+k),k+1);[cards[k],cards[j]]=[cards[j],cards[k]]}
  if(cards.every((c,i)=>c.u===seq[slots[i]]))cards.push(cards.shift());   /* 洗完跟原本一樣就轉一格 */
  return{seq,nt,slots,cards,seed}}
function jhFgRound(lines,L,day){const o=[],used=new Set();for(let i=0;i<3;i++){const q=jhFgMake(lines,L,day+":"+L.k+":"+i,used);if(q){o.push(q);used.add(q.seq.join(" "))}}return o}
/* 照玩家排的順序走：ans＝完整 n 步（固定的步＋玩家排的活字）。回傳 {ok, step, why}；全部走完再比局面 */
function jhFgCheck(q,ans){const C=window.XQCore,NM=C.NAMES;let b=C.parseFen(C.START.split(" ")[0]),s="r";
  for(let i=0;i<ans.length;i++){const u=ans[i],f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4)),p=b[f],want=q.nt[q.seq.indexOf(u)]||u;
    if(!p||C.sideOf(p)!==s)return{ok:false,step:i,why:`第 ${i+1} 步「${want}」走不下去：那一格現在沒有${s==="r"?"紅":"黑"}方的子（次序排錯了，這顆子還沒走到那裡）。`};
    /* W48-S4 預驗 P3（11/24 開發者「挪到送審前」）：不合法時往回找是前面哪一步走過去的子擋住——把那顆子暫時拿掉，這步就合法了，就是它；找不到（例如走了會被將軍）照舊說「被擋住，或走了會被將軍」 */
    if(!C.legal(b,s).some(([x,y])=>x===f&&y===t)){let by="";for(let k=i-1;k>=0&&!by;k--){const d=C.parseSq(ans[k].slice(2,4));if(d===f||d===t||!b[d])continue;const b2=b.slice();b2[d]=null;if(C.legal(b2,s).some(([x,y])=>x===f&&y===t))by=`被第 ${k+1} 步「${q.nt[q.seq.indexOf(ans[k])]||ans[k]}」走過去的那顆子擋住了`}
      return{ok:false,step:i,why:`第 ${i+1} 步「${want}」走不下去：這一步現在不合法（${by||"被擋住，或走了會被將軍"}）。`}}
    b=C.make(b,f,t);s=C.opp(s)}
  if(ans.length<q.seq.length)return{ok:null,step:ans.length,why:""};
  /* 開發者 11/22 選單「照主線次序才算對」：開局黑方的步多半換了次序也走得通、局面一樣，只看局面會變成亂排也對；這裡練的是反宮馬的步序 */
  const i=ans.findIndex((u,k)=>u!==q.seq[k]);
  if(i<0)return{ok:true,step:ans.length,why:""};
  const later=q.seq.indexOf(ans[i]);
  return{ok:false,step:i,order:true,why:`次序不對：第 ${i+1} 步主線先走「${q.nt[i]}」，你排的是「${q.nt[later]}」（主線第 ${later+1} 步才走）。反宮馬講究步序，先後換了，對方的攻勢就可能搶在前面。`}}
function jhFgDayXP(){const G=jhFgGet(),d=jhFgDay();if(G.d===d)return 0;G.d=d;jhFgSet(G);if(typeof addXP==="function")try{addXP(10,jhL("活字排局陣","Movable-type openings"),"fanggong:"+d)}catch(e){}return 10}

async function jhFanggongOpen(lv0){const G=jhFgGet(),L=JH_FG_LV.find(x=>x.k===(lv0||G.lv))||JH_FG_LV[0];
  let D=null;try{D=typeof oscData==="function"?await oscData(JH_FG_SID):await (await fetch(`data/opening-school/${JH_FG_SID}.json`)).json()}catch(e){D=null}
  const Q=D?jhFgRound(jhFgLines(D),L,jhFgDay()):[];
  if(!Q.length){toast(jhL("雕版還在刻，等一下再試。","The printing blocks aren't ready. Try again shortly."));return}
  G.lv=L.k;jhFgSet(G);let qi=0,right=0;
  sheet(jhL("🖋 雕版案・活字排局陣","🖋 Printing desk · Movable-type openings"),b=>{
    b.innerHTML=`<p class="muted">${esc(jhL("陶秉衡：「字模排歪了印出來就糊，棋步排亂了中卒也守不住，來排排看！」","Tao Bingheng: \"Misplace a type and the print blurs; misorder the moves and your center pawn falls. Set them right!\""))}</p>
      <div class="jh-gp-lv">${JH_FG_LV.map(x=>`<button class="btn ${x.k===L.k?"":"ghost"}" data-lv="${x.k}">${esc(jhL(x.zh,x.en))}</button>`).join("")}</div>
      <p id="jhFgQ" class="jh-gp-q"></p><div id="jhFgB" class="jh-scr-bd"></div>
      <ol id="jhFgS" class="jh-fg-slots"></ol><div id="jhFgC" class="jh-fg-cards"></div>
      <div class="jh-actions"><button class="btn ghost" id="jhFgU">${esc(jhL("↶ 撤回一張","↶ Undo"))}</button><button class="btn ghost" id="jhFgH">${esc(jhL("💡 亮出下一張","💡 Show next"))}</button><button class="btn" id="jhFgN" style="display:none"></button></div>
      <p id="jhFgM" class="jh-mate-say" style="display:none"></p>`;
    const $=s=>b.querySelector(s),C=window.XQCore,brd=Board();$("#jhFgB").append(brd.svg);
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{try{closeSheet()}catch(e){}setTimeout(()=>jhFanggongOpen(x.dataset.lv),250)});
    let q=null,used=[],done=false;
    const say=t=>{const s=$("#jhFgM");s.style.display=t?"":"none";s.textContent=t||""};
    /* 目前排出來的完整序列：固定的步照主線，打散的步依玩家點的順序填 */
    const ans=()=>{const o=[];let k=0;for(let i=0;i<q.seq.length;i++){if(!q.slots.includes(i)){o.push(q.seq[i]);continue}if(k>=used.length)break;o.push(q.cards[used[k++]].u)}return o};
    const nextSlot=()=>q.slots[used.length];
    const draw=()=>{const a=ans(),r=jhFgCheck(q,a);let bd=C.parseFen(C.START.split(" ")[0]),last=null;
      for(let i=0;i<(r.ok===false&&r.step<a.length?r.step:a.length);i++){const f=C.parseSq(a[i].slice(0,2)),t=C.parseSq(a[i].slice(2,4));bd=C.make(bd,f,t);last={f,t}}
      brd.draw(bd,{last});
      const ns=nextSlot();
      $("#jhFgS").innerHTML=q.seq.map((u,i)=>{const fixed=!q.slots.includes(i),k=q.slots.indexOf(i),c=k>=0&&k<used.length?q.cards[used[k]]:null;
        return`<li class="${fixed?"fix":c?"set":i===ns?"next":""}">${esc(fixed?q.nt[i]:c?c.nt:(i===ns?jhL("← 下一張","← next"):"＿＿"))}</li>`}).join("");
      $("#jhFgC").innerHTML=q.cards.map((c,k)=>`<button class="btn ${used.includes(k)?"ghost":""} jh-fg-card ${c.side}" data-k="${k}" ${used.includes(k)||done?"disabled":""}>${esc(c.nt)}</button>`).join("");
      $("#jhFgC").querySelectorAll("[data-k]").forEach(x=>x.onclick=()=>pick(+x.dataset.k));
      return r};
    const start=()=>{q=Q[qi];used=[];done=false;say("");$("#jhFgN").style.display="none";
      $("#jhFgQ").textContent=jhL(`第 ${qi+1}／${Q.length} 題：反宮馬開局 ${q.seq.length} 步，${L.both?"紅黑":"黑方"}的活字被打散了。照次序一張一張點回去（${L.both?"紅字是紅方、黑字是黑方":"紅方的步已經排好"}）。`,
        `${qi+1}/${Q.length}: a ${q.seq.length}-move Palace Horse opening; the ${L.both?"red and black":"black"} types are shuffled. Tap them back in order.`);draw()};
    const pick=k=>{if(done||used.includes(k))return;
      const r0=jhFgCheck(q,ans());if(r0.ok===false&&r0.step<ans().length){say(jhL("前面有一張走不下去，先按「撤回一張」。","An earlier type doesn't fit; tap Undo first."));return}
      const ns=nextSlot(),side=ns%2?"b":"r";
      if(q.cards[k].side!==side){say(jhL(`現在輪${side==="r"?"紅":"黑"}方：第 ${ns+1} 步要放${side==="r"?"紅":"黑"}字。`,`It's ${side==="r"?"Red":"Black"}'s move ${ns+1}.`));return}
      used.push(k);const r=draw();
      if(r.ok===false&&r.step<ans().length){say(r.why+jhL("按「撤回一張」換一張。"," Tap Undo and try another."));return}
      if(r.ok===null){say("");return}
      done=true;draw();if(r.ok)right++;
      say(r.ok?jhL("好眼力！活字排得正，棋路也走得順。","Sharp eye! The types are set and the moves flow.")+(r.why?" "+r.why:""):r.why+jhL("按「撤回一張」再排。"," Tap Undo and rearrange."));
      if(!r.ok){done=false;return}
      const nb=$("#jhFgN");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("印好了","Done");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;start();return}nb.style.display="none";const xp=right===Q.length?jhFgDayXP():0;
        say(jhL(`這一輪排對 ${right}／${Q.length} 題。${xp?`全對，修為 +${xp}`:""}`,`${right}/${Q.length} set right.${xp?` All right: +${xp} XP`:""}`))}};
    $("#jhFgU").onclick=()=>{if(done||!used.length)return;used.pop();say("");draw()};
    $("#jhFgH").onclick=()=>{if(done)return;const ns=nextSlot(),want=q.seq[ns],k=q.cards.findIndex((c,i)=>!used.includes(i)&&c.u===want);
      if(k<0){say(jhL("前面有一張排錯了，先撤回。","An earlier type is wrong; undo first."));return}
      const el=$("#jhFgC").querySelector(`[data-k="${k}"]`);if(el){el.classList.add("hint");setTimeout(()=>el.classList.remove("hint"),1600)}say(jhL(`第 ${ns+1} 步是「${q.cards[k].nt}」。`,`Move ${ns+1} is "${q.cards[k].nt}".`))};
    start()})}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhFgCss";s.textContent=`
.jh-fg-slots{display:grid;grid-template-columns:repeat(2,1fr);gap:2px 10px;margin:6px 0 6px 1.4em;padding:0;font-size:15px}.jh-fg-slots li.fix{opacity:.6}.jh-fg-slots li.next{font-weight:700}
.jh-fg-cards{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.jh-fg-card{padding:6px 10px;font-size:16px}.jh-fg-card.r{color:#B3261E}.jh-fg-card.hint{outline:3px solid #F2B705}`;
  if(!document.getElementById("jhFgCss"))document.head.append(s)})();
