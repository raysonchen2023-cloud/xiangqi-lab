/* ================= 🚪 場景頁的「圖上出口」取代頂欄返回（回饋 845，開發者 11/9：「拿掉所有頁面的返回」「打勾處可以返回星槎」「其他的出入口」；範圍＝有滿版圖的場景頁）=================
   有滿版圖（.shp-page）而且頂欄本來有「‹ 返回」的頁：在圖上放一個出口標籤（門口、樓梯口、地板靠近讀者的那一邊），點了跟原本的返回一模一樣（呼叫 #back 的 onclick，
   setTop 決定回哪裡，含 "^" 回那一層），頂欄的返回藏起來（body.xq-exit）。沒有大圖的清單、文章、下棋頁照舊有返回。
   渡口（各朝 port_<朝>_f）：左下角的星槎船頭／碼頭整塊也能點，跟「⛵ 上星槎」一樣回星槎。
   座標是圖上的百分比（標籤中心）；回 #/ 的寫「回棋鎮」（首頁＝楚河渡口棋鎮；11/9 開發者：回首頁換個詞彙）。開關 EXIT_ON */
const EXIT_ON=true;
/* 11/10 開發者「錯誤，是回書院」：戰績、開局、測驗、錯棋重練、規則碑林都是從書院進來的，出口改回書院（直接去 #/hub/learn）；「書院」照停靠朝代換成國子監等 */
/* 11/12 ChatGPT UI 冗餘盤查（story/104 號）第 3 項：學習、對戰兩頁的出口原本寫「🚪 出觀星閣・回時光之苑」，太長、右端超出畫面；
   改成只寫目的地「‹ 回棋鎮」（經典世界照舊換成「‹ 回時光之苑」），去處照舊直接回首頁。出口標籤放好後再推回看得到的範圍（exIn）。
   07w shwXTip 第一次進頁不再另外放一個像按鈕的「‹ 出去」，改成讓這顆真的出口外框短暫亮起（.ex-hi） */
const EX_HUB_LB="‹ 回棋鎮";
function exIn(s){const go=()=>{if(!s.isConnected)return;const V=document.getElementById("view"),P=s.closest(".shp-page");if(!V||!P)return;const vr=V.getBoundingClientRect(),pr=P.getBoundingClientRect(),L=Math.max(vr.left,pr.left)+6,R=Math.min(vr.right,pr.right)-6;
  if(s.dataset.exL!=null)s.style.left=s.dataset.exL;const q=s.getBoundingClientRect();if(!q.width||R-L<q.width)return;const d=q.left<L?L-q.left:q.right>R?R-q.right:0;if(d){if(s.dataset.exL==null)s.dataset.exL=s.style.left;s.style.left="calc("+s.dataset.exL+" + "+Math.round(d)+"px)"}
  exInY(s,V,P);requestAnimationFrame(()=>{try{if(typeof r07Hit==="function")r07Hit()}catch(e){}})};   /* 標籤挪過位置，07z R07 的點選範圍要照新位置馬上重算（r07HitSoon 已經排著就會被略過，點選範圍會停在舊位置被裁掉的樣子） */
  requestAnimationFrame(go);setTimeout(go,700)}
/* 11/12 第 11 輪觸控測試（touch-stress 失敗案例 1、2）：iPhone SE（375×667）上「↩ 回藏譜石窟」「↩ 回挑戰電腦」放在圖的 87～88%，
   掉到畫面外只露 6～20px；場景頁又藏了頂欄返回鍵，等於沒有出口。放好後也往上推：標籤下緣不超過「#view 看得到的下緣」與
   「視窗高 − max(12px, 底部安全區)」，44px 高的點選範圍（m.css .shp-spot::before）也一起算進去 */
function exSafeB(){try{const d=document.createElement("div");d.style.cssText="position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)";document.body.append(d);const v=parseFloat(getComputedStyle(d).paddingBottom)||0;d.remove();return v}catch(e){return 0}}
function exInY(s,V,P){if(s.dataset.exT!=null)s.style.top=s.dataset.exT;const q=s.getBoundingClientRect();if(!q.height)return;const vr=V.getBoundingClientRect(),pr=P.getBoundingClientRect(),hb=Math.max(0,(44-q.height)/2);
  const B=Math.min(vr.bottom,pr.bottom,innerHeight-Math.max(12,exSafeB()))-hb,T=Math.max(vr.top,pr.top)+hb+4;if(q.bottom<=B||B-T<q.height)return;
  if(s.dataset.exT==null)s.dataset.exT=s.style.top;s.style.top="calc("+s.dataset.exT+" - "+Math.round(q.bottom-B)+"px)"}
const EXITS={"/hub/learn":[52,86,"‹ 回棋鎮","#/"],"/hub/battle":[78,87,"‹ 回棋鎮","#/"],
  "/camp":[50,87,"↩ 回書院"],"/theme":[50,87,"↩ 走回書院"],"/canju":[22,87,"↩ 回書院"],"/terms":[50,87,"↩ 回書院","#/hub/learn"],
  "/cup":[50,87,"↩ 下樓・回茶坊","#/hub/battle"],"/cpuroom":[50,96,"↩ 掀簾・回茶坊","#/hub/battle"],"/guanxing":[86,90,"🏘 回棋鎮"],"/ximarket":[64,91,"🏘 回棋鎮"],"/ximarket/tea":[24,95,"↩ 回西市","#/ximarket"],"/redo":[24,87,"↩ 回書院","#/hub/learn"],"/stats":[50,87,"↩ 回書院","#/hub/learn"],"/openings":[50,87,"↩ 回書院","#/hub/learn"],
  "/journey/inn":[18,86,"⛵ 回渡口"],"/ship/lesson":[16,90,"⛵ 回星槎"],"/ship/pz":[16,90,"⛵ 回星槎"],"/ship/shelf":[16,90,"⛵ 回星槎"],"/ship/bag":[16,90,"⛵ 回星槎"],
  "/feedback":[20,74,"⛵ 回星槎","#/adventure"],"/me":[50,87,"🏘 回棋鎮"],"/today":[30,87,"🏘 回棋鎮"],"/gm":[50,87,"↩ 回棋譜庫"],"/quiz":[50,87,"↩ 回書院","#/hub/learn"],
  "/lobby":[18,88,"↩ 回對戰茶樓"],"/db":[20,88,"↩ 回學習書院"],"/settings":[14,90,"⛵ 回星槎"]};
/* 開發者 11/9「拿掉頁面右下角的設定，以後統一到星槎裡面開啟設定」「移除頁面底下的首頁／線上／棋譜入口，整頁滿版」「進到 App 只會看到首頁的樣子」：
   底欄（#tabbar）一律不顯示；原本只靠底欄離開、沒有返回鍵的頁補上回去的路（FIXBACK，跟返回鍵同一套 "^" 回那一層）：
   線上大廳 → 對戰茶樓（茶樓裡有「線上對戰・觀戰」）、棋譜庫（含各部書）→ 學習書院（書院裡有「棋譜庫」）、設定 → 星槎（星槎上的「天字客房」進來）、觀戰 → 線上大廳。
   首頁是最上層，不用出口。設定的入口：星槎全景圖中間艙房的門口「🛏 天字客房・設定」（設定頁本來就是雲河驛站・天字客房） */
const NOTAB_ON=true;
const FIXBACK=[[new RegExp("^/lobby$"),"^#/hub/battle"],[new RegExp("^/db(/[^/]+)?$"),"^#/hub/learn"],[new RegExp("^/settings$"),"^#/adventure"],[new RegExp("^/watch(/|$)"),"^#/lobby"]];
const SHIP_SET=[54,35.5,"🛏 天字客房"];   /* 回饋 851（開發者 11/9）：拿掉「設定」兩字 */   /* 11/12 第 11 輪觸控測試：iPhone SE 上跟下面的「千秋殘局」上下貼齊（間距 0），R07 切開後只剩 31px 高，往上挪 1.5% */
function exFind(k){return EXITS[k]||(new RegExp("^/db/[^/]+$").test(k)?EXITS["/db"]:null)}
/* 開發者 11/11 hspx「從哪來就從哪回去」：信房（#/feedback）的出口照「從哪一頁進來」（07s3 記的 xqFbFrom）顯示和回去：首頁＝回棋鎮、星槎＝回星槎、設定＝回天字客房、其他＝回那一頁；不知道從哪來才用原本的「⛵ 回星槎」 */
/* 首頁方案一（開發者 11/11）：首頁「📜 看棋譜」直接進棋譜庫；從首頁進來的，出口寫「回棋鎮」、回首頁（07z 點標籤時記 xqDbFrom，其他入口進棋譜庫時清掉）；其他照舊回學習書院 */
addEventListener("hashchange",e=>{try{const oh=new URL(e.oldURL).hash||"#/";if(/^#\/db\/?$/.test(location.hash)&&!/^#\/db(\/|$)/.test(oh)&&!/^#\/?$/.test(oh))sessionStorage.removeItem("xqDbFrom")}catch(x){}});
function exDyn(k){if(k==="/db"){let f="";try{f=sessionStorage.getItem("xqDbFrom")||""}catch(e){}if(f!=="#/")return null;const E1=EXITS["/db"]||[20,88];return[E1[0],E1[1],"🏘 回棋鎮","#/"]}if(k!=="/feedback")return null;let f="";try{f=sessionStorage.getItem("xqFbFrom")||""}catch(e){}if(!f)return null;const E0=EXITS["/feedback"]||[20,74];let p="";try{p=typeof usePlace==="function"?usePlace(f):""}catch(e){}
  const lb=/^#\/?$/.test(f)?"🏘 回棋鎮":/^#\/(adventure|ship)(\/|$)/.test(f)?"⛵ 回星槎":/^#\/settings(\/|$)/.test(f)?"↩ 回天字客房":p&&!/^[\x00-\x7f]+$/.test(p)?"↩ 回"+p:"↩ 回上一頁";return[E0[0],E0[1],lb,/^#\/?$/.test(f)?"#/":f]}
/* 11/11 模擬玩家問題 3（返回鍵寫的地方要跟真的去處一樣）：寫死去處（E[3]）的出口照 E[3]，其他照返回鍵記的 data-to（02-shell bkTo＝按下去真的會到的那一頁）；
   字裡已經有那個地方的名字就不動（回首頁的「回棋鎮／回時光之苑」、星槎的「回星槎／回天字客房」也算對），不然改成「↩ 回＋那個地方」 */
function exFix(lb,E){try{const b=document.getElementById("back"),to=E[3]||(b&&b.dataset.to)||"";if(!to||typeof bkName!=="function")return lb;const nm=bkName(to),k=navKey(to);if(!nm||lb.indexOf(nm)>=0)return lb;
  if(k==="/"&&/棋鎮|時光之苑|首頁/.test(lb))return lb;if(/^\/(adventure|ship)(\/|$)/.test(k)&&/星槎|天字客房/.test(lb))return lb;return"↩ 回"+nm}catch(e){return lb}}
function exKey(){return(location.hash||"#/").slice(1).split("?")[0].replace(/\/+$/,"")||"/"}
function exCss(){if(document.getElementById("exCss"))return;const s=document.createElement("style");s.id="exCss";s.textContent=`
body.xq-exit #back{display:none!important}body.xq-exit #topRight .ib[title="回首頁"]{display:none!important}   /* 回饋 849：場景頁走圖上出口，右上角的 🏠 也拿掉 */
.shp-page .shp-spot.ex-spot{z-index:205}.shp-page .shp-spot.ex-spot b{font-size:13.5px;letter-spacing:.04em}
.shp-spot.ex-hi,#back.ex-hi{animation:exHi 1.3s ease-in-out 3}@keyframes exHi{0%,100%{box-shadow:0 0 0 0 rgba(242,201,76,0)}50%{box-shadow:0 0 0 3px #f2c94c,0 0 14px 4px rgba(242,201,76,.75)}}
@media (prefers-reduced-motion:reduce){.shp-spot.ex-hi,#back.ex-hi{animation:none;box-shadow:0 0 0 3px #f2c94c}}
.ex-bow{position:absolute;left:0;bottom:0;width:30%;height:17%;border:0;padding:0;margin:0;background:none;cursor:pointer;z-index:2;-webkit-tap-highlight-color:transparent}`;document.head.append(s)}
/* 換頁後等場景圖長出來（最多 4 秒）再放出口；頁面換掉就拿掉 body.xq-exit */
let EX_T=0;
/* 回饋 847（開發者 11/9「排版錯誤」截圖：渡口頁時辰鐘蓋到標題）：藏起返回鍵以後標題往左移，07w8 的星晷要照新的標題位置重放 */
function exCls(a){const on=document.body.classList.contains("xq-exit");document.body.classList[a]("xq-exit");if(on!==document.body.classList.contains("xq-exit"))try{if(typeof clkPlace==="function")clkPlace()}catch(e){}}
function exSync(){if(!EXIT_ON)return;clearTimeout(EX_T);const k=exKey(),t0=Date.now();
  const go=()=>{const b=document.getElementById("back"),P=document.querySelector("#view .shp-page");
    if(exKey()!==k)return;
    if(k==="/adventure"){const sp=[...document.querySelectorAll("#view .shp-hs,#view .shp-spot")].find(x=>/下船/.test(x.textContent)),box=sp&&sp.parentElement;
      if(!box){if(Date.now()-t0<4000)EX_T=setTimeout(go,150);return}exCss();
      const mk=(cls,x,y,t,fn)=>{if(box.querySelector("."+cls))return;const s=document.createElement("button");s.type="button";s.className=sp.className.split(" ")[0]+" "+cls;s.style.left=x+"%";s.style.top=y+"%";s.textContent=t;s.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(z){}fn()};box.append(s)};
      mk("ex-set",SHIP_SET[0],SHIP_SET[1],SHIP_SET[2],()=>{location.hash="#/settings"});   /* 星槎中間艙房門口＝天字客房（設定） */
      if(b&&!b.hidden&&typeof b.onclick==="function"){mk("ex-home",62,92,typeof hbIsCl==="function"&&hbIsCl()?"🏘 回時光之苑":"🏘 回棋鎮",()=>{const bb=document.getElementById("back");if(bb&&typeof bb.onclick==="function")bb.onclick()});exCls("add")}   /* 右下下船石階＝回首頁 */
      return}
    if(!P){exCls("remove");if(Date.now()-t0<4000)EX_T=setTimeout(go,150);return}
    exCss();const DY=exDyn(k),E=DY||exFind(k),hasBack=b&&!b.hidden&&typeof b.onclick==="function";
    if(k==="/port"){if(!P.querySelector(".ex-bow")){const sp=[...P.querySelectorAll(".shp-spot")].find(x=>/上星槎/.test(x.textContent));if(sp){const w=document.createElement("button");w.type="button";w.className="ex-bow";w.setAttribute("aria-label","上星槎（船頭）");w.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(x){}sp.click()};P.append(w)}}
      if(hasBack)exCls("add");return}
    if(!E||!hasBack){exCls("remove");return}
    if(!P.querySelector(".ex-spot")){const s=document.createElement("button");s.type="button";s.className="shp-spot ex-spot";s.style.left=E[0]+"%";s.style.top=E[1]+"%";let lb=E[2];try{if(k==="/hub/learn"||k==="/hub/battle")lb=EX_HUB_LB;else if(!DY&&(k==="/lobby"||k==="/db")&&typeof bkName==="function")lb="↩ 回"+bkName(k==="/lobby"?"#/hub/battle":"#/hub/learn");else if(k==="/cup"&&typeof xqHubName==="function")lb="↩ 下樓・回"+xqHubName("battle").split(" ").slice(1).join(" ");else if(k==="/cpuroom"&&typeof xqHubName==="function")lb="↩ 掀簾・回"+xqHubName("battle").split(" ").slice(1).join(" ");else if(/書院/.test(lb)&&typeof bkName==="function")lb=lb.replace(/學習書院|書院/,bkName("#/hub/learn"))}catch(x){}if(typeof hbIsCl==="function"&&hbIsCl())lb=lb.replace("回棋鎮","回時光之苑");if(!DY)lb=exFix(lb,E);   /* 11/11 模擬玩家問題 3：經典世界也換成當地叫法（藏譜石窟、觀星閣），以前只有停靠朝代才換，「回書院」其實回藏譜石窟；字再照真的去處對一次 */s.innerHTML="<b>"+lb+"</b>";   /* 出口跟著朝代叫法：出國子監・回棋鎮 */
      s.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(x){}if(E[3]){if(E[3]==="#/"&&typeof goHome==="function"){goHome();return}if(typeof goUp==="function")goUp(E[3]);else location.hash=E[3];return}   /* 11/10 開發者「會跑到象棋規則」：回書院改用 goUp（退回紀錄裡的書院那一層，不多疊一頁），出書院／出茶樓直接回首頁，不再「上一頁」退回剛剛的子頁 */const bb=document.getElementById("back");if(bb&&typeof bb.onclick==="function")bb.onclick()};P.append(s);exIn(s)}   /* E[3]＝直接去那一頁（回饋 849：意見回饋頁回星槎） */
    exCls("add")};
  exCls("remove");EX_T=setTimeout(go,60)}
if(EXIT_ON){addEventListener("hashchange",exSync);if(typeof setTop==="function"){const f0=setTop;setTop=function(t,b){const a=[...arguments];if(NOTAB_ON&&!b){const k=exKey(),m=FIXBACK.find(([re])=>re.test(k));if(m)a[1]=m[1]}const r=f0.apply(this,a);try{exSync()}catch(e){}return r}}
  if(NOTAB_ON&&typeof setTabs==="function"){const f1=setTabs;setTabs=function(show,on){return f1.call(this,false,on)};try{const tb=document.getElementById("tabbar");if(tb)tb.hidden=true}catch(e){}}setTimeout(exSync,500)}
/* 開發者 11/12「做完棋力測驗後沒有出口」：棋力測驗從開始頁（場景）→ 答題（棋盤）→ 結果（場景）都在同一個網址、也沒重設頂欄，
   出口與返回鍵只在換網址、setTop 時整理，所以開始頁藏起返回鍵後一直沒恢復（答題時沒有返回鍵），結果場景也沒放出口。
   改成：#view 裡「有沒有場景圖」改變時重新整理一次（只看有無改變，一般頁面不會閃） */
if(EXIT_ON){let exHas=null;const exChk=()=>{const V=document.getElementById("view");if(!V)return;const h=!!V.querySelector(".shp-page");if(h!==exHas){exHas=h;try{exSync()}catch(e){}}};
  const exObs=()=>{const V=document.getElementById("view");if(!V)return;let q=0;new MutationObserver(()=>{clearTimeout(q);q=setTimeout(exChk,80)}).observe(V,{childList:true});addEventListener("hashchange",()=>{exHas=null;setTimeout(exChk,700)});exChk()};
  if(document.readyState==="loading")addEventListener("DOMContentLoaded",exObs);else exObs()}
