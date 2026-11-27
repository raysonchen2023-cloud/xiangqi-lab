// ================= 共用小工具 =================
/* 11/10 開發者「照建議做」：GitHub 只留程式、引擎和首批檔，其餘 data/ 只放 Cloudflare CDN（story/GitHub部署太大_研究_1110.md）。
   有 service worker 時 sw.js 本來就先走 CDN；沒有 service worker 的瀏覽器（例如 LINE 內建瀏覽器、無痕視窗）直接向 GitHub 要檔，拿不到就自動改向 CDN 要一次：
   ①圖片、聲音載入失敗（error 事件，捕獲階段）換成 CDN 網址；②fetch 到 404 再問 CDN。只處理同源的 data/、engine/ 路徑，網址後面的 ?v= 不帶 */
const XQ_CDN="https://xiangqi-cdn.pages.dev/";
/* 11/17 App Store 審查（測試員 E）：xqNat()＝原生 App（iOS 的 native-bridge.js 設 window.XQ_NATIVE，或 UA 帶 XQQianqiuApp/），各模組共用這一個判斷。
   2.5.2 原生版不從網路下載可執行的程式碼：原生版只替 data/（圖、聲音、資料）向 CDN 補抓，engine/（wasm、引擎 js）一律只用安裝包裡的；網頁版照舊 data/、engine/ 都補 */
/* 11/17 iMac 測試員 J P1-2（準則 2.1）：分享出去的連結（教練作業、分享局面、邀朋友…）的網址開頭。原生版的頁面在 http://127.0.0.1:47822（XQLoopback）或 capacitor://localhost，
   別人拿到打不開——只有網頁版本身是 https 公開網址時才用自己的網址，其他（原生、localhost、區網 http）一律用公開網址 APP_HOME。跟每日同題的 dqBase 同一套判斷 */
function xqShareBase(){let o="",p="/";try{o=location.origin||"";p=location.pathname||"/"}catch(e){}
  if(!xqNat()&&/^https:\/\//.test(o)&&!/^https:\/\/(localhost|127\.|\[::1\]|[^/]*\.localhost(:|$))/.test(o))return o+p;return"https://raysonchen2023-cloud.github.io/xiangqi-lab/"}
function xqNat(){try{return!!(typeof window!=="undefined"&&window.XQ_NATIVE)||(typeof navigator!=="undefined"&&/XQQianqiuApp\//.test(String(navigator.userAgent||"")))}catch(e){return false}}
/* W126（開發者 11/26「包交出後就修」）：iOS 版只做 iPhone（device family=1），裝在 iPad 上會跑在 iPadOS 26 的相容視窗裡，
   左上角紅黃綠視窗鈕疊在 App 畫面上，蓋住每一頁頂欄最左邊的返回鈕和首頁標題下的星晷。safe-area 在相容視窗不會算進那塊，只能自己判斷：
   原生 App＋iPad（iPadOS 會報 Macintosh＋多點觸控，兩種都認）＋視窗是手機寬（小於 500），就在 html 加 xq-ipcompat，m.css 讓頂欄左邊多留 76px。
   網頁版（Safari 有自己的網址列、沒有視窗鈕）、真 iPad 寬度、iPhone 都不加。轉向、改視窗大小時重算 */
function xqIpCompatOf(ua,tp,w,nat){ua=String(ua||"");return!!nat&&(/iPad/.test(ua)||(/Macintosh/.test(ua)&&tp>1))&&w>0&&w<500}
function xqIpCompat(){try{return xqIpCompatOf(navigator.userAgent,navigator.maxTouchPoints||0,innerWidth,xqNat())}catch(e){return false}}
if(typeof document!=="undefined"&&document.documentElement){const f=()=>{try{document.documentElement.classList.toggle("xq-ipcompat",xqIpCompat())}catch(e){}};f();addEventListener("resize",f)}
const xqCdnRel=u=>{try{const x=new URL(u,location.href);if(x.origin!==location.origin)return"";const b=location.pathname.replace(/[^/]*$/,""),p=x.pathname.startsWith(b)?decodeURI(x.pathname.slice(b.length)):"";return(xqNat()?/^data\//:/^(data|engine)\//).test(p)?p:""}catch(e){return""}};
/* 11/17 iMac 模擬器 P0：第一次造訪 service worker 還沒接管時，棋盤的棋子、底圖是 SVG <image>（tagName 小寫 image），以前不在名單裡，全部變成「?」；SVG 的換 href */
addEventListener("error",e=>{const t=e.target;if(!t||!t.tagName||(t.dataset&&t.dataset.cdnTry))return;const svg=String(t.tagName).toLowerCase()==="image";if(!svg&&!/^(IMG|AUDIO|SOURCE|VIDEO)$/.test(t.tagName))return;const r=xqCdnRel(svg?(t.getAttribute("href")||t.getAttribute("xlink:href")||""):(t.currentSrc||t.src||""));if(!r)return;t.dataset.cdnTry="1";if(svg)t.setAttribute("href",XQ_CDN+r);else t.src=XQ_CDN+r},true);
{const f0=window.fetch;if(f0)window.fetch=function(i,o){return f0.apply(this,arguments).then(res=>{if(res&&res.status===404){const r=xqCdnRel(typeof i==="string"?i:i&&i.url||"");if(r)return f0.call(window,XQ_CDN+r,{mode:"cors",credentials:"omit"}).then(x=>x.ok?x:res,()=>res)}return res})}}
/* 評比第 17、18 輪第 5 項（開發者 11/14 選）：App 切到背景（document.hidden、pagehide）時，App 自己能停的計時器、動畫、預載都停下來，回前景再接著。
   bgpHid()＝現在在背景；bgpOn(fn)＝切背景／回前景時叫 fn(在背景?)，回傳取消函式；bgpEvery(fn,ms)＝背景會自動停的 setInterval（回前景重新起算，不補背景期間的拍子），bgpStop(id) 停掉。
   線上對局心跳、棋鐘（net.js、local.js、各對局頁的鐘）不用這個，照舊跑 */
const BGP={hid:typeof document!=="undefined"&&!!document.hidden,ev:new Set(),iv:new Map(),n:0};
function bgpHid(){return BGP.hid||!!(typeof document!=="undefined"&&document.hidden)}
function bgpOn(fn){BGP.ev.add(fn);return()=>BGP.ev.delete(fn)}
function bgpEvery(fn,ms){const k=++BGP.n;BGP.iv.set(k,{fn,ms,t:bgpHid()?0:setInterval(fn,ms)});return k}
function bgpStop(k){const o=BGP.iv.get(k);if(o){clearInterval(o.t);BGP.iv.delete(k)}}
function bgpSet(h){h=!!h;if(h===BGP.hid)return;BGP.hid=h;for(const o of BGP.iv.values()){clearInterval(o.t);o.t=h?0:setInterval(o.fn,o.ms)}for(const f of[...BGP.ev])try{f(h)}catch(e){}}
if(typeof document!=="undefined"&&document.addEventListener){document.addEventListener("visibilitychange",()=>bgpSet(document.hidden));addEventListener("pagehide",()=>bgpSet(true));addEventListener("pageshow",()=>{if(!document.hidden)bgpSet(false)})}
const $=s=>document.querySelector(s);
const NAMES={r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"}};
const CN=["","一","二","三","四","五","六","七","八","九"],PLAYER={r:"紅方",b:"黑方"};
const QC={"妙著":"#C27C0E","正著":"#2F6B4F","穩著":"#3A7BD5","緩著":"#888","失著":"#D9822B","敗著":"#C0392B"};
const sideOf=p=>p?(p===p.toUpperCase()?"r":"b"):null,opp=s=>s==="r"?"b":"r";
const START="rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR";
function parseFen(f){const b=Array(90).fill(null);let r=0,c=0;for(const ch of f){if(ch==="/"){r++;c=0}else if(ch>="0"&&ch<="9")c+=+ch;else{b[r*9+c]=ch;c++}}return b}
const fenC=(b,s)=>{const rows=[];for(let r=0;r<10;r++){let row="",e=0;for(let c=0;c<9;c++){const p=b[r*9+c];if(!p)e++;else{if(e){row+=e;e=0}row+=p}}if(e)row+=e;rows.push(row)}return rows.join("/")+" "+(s==="r"?"w":"b")};
const iccsC=(f,t)=>String.fromCharCode(97+f%9)+(9-(f/9|0))+String.fromCharCode(97+t%9)+(9-(t/9|0));
const sqI=s=>(9-(+s[1]))*9+(s.charCodeAt(0)-97);
/* 11/11 v6 第 3 點（ChatGPT 十視角重評、AI 模擬玩家報告問題 5）：局勢評語一律白話，數字換成「約領先幾個兵」。原本寫「黑優 0.5」「紅優 2.1」，新手看不懂。
   v＝紅方視角的分數（100＝1 個兵）。分界：不到 0.3 兵＝均勢；不到 1.5 兵＝稍好（跟 10-db 和棋說明、賽後報告「翻盤」的 1.5 兵一致）；不到 3 兵＝明顯好；再多＝大占上風。
   s 有值＝只要「約領先幾個兵」那半句（前面已經寫了誰比較好的句子用，免得「紅方稍好（紅方稍好…）」重複） */
/* 11/13 開發者：黑洞陣地塔防局（07bht-td.js bhtdMuteEv）黑子還沒全上場，「紅方大占上風，約領先 N 個兵」會誤導，塔防局一律不講；其他對局照舊 */
const evt=(v,s)=>{if(v==null||(typeof bhtdMuteEv==="function"&&bhtdMuteEv()))return"";const a=Math.abs(v),sd=v>0?"紅方":"黑方";if(a>=20000)return sd+"有殺（能將死對方）";if(a<30)return"均勢，雙方差不多";
  const p=a/100,amt=p>=20?"領先非常多":"約領先"+(p<.75?"半個兵":" "+pawnN(a)+" 個兵");return s?sd+amt:sd+(a<150?"稍好":a<300?"明顯好":"大占上風")+"，"+amt};
/* 評比循環第 1 輪（Gemini、ChatGPT 都列第一；AI 模擬玩家第二輪問題 3）：評等字和局面句打架、兵數每處寫法不同。
   兵數一律用這兩個換算（同一個四捨五入：小數一位、去掉 .0；不到 0.75 兵寫「半個兵」），同一步在著法條泡泡、關鍵一步、賽後講解、錯棋重練看到的數字一樣。
   pawnN(分)＝"2.5"／"2"；pawnAbout(分)＝"約半個兵"／"約 2.5 個兵"（100 分＝1 個兵，正負都取絕對值） */
function pawnN(cp){return String(+(Math.abs(+cp||0)/100).toFixed(1))}
function pawnAbout(cp){return Math.abs(+cp||0)<75?"約半個兵":"約 "+pawnN(cp)+" 個兵"}
/* 評比循環第 2 輪（分析一致性案例庫 tools/test-analysis-cases.js）：「這步比最好的走法＿＿」的後半句。loss ≥ 2000 是殺棋分數夾到 ±2000 才相減的結果（core.js classifyRaw），
   換算成「約 21.4 個兵」沒有意義，跟著法條泡泡（4 個兵以上）、關鍵一步（差很多）也對不起來，一律說「差很多」；其他照 pawnAbout */
function lossAbout(cp){return Math.abs(+cp||0)>=2000?"差很多":"少了"+pawnAbout(cp)+"的價值"}
/* 評等（這一步跟最好的走法比，差多少）和局面句（走完以後整盤誰好）是兩件事，接在一起時用這半句講清楚：
   ev＝走完這步的分數（紅方視角）、by＝走這步的一方。走完走方還領先＝「不過走完整盤還是紅方稍好，…」；其他＝「走完整盤：黑方明顯好，…」；沒有分數回 "" */
function evLink(ev,by){if(ev==null||ev===""||!isFinite(+ev)||(typeof bhtdMuteEv==="function"&&bhtdMuteEv()))return"";const v=+ev,sg=by==="r"?1:by==="b"?-1:0;
  if(Math.abs(v)<30)return"走完整盤是"+evt(v);return(sg&&Math.sign(v)===sg?"不過走完整盤還是":"走完整盤：")+evt(v)}
/* 11/11 v6 第 3 點：段位簡稱「業2」新手看不懂，畫面上寫成「業餘2級」（資料裡的名字不變，只改顯示；08b 對局頁右上的難度鈕用） */
const rkTw=s=>String(s==null?"":s).replace(/^業(\d)$/,"業餘$1級");
/* 11/11 規格表 87：對局紀錄裡電腦那一方的名字是 local.js 寫進去的「Pikafish 積分挑戰（業2）」「Pikafish 第3級「業2」」（資料不動）；
   畫面上照規格表改叫對手「幻影棋客」、模式「晉級賽」、段位白話（04-stats 解析級數的正則兩種寫法都認） */
const oppTw=s=>String(s==null?"":s).replace(/^(石桌往事・)?Pikafish 積分挑戰（([^）]*)）/,(m,j,r)=>(j||"")+"幻影棋客・晉級賽（"+rkTw(r)+"）").replace(/^(石桌往事・)?Pikafish 第(\d+)級「([^」]*)」/,(m,j,n,r)=>(j||"")+"幻影棋客・第"+n+"級「"+rkTw(r)+"」").replace(/^笑面掌櫃・Pikafish 第(\d+)級「([^」]*)」/,(m,n,r)=>"笑面掌櫃・第"+n+"級「"+rkTw(r)+"」");   /* 11/11 笑面掌櫃：local.js 對局紀錄寫「笑面掌櫃・Pikafish 第N級「…」」 */
const evPct=v=>v==null?50:50+50*Math.tanh(v/600);
/* 開發者 11/11 選 ChatGPT UI 報告 UI-11：局勢條沒有評分時原本停在正中間，看起來像「雙方均勢」；改成淡色虛線＝還沒評分，說明寫清楚是誰的視角 */
function evMark(v,val){try{const e=v.querySelector(".evline");if(!e)return;const no=val==null;e.classList.toggle("noev",no);const t=no?"局勢條：電腦還沒評這一步":"局勢條：紅色越長＝紅方越占優（電腦評分）";e.title=t;e.setAttribute("aria-label",t);e.setAttribute("role","img");
  if(!document.getElementById("evMarkCss")){const s=document.createElement("style");s.id="evMarkCss";s.textContent=".evline.noev{background:repeating-linear-gradient(90deg,var(--line) 0 6px,transparent 6px 12px)}.evline.noev #evf{opacity:.18}";document.head.append(s)}}catch(x){}}
const fmt=ms=>{if(ms==null)return"";ms=Math.max(0,ms);const t=Math.ceil(ms/1000),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return(h?h+":"+String(m).padStart(2,"0"):String(m).padStart(2,"0"))+":"+String(s).padStart(2,"0")};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* 意見回饋 733：版權保護——在圖片、棋盤、3D 上長按或按右鍵，不跳「儲存圖片」選單，也不能拖出去 */
document.addEventListener("contextmenu",e=>{if(e.target&&e.target.closest&&e.target.closest("img,svg,canvas,picture,.shp-map,.shp-page"))e.preventDefault()});document.addEventListener("dragstart",e=>{if(e.target&&e.target.tagName==="IMG")e.preventDefault()});
const vibrate=n=>{try{const U=navigator.userActivation;if(U&&!U.hasBeenActive)return;if(typeof hapHush==="function"&&hapHush())return;navigator.vibrate&&navigator.vibrate(n||10)}catch(e){}};   /* 第 11 輪 X2：「震動回饋」關掉（store haptic）就全部不震；剛震過 07hp 的節奏 0.45 秒內不再蓋掉 */   /* 意見回饋 723：還沒點過畫面就不震動（瀏覽器會在主控台報錯，抓 bug 的虛擬玩家會誤報） */
const store={get(k,d){try{const v=localStorage.getItem("m_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("m_"+k,JSON.stringify(v))}catch(e){}}};
/* 回饋 842（兒童模式名字用稱號）：App 不知道誰是小朋友，所以「完全沒有任何存檔、也還沒取名字」的新玩家，線上大廳預設顯示系統稱號（xq_pubNm＝"t"）；
   舊玩家沒有這個鍵＝照舊顯示自己取的名字。要放在下面那行寫 m_era 之前判斷，m/07x4-lobbysafe.js 讀這個鍵 */
try{if(localStorage.getItem("xq_pubNm")==null){let n=0,nm="";for(let i=0;i<localStorage.length;i++)if(/^m_/.test(localStorage.key(i)))n++;try{nm=(JSON.parse(localStorage.getItem("xq_me")||"null")||{}).name||""}catch(e){}if(!n&&!nm)localStorage.setItem("xq_pubNm",JSON.stringify("t"))}}catch(e){}
/* 意見回饋 472（開發者）：第一次打開 App 的新玩家預設用元朝風格（畫面漂亮，也是石桌往事冒險的朝代）；
   只看「完全沒有任何存檔」的人，已經在玩的人（就算沒選過朝代）照舊 */
try{let n=0;for(let i=0;i<localStorage.length;i++)if(/^m_/.test(localStorage.key(i)))n++;if(!n&&localStorage.getItem("m_era")==null){const w=(k,v)=>window.XQSave&&XQSave.soft?XQSave.soft("m_"+k,JSON.stringify(v)):store.set(k,v);w("era","yuan");w("boardTheme","auto")}}catch(e){}
// 我的名字與裝置代號：存在手機裡，連電腦時每個請求都帶上，電腦才知道是誰連進來
function meInfo(){let m=null;try{m=JSON.parse(localStorage.getItem("xq_me")||"null")}catch(e){}
  if(!m||!m.id){m={id:(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9]/g,"").slice(0,20),name:(m&&m.name)||""};try{localStorage.setItem("xq_me",JSON.stringify(m))}catch(e){}}return m}
function myName(){return meInfo().name}
/* 意見回饋 604（開發者）：預設名字「棋友」＋4 位 16 進位（取自這支手機的代號）；跟線上看得到的名字撞到就換一組 */
function defaultName(){const used=new Set();try{if(window.XQNet&&XQNet.people)XQNet.people().forEach(p=>used.add(p.name))}catch(e){}
  let h=(meInfo().id.match(/[0-9a-f]/gi)||[]).join("").slice(0,4).toUpperCase();
  const pre=defaultNamePre();   /* 11/17 第 21 輪 79：英文介面新產生的預設名字寫 Player XXXX（已經存起來的名字不動） */
  for(let i=0;(!/^[0-9A-F]{4}$/.test(h)||used.has(pre+h))&&i<50;i++)h=Math.floor(Math.random()*65536).toString(16).toUpperCase().padStart(4,"0");
  return pre+h}
function defaultNamePre(){try{return typeof i18nLang==="function"&&i18nLang()==="en"?"Player ":"棋友"}catch(e){return"棋友"}}
function setMyName(n){const m=meInfo();m.name=String(n||"").replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,16);try{localStorage.setItem("xq_me",JSON.stringify(m))}catch(e){}}
// iPad 的瀏覽器自稱 Mac，用觸控點數分辨
const MY_KIND=/iPad/.test(navigator.userAgent)||/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1?"iPad":/iPhone/.test(navigator.userAgent)?"iPhone":/Android/.test(navigator.userAgent)?"Android":/Windows/.test(navigator.userAgent)?"Windows":/Mac/.test(navigator.userAgent)?"Mac":"";
// 線上大廳顯示的城市（意見回饋 159；11/9 改成玩家自己選，不再用 IP 查）
let MY_CITY="";
const CITY_ZH=[["New Taipei","新北"],["Taipei","臺北"],["Taoyuan","桃園"],["Hsinchu","新竹"],["Miaoli","苗栗"],["Taichung","台中"],["Changhua","彰化"],["Nantou","南投"],["Yunlin","雲林"],["Chiayi","嘉義"],["Tainan","台南"],["Kaohsiung","高雄"],["Pingtung","屏東"],["Yilan","宜蘭"],["Hualien","花蓮"],["Taitung","台東"],["Keelung","基隆"],["Penghu","澎湖"],["Kinmen","金門"],["Lienchiang","馬祖"],["Hong Kong","香港"],["Macau","澳門"]];
/* 開發者 11/9（Gemini 第 54 份 iOS 上架評估，選「拿掉，改成自己選」）：不再用 IP 定位服務（geojs.io）查城市；大廳要不要顯示城市由玩家在設定「隱私」自己選（store myCity，預設空白＝不顯示）。以前查到的 cityCache 清掉 */
function fetchCity(){MY_CITY=OFF?String(store.get("myCity","")||""):"";try{if(store.get("cityCache",null))store.set("cityCache",null)}catch(e){}}
setTimeout(()=>fetchCity(false),3000);
window.XQ_ME=()=>{const m=meInfo();return{"x-xq-dev":m.id+(MY_KIND?"-"+MY_KIND:""),"x-xq-name":encodeURIComponent(m.name||"")}};
async function api(u,b){if(window.XQ)return XQ.api(u,b);   // 離線版：由手機裡的 local.js 處理
  const sig=window.AbortSignal&&AbortSignal.timeout?AbortSignal.timeout(20000):undefined;
  let r;try{r=await fetch(u,b===undefined?{headers:XQ_ME(),signal:sig}:{method:"POST",headers:{"content-type":"application/json",...XQ_ME()},body:JSON.stringify(b),signal:sig})}
  catch(e){throw new Error(e&&e.name==="TimeoutError"?"電腦太久沒回應，再試一次":"連不到電腦，再試一次")}
  const d=await r.json().catch(()=>({error:"伺服器回應有問題"}));if(d&&d.error)throw new Error(d.error);return d}
let toastT=null;
function toast(msg){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.append(t)}t.textContent=msg;t.hidden=false;toastFit(t);clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2200)}
/* hspx 開發者 11/13「可以一行說完嗎，不要換行，換行機制你定個規矩吧」（截圖：「去搭星槎，找裂痕的另一」／「端。」）。全 App 短訊息的換行規矩：
   ① 放得下就一行；② 放不下先縮字（14px 起，每次 0.5px，最小 12px），盡量還是一行；③ 還是放不下才換行，而且只在標點、空白處斷（word-break:keep-all），
   兩行拉平均（text-wrap:balance），不會剩一兩個字掛在第二行。樣式在 m.css .toast */
function toastFit(t){try{t.style.whiteSpace="nowrap";t.style.fontSize="";let fs=parseFloat(getComputedStyle(t).fontSize)||14;
  while(t.scrollWidth>t.clientWidth+1&&fs>12){fs-=.5;t.style.fontSize=fs+"px"}
  if(t.scrollWidth>t.clientWidth+1)t.style.whiteSpace="normal"}catch(e){}}
// 底部彈出選單
// ================= 殺棋動畫（意見回饋 181）：先演完才跳結果視窗 =================
// 畫面四周壓暗＋棋盤一震 → 被將死的帥／將爆出紅金衝擊波、裂痕 → 金色大字「絕殺」重重蓋下（困斃時寫「困斃」）＋墨點飛濺 → 朱印「勝／敗」→ 淡出
let MODAL_HOLD=0,LAST_KFX=0;
// 殺棋動畫 v2（意見回饋 187）：字用使用者用 Gemini 做的書法「絕殺」「紅方／黑方」各 10 版（data/glyphs/kill.json，向量）
// 分鏡（約 3.2 秒）：①衝擊：白閃＋棋盤一震變灰暗＋上下電影黑邊 ②被將死的帥／將爆出金紅衝擊波和裂痕
// ③0.35s 一道大墨痕由左往右刷過棋盤（配刷聲）④0.55s 金色「絕殺」像寫字一樣由左往右現出、重重落定（鼓＋鑼），墨點和金星噴開，一道光掃過字
// ⑤1.2s 下面浮出勝方「紅方／黑方」⑥1.45s 朱印「勝／敗」蓋下 ⑦2.6s 全部淡出，才跳結果視窗
let KILL_GLY=null,KILL_P=null;
/* W192（11/27 開發者 iPhone 截圖「方 字體不完整」）：原本「絕殺」中心固定在容器高 44%、「紅方／黑方」固定在 69%，容器照棋盤比例（高約 1.107 寬），
   「絕殺」寬 86% 的高度又照字形長寬比，10 版字形任何組合「絕殺」下緣都蓋到「紅方」頂端 5～28px，「方」上面那一點最先被蓋掉。
   改成照實際尺寸算：W、H＝容器寬高，wh＝「絕殺」高，sh＝「紅方／黑方」高（沒有就 0），ch＝「你贏了！」那行的高。
   「絕殺」照舊從 44% 起；「紅方」至少在 69%，但頂端要在「絕殺」下緣再空 2% 寬；「你贏了！」至少在 80%，也要在上一塊底下再空一格；
   整組超出容器 97% 就一起往上移（「絕殺」頂端不高過 3%）。回傳 wy、sy＝中心，cy＝「你贏了！」的上緣，單位 px */
function kxLayout(W,H,wh,sh,ch){const g=W*.02;let wy=H*.44;const wb=wy+wh/2;let sy=sh?Math.max(H*.69,wb+g+sh/2):wb,cy=Math.max(H*.8,(sh?sy+sh/2:wb)+g);
  const over=cy+ch-H*.97;if(over>0){const up=Math.min(over,Math.max(0,wy-wh/2-H*.03));wy-=up;sy-=up;cy-=up}return{wy,sy,cy}}
const loadKillGly=()=>KILL_P||(KILL_P=fetch("data/glyphs/kill.json").then(r=>r.json()).then(j=>KILL_GLY=j).catch(()=>{KILL_P=null}));
setTimeout(loadKillGly,2500);
// 公園 3D 棋盤時棋盤模式是藏起來的：特效改蓋在 3D 畫面上（意見回饋 234）
const fxHost=svg=>{if(svg&&!svg.getBoundingClientRect().width&&svg.parentElement){const p=svg.parentElement.querySelector(".park3d");if(p)return p}return svg};
/* 11/13 開發者 P1（iPhone 3D 絕殺後頁面被重新載入，量測見 xiangqi-lab/tools/test-reload-guard.js 開頭）：蓋在 3D 園子上時（P3），
   不對整個 WebGL 畫面套灰階濾鏡（只留震一下 kx-board3d）、金光不用混色模式、墨點金星彩紙少一點——同時存在的合成圖層從約 85 層降下來，動畫順序和字都一樣 */
function killFx(svg,win,why,kIdx,flip,o){svg=fxHost(svg);const r=svg.getBoundingClientRect();if(!r.width)return;o=o||{};LAST_KFX=Date.now();loadKillGly();const P3=!!(svg.classList&&svg.classList.contains("park3d"));
  if(!document.getElementById("kfx3css")){document.querySelectorAll("#kfx2css").forEach(x=>x.remove());const st=document.createElement("style");st.id="kfx3css";st.textContent=`
.kx-flash{position:fixed;inset:0;z-index:67;pointer-events:none;background:#fff;animation:kxflash .35s ease-out forwards}
@keyframes kxflash{0%{opacity:.85}100%{opacity:0}}
.kx-bar{position:fixed;left:0;right:0;height:9vh;background:#050302;z-index:67;pointer-events:none;animation:kxbar 3.2s cubic-bezier(.3,.8,.3,1) forwards}
.kx-bar.t{top:0;transform-origin:top}.kx-bar.b{bottom:0;transform-origin:bottom}
@keyframes kxbar{0%{transform:scaleY(0)}9%,84%{transform:scaleY(1)}100%{transform:scaleY(0)}}
.kx-dim{position:fixed;inset:0;z-index:63;pointer-events:none;background:radial-gradient(ellipse at center,rgba(30,6,2,.15) 25%,rgba(10,2,0,.78) 100%);animation:kxdim 3.2s ease forwards}
@keyframes kxdim{0%{opacity:0}8%,84%{opacity:1}100%{opacity:0}}
.kx-board{animation:kxboard 3.2s ease forwards}
@keyframes kxboard{0%{filter:none;transform:none}3%{transform:scale(1.035) translate(-5px,3px)}6%{transform:translate(5px,-3px)}9%{transform:translate(-3px,2px)}12%{transform:none;filter:grayscale(.65) brightness(.62) contrast(1.1)}84%{filter:grayscale(.65) brightness(.62) contrast(1.1)}100%{filter:none}}
.kx{position:fixed;z-index:66;pointer-events:none;animation:kxout 3.2s ease forwards}
@keyframes kxout{0%,82%{opacity:1}100%{opacity:0}}
.kx>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.kx .ring{fill:none;transform-box:fill-box;transform-origin:center;animation:kxring .8s cubic-bezier(.15,.8,.3,1) forwards}
@keyframes kxring{0%{transform:scale(.05);opacity:1}100%{transform:scale(1);opacity:0}}
.kx .crack{fill:none;stroke:#1a0804;stroke-linecap:round;stroke-dasharray:420;stroke-dashoffset:420;animation:kxcrack .3s ease-out .08s forwards}
@keyframes kxcrack{to{stroke-dashoffset:0}}
.kx .swipe{animation:kxswipe .38s cubic-bezier(.6,0,.2,1) .35s both}
@keyframes kxswipe{0%{clip-path:inset(0 100% 0 0)}100%{clip-path:inset(0 0 0 0)}}
.kx .word{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);filter:drop-shadow(0 .05em .08em rgba(0,0,0,.75)) drop-shadow(0 0 .25em rgba(255,170,60,.35))}
.kx .word svg{display:block;width:100%;height:100%;overflow:visible}
.kx .ww{animation:kxwrite .42s cubic-bezier(.5,0,.2,1) .55s both,kxland .5s cubic-bezier(.2,1.6,.4,1) .55s both}
@keyframes kxwrite{0%{clip-path:inset(-20% 100% -20% -10%)}100%{clip-path:inset(-20% -10% -20% -10%)}}
@keyframes kxland{0%{transform:scale(1.35);filter:blur(5px)}60%{transform:scale(.96);filter:blur(0)}100%{transform:scale(1)}}
.kx .gleam{position:absolute;inset:-10% -5%;background:linear-gradient(105deg,transparent 35%,rgba(255,250,220,.85) 50%,transparent 65%);mix-blend-mode:overlay;transform:translateX(-120%);animation:kxgleam .7s ease-in-out 1.15s forwards}
@keyframes kxgleam{to{transform:translateX(120%)}}
.kx .kxs{position:absolute;left:50%;top:69%;transform:translate(-50%,-50%);opacity:0;animation:kxside .45s cubic-bezier(.2,1.3,.4,1) 1.2s forwards}
@keyframes kxside{0%{opacity:0;transform:translate(-50%,-30%) scale(.8)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.kx .dot{position:absolute;left:50%;top:44%;border-radius:50%;background:#0d0604;opacity:0;animation:kxdot .55s cubic-bezier(.1,.7,.3,1) .62s forwards}
.kx .spark{position:absolute;left:50%;top:44%;border-radius:50%;background:radial-gradient(circle,#fff6c8,#f3b43a 60%,transparent 70%);opacity:0;animation:kxdot .7s cubic-bezier(.1,.7,.3,1) .6s forwards}
@keyframes kxdot{0%{opacity:0;transform:translate(0,0) scale(.3)}20%{opacity:1}100%{opacity:var(--o,.9);transform:translate(var(--dx),var(--dy)) scale(1)}}
.kx .seal{position:absolute;left:50%;top:44%;width:1.3em;height:1.3em;margin:-.65em 0 0 -.65em;line-height:1.3em;text-align:center;font-family:var(--serif);font-weight:900;font-size:1em;color:#fff4ea;
  background:#b3141b;border-radius:.1em;box-shadow:0 0 0 .05em #b3141b,inset 0 0 0 .07em #fff4ea,0 .06em .2em rgba(0,0,0,.5);opacity:0;transform:translate(var(--sx),var(--sy)) rotate(-14deg) scale(2.4);animation:kxseal .28s cubic-bezier(.3,0,.5,1) 1.45s forwards}
.kx .seal span{font-size:.42em;vertical-align:top}
@keyframes kxseal{to{opacity:.95;transform:translate(var(--sx),var(--sy)) rotate(-14deg) scale(1)}}
.kx .rays{position:absolute;left:50%;top:44%;width:1.6em;height:1.6em;margin:-.8em 0 0 -.8em;border-radius:50%;opacity:0;
  background:repeating-conic-gradient(from 0deg,rgba(255,220,120,.55) 0 6deg,transparent 6deg 18deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 68%);mask:radial-gradient(circle,#000 18%,transparent 68%);
  animation:kxrays 2.4s linear .6s forwards}
@keyframes kxrays{0%{opacity:0;transform:rotate(0) scale(.6)}15%{opacity:1}80%{opacity:.8}100%{opacity:0;transform:rotate(70deg) scale(1.1)}}
.kx .conf{position:absolute;top:-4%;width:.018em;height:.03em;opacity:0;animation:kxconf 1.8s cubic-bezier(.3,.4,.6,1) forwards}
@keyframes kxconf{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx),1.1em) rotate(var(--r))}}
.kx.lose .spark,.kx.lose .rays,.kx.lose .conf{display:none}
.kx.lose .word{filter:drop-shadow(0 .05em .08em rgba(0,0,0,.85)) drop-shadow(0 0 .2em rgba(90,140,200,.25))}
.kx.lose .ww{animation:kxwrite .5s cubic-bezier(.5,0,.2,1) .55s both,kxland .5s cubic-bezier(.2,1.6,.4,1) .55s both,kxsink 1.4s ease-in 1.3s forwards}
@keyframes kxsink{to{transform:translateY(.05em) scale(.98);filter:saturate(.3) brightness(.85)}}
.kx .drip{position:absolute;top:50%;width:.012em;height:0;border-radius:0 0 .01em .01em;background:linear-gradient(#1a1d22,#0b0c0e);animation:kxdrip 1.3s ease-in forwards}
@keyframes kxdrip{to{height:var(--h)}}
.kx-dim.lose{background:radial-gradient(ellipse at center,rgba(10,18,32,.25) 25%,rgba(4,8,16,.86) 100%)}
.kx-board.lose{animation-name:kxboardL}
.kx-board3d{animation:kxshake .45s ease}
@keyframes kxshake{0%,100%{transform:none}25%{transform:scale(1.035) translate(-5px,3px)}50%{transform:translate(5px,-3px)}75%{transform:translate(-3px,2px)}}
.kx.p3 .gleam{mix-blend-mode:normal;opacity:.45}
@keyframes kxboardL{0%{filter:none;transform:none}3%{transform:scale(1.035) translate(-5px,3px)}6%{transform:translate(5px,-3px)}9%{transform:translate(-3px,2px)}12%{transform:none;filter:grayscale(1) brightness(.5) contrast(1.15)}84%{filter:grayscale(1) brightness(.5) contrast(1.15)}100%{filter:none}}
.kx .cap{position:absolute;left:0;right:0;top:80%;text-align:center;font-size:.075em;font-weight:900;color:#fff;letter-spacing:.1em;text-shadow:0 1px 4px #000;opacity:0;animation:kxcap .4s ease 1.6s forwards}
@keyframes kxcap{to{opacity:1}}`;document.head.append(st)}
  document.querySelectorAll(".kx,.kx-dim,.kx-bar,.kx-flash,.kfx,.kfx-dim,.ckfx,.cpfx").forEach(x=>x.remove());const lose=!win;
  const els=[];const mk=(cls,html)=>{const e=document.createElement("div");e.className=cls;if(html)e.innerHTML=html;document.body.append(e);els.push(e);return e};
  mk("kx-dim"+(lose?" lose":""));mk("kx-bar t");mk("kx-bar b");{const fl=mk("kx-flash");fl.addEventListener("animationend",()=>fl.remove(),{once:true})}
  /* 意見回饋 607：殺棋動畫可以點一下跳過（透明的一層蓋在動畫上），等著的結果視窗馬上出來。只在有結果視窗在等（MODAL_HOLD）時才加，棋譜裡看到將死的動畫不擋按鈕 */
  if(MODAL_HOLD>Date.now()){const sk=mk("kx-skip");sk.title="點一下跳過";sk.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();els.forEach(x=>x.remove());svg.classList.remove("kx-board","kx-board3d","lose");modalSkip()},{once:true})}
  svg.classList.remove("kx-board","kx-board3d","lose");void svg.getBoundingClientRect();svg.classList.add(P3?"kx-board3d":"kx-board");if(lose&&!P3)svg.classList.add("lose");
  const W=r.width,H=r.height,d=mk("kx "+(lose?"lose":"win")+(P3?" p3":""));d.style.cssText=`left:${r.left}px;top:${r.top}px;width:${W}px;height:${H}px;font-size:${W}px`;
  let col=kIdx%9,row=kIdx/9|0;if(flip){col=8-col;row=9-row}const kx=40+col*60,ky=40+row*60;
  let cr="";for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.random()*.4,L=80+Math.random()*100;let p=`M${kx} ${ky}`;for(let k=1;k<=3;k++){const x=kx+Math.cos(a+(Math.random()-.5)*.6)*L*k/3,y=ky+Math.sin(a+(Math.random()-.5)*.6)*L*k/3;p+=`L${x.toFixed(1)} ${y.toFixed(1)}`}
    cr+=`<path class="crack" d="${p}" stroke-width="${(4-i%3).toFixed(1)}"/>`}
  // 大墨痕：用毛筆筆刷函式畫一道粗細有變化的橫向墨帶，再加幾條飛白細絲
  const cy=620*.44,band=brushD([[-30,cy+18,70],[90,cy-6,128],[280,cy+4,150],[470,cy-8,132],[600,cy+12,60]],.18).d;
  let fb="";for(let i=0;i<7;i++){const yy=cy-58+i*19+Math.random()*6;fb+=`<path d="${brushD([[-20,yy,3+Math.random()*4],[200,yy+(Math.random()-.5)*8,6],[420,yy+(Math.random()-.5)*8,4],[590,yy,1]],.4).d}" fill="#0d0604" opacity="${(.25+Math.random()*.35).toFixed(2)}"/>`}
  d.innerHTML=`<svg viewBox="0 0 560 620" preserveAspectRatio="none">${cr}
      <circle class="ring" cx="${kx}" cy="${ky}" r="260" stroke="#ffd36b" stroke-width="9"/><circle class="ring" cx="${kx}" cy="${ky}" r="180" stroke="#e0303a" stroke-width="15" style="animation-delay:.06s"/><circle class="ring" cx="${kx}" cy="${ky}" r="100" stroke="#fff3c4" stroke-width="5" style="animation-delay:.12s"/>
      <g class="swipe"><path d="${band}" fill="#0d0604" opacity=".93"/>${fb}</g></svg>`;
  const pick=a=>a&&a.length?a[Math.random()*a.length|0]:null,G=KILL_GLY,word=/困斃/.test(why||"")?"困斃":"絕殺";
  const kg=word==="絕殺"&&G?pick(G.kill):null,winSide=o.side||(o.seal==="紅"?"r":o.seal==="黑"?"b":null),sg=G&&winSide?pick(winSide==="r"?G.hong:G.hei):null;
  const gid="kxg"+Math.random().toString(36).slice(2,7);
  const defs=`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">${lose?'<stop offset="0" stop-color="#f2f5f8"/><stop offset=".45" stop-color="#aab3bd"/><stop offset=".8" stop-color="#5e6670"/><stop offset="1" stop-color="#2c3238"/>':'<stop offset="0" stop-color="#fff7d6"/><stop offset=".45" stop-color="#f4cf6e"/><stop offset=".8" stop-color="#c88a26"/><stop offset="1" stop-color="#8a5414"/>'}</linearGradient></defs>`;
  // 主字：金色填色＋深色外框（Gemini 書法向量），沒下載到字形時退回系統字
  const wW=.86,wd=d.appendChild(document.createElement("div"));wd.className="word";let kxWh=W*.3,kxSh=0,kxSd=null;   /* W192：三塊的高，給 kxLayout 排位置 */
  if(kg){const [p,w,h]=kg,ww=W*wW,wh=ww*h/w;kxWh=wh;wd.style.cssText=`width:${ww}px;height:${wh}px`;
    wd.innerHTML=`<div class="ww" style="width:100%;height:100%;position:relative"><svg viewBox="-3 -3 ${w+6} ${h+6}">${defs}<path d="${p}" fill="url(#${gid})" stroke="${lose?"#07090c":"#2a1206"}" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/></svg><div class="gleam"></div></div>`}
  else{wd.innerHTML=`<div class="ww" style="font-family:var(--serif);font-weight:900;font-size:${W*.3}px;line-height:1;white-space:nowrap;background:linear-gradient(180deg,#fff6d8,#f3cf73 45%,#b77a1f);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #3a1606">${word}</div>`}
  // 勝方：紅方用朱紅、黑方用墨黑，都描金邊
  if(sg){const [p,w,h]=sg,sw=W*.4,sh=sw*h/w,sd=d.appendChild(document.createElement("div"));sd.className="kxs";sd.style.cssText=`width:${sw}px;height:${sh}px`;kxSh=sh;kxSd=sd;
    sd.innerHTML=`<svg viewBox="-4 -4 ${w+8} ${h+8}" style="display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 2px 4px rgba(0,0,0,.7))"><path d="${p}" fill="${winSide==="r"?"#d0201a":"#120a06"}" stroke="#f3d27a" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/></svg>`}
  // 墨點、金星
  let sp="";for(let i=0;i<(P3?8:18);i++){const a=Math.random()*Math.PI*2,R=.25+Math.random()*.3,z=(.008+Math.random()*.022).toFixed(3);sp+=`<i class="dot" style="width:${z}em;height:${z}em;--dx:${(Math.cos(a)*R).toFixed(3)}em;--dy:${(Math.sin(a)*R*.55).toFixed(3)}em"></i>`}
  for(let i=0;i<(P3?6:14);i++){const a=Math.random()*Math.PI*2,R=.2+Math.random()*.32,z=(.012+Math.random()*.02).toFixed(3);sp+=`<i class="spark" style="width:${z}em;height:${z}em;--o:0;--dx:${(Math.cos(a)*R).toFixed(3)}em;--dy:${(Math.sin(a)*R*.6).toFixed(3)}em"></i>`}
  if(!lose){sp='<i class="rays"></i>'+sp;for(let i=0;i<(P3?10:26);i++){const x=(Math.random()*100).toFixed(1),c=["#f3c64a","#d0201a","#fff2b0","#e8932a"][i%4];
      sp+=`<i class="conf" style="left:${x}%;background:${c};--dx:${((Math.random()-.5)*.3).toFixed(3)}em;--r:${(Math.random()*720-360)|0}deg;animation-delay:${(.75+Math.random()*.6).toFixed(2)}s"></i>`}}
  else{for(let i=0;i<7;i++){const x=(28+Math.random()*44).toFixed(1);sp+=`<i class="drip" style="left:${x}%;--h:${(.06+Math.random()*.14).toFixed(3)}em;animation-delay:${(1.05+Math.random()*.5).toFixed(2)}s"></i>`}}
  const KL=kxLayout(W,H,kxWh,kxSh,W*.075*1.3);wd.style.top=KL.wy+"px";if(kxSd)kxSd.style.top=KL.sy+"px";   /* W192：三塊不重疊；朱印跟著「絕殺」 */
  d.insertAdjacentHTML("beforeend",sp+`<i class="seal" style="top:${KL.wy.toFixed(1)}px;--sx:${(W*.36).toFixed(0)}px;--sy:${(W*.13).toFixed(0)}px;font-size:${W*.1}px">${win?"勝":"敗"}</i><div class="cap" style="top:${KL.cy.toFixed(1)}px">${o.cap||(win?"你贏了！":word==="困斃"?"無路可走…":"這盤輸了…再接再厲")}</div>`);
  vibrate([70,50,140]);setTimeout(()=>{els.forEach(e=>e.remove());svg.classList.remove("kx-board","kx-board3d")},3250);
  if(store.get("capSound",true)||store.get("mvSound",false))withAudio(()=>{const t=AC.currentTime+.02,out=AC.destination;
    const noise=(dur,pw)=>{const len=AC.sampleRate*dur|0,b=AC.createBuffer(1,len,AC.sampleRate),c=b.getChannelData(0);for(let i=0;i<len;i++)c[i]=(Math.random()*2-1)*Math.pow(1-i/len,pw);const s=AC.createBufferSource();s.buffer=b;return s};
    // 衝擊：低頻下滑＋雜音
    {const o1=AC.createOscillator(),g=AC.createGain();o1.frequency.setValueAtTime(110,t);o1.frequency.exponentialRampToValueAtTime(36,t+.6);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.8,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.7);o1.connect(g).connect(out);o1.start(t);o1.stop(t+.75)}
    // 刷墨聲（帶通雜音由低往高掃）
    {const s=noise(.4,1.2),bp=AC.createBiquadFilter(),g=AC.createGain();bp.type="bandpass";bp.Q.value=1.2;bp.frequency.setValueAtTime(400,t+.35);bp.frequency.exponentialRampToValueAtTime(3200,t+.72);g.gain.value=.5;s.connect(bp).connect(g).connect(out);s.start(t+.35)}
    // 字落下：大鼓＋銅鑼
    {const t2=t+.55,o1=AC.createOscillator(),g=AC.createGain();o1.frequency.setValueAtTime(85,t2);o1.frequency.exponentialRampToValueAtTime(40,t2+.5);g.gain.setValueAtTime(.0001,t2);g.gain.linearRampToValueAtTime(1,t2+.008);g.gain.exponentialRampToValueAtTime(.001,t2+.9);o1.connect(g).connect(out);o1.start(t2);o1.stop(t2+1)
      if(lose){for(const[f,dt]of[[220,0],[196,.45],[165,.9],[131,1.35]]){const oo=AC.createOscillator(),gg=AC.createGain(),t4=t2+dt;oo.type="triangle";oo.frequency.value=f;gg.gain.setValueAtTime(.0001,t4);gg.gain.linearRampToValueAtTime(.18,t4+.03);gg.gain.exponentialRampToValueAtTime(.001,t4+.9);oo.connect(gg).connect(out);oo.start(t4);oo.stop(t4+1)}}
      else for(const[f,dt]of[[523,.9],[659,1.02],[784,1.14],[1047,1.26]]){const oo=AC.createOscillator(),gg=AC.createGain(),t4=t2+dt;oo.type="sine";oo.frequency.value=f;gg.gain.setValueAtTime(.0001,t4);gg.gain.linearRampToValueAtTime(.1,t4+.01);gg.gain.exponentialRampToValueAtTime(.001,t4+.8);oo.connect(gg).connect(out);oo.start(t4);oo.stop(t4+.9)}
      if(!lose)for(const[f,a]of[[147,.3],[220,.22],[331,.14],[495,.07],[740,.04]]){const oo=AC.createOscillator(),gg=AC.createGain();oo.frequency.value=f*(1+(Math.random()-.5)*.01);gg.gain.setValueAtTime(.0001,t2);gg.gain.linearRampToValueAtTime(a,t2+.012);gg.gain.exponentialRampToValueAtTime(.001,t2+2.4);oo.connect(gg).connect(out);oo.start(t2);oo.stop(t2+2.5)}}
    // 蓋印：短促的悶響
    {const t3=t+1.45,s=noise(.12,3),lp=AC.createBiquadFilter(),g=AC.createGain();lp.type="lowpass";lp.frequency.value=500;g.gain.value=.9;s.connect(lp).connect(g).connect(out);s.start(t3)}})}
/* 意見回饋 317：卡片打開時先記一筆「同一頁」的上一頁紀錄，iPhone 往右滑（上一頁）只會關掉卡片、留在原本的畫面。
   意見回饋 405：每一筆 App 內的歷史紀錄都蓋上深度 d（第一筆 0，往前一頁 +1，replace 不變）；左上「返回」跟往右滑走同一條路：
   後面還有 App 自己的上一頁就 history.back()，沒有（剛打開 App）才 replace 到預設的上一層，不再往前推一筆 */
let NAV_D=0,NAV_REPL=false,NAV_HOME=false,NAV_OLD=false;
try{const s0=history.state;if(s0&&typeof s0.d==="number"){NAV_D=s0.d;NAV_OLD=true}else history.replaceState(Object.assign({},s0,{d:0}),"")}catch(e){}
/* 意見回饋 607（開發者：下完一盤要有離開的按鈕回首頁，不要一直點返回；RPG 專家建議）：
   NAV_H[d]＝第 d 層歷史紀錄的網址（卡片那一層前面加 "~"，不算頁面），存在 sessionStorage（重新整理還在）。
   goUp(網址) 用它找「同一個網址的那一層」直接退回去，不再往前推一頁（以前「回到關卡」「回到錯棋列表」都推新頁，按返回會繞回已經下完的棋）。
   NAV_POP：這一頁是用上一頁／往右滑（或 goUp、goHome）退回來的，不是新開的（02-shell.js 的 hashchange 設定） */
let NAV_H=[],NAV_POP=false;try{NAV_H=JSON.parse(sessionStorage.getItem("xqNavH")||"[]");if(!Array.isArray(NAV_H))NAV_H=[]}catch(e){NAV_H=[]}
function navMark(d,sh,cut){try{if(cut)NAV_H.length=Math.min(NAV_H.length,d+1);while(NAV_H.length<d)NAV_H.push(null);NAV_H[d]=(sh?"~":"")+(location.hash||"#/");sessionStorage.setItem("xqNavH",JSON.stringify(NAV_H))}catch(e){}}
try{navMark(NAV_D,!!(history.state&&history.state.xqSheet),!NAV_OLD)}catch(e){}
/* 意見回饋 607：每次換頁 ROUTE_N 加一（02-shell.js 的 route()）；延後顯示的視窗用它判斷畫面換了沒。REVIEW_BACK：從結果視窗按「📊 檢討」去看報告，回來時那盤不要自動開新局 */
let ROUTE_N=0,REVIEW_BACK=null;const MODAL_Q=[];
/* 11/25 W120（延遲執行稽核中、低）：排好晚一點才做的事，到時先確認「還在原來那一頁」（ROUTE_N、網址都沒變），ok() 再加自己的條件（同一盤、還沒走子、還沒結束…）；不成立就不做。
   用法：stillHere(毫秒, 要做的事, 額外條件)；回傳計時器編號，可以 clearTimeout */
function stillHere(ms,fn,ok){const rn=ROUTE_N,h=location.hash;return setTimeout(()=>{try{if(ROUTE_N!==rn||location.hash!==h)return;if(typeof ok==="function"&&!ok())return;fn()}catch(e){try{console.warn("stillHere",e)}catch(_){}}},ms)}
/* 意見回饋 371：清單分頁，每頁 10 個（上一頁／下一頁），換頁捲回最上面 */
function pageList(b,list,render,bind,per){per=per||10;let p=0;const N=Math.ceil(list.length/per);
  const go=()=>{b.innerHTML=render(list.slice(p*per,p*per+per))+(N>1?`<div class="row" style="justify-content:space-between;align-items:center;margin-top:12px"><button class="pill" data-pg="-1"${p?"":" disabled"}>‹ 上一頁</button><span class="muted">第 ${p+1}／${N} 頁</span><button class="pill" data-pg="1"${p<N-1?"":" disabled"}>下一頁 ›</button></div>`:"");
    b.querySelectorAll("[data-pg]").forEach(x=>x.onclick=()=>{p=Math.min(N-1,Math.max(0,p+ +x.dataset.pg));vibrate(5);go();b.scrollTop=0});if(bind)bind(b)};go()}
/* 開發者 11/5：下載時不讓手機自動鎖定（螢幕喚醒鎖 Wake Lock，iOS 16.4 起支援；不支援就什麼都不做）。
   keepAwake(名稱, 條件)：條件成立的期間螢幕保持亮著；離開 App 再回來會重新要求；條件不成立就自動放掉。iPhone 離開 App 本來就會暫停下載，這個只防「放著不動自動鎖定」 */
const WAKE={};let wakeLk=null,wakeBusy=false;
async function wakeSync(){if(wakeBusy)return;wakeBusy=true;try{let need=false;
  for(const k of Object.keys(WAKE)){const w=WAKE[k];let on=false;try{on=!!w.f()}catch(e){}if(on){w.seen=true;need=true}else if(w.seen||Date.now()-w.at>60000)delete WAKE[k]}   /* 條件成立過、後來不成立才刪（剛登記時畫面可能還沒放上去） */
  if(need&&!wakeLk&&document.visibilityState==="visible"&&navigator.wakeLock){try{const r=await Promise.race([navigator.wakeLock.request("screen"),new Promise(ok=>setTimeout(()=>ok(null),3000))]);if(r){wakeLk=r;r.addEventListener("release",()=>{if(wakeLk===r)wakeLk=null})}}catch(e){}}
  else if(!need&&wakeLk){const r=wakeLk;wakeLk=null;try{await r.release()}catch(e){}}}finally{wakeBusy=false}}
function keepAwake(key,pred){if(pred)WAKE[key]={f:pred,seen:false,at:Date.now()};else delete WAKE[key];setTimeout(wakeSync,50)}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")wakeSync()});
bgpEvery(()=>{if(wakeLk||Object.keys(WAKE).length)wakeSync()},3000);   /* 評比第 17、18 輪第 5 項：在背景不用每 3 秒檢查（回前景時上面 visibilitychange 會重新要求） */
function sheet(title,build){
  try{if(!(history.state&&history.state.xqSheet)){const d=NAV_D+1;history.pushState({xqSheet:1,d},"",location.href);NAV_D=d;navMark(d,true,true)}}catch(e){}   /* 意見回饋 607：卡片那一層也登記（goUp 會跳過它） */
  document.querySelectorAll("#scrim,#sheet").forEach(e=>e.remove());const sc=document.createElement("div");sc.className="scrim";sc.id="scrim";
  const sh=document.createElement("div");sh.className="sheet";sh.id="sheet";
  sh.innerHTML=`<div class="grab"></div><div class="sh-t">${icoTitle(title)}</div><div class="sh-b"></div>`;
  document.body.append(sc,sh);build(sh.querySelector(".sh-b"));
  /* 11/11 模擬玩家問題 8：介紹卡（園子裡點人、點物件）沒有關閉鈕、Esc 也沒用。卡片右上角一律補一顆 ✕（卡片裡已經有 ✕ 按鈕的就不重複）；Esc 見下方 shEsc */
  try{if(![...sh.querySelectorAll("button")].some(x=>/^\s*✕/.test(x.textContent||""))){const x=document.createElement("button");x.type="button";x.className="sh-x";x.textContent="✕";x.title="關閉";x.setAttribute("aria-label","關閉");x.onclick=e=>{e.stopPropagation();closeSheet()};sh.append(x)}}catch(e){}
  sh.getBoundingClientRect();setTimeout(()=>{sc.classList.add("show");sh.classList.add("show")},16);
  {const t0=Date.now();sc.onclick=()=>{if(Date.now()-t0<350)return;closeSheet()}}   /* 11/17 第 23 輪（測試員 B 備註）：「⋯」選單連點兩下時，第二下落在剛開的卡片暗幕上，卡片馬上又關掉 → 暗幕剛出現 0.35 秒內點到不關 */
  // 往下拉關閉
  let y0=null;sh.querySelector(".grab").parentElement.addEventListener("touchstart",e=>{if(e.target.closest(".sh-b"))return;y0=e.touches[0].clientY},{passive:true});
  sh.addEventListener("touchend",e=>{if(y0!=null&&e.changedTouches[0].clientY-y0>60)closeSheet();y0=null});
  return sh}
/* 11/11 模擬玩家問題 8：按 Esc 關掉最上面的卡片（上面還蓋著確認框時先不動，免得一次關兩層） */
function shEsc(e){if(e.key!=="Escape"||e.defaultPrevented)return;const b=document.getElementById("sheet");if(!b||!b.classList.contains("show")||b.dataset.closing||document.querySelector(".modal"))return;e.preventDefault();closeSheet()}
addEventListener("keydown",shEsc);
function closeSheet(fromPop){const a=$("#scrim"),b=$("#sheet");if(!b||b.dataset.closing)return;b.dataset.closing=1;b.classList.remove("show");a&&a.classList.remove("show");setTimeout(()=>{a&&a.remove();b.remove()},220);
  if(fromPop===true)return;const href=location.href;
  /* 用按鈕、點背景、往下拉關掉：把開卡片時推進去的那筆退掉；緊接著換頁或又開了一張卡片就不退 */
  setTimeout(()=>{const s1=history.state,cur=$("#sheet");if(s1&&s1.xqSheet&&location.href===href&&(!cur||cur===b))history.back()},0)}
addEventListener("popstate",()=>{const s1=history.state||{},d0=NAV_D;if(typeof s1.d==="number")NAV_D=s1.d;
  if(NAV_HOME){NAV_HOME=false;if(navKey(location.hash)!=="/")setTimeout(()=>navReplace("#/"),0);return}
  const b=$("#sheet");if(b&&b.classList.contains("show")&&!b.dataset.closing){closeSheet(true);return}
  /* 落在一筆卡片已經不在的卡片紀錄上（開著卡片直接換頁留下的）：順著方向再走一格，這一滑才不會白滑 */
  if(s1.xqSheet){if(typeof s1.d==="number"&&s1.d>d0)history.forward();else history.back()}});
/* 意見回饋 607：結果視窗跟著頁面走——
   ①殺棋動畫期間延後的視窗，排進 MODAL_Q；到時候畫面已經換了（ROUTE_N 變了）就不出來；點一下跳過動畫時（modalSkip）馬上出來
   ②第三個參數 cls：視窗多加的 class（"res"＝結果視窗：主要按鈕整排、次要按鈕平分；"keep"＝換頁也不關，例如對戰邀請、新版本通知）
   ③殺棋動畫還在畫面上時，視窗加 ovk 蓋在動畫上面（不會被動畫的暗幕、黑邊壓住）
   ④按鈕第三格寫字串（例如 "wide"）＝次要按鈕再加這個 class（結果視窗裡自己一整排） */
function modal(html,buttons,cls){if(Date.now()<MODAL_HOLD){const rn=ROUTE_N,go=()=>{const i=MODAL_Q.indexOf(go);if(i<0)return;MODAL_Q.splice(i,1);if(rn===ROUTE_N)modal(html,buttons,cls)};MODAL_Q.push(go);setTimeout(go,MODAL_HOLD-Date.now()+30);return null}
  const m=document.createElement("div");m.className="modal"+(cls?" "+cls:"")+(document.querySelector(".kx,.kx-dim")?" ovk":"");m.innerHTML=`<div class="box">${html}<div class="mb"></div></div>`;
  for(const[label,fn,ghost]of buttons){const b=document.createElement("button");b.className="btn"+(ghost?" ghost":"")+(typeof ghost==="string"?" "+ghost:"");b.textContent=label;b.onclick=()=>{m.remove();try{mdUnsay(m)}catch(e){}fn&&fn()};m.querySelector(".mb").append(b)}   /* 11/17 測試員 D 第 7 輪 P3-3：視窗關掉時，播報區裡這個視窗念過的那一行一起拿掉 */
  document.body.append(m);m.setAttribute("role","dialog");try{mdTop(m)}catch(e){}try{if(typeof i18nApply==="function"&&/^en/.test(document.documentElement.lang||""))i18nApply(m.querySelector(".box"))}catch(e){}/* 11/17 N6-6：英文時先把視窗換成英文再念（播報區不留中文） */try{mdSay(m)}catch(e){}return m}   /* 回饋 847（讀螢幕盲棋）：結果視窗（贏了、輸了、和棋）跳出來時讀出來 */
/* 11/17 測試員 D 第 10 輪：英文模式「加到主畫面」視窗開著時播報區寫了兩次（先寫一句、外掛字典載完 mdSayEn 又寫一句）→ 英文模式、視窗的字還有中文（外掛字典還沒載完）先不念，交給 mdSayEn 翻好再念一次；
   念過的每一句都記在 m._axs，任何一顆按鈕關視窗（No thanks、I've already added it、OK, adding it now…）全部清掉（mdUnsay） */
function mdSay(m){if(typeof axSay!=="function")return;m._axs=m._axs||[];let en=false;try{en=typeof i18nLang==="function"&&i18nLang()==="en"}catch(e){}
  if(en&&/[\u3400-\u9fff]/.test(m.querySelector(".box").innerText)&&typeof i18nExtLoad==="function"&&typeof i18nApply==="function"){m._ax="";mdSayEn(m);return}
  m._ax=axSay(m.querySelector(".box").innerText.replace(/\s+/g," ").trim().slice(0,160));if(m._ax)m._axs.push(m._ax)}
/* 11/17 測試員 B 第 8 輪 N8-2：英文模式重新整理後跳的視窗（序局邀局「星樞棋局・序局」）開得比英文外掛字典（i18n-en.json）載完還早——畫面晚一點會換成英文，播報區卻留著當下念的中文全文。
   英文模式、念的那句還有中文：等外掛字典載完再把視窗翻一次，播報區那一行換成英文（拿掉中文那行、念英文那句）；視窗已經關了就不做。07i18n i18nBoot 也會對開機前就開著的視窗再叫一次 */
function mdSayEn(m){let en=false;try{en=typeof i18nLang==="function"&&i18nLang()==="en"}catch(e){}if(!en||!m||typeof i18nExtLoad!=="function"||typeof i18nApply!=="function")return;
  const L0=m._axs||(m._axs=m._ax?[m._ax]:[]);if(L0.length&&!L0.some(x=>/[\u3400-\u9fff]/.test(x)))return;   /* 念過的都是英文＝不用再念；還沒念（mdSay 先不念的）或念過中文＝等字典載完再念 */
  Promise.resolve(i18nExtLoad()).then(()=>{if(!m.isConnected)return;const bx=m.querySelector(".box");if(!bx)return;try{i18nApply(bx)}catch(e){}const t=bx.innerText.replace(/\s+/g," ").trim().slice(0,160);if(!t)return;const K=typeof axKey==="function"?axKey:x=>x;if((m._axs||[]).some(x=>K(x)===K(t)))return;
    try{mdUnsay(m);m._axs=[];m._ax=axSay(t);if(m._ax)m._axs.push(m._ax)}catch(e){}}).catch(()=>{})}
function mdUnsay(m){if(!m||typeof axUnsay!=="function")return;for(const x of m._axs||[m._ax])if(x)axUnsay(x)}
/* 11/11 模擬玩家問題 8：確認框要在最上層——全站地圖（07z6 #stmOv，z-index 9000）、各頁的大面板（950 上下）開著時跳的確認框（例如地圖上點「這站棋理」）
   以前固定 z-index 60，開在地圖底下，看起來像沒反應。跳出來時看 body 底下正開著、蓋住畫面的固定層，比它高一層；最多到 9990（家長時段、過場、預載畫面照舊在最上面） */
function mdTop(m){let z=0;const VA=innerWidth*innerHeight;for(const el of document.body.children){if(el===m||el.classList.contains("toast")||el.classList.contains("modal"))continue;const cs=getComputedStyle(el);if(cs.position!=="fixed"||cs.display==="none"||cs.visibility==="hidden"||cs.opacity==="0")continue;const n=parseInt(cs.zIndex,10);if(!(n>z&&n<9990))continue;
    const r=el.getBoundingClientRect();if(r.width*r.height>=VA*.25)z=n}   /* 只算蓋住一大片的層（地圖、面板、暗幕）；角落的籤筒、小橫幅不算，確認框不會因為它們整個抬高 */
  const z0=parseInt(getComputedStyle(m).zIndex,10)||60;if(z>=z0)m.style.zIndex=String(Math.min(9990,z+1))}
/* 意見回饋 607：點一下跳過殺棋動畫：等著的結果視窗馬上出來 */
function modalSkip(){MODAL_HOLD=0;MODAL_Q.slice().forEach(f=>{try{f()}catch(e){}})}
/* 11/17 第 20 輪 B N20-1（P1）：通用 .modal 只有換過字級（html[data-fz]）才能捲；橫式手機（高 375～430）放不下的視窗（星門圍城第一次破關的結算、古戰場 ⓘ、線上大廳安全須知）按鈕在畫面外、卡死 →
   比照 .modal.gsv-rd：畫面矮（高度 ≤500）時視窗可以上下捲、從上面排起，放得下時 .box 照樣置中（margin:auto 0）。直式手機、iPad 高度都超過 500，不受影響。m.css 不能改（發版只換模組），從這裡注入 */
/* 11/18 第 30 輪 R30-1（P1）：英文序局邀局卡（.modal.prolog）在網頁版可視高度 575 以下（iPhone SE 用 Safari 375×553、320×568）字比中文長，「Enter the game」被擠到畫面外、又不能捲 →
   不再只限高度 ≤500：所有視窗放不下時都能上下捲（放得下照舊置中，margin:auto 0）；高度用 100dvh（Safari 網址列、工具列佔掉的那段不算）；
   序幕、邀局、星盤暫合這類卡（.prolog）按鈕列黏在卡片底部（sticky，讓開 Home 條），內文在上面捲，按鈕一直看得到、點得到 */
const MDLOW_CSS=".modal{overflow-y:auto;align-items:flex-start;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.modal>.box{margin:auto 0;flex:none}@supports (height:100dvh){.modal{bottom:auto;height:100dvh}}"
  +".modal.prolog>.box>.mb{position:sticky;bottom:calc(0px - max(24px,calc(env(safe-area-inset-bottom,0px) + 12px)));z-index:1;background:var(--card,#FFF8EC);margin-left:-20px;margin-right:-20px;margin-bottom:-24px;padding:6px 20px max(24px,calc(env(safe-area-inset-bottom,0px) + 12px));border-radius:0 0 22px 22px;box-shadow:0 -8px 10px -6px rgba(0,0,0,.18)}";
/* 11/18 第 31 輪 N31-4：上面那條黏底按鈕列，下面還看得到一行內文（320×460 邀局卡、375×553 序幕卡）——sticky 是貼在捲動框扣掉內距的地方，.modal 下面那段內距（24px 或 Home 條＋12px）沒有東西擋，
   後面捲動的字就從那裡露出來 → 按鈕列往下貼到畫面最底（bottom 用負的內距），自己的下內距補回同樣高度（按鈕照樣在 Home 條上面），底色不透明（卡片色），上緣一點陰影分出層次 */
function mdLowCss(){try{if(typeof document==="undefined"||document.getElementById("mdLowCss"))return;const s=document.createElement("style");s.id="mdLowCss";s.textContent=MDLOW_CSS;(document.head||document.documentElement).append(s)}catch(e){}}
mdLowCss();
/* 回饋 835（開發者 11/9 選：過場點兩下跳過）：不擋手的大動畫——蓋印（stampFx、本命星 chdSealFx）、開局大字、將軍、開局名——本來就 pointer-events:none、點得到底下，
   但會蓋住畫面 2～3 秒；現在點一下畫面就 0.15 秒淡掉收起（這一下照常傳下去，不吃掉點選）。存檔、修為、印都在播動畫之前就記好了，收掉動畫不影響 */
const FX_TAP_SEL=".stampfx,.kjfx,.ckfx,.opfx";
addEventListener("pointerdown",()=>{try{document.querySelectorAll(FX_TAP_SEL).forEach(d=>{if(d.dataset.fxt)return;d.dataset.fxt="1";let a=null;try{a=d.animate([{opacity:getComputedStyle(d).opacity},{opacity:0}],{duration:150,fill:"forwards"})}catch(e){}if(a)a.onfinish=()=>d.remove();else d.remove();setTimeout(()=>d.remove(),400)})}catch(e){}},true);
/* 意見回饋 607：關掉這一頁的視窗和卡片（換頁前用；"keep" 的視窗留著） */
function navClear(){document.querySelectorAll(".modal:not(.keep)").forEach(m=>m.remove());if($("#sheet"))closeSheet(true)}
/* 意見回饋 607：等換到網址 k 那一頁畫好，再做 fn（例如回到冒險頁後打開下一回的故事卡片）；5 秒內沒換到就算了 */
function navAfter(k,fn){const on=()=>{if(navKey(location.hash)!==k)return;removeEventListener("hashchange",on);setTimeout(fn,350)};addEventListener("hashchange",on);setTimeout(()=>removeEventListener("hashchange",on),5000)}
/* 意見回饋 607：🏠 回首頁＝退回 App 的第一筆紀錄（NAV_HOME 讓 popstate 再把它換成首頁），不往前推新的一頁；
   回到首頁後再按上一頁／往右滑就離開 App，不會又回到剛下完的棋。退不回去（例如紀錄對不上）1.5 秒後直接換成首頁 */
function goHome(){navClear();
  /* 瀏覽器最多只留約 50 筆上一頁紀錄：玩很久 NAV_D 會比留下來的多，這時往回跳可能跳出 App（到更早開的網頁），所以只在紀錄還在時往回跳，不然直接把這頁換成首頁 */
  if(NAV_D>0&&NAV_D<history.length){NAV_HOME=true;history.go(-NAV_D);setTimeout(()=>{if(NAV_HOME){NAV_HOME=false;navReplace("#/")}},1500);return}
  if(navKey(location.hash)!=="/")navReplace("#/")}
/* 意見回饋 607：「回到 XX」＝退回紀錄裡同一個網址的那一層（找最近的一層，跳過卡片那一層）；找不到才 replace 成那個網址（不往前推）。
   after：到了那一頁以後要做的事。go() 1.5 秒都沒動靜（紀錄對不上）就直接 replace 過去 */
function goUp(h,after){navClear();const k=navKey(h);
  if(navKey(location.hash)===k){route();if(after)setTimeout(after,350);return}
  if(after)navAfter(k,after);
  for(let i=NAV_D-1;i>=0&&NAV_D-i<history.length;i--){const x=NAV_H[i];if(typeof x==="string"&&x[0]!=="~"&&navKey(x)===k){   /* 超過瀏覽器留著的紀錄就不往回找 */const d0=NAV_D,h0=location.hash;history.go(i-NAV_D);setTimeout(()=>{if(NAV_D===d0&&location.hash===h0)navReplace(h)},1500);return}}
  navReplace(h)}
function confirmBox(text,yes,label){modal(`<h2 style="font-size:19px">${esc(text)}</h2>`,[[label||"確定",yes],["取消",null,true]])}


// ChatGPT 接手改善：讓玩家能查到實際適用範圍，而不是宣稱完整競賽裁判。
function ruleNote(v,st){
  if(!st.rules)return;const stat=v.querySelector("#stat");if(!stat)return;
  let note=v.querySelector(".rule-note");if(!note){note=document.createElement("details");note.className="rule-note muted";note.style.cssText="font-size:12px;padding:2px 8px";
    const summary=document.createElement("summary");summary.style.cssText="cursor:pointer;min-height:24px;display:inline-block;padding:1px 10px;border-radius:99px;border:1px solid var(--line);background:var(--card)";   /* 開發者 11/11 選「對局角落加棋規徽章」 */
    note.append(summary,document.createElement("p"));stat.after(note)}
  /* 開發者 11/11 盤查：石桌往事 noPerpetual 的關（local.js playState 的 noPerp）不判長將長捉，徽章要照實說；同一個畫面換盤時文字跟著換 */
  const np=!!st.noPerp,sm=note.querySelector("summary"),p=note.querySelector("p");
  /* 11/11 Gemini 架構報告第一項：這盤的棋規設定 st.rc 不是千秋休閒規則（設定頁選了原型）時，徽章照實寫「原型・不計積分」 */
  const RS=st.rc&&window.XQCore&&XQCore.RULESETS&&XQCore.RULESETS[st.rc.rulesetId],proto=!np&&!!(RS&&RS.status==="prototype");
  const tw=!np&&!!(RS&&RS.id==="tw113");   /* 11/12 臺灣棋規正式版 */
  const S=np?"📜 本關棋規：不判長將長捉":tw?"⚖️ 本局棋規：臺灣棋規（113 年版）"+(st.rc.mode==="ranked"?"・計積分":""):proto?"⚖️ 本局棋規："+RS.name+"・不計積分":"📜 本局棋規："+((st.rules&&st.rules.name)||"亞洲棋例（直接捉子）");
  const T=tw?"這盤開局時用設定頁選的「"+RS.name+"」，中途不能改。長將、長捉要三次循環（同一局面第 4 次出現）仍不變著才判負；雙方長將、雙方長捉、雙方都沒犯例判和（表 2.2-1）；同類子受牽制不能離線仍算長捉（棋例總綱 7）；將帥、兵卒追子算閒。雙方共走 100 著沒吃子判和（條文是經裁判審查，App 自動判）。循環路線不同、同類子換位這兩種 App 判不了，只提醒變著或協議和棋。犯規、違例次數由現場裁判記，App 不讓下出違規著法、不記次數。"
    :proto?"這盤開局時用設定頁選的「"+RS.name+"」，中途不能改。這是原型：只改了一條——長將、長捉循環到第 3 次不自動判負，先提醒，請變著或雙方協議和棋（臺灣比賽規程寫「經裁判裁決仍不變著」才判負，App 沒有現場裁判）。一將一捉、閒著循環也只提醒、不自動判和（《中華民國象棋規則》113 年修訂版的判法還沒照著改）。其他照千秋休閒規則。這盤不計積分。"
    :np?"這一關不判長將、長捉：局面重複不會判輸贏，也不會因此判和，可以一直將軍或追子。其他照常：將死、困斃判負；連續 60 回合沒吃子、雙方都沒有車馬炮兵判和。"
    :"這盤開局時就定好用這一版，中途不能改。同局面第三次出現時檢查循環；單方長將（繞不同路線也算）、直接長捉同一子判負。一將一捉不直接判負。特殊互捉、同類牽制待核，可變著或提和；計時照常。遊戲限著為連續60回合未吃子，並非完整正式賽例裁判。";
  if(sm&&sm.textContent!==S)sm.textContent=S;if(p&&p.textContent!==T)p.textContent=T;
}
/* 開發者 11/11 選 v3 規劃書 B03：這盤用過提示棋或悔棋，對局畫面留一個小標示（點了看說明）；第一次用到時說明一次（asstTip 記過就不再跳）。
   依據是 local.js 記的 hintN／undoN——「我的棋力」就是照這兩個數排除這一盤（04-stats 的 hu），不是畫面自己猜的。
   只有擂台、石桌往事、園子的對局有提示棋和悔棋；挑戰電腦（晉級賽、練功房）和線上對戰本來就不能用，不會出現這個標示 */
function asstNote(v,st){
  const on=!!(st&&!st.practice&&(+st.hintN||0)+(+st.undoN||0)>0),stat=v.querySelector("#stat");let n=v.querySelector(".asst-note");
  if(!on||!stat){if(n)n.remove();return}
  const t="🎒 這盤用過"+[st.hintN?"提示棋":"",st.undoN?"悔棋":""].filter(Boolean).join("、")+"・不算進我的棋力";
  if(!n){n=document.createElement("button");n.type="button";n.className="asst-note";n.style.cssText="display:inline-block;align-self:flex-start;margin:2px 8px;padding:1px 10px;min-height:24px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--muted);font:inherit;font-size:12px;cursor:pointer";
    n.onclick=asstTip;(v.querySelector(".rule-note")||stat).after(n)}
  if(n.textContent!==t)n.textContent=t;
  if(!store.get("asstTip",false)){store.set("asstTip",true);setTimeout(asstTip,900)}
}
function asstTip(){modal(`<div class="em">🎒</div><h2>這盤用過提示棋或悔棋</h2><p>輸贏照常算。</p><p>只是這一盤<b>不算進「我的棋力」的分數</b>（五邊形、成長曲線、準確度）——有幾步不是自己想出來的，算進去就不準了。還是算一次練習量。</p><p class="muted" style="font-size:13px">雲河棋路的關卡用了提示棋，最多收到「馬」。想量真正的棋力，試試不用提示、不悔棋下完一盤。</p>`,[["知道了",null]])}

/* 開發者 11/11 選「邀請時顯示棋規」：邀請框寫出本局採用哪一版（版本不同的邀請 net.js 會先擋掉，看得到邀請＝同一版） */
/* 11/11 Gemini 架構報告第一項：邀請帶 rs（對方設定的棋規，舊版沒帶＝千秋休閒規則）；跟自己的設定不同、或雙方都選原型，先講明這盤只算友誼賽 */
function ruleLine(x){try{const R=window.XQCore&&XQCore.REP_RULES;if(!R)return"";const RS=XQCore.RULESETS||{},d=XQCore.RULESET_DEFAULT||"qiqiu_casual",a=window.XQ_rulePref?XQ_rulePref():d,b=x&&x.from&&RS[x.from.rs]?x.from.rs:d;const fr=a!==b||!(RS[a]&&RS[a].rated)?`<br>⚖️ ${a!==b?`對方用「${esc((RS[b]||{}).name||b)}」、你用「${esc((RS[a]||{}).name||a)}」，這盤照千秋休閒規則判`:`雙方都選了「${esc((RS[a]||{}).name||a)}」`}，只算友誼賽、不計積分。`:"";return`<p class="muted" style="font-size:13px;margin:6px 0 0">📜 本局採用：${esc(a===b&&a!==d&&RS[a]?RS[a].name:R.name)}（點對局畫面上的棋規徽章可以看說明）${fr}</p>`}catch(e){return""}}
/* 來源標籤（11/11 Gemini 架構報告第四項，查證後實作；處理紀錄 story/100_Gemini架構報告處理.md）
   說法跟「📜 文史考據」頁（data/docs/history.md）同一套四種：【史實】【有爭議／傳說】【演義・小說】【遊戲創作】，不另外發明別的說法。
   資料有 tags 就照 tags；Gemini 提議的標籤也認，但換成現有說法：fiction（Gemini 叫【雲河演義】）＝【遊戲創作】（「演義」在文史頁專指古代小說）；
   classic、shi_qing_ya_qu（Gemini 叫【適情雅趣古譜】）不是真假分類而是出處，照現有寫法顯示「📖 出處：適情雅趣」。
   沒有 tags 就看既有欄位：src.book（星槎石桌＝遊戲創作，其他＝古譜／對局出處）、題庫 src 字串（…練習＝不標）、戰役 prov（存疑＝有爭議／傳說） */
const PROV_LB={hist:"史實",legend:"有爭議／傳說",novel:"演義・小說",game:"遊戲創作"};
const PROV_TAG={history:"hist",fact:"hist",legend:"legend",disputed:"legend","存疑":"legend",novel:"novel",fiction:"game",game:"game"};
const PROV_BOOK={shi_qing_ya_qu:"適情雅趣",ju_zhong_mi:"橘中秘",mei_hua_pu:"梅花譜",classic:"古譜"};
function provOf(x){if(!x||typeof x!=="object")return null;const tg=Array.isArray(x.tags)?x.tags.map(String):[];let kind=null,book=null;
  for(const t of tg){if(!kind&&PROV_TAG[t])kind=PROV_TAG[t];if(PROV_BOOK[t]&&(!book||book==="古譜"))book=PROV_BOOK[t]}
  if(!kind&&typeof x.prov==="string")kind=PROV_TAG[x.prov]||null;const s=x.src;
  if(s&&typeof s==="object"&&s.book){if(s.book==="星槎石桌")kind=kind||"game";else book=book||String(s.book)}
  else if(typeof s==="string"&&s&&!/練習$/.test(s))book=book||s;
  return kind||book?{kind,label:kind?PROV_LB[kind]:null,book}:null}
function provChip(x){const p=provOf(x);return p&&p.kind?`<span class="prov prov-${p.kind}">【${p.label}】</span>`:""}
/* 題目標題下那一行：真假標籤＋出處（題庫原本的「📖 出處：…」改由這裡產生） */
function provLine(x){const p=provOf(x);if(!p)return"";const bk=p.book?"📖 出處："+esc(typeof toT==="function"?toT(p.book):p.book):"";return`<div class="muted" style="font-size:12.5px;margin-top:2px">${provChip(x)}${bk}</div>`}
/* 文件頁（xqDocIn）：md 裡打的【史實…】【有爭議…】【演義…】【遊戲創作…】套上同一組樣式 */
function provDoc(h){return String(h).replace(/【(史實|有爭議|演義・小說|遊戲創作)([^】<]{0,20})】/g,(m,a)=>`<span class="prov prov-${a==="史實"?"hist":a==="有爭議"?"legend":a==="遊戲創作"?"game":"novel"}">${m}</span>`)}
addEventListener("xq-rules-mismatch",()=>toast("雙方棋規版本不同，請一起更新遊戲後再開新局。"));
/* 11/17 開發者「天氣錯誤」（17:06 首頁還是黃昏、西市和觀星臺已經是夜景有月亮）＋選單：日夜全部照實際日落。
   全站換夜景圖的判斷都問這一個：照 07w7 首頁同一套（sw7NightNow＝當季日落、黃昏結束後算夜，SW7_TODW）；d＝指定時刻（測試用）。
   07w7 還沒載入或出錯時退回時辰（卯～申白天、酉～寅夜），不會丟錯。頂欄時辰鐘照舊顯示時辰，不問這個 */
function xqNight(d){try{if(typeof sw7HomeNightA==="function"&&typeof sw7SeaNow==="function"){if(!d&&typeof sw7NightNow==="function")return!!sw7NightNow();return sw7HomeNightA(d,sw7SeaNow())>0}}catch(e){}
  d=d||new Date();const i=Math.floor(((d.getHours()+1)%24)/2);return!(i>=3&&i<=8)}
/* 11/17 iMac 測試員 H（P1，準則 4.0／2.1）：iPhone Duo 這種狀態列和相機在右側的機型（右側安全區 84px），右上角的 ✕ 和功能鍵被壓住、點了開控制中心；
   錯棋重練的「全部錯棋」面板看不到 ✕ 而且點外面、往下滑都關不掉。m.css 不能改，這裡補一份「左右安全區」樣式（沒有側邊安全區的機型 env() 是 0，畫面不變）：
   頂欄、底部卡片（#sheet，含右上 ✕）、彈窗、滑出面板（07w .xqs）、術語碑面板，以及 fixed 而且貼著左右邊的按鈕／浮窗，都讓開 env(safe-area-inset-left／right)。
   .xqs 往下滑關閉另外在 07w-shipwalk 補。測試 test-imac-h1514.js 用 CSS 變數模擬右側 84px 檢查 */
const SAFE_LR_CSS=`.topbar{padding-left:calc(6px + env(safe-area-inset-left,0px));padding-right:calc(6px + env(safe-area-inset-right,0px))}
.sheet{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}
.sheet .sh-x{right:calc(10px + env(safe-area-inset-right,0px))}
.modal{padding-left:calc(24px + env(safe-area-inset-left,0px));padding-right:calc(24px + env(safe-area-inset-right,0px))}
.xqs.xqs{width:min(calc(94vw - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)),520px);left:calc(50% + (env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)) / 2)}
html .tb-pn{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}
html .dgl-float{right:calc(10px + env(safe-area-inset-right,0px))}
html .cpl-door{right:calc(12px + env(safe-area-inset-right,0px))}
html .fig-item,html .fm-rib,html .sw7-bxp{left:calc(12px + env(safe-area-inset-left,0px));right:calc(12px + env(safe-area-inset-right,0px))}
html .hq-h{padding-right:calc(14px + env(safe-area-inset-right,0px))}
html .mf-zx{right:calc(12px + env(safe-area-inset-right,0px))}
.hq-h button{min-width:44px;min-height:44px}
.hq-pv{position:relative}.hq-pv::after{content:"";position:absolute;left:-8px;right:-8px;top:50%;height:44px;transform:translateY(-50%)}
.mf-zx::after{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}
html .shp-spot:not(.ex-spot),html .shp-hs{z-index:155}`;   /* 11/17 iMac G P3-8：星槎頁走動的角色（07w .shw-me，z-index 150）走到底部按鈕上時，點「回棋鎮」會點到角色、跳出問問題選單 → 圖上的入口標籤一律在角色上面（角色的對話泡泡、選單照舊在最上面） */   /* 11/17 iMac 測試員 G P3-3：「關於」文牒右上 ✕（17×27）、名冊右上 ✕（16×25）、「隱私說明 ›」（63×16）可點範圍撐到 44（07s4 是禁改檔，樣式從這裡補） */
/* 11/17 iMac 測試員 H（iPhone Duo 466×678）P3 與 F（iPhone 18 Pro）P3-1：點擊區、版面小修（樣式只加在這裡，m.css 不動）
   ① H P3-2／F P3-1：錯棋重練的篩選（#rf「全部」21pt）、我的戰績分頁與篩選（.st-tabs／.st-seg／.st-res 33pt）、結算框「看我的棋力 ›」（.rg-go 27pt）、示範棋局的上一步／播放／下一步（24pt）補到 44 高。
      千秋盃屏風「對陣金榜／英雄帖／大掛盤」、首頁地點標籤、星槎入口都是 .shp-spot：外框看起來 27～33 高，點擊判定由 07z 的 .shp-spot::before 撐到 44（相鄰太近才縮），星槎「🌀 立體」由 m.css .shp-gy::before 上下各撐 11px（24＋22＝46）。
   ② H P3-3：展開「📜 本局棋規」（details.rule-note[open]）時，下面的「🧊 3D 場景」不再往上疊到說明最後一行（原本 m.css 給它 margin-top:-14px）。
   ③ H P3-4：車輪戰桌號頁籤（.sim-tb）原本固定 42 高，字放大時「你」下半被切 → 高度跟著字、至少 44。
   ④ H P3-5：中文窄螢幕（≤480）頂欄標題純文字時可以換兩行（檢討頁「你 對 …」被右邊圖示擠到截斷）；英文早就有同一條（07i18n）。
   ⑤ H P3-10：挑戰電腦的「悔棋」灰色（.xq-off），點了說明不能悔棋（08b undoAsk）。 */
const TAP44_CSS=`#rf button,.st-tabs button,.st-seg button,.st-res button,#dmP,#dmG,#dmN{min-height:44px}
.rg-go{min-height:44px;display:flex!important;align-items:center;justify-content:flex-end}
details.rule-note[open]+.pk3d-back button{margin-top:6px}
.sim-tb{height:auto!important;min-height:44px;padding:3px 0 4px!important}
@media (max-width:480px){html:not([lang^=en]) #title:not(:has(*)){white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.15;font-size:calc(16px * min(var(--fz,1),1.3));letter-spacing:.02em;overflow-wrap:anywhere}}
.xq-off{opacity:.45;filter:grayscale(1)}
.gx-top,.gxd-top,#dglXs .xs-top{padding-left:calc(12px + env(safe-area-inset-left,0px))!important;padding-right:calc(12px + env(safe-area-inset-right,0px))!important}
html .sw7-now{right:calc(3% + env(safe-area-inset-right,0px))}
#view.view,.view{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}
.sheet .sh-x{width:44px;height:44px;line-height:44px;top:4px}
.sheet:has(> .sh-x) .sh-t{padding-right:calc(60px + env(safe-area-inset-right,0px))}
html[data-lefty] .sheet .sh-x{left:calc(10px + env(safe-area-inset-left,0px))}
.scrim,.xqs-s{cursor:pointer;touch-action:manipulation}
.shw-menu button{min-height:44px}
html .me-nick{right:calc(10px + env(safe-area-inset-right,0px))}
.me-nick::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;transform:translateY(-50%)}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
html .bk-title{right:calc(16px + env(safe-area-inset-right,0px))}
html .ld-q{padding-left:calc(28px + env(safe-area-inset-left,0px));padding-right:calc(28px + env(safe-area-inset-right,0px))}
html .xsm-ban{left:calc(8px + env(safe-area-inset-left,0px));right:calc(8px + env(safe-area-inset-right,0px))}
.xsm-ban button{min-height:44px;min-width:44px}
.bk-mark{margin-bottom:calc(14px + env(safe-area-inset-bottom,0px))}
.view:has(> .shp-page){padding-bottom:env(safe-area-inset-bottom,0px)}
body:has(.shl-board)>.xqbot,body:has(.bt2)>.xqbot{display:none!important}
#meXp,#gdMeB,#gdMeH{min-height:44px;min-width:44px}
html[lang^=en] .me-seal{writing-mode:horizontal-tb;width:auto;min-width:60px;max-width:140px;height:auto;min-height:60px;padding:6px 8px;font-size:12px;line-height:1.15;text-align:center;white-space:normal;word-break:normal;overflow-wrap:break-word}
html[lang^=en] .me-seal .two{writing-mode:horizontal-tb;letter-spacing:0}
html[lang^=en] #title .sw7-hd{white-space:normal;overflow:visible;text-overflow:clip;font-size:10.5px;line-height:1.25;letter-spacing:0}
@media (max-width:480px){html[lang^=en] #title:has(.sw7-hd){display:block!important;-webkit-line-clamp:unset!important;max-height:none!important;overflow:visible!important}}
html .toast{z-index:9990}
.xqs.xqs{bottom:auto;max-height:calc(100% - var(--xqT,56px) - var(--xqB,64px) - 16px)}
#sndTry,#bgmTest{min-height:44px}
#fcmBar{opacity:.78}#fcmBar button{min-height:44px;font-weight:700;border-width:1.5px}
html .modal{padding-top:max(24px,calc(env(safe-area-inset-top,0px) + 12px));padding-bottom:max(24px,calc(env(safe-area-inset-bottom,0px) + 12px))}
html .fm-ov{padding-top:max(16px,calc(env(safe-area-inset-top,0px) + 10px));padding-bottom:max(16px,calc(env(safe-area-inset-bottom,0px) + 10px))}
#stmOv::before{content:"";position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top,0px);background:#F4EDE0;z-index:5;pointer-events:none}
html:is([data-fz=xxl],[data-fz=max]) .xqs.xqs{width:calc(100vw - 12px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px))}
html:is([data-fz=xxl],[data-fz=max]) .xqs-h{letter-spacing:0;padding-left:48px;padding-right:48px;font-size:calc(17px * min(var(--fz,1),1.25));line-height:1.2}
html:is([data-fz=xl],[data-fz=xxl],[data-fz=max]) :is(.btn,.xqs-b button,.sheet button){white-space:normal;height:auto;min-height:44px;overflow-wrap:anywhere;text-overflow:clip}
html:is([data-fz=xxl],[data-fz=max]) .xqs-b{padding-left:2px;padding-right:2px;margin:0 2px}
@media (max-width:340px){#xqTitle .ld-qt{font-size:17px;line-height:1.45}#xqTitle .ld-q{top:max(3vh,env(safe-area-inset-top,0px));padding-left:18px;padding-right:18px}}
@media (max-width:360px){html[lang^=en] #topbar #back{font-size:0;max-width:48px;min-width:44px}html[lang^=en] #topbar #back b{font-size:26px}html[lang^=en] #view #stat{white-space:normal;text-overflow:clip}}
.hq-ft .hq-pv::after{top:auto;bottom:0;transform:none}.hq-ft .hq-upd::before{top:0;bottom:auto;height:max(100%,44px)}
#mzXp::after{content:"";position:absolute;top:0;bottom:0;right:0;width:max(100%,44px)}`;
/* 11/17 測試員 E 第 29 輪 R29-1：英文文牒「Privacy notes ›」「Check for updates」放不下一行、換成上下兩行時，兩顆的透明熱區（各 44 高、上下置中）疊在一起，
   點隱私說明的中間點到檢查更新 → 隱私說明的熱區改成從自己底邊往上長、檢查更新從自己頂邊往下長：同一行時兩顆左右並排照舊各 44 高，換行時上下各管各的，不再重疊。
   R29-7：我的角色頁的「修為」（場景熱點 #mzXp）只有 28 寬，左邊是千秋印譜（大塊）、右邊隔 4px 是園子棋友 → 透明熱區往左長到 44 寬（蓋進印譜右緣一點），不碰園子棋友 */
/* 11/17 測試員 D 第 29 輪 Z1～Z3（320 寬）：開頭畫面長引文壓到大標題 → 引文字小一點、往上；英文窄螢幕頂欄返回鈕的字（Back to Sta…）擠掉頁名、把 🎬 推出畫面 → 360 以下英文返回鈕只留「‹」（字還在，讀螢幕照念）；
   棋譜檢討頁第一行狀態被刪節號截掉 → 窄螢幕英文可以換行 */
/* 11/17 iMac I P3-8：最大字級時，設定房間面板標題（「🔒 系統・隱私・家長」）拆成三行、內文一行只剩約 5 個字、「分享給朋友」被切 →
   特大、最大字級：面板加寬到幾乎整個畫面、標題字距收掉、字小一點；按鈕的字可以換行（不切字、不出刪節號），高度跟著字 */
/* 11/17 iMac I P3：① 提示（toast）原本 z-index 70，在設定房間的面板（.xqs 949）、驛路文牒（950）底下看不到——例如點「🔒 星槎還沒停靠」的朝代其實有說明，只是被面板蓋住 → 提到 9990。
   ② 設定房間的器物面板（.xqs）原本上下都釘死（內容只有兩張卡片也拉滿整個畫面）→ 高度跟著內容走，太長才捲。③ 「▶ 試聽」（#sndTry）、「▶ 測試背景音樂」撐到 44；純淨畫面右上「📜 著法」「✕ 還原」44 高、加深（原本 .3 透明度幾乎看不見）。
   ④ 彈窗（.modal、家長／兒童模式的 .fm-ov）上下讓開動態島與 Home 指示條；全站地圖（#stmOv）往上捲時，狀態列那一條補不透明底，內容不再從時間、電量底下穿過。 */
/* 11/17 iMac I P2：英文「我的角色」的官印（.me-seal，直排 60×60）放英文官階會一個字母一行、壓到按鈕 → 英文改橫排、寬度跟著字；
   英文首頁頂欄第二行（.sw7-hd：船上第幾天・節氣・時辰）在窄螢幕被切成「…Sta…」→ 英文可以換行、字小一點，整個標題不再限兩行 */
/* 11/17 iMac K P2-1、P2-2：底部抽屜（sheet：官階、雲河櫃坊、西市各攤、千秋印譜、園子棋友、二十八宿清單、信件…）右上 ✕ 原本 36×36（::before 撐到 44 判定）→ 外框直接 44×44，右邊讓開安全區（SAFE_LR_CSS）；
   暗幕（.scrim、.xqs-s）加 cursor:pointer——iOS 對沒有游標樣式的 div 點擊偶爾要點兩下才送 click；往下拉把手關閉原本就有（00-util sheet 的 touchend）。
   角色小選單（問問題、聽棋語、我的角色，.shw-menu 33 高）、我的角色暱稱（.me-nick 33 高）補到 44 */
/* 11/17 iMac 測試員 K（iPhone Duo）P1-1、P1-2：
   ⑥ 觀星臺的全螢幕面板——十三星系（07gx .gx-ov，含全景版 .gxp）、今日異象／自由擺陣（07gxd .gxd-ov）、二十八宿（07dgl #dglXs）——唯一的 ✕ 在頂列最右邊，
      Duo 的相機在那一側，點了被系統吃掉（十三星系沒有別的出口）→ 頂列左右讓開安全區（上面 TAP44_CSS），而且四個面板都能「往下滑」關閉（xqOvSwipe，等於按 ✕）。
   ⑦ 首頁右上的節氣章（.sw7-now）讓開右側安全區；頂欄（含右上全站地圖鈕）、首頁稱號與修為（.hq-h）在 SAFE_LR_CSS 已經讓開。
   ⑧ K P1-3：整個頁面內容區（.view：對局棋盤的平面和 3D 園子、車輪戰棋館、地圖頁都在裡面）左右讓開安全區，棋盤不會疊進側邊安全區：
      今日異象、自由擺陣、車輪戰最右一路不再被時鐘、Wi-Fi 蓋住。沒有側邊安全區的手機（直式 iPhone）env() 是 0，畫面不變 */
/* 11/17 iMac K P2-4：滿版圖頁（.shp-page：西市「七星來訪」等）靠下的入口標籤，在矮螢幕上落進 Home 指示條區或畫面外（Duo 662–691，畫面 678）。
   換頁、轉向、改大小後量一次：標籤底部超過「畫面高－底部安全區－6px」就整顆往上挪到看得到的地方（記下原本的 top，下次照原位重算，不會越挪越高） */
function xqSpotClampY(){try{const V=document.getElementById("view");if(!V)return;let sb=0;{const p=document.createElement("div");p.style.cssText="position:fixed;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";document.body.append(p);sb=p.offsetHeight||0;p.remove()}
  const lim=Math.min(innerHeight,window.visualViewport?visualViewport.height:innerHeight)-sb-6,scr=V.scrollHeight>V.clientHeight+4&&getComputedStyle(V).overflowY!=="hidden";   /* 頁面捲得動（底下有 TAP44_CSS 補的 padding-bottom）就不挪，捲下去看得到 */
  if(scr){V.querySelectorAll(".shp-page .shp-spot").forEach(b=>{if(b.dataset.xqTop0!=null)b.style.top=b.dataset.xqTop0});return}
  V.querySelectorAll(".shp-page .shp-spot").forEach(b=>{if(b.dataset.xqTop0==null)b.dataset.xqTop0=b.style.top||"";else b.style.top=b.dataset.xqTop0;if(!b.dataset.xqTop0)return;
    const r=b.getBoundingClientRect();if(!r.height||r.bottom<=lim)return;b.style.top="calc("+b.dataset.xqTop0+" - "+Math.ceil(r.bottom-lim)+"px)"})}catch(e){}}
try{const go=()=>[400,1200].forEach(t=>setTimeout(xqSpotClampY,t));addEventListener("hashchange",go);addEventListener("resize",go);addEventListener("orientationchange",go);setTimeout(go,0)}catch(e){}
const XQ_OV_SWIPE=[[".gx-ov",".gx-x"],[".gxd-ov",".gxd-x"],["#dglXs",'[data-x="close"]']];
(function(){try{if(typeof document==="undefined"||!document.addEventListener)return;let st=null;
  const find=t=>{for(const[o,x]of XQ_OV_SWIPE){const ov=t&&t.closest&&t.closest(o);if(ov)return{ov,x}}return null};
  const fire=(s,cx,cy)=>{const dy=cy-s.y,dx=Math.abs(cx-s.x);if(!(dy>90&&dx<dy*.6&&Date.now()-s.t<900)||!document.contains(s.f.ov)||s.f.ov.dataset.xqSw)return;
    s.f.ov.dataset.xqSw="1";const b=s.f.ov.querySelector(s.f.x);if(b){try{b.click()}catch(x){}}};   /* 同一下滑 touch、pointer 都可能送到：只按一次 ✕ */
  document.addEventListener("pointerdown",e=>{st=null;if(e.isPrimary===false)return;const f=find(e.target);if(!f)return;
    /* 從面板上半部往下滑才算（下半部常是可以捲的清單、棋盤）；可以捲的面板要先捲到頂 */
    if(e.clientY>innerHeight*.45||f.ov.scrollTop>0)return;st={x:e.clientX,y:e.clientY,t:Date.now(),f}},true);
  document.addEventListener("pointerup",e=>{const s=st;st=null;if(s)fire(s,e.clientX,e.clientY)},true);
  /* iPhone 上面板捲到頂再往下拉，瀏覽器會接手做回彈、送 pointercancel、不送 pointerup → 另外用 touch 事件（不會被取消）再判斷一次 */
  let ts=null;document.addEventListener("touchstart",e=>{ts=null;const t=e.touches&&e.touches[0];if(!t||e.touches.length>1)return;const f=find(e.target);if(!f||t.clientY>innerHeight*.45||f.ov.scrollTop>0)return;ts={x:t.clientX,y:t.clientY,t:Date.now(),f}},{capture:true,passive:true});
  document.addEventListener("touchend",e=>{const s=ts;ts=null;const t=e.changedTouches&&e.changedTouches[0];if(s&&t)fire(s,t.clientX,t.clientY)},{capture:true,passive:true});
  document.addEventListener("pointercancel",()=>{st=null},true);
  document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;for(const[o,x]of XQ_OV_SWIPE){const ov=document.querySelector(o);if(ov){const b=ov.querySelector(x);if(b){b.click();return}}}},true);
}catch(e){}})();
function safeLRCss(){try{if(document.getElementById("safeLRCss"))return;const s=document.createElement("style");s.id="safeLRCss";s.textContent=SAFE_LR_CSS+"\n"+TAP44_CSS;document.head.append(s)}catch(e){}}
safeLRCss();
/* 11/17 iMac 測試員 G P3-1：每次開 App 會抓兩次 fixes.json——05-settings 的修正通知（myFixes）和 07s3 的開發者回信各自 fetch 一次（原生版由 native-bridge 轉去 CDN）。
   同一次開 App 裡，同一個資料檔（fixes.json、banlist.json）只真的抓一次，其他呼叫共用同一份回應（各拿一份 clone）；抓失敗（或不是 200）就不留，下次照常重抓。
   什麼時候才叫（進大廳才抓停權名單、送過回饋才在開 App 時抓修正清單、兒童模式都不抓）在 07x4-lobbysafe.js 尾段 */
(function(){try{const f0=typeof window!=="undefined"&&window.fetch;if(!f0||f0.__xqDedupe)return;const C=new Map(),RE=/(^|\/)data\/(fixes|banlist)\.json(\?|$)/;
  const w=function(u,o){try{const s=String(u&&u.url||u||"");if(RE.test(s)&&!(o&&o.method&&o.method!=="GET")){const k=s.replace(/\?.*$/,"").replace(/^.*\/data\//,"data/"),now=Date.now(),c=C.get(k);
    if(c)return c.p.then(r=>r.clone());const p=f0.call(window,u,o);C.set(k,{t:now,p});p.then(r=>{if(!r||!r.ok)C.delete(k);else if(/fixes/.test(k))window.XQ_FIXES_GOT=1},()=>C.delete(k));return p.then(r=>r.clone())}}catch(e){}return f0.apply(window,arguments)};
  w.__xqDedupe=1;window.fetch=w}catch(e){}})();
