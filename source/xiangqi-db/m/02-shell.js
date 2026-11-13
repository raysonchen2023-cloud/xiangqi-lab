// ================= 版面骨架與路由 =================
let screen=null;   // 目前畫面：{stop()}
addEventListener("hashchange",()=>{try{const s1=history.state;if(s1&&typeof s1.d==="number"){NAV_D=s1.d;NAV_POP=true;navMark(NAV_D,!!s1.xqSheet,false);return}const d=NAV_REPL?NAV_D:NAV_D+1;NAV_REPL=false;history.replaceState({d},"");NAV_D=d;NAV_POP=false;navMark(d,false,true)}catch(e){}});   /* 意見回饋 607：每一層登記網址（NAV_H），退回來的頁面記 NAV_POP */
function navReplace(h){if(navKey(h)===navKey(location.hash))return;NAV_REPL=true;location.replace(h)}
function goBack(fb){if(NAV_D>0){history.back();return}if(fb&&fb!==true)navReplace(fb)}
const navKey=h=>(h||"").replace(/^#/,"")||"/";
/* 意見回饋 393：App 的圖示換成 Gemini 畫的古風圖示，跟著目前朝代換風格（data/icons/<朝代>/<名稱>.webp，tools/icons_slice.py 切的）；
   首頁功能、底部分頁、冒險入口用「要去哪一頁」對應，右上角按鈕用原本的 emoji 對應；圖還沒到或缺圖時維持原本的 emoji */
const ICO_GO={"#/cpu":"cpu","#/lobby":"online","#/stats":"stats","#/openings":"openings","#/redo":"redo","#/quiz":"quiz","#/guess":"guess","#/db":"db","#/terms":"rules","#/adventure":"adventure","#/":"home","#/settings":"settings","#/journey":"journey","#/journey/inn":"inn","#/journey/park":"park"},
  ICO_EMO={"📤":"share","👥":"friends","🏠":"home","🏯":"arena","⚙️":"settings","⚙":"settings","💬":"feedback","🌳":"park","🏮":"inn","🌐":"online","💡":"f_idea","🗺":"journey","🪨":"adventure"};   /* 552：補上沒有 FE0F 的「⚙」（新局設定一直對不到）和頂欄常用的幾個 */
const icoSrc=n=>`data/icons/${store.get("era","classic")}/${n}.webp`;
function icoImg(el,n){const em=el.textContent;const im=document.createElement("img");im.className="eic";im.alt="";im.dataset.ico=n;im.onerror=()=>{const c=+(im.dataset.c||0),A=["classic","ming","qin","tang","yuan"];if(c<A.length){im.dataset.c=c+1;im.src="data/icons/"+A[c]+"/"+n+".webp";return}const sp=document.createElement("span");sp.className="noico";sp.textContent=em;im.replaceWith(sp)};im.src=icoSrc(n);el.textContent="";el.append(im)}   /* 552：這個朝代缺圖就先用經典那套 */
/* 意見回饋 433、435、466：首頁三張大卡、設定的分頁、棋童資料的圓鈕也換成朝代圖示（第二張總表，tools/gen_round2.py --icons2） */
const ICO_HUB={"#/cpu":"cpu","#/db":"db","#/hub/battle":"h_battle","#/adventure":"h_adventure","#/hub/learn":"h_learn"};
const ETIMG=(n,old,emo)=>`<img class="ti eic" data-ico="${n}" src="${icoSrc(n)}" alt="" onerror="if(!this.dataset.c&&!/\/classic\//.test(this.src)){this.dataset.c=1;this.src='data/icons/classic/${n}.webp'}else if(this.dataset.f||!'${old||""}'){this.replaceWith(document.createTextNode('${emo}'))}else{this.dataset.f=1;this.classList.remove('eic');this.src='${old||""}'}">`;
function iconize(){document.querySelectorAll("[data-go] > .ic,[data-go] > .dic").forEach(x=>{if(x.querySelector("img"))return;const n=ICO_GO[x.parentElement.dataset.go];if(n)icoImg(x,n)});
  document.querySelectorAll(".hubc > .hi").forEach(x=>{if(x.querySelector("img"))return;const n=ICO_HUB[x.parentElement.dataset.go];if(n)icoImg(x,n)});
  document.querySelectorAll("#sgTabs .tic").forEach(x=>{if(x.querySelector("img"))return;icoImg(x,x.dataset.ic)});
  document.querySelectorAll("#topRight .ib").forEach(b=>{if(b.querySelector("img"))return;const n=ICO_EMO[b.textContent.trim()]||ICO_EMO[b.textContent.trim().replace(/️/g,"")];if(n)icoImg(b,n)});try{emoWalk(document.body)}catch(e){}}
function icoEra(){document.querySelectorAll("img.eic").forEach(im=>{im.src=icoSrc(im.dataset.ico)})}
{let icoT=0;new MutationObserver(()=>{if(icoT)return;icoT=requestAnimationFrame(()=>{icoT=0;try{iconize()}catch(e){}})}).observe(document.body,{childList:true,subtree:true})}
/* 意見回饋 540（開發者）：標題、彈出視窗標題開頭的 emoji，有當朝代手繪圖示的就換成圖示（data/icons/<朝代>/） */
const EMO_ICO={"🙂":"t_bot","🎒":"t_bot","🤝":"p_secret","🗝":"p_secret","🎁":"p_board","📜":"p_kifu","📖":"p_story","🏮":"inn","🌳":"park","🏯":"arena","💬":"feedback","📤":"share","🔁":"redo","⚙":"settings",
  "⚔":"h_battle","📚":"h_learn","👥":"friends","👋":"o_name","🎎":"t_bot","🛠":"o_fixes","🗺":"journey","🏅":"s_rank","🏛":"s_rank","🤖":"cpu","🏞":"park","🎯":"quiz","🪨":"adventure","📈":"s_growth","📊":"stats","🔥":"h_battle","🎓":"guess","🚶":"journey","💡":"f_idea","🍵":"inn"};   /* 552：標題開頭常用的 emoji 也換成朝代圖示 */

/* 意見回饋 552（開發者：盤查所有 emoji，有朝代圖示的都換）：畫面上的文字（按鈕、清單、標題、提示、彈出視窗……）裡只要出現下面這些 emoji，就換成當朝代的手繪圖示。
   ✔ ⚠ ▶ ⭐ 這類介面符號、狀態的彩色圓點、對話裡的表情（😅🤔）保留文字。輸入框、下拉選單、棋盤（SVG）不動 */
const EMO_ALL=Object.assign({},EMO_ICO,{"🏆":"e_trophy","🎉":"e_cheer","🔒":"e_lock","🎤":"e_mic","📱":"e_phone","📲":"e_phone","⏱":"e_timer","🪔":"e_timer","⏳":"e_hourglass","⏭":"e_next","🔍":"e_search","🔎":"e_search",
  "🎴":"e_level","🏃":"e_run","👤":"e_person","🗿":"e_person","🏺":"e_relic","👀":"e_watch","📺":"e_watch","👁":"e_watch","🔰":"e_camp","♟":"e_piece","🀄":"e_piece","🧠":"e_mind","🤔":"e_mind","📅":"e_calendar","👍":"e_good","🕰":"e_clock",
  "🎲":"e_dice","📍":"e_pin","🚩":"e_pin","🧩":"e_puzzle","📋":"e_list","🧪":"e_test","🧬":"e_test","🏳":"e_flag","💰":"e_coin","✨":"e_spark","🥁":"e_drum","🎵":"e_music","🛡":"e_shield","💎":"e_gem","🔭":"e_scope","🗑":"e_trash","💾":"e_save","🔇":"e_mute","🔗":"e_link",
  "🏠":"home","📷":"f_shot","🐞":"f_bug","📁":"f_file","🔊":"t_sound","🎚":"t_sound","🎨":"t_look","🎮":"t_play","🧸":"t_bot","🔄":"redo","✍":"feedback","🖥":"cpu","🌐":"online","🪶":"feedback","💥":"e_spark","📌":"e_pin","🏁":"e_pin","🔧":"o_fixes","🗡":"h_battle","🎂":"e_cheer","🌸":"park","🍃":"park","🧥":"t_look","📭":"feedback","🗣":"e_mic","👂":"t_sound"});
const EMO_RE=new RegExp("("+Object.keys(EMO_ALL).sort((a,b)=>b.length-a.length).join("|")+")\\uFE0F?","gu");
function emoWalk(root){if(!root)return;const skip="textarea,input,select,option,script,style,svg,canvas,[contenteditable],.noico,#topRight,#tabbar,#sgTabs,.hubc";
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){EMO_RE.lastIndex=0;if(!EMO_RE.test(n.nodeValue))return 2;const p=n.parentElement;return!p||p.closest(skip)?2:1}}),L=[];
  while(tw.nextNode())L.push(tw.currentNode);
  for(const n of L){const t=n.nodeValue,fr=document.createDocumentFragment();let i=0,m;EMO_RE.lastIndex=0;
    while((m=EMO_RE.exec(t))){if(m.index>i)fr.append(t.slice(i,m.index));const k=EMO_ALL[m[1]],im=document.createElement("img");im.className="eic emi";im.alt=m[0];im.dataset.ico=k;
      im.onerror=()=>{const n=+(im.dataset.c||0),A=["classic","ming","qin","tang","yuan"];if(n<A.length){im.dataset.c=n+1;im.src="data/icons/"+A[n]+"/"+k+".webp";return}const sp=document.createElement("span");sp.className="noico";sp.textContent=im.alt;im.replaceWith(sp)};   /* 意見回饋 664：當朝代沒畫這個圖示就依序借別朝的；都沒有才放回文字，包在 .noico 裡不再重換（之前換回文字又被換成圖、再失敗，一直閃問號） */im.src=icoSrc(k);fr.append(im);i=m.index+m[0].length}
    if(i<t.length)fr.append(t.slice(i));if(n.parentNode)n.parentNode.replaceChild(fr,n)}}
function icoTitle(t){const m=String(t).match(/^(\S+)\s+([\s\S]*)$/),k=m&&EMO_ICO[m[1].replace(/\uFE0F/g,"")];return k?ETIMG(k,"",m[1])+" "+esc(m[2]):esc(t)}
/* 11/11 模擬玩家問題 3（返回鍵去錯地方／標籤過期）：根因＝setTop 只換返回鍵的 onclick、不換字，別支程式寫上去的「走回雅間」「回首頁」一路留到下一頁（唐站、題目頁、星槎、分析頁）；
   字和去處又各算各的（字寫死，按下去卻是瀏覽器上一頁）。改成每次 setTop 都照「按下去真的會到哪一頁」（bkTo）重寫字（bkName），去處記在 #back 的 data-to（07w9 圖上出口也照它對字）；
   從結果視窗「📊 檢討」去的分析頁（REVIEW_BACK）直接沿用那盤棋的出口（字＋去處），一次就到，不先退回已經下完的那盤 */
function bkTo(back){if(typeof back==="string"&&back[0]==="^")return back.slice(1);
  if(NAV_D>0){for(let i=NAV_D-1;i>=0;i--){const x=NAV_H[i];if(typeof x!=="string")return"";if(x[0]!=="~")return x}return""}   /* goBack＝瀏覽器上一頁：卡片那一層會被 popstate 再退一格，所以找最近一筆不是卡片的 */
  return typeof back==="string"?back:""}
const BK_NAME=[["/cpuroom","雅間"],["/adventure","星槎"],["/ship/pz","千秋殘局"],["/ship","星槎"],["/port","渡口"],["/theme","主題訓練"],["/camp","訓練營"],["/cup","千秋盃"],["/simul","車輪戰"],["/lesson","棋理體驗"],["/lab","小實驗"],["/today","今日推薦"],["/codex","百科"],["/weekly","週報"],["/feedback","信房"],["/db","棋譜庫"]];
function bkName(h){if(!h)return"";const k=navKey(h).split("?")[0];if(k==="/")return"首頁";
  if(k==="/hub/learn"||k==="/hub/battle"){let n="";try{n=typeof xqHubName==="function"?xqHubName(k.slice(5)).split(" ").slice(1).join(" "):""}catch(e){}return n&&!/^(學習|對戰)$/.test(n)?n:k==="/hub/learn"?"書院":"茶樓"}   /* 書院照停靠朝代／經典世界的叫法（國子監、藏譜石窟、觀星閣…） */
  for(const[p,n]of BK_NAME)if(k===p||k.startsWith(p+"/"))return n;
  let n="";try{n=typeof usePlace==="function"?usePlace("#"+k):""}catch(e){}return n&&n.length<=6&&/[^\x00-\x7f]/.test(n)?n:""}
function bkSet(B,back,bp){const h=location.hash||"#/",R=REVIEW_BACK;let to=bkTo(back);
  if(R&&R.id!=null&&navKey(h)===navKey("#/db/play/"+encodeURIComponent(R.id))){
    if(!R.ex&&bp.h&&bp.to&&navKey(bp.h)===navKey(R.h)&&navKey(bp.to)!==navKey(R.h))R.ex={to:bp.to,tx:bp.tx};   /* 剛從那盤棋過來：記下那盤的出口 */
    if(R.ex){to=R.ex.to;const nm=bkName(to),t0=String(R.ex.tx||"").replace("‹","").trim(),tx=nm&&t0.indexOf(nm)>=0?t0:nm?"回"+nm:"返回";
      B.innerHTML="<b>‹</b>"+esc(tx);B.hidden=false;B.dataset.h=h;B.dataset.to=to;B.onclick=()=>{if(navKey(to)==="/")goHome();else goUp(to)};return}}
  const nm=bkName(to);B.innerHTML="<b>‹</b>"+(nm?"回"+esc(nm):"返回");B.dataset.h=h;B.dataset.to=to}
function setTop(title,back,right){{const mc=document.getElementById("meChip");if(mc)mc.remove()}$("#title").innerHTML=icoTitle(title);const B=$("#back"),bp={h:B.dataset.h||"",to:B.dataset.to||"",tx:B.textContent||""};B.hidden=!back;B.onclick=()=>typeof back==="string"&&back[0]==="^"?upTo(back.slice(1)):goBack(back);   /* 意見回饋 697：back 開頭是 "^"＝回那一層（upTo／goUp），不照瀏覽器上一頁 */
  try{bkSet(B,back,bp)}catch(e){}   /* 11/11 模擬玩家問題 3：每次都重寫返回鍵的字（照真的去處），分析頁沿用那盤棋的出口 */
  const tr=$("#topRight");tr.innerHTML="";if(right)for(const[icon,fn,label]of right){const b=document.createElement("button");b.className="ib";b.textContent=icon;b.title=label||"";if(label)b.setAttribute("aria-label",label);b.onclick=fn;tr.append(b)}
  // 全螢幕畫面（沒有底部導覽列）一律加「回首頁」，加入主畫面的 App 模式沒有瀏覽器上一頁也能回去
  /* 開發者 11/11 選 ChatGPT UI 報告 UI-10：手機上下棋時頂欄太擠（返回、模式、好幾個純圖示，頁名被擠成「朝…」）。
     對局頁（挑戰電腦、擂台、同桌、雲河棋路、錯棋重練）寬度不到 520 時，右邊兩個以上的圖示收進一顆「⋯」，點了列出每一項的圖示＋名稱；地圖鈕照舊 */
  try{if(right&&right.length>=2&&innerWidth<520&&/^#\/(cpu|arena|pvp|journey\/play|redo\/play)(\/|$)/.test(location.hash||""))topMore(tr,right)}catch(e){}
  if(back&&back!=="#/"&&!(right&&right.length>=2)){const h=document.createElement("button");h.className="ib";h.textContent="🏠";h.title="回首頁";h.setAttribute("aria-label","回首頁");h.onclick=()=>goHome();tr.append(h)}}   /* 意見回饋 607：🏠 退回首頁，不往前推一頁 */
function topMore(tr,right){const bs=[...tr.querySelectorAll(".ib")];bs.forEach(b=>b.hidden=true);const m=document.createElement("button");m.className="ib";m.textContent="⋯";m.title="更多";m.setAttribute("aria-label","更多："+right.map(r=>r[2]||r[0]).join("、"));
  m.onclick=()=>{try{vibrate(5)}catch(e){}sheet("更多",b=>{b.innerHTML=`<div style="display:grid;gap:8px">${right.map((r,i)=>`<button class="btn" data-i="${i}" style="display:flex;align-items:center;gap:10px;justify-content:flex-start;min-height:48px;margin:0"><span style="font-size:20px;min-width:28px;text-align:center">${esc(r[0])}</span><span>${esc(r[2]||"")}</span></button>`).join("")}</div>`;
    b.querySelectorAll("[data-i]").forEach(x=>x.onclick=()=>{closeSheet();const f=right[+x.dataset.i][1];if(typeof f==="function")setTimeout(f,0)})})};tr.append(m)}
function setTabs(show,on){$("#tabbar").hidden=!show;for(const b of $("#tabbar").children)b.classList.toggle("on",b.dataset.go===on)}
for(const b of $("#tabbar").children)b.onclick=()=>{vibrate(5);if(b.dataset.go==="#/")goHome();else location.hash=b.dataset.go};   /* 意見回饋 607：底部「首頁」也是退回首頁 */
function route(){
  try{if(typeof fmRouteGate==="function"&&fmRouteGate())return}catch(e){}   /* 回饋 843（開發者 11/9 選：護眼提醒＋家長時段）：家長設的時間到了，除了首頁、設定、週報、意見回饋都回首頁（m/07m5-family.js） */
  try{if(typeof fcmBootGo==="function"&&fcmBootGo())return}catch(e){}   /* 評比循環第 12 輪 X10 中斷恢復：這個分頁第一次打開、網址是首頁、6 小時內在對局／解題中被打斷（切背景、關分頁）＝直接回那一盤（m/07fm-focus.js） */
  /* 意見回饋 607：換頁時把上一頁的視窗（結果視窗等）一起關掉；ROUTE_N 讓殺棋動畫後才要出來的視窗知道畫面換了 */
  ROUTE_N++;document.querySelectorAll(".modal:not(.keep)").forEach(m=>m.remove());
  try{storyEraSync()}catch(e){}   /* 意見回饋 610：故事線自動換朝代 */
  closeSheet();if(screen&&screen.stop)screen.stop();screen=null;PARK_OFF=false;PARK_J=null;PARK_LK=false;
  const v=$("#view");v.className="view";v.innerHTML="";v.scrollTop=0;
  if(window.XQ&&XQ.parseConnect&&location.hash.startsWith("#connect=")){XQ.parseConnect();route();if(!myName())setTimeout(()=>nameSheet(true),500);return}   // 離線版：掃 QR code 帶來的連線資訊
  const h=location.hash.replace(/^#/,"")||"/",p=h.split("/").filter(Boolean).map(decodeURIComponent);
  if(OFF&&window.XQNet&&XQNet.finished()&&p[0]!=="pvp")XQNet.leave();
  if(REVIEW_BACK&&p[0]!=="db"&&navKey(location.hash)!==navKey(REVIEW_BACK.h))REVIEW_BACK=null;   /* 意見回饋 607：看完報告沒有回到那盤棋，就不再留著「回來不要開新局」的記號 */
  if(OFF&&typeof preGate==="function"&&preGate(p))return;   /* 回饋 845（開發者 11/9 選：折衷先載）：這頁要的圖還沒下載到，先蓋水墨等待畫面、優先下載，好了再進（09b-preload.js） */
  if(!p.length)return screen=Home(v);
  if(p[0]==="hub"&&(p[1]==="battle"||p[1]==="learn"))return screen=Home(v,p[1]);
  if(p[0]==="camp")return screen=Camp(v,p[1]?+p[1]:0);
  if(p[0]==="theme")return screen=Theme(v,p[1]?decodeURIComponent(p[1]):"");
  if(p[0]==="play"){navReplace("#/");return}   // 舊的「對弈」頁已經併進首頁
  if(p[0]==="cpu")return screen=CpuGame(v,false,"cpu");
  if(p[0]==="arena")return screen=CpuGame(v,false,"arena");   /* 意見回饋 413：朝代擂台自己一個網址 */
  if(p[0]==="join"&&/^[rb]$/.test(p[1]||"")){store.set("pvpSeat",p[1]);if(OFF)XQ.setPvpOnline(true);navReplace("#/pvp");return}
  /* 回饋 840（開發者 11/9「重新開放」同機對戰）：同一支手機兩人輪流下開放給所有人（入口＝對戰頁茶樓左邊房間下面那張放棋盒的桌子「👥 同桌對弈」）；
     電腦連線、選邊（seatSheet）仍只在開發者模式 */
  if(p[0]==="pvp")return screen=PvpGame(v);
  if(p[0]==="ouyu"&&typeof OuyuPage==="function")return screen=OuyuPage(v,p.slice(1));   /* 開發者 11/10：偶遇求助角色的解題頁 #/ouyu/<誰>/<題號>（m/07w5-ouyu.js） */
  if(p[0]==="coop"&&typeof CoopPage==="function")return screen=CoopPage(v,p.slice(1));   /* 開發者 11/9：合作殘譜（同桌 #/coop、殘篇閣 #/coop/lobby；m/07q2-coop.js） */
  if(p[0]==="lobby")return screen=Lobby(v);
  if(p[0]==="cpuroom"&&typeof CpuRoom==="function")return screen=CpuRoom(v);   /* 11/10 開發者：挑戰電腦的雅間（07z5-cpuroom.js） */
  if(p[0]==="simul"&&typeof SimulPage==="function")return screen=SimulPage(v);   /* 開發者 11/11 hspx：車輪戰（m/08s-simul.js） */
  if(p[0]==="lesson"&&typeof LsnPage==="function")return screen=LsnPage(v,p[1]||"");   /* ChatGPT 改善單 I01（開發者 11/11）：棋理體驗 #/lesson/<站>（m/07z7-lesson.js） */
  if(p[0]==="lab"&&p[1]==="grab"&&typeof GrbLab==="function")return screen=GrbLab(v);   /* ChatGPT 改善單 I02：先吃子還是先解圍小實驗（m/07z8-grablab.js） */
  if(p[0]==="cup")return screen=CupPage(v);   /* 意見回饋 635：千秋盃 */
  if(p[0]==="watch"){if(p[1]==="ai")return screen=Watch(v);navReplace("#/lobby");return}   /* 意見回饋 290：觀戰併進線上大廳 */
  if(p[0]==="stats")return screen=Stats(v);
  if(p[0]==="weekly")return screen=Weekly(v);   /* 開發者 11/8 核准：家長學習週報（m/04c-weekly.js） */
  if(p[0]==="codex"&&typeof Codex==="function"){store.set("dbReturn",null);return screen=Codex(v)}   /* Gemini 評估 11/8（開發者核准）：千秋大百科（m/07i-codex.js） */
  if(p[0]==="redo"&&p[1]==="play")return screen=CpuGame(v,true);
  if(p[0]==="redo")return screen=Redo(v);
  if(p[0]==="openings")return screen=Openings(v);
  if(p[0]==="garage"){navReplace("#/");return}   /* 開發者 11/11：車庫整個拿掉，舊連結回首頁 */
  if(p[0]==="settings")return screen=Settings(v);
  if(p[0]==="fbadmin")return screen=FbAdmin(v);
  if(p[0]==="quiz")return screen=Quiz(v);
  if(p[0]==="guess")return screen=Guess(v);
  if(/^pos(\?|$)/.test(p[0]||"")&&typeof PosRestore==="function")return screen=PosRestore(v,p[0]==="pos"?p[1]||"":"");   /* 11/11 ChatGPT 介面報告 P2：分享網址 #/pos?fen=…（m/10d-coach.js posRQuery） */   /* 評比第 4 輪：局面還原 #/pos（FEN、擺子）、#/pos/play 從局面和電腦下（m/10d-coach.js） */
  if(p[0]==="hw"&&typeof Homework==="function")return screen=Homework(v,p[1]||"",p[2]);   /* 評比第 3 輪 P17 教練作業：#/hw 出作業、#/hw/<編碼> 作業清單與成績、#/hw/<編碼>/<第幾題>（m/10d-coach.js） */
  if(p[0]==="daily"&&typeof DailyPage==="function"){try{return screen=DailyPage(v,p[1]||"",p[2]||"")}catch(e){if(e instanceof ReferenceError&&!route.tdz){route.tdz=1;setTimeout(()=>{route.tdz=0;route()},0);return}throw e}}   /* 11/13 第 15 輪證據包抓到：冷開分享連結 #/daily/<日期> 時，11-watch.js 檔尾第一次 route() 比 07dq 的 const DQ 早跑（還沒初始化就丟 ReferenceError，整個 App 停在載入失敗）；遇到就等整支程式跑完再排一次 */   /* 評比第 13 輪 F1 每日同題：#/daily 今天、#/daily/<日期>、#/daily/<日期>/play（m/07dq-daily.js） */
  if(p[0]==="canju")return screen=p[1]?CanjuPlay(v,decodeURIComponent(p.slice(1).join("/"))):CanjuDaily(v);   /* 一盞茶殘局：今日茶單／解題 */
  if(p[0]==="xiaohan"&&typeof XiaohanPage==="function")return screen=XiaohanPage(v);   /* 意見回饋 658（D）：九九消寒圖（07e-garden2.js） */
  if(p[0]==="legend")return screen=LegendScene(v,decodeURIComponent(p[1]||""));
  if(p[0]==="journey"&&p[1]==="play")return screen=CpuGame(v,false,"journey");   /* 意見回饋 413：石桌往事（雲河棋路、驛站、園子、守關）的對局頁 */
  if(p[0]==="journey")return screen=Journey(v,p[1]?decodeURIComponent(p[1]):null);
  if(p[0]==="port"&&typeof Port==="function"){store.set("dbReturn",null);return screen=Port(v)}   /* 意見回饋 697（開發者 11/6 定案方案 B）：渡口＝每一朝的中心（07f-ship.js） */
  if(p[0]==="adventure"){store.set("dbReturn",null);return screen=typeof Voyage==="function"?Voyage(v):Adventure(v)}   /* 意見回饋 674：#/adventure 改成雲河星槎頁（07f-ship.js），舊網址照樣能用 */
  if(p[0]==="battle"&&typeof Battlefield==="function"){store.set("dbReturn",null);return screen=p[1]&&typeof BattleGo==="function"?BattleGo(v,p[1],p[2]):Battlefield(v)}   /* 意見回饋 725：古戰場・戰役題卡＋戰役地圖（07g-battle.js）；#/battle/<朝代>/<第幾張>＝守城、讓子的入口 */
  if(p[0]==="qqev"&&typeof QqEv==="function"){store.set("dbReturn",null);return screen=QqEv(v)}   /* 千秋穿梭突發事件的棋盤頁（07h-qqev.js） */
  if(p[0]==="ship"&&p[1]==="lv"&&typeof ShipLv==="function"){store.set("dbReturn",null);return screen=ShipLv(v,p[2]||"",p[3]||"",p[4]==="read")}   /* 星槎小關（關卡設計_第5-14章 元件 A）：#/ship/lv/<站>/<題號>[/read] */
  if(p[0]==="ship"&&p[1]==="pz"&&typeof ShipPz==="function"){store.set("dbReturn",null);return screen=ShipPz(v)}   /* 意見回饋 709：千秋殘局獨立一頁 */
  if(p[0]==="ship"&&typeof SHIP_PG!=="undefined"&&Object.prototype.hasOwnProperty.call(SHIP_PG,p[1])){store.set("dbReturn",null);return screen=SHIP_PG[p[1]](v)}   /* 意見回饋 709：這站棋理、書架、行囊、起航各一頁（07f-ship.js） */
  if(p[0]==="ship"&&p[1]==="read"&&typeof ShipRead==="function"){store.set("dbReturn",null);return screen=ShipRead(v,p[2]||"",p[3]||"")}   /* 意見回饋 685：《雲河七星》正文（07f-ship.js）：#/ship/read＝書架合集、#/ship/read/<站>[/mark|/after] */
  if(p[0]==="shelf"){store.set("dbReturn",null);const b=p[1]==="2"&&(book1Done()||DEVMODE())?2:1;if(p[1]!==String(b)){navReplace("#/shelf/"+b);return}store.set("legBook",b);return screen=p[2]&&typeof BookChapter==="function"?BookChapter(v,b,p[2],p[3]||""):Adventure(v)}   /* 意見回饋 735 第二期：#/shelf/<集>/<回>[/game]＝一回一頁 */   /* 意見回饋 674：星槎書架上的兩本書；第二集照舊要第一集 36 關都過 */
  if(p[0]==="profile"||p[0]==="me"){screen=Me(v);if(p[1]==="relics"&&typeof relicBook==="function"){const h=location.hash;setTimeout(()=>{if(location.hash===h)relicBook()},120)}return screen}   /* 意見回饋 536：棋童資料併進「我的角色」；644：#/me/relics 直接打開珍品冊（藏局解完、問小帥都帶到這裡） */
  if(p[0]==="terms")return screen=Terms(v,p[1]);
  // AI 對局在開發者的電腦上，要連上電腦才看得到；一般玩家（或連線已被清掉）從舊連結進來時說明清楚，不要卡在「載入中」（意見回饋 135）
  if((p[0]==="db"&&p[1]==="ai"||p[0]==="watch"&&p[1]==="ai")&&OFF&&!DEVREMOTE()){setTop("AI 對局","#/");setTabs(false);
    v.innerHTML='<div class="home"><div class="card" style="text-align:center;line-height:1.8"><div style="font-size:40px">📺</div><b>AI 對局只在開發者的電腦上</b><br><span class="muted">這部分要連上開發者的電腦才看得到，一般玩家不需要。其他棋譜都在「📚 棋譜」裡。</span><div class="row" style="gap:8px;margin-top:12px;justify-content:center"><button class="btn" id="g1">📚 去棋譜</button><button class="btn ghost" id="g2">回首頁</button></div></div></div>';
    (v.querySelector("#g1")||{}).onclick=()=>location.hash="#/db";(v.querySelector("#g2")||{}).onclick=()=>location.hash="#/";return screen={}}
  if(p[0]==="db"&&p.length>=3)return screen=Viewer(v,p[1],p.slice(2).join("/"));
  if(p[0]==="db")return screen=Library(v,p[1]);
  screen=Home(v)}
window.addEventListener("hashchange",route);
// 線上版（手機用電腦給的網址打開）：第一次進來請取名字
if(!window.XQ_OFFLINE&&!/^(localhost|127\.|\[::1\])/.test(location.hostname)&&!myName()&&store.get("onboard1",false))setTimeout(()=>nameSheet(true),800);   /* 意見回饋 491：還沒選角色的人，名字在選角色畫面一起取 */
if(window.XQ_OFFLINE&&!myName()&&!store.get("nameAsked",false)&&store.get("onboard1",false))setTimeout(()=>{if(myName()||document.querySelector("#sheet"))return;store.set("nameAsked",true);nameSheet(true)},1500);
function poller(fn,ms){let on=true,t=null;const tick=async()=>{if(!on)return;try{await fn()}catch(e){}if(on)t=setTimeout(tick,typeof ms==="function"?ms():ms)};tick();return()=>{on=false;clearTimeout(t)}}

// ================= 離線版專用：連線、引擎下載 =================
async function appVer(){try{const k=(await caches.keys()).filter(x=>x.startsWith("xqlab-app-")).pop();return k?k.slice(10):null}catch(e){return null}}
async function netVer(){try{const t=await(await fetch("sw.js",{cache:"no-store"})).text();return(t.match(/VERSION="([\w-]+)"/)||[])[1]||null}catch(e){return null}}
const OFF=!!window.XQ_OFFLINE;
// 獎勵模式（贏棋換車）：意見回饋 144 關掉，開發者 11/11「刪除我的車庫」整個拿掉
try{store.del?store.del("cpuCar"):localStorage.removeItem("xq_cpuCar")}catch(e){}
// iPhone 從主畫面打開（全螢幕）時，頂部列要讓開狀態列（時間、電池）。
// 有些 iOS 版本讀不到安全區（算成 0），標題就會跑到狀態列底下、被模糊效果蓋住；這時依螢幕高度補上狀態列高度。
(function fixTop(){try{const sa=matchMedia("(display-mode: standalone)").matches||navigator.standalone;if(!sa)return;
  const pr=document.createElement("div");pr.style.cssText="position:fixed;top:0;height:env(safe-area-inset-top);visibility:hidden";document.body.append(pr);
  const got=pr.getBoundingClientRect().height;pr.remove();
  const full=Math.abs(innerHeight-window.screen.height)<2;   // 內容從螢幕最頂端開始（在狀態列底下）
  if(got<10&&full){const h=window.screen.height;document.documentElement.style.setProperty("--safeT",(h>=852?59:h>=812?47:20)+"px")}
  // 新版 iOS 的主畫面 App 有時把可用高度少算一個狀態列（底部露出一條空白）：把空白塗成分頁列的顏色，並拿掉分頁列底部原本留給橫條的空間
  const gap=()=>{const port=innerHeight>innerWidth,W=window.screen,sh=port?Math.max(W.width,W.height):Math.min(W.width,W.height),g=sh-innerHeight,R=document.documentElement;
    if(g>20&&g<110){R.classList.add("gapfix");R.style.setProperty("--safeB","0px")}else{R.classList.remove("gapfix");R.style.removeProperty("--safeB")}};
  gap();addEventListener("resize",()=>setTimeout(gap,300));
  /* hspx 第 1035 列（開發者 11/12）：轉橫再轉直回不去。iPhone 轉向後 innerHeight 要一陣子才更新，只量一次會量到轉一半的值，所以轉向後分幾次重量 */
  const again=()=>[0,150,400,800,1500].forEach(t=>setTimeout(gap,t));addEventListener("orientationchange",again);try{if(window.visualViewport)visualViewport.addEventListener("resize",()=>setTimeout(gap,120))}catch(e){}}catch(e){}})();
/* hspx 第 1035 列：很多頁面只在 resize 當下量一次大小（首頁場景、雅間、古戰場、星槎地圖、3D 園子…），iPhone 轉向後尺寸晚到就量錯；轉向後再補發幾次 resize，讓每一頁用穩定後的尺寸重算 */
addEventListener("orientationchange",()=>[150,400,800,1500].forEach(t=>setTimeout(()=>{try{dispatchEvent(new Event("resize"))}catch(e){}},t)));
/* hspx 第 1035 列：轉回直向時把橫向留下的左右捲動歸零 */
addEventListener("orientationchange",()=>[150,500,1000].forEach(t=>setTimeout(()=>{try{if(innerHeight>innerWidth){const se=document.scrollingElement||document.documentElement;if(se.scrollLeft)se.scrollLeft=0;if(window.scrollX)window.scrollTo(0,window.scrollY)}}catch(e){}},t)));
if(OFF&&"serviceWorker" in navigator){
  // 註冊 service worker；第一次要重新整理一次，多執行緒（跨來源隔離）才會生效
  /* 開發者決定（Gemini 效能審閱 P0-2）：等 service worker 真的就緒、接管這一頁再看；還沒有跨來源隔離（多執行緒引擎開不起來）就自動重整，同一次打開最多兩次 */
  /* 11/13 Android 舊 WebView：原生 App（UA 帶 XQQianqiuApp/）的隔離靠 App 原生碼、不靠 sw.js，重整不會好，所以不自動重整（改跳下面的降級提示） */
  navigator.serviceWorker.register("sw.js").then(()=>navigator.serviceWorker.ready).then(()=>{
    const n=+(sessionStorage.getItem("xqReload")||0);if(self.crossOriginIsolated||n>=2||/XQQianqiuApp\//.test(navigator.userAgent))return;
    const go=()=>{if(typeof rlgHold==="function"&&rlgHold())return setTimeout(go,3000);sessionStorage.setItem("xqReload",String(n+1));if(typeof rlgPrep==="function")rlgPrep("coi");location.reload()};   /* 11/13 開發者 P1：對局剛結束、結果視窗開著、殺棋特效中不重整（02r-reloadguard.js） */
    if(navigator.serviceWorker.controller)setTimeout(go,n?800:0);else navigator.serviceWorker.addEventListener("controllerchange",go,{once:true})}).catch(()=>{});
  // 自動更新：打開 App、切回 App、以及開著的時候每 5 分鐘，都去問一次有沒有新版。
  // 新版下載好就跳出視窗「有新版本」；下棋或測驗中只在上方顯示一條提示，不打斷。
  const hadCtl=!!navigator.serviceWorker.controller;let lastChk=0,shown=false,updating=false;
  const chk=force=>{if(!force&&Date.now()-lastChk<30000)return;lastChk=Date.now();navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{})};
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)chk()});setTimeout(()=>chk(true),3000);
  setInterval(()=>{if(!document.hidden)chk(true)},5*60000);
  const inGame=(h)=>/^#\/(cpu|arena|pvp|quiz|watch|journey\/play|redo\/play)(\/|$)|^#\/battle\/[a-z]+\/\d+|^#\/canju\/.+|^#\/theme\/.+/.test(h==null?location.hash:h);   /* 11/9 開發者：古戰場「攔截」守城局下到一半跳更新、按了就結束；古戰場、殘局、主題訓練的對局頁也算在下棋，更新視窗等離開再跳 */
  const fmtV=x=>!x?"":/^\d{8}-\d{4}$/.test(x)?`${x.slice(0,4)}/${x.slice(4,6)}/${x.slice(6,8)} ${x.slice(9,11)}:${x.slice(11,13)}`:x.slice(0,8);
  /* 意見回饋 593：更新時看得到進度（第幾個檔／共幾個＋進度條），慢的時候老實說還在下載；套用後重新打開會跳「已更新到新版」 */
  let updT=null;const updBox=()=>{if(updT&&updT.isConnected)return updT;updT=document.createElement("div");updT.className="toast";updT.style.cssText="min-width:230px;z-index:310";
    updT.innerHTML='<div class="ut">⬇ 正在下載新版…</div><div style="margin-top:6px;height:5px;border-radius:3px;background:#fff3;overflow:hidden"><i style="display:block;height:100%;width:3%;background:#E9C46A;transition:width .25s"></i></div>';document.body.append(updT);return updT};
  const updSay=(t,p)=>{const b=updBox();b.querySelector(".ut").textContent=t;if(p!=null)b.querySelector("i").style.width=Math.max(3,Math.min(100,p))+"%"};
  navigator.serviceWorker.addEventListener("message",e=>{const m=e.data&&e.data.xqUpd;if(!m||!updating)return;const[g,n]=m;updSay(`⬇ 正在下載新版　${g}／${n}`,g/n*95)});
  const markDone=()=>{try{localStorage.setItem("xqUpdDone",String(Date.now()))}catch(e){}};
  try{const d=+(localStorage.getItem("xqUpdDone")||0);if(d){localStorage.removeItem("xqUpdDone");if(Date.now()-d<120000){let w=0;const sh=async()=>{if(document.querySelector("#preov")&&++w<200)return setTimeout(sh,300);const v=fmtV(await appVer());
    const t=document.createElement("div");t.className="toast";t.style.zIndex="310";t.textContent="✓ 已更新到新版"+(v?"（"+v+"）":"")+"，可以繼續用了";document.body.append(t);setTimeout(()=>t.remove(),5000)};setTimeout(sh,600)}}}catch(e){}
  async function doUpdate(){updating=true;updSay("⬇ 正在檢查新版…",3);const tt=updT;let slow=null;
    try{const r=await navigator.serviceWorker.getRegistration();if(r){await r.update().catch(()=>{});
      if(r.installing||r.waiting){slow=setTimeout(()=>updSay("⬇ 網路比較慢，還在下載…下載好會自動套用"),15000);
        await new Promise(ok=>{navigator.serviceWorker.addEventListener("controllerchange",ok,{once:true});setTimeout(ok,90000)})}}}catch(e){}
    clearTimeout(slow);updSay(tt.querySelector(".ut").textContent,100);
    // 不馬上重新整理：新版已經在背景下載好，留在原本的畫面（意見回饋寫到一半也不會不見），等換到別的頁面時才套用
    pending=true;
    /* 意見回饋 320：沒在下棋、測驗、打字、開卡片時，下載好就馬上套用；不然才等換頁 */
    /* 意見回饋 817：按「背景更新」時輸入框已經失焦，所以也看有沒有寫了字的輸入框；意見回饋頁、殘局、古戰場、擂台、主題訓練這些棋局頁也算在忙 */
    const typed=()=>[...document.querySelectorAll("textarea,input[type=text],input:not([type])")].some(x=>x.offsetParent&&String(x.value||"").trim());
    const busyNow=()=>inGame()||/^#\/(feedback|canju|battle|theme|cup|legend|lobby|adventure|redo|exam|today)(\/|$)/.test(location.hash)||typed()||!!document.querySelector("#sheet.show,.travel,.walkc")||/^(INPUT|TEXTAREA)$/.test((document.activeElement||{}).tagName||"")||(typeof rlgHold==="function"&&rlgHold());   /* 11/13 開發者 P1：對局結束 60 秒內、結果視窗、殺棋特效中也算在忙 */
    if(!busyNow()){updSay("✓ 新版下載好了，馬上套用…",100);markDone();setTimeout(()=>{if(typeof rlgPrep==="function")rlgPrep("upd");location.reload()},900);return}
    updSay("✓ 新版下載好了，換到別的頁面時自動套用",100);setTimeout(()=>tt.remove(),3500);
    document.querySelectorAll(".toast.upd").forEach(x=>x.remove())}
  let pending=false;const seg=h=>(String(h||"").split("#")[1]||"/").split("/")[1]||"";
  addEventListener("hashchange",e=>{if(pending&&seg(e.newURL)!==seg(e.oldURL)&&!inGame("#"+(String(e.newURL).split("#")[1]||"/"))&&!(typeof rlgHold==="function"&&rlgHold())){markDone();if(typeof rlgPrep==="function")rlgPrep("upd");location.reload()}});   /* 換到對局頁時不套用，等下完離開再套用 */
  let shownV="";
  async function notifyNew(nv,note){if(shown&&(!nv||nv<=shownV))return;shown=true;shownV=nv||shownV;
    if(pending||updating){updating=false;return doUpdate()}const v=fmtV(nv||await appVer());vibrate([20,40,20]);
    /* QA P2-6：下棋時不在對手資訊上面蓋「有新版本」，等離開對局畫面再跳 */
    if(inGame()){shown=false;const w=()=>{if(inGame())return setTimeout(w,4000);notifyNew(nv,note)};setTimeout(w,4000);return}
    if(0){const t=document.createElement("button");t.className="toast upd";t.style.cssText="bottom:auto;top:calc(64px + var(--safeT));pointer-events:auto;z-index:300";
      t.textContent="🆕 有新版本"+(v?"（"+v+"）":"")+"，點這裡在背景更新，下完這盤換頁時套用";t.onclick=doUpdate;document.body.append(t);return}
    /* 意見回饋 622（開發者）：更新內容只有開發者看得到；一般玩家只在「你回報的問題修好了」（checkFixes）看到自己回報的那幾則 */
    try{if(!(typeof DEVMODE==="function"&&DEVMODE()))note=""}catch(e){note=""}
    modal(`<div class="em">🆕</div><h2>有新版本</h2>${note?`<p style="text-align:left;white-space:pre-wrap">${esc(note)}</p>`:""}<p class="muted">${v?"版本 "+esc(v)+"<br>":""}在背景更新，你可以留在這個畫面繼續做事，換到別的頁面時才套用新版。你的戰績、棋譜和設定都會保留。</p>`,[["背景更新",doUpdate],["稍後",()=>{shown=false},true]],"keep")}   /* 意見回饋 607：keep＝換頁也不關 */
  window.XQ_notifyNew=notifyNew;
  window.XQ_checkUpdate=async()=>{chk(true);const[a,n]=await Promise.all([appVer(),netVer()]);return{a,n}};
  if(hadCtl)navigator.serviceWorker.addEventListener("controllerchange",()=>{if(updating)return;if(+(sessionStorage.getItem("xqReload")||0)>0&&!self.crossOriginIsolated)return;notifyNew()})}
/* 11/13 Android 舊 WebView 降級提示：原生 App 沒有跨來源隔離或 SharedArrayBuffer＝手機的 Android System WebView 太舊（模擬器的 WebView 133 就是），電腦棋手（多執行緒 Pikafish）一定載不起來。
   不重整、跳一次說明：要更新哪個 App、哪些功能照樣能用；引擎的下載、載入、搜尋都直接回這句（不再說「關掉重開」，也不白抓 48 MB 引擎檔）。只在原生 App 判斷，網頁版不受影響 */
const NATIVE_OLDWV="這支手機的 Android System WebView 版本太舊，電腦棋手無法運作；請到 Play 商店更新「Android System WebView」或「Chrome」";
if(OFF&&/XQQianqiuApp\//.test(navigator.userAgent)&&(!self.crossOriginIsolated||typeof SharedArrayBuffer==="undefined")){
  if(window.XQEngine){const no=()=>Promise.reject(new Error(NATIVE_OLDWV));XQEngine.load=no;XQEngine.search=no;XQEngine.prefetch=no}
  const wv=(navigator.userAgent.match(/Chrome\/([\d.]+)/)||[])[1]||"",mute=store.get("oldWvMute","")===wv;let tries=0;
  const show=()=>{if(document.querySelector("#preov,.modal,#sheet.show")&&++tries<30)return setTimeout(show,3000);if(mute){toast("⚠ "+NATIVE_OLDWV);return}
    modal(`<div class="em">📱</div><h2>電腦棋手需要更新手機元件</h2><p style="text-align:left">${esc(NATIVE_OLDWV)}。</p><p class="muted" style="text-align:left">更新好以後，把 App 完全關掉再打開就能用。<br>現在照樣能用：同桌對弈（兩人在這支手機輪流下）、殘局、古譜與大師對局、測驗、線上對弈。<br>要等更新才能用：挑戰電腦、擂台、棋局分析與提示。</p>${wv?`<p class="muted">目前的 WebView 版本：${esc(wv)}</p>`:""}`,[["知道了",null],["這個版本不再跳出",()=>store.set("oldWvMute",wv),true]])};
  setTimeout(show,2500)}
if(OFF&&window.XQEngine){let bar=null;
  XQEngine.onProgress((got,total)=>{if(!bar){keepAwake("engine",()=>!!bar);bar=document.createElement("div");bar.className="toast";if(/^#[/](cpu|arena|pvp|quiz|watch|journey[/]play|redo[/]play|legend)([/]|$)/.test(location.hash))bar.style.display="none";   /* QA P2-6：下棋、讀故事時不蓋引擎下載進度 */
  bar.style.bottom="auto";bar.style.top="calc(70px + var(--safeT))";document.body.append(bar);setTimeout(()=>{if(bar)bar.style.display="none"},1200)}
    const p=Math.round(got/total*100);bar.textContent=`第一次使用：下載 Pikafish 引擎 ${p}%（${(got/1048576).toFixed(0)}／${(total/1048576).toFixed(0)} MB）`;
    if(got>=total){bar&&bar.remove();bar=null;toast("✅ Pikafish 引擎下載完成")}})}
function connectSheet(){const r=OFF&&XQ.remoteInfo();
  sheet("連線到電腦",b=>{b.innerHTML=`<p>連上電腦後可以：看 AI 對戰、請 Claude/GPT 講解、把特級大師與許銀川對局同步到手機。挑戰電腦、雙人對戰、古譜研究不需要連線。</p>
    <p class="muted">怎麼連：在電腦執行 <b>node xiangqi-referee.js --tunnel</b>，按下面「📷 掃描」對準電腦頁面上「📱 手機」的 QR code。只要掃過一次就好：電腦程式重開後網址雖然會換，App 會自己找到新網址。</p>
    <div class="card" id="cs">${r?"檢查連線中…":"目前沒有連線設定"}</div>
    <button class="btn" id="scan">📷 掃描電腦上的 QR code</button>
    <details style="margin:8px 0"><summary class="muted">掃不到？改貼上連結</summary>
      <div class="row" style="gap:6px;margin-top:6px"><input id="lk" placeholder="貼上 #connect=… 或 /m?k=… 的網址" style="flex:1;min-width:0;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:inherit"><button class="pill" id="lkGo">連線</button></div></details>
    ${r?'<button class="btn ghost" id="dc">取消連線設定</button>':""}`;
    b.querySelector("#scan").onclick=()=>scanQR(useLink);
    b.querySelector("#lkGo").onclick=()=>{if(!useLink(b.querySelector("#lk").value))toast("看不懂這個網址")};
    if(r){XQ.ping().then(ok=>{const c=b.querySelector("#cs");if(c)c.innerHTML=ok?`✅ 已連上電腦（我是 <b>${esc(myName()||"未取名")}</b>）<div class="muted" style="word-break:break-all">${esc(r.base)}</div><div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="pill" id="who">👥 誰在線上</button><button class="pill" id="nmB">✏ 改名字</button><button class="pill" id="dq">📱 另一台裝置也連</button></div>`:`⚠ 連不到電腦（電腦程式可能關了，或網址已換）<div class="muted" style="word-break:break-all">${esc(r.base)}</div>`;
        const w=c&&c.querySelector("#who"),n=c&&c.querySelector("#nmB");if(w)w.onclick=whoSheet;if(n)n.onclick=()=>nameSheet(false);const q=c&&c.querySelector("#dq");if(q)q.onclick=()=>deviceQR(r.base,r.key)});
      b.querySelector("#dc").onclick=()=>{XQ.disconnect();closeSheet();toast("已取消連線設定");route()}}})}
// 把掃到／貼上的網址變成連線設定。看得懂三種：離線版 App 的 #connect=…（可帶 &seat=）、電腦手機版的 …/m?k=…、雙人對戰的 …/m?k=…#/join/r
function useLink(text){text=String(text||"").trim();let h=null;
  const i=text.indexOf("#connect=");if(i>=0)h=text.slice(i);
  else{let u;try{u=new URL(text)}catch(e){return false}const k=u.searchParams.get("k");if(!/^https:$/.test(u.protocol)||!k)return false;
    const seat=(u.hash.match(/#\/join\/([rb])/)||[])[1];h=`#connect=${encodeURIComponent(u.origin)}&k=${encodeURIComponent(k)}`+(seat?`&seat=${seat}`:"")}
  closeSheet();toast("連線中…");location.hash=h;return true}
// App 內的相機掃描（iPhone 加到主畫面的 App 用相機 App 掃會跳到 Safari，連線資料存不進 App，所以要在 App 裡掃）
async function scanQR(done){let stream=null,stop=false;
  const ov=document.createElement("div");ov.className="scanov";
  ov.innerHTML='<video playsinline muted></video><div class="scanbox"></div><div class="scantip">對準電腦上的 QR code</div><button class="btn ghost" id="sx">✕ 關閉</button>';
  document.body.append(ov);const vid=ov.querySelector("video");
  const end=()=>{stop=true;if(stream)stream.getTracks().forEach(t=>t.stop());ov.remove()};ov.querySelector("#sx").onclick=end;
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false})}
  catch(e){end();return toast("沒辦法開相機："+(e.name==="NotAllowedError"?"請在設定裡允許這個 App 使用相機":e.message))}
  vid.srcObject=stream;await vid.play().catch(()=>{});
  let det=null;try{if("BarcodeDetector" in window)det=new BarcodeDetector({formats:["qr_code"]})}catch(e){}
  if(!det)try{await loadScript("jsQR.min.js")}catch(e){end();return toast(e.message)}
  const cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});
  const tick=async()=>{if(stop)return;let txt=null;
    try{if(vid.readyState>=2){if(det){const r=await det.detect(vid);if(r[0])txt=r[0].rawValue}
      else{const w=vid.videoWidth,h=vid.videoHeight,sc=Math.min(1,640/Math.max(w,h));cv.width=w*sc|0;cv.height=h*sc|0;cx.drawImage(vid,0,0,cv.width,cv.height);
        const r=jsQR(cx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height,{inversionAttempts:"dontInvert"});if(r)txt=r.data}}}catch(e){}
    if(txt){vibrate(30);end();if(!done(txt))toast("這不是連線用的 QR code");return}
    setTimeout(tick,150)};tick()}
async function homeStatus(box,tries){
  const r=XQ.remoteInfo(),ok=r?await XQ.ping():false,eng=await XQ.engineCached();
  if(!box.isConnected)return;
  // 連不上的話，停在首頁時每 5 秒再試（最多 6 次），連上就自動變綠燈
  if(r&&!ok&&(tries||0)<6)setTimeout(()=>{if(box.isConnected&&!document.hidden)homeStatus(box,(tries||0)+1)},5000);
  box.innerHTML=`<div class="row" style="justify-content:space-between"><span>${ok?"🟢 已連上電腦":r?"🟠 連不到電腦（離線使用中）":"⚪ 離線模式"}</span><span class="row" style="gap:6px">${r&&!ok?'<button class="pill" id="fBtn">忘記這台電腦</button>':""}<button class="pill" id="cBtn">${ok?"連線資訊":"怎麼連線"}</button></span></div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><span>${eng?"✅ Pikafish 已在手機裡，可離線下棋與分析":"⬇ Pikafish 引擎還沒下載（約 48 MB）"}</span>${eng?"":'<button class="pill" id="eBtn">下載</button>'}</div>`;
  box.querySelector("#cBtn").onclick=connectSheet;
  const fb=box.querySelector("#fBtn");if(fb)fb.onclick=()=>confirmBox("不再連這台電腦？（之後要連，重新掃電腦上的 QR code）",()=>{XQ.disconnect();box.remove();toast("已經忘記這台電腦")},"忘記");
  const e=box.querySelector("#eBtn");if(e)e.onclick=()=>{e.disabled=true;e.textContent="下載中…";(XQEngine.prefetch||XQEngine.load)().then(()=>{toast("Pikafish 已下載，可以離線使用");homeStatus(box)}).catch(err=>{toast(err.message);e.disabled=false;e.textContent="下載"})}}

// 外觀自動下載：App 打開 3 秒後，把所有朝代的棋盤、棋子圖和字形抓下來並先解碼（約 2.8 MB，存在手機裡），第一次切換外觀才不會卡
const LOOK_IMGS=[];
{const k=store.get("sndStyle","wood");if(/^s\d\d$/.test(k))setTimeout(()=>loadSfx(k),1500)}
setTimeout(async()=>{await window.PRE_FIRST;if(navigator.connection&&navigator.connection.saveData)return;   /* 回饋 845（開發者 11/9 選：折衷先載）：各朝棋盤、棋子的預覽等首批載完才抓，不跟首批搶網路 */
  const boards=[...new Set(Object.keys(BOARD_IMG).map(k=>BOARD_IMG_FILE[k]||k))],urls=[];
  for(const k of boards)urls.push(`data/boards/${k}.webp`);for(const k in PIECE_INK)for(const s of"rb")urls.push(`data/pieces/${k}-${s}.webp`);
  let i=0;const next=()=>{if(i>=urls.length){for(const k of GLY_ERAS)needGly(k,()=>{});return}
    const im=new Image();im.src=urls[i++];LOOK_IMGS.push(im);(im.decode?im.decode():Promise.resolve()).catch(()=>{}).then(next)};
  next();next()},3000);
// 特級大師對局（33 MB）自動下載：App 打開 20 秒後，沒下載過就在背景抓一次（存在手機裡，離線也能看）
if(OFF)setTimeout(async()=>{try{await window.PRE_FIRST;if(!navigator.onLine||(navigator.connection&&navigator.connection.saveData))return;const c=await caches.open("xqlab-data");   /* 回饋 845（開發者 11/9 選：折衷先載）：首批載完才開始抓 */
  if(await c.match(new URL("data/gmgames.json",location.href).href))return;if(window.PRE_ENG)await window.PRE_ENG.catch(()=>{});   /* 回饋 845：引擎（下棋要用）先下載完再抓大師對局 */
  await fetch("data/gmgames.json");}catch(e){}},20000);
// Pikafish 引擎自動下載：App 打開 5 秒後，沒下載過就在背景下載（約 48 MB，只要一次；開了「省數據模式」就不自動下載）
if(OFF&&window.XQEngine&&XQEngine.prefetch)setTimeout(async()=>{try{await window.PRE_FIRST;   /* 回饋 845（開發者 11/9 選：折衷先載）：首批載完才開始抓引擎（49 MB），不跟首批搶網路 */
  if(await XQ.engineCached()||!navigator.onLine||(navigator.connection&&navigator.connection.saveData))return;
  const pe=XQEngine.prefetch();window.PRE_ENG=pe.finally(()=>{window.PRE_ENG=null});   /* 回饋 845：引擎下載中，外觀的背景下載讓路（09b-preload.js preBg 只留 1 個） */
  await pe;toast("✅ Pikafish 引擎已自動下載完成，離線也能下棋");const h=document.querySelector("#hStatus");if(h&&h.isConnected)homeStatus(h)}catch(e){}},5000);
// 從背景切回 App：首頁的連線燈號重新檢查（手機網路要一點時間恢復，所以等一下再測）
// 一般玩家：只有「雙人對戰邀請」（帶 seat）的連線才留著；單純連電腦的連結（舊的分享網址）一律清掉，不會出現連不到電腦
if(OFF)setTimeout(()=>{const r0=XQ.remoteInfo&&XQ.remoteInfo();if(r0&&!r0.seat&&!DEVMODE())XQ.disconnect()},0);
if(OFF)setTimeout(()=>{const r=XQ.remoteInfo&&XQ.remoteInfo();if(!r||DEVMODE())return;
  XQ.ping().then(ok=>{if(!ok&&!(r.ok>Date.now()-3*864e5)&&Date.now()-(r.at||0)>864e5)XQ.disconnect()}).catch(()=>{})},8000);
if(OFF)document.addEventListener("visibilitychange",()=>{if(document.hidden)return;const h=document.querySelector("#hStatus");if(h)setTimeout(()=>{if(h.isConnected)homeStatus(h)},1200)});
// ================= 我的名字、誰在線上 =================
function nameSheet(first){sheet(first?"👋 歡迎！取個名字吧":"我的名字",b=>{
  const sug=defaultName();if(first&&!myName())setMyName(sug);   // 意見回饋 181：先給預設名字，關掉不填也有名字
  b.innerHTML=`<p class="muted">${first?"其他棋友會看到這個名字（例如線上對戰時，對手看到的就是你）。名字和段位也會定期送給開發者，詳見「設定 → 隱私」。":"這個名字會顯示在線上大廳和對戰裡。"}</p>
    <input id="nm" maxlength="16" placeholder="${sug}" value="${esc(myName())}" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:inherit;margin:4px 0 10px">
    <button class="btn" id="ok">確定</button>${first?'<button class="btn ghost" id="sk">先不要，用「'+sug+'」</button>':""}`;
  const save=n=>{setMyName(n);if(window.XQNet)XQNet.refresh();closeSheet();toast("你好，"+myName()+"！");api("/clients").catch(()=>{});route()};
  b.querySelector("#ok").onclick=()=>{const n=b.querySelector("#nm").value.trim();save(n||sug)};
  const sk=b.querySelector("#sk");if(sk)sk.onclick=()=>save(sug);
  setTimeout(()=>{const i=b.querySelector("#nm");if(i&&!first)i.focus()},300)})}
function whoSheet(){sheet("👥 誰在線上",async b=>{
  b.innerHTML=`<div class="row" style="justify-content:space-between"><span>我的名字：<b>${esc(myName()||"（還沒取）")}</b></span><button class="pill" id="ed">✏ 改名字</button></div><div id="wl" class="muted" style="margin-top:10px">讀取中…</div>`;
  b.querySelector("#ed").onclick=()=>{closeSheet();store.set("setTab","bot");store.set("setFocus","name");location.hash="#/settings"};
  try{const d=await api("/clients"),l=d.list||[];
    b.querySelector("#wl").innerHTML=l.length?`<p class="muted" style="margin:0 0 6px">最近 5 分鐘連到電腦的裝置：</p>`+l.map(c=>`<div class="card" style="padding:10px 12px;margin-bottom:6px"><b>${esc(c.name)}</b>${c.dev===d.me?' <span class="pill">我</span>':""}
      <div class="muted">${esc(c.kind)}・IP ${esc(c.ip)}・${c.via==="通道"?"外網":esc(c.via)}・${c.ago<20?"🟢 線上":Math.round(c.ago/60)+" 分鐘前"}</div></div>`).join(""):"目前沒有裝置連線"}
  catch(e){b.querySelector("#wl").textContent="⚠ "+e.message}})}

// ================= 線上大廳（不用電腦）：看誰在線上、邀請對戰、觀戰 =================
function Lobby(v){setTop("線上大廳",false,[["📤",shareSheet,"分享給朋友"]]);setTabs(true,"#/lobby");
  if(!OFF||!window.XQNet){v.innerHTML='<div class="pad"><div class="card">線上大廳要用安裝在手機上的 App（GitHub 版）。按右上角 📤 可以拿到網址。</div></div>';return{}}
  XQNet.start();if(!myName())setTimeout(()=>nameSheet(true),300);   /* QA P2-10：直接進大廳也能按「先不要」，用預設名字 */
  v.innerHTML='<div class="pad" id="lb"></div>';
  const ST={idle:"閒置中",playing:"對戰中",watching:"觀戰中",seeking:"🎲 正在找對手"};
  function paint(){const box=v.querySelector("#lb");if(!box)return;const ps=XQNet.people(),up=XQNet.status()==="up";
    /* 意見回饋 286：按「對局」分組——每盤列出雙方和誰在觀戰；閒著的棋友另外一區。觀戰過的對局不會再被藏起來 */
    const games={},watchers={};for(const p of ps)if(p.st==="playing"&&p.gid)(games[p.gid]=games[p.gid]||[]).push(p);
    for(const p of ps)if(p.st==="watching"&&p.gid)(watchers[p.gid]=watchers[p.gid]||[]).push(p);
    const free=ps.filter(p=>p.st!=="playing"&&!(p.st==="watching"&&p.gid&&games[p.gid]));
    box.innerHTML=`${up?"":'<div class="muted" style="text-align:center;margin:2px 0 4px">⏳ 連線到大廳中…</div>'}<!-- 意見回饋 527：「我是…／已進入大廳」小卡拿掉 -->
      ${XQNet.playing()?'<button class="btn" id="back" style="margin-top:10px">♟ 回到我進行中的對局</button>'
        :XQNet.seeking()?`<div class="card" style="margin-top:10px;text-align:center"><div style="font-size:30px">🎲</div><b>正在幫你找對手…</b><div class="muted">${XQNet.seekers()?`另外有 ${XQNet.seekers()} 人也在找，馬上配對`:"有人按「隨機配對」就會自動開始"}</div><button class="btn ghost" id="sk0" style="margin-top:8px">取消</button></div>`
        :'<button class="btn" id="sk1" style="margin-top:10px">🎲 隨機配對（自動找一位線上對手）</button>'}
      ${(()=>{const S=XQNet.cup&&XQNet.cup();if(!S)return"";const n=Math.min(16,(S.reg||[]).length),ph={reg:`報名中・${n}／16`,wait:"報名截止・週六點將",ck:"🥁 點將中！",play:"⚔ 比賽進行中",done:`🏆 擂主：${esc(S.champ?lbnShow(S.champ):"從缺")}`,off:"本週休賽"}[S.ph]||"";return`<button class="card row" id="cupE" style="width:100%;margin-top:10px;gap:10px;font:inherit;color:inherit;text-align:left;cursor:pointer"><span style="font-size:28px">🏯</span><span style="flex:1;min-width:0"><b>千秋盃${S.ed?` 第 ${S.ed} 屆`:""}</b><br><span class="muted" style="font-size:12.5px">每週六下午 16 強擂台・${ph}</span></span><span class="muted">›</span></button>`})()}
      ${(()=>{const G=XQNet.playing()&&XQNet.game(),pn=p=>`<span class="gc-p" data-p="${esc(p.id)}"><b>${esc(lbnShow(p))}</b>${cupBadge(p.id)}<small>${esc(XQNet.rankOf(p.pts))}</small></span>`,anyBot=ps.some(p=>isCloud(p.id));   /* 意見回饋 750：對戰卡兩行、名字不換行（太長用省略號）、雲遊棋客只標小 ☁ */
        const mine=G?`<div class="card" id="myg" role="button" tabindex="0" data-axk style="margin-bottom:8px;cursor:pointer;border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--card))"><div class="row" style="justify-content:space-between"><b style="color:var(--accent)">🔥 我的對局</b><button class="pill pill-main" style="padding:6px 12px">⚔ 回到戰場</button></div><div style="margin-top:4px">${esc(lbnShow(G.red))} 對 ${esc(lbnShow(G.black))}</div></div>`:"";
        const rest=Object.entries(games).filter(([g])=>!G||g!==G.gid);
        const card=([g,l])=>{const w=watchers[g]||[],watching=XQNet.gid&&XQNet.gid()===g&&!G;
          const tc=(l.find(p=>p.tc)||{}).tc;
          return `<div class="card" style="margin-bottom:8px${watching?";border:2px solid var(--accent2)":""}"><div class="gc-l1">${l.map(pn).join('<span class="gc-vs">對</span>')}${l.length<2?'<span class="gc-vs">對 （暫時不在大廳）</span>':""}</div>
            <div class="gc-l2"><span class="muted" style="min-width:0">${tc?`⏱ 每方 ${+tc} 分・`:""}${w.length?`<button class="gc-w" data-ws="${esc(g)}">👀 ${w.length} 人在看 ›</button>`:"還沒有人在看"}</span><button class="pill" data-w="${esc(g)}" style="flex:none">👀 ${watching?"回去看":"觀看"}</button></div></div>`};
        const VS=lobbyVisitors(),vis=VS.length?`<div class="sec-t">🪨 路過的石桌往事人物</div>${VS.map(k=>`<button class="card row" data-jc="${k}" style="width:100%;gap:10px;margin-bottom:8px;font:inherit;color:inherit;text-align:left;cursor:pointer"><img src="data/journey/char_${k}_idle.webp" alt="" style="width:46px;height:62px;object-fit:contain;flex:none" onerror="this.remove()"><span style="flex:1;min-width:0"><b>${esc(JCHAR[k].name)}</b><br><span class="muted" style="font-size:12.5px">「${esc(JCHAR[k].hi)}」</span></span><span class="muted">›</span></button>`).join("")}`:"";
        /* 開發者決定（Gemini 遊戲化審閱）：熟面孔——對戰過的棋友（本機的線上戰績記著 ID 和名字），在線上時亮起來、點一下就能邀請 */
        const FH=(()=>{let h=[];try{h=(XQNet.rating().hist||[])}catch(e){}const seen=new Set(),out=[];for(const x of h){if(!x.oid||seen.has(x.oid)||x.oid===XQNet.me().id||(XQNet.blocked&&XQNet.blocked(x.oid)))continue;seen.add(x.oid);out.push(x);if(out.length>=12)break}return out})();   /* 回饋 841（開發者 11/9 選：大廳檢舉封鎖）：封鎖的人不列進熟面孔 */
        const fam=FH.length?`<div class="sec-t">${ETIMG("o_familiar","","👥")} 熟面孔（${FH.filter(x=>ps.some(p=>p.id===x.oid)).length}／${FH.length} 在線上）</div><div class="famg">${FH.map(x=>{const on=ps.find(p=>p.id===x.oid),busy=on&&on.st==="playing";return`<${on?`span data-p="${esc(on.id)}"`:"span"} class="famc${on?" on":""}"><b>${on?"🟢":"⚪"} ${esc(on?lbnShow(on):lbnShow(x.oid,x.opp))}${devBotTag(x.oid)}</b><small>${on?(busy?"對戰中":on.st==="watching"?"觀戰中":"在線上・點一下邀請"):"上次 "+(x.res==="w"?"你贏":x.res==="l"?"你輸":"和棋")+"・"+new Date(x.at).toLocaleDateString()}</small></${"span"}>`}).join("")}</div>`:"";
        return vis+fam+`<div class="sec-t">${ETIMG("h_battle","","⚔")} 正在對戰（${rest.length+(G?1:0)} 盤）${cloudLegend(anyBot)}</div>`+(mine||rest.length?mine+rest.map(card).join(""):`<div class="card muted" style="margin-bottom:8px">${up?"目前沒有人在對戰，有人開始下棋就會出現在這裡。":"連線中…"}</div>`)+
          `<div class="sec-t">${ETIMG("o_invite","","🟢")} 可以邀請的棋友（${free.filter(p=>p.st==="idle"||p.st==="seeking").length}）</div>`+
          (free.length?free.map(p=>`<div class="card row" data-p="${esc(p.id)}" role="button" tabindex="0" data-axk style="justify-content:space-between;margin-bottom:8px;cursor:pointer"><span style="flex:1;min-width:0"><span class="gc-p"><b>${esc(lbnShow(p))}</b>${cupBadge(p.id)}<small>${esc(XQNet.rankOf(p.pts))}${p.tc?`・⏱${+p.tc}分`:""}</small></span><span class="muted gc-sub">${p.st==="idle"&&p.doing?"📖 "+esc(String(p.doing).slice(0,10))+"中":ST[p.st]||""}${p.city?"・📍"+esc(p.city):""}</span></span>
            ${p.st==="idle"||p.st==="seeking"?`<button class="pill pill-main" data-i="${esc(p.id)}" style="padding:6px 12px">⚔ 邀請對戰</button>`:""}</div>`).join("")
          :`<div class="card muted">${up?(rest.length?"大家都在對戰或觀戰中，可以先去看一盤，或按上面「隨機配對」等人。":"目前只有你在線上。請朋友打開象棋千秋（按右上角 📤 分享），他們就會出現在這裡。"):typeof offNow==="function"&&offNow()?"📴 目前沒有網路。線上對戰和觀戰要連上網路才能用；跟電腦下棋、做題、看棋譜不受影響。":"連線中…"}</div>`)})()}
      ${!OFF||DEVREMOTE()?`<div class="sec-t">📺 AI 對戰</div><button class="item card" id="aiw" style="width:100%;display:flex;gap:12px;align-items:center;text-align:left"><span style="font-size:28px">📺</span><span style="flex:1;min-width:0"><b>GPT 對 Claude</b><br><span class="muted">電腦上的兩個 AI 在下棋</span></span><span class="muted">›</span></button>`:""}
      <!-- 意見回饋 347：大廳下面那段說明拿掉 -->`;
    (box.querySelector("#ed")||{}).onclick=()=>{closeSheet();store.set("setTab","bot");store.set("setFocus","name");location.hash="#/settings"};   /* 意見回饋 498：到「設定 → 外觀」改名字 */
    {const tp=box.querySelector("#tcp");if(tp)tp.onclick=()=>sheet("⏱ 對局時制",b=>{b.innerHTML=`<p class="muted" style="margin:0 0 10px">每一方的總思考時間。開局時跟對手比，雙方選的不同就用比較短的；沒選就是 15 分鐘。另外每一步最多 3 分鐘。</p><div class="items" style="padding:0">${[[5,"快棋"],[10,"快棋"],[15,"預設・常見比賽"],[20,"慢一點"],[30,"慢棋"]].map(([m,l])=>`<button class="item" data-tc="${m}"><span class="lb">${XQNet.tc()===m?"✅":"⏱"}</span><span class="tx"><b>每方 ${m} 分鐘</b><span>${l}</span></span></button>`).join("")}</div>`;
      b.querySelectorAll("[data-tc]").forEach(x=>x.onclick=()=>{XQNet.setTc(+x.dataset.tc);vibrate(5);closeSheet();toast(`⏱ 時制改成每方 ${x.dataset.tc} 分鐘`);paint()})})}(box.querySelector("#rk")||{}).onclick=()=>location.hash="#/stats";
    (box.querySelector("#cupE")||{}).onclick=()=>location.hash="#/cup";
    const s1=box.querySelector("#sk1"),s0=box.querySelector("#sk0");if(s1)s1.onclick=()=>{vibrate(10);XQNet.seek(true)};if(s0)s0.onclick=()=>XQNet.seek(false);
    const bk=box.querySelector("#back");if(bk)bk.onclick=()=>location.hash="#/pvp";const mg=box.querySelector("#myg");if(mg)mg.onclick=()=>location.hash="#/pvp";
    box.querySelectorAll("[data-ws]").forEach(b=>b.onclick=e=>{e.stopPropagation();const w=ps.filter(p=>p.st==="watching"&&p.gid===b.dataset.ws);sheet(`👀 ${w.length} 人在看`,s=>{s.innerHTML=w.map(p=>`<div class="card row" data-q="${esc(p.id)}" role="button" tabindex="0" data-axk style="margin-bottom:6px;cursor:pointer"><span class="gc-p"><b>${esc(lbnShow(p))}</b>${devBotTag(p.id)}<small>${esc(XQNet.rankOf(p.pts))}</small></span></div>`).join("")||'<div class="muted">現在沒有人在看</div>';s.querySelectorAll("[data-q]").forEach(c=>c.onclick=()=>{const p=w.find(x=>x.id===c.dataset.q);if(p)oppCard(p.id,p.name)})})});   /* 意見回饋 750：觀戰者只寫人數，點進來看名單 */
    box.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{const go=()=>{XQNet.watch(b.dataset.w);location.hash="#/pvp"};if(XQNet.playing())confirmBox("你有一盤進行中的對局，去觀戰會離開它，確定？",go,"確定");else go()});
    {const aw=box.querySelector("#aiw");if(aw)aw.onclick=()=>location.hash="#/watch/ai"}
    // 點棋友（不是按鈕的地方）→ 看他的資料卡
    box.querySelectorAll("[data-jc]").forEach(c=>c.onclick=()=>{vibrate(5);jcharSheet(c.dataset.jc)});
    box.querySelectorAll("[data-p]").forEach(c=>c.onclick=e=>{if(e.target.closest("button"))return;const p=ps.find(x=>x.id===c.dataset.p);if(p)oppCard(p.id,p.name,{invite:q=>{if(XQNet.playing())return confirmBox("你有一盤進行中的對局，邀請新對局會離開它，確定？",()=>{XQNet.leave();invite(q)},"確定");invite(q)}})});
    box.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const p=ps.find(x=>x.id===b.dataset.i);if(!p)return;
      if(XQNet.playing())return confirmBox("你有一盤進行中的對局，邀請新對局會離開它，確定？",()=>{XQNet.leave();invite(p)},"確定");invite(p)})}
  // 棋友資料卡：段位、積分、勝負和、狀態、裝置，還有你跟他下過的戰績
  function playerCard(p){const R=XQNet.rating(),mine=(R.hist||[]).filter(h=>h.oid?h.oid===p.id:h.opp===p.name),mw=mine.filter(h=>h.res==="w").length,ml=mine.filter(h=>h.res==="l").length,md=mine.filter(h=>h.res==="d").length;
    const N=(p.w||0)+(p.l||0)+(p.d||0),ago=Math.max(0,Math.round((Date.now()-(p.at||Date.now()))/60000));
    sheet("棋友資料",b=>{b.innerHTML=`<div style="text-align:center"><div style="font-size:22px;font-weight:900;font-family:var(--serif)">${esc(lbnShow(p))}</div>
        <div style="margin:6px 0"><span class="pill" style="font-size:15px;padding:4px 12px">🏅 ${esc(XQNet.rankOf(p.pts))}・${p.pts||0} 分</span></div>
        <div class="muted">${ST[p.st]||""}${p.city?"・📍"+esc(p.city):""}${p.kind?"・"+esc(p.kind):""}・${ago?ago+" 分鐘前更新":"剛剛在線上"}</div></div>
      <div class="card" style="margin-top:12px"><div class="muted" style="margin-bottom:6px">線上戰績</div>${p.w==null?'<div class="muted">對方的 App 還沒更新，看不到戰績</div>':`<div style="display:grid;grid-template-columns:repeat(4,1fr);text-align:center">
        ${[["勝",p.w,"var(--accent2)"],["負",p.l,"var(--red)"],["和",p.d,"var(--muted)"],["勝率",N?Math.round(p.w*100/N)+"%":"—",""]].map(([l,x,c])=>`<div><div style="font-size:22px;font-weight:900;color:${c}">${x}</div><div class="muted">${l}</div></div>`).join("")}</div>`}</div>
      <div class="card" style="margin-top:8px"><div class="muted" style="margin-bottom:4px">你跟他下過</div>${mine.length?`<b>${mw} 勝 ${ml} 負 ${md} 和</b><span class="muted">・最近一盤 ${new Date(mine[0].at).toLocaleDateString()}</span>`:'<span class="muted">還沒下過</span>'}</div>
      ${p.st==="idle"||p.st==="seeking"?'<button class="btn" id="pi">⚔ 邀請對戰</button>':p.st==="playing"&&p.gid?'<button class="btn" id="pw">👀 觀看他的對局</button>':""}`;
      const pi=b.querySelector("#pi"),pw=b.querySelector("#pw");
      if(pi)pi.onclick=()=>{closeSheet();if(XQNet.playing())return confirmBox("你有一盤進行中的對局，邀請新對局會離開它，確定？",()=>{XQNet.leave();invite(p)},"確定");invite(p)};
      if(pw)pw.onclick=()=>{closeSheet();XQNet.watch(p.gid);location.hash="#/pvp"}})}
  function invite(p,ok){const mt=XQNet.tc(),pt=XQNet.tcOf(p);
    /* 意見回饋 328：時制不一樣要先講好——改成對方的，或照自己的送出（對方要同意改成一樣才能開局） */
    if(!ok&&!XQNet.isBot(p.id)&&pt&&pt!==mt)return modal(`<div class="em">⏱</div><h2>時制不一樣</h2><p>${esc(lbnShow(p))} 設每方 <b>${pt} 分鐘</b>，你設每方 <b>${mt} 分鐘</b>。<br>兩邊要一樣才能開局。</p>`,
      [[`改成 ${pt} 分鐘再邀請`,()=>{XQNet.setTc(pt);invite(p,true)}],[`照我的 ${mt} 分鐘邀請`,()=>invite(p,true),true],["先不要",null,true]]);
    XQNet.invite(p);
    sheet("⚔ 已送出邀請",b=>{b.innerHTML=`<p style="text-align:center">等 <b>${esc(lbnShow(p))}</b> 回應…<br><span class="muted">每方 ${XQNet.tc()} 分鐘。對方接受後會自動開始，紅黑隨機決定。</span></p><button class="btn ghost" id="cx">取消邀請</button>`;
      b.querySelector("#cx").onclick=()=>{XQNet.cancelInvite();closeSheet()}})}
  const offs=[XQNet.on("people",paint),XQNet.on("status",paint),XQNet.on("reply",r=>{closeSheet();toast(`${lbnShow("",r.name)} 婉拒了邀請`)})];
  paint();const t=setInterval(paint,15000);
  return{stop:()=>{offs.forEach(f=>f());clearInterval(t);if(XQNet.seeking()&&!XQNet.active())XQNet.seek(false)}}}
// 不管在哪個畫面都能收到邀請
if(OFF&&window.XQNet){XQNet.start();
  XQNet.on("version",async x=>{if(!x||!x.v)return;const a=await appVer();if(a&&x.v>a&&window.XQ_notifyNew)XQ_notifyNew(x.v,x.note||"")});
  const goGame=()=>{if(location.hash==="#/pvp")route();else location.hash="#/pvp"};
  XQNet.on("invite",x=>{vibrate([40,60,40]);
    const acc=()=>{const go=()=>{XQNet.respond(x,true);goGame()};if(XQNet.active()&&XQNet.game()&&!XQNet.game().result&&XQNet.side())XQNet.leave();go()};
    const ft=XQNet.tcOf(x.from),mt=XQNet.tc(),diff=ft&&!XQNet.isBot(x.from.id)&&ft!==mt;
    /* 意見回饋 328：時制不一樣不能直接開局，要先同意改成一樣 */
    if(diff)modal(`<div class="em">⚔</div><h2>${esc(lbnShow(x.from))} 邀請你下一盤</h2>${isCloud(x.from.id)?`<p style="margin:2px 0 6px">${cloudTag(true,true)}</p>`:""}<p>⏱ 時制不一樣：對方每方 <b>${ft} 分鐘</b>，你設每方 <b>${mt} 分鐘</b>。<br>要改成一樣才能開局。</p>${typeof ruleLine==="function"?ruleLine(x):""}`,
      [[`改成 ${ft} 分鐘並接受`,()=>{XQNet.setTc(ft);acc()}],["婉拒",()=>XQNet.respond(x,false),true],...(typeof lbsInviteBtn==="function"?[lbsInviteBtn(x)]:[])],"keep");   /* 意見回饋 607：對戰邀請換頁也不關 */   /* 回饋 841（開發者 11/9 選：大廳檢舉封鎖）：多一顆「🚫 婉拒並封鎖」（m/07x4-lobbysafe.js） */
    else modal(`<div class="em">⚔</div><h2>${esc(lbnShow(x.from))} 邀請你下一盤</h2>${isCloud(x.from.id)?`<p style="margin:2px 0 6px">${cloudTag(true,true)}</p>`:""}<p class="muted">每方 ${ft||mt} 分鐘。接受後紅黑隨機決定，紅方先走。</p>${typeof ruleLine==="function"?ruleLine(x):""}`,
      [["接受",acc],["婉拒",()=>XQNet.respond(x,false),true],...(typeof lbsInviteBtn==="function"?[lbsInviteBtn(x)]:[])],"keep")});
  XQNet.on("tcwait",x=>{const o=(x.list||[]).filter(z=>z.tc).map(z=>`${lbnShow(z.id||"",z.name)}（${z.tc} 分）`).slice(0,3).join("、");if(o)toast(`⏱ 大廳裡 ${o} 也在找對手，但時制跟你（${x.tc} 分）不一樣。點他的名字邀請，講好時制再開局`)});
  XQNet.on("cancel",x=>toast(`${lbnShow(x.from)} 取消了邀請`));
  XQNet.on("friendly",x=>{try{const R=x&&x.rc&&window.XQCore&&XQCore.RULESETS&&XQCore.RULESETS[x.rc.rulesetId];toast(`⚖️ 這盤是友誼賽、不計積分：雙方的棋規設定不一樣，或用了原型棋規（這盤照${R?R.name:"千秋休閒規則"}判）`)}catch(e){}});   /* 11/11 Gemini 架構報告第一項：net.js 握手比對棋規 */
  XQNet.on("abnormal",()=>{try{modal(`<div class="em">⚠️</div><h2>對手送來不合規則的棋步</h2><p class="muted">已經擋下來了，你的棋盤沒有被改。這盤改成友誼賽，不計分。如果一直等不到對方，可以先離開這盤。</p>`,[["知道了",null]])}catch(e){toast("⚠ 對手送來不合規則的棋步，已擋下；這盤改成友誼賽，不計分")}});   /* 開發者 11/11 選大廳規劃書票 2.2 */
  XQNet.on("rated",x=>{try{window.dispatchEvent(new CustomEvent("xq-result",{detail:x.res==="w"?"win":x.res==="l"?"lose":"draw"}))}catch(e){}});
  XQNet.on("rated",x=>setTimeout(()=>toast(`${x.res==="w"?"🏆 贏了":x.res==="l"?"輸了":"和棋"}　積分 ${x.d>0?"+"+x.d:x.d<0?x.d:"±0"}　→ ${x.pts} 分`+(x.rank!==x.was?`（${x.d>0?"升":"降"}為 ${x.rank}）`:"")),1200));
  XQNet.on("start",()=>{closeSheet();toast("對方接受了！"+(XQNet.side()==="b"?"你執黑，對方先走":"你執紅先走"));goGame()});
  XQNet.on("matchfail",x=>{toast(x.auto?"對方離開了，繼續幫你找對手…":"對方離開了，這盤沒有開始");location.hash="#/lobby"});
  XQNet.on("matched",x=>{vibrate([40,60,40]);closeSheet();toast(`🎲 配對成功：對手是 ${lbnShow("",x.name)}`);goGame()})}

// ================= 分享：讓別的手機也裝象棋千秋 =================
const APP_HOME="https://raysonchen2023-cloud.github.io/xiangqi-lab/";
// 開發者模式：電腦網頁一律是；手機要在 設定→進階 自己打開。掃過電腦 QR code 的玩家也只是玩家，看不到「電腦」相關的字
const DEVMODE=()=>!OFF||!!store.get("devMode",false);
// 開發者登入：在 App 裡檢查（只放「帳號＋密碼」的雜湊值，不放明碼）。這只是畫面開關；
// 回饋資料放在 Google 的意見回饋管理頁，只有登入開發者 Google 帳號才打得開，那才是真正的保護。
const DEV_HASH="81c6d32f5f50f465602de00d0b4896216b2f5ccb497c57809486282d9cca0779";
async function devHash(u,p){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("xqlab-dev:"+u+":"+p));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function devLogin(ok){sheet("🔒 開發者登入",b=>{const inp='width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:inherit;margin:4px 0 10px;-webkit-user-select:text;user-select:text';
  b.innerHTML=`<p class="muted">開發者模式要輸入帳號和密碼。一般玩家不用打開。</p>
    <input id="du" placeholder="帳號" autocomplete="username" autocapitalize="off" style="${inp}"><input id="dp" type="password" placeholder="密碼" autocomplete="current-password" style="${inp}">
    <p id="de" style="color:var(--red);min-height:1.4em;margin:0 0 6px"></p><button class="btn" id="dg">登入</button>`;
  const go=async()=>{const u=b.querySelector("#du").value.trim(),p=b.querySelector("#dp").value;if(!u||!p)return;
    let h="";try{h=await devHash(u,p)}catch(e){}
    if(h===DEV_HASH){closeSheet();ok()}else{b.querySelector("#de").textContent="帳號或密碼不對";b.querySelector("#dp").value="";vibrate([30,40,30])}};
  b.querySelector("#dg").onclick=go;b.querySelector("#dp").onkeydown=e=>{if(e.key==="Enter")go()};setTimeout(()=>b.querySelector("#du").focus(),300)})}
// 意見回饋管理頁（Google Apps Script，存取權「只有我自己」）：用瀏覽器打開，要登入開發者的 Google 帳號
const FB_ADMIN_URL="https://script.google.com/macros/s/AKfycbxlSyGWkr3Kmfp9fiTmrFyhg3x6D50gJBlo3cM0LwxAJikyN9oHTZBTkxBYJSvIx7RZVg/exec";
function openFbAdmin(){const w=window.open(FB_ADMIN_URL,"_blank");if(!w)location.href=FB_ADMIN_URL}
const DEVREMOTE=()=>OFF&&DEVMODE()&&!!(window.XQ&&XQ.remoteInfo&&XQ.remoteInfo());
// ================= 加到主畫面：用瀏覽器打開時問一次，玩家自己決定 =================
// iPhone 不能用程式安裝，只能教步驟；Android 可以直接跳出系統的安裝視窗。LINE 內建瀏覽器不能加，要先改用手機的瀏覽器。
let installEvt=null;addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e});
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||!!navigator.standalone||/XQQianqiuApp\//.test(navigator.userAgent);   /* 11/13 Android 模擬器驗證：原生 App（Capacitor，UA 尾巴加 XQQianqiuApp/1，xiangqi-android／xiangqi-ios 的 capacitor.config.json）本來就是獨立 App，不跳「加到主畫面」那套教學 */
function installGuide(manual){if(isStandalone())return;const ua=navigator.userAgent,inLine=/ Line\/[0-9]/i.test(ua),ios=MY_KIND==="iPhone"||MY_KIND==="iPad";
  const later=()=>store.set("instAsk",{at:Date.now()}),never=()=>store.set("instAsk",{no:true});
  if(inLine)return modal(`<div class="em">📲</div><h2>用手機的瀏覽器打開</h2><p class="muted">在 LINE 裡沒辦法把象棋千秋加到主畫面。按下面的按鈕，會改用 ${ios?"Safari":"Chrome"} 打開，再照步驟加到主畫面。</p>`,
    [["用瀏覽器打開",()=>{later();location.href=APP_HOME+"?openExternalBrowser=1"}],["不用了",never,true]]);
  if(installEvt)return modal(`<div class="em">📲</div><h2>把象棋千秋加到主畫面？</h2><p class="muted">之後從主畫面點圖示就能打開，全螢幕、沒網路也能下棋。</p>`,
    [["安裝",async()=>{const e=installEvt;installEvt=null;try{await e.prompt();const c=await e.userChoice;if(c&&c.outcome==="accepted")never();else later()}catch(x){later()}}],["稍後",later,true],["我已經裝了／不用了",never,true]]);
  modal(`<div class="em">📲</div><h2>把象棋千秋加到主畫面？</h2><p class="muted" style="margin-bottom:8px">加了之後，從主畫面點圖示就能打開，全螢幕、沒網路也能下棋。</p>
    <div style="text-align:left;line-height:2;font-size:15px">${ios?a2hsSteps(ua)
      :`1. 點瀏覽器右上角的 <b>⋮</b> 選單<br>2. 點 <b>「加到主畫面」</b>或<b>「安裝應用程式」</b><br>3. 按 <b>「新增」</b>`}</div>`,
    [["好，我現在加",()=>{later();a2hsArrow(ua)}],...(ios&&!/Safari/.test(ua.replace(/CriOS|FxiOS|EdgiOS|Ddg/g,"X"))||/CriOS|FxiOS|EdgiOS|Ddg/.test(ua)?[["複製網址（改用 Safari 開）",()=>{later();try{navigator.clipboard.writeText(APP_HOME);toast("已複製網址：打開 Safari 貼到網址列")}catch(e){toast(APP_HOME)}}]]:[]),["我已經加過了",never,true],["不用了",never,true]])}
/* 意見回饋 581：iPhone 不能用程式自動加到主畫面（蘋果不開放），只能教步驟。iOS 26 起 Safari 的分享按鈕收進網址列旁的「⋯」裡，舊的寫法照著做找不到 */
const iosVer=ua=>{const m=String(ua).match(/OS (\d+)_/);return m?+m[1]:0};
function a2hsSteps(ua){const v=iosVer(ua);
  if(/CriOS/.test(ua))return`1. 點網址列右邊的 <b>分享</b> 按鈕 <span style="font-size:18px">⬆️</span><br>2. 點 <b>「加入主畫面」</b> ➕<br>3. 按 <b>「加入」</b><br><span class="muted" style="font-size:13px">找不到的話，按下面的「複製網址」，改用 Safari 打開再加</span>`;
  if(/FxiOS|EdgiOS|Ddg/.test(ua))return`1. 點瀏覽器的 <b>選單</b>，找到 <b>分享</b> ⬆️<br>2. 點 <b>「加入主畫面」</b> ➕<br><span class="muted" style="font-size:13px">這個瀏覽器不一定有這個選項；找不到就按下面的「複製網址」，改用 Safari 打開再加</span>`;
  if(v>=26)return`1. 點畫面最下面、網址列右邊的 <b>⋯</b>（三個點）<br>2. 點 <b>「分享」</b> ⬆️<br>3. 往下滑，點 <b>「加入主畫面」</b> ➕<br>4. 「打開為網頁 App」保持打開，按右上角 <b>「加入」</b>`;
  return`1. 點 Safari 下方（或上方）的 <b>分享</b> 按鈕 <span style="font-size:18px">⬆️</span><br>2. 往下滑，點 <b>「加入主畫面」</b> ➕<br>3. 按右上角 <b>「加入」</b>`}
/* 跳動的箭頭指著那顆按鈕：iOS 26 Safari 在右下角（⋯）、舊版 Safari 在下方中間（分享）、Chrome 在右上角；15 秒或點一下就消失 */
function a2hsArrow(ua){if(!/iPhone|iPad/.test(MY_KIND)||/FxiOS|EdgiOS|Ddg/.test(ua))return;const top=/CriOS/.test(ua),right=top||iosVer(ua)>=26;document.getElementById("a2hA")?.remove();
  const a=document.createElement("div");a.id="a2hA";a.innerHTML=`<b>${top?"⬆":"⬇"}</b><small>${top?"點這裡的分享":iosVer(ua)>=26?"點這裡的 ⋯":"點這裡的分享"}</small>`;
  a.style.cssText=`position:fixed;z-index:9999;${top?"top:6px":"bottom:6px"};${right?"right:14px":"left:50%;margin-left:-60px"};width:120px;text-align:center;pointer-events:auto;color:#fff;font-weight:900;text-shadow:0 2px 6px #000;animation:a2hb .8s ease-in-out infinite alternate`;
  a.querySelector("b").style.cssText="display:block;font-size:44px;line-height:1";a.querySelector("small").style.cssText="display:inline-block;margin-top:2px;padding:3px 8px;border-radius:8px;background:rgba(179,38,30,.92);font-size:13px";
  if(!document.getElementById("a2hK")){const k=document.createElement("style");k.id="a2hK";k.textContent=`@keyframes a2hb{from{transform:translateY(0)}to{transform:translateY(${top?"-":""}10px)}}`;document.head.append(k)}
  a.onclick=()=>a.remove();document.body.append(a);setTimeout(()=>a.remove(),15000)}
// 用瀏覽器打開時自動問一次（手機才問；說過不用就不再問；按「稍後」7 天後再問）
/* 開發者 11/6：開頭畫面、序幕或別的視窗開著時先不問，等它們關了再問（最多等 3 分鐘），免得兩個視窗疊在一起 */
if(OFF&&!isStandalone()&&/iPhone|iPad|Android/.test(MY_KIND)){let instTry=0;const instAsk=()=>{const a=store.get("instAsk",null);if(a&&(a.no||Date.now()-a.at<7*864e5))return;if(document.querySelector(".modal")||document.body.classList.contains("xqt-on")||document.getElementById("sheet")){if(++instTry<45)setTimeout(instAsk,4000);return}installGuide(false)};setTimeout(instAsk,2500)}
// 網址上的 ?openExternalBrowser=1 只是給 LINE 看的，打開後拿掉
if(/[?&]openExternalBrowser=1/.test(location.search))try{history.replaceState(history.state,"",location.pathname+location.hash)}catch(e){}
async function shareSheet(){
  const app=(OFF&&/^https:/.test(location.origin)?location.origin+location.pathname:APP_HOME)+"?openExternalBrowser=1";   // LINE 裡點開會改用手機的瀏覽器
  // 給一般玩家：只有 App 本身。連到電腦的 QR code 放在「🔗 連線到電腦」裡（只有連過電腦的裝置看得到）
  try{await loadScript("qrcode.min.js")}catch(e){return toast(e.message)}
  sheet("分享象棋千秋",b=>{
    b.innerHTML=`<p style="text-align:center">朋友用手機相機掃這個 QR code，就能打開<b>象棋千秋</b>。</p>
      <div class="qrbox" id="qrc"></div>
      <p class="muted" style="text-align:center;margin:4px 0 10px">iPhone：Safari 打開 → 分享 →「加入主畫面」<br>Android：Chrome 選單 →「加到主畫面」<br>有新版會自動更新，不用再分享一次。</p>
      <button class="btn" id="sh">${navigator.share?"用 LINE／訊息分享連結":"複製連結"}</button>`;
    new QRCode(b.querySelector("#qrc"),{text:app,width:220,height:220,correctLevel:QRCode.CorrectLevel.L});
    b.querySelector("#sh").onclick=async()=>{
      if(navigator.share){try{await navigator.share({title:"象棋千秋",text:"一起來下象棋：",url:app})}catch(e){}return}
      try{await navigator.clipboard.writeText(app);toast("已複製連結")}catch(e){prompt("複製這個連結",app)}}})}
// 給開發者：讓自己的另一台裝置也連到電腦（含存取碼，只給自己或信任的人）
async function deviceQR(base,key){
  const app=/^https:/.test(location.origin)?location.origin+location.pathname:APP_HOME,u=`${app}#connect=${encodeURIComponent(base)}&k=${encodeURIComponent(key)}`;
  try{await loadScript("qrcode.min.js")}catch(e){return toast(e.message)}
  sheet("讓另一台裝置連到電腦",b=>{b.innerHTML=`<p style="text-align:center">用另一台手機／平板的相機掃這個 QR code，打開後就會連到你的電腦。</p><div class="qrbox" id="qrc"></div>
    <p class="muted" style="text-align:center">⚠ 含存取碼：掃到的人能操作電腦上的對局。只給自己的裝置或信任的人。</p>`;
    new QRCode(b.querySelector("#qrc"),{text:u,width:220,height:220,correctLevel:QRCode.CorrectLevel.L})})}

