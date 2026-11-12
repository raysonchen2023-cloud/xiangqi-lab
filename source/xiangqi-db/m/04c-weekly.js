/* 家長學習週報（Gemini 遊玩樂趣評估，開發者 11/8 核准）：#/weekly，入口在「我的成長」最上面和設定的「角色」分頁
   只用手機裡「有日期」的紀錄，算最近 7 天（今天往回 6 天，從 0 點起）：
   - 殘局：store "cj".solved[題號].at。一盞茶、星槎千秋殘局、珍品藏局、古法殘局、輿圖、消寒圖都走同一個解題頁（07c-canju.js finish），都記在這裡；
     at＝最後一次解開的時間；看了答案（a:1）不算「解開」
   - 殺法：解開的殘局在題庫（canju-set.json）裡的 kill；以前沒有解過同一種殺法的＝「新學會」
   - 測驗：quizLog[].at、a（每題 [難度,對錯,…]）；猜著法：guessLog[].at、n 猜了幾步、m 猜中幾步
   - 對局：棋譜庫 /db/items 的 play（挑戰電腦、擂台、園子、故事都存在這裡）和 pvp（線上），id 是開局時間；勝負照 result
   - 棋話：shipLearn {站: 學會的時間}；主題訓練：themeStat[主題].at（最後一次練的時間）
   - 擂主：xq_arenaStamps[朝代].at（第一次打贏）；古戰場：battleSeal[朝代][戰役id].at（第一次打下來；意見回饋 767 起照 id 記）
   - 讀懂地圖：跟「我的成長」同一套算法（readTheta／readCalc），每天記一筆在 wkRead（存檔清單有它），跟 7～13 天前那筆比；沒有就跟 rdLog 的上個月比
   - 遊玩時間：useDay（05-settings.js useTick，11/8 起才有）；專心練習：practiceMin（對局、測驗、猜著法、錯棋重練的畫面開著而且有操作）
   沒有日期、不算進「本週」：新手訓練營的星數、石桌往事讀到第幾回、攔路棋客（evLog 只記遇到的時間，不分輸贏）、修為（只有總數）。
   圖卡用 canvas 畫（直式，寬 1080），「存成圖片」轉 PNG：手機能分享檔案就開分享選單（iPhone 可以「儲存影像」），不能就下載；都不行就請用手機截圖。
   canvas 只畫同網站的圖（角色預覽），才轉得成 PNG（跨網站的圖會讓瀏覽器拒絕匯出）。長按存圖被 00-util.js 擋掉，所以一定要用按鈕。 */
const WK_DAY=864e5,WK_KILL=["車殺","馬殺","炮殺","小兵擒王","雙將","雙車錯","馬後炮","重炮","掛角馬","臥槽馬","困斃"];
const WK_F='"Noto Serif TC","Songti TC","SimSun",serif',WK_S='"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif';
const wkKey=t=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const wkMD=t=>{const d=new Date(t);return`${d.getMonth()+1}/${d.getDate()}（${"日一二三四五六"[d.getDay()]}）`};
function wkRange(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-6);const t0=d.getTime(),ks=[];for(let i=0;i<7;i++){const x=new Date(t0);x.setDate(x.getDate()+i);ks.push(wkKey(x))}return{t0,t1:Date.now(),ks}}
function weeklyEntryHTML(){return`<a class="card row" href="#/weekly" style="gap:10px;align-items:center;margin:6px 0 10px;color:inherit;text-decoration:none;border:2px solid color-mix(in srgb,var(--accent) 45%,var(--line))"><span style="font-size:26px">👨‍👩‍👧</span><span style="flex:1;min-width:0"><b>本週學習週報</b><br><span class="muted" style="font-size:13px">最近 7 天解了幾題、學會什麼，可以存成圖片給家長看</span></span><span class="muted" style="font-size:20px">›</span></a>`}

/* ---------- 讀資料 ---------- */
async function wkRead(){try{if(typeof readTheta!=="function"||typeof readCalc!=="function"||typeof readIdx!=="function")return null;
  let G=null;try{const S=await skillRows();G=S.G.filter(g=>g.n>=8&&rowAcc(g)!=null&&!g.hu)}catch(e){}   /* 跟 talentReport 傳給 readMap 的那批一樣 */
  const T=readTheta(G);if(!T)return null;const I=await readIdx();if(!I||!I.gm||!I.gm.games||!I.gm.games.length)return null;
  /* 數學修正 11/11（審查 12）：noise＝θ 動一個標準誤時讀懂比例會動幾個百分點的一半（|gmPct(θ+se)−gmPct(θ−se)|/2）；跟上週的差距不到它就當「差不多」（測驗一次 θ 就可能動 0.3，差距大多是測量雜訊） */
  const C=readCalc(I,T.th,G),now=Math.round(C.gmPct(T.th)*100),noise=Math.abs(C.gmPct(T.th+T.se)-C.gmPct(T.th-T.se))*50;if(!isFinite(now))return null;const wide=!(T.se<=.6),today=wkKey(Date.now()),L=store.get("wkRead",null)||{};L.d=L.d||{};
  if(!wide){L.d[today]=now;const ks=Object.keys(L.d).sort();while(ks.length>60)delete L.d[ks.shift()];store.set("wkRead",L)}   /* 資料還少（我的成長畫虛線）的時候不記，跟 rdLog 每月那筆同一個規矩 */
  const lo=wkKey(Date.now()-13*WK_DAY),hi=wkKey(Date.now()-7*WK_DAY),pk=Object.keys(L.d).filter(k=>k>=lo&&k<=hi&&isFinite(L.d[k])).sort().pop();let d=null,vs="";
  /* ChatGPT 數值盤查 11/11（週報比較基準）：回退到 rdLog 的月份快照時，取的是「比這個月早的最後一個月」，不一定是上個月（十一月可能只有八月的快照）；
     vs 改寫實際快照的年月：真的是上個月才叫「上個月」，否則寫「8 月」、跨年寫「2025 年 8 月」 */
  if(pk!=null){d=now-L.d[pk];vs="上週"}else{try{const M=rdLog().m||{},mk=today.slice(0,7),pm=Object.keys(M).filter(k=>k<mk).sort().pop();if(pm&&Array.isArray(M[pm])&&isFinite(M[pm][0])){d=now-M[pm][0];
    const y=+mk.slice(0,4),mo=+mk.slice(5,7),prev=mo>1?y+"-"+String(mo-1).padStart(2,"0"):(y-1)+"-12",py=+pm.slice(0,4),pmo=+pm.slice(5,7);vs=pm===prev?"上個月":py===y?" "+pmo+" 月":" "+py+" 年 "+pmo+" 月"}}catch(e){}}
  const sig=d!=null&&Math.abs(d)>=Math.max(1,noise);return{now,wide,d,vs,noise:Math.round(noise*10)/10,sig}}catch(e){return null}}   /* sig＝差距超過正常起伏才算真的有變 */
async function wkData(o){const{t0,t1,ks}=o&&o.t0?o:wkRange(),inW=t=>t>=t0&&t<=t1,days=new Set(),day=t=>days.add(wkKey(t)),R={t0,t1};
  /* 殘局、殺法 */
  const S=store.get("cj",null)||{},SV=S.solved||{},cjW=Object.entries(SV).filter(([,x])=>x&&inW(x.at)&&!x.a);
  R.cj=cjW.length;R.cjP=cjW.filter(([,x])=>x.p).length;cjW.forEach(([,x])=>day(x.at));R.kills=[];R.nextKill=null;
  try{const D=await cjData(),kOf=id=>(D.byId[id]||{}).kill||"",wk={},old=new Set();
    for(const[id,x]of Object.entries(SV)){if(!x||x.a)continue;const k=kOf(id);if(!k)continue;if(inW(x.at))wk[k]=(wk[k]||0)+1;else old.add(k)}
    R.kills=Object.entries(wk).sort((a,b)=>b[1]-a[1]).map(([k,n])=>({k,n,nu:!old.has(k)}));const ever=new Set([...old,...Object.keys(wk)]);R.nextKill=WK_KILL.find(k=>!ever.has(k))||null}catch(e){}
  /* 測驗、猜著法 */
  const QL=(store.get("quizLog",[])||[]).filter(q=>q&&inW(q.at));R.qz=QL.reduce((a,q)=>a+(q.a||[]).length,0);R.qzOk=QL.reduce((a,q)=>a+(q.a||[]).filter(x=>x&&x[1]).length,0);QL.forEach(q=>day(q.at));
  /* ChatGPT 數值盤查 11/11（猜大師著法的分母）：「猜了幾步」改用實猜步數（04-stats.js gsTried：不含看答案；舊存檔從 h 回算），猜中幾步照舊 */
  const GL=(store.get("guessLog",[])||[]).filter(q=>q&&inW(q.at)&&q.n>0);R.gs=GL.length;R.gsN=GL.reduce((a,q)=>a+(typeof gsTried==="function"?gsTried(q):(q.n||0)),0);R.gsHit=GL.reduce((a,q)=>a+(q.m||0),0);GL.forEach(q=>day(q.at));
  /* 對局（中途取消、斷線中止的不算） */
  R.g={w:0,l:0,d:0,n:0};
  for(const c of["play","pvp"]){let d=null;try{d=await api("/db/items?c="+c+"&limit=300")}catch(e){continue}
    for(const it of(d&&d.items)||[]){const t=tlTime(it.id);if(!inW(t))continue;const side=c==="play"?(it.red==="你"?"r":"b"):pvpMySide(it);if(!side)continue;
      const r=String(it.result||""),w=/^紅/.test(r)&&/勝|胜/.test(r)?"r":/^黑/.test(r)&&/勝|胜/.test(r)?"b":null;if(!r||(!w&&/中止|取消/.test(r)))continue;
      R.g.n++;if(!w)R.g.d++;else if(w===side)R.g.w++;else R.g.l++;day(t)}}
  /* 棋話、主題訓練 */
  const SL=store.get("shipLearn",{})||{};R.lessons=Object.entries(SL).filter(([,t])=>inW(+t)).sort((a,b)=>a[1]-b[1]).map(([k,t])=>{day(+t);const L=typeof SHIP_LESSON!=="undefined"&&SHIP_LESSON[k];return{k,t:L&&L.t||"",era:k==="classic"?"星槎船艙":eraLabel(k)}}).filter(x=>x.t);
  const TS=store.get("themeStat",{})||{};R.themes=Object.entries(TS).filter(([,x])=>x&&inW(x.at)).map(([k])=>k);
  /* 擂主、古戰場 */
  const AS=typeof arenaStamps==="function"?arenaStamps():{};R.arena=Object.entries(AS).filter(([,x])=>x&&inW(Date.parse(x.at))).map(([k])=>({k,n:(typeof ARENA!=="undefined"&&ARENA[k]||{}).name||"",era:k==="classic"?"星槎船艙":eraLabel(k)}));
  /* 意見回饋 767：battleSeal 改照戰役 id 記（{朝代:{戰役id:印}}）；還沒搬家的舊存檔是第幾張，照舊表換成「朝代_(第幾張+1)」 */
  const BS=store.get("battleSeal",{})||{},bw=[];for(const[k,E]of Object.entries(BS))for(const[q,x]of Object.entries(E||{}))if(x&&inW(x.at))bw.push([k,/^[0-9]+$/.test(q)?k+"_"+(+q+1):q]);R.battles=[];
  if(bw.length){let B=null;try{B=await fetch(typeof BTL_FILE!=="undefined"?BTL_FILE:"data/canju/battles.json").then(r=>r.ok?r.json():null)}catch(e){}R.battles=bw.map(([k,id])=>{const b=B&&B.eras&&(B.eras[k]||[]).find(c=>c&&c.id===id);return b&&b.name||"一場古戰役"})}
  /* 千秋印（07i2-seal.js）：這週亮了幾邊、鑄成幾方金印（舊存檔換算時補發的不算） */
  try{R.seal=typeof sealWeek==="function"?sealWeek(inW):null}catch(e){R.seal=null}
  /* 時間 */
  const UD=store.get("useDay",null)||{},PM=store.get("practiceMin",{})||{};let use=0,pm=0;
  for(const k of ks){if(UD[k]){use+=UD[k];if(UD[k]>=3e5)days.add(k)}if(PM[k]){pm+=PM[k];if(PM[k]>=1)days.add(k)}}
  const uk=Object.keys(UD).sort();R.use=uk.length?Math.round(use/6e4):null;R.useFrom=uk.length&&uk[0]>ks[0]?uk[0]:null;R.pm=Math.round(pm);
  R.daily=ks.map(k=>[k,Math.round((UD[k]||0)/6e4)]);   /* 回饋 843（開發者 11/9 選：護眼提醒＋家長時段）：本週每天玩了幾分鐘（圖卡「每天玩了多久」那一行） */
  R.days=days.size;R.read=o&&o.noRead?null:await wkRead();return R}   /* 回饋 843：o＝{t0,t1,ks,noRead}，07m5-family.js 的收尾畫面用它只算今天、不算讀懂地圖 */

/* ---------- 一句溫暖的總結（照資料組句子，不呼叫任何文字 API） ---------- */
function wkSum(R,nk){const nu=R.kills.find(x=>x.nu),learn=nu?nu.k:R.lessons.length?R.lessons[R.lessons.length-1].t:R.themes[0]||"",did=R.cj+R.qz+R.gs+R.g.n;
  if(!did&&!R.lessons.length&&!R.arena.length&&!R.battles.length)return`這週${nk}在休息。每天花 10 分鐘解一題「今日茶單」，就是很好的開始！`;
  const a=[];if(learn)a.push(`這週學會了「${learn}」`);else if(R.cj)a.push(`這週解開了 ${R.cj} 題殘局`);else if(R.g.n)a.push(`這週下了 ${R.g.n} 盤棋`);else a.push("這週有動腦練習");
  if(R.days>=5)a.push("幾乎天天都有練習，很有恆心");else if(R.arena.length)a.push(`還打敗了擂主${R.arena[0].n}`);else if(R.g.w>=3)a.push(`還贏了 ${R.g.w} 盤`);else if(R.cjP>=3)a.push(`其中 ${R.cjP} 題一次就完美解開`);
  const nx=R.nextKill&&R.nextKill!==learn?`下週可以試試「${R.nextKill}」`:R.read&&R.read.d>0&&R.read.sig?`看得懂的大師棋又多了 ${R.read.d} 個百分點，下週繼續保持`:"下週繼續一起下棋吧";
  return a.join("，")+"。"+nx+"！"}

/* ---------- 畫圖卡 ---------- */
function wkRR(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function wkWrap(c,s,w){const out=[];let ln="";for(const ch of Array.from(String(s))){const t=ln+ch;if(c.measureText(t).width>w&&ln){if(/[，。、！？：；」』）%]/.test(ch)){out.push(t);ln="";continue}out.push(ln);ln=ch}else ln=t}if(ln)out.push(ln);return out}   /* 標點不放在行首 */
function wkRender(c,R,M,H){const W=1080,P=78,ink="#2A1F15",mut="#6F5F4C",red="#9E1B15",cardC="#FFF8EC",lineC="#D8C8B0",TW=W-P*2;
  c.textBaseline="alphabetic";c.fillStyle="#F3ECDD";c.fillRect(0,0,W,H);
  /* 上方兩層淡墨遠山 */
  for(const[a,pts]of[[.13,[0,330,170,190,300,260,420,200,560,130,680,250,820,170,940,120,1010,200,1080,160]],[.08,[0,250,120,170,240,210,360,120,520,200,660,110,800,180,960,90,1080,140,1080,140]]]){const g=c.createLinearGradient(0,0,0,360);g.addColorStop(0,`rgba(70,55,40,${a})`);g.addColorStop(1,"rgba(70,55,40,0)");c.fillStyle=g;
    c.beginPath();c.moveTo(0,0);c.lineTo(pts[0],pts[1]);for(let i=2;i+3<pts.length;i+=4)c.quadraticCurveTo(pts[i],pts[i+1],pts[i+2],pts[i+3]);c.lineTo(W,0);c.closePath();c.fill()}
  c.strokeStyle="rgba(42,31,21,.6)";c.lineWidth=5;wkRR(c,26,26,W-52,H-52,30);c.stroke();c.lineWidth=1.5;c.strokeStyle="rgba(42,31,21,.35)";wkRR(c,40,40,W-80,H-80,22);c.stroke();
  /* 朱印「千秋」 */
  {const s=118,x=W-P-s,y=78;c.save();c.translate(x+s/2,y+s/2);c.rotate(-.05);c.fillStyle="#B3261E";wkRR(c,-s/2,-s/2,s,s,14);c.fill();c.strokeStyle="#F3ECDD";c.lineWidth=4;wkRR(c,-s/2+9,-s/2+9,s-18,s-18,8);c.stroke();
    c.fillStyle="#FBF3E4";c.font=`900 44px ${WK_F}`;c.textAlign="center";c.fillText("千",0,-6);c.fillText("秋",0,42);c.restore();c.textAlign="left"}
  let y=118;c.fillStyle=red;c.font=`700 30px ${WK_S}`;c.fillText("象棋千秋・學習週報",P,y);
  const ix=M.img?P+156:P;if(M.img){const ih=196,iw=Math.round(ih*(M.img.naturalWidth||3)/(M.img.naturalHeight||4));try{c.drawImage(M.img,P-6,y+14,iw,ih)}catch(e){}}
  c.fillStyle=ink;c.font=`900 66px ${WK_F}`;const nmL=wkWrap(c,M.nm,W-P-150-ix);c.fillText(nmL[0]||"",ix,y+100);
  c.font=`700 38px ${WK_F}`;c.fillStyle=ink;c.fillText("這一週的棋路",ix,y+156);c.font=`500 30px ${WK_S}`;c.fillStyle=mut;c.fillText(`${wkMD(R.t0)} ～ ${wkMD(R.t1)}`,ix,y+204);
  if(M.sub){c.font=`500 26px ${WK_S}`;c.fillText(M.sub,ix,y+244)}
  y=390;
  /* 四格大數字 */
  const tw=(TW-32)/2,th=250,T=[["🧩","解題",R.cj+R.qz,"題",[R.cj?`殘局 ${R.cj} 題`:"",R.qz?`測驗 ${R.qz} 題`:"",R.gs?`猜著法 ${R.gs} 盤`:""].filter(Boolean).join("・")||"這週還沒解題"],
    ["♟","下棋",R.g.n,"盤",R.g.n?`贏 ${R.g.w}・輸 ${R.g.l}・和 ${R.g.d}`:"這週還沒下棋"],
    ["⏱","遊玩",R.use==null?"—":R.use,"分鐘",R.use==null?"從今天開始記錄":R.pm?`其中專心下棋、做題 ${R.pm} 分`:R.useFrom?`${+R.useFrom.slice(5,7)}/${+R.useFrom.slice(8)} 起才開始記`:"App 畫面開著的時間"],
    ["📅","有練習",R.days,"天",`最近 7 天裡有 ${R.days} 天`]];
  T.forEach(([ic,lb,n,u,sb],i)=>{const x=P+(i%2)*(tw+32),yy=y+(i>>1)*(th+28);c.fillStyle=cardC;wkRR(c,x,yy,tw,th,22);c.fill();c.strokeStyle=lineC;c.lineWidth=2;c.stroke();
    c.font=`48px ${WK_S}`;c.fillStyle=ink;c.fillText(ic,x+28,yy+72);c.font=`700 34px ${WK_S}`;c.fillText(lb,x+96,yy+66);
    c.font=`900 108px ${WK_F}`;c.fillStyle=red;const ns=String(n);c.fillText(ns,x+28,yy+184);const nw=c.measureText(ns).width;c.font=`700 34px ${WK_S}`;c.fillStyle=ink;c.fillText(u,x+40+nw,yy+184);
    c.font=`500 25px ${WK_S}`;c.fillStyle=mut;const sl=wkWrap(c,sb,tw-52);c.fillText(sl[0]||"",x+28,yy+228)});
  y+=th*2+28+70;
  const sec=t=>{c.fillStyle=red;wkRR(c,P,y-34,10,42,5);c.fill();c.fillStyle=ink;c.font=`900 40px ${WK_F}`;c.fillText(t,P+26,y);y+=26},
    item=(ic,s)=>{c.font=`500 32px ${WK_S}`;const L=wkWrap(c,s,TW-70);L.forEach((ln,j)=>{y+=48;if(!j){c.font=`32px ${WK_S}`;c.fillStyle=ink;c.fillText(ic,P+6,y);c.font=`500 32px ${WK_S}`}c.fillStyle=ink;c.fillText(ln,P+60,y)});y+=8},
    gap=()=>{y+=58};
  sec("這週學會的");{let k=0;
    for(const x of R.lessons){item("📜",`棋話〈${x.t}〉（${x.era}）`);k++}
    if(R.kills.length){item("⚔",`殺法：${R.kills.slice(0,5).map(x=>x.k+(x.nu?"（新學會）":"")).join("、")}`);k++}
    if(R.themes.length){item("🎯",`主題訓練：${R.themes.join("、")}`);k++}
    if(R.gs){item("👀",`猜大師的著法：猜了 ${R.gsN} 步，猜中 ${R.gsHit} 步`);k++}
    if(!k)item("🌱","這週還沒有新學到的棋理，慢慢來就好。")}
  gap();sec("打敗的對手");{let k=0;
    for(const x of R.arena){item("🏯",`擂主「${x.n}」（${x.era}擂台）`);k++}
    if(R.battles.length){item("🏹",`古戰場：${R.battles.slice(0,4).join("、")}${R.battles.length>4?` 等 ${R.battles.length} 場`:""}`);k++}
    if(R.seal&&(R.seal.n||R.seal.g)){item("🏮",`千秋印：亮了 ${R.seal.n} 邊${R.seal.g?`，鑄成 ${R.seal.g} 方金印`:""}`);k++}
    if(R.g.w){item("♟",`下棋一共贏了 ${R.g.w} 盤`);k++}
    if(!k)item("🌱","這週還沒有打敗對手，下次去擂台試試看！")}
  gap();sec("看得懂大師的棋");
  if(R.read){y+=58;c.font=`900 56px ${WK_F}`;c.fillStyle=red;const s1=`約 ${R.read.now}%`;c.fillText(s1,P+6,y);const w1=c.measureText(s1).width;
    if(R.read.d!=null){c.font=`700 30px ${WK_S}`;c.fillStyle=R.read.d>0&&R.read.sig?"#2E7D32":mut;c.fillText(!R.read.sig?`跟${R.read.vs}差不多`:R.read.d>0?`比${R.read.vs}多 ${R.read.d} 個百分點`:`比${R.read.vs}少 ${-R.read.d} 個百分點`,P+30+w1,y-6)}   /* 數學修正 11/11：差距在正常起伏內寫「差不多」；ChatGPT 數值盤查 11/11：兩個百分比相減是「百分點」（50%→55% 寫「多 5 個百分點」，不寫 +5%） */
    y+=26;c.fillStyle="#E4D6BF";wkRR(c,P+6,y,TW-12,20,10);c.fill();c.fillStyle=red;wkRR(c,P+6,y,Math.max(20,(TW-12)*Math.min(100,R.read.now)/100),20,10);c.fill();y+=20;
    item("📚",`三萬多盤特級大師對局裡，大約 ${R.read.now}% 看得懂最關鍵的那一手${R.read.wide?"（資料還少，先參考）":""}`)}
  else item("📚","做一次棋力測驗（大約 3 分鐘），就能算出看得懂幾成大師的棋。");
  /* 回饋 843（開發者 11/9 選：護眼提醒＋家長時段）：本週每天玩了幾分鐘（useDay），家長設了每天上限就畫一條虛線 */
  if(R.daily&&R.use!=null){gap();sec("每天玩了幾分鐘");const D=R.daily,lim=typeof fmCfg==="function"?fmCfg().lim:0,mx=Math.max(30,lim,...D.map(x=>x[1])),cw=TW/7,bh=120;y+=64;
    D.forEach(([k,m],i)=>{const x=P+i*cw,h=Math.max(4,m?bh*m/mx:0),dd=new Date(k+"T12:00:00");c.fillStyle=m?red:"#E4D6BF";wkRR(c,x+cw*.26,y+bh-h,cw*.48,h,6);c.fill();
      c.textAlign="center";c.font=`700 26px ${WK_S}`;c.fillStyle=ink;c.fillText(String(m),x+cw/2,y+bh-h-12);c.font=`500 25px ${WK_S}`;c.fillStyle=mut;c.fillText("日一二三四五六"[dd.getDay()],x+cw/2,y+bh+34)});c.textAlign="left";
    if(lim>0){const ly=y+bh-bh*lim/mx;c.save();c.setLineDash([10,8]);c.strokeStyle="rgba(42,31,21,.45)";c.lineWidth=2;c.beginPath();c.moveTo(P,ly);c.lineTo(P+TW,ly);c.stroke();c.restore()}
    y+=bh+44;item("⏱",`這週一共玩了 ${R.use} 分鐘${lim?`；虛線＝家長設定的每天最多 ${lim} 分鐘`:""}（App 畫面開著的時間）`)}
  /* 總結 */
  y+=56;c.font=`700 38px ${WK_F}`;const SL=wkWrap(c,M.sum,TW-96),bh=SL.length*58+60;c.fillStyle=cardC;wkRR(c,P,y,TW,bh,22);c.fill();c.strokeStyle=lineC;c.lineWidth=2;c.stroke();c.fillStyle=red;wkRR(c,P,y,12,bh,6);c.fill();
  c.fillStyle=ink;SL.forEach((ln,j)=>c.fillText(ln,P+52,y+72+j*58));y+=bh+64;
  c.font=`500 24px ${WK_S}`;c.fillStyle=mut;c.textAlign="center";c.fillText(`資料來自這支手機的紀錄・${wkMD(Date.now())}整理`,W/2,y);c.textAlign="left";
  return y+70}
async function wkCanvas(R,M){try{if(document.fonts&&document.fonts.load)await Promise.race([Promise.all([document.fonts.load(`900 66px ${WK_F}`),document.fonts.load(`500 30px ${WK_S}`)]),new Promise(r=>setTimeout(r,1500))])}catch(e){}
  const cv=document.createElement("canvas");cv.width=1080;cv.height=3200;const H=wkRender(cv.getContext("2d"),R,M,3200);cv.height=Math.ceil(H);wkRender(cv.getContext("2d"),R,M,cv.height);return cv}
function wkImg(src){return new Promise(ok=>{if(!src)return ok(null);const i=new Image();let d=false;const end=v=>{if(!d){d=true;ok(v)}};i.onload=()=>end(i.naturalWidth?i:null);i.onerror=()=>end(null);setTimeout(()=>end(null),3000);i.src=src})}

/* ---------- 存成圖片 ---------- */
async function wkSave(cv){const blob=await new Promise(r=>{try{cv.toBlob(r,"image/png")}catch(e){r(null)}});if(!blob)return wkShot(cv);const fn=`象棋千秋學習週報_${wkKey(Date.now())}.png`;
  try{const f=new File([blob],fn,{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[f]})&&/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)){await navigator.share({files:[f],title:"象棋千秋學習週報"});return}}catch(e){if(e&&e.name==="AbortError")return}
  try{const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=fn;a.style.display="none";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);toast("📷 圖片存好了（在「下載」資料夾）")}catch(e){wkShot(cv)}}
function wkShot(){toast("這個瀏覽器不能直接存圖，請用手機截圖",4000)}

/* ---------- 頁面 ---------- */
function Weekly(v){setTop("👨‍👩‍👧 學習週報","#/stats");if(typeof setTabs==="function")setTabs(false);
  v.innerHTML=`<div class="pad" style="padding-bottom:28px"><div id="wkBox" style="text-align:center"><div class="card muted" style="text-align:center;padding:28px 12px">正在整理這一週的紀錄…</div></div>
    <div class="row" style="gap:8px;margin:12px auto 0;max-width:460px"><button class="btn" id="wkSave" style="flex:1;min-height:50px;font-size:17px" disabled>📷 存成圖片</button></div>
    <p class="muted" id="wkNote" style="font-size:12.5px;line-height:1.7;max-width:460px;margin:10px auto 0"></p></div>`;
  const box=v.querySelector("#wkBox"),btn=v.querySelector("#wkSave"),note=v.querySelector("#wkNote");
  (async()=>{const R=await wkData();if(!v.isConnected)return;const c=myChar(),C=c&&WX_CHARS[c],nm=myName()||meName(),nk=C?C.nk||C.n:nm;let lv=0;try{lv=xpInfo().L|0}catch(e){}
    const M={nm,sub:[C?`角色：${C.pc}・${C.n}`:"",lv?`修為 Lv ${lv}`:""].filter(Boolean).join("　"),img:C?await wkImg(`data/xs/prev_${c}.webp`):null,sum:wkSum(R,nk)};
    const cv=await wkCanvas(R,M);if(!v.isConnected)return;cv.setAttribute("role","img");cv.setAttribute("aria-label",`${nm}的學習週報：解題 ${R.cj+R.qz} 題、下棋 ${R.g.n} 盤、有練習 ${R.days} 天。${M.sum}`);
    cv.style.cssText="display:block;width:100%;max-width:460px;height:auto;margin:0 auto;border-radius:14px;box-shadow:0 6px 22px rgba(60,40,20,.22)";box.innerHTML="";box.append(cv);
    btn.disabled=false;btn.onclick=()=>{vibrate(8);wkSave(cv)};
    note.innerHTML=`📌 怎麼算的：只算最近 7 天手機裡<b>有記日期</b>的紀錄（殘局、測驗、猜著法、對局、棋話、擂台、古戰場）。新手訓練營、石桌往事讀到第幾回、攔路棋客沒有記日期，不算進來。${R.use==null||R.useFrom?"遊玩時間從 11 月 8 日的版本起才開始記，前幾週會比實際少。":""}看了答案的殘局不算「解開」。`})()
    .catch(e=>{if(v.isConnected)box.innerHTML=`<div class="card muted">⚠ 週報整理失敗：${esc(e&&e.message||e)}</div>`});
  return{}}
