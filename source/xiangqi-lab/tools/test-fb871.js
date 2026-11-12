// 回饋 871／872／873（開發者 11/12，版本 20261112-0100）的單元測試。不開瀏覽器：
//   871「車輪戰出現小帥妹過場動畫」：
//     1. park3d 沒給 gate／arena 時，載入畫面是「小帥（妹）走去園子」；車輪戰（08s-simul.js）現在一定給棋館的 gate（SIM_GATE），不敲過場鼓
//     2. 06-cpu.js parkDraw 真的跑一次（假的 XQPark3D）：車輪戰 quietMate → 不播入座運鏡（intro=null、換盤也不叫 intro）、小帥不說「我是小帥妹，幫你加油！」；
//        一般挑戰電腦照舊有入座運鏡和招呼
//     3. simIntro 自己不用小帥／小帥妹的圖或名字
//     追加（開發者 11/12）：玩家這一側的角色照舊看得到（不拿掉 mate）；對面坐這一桌的棋客（SIM_LOOK 十一位，跟開場過場同一份 cast，續局也一樣）；
//     平面棋盤時到處走的小幫手（.xqbot）在車輪戰頁藏起來、離開就恢復，不動小幫手開關
//   872／873「漂流瓶答對後『✔ 對了！』下面一排點點點」：
//     4. 漂流瓶 160 題（site/data/canju/even-mid.json 有 g 的）用真的 qqBottleGo 出題：每一題的說明都有內容（不是資料缺欄位）
//     5. 石桌往事題目頁（jLevel boardPage）#note 照內容高度、不再 flex:1；用簡化的 flex 欄排版算 iPhone 高度：舊版說明只剩 8px（就是截圖那一條），新版整段看得到
//     6. 01-board.js tmxVis：被裁掉的記譜不算看得到（泡泡不再指著看不見的字）
// 用法：node --test tools/test-fb871.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const M=f=>fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m",f),"utf8").replace(/\r\n/g,"\n");
const PARK3D=fs.readFileSync(path.join(__dirname,"../src/park3d.js"),"utf8");
const SIMUL=M("08s-simul.js"),CPU=M("06-cpu.js"),LEG=M("07-legend.js"),QQ=M("07h-qqev.js"),BOARD=M("01-board.js");
const C=require("../site/core.js");
const cut=(src,start,end)=>{const i=src.indexOf(start);assert.ok(i>=0,"找不到 "+start);const j=src.indexOf(end,i+start.length);assert.ok(j>i,"找不到結尾 "+end);return src.slice(i,j)};

// ---------- 871 ----------
const SIM_GATE=new Function(cut(SIMUL,"const SIM_GATE=","\n")+";return SIM_GATE")();
/* 車輪戰的棋客資料：SIM_PC、SIM_CN、SIM_M／SIM_F、simSpots、simCast、SIM_NM、SIM_LOOK、simOppLook、simCastOf（store 用假的） */
function simKit(){const mem={};const store={get:(k,d)=>k in mem?JSON.parse(mem[k]):d,set:(k,v)=>{mem[k]=JSON.stringify(v)}};
  const src=[cut(SIMUL,"const SIM_Q=","function simHomo("),cut(SIMUL,"const SIM_PC=","function simPlate("),cut(SIMUL,"function simSpots(","function simIntro(")].join("\n");
  return Object.assign(new Function("store",src+";return{SIM_PC,SIM_CN,SIM_M,SIM_F,simSpots,simCast,SIM_NM,SIM_LOOK,simOppLook,simCastOf}")(store),{mem,store})}
const simEx=(K,S,i)=>{const m=SIMUL.match(/parkDraw\(v\.querySelector\("#bbox"\),bd,t\.board,o,(\{tap:[^}]*\})\)/);assert.ok(m,"車輪戰的 parkDraw 呼叫找不到");
  K=K||simKit();S=S||{id:"g1",n:5};const cast=K.simCastOf(S);return new Function("tap","SIM_GATE","simOppLook","cast","t","simX","return "+m[1])(()=>{},SIM_GATE,K.simOppLook,cast,{i:i||0,level:7},null)};

test("〔原始碼〕871：park3d 沒給 gate 的預設載入畫面就是「小帥（妹）走去園子」，有 gate.title 就換掉", ()=>{
  assert.match(PARK3D,/小帥妹":"小帥"}走去園子/);
  assert.match(PARK3D,/else if\(opt\.gate&&opt\.gate\.title\)\{/);
  assert.match(PARK3D,/window\.XQ_DRUM&&!\(opt\.gate&&opt\.gate\.quiet\)\)/,"gate.quiet 要能關掉過場鼓");
});

test("871：車輪戰給棋館 gate（同 simIntro 那張圖）、quietMate，不用小帥的圖", ()=>{
  const ex=simEx();
  assert.equal(ex.gate,SIM_GATE);assert.equal(ex.quietMate,true);assert.equal(ex.bg,"data/park/simul_360.webp");
  assert.ok(SIM_GATE.title&&SIM_GATE.title.includes("車輪戰"),"gate.title 有字才會換掉預設的小帥走路");
  assert.deepEqual(SIM_GATE.img,["data/simul/simul_bg.webp"]);
  for(const u of SIM_GATE.img)assert.match(u,/^data\/[\w\/.-]+$/,"park3d 只收 data/ 開頭的圖");
  assert.equal(SIM_GATE.quiet,true);assert.ok(!SIM_GATE.walk&&!SIM_GATE.quote,"不另外停住，3D 載好就收");
  assert.ok(!/data\/xs\/|小帥/.test(JSON.stringify(SIM_GATE)));
  const intro=cut(SIMUL,"function simIntro(","function SimulPage(");
  assert.ok(!/data\/xs\/|myLook|BOTN|小帥|mySex|pSex/.test(intro),"simIntro 只放棋館和棋客");
});

function runParkDraw(){
  const fn=cut(CPU,"function parkDraw(","\n/* =");const calls={create:[],say:[],intro:[],oppSay:[]};let hash="#/simul";const timers=[];
  const el=()=>({style:{},hidden:false,children:[],querySelector:()=>null,append(){},prepend(){}});
  const host=Object.assign(el(),{querySelector:()=>null});
  const pv=()=>{const p={el:{},say:(t)=>calls.say.push(t),oppSay:t=>calls.oppSay.push(t),intro:k=>{calls.intro.push(k);return true},show(){},draw:(b,o,ex)=>{(calls.draw=calls.draw||[]).push(ex)},destroy(){},hide(){}};return p};
  const P3={create:(h,opt)=>{calls.create.push(opt);return pv()}};const env={parkOn:()=>true,window:{XQPark3D:P3},XQPark3D:P3,parkLoad:()=>Promise.resolve(),toast(){},
    store:{get:(k,d)=>k==="era"?"classic":k==="parkView"?"":d,set(){}},pkIntroKey:ex=>String(ex&&ex.gid||("h:"+hash)),parkQuote:()=>null,pkGateWatch(){},parkUi(){},
    BOTN:()=>"小帥妹",getComputedStyle:()=>({position:"relative"}),eraLabel:k=>k,PW:{},document:{body:{contains:()=>true},createElement:el,querySelector:()=>null},
    botVis(){},parkLook:()=>({}),oppFig:x=>x,remoteLook:x=>x,myLook:()=>({cus:"me:girl"}),parkCrowd:()=>({}),pkSwUi(){},pkGateEat:()=>false,pkSwTap(){},parkInfo(){},
    setTimeout:f=>{timers.push(f);return timers.length}};
  const names=Object.keys(env);
  const mk=new Function(...names,"let PARK=null;"+fn+";return{parkDraw,reset(){PARK=null}}");
  const api=mk(...names.map(k=>env[k]));
  const flush=()=>{while(timers.length)timers.shift()()};
  return{api,calls,flush,host,setHash:h=>{hash=h}};
}

test("871：parkDraw 跑車輪戰（quietMate）→ 沒有入座運鏡、小帥不打招呼；換一盤也不補播", ()=>{
  const R=runParkDraw(),bd={svg:{style:{}}},ex=simEx();
  R.api.parkDraw(R.host,bd,[],{},ex);R.flush();
  assert.equal(R.calls.create.length,1);const opt=R.calls.create[0];
  assert.equal(opt.intro,null,"入座運鏡不播");assert.equal(opt.gate,SIM_GATE,"載入畫面用棋館 gate");assert.equal(opt.indoor,true);
  assert.deepEqual(R.calls.say,[],"小帥不說「我是小帥妹，幫你加油！」");
  R.setHash("#/simul?x=1");R.api.parkDraw(R.host,bd,[],{},simEx());R.setHash("#/simul2");R.api.parkDraw(R.host,bd,[],{},simEx());R.flush();
  assert.equal(R.calls.create.length,1,"同一座棋館不重建");assert.deepEqual(R.calls.intro,[],"換盤代號變了也不叫 intro");
});

test("871：一般挑戰電腦（沒有 quietMate）照舊有入座運鏡和小帥招呼（沒有被一起關掉）", ()=>{
  const R=runParkDraw(),bd={svg:{style:{}}};R.setHash("#/cpu");
  R.api.parkDraw(R.host,bd,[],{},{tap(){},gid:"cpu:1",gate:{title:"移步後園",img:[]}});R.flush();
  assert.equal(R.calls.create[0].intro,"cpu:1");assert.deepEqual(R.calls.say,["我是小帥妹，幫你加油！"]);
  R.api.parkDraw(R.host,bd,[],{},{tap(){},gid:"cpu:2",gate:{title:"移步後園",img:[]}});
  assert.deepEqual(R.calls.intro,["cpu:2"],"換下一盤照舊播入座運鏡");
});

test("871 追加：玩家這一側的角色照舊看得到（mate＝myLook），對面坐的是這一桌的棋客", ()=>{
  const K=simKit(),S={id:"g9",n:5},R=runParkDraw(),bd={svg:{style:{}}};
  const ex0=simEx(K,S,0);assert.ok(!("mateLook" in ex0)&&!ex0.noMate,"車輪戰不拿掉自己這一側的角色");
  R.api.parkDraw(R.host,bd,[],{},ex0);const d0=R.calls.draw[0];
  assert.deepEqual(d0.mateLook,{cus:"me:girl"},"自己這一側坐著玩家的角色（沒選角色＝小帥妹）");
  const cast=K.simCastOf(S);assert.equal(d0.opp.npc,K.SIM_NM[cast[0]]);assert.equal(d0.opp.sim,1);assert.equal(d0.opp.e,"ming");
  assert.equal(typeof d0.opp.cus,"object","造型物件直接給 bot3d（不是 data/xs 的小帥圖）");
  R.api.parkDraw(R.host,bd,[],{},simEx(K,S,3));const d3=R.calls.draw[1];
  assert.equal(d3.opp.npc,K.SIM_NM[cast[3]],"換到第 4 桌，對面換成第 4 桌的棋客");
  assert.equal(R.calls.create.length,1,"換桌不重建棋館");
  assert.match(SIMUL,/parkDraw\([^\n]*quietMate:true,opp:simOppLook\(cast\[t\.i\],t\.level\),simul:simX\}\)/);
  assert.match(SIMUL,/playerHTML\("b",`第 \$\{t\.i\+1\} 桌・\$\{t\.name\|\|SIM_NM\[cast\[t\.i\]\]\|\|"棋客"\}`/,"上方名牌寫同一位棋客");
  assert.match(CPU,/else if\(op&&op\.sim&&op\.npc\)\{t=op\.npc;x=op\.about\|\|""\}/,"點對面的人：車輪戰棋客的介紹，不是「園子路人」");
});

test("871 追加：十一位棋客的 3D 造型（性別、年紀對得上立牌圖；欄位都是 bot3d 認得的）", ()=>{
  const K=simKit(),B3=fs.readFileSync(path.join(__dirname,"../src/bot3d.js"),"utf8"),CUS=JSON.parse(B3.match(/const CUS=(\{.*?\});/s)[1]);
  const keys=new Set(),vals={};for(const c of Object.values(CUS))for(const[k,v]of Object.entries(c)){keys.add(k);(vals[k]=vals[k]||new Set()).add(v)}
  const ids=Object.keys(K.SIM_LOOK).map(Number).sort((a,b)=>a-b);assert.deepEqual(ids,[1,2,3,4,5,6,7,8,9,10,11]);
  assert.deepEqual([...K.SIM_M,...K.SIM_F].sort((a,b)=>a-b),ids,"男 6 位＋女 5 位都有造型");
  for(const id of ids){const L=K.SIM_LOOK[id];assert.ok(K.SIM_NM[id]);
    for(const[k,v]of Object.entries(L)){assert.ok(keys.has(k),`第 ${id} 位的欄位 ${k} bot3d 沒有`);
      if(["hat","hs","beard","brow","prop","prop2"].includes(k))assert.ok(vals[k].has(v),`第 ${id} 位 ${k}=${v} bot3d 沒有這種`);
      if(typeof v==="string"&&v[0]==="#")assert.match(v,/^#[0-9A-F]{6}$/i)}
    const o=K.simOppLook(id,5);assert.equal(o.p,K.SIM_CN[K.SIM_PC[id]],"身上的字＝開場過場那面棋牌");assert.ok(o.about.includes(K.SIM_NM[id])&&o.about.includes("第 5 級"))}
  for(const id of K.SIM_F)assert.ok(!K.SIM_LOOK[id].beard,K.SIM_NM[id]+" 是女生，不留鬍子");
  for(const id of[5,10])assert.equal(K.SIM_LOOK[id].brow,"white",K.SIM_NM[id]+" 白眉白髮");
  assert.ok(K.SIM_LOOK[5].beard==="long"&&K.SIM_LOOK[4].beard&&K.SIM_LOOK[11].beard&&!K.SIM_LOOK[1].beard&&!K.SIM_LOOK[3].beard);
  assert.equal(K.simOppLook(99),null);
});

test("871 追加：同一場的棋客座位記住（開場過場、3D、續局一致），新的一場重抽", ()=>{
  const K=simKit();for(const n of[3,5,10]){const S={id:"s"+n,n};const a=K.simCastOf(S),b=K.simCastOf({...S});
    assert.deepEqual(a,b,"同一場拿到同一份");assert.equal(a.length,n);assert.equal(new Set(a).size,n,"不重複");
    const f=a.filter(x=>K.SIM_F.includes(x)).length;assert.ok(f===Math.floor(n/2)||f===Math.ceil(n/2),"男女各半");
    if(n===10){const sp=K.simSpots(10);sp.forEach((o,i)=>{if(o.back)assert.ok(a[i]>2,"學童、茶客沒有背影圖，不排下半圈")})}}
  const K2=simKit();K2.mem.simCast=K.mem.simCast;const S10={id:"s10",n:10};assert.deepEqual(K2.simCastOf(S10),K.simCastOf(S10),"關掉 App 再回來（store 還在）一樣");
  K.store.set("simCast",{id:"old",c:[1,2,3]});const c2=K.simCastOf({id:"new",n:3});assert.notEqual(K.store.get("simCast").id,"old");assert.equal(c2.length,3);
  K.store.set("simCast",{id:"bad",c:[1,2,99]});assert.ok(K.simCastOf({id:"bad",n:3}).every(x=>K.SIM_LOOK[x]),"壞掉的紀錄重抽");
  assert.match(cut(SIMUL,"function simIntro(","function SimulPage("),/cast=simCastOf\(S,sp\)/,"開場過場用同一份");
});

test("〔混合〕871 追加：車輪戰頁藏小幫手（.xqbot），離開就恢復，不改小幫手開關", ()=>{
  assert.match(SIMUL,/body\.sim-on \.xqbot\{visibility:hidden!important\}/);
  const pg=SIMUL.slice(SIMUL.indexOf("function SimulPage("));
  assert.match(pg,/document\.body\.classList\.add\("sim-on"\)/);
  assert.match(pg,/return\{stop\(\)\{[^\n]*removeEventListener\("hashchange",botBack\);document\.body\.classList\.remove\("sim-on"\)\}\}\}/);
  const re=new Function("return "+pg.match(/if\(!(\/\^#\\\/simul[^ ]*?\/)\.test\(location\.hash\)\)/)[1])();
  for(const h of["#/simul","#/simul?x=1","#/simul/a"])assert.ok(re.test(h),h+" 還在車輪戰");
  for(const h of["#/","#/simulx","#/cpu","#/hub/battle"])assert.ok(!re.test(h),h+" 離開了，小幫手要回來");
  assert.ok(!/store\.set\("(bot|xqbot|botOn|botOff)/.test(pg),"不動小幫手開關");
});

// ---------- 872／873 ----------
const POOL=JSON.parse(fs.readFileSync(path.join(__dirname,"../site/data/canju/even-mid.json"),"utf8")).items.filter(x=>x.g);
const B2_CN=new Function(cut(LEG,"const B2_CN=","\n")+";return B2_CN")();
const lvSq=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))];
const qqLossTxt=new Function(cut(QQ,"const qqLossTxt=","\n")+";return qqLossTxt")();
const qqBottleGo=new Function("window","lvSq","B2_CN","toT","qqLossTxt","jRunSet","qqBoard",cut(QQ,"function qqBottleGo(","\nfunction qqBottleDone(")+";return qqBottleGo")(
  {XQCore:C},lvSq,B2_CN,s=>String(s),qqLossTxt,()=>{},()=>{});

test("872：漂流瓶每一題的說明都有內容（資料沒缺欄位、欄位名也對）", ()=>{
  assert.ok(POOL.length>=100,"漂流瓶題庫 "+POOL.length+" 題");
  for(const pos of POOL){const Cx={ev:{id:"t"},res:{pos}};qqBottleGo(Cx);const st=Cx.G.steps[0];
    assert.equal(st.t,"guess");assert.equal(st.items.length,3,pos.id);
    for(const it of st.items){assert.ok(it.note&&it.note.length>20,pos.id+" 說明是空的");assert.match(it.note,/^大師走的是「[^」]+」/);
      assert.ok(!/undefined|NaN|null|「」/.test(it.note),pos.id+"："+it.note);assert.ok(it.options.includes(it.answer)&&it.options.length===3)}}
});

/* 簡化的 CSS flex 欄排版（§9.7：先 hypothetical size，有剩分給 grow、不夠照 shrink×basis 縮，碰到 min／max 凍結再分） */
function flexCol(H,items){const it=items.map(x=>({...x,min:x.min||0,max:x.max==null?1e9:x.max}));
  for(const x of it)x.size=Math.min(x.max,Math.max(x.min,x.basis));let frozen=new Set();
  for(let k=0;k<20;k++){const free=H-it.reduce((s,x)=>s+x.size,0);if(Math.abs(free)<.01)break;
    const act=it.filter(x=>!frozen.has(x)&&(free>0?x.grow>0:x.shrink>0));if(!act.length)break;
    const w=act.map(x=>free>0?x.grow:x.shrink*x.basis),tw=w.reduce((a,b)=>a+b,0);let hit=false;
    act.forEach((x,i)=>{let n=x.size+free*w[i]/tw;if(n<x.min){n=x.min;frozen.add(x);hit=true}if(n>x.max){n=x.max;frozen.add(x);hit=true}x.size=n});if(!hit)break}
  return Object.fromEntries(it.map(x=>[x.id,Math.round(x.size)]))}
const noteStyle=()=>{const m=LEG.match(/function boardPage\(st\)\{[^\n]*<div class="note" id="note" style="([^"]*)"><\/div><div id="lvO"/);assert.ok(m,"boardPage 的 #note 找不到");return m[1]};

test("〔混合〕872：題目頁 #note 不再被選項按鈕擠成一條線（iPhone 高度排版試算）", ()=>{
  const s=noteStyle();assert.match(s,/flex:0 0 auto/);assert.match(s,/max-height:26vh/);assert.match(s,/overflow:auto/);assert.match(s,/white-space:pre-wrap/);
  const CSS=fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m.css"),"utf8");
  assert.match(CSS,/\.note\{flex:1;min-height:0;/,"舊的 .note（其他頁面照舊用）");
  assert.match(CSS,/\.view\.fixed \.boardbox\{flex:0 1 auto;min-height:120px\}/,"棋盤可以縮、最小 120px");
  const sizes=[[390,844-47-34-56],[375,667-20-56],[430,932-59-34-56]];
  for(const[W,H]of sizes){const board=Math.round((W-16)*620/560)+10,noteText=3*20+8,vh=(H+47+34+56)/100;
    const common=[{id:"hdr",basis:40},{id:"board",basis:board,shrink:1,min:120},{id:"stat",basis:22},
      {id:"lvO",basis:3*44+2*8+10},{id:"hint",basis:6},{id:"sp",basis:0,grow:1},{id:"acts",basis:64}];
    const old=flexCol(H,[...common.slice(0,3),{id:"note",basis:0,grow:1,shrink:1,min:8},...common.slice(3)]);
    const neu=flexCol(H,[...common.slice(0,3),{id:"note",basis:noteText,shrink:0,min:1.6*13,max:26*vh},...common.slice(3)]);
    assert.ok(old.note<1.6*13,`${W}×${H} 舊版說明只剩 ${old.note}px，一行字都放不下（截圖那一條點點點）`);
    assert.equal(neu.note,noteText,`${W}×${H} 新版說明整段 ${noteText}px`);assert.ok(neu.board>=120,`${W}×${H} 棋盤 ${neu.board}px`);
    assert.ok(Object.values(neu).reduce((a,b)=>a+b,0)<=H+1,"加起來不超過畫面，「下一題」按鈕還在")}
});

test("〔原始碼〕872：jLevel 猜著法、接香猜著法答完都把題目的 note 寫進 #note；沒有說明時不會補冒號", ()=>{
  assert.match(LEG,/v\.querySelector\("#stat"\)\.textContent=hit\?"✔ 對了！":"✘ 正解是「"\+\(ans\?ans\.cn:it\.answer\)\+"」";\n\s*v\.querySelector\("#note"\)\.textContent=\(it\.note\|\|""\)/);
  assert.match(LEG,/stat\(hit\?"✔ 對了":"✘ 正解："[^;]*;note\(it\.note\|\|""\)/);
  assert.ok(!/對了：/.test(LEG+QQ),"「對了」後面不接冒號");
});

test("873：tmxVis 不把被可捲框裁掉的記譜當成看得到", ()=>{
  const src=cut(BOARD,"const tmxVis=","\nfunction tmxMvtHint(");
  const mk=(r,parent,ov)=>({r,parentElement:parent,ov:ov||"visible",offsetParent:{},closest:()=>null,getBoundingClientRect(){return this.r}});
  const body={};const view=mk({top:60,bottom:800,left:0,right:390,width:390},body,"hidden");
  const note=mk({top:460,bottom:468,left:0,right:390,width:390},view,"auto");
  const inNote=mk({top:466,bottom:482,left:60,right:110,width:50},note);
  const ok=mk({top:300,bottom:316,left:60,right:110,width:50},mk({top:280,bottom:400,left:0,right:390,width:390},view,"auto"));
  const {tmxVis}=new Function("document","getComputedStyle","innerHeight","innerWidth",src+";return{tmxVis}")(
    {body},e=>({overflow:e.ov,overflowY:e.ov}),844,390);
  assert.equal(tmxVis(inNote),false,"被擠成一條線的說明裡的記譜：不指");
  assert.equal(tmxVis(ok),true,"整個看得到的記譜：照常指");
});
