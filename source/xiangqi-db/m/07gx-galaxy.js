/* ================= 幻譜星門・十三星系（開發者 11/12，story/115、117 的「開發者決定」；前綴 gx） =================
   入口：① 戰勝過黑洞的人，挑戰電腦時幻影棋客頭上的小黑洞變成「星門」（07bh bhOrbKind 回 "gate"，park3d 畫張開的黑洞＋中心小棋盤＋外圍 13 點星光），點了開星圖；
         ② 從黑洞回來以後，星槎圖上多一顆「🌌 幻譜星門」熱點（gxShipHs）。
   星圖：data/park/galaxy_map.webp（Gemini 畫、Claude 修掉圖上的字），13 個星名由程式標。第一波開放現有引擎能下的 9 個星系，另外 4 個顯示「星軌未通」。
   每個星系用石桌往事的對局（jStart("gx:"+id)），從自訂局面開（local.js lv.fen／lv.remove）；特殊勝利條件（撐過幾步、奪子、連贏）由這裡判（gxTick、gxSettle）。
   解鎖：第一次從黑洞回來開第 1 個（紫淵），贏一位開下一位；第 4、7、9 位分別要星槎停靠過 3、6、9 站。贏了留一枚星印（store gxSeal），之後挑戰電腦時幻影棋客偶爾提起。
   九個全破：星圖中央出現無名空軌——「第十四顆」＝鏡像的自己：你執黑，電腦執紅、先照你自己最常贏的開局走前兩步，再交給引擎。 */
const GX_LIST=[
  {id:"ziyuan",n:"紫淵",t:"紫淵・破軍幻影",c:"#9B5CFF",rule:"重炮陣：他的兩個象換成炮，一共四門炮",goal:"將死他",say:"這般殺陣，我已演練過萬次。",seal:"紫淵的炮火，你還記得嗎？",fen:"rncakacnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR",p:[17.9,20.9,18.5,31.3]},
  {id:"taisu",n:"太素",t:"太素・無生幻影",c:"#E8EEF8",rule:"生存戰：撐過 40 步不輸",goal:"你走滿 40 步沒輸，或將死他",say:"守得此局，便是守住輪迴。",seal:"太素的霧，還在你的棋裡。",survive:40,p:[33.8,15.7,33.8,24.6]},
  {id:"tianyuan",n:"天垣",t:"天垣・奪衡幻影",c:"#F2C14E",rule:"奪子計：先吃掉他 3 顆車、馬、炮",goal:"先吃掉他 3 顆車馬炮，或將死他；他先吃掉你 3 顆車馬炮就算輸",say:"得失之間，皆是早定之數。",seal:"天垣記得你吃過的每一顆子。",grab:3,p:[50.8,15.7,51,25.1]},
  {id:"yaoguang",n:"搖光",t:"搖光・萬炮幻影",c:"#FF4A2E",rule:"全炮局：他的車、馬全換成炮，一共六門炮",goal:"將死他",say:"炮聲再起時，昨日又重現。",seal:"搖光的炮聲，偶爾還會回來。",fen:"ccbakabcc/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR",p:[40.2,39.1,40.4,45.1]},
  {id:"kaiyang",n:"開陽",t:"開陽・八駿幻影",c:"#FFD9A0",c2:"#2A3A8A",rule:"八駿圖：他沒有車、炮，卒全換成馬，一共八匹馬",goal:"將死他",say:"八面威風，亦走不出這方寸。",seal:"開陽的馬蹄聲，我算過。",fen:"1nbakabn1/9/1n7/n1n1n1n1n/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR",p:[59.6,30.6,62.1,38.5]},
  {id:"yuxiu",n:"玉宿",t:"玉宿・殘星幻影",c:"#3FD08A",rule:"殘星局：連解 3 個殘局",goal:"三個殘局都要贏（輸一盤就從第一局重來）",say:"萬物走到盡頭，皆是這步棋。",seal:"玉宿的殘局，你解得比我快。",canju:3,p:[70.4,38.8,72.9,46.3]},
  {id:"quanxing",n:"權星",t:"權星・讓命幻影",c:"#9AA3AE",rule:"讓子局：他讓你雙車，但用第 18 級全力",goal:"將死他",say:"讓你雙車，結局亦無更改。",seal:"權星讓過的車，後來都回來了。",remove:["a9","i9"],lx:18,p:[61.7,48.1,63.3,55.5]},
  {id:"jiyue",n:"璣月",t:"璣月・暗流幻影",c:"#4D7CFF",rule:"暗流局：他的棋子藏在霧裡",off:1,p:[59.3,63.4,59.3,70.1]},
  {id:"xuanbing",n:"璇冰",t:"璇冰・界淵幻影",c:"#9FE6FF",rule:"楚河界：河界會結冰",off:1,p:[66.3,72.1,66.7,80.1]},
  {id:"shuchen",n:"樞塵",t:"樞塵・卒王幻影",c:"#D9B26A",rule:"過河卒：卒過河後可以橫衝",off:1,p:[36.5,75.4,36.5,83.6]},
  {id:"gouchen",n:"勾陳",t:"勾陳・亂序幻影",c:"#7A2BB5",rule:"亂陣局：雙方的車、馬、炮位置一起打亂（兩邊一樣）",goal:"將死他",say:"偏門左道？不過是另一條舊路。",seal:"勾陳打亂的陣，你排回來了。",shuffle:1,p:[51.3,83.3,51.3,92.4]},
  {id:"tengshe",n:"騰蛇",t:"騰蛇・陷星幻影",c:"#2E9E5B",rule:"陷阱局：棋盤上藏著陷阱",off:1,p:[42.9,62.7,42.8,69.6]},
  {id:"beichen",n:"北辰",t:"北辰・不滅幻影",c:"#F7D774",c2:"#05040A",rule:"不滅局：要將死他兩次——第一次只破了星核，他會帶著全新的一軍、強一級重來",goal:"連贏兩盤",say:"十三億次推演，你終於來了。",seal:"北辰的星核，還在跳。",twice:1,p:[49.8,48.5,50.4,61.6]}];
const GX_ORD=["ziyuan","taisu","tianyuan","yaoguang","kaiyang","yuxiu","quanxing","gouchen","beichen"],GX_DOCK={3:3,6:6,8:9};
const GX_TXT={gate:"裂痕剝落，十三點微光在深淵中重組。",invite:"這門，我好像替你開過。",open:"十三點星光，排成未完棋譜。",pick:"選一顆吧，別選我算過的。",go:"落子入門",stay:"先走此局",enter:"星槎折返，卻抵達更遠處。",win:"這一敗，竟不在舊譜。",lose:"無妨，你會回到這步。",all:"第十四顆，尚未落子。",ship:"黑洞歸來，星槎多了一道無名星門。",mirror:"這一局，是你自己算出來的。"};
const gxGet=id=>GX_LIST.find(g=>g.id===id)||null;
const gxIs=st=>!!st&&String(st.journey||"").startsWith("gx:");
/* 開發者 11/12 選「三檔自選＋實測校正」（story/128：Gemini、ChatGPT 規劃，模型照 ChatGPT）：
   電腦級數＝玩家實力 P（bhLevel）＋規則修正 R＋模式修正 M（輕鬆 −2／標準 0／挑戰 +2），夾在 1～18；北辰第二盤再 +1；權星固定 18（他的身分就是讓雙車的全力 AI）。
   R 先用 ChatGPT 的表（四炮少象、生存戰偏易；八馬、亂陣、陷阱偏難），之後用電腦自我對弈量勝率再調。星印分銀（輕鬆）／星（標準）／金（挑戰），取最高。
   輸了：結果視窗給一句這一關的訣竅；連輸 3 次以上多一顆「改用輕鬆再來」（不自動偷偷降級，讓玩家自己選） */
const GX_R={ziyuan:-1,taisu:-1,tianyuan:0,yaoguang:0,kaiyang:1,yuxiu:0,gouchen:1,beichen:2,xuanbing:0,shuchen:1,jiyue:1,tengshe:2,mirror:0};
const GX_MODES=[["easy","輕鬆",-2,"銀印"],["std","標準",0,"星印"],["hard","挑戰",2,"金印"]];
const GX_HINT={ziyuan:"四門炮要有炮架才兇：先兌掉中路的子，少給他架炮；他沒有象，底線是弱點。",taisu:"生存戰不用贏：多兌子、少冒險，車守兩翼，撐滿 40 步就算過。",
  tianyuan:"奪子計比的是車馬炮：先把自己的大子連起來互相保護，再找他沒人保護的子。",yaoguang:"六門炮沒有車馬，近身就弱：用馬和兵靠近，同一條線上別放兩顆子讓他架炮。",
  kaiyang:"八匹馬怕被絆腿：用兵和車卡住馬腿要點，別讓馬跳到你的九宮旁邊。",yuxiu:"殘局先算清楚再動：每一步先想對方最兇的回應。",
  quanxing:"你多兩個車：先求穩、多兌子，子力優勢會越換越大。",gouchen:"開局背的都用不上：先把車放出來、兩邊的子連起來，再找進攻。",beichen:"連贏兩盤要穩：第一盤贏了別急，第二盤他會強一級。"};
const gxMode=k=>GX_MODES.find(m=>m[0]===k)||GX_MODES[1];
const gxLx=(g,R,base)=>g.lx?g.lx:Math.max(1,Math.min(18,base+(GX_R[g.id]||0)+gxMode(R.m)[2]+(g.twice&&R.ph===2?1:0)));
const gxSeals=()=>store.get("gxSeal",null)||{};
const gxOpen=()=>(store.get("bhCount",0)||0)>0||(!!store.get("dvtGxAll",0)&&typeof DEVMODE==="function"&&DEVMODE());   /* 開發者測試台「全部星系解鎖」 */
const gxDocked=()=>{try{return typeof shipDocked==="function"?shipDocked().length:0}catch(e){return 0}};
const gxAllDone=()=>GX_ORD.every(k=>gxSeals()[k])||(!!store.get("dvtGxAll",0)&&typeof DEVMODE==="function"&&DEVMODE());
/* 這個星系現在能不能挑戰；不能的話回原因 */
function gxLock(id){const g=gxGet(id);if(!g)return"沒有這個星系";if(g.off)return"星軌未通";if(store.get("dvtGxAll",0)&&typeof DEVMODE==="function"&&DEVMODE())return null;if(!gxOpen())return"還沒去過黑洞";
  const i=GX_ORD.indexOf(id),S=gxSeals();for(let j=0;j<i;j++)if(!S[GX_ORD[j]])return"先打贏「"+gxGet(GX_ORD[j]).t+"」";
  const need=GX_DOCK[i];if(need&&gxDocked()<need)return"星槎要先停靠過 "+need+" 站（現在 "+gxDocked()+" 站）";return null}
/* 外圍 13 點星光：打過的亮起（給 park3d 的星門） */
const gxLit=()=>{const S=gxSeals();return GX_LIST.map(g=>!!S[g.id])};
/* 勾陳亂陣局：雙方的車、馬、炮在 a0、b0、h0、i0、b2、h2 這六格一起打亂（黑方上下對稱同一種排法）；相、仕、帥、兵不動，局面一定合法 */
function gxShuffleFen(rnd){rnd=rnd||Math.random;const P=["r","r","n","n","c","c"];for(let i=P.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[P[i],P[j]]=[P[j],P[i]]}
  const[a,b,h,i,b2,h2]=P,row0=a+b+"bakab"+h+i,row2="1"+b2+"5"+h2+"1";return row0+"/9/"+row2+"/p1p1p1p1p/9/9/P1P1P1P1P/"+row2.toUpperCase()+"/9/"+row0.toUpperCase()}
const gxIccs=i=>"abcdefghi"[i%9]+(9-Math.floor(i/9));
/* 第十四顆：從人機對局紀錄找你執紅贏最多的前兩步（沒有就用中炮、跳馬） */
async function gxMirrorLine(){const D=["h2e2","h0g2"];try{const L=((await api("/db/items?c=play"))||{}).items||[],cnt={};let n=0;
    for(const it of L.slice(-120).reverse()){if(n>=30)break;if(!/^紅勝/.test(String(it.result||"")))continue;if(it.mine&&it.mine!=="r")continue;let g=null;try{g=await api("/db/item?c=play&id="+encodeURIComponent(it.id))}catch(e){continue}
      if(!g||g.mid||g.start)continue;const mv=((g.lines||[])[0]||{}).moves||[];if(mv.length<3)continue;const k=gxIccs(mv[0].f)+gxIccs(mv[0].t)+","+gxIccs(mv[2].f)+gxIccs(mv[2].t);cnt[k]=(cnt[k]||0)+1;n++}
    const b=Object.entries(cnt).sort((x,y)=>y[1]-x[1])[0];return b?b[0].split(","):D}catch(e){return D}}
/* 玉宿：照實力挑 3 個殘局（canju-set 紅先、難度跟級數） */
async function gxCanjuPick(lv){let A=[];try{A=(((await (await fetch("data/canju/canju-set.json")).json())||{}).items||[]).filter(x=>x&&x.side==="r"&&typeof x.fen==="string"&&x.fen.split("/").length===10)}catch(e){}
  if(!A.length)return[];const lo=lv<=6?0:lv<=12?1.8:2.6,hi=lv<=6?2.2:lv<=12?3.4:9,B=A.filter(x=>(+x.d||0)>=lo&&(+x.d||0)<=hi),C=(B.length>=3?B:A).slice();
  const out=[];while(out.length<3&&C.length){const i=Math.floor(Math.random()*C.length);out.push({fen:C[i].fen,t:C[i].t||"殘局",id:C[i].id});C.splice(i,1)}return out}
/* 開一關。run＝這一關的進度（玉宿第幾局、北辰第幾盤） */
async function gxStart(id,again,mode){const g=id==="mirror"?{id:"mirror",n:"第十四顆",t:"第十四顆・鏡像",say:GX_TXT.mirror}:gxGet(id);if(!g)return;
  if(id!=="mirror"){const no=gxLock(id);if(no){toast("🌌 "+no);return}}else if(!gxAllDone()){toast("🌌 九個星系都打完，第十四顆才會出現");return}
  const base=typeof bhLevel==="function"?bhLevel():8;let R=store.get("gxRun",null);if(!R||R.id!==id||!again)R={id,k:0,ph:1};
  if(mode&&GX_MODES.some(m=>m[0]===mode))R.m=mode;if(!R.m)R.m=store.get("gxMode","std");store.set("gxMode",R.m);   /* 三檔：重試沿用同一檔 */
  const b={human:"r",lx:gxLx(g,R,base),journey:"gx:"+id};
  if(g.fen)b.lv={fen:g.fen,turn:"r"};else if(g.remove)b.lv={fen:"",remove:g.remove.slice(),turn:"r"};else if(g.shuffle)b.lv={fen:gxShuffleFen(),turn:"r"};
  else if(g.canju){if(!R.list||!R.list.length||R.k===0)R.list=await gxCanjuPick(b.lx);const it=(R.list||[])[R.k];if(!it){toast("殘局題庫載入失敗，稍後再試");return}b.lv={fen:it.fen,turn:"r"}}
  else if(id==="mirror"){b.human="b";b.lv={fen:"",turn:"r",mirror:await gxMirrorLine()}}
  store.set("gxRun",R);store.set("park3d",true);
  const sub=g.canju?`第 ${R.k+1}／${g.canju} 局`:g.twice?`第 ${R.ph}／2 盤`:"";
  jStart("gx:"+id,b,()=>{location.hash="#/journey/play";setTimeout(()=>toast(`🌌 ${g.t}${sub?"・"+sub:""}：「${g.say}」`),600)},!!again)}
/* 判一盤：回 {ok,fin,next,why}；ok＝這一步過了，fin＝整關過了（給星印），next＝還要接著下 */
function gxJudge(st,forced){const id=String(st.journey||"").slice(3),g=id==="mirror"?{id:"mirror"}:gxGet(id),R=store.get("gxRun",null)||{id,k:0,ph:1};if(!g)return null;
  const me=st.human,res=st.result,won=forced?forced==="win":!!(res&&res.w===me),lost=forced?forced==="lose":!!(res&&res.w&&res.w!==me);
  if(g.survive&&!lost&&(forced==="win"||(res&&!res.w)||won))return{ok:true,fin:true};
  if(g.canju){if(!won)return{ok:false,fin:false,reset:true};return R.k+1>=g.canju?{ok:true,fin:true}:{ok:true,fin:false,next:"k"}}
  if(g.twice){if(!won)return{ok:false,fin:false,reset:true};return R.ph>=2?{ok:true,fin:true}:{ok:true,fin:false,next:"ph"}}
  return won?{ok:true,fin:true}:{ok:false,fin:false}}
/* 結算（同一盤只算一次）：記星印、推進玉宿／北辰的進度 */
function gxSettle(st,forced){const D=store.get("gxDone",null)||{};if(D.id===st.id)return D.r;const r=gxJudge(st,forced);if(!r)return null;
  const id=String(st.journey||"").slice(3),R=store.get("gxRun",null)||{id,k:0,ph:1};
  {const LS=store.get("gxLoss",null)||{};if(!r.ok)LS[id]=(LS[id]||0)+1;else if(r.fin)LS[id]=0;store.set("gxLoss",LS)}   /* 連輸幾次（給提示、建議輕鬆用） */
  if(r.fin){if(id==="mirror")store.set("gxMirror",{at:Date.now()});else{const S=gxSeals(),ti=Math.max(0,GX_MODES.findIndex(m=>m[0]===(R.m||"std")));S[id]={at:Date.now(),n:(S[id]&&S[id].n||0)+1,t:Math.max(S[id]&&S[id].t!=null?S[id].t:-1,ti)};store.set("gxSeal",S)}store.set("gxRun",null)}   /* t＝星印等級 0 銀、1 星、2 金，取最高 */
  else if(r.next==="k"){R.k++;store.set("gxRun",R)}else if(r.next==="ph"){R.ph=2;store.set("gxRun",R)}else if(r.reset){R.k=0;R.ph=1;R.list=null;store.set("gxRun",R)}
  store.set("gxDone",{id:st.id,r});return r}
/* 07-legend journeyGameEnd 叫 */
function gxGameEnd(st){try{gxSettle(st)}catch(e){}}
/* 08b 對局頁每次重畫叫：生存戰撐滿步數、奪子計吃滿 3 顆就直接過關（引擎那盤不用下完） */
let GX_T={id:null,done:false};
function gxTick(st){if(!gxIs(st)||!st.id||st.result)return;if(GX_T.id!==st.id)GX_T={id:st.id,done:false};if(GX_T.done)return;
  const g=gxGet(String(st.journey).slice(3));if(!g)return;const me=st.human,mine=(st.moves||[]).filter(m=>m.by===me).length;let out=null;
  if(g.survive&&mine>=g.survive)out="win";
  if(g.grab){const C=window.XQCore;let b0=null;try{b0=C.parseFen(st.start||C.START)}catch(e){}if(b0){const n=(b,s)=>b.filter(p=>p&&"RNC".includes(p.toUpperCase())&&(s==="r"?p===p.toUpperCase():p===p.toLowerCase())).length,op=me==="r"?"b":"r";
    const took=n(b0,op)-n(st.board,op),lostN=n(b0,me)-n(st.board,me);if(took>=g.grab)out="win";else if(lostN>=g.grab)out="lose"}}
  if(!out)return;GX_T.done=true;
  if(out==="lose"){api("/play/resign").catch(()=>{});return}   /* 他先吃滿：照認輸結束（結果視窗走一般流程） */
  try{if(typeof rsFin==="function")rsFin(st.id)}catch(e){}gxSettle(st,"win");setTimeout(()=>gxResultModal(st,true,false,""),500)}
/* 結果視窗（08b 石桌往事分支叫） */
function gxResultModal(st,win,draw0,XPR){const r=gxSettle(st)||{ok:win},id=String(st.journey||"").slice(3),g=id==="mirror"?{t:"第十四顆・鏡像"}:gxGet(id)||{t:"星系"};
  const all=r.fin&&gxAllDone()&&id!=="mirror",nx=r.ok&&!r.fin?(r.next==="k"?"下一個殘局 ›":"再破一次星核 ›"):null;
  modal(`<div class="em">${r.ok?"✨":"🌌"}</div><h2>${r.fin?"星印到手":r.ok?"這一關還沒完":"星光暗了一下"}</h2><p class="muted">${esc((st.result&&st.result.why)||"")}・🌌 ${esc(g.t)}（不計積分、不扣分）</p>`+
    `<p class="pl-say">✦ ${esc(g.t)}：「${esc(r.ok?GX_TXT.win:GX_TXT.lose)}」</p>`+(all?`<p class="pl-say">✦ 星樞：「${esc(GX_TXT.all)}」</p>`:"")+
    (!r.ok&&GX_HINT[id]?`<p style="line-height:1.7;margin:8px 0 0">💡 ${esc(GX_HINT[id])}</p>`:"")+(r.fin&&id!=="mirror"?`<p class="muted" style="margin:6px 0 0">這次用「${esc(gxMode(store.get("gxMode","std"))[1])}」過關：${esc(gxMode(store.get("gxMode","std"))[3])}</p>`:"")+(XPR||""),
    [nx?[nx,()=>gxStart(id,true)]:r.ok?["🌌 回星圖",()=>gxMap()]:["再挑戰一次",()=>gxStart(id,true)],
     ...(!r.ok&&id!=="mirror"&&((store.get("gxLoss",null)||{})[id]||0)>=3&&store.get("gxMode","std")!=="easy"?[["改用輕鬆再來",()=>gxStart(id,false,"easy"),true]]:[]),   /* 連輸 3 次：讓玩家自己選要不要降一檔（銀印，之後可以再挑戰更高檔） */
     r.ok&&!nx?["回挑戰電腦",()=>{location.hash="#/cpu"},true]:["🌌 回星圖",()=>gxMap(),true]],"res")}
/* 3D 場景參數（08b parkDraw 疊上）：星空背景、星系光暈、主宰的開場白
   開發者 11/12：每個星系有自己的地貌當對戰地面（data/gxground/<星系>.webp，Gemini 畫、無縫可重複；規劃 story/星系地面規劃.md）；第十四顆・鏡像沿用北辰的星空黑鏡水面 */
const gxGround=id=>"data/gxground/"+(id==="mirror"?"beichen":id)+".webp";
function gxParkEx(st){if(!gxIs(st))return null;const id=String(st.journey).slice(3),g=id==="mirror"?{n:"第十四顆",c:"#FFFFFF",say:GX_TXT.mirror}:gxGet(id);if(!g)return null;
  return{bg:"data/park/blackhole_360.webp",ground:gxGround(id),indoor:true,era:"classic",bgName:"🌌 幻譜星門・"+g.n,gx:{c:g.c,c2:g.c2||null},oppHello:g.say,quietMate:true,watchers:[],crowd:null,
    gate:{img:["data/park/galaxy_map.webp"],icon:"🌌",title:g.t||g.n,sub:GX_TXT.enter,bg:"#05060d",quiet:true}}}
/* 一般挑戰電腦：打過的星系，幻影棋客偶爾（每盤四分之一機率）在開場提起 */
function gxHello(st){const S=gxSeals(),ks=Object.keys(S).filter(k=>gxGet(k));if(!ks.length||!st||!st.id)return null;let h=0;for(const c of String(st.id))h=(h*31+c.charCodeAt(0))>>>0;if(h%4)return null;return gxGet(ks[h%ks.length]).seal}
/* 星圖：全螢幕，13 顆星可點；點一顆看規則、按「落子入門」開那一關 */
function gxCss(){if(document.getElementById("gxCss"))return;const s=document.createElement("style");s.id="gxCss";s.textContent=`
.gx-ov{position:fixed;inset:0;z-index:9500;background:#05060d;color:#f1e7cf;display:flex;flex-direction:column;overflow:auto;-webkit-overflow-scrolling:touch}
.gx-top{display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top)) 12px 6px}.gx-top b{flex:1;font:900 18px/1.3 var(--serif,serif);color:#ffe08a}
.gx-x{border:1.5px solid #6b5a33;background:rgba(20,16,12,.6);color:#f1e7cf;border-radius:999px;padding:0;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;font:800 20px/1 inherit}
.gx-say{margin:0 14px 6px;font:700 14px/1.5 var(--serif,serif);color:#d9cfb6}
.gx-map{position:relative;width:100%;aspect-ratio:1376/768;flex:none}.gx-map>img{position:absolute;inset:0;width:100%;height:100%}
.gx-st{position:absolute;transform:translate(-50%,-50%);width:11%;aspect-ratio:1;border-radius:50%;border:0;background:transparent;padding:0}
.gx-st.on{box-shadow:0 0 0 2px rgba(255,224,138,.95),0 0 14px 4px rgba(255,200,90,.6)}.gx-st.sel{box-shadow:0 0 0 3px #fff,0 0 16px 6px rgba(160,120,255,.8)}
.gx-lb{position:absolute;transform:translate(-50%,-50%);font:900 clamp(10px,2.9vw,17px)/1.2 var(--serif,serif);color:#fff3cf;text-shadow:0 0 3px #000,0 0 6px #000;white-space:nowrap;pointer-events:none}
.gx-lb.off{color:#8a8476}.gx-lb.done{color:#ffd76a}.gx-lb i{font-style:normal;font-size:.8em;margin-left:2px}
.gx-14{position:absolute;left:50%;top:48.5%;transform:translate(-50%,-50%);border:1.5px dashed #ffe08a;background:rgba(0,0,0,.35);color:#ffe08a;border-radius:999px;padding:4px 10px;font:900 13px/1.2 var(--serif,serif)}
.gx-card{margin:10px 12px max(14px,env(safe-area-inset-bottom));padding:12px 14px;border-radius:14px;background:rgba(30,26,40,.92);border:1.5px solid #4b3f6b}
.gx-card h3{margin:0 0 4px;font:900 18px/1.3 var(--serif,serif);color:#ffe08a}.gx-card p{margin:4px 0;font-size:14.5px;line-height:1.6}
.gx-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.gx-btns .gx-go{flex:1 1 28%;min-width:84px}.gx-btns button{flex:1;padding:11px 0;border-radius:11px;font:900 16px/1 var(--serif,serif);border:1.5px solid #6b5a33}
.gx-go{background:#7a2bb5;color:#fff;border-color:#b58cff!important}.gx-go[disabled]{opacity:.45}.gx-stay{background:transparent;color:#f1e7cf}`;document.head.append(s)}
function gxMap(o){o=o||{};gxCss();vibrate(8);const old=document.querySelector(".gx-ov");if(old)old.remove();
  const S=gxSeals(),all=gxAllDone(),ov=document.createElement("div");ov.className="gx-ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","幻譜星門・十三星系");
  const first=!store.get("gxSeen",0);store.set("gxSeen",1);
  ov.innerHTML=`<div class="gx-top"><b>🌌 幻譜星門</b><button class="gx-x" type="button" aria-label="離開幻譜星門">✕</button></div>`+
    `<p class="gx-say">${o.from==="orb"?`✦ ${esc(first?GX_TXT.gate:GX_TXT.open)}<br>幻影棋客：「${esc(GX_TXT.invite)}」`:`✦ ${esc(GX_TXT.open)}`}</p>`+
    `<div class="gx-map"><img src="data/park/galaxy_map.webp" alt="十三星系星圖">`+GX_LIST.map(g=>{const lk=gxLock(g.id),dn=!!S[g.id];
      return`<button class="gx-st${dn?" on":""}" type="button" data-gx="${g.id}" style="left:${g.p[0]}%;top:${g.p[1]}%" aria-label="${esc(g.t)}${dn?"，已得星印":lk?"，"+esc(lk):""}"></button><span class="gx-lb${g.off?" off":dn?" done":""}" style="left:${g.p[2]}%;top:${g.p[3]}%">${esc(g.n)}${dn?"<i>✦</i>":lk&&!g.off?"<i>🔒</i>":""}</span>`}).join("")+
    (all?`<button class="gx-14" type="button" data-gx="mirror">第十四顆</button>`:"")+`</div><div class="gx-card" id="gxCard"><p>幻影棋客：「${esc(GX_TXT.pick)}」</p><p class="muted" style="color:#a99f88;font-size:13px">點一顆星看看。打贏一位主宰，下一顆星就會亮。</p></div>`;
  document.body.append(ov);const close=()=>{ov.remove()};   /* hspx 開發者 11/12（截圖圈右上角「先走此局」）：右上角那顆其實是離開星門，卻寫成劇情文案「先走此局」，看起來像「開始這一局」，又跟卡片裡的同名鍵重複（卡片裡那顆還被擠成直排）→ 右上角改成 ✕（44×44、螢幕報讀念「離開幻譜星門」），卡片裡的拿掉 */
  ov.querySelector(".gx-x").onclick=()=>{vibrate(5);close()};
  const card=ov.querySelector("#gxCard"),pick=id=>{vibrate(5);ov.querySelectorAll(".gx-st,.gx-14").forEach(b=>b.classList.toggle("sel",b.dataset.gx===id));
    if(id==="mirror"){card.innerHTML=`<h3>第十四顆・鏡像</h3><p>${esc(GX_TXT.all)}</p><p>這一盤你執黑；對面照你自己最常贏的開局走前兩步，再用全力跟你下。</p><div class="gx-btns"><button class="gx-go" type="button">${esc(GX_TXT.go)}</button></div>`}
    else{const g=gxGet(id),lk=gxLock(id),dn=S[id];card.innerHTML=`<h3>${esc(g.t)}</h3><p>${esc(g.rule)}</p>${g.goal?`<p>勝利條件：${esc(g.goal)}</p>`:""}${g.say?`<p style="font-style:italic">「${esc(g.say)}」</p>`:""}<p class="muted" style="color:#a99f88;font-size:13px">${dn?"✦ 已得"+esc((GX_MODES[dn.t!=null?dn.t:1]||GX_MODES[1])[3])+"，可以再挑戰更高一檔":lk?"🔒 "+esc(lk):"不計積分、不扣分"}</p>`+
      `<div class="gx-btns">${GX_MODES.map(([k,l,d,seal])=>`<button class="gx-go" type="button" data-m="${k}"${lk?" disabled":""} aria-label="${esc(l)}：電腦${d?(d>0?"強":"弱")+Math.abs(d)+"級":"跟你差不多"}，過關得${esc(seal)}">${esc(l)}<small style="display:block;font-size:11px;opacity:.8">${esc(seal)}</small></button>`).join("")}</div>`}
    card.querySelectorAll(".gx-go").forEach(go=>go.onclick=()=>{if(go.disabled)return;close();toast("🌌 "+GX_TXT.enter);setTimeout(()=>gxStart(id,false,go.dataset.m),300)})};   /* 三檔：data-m＝easy／std／hard；鏡像那顆沒有 data-m，照上次的檔 */
  ov.querySelectorAll("[data-gx]").forEach(b=>b.onclick=()=>pick(b.dataset.gx));if(o.pick)pick(o.pick)}
/* 星槎圖上的「🌌 幻譜星門」熱點（07f Voyage 畫完叫）：第一次出現先說旁白 */
function gxShipHs(v){if(!gxOpen())return;const hl=v.querySelector(".shp-hl");if(!hl||hl.querySelector("[data-gxhs]"))return;const b=document.createElement("button");b.className="shp-hs";b.dataset.gxhs="1";b.type="button";b.style.cssText="left:30%;top:12%";b.textContent="🌌 幻譜星門";
  b.onclick=()=>{vibrate(5);if(!store.get("gxShip",0)){store.set("gxShip",1);modal(`<div class="em">🌌</div><h2>幻譜星門</h2><p class="pl-say">✦ ${esc(GX_TXT.ship)}</p>`,[["推開星門",()=>gxMap()],["先不要",null,true]],"prolog");return}gxMap()};hl.append(b)}
