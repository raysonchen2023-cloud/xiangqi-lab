/* 11/12 評比循環第 11 輪 F3：色弱模式（細項 P16.3、P55.1「色盲專用高對比樣式＋用工具模擬色覺障礙掃描」；新評審「色覺無障礙專家」）。
   開關：store cbMode（預設 false）。設定頁的開關由 05-settings 加，切換後呼叫 cbApply() 立即生效；開著時 html 掛 data-cbm。
   ① 平面棋盤（01-board.js 的 Board()；這支不改它）：畫完棋盤後由 MutationObserver 補上記號，關掉時全部拿掉、屬性還原：
      黑子＝棋面外圈加一道粗黑環（裡外各夾一條白線），紅子不加 → 不必分辨紅／黑色也看得出是哪一方（全色盲模擬下照樣分得出）；
      可以走的空格＝黃點黑邊；可以吃的子＝四角瞄準框（不是圓圈，跟「上一步」的圓圈形狀不同）；
      上一步（起點圓圈、箭頭、落點外圈、選起的棋子外圈）一律改成橘色，跟電腦建議的藍色箭頭成「藍／橘」對比（紅綠色盲分得最清楚的一組）；
      被將軍的將帥右上角加黃底黑字「將」牌，外圈加粗。
      「高對比棋子」（hiCon）或高對比主題（hcTheme）開著時，棋盤已經是黑子反白、黃點、瞄準框、「將」牌，這支只補上一步的橘色。
   ② 頁面（CSS，全部在 html[data-cbm] 底下）：評語妙著～敗著加符號 ★ ✓ ○ △ ✗ ✗✗、好的改藍、壞的改橘；勝負、正招／次好／失誤長條改藍／灰／橘＋斜紋；
      形勢條紅方那段加斜紋；輪到誰名字前加「▶」；黑方頭像加黑框（跟棋子一樣）；底欄目前那格加底線；推薦標籤加「！」；棋鐘快沒時間加「⚠」。
   ③ 3D 棋盤（xiangqi-lab/src/park3d.js 的 PKCB 區塊，11/13 第 12 輪）：06-cpu.js parkLook0 把 cbMode 併進 look.hc（黑子黑底白字的高對比棋面）並另給 look.cb；
      上一步朱橘＋黑白圈、可走黃點黑邊、可吃四角瞄準框、被將軍「將」字牌、電腦建議藍色虛線框都在 park3d 畫。這支切換時呼叫 cbPark() 讓開著的園子立刻重畫。
   掃描：xiangqi-lab/tools/qa/colorblind-scan.js（Chrome 色覺模擬截圖＋WCAG 對比）；測試：xiangqi-lab/tools/test-colorblind.js。
   名稱一律 cb 開頭（cbApply、cbDeco、CB_*；屬性 data-cbm／data-cbx／data-cbo／data-cbd；樣式 #cbCss）。 */
/* #CB-PURE-BEGIN：到 #CB-PURE-END 是不碰畫面的純函式和常數，test-colorblind.js 用 vm 直接載入 */
function cbRgb(h){const m=/^#?([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(h||"").trim());if(!m)return null;let s=m[1];if(s.length===3)s=s.replace(/./g,c=>c+c);const n=parseInt(s,16);return[n>>16&255,n>>8&255,n&255]}
function cbHex(c){return"#"+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("").toUpperCase()}
function cbLin(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}
function cbGam(v){v=Math.max(0,Math.min(1,v));return 255*(v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055)}
/* WCAG 2.x 相對亮度與對比（跟 11b-a11y.js axmContrast 同一個公式） */
function cbLum(c){const r=Array.isArray(c)?c:cbRgb(c);if(!r)return null;return .2126*cbLin(r[0])+.7152*cbLin(r[1])+.0722*cbLin(r[2])}
function cbContrast(a,b){const x=cbLum(a),y=cbLum(b);if(x==null||y==null)return null;return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
/* 色覺模擬矩陣（Machado、Oliveira、Fernandes 2009，嚴重度 1.0；在線性 RGB 上乘，跟 Chrome 開發者工具的模擬同一組來源）；全色盲＝只剩亮度 */
var CB_SIM={protanopia:[.152286,1.052583,-.204868,.114503,.786281,.099216,-.003882,-.048116,1.051998],
  deuteranopia:[.367322,.860646,-.227968,.280085,.672501,.047413,-.01182,.04294,.968881],
  tritanopia:[1.255528,-.076749,-.178779,-.078411,.930809,.147602,.004733,.691367,.3039],
  achromatopsia:[.2126,.7152,.0722,.2126,.7152,.0722,.2126,.7152,.0722]};
function cbSim(c,kind){const r=Array.isArray(c)?c:cbRgb(c),M=CB_SIM[kind];if(!r)return null;if(!M)return r.slice();const l=r.map(cbLin);
  return[0,1,2].map(i=>cbGam(M[i*3]*l[0]+M[i*3+1]*l[1]+M[i*3+2]*l[2]))}
/* 棋子是哪一方：先看字（帥仕相傌俥炮兵／將士象馬車砲卒），沒有字（整顆是圖）就看圖檔名（pset/qin/rK.webp、pieces/qin-b.webp、chdpiece/x_r.webp） */
var CB_PC={r:"帥仕相傌俥炮兵",b:"將士象馬車砲卒"};
function cbSideOf(t,h){t=String(t||"");for(const ch of t){if(CB_PC.r.indexOf(ch)>=0)return"r";if(CB_PC.b.indexOf(ch)>=0)return"b"}
  const m=/[\/_-]([rb])[KARNBCP]?\.webp(?:$|[?#])/.exec(String(h||""));return m?m[1]:null}
/* 上一步＝朱橘 #D55E00（Okabe-Ito 色盲安全色盤的 vermillion），外面再描「黑邊＋白邊」兩圈：淺色棋盤靠黑邊、深色棋盤靠白邊，都過非文字圖形 3:1；
   跟可走的黃點（亮）明暗差得開，跟電腦建議的藍箭頭在紅綠色盲下也分得開（藍／橘軸） */
var CB_COL={last:"#D55E00",dot:"#FFD400",ink:"#111111",blue:"#0D47A1",blueL:"#8FC1FF",orange:"#9A4D00",orangeL:"#FFB347",grey:"#5F6B7A"};
/* 評語：[評等, 00-util.js QC 原本的色碼（App 用 style="color:…" 畫，這裡用屬性選擇器認）, 符號, 淺底色, 深底色] */
var CB_Q=[["妙著","C27C0E","★","#4A1F8C","#C9A8FF"],["正著","2F6B4F","✓","#0D47A1","#9CC3FF"],["穩著","3A7BD5","○","#3F5568","#C3CCD8"],
  ["緩著","888","△","#5A5A5A","#C8C8C8"],["失著","D9822B","✗","#9A4D00","#FFB347"],["敗著","C0392B","✗✗","#8A3B00","#FF8A3D"]];
function cbLD(prop,l,d){return`${prop}:${l}!important;${prop}:light-dark(${l},${d})!important`}
function cbCss(){const H="html[data-cbm] ",out=[];
  for(const[,hex,sym,l,d]of CB_Q){const sel=[`.chip .q[style*="${hex}" i]`,`.rp-q span[style*="${hex}" i]`].map(s=>H+s);
    out.push(`${sel.join(",")}{${cbLD("color",l,d)};font-weight:800}`,`${sel.map(s=>s+"::before").join(",")}{content:"${sym}";margin-right:1px;font-weight:900}`)}
  out.push(
    `${H}.rp-t.good{border-left:5px solid ${CB_COL.blue}!important}${H}.rp-t.bad{border-left:5px dashed ${CB_COL.orange}!important}`,
    `${H}.rp-t.good::before{content:"★ ";font-weight:900;${cbLD("color",CB_COL.blue,CB_COL.blueL)}}${H}.rp-t.bad::before{content:"✗ ";font-weight:900;${cbLD("color",CB_COL.orange,CB_COL.orangeL)}}`,
    `${H}.st .w,${H}.op-m b.w{${cbLD("color",CB_COL.blue,CB_COL.blueL)}}${H}.st .l,${H}.op-m b.l{${cbLD("color",CB_COL.orange,CB_COL.orangeL)}}`,
    `${H}.st-g .dot.w{background:${CB_COL.blue}!important}${H}.st-g .dot.l{background:#E69F00!important;border-radius:2px!important;box-shadow:0 0 0 1.5px #111}`,
    `${H}.op-stack .g,${H}.op-leg .g{background:${CB_COL.blue}!important}${H}.op-stack .o,${H}.op-leg .o{background:#9AA5B1!important}`,
    `${H}.op-stack .b,${H}.op-leg .b{background:#E69F00 repeating-linear-gradient(45deg,transparent 0 3px,rgba(0,0,0,.45) 3px 5px)!important}`,
    `${H}.evline{height:8px;box-shadow:0 0 0 1px rgba(0,0,0,.45)}${H}.evline div{background-image:repeating-linear-gradient(-45deg,transparent 0 3px,rgba(255,255,255,.62) 3px 5px)}`,
    `${H}.player.on .nm b::before{content:"▶ "}${H}.player .av.b{box-shadow:0 0 0 2px #FFFFFF,0 0 0 4.5px #111111}`,
    `${H}.tabbar button.on{box-shadow:inset 0 -3px 0 currentColor}${H}.clk2.hot::before{content:"⚠ "}`,
    `${H}.shp-spot.hot::before,${H}.shp-hs.hot::before{content:"！";position:absolute;right:-9px;top:-9px;width:20px;height:20px;border-radius:50%;background:#FFD400;color:#111;border:2px solid #111;font:900 13px/16px var(--sans,sans-serif);text-align:center;letter-spacing:0;box-sizing:border-box}`);
  return out.join("\n")}
/* #CB-PURE-END */
function cbOn(){try{return!!store.get("cbMode",false)}catch(e){return false}}
function cbHC(){try{return!!store.get("hiCon",false)||(typeof axmHct==="function"&&!!axmHct())}catch(e){return false}}
function cbEl(t,a){const e=document.createElementNS("http://www.w3.org/2000/svg",t);for(const k in a)e.setAttribute(k,a[k]);e.setAttribute("data-cbx","1");e.setAttribute("aria-hidden","true");e.setAttribute("pointer-events","none");return e}
/* 改屬性前把原值記在 data-cbo（JSON；null＝原本沒有），關掉色弱模式時照著還原 */
function cbSet(e,a){let o={};try{o=JSON.parse(e.getAttribute("data-cbo")||"{}")}catch(x){}for(const k in a)if(!(k in o))o[k]=e.hasAttribute(k)?e.getAttribute(k):null;
  e.setAttribute("data-cbo",JSON.stringify(o));for(const k in a)e.setAttribute(k,String(a[k]))}
/* 棋子中心：有圖用圖的中心，沒有圖用最後一個字（01-board piece() 主字 y＝中心＋10） */
function cbPcAt(g){let im=null,tx=null;for(const c of g.children){if(c.tagName==="image")im=c;else if(c.tagName==="text")tx=c}
  if(im){const w=+im.getAttribute("width")||60;return[+im.getAttribute("x")+w/2,+im.getAttribute("y")+w/2,w/2,im.getAttribute("href")||""]}
  if(tx)return[+tx.getAttribute("x"),+tx.getAttribute("y")-10,27,""];return null}
/* 在一個圖形底下墊兩層外框（白、黑），形狀照抄（線、圓、多邊形、路徑；虛線也照抄） */
function cbHalo(k){const G=["x1","y1","x2","y2","cx","cy","r","points","d","transform","stroke-dasharray","stroke-linecap","stroke-linejoin"],a={fill:"none"};for(const g of G)if(k.hasAttribute(g))a[g]=k.getAttribute(g);
  const w=+k.getAttribute("stroke-width")||0;k.before(cbEl(k.tagName,Object.assign({},a,{stroke:"#FFFFFF","stroke-width":w+7,"stroke-linejoin":"round",class:"cb-halo"})),cbEl(k.tagName,Object.assign({},a,{stroke:CB_COL.ink,"stroke-width":w+3.5,"stroke-linejoin":"round",class:"cb-halo"})))}
function cbIsPiece(g){if(!g||g.tagName!=="g")return false;const f=g.firstElementChild;return!!f&&f.tagName==="ellipse"&&/^url\(#psh/.test(f.getAttribute("fill")||"")}
function cbMvOf(svg){try{const o=svg._o||{};if(typeof axmHct==="function"&&axmHct()&&typeof axmHcb==="function")return axmHcb().mv;if(store.get("hiCon",false))return"#0B5CD5";return boardTheme(o.theme).mv}catch(e){return null}}
const cbSame=(a,b)=>!!a&&!!b&&String(a).toLowerCase()===String(b).toLowerCase();
/* 幫一個棋盤 SVG 補上色弱記號；重複呼叫沒關係（處理過的掛 data-cbd、補的東西掛 data-cbx） */
function cbDeco(svg){if(!svg||!svg._b||!cbOn())return 0;const HC=cbHC(),mv=cbMvOf(svg),LC=CB_COL.last;let n=0;
  for(const c of[...svg.children]){if(c.hasAttribute("data-cbd")||c.hasAttribute("data-cbx"))continue;const tg=c.tagName;
    if(tg==="g"&&cbIsPiece(c)){c.setAttribute("data-cbd","1");n++;
      for(const k of[...c.children])if(k.tagName==="circle"&&cbSame(k.getAttribute("stroke"),mv)&&+k.getAttribute("stroke-width")>=4){cbHalo(k);cbSet(k,{stroke:LC})}   /* 選起的棋子外圈 */
      if(HC)continue;const at=cbPcAt(c);if(!at)continue;let txt="";for(const k of c.children)if(k.tagName==="text")txt=k.textContent;
      const side=cbSideOf(txt,at[3]);if(side)c.setAttribute("data-cbs",side);if(side!=="b")continue;
      const[x,y,R]=at,q=R/27,f=v=>(v*q).toFixed(1);
      c.append(cbEl("circle",{cx:x,cy:y,r:f(24.6),fill:"none",stroke:CB_COL.ink,"stroke-width":f(5.2),class:"cb-rim"}),
        cbEl("circle",{cx:x,cy:y,r:f(21.6),fill:"none",stroke:"#FFFFFF","stroke-width":1.2}),
        cbEl("circle",{cx:x,cy:y,r:f(27.5),fill:"none",stroke:"#FFFFFF","stroke-width":1.1}));continue}
    if(tg==="g"&&c.getAttribute("opacity")===".82"){c.setAttribute("data-cbd","1");n++;   /* 上一步的箭頭（一般箭頭或朝代箭頭） */
      cbSet(c,{opacity:1});for(const k of[...c.children]){const fl=k.getAttribute("fill"),st=k.getAttribute("stroke"),a={};cbHalo(k);if(fl&&fl!=="none")a.fill=LC;if(st&&st!=="none")a.stroke=LC;if(a.fill||a.stroke)cbSet(k,a)}continue}
    if(tg!=="circle")continue;const st=c.getAttribute("stroke")||"",fl=c.getAttribute("fill")||"",r=+c.getAttribute("r"),x=+c.getAttribute("cx"),y=+c.getAttribute("cy");
    if(st==="var(--accent2)"){c.setAttribute("data-cbd","1");n++;
      if(r<=12)cbSet(c,{fill:CB_COL.dot,stroke:CB_COL.ink,"stroke-width":3,opacity:1,r:11});   /* 可以走的空格：黃點黑邊 */
      else{cbSet(c,{opacity:0});const a=31,b=12,d=`M${x-a} ${y-a+b}V${y-a}H${x-a+b}M${x+a-b} ${y-a}H${x+a}V${y-a+b}M${x+a} ${y+a-b}V${y+a}H${x+a-b}M${x-a+b} ${y+a}H${x-a}V${y+a-b}`;   /* 可以吃：四角瞄準框 */
        c.after(cbEl("path",{d,fill:"none",stroke:"#FFFFFF","stroke-width":8,"stroke-linecap":"square",class:"cb-aim"}),cbEl("path",{d,fill:"none",stroke:CB_COL.ink,"stroke-width":4.5,"stroke-linecap":"square",class:"cb-aim"}))}continue}
    if(st==="var(--red)"&&r>=30){c.setAttribute("data-cbd","1");n++;if(HC)continue;cbSet(c,{"stroke-width":5.5});   /* 被將軍：外圈加粗＋「將」字牌 */
      const bx=x+24,by=y-24,tx=cbEl("text",{x:bx,y:by+6,"text-anchor":"middle","font-size":17,"font-weight":900,fill:CB_COL.ink,"font-family":"var(--sans)",class:"cb-ck"});tx.textContent="將";
      c.after(cbEl("circle",{cx:bx,cy:by,r:14,fill:CB_COL.dot,stroke:CB_COL.ink,"stroke-width":2.5,class:"cb-ck"}),tx);continue}
    if(cbSame(st,mv)||cbSame(fl,mv)){c.setAttribute("data-cbd","1");n++;const a={};if(cbSame(st,mv)){a.stroke=LC;cbHalo(c)}if(cbSame(fl,mv)){a.fill=LC;a.opacity=.6}cbSet(c,a)}}   /* 上一步：起點圓點、虛線圈、落點外圈 */
  return n}
function cbUndo(){const d=document;for(const e of[...d.querySelectorAll("[data-cbx]")])e.remove();
  for(const e of[...d.querySelectorAll("[data-cbo]")]){let o={};try{o=JSON.parse(e.getAttribute("data-cbo"))||{}}catch(x){}for(const k in o){if(o[k]==null)e.removeAttribute(k);else e.setAttribute(k,o[k])}e.removeAttribute("data-cbo")}
  for(const e of[...d.querySelectorAll("[data-cbd]")]){e.removeAttribute("data-cbd");e.removeAttribute("data-cbs")}}
function cbAll(){const L=document.querySelectorAll("svg");let n=0;for(const s of L)if(s._b)try{n+=cbDeco(s)}catch(e){}return n}
var CB_MO=null;
/* 盯著畫面：棋盤每次重畫（01-board draw() 把子元素清掉重放）就補記號；只在色弱模式開著時盯 */
function cbWatch(on){if(!on){if(CB_MO){try{CB_MO.disconnect()}catch(e){}CB_MO=null}return}if(CB_MO||typeof MutationObserver!=="function")return;
  CB_MO=new MutationObserver(recs=>{const S=new Set();for(const r of recs){const t=r.target;if(t&&t._b&&t.tagName==="svg")S.add(t);
      for(const a of r.addedNodes){if(!a||a.nodeType!==1)continue;if(a.tagName==="svg"){if(a._b)S.add(a)}else if(a.childElementCount&&a.getElementsByTagName){const L=a.getElementsByTagName("svg");for(let i=0;i<L.length;i++)if(L[i]._b)S.add(L[i])}}}
    S.forEach(s=>{try{cbDeco(s)}catch(e){}})});
  CB_MO.observe(document.documentElement,{childList:true,subtree:true})}
function cbStyle(){if(document.getElementById("cbCss"))return;const s=document.createElement("style");s.id="cbCss";s.textContent=cbCss();(document.head||document.documentElement).append(s)}
/* 11/13 第 12 輪：3D 園子（06-cpu.js 的 PARK）開著就拿最新的 parkLook()（裡面有 cb）重畫一次：park3d 看到 look 的 hc／cb 變了，會重畫棋面、換提示記號，不用重建場景。
   園子沒開（PARK 不存在）就什麼都不做，下次進 3D 時 parkDraw 會帶新的 look；回傳有沒有重畫 */
function cbPark(){try{if(typeof PARK==="undefined"||!PARK||!PARK.last||!PARK.v||typeof parkLook!=="function")return false;const a=PARK.last;a.ex.look=parkLook();PARK.v.draw(a.board,a.o,a.ex);return true}catch(e){return false}}
/* 設定頁切換 store cbMode 之後呼叫：掛／拿掉 html[data-cbm]、補／拿掉棋盤記號、重畫 3D 園子；回傳現在是否開著 */
function cbApply(){const on=cbOn(),r=document.documentElement;if(r){if(on)r.setAttribute("data-cbm","");else r.removeAttribute("data-cbm")}try{cbStyle()}catch(e){}
  if(on){cbWatch(true);cbAll()}else{cbWatch(false);try{cbUndo()}catch(e){}}cbPark();
  try{window.dispatchEvent(new CustomEvent("xq-cbmode",{detail:{on}}))}catch(e){}return on}
try{cbApply()}catch(e){}
