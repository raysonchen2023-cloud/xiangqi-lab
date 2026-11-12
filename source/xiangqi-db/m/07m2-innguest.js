/* ================= 🧳 從別處路過的客人（意見回饋 826：驛站旅人只有五位，讓別處的角色也來，世界比較有流通感）=================
   驛站「🏮 路過的旅人」除了原本五位（INN），每天（照手機日期，同一天固定、換天輪替）多 2～3 位從別處路過的客人：
     園子路人 PARK_NPC（女棋手照她的家鄉朝代 era；沒有家鄉的青石園路人照 IG_PARK 的 e 列，只排到身分在那一朝說得通的驛站，雲河驛站一律可以來）、
     朝代擂主 ARENA（只在自己那一朝的驛站）、石桌往事人物 JCHAR（照 IG_J 的 e：少年時代＝元末、老年＝明）、
     雲河七星 WX_CHARS（穿越時空的孩子，哪一朝都能來，但一天最多一位、只到星槎停靠過的站；要有雲河七星的旅程，自己選的那位不算）。
     秘境棋友是要玩家自己在園子找到的秘密，不當客人。
   輪替（igToday）：種子＝日期＋站名；先抽 2 或 3 位，再從這一站的名單照種子洗牌挑；當天的雲河七星（哪一位、在哪一站）記在存檔，換站也不會變。
   棋力：照驛站旅人的做法（innRlv／INN_BAND）——每位客人一段 RLV 範圍，從範圍下緣開始，贏了強一格、輸了弱一格（記在 innAdj，鍵是 g.…）；範圍照他原本地方的難度：
     園子路人、雲河七星＝跟園子一樣以玩家修為換算（parkLv）為中心；擂主＝照擂台強度 arenaLevel；石桌往事人物＝照大廳的 JCHAR_LV；都限在驛站的 0～14 裡。
   修為：贏了 innXP(rl)，跟驛站旅人一樣（addXP「驛站」）；和棋、輸了不給。
   存檔 store "innGuest"（05b-save.js JOURNEY_KEYS 的 m_innGuest，跟存檔走）＝{r:{客人:{n 下完幾盤,w 贏,l 輸}},wx:{d 日期,e 站,c 角色}}。
   對局頁（08b-cpugame.js）用 innAnyAct／igAct 找對手的名字、立繪、3D 造型和台詞；石桌往事一次只留一盤，跟驛站旅人共用 jStart、journeyGameEnd */
const IG_ON=true;
/* 青石園路人沒有家鄉朝代：e＝身分在那一朝說得通的驛站（八段錦、代書、梆子打更、豆花攤宋以後才常見；紙鳶唐以後；遛鳥、木匠刨子明清）；w＝為什麼路過這裡 */
const IG_T2Q=["tang","wudai","song","yuan","ming","qing"],IG_S2Q=["song","yuan","ming","qing"],IG_ALL=["qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
const IG_PARK={niao:{e:["ming","qing"],w:"帶畫眉出來遛遛，走遠了，進來歇歇腳。"},duanjin:{e:IG_S2Q,w:"早上的拳打完了，走到這兒正好歇一歇。"},douhua:{e:IG_S2Q,w:"挑著豆花擔子來賣，趕路的人最愛吃一碗熱的。"},
  fengzheng:{e:IG_T2Q,w:"風箏斷了線，一路追過來的！"},mujiang:{e:["ming","qing"],w:"驛站的門板壞了，叫我來修，修好了。"},amah:{e:IG_ALL,w:"抱孫子出來走走，他在這兒睡著了。"},
  daishu:{e:IG_S2Q,w:"驛站人來人往，寫家書的生意好。"},tiaoshui:{e:IG_ALL,w:"給驛站送水，水缸挑滿了，歇一下。"},genggu:{e:IG_S2Q,w:"晚上才打更，白天出來走走。"},maihua:{e:IG_T2Q,w:"驛站來往的客人多，花好賣。"}};
/* 女棋手（家鄉朝代照 PARK_NPC 的 era）為什麼路過 */
const IG_PW={w01_tang_lady:"團扇搧累了，進來歇歇腳，順便找人下一盤。",w02_song_tea:"茶具帶在身上，走到哪裡都能點一盞。",w03_yuan_rider:"馬在槽邊喝水，我也進來歇一下。",w04_ming_scholar:"小生……出門遊學，路過貴寶地，借個座位。",
  w05_qing_gege:"噓——府裡的人找不到這兒來吧？",w06_swordswoman:"趕路累了，劍擱一邊，下盤棋再走。",w07_fisher_girl:"送魚到驛站的廚房，順路找人下棋。",w08_embroider:"送繡品進城，在這兒等車。",
  w09_qin_player:"琴弦受了潮，借驛站的爐火烘一烘。",w10_general:"隊伍在外頭歇馬，本將軍進來喝口水。",w11_yuan_falconer:"我的鷹停在驛站屋頂上，我在底下等牠。",w12_yuan_merchant:"駱駝隊在驛站換水，明天一早才走。",
  w13_yuan_singer:"戲班子趕下一個碼頭，在這兒歇一晚。",w14_yuan_porcelain:"送一批青花碗上路，順便歇歇手。",w15_yuan_archer:"出來打獵，弓先掛在門口。",w16_ming_poet:"出門踏青找詩句，走著走著就到了驛站。",
  w17_ming_pipa:"應邀去別處彈曲，路上在這兒歇腳。",w18_ming_doctor:"來給驛卒看病，看完了，正好下一盤。",w19_ming_teahouse:"來看看別人家的驛站怎麼招呼客人。",w20_ming_guard:"辦案路過，在驛站歇腳。"};
/* 擂主（只在自己那一朝的驛站） */
const IG_CW={classic:"五十年沒離開過那張石桌……今天破例，出來走走。",qin:"烽火台換崗，老兵下來走走。",han:"出宮辦差，在驛站換馬。",sanguo:"行軍路過，東風還沒來，先下一盤。",weijin:"酒喝完了，來驛站再打一壺。",
  nanbei:"雲遊到此，借驛站一席歇腳。",sui:"船靠岸了，上來歇一歇再開船。",tang:"出城賞花，回程在驛站歇腳。",wudai:"下山買紙墨，路過驛站。",song:"茶坊今天歇業，出來找人鬥棋。",yuan:"騎馬出來，在驛站換馬。",
  ming:"告了幾天假，出城走走。",qing:"園子待悶了，出來看看外面的棋。"};
/* 石桌往事人物：e＝故事裡的年代（少年時代是元末至正年間、柳寒舟老年是明永樂；老艄公、江南書生故事沒寫年代，元末明初都排） */
const IG_J={liu_young:{e:["yuan"],w:"渡船靠岸了，我上來找人下棋！"},shen_young:{e:["yuan"],w:"聽濤樓的活幹完了，出來走走。"},agula_young:{e:["yuan"],w:"跟著父親的隊伍路過，馬在外頭吃草。"},
  boatman:{e:["yuan","ming"],w:"渡口沒客人，上岸來歇歇腿。"},scholar:{e:["yuan","ming"],w:"遊學路過，借一盤棋論論理。"},liu_old:{e:["ming"],w:"撐傘走了很遠的路，進來避一避。"}};
/* 雲河七星：哪一朝都能來（一天最多一位） */
const IG_XW={x_swordboy:"星槎靠岸補水，我下來走走。這條路是直的，就走到這兒了。",x_spiritgirl:"星槎靠岸了。大家去逛，我先來驛站把茶燒上。",x_martialgirl:"星槎靠岸了！我先溜下來，找人下一盤炮的棋！",
  x_miaogirl:"星槎一靠岸，我就先跑來驛站——我從小在驛站長大，聞到馬廄的味道就知道到了！",x_shuai:"星槎靠岸，城子讓我下來走幾步。……我走到這裡了。",x_shi:"方庭在船上歇著，我先下來看看路好不好走。",x_bing:"星槎靠岸，我幫大家跑腿送東西，送完了，歇一下！"};
const IG_XPC={帥:"將",仕:"士",相:"象",俥:"車",傌:"馬",炮:"砲",兵:"卒"};
const igDay=()=>{const d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
const igRnd=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return()=>{h=(h+0x6D2B79F5)>>>0;let t=Math.imul(h^h>>>15,1|h);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const igData=()=>{const o=store.get("innGuest",null);return o&&typeof o==="object"?o:{}};
/* 範圍：c＝中心 RLV，往下 2 格、往上 1 格，限在驛站的 0～14 */
const igBand=c=>{c=Math.max(2,Math.min(13,Math.round(c)));return[c-2,Math.min(14,c+1)]};
const igParkC=()=>{let L=2;try{L=parkLv()}catch(e){}return 3*(L-1)};
/* 一位客人（gid＝g.類型.代號；n 園子路人、c 擂主、j 石桌往事人物、x 雲河七星）；k＝站（「從○○路過」要看站） */
function igMake(gid,k){const m=/^g\.([ncjx])\.(\w+)$/.exec(String(gid||""));if(!m)return null;const t=m[1],id=m[2];k=k||store.get("era","classic");
  const q=s=>"「"+s+"」";let g=null;
  if(t==="n"){const n=PARK_NPC.find(z=>z.id===id);if(!n)return null;const w=n.era?IG_PW[id]:(IG_PARK[id]||{}).w;if(!w)return null;
    g={name:n.name,ic:"🍃",pc:n.pc,img:`data/npc/${id}.webp`,hi:n.say,win:n.win,lose:n.lose,draw:OPT_NDRAW[id],why:w,from:"從"+parkName(n.era||k)+"路過",band:igBand(igParkC()),age:AGE["n:"+id],look:s=>NPC_LOOK(n,s)}}
  else if(t==="c"){const A=ARENA[id];if(!A||!IG_CW[id])return null;let L=3;try{L=arenaLevel(id)}catch(e){}
    g={name:A.name,ic:"🏯",pc:(CHAMP_PC[id]&&PC_CH.b[CHAMP_PC[id]])||"將",img:`data/champ/${id}_idle.webp`,hi:A.hi,win:A.win,lose:A.lose,draw:OPT_CDRAW[id],why:IG_CW[id],from:"從"+(id==="classic"?"青石園":eraLabel(id))+"的擂台路過",band:igBand(Math.min(14,3*(L-1))),age:AGE["c:"+id],look:s=>CHAMP_LOOK(id,s)||{p:s==="r"?"帥":"將",e:id,g:9}}}
  else if(t==="j"){const J=JCHAR[id];if(!J||!IG_J[id])return null;
    g={name:J.name,ic:"🪨",pc:J.pc,img:`data/journey/char_${id}_idle.webp`,hi:J.hi,win:J.win,lose:J.lose,draw:OPT_JDRAW[id],why:IG_J[id].w,from:"從石桌往事的雲河鎮路過",band:igBand(3*((JCHAR_LV[id]||3)-1)),age:AGE["j:"+id],look:s=>JCHAR_LOOK(id,s)}}
  else if(t==="x"){const C=WX_CHARS[id];if(!C||!IG_XW[id])return null;const pc=IG_XPC[C.pc]||"將",f0=x=>Array.isArray(x)?x[0]:x;
    g={name:C.n,ic:"⛵",pc,img:`data/xs/prev_${id}.webp`,hi:f0(C.start)||C.say,win:f0(C.win),lose:f0(C.lose),draw:f0(C.draw),why:IG_XW[id],from:"從雲河星槎路過",band:igBand(igParkC()),wx:1,
      look:s=>({p:npcPc({pc},s),e:store.get("era","classic"),g:9,npc:C.n,about:C.say,hat:"hair",hc:"#1E1A16",robe:"#6B7C6A",cus:"x:"+id.slice(2),...(TRIPO[id]?{glb:`data/tripo_app/${id}.glb`,ring:TRIPO[id]}:{}),flat:true,sprite:"data/xs/",spriteMeta:{w:300,h:400},spriteMap:{idle:"prev_"+id,think:"prev_"+id,move:"prev_"+id,happy:"prev_"+id,sad:"prev_"+id,surprise:"prev_"+id}})}}
  if(!g)return null;g.gid=gid;g.id=id;g.t=t;g.say=q(g.hi);g.why=q(g.why);return g}
/* 這一站可能來的客人（不含雲河七星） */
function igPool(k){const L=[];
  const igUnmetRare=n=>{try{return typeof npcRk==="function"&&npcRk(n)!=="common"&&!((typeof npcBonds==="function"?npcBonds():{})[n.id]||{}).m}catch(e){return false}};   /* 回饋 856（開發者 11/9 選「沒遇過的不來驛站」）：稀有、傳說的女棋手要先在園子遇過，才會路過驛站 */
  for(const n of PARK_NPC){if(n.era&&igUnmetRare(n))continue;if(n.era?n.era===k&&IG_PW[n.id]:IG_PARK[n.id]&&(k==="classic"||IG_PARK[n.id].e.includes(k)))L.push("g.n."+n.id)}
  if(ARENA[k]&&IG_CW[k])L.push("g.c."+k);
  for(const j in IG_J)if(JCHAR[j]&&IG_J[j].e.includes(k))L.push("g.j."+j);
  return L}
/* 今天的雲河七星客人：要有雲河七星的旅程，自己選的那位不來；六成的日子有一位，挑一站星槎停靠過的站。當天定了就記在存檔，起航多開一站也不會換 */
function igWxToday(){const day=igDay(),D=igData();if(D.wx&&D.wx.d===day)return D.wx;let w={d:day,e:null,c:null};
  try{const J=store.get("journey",null),me=J&&WX_CHARS[J.c]?J.c:"";if(me){const r=igRnd(day+"|wx"),ks=Object.keys(IG_XW).filter(c=>c!==me&&WX_CHARS[c]),ok=r()<.6,c=ks[Math.floor(r()*ks.length)],
    st=SHIP_ROUTE.filter(e=>!eraLocked(e)),e=st[Math.floor(r()*st.length)];if(ok&&c&&e)w={d:day,e,c}}}catch(e){}
  store.set("innGuest",{...D,wx:w});return w}
/* 今天這一站的客人（gid 陣列）：2 或 3 位；雲河七星今天停在這一站就佔一位 */
/* 有自己朝代的人（女棋手、擂主、石桌往事人物）抽中的機會是青石園路人的 3 倍；各朝驛站一天最多一位青石園路人（雲河驛站本來就是他們的園子，不限） */
const igGen=(g,k)=>k!=="classic"&&/^g\.n\./.test(g)&&!(PARK_NPC.find(z=>"g.n."+z.id===g)||{}).era;
function igToday(k){if(!IG_ON||!k)return[];const day=igDay(),r=igRnd(day+"|"+k),n=r()<.5?2:3,P=igPool(k).map(g=>[g,Math.pow(r(),1/(igGen(g,k)?1:3))]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  const w=igWxToday(),out=w.e===k&&w.c?["g.x."+w.c]:[];let gn=0;for(const g of P){if(out.length>=n)break;if(igGen(g,k)){if(gn)continue;gn++}out.push(g)}return out}
const igIds=k=>igToday(k),igCount=k=>igToday(k).length;
/* 現在的強度（驛站旅人的 innRlv 做法：記過的就用記的，沒有就從範圍下緣開始） */
function igRlv(g){const B=g.band,v=store.get("innAdj",{})[g.gid];return Math.max(B[0],Math.min(B[1],Number.isInteger(v)?v:B[0]))}
const igLvN=g=>{const b=g.band[0];return b<1?1:b<3?2:b<6?3:b<10?4:5};
const igRec=g=>((igData().r||{})[g.gid])||null;
function igRow(g){const R=igRec(g);return`<button class="item" data-inn="${g.gid}"><span class="lb" style="font-size:24px"><img src="${g.img}" alt="" style="width:40px;height:48px;object-fit:contain" onerror="this.replaceWith(document.createTextNode('${g.ic}'))"></span><span class="tx"><b>${esc(g.name)}</b><span>第 ${igLvN(g)} 級${R&&R.n?`・下過 ${R.n} 盤，贏 ${R.w||0} 盤`:""}</span><span style="font-size:12px;opacity:.75">🧳 ${esc(g.from)}</span></span><span class="muted">›</span></button>`}
function igRows(k){try{return igToday(k).map(id=>igMake(id,k)).filter(Boolean).map(igRow).join("")}catch(e){return""}}
/* 對局頁用：驛站的對手（原本的旅人、秘境棋友，或今天路過的客人） */
function igAct(j){const s=String(j||"");if(!s.startsWith("inn:g."))return null;return igMake(s.slice(4))}
function innAnyAct(j){return innActor(j)||igAct(j)}
const innLook=(a,side)=>a.look?a.look(side):ACTOR_LOOK(a.id,side);
function igStart(g){const rl=igRlv(g);store.set("innCur",{id:g.gid,rl});
  jStart("inn:"+g.gid,{human:"r",level:Math.max(1,Math.min(6,1+Math.floor(rl/3))),rlv:rl,journey:"inn:"+g.gid},()=>{location.hash="#/journey/play";setTimeout(()=>toast(`${g.ic} ${g.name}：${g.say}`),500)})}
function igBind(v,k){v.querySelectorAll('[data-inn^="g."]').forEach(b=>b.onclick=()=>{const g=igMake(b.dataset.inn,k);if(!g)return;vibrate(5);const R=igRec(g);
  sheet(`${g.ic} ${g.name}`,c=>{c.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:6px"><img src="${g.img}" alt="" style="width:64px;height:84px;object-fit:contain;flex:none" onerror="this.remove()"><div><p class="muted" style="margin:0 0 2px;font-size:13px">🧳 ${esc(g.from)}</p><p style="font-size:16px;line-height:1.8;margin:0">${esc(g.why)}</p></div></div>${g.wx?"":`<p class="muted" style="margin:0 0 2px">${esc(innCall(g))}</p>`}<p style="font-size:16px;line-height:1.8;margin:0 0 4px">${esc(g.say)}</p>${ageLine(g.age)}<p class="muted">第 ${igLvN(g)} 級${R&&R.n?`・下過 ${R.n} 盤，贏 ${R.w||0} 盤、輸 ${R.l||0} 盤`:""}・今天路過，明天就不一定在了</p><button class="btn" id="igGo" style="width:100%">⚔ 下一盤</button>`;
    c.querySelector("#igGo").onclick=()=>{closeSheet();igStart(g)}})})}
/* 再下一盤（jAgain）：同一位客人、調整後的強度 */
function igAgainArgs(j,dx){const g=igAct(j);if(!g)return null;const rl=igRlv(g);store.set("innCur",{id:g.gid,rl});return{human:"r",level:Math.max(1,Math.min(6,1+Math.floor(rl/3))),rlv:rl,journey:j,dx}}
/* 下完（journeyGameEnd 的驛站分支找不到旅人時轉來這裡）：輸贏調強度、記戰績、贏了給修為 */
function igGameEnd(st,P){const g=igAct(P.id);if(!g)return;const C=store.get("innCur",null),rl=C&&C.id===g.gid&&Number.isInteger(C.rl)?C.rl:igRlv(g),B=g.band,A=store.get("innAdj",{}),won=st.result.w===st.human,lost=!!st.result.w&&!won;
  if(won)A[g.gid]=Math.min(B[1],rl+1);else if(lost)A[g.gid]=Math.max(B[0],rl-1);store.set("innAdj",A);
  const D=igData(),R=D.r||{},o=R[g.gid]||{n:0,w:0,l:0};o.n++;if(won)o.w++;if(lost)o.l++;R[g.gid]=o;store.set("innGuest",{...D,r:R});
  if(won){addXP(innXP(rl),"驛站","inn:"+st.id);setTimeout(()=>toast(`${g.ic} ${g.name}：「${g.lose}」`),1500)}
  else setTimeout(()=>toast(`${g.ic} ${g.name}：「${lost?g.win:g.draw||"和棋，改天再下一盤。"}」`),1500)}
