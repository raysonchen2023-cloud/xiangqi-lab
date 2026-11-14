/* ---------- 開發者測試台（開發者 11/12「能讓開發者先測試所有功能嗎，包含黑洞篇」）：前綴 dvt ----------
   只在開發者模式出現（設定 → 進階 → 🧪 開發者測試台）。不用等 10% 機率、每天第一盤、星槎站數，直接玩到黑洞篇和十三星系；
   開關都存在 store（dvt 開頭），按「重設黑洞篇進度」會一起清掉。一般玩家看不到、也不受影響（每個開關都再檢查 DEVMODE()）。 */
const dvtOn=()=>typeof DEVMODE==="function"&&DEVMODE();
const DVT_KEYS=["bhCount","bhWin","bhAdj","bhMark","bhOrbHit","bhBackSay","bhOrbG","bhOrbDay","bhRet","gxSeal","gxSeen","gxRun","gxDone","dvtOrb","dvtGxAll","bhtl","dvtTaixu","dvtTaixu2"];
function dvtHere(){try{return typeof shipAt==="function"&&shipAt()||store.get("era","classic")||"tang"}catch(e){return"tang"}}
function dvtForce(on){try{if(on)localStorage.setItem("xq_bhForce","1");else localStorage.removeItem("xq_bhForce")}catch(e){}}
function dvtForced(){try{return localStorage.getItem("xq_bhForce")==="1"}catch(e){return false}}
function dvtSheet(){if(!dvtOn())return toast("要先打開開發者模式");
  sheet("🧪 開發者測試台",b=>{const orb=store.get("dvtOrb",null),all=!!store.get("dvtGxAll",0),S=typeof gxSeals==="function"?gxSeals():{};
    const row=(id,ic,t,d)=>`<button class="item" id="${id}"><span class="lb">${ic}</span><span class="tx"><b>${esc(t)}</b><span>${esc(d)}</span></span><span class="muted">›</span></button>`;
    const pill=(k,l)=>`<button class="pill${orb===k?" on":""}" data-orb="${k}" style="margin:2px">${esc(l)}</button>`;
    b.innerHTML=`<p class="muted" style="margin:0 0 8px">只有開發者看得到。不計分；要恢復一般狀態按最下面「重設黑洞篇進度」。</p>
      <div class="sec-t">🌀 黑洞</div><div class="items" style="padding:0">
        ${row("dvA","🌀","馬上掉進黑洞","跳出偏航視窗（接受→七星星盤對局；先回航線→什麼都不發生）")}
        ${row("dvB","♟","直接開星樞星盤對局","跳過視窗，直接進黑洞巨盤（難度＝實力＋1）")}
        ${row("dvC",dvtForced()?"✅":"⛵","起航必定偏航："+(dvtForced()?"開":"關"),"打開後每次星槎起航、換朝代都掉進黑洞（測完記得關）")}
      </div>
      <div class="sec-t">👑 太虛星尊魔法 3D（試接）</div><div class="card"><p class="muted" style="margin:0 0 6px">先開一盤黑洞局、用 3D 巨盤，再按招式：黑將換成太虛星尊、放一招給你看。只播特效，棋子不會真的被拿掉，也不扣元氣、不鎖子（App 還沒有魔王關的玩法）。</p>
        ${["meteor","lock","river"].map(k=>`<button class="pill" data-tx="${k}" style="margin:2px">${esc((typeof BHFX_K!=="undefined"&&BHFX_K[k])||k)}</button>`).join("")}
        <button class="pill${store.get("dvtTaixu2",0)?" on":""}" id="dvT2" style="margin:2px">第二階段（範圍變大）：${store.get("dvtTaixu2",0)?"開":"關"}</button>
        <button class="pill${store.get("dvtTaixu",0)?" on":""}" id="dvT1" style="margin:2px">魔王在場：${store.get("dvtTaixu",0)?"開":"關"}</button></div>
      <div class="sec-t">🔮 幻影棋客頭上</div><div class="card"><p class="muted" style="margin:0 0 6px">下一盤「挑戰電腦」對手頭上固定出現（不用等第 6 盤、第 12 手、每天第一盤）：</p>
        ${pill("ball","有裂痕的小黑洞")}${pill("gate","星門（13 點星光）")}${pill("dust","星塵圈")}${pill("","照一般規則")}</div>
      <div class="sec-t">🌌 幻譜星門・十三星系</div><div class="items" style="padding:0">
        ${row("dvD",all?"✅":"🔓","全部星系解鎖："+(all?"開":"關"),"不用先去黑洞、不用依序打贏、不用星槎站數；第十四顆也打得開")}
        ${row("dvE","🌌","打開星圖","跟從星門、星槎入口打開的同一張")}
      </div>
      <div class="card" style="margin-top:6px"><p class="muted" style="margin:0 0 6px">直接開一關（需要先打開「全部星系解鎖」）：</p><div id="dvG"></div></div>
      <div class="items" style="padding:0;margin-top:6px">
        ${row("dvF","⭐","九枚星印全拿","星圖全亮、北辰後的第十四顆出現")}
        ${row("dvH","🀄","預覽車輪戰開場（10 盤）","只播開場動畫，不開對局")}
        ${row("dvR","🧹","重設黑洞篇進度","清掉黑洞次數、輸贏、小黑洞、星印、星系進度和上面這些開關")}
      </div>
      <div class="sec-t">📈 實機量測</div><div class="items" style="padding:0">
        ${row("dvP",store.get("perfHud",false)?"✅":"📈","效能浮標："+(store.get("perfHud",false)?"開":"關"),"右上角顯示幀數、10 秒最低幀數、3D 省電模式、記憶體、時鐘（錄影對照用；不擋點選）")}
      </div>`;
    const G=b.querySelector("#dvG");if(G&&typeof GX_ORD!=="undefined"){G.innerHTML=GX_ORD.concat(["mirror"]).map(id=>{const g=id==="mirror"?{n:"第十四顆"}:gxGet(id)||{};return`<button class="pill" data-gx="${id}" style="margin:2px">${S[id]?"⭐":""}${esc(g.n||g.t||id)}</button>`}).join("")}
    const q=s=>b.querySelector(s),re=()=>{closeSheet();setTimeout(dvtSheet,250)};
    q("#dvA").onclick=()=>{closeSheet();if(typeof bhOffer==="function")bhOffer(dvtHere(),()=>toast("先回航線（測試）"),false)};
    q("#dvB").onclick=()=>{closeSheet();if(typeof bhStart==="function")bhStart(dvtHere(),false)};
    b.querySelectorAll("[data-tx]").forEach(x=>x.onclick=()=>{closeSheet();if(typeof bhfxTry==="function")setTimeout(()=>bhfxTry(x.dataset.tx),300)});   /* 11/14 太虛星尊魔法 3D（07bhf-bossfx.js） */
    q("#dvT2").onclick=()=>{store.set("dvtTaixu2",store.get("dvtTaixu2",0)?0:1);re()};
    q("#dvT1").onclick=()=>{const on=!store.get("dvtTaixu",0);store.set("dvtTaixu",on?1:0);toast(on?"👑 魔王在場：開（黑洞局的黑將換成太虛星尊）":"👑 魔王在場：關");re()};
    q("#dvC").onclick=()=>{dvtForce(!dvtForced());toast(dvtForced()?"⛵ 起航必定偏航：開":"⛵ 起航必定偏航：關");re()};
    b.querySelectorAll("[data-orb]").forEach(x=>x.onclick=()=>{const k=x.dataset.orb||null;store.set("dvtOrb",k);toast(k?"下一盤挑戰電腦，幻影棋客頭上會出現："+x.textContent:"照一般規則");re()});
    q("#dvD").onclick=()=>{store.set("dvtGxAll",all?0:1);toast(all?"全部星系解鎖：關":"全部星系解鎖：開");re()};
    q("#dvE").onclick=()=>{closeSheet();if(typeof gxMap==="function")gxMap({})};
    b.querySelectorAll("[data-gx]").forEach(x=>x.onclick=()=>{if(!store.get("dvtGxAll",0))return toast("先打開「全部星系解鎖」");closeSheet();if(typeof gxStart==="function")gxStart(x.dataset.gx)});
    q("#dvF").onclick=()=>{if(typeof GX_ORD==="undefined")return;const S2={};for(const k of GX_ORD)S2[k]=Date.now();store.set("gxSeal",S2);toast("⭐ 九枚星印都拿到了");re()};
    q("#dvH").onclick=()=>{closeSheet();if(typeof simIntro==="function"&&typeof parseFen==="function")setTimeout(()=>simIntro({id:"dvt-demo",n:10,tb:Array.from({length:10},()=>({board:parseFen(START)}))},()=>{}),300)};
    q("#dvP").onclick=()=>{const on=typeof phudToggle==="function"&&phudToggle();toast(on?"📈 效能浮標：開":"📈 效能浮標：關");re()};   /* 第 9 輪 Gemini：效能浮標（07dw-perfhud.js） */
    q("#dvR").onclick=()=>confirmBox("清掉黑洞篇和十三星系的全部進度？（只影響這支手機）",()=>{for(const k of DVT_KEYS)store.set(k,null);dvtForce(false);toast("🧹 黑洞篇進度清掉了");re()},"清掉")})}
