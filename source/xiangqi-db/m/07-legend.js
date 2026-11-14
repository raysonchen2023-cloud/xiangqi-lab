/* ================= 🪨 石桌往事（意見回饋 312）=================
   公園的隱藏角色：石桌棋仙沈石川六十年前的宿敵柳寒舟。在公園下挑戰電腦時，偶爾（約兩成的對局、走到第 6 步以後）
   他會撐著傘站到石台上看你下棋。點他一次解開一章（一盤棋最多一章），12 章都解開後，在他看棋的時候贏一盤，就解開尾聲。
   故事在 data/park-legend.json（虛構）；解開的章節在 千秋印譜 → 石桌往事 可以重讀，開發者模式全部看得到 */
/* 意見回饋 388：人物與年表每位人物都有畫像（Gemini 照石桌往事的人物設定畫，data/people/） */
const PIMG={"錢小滿":"data/people/b1p_qianxiaoman.webp","沈石川":"data/people/shen.webp","柳寒舟":"data/legend/liu_watch.webp","王伯":"data/people/b1p_wangbo.webp","陳伯":"data/people/b1p_chenbo.webp","阿古拉":"data/people/agula.webp","周文淵":"data/people/zhou.webp","秦小禾":"data/people/qinxiaohe.webp","柳老篙":"data/people/liulaogao.webp","錢萬斗":"data/people/b1p_qianwandou.webp","趙守田":"data/people/b1p_zhaoshoutian.webp","賈半步":"data/people/b1p_jiabanbu.webp","芋頭婆":"data/people/b1p_yutoupo.webp","老韓":"data/people/b1p_laohan.webp","秦長庚":"data/people/b1p_qinchanggeng.webp","巴特爾":"data/people/b1p_bateer.webp","靜因師太":"data/people/b1p_jingyin.webp","阿磯":"data/people/b1p_aji.webp","葛鼓兒":"data/people/b1p_gegu.webp","牽小馬的孩子":"data/people/b1p_wulan.webp","賈一著":"data/people/b1p_jiayizhuo.webp","賣豆花的小販":"data/npc/douhua.webp","方聽濤":"data/people/b1p_fangtingtao.webp","朱元璋":"data/people/zhu.webp","王冕":"data/people/b1p_wangmian.webp","常遇春":"data/people/b1p_changyuchun.webp","劉伯溫":"data/people/b1p_liubowen.webp","施耐庵":"data/people/b1p_shinaian.webp","沈萬三":"data/people/b1p_shenwansan.webp","張三丰":"data/people/b1p_lata_daoren.webp"};
let LEGEND_P2=null;const legendData2=()=>LEGEND_P2||(LEGEND_P2=fetch("data/park-legend2.json").then(r=>{if(!r.ok)throw 0;return r.json()}).catch(()=>{LEGEND_P2=null;return null}));
let LEGEND_P=null;const legendData=()=>LEGEND_P||(LEGEND_P=fetch("data/park-legend.json").then(r=>{if(!r.ok)throw 0;return r.json()}).catch(()=>{LEGEND_P=null;return null}));
const legendState=()=>{const L={n:1,epi:false,used:{}};try{const S=jStars(),J=jStages(),pass=J.filter(x=>S[x.id]).length;let k=0;while(k<J.length&&S[J[k].id])k++;
  L.n=Math.min(J.length,k+1);L.pass=pass}catch(e){}return L};
const legendHash=id=>{let h=7;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return h%100};
function legendVisit(st){return[];   /* 意見回饋 315：故事統一從 冒險 → 石桌往事 進入，挑戰電腦裡不再出現 */
  if(!OFF||!st||st.practice||!st.id||(st.moves||[]).length<6)return[];const L=legendState();if(L.epi)return[];
  if(L.n&&legendHash(st.id)>=22&&store.get("legendGame",null)!==st.id)return[];   /* 意見回饋 313：第一次一定遇到，之後約兩成 */
  if(store.get("legendGame",null)!==st.id){store.set("legendGame",st.id);setTimeout(()=>toast(L.n?"🪨 柳寒舟又撐著傘來了，站在旁邊看你下棋（點他聽故事）":"🪨 一位撐傘的灰衣老人走過來，停在旁邊看你下棋……（點他看看）",4500),600)}
  return[{id:"legend",name:"撐傘的灰衣老人",bot:{p:"炮",e:"classic",g:9}}]}
/* 沒開公園 3D 時，在棋盤左上角放一把 🪨，點了一樣聽故事 */
function legendBadge(host,on){if(!host)return;let b=host.querySelector(".lgv");if(!on){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.className="lgv";b.innerHTML="🪨<small>撐傘的老人在看</small>";b.onclick=e=>{e.stopPropagation();legendSheet()};if(getComputedStyle(host).position==="static")host.style.position="relative";host.append(b)}}
function legendCheck(st){return;if(!OFF||!st||!st.result||store.get("legendGame",null)!==st.id)return;const L=legendState();
  if(L.n>=12&&!L.epi&&st.result.w===st.human){L.epi=true;store.set("legend",L);setTimeout(()=>{toast("🪨 你贏了。身後傳來很慢、很輕的腳步聲，走向石桌……",5000);setTimeout(()=>legendRead(13),2500)},1200)}}
async function legendSheet(){const D=await legendData();if(!D)return toast("故事還在載入，等一下再點");const L=legendState(),g=store.get("legendGame",null);
  if(g&&!L.used[g]&&L.n<D.chapters.length){L.used[g]=1;L.n=Math.max(1,L.n)+1;store.set("legend",L)}   /* 第一章本來就能讀，第一次遇到就講第二章 */
  legendRead(Math.max(1,L.n))}
let LEGEND_PREVIEW=false;
/* 意見回饋 394、411：長篇《石桌往事》已寫好的回數（data/park-novel.json，tools/novel_export.js 產生）；跟原本 12 回分開，不用解鎖 */
let NOVEL=null;function novelData(){return NOVEL||(NOVEL=fetch("data/park-novel.json"+(OFF?"":"?v="+Date.now())).then(r=>r.ok?r.json():null).catch(()=>null).then(d=>{if(!d)NOVEL=null;return d}))}
async function novelRead(i){const N=await novelData();if(!N||!N.chapters[i])return;const c=N.chapters[i],R0=store.get("novelRead",{});R0[i]=1;store.set("novelRead",R0);
  sheet("📖 "+c.title,b=>{b.innerHTML=`${jFrame()}<div style="line-height:1.95;font-size:15.5px;white-space:pre-wrap">${esc(c.body)}</div>
    <div class="row" style="gap:8px;margin-top:14px">${i>0?'<button class="btn ghost" id="nvP" style="flex:1">‹ 上一回</button>':""}${i<N.chapters.length-1?'<button class="btn" id="nvN" style="flex:1">下一回 ›</button>':""}</div>`;
    const p=b.querySelector("#nvP"),n=b.querySelector("#nvN");if(p)p.onclick=()=>novelRead(i-1);if(n)n.onclick=()=>novelRead(i+1);b.scrollTop=0})}
/* 意見回饋 394：每一回的章節插畫（Gemini 畫的 art/levels/cg*）；0＝楔子、13＝尾聲 */
/* 第一集新版 36 回的章節插畫（story/book1/art_plan.md：舊圖沿用的掛到內容對得上的回，新圖 b1cg_* 由 Gemini 第 29 批畫；還沒畫好的 onerror 自動略過） */
const LEG_CG={1:["cg01_grey_umbrella","b1cg01_send_chariot"],2:["cg02a_tingtao_heyday","cg02b_tiles_winter"],3:["b1cg03_fishline_board","lv04_cannon_over_hill"],4:["cg03_dukou_arrival","b1cg04_stones_on_tiles"],5:["lv01_candle_out","cg04_dawn_return"],6:["b1cg06_notice_ricestore"],7:["cg05a_chongyang_qihui","cg05b_cellar_milk_tea"],8:["lv02_one_incense","b1cg08_short_incense"],9:["lv05_mountain_still","lv06_three_incense_sacrifice"],10:["cg07a_gong_night","cg07b_ferry_night"],11:["b1cg11_yamen_confess","b1cg11_carried_home"],12:["cg09a_dig_rubble","b1cg12_carving_moves"],13:["b1cg13_reed_rescue"],14:["b1cg14_plum_ink"],15:["lv08_letter_chess","cg08_rumor_pole"],16:["b1cg16_hidden_letter"],17:["b1cg17_girl_with_stone","lv10_orphan_lesson"],18:["b1cg18_general_game"],19:["b1cg19_patting_hull"],20:["b1cg20_yingchang_tent"],21:["lv09_craftsman_table","b1cg21_sedan_curtain"],22:["b1cg22_rice_wager"],23:["b1cg23_rice_measure"],24:["b1cg24_blank_plaque"],25:["b1cg25_blind_boy"],26:["b1cg26_yangzhou_ferry"],27:["b1cg27_two_horses","b1cg27_dawn_lesson"],28:["b1cg28_taoist_north"],29:["cg09b_boat_letter","b1cg29_plank_to_xingmu"],30:["b1cg30_huaian_beggar","b1cg30_first_sight"],31:["b1cg31_archive_lamp","b1cg31_old_and_little_horse"],32:["b1cg32_umbrella_points"],33:["b1cg33_stone_bag","cg10_warehouse_chess"],34:["b1cg34_wooden_box"],35:["b1cg35_rain_reckoning","b1cg35_sedan_gate"],36:["lv12_draw_final","b1cg36_bone_pawn"]};
/* 意見回饋 735 第二期：讀一回從底部抽屜改成整頁 #/shelf/<集>/<回>（正文頁籤）、#/shelf/<集>/<回>/game（棋局頁籤＝原本 jSheet 的關卡說明）。
   legendRead、legendRead2 留著當入口（說書人、過關畫面、對局結果都叫它們），現在只是換網址。tip 是舊參數，整頁沒有地方放，不用了。 */
function legendRead(i,tip){closeSheet();location.hash="#/shelf/1/"+(+i||1)}
function legendRead2(k){closeSheet();location.hash="#/shelf/2/"+(+k||1)}
/* 閱讀輔助（Gemini 評估 11/8，開發者核准）：每回／每章開頭的「📜 百字精華」（data/canju/read-gist.json）；正文每一回第一次出現的名詞加淡底線，點一下小帥跳出白話解釋（data/canju/read-glossary.json）。
   兩份檔的鍵：b1＝石桌往事第一集、b2＝紙譜新局、yh＝雲河七星（07f-ship.js 的 ShipRead 也用）；精華用回數／章數當鍵，辭典是 [{w 詞, d 解釋}]。載不到（或 4 秒沒回應）就照舊顯示正文。
   【小標】那種段落不標；同一個詞一回只標第一次。解釋要給歷史學家核對：story/閱讀小辭典_待考核.md */
let RDAID_P=null;
function rdAid(){return RDAID_P||(RDAID_P=Promise.all(["read-gist","read-glossary"].map(f=>fetch("data/canju/"+f+".json").then(r=>r.ok?r.json():null).catch(()=>null))).then(([g,w])=>{if(!g||!w)RDAID_P=null;return{g,w}}))}
const rdAidQ=()=>Promise.race([rdAid().catch(()=>null),new Promise(r=>setTimeout(()=>r(null),4000))]);
const rdList=(A,bk)=>(A&&A.w&&Array.isArray(A.w[bk])?A.w[bk]:[]).filter(x=>x&&x.w&&x.d);
function rdGistHTML(A,bk,n){const t=A&&A.g&&A.g[bk]&&A.g[bk][n];return t?`<details class="rd-gist" open><summary>📜 百字精華</summary><p>${esc(t)}</p></details>`:""}
function rdMarker(A,bk){const L=rdList(A,bk),used=new Set();if(!L.length)return esc;
  return p=>{p=String(p);if(/^【/.test(p))return esc(p);const M=[];L.forEach((x,i)=>{if(!used.has(i)){const j=p.indexOf(x.w);if(j>=0)M.push([j,x.w.length,i])}});if(!M.length)return esc(p);
    M.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);let o="",k=0;for(const[j,n,i]of M){if(j<k)continue;o+=esc(p.slice(k,j))+`<span class="rd-w" data-gw="${i}" role="button" tabindex="0">${esc(p.slice(j,j+n))}</span>`;k=j+n;used.add(i)}return o+esc(p.slice(k))}}
/* 意見回饋 763：每回的重點句（park-legend*.json 的 kl，legend_export.js 從 story/bookN/keylines.json 匯入並驗過）包成 <strong class="kl">，裡面照樣標辭典詞；一句一回只標第一次。樣式、開關跟雲河七星共用（m.css .shp-rd strong.kl／.shp-klbar；開關 store yunheKL，預設開） */
const klOn=()=>{try{return store.get("yunheKL",true)!==false}catch(e){return true}},klTxt=o=>"✒ 重點句："+(o?"開":"關");
function klMarker(L,mk){L=(Array.isArray(L)?L:[]).filter(x=>typeof x==="string"&&x);if(!L.length)return mk;const used=new Set();
  return p=>{p=String(p);if(/^【/.test(p))return mk(p);const M=[];L.forEach((x,i)=>{if(!used.has(i)){const j=p.indexOf(x);if(j>=0)M.push([j,x.length,i])}});if(!M.length)return mk(p);
    M.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);let o="",k=0;for(const[j,n,i]of M){if(j<k)continue;o+=(j>k?mk(p.slice(k,j)):"")+`<strong class="kl">${mk(p.slice(j,j+n))}</strong>`;k=j+n;used.add(i)}return o+(k<p.length?mk(p.slice(k)):"")}}
function klToggle(root,btn){if(!root||!btn)return;btn.onclick=()=>{vibrate(5);const o=!klOn();store.set("yunheKL",o);root.classList.toggle("kl-off",!o);btn.textContent=klTxt(o);btn.setAttribute("aria-pressed",String(o))}}
function rdBind(root,A,bk){const L=rdList(A,bk);if(!root||!L.length)return;const go=e=>{const s=e.target.closest&&e.target.closest(".rd-w"),x=s&&L[+s.dataset.gw];if(!x)return;e.preventDefault();vibrate(5);rdPop(x)};
  root.addEventListener("click",go);root.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")go(e)})}
function rdPopClose(){const d=document.getElementById("rdPop");if(d)d.remove()}
function rdPop(x){rdPopClose();let im="data/xs/"+(store.get("pSex","m")==="f"?"girl/":"")+"xs_point.webp";try{const c=typeof myChar==="function"&&myChar();if(c)im="data/xs/prev_"+c+".webp"}catch(e){}
  const nm=typeof ASKN==="function"?ASKN():"小帥",d=document.createElement("div");d.id="rdPop";d.className="rd-pop";
  d.innerHTML=`<div class="rd-pop-c" role="dialog" aria-label="${esc(x.w)}的解釋"><img src="${im}" alt="" onerror="this.onerror=null;this.src='data/xs/xs_idle.webp'"><div class="rd-pop-t"><small>${esc(nm)}說：</small><b>${esc(x.w)}</b><p>${esc(x.d)}</p><span>點任何地方關掉</span></div><button class="rd-pop-x" aria-label="關閉">✕</button></div>`;
  d.onclick=()=>{vibrate(5);rdPopClose()};document.body.appendChild(d);try{d.querySelector(".rd-pop-x").focus({preventScroll:true})}catch(e){}}
window.addEventListener("hashchange",rdPopClose);document.addEventListener("keydown",e=>{if(e.key==="Escape")rdPopClose()});
/* 關卡的「‹」、結果的「回書」都回到那一回的棋局頁籤 */
const jChapterHref=s=>s?"#/shelf/"+(s.book===2?2:1)+"/"+s.n+"/game":"#/shelf/1";
function BookChapter(v,b,n,tab){b=b===2?2:1;n=Math.max(1,+n|0);const game=tab==="game";setTop((b===1?"🪨":"📜")+" 第"+CNUM(n)+"回","^#/shelf/"+b);setTabs(false);v.className="view";v.innerHTML='<div class="pad muted">載入中…</div>';
  Promise.all([b===1?legendData():legendData2(),game?null:rdAidQ()]).then(([D,RA])=>{if(!v.isConnected)return;const c=D&&D.chapters[n-1];if(!c){navReplace("#/shelf/"+b);return}   /* RA＝閱讀輔助（百字精華、名詞小辭典），載不到是 null */
    const S=jStars(),J=b===1?jStages():jStages2(),N=D.chapters.length,s=J[n-1]||null,zn=s?(S[s.id]||0):0,pv=DEVMODE()&&(b===1?LEGEND_PREVIEW:LEGEND2_PREVIEW);
    const open=pv||(b===1?(n<=1||n<=legendState().n):(book1Done()&&(n===1||!!(J[n-2]&&S[J[n-2].id]))));
    if(!open){v.innerHTML=`<div class="pad"><div class="card muted" style="line-height:1.8">🔒 第${CNUM(n)}回還沒打開：${b===2&&!book1Done()?"第一集 36 關都過了，第二集才會打開。":"先過第"+CNUM(n-1)+"回的棋。"}<br><a href="#/shelf/${b}">回目錄</a></div></div>`;return}
    const sOk=!!s&&(b===1?jOpen(J,n-1):true),nextOk=n<N&&(zn>0||pv),lvn=s?(b===1?s.lvName||s.name:((c.lv||{}).name||s.lvName||"")):"";
    if(!game&&!pv)legReadMark(b,n);
    const tabs=`<div class="bk-tabs" role="tablist"><button role="tab" data-tab=""${game?"":' class="on" aria-selected="true"'}>📖 正文</button><button role="tab" data-tab="game"${game?' class="on" aria-selected="true"':""}>⚔ 棋局${zn?`<small>${ziStr(zn)}</small>`:""}</button></div>`;
    const nav=`<div class="row bk-nav">${n>1?'<button class="btn ghost" id="cpP" style="flex:1">‹ 上一回</button>':""}${n<N?`<button class="btn${nextOk?"":" ghost"}" id="cpN" style="flex:1"${nextOk?"":" disabled"}>下一回 ›</button>`:""}</div>
      ${n<N&&!nextOk?`<p class="muted bk-navt">過了這一回的棋，就能讀第${CNUM(n+1)}回。</p>`:""}${b===1&&n===N&&book1Done()?'<button class="btn ghost" id="cpB2" style="width:100%;margin-top:8px">📜 第二集《紙譜新局》已經上架 ›</button>':""}`;
    let html;
    if(!game){const cg=b===1?(LEG_CG[n]||[]):(c.cg||[]),img=f=>`<img class="bk-cg" src="data/levels/${f}.webp" alt="" loading="lazy" onerror="this.remove()">`;
      const ps=String(c.body||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
      const klN=Array.isArray(c.kl)&&c.kl.length,klY=klOn();
      html=`<div class="pad shp-rd bk-ch${klN&&!klY?" kl-off":""}">${tabs}<h2 class="shp-rh">${esc(c.title)}</h2><p class="muted shp-rs">${provChip(c.tags?c:{tags:D.tags||["fiction"]})}《${b===1?"石桌往事":"紙譜新局"}》${b===2&&(c.year||c.place)?"・"+esc([c.year,c.place].filter(Boolean).join("・")):""}</p>${klN?`<div class="shp-klbar"><button class="lk shp-klsw" id="klTg" aria-pressed="${klY}" title="重點句用朱紅粗體標出來">${klTxt(klY)}</button></div>`:""}
        ${rdGistHTML(RA,"b"+b,n)}${cg[0]?img(cg[0]):""}${jFrame()}${(mk=>ps.map(p=>`<p>${mk(p)}</p>`).join(""))(klMarker(c.kl,rdMarker(RA,"b"+b)))}${cg.slice(1).map(img).join("")}
        ${s?`<div class="card bk-end"><p>這一回到這裡。說書人把棋盤推過來：</p><button class="btn${zn?" ghost":""}" id="cpG">⚔ 去下這一回的棋：「${esc(lvn)}」${zn?"・"+ziStr(zn):""}</button></div>`:""}${nav}</div>`}
    else{const G=c.game,lv=c.lv||{},Rr=s?jRunGet(s.id):null,mid=!!(Rr&&!Rr.done&&Rr.k>0&&G),HD=s?jHid()[s.id]:null,sc=b===1?(D.scenes||[]).filter(x=>x.ch===n):[];
      const how=s&&{puz:"從題庫出 5 題，答對 3 題過關：3 題收兵、4 題收馬、5 題全對收車。",ai:`跟第 ${s.lv} 級的電腦下一盤，贏了就過關：30 回合內贏收車、50 回合內收馬、其他收兵。`,boss:`守關的擂主是「${s.era&&ARENA[s.era]?ARENA[s.era].name:""}」（第 ${s.lv} 級的實力）。贏了就過關，收幾顆子照回合數算，跟對弈一樣；還會順便蓋上擂台的章。`}[s.t];
      const gate=s&&!sOk?(b===1&&!jLvOk(s)?`🔒 這一卷要 Lv ${JR[s.r].lv} 或棋罐 ${JAR_GATE[s.r]} 子：下船到 🏮 驛站找人下棋練等，或回前面的回多收幾顆子。`:"🔒 先過前一回的棋。"):"";
      html=`<div class="pad bk-ch bk-game">${tabs}<h2 class="shp-rh">${esc(c.title)}</h2>
        ${!s?'<div class="card muted">這一回沒有關卡。</div>':s.t==="lv"&&G?`<div class="card bk-gi"><b>🎴「${esc(G.name||lv.name||lvn)}」</b>${lv.type?`<span class="muted">（${esc(lv.type)}）</span>`:""}<p>${esc(G.intro||lv.play||"")}</p></div>
          <p class="bk-gp"><b>過關</b>：${esc(G.pass||"")}<br><b>收車</b>：${esc(lvStar3(G))}${G.skill&&b===2?`<br><b>練什麼</b>：${esc(G.skill)}`:""}</p>`
        :`<div class="card bk-gi"><b>${jIcon[s.t]||"⚔"}「${esc(lvn)}」</b>${lv.type?`<span class="muted">（${esc(lv.type)}）</span>`:""}${lv.play?`<p>${esc(lv.play)}</p><p class="muted" style="font-size:12.5px">這一關的特製玩法還在做（要先請引擎驗過局面）。做好之前先這樣過關，現在收到的子會保留：</p>`:""}<p>${esc(how||"")}</p></div>`}
        ${s?`<p class="bk-gp"><b>目前</b>：${zn?ziHTML(zn,HD&&HD.got):"還沒收子"}</p>`:""}${gate?`<p class="bk-gate">${esc(gate)}</p>`:""}
        ${s&&sOk?`${HD&&!HD.got?`<button class="btn" id="cpHd" style="width:100%;margin-bottom:6px">${HIDN.ic} ${HIDN.lv}（${HD.k==="hard"?"困難":"簡單"}）</button>`:""}${mid?`<button class="btn" id="cpCt" style="width:100%">▶ 繼續（第 ${Rr.k+1}／${G.steps.length} 步）</button>`:""}<button class="btn${mid?" ghost":""}" id="cpGo" style="width:100%;margin-top:6px">${mid?"從頭開始":zn?"再挑戰一次":"▶ 開始"}</button>`:""}
        ${sc.map(x=>`<button class="btn ghost" data-sc="${esc(x.key)}" style="width:100%;margin-top:10px">🕰 回到當年：${esc(x.title)}${(store.get("sceneDone",{})[x.key])?"（已過關）":`（答對 +${SCENE_PTS[0][1]}～${SCENE_PTS[2][1]} 段位積分）`}</button>`).join("")}
        <button class="lk" id="cpRd" style="margin-top:10px">📖 回到第${CNUM(n)}回的正文</button>${nav}</div>`}
    v.innerHTML=html;if(!game){rdBind(v.querySelector(".bk-ch"),RA,"b"+b);klToggle(v.querySelector(".bk-ch"),v.querySelector("#klTg"))}
    const on=(q,fn)=>{const e=v.querySelector(q);if(e)e.onclick=()=>{vibrate(5);fn()}},base="#/shelf/"+b+"/"+n;
    v.querySelectorAll("[data-tab]").forEach(x=>x.onclick=()=>{vibrate(5);navReplace(base+(x.dataset.tab?"/"+x.dataset.tab:""))});
    on("#cpG",()=>navReplace(base+"/game"));on("#cpRd",()=>navReplace(base));
    on("#cpP",()=>navReplace("#/shelf/"+b+"/"+(n-1)));on("#cpN",()=>{if(nextOk)navReplace("#/shelf/"+b+"/"+(n+1))});on("#cpB2",()=>{goUp("#/ship/shelf")});
    on("#cpGo",()=>{if(s.t==="lv"){jRunSet({id:s.id,k:0,miss:0,hint:false,intro:1});location.hash="#/journey/"+s.id}else if(s.t==="puz")location.hash="#/journey/"+s.id;else jPlay(s)});   /* 說明已經在棋局頁籤看過，按開始直接進第一步 */
    on("#cpCt",()=>{location.hash="#/journey/"+s.id});on("#cpHd",()=>{jRunSet(null);location.hash="#/journey/"+s.id+"~v"});
    v.querySelectorAll("[data-sc]").forEach(x=>x.onclick=()=>{vibrate(5);location.hash="#/legend/"+x.dataset.sc});
    try{const sv=document.scrollingElement;if(sv)sv.scrollTop=0;v.scrollTop=0}catch(e){}});
  return{}}
/* 意見回饋 314：人物（出生年、六十年前和重逢時幾歲）與元末明初大事年表（真實歷史＋故事） */
/* 意見回饋 474（開發者）：看完人物資訊要能回到人物列表，而且停在剛才捲到的位置 */
/* 意見回饋 556：人物旁邊標「真實人物／虛構人物／真假未定」（照 note 開頭的 📜 判斷：📜 真實人物、📜 真假未定，沒有 📜 的是故事裡編的） */
const pplTag=x=>{const n=String(x&&x.note||""),[t,c]=/^📜\s*真假未定/.test(n)?["真假未定","#B5652E"]:/^📜/.test(n)?["真實人物","#2F6B4F"]:["虛構人物","#8A6D5A"];return` <span style="display:inline-block;font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:9px;border:1px solid ${c};color:${c};vertical-align:2px">${t}</span>`};
/* 第二集《紙譜新局》也有人物與年表（story/book2/people.json → park-legend2.json）：bk=2 讀第二集的資料，「回人物列表」也回第二集 */
async function legendTimeline(keep,bk){bk=bk===2?2:1;const D=await (bk===2?legendData2():legendData());if(!D)return;const P=D.people||[],T=D.timeline||[];
  if(keep)setTimeout(()=>{const s=document.getElementById("sheet");if(!s)return;s.scrollTop=keep[0];const sb=s.querySelector(".sh-b");if(sb)sb.scrollTop=keep[1]},40);
  sheet("📅 人物與年表",b=>{b.innerHTML=`<div class="sec-t" style="margin-top:0">人物</div>${P.map(x=>{const im=PIMG[x.name];return`<div class="ppl" data-pp="${esc(x.name)}" role="button" tabindex="0" data-axk style="cursor:pointer;${im?"":""}"${im?' style="flex-direction:row;gap:10px;align-items:center"':""}>${im?`<img src="${im}" alt="" onerror="this.remove()" style="flex:none;width:52px;height:70px;object-fit:contain">`:""}<div class="pn" style="flex:1;min-width:0"><b>${esc(x.name)}</b>${pplTag(x)}（${x.born}${x.died?"–"+x.died:""}）${ageOfP(x)?`<span class="muted" style="font-size:12.5px">${esc(ageOfP(x))}</span>`:""}<small>${esc(x.note||"")}</small>${x.verse?`<small style="font-family:var(--serif);font-style:italic;margin-top:2px">${esc(String(x.verse).split(/[。\n]/).filter(Boolean).slice(0,2).join("，"))}</small>`:""}</div></div>`}).join("")}
    <div class="sec-t">大事年表</div>${T.map(x=>`<div class="tlr"><div class="ty"><b>${x.y}</b><small>${esc(x.era||"")}</small></div><div class="tt">${x.h?"📜":"🪨"} ${esc(x.t)}</div></div>`).join("")}
    <p class="muted" style="font-size:12px;line-height:1.7;margin-top:8px">${bk===2?"📜 是真實的歷史；🪨 是紙譜新局的故事（虛構）。錢滿川、白映紅、方小醒和雲河鎮都是編的；徐芝、陳學禮、朱晉楨是真有其人，跟他們下棋的事是故事裡編的。":"📜 是真實的歷史；🪨 是石桌往事的故事（虛構）。沈石川、柳寒舟、阿古拉、周文淵和雲河鎮都是編的。"}</p>`;
    b.querySelectorAll("[data-pp]").forEach(x=>x.onclick=()=>{const n=x.dataset.pp,p=P.find(z=>z.name===n),L=PEOPLE_LOOK[n];if(!L&&!PIMG[n])return;vibrate(5);const sh=document.getElementById("sheet"),keep=[sh?sh.scrollTop:0,sh&&sh.querySelector(".sh-b")?sh.querySelector(".sh-b").scrollTop:0];const pid=(m=>m?(m[1]==="npc"?"n:":"p:")+m[2]:/legend\/liu|journey\/char_liu_old/.test(PIMG[n]||"")?"j:liu_old":null)(String(PIMG[n]||"").match(/(people|npc)\/(\w+)\.webp/)),NPC=typeof PARK_NPC!=="undefined"?PARK_NPC.find(z=>z.name===n):null;   /* 意見回饋 719：賣豆花的小販這類園子棋友（data/npc/）也接上 3D 模型 n_<id>，棋子字照園子名單；原本只認 people/，找不到模型就顯示下半身不完整的畫像 */
      figView(L||pid?oppFig({p:L?L.pc:NPC&&NPC.pc||"將",e:"classic",g:9,npc:n,hat:L&&L.hat,hc:L&&L.hc,robe:L&&L.robe,cus:pid}):null,"🪨 "+n,`${ageLine(ageOfP(p))}<p class="muted" style="font-size:13.5px;line-height:1.7;margin:0">${esc(p&&p.note||"")}</p>`,[["← 回人物列表",()=>legendTimeline(keep,bk)],["關閉",()=>closeSheet(),true]],PIMG[n]||null)})})}
/* 意見回饋 674：石桌往事、紙譜新局搬到星槎的書架（#/shelf/1、#/shelf/2）；#/adventure 改成雲河星槎頁（07f-ship.js）。SHELF()＝目前那一本書的網址 */
const SHELF=b=>"#/shelf/"+(b||(store.get("legBook",1)===2&&(book1Done()||DEVMODE())?2:1));
function legendBook(){closeSheet();LEGEND_PREVIEW=false;location.hash=SHELF()}
/* 意見回饋 316：石桌往事改成一整頁——上面是你的棋童小卡，中間是雲河棋路、驛站、棋童資料、人物年表，下面是章節 */
/* 第二集《紙譜新局》（開發者 11/4）：石桌往事頁上面切換第一集、第二集 */
/* 意見回饋 513（開發者）：第二集先藏起來，只有開發者模式看得到（玩家只看到第一集，不顯示切換） */
/* 意見回饋 546（開發者）：第二集開放給大家，但要第一集 36 關都過了才解鎖；開發者也一樣，要看全文用最下面的「👁 開發者預覽」 */
const book1Done=()=>{try{const J=jStages(),S=jStars();return J.length>0&&J.every(x=>S[x.id])}catch(e){return false}};let LEGEND2_PREVIEW=false;
/* 意見回饋 735（開發者 11/7 選方案 B，先做第一期「瘦身」；方案在 story/石桌往事書頁改版方案_735.md）：兩本書同一套版面——
   上面是書封（data/shipmap/book1_cover.webp、book2_cover.webp，直式 3:4；圖還沒有時用水墨化的插畫＋直書書名代替），書封上的書籤卡只有「讀下去」「闖關」兩顆；
   下面是目錄：每回一行＝回數＋回目＋三格收子（兵馬車）。這份目錄就是章回棋路（#/journey 舊網址轉到這裡）；最後是附錄（人物與年表、雲河地圖）。
   我的資料、驛站、修為、兩集切換都不放在書裡（首頁頭像、行囊、渡口都有）；底部選單隱藏，「‹」回書架。
   legRead＝{1:{回:時間},2:{…}}：讀過哪幾回（目錄上「讀過還沒闖」顯示灰點）。 */
const legReadMark=(b,k)=>{const R=store.get("legRead",{})||{},E=R[b]||(R[b]={});if(!E[k]){E[k]=Date.now();store.set("legRead",R)}};
const legReadOf=b=>((store.get("legRead",{})||{})[b])||{};
/* 直接進這一回的關卡（不再先開 jSheet 說明抽屜；故事關的第一步就是說明頁） */
function jGo(s){if(!s)return;vibrate(5);if(s.book===2||s.t==="lv"||s.t==="puz")location.hash="#/journey/"+s.id;else jPlay(s)}
const BOOK_META={1:{t:"石桌往事",ic:"🪨",sub:"第一集・元末明初",one:"元末烽火裡，一張石桌、一盤沒下完的棋",fb:"data/stonetable/scene.webp"},
  2:{t:"紙譜新局",ic:"📜",sub:"第二集・明朝隆慶",one:"明朝隆慶年間，一顆借來的骨卒",fb:"data/levels/b2cg01_dawn_sweep.webp"}};
function Adventure2(v){store.set("legBook",2);return Adventure(v)}
function Adventure(v){const bk=store.get("legBook",1)===2&&(book1Done()||DEVMODE())?2:1,M=BOOK_META[bk];if(bk===1)LEGEND_PREVIEW=false;else LEGEND2_PREVIEW=false;
  setTop(M.ic+" "+M.t,"^#/ship/shelf");setTabs(false);v.className="view";v.innerHTML='<div class="pad muted">載入中…</div>';
  if(bk===1)setTimeout(()=>{if(/^#\/shelf\/1/.test(location.hash))try{jarCheck()}catch(e){}},900);   /* 原本打開章回棋路頁才補發的棋罐獎勵，改在第一集目錄補 */
  (bk===1?legendData():legendData2()).then(D=>{if(!v.isConnected)return;if(!D){v.innerHTML='<div class="pad"><div class="card muted">故事載入失敗，等一下再試</div></div>';return}
    const S=jStars(),J=bk===1?jStages():jStages2(),N=D.chapters.length,RD=legReadOf(bk),b1=book1Done(),st=k=>J[k-1]||null,zn=k=>{const s=st(k);return s?(S[s.id]||0):0};
    let raw=1;while(raw<=J.length&&S[J[raw-1].id])raw++;
    const done=raw>J.length,cur=bk===1?Math.min(legendState().n,N):Math.min(raw,N);
    const openK=k=>bk===1?(k<=1||k<=legendState().n):(b1&&k<=raw);
    const stOk=k=>{const s=st(k);if(!s)return false;return bk===1?jOpen(J,k-1):openK(k)};
    const gateTxt=s=>bk===1&&s&&!jLvOk(s)?`🔒 要 Lv ${JR[s.r].lv} 或棋罐 ${JAR_GATE[s.r]} 子`:"";
    const title=k=>{const c=D.chapters[k-1];return c?c.title:""},lvName=k=>{const s=st(k);if(!s)return"";return bk===1?(s.lvName||s.name):(((D.chapters[k-1]||{}).lv||{}).name||s.name||"")};
    const tot=J.reduce((a,s)=>a+(S[s.id]||0),0);
    /* 書籤卡：讀下去、闖關（這一回的棋還沒過才出現） */
    const sc=st(cur),scN=zn(cur),fight=sc&&!scN?(stOk(cur)?`<button class="btn" id="bkGo">⚔ 闖關：「${esc(lvName(cur))}」</button>`:`<button class="btn ghost" id="bkGo">${gateTxt(sc)||"🔒 先過前一回的棋"}</button>`):"";
    const mark=`<div class="bk-mark"><b>🔖 ${done?"這一集都讀完、闖完了":"讀到第"+CNUM(cur)+"回"}</b><small>${esc(title(cur))}</small>
      <div class="bk-mbt"><button class="btn${fight&&stOk(cur)?" ghost":""}" id="bkRead">📖 ${done?"從第一回重讀":RD[cur]?"讀下去":"讀第"+CNUM(cur)+"回"}</button>${fight}${done&&bk===1?'<button class="btn ghost" id="bkB2">📜 第二集已經上架 ›</button>':""}</div></div>`;
    /* 目錄分組：第一集照 5 卷（等級門檻跟著卷走），第二集照 4 幕 */
    const groups=bk===1?JR.map((R,ri)=>({n:roadSeg(ri),ks:Array.from({length:R.ch[1]-R.ch[0]+1},(_,j)=>R.ch[0]+j),gate:R.lv>1&&J.some(s=>s.r===ri)&&!jLvOk(J.find(s=>s.r===ri))?`🔒 Lv ${R.lv} 或棋罐 ${JAR_GATE[ri]} 子才能進・下船到驛站找人下棋就能升級`:""}))
      :[...new Set(D.chapters.map(c=>c.actName||""))].map(a=>({n:a,ks:D.chapters.filter(c=>(c.actName||"")===a).map(c=>c.n),gate:""}));
    const zi=k=>{const n=zn(k),rd=!!RD[k]&&!n;return`<span class="bk-zi${rd?" rd":""}" aria-label="${n?"收了 "+n+" 顆子":rd?"讀過了，還沒闖":"還沒收子"}">${ZI.map((z,i)=>`<i class="${i<n?"on":""}">${i<n?z:rd?"・":""}</i>`).join("")}</span>`};
    const row=k=>{const o=openK(k)||(bk===1&&LEGEND_PREVIEW&&DEVMODE());return`<button class="bk-row${k===cur&&!done?" cur":""}" data-k="${k}"${o?"":" disabled"}><span class="bk-no">${CNUM(k)}</span><span class="bk-tt">${o?esc(title(k)):"？？？"}${k===cur&&!done?" 🔖":""}${o?"":`<small>🔒 ${bk===2&&!b1?"第一集 36 關都過了才會打開":"先過第"+CNUM(k-1)+"回的棋"}</small>`}</span>${zi(k)}</button>`};
    const toc=groups.map(g=>{const got=g.ks.reduce((a,k)=>a+zn(k),0);return`<div class="bk-g"><div class="bk-gh"><b>${esc(g.n)}</b><span>${got}／${g.ks.length*3} 子</span></div>${g.gate?`<p class="bk-gate">${esc(g.gate)}</p>`:""}${g.ks.map(row).join("")}</div>`}).join("");
    const ppl=(D.people||[]).length;   /* 第二集有 people.json 之後，附錄也出現人物與年表 */
    v.innerHTML=`<div class="bk-page"><div class="bk-cover bk${bk}"><div class="bk-fb" style="background-image:url(${M.fb})"></div><img src="data/shipmap/book${bk}_cover.webp" alt="" onerror="this.remove()"><i class="bk-star s1"></i><i class="bk-star s2"></i><i class="bk-star s3"></i>
      <div class="bk-title"><b>${esc(M.t)}</b><small>${esc(M.sub)}</small></div></div>${mark}
      <div class="pad bk-toc"><div id="bkRes"></div>
        <p class="bk-one">${esc(M.one)}・收子 ${tot}／${J.length*3}</p>
        <details class="bk-rule"><summary>每回最多收三顆子：兵＝過關、馬＝失誤少、車＝幾乎沒失誤 ›</summary><p>${esc(D.blurb||"")}</p><p>每一回後面都有一盤棋。讀完一回、過了那一盤，就能讀下一回。收到的子放進棋罐，可以換提示棋、悔棋符、稱號。車＝失誤不超過 1 次、又沒用提示棋。${bk===1?"後面幾卷有等級門檻，等級不夠就下船到驛站找人下棋，或回前面的回多收幾顆子。":""}</p></details>
        <div class="bk-th">目　錄</div>${toc}
        ${ppl||bk===1?`<div class="bk-th">附　錄</div>`:""}<div class="bk-apx">${ppl?'<button class="bk-ap" id="bkTl">📅 人物與年表 ›</button>':""}${bk===1?'<button class="bk-ap" id="bkMap">🗺 雲河地圖 ›</button>':""}</div>
        <p class="muted" style="font-size:12px;margin-top:10px">${bk===1||ppl?"故事是虛構的；年表裡標 📜 的是真實歷史。":"故事是虛構的。"}${bk===2&&!b1?"<br>🔒 讀完第一集、36 關都過了才會打開":""}</p>
        ${DEVMODE()?'<button class="lk" id="bkDev" style="margin-top:4px">👁 開發者預覽全文（玩家看不到這個按鈕）</button>':""}</div></div>`;
    const on=(q,fn)=>{const e=v.querySelector(q);if(e)e.onclick=()=>{vibrate(5);fn()}};
    const rd=k=>bk===1?legendRead(k):legendRead2(k);
    on("#bkRead",()=>rd(done?1:cur));on("#bkGo",()=>{if(stOk(cur))return jGo(sc);toast(gateTxt(sc)?gateTxt(sc).replace("🔒 ","等級不夠：")+"・下船到 🏮 驛站找人下棋練等，或回前面的回多收幾顆子":"先過前一回的棋")});
    on("#bkB2",()=>{location.hash="#/ship/shelf"});on("#bkTl",()=>legendTimeline(null,bk));on("#bkMap",()=>jMap3d(J,S));
    on("#bkDev",()=>{if(bk===1){LEGEND_PREVIEW=true;legendRead(1)}else{LEGEND2_PREVIEW=true;legendRead2(1)}});
    v.querySelectorAll(".bk-row[data-k]").forEach(b=>b.onclick=()=>{vibrate(5);rd(+b.dataset.k)});
    jResume(v.querySelector("#bkRes"),j=>J.some(s=>s.id===j));   /* 只有這本書的對局下到一半才出現 */
    {const c=v.querySelector(".bk-row.cur");if(c&&store.get("advScrolled",0)!==bk*100+cur){store.set("advScrolled",bk*100+cur)}}});
  return{}}
/* ---------- 🎒 棋童資料：等級、修為、提示棋、棋盤收藏、棋譜、秘境棋友 ---------- */
const bag=()=>({boards:[],records:[],...store.get("bag",{})}),bagSave=B=>store.set("bag",B);
const RAR={rare:["稀有","#C9962B"],normal:["一般","#3A7BD5"],broken:["損壞","#8E8E8E"]};
/* 意見回饋 536（開發者）：「我的角色／棋童／棋童資料／官階」整合成一頁「🙂 我的角色」，入口在首頁左上角的頭像。
   最上面是角色卡（點頭像看 3D、換角色、改名、換棋子）和官階，下面接原本棋童資料的修為、寶物、珍品、秘境棋友 */
function rankInfo(){let p=0;try{p=(JSON.parse(localStorage.getItem("xq_cpuRate")||"null")||{}).pts||0}catch(e){}const TH=[1500,1150,1000,800,600,400,200,100,0],g=TH.findIndex(t=>p>=t)+1,lo=TH[g-1],hi=g>1?TH[g-2]:null,era=store.get("era","classic");
  return{p,g,hi,pc:hi?Math.round((p-lo)/(hi-lo)*100):100,name:RANKT(era,g),next:g>1?RANKT(era,g-1):""}}
/* 意見回饋 590（開發者）：跟電腦下（含石桌往事）時，自己那一欄不寫「你」，寫角色名：小帥／小師妹 */
const meCall=()=>myChar()?WX_CHARS[myChar()].n:mySex()==="f"?"小師妹":"小帥";
const meName=()=>myChar()?WX_CHARS[myChar()].n:(mySex()==="f"?"小帥妹":"小帥")+(myStyle()==="real"?"":"Q版"),meImg=()=>myChar()?meImgFor(myChar()):meImgFor(myStyle(),mySex());
/* 意見回饋 545：預覽圖的圓牌是空白的，這裡在圓牌上寫上「換棋子」選的那顆字；ME_DISC＝圓牌中心與半徑（圖是 300×400） */
const ME_DISC={q_boy:[150,245,58],real_boy:[143,245,60],q_girl:[151,250,53],real_girl:[140,240,56]},ME_IMGC={};
function meImgFor(st,sx){const k=/^x_/.test(st||"")?st:(st==="real"?"real":"q")+"_"+(sx==="f"?"girl":"boy"),f=`data/xs/prev_${k}.webp`,pc=myPc(),ck=k+"|"+pc;if(!ME_DISC[k])return f;   /* 武俠角色的圓牌被衣服蓋住，不寫字 */if(ME_IMGC[ck]&&ME_IMGC[ck]!==1)return ME_IMGC[ck];
  if(!ME_IMGC[ck]){ME_IMGC[ck]=1;const im=new Image();im.onload=()=>{try{const D=ME_DISC[k],c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext("2d"),sc=c.width/300;x.drawImage(im,0,0);
    const ff=(getComputedStyle(document.documentElement).getPropertyValue("--serif")||"").trim()||"serif";x.font=`900 ${Math.round(D[2]*1.3*sc)}px ${ff}`;x.textAlign="center";x.textBaseline="middle";x.fillStyle="帥仕相俥傌炮兵".includes(pc)?"#C8102E":"#1E1A16";x.fillText(pc,D[0]*sc,D[1]*sc+D[2]*.06*sc);
    ME_IMGC[ck]=c.toDataURL("image/png");document.querySelectorAll(`img[data-meimg="${ck}"]`).forEach(y=>y.src=ME_IMGC[ck])}catch(e){delete ME_IMGC[ck]}};im.onerror=()=>{delete ME_IMGC[ck]};im.src=f}
  return f}
const meImgTag=(st,sx)=>{if(myChar()&&st===myStyle()&&sx===mySex())st=myChar();const k=/^x_/.test(st||"")?st:(st==="real"?"real":"q")+"_"+(sx==="f"?"girl":"boy");return `data-meimg="${k}|${myPc()}"`};
const meImgRefresh=()=>document.querySelectorAll("img[data-meimg]").forEach(y=>{const[k]=y.dataset.meimg.split("|");y.dataset.meimg=k+"|"+myPc();if(/^x_/.test(k)){y.src=meImgFor(k);return}const[st,sx]=k.split("_");y.src=meImgFor(st,sx==="girl"?"f":"m")});
/* 意見回饋 691：雲河七星的朝代、出生年、上船年紀標在 3D 名字底下 */
function wxBornLine(){const c=typeof WX_CHARS!=="undefined"&&WX_CHARS[myChar()];if(!c||!c.born)return"";const y=(c.born.match(/（([^）]+)）/)||[])[1]||c.born,a=((c.up||"").match(/([一二三四五六七八九十]+歲)$/)||[])[1]||"";return`${c.era}・${y} 年生${a?"・"+a+"上船":""}`}
function meFigOpen(src){vibrate(5);figView(myLook()||{p:botPc(),e:store.get("era","classic"),g:9},"🙂 "+meName(),`<p class="muted" style="font-size:13.5px;margin:0">${esc(myName()||"還沒取名字")}・園子裡的你、線上對手看到的你都是這個樣子</p>${typeof wxBornLine==="function"?ageLine(wxBornLine()):""}`,[["關閉",()=>closeSheet(),true]],src||meImg())}
function meChip(){const tb=$("#topbar");if(!tb)return;{const o=document.getElementById("meChip");if(o)o.remove()}const R=rankInfo(),I=xpInfo(),b=document.createElement("button");b.id="meChip";b.type="button";b.setAttribute("aria-label","我的角色");
  b.innerHTML=`<img src="${meImg()}" ${meImgTag(myStyle(),mySex())} alt="" onerror="this.replaceWith(document.createTextNode('🙂'))"><small>${esc(R.name)}<br>修為 Lv ${I.L}</small>`;b.onclick=()=>{vibrate(5);location.hash="#/me"};tb.append(b)}   /* 意見回饋 570：頭像放到最右上 */
/* 意見回饋 553：我的角色頁重新設計（兩位 RPG 專家合併）：立繪舞台 → 境界台（官階九層塔、修為八角玉環）→ 六角章 → 什錦花窗收藏格。
   收藏格點了照舊打開原本的清單（借用 Profile 畫好、藏起來的圓鈕）；沒有說明小字，點官印／九層塔看九個品級，點玉環看修為 */
/* 意見回饋 571：我的角色頁的朝代美術素材（Gemini 畫的，data/me_<朝代>/）；有素材的朝代才套用，其他朝代維持程式畫的版面 */
const ME_ART=new Set(["song","classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","yuan","ming","qing"]),
  /* 意見回饋 571：匾心（p）、六角牌框（b）或花窗底牆（w）是深色的朝代，字改成淺色（照素材中間的亮度量的，亮度 < 120 算深色） */
  /* 意見回饋 589（開發者：清朝的上排花窗蓋到屋簷）：每個朝代牆面的屋簷（含彩繪樑）佔牆圖高度的比例，花窗一律排在屋簷下面（牆圖 1100×821、cover 鋪滿，所以照實際大小算） */
  ME_EAVE={song:.125,classic:.225,qin:.19,han:.132,sanguo:.29,weijin:.41,nanbei:.33,sui:.38,tang:.403,wudai:.4,yuan:.218,ming:.33,qing:.315}   /* 意見回饋 642（11/6）：三國、南北朝、秦、五代、隋、魏晉、唐的牆照清朝版面重畫（屋簷＋整片牆到底），屋簷高度跟著改 */,
  ME_DARK={qin:"bw",han:"bw",sanguo:"bw",tang:"bw",wudai:"bw",ming:"pbw"},ME_ART_FILES=["stage_bg.webp","pedestal.webp","name_plaque_h.webp","seal.webp","jade_ring.webp","pagoda.webp","hex_badge.webp","wall.webp","win_b.webp","win_r.webp","win_s.webp","win_z.webp","mask_b.png","mask_r.png","mask_s.png","mask_z.png","view_b.webp","view_r.webp","view_s.webp","view_z.webp"];
const ME_WIN={b:"M36 2H84L118 36V72L84 106H36L2 72V36Z",r:"M2 17A136 136 0 0 1 118 17L81 95A50 50 0 0 0 39 95Z",
  s:"M26 20A44 44 0 0 1 94 20A36 36 0 0 1 94 88A44 44 0 0 1 26 88A36 36 0 0 1 26 20Z",
  z:"M44 4H76V10C76 16 68 18 68 26C68 32 112 40 112 68C112 92 92 104 60 104C28 104 8 92 8 68C8 40 52 32 52 26C52 18 44 16 44 10Z"};
const meWin=(k,ic,lb,n,cnt,mist)=>`<button class="mw${cnt?"":" empty"}" data-c="${k}" aria-label="${lb} ${n}" style="--mist:${cnt?(mist||0).toFixed(2):.22}"><span class="wf"><span class="wv"></span><svg viewBox="0 0 120 108" aria-hidden="true"><path class="o" d="${ME_WIN[k]}"/><path class="i" d="${ME_WIN[k]}"/></svg><span class="ic">${ic}</span></span><b>${lb}<small>${n}</small></b></button>`;
function rankSheet(){const R=rankInfo(),era=store.get("era","classic");sheet("🏛 官階",b=>{b.innerHTML=`<div class="items" style="padding:0">${[1,2,3,4,5,6,7,8,9].map(g=>`<div class="item"${g===R.g?' style="box-shadow:inset 0 0 0 2px var(--accent)"':g<R.g?' style="opacity:.5"':""}><span class="lb">${g===R.g?"🏛":g<R.g?"🔒":"✓"}</span><span class="tx"><b>${esc(RANKT(era,g))}</b></span></div>`).join("")}</div>`})}
function meEave(d,era){const w=d.querySelector(".mwall"),f=ME_EAVE[era];if(!w||f==null||!w.isConnected)return;const IW=1100,IH=821;w.style.paddingTop="0px";const C=w.getBoundingClientRect().height,W=w.clientWidth;if(!W)return;let p=f*W*IH/IW;if((C+p)/IH>W/IW)p=f*C/(1-f);w.style.paddingTop=Math.round(p+10+.05*(C+p))+"px"}   /* 意見回饋 642（開發者 11/6）：花窗要掛在牆上、不能碰到屋簷——屋簷下面多留一段空隙（牆高的 5%） */
const ME_INK=false;   /* 意見回饋 766（開發者 11/8）：水墨版太暗沉，我的角色頁改回原本鮮明的背景（_ink 檔保留） */
function Me(v){Profile(v);setTop("🙂 我的角色","#/");setTabs(true,"#/");const pad=v.querySelector(".pad");if(!pad)return;
  const R=rankInfo(),I=xpInfo(),H=hintInfo(),B=bag(),Sx=jSecrets(),S=jStars(),Js=jStages(),L=legendState(),star=Js.reduce((a,x)=>a+(S[x.id]||0),0),
    xp=I.need?Math.round(I.rest*100/I.need):100,nS=Object.keys(Sx).length,nZ=Object.values(relicsMine()).reduce((a,x)=>a+x.length,0),pc=myPc(),red="帥仕相俥傌炮兵".includes(pc),d=document.createElement("div");
  d.className="me2";{const era=store.get("era","classic");if(ME_ART.has(era)){d.classList.add("art");{const dk=ME_DARK[era]||"";if(dk.includes("p"))d.classList.add("pd");if(dk.includes("b"))d.classList.add("bd");if(dk.includes("w"))d.classList.add("wd")}d.style.cssText=ME_ART_FILES.map(f=>`--u-${f.replace(/\..*$/,"")}:url(data/me_${era}/${ME_INK&&/^(stage_bg|wall|win_|view_|pedestal)/.test(f)?f.replace(".webp","_ink.webp"):f})`).join(";")}}
  d.innerHTML=`<section class="me-stage" id="meSt"><div class="me-halo"></div><div class="me-win"></div><div class="me-glow"></div><div class="me-ped"></div>
      <button class="me-fig" id="meFig2" aria-label="看我的 3D 角色"><img src="${meImg()}" ${meImgTag(myStyle(),mySex())} alt="" onerror="this.remove()"></button>
      ${wxBornLine()?`<div class="me-name me-cn"><b>${meName()}</b></div><div class="me-born2">${esc(wxBornLine())}</div><button class="me-nick" id="meNm" aria-label="改線上名字">🌐 ${esc(myName()||"取個線上名字")} ✎</button>`:`<button class="me-name" id="meNm" aria-label="改名"><b>${meName()}</b><small>${esc(myName()||"")}</small></button>`}
      <button class="me-act l" id="meOb"><em>🔒</em>旅程</button>
      <button class="me-act r" id="mePc"><span class="pc ${red?"r":"b"}">${esc(pc)}</span>${myChar()?"本命":"換棋子"}</button></section>
    <section class="mr"><button id="meRk" aria-label="官階 ${esc(R.name)}"><span class="rkx"><span class="me-seal${[...R.name].length===4?" q":""}">${esc(R.name)}</span><span class="ta" style="--lit:${Math.round(((10-R.g)+(R.g>1?R.pc/100:0))/9*100)}%">${[1,2,3,4,5,6,7,8,9].map(t=>`<i${t===R.g?' class="on"':""} style="--n:${t-1};--f:${t>=R.g?100:t===R.g-1?R.pc:0}%"></i>`).join("")}</span></span><b>官階</b></button>
      <button id="meXp" aria-label="修為 Lv ${I.L} ${esc(I.title)}"><span class="jr"><span class="jp" style="--pp:${xp}%"></span><svg class="jpb" viewBox="0 0 100 100" aria-hidden="true"><path class="t" d="M50 10L66.57 10L90 33.43L90 66.57L66.57 90L33.43 90L10 66.57L10 33.43L33.43 10Z" pathLength="100"/><path class="f" d="M50 10L66.57 10L90 33.43L90 66.57L66.57 90L33.43 90L10 66.57L10 33.43L33.43 10Z" pathLength="100" style="stroke-dasharray:${xp} 100"/></svg><span class="jh"><b>Lv ${I.L}</b><small>${esc(I.title)}</small></span></span><b>修為</b></button></section>
    <section class="mx m4"><div class="hx"><span>${ETIMG("f_idea","","💡")}</span><b>${H.left+(H.bonus||0)}<small>提示棋</small></b></div>
      <div class="hx" id="pUndo"><span>↶</span><b>${undoLeft()}<small>悔棋符</small></b></div>
      <div class="hx"><span>🫙</span><b>${jarN()}<small>棋罐${lingN()?"・令 "+lingN():""}</small></b></div>
      <div class="hx"><span>${ETIMG("p_story","","📖")}</span><b>${L.n}／36<small>故事</small></b></div></section>
    <section class="mwall"><div class="mws">${meWin("b",ETIMG("p_board","data/treasure/board_normal.webp","🎁"),"棋盤",B.boards.length,B.boards.length)}${meWin("r",ETIMG("p_kifu","data/treasure/record_normal.webp","📜"),"棋譜",B.records.length,B.records.length)}${meWin("s",ETIMG("p_secret","","🤝"),"秘境棋友",`${nS}／${SECRETS.length}`,nS,.5*(1-nS/SECRETS.length))}${meWin("z","🏺","珍品",`${nZ}／130`,nZ,.5*(1-Math.sqrt(nZ/130)))}</div></section>`;
  const circ=pad.querySelector(".circles");pad.replaceChildren(d);{const er=store.get("era","classic");if(ME_ART.has(er)&&ME_EAVE[er]!=null){const fit=()=>meEave(d,er);requestAnimationFrame(()=>{fit();requestAnimationFrame(fit)});addEventListener("resize",fit,{once:true});
    /* 意見回饋 613：字型（朝代字體）和花窗圖晚一點才載好，標籤高度一變，牆被撐高、屋簷跟著變高，花窗就被壓到——載好、高度變了都重算 */
    try{document.fonts.ready.then(fit)}catch(e){}
    try{const ws=d.querySelector(".mws");if(ws&&window.ResizeObserver){let last=-1;const ro=new ResizeObserver(()=>{if(!ws.isConnected){ro.disconnect();return}const h=ws.offsetHeight;if(Math.abs(h-last)>1){last=h;fit()}});ro.observe(ws)}}catch(e){}
    d.querySelectorAll(".mwall img").forEach(im=>{if(!im.complete)im.addEventListener("load",fit,{once:true})})}}if(circ){circ.style.display="none";pad.append(circ)}if(typeof gardenMeCard==="function")pad.append(gardenMeCard());if(typeof codexMeCard==="function")pad.append(codexMeCard());if(typeof chdMeCard==="function"){const x=chdMeCard();if(x)pad.append(x)}if(typeof dglMeCard==="function"){const x=dglMeCard();if(x)pad.append(x)}   /* 意見回饋 658：園子棋友的羈絆、棋史卡 */
  const on=(id,fn)=>{const e=v.querySelector(id);if(e)e.onclick=()=>{vibrate(5);fn(e)}};
  on("#meFig2",f=>{const st=v.querySelector("#meSt");if(st){st.classList.remove("tap");void st.offsetWidth;st.classList.add("tap")}const im=f.querySelector("img");if(!f.dataset.g3)setTimeout(()=>meFigOpen(im&&im.src),220)});   /* 584：舞台已經是 3D 就不用再開大圖 */
  on("#meNm",()=>nameSheet(false));on("#meOb",()=>journeyLock());on("#mePc",()=>{if(myChar())return pieceLock();store.set("setTab","bot");location.hash="#/settings"});   /* 意見回饋 668：角色選定就鎖住；雲河七星的棋子也鎖住 */
  on("#meRk",rankSheet);on("#meXp",xpSheet);meFig3d(v);
  v.querySelectorAll(".mw[data-c]").forEach(b=>b.onclick=()=>{const o=circ&&circ.querySelector(`[data-c="${b.dataset.c}"]`);if(o)o.click()})}
function Profile(v){setTop("🎒 棋童資料","#/adventure");setTabs(true,"#/");v.className="view";const I=xpInfo(),H=hintInfo(),B=bag(),Sx=jSecrets(),S=jStars(),Js=jStages(),L=legendState(),star=Js.reduce((a,x)=>a+(S[x.id]||0),0);
  const card=x=>`<div class="bcard ${x.rarity}"><div class="bic">${TIMG(`data/treasure/board_${x.rarity==="broken"?"broken":x.rarity==="rare"?"rare":"normal"}.webp`,x.rarity==="broken"?"🧩":x.rarity==="rare"?"📜":"♟")}</div><b>${esc(x.name)}</b><small style="color:${RAR[x.rarity][1]}">${RAR[x.rarity][0]}</small><small class="muted">${esc(x.from)}・${new Date(x.at).toLocaleDateString()}</small>
    ${x.rarity==="rare"&&!x.used?`<button class="pill" data-ex="${x.uid}">🪨 拿去石桌給兩位老人</button>`:x.used?'<small class="muted">已經跟兩位老人換過獎勵</small>':""}</div>`;
  v.innerHTML=`<div class="pad"><div class="card prof"><div class="pl"><div class="lv">Lv ${I.L}</div><div><b style="font-size:20px">🀄 ${I.title}</b><div class="st-bar" style="margin:6px 0 2px"><i style="width:${I.need?Math.round(I.rest*100/I.need):100}%"></i></div><small class="muted">${I.need?`${I.rest}／${I.need} 修為・累積 ${I.total}`:`累積 ${I.total} 修為・已到最高等級`}</small></div></div>
      <div class="chips"><span>💡 提示棋 今天 ${H.left}${H.bonus?`＋庫存 ${H.bonus}`:""}</span><span>↶ 悔棋符 ${undoLeft()}</span><span>🫙 棋罐 ${jarN()}／${JAR_MAX} 子</span>${lingN()||jHidGot()?`<span>${HIDN.ic} 將令 ${lingN()}（累積 ${jHidGot()}）</span>`:""}${jarTitle()?`<span>🏅 ${jarTitle()}</span>`:""}${typeof histTitle==="function"&&histTitle()?`<span>🏅 ${histTitle()}</span>`:""}<span>📖 故事 ${L.n}／36 回</span><span>🤝 秘境棋友 ${Object.keys(Sx).length}／${SECRETS.length}</span></div>
      <button class="lk" id="pXP" style="margin-top:6px">等級、提示棋和悔棋符怎麼來的？</button></div>
    <div class="circles"><button data-c="b"><span>${ETIMG("p_board","data/treasure/board_normal.webp","🎁")}</span><b>棋盤</b><small>${B.boards.length}</small></button><button data-c="r"><span>${ETIMG("p_kifu","data/treasure/record_normal.webp","📜")}</span><b>棋譜</b><small>${B.records.length}</small></button><button data-c="s"><span>${ETIMG("p_secret","","🤝")}</span><b>秘境棋友</b><small>${Object.keys(Sx).length}／${SECRETS.length}</small></button><button data-c="z"><span>🏺</span><b>珍品</b><small>${Object.values(relicsMine()).reduce((a,x)=>a+x.length,0)}／130</small></button></div></div>`;
  /* 意見回饋 322：只放三個圓圈，點了才打開清單，不放說明文字 */
  const openC=k=>{const B2=bag(),S2=jSecrets();if(k==="z")return relicBook();
    if(k==="b")sheet(`🎁 棋盤（${B2.boards.length}）`,b=>{if(!B2.boards.length){b.innerHTML='<p class="muted" style="text-align:center">還沒有</p>';return}
      pageList(b,B2.boards.slice().reverse(),sl=>`<div class="bgrid">${sl.map(card).join("")}</div>`,b=>b.querySelectorAll("[data-ex]").forEach(x=>x.onclick=()=>rareExchange(x.dataset.ex,()=>Me(v))))});
    else if(k==="r")sheet(`📜 棋譜（${B2.records.length}）`,b=>{if(!B2.records.length){b.innerHTML='<p class="muted" style="text-align:center">還沒有</p>';return}
      pageList(b,B2.records.slice().reverse(),sl=>`<div class="items" style="padding:0">${sl.map(x=>`<button class="item" data-rc="${x.uid}"><span class="lb">${TIMG(`data/treasure/record_${x.rare?"rare":"normal"}.webp`,"📜")}</span><span class="tx"><b>${esc(recTitle(x.name))}</b><span>${(g=>g.i?"💡 有心得・":g.r?"✔ 讀過・":"")(studyGet()[studyKey(x)]||{})}${esc(x.from)}</span></span><span class="muted">›</span></button>`).join("")}</div>`,b=>{b.querySelectorAll("[data-rc]").forEach(y=>y.onclick=()=>{const x=bag().records.find(z=>z.uid===y.dataset.rc);if(!x)return;studyOpen(x,{back:()=>openC("r"),ret:"#/adventure"})})})});
    else sheet(`🤝 秘境棋友（${Object.keys(S2).length}／${SECRETS.length}）`,b=>{b.innerHTML=`<div class="items" style="padding:0">${SECRETS.map(x=>S2[x.id]?`<button class="item" data-sb="${x.id}"><span class="lb" style="font-size:22px">${secIc(x)}</span><span class="tx"><b>${esc(x.name)}</b><span>${esc((SECRET_BIO[x.id]||{}).y||"")}・贏過 ${(store.get("secretWins",{})[x.id]||0)} 盤</span></span><span class="muted">›</span></button>`:`<div class="item" style="opacity:.5"><span class="lb">❔</span><span class="tx"><b>？？？</b></span></div>`).join("")}</div>`;b.querySelectorAll("[data-sb]").forEach(y=>y.onclick=()=>{const x=SECRETS.find(z=>z.id===y.dataset.sb);if(x)secretSheet(x)})})};
  v.querySelectorAll(".circles [data-c]").forEach(b=>b.onclick=()=>{vibrate(5);openC(b.dataset.c)});
  (v.querySelector("#pXP")||{}).onclick=xpSheet;(v.querySelector("#pUndo")||{}).onclick=xpSheet;
  return{}}
/* 稀有棋盤（整個故事只有一件）拿去石桌給兩位老人：換 5 顆提示棋＋3 份「回到當年」要用的棋譜（先研讀再解主線） */
async function rareExchange(uid,done){const B=bag(),x=B.boards.find(z=>z.uid===uid);if(!x||x.rarity!=="rare"||x.used)return;const D=await legendData();
  sheet("🪨 石桌",b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">石桌旁，兩位老人正在下棋，一個撐著舊油紙傘。你把那張泛黃的拓本攤在桌上。

沈石川看了一眼，手停在半空中：「這是……雲河鎮那張石桌的拓本？」柳寒舟湊過來，看了很久，輕聲說：「第四十二步。是那一盤。」</p>
    <p style="line-height:1.8">兩位老人想送你：<b>💡 5 顆提示棋</b>（放在庫存，不會過期），和 <b>📜 3 份當年的棋譜</b>——是「回到當年」要用的對局，先研讀，主線會好解很多。</p><button class="btn" id="exOk" style="width:100%">把拓本送給他們</button>`.replace(/\n/g,"<br>");
    b.querySelector("#exOk").onclick=()=>{const B2=bag(),y=B2.boards.find(z=>z.uid===uid);if(!y||y.used)return;y.used=Date.now();
      store.set("hintBonus",(store.get("hintBonus",0)||0)+5);const done0=store.get("sceneDone",{}),sc=(D&&D.scenes||[]).filter(z=>!done0[z.key]).concat((D&&D.scenes||[]).filter(z=>done0[z.key])).slice(0,3);
      for(const z of sc)B2.records.push({uid:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),c:z.c,id:z.id,name:`回到當年・${z.title}（研讀用）`,from:"沈石川、柳寒舟送的",at:Date.now()});
      bagSave(B2);closeSheet();vibrate([20,40,60]);toast("🎁 得到 💡 5 顆提示棋、📜 3 份當年的棋譜");if(done)done()}})}
/* ================= 🀄 棋道修行（等級）＋ 🗺 雲河棋路（闖關）（意見回饋 314） =================
   修為（經驗值）：下完一盤 15（贏了 40）、測驗每題 2～5、猜著法每步 2～5、回到當年 30、闖關每顆星 20；每天第一次練習多 20。
   每升一級要的修為越來越多（60＋20×等級）；每 10 級換一個稱號：棋童、棋徒、棋友、棋客、棋士、棋師、棋豪、棋王、棋聖、棋仙（Lv 100）。
   等級看的是「練了多少」，段位看的是「實力」，兩個分開算。
   雲河棋路：沿著石桌往事裡的雲河，從渡口走到石桌，5 站、每站 6 關（解題、回到當年、對弈、守關擂主），每關最多 3 顆星，過關才開下一關。 */
const XP_TITLES=["棋童","棋徒","棋友","棋客","棋士","棋師","棋豪","棋王","棋聖","棋仙"],xpNeed=L=>60+20*L;
function xpInfo(x){x=x==null?store.get("xp",0):x;let L=1,rest=x;while(L<100&&rest>=xpNeed(L)){rest-=xpNeed(L);L++}return{L,rest,need:L<100?xpNeed(L):0,title:XP_TITLES[Math.min(9,Math.floor((L-1)/10))],total:x}}
function xpChip(t,big){let c=document.getElementById("xpchip");if(!c){c=document.createElement("div");c.id="xpchip";document.body.append(c)}
  c.textContent=t;c.className=big?"big":"";c.style.opacity="1";clearTimeout(xpChip.t);xpChip.t=setTimeout(()=>{c.style.opacity="0"},big?3200:1400)}
function addXP(n,why,key){if(!n)return;
  if(key){const K=store.get("xpKeys",{});if(K[key])return;K[key]=1;const ks=Object.keys(K);if(ks.length>4000)for(const k of ks.slice(0,1000))delete K[k];store.set("xpKeys",K)}
  const today=localDay();let bonus=0;if(store.get("xpDay","")!==today){store.set("xpDay",today);bonus=20}
  const b=xpInfo(),x=b.total+n+bonus;store.set("xp",x);const a=xpInfo(x);
  if(a.L>b.L){vibrate([20,40,20,40,60]);xpChip(`🎉 修行升級！Lv ${a.L}・${a.title}${a.title!==b.title?"（新稱號）":""}`,true)}else xpChip(`+${n+bonus} 修為${bonus?"（今日第一次練習 +20）":""}`)}
function xpSheet(){const I=xpInfo();sheet("🀄 棋道修行",b=>{b.innerHTML=`<div style="text-align:center"><div style="font-size:40px;font-weight:900;font-family:var(--serif)">Lv ${I.L}</div><div style="font-size:18px"><b>${I.title}</b></div>
    ${I.need?`<div class="st-bar" style="margin:8px 0 2px"><i style="width:${Math.round(I.rest*100/I.need)}%"></i></div><div class="muted">${I.rest} / ${I.need} 修為（累積 ${I.total}）</div>`:'<div class="muted">已到最高等級</div>'}</div>
    <div style="text-align:left;font-size:14px;line-height:1.75;margin-top:14px">
      <!-- 意見回饋 609：只寫怎麼用，不寫掉落規則 -->
      <p style="margin:0 0 8px"><b>💡 提示棋</b>：輪到你時用，Pikafish 會指出關鍵的那顆子。用過的那盤不算進我的棋力。</p>
      <p style="margin:0 0 8px"><b>↶ 悔棋符</b>：現在有 <b>${undoLeft()}</b> 張。用 1 張可以退回你的上一步。</p>
      <p class="muted" style="margin:0;font-size:13px">對局時按「🎒 寶物」就能用：挑戰電腦、擂台、故事都可以；線上對戰、晉級賽比真實力，不能用。</p></div>
    <div style="height:14px"></div>
    <button class="btn" id="xj" style="width:100%">🪨 去石桌往事闖關</button>`;b.querySelector("#xj").onclick=()=>{closeSheet();location.hash="#/shelf/1"}})}

/* 提示棋：等級換來的本事（意見回饋 314）。Lv 5 起每天有提示棋（Lv 5～9 每天 1 次，之後每 10 級多 1 次）；
   Lv 5～19 只指出「該動哪顆子」，Lv 20 起連「走到哪」一起指出。只能在雲河棋路用；用了那一關最多 ★★ */
/* QA P2-1：「今天」用手機的本地日期（臺灣半夜 12 點換日），不用國際標準時間 */
function localDay(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function hintInfo(){const L=xpInfo().L,day=localDay(),u=store.get("hintUse",{}),per=(L<5?0:1+Math.floor(L/10))+(typeof diffOf==="function"?diffOf().hint|0:0);return{L,per,left:Math.max(0,per-(u.d===day?u.n:0)),bonus:store.get("hintBonus",0)||0,full:L>=20,day,u}}
function useHint(){const H=hintInfo();if(H.left>0){store.set("hintUse",{d:H.day,n:(H.u.d===H.day?H.u.n:0)+1});return H}
  if(H.bonus>0){store.set("hintBonus",H.bonus-1);return H}   /* 庫存的提示棋（兩位老人送的）：任何等級都能用 */
  if(!H.per){toast("Lv 5 起才有提示棋，先多練習累積修為");return null}toast("今天的提示棋用完了，明天再來（等級越高，每天越多）");return null}
/* 意見回饋 594／595（開發者）：悔棋改成寶物「悔棋符」。跟電腦下、故事裡下，要用 1 張悔棋符才能悔一步；線上對戰不能悔棋也不能提示。
   練習（擺盤、錯棋重練）照樣隨便退。掉落規則見下面 itemDrop（意見回饋 597） */
/* 意見回饋 597：哪些對局不能用寶物（提示棋、悔棋符）——回傳原因，可以用就回傳空字串。線上對戰另外在對戰頁就沒有寶物 */
const itemBlock=st=>!st?"":(st.kind||(st.practice?"practice":st.journey?"journey":st.arena?"arena":"cpu"))==="cpu"?"跟"+(typeof cpuOppName==="function"?cpuOppName(st):"幻影棋客")+"下棋要比真實力，不能用寶物":st.ranked?"晉級賽要比真實力，不能用寶物":st.practice?"練習可以直接退，不用寶物":"";
/* 意見回饋 597（開發者選「強度＋保底」）：每盤結束（自己走 10 步以上）💡 提示棋、↶ 悔棋符各抽一次，線上對戰也算。
   機率＝對手強度 N%（電腦第 N 級；線上照對手段位換成同級電腦；積分挑戰照那一段），贏了再 +2%，最高 20%。
   哪一樣連 15 盤沒掉，下一盤那一樣一定掉。同一盤只抽一次 */
const DROP_MAX=20,DROP_PITY=15,RANK_PTS=[0,50,100,150,200,300,400,500,600,700,800,900,1000,1150,1300,1500,1700],undoLeft=()=>Math.max(0,+store.get("undoBonus",0)||0);
const ptsLv=p=>{let i=0;RANK_PTS.forEach((t,k)=>{if(+p>=t)i=k});return i+1};
const dropPct=(lv,won)=>Math.min(DROP_MAX,Math.max(1,Math.round(+lv||1))+(won?2:0));
function itemDrop(id,mine,lv,won){if(!id||mine<10)return"";const seen=store.get("undoDropIds",[]);if(seen.includes(id))return"";store.set("undoDropIds",seen.concat(id).slice(-60));
  const pc=dropPct(lv,won),miss={h:0,u:0,...store.get("dropMiss",{})},got=[];
  for(const k of["h","u"]){if(miss[k]>=DROP_PITY||Math.random()<pc/100){miss[k]=0;got.push(k);if(k==="h")store.set("hintBonus",(store.get("hintBonus",0)||0)+1);else store.set("undoBonus",undoLeft()+1)}else miss[k]++}
  store.set("dropMiss",miss);if(!got.length)return"";
  return"🎁 掉落 "+got.map(k=>k==="h"?"1 顆 💡 提示棋":"1 張 ↶ 悔棋符").join("、")+"！（對局時按「🎒 寶物」使用）"}
function undoDrop(st){if(!st||st.practice||!st.id)return"";const lv=st.ranked&&st.rk!=null?(+st.rk||0)+1:st.level;return itemDrop(st.id,st.moves.filter(m=>m.by===st.human).length,lv,!!(st.result&&st.result.w===st.human))}
const hintLabel=()=>{const H=hintInfo();return H.per||H.bonus?`提示（剩 ${H.left+H.bonus}）`:"提示（Lv 5）"};
/* 11/11：提示標記叫什麼——平面棋盤是藍色虛線框（01-board.js），園子 3D（park3d.js）還是黃色圈；挑戰電腦、故事對局兩種都可能，照現在的模式說 */
function hintMk(){try{if(typeof parkOn==="function"&&parkOn())return"黃圈"}catch(e){}return"藍框"}
/* 意見回饋 674（開發者 11/6）：這條 36 關的路改名（原「雲河棋路」；「雲河」以後只指星槎），5 段叫「卷」。名字還在請 Gemini 想，畫面上的名字都從這兩個常數拿，改這裡就好 */
const ROAD_NAME="章回棋路",ROAD_UNIT="卷",roadSeg=ri=>"第"+CNUM(ri+1)+ROAD_UNIT+"・"+((JR[ri]||{}).name||"");
const JR=[
  {k:"dukou",name:"渡口",sub:"第一～七回：撐斷傘的老人、渡船少年和聽濤樓打雜的孩子，河石對瓦片，燭光下的第一盤盲棋。",tiers:[0,3],ch:[1,7],lv:1},
  {k:"chaguan",name:"聽濤樓茶館",sub:"第八～十四回：棋會決賽、城頭的鑼、一身認罪，兩人各自漂泊。",tiers:[3,6],ch:[8,14],lv:5},
  {k:"qihui",name:"雲河棋會",sub:"第十五～廿一回：千里書信棋、流言、孤城，和登科的周文淵。",tiers:[6,9],ch:[15,21],lv:12},
  {k:"juesai",name:"決賽",sub:"第廿二～廿九回：沈萬三的賭局、讓子棋、拆船，一封遲了五十年的信。",tiers:[9,12],ch:[22,29],lv:20},
  {k:"shizhuo",name:"石桌",sub:"第三十～卅六回：架閣庫的舊字、白頭的阿古拉，和那盤沒下完的棋。",tiers:[12,14],ch:[30,36],lv:30}];
/* 開發者決定：石桌往事換成 36 回，每回一關（名稱、玩法類型、電腦等級；tools/legend_export.js 會照大綱自動更新這一行）。
   特製玩法（猜著法、盲棋、對話選項、香條計時、讓子、殘局起手…）要等引擎驗過局面才做；在那之前：有電腦等級的先下一盤對弈，其他先用題庫解題 */
const JL=[["送車","讓子＋殘局起手＋猜著法",1,1,1],["桌子底下","盲棋＋記盤",0,1,1],["小卒過河","殘局起手",2,1,1],["當場拆穿","對話選項＋殘局起手",2,1,1],["蠟燭燒完了","對話選項＋盲棋＋猜著法",0,1,1],["他撕一張，我們寫一張","收集＋香條計時",0,1,1],["最後一支香","記盤＋對話選項＋香條計時對局",2,1,1],["背後那門砲","香條計時＋殘局起手＋猜著法",3,1,1],["三炷香","殘局起手＋香條計時",3,1,1],["第四十二步","猜著法＋對話選項",0,1,2],["州衙三問","對話選項",0,1,2],["每晚擺一遍","記盤＋猜著法",0,1,2],["草席下的棋","盲棋＋限步對局",3,1,2],["秘境棋友・王冕","限步對局",2,1,2],["書信棋","猜著法",0,1,2],["柳老篙的手","對話選項",0,1,2],["指導棋","限步對局＋猜著法",1,1,2],["炮八平五是哪一路兵馬","對話選項＋限步對局",2,1,2],["孤城","殘局起手",3,1,2],["雙馬飲泉","殘局起手 ×3",0,1,3],["撐到轎子來","限步對局＋香條計時",3,1,3],["秘境棋友・沈萬三","限步對局",4,1,3],["棋仙讓車","讓子對局",4,1,3],["拼匾","收集＋殘局題 ×5",0,1,3],["盲棋","盲棋＋猜著法",0,1,3],["只敢問一句","對話選項＋香條計時對局",3,1,3],["讓雙馬","讓子對局",3,1,3],["秘境棋友・邋遢道人","限步對局",5,1,3],["拆船","收集＋殘局題 ×3",0,1,3],["賈半步的殘局","殘局起手",4,1,4],["架閣庫","收集＋對話選項＋香條計時",0,1,4],["石桌刻痕","殘局題",0,1,4],["過宮炮","讓子對局",4,1,4],["不怕的棋","對話選項＋限步對局",4,1,4],["雨中推演","猜著法＋記盤",0,1,4],["炮八平四","殘局起手",6,1,4]];/*JL*/
const JL2=[["晨掃石枰","記盤＋限步對局",1,1,1],["南邊來的客人","限步對局",2,1,1],["帳背上的關門","殘局起手 ×3＋猜著法",2,1,1],["堤上無燈","盲棋＋香條計時",3,1,1],["重陽擂台","讓先擂台（新）＋限步對局",3,1,1],["雲河石桌真譜","譜裡找錯（新）",0,1,1],["兩手一方","雙人搭檔棋（新）＋讓先擂台",3,1,1],["徵局","徵局出題＋殘局起手",4,1,1],["和，也是解","殘局起手＋古譜對照",4,1,1],["馬市棋攤","讓先擂台＋限步對局",3,1,2],["廟市雙杰","雙人搭檔棋＋香條計時",4,1,2],["一人四盤","蒙眼車輪戰（記憶小遊戲）",3,1,2],["不吃的那隻車","殘局起手＋對話選項",4,1,2],["三張紙","長信書信棋（小玩法）＋猜著法",0,1,2],["虎丘四盤","蒙眼車輪戰（只下一盤＋記憶小遊戲）",4,1,2],["京華棋話","譜裡找錯",0,1,2],["三條路","殘局起手＋猜著法",4,1,2],["鹽商大擂","讓先擂台＋限步對局",5,1,2],["掃地","對話選項＋收集",0,1,2],["接香","殘局接力（新）",4,1,3],["一步家書","長信書信棋＋記盤",0,1,3],["水漲棋盤","水漲棋盤（小玩法）＋限步對局",4,1,3],["讓雙馬","讓子對局",3,1,3],["反刻一版","刻版記盤（小玩法）＋譜裡找錯",0,1,3],["中炮三衝","限步對局＋香條計時",5,1,3],["關好了的門","限步對局",5,1,3],["白頭車輪","蒙眼車輪戰",4,1,3],["揚州再擂","讓先擂台＋限步對局",5,1,3],["老兵的卒","限步對局",4,1,3],["祖孫接香","殘局接力",5,1,4],["替譜校錯","譜裡找錯",0,1,4],["兩紙相拼","盲棋＋記盤",0,1,4],["白首聯枰","雙人搭檔棋＋古譜對照",6,1,4],["最後兩行","對話選項＋收集",0,1,4],["第一百盤","盲棋＋限步對局",6,1,4],["刻名","收集＋殘局題",0,1,4]];/*JL2*/
/* 🏮 驛站（意見回饋 315）：等級不夠進下一站時，來這裡找路過的旅人下棋練等，下幾次都可以；贏了多給修為。
   🗝 秘境棋友：藏在某些朝代公園的樹、茶杯、燈籠後面，要自己在公園 3D 裡點到才會發現；找到後也會出現在驛站，比較強、修為也多 */
const INN=[{id:"tea",name:"賣茶的老婦",ic:"🍵",lv:1,xp:20,say:"「喝口茶，陪老身下一盤，不急不急。」"},{id:"scholar",name:"趕考的書生",ic:"📜",lv:2,xp:25,say:"「小生進京趕考，路上棋癮犯了，請賜教。」"},
  {id:"guard",name:"走鏢的鏢師",ic:"🗡",lv:3,xp:30,say:"「鏢車在外面歇著，咱們速戰速決！」"},{id:"monk",name:"行腳僧",ic:"📿",lv:4,xp:40,say:"「阿彌陀佛，棋盤上也能修行。」"},{id:"teller",name:"說書人",ic:"🪭",lv:5,xp:50,say:"「欲知勝負如何，且看下回分解！」"}];
/* 意見回饋 548（開發者）：驛站旅人只告訴玩家「第幾級」，不寫修為。實際棋力在一段範圍裡浮動（用積分挑戰的段位強度 RLV 0～16）：
   第 1 級＝新手、第 2 級＝新手到入門、第 3 級＝入門到業餘、第 4 級＝業餘、第 5 級＝業餘高段到專業；贏了下次強一格、輸了弱一格。越強贏了修為越多（玩家看不到） */
const INN_BAND=[[0,1],[1,3],[3,6],[6,10],[10,14]];
const innRlv=x=>{const i=INN.indexOf(x),B=INN_BAND[i]||INN_BAND[0],v=store.get("innAdj",{})[x.id];return Math.max(B[0],Math.min(B[1],Number.isInteger(v)?v:B[0]))};
const innXP=r=>15+r*6,innLvN=x=>INN.indexOf(x)+1;
/* 意見回饋 316：秘境棋友是元末明初的歷史人物（棋藝是故事的想像）；難度照你的等級配，不會太難 */
/* 意見回饋 540：秘境棋友的圖示用他自己的立繪（data/actors/<id>.webp），沒有才用 emoji */
const secIc=x=>`<img src="data/actors/${x.id}.webp" alt="" style="width:40px;height:48px;object-fit:contain" onerror="this.replaceWith(document.createTextNode('${x.ic}'))">`;
const SECRETS=[{id:"liuji",name:"劉伯溫",who:"元末明初的謀士，幫朱元璋打天下",ic:"🪶",off:1,say:"「運籌帷幄，一盤棋也是。」",found:"{spot}旁邊，一位書生模樣的中年人正在推演什麼。他抬頭一笑：「在下劉基，字伯溫。閒來無事，下一盤？」",gift:"青田石棋盤"},
  {id:"zhangsanfeng",name:"張三丰",who:"傳說中武當山的道人",ic:"☯",off:1,say:"「以柔克剛，棋盤上也是這個道理。」",found:"{spot}後面，一位白鬚道人閉著眼睛打坐，忽然開口：「貧道張三丰，你的棋，有點意思。」",gift:"武當松木棋盤"},
  {id:"shinaian",name:"施耐庵",who:"傳說《水滸傳》的作者",ic:"📖",off:0,say:"「一百零八條好漢，都在這盤棋裡。」",found:"你在{spot}旁邊撿到一疊手稿，一位老先生追過來：「那是我的書稿！……你也下棋？」",gift:"梁山泊竹棋盤"},
  {id:"shenwansan",name:"沈萬三",who:"元末明初江南的大富商",ic:"💰",off:0,say:"「做生意跟下棋一樣，捨得才有得。」",found:"{spot}旁邊停著一頂華麗的轎子，轎裡的富商探出頭：「在下沈萬三，賭一盤？不賭錢，賭棋盤。」",gift:"聚寶盆金漆棋盤"},
  {id:"changyuchun",name:"常遇春",who:"明初的猛將，人稱「常十萬」",ic:"⚔",off:-1,say:"「下棋？我只會往前衝！」",found:"{spot}旁邊一個大嗓門的將軍正在找人下棋：「本將軍常遇春，打仗一流，下棋……也還行！」",gift:"軍中牛皮棋盤"},
  {id:"wangmian",name:"王冕",who:"元末畫墨梅的畫家",ic:"🌸",off:-1,say:"「我只畫梅花，棋……陪你玩玩。」",found:"{spot}旁邊有人在畫梅花，墨跡還沒乾。他放下筆：「王冕。不太會下棋，你別笑我。」",gift:"墨梅紙棋盤"}];
/* 意見回饋 333：秘境棋友的小傳——生卒年照一般的史書說法，喜好、棋風和支線故事是遊戲裡的想像 */
const SECRET_BIO={
  liuji:{y:"1311–1375",from:"浙江青田",like:"夜裡觀星、讀兵書",op:"中炮——先把陣勢擺穩，再找機會出手",mid:"算得很深，愛在後面埋伏兵，一步棋藏著三步後手",story:"他說年輕時在青田的石門洞讀書，跟洞裡一位老道下了三年棋，一盤都沒贏過。老道只留下一句話：「棋要先算退路。」後來替朱元璋出謀劃策，他說用的都是那三年輸棋學來的東西。"},
  zhangsanfeng:{y:"生卒成謎（傳說）",from:"遼東（一說）",like:"打坐、看雲、在山裡走路",op:"屏風馬——不急著進攻，先站穩",mid:"以柔克剛：讓你先打，借你的力反擊，常常棄子換勢",story:"傳說他看見蛇和鶴打架，鶴怎麼啄都啄不到蛇，悟出了以柔克剛的道理。他下棋也是這樣：你越用力，輸得越快。他自稱一百多歲，問他到底幾歲，他只笑不答。"},
  shinaian:{y:"約 1296–1370",from:"江蘇興化（一說錢塘）",like:"聽說書、蒐集江湖故事",op:"仙人指路——變化多，像說故事先留伏筆",mid:"愛車馬衝殺、對攻熱鬧，寧可輸得精彩也不和得無聊",story:"他說每一盤棋都是一回故事：哪顆兵是林沖、哪隻馬是武松，下完都記在稿子上。據說那疊被你撿到的手稿，就是後來《水滸傳》的草稿——不過這只是他自己說的。"},
  shenwansan:{y:"生卒不詳（元末明初）",from:"江南周莊",like:"算帳、收藏寶物",op:"飛相局——先求穩，絕不吃虧",mid:"精打細算，喜歡兌子換實利，到殘局再慢慢贏",story:"傳說他有一個聚寶盆，放一個銅錢進去會變出滿盆。他出錢幫南京修過城牆，後來卻因為太有錢被朝廷流放。他說棋盤上的道理一樣：贏得太多，別人就不想跟你下了。"},
  changyuchun:{y:"1330–1369",from:"安徽懷遠",like:"騎馬、喝酒、搶當先鋒",op:"順炮——開局就衝，先搶先贏",mid:"猛攻不守，車馬炮一起壓上，輸贏都很快",story:"他是明初的猛將，傳說自稱帶十萬兵就能橫行天下，所以人稱「常十萬」。三十九歲那年在北伐回師的路上病逝。他說下棋跟打仗一樣，猶豫就輸了——所以他下棋從來不想超過十秒。"},
  wangmian:{y:"1287–1359",from:"浙江諸暨",like:"畫墨梅、寫詩、放牛時讀書",op:"過宮炮——不照常理出牌",mid:"下得慢、愛想，常走出別人想不到的閒著",story:"小時候家裡窮，替人放牛，偷偷跑到佛寺裡，坐在佛像膝上就著長明燈讀書。他畫的墨梅只用淡墨，題詩說不要人家誇顏色好，「只留清氣滿乾坤」。他說下棋也一樣，不求贏得漂亮，只求每一步都乾淨。"}};
function secretBio(x){const B=SECRET_BIO[x.id];if(!B)return"";
  return`<div class="sbio"><div class="muted" style="font-size:13px">${esc(x.name)}・${esc(B.y)}・${esc(B.from)}</div><div style="font-size:13.5px;margin-top:2px">${esc(x.who)}</div>
    <div class="sbio-r"><span>喜好</span><b>${esc(B.like)}</b></div><div class="sbio-r"><span>開局</span><b>${esc(B.op)}</b></div><div class="sbio-r"><span>中局</span><b>${esc(B.mid)}</b></div>
    <details style="margin-top:6px"><summary>📜 他的故事</summary><p style="line-height:1.8;margin:6px 0 0">${esc(B.story)}</p></details></div>`}
const secretSheet=x=>sheet(`${x.ic} ${x.name}`,b=>{b.innerHTML=secretBio(x)+`<p class="muted" style="margin-top:8px">${esc(x.say)}</p><button class="btn" id="sgi" style="width:100%">🏮 走去驛站找他下棋</button>`;b.querySelector("#sgi").onclick=()=>{closeSheet();walk("inn",()=>{location.hash="#/journey/inn"})}});   /* 意見回饋 697：同一朝走路，不播千秋穿梭 */
const secretLv=x=>Math.max(1,Math.min(5,Math.min(4,1+Math.floor(xpInfo().L/8))+(x.off||0))),secretXP=x=>40+20*secretLv(x);
/* 意見回饋 315：秘境的位置每個玩家都不一樣——第一次用到時，隨機把每位秘境棋友分到不同朝代公園的不同物件上 */
const SPOT_OBJ={tree1:"樹",tree2:"老樹",cup:"茶杯",bench:"長凳",stool:"石凳",lantern:"燈籠",table:"石桌"};
function secretSpots(){let m=store.get("secretSpots",null);if(m&&SECRETS.every(x=>m[x.id]))return m;m=m||{};const ks=Object.keys(SPOT_OBJ),used=new Set(Object.values(m).map(z=>z.era+z.k));
  for(const x of SECRETS){if(m[x.id])continue;let e,k,g=0;do{e=ARENA_ORDER[Math.floor(Math.random()*ARENA_ORDER.length)];k=ks[Math.floor(Math.random()*ks.length)];g++}while(used.has(e+k)&&g<200);used.add(e+k);m[x.id]={era:e,k}}
  store.set("secretSpots",m);return m}
const secretHint=x=>{const z=secretSpots()[x.id];return`聽說${parkName(z.era)}裡，${SPOT_OBJ[z.k]}附近常有人在等……`};
const jSecrets=()=>store.get("secrets",{});
function secretFind(era,k){const M=secretSpots(),x=SECRETS.find(z=>M[z.id]&&M[z.id].era===era&&M[z.id].k===k);if(!x||jSecrets()[x.id])return false;const S=jSecrets();S[x.id]=Date.now();store.set("secrets",S);vibrate([20,40,60]);
  sheet(`🗝 發現秘境棋友：${x.name}`,b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">${esc(x.found.replace("{spot}",SPOT_OBJ[k]))}</p><p class="muted">${esc(x.say)}</p><p class="muted" style="font-size:13px">${esc(x.name)}：${esc(x.who)}</p><button class="btn" id="sgo" style="width:100%">🏮 走去驛站找他</button>`;b.querySelector("#sgo").onclick=()=>{closeSheet();walk("inn",()=>{if(/^#\/(journey\/play|arena)/.test(location.hash))navReplace("#/journey/inn");else location.hash="#/journey/inn"})}});return true}   /* 意見回饋 697：跟園子上方的 🏮 一樣走步行小卡；園子、擂台跟驛站是同一層，用 replace 不疊上一頁 */
/* 秘境棋友送棋盤：這盤賽後評等 S 才送；稀有 12%（整個故事只有一件：雲河鎮石桌殘局的拓本）、一般 58%、損壞 30% */
async function secretGift(x,gid){const K=store.get("giftGames",{});if(K[gid])return;let st=null;try{st=await api("/play/state")}catch(e){return}if(!st||st.id!==gid)return;
  let R=null;try{R=gameReport(window.XQCore.parseFen(window.XQCore.START),st.moves).sides[st.human]}catch(e){}
  if(!R||!R.graded||R.score==null)return;if(R.score<90){setTimeout(()=>toast(`${x.ic} ${x.name}：「這盤評等 ${gradeFor(R.score)[0]}，下到 S，我就送你一樣東西。」`),300);return}
  K[gid]=1;store.set("giftGames",K);const B=bag(),rareGot=B.boards.some(z=>z.rarity==="rare"),r=Math.random(),rar=!rareGot&&r<.12?"rare":r<.70?"normal":"broken";
  const it={uid:"b"+Date.now().toString(36),rarity:rar,from:x.name+"送的",at:Date.now(),name:rar==="rare"?"雲河鎮石桌殘局拓本":x.gift+(rar==="broken"?"（缺了一角）":"")};B.boards.push(it);bagSave(B);vibrate([20,40,60]);
  sheet(`🎁 ${x.name}送你一張棋盤`,b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">${rar==="rare"?`${esc(x.name)}從懷裡拿出一張泛黃的紙：「這是我年輕時路過雲河鎮，從一張石桌上拓下來的殘局。聽說刻棋的人等了一輩子……送你吧。」`:rar==="broken"?`${esc(x.name)}翻了翻行囊：「這張${esc(x.gift)}跟著我走南闖北，缺了一角，你別嫌棄。」`:`${esc(x.name)}笑著說：「這盤下得漂亮！這張${esc(x.gift)}送你。」`}</p>
    <div class="bgrid" style="grid-template-columns:1fr"><div class="bcard ${rar}"><div class="bic">${rar==="broken"?"🧩":rar==="rare"?"📜":"♟"}</div><b>${esc(it.name)}</b><small style="color:${RAR[rar][1]}">${RAR[rar][0]}${rar==="rare"?"・整個故事只有一件":""}</small></div></div>
    ${rar==="rare"?'<p class="muted" style="line-height:1.7">稀有的拓本可以拿去石桌給兩位老人，換 💡 5 顆提示棋和 📜 3 份當年的棋譜。</p>':""}<button class="btn" id="gb" style="width:100%">看我的棋童資料</button>`;b.querySelector("#gb").onclick=()=>{closeSheet();location.hash="#/profile"}})}
/* 驛站偶爾掉比賽棋譜：每次逛有兩成機率，每天最多 2 份（從妙棋精選的實戰裡挑） */
/* 意見回饋 536（開發者）：點公園的環景長卷，有 20% 機率掉落那個朝代的珍品（每個朝代 10 樣：普通 6、稀有 3、傳說 1；Gemini 畫的 data/relics/<朝代>__<id>.webp）。
   兩次掉落至少隔 2 分鐘，免得一直點就全部拿完；收進「我的角色 → 🏺 珍品」 */
const relicEra=e=>e==="classic"?"古風":eraLabel(e);let RELICS_P=null;const relicsData=()=>RELICS_P||(RELICS_P=fetch("data/relics/relics.json").then(r=>r.ok?r.json():{}).catch(()=>({})));
const relicsMine=()=>store.get("relics",{}),RELIC_RK={common:["普通","#8A7A66"],rare:["稀有","#2F6FB5"],legend:["傳說","#C8962E"]};
const relicImg=(era,id,ic)=>`<img src="data/relics/${era}__${id}.webp" alt="" style="width:100%;height:100%;object-fit:contain" onerror="this.replaceWith(document.createTextNode('${ic||"🏺"}'))">`;
/* 意見回饋 644（開發者 11/6 選方案 A）：珍品藏局——每件珍品配一局同典故的殘局（relics.json 的 cj 題號、cjName 局名、bridge 典故橋；題目都取自 canju-set.json 已驗證的題）。
   解法沿用一盞茶解題頁 #/canju/z/<珍品 id>，不算進茶單；不看答案解開就記進 store "relicSolved"＝{珍品 id:{at,p}}，珍品冊那一格蓋紅色「已解」小印，一朝 10 件全解開，朝代名變金色 */
const relicSolved=()=>store.get("relicSolved",{});
function relicGo(id){const go=()=>{closeSheet();location.hash="#/canju/z/"+encodeURIComponent(id)};if(/^#\/(cpu|arena|pvp|journey\/play|redo\/play)/.test(location.hash))confirmBox("要離開這盤棋，去解這件珍品的藏局嗎？",go,"去解藏局");else go()}
const relicCjHTML=x=>{if(!x||!x.cj)return"";const ok=!!relicSolved()[x.id];return`<div class="rl-cj"><b>🔍 這件珍品藏著一局〈${esc(x.cjName||"")}〉</b>${ok?'<span class="rl-seal sm">已解</span>':""}<p>${esc(x.bridge||"")}</p><button class="btn${ok?" ghost":""}" data-rlgo="${esc(x.id)}" style="width:100%;margin-top:2px">${ok?"再解一次":"現在解"}</button></div>`};
const relicCjBind=b=>b.querySelectorAll("[data-rlgo]").forEach(y=>y.onclick=()=>relicGo(y.dataset.rlgo));
async function relicDrop(era,p){const R=await relicsData(),L=R[era];if(!Array.isArray(L)||!L.length)return false;const mine=relicsMine(),have=mine[era]||[];
  if(Date.now()-(store.get("relicAt",0)||0)<12e4||Math.random()>=(p||.2))return false;   /* 意見回饋 712：渡口景點用 15%（p＝.15） */const left=L.filter(x=>!have.includes(x.id));if(!left.length)return false;
  const W={common:70,rare:25,legend:5},tot=left.reduce((a,x)=>a+(W[x.rarity]||10),0);let r=Math.random()*tot,it=left[0];for(const x of left){r-=W[x.rarity]||10;if(r<=0){it=x;break}}
  mine[era]=have.concat(it.id);store.set("relics",mine);store.set("relicAt",Date.now());vibrate([15,30,15,30,40]);const[rk,rc]=RELIC_RK[it.rarity]||RELIC_RK.common;
  const rlSheet=()=>sheet("🏺 撿到一件"+relicEra(era)+"的珍品！",b=>{b.innerHTML=`<div style="text-align:center"><div style="width:180px;height:180px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:90px">${relicImg(era,it.id)}</div>
    <div style="display:inline-block;padding:2px 10px;border-radius:999px;color:#fff;background:${rc};font-size:12px;font-weight:700">${rk}</div><h3 style="margin:6px 0 4px;font-family:var(--serif)">${esc(it.name)}</h3></div>
    <p style="line-height:1.8;margin:0 0 8px;font-size:15.5px">${esc(it.desc||"")}</p><p class="muted" style="font-size:13px;text-align:center">${esc(relicEra(era))}的珍品：${mine[era].length}／${L.length}・放在「我的角色 → 🏺 珍品」</p>${relicCjHTML(it)}<button class="btn${it.cj?" ghost":""}" id="rlOk" style="width:100%">收下</button>`;
    b.querySelector("#rlOk").onclick=()=>closeSheet();relicCjBind(b)});
  if(typeof relicFx==="function")relicFx(era,it,{from:"撿到一件"+relicEra(era)+"的珍品",cnt:`${relicEra(era)}的珍品 ${mine[era].length}／${L.length}`}).then(rlSheet);else rlSheet();return true}   /* Gemini 評估 11/8：先播開箱（07i-codex.js），收下後再看詳細和藏局 */
async function relicBook(){const R=await relicsData(),mine=relicsMine(),eras=Object.keys(R),Z=relicSolved(),nz=eras.reduce((a,e)=>a+R[e].filter(x=>Z[x.id]).length,0);
  sheet(`🏺 朝代珍品（${eras.reduce((a,e)=>a+(mine[e]||[]).length,0)}／${eras.reduce((a,e)=>a+R[e].length,0)}）`,b=>{b.innerHTML=/* 意見回饋 544：不寫去哪裡找，讓玩家自己撞見 */`<p class="muted" style="font-size:13px;line-height:1.6;margin:0 0 4px">每件珍品都藏著一局殘局：點開珍品按「現在解」。不看答案解開，會打上紅色「已解」；一個朝代 10 件全解開，朝代名變成金色。${nz?`（已解 ${nz} 局）`:""}</p>`+(typeof rdBookTop==="function"?rdBookTop():"")/* 開發者 11/8 等級說明（07v-relicdrop.js） */+(typeof chdRootHTML==="function"?chdRootHTML(R,mine):"")/* 意見回饋 774 雲河尋根（07q-chardiff.js） */+eras.map(e=>{const h=mine[e]||[],gold=R[e].length>0&&R[e].every(x=>Z[x.id]&&h.includes(x.id));return`<div class="sec-t${gold?" rl-gold":""}">${gold?"✦ ":""}${esc(relicEra(e))}<span class="muted" style="font-size:12px;font-weight:400">${h.length}／${R[e].length}${R[e].some(x=>Z[x.id])?`・已解 ${R[e].filter(x=>Z[x.id]).length}`:""}</span></div>
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px">${R[e].map(x=>{const got=h.includes(x.id),rc=(RELIC_RK[x.rarity]||RELIC_RK.common)[1];return`<button data-rl="${e}|${x.id}" style="position:relative;min-width:0;overflow:hidden;aspect-ratio:1;border-radius:12px;border:2px solid ${got?rc:"var(--line)"};background:var(--card);padding:3px;display:flex;align-items:center;justify-content:center;font-size:26px;${got?"":"filter:grayscale(1) brightness(.35);opacity:.55"}">${got?relicImg(e,x.id):"？"}${got&&Z[x.id]?'<span class="rl-seal">已解</span>':""}${got&&typeof qqRelicMark==="function"?qqRelicMark(x.id):""}${got&&typeof rdMark==="function"?rdMark(x.rarity):""}</button>`}).join("")}</div>`}).join("");
    if(typeof chdRootBind==="function")chdRootBind(b);if(typeof rdBookBind==="function")rdBookBind(b);b.querySelectorAll("[data-rl]").forEach(y=>y.onclick=()=>{const[e,id]=y.dataset.rl.split("|"),x=(R[e]||[]).find(z=>z.id===id);if(!x||!(mine[e]||[]).includes(id)){toast("還沒找到這件珍品");return}if(typeof qqRelicHeld==="function"&&qqRelicHeld(id))return;const[rk,rc]=RELIC_RK[x.rarity]||RELIC_RK.common;
      sheet("🏺 "+x.name,bb=>{bb.innerHTML=`<div style="text-align:center"><div style="width:180px;height:180px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:90px">${relicImg(e,x.id)}</div><div style="display:inline-block;padding:2px 10px;border-radius:999px;color:#fff;background:${rc};font-size:12px;font-weight:700">${rk}・${esc(relicEra(e))}</div></div><p style="line-height:1.8;font-size:15.5px">${esc(x.desc||"")}</p>${relicCjHTML(x)}<button class="btn ghost" id="rlBk" style="width:100%">← 回珍品冊</button>`;bb.querySelector("#rlBk").onclick=()=>relicBook();relicCjBind(bb)})})})}
async function cupDrop(){const day=localDay(),d=store.get("cupDrop",{});if(d.d===day&&d.n>=2)return false;if(Math.random()>=.3)return false;
  {const x=await prevTarget();if(x){prevGrant(x);store.set("cupDrop",{d:day,n:(d.d===day?d.n:0)+1});vibrate([15,30,15]);sheet("🍵 茶杯底下壓著一張紙",b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">你掀起茶杯，杯底壓著一張摺得整整齊齊的紙——是一份<b>預習卷</b>：古譜裡跟下一關「${esc(x.lvName)}」同型的例局。</p><p class="muted" style="font-size:13px;line-height:1.7">闖那一關時，按畫面上方的「📜 預習卷」就能打開來看。看預習卷不會扣分，那一關照樣能收齊兵馬車。</p><button class="btn" id="cd" style="width:100%">收下</button>`;b.querySelector("#cd").onclick=()=>closeSheet()});return true}}   /* 意見回饋 573 */
  let L=null;try{L=(await api("/db/items?c=brilliant&limit=600")).items}catch(e){return false}if(!L||!L.length)return false;const it=L[Math.floor(Math.random()*L.length)];
  const B=bag();if(B.records.some(z=>z.id===it.id))return false;B.records.push({uid:"r"+Date.now().toString(36),c:"brilliant",id:it.id,name:toT(it.name||(it.red+" 對 "+it.black)),from:`${parkName(store.get("era","classic"))}・茶杯底下`,at:Date.now()});bagSave(B);store.set("cupDrop",{d:day,n:(d.d===day?d.n:0)+1});
  vibrate([15,30,15]);sheet("🍵 茶杯底下壓著一張紙",b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">你掀起茶杯，杯底壓著一張摺得整整齊齊的紙，打開一看——是一份棋譜。</p><p class="muted">${esc(recTitle(toT(it.name||"")))}</p><p class="muted" style="font-size:13px">放在「🎒 棋童資料 → 📜 棋譜」。</p><button class="btn" id="cd" style="width:100%">收下</button>`;b.querySelector("#cd").onclick=()=>closeSheet()});return true}
async function innDrop(){const day=localDay(),d=store.get("innDrop",{});if(d.d===day&&d.n>=2)return;if(Math.random()>=.2)return;
  {const x=await prevTarget();if(x){const who=INN[Math.floor(Math.random()*INN.length)];prevGrant(x);store.set("innDrop",{d:day,n:(d.d===day?d.n:0)+1});vibrate([15,30,15]);sheet(`📜 ${who.name}留下一份預習卷`,b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">${who.ic} ${esc(who.name)}起身要走，從行囊裡抽出一張紙：「你下一關要闖「${esc(x.lvName)}」吧？這幾局古譜跟它是同一路的，先看看。」</p><p class="muted" style="font-size:13px;line-height:1.7">闖那一關時，按畫面上方的「📜 預習卷」就能打開來看。看預習卷不會扣分，那一關照樣能收齊兵馬車。</p><button class="btn" id="dr" style="width:100%">收下</button>`;b.querySelector("#dr").onclick=()=>closeSheet()});return}}   /* 意見回饋 573 */
  let L=null;try{L=(await api("/db/items?c=brilliant&limit=600")).items}catch(e){return}if(!L||!L.length)return;const it=L[Math.floor(Math.random()*L.length)],who=INN[Math.floor(Math.random()*INN.length)];
  const B=bag();if(B.records.some(z=>z.id===it.id))return;B.records.push({uid:"r"+Date.now().toString(36),c:"brilliant",id:it.id,name:toT(it.name||(it.red+" 對 "+it.black)),from:`驛站・${who.name}留下的`,at:Date.now()});bagSave(B);store.set("innDrop",{d:day,n:(d.d===day?d.n:0)+1});
  vibrate([15,30,15]);sheet(`📜 ${who.name}留下一份棋譜`,b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">${who.ic} ${esc(who.name)}起身要走，從行囊裡掉出一份棋譜：「這是我路上抄的比賽棋譜，送你吧，好好研讀。」</p><p class="muted">${esc(recTitle(toT(it.name||"")))}</p><p class="muted" style="font-size:13px">放在「🎒 棋童資料 → 📜 棋譜」，讀完按返回會回到石桌往事。</p><button class="btn" id="dr" style="width:100%">收下</button>`;b.querySelector("#dr").onclick=()=>closeSheet()})}
/* 意見回饋 621（開發者）：「千秋穿梭」——一張張朝代山河圖（Gemini 畫的 data/qianqiu/<朝代>.webp），每張淡入、慢慢推近再淡出，左下寫朝代和一句。
   意見回饋 697（開發者 11/6 定案）：千秋穿梭只在真的換朝代時播（星槎起航、航線換站、千秋石枰），只播經過的那幾朝，2～4 秒，可以跳過，字幕寫「元 → 明」；
   同一朝裡的園子、驛站、擂台、渡口之間改走步行小卡 walk()。原本的 travel()（6 秒、從秦播到元末）拆成這兩個 */
const QQ_ERAS=[["qin","秦","長城下的民夫"],["han","漢","冰封大漠，戰馬奔騰"],["sanguo","三國","赤壁火船，渡口難民"],["weijin","魏晉","衣冠南渡"],["nanbei","南北朝","一江分南北"],
  ["sui","隋","運河兩岸的縴夫"],["tang","唐","盛世轉衰，蜀道難行"],["wudai","五代","天下碎成十國"],["song","宋","北騎南下，煙雨江南"],["yuan","元末","黃河決堤，一路逃到石桌"],
  ["ming","明","徽州棋社，刻本棋譜傳天下"],["qing","清","茶館裡人人在打梅花譜"]];
const QQ_INFO=k=>k==="classic"?["classic","星槎","雲河上的船艙"]:QQ_ERAS.find(x=>x[0]===k)||[k,eraLabel(k),""];
/* 畫風一致性第 5 條（11/8）：驛站橫幅、園門開場卡改用水墨化的 *_ink.webp（原圖保留，同資料夾）；cpu、online 這兩張沒有水墨版 */
const INK_DIR=new Set(["inn","parkgate"]),inkArt=(d,k)=>`data/${d}/${k}${INK_DIR.has(d)&&k!=="cpu"&&k!=="online"?"_ink":""}.webp`;
const QQ_IMG=k=>k==="classic"?`url(${inkArt("inn","classic")})`:`url(data/qianqiu/${k}.webp),url(${inkArt("parkgate",k)})`;   /* 明、清還沒有山河圖，先用園門圖墊著 */
function qianqiu(from,to,done,src){if(document.querySelector(".travel,.walkc"))return;if(!to||from===to){if(done)done();return}
  try{window.XQ_DRUM&&XQ_DRUM(to,"path")}catch(e){}
  const O=QQ_ERAS.map(x=>x[0]),a=O.indexOf(from),b=O.indexOf(to),back=a>=0&&b>=0&&b<a;
  const L=(a>=0&&b>=0?(back?O.slice(b,a+1).reverse():O.slice(a,b+1)):[from,to]).map(QQ_INFO),T=Math.max(2000,Math.min(4000,L.length*650)),per=T/L.length;
  const ov=document.createElement("div");ov.className="travel qq"+(back?" back":"");
  ov.innerHTML=`<div class="qqs">${L.map(([k])=>`<div class="qqi" style="background-image:${QQ_IMG(k)}"></div>`).join("")}</div><div class="qqv"></div>
    <div class="qqt pop"><b id="qqN">${esc(L[0][1])}</b><span id="qqS">${esc(L[0][2])}</span></div>
    <div class="tcap"><b>千秋穿梭</b><span>${esc(shipShort(from))} → ${esc(shipShort(to))}</span><div class="tbar"><i style="animation-duration:${T}ms"></i></div></div><button class="tskip">跳過 ›</button>`;
  document.body.append(ov);vibrate(8);
  const I=ov.querySelectorAll(".qqi"),tx=ov.querySelector(".qqt"),nE=ov.querySelector("#qqN"),sE=ov.querySelector("#qqS");let k=0;I[0].classList.add("on");
  const tl=setInterval(()=>{k++;if(k>=I.length)return clearInterval(tl);I[k].classList.add("on");if(k>1)I[k-2].classList.remove("on");
    nE.textContent=L[k][1];sE.textContent=L[k][2];tx.classList.remove("pop");void tx.offsetWidth;tx.classList.add("pop")},per);
  const h0=location.hash;let ended=false;const end=()=>{if(ended)return;ended=true;removeEventListener("hashchange",end);clearInterval(tl);clearTimeout(tm);
    if(location.hash===h0&&typeof qqEvent==="function"&&qqEvent({L:L.map(x=>x[0]),from,to,src:src||"go",ov,h0},done))return;   /* 開發者 11/7：千秋穿梭突發事件（07h-qqev.js）；有事件就停在途經那一朝，事件結束才呼叫 done */
    ov.classList.add("out");setTimeout(()=>ov.remove(),350);if(done&&location.hash===h0)done()};addEventListener("hashchange",end);
  const tm=setTimeout(end,T+300);ov.querySelector(".tskip").onclick=e=>{e.stopPropagation();end()};ov.onclick=()=>end()}
/* 意見回饋 697：同一朝走路的步行小卡——那一朝的場景圖加一行「沿著小徑走到〇〇」，不到 1 秒，點一下就過；同一天走過同一條路，第二次起只淡入淡出（walkSeen 只記今天，不跟存檔走）。
   3D 園子、擂台本來就有自己的入口畫面（園門、擂門），就不再疊一張 */
const WALK_IMG={park:"parkgate",inn:"inn",arena:"arenagate",port:"qianqiu"};
function walkHere(){return store.get("eraUser",null)||store.get("era","classic")}   /* 讀石桌往事時 era 暫時是故事的朝代，人其實在 eraUser 那一朝 */
function walkName(to,k){return to==="park"?parkName(k):to==="inn"?innName(k):to==="arena"?((ARENA[k]||{}).name||"擂主")+"的擂台":portName(k)}
function walk(to,done,cap){if(document.querySelector(".travel,.walkc"))return;const k=walkHere();
  if(to==="arena"||(to==="park"&&parkOn())){if(done)done();return}
  const day=new Date().toDateString(),W=store.get("walkSeen",null),seen=W&&W.d===day&&Array.isArray(W.k)?W.k:[],key=k+":"+to,fast=seen.includes(key);
  if(!fast)store.set("walkSeen",{d:day,k:seen.concat(key).slice(-60)});
  const c=document.createElement("div");c.className="walkc"+(fast?" fast":"");
  if(!fast)c.innerHTML=`<i style="background-image:url(${inkArt(WALK_IMG[to]||"parkgate",k)}),url(${inkArt("parkgate",k)})"></i><div><small>${esc(cap||(to==="port"?"🚶 沿著小徑走回":"🚶 沿著小徑走到"))}</small><b>${esc(walkName(to,k))}</b></div>`;
  document.body.append(c);requestAnimationFrame(()=>c.classList.add("on"));
  const h0=location.hash;let ended=false;const end=()=>{if(ended)return;ended=true;clearTimeout(tm);if(done&&location.hash===h0)done();setTimeout(()=>{c.classList.remove("on");setTimeout(()=>c.remove(),300)},fast?40:100)};
  c.onclick=end;const tm=setTimeout(end,fast?170:620)}   /* 小卡停 0.6 秒、淡出 0.3 秒，全程不到 1 秒；淡入淡出版約 0.5 秒 */
/* 地點頁的「‹」：回那一層（goUp，不照瀏覽器上一頁）；回渡口時走步行小卡 */
function upTo(h){if(navKey(h)==="/port"&&navKey(location.hash)!=="/port")return walk("port",()=>goUp(h));goUp(h)}
/* 開發者 11/5（RPG 企劃）：驛站的點將台——隱藏殘局得到的將令在這裡換東西 */
const LING_SHOP=[{k:"hint",ic:"💡",n:"提示棋 3 顆",c:1},{k:"undo",ic:"↶",n:"悔棋符 2 張",c:1},{k:"prev",ic:"📜",n:"自己挑一關的預習卷",c:2},{k:"clue",ic:"🗝",n:"一位秘境棋友的線索（在哪個朝代的園子、點哪個東西）",c:3}];
const secretClues=()=>store.get("secretClue",{}),clueText=x=>{const sp=secretSpots()[x.id];return sp?`去「${eraLabel(sp.era)}」的園子，點一下「${SPOT_OBJ[sp.k]||sp.k}」`:""};
function lingShopBind(v){const box=v.querySelector("#lingBox");if(!box)return;
  const draw=()=>{const n=lingN(),all=jarN()>=72;box.innerHTML=`<div class="sec-t">${HIDN.ic} 點將台（將令 ${n} 枚）</div><div class="card muted" style="line-height:1.7;font-size:13px">${ROAD_NAME}收到「車」的時候，有機會出現隱藏殘局；解開得一枚將令，拿來這裡換東西。${lingTitle()?`<br>🏅 稱號：${lingTitle()}`:`<br>累積拿到 12 枚將令，得到稱號「領令先鋒」（花掉的也算，現在累積 ${jHidGot()} 枚）。`}</div>
    <div class="items" style="padding:0">${LING_SHOP.map(x=>{const off=n<x.c||(x.k==="prev"&&all);return`<button class="item" data-ling="${x.k}" ${off?"disabled":""}><span class="lb" style="font-size:22px">${x.ic}</span><span class="tx"><b style="white-space:normal">${esc(x.n)}</b><span>${x.k==="prev"&&all?"棋罐滿 72 子，預習卷已經全開":`${x.c} 枚將令`}</span></span><span class="muted">›</span></button>`}).join("")}</div>`;
    box.querySelectorAll("[data-ling]").forEach(b=>b.onclick=()=>buy(LING_SHOP.find(z=>z.k===b.dataset.ling)))};
  const pay=(x,fn)=>{if(lingN()<x.c)return toast("將令不夠");lingAdd(-x.c);fn();vibrate([15,30,15]);draw()};
  async function buy(x){if(!x)return;
    if(x.k==="hint")return confirmBox(`用 ${x.c} 枚將令換 3 顆提示棋？`,()=>pay(x,()=>{store.set("hintBonus",(store.get("hintBonus",0)||0)+3);toast("💡 收下 3 顆提示棋（放在庫存）")}),"換");
    if(x.k==="undo")return confirmBox(`用 ${x.c} 枚將令換 2 張悔棋符？`,()=>pay(x,()=>{store.set("undoBonus",undoLeft()+2);toast("↶ 收下 2 張悔棋符")}),"換");
    if(x.k==="prev"){const P=await prevData(),L=jStages().concat(book1Done()?jStages2():[]).filter(z=>(P[z.id]||[]).length&&!prevHas(z.id));if(!L.length)return toast("每一關的預習卷都已經拿到了");
      return sheet("📜 挑一關的預習卷",b=>{b.innerHTML=`<p class="muted" style="font-size:13px;margin:0 0 8px">預習卷是古譜裡跟那一關同型的例局，先看再闖關比較容易收到「車」。用 ${x.c} 枚將令換一張。</p><div class="items" style="padding:0">${L.map(z=>`<button class="item" data-pv="${z.id}"><span class="lb">📜</span><span class="tx"><b>${esc(z.name)}</b></span><span class="muted">›</span></button>`).join("")}</div>`;
        b.querySelectorAll("[data-pv]").forEach(c=>c.onclick=()=>{const z=L.find(q=>q.id===c.dataset.pv);closeSheet();setTimeout(()=>confirmBox(`用 ${x.c} 枚將令換「${z.name}」的預習卷？`,()=>pay(x,()=>{prevGrant(z);toast("📜 收下了：在那一關的說明裡按「📜 預習卷」打開")}),"換"),260)})})}
    if(x.k==="clue"){const Sx=jSecrets(),C=secretClues(),t=SECRETS.find(z=>!Sx[z.id]&&!C[z.id]);if(!t)return toast(SECRETS.every(z=>Sx[z.id])?"秘境棋友都找到了":"還沒找到的秘境棋友，線索都已經給過了（看下面的清單）");
      return confirmBox(`用 ${x.c} 枚將令換一位秘境棋友的線索？`,()=>pay(x,()=>{const C2=secretClues();C2[t.id]=Date.now();store.set("secretClue",C2);sheet("🗝 秘境棋友的線索",b=>{b.innerHTML=`<p style="font-size:16px;line-height:1.9">有一位秘境棋友藏在這裡：<br><b>${esc(clueText(t))}</b>看看。</p><p class="muted">線索會一直記在驛站的秘境棋友清單上。</p><button class="btn" id="clOk" style="width:100%">知道了</button>`;b.querySelector("#clOk").onclick=()=>{closeSheet();route()}})}),"換")}}
  draw()}
function innSheet(v){setTimeout(innDrop,1200);const I=xpInfo(),Sx=jSecrets(),nx=JR.find((R,i)=>R.lv>I.L&&jarN()<(JAR_GATE[i]||0));v.className="view";
  const row=(x,locked)=>`<button class="item" data-inn="${x.id}" ${locked?"disabled":""}><span class="lb" style="font-size:24px">${locked?"❔":secIc(x)}</span><span class="tx"><b>${locked?"？？？（還沒找到）":esc(x.name)}</b><span>${locked?(secretClues()[x.id]?"🗝 線索："+esc(clueText(x)):""):x.who?`${esc(x.who)}・第 ${secretLv(x)} 級`:`第 ${innLvN(x)} 級`}</span></span><span class="muted">${locked?"":"›"}</span></button>`;
  /* 意見回饋 697（開發者 11/6 定案）：驛站是這一朝渡口的一扇門——「‹」回渡口（從章回棋路、棋童資料點進來的回原本那一頁），右上「⛵」回星槎；朝代照星槎停靠那一朝（shipHere），不帶故事的朝代 */
  const IE=typeof shipHere==="function"?shipHere():store.get("era","classic"),pv=navPrev(),out=pv&&/^#\/(journey|shelf|profile|me)(\/|$)/.test(pv)&&!/^#\/journey\/(inn|play|park)/.test(pv)?pv:null;
  setTop("🏮 "+innName(IE),out||"^#/port",[["⛵",()=>goUp("#/adventure"),"回星槎"]]);
  v.innerHTML=`<div class="pad"><div class="abn" style="height:160px;background-image:url(${inkArt("inn",IE)});margin-bottom:10px"><div class="hc"><b>🏮 ${esc(innName(IE))}</b><small>路過的旅人都在這裡歇腳下棋</small></div></div><div class="card" style="line-height:1.8">🀄 <b>Lv ${I.L} ${I.title}</b>${nx?`・${ROAD_NAME}「${roadSeg(JR.indexOf(nx))}」要 Lv ${nx.lv}（還差 ${nx.lv-I.L} 級），或棋罐 ${JAR_GATE[JR.indexOf(nx)]} 子（你有 ${jarN()} 子）`:`・${ROAD_NAME}每一${ROAD_UNIT}都能進了`}<br><span class="muted" style="font-size:13px">驛站裡都是路過的旅人，找誰下都可以、下幾次都可以。</span></div>
    <div class="inn-walk"><button class="btn ghost" id="toPark">🌳 走去園子</button><button class="btn ghost" id="toArena">🏯 走去擂台</button><button class="btn ghost" id="toShip">⛵ 回星槎</button></div>
    <div class="sec-t">🏮 路過的旅人</div><div class="items" style="padding:0">${INN.map(x=>row(x)).join("")}${typeof igRows==="function"?igRows(IE):""}</div>
    <div class="sec-t">🗝 秘境棋友（${Object.keys(Sx).length}/${SECRETS.length}）</div><div class="items" style="padding:0">${SECRETS.map(x=>row(x,!Sx[x.id])).join("")}</div>
    <div id="gardenBox"></div>
    <div id="lingBox"></div>
</div>`;lingShopBind(v);if(typeof gardenInn==="function")gardenInn(v);if(typeof yzInn==="function")yzInn(v,IE);   /* 意見回饋 759：上方換成驛站滿版圖（07m-yizhan.js）；意見回饋 658：📮 信箱、🌸 園子棋友的羈絆、📜 棋史卡（07d-garden.js） */
  /* 意見回饋 697：同一朝的園子、擂台用步行小卡過去，用 replace 不疊上一頁（「‹」一律回渡口） */
  const okK=()=>{if(eraLocked(IE)){toast(eraLockMsg(IE));return false}return true};
  (v.querySelector("#toPark")||{}).onclick=()=>{vibrate(5);if(okK())walk("park",()=>shipPark(IE,true))};
  (v.querySelector("#toArena")||{}).onclick=()=>{vibrate(5);if(okK())walk("arena",()=>shipArena(IE,true))};
  (v.querySelector("#toShip")||{}).onclick=()=>{vibrate(5);goUp("#/adventure")};
  v.querySelectorAll("[data-inn]").forEach(b=>b.onclick=()=>{const x=INN.concat(SECRETS).find(z=>z.id===b.dataset.inn);if(!x||(SECRETS.includes(x)&&!Sx[x.id]))return;
    const lv=x.who?secretLv(x):innLvN(x),rl=x.who?null:innRlv(x);
    sheet(`${x.ic} ${x.name}`,c=>{c.innerHTML=`${x.who?secretBio(x):""}<p class="muted" style="margin:0 0 2px">${esc(innCall(x))}</p><p style="font-size:16px;line-height:1.8">${esc(x.say)}</p><p class="muted">第 ${lv} 級</p><button class="btn" id="ig" style="width:100%">⚔ 下一盤</button>`;
      c.querySelector("#ig").onclick=()=>{closeSheet();if(rl!=null)store.set("innCur",{id:x.id,rl});jStart("inn:"+x.id,rl==null?{human:"r",level:lv,journey:"inn:"+x.id}:{human:"r",level:Math.max(1,Math.min(6,1+Math.floor(rl/3))),rlv:rl,journey:"inn:"+x.id},()=>{location.hash="#/journey/play";setTimeout(()=>toast(`${x.ic} ${x.name}：${x.say}`),500)})}})});
  if(typeof igBind==="function")igBind(v,IE);   /* 意見回饋 826：今天從別處路過的客人（07m2-innguest.js） */
  return{}}
/* 意見回饋 327：石桌往事的棋（雲河棋路、驛站、公園）自己留一盤，跟朝代擂台、挑戰電腦互不干擾 */
/* 意見回饋 588（開發者：路人看起來都是 Lv1，要照修為調整才有挑戰性）：每 3 級修為升一級（Lv3＝第 2 級電腦，最高第 8 級），再照最近輸贏微調：贏了下一位強一點、輸了弱一點（最多上下 2 級） */
const parkLv=()=>Math.max(1,Math.min(8,1+Math.floor(xpInfo().L/3)+(store.get("parkAdj",0)||0)));
function jName(j){if(!j)return"石桌往事";if(j==="park")return"園子";if(String(j).startsWith("gx:")){const g=typeof gxGet==="function"?gxGet(String(j).slice(3)):null;return"幻譜星門・"+(g?g.t:"第十四顆")}if(String(j).startsWith("bh:"))return"黑洞・星樞棋局";if(String(j).startsWith("bt:")){const c=typeof battleCardJ==="function"?battleCardJ(j):null;return"古戰場・"+(c?c.name:"讓子對弈")}if(String(j).startsWith("char:")){const c=JCHAR[String(j).slice(5)];return c?"大廳・"+c.name:"大廳"}if(String(j).startsWith("inn:")){const x=INN.concat(SECRETS).find(z=>"inn:"+z.id===j)||(typeof igAct==="function"?igAct(j):null);return x?"驛站・"+x.name:"驛站"}
  const s=jFindStage(j);return s?(s.book===2?"紙譜新局・":ROAD_NAME+"・")+s.name:ROAD_NAME}
const jBack=j=>String(j||"").startsWith("gx:")?"#/adventure":String(j||"").startsWith("bh:")?"#/adventure":String(j||"").startsWith("bt:")?"#/battle":String(j||"").startsWith("char:")?"#/lobby":j==="park"?"#/port":String(j||"").startsWith("inn:")?"#/journey/inn":(()=>{const R=jRunGet(j);if(R&&!R.done)return"#/journey/"+j;const s=jFindStage(j);return s?jChapterHref(s):"#/shelf/1"})();
const jPlace=j=>String(j||"").startsWith("gx:")?"幻譜星門":String(j||"").startsWith("bh:")?"星槎":String(j||"").startsWith("bt:")?"古戰場":j==="park"?"渡口":String(j||"").startsWith("inn:")?"驛站":String(j||"").startsWith("char:")?"大廳":(()=>{const s=jFindStage(j);return s?"第"+CNUM(s.n)+"回":"石桌往事"})();   /* 意見回饋 735：章回棋路併進書的目錄，回到書 */
/* 意見回饋 413：石桌往事只留一盤（雲河棋路、驛站、園子、守關共用一格）。要開的跟手上那盤不是同一個對手時先問，不會悄悄蓋掉；同一個對手就接著下；force＝重下這一盤 */
async function jStart(id,b,go,force){let st;try{st=await api("/play/state")}catch(e){toast(e.message);return}
  const cur=st.journey&&!st.result&&st.moves&&st.moves.length?{journey:st.journey,n:st.moves.length}:null,o=(st.others||[]).find(z=>z.kind==="journey");let g=cur||(o?{journey:o.journey,n:o.n}:null);
  if(g&&typeof rsFinGame==="function"&&rsFinGame(rsJId(st)))g=null;   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：「撐過 N 步」已經過關的那盤，不問、直接開新的 */
  const fresh=async()=>{try{store.set("cpuRanked",false);const ez=id==="park"&&typeof qqParkEasy==="function"?qqParkEasy():null;   /* 贖回攔路棋客押走的東西：那一盤低一級（07h-qqev.js） */const s=await api("/play/new",{...b,dx:typeof diffDx==="function"?diffDx():0,...(ez||{})});if(id==="park")parkNpcNew(s.id,ez?ez.level:b.level);   /* 意見回饋 675：照航行難度加減幾段（園子、驛站、秘境棋友、章回棋路對弈關都從這裡開） */store.set("jPending",id==="park"?null:{id,game:s.id});go(true)}catch(e){toast(e.message)}};
  if(force||!g)return fresh();
  if(g.journey===id)return go(false);
  modal(`<div class="em">🪨</div><h2>石桌往事還有一盤沒下完</h2><p class="muted">「${esc(jName(g.journey))}」下到第 ${Math.ceil(g.n/2)} 回合。石桌往事一次只留一盤，開新的，那一盤就不留了。</p>`,
    [["⏳ 繼續那一盤",()=>{location.hash="#/journey/play"}],["放棄，開新的",fresh],["取消",null,true]])}
/* 結果視窗、新局：跟同一位對手（園子、驛站）再下一盤 */
function jAgain(st){if(String(st.journey||"").startsWith("bt:")&&typeof battleOddsAgain==="function")return battleOddsAgain(st);   /* 古戰場的讓子對弈：再下一盤要同樣的讓子 */
  const j=st.journey,n0=j==="park"?parkNpcOf(st):null,ix=String(j||"").startsWith("inn:")?INN.find(z=>"inn:"+z.id===j):null,rl=ix?innRlv(ix):null;if(ix)store.set("innCur",{id:ix.id,rl});   /* 意見回饋 548：驛站旅人再下一盤用調整後的強度 */
  {const ga=!ix&&typeof igAgainArgs==="function"?igAgainArgs(j,typeof diffDx==="function"?diffDx():0):null;if(ga)return api("/play/new",ga).then(s=>{store.set("jPending",{id:j,game:s.id});return s})}   /* 意見回饋 826：路過的客人再下一盤 */
  return api("/play/new",ix?{human:"r",level:Math.max(1,Math.min(6,1+Math.floor(rl/3))),rlv:rl,journey:j,dx:typeof diffDx==="function"?diffDx():0}:{human:"r",lx:st.level,journey:j}).then(s=>{if(j==="park")parkNpcNew(s.id,s.level,n0&&n0.id);store.set("jPending",j==="park"?null:{id:j,game:s.id});return s})}   /* 意見回饋 425：園子再下一盤＝同一位路人、同樣的難度。開發者 11/6 修：st.level 已是細分的 1～18 級，要用 lx 傳；原本傳 level 會被當成舊 1～8 級再換算一次，入門3 再下一盤變業5 */
async function jResume(box,only){if(!box)return;let st;try{st=await api("/play/state")}catch(e){return}
  const cur=st.journey&&!st.result&&st.moves&&st.moves.length?{journey:st.journey,n:st.moves.length,me:st.turn===st.human}:null,
    o=(st.others||[]).find(z=>z.kind==="journey"),g=cur||(o?{journey:o.journey,n:o.n,me:(o.n%2?"b":"r")===o.human}:null);
  if(g&&typeof rsFinGame==="function"&&rsFinGame(rsJId(st)))return;   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：「撐過 N 步」已經過關的那盤不出「繼續下」 */
  if(!g||!box.isConnected||(only&&!only(g.journey)))return;   /* only：書頁只看這本書的對局 */
  box.innerHTML=`<button class="card row" style="width:100%;margin-top:10px;justify-content:space-between;border:2px solid var(--red);font:inherit;color:inherit;text-align:left"><span>⏳ <b>${esc(jName(g.journey))}</b><br><span class="muted" style="font-size:12.5px">下到第 ${Math.ceil(g.n/2)} 回合・${g.me?"輪到你走":"輪到電腦"}</span></span><b>繼續下 ›</b></button>`;
  box.querySelector("button").onclick=async()=>{vibrate(5);if(!cur)try{await api("/play/switch",{kind:"journey"})}catch(e){}if(g.journey==="park")store.set("park3d",true);location.hash="#/journey/play"}}
/* 意見回饋 711（開發者 11/6）：13 顆石頭都擺出來，還沒停靠的朝代變灰、點了跳提示（不再藏起來，只剩一半不好看） */
function ParkGate(v){setTop("🪨 千秋石枰","#/adventure");setTabs(false);v.className="view";const cur=typeof shipHere==="function"?shipHere():store.get("era","classic");
  /* 意見回饋 360：石桌上擺著 13 顆朝代石頭（Gemini 畫的，刻著那個朝代書法的字），點一顆就進那個朝代的公園；石頭圖還沒到的先用圓圈 */
  v.innerHTML=`<div class="pad"><div class="stbl"><p class="stbl-t">擇石一枚，步入彼朝之園</p><p style="text-align:center;font-size:13px;margin:-4px 0 8px;color:#f3ecdd;text-shadow:0 1px 3px rgba(0,0,0,.9)">點一顆石頭，星槎就開往那一朝，直接進那裡的園子・灰色的是星槎還沒停靠過</p><div class="eras">${ARENA_ORDER.map(k=>{const sl=ARENA[k].seal||"";return`<button class="era-c stone${k===cur?" on":""}${eraLocked(k)?" elk":""}" data-e="${k}"><img src="data/stones/${k}.webp" alt="" onerror="this.parentElement.classList.remove('stone');this.remove()"><span${sl.length>1?' class="two"':""}>${esc(sl)}</span><b>${esc(eraLabel(k))}</b></button>`}).join("")}</div></div><div id="pRes"></div></div>`;
  jResume(v.querySelector("#pRes"));
  /* 意見回饋 697（開發者 11/6）：千秋石枰是換朝代——石頭翻轉後播千秋穿梭（只播經過的那幾朝），era 和星槎停靠（shipAt）一起改；點的是現在這一朝就直接進園子。
     園子換掉千秋石枰這一頁（replace），園子的「‹」回渡口 */
  v.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{if(b.disabled)return;const k=b.dataset.e;if(eraLocked(k)){vibrate(8);toast(eraLockMsg(k));return}b.disabled=true;vibrate(5);setTimeout(()=>{b.disabled=false},2500);   /* 意見回饋 673：星槎還沒停靠的朝代進不去 */
    const from=typeof shipAt==="function"?shipAt():cur,im=b.querySelector("img");if(im&&k!==from)im.classList.add("sflip");
    setTimeout(()=>qianqiu(from,k,()=>{if(typeof shipEra==="function")shipEra(k);else{store.set("era",k);try{applyEra()}catch(e){}}store.set("park3d",true);try{saveNow(true)}catch(e){}
    jStart("park",{human:"r",level:parkNpcLv(),journey:"park"},()=>{navReplace("#/journey/play");
      setTimeout(()=>{const r=store.get("parkNpc",null),n=r&&PARK_NPC.find(x=>x.id===r.id);toast(`🌳 ${parkName(k)}到了${n?"・遇到"+n.name:""}`);if(k==="classic"&&typeof tellerTalk==="function")setTimeout(()=>tellerTalk(),900)},600)})},"park"),k===from?0:800)})}   /* 意見回饋 674：青石園有說書人 */
/* 意見回饋 389：點朝代石頭——石頭先慢慢翻轉，再出現那個朝代的封面（驛站場景圖＋朝代名＋印），然後才進公園下棋；點封面可以跳過 */
function stoneCover(b,k){return new Promise(res=>{const im=b.querySelector("img")||b;im.classList.add("sflip");vibrate(8);
  const info=(PARK_INFO[k]||PARK_INFO.classic)._||[eraLabel(k),""],seal=(ARENA[k]&&ARENA[k].seal)||"";let done=false;
  setTimeout(()=>{const c=document.createElement("div");c.className="ecover";c.innerHTML=`<i style="background-image:url(${inkArt("inn",k)})"></i><div><b>${esc(eraLabel(k))}</b><small>${esc(info[1]||"")}</small></div>`;   /* 開發者：拿掉印章，下面已經寫了朝代名 */
    document.body.append(c);requestAnimationFrame(()=>c.classList.add("on"));
    const fin=()=>{if(done)return;done=true;res();setTimeout(()=>{c.classList.remove("on");setTimeout(()=>c.remove(),600)},700)};c.onclick=fin;setTimeout(fin,1700)},900)})}
const CNUM=n=>{const c="零一二三四五六七八九";return n<=10?(n===10?"十":c[n]):n<20?"十"+c[n-10]:c[Math.floor(n/10)]+"十"+(n%10?c[n%10]:"")};
let JS_CACHE=null,JS2_CACHE=null;
/* 第二集《紙譜新局》：關卡 id 是 b2h01～b2h36（跟第一集的 h01～h36 分開記星星） */
function jStages2(){if(JS2_CACHE)return JS2_CACHE;return JS2_CACHE=(typeof JL2!=="undefined"?JL2:[]).map(([nm,ty,ai,has,act],k)=>{const n=k+1;return{id:"b2h"+String(n).padStart(2,"0"),n,r:0,book:2,act,name:`第${CNUM(n)}回・${nm}`,lvName:nm,spec:ty,t:"lv"}})}
/* 意見回饋 610（開發者）：進石桌往事自動換朝代——第一集（元末明初）換成元朝、第二集（明朝）換成明朝；離開故事線就換回玩家自己設定的朝代。
   做法：進故事時把玩家原本的朝代存在 eraUser，再把 era 改成故事的朝代；離開時從 eraUser 還原。App 在故事裡被關掉，下次打開不在故事頁就會自動還原 */
const STORY_ERA={1:"yuan",2:"ming"};
function storyBookOf(h){h=String(h||"");
  if(/^#\/shelf\//.test(h))return h.startsWith("#/shelf/2")&&(book1Done()||DEVMODE())?2:1;   /* 意見回饋 674：書架上的書才算故事線；#/adventure（星槎頁）照自己的朝代，讀故事換的元、明不算星槎停靠 */
  if(/^#\/journey\/b2h/.test(h))return 2;
  if(/^#\/journey\/park/.test(h))return 0;   /* 園子可以自己挑朝代（穿越），不算故事線 */
  /* 意見回饋 618（開發者）：從石桌往事點進去的棋童資料（我的角色）、驛站、驛站裡的對局都維持故事的朝代，只有去園子才換。
     這幾頁回傳 -1＝「照舊」：從故事點進來就留在故事朝代，從首頁點進來就是自己的朝代 */
  if(/^#\/(me|profile)(\/|$)/.test(h))return -1;
  if(/^#\/journey\/inn(\/|$)/.test(h))return 0;   /* 意見回饋 697（開發者 11/6）：驛站一律是星槎停靠那一朝的驛站，不帶故事的朝代 */
  if(/^#\/journey\/play/.test(h)){const P=store.get("jPending",null);return !P?-1:String(P.id||"").startsWith("inn:")?0:String(P.id||"").startsWith("b2h")?2:1}   /* 驛站裡的對局沒有闖關紀錄 */
  if(/^#\/(journey|legend)(\/|$)/.test(h))return 1;
  return 0}
function storyEraSync(){try{const b=storyBookOf(location.hash),cur=store.get("era","classic"),saved=store.get("eraUser",null);let to=null;if(b<0)return;
  if(b){const want=STORY_ERA[b];if(saved==null)store.set("eraUser",cur);if(cur!==want)to=want;
    if(to&&!store.get("storyEraTip",0)){store.set("storyEraTip",1);setTimeout(()=>toast(`📜 故事發生在${b===1?"元末明初":"明朝"}，畫面換成${b===1?"元朝":"明朝"}風格；離開故事會換回你原本的朝代`),600)}}
  else if(saved!=null){store.set("eraUser",null);if(cur!==saved)to=saved}
  if(to){store.set("era",to);try{if(typeof PARK!=="undefined"&&PARK){PARK.v.destroy();PARK=null}}catch(e){}applyEra()}}catch(e){}}
const jFindStage=id=>jStages().find(x=>x.id===id)||jStages2().find(x=>x.id===id);
function jStages(){if(JS_CACHE)return JS_CACHE;const out=[];JL.forEach(([nm,ty,ai,has],k)=>{const n=k+1,ri=Math.max(0,JR.findIndex(R=>n>=R.ch[0]&&n<=R.ch[1])),R=JR[ri],id="h"+String(n).padStart(2,"0");
  const base={id,n,r:ri,name:`第${CNUM(n)}回・${nm}`,lvName:nm,spec:ty,lo:R.tiers[0],hi:R.tiers[1]};
  out.push(has?{...base,t:"lv"}:ai>0?{...base,t:"ai",lv:Math.min(8,ai)}:{...base,t:"puz",cats:/殘局/.test(ty)?["殘局","殺法"]:null})});return JS_CACHE=out}
/* 換成 36 回之前的進度（30 關）照比例搬過來：過了幾關就換算成新的前幾關、星星照原本那關；修為本來就另外記，不受影響 */
(function jMigrate36(){try{if(store.get("jMig36",false))return;const S=store.get("jStars",{}),old=[];["dukou","chaguan","qihui","juesai","shizhuo"].forEach(k=>{for(let i=1;i<=6;i++)old.push(S[k+"-"+i]||0)});
  const P=old.filter(x=>x>0).length,np=Math.min(36,Math.round(P*36/30));for(let j=0;j<np;j++){const id="h"+String(j+1).padStart(2,"0");if(!S[id])S[id]=old[Math.min(29,Math.floor(j*30/36))]||1}
  store.set("jStars",S);store.set("jMig36",true)}catch(e){}})();
const jStars=()=>store.get("jStars",{}),jSet=(id,n,why)=>{const S=jStars(),old=S[id]||0;if(n>old){S[id]=n;store.set("jStars",S);for(let k=old+1;k<=n;k++)addXP(20,why||"闖關",`j:${id}:${k}`);setTimeout(jarCheck,1800)}return Math.max(n,old)};
/* 開發者 11/5（RPG 企劃方案第一批）：星星改成象棋語言——每關依序收「兵」「馬」「車」（子力由小到大），收到的子放進棋罐（兩集共 216 子）。
   棋罐集到門檻自動換提示棋、悔棋符、稱號、預習卷全開；也能代替等級進下一站（JAR_GATE＝各站要幾子）。存檔照舊用 jStars（每關 1～3） */
const ZI=["兵","馬","車"],JAR_MAX=216,JAR_GATE=[0,14,28,42,58];
const jarN=()=>{const S=jStars();let n=0;for(const k in S)if(/^(b2)?h[0-9][0-9]$/.test(k))n+=Math.min(3,+S[k]||0);return n};
const ziStr=n=>ZI.slice(0,n).join("")+"・".repeat(Math.max(0,3-n));
const ziHTML=(n,ling,big)=>`<span class="zis${big?" big":""}" aria-label="收到${ZI.slice(0,n).join("、")||"還沒收子"}${ling?"，還有將令":""}">${ZI.map((z,i)=>`<i class="zi${i<n?" on":""}">${z}</i>`).join("")}${ling?'<i class="zi ling">令</i>':""}</span>`;
const JAR_MS=[[10,"💡 提示棋 3 顆","hint"],[20,"↶ 悔棋符 3 張","undo"],[36,"🏅 稱號「雲河棋童」","title"],[72,"📜 預習卷全開（每一關都直接附上）","prev"],[108,"🏅 稱號「石桌滿盤」","title"],[216,"🏅 稱號「兩集滿盤」","title"]];
const JAR_TITLES=[[216,"兩集滿盤"],[108,"石桌滿盤"],[36,"雲河棋童"]],jarTitle=()=>{const n=jarN(),t=JAR_TITLES.find(([k])=>n>=k);return t?t[1]:""};
const jarNext=()=>{const n=jarN();return JAR_MS.find(([k])=>n<k)||null};
const jarLine=()=>{const n=jarN(),x=jarNext(),L=lingN();return`🫙 棋罐 ${n}／${JAR_MAX} 子${x?`・再 ${x[0]-n} 子換 ${x[1]}`:""}${L?`・${HIDN.ic} 將令 ${L}`:""}`};
function jarCheck(){const n=jarN(),G=store.get("jarGot",{}),got=[];for(const [k,lb,ty] of JAR_MS){if(n<k||G[k])continue;G[k]=Date.now();if(ty==="hint")store.set("hintBonus",(store.get("hintBonus",0)||0)+3);if(ty==="undo")store.set("undoBonus",undoLeft()+3);got.push(`${k} 子：${lb}`)}
  if(!got.length)return;store.set("jarGot",G);vibrate([15,30,15]);const x=jarNext();
  sheet("🫙 棋罐集到了！",b=>{b.innerHTML=`<p style="line-height:1.9;font-size:16px">你的棋罐已經有 <b>${n}</b> 顆子，換到：</p><ul style="line-height:1.9;font-size:15px;margin:4px 0 10px">${got.map(z=>`<li>${esc(z)}</li>`).join("")}</ul>${x?`<p class="muted">下一個：再 ${x[0]-n} 子換 ${esc(x[1])}</p>`:""}<button class="btn" id="jcOk" style="width:100%">收下</button>`;b.querySelector("#jcOk").onclick=closeSheet})}
const prevHas=id=>!!prevOwn()[id]||jarN()>=72;
function jLvOk(s){return xpInfo().L>=(JR[s.r].lv||1)||jarN()>=(JAR_GATE[s.r]||0)}
function jOpen(list,i){return(i===0||!!jStars()[list[i-1].id])&&jLvOk(list[i])}
const jIcon={puz:"🧩",scene:"🕰",ai:"⚔",boss:"🏯",lv:"🎴"};
/* 對弈、守關：開一盤挑戰電腦，記下是哪一關；那盤結束時在 CpuGame 裡判定（journeyGameEnd） */
function jPlay(s,force){const b=s.t==="boss"?{human:"r",level:s.lv,arena:s.era,journey:s.id}:{human:"r",level:s.lv,journey:s.id};   /* 守關帶 arena 只是借擂主的外觀和台詞；這盤算石桌往事（local.js kindOf：journey 優先） */
  return jStart(s.id,b,()=>{if(s.t==="boss"&&!parkOn())store.set("park3d",true);location.hash="#/journey/play";setTimeout(()=>toast(s.t==="boss"?`🏯 ${ARENA[s.era].name}：${ARENA[s.era].hi}`:`⚔ ${ROAD_NAME}・${s.name}：贏了就過關`),500)},force)}
/* 第二集 play 的 rule（starOnly 版本：不擋、只記失誤）：noCross 前幾步車過河、finishWith 最後一將不是指定的子 */
/* 贏棋時最後一將是哪一顆子（FEN 字母；第二集三星 finishWith 用） */
function lvLastPiece(st){const C=window.XQCore;let b;try{b=C.parseFen(st.start||C.START)}catch(e){return null}const mv=st.moves||[];let p=null;for(const m of mv){p=b[m.f]||null;b=C.make(b,m.f,m.t)}return p}
function lvRuleMiss(st,rule,me){const C=window.XQCore;let b,miss=0,n=0,crossed=false;try{b=C.parseFen(st.start||C.START)}catch(e){return 0}const mv=st.moves||[];
  for(let i=0;i<mv.length;i++){const m=mv[i],p=String(b[m.f]||"");if(m.by===me){n++;const nc=rule.noCross;
      if(nc&&!crossed&&n<=(nc.until||12)&&p.toUpperCase()===String(nc.piece||"R").toUpperCase()){const row=Math.floor(m.t/9);if(me==="r"?row<=4:row>=5){crossed=true;miss++}}
      if(rule.finishWith&&i===mv.length-1&&st.result&&st.result.w===me&&p.toUpperCase()!==String(rule.finishWith.piece||"P").toUpperCase())miss++}
    b=C.make(b,m.f,m.t)}return miss}
function journeyGameEnd(st){if(!st||!st.result)return;try{if(typeof qqParkEnd==="function")qqParkEnd(st)}catch(e){}   /* 千秋穿梭突發事件：在園子贏了攔路棋客＝贖回押著的東西 */
  if(!st.practice&&(st.moves||[]).length>=10&&!(typeof bhtdNoXp==="function"&&bhtdNoXp(st)))addXP(st.result.w===st.human?40:15,"對局","g:"+st.id);   /* 11/14：星淵急襲只給星塵、不給修為（07bht bhtdNoXp） */   /* QA P1-3：雙方各走不到 5 步就結束（走一步就認輸）不給修為，免得刷經驗 */
  const P=store.get("jPending",null);if(!P||P.game!==st.id)return;store.set("jPending",null);
  if(String(P.id).startsWith("bh:")){if(typeof bhGameEnd==="function")bhGameEnd(st,P);return}
  if(String(P.id).startsWith("gx:")){if(typeof gxGameEnd==="function")gxGameEnd(st,P);return}   /* 幻譜星門・十三星系（07gx-galaxy.js）：記星印、推進玉宿／北辰的進度 */   /* hspx（開發者 11/12）：黑洞星樞棋局（07bh-blackhole.js）：記輸贏、調下次難度 */
  if(String(P.id).startsWith("bt:")){if(typeof battleOddsEnd==="function")battleOddsEnd(st,P);return}   /* 古戰場的讓子對弈（07g-battle.js）：贏了蓋戰役印 */
  if(String(P.id).startsWith("inn:")){const x=INN.concat(SECRETS).find(z=>"inn:"+z.id===P.id);if(!x){if(typeof igGameEnd==="function")igGameEnd(st,P);return}   /* 意見回饋 826：路過的客人 */
    let rl=null;if(!x.who){const C=store.get("innCur",null);rl=C&&C.id===x.id&&Number.isInteger(C.rl)?C.rl:innRlv(x);const i=INN.indexOf(x),B=INN_BAND[i]||INN_BAND[0],A=store.get("innAdj",{});
      if(st.result.w===st.human)A[x.id]=Math.min(B[1],rl+1);else if(st.result.w)A[x.id]=Math.max(B[0],rl-1);store.set("innAdj",A)}
    const TK=typeof innTalk==="function"?innTalk(x):{win:"承讓了，下次再來！",lose:"好棋！佩服。",draw:"承讓了，下次再來！"};   /* 意見回饋 826 追加：旅人、秘境棋友各說自己的話（07m3-opptalk.js） */
    if(st.result.w===st.human){const xp=x.who?secretXP(x):innXP(rl);addXP(xp,"驛站","inn:"+st.id);setTimeout(()=>toast(`${x.ic} ${x.name}：「${TK.lose}」`),1500);
      if(x.who){const W=store.get("secretWins",{});W[x.id]=(W[x.id]||0)+1;store.set("secretWins",W);setTimeout(()=>secretGift(x,st.id),7000)}}
    else setTimeout(()=>toast(`${x.ic} ${x.name}：「${st.result.w?TK.win:TK.draw}」`),1500);return}
  if(P.lvp){const R=jRunGet(P.id),L=P.lvp,me=st.human,won=st.result.w===me,lost=!!st.result.w&&st.result.w!==me,n=st.moves.filter(m=>m.by===me).length;
    const ok=L.goal==="survive"||L.goal==="draw"?!lost:won,over=ok&&L.limit&&L.goal!=="survive"&&n>L.limit;
    if(R){if(P.hint)R.hint=true;if(over)R.miss++;R.f={...(R.f||{}),win:won,draw:!st.result.w,plies:st.moves.length};{const k0=L.step!=null?L.step:R.k;R.fs=R.fs||{};const o=R.fs[k0]||{};R.fs[k0]={...o,win:won,draw:!st.result.w,survived:ok&&!won&&!st.result.w,mine:n,lastPiece:won?lvLastPiece(st):null,retried:o.retried||!ok}}if(L.rule)R.miss+=lvRuleMiss(st,L.rule,me);if(ok)R.k++;else R.lose=(R.lose||0)+1;R.ret=true;jRunSet(R)}
    setTimeout(()=>toast(ok?`🎴 這一步過了${over?`（超過 ${L.limit} 步，算一次失誤）`:""}，回到關卡繼續`:"🎴 這一步沒過，回到關卡再試一次"),1500);
    return}
  if(P.id==="park"&&st.result.w){const a=store.get("parkAdj",0)||0;store.set("parkAdj",st.result.w===st.human?Math.min(2,a+1):Math.max(-2,a-1))}   /* 588：園子路人照輸贏微調難度 */
  const s=jStages().find(x=>x.id===P.id);if(!s)return;
  if(st.result.w===st.human){const n=st.moves.length,stars=Math.min(P.hint?2:3,n<=60?3:n<=100?2:1);jSet(s.id,stars,"闖關");setTimeout(()=>toast(`🗺 ${ROAD_NAME}「${roadSeg(s.r)}・${s.name}」過關！收到${ZI.slice(0,stars).join("、")}（${Math.ceil(n/2)} 回合內贏）`),1500)}
  else setTimeout(()=>toast(`🗺 「${s.name}」還沒過關，回${ROAD_NAME}再挑戰一次`),1500)}
function Journey(v,sid){
  setTop(ROAD_NAME,"#/shelf/1");setTimeout(()=>{if(location.hash==="#/journey")jarCheck()},900);   /* 老玩家原本的進度：打開雲河棋路就補發已經達到的棋罐獎勵 */setTabs(!sid,"#/");const L=jStages(),S=jStars();
  if(sid==="inn")return innSheet(v);
  if(sid==="park")return ParkGate(v);
  if(sid&&/~v$/.test(sid)){const bs=jFindStage(sid.slice(0,-2));if(!bs||!jHid()[bs.id]){navReplace("#/shelf/1");return{}}return jVarLevel(v,bs)}   /* 隱藏關卡（開發者 11/5，用原本變體的做法） */
  if(sid&&/^b2h\d\d$/.test(sid)){const L2=jStages2(),i=L2.findIndex(x=>x.id===sid);if(i<0||!((i===0&&book1Done())||S[L2[i-1].id]||DEVMODE())){navReplace(SHELF());return{}}return jLevel(v,L2[i])}
  if(sid){const i=L.findIndex(x=>x.id===sid);if(i<0||!jOpen(L,i)){navReplace("#/shelf/1");return{}}return L[i].t==="lv"?jLevel(v,L[i]):jPuzzle(v,L[i])}
  store.set("legBook",1);navReplace("#/shelf/1");return{}}   /* 意見回饋 735：章回棋路併進第一集的目錄（每回一行就有收子），#/journey 舊網址轉過去；3D 雲河地圖在書末附錄 */
/* 意見回饋 394：雲河棋路 3D 沙盤（map3d.js）——一指轉、兩指縮放；點站看進度，按「出發」開那一站下一個還沒過的關。3D 載入失敗就顯示平面地圖 */
function jMap3d(L,S){sheet("🗺 "+ROAD_NAME,async b=>{
  b.innerHTML='<div id="m3dh" style="position:relative;aspect-ratio:3/4;max-height:72vh;margin:0 auto;border-radius:12px;overflow:hidden;background:#cfd8d4"></div><p class="muted" style="font-size:12.5px;margin:8px 2px 0">一指拖曳轉動、兩指縮放；點站名看進度，點兩下回到原本的角度。</p>';
  const host=b.querySelector("#m3dh"),I=xpInfo();
  const flat=()=>{host.innerHTML='<img src="data/map/yunhe_map.webp" alt="'+ROAD_NAME+'地圖" style="width:100%;height:100%;object-fit:cover;display:block">'};
  const stations=JR.map((R,ri)=>{const st=L.filter(s=>s.r===ri),i0=L.indexOf(st[0]);
    return{id:R.k,name:R.name,sub:R.sub,total:st.length,pass:st.filter(s=>S[s.id]).length,stars:st.reduce((a,s)=>a+(S[s.id]||0),0),locked:!(i0>=0&&jOpen(L,i0))||!jLvOk({r:ri})}});
  try{const v="?v="+encodeURIComponent(window.XQ_BUILD||"");await loadScript(OFF?"three.min.js":"/m/three.min.js");await loadScript((OFF?"map3d.js":"/m/map3d.js")+v);if(!window.XQMap3D)throw new Error("3D 地圖載入失敗")}
  catch(e){flat();return}
  if(!host.isConnected)return;
  let m;try{m=window.XQMap3D.create(host,{stations,heightMode:"color",debug:DEVMODE(),onPick:(st,act)=>{if(act!=="enter")return;
    const ri=JR.findIndex(R=>R.k===st.id),list=L.filter(s=>s.r===ri),nx=list.find(s=>!S[s.id]&&jOpen(L,L.indexOf(s)))||list.find(s=>jOpen(L,L.indexOf(s)));
    if(!nx)return toast(!jLvOk({r:ri})?`「${roadSeg(ri)}」要 Lv ${JR[ri].lv} 或棋罐 ${JAR_GATE[ri]} 子：去 🏮 驛站練等，或回前面的關卡多收幾顆子`:"先過前一"+ROAD_UNIT+"的關卡");closeSheet();location.hash=jChapterHref(nx)}})}
  catch(e){flat();return}
  const t=setInterval(()=>{if(!host.isConnected){clearInterval(t);try{m.destroy()}catch(e){}}},800)})}
/* 雲河棋路的對弈、守關：用提示棋請 Pikafish 指一步（Lv 20 前只指出要動的子） */
async function jBattleHint(st,show){const P=store.get("jPending",null),inJ=!!(P&&st&&P.game===st.id);
  /* 意見回饋 595：提示棋除了雲河棋路，跟電腦的一般對局也能用；積分挑戰、獎勵模式、擂台、線上對戰不能用 */
  if(!st)return;if(!inJ&&itemBlock(st))return toast(itemBlock(st));   /* 意見回饋 597：擂台也能用 */
  if(st.result||st.turn!==st.human)return toast("輪到你走的時候才能用提示");const H=useHint();if(!H)return;if(inJ){P.hint=true;store.set("jPending",P)}api("/play/hintmark",{}).catch(()=>{});   /* 意見回饋 415：用過提示的那盤不算進我的棋力 */
  
  try{const d=await api("/an/engine",{board:st.board,side:st.human,ms:1500,multipv:1}),u=((d.lines||[])[0]||{}).pvm,C=window.XQCore;if(!u||!u[0])throw new Error("算不出來");
    const f=C.parseSq(u[0].slice(0,2)),t=C.parseSq(u[0].slice(2,4));show({f,t:H.full?t:f,n:st.moves.length});const tail=inJ?"（這關最多收到馬）":"（這盤不算進我的棋力）";toast(H.full?`💡 ${hintMk()}：Pikafish 建議的子和落點`+tail:`💡 ${hintMk()}這顆子就是關鍵`+tail)/* 意見回饋 607；11/11 平面是藍框、園子 3D 是黃圈，照模式說（hintMk） */}catch(e){toast("提示失敗："+e.message)}}
/* 回到當年的結果回寫到闖關（LegendScene 判定後呼叫） */
function jSceneDone(key,stars){const id=store.get("jScene",null),s=jStages().find(x=>x.id===id);const any=jStages().filter(x=>x.t==="scene"&&x.scene===key);for(const x of any)jSet(x.id,stars,"回到當年");if(s)store.set("jScene",null)}
/* 解題關：5 題，難度照這一站的等級。意見回饋 429：每次挑戰都換新題目——這一關做過的題先不出，同難度的題都輪過一遍才重來 */
/* ChatGPT 改善單 G01（開發者 11/11 核准）：s.demo＝主流程的「練一題同樣的棋理」示範模式（#/theme/<棋理>/try，05-settings mflDemo 帶進來）：
   先看棋理＋古譜例子（07y3 的 TM_EX，藍色箭頭是妙手）→ 親手走一步 → 看回饋（對錯、正解、Pikafish 後續、這題的棋理）→ 換一題證明理解，共 2 題（約 3～5 分鐘，設計目標、沒量測）。
   示範不記進度：不寫 jpRun（不會蓋掉做到一半的主題訓練）、不記做過的題（jpSeen）、不記正確率（themeStat）、不加修為、不算段位和「我的棋力」；返回＝回到從哪來的那一頁（mflDemoBack） */
function jPuzzle(v,s){setTop(s.demo?"🧠 練一題・"+s.tag:s.theme?"🧠 "+s.name:ROAD_NAME+"・"+s.name,s.demo?mflDemoBack():s.theme?"#/theme":jChapterHref(s));let D=null,Q=[],k=0,ok=0,board=null,sel=-1,LEGAL=[],done=false,hk=null,usedHint=false,RHK=null;const bd=Board(x=>tap(x));
  /* 回饋 838（開發者 11/9 選：全模式中斷接續）：存這一組做到哪裡（jpRun），順便記進接續小卡（07m4-resume.js rsPg 的 tm） */
  const H0=location.hash,jpSave=x=>{if(s.demo)return;const o={id:s.id,ids:Q.map(q=>q.id),k:x&&x.k!=null?x.k:k,ok,uh:usedHint?1:0,...(x&&x.hk?{hk:x.hk}:{}),at:Date.now()};store.set("jpRun",o);if(typeof rsPg==="function")try{rsPg("tm","jpRun",s.id,H0,s.tag||s.name,o.k,Q.length)}catch(e){}};
  (async()=>{try{D=await api("/quiz/data")}catch(e){v.innerHTML=`<div class="pad"><div class="card muted">${esc(e.message)}</div></div>`;return}
    let pool=s.tag?D.items.filter(q=>(q.tags||[]).includes(s.tag)):D.items.filter(q=>q.tier>=s.lo&&q.tier<=s.hi&&(!s.cats||s.cats.includes(qzCat(q))));if(pool.length<5&&!s.tag)pool=D.items.filter(q=>q.tier>=s.lo&&q.tier<=s.hi);
    /* 回饋 838（開發者 11/9 選：全模式中斷接續）：做到一半的那一組（store jpRun＝{id,ids 這組題號,k 做到第幾題,ok,uh 用過提示,hk 這題的提示框,at}）：同一組、同一題接著做，不重抽、不再記 jpSeen */
    const JR=s.demo?null:store.get("jpRun",null),JQ=JR&&JR.id===s.id&&Array.isArray(JR.ids)&&JR.k<JR.ids.length?JR.ids.map(id=>D.items.find(q=>String(q.id)===String(id))).filter(Boolean):null;
    if(JQ&&JQ.length===JR.ids.length){Q=JQ;k=JR.k|0;ok=JR.ok|0;usedHint=!!JR.uh;RHK=JR.hk&&JR.hk.k===k?JR.hk.v:null}
    else if(s.demo){const E=pool.slice().sort((a,b)=>(a.tier||0)-(b.tier||0)),fr=E.slice(0,Math.max(6,Math.ceil(E.length/2)));while(Q.length<(s.count||2)&&fr.length)Q.push(fr.splice(Math.floor(Math.random()*fr.length),1)[0])}   /* G01 示範：從這個棋理比較簡單的一半題目裡隨機抽，不記 jpSeen */
    else{
    const SEEN=store.get("jpSeen",{}),seen=new Set(SEEN[s.id]||[]);let fresh=pool.filter(q=>!seen.has(String(q.id)));
    if(fresh.length<(s.count||5)){seen.clear();fresh=pool.slice()}
    while(Q.length<(s.count||5)&&fresh.length)Q.push(fresh.splice(Math.floor(Math.random()*fresh.length),1)[0]);
    for(const q of Q)seen.add(String(q.id));SEEN[s.id]=[...seen].slice(-400);store.set("jpSeen",SEEN);jpSave()}
    v.className="view fixed";v.innerHTML=`<div class="status" id="qh" style="margin-top:6px"></div><div class="boardbox" id="bbox"></div><div class="status" id="stat"></div><div class="note" id="note" style="white-space:pre-wrap"></div><div style="flex:1"></div><div class="actions" id="acts"></div>`;
    v.querySelector("#bbox").append(bd.svg);
    if(s.demo&&!Q.length){v.querySelector("#note").textContent="這個棋理目前沒有題目，先回去吧。";actionBar(v.querySelector("#acts"),[["back","‹","回去",()=>goBack(mflDemoBack()),true]]);return}
    if(s.demo)mflIntro();else show()})();   /* G01 示範：先看棋理再出題 */
  /* G01 示範：先看一個棋理——THEMES 的一句說明＋07y3-thememap.js 的古譜例局（TM_EX，藍色箭頭＝妙手；沒有例局就直接用第 1 題的盤面），按「換你走一步」才開始第 1 題 */
  function mflIntro(){const T=THEMES.find(x=>x[0]===s.tag)||[s.tag,""],EX=typeof TM_EX!=="undefined"?TM_EX.find(x=>x[0]===s.tag):null;let eb=null,mv=null;
    if(EX){try{eb=String(EX[4]).split(",").map(x=>x||null);if(eb.length!==90)eb=null;else mv=bcMove(eb,EX[5],EX[6])}catch(e){eb=null}}
    v.querySelector("#qh").innerHTML=`<b>🧠 先看棋理：${esc(T[0])}</b>　<span class="muted">看懂了換你走（共 ${Q.length} 題）</span>`;
    v.querySelector("#stat").textContent=T[1]?`${T[0]}：${T[1]}`:T[0];
    v.querySelector("#note").textContent=(EX?`古譜例子：${EX[2]}${EX[3]?"・"+EX[3]:""}（${EX[5]==="r"?"紅先":"黑先"}）。妙手是「${EX[6]}」${mv?"（藍色箭頭）":""}。\n`:"")+"接下來換你：用同樣的棋理，親手走一步。";
    if(eb)bd.draw(eb,{flip:EX[5]==="b",...(mv?{sugg:[mv]}:{})});else bd.draw(Q[0].board.split(",").map(x=>x||null),{flip:Q[0].side==="b"});
    actionBar(v.querySelector("#acts"),[["back","‹","先不練",()=>goBack(mflDemoBack())],["go","▶","換你走一步",()=>{vibrate(5);show()},true]])}
  function show(){const q=Q[k];board=q.board.split(",").map(x=>x||null);sel=-1;done=false;hk=RHK;RHK=null;   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：RHK＝關掉 App 前這題已經用掉的提示框 */
    v.querySelector("#qh").innerHTML=`<b>第 ${k+1} / ${Q.length} 題</b>・${esc(qzCat(q))}・${esc(q.rank||"")}　<span class="muted">答對 ${ok} 題</span>`;
    v.querySelector("#stat").textContent=`${PLAYER[q.side]}走，找出最好的一步`;v.querySelector("#note").textContent="";
    actionBar(v.querySelector("#acts"),[["hint","💡",hintLabel(),hint],["skip","⏭","不會，看答案",()=>judge(-1,-1)]]);draw();api("/an/legal",{board,side:q.side}).then(r=>{LEGAL=r.legal}).catch(()=>{LEGAL=[]})}
  function draw(o){const q=Q[k];bd.draw(o&&o.board||board,{flip:q.side==="b",sel,targets:sel>=0?LEGAL.filter(([f])=>f===sel).map(x=>x[1]):[],...(hk?{hint:hk}:{}),...(o||{})})}
  function hint(){if(done)return;if(hk)return toast("這題已經提示過了");const H=useHint();if(!H)return;const q=Q[k];usedHint=true;hk=H.full?[q.f,q.t]:[q.f];jpSave({hk:{k,v:hk}});   /* 回饋 838（開發者 11/9 選：全模式中斷接續） */
    v.querySelector("#stat").textContent=H.full?"💡 提示：藍框是要動的子和要去的位置":"💡 提示：藍框這顆子就是關鍵（Lv 20 起會連落點一起指出）"/* 意見回饋 607；11/11 提示框改藍色（01-board.js） */;
    actionBar(v.querySelector("#acts"),[["hint","💡",hintLabel(),hint],["skip","⏭","不會，看答案",()=>judge(-1,-1)]]);draw()}
  /* 11/11 AI 模擬玩家報告問題 7：點了不能走的格子（例如帥橫走會被車吃）或一步都走不了的子，用規則說真正的原因（07z7-lesson.js lsnWhyNot／lsnStuck），不再默默取消選取 */
  function tap(x){if(done||!LEGAL.length)return;if(sel>=0&&LEGAL.some(([f,t])=>f===sel&&t===x)){const f=sel;sel=-1;return judge(f,x)}
    const C=window.XQCore,mine=!!C&&x>=0&&!!board[x]&&C.sideOf(board[x])===Q[k].side;let w="";
    try{if(C&&sel>=0&&!mine&&typeof lsnWhyNot==="function")w=lsnWhyNot(board,sel,x)}catch(e){}
    sel=w?-1:LEGAL.some(([f])=>f===x)?x:-1;
    try{if(C&&!w&&sel<0&&mine&&typeof lsnStuck==="function")w=lsnStuck(board,x)}catch(e){}
    v.querySelector("#note").textContent=w?"✋ "+w:"";if(sel>=0)vibrate(5);draw()}
  /* 11/11 AI 模擬玩家報告問題 7：走錯但那步也是將軍＝說對方怎麼化解（lsnCheckWhy 用規則舉一個應著）；那步直接將死＝也算對；將軍主題走了不將軍的＝提醒這步沒將軍 */
  function judge(f,t){if(done)return;done=true;const q=Q[k],C=window.XQCore,same=f===q.f&&t===q.t;let cw="",mine="";
    try{if(C&&f>=0&&!same&&typeof lsnCheckWhy==="function"){cw=lsnCheckWhy(board,f,t);mine=C.notate(board,f,t)}}catch(e){cw=""}
    const mate=cw===null,hit=same||mate;if(hit){ok++;if(!s.demo)addXP(5,"解題",`jp:${s.id}:${q.id}`)}vibrate(hit?15:[20,40,20]);jpSave({k:k+1});   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：答完就記成下一題，關掉再打開不會重答這題 */
    let ex="";if(mine){if(mate)ex=`你走的「${mine}」直接將死，也算對！題目原本的答案是：\n`;else if(cw)ex=`你走的「${mine}」也有將軍，但${cw}，就化解了。\n`;
      else if(s.tag==="將軍"){try{if(C.inCheck(C.make(board,q.f,q.t),C.opp(q.side)))ex=`你走的「${mine}」沒有將軍；這題要先將軍。\n`}catch(e){}}
      if(!mate)ex+="棋盤上畫的是正解。\n"}
    const nb=board.slice();nb[q.t]=nb[q.f];nb[q.f]=null;draw({board:nb,last:{f:q.f,t:q.t},sel:-1,targets:[]});
    v.querySelector("#stat").textContent=hit?(mate&&!same?"✔ 將死了，也算對！":"✔ 答對了！"):f<0?"正解如下":cw?"✘ 這步也將軍，但不是最好的":"✘ 不是這步";v.querySelector("#note").textContent=ex+`正解：${q.cn}${q.mate?`，${q.mate} 步內殺棋`:""}\nPikafish 的後續：${(q.pv||[]).join(" ")}`+(s.demo?`\n🧠 這題的棋理：${s.tag}——${(THEMES.find(x=>x[0]===s.tag)||["",""])[1]}`:"");   /* G01 示範：回饋多一行棋理 */
    if(typeof pvStepper==="function")pvStepper(v.querySelector("#note"),bd,board,q.pv||[],{draw:{flip:q.side==="b"},start:mate&&!same?0:1});   /* 開發者 11/12：後續可以一步一步看（自己走的將死不是正解時，從題目局面開始） */
    actionBar(v.querySelector("#acts"),[["next","›",k+1<Q.length?(s.demo?"換一題，證明你懂了":"下一題"):"看結果",()=>{k++;if(k<Q.length)show();else result()},true]])}
  /* G01 示範的結果：不寫 jpRun、themeStat、闖關星數；主要「♟ 用這個觀念下一盤」（05-settings mflQuick：快局、同一個難度、不算段位），次要回到剛才的地方、想多練就進一般的主題訓練 10 題 */
  function mflEnd(){const N=Q.length,T=THEMES.find(x=>x[0]===s.tag)||[s.tag,""];v.className="view";
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center"><div style="font-size:44px">${ok===N?"🎉":ok?"👍":"💪"}</div><h2 style="margin:4px 0">${ok===N?"都答對了，你懂了！":ok?`答對 ${ok} / ${N} 題，差一點`:"再看一次例子就會了"}</h2>
      <p style="line-height:1.7">棋理「${esc(T[0])}」：${esc(T[1])}</p><p class="muted" style="font-size:13px">這是示範練習：不記正確率、不加修為，也不算段位和「我的棋力」。</p>
      <button class="btn" id="mfQ" style="width:100%">♟ 用這個觀念下一盤</button><button class="btn ghost" id="mfB" style="width:100%">‹ 回到剛才的地方</button><button class="btn ghost" id="mfM" style="width:100%">🧠 想多練：主題訓練「${esc(T[0])}」10 題</button></div></div>`;
    v.querySelector("#mfQ").onclick=()=>{vibrate(5);const K=store.get("mflKey",null);mflQuick(K&&K.side||"r",K&&K.lx||3)};
    v.querySelector("#mfB").onclick=()=>{vibrate(5);goBack(mflDemoBack())};
    v.querySelector("#mfM").onclick=()=>{vibrate(5);navReplace("#/theme/"+encodeURIComponent(s.tag))}}
  function result(){if(s.demo)return mflEnd();store.set("jpRun",null);if(typeof rsPgClear==="function")rsPgClear("tm",s.id);   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：做完了，清掉進度 */const N=Q.length||5,r=ok/N,stars=Math.min(usedHint?2:3,r>=.999?3:r>=.8?2:r>=.6?1:0);let best;if(s.theme){const TS=store.get("themeStat",{}),x=TS[s.tag]||{n:0,ok:0};x.n+=N;x.ok+=ok;x.at=Date.now();TS[s.tag]=x;store.set("themeStat",TS);best=stars}else best=stars?jSet(s.id,stars,"闖關"):(jStars()[s.id]||0);v.className="view";
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center"><div style="font-size:44px">${stars?"🎉":"💪"}</div><h2 style="margin:4px 0">${stars?"過關！":"差一點"}</h2>
      <div style="margin:8px 0 4px">${ziHTML(stars,false,true)}</div><p>答對 <b>${ok}</b> / ${Q.length} 題${stars?"":`（答對 ${Math.ceil(N*.6)} 題才過關）`}${usedHint&&ok>=5?"（用了提示，最多收到馬）":""}</p>${best>stars?`<p class="muted">這關最好成績 ${ziStr(best)}</p>`:""}
      <button class="btn" id="back">${s.theme?"回主題訓練":"回第"+CNUM(s.n)+"回"}</button><button class="btn ghost" id="again">再挑戰一次</button></div></div>`;
    (v.querySelector("#back")||{}).onclick=()=>goBack(s.theme?"#/theme":jChapterHref(s));(v.querySelector("#again")||{}).onclick=()=>{k=0;ok=0;v.innerHTML="";route()}}
  return{}}

/* ================= 🎴 石桌往事第二集《紙譜新局》的新步驟（格式見 story/book2/levels_schema_b2.md）=================
   judge 形勢判斷、audit 校譜、simul 車輪記盤、arrange 擺盤、relay 接香、duet 兩手一方。
   都跑在 jLevel 的同一個畫面裡：X 是 jLevel 交過來的工具（棋盤、失誤、下一步、失敗卡……）。
   App 還沒做的選填欄位先忽略（規格的原則：忽略也能從頭玩到尾，只影響三星或演出） */
const B2_CN={K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵",k:"將",a:"士",b:"象",n:"馬",r:"車",c:"砲",p:"卒"};
/* 電腦走一步：用挑戰電腦同一套等級（LEVELS）和挑選方式（pickMove）；引擎出錯就隨便走一步合法的 */
async function b2Eng(b,turn,ai,full){const C=window.XQCore,lv=C.LEVELS[Math.max(1,Math.min(8,ai||3))-1]||C.LEVELS[2];
  const t0=Date.now();   /* 11/10 開發者「我剛走完一步，電腦就馬上落子」：至少想 0.9～1.3 秒再落子 */
  try{const r=await XQEngine.search({fen:C.fen(b,turn)},lv.movetime?{movetime:lv.movetime}:{depth:lv.depth},lv.multipv||1);{const w=900+Math.random()*400-(Date.now()-t0);if(w>0)await new Promise(z=>setTimeout(z,w))}const mv=C.pickMove(r,lv),f=C.parseSq(mv.slice(0,2)),t=C.parseSq(mv.slice(2,4));
    if(C.legal(b,turn).some(([a,z])=>a===f&&z===t))return full?{f,t,mv,r}:{f,t,mv}}catch(e){}
  const L=C.legal(b,turn);if(!L.length)return null;const[f,t]=L[Math.floor(Math.random()*L.length)];return{f,t,mv:C.iccs(f,t)}}
const b2EvalTxt=v=>v==null?"":Math.abs(v)>=29000?`${v>0?"紅方":"黑方"} ${Math.max(1,Math.ceil((30000-Math.abs(v))/2))} 步殺`:`紅方 ${v>=0?"+":""}${(v/100).toFixed(2)}`;
const b2EvalBar=v=>{if(v==null)return"";const p=Math.abs(v)>=29000?(v>0?100:0):Math.max(3,Math.min(97,50+v/20));
  return`<div style="display:flex;align-items:center;gap:8px;margin:6px 2px"><div style="flex:1;height:10px;border-radius:5px;background:#1E1A16;overflow:hidden"><i style="display:block;height:100%;width:${p}%;background:#C8322A"></i></div><b style="font-size:13px;white-space:nowrap">${b2EvalWord(v)}</b></div>`};
/* 審稿 592：故事關卡不給玩家看引擎分數，評估條旁邊改寫白話 */
const b2EvalWord=v=>{const a=Math.abs(v),s=v>0?"紅方":"黑方";return a>=29000?s+"有殺":a<60?"差不多":a<200?s+"稍好":a<500?s+"好":s+"大優"};
/* 新手訓練營結業對局：對手顯示成玩家的旅伴（雲河七星），沒選旅伴就用小帥 */
function gradBuddy(){try{const c=typeof myChar==="function"&&myChar();if(c&&typeof WX_CHARS!=="undefined"&&WX_CHARS[c]){const W=WX_CHARS[c],nk=W.nk||W.n;
    return{nk,img:"data/xs/prev_"+c+".webp",win:"你出師了！這一盤，我是真的被你將死的。",draw:"四十回合不分勝負，你守得真穩，算你過關！",lose:"別急，再來一盤，我陪你。"}}}catch(e){}
  const nm=typeof BOTN==="function"?BOTN():"小帥";
  return{nk:nm,img:"",win:"你出師了！這一盤我輸得心服口服。",draw:"四十回合守得真穩，算你過關！",lose:"別急，再來一盤，我陪你。"}}
/* 結業對局的樣式（旅伴小頭像列＋過關水墨煙火）：對局一開就注入，圖片才不會用原尺寸撐滿、把棋盤擠小 */
function gradCss(){if(document.getElementById("gradCss"))return;const s=document.createElement("style");s.id="gradCss";
  s.textContent=`.grad-opp{display:flex;align-items:center;gap:7px;margin:2px 2px 4px;font-size:12.5px;line-height:1.3;color:var(--muted,#8a7a66)}`+
  `.grad-opp img{width:26px;height:32px;object-fit:contain;object-position:top center;border-radius:4px;flex:none}.grad-opp b{color:var(--ink,#2a1d12)}`+
  `.gradfx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5}.gradfx b{position:absolute;font-size:22px;animation:gradPop 1.2s ease-out forwards}`+
  `@keyframes gradPop{0%{transform:scale(.2);opacity:0}30%{opacity:1}100%{transform:scale(1.5) translateY(-22px);opacity:0}}`;document.head.append(s)}
/* 結業過關的水墨煙火（蓋在棋盤上，2.6 秒後移除） */
function gradFx(host){if(!host)return;try{gradCss();
  const box=document.createElement("div");box.className="gradfx";const ic=["🎆","🎇","✨","🏮","🀄"];
  for(let i=0;i<16;i++){const b=document.createElement("b");b.textContent=ic[i%ic.length];b.style.left=(8+Math.random()*84)+"%";b.style.top=(8+Math.random()*70)+"%";b.style.animationDelay=(Math.random()*.6)+"s";box.append(b)}
  if(getComputedStyle(host).position==="static")host.style.position="relative";host.append(box);setTimeout(()=>box.remove(),2600)}catch(e){}}
function jStepsB2(X){const C=window.XQCore,{v,bd}=X,$=q=>v.querySelector(q);
  const stat=t=>{const e=$("#stat");if(e)e.textContent=t},note=t=>{const e=$("#note");if(e)e.textContent=t},O=h=>{const e=$("#lvO");if(e)e.innerHTML=h},acts=a=>actionBar($("#acts"),a);
  const flipOf=st=>(st.human||st.side||(st.start&&st.start.turn))==="b";
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),alive=()=>v.isConnected;
  const optPreview=(b,flip,opts,onPick)=>{let cur=-1;O(opts.map((o,k)=>`<button class="btn ghost" data-k="${k}">${esc(o.cn)}</button>`).join(""));acts([]);
    v.querySelectorAll("#lvO [data-k]").forEach(x=>x.onclick=()=>{cur=+x.dataset.k;const[f,t]=lvSq(opts[cur].u);v.querySelectorAll("#lvO [data-k]").forEach(y=>y.classList.toggle("on",+y.dataset.k===cur));
      bd.draw(b,{flip,last:{f,t},sel:f,targets:[t],arrow:true,forceArrow:true});vibrate(5);acts([["ok","✔","確認送出",()=>{if(cur>=0)onPick(cur)},true]])})};
  const iccsOpts=(b,list)=>(list||[]).map(u=>{const[f,t]=lvSq(u);let cn=u;try{cn=C.notate(b,f,t)}catch(e){}return{u,cn}});

  /* ---- judge：看盤問答（棋盤一直亮著；tap 題要點一顆子；答完附引擎評估和主線箭頭） ---- */
  function judge(st){let pos=lvBoard(st.start,st.auto),i=0,ok=0;const flip=flipOf(st),hs=[];X.boardPage(st);
    const mv=u=>{const[f,t]=lvSq(u);pos={b:C.make(pos.b,f,t),turn:pos.turn==="r"?"b":"r",last:{f,t}}};
    /* 回饋 838（開發者 11/9 選：全模式中斷接續）：回到做到的那一題——前面幾題照當時答對沒有（hs）把盤面擺回來 */
    {const S=X.siGet&&X.siGet("judge");if(S){for(let q=0;q<S.i&&q<st.items.length;q++){const it=st.items[q];if(it.start)pos=lvBoard(it.start);for(const u of it.before||[])mv(u);if((S.h||[])[q])for(const u of it.after||[])mv(u);hs.push((S.h||[])[q]?1:0)}i=S.i;ok=S.ok|0}}
    ask();
    function ask(){X.stop();const it=st.items[i];const need=st.pass!=null?st.pass:0;
      if(!it)return ok>=need?X.next():X.failCard(`答對 ${ok} 題，要答對 ${need} 題才過這一步。`);
      if(it.start)pos=lvBoard(it.start);for(const u of it.before||[])mv(u);bd.draw(pos.b,{flip,last:pos.last});
      stat(`第 ${i+1}／${st.items.length} 題`);note((i===0&&st.say?st.say+"\n":"")+(it.ask||"這盤棋現在是什麼形勢？"));acts([]);
      if(it.tap){O('<p class="muted" style="margin:4px 2px">'+esc(it.tapHint||"點棋盤上的那一顆子")+'</p>');const ans=(it.answerSq||[]).map(C.parseSq);
        X.setTap(x=>{if(ans.includes(x)){X.setTap(null);ok++;vibrate(15);done(true,it)}else{X.miss(it.hint||"不是這顆，再看看")}});return}
      O((it.options||[]).map((o,k)=>`<button class="btn ghost" data-k="${k}">${esc(o)}</button>`).join(""));
      v.querySelectorAll("#lvO [data-k]").forEach(x=>x.onclick=()=>{const hit=+x.dataset.k===it.answer;if(hit){ok++;vibrate(15)}else X.miss();
        v.querySelectorAll("#lvO [data-k]").forEach(z=>{z.disabled=true;if(+z.dataset.k===it.answer)z.classList.remove("ghost")});done(hit,it)})}
    function done(hit,it){hs[i]=hit?1:0;if(X.siSet)X.siSet({t:"judge",i:i+1,ok,h:hs.slice(0,i+1)});   /* 回饋 838（開發者 11/9 選：全模式中斷接續） */const sh=it.show||{};stat(hit?"✔ 答對了":`✘ 正解：${it.tap?"看棋盤上亮的那顆":(it.options||[])[it.answer]||""}`);
      const n=$("#note");if(n){n.textContent=(it.note||sh.note||"");if(sh.eval!=null)n.insertAdjacentHTML("beforeend",b2EvalBar(sh.eval))}
      const L=(sh.line||[]).slice(0,1);if(L.length){const[f,t]=lvSq(L[0]);bd.draw(pos.b,{flip,last:{f,t},arrow:true,forceArrow:true})}
      else if(it.tap&&it.answerSq&&it.answerSq[0])bd.draw(pos.b,{flip,sel:C.parseSq(it.answerSq[0])});
      if(hit)for(const u of it.after||[])mv(u);
      acts([["next","›",i+1<st.items.length?"下一題":"繼續",()=>{i++;ask()},true]])}}

  /* ---- audit：校譜（照真著一手一手擺，停點判「有理／有錯」，判錯再改正） ---- */
  function audit(st){const mvs=st.moves||[],stops=(st.stops||[]).slice().sort((a,b)=>a.at-b.at),need=st.pass!=null?st.pass:stops.filter(s=>!s.ok).length;
    let pos=lvBoard(st.start),k=0,si=0,found=0,ch=st.chances||3,hist=[];const flip=flipOf(st),blind=!!st.blind;X.boardPage(st);
    const draw=last=>bd.draw(blind?pos.b.map(()=>null):pos.b,{flip,last});$("#bbox").classList.toggle("lvblind",blind);
    const step1=()=>{const[f,t]=lvSq(mvs[k]);let cn=mvs[k];try{cn=C.notate(pos.b,f,t)}catch(e){}hist.push(cn);pos={b:C.make(pos.b,f,t),turn:pos.turn==="r"?"b":"r"};k++;draw({f,t});
      stat(`第 ${k}／${mvs.length} 手・${cn}`)};
    if(st.sheet)acts([["sheet","📜",st.sheet.label||"看原稿",()=>{X.useHint();sheet("📜 "+(st.sheet.label||"原稿"),b=>{b.innerHTML=`<p style="line-height:2">${esc(hist.join("　"))}</p>`})}]]);
    draw(null);note(st.say||"");setTimeout(go,700);
    async function go(){X.stop();const s=stops[si],to=s?s.at:mvs.length;while(k<to){if(!alive())return;step1();await wait(blind?900:650)}if(!alive())return;
      if(!s)return found>=need?X.next():X.failCard(`找到 ${found} 處錯，要找到 ${need} 處才過這一步。`);
      const end=s.at>=mvs.length,txt=end?(s.claim||""):(s.shown||"");
      note((end?"稿上的結論：":"稿上寫：")+txt+(blind&&hist.length?"\n剛才的著法："+hist.slice(-6).join("　"):""));stat(end?"全部擺完了，稿上的結論對嗎？":`第 ${k+1} 手，這一步對嗎？`);
      if(s.print&&!end){try{const[f,t]=lvSq(s.print);bd.draw(blind?pos.b.map(()=>null):pos.b,{flip,sel:f,targets:[t],arrow:true,forceArrow:true})}catch(e){}}
      O(`<button class="btn ghost" data-a="1">✔ 這步有理</button><button class="btn ghost" data-a="0">✘ 這步有錯</button>`);acts([]);
      v.querySelectorAll("#lvO [data-a]").forEach(x=>x.onclick=()=>judgeIt(s,x.dataset.a==="1",end))}
    function cont(s,end){si++;acts([["next","›",end?"繼續":"往下擺",()=>go(),true]])}
    function judgeIt(s,saysOk,end){O("");
      if(saysOk&&s.ok){vibrate(15);stat("✔ 對，這步沒問題");return cont(s,end)}
      if(saysOk&&!s.ok){X.miss("漏掉一處");note("這一步其實有錯："+(s.why||""));return cont(s,end)}
      if(!saysOk&&s.ok){ch--;X.miss(s.hint||"這步沒問題，再看仔細");if(ch<=0)return X.failCard("判錯太多次了，這一頁從頭再校一次。");note((s.hint||"這步沒問題。")+`（還有 ${ch} 次機會）`);return cont(s,end)}
      note("對，這步有錯："+(s.why||""));const fx=s.fix;if(!fx||!(fx.options||[]).length){found++;return cont(s,end)}
      const opts=iccsOpts(pos.b,fx.options);stat(fx.ask||"這一手應該是？");
      if(opts.length===1){found++;const[f,t]=lvSq(opts[0].u);bd.draw(pos.b,{flip,last:{f,t},arrow:true,forceArrow:true});note((s.note||"")+"\n只有這一步："+opts[0].cn);return cont(s,end)}
      optPreview(blind?pos.b.map(()=>null):pos.b,flip,opts,c=>{const hit=opts[c].u===fx.answer;if(hit){found++;vibrate(15);stat("✔ 改對了")}else{X.miss();stat("✘ 正解："+((opts.find(o=>o.u===fx.answer)||{}).cn||fx.answer))}note(s.note||"");acts([]);cont(s,end)})}}

  /* ---- simul：車輪記盤（一盤一盤輪播，蓋起來問一題） ---- */
  function simul(st){const B=st.boards||[];let ri=0,ok=0,rep=st.replay||0;X.boardPage(st);const box=$("#bbox");
    const show=async sh=>{const g=B[sh.board]||{},from=sh.from||0;let p=lvBoard(g.start,(g.moves||[]).slice(0,from));box.style.background=g.cloth||"";
      stat(`${g.label||"第 "+(sh.board+1)+" 盤"}・第 ${from} 手後`);bd.draw(p.b,{});await wait(900);
      for(let m=from;m<Math.min(sh.to||from,(g.moves||[]).length);m++){if(!alive())return;const[f,t]=lvSq(g.moves[m]);let cn="";try{cn=C.notate(p.b,f,t)}catch(e){}p={b:C.make(p.b,f,t)};bd.draw(p.b,{last:{f,t}});stat(`${g.label||""}・第 ${m+1} 手 ${cn}`);await wait(750)}
      await wait(700);return p};
    round();
    async function round(){X.stop();const r=(st.rounds||[])[ri];if(!r){const need=st.pass!=null?st.pass:(st.rounds||[]).length;if(ok>=need)return X.next();
        if(rep>0){rep--;ri=0;ok=0;toast("再看一次");return round()}return X.failCard(`答對 ${ok} 題，要答對 ${need} 題才過這一步。`)}
      note(r.say||(ri===0?st.say||"":""));O("");acts([]);let last=null;for(const sh of r.show||[]){if(!alive())return;last=await show(sh)}
      if(r.hide!==false){box.style.background="";bd.draw((last&&last.b||[]).map(()=>null),{});stat("棋盤蓋起來了")}
      note(r.ask||"");O((r.options||[]).map((o,k)=>`<button class="btn ghost" data-k="${k}">${esc(o)}</button>`).join(""));
      v.querySelectorAll("#lvO [data-k]").forEach(x=>x.onclick=()=>{const hit=+x.dataset.k===r.answer;if(hit){ok++;vibrate(15)}else X.miss();
        v.querySelectorAll("#lvO [data-k]").forEach(z=>{z.disabled=true;if(+z.dataset.k===r.answer)z.classList.remove("ghost")});stat(hit?"✔ 記對了":"✘ 不對");
        acts([["next","›",ri+1<(st.rounds||[]).length?"下一輪":"繼續",()=>{ri++;round()},true]])})}}

  /* ---- arrange：擺盤（看一眼→蓋起來→（聽幾步）→在空棋盤上把子擺回去） ---- */
  function arrange(st){const sh=lvBoard(st.show),flip=st.focus==="b";let relisten=false;X.boardPage(st);
    const T=st.target?lvBoard(st.target).b:sh.b,G=st.given?C.parseFen(st.given):T.map(()=>null);
    let left=st.sec||10;bd.draw(sh.b,{flip});note(st.say||"");stat(`記住這個局面：${left} 秒`);acts([["go","›","記好了",()=>{clearInterval(tm);listen()},true]]);
    const tm=setInterval(()=>{if(!alive())return clearInterval(tm);left--;if(left<=0){clearInterval(tm);listen()}else stat(`記住這個局面：${left} 秒`)},1000);
    function listen(){bd.draw(sh.b.map(()=>null),{flip});const L=st.listen||[];if(!L.length)return place();let p={b:sh.b},lines=[];
      for(const u of L){const[f,t]=lvSq(u);try{lines.push(C.notate(p.b,f,t))}catch(e){lines.push(u)}p={b:C.make(p.b,f,t)}}
      const play=()=>{let i=0;note("");stat(`👂 ${st.speak||"有人"}念著法…`);acts([]);const one=()=>{if(!alive())return;if(i<lines.length){note(lines.slice(0,++i).join("　"));setTimeout(one,1600)}
        else acts([...(st.relisten?[["again","↺","再聽一次",()=>{relisten=true;play()}]]:[]),["go","›","聽好了，開始擺",place,true]])};one()};play()}
    function place(){const cur=G.slice(),pal={};T.forEach((p,i)=>{if(p&&G[i]!==p)pal[p]=(pal[p]||0)+1});let pick=null;
      const draw=()=>{bd.draw(cur,{flip});O(Object.keys(pal).sort().map(p=>`<button class="btn ghost${pick===p?"":" "}" data-p="${p}" style="min-width:64px${pick===p?";outline:2px solid var(--accent)":""}"${pal[p]?"":" disabled"}>${B2_CN[p]}×${pal[p]}</button>`).join(""));
        v.querySelectorAll("#lvO [data-p]").forEach(x=>x.onclick=()=>{pick=x.dataset.p;vibrate(5);draw()});
        stat(pick?`點棋盤上的格子放「${B2_CN[pick]}」；點已經放的子可以收回來`:"先選一種棋子");note(st.mirror?"注意：刻版要左右反著刻":"");
        acts([["ok","✔","擺好了",check,true]])};
      X.setTap(x=>{if(cur[x]&&!G[x]){pal[cur[x]]=(pal[cur[x]]||0)+1;cur[x]=null;vibrate(5);return draw()}if(!cur[x]&&pick&&pal[pick]>0){cur[x]=pick;pal[pick]--;if(!pal[pick])pick=null;vibrate(5);draw()}});draw();
      function check(){X.setTap(null);let wrong=0;for(let i=0;i<90;i++)if((cur[i]||null)!==(T[i]||null))wrong++;
        const ps=st.pass||{},mx=ps.maxWrong!=null?ps.maxWrong:3;for(let i=0;i<Math.min(wrong,3);i++)X.miss();if(relisten&&st.star&&st.star.noRelisten)X.flag("relisten",true);
        bd.draw(T,{flip});stat(wrong?`錯了 ${wrong} 顆（棋盤上是正確的擺法）`:"✔ 一顆都沒錯！");
        if(wrong>mx){acts([["again","↺","再擺一次",()=>arrange(st),true]]);note(st.retry||"再看一次，重新擺");return}
        const q=st.ask;if(!q)return acts([["next","›","繼續",X.next,true]]);
        note(q.q||"");O((q.options||[]).map((o,k)=>`<button class="btn ghost" data-k="${k}">${esc(o)}</button>`).join(""));acts([]);
        v.querySelectorAll("#lvO [data-k]").forEach(x=>x.onclick=()=>{const hit=+x.dataset.k===q.answer;if(!hit)X.miss();v.querySelectorAll("#lvO [data-k]").forEach(z=>{z.disabled=true;if(+z.dataset.k===q.answer)z.classList.remove("ghost")});
          stat(hit?"✔ 對了":"✘ 不對");if(!hit&&ps.ask)return acts([["again","↺","重來",()=>arrange(st),true]]);acts([["next","›","繼續",X.next,true]])})}}}

  /* ---- relay：接香（同一盤棋分段，別人下、你接手、電腦接手輪流） ---- */
  function relay(st){let pos=lvBoard(st.start),si=0,lastMv=st.lastSq?{f:C.parseSq(st.lastSq),t:C.parseSq(st.lastSq)}:null;const me=st.human||"r",flip=me==="b";X.boardPage(st);
    /* 回饋 838（開發者 11/9 選：全模式中斷接續）：接香做到第幾段、盤面（f 局面、tn 輪誰、lm 上一手），自由段另外記這一段走了幾步、這一段開始時的局面（fr），關掉 App 再打開從同一個局面接著下（守城、攔路棋客都在這裡） */
    const FN=b=>C.fen(b,"r").split(" ")[0],rsv=o=>{if(X.siSet)X.siSet({t:"relay",si,f:FN(pos.b),tn:pos.turn,lm:lastMv,...(o||{})})};
    let RS=X.siGet&&X.siGet("relay");if(RS){try{pos={b:C.parseFen(RS.f),turn:RS.tn==="b"?"b":"r"};lastMv=RS.lm||null;si=RS.si|0}catch(e){RS=null}}
    const draw=extra=>bd.draw(pos.b,{flip,last:lastMv,...(extra||{})});
    const mv=(f,t)=>{pos={b:C.make(pos.b,f,t),turn:pos.turn==="r"?"b":"r"};lastMv={f,t};draw()};
    const over=()=>C.legal(pos.b,pos.turn).length===0;
    draw();note(st.say||"");setTimeout(seg,600);
    async function seg(){X.stop();const g=(st.segs||[])[si];if(!g)return X.next();if(!(RS&&RS.si===si&&RS.fr))rsv();   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：每段開頭記一次 */const who=g.who==="you"?(g.name||"你"):g.who;stat(`第 ${si+1}／${st.segs.length} 段・${who}`);
      if(g.line){note(g.say||"");for(const u of g.line){if(!alive())return;const[f,t]=lvSq(u);mv(f,t);await wait(700)}si++;return seg()}
      if(g.mode==="engine"){for(let n=0;n<(g.n||3)&&!over();n++){for(const side of[g.side||me,(g.side||me)==="r"?"b":"r"]){if(!alive()||over())break;if(pos.turn!==side)continue;const m=await b2Eng(pos.b,pos.turn,side===(g.side||me)?2:(st.oppAi||3));if(!m)break;mv(m.f,m.t);await wait(500)}}
        si++;return seg()}
      if(g.mode==="guess"){let k=0;const items=g.items||[];const q=()=>{const it=items[k];if(!it){for(const u of g.after||[]){const[f,t]=lvSq(u);mv(f,t)}si++;return seg()}
          for(const u of it.before||[]){const[f,t]=lvSq(u);mv(f,t)}note(it.ask||"這一步該怎麼走？");const opts=iccsOpts(pos.b,it.options);
          optPreview(pos.b,flip,opts,c=>{const o=opts[c],hit=o.u===it.answer;if(hit)vibrate(15);else X.miss(g.rules&&g.rules.noCapture&&pos.b[lvSq(o.u)[1]]?"先留路，別急著吃":"");
            const[f,t]=lvSq(it.answer);mv(f,t);stat(hit?"✔ 對了":"✘ 正解："+((opts.find(z=>z.u===it.answer)||{}).cn||it.answer));note(it.note||"");acts([["next","›","繼續",()=>{k++;q()},true]])})};return q()}
      if(g.mode==="puzzle"){const sol=g.solution||[];let j=0,sel=-1,wr=0,hk=null;note(g.ask||"照劇情走出殺法");const save0=pos;   /* wr／hk：卡關主動提示（07c-canju.js stuckNudge），走錯 3 次亮出要動的那顆子 */
        const hx=o=>hk?{...(o||{}),hint:hk}:o;
        const nextOpp=async()=>{while(j<sol.length&&pos.turn!==me){await wait(450);const[f,t]=lvSq(sol[j]);mv(f,t);j++}if(j>=sol.length){X.setTap(null);stat("✔ 殺了！");note(g.note||"");return acts([["next","›","繼續",()=>{si++;seg()},true]])}};
        X.setTap(x=>{const L=C.legal(pos.b,pos.turn);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){if(C.iccs(sel,x)===sol[j]){hk=null;mv(sel,x);j++;sel=-1;vibrate(15);nextOpp()}else{const nz=typeof stuckNudge==="function"&&++wr===STUCK_N;if(nz){X.useHint();hk=[lvSq(sol[j])[0]]}X.miss(g.hint||"不是這步");sel=-1;draw(hx(null));if(nz)stuckNudge()}return}
          sel=L.some(([f])=>f===x)?x:-1;draw(hx(sel>=0?{sel,targets:L.filter(([f])=>f===sel).map(z=>z[1])}:null))});nextOpp();return}
      /* free：你自由下 n 步，對面是電腦 */
      {const n0=g.n||6,keep=g.keep||[],cnt=p=>pos.b.filter(x=>x===p).length;let kept0=keep.map(cnt),save0=pos,last0=lastMv,n=0,sel=-1;
        if(RS&&RS.si===si&&RS.fr){const F=RS.fr;try{n=F.n|0;save0={b:C.parseFen(F.f0),turn:F.t0==="b"?"b":"r"};last0=F.l0||null;if(Array.isArray(F.k0))kept0=F.k0}catch(e){}}RS=null;   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：自由段走到一半：步數、這段開頭的局面照舊（被將死要重來時退回那裡） */
        const frv=()=>rsv({fr:{n,f0:FN(save0.b),t0:save0.turn,l0:last0,k0:kept0}});note(g.hint||(g.goal==="mate"?`${n0} 步內將死對方`:`走滿 ${n0} 步，${keep.map(p=>B2_CN[p]).join("、")}不能丟`));
        const fail=msg=>{X.setTap(null);X.miss();pos=save0;lastMv=last0;draw();X.failCard(msg)};
        const after=async()=>{if(over()){X.setTap(null);stat(C.inCheck(pos.b,pos.turn)?"✔ 將死了！":"✔ 困斃！對方一步都動不了");if(g.goal==="keep")si=st.segs.length-1;return acts([["next","›","繼續",()=>{si++;seg()},true]])}
          if(n>=n0){if(g.goal!=="mate"&&!keep.some((p,i)=>cnt(p)<kept0[i])){si++;rsv();si--}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：這段撐過了，記成下一段 */if(g.goal==="mate")return fail(`${n0} 步內沒有贏下來，這一段重來。`+(g.fail?" "+g.fail:""));if(keep.some((p,i)=>cnt(p)<kept0[i]))return fail("有子被吃掉了，這一段重來。"+(g.fail?" "+g.fail:""));X.setTap(null);stat("✔ 這一段撐過了");return acts([["next","›","繼續",()=>{si++;seg()},true]])}
          if(pos.turn!==me){X.setTap(null);const m=await b2Eng(pos.b,pos.turn,(g.opp&&g.opp.ai)||3);if(!alive())return;if(m)mv(m.f,m.t);if(over())return fail("被將死了，這一段重來。"+(g.fail?" "+g.fail:""));X.setTap(tap)}
          frv();stat(`第 ${si+1} 段・你走（${n}／${n0} 步）`)};   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：輪到你走時記下盤面 */
        const tap=x=>{const L=C.legal(pos.b,pos.turn);if(pos.turn!==me)return;if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){mv(sel,x);sel=-1;n++;vibrate(8);after();return}
          sel=L.some(([f])=>f===x)?x:-1;draw(sel>=0?{sel,targets:L.filter(([f])=>f===sel).map(z=>z[1])}:null)};
        X.setTap(tap);after()}}}

  /* ---- duet：兩手一方（你跟電腦搭檔輪流替同一方下；猜中搭檔的意思就亮一格默契燈） ---- */
  function duet(st){const side=st.side||"r",flip=side==="b",P=st.partner||{},Q=st.opp||{};let pos=lvBoard(st.start),ours=0,mine=0,sync=0,slow=0,sel=-1,last=null,plan=null,busy=false;X.boardPage(st);
    const draw=ex=>bd.draw(pos.b,{flip,last,...(ex||{})}),mv=(f,t)=>{pos={b:C.make(pos.b,f,t),turn:pos.turn==="r"?"b":"r"};last={f,t};draw()};
    const lamp=()=>{const n=$("#lvT");if(n)n.innerHTML=`<div class="muted" style="font-size:13px;margin:4px 2px">默契燈 ${"●".repeat(sync)}${"○".repeat(Math.max(0,(st.sync&&st.sync.star||0)-sync))}${st.limit?`・你走了 ${mine}／${st.limit} 步`:""}</div>`};
    const end=()=>{const L=C.legal(pos.b,pos.turn);if(L.length)return null;return pos.turn===side?"lose":"win"};
    for(const u of st.lock||[]){const[f,t]=lvSq(u);if(pos.turn===side)ours++;mv(f,t)}
    note(st.say||"");lamp();setTimeout(loop,500);
    async function loop(){if(!alive()||busy)return;const e=end();if(e)return fin(e);
      if(st.limit&&mine>=st.limit)return fin(st.goal==="survive"||st.goal==="draw"?"win":"limit");
      if(pos.turn!==side){busy=true;stat(`${Q.name||"對手"}思考中…`);const m=await b2Eng(pos.b,pos.turn,Q.ai||4);busy=false;if(!m)return fin("win");const said=C.iccs(m.f,m.t);mv(m.f,m.t);if(plan&&plan.pv&&plan.pv[1]!==said)plan=null;return loop()}
      const partnerTurn=(ours%2===0)===(P.first!==false);
      if(partnerTurn){busy=true;stat(`${P.name||"搭檔"}思考中…`);const m=await b2Eng(pos.b,pos.turn,P.ai||5,true);busy=false;if(!m)return fin("lose");
        const cap=!!pos.b[m.t],pc=(pos.b[m.f]||"").toUpperCase();mv(m.f,m.t);ours++;const line=m.r&&m.r.lines&&m.r.lines.find(l=>l.mv===m.mv);plan={pv:line&&line.pv||[m.mv]};
        const tag=cap||C.inCheck(pos.b,pos.turn)?"攻":"AKB".includes(pc)?"守":"等你";stat(`${P.name||"搭檔"}走了・${tag}`);await wait(500);return loop()}
      stat("輪到你");if(st.timer){X.setInc(lvIncense($("#lvT"),st.timer,async()=>{slow++;X.miss("慢了");if(st.slowLimit&&slow>=st.slowLimit)return fin("slow");const m=await b2Eng(pos.b,pos.turn,1);if(m){mv(m.f,m.t);ours++;mine++;lamp()}loop()}))}
      X.setTap(tap)}
    async function tap(x){if(pos.turn!==side||busy)return;const L=C.legal(pos.b,pos.turn);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){X.stop();const u=C.iccs(sel,x),from=sel;sel=-1;
        let intent=plan&&plan.pv&&plan.pv[2];if(!intent){try{const r=await XQEngine.search({fen:C.fen(pos.b,pos.turn)},{depth:6},1);intent=r.best}catch(e){}}
        const same=intent&&(intent===u||C.parseSq(intent.slice(0,2))===from);mv(from,x);ours++;mine++;if(same){sync++;vibrate([10,30,10]);toast("💡 同一個意思")}lamp();plan=null;return loop()}
      sel=L.some(([f])=>f===x)?x:-1;draw(sel>=0?{sel,targets:L.filter(([f])=>f===sel).map(z=>z[1])}:null)}
    function fin(r){X.stop();X.flag("sync",sync);X.sflag(r==="win"?{sync,win:true,mine}:{retried:true});if(r==="win"){X.flag("win",true);stat("✔ 贏了！");note(`默契 ${sync} 次`);return acts([["next","›","繼續",X.next,true]])}
      X.failCard(r==="slow"?"太慢了，這盤判負。":r==="limit"?`${st.limit} 步內沒有贏，再試一次。`:"這盤輸了，再跟搭檔試一次。")}}
  /* ---- tapPt：認識棋盤——點亮發光的交叉點（教交叉點、九宮） ---- */
  function tapPt(st){const flip=!!st.flip,pos=st.start?lvBoard(st.start):{b:C.parseFen("9/9/9/9/9/9/9/9/9/9")};
    const lit=(st.lit||[]).map(u=>C.parseSq(u));let rem=lit.slice();const got=[];X.boardPage(st);
    const draw=()=>bd.draw(pos.b,{flip,hint:rem,targets:got});
    note(st.say||"");stat(st.ask||"點一點發光的地方");draw();acts([]);
    X.setTap(x=>{const k=rem.indexOf(x);if(k<0){X.miss(st.wrong||"要點在亮起來的交叉點上");return}
      rem.splice(k,1);got.push(x);vibrate(15);draw();
      if(!rem.length){X.setTap(null);stat(st.done||"✔ 全部找到了！");note(st.note||st.say||"");acts([["next","›","繼續",X.next,true]])}
      else stat(`還差 ${rem.length} 個`)})}
  /* ---- place：點選把棋子擺到開局位置（每課後擺子、累積紅方） ---- */
  function place(st){const flip=!!st.flip,pc=st.pc,b=C.parseFen(st.baseFen||"9/9/9/9/9/9/9/9/9/9");
    let rem=(st.sqs||[]).map(u=>C.parseSq(u));X.boardPage(st);
    const draw=()=>bd.draw(b,{flip,hint:rem});
    note(st.say||"");stat(st.ask||`點亮著的點，把「${B2_CN[pc]}」放上去`);draw();acts([]);
    X.setTap(x=>{const k=rem.indexOf(x);if(k<0){X.miss(st.wrong||"放到亮著的點上");return}
      rem.splice(k,1);b[x]=pc;vibrate(15);draw();
      if(!rem.length){X.setTap(null);stat(st.done||`✔ ${B2_CN[pc]}擺好了！`);note(st.note||st.say||"");acts([["next","›","繼續",X.next,true]])}
      else stat(`還要放 ${rem.length} 顆`)})}
  /* ---- grad：結業對局（旅伴當對手、讓雙傌雙炮＋一俥、被將軍亮解將、無限悔棋、40 回合算和） ---- */
  function grad(st){const me="r",flip=false,maxMv=st.drawMoves||40,ai=st.ai||1;
    let pos=lvBoard({fen:st.fen,turn:"r"}),sel=-1,last=null,moveNo=0,busy=false;const stack=[];
    const bud=gradBuddy();X.boardPage(st);gradCss();
    const chk=()=>C.inCheck(pos.b,me);
    const banner=()=>{const n=$("#lvT");if(!n)return;const extra=chk()?" · 被將軍了，亮著的子能解圍":moveNo>=maxMv?" · 和棋也能過關了":"";
      n.innerHTML=`<div class="grad-opp">${bud.img?`<img src="${bud.img}" alt="" style="width:26px;height:32px;object-fit:contain;object-position:top center;flex:none" onerror="this.remove()">`:""}<span><b>${esc(bud.nk)}</b>：讓了雙傌、雙炮和一俥 · 第 ${moveNo}／${maxMv} 回合${extra}</span></div>`};
    const say=t=>{stat(t);banner()};
    const draw=()=>{const o={flip,last};if(sel>=0){o.sel=sel;o.targets=C.legal(pos.b,me).filter(([f])=>f===sel).map(z=>z[1])}
      if(chk()){o.check=pos.b.indexOf("K");if(sel<0)o.hint=[...new Set(C.legal(pos.b,me).map(([f])=>f))]}bd.draw(pos.b,o)};
    const mkMove=(f,t)=>{pos={b:C.make(pos.b,f,t),turn:pos.turn==="r"?"b":"r"};last={f,t}};
    const bar=()=>acts([["undo","↶","悔棋",undo,false]]);
    function undo(){if(!stack.length){X.miss("還沒有可以悔的棋");return}const s=stack.pop();pos={b:s.b.slice(),turn:"r"};last=s.last;moveNo=s.moveNo;sel=-1;draw();say("↶ 悔了一步，再想想");bar();X.setTap(tap)}
    function fin(r){X.setTap(null);
      if(r==="lose")return X.failCard(`被將死了。${bud.nk}說：「${bud.lose}」再擺一盤，你一定下得完。`);
      const win=r==="win";stat(win?"🎆 將死對方，你出師了！":"🎆 四十回合守和，過關！");
      const nn=$("#note");if(nn)nn.textContent=`${bud.nk}：「${win?bud.win:bud.draw}」\n🀄 恭喜結業，獲得〈新手結業方印〉。`;
      banner();gradFx($("#bbox"));acts([["next","🀄","領取結業方印",X.next,true]])}
    async function afterMove(){
      if(!C.legal(pos.b,"b").length)return fin("win");
      if(moveNo>=maxMv)return fin("draw");
      busy=true;say(`${bud.nk} 思考中…`);acts([]);const m=await b2Eng(pos.b,"b",ai);busy=false;if(!alive())return;
      if(m)mkMove(m.f,m.t);moveNo++;draw();
      if(!C.legal(pos.b,"r").length)return fin("lose");
      if(moveNo>=maxMv&&!chk())return fin("draw");
      say(chk()?"你被將軍了！亮著的子可以解圍":"輪到你");bar();X.setTap(tap)}
    function tap(x){if(busy||pos.turn!==me)return;const L=C.legal(pos.b,me);
      if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){stack.push({b:pos.b.slice(),last,moveNo});mkMove(sel,x);sel=-1;vibrate(10);draw();afterMove();return}
      sel=L.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw()}
    note(st.say||"把對方將死，或守滿四十回合就結業。被將軍時棋盤會亮出能解圍的子，悔棋隨你用。");
    draw();say("輪到你");bar();X.setTap(tap)}
  return{judge,audit,simul,arrange,relay,duet,tapPt,place,grad}}
/* 三星的機器判定（story/book2/levels_schema_b2.md 的 stars／star）：條件不滿足最多兩顆星；不認得的條件當作過 */
function b2StarOk(G,R){const FS=R.fs||{},F=R.f||{},at=c=>c.step!=null?(FS[c.step]||{}):F,FO=R.fo||{};
  const fromStep=(G.steps||[]).flatMap((st,i)=>{const z=st&&st.star;if(!z||typeof z!=="object")return[];const o=[];if(z.win)o.push({k:"win",step:i});if(z.orDraw)o.push({k:"winOrDraw",step:i});if(z.winWithin)o.push({k:"winWithin",step:i,n:z.winWithin});return o});   /* 第 19～36 回把三星條件寫在對局步驟的 star 裡 */
  for(const c of [].concat(G.stars||[],fromStep)){const k=c.k||c.key,x=at(c);
    if(k==="win"&&!x.win)return false;if(k==="draw"&&!x.draw)return false;
    if((k==="winOrDraw"||k==="orDraw")&&!(x.win||x.draw||x.survived))return false;
    if(k==="winWithin"&&!(x.win&&(x.mine||0)<=(c.n||999)))return false;
    if(k==="offer"&&!((c.step!=null?(FO[c.step]||0):Object.values(FO).reduce((a,b)=>a+b,0))>=(c.n||0)))return false;
    if(k==="duetSync"&&!((x.sync||0)>=(c.n||0)))return false;
    if(k==="noRetry"&&x.retried)return false;if(k==="noHint"&&R.hint)return false;
    if(k==="finishWith"&&!(x.win&&x.lastPiece===String(c.piece||"P")))return false;
    if(k==="noRelisten"&&F.relisten)return false}return true}

/* ================= 🎴 石桌往事的特製關卡（開發者：36 回每回一關，照劇情設計玩法）=================
   資料在 park-legend.json 每一回的 game（來源 story/book1/levels.json，格式見 story/book1/levels_schema.md）。
   一關由幾個步驟組成：talk 對話選項、guess 猜著法、memory 記盤、puzzle 殘局題、collect 收集、play 對局（用挑戰電腦的畫面下，結束後回來接下一步）。
   進度存在 jRun（中途離開回來可以接著做）；星星照失誤數和有沒有用提示算 */
const jRunGet=(id,rk)=>{const R=store.get(rk||"jRun",null);return R&&R.id===id?R:null},jRunSet=(R,rk)=>store.set(rk||"jRun",R);   /* 星槎小關（07f-ship.js ShipLv）用自己的 rk＝jRunS，不蓋掉石桌往事玩到一半的關卡 */
function lvBoard(start,moves){const C=window.XQCore;let b=C.parseFen(start&&start.fen||C.START),turn=start&&start.turn==="b"?"b":"r";
  for(const u of [...(start&&Array.isArray(start.moves)?start.moves:[]),...(moves||[])]){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));b=C.make(b,f,t);turn=turn==="r"?"b":"r"}return{b,turn}}
const lvSq=u=>[window.XQCore.parseSq(u.slice(0,2)),window.XQCore.parseSq(u.slice(2,4))];
/* 香條：一條會燒短的香，燒完呼叫 done（點別的地方或換題時要 stop） */
function lvIncense(host,sec,done,at){if(!host||!sec)return{stop(){}};const el=document.createElement("div");el.className="lvinc";el.innerHTML='<i></i><span>🪔 '+sec+' 秒</span>';host.prepend(el);
  const t0=at||Date.now(),   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：at＝這炷香原本點起來的時間（關掉 App 再打開，香接著燒，不會重新燒滿） */bar=el.querySelector("i"),tx=el.querySelector("span");let on=true;
  const tick=()=>{if(!on||!el.isConnected)return;const left=Math.max(0,sec-(Date.now()-t0)/1000);bar.style.width=(left*100/sec)+"%";tx.textContent="🪔 "+Math.ceil(left)+" 秒";
    if(left<=0){on=false;el.classList.add("out");done&&done();return}requestAnimationFrame(tick)};tick();
  return{stop(){on=false;el.remove()}}}
/* ================= 意見回饋 573（開發者）：讓掉落的棋譜真的有用 =================
   ① 預習卷：每一關配 2 局古譜同型例局（data/lines/preview.json，tools/build_preview.js 產生）。公園茶杯、驛站優先掉「下一關」的預習卷；關卡裡按「📜 預習卷」翻，不算用提示、不會少星
   ② 打譜連猜三步：棋譜和預習卷打開時，停在關鍵那一步（妙棋精選停在妙著、古譜殘局從第一手、古譜全局從第 9 步）連猜同一方三手；三步都一次猜中＝有心得，每 5 個心得換 1 顆提示棋
   ③ 變體星：（開發者 11/5 改掉：三星不用再過變體，結果頁不再出「挑戰變體」按鈕；變體程式先留著） */
let PREV_P=null,PREV_D=null;const prevData=()=>PREV_P||(PREV_P=fetch("data/lines/preview.json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(d=>(PREV_D=d)));
/* 妙棋精選的名字後面寫著妙著（「・第 28 回合 車5平8」），猜之前不能露出來 */
const recTitle=n=>String(n||"").replace(/・第\s*\d+\s*回合.*$/,"");
const prevOwn=()=>store.get("jPrev",{}),studyGet=()=>store.get("study",{}),studyKey=x=>x.c+":"+x.id,jBaseId=id=>String(id||"").replace(/~v$/,"");
async function prevTarget(){const P=await prevData(),S=jStars(),L=book1Done()?jStages2():jStages(),x=L.find(z=>!S[z.id]);if(!x)return null;return(P[x.id]||[]).length&&!prevHas(x.id)?x:null}
function prevGrant(x){const o=prevOwn();o[x.id]=Date.now();store.set("jPrev",o)}
function prevBtn(x){const id=jBaseId(x&&x.id);if(!PREV_D||!(PREV_D[id]||[]).length)return"";const own=prevHas(id);return`<button class="lk" data-prev="${id}" style="margin-left:auto;font-size:13px;white-space:nowrap${own?"":";opacity:.55"}">📜 預習卷${own?"":"（還沒有）"}</button>`}
/* 意見回饋 586（開發者：看不懂）：預習卷的說明改白話——「看預習卷不會扣分，照樣能收齊兵馬車」 */
function prevLine(x){const id=jBaseId(x&&x.id);if(!PREV_D||!(PREV_D[id]||[]).length)return"";return prevHas(id)?"<br><b>預習卷</b>：已經拿到，按上面的「📜 預習卷」就能看，看了不會扣分":"<br><b>預習卷</b>：還沒拿到——公園的茶杯、驛站有機會撿到這一關的預習卷"}
async function prevSheet(x){const id=jBaseId(x.id),P=(await prevData())[id]||[];if(!P.length)return;if(!prevHas(id)){toast("📜 這一關的預習卷還沒拿到：去公園點茶杯、到驛站坐坐，有機會撿到");return}const SG=studyGet();
  sheet("📜 預習卷・"+(x.lvName||""),b=>{b.innerHTML=`<p class="muted" style="font-size:13.5px;line-height:1.7;margin:0 0 8px">古譜裡跟這一關同型的例局。先連猜關鍵的三步，再看整盤；三步都一次猜中有心得（每 5 個換 1 顆提示棋）。看預習卷不會扣分，這一關照樣能收齊兵馬車。</p><div class="items" style="padding:0">${P.map((z,i)=>{const g=SG[studyKey(z)]||{};return`<button class="item" data-pv="${i}"><span class="lb">📜</span><span class="tx"><b style="white-space:normal;line-height:1.45">${esc(toT(z.name))}</b><span style="white-space:normal">${esc(z.why||"")}${g.i?"・💡 有心得":g.r?"・✔ 讀過":""}</span></span><span class="muted">›</span></button>`}).join("")}</div>`;
    b.querySelectorAll("[data-pv]").forEach(y=>y.onclick=()=>studyOpen(P[+y.dataset.pv],{back:()=>prevSheet(x),ret:location.hash}))})}
document.addEventListener("click",e=>{const t=e.target&&e.target.closest&&e.target.closest("[data-prev]");if(!t)return;e.preventDefault();vibrate(5);const x=jFindStage(t.dataset.prev);if(x)prevSheet(x)});
/* 意見回饋 573（開發者 11/5：讀完拿修為太簡單、會一直按下一步）：打譜改成「連猜三步」——同一方連續三手（中間對方的應著自動走），每步三選一、可以再猜一次；
   三步都一次猜中才算「💡 有心得」。心得不給修為，改成攢著：每 5 個心得換 1 顆提示棋（存在庫存）。一份棋譜只有第一次猜才算（看過答案再猜是練習） */
const insightN=()=>{let n=store.get("insightN",null);if(n==null){n=Object.values(studyGet()).filter(g=>g&&g.i).length;store.set("insightN",n)}return n};
async function studyOpen(x,o){o=o||{};const C=window.XQCore;let it;try{it=await api(`/db/item?c=${encodeURIComponent(x.c)}&id=${encodeURIComponent(x.id)}`)}catch(e){toast("棋譜載入失敗");return}
  const full=()=>{closeSheet();store.set("dbReturn",{c:x.c,to:o.ret||"#/adventure",at:Date.now()});location.hash=`#/db/${x.c}/${encodeURIComponent(x.id)}`};
  const ln=(it.lines||[]).find(l=>l.parent==null)||(it.lines||[])[0]||{},mv=(ln.moves||[]).map(m=>Array.isArray(m)?m:[m.f,m.t]),b0=it.board?it.board.slice():C.parseFen(C.START);if(!mv.length)return full();
  const opening=!it.board||b0.filter(Boolean).length>=28;let k0=x.c==="brilliant"&&it.jump?it.jump-1:opening?Math.min(mv.length-1,8):0;k0=Math.max(0,Math.min(k0,mv.length-1));
  const p0=b0[mv[0][0]],first=p0&&p0===p0.toUpperCase()?"r":"b",turnAt=n=>n%2?(first==="r"?"b":"r"):first;
  const boardAt=n=>{let b=b0;for(let i=0;i<n;i++)b=C.make(b,mv[i][0],mv[i][1]);return b};
  const me=turnAt(k0),flip=me==="b",steps=[k0,k0+2,k0+4].filter(k=>k<mv.length),sh=a=>a.map(v=>[Math.random(),v]).sort((p,q)=>p[0]-q[0]).map(v=>v[1]);
  const optsAt=k=>{const B=boardAt(k),[af,at]=mv[k],L=C.legal(B,me).filter(([f,t])=>!(f===af&&t===at)),same=L.filter(([f])=>String(B[f]).toUpperCase()===String(B[af]).toUpperCase()),opts=[[af,at]];
    for(const m of sh(same).concat(sh(L)))if(opts.length<3&&!opts.some(z=>z[0]===m[0]&&z[1]===m[1]))opts.push(m);return{B,af,at,O:sh(opts).map(([f,t])=>({f,t,cn:C.notate(B,f,t),ok:f===af&&t===at}))}};
  const key=studyKey(x),before=studyGet()[key]||{},N=steps.length;
  sheet("📜 "+recTitle(toT(x.name||it.name||"棋譜")),b=>{b.innerHTML=`${x.why?`<p class="muted" style="font-size:13px;line-height:1.6;margin:0 0 6px">${esc(x.why)}</p>`:""}<div id="sdB" style="max-width:340px;margin:0 auto"></div><p id="sdP" style="text-align:center;font-size:13px;margin:6px 0 0;letter-spacing:.2em"></p><p id="sdQ" style="font-size:15px;line-height:1.7;margin:4px 2px"></p><div class="lvch" id="sdO"></div><div id="sdA"></div><div id="sdR"></div>`;
    const bd=Board(()=>{});bd.svg.style.width="100%";b.querySelector("#sdB").append(bd.svg);
    const Q=b.querySelector("#sdQ"),PB=b.querySelector("#sdP"),OB=b.querySelector("#sdO"),AB=b.querySelector("#sdA"),RB=b.querySelector("#sdR");let si=0,tries=0,cur=-1,alive=true,allFirst=true,S=null;const res=[];
    const prog=()=>{PB.textContent=N>1?`連猜 ${N} 步　${steps.map((_,i)=>res[i]===1?"●":res[i]===0?"✕":i===si?"◎":"○").join(" ")}`:""};
    const lastOf=k=>k?{f:mv[k-1][0],t:mv[k-1][1]}:null,live=()=>alive&&b.isConnected;
    let n=Math.max(0,k0-4);bd.draw(boardAt(n),{flip,last:lastOf(n)});Q.textContent=k0>0?"先看前面幾步……":"";prog();
    const step=()=>{if(!live())return;if(n<k0){n++;bd.draw(boardAt(n),{flip,last:lastOf(n)});setTimeout(step,650)}else askNow()};setTimeout(step,k0>0?500:0);
    function askNow(){const k=steps[si];S=optsAt(k);tries=0;cur=-1;prog();bd.draw(S.B,{flip,last:lastOf(k)});
      Q.textContent=si===0?`${C.PLAYER[me]}走：${x.c==="brilliant"?"這一步是有名的妙著，猜猜是哪一步？":k===0?"古譜的第一步，猜猜怎麼走？":"古譜裡這一步怎麼走？"}${N>1?`（連猜 ${N} 步，第 1 步）`:""}`
        :`對方應了「${C.notate(boardAt(k-1),mv[k-1][0],mv[k-1][1])}」，你接著怎麼走？（第 ${si+1}／${N} 步）`;
      OB.innerHTML=S.O.map((z,i)=>`<button class="btn ghost" data-o="${i}">${esc(z.cn)}</button>`).join("");AB.innerHTML="";
      OB.querySelectorAll("[data-o]").forEach(y=>y.onclick=()=>{if(y.disabled)return;cur=+y.dataset.o;const z=S.O[cur];OB.querySelectorAll("[data-o]").forEach(q=>q.classList.toggle("on",+q.dataset.o===cur));vibrate(5);
        bd.draw(S.B,{flip,last:lastOf(k),sel:z.f,targets:[z.t],arrow:true,forceArrow:true});AB.innerHTML='<button class="btn" id="sdOk" style="width:100%;margin-top:6px">✔ 就這一步</button>';AB.querySelector("#sdOk").onclick=pick})}
    function pick(){const z=S&&S.O[cur];if(!z)return;tries++;AB.innerHTML="";const k=steps[si];
      if(!z.ok&&tries<2){vibrate([20,40,20]);const y=OB.querySelector(`[data-o="${cur}"]`);if(y){y.disabled=true;y.classList.remove("on")}Q.textContent="不是這步，再想一次（還有一次機會）";cur=-1;return}
      OB.querySelectorAll("[data-o]").forEach(q=>{q.disabled=true;if(S.O[+q.dataset.o].ok)q.classList.remove("ghost")});
      res[si]=z.ok?1:0;if(!z.ok||tries>1)allFirst=false;if(z.ok)vibrate(15);prog();
      bd.draw(C.make(S.B,S.af,S.at),{flip,last:{f:S.af,t:S.at}});
      const ansCn=S.O.find(q=>q.ok).cn;
      if(!z.ok||si+1>=N){Q.textContent=(z.ok?"✔ 猜中了":"✘ 正解是「"+ansCn+"」")+(z.ok?"":"——連猜到這裡中斷");return done(k)}
      Q.textContent=(tries===1?"✔ 一次就猜中！":"✔ 猜中了")+"　對方要應了……";
      setTimeout(()=>{if(!live())return;const r=k+1;if(r<mv.length){bd.draw(boardAt(r+1),{flip,last:{f:mv[r][0],t:mv[r][1]}})}setTimeout(()=>{if(!live())return;si++;askNow()},700)},700)}
    function done(k){const allOk=res.length===N&&res.every(v=>v===1),first=!before.t,ins=first&&allFirst&&allOk,G2=studyGet(),g={...(G2[key]||{}),r:1,t:1};   /* 只有第一次猜才算心得：看過答案再猜一次只是練習 */if(ins)g.i=1;G2[key]=g;store.set("study",G2);if(first&&typeof readShare==="function")readShare([[x.c==="brilliant"?String(x.id):x.c+":"+x.id,ins?1:0,0,N>1?9:3]]);   /* 意見回饋 737：第一次連猜的結果匿名送去校正棋譜難度（三選一連猜，猜中機率約 1/9） */
      let msg="";if(ins&&!before.i){const c=insightN()+1;store.set("insightN",c);if(c%5===0){store.set("hintBonus",(store.get("hintBonus",0)||0)+1);msg=`🎁 攢滿 5 個心得，換到 1 顆提示棋（存在庫存，闖關時用）`}else msg=`💡 有心得！再 ${5-c%5} 個心得換 1 顆提示棋（${c%5}／5）`}
      else if(ins)msg="💡 這份棋譜之前就有心得了";else if(!first&&allOk)msg="（練習）這份棋譜第一次猜的時候才算心得";else if(allOk)msg="有幾步是第二次才猜中——三步都一次猜中才算心得";else if(first)msg="這份棋譜的心得沒拿到；換別份棋譜再試";
      const cm=it.comments&&(it.comments[(ln.id||0)+"_"+(k0+1)]||it.comments[(ln.id||0)+"_"+it.jump]);let bb=boardAt(k+1);const rest=[];for(let i=k+1;i<Math.min(mv.length,k+7);i++){rest.push(C.notate(bb,mv[i][0],mv[i][1]));bb=C.make(bb,mv[i][0],mv[i][1])}
      RB.innerHTML=`${msg?`<p style="font-size:14.5px;line-height:1.7;margin:6px 2px;font-weight:700">${esc(msg)}</p>`:""}${cm?`<p style="font-size:14px;line-height:1.75;margin:6px 2px">${esc(toT(String(cm)))}</p>`:rest.length?`<p class="muted" style="font-size:13.5px;line-height:1.7;margin:6px 2px">古譜接著走：${esc(rest.join("　"))}${mv.length>k+7?"……":""}</p>`:""}
        <button class="btn ghost" id="sdAg" style="width:100%;margin-top:6px">↺ 再猜一次</button><button class="btn" id="sdF" style="width:100%;margin-top:6px">📖 打開整盤棋譜（可以自己擺、叫引擎分析）</button>${o.back?'<button class="btn ghost" id="sdBk" style="width:100%;margin-top:6px">← 回上一頁</button>':""}`;
      RB.querySelector("#sdF").onclick=full;RB.querySelector("#sdAg").onclick=()=>{alive=false;studyOpen(x,o)};const bk=RB.querySelector("#sdBk");if(bk)bk.onclick=()=>{alive=false;o.back()}}})}
/* 變體：u＝ICCS 著法（"h2e2"）。m＝左右翻；s＝整盤轉半圈＋紅黑對調（走的那一方換顏色）。起始局面都有指定 fen 才用 s（從開局下的轉過來會變成黑先） */
const lvM3=G=>Math.max(1,(G&&G.rules&&G.rules.maxMistakes3)||0),lvStar3=G=>`失誤不超過 ${lvM3(G)} 次、不用提示棋`;
/* 開發者 11/5：拿到三星時 30% 機率出現隱藏關卡（簡單：過關就好；困難：原本的零失誤、不用提示、局面翻過來、第二集特別條件），過了多拿一顆隱藏星。
   jHid＝{關卡 id:{k:"easy"|"hard",got:true/false}}；名稱集中在 HIDN，之後換成象棋用語只改這裡 */
const HIDN={ic:"🪙",star:"將令",lv:"隱藏殘局"};   /* 開發者 11/5（RPG 企劃）：隱藏星改成「將令」——跟悔棋符一樣是可以花掉的道具，拿去驛站的點將台換東西 */
const jHid=()=>store.get("jHid",{}),jHidGot=()=>Object.values(jHid()).filter(x=>x&&x.got).length;
const lingN=()=>{let v=store.get("lingN",null);if(v==null){v=jHidGot();store.set("lingN",v)}return Math.max(0,+v||0)},lingAdd=d=>store.set("lingN",Math.max(0,lingN()+d));
const lingTitle=()=>jHidGot()>=12?"領令先鋒":"";
function jHidRoll(id){const H=jHid();if(H[id])return H[id];if(Math.random()>=.3)return null;H[id]={k:Math.random()<.5?"easy":"hard",got:false};store.set("jHid",H);return H[id]}
function jVarG(G,mode){const all=G.steps||[];let steps=all.filter(st=>["guess","puzzle","collect"].includes(st.t));if(!steps.length){const P=all.filter(st=>st.t==="play");steps=P.length?[P[P.length-1]]:[]}if(!steps.length)return null;
  const hasFen=z=>!!(z&&z.fen),okS=steps.every(st=>st.t==="guess"?hasFen(st.start):st.t==="play"?hasFen(st.start)&&!(st.offer||[]).length:(st.t==="collect"?st.from||[]:st.items||[]).every(it=>hasFen(it.start))),sw=mode==="s"&&okS;
  const sq=q=>String.fromCharCode(202-q.charCodeAt(0))+(sw?String(9-+q[1]):q[1]),mu=u=>sq(u.slice(0,2))+sq(u.slice(2,4)),oth=t=>t==="b"?"r":"b";
  const mf=fen=>{let R=String(fen).split(" ")[0].split("/").map(r=>{const a=[];for(const ch of r)if(/\d/.test(ch))for(let i=0;i<+ch;i++)a.push("1");else a.push(sw?(ch===ch.toUpperCase()?ch.toLowerCase():ch.toUpperCase()):ch);return a.reverse()});if(sw)R=R.reverse();return R.map(a=>a.join("").replace(/1+/g,m=>String(m.length))).join("/")};
  const ms=z=>z?{...z,fen:z.fen?mf(z.fen):z.fen,turn:sw?oth(z.turn||"r"):z.turn,moves:Array.isArray(z.moves)?z.moves.map(mu):z.moves,fenAfter:undefined}:z;
  const AQ="同一個思路，局面翻過來了：這一步怎麼走？",SAY=sw?"（變體）整盤轉過來、紅黑對調了，同一個思路再走一次。":"（變體）局面左右翻過來了，同一個思路再走一次。";
  const cv=st=>{const o={...st,star:undefined};if(st.t==="guess"){o.say=SAY;o.start=ms(st.start);o.auto=(st.auto||[]).map(mu);o.items=(st.items||[]).map(it=>({...it,ask:AQ,note:"",before:(it.before||[]).map(mu),options:(it.options||[]).map(mu),answer:mu(it.answer)}))}
    else if(st.t==="puzzle"||st.t==="collect"){o.say=SAY;const f=it=>({...it,ask:"同一個思路，局面翻過來了：找出最好的著法",note:"",start:ms(it.start),auto:(it.auto||[]).map(mu),line:(it.line||[]).map(mu)});if(st.t==="collect")o.from=(st.from||[]).map(f);else o.items=(st.items||[]).map(f)}
    else if(st.t==="play"){o.say=sw?"（變體）同一盤棋，整盤轉過來、紅黑對調再下一次。":"（變體）同一盤棋，左右翻過來再下一次。";o.start=ms(st.start);o.remove=(st.remove||[]).map(sq);o.human=sw?oth(st.human||"r"):st.human;if(st.offer)o.offer=st.offer.map(z=>({...z,remove:z.remove&&z.remove.map(sq),start:z.start&&ms(z.start)}))}
    return o};
  return{name:(G.name||"")+"・變體",intro:`這是「${G.name||""}」的變體：${sw?"整盤轉過來、紅黑對調":"棋盤左右翻過來"}了，同一個思路再走一次。零失誤、不用提示過關，就拿到這一關的第三顆星。`,skill:G.skill,pass:"跟原關卡的棋盤題一樣",star3:"零失誤、不用提示",rules:G.rules,steps:steps.map(cv)}}
function jVarLevel(v,x){const back=jChapterHref(x),H=jHid()[x.id];if(!H){navReplace(back);return{}}const hard=H.k==="hard";
  setTop(HIDN.ic+" "+x.name+"・"+HIDN.lv,back);setTabs(false);v.className="view";v.innerHTML='<div class="pad muted">載入中…</div>';
  (x.book===2?legendData2():legendData()).then(D=>{const G=D&&D.chapters[x.n-1]&&D.chapters[x.n-1].game,vid=x.id+"~v",R0=jRunGet(vid),M=store.get("jVarMode",{});let m=R0&&!R0.done&&M[x.id];if(!m){m=Math.random()<.5?"m":"s";M[x.id]=m;store.set("jVarMode",M)}
    if(!G||!(G.steps||[]).length){v.innerHTML='<div class="pad"><div class="card muted">這一關的資料還沒準備好</div></div>';return}
    const VV=jVarG(G,m),base=VV||{skill:G.skill,steps:G.steps},how=VV?"局面翻過來了，同一個思路再走一次":"同一關再走一次",
      need=hard?`零失誤、不用提示棋${(G.stars||[]).length?"，還要做到這一關原本的特別條件":""}`:"過關就好";
    const HG={...base,name:(G.name||"")+"・"+HIDN.lv,intro:`${HIDN.lv}（${hard?"困難":"簡單"}）：${how}。${need}，就得到一枚 ${HIDN.ic} ${HIDN.star}。`,pass:VV?VV.pass:G.pass,star3:need,
      rules:hard?{...(G.rules||{}),maxMistakes3:0}:{maxMistakes3:99,maxMistakes2:99},stars:hard?(G.stars||[]).filter(c=>c&&c.step==null):[]};
    jLevel(v,{...x,id:vid,name:x.name+"・"+HIDN.lv},{G:HG,title:HIDN.ic+" "+HIDN.lv,icon:HIDN.ic,back,hid:true,
      done:n=>{const ok=n>=(hard?3:1),Hs=jHid(),h=Hs[x.id];if(ok&&h&&!h.got){lingN();h.got=true;store.set("jHid",Hs);lingAdd(1);addXP(40,HIDN.lv,"jh:"+x.id);setTimeout(()=>toast(`${HIDN.ic} 得到一枚將令！現在有 ${lingN()} 枚，可以去 🏮 驛站的點將台換東西`),600)}return n},
      line:n=>{const g=(jHid()[x.id]||{}).got;return n>=(hard?3:1)||g?`${HIDN.ic} 將令到手（現在有 ${lingN()} 枚）`:`這次沒拿到${HIDN.star}：要${need}，可以再挑戰`}})});return{}}
function jLevel(v,s,src){prevData();const BKP=jChapterHref(s);setTop((src&&src.icon||"🎴")+" "+s.name,src?src.back:BKP);setTabs(false);v.className="view";v.innerHTML='<div class="pad muted">載入中…</div>';
  (src?Promise.resolve(null):s.book===2?legendData2():legendData()).then(D=>{const ch=src?{title:src.title||"",game:src.G}:D&&D.chapters[s.n-1],G=ch&&ch.game;if(!G||!(G.steps||[]).length){v.innerHTML='<div class="pad"><div class="card muted">這一關的資料還沒準備好</div></div>';return}
  const RK=src&&src.rk||"jRun";const STK_MISS={};   /* 卡關訊號（05b-save.js）：這一關每一步錯了幾次，錯第 3 次記一筆 miss */
  let R=jRunGet(s.id,RK);if(!R||R.done){R={id:s.id,k:0,miss:0,hint:false};jRunSet(R,RK)}
  const N=G.steps.length,H0=location.hash,bd=Board(x=>onTap&&onTap(x));let onTap=null,inc=null;
  /* 回饋 838（開發者 11/9 選：全模式中斷接續）：每次存檔順便記進接續小卡（07m4-resume.js rsPg，千秋穿梭突發事件 jRunE 照原本「關掉＝沒發生」不記）；
     R.si＝這一步做到哪裡（{k 第幾步,t 步驟種類,…}，猜著法／記盤／殘局題／收集／看盤問答做到第幾題、殘局題走到第幾手、接香到第幾段和盤面），關掉 App 再打開回到同一題、同一個局面，已經記的失誤不會因為重做再記一次 */
  const save=()=>{jRunSet(R,RK);if(RK!=="jRunE"&&typeof rsPg==="function")try{if(R.done)rsPgClear("lv",s.id);else rsPg("lv",RK,s.id,H0,s.name,R.k,N)}catch(e){}};
  const siGet=t=>R.si&&R.si.k===R.k&&R.si.t===t?R.si:null,siSet=o=>{R.si={k:R.k,...o};save()};
  const hdr=()=>`<div class="lvh"><b>${esc(G.name||s.lvName)}</b><span>第 ${Math.min(R.k+1,N)}／${N} 步・失誤 ${R.miss}${R.hint?"・用過提示":""}</span>${src&&!/~v$/.test(s.id)?"":prevBtn(s)}</div>`;
  const stop=()=>{if(inc){inc.stop();inc=null}onTap=null};
  const next=()=>{stop();R.k++;delete R.si;save();run()};   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：換下一步，清掉這一步的進度 */
  const miss=why=>{R.miss++;save();try{STK_MISS[R.k]=(STK_MISS[R.k]||0)+1;if(STK_MISS[R.k]===3&&typeof stkEv==="function")stkEv("miss",s.id+" 第 "+(R.k+1)+" 步")}catch(e){}vibrate([20,40,20]);if(why)toast(why);const h=v.querySelector(".lvh span");if(h)h.textContent=`第 ${Math.min(R.k+1,N)}／${N} 步・失誤 ${R.miss}${R.hint?"・用過提示":""}`};
  const failCard=msg=>{stop();if(R.si){delete R.si;save()}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：這一步沒過、要重來，進度從頭 */if(src&&src.onFail)return src.onFail(msg,run);v.className="view";v.innerHTML=`<div class="pad">${hdr()}<div class="card" style="text-align:center;line-height:1.8"><div style="font-size:40px">💪</div><p>${esc(msg)}</p><button class="btn" id="lvR" style="width:100%">再試這一步</button><button class="btn ghost" id="lvB" style="width:100%;margin-top:6px">${src?(src.backLabel||"回上一頁"):s.book===2?"回第二集":"回"+ROAD_NAME}</button></div></div>`;
    (v.querySelector("#lvR")||{}).onclick=run;(v.querySelector("#lvB")||{}).onclick=()=>goBack(src?src.back:BKP)};
  const sayBox=t=>t?`<div class="card lvsay">${esc(t)}</div>`:"";
  const blank=b=>b.map(()=>null);
  const B2=jStepsB2({v,bd,boardPage,stop,next,miss,failCard,siGet,siSet,   /* 回饋 838（開發者 11/9 選：全模式中斷接續） */setTap:f=>{onTap=f},setInc:i=>{inc=i},useHint:()=>{R.hint=true;save();try{if(typeof stkEv==="function")stkEv("hint",s.id+" 第 "+(R.k+1)+" 步")}catch(e){}},flag:(k,x)=>{R.f=R.f||{};R.f[k]=x;save()},sflag:o=>{R.fs=R.fs||{};R.fs[R.k]={...(R.fs[R.k]||{}),...o};save()}});
  if(R.k===0&&!R.intro){v.innerHTML=`<div class="pad">${hdr()}${ch.title?`<p class="muted" style="font-size:13px;margin:0 2px 8px">📖 ${esc(ch.title)}</p>`:""}${sayBox(G.intro||"")}
    <div class="card" style="font-size:14px;line-height:1.8">${G.skill?`<b>練什麼</b>：${esc(G.skill)}<br>`:""}<b>過關</b>：${esc(G.pass||"")}<br><b>${src&&src.hid?"拿"+HIDN.star:src?"三星":"收車"}</b>：${esc(src?G.star3||"":lvStar3(G))}${src?"":prevLine(s)}</div><button class="btn" id="lvGo" style="width:100%;margin-top:10px">開始</button>${(()=>{const h=!src&&jHid()[s.id];return h&&!h.got?`<button class="btn ghost" id="lvHd" style="width:100%;margin-top:6px">${HIDN.ic} ${HIDN.lv}（${h.k==="hard"?"困難":"簡單"}）</button>`:""})()}</div>`;
    (v.querySelector("#lvGo")||{}).onclick=()=>{R.intro=1;save();run()};(v.querySelector("#lvHd")||{}).onclick=()=>{jRunSet(null,RK);location.hash="#/journey/"+s.id+"~v"};return}
  run();
  function run(){stop();const st=G.steps[R.k];if(!st)return finish();
    ({talk,guess,memory,play,puzzle,collect:puzzle,...B2}[st.t]||next)(st)}
  /* ---- 對話選項 ---- */
  function talk(st){v.className="view";v.innerHTML=`<div class="pad">${hdr()}<div id="lvT"></div>${sayBox(st.say)}${st.start?'<div class="boardbox" id="lvTB" style="max-width:360px;margin:0 auto 8px"></div>':""}<div class="lvch">${(st.choices||[]).map((x,i)=>`<button class="btn ghost" data-i="${i}">${esc(x.label)}</button>`).join("")}</div><div id="lvRp"></div></div>`;
    if(st.start){const tb=v.querySelector("#lvTB");if(tb){tb.append(bd.svg);bd.draw(lvBoard(st.start).b,{flip:st.start.turn==="b"})}}   /* 星槎終章：對話選項旁邊亮出棋盤（有 start 才畫） */
    const arm=()=>{if(st.timer){if(inc)inc.stop();inc=lvIncense(v.querySelector("#lvT"),st.timer,()=>{miss("🪔 香燒完了，算一次失誤");arm()})}};arm();
    v.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const x=st.choices[+b.dataset.i];
      if(!x.ok){b.disabled=true;miss();v.querySelector("#lvRp").innerHTML=`<div class="card lvsay lvno">${esc(x.reply||"不對，再想想。")}</div>`;return}
      stop();vibrate(15);v.querySelectorAll("[data-i]").forEach(z=>z.disabled=true);b.classList.remove("ghost");
      v.querySelector("#lvRp").innerHTML=`${x.reply?`<div class="card lvsay">${esc(x.reply)}</div>`:""}<button class="btn" id="lvN" style="width:100%">繼續</button>`;(v.querySelector("#lvN")||{}).onclick=next})}
  /* ---- 棋盤頁（猜著法、記盤、殘局題共用） ---- */
  function boardPage(st){v.className="view fixed"+(/^camp/.test(s.id)?" camp-lv":"");v.innerHTML=`<div class="pad" style="padding-bottom:0">${hdr()}</div><div id="lvT" style="padding:0 12px"></div><div class="boardbox" id="bbox"></div><div class="status" id="stat"></div><div class="note" id="note" style="white-space:pre-wrap;flex:0 0 auto;min-height:1.6em;max-height:26vh;overflow:auto"></div><div id="lvO" class="lvch" style="padding:0 12px"></div><div style="flex:1"></div><div class="actions" id="acts"></div>`;
    v.querySelector("#bbox").append(bd.svg);if(st.say)v.querySelector("#note").textContent=st.say}
  /* 回饋 872／873（開發者 11/12 漂流瓶截圖「✔ 對了！」後面一排點點點）：#note 原本是 .note 的 flex:1、min-height:0，下面又有 #lvO 選項按鈕，
     手機上棋盤＋三個選項就把高度用完，說明（「大師走的是『炮1進4』…」）被擠成 8px 高，只露出藍色可點記譜的一條邊。改成照內容高度（最多 26vh、超過可捲），由棋盤讓出空間 */
  /* ---- 猜著法：先自動走 auto，每題選一步（選完照正解落子），blind 時只看格線和文字棋譜 ---- */
  function guess(st){const C=window.XQCore;let {b,turn}=lvBoard(st.start,st.auto),i=0,ok=0,last=null;const hist=[],flip=(st.start&&st.start.turn)==="b";
    boardPage(st);{const S=siGet("guess");if(S){for(let q=0;q<S.i&&q<st.items.length;q++){for(const u of st.items[q].before||[])play(u);play(st.items[q].answer)}i=S.i;ok=S.ok|0}}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：回到做到的那一題（前面幾題的著法照正解擺上） */ask();
    function draw(){v.querySelector("#bbox").classList.toggle("lvblind",!!st.blind);bd.draw(st.blind?blank(b):b,{flip,last})}
    function play(u){const [f,t]=lvSq(u);hist.push(C.notate(b,f,t));b=C.make(b,f,t);turn=turn==="r"?"b":"r";last={f,t}}
    function ask(){stop();const it=st.items[i];if(!it){return ok>=((st.pass!=null?st.pass:st.items.length))?next():failCard(`答對 ${ok} 題，要答對 ${(st.pass!=null?st.pass:st.items.length)} 題才過這一步。`)}
      for(const u of it.before||[])play(u);draw();
      v.querySelector("#stat").textContent=`第 ${i+1}／${st.items.length} 題・${C.PLAYER[turn]}走`;
      v.querySelector("#note").textContent=(i===0&&st.say?st.say+"\n":"")+(it.ask||"這一步該怎麼走？")+(st.blind&&hist.length?"\n棋譜："+hist.slice(-8).join("　"):"");
      const opts=(it.options||[]).map(u=>{const [f,t]=lvSq(u);return{u,cn:C.notate(b,f,t)}});
      v.querySelector("#lvO").innerHTML=opts.map((o,k)=>`<button class="btn ghost" data-k="${k}">${esc(o.cn)}</button>`).join("");
      if(st.timer)inc=lvIncense(v.querySelector("#lvT"),st.timer,()=>pick(-1));
      let cur=-1;const prev=k=>{cur=k;const [f,t]=lvSq(opts[k].u);v.querySelectorAll("#lvO [data-k]").forEach(x=>x.classList.toggle("on",+x.dataset.k===k));
        bd.draw(st.blind?blank(b):b,{flip,last:{f,t},sel:f,targets:[t],arrow:true,forceArrow:true});vibrate(5);
        actionBar(v.querySelector("#acts"),[["ok","✔","確認送出",()=>{if(cur>=0)pick(cur)},true]]);const n=v.querySelector("#lvHint");if(n)n.textContent="棋盤上的箭頭就是這一步；可以換別的選項比較，確定了再按「確認送出」"};
      v.querySelectorAll("#lvO [data-k]").forEach(x=>x.onclick=()=>prev(+x.dataset.k));
      {let n=v.querySelector("#lvHint");if(!n){n=document.createElement("p");n.id="lvHint";n.className="muted";n.style.cssText="font-size:12.5px;margin:6px 14px 0";v.querySelector("#lvO").after(n)}n.textContent="先點一個選項，棋盤上會畫出那一步"}
      actionBar(v.querySelector("#acts"),[]);
      function pick(k){stop();{const n=v.querySelector("#lvHint");if(n)n.textContent=""}actionBar(v.querySelector("#acts"),[]);const o=opts[k],hit=!!o&&o.u===it.answer,ans=opts.find(z=>z.u===it.answer);if(hit){ok++;vibrate(15)}else miss(k<0?"🪔 香燒完了":"");siSet({t:"guess",i:i+1,ok});   /* 回饋 838（開發者 11/9 選：全模式中斷接續） */
        v.querySelectorAll("#lvO [data-k]").forEach(x=>{x.disabled=true;const z=opts[+x.dataset.k];if(z.u===it.answer)x.classList.remove("ghost")});
        play(it.answer);draw();
        v.querySelector("#stat").textContent=hit?"✔ 對了！":"✘ 正解是「"+(ans?ans.cn:it.answer)+"」";
        v.querySelector("#note").textContent=(it.note||"")+(st.blind&&hist.length?"\n棋譜："+hist.slice(-8).join("　"):"");
        actionBar(v.querySelector("#acts"),[["next","›",i+1<st.items.length?"下一題":"繼續",()=>{i++;ask()},true]])}}}
  /* ---- 記盤：亮出局面幾秒，蓋起來問問題 ---- */
  function memory(st){let {b}=lvBoard(st.start,st.auto),i=0,ok=0;const flip=(st.start&&st.start.turn)==="b";boardPage(st);
    {const S=siGet("memory");if(S){i=S.i;ok=S.ok|0;bd.draw(blank(b),{flip});ask();return}}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：已經看過盤、答到一半：直接回到那一題（盤面照樣蓋著） */
    if(st.show===0){bd.draw(blank(b),{flip});const lines=String(st.say||"").split(/(?<=」)/).map(x=>x.trim()).filter(Boolean);let heard=0;   /* 開發者：show:0＝只唸、不亮盤 */
      const play=()=>{const n=v.querySelector("#note");let k=0;n.style.whiteSpace="pre-line";n.textContent="";v.querySelector("#stat").textContent="👂 只能聽，不能看棋盤";const one=()=>{if(!v.isConnected)return;if(k<lines.length){n.textContent=lines.slice(0,++k).join("\n");setTimeout(one,1600)}else{heard++;actionBar(v.querySelector("#acts"),[...(heard<2?[["again","↺","再聽一次",play]]:[]),["go","›","聽好了",()=>{n.textContent="";ask()},true]])}};actionBar(v.querySelector("#acts"),[]);one()};
      play();return}
    bd.draw(b,{flip});
    let left=st.show||8;v.querySelector("#stat").textContent=`記住這個局面：${left} 秒`;actionBar(v.querySelector("#acts"),[["go","›","記好了",()=>{clearInterval(tm);hide()},true]]);
    const tm=setInterval(()=>{left--;if(!v.isConnected)return clearInterval(tm);if(left<=0){clearInterval(tm);hide()}else{const e=v.querySelector("#stat");if(e)e.textContent=`記住這個局面：${left} 秒`}},1000);
    function hide(){bd.draw(blank(b),{flip});ask()}
    function ask(){const q=(st.questions||[])[i];if(!q)return ok>=((st.pass!=null?st.pass:(st.questions||[]).length))?next():failCard(`答對 ${ok} 題，要答對 ${(st.pass!=null?st.pass:st.questions.length)} 題才過這一步。`);
      v.querySelector("#stat").textContent=`第 ${i+1}／${st.questions.length} 題`;{const n=v.querySelector("#note");n.textContent=q.ask||"";n.classList.add("lv-q")}   /* 意見回饋 729：記盤的題目放大加粗，不再是小小的灰字 */
      v.querySelector("#lvO").innerHTML=(q.options||[]).map((o,k)=>`<button class="btn ghost" data-k="${k}">${esc(o)}</button>`).join("");actionBar(v.querySelector("#acts"),[]);
      v.querySelectorAll("#lvO [data-k]").forEach(x=>x.onclick=()=>{const hit=+x.dataset.k===q.answer;if(hit){ok++;vibrate(15)}else miss();siSet({t:"memory",i:i+1,ok});   /* 回饋 838（開發者 11/9 選：全模式中斷接續） */
        v.querySelectorAll("#lvO [data-k]").forEach(z=>{z.disabled=true;if(+z.dataset.k===q.answer)z.classList.remove("ghost")});
        v.querySelector("#stat").textContent=hit?"✔ 記對了":"✘ 不對";bd.draw(b,{flip});
        actionBar(v.querySelector("#acts"),[["next","›",i+1<st.questions.length?"下一題":"繼續",()=>{i++;bd.draw(blank(b),{flip});ask()},true]])})}}
  /* ---- 殘局題／收集：玩家照 line 走自己那一方，對方自動應；走錯算失誤、可以重來；collect 每解一題拿一樣東西 ---- */
  function puzzle(st){const C=window.XQCore,items=st.t==="collect"?(st.from||[]):(st.items||[]),got=[];let i=0,solved=0,RS=siGet("puzzle");boardPage(st);
    if(RS){i=RS.i;solved=RS.sv|0;for(let q=0;q<(RS.g|0);q++)got.push(1)}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：回到做到的那一題；RS.j＝這一題已經走到第幾手 */
    const sv=(o)=>siSet({t:"puzzle",i,sv:solved,g:got.length,...(o||{})});ask();
    function ask(){stop();const it=items[i];if(!it){return solved>=((st.pass!=null?st.pass:items.length))?next():failCard(`解出 ${solved} 題，要解出 ${(st.pass!=null?st.pass:items.length)} 題才過這一步。`)}
      let {b,turn}=lvBoard(it.start,it.auto),j=0,sel=-1,last=null,peek=false,hk=null,wr=0,ng=false;   /* wr／ng：這一題走錯幾次、主動提示給過沒（07c-canju.js stuckNudge） */const me=turn,flip=me==="b";
      if(RS&&RS.ii===i&&RS.j>0&&RS.j<it.line.length){for(let q=0;q<RS.j;q++){const[f,t]=lvSq(it.line[q]);b=C.make(b,f,t);last={f,t};turn=turn==="r"?"b":"r"}j=RS.j;peek=!!RS.pk}RS=null;   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：這一題走到一半：照正解擺回那一手 */
      const coll=st.t==="collect"?`\n收集：${(st.items||[]).map((x,k)=>k<got.length?"✔"+x:"□"+x).join("　")}`:"";
      const draw=()=>bd.draw(b,{flip,sel,last,targets:sel>=0?C.legal(b,turn).filter(([f])=>f===sel).map(x=>x[1]):[],...(hk?{hint:hk}:{})});
      const say=()=>{v.querySelector("#stat").textContent=`第 ${i+1}／${items.length} 題・${C.PLAYER[me]}走`;v.querySelector("#note").textContent=(i===0&&st.say?st.say+"\n":"")+(it.ask||"找出最好的著法")+coll};
      say();draw();
      const bar=()=>actionBar(v.querySelector("#acts"),[["hint","💡",hintLabel(),()=>{const H=useHint();if(!H)return;R.hint=true;save();const [f,t]=lvSq(it.line[j]);hk=H.full?[f,t]:[f];draw()}],["skip","👁","看答案",()=>{peek=true;miss();go(it.line[j])}]]);bar();
      function go(u){const [f,t]=lvSq(u);b=C.make(b,f,t);last={f,t};turn=turn==="r"?"b":"r";j++;sel=-1;hk=null;draw();
        if(j>=it.line.length)return done();
        onTap=null;setTimeout(()=>{if(!v.isConnected)return;const [f2,t2]=lvSq(it.line[j]);b=C.make(b,f2,t2);last={f:f2,t:t2};turn=turn==="r"?"b":"r";j++;draw();if(j>=it.line.length)return done();sv({ii:i,j,pk:peek?1:0});/* 回饋 838（開發者 11/9 選：全模式中斷接續） */onTap=tap},450)}
      function tap(x){const L=C.legal(b,turn);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const u=C.iccs(sel,x);if(u===it.line[j]||(it.alt&&(it.alt[j]||[]).includes(u))){vibrate(15);return go(u)}   /* 11/10 開發者「把傌跳出來」走傌八進六被說錯：題目可以用 alt:{第幾手:[其他也算對的走法]} 收多種正解 */
          if(it.soft){toast(it.soft);sel=-1;draw();return}   /* 11/11 AI 模擬玩家報告問題 14：題目可以用 soft:"說明" 表示「其他合法的走法不算失誤」（第 1 課帥橫走也亮綠點，走了只說明、不扣分） */
          {const nz=typeof stuckNudge==="function"&&++wr>=STUCK_N&&!ng&&!hk;if(nz){ng=true;R.hint=true;hk=[lvSq(it.line[j])[0]]}miss("不是這步，再想想");sel=-1;draw();if(nz)stuckNudge()}return}   /* 卡關主動提示：同一題走錯 3 次，亮出要動的那顆子（算用了提示，不扣提示棋） */
        {const mine=x>=0&&!!b[x]&&C.sideOf(b[x])===turn;let w="";try{if(sel>=0&&!mine&&typeof lsnWhyNot==="function")w=lsnWhyNot(b,sel,x);else if(mine&&!L.some(([f])=>f===x)&&typeof lsnStuck==="function")w=lsnStuck(b,x)}catch(e){}if(w){toast(w);if(!mine){sel=-1;draw();return}}}   /* 11/11 問題 7、14：點了不能走的格子（例如帥會跟將面對面）或走不了的子，說規則原因，不算失誤 */
        sel=L.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw()}
      onTap=tap;
      function done(){onTap=null;if(!peek)solved++;if(st.t==="collect"&&!peek)got.push(1);i++;sv();i--;   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：這一題做完了，記成下一題 */
        v.querySelector("#stat").textContent=peek?"看過答案了":"✔ 解出來了！";v.querySelector("#note").textContent=(it.note||"")+(st.t==="collect"?`\n收集：${(st.items||[]).map((x,k)=>k<got.length?"✔"+x:"□"+x).join("　")}`:"");
        actionBar(v.querySelector("#acts"),[["next","›",i+1<items.length?"下一題":"繼續",()=>{i++;ask()},true]])}}}
  /* ---- 對局：用挑戰電腦的畫面下（盲棋、香條在那邊處理），結束時 journeyGameEnd 判定，再回到這裡 ---- */
  function play(st){v.className="view";
    /* 第二集 offer：讓先擂台——開打前選一個（讓幾關記在 R.f.offer，三星用） */
    if(Array.isArray(st.offer)&&st.offer.length){R.op=R.op||{};const pk=R.op[R.k];
      if(pk==null){v.innerHTML=`<div class="pad">${hdr()}${sayBox(st.say)}<div class="card"><b>這一盤要怎麼下？</b></div><div class="lvch">${st.offer.map((o,i)=>`<button class="btn ghost" data-o="${i}">${esc(o.label||("選項 "+(i+1)))}</button>`).join("")}</div></div>`;
        v.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{const i=+b.dataset.o;R.op[R.k]=i;R.f=R.f||{};R.f.offer=(R.f.offer||0)+(+st.offer[i].star||0);R.fo=R.fo||{};R.fo[R.k]=+st.offer[i].star||0;save();play(st)});return}
      const o=st.offer[pk]||{};st={...st,...(o.human?{human:o.human}:{}),...(o.remove?{remove:o.remove}:{}),...(o.start?{start:o.start}:{})}}
    if(st.start&&Array.isArray(st.start.moves)&&st.start.moves.length){const p=lvBoard(st.start);st={...st,start:{fen:window.XQCore.fen(p.b,p.turn).split(" ")[0],turn:p.turn}}}
    const gl={win:"贏這一盤",survive:`撐過 ${st.limit||30} 步不輸`,draw:"至少下和"}[st.goal||"win"];
    v.innerHTML=`<div class="pad">${hdr()}${sayBox(st.say)}<div class="card" style="font-size:14px;line-height:1.85">⚔ 對手：第 ${st.ai||3} 級的電腦・你執${st.human==="b"?"黑":"紅"}<br>🎯 ${gl}${st.limit&&st.goal!=="survive"?`（${st.limit} 步內）`:""}${st.remove&&st.remove.length?`<br>🎁 讓子：先拿掉 ${st.remove.length} 顆`:""}${st.start?"<br>♟ 從指定局面開始":""}${st.timer?`<br>🪔 每步一炷香（${st.timer} 秒），燒完算一次失誤`:""}${st.blind?"<br>🙈 盲棋：棋盤上看不到棋子":""}</div>
      ${R.lose?`<p class="muted" style="font-size:13px">這一步已經試了 ${R.lose} 次，加油！</p>`:""}<button class="btn" id="lvP" style="width:100%">開始對局</button></div>`;
    const P0=store.get("jPending",null),same=!!(P0&&P0.id===s.id&&P0.lvp&&P0.lvp.step===R.k);   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：這一步的那盤還沒下完（jPending 還指著它）：按「開始對局」接著下，不重開 */
    if(same){const b=v.querySelector("#lvP");if(b)b.textContent="⏳ 繼續那一盤"}
    (v.querySelector("#lvP")||{}).onclick=async()=>{if(st.blind){if(R.p3===undefined){R.p3=parkOn();save()}store.set("park3d",false)}
      if(same)try{const S0=await api("/play/state");if(S0&&S0.id===P0.game&&S0.result&&typeof rsWasOpen==="function"&&rsWasOpen(S0.id)){location.hash="#/journey/play";return}}catch(e){}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：那盤在對局頁外分出了勝負，先回對局頁把結果算完 */
      jStart(s.id,{human:st.human==="b"?"b":"r",level:Math.max(1,Math.min(8,st.ai||3)),journey:s.id,lv:{fen:st.start&&st.start.fen||"",turn:st.start&&st.start.turn||"r",remove:st.remove||[],noPerpetual:!!st.noPerpetual}},()=>{
        const P=store.get("jPending",null);if(P){const inc=same&&P.lvp?P.lvp.inc:undefined;P.lvp={goal:st.goal||"win",limit:st.limit||0,timer:st.timer||0,blind:!!st.blind,opp:st.opp||null,step:R.k,rule:st.rule||null,...(inc?{inc}:{})};store.set("jPending",P)}
        location.hash="#/journey/play"},!same)}}
  function finish(){stop();const r=G.rules||{},m3=src?(r.maxMistakes3!=null?r.maxMistakes3:0):lvM3(G),m2=Math.max(r.maxMistakes2!=null?r.maxMistakes2:2,m3);
    /* 開發者 11/5：三星太難（零失誤＋變體＋第二集的額外條件），改成只比兩星難一級：失誤不超過 1 次、不用提示棋；不用再過變體 */
    let stars=Math.min(src?(b2StarOk(G,R)?3:2):3,R.miss<=m3&&!R.hint?3:R.miss<=m2?2:1);
    const best=src?src.done(stars,R):jSet(s.id,stars,"闖關");   /* 星槎小關要知道有沒有用過提示（R.hint） */if(R.p3!==undefined)store.set("park3d",R.p3);R.done=true;save();
    const hid=!src&&stars===3?jHidRoll(s.id):null,needV=!!(hid&&!hid.got);   /* 拿到三星：30% 機率出現隱藏關卡（出現過就一直留著，直到過關） */
    const Ls=src?[]:s.book===2?jStages2():jStages(),more=!src&&s.n<Ls.length;v.className="view";
    v.innerHTML=`<div class="pad"><div class="card" style="text-align:center"><div style="font-size:44px">🎉</div><h2 style="margin:4px 0">過關！</h2>${src&&src.line?`<div style="font-size:20px;color:var(--accent);margin:6px 0">${esc(src.line(stars))}</div>`:(src?`<div style="font-size:30px;color:var(--accent)">${"★".repeat(stars)}${"☆".repeat(3-stars)}</div>`:`<div style="margin:8px 0 4px">${ziHTML(stars,false,true)}</div><p class="muted" style="margin:0">${jarLine()}</p>`)}
      <p class="muted">失誤 ${R.miss} 次${R.hint&&!(src&&src.hid)?(src?"・用了提示（最多 ★★）":"・用了提示（最多收到馬）"):R.hint?"・用了提示":""}${best>stars?`・這關最好成績 ${src?"★".repeat(best):ziStr(best)}`:""}</p>${G.outro?`<p style="line-height:1.8;text-align:left">${esc(G.outro)}</p>`:""}${G.reward?`<p class="muted" style="font-size:13px">🎁 ${esc(G.reward)}</p>`:""}${needV?`<div class="card" style="text-align:left;margin:10px 0 6px;line-height:1.75;font-size:14px">${HIDN.ic} <b>石桌底下壓著一張殘譜……</b>（${hid.k==="hard"?"困難：零失誤、不用提示棋，局面還會翻過來":"簡單：過關就好"}）<br>解開這個隱藏殘局，得一枚 ${HIDN.ic} 將令，可以拿去驛站的點將台換提示棋、悔棋符、預習卷。現在不想玩也沒關係，之後在這一關的說明裡還找得到。</div><button class="btn" id="lvV">${HIDN.ic} 進入${HIDN.lv}</button>`:""}
      ${more?`<button class="btn" id="lvNx">📖 讀第${CNUM(s.n+1)}回</button>`:""}${src&&src.next?`<button class="btn" id="lvCn">${esc(src.next[0])}</button>`:""}${src&&src.solo?"":`<button class="btn ghost" id="lvBk" style="margin-top:6px">${src?(src.backLabel||"回上一頁"):s.book===2?"回第二集":"回"+ROAD_NAME}</button><button class="btn ghost" id="lvAg" style="margin-top:6px">再挑戰一次</button>`}</div></div>`;   /* solo＝千秋穿梭突發事件：只有「繼續開往」，不能回頭、不能重打 */
    {const vb=v.querySelector("#lvV");if(vb)vb.onclick=()=>{jRunSet(null,RK);location.hash="#/journey/"+s.id+"~v"}}
    const nb=v.querySelector("#lvNx");if(nb)nb.onclick=()=>{if(s.book===2)store.set("legBook",2);goUp(SHELF(s.book===2?2:1),()=>s.book===2?legendRead2(s.n+1):legendRead(s.n+1))};   /* 意見回饋 607：退回冒險頁那一層再打開下一回（不往前推一頁） */
    {const cn=v.querySelector("#lvCn");if(cn)cn.onclick=src.next[1]}(v.querySelector("#lvBk")||{}).onclick=()=>goUp(src?src.back:BKP);/* 意見回饋 607：退回雲河棋路那一層 */(v.querySelector("#lvAg")||{}).onclick=()=>{jRunSet(null,RK);route()}}
  })}
/* 對局步驟在挑戰電腦畫面裡：盲棋（看不到棋子）、香條計時、「撐過幾步」到了就算過 */
function lvPlayOf(st){const P=store.get("jPending",null);return P&&st&&P.game===st.id&&P.lvp?P:null}
let LV_INC=null,LV_KEY=null;
function lvWatch(st,v){const P=lvPlayOf(st);
  if(!P||st.result){if(LV_INC){LV_INC.stop();LV_INC=null}LV_KEY=null;return}
  const L=P.lvp,me=st.human,n=st.moves.filter(m=>m.by===me).length;
  if(L.goal==="survive"&&L.limit&&n>=L.limit){const R=jRunGet(P.id);if(R){R.k++;R.ret=true;jRunSet(R)}store.set("jPending",null);if(LV_INC){LV_INC.stop();LV_INC=null}try{if(typeof rsFin==="function")rsFin(st.id)}catch(e){}   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：這盤沒有結果，記下來：不再問要不要接續、石桌往事開新盤也不問 */
    toast(`🎉 撐過 ${L.limit} 步了！回到關卡繼續`);setTimeout(()=>{if(navKey(location.hash)==="/journey/play")goUp("#/journey/"+P.id)},1600);return}   /* 意見回饋 607：退回關卡那一層（不往前推一頁）；這 1.6 秒裡已經離開對局頁就不動 */
  if(!L.timer)return;const mine=st.turn===me&&!st.thinking,key=st.id+":"+st.moves.length;
  if(!mine){if(LV_INC){LV_INC.stop();LV_INC=null}LV_KEY=null;return}
  if(LV_KEY===key&&LV_INC)return;if(LV_INC)LV_INC.stop();LV_KEY=key;
  const host=v.querySelector(".lvhost")||(()=>{const d=document.createElement("div");d.className="lvhost";const bb=v.querySelector("#bbox");bb.parentNode.insertBefore(d,bb);return d})();
  /* 回饋 838（開發者 11/9 選：全模式中斷接續）：這一步的香什麼時候點的記在 jPending.lvp.inc，關掉 App 再打開接著燒（不會重新整理就重燒滿）；燒完再點一炷新的 */
  const I=L.inc&&L.inc.k===key?L.inc:null;if(!I){L.inc={k:key,at:Date.now()};store.set("jPending",P)}
  LV_INC=lvIncense(host,L.timer,()=>{const R=jRunGet(P.id);if(R){R.miss++;jRunSet(R)}{const P2=store.get("jPending",null);if(P2&&P2.lvp&&P2.game===st.id){P2.lvp.inc={k:key,at:Date.now()};store.set("jPending",P2)}}toast("🪔 香燒完了，算一次失誤（可以繼續下）");LV_INC=null},I?I.at:0)}

/* ================= 🧠 主題訓練：題庫依戰術主題（tools/tag_tactics.js 用規則程式標的）連做 10 題 ================= */
const THEMES=[["將軍","走一步就將軍，逼對方先解"],["殺棋","幾步之內把對方將死"],["抽將","讓開一顆子露出將軍，順手吃子"],["捉雙","一步同時捉住兩顆大子"],["閃擊","移開一顆子，讓後面的子捉到大子"],["牽制","釘住對方的子，讓它不敢動"],["引離","送子把對方的守子引開"],["悶宮","將被自己的子堵死"]];
function weakTheme(){const TS=store.get("themeStat",{});const L=THEMES.map(([k])=>[k,TS[k]]);const un=L.find(([,x])=>!x||x.n<5);if(un)return un[0];return L.sort((a,b)=>a[1].ok/a[1].n-b[1].ok/b[1].n)[0][0]}
function Theme(v,tag){if(tag){const T=THEMES.find(x=>x[0]===tag);if(!T){navReplace("#/theme");return{}}
    /* ChatGPT 改善單 G01（開發者 11/11 核准）：#/theme/<棋理>/try＝主流程的「練一題同樣的棋理」示範（2 題、不記進度；jPuzzle 的 demo 模式），標題、返回由 jPuzzle 設 */
    if(/^#\/theme\/[^/]+\/try$/.test(location.hash)){setTabs(false);return jPuzzle(v,{id:"mfl-"+tag,t:"puz",name:"練一題・"+tag,lo:0,hi:99,tag,count:2,theme:true,demo:true})}
    setTop("🧠 主題訓練・"+tag,"#/theme");setTabs(false);return jPuzzle(v,{id:"tm-"+tag,t:"puz",name:"主題訓練・"+tag,lo:0,hi:99,tag,count:10,theme:true})}
  setTop("🧠 主題訓練","#/hub/learn");setTabs(true,"#/");v.className="view";v.innerHTML='<div class="pad muted">載入中…</div>';
  api("/quiz/data").then(D=>{const TS=store.get("themeStat",{}),cnt=k=>D.items.filter(q=>(q.tags||[]).includes(k)).length,w=weakTheme();
    v.innerHTML=`<div class="pad"><div class="card" style="line-height:1.8">挑一個戰術主題，連做 10 題。<span class="muted" style="font-size:13.5px">題目是題庫裡的基本題和大師名局，照戰術分類；答對 6 題過關。</span></div>
      <div class="sec-t">主題</div><div class="items" style="padding:0">${THEMES.map(([k,d])=>{const x=TS[k],n=cnt(k),pc=x&&x.n?Math.round(x.ok*100/x.n):null;return`<button class="item" data-t="${k}" ${n?"":"disabled"}><span class="lb">${k===w?"🎯":"🧠"}</span><span class="tx"><b>${k}${k===w?' <span class="pill" style="font-size:11px">最需要練</span>':""}</b><span>${esc(d)}・${n} 題${pc!=null?`・正確率 ${pc}%`:""}</span></span><span class="muted">›</span></button>`}).join("")}</div></div>`;
    v.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{vibrate(5);location.hash="#/theme/"+encodeURIComponent(b.dataset.t)});
    try{if(typeof lsnThemeAdd==="function")lsnThemeAdd(v)}catch(e){}   /* ChatGPT 改善單 I01、I02：清單最下面「小實驗」（07z7-lesson.js） */}).catch(e=>{v.innerHTML='<div class="pad"><div class="card muted">'+esc(e.message)+'</div></div>'});return{}}
/* ================= 🔰 新手訓練營 =================
   開發者決定（Gemini 象棋教學審閱）：每種棋子怎麼走、蹩馬腿、將軍、解將、雙車錯、馬後炮，一課走一步；局面都用規則程式驗過（將死的真的將死） */
const CAMP=[{"n":1,"name":"認識棋盤・帥","intro":"先認識棋盤，再學第一顆棋子「帥」怎麼走。","pass":"認識棋盤，走對帥這一步","star3":"沒有亂點、不用提示","rules":{"maxMistakes3":2,"maxMistakes2":5},"outro":"對！帥永遠出不了九宮。","steps":[{"t":"tapPt","say":"象棋的棋子都下在「線和線交叉的十字路口」上，不是放在方格裡。","ask":"點亮三個發光的交叉點","lit":["a0","e4","i9"],"wrong":"要點在亮起來的交叉點上喔","done":"對了！棋子就是下在這種交叉點上。"},{"t":"talk","say":"棋盤中間那條河叫「楚河漢界」。它來自兩千多年前楚漢相爭，項羽和劉邦隔著鴻溝分地盤（《史記・項羽本紀》）。河這邊是你的紅方，對面是對手。","start":{"fen":"rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR","turn":"r"},"choices":[{"label":"我知道了","ok":true,"reply":"你執紅棋，從下面往上攻。"}]},{"t":"tapPt","say":"棋盤最下面正中間，畫著「米」字斜線的那一塊叫九宮（直三點、橫三點，共九個點），是帥（將）和仕（士）的家，他們出不了九宮。","ask":"點亮紅方九宮的四個角","lit":["d0","f0","d2","f2"],"wrong":"九宮在棋盤最下面正中間，點那四個發光的角","done":"這就是紅方的九宮，帥的家。"},{"t":"place","baseFen":"9/9/9/9/9/9/9/9/9/9","pc":"K","sqs":["e0"],"say":"開局時，帥就站在九宮底線的正中間。","ask":"把帥放到發光的那個點（九宮底線正中間）","done":"帥擺好了！現在來看看它怎麼走。"},{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/9/9/9/9/9/9/4K4","turn":"r"},"line":["e0e1"],"ask":"把帥往前走一格。","soft":"帥也能往旁邊走一格，這步沒錯！這題請你往前走一格。","note":"對！帥永遠出不了九宮。"}]}]},{"n":2,"name":"仕","intro":"仕（士）只能斜走一格，也出不了九宮。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"仕是帥的貼身保鑣。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/9/9/9/9/9/9/3AK4","turn":"r"},"line":["d0e1"],"ask":"把仕斜走到九宮正中間。","note":"仕是帥的貼身保鑣。"}]},{"t":"place","baseFen":"9/9/9/9/9/9/9/9/9/4K4","pc":"A","sqs":["d0","f0"],"say":"仕就站在帥的兩邊，貼身守著帥。","ask":"把兩顆仕放到帥兩旁發光的點","done":"兩顆仕擺好了！"}]},{"n":3,"name":"相","intro":"相（象）走「田」字，一次斜走兩格，而且不能過河。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"相只在自己這半邊守家。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/9/9/9/9/9/9/2B1K4","turn":"r"},"line":["c0e2"],"alt":{"0":["c0a2"]},"ask":"把相飛到田字的另一角。","note":"相只在自己這半邊守家。"}]},{"t":"place","baseFen":"9/9/9/9/9/9/9/9/9/3AKA3","pc":"B","sqs":["c0","g0"],"say":"相站在仕的外側，守著自己這半邊。","ask":"把兩顆相放到發光的點","done":"兩顆相擺好了！"}]},{"n":4,"name":"傌","intro":"傌（馬）走「日」字：先直走一格，再斜走一格。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"馬八進七，最常見的出馬。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/9/9/9/9/9/9/1N2K4","turn":"r"},"line":["b0c2"],"alt":{"0":["b0a2","b0d1"]},"ask":"把傌跳出來。","note":"馬八進七，最常見的出馬。"}]},{"t":"place","baseFen":"9/9/9/9/9/9/9/9/9/2BAKAB2","pc":"N","sqs":["b0","h0"],"say":"傌站在相的外側。","ask":"把兩顆傌放到發光的點","done":"兩顆傌擺好了！"}]},{"n":5,"name":"蹩馬腿","intro":"傌往前跳的那一格被擋住，就跳不過去，這叫「蹩馬腿」。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"被擋住的方向不能跳，只能往沒擋住的地方跳。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/9/9/9/9/9/1C7/1N2K4","turn":"r"},"line":["b0d1"],"ask":"前面被炮擋住了，找出傌現在唯一能跳的那一步。","note":"被擋住的方向不能跳，只能往沒擋住的地方跳。"}]}]},{"n":6,"name":"俥","intro":"俥（車）走直線，橫豎都行，一次可以走很多格，前面沒擋就一直走。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"車是最厲害的子，「一車十子寒」。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/p8/9/9/9/9/9/R3K4","turn":"r"},"line":["a0a6"],"ask":"用俥吃掉對方的卒。","note":"車是最厲害的子，「一車十子寒」。"}]},{"t":"place","baseFen":"9/9/9/9/9/9/9/9/9/1NBAKABN1","pc":"R","sqs":["a0","i0"],"say":"俥站在最外側的兩個角，底線就排滿了。","ask":"把兩顆俥放到兩個角發光的點","done":"底線九顆排滿了！"}]},{"n":7,"name":"炮","intro":"炮平常走法跟車一樣，但要吃子時，中間一定要隔一顆子（叫「炮架」）。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"中間的兵就是炮架。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/n8/9/9/P8/9/9/C3K4","turn":"r"},"line":["a0a6"],"ask":"隔著自己的兵，用炮吃掉對方的馬。","note":"中間的兵就是炮架。"}]},{"t":"place","baseFen":"9/9/9/9/9/9/9/9/9/RNBAKABNR","pc":"C","sqs":["b2","h2"],"say":"兩顆炮站在傌的前面，中間隔著一條線。","ask":"把兩顆炮放到發光的點","done":"兩顆炮擺好了！"}]},{"n":8,"name":"兵","intro":"兵（卒）只能往前一格；過了河以後，也可以橫著走。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"過河的兵像小車，越靠近對方九宮越有用。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/9/4P4/9/9/9/9/4K4","turn":"r"},"line":["e5d5"],"ask":"這個兵已經過河了，把它往左橫走一格。","note":"過河的兵像小車，越靠近對方九宮越有用。"}]},{"t":"place","baseFen":"9/9/9/9/9/9/9/1C5C1/9/RNBAKABNR","pc":"P","sqs":["a3","c3","e3","g3","i3"],"say":"最前排是五顆兵，站在自己的河邊。","ask":"把五顆兵一顆一顆放到發光的點","done":"紅方十六顆全擺好了！對面的黑方也是一樣的鏡像擺法。","note":"紅方十六顆棋子，全部擺好了！對面的黑方也是一樣的鏡像擺法。"}]},{"n":9,"name":"將軍","intro":"走一步直接攻擊對方的將，叫「將軍」。被將軍的一方一定要先解。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"將軍！對方要躲開才行。","steps":[{"t":"puzzle","items":[{"start":{"fen":"4k4/9/9/9/9/9/9/9/9/R2K5","turn":"r"},"line":["a0a9"],"ask":"把俥沉到對方底線將軍。","note":"將軍！對方要躲開才行。"}]}]},{"n":10,"name":"解將","intro":"被將軍時要馬上解：躲開、擋住，或吃掉將你的子。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"吃掉將軍的子，是最乾脆的解法。","steps":[{"t":"puzzle","items":[{"start":{"fen":"3k5/9/9/9/R3r4/9/9/9/9/4K4","turn":"r"},"line":["a5e5"],"ask":"你的帥被車將軍了！用俥把那個車吃掉。","note":"吃掉將軍的子，是最乾脆的解法。"}]}]},{"n":11,"name":"雙車錯","intro":"兩個車一個封住一排、一個沉底將軍，將就沒地方躲，這叫「雙車錯」。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"將死了！上面那排被封住，將無路可走。","steps":[{"t":"puzzle","items":[{"start":{"fen":"4k4/R8/9/9/9/9/9/9/9/1R1K5","turn":"r"},"line":["b0b9"],"ask":"一步殺：用另一個俥沉底將死。","note":"將死了！上面那排被封住，將無路可走。"}]}]},{"n":12,"name":"馬後炮","intro":"馬守住將旁邊的格子，炮在馬後面將軍，這叫「馬後炮」。","pass":"走對這一步","star3":"一次就走對、不用提示","rules":{"maxMistakes3":0,"maxMistakes2":1},"outro":"馬後炮，將死了！","steps":[{"t":"puzzle","items":[{"start":{"fen":"4k4/9/4N4/9/9/9/9/9/9/C4K3","turn":"r"},"line":["a0e0"],"ask":"一步殺：把炮平到馬的正後方將死。","note":"馬後炮，將死了！"}]}]},{"n":13,"name":"結業對局","intro":"十二課都學會了！現在跟旅伴下一盤真正的棋。把對方將死，或守滿四十回合就結業。","pass":"將死對方，或守滿四十回合","star3":"一盤就過關、沒用悔棋","rules":{"maxMistakes3":0,"maxMistakes2":3},"outro":"恭喜你從新手訓練營結業！接下來可以去「挑戰電腦」真正下一盤，或搭星槎到各朝代闖關。","reward":"新手結業方印","steps":[{"t":"grad","fen":"2bakab1r/9/9/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR","ai":1,"drawMoves":40,"say":"旅伴讓了雙傌、雙炮和一隻俥，換你執紅先走。把對方將死，或守滿四十回合就過關。被將軍時棋盤會亮出能解圍的子，悔棋隨你用。"}]}];
const campStars=()=>store.get("campStars",{});
function Camp(v,n){setTabs(n?false:true,"#/");store.set("campSeen",true);const S=campStars();
  if(n){const G=CAMP[n-1];if(!G){navReplace("#/camp");return{}}
    return jLevel(v,{id:"camp"+n,n,name:`第 ${n} 課・${G.name}`,lvName:G.name},{G,rk:"jRunC",title:"🔰 新手訓練營",back:"#/camp",backLabel:"🔰 回新手訓練營",icon:"🔰",   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：新手訓練營用自己的 jRunC，不再洗掉石桌往事玩到一半的關卡（jRun） */
      done:st=>{const A=campStars(),b=Math.max(st,A[n]||0);if(!A[n])addXP(10,"新手訓練營","camp:"+n);A[n]=b;store.set("campStars",A);return b},
      next:n<CAMP.length?["下一課：「"+CAMP[n].name+"」 ›",()=>{jRunSet(null,"jRunC");location.hash="#/camp/"+(n+1)}]:null})}
  setTop("🔰 新手訓練營","#/hub/learn");v.className="view";const got=CAMP.filter(c=>S[c.n]).length;
  v.innerHTML=`<div class="pad"><div class="card" style="line-height:1.8"><b>第一次下象棋？從這裡開始。</b><br><span class="muted" style="font-size:13.5px">每一課${BOTN()}說一句話，你親手走一步：先認識棋盤、把每顆棋子擺上去，學每種棋子怎麼走，再學將軍、解將、基本殺法，最後跟旅伴下一盤結業。全部 ${CAMP.length} 課、大約 8 分鐘。</span></div>
    <div class="sec-t">課程（${got}／${CAMP.length}）</div><div class="items" style="padding:0">${CAMP.map(c=>{const k=S[c.n]||0,open=c.n===1||S[c.n-1];return`<button class="item" data-c="${c.n}" ${open?"":"disabled"}><span class="lb">${open?(k?"✅":"🔰"):"🔒"}</span><span class="tx"><b>第 ${c.n} 課・${esc(c.name)}</b><span>${k?"★".repeat(k)+"☆".repeat(3-k):open?esc(c.intro.slice(0,28))+"…":"先上完前一課"}</span></span><span class="muted">›</span></button>`}).join("")}</div>
    ${got>=CAMP.length?'<div class="card" style="margin-top:10px;text-align:center">🎉 恭喜從新手訓練營結業！去「挑戰電腦」或搭星槎到各朝代闖關吧。<br><button class="btn" id="cGo" style="margin-top:8px">去挑戰電腦 ›</button></div>':""}</div>`;
  v.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{vibrate(5);jRunSet(null,"jRunC");location.hash="#/camp/"+b.dataset.c});   /* 回饋 838（開發者 11/9 選：全模式中斷接續） */
  {const g=v.querySelector("#cGo");if(g)g.onclick=()=>{store.set("cpuLevel",1);location.hash="#/cpu"}}return{}}
