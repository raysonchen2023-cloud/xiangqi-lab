/* ================= ✉ 意見回饋頁「驛站信房」（回饋 799，開發者 11/8 選定 Gemini 方案 1＋10 合體；考究說明 park/feedback/考究說明.md，史學顧問核圖中）=================
   圖：park/feedback/fb_day_v2.png（Gemini 重畫一次＋程式局部修＋宣紙後製）、夜版 fb_night_v1.png → art/feedback/ → data/feedback/。
   #/feedback 一頁（#/feedback/fixes 直接打開告示榜的榜文；回饋 812：頁面只留滿版圖，修正紀錄不再接在圖下面）：天字客房隔壁的信房，點一下就到，不再經過設定畫軸。
     書案上的薛濤箋＝寫信：點了從上方展開一張大箋（鍵盤彈出也留在鍵盤上方），裡面就是原本 feedbackSheet 的表單（原封不動拿來用：類型、1500 字、截圖 4 張＋文字檔 3 個、聯絡方式、postForm、沒網路排隊、自動附上資訊）；
     青銅匭三個口＝類型：正面「申冤」＝🐞 錯誤、右側「招諫」＝💡 建議、蓋頂「延恩」＝💬 其他（選錯誤時箋上淡淡浮出一張程式畫的正確棋盤：9×10、楚河、九宮 X）；
     白玉鎮紙下＝附件縮圖；圓木印＝送出（程式疊一顆寫「兵」的棋子）；蠟丸碟＝還沒送出、排隊中的信；
     左牆黑漆告示榜（張榜公布已修的事）＝修正紀錄（myFixes／fixList 照舊：玩家只看自己回報、已修好的，開發者看全部），牌上貼最新幾張回條。
   設定頁的信插、手札、修好通知的「全部修正紀錄」、設定清單裡的「意見回饋」都直接開這一頁（包一層 feedbackSheet／fixHistory，07s2 的信插、手札直接換頁）。
   路由：#/feedback 原本會落到 Home(v)，這裡包一層 Home 接走。接 07w 走路（SHW_FBP）。開關 FEEDBACK_PAGE_ON（false＝照舊用底部表單）；圖片網址帶 FBP_IMGV */
const FEEDBACK_PAGE_ON=true;
const FBP_IMGV="2310";
/* 量 768×1376 的圖（像素）：箋紙四角＝上、右、左（第四角自己算）；匭的三個口；木印；蠟丸碟；告示榜上可以貼回條的空處 */
const FBP_PAPER={o:[359,575],x:[583,650],y:[250,655]};
const FBP_SHENYUAN="申冤";   /* 銅匭西面的名稱：《資治通鑑》作「伸冤」，《唐會要》卷 55 作「申冤」；史學顧問 11/8 定用「申冤」 */
const FBP_SLOT=[["錯誤",FBP_SHENYUAN,657,784,"f_bug"],["建議","招諫",716,781,"fb_idea"],["其他","延恩",672,719,"f_other"]];
const FBP_ICO=k=>k==="fb_idea"?`<img class="ti eic" src="data/feedback/fb_idea.webp?v=${FBP_IMGV}" alt="">`:ETIMG(k,"","");   /* 開發者 11/8：「建議」原本的圖示在好幾個朝代是阿拉丁神燈、還有玻璃燈罩，信房頁改用中國陶燈盞（art/feedback/fb_idea） */
const FBP_SEAL=[617,842,23],FBP_PILL=[673,866],FBP_JADE=[364,580];
/* 告示榜上圖裡原本就有的 3 張空白紙條（左、上、寬、高，像素）：程式的回條就貼在這 3 張上面，跟著榜的透視微微斜 */
const FBP_SLIPS=[[84,300,35,116],[131,289,30,112],[174,268,26,108]],FBP_SLIPN=[88,428];
/* 意見回饋 813：回條字太長會被紙條切掉；先取第一個逗號前的短句，再一個字一個字縮到放得下，結尾加「…」 */
function fbpSlipFit(e,t){t=t.split(/[，,；;。（(]/)[0].trim()||t;const put=u=>{e.innerHTML=`<b>已修</b>${esc(u)}`},over=()=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1;put(t);if(!over())return;for(let n=t.length-1;n>0;n--){put(t.slice(0,n).trim()+"…");if(!over())return}}
const SHW_FBP={el:40,h:[.085,70,.0012],look0:[42,60],home:"home",
  N:{home:[66,93],mid:[42,83],desk:[40,76],gui:[82,81],lft:[12,72],brd:[18,57],te:[30,64],fr2:[64,68],tb:[28,47.3]},
  E:"home-mid mid-desk mid-gui mid-lft lft-brd home-gui desk-te mid-fr2 fr2-gui",
  T:{tb:"desk"},   /* 回饋 820：書案桌面可以走，繞過信箋、白玉鎮紙、筆架、水盂、硯台；左前角、右前角兩個跳點 */
  TB:{desk:{poly:[[45,38.3],[91,46.3],[70.3,55.1],[21,47.1]],hy:[47.1,61,.7],hops:[["te",[27.5,47.4]],["fr2",[67,53.6]]],
    ob:[[[45,43.2],[75.5,47.4],[63.6,53.4],[33.5,47.9]],[[43.5,41],[51,41],[51,43.6],[43.5,43.6]],[[65,41],[79,41],[79,46.3],[65,46.3]],[[78.5,44],[85.5,44],[85.5,48],[78.5,48]],[[71.5,47.8],[81.5,47.8],[81.5,52.5],[71.5,52.5]]]}},TS:{".fbp-paper":"fbpWrite",".fbp-slip":"fbpBoard",".fbp-slipn":"fbpBoard"},   /* 回饋 816：點書案桌面任何一處＝跳上案角；點信箋本身＝先跳上去再打開 */   /* 回饋 808：點「寫信」＝走到書案左前角、跳上案角（不站在信箋上），揮手後打開信箋 */
  HS:{fbpBoard:["brd",18,40,"bow"],fbpWrite:["tb",50,47,"wave"]}};
const fbpPc=(x,y)=>[x/7.68,y/13.76];
const fbpDark=()=>{const t=store.get("pageTheme","auto");return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)};
/* 錯誤模式的淡棋盤（程式畫，保證畫對）：9 直 10 橫、河界、九宮 X */
function fbpGrid(){const L=[];for(let i=0;i<9;i++)L.push(i%8?`M${i} 0V4M${i} 5V9`:`M${i} 0V9`);for(let j=0;j<10;j++)L.push(`M0 ${j}H8`);L.push("M3 0L5 2M5 0L3 2M3 7L5 9M5 7L3 9");
  return`<svg class="fbp-grid" viewBox="-.6 -.6 9.2 10.2" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${L.join("")}" fill="none" stroke="currentColor" stroke-width=".06"/></svg>`}
function fbpCss(){if(document.getElementById("fbpCss"))return;const s=document.createElement("style");s.id="fbpCss";s.textContent=`
.fbp-page{margin:0 0 6px}.fbp-page .shp-spot{max-width:44%;padding:3px 10px;z-index:3}.fbp-page .shp-spot b{white-space:nowrap;font-size:13.5px}
.fbp-fx{position:absolute;inset:0;pointer-events:none}
.fbp-slot{position:absolute;width:5.6%;height:2.4%;transform:translate(-50%,-50%);border-radius:40%;border:2px solid transparent;pointer-events:auto;background:none;padding:0;cursor:pointer}
.fbp-slot.on{border-color:#f2c94c;box-shadow:0 0 8px #f2c94c,inset 0 0 6px rgba(242,201,76,.6)}
.fbp-ty{position:absolute;right:1.5%;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:auto;z-index:4}
.fbp-ty button{border:1.5px solid #b08a3c;border-radius:999px;background:rgba(30,24,18,.72);color:#f6e7c8;font:800 12.5px/1 var(--serif,serif);padding:4px 9px;white-space:nowrap;cursor:pointer}
.fbp-ty button[data-i="0"]{background:rgba(236,229,214,.94);color:#3a2a1c;border-color:#9a8a6a}.fbp-ty button[data-i="1"]{background:rgba(150,52,36,.9);color:#fbeedd;border-color:#c78a5a}.fbp-ty button[data-i="2"]{background:rgba(44,88,102,.9);color:#e8f1ef;border-color:#7fa6a8}
.fbp-ty button.on{border-color:#f2c94c;box-shadow:0 0 0 2px #f2c94c,0 0 8px rgba(242,201,76,.8)}
.fbp-ty small{font-size:10px;opacity:.75;margin-left:3px;font-weight:600}
.fbp-paper{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:auto;cursor:text;overflow:hidden;color:#5a2f22;border:0;padding:0;background:none;text-align:left}
.fbp-paper .fbp-grid{position:absolute;inset:6% 8%;width:84%;height:88%;color:rgba(150,52,36,.22);display:none}
.fbp-page.err .fbp-paper .fbp-grid{display:block}
.fbp-paper p{position:relative;margin:0;padding:7% 9%;font:600 9px/1.45 var(--serif,serif);white-space:pre-wrap;word-break:break-all;max-height:100%;opacity:.9}
.fbp-paper p:empty{height:100%;display:flex;align-items:center;justify-content:center;padding:0}.fbp-paper p:empty::before{content:"點這裡寫信";opacity:.8;background:rgba(238,226,206,.94);padding:1px 6px;border-radius:2px;font-size:10px}   /* 回饋 854：空白信紙的提示字置中、墊紙色，不跟錯誤模式的淡棋盤格線疊在一起 */
.fbp-seal{position:absolute;transform:translate(-50%,-50%);border-radius:50%;border:0;padding:0;cursor:pointer;pointer-events:auto;z-index:4;
  background:radial-gradient(circle at 40% 35%,#fff7e6,#eedcb6 70%,#d9bf8c);box-shadow:inset 0 0 0 2px #a63a24,inset 0 0 0 4px #f3e3c0,inset 0 0 0 5px #a63a24,0 2px 3px rgba(0,0,0,.35);
  color:#a63a24;font:900 15px/1 var(--serif,serif);display:flex;align-items:center;justify-content:center}
.fbp-seal.stamp{animation:fbpStamp .6s ease}@keyframes fbpStamp{0%{transform:translate(-50%,-50%) scale(1)}35%{transform:translate(-50%,-80%) scale(1.25)}70%{transform:translate(-50%,-45%) scale(.92)}100%{transform:translate(-50%,-50%) scale(1)}}
.fbp-thumbs{position:absolute;display:flex;gap:2px;transform:translate(-10%,0);pointer-events:none}
.fbp-thumbs img{width:14px;height:14px;object-fit:cover;border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.4);border-radius:2px}
.fbp-thumbs i{font-style:normal;font:700 10px/14px sans-serif;background:rgba(30,24,18,.7);color:#fff;border-radius:7px;padding:0 4px}
.fbp-q{position:absolute;transform:translate(-30%,75%);background:rgba(30,24,18,.78);color:#ffe7a8;font:700 11px/1 sans-serif;border-radius:999px;padding:3px 7px;white-space:nowrap;display:none}
.fbp-q.on{display:block}
.fbp-slip{position:absolute;background:#f7efdc;border-radius:1px;padding:2px 1px;font:600 8px/1.15 var(--serif,serif);color:#3a2618;overflow:hidden;writing-mode:vertical-rl;transform:skewY(-6deg);transform-origin:0 0;box-shadow:0 0 0 .5px rgba(60,40,20,.35)}
.fbp-slip b{display:inline-block;color:#b23a26;border:1px solid #b23a26;border-radius:2px;font-size:7px;padding:1px 0;margin:0 0 2px}
.fbp-slipn{position:absolute;transform:translate(0,-50%);background:rgba(30,24,18,.75);color:#f6e7c8;font:700 9px/1 sans-serif;border-radius:999px;padding:2px 6px;white-space:nowrap;display:none}.fbp-slipn.on{display:block}
.fbp-ty .eic{width:15px;height:15px;vertical-align:-3px;margin-right:2px}
/* 開發者 11/10：寫信送出＝飛鴿傳書（秦～隋是鴻雁傳書）：信紙捲成小信筒，鳥從窗外飛進來、落在書案上叼走信筒、從窗口飛走 */
.fbp-sky{position:absolute;inset:0;pointer-events:none;z-index:6;clip-path:polygon(59.2% 9.2%,92.2% 10.8%,92.1% 31.6%,59.2% 29.1%)}   /* 窗洞（FBP_WINP）：鳥在窗外時只在這裡看得到 */
.fbp-bird{position:absolute;left:0;top:0;height:auto;pointer-events:none;z-index:6;display:none}.fbp-bird.on{display:block}
.fbp-note{position:absolute;font:900 15px var(--serif,serif);color:#3a2618;background:rgba(255,250,240,.9);border-radius:999px;padding:2px 8px;white-space:nowrap;pointer-events:none;z-index:7;animation:fbpNote 1.1s ease forwards}@keyframes fbpNote{0%{opacity:0;transform:translate(-50%,0) scale(.6)}25%{opacity:1;transform:translate(-50%,-30%) scale(1.05)}80%{opacity:1}100%{opacity:0;transform:translate(-30%,-90%)}}
.fbp-roll{position:absolute;width:3.4%;height:1.2%;transform:translate(-50%,-50%) rotate(-14deg);background:linear-gradient(#f6ead2,#d8c39a);border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.45),inset 0 0 0 .5px #8a6a40;display:none;z-index:5;pointer-events:none}
.fbp-roll::after{content:"";position:absolute;left:44%;top:-15%;width:12%;height:130%;background:#a63a24}.fbp-roll.on{display:block}
.fbp-cap{position:absolute;left:50%;top:5%;transform:translateX(-50%);font:900 19px var(--serif,serif);letter-spacing:.25em;color:#3a2618;background:rgba(246,236,214,.88);padding:3px 8px 3px 13px;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.25);opacity:0;pointer-events:none;z-index:7;white-space:nowrap}
.fbp-cap.on{animation:fbpCap 2.7s ease forwards}@keyframes fbpCap{0%{opacity:0;transform:translate(-50%,8px)}14%,78%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-4px)}}
.fbp-page.sent .fbp-paper{transition:transform .7s ease-in,opacity .7s ease-in;opacity:0}
.fbp-pn{position:fixed;left:10px;right:10px;top:calc(var(--xqT,56px) + 6px);z-index:950;display:flex;flex-direction:column;max-height:calc(100vh - var(--xqT,56px) - var(--xqB,64px) - 14px);max-height:calc(100dvh - var(--xqT,56px) - var(--xqB,64px) - 14px);
  background:#f6dccc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .3 0 0 0 0 .25 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
  color:#3a2216;border-radius:4px;box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 0 0 1px rgba(150,70,50,.25);transform:translateY(calc(-100% - var(--xqT,56px) - 40px));transition:transform .28s ease;overflow:hidden}
.fbp-pn.open{transform:none}
.fbp-pn-h{display:flex;align-items:center;gap:8px;padding:9px 12px 4px;font:900 15px var(--serif,serif)}.fbp-pn-h button{margin-left:auto;border:1px solid rgba(90,40,20,.35);background:rgba(255,255,255,.35);border-radius:999px;padding:4px 10px;font:700 13px var(--serif,serif);color:inherit;cursor:pointer}
.fbp-pn-b{overflow:auto;padding:0 12px 12px;-webkit-overflow-scrolling:touch}
.fbp-pn .fbw{gap:10px}.fbp-pn .fbw .lead,.fbp-pn .fbw>div:first-child>.fbl{display:none}
.fbp-pn .fbt button{background:rgba(255,250,240,.6);border-color:rgba(120,60,40,.3)}.fbp-pn .fbt button.on{border-color:#a63a24;background:rgba(166,58,36,.12);box-shadow:0 0 0 2px rgba(166,58,36,.25)}
.fbp-pn .fbbox{position:relative}.fbp-pn .fbbox textarea{position:relative;z-index:1;background:rgba(255,248,240,.35);border-color:rgba(120,60,40,.3);min-height:24vh;font-family:var(--serif,serif)}
.fbp-pn .fbbox .fbp-grid{position:absolute;left:8%;right:8%;top:6%;bottom:10%;width:84%;height:84%;color:rgba(150,52,36,.16);display:none;z-index:0;pointer-events:none}
.fbp-pn.err .fbbox .fbp-grid{display:block}
.fbp-pn .fba label{background:rgba(255,250,240,.5);border-color:rgba(120,60,40,.35)}
.fbp-pn input#fc{background:rgba(255,250,240,.5);border-color:rgba(120,60,40,.3)}
.fbp-pn #go{display:none}
.fbp-send{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:2px}
.fbp-send .fbp-seal{position:relative;transform:none;width:46px;height:46px;font-size:22px}
.fbp-send .fbp-seal.stamp{animation:fbpStamp2 .6s ease}@keyframes fbpStamp2{35%{transform:translateY(-8px) scale(1.2)}70%{transform:scale(.92)}}
.fbp-send b{font:900 15px var(--serif,serif)}
.fbp-list{padding-top:4px}.fbp-list .sec-t{display:flex;align-items:baseline;gap:8px}.fbp-list.flash{animation:smFlashL 1.4s ease-out 1}@keyframes smFlashL{0%{box-shadow:0 0 0 0 rgba(242,201,76,.9)}40%{box-shadow:0 0 0 6px rgba(242,201,76,.5)}100%{box-shadow:0 0 0 0 rgba(242,201,76,0)}}
.fbp-bws{position:fixed;inset:0;z-index:948;background:rgba(20,14,8,.35);display:none}.fbp-bws.open{display:block}
.fbp-pns{position:fixed;inset:0;z-index:949;background:rgba(20,14,8,.18);display:none}.fbp-pns.open{display:block}   /* 822：寫信大箋外面點一下＝收起（草稿留著） */
.fbp-bw{position:fixed;left:50%;top:calc(var(--xqT,56px) + 8px);bottom:calc(var(--xqB,64px) + 8px);width:min(92vw,460px);z-index:949;display:flex;flex-direction:column;
  transform:translate(-50%,10px) scale(.97);opacity:0;pointer-events:none;transition:transform .25s ease,opacity .2s;border-radius:2px;color:#2a1d12;border:2px solid #3a2a1c;
  background:#efe3c6 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .35 0 0 0 0 .2 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
  box-shadow:inset 0 0 0 5px #efe3c6,inset 0 0 0 6px rgba(58,42,28,.7),0 12px 32px rgba(0,0,0,.4)}
.fbp-bw.open{transform:translate(-50%,0);opacity:1;pointer-events:auto}
.fbp-bw-h{position:relative;display:flex;align-items:center;justify-content:center;padding:16px 44px 6px;font:900 20px/1.2 var(--kai,var(--serif,serif));letter-spacing:6px;color:#7a1e12}
.fbp-bw-h button{position:absolute;right:8px;top:8px;border:0;background:none;font-size:22px;color:inherit;cursor:pointer;padding:4px 8px;letter-spacing:0}
.fbp-bw-c{text-align:center;font:600 13px/1.5 var(--serif,serif);color:#6a5640;padding:0 16px 8px;margin:0 14px;border-bottom:1px solid rgba(58,42,28,.35)}
.fbp-bw-b{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:10px 14px 14px}
.fbp-bw-m{text-align:center;color:#6a5640;font:600 14px var(--serif,serif);margin:24px 0}
.fbp-bw .card{background:rgba(255,250,238,.7);border:1px solid rgba(110,80,50,.25);box-shadow:none;color:#2a1d12}.fbp-bw .muted{color:#6a5640}
.fbp-bw [style*="font-size:12px"],.fbp-bw [style*="font-size:11px"]{font-size:13px!important}
.fbp-bw-more{text-align:center;margin-top:6px}
.fbp-bw.dk{background:#1d212b;color:#e9e0cc;border-color:#8a7a5a;box-shadow:inset 0 0 0 5px #1d212b,inset 0 0 0 6px rgba(200,180,140,.5),0 12px 32px rgba(0,0,0,.6)}
.fbp-bw.dk .fbp-bw-h{color:#e8b7a0}.fbp-bw.dk .fbp-bw-c,.fbp-bw.dk .muted,.fbp-bw.dk .fbp-bw-m{color:#b8a888}.fbp-bw.dk .fbp-bw-c{border-color:rgba(200,180,140,.35)}
.fbp-bw.dk .card{background:rgba(255,255,255,.05);border-color:rgba(200,180,140,.2);color:#e9e0cc}
.fbp-slip,.fbp-slipn{cursor:pointer;pointer-events:auto}
@media (prefers-reduced-motion:reduce){.fbp-bw{transition:none}.fbp-pn{transition:none}.fbp-seal.stamp,.fbp-send .fbp-seal.stamp{animation:none}.fbp-page.sent .fbp-paper{transition:none}}`;document.head.append(s)}
/* 開發者 11/10：飛鴿傳書（秦～隋鴻雁傳書）。回饋 860「鴿子沒從窗戶飛走、動畫很粗糙」→ Gemini 64 方案 1「窗台駐足・振翅入雲」：
   信紙捲成小信筒 → 鳥從窗外飛進來（在窗外時只在窗洞裡看得到）、落在書案上低頭叼起信筒 → 跳上窗台回頭看（♫）→ 轉身從窗洞飛出去，越飛越小。
   窗洞＝底圖上量的四邊形 FBP_WINP（日夜兩張同構圖）；鳥在窗外時放進只露出窗洞的 .fbp-sky 圖層，看起來就是穿過窗洞。
   拍翅三格（舉翅 up、展翅 dn、半收 fold）輪流；站 stand、低頭 peck、背面飛走 away 各一張（data/feedback/bird_<鳥>_<姿勢>.webp，Gemini 畫，史學顧問核）。
   點一下畫面跳過；系統設定「減少動態」就不飛，照舊投進銅匭 */
const FBP_MID=[54.2,47.4],FBP_WINP=[[59.2,9.2],[92.2,10.8],[92.1,31.6],[59.2,29.1]],FBP_SILL=[77.5,30.4];
const FBP_BW={pigeon:{fly:20,stand:12.7,peck:15.1,away:14.4,step:55},goose:{fly:32,stand:12.9,peck:18.7,away:21.2,step:80}};
const fbpBirdK=()=>{const e=store.get("era","classic");return["qin","han","sanguo","weijin","nanbei","sui"].includes(e)?"goose":"pigeon"};
function fbpFly(P,paper){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return false}catch(e){}
  const b=P.querySelector(".fbp-bird"),r=P.querySelector(".fbp-roll"),cp=P.querySelector(".fbp-cap"),sky=P.querySelector(".fbp-sky");if(!b||!r||!sky||!window.requestAnimationFrame)return false;
  const K=fbpBirdK(),W=FBP_BW[K],src=p=>"data/feedback/bird_"+K+"_"+p+".webp";["up","dn","fold","stand","peck","away"].forEach(p=>{const i=new Image();i.src=src(p)});
  const k=P.clientWidth/768,{o,x,y}=FBP_PAPER,w=Math.hypot(x[0]-o[0],x[1]-o[1])*k,h=Math.hypot(y[0]-o[0],y[1]-o[1])*k;
  paper.style.transform+=" translate("+(w/2).toFixed(0)+"px,"+(h/2).toFixed(0)+"px) scale(.12) translate("+(-w/2).toFixed(0)+"px,"+(-h/2).toFixed(0)+"px)";
  setTimeout(()=>r.classList.add("on"),550);
  cp.textContent=K==="goose"?"鴻雁傳書":"飛鴿傳書";setTimeout(()=>cp.classList.add("on"),500);
  const[mx,my]=FBP_MID,[sx,sy]=FBP_SILL;
  /* 關鍵格：t 毫秒、x y 腳踩的點（圖上 %）、s 大小、m 姿勢、f 臉朝左、L 圖層（sky＝只在窗洞裡看得到）、a 透明度 */
  const KF=[{t:350,x:89,y:13,s:.3,m:"fly",f:1,L:"sky"},{t:820,x:76,y:21,s:.5,m:"fly",f:1,L:"room"},{t:1350,x:mx+7,y:my-7,s:1,m:"fly",f:1,L:"room"},
    {t:1560,x:mx+5,y:my+.6,s:1,m:"peck",f:1,L:"room"},{t:2150,x:mx+5,y:my+.6,s:1,m:"peck",f:1,L:"room"},{t:2250,x:mx+5,y:my-3,s:.95,m:"fly",f:0,L:"room"},
    {t:2500,x:(mx+5+sx)/2+2,y:my-15,s:.75,m:"fly",f:0,L:"room"},{t:2760,x:sx,y:sy,s:.72,m:"stand",f:0,L:"room"},{t:3350,x:sx,y:sy,s:.72,m:"stand",f:0,L:"room"},
    {t:3420,x:sx+1,y:sy-1.5,s:.72,m:"away",f:0,L:"sky"},{t:4250,x:88,y:12,s:.16,m:"away",f:0,L:"sky",a:0}];
  const AY={fly:75,stand:100,peck:100,away:70},SEQ=["up","up","dn","fold","fold","dn"],ez=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
  let t0=0,done=false,lastSrc="",note=false;
  const end=()=>{if(done)return;done=true;b.classList.remove("on");r.classList.remove("on");P.removeEventListener("pointerdown",end,true)};
  P.addEventListener("pointerdown",end,true);
  const tick=now=>{if(done||!P.isConnected)return;if(!t0)t0=now;const t=now-t0;if(t>=KF[KF.length-1].t){end();return}
    if(t<KF[0].t){requestAnimationFrame(tick);return}
    let i=0;while(i<KF.length-2&&t>=KF[i+1].t)i++;const A=KF[i],B=KF[i+1],u=ez(Math.min(1,(t-A.t)/Math.max(1,B.t-A.t))),L=(a,c)=>a+(c-a)*u;
    const X=L(A.x,B.x),Y=L(A.y,B.y),S=L(A.s,B.s),op=L(A.a==null?1:A.a,B.a==null?1:B.a);
    const want=A.L==="sky"?sky:P;if(b.parentNode!==want)want.append(b);
    const s=A.m==="fly"?src(SEQ[Math.floor(t/W.step)%SEQ.length]):src(A.m);if(s!==lastSrc){b.src=s;lastSrc=s}
    const bob=A.m==="fly"?Math.sin(t/W.step*Math.PI/3)*.35:0;
    Object.assign(b.style,{left:X+"%",top:(Y+bob)+"%",width:(W[A.m==="fly"?"fly":A.m]*S)+"%",opacity:op,transform:"translate(-50%,-"+AY[A.m]+"%)"+(A.f?" scaleX(-1)":"")});
    if(!b.classList.contains("on"))b.classList.add("on");
    if(t>=1850&&r.classList.contains("on"))r.classList.remove("on");
    if(!note&&t>=2850){note=true;const n=document.createElement("span");n.className="fbp-note";n.textContent=K==="goose"?"嘎～":"咕咕♫";n.style.left=(sx-1)+"%";n.style.top=(sy-7)+"%";P.append(n);setTimeout(()=>n.remove(),1100)}
    requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
  return true}
let FBP_F0=null,FBP_FX0=null;
function FeedbackPage(v,sub){fbpCss();setTop("💬 意見回饋",fbpFrom()||"#/settings");if(typeof setTabs==="function")setTabs(true,"#/settings");v.className="view";
  const st={vv:null,ro:null,stop:false};
  const render=()=>{
    const dk=fbpDark(),pc=fbpPc,[sx,sy]=pc(FBP_SEAL[0],FBP_SEAL[1]),[qx,qy]=pc(FBP_PILL[0],FBP_PILL[1]),[jx,jy]=pc(FBP_JADE[0],FBP_JADE[1]);
    const[nx,ny]=pc(FBP_SLIPN[0],FBP_SLIPN[1]);
    v.innerHTML=`<div class="shp-page cq fbp-page"><img src="data/feedback/${dk?"fb_night":"fb_day"}.webp?v=${FBP_IMGV}" alt="驛站信房"><div class="fbp-fx" aria-hidden="true"></div>
      <button type="button" class="fbp-paper" aria-label="寫信"><svg></svg><p></p></button>
      ${FBP_SLOT.map(([t,n,x,y],i)=>{const[px,py]=pc(x,y);return`<button type="button" class="fbp-slot" data-i="${i}" style="left:${px.toFixed(2)}%;top:${py.toFixed(2)}%" aria-label="${esc(n+"・"+t)}"></button>`}).join("")}
      <div class="fbp-ty" style="top:${(pc(0,520)[1]).toFixed(2)}%">${FBP_SLOT.map(([t,n,,,ik],i)=>`<button type="button" data-i="${i}">${FBP_ICO(ik)}${esc(t)}<small>${esc(n)}</small></button>`).join("")}</div>
      <button type="button" class="fbp-seal" style="left:${sx.toFixed(2)}%;top:${sy.toFixed(2)}%;width:${(FBP_SEAL[2]*2/7.68).toFixed(2)}%;aspect-ratio:1" aria-label="蓋印送出">兵</button>
      <div class="fbp-thumbs" style="left:${jx.toFixed(2)}%;top:${(jy+1.2).toFixed(2)}%"></div>
      <span class="fbp-q" style="left:${qx.toFixed(2)}%;top:${qy.toFixed(2)}%"></span><span class="fbp-roll" style="left:${FBP_MID[0].toFixed(2)}%;top:${FBP_MID[1].toFixed(2)}%"></span><div class="fbp-sky"></div><img class="fbp-bird" alt=""><div class="fbp-cap"></div>
      <div class="fbp-slips">${FBP_SLIPS.map(([x,y,w,h])=>{const[a,b]=pc(x,y);return`<div class="fbp-slip" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%;width:${(w/7.68).toFixed(2)}%;height:${(h/13.76).toFixed(2)}%;display:none"></div>`}).join("")}<span class="fbp-slipn" style="left:${nx.toFixed(2)}%;top:${ny.toFixed(2)}%"></span></div>
      <button class="shp-spot" id="fbpWrite" style="left:47%;top:37.6%"><b>✍ 寫信</b></button>
      <button class="shp-spot" id="fbpBoard" style="left:19%;top:15.5%"><b>📋 修正紀錄</b></button></div>`;   /* 回饋 812：圖下面不再接修正紀錄清單（改成告示榜的榜文面板）；回饋 830：拿掉「🖋 送出」標籤——跟紙上那方「兵」朱印（蓋印送出）是同一件事，留朱印一個 */
    const P=v.querySelector(".fbp-page"),paper=P.querySelector(".fbp-paper");paper.querySelector("svg").outerHTML=fbpGrid();
    /* 箋紙：一個長方形用 matrix 斜貼到書案上的箋紙（量好的三個角） */
    const fit=()=>{const k=P.clientWidth/768;if(!k)return;const{o,x,y}=FBP_PAPER,X=[x[0]-o[0],x[1]-o[1]],Y=[y[0]-o[0],y[1]-o[1]],lx=Math.hypot(...X),ly=Math.hypot(...Y);
      Object.assign(paper.style,{left:o[0]*k+"px",top:o[1]*k+"px",width:lx*k+"px",height:ly*k+"px",transform:`matrix(${X[0]/lx},${X[1]/lx},${Y[0]/ly},${Y[1]/ly},0,0)`})};
    fit();if(window.ResizeObserver){if(st.ro)st.ro.disconnect();st.ro=new ResizeObserver(fit);st.ro.observe(P)}
    /* 寫信的大箋：原本的 feedbackSheet 表單整份建在這裡（送出、附件、排隊都是原本的程式） */
    const pn=document.createElement("div");pn.className="fbp-pn";pn.setAttribute("role","dialog");pn.setAttribute("aria-label","寫信");v.append(pn);
    const s0=sheet;sheet=(t,f)=>{f(pn)};try{(FBP_F0||feedbackSheet)()}catch(e){}finally{sheet=s0}
    const fbw=pn.querySelector(".fbw");if(!fbw){P.querySelector(".fbp-paper").onclick=()=>(FBP_F0||feedbackSheet)();return}
    const body=document.createElement("div");body.className="fbp-pn-b";while(pn.firstChild)body.append(pn.firstChild);
    pn.innerHTML='<div class="fbp-pn-h">🖋 薛濤箋<button type="button">收起</button></div>';pn.append(body);
    {const bx=pn.querySelector(".fbbox");if(bx)bx.insertAdjacentHTML("afterbegin",fbpGrid())}
    {const b=pn.querySelectorAll("[data-y]")[1],i=b&&b.querySelector("i");if(i)i.innerHTML=FBP_ICO("fb_idea")}
    const go=pn.querySelector("#go");if(go)go.insertAdjacentHTML("afterend",'<div class="fbp-send"><button type="button" class="fbp-seal" aria-label="蓋印送出">兵</button><b>蓋印送出</b></div>');
    const fx=pn.querySelector("#fx"),pp=paper.querySelector("p");
    const open=on=>{const was=pn.classList.contains("open");if(on&&!was&&typeof xqPanelNav==="function")st.unNav=xqPanelNav(()=>{st.unNav=null;pn.classList.remove("open");fx.blur()});if(!on&&was&&st.unNav){const f=st.unNav;st.unNav=null;f()}pn.classList.toggle("open",on);if(on)setTimeout(()=>{try{fx.focus({preventScroll:true})}catch(e){fx.focus()}},280);else fx.blur()};
    pn.querySelector(".fbp-pn-h button").onclick=()=>open(false);{const ps=document.createElement("div");ps.className="fbp-pns";v.insertBefore(ps,pn);ps.onclick=()=>open(false);new MutationObserver(()=>ps.classList.toggle("open",pn.classList.contains("open"))).observe(pn,{attributes:true,attributeFilter:["class"]})}   /* 822：大箋外面（上下露出的圖面）點一下＝收起，打的字留著 */
    /* 鍵盤彈出：大箋留在鍵盤上方（看 visualViewport 的高度） */
    const vvFit=()=>{const vv=window.visualViewport;if(!vv)return;const R=getComputedStyle(document.documentElement),T=parseFloat(R.getPropertyValue("--xqT"))||0,B=parseFloat(R.getPropertyValue("--xqB"))||0,top=Math.max(vv.offsetTop+8,T+6),bot=Math.min(vv.offsetTop+vv.height-8,innerHeight-B-8);pn.style.top=top+"px";pn.style.maxHeight=Math.max(220,bot-top)+"px"};   /* 822：鍵盤之外，也不要被頂欄、底部導覽擋住 */
    if(window.visualViewport&&!st.vv){st.vv=vvFit;visualViewport.addEventListener("resize",vvFit);visualViewport.addEventListener("scroll",vvFit)}vvFit();if(typeof xqBars==="function"){xqBars();vvFit()}
    const ty=()=>{const b=pn.querySelector("[data-y].on");const all=[...pn.querySelectorAll("[data-y]")];return Math.max(0,all.indexOf(b))};
    const paint=()=>{const i=ty();P.querySelectorAll(".fbp-slot,.fbp-ty button").forEach(b=>b.classList.toggle("on",+b.dataset.i===i));P.classList.toggle("err",i===0);pn.classList.toggle("err",i===0);
      pp.textContent=fx.value.slice(0,160);
      const th=P.querySelector(".fbp-thumbs"),im=[...pn.querySelectorAll("#fps img")].map(x=>x.src),nf=pn.querySelectorAll("#ffl .fch").length;
      th.innerHTML=im.map(s=>`<img src="${s}" alt="">`).join("")+(nf?`<i>📎${nf}</i>`:"");
      const q=(store.get("fbQueue",[])||[]).filter(r=>r.type&&!/玩家/.test(r.type)).length,qe=P.querySelector(".fbp-q");qe.textContent=q?`待送 ${q}`:"";qe.classList.toggle("on",!!q)};
    const pick=i=>{const b=pn.querySelectorAll("[data-y]")[i];if(b)b.click();paint()};
    P.querySelectorAll(".fbp-slot,.fbp-ty button").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);pick(+b.dataset.i)});
    pn.querySelectorAll("[data-y]").forEach(b=>b.addEventListener("click",()=>setTimeout(paint,0)));
    fx.addEventListener("input",paint);new MutationObserver(paint).observe(body,{childList:true,subtree:true});
    paper.onclick=()=>{vibrate(5);open(true)};P.querySelector("#fbpWrite").onclick=()=>{vibrate(5);open(true)};
    /* 送出＝蓋印：先蓋印、箋紙摺進匭裡，再跑原本的送出（成功或排隊都由原本的程式 toast） */
    const send=async()=>{if(!go||go.disabled)return;if(fx.value.trim().length<2){open(true);toast("請先寫下內容");return}
      vibrate(10);open(false);P.querySelectorAll(".fbp-seal").forEach(s=>{s.classList.remove("stamp");void s.offsetWidth;s.classList.add("stamp")});pn.querySelectorAll(".fbp-seal").forEach(s=>s.classList.add("stamp"));
      const fly=fbpFly(P,paper);if(!fly){const sl=FBP_SLOT[ty()],k=P.clientWidth/768,{o}=FBP_PAPER;paper.style.transform+=` translate(${((sl[2]-o[0])*k*.6).toFixed(0)}px,${((sl[3]-o[1])*k*.6).toFixed(0)}px) scale(.15)`}
      setTimeout(()=>P.classList.add("sent"),250);
      try{await go.onclick({target:go})}catch(e){}
      setTimeout(()=>{if(!st.stop&&v.isConnected&&/^#\/feedback/.test(location.hash))render()},fly?4400:900)};
    P.querySelector(".fbp-seal").onclick=e=>{e.stopPropagation();send()};
    {const s=pn.querySelector(".fbp-send .fbp-seal");if(s)s.onclick=()=>send()}
    /* 回饋 812（開發者 11/9）：頁面只留滿版圖。告示榜（標籤、榜上的回條、「共 N 張」）＝在圖上展開一張直式榜文：
       標題那行照舊（開發者看全部、玩家看自己回報且已修好的），清單照舊用 fixList；一次先排 20 筆，捲到底或按「再看」再接 20 筆；返回鍵、榜外、✕ 都收起；#/feedback/fixes 直接打開 */
    const bw=document.createElement("div");bw.className="fbp-bw"+(dk?" dk":"");bw.setAttribute("role","dialog");bw.setAttribute("aria-label","修正紀錄");
    bw.innerHTML='<div class="fbp-bw-h"><b>修正紀錄</b><button type="button" aria-label="收起">✕</button></div><div class="fbp-bw-c"></div><div class="fbp-bw-b"><div class="fbp-fl"><p class="fbp-bw-m">讀取中…</p></div><div class="fbp-bw-more"></div></div>';
    const bs=document.createElement("div");bs.className="fbp-bws";v.append(bs,bw);
    let FX=null,shown=0,unB=null;const BN=20,fl=bw.querySelector(".fbp-fl"),sc=bw.querySelector(".fbp-bw-b");
    const more=()=>{if(!FX||shown>=FX.items.length)return;const nx=FX.items.slice(shown,shown+BN);fl.insertAdjacentHTML("beforeend",fixList(nx,FX.dev));shown+=nx.length;
      const m=bw.querySelector(".fbp-bw-more"),left=FX.items.length-shown;m.innerHTML=left>0?`<button type="button" class="btn ghost">再看 ${Math.min(BN,left)} 筆（還有 ${left} 筆）</button>`:"";const b=m.querySelector("button");if(b)b.onclick=()=>{vibrate(5);more()}};
    sc.addEventListener("scroll",()=>{if(sc.scrollTop+sc.clientHeight>sc.scrollHeight-240)more()},{passive:true});
    const openB=()=>{if(bw.classList.contains("open"))return;bw.classList.add("open");bs.classList.add("open");if(typeof xqPanelNav==="function")unB=xqPanelNav(()=>{unB=null;bw.classList.remove("open");bs.classList.remove("open")})};
    const closeB=()=>{bw.classList.remove("open");bs.classList.remove("open");if(unB){const f=unB;unB=null;f()}};
    bw.querySelector(".fbp-bw-h button").onclick=closeB;bs.onclick=closeB;
    P.querySelector("#fbpBoard").onclick=()=>{vibrate(5);openB()};P.querySelectorAll(".fbp-slip,.fbp-slipn").forEach(e=>e.onclick=()=>{vibrate(5);openB()});
    (typeof myFixes==="function"?myFixes():Promise.resolve(null)).then(F=>{if(!v.isConnected)return;const cap=bw.querySelector(".fbp-bw-c");
      if(!F){fl.innerHTML='<p class="fbp-bw-m">讀不到修正紀錄</p>';return}
      FX=F;cap.textContent=F.dev?"全部的修正，最新的在最上面":"你回報、已經修好的問題";fl.innerHTML="";if(F.items.length)more();else fl.innerHTML=fixList([],F.dev);
      const top=F.items.slice(0,3);P.querySelectorAll(".fbp-slip").forEach((e,i)=>{const x=top[i];if(!x)return;e.style.display="";fbpSlipFit(e,String(x.n||"已修正").replace(/^[✅\s]+/,""))});
      /* 回饋 861（開發者 11/10）「不用把張數寫出來」：告示榜不再標「共 N 張」 */}).catch(()=>{if(v.isConnected)fl.innerHTML='<p class="fbp-bw-m">讀不到修正紀錄</p>'});
    if(sub==="fixes"){sub="";setTimeout(openB,60)}
    {const pre=fbrTake();if(pre){pick(pre.y|0);fx.value=pre.t+"\n";fx.dispatchEvent(new Event("input"));setTimeout(()=>{open(true);setTimeout(()=>{try{fx.setSelectionRange(fx.value.length,fx.value.length)}catch(e){}},320)},350)}}   /* fbr：從開發者回覆的飛鴿按「回覆開發者」進來，先帶好「回覆第 N 列」和類型 */
    paint();
    try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_FBP),"fbp")}catch(e){}
    try{if(typeof exSync==="function")exSync()}catch(e){}};   /* 開發者 11/10「這一頁沒有出入口」：寄出信後整頁重畫會洗掉圖上的出口標籤（07w9 只在換頁時放），重畫完再放一次 */
  render();
  return{stop(){st.stop=true;if(st.ro)st.ro.disconnect();if(st.vv&&window.visualViewport){visualViewport.removeEventListener("resize",st.vv);visualViewport.removeEventListener("scroll",st.vv)}}}}
/* 開發者 11/11 hspx「從哪來就從哪回去，意見回饋也要遵循」：記下從哪一頁進信房（首頁「💬 回報問題」、星槎、天字客房、大廳…），圖上出口（07w9 exDyn）和返回照這個回去 */
const fbpFrom=()=>{try{return sessionStorage.getItem("xqFbFrom")||""}catch(e){return""}},fbpFromSet=h=>{try{if(!/^#\/feedback/.test(h||""))sessionStorage.setItem("xqFbFrom",h||"#/")}catch(e){}};
addEventListener("hashchange",e=>{try{if(/^#\/feedback/.test(location.hash))fbpFromSet(new URL(e.oldURL).hash||"#/")}catch(x){}});
if(typeof feedbackSheet==="function"){FBP_F0=feedbackSheet;feedbackSheet=function(){if(FEEDBACK_PAGE_ON){fbpFromSet(location.hash||"#/");location.hash="#/feedback";return}const r=FBP_F0.apply(this,arguments);
  setTimeout(()=>{const fx=document.querySelector("#sheet #fx");if(!fx||typeof fbrTake!=="function")return;const pre=fbrTake();if(!pre)return;const b=document.querySelectorAll("#sheet [data-y]")[pre.y|0];if(b)b.click();fx.value=pre.t+"\n";fx.dispatchEvent(new Event("input"))},60);return r}}   /* 信房關掉時（底部表單）也帶入回覆開頭 */
if(typeof fixHistory==="function"){FBP_FX0=fixHistory;fixHistory=function(){if(FEEDBACK_PAGE_ON){location.hash="#/feedback/fixes";return}return FBP_FX0.apply(this,arguments)}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){if(FEEDBACK_PAGE_ON&&!hub&&/^#\/feedback(\/|$)/.test(location.hash))return FeedbackPage(v,location.hash.split("/")[2]||"");return f0.apply(this,arguments)}}

/* ================= 🕊 修好回信（開發者 11/10；Gemini 65 方案 1「小帥肩上的小夥伴」，開發者選「不處理的也寄信」）=================
   玩家自己回報的問題修好了（或開發者決定先不處理），下次回到首頁（棋鎮）時，一隻信鴿（秦～隋是大雁）從右上飛來，停在玩家角色的肩上，頭上冒 ✉️；
   點鳥或角色就打開一封「綜合回信」：玩家上次寫的那一句（手機上自己存的 fbMine，寄出時記下，只在這支手機）、開發者怎麼修的（回饋表 N 欄，去掉版本號）。
   資料：data/fixes.json（只放線上 ID 的雜湊，不放玩家原文）；開發者自己寫的（d:1）不寄；不處理的（no:1）寫「好點子收進百寶箱」。
   規則：開 App 5 秒內、有面板或彈窗、不在首頁時不飛來；一次只來一隻、一封信列全部；沒點的話 12 秒後飛走，下次回首頁再來；第一次啟用時，3 天前的舊回信算看過 */
const FBL_ON=true;let FBL_BUSY=false,FBL_T0=Date.now();
const fblKey=x=>x.at+"|"+x.ty+"|"+(x.no?"n":"f");
function fblAtMs(s){const m=String(s||"").match(/(\d+)\/(\d+)\/(\d+)\s*(上午|下午)?\s*(\d+):(\d+)/);if(!m)return 0;let h=+m[5]%12;if(m[4]==="下午")h+=12;return new Date(+m[1],+m[2]-1,+m[3],h,+m[6]).getTime()}
function fblQuote(x){try{const t=fblAtMs(x.at);if(!t)return"";const L=store.get("fbMine",[])||[];let best=null,bd=4*60e3;for(const e of L){const d=Math.abs(e.at-t);if(d<bd){bd=d;best=e}}return best?best.t:""}catch(e){return""}}
function fblNote(n){n=String(n||"").replace(/^(進度\s*)?\d{8}-\d{4}\s*(已完成)?[：:（(]?\s*/,"");const s=n.split(/[。；]/)[0];return s.length>60?s.slice(0,58)+"…":s}
async function fblPending(){if(typeof fixHash!=="function"||typeof meInfo!=="function")return[];const id=(meInfo()||{}).id;if(!id)return[];const h=await fixHash(id);
  const d=await fetch("data/fixes.json?v="+encodeURIComponent(window.XQ_BUILD||"")).then(r=>r.json()).catch(()=>null);if(!d)return[];
  const mine=(d.items||[]).filter(x=>x.h===h&&!x.d),seen=new Set(store.get("fbLetterSeen",[])||[]);
  if(!store.get("fbLetterInit",false)){const old=Date.now()-3*864e5;mine.forEach(x=>{if(fblAtMs(x.at)<old)seen.add(fblKey(x))});store.set("fbLetterSeen",[...seen].slice(-800));store.set("fbLetterInit",true)}
  const re=(d.replies||[]).filter(x=>x&&x.h===h&&x.re).map(x=>Object.assign({},x,{_re:1}));   /* 開發者回覆（fbr）：只取自己 ID 雜湊的那幾列 */
  return mine.filter(x=>!seen.has(fblKey(x))).concat(re.filter(x=>!seen.has(fbrKey(x))))}
/* ================= ✉ 開發者回覆玩家（hspx 開發者 11/13，前綴 fbr／FBR_）=================
   開發者在管理頁（feedback-api.gs）某一列按「✉ 回覆玩家」寫話（快捷：請補截圖、請說明怎麼重現、已修好請更新、自訂），存在回饋表「回覆玩家」欄；
   發布前 fixes-export.snippet.js 匯出到 fixes.json 的 replies（只放列號、線上 ID 雜湊、回報時間、類型、開發者的話；玩家原文不放）。
   App 照修好回信的飛鴿：下次回到首頁，鳥停在角色肩上；信裡有「你上次告訴我們」（手機自己存的 fbMine）和開發者的話。
   要玩家補東西的回覆有「✍ 回覆開發者」：直接開信房、類型照原本的、內容先帶「回覆第 N 列（11/13 回報的錯誤）：」，可附截圖；管理頁看到這開頭就連回原列。
   回覆改了字＝新的一封（key 帶字的雜湊）；寫「已修好」那類不放回覆鈕。
   11/13 開發者決定同一列回覆多次全部留著：fixes.json 裡同一列可能有好幾筆（照順序），各是一封，信上寫回覆時間 rt */
const fbrHash=s=>{let h=5381;s=String(s||"");for(let i=0;i<s.length;i++)h=(h*33+s.charCodeAt(i))>>>0;return h.toString(36)};
const fbrKey=x=>"re|"+x.r+"|"+fbrHash(x.re);
const fbrAsk=x=>!/已修好|修好了|已經修好|已修正/.test(String(x.re||""));
const fbrTyN=t=>/錯誤/.test(t||"")?0:/建議/.test(t||"")?1:2;
function fbrPre(x){const d=String(x.at||"").split(" ")[0].replace(/^\d{4}\//,""),n=String(x.ty||"").replace(/^\S+\s*/,"")||"回報";return"回覆第 "+x.r+" 列（"+d+" 回報的"+n+"）："}
function fbrTake(){try{const s=sessionStorage.getItem("xqFbPre");if(!s)return null;sessionStorage.removeItem("xqFbPre");const p=JSON.parse(s);return p&&p.t?p:null}catch(e){return null}}
function fbrReply(x){try{sessionStorage.setItem("xqFbPre",JSON.stringify({t:fbrPre(x),y:fbrTyN(x.ty)}))}catch(e){}if(typeof feedbackSheet==="function")feedbackSheet()}
function fbrItem(x,i){const q=fblQuote(x),d=esc(String(x.at||"").split(" ")[0]);
  return'<div class="it">'+(q?'你在 '+d+' 告訴我們：<span class="q">「'+esc(q)+'」</span><br>':'你在 '+d+' 回報的'+esc(x.ty||"意見")+'<br>')+
    '<b>開發者回覆你'+(x.rt?'（'+esc(x.rt)+'）':'')+'：</b><div class="fbr-say">'+esc(x.re)+'</div>'+(fbrAsk(x)?'<button class="btn ghost fbr-go" type="button" data-i="'+i+'">✍ 回覆開發者（可以附截圖）</button>':'')+'</div>'}
function fblCss(){if(document.getElementById("fblCss"))return;const s=document.createElement("style");s.id="fblCss";s.textContent=`
.fbl-bird{position:fixed;left:0;top:0;z-index:960;pointer-events:auto;cursor:pointer;height:auto;filter:drop-shadow(0 3px 3px rgba(0,0,0,.25))}
.fbl-tag{position:fixed;z-index:961;transform:translate(-50%,-100%);font-size:20px;pointer-events:none;animation:fblBob 1s ease-in-out infinite alternate}@keyframes fblBob{to{transform:translate(-50%,-125%)}}
.fbl-say{position:fixed;z-index:961;transform:translate(-50%,-100%);background:rgba(255,250,240,.95);color:#3a2618;border-radius:999px;padding:3px 10px;font:800 13px var(--serif,serif);white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2);pointer-events:none}
.fbl-bg{position:fixed;inset:0;z-index:970;background:rgba(20,14,8,.45);display:flex;align-items:center;justify-content:center;padding:18px}
.fbl-paper{max-width:380px;width:100%;max-height:80vh;overflow:auto;background:#f6ead2;color:#3a2618;border-radius:6px;padding:20px 18px 14px;font:500 15px/1.75 var(--serif,serif);box-shadow:0 12px 30px rgba(0,0,0,.4),inset 0 0 0 1px rgba(120,80,40,.25);animation:fblOpen .45s ease}
@keyframes fblOpen{from{transform:scaleY(.2);opacity:0}to{transform:none;opacity:1}}
.fbl-paper h3{margin:0 0 6px;font:900 17px var(--serif,serif)}.fbl-paper .q{color:#7a4a2a}.fbl-paper .it{border-top:1px dashed rgba(120,80,40,.35);padding:8px 0}
.fbl-paper .sig{text-align:right;margin-top:6px}.fbl-paper .seal{display:inline-block;margin-left:6px;width:30px;height:30px;line-height:30px;text-align:center;border:2px solid #a63a24;color:#a63a24;border-radius:4px;font-weight:900;transform:rotate(-6deg)}
.fbl-paper .btn{width:100%;margin-top:10px}
.fbl-paper .fbr-say{margin:2px 0 0;padding:6px 10px;background:rgba(255,255,255,.55);border-left:3px solid #a63a24;border-radius:3px;white-space:pre-wrap;word-break:break-word}
.fbl-paper .fbr-go{margin-top:8px;font-size:14px}`;document.head.append(s)}
function fblOpen(L,done){fblCss();const nm=(typeof meName==="function"&&meName())||"棋手",bg=document.createElement("div");bg.className="fbl-bg";
  const it=L.map((x,i)=>{if(x._re)return fbrItem(x,i);const q=fblQuote(x),n=fblNote(x.n),bug=/錯誤/.test(x.ty);
    return'<div class="it">'+(q?'你上次告訴我們：<span class="q">「'+esc(q)+'」</span><br>':'你之前回報的'+esc(x.ty||"意見")+'（'+esc((x.at||"").split(" ")[0])+'）<br>')+
      (x.no?'我們仔細研究了你的建議，目前會先保持原樣，但你的好點子我們收進百寶箱囉！':(bug?'我們已經抓到這隻蟲子啦！':'你的好點子，我們做出來囉！')+(n?'<br><span class="muted">（開發者：'+esc(n)+'）</span>':''))+'</div>'}).join("");
  const nRe=L.filter(x=>x._re).length,lead=nRe===L.length?'開發者看了你的回報，有話想跟你說：':nRe?'你回報的事，開發者有新消息：':L.length>1?'你真是抓蟲大師！你回報的幾件事，我們都處理好了：':'';
  bg.innerHTML='<div class="fbl-paper" role="dialog" aria-label="回信"><h3>給聰明的棋手 '+esc(nm)+'：</h3>'+(lead?'<p style="margin:0">'+lead+'</p>':'')+it+
    '<p style="margin:8px 0 0">謝謝你讓這個世界變得更好！</p><div class="sig">── 象棋千秋開發者<span class="seal">兵</span></div><button class="btn" type="button">收到啦！</button></div>';
  document.body.append(bg);const close=()=>{bg.remove();done&&done()};bg.querySelector(".btn:not(.fbr-go)").onclick=()=>{vibrate(8);close()};bg.onclick=e=>{if(e.target===bg)close()};
  bg.querySelectorAll(".fbr-go").forEach(b=>b.onclick=()=>{vibrate(8);close();fbrReply(L[+b.dataset.i])})}
const fblBusyUI=()=>!!document.querySelector("#sheet,.fbl-bg,.modal,#fmOv,.fm-ov,.qq-ov,.title-ov,#titleOv");   /* 有面板、彈窗（含護眼提醒 #fmOv）時不飛來 */
async function fblCheck(){if(!FBL_ON||FBL_BUSY||Date.now()-FBL_T0<5000)return;if(!["","#","#/","#/home"].includes(location.hash))return;
  if(fblBusyUI())return;const me=document.querySelector(".shw-me");if(!me)return;
  FBL_BUSY=true;let L=[];try{L=await fblPending()}catch(e){}if(!L.length||!document.contains(me)||!["","#","#/","#/home"].includes(location.hash)){FBL_BUSY=false;return}
  fblCss();const K=typeof fbpBirdK==="function"?fbpBirdK():"pigeon",src=p=>"data/feedback/bird_"+K+"_"+p+".webp",b=document.createElement("img"),tag=document.createElement("span"),say=document.createElement("span");
  b.className="fbl-bird";b.alt="回信";tag.className="fbl-tag";tag.textContent="✉️";say.className="fbl-say";say.textContent=K==="goose"?"嘎！有你的專屬回信喔！":"咕咕！有你的專屬回信喔！";
  document.body.append(b);const W=innerWidth,H=innerHeight,SEQ=["up","up","dn","fold","fold","dn"],step=K==="goose"?80:55;let t0=0,ph="in",tOut=0,end=false,opened=false;
  const target=()=>{const r=me.getBoundingClientRect();return K==="goose"?[r.left+r.width*1.1,r.bottom-2]:[r.left+r.width*.62,r.top+r.height*.28]};
  const fin=()=>{if(end)return;end=true;b.remove();tag.remove();say.remove();FBL_BUSY=false};
  const leave=()=>{if(ph==="out")return;ph="out";tOut=0;tag.remove();say.remove()};
  const open=()=>{if(opened)return;opened=true;vibrate(10);leave();fblOpen(L,()=>{const S=new Set(store.get("fbLetterSeen",[])||[]);L.forEach(x=>S.add(x._re?fbrKey(x):fblKey(x)));store.set("fbLetterSeen",[...S].slice(-800))})};
  b.onclick=open;const meClick=e=>{if(ph==="perch"){e.stopPropagation();e.preventDefault();open()}};me.addEventListener("click",meClick,true);
  const off=()=>{removeEventListener("hashchange",off);me.removeEventListener("click",meClick,true);fin()};addEventListener("hashchange",off);
  const fw=K==="goose"?150:110,sw=K==="goose"?54:40;
  const tick=now=>{if(end)return;if(!t0)t0=now;const t=now-t0,[tx,ty]=target();let x,y,w,s,flip=true,ay=75;
    if(ph!=="out"&&fblBusyUI()&&!opened){leave()}
    if(ph==="in"){const u=Math.min(1,t/1600),e=1-Math.pow(1-u,2.2);x=W+80+(tx-W-80)*e;y=-60+(ty-(-60))*e-Math.sin(u*Math.PI)*60;w=fw*(1-.45*u);s=src(SEQ[Math.floor(t/step)%6]);if(u>=1){ph="perch";t0=now;document.body.append(tag,say)}}
    else if(ph==="perch"){x=tx;y=ty;w=sw;s=src("stand");ay=100;flip=K!=="goose";if(t>12000)leave()}
    else{tOut+=16;const u=Math.min(1,tOut/1300);x=tx+(W+100-tx)*u*u;y=ty-(ty+80)*u;w=fw*(.55+.3*u);s=src(SEQ[Math.floor(now/step)%6]);flip=false;if(u>=1){me.removeEventListener("click",meClick,true);removeEventListener("hashchange",off);fin();return}}
    if(b.dataset.s!==s){b.src=s;b.dataset.s=s}Object.assign(b.style,{width:w+"px",transform:"translate("+(x-w/2)+"px,"+(y)+"px) translate(0,-"+ay+"%)"+(flip?" scaleX(-1)":"")});
    if(ph==="perch"){tag.style.left=x+"px";tag.style.top=(y-w*1.05)+"px";say.style.left=Math.min(W-90,Math.max(90,x))+"px";say.style.top=(y-w*1.05-26)+"px"}
    requestAnimationFrame(tick)};requestAnimationFrame(tick)}
if(FBL_ON){addEventListener("hashchange",()=>setTimeout(fblCheck,2200));setTimeout(fblCheck,6000)}
