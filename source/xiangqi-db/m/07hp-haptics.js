/* ================= 📳 觸覺回饋（第 11 輪 X2，評審「觸覺回饋設計師」）=================
   落子、吃子、將軍、走不了（點了不能走的地方）、對局結束（勝／敗／和／將死）各一種震動節奏，摸得出差別。
   開關：store「haptic」（預設 true）。設定頁的開關由 05-settings 加（這個檔不碰設定頁）；畫面上有 id="hapSw" 的勾選框時，這裡負責存檔＋試震一次。
     關掉＝這些震動都不震，連 00-util vibrate() 的按鈕小震動也一起停（vibrate 先問 hapHush）。
   掛點：01-board 畫面更新時認出「剛走完一步」（fresh）→ hapMove（只在能下的棋盤：有點選、沒有左右滑換步；看棋譜翻頁不震）；
     01-board tapGo（點選、拖曳放下都走這裡）→ hapTap 判斷「選了子卻點到不能走的地方」；
     對局結束：08b-cpugame（挑戰電腦）、02-shell（線上計分局）發的 xq-result（win／lose／draw）。
   將死：01-board 認得出將死時先等 0.3 秒；這段時間內有 xq-result（知道誰贏）就震勝／敗，沒有才震「將死」。剛震過結束就不再疊一次。
   舊的震動（將軍印章、殺棋動畫、開局鼓聲裡的 vibrate）：剛震過這裡的節奏 0.45 秒內不再震，免得蓋掉（navigator.vibrate 新的一次會取消前一次）。
   iPhone／iPad：Safari 沒有 navigator.vibrate（Vibration API），所以不會震；iOS 17.4～26.4 曾經可以靠 <input type="checkbox" switch> 的系統觸覺「借震」，
     但第三方函式庫（ios-haptics）記載 iOS 26.5 起已被 Apple 修掉，而且只在使用者親手點的那一下才有效，不能照棋局節奏震；所以不用這招，文件照實寫「iPhone 上不會震」。
   減少動態效果（prefers-reduced-motion）：那是畫面動態的設定，震動不是畫面動態，照常震；不想要震的人用開關關掉。兒童模式、家長設定目前沒有震動相關規定，照常震（家長可以關開關）。
   全部靜音、音量滑桿不影響震動（靜音時震動反而是唯一的回饋）。App 在背景（document.hidden）、使用者還沒點過畫面（瀏覽器規定）不震。
   測試：xiangqi-lab/tools/test-haptics.js。文件：art/docs/sound.md「九、觸覺回饋（震動）」。前綴 hap（hp 已被 07l-homepath 用掉） */
/* #HAP-PURE-BEGIN：不碰畫面、不碰 navigator 的純函式 */
/* 各種節奏（毫秒，[震, 停, 震, 停…]）。設計：越重要越長；同一個長度的兩種，次數不同 */
function hapPats(){return{
  move:[15],
  capture:[25,40,25],
  check:[40,50,40,50,120],
  illegal:[10,30,10,30,10],
  win:[30,40,30,40,30,40,200],
  lose:[300],
  draw:[80,80,80],
  mate:[120,60,300]}}
/* 都寫成 function（不用 const）：直接打開設定頁時 route() 可能比這個檔早跑，const 還沒初始化會出錯 */
function hapKinds(){return["move","capture","check","illegal","win","lose","draw","mate"]}
function hapPat(k){const P=hapPats();return Object.prototype.hasOwnProperty.call(P,k)?P[k].slice():null}
/* 圖鑑：[種類, 名稱, 摸起來像什麼, 什麼時候]（設定頁、文件用） */
function hapDex(){return[["move","落子","短短一下","棋子落下"],["capture","吃子","短短兩下","吃掉一顆棋子"],["check","將軍","兩短一長","帥或將被攻擊"],
  ["illegal","走不了","三下很輕很快","選了子卻點到不能走的地方"],["win","贏棋","三短一長","對局結束，你贏了"],["lose","輸棋","長長一下","對局結束，你輸了"],
  ["draw","和棋","兩下中等","對局結束，和棋"],["mate","將死","一中一長","看到將死、還不知道誰贏的時候"]]}
/* 一個節奏總共多久（毫秒） */
function hapLen(P){return(P||[]).reduce((a,x)=>a+(+x||0),0)}
/* 同一種最短間隔（毫秒）：連點、快轉時不要一直震 */
function hapGapOf(k){return{move:80,capture:80,check:1000,illegal:400}[k]||1500}
/* 節流：S＝{last:{種類:毫秒}}；回傳 true＝可以震（同時記下來）。時間倒退當作沒震過 */
function hapGate(S,k,now){if(!S)return true;if(!S.last||typeof S.last!=="object")S.last={};const t=S.last[k];if(t!=null&&now>=t&&now-t<hapGapOf(k))return false;S.last[k]=now;return true}
/* 走完一步該震哪一種：將死 > 將軍 > 吃子 > 落子 */
function hapMoveKind(cap,check,mate){return mate?"mate":check?"check":cap?"capture":"move"}
/* 點了不能走的地方：已選子、點的不是可走的點、不是自己另一顆子（換選）、也不是同一顆（取消）——跟 11c axsTapCue 同一套判斷 */
function hapIsIllegal(sq,b,o,side){o=o||{};if(!(o.sel>=0)||!(sq>=0)||sq===o.sel||!b||!b[o.sel])return false;if((o.targets||[]).includes(sq))return false;
  if(b[sq]&&typeof side==="function"&&side(b[sq])===side(b[o.sel]))return false;return true}
/* xq-result 的 detail → 種類 */
function hapEndKind(d){return d==="win"||d==="lose"||d==="draw"?d:null}
/* #HAP-PURE-END */
var HAP_S;
function hapSt(){return HAP_S||(HAP_S={last:{},t:0,kind:"",endT:0,mateT:null})}
function hapOn(){try{return store.get("haptic",true)!==false}catch(e){return true}}
/* 這支手機的瀏覽器能不能震：vibrate＝可以；none＝不行（iPhone Safari、桌機多半是這個） */
function hapSupport(){try{return typeof navigator!=="undefined"&&typeof navigator.vibrate==="function"?"vibrate":"none"}catch(e){return"none"}}
/* 設定頁開關旁的說明（40 字內） */
function hapNote(){return hapSupport()==="vibrate"?"落子、吃子、將軍、走不了、對局結束各有不同震動。":"這支手機的瀏覽器不支援震動（iPhone 不會震）。"}
/* 真的震：kind 是上面的種類。回傳 true＝有送出震動 */
function hapFx(kind,force){const P=hapPat(kind);if(!P)return false;if(!hapOn()||hapSupport()!=="vibrate")return false;
  try{if(typeof document!=="undefined"&&document.hidden)return false}catch(e){}
  try{const U=navigator.userActivation;if(U&&!U.hasBeenActive)return false}catch(e){}
  const S=hapSt(),now=Date.now();if(!force&&!hapGate(S,kind,now))return false;
  let ok=false;try{ok=navigator.vibrate(P)!==false}catch(e){ok=false}if(!ok)return false;S.t=now;S.kind=kind;
  if(kind==="win"||kind==="lose"||kind==="draw"||kind==="mate")S.endT=now;return true}
/* 00-util vibrate() 先問這個：開關關著、或 0.45 秒內剛震過這裡的節奏，就不要再震（不然會蓋掉） */
function hapHush(){if(!hapOn())return true;const S=hapSt();return!!S.t&&Date.now()-S.t>=0&&Date.now()-S.t<450}
/* 01-board 走完一步叫這個：cap 有沒有吃子、ck 被將的那一格（沒有＝-1）、board 走完的盤面 */
function hapMove(cap,ck,board){try{let mate=false;
    if(ck>=0&&board&&board[ck]){try{const C=typeof XQCore!=="undefined"?XQCore:(typeof window!=="undefined"?window.XQCore:null);
      mate=!!(C&&C.legal&&C.legal(board,board[ck]==="K"?"r":"b").length===0)}catch(e){}}
    const k=hapMoveKind(cap,ck>=0,mate),S=hapSt();
    if(k!=="mate")return hapFx(k);
    if(S.mateT)clearTimeout(S.mateT);S.mateT=setTimeout(()=>{S.mateT=null;if(Date.now()-S.endT<2000)return;hapFx("mate")},300);return true}catch(e){return false}}
/* 01-board tapGo 叫這個：點了不能走的地方就震「走不了」 */
function hapTap(sq,b,o){try{if(!hapIsIllegal(sq,b,o,typeof sideOf==="function"?sideOf:null))return false;return hapFx("illegal")}catch(e){return false}}
/* 對局結束（xq-result）：等著的「將死」取消，改震勝／敗／和；剛震過結束（將死）1.5 秒內不再疊 */
function hapEnd(d){const k=hapEndKind(d);if(!k)return false;const S=hapSt();
  if(S.mateT){clearTimeout(S.mateT);S.mateT=null}else if(S.endT&&Date.now()-S.endT<1500)return false;return hapFx(k)}
/* 試震：開關剛打開時震一次落子、再一次吃子，讓人知道有沒有用 */
function hapDemo(){if(hapSupport()!=="vibrate"){try{toast("這支手機的瀏覽器不支援震動（iPhone Safari 不支援）")}catch(e){}return false}
  const ok=hapFx("capture",true);if(!ok)try{toast("震動沒有送出（可能手機開了省電或關了震動）")}catch(e){}return ok}
/* 單獨試某一種（設定頁圖鑑的 ▶ 用） */
function hapTry(kind){return hapSupport()==="vibrate"?hapFx(kind,true):false}
addEventListener("xq-result",e=>{try{hapEnd(e&&e.detail)}catch(x){}});
document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="hapSw")return;store.set("haptic",!!t.checked);
  try{toast(t.checked?"📳 震動回饋：開":"📳 震動回饋：關")}catch(x){}if(t.checked)setTimeout(hapDemo,50)});
