/* ================= 📈 對戰後的角色成長（開發者 11/15：「體力／靈力／攻擊／防禦在每一次對戰完成後，會顯示這些數值的變化，告訴玩家角色成長了」）=================
   六項照角色卡（07dgl-stamina.js dglCard、dglCardAD、dglCardTS）：天賦（點亮幾個）、體力（定軌力 dglShow(DGL.s.r)）、靈力（星芒 dglXm()）、
   攻擊力、防禦力（BHTD.atkPt／defPt，照修為 xpInfo().L）、技能（學會幾招）；另外修為升級寫一句「修為升到 Lv N！」。
   做法：store "grw"（05b JOURNEY_KEYS 的 m_grw，讀檔、開新旅程跟著換）＝上次結算給玩家看過的數值快照；每次對局結算跟現在比，
     有變化的才一列「⚔️ 攻擊力 108 → 110（+2）▲」，沒變化的不顯示；顯示完（或什麼都沒變）就更新快照。
   接在哪：對局結束時先 grwArm（08b-cpugame.js 結算那一段＝一般對電腦、黑洞塔防 bhtdResult、星門圍城 gsvResult、黑洞星樞 bhResultModal 都從這裡出；
     07bhw-wheel.js whlEnd＝車輪戰），接下來 GRW_TTL 內第一個結果視窗（00-util modal 的 cls 有 "res"）就在按鈕上面插一塊 .grw。
     殺棋動畫延後的視窗（MODAL_HOLD）等真的畫出來才插；序局之類沒有結果視窗的，過了 GRW_TTL 就不插（快照不動，下一盤一起算）。
   體力（定軌力）不存檔、關 App 再開回滿：只比同一次開 App 的（快照記 sid）；開 App 時（grwBoot）把快照的體力換成現在的，第一盤就看得到這盤的變化。
     平日體力在設定關掉＝不記體力。換了角色：攻擊力、防禦力、天賦、技能不比（那不是成長）。星門圍城、車輪戰試玩不給修為，照實際變化顯示（通常只有體力）。
   動態：數字從舊值跳到新值（GRW_MS）、一列一列淡入、升的那列綠色 ▲ 跳兩下；系統開了減少動態（prefers-reduced-motion）＝不跳，直接顯示新值。
   前綴 grw／GRW（11/15 grep 整個 m/ 確認沒人用）。純函式在 #GRW-PURE 區段，測試 xiangqi-lab/tools/test-growth.js */
/* #GRW-PURE-BEGIN：到 #GRW-PURE-END 是不碰畫面的常數與純函式，test-growth.js 用 vm 直接載入 */
const GRW_ON=true,GRW_V=2,GRW_TTL=45000,GRW_MS=700;
/* 六項：順序、名稱、圖示跟角色卡一樣（07dgl DGL_ICO） */
const GRW_ROWS=[["tal","🌌","天賦"],["r","🔴","體力"],["x","🔵","靈力"],["atk","⚔️","攻擊力"],["def","🛡️","防禦力"],["sk","📜","技能"]];
const grwNum=v=>typeof v==="number"&&isFinite(v);
/* a＝上次給玩家看過的快照、b＝現在 → {rows:[{k,ic,nm,a,b,d}], lv:升到第幾級（沒升＝0）} */
function grwDiff(a,b){const R={rows:[],lv:0};if(!a||!b||a.v!==GRW_V||b.v!==GRW_V)return R;const same=!!a.c&&a.c===b.c;
  for(const[k,ic,nm]of GRW_ROWS){const x=a[k],y=b[k];if(!grwNum(x)||!grwNum(y))continue;if(k==="r"&&a.sid!==b.sid)continue;if(k!=="r"&&k!=="x"&&!same)continue;
    const d=Math.round((y-x)*100)/100;if(d)R.rows.push({k,ic,nm,a:x,b:y,d})}
  if(grwNum(a.lv)&&grwNum(b.lv)&&b.lv>a.lv)R.lv=b.lv;return R}
const grwSign=d=>(d>0?"+":"−")+Math.abs(d);
/* 結果視窗裡那一塊；什麼都沒變＝空字串（不插）。數字跟中文分開放（07i18n 逐節點翻） */
function grwHtml(D){if(!D||(!(D.rows||[]).length&&!D.lv))return"";
  return`<div class="grw" role="status" aria-label="角色成長">${D.lv?`<p class="grw-lv"><span aria-hidden="true">✨</span> 修為升到 Lv ${D.lv}！</p>`:""}${D.rows.map((r,i)=>`<div class="grw-l ${r.d>0?"up":"dn"}" style="--i:${i}"><i aria-hidden="true">${r.ic}</i><span class="grw-nm">${r.nm}</span><span class="grw-v">${r.a} → <b data-a="${r.a}" data-b="${r.b}">${r.b}</b></span><em>（${grwSign(r.d)}）</em><span class="grw-ar" aria-hidden="true">${r.d>0?"▲":"▼"}</span></div>`).join("")}</div>`}
/* 開 App 時：沒有快照＝記現在的；有快照但不是這次開 App 記的＝只把體力換成現在的（體力不存檔） */
function grwBootOf(o,n){if(!o||o.v!==GRW_V)return n;if(o.sid===n.sid)return o;const z=Object.assign({},o,{sid:n.sid});if(grwNum(n.r))z.r=n.r;else delete z.r;return z}
/* 11/17 測試員 B（B-8）：A1 結果視窗寫「修為升到 Lv 2！」，其實是新手練習時升的（新手練習沒有結果視窗，快照還停在練習前）。
   「修為升到 Lv N！」只算這一盤升的：grwArm（08b 結算一開始、發這盤修為之前）記下當時的等級 pre；o＝上次給玩家看過的快照。
   六項數值照舊跟上次的快照比（兩盤之間點的天賦、練的等級照樣在下一盤告訴玩家「a → b」），只有升級那句改用 pre 當起點 */
function grwBase(o,p){if(!o||o.v!==GRW_V||!grwNum(p))return o;return Object.assign({},o,{lv:p})}
/* #GRW-PURE-END */

const GRW={arm:0,k:"",sid:Date.now().toString(36)+Math.random().toString(36).slice(2,7)};
const grwRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
function grwLoad(){let o=null;try{o=store.get("grw",null)}catch(e){}return o&&typeof o==="object"&&o.v===GRW_V?o:null}
function grwSave(o){try{store.set("grw",o)}catch(e){}}
/* 現在的六項（照角色卡的算法；黑洞模組沒載入、沒選角色＝攻擊、防禦、天賦、技能不記） */
function grwNow(){const o={v:GRW_V,sid:GRW.sid,at:Date.now(),c:"",lv:1};
  try{o.c=typeof dglName==="function"?dglName()||"":""}catch(e){}
  try{o.lv=xpInfo().L}catch(e){}
  /* 11/16 開發者「先直接拿掉人間的體力靈力設定」（07dgl DGL_HUMAN）、角色卡改成卡冊四條：有黑洞新規則時六項照卡冊算（陪你走那一位 ptyLook、照他自己的等級；
     體力、攻擊力、防禦力＝07sg2 SG2.unit，靈力＝SG2G.spMaxOf，招式＝已學會幾招，天賦＝sg2TalCount）；GRW_V 換 2，舊快照（舊塔防的數字）不拿來比 */
  if(typeof SG2!=="undefined"&&typeof SG2G!=="undefined"){try{const c=typeof ptyLook==="function"?ptyLook()||o.c:o.c,pc=SG2G.PC_OF[c];o.c=c;if(pc){const L=typeof ptyLv==="function"?ptyLv(c):o.lv,u=SG2.unit(pc,L,1);
    o.r=u.hp;o.x=SG2G.spMaxOf(L);o.atk=u.atk;o.def=u.def;try{if(typeof ptySkPool==="function")o.sk=ptySkPool(c).filter(s=>s.lv<=L).length}catch(e){}try{if(typeof sg2TalCount==="function")o.tal=sg2TalCount()}catch(e){}}}catch(e){}return o}
  try{if(typeof dglLive==="function"&&dglLive()&&typeof DGL!=="undefined"&&DGL.s)o.r=dglShow(DGL.s.r)}catch(e){}
  try{if(typeof dglXm==="function")o.x=dglXm()}catch(e){}
  try{const c=o.c;if(typeof BHTD!=="undefined"&&BHTD.CH&&BHTD.CH[c]){const S=BHTD.stats(c,o.lv);o.atk=BHTD.atkPt(S.atk);o.def=BHTD.defPt(S.def);
    if(typeof bhtdTal==="function"){o.sk=BHTD.SK.filter(s=>s.ch===S.ck&&s.lv<=o.lv).length;try{o.tal=((bhtdDust()||{}).t||[]).length}catch(e){}}}}catch(e){}
  return o}
/* 對局結束時呼叫（08b 結算、07bhw 車輪戰）：接下來第一個結果視窗插成長那一塊 */
function grwArm(k){if(!GRW_ON)return;GRW.arm=Date.now();GRW.k=String(k||"");GRW.pre=null;try{GRW.pre=xpInfo().L}catch(e){}}   /* 11/17 B-8：記下發這盤修為之前的等級（grwBase） */
const grwArmed=()=>!!GRW.arm&&Date.now()-GRW.arm<GRW_TTL;
function grwCss(){try{if(typeof document==="undefined"||document.getElementById("grwCss"))return;const s=document.createElement("style");s.id="grwCss";s.textContent=`
.grw{width:100%;max-width:300px;box-sizing:border-box;margin:8px auto 2px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;font-size:14.5px;line-height:1.7;text-align:left}
.grw-lv{margin:0 0 2px;text-align:center;font-weight:900;color:#2e8b57;animation:grwPop .5s ease both}
.grw-l{display:flex;align-items:baseline;gap:6px;animation:grwIn .35s ease both;animation-delay:calc(var(--i,0)*.12s)}
.grw-l>i{flex:0 0 1.35em;font-style:normal;text-align:center}.grw-nm{flex:1;min-width:0}
.grw-v{white-space:nowrap;font-variant-numeric:tabular-nums}.grw-v b{display:inline-block}.grw-v b.pop{animation:grwPop .4s ease}
.grw-l em{font-style:normal;white-space:nowrap;font-weight:800}.grw-ar{flex:none;font-size:12px}
.grw-l.up em,.grw-l.up .grw-ar{color:#2e8b57}.grw-l.dn em,.grw-l.dn .grw-ar{color:var(--muted)}.grw-l.up .grw-ar{display:inline-block;animation:grwUp .5s ease-in-out .5s 2}
@keyframes grwIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes grwPop{50%{transform:scale(1.25)}}@keyframes grwUp{50%{transform:translateY(-4px)}}
@media (prefers-reduced-motion:reduce){.grw,.grw *{animation:none!important;transition:none!important}}`;document.head.append(s)}catch(e){}}
/* 數字從舊值跳到新值（減少動態＝不跳，回傳 false） */
function grwAnim(box){if(grwRM()||typeof requestAnimationFrame!=="function"||!box)return false;const L=[...box.querySelectorAll(".grw-v b[data-a]")];if(!L.length)return false;
  const T0=typeof performance!=="undefined"?performance.now():Date.now();
  L.forEach((b,i)=>{const a=+b.dataset.a,z=+b.dataset.b,t0=T0+250+i*120;b.textContent=String(a);
    const step=t=>{if(!b.isConnected)return;const p=Math.max(0,Math.min(1,(t-t0)/GRW_MS)),e=1-Math.pow(1-p,3);b.textContent=String(Math.round(a+(z-a)*e));
      if(p<1)requestAnimationFrame(step);else{b.textContent=String(z);b.classList.add("pop")}};requestAnimationFrame(step)});return true}
/* 結果視窗出來了：比快照 → 有變化就插在按鈕上面 → 更新快照 */
function grwShow(m){GRW.arm=0;const now=grwNow(),old=grwLoad(),pre=GRW.pre;GRW.pre=null;grwSave(now);if(!old||!m||!m.querySelector)return"";
  const h=grwHtml(grwDiff(grwBase(old,pre),now));if(!h)return"";grwCss();const mb=m.querySelector(".mb");if(mb)mb.insertAdjacentHTML("beforebegin",h);else{const bx=m.querySelector(".box");if(bx)bx.insertAdjacentHTML("beforeend",h)}
  try{grwAnim(m.querySelector(".grw"))}catch(e){}return h}
/* 包一層 00-util modal：GRW_TTL 內第一個結果視窗（cls 有 res）插成長那一塊；殺棋動畫延後的視窗（回傳 null）等真的畫出來那一次 */
if(GRW_ON&&typeof modal==="function"){const f0=modal;modal=function(html,buttons,cls){const m=f0.apply(this,arguments);try{if(m&&grwArmed()&&/(^|\s)res(\s|$)/.test(String(cls||"")))grwShow(m)}catch(e){}return m}}
function grwBoot(){try{if(!GRW_ON)return;const n=grwNow(),o=grwLoad(),z=grwBootOf(o,n);if(z!==o)grwSave(z)}catch(e){}}
if(typeof window!=="undefined"&&typeof document!=="undefined")setTimeout(grwBoot,1500);
