// ================= 挑戰電腦 =================
// 聲控走棋（意見回饋 193）：按 🎤 說「馬八進七」「炮二平五」「車1進1」；把所有合法走法轉成記譜，跟聽到的字比對（同音字也算，例如「嗎」＝馬、「近」＝進）
const VC_SETS=(()=>{const M={},add=(tok,chs)=>{for(const c of chs)(M[c]=M[c]||[]).push(tok)};
  add("車","車俥车居駒拘鞠局");add("馬","馬傌马嗎媽碼瑪麻罵吗妈码");add("炮","炮砲跑泡袍刨包抱豹報");add("兵","兵卒冰族足祖組阻賓彬並病");
  add("相","相象像向項想箱香鄉祥詳");add("士","士仕是事市室式試視示世勢師使史四");add("將","將帥将帅江醬獎講蔣姜摔率衰");
  add("進","進进近盡金今晉勁浸緊斤津禁");add("退","退腿推褪");add("平","平瓶評萍憑蘋屏坪品拼頻");add("前","前錢欠潛牽鉗千");add("後","後后候厚");add("中","中鐘終忠種眾宗");
  ["一1１衣醫依伊壹么腰","二2２兩两而兒耳爾貳","三3３山傘散參","四4４是絲斯寺似死司","五5５午舞武屋吳無伍物務","六6６溜柳留劉陸樓流","七7７期妻其起氣漆齊騎奇","八8８吧巴把爸拔疤","九9９酒久就舊救韭玖"].forEach((x,i)=>add(String(i+1),x));return M})();
const vcTok=s=>{const D={俥:"車",傌:"馬",砲:"炮",卒:"兵",象:"相",仕:"士",帥:"將"},Z="一二三四五六七八九";return[...s].map(c=>D[c]||(Z.includes(c)?String(Z.indexOf(c)+1):c))};
function vcMatch(alts,board,legal){const C=window.XQCore;if(!C)return[];const cands=legal.map(([f,t])=>({f,t,cn:C.notate(board,f,t)})),hits=new Map();
  for(const a of alts){const sp=[...String(a)].map(c=>VC_SETS[c]).filter(Boolean);
    for(const c of cands){const tk=vcTok(c.cn);for(let i=0;i+tk.length<=sp.length;i++)if(tk.every((x,j)=>sp[i+j].includes(x))){hits.set(c.cn,c);break}}
    if(hits.size)break}
  return[...hits.values()]}
const vcOK=()=>!!(window.SpeechRecognition||window.webkitSpeechRecognition);let VC_REC=null,VC_END=null;const vcCancel=()=>{const f=VC_END;VC_REC=null;VC_END=null;if(f)f()};
// ctx()：回傳 {board,legal,play(f,t)}，或 {why:"還沒輪到你"}
function voiceMove(ctx){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast("這個瀏覽器不支援語音辨識（iPhone 請用 Safari 或主畫面 App，並在設定開啟 Siri 與聽寫）");
  const c0=ctx();if(!c0||c0.why)return toast(c0&&c0.why||"現在不能走棋");
  if(VC_REC){vcCancel();return}   // 意見回饋 202：聆聽中再按一次 🎤 就取消
  const r=new R();VC_REC=r;r.lang="zh-TW";r.interimResults=false;r.maxAlternatives=5;r.continuous=false;let got=false;
  const tip=document.createElement("div");tip.className="vc-tip";tip.innerHTML='<b>🎤 請說棋步</b><span>例如「馬八進七」「炮二平五」</span><button type="button">✕ 取消，改用手下</button>';document.body.append(tip);
  let tm=0;const end=()=>{clearTimeout(tm);tip.remove();document.removeEventListener("pointerdown",outside,true);window.removeEventListener("hashchange",end);if(VC_REC===r){VC_REC=null;VC_END=null}};
  const outside=e=>{if(!tip.contains(e.target)&&!(e.target.closest&&e.target.closest('[title="聲控走棋"],[aria-label="聲控走棋"]')))vcCancel()};
  VC_END=()=>{try{r.abort()}catch(e){}end()};tip.querySelector("button").onclick=e=>{e.stopPropagation();vcCancel();toast("已取消聲控，可以直接點棋盤下棋")};
  setTimeout(()=>document.addEventListener("pointerdown",outside,true),50);window.addEventListener("hashchange",end);tm=setTimeout(()=>{if(VC_REC===r&&!got){vcCancel();toast("沒聽到棋步，已取消聲控")}},8000);
  r.onresult=e=>{if(VC_REC!==r)return;got=true;const res=e.results[0],alts=[...res].map(x=>x.transcript);const c=ctx();if(!c||c.why){end();return toast(c&&c.why||"現在不能走棋")}
    const hit=vcMatch(alts,c.board,c.legal);end();
    if(hit.length===1){vibrate(15);toast("🎤 "+hit[0].cn);c.play(hit[0].f,hit[0].t)}
    else if(hit.length>1)modal(`<div class="em">🎤</div><h2>是哪一步？</h2><p class="muted">聽到「${esc(alts[0]||"")}」</p>`,hit.slice(0,4).map(h=>[h.cn,()=>c.play(h.f,h.t)]).concat([["取消",null,true]]));
    else toast(`聽到「${alts[0]||""}」，找不到這一步，再說一次`)};
  r.onerror=e=>{if(VC_REC!==r)return end();end();if(e.error==="not-allowed"||e.error==="service-not-allowed")toast("要允許使用麥克風才能聲控走棋");else if(e.error==="no-speech")toast("沒聽到聲音，再按一次 🎤");else if(e.error!=="aborted")toast("語音辨識失敗："+e.error)};
  r.onend=()=>{if(!got)end()};
  try{r.start();vibrate(8)}catch(e){end();toast("無法開始錄音")}}
const vcOn=()=>store.get("voiceMove",true);
// 公園 3D 棋盤（意見回饋 212）：第一人稱坐在公園石桌前下棋，小帥坐在對面長椅上；右上角 🌳 切換，選擇會記住
// 我的小帥造型（棋子、朝代、官階）：線上大廳會廣播，對手在公園 3D 棋盤上看到的就是你的小帥
window.XQ_BOTLOOK=()=>{let p=0;try{p=(JSON.parse(localStorage.getItem("xq_cpuRate")||"null")||{}).pts||0}catch(e){}
  return{p:botPc(),e:store.get("era","classic"),g:p>=1500?1:p>=1150?2:p>=1000?3:p>=800?4:p>=600?5:p>=400?6:p>=200?7:p>=100?8:9,sx:mySex(),st:myStyle()}};   /* 意見回饋 500：連自己選的男生／女生、Q 版／真實版一起廣播 */
/* 別人廣播來的造型：女生＝小帥妹；真實版的模型由看的人「對手形象」設定決定（oppFig） */
const remoteLook=L=>!L||!L.sx?L:L.sx==="f"?{...L,npc:"me",cus:"me:girl"}:{...L,cus:"me:boy"};
// 電腦對手 Pikafish：瘦長版的棋子人、戴眼鏡，執哪一方身上就是帥或將；帽子、官服跟著目前朝代（意見回饋 228）
// 意見回饋 249：Pikafish 設定檔比公園晚到時，到了馬上換成手繪版（公園那邊會先藏著，不先顯示舊的 3D 版）
/* 意見回饋 418：Pikafish 有兩款造型——原本的文官（data/pika/）、臥龍（data/pika2/，綸巾鶴氅羽扇）；設定裡選 */
const PIKA_DIR=()=>"data/pika2/";   /* 意見回饋 418：開發者說「Pikafish＝冷面國手」，挑戰電腦的 Pikafish 一律是冷面國手，不再有切換 */
let PIKA_META=null,PIKA_META_DIR=null;function loadPikaMeta(){const dir=PIKA_DIR();return fetch(dir+"pika.json").then(r=>r.json()).then(j=>{PIKA_META=j;PIKA_META_DIR=dir;try{const a=typeof PARK!=="undefined"&&PARK&&PARK.last;
  if(a&&a.ex.opp&&a.ex.opp.thin&&!a.ex.opp.sprite){a.ex.opp=PIKA_LOOK(a.ex.opp.p==="帥"?"r":"b");PARK.v.draw(a.board,a.o,a.ex)}}catch(e){}}).catch(()=>{})}loadPikaMeta();
const TIMG=(src,emo)=>`<img class="ti" src="${src}" alt="" onerror="this.replaceWith(document.createTextNode('${emo}'))">`;
/* 擂台的對手換成那位擂主的圖（Gemini 畫的 idle／think／move／win／lose；開心＝贏、難過＝輸、驚訝＝思考） */
let CHAMP_META=null;fetch("data/champ/champ.json").then(r=>r.ok?r.json():null).then(j=>{CHAMP_META=j}).catch(()=>{});
/* 意見回饋 362：石桌往事的故事角色當對手（data/journey/char_<角色>_<姿勢>.webp，跟擂主同尺寸，所以共用 CHAMP_META） */
const JCHAR={liu_young:{name:"少年柳寒舟",pc:"砲",hat:"hair",hc:"#1E1A16",band:"#2F5D8A",robe:"#5C6E7A",hi:"炮先上，急什麼？我就是急！",win:"將！這盤我的。",lose:"……再來一盤。"},
  shen_young:{name:"少年沈石川",pc:"馬",hat:"hair",hc:"#1E1A16",robe:"#6B7C6A",hi:"急什麼，棋又不會跑。",win:"你太急了。",lose:"好棋。我記住了。"},
  agula_young:{name:"少年阿古拉",pc:"車",hat:"agula",hc:"#F0EDE6",robe:"#C9953E",cus:"agula",shoe:"#1E1A16",belt:"#7A4A24",hi:"草原上的人，下棋也騎馬！",win:"哈！馬跑得比你快。",lose:"欠你一盤，記著。"},
  boatman:{name:"渡口老艄公",pc:"卒",hat:"cap",hc:"#C9A86A",robe:"#7A6A50",hi:"上了船，就別亂動。",win:"水急，棋也急。",lose:"老了，看不清嘍。"},
  scholar:{name:"江南書生",pc:"士",hat:"fangjin",hc:"#151515",robe:"#3A4A6A",hi:"在棋盤上，論理不論勢。",win:"承讓，承讓。",lose:"小生佩服。"},
  liu_old:{name:"柳寒舟",pc:"砲",hat:"bun",hc:"#D8D6D0",robe:"#8A8A86",hi:"你走那步車，讓我想起一個人。",win:"還是太急了。",lose:"好……好棋。"}};
/* 3D 園子的對手一律是立體小人（意見回饋 377），所以故事角色跟路人一樣用帽子、髮色、衣服顏色來分；畫好的立繪（data/journey/char_*）留給對話和人物頁用 */
const JCHAR_LOOK=(k,side)=>JCHAR[k]?{...NPC_LOOK({...JCHAR[k],cus:"j:"+k,say:JCHAR[k].hi},side),...(CHAMP_META?{flat:true,sprite:`data/journey/char_${k}_`,spriteMeta:{...CHAMP_META,mask:true,faceOf:faceOf("journey",{idle:`char_${k}_idle`,think:`char_${k}_think`,move:`char_${k}_move`,happy:`char_${k}_win`,sad:`char_${k}_lose`,surprise:`char_${k}_think`},`char_${k}_idle`)},spriteMap:{happy:"win",sad:"lose",surprise:"think"}}:{})}:null;   /* 故事人物也用畫好的形象（5 個姿勢） */
/* 意見回饋 584（開發者）：3D 人物檢視抽成共用的 fig3d——我的角色頁的舞台直接放 3D（不用再點一次才看得到）、點人物的大圖也用它。
   o.tight：鏡頭貼近、人物撐滿框（舞台用）；o.zoom：顯示 ＋／－ 並可兩指縮放；o.spin：一直慢慢轉，否則左右輕輕擺動、拖過就停在拖到的角度 */
async function fig3d(host,look,o){o=o||{};
  try{await loadScript(OFF?"three.min.js":"/m/three.min.js");await loadScript((OFF?"bot3d.js":"/m/bot3d.js")+"?v="+encodeURIComponent(window.XQ_BUILD||""));if(!window.THREE||!window.XQBot3D||!XQBot3D.figure)throw 0}catch(e){return null}
  if(!host.isConnected)return null;const T=window.THREE,W=host.clientWidth||200,H=host.clientHeight||W;let r;try{r=new T.WebGLRenderer({antialias:true,alpha:true})}catch(e){return null}
  r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.setSize(W,H);if(look&&look.glb&&T.sRGBEncoding!=null)r.outputEncoding=T.sRGBEncoding;r.domElement.style.cssText="position:absolute;inset:0;width:100%;height:100%;touch-action:none";host.append(r.domElement);
  const sc=new T.Scene();sc.add(new T.HemisphereLight(0xFFF6E8,0x6A5A48,1.15));const d=new T.DirectionalLight(0xFFFFFF,.85);d.position.set(3,6,5);sc.add(d);
  let B;try{B=XQBot3D.figure(look||{})}catch(e){r.dispose();return null}
  const root=new T.Group();root.add(B.bot);sc.add(root);root.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(B.bot),c=box.getCenter(new T.Vector3()),sz=box.getSize(new T.Vector3());B.bot.position.sub(c);const by=B.bot.position.y;
  const tn=Math.tan(15*Math.PI/180),D0=o.tight?Math.max(sz.y/(2*tn*.94),sz.x/(2*tn*(W/H)*.9)):Math.max(sz.y,sz.x)*2.6;
  const cam=new T.PerspectiveCamera(30,W/H,.1,400);cam.position.set(0,o.tight?0:sz.y*.06,D0);cam.lookAt(0,0,0);
  try{const ro=new ResizeObserver(()=>{if(!host.isConnected){ro.disconnect();return}const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()});ro.observe(host)}catch(e){}   /* 開發者 11/6：3D 只在一開始照框的大小畫，之後框變大小（圖片載入、版面撐開）畫面就被拉長，雷借花的棋子看起來變成直立橢圓；框變大小時跟著用正確比例重畫 */
  const cidM=((look&&look.glb)||"").match(/\/(\w+)\.glb/),ITM=cidM&&WX_ITEMS[cidM[1]];   /* 意見回饋 679：點角色身上的物件看故事 */
  const segD=(x,y,[[x1,y1],[x2,y2]])=>{const dx=x2-x1,dy=y2-y1,k=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-x1-k*dx,y-y1-k*dy)};
  const itemTap=e=>{try{const old=document.querySelector(".fig-item");if(old){old.remove();return}if(!ITM||!B.glbRoot||!B.glbRaw)return;const rc=host.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1),cam);
    const hit=ray.intersectObject(B.glbRoot,true)[0];if(!hit)return;const P=B.glbRoot.worldToLocal(hit.point.clone()),mn=B.glbRaw.min,mx=B.glbRaw.max,h=(mx.y-mn.y)||1,u=-(P.z-(mn.z+mx.z)/2)/h,vv=(P.y-mn.y)/h,fr=P.x>(mn.x+mx.x)/2?1:-1,fv=B.glbRoot.worldToLocal(ray.ray.origin.clone()).x>(mn.x+mx.x)/2?1:-1;   /* 意見回饋 821：fv＝鏡頭在正面還是背面；耳環中間的洞會看穿到後面的披肩（那一點在背面），物件加 see:1 就只認從正面看的點選 */
    const it=ITM.find(q=>(!q.side||q.side===fr)&&(!q.see||q.see===fv)&&(q.ln?segD(u,vv,q.ln)<(q.w||.05):(u>=q.u[0]&&u<=q.u[1]&&vv>=q.v[0]&&vv<=q.v[1])));if(!it)return;vibrate(5);const C=WX_CHARS[cidM[1]]||{},nm=it.pc?"本命子・"+(C.pc||""):it.n,tx=it.pc?`${C.n||""}的身體是一顆木頭棋子，刻著本命子「${C.pc||""}」。${WX_PC_RULE[C.pc]||""}`:it.t;   /* 意見回饋 680：點身體的木棋子，介紹本命子和它的走法 */
    const d=document.createElement("div");d.className="fig-item";d.innerHTML=`<b>${esc(nm)}</b><p>${esc(tx)}</p><small>點一下關閉</small>`;d.addEventListener("pointerdown",x=>x.stopPropagation());d.onclick=()=>d.remove();document.body.append(d)}catch(err){}};   /* 意見回饋 681：說明框改成固定在畫面下方、整個寬度，不疊在角色身上 */
  let ry=o.spin?-.35:0,v=.004,drag=null,moved=false,t0=performance.now(),zf=1,pin=null;const ptrs=new Map();
  const setZ=z=>{zf=Math.max(.6,Math.min(3.2,z));cam.position.set(0,o.tight?0:sz.y*.06,D0/zf);cam.lookAt(0,sz.y*.08*(zf-1)/2.2,0)};
  host.addEventListener("pointerdown",e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{host.setPointerCapture(e.pointerId)}catch(_){}
    if(o.zoom&&ptrs.size===2){const[a,c2]=[...ptrs.values()];pin={d:Math.hypot(a.x-c2.x,a.y-c2.y)||1,z:zf};drag=null}else if(ptrs.size===1)drag={x:e.clientX,ry,m:false}});
  host.addEventListener("pointermove",e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pin&&ptrs.size>=2){const[a,c2]=[...ptrs.values()];setZ(pin.z*Math.hypot(a.x-c2.x,a.y-c2.y)/pin.d)}else if(drag){const dx=e.clientX-drag.x;if(Math.abs(dx)>4){drag.m=true;moved=true}ry=drag.ry+dx*.012}});
  const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pin=null;if(!ptrs.size){if(drag&&drag.m)host.dataset.dragged=Date.now();else if(drag&&!pin)itemTap(e);drag=null}};host.addEventListener("pointerup",up);host.addEventListener("pointercancel",up);
  if(o.zoom){host.addEventListener("wheel",e=>{e.preventDefault();setZ(zf*Math.exp(-e.deltaY*.0015))},{passive:false});
    const zb=document.createElement("div");zb.style.cssText="position:absolute;right:8px;bottom:8px;display:flex;flex-direction:column;gap:6px;z-index:2";
    for(const[l,f]of[["＋",1.25],["－",.8]]){const x=document.createElement("button");x.type="button";x.textContent=l;x.setAttribute("aria-label",f>1?"放大":"縮小");x.style.cssText="width:34px;height:34px;border-radius:50%;border:1px solid rgba(0,0,0,.15);background:rgba(255,250,240,.92);font:700 18px/1 sans-serif;color:#5a4630";
      x.addEventListener("pointerdown",e=>e.stopPropagation());x.onclick=e=>{e.stopPropagation();vibrate(5);setZ(zf*f)};zb.append(x)}host.append(zb)}
  const loop=()=>{if(!host.isConnected){try{r.dispose()}catch(e){}const fi=document.querySelector(".fig-item");if(fi)fi.remove();return}requestAnimationFrame(loop);if(document.hidden)return;const t=(performance.now()-t0)/1000;
    if(!drag){if(o.spin)ry+=v;else if(!moved)ry=Math.sin(t*.45)*.38}root.rotation.y=ry;B.bot.position.y=by+Math.sin(t*1.6)*sz.y*.012;
    try{if(XQBot3D.faceApply)XQBot3D.faceApply(B,"open",(t%4)<.12,false)}catch(e){}r.render(sc,cam)};loop();
  return{B,r}}
/* 意見回饋 400：點人物看大幅完整的 3D 小人，左右拖曳可以轉；3D 載入失敗就顯示畫像 */
async function figView(look,title,html,btns,img){sheet(title,async b=>{
  b.innerHTML=`<div id="fv" style="position:relative;aspect-ratio:1;max-height:56vh;margin:0 auto;border-radius:14px;overflow:hidden;touch-action:none;background:radial-gradient(circle at 50% 38%,#F6EEDF,#CDBB9C)"></div><p class="muted" style="text-align:center;font-size:12.5px;margin:6px 0 10px">左右拖曳可以轉動・兩指捏合或按 ＋／－ 放大縮小${look&&look.glb&&/\/(x_\w+)\.glb/.test(look.glb)&&WX_ITEMS[look.glb.match(/\/(x_\w+)\.glb/)[1]]?"・點身上的物件看故事":""}</p>${html||""}<div class="lvch" id="fvb"></div>`;
  const bb=b.querySelector("#fvb");for(const[l,fn,gh]of btns||[]){const x=document.createElement("button");x.className="btn"+(gh?" ghost":"");x.textContent=l;x.onclick=fn;bb.append(x)}
  const host=b.querySelector("#fv"),flat=()=>{host.innerHTML=img?`<img src="${img}" alt="" style="width:100%;height:100%;object-fit:contain">`:"";const p=b.querySelector("p.muted");if(p)p.remove()};
  if(!look||look.nog3&&img)return flat();
  const res=await fig3d(host,look,{zoom:true,spin:true});if(!res)return flat();
  if(look&&look.glb&&res.B.glbP){const tip=document.createElement("div");tip.style.cssText="position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:12.5px;color:#5a4630";tip.textContent="🗿 真實 3D 載入中…";host.append(tip);   /* 意見回饋 505：看得出是還在載、還是載不到 */
    res.B.glbP.then(()=>tip.remove()).catch(e=>{tip.textContent="真實 3D 模型載不到（"+(navigator.onLine?"網路慢或檔案有問題":"沒有網路")+"），先顯示 Q 版"})}})}
/* 意見回饋 584：我的角色頁舞台上的人物直接是 3D（左右拖曳可以轉，平常輕輕擺動）；真實 3D 載好之前先顯示原本的圖，選「畫好的立繪」的人維持平面圖 */
async function meFig3d(v){const f=v.querySelector("#meFig2");if(!f||f.dataset.g3||myStyle()==="art")return;if(myChar()&&!myLook())return;   /* 武俠角色的 3D 模型還沒好：舞台先放 2D 立繪 */f.dataset.g3="1";
  const look=myLook()||{p:botPc(),e:store.get("era","classic"),g:9},host=document.createElement("div");host.style.cssText="position:absolute;inset:0;opacity:0;transition:opacity .45s;touch-action:none";f.append(host);
  const res=await fig3d(host,look,{tight:true});if(!res){host.remove();delete f.dataset.g3;return}
  const show=()=>{host.style.opacity=1;const im=f.querySelector("img");if(im){im.style.transition="opacity .45s";im.style.opacity=0}};
  if(look&&look.glb&&res.B.glbP)res.B.glbP.then(show,show);else show()}
/* 意見回饋 400：石桌往事的人物偶爾路過線上大廳（每 15 分鐘換一批，大約六成的時候會有 1～2 位），點他看人物、可以跟他下一盤；難度照故事裡的設定 */
const JCHAR_LV={liu_young:3,shen_young:4,agula_young:3,boatman:2,scholar:4,liu_old:6};
function lobbyVisitors(){const slot=Math.floor(Date.now()/9e5);let h=slot*2654435761>>>0;const rnd=()=>{h=(h*1103515245+12345)>>>0;return h/4294967296};
  if(rnd()>.6)return[];const ks=Object.keys(JCHAR),out=[];const n=rnd()<.35?2:1;while(out.length<n){const k=ks[Math.floor(rnd()*ks.length)];if(!out.includes(k))out.push(k)}
  /* 意見回饋 480（開發者）：剛跟他下過一盤（不管輸贏、中途離開）就先離開大廳，隨機過 5～20 分鐘才可能再遇到 */
  const gone=store.get("visitGone",{}),now=Date.now();return out.filter(k=>!(gone[k]>now))}
function jcharSheet(k){const c=JCHAR[k];if(!c)return;const lv=JCHAR_LV[k]||3;
  figView(oppArt()?null:oppFig(JCHAR_LOOK(k,"b")),"🪨 "+c.name,`<p style="font-size:16px;line-height:1.8;margin:0 0 6px">「${esc(c.hi)}」</p>${ageLine(AGE["j:"+k])}<p class="muted" style="font-size:13px;margin:0 0 4px">石桌往事裡的人物・第 ${lv} 級的實力（照故事裡的棋力）</p>`,
    [["♟ 跟他下一盤",()=>{closeSheet();{const g=store.get("visitGone",{}),now=Date.now();for(const x in g)if(g[x]<now)delete g[x];g[k]=now+(5+Math.random()*15)*60000;store.set("visitGone",g)}jStart("char:"+k,{human:"r",level:lv,journey:"char:"+k},()=>{location.hash="#/journey/play";setTimeout(()=>toast(`🪨 ${c.name}：${c.hi}`),500)})}],["關閉",()=>closeSheet(),true]],`data/journey/char_${k}_idle.webp`)}
/* 人物與年表：點人物看 3D 小人（照人物設定配的帽子、衣服） */
const PEOPLE_LOOK={"沈石川":{pc:"馬",hat:"bun",hc:"#E8E6E0",robe:"#5E6B5C"},"柳寒舟":{pc:"砲",hat:"bun",hc:"#D8D6D0",robe:"#8A8A86"},"阿古拉":{pc:"車",hat:"fur",hc:"#F0EDE6",robe:"#3E6FA8"},"周文淵":{pc:"象",hat:"fangjin",hc:"#151515",robe:"#7A2E2A"},
  "柳老篙":{pc:"砲",hat:"cap",hc:"#C9A86A",robe:"#7A6A50"},"秦小禾":{pc:"象",hat:"buns",hc:"#2A1D16",robe:"#C76B6B"},"朱元璋":{pc:"將",hat:"fangjin",hc:"#2A1D16",robe:"#B8862E"},"錢小滿":{pc:"兵",hat:"hair",hc:"#2A1D16",robe:"#8A6A3A"},
  /* 角色盤查（11/4）：照擅長的棋路給身上的字——趙守田「小卒過河頂大車」、秦長庚教屏風馬、牽小馬的孩子會退車 */"趙守田":{pc:"卒"},"秦長庚":{pc:"馬"},"牽小馬的孩子":{pc:"車"}};   /* 柳老篙一輩子只會當頭炮→砲；周文淵下飛相局→象 */
/* 角色盤查（11/4）：擂台主身上的字照擅長的棋子——秦「步步進逼」卒、漢「最愛用馬」、三國「炮火攻」、元「最愛車和馬」；沒寫擅長的照舊帥／將 */
const CHAMP_PC={qin:"P",han:"N",sanguo:"C",yuan:"R"},PC_CH={r:{P:"兵",N:"傌",C:"炮",R:"俥"},b:{P:"卒",N:"馬",C:"砲",R:"車"}};
const CHAMP_LOOK=(era,side)=>CHAMP_META&&ARENA[era]?{p:CHAMP_PC[era]?PC_CH[side==="r"?"r":"b"][CHAMP_PC[era]]:side==="r"?"帥":"將",e:era,g:1,cus:"c:"+era,flat:true,sprite:`data/champ/${era}_`,spriteMeta:CHAMP_META,spriteMap:{happy:"win",sad:"lose",surprise:"think"}}:null;
/* 意見回饋 425：石桌往事的園子（第一集、第二集以後共用）每次開一盤，隨機遇到一位路人棋友（不會連續兩次同一位），難度以玩家等級為中心上下浮動一級。
   立繪 data/npc/<id>.webp（Gemini 畫的，還沒有就只顯示名字）；3D 用 bot3d.js 的路人造型（hat 帽子／頭髮、hc 顏色、robe 衣服、band 頭帶、acc 髮簪／花），不受「Pikafish 造型」設定影響；pc 是身上那顆棋子（黑方的字） */
/* 意見回饋 493（開發者）：人物資訊欄標年齡。故事人物照故事的「現在」永樂十年（1412 年，錢小滿十歲那年）算，故事開始前就過世的寫享年；
   真實歷史人物照史書慣用的虛歲寫享年；公園、驛站、秘境的棋友照畫出來的樣子給年齡 */
/* 意見回饋 495（開發者）：小人的官階照朝代換稱號——九品官制是曹魏以後才有的：
   秦朝用軍功爵（公士→徹侯）、漢朝用俸祿秩石（百石→萬石），三國以後才是九品（九品→一品）；經典（不限朝代）照舊用九品 */
const RANK_T={qin:["徹侯","關內侯","大庶長","左庶長","五大夫","公大夫","大夫","上造","公士"],han:["萬石","中二千石","二千石","比二千石","千石","六百石","四百石","二百石","百石"]};
const RANK_NOTE={qin:"秦朝還沒有九品官制，用的是軍功爵位：打勝仗就升一級爵",han:"漢朝還沒有九品官制，官的大小看一年的俸祿有多少「石」米"};
window.RANKT=(era,g)=>{g=Math.max(1,Math.min(9,g|0||9));const T=RANK_T[era];return T?T[g-1]+(era==="han"?"官":""):"〇一二三四五六七八九"[g]+"品官"};
const STORY_Y=1412;
const AGE={"n:w01_tang_lady":"22 歲","n:w02_song_tea":"19 歲","n:w03_yuan_rider":"18 歲","n:w04_ming_scholar":"20 歲","n:w05_qing_gege":"16 歲","n:w06_swordswoman":"21 歲","n:w07_fisher_girl":"17 歲","n:w08_embroider":"20 歲","n:w09_qin_player":"23 歲","n:w10_general":"19 歲","n:w11_yuan_falconer":"16 歲","n:w12_yuan_merchant":"18 歲","n:w13_yuan_singer":"20 歲","n:w14_yuan_porcelain":"19 歲","n:w15_yuan_archer":"18 歲","n:w16_ming_poet":"20 歲","n:w17_ming_pipa":"21 歲","n:w18_ming_doctor":"24 歲","n:w19_ming_teahouse":"19 歲","n:w20_ming_guard":"22 歲","n:niao":"68 歲","n:duanjin":"58 歲","n:douhua":"45 歲","n:fengzheng":"8 歲","n:mujiang":"42 歲","n:amah":"66 歲","n:daishu":"45 歲","n:tiaoshui":"15 歲","n:genggu":"62 歲","n:maihua":"16 歲","n:legend":"74 歲","n:tea":"65 歲","n:scholar":"24 歲","n:guard":"38 歲","n:monk":"55 歲","n:teller":"35 歲","n:liuji":"享年 65 歲","n:changyuchun":"享年 40 歲","n:wangmian":"享年 73 歲","n:shinaian":"享年約 75 歲","n:shenwansan":"生卒不詳","n:zhangsanfeng":"生卒不詳","c:classic":"74 歲","c:qin":"45 歲","c:han":"50 歲","c:sanguo":"45 歲","c:weijin":"35 歲","c:nanbei":"50 歲","c:sui":"55 歲","c:tang":"45 歲","c:wudai":"65 歲","c:song":"30 歲","c:yuan":"76 歲","c:ming":"82 歲","c:qing":"18 歲","j:liu_young":"14 歲","j:shen_young":"14 歲","j:agula_young":"18 歲","j:boatman":"60 歲","j:scholar":"25 歲","j:liu_old":"74 歲"};
const ageOfP=p=>{if(!p)return"";if(p.age)return p.age;   /* people.json 可以直接寫 age 蓋過算出來的 */
  const num=v=>v==null?null:parseInt(String(v).replace(/[^0-9]/g,""))||null,b=num(p.born),d=num(p.died),hist=/^📜/.test(p.note||""),about=/約/.test(String(p.born)+String(p.died||""));
  if(!b)return"";if(hist)return d?"享年"+(about?"約 ":" ")+(d-b+1)+" 歲":"";if(d&&d<=STORY_Y)return"享年 "+(d-b)+" 歲";return b>STORY_Y?"":"故事裡（永樂十年）"+(STORY_Y-b)+" 歲"};
const ageLine=t=>t?`<p class="muted" style="font-size:13px;margin:0 0 4px">🎂 ${esc(t)}</p>`:"";
const PARK_NPC=[
  /* 開發者（11/4）：20 位年輕女性棋手（唐宋元明清各種身分，元朝、明朝各多 5 位），立繪 npc/w*.webp */
  /* 意見回饋 658（開發者 11/6 選 A「路人回家」）：era＝她的家鄉朝代（依身分判斷：w06 女俠→唐傳奇、w07 漁家女→宋、w08 蘇州繡娘→清、w09 琴師→漢末蔡琰、w10 女將軍→隋末娘子軍）；在家鄉朝代的園子遇到她的機率約 70%（parkNpcNew）。羈絆、身分小卡、信在 07d-garden.js */
  {"id":"w01_tang_lady","era":"tang","name":"長安的牡丹娘子","pc":"士","say":"從長安帶來的棋，你接得住嗎？","win":"牡丹開得正好，這盤也是。","lose":"好棋！這一盤，我記在團扇上了。","hat":"topknot","hc":"#1E1A16","robe":"#C8322A"},
  {"id":"w02_song_tea","era":"song","name":"點茶的青盞姑娘","pc":"象","say":"先喝口茶，棋要慢慢下。","win":"茶還溫著，棋已經下完了。","lose":"這一手，比我的茶還香。","hat":"topknot","hc":"#1E1A16","robe":"#9CC8D8"},
  {"id":"w03_yuan_rider","era":"yuan","name":"草原女騎手","pc":"馬","say":"我的馬跳得比風還快！","win":"哈！草原上可沒人追得上我。","lose":"你的馬比我的還野，佩服！","hat":"hair","hc":"#1E1A16","robe":"#2456A6"},
  {"id":"w04_ming_scholar","era":"ming","name":"女扮男裝的書生","pc":"士","say":"在下……咳，小生請教一盤。","win":"書上寫的，果然沒錯。","lose":"這一手書上沒有，我得記下來。","hat":"fangjin","hc":"#151515","robe":"#B8A0D8"},
  {"id":"w05_qing_gege","era":"qing","name":"溜出府看棋的格格","pc":"將","say":"噓——別說我在這兒下棋。","win":"本格格贏了，不許告訴阿瑪！","lose":"輸了？再來一盤，這盤不算！","hat":"hair","hc":"#1E1A16","robe":"#F0B8C8"},
  {"id":"w06_swordswoman","era":"tang","name":"路過的江湖女俠","pc":"車","say":"劍不出鞘，棋上見真章。","win":"承讓。下一盤，換你先手。","lose":"好身手！江湖再見。","hat":"topknot","hc":"#1E1A16","robe":"#1E1A16"},
  {"id":"w07_fisher_girl","era":"song","name":"水鄉漁家女","pc":"卒","say":"剛收網回來，手還是濕的呢！","win":"今天魚多，棋也贏！","lose":"魚跑了，棋也輸了……","hat":"hair","hc":"#C9A86A","robe":"#3E5A8A"},
  {"id":"w08_embroider","era":"qing","name":"蘇州繡娘","pc":"象","say":"一針一線，一步一步。","win":"繡好了，這盤也收針了。","lose":"你這一手，針腳比我還細。","hat":"topknot","hc":"#1E1A16","robe":"#E8B860"},
  {"id":"w09_qin_player","era":"han","name":"抱琴的女琴師","pc":"士","say":"琴放一邊，先聽聽棋聲。","win":"一曲終了，勝負也定了。","lose":"好棋，像一段好曲子。","hat":"topknot","hc":"#1E1A16","robe":"#F5F3EE"},
  {"id":"w10_general","era":"sui","name":"少年女將軍","pc":"車","say":"排兵布陣，本將軍最在行！","win":"全軍得勝，收兵！","lose":"敗得心服口服，下次再戰。","hat":"helmet","hc":"#9AA0A8","robe":"#8E2A22"},
  {"id":"w11_yuan_falconer","era":"yuan","name":"馴鷹少女","pc":"馬","say":"我的鷹在天上看著你的棋。","win":"鷹看得準，我下得也準！","lose":"連鷹都替你叫好了。","hat":"hair","hc":"#1E1A16","robe":"#8E2A22"},
  {"id":"w12_yuan_merchant","era":"yuan","name":"西域商隊的姑娘","pc":"砲","say":"駱駝隊明天才走，今天陪你下棋。","win":"這盤棋，我賺到了！","lose":"這筆買賣我虧了，再來！","hat":"kerchief","hc":"#E8DCC8","robe":"#2456A6"},
  {"id":"w13_yuan_singer","era":"yuan","name":"勾欄的雜劇女伶","pc":"砲","say":"台下看戲，台上下棋，今天換個角色。","win":"這齣戲，我唱贏了！","lose":"好戲！這盤你是主角。","hat":"topknot","hc":"#1E1A16","robe":"#F0A0B8"},
  {"id":"w14_yuan_porcelain","era":"yuan","name":"畫青花的女工","pc":"象","say":"畫一筆青花，走一步棋。","win":"這盤棋，跟青花一樣漂亮。","lose":"你的棋，比我的青花還細。","hat":"bandana","hc":"#2F4A8A","robe":"#2F4A8A"},
  {"id":"w15_yuan_archer","era":"yuan","name":"草原女射手","pc":"車","say":"百步穿楊，棋盤上也一樣。","win":"正中靶心！","lose":"這一箭，我射偏了。","hat":"hair","hc":"#1E1A16","robe":"#6A4A2A"},
  {"id":"w16_ming_poet","era":"ming","name":"江南才女","pc":"車","say":"作詩缺一句，下盤棋找靈感。","win":"得了！這句就叫『一車定乾坤』。","lose":"這一步，可以寫成一首詩了。","hat":"topknot","hc":"#1E1A16","robe":"#F0C0C8"},
  {"id":"w17_ming_pipa","era":"ming","name":"秦淮琵琶女","pc":"象","say":"彈完這曲，陪你下一盤。","win":"大珠小珠落玉盤，這盤是我的。","lose":"好棋，弦都要斷了。","hat":"topknot","hc":"#1E1A16","robe":"#F5F3EE"},
  {"id":"w18_ming_doctor","era":"ming","name":"背藥箱的女大夫","pc":"卒","say":"下棋跟看病一樣，要先看準。","win":"藥到病除，棋到局終。","lose":"這一手，我得開帖藥給自己。","hat":"kerchief","hc":"#C8C0B0","robe":"#7A8FA8"},
  {"id":"w19_ming_teahouse","era":"ming","name":"茶館少東家","pc":"卒","say":"客官，下盤棋再走嘛！","win":"茶錢免了，棋錢照收！","lose":"好棋！這壺茶我請。","hat":"hair","hc":"#1E1A16","robe":"#E8B860"},
  {"id":"w20_ming_guard","era":"ming","name":"女捕快","pc":"車","say":"奉命巡街，順便抓一盤棋。","win":"人贓俱獲，這盤你輸了。","lose":"你這步棋，連我都抓不到。","hat":"sui","hc":"#1E1A16","robe":"#B8322A"},
  {id:"niao",name:"遛鳥的老伯",pc:"象",say:"我的畫眉聽得懂棋，你走錯它會叫。",win:"畫眉叫了吧？就說你走錯了。",lose:"好棋！畫眉都替你叫好。",hat:"scholar",hc:"#5A4630",robe:"#6B5A44"},
  {id:"duanjin",name:"練八段錦的大娘",pc:"砲",say:"剛打完一套拳，手正熱，來一盤！",win:"棋跟拳一樣，要天天練！",lose:"輸得痛快！明天再來過招。",hat:"bun",hc:"#2A1D16",band:"#C8382E",robe:"#B4453A"},
  {id:"douhua",name:"賣豆花的小販",pc:"卒",say:"下贏了請你一碗，下輸了你請我。",win:"一碗豆花，記你帳上囉！",lose:"願賭服輸，這碗豆花我請！",hat:"scarf",hc:"#E6D3A3",robe:"#C9A46A"},
  {id:"fengzheng",name:"放風箏的孩子",pc:"馬",say:"風箏線先綁在樹上，下完再去追！",win:"我贏了！我去追風箏囉！",lose:"哎呀輸了，風箏也飛走了……",hat:"buns",hc:"#2A1D16",robe:"#3F6FA8"},
  {id:"mujiang",name:"收工的木匠",pc:"車",say:"刨了一天木頭，棋子我比你熟。",win:"棋子是木頭做的，我最懂它。",lose:"好手藝！你這盤棋刨得真平。",hat:"cap",hc:"#4A3020",robe:"#7A5230"},
  {id:"amah",name:"抱孫子的阿嬤",pc:"將",say:"孫子睡著了，我們小聲下。",win:"噓——我贏了，別吵醒孫子。",lose:"你真厲害，等孫子長大跟你學。",hat:"bun",hc:"#ECE8DE",acc:"#8A5A3A",robe:"#8E5A8A"},
  {id:"daishu",name:"擺字攤的代書先生",pc:"士",say:"寫一封家書三文錢，下一盤不收錢。",win:"承讓，這盤我替你記下了。",lose:"佩服，這幾步好棋我得抄下來。",hat:"fangjin",hc:"#151515",robe:"#2E3A5A"},
  {id:"tiaoshui",name:"挑水的少年",pc:"卒",say:"水桶先放著，一盤就好。",win:"贏了！挑水回家也有力氣了。",lose:"輸了……我得趕緊去挑水了。",hat:"hair",hc:"#2A1D16",band:"#6F8A99",robe:"#5C7A8A"},
  {id:"genggu",name:"打更的老更夫",pc:"砲",say:"天還沒黑，梆子先擱著，陪你下。",win:"梆梆！這盤收了。",lose:"天要黑了，你這盤下得好。",hat:"fur",hc:"#5A5A62",robe:"#4A4A52"},
  {id:"maihua",name:"賣花的姑娘",pc:"象",say:"這枝梅花當彩頭，你贏了就送你。",win:"梅花我先留著，下次再送你。",lose:"說話算話，這枝梅花送你！",hat:"flower",hc:"#2A1D16",acc:"#F07AA0",robe:"#C76B8A"}];
const npcPc=(n,side)=>side==="r"?({將:"帥",士:"仕",象:"相",車:"俥",馬:"傌",砲:"炮",卒:"兵"}[n.pc]||"帥"):n.pc||"將";
/* 開發者：角色身體中間留白的圓，下棋時寫上他擅長的棋子（紅方紅字、黑方黑字）。圓的位置是 tools/face_detect.py 自動找的（faces.json），
   被道具擋住、找不到圓的那張就不寫字；擅長的棋子寫在各角色的 pc，要改只改這裡，不用重畫 */
const FACES={};for(const k of["npc","actors","journey"])fetch(`data/${k}/faces.json`).then(r=>r.ok?r.json():{}).then(j=>{FACES[k]=j}).catch(()=>{});
const faceOf=(dir,map,fallback)=>{const F=FACES[dir];if(!F)return null;const o={};for(const[ps,stem]of Object.entries(map))o[ps]=F[stem]||F[fallback]||null;return Object.values(o).some(Boolean)?o:null};
const ACTOR_PC={liuji:"砲",zhangsanfeng:"馬",shinaian:"卒",shenwansan:"象",changyuchun:"砲",wangmian:"砲",tea:"卒",scholar:"士",guard:"車",monk:"象",teller:"砲"};
const NPC_LOOK=(n,side)=>({p:npcPc(n,side),e:store.get("era","classic"),g:9,npc:n.name,about:n.say,hat:n.hat,hc:n.hc,robe:n.robe,band:n.band||null,acc:n.acc||null,cus:n.cus||(n.id?"n:"+n.id:null),shoe:n.shoe||null,belt:n.belt||null,...(n.id?{flat:true,sprite:"data/npc/",spriteMeta:{w:380,h:512},spriteMap:{idle:n.id,think:n.id,move:n.id,happy:n.id,sad:n.id,surprise:n.id},spriteMeta:{w:380,h:512,mask:true,faceOf:faceOf("npc",{idle:n.id,think:n.id,move:n.id,happy:n.id,sad:n.id,surprise:n.id},n.id)}}:{})});   /* 開發者：園子下棋時用路人畫好的形象 */
/* 難度：以玩家等級換算的園子等級（parkLv）為中心，隨機 -1／0／0／+1，限制在電腦的 1～8 級內 */
const parkNpcLv=()=>Math.max(1,Math.min(8,parkLv()+[-1,0,0,1][Math.floor(Math.random()*4)]));
/* 開了新的一盤園子：記下這盤（game）遇到誰；keep＝同一位再下一盤，不然隨機挑一位、不跟上一位重複 */
/* 意見回饋 658：這個朝代有家鄉在這裡的女棋手，七成從她們裡面挑，三成照舊全部隨機（冷門朝代沒人的家鄉，就全部隨機，一樣遇得到人）；不是女棋手的路人照舊 */
/* 回饋 856（開發者 11/9：女棋手分普通／稀有／傳說、機率加保底）：
   等級 WM_RK（沒寫＝普通 common；稀有 rare 5 位、傳說 legend 4 位），名稱和框色沿用珍品的 RELIC_RK（07-legend.js）。
     分級照身分和朝代人數：漢、隋各只有 1 位，不能是普通（不然到那一朝第一盤就遇到）→ 琴師稀有、女將軍傳說；宋 2 位都普通（放鬆好收集的一朝）；
     傳說＝身分最少拋頭露面的四位、各在不同朝代（隋 女將軍、唐 江湖女俠、明 女扮男裝的書生、清 溜出府的格格）；稀有＝有專業、要出遠門或公務在身（漢 琴師、元 馴鷹少女、西域商隊的姑娘、明 女大夫、女捕快）。
   抽法 parkPickW(cand,era,met,pity,rnd)：cand＝候選（已去掉上一位）、met＝{id:1 遇過}、pity＝保底計數、rnd＝亂數。
     1. 保底到頂：這一朝沒遇過的稀有／傳說，計數到 NPC_RARE.hard（稀有 10、傳說 14 盤）就一定是她，保證不會永遠遇不到。
     2. 七成照舊分給這一朝的家鄉女棋手（NPC_RARE.home）：普通的、已經遇過的，每位 0.7÷k（k＝候選裡這一朝的女棋手人數）；
        沒遇過的稀有／傳說只拿 0.7÷k×f，f＝base＋step×計數（稀有 0.12＋0.06×計數、傳說 0.05＋0.04×計數，最多 1）——越久沒遇到越容易遇到；遇過一次就跟普通一樣（羈絆要多次相遇才升級）。
     3. 剩下的照舊從全部候選裡抽：路人、普通、遇過的權重 1；沒遇過的稀有、傳說只有 NPC_RARE.out（在家鄉以外偶爾也碰得到）。
   保底計數 store "npcPity"＝{女棋手 id:從第一次在她家鄉的園子開棋起，又開了幾盤園子棋（哪一朝都算）}（05b-save.js JOURNEY_KEYS，跟存檔走）；遇到了就刪掉。
     所以到那一朝第一盤只有一成左右會遇到她；在別處下得越多，回到她家鄉時越容易遇到，到頂就一定遇到。
   故事線、攔路棋客指定的 keep（07u-women.js wmParkKeep、07h-qqev.js qqParkKeep）照舊優先，不看等級。
   第一次遇到稀有／傳說時記 store "npcFxPend"＝{id,game}，開局時 07u-women.js 的 wmRareFx 播飄落、響一聲磬。模擬：scratchpad wm856/sim.js */
const WM_RK={w09_qin_player:"rare",w11_yuan_falconer:"rare",w12_yuan_merchant:"rare",w18_ming_doctor:"rare",w20_ming_guard:"rare",w10_general:"legend",w06_swordswoman:"legend",w04_ming_scholar:"legend",w05_qing_gege:"legend"};
const NPC_RARE={home:.7,base:{rare:.12,legend:.05},step:{rare:.06,legend:.04},hard:{rare:10,legend:14},out:{rare:.35,legend:.15}};
const npcRk=n=>(n&&WM_RK[n.id])||"common";
function parkPickW(cand,era,met,pity,rnd){const R=NPC_RARE,odd=n=>!!n.era&&npcRk(n)!=="common"&&!met[n.id],home=cand.filter(n=>n.era&&n.era===era),k=home.length;
  for(const n of home)if(odd(n)&&(pity[n.id]||0)>=R.hard[npcRk(n)])return n;
  if(k){let x=rnd();for(const n of home){x-=R.home*(odd(n)?Math.min(1,R.base[npcRk(n)]+R.step[npcRk(n)]*(pity[n.id]||0)):1)/k;if(x<0)return n}}
  const w=n=>odd(n)?R.out[npcRk(n)]:1,tot=cand.reduce((a,n)=>a+w(n),0);let y=rnd()*tot;for(const n of cand){y-=w(n);if(y<0)return n}return cand[cand.length-1]}
/* 保底計數：在她的家鄉朝代第一次開園子棋那一盤開始算（計數 0），之後不管在哪一朝，每開一盤 +1；遇到她就刪掉 */
function npcPityStep(P,era,n,met){for(const id in P)if(met[id]||id===n.id)delete P[id];else P[id]++;for(const w of PARK_NPC)if(w.era&&w.era===era&&w.id!==n.id&&npcRk(w)!=="common"&&!met[w.id]&&P[w.id]==null)P[w.id]=0;return P}
function parkNpcNew(game,lv,keep){if(!keep&&typeof qqParkKeep==="function")try{keep=qqParkKeep(store.get("era","classic"))}catch(e){}   /* 千秋穿梭突發事件：押著東西的攔路棋客，在她那一朝的園子一定遇到她 */
  const last=store.get("parkNpcLast",""),era=store.get("era","classic"),pool=PARK_NPC.filter(n=>n.id!==last),M=store.get("npcBond",{})||{},met={};for(const id in M)if(M[id]&&M[id].m)met[id]=1;
  const P=store.get("npcPity",{})||{},n=(keep&&PARK_NPC.find(x=>x.id===keep))||parkPickW(pool,era,met,P,Math.random);   /* 回饋 856：照等級和保底抽（keep 照舊優先） */
  try{npcPityStep(P,era,n,met);store.set("npcPity",P);
    if(n.era&&npcRk(n)!=="common"&&!met[n.id])store.set("npcFxPend",{id:n.id,game})}catch(e){}   /* 回饋 856：家鄉朝代每開一盤沒遇到，她的保底 +1；第一次遇到稀有／傳說，開局播飄落 */
  store.set("parkNpcLast",n.id);store.set("parkNpc",{game,id:n.id,lv});if(n.era&&typeof npcMet==="function")npcMet(n);return n}
/* 這盤園子的對手是誰（舊的、沒有記錄的盤用編號固定挑一位，不會每次重畫換人） */
function parkNpcOf(st){if(!st||st.journey!=="park"||st.arena)return null;const r=store.get("parkNpc",null);if(r&&r.game===st.id)return PARK_NPC.find(x=>x.id===r.id)||PARK_NPC[0];
  let h=0;for(const c of String(st.id||""))h=(h*31+c.charCodeAt(0))>>>0;return PARK_NPC[h%PARK_NPC.length]}
const NPC_FTOP={"amah":5.5,"niao":17.7,"tiaoshui":10.1,"w01_tang_lady":18.1,"w02_song_tea":3.4,"w03_yuan_rider":18.5,"w04_ming_scholar":13.1,"w05_qing_gege":7.6,"w09_qin_player":30.7,"w10_general":5.1,"w11_yuan_falconer":10.5,"w13_yuan_singer":37.1,"w16_ming_poet":6.7,"w17_ming_pipa":5.1,"w19_ming_teahouse":8.4,"w20_ming_guard":3.8};/* 意見回饋 809：人物畫得低的圖，頭像往上對齊頭頂 */
const npcHTML=(side,n,sub)=>`<div class="av ${side} npc" role="button" tabindex="0" data-axk aria-label="看${esc(n.name)}的 3D 人物">${esc(npcPc(n,side))}<img src="${n.img||`data/npc/${n.id}.webp`}"${!n.img&&NPC_FTOP[n.id]?` style="top:-${NPC_FTOP[n.id]}%"`:""} alt="" onerror="this.remove()"></div><div class="nm"><b>${esc(n.name)}</b><span>${esc(sub||"")}</span></div>`;
let NPC_HI=null;   /* 已經打過招呼的那盤園子（同一個 3D 園子裡再下一盤時，新的對手開口打招呼） */
const PIKA_LOOK=side=>({cus:"k:"+(/pika2/.test(String(PIKA_META_DIR||""))?"pika2":"pika"),p:side==="r"?"帥":"將",e:store.get("era","classic"),g:1,thin:true,wl:true,flat:!!PIKA_META,sprite:PIKA_META?PIKA_META_DIR:null,spriteMeta:PIKA_META});
/* 驛站旅人、秘境棋友：data/actors/<id>.webp（一張立繪，六種表情共用）；3D 人物檢視時用帽子顏色配的立體小人 */
/* 驛站旅人、秘境棋友的 3D 小人造型（帽子、帽色、衣服）：選「3D 立體小人」時用，每個人看得出不一樣 */
const ACTOR_FIG={liuji:["fangjin","#151515","#2F4A6B"],zhangsanfeng:["bun","#E8E6E0","#5E6B5C"],shinaian:["scholar","#1E1A16","#6A4E3A"],shenwansan:["futou","#3a2a1e","#8A5A2B"],changyuchun:["helmet","#6B6B6B","#8E2A22"],wangmian:["bun","#1E1A16","#4E6B3A"],
  tea:["bun","#D8D6D0","#7A6A50"],scholar:["fangjin","#151515","#3E6FA8"],guard:["helmet","#5A5A5A","#5A2420"],monk:["hair","#E2C29A","#C98A2E"],teller:["wusha","#1E1A16","#6B3A5A"]};
/* 11/12 開發者「等模型驗收完再自動開啟真實 3D」：笑面掌櫃 k_zg 驗收通過後，對手形象沒選過的人（還沒選角色的新玩家）預設也是真實 3D（原本 "3d"＝Q 版；選角色時 05b-save 本來就會設 real）。05-settings、08s-simul、09b-preload 的預設一起改 */
const oppArt=()=>store.get("oppLook","real")==="art";
/* 意見回饋 491（開發者）：玩家可以選男生（小帥）或女生，Q 版或真實 3D；園子裡坐在你這一側的就是你選的 */
const mySex=()=>store.get("pSex","m"),myStyle=()=>store.get("pStyle","q");
/* 意見回饋 545：身上的字跟著「換棋子」選的那顆（原本小帥妹、真實版都寫死「帥」） */
const myPc=()=>{{const x=store.get("pChar","");if(WX_CHARS[x]&&WX_CHARS[x].pc)return WX_CHARS[x].pc}   /* 意見回饋 668：雲河七星的棋子就是本命棋子（鎖定） */const c=store.get("botPiece","帥");return typeof c==="string"&&c.length===1&&"帥仕相俥傌炮兵將士象車馬砲卒".includes(c)?c:"帥"};
/* 開發者 11/5：四位武俠風格的原創角色也可以選（pChar；空白＝小帥／小帥妹）。sx＝男女，用在其他還只有男女兩種的地方 */
/* 意見回饋 646（開發者 11/6）：資深玩家說「沒有逍遙哥哥」——四位要拉開跟既有武俠作品的距離。改成原創的「雲河四子」，各綁一顆棋子（pc＝選這位時預設的棋子、s＝選角卡小字、t＝一句話身分、say＝口頭禪、old＝舊稱呼）
   造型代號 x_swordboy 等不變，舊存檔照樣能用 */
/* 開發者 11/6 再改：世界觀「雲河星槎」後俥來自秦朝，改用秦代常見的單名：齊轍（阿轍，車輪壓出的痕跡＝車走直路、配車輪腰牌）。意見回饋 660：雲河四子定名（開發者 11/6 從 Gemini 第二版取名提案選定）：俥・齊長路（阿路）、相・田飛燕（燕子）、炮・雷借花（花兒）、傌・駱躍梅（小梅）；nk＝小名，was＝舊名（小幫手搜尋用） */
/* 意見回饋 678（開發者 11/6）：era 朝代、born 出生年、up 上船那年；bio 開頭加「【朝代・出生年】」，選角的 ⓘ 故事卡看得到 */
const WX_CHARS={x_swordboy:{n:"齊轍",era:"秦",born:"秦王政二十二年（前 225）",up:"始皇三十五年（前 212）修直道那年上船，十三歲",bio:"【秦・秦王政二十二年（前 225）生】秦朝馳道上運糧車夫的兒子，十三歲。始皇下令「車同軌」，父親有一回抄小路誤了期，被人說成走歪路；從此他發誓只走直路。其實他不太識字，棋譜都是靠記形狀記住的。",nk:"阿轍",was:"齊長路",sx:"m",pc:"俥",s:"俥・秦・車夫之子",t:"秦朝馳道上運糧車夫的兒子，只肯走直路",say:"看準了，就一直走！",old:"劍客少年",start:["看準了，就一直走！","這盤，我走直路。"],cap:["直直衝過去，拿下！","這條路是我的！"],win:["看準了，一直走——贏了！","直路也能走到底！"],lose:["……我是不是又衝太快了？","下次我先看清楚路。"],draw:["誰也過不去，那就改天再走。"]},x_spiritgirl:{n:"田飛燕",era:"南北朝・劉宋",born:"元嘉十五年（438）",up:"元嘉二十七年（450）北魏飲馬長江那年上船，十二歲",bio:"【南北朝・劉宋・元嘉十五年（438）生】南北朝一江分南北，她在江邊渡口的茶棚長大，十二歲。媽媽在南渡的人潮裡失散，她守著茶棚不肯過江，怕媽媽回來找不到家；白天溫柔安靜，夜裡卻偷偷練狠狠的殺法。",nk:"燕子",was:"田恬",sx:"f",pc:"相",s:"相・南北朝・渡口茶棚",t:"一江分南北，守在江邊渡口茶棚、不肯過江的姑娘",say:"慢慢來，先把家顧好。",old:"靈族少女",start:["慢慢來，先把家顧好。","請多指教。我守，你攻。"],cap:["這顆，我收下了。","過了河的，就別想回去。"],win:["家顧好了，才能贏。","慢慢來，還是贏了。"],lose:["沒關係，我再把家守緊一點。","……今晚再去石桌上練練。"],draw:["守住了，也算沒輸。"]},x_martialgirl:{n:"雷借花",era:"南宋",born:"乾道七年（1171）",up:"淳熙十年（1183）臨安元宵那年上船，十二歲",bio:"【南宋・乾道七年（1171）生】南宋臨安煙火作坊的女兒，十三歲。小時候玩火藥炸傷了爺爺的耳朵，從此說話特別大聲，好讓爺爺聽得見；其實她最怕打雷。",nk:"花兒",was:"雷響響",sx:"f",pc:"炮",s:"炮・宋・臨安煙火作坊",t:"南宋臨安煙火作坊的女兒，最愛隔山打牛",say:"隔一個，剛剛好！",old:"江湖女俠",start:["隔一個，剛剛好！","準備好了沒？要開炮囉！"],cap:["砰！隔一個，剛剛好！","聽到沒？這一聲是我的！"],win:["贏啦！爺爺你聽見了嗎？","煙火放完，這盤是我的！"],lose:["……沒放響。再來一盤！","可惡，這次被悶住了。"],draw:["雷聲大雨點小，算了，和棋！"]},x_miaogirl:{n:"駱躍梅",era:"元",born:"大德九年（1305）",up:"延祐三年（1316）上船，十一歲",bio:"【元・大德九年（1305）生】元朝草原驛站（站赤）馬槽裡撿來的孩子，十一歲，七人中最小。頭上的鈸笠帽是養父老駱當驛騎時戴的，阿娘把帽圈收小、在帽頂縫了一顆紅珠：「跑多遠，我們都看得見你。」",nk:"小梅",was:"駱跳跳",sx:"f",pc:"傌",s:"傌・元・草原驛站",t:"元朝草原驛站（站赤）撿來的孩子，走日字、最會拐彎",say:"前面堵住了？那我拐個彎！",old:"苗疆少女",start:["走日字，最會拐彎！","這條路我認得，跟我來！","坐不住啦，我先跳一步！"],cap:["拐個彎，就到你家了！","前面堵住了？那我繞過去！"],win:["我就說繞路比較快！","驛道上每條路我都認得！","嘿嘿，彎路也能先到！"],lose:["唉，這條路走錯了……","下次換一條路試試。","哎呀，馬腳被蹩住了……換條路再來！"],draw:["走了一大圈，回到原地啦。"]},
  /* 意見回饋 668：雲河七星後三位（開發者 11/6 定案；預覽圖 xs/prev_x_*.webp、3D art/tripo_app/x_*.glb 已就緒） */
  x_shuai:{n:"沈方庭",nk:"方庭",sx:"m",pc:"帥",s:"帥・明・徽州當鋪少爺",t:"明朝徽州當鋪老闆的獨子，天生氣喘、被關在院子裡",era:"明",born:"隆慶三年（1569）",up:"萬曆十年（1582）上船，十三歲",bio:"【明・隆慶三年（1569）生】明朝徽州當鋪老闆的獨子，十三歲。天生氣喘，被家裡嚴令只能待在院子裡，常在窗邊看別的孩子玩；他最想做的，是有一天親自走出那道門。",say:"我就在這裡，哪也不去。",old:"",start:["我就在這裡，哪也不去。","九宮雖小，也是我的棋盤。"],cap:["我也能親自出手！","別小看待在院子裡的人。"],win:["我……我也走出去了一步！","原來自己站出來，是這種感覺。"],lose:["咳……下次，我不再躲在後面。","沒關係，我記住這盤了。"],draw:["守住了九宮，也不算輸。"]},
  x_shi:{n:"鐵連城",nk:"城子",sx:"m",pc:"仕",s:"仕・明・鄰家哥哥",t:"徽州當鋪掌櫃的兒子，從小貼身護著少爺的鄰家哥哥",era:"明",born:"隆慶二年（1568）",up:"萬曆十年（1582）上船，十四歲",bio:"【明・隆慶二年（1568）生】徽州當鋪掌櫃的兒子，十四歲，住在沈家隔壁，跟方庭一起長大。小時候為了護住方庭受過傷，從此覺得自己只有當盾牌才有用；其實他很想去遠方看看。",say:"有我在，誰也別想碰他。",old:"",start:["有我在，誰也別想碰他。","我守在這兒，你放心攻。"],cap:["想碰他？先過我這關！","擋下來了，還順手吃一個。"],win:["守得住，才贏得了。","這次不只是擋，我也往前了。"],lose:["是我沒擋好……","下次我護得更緊。"],draw:["誰也沒碰到誰，正好。"]},
  x_bing:{n:"步越溪",nk:"溪兒",sx:"f",pc:"兵",s:"兵・清・揚州跑腿丫頭",t:"清朝揚州城裡跑腿送貨的窮丫頭，只會往前衝",era:"清",born:"乾隆十八年（1753）",up:"乾隆三十年（1765）南巡揚州那年上船，十二歲",bio:"【清・乾隆十八年（1753）生】清朝揚州城裡幫人跑腿送貨的窮丫頭，十二歲，無父無母。只會拼命往前衝、不敢回頭看；身上有塊傳了好多代的破布，繡著半個「卒」字。",say:"往前走，絕不退！",old:"",start:["往前走，絕不退！","過了河，我就能橫著走！"],cap:["一步一步，走到你面前了！","小卒子也能咬人！"],win:["一直往前走，總會走到對岸！","看吧，小兵也能贏！"],lose:["……不能回頭，那就再衝一次！","下次我走得更穩。"],draw:["還沒過河呢，下次再來！"]}};
/* 意見回饋 679（開發者 11/6）：點 3D 角色身上的物件，看它的介紹和故事。u＝正面看過去的左右（以身高為 1，右為正）、v＝高度（腳底 0、頭頂 1），side 1 只認正面、-1 只認背面、0 都認；ln 是斜線（背上的劍）。量自 11/6 的模型，換模型要重量 */
const WX_PC_RULE={俥:"車走直線，一步就能走到底，是棋盤上威力最大的子。",相:"相走田字、不能過河，是守家的子；田字中間有子擋住，叫「塞象眼」，就飛不過去。",炮:"炮也走直線，但吃子時要隔一個子當炮架，這個子叫「炮架」。",傌:"馬走日字，最會拐彎；前面貼著一顆子就會「蹩馬腳」，跳不過去。",帥:"帥只在九宮裡走，一次一步；將和帥不能在同一條直線上照面。",仕:"仕只在九宮裡斜走一步，貼身護著帥。",兵:"兵只能往前走；過了河，就能左右橫走。"};
const WX_ITEMS={"x_swordboy":[{"n":"紅髮帶","t":"秦朝車夫家的孩子都綁紅髮帶，趕車時汗才不會流進眼睛。阿轍說，髮帶綁緊了，路就看得直。","u":[-0.2,0.2],"v":[0.72,0.82],"side":0},{"n":"木直劍","t":"阿轍自己削的木頭直劍。他說劍跟車一樣，要直才有力。修直道那天，他就是用它撬開了陷在泥溝裡的車輪。","u":[0.17,0.33],"v":[0.56,0.74],"side":0},{"n":"木直劍","t":"阿轍自己削的木頭直劍。他說劍跟車一樣，要直才有力。修直道那天，他就是用它撬開了陷在泥溝裡的車輪。","ln":[[0.25,0.68],[-0.22,0.12]],"w":0.05,"side":-1},{"n":"青銅車輪紋腰牌","t":"父親齊老趕官糧車用的青銅腰牌，刻著車輪的輻條。秦朝「車同軌」，天下的車輪一樣寬，才走得上馳道。阿轍上船那夜，手裡死死攥著它。","u":[0.07,0.22],"v":[0.12,0.3],"side":1},{"n":"黑布護腕","t":"趕車拉韁繩時，袖口最怕被車轅勾住，阿轍就用黑布把手腕纏得緊緊的。秦朝崇尚黑色，官府的衣服、旗子也多是黑的。","u":[-0.345,-0.228],"v":[0.225,0.36],"side":1},{"n":"黑布護腕","t":"趕車拉韁繩時，袖口最怕被車轅勾住，阿轍就用黑布把手腕纏得緊緊的。秦朝崇尚黑色，官府的衣服、旗子也多是黑的。","u":[0.236,0.345],"v":[0.225,0.36],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。阿轍總嫌手套滑溜溜的，不像握韁繩那麼踏實；可是要下棋了，他還是乖乖戴上。","u":[-0.35,-0.245],"v":[0.11,0.235],"side":0,"see":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。阿轍總嫌手套滑溜溜的，不像握韁繩那麼踏實；可是要下棋了，他還是乖乖戴上。","u":[0.24,0.345],"v":[0.11,0.235],"side":0,"see":1},{"n":"腰帶與紅方扣","t":"綠腰帶底下還繫著一條皮腰帶，正中一塊紅方扣。阿轍說，爹的腰牌要掛在最牢靠的帶子上，路再顛也不會掉。","u":[-0.27,0.29],"v":[0.14,0.232],"side":1},{"n":"說書人給的舊鞋","t":"落水那夜，阿轍掉了一隻鞋，說書人從竹筐裡拿出這雙舊布鞋給他。鞋大了一點，黑布早褪成灰；他把鞋帶綁了兩圈——路還長，鞋不能掉。","u":[-0.16,0.16],"v":[0,0.075],"side":0},{"n":"髮髻","t":"秦朝男子把頭髮在頭頂盤成髻，再用髮帶束緊。阿轍天天自己綁，綁得跟他的脾氣一樣硬。","u":[-0.1,0.1],"v":[0.84,1],"side":0},{"n":"綠腰帶","t":"綠色的寬腰帶。趕車時繫緊了，顛簸的山路上肚子才不會被車轅撞疼。","u":[-0.27,0.27],"v":[0.23,0.34],"side":1},{"n":"粗布短衣與坎肩","t":"車夫家的粗布短衣，外面套一件深藍坎肩。袖口磨破了好幾次，都是娘一針一線補好的。","u":[-0.34,0.34],"v":[0.33,0.6],"side":1},{"pc":1,"u":[-0.27,0.27],"v":[0.02,0.27],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。阿轍總嫌手套滑溜溜的，不像握韁繩那麼踏實；可是要下棋了，他還是乖乖戴上。","u":[-0.36,-0.275],"v":[0.11,0.235],"side":0,"see":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。阿轍總嫌手套滑溜溜的，不像握韁繩那麼踏實；可是要下棋了，他還是乖乖戴上。","u":[0.275,0.355],"v":[0.11,0.235],"side":0,"see":-1},{"pc":1,"u":[-0.28,0.28],"v":[0.05,0.62],"side":-1},{"n":"黑布護腕","t":"趕車拉韁繩時，袖口最怕被車轅勾住，阿轍就用黑布把手腕纏得緊緊的。秦朝崇尚黑色，官府的衣服、旗子也多是黑的。","u":[-0.345,-0.215],"v":[0.2,0.36],"side":-1},{"n":"黑布護腕","t":"趕車拉韁繩時，袖口最怕被車轅勾住，阿轍就用黑布把手腕纏得緊緊的。秦朝崇尚黑色，官府的衣服、旗子也多是黑的。","u":[0.215,0.345],"v":[0.2,0.36],"side":-1}],"x_spiritgirl":[{"n":"青玉雙燕環","t":"兩隻燕子首尾相銜的青玉環，是娘留下的。燕子秋天南飛、春天回來。娘說：「燕子會回來，娘也會。」","u":[0.22,0.37],"v":[0.06,0.24],"side":0},{"n":"白色彎月髮簪","t":"頭上那支白色彎月髮簪。燕子說，江南、江北看到的是同一個月亮；娘不管走到哪裡，抬頭也看得見它。","u":[0.09,0.195],"v":[0.83,0.97],"side":0},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。燕子每晚都把手套洗乾淨，晾在船舷上，就像在茶棚收茶碗一樣仔細。","u":[-0.41,-0.295],"v":[0.215,0.335],"side":0,"see":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。燕子每晚都把手套洗乾淨，晾在船舷上，就像在茶棚收茶碗一樣仔細。","u":[0.265,0.345],"v":[0.235,0.325],"side":0,"see":1},{"n":"白披帛","t":"南朝女子挽在臂彎的長帛。燕子在渡口茶棚倒茶時，披帛被江風一吹，就像江面上的白浪。","u":[-0.42,-0.27],"v":[0.1,0.74],"side":0},{"n":"白披帛","t":"南朝女子挽在臂彎的長帛。燕子在渡口茶棚倒茶時，披帛被江風一吹，就像江面上的白浪。","u":[0.27,0.42],"v":[0.3,0.74],"side":0},{"n":"腰帶與紅方扣","t":"腰上一條腰帶，正中一塊紅方扣。在茶棚裡提著大茶壺跑來跑去，腰帶繫緊了，裙子才不會絆腳。","u":[-0.29,0.29],"v":[0.19,0.29],"side":1},{"n":"青綠布鞋","t":"渡口的泥地一下雨就滑，燕子的布鞋染成江水那樣的青綠色。她說，媽媽回來的時候，一低頭就認得出她。","u":[-0.2,0.16],"v":[0.03,0.11],"side":0},{"pc":1,"u":[-0.31,0.31],"v":[0.06,0.63],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。燕子每晚都把手套洗乾淨，晾在船舷上，就像在茶棚收茶碗一樣仔細。","u":[-0.42,-0.275],"v":[0.215,0.335],"side":0,"see":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。燕子每晚都把手套洗乾淨，晾在船舷上，就像在茶棚收茶碗一樣仔細。","u":[0.275,0.355],"v":[0.235,0.325],"side":0,"see":-1},{"n":"一頭長髮","t":"燕子的頭髮又長又黑，平常披著；忙著煮茶時，就用那支彎月髮簪別起來。","u":[-0.3,0.3],"v":[0.2,0.99],"side":-1}],"x_martialgirl":[{"n":"竹節小炮架髮簪","t":"爺爺搭煙火架剩下的竹料，花兒自己削成小炮架插在頭上。炮要隔一個子才打得響，煙火也要有架子，才放得上天。","u":[-0.28,-0.02],"v":[0.82,0.98],"side":0},{"n":"銀領扣","t":"白披肩在領口用一顆銀扣扣住。爺爺說守著煙火爐，披肩一定要扣好，衣角才不會飄進火裡。","u":[-0.045,0.06],"v":[0.49,0.56],"side":1},{"n":"短劍","t":"作坊裡防身用的短劍。花兒很少拔出來，她說真正厲害的是煙火，不是劍。","u":[0.12,0.32],"v":[0.5,0.73],"side":0},{"n":"短劍","t":"作坊裡防身用的短劍。花兒很少拔出來，她說真正厲害的是煙火，不是劍。","ln":[[0.25,0.72],[0,0.36]],"w":0.04,"side":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。花兒最怕把手套弄髒——在煙火作坊裡，她的手從來沒有白過一天。","u":[-0.345,-0.255],"v":[0.12,0.265],"side":0,"see":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。花兒最怕把手套弄髒——在煙火作坊裡，她的手從來沒有白過一天。","u":[0.255,0.345],"v":[0.12,0.26],"side":0,"see":1},{"n":"白披肩","t":"臨安的冬天冷，爺爺怕她守著煙火爐著涼，給她披上的白披肩。上面還有幾點被火星燙出來的小洞。","u":[-0.4,0.4],"v":[0.08,0.6],"side":-1},{"n":"白披肩","t":"臨安的冬天冷，爺爺怕她守著煙火爐著涼，給她披上的白披肩。上面還有幾點被火星燙出來的小洞。","u":[-0.42,-0.25],"v":[0.08,0.5],"side":1},{"n":"白披肩","t":"臨安的冬天冷，爺爺怕她守著煙火爐著涼，給她披上的白披肩。上面還有幾點被火星燙出來的小洞。","u":[0.25,0.42],"v":[0.08,0.5],"side":1},{"n":"雙圓髻與紅緞帶","t":"頭上兩個圓髻用紅緞帶綁著。煙火放上天的時候，花兒最愛甩著緞帶跟著跳。","u":[-0.42,-0.16],"v":[0.42,0.98],"side":0},{"n":"雙圓髻與紅緞帶","t":"頭上兩個圓髻用紅緞帶綁著。煙火放上天的時候，花兒最愛甩著緞帶跟著跳。","u":[0.16,0.42],"v":[0.45,0.98],"side":0},{"n":"朱紅短打","t":"朱紅色的短打，方便在作坊裡搬煙火、跑上跑下。被火藥燻黑了，紅色也看不太出來。","u":[-0.3,-0.15],"v":[0.42,0.56],"side":1},{"n":"朱紅短打","t":"朱紅色的短打，方便在作坊裡搬煙火、跑上跑下。被火藥燻黑了，紅色也看不太出來。","u":[0.15,0.3],"v":[0.42,0.56],"side":1},{"n":"腰帶與紅方扣","t":"腰上一條腰帶，中間扣著紅方扣。元宵前作坊最忙，花兒把腰帶勒得緊緊的，一口氣搬好幾筐煙火也不喊累。","u":[-0.28,0.28],"v":[0.15,0.24],"side":1},{"n":"紅布鞋","t":"作坊包爆竹剩下的紅布，爺爺給她縫成一雙紅鞋。鞋尖被火星燙出幾個小黑點，她捨不得換。","u":[-0.16,0.16],"v":[0,0.075],"side":0},{"pc":1,"u":[-0.27,0.27],"v":[0.06,0.53],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。花兒最怕把手套弄髒——在煙火作坊裡，她的手從來沒有白過一天。","u":[-0.355,-0.275],"v":[0.12,0.265],"side":0,"see":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。花兒最怕把手套弄髒——在煙火作坊裡，她的手從來沒有白過一天。","u":[0.275,0.355],"v":[0.12,0.26],"side":0,"see":-1}],"x_miaogirl":[{"n":"帽頂紅珠","t":"西域商隊留下的紅琉璃珠。阿娘把它縫在帽頂最高的地方：「跑多遠，我們都看得見你。」","u":[-0.04,0.04],"v":[0.955,1],"side":0},{"n":"銀耳環","t":"元朝的草原上，女孩子、甚至大男人都愛戴耳環。小梅這對小銀圈，是阿娘把自己年輕時戴的那對改小給她的。","u":[-0.165,-0.1],"v":[0.545,0.64],"side":0,"see":1},{"n":"銀耳環","t":"元朝的草原上，女孩子、甚至大男人都愛戴耳環。小梅這對小銀圈，是阿娘把自己年輕時戴的那對改小給她的。","u":[0.1,0.165],"v":[0.545,0.64],"side":0,"see":1},{"n":"紅繩領結","t":"披肩在脖子前用紅繩打一個結。小梅自己還綁不好，每天出門前都要阿娘幫她繫上，再拍拍她的帽子說：「別跑太遠。」","u":[-0.08,0.08],"v":[0.41,0.58],"side":1},{"n":"紅帽繩","t":"鈸笠帽兩邊垂下紅帽繩，在下巴底下打個結。草原上風大，帽繩一繫，騎馬跑得再快，帽子也不會被吹走。","u":[-0.17,-0.125],"v":[0.6,0.76],"side":1},{"n":"紅帽繩","t":"鈸笠帽兩邊垂下紅帽繩，在下巴底下打個結。草原上風大，帽繩一繫，騎馬跑得再快，帽子也不會被吹走。","u":[0.125,0.17],"v":[0.6,0.76],"side":1},{"n":"銀項圈","t":"驛站裡的大人說，戴銀項圈的孩子會平平安安長大。這是老駱夫婦給小梅的。","ln":[[-0.11,0.545],[-0.05,0.495]],"w":0.035,"side":1},{"n":"銀項圈","t":"驛站裡的大人說，戴銀項圈的孩子會平平安安長大。這是老駱夫婦給小梅的。","ln":[[-0.05,0.49],[0.05,0.49]],"w":0.025,"side":1},{"n":"銀項圈","t":"驛站裡的大人說，戴銀項圈的孩子會平平安安長大。這是老駱夫婦給小梅的。","ln":[[0.05,0.495],[0.11,0.545]],"w":0.035,"side":1},{"n":"紅布小馬","t":"阿娘用碎紅布縫的小馬，裡面塞滿棉絮。小梅走到哪都帶著，說馬走日字，最會拐彎。","u":[0.105,0.245],"v":[0.455,0.6],"side":0},{"n":"銀鈴手鐲","t":"手腕上的銀鈴，一跑就叮叮響。阿娘說：「聽到鈴聲，就知道小梅回來了。」","u":[-0.3,-0.205],"v":[0.25,0.325],"side":0},{"n":"銀鈴手鐲","t":"手腕上的銀鈴，一跑就叮叮響。阿娘說：「聽到鈴聲，就知道小梅回來了。」","u":[0.205,0.3],"v":[0.25,0.325],"side":0},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。小梅的手套戴在銀鈴手鐲底下，她一抬手，鈴就叮叮響，大家都知道她要落子了。","u":[-0.31,-0.21],"v":[0.175,0.26],"side":0,"see":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。小梅的手套戴在銀鈴手鐲底下，她一抬手，鈴就叮叮響，大家都知道她要落子了。","u":[0.21,0.31],"v":[0.175,0.26],"side":0,"see":1},{"n":"腰帶與紅方扣","t":"腰上一條皮腰帶，正中一塊紅方扣。老駱教她：上馬前先把腰帶繫緊，馬再顛，身子也坐得穩。","u":[-0.2,0.2],"v":[0.2,0.28],"side":1},{"n":"腰帶與紅方扣","t":"腰上一條皮腰帶，正中一塊紅方扣。老駱教她：上馬前先把腰帶繫緊，馬再顛，身子也坐得穩。","u":[-0.2,0.2],"v":[0.2,0.27],"side":-1},{"n":"繡花小皮靴","t":"阿娘用熟牛皮縫的小靴，鞋面繡了幾朵花。跑了一趟沙地，花都被沙蓋住了，小梅蹲下來拍乾淨，再接著跑。","u":[-0.1,0.1],"v":[0,0.1],"side":0},{"n":"紫色繡花披肩","t":"草原的風大，阿娘在披肩上繡滿了花。小梅坐不住，披肩老是歪到一邊。","u":[-0.33,0.33],"v":[0.42,0.53],"side":1},{"n":"紫色繡花披肩","t":"草原的風大，阿娘在披肩上繡滿了花。小梅坐不住，披肩老是歪到一邊。","u":[-0.32,0.32],"v":[0.37,0.58],"side":-1},{"n":"鈸笠帽","t":"養父老駱年輕時當驛騎戴的舊帽，阿娘把帽圈收小給小梅戴。帽簷很寬，草原的太陽和風沙都擋得住。","u":[-0.29,0.29],"v":[0.7,0.955],"side":0},{"n":"兩條長辮","t":"兩條長辮子是阿娘每天早上幫她編的。小梅騎馬一跑，辮子就在身後甩呀甩。","u":[-0.39,-0.2],"v":[0.5,0.62],"side":0},{"n":"兩條長辮","t":"兩條長辮子是阿娘每天早上幫她編的。小梅騎馬一跑，辮子就在身後甩呀甩。","u":[0.2,0.39],"v":[0.5,0.62],"side":0},{"pc":1,"u":[-0.215,0.215],"v":[0.13,0.42],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。小梅的手套戴在銀鈴手鐲底下，她一抬手，鈴就叮叮響，大家都知道她要落子了。","u":[-0.31,-0.21],"v":[0.175,0.26],"side":0,"see":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。小梅的手套戴在銀鈴手鐲底下，她一抬手，鈴就叮叮響，大家都知道她要落子了。","u":[0.21,0.31],"v":[0.175,0.26],"side":0,"see":-1},{"pc":1,"u":[-0.215,0.215],"v":[0.13,0.37],"side":-1}],"x_shuai":[{"n":"金方型長命鎖","t":"沈家為體弱的獨子打的金長命鎖，盼他長命百歲。方庭一緊張，就會伸手按住它。","u":[-0.07,0.07],"v":[0.2,0.54],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。方庭戴得最端正，每根手指都拉得平平整整，像在家裡讀書前，先把書桌擦乾淨一樣。","u":[-0.37,-0.255],"v":[0.15,0.27],"side":0,"see":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。方庭戴得最端正，每根手指都拉得平平整整，像在家裡讀書前，先把書桌擦乾淨一樣。","u":[0.245,0.36],"v":[0.15,0.262],"side":0,"see":1},{"n":"腰帶與紅方扣","t":"袍子下面還繫著一條腰帶，正中一塊紅方扣。方庭每天都把它扣得端端正正，他說：帥坐在九宮正中間，扣子也要擺在正中間。","u":[-0.08,0.09],"v":[0.11,0.205],"side":1},{"n":"腰帶與紅方扣","t":"袍子下面還繫著一條腰帶，正中一塊紅方扣。方庭每天都把它扣得端端正正，他說：帥坐在九宮正中間，扣子也要擺在正中間。","u":[-0.3,0.3],"v":[0.155,0.21],"side":1},{"n":"書生方巾","t":"明朝讀書人戴的方巾。方庭因為氣喘不能出門，只能在院子裡讀書，抬頭看別人家的風箏。","u":[-0.18,0.18],"v":[0.78,1],"side":0},{"n":"朱紅雲紋錦緞","t":"朱紅雲紋錦緞做的長袍，是當鋪少爺的衣裳。料子很好，方庭卻常說，他寧可換一件能出門跑跳的粗布衣。","u":[-0.37,-0.2],"v":[0.25,0.52],"side":0},{"n":"朱紅雲紋錦緞","t":"朱紅雲紋錦緞做的長袍，是當鋪少爺的衣裳。料子很好，方庭卻常說，他寧可換一件能出門跑跳的粗布衣。","u":[0.2,0.37],"v":[0.25,0.52],"side":0},{"n":"黃絲絛","t":"腰間繫一條黃色絲絛，長命鎖的流蘇就垂在它下面。明朝男子穿袍子，常在腰上繫一條絲絛。","u":[-0.215,0.215],"v":[0.28,0.355],"side":1},{"n":"黑緞背心","t":"朱紅錦袍外面再罩一件黑緞背心。娘怕他著涼又犯氣喘，天氣一轉涼，就要他多穿一件。","u":[-0.235,-0.035],"v":[0.205,0.6],"side":1},{"n":"黑緞背心","t":"朱紅錦袍外面再罩一件黑緞背心。娘怕他著涼又犯氣喘，天氣一轉涼，就要他多穿一件。","u":[0.05,0.255],"v":[0.205,0.6],"side":1},{"n":"藏青緞鞋","t":"沈家給少爺做的藏青緞面鞋，鞋底乾乾淨淨，幾乎沒沾過院子外的土。方庭最想要的，是讓這雙鞋也沾一次門外的泥。","u":[-0.16,0.16],"v":[0,0.075],"side":0},{"pc":1,"u":[-0.27,0.27],"v":[0.05,0.2],"side":1},{"n":"朱紅雲紋錦緞","t":"朱紅雲紋錦緞做的長袍，是當鋪少爺的衣裳。料子很好，方庭卻常說，他寧可換一件能出門跑跳的粗布衣。","u":[-0.22,0.22],"v":[0.2,0.6],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。方庭戴得最端正，每根手指都拉得平平整整，像在家裡讀書前，先把書桌擦乾淨一樣。","u":[-0.38,-0.275],"v":[0.15,0.27],"side":0,"see":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。方庭戴得最端正，每根手指都拉得平平整整，像在家裡讀書前，先把書桌擦乾淨一樣。","u":[0.275,0.37],"v":[0.15,0.262],"side":0,"see":-1},{"pc":1,"u":[-0.28,0.28],"v":[0.06,0.65],"side":-1}],"x_shi":[{"n":"交叉紅繩雙木護腕","t":"兩塊硬木用紅繩交叉綁緊的護腕。連城從小擋在方庭前面，護腕上全是刮痕；紅繩是他自己一圈一圈纏上去的。","u":[-0.36,-0.21],"v":[0.24,0.38],"side":0},{"n":"交叉紅繩雙木護腕","t":"兩塊硬木用紅繩交叉綁緊的護腕。連城從小擋在方庭前面，護腕上全是刮痕；紅繩是他自己一圈一圈纏上去的。","u":[0.21,0.36],"v":[0.24,0.38],"side":0},{"n":"短馬尾","t":"連城的頭髮綁成短短的馬尾，俐落省事，隨時跳起來就能護人。","u":[-0.1,0.22],"v":[0.87,1.02],"side":0},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。連城的手套總比別人髒得快——有什麼東西飛過來，他總是先伸手替方庭擋下。","u":[-0.355,-0.26],"v":[0.13,0.237],"side":0,"see":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。連城的手套總比別人髒得快——有什麼東西飛過來，他總是先伸手替方庭擋下。","u":[0.26,0.345],"v":[0.13,0.235],"side":0,"see":1},{"n":"腰帶與紅方扣","t":"紅腰帶底下還壓著一條皮腰帶，中間是紅方扣。連城說兩條帶子一起綁，擋人的時候腰才使得上力。","u":[-0.055,0.07],"v":[0.115,0.25],"side":1},{"n":"紅腰帶","t":"紅色的寬腰帶，連城每天綁得緊緊的。他說綁緊了，站得才穩。","u":[0.08,0.225],"v":[0.12,0.31],"side":1},{"n":"腰帶與紅方扣","t":"紅腰帶底下還壓著一條皮腰帶，中間是紅方扣。連城說兩條帶子一起綁，擋人的時候腰才使得上力。","u":[-0.27,0.27],"v":[0.165,0.235],"side":1},{"n":"紅腰帶","t":"紅色的寬腰帶，連城每天綁得緊緊的。他說綁緊了，站得才穩。","u":[-0.26,0.26],"v":[0.19,0.34],"side":0},{"n":"千層底黑布鞋","t":"娘一針一線納的千層底黑布鞋，鞋底厚、踩得穩。連城擋在方庭前面時，腳下從來不退半步。","u":[-0.165,0.165],"v":[0,0.075],"side":0},{"n":"靛藍短褂黑背心","t":"靛藍短褂配黑背心，耐穿又好活動。連城說，穿這樣擋在前面才不礙手腳。","u":[-0.34,0.34],"v":[0.34,0.61],"side":1},{"pc":1,"u":[-0.26,0.26],"v":[0.05,0.2],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。連城的手套總比別人髒得快——有什麼東西飛過來，他總是先伸手替方庭擋下。","u":[-0.365,-0.275],"v":[0.13,0.237],"side":0,"see":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。連城的手套總比別人髒得快——有什麼東西飛過來，他總是先伸手替方庭擋下。","u":[0.275,0.355],"v":[0.13,0.235],"side":0,"see":-1},{"pc":1,"u":[-0.29,0.29],"v":[0.2,0.67],"side":-1},{"n":"靛藍短褂黑背心","t":"靛藍短褂配黑背心，耐穿又好活動。連城說，穿這樣擋在前面才不礙手腳。","u":[-0.35,0.35],"v":[0.34,0.6],"side":-1}],"x_bing":[{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。溪兒捨不得弄髒，平常把手套塞在腰上的草繩裡，要下棋了才拿出來戴。","u":[-0.37,-0.26],"v":[0.155,0.29],"side":0,"see":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。溪兒捨不得弄髒，平常把手套塞在腰上的草繩裡，要下棋了才拿出來戴。","u":[0.27,0.36],"v":[0.145,0.275],"side":0,"see":1},{"n":"破底小草鞋","t":"腰上還掛著一雙備用的草鞋，鞋底早就磨穿了，溪兒還是捨不得丟——跑腿的人，腳就是飯碗。","u":[0.16,0.28],"v":[0.05,0.27],"side":0},{"n":"靛藍頭巾","t":"揚州跑腿的丫頭都包頭巾，下雪擋寒、天熱擦汗。溪兒的頭巾洗得發白，卻總是綁得整整齊齊。","u":[-0.25,0.25],"v":[0.78,1],"side":0},{"n":"草繩","t":"腰上隨手綁一圈草繩。跑腿的人什麼都要綁——捆貨、紮包袱，草繩一抽下來就能用。","u":[0.11,0.195],"v":[0.21,0.325],"side":1},{"n":"草繩","t":"腰上隨手綁一圈草繩。跑腿的人什麼都要綁——捆貨、紮包袱，草繩一抽下來就能用。","u":[-0.26,0.24],"v":[0.27,0.325],"side":1},{"n":"草繩","t":"腰上隨手綁一圈草繩。跑腿的人什麼都要綁——捆貨、紮包袱，草繩一抽下來就能用。","u":[-0.27,0.27],"v":[0.32,0.38],"side":-1},{"n":"腰帶與紅方扣","t":"草繩底下是一條舊腰帶。紅方扣是她在碼頭撿到的，擦得亮亮的自己縫上去；溪兒說，撿來的東西也能用好久。","u":[-0.29,0.29],"v":[0.145,0.245],"side":1},{"n":"腰帶與紅方扣","t":"草繩底下是一條舊腰帶。紅方扣是她在碼頭撿到的，擦得亮亮的自己縫上去；溪兒說，撿來的東西也能用好久。","u":[-0.3,0.3],"v":[0.15,0.24],"side":-1},{"n":"補過的草鞋","t":"溪兒腳上這雙草鞋，鞋底破了個洞，是小梅在船上用繩子一結一結補好的。回到揚州，她才捨得用自己攢的錢買一雙新的。","u":[-0.165,0.165],"v":[0,0.075],"side":0},{"n":"補丁短衫","t":"衣服破了，溪兒就自己縫一塊布上去。她說補丁越多，表示她跑過的路越多。","u":[-0.17,0.19],"v":[0.28,0.46],"side":1},{"n":"兩條小辮","t":"溪兒的頭髮編成兩條小辮，塞在頭巾底下，跑起來才不會亂。","u":[-0.28,-0.17],"v":[0.56,0.71],"side":0},{"n":"兩條小辮","t":"溪兒的頭髮編成兩條小辮，塞在頭巾底下，跑起來才不會亂。","u":[0.17,0.28],"v":[0.56,0.71],"side":0},{"pc":1,"u":[-0.27,0.27],"v":[0.06,0.6],"side":1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。溪兒捨不得弄髒，平常把手套塞在腰上的草繩裡，要下棋了才拿出來戴。","u":[-0.38,-0.275],"v":[0.155,0.29],"side":0,"see":-1},{"n":"白手套","t":"上了雲河星槎的孩子，都會領到一雙白手套——棋子是用手拿的，星槎上的老規矩：拿棋前手要乾淨，落子才算數。溪兒捨不得弄髒，平常把手套塞在腰上的草繩裡，要下棋了才拿出來戴。","u":[0.275,0.37],"v":[0.145,0.275],"side":0,"see":-1},{"pc":1,"u":[-0.32,0.32],"v":[0.08,0.62],"side":-1}]};   /* 意見回饋 821（11/9）：補齊每位身上看得到的配件（耳環、領結、腰帶紅方扣、鞋⋯），順序照「小的、被蓋住的放前面」；銀項圈改成三段斜線貼著項圈 */
const myChar=()=>{const c=store.get("pChar","");return WX_CHARS[c]?c:""};
const myLook=()=>{{const c=myChar();if(c)return TRIPO[c]?{p:myPc(),e:store.get("era","classic"),g:9,glb:`data/tripo_app/${c}.glb`,ring:TRIPO[c]}:null}
  const f=mySex()==="f",id=f?"me_girl":"me_boy";let L=f?{p:myPc(),e:store.get("era","classic"),g:9,npc:"me",cus:"me:girl"}:null;
  if(myStyle()==="real"&&TRIPO[id]){L=L||{p:myPc(),e:store.get("era","classic"),g:9};L={...L,glb:`data/tripo_app/${id}.glb`,ring:TRIPO[id]}}return L};
/* 意見回饋 471：真實 3D（Tripo 模型）。TRIPO＝有模型的角色和身上圓牌的位置（tools/tripo_slim.py 產生）；XQGLB 載入 .glb（three.js 官方 GLTFLoader，用 App 的 three） */
let TRIPO={};const TRIPO_ALIAS={a_changyuchun:"p_b1p_changyuchun",a_liuji:"p_b1p_liubowen",a_shenwansan:"p_b1p_shenwansan",a_shinaian:"p_b1p_shinaian",a_wangmian:"p_b1p_wangmian"};   /* 秘境棋友跟人物表是同一個人，共用模型 */fetch("data/tripo_app/tripo.json").then(r=>r.ok?r.json():{}).then(j=>{TRIPO=j||{}}).catch(()=>{});
let GLTF_P=null;const GLBC={};window.XQGLB=url=>GLBC[url]||(GLBC[url]=(GLTF_P=GLTF_P||import(new URL(OFF?"GLTFLoader.mjs":"/m/GLTFLoader.mjs",location.href).href)).then(m=>new Promise((res,rej)=>new m.GLTFLoader().load(url,g=>{(window.XQGLB_ANIM=window.XQGLB_ANIM||{})[url]=g.animations||[];res(g.scene)},undefined,rej))).catch(e=>{delete GLBC[url];throw e}));
/* 意見回饋 772（開發者）：格格的 3D 多一隻手、側臉變形。照 3D 驗收標準（兩隻手、臉不變形、不破圖不空心、顏色跟立繪一致）逐一檢查後，不合格的模型先不顯示真實 3D，退回畫好的立繪；FIG2D_BAD＝立繪本身也多手的，改用 Q 版小人。模型重做好、驗收過再從名單拿掉 */
const FIG3D_BLOCK=new Set([]),FIG2D_BAD=new Set([]);   /* 格格的立繪 11/8 已重畫成兩隻手（擦掉臉前「噓」的那隻），改回顯示立繪 */
const oppFig=L=>{if(!L||oppArt())return L;const o={...L};delete o.flat;delete o.sprite;delete o.spriteMeta;delete o.spriteMap;
  if(o.actor&&ACTOR_FIG[o.actor]&&!o.npc){const[h,hc,rb]=ACTOR_FIG[o.actor];Object.assign(o,{npc:o.actor,hat:h,hc,robe:rb})}
  if(store.get("oppLook","real")==="real"&&typeof o.cus==="string"){const id0=o.cus.replace(":","_"),id=TRIPO_ALIAS[id0]||id0;if(TRIPO[id]&&FIG3D_BLOCK.has(id))return FIG2D_BAD.has(id)?o:{...L,nog3:1};if(TRIPO[id]){o.glb=`data/tripo_app/${id}.glb`;o.ring=TRIPO[id]}}return o};
const ACTOR_LOOK=(id,side)=>({p:npcPc({pc:ACTOR_PC[id]||"將"},side),e:store.get("era","classic"),g:9,actor:id,cus:"a:"+id,flat:true,sprite:"data/actors/",spriteMeta:{w:380,h:512,mask:true,faceOf:faceOf("actors",{idle:id,think:id,move:id,happy:id,sad:id,surprise:id},id)},spriteMap:{idle:id,think:id,move:id,happy:id,sad:id,surprise:id}});
const innActor=j=>{if(!String(j||"").startsWith("inn:"))return null;const x=INN.concat(SECRETS).find(z=>"inn:"+z.id===j);return x?{...x,pc:ACTOR_PC[x.id]||"將",img:`data/actors/${x.id}.webp`,win:"承讓了，下次再來！",lose:"好棋！佩服。"}:null};
// 公園棋盤的朝代造型（意見回饋 216）：跟棋盤模式同一套底圖、格線色、棋子底圖、字色、字形
/* 意見回饋 561（開發者：雙人對戰切換平面／園子，棋盤不一樣）：棋盤風格沒有底圖的時候（純色、木紋等風格），3D 園子原本固定畫一塊淺色木板、象牙色棋子；
   改成直接拿平面棋盤畫好的同一張底圖（boardBG 轉成圖片），棋子底色、紅黑字色也照平面棋盤的風格 */
const cssVarOut=t=>{const cs=getComputedStyle(document.documentElement);return String(t).replace(/var\((--[\w-]+)(?:,\s*([^()]*))?\)/g,(m,n,d)=>cs.getPropertyValue(n).trim()||(d||"").trim()||"#C8A06A")};   /* 圖片裡的 SVG 讀不到 CSS 變數，先換成實際顏色 */
function parkLook(){const o=parkLook0();if(o.img||o.hi)return o;   /* 只開色弱模式：棋盤照樣用平面棋盤風格的底圖（只換棋子和提示記號） */try{const tk=store.get("boardTheme","wood3d"),e=curEra(),T0=JSON.parse(cssVarOut(JSON.stringify(boardTheme(tk))));
  const svg=cssVarOut(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 620" width="1120" height="1240">${boardBG(T0,e,tk==="auto"?e:null,"pk",false,null)}</svg>`);
  o.img="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg.replace(/<text[^]*?<\/text>/g,"").replace(/font-family=""[^=<>]*?"(?=\s|\/?>)/g,'font-family="serif"'));   /* 楚河漢界由 3D 園子自己寫；SVG 裡字型名稱的雙層引號做成圖片會解析失敗，連同文字一起拿掉 */o.rect=[0,0,560,620];o.grid=T0.grid||o.grid;try{o.riverDone=!!(e&&((typeof RIVER_IMG!=="undefined"&&RIVER_IMG[RIVER_IMG_OF[e.k]])||(typeof RIVER_ERA!=="undefined"&&RIVER_ERA[e.k])))}catch(x){}   /* 11/10 開發者「每個字都有兩個 overlap 在一起」：這張圖已經有朝代橫幅或朝代字形的楚河漢界，3D 園子就不要再寫一次 */
  if(!o.pset&&!o.pieces){o.pieceBg=T0.piece;o.ink=o.ink||{r:T0.r,b:T0.b}}}catch(x){}return o}
/* 意見回饋 438、439（開發者：同一個朝代，平面和 3D 的棋盤、棋子不能不一樣）：這裡的判斷跟平面棋盤（Board 的 draw）一模一樣——
   棋盤：設定選「跟著朝代」才用朝代棋盤圖，經典＋木紋用經典圖，其他風格用那個風格的格線色；棋子：整套圖 → 朝代底圖（立體樣式才用）→ 程式畫的 */
function parkLook0(){const k=store.get("era","classic"),e=curEra(),tk=store.get("boardTheme","wood3d"),PS=store.get("pieceStyle","3d"),T=boardTheme(tk),
    imgK=tk==="auto"&&e?e.k:(!e&&tk==="wood3d"?"classic":null),pk=e?e.k:(tk==="wood3d"?"classic":null),bk=imgK&&BOARD_IMG[imgK]?imgK:null;
  // 字形晚到（第一次切到這個朝代）：拿上一次的參數重畫公園棋盤，棋子字面才會換成朝代字形（之前這裡什麼都沒做，要等走下一步才換）
  if(GLY_ERAS.has(k)&&!GLY[k])needGly(k,()=>{try{const a=PARK&&PARK.last;if(a&&GLY[k]&&store.get("era","classic")===k){a.ex.look=parkLook();PARK.v.draw(a.board,a.o,a.ex)}}catch(e){}});
  const hi=!!store.get("hiCon",false)||(typeof axmHct==="function"&&!!axmHct()),cb=!!store.get("cbMode",false),hc=hi||cb,ps=!!pk&&PSET.has(pk)&&!hc,pb=psetBoard(imgK);   /* 11/12 無障礙：高對比主題的園子棋盤也用高對比棋子；11/13 第 12 輪：色弱模式也用（黑子黑底白字），cb 另外讓 3D 的上一步改朱橘、電腦建議改藍色虛線框（park3d.js PKCB） */return{k,hc,hi,cb,pset:ps?`data/pset/${pk}/`:null,img:pb?`data/pset/${imgK}/board.webp`:bk?`data/boards/${BOARD_IMG_FILE[bk]||bk}.webp`:null,rect:pb?psetRect(imgK):bk?BOARD_IMG[bk]:null,grid:T&&T.grid||"#3A1D0A",
    pieces:PS==="3d"&&pk&&PIECE_INK[pk]?{r:`data/pieces/${pk}-r.webp`,b:`data/pieces/${pk}-b.webp`}:null,ink:pk&&PIECE_INK[pk]||null,gly:GLY[k]||null,bold:GLY_BOLD[k]||0}}
/* 意見回饋 334：錯棋重練一律用棋盤模式（PARK_OFF），不改玩家原本的公園設定 */
let PARK=null,PARK_LOADING=null,PARK_OFF=false,PARK_J=null,PARK_LK=false;   /* PARK_LK：這盤是朝代擂台，專注棋盤模式也留在園子 3D */
/* 進園子時「開局」特效等過場（入口圖＋名言）收掉才播；公園還沒建好就先等，最多 12 秒 */
const kjWait=(f,t0=Date.now())=>{if(PARK&&PARK.v&&PARK.v.whenShown)return PARK.v.whenShown(()=>setTimeout(f,600));if(Date.now()-t0>12000)return f();setTimeout(()=>kjWait(f,t0),150)};
/* 11/12 開發者選「甲」：新玩家（從沒下完過任何一盤）的第一盤預設平面棋盤，3D 園子當進階選項（頂欄右上「🌳 去園子下棋（3D）」一鍵切換，照舊）。
   玩家存過 park3d（自己選過 3D／平面，或從擂台、園子入口進去）就照存的值；這裡只管「沒存過」時的預設。
   pkNoGame(get)：只讀 localStorage（get＝鍵→字串或 null），手機裡找不到任何下完的棋（人機、旅程、擂台、車輪戰、線上）就回 true。
   pkDef3d()：沒存過 park3d 時的預設。同一盤棋（xq_play 的 id 沒變）只判斷一次：第一盤下完，結算畫面不會突然跳成 3D；開下一盤才回到 3D 預設 */
function pkNoGame(get){const J=k=>{try{const v=get(k);return v==null?null:JSON.parse(v)}catch(e){return null}},nz=v=>!!(v&&typeof v==="object"&&Object.keys(v).length>0),fin=g=>!!(g&&typeof g==="object"&&g.result&&Array.isArray(g.moves)&&g.moves.length>0);
  if(fin(J("xq_play")))return false;let S=J("xq_play2");if(S&&S.moves)S={old:S};if(S&&typeof S==="object")for(const k in S)if(fin(S[k]))return false;
  const R=J("xq_cpuRate");if(R&&((R.w|0)+(R.l|0)+(R.d|0)>0||(Array.isArray(R.hist)&&R.hist.length>0)))return false;
  const N=J("xq_netSaved");if(Array.isArray(N)&&N.length)return false;
  return !["xq_record","m_record","xq_arenaStamps","xq_simulRec"].some(k=>nz(J(k)))}
let PK_DEF=null;
function pkDef3d(){try{const raw=localStorage.getItem("xq_play");let id=null;try{const p=JSON.parse(raw||"null");id=p&&p.id||null}catch(e){}
  if(!PK_DEF||PK_DEF.id!==id)PK_DEF={id,v:!pkNoGame(k=>localStorage.getItem(k))};return PK_DEF.v}catch(e){return true}}
const parkOn=()=>!PARK_OFF&&!(focusOn()&&!PARK_LK)&&(v=>v==null?pkDef3d():v)(store.get("park3d",null));   /* 意見回饋 247：13 個朝代都上線了，挑戰電腦、真人對戰預設在公園下（玩家自己切回棋盤模式會記住）；11/12 新玩家第一盤例外，見 pkDef3d */
const botVis=on=>document.querySelectorAll(".xqbot").forEach(x=>x.style.visibility=on?"":"hidden");
function parkLoad(){const v="?v="+encodeURIComponent(window.XQ_BUILD||"");return PARK_LOADING||(PARK_LOADING=(async()=>{await loadScript(OFF?"three.min.js":"/m/three.min.js");
  await loadScript((OFF?"bot3d.js":"/m/bot3d.js")+v);await loadScript((OFF?"park3d.js":"/m/park3d.js")+v)})().catch(e=>{PARK_LOADING=null;throw e}))}
// 意見回饋 240：公園裡點物件，跳出這個朝代的說明（哪個朝代、特色、典故）
const PARK_INFO={"classic":{"_":["經典古風","不限朝代"],"bg":["山水亭橋","亭子、古松、石拱橋和層層遠山，是中國山水畫最常見的題材，不特定哪個朝代，看了就覺得安靜悠閒。"],"tree1":["松樹","松樹四季常青、不怕冷，和竹、梅並稱「歲寒三友」，常用來比喻堅貞不屈的品格。"],"tree2":["柏樹","柏樹壽命很長、木頭堅硬又有香氣，古代常種在宮殿、廟宇和陵墓旁邊，象徵長壽。"],"table":["花崗岩石桌","園林和庭院最常見的石桌。花崗岩堅硬、不怕風吹雨打，放在戶外幾十年都不壞，很多老人家就在這種石桌上下象棋。"],"cup":["青花蓋碗・烏龍茶","蓋碗有蓋、碗、托三件，又叫「三才碗」（天、人、地）。喝的時候用蓋子撥開茶葉，泡烏龍茶很方便。"],"bench":["園中長椅","在園子裡下棋，旁邊常圍著一圈看棋的人。「觀棋不語真君子」——看棋的人不要出聲指點喔！"],"stool":["石鼓凳","做成鼓形的石凳，庭院、園林裡很常見。鼓形看起來穩重，也有吉祥熱鬧的意思。"],"lantern":["紅燈籠","紅燈籠代表喜慶和團圓，過年、元宵和各種節慶都會掛起來。上面的「福」字是祝福大家有福氣。"]},"qin":{"_":["秦朝","前 221～前 207 年"],"bg":["長城與烽火台","秦始皇統一六國後，把原本秦、趙、燕等國的長城連起來，防禦北方的匈奴。烽火台白天放煙、晚上點火，一站接一站傳遞軍情。"],"tree1":["松樹・五大夫松","《史記》記載秦始皇登泰山時遇到大風雨，在一棵樹下避雨，就封這棵樹為「五大夫」，後人稱它「五大夫松」。"],"tree2":["槐樹","周代朝廷前種三棵槐樹，三公（最高的三個官）面對槐樹站立，所以「三槐」代表三公，槐樹也象徵官運亨通。"],"table":["黑漆朱紋桌","秦朝認為自己是「水德」，水的顏色是黑，所以崇尚黑色。漆器常用黑底配朱紅花紋，邊角用青銅包起來保護。"],"cup":["青銅耳杯","耳杯是橢圓形、兩側有「耳朵」的杯子，戰國到漢代很流行，多半用來喝酒或喝湯。那時候還沒什麼人喝茶，這裡是想像秦朝人也來泡一杯。"],"bench":["黑漆坐榻","秦漢人習慣跪坐在席子或矮榻上。榻比地面高一點，是有身分的人坐的。"],"stool":["黑漆方凳","其實秦朝人多半跪坐，還沒有坐凳子的習慣；這張方凳是配合園中下棋設計的，用的是秦朝的黑漆風格。"],"lantern":["青銅燈","秦朝用青銅燈，燈盞裡放油脂和燈芯點火。秦始皇陵出土了大量精緻的青銅器，可見當時的鑄銅技術非常高。"]},"han":{"_":["漢朝","前 202～220 年"],"bg":["漢闕與樓台","「闕」是立在宮殿、陵墓大門兩側的高台建築，漢代非常流行，是身分地位的象徵；漢代人也喜歡蓋好幾層高的樓閣。"],"tree1":["柏樹","陝西黃帝陵有一棵「黃帝手植柏」，相傳是黃帝親手種的，被認為是中國最老的柏樹之一。漢代也常在祠廟、陵墓旁種柏樹。"],"tree2":["梧桐","古人相信鳳凰「非梧桐不棲」，所以梧桐象徵高潔和吉祥；梧桐木也是做古琴的好木料。"],"table":["雲氣紋漆案","漢代漆器非常發達，常用黑底配朱紅的雲氣紋，線條像流動的雲，代表對升仙的嚮往。「案」是放食物的矮桌，成語「舉案齊眉」說的就是它。"],"cup":["漆耳杯","漢代最常見的杯子之一，木頭做胎、外面上漆，又輕又耐用。湖南馬王堆漢墓出土了很多，有的還寫著「君幸酒」（請您喝酒）。"],"bench":["漆榻配屏風","漢代貴族坐在榻上，旁邊或後面立一扇小屏風，可以擋風，也顯示主人的身分。"],"stool":["漆鼓凳","漢代人主要還是跪坐，鼓形坐墩是後來才流行的；這張凳子用漢代的朱黑漆色，配合園中下棋設計。"],"lantern":["漢代銅燈","漢代的燈具很有名，例如「長信宮燈」：鎏金銅做的宮女跪坐持燈，燈煙會從袖子進到身體裡，不會弄髒屋子，是兩千多年前的環保設計。"]},"sanguo":{"_":["三國","220～280 年"],"bg":["軍營、關隘與戰船","三國時代戰爭不斷。赤壁之戰（208 年）孫權、劉備聯軍用火攻大破曹操的水軍，奠定了魏、蜀、吳三分天下。"],"tree1":["老松","經歷風霜還挺立不倒的老松，就像三國時代的英雄人物。"],"tree2":["枯樹","戰亂的年代，荒野上常見枯樹。曹操的詩〈蒿里行〉寫「白骨露於野，千里無雞鳴」，描寫當時的荒涼。"],"table":["軍營木桌","行軍打仗的桌子要耐用、好搬，所以用厚木板做，再用鐵箍加固。"],"cup":["粗陶碗","軍中用的是樸素耐用的陶碗。《三國志》記載吳國的孫皓讓不會喝酒的韋曜「以茶代酒」，是很早的喝茶紀錄。"],"bench":["軍營長凳","營帳裡將領議事、休息坐的長凳，簡單結實。"],"stool":["胡床（摺疊凳）","胡床就是可以摺疊的凳子，東漢時從西域傳進來，行軍時帶著很方便。《三國志》記載曹操渡河時被敵軍突襲，還坐在胡床上不動。"],"lantern":["火盆","軍營夜裡靠火盆、火把照明和取暖，也能防止野獸靠近。"]},"weijin":{"_":["魏晉","220～420 年"],"bg":["竹林與茅屋","魏晉名士嚮往自然、不愛做官。「竹林七賢」常聚在竹林下喝酒、彈琴、談論哲理（清談）。"],"tree1":["竹子","竹子中空有節，象徵虛心和氣節。東晉王徽之愛竹，說「何可一日無此君」，從此「此君」就成了竹子的代稱。"],"tree2":["柳樹","陶淵明在〈五柳先生傳〉裡說自己「宅邊有五柳樹」，就自號「五柳先生」。柳樹也就和隱士的田園生活連在一起。"],"table":["竹編桌","竹子輕、有韌性、到處都有。魏晉崇尚簡樸自然，竹製家具很合名士的品味。"],"cup":["青瓷盞","魏晉時南方的越窯青瓷已經很成熟，顏色青綠如玉，是當時文人喜愛的器物。"],"bench":["竹榻","名士喜歡在竹榻上躺著讀書、和朋友清談，非常隨性。"],"stool":["竹凳","用竹子做的凳子，輕巧涼爽，帶有山林的趣味。"],"lantern":["墨竹燈籠","紙經過東漢蔡倫改良後漸漸普及。燈籠上畫墨竹，很有文人的味道。"]},"nanbei":{"_":["南北朝","420～589 年"],"bg":["石窟大佛","南北朝佛教大興。北魏開鑿了雲岡石窟、龍門石窟，留下巨大的佛像；杜牧也寫「南朝四百八十寺」，南方到處都是寺廟。"],"tree1":["菩提樹","相傳佛陀在菩提樹下悟道。佛教傳入中國以後，菩提樹也成了寺廟裡常見的樹。"],"tree2":["松樹","寺廟、山林常見的松樹，四季常青，象徵長壽和堅定。"],"table":["蓮花紋石桌","蓮花「出淤泥而不染」，是佛教最重要的圖案之一。南北朝的石刻、器物上到處都是蓮花紋。"],"cup":["青瓷蓮瓣碗","南北朝的青瓷碗常刻上一層層蓮花瓣，是受到佛教影響的流行樣式。"],"bench":["蓮花石凳","刻著蓮花的石凳，寺院和石窟附近常見，莊重樸實。"],"stool":["蓮座石凳","做成蓮花座的形狀——佛像就是坐在蓮花座上的。"],"lantern":["佛前燈","在佛前點燈供養叫「燃燈」，寺廟裡日夜不熄的燈叫「長明燈」，象徵智慧照亮黑暗。"]},"sui":{"_":["隋朝","581～618 年"],"bg":["大運河","隋煬帝開鑿大運河，北到涿郡（今天北京一帶）、南到餘杭（杭州），把南北連成一線，運糧、運貨的船來來往往，部分河段到今天還在使用。"],"tree1":["柳樹","相傳隋煬帝在運河兩岸種柳，還賜柳樹姓「楊」（隋朝皇帝姓楊），所以柳樹又叫「楊柳」。"],"tree2":["楊樹","楊樹長得快、又高又直，北方很常見，常種在河岸和路邊。"],"table":["栗色漆桌","隋唐時期家具愈來愈高，人們漸漸從跪坐改成垂下腳坐在椅凳上。"],"cup":["白瓷碗","隋朝的白瓷燒得愈來愈白，為唐朝「南青北白」（南方越窯青瓷、北方邢窯白瓷）打下基礎。"],"bench":["靠背長凳","有靠背的長凳，可以垂腳坐，是家具從「席地而坐」走向「高坐」的過渡。"],"stool":["素面方凳","簡單樸素的方凳，隋朝建築和器物都偏向簡潔大方。"],"lantern":["運河船燈","夜裡在運河上航行的船要掛燈，照亮水面，也讓其他船看得到自己。"]},"tang":{"_":["唐朝","618～907 年"],"bg":["寶塔與宮殿","唐朝的長安是當時世界上最大的城市之一。大雁塔是玄奘法師為了收藏從印度帶回來的佛經而建的。"],"tree1":["牡丹","唐朝人最愛牡丹。劉禹錫寫「唯有牡丹真國色，花開時節動京城」，花開的時候整個長安城的人都出門賞花。"],"tree2":["松樹","松樹四季常青，唐代宮苑和寺院裡常種，象徵長壽。"],"table":["寶相花紅漆圓桌","寶相花是唐朝最流行的花紋，把蓮花、牡丹等花朵組合成對稱的圖案，華麗又莊重。"],"cup":["唐三彩杯・抹茶色茶湯","唐三彩是黃、綠、白等多種顏色釉的陶器。唐朝陸羽寫了世界上第一本茶書《茶經》，當時流行把茶餅碾成粉末來煮。"],"bench":["軟榻與三彩靠墊","唐代貴族在軟榻上休息、待客，靠墊用華麗的織錦和三彩配色。"],"stool":["三彩坐墩","唐代仕女畫裡常看到這種鼓形坐墩，上面鋪著華麗的繡墊。"],"lantern":["紅綢宮燈","唐朝元宵節長安城取消宵禁，滿城張燈結綵。蘇味道寫「火樹銀花合，星橋鐵鎖開」，說的就是這種熱鬧。"]},"wudai":{"_":["五代","907～960 年"],"bg":["奇峰與瀑布","五代是中國山水畫成熟的關鍵時期：荊浩、關仝畫北方雄偉的大山，董源、巨然畫江南平淡的山水。"],"tree1":["奇松","荊浩在太行山寫生松樹，畫了好幾萬棵才畫得像，還寫了《筆法記》講畫山水的方法。"],"tree2":["老梅","老梅樹幹蒼勁、冬天開花，象徵不怕困境。"],"table":["深色木桌","五代的名畫〈韓熙載夜宴圖〉裡可以看到當時的高桌、椅子和屏風，家具已經很接近後來的樣子。"],"cup":["黑釉盞","深色的黑釉盞最能襯出白色的茶沫，到了宋朝更是大流行。"],"bench":["長榻與山水屏風","〈韓熙載夜宴圖〉裡就有床榻和畫著山水的大屏風，屏風也常用來分隔空間。"],"stool":["深色木凳","結實的深色木凳，五代家具開始走向簡潔的高坐家具。"],"lantern":["素紙方燈","樸素的方形紙燈，柔和的光很適合夜裡讀書、下棋。"]},"song":{"_":["宋朝","960～1279 年"],"bg":["江南水鄉","石拱橋、垂柳和小舟。宋朝商業繁榮，張擇端的〈清明上河圖〉畫出了汴京熱鬧的街市和虹橋。"],"tree1":["梅花","林逋隱居在西湖孤山，種梅養鶴，被稱為「梅妻鶴子」；他寫的「疏影橫斜水清淺」是詠梅的名句。"],"tree2":["柳樹","江南水邊到處是垂柳，柳枝隨風飄動，是宋詞裡常見的景物。"],"table":["淡色木桌","宋代家具線條簡潔、細腳、不太雕花，風格清雅，影響了後來的明式家具。"],"cup":["汝窯天青盞・點茶","汝窯是宋代五大名窯之一，顏色像「雨過天青」。宋人流行「點茶」：把茶粉用茶筅打出白色泡沫，還會比賽誰的泡沫最白、最持久，叫「鬥茶」。"],"bench":["淡色木長椅","宋代人已經習慣坐椅子，家具樸素典雅。"],"stool":["青瓷繡墩","瓷做的坐墩，夏天坐起來很涼爽；外形模仿上面鋪了繡墊的鼓，所以叫「繡墩」。"],"lantern":["梅花紗燈","宋代元宵燈會非常熱鬧，辛棄疾寫「東風夜放花千樹」，形容滿城花燈像一夜之間開滿的花。"]},"yuan":{"_":["元朝","1271～1368 年"],"bg":["草原與蒙古包","元朝由蒙古人建立。草原上的牧民住在可以拆下來搬家的蒙古包（氈帳）裡，跟著水和草移動。"],"tree1":["胡楊","生長在西北沙漠邊緣的樹，傳說「生而千年不死，死而千年不倒，倒而千年不朽」。"],"tree2":["柳樹","北方水邊常見的柳樹，耐寒又好種。"],"table":["青花瓷桌","元朝景德鎮把青花瓷燒得非常成熟，用西亞來的鈷料畫出鮮豔的藍色花紋，還外銷到中東。"],"cup":["青花高足杯・奶茶","高足杯有高高的杯腳，據說騎在馬上也方便拿。蒙古人很愛喝加了奶的茶。"],"bench":["鋪氈墊的長凳","氈是用羊毛壓製成的，保暖又防潮，是草原生活的必需品。"],"stool":["青花瓷墩","用青花瓷做的坐墩，涼爽耐用，花紋是元代流行的藍白配色。"],"lantern":["白燈籠","圓圓的白燈籠配藍邊，跟青花瓷一樣是藍白配色。"]},"ming":{"_":["明朝","1368～1644 年"],"bg":["紫禁城與長城","明成祖遷都北京，蓋了紫禁城（今天的故宮）。我們今天看到的磚石長城，大部分是明朝修建的。"],"tree1":["松樹","紫禁城御花園和皇家園林裡有很多古松，象徵江山長久。"],"tree2":["竹子","明代文人愛竹，常在書房外種竹，也愛畫竹。"],"table":["黃花梨桌","明式家具用黃花梨、紫檀等硬木，造型簡潔、榫卯精巧，不用一根釘子，被認為是中國家具的巔峰。"],"cup":["鬥彩杯・綠茶","鬥彩是先用青花畫輪廓、燒好後再填上彩色再燒一次。明成化年間的「雞缸杯」就是鬥彩名品。明朝開始流行用沸水沖泡散茶，就是今天泡茶的方式。"],"bench":["黃花梨長椅","官帽椅的椅背最上面那根橫木兩端翹起，像古代官員的帽子，所以叫官帽椅。"],"stool":["黃花梨鼓凳","鼓形的坐凳，四周有弧形的腳，線條圓潤，是明式家具的經典款。"],"lantern":["六角紅紗宮燈","宮燈是宮廷用的燈，用木頭做六角或八角的框，鑲上紗或玻璃、畫上圖案，下面垂著流蘇。"]},"qing":{"_":["清朝","1644～1912 年"],"bg":["江南園林","月洞門、迴廊、太湖石和池塘，是蘇州拙政園、留園這些江南私家園林的代表元素。乾隆皇帝也很喜歡模仿江南園林。"],"tree1":["梅花與太湖石","太湖石是太湖產的石灰岩，被水侵蝕出很多孔洞，講究「瘦、皺、漏、透」，是園林裡最重要的石頭。"],"tree2":["竹子","清代的鄭板橋最愛畫竹，他的詩〈竹石〉寫「咬定青山不放鬆」，稱讚竹子的堅毅。"],"table":["紫檀螺鈿桌","紫檀是非常珍貴的硬木；螺鈿是把貝殼磨成薄片嵌在木頭上，會閃閃發亮。清朝宮廷家具講究華麗繁複。"],"cup":["粉彩蓋碗・紅茶","粉彩是清朝流行的彩瓷，顏色柔和有層次。清朝時中國的紅茶大量外銷到英國等地。"],"bench":["紫檀寶座","寶座是皇帝、貴族坐的大椅子，用紫檀雕刻，鋪著錦墊，非常氣派。"],"stool":["景泰藍繡墩","景泰藍是在銅胎上用銅絲掐出花紋，再填上彩色琺瑯燒製，因為明朝景泰年間的最有名而得名。"],"lantern":["多層六角宮燈","清宮的宮燈做得非常精緻，常有好幾層，掛著紅色流蘇，元宵節時宮裡宮外一片燈海。"]}};
/* 意見回饋 550（開發者）：點坐在對面的人，每次換一句（Gemini App 寫的 90 位角色各 6 句，八成跟劇情有關、兩成跟下棋有關；data/lines/opp.json）。
   對到哪一位：園子路人 n:id、驛站 a:id／actor、大廳人物 j:id，再用名字找（石桌往事的人物），都沒有就用這個朝代的擂主 */
let OPPL=null;fetch("data/lines/opp.json").then(r=>r.ok?r.json():null).then(j=>{OPPL=j}).catch(()=>{});const OPPL_I={};
function oppLine(op,era){if(!OPPL||!OPPL.lines)return null;const L=OPPL.lines,c=String(op&&op.cus||"");let id=null;
  if(/^[kx]:/.test(c))return null;   /* 826 追加：冷面國手（挑戰電腦）、雲河七星沒有這份台詞，不要掉到「這個朝代的擂主」說錯人 */
  if(/^c:/.test(c)&&L["era:"+c.slice(2)])id="era:"+c.slice(2);else if(/^n:/.test(c)&&L["park:"+c.slice(2)])id="park:"+c.slice(2);else if(/^a:/.test(c)&&L["inn:"+c.slice(2)])id="inn:"+c.slice(2);else if(op&&op.actor&&L["inn:"+op.actor])id="inn:"+op.actor;
  else if(/^j:/.test(c)&&L["char:"+c.slice(2)])id="char:"+c.slice(2);else if(op&&op.npc&&OPPL.names&&OPPL.names[op.npc]&&L[OPPL.names[op.npc]])id=OPPL.names[op.npc];else if(L["era:"+era])id="era:"+era;
  const a=id&&L[id];if(!a||!a.length)return null;OPPL_I[id]=OPPL_I[id]==null?Math.floor(Math.random()*a.length):(OPPL_I[id]+1)%a.length;
  return{name:(op&&op.npc&&op.npc!=="me"?op.npc:null)||(OPPL.nm&&OPPL.nm[id])||"對手",say:a[OPPL_I[id]]}}
function parkInfo(k){if(k==="orb"&&typeof bhOrbTap==="function")return bhOrbTap();   /* 幻影棋客頭上的小黑洞（07bh） */
  const era=store.get("era","classic"),E=PARK_INFO[era]||PARK_INFO.classic,[en,yr]=E._;vibrate(5);
  if(OFF&&PARK_J==="park"&&typeof secretFind==="function"&&secretFind(era,k))return;   /* 意見回饋 315：秘境棋友 */
  if(k==="table"&&PARK_J==="park"&&typeof histCard==="function"){histCard(era);return}   /* 意見回饋 658（C 象棋從哪裡來）：石桌往事的園子裡點石桌＝這個朝代的棋史卡（秘境棋友上一行先檢查） */
  if(k==="lantern"&&PARK_J==="park"&&typeof xhLantern==="function"){xhLantern(era);return}   /* 意見回饋 658（D 九九消寒圖）：石桌往事的園子裡點燈籠＝節令小卡（秘境棋友先檢查；燈籠的介紹寫在小卡最下面） */
  /* 意見回饋 348：石桌往事的公園裡，掀開茶杯有機會找到一份棋譜（寶物）；沒找到才跳茶杯的介紹 */
  if(k==="cup"&&PARK_J==="park"&&!parkInfo.skip){cupDrop().then(ok=>{if(!ok){parkInfo.skip=true;try{parkInfo(k)}finally{parkInfo.skip=false}}});return}
  // 網路對戰／觀戰時點到人：跳出那位棋友的資料卡（意見回饋 261）
  if(k==="p:legend")return legendSheet();
  {const ex=PARK&&PARK.last&&PARK.last.ex||{},pid=k.startsWith("p:")?k.slice(2):k==="opp"?ex.oppId:k==="mate"?ex.mateId:null;
   if(pid){let nm="";try{const x=XQNet.people().find(p=>p.id===pid);nm=x?x.name:""}catch(e){}oppCard(pid,nm,{});return}
   if(k.startsWith("p:"))return}
  /* 意見回饋 517：拉遠看朝代地圖時點到地名，跳出那個地方在這個朝代的介紹（data/eramap/places.json） */
  /* 意見回饋 525：點到遠方長卷上的地標（山、城、塔、蒙古包……），跳出那個地標的名字和介紹（data/pano/spots.json） */
  if((k==="bg"||k.startsWith("pano:"))&&!parkInfo.skipRelic){relicDrop(era).then(got=>{if(!got){parkInfo.skipRelic=true;try{parkInfo(k)}finally{parkInfo.skipRelic=false}}});return}   /* 意見回饋 536：點長卷有機會撿到珍品 */
  if(k.startsWith("pano:")){const nm=k.slice(5);(parkInfo.S||(parkInfo.S=fetch("data/pano/spots.json").then(r=>r.ok?r.json():{}).catch(()=>({})))).then(J=>{const p=(J[era]||[]).find(x=>x.name===nm);
      sheet("🏞 "+nm,b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(en)}${yr?`・${esc(yr)}`:""}・遠方的風景</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(p&&p.desc||(E.bg||[])[1]||"")}</p>`})});return}
  if(k.startsWith("map:")){const nm=k.slice(4),PJ=PARK_J;(parkInfo.P||(parkInfo.P=fetch("data/eramap/places.json").then(r=>r.ok?r.json():{}).catch(()=>({})))).then(P=>{const d=(P[era]||{})[nm]||(P.classic||{})[nm]||"";
      if(PJ==="park"&&typeof yuMapSheet==="function"&&yuMapSheet(era,nm,d,en,yr))return;   /* 意見回饋 658（B 輿圖遊歷）：石桌往事的園子裡，點到路線上的地名＝介紹＋「⚔ 在這裡過一關」 */
      sheet("📍 "+nm,b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(en)}${yr?`・${esc(yr)}`:""}・地圖上的地名</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(d||"這是"+en+"地圖上標的地方。")}</p><p class="muted" style="font-size:13px;margin:10px 0 0">點兩下畫面回到石桌</p>`})});return}
  let t,x;if(k==="opp"){const op=PARK&&PARK.last&&PARK.last.ex&&PARK.last.ex.opp,OL=op&&!(op.sprite&&!op.npc&&!op.cus)?oppLine(op,era):null;
    if(OL){t=OL.name;x=`「${OL.say}」`}
    else if(op&&/^x:/.test(String(op.cus||""))){t=op.npc||"雲河七星";x=`「${op.about||""}」——從雲河星槎下船、路過驛站的雲河七星。`}
    else if(op&&op.cus==="k:zg"&&typeof OPT_ZG!=="undefined"){t=OPT_ZG.name;x=OPT_ZG.intro+"他下棋像做生意：均勢時愛兌子、領先了就捏得死死的、落後也很能撐。強弱照你選的級數，背後一樣是象棋 AI 引擎 Pikafish；棋風取材自公開棋譜的統計，是虛構的角色。"}   /* 11/11 笑面掌櫃（07m3 ZG_LOOK） */
    else if(op&&/^k:/.test(String(op.cus||""))){t="幻影棋客";x="坐在對面的是幻影棋客：挑戰電腦時跟你下棋的水墨幻影，強弱可以隨你調。他背後是開源的象棋 AI 引擎 Pikafish（從西洋棋引擎 Stockfish 改編來的），棋力比人類特級大師還強。他會思考、會走棋，輸了也會沮喪喔！"}
    else if(op&&op.sim&&op.npc){t=op.npc;x=op.about||""}   /* 回饋 871 追加：車輪戰棋館對面的棋客（08s-simul.js simOppLook） */
    else if(op&&op.npc){t=op.npc;x=`「${op.about||""}」——在園子裡遇到的路人棋友。每次進園子都可能遇到不同的人，棋力也有高有低。`}
    else if(op&&op.sprite){t="幻影棋客";x="你的對手幻影棋客，背後是開源的象棋 AI 引擎 Pikafish（從西洋棋引擎 Stockfish 改編來的），棋力比人類特級大師還強。它會思考、會走棋，輸了也會沮喪喔！"}
    else{t="對手";x="坐在對面的是你的對手。每個玩家都有自己專屬的小帥造型。"}}
  else if(k==="mate"){t=meName()+"（你）";x="坐在這一側的就是你的角色！官帽和官服會跟著你的電腦段位升官；你走出好棋，角色會開心，贏了會跳起來慶祝。點他旁邊的桌子、茶杯、椅子、樹，都有各自的介紹。"}
  else if(E[k]){[t,x]=E[k]}else return;
  sheet(`${k==="bg"?"🏞":k==="opp"?"🤖":k==="mate"?"🙂":"🔎"} ${t}`,b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(en)}${yr?`・${esc(yr)}`:""}${k==="bg"?"・遠方的風景":""}</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(x)}</p>`})}
/* 開發者決定（Gemini UI／UX 審閱）：3D 園子角落有「俯視／平視」切換；第一次進園子播 3 秒半透明的手勢提示（拖曳轉身、兩指縮放、點兩下回正） */
function parkUi(host,pv){let b=host.querySelector(".pkview");if(!b){b=document.createElement("button");b.type="button";b.className="pkview";host.append(b)}
  /* 11/11（AI 模擬玩家第二輪問題 5）：手機直式沒存過視角時，park3d 一開始就是「俯視＋拉近」（topfit，格距約 30px），按鈕要當成已經在俯視、下一個是平視；
     從按鈕切回俯視存成 topfit（拉近版）；以前存的 top／flat 照舊不動 */
  /* 開發者 11/12 hspx「增加切換不同視角的功能按鈕，加在平視那邊用選單選，可以切換很美很漂亮的角度」：黑洞巨盤（pv.views 有清單）這顆鈕改成「🎥 視角」，點了跳選單（park3d GVIEWS）；選的不存進 parkView（那是一般園子用的） */
  const GV=pv.views?pv.views():null;
  if(GV&&GV.length){b.textContent="🎥 視角";b.setAttribute("aria-label","切換視角");
    b.onclick=e=>{e.stopPropagation();vibrate(5);sheet("🎥 切換視角",bx=>{bx.innerHTML=`<p class="muted" style="margin:0 0 10px;font-size:13.5px">選一個角度，畫面會慢慢轉過去；之後照樣可以拖曳、縮放。</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${GV.map(([k,l])=>`<button type="button" class="btn ghost" data-gv="${esc(k)}" style="padding:12px 6px;font-size:15px">${esc(l)}</button>`).join("")}</div>`;
      bx.querySelectorAll("[data-gv]").forEach(x=>x.onclick=()=>{try{pv.setView(x.dataset.gv)}catch(err){}closeSheet()})})}}else{
  const modes=[["top","俯視"],["flat","平視"]];let m=store.get("parkView","");const pkIsTop=()=>m==="top"||m==="topfit"||(!m&&!!pv.homeView&&pv.homeView()==="topfit");
  const paint=()=>{const nx=pkIsTop()?modes[1]:modes[0];b.textContent=(nx[0]==="top"?"⬇ ":"👁 ")+nx[1];b.setAttribute("aria-label","切換成"+nx[1])};paint();
  if(m&&pv.setView)setTimeout(()=>{try{pv.setView(m)}catch(e){}},400);
  b.onclick=e=>{e.stopPropagation();vibrate(5);m=pkIsTop()?"flat":pv.homeView?"topfit":"top";store.set("parkView",m);try{pv.setView(m)}catch(x){}paint()}}
  /* 11/11 模擬玩家問題 8（兩個教學提示疊在棋盤上）：園子裡 park3d 自己的小紙條（.mh-tip，例如「大都到杭州有多遠？」）正開著就先等它收；
     手勢提示出來的 3.5 秒內 host 加 pk-hinting，期間冒出來的小紙條先藏著（m.css 檔尾），一次只看到一個 */
  if(!store.get("parkHint",false)){const go=()=>{if(!host.isConnected)return;if(fxBusy()||document.querySelector(".kjfx")||host.querySelector(".mh-tip.on"))return setTimeout(go,500);store.set("parkHint",true);const h=document.createElement("div");h.className="pkhint";h.style.pointerEvents="none";h.innerHTML='<div class="pkh-hand">👆</div><b>拖曳轉身看四周</b><span>兩指捏合縮放・點兩下回到原本的角度</span>';host.append(h);host.classList.add("pk-hinting");PK_HTS=Date.now();
      /* 11/11（AI 模擬玩家第二輪問題 5：林老師第一擊被這層吃掉）：提示層不擋點選（pointer-events:none），手指一按下就收掉提示，那一下照常傳到棋盤選子 */
      let gone=false;const out=()=>{if(gone)return;gone=true;host.removeEventListener("pointerdown",out,true);h.classList.add("out");setTimeout(()=>{h.remove();host.classList.remove("pk-hinting")},500)};host.addEventListener("pointerdown",out,true);setTimeout(out,3000)};
    if(pv.whenShown)pv.whenShown(()=>setTimeout(go,300));else setTimeout(go,1200)}
  if(typeof yuHintMaybe==="function")yuHintMaybe(host)}   /* 意見回饋 658（B 輿圖遊歷）：第一次在石桌往事的園子裡，提示地圖可以點（07e-garden2.js） */
/* 11/10 開發者「園子熱鬧」（Gemini 62）七星打氣：每次開園子挑一位沒上場的雲河七星來看棋（同一朝的優先），3D 園子 park3d 的 CR 模組負責走位、動作、泡泡。
   台詞照各人的個性（WX_CHARS）：阿轍只走直路、燕子守江邊茶棚、花兒做煙火、小梅在驛站拐彎、方庭氣喘的少爺、城子護著少爺、溪兒跑腿往前衝 */
const PARK_VIS={
  x_swordboy:{hi:["我路過，看一盤再走！"],cheer:["直直衝過去，吃得好！","這一車開得痛快！"],chk:["將軍了！快把路擋住！"],jiang:["將軍！一路直搗黃龍！"],bye:["我還有車要趕，先走啦！"]},
  x_spiritgirl:{hi:["茶棚歇工，我來看看。"],cheer:["這步走得穩！","吃得好，不急不躁！"],chk:["哎呀，將軍了！先守住！"],jiang:["將軍！這步漂亮！"],bye:["江風起了，我回茶棚去。"]},
  x_martialgirl:{hi:["花兒來湊熱鬧啦！"],cheer:["砰！這一下打得響！","隔山打牛，吃到了！"],chk:["將軍！火藥味好重！"],jiang:["將軍！炸得他沒地方躲！"],bye:["作坊還有煙火要紮，走啦！"]},
  x_miaogirl:{hi:["小梅繞個彎過來看棋！"],cheer:["拐得漂亮，吃到了！","這一跳真妙！"],chk:["哇，將軍了！快跳開！"],jiang:["將軍！他拐不出去啦！"],bye:["驛站的馬該餵了，我先走！"]},
  x_shuai:{hi:["我出院子透透氣，看你下。"],cheer:["好棋！這一子划算！"],chk:["將軍了……我心都提起來了。"],jiang:["將軍！穩穩的。"],bye:["城子在找我了，先回去。"]},
  x_shi:{hi:["少爺在附近，我順道來看看。"],cheer:["穩紮穩打，吃得好！"],chk:["將軍！九宮要護好！"],jiang:["將軍！守得住才攻得出去。"],bye:["我得回少爺身邊了。"]},
  x_bing:{hi:["送貨路過，看兩步！"],cheer:["衝得好！吃掉了！"],chk:["將軍了！快想辦法！"],jiang:["將軍！一步一步往前衝！"],bye:["貨還沒送完，我跑啦！"]}};
function parkCrowd(){try{const era=store.get("era","classic"),me=typeof myChar==="function"?myChar():null,C=Object.keys(PARK_VIS).filter(c=>c!==me&&typeof TRIPO!=="undefined"&&TRIPO[c]&&WX_CHARS[c]);if(!C.length)return{};
  const same=C.filter(c=>typeof CHAR_ERA!=="undefined"&&CHAR_ERA[c]===era),c=(same.length?same:C)[Math.random()*(same.length||C.length)|0],W=WX_CHARS[c];
  return{vis:Object.assign({c,nk:W.nk||W.n,look:{p:W.pc||"兵",e:era,g:9,glb:`data/tripo_app/${c}.glb`,ring:TRIPO[c]}},PARK_VIS[c])}}catch(e){return{}}}
/* 11/11 模擬玩家問題 8（點選穿透）：#/cpu 開局前「移步後園」等過場畫面，點一下會提早進園子；過場收掉的那一下（或緊接著再點的那一下）落到 3D 場景上，
   點到對面的人就同時打開「幻影棋客」介紹卡。過場還在、或收掉後 0.6 秒內才按下去的點選，都當成是點過場的，吃掉不傳給園子（park3d 在 xiangqi-lab，不動它，這邊攔 onTap／onInfo） */
let PK_GV=null,PK_GT=0,PK_PD=0,PK_HTS=0;   /* PK_HTS＝手勢提示層出現的時間：之後才按下去的點選是玩家衝著棋盤點的，不算點過場、不吃掉（11/11 問題 5） */
function pkGateWatch(pv){PK_GV=null;PK_GT=0;PK_PD=0;PK_HTS=0;const el=pv&&pv.el;if(!el)return;const v=[...el.children].find(x=>x.querySelector&&x.querySelector(".gt-t,.ag-t,.xw-t"));if(!v)return;PK_GV=v;
  el.addEventListener("pointerdown",()=>{PK_PD=Date.now()},true);
  const ob=new MutationObserver(()=>{if(PK_GV!==v){ob.disconnect();return}if(!PK_GT&&(!v.isConnected||v.style.opacity==="0"))PK_GT=Date.now();if(!v.isConnected)ob.disconnect()});
  ob.observe(v,{attributes:true,attributeFilter:["style"]});ob.observe(el,{childList:true})}
function pkGateEat(){const v=PK_GV;if(!v)return false;if(PK_HTS&&PK_PD>=PK_HTS)return false;if(v.isConnected&&v.style.opacity!=="0")return true;if(!PK_GT)PK_GT=Date.now();
  if(Date.now()-PK_GT>3000){PK_GV=null;return false}return(PK_PD||Date.now())<PK_GT+600}
/* 11/11 評比第 2 輪：入座運鏡（Gemini）＋省電模式（ChatGPT「效能、耗電與低負載模式證據」），說明在 story/90_3D入座與省電模式.md（前綴 pkIntro／pkPw）
   pkIntroKey：這一盤的代號（挑戰電腦 cpu:<st.id>、線上 net:<gid>；沒給的用網址），park3d 一盤只播一次入座運鏡，App 開著回到同一盤不重播
   pkPwRow：設定 → 棋盤 → 更多設定「🔋 省電模式：自動／開／關」（store pkPower，park3d 每秒自己讀）；下面一行顯示園子每秒幾幀、省電開沒開 */
function pkIntroKey(ex){return String(ex&&ex.gid||("h:"+String(location.hash||"").split("?")[0]))}
function pkPwNowTxt(){try{const X=window.XQPark3D,P=X&&X.perf?X.perf():null,D=X&&X.power?X.power():null;if(!X)return"目前：還沒進過園子（進園子下一會兒再回來看）";
  const why=on=>on&&P&&P.why&&P.why.length&&P.mode==="auto"?`（${P.why.join("、")}）`:"";
  const ld=P&&P.revealMs?`・上次進場 ${(P.revealMs/1000).toFixed(1)} 秒（圖片 ${P.readyMs==null?"未載完":(P.readyMs/1000).toFixed(1)+" 秒"}）`:"";   /* 11/12 hspx「進黑洞要等 6～7 秒」：顯示上次進場花多久，開發者實機看得到 */
  if(P&&P.live)return`目前：每秒 ${P.fps} 幀・省電 ${P.power?"開":"關"}${why(P.power)}${ld}`;
  if(P&&P.span)return`上次在園子：每秒 ${P.fps} 幀・省電 ${P.power?"開":"關"}${why(P.power)}${ld}`;
  return`目前：園子沒開著・省電 ${D&&D.on?"開":"關"}`}catch(e){return""}}
function pkPwLive(){const p=document.getElementById("pkPwNow");if(!p||p.dataset.on)return;p.dataset.on="1";const tk=()=>{if(!p.isConnected)return clearInterval(iv);p.textContent=pkPwNowTxt()},iv=setInterval(tk,1000);tk()}
function pkPwSet(k){if(!["auto","on","off"].includes(k))return;store.set("pkPower",k);try{vibrate(5)}catch(e){}
  document.querySelectorAll("#pkPw [data-pw]").forEach(b=>{const on=b.dataset.pw===k;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on))});
  const p=document.getElementById("pkPwNow");if(p)setTimeout(()=>{p.textContent=pkPwNowTxt()},1100);toast(k==="on"?"3D 園子改用省電模式":k==="off"?"3D 園子不省電（畫質最好）":"省電模式：自動判斷")}
function pkPwRow(){const m=store.get("pkPower","auto");setTimeout(pkPwLive,0);
  return`<div style="padding:8px 2px"><b>🔋 省電模式</b><br><span class="muted" style="font-size:12.5px">3D 園子降一點畫質、停掉飄落葉和晃動，沒在動的時候少畫幾次，舊手機比較不燙、不耗電</span>
    <div class="opt" id="pkPw" role="group" aria-label="3D 園子省電模式" style="grid-template-columns:repeat(3,1fr);margin:6px 0 4px">${[["auto","自動"],["on","開"],["off","關"]].map(([k,l])=>`<button type="button" data-pw="${k}" aria-pressed="${m===k}"${m===k?' class="on"':""} onclick="pkPwSet('${k}')">${l}</button>`).join("")}</div>
    <p class="muted" id="pkPwNow" style="font-size:12.5px;margin:0 2px">${esc(pkPwNowTxt())}</p>
    <button type="button" class="btn ghost" style="width:100%;margin-top:8px" onclick="pkBench()">📊 3D 效能量測（10 秒）</button></div>`}
/* 開發者 11/12 評比第 7 輪「3D 技美與場景專家」（P29.1 渲染效能、P29.2 發熱與功耗）：在實機量 3D 效能。
   要先開著一個 3D 園子或對局（PARK）；按下去關掉設定，鏡頭自己繞一圈 10 秒（park3d bench），結束跳出結果：平均幀數、最差 1%、繪製次數、三角形、解析度。
   結果存最近 10 筆（store pkBench），可以複製貼到「回報問題」，也會寫進 power.md 的實機紀錄 */
function pkBenchTxt(r){return`${r.scene}・平均 ${r.avgFps} 幀・最差 1% ${r.low1} 幀・每格繪製 ${r.calls} 次・${(r.tris/1000).toFixed(1)}k 三角形・畫面 ${r.w}×${r.h}×${r.pr}${r.power?"・省電中":""}・${(typeof navigator!=="undefined"&&navigator.userAgent||"").replace(/^.*?\(([^)]*)\).*$/,"$1").slice(0,60)}・版本 ${window.XQ_BUILD||""}`}
function pkBench(){const v=typeof PARK!=="undefined"&&PARK&&PARK.v;if(!v||!v.bench){toast("先進到任何一個 3D 園子或對局（3D 畫面開著），再回來按一次");return}
  try{closeSheet()}catch(e){}setTimeout(()=>{const ok=v.bench(r=>{const L=store.get("pkBench",[]);L.unshift(r);store.set("pkBench",L.slice(0,10));const t=pkBenchTxt(r);
      modal(`<div class="em">📊</div><h2>3D 效能量測結果</h2><p style="line-height:1.8">${esc(t)}</p><p class="muted" style="font-size:12.5px">手機發熱、耗電要靠長時間實測；這裡量的是 10 秒內的畫面速度。結果已存起來（最近 10 筆）。</p>`,
        [["📋 複製結果",()=>{try{navigator.clipboard.writeText(t);toast("已複製，可以貼到「回報問題」")}catch(e){toast(t)}},true],["好",()=>{}]],"res")},10000);
    if(ok)toast("量測中：鏡頭會自己轉 10 秒，先不要操作");else toast("3D 畫面還沒準備好，等它出現再試一次")},450)}
/* 回饋 871（開發者 11/12「車輪戰出現小帥妹過場動畫」）：ex.quietMate＝不播入座運鏡（坐著看小帥／小帥妹 1.8 秒再拉到俯視）、不讓小帥說「我是小帥妹，幫你加油！」。
   車輪戰（08s-simul.js）的開場只有 simIntro 棋館過場；ex.gate 也一定要給（沒給 gate／arena 時 park3d 的載入畫面是「小帥妹走去園子」） */
function parkDraw(host,bd,board,o,ex){
  // 關掉公園：同一個棋盤的公園只藏起來（意見回饋 244：來回切換不用每次重建 3D 場景，比較順）
  {const tg=host.querySelector(".pkname");if(tg)tg.hidden=!parkOn();const pv0=host.querySelector(".pkview");if(pv0)pv0.hidden=!parkOn();const ap=host.querySelector(".ax-park");if(ap)ap.hidden=!parkOn();pkSwUi(host)}   /* 回饋 847：平面棋盤時收起「改用平面棋盤」 */   /* 11/11 v6 第 3 點：「▦ 平面棋盤」／「🌳 回園子」（pkSwUi 在下面） */
  if(!parkOn()){if(PARK&&PARK.host===host){if(PARK.v.hide)PARK.v.hide();else{PARK.v.destroy();PARK=null}}bd.svg.style.display="";botVis(true);return}
  // 意見回饋 270：載入完還是沒有 XQPark3D（例如程式出錯）就停下來改用棋盤模式，不能一直重試（之前會無限循環、整個 App 卡死）
  if(!window.XQPark3D){bd.svg.style.display="";parkLoad().then(()=>{if(!window.XQPark3D)throw new Error("park3d 沒有載入成功");if(document.body.contains(host))parkDraw(host,bd,board,o,ex)}).catch(()=>{toast("園子 3D 棋盤載入失敗，先用棋盤模式");store.set("park3d",false)});return}
  if(PARK&&(PARK.era!==store.get("era","classic")||(PARK.bg||null)!==(ex.bg||null)||(PARK.ground||null)!==(ex.ground||null))){PARK.v.destroy();PARK=null}   // 換了朝代（例如從集章簿換過去）：公園重建；開發者 11/12：十三星系共用黑洞環景、地面各不同，換了地面也重建
  if(!PARK||PARK.host!==host||!document.body.contains(PARK.v.el)){if(PARK)PARK.v.destroy();
    if(ex.gate&&ex.gate.qk)ex.gate=Object.assign({},ex.gate,{quote:parkQuote(ex.gate.qk)});   /* 名言只在真的建公園、要顯示過場時才抽，不然每次重畫都抽一次，會跟上次重複 */
    const pv=XQPark3D.create(host,{giant:!!ex.giant,   /* hspx（開發者 11/12）：黑洞星樞棋局的巨盤模式（07bh-blackhole.js） */view:ex.giant?null:store.get("parkView","")||null,intro:store.get("parkView","")||ex.quietMate?null:pkIntroKey(ex),   /* 11/11：玩家存過的視角一開始就用；沒存過的手機直式 park3d 用 topfit（俯視＋拉近） */arena:ex.arena||null,gate:ex.gate||null,bg:ex.bg||null,bridge:!!ex.bridge,ground:ex.ground||null,era:ex.era||null,indoor:!!ex.indoor,   /* 11/11：車輪戰棋館＝明朝家具、室內（不放園子的樹和道具） */   /* 11/11：首頁橋上石桌（07y hbBridge）＝橋上家具＋橋面地面；換場景靠 bg 不同就會重建 */onTap:i=>{if(!pkGateEat())pkSwTap(ex,i)},onInfo:k=>{if(!pkGateEat())parkInfo(k)},onDestroy:()=>{if(PARK&&PARK.v===pv){PARK=null;botVis(true)}}});
    if(!pv){toast("這台裝置沒辦法顯示 3D，先用棋盤模式");store.set("park3d",false);return}PARK={host,v:pv,era:store.get("era","classic"),bg:ex.bg||null,ground:ex.ground||null,ik:pkIntroKey(ex)};try{pkGateWatch(pv)}catch(e){}parkUi(host,pv);setTimeout(()=>{try{if(!ex.quietMate)pv.say(`我是${BOTN()}，幫你加油！`,2.6);if(ex.oppHello)setTimeout(()=>pv.oppSay(ex.oppHello,2.6),1400)}catch(e){}},700)}
  /* 意見回饋 417：園子上方標出朝代和那個朝代對園子的叫法（例如「唐朝・園林」「漢朝・苑囿」） */
  {let tg=host.querySelector(".pkname");if(!tg){tg=document.createElement("div");tg.className="pkname";if(getComputedStyle(host).position==="static")host.style.position="relative";host.append(tg)}const k=store.get("era","classic");tg.textContent=ex.bgName||((k==="classic"?"經典":eraLabel(k))+"・"+(PW[k]||"園子"));tg.hidden=false}
  /* 回饋 847（讀螢幕盲棋）：3D 園子沒辦法逐格讀；給讀螢幕的人一顆看不見的按鈕，按了跟頂欄「回棋盤模式」一樣，換回可以逐格點選的平面棋盤 */
  if(!host.querySelector(".ax-park")){const ab=document.createElement("button");ab.type="button";ab.className="ax-sr ax-park";ab.textContent="改用平面棋盤，讀螢幕可以逐格點選";
    ab.onclick=()=>{const tb=document.querySelector('#topRight button[aria-label="回棋盤模式"]');if(tb)tb.click();else{store.set("park3d",false);toast("回到棋盤模式")}};host.prepend(ab)}
  {const ik=pkIntroKey(ex);if(PARK.ik!==ik){PARK.ik=ik;if(!store.get("parkView","")&&!ex.quietMate&&PARK.v.intro)try{PARK.v.intro(ik)}catch(e){}}}   /* 11/11 入座運鏡：同一座園子換下一盤也播一次（park3d 自己記哪幾盤播過） */
  if(PARK.v.show)PARK.v.show();bd.svg.style.display="none";botVis(false);ex.look=parkLook();ex.blitz=typeof blzOn==="function"&&blzOn();   /* 第 13 輪 F4：快棋模式時 park3d 的走子動畫照 blzTab 的比例加快（07pm-premove.js） */if(ex.opp)ex.opp=oppFig(remoteLook(ex.opp));if(ex.mateLook&&ex.mateLook.sx)ex.mateLook=oppFig(remoteLook(ex.mateLook));if(!ex.mateLook)ex.mateLook=myLook();
  if(!PARK.crowd)PARK.crowd=parkCrowd();ex.crowd=PARK.crowd;if(Array.isArray(ex.watchers))ex.watchers=ex.watchers.map(w=>w&&w.bot&&w.bot.sx?{...w,bot:oppFig(remoteLook(w.bot))}:w);PARK.last={board,o,ex};PARK.v.draw(board,o,ex);pkSwUi(host)}
/* ================= 11/11 v6 第 3 點（ChatGPT 十視角重評、AI 模擬玩家報告問題 4）：3D 園子 ↔ 平面棋盤 好找、好點（前綴 pkSw） =================
   ① 3D 園子左下角一顆「▦ 平面棋盤」（右上是俯視／平視、右下是 park3d 的 ＋／－）；平面棋盤時，狀態列下面靠右一顆「🌳 回園子」（在棋盤框外，不蓋棋子）。
      兩顆都只是去按頂欄（手機收在「⋯」裡）原本那顆 parkBtn（回棋盤模式／去園子下棋（3D）），行為、記住的設定（park3d）都跟原本一樣；
      頂欄沒有那顆（擂台下到一半、練習、盲棋）就不出現；專注棋盤模式開著也不出「回園子」。
   ② 3D 裡點了卻只是「取消選取」或什麼都沒選到（點空、點偏、點到對方的子）：前 3 次冒一句提示，指著 ① 那顆按鈕（store pkSwMiss＝提示過幾次）。
   判斷法：點之前記下 PARK.last；點完畫面有重畫（PARK.last 換了）而且沒有選到子、也不是再點一次同一顆子＝點偏。走成一步的會等伺服器回來才重畫，不會被算成點偏 */
const pkSwTb=()=>document.querySelector('#topRight button[aria-label="回棋盤模式"],#topRight button[aria-label="去園子下棋（3D）"]');
function pkSwUi(host){try{if(!host)return;const tb=pkSwTb(),on=parkOn(),on3=on&&!!(PARK&&PARK.host===host);
  let b=host.querySelector(".pk2d");
  if(on3&&tb&&!b){b=document.createElement("button");b.type="button";b.className="pk2d";b.innerHTML='<span aria-hidden="true">▦</span> 平面棋盤';b.setAttribute("aria-label","換成平面棋盤：棋子比較大、比較好點");
    b.onclick=e=>{e.stopPropagation();vibrate(5);const t=pkSwTb();if(t)t.click()};if(getComputedStyle(host).position==="static")host.style.position="relative";host.append(b)}
  if(b)b.hidden=!(on3&&tb);if(!(on3&&tb)){const tp=host.querySelector(".pk2d-tip");if(tp)tp.remove()}
  const vw=host.closest(".view"),st=vw&&vw.querySelector("#stat");let r=vw&&vw.querySelector(".pk3d-back");const fl=!on&&!PARK_OFF&&!focusOn()&&!!tb&&!!st;
  /* 11/12 開發者「「回園子」這三個字用其他方式表示」：車輪戰在茶肆棋館、不是園子，改成跟「▦ 平面棋盤」成對的「🧊 3D 場景」 */
  if(fl&&!r){r=document.createElement("div");r.className="pk3d-back";r.innerHTML='<button type="button" aria-label="切回 3D 場景下棋"><span aria-hidden="true">🧊</span> 3D 場景</button>';
    r.querySelector("button").onclick=()=>{vibrate(5);const t=pkSwTb();if(t)t.click()};(vw.querySelector(".rule-note")||st).after(r)}
  if(r)r.hidden=!fl}catch(e){}}
let PKSW_T=0;
function pkSwTap(ex,i){const L0=PARK&&PARK.last,s0=L0&&L0.o&&L0.o.sel>=0?L0.o.sel:-1;ex.tap(i);
  try{const L1=PARK&&PARK.last;if(!L1||L1===L0||i===s0||(L1.o&&(L1.o.sel>=0||L1.o.pre))||(L0&&L0.o&&L0.o.pre))return;   /* 第 13 輪 F4：排好預走、或點一下取消預走，都不算點偏（不冒「先點你的棋子」） */
    const n=+store.get("pkSwMiss",0)||0,host=PARK.host,b=host&&host.querySelector(".pk2d");if(n>=3||Date.now()-PKSW_T<8000||!b||b.hidden)return;
    PKSW_T=Date.now();store.set("pkSwMiss",n+1);let tp=host.querySelector(".pk2d-tip");if(tp)tp.remove();
    tp=document.createElement("div");tp.className="pk2d-tip";tp.setAttribute("role","status");tp.innerHTML="先點<b>你的棋子</b>，再點<b>綠點</b>走過去。<br>看不清楚？按下面「▦ 平面棋盤」，棋子比較大。";host.append(tp);
    b.classList.remove("pulse");void b.offsetWidth;b.classList.add("pulse");setTimeout(()=>{tp.classList.add("out");b.classList.remove("pulse");setTimeout(()=>tp.remove(),450)},5000)}catch(e){}}
// 意見回饋 241：在公園裡按鈕換成「▦」（回棋盤模式），在棋盤模式是「🌳」（去公園）
const parkIcon=()=>parkOn()?"▦":"🌳",parkLabel=()=>parkOn()?"回棋盤模式":"去園子下棋（3D）";
const parkBtn=redraw=>[parkIcon(),e=>{const fo=focusOn()&&!PARK_LK&&!PARK_OFF;   /* 專注棋盤模式開著又按「去園子」：等於把專注模式關掉 */
  if(fo){store.set("focusBoard",false);focusApply();store.set("park3d",true)}else store.set("park3d",!parkOn());vibrate(8);toast(parkOn()?`${fo?"已關閉專注棋盤模式。":""}🌳 園子 3D 棋盤：${BOTN()}坐在對面跟你下（拖曳可以看四周）`:"回到棋盤模式");
  const b=e&&e.currentTarget;if(b){b.textContent=parkIcon();b.title=parkLabel()}redraw()},parkLabel()];
// ================= 🧪 擺盤推演（意見回饋 250）：對局中跳到另一張棋盤，從當下局面紅黑兩邊都自己走，試各種變化；不影響正在下的那盤 =================
// eng＝能不能請 Pikafish 分析（積分挑戰、網路對戰中不行，免得變成作弊）
function setupSheet(board0,side0,flip0,eng){if(!board0)return;const H=[{board:board0.slice(),side:side0,last:null,cn:"",check:-1}];let sel=-1,legal=null,flip=!!flip0,hint=null;
  sheet("🧪 擺盤推演",b=>{b.innerHTML=`<p class="muted" style="margin:0 0 6px;font-size:13px;line-height:1.6">從這盤現在的局面開始，紅黑兩邊都由你走，試試看各種變化。<b>不會影響正在下的這盤</b>，關掉就回去。${eng?"":"<br>（晉級賽和線上對戰中不能用電腦分析）"}</p>
    <div id="suS" style="font-weight:700;margin:2px 0 6px"></div><div id="suB"></div><div id="suM" class="muted" style="font-size:13px;line-height:1.7;margin:6px 0;min-height:1.7em"></div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="pill" id="suU">↶ 退一步</button><button class="pill" id="suR">⟲ 回到對局局面</button><button class="pill" id="suF">⇅ 翻轉</button>${eng?'<button class="pill" id="suE">💡 電腦分析（Pikafish）</button>':""}</div><div id="suA" style="margin-top:8px;line-height:1.7"></div>`;
    const bd=Board(i=>tap(i));b.querySelector("#suB").append(bd.svg);const cur=()=>H[H.length-1],A=b.querySelector("#suA");
    const need=async()=>{if(!legal)legal=(await api("/an/legal",{board:cur().board,side:cur().side})).legal;return legal};
    async function tap(i){try{await need()}catch(e){return toast(e.message)}
      if(sel>=0&&legal.some(([f,t])=>f===sel&&t===i)){const f=sel;sel=-1;
        try{const r=await api("/an/legal",{board:cur().board,side:cur().side,f,t:i});H.push({board:r.board,side:r.side,last:{f,t:i},cn:r.cn,check:r.check});legal=r.legal;hint=null;A.innerHTML="";vibrate(12)}catch(e){toast(e.message)}draw();return}
      sel=legal.some(([f])=>f===i)?i:-1;if(sel>=0)vibrate(5);draw()}
    function draw(){const c=cur();bd.draw(c.board,{flip,last:c.last,sel,targets:sel>=0&&legal?legal.filter(([f])=>f===sel).map(x=>x[1]):[],check:c.check,hint});
      const end=legal&&!legal.length;b.querySelector("#suS").textContent=end?`${PLAYER[c.side]}沒有棋可走了（${c.check>=0?"被將死":"困斃"}）`:`輪到${PLAYER[c.side]}・推演第 ${H.length-1} 步${c.check>=0?"・將軍！":""}`;
      b.querySelector("#suM").textContent=H.length>1?H.slice(1).map((h,i)=>`${i+1}.${h.cn}`).join("　"):"點棋子走走看（兩邊都可以走）"}
    b.querySelector("#suU").onclick=()=>{if(H.length>1){H.pop();legal=null;sel=-1;hint=null;A.innerHTML="";need().then(draw,draw)}};
    b.querySelector("#suR").onclick=()=>{H.length=1;legal=null;sel=-1;hint=null;A.innerHTML="";need().then(draw,draw)};
    b.querySelector("#suF").onclick=()=>{flip=!flip;draw()};
    if(eng)b.querySelector("#suE").onclick=async()=>{const c=cur();A.innerHTML='<span class="muted">電腦分析中…（約 2 秒）</span>';
      try{const r=await api("/an/engine",{board:c.board,side:c.side,ms:1800,multipv:1});const l=r.lines&&r.lines[0];
        if(!l){A.innerHTML='<span class="muted">這個局面已經分出勝負了</span>';return}
        const m=String(l.mv||""),ix=(ch,d)=>(9-(+d))*9+(ch.charCodeAt(0)-97);hint=m.length>=4?[ix(m[0],m[1]),ix(m[2],m[3])]:null;draw();
        A.innerHTML=`<b>電腦建議：${esc(l.cn)}</b>（${esc(l.mate!=null?(l.mate>0?"紅方":"黑方")+"有殺":evt(l.vr))}）<br><span class="muted" style="font-size:13px">後續：${esc((l.pv||[]).slice(0,8).join("　"))}</span>`}
      catch(e){A.innerHTML=`<span class="muted">⚠ ${esc(e.message)}</span>`}};
    need().then(draw,draw)})}
// ================= 🏯 朝代擂台＋集章（意見回饋 255：吸引玩家到公園下棋）=================
// 每個朝代的公園有一位擂主（由 Pikafish 扮演），難度跟著你的電腦段位；打贏蓋該朝代的朱印，集 3／7／13 枚得到稱號（大廳的棋友資料卡看得到）
const ARENA={
  classic:{seal:"青",name:"石桌棋仙",intro:"在園子石桌下了五十年的老棋仙，一壺茶、一盤棋，從沒換過位置。",hi:"老夫在這石桌坐了五十年，來，陪我下一盤。",win:"薑還是老的辣，年輕人再練練。",lose:"好！這一章你蓋得名正言順。"},
  qin:{seal:"秦",name:"咸陽鐵卒",intro:"守過長城烽火台的老兵，棋風像秦軍一樣步步進逼、紀律嚴明。",hi:"秦軍出陣，一步不退！",win:"烽火已燃，城門未破。",lose:"這一仗，我服了。"},
  han:{seal:"漢",name:"未央棋侯",intro:"未央宮裡陪皇帝下棋的棋侯，最愛用馬，講究「運籌帷幄」。",hi:"運籌帷幄之中，請。",win:"漢家天下，暫且還姓劉。",lose:"決勝千里，閣下勝了。"},
  /* 開發者 11/11 選 Gemini 全域審查：原本「赤壁火炮將」用炮火攻、開場「火燒連營」——三國還沒有火藥砲，火燒連營是夷陵之戰；改成霹靂車（《三國志・袁紹傳》官渡發石車）＋火燒赤壁 */sanguo:{seal:"三國",name:"赤壁霹靂將",intro:"赤壁一戰的老將，年輕時在官渡見過曹操的「霹靂車」——拋石頭的機器，就是象棋「砲」的祖先，所以最愛用砲隔山打人。",hi:"東風已起，看我火燒赤壁！",win:"這把火燒得旺。",lose:"東風不與我便……佩服。"},
  weijin:{seal:"晉",name:"竹林棋隱",intro:"竹林七賢的棋友，下棋從不著急，常常一邊喝酒一邊落子。",hi:"竹林風清，慢慢下。",win:"一局清談，承讓了。",lose:"妙哉妙哉，飲一杯為你賀。"},
  nanbei:{seal:"南北",name:"石窟禪棋僧",intro:"在石窟前參禪的僧人，棋風沉穩如石，很少犯錯。",hi:"阿彌陀佛，施主請。",win:"心靜則棋明。",lose:"善哉，施主棋藝精進。"},
  sui:{seal:"隋",name:"運河船棋王",intro:"在大運河上跑船的棋王，船行到哪下到哪，擅長「借水行舟」。",hi:"船靠岸了，來一盤再開船。",win:"順水推舟，這盤我的。",lose:"逆風翻盤，好功夫！"},
  tang:{seal:"唐",name:"長安棋王",intro:"長安城最有名的棋待詔，棋風華麗大氣，像唐朝一樣盛世氣象。",hi:"長安花開，與君對弈一局。",win:"長安棋王的名號，還得再保一年。",lose:"春風得意，這章歸你。"},
  wudai:{seal:"五代",name:"太行畫棋翁",intro:"在太行山畫松的老畫家，下棋跟畫畫一樣，一筆一劃都有講究。",hi:"畫完這棵松，正好下一盤。",win:"這盤棋，像幅好畫。",lose:"後生可畏，老夫甘拜下風。"},
  song:{seal:"宋",name:"汴京茶棋客",intro:"汴京茶坊的常客，邊點茶邊下棋，鬥茶鬥棋都沒輸過。",hi:"茶已點好，請。",win:"茶沫未散，勝負已分。",lose:"這杯茶，敬你。"},
  yuan:{seal:"元",name:"草原馬棋汗",intro:"草原上騎馬長大的棋手，最愛橫衝直撞的車和馬。年輕時叫阿古拉，元末在雲河棋會跟石桌兩位棋仙交過手（千秋印譜 → 🪨 石桌往事）。",hi:"草原上的風，吹到棋盤上了！",win:"馬蹄聲響，勝負已定。",lose:"好漢子！這碗奶茶請你。"},
  ming:{seal:"明",name:"紫禁棋閣老",intro:"紫禁城裡的老閣老，下棋像辦公事，一絲不苟、滴水不漏。當年是雲河棋會的評判周文淵，園子裡那張石桌能留到今天，就是他一句話。",hi:"本閣老今日得閒，請。",win:"此局，准奏。",lose:"老臣……心服口服。"},
  qing:{seal:"清",name:"園林棋格格",intro:"住在江南園林的格格，琴棋書畫樣樣精通，是最後一位擂主。",hi:"園子裡梅花開了，陪本格格下一盤吧。",win:"嘻嘻，本格格又贏了。",lose:"哼，算你厲害……這章給你。"}};
const ARENA_ORDER=["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
const ARENA_TITLES=[[13,"十三朝棋王"],[7,"七朝豪傑"],[3,"擂台新秀"]];
const arenaStamps=()=>{try{return JSON.parse(localStorage.getItem("xq_arenaStamps")||"{}")||{}}catch(e){return{}}};
const arenaTitle=()=>{const n=Object.keys(arenaStamps()).length;const t=ARENA_TITLES.find(([k])=>n>=k);return t?t[1]:""};
window.XQ_TITLE=()=>{const c=typeof cupTitle==="function"&&cupTitle();if(c==="本週擂主")return c;return(typeof sealTitle==="function"&&sealTitle())||c||arenaTitle()||(typeof battleTitle==="function"&&battleTitle())||(typeof simTitle==="function"&&simTitle())||(typeof lingTitle==="function"&&(lingTitle()||jarTitle()))||(typeof histTitle==="function"&&histTitle())||""};   /* 開發者 11/5：擂台稱號優先，再來是將令、棋罐的稱號；11/9：本週擂主 → 千秋印主（13 方金印，07i2-seal.js）→ 其他 */   // 大廳廣播：別人點你的資料卡看得到
/* 擂主強度跟著你的電腦段位（新手大約「入門」棋力，越高段擂主越強）；意見回饋 288：最強的是經典公園的擂主，再強一級（不在 App 裡說破，讓玩家自己摸索） */
function arenaLevel(era){let p=0;try{p=(JSON.parse(localStorage.getItem("xq_cpuRate")||"null")||{}).pts||0}catch(e){}
  const base=p>=1150?7:p>=900?6:p>=600?5:p>=300?4:p>=100?3:2;return era==="classic"?7:base}   /* 意見回饋 426、427：石桌棋仙固定在「全力」的前一級（第 7 級職業頂尖），不跟著段位變 */
const eraLabel=k=>({classic:"青石園",qin:"秦朝",han:"漢朝",sanguo:"三國",weijin:"魏晉",nanbei:"南北朝",sui:"隋朝",tang:"唐朝",wudai:"五代",song:"宋朝",yuan:"元朝",ming:"明朝",qing:"清朝"})[k]||k;
/* 意見回饋 412：古代沒有「公園」這個詞（清末才出現），各朝代用當時的說法：秦漢的皇家「苑囿」（上林苑）、三國「園囿」（銅雀園）、
   魏晉以後文人的「園林」（金谷園、華林園）、隋煬帝的「西苑」→「林苑」、宋代的「園圃」、元代的「園亭」、清代口語的「園子」 */
const PW={classic:"園子",qin:"苑囿",han:"苑囿",sanguo:"園囿",weijin:"園林",nanbei:"園林",sui:"林苑",tang:"園林",wudai:"園林",song:"園圃",yuan:"園亭",ming:"園林",qing:"園子"};
const parkName=k=>k==="classic"||!PW[k]?"青石園":eraLabel(k)+"的"+PW[k];
/* 開發者要求：進園子的過場，配一句那個朝代棋手（或談棋名人）說過的話，每次隨機、不跟上一次重複。
   每句都對過原典（維基文庫的《弈人傳》、正史、《古今圖書集成・藝術典》、《佩文齋詠物詩選》卷二〇八等）；[句子, 誰, 出處, 小注]。11/10 開發者「要講象棋的史實，有圍棋的都拿掉」：只留講象棋、六博、象戲的句子，講「弈」的都拿掉；沒有句子的朝代用經典那組 */
const PARK_Q={
  classic:[["觀棋不語真君子，起手無回大丈夫。","民間棋諺","代代口耳相傳","下棋的老規矩，說不出是誰先講的"],
    ["當局稱迷，傍觀見審。","元行沖","《舊唐書・元行沖傳》","「當局者迷，旁觀者清」的出處"],
    ["一著不慎，滿盤皆輸。","俗諺","",""]],
  qin:[["菎蔽象棋，有六簙些。分曹並進，遒相迫些。","戰國楚辭","《楚辭・招魂》","「象棋」兩字最早出現在這裡，當時指六博一類的棋戲"]],
  han:[["以善格五召待詔。","吾丘壽王","《漢書・吾丘壽王傳》","格五又叫塞戲，是漢代一種走棋遊戲；他年輕時就因為擅長它被召進宮"]],
  sanguo:[["仙人攬六箸，對博太山隅。","曹植","〈仙人篇〉","六箸是玩六博要擲的竹箸；連仙人都在泰山腳下對博"]],
  weijin:[["方畔揭道張，張畔揭道方。","許博昌的六博口訣（東晉葛洪記）","《西京雜記》卷四","漢代許博昌的六博口訣，長安周邊（三輔）的小孩都會背；《西京雜記》舊題葛洪所編"]],
  nanbei:[["臣伏讀聖製《象經》，並觀象戲，私心踴躍，不勝忭舞。","庾信","〈進象經賦表〉","北周武帝寫成《象經》（569 年），庾信上表稱賀"],
    ["帝制象經成，集百僚講說。","北周武帝","《周書・武帝紀》","天和四年（569 年），北周武帝寫成《象經》，召集百官來聽他講解"]],
  sui:[["若叩洪鐘，如懸明鏡。","庾信","〈象戲賦〉","寫北周武帝的象戲；庾信由北周入隋，隋開皇元年（581）去世"],
    ["於是綠簡既開，丹局直正，理洞研機，原窮作聖。","庾信","〈象戲賦〉",""]],
  tang:[["天馬斜飛度三止，上將橫行擊四方。輜車直入無回翔，六甲次第不乖行。","牛僧孺","《玄怪錄・岑順》（《全唐詩》卷八六七）","岑順夢見兩軍在棋盤上開戰，是唐人小說裡寫象戲的珍貴文字"]],
  wudai:[],
  song:[["大都博弈皆戲劇，象戲翻能學用兵。","程顥","〈象戲〉",""],
    ["中權八面將軍重，河外尖斜步卒輕。","程顥","〈象戲〉","寫的已經是有九宮、有河界的象棋"],
    ["余為兒時，無他弄，見設局布棋為此戲者，縱橫出奇，愕然莫測，以為小道可喜也。","晁補之","〈廣象戲圖序〉（1079）","他小時候看人下象棋，驚嘆不已"],
    ["象戲，戲兵也。","晁補之","〈廣象戲圖序〉",""],
    ["小藝無難精，上智有未解。君看橘中戲，妙不出局外。","劉克莊","〈象奕一首呈葉潛仲〉",""],
    ["遠砲勿虛發，冗卒要精汰。","劉克莊","〈象奕一首呈葉潛仲〉","南宋的象棋已經有砲和卒"]],
  yuan:[],
  ming:[["善著象棋，……天下無敵。","地方志記明代象棋高手秦科","《蘭陽縣志》（《古今圖書集成・藝術典》卷七九九引）","明代象棋高手秦科，地方志說他天下無敵"]],
  qing:[]};
/* 隨機挑一句，不跟這個朝代上一次的重複 */
function parkQuote(k){const L=PARK_Q[k]&&PARK_Q[k].length?PARK_Q[k]:PARK_Q.classic;let last=-1;try{const v=sessionStorage.getItem("pq_"+k);if(v!==null)last=+v}catch(e){}
  let i=Math.floor(Math.random()*L.length);if(L.length>1&&i===last)i=(i+1+Math.floor(Math.random()*(L.length-1)))%L.length;
  try{sessionStorage.setItem("pq_"+k,String(i))}catch(e){}const[q,who,src,n]=L[i];return{q,who,src,n}}
const sealHTML=(era,on,big)=>{const A=ARENA[era],s=A?A.seal:"?";return`<span class="seal-st${on?" on":""}${big?" big":""}${s.length>1?" two":""}">${esc(s)}</span>`};
// 擂台面板：這個朝代的擂主介紹、難度、有沒有蓋過章；按「挑戰」開打
/* 意見回饋 714：擂主棋力寫成新的 18 級名稱（舊 8 級的 lv 在引擎那邊會換成 2,4,6,9,11,15,16,18 級），跟對局畫面的「第 N 級「業2」」一致；航行難度的加減照引擎 lvAdj 算 */
const ARENA_FINE=[0,2,4,6,9,11,15,16,18],FINE_NM=["新手","入門1","入門2","入門3","業1","業2","業3","業4","業5","業6","業7","業8","業9","專1-1","專1-2","專2-1","專2-2","專3・全力"];
const arenaLvName=lv=>{const n0=ARENA_FINE[Math.max(1,Math.min(8,lv))],d=typeof diffDx==="function"?Math.round(+diffDx()||0):0,n=!d?n0:d>0?Math.min(Math.max(n0,17),n0+d):Math.max(1,n0+d);return`第 ${n} 級「${FINE_NM[n-1]}」`};
function arenaSheet(era,start){era=ARENA[era]?era:"classic";const A=ARENA[era],S=arenaStamps()[era],lv=arenaLevel(era),LV=arenaLvName(lv);
  /* 意見回饋 697（開發者 11/6）：擂主只在自己那一朝守擂。別朝的擂主卡（集章簿點別朝、擂台「下一位擂主」）只能看，按鈕寫「⛵ 回星槎開往〇朝」；還沒停靠的寫「還沒停靠」，不能打 */
  const away=era!==store.get("era","classic"),lockd=away&&eraLocked(era);
  sheet(`🏯 ${eraLabel(era)}擂台`,b=>{b.innerHTML=`<div style="display:flex;gap:14px;align-items:center">${typeof sealDraw==="function"?sealDraw(era,{lg:1}):sealHTML(era,!!S,true)}<div><div style="font-size:20px;font-weight:900;font-family:var(--serif)">${esc(A.name)}</div>
      <div class="muted" style="font-size:13px">擂主棋力：${LV}（${era==="classic"?"固定，全力的前一級":"跟著你的段位"}）</div></div></div>
    <p style="line-height:1.7;margin:10px 0">${esc(A.intro)}</p>
    <div class="card" style="margin-bottom:10px">${S?`✅ 已經打贏過（${new Date(S.at).toLocaleDateString()}，${S.n} 步贏下），${esc(typeof sealNm==="function"?sealNm(era):eraLabel(era))}的「擂台」那一邊亮了。可以再挑戰練功。`:"打贏擂主，"+esc(typeof sealNm==="function"?sealNm(era):eraLabel(era))+"的「擂台」那一邊就會亮起來（千秋印譜）。"}</div>
    ${!away&&typeof chdChalHTML==="function"?chdChalHTML(era):""}<div class="row" style="gap:8px">${!away?`<button class="btn" id="arGo" style="flex:2">⚔ 挑戰擂主</button>`:lockd?`<button class="btn" disabled style="flex:2">🔒 還沒停靠${esc(eraLabel(era))}</button>`:`<button class="btn" id="arShip" style="flex:2">⛵ 回星槎開往${esc(era==="classic"?"船艙":eraLabel(era))}</button>`}<button class="btn ghost" id="arBk" style="flex:1">🏮 千秋印譜</button></div>
    ${away?`<p class="muted" style="font-size:12.5px;line-height:1.6;margin:8px 0 0">${lockd?"星槎還沒停靠這一朝：到「⛵ 雲河星槎」按「起航」，星槎就會往下一站開。":`擂主只在自己那一朝守擂：回星槎開到${esc(eraLabel(era))}，下船走到渡口的 🏯 擂台再挑戰。`}</p>`:""}`;
    {const g=b.querySelector("#arGo");if(g)g.onclick=()=>{if(typeof chdChalSet==="function")chdChalSet(b,era);closeSheet();start(era,lv)}}   /* 意見回饋 774 七星破擂：記下有沒有勾「本命挑戰」 */
    {const sp=b.querySelector("#arShip");if(sp)sp.onclick=()=>{closeSheet();goUp("#/adventure",()=>{if(typeof shipGoTo==="function")shipGoTo(era)})}}
    b.querySelector("#arBk").onclick=()=>stampBook(start)})}
