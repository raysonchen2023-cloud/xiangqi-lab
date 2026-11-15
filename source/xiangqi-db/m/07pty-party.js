/* ---------- 七星陸續加入與各自等級（開發者 11/15 用選單定案；設計書 story/七星陸續加入與各自等級_設計書_1115.md）----------
   不再選角：一律齊轍開局；其他六位在星槎停靠他的主場、下船幫他解一盤殘局後才加入（修為只提醒、不自動加入）。
   加入順序：俥齊轍 → 傌駱躍梅（漢）→ 帥沈方庭＋仕鐵連城（三國）→ 相田飛燕（魏晉）→ 兵步越溪（隋）→ 炮雷借花（五代）。
   經驗：修為每加 n，已加入的每位自動 +n×50%，另外 n×50% 進「星輝」池，玩家在角色卡分給想練的人；角色等級不能超過修為（頂到的那份轉進星輝，不浪費）。
   新加入的角色從「修為 −2」級起步（至少 1）。沒加入的位置用無名木棋靈，等級＝修為的一半。
   存檔鍵 party（跟存檔格走，05b JOURNEY_KEYS）：
     {v:1, m:{角色:{xp, at 加入時間, how:"start"|"ship"|"old"}}, pool 星輝, lead（11/16 取消隊長，留著讀舊存檔、不再用）, look 首頁小人（跟 pChar 同步）, seen:{角色:1 加入卡看過}, hint:{角色:1 修為提醒過}}
   舊存檔（有 journey、沒有 party）第一次讀到時轉換一次：齊轍＋原本選的角色＋停靠過他任一主場站的人；每位等級＝當時的修為；原本選的那位當首頁小人。
   前綴 pty／PTY（先 grep 過沒撞名）。PTY＝純規則，不碰 store 與畫面（node 測試 xiangqi-lab/tools/test-party-core.js 用 vm 直接載這支檔）。 */
const PTY=(()=>{
  const ORDER=["x_swordboy","x_miaogirl","x_shuai","x_shi","x_spiritgirl","x_bing","x_martialgirl"];
  /* 加入站、修為提醒等級、下船幫他的那一題（先用那一站小說裡的章內殘局） */
  const JOIN={x_miaogirl:{st:"han",lv:4,help:"xs-han-0"},x_shuai:{st:"sanguo",lv:5,help:"xs-sanguo-0"},x_shi:{st:"sanguo",lv:5,help:"xs-sanguo-0"},
    x_spiritgirl:{st:"weijin",lv:7,help:"xs-weijin-0"},x_bing:{st:"sui",lv:9,help:"xs-sui-0"},x_martialgirl:{st:"wudai",lv:11,help:"xs-wudai-0"}};
  /* 主場站：同 05b-save.js 的 CHAR_HOMES（舊存檔轉換用：停靠過任一主場就算遇過） */
  const HOMES={x_swordboy:["qin"],x_spiritgirl:["weijin","nanbei"],x_martialgirl:["wudai","song"],x_miaogirl:["han","yuan"],x_shuai:["sanguo","ming"],x_shi:["tang","ming"],x_bing:["sui","qing"]};
  const AUTO=.5,START="x_swordboy";
  const need=L=>60+20*L;                                   /* 同 07-legend.js 的 xpNeed */
  const base=L=>{L=Math.max(1,Math.min(100,L|0));let x=0;for(let k=1;k<L;k++)x+=need(k);return x};   /* 到 L 級起點的累計經驗 */
  const lvOf=x=>{let L=1,r=Math.max(0,+x||0);while(L<100&&r>=need(L)){r-=need(L);L++}return L};
  const cap=L=>{L=Math.max(1,Math.min(100,L|0));return L>=100?base(100):base(L)+need(L)-1};   /* 等級還是 L 的最大經驗（角色不能超過修為） */
  const blank=()=>({v:1,m:{},pool:0,lead:START,look:START,seen:{},hint:{}});
  const ok=c=>ORDER.includes(c);
  /* 讀進來的東西先整理成固定形狀（壞掉的欄位補預設，不認得的角色丟掉） */
  function norm(P){const o=blank();if(!P||typeof P!=="object")return null;
    for(const c of ORDER){const m=P.m&&P.m[c];if(m&&typeof m==="object")o.m[c]={xp:Math.max(0,Math.round(+m.xp||0)),at:+m.at||0,how:typeof m.how==="string"?m.how:"old"}}
    if(!o.m[START])o.m[START]={xp:0,at:0,how:"start"};
    o.pool=Math.max(0,Math.round(+P.pool||0));o.lead=o.m[P.lead]?P.lead:START;o.look=o.m[P.look]?P.look:o.lead;
    for(const k of["seen","hint"])if(P[k]&&typeof P[k]==="object")for(const c of ORDER)if(P[k][c])o[k][c]=1;
    if(P.wood)o.wood=1;   /* 齊轍那句木棋靈的話說過了（ptyWoodSay） */
    return o}
  /* 新旅程：只有齊轍 */
  function fresh(now){const P=blank();P.m[START]={xp:0,at:now||0,how:"start"};P.seen[START]=1;return P}
  /* 舊存檔轉換：J＝journey，docked＝已停靠的站，L＝當時的修為。停靠過他任一主場站、或他的加入站（城子是跟著庭哥在三國加入，三國不是他的主場）就算遇過 */
  function migrate(J,docked,L,now){const P=blank(),c0=J&&ok(J.c)?J.c:START,D=new Set(docked||[]),x=base(L);
    for(const c of ORDER)if(c===START||c===c0||HOMES[c].some(e=>D.has(e))||(JOIN[c]&&D.has(JOIN[c].st))){P.m[c]={xp:x,at:now||0,how:"old"};P.seen[c]=1}
    P.lead=P.look=c0;return P}
  const has=(P,c)=>!!(P&&P.m&&P.m[c]);
  const members=P=>ORDER.filter(c=>has(P,c));
  /* 角色等級：已加入才有，不超過修為；沒加入＝0 */
  const lv=(P,c,L)=>has(P,c)?Math.min(Math.max(1,L|0),lvOf(P.m[c].xp)):0;
  /* 木棋靈的等級 */
  const wood=L=>Math.max(1,Math.floor((L|0)/2));
  /* 加入：已在就不動；起始等級＝修為 −2（至少 1） */
  function join(P,c,L,now,how){if(!ok(c)||has(P,c))return false;P.m[c]={xp:base(Math.max(1,(L|0)-2)),at:now||0,how:how||"ship"};return true}
  /* 修為加了 n：每位已加入的 +round(n×50%)，頂到上限的那份轉進星輝；星輝另外 +(n − 自動那份) */
  function gain(P,n,L){n=Math.max(0,Math.round(+n||0));if(!n)return 0;const a=Math.round(n*AUTO),cp=cap(L);let pool=n-a;
    for(const c of members(P)){const o=P.m[c],g=Math.max(0,Math.min(a,cp-o.xp));o.xp+=g;pool+=a-g}
    P.pool=(P.pool|0)+pool;return pool}
  /* 分星輝給 c：不超過星輝、不超過上限；回傳實際分了多少 */
  function give(P,c,amt,L){if(!has(P,c))return 0;const o=P.m[c],g=Math.max(0,Math.min(Math.round(+amt||0),P.pool|0,cap(L)-o.xp));o.xp+=g;P.pool-=g;return g}
  /* 這一站下船要遇到誰（還沒加入的） */
  const pendingAt=(P,k)=>ORDER.filter(c=>JOIN[c]&&JOIN[c].st===k&&!has(P,c));
  /* 修為到了、還沒加入、還沒提醒過的（照加入順序） */
  const hints=(P,L)=>ORDER.filter(c=>JOIN[c]&&!has(P,c)&&(L|0)>=JOIN[c].lv&&!(P.hint&&P.hint[c]));
  /* 下一位還沒加入的 */
  const next=P=>ORDER.find(c=>!has(P,c))||null;
  /* 黑洞戰鬥（11/15 開發者選單，story/七星各自等級_戰鬥規則草案_1115.md）：每種棋子是誰、幾級。還沒加入的是木棋靈：同一位角色的數值、等級＝修為一半 */
  const PCOF={R:"x_swordboy",N:"x_miaogirl",B:"x_spiritgirl",A:"x_shi",K:"x_shuai",C:"x_martialgirl",P:"x_bing"};
  function squadOf(P,L){const o={};for(const pc of Object.keys(PCOF)){const c=PCOF[pc];o[pc]=has(P,c)?{ck:c,L:lv(P,c,L)}:{ck:c,L:wood(L),wood:1}}return o}
  return{ORDER,JOIN,HOMES,AUTO,START,need,base,lvOf,cap,blank,norm,fresh,migrate,has,members,lv,wood,join,gain,give,pendingAt,hints,next,PCOF,squadOf}})();

/* ===== 存檔層（碰 store；畫面在後面） ===== */
const ptyL=()=>{try{return typeof xpInfo==="function"?xpInfo().L:1}catch(e){return 1}};
/* 讀隊伍；沒有旅程＝null；舊存檔第一次讀到就轉換並存起來 */
function ptyGet(){let P=null;try{P=PTY.norm(store.get("party",null))}catch(e){}if(P)return P;
  let J=null;try{J=store.get("journey",null)}catch(e){}if(!J)return null;
  let D=[];try{D=(typeof shipDockList==="function"&&shipDockList())||[]}catch(e){}
  P=PTY.migrate(J,D,ptyL(),Date.now());try{store.set("party",P)}catch(e){}return P}
function ptySave(P){try{store.set("party",P)}catch(e){}}
/* 第一次在大星盤上看到木棋靈（設計書第六節）：齊轍說一句，每個存檔只說一次。pcs＝這一盤紅方有哪幾種棋子；回那句話或空字串 */
function ptyWoodSay(pcs){try{const S=ptySquad();if(!S||!(pcs||[]).some(pc=>S[pc]&&S[pc].wood))return"";const P=ptyGet();if(P.wood)return"";P.wood=1;ptySave(P);
  return"齊轍：「星辰之力還沒補齊，這些棋靈先幫我們卡位，我們去把大家找回來。」"}catch(e){return""}}
function ptyHas(c){return PTY.has(ptyGet(),c)}
/* 角色等級：沒有旅程時照舊用修為（序局、試玩） */
function ptyLv(c){const P=ptyGet(),L=ptyL();if(!P)return L;return PTY.has(P,c)?PTY.lv(P,c,L):PTY.wood(L)}
/* 11/16 開發者「不要有隊長這個設定」：沒有隊長了。黑洞三種玩法（塔防 bhtdChar、星門圍城 gsvChar、車輪戰 whlCk）畫面上的名字、頭像＝首頁小人（陪你走的那位，純外觀）；
   數值看全隊（ptySquad），招式＝全隊已學會的（ptyLearned／ptyPick）。ptyLead 留著當 ptyLook 的別名，舊程式叫到也不會壞 */
function ptyLook(){const P=ptyGet();if(P)return P.look;let c="";try{c=(typeof myChar==="function"&&myChar())||""}catch(e){}return c||PTY.START}
const ptyLead=()=>ptyLook();
/* 11/16「黑洞裡可以用每個人的招式」：SK＝那個玩法的招式表（每招有 ch、lv）。
   ptyLearned＝已加入的每一位、照各自等級已學會的招（照加入順序）；ptyPick＝從存的那份挑出還合法的（最多 4 招，空的就帶前 4 招）；ptyGroups＝選關畫面照夥伴分組（沒學會的也列，帶 lv 鎖） */
function ptyLearned(SK){const P=ptyGet();if(!P)return[];const o=[];for(const c of PTY.ORDER){if(!PTY.has(P,c))continue;const L=ptyLv(c);for(const s of SK||[])if(s.ch===c&&s.lv<=L)o.push(s)}return o}
function ptyPick(SK,saved){const ok=ptyLearned(SK).map(s=>s.id),a=(Array.isArray(saved)?saved:[]).filter((id,i,A)=>ok.includes(id)&&A.indexOf(id)===i).slice(0,4);return a.length?a:ok.slice(0,4)}
function ptyGroups(SK){const P=ptyGet();if(!P)return[];return PTY.ORDER.filter(c=>PTY.has(P,c)).map(c=>({c,nm:ptyNm(c),L:ptyLv(c),sk:(SK||[]).filter(s=>s.ch===c)})).filter(g=>g.sk.length)}
/* 首頁小人：跟 pChar 同步（myChar／myLook／bot3d 都讀 pChar），本命棋子 botPiece 跟著換 */
function ptySetLook(c){const P=ptyGet();if(!P||!PTY.has(P,c)||typeof WX_CHARS==="undefined"||!WX_CHARS[c])return false;const C=WX_CHARS[c];
  P.look=c;ptySave(P);store.set("pChar",c);if(C.sx)store.set("pSex",C.sx);if(C.pc)store.set("botPiece",C.pc);
  try{window.dispatchEvent(new Event("xq-look"))}catch(e){}return true}
/* 07-legend.js addXP 加完修為後呼叫：分給全隊與星輝 */
function ptyOnXp(n){const P=ptyGet();if(!P)return;PTY.gain(P,n,ptyL());ptySave(P);try{ptyHintCheck()}catch(e){}}
function ptyGive(c,amt){const P=ptyGet();if(!P)return 0;const g=PTY.give(P,c,amt,ptyL());if(g)ptySave(P);return g}
/* 新旅程（05b journeyStart）：只有齊轍 */
/* 黑洞開局帶的每種棋子設定（07bhg gsvStart、07bhw whlNew、07bht 塔防）；沒有旅程＝null，照舊整隊一組 */
function ptySquad(){const P=ptyGet();return P?PTY.squadOf(P,ptyL()):null}
/* 吃子扣血跳字旁的小頭像（開發者選單）：這種棋子（R、N…）已加入就回他的頭像；木棋靈不顯示 */
function ptyAv(pc){try{const c=PTY.PCOF[String(pc||"").toUpperCase()];return c&&ptyHas(c)?"data/xs/prev_"+c+".webp":null}catch(e){return null}}
function ptyFresh(){const P=PTY.fresh(Date.now());ptySave(P);return P}
/* 加入（星槎下船幫忙解開那一題以後） */
function ptyJoin(c,how){const P=ptyGet();if(!P)return false;const j=PTY.join(P,c,ptyL(),Date.now(),how);if(j)ptySave(P);return j}

/* ===== 雲河七星卡冊（我的角色頁「🔒 旅程」「棋子」、角色卡底部「🌟 雲河七星」都開這裡） =====
   已加入：頭像、名字・小名、本命棋子、朝代、等級（上限＝修為）、經驗條、招式學會幾招、＋星輝、帶他出門。
   還沒加入：剪影＋本命棋子＋「星槎停靠〇〇時相遇」；修為提醒過的改寫那一站的目的。 */
const PTY_GOAL={x_miaogirl:"去大漠驛站，救出戴笠帽的孩子",x_shuai:"去赤壁江上，接回被困的兩個孩子",x_shi:"去赤壁江上，接回被困的兩個孩子",
  x_spiritgirl:"去竹林溪邊，找那個一直在等人的孩子",x_bing:"去運河工地，找半塊布的主人",x_martialgirl:"去逃荒路上，找那個怕打雷的孩子"};
function ptyCss(){if(document.getElementById("ptyCss"))return;const s=document.createElement("style");s.id="ptyCss";s.textContent=`
.pty-top{display:flex;gap:10px;justify-content:space-between;align-items:center;margin:0 0 10px;font-size:14px}
.pty-top b{font-size:16px}.pty-pool{color:#2b6cb0}.pty-top{margin-bottom:4px}.pty-cap{margin:0 0 10px}
.pty-c{display:grid;grid-template-columns:64px 1fr;gap:4px 10px;align-items:start;padding:10px;border:1px solid var(--line,#d8cfbf);border-radius:12px;margin:0 0 10px;background:var(--card,#fffaf0)}
.pty-c img{width:64px;height:85px;object-fit:cover;object-position:top;border-radius:8px;background:#efe6d6}
.pty-c.lk img{filter:brightness(0) opacity(.55)}.pty-c.lk{opacity:.85}
.pty-n{font-weight:700;font-size:16px}.pty-n small{font-weight:400;font-size:13px;color:var(--muted,#6b6257);margin-left:4px}
.pty-tag{display:inline-block;font-size:12px;padding:1px 7px;border-radius:9px;margin-left:4px;background:#f3e3b5;color:#5a4300}
.pty-tag.look{background:#dbeafe;color:#1e3a8a}
.pty-m{font-size:13px;color:var(--muted,#6b6257)}
.pty-xp{height:7px;border-radius:4px;background:#e8dfcf;overflow:hidden;margin:4px 0}.pty-xp b{display:block;height:100%;background:#d4a017}
.pty-a{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.pty-a .btn{flex:1 1 0;width:auto;min-width:0;min-height:40px;margin:0;padding:6px 8px;font-size:14px;white-space:nowrap}
.pty-st{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:4px}
.pty-st>span{display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border-radius:8px;background:rgba(128,110,80,.12)}
.pty-st small{font-size:12px;color:var(--muted,#6b6257);white-space:nowrap}.pty-st b{font-size:16px;line-height:1.2}
.pty-row{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin:0;padding:8px 12px;border:1px solid var(--line,#d8cfbf);border-radius:10px;background:var(--card,#fffaf0);color:inherit;font-size:14px;text-align:left}
.pty-row>span:first-child{font-weight:700}.pty-row small{color:var(--muted,#6b6257);font-size:12.5px}.pty-row b{margin-left:auto;font-weight:700}.pty-row i{font-style:normal;color:var(--muted,#6b6257)}
.pty-c .pty-row{grid-column:1/-1;margin-top:2px}.pty-row.top{margin:0 0 10px}
`;document.head.append(s)}
/* 開發者 11/16（卡冊截圖）「讓這頁也能看到角色的體力/靈力/攻擊力/防禦力/天賦/招式」（選單：體力、靈力＝每位自己的黑洞數值；天賦是全隊共用的，放卡冊最上面一列）：
   每張卡多一排四格（體力＝黑洞裡的元氣、靈力＝靈力上限、攻擊力、防禦力，BHTD.stats 照這位的等級；跟我的角色頁「黑洞裡的你」同一組數字）、一列「招式 n／N ›」（點開這位的招式清單）；
   卡冊最上面一列「天賦（全隊共用）已點亮 n／N ›」開星塵天賦樹，看完回卡冊。黑洞模組沒載入就不畫。 */
function ptyStatHTML(c,lv){try{if(typeof BHTD==="undefined"||!BHTD.stats||!BHTD.CH||!BHTD.CH[c])return"";const S=BHTD.stats(c,lv),g=(t,v)=>`<span><small>${t}</small><b>${v}</b></span>`;
  return`<div class="pty-st">${g("靈力上限",S.sp)}${g("攻擊力",BHTD.atkPt(S.atk))}${g("防禦力",BHTD.defPt(S.def))}</div>`}catch(e){return""}}   /* 11/16 體力統一：「體力」＝這位的體力上限，陪你走的那一位就是角色卡上「體力 n／這個數」的上限（07dgl dglMx）；黑洞的靈力是上限，改叫「靈力上限」，跟人間存著的「靈力 n／20」分開 */
const ptySkPool=c=>{try{return typeof BHTD!=="undefined"&&BHTD.SK?BHTD.SK.filter(s=>s.ch===c):[]}catch(e){return[]}};
/* 11/16 全隊體力（RPG 數值盤查第 4 項，開發者選「三處都用全隊體力」）：人間的體力上限、進黑洞開局的體力是同一個數（07dgl dglMx：七種棋子所屬角色的平均），卡冊最上面寫這一個數；每位的卡不再各寫各的體力，只留靈力上限、攻擊力、防禦力 */
function ptyTeamHTML(){try{const mx=typeof dglMx==="function"&&typeof BHTD!=="undefined"?dglMx():0;if(!(mx>0))return"";return`<div class="pty-row top pty-team"><span>全隊體力</span><small>（人間、黑洞都是這個數）</small><b>${mx}</b></div>`}catch(e){return""}}
function ptyTalHTML(){try{if(typeof BHTD==="undefined"||!BHTD.TAL||typeof bhtdTal!=="function"||typeof bhtdDust!=="function")return"";const n=(bhtdDust().t||[]).length;
  return`<button type="button" class="pty-row top" data-top="tal"><span>天賦</span><small>（全隊共用）</small><b><span>已點亮</span> ${n}／${BHTD.TAL.length}</b><i aria-hidden="true">›</i></button>`}catch(e){return""}}
/* 這位的招式清單：學會的在前（名稱、靈力、效果），還沒學會的灰著寫幾級學會；看完回卡冊（版面沿用角色卡的技能清單 07dgl dglSkills） */
function ptySkills(c){if(typeof sheet!=="function")return;const lv=ptyLv(c),pool=ptySkPool(c).slice().sort((a,b)=>(a.lv>lv)-(b.lv>lv)||a.lv-b.lv);if(!pool.length)return;try{if(typeof dglCss==="function")dglCss()}catch(e){}ptyCss();
  let nm=c;try{nm=WX_CHARS[c].n}catch(e){}const lock=()=>{try{return typeof dglIc==="function"?dglIc("lock"):"🔒 "}catch(e){return"🔒 "}};
  sheet(nm+"的招式",b=>{b.innerHTML=`<div class="dgl-cd">${pool.map(s=>{const lk=s.lv>lv;return`<div class="dgl-ski${lk?" lk":""}"><div class="dgl-skh"><b>${lk?lock():""}${esc(s.nm)}</b><span>${lk?`Lv ${s.lv} <span>學會</span>`:`${s.cost} <span>靈</span>`}</span></div><p>${esc(s.d||"")}</p></div>`}).join("")}<p class="dgl-ks"><span>在黑洞裡使用，一場最多帶 4 招</span></p><button type="button" class="btn dgl-kme" id="ptySkB">‹ 回雲河七星</button></div>`;
    b.querySelector("#ptySkB").onclick=()=>{closeSheet();setTimeout(ptySheet,60)}})}
/* 開發者 11/16「角色等級不能超過修為，這句話玩家看不懂」（選單選「直接講結果」）：不解釋規則，直接說夥伴現在最高能練到幾級、怎樣才會再往上。
   同一條規則的另外兩處一起改：卡片上練滿的註記「（到修為上限）」→「（練滿了，等你升級）」；練滿還按＋星輝的提示 →「已經跟你一樣高了，等你升級再練」 */
const ptyCapSay=L=>L>=100?"夥伴最高練到 Lv 100":`夥伴最高練到 Lv ${L}，你升級才會再往上`;
function ptyCardHTML(P,c,L){const C=(typeof WX_CHARS!=="undefined"&&WX_CHARS[c])||{n:c},era=typeof eraLabel==="function"&&typeof CHAR_ERA!=="undefined"?eraLabel(CHAR_ERA[c]):"";
  const img=`<img src="data/xs/prev_${c}.webp" alt="">`;
  if(!PTY.has(P,c)){const j=PTY.JOIN[c],at=j&&typeof eraLabel==="function"?eraLabel(j.st):"";const goal=P.hint&&P.hint[c]&&PTY_GOAL[c];
    return`<div class="pty-c lk">${img}<div><div class="pty-n">？？？<small>${esc(C.pc||"")}</small></div><div class="pty-m">${goal?esc(goal):`星槎停靠${esc(at)}時相遇`}</div></div></div>`}
  const lv=PTY.lv(P,c,L),x=P.m[c].xp,b0=PTY.base(lv),nd=PTY.need(lv),top=lv>=L,pct=top?100:Math.max(0,Math.min(100,100*(x-b0)/nd));
  const skP=ptySkPool(c),skN=skP.filter(s=>s.lv<=lv).length;   /* 11/16：招式從那一行小字搬成一列可以點的「招式 n／N ›」 */
  const tg=P.look===c?`<span class="pty-tag look">陪你走</span>`:"";
  return`<div class="pty-c" data-c="${c}">${img}<div><div class="pty-n">${esc(C.n)}<small>${esc(C.nk||"")}</small>${tg}</div>
    <div class="pty-m">${esc(C.pc||"")}・${esc(era)}・Lv ${lv}${top?(L>=100?"（練滿了）":"（練滿了，等你升級）"):""}</div><div class="pty-xp" aria-hidden="true"><b style="width:${pct.toFixed(1)}%"></b></div></div>
    ${ptyStatHTML(c,lv)}${skP.length?`<button type="button" class="pty-row" data-a="sk"><span>招式</span><b>${skN}／${skP.length}</b><i aria-hidden="true">›</i></button>`:""}
    ${(a=>a?`<div class="pty-a">${a}</div>`:"")(`${top?"":`<button type="button" class="btn" data-a="give"${P.pool>0?"":" disabled"}>＋星輝</button>`}${P.look===c?"":`<button type="button" class="btn ghost" data-a="look">帶${ptyTa(c)}出門</button>`}`)}</div>`}   /* 兩顆都不用出現時（練滿了又正陪你走）不留一條空白 */
function ptySheet(){if(typeof sheet!=="function")return;const P0=ptyGet();if(!P0){try{toast("還沒有開始旅程")}catch(e){}return}ptyCss();
  sheet("🌟 雲河七星",b=>{const draw=()=>{const P=ptyGet(),L=ptyL(),sy=b.scrollTop;
    b.innerHTML=`<div class="pty-top"><span><span>你的修為</span> <b>Lv ${L}</b></span><span class="pty-pool">✨ <span>星輝</span> <b>${P.pool|0}</b></span></div><p class="pty-m pty-cap">${ptyCapSay(L)}</p>`+ptyTeamHTML()+ptyTalHTML()+PTY.ORDER.map(c=>ptyCardHTML(P,c,L)).join("")+
      `<p class="pty-m">下棋、解題、黑洞過關得到的修為，一半自動分給隊上每一位，另一半變成星輝，由你分給想練的人。黑洞裡全隊已學會的招都能帶（一場最多 4 招）；「陪你走」是首頁上跟著你的那一位。</p>`;
    {const t=b.querySelector('[data-top="tal"]');if(t)t.onclick=()=>{try{vibrate(5)}catch(e){}closeSheet();setTimeout(()=>bhtdTal(()=>ptySheet(),"‹ 回雲河七星"),60)}}   /* 07bht bhtdTal 第二個參數＝返回鈕的字（沒給照舊「回選關」） */
    b.querySelectorAll(".pty-c[data-c]").forEach(el=>{const c=el.dataset.c;el.querySelectorAll("[data-a]").forEach(btn=>btn.onclick=()=>{try{vibrate(5)}catch(e){}const a=btn.dataset.a;
      if(a==="sk"){closeSheet();setTimeout(()=>ptySkills(c),60);return}
      if(a==="give"){const P2=ptyGet(),L2=ptyL(),lv=PTY.lv(P2,c,L2),want=PTY.base(Math.min(L2,lv+1))-P2.m[c].xp;const g=ptyGive(c,want>0?want:P2.pool);try{toast(g?`✨ 給了 ${g} 星輝`:"已經跟你一樣高了，等你升級再練")}catch(e){}}

      else if(a==="look"){if(ptySetLook(c)){try{toast(WX_CHARS[c].n+"陪你走")}catch(e){}try{closeSheet()}catch(e){}setTimeout(()=>{try{if(typeof route==="function")route()}catch(e){}},260);return}}   /* 換人後關卡冊、重畫首頁，右上頭像和小人馬上換 */
      draw()})});b.scrollTop=sy};draw()})}

/* ===== 星槎上的加入劇情（設計書第三節；台詞暫定，照小說前九章改寫稿 story/chatgpt_app/86_*定稿合集.md，之後交 Gemini 潤稿） =====
   ① 到站（07f-ship.js shipDockCover 的 arrive 先問 ptyArrive）：這一站有人要加入 → 下船場景（他的困難），「去幫他」直接開那一題（shipHref）。
   ② 解開那一題（07f-ship.js shipMark 末尾問 ptyOnSolve）：他加入 → 加入卡（同行的一句、帶他出門）。
   ③ 起航（07f-ship.js shipSailNeed 先問 ptySailBlock）：還沒幫他，不能離開這一站。
   ④ 修為到了（ptyOnXp）：說書人提醒一次，帶你去星槎；不會自動加入。 */
const PTY_MEET={han:"驛站前圍著幾名驛卒。中間站著一個戴褐色笠帽的女孩，帽頂一顆紅琉璃珠，正是書頁上浮出的那一顆。驛卒說她是越境的胡人，把她和一封驛書一起扣下了。沙暴快來了，老驛騎急著要把驛書送出去。",
  sanguo:"赤壁江上火光連成一片。一艘小船上，穿朱紅錦緞的男孩按著胸口喘不過氣，另一個綁著木護腕的男孩擋在他前面，不肯先走。岸上的軍漢把他們當成北邊的探子。",
  weijin:"雨後的竹林溪邊，一個披白披帛的女孩守著一只小爐，一直望著對岸霧裡的人影。溪水漲了，踏石全淹了，她說什麼也不肯走。",
  sui:"運河工地的泥路上，一個綁靛藍頭巾、草鞋磨破的女孩被監工推著走。監工說她是逃役的小工；她懷裡揣著東西，說要送過河，可是橋還沒修好。",
  wudai:"斷牆後，一個穿朱紅衣、身上帶著火藥味的女孩捂著耳朵大叫。遠處的戰鼓像打雷；牆角一個小孩被她嚇得哭得更急，散亂的軍漢已經轉過頭來。"};
const PTY_SAY={x_miaogirl:"我找不到回去的路……星槎真的會停靠元朝？那我跟你們走。",x_shuai:"我想看看九宮外面。",x_shi:"那我跟著。",
  x_spiritgirl:"下一站就是瓜步……我跟你們走。",x_bing:"看棋不收錢？那……我想知道這半塊布，是從哪裡來的。",x_martialgirl:"下一站就是臨安……我跟你們回去。"};
const PTY_HINT={x_miaogirl:"大漠驛站，有個戴笠帽的孩子被扣著。",x_shuai:"赤壁的火還沒熄，那兩個孩子還在江上。",x_shi:"赤壁的火還沒熄，那兩個孩子還在江上。",
  x_spiritgirl:"竹林溪邊，有人一直在等。",x_bing:"運河工地上，有個過不了河的丫頭。",x_martialgirl:"逃荒路上的尖叫聲，聽得到嗎？"};
const ptyNm=c=>{try{return WX_CHARS[c].n}catch(e){return c}};
/* 他／她／他們：照角色性別（WX_CHARS sx），兩個人以上用「他們」 */
function ptyTa(L){L=[].concat(L||[]);if(L.length>1)return"他們";try{return WX_CHARS[L[0]].sx==="f"?"她":"他"}catch(e){return"他"}}
const ptyHelpGo=(k,c)=>{const id=PTY.JOIN[c]&&PTY.JOIN[c].help;if(id&&typeof shipHref==="function")location.hash=shipHref(k,id);else location.hash="#/ship/pz"};
/* ① 到站：回 true＝已經接手（下船場景），07f 不再出原本的開場白 */
function ptyArrive(k,done){let P=null;try{P=ptyGet()}catch(e){}if(!P||typeof modal!=="function")return false;const L=PTY.pendingAt(P,k);if(!L.length||!PTY_MEET[k])return false;
  const c=L[0],T=(typeof SHIP_STOP!=="undefined"&&SHIP_STOP[k])||{},at=typeof eraLabel==="function"?eraLabel(k):k;
  modal(`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><h2>${esc(at)}・${esc(T.place||"")}</h2><p>${esc(PTY_MEET[k])}</p>`,
    [["去幫"+ptyTa(L),()=>ptyHelpGo(k,c)],["先看看這一站",()=>{if(done)done()},true]],"prolog");return true}
/* ② 解開那一題 */
function ptyOnSolve(k,id){let P=null;try{P=ptyGet()}catch(e){}if(!P)return;const L=PTY.pendingAt(P,k).filter(c=>PTY.JOIN[c].help===id);if(!L.length)return;
  for(const c of L)ptyJoin(c,"ship");ptyJoinCardLater(L,0)}
function ptyJoinCardLater(L,n){setTimeout(()=>{if(document.querySelector(".modal")&&n<20)return ptyJoinCardLater(L,n+1);ptyJoinCard(L)},n?1500:2500)}
function ptyJoinCard(L){if(typeof modal!=="function"||!L||!L.length)return;const P=ptyGet();if(!P)return;
  const nm=L.map(ptyNm).join("、"),c=L[0];
  modal(`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><h2>${esc(nm)}加入了！</h2>${L.map(x=>PTY_SAY[x]?`<p class="pl-say">${esc(ptyNm(x))}：「${esc(PTY_SAY[x])}」</p>`:"").join("")}<p class="muted">${ptyTa(L)}的招式黑洞裡就能帶；在「雲河七星」卡冊可以換陪你走的人，也可以分星輝給${ptyTa(L)}。</p>`,
    [["帶"+ptyTa(L)+"出門",()=>{ptySetLook(c)}],["好",null,true]],"prolog");
  const P2=ptyGet();for(const x of L)P2.seen[x]=1;ptySave(P2)}
/* ③ 起航閘門：回 null＝不擋 */
function ptySailBlock(){let P=null;try{P=ptyGet()}catch(e){}if(!P||typeof shipFront!=="function")return null;const k=shipFront();if(!k)return null;const L=PTY.pendingAt(P,k);if(!L.length)return null;
  const c=L[0],id=PTY.JOIN[c].help;if(typeof shipRec==="function"&&shipRec(k,id)){for(const x of L)ptyJoin(x,"ship");return null}   /* 題目先解過了（例如在聽書裡解的）：補加入，不擋 */
  return{k,pty:c,n:L.length}}
function ptyGateSay(N){if(typeof modal!=="function")return;const nm=N.n>1?PTY.pendingAt(ptyGet(),N.k).map(ptyNm).join("和"):ptyTa(N.pty);
  modal(`<img src="data/xs/prev_${N.pty}.webp" alt="" onerror="this.remove()"><h2>還有人困在這裡</h2><p>${esc(PTY_MEET[N.k]||"")}</p><p class="muted">先幫${esc(nm)}，星槎再起航。</p>`,[["去幫忙",()=>ptyHelpGo(N.k,N.pty)],["好",null,true]],"prolog")}
/* ④ 修為提醒 */
function ptyHintCheck(){let P=null;try{P=ptyGet()}catch(e){}if(!P)return;const L=PTY.hints(P,ptyL());if(!L.length)return;for(const c of L)P.hint[c]=1;ptySave(P);ptyHintLater(L[0],0)}
function ptyHintLater(c,n){setTimeout(()=>{if(document.querySelector(".modal")&&n<20)return ptyHintLater(c,n+1);ptyHintShow(c)},n?2000:4000)}
function ptyHintShow(c){if(typeof modal!=="function"||ptyHas(c))return;const j=PTY.JOIN[c],at=j&&typeof eraLabel==="function"?eraLabel(j.st):"";
  modal(`<img src="data/actors/teller.webp" alt="" onerror="this.remove()"><h2>《千秋棋話》亮了一下</h2><p class="pl-say">說書人：「${esc(PTY_HINT[c]||"")}」</p><p class="muted">星槎停靠${esc(at)}，就能找到${PTY.JOIN[c].st==="sanguo"?"他們":"那孩子"}。</p>`,
    [["去星槎",()=>{location.hash="#/adventure"}],["之後再說",null,true]],"prolog")}
