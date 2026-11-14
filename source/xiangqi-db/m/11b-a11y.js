/* 11/12 無障礙（評比循環第 3 輪新增「無障礙專家」P16；Gemini、ChatGPT 都要求「無障礙語意模式與自動稽核」「低視力高對比與動態字體」）。
   ① ♿ 螢幕報讀與鍵盤模式（store axMode；html[data-axm]）：下棋一律平面棋盤（focusOn() 會看這個開關）、關掉裝飾動畫；
      棋盤每一格念「紅方 炮，八路，第三排」（01-board axSync 用 axmCellLabel），每步念「你走 炮二平五」「電腦走 馬8進7；輪到你」（axmMoveLine）；
      鍵盤：B 跳到棋盤、方向鍵移動、Enter 選子落子、R 讀出盤面、S 讀狀態和棋鐘、M 讀上一步、? 說明；棋鐘剩 5 分、1 分、30 秒、10 秒時念出來。
      沒開也會自動提示一次：用 Tab 鍵操作、系統「減少動態效果」、Windows 強制色彩（forced-colors）。
   ② 高對比主題（store hcTheme；html[data-hct]）：白底黑字，字和棋盤線、棋子字對比都在 7:1 以上（數字見 axmHcv()／axmHcb()，m.css 檔尾「11/12 無障礙」那段用同一組色碼，test-a11y.js 會核對）；
      棋盤照「高對比棋子」畫（黑子反白、可走的點＝黃點黑邊、可吃＝四角框、將軍＝「將」字黃牌），紅子字改深紅 #A30000。
   ③ 字級：05-settings FZ_STEPS 多「超大 1.6」「最大 2.0」；「跟著系統字級」（store fzSys）用 iPhone 的 -apple-system-body（17px＝1 倍），其他手機用瀏覽器預設字級（16px＝1 倍）。
   ④ 全頁保險：圖示按鈕沒有名字就補 aria-label（照 title 或常見圖示）、role=button 補 tabindex 和 Enter／空白鍵、<img> 沒 alt 補 alt=""；
      卡片（#sheet）、確認框（.modal）、宣告 aria-modal 的 [role=dialog]（頁面上常駐的面板不鎖）：補 role／aria-modal／名字，焦點移進去、Tab 鎖在裡面，關掉後焦點回到原本的按鈕。
   靜態稽核：xiangqi-lab/tools/a11y-audit.js → story/92_無障礙稽核報告.md；測試：xiangqi-lab/tools/test-a11y.js。
   第 4 輪（聲音方位與動作提示音、換頁／載入念出來、空間導覽、園子地點清單）在 m/11c-a11ysnd.js，測試 test-a11y-audio.js。 */
/* #AXM-PURE-BEGIN：到 #AXM-PURE-END 是不碰畫面的純函式，test-a11y.js 用 vm 直接載入 */
/* 注意：這個檔 include 在最後，但第一頁的棋盤在前面的檔載入時就會畫（route()），會呼叫到這裡的函式——
   所以別的檔會用到的一律寫成 function（會提前宣告），不用 const（還沒跑到時取用會出錯） */
function axmCN(i){return"一二三四五六七八九十".charAt(i-1)}
function axmPN(){return{r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"}}}
function axmSide(p){return p?(p===p.toUpperCase()?"r":"b"):null}
/* 棋子念法：「紅方 炮」 */
function axmPcName(p){if(!p)return"";const s=axmSide(p),N=(typeof NAMES!=="undefined"&&NAMES)||axmPN();return(s==="r"?"紅方 ":"黑方 ")+N[s][p.toUpperCase()]}
/* 一格的位置（k＝畫面上的格子編號 0～89，左上 0、右下 89）：右邊數來第幾路、下面數來第幾排（都照玩家看出去的方向） */
function axmPos(k){return[axmCN(9-k%9)+"路","第"+axmCN(10-(k/9|0))+"排"]}
/* 格子的 aria-label：「紅方 炮，八路，第三排」；空格「八路，第三排，空」 */
function axmCellLabel(p,k){const[f,r]=axmPos(k);return p?axmPcName(p)+"，"+f+"，"+r:f+"，"+r+"，空"}
/* 一步棋念法。o：{side 走的那方, me 玩家那方（沒有＝看棋譜，用紅方／黑方）, cn 著法, cap 被吃的子, check, mate, opp 對手叫法（預設「對方」）, over 已結束} */
function axmMoveLine(o){o=o||{};const mine=o.me&&o.side===o.me,who=o.me?(mine?"你":(o.opp||"對方")):(o.side==="r"?"紅方":"黑方");
  let s=who+"走 "+(o.cn||"");if(o.cap)s+="，吃"+axmPcName(o.cap);if(o.mate)s+="，將死";else if(o.check)s+="，將軍";
  if(o.me&&!mine&&!o.mate&&!o.over)s+="；輪到你";return s}
/* WCAG 相對亮度與對比 */
function axmRgb(c){c=String(c||"").trim();let m=c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(m){let h=m[1];if(h.length===3)h=h.split("").map(x=>x+x).join("");return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}
  m=c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);return m?[+m[1],+m[2],+m[3]]:null}
function axmLum(c){const v=Array.isArray(c)?c:axmRgb(c);if(!v)return null;const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(v[0])+.7152*f(v[1])+.0722*f(v[2])}
function axmContrast(a,b){const x=axmLum(a),y=axmLum(b);if(x==null||y==null)return null;return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
/* 高對比主題的頁面色（m.css 檔尾那段要一樣）與棋盤色 */
function axmHcv(){return{bg:"#FFFFFF",card:"#FFFFFF",ink:"#000000",muted:"#1F1F1F",line:"#000000",accent:"#8A1C00",accent2:"#00563B",red:"#A30000",blk:"#000000",warn:"#6B4000",info:"#003A80",bar:"#000000",barink:"#FFFFFF",btn:"#8A1C00"}}
function axmHcb(){return{bg:["#FFFFFF","#FFFFFF"],grid:"#000000",piece:"#FFFFFF",r:"#A30000",b:"#000000",mv:"#0040C0",bevel:0,tex:""}}
/* 系統字級 → 倍數（0.9～2，取到 0.05） */
function axmSysScale(px,base){px=+px;base=+base||17;if(!(px>0))return 1;const z=Math.round(px/base*20)/20;return Math.max(.9,Math.min(2,z))}
/* 倍數最接近哪一檔字級（CSS 的 html[data-fz=…] 規則照檔位走） */
function axmFzNear(z,steps){let best=null,d=1e9;for(const s of steps||[]){const e=Math.abs(s[2]-z);if(e<d){d=e;best=s[0]}}return best}
/* 棋鐘字（"4:59"、"0:09"、"1:02:03"）→ 秒 */
function axmClockSec(t){const m=String(t||"").match(/(\d+):(\d{2})(?::(\d{2}))?/);if(!m)return null;return m[3]!=null?(+m[1])*3600+(+m[2])*60+(+m[3]):(+m[1])*60+(+m[2])}
/* 棋鐘跨過 5 分、1 分、30 秒、10 秒時要念的話（沒跨過＝""） */
function axmClockSay(prev,cur,who){if(prev==null||cur==null||cur>=prev)return"";if(prev>0&&cur<=0)return(who||"你")+"的時間到了，超時";   /* 第 5 輪：到 0 念「超時」（呼叫的地方改用 assertive） */
  for(const t of[300,60,30,10])if(prev>t&&cur<=t)return(who||"你")+"的時間剩 "+(t>=60?t/60+" 分鐘":t+" 秒");return""}
/* 第 5 輪 P16.5「我在哪裡」（W 鍵）：o＝{page 頁名, focus 焦點說明, game:{turn 輪到誰, sel 選了哪顆, last 上一步}（不是對局頁＝沒有）, map 本頁地圖} */
function axmWhereText(o){o=o||{};const L=["你在："+(o.page||"象棋千秋")];L.push(o.focus?"焦點在："+o.focus:"焦點還沒停在任何按鈕上，按 Tab 開始");
  if(o.game){const g=o.game;if(g.turn)L.push(g.turn);L.push(g.sel?"選了："+g.sel:"還沒選子");L.push(g.last?"上一步："+g.last:"還沒有走棋")}
  if(o.map)L.push(o.map);return L.join("。")}
/* 第 5 輪：螢幕報讀模式第一次打開的介紹（60 字內，ChatGPT 版加上 B 鍵） */
const AXM_INTRO="已開啟螢幕報讀與鍵盤模式。用 Tab 換區塊、B 到棋盤、方向鍵移動、Enter 選子或落子，按 ? 看說明。";
/* 第 5 輪：換字級時的提示（toast＋螢幕報讀播報，畫面上不留字）；標準、小＝"" */
function axmFzTip(k){if(k==="max")return"目前是最大字級（2 倍）：較擠的地方改成換行或上下捲動閱讀。";if(k==="l"||k==="xl"||k==="xxl")return"已放大字級：較擠的地方會換行或改成上下捲動。";return""}
/* 只有圖示的按鈕叫什麼 */
const AXM_ICON={"✕":"關閉","×":"關閉","✖":"關閉","‹":"返回","‹ ":"返回","←":"返回","›":"下一個","→":"下一個","↶":"悔棋","↺":"重來","↻":"重下","＋":"新增","+":"新增","⚙":"設定","🏠":"首頁","🔊":"聲音開","🔇":"聲音關","📖":"檢討","🏳":"認輸","🎒":"寶物","👁":"偷看","🧪":"擺盤","📋":"清單","📤":"分享","🔍":"搜尋","ⓘ":"說明","ℹ":"說明","❓":"說明","?":"說明","？":"說明","☰":"選單","⋯":"更多","…":"更多","▶":"播放","⏸":"暫停","⏮":"第一步","⏭":"最後一步","◀":"上一步","⏪":"上一步","⏩":"下一步","🗑":"刪除","✏":"編輯","✎":"編輯","📷":"拍照","🔄":"重新整理","⟳":"重新整理","💬":"意見回饋","🌐":"線上","📚":"棋譜","🏯":"朝代擂台","🌳":"園子","🔁":"重練","💡":"提示","⭐":"收藏","★":"收藏","☆":"收藏","✓":"確定","✔":"確定"};
/* 11/13 開發者實機旁白錄影：按鈕和狀態列裡的圖示被念成「西洋棋」「帆船」「思考的表情」，「・」被念成「間隔號」。按鈕：文字含圖示或「・」就補一個語音名稱（去掉圖示、・換成逗號），文字變了跟著換；播報區：圖示和・包成 aria-hidden，畫面不變 */
const AXM_PICT=/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/u;
function axmSpeak(t){return String(t||"").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu,"").replace(/\s*・\s*/g,"，").replace(/\s+/g," ").replace(/^[\s，]+|[\s，]+$/g,"").trim()}
function axmHideIn(root){if(!root||root.nodeType!==1)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),L=[];let n;while((n=w.nextNode()))if(n.nodeValue&&(AXM_PICT.test(n.nodeValue)||n.nodeValue.includes("・"))&&!(n.parentElement&&n.parentElement.closest("[aria-hidden=true],svg")))L.push(n);
  for(const t of L){const f=document.createDocumentFragment();for(const part of t.nodeValue.split(/((?:[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]+)|・)/u)){if(!part)continue;if(AXM_PICT.test(part)||part==="・"){const sp=document.createElement("span");sp.setAttribute("aria-hidden","true");sp.textContent=part;f.append(sp)}else f.append(document.createTextNode(part))}t.replaceWith(f)}}
function axmIconName(text,title){const t=String(text||"").replace(/\s+/g,"");if(title&&String(title).trim())return String(title).trim();if(!t)return null;if(AXM_ICON[t])return AXM_ICON[t];const t2=[...t].filter(c=>c.charCodeAt(0)!==0xFE0F&&c.charCodeAt(0)!==0x200D).join("");return AXM_ICON[t2]||null}
/* #AXM-PURE-END */
function axmOn(){try{return!!store.get("axMode",false)}catch(e){return false}}
function axmHct(){try{return!!store.get("hcTheme",false)}catch(e){return false}}
function axmApply(){const r=document.documentElement;r.toggleAttribute("data-axm",axmOn());r.toggleAttribute("data-hct",axmHct());
  try{if(typeof focusApply==="function")focusApply()}catch(e){}
  const sk=document.getElementById("axmSkip");if(sk)sk.textContent=axmOn()?"♿ 螢幕報讀與鍵盤模式：開著（按一下關掉）":"♿ 開啟螢幕報讀與鍵盤模式";
  try{const mt=document.querySelector('meta[name="theme-color"]');if(mt&&axmHct())mt.content="#000000"}catch(e){}}
/* 系統字級：iPhone 用 -apple-system-body（標準 17px），其他用瀏覽器預設的 medium（標準 16px）；回傳 [最接近的檔位, 倍數] */
function axmSysFz(){try{if(!document.body)return null;const e=document.createElement("span"),ap=!!(window.CSS&&CSS.supports&&CSS.supports("font","-apple-system-body"));
    e.style.cssText="position:absolute;visibility:hidden;pointer-events:none;left:-9999px;"+(ap?"font:-apple-system-body":"font-size:medium");e.textContent="字";document.body.append(e);
    const px=parseFloat(getComputedStyle(e).fontSize);e.remove();const z=axmSysScale(px,ap?17:16);return[axmFzNear(z,typeof FZ_STEPS!=="undefined"?FZ_STEPS:[["n","",1]])||"n",z]}catch(e){return null}}
function axmSet(on){store.set("axMode",!!on);store.set("axmAsk",1);axmApply();
  if(on){try{if(typeof PARK!=="undefined"&&PARK){PARK.v.destroy();PARK=null}}catch(e){}}
  try{toast(on?"♿ 螢幕報讀與鍵盤模式已開啟":"♿ 螢幕報讀與鍵盤模式已關閉")}catch(e){}
  const first=on&&!store.get("axmIntro",0);if(first)store.set("axmIntro",1);   /* 第 5 輪：第一次開念完整介紹，之後只提 ? 和 W */
  try{axSay(on?(first?AXM_INTRO:"螢幕報讀與鍵盤模式已開啟。按 ? 聽鍵盤說明，W 聽你在哪裡。"):"螢幕報讀與鍵盤模式已關閉")}catch(e){}
  const sw=document.getElementById("axmSw");if(sw)sw.checked=!!on}
function axmHctSet(on){store.set("hcTheme",!!on);axmApply();const tx=on?"已切換高對比：文字、棋線與焦點框更明顯；可走、可吃、將軍也用形狀標示。":"高對比主題：關";try{toast(tx)}catch(e){}try{axSay(tx)}catch(e){}
  const sw=document.getElementById("hctSw");if(sw)sw.checked=!!on;
  setTimeout(()=>{try{if(location.hash.indexOf("#/settings")===0&&typeof route==="function")route()}catch(e){}},50)}
/* 設定頁「系統」分頁最上面的「♿ 無障礙」卡片（05-settings 呼叫） */
function axmSetRows(){const R=(id,t,d,on,lb)=>`<label class="row" style="justify-content:space-between;padding:8px 2px;gap:10px"><span style="min-width:0"><b>${t}</b><br><span class="muted" style="font-size:12.5px">${d}</span></span><input type="checkbox" class="sw" id="${id}"${on?" checked":""} aria-label="${lb}"></label>`;
  return`<div class="sec-t" style="margin-top:4px" id="axmT">♿ 無障礙</div><div class="card sgc" role="group" aria-labelledby="axmT" style="padding:4px 12px">`
    +R("axmSw","♿ 螢幕報讀與鍵盤模式","下棋一律用平面棋盤（3D 園子改用地點清單），每一格都念得出來；方向鍵移動、Enter 選子落子；每一步念出來；關掉裝飾動畫",axmOn(),"螢幕報讀與鍵盤模式")
    +(typeof axsSetRow==="function"?axsSetRow():"")
    +R("hctSw","高對比主題（低視力）","白底黑字、黑色棋盤線；主要文字和棋子字對比 7 比 1 以上（圖片上的字另外檢查）；提示用形狀加顏色",axmHct(),"高對比主題")
    +`<p class="muted" style="font-size:12.5px;margin:6px 2px 8px">字級可以到「最大」2 倍，預設跟著手機的字級：在設定房間的「🖌 字體」。鍵盤：B 棋盤、R 讀盤面、S 狀態、M 上一步、W 我在哪、? 說明。</p>`
    +`<div class="row" style="gap:8px;flex-wrap:wrap;padding:0 2px 10px"><button type="button" class="btn ghost" data-xqdoc="a11y" style="width:auto;margin:0;padding:6px 12px;font-size:13.5px;min-height:44px">📋 測試與證據</button></div></div>`}   /* 第 5 輪：P16.3～P16.5 怎麼驗證（art/docs/a11y.md，XQDOC.a11y） */
function axmFzSysRow(){let on=false;try{on=fzSysOn()}catch(e){}
  return`<label class="row" style="justify-content:space-between;padding:6px 2px;gap:10px"><span style="min-width:0"><b>跟著系統字級</b><br><span class="muted" style="font-size:12.5px">盡量跟著手機設定的文字大小，實際效果依手機與瀏覽器而定（iPhone：設定 → 輔助使用 → 顯示與文字大小 → 更大的文字）</span></span><input type="checkbox" class="sw" id="fzSysSw"${on?" checked":""} aria-label="跟著系統字級"></label>`}
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.id)return;
  if(t.id==="axmSw")axmSet(t.checked);
  else if(t.id==="hctSw")axmHctSet(t.checked);
  else if(t.id==="fzSysSw"){store.set("fzSys",!!t.checked);try{fzApply()}catch(x){}try{toast(t.checked?"字級跟著系統":"字級照 App 裡選的")}catch(x){}}});
document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("button[data-fz]");if(!b)return;store.set("fzSys",false);const sw=document.getElementById("fzSysSw");if(sw)sw.checked=false;try{fzApply()}catch(x){}});
/* iPhone 改了系統字級，回到 App 時重算 */
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&fzSysOn())try{fzApply()}catch(e){}});
/* 棋盤的鍵盤焦點框：格子那層在最底下（被棋子蓋住），所以另外在最上面畫一個黃黑雙色框（不收點選、螢幕報讀不讀） */
function axmRing(svg){if(!svg)return;const a=document.activeElement,on=a&&a.ownerSVGElement===svg&&a.dataset&&a.dataset.k!=null;let g=svg.querySelector(":scope>.axm-ring");
  if(!on){if(g)g.remove();return}
  if(!g){const NS="http://www.w3.org/2000/svg";g=document.createElementNS(NS,"g");g.setAttribute("class","axm-ring");g.setAttribute("aria-hidden","true");g.setAttribute("pointer-events","none");
    for(const[c,w]of[["#111111",10],["#FFD400",5]]){const r=document.createElementNS(NS,"rect");r.setAttribute("fill","none");r.setAttribute("stroke",c);r.setAttribute("stroke-width",w);r.setAttribute("rx","10");g.append(r)}
    const t=document.createElementNS(NS,"path");t.setAttribute("class","axm-tri");t.setAttribute("fill","#FFD400");t.setAttribute("stroke","#111111");t.setAttribute("stroke-width","3");t.setAttribute("stroke-linejoin","round");t.setAttribute("paint-order","stroke");g.append(t)}
  const x=+a.getAttribute("x"),y=+a.getAttribute("y"),w=+a.getAttribute("width"),h=+a.getAttribute("height");
  for(const r of g.querySelectorAll("rect")){r.setAttribute("x",x+3);r.setAttribute("y",y+3);r.setAttribute("width",w-6);r.setAttribute("height",h-6)}
  const tri=g.querySelector(".axm-tri");if(tri)tri.setAttribute("d",axmTriD(x,y,w,h));
  if(svg.lastChild!==g)svg.append(g)}
/* 第 5 輪 P16.3：焦點格除了黃黑框，四邊各加一個指向格心的三角形（形狀提示，不只靠顏色）。
   不用四角括號：高對比棋盤的「可以吃」已經是四角瞄準框，用同一種形狀會搞混 */
function axmTriD(x,y,w,h){const cx=x+w/2,cy=y+h/2,a=9,b=8,o=5;return`M${cx} ${y+a}L${cx-b} ${y-o}L${cx+b} ${y-o}Z M${cx} ${y+h-a}L${cx-b} ${y+h+o}L${cx+b} ${y+h+o}Z M${x+a} ${cy}L${x-o} ${cy-b}L${x-o} ${cy+b}Z M${x+w-a} ${cy}L${x+w+o} ${cy-b}L${x+w+o} ${cy+b}Z`}
document.addEventListener("focusin",e=>{const t=e.target;if(t&&t.ownerSVGElement&&t.dataset&&t.dataset.k!=null)axmRing(t.ownerSVGElement)});
document.addEventListener("focusout",e=>{const t=e.target;if(t&&t.ownerSVGElement&&t.dataset&&t.dataset.k!=null)setTimeout(()=>axmRing(t.ownerSVGElement),0)});
/* 鍵盤快捷鍵（只在螢幕報讀與鍵盤模式；打字的時候不攔） */
const AXM_HELP="鍵盤說明：B 跳到棋盤；方向鍵在格子間移動；Enter 或空白鍵選子，再按一次落子；R 讀出整個盤面；S 讀狀態和棋鐘；M 讀上一步；W 我在哪裡（頁面、焦點、輪到誰、選了哪顆、上一步、本頁地圖）；G 打開空間導覽；Tab 移到其他按鈕；Esc 關掉卡片。";
/* 第 5 輪 W 鍵：焦點說明（卡片裡的會說是哪張卡片）、對局資訊，交給 axmWhereText 組句 */
function axmFocusDesc(){const a=document.activeElement;if(!a||a===document.body||a===document.documentElement)return"";
  const cut=s=>String(s||"").replace(/\s+/g," ").trim().slice(0,40);let s="";
  if(a.ownerSVGElement&&a.dataset&&a.dataset.k!=null)s="棋盤格 "+cut(a.getAttribute("aria-label"));
  else{const lb=a.getAttribute("aria-label")||(a.labels&&a.labels[0]&&a.labels[0].textContent)||a.textContent||a.value||a.title||"",t=a.type==="checkbox"?"開關，"+(a.checked?"開著":"關著"):/^(INPUT|TEXTAREA)$/.test(a.tagName)?"輸入框":a.tagName==="SELECT"?"選單":a.tagName==="A"?"連結":"按鈕";s=(cut(lb)||"沒有名字的項目")+"（"+t+"）"}
  const d=a.closest&&a.closest("[role=dialog]");if(d){const h=d.querySelector(".sh-t,h2,h1");const n=h?cut(h.textContent):"";if(n)s="卡片「"+n+"」裡的 "+s}return s}
function axmWhereNow(){let page="";try{const ti=document.getElementById("title");page=typeof axsPageName==="function"?axsPageName(ti?ti.textContent:"",location.hash,typeof usePlace==="function"?usePlace:null):(ti?ti.textContent.trim():"")}catch(e){}
  let game=null;const pb=document.getElementById("pBot"),pt=document.getElementById("pTop");
  if(document.querySelector("#view .ax-sq")||pb){const st=document.getElementById("stat"),stx=st?st.textContent.replace(/^[^\p{L}\p{N}]+/u,"").trim():"";
    const sc=document.querySelector("#view .ax-sq [data-k][aria-label*='已選取']"),ch=document.querySelector("#strip .chip:last-child");
    game={turn:pb&&pb.classList.contains("on")?"輪到你":pt&&pt.classList.contains("on")?"輪到對手":stx,sel:sc?sc.getAttribute("aria-label").split("，").slice(0,3).join("，"):"",last:ch?ch.textContent.replace(/^\d+/,"").trim():""}}
  let map="";try{map=typeof axsPageMap==="function"?axsPageMap(location.hash):""}catch(e){}
  return axmWhereText({page,focus:axmFocusDesc(),game,map})}
function axmStatusText(){const st=document.getElementById("stat"),o=[];if(st&&st.textContent.trim())o.push(st.textContent.trim());
  const ck=(id,w)=>{const c=document.querySelector("#"+id+" .clk");if(c&&c.textContent.trim())o.push(w+"剩 "+c.textContent.trim())};ck("pBot","你");ck("pTop","對手");return o.join("。")||"這一頁沒有對局狀態"}
document.addEventListener("keydown",e=>{if(!axmOn()||e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
  const k=e.key;
  if(k==="b"||k==="B"){const q=document.querySelector(".ax-sq [data-k][tabindex='0']");if(q){e.preventDefault();q.focus()}}
  else if(k==="r"||k==="R"){const b=document.querySelector(".ax-rb");if(b){e.preventDefault();b.click()}}
  else if(k==="s"||k==="S"){e.preventDefault();axSay(axmStatusText())}
  else if(k==="m"||k==="M"){const c=document.querySelector("#strip .chip:last-child");e.preventDefault();axSay(c?"上一步："+c.textContent.replace(/^\d+/,"").trim():"還沒有走棋")}
  else if(k==="w"||k==="W"){e.preventDefault();axSay(axmWhereNow())}   /* 第 5 輪 P16.5：我在哪裡 */
  else if(k==="?"||k==="？"){e.preventDefault();axSay(AXM_HELP);try{if(typeof axsHelp==="function")axsHelp()}catch(x){}}});   /* 第 4 輪 P16.5：? 鍵另外開說明卡，裡面有「🧭 空間導覽」（11c-a11ysnd.js） */
/* 棋鐘：每秒變的字不放 aria-live（會一直念），改成 role=timer；跨過 5 分、1 分、30 秒、10 秒時念一次 */
/* 第 5 輪 P16.4 文字備援：提示音開著（沒開螢幕報讀模式也一樣）也念；超時改念在 assertive（11c axsAlert） */
{const last={};setInterval(()=>{if(!(axmOn()||(typeof axsOn==="function"&&axsOn()))||document.hidden)return;for(const[id,w]of[["pBot","你"],["pTop","對手"]]){const c=document.querySelector("#"+id+" .clk");if(!c){delete last[id];continue}
    const s=axmClockSec(c.textContent),say=axmClockSay(last[id],s,w);last[id]=s;if(say){if(s<=0&&typeof axsAlert==="function")axsAlert(say);else axSay(say)}}},1000)}
/* 對話框：補 role／aria-modal／名字；焦點移進去、Tab 鎖在裡面；關掉後焦點回原處 */
const AXM_DLG=new Map();let axmN=0;
const AXM_FOC='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),summary';
const axmFocusables=el=>[...el.querySelectorAll(AXM_FOC)].filter(x=>!x.closest("[hidden],[aria-hidden=true]")&&x.getClientRects().length);
function axmDlgAdd(el){if(AXM_DLG.has(el)||!el.isConnected)return;const a=document.activeElement;AXM_DLG.set(el,{ret:a&&a!==document.body&&!el.contains(a)?a:null});
  el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
  if(!el.hasAttribute("aria-label")&&!el.hasAttribute("aria-labelledby")){const h=el.querySelector("h1,h2,h3,.sh-t,.xqs-h");if(h&&h.textContent.trim()){if(!h.id)h.id="axmH"+(++axmN);el.setAttribute("aria-labelledby",h.id)}else el.setAttribute("aria-label","對話框")}
  if(!el.hasAttribute("tabindex"))el.setAttribute("tabindex","-1");
  setTimeout(()=>{const ae=document.activeElement;if(!el.isConnected||el.contains(ae))return;if(!axmOn()&&ae&&(ae.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)))return;const f=axmOn()?axmFocusables(el).filter(x=>!x.classList.contains("sh-x"))[0]:null;try{(f||el).focus({preventScroll:true})}catch(x){}},80)}
/* 關掉一層：等一下下（按鈕常常關掉這層、馬上開下一層），還有別層開著就把「回哪裡」交給它；都關了才把焦點還回去 */
function axmDlgGone(el){const d=AXM_DLG.get(el);AXM_DLG.delete(el);if(!d)return;
  setTimeout(()=>{const open=[...AXM_DLG.keys()].filter(x=>x.isConnected);if(open.length){const top=AXM_DLG.get(open[open.length-1]);if(top&&(!top.ret||!top.ret.isConnected))top.ret=d.ret;return}
    const a=document.activeElement;if(d.ret&&d.ret.isConnected&&(!a||a===document.body||!a.isConnected))try{d.ret.focus({preventScroll:true})}catch(x){}},30)}
const axmTopDlg=()=>{const L=[...AXM_DLG.keys()].filter(x=>x.isConnected&&!x.dataset.closing&&x.getClientRects().length);return L[L.length-1]||null};
document.addEventListener("keydown",e=>{if(e.key!=="Tab")return;const D=axmTopDlg();if(!D)return;const F=axmFocusables(D);if(!F.length){e.preventDefault();try{D.focus()}catch(x){}return}
  const a=document.activeElement,i=F.indexOf(a);
  if(!D.contains(a)){e.preventDefault();F[e.shiftKey?F.length-1:0].focus();return}
  if(e.shiftKey&&(i===0||a===D)){e.preventDefault();F[F.length-1].focus()}else if(!e.shiftKey&&i===F.length-1){e.preventDefault();F[0].focus()}},true);
/* 全頁保險：圖示按鈕補名字、role=button 補 tabindex 和鍵盤、img 補 alt、狀態列補 aria-live、棋鐘 role=timer */
function axmFix(root){if(!root||root.nodeType!==1)return;const one=el=>{
    if(el.matches("button,[role=button]")&&(!el.hasAttribute("aria-label")||el._axmAl)&&!el.hasAttribute("aria-labelledby")&&!el.classList.contains("ax-sr")){const raw=el.textContent||"",tx=raw.replace(/\s+/g,"");
      if(!/[\p{L}\p{N}]/u.test(tx)){if(!el.hasAttribute("aria-label")){const n=axmIconName(tx,el.getAttribute("title")||(el.querySelector("img[alt]:not([alt=''])")||{}).alt);if(n)el.setAttribute("aria-label",n)}}
      else if(AXM_PICT.test(raw)||raw.includes("・")){const n=axmSpeak(raw);if(n&&el.getAttribute("aria-label")!==n){el.setAttribute("aria-label",n);el._axmAl=1}}
      else if(el._axmAl){el.removeAttribute("aria-label");el._axmAl=0}}
    if(el.matches("#stat,[aria-live]")&&el.id!=="axLive"&&!el.closest("svg"))axmHideIn(el);
    /* role=button 的 div／span：原本沒有 tabindex（鍵盤到不了）或標了 data-axk（原始碼補過 role、tabindex，按鍵交給這裡）→ 補 tabindex 和 Enter／空白鍵 */
    if(el.getAttribute("role")==="button"&&el.tagName!=="BUTTON"&&!el._axmK&&(!el.hasAttribute("tabindex")||el.hasAttribute("data-axk"))&&el.getAttribute("aria-hidden")!=="true"&&!el.ownerSVGElement){el._axmK=1;if(!el.hasAttribute("tabindex"))el.setAttribute("tabindex","0");
      el.addEventListener("keydown",ev=>{if((ev.key==="Enter"||ev.key===" ")&&ev.target===el){ev.preventDefault();el.click()}})}
    if(el.tagName==="IMG"&&!el.hasAttribute("alt"))el.setAttribute("alt","");
    if(el.id==="stat"&&!el.hasAttribute("aria-live")){el.setAttribute("role","status");el.setAttribute("aria-live","polite");el.setAttribute("aria-atomic","true")}
    if(el.classList.contains("clk")&&el.closest(".player")&&!el.hasAttribute("role")){el.setAttribute("role","timer");el.setAttribute("aria-live","off")}
    if(el.matches(".modal,#sheet,.xqs,[role=dialog][aria-modal=true]"))axmDlgAdd(el)};
  one(root);root.querySelectorAll("button,[role=button],img:not([alt]),#stat,[aria-live],.clk,.modal,#sheet,.xqs,[role=dialog][aria-modal=true]").forEach(one)}
{let Q=[],tm=0;const run=()=>{tm=0;const q=Q;Q=[];for(const n of q)if(n.isConnected)try{axmFix(n)}catch(e){}};
  new MutationObserver(ms=>{for(const m of ms){for(const n of m.addedNodes)if(n.nodeType===1&&!(n instanceof SVGElement)){if(n.matches&&n.matches(".modal,#sheet,.xqs,[role=dialog][aria-modal=true]"))setTimeout(()=>axmDlgAdd(n),0);Q.push(n)}else if(n.nodeType===3&&n.parentElement&&!n.parentElement.closest("[aria-hidden=true]")){const pe=n.parentElement.closest("button,[role=button],#stat,[aria-live]");if(pe&&pe.id!=="axLive")Q.push(pe)}
      for(const n of m.removedNodes)if(n.nodeType===1&&AXM_DLG.has(n))axmDlgGone(n)}
    if(Q.length&&!tm)tm=setTimeout(run,250)}).observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{try{axmFix(document.body)}catch(e){}},500)}
/* 讀螢幕的人一進來第一個摸到的：開／關螢幕報讀與鍵盤模式（平常看不到，鍵盤聚焦時才浮出來） */
{const b=document.createElement("button");b.type="button";b.id="axmSkip";b.className="ax-sr axm-skip";b.onclick=()=>axmSet(!axmOn());document.body.prepend(b)}
axmApply();
/* 第 5 輪 P16.5：主畫面 #view 補 main 地標、頂欄補 banner（讀螢幕可以用地標跳） */
{const v=document.getElementById("view"),tb=document.getElementById("topbar");if(v&&!v.getAttribute("role"))v.setAttribute("role","main");if(tb&&!tb.getAttribute("role"))tb.setAttribute("role","banner")}
if(fzSysOn())try{fzApply()}catch(e){}
/* 自動提示一次：用 Tab 鍵、系統減少動態效果、強制色彩 */
function axmAsk(why){if(axmOn()||store.get("axmAsk",0))return;
  const busy=()=>!!document.querySelector(".modal,#sheet.show,#preov,#bhxPg,#mnfPg,#mnfRite,#xqTitle:not(.out)");   /* 11/14 r17 B4：開了「減少動態效果」6 秒後問，常常蓋在開場／開章電影或標題畫面上（略過鈕點不到）；電影、標題畫面也算忙，播完才問 */
  if(busy()){if((axmAsk.n=(axmAsk.n||0)+1)<60)setTimeout(()=>axmAsk(why),5000);return}   /* 電影可能好幾分鐘：最多等 5 分鐘 */
  store.set("axmAsk",1);const fc=!!(window.matchMedia&&matchMedia("(forced-colors: active)").matches);
  const B=[["♿ 開啟螢幕報讀與鍵盤模式",()=>axmSet(true)]];if(fc&&!axmHct())B.push(["開啟高對比主題",()=>axmHctSet(true),true]);B.push(["先不用",()=>{try{toast("之後可以在設定房間的 🔒 小鎖匣 → ♿ 無障礙打開")}catch(e){}},true]);
  modal(`<div class="em" aria-hidden="true">♿</div><h2>要開「螢幕報讀與鍵盤模式」嗎？</h2><p style="line-height:1.7">${esc(why)}。開了以後下棋用平面棋盤，每一格都念得出來，方向鍵移動、Enter 選子落子，每一步也會念出來，裝飾動畫會關掉。</p>`,B)}
{let tabs=0;document.addEventListener("keydown",e=>{if(e.key==="Tab"&&!axmOn()&&!store.get("axmAsk",0)&&++tabs===3)axmAsk("看起來你在用鍵盤操作")});
  try{const rm=matchMedia("(prefers-reduced-motion: reduce)").matches,fc=matchMedia("(forced-colors: active)").matches;if(rm||fc)setTimeout(()=>axmAsk(fc?"你的系統開了強制色彩（高對比）":"你的系統開了「減少動態效果」"),6000)}catch(e){}}
