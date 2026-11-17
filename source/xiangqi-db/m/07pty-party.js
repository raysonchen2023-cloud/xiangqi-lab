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
   ptyLearned＝已加入的每一位、照各自等級已學會的招（照加入順序）；ptyPick＝已學會的全部（11/16 開發者「已經沒有這個限制 請拿掉」：不再限一場 4 招、不用選）；ptyGroups＝選關畫面照夥伴分組（沒學會的也列，帶 lv 鎖） */
function ptyLearned(SK){const P=ptyGet();if(!P)return[];const o=[];for(const c of PTY.ORDER){if(!PTY.has(P,c))continue;const L=ptyLv(c);for(const s of SK||[])if(s.ch===c&&s.lv<=L)o.push(s)}return o}
function ptyPick(SK){return ptyLearned(SK).map(s=>s.id)}
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
.pty-top b{font-size:16px}.pty-pool{color:#2b6cb0}.pty-top{margin-bottom:4px}.pty-cap{margin:0 0 10px}.pty-how{margin:-4px 0 6px}.pty-xpgo{display:block;width:100%;margin:0 0 12px}
.pty-c{display:grid;grid-template-columns:64px 1fr;gap:4px 10px;align-items:start;padding:10px;border:1px solid var(--line,#d8cfbf);border-radius:12px;margin:0 0 10px;background:var(--card,#fffaf0)}
.pty-c img{width:64px;height:85px;object-fit:cover;object-position:top;border-radius:8px;background:#efe6d6}
.pty-c.lk img{filter:brightness(0) opacity(.55)}.pty-c.lk{opacity:.85}
.pty-n{font-weight:700;font-size:16px}.pty-n small{font-weight:400;font-size:13px;color:var(--muted,#6b6257);margin-left:4px}
.pty-tag{display:inline-block;font-size:12px;padding:1px 7px;border-radius:9px;margin-left:4px;background:#f3e3b5;color:#5a4300}
.pty-tag.look{background:#dbeafe;color:#1e3a8a}
.pty-m{font-size:13px;color:var(--muted,#6b6257)}
.pty-xp{height:7px;border-radius:4px;background:#e3e8f1;overflow:hidden;margin:2px 0 4px}.pty-xp b{display:block;height:100%;background:linear-gradient(90deg,#d4a017,#2b6cb0)}.pty-xpt{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:#2b6cb0;margin-top:4px}.pty-xpt span:last-child{color:var(--muted,#6b6257)}
.pty-a{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.pty-a .btn{flex:1 1 0;width:auto;min-width:0;min-height:44px;margin:0;padding:6px 8px;font-size:14px;white-space:nowrap}
.pty-a .btn{position:relative}.pty-a .btn::before{content:"";position:absolute;left:min(0px,calc((100% - 44px) / 2));right:min(0px,calc((100% - 44px) / 2));top:min(0px,calc((100% - 44px) / 2));bottom:min(0px,calc((100% - 44px) / 2))}
.pty-st{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:4px}
.pty-st>span{display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border-radius:8px;background:rgba(128,110,80,.12)}
.pty-st small{font-size:12px;color:var(--muted,#6b6257);white-space:nowrap}.pty-st b{font-size:16px;line-height:1.2}
.pty-sv{grid-column:1/-1;margin-top:6px;padding:8px 2px 0;border-top:1px solid var(--line,#d8cfbf)}
.pty-bar{display:flex;align-items:center;gap:10px;min-height:26px}
.pty-bar>span{flex:none;width:3.4em;font-size:13.5px;color:var(--muted,#6b6257);letter-spacing:.06em;white-space:nowrap}
.pty-bar>i{flex:1;height:9px;border-radius:5px;background:rgba(128,110,80,.18);overflow:hidden;box-shadow:inset 0 1px 1px rgba(0,0,0,.12)}
.pty-bar>i>b{display:block;height:100%;border-radius:5px}
.pty-bar.hp>i>b{background:linear-gradient(90deg,#9e2a20,#d0574b)}.pty-bar.sp>i>b{background:linear-gradient(90deg,#2a4f93,#5a8bd6)}
.pty-bar.atk>i>b{background:linear-gradient(90deg,#a8650f,#e2a63b)}.pty-bar.def>i>b{background:linear-gradient(90deg,#1f6f5c,#4ea88c)}
.pty-bar>em{flex:none;min-width:2.2em;text-align:right;font-style:normal;font-weight:800;font-size:17px;font-variant-numeric:tabular-nums}
.pty-ad{margin-top:5px;padding-top:5px;border-top:1px dashed var(--line,#d8cfbf)}
.pty-row{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin:0;padding:8px 12px;border:1px solid var(--line,#d8cfbf);border-radius:10px;background:var(--card,#fffaf0);color:inherit;font-size:14px;text-align:left}
.pty-row>span:first-child{font-weight:700}.pty-row small{color:var(--muted,#6b6257);font-size:12.5px}.pty-row b{margin-left:auto;font-weight:700}.pty-row i{font-style:normal;color:var(--muted,#6b6257)}
.pty-c .pty-row{grid-column:1/-1;margin-top:2px}.pty-row.top{margin:0 0 10px}
`;document.head.append(s)}
/* 開發者 11/16（卡冊截圖）「讓這頁也能看到角色的體力/靈力/攻擊力/防禦力/天賦/招式」（選單：體力、靈力＝每位自己的黑洞數值；天賦是全隊共用的，放卡冊最上面一列）：
   每張卡多一排四格（體力＝黑洞裡的元氣、靈力＝靈力上限、攻擊力、防禦力，BHTD.stats 照這位的等級；跟我的角色頁「黑洞裡的你」同一組數字）、一列「招式 n／N ›」（點開這位的招式清單）；
   卡冊最上面一列「天賦（全隊共用）已點亮 n／N ›」開星塵天賦樹，看完回卡冊。黑洞模組沒載入就不畫。 */
/* 11/16 黑洞新規則第三期：每位顯示本命棋子在新規則的體力／攻擊／防禦（m/07sg2-siege2.js SG2.unit，照這位的等級；同一種的兩顆子一樣），加上這位自己的靈力上限（SG2G.spMaxOf） */
/* 11/16 開發者（卡冊截圖圈數值區）「找rpg參考煙雨江湖的排版然後優化」「靈力隨著等級上升，顯示當前等級的靈力」，選單選「資源條＋攻防一行」：
   資源（體力、靈力）各一條長條、能力（攻擊力、防禦力）一行大字，細線分隔、不用灰色方塊；名稱前不再加「俥・」（上一行已寫）。
   體力條長＝這位的體力 ÷ 同等級七種棋子裡最高的（一眼看出誰耐打）；靈力寫這一級的值（SG2G.spMaxOf 隨等級長），條長＝÷ Lv100 的靈力，升級看得到條在長。
   同日開發者「攻擊力和防禦力也有bar表示 顏色幫我設計」：攻擊、防禦也各一條，條長同樣 ÷ 同等級七種棋子裡最高的；資源（體力、靈力）一組、能力（攻擊、防禦）一組，中間虛線隔開。
   四色取傳統色、彼此分得開：體力＝朱紅、靈力＝靛藍、攻擊＝琥珀金、防禦＝松石綠（色弱看不出顏色也有字和數字） */
function ptyStatHTML(c,lv){try{if(typeof SG2!=="undefined"&&typeof SG2G!=="undefined"&&SG2G.PC_OF[c]){const pc=SG2G.PC_OF[c],u=SG2.unit(pc,lv,1),sp=SG2G.spMaxOf(lv),
      U=Object.values(SG2G.PC_OF).map(p=>SG2.unit(p,lv,1)),top=k=>Math.max(...U.map(x=>x[k])),pct=(a,b)=>Math.max(4,Math.min(100,Math.round(a*100/Math.max(1,b)))),
      bar=(k,t,v,p)=>`<div class="pty-bar ${k}" role="img" aria-label="${t} ${v}"><span aria-hidden="true">${t}</span><i aria-hidden="true"><b style="width:${p}%"></b></i><em aria-hidden="true">${v}</em></div>`;
    return`<div class="pty-sv">${bar("hp","體力",u.hp,pct(u.hp,top("hp")))}${bar("sp","靈力",sp,pct(sp,SG2G.spMaxOf(100)))}<div class="pty-ad">${bar("atk","攻擊力",u.atk,pct(u.atk,top("atk")))}${bar("def","防禦力",u.def,pct(u.def,top("def")))}</div></div>`}}catch(e){}
  return ptyStatHTMLOld(c,lv)}
function ptyStatHTMLOld(c,lv){try{if(typeof BHTD==="undefined"||!BHTD.stats||!BHTD.CH||!BHTD.CH[c])return"";const S=BHTD.stats(c,lv),g=(t,v)=>`<span><small>${t}</small><b>${v}</b></span>`;
  return`<div class="pty-st">${g("靈力上限",S.sp)}${g("攻擊力",BHTD.atkPt(S.atk))}${g("防禦力",BHTD.defPt(S.def))}</div>`}catch(e){return""}}   /* 11/16 體力統一：「體力」＝這位的體力上限，陪你走的那一位就是角色卡上「體力 n／這個數」的上限（07dgl dglMx）；黑洞的靈力是上限，改叫「靈力上限」，跟人間存著的「靈力 n／20」分開 */
const ptySkPool=c=>{try{if(typeof SG2G!=="undefined")return SG2G.SK.filter(s=>s.ch===c);return typeof BHTD!=="undefined"&&BHTD.SK?BHTD.SK.filter(s=>s.ch===c):[]}catch(e){return[]}};   /* 11/16：新規則的 35 招（解鎖 1／4／8／12／16） */
/* 11/16 全隊體力（RPG 數值盤查第 4 項，開發者選「三處都用全隊體力」）：人間的體力上限、進黑洞開局的體力是同一個數（07dgl dglMx：七種棋子所屬角色的平均），卡冊最上面寫這一個數；每位的卡不再各寫各的體力，只留靈力上限、攻擊力、防禦力 */
function ptyTeamHTML(){if(typeof SG2G!=="undefined")return"";try{   /* 11/16 黑洞新規則：全隊體力拿掉（人間是定軌力、黑洞每顆子各自體力） */const mx=typeof dglMx==="function"&&typeof BHTD!=="undefined"?dglMx():0;if(!(mx>0))return"";return`<div class="pty-row top pty-team"><span>全隊體力</span><small>（人間、黑洞都是這個數）</small><b>${mx}</b></div>`}catch(e){return""}}
function ptyTalHTML(){if(typeof sg2TalCount==="function"&&typeof SG2G!=="undefined"){let n=0;try{n=sg2TalCount()}catch(e){}return`<button type="button" class="pty-row top" data-top="tal"><span>天賦</span><small>（每位最多 ${SG2G.TAL_MAX} 個）</small><b><span>已點亮</span> ${n}</b><i aria-hidden="true">›</i></button>`}   /* 11/16 每位專屬天賦（07sg2 sg2TalSheet） */
  try{if(typeof BHTD==="undefined"||!BHTD.TAL||typeof bhtdTal!=="function"||typeof bhtdDust!=="function")return"";const n=(bhtdDust().t||[]).length;
  return`<button type="button" class="pty-row top" data-top="tal"><span>天賦</span><small>（全隊共用）</small><b><span>已點亮</span> ${n}／${BHTD.TAL.length}</b><i aria-hidden="true">›</i></button>`}catch(e){return""}}
/* 這位的招式清單：學會的在前（名稱、靈力、效果），還沒學會的灰著寫幾級學會；看完回卡冊（版面沿用角色卡的技能清單 07dgl dglSkills） */
function ptySkills(c){if(typeof sheet!=="function")return;const lv=ptyLv(c),pool=ptySkPool(c).slice().sort((a,b)=>(a.lv>lv)-(b.lv>lv)||a.lv-b.lv);if(!pool.length)return;try{if(typeof dglCss==="function")dglCss()}catch(e){}ptyCss();
  let nm=c;try{nm=WX_CHARS[c].n}catch(e){}const lock=()=>{try{return typeof dglIc==="function"?dglIc("lock"):"🔒 "}catch(e){return"🔒 "}};
  sheet(nm+"的招式",b=>{b.innerHTML=`<div class="dgl-cd">${pool.map(s=>{const lk=s.lv>lv;return`<div class="dgl-ski${lk?" lk":""}"><div class="dgl-skh"><b>${lk?lock():""}${esc(s.nm)}</b><span>${lk?`Lv ${s.lv} <span>學會</span>`:`${s.cost} <span>靈</span>`}</span></div><p>${esc(s.d||"")}</p></div>`}).join("")}<p class="dgl-ks"><span>在黑洞裡使用，學會的都會帶上場</span></p><button type="button" class="btn dgl-kme" id="ptySkB">‹ 回雲河七星</button></div>`;
    b.querySelector("#ptySkB").onclick=()=>{closeSheet();setTimeout(ptySheet,60)}})}
/* 開發者 11/16「角色等級不能超過修為，這句話玩家看不懂」（選單選「直接講結果」）：不解釋規則，直接說夥伴現在最高能練到幾級、怎樣才會再往上。
   同一條規則的另外兩處一起改：卡片上練滿的註記「（到修為上限）」→「（練滿了，等你升級）」；練滿還按＋星輝的提示 →「已經跟你一樣高了，等你升級再練」 */
const ptyCapSay=(L,nd)=>L>=100?"夥伴最高練到 Lv 100":nd>0?`夥伴最高練到 Lv ${L}，你的修為再 ${nd} 點升 Lv ${L+1}，才會再往上`:`夥伴最高練到 Lv ${L}，你升級才會再往上`;
/* 11/16 開發者「要怎麼升級？」（截圖圈「練滿了，等你升級」）→ 選單「寫還差幾點＋去哪裡賺」：最上面那行寫還差幾點；有夥伴練滿時，下面多一行去哪裡賺修為＋「去下一盤」（點數同 addXP：對局贏 40 輸 15、千秋殘局 15） */
const ptyXpNd=()=>{try{const X=xpInfo();return X.L<100?Math.max(1,X.need-X.rest):0}catch(e){return 0}};
function ptyXpHow(P,L){if(L>=100||!PTY.ORDER.some(c=>PTY.has(P,c)&&PTY.lv(P,c,L)>=L))return"";
  return`<p class="pty-m pty-how">下一盤電腦（贏 +40、輸 +15）、解千秋殘局（+15）、打星門圍城，都會加修為。</p><button type="button" class="btn ghost pty-xpgo" id="ptyXpGo">♟ 去下一盤</button>`}
function ptyCardHTML(P,c,L){const C=(typeof WX_CHARS!=="undefined"&&WX_CHARS[c])||{n:c},era=typeof eraLabel==="function"&&typeof CHAR_ERA!=="undefined"?eraLabel(CHAR_ERA[c]):"";
  const img=`<img src="data/xs/prev_${c}.webp" alt="">`;
  if(!PTY.has(P,c)){const j=PTY.JOIN[c],at=j&&typeof eraLabel==="function"?eraLabel(j.st):"";const goal=P.hint&&P.hint[c]&&PTY_GOAL[c];
    return`<div class="pty-c lk">${img}<div><div class="pty-n">？？？<small>${esc(C.pc||"")}</small></div><div class="pty-m">${goal?esc(goal):`星槎停靠${esc(at)}時相遇`}</div></div></div>`}
  const lv=PTY.lv(P,c,L),x=P.m[c].xp,b0=PTY.base(lv),nd=PTY.need(lv),top=lv>=L,dn=lv>=100?1:top?Math.max(1,PTY.cap(L)-b0):nd,got=Math.max(0,Math.min(dn,x-b0)),pct=lv>=100?100:Math.max(0,Math.min(100,100*got/dn));   /* 練滿時分母＝這一級加得到的上限（PTY.cap，比升級要的少 1），條上的數字跟「滿了」「還能加」對得起來 */
  const room=Math.max(0,PTY.cap(L)-x),gsay=lv>=100?"已到最高級":!top?`還差 ${nd-got} 升 Lv ${lv+1}`:room>0?`還能加 ${room}（升 Lv ${lv+1} 要等你修為升級）`:`滿了，等你修為升 Lv ${L+1}`;   /* 11/17 開發者：金色條改成星輝條（這一級加了多少、還差多少升級） */
  const skP=ptySkPool(c),skN=skP.filter(s=>s.lv<=lv).length;   /* 11/16：招式從那一行小字搬成一列可以點的「招式 n／N ›」 */
  const tg=P.look===c?`<span class="pty-tag look">陪你走</span>`:"";
  return`<div class="pty-c" data-c="${c}">${img}<div><div class="pty-n">${esc(C.n)}<small>${esc(C.nk||"")}</small>${tg}</div>
    <div class="pty-m">${esc(C.pc||"")}・${esc(era)}・Lv ${lv}${top?(L>=100?"（練滿了）":"（練滿了，等你升級）"):""}</div><div class="pty-xpt"><span>${lv>=100?"✨ 星輝・已滿級":`✨ 星輝 ${got}／${dn}`}</span><span>${gsay}</span></div><div class="pty-xp" aria-hidden="true"><b style="width:${pct.toFixed(1)}%"></b></div></div>
    ${ptyStatHTML(c,lv)}${skP.length?`<button type="button" class="pty-row" data-a="sk"><span>招式</span><b>${skN}／${skP.length}</b><i aria-hidden="true">›</i></button>`:""}${typeof SG2G!=="undefined"&&typeof sg2TalSheet==="function"&&typeof sg2TalGet==="function"?`<button type="button" class="pty-row" data-a="tal"><span>天賦</span><b>${(sg2TalGet()[c]||[]).length}／${SG2G.TAL_MAX}</b><i aria-hidden="true">›</i></button>`:""}
    ${(a=>a?`<div class="pty-a">${a}</div>`:"")(`${top&&!room?"":`<button type="button" class="btn" data-a="give"${P.pool>0?"":" disabled"}>＋星輝</button>`}${P.look===c?"":`<button type="button" class="btn ghost" data-a="look">帶${ptyTa(c)}出門</button>`}`)}</div>`}   /* 兩顆都不用出現時（練滿了又正陪你走）不留一條空白 */
function ptySheet(){if(typeof sheet!=="function")return;const P0=ptyGet();if(!P0){try{toast("還沒有開始旅程")}catch(e){}return}ptyCss();
  sheet("🌟 雲河七星",b=>{const draw=()=>{const P=ptyGet(),L=ptyL(),sy=b.scrollTop;
    b.innerHTML=`<div class="pty-top"><span><span>你的修為</span> <b>Lv ${L}</b></span><span class="pty-pool">✨ <span>星輝</span> <b>${P.pool|0}</b></span></div><p class="pty-m pty-cap">${ptyCapSay(L,ptyXpNd())}</p>`+ptyXpHow(P,L)+ptyTeamHTML()+ptyTalHTML()+PTY.ORDER.map(c=>ptyCardHTML(P,c,L)).join("")+
      `<p class="pty-m">下棋、解題、黑洞過關得到的修為，一半自動分給隊上每一位，另一半變成星輝，由你分給想練的人。黑洞裡全隊已學會的招都會帶上場；「陪你走」是首頁上跟著你的那一位。</p>`;
    {const g=b.querySelector("#ptyXpGo");if(g)g.onclick=()=>{try{vibrate(5)}catch(e){}closeSheet();location.hash="#/cpu"}}
    {const t=b.querySelector('[data-top="tal"]');if(t)t.onclick=()=>{try{vibrate(5)}catch(e){}closeSheet();setTimeout(()=>{if(typeof sg2TalSheet==="function"&&typeof SG2G!=="undefined")sg2TalSheet(()=>ptySheet(),"‹ 回雲河七星");else bhtdTal(()=>ptySheet(),"‹ 回雲河七星")},60)}}   /* 07bht bhtdTal 第二個參數＝返回鈕的字（沒給照舊「回選關」） */
    b.querySelectorAll(".pty-c[data-c]").forEach(el=>{const c=el.dataset.c;el.querySelectorAll("[data-a]").forEach(btn=>btn.onclick=()=>{try{vibrate(5)}catch(e){}const a=btn.dataset.a;
      if(a==="sk"){closeSheet();setTimeout(()=>ptySkills(c),60);return}
      if(a==="tal"){closeSheet();setTimeout(()=>sg2TalSheet(()=>ptySheet(),"‹ 回雲河七星",c),60);return}   /* 11/16 開發者「點某個角色的天賦 只會出現那個角色的天賦描述」：每張卡的天賦只看這一位 */
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
  for(const c of L)ptyJoin(c,"ship");
  if(typeof pjcPlay==="function"&&typeof PJC_SC!=="undefined"&&PJC_SC[k]){ptyJoinCutLater(k,L,0);return}   /* 11/16 開發者 hspx「新角色夥伴加入時做一個過場動畫」：這一站有過場（m/07pjc-joincut.js）就先播，播完或略過再出加入卡 */
  ptyJoinCardLater(L,0)}
/* 過場跟加入卡一樣，先等解題結果視窗、主線電影儀式（mnfBusy）收掉再播；播完那一刻還有視窗開著，加入卡照舊排隊。加入卡只出一次 */
/* 11/17 iMac 模擬器第 12 項：殘局解開的「完美解開」結算是 07c 的卡片（#sheet），不是 .modal，以前不算在「等」裡，2.5 秒一到過場就蓋上去。
   結算卡（或任何卡片）開著就一直等、不算進 20 次，玩家按了按鈕或關掉卡片才播過場、出加入卡 */
const ptyResOpen=()=>{try{return typeof document!=="undefined"&&!!document.getElementById("sheet")}catch(e){return false}};
function ptyJoinCutLater(k,L,n){setTimeout(()=>{if(ptyResOpen())return ptyJoinCutLater(k,L,Math.max(1,n));const busy=document.querySelector(".modal")||(typeof mnfBusy==="function"&&mnfBusy());if(busy&&n<20)return ptyJoinCutLater(k,L,n+1);
  let d=0;const go=()=>{if(d)return;d=1;if(document.querySelector(".modal"))ptyJoinCardLater(L,1);else ptyJoinCard(L)};try{pjcPlay(k,L,go)}catch(e){go()}},n?1500:2500)}
function ptyJoinCardLater(L,n){setTimeout(()=>{if(ptyResOpen())return ptyJoinCardLater(L,Math.max(1,n));if(document.querySelector(".modal")&&n<20)return ptyJoinCardLater(L,n+1);ptyJoinCard(L)},n?1500:2500)}
function ptyJoinCard(L){if(typeof modal!=="function"||!L||!L.length)return;const P=ptyGet();if(!P)return;
  const nm=L.map(ptyNm).join("、"),c=L[0];
  modal(`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><h2>${esc(nm)}加入了！</h2>${L.map(x=>PTY_SAY[x]?`<p class="pl-say">${esc(ptyNm(x))}：「${esc(PTY_SAY[x])}」</p>`:"").join("")}<p class="muted">${ptyTa(L)}的招式黑洞裡就能帶；在「雲河七星」卡冊可以換陪你走的人，也可以分星輝給${ptyTa(L)}。</p>`,
    [["帶"+ptyTa(L)+"出門",()=>{if(ptySetLook(c))try{toast("🚶 "+ptyNm(c)+"陪你走了")}catch(e){}}],["好",null,true]],"prolog");   /* 11/17 iMac 模擬器第 15 項：按了沒有任何提示（要到「我的角色」才看得到換人）→ 換好就說一聲；英文在 07i18n I18N_PAT */
  const P2=ptyGet();for(const x of L)P2.seen[x]=1;ptySave(P2)}
/* ③ 起航閘門：回 null＝不擋 */
function ptySailBlock(){let P=null;try{P=ptyGet()}catch(e){}if(!P||typeof shipFront!=="function")return null;const k=shipFront();if(!k)return null;const L=PTY.pendingAt(P,k);if(!L.length)return null;
  const c=L[0],id=PTY.JOIN[c].help;if(typeof shipRec==="function"&&shipRec(k,id)){for(const x of L)ptyJoin(x,"ship");return null}   /* 題目先解過了（例如在聽書裡解的）：補加入，不擋 */
  return{k,pty:c,n:L.length}}
function ptyGateSay(N){if(typeof modal!=="function")return;const nm=N.n>1?PTY.pendingAt(ptyGet(),N.k).map(ptyNm).join("和"):ptyTa(N.pty);
  modal(`<img src="data/xs/prev_${N.pty}.webp" alt="" onerror="this.remove()"><h2>還有人困在這裡</h2><p>${esc(PTY_MEET[N.k]||"")}</p><p class="muted">先幫${esc(nm)}，星槎再起航。</p>`,[["去幫忙",()=>ptyHelpGo(N.k,N.pty)],["好",null,true]],"prolog")}
/* ④ 修為提醒 */
function ptyHintCheck(){let P=null;try{P=ptyGet()}catch(e){}if(!P)return;const L=PTY.hints(P,ptyL());if(!L.length)return;for(const c of L)P.hint[c]=1;ptySave(P);ptyHintLater(L[0],0)}
/* 11/17 Windows 測試員 D P2-4：在西市的雲河櫃坊（#/ximarket 上開的卡片）合券拿到修為，說書人「《千秋棋話》亮了一下」就蓋在櫃坊上，第一次點「合券」被擋。
   改成等玩家回到首頁或星槎主畫面（PTY_HINT_AT），而且沒有視窗、卡片、過場開著才跳；在別的頁（西市、櫃坊、對局、題目…）就一直等，不算進 20 次。
   ptyHintOk 是純判斷：h＝現在的網址 hash、busy＝有沒有東西蓋著 */
const PTY_HINT_AT=["#/","#","","#/adventure"];
function ptyHintOk(h,busy){return PTY_HINT_AT.includes(String(h==null?"":h))&&!busy}
const ptyHintBusy=()=>{try{return!!document.querySelector("#sheet,.sheet-bg,#stmOv,.mnf-ov,.bhx-ov,.dgl-o,#ulkOv,.sw7-slip,#stqPg,#mnfPg,#bhxPg")}catch(e){return false}};
function ptyHintLater(c,n){setTimeout(()=>{if(!ptyHintOk(location.hash||"",ptyHintBusy()))return ptyHintLater(c,Math.max(1,n));if(document.querySelector(".modal")&&n<20)return ptyHintLater(c,n+1);ptyHintShow(c)},n?2000:4000)}
function ptyHintShow(c){if(typeof modal!=="function"||ptyHas(c))return;const j=PTY.JOIN[c],at=j&&typeof eraLabel==="function"?eraLabel(j.st):"";
  modal(`<img src="data/actors/teller.webp" alt="" onerror="this.remove()"><h2>《千秋棋話》亮了一下</h2><p class="pl-say">說書人：「${esc(PTY_HINT[c]||"")}」</p><p class="muted">星槎停靠${esc(at)}，就能找到${PTY.JOIN[c].st==="sanguo"?"他們":"那孩子"}。</p>`,
    [["去星槎",()=>{location.hash="#/adventure"}],["之後再說",null,true]],"prolog")}
