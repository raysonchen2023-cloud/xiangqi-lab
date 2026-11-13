/* ================= 🌸 二十女棋手的故事線（開發者 11/8 核准第一波 4 案；提問 story/gemini_app/31_二十女棋手故事線十案.md）=================
   原則：每段推進都落在一盤棋或一題殘局；不加新貨幣、不抽卡、不限時逼登入；只在石桌往事的園子、驛站、珍品冊出現，線上對戰完全不碰。
   女棋手都是原創平民（PARK_NPC，06-cpu.js），不寫成史上真人的親友；七星的台詞照《雲河七星》口吻（方庭不叫「庭哥」），只用選角卡上公開的身世，不說破後段。
   這個檔不改別人的檔：用「包一層」接上原本的函式（跟 07t-episodes.js 同一種做法）——
     npcAskMaybe（07d，園子開局）、npcHello（07d，開局第一句）、meGameTalk（05b，七星開局那句；有拌嘴時讓出來）、npcBondUp（07d，羈絆升級卡）、
     gardenInn（07d，驛站清單）、yzMail／yzUnread（07m，驛站信箱與新信數）、relicBook（07-legend，珍品冊）、parkNpcNew（06-cpu，園子遇到誰）、battleMarkId（07g，打下戰役）、
     shipMorePool（07o，挑題池；這裡挑過的題不再出給續局）；挑到的題也記進一盞茶的 seen（茶單、續局都會跳過）。
   開關（每案一個常數；開發者模式可以在驛站清單的「🧪 女棋手故事線」暫時打開試玩，store "wmDev"，不跟存檔走）：
   5 飛鴿傳譜（WM_PIGEON_ON）：羈絆滿 3 級的女棋手，之後每隔 5～7 個「有下棋的日子」（store "wmDays"，記有拿到修為的那幾天；不是每日登入）往驛站信箱寄一封飛鴿信，
     每人 3 封（WM_PG），附一局她從別處得來的殘局（照信裡的標籤從一盞茶題庫挑，跳過其他玩法用到的題；漢、隋、唐的人不出有炮的題）；不看答案解開＝回信，修為 +15。
   2＋9 本命子之道（WM_BENMING_ON）：你的七星角色在園子遇到愛用子相同或身世呼應的女棋手（WM_BM，七人各 2～4 位），開局改成兩人拌嘴（她一句、你一句、她再一句）；
     三成改成「比本命子」：一題該子的一步妙著（data/canju/women-set.json，從 benming-pool.json 挑的，Pikafish 驗過最佳著與次佳差 200 分以上），一天最多 2 題，解開修為 +10。
     羈絆升到 2、3 級時，偶爾多一句點到七星心結的話（WM_BM[角色][女].ht，一位只說一次）。
   1 千秋殘譜流轉（WM_SCROLL_ON）：兩條跨朝代的線（WM_SCR）。清弦圖：漢 琴師 滿級給上卷 → 唐 牡丹娘子 考你守住「單車難破士象全」（#/ship/wmhold/a，jLevel 的 relay）→ 明 琵琶女 考一題 → 三卷合一＝sq218（《適情雅趣》〈路隔星河〉，6 步殺）；
     蘆花圖：宋 漁家女 滿級給上段 → 元 青花女工 考一題「一步都不能錯」→ 清 繡娘 考你守住馬卒來攻（#/ship/wmhold/b）→ 合一＝xw077（《心武殘編》〈四季落花〉）。
     兩個守局都用 Pikafish 驗過是和局（深度 22，±0.2 以內）；兩題終局 Pikafish 深度 24 都是唯一一手開始的連殺。解完收進珍品冊上方的「📜 千秋殘譜」（信物：清弦帛書、蘆花繡帕），修為 +40。
   7 古戰場的迴響（WM_ECHO_ON）：打下 WM_EC 寫好的那幾場戰役（舊卷一那 5 場，照戰役 id 認）後 24 小時內進那一朝的園子，這一朝的女棋手（WM_EC 寫好每場由誰說）一定坐在石桌對面，說起這一仗，再擺一題同一個道理的殘局
     （照 battles.json 的 lessons 標籤挑），解開修為 +15；每場一次。秦、三國、魏晉、南北朝、五代沒有女棋手，跳過。
   存檔（05b-save.js JOURNEY_KEYS）：wmDays＝有下棋的日子；wmPg＝{女:{s0 開始數的那天,L:[{d 寄到那天,at,q 題號,r 讀了,ok 回信了}]}}；wmBm＝{d 今天,n 今天比了幾題,ok {題號:時間},ht {角色:女:時間}}；
     wmScr＝{a/b:{k 拿到第幾卷(0～3)、4＝解開,at [時間],ask {女:1},q 題號,done}}；wmEcho＝{p {id,k,i,at} 等著說的那一場,done {戰役 id:時間},q {戰役 id:題號}}；jRunW＝守局的進度。 */
const WM_PIGEON_ON=true,WM_BENMING_ON=true,WM_SCROLL_ON=true,WM_ECHO_ON=true;   /* 開發者 11/8 說四案打開 */
const WM_FLAG={pg:()=>WM_PIGEON_ON,bm:()=>WM_BENMING_ON,scr:()=>WM_SCROLL_ON,echo:()=>WM_ECHO_ON},WM_NAME={pg:"🕊 飛鴿傳譜",bm:"🀄 本命子之道",scr:"📜 千秋殘譜",echo:"⚔ 古戰場的迴響"};
function wmOn(k){try{if(WM_FLAG[k]()===true)return true;return typeof DEVMODE==="function"&&DEVMODE()&&!!(store.get("wmDev",{})||{})[k]}catch(e){return false}}
const wmAny=()=>Object.keys(WM_FLAG).some(wmOn);
const wmN=s=>PARK_NPC.find(n=>n.id.slice(0,3)===s)||null,wmS=n=>n&&n.id?n.id.slice(0,3):"";
const WM_PC={俥:"車",相:"象",炮:"砲",傌:"馬",帥:"將",仕:"士",兵:"卒"};
let WM_FORCE=null;

/* ---------- 有下棋的日子：拿到修為（xpDay）的那幾天；每次換頁看一下 ---------- */
function wmTick(){try{const d=store.get("xpDay","");if(!d||typeof d!=="string")return;const L=store.get("wmDays",[])||[];if(!L.includes(d)){L.push(d);store.set("wmDays",L.slice(-200))}}catch(e){}}
addEventListener("hashchange",()=>setTimeout(wmTick,80));setTimeout(wmTick,2000);
const wmDaysAfter=d=>(store.get("wmDays",[])||[]).filter(x=>x>d).length;

/* ---------- 共用：挑題 ---------- */
let WM_SET_P=null;
const wmSet=()=>WM_SET_P||(WM_SET_P=fetch("data/canju/women-set.json").then(r=>{if(!r.ok)throw new Error("本命子題庫載入失敗（"+r.status+"）");return r.json()}).catch(e=>{WM_SET_P=null;throw e}));
function wmIds(){const o=["sq218","xw077"];try{const P=store.get("wmPg",{})||{};for(const s in P)for(const x of P[s].L||[])if(x.q)o.push(x.q)}catch(e){}
  try{const E=store.get("wmEcho",{})||{};for(const k in E.q||{})o.push(E.q[k])}catch(e){}try{const S=store.get("wmScr",{})||{};for(const k in S)if(S[k]&&S[k].q)o.push(S[k].q)}catch(e){}return o}
if(typeof shipMorePool==="function"){const smp0=shipMorePool;shipMorePool=async function(){const o=await smp0.apply(this,arguments);try{const m=new Set(wmIds());o.pool=o.pool.filter(P=>!m.has(P.id))}catch(e){}return o}}
function wmSeen(id){try{const S=cjState();if(!S.seen.includes(id)){S.seen=S.seen.concat(id).slice(-800);cjSave(S)}}catch(e){}}
async function wmPool(){let o=null;try{if(typeof shipMorePool==="function")o=await shipMorePool()}catch(e){}
  if(!o){const D=await cjData();let ex=new Set();try{ex=new Set(cjReserved())}catch(e){}const m=new Set(wmIds());o={D,T:{},pool:D.items.filter(P=>P.tree&&!P.lv&&!ex.has(P.id)&&!m.has(P.id))}}
  if(!o.T||!Object.keys(o.T).length)try{o.T=await shipMoreTags()}catch(e){o.T={}}return o}
function wmBand(up){let r=5;try{r=+cjState().r||5}catch(e){}up=up||0;return[Math.max(1,r-1.5+up),r+.6+up]}
/* tags＝「標籤|標籤」，第一個最要緊；noC＝不要有炮（漢、隋、唐還沒有炮）；min＝最低難度 */
async function wmPick(tags,o){o=o||{};const{T,pool}=await wmPool(),tg=String(tags||"").split("|").filter(Boolean),band=wmBand(o.up),R=cjRand(cjAid()+"|wm|"+(o.seed||""));
  let L=pool.filter(P=>!P.src||P.src.book!=="特級大師對局");if(!L.length)L=pool;if(o.noC){const L2=L.filter(P=>!/[cC]/.test(String(P.fen).split(" ")[0]));if(L2.length)L=L2}if(o.min){const L2=L.filter(P=>(+P.d||0)>=o.min);if(L2.length)L=L2}
  const sc=P=>{const tp=T[P.id]||[],d=+P.d||0,dist=d<band[0]?band[0]-d:d>band[1]?d-band[1]:0;let t=0;tg.forEach((x,j)=>{if(tp.includes(x))t+=j===0?4:2});return t-1.6*dist+R()*1.2};
  const best=L.map(P=>[sc(P),P]).sort((a,b)=>b[0]-a[0])[0];if(!best)return null;wmSeen(best[1].id);return best[1].id}
async function wmGetP(id){const D=await cjData(),P=D.byId[id];if(!P)throw new Error("找不到這一局（題庫可能更新了）");return P}

/* ---------- 共用：卡片裡的小棋盤解題（不離開對局、不離開驛站）。P＝一盞茶題（有應著樹 tree）或本命子題（一步 best＋示範 pv）；
   o.strict＝一步都不能錯（錯了從頭來）；o.done(res,box)＝解完（res.ok＝沒看答案解開）。 ---------- */
function wmCss(){if(document.getElementById("wmCss"))return;const s=document.createElement("style");s.id="wmCss";
  s.textContent=`.wm-say{font:15.5px/1.85 var(--serif);margin:0 0 8px}.wm-say b{font-family:var(--sans)}
.wm-who{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px}.wm-who img{width:56px;height:76px;object-fit:cover;object-position:top;border-radius:10px;flex:none;background:var(--bg)}
.wm-talk p{margin:0 0 6px;line-height:1.75;font-size:15px}.wm-talk p b{font-size:13px;color:var(--accent);margin-right:4px}
.wm-part{display:flex;gap:6px;margin:6px 0 10px}.wm-part span{flex:1;text-align:center;padding:6px 2px;border-radius:10px;border:1.5px dashed var(--line);font-size:13px;color:var(--muted)}
.wm-part span.on{border-style:solid;border-color:#B5452B;color:var(--ink);background:var(--bg);font-weight:700}
.wm-rl{border:1px solid var(--line);border-left:4px solid #C8962E;border-radius:12px;padding:8px 12px;margin:6px 0 10px;background:var(--bg)}
.wm-dev{border-top:1px dashed var(--line);margin-top:10px;padding-top:8px}.wm-dev .pill{margin:3px 4px 3px 0}`;document.head.append(s)}
function wmPz(title,P,o){o=o||{};const C=window.XQCore;if(!C||!P)return toast("棋盤還沒準備好");wmCss();
  const single=!P.tree,me=P.side,flip=me==="b",total=single?1:(P.n||1),sq=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))];
  const ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
  let b,node,step,sel=-1,last=null,busy=false,mist=0,ans=false,hk=null,hl=0,fin=false,tok=0;
  const reset=()=>{b=C.parseFen(P.fen);node=single?null:P.tree;step=0;sel=-1;last=null;busy=false;hk=null;hl=0;tok++};reset();
  sheet(title,bx=>{bx.innerHTML=`${o.say?`<div class="wm-say">${o.say}</div>`:""}<div class="boardbox gd-bd"></div><div class="status" id="wmSt"></div><div class="gd-note" id="wmN"></div><div class="cj-row" id="wmAct"></div>`;
    const bd=Board(x=>tap(x));bx.querySelector(".gd-bd").append(bd.svg);const $=q=>bx.querySelector(q),st=t=>{const e=$("#wmSt");if(e)e.textContent=t},nt=t=>{const e=$("#wmN");if(e)e.textContent=t||""};
    const draw=bb=>{bb=bb||b;bd.draw(bb,{flip,sel,last,check:ck(bb),targets:sel>=0&&!busy?C.legal(b,me).filter(([f])=>f===sel).map(x=>x[1]):[],...(hk?{hint:hk}:{})})};
    const key=()=>single?P.best:Object.keys(node.o)[0];
    const task=()=>o.task||(single?(P.ty==="守"?"只有一步守得住，找出來":"找出最好的一步（只有一步最好）"):cjTask(P));
    const head=()=>`${C.PLAYER[me]}走・第 ${step+1}／${total} 步${o.strict?"・一步都不能錯":""}`;
    function acts(){const a=$("#wmAct");if(!a)return;if(fin)return;a.innerHTML=`<button class="btn ghost" id="wmHint">💡 ${hl>=2?"已全部提示":hl?"再提示落點":"提示"}</button><button class="btn ghost" id="wmAns">👁 看答案</button>`;
      a.querySelector("#wmHint").onclick=()=>{if(busy||(!single&&!node))return;const[f,t]=sq(key());hl=Math.min(2,hl+1);hk=hl>=2?[f,t]:[f];draw();acts();st(hl>=2?"💡 藍框：要動的子和要去的位置":"💡 藍框這顆子就是關鍵")};
      a.querySelector("#wmAns").onclick=()=>{if(busy)return;confirmBox("看答案這一局就不算解開，確定？",reveal,"看答案")}}
    function show(){busy=false;st(head());nt(task());acts();draw()}
    function tap(x){if(busy||fin)return;const L=C.legal(b,me);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const u=C.iccs(sel,x);sel=-1;return move(u)}sel=L.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw()}
    function move(u){const[f,t]=sq(u);
      if(single){if(u===P.best){vibrate(15);b=C.make(b,f,t);last={f,t};hk=null;demo(P.pv||[],true)}else wrong(u);return}
      const ob=node.o[u];
      if(ob){vibrate(15);b=C.make(b,f,t);last={f,t};hk=null;hl=0;if(!ob[1]){node=null;demo(cjSplit(ob[0]),true);return}
        busy=true;st("✔ 好棋");draw();const my=tok;setTimeout(()=>{if(my!==tok||!bx.isConnected)return;const[f2,t2]=sq(ob[0]),tx=C.notate(b,f2,t2);b=C.make(b,f2,t2);last={f:f2,t:t2};node=ob[1];step++;show();nt(`對方應：${tx}\n`+task())},550);return}
      if(node.s&&node.s[u]){st("👍 這步也能贏，但還有更快的殺法，再找找");return}
      wrong(u)}
    function wrong(u){mist++;vibrate([20,40,20]);const[f,t]=sq(u),tx=C.notate(b,f,t);let why="";if(!single){const e=cjW(node)[u];if(e&&e.c)why=cjWhy(P,e.c)}
      if(o.strict){busy=true;st(`✘ ${tx}`);nt((why?"這步不行："+why+"\n":"")+"一步都不能錯——從頭再來一次。");const my=tok;setTimeout(()=>{if(my!==tok||!bx.isConnected)return;reset();show()},1600);return}
      st(`✘ ${tx} 不是這步`);nt(why?"這步不行："+why:"再想想。");sel=-1;draw()}
    function demo(seq,win){busy=true;draw();{const a0=$("#wmAct");if(a0)a0.innerHTML=""}nt(win?(seq.length?"":(C.inCheck(b,C.opp(me))?"將死！":"✔")):"");st(win?"✔ 對了！":"👁 答案");let i=0,bb=b;const acc=[],my=++tok;
      const go=()=>{if(my!==tok||!bx.isConnected)return;if(i>=seq.length||i>=10){end(win);return}const u=seq[i++],[f,t]=sq(u);if(!bb[f]){end(win);return}acc.push(C.notate(bb,f,t));bb=C.make(bb,f,t);bd.draw(bb,{flip,last:{f,t},check:ck(bb)});nt((win?"後續：":"")+acc.join("　"));setTimeout(go,720)};setTimeout(go,450)}
    function reveal(){ans=true;const seq=[];if(single)seq.push(P.best,...(P.pv||[]));else{let n=node;while(n){const u=Object.keys(n.o)[0],ob=n.o[u];seq.push(u);if(ob[1]){seq.push(ob[0]);n=ob[1]}else{seq.push(...cjSplit(ob[0]));n=null}}}node=null;demo(seq,false)}
    function end(win){fin=true;busy=false;const a=$("#wmAct");if(a)a.innerHTML="";const res={ok:!!win&&!ans,ans,mist,hint:hl>0};st(res.ok?(mist?"✔ 解開了":"★ 一次就解開"):"👁 答案看完了");
      try{if(o.done)o.done(res,a)}catch(e){console.warn(e)}if(a&&!a.innerHTML)a.innerHTML=`<button class="btn" id="wmOk" style="width:100%">好</button>`,a.querySelector("#wmOk").onclick=closeSheet}
    show()})}
/* 浮在畫面下方的小卡（跟 07d 的委託小卡同一種樣子，不擋棋盤）；btns＝[[字, fn]]，沒有按鈕就 9 秒後自己收起來 */
function wmCard(N,hb,html,btns){wmCss();document.querySelectorAll(".npc-ask").forEach(x=>x.remove());const c=document.createElement("div");c.className="npc-ask wm-ask";
  c.innerHTML=`<img src="data/npc/${esc(N.id)}.webp" alt="" onerror="this.remove()"><div class="tx"><b>${esc(N.name)}</b><span>${html}</span>${btns&&btns.length?`<div class="bt">${btns.map((x,i)=>`<button class="btn${i?" ghost":""}" data-i="${i}">${esc(x[0])}</button>`).join("")}</div>`:""}</div>`;
  document.body.append(c);requestAnimationFrame(()=>c.classList.add("show"));let iv=0,tm=0;
  const bye=()=>{clearInterval(iv);clearTimeout(tm);c.classList.remove("show");setTimeout(()=>c.remove(),300)};
  iv=setInterval(()=>{if(hb&&!hb.isConnected)bye()},800);tm=setTimeout(bye,btns&&btns.length?25000:9500);
  c.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{vibrate(5);bye();const f=btns[+b.dataset.i][1];if(f)f()});if(!btns||!btns.length)c.onclick=bye;return c}
const wmWhoHTML=(N,html)=>`<div class="wm-who"><img src="data/npc/${esc(N.id)}.webp" alt="" onerror="this.remove()"><div class="wm-say" style="margin:0">${html}</div></div>`;
function wmXP(n,why,key){try{addXP(n,why,key)}catch(e){}try{saveNow(true)}catch(e){}}

/* =================================================================== 5 飛鴿傳譜 =================================================================== */
/* 每人 3 封：[信, 挑題標籤, 回信後她說的話]。信裡的殘局都是「從別處得來的」，照她的身分寫情境 */
const WM_PG={
  w01:[["見字如面。前日在曲江池邊看花，兩位白頭老翁在牡丹叢下擺了一局象戲，從晌午爭到黃昏，誰也不服誰。我把局面抄在團扇背面帶回來——他們說紅方只差一步，你替我看看是哪一步？——牡丹娘子","安靜一手|首仕","原來是這一步！老翁們要是知道，非得把鬍子捋斷不可。"],
    ["西市有家鋪子，櫃上擺著一副銅鑄的象戲棋子，掌櫃說是洛陽一位老主顧抵押的，還留下一局沒下完的殘棋，誰解得開就送誰一匹絹。我解不開，偷偷記下來寄給你。——牡丹娘子","首俥|中殺","那匹絹我不要了。你解開了，我比得了絹還高興。"],
    ["牡丹謝了。我把團扇收進箱底前，翻到背面那張小棋盤，照你那天的下法自己擺了一局：守得住，也攻得出。這回換我考你。——牡丹娘子","首仕|安靜一手","被你看穿了。下回我得把扇面畫得更密些。"]],
  w02:[["坊裡來了一位常客，是汴河邊開茶肆的老掌櫃。他鬥茶輸給我，不服氣，說要拿一局殘棋扳回來。我想了兩壺茶的工夫還想不通，寄給你——可別說是我問的。——青盞","首相|安靜一手","老掌櫃這回沒話說了。這一盞，算你贏的。"],
    ["清明前上山採新茶，茶農在竹棚裡擺棋消遣，棋盤刻在一塊青石上，風吹雨打，只剩這幾顆子還看得清。他說這局叫「慢火」，性子急的人解不開。——青盞","安靜一手|以少勝多","慢火出好茶，你這一手，也是慢慢熬出來的。"],
    ["我用新得的建盞點了一盞茶，茶沫咬盞，久久不散。那時我想，棋要是也能像茶沫一樣穩穩地咬住就好了——就照盞裡的白沫擺了這一局。下的人要沉得住氣。——青盞","首相|安靜一手","你沉得住氣。下回鬥茶，我請你當評判。"]],
  w03:[["驛站的老驛卒說，他年輕時跑上都那條路，在一處站赤歇腳，看兩個馬夫在馬槽邊下棋，輸的要替對方餵一夜的馬。最後那幾步他還記得，我抄給你。——草原上的騎手","首傌|馬殺","哈！這下老驛卒得替你餵馬了。"],
    ["妹妹跟我比騎馬輸了，就拿一盤棋來考我，說是她夢裡看見的：馬一跳，對面就沒路走。我不信她會做這種夢，八成是偷看了誰的。你解解看。——草原上的騎手","臥槽馬|掛角馬|首傌","我就說她是偷看的！你一下就跳到了。"],
    ["秋天馬肥了，大家在草地上賽馬，跑贏的人要擺一局棋給輸的人解。我跑了第一，就把我最得意的這一局寄給你。不許說太簡單。——草原上的騎手","首傌|連將","……好吧，你也跑了第一。"]],
  w04:[["某兄台鑒：書院藏書樓的角落有一冊殘破的棋譜，前後都爛了，只剩中間一頁。我趁先生午睡時抄了下來。先生說讀這些沒用——反正我現在是「男子」，就多讀一點。——你知道是誰","首仕|安靜一手","果然！書上沒寫完的，原來在這裡。"],
    ["某兄台鑒：同窗們在齋舍裡偷偷下棋，被先生撞見，棋盤沒收了，局面卻留在我腦子裡。我想了三夜，總覺得紅方還有一步妙手，又不敢說出來，怕露了底，只好寫信問你。——你知道是誰","棄子|殺棋","我就說有妙手！可惜不能當面跟同窗說。"],
    ["某兄台鑒：那冊殘譜的最後一頁，我自己推出來了。若是對的，你回信只寫一個「是」字就好；若是錯的……也回一個字吧。——你知道是誰","安靜一手|中殺","一個「是」字就夠了。我會夾在書裡好好收著。"]],
  w05:[["這是阿瑪書房裡的一局。他跟一位老大人下到一半，被傳進宮去，棋盤就那麼擱著。我偷偷記下來——你解出來，我再偷偷擺回去，嚇他一跳。——溜出府的格格","首帥|安靜一手","嘻，等阿瑪回來看見，臉色一定很好看。"],
    ["府裡的小丫鬟從外頭的棋茶館聽來一局，說茶客們為了它爭得臉紅脖子粗，一壺茶續了三回水。我叫她一子一子背給我聽，背錯好幾回才對。——溜出府的格格","連將|短殺","茶館裡那些人吵了三壺茶，你一下就解了。"],
    ["弟弟學棋學得快，昨天居然擺了一局來考我，我想了半天才解開，他得意得不得了。這局給你，你可別比我解得還快。——溜出府的格格","首帥|殺棋","你比我快！……這件事不許告訴弟弟。"]],
  w06:[["路過潼關，在客舍裡遇見一個說書的，講到興頭上，拿筷子在桌上擺了一局，說是某位俠客跟人賭命的棋。故事我不信，棋倒是真的。——路過的人","首俥|車殺","故事是假的，你這一手是真的。"],
    ["這局是一位在渡口擺渡了一輩子的老船夫擺給我看的。他說這輩子只有這一局沒走出來，我答應替他找一個看得懂的人。——路過的人","安靜一手|棄子","我會去渡口告訴他。他等這一手，等了很多年。"],
    ["江南下了一個月的雨，我在破廟裡躲雨，用石子在地上擺了這一局。車要走直路，人也一樣——可有時候，得先退一步。你看看。——路過的人","首俥|安靜一手","退一步，再一路殺到底。你懂。"]],
  w07:[["渡口的老船家等客時，就在船板上擺棋。他說這局是年輕時在太湖上跟人賭一船魚輸掉的，到今天還不服氣。我替他寄給你，解開了，他請你吃鱸魚。——漁家女","首兵|兵卒","老船家說了，鱸魚記你帳上——是他請！"],
    ["鎮上趕集，賣蓑衣的阿伯攤子旁有人擺棋攤，一局十文錢，解開了退錢再加十文，好多人都輸了錢。我記下局面，一文也沒花。——漁家女","棄子|殺棋","嘿，這下那個擺攤的要倒賠了。"],
    ["我在船頭刻的那張小棋盤，等魚的時候擺了一局：小卒一步一步往前拱，就跟我撐船逆水一樣。你看這局，卒子過不過得去？——漁家女","首兵|兵卒","過去了！跟逆水撐船一樣，一篙也不能鬆。"]],
  w08:[["繡莊的老師傅年輕時在杭州學藝，帶回一方繡著棋局的舊帕子，絲線褪色了，子還認得出來。她說繡帕的人，是在等一個解得開的人。——蘇州繡娘","首相|安靜一手","老師傅聽了，把那方帕子又疊得整整齊齊。"],
    ["這陣子替一位官家太太繡屏風。她家的少爺下棋，下完就把棋子一推，我收拾時記下了最後那一局：紅方明明還有路，他卻認輸了。——蘇州繡娘","以少勝多|殺棋","我就說還有路！可惜少爺不聽我一個繡娘的。"],
    ["繡棋盤時，我把象的位置繡錯了一格，拆線的時候忽然想到，這樣擺反倒是一局好棋。一針一線，一步一步，你慢慢解。——蘇州繡娘","首相|安靜一手","錯了一針，反倒繡出一朵花來。"]],
  w09:[["自從你教了我這種棋，我在市集上跟賣竹簡的老人說起，他說從前見過一個外鄉人在沙地上畫過這樣的格子。他照記得的擺給我看，我抄在竹片上，寄給你。——琴師","安靜一手|一步","竹片我收好了。原來那個外鄉人，也在等一個懂的人。"],
    ["我教隔壁的小女孩下你教我的棋，她學得快，昨天擺了一局說要考我。我彈了一整曲〈對弈〉的工夫，還是沒解開。——琴師","首俥|連將","我把這一手彈給她聽，她說像打了一聲雷。"],
    ["琴弦斷了。換弦的時候，我把弦的位置想成棋盤上的線，擺出了這一局。漢人下的是六博，這種棋，大概只有你我在下了。——琴師","安靜一手|殺棋","一根弦也不能鬆。你聽得出來。"]],
  w10:[["營裡的老兵說，他從前在府兵裡當差，跟同袍在營火邊用石子下棋，這局是他當年輸掉一壺酒的棋。我替他解了半天，沒解開。——少年將軍","首俥|車殺","老兵說，這壺酒他記了二十年，今天總算知道輸在哪裡。"],
    ["今天在沙盤上推演陣法，副將說這陣像一局棋，車從側翼殺進去就破了。我不信，照樣子擺成棋局，你看他說得對不對。——少年將軍","雙車|首俥","……副將說對了。本將軍明天請他喝酒。"],
    ["我把你教我的那幾步擺成一局，叫它「破陣」。軍中沒人解得開，連最會下棋的參軍都搖頭。解開了，回信寫一句「末將領命」。——少年將軍","連將|中殺","「末將領命」——好！這四個字我要掛在帳裡。"]],
  w11:[["跟著隊伍去飛放，晚上歇在帳篷裡，鷹房的老昔寶赤拿出一副皮子縫的棋盤，說是從大都帶來的。他擺了一局，說看得遠的人才解得開。——馴鷹的姑娘","首傌|安靜一手","老昔寶赤說，你的眼睛比海東青還尖。"],
    ["我的鷹在雪地上留了一串爪印，彎彎曲曲的，像馬走日字。我照著爪印擺了一局，馬跳了幾步，正好將軍。你信不信？不信就自己解。——馴鷹的姑娘","臥槽馬|馬殺|首傌","你看，我的鷹不會騙人。"],
    ["路上遇見一位南邊來的商人，說江南人下棋比我們細。我不服氣，跟他下了一局，最後這幾步是他出的題。替我解開，別讓南邊人看扁了。——馴鷹的姑娘","首傌|連將","解開了！看他還敢不敢說我們粗。"]],
  w12:[["商隊在甘州歇腳，一個波斯來的老商人在客棧裡跟駝夫下棋。他漢話說得不好，象棋倒下得好，說是在大都學的。這局他下輸了，可他說輸得不冤。——商隊的姑娘","首炮|炮殺","我照你的解法比給他看，他笑著直點頭。"],
    ["阿爹算帳時，我在一旁擺棋。他說做生意跟炮一樣，要隔一個人，才打得到真正的買主。我不懂，他就擺了這一局給我。——商隊的姑娘","馬後炮|首炮","原來是這樣隔一個！這筆帳我算明白了。"],
    ["駝鈴響了一路。歇腳時，我把你送的那顆木頭卒子拿下來，在沙地上擺了一局。風一吹，沙子就把棋盤埋了，幸好我記住了。——商隊的姑娘","重炮|炮殺","沙子埋得掉棋盤，埋不掉你這一手。"]],
  w13:[["後台有位老樂工，吹了一輩子笛子，閒了就下棋。他說這局是他看人在勾欄門口賭的，兩個人押了一齣戲的戲錢。——勾欄的女伶","首炮|殺棋","這齣戲的戲錢，該歸你。"],
    ["班主新排了一齣戲，裡頭有一折是兩軍對陣。我照著台上的走位擺了一局：炮在後頭一隔，前頭的就倒了。台下都叫好，你也叫一聲吧。——勾欄的女伶","重炮|馬後炮|炮殺","好！這一聲，比台下的都響。"],
    ["唱完正旦，卸了妝，我自己擺了一局。一齣戲有起有落，最後一折最要緊——這局也是。——勾欄的女伶","首炮|連將","收得漂亮！這一折，我要寫進戲本裡。"]],
  w14:[["窯上的老畫工年輕時在泉州的瓷器行當學徒，見過海船上的水手下棋。他畫了一隻碗，碗心是一局殘棋，說是那水手留下的。——畫青花的女工","首相|安靜一手","老畫工說，這隻碗總算等到懂它的人了。"],
    ["這一窯有一隻盤子燒裂了，只能打碎。打碎前，我把盤上那局沒畫完的棋抄了下來——可惜了，那一窯畫得最好的就是它。——畫青花的女工","以少勝多|殺棋","盤子碎了，棋還在。我心裡舒坦多了。"],
    ["浮梁磁局來人驗瓷，說我們畫的花樣太密。我偷偷在一隻小碟的碟底畫了這一局，下筆前想了好久——一筆下去，就不能改。你解的時候，也要一步就想清楚。——畫青花的女工","安靜一手|中殺","一筆不改！跟我畫青花一樣。"]],
  w15:[["射箭聚會散了，大家圍著火堆下棋，一位老獵人擺了這一局，說車要像箭一樣直，一下就要中。我射得準，棋卻沒解開。——草原女射手","首俥|車殺","正中靶心！老獵人都說好。"],
    ["我跟一個從漢地來的軍士比箭，他輸了，送我一局棋當彩頭，說是他們營裡傳的。你看看，值不值得我那一箭。——草原女射手","雙車|連將","值得！這一局，跟我那一箭一樣漂亮。"],
    ["這局是我自己擺的。十箭中九箭，剩下那一箭射偏了——這局也一樣，別的都容易，就一步難。你找找看。——草原女射手","安靜一手|首俥","就是這一步！這回換你十箭全中。"]],
  w16:[["詩社的姐妹家裡藏著一冊刻本棋譜，是她祖父從書坊買的。翻到一頁，有人用硃筆圈了一局，旁邊題了一句「此局可破」。我們都看不出怎麼破。——江南才女","首俥|棄子","「此局可破」——原來是這樣破的。我要在旁邊再題一句。"],
    ["雨天，姐妹們聯句聯不下去，就擺棋消磨。這局是大家合擺的，一人放一顆子，放完了才發現竟是一局好殘棋。——江南才女","雙車|殺棋","姐妹們都說，這一手該寫成詩。"],
    ["〈園中對弈〉之後，我又寫了一首，缺最後一句。我把想到的那一局寄給你，你解開了，最後一句大概就有了。——江南才女","首俥|安靜一手","有了！最後一句，就用你這一手。"]],
  w17:[["秦淮河上有位老琴客，聽完我的曲子，說他年輕時在揚州看過一局棋，下的人說，這局跟一首曲子一樣，最後一聲最難收。他擺給我看，我記下了。——秦淮琵琶女","首相|安靜一手","這一聲收得好。老琴客說，他等了好多年。"],
    ["一位常來聽曲的客人，每回都帶一副象牙棋子，聽完曲就自己跟自己下。昨晚他走得急，棋盤上留了這一局。——秦淮琵琶女","安靜一手|殺棋","等他再來聽曲，我把你的解法擺給他看。"],
    ["四根弦，九條線。我調弦的時候擺了這一局：守的一方要像按弦一樣，按得穩，才彈得響。——秦淮琵琶女","首相|以少勝多","按得穩，彈得響。你就是這樣下的。"]],
  w18:[["出診時，病人家的老太爺臥床不起，還要我陪他下棋。他說這局是他年輕時在南京落第後，在客棧裡跟人下的。我替他記下，他喝了藥，睡得很香。——背藥箱的女大夫","首兵|兵卒","老太爺醒來聽說解開了，精神都好了一半。"],
    ["藥鋪的老掌櫃抓藥時愛擺棋，他說小卒就像藥引子，看著不起眼，少了它整帖藥就不靈。他擺了這一局給我看。——背藥箱的女大夫","兵卒|殺棋","藥引子用對了，整帖藥就靈了。"],
    ["最近看診的人多，夜裡記病案記到一半，順手擺了這一局。下棋跟看病一樣，要先看準了再下手。你可別熬夜解。——背藥箱的女大夫","首兵|安靜一手","看得準！可你是不是又熬夜了？"]],
  w19:[["客官見字：茶館裡兩位熟客為了一局棋吵了三天，一個說紅先勝，一個說和棋。我爹叫我別管，我偏要管。你替我評評理。——茶館少東家","首兵|殺棋","紅先勝！我這就去跟那位說和棋的客官說。"],
    ["客官見字：有位說書先生在我們茶館說了一個月的書，臨走付不出茶錢，就留下一局棋抵帳，說誰解開了，茶錢由他出。我爹氣得直跺腳。——茶館少東家","棄子|連將","解開了！這筆茶錢，可得找說書先生要。"],
    ["客官見字：你常坐的那張桌子上，我刻了一局小棋，誰也不讓碰。小卒子一步一步往前走，就像我天天望著門口……等你來解。——茶館少東家","首兵|兵卒","解開了。這張桌子，還是天天替你留著。"]],
  w20:[["奉命查一樁偷竊案，在賊窩裡搜出一張棋譜，上頭只畫了一局，賊說是他師傅傳的。案子結了，棋譜歸檔前，我抄了一份。——女捕快","首俥|車殺","破了！這張棋譜可以結案了。"],
    ["巡夜時，看見更夫在城門洞裡跟守門的軍士下棋。我本要罰他們，看了一眼棋盤，就站著看完了。這是他們最後的局面。——女捕快","雙車|殺棋","這一手抓得乾淨。罰的事，我就當沒看見。"],
    ["大人罰我抄卷宗，我抄著抄著，在卷宗背面擺了一局。人跑得掉，棋可跑不掉——這局，看你能不能把將抓住。——女捕快","連將|首俥","抓到了！人贓俱獲。"]]};
const WM_NOC=new Set(["han","sui","tang"]);
const wmPgSt=()=>store.get("wmPg",null)||{};
const wmGap=(s,i)=>5+Math.floor(cjRand("wmpg|"+s+"|"+i)()*3);
/* 該寄的信寄出去（打開驛站、信箱時呼叫）；dev＝開發者立即寄（不看間隔） */
function wmPgSync(dev){if(!wmOn("pg"))return 0;const S=wmPgSt(),today=localDay();let nw=0,ch=false;
  for(const n of NPC_W()){const s=wmS(n);if(!WM_PG[s]||bondOf(n.id).n<3)continue;if(!S[s]){S[s]={s0:today,L:[]};ch=true}const E=S[s],i=E.L.length;if(i>=WM_PG[s].length)continue;
    const from=i?E.L[i-1].d:E.s0;if(dev||wmDaysAfter(from)>=wmGap(s,i)){E.L.push({d:today,at:Date.now()});nw++;ch=true}}
  if(ch)store.set("wmPg",S);return nw}
function wmPgList(k){if(!wmOn("pg"))return[];const S=wmPgSt(),o=[];for(const s in S){const n=wmN(s);if(!n||!WM_PG[s])continue;if(k&&k!=="classic"&&n.era!==k)continue;(S[s].L||[]).forEach((x,i)=>o.push({s,i,n,x}))}
  return o.sort((a,b)=>(b.x.at||0)-(a.x.at||0))}
const wmPgUnread=k=>wmPgList(k).filter(o=>!o.x.r).length;
function wmPgRows(k){return wmPgList(k).map(o=>`<button class="item" data-wmpg="${o.s}:${o.i}"><span class="lb" style="font-size:22px">🕊</span><span class="tx"><b>${esc(o.n.name)}的飛鴿信（${o.i+1}／3）${o.x.r?"":" 🆕"}${o.x.ok?" ✅":""}</b><span>寄自${esc(eraLabel(o.n.era))}・${o.x.ok?"已回信":"附一局殘棋"}</span></span><span class="muted">›</span></button>`).join("")}
function wmPgBind(box,after){box.querySelectorAll("[data-wmpg]").forEach(y=>y.onclick=()=>{vibrate(5);const[s,i]=y.dataset.wmpg.split(":");wmPgOpen(s,+i,after)})}
function wmPgOpen(s,i,after){const n=wmN(s),D=WM_PG[s],S=wmPgSt(),x=S[s]&&S[s].L[i];if(!n||!D||!x)return;if(!x.r){x.r=Date.now();store.set("wmPg",S)}wmCss();
  sheet(`🕊 ${n.name}的飛鴿信（${i+1}／3）`,b=>{b.innerHTML=`<div class="gd-mail">${esc(D[i][0])}</div>${eraXqNote(n.era)}${x.ok?`<p class="gd-say">✅ 已回信。${esc(n.name)}：「${esc(D[i][2])}」</p><button class="btn" id="wmOk" style="width:100%">收好</button>`:`<button class="btn" id="wmGo" style="width:100%">♟ 看看附來的殘局</button><p class="muted" style="font-size:13px;margin:8px 0 0">不看答案解開，就能回信（修為 +15）。</p>`}`;
    const ok=b.querySelector("#wmOk");if(ok)ok.onclick=()=>{closeSheet();if(after)setTimeout(after,260)};
    const go=b.querySelector("#wmGo");if(go)go.onclick=()=>{go.disabled=true;go.textContent="攤開信紙…";wmPgPz(s,i,after).catch(e=>{toast(e.message||"題目載入失敗");go.disabled=false;go.textContent="♟ 看看附來的殘局"})}})}
async function wmPgPz(s,i,after){const n=wmN(s),D=WM_PG[s],S=wmPgSt(),x=S[s].L[i];
  if(!x.q){x.q=await wmPick(D[i][1],{noC:WM_NOC.has(n.era),seed:"pg|"+s+"|"+i});if(!x.q)throw new Error("題目還沒準備好");const S2=wmPgSt();S2[s].L[i].q=x.q;store.set("wmPg",S2)}
  const P=await wmGetP(x.q);
  wmPz(`🕊 ${n.name}附來的殘局`,P,{say:wmWhoHTML(n,`「信裡那一局，就是這個。」<br><span class="muted" style="font-size:13px">${esc(cjLv(P.d))}</span>`),done:(res,a)=>{
    if(!res.ok){a.innerHTML=`<p class="muted" style="margin:0 0 8px">看了答案，這封信還沒回。下次不看答案解開，就能回信。</p><button class="btn ghost" id="wmBk" style="width:100%">收好信</button>`;a.querySelector("#wmBk").onclick=()=>{closeSheet();if(after)setTimeout(after,260)};return}
    const S3=wmPgSt();if(S3[s]&&S3[s].L[i]&&!S3[s].L[i].ok){S3[s].L[i].ok=Date.now();store.set("wmPg",S3);wmXP(15,"飛鴿傳譜",`wm:pg:${s}:${i}`)}
    a.innerHTML=`<p class="gd-say" style="width:100%">🕊 回信寄出去了。<br>${esc(n.name)}：「${esc(D[i][2])}」</p><button class="btn" id="wmBk" style="width:100%">好</button>`;a.querySelector("#wmBk").onclick=()=>{closeSheet();if(after)setTimeout(after,260)}}})}

/* =================================================================== 2＋9 本命子之道 =================================================================== */
/* WM_BM[你的角色][她]：ex＝開局拌嘴（她、你、她），ht＝羈絆升級時點到心結的一句（只說一次）。愛用子相同的配對，加上身世呼應的（女俠↔鐵連城：守與攻；商隊姑娘↔駱躍梅：家與根；格格、書生↔沈方庭：那道門） */
const WM_BM={
  x_swordboy:{
    w10:{ex:[["排兵布陣，本將軍最在行！你也使車？","嗯。看準了，就一直走。","一直走？兵書上說，要先想好退路。"],["我的車從側翼殺進去，你的呢？","中間。中間最近。","哈！好個直性子，來！"]],ht:"直路是好。可帶兵的人知道：有時繞一下，才能把所有人都帶回家。"},
    w15:{ex:[["百步穿楊——你的車也是直來直往的吧？","嗯。箭跟車一樣，直才有力。","說得好！不過射箭也得看風。"],["你瞄得準嗎？","我不太認字。可是路，我看得清。","那就夠了，棋盤上又沒有字。"]],ht:"拉弓的時候，箭頭一直對著靶心，手卻要先往後拉，箭才飛得遠。退一步，不丟人。"},
    w20:{ex:[["站住！你這車走得這麼直，是要去哪兒？","往前。哪兒都不拐。","嘖，跟我追賊一個樣。來一盤！"],["追賊最怕抄小路的。你呢？","我不抄小路。","那好，咱們棋上比比誰快。"]],ht:"辦案子久了才知道：走小路的，不見得是賊。得先問清楚，他為什麼拐彎。"},
    w16:{ex:[["我寫了一句「一車定乾坤」，你看如何？","……我不太認得字。可是車，我認得。","那正好，這句詩，就用棋來讀。"],["作詩缺一句，你的車能替我補上嗎？","我不會作詩。我只會往前走。","往前走，也是一句好詩。"]],ht:"字不認得不要緊，慢慢學。可你看路的那雙眼睛，是書上教不來的。"}},
  x_spiritgirl:{
    w02:{ex:[["先喝口茶，棋要慢慢下。","我家也是開茶棚的。……妳這茶沫打得真好。","是嗎？那今天這盞，點給同行。"],["我叫青盞，可是鬥茶其實要用黑盞。","我們渡口的茶碗是粗陶的，大碗大碗地倒給過江的人。","那是解渴的茶，我這是品的茶——都是待客。"]],ht:"等人的人，最容易忘了自己也渴。這一盞，妳先喝。"},
    w08:{ex:[["一針一線，一步一步。","慢慢來，先把家顧好。","對，邊角先收好，花才繡得開。"],["妳的相從不過河？","不過河。……過了河，就回不來了。","繡線可以穿過去，再穿回來的。"]],ht:"繡布的兩面，看起來都是同一朵花。人也是，白天一個樣，夜裡一個樣，都是妳。"},
    w17:{ex:[["彈完這曲，陪妳下一盤。","好。我聽著，妳彈。","妳的相，像按在弦上的那根手指——不動，音才準。"],["秦淮河兩岸，妳喜歡哪一邊？","……我只知道江的這一邊。","那就先下這一邊的棋。"]],ht:"彈琵琶，輕的地方要輕，重的地方要重。妳守了那麼久，也可以有重重落下的一聲。"}},
  x_martialgirl:{
    w12:{ex:[["駱駝隊明天才走，今天陪妳下棋。","好耶！我用炮——隔一個，剛剛好！","我阿爹也這麼說：做生意要隔一個人，才打得到真正的買主。"],["妳嗓門真大，駝鈴都蓋不過妳。","我、我爺爺耳朵不好，講小聲他聽不見嘛！","那妳爺爺有福氣。"]],ht:"沙漠裡起風暴的時候，駱駝會跪下來等。怕，不丟臉，等它過去就好。"},
    w13:{ex:[["台下看戲，台上下棋，今天換個角色。","我嗓門也大！我也能上台嗎？","能！不過唱戲要大聲，也要知道哪一句得小聲。"],["妳的炮，跟我們戲台上的鑼一樣響。","轟！……啊，我又太大聲了？","不，戲台上就要這樣。"]],ht:"我在台上嗓子最亮，可打雷那晚，我也縮在後台的箱子後面。誰都有怕的東西。"}},
  x_miaogirl:{
    w03:{ex:[["我的馬跳得比風還快！","我的馬會拐彎！前面堵住了，我就拐個彎呀！","好！草原上就該這樣跑。"],["妳戴的是驛騎的帽子？","嘿嘿，是老駱的。我是在站赤長大的！","那我們跑的是同一條路！"]],ht:"跑得再遠，回頭看一眼，驛站的燈總還亮著。"},
    w11:{ex:[["我的鷹在天上看著妳的棋。","那牠看得見我的馬怎麼拐彎嗎？","看得見，牠還說妳拐得好。"],["鷹飛得再遠，聽見哨子就會回來。","……真的嗎？不會飛丟嗎？","養得好的鷹，自己認得家。"]],ht:"鷹不是我生的，是我從小一口一口餵大的。可牠每回飛回來，都落在我的手臂上。"},
    w12:{ex:[["駱駝隊明天才走。小妹妹，妳家在哪兒？","我家……在驛站！驛站就是家！","我也是，駝隊走到哪，家就在哪。"],["妳的馬跳來跳去，不累嗎？","嘿嘿，不累！可是跳遠了，就要記得跳回來呀。","這話我得記下來，說給阿爹聽。"]],ht:"家不一定是生妳的地方，是有人等妳回去的地方。"}},
  x_shuai:{
    w05:{ex:[["噓——別說我在這兒下棋。","我不說。……妳是自己溜出來的？","是呀，府裡的門關不住我。"],["你的帥只在九宮裡轉，不悶嗎？","悶。可從九宮看出去，整盤棋都看得見。","那你比我強，我在府裡只看得見一方天。"]],ht:"我第一回溜出府，腿抖了一路。可走出那道門，風是不一樣的。"},
    w04:{ex:[["在下……咳，小生請教一盤。","請。我走不快，但我看得仔細。","……那、那你別看得太仔細。"],["書上說帥不出九宮，你信嗎？","規矩是規矩。可我想自己走出去看看。","同道中人。"]],ht:"有些門，別人不替你開，就得自己換一身衣裳，走出去。"}},
  x_shi:{
    w06:{ex:[["劍不出鞘，棋上見真章。","我不出劍。我守。","守得好，劍才敢出鞘。"],["你的仕只會擋？","擋下來，順手吃一個。","那就不只是盾了。"]],ht:"只會擋的人，終究要被逼到牆角。守的人，也要知道什麼時候往前一步。"},
    w01:{ex:[["從長安帶來的棋，你接得住嗎？","接得住。","話這麼少？那就棋上多說幾句。"],["我也愛用士。士守在帥旁邊，你說它悶不悶？","……不悶。","可它也想看看九宮外頭的牡丹吧？"]],ht:"長安城那麼大，我也是走了好多年才走遍。你若想看遠方，就去看，城門又不會跑。"},
    w09:{ex:[["琴放一邊，先聽聽棋聲。","……聽什麼？","聽你的仕，落子一點聲音也沒有。"],["彈琴是收住心性的。你下棋，也是收著的。","收著，才擋得住。","也要放得開，曲子才完整。"]],ht:"一根弦繃得太緊，是會斷的。替人擋了那麼久，你也鬆一鬆。"}},
  x_bing:{
    w07:{ex:[["剛收網回來，手還是濕的呢！","我幫妳提魚簍！我跑腿最快啦！","好呀，先下完這盤再提。"],["撐船逆水的時候，只能一篙一篙往前。","跟小兵一樣！不能退！","可遇到淺灘，也得先停一停。"]],ht:"打魚的人說，網撒出去，要等。回頭看看妳身後，說不定有人等著幫妳收網。"},
    w18:{ex:[["下棋跟看病一樣，要先看準。","我不用看病，我跑得可快了！","跑得快的人，腳底最容易起泡。"],["妳的草鞋都磨破了。","沒事沒事，往前走，絕不退！","好，我替妳包一包，再往前。"]],ht:"病人最怕的不是痛，是不敢回頭看自己的傷。看了，才好得了。"},
    w19:{ex:[["客官，下盤棋再走嘛！","我是跑腿的，送完這趟再來！……好啦，就一盤！","我就知道。"],["妳天天跑來跑去，累不累？","不累！誰給我一碗茶，我都記著，得還他一段路。","那這碗算我請的，不用還。"]],ht:"茶館開得久，靠的是熟客。妳也可以有一個常回來坐的地方。"}}};
const WM_BM_P=.3,WM_BM_DAY=2;
const wmBmSt=()=>{const S=store.get("wmBm",null)||{};S.ok=S.ok||{};S.ht=S.ht||{};if(S.d!==localDay()){S.d=localDay();S.n=0}return S};
const wmPair=N=>{const c=myChar(),s=wmS(N);return c&&WM_BM[c]&&WM_BM[c][s]?WM_BM[c][s]:null};
async function wmBmPick(){const Z=await wmSet(),pc=myPc(),L=((Z.by||{})[pc]||[]).slice();if(!L.length)return null;const S=wmBmSt();let r=5;try{r=+cjState().r||5}catch(e){}
  const fr=L.filter(x=>!S.ok[x.id]),P=fr.length?fr:L;return P.slice().sort((a,b)=>Math.abs(a.d-r+1)-Math.abs(b.d-r+1)+(Math.random()-.5)*1.5)[0]}
function wmBmPz(N){const pc=myPc(),nm=WM_PC[pc]||pc;wmBmPick().then(P=>{if(!P)return toast("題目還沒準備好");
  const S=wmBmSt();S.n=(S.n|0)+1;store.set("wmBm",S);const C=WX_CHARS[myChar()]||{};
  wmPz(`🀄 跟${N.name}比本命子`,P,{say:wmWhoHTML(N,`「${N.pc===nm?`${esc(nm)}是我愛用的，${esc(pc)}是你的本命子`:`${esc(pc)}是你的本命子`}。這一局，${P.side==="r"?"紅":"黑"}方只有一步最好，而且是${esc(P.side==="r"?pc:nm)}走的。比比看，誰先看出來？」`),
    done:(res,a)=>{if(res.ok){const S2=wmBmSt();if(!S2.ok[P.id]){S2.ok[P.id]=Date.now();store.set("wmBm",S2);wmXP(10,"本命子",`wm:bm:${P.id}`)}}
      a.innerHTML=`<p class="gd-say" style="width:100%">${res.ok?`${esc(N.name)}：「好眼力！這一步，我服了。」<br>${esc(C.n||"你")}：「${esc(pickOne(C.win||["承讓。"]))}」`:`${esc(N.name)}：「就是這一步——${esc(P.cn||"")}。下回再比！」`}</p><button class="btn" id="wmBk" style="width:100%">好，接著下棋</button>`;a.querySelector("#wmBk").onclick=closeSheet}})}).catch(e=>toast(e.message||"題目載入失敗"))}

/* =================================================================== 1 千秋殘譜流轉 =================================================================== */
const WM_SCR={
  a:{nm:"千秋殘譜・清弦圖",parts:["上卷","中卷","下卷"],w:["w09","w01","w17"],fin:"sq218",rel:"清弦帛書",ic:"📜",   /* 11/13 開發者「怎麼出現五線譜，修正」：西洋五線譜圖示跟古琴殘譜不搭，改成卷軸（完成文字裡的帛書圖示一起換） */
    give:"這卷帛書，是我在洛水邊的蘆葦叢裡拾到的。上頭畫著縱橫的格子和幾顆棋子，還有一個我不認得的字——後來你教我下棋，我才知道那是「炮」。漢人不下這種棋，它大概是從很遠的地方漂來的。帛的末尾寫著「三卷合一」。這是上卷；另外兩卷……或許在你要去的地方。",
    ask1:"這帛書……我在長安一位老畫師的箱底見過另一段。他說畫的人守了一輩子的城，那一段畫的就是怎麼守。老畫師把它描給了我，可我不能白給你：敵人一輛車來攻，你只有帥、仕、相，守住了，中卷就是你的。",
    ok1:"守住了！仕、相一顆都沒丟。中卷給你，我在背面畫了一朵牡丹，別嫌它多事。",
    ask2:"上卷、中卷……這兩卷，你從哪裡得來的？我師父臨走前留給我一段殘帛，說將來有人拿著前兩卷來，要先考他一局，答對了才能給。",
    ok2:"師父說得對，你就是那個人。下卷給你——三卷合在一起，就是一整盤棋了。",
    hint:["去漢朝的園子，等抱琴的女琴師羈絆滿 3 級","帶著上卷，去唐朝的園子找長安的牡丹娘子","帶著中卷，去明朝的園子找秦淮琵琶女"],
    full:"三卷帛書拼在一起，一整盤棋終於完整了。帛的邊上寫著幾個小字：「千秋殘譜・清弦」。",
    done:"三卷合成的這一局，是明朝徐芝編的《適情雅趣》（1570 年）裡的〈路隔星河〉。清弦帛書和它跨朝代流傳的經過，是這個遊戲編的故事，不是史書記載。帛書收進珍品冊：📜 清弦帛書。",
    hold:{name:"清弦圖・中卷：單車來攻",fen:"4k4/9/9/9/9/2r6/9/4B4/9/3AKAB2",keep:["A","B"],
      skill:"單車難破士象全：仕、相連在一起，帥不亂走，車就找不到破口",say:"敵人一輛車來攻。你只有帥、仕、相——仕相連成一氣，誰也進不來。"}},
  b:{nm:"千秋殘譜・蘆花圖",parts:["上段","中段","下段"],w:["w07","w14","w08"],fin:"xw077",rel:"蘆花繡帕",ic:"🪡",
    give:"今天收網，網裡撈起一塊木板，上頭刻著格子和幾顆棋子，邊角刻著三個字：「蘆花・上」。我爹說是哪條船上掉的，可我總覺得，是要交給你的。另外兩段在哪裡，我就不曉得了。",
    ask1:"這木板上的刻法……我在窯上見過！老畫工留下一隻舊碗，碗底畫的就是中間那一段。我照樣描給你，可你得先過我這一關：青花一筆下去就不能改，這一局，你也一步都不能走錯。",
    ok1:"一步都沒錯！中段我描在一隻小碗的碗底了，小心別摔了。",
    ask2:"木板、碗底……最後一段，繡在我師傅傳下來的舊帕子上。師傅說，繡帕的人一針一線守了一輩子。你若守得住這一局——敵人的馬和卒一起來攻，你只有帥、仕、相——帕子就給你。",
    ok2:"守住了。帕子給你，背面的線頭我都收好了。",
    hint:["去宋朝的園子，等水鄉漁家女羈絆滿 3 級","帶著上段，去元朝的園子找畫青花的女工","帶著中段，去清朝的園子找蘇州繡娘"],
    full:"木板、碗底、繡帕拼在一起，一整盤棋終於完整了。帕子的邊上繡著幾個小字：「千秋殘譜・蘆花」。",
    done:"三段合成的這一局，是殘局譜《心武殘編》裡的〈四季落花〉。蘆花木板、碗底和繡帕一路傳下來的經過，是這個遊戲編的故事，不是史書記載。繡帕收進珍品冊：🪡 蘆花繡帕。",
    hold:{name:"蘆花圖・下段：馬卒來攻",fen:"4k4/9/9/9/9/9/2n3p2/4B4/9/3AKAB2",keep:["A","B"],
      skill:"馬卒對士象全多半是和棋：仕、相連在一起，別讓卒子貼進九宮、別讓馬踩到落單的子",say:"敵人的馬帶著一個過河的卒來攻。你只有帥、仕、相——一針一線，守住。"}}};
/* 中卷（a）是守局、下段（b）是守局；另一步是解一題（b 的中段要一步都不錯） */
const WM_SCR_STEP={a:["give","hold","pz"],b:["give","pzStrict","hold"]};
const WM_HOLD_N=[6,8,10,12,14],WM_HOLD_AI=[3,4,5,6,7];
const wmScrSt=()=>{const S=store.get("wmScr",null)||{};for(const k of["a","b"])S[k]=S[k]||{k:0,at:[],ask:{}};return S};
/* 這位女棋手現在有沒有殘譜的事要找你：回傳 {line,step}（step＝要給第幾卷：0 上、1 中、2 下） */
function wmScrDue(N){if(!wmOn("scr")||!N)return null;const s=wmS(N),S=wmScrSt();for(const L of["a","b"]){const T=WM_SCR[L],x=S[L];if(x.k>=3)continue;if(T.w[x.k]!==s)continue;
    if(x.k===0&&bondOf(N.id).n<3)continue;return{line:L,step:x.k}}return null}
function wmScrGrant(L,step){const S=wmScrSt(),x=S[L];if(x.k!==step)return false;x.k=step+1;x.at[step]=Date.now();store.set("wmScr",S);wmXP(20,"千秋殘譜",`wm:scr:${L}:${step}`);return true}
/* 在園子碰到她：先說一句，再跳小卡 */
function wmScrMeet(N,hb,due){const T=WM_SCR[due.line],st=WM_SCR_STEP[due.line][due.step];
  if(st==="give"){wmCard(N,hb,`「你來了。我有一樣東西，想交給你。」`,[["看看是什麼",()=>wmScrGive(due.line)],["下完這盤再說",()=>toast(`${N.name}：「好，我等你。」`)]]);return}
  const S=wmScrSt();S[due.line].ask[wmS(N)]=1;store.set("wmScr",S);
  if(st==="hold")wmCard(N,hb,`「你手上那卷……我見過另一段。」`,[["聽她說",()=>wmScrAsk(due.line,due.step)],["下完這盤再說",()=>toast(`${N.name}：「到驛站或珍品冊的「📜 千秋殘譜」，隨時來找我。」`)]]);
  else wmCard(N,hb,`「你手上那卷……我見過另一段。」`,[["聽她說",()=>wmScrAsk(due.line,due.step)],["下完這盤再說",()=>toast(`${N.name}：「好，我等你。」`)]])}
function wmScrGive(L){const T=WM_SCR[L],N=wmN(T.w[0]);if(!wmScrGrant(L,0))return wmScrSheet(L);vibrate([15,30,15]);
  sheet(`${T.ic} ${T.nm}・${T.parts[0]}`,b=>{b.innerHTML=wmWhoHTML(N,`「${esc(T.give)}」`)+`<p class="muted" style="font-size:13px">📜 收到「${esc(T.nm)}・${esc(T.parts[0])}」・修為 +20</p><div class="cj-row"><button class="btn" id="wmSee">📜 攤開來看</button></div>`;b.querySelector("#wmSee").onclick=()=>wmScrSheet(L)})}
function wmScrAsk(L,step){const T=WM_SCR[L],N=wmN(T.w[step]),st=WM_SCR_STEP[L][step],txt=step===1?T.ask1:T.ask2;
  sheet(`${T.ic} ${N.name}`,b=>{b.innerHTML=wmWhoHTML(N,`「${esc(txt)}」`)+(st==="hold"?`<p class="muted" style="font-size:13px;line-height:1.7">🏯 守局：敵方先動，你撐過幾步（照航行難度 ${WM_HOLD_N.join("／")} 步），不被將死、仕相一顆都不能丟。會離開這一頁，到守局的棋盤去。</p>`:"")+`<div class="cj-row"><button class="btn" id="wmGo">${st==="hold"?"🏯 擺上棋盤":"♟ 看她擺的局"}</button><button class="btn ghost" id="wmNo">改天</button></div>`;
    b.querySelector("#wmNo").onclick=closeSheet;b.querySelector("#wmGo").onclick=()=>{if(st==="hold"){store.set("wmBack",location.hash);closeSheet();setTimeout(()=>{location.hash="#/ship/wmhold/"+L},240)}else wmScrPz(L,step)}})}
async function wmScrPz(L,step){const T=WM_SCR[L],N=wmN(T.w[step]),strict=WM_SCR_STEP[L][step]==="pzStrict",S=wmScrSt();
  try{if(!S[L].q){const q=await wmPick(strict?"安靜一手|首相":"首相|安靜一手",{seed:"scr|"+L,up:strict?-.5:0});if(!q)throw new Error("題目還沒準備好");const S2=wmScrSt();S2[L].q=q;store.set("wmScr",S2);S[L].q=q}
    const P=await wmGetP(S[L].q);
    wmPz(`${T.ic} ${N.name}擺的局`,P,{strict,say:wmWhoHTML(N,strict?"「一筆下去就不能改——一步都別走錯。」":"「解開了，下卷就給你。」"),done:(res,a)=>{
      if(!res.ok){a.innerHTML=`<p class="muted" style="margin:0 0 8px">看了答案不算。改天再來，她還會等你。</p><button class="btn ghost" id="wmBk" style="width:100%">好</button>`;a.querySelector("#wmBk").onclick=closeSheet;return}
      wmScrGrant(L,step);vibrate([15,30,15]);a.innerHTML=`<p class="gd-say" style="width:100%">${esc(N.name)}：「${esc(step===1?T.ok1:T.ok2)}」<br><span class="muted" style="font-size:13px">📜 收到「${esc(T.nm)}・${esc(T.parts[step])}」・修為 +20</span></p><button class="btn" id="wmSee" style="width:100%">📜 攤開來看</button>`;a.querySelector("#wmSee").onclick=()=>wmScrSheet(L)}})}catch(e){toast(e.message||"題目載入失敗")}}
/* 殘譜：照拿到的卷，畫出棋盤的那幾橫列（上卷＝上面 4 列、中卷＝中間 2 列、下卷＝下面 4 列） */
const WM_ROWS=[[0,4],[4,6],[6,10]];
function wmScrSheet(L){const T=WM_SCR[L],S=wmScrSt(),x=S[L],C=window.XQCore;wmCss();
  sheet(`${T.ic} ${T.nm}`,b=>{b.innerHTML=`<div class="wm-part">${T.parts.map((p,i)=>`<span class="${x.k>i?"on":""}">${x.k>i?"📜 ":""}${esc(p)}</span>`).join("")}</div><div class="boardbox gd-bd" id="wmBd"></div>
    <p class="wm-say" style="font-size:14.5px">${x.k>=4?"✅ 解開了。"+esc(T.done):x.k>=3?esc(T.full):x.k?`還缺 ${3-x.k} 卷。下一步：${esc(T.hint[x.k])}。`:`還沒拿到。${esc(T.hint[0])}。`}</p>
    <div class="cj-row" id="wmSA"></div>`;
    cjData().then(D=>{const P=D.byId[T.fin],box=b.querySelector("#wmBd");if(!P||!box||!C)return;const bb=C.parseFen(P.fen),vis=bb.map((p,i)=>{const r=Math.floor(i/9);return WM_ROWS.some(([a,z],j)=>x.k>j&&r>=a&&r<z)?p:null});
      const bd=Board(()=>{});box.append(bd.svg);bd.draw(x.k>=3?bb:vis,{flip:false})}).catch(()=>{});
    const a=b.querySelector("#wmSA"),N=x.k<3?wmN(T.w[x.k]):null,st=x.k<3?WM_SCR_STEP[L][x.k]:"";
    if(x.k===3)a.innerHTML=`<button class="btn" id="wmFin" style="width:100%">♟ 解開${esc(T.nm)}</button>`;
    else if(N&&x.k>0&&x.ask[wmS(N)])a.innerHTML=`<button class="btn" id="wmAsk" style="width:100%">${st==="hold"?"🏯 接"+esc(N.name)+"的守局":"♟ 解"+esc(N.name)+"擺的局"}</button>`;
    const f=b.querySelector("#wmFin");if(f)f.onclick=()=>wmScrFin(L);const k=b.querySelector("#wmAsk");if(k)k.onclick=()=>wmScrAsk(L,x.k)})}
function wmScrFin(L){const T=WM_SCR[L];wmGetP(T.fin).then(P=>wmPz(`${T.ic} ${T.nm}`,P,{say:`<p class="wm-say">${esc(T.full)}</p><p class="muted" style="font-size:13px;margin:-4px 0 6px">${esc(cjLv(P.d))}・${P.n} 步之內殺</p>`,done:(res,a)=>{
    if(!res.ok){a.innerHTML=`<p class="muted" style="margin:0 0 8px">看了答案，殘譜還沒算解開。下次不看答案解開，就能收進珍品冊。</p><button class="btn ghost" id="wmBk" style="width:100%">收好殘譜</button>`;a.querySelector("#wmBk").onclick=closeSheet;return}
    const S=wmScrSt();if(S[L].k===3){S[L].k=4;S[L].done=Date.now();store.set("wmScr",S);wmXP(40,"千秋殘譜",`wm:scr:${L}:fin`)}vibrate([20,40,20,40,60]);
    a.innerHTML=`<div class="wm-rl" style="width:100%"><b>${T.ic} ${esc(T.rel)}</b><p style="margin:4px 0 0;line-height:1.75">${esc(T.done)}</p><p class="muted" style="font-size:13px;margin:4px 0 0">修為 +40</p></div><button class="btn" id="wmBk" style="width:100%">收進珍品冊</button>`;a.querySelector("#wmBk").onclick=()=>{closeSheet();if(typeof relicBook==="function")setTimeout(()=>relicBook(),300)}}})).catch(e=>toast(e.message||"題目載入失敗"))}
/* 守局頁 #/ship/wmhold/<a|b>：07-legend.js jLevel 的 relay（跟古戰場守城同一種） */
function WmHold(v){const L=(location.hash.split("/")[3]||"").replace(/[^ab]/g,""),T=WM_SCR[L],back=(()=>{const h=store.get("wmBack","");return typeof h==="string"&&/^#\//.test(h)&&!/wmhold/.test(h)?h:"#/journey/inn"})();
  setTop("📜 千秋殘譜",back);if(typeof setTabs==="function")setTabs(false);
  const S=wmScrSt(),step=L?WM_SCR_STEP[L].indexOf("hold"):-1;
  if(!T||!wmOn("scr")||S[L].k!==step){v.className="view";v.innerHTML=`<div class="pad"><div class="card muted" style="line-height:1.8">${!T?"找不到這一卷。":S[L].k>step?"這一卷已經拿到了。":"還沒走到這一步。"}<br><a href="${esc(back)}">回去</a></div></div>`;return{}}
  const H=T.hold,dn=typeof diffNow==="function"?diffNow():2,n=WM_HOLD_N[dn-1]||8,ai=WM_HOLD_AI[dn-1]||4,N=wmN(T.w[step]);
  const G={name:H.name,intro:N.name+"："+(step===1?T.ask1:T.ask2),skill:H.skill,pass:`敵方先動。撐過 ${n} 步：不被將死，仕、相一顆都不能丟`,star3:"一次就撐過、不用提示",rules:{maxMistakes3:0,maxMistakes2:1},
    steps:[{t:"relay",say:H.say,start:{fen:H.fen,turn:"b"},human:"r",segs:[{who:"you",name:"你",n,keep:H.keep,opp:{ai},hint:`撐過 ${n} 步，仕、相不能丟（被將死也不行）。`,fail:"破了一個口子。先讓仕、相連在一起，帥別亂走，再守一次。"}]}],
    outro:N.name+"："+(step===1?T.ok1:T.ok2)};
  jLevel(v,{id:"wm:"+L+":"+dn,name:H.name},{G,rk:"jRunW",icon:T.ic,back,title:`${T.nm}・🏯 守局`,
    done:stars=>{wmScrGrant(L,step);return stars},line:()=>`📜 收到「${T.nm}・${T.parts[step]}」・修為 +20`,
    next:["📜 攤開殘譜 ›",()=>{location.hash=back;setTimeout(()=>wmScrSheet(L),500)}]});return{}}
if(typeof SHIP_PG!=="undefined")SHIP_PG.wmhold=WmHold;
function wmScrHTML(){if(!wmOn("scr"))return"";const S=wmScrSt();return Object.keys(WM_SCR).map(L=>{const T=WM_SCR[L],x=S[L];
  return`<button class="item" data-wmscr="${L}"><span class="lb" style="font-size:22px">${x.k>=4?T.ic:"📜"}</span><span class="tx"><b>${esc(T.nm)}${x.k>=4?" ✅":""}</b><span>${x.k>=4?"信物："+esc(T.rel):x.k>=3?"三卷都齊了，可以解了":x.k?"已有 "+x.k+"／3 卷":"還沒拿到"}</span></span><span class="muted">›</span></button>`}).join("")}
const wmScrBind=box=>box.querySelectorAll("[data-wmscr]").forEach(y=>y.onclick=()=>{vibrate(5);wmScrSheet(y.dataset.wmscr)});

/* =================================================================== 7 古戰場的迴響 =================================================================== */
/* 卷一每場由這一朝哪位女棋手說（她說的是你帶回來的消息，或她聽人講過的舊事）；史實句子另列清單送史學顧問 */
const WM_EC={
  han_1:["w09","井陘？那是淮陰侯韓信背水列陣的地方。背後是河，士卒退無可退，只好拼死一戰；他又先派兩千輕騎，每人帶一面赤旗，等趙軍傾營出來追，就衝進空營，拔下趙旗、插上漢旗。趙軍回頭一看，自己就亂了。"],
  han_2:["w09","垓下……項王被圍在營裡，夜裡聽見漢軍四面都唱楚歌，大驚：「漢軍已經得了楚地嗎？怎麼楚人這麼多！」他在帳中飲酒，唱了「力拔山兮氣蓋世」，虞美人也跟著和。被圍住的人，最先垮的是心。"],
  han_3:["w09","吳楚七國起兵那年，周亞夫守在昌邑的營壘裡，任憑吳楚怎麼挑戰都不出來，只派輕騎繞到後面，斷了吳楚的糧道。吳楚的兵餓了，只好退走，他這才派精兵追上去。"],
  han_4:["w09","衛青出塞一千多里，撞上單于的大軍。他用武剛車環成營壘，再放五千騎兵出去迎戰。傍晚起了大風，沙石打在臉上，兩軍誰也看不見誰，漢軍就從左右兩翼繞過去包圍單于。單于只帶著幾百騎，衝出重圍往西北逃了。"],
  han_5:["w09","昆陽城裡只有八九千人，王莽的大軍把城圍了幾十重。光武皇帝帶著三千敢死的勇士，從城西的水上直衝王尋、王邑的中軍，城裡的人也擂鼓殺出來。那天又颳大風、又打雷，連屋瓦都被吹飛了。"],
  sui_1:["w10","這一仗本將軍最熟！賀若弼守江北的時候，每回換防都叫人馬集合在歷陽，大張旗幟、營帳遍野。陳人以為大軍要渡江，慌忙調兵；後來知道只是換防，就散了。次數一多，陳人看慣了，再也不防備——等真的渡江，他們還沒發覺。"],
  sui_2:["w10","以前跟突厥打仗，大家都把戎車、步騎擺成方陣，騎兵躲在裡面。楊素說：這是自保的辦法，打不贏的。他把舊法全撤了，叫各軍擺成騎陣。達頭可汗一聽，高興得下馬朝天拜，以為是老天送他的機會——結果被楊素打得大敗。只守不攻，是贏不了的。"],
  sui_3:["w10","這一仗，是我們隋軍敗得最慘的一回。高句麗的乙支文德一天之內跟隋軍打了七仗，七仗都假裝敗走，一路把隋軍引到離平壤城三十里的地方。等隋軍回師，渡薩水渡到一半，他才從後面殺出來。"],
  sui_4:["w10","聖上北巡，被始畢可汗圍在雁門。那時年紀輕輕的李世民應募去救，跟將軍雲定興說：多帶旗鼓，白天讓旌旗連綿幾十里，夜裡鉦鼓相應，突厥一定以為救兵來了。再加上義成公主派人騙始畢說北邊告急，各路援兵也真的趕到了，突厥這才解圍走了。排兵布陣，有時候讓人看見的，比真有的還要緊。"],
  sui_5:["w10","宋老生守在霍邑城裡不出來。李淵叫李建成、李世民帶著幾十個騎兵到城下，舉著馬鞭指指點點，像要圍城，還朝城上罵。宋老生一怒，開城出戰，李世民從南邊的高地衝下來，隋軍大敗，宋老生也死在城下。對方躲著不出來，就想辦法讓他自己出來。"],
  tang_1:["w06","虎牢關。李世民先一步搶下這道關，竇建德十幾萬大軍、號稱三十萬，堵在關前，一個多月過不去。決戰那天，夏軍從早上列陣到中午，又餓又累，坐的坐、搶水喝的搶水喝，唐軍這才殺出來。竇建德中了槊，被活捉。先到的人，佔的是地利。"],
  tang_2:["w06","頡利可汗才派人來請和，唐朝的使者還在他營裡。李靖說，這正是動手的時候，帶了一萬精騎、二十天的乾糧出發。先鋒趁著大霧，摸到離牙帳只剩七里，突厥人才發覺，頡利只好丟下營帳逃走。以為談和了，就是最鬆懈的時候。"],
  tang_3:["w06","天山那一仗，鐵勒派了幾十個最驍勇的騎士出來挑戰。薛仁貴連發三箭，射倒三個人，其餘的一下子全下馬投降了。軍中唱：「將軍三箭定天山，戰士長歌入漢關。」打頭的倒了，後面的就散了。"],
  tang_4:["w01","安祿山作亂那年，張巡守雍丘，城裡的箭用完了。他叫人紮了一千多個草人，穿上黑衣，夜裡用繩子垂下城牆。令狐潮的兵爭著射，竟得了幾十萬枝箭。後來再垂下去的是真人，賊兵以為又是草人，笑著不防備，五百個死士一衝，賊營就亂了。"],
  tang_5:["w01","那一夜大風雪，旌旗都被吹裂了，路上凍死的人馬一個接一個。李愬帶兵連夜急行，四更天到了蔡州城下，城裡竟沒有一個人知道。他們在城牆上鑿出腳窩爬上去——吳元濟那時候還沒起身呢。"],
  song_1:["w02","遼兵南下打到澶州，大將蕭撻凜出來察看地形，被宋軍的床子弩射中，當天晚上就死了。過了幾天，寇準勸真宗皇帝親自過河，登上北城，將士遠遠望見御蓋，歡呼聲傳出好幾十里。後來兩國議和，宋朝每年送遼國銀十萬兩、絹二十萬匹。仗先打穩了，談的時候腰桿才直；就像點茶，茶沫先咬住了盞，才不怕人來比。"],
  song_2:["w07","這一段是我聽說書的講的：狄青在賓州過上元節，說要連擺三夜燈宴。第二夜喝到一半，他說身子不舒服，先回內室歇著；客人一直不敢散，到天亮才有人飛馬來報——他半夜已經帶兵奪下崑崙關了。"],
  song_3:["w07","水上的仗，我們打漁的最愛聽！韓世忠的水軍把金兵的船堵在黃天蕩，一堵就是四十八天，聽說他夫人梁氏還親自擂鼓。可最後金兵鑿通了一條舊河道，又趁著沒風放火箭燒船，還是逃出去了。堵住了退路，也要守得住最後一步。"],
  song_4:["w02","聽說金兀朮的拐子馬又快又重，岳家後人的書上說，是三匹馬用皮索連在一起衝過來的——也有人說，拐子馬其實是排在兩翼的騎兵。不管怎樣，岳家軍的步兵拿著麻扎刀，彎下身子，不抬頭看人，專砍馬腿。看起來最大的子，也有最弱的地方。"],
  song_5:["w02","蒙古大汗蒙哥親自來攻合州的釣魚城。那座城建在山上，三面臨江，守將王堅帶著軍民守了好幾個月，蒙古兵一直攻不上去。後來蒙哥在軍中去世，蒙古大軍只好撤走。守住了，就是勝。"],
  yuan_1:["w03","野狐嶺？聽老人說，金國的兵比我們多得多，卻把兵分散在各個山口守著。成吉思汗把人馬攏在一起，從中間一口氣衝過去，金兵就潰了。跑馬也是這樣，馬群散開了衝不動，攏在一起才像一陣風。"],
  yuan_2:["w15","拖雷派人向宋朝借路，宋朝不肯，還殺了使者，他乾脆硬闖過宋朝的地界，繞到金國的背後。金兵追著他跑了一路，到了三峰山又碰上大雪，凍得拿不穩兵器，被團團圍住，大敗。正面打不進去，就繞到背後。"],
  yuan_3:["w12","襄陽、樊城被圍了五年多，南邊來的援軍一次次被打回去。後來從西域請來兩位造砲的匠人，造出了回回砲，石彈打出去聲震天地，打中了城裡的譙樓，守將呂文煥只好開城投降。我們商隊的老駝夫說，那兩位匠人是從很遠的西邊來的。"],
  yuan_4:["w13","這段要是排成戲，一定叫座！朱元璋叫康茂才寫信假投降，說到時候在江東橋接應，那本是一座木橋。陳友諒帶兵趕到，一看竟是石橋，連喊好幾聲「老康」，都沒人答應，這才知道上當——伏兵四起，殺得他大敗。"],
  yuan_5:["w14","陳友諒的戰船又高又大，一艘連著一艘，像水上的城。朱元璋等到東北風起，叫幾條小船裝滿火藥和蘆葦，順著風放火衝過去。風急火烈，煙焰漲天，聽說連湖水都映紅了。燒青花也是這樣，火候一到，什麼都定了。"],
  ming_1:["w19","客官，這段茶館裡說書的天天講！洪武爺派徐達、常遇春北伐，不急著打大都，先取山東，再拿河南，守住潼關，把元朝的羽翼一根一根剪掉。等大軍到了通州，元順帝連夜就從大都往北跑了。"],
  ming_2:["w20","土木堡那一仗，皇上被瓦剌抓走了，京城裡人心惶惶，有人主張往南遷都。于謙說：「言南遷者，可斬也。」他把兵擺在九門外，又在德勝門外設下伏兵，也先的兵吃了大虧，只好退走。守城跟巡街一樣，先把門守住，再抓人。"],
  ming_3:["w04","小生……咳，在書院聽先生講過。寧王在南昌起兵，順江東下要取南京。王守仁不去追他，反倒先攻下他的老巢南昌；寧王一聽，只好回頭來救，在鄱陽湖上兵敗被擒，前後不過一個多月。先生說：讀書人也打得了仗。"],
  ming_4:["w16","戚將軍的鴛鴦陣，十二個人一隊：藤牌在前，狼筅跟著，後頭是長槍，再後頭是短兵，長的短的互相掩護，誰也不單打獨鬥。在台州打倭寇，九戰九捷。我想替它寫一首詩，可惜還缺一句。"],
  ming_5:["w17","努爾哈赤帶著大軍來攻寧遠，袁崇煥燒掉城外的房舍，把人都收進城裡，在城頭架起紅夷大砲。砲聲一響，後金兵死傷一片，努爾哈赤起兵以來，這是頭一回吃大敗仗。我彈曲子時常想：弦再細，張緊了，也能發出那樣的聲響。"],
  qing_1:["w05","噓——這段阿瑪最愛講。明軍分四路來攻，聽說太祖爺說：「恁爾幾路來，我只一路去。」把兵攏在一處，先打最強的那一路，五天之內打垮了三路，剩下那一路也嚇得退回去了。"],
  qing_2:["w05","山海關外，吳三桂和李自成殺得難分難解，多爾袞按兵不動，就在旁邊看著。等兩邊都打累了，正好颳起大風，沙塵漫天，清兵才從吳軍的右邊衝出去，李自成的兵一下就潰了。等，有時候比衝還難。"],
  qing_3:["w08","鄭成功的船趁著漲潮，從鹿耳門那條又淺又窄的水道駛進去。荷蘭人以為那裡大船進不來，沒派重兵守著。後來他把熱蘭遮城圍了九個月，荷蘭人才投降，離開臺灣。走一條別人想不到的線，跟繡花一樣。"],
  qing_4:["w08","噶爾丹叫人把上萬頭駱駝的腳綁起來，讓牠們趴在地上，背上架著箱垛，蓋上濕氈，圍成一道「駝城」，兵就躲在後面放箭放槍。清軍用火砲把駝城轟開一道缺口，再衝進去。再密的針腳，拆開一處，整塊就鬆了。"],
  qing_5:["w05","阿瑪看邸報的時候說的：法國兵在淡水的滬尾登陸，孫開華帶著清兵和鄉勇埋伏在海邊的樹林裡，等法國兵走進林子才殺出來，把他們打回船上。"]};
const WM_EC_H=24*36e5;
const wmEcSt=()=>{const S=store.get("wmEcho",null)||{};S.done=S.done||{};S.q=S.q||{};return S};
/* 意見回饋 767：古戰場改成照年份分卷、存檔照戰役 id 記，這裡也照 id 找卡（不看第幾張） */
function wmEchoMark(k,cid){if(!wmOn("echo")||!WM_EC[cid])return;const C=(typeof BATTLE_CARDS!=="undefined"&&BATTLE_CARDS[k])||[],c=C.find(z=>z&&z.id===cid);if(!c)return;const S=wmEcSt();if(S.done[c.id])return;
  S.p={id:c.id,k,i:C.indexOf(c),at:Date.now(),name:c.name,lesson:c.lesson||""};store.set("wmEcho",S)}
function wmEchoDue(era){if(!wmOn("echo"))return null;const S=wmEcSt(),p=S.p;if(!p||p.k!==era||S.done[p.id]||Date.now()-(p.at||0)>WM_EC_H)return null;return p}
if(typeof battleMarkId==="function"){const bm0=battleMarkId;battleMarkId=function(k,cid){const r=bm0.apply(this,arguments);try{wmEchoMark(k,cid)}catch(e){}return r}}
function wmEchoSheet(p){const N=wmN(WM_EC[p.id][0]);if(!N)return;
  sheet(`⚔ ${N.name}說起${p.name}`,b=>{b.innerHTML=wmWhoHTML(N,`「${esc(WM_EC[p.id][1])}」`)+`<p class="muted" style="font-size:13px;line-height:1.7">她在石桌上擺了一局：「這一仗講的是『${esc(p.lesson)}』。棋盤上，也是同一個道理。」</p><div class="cj-row"><button class="btn" id="wmGo">♟ 看她擺的局</button><button class="btn ghost" id="wmNo">先下棋</button></div>`;
    b.querySelector("#wmNo").onclick=closeSheet;const go=b.querySelector("#wmGo");go.onclick=()=>{go.disabled=true;wmEchoPz(p).catch(e=>{toast(e.message||"題目載入失敗");go.disabled=false})}})}
async function wmEchoPz(p){const N=wmN(WM_EC[p.id][0]),S=wmEcSt();let q=S.q[p.id];
  if(!q){let tags="";try{const{B}=await battleData();const G=(B.lessons||{})[p.lesson]||[];tags=[...new Set(G.flat())].join("|")}catch(e){}q=await wmPick(tags,{seed:"ec|"+p.id,noC:WM_NOC.has(p.k)});if(!q)throw new Error("題目還沒準備好");const S2=wmEcSt();S2.q[p.id]=q;store.set("wmEcho",S2)}
  const P=await wmGetP(q);
  wmPz(`⚔ ${p.name}・${N.name}擺的局`,P,{say:wmWhoHTML(N,`「${esc(p.lesson)}——你走走看。」<br><span class="muted" style="font-size:13px">${esc(cjLv(P.d))}</span>`),done:(res,a)=>{
    if(!res.ok){a.innerHTML=`<p class="muted" style="margin:0 0 8px">看了答案不算。這盤下完前，還能再找她。</p><button class="btn ghost" id="wmBk" style="width:100%">好</button>`;a.querySelector("#wmBk").onclick=closeSheet;return}
    const S3=wmEcSt();if(!S3.done[p.id]){S3.done[p.id]=Date.now();if(S3.p&&S3.p.id===p.id)S3.p=null;store.set("wmEcho",S3);wmXP(15,"古戰場的迴響",`wm:ec:${p.id}`)}
    a.innerHTML=`<p class="gd-say" style="width:100%">${esc(N.name)}：「打仗跟下棋，原來是一回事。」<br><span class="muted" style="font-size:13px">⚔ ${esc(p.name)}的迴響・修為 +15</span></p><button class="btn" id="wmBk" style="width:100%">好，接著下棋</button>`;a.querySelector("#wmBk").onclick=closeSheet}})}

/* =================================================================== 園子開局：誰在對面、說什麼 =================================================================== */
/* 這一朝有等著說的戰役、或殘譜要找的人：下一盤園子就遇到她（攔路棋客押著東西的照舊優先，07h qqParkKeep） */
function wmParkKeep(era){const p=wmEchoDue(era);if(p)return wmN(WM_EC[p.id][0]).id;
  if(wmOn("scr")&&Math.random()<.5){const S=wmScrSt();for(const L of["a","b"]){const x=S[L],T=WM_SCR[L];if(x.k<1||x.k>2)continue;const n=wmN(T.w[x.k]);if(n&&n.era===era)return n.id}}return null}
if(typeof parkNpcNew==="function"){const pn0=parkNpcNew;parkNpcNew=function(game,lv,keep){try{if(!keep){const era=store.get("era","classic");let q=null;try{if(typeof qqParkKeep==="function")q=qqParkKeep(era)}catch(e){}if(!q){const w=wmParkKeep(era);if(w)keep=w}}}catch(e){}return pn0.call(this,game,lv,keep)}}
/* 這一盤要做什麼：echo＞scr＞bm（pz 三成、talk 七成）；開局那一刻決定一次 */
let WM_G=null;
function wmDecide(st){if(!st||st.journey!=="park"||st.arena||st.result||st.practice||st.net||(st.moves||[]).length)return WM_G&&WM_G.id===(st&&st.id)?WM_G:null;if(WM_G&&WM_G.id===st.id)return WM_G;
  const N=parkNpcOf(st);WM_G={id:st.id,N,kind:null};if(!N||!N.era)return WM_G;
  const p=wmEchoDue(store.get("era","classic"));if(p&&WM_EC[p.id][0]===wmS(N)){WM_G.kind="echo";WM_G.p=p;return WM_G}
  const due=wmScrDue(N);if(due){WM_G.kind="scr";WM_G.due=due;return WM_G}
  const pr=wmOn("bm")&&wmPair(N);if(pr){const S=wmBmSt(),f=WM_FORCE&&WM_FORCE.bm;WM_FORCE=null;WM_G.kind=f||(S.n<WM_BM_DAY&&Math.random()<WM_BM_P?"bmpz":"bmtalk");if(WM_G.kind==="bmtalk")WM_G.ex=pr.ex[Math.floor(Math.random()*pr.ex.length)]}
  return WM_G}
/* 七星開局那句：有拌嘴時讓出來（05b-save.js meGameTalk） */
if(typeof meGameTalk==="function"){const mg0=meGameTalk;meGameTalk=function(st){try{const G=wmDecide(st);if(G&&G.kind==="bmtalk"&&G.id===st.id)ME_HI=st.id}catch(e){}return mg0.apply(this,arguments)}}
/* 她開口第一句（07d npcHello；只有 3D 園子會叫）：拌嘴就接著排你和她的下一句 */
if(typeof npcHello==="function"){const nh0=npcHello;npcHello=function(N){try{const G=WM_G;if(G&&G.N===N&&!G.said&&G.kind&&!document.querySelector(".gt-t")){G.said=1;const nm=WM_PC[myPc()]||"",bn=myPc();
      if(G.kind==="bmtalk"){wmTalkRest(G);return G.ex[0]}
      if(G.kind==="bmpz")return N.pc===nm?`${nm}是我愛用的，你的本命子也是${bn}——今天比比？`:`你的本命子是${bn}吧？我出一局${bn}的棋，看你接不接得住。`;
      if(G.kind==="echo")return`你剛從${G.p.name}回來？坐，說給我聽聽。`;
      if(G.kind==="scr")return G.due.step?"你手上那卷東西……讓我看看。":"你來了。我有一樣東西要給你。"}}catch(e){}return nh0.apply(this,arguments)}}
function wmSayMe(t){try{if(PARK&&PARK.v&&PARK.v.say&&document.body.contains(PARK.v.el)){PARK.v.say(t,3);return true}}catch(e){}try{if(typeof BOT!=="undefined"&&BOT&&BOT.say){BOT.say(t,3);return true}}catch(e){}return false}
function wmTalkRest(G){const id=G.id,ok=()=>WM_G&&WM_G.id===id&&PARK&&PARK.v&&document.body.contains(PARK.v.el)&&/^#\/journey\/play/.test(location.hash);
  setTimeout(()=>{if(ok())wmSayMe(G.ex[1])},2900);if(G.ex[2])setTimeout(()=>{try{if(ok())PARK.v.oppSay(G.ex[2],3)}catch(e){}},5900)}
/* 開局（07d npcAskMaybe 的位置）：小卡；平面棋盤（沒有 3D 園子）時，拌嘴改成一張自己收起來的小卡 */
if(typeof npcAskMaybe==="function"){const na0=npcAskMaybe;npcAskMaybe=function(N,st,hb){let mine=false;try{mine=wmGameStart(N,st,hb)}catch(e){console.warn(e)}if(mine){try{npcMet(N)}catch(e){}return}return na0.apply(this,arguments)}}
/* 等園子的入場過場（park3d 的 .gt-t）收掉再開口；最多等 25 秒 */
function wmWhenReady(live,fn,ms){const t0=Date.now();const go=()=>{if(!live())return;if(document.querySelector(".gt-t")&&Date.now()-t0<25000)return setTimeout(go,500);setTimeout(()=>{if(live())fn()},ms||0)};setTimeout(go,600)}
function wmGameStart(N,st,hb){const G=wmDecide(st);if(!G||G.id!==st.id||!G.kind||G.started)return false;G.started=1;const h0=location.hash,live=()=>hb&&hb.isConnected&&location.hash===h0;
  if(G.kind==="bmtalk"){wmWhenReady(live,()=>{if(G.said)return;G.said=1;const pk=PARK&&PARK.v&&document.body.contains(PARK.v.el);
      if(pk){try{PARK.v.oppSay(G.ex[0],2.8)}catch(e){}wmTalkRest(G);return}
      const C=WX_CHARS[myChar()]||{};wmCard(N,hb,`<span class="wm-talk"><p>「${esc(G.ex[0])}」</p><p><b>${esc(C.n||"你")}</b>「${esc(G.ex[1])}」</p>${G.ex[2]?`<p>「${esc(G.ex[2])}」</p>`:""}</span>`)},900);return true}
  wmWhenReady(live,()=>{
    if(G.kind==="echo")wmCard(N,hb,`「${esc(G.p.name)}……那一仗，我也聽人說過。」`,[["聽她說",()=>wmEchoSheet(G.p)],["先下棋",()=>toast(`${N.name}：「好，下完再說。」`)]]);
    else if(G.kind==="scr")wmScrMeet(N,hb,G.due);
    else if(G.kind==="bmpz")wmCard(N,hb,N.pc===(WM_PC[myPc()]||"")?`「我們愛用同一種子。這兒有一局，比比看誰先看出那一步？」`:`「我出一局${esc(myPc())}的棋，比比看誰先看出那一步？」`,[["接招",()=>wmBmPz(N)],["下次",()=>toast(`${N.name}：「好，那下回再比。」`)]])},3000);
  return true}

/* ---------- 羈絆升級卡（07d npcBondUp）：點到心結的一句；琴師、漁家女滿級時交給你殘譜 ---------- */
if(typeof npcBondUp==="function"){const nb0=npcBondUp;npcBondUp=function(N){const r=nb0.apply(this,arguments);try{wmBondAfter(N)}catch(e){console.warn(e)}return r}}
function wmBondAfter(N){const n=bondOf(N.id).n,box=document.querySelector("#sheet .sh-b");if(!box)return;let add="";
  if(wmOn("bm")&&n>=2){const pr=wmPair(N),c=myChar(),S=wmBmSt(),k=c+":"+wmS(N);if(pr&&pr.ht&&!S.ht[k]&&(n===3||Math.random()<.5)){S.ht[k]=Date.now();store.set("wmBm",S);const C=WX_CHARS[c]||{};
    add+=`<p class="gd-line" style="color:var(--ink)">💭 她看了看${esc(C.n||"你")}：「${esc(pr.ht)}」</p>`}}
  const due=n>=3?wmScrDue(N):null,give=due&&due.step===0;
  if(give)add+=`<p class="gd-line" style="color:var(--ink)">📜 ${esc(N.name)}還有一樣東西要交給你。</p>`;
  if(!add)return;const row=box.querySelector(".cj-row");if(row)row.insertAdjacentHTML("beforebegin",add);else box.insertAdjacentHTML("beforeend",add);
  if(give){const ok=box.querySelector("#gdOk");if(ok){const f=ok.onclick;ok.onclick=e=>{if(f)f(e);setTimeout(()=>wmScrGive(due.line),300)}}}}

/* ---------- 入口：驛站清單、信箱、新信數、珍品冊 ---------- */
function wmInnHTML(){wmPgSync();const rows=wmPgRows("classic"),sc=wmScrHTML(),dev=typeof DEVMODE==="function"&&DEVMODE();if(!rows&&!sc&&!dev)return"";
  return`<div class="sec-t">🌸 女棋手的故事</div><div class="items" style="padding:0">${rows}${sc}</div>${rows||sc?"":`<div class="card muted" style="font-size:13px">（開發者模式才看得到這一區）</div>`}${dev?wmDevHTML():""}`}
function wmInnBind(box,v){wmPgBind(box,()=>{if(box.isConnected)gardenInn(v)});wmScrBind(box);wmDevBind(box,v)}
if(typeof gardenInn==="function"){const gi0=gardenInn;gardenInn=function(v){const r=gi0.apply(this,arguments);try{const box=v.querySelector("#gardenBox");if(box){const d=document.createElement("div");d.className="wm-inn";d.innerHTML=wmInnHTML();if(d.innerHTML){box.append(d);wmInnBind(d,v)}}}catch(e){console.warn(e)}return r}}
if(typeof yzMail==="function"){const ym0=yzMail;yzMail=function(k){const r=ym0.apply(this,arguments);try{wmPgSync();const rows=wmPgRows(k),b=document.querySelector("#sheet .sh-b");if(rows&&b){const d=document.createElement("div");d.className="items wm-mail";d.style.cssText="padding:0;margin-bottom:8px";d.innerHTML=rows;b.prepend(d);
      b.querySelectorAll("p.muted").forEach(p=>{if(/還沒有/.test(p.textContent)&&!p.closest(".wm-mail"))p.remove()});wmPgBind(d,()=>yzMail(k))}}catch(e){console.warn(e)}return r}}
if(typeof yzUnread==="function"){const yu0=yzUnread;yzUnread=function(k){let n=yu0.apply(this,arguments)|0;try{wmPgSync();n+=wmPgUnread(k)}catch(e){}return n}}
if(typeof relicBook==="function"){const rb0=relicBook;relicBook=async function(){const r=await rb0.apply(this,arguments);try{const h=wmScrHTML(),b=document.querySelector("#sheet .sh-b");if(h&&b){const d=document.createElement("div");d.innerHTML=`<div class="sec-t">📜 千秋殘譜</div><div class="items" style="padding:0">${h}</div>`;const p=b.querySelector("p");if(p)p.after(d);else b.prepend(d);wmScrBind(d)}}catch(e){console.warn(e)}return r}}

/* ---------- 開發者：暫時打開試玩（store "wmDev"）、立即觸發 ---------- */
function wmDevHTML(){const D=store.get("wmDev",{})||{};return`<div class="wm-dev"><div class="muted" style="font-size:12.5px">🧪 開發者：女棋手故事線（常數開關關著時，可以在這裡暫時打開試玩）</div>
  <div>${Object.keys(WM_FLAG).map(k=>`<button class="pill" data-wmdv="${k}">${WM_FLAG[k]()?"✅":D[k]?"🧪":"⬜"} ${WM_NAME[k]}</button>`).join("")}</div>
  <div class="muted" style="font-size:12.5px;margin-top:4px">立即觸發</div><div>
  <button class="pill" data-wmdt="pg">🕊 寄下一封飛鴿信</button><button class="pill" data-wmdt="talk">🀄 下一盤：拌嘴</button><button class="pill" data-wmdt="bmpz">🀄 下一盤：比本命子</button>
  <button class="pill" data-wmdt="scra">📜 清弦圖：給下一卷</button><button class="pill" data-wmdt="scrb">📜 蘆花圖：給下一卷</button><button class="pill" data-wmdt="echo">⚔ 剛打完這一朝第 1 場</button></div></div>`}
function wmDevBind(box,v){box.querySelectorAll("[data-wmdv]").forEach(b=>b.onclick=()=>{vibrate(5);const D=store.get("wmDev",{})||{};D[b.dataset.wmdv]=!D[b.dataset.wmdv];store.set("wmDev",D);if(v)gardenInn(v)});
  box.querySelectorAll("[data-wmdt]").forEach(b=>b.onclick=()=>{vibrate(5);const t=b.dataset.wmdt;
    if(t==="pg"){const n=wmPgSync(true);toast(n?`🕊 寄出 ${n} 封`:"要先有羈絆滿 3 級的女棋手（或 3 封都寄完了）");if(v)gardenInn(v)}
    else if(t==="talk"||t==="bmpz"){WM_FORCE={bm:t==="talk"?"bmtalk":"bmpz"};toast("下一盤園子遇到配對的女棋手時觸發（要開 🀄、要選雲河七星）")}
    else if(t==="scra"||t==="scrb"){const L=t.slice(3),S=wmScrSt();if(S[L].k>=3){toast("三卷都齊了，去解吧");wmScrSheet(L);return}S[L].k++;S[L].at[S[L].k-1]=Date.now();const n=wmN(WM_SCR[L].w[S[L].k]);if(n&&S[L].k<3)S[L].ask[wmS(n)]=1;store.set("wmScr",S);wmScrSheet(L)}
    else if(t==="echo"){const k=store.get("era","classic"),C=(typeof BATTLE_CARDS!=="undefined"&&BATTLE_CARDS[k])||[];if(!C.length){toast("先打開一次古戰場（載入戰役卡），再回來按");return}
      const c=C.find(z=>z&&WM_EC[z.id]);if(!c){toast("這一朝沒有女棋手，換一朝試");return}const S=wmEcSt();delete S.done[c.id];S.p={id:c.id,k,i:C.indexOf(c),at:Date.now(),name:c.name,lesson:c.lesson||""};store.set("wmEcho",S);toast(`⚔ ${c.name}：24 小時內進${eraLabel(k)}的園子`)}})}
/* =================================================================== 回饋 856：第一次遇到稀有、傳說的她 =================================================================== */
/* 回饋 856（開發者 11/9：女棋手分普通／稀有／傳說、機率加保底）：第一次在園子遇到稀有、傳說的女棋手（06-cpu.js parkNpcNew 記下 store npcFxPend＝{id,game}），
   她入座時（等 park3d 的入場過場 .gt-t 收掉、再等 1.6 秒讓「開局」字樣先過去，wmWhenReady）畫面慢慢飄落幾片她的代表物，響一聲磬。不像抽卡：沒有閃光、轉盤、文字；十幾片慢慢飄下、8 秒內自己收掉，
   飄的時候照常能下棋（pointer-events:none）。代表物是程式畫的 SVG 小形狀（WM_FALL，沒有字、不新畫圖）；聲音用 01-board.js 的 bellHit（App 原有的鐘磬合成聲，
   珍品開箱也用它，不下載新檔），聲音全關（sndOn）就不響。只播一次（對上這一盤就清掉 npcFxPend）；prefers-reduced-motion 不飄，只響一聲。傳說多幾片。
   WM_FALL＝[形狀, 填色, 線色]：琴師 白梅、馴鷹少女 羽毛、西域商隊的姑娘 葡萄葉、女大夫 艾葉、女捕快 楓葉、女將軍 雪花、江湖女俠 竹葉、女扮男裝的書生 銀杏葉、格格 海棠花瓣 */
const WM_FALL={w09_qin_player:["plum","#FBF6EE","#C9A0A8"],w11_yuan_falconer:["feather","#9A7A58","#5A4630"],w12_yuan_merchant:["vine","#7E9A4C","#4E6A2A"],
  w18_ming_doctor:["ai","#93A88A","#5E7458"],w20_ming_guard:["maple","#C8553A","#8A3020"],w10_general:["snow","#FFFFFF","#9FB4C8"],w06_swordswoman:["bamboo","#6A9A52","#3E6A30"],
  w04_ming_scholar:["ginkgo","#E3BC4C","#A8862A"],w05_qing_gege:["petal","#F4AFC0","#D9809A"]};
function wmFallSvg(k,c,s){const P={
  petal:`<path d="M0-9C5-9 7-3 0 9C-7-3-5-9 0-9Z" fill="${c}" stroke="${s}" stroke-width=".7"/><path d="M0-6V5" stroke="${s}" stroke-width=".5" opacity=".6"/>`,
  plum:[0,72,144,216,288].map(a=>`<circle cx="${(5*Math.sin(a*Math.PI/180)).toFixed(2)}" cy="${(-5*Math.cos(a*Math.PI/180)).toFixed(2)}" r="4.6" fill="${c}" stroke="${s}" stroke-width=".6"/>`).join("")+`<circle r="2.2" fill="#E8C35A"/>`,
  bamboo:`<path d="M0-11C2.8-5 2.8 5 0 11C-2.8 5-2.8-5 0-11Z" fill="${c}"/><path d="M0-10V10" stroke="${s}" stroke-width=".6"/>`,
  ai:`<path d="M0-10C6-6 6 4 0 10C-6 4-6-6 0-10Z" fill="${c}"/><path d="M0-9V10M0-3L3-6M0 1L-3-2M0 4L3 1" stroke="${s}" stroke-width=".6" fill="none"/>`,
  feather:`<path d="M0 11C-1 4-5-4-1-11C4-5 3 4 0 11Z" fill="${c}"/><path d="M0 11C0 4-.4-4-1-11" stroke="${s}" stroke-width=".7" fill="none"/>`,
  ginkgo:`<path d="M0 3C-8 2-10-5-7-9C-4-6 4-6 7-9C10-5 8 2 0 3Z" fill="${c}" stroke="${s}" stroke-width=".6"/><path d="M0 3V11" stroke="${s}" stroke-width="1"/>`,
  maple:`<polygon points="0,-10 2,-4 8,-6 5,0 9,3 3,3 2,9 0,5 -2,9 -3,3 -9,3 -5,0 -8,-6 -2,-4" fill="${c}" stroke="${s}" stroke-width=".6"/><path d="M0 5V11" stroke="${s}" stroke-width="1"/>`,
  vine:`<path d="M0 10C-2 6-9 6-9 0C-9-3-6-4-5-3C-6-7-3-10 0-7C3-10 6-7 5-3C6-4 9-3 9 0C9 6 2 6 0 10Z" fill="${c}" stroke="${s}" stroke-width=".6"/><path d="M0 9V-6M0 2L-5-1M0 2L5-1" stroke="${s}" stroke-width=".5" fill="none"/>`,
  snow:`<g stroke="${s}" stroke-width="1.6" stroke-linecap="round" fill="none">${[0,60,120].map(a=>`<path transform="rotate(${a})" d="M0-10V10M0-6L-3-9M0-6L3-9M0 6L-3 9M0 6L3 9"/>`).join("")}</g><g stroke="${c}" stroke-width=".8" stroke-linecap="round" fill="none">${[0,60,120].map(a=>`<path transform="rotate(${a})" d="M0-9V9"/>`).join("")}</g>`};
  return`<svg viewBox="-12 -12 24 24" aria-hidden="true">${P[k]||P.petal}</svg>`}
function wmFallCss(){if(document.getElementById("wmFallCss"))return;const s=document.createElement("style");s.id="wmFallCss";
  s.textContent=`.wmf{position:fixed;inset:0;pointer-events:none;z-index:44;overflow:hidden}.wmf i{position:absolute;top:-40px;display:block;opacity:0;animation:wmfFall var(--d) linear var(--dl) forwards}
.wmf i>b{display:block;width:var(--s);height:var(--s);animation:wmfSway var(--sw) ease-in-out var(--dl) infinite alternate}.wmf svg{width:100%;height:100%;display:block;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.22))}
@keyframes wmfFall{0%{opacity:0;transform:translateY(0) rotate(var(--r0))}12%{opacity:.95}80%{opacity:.9}100%{opacity:0;transform:translateY(calc(100vh + 60px)) rotate(var(--r1))}}
@keyframes wmfSway{from{transform:translateX(calc(var(--x) * -1))}to{transform:translateX(var(--x))}}`;document.head.append(s)}
function wmRareSound(rk){try{if(typeof sndOn==="function"&&!sndOn())return;if(typeof withAudio!=="function"||typeof bellHit!=="function")return;withAudio(()=>{bellHit(AC.currentTime+.05,rk==="legend"?440:587)})}catch(e){}}
/* 播一次：rk＝等級；回傳飄落層（測試用） */
function wmRareFx(N){const F=WM_FALL[N&&N.id];if(!F)return null;const rk=typeof npcRk==="function"?npcRk(N):"rare";wmRareSound(rk);
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return null;wmFallCss();document.querySelectorAll(".wmf").forEach(x=>x.remove());
  const box=document.createElement("div");box.className="wmf";box.setAttribute("aria-hidden","true");const n=rk==="legend"?18:12,svg=wmFallSvg(F[0],F[1],F[2]),R=(a,b)=>a+Math.random()*(b-a);
  box.innerHTML=Array.from({length:n},(_,i)=>`<i style="left:${((i+R(.1,.9))/n*100).toFixed(1)}%;--d:${R(4.6,6.4).toFixed(2)}s;--dl:${R(0,1.6).toFixed(2)}s;--r0:${R(-60,60)|0}deg;--r1:${R(120,420)|0}deg"><b style="--s:${R(16,26)|0}px;--sw:${R(1.1,1.9).toFixed(2)}s;--x:${R(8,22)|0}px">${svg}</b></i>`).join("");
  document.body.append(box);setTimeout(()=>box.remove(),9000);return box}
/* 開局（08b-cpugame.js 呼叫 npcAskMaybe 的地方）：這一盤是她第一次出現，就等入場過場收掉再飄 */
if(typeof npcAskMaybe==="function"){const na1=npcAskMaybe;npcAskMaybe=function(N,st,hb){try{const P=store.get("npcFxPend",null);
  if(P&&N&&st&&P.id===N.id&&P.game===st.id&&st.journey==="park"&&!(st.moves||[]).length){store.set("npcFxPend",null);const h0=location.hash;wmWhenReady(()=>hb&&hb.isConnected&&location.hash===h0,()=>wmRareFx(N),1600)}}catch(e){}
  return na1.apply(this,arguments)}}
