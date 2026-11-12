/* ================= 🎁 景點掉寶（開發者 11/8）=================
   渡口的朝代景點（07f-ship.js PORT_SIGHT，portSight）和各朝驛站的史實小牌（07m-yizhan.js YZ_SIGHT，yzSight）點了以後呼叫 relicSightDrop(kind,era,name)：
   kind＝"p" 渡口景點、"y" 驛站小牌；era＝朝代鍵；name＝景點名字。回傳 Promise：true＝撿到新珍品（呼叫的地方就不再跳介紹），false＝照舊看介紹。
   規則：
   1. 同一個景點同一天只抽一次（store "relicSight"＝{d:日期,k:{"p|qin|烽火台":1,…}}），不管中沒中都記下；同一天再點就直接看介紹，免得狂點刷寶。
   2. 抽中機率 RLD_P＝5%。
   3. 中了再抽等級，沿用 relics.json 原有的 rarity（每朝 普通 6、稀有 3、傳說 1）：普通 65％、稀有 28％、傳說 7％（RLD_TIER）。
   4. 景點緣分：RLD_LINK 列出跟這個景點有關的珍品（可以跨朝，例如雷峰塔→五代吳越的純銀阿育王塔）；中了以後有 35％（RLD_LINK_P）先從這些還沒收的裡挑（照等級權重 65:28:7），
      所以在〈曲水〉比別處容易撿到〈蘭亭集序〉、在〈站赤〉容易撿到〈聖旨金牌〉。
   5. 其他情況：從這一朝、抽到的等級裡挑還沒收的；這個等級收齊了，改從這一朝其他還沒收的挑（照等級權重）；這一朝 10 件都收齊才算「重複」。
   6. 重複：不加新貨幣，換成修為（普通 15、稀有 40、傳說 100，RLD_DUP_XP；addXP 的 key 一天一個景點一次）；開箱照播，蓋「重複」印，收下後照舊看景點介紹。
   7. 開箱用 07i-codex.js 的 relicFx；relicFx0 依等級加 class rfx-common／rfx-rare／rfx-legend（重複多 rfx-dup），框色、光芒、光環的樣式在這裡的 rdCss。
      收下後跳詳細（等級、說明、藏局），多一顆「看景點介紹」。
   8. 珍品冊（07-legend.js relicBook）：收到的格子右上角蓋等級小印（稀、傳；普通不蓋），冊頂一行框色說明（rdBookTop／rdBookBind）。
      開發者模式多一個「景點必中」測試選單（store relicDropForce：""／any／common／rare／legend；只有開發者模式有效，也不受每天一次限制，指定等級時那一級收齊就直接算重複）。
   開關 RELIC_DROP_ON；false 時照舊走 relicDrop(era,.15)（舊規則：15%、兩次隔 2 分鐘、只掉沒收的），等級印、開箱框色也都不顯示。
   只動單機的珍品收藏和修為，不碰線上對戰。 */
const RELIC_DROP_ON=true,RLD_P=.05,RLD_LINK_P=.35,RLD_TIER={common:65,rare:28,legend:7},RLD_DUP_XP={common:15,rare:40,legend:100},RLD_SEAL={rare:"稀",legend:"傳"};
/* 景點緣分表（"朝代|景點名"：[珍品 id]）；id 開頭就是珍品所屬朝代。沒列的景點就只從那一朝的珍品裡抽。
   史學顧問 11/8 核對後的緣分理由（措辭照顧問）：
   秦直道→銅車馬：始皇的車駕曾走直道（不說就是那輛靈車）；烽火台→杜虎符：銘文「燔隧之事，雖毋會符，行殹」；車同軌→銅車馬、秦簡《行書律》、秦詔版。
   漢烽燧／玉門關／懸泉置→銅奔馬（馬踏飛燕，甘肅武威出土）。赤壁→羽扇：一般認為蘇軾〈念奴嬌〉「羽扇綸巾」寫的是周瑜；青龍偃月刀是演義傳說，不掛赤壁。
   江上傳書→走馬樓吳簡：孫吳官府文書，內容多為賦稅、戶籍，不是軍情書信。竹林→阮咸琴（樂器名到唐代才因阮咸得名）、酒樽、麈尾；曲水、亭→蘭亭集序、快雪時晴帖（真跡失傳，現存唐摹本）。
   棲霞山、南朝佛寺→青瓷蓮花尊（北魏鎏金銅佛是北朝器物，不掛）。水驛→趙州橋：同一時代的工程（不在運河邊）。西市→唐三彩馬、五弦琵琶（現藏日本奈良正倉院）、開元通寶。
   戰火→錢鏐鐵券：唐末（唐昭宗乾寧四年，897）所賜。宋站沒有碼頭、市集類景點，清明上河圖不掛（不掛元宵花燈）。 */
const RLD_LINK={
  "qin|萬里長城":["qin_crossbow"],"qin|烽火台":["qin_hufu"],"qin|秦直道":["qin_chariot"],"qin|車同軌":["qin_chariot","qin_bamboo","qin_zhaoban"],
  "han|漢代烽燧":["han_flyinghorse"],"han|玉門關":["han_flyinghorse"],"han|烽燧與懸泉置":["han_flyinghorse"],
  "sanguo|赤壁":["sanguo_fan"],"sanguo|北岸營寨":["sanguo_blade"],"sanguo|江上傳書":["sanguo_wujian"],
  "weijin|竹林":["weijin_ruan","weijin_jiuzun","weijin_zhuwei"],"weijin|曲水":["weijin_lanting","weijin_kuaixue"],"weijin|亭與耳杯":["weijin_lanting","weijin_jiuzun"],
  "nanbei|棲霞山千佛崖":["nanbei_lotuszun"],"nanbei|山寺佛塔":["nanbei_lotuszun"],"nanbei|長江":["nanbei_bixie"],
  "sui|隋煬帝的龍舟":["sui_canalboat"],"sui|大運河":["sui_canalboat"],"sui|水驛":["sui_canalboat","sui_zhaozhou"],
  "tang|長安城門":["tang_yufu"],"tang|西市":["tang_sancai","tang_pipa","tang_kaiyuan"],
  "wudai|遠方的戰火":["wudai_spear","wudai_tiequan"],"wudai|荒村":["wudai_zhouyuan"],
  "song|雷峰塔":["wudai_ayuwang"],"song|元宵花燈":["song_cuju"],
  "yuan|蒙古包":["yuan_nasij","yuan_bow"],"yuan|站赤":["yuan_paizi","yuan_baochao"],
  "qing|瘦西湖":["qing_qianlong"]};
const rdEraOf=id=>String(id).split("_")[0];
function rdForce(){try{return typeof DEVMODE==="function"&&DEVMODE()?String(store.get("relicDropForce","")||""):""}catch(e){return""}}
function rdRollTier(){const r=Math.random()*100;return r<RLD_TIER.legend?"legend":r<RLD_TIER.legend+RLD_TIER.rare?"rare":"common"}
function rdPickW(L){const w=x=>RLD_TIER[x.it.rarity]||10,tot=L.reduce((a,x)=>a+w(x),0);let r=Math.random()*tot;for(const x of L){r-=w(x);if(r<=0)return x}return L[L.length-1]}
function rdIntro(kind,era,name){let t="";try{if(kind==="y"&&typeof YZ_SIGHT!=="undefined"&&YZ_SIGHT[era])t=YZ_SIGHT[era][1];else if(typeof PORT_SIGHT!=="undefined"){const s=(PORT_SIGHT[era]||[]).find(z=>z[0]===name);if(s)t=s[3]}}catch(e){}
  sheet("📍 "+name,b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(kind==="y"&&typeof innName==="function"?innName(era):eraLabel(era))}</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(t)}</p>`})}
async function relicSightDrop(kind,era,name){
  if(!RELIC_DROP_ON)return typeof relicDrop==="function"?relicDrop(era,.15):false;
  const F=rdForce(),FT=RLD_TIER[F]?F:"",day=localDay(),key=kind+"|"+era+"|"+name;let S=store.get("relicSight",{})||{};if(S.d!==day||!S.k)S={d:day,k:{}};
  if(!F){if(S.k[key])return false;S.k[key]=1;store.set("relicSight",S);if(Math.random()>=RLD_P)return false}
  const R=await relicsData(),L=R[era];if(!Array.isArray(L)||!L.length)return false;
  const mine=relicsMine(),own=(e,id)=>(mine[e]||[]).includes(id),A=x=>({e:era,it:x}),tier=FT||rdRollTier();let pick=null,dup=false;
  if(!FT){const lk=(RLD_LINK[era+"|"+name]||[]).map(id=>{const e=rdEraOf(id),it=(R[e]||[]).find(z=>z.id===id);return it&&!own(e,id)?{e,it}:null}).filter(Boolean);if(lk.length&&Math.random()<RLD_LINK_P)pick=rdPickW(lk)}
  if(!pick){const T=L.filter(x=>x.rarity===tier),t0=T.filter(x=>!own(era,x.id));
    if(t0.length)pick=A(t0[Math.floor(Math.random()*t0.length)]);
    else if(!FT){const a0=L.filter(x=>!own(era,x.id));if(a0.length)pick=rdPickW(a0.map(A))}
    if(!pick){const P=T.length?T:L;pick=A(P[Math.floor(Math.random()*P.length)]);dup=true}}
  const e=pick.e,it=pick.it,N=(R[e]||[]).length,en=relicEra(e);vibrate(dup?[15,30,15]:[15,30,15,30,40]);
  if(dup){const xp=RLD_DUP_XP[it.rarity]||15;
    if(typeof relicFx==="function")await relicFx(e,it,{from:`在〈${name}〉又撿到一件${en}的珍品`,cnt:`已經收藏過了・化為修為 +${xp}`,dup:1});
    if(typeof addXP==="function")addXP(xp,"珍品重複",F?null:"rdup:"+day+":"+key);return false}
  mine[e]=(mine[e]||[]).concat(it.id);store.set("relics",mine);store.set("relicAt",Date.now());
  const n=mine[e].length,[rk,rc]=RELIC_RK[it.rarity]||RELIC_RK.common;
  const show=()=>sheet("🏺 撿到一件"+en+"的珍品！",b=>{b.innerHTML=`<div style="text-align:center"><div style="width:180px;height:180px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:90px;border-radius:18px;border:3px solid ${rc}">${relicImg(e,it.id)}</div>
    <div style="display:inline-block;padding:2px 10px;border-radius:999px;color:#fff;background:${rc};font-size:12px;font-weight:700">${rk}・${esc(en)}</div><h3 style="margin:6px 0 4px;font-family:var(--serif)">${esc(it.name)}</h3></div>
    <p style="line-height:1.8;margin:0 0 8px;font-size:15.5px">${esc(it.desc||"")}</p><p class="muted" style="font-size:13px;text-align:center">${esc(en)}的珍品：${n}／${N}・放在「我的角色 → 🏺 珍品」</p>${relicCjHTML(it)}
    <button class="btn ghost" id="rdIntro" style="width:100%;margin-bottom:8px">📍 看〈${esc(name)}〉的介紹</button><button class="btn${it.cj?" ghost":""}" id="rlOk" style="width:100%">收下</button>`;
    b.querySelector("#rlOk").onclick=()=>closeSheet();b.querySelector("#rdIntro").onclick=()=>rdIntro(kind,era,name);relicCjBind(b)});
  if(typeof relicFx==="function")relicFx(e,it,{from:`在〈${name}〉撿到一件${en}的珍品`,cnt:`${en}的珍品 ${n}／${N}`}).then(show);else show();return true}
/* 珍品冊：等級小印、冊頂說明、開發者的必中選單 */
const rdMark=r=>RELIC_DROP_ON&&RLD_SEAL[r]?`<span class="rd-seal rd-${r}">${RLD_SEAL[r]}</span>`:"";
function rdBookTop(){if(!RELIC_DROP_ON)return"";const K=(typeof RELIC_RK!=="undefined"&&RELIC_RK)||{},F=rdForce(),dev=typeof DEVMODE==="function"&&DEVMODE();
  const RD_HOW={common:"常見",rare:"少見",legend:"很難得"};const key=["common","rare","legend"].map(r=>K[r]?`<span class="rd-k"><i class="rd-tile" style="border-color:${K[r][1]}">🏺${RLD_SEAL[r]?`<span class="rd-seal rd-${r}">${RLD_SEAL[r]}</span>`:""}</i><span><b style="color:${K[r][1]}">${esc(K[r][0])}</b><small>${RD_HOW[r]}</small></span></span>`:"").join("");   /* 回饋 836（開發者 11/9「看不太懂這邊的分類」）：原本的小方框像勾選框；改成跟冊子裡一樣的小格子（框色＋右上角的稀、傳印），旁邊寫等級和有多難找到 */
  return`<div class="rd-key muted"><div class="rd-kt">珍品格子的外框顏色，代表它有多難找到：</div>${key}</div>${dev?`<label class="rd-dev muted">🛠 景點必中（開發者）<select id="rdForce">${[["","關"],["any","必中・隨機等級"],["common","必中・普通"],["rare","必中・稀有"],["legend","必中・傳說"]].map(([v,t])=>`<option value="${v}"${v===F?" selected":""}>${t}</option>`).join("")}</select></label>`:""}`}
function rdBookBind(b){const s=b.querySelector("#rdForce");if(s)s.onchange=()=>{store.set("relicDropForce",s.value);toast(s.value?"渡口、驛站景點：下一次點必中":"景點必中已關")}}
function rdCss(){if(!RELIC_DROP_ON||document.getElementById("rdCss"))return;const s=document.createElement("style");s.id="rdCss";s.textContent=`
.rd-seal{position:absolute;right:2px;top:2px;width:17px;height:17px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid;font:900 10px/1 var(--serif);background:rgba(255,255,255,.92);pointer-events:none}
.rd-seal.rd-rare{color:#2F6FB5;border-color:#2F6FB5}.rd-seal.rd-legend{color:#fff;background:#C8962E;border-color:#8A6414;box-shadow:0 0 6px rgba(255,212,90,.9)}
.rd-seal.st{position:static;display:inline-flex;margin-left:3px;vertical-align:-3px}
.rd-key{font-size:12.5px;margin:0 0 8px;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center}.rd-k{display:inline-flex;align-items:center;gap:4px}.rd-kt{flex-basis:100%}.rd-k i.rd-tile{margin-right:6px;position:relative;width:30px;height:30px;border-radius:8px;border:2.5px solid;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-style:normal;background:var(--card);flex:none}.rd-k i.rd-tile .rd-seal{right:-6px;top:-6px;width:15px;height:15px;font-size:9px}.rd-k>span{display:flex;flex-direction:column;line-height:1.2}.rd-k b{font-size:13px}.rd-k small{font-size:11px}
.rd-dev{display:flex;align-items:center;gap:6px;font-size:12.5px;margin:0 0 6px}.rd-dev select{font:inherit;padding:2px 4px}
.rfx.rfx-common .rfx-it{border:2px solid rgba(232,200,135,.5);border-radius:18px}
.rfx.rfx-common .rfx-ray{-webkit-mask:radial-gradient(circle,#000 0 10%,transparent 48%);mask:radial-gradient(circle,#000 0 10%,transparent 48%)}
.rfx.rfx-rare .rfx-it{border:3px solid #7FB2F0;border-radius:20px;background:radial-gradient(circle,rgba(127,178,240,.25),rgba(20,40,90,.25) 70%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22),0 0 26px rgba(127,178,240,.6)}
.rfx.rfx-rare{background:radial-gradient(circle at 50% 42%,rgba(18,40,80,.95),rgba(0,0,0,.97) 70%)}
.rfx.rfx-legend{background:radial-gradient(circle at 50% 42%,rgba(110,62,6,.96),rgba(0,0,0,.97) 72%)}
.rfx.rfx-legend .rfx-it{border:5px double #FFD45A;border-radius:22px;background:radial-gradient(circle,rgba(255,212,90,.32),rgba(90,45,0,.3) 70%);box-shadow:0 0 30px rgba(255,212,90,.85),0 0 64px rgba(255,150,40,.45)}
.rfx.rfx-legend .rfx-ray{width:720px;height:720px;margin:-360px 0 0 -360px;background:repeating-conic-gradient(from 0deg,#FFD45A 0 6deg,transparent 6deg 11deg,#FF9F43 11deg 14deg,transparent 14deg 20deg)}
.rfx.rfx-legend .rfx-st::before{content:"";position:absolute;left:50%;top:46%;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;border:3px solid #FFD45A;opacity:0;animation:rdRing 1.5s .85s ease-out infinite;pointer-events:none}
.rfx.rfx-legend .rfx-nm{font-size:31px;letter-spacing:2px}.rfx.rm.rfx-legend .rfx-st::before{animation:none;opacity:.5}
.rfx.rfx-dup .rfx-st::after{content:"重複";position:absolute;right:6px;top:18px;z-index:3;padding:5px 8px;border:3px solid #E74C3C;border-radius:8px;color:#E74C3C;font:900 22px/1 var(--serif);background:rgba(255,248,240,.9);opacity:0;transform:rotate(-14deg);animation:rdStamp .35s 1.5s ease-out forwards;pointer-events:none}
.rfx.end.rfx-dup .rfx-st::after{opacity:1;animation:none}.rfx.rfx-dup .rfx-ct{color:#FFB4A8;opacity:1;font-weight:700}
@keyframes rdRing{0%{opacity:.9;transform:scale(.5)}to{opacity:0;transform:scale(1.8)}}
@keyframes rdStamp{0%{opacity:0;transform:rotate(-14deg) scale(2.2)}to{opacity:1;transform:rotate(-14deg) scale(1)}}`;document.head.append(s)}
try{rdCss()}catch(e){}
