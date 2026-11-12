/* ================= 🪵 底部導覽列「水墨木牌」（回饋 794，開發者 11/8 選定）=================
   四格（首頁、線上、棋譜、設定）功能和位置都不變，每一頁照舊看得到；整條改成跟滿版圖同一個世界：
     底色米白宣紙、上緣一條淡墨線加細木紋邊；四格是四塊小木牌，選到的那格變成朱砂印色（木牌像蓋了一方朱印）；
     圖示換成場景裡的小物件（Gemini 水墨、綠幕去背、沒有字，四個一組同一套筆法，art/tabink/）：
       首頁＝楚河拱橋、線上＝茶樓燈籠、棋譜＝書院的書帙卷軸、設定＝驛站客房的門牌；
     字照舊「首頁、線上、棋譜、設定」，用 App 的朝代字型（var(--serif)），程式寫的，不畫在圖上。
   深色模式（設定的深色、跟著手機的深色、秦／五代這類深色朝代）：木牌換深木色、字變淺，夜裡也看得清楚。
   只加 class 和樣式、換掉 .ic 裡的 emoji，不動 #tabbar 的按鈕和 setTabs 的行為；開關 TABBAR_INK_ON（false＝照舊），圖片網址帶 TB_IMGV */
const TABBAR_INK_ON=true;   /* 開發者 11/8：先上線再細看 */
const TB_IMGV="2201";
const TB_ICON={"#/":"tab_home","#/lobby":"tab_lobby","#/db":"tab_db","#/settings":"tab_set"};
function tbCss(){if(document.getElementById("tbCss"))return;const s=document.createElement("style");s.id="tbCss";s.textContent=`
.tabbar.tb-ink{background:#f4ecd9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .4 0 0 0 0 .33 0 0 0 0 .24 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
  border-top:0;box-shadow:inset 0 3px 0 -1px rgba(120,84,48,.55),inset 0 4px 0 -1px rgba(60,40,24,.18);padding:6px 6px calc(4px + var(--safeB,0px));gap:6px}
.tabbar.tb-ink button{flex:1;gap:0;padding:4px 0 3px;border-radius:7px 7px 9px 9px;color:#4a3424;font:700 11.5px/1.15 var(--serif,serif);letter-spacing:.08em;
  background:linear-gradient(#efe0bd,#dcc493);border:1px solid rgba(96,64,32,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 0 rgba(120,84,40,.18),0 1px 2px rgba(60,40,20,.18)}
.tabbar.tb-ink button .ic{display:block;width:32px;height:32px;font-size:0;filter:none;opacity:1}
.tabbar.tb-ink button .ic img{width:100%;height:100%;object-fit:contain;filter:saturate(.75) opacity(.95);transition:filter .2s}
.tabbar.tb-ink button.on{color:#fff4dc;background:radial-gradient(circle at 50% 35%,#c9573c,#a63a24 70%);border-color:#7d2414;box-shadow:inset 0 0 0 2px rgba(255,230,190,.35),0 0 6px rgba(181,69,43,.45)}
.tabbar.tb-ink button.on .ic img{filter:drop-shadow(0 0 1.5px rgba(255,240,210,.9)) drop-shadow(0 0 3px rgba(255,236,200,.5))}
.tabbar.tb-ink.tb-dark{background-color:#221c17;box-shadow:inset 0 3px 0 -1px rgba(190,150,100,.45),inset 0 4px 0 -1px rgba(0,0,0,.4)}
.tabbar.tb-ink.tb-dark button{color:#f0e0bf;background:linear-gradient(#5c4630,#45331f);border-color:rgba(230,190,130,.35);box-shadow:inset 0 1px 0 rgba(255,220,160,.18),0 1px 2px rgba(0,0,0,.4)}
.tabbar.tb-ink.tb-dark button .ic img{filter:saturate(.7) brightness(1.08)}
.tabbar.tb-ink.tb-dark button.on{color:#fff4dc;background:radial-gradient(circle at 50% 35%,#d0603f,#a63a24 70%);border-color:#e3a17f}
@media (prefers-reduced-motion:reduce){.tabbar.tb-ink button .ic img{transition:none}}`;document.head.append(s)}
/* 深色：看文字顏色（--ink）亮不亮，跟深淺色設定、深色朝代都對得上 */
function tbDark(){try{const c=getComputedStyle(document.documentElement).getPropertyValue("--ink").trim()||getComputedStyle(document.body).color;const d=document.createElement("i");d.style.color=c;document.body.append(d);
  const m=getComputedStyle(d).color.match(/\d+(\.\d+)?/g)||[0,0,0];d.remove();return(.3*m[0]+.59*m[1]+.11*m[2])>150}catch(e){return false}}
function tbInk(){const t=document.getElementById("tabbar");if(!t)return;tbCss();t.classList.add("tb-ink");t.classList.toggle("tb-dark",tbDark());
  for(const b of t.children){const ic=b.querySelector(".ic"),k=TB_ICON[b.dataset.go];if(!ic||!k||ic.querySelector("img"))continue;
    const im=new Image();im.alt="";im.decoding="async";im.onerror=()=>{ic.textContent=ic.dataset.emo||"";ic.style.fontSize="22px"};ic.dataset.emo=ic.textContent;ic.textContent="";ic.append(im);im.src=`data/tabink/${k}.webp?v=${TB_IMGV}`}}
if(TABBAR_INK_ON&&typeof setTabs==="function"){const f0=setTabs;setTabs=function(){const r=f0.apply(this,arguments);try{tbInk()}catch(e){}return r};
  try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{try{tbInk()}catch(e){}})}catch(e){}}
