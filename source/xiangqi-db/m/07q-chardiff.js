/* ================= 🌟 選角差異化（意見回饋 774，開發者 11/8 從 Gemini 十案選定 1、9、4、7、3、5、8（第 2 案七星論棋開發者看過後刪除）；提問 story/gemini_app/29_選角差異化十案.md）=================
   原則：線上對戰一律公平——這裡的東西只影響單機內容、收藏、故事、本機顯示；不加新貨幣、不做每日登入、不讓角色變強。
   每案一個開關 CHDn_ON；存檔一個鍵 store "chd"（JOURNEY_KEYS 的 m_chd，跟存檔走）：
     {op:{角色:{n 次數,done 完成時間,g:[遊戲 id…]}}, seal:{朝代:{c 角色,at}}, egg:{角色:{at,k 戰役}}, root:{角色:at}, home:{朝代:{r 讀信時間}}, form 本命化形開關（0 關，預設開）}
   文案：CHD_TXT（定稿於 11/8，分身助手照定稿小說與寫正文檢查清單寫；egg 的依據列在 src，送史學顧問核對）。
   1 本命絕殺簿（CHD1_ON）：07o-shipmore.js 續一、續二打開時，前兩題改挑「本命子」殺法題（chdMorePick；tags.json 標籤＋解法裡本命子動了幾步、最後一步是誰），第 3 題照原本站的棋理挑；
     組裡記 bm:[1,1,0]、c 角色；換一題時本命格換成本命題（chdMoreSwap）；星光小字寫殺法（chdMoreName）；解開本命題，角色說一句（chdMoreDone，CHD_TXT[c].bm）。 */
const CHD1_ON=true;
const chdSt=()=>store.get("chd",{})||{};
function chdSet(f){const S=chdSt();try{f(S)}catch(e){console.warn(e)}store.set("chd",S);return S}
const chdMe=()=>{try{return typeof myChar==="function"?myChar():""}catch(e){return""}};
const chdT=c=>(typeof CHD_TXT!=="undefined"&&CHD_TXT[c])||null;
const chdNk=c=>{const C=(typeof WX_CHARS!=="undefined"&&WX_CHARS[c])||null;return C?(C.nk||C.n):""};
const chdOne=(a,seed)=>!a||!a.length?"":a[Math.floor((seed==null?Math.random():cjRand(seed)())*a.length)%a.length];
const chdFace=c=>`<img src="data/xs/prev_${c}.webp" alt="" class="chd-face" onerror="this.remove()">`;
function chdCss(){if(typeof document==="undefined"||document.getElementById("chdCss"))return;const s=document.createElement("style");s.id="chdCss";s.textContent=`
.chd-say{display:flex;gap:10px;align-items:center;margin:8px 0;padding:8px 10px;border-radius:12px;background:rgba(200,150,46,.10);border:1px solid rgba(200,150,46,.45);line-height:1.6;font-size:15px}
.chd-say .chd-face{flex:none;width:44px;height:58px;object-fit:cover;object-position:top;border-radius:8px;background:var(--bg)}
.chd-say b{display:block;font-size:12.5px;color:#9A6B12}
.chd-bm{display:inline-block;padding:0 6px;margin-left:4px;border-radius:99px;background:#C8962E;color:#fff;font-size:11.5px;font-weight:700;vertical-align:1px}
.chd-letter{padding:12px 14px;border-radius:10px;background:#FBF4E4;color:#2a2018;border:1px solid #D9C59A;font-family:var(--serif);font-size:15.5px;line-height:1.9}.chd-letter p{margin:0 0 8px}.chd-letter p:last-child{text-align:right;margin:0}
.chd-home{position:absolute;right:10px;top:10px;z-index:4;padding:4px 10px;border-radius:99px;background:rgba(200,150,46,.92);color:#fff;font:700 13px/1.3 var(--serif,serif);box-shadow:0 2px 6px rgba(0,0,0,.3);pointer-events:none}
.chd-chal{display:flex;gap:10px;align-items:flex-start;margin:0 0 10px;padding:10px 12px;border-radius:12px;border:1.5px dashed #C8962E;background:rgba(200,150,46,.08);cursor:pointer}
.chd-chal input{width:22px;height:22px;flex:none;margin:2px 0 0;accent-color:#C8962E}.chd-chal b{display:block;font-size:14.5px}.chd-chal small{display:block;font-size:12.5px;line-height:1.55;color:var(--muted)}
.chd-shine .seal-st{position:relative;overflow:hidden;box-shadow:0 0 0 2px #E8C462,0 0 12px rgba(232,196,98,.85)}
.chd-shine .seal-st::after{content:"";position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 40%,rgba(255,240,190,.85) 50%,transparent 60%);animation:chdShine 2.4s ease-in-out infinite}
@keyframes chdShine{from{transform:translateX(-60%)}to{transform:translateX(60%)}}@media (prefers-reduced-motion:reduce){.chd-shine .seal-st::after{animation:none;opacity:.35}}
.chd-end{position:fixed;inset:0;z-index:8800;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,6,2,.72);animation:rfxIn .25s ease-out both}.chd-end.out{opacity:0;transition:opacity .2s}
.chd-ec{width:100%;max-width:400px;max-height:92vh;overflow:auto;padding:16px 16px 14px;border-radius:16px;background:#FBF4E4;color:#2a2018;border:2px solid #C8962E;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.chd-eh{display:flex;gap:10px;align-items:center}.chd-eh img{width:58px;height:76px;object-fit:cover;object-position:top;border-radius:10px;background:#EFE3C8;flex:none}
.chd-eh small{display:block;font-size:12.5px;color:#8a6a3a}.chd-eh b{display:block;font:900 22px/1.3 var(--serif,serif);color:#7A2E1A}
.chd-ex{margin:12px 0 10px;font-family:var(--serif,serif);font-size:16px;line-height:1.9}
.chd-ei{display:flex;gap:10px;align-items:center;padding:10px;border-radius:12px;background:rgba(200,150,46,.12);border:1px dashed #C8962E}.chd-ei p{margin:0;font-size:15px;line-height:1.75}
.chd-sil{width:72px;height:96px;flex:none;object-fit:contain;filter:grayscale(1) brightness(.32) contrast(1.4);opacity:.85;transition:filter .9s ease,opacity .9s ease,transform .9s ease}
.chd-sil.lit{filter:none;opacity:1;transform:scale(1.08)}
.chd-eb{display:flex;flex-direction:column;gap:8px;margin-top:12px}.chd-eb .btn{width:100%;margin:0}
.chd-root{display:block;width:100%;text-align:left;margin:0 0 10px;padding:10px 12px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:inherit;font:inherit;cursor:pointer}
.chd-root.full{border-color:#C8962E;box-shadow:0 0 0 1px #C8962E inset}.chd-rh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.chd-rh span{font-size:13px;color:var(--accent);font-weight:700}
.chd-rg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:8px 0 6px}.chd-rg i{aspect-ratio:1;border-radius:8px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:16px;background:var(--bg);overflow:hidden}.chd-rg i.no{opacity:.45}
.chd-rpic{margin:0 auto 8px;max-width:340px;border-radius:14px;overflow:hidden;border:2px solid #C8962E}.chd-rpic img{display:block;width:100%;height:auto}.chd-rpic img.fb{max-width:220px;margin:0 auto}`;document.head.append(s)}

/* ---------- 1 本命絕殺簿 ---------- */
/* pc＝本命子（紅方字母，黑方照大寫比）；tags＝tags.json 裡算「本命殺法」的標籤；kill＝題目 kill 欄位；combo＝[標籤, 標籤或 kill, 星光上的字]；nm＝沒有標籤時星光上的字；
   fb＝本命題不夠時的備用標籤（只給 4 分，排在真的本命題後面）：一盞茶題庫裡相動到的題只有 2 題、仕 14 題（守和題都在消寒圖、星槎題組裡，被 cjReserved 擋掉），相、仕放寬成「安靜一手」，帥放寬成「以少勝多」 */
const CHD_BM={x_swordboy:{pc:"R",tags:["雙車錯","車殺"],kill:["雙車錯","車殺"],combo:[["首俥","棄子","棄車開路"]],nm:"俥"},
  x_spiritgirl:{pc:"B",tags:["守和","首相"],kill:[],combo:[],fb:["安靜一手"],nm:"相"},
  x_martialgirl:{pc:"C",tags:["重炮","悶宮","炮殺"],kill:["重炮","炮殺"],combo:[],nm:"炮"},
  x_miaogirl:{pc:"N",tags:["臥槽馬","掛角馬","馬殺","馬後炮"],kill:["臥槽馬","掛角馬","馬殺","馬後炮"],combo:[],nm:"傌"},
  x_shuai:{pc:"K",tags:["首帥"],kill:[],combo:[],fb:["以少勝多"],nm:"帥"},
  x_shi:{pc:"A",tags:["首仕","解殺"],kill:[],combo:[],fb:["安靜一手"],nm:"仕"},
  x_bing:{pc:"P",tags:[],kill:["小兵擒王"],combo:[["首兵","兵卒","小兵擒王"]],nm:"兵"}};
/* 把解法主線走一遍：每一步是哪顆子（大寫）、是不是玩家走的、有沒有吃子 */
function chdLine(P){const out=[];try{const rows=String(P.fen||"").split(" ")[0].split("/"),B={};
    rows.forEach((row,i)=>{let c=0;for(const ch of row){if(/\d/.test(ch)){c+=+ch;continue}B[c+","+(9-i)]=ch;c++}});
    (P.line||[]).forEach((mv,i)=>{if(!mv||mv.length<4)return;const f=mv.charCodeAt(0)-97+","+mv[1],t=mv.charCodeAt(2)-97+","+mv[3],p=B[f];if(!p)return;out.push({pc:p.toUpperCase(),me:i%2===0,cap:!!B[t],cp:String(B[t]||"").toUpperCase()});B[t]=p;delete B[f]})}catch(e){}return out}
/* 這題跟本命子有多相關：s 分數（≥4 才算本命題）、nm 星光小字 */
function chdBmInfo(c,P,T){const B=CHD_BM[c];if(!B||!P)return{s:0,nm:""};const tp=(T&&T[P.id])||[],mv=chdLine(P),mine=mv.filter(m=>m.me),pn=WX_CHARS[c].pc;
  const tag=tp.find(t=>B.tags.includes(t))||(B.kill.includes(P.kill)?P.kill:"")||((B.combo.find(x=>tp.includes(x[0])&&(tp.includes(x[1])||P.kill===x[1]))||[])[2]||"");
  const first=!!(mine[0]&&mine[0].pc===B.pc),used=mine.filter(m=>m.pc===B.pc).length,last=!!(mine.length&&mine[mine.length-1].pc===B.pc),caps=mine.filter(m=>m.pc===B.pc&&m.cap).length,guard=B.pc==="B"||B.pc==="A";
  const s=(tag?5:0)+(first?3:0)+Math.min(2,used)+(last?2:0)+(guard?Math.min(2,used):0)+(caps?1:0);
  let nm=tag?(/^首/.test(tag)?tag.slice(1)+"的妙著":tag):last?pn+"的絕殺":B.pc==="K"&&used?"出帥助攻":first?pn+"先手":used?pn+"助攻":"";
  if(s<4&&B.fb){const f=tp.find(t=>B.fb.includes(t));if(f)return{s:4,nm:f}}return{s,nm}}
const chdBmOk=x=>x&&x.s>=4;
/* 續局一組：前兩格本命題、第 3 格照本站棋理（07o-shipmore.js shipMoreOpen 呼叫；沒選角色或關掉＝null，照原本挑） */
function chdMorePick(k,pool,T,band,seed){if(!CHD1_ON)return null;const c=chdMe();if(!c||!CHD_BM[c])return null;
  const dist=P=>{const d=+P.d||0;return d<band[0]?band[0]-d:d>band[1]?d-band[1]:0};
  const bm=pool.map(P=>[chdBmInfo(c,P,T),P]).filter(x=>chdBmOk(x[0])).map(x=>[x[0].s-1.5*dist(x[1])+cjRand(seed+"|bm|"+x[1].id)()*.8,x[1]]).sort((a,b)=>b[0]-a[0]).slice(0,2).map(x=>x[1]).sort((a,b)=>(+a.d||0)-(+b.d||0));
  const ids=new Set(bm.map(P=>P.id)),rest=shipMorePickN(k,pool.filter(P=>!ids.has(P.id)),T,band,SHIP_PER-bm.length,seed);
  const L=bm.concat(rest.sort((a,b)=>(+a.d||0)-(+b.d||0))).map(P=>P.id);return{L,bm:L.map((id,i)=>i<bm.length?1:0),c}}
/* 換一題：本命那一格換成另一題本命題（同難度往下半階）；不是本命格回 null */
function chdMoreSwap(k,G,i,pool,T,band,seed){if(!CHD1_ON||!G||!G.bm||!G.bm[i]||!CHD_BM[G.c])return null;
  const c=G.c,mid=(band[0]+band[1])/2,L=pool.map(P=>[chdBmInfo(c,P,T),P]).filter(x=>chdBmOk(x[0])).map(x=>[x[0].s-1.5*Math.abs((+x[1].d||0)-mid)+cjRand(seed+"|"+x[1].id)()*.8,x[1]]).sort((a,b)=>b[0]-a[0]);
  return L.length?L[0][1]:null}
const chdMoreBm=(k,g,i)=>{if(!CHD1_ON)return"";const G=typeof shipMoreGroup==="function"?shipMoreGroup(k,g):null;return G&&G.bm&&G.bm[i]&&CHD_BM[G.c]?G.c:""};
/* 星光上的小字（本命格）：「本命・臥槽馬」 */
function chdMoreName(k,g,i,P,T){const c=chdMoreBm(k,g,i);if(!c)return"";const x=chdBmInfo(c,P,T);return"本命・"+(x.nm||WX_CHARS[c].pc)}
/* 解題頁標題後面的小籤 */
function chdMoreTag(k,w){if(!w||w.r)return"";const c=chdMoreBm(k,w.g,w.i);return c?`<span class="chd-bm">本命${esc(WX_CHARS[c].pc)}</span>`:""}
/* 解開本命題（不看答案）：角色說一句 */
function chdMoreDone(k,id,o,ans){if(ans||!o||!o.g)return"";const G=shipMoreGroup(k,o.g),i=G&&G.L?G.L.indexOf(id):-1,c=i>=0?chdMoreBm(k,o.g,i):"",T=c&&chdT(c);if(!T)return"";chdCss();
  return`<div class="chd-say">${chdFace(c)}<span><b>${esc(chdNk(c))}・本命絕殺簿</b>「${esc(chdOne(T.bm,id))}」</span></div>`}

/* ---------- 9 雲河尋根（CHD9_ON）----------
   珍品冊（07-legend.js relicBook）最上面多一段「〇〇的尋根」：從現有 130 件珍品挑 7 件跟這位角色的朝代、身世有關的（CHD_ROOT＝[朝代, 珍品 id, 為什麼]），
   7 件都收到＝解鎖一張角色插畫 data/chdroot/<角色>.webp（Gemini 畫，tools/art_chdroot.json；定稿前在 park/chdroot，沒有圖就先用選角立繪）和 CHD_TXT[c].root 一段話。
   只看目前選的角色；收珍品的方法照舊（園子、渡口、戰役……），不加掉寶率。解鎖時間記在 chd.root[角色]。 */
const CHD9_ON=true;
const CHD_ROOT={
  x_swordboy:[["qin","qin_chariot","四匹馬拉的車，他爹趕了一輩子的就是車"],["qin","qin_zhaoban","刻著統一度量衡的詔書；「車同軌」也是同一年下的令"],["qin","qin_quan","官府的標準秤錘，運官糧要過秤"],["qin","qin_banliang","秦統一的錢，車夫的腳錢就是半兩錢"],["qin","qin_bamboo","睡虎地秦簡記著秦律，誤了期要受罰"],["qin","qin_crossbow","秦軍零件一樣大小、可以互換，跟車同軌同一個道理"],["qin","qin_terracotta","陪葬坑裡也有戰車與馭手俑"]],
  x_spiritgirl:[["nanbei","nanbei_compass","祖沖之重造的指南車：怎麼轉彎都指著同一個方向，像在等人回家"],["nanbei","nanbei_suanchou","祖沖之就是她那個劉宋年間的人"],["nanbei","nanbei_oxcart","南朝人出門坐牛車，渡口天天看得到"],["nanbei","nanbei_bixie","南京一帶南朝陵墓前的石獸，就在長江南岸"],["nanbei","nanbei_lotuszun","南朝的青瓷，茶棚裡最體面的器物也是青瓷"],["nanbei","nanbei_helmet","北魏南下、飲馬長江的那一年，渡口全是逃難的人"],["weijin","weijin_chickenpot","兩晉南北朝流行的青瓷雞首壺，倒茶倒水都用得到"]],
  x_martialgirl:[["classic","classic_lantern","她是在臨安元宵夜上船的"],["song","song_fish","記下指南魚的《武經總要》，也記下了火藥的配方"],["yuan","yuan_huochong","火藥後來裝進了銅管——跟爆竹是同一家的親戚"],["song","song_jianzhan","臨安人愛鬥茶，黑盞最襯白沫"],["song","song_cuju","臨安街頭最熱鬧的玩意兒"],["song","song_shenbi","宋人守城的強弩，跟炮一樣講究「隔得遠也打得到」"],["song","song_qingming","爺爺那一輩口中的汴京繁華"]],
  x_miaogirl:[["yuan","yuan_paizi","驛站認牌不認人：使者拿著牌子才換得到馬"],["yuan","yuan_bow","驛騎背上的角弓，老駱年輕時也背過"],["yuan","yuan_gaozu","騎在馬上也能喝的高足杯"],["yuan","yuan_baochao","馬可・波羅沿著驛道走，看見人們拿紙當錢"],["yuan","yuan_nasij","驛道上運來運去的金錦"],["yuan","yuan_qinghua","西域來的鈷料——跟她帽頂那顆紅琉璃珠一樣，是商隊帶來的"],["han","han_flyinghorse","一匹跑得比飛鳥還快的馬，她的本命子就是傌"]],
  x_shuai:[["wudai","wudai_longwei","歙硯出自婺源龍尾山，明朝時就在徽州府"],["wudai","wudai_liting","李廷珪在歙州造墨，徽墨從這裡開始"],["ming","ming_zisha","院子裡泡茶的紫砂壺"],["ming","ming_chair","明式圈椅：他在院子裡讀書時坐的就是這種"],["ming","ming_xuande","當鋪櫃上最常見、也最難辨真假的寶貝"],["ming","ming_dadian","關在院子裡，書就是他的窗"],["ming","ming_crown","他上船那年正是萬曆十年，這頂金冠出自萬曆皇帝的定陵"]],
  x_shi:[["ming","ming_langxian","戚繼光的兵拿狼筅擋在前面——跟他一樣是擋刀的"],["sui","sui_armor","胸前兩塊護鏡的明光鎧，護人先護心"],["ming","ming_jigang","母雞護著小雞——他從小就是這樣護著方庭"],["ming","ming_baochuan","他其實很想去遠方看看"],["ming","ming_yongle","跟著寶船漂洋過海的錢"],["classic","classic_abacus","當鋪掌櫃的兒子，算盤聲從小聽到大"],["ming","ming_cloisonne","當鋪櫃上收過的明朝器物"]],
  x_bing:[["qing","qing_qianlong","跑一趟腿賺幾文乾隆通寶"],["sui","sui_canalboat","揚州就在大運河邊，漕船天天從碼頭經過"],["classic","classic_xiangqi","她懷裡那塊破布，繡著半個「卒」字"],["qing","qing_snuff","揚州城裡替人送的小貨"],["qing","qing_dingdai","乾隆南巡那年，揚州滿街都是戴頂戴的官"],["qing","qing_ruyi","南巡時人們獻上的吉祥物"],["qing","qing_clock","大戶人家會自己報時的西洋鐘"]]};
const chdRootImg=c=>`<img src="data/chdroot/${c}.webp" alt="" onerror="this.onerror=null;this.src='data/xs/prev_${c}.webp';this.classList.add('fb')">`;
function chdRootHTML(R,mine){if(!CHD9_ON)return"";const c=chdMe(),L=CHD_ROOT[c];if(!L)return"";chdCss();const has=([e,id])=>(mine[e]||[]).includes(id),n=L.filter(has).length,full=n>=L.length,C=WX_CHARS[c];
  if(full&&!(chdSt().root||{})[c])chdSet(S=>{(S.root=S.root||{})[c]=Date.now()});
  return`<button class="chd-root${full?" full":""}" id="chdRoot"><span class="chd-rh"><b>🌿 ${esc(C.n)}的尋根</b><span>${n}／${L.length}${full?"・插畫已解鎖":""}</span></span>
    <span class="chd-rg">${L.map(x=>{const it=(R[x[0]]||[]).find(z=>z.id===x[1]),g=has(x);return`<i class="${g?"":"no"}">${g?relicImg(x[0],x[1]):"？"}</i>`}).join("")}</span>
    <span class="muted" style="font-size:12.5px">${full?"七件都找到了，點開看${esc(chdNk(c))}的插畫。":"跟"+esc(chdNk(c))+"的家鄉、身世有關的 7 件珍品；集齊解鎖一張插畫。"}</span></button>`}
function chdRootSheet(){const c=chdMe(),L=CHD_ROOT[c];if(!L)return;relicsData().then(R=>{const mine=relicsMine(),has=([e,id])=>(mine[e]||[]).includes(id),n=L.filter(has).length,full=n>=L.length,T=chdT(c)||{},C=WX_CHARS[c];
  sheet(`🌿 ${C.n}的尋根（${n}／${L.length}）`,b=>{b.innerHTML=(full?`<div class="chd-rpic">${chdRootImg(c)}</div><div class="chd-say">${chdFace(c)}<span><b>${esc(chdNk(c))}</b>「${esc(T.root||"")}」</span></div>`:`<p class="muted" style="font-size:13px;line-height:1.6;margin:0 0 8px">這 7 件珍品都跟${esc(chdNk(c))}的家鄉（${esc(C.era)}）和身世有關。在園子、渡口、古戰場收到它們，集齊就解鎖一張${esc(chdNk(c))}的插畫。</p>`)+
    `<div class="items" style="padding:0">${L.map(x=>{const it=(R[x[0]]||[]).find(z=>z.id===x[1])||{},g=has(x);return`<div class="item"${g?"":' style="opacity:.6"'}><span class="lb" style="width:44px;height:44px;font-size:22px;display:flex;align-items:center;justify-content:center">${g?relicImg(x[0],x[1]):"？"}</span><span class="tx"><b>${g?esc(it.name||""):"？？（"+esc(relicEra(x[0]))+"）"}</b><span>${esc(x[2])}</span></span></div>`}).join("")}</div>
    <button class="btn ghost" id="chdRBk" style="width:100%;margin-top:10px">← 回珍品冊</button>`;b.querySelector("#chdRBk").onclick=()=>relicBook()})})}
const chdRootBind=b=>{const x=b.querySelector("#chdRoot");if(x)x.onclick=()=>{if(typeof vibrate==="function")vibrate(5);chdRootSheet()}};

/* ---------- 4 故國舊夢（CHD4_ON，開發者 11/8 改小：只給劇情與收藏，不降難度、不送東西、不提高掉寶）----------
   星槎停靠過角色家鄉那一站（CHAR_ERA，帥、仕都是明）以後：
   ① 驛站信箱（07m-yizhan.js yzMail：那一朝的信、雲河驛站的全部的信）多一封「寄不出去的信」（CHD_TXT[c].letter，角色上船頭幾夜寫的，第一人稱）；讀過記 chd.home[朝代].r。
   ② 信末夾一張殘譜＝這一站多一題本命殺法題（chdHomePick：一盞茶題庫、照本命挑、打開那一刻存 chd.home[朝代].pz），解題頁 #/canju/s/<朝代>/<題號>（07f-ship.js shipXM 先問 chdHomeXM），修為照一盞茶 +5，解開記 chd.home[朝代].ok；茶單、續局不出這題（shipMorePool 跳過 chdHomeIds）。
   ③ 星槎頁在家鄉那一站，地圖上方多一個「🏠 故鄉」小標記（chdHomeMark，07f-ship.js Voyage 呼叫）。 */
const CHD4_ON=true;   /* 開發者 11/8 說直接全部打開 */
const chdHomeEra=c=>(typeof CHAR_ERA!=="undefined"&&CHAR_ERA[c])||"";
/* 這位角色的家鄉站已經停靠過了嗎 */
function chdHomeOpen(c){c=c||chdMe();const e=chdHomeEra(c);if(!CHD4_ON||!e||!chdT(c))return"";try{if(typeof shipAppr==="function"&&shipAppr())return"";if(typeof shipDocked==="function"&&!shipDocked().includes(e))return"";if(typeof eraLocked==="function"&&eraLocked(e))return""}catch(x){return""}return e}
const chdHome=e=>((chdSt().home||{})[e])||{};
const chdHomeIds=()=>{const H=chdSt().home||{},o=[];for(const e in H)if(H[e]&&H[e].pz)o.push(H[e].pz);return o};
/* 挑故鄉那一題（已經挑過就用原本的） */
async function chdHomePick(c){const e=chdHomeEra(c),H=chdHome(e);if(H.pz)return H.pz;const{pool,T}=await shipMorePool(),band=shipMoreBand(1),mid=(band[0]+band[1])/2;
  const L=pool.map(P=>[chdBmInfo(c,P,T),P]).filter(x=>chdBmOk(x[0])).map(x=>[x[0].s-1.2*Math.abs((+x[1].d||0)-mid)+cjRand(cjAid()+"|home|"+x[1].id)()*.8,x[1]]).sort((a,b)=>b[0]-a[0]);
  const id=L.length?L[0][1].id:"";if(id)chdSet(S=>{S.home=S.home||{};S.home[e]=Object.assign(S.home[e]||{},{pz:id,at:Date.now()})});return id}
/* 信箱裡的那一列（k＝驛站的朝代；classic＝全部的信） */
function chdMailRow(k){const c=chdMe(),e=chdHomeOpen(c);if(!e||(k!=="classic"&&k!==e))return"";const T=chdT(c),H=chdHome(e);
  return`<div class="items" style="padding:0;margin:0 0 8px"><button class="item" data-chdmail="1"><span class="lb" style="font-size:22px">✉️</span><span class="tx"><b>${esc(chdNk(c))}寄不出去的信${H.r?"":" 🆕"}</b><span>〈${esc(T.letter.t)}〉・寫在星槎上、收在${esc(eraLabel(e))}的驛站</span></span><span class="muted">›</span></button></div>`}
const chdMailBind=(b,back)=>b.querySelectorAll("[data-chdmail]").forEach(y=>y.onclick=()=>{if(typeof vibrate==="function")vibrate(5);if(typeof closeSheet==="function")closeSheet();setTimeout(()=>chdLetter(back),260)});
function chdLetter(back){const c=chdMe(),e=chdHomeOpen(c);if(!e)return;const T=chdT(c),L=T.letter;chdSet(S=>{S.home=S.home||{};S.home[e]=Object.assign(S.home[e]||{},{r:Date.now()})});chdCss();
  sheet("✉️ "+L.t,b=>{const H=chdHome(e);b.innerHTML=`<p class="muted" style="font-size:12.5px;line-height:1.6;margin:0 0 8px">星槎上的信寄不出去，驛站的人把它收在${esc(eraLabel(e))}這一站的信箱裡。這是${esc(chdNk(c))}剛上船那幾夜寫的。</p>
    <div class="chd-letter">${String(L.x).split(/\n+/).map(p=>`<p>${esc(p)}</p>`).join("")}</div>
    <div class="card" style="margin-top:10px"><b>📜 信裡夾著一張殘譜</b><p class="muted" style="font-size:13px;line-height:1.6;margin:4px 0 8px">是${esc(chdNk(c))}在家鄉照著記下來的一局，跟${esc(WX_CHARS[c].pc)}有關。${H.ok?"已經解開了。":""}</p><button class="btn${H.ok?" ghost":""}" id="chdHz" style="width:100%">${H.ok?"♟ 再看一次這局":"♟ 解這局故鄉殘譜"}</button></div>`;
    b.querySelector("#chdHz").onclick=async()=>{const id=await chdHomePick(c).catch(()=>"");if(!id)return toast("這張殘譜一時看不清楚，等一下再試");closeSheet();location.hash=shipHref(e,id)}})}
/* 解題頁設定（07f-ship.js shipXM 呼叫）：不是故鄉那一題回 null */
function chdHomeXM(k,id){const c=chdMe(),e=chdHomeOpen(c);if(!e||k!==e||chdHome(e).pz!==id)return null;const T=chdT(c);
  return{id,rk:"cjRunS",back:()=>"#/adventure",top:"✉️ 故鄉殘譜",icon:"✉️",ans:"看答案這題就不算解開（也沒有修為），確定？",
    head:P=>`<b>✉️ ${esc(shipShort(k))}・${esc(chdNk(c))}的故鄉殘譜</b><span class="chd-bm">本命${esc(WX_CHARS[c].pc)}</span>・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span><div class="shp-psay">${esc(chdNk(c))}：「這一局，是我在家鄉的時候記下來的。」</div>`,
    wrong:()=>"",mark:o=>{const H=chdHome(e),first=!H.ok,h=o&&o.hint?1:0;chdSet(S=>{const x=S.home[e],old=x.ok;if(!old||(old.h&&!h))x.ok={at:Date.now(),h}});return{first,h}},
    done:(o,ans)=>ans||!o?`<p class="muted">看了答案，這題先不算解開；之後不看答案再解一次就算。</p>`:(chdCss(),`<div class="chd-say">${chdFace(c)}<span><b>${esc(chdNk(c))}・故國舊夢</b>「${esc(chdOne(T.bm,id+"home"))}」</span></div>`),
    next:()=>"#/adventure",nextL:()=>"⛵ 回星槎"}}
/* 星槎頁的「🏠 故鄉」小標記；第一次停在家鄉提醒一聲信箱 */
function chdHomeMark(v,k){const c=chdMe(),e=chdHomeOpen(c);if(!e||k!==e||!v)return;chdCss();const m=v.querySelector(".shp-map.full");if(!m||m.querySelector(".chd-home"))return;
  const d=document.createElement("div");d.className="chd-home";d.textContent="🏠 "+chdNk(c)+"的故鄉";m.append(d);
  if(!chdHome(e).seen){chdSet(S=>{S.home=S.home||{};S.home[e]=Object.assign(S.home[e]||{},{seen:Date.now()})});setTimeout(()=>{try{toast("🏠 這裡是"+chdNk(c)+"的故鄉。下船到驛站，信箱裡好像多了一封信。")}catch(x){}},900)}}

/* ---------- 對局重播（7、8 共用）----------
   st.moves＝[{f,t,by}]，f／t 是 0～89（列×9＋行，第 0 列是黑方底線）；換成「自己這一方在下面」的座標（執黑轉 180°），棋子一律大寫 */
function chdReplay(moves,human,b0){const b=(b0||parseFen(START)).slice(),N=i=>human==="b"?89-i:i,own=[];
  for(const m of moves||[]){const p=b[m.f],cap=b[m.t];b[m.t]=p;b[m.f]=null;if(m.by===human&&p){const f=N(m.f),t=N(m.t);own.push({p:String(p).toUpperCase(),fr:Math.floor(f/9),fc:f%9,tr:Math.floor(t/9),tc:t%9,cap:cap?String(cap).toUpperCase():""})}}
  const mine=[];b.forEach((p,i)=>{if(p&&(human==="b"?p===p.toLowerCase():p===p.toUpperCase())){const j=N(i);mine.push({p:p.toUpperCase(),r:Math.floor(j/9),c:j%9})}});return{own,mine,board:b}}
/* 從標準開局擺起的嗎（重播完要跟現在的盤面一樣） */
function chdStd(st){try{const R=chdReplay(st.moves,st.human);return R.board.every((p,i)=>(p||null)===(st.board[i]||null))}catch(e){return false}}

/* ---------- 7 千秋起手式（CHD7_ON）----------
   每位角色一套開局修行：跟電腦下（挑戰電腦、擂台、驛站、園子、石桌往事都算；錯棋重練不算；線上不算），從標準開局擺起、自己走滿 8 步，前幾步符合這位的開局 → 記一次；
   CHD_OP_N 次完成：修為 +40（addXP「起手式」）＋一件珍品（先給雲河尋根那 7 件裡還沒有的，都有了給家鄉朝代還沒有的；全有就只給修為）。chd.op[角色]＝{n,g:[遊戲 id],done}。
   判斷規則 chdOpOk（座標＝自己在下面：第 9 列底線、第 7 列炮、第 6 列兵；行 0～8 從自己的左邊數）：
     俥 中炮出車：自己前 2 步裡有一步「炮從 (7,1)/(7,7) 平到中路 (7,4)」，而且前 6 步裡有一步動了俥（直車、橫車都算）。
     相 飛相局：第 1 步是相從 (9,2)/(9,6) 飛到 (7,4)。
     炮 中炮：第 1 步就是炮平中路。
     傌 起馬局／屏風馬：第 1 步是傌 (9,1)→(7,2) 或 (9,7)→(7,6)；或前 4 步兩匹傌都跳到 (7,2)、(7,6)。
     帥 仙人指路（穩健）：第 1 步是兵 (6,2)→(5,2) 或 (6,6)→(5,6)，而且前 8 步沒吃子、沒有子過河。
     仕 士角炮（選它不選中炮巡河炮：炮架在仕角、貼著九宮護帥，跟連城的護衛身分對得上，也跟花兒的中炮分開）：第 1 步是炮 (7,1)→(7,3) 或 (7,7)→(7,5)。
     兵 進兵過河：第 1 步是任一個兵往前一步，而且前 10 步裡有兵過河（走到第 4 列以上）。
   測試：tools/test/chardiff_test.js（node 跑）。 */
const CHD7_ON=true,CHD_OP_N=3;
const CHD_OP={x_swordboy:{nm:"中炮出車",how:"先架中炮，前六步把俥開出來（直車、橫車都算）"},x_spiritgirl:{nm:"飛相局",how:"第一步就飛相到中路"},x_martialgirl:{nm:"中炮（當頭炮）",how:"第一步炮平中路"},
  x_miaogirl:{nm:"起馬局／屏風馬",how:"第一步跳傌，或前四步兩匹傌都跳到兵後面"},x_shuai:{nm:"仙人指路（穩健）",how:"第一步挺三路或七路兵，前八步不吃子、不過河"},
  x_shi:{nm:"士角炮",how:"第一步炮平到仕角（四路或六路）"},x_bing:{nm:"進兵過河",how:"第一步挺兵，前十步讓一個兵過河"}};
function chdOpOk(c,own){const O=own||[],B=(CHD_BM[c]||{}).pc;if(O.length<8)return false;const at=(m,p,fr,fc,tr,tc)=>!!m&&m.p===p&&m.fr===fr&&m.tr===tr&&m.fc===fc&&m.tc===tc;
  const cen=m=>!!m&&m.p==="C"&&m.fr===7&&m.tr===7&&(m.fc===1||m.fc===7)&&m.tc===4,o0=O[0];
  if(B==="R")return O.slice(0,2).some(cen)&&O.slice(0,6).some(m=>m.p==="R");
  if(B==="B")return!!o0&&o0.p==="B"&&o0.fr===9&&(o0.fc===2||o0.fc===6)&&o0.tr===7&&o0.tc===4;
  if(B==="C")return cen(o0);
  if(B==="N"){if(at(o0,"N",9,1,7,2)||at(o0,"N",9,7,7,6))return true;const F=O.slice(0,4);return F.some(m=>at(m,"N",9,1,7,2))&&F.some(m=>at(m,"N",9,7,7,6))}
  if(B==="K")return(at(o0,"P",6,2,5,2)||at(o0,"P",6,6,5,6))&&O.slice(0,8).every(m=>!m.cap&&m.tr>=5);
  if(B==="A")return at(o0,"C",7,1,7,3)||at(o0,"C",7,7,7,5);
  if(B==="P")return!!o0&&o0.p==="P"&&o0.fr===6&&o0.tr===5&&o0.fc===o0.tc&&O.slice(0,10).some(m=>m.p==="P"&&m.tr<=4);return false}
const chdOp=c=>((chdSt().op||{})[c])||{n:0,g:[]};
/* 送一件珍品（雲河尋根優先）；回傳 [朝代, 珍品] 或 null */
async function chdGiveRelic(c,from){try{const R=await relicsData(),M=relicsMine(),has=(e,id)=>(M[e]||[]).includes(id),e0=chdHomeEra(c);
  let pick=(CHD_ROOT[c]||[]).find(([e,id])=>!has(e,id)&&(R[e]||[]).some(z=>z.id===id));if(!pick){const z=(R[e0]||[]).find(x=>!has(e0,x.id));if(z)pick=[e0,z.id]}if(!pick)return null;
  const it=(R[pick[0]]||[]).find(z=>z.id===pick[1]);M[pick[0]]=(M[pick[0]]||[]).concat(pick[1]);store.set("relics",M);if(typeof relicFx==="function")relicFx(pick[0],it,{from});return[pick[0],it]}catch(e){return null}}
function chdOpEnd(st,c,R){if(!CHD7_ON||!CHD_OP[c]||!chdStd(st)||!chdOpOk(c,R.own))return;const id=String(st.id||Date.now());let o=chdOp(c);if(o.done||(o.g||[]).includes(id))return;
  chdSet(S=>{S.op=S.op||{};const x=S.op[c]=S.op[c]||{n:0,g:[]};x.n=(x.n||0)+1;x.g=(x.g||[]).concat(id).slice(-12);if(x.n>=CHD_OP_N)x.done=Date.now()});o=chdOp(c);const T=chdT(c)||{};
  setTimeout(()=>{try{if(o.done){if(typeof addXP==="function")addXP(40,"起手式","op:"+c);toast(`🌟 千秋起手式「${CHD_OP[c].nm}」修成！${chdNk(c)}：「${(T.op||{}).say||""}」`);chdGiveRelic(c,"千秋起手式・"+CHD_OP[c].nm+"修成")}
    else toast(`🌟 千秋起手式「${CHD_OP[c].nm}」${o.n}／${CHD_OP_N}`)}catch(e){}},3200)}

/* ---------- 8 七星破擂（CHD8_ON）----------
   擂主卡（06-cpu.js arenaSheet）多一個勾選「本命挑戰」（chd.chal[朝代]＝1，記住勾選），勾著打擂台、而且贏了、又達成這位角色的條件 → 這一朝千秋印的擂台邊多一顆本命星（chd.seal[朝代]＝{c,at}；11/9 以前叫閃版擂台印，07i2-seal.js sealDraw 畫星）。
   只算單機擂台（MODE arena）；不改擂主棋力、不改蓋章規則（普通印照舊）。條件（chdChalOk，整盤重播）：
     俥 全局不退車（自己的俥沒有往自己底線方向走過）；相 兩隻相都還在；炮 炮吃掉至少三子；傌 兩匹傌都還在；帥 帥至少離開原位一次；仕 兩隻仕都還在；兵 至少一個兵過了河、而且活到最後（兵不能退，過了河的兵還在場上＝成立）。 */
const CHD8_ON=true;
const CHD_CHAL={x_swordboy:"全局不退車",x_spiritgirl:"兩隻相都不被吃",x_martialgirl:"用炮吃掉至少三子",x_miaogirl:"兩匹傌活到最後",x_shuai:"帥至少離開原位一次",x_shi:"兩隻仕活到最後",x_bing:"至少一個兵過河、活到最後"};
function chdChalOk(c,R){const B=(CHD_BM[c]||{}).pc,n=p=>R.mine.filter(x=>x.p===p).length;
  if(B==="R")return!R.own.some(m=>m.p==="R"&&m.tr>m.fr);if(B==="B")return n("B")>=2;if(B==="C")return R.own.filter(m=>m.p==="C"&&m.cap).length>=3;if(B==="N")return n("N")>=2;
  if(B==="K")return R.own.some(m=>m.p==="K");if(B==="A")return n("A")>=2;if(B==="P")return R.mine.some(x=>x.p==="P"&&x.r<=4);return false}
const chdSeal=e=>((chdSt().seal||{})[e])||null;
function chdChalHTML(era){if(!CHD8_ON)return"";const c=chdMe();if(!c||!CHD_CHAL[c])return"";const on=!!((chdSt().chal||{})[era]),sh=chdSeal(era);chdCss();
  return`<label class="chd-chal"><input type="checkbox" id="chdChal"${on?" checked":""}><span><b>⭐ 本命挑戰：${esc(CHD_CHAL[c])}</b><small>勾著打擂台，贏了又做到，這一朝千秋印的擂台那一邊多一顆 ⭐ 本命星${sh?"（已經有了）":""}。擂主不會變強，擂台那一邊照樣會亮。</small></span></label>`}
function chdChalSet(b,era){const x=b&&b.querySelector("#chdChal");if(!x)return;chdSet(S=>{S.chal=S.chal||{};if(x.checked)S.chal[era]=1;else delete S.chal[era]})}
const chdSealCls=e=>CHD8_ON&&chdSeal(e)?" chd-shine":"";
function chdChalEnd(st,c,R){if(!CHD8_ON||!st.arena||!((chdSt().chal||{})[st.arena]))return;const win=!!st.result&&st.result.w===st.human,ok=win&&chdChalOk(c,R),e=st.arena;
  setTimeout(()=>{try{if(!ok){toast(win?`⭐ 本命挑戰沒達成：${CHD_CHAL[c]}`:"⭐ 本命挑戰：要贏了才算");return}const first=!chdSeal(e);if(first)chdSet(S=>{S.seal=S.seal||{};S.seal[e]={c,at:Date.now()}});
    chdSealFx(e);toast(`⭐ 本命挑戰達成！${typeof sealNm==="function"?sealNm(e):eraLabel(e)}${first?"多了一顆本命星":"已經有本命星了"}。${chdNk(c)}：「${(chdT(c)||{}).seal||""}」`)}catch(x){}},3000)}
function chdSealFx(e){if(typeof sealHTML!=="function")return;chdCss();const d=document.createElement("div");d.className="stampfx chd-shine";d.innerHTML=typeof sealDraw==="function"?sealDraw(e,{fx:1}):sealHTML(e,true,true);document.body.append(d);try{vibrate([20,60,40,60])}catch(x){}setTimeout(()=>d.remove(),2800)}

/* ---------- 對局結束（08b-cpugame.js CpuGame 結果處呼叫；錯棋重練不算；線上對戰不走這裡） ---------- */
function chdGameEnd(st,mode){if(!st||!st.result||st.practice||mode==="practice")return;const c=chdMe();if(!c)return;let R=null;try{R=chdReplay(st.moves,st.human)}catch(e){return}
  try{chdOpEnd(st,c,R)}catch(e){console.warn(e)}try{if(mode==="arena")chdChalEnd(st,c,R)}catch(e){console.warn(e)}}

/* ---------- 3 本命定乾坤（CHD3_ON）----------
   古戰場的殘局題（07g-battle.js battleXM 的 done 呼叫 chdEggDone；守城、讓子局不算）不看答案解開，而且照解法主線：
     俥傌炮帥兵＝最後一步（絕殺那一步）是本命子；相、仕＝本命子一開始就在盤上、整條主線都沒被吃（「本命子都存活且獲勝」）
   → 解鎖這位角色的歷史彩蛋卡（CHD_TXT[c].egg：t 標題、x 正文、src 依據；依據清單另交史學顧問核對）。每位一張，chd.egg[角色]＝{at,k 朝代,i 第幾場}。 */
const CHD3_ON=true;
function chdEggOk(c,P){const B=CHD_BM[c];if(!B||!P)return false;const mv=chdLine(P),mine=mv.filter(m=>m.me);if(!mine.length)return false;
  if(B.pc==="B"||B.pc==="A"){const row=String(P.fen||"").split(" ")[0],me=P.side==="b"?B.pc.toLowerCase():B.pc,n0=[...row].filter(ch=>ch===me).length;return n0>0&&!mv.some(m=>!m.me&&m.cp===B.pc)}
  return mine[mine.length-1].pc===B.pc}
const chdEgg=c=>((chdSt().egg||{})[c])||null;
function chdEggDone(k,i,id,o,ans){if(!CHD3_ON||ans||!o)return"";const c=chdMe(),T=chdT(c);if(!T||!T.egg)return"";let P=null;try{P=BATTLE_D&&BATTLE_D.byId&&BATTLE_D.byId[id]}catch(e){}if(!chdEggOk(c,P))return"";
  const first=!chdEgg(c);if(first)chdSet(S=>{S.egg=S.egg||{};S.egg[c]={at:Date.now(),k,i,...((typeof BTL_Y_ON!=="undefined"&&BTL_Y_ON)?{id:((typeof BATTLE_CARDS!=="undefined"&&BATTLE_CARDS[k]||[])[i]||{}).id||""}:{})}});chdCss();const B=CHD_BM[c],how=B.pc==="B"||B.pc==="A"?"本命子"+WX_CHARS[c].pc+"一隻都沒丟":"最後一步是本命子"+WX_CHARS[c].pc;
  return`<div class="chd-say">${chdFace(c)}<span><b>${esc(chdNk(c))}・本命定乾坤</b>${esc(how)}！${first?"解開了一張歷史彩蛋卡：":"彩蛋卡已經收在本命修行裡："}〈${esc(T.egg.t)}〉<br><button class="lk" data-chdegg="${esc(c)}" style="text-decoration:underline;font-size:14px">📜 看彩蛋卡</button></span></div>`}
function chdEggSheet(c){const T=chdT(c);if(!T||!T.egg)return;const E=T.egg;sheet("📜 "+E.t,b=>{b.innerHTML=`<p class="muted" style="font-size:12.5px;margin:0 0 6px">本命定乾坤・${esc(WX_CHARS[c].n)}（${esc(WX_CHARS[c].era)}）的歷史彩蛋</p><p style="line-height:1.9;font-size:16px;margin:0 0 10px">${esc(E.x)}</p>
  <details><summary class="muted" style="font-size:13px">依據</summary><ul style="font-size:12.5px;line-height:1.7;margin:6px 0 0;padding-left:18px">${(E.src||[]).map(s=>`<li>${esc(String(s).replace(/（[^）]*待考[^）]*）/g,""))}</li>`).join("")}</ul></details>`})}
if(typeof document!=="undefined")document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("[data-chdegg]");if(!b)return;e.preventDefault();chdEggSheet(b.dataset.chdegg)});

/* ---------- 5 本命化形（CHD5_ON）----------
   13 站都學會（shipLearned）以後，自己這一方（棋盤下面那一方：o.flip＝執黑）的本命子換成專屬棋子圖 data/chdpiece/<角色>_<r|b>.webp（Gemini 畫，tools/chdpiece_slice.py 切成 160×160，跟 data/pset 同格式）。
   只改本機的平面棋盤畫法（01-board.js piece() 問 chdPieceHref），只在用朝代整套棋子圖（pset）的時候換，高對比棋子不換；不送到線上，對手看不到。
   設定頁「更多設定」（05-settings.js）和本命修行卡可以開關：chd.form＝0 關，預設開。圖還沒放進 art/ 就什麼都不換（先試載一張）。 */
const CHD5_ON=true;
let CHD_PC_OK=null;
function chdPcProbe(){if(CHD_PC_OK!==null||typeof Image==="undefined")return;const c=chdMe();if(!c)return;CHD_PC_OK=false;const im=new Image();im.onload=()=>{CHD_PC_OK=true;try{if(typeof reGlyAll==="function")reGlyAll()}catch(e){}};im.onerror=()=>{CHD_PC_OK=false};im.src=`data/chdpiece/${c}_r.webp`}
const chdFormOpen=()=>{try{return!!chdMe()&&SHIP_ROUTE.every(k=>shipLearned(k))}catch(e){return false}};
const chdFormOn=()=>CHD5_ON&&chdFormOpen()&&chdSt().form!==0;
function chdPieceHref(s,p,o){if(!CHD5_ON)return"";const c=chdMe(),B=CHD_BM[c];if(!B||String(p).toUpperCase()!==B.pc)return"";if(CHD_PC_OK!==true){chdPcProbe();return""}
  if(s!==((o&&o.flip)?"b":"r")||!chdFormOn())return"";return`data/chdpiece/${c}_${s}.webp`}
const CHD_FORM_NM={x_swordboy:"黑漆青銅俥",x_spiritgirl:"青玉相",x_martialgirl:"朱漆爆竹紋炮",x_miaogirl:"鑲銀傌",x_shuai:"赤金帥",x_shi:"紅繩硬木仕",x_bing:"青石兵"};
function chdFormRow(){if(!CHD5_ON)return"";const c=chdMe();if(!c)return"";const op=chdFormOpen();
  return`<label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>本命化形</b><br><small class="muted">${op?`自己的${esc(WX_CHARS[c].pc)}換成「${esc(CHD_FORM_NM[c])}」；只有你看得到`:"雲河星槎 13 站都學會以後解鎖"}</small></span><input type="checkbox" class="sw" id="chdForm"${op?"":" disabled"}></label>`}
function chdFormBind(v){const x=v&&v.querySelector("#chdForm");if(!x)return;x.checked=chdFormOn();x.onchange=()=>{chdSet(S=>{if(x.checked)delete S.form;else S.form=0});try{vibrate(5)}catch(e){}}}

/* ---------- 我的角色頁：本命修行卡（07-legend.js Me 呼叫 chdMeCard）---------- */
function chdMeCard(){const c=chdMe();if(!c)return null;chdCss();const C=WX_CHARS[c],T=chdT(c)||{},rows=[];
  if(CHD7_ON&&CHD_OP[c]){const o=chdOp(c);rows.push(["🌟","千秋起手式・"+CHD_OP[c].nm,o.done?"修成了":`${o.n||0}／${CHD_OP_N}・${CHD_OP[c].how}`])}
  if(CHD8_ON&&CHD_CHAL[c]){const n=Object.keys(chdSt().seal||{}).length;rows.push(["⭐","七星破擂・"+CHD_CHAL[c],`千秋印本命星 ${n}／13・在擂主卡勾「本命挑戰」`])}
  if(CHD9_ON&&CHD_ROOT[c]){const M=relicsMine(),n=CHD_ROOT[c].filter(([e,id])=>(M[e]||[]).includes(id)).length;rows.push(["🌿",C.n+"的尋根",`${n}／7・集齊解鎖插畫（在珍品冊）`,"root"])}
  if(CHD4_ON){const e=chdHomeEra(c),H=chdHome(e),op=chdHomeOpen(c);rows.push(["✉️","故國舊夢・"+eraLabel(e),op?(H.r?"讀過信了":"驛站信箱有一封信")+(H.ok?"・故鄉殘譜解開了":""):"星槎停靠"+eraLabel(e)+"以後，驛站信箱會多一封信",op?"mail":""])}
  if(CHD3_ON&&T.egg){const E=chdEgg(c);rows.push(["📜","本命定乾坤",E?"〈"+T.egg.t+"〉":"古戰場殘局用本命子絕殺"+(CHD_BM[c].pc==="B"||CHD_BM[c].pc==="A"?"（相、仕：本命子一隻都沒丟）":"")+"，解開歷史彩蛋卡",E?"egg":""])}
  if(CHD5_ON){rows.push(["♟","本命化形・"+CHD_FORM_NM[c],chdFormOpen()?(chdFormOn()?"已換上（設定頁可以關）":"已關閉（設定頁可以打開）"):"雲河星槎 13 站都學會以後解鎖"])}
  if(!rows.length)return null;const d=document.createElement("div");d.className="card";
  d.innerHTML=`<b style="font-family:var(--serif);font-size:16px">${esc(C.n)}的本命修行</b><div class="items" style="padding:0;margin-top:6px">${rows.map(r=>`<${r[3]?`button data-chdme="${r[3]}"`:"div"} class="item"><span class="lb" style="font-size:20px">${r[0]}</span><span class="tx"><b>${esc(r[1])}</b><span>${esc(r[2])}</span></span>${r[3]?'<span class="muted">›</span>':""}</${r[3]?"button":"div"}>`).join("")}</div>`;
  d.querySelectorAll("[data-chdme]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}const k=b.dataset.chdme;if(k==="root")chdRootSheet();else if(k==="mail")chdLetter();else if(k==="egg")chdEggSheet(c)});return d}

/* ---------- 破關卡（CHD_END_ON，開發者 11/8 選定；文案定稿 story/破關文案_定稿.md：七位都用 A，沒有角色用通用版）----------
   13 站都停靠過（07f-ship.js ShipSail 的旅程終點「千秋未完之局」）：頁上多一顆「🏁 破關卡」，第一次到終點自動打開（chd.end＝看過的時間）。
   破關卡：標題、破關結語（這位角色）、邀請再玩＋被提到的同伴灰階剪影（選角立繪 data/xs/prev_<同伴>.webp）、兩顆按鈕。
   按邀請：剪影轉彩（約 0.9 秒）→ shipNewJourney(同伴)：開新旅程的選角畫面預選那位同伴（三格都滿照原本的提示去開頭畫面挑格子，預選一路帶著）；另一顆按鈕關掉、留在終點。 */
const CHD_END_ON=true;
const CHD_END={
  "":{t:"千秋局罷星河闊",x:"說書人撫鬚輕嘆：「客官，十三朝的殘譜補全了。棋枰上雖有楚河漢界，俥走直路、傌走日字、兵過河才橫行，各有各的走法；走過這一程的人，也各有各的歸處。」",
    inv:"「方才那位小客官的旅程已經圓滿。雲河之上，另有六顆星的軌跡還暗著。客官若有閒，換一位同行，再走一趟千秋之局？」",b1:"換一位再起航",b2:"留駐千秋局",to:""},
  x_swordboy:{t:"俥行通路見爹心",x:"直衝的俥，終於學會先替自己找一條通路。阿轍明白了：那天爹把車轉進小路，不是走歪路，是想帶發燒的他活著走到醫者面前。腰牌上輪紋裡的泥擦乾淨了，他的手也不必再攥得那麼緊。",
    inv:"他的直路走通了。可那個坐凳子都不肯坐直、偏愛繞彎的小梅，在元朝的草原上又繞過了多少路？",b1:"用小梅再走一次",b2:"留駐千秋局",to:"x_miaogirl"},
  x_spiritgirl:{t:"飛相巡河候魚書",x:"雙相連環，家門穩固。燕子總怕自己一離開，家就空了。後來她才懂，相雖不過河，心可以過；暫時離開，和不要這個家，原來分得清。江口那封輾轉來的信，她收在懷裡：娘已到江南，平安。",
    inv:"茶棚的風雨停了。可那嗓門最大、隔山就敢打炮的花兒，一聽見雷聲，為什麼總要先找地方躲？",b1:"用花兒再走一次",b2:"留駐千秋局",to:"x_martialgirl"},
  x_martialgirl:{t:"借子開花響連天",x:"當頭炮再響，也得先有炮架。花兒明白了，自己不必一個人衝在最前面：退到後面替人當炮架，替人留一段安靜，也是本事。她回到臨安，先敲了門；爺爺替她留著一盞燈。",
    inv:"炮要借子，仕卻總擋在人前。明朝那個話少、走路老走在別人身前半步的連城，心裡其實想去哪裡？",b1:"用連城再走一次",b2:"留駐千秋局",to:"x_shi"},
  x_miaogirl:{t:"躍馬掛角尋舊姓",x:"馬走日字，最怕蹩腳。小梅繞了無數個彎，看出過沙色不對，也在長草裡躲過一回，才發現：多知道一個姓，沒有少掉一個家。帽頂那顆紅珠，草原上的人一眼就認得。",
    inv:"她的彎路繞回了家。清朝揚州那個在雪裡跑腿、草鞋補了又補的溪兒，走這一趟，又會遇見誰？",b1:"用溪兒再走一次",b2:"留大漠馳馬",to:"x_bing"},
  x_shuai:{t:"出帥助攻定乾坤",x:"將帥不可照面，帥也不出九宮，卻能出帥助攻。方庭碰了碰胸前的長命鎖，扶著屏風等一口氣，終於自己走了出去。九宮方寸之地，也是他的棋盤。",
    inv:"他走出屏風了。可一直走在他身前半步的連城，在長安金市聽見商隊鈴聲時，心裡在想什麼？",b1:"用連城再走一次",b2:"留休寧聽雨",to:"x_shi"},
  x_shi:{t:"棄仕解殺路始寬",x:"仕守九宮，他一直以為，只有擋在前面才算護人。直到在長安那盤殘局裡，他想明白什麼時候該撐仕、什麼時候該棄仕解殺：最好的盾牌，是讓對方自己變強。回到休寧那天，他沒有先跨出去，等方庭自己走出屏風。",
    inv:"他學會了退半步。那個總被他護在身後的方庭，獨自坐到櫃前的時候，心裡又是什麼光景？",b1:"用方庭再走一次",b2:"留駐千秋局",to:"x_shuai"},
  x_bing:{t:"小卒過河步生蓮",x:"兵卒過河，再無退路，卻能左右橫行。她一步一步踏過揚州的雪，回頭時，雪地裡不只有自己的腳印。懷裡那面拼起來的祈福小旗，是她走過十三朝，最捨不得放手的東西。",
    inv:"她的旗拼起來了。元朝草原上那頂鈸笠帽的紅珠，是誰一針一針縫上去的？換小梅走一趟，就知道了。",b1:"用小梅再走一次",b2:"隨漕船揚帆",to:"x_miaogirl"}};
const chdEndSpot=()=>CHD_END_ON?[["ssEnd",24,64,"🏁 破關卡",(chdMe()?chdNk(chdMe())+"的":"")+"結局","hot"]]:[];
function chdEndBind(v){if(!CHD_END_ON||!v)return;const b=v.querySelector("#ssEnd");if(b)b.onclick=()=>{try{vibrate(8)}catch(e){}chdEndShow()};if(!chdSt().end)setTimeout(()=>{if(v.isConnected)chdEndShow()},700)}
function chdEndShow(){if(!CHD_END_ON||document.querySelector(".chd-end"))return;chdCss();const c=chdMe(),E=CHD_END[c]||CHD_END[""],to=E.to,T=to&&WX_CHARS[to];if(!chdSt().end)chdSet(S=>{S.end=Date.now()});
  const d=document.createElement("div");d.className="chd-end";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label","破關："+E.t);
  d.innerHTML=`<div class="chd-ec"><div class="chd-eh">${c?`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()">`:""}<div><small>🏁 雲河星槎・十三站走完了</small><b>${esc(E.t)}</b></div></div>
    <p class="chd-ex">${esc(E.x)}</p>
    <div class="chd-ei">${T?`<img class="chd-sil" src="data/xs/prev_${to}.webp" alt="${esc(T.n)}" onerror="this.remove()">`:""}<p>${esc(E.inv)}</p></div>
    <div class="chd-eb"><button class="btn" id="chdE1">${esc(E.b1)}</button><button class="btn ghost" id="chdE2">${esc(E.b2)}</button></div></div>`;
  document.body.append(d);const close=()=>{d.classList.add("out");setTimeout(()=>d.remove(),220)};
  d.addEventListener("click",e=>{if(e.target===d)close()});d.querySelector("#chdE2").onclick=()=>{try{vibrate(5)}catch(e){}close()};
  d.querySelector("#chdE1").onclick=()=>{try{vibrate(10)}catch(e){}const s=d.querySelector(".chd-sil"),go=()=>{d.remove();if(typeof shipNewJourney==="function")shipNewJourney(to||"")};
    if(s&&!matchMedia("(prefers-reduced-motion: reduce)").matches){s.classList.add("lit");setTimeout(go,950)}else go()}}

/* ---------- 文案（CHD_TXT）---------- */
const CHD_TXT={
x_swordboy:{
  bm:["一條直線開到底，對面就沒地方躲了。","車捨出去，路就開了。原來直路也能這樣走。","兩輛車輪流將，像我爹趕車換肩，一下也不停。"],
  letter:{t:"爹，我在船上",x:"爹：\n\n這封信是我說一句，燕子寫一句。她答應教我認字，最後那兩個字是我自己寫的，歪了，你別笑。\n\n那天下雨，車轉進小路以後陷在泥裡，我被甩進灌木叢，看見那人拿鞭子打你。我想去拉他的手，腳一滑，就掉進渭水了。再醒來，是一條會在星星上走的船。說書的老伯說，船會送我回到上船的那一年，叫我別急。\n\n我很急。我想知道你肩上的傷好了沒有，糧有沒有送到，他們還有沒有說齊家走歪路。\n\n爹，我想了很多遍，要是那天不轉彎就好了。所以我發過誓，往後只走直路，誰也不能再拿這種話說你。\n\n船上有六個孩子，從不同的年月來。有個戴大帽子的小姑娘，坐凳子都不肯坐直，偏偏她挪出來的位子，剛好看得見每個人。我也說不上來為什麼，那時候我想起你回頭看我的樣子。\n\n腰牌我一直攥著，輪紋裡的泥我沒捨得洗。等我回去，你再教我看輪印。\n\n齊轍"},
  egg:{t:"直道千八百里",x:"始皇三十五年（前 212），秦命蒙恬開直道：從九原往南直抵雲陽，塹山堙谷，一路削山填谷，長約一千八百（秦）里，約七百多公里，是給車馬疾行的大路。更早在統一那年，秦就下令「車同軌」，天下車輪的距離一樣寬，各地的轍痕才接得起來。秦律對誤期也很嚴：睡虎地秦簡的〈徭律〉，就寫了徵發的人誤期幾天要受什麼罰。俥走直線、一路到底，正是這條大道的樣子；可再直的路上，也有為了家人轉彎的人。",src:["《史記・秦始皇本紀》：始皇二十六年「車同軌，書同文字」；三十五年「除道，道九原抵雲陽，塹山堙谷，直通之」","《史記・蒙恬列傳》：「自九原抵甘泉，塹山堙谷，千八百里。道未就」","睡虎地秦簡《秦律十八種・徭律》：「失期三日到五日，誶；六日到旬，貲一盾；過旬，貲一甲」（引文字句待考）"]},
  op:{say:"中炮架好、車直直開出去——這就是我的路！"},
  seal:"一步都沒退，車就這樣直直開到底了！",
  root:"銅車馬、半兩錢、刻著詔書的銅版……這些都是我爹那條路上的東西。原來車同軌不只是規矩，是讓遠方的車也能回家。爹，我把路收齊了。"},
x_spiritgirl:{
  bm:["相不過河，可家門口這一塊，誰也進不來。","守住了。慢慢來，總有人會先急。","田字飛得穩，比什麼殺法都讓人安心。"],
  letter:{t:"娘，缺口碗我轉進去了",x:"娘：\n\n妳叫我回茶棚等，我回去了。爐灰冷了我就重新生火，桌上落了土我就再擦一遍。門邊那隻有缺口的碗，是妳喝水慣用的，我把缺口轉向裡面，怕誰碰傷了嘴。\n\n那天渡口好多人，我被竹籃絆了一下，手就鬆了。娘，對不起，我該抓緊一點的。\n\n後來我坐在棚裡看江，有一條船從霧裡出來。上了船才知道，這條船不過江，它過的是年月。船上還有六個孩子，有一個不識字的男孩，我答應教他認字；有一個說話很大聲的女孩，喝了我的茶就安靜了。我給大家煮茶，像在棚裡一樣，先把壺把包好，壺嘴放穩。\n\n我寫這封信，是想等哪一天妳回到棚裡，看見桌上有信，就知道我沒有亂跑，我只是去了很遠的地方學下棋。學的是相：相不能過河，只能守著家這一邊。娘，我守得住的。\n\n可我也有點怕。怕我回去的時候，棚子已經不是妳認得的樣子了。\n\n燕子"},
  egg:{t:"佛狸祠下的瓜步",x:"元嘉二十七年（450），北魏太武帝拓跋燾大軍南下，一路打到長江北岸的瓜步。他在瓜步山上搭起氈帳行宮，砍蘆葦紮筏，揚言要渡江，南岸的建康全城戒嚴。隔年正月，魏軍終究沒有過江，掠走百姓北返，江北一帶殘破。太武帝小字佛狸，瓜步山上的行宮後來成了「佛狸祠」，七百多年後辛棄疾還在詞裡寫到它。長江像棋盤上的河：相不過河，守住這一邊，就守住了家。",src:["《宋書・索虜傳》（元嘉二十七年魏軍至瓜步）","《資治通鑑》卷一二五～一二六","辛棄疾〈永遇樂・京口北固亭懷古〉：「可堪回首，佛狸祠下，一片神鴉社鼓」（佛狸祠在瓜步山，待考具體位置說法）"]},
  op:{say:"先把相飛起來，家顧好了，再慢慢出子。"},
  seal:"兩隻相一隻都沒丟，家門口誰也沒能進來。",
  root:"指南車、算籌、蓮花尊……都是我那個年月江南的東西。祖沖之就是元嘉年間的人呢。原來我守著的不只是一座茶棚，還有一整條江的日子。"},
x_martialgirl:{
  bm:["砰！兩門炮疊在一起，誰也擋不住！","悶住了吧？隔一個，剛剛好！","炮架找對了，一聲就響到對面老將耳邊。"],
  letter:{t:"爺爺，這次你不用轉耳朵",x:"爺爺：\n\n我把字寫得大大的，你不用瞇眼，也不用把右耳轉過來。\n\n元宵那夜打雷，你捂著左耳坐起來，我站在旁邊，想扶你，又怕你一看見我，就想起那件事。我就捂住自己的耳朵跑出去了。我沿著河邊喊你，雷聲把我的聲音全吞掉，腳一滑，就跌上一條從霧裡靠過來的船。\n\n船上有六個孩子，每個人都從不一樣的年號來。我一開口還是好大聲，有個在爐邊煮茶的姊姊，一句話都沒罵我，倒了一碗茶給我，我就不嚷了。\n\n爺爺，我一直好大聲說話，是想讓你聽見我。可是寫信的時候，我好像比較說得清楚。\n\n那天是我偷動了藥火。是你把我拉進懷裡，用袖子蓋住我的臉。我說過對不起，你那時沒聽見。我現在寫下來：對不起。\n\n船上要下象棋，有一顆子叫炮，吃子要隔一個，跟煙火要搭架子一樣。說書的老伯說，等我們下完十三站的棋就能回家。你等我，別一個人去河邊找我，下雨天路滑。\n\n花兒"},
  egg:{t:"臨安元夕放煙火",x:"南宋臨安的元宵是全城最熱鬧的夜晚。周密在《武林舊事》記下當時的元夕：宮裡宮外掛滿花燈，街上有舞隊，宮中夜深還宣放煙火。火藥在宋代已經寫進兵書：北宋的《武經總要》記載了好幾種火藥的配方。宋代軍中說的「砲」是拋石機，所以字從「石」；象棋的「砲」，一般認為就取自這個意思。後來有了火器，才有人寫成「炮」。隔一個子才打得響，像煙火要先搭好架子。",src:["周密《武林舊事》卷二〈元夕〉：宮中夜深還宣放煙火","曾公亮等《武經總要・前集》卷十一、十二（火藥法）","《武經總要・前集》卷十二砲車諸圖：宋代軍中的「砲」是拋石機"]},
  op:{say:"中炮一架，當頭就響，這開局最像我！"},
  seal:"三顆子都是我的炮打下來的！這方印要閃閃的！",
  root:"紅燈籠、指南魚、兔毫盞、清明上河圖……我家作坊的煙火、街上的元宵，都在這裡了。爺爺，我把臨安一件一件撿回來了，這次我小聲說給你聽。"},
x_miaogirl:{
  bm:["拐個彎，就臥進對面的槽裡啦！","馬掛在角上，老將往哪跑都不行！","炮在後面撐著，我的馬一跳就到！"],
  letter:{t:"阿娘、老駱，我在一條船上",x:"阿娘、老駱：\n\n這封信是方庭替我寫的，我說一句，他寫一句。他寫字好慢好仔細，我在旁邊晃腳，他也不催我。\n\n那天是我牽錯了馬。腰牌擱在馬廄門邊，我只看繩子的顏色，就牽走了。送急件的人等得滿頭汗，驛令問是誰動了馬，我明明能答，卻先看見老駱蹲在那裡看馬蹄，連水都沒喝。我就跑了。\n\n老駱，我聽見你在水蕩那邊喊梅子。我不敢答應，把銀鈴攥在手心。對不起。\n\n後來草裡亮起一盞燈，我就上了一條船。船上有六個人，從好遠好遠的年月來。有個男孩只肯坐直，我拉凳子坐他旁邊，他也沒趕我。\n\n阿娘，帽子我天天戴著，紅珠還在帽頂，你說跑多遠都看得見我，對不對？\n\n我有點怕回去。怕驛站的人說，誰還敢留我。可是我又好想回去，想吃熱的飯，想聽老駱說馬跑了多遠。\n\n船上在下象棋，我是馬，走日字，最會拐彎。等我學會了，就拐回家。\n\n小梅"},
  egg:{t:"站赤：一站接一站",x:"元朝把驛站叫做「站赤」，是蒙古語的譯音。驛道從大都通往四方，每隔一段路就有一站，備好馬匹、飲食和住處；朝廷的使者憑「鋪馬聖旨」或牌子換馬，日夜不停地往下一站跑。《元史》說，四方往來的使者「止則有館舍，頓則有供帳，饑渴則有飲食」。馬可・波羅也在遊記裡驚嘆這套驛站。馬走日字、一站一站拐著跳，就像驛騎把消息送到天邊。",src:["《元史・兵志四・站赤》：「元制站赤者，驛傳之譯名也……止則有館舍，頓則有供帳，饑渴則有飲食」","《經世大典・站赤》（收於《永樂大典》卷一九四一六至一九四二六）","《馬可波羅行紀》：遊記述大汗驛站"]},
  op:{say:"兩匹馬一起跳出來，屏風擺好，誰也闖不進來！"},
  seal:"兩匹馬都跑到最後，一匹也沒跑丟！",
  root:"牌子、角弓、高足杯、寶鈔……這些都是驛道上來來去去的東西。天南地北的人在我家驛站換馬歇腳。我把它們收齊了，就像把整條驛道帶回家。"},
x_shuai:{
  bm:["帥也能往前一步，替大家把路堵上。","露個臉，對面的將就不敢動了。","我親自出手了。原來站出來，是這種感覺。"],
  letter:{t:"爹、娘，我出了院門",x:"爹、娘：\n\n我在一條船上，平安，喘得也比那晚好些。\n\n那天院裡起風，一隻紙鳶從牆外飛過，我起身想多看一眼，胸口就緊了。娘叫我回屋，爹說不能吹風。後來是城子背著我出了宅門。我看見地上那方天光在晃，再睜眼，就是古橋，還有一盞燈。\n\n爹、娘，別怪城子。是我自己想看那隻紙鳶。\n\n我從小坐在天井裡數屋脊上的瓦，數到缺角的那一片，就知道日光快移出窗邊了。我數得很熟，熟到以為外面的天，就只有那麼大。\n\n船上有六個孩子，從不同的年月來。有個跑腿的姑娘想摸我的衣角，城子攔住了她。我跟她說，想看可以問我。說完以後，我心裡有一點高興，好像我也能替自己說一句話。\n\n說書的老伯要我們下完十三站的棋。我在棋盤上是帥，只能在九宮裡走。可是我在想，九宮再小，也是一塊自己能走的地方。\n\n長命鎖我戴著。我會好好的，好好地回家，自己走進門。\n\n兒　方庭"},
  egg:{t:"萬曆十年的少主",x:"萬曆十年（1582）六月，輔佐小皇帝十年的首輔張居正去世。萬曆皇帝虛歲十歲登基，從前大小事都由張居正和太后作主；這一年，他二十歲，開始自己拿主意，史家常把這一年看成明朝的轉折點。也在這個時代，象棋古譜正興盛：隆慶四年（1570）刊行的《適情雅趣》，收了數百局殘局與全局。棋盤上的帥平常待在九宮，殘局裡卻常要親自出宮助攻——少主，總有自己走出來的一天。",src:["《明史・神宗本紀》、《明史・張居正傳》：萬曆十年六月張居正卒","黃仁宇《萬曆十五年》（萬曆親政前後的一般論述，可作背景參考）","徐芝《適情雅趣》，隆慶四年（1570）刊（刊年、收局數待考）"]},
  op:{say:"先挺一兵，看清楚再走。不急，每一步都是我自己選的。"},
  seal:"我自己走出了原來的位置，又平平安安贏回來了。",
  root:"龍尾硯、李廷珪墨，都出自我家鄉那一帶；紫砂壺、圈椅、宣德爐，就是當鋪院子裡的日子。以前我只隔著窗看，現在，它們是我自己一件一件找回來的。"},
x_shi:{
  bm:["仕撐起來，這一將就被擋住了。","捨掉一個仕，換他平安。值得。","擋下來了，還順手把對面逼到死路。"],
  letter:{t:"爹，我把少爺背出來了",x:"爹：\n\n我先說最要緊的：方庭沒事。船上的說書人給他喝了熱的，他喘得慢下來了，現在在我旁邊睡著。\n\n那天院裡起風，他一喘起來就停不下，大夫還沒到，大家都急。我沒等誰點頭，就背著他衝出了宅門。我知道這樣不對，沈家要是怪罪，爹別替我扛，是我自己的主意。\n\n過古橋的時候，有一盞燈，我們就撞上了一條船。\n\n船上還有五個孩子，各自從很遠的年月來。有個跑腿的丫頭想摸方庭的衣角，我伸手攔住了。方庭卻跟她說，想看可以問他。爹，我有一點不明白，我是不是攔得太快了。\n\n說書的老伯要我們下象棋，我是仕，只能在九宮裡斜著走，貼著帥。我想，這不就是我嗎。\n\n可是夜裡我站在船邊，看見星河一直流到看不見的地方。我從來沒想過，水可以走這麼遠。爹，這句話你別跟別人說。\n\n櫃上忙，你別熬太晚。等我們回去，我還會天天去隔壁。\n\n連城"},
  egg:{t:"鴛鴦陣裡的盾牌",x:"隆慶二年（1568）五月，抗倭名將戚繼光奉命北上，總理薊州、昌平、保定三鎮練兵。早在東南抗倭時，他就在《紀效新書》裡寫下「鴛鴦陣」：十二人一隊，最前面是藤牌手，後面有狼筅、長槍、短兵，彼此掩護，一人退，全隊都危險。藤牌手不單打獨鬥，他擋在前面，是為了讓身後的人能出手。棋盤上的仕也是這樣：貼著帥守在九宮，最好的守護，是讓帥自己站得起來。",src:["《明史・戚繼光傳》：隆慶二年五月命總理薊州、昌平、保定三鎮練兵事（月份待考）","戚繼光《紀效新書》（十八卷本）〈鴛鴦陣〉圖說","戚繼光《練兵實紀》（北調後所著，可參）"]},
  op:{say:"仕角炮架在帥旁邊，守得穩，才攻得出去。"},
  seal:"兩隻仕都在，帥也沒事。這一盤我守住了。",
  root:"狼筅、明光鎧是擋在前面的東西；寶船、永樂通寶，卻是一直往遠方去的。我收齊了才發現，原來我心裡兩樣都想要。"},
x_bing:{
  bm:["一步一步，小兵也走到老將面前了！","過了河就能橫著走，這下誰也攔不住我！","小卒子也能咬人，看吧，擒住了！"],
  letter:{t:"給繡這半個字的人",x:"給繡這半個字的人：\n\n我不知道妳是誰，只知道這塊布傳了好多代，傳到我手裡時，就只剩這一半，上面繡著半個字。我認得的字，都是送貨時從招牌、貨單上學的，可這半個字，我湊不出它原本的樣子。\n\n我沒有爹娘，也沒有家。揚州那年下大雪，我的草鞋磨破了，坐在橋下擋風的地方，攥著幾文錢，想歇一下再跑。後來有人提著燈，把我接上一條船。\n\n船上有六個孩子。有個戴寬簷帽、帽頂縫著一顆紅珠的小姑娘，坐不住，兩隻腳一直晃。她看我的時候我沒笑，可也不想把眼睛移開。我也說不上來為什麼。\n\n我想問妳，妳繡這塊布的時候，是在等誰？還是在送誰走？妳是不是也跟我一樣，一直往前跑，不敢回頭？\n\n說書的老伯說，兵卒只能往前走，過了河就能橫著走。我想過河。過了河，說不定就能找到另外半塊。\n\n布我天天揣在懷裡，跑再快都沒丟過。等我找到了，再告訴妳它原來是什麼字。\n\n溪兒"},
  egg:{t:"乾隆三十年的揚州",x:"乾隆三十年（1765），乾隆皇帝第四次南巡，龍舟沿著運河經過揚州。揚州是運河上的咽喉，南方的漕糧要從這裡北上，運往京城；李斗的《揚州畫舫錄》記下了當時沿河的園林、市井與迎駕的熱鬧。運河上的漕船，靠的是一個個縴夫和船工，一步一步把船拉過閘口。棋盤上的兵也是這樣，一次只走一步、不能後退，可過了河以後，就能左右橫走，小卒也能決定大局。",src:["《清史稿・高宗本紀》：乾隆三十年正月啟程第四次南巡","李斗《揚州畫舫錄》（乾隆六十年刊，記南巡迎駕與揚州運河景況）","《清史稿・食貨志三・漕運》（漕糧經揚州北運，數額待考）"]},
  op:{say:"兵先挺出去，再一步一步往前，過了河就是我的了！"},
  seal:"小兵過了河，一路活到最後，這印是我的！",
  root:"乾隆通寶、漕船、象棋子……都是我在揚州碼頭跑腿時天天看見的東西。以前它們都是別人的貨，現在是我自己收齊的。我好像有一點像有家的人了。"}
};
