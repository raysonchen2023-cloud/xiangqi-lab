/* ================= 🕰 時辰鐘（回饋 858）＋星槎無歲月（回饋 859）=================
   開發者 11/9 選定（討論在 story/gemini_app/52_時辰鐘五案_Gemini回覆.md、53_星槎時間不流動五案_Gemini回覆.md；考究在 story/時辰鐘考究說明.md）：
   ① 頂欄「星晷」：首頁與星槎的場景頁（SW 星槎甲板 #/adventure、#/ship/lesson｜pz｜shelf｜bag｜sail）頂欄標題底下一個程式畫的半圓盤（只露下半段，寬 160、高 38），
      沿弧排十二地支，盤面照現實時間轉（每分鐘更新），中間固定指針對準現在的時辰，中間大字「午時」；白天水墨晴空、晨昏暖色、夜裡星空。
      標題旁一行小字「⛵ 第 N 天・節氣」（取代 07w7 的 sw7HomeInfo 那行）；點盤或小字＝開船齡卡（07w7 sw7AgeCard）。
      頂欄有星晷時加 class clk-on：上下內距縮小，整條約 64px（原本 55px）。星晷節點只做一次、換頁時搬回新標題裡，所以首頁⇄星槎之間能淡入淡出。
   ② 船齡卡裡的「十二時辰香篆鐘」（clkXz）：銅香爐俯視、香灰上一條 12 段回紋香篆（每段一個時辰，子在正上方、順時針），燒過暗灰、現在這段有火光、沒燒的淺土色；
      段裡寫地支，爐沿寫現代時間；點某一段，卡片下方換成那個時辰的古名、時間、生肖（民間說法）。全部 SVG，沒有點陣圖。
   ③ 星槎無歲月：在船上（CLK_SHIP_RE 的路由，或千秋穿梭過場 .travel.qq 還在畫面上），星晷的刻度與大字淡出、換成緩緩自轉的雲河星圖（北斗七星、牽牛織女與星點連線），
      小字換「✶ 雲河無歲月」；回到陸地淡回刻度。船上開船齡卡多一句「在星槎上，時辰不走。」（香篆照真實時間畫，不停在登船那一刻）。
   ④ 爛柯懸棋：星槎甲板石桌上方一顆素面紅棋子懸在半空、微微發光、慢慢上下浮動，石桌上有淡影；放在 .shp-hl（跟船身層一起起伏、07x 縮放與左右拖動都跟著走）。
      點了開說明卡（王質觀棋，白話＋出處）。prefers-reduced-motion 不浮動、不閃。登記在 07w6b SCI_REG 的 sp2（「懸在半空的棋子」），點過算看過。
   ⑤ 上下船環境音：App 沒有雨雪風聲的環境音（07w7 雨雪只有畫面），所以只把背景音樂（01-board.js 的 BGM.a）在上船時 1 秒淡到 0.15、下船淡回 0.35；
      不接 WebAudio 低通（iOS 會把 AudioContext 關掉重建，接上的音樂元素會永遠沒聲音）。iPhone Safari 不能改 audio.volume，那裡聽不出差別。
   開關：CLK_ON（星晷＋香篆鐘）、LK_ON（爛柯懸棋）、CLK_SND_ON（音樂淡出淡入）；前綴 clk／lk */
const CLK_ON=true,LK_ON=true,CLK_SND_ON=true;
const CLK_ZHI="子丑寅卯辰巳午未申酉戌亥";
/* 十二時辰：[古名, 古名白話, 生肖圖示, 生肖, 生肖小故事（民間說法）]；古名的出處見 story/時辰鐘考究說明.md */
const CLK_SC=[
  ["夜半","半夜","🐭","鼠","半夜最安靜，老鼠最愛在這時候溜出來找東西吃。"],
  ["雞鳴","公雞開始啼叫","🐮","牛","牛吃飽了草，這時候慢慢反芻、打個盹，等天亮下田。"],
  ["平旦","天剛濛濛亮","🐯","虎","天快亮了，據說老虎這時候最有精神、最威風。"],
  ["日出","太陽從東邊出來","🐰","兔","太陽剛出來，小兔子跑出窩，吃帶著露水的青草。"],
  ["食時","吃早飯的時候","🐲","龍","傳說這時候龍在天上行雲布雨，幫大地澆水。"],
  ["隅中","太陽快走到正中間","🐍","蛇","天氣暖起來了，蛇從洞裡爬出來曬太陽。"],
  ["日中","太陽在天空正中間","🐴","馬","正中午太陽最大，馬兒最有精神，跑得最快。"],
  ["日昳","太陽開始偏西","🐑","羊","過了中午，羊兒在山坡上慢慢吃草。"],
  ["晡時","吃晚飯的時候（古人一天常吃兩頓）","🐵","猴","太陽偏西，猴子在樹林裡跳來跳去，叫得最響。"],
  ["日入","太陽下山","🐔","雞","天快黑了，雞群回到雞窩裡準備睡覺。"],
  ["黃昏","天色昏黃，快要全黑","🐶","狗","天黑了，狗狗守在門口，幫大家看家。"],
  ["人定","夜深了，大家都安歇了","🐷","豬","夜深了，豬睡得最熟，還打起呼嚕。"]];
const clkHH=i=>[(i*2+23)%24,(i*2+1)%24];   /* 子＝23–1、丑＝1–3 … */
const clkIdx=N=>Math.floor(((N.getHours()+1)%24)/2);
const clkHr=N=>N.getHours()+N.getMinutes()/60+N.getSeconds()/3600;
const clkKey=()=>typeof navKey==="function"?navKey(location.hash):(location.hash.replace(/^#/,"")||"/");
/* 算「在船上」的路由：星槎甲板、船上各頁（棋話、千秋殘局、書架、行囊、起航、正文、小關、女棋手守局）、星槎千秋殘局解題頁、千秋穿梭突發事件（攔路棋客、雲河棋寇）、星槎大掃除。
   渡口 #/port、園子、驛站、千秋石枰擇石門口都算陸地 */
const CLK_SHIP_RE=/^\/(adventure|ship(\/|$)|canju\/s\/|canju\/q\/|canju\/e\/5\/|qqev)/;
/* 頂欄放星晷的頁：首頁、星槎甲板與船上五個滿版場景頁（正文、解題頁不放，免得頂欄變高擠到棋盤） */
const CLK_DIAL_RE=/^\/(|adventure|ship\/(lesson|pz|shelf|bag|sail)|port|journey\/inn)$/;   /* 開發者 11/9「照你的建議，符合史實」：陸地上的渡口、驛站也放星晷（陸地有時辰、星槎上無歲月，對照更清楚）；園子是下棋頁，不放 */
/* 回饋 842（開發者 11/9「把時鐘放到線上／棋譜／設定左上角，拿掉原本三個頁面左上角的文字」）：這三頁（棋譜含 #/db/<書>，不含看棋的 #/db/<書>/<局>）也放星晷，頁名藏起來（字還在，給螢幕閱讀器和面板標題用） */
const CLK_NT_RE=new RegExp("^/(lobby|db|db/[^/]+|settings)$");
const CLK={el:null,sm:null,mode:"",tm:0,vt:null,va:null,vi:0};
const clkRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
/* 11/13 開發者更正：「船艙」（#/port，雲河星槎・船艙石桌）是下船以後，有人間時辰；只有在船上才沒有時間（所以船上畫面都是黑白的）。
   1216 曾把船艙算進星槎無歲月，1250 撤回，船艙照常顯示時辰 */
function clkShip(){return!!document.querySelector(".travel.qq")||CLK_SHIP_RE.test(clkKey())}
const clkP=(cx,cy,r,a)=>{const t=a*Math.PI/180;return[+(cx+r*Math.cos(t)).toFixed(2),+(cy+r*Math.sin(t)).toFixed(2)]};
function clkCss(){if(document.getElementById("clkCss"))return;const s=document.createElement("style");s.id="clkCss";s.textContent=`
#topbar.clk-on{position:relative;padding-top:calc(var(--safeT,0px) + 2px);padding-bottom:2px}
html.gapfix #topbar.clk-on{padding-top:calc(var(--safeT,0px) + 30px)}   /* 回饋 840（開發者 11/9「修正時鐘」截圖：iPhone 主畫面 App 星晷擠進瀏海、壓到標題）：02-shell 的 gapfix 會把頂欄往下推 34px，這裡原本用 #topbar 蓋掉了它，iPhone 上星晷就跑到狀態列底下；有 gapfix 時照樣多留這段 */
#topbar.clk-nt #title{color:transparent;text-shadow:none}#topbar.clk-nt #title *{visibility:hidden}
#topbar.clk-on #title{align-self:stretch;font-size:17px;line-height:20px;padding-left:62px;padding-bottom:36px}   /* 回饋 840b（開發者 11/9「時鐘還是無法完整顯示」）：改成完整小圓盤（56px）放在標題左邊，標題往右讓位；底下兩行小字＝現在的時辰、第幾天・節氣 */
.clk-box{position:absolute;bottom:2px;display:none;align-items:flex-end;gap:8px;overflow:hidden;z-index:1}#topbar.clk-on .clk-box{display:flex}
.clk-sm{display:grid;flex:0 1 auto;min-width:0;cursor:pointer;padding-bottom:1px;font:600 11.5px/1.3 var(--serif,serif);letter-spacing:.02em;opacity:.9;text-align:left}.clk-sm>span{grid-area:1/1;transition:opacity 1.1s ease}.clk-sm .clk-sl>span{display:block;white-space:nowrap}.clk-sm .clk-sl>b{display:block;font-size:15px;line-height:1.2;font-weight:900;letter-spacing:.06em;color:var(--accent,#a3361f)}.clk-sm .clk-ss{white-space:nowrap}
.clk-sm .clk-ss{opacity:0;align-self:end;font-size:12.5px}.clk-box.ship .clk-sm .clk-sl{opacity:0}.clk-box.ship .clk-sm .clk-ss{opacity:1}
.clk-dial{display:block;flex:none;width:56px;height:56px;border-radius:50%;margin:0;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.clk-dial svg{display:block;width:56px;height:56px;overflow:visible}
.clk-dial .clk-land,.clk-dial .clk-star{transition:opacity 1.1s ease}.clk-dial .clk-star{opacity:0}.clk-dial.ship .clk-land{opacity:0}.clk-dial.ship .clk-star{opacity:1}
.clk-dial .clk-rot{transform-box:view-box;transform-origin:30px 30px;transition:transform 1.2s ease}
.clk-dial .clk-spin{transform-box:view-box;transform-origin:30px 30px;animation:clkSpin 240s linear infinite}
@keyframes clkSpin{to{transform:rotate(360deg)}}
.clk-dial .clk-tw{animation:clkTw 3.2s ease-in-out infinite}@keyframes clkTw{50%{opacity:.35}}
.clk-dial:focus-visible{outline:2px solid #f3d98f;outline-offset:2px;border-radius:8px}
.modal.clk-card .box{max-height:calc(100vh - 28px);max-height:calc(100dvh - 28px);overflow-y:auto;padding:16px 16px 18px}.modal.clk-card .em{font-size:30px}.modal.clk-card h2{font-size:21px;margin:4px 0 2px}
.clk-xz{margin:10px auto 0;max-width:300px}.clk-xz svg{display:block;width:100%;max-width:280px;margin:0 auto;height:auto;touch-action:manipulation}
.clk-xz .w{cursor:pointer;fill:transparent}.clk-xz .w.sel{fill:rgba(255,206,120,.28)}
.clk-xz .emb{animation:clkEmb 1.6s ease-in-out infinite}@keyframes clkEmb{50%{opacity:.6}}
.clk-xzi{margin:6px 2px 0;padding:8px 10px;border-radius:12px;background:rgba(120,86,40,.08);text-align:left;font-size:14.5px;line-height:1.65;min-height:5.2em}
.clk-xzi b{font-size:16.5px}.clk-xzi .tm{color:#6b5a46;font-size:13.5px;margin-left:6px}.clk-xzi p{margin:3px 0 0}.clk-xzi .csrc{font-size:11px;color:var(--muted);margin:6px 0 0;line-height:1.5}.clk-xzi .fk{color:#6b5a46;font-size:12.5px}
.clk-shipl{margin:8px 0 0;font-weight:700;color:#5a4a8a}
@media (max-height:720px){.clk-xz svg{max-width:232px}.modal.clk-card .em{font-size:24px}.clk-xzi{min-height:0}}
.lk-w{position:absolute;width:7.5%;aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none;z-index:1}
.lk-b{position:absolute;inset:-12%;border-radius:50%;pointer-events:auto;border:0;padding:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.lk-b::before{content:"";position:absolute;left:50%;top:50%;width:max(100%,52px);height:max(100%,52px);transform:translate(-50%,-50%);border-radius:50%}   /* 第 12 輪 F2：外觀不變，透明點選範圍撐到 52×52 的圓（第 11 輪量到 41×41；圓形的上下緣被旁邊的東西蓋掉幾 px 也還有 44） */
.lk-f{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:lkBob 4.2s ease-in-out infinite}
.lk-p{display:block;width:66%;aspect-ratio:1/.78;border-radius:50%;background:radial-gradient(ellipse at 42% 36%,#f0735c 0,#d23a28 46%,#a8261a 78%,#7e1a12 100%);
  box-shadow:0 3px 0 #741a12,0 0 0 1px rgba(60,10,5,.35),0 0 8px 3px rgba(255,236,170,.9),0 0 20px 9px rgba(255,214,120,.55),0 0 38px 16px rgba(255,236,190,.3);position:relative;animation:lkGlow 4.2s ease-in-out infinite}
.lk-p::after{content:"";position:absolute;inset:16% 15%;border-radius:50%;border:1px solid rgba(255,215,190,.55)}
.lk-sh{position:absolute;left:50%;top:157%;width:74%;height:24%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse closest-side,rgba(30,22,16,.62),rgba(30,22,16,.3) 55%,rgba(30,22,16,0));animation:lkSh 4.2s ease-in-out infinite}
@keyframes lkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14%)}}
@keyframes lkSh{0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)}50%{opacity:.62;transform:translate(-50%,-50%) scale(.84)}}
@keyframes lkGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.12)}}
.lk-b:focus-visible{outline:2px solid #f3d98f;outline-offset:2px}
.lk-card p{line-height:1.8;margin:0 0 8px;font-size:16px}.lk-card .src{font-size:13px;color:var(--muted);line-height:1.7}.lk-card .ship{font-weight:700}
@media (prefers-reduced-motion:reduce){.clk-dial .clk-spin,.clk-dial .clk-tw,.clk-xz .emb,.lk-f,.lk-p,.lk-sh{animation:none}.clk-dial .clk-rot{transition:none}}`;document.head.append(s)}

/* ---------- ① 星晷 ---------- */
/* 天色：照小時內插 [盤上方色, 盤下方色, 字色, 星點透明度] */
const CLK_SKY=[[0,"#121a35","#26335c","#f3ead2",1],[4.5,"#141c3a","#2b3864","#f3ead2",1],[5.6,"#3b4a78","#e7b38c","#fff4e0",.35],[7,"#a9c3d2","#d7e3e3","#22201d",0],
  [16.5,"#acc4d0","#d9e4e2","#22201d",0],[17.6,"#e9b98a","#f3dcc0","#3a2618",0],[18.8,"#4a4a78","#c98b74","#fff1dc",.4],[19.6,"#141c3a","#2b3864","#f3ead2",1],[24,"#121a35","#26335c","#f3ead2",1]];
function clkSky(h){const mix=(a,b,t)=>{const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)),A=p(a),B=p(b);return"#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("")};
  for(let i=0;i<CLK_SKY.length-1;i++){const a=CLK_SKY[i],b=CLK_SKY[i+1];if(h>=a[0]&&h<=b[0]){const t=(h-a[0])/(b[0]-a[0]||1),tt=t<.5?0:1;return{c1:mix(a[1],b[1],t),c2:mix(a[2],b[2],t),ink:(tt?b:a)[3],st:a[4]+(b[4]-a[4])*t}}}return{c1:"#d6e4ec",c2:"#eef0e8",ink:"#2b2a28",st:0}}
/* 回饋 840b：完整小圓盤。圓心 (30,30)、半徑 28；地支照順時針排，指針照現在的時刻轉（0 點指子的正中間）。
   11/10 開發者「午應該是正上方，子應該是正下方」：改成傳統坐北朝南、南方在上的盤面——子在正下方、卯在左（東）、午在正上方、酉在右（西），仍是順時針；
   CLK_A0＝子的角度（90＝正下方），第 i 個地支在 CLK_A0＋30i 度，指針多轉 CLK_A0＋90 度。
   11/11 開發者「把時鐘的子和午再顛倒回來，先前的版本是正確的」：改回子在正上方、卯在右、午在正下方、酉在左（CLK_A0＝-90），仍是順時針 */
const CLK_C=[30,30],CLK_R=28,CLK_A0=-90;
function clkStars(){let a=20251109;const R=()=>(a=(a*1103515245+12345)&0x7fffffff)/0x7fffffff,[cx,cy]=CLK_C,o=[];
  for(let i=0;i<46;i++){const r=Math.sqrt(R())*(CLK_R-2),t=R()*360,[x,y]=clkP(cx,cy,r,t),s=(.3+R()*.55).toFixed(2);o.push(`<circle cx="${x}" cy="${y}" r="${s}" fill="#fff6dc" opacity="${(.45+R()*.5).toFixed(2)}"${i%6===0?' class="clk-tw"':""}/>`)}
  /* 星官大意：北斗七星、牽牛三星、織女三星（極座標 [半徑, 角度]） */
  const AST=[[[20,200],[16,212],[13,226],[11,243],[8,252],[10,266],[7,278]],[[22,20],[24,30],[26,38]],[[20,-50],[23,-42],[22,-33]]];
  AST.forEach((S,j)=>{const P=S.map(([r,t])=>clkP(cx,cy,r,t));const L=j===0?[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]]:P.map((p,i)=>[i,i+1]).slice(0,-1);
    o.push(L.map(([p,q])=>`<line x1="${P[p][0]}" y1="${P[p][1]}" x2="${P[q][0]}" y2="${P[q][1]}" stroke="#f3d98f" stroke-width=".4" opacity=".7"/>`).join(""));
    o.push(P.map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".9" fill="#ffe7a8"/>`).join(""))});
  return o.join("")}
function clkDialSvg(){const[cx,cy]=CLK_C,R=CLK_R,ns="http://www.w3.org/2000/svg",lab=[],tk=[];
  for(let i=0;i<12;i++){const a=CLK_A0+30*i,[x,y]=clkP(cx,cy,R-6.6,a);lab.push(`<text class="clk-z" data-i="${i}" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${CLK_ZHI[i]}</text>`);
    const[b1,b2]=[clkP(cx,cy,R-.8,a+15),clkP(cx,cy,R-3.2,a+15)];tk.push(`<line x1="${b1[0]}" y1="${b1[1]}" x2="${b2[0]}" y2="${b2[1]}"/>`)}
  return`<svg xmlns="${ns}" viewBox="0 0 60 60" aria-hidden="true" focusable="false"><defs><clipPath id="clkClip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    <radialGradient id="clkSkyG" cx=".5" cy=".38" r=".7"><stop class="s2" offset="0"/><stop class="s1" offset="1"/></radialGradient>
    <radialGradient id="clkStarG" cx=".5" cy=".5" r=".6"><stop offset=".1" stop-color="#26315e"/><stop offset="1" stop-color="#0c1230"/></radialGradient></defs>
    <g clip-path="url(#clkClip)"><g class="clk-land"><rect x="0" y="0" width="60" height="60" class="clk-sky0"/><rect x="0" y="0" width="60" height="60" fill="url(#clkSkyG)"/><g class="clk-lst">${clkStars()}</g>
      <g class="clk-tk" stroke-width=".7">${tk.join("")}</g><g class="clk-zs" font-weight="700" style="font-family:var(--serif,serif)">${lab.join("")}</g>
      <circle cx="${cx}" cy="${cy}" r="${R-12}" fill="none" class="clk-in" stroke-width=".5"/>
      <g class="clk-rot"><path class="clk-ptr" d="M30 30 L28.6 30.8 L30 13 L31.4 30.8 Z"/></g><circle cx="${cx}" cy="${cy}" r="2" class="clk-hub"/>
      <text class="clk-big" x="0" y="0" opacity="0"></text><path class="clk-cl" d="M0 0" fill="none"/></g>
    <g class="clk-star"><rect x="0" y="0" width="60" height="60" fill="url(#clkStarG)"/><g class="clk-spin">${clkStars()}</g></g></g>
    <circle cx="${cx}" cy="${cy}" r="${R-.8}" fill="none" stroke="#3a2a18" stroke-opacity=".75" stroke-width="1.8"/><circle cx="${cx}" cy="${cy}" r="${R-.8}" fill="none" stroke="#e8cf8e" stroke-opacity=".9" stroke-width=".6"/></svg>`}
/* 星晷和小字放在頂欄裡一個絕對定位的框（.clk-box），不放進 #title：標題文字照舊乾淨（07t3 ttDedupe、07w 面板標題都讀 #title 的字），換頁時 setTop 也不會把它洗掉，淡入淡出才接得起來 */
function clkMake(){if(CLK.box)return;const x=document.createElement("div");x.className="clk-box";
  x.innerHTML=`<button type="button" class="clk-dial">${clkDialSvg()}</button><span class="clk-sm" aria-hidden="true"><span class="clk-sl"><b></b><span></span><span></span></span><span class="clk-ss">✶ 雲河無歲月</span></span>`;
  const go=e=>{e.stopPropagation();if(typeof sw7AgeCard==="function")sw7AgeCard()};CLK.box=x;CLK.el=x.querySelector(".clk-dial");CLK.sm=x.querySelector(".clk-sm");CLK.el.onclick=go;CLK.sm.onclick=go}
/* 回饋 848（開發者 11/9「在這一頁加入在哪個朝代」）：時辰鐘旁的小字前面加上星槎停靠的朝代，例如「⛵ 魏晉・第 4 天・立冬」；還沒登船、在雲河（classic）不寫 */
const CLK_ERA={qin:"秦",han:"漢",sanguo:"三國",weijin:"魏晉",nanbei:"南北朝",sui:"隋",tang:"唐",wudai:"五代",song:"宋",yuan:"元",ming:"明",qing:"清"};
function clkEraZh(){try{const e=typeof shipAt==="function"?shipAt():"";return CLK_ERA[e]?CLK_ERA[e]+"・":""}catch(x){return""}}
function clkPaint(){const b=CLK.el;if(!b)return;const N=new Date(),h=clkHr(N),i=clkIdx(N),k=CLK_SC[i],ship=b.classList.contains("ship"),S=clkSky(h),q=s=>b.querySelector(s);
  q(".s1").setAttribute("stop-color",S.c1);q(".clk-sky0").setAttribute("fill",S.c1);q(".s2").setAttribute("stop-color",S.c2);q(".clk-lst").setAttribute("opacity",S.st.toFixed(2));q(".clk-cl").setAttribute("stroke-opacity",(.3*(1-S.st)).toFixed(2));
  q(".clk-zs").setAttribute("fill",S.ink);q(".clk-tk").setAttribute("stroke",S.ink);q(".clk-in").setAttribute("stroke",S.ink);q(".clk-in").setAttribute("stroke-opacity",".35");
  b.querySelectorAll(".clk-z").forEach(t=>{const on=+t.dataset.i===i;t.setAttribute("font-size",on?"9.6":"7.6");t.setAttribute("fill",on?(S.st>.5?"#ffd978":"#a3361f"):S.ink)});
  const big=q(".clk-big");big.textContent=CLK_ZHI[i]+"時";big.setAttribute("fill",S.ink);q(".clk-ptr").setAttribute("fill",S.st>.5?"#ffd978":"#a3361f");
  {let a=15*h+CLK_A0+90;if(CLK.rot!=null)a+=Math.round((CLK.rot-a)/360)*360;CLK.rot=a;q(".clk-rot").style.transform=`rotate(${a.toFixed(2)}deg)`;const hb=q(".clk-hub");if(hb)hb.setAttribute("fill",S.st>.5?"#ffd978":"#a3361f")}   /* 指針指著子＝0 點（子在正上方）；過半夜不倒轉一圈 */
  const bn=typeof sw7Born==="function"?sw7Born():0,tm=typeof sw7Term==="function"?sw7Term(N):"",day=bn&&typeof sw7OnDay==="function"?sw7OnDay(bn,N):0;
  if(CLK.sm){const B=CLK.sm.querySelector(".clk-sl>b"),L=CLK.sm.querySelectorAll(".clk-sl>span");if(B)B.textContent=CLK_ZHI[i]+"時";L[0].textContent=(day?`⛵ ${clkEraZh()}第 ${day} 天`:"⛵ 還沒登船")+(tm?"・"+tm:"");if(L[1])L[1].textContent=""}
  b.setAttribute("aria-label",ship?"雲河無歲月：在星槎上，時辰不走。點了看船齡":`現在是${CLK_ZHI[i]}時（${k[0]}，${clkHH(i)[0]} 點到 ${clkHH(i)[1]} 點）${tm?"，節氣"+tm:""}。點了看船齡和十二時辰`)}
/* 每次換頁（包一層 setTop）：判斷這一頁要不要星晷、在不在船上。框一直留在頂欄；剛出現時先保持上一頁（陸地／船上）的樣子，下兩格再換成這一頁的樣子＝淡入淡出 */
function clkMode(m){const on=m==="ship";CLK.box.classList.toggle("ship",on);CLK.el.classList.toggle("ship",on)}
function clkPlace(){const tb=document.getElementById("topbar"),h=document.getElementById("title"),x=CLK.box;if(!tb||!h||!x)return;const L=h.offsetLeft+6;x.style.left=L+"px";x.style.maxWidth=Math.max(160,h.offsetLeft+h.offsetWidth-L)+"px"}
function clkSync(){if(!CLK_ON)return;const tb=document.getElementById("topbar"),h=document.getElementById("title");if(!tb||!h)return;
  const k=clkKey(),ship=clkShip(),prev=CLK.mode||(ship?"ship":"land"),now=ship?"ship":"land";CLK.mode=now;clkSnd(ship);
  const nt=CLK_NT_RE.test(k);tb.classList.toggle("clk-nt",nt);if(!(CLK_DIAL_RE.test(k)||nt)||!h.textContent.trim()){tb.classList.remove("clk-on","clk-nt");return}
  clkCss();clkMake();if(CLK.box.parentElement!==tb)tb.append(CLK.box);
  const was=tb.classList.contains("clk-on");if(!was){clkMode(prev);tb.classList.add("clk-on")}clkPlace();clkPaint();CLK.box.getBoundingClientRect();
  if(prev===now)clkMode(now);else requestAnimationFrame(()=>requestAnimationFrame(()=>{clkMode(now);clkPaint()}))}
if(CLK_ON&&typeof setTop==="function"){const f0=setTop;setTop=function(){const r=f0.apply(this,arguments);try{clkSync()}catch(e){}return r}}
if(CLK_ON){addEventListener("hashchange",()=>setTimeout(()=>{try{clkSync()}catch(e){}},0));addEventListener("resize",()=>{try{clkPlace()}catch(e){}});
  setInterval(()=>{try{if(CLK.el&&CLK.el.isConnected&&!document.hidden)clkPaint()}catch(e){}},30000);
  document.addEventListener("visibilitychange",()=>{try{if(!document.hidden&&CLK.el&&CLK.el.isConnected)clkPaint()}catch(e){}})}
/* 千秋穿梭過場一開始就算在船上（音樂淡下去）；過場完換頁時 setTop 會再判斷一次 */
if(CLK_ON&&typeof qianqiu==="function"){const q0=qianqiu;qianqiu=function(){const r=q0.apply(this,arguments);setTimeout(()=>{try{clkSnd(true);if(CLK.box&&CLK.box.isConnected){CLK.mode="ship";clkMode("ship")}}catch(e){}},0);return r}}

/* ---------- ⑤ 上下船：背景音樂淡出淡入（約 1 秒） ---------- */
function clkSnd(ship){if(!CLK_SND_ON||typeof BGM==="undefined")return;const tg=ship?.25:.55,a=BGM.a;if(CLK.vt===tg&&CLK.va===a)return;const first=CLK.vt==null||CLK.va!==a;CLK.vt=tg;CLK.va=a;clearInterval(CLK.vi);if(!a)return;
  if(first&&a.paused){try{a.volume=tg}catch(e){}return}
  const v0=a.volume,t0=performance.now();CLK.vi=setInterval(()=>{const p=Math.min(1,(performance.now()-t0)/1000);try{a.volume=Math.max(0,Math.min(1,v0+(tg-v0)*p))}catch(e){}if(p>=1)clearInterval(CLK.vi)},50)}
/* 背景音樂元素是第一次點選才建的（iOS 規定），建好後套上現在該有的音量 */
if(CLK_SND_ON&&typeof bgmSync==="function"){const b0=bgmSync;bgmSync=function(){const r=b0.apply(this,arguments);Promise.resolve(r).then(()=>{try{if(typeof BGM!=="undefined"&&BGM.a&&BGM.a!==CLK.va)clkSnd(clkShip())}catch(e){}});return r}}

/* ---------- ② 船齡卡裡的十二時辰香篆鐘 ---------- */
/* 香篆：12 段回紋，第 k 段（子＝0，在正上方，順時針）＝內圈短弧 → 往外 → 外圈長弧 → 往內 → 內圈短弧；尺寸照 viewBox 320 */
const XZ={c:160,ri:58,ro:122,g:5,rim0:134,rim1:155};
function xzSeg(k){const{c,ri,ro,g}=XZ,f=CLK_A0+30*k,a=f-15,a1=f-15+g,a2=f+15-g,b=f+15,P=(r,t)=>clkP(c,c,r,t).join(" ");
  return`M${P(ri,a)} A${ri} ${ri} 0 0 1 ${P(ri,a1)} L${P(ro,a1)} A${ro} ${ro} 0 0 1 ${P(ro,a2)} L${P(ri,a2)} A${ri} ${ri} 0 0 1 ${P(ri,b)}`}
/* 段長與沿段 s 長度的點（給火光定位、燒到一半的虛線長度） */
function xzLen(){const{ri,ro,g}=XZ,d=Math.PI/180;return[ri*g*d,ro-ri,ro*(30-2*g)*d,ro-ri,ri*g*d]}
function xzAt(k,s){const{c,ri,ro,g}=XZ,f=CLK_A0+30*k,L=xzLen(),d=Math.PI/180;let i=0;while(i<4&&s>L[i]){s-=L[i];i++}s=Math.min(s,L[i]);
  if(i===0)return clkP(c,c,ri,f-15+s/ri/d);if(i===1)return clkP(c,c,ri+s,f-15+g);if(i===2)return clkP(c,c,ro,f-15+g+s/ro/d);if(i===3)return clkP(c,c,ro-s,f+15-g);return clkP(c,c,ri,f+15-g+s/ri/d)}
function clkXz(N){N=N||new Date();const{c,ri,ro,rim0,rim1}=XZ,h=clkHr(N),cur=clkIdx(N),f=(((h-(cur*2-1))%24)+24)%24/2,L=xzLen().reduce((a,b)=>a+b,0);
  const seg=[],lab=[],tm=[],wd=[];
  for(let k=0;k<12;k++){const d=xzSeg(k),st=k<cur?"b":k===cur?"c":"u";
    seg.push(st==="c"?`<path d="${d}" stroke="#c9a46e"/><path d="${d}" stroke="#77716a" stroke-dasharray="${(L*f).toFixed(1)} ${L.toFixed(1)}"/>`:`<path d="${d}" stroke="${st==="b"?"#77716a":"#c9a46e"}"/>`);
    const fa=CLK_A0+30*k,[x,y]=clkP(c,c,(ri+ro)/2+6,fa),[tx,ty]=clkP(c,c,(rim0+rim1)/2,fa),[s0,s1]=clkHH(k);
    lab.push(`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="19" font-weight="900" fill="${k===cur?"#8a2a14":"#4a3420"}">${CLK_ZHI[k]}</text>`);
    tm.push(`<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="#fff4dc">${s0}–${s1}</text>`);
    const p1=clkP(c,c,46,fa-15),p2=clkP(c,c,rim1,fa-15),p3=clkP(c,c,rim1,fa+15),p4=clkP(c,c,46,fa+15);
    wd.push(`<path class="w" data-i="${k}" role="button" tabindex="0" aria-label="${CLK_ZHI[k]}時，${s0} 點到 ${s1} 點" d="M${p1.join(" ")} L${p2.join(" ")} A${rim1} ${rim1} 0 0 1 ${p3.join(" ")} L${p4.join(" ")} A46 46 0 0 0 ${p1.join(" ")}Z"/>`)}
  const[ex,ey]=xzAt(cur,L*f);
  return`<div class="clk-xz"><svg viewBox="0 0 320 320" role="group" aria-label="十二時辰香篆鐘：點一段看那個時辰" style="font-family:var(--serif,serif)"><defs>
    <radialGradient id="xzRim" cx=".5" cy=".5" r=".5"><stop offset=".84" stop-color="#5e4020"/><stop offset=".9" stop-color="#b58b50"/><stop offset=".96" stop-color="#8a6334"/><stop offset="1" stop-color="#4f3418"/></radialGradient>
    <radialGradient id="xzAsh" cx=".46" cy=".42" r=".6"><stop offset="0" stop-color="#f1ece2"/><stop offset=".75" stop-color="#e2dacb"/><stop offset="1" stop-color="#cfc5b3"/></radialGradient>
    <radialGradient id="xzEmb"><stop offset="0" stop-color="#fff3c0"/><stop offset=".35" stop-color="#ffb347" stop-opacity=".9"/><stop offset="1" stop-color="#ff6a1f" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${c}" cy="${c}" r="${rim1+3}" fill="#3e2a14" opacity=".25"/><circle cx="${c}" cy="${c}" r="${rim1}" fill="url(#xzRim)"/><circle cx="${c}" cy="${c}" r="${rim0}" fill="url(#xzAsh)"/>
    <circle cx="${c}" cy="${c}" r="${rim0+.8}" fill="none" stroke="#3b2812" stroke-width="1.2" opacity=".7"/><circle cx="${c}" cy="${c}" r="${rim1-3}" fill="none" stroke="#e2c58e" stroke-width=".6" opacity=".6"/>
    <g class="xz-w">${wd.join("")}</g>
    <g fill="none" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" pointer-events="none">${seg.join("")}</g>
    <g pointer-events="none">${tm.join("")}${lab.join("")}
      <text x="${c}" y="${c-8}" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="900" fill="#3a2614">${CLK_ZHI[cur]}時</text>
      <text x="${c}" y="${c+16}" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#6b5a46">${CLK_SC[cur][0]}</text>
      <circle class="emb" cx="${ex}" cy="${ey}" r="16" fill="url(#xzEmb)"/><circle cx="${ex}" cy="${ey}" r="4.2" fill="#ff8a2a"/><circle cx="${ex}" cy="${ey}" r="2.4" fill="#fff6d0"/></g></svg>
    <div class="clk-xzi" aria-live="polite"></div>${clkShip()?`<p class="clk-shipl">✶ 在星槎上，時辰不走。</p>`:""}</div>`}
function clkXzInfo(box,i,cur){const k=CLK_SC[i],[a,b]=clkHH(i);box.innerHTML=`<b>${CLK_ZHI[i]}時・${k[0]}</b><span class="tm">${a}:00–${b}:00${i===cur?"・現在":""}</span>
  <p>古名「${k[0]}」：${k[1]}。</p><p>${k[2]} 屬${k[3]}：${k[4]}<span class="fk">（民間說法）</span></p><p class="csrc">古名出處：顧炎武《日知錄》卷二十整理的十二時名${i===8?"；晡時見《說文》「餔，日加申時食也」":""}</p>`}
function clkXzBind(m,N){const root=m&&m.querySelector(".clk-xz");if(!root)return;const cur=clkIdx(N||new Date()),box=root.querySelector(".clk-xzi"),W=[...root.querySelectorAll(".w")];
  const pick=i=>{W.forEach(w=>w.classList.toggle("sel",+w.dataset.i===i));clkXzInfo(box,i,cur)};
  W.forEach(w=>{w.addEventListener("click",()=>{if(typeof vibrate==="function")vibrate(5);pick(+w.dataset.i)});w.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(+w.dataset.i)}})});pick(cur)}

/* ---------- ④ 爛柯懸棋（星槎甲板石桌上方） ---------- */
/* 位置：原圖 896×1200 的 (398,612)（棋盤左上角上空），影子落在桌面 (398,684)；兩處都避開圖上畫的棋子（scratchpad 量過棋子位置） */
const LK_POS=[398/896*100,612/1200*100];
function lkMount(){if(!LK_ON)return;const hl=document.querySelector(".shp-map.full .shp-hl");if(!hl||hl.querySelector(".lk-w"))return;clkCss();
  /* 影子、棋子畫在框裡，透明按鈕疊最上面（按鈕會裁掉超出範圍的內容，影子和光暈不能放進按鈕） */
  const w=document.createElement("div");w.className="lk-w";w.style.left=LK_POS[0].toFixed(2)+"%";w.style.top=LK_POS[1].toFixed(2)+"%";
  w.innerHTML=`<i class="lk-sh"></i><i class="lk-f"><i class="lk-p"></i></i><button type="button" class="lk-b" aria-label="懸在半空的棋子：爛柯的故事"></button>`;const b=w.querySelector(".lk-b");b.onclick=e=>{e.stopPropagation();e.preventDefault();lkCard()};
  ["pointerdown","touchstart","mousedown"].forEach(t=>b.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}));hl.append(w)}
function lkCard(){if(typeof vibrate==="function")vibrate(5);
  sheet("♟ 懸在半空的棋子",B=>{B.innerHTML=`<div class="lk-card"><div class="muted" style="margin:-4px 0 8px">雲河星槎・爛柯的故事</div>
    <p>晉朝有個砍柴的人叫王質，走進石室山，看見幾個孩子一邊下棋、一邊唱歌，就站在旁邊看。孩子給他一顆像棗核的東西，含在嘴裡就不覺得餓。</p>
    <p>過了一會兒，孩子說：「你怎麼還不走？」王質起身一看，斧頭的木柄（古時候叫「柯」）已經爛光了。回到村裡，認識的人一個都不在了——人間早就過了好多好多年。</p>
    <p>後來大家把那座山叫「爛柯山」（在今天的浙江衢州），「爛柯」也成了「下棋下到忘了時間」的代稱。</p>
    <p class="ship">在星槎上沒有時間，這顆棋子懸在這裡，誰也不知道多久了。</p>
    <p class="src">出處：舊題南朝梁任昉《述異記》卷上（這本書的作者有爭議，清代《四庫全書總目》認為是後人借任昉的名字寫的）。更早的東晉虞喜《志林》也記了王質看兩個童子下棋，原書已經失傳，靠後人轉引。北魏酈道元《水經注・漸江水》引《東陽記》也有這個故事，不過那裡的童子是「彈琴而歌」，不是下棋。古書只寫「棋」，那時候的棋跟今天的象棋還不一樣；船上這顆是素面的棋子，沒有刻字。</p></div>`});
  try{if(typeof SCI_REG!=="undefined"&&typeof sciMark==="function"){const R=SCI_REG.find(r=>r.D&&r.D.k==="sp2"),x=R&&R.D.it.find(y=>y.n==="懸在半空的棋子");if(x)sciMark(R.D,x)}}catch(e){}}
if(LK_ON){let lkq=0;const kick=()=>{if(lkq)return;lkq=1;setTimeout(()=>{lkq=0;try{if(clkKey()==="/adventure")lkMount()}catch(e){}},250)};
  const init=()=>{try{new MutationObserver(kick).observe(document.body,{childList:true,subtree:true})}catch(e){}addEventListener("hashchange",kick);kick()};
  if(document.readyState==="loading")addEventListener("DOMContentLoaded",init);else init()}
