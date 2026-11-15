// 黑洞・星門圍城切 3D 星盤（開發者 11/15：「星門圍城也可以切換成 3D 模式，像星淵對戰那樣」；m/07bhg-gatesiege.js 檔尾 gsvFlat 那一段）單元測試。
// 不開瀏覽器、不跑引擎、不載 three／park3d：vm 照 App 的順序載 07bht-td.js、07bhg-gatesiege.js，DOM、store、PARK（park3d 的 screenOf／headOf／tdCam）都是假的。
//   視角三態切換與記住（存檔鍵 gsvView，沒選過＝平面）、星門圍城不再一律平面、舊版塔防與車輪戰不受影響、每種盤上記號在 3D 的分類（貼地／直立／頭頂）、
//   gsvFrame 在平面與 3D 兩種座標下怎麼擺、「更多」選單那顆（06-cpu parkBtn）的行為、3D 開不起來退回平面。
// 這裡只證明座標換算、分類、狀態切換照設計走；3D 畫面本身（記號有沒有對準、HUD 有沒有蓋到）要實機看，測試看不到。
// 用法：node --test xiangqi-lab/tools/test-gate-siege-3d.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const TD=rd("xiangqi-db/m/07bht-td.js"),GS=rd("xiangqi-db/m/07bhg-gatesiege.js"),CPU=rd("xiangqi-db/m/06-cpu.js"),WHL=rd("xiangqi-db/m/07bhw-wheel.js"),I18=rd("xiangqi-db/m/07i18n.js");
const J=x=>JSON.parse(JSON.stringify(x));
/* 06-cpu 的頂欄那顆原文（parkIcon、parkLabel、parkBtn 三個宣告）拿出來跑 */
const PB=(()=>{const a=CPU.indexOf("const parkIcon=()=>"),b=CPU.indexOf("parkLabel()];",a);assert.ok(a>0&&b>a,"找得到 06-cpu parkBtn");return CPU.slice(a,b+"parkLabel()];".length)})();

/* ---------- 假 DOM（只做這支測試用得到的）：id 登記、classList、dataset、style、事件；innerHTML 只拆最外層的 <div>／<button>（盤上記號那一層） ---------- */
function fakeDom(){const REG=new Map();
  const mk=tag=>{const el={tagName:String(tag).toUpperCase(),_id:"",_cls:[],_html:"",children:[],dataset:{},attrs:{},_h:{},isConnected:true,title:"",textContent:"",hidden:false,
      style:{setProperty(k,v){this[k]=v}},
      get id(){return this._id},set id(v){this._id=v;REG.set(v,this)},
      get className(){return this._cls.join(" ")},set className(v){this._cls=String(v).split(/\s+/).filter(Boolean)},
      get innerHTML(){return this._html},set innerHTML(v){this._html=String(v);this.children=[];const re=/<(button|div)\b([^>]*)>([\s\S]*?)<\/\1>/g;let m;
        while((m=re.exec(this._html))){const c=mk(m[1]),cl=/class="([^"]*)"/.exec(m[2]),sq=/data-sq="(\d+)"/.exec(m[2]);if(cl)c.className=cl[1];if(sq)c.dataset.sq=sq[1];c._attr=m[2];c._html=m[3];c.parentNode=this;this.children.push(c)}},
      setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return k in this.attrs?this.attrs[k]:null},
      addEventListener(t,f){(this._h[t]||(this._h[t]=[])).push(f)},
      append(...a){for(const c of a)if(c&&typeof c==="object"){c.parentNode=this;this.children.push(c);if(c._id)REG.set(c._id,c)}},
      prepend(c){c.parentNode=this;this.children.unshift(c);if(c._id)REG.set(c._id,c)},after(c){c.parentNode=this.parentNode||this;if(c._id)REG.set(c._id,c)},
      remove(){if(this._id&&REG.get(this._id)===this)REG.delete(this._id);this.isConnected=false;const p=this.parentNode;if(p&&p.children){const i=p.children.indexOf(this);if(i>=0)p.children.splice(i,1)}},
      querySelector(s){if(s==="svg")return this._svg||null;const c=/^\.([\w-]+)$/.exec(s);return c?this.children.find(x=>x._cls.includes(c[1]))||null:null},querySelectorAll(){return[]},
      closest(){return null},getBoundingClientRect(){return this._rect||{left:0,top:0,width:0,height:0}},click(){for(const f of this._h.click||[])f({target:this,stopPropagation(){},preventDefault(){}})}};
    el.classList={contains:c=>el._cls.includes(c),add:(...a)=>{for(const c of a)if(!el._cls.includes(c))el._cls.push(c)},remove:(...a)=>{el._cls=el._cls.filter(c=>!a.includes(c))},
      toggle:(c,on)=>{const has=el._cls.includes(c),want=on===undefined?!has:!!on;if(want&&!has)el._cls.push(c);if(!want&&has)el._cls=el._cls.filter(x=>x!==c);return want}};
    return el};
  const doc={createElement:mk,getElementById:id=>REG.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],body:mk("body"),head:mk("head"),documentElement:mk("html")};
  return{doc,mk,REG}}

/* ---------- 開一個假的 App：store、toast、對局頁重畫（cgPlay.rr）、頂欄、#bbox（平面＝560×620 的 SVG） ---------- */
function boot(o){o=o||{};const D=fakeDom(),log={toast:[],rr:0,redraw:0,float:[]},mem=Object.assign({},o.store);
  const ctx={console,Math,JSON,Date,Set,Map,Object,Array,String,Number,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    document:D.doc,location:{hash:"#/journey/play"},innerWidth:390,innerHeight:844,matchMedia:()=>({matches:false}),addEventListener(){},removeEventListener(){},
    store:{get:(k,d)=>k in mem?JSON.parse(mem[k]):d,set:(k,v)=>{mem[k]=JSON.stringify(v)}},
    esc:s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])),
    toast:t=>log.toast.push(String(t)),vibrate(){},modal:()=>null,api:()=>Promise.resolve({}),XQCore:C,NAMES:{r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"}},
    bhIs:st=>!!st&&String(st.journey||"").startsWith("bh:"),BOTN:()=>"幻影棋客",focusApply(){},FOC:false,cgPlay:{rr:()=>{log.rr++;if(ctx.__rr)ctx.__rr()}}};
  ctx.window=ctx;ctx.focusOn=()=>!!ctx.FOC;vm.createContext(ctx);
  vm.runInContext(TD+"\n;"+GS+"\n;var PARK=null,PARK_OFF=false,PARK_LK=false;function parkOn(){return!PARK_OFF&&!focusOn()&&!!store.get('park3d',null)}\n"+PB+
    "\n;this.X={GSV,BHTD_VW,gsvIs,gsvFlat,gsvVw,gsvVwNorm,gsvVwNext,gsvParkTo,gsvP3Step,gsvP3Sync,gsvParkEx,gsvSetView,gsvVwFix,gsvParkBtn,gsvViewUi,gsvViewMenu,gsvHide,gsvTick,gsvFrame,gsvMarks,gsvMk3,gsvMkKind,gsvPos3,gsv3d,gsvEv,GSV_GND,bhtdFlat,bhtdParkEx,bhtdIs,bhtdXY,bhtdGnd,bhtd3d,bhtlFlat:typeof bhtlFlat==='function'?bhtlFlat:null,parkBtn,parkLabel,parkOn};",ctx);
  /* 對局頁的幾個元素 */
  const bb=D.mk("div");bb.id="bbox";bb.parentNode=D.mk("div");bb._svg={getBoundingClientRect:()=>({left:0,top:0,width:560,height:620})};const tr=D.mk("div");tr.id="topRight";
  const run=s=>vm.runInContext(s,ctx);
  return{ctx,X:ctx.X,D,log,mem,bb,tr,run,get:k=>k in mem?JSON.parse(mem[k]):undefined}}
/* 一盤星門圍城（真的規則開局）包成對局頁拿到的狀態 */
function game(E,lv,o){o=o||{};const G=E.X.GSV,start=G.startFen(lv,C),P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  P.td=G.boot({mode:G.MODE,lv,ch:"x_swordboy",L:1},P,C);return Object.assign(P,{id:o.id||"g"+lv,journey:"bh:gs"+lv,result:null,legal:C.legal(P.board,"r"),levels:[],level:1})}
/* 假的 park3d：3D 星盤畫在 #bbox、塔防鏡頭開著；格子→螢幕＝(100+路×40, 100+線×30)，頭頂＝腳下往上 50 */
function park3d(E,cam){const v={el:{isConnected:true,style:{display:""}},screenOf:q=>({x:100+q%9*40,y:100+(q/9|0)*30}),headOf:q=>({x:100+q%9*40,y:50+(q/9|0)*30}),tdCam:()=>cam===undefined?"top":cam,setTdCam(m){v.cams.push(m)},cams:[]};
  E.ctx.PARK={host:E.bb,v,last:{o:{sel:-1,targets:[]}}};return v}

/* ====================== 視角三態 ====================== */
test("視角三態：名稱跟舊版塔防同一套；「👁」點一下的順序 全局俯視 → 臨陣斜角 → 純淨平面 → 全局俯視；不認得的值當平面", ()=>{
  const E=boot(),X=E.X;
  assert.deepEqual(J(X.BHTD_VW),{top:"全局俯視",tilt:"臨陣斜角",flat:"純淨平面"});
  assert.deepEqual(["top","tilt","flat"].map(X.gsvVwNext),["tilt","flat","top"]);assert.equal(X.gsvVwNext("亂填"),"top");
  assert.equal(X.gsvVwNorm("top",false),"top");assert.equal(X.gsvVwNorm("tilt",false),"tilt");assert.equal(X.gsvVwNorm("flat",false),"flat");
  for(const bad of[undefined,null,"","3d",1,{}])assert.equal(X.gsvVwNorm(bad,false),"flat","不認得＝平面");
  assert.equal(X.gsvVwNorm("top",true),"flat","專注棋盤／螢幕報讀模式一律平面")});

test("星門圍城的預設維持平面；選過會記住（存檔鍵 gsvView），不跟舊版塔防的 bhtdView 連動", ()=>{
  const E=boot(),X=E.X,st=game(E,1);
  assert.equal(X.gsvVw(),"flat");assert.equal(X.gsvFlat(st),true,"沒選過＝平面");assert.equal(E.get("park3d"),undefined,"平面時不動玩家的 park3d");
  X.gsvSetView("top");assert.equal(E.get("gsvView"),"top");assert.equal(X.gsvVw(),"top");assert.equal(E.get("park3d"),true);assert.equal(E.log.rr,1,"換視角＝對局頁重畫一次");
  X.gsvSetView("tilt");assert.equal(E.get("gsvView"),"tilt");X.gsvSetView("tilt");assert.equal(E.log.rr,2,"同一個視角不重畫");
  X.gsvSetView("亂填");assert.equal(E.get("gsvView"),"tilt","不認得的值不存");
  X.gsvSetView("flat");assert.equal(E.get("gsvView"),"flat");assert.equal(E.get("park3d"),true,"回平面不去關 park3d（別的模式照玩家原本的設定）");
  assert.equal(E.get("bhtdView"),undefined,"沒寫到舊版塔防的鍵");
  /* 記住：換一個全新的 App、帶同一份存檔 */
  const E2=boot({store:{gsvView:JSON.stringify("tilt")}});assert.equal(E2.X.gsvVw(),"tilt");assert.equal(E2.X.gsvFlat(game(E2,1)),false);
  /* 舊版塔防選了 3D，星門圍城沒選過 → 還是平面；反過來也不影響 */
  const E3=boot({store:{bhtdView:JSON.stringify("tilt")}});assert.equal(E3.X.gsvVw(),"flat");assert.equal(E3.X.gsvFlat(game(E3,1)),true)});

test("星門圍城不再一律平面：選了 3D，bhtdFlat／bhtlFlat（08b 拿來決定 PARK_OFF）回 false，park3d 拿到塔防固定鏡頭；選平面照舊", ()=>{
  const E=boot(),X=E.X,st=game(E,3);
  assert.equal(X.bhtdFlat(st),true);assert.equal(J(X.gsvParkEx(st)).tdCam,null);
  for(const v of["top","tilt"]){X.gsvSetView(v);assert.equal(X.gsvFlat(st),false,v);assert.equal(X.bhtdFlat(st),false,v);if(X.bhtlFlat)assert.equal(X.bhtlFlat(st),false,v);
    const ex=J(X.bhtdParkEx(st));assert.equal(ex.tdCam,v,"07bh bhParkEx 疊進去的是 bhtdParkEx：星門圍城的盤要拿到自己的視角");assert.equal(ex.bhBoss,null);assert.equal(typeof ex.tdFx,"number")}
  X.gsvSetView("flat");assert.equal(X.bhtdFlat(st),true);assert.equal(J(X.bhtdParkEx(st)).tdCam,null);
  assert.equal(X.bhtdIs(st),false,"舊版塔防的 HUD 還是不畫星門圍城的盤")});

test("舊版塔防不受影響：它的盤照 bhtdView（沒選過＝全局俯視），星門圍城存什麼都不影響；不是黑洞的盤兩邊都不管", ()=>{
  const E=boot({store:{gsvView:JSON.stringify("flat")}}),X=E.X,old={id:"o1",journey:"bh:3",td:{mode:"td",boss:null},board:[]},cpu={id:"c1",journey:null,board:[]};
  assert.equal(X.bhtdIs(old),true);assert.equal(X.bhtdFlat(old),false);assert.equal(J(X.bhtdParkEx(old)).tdCam,"top");
  E.ctx.store.set("bhtdView","flat");assert.equal(X.bhtdFlat(old),true);assert.equal(J(X.bhtdParkEx(old)).tdCam,null);
  E.ctx.store.set("gsvView","tilt");assert.equal(X.bhtdFlat(old),true,"星門圍城選 3D 不會把舊版塔防拉成 3D");
  assert.equal(X.gsvFlat(old),false);assert.equal(X.gsvFlat(cpu),false);assert.deepEqual(J(X.bhtdParkEx(cpu)),{bhBoss:null,tdCam:null},"不是黑洞的盤照舊回空的");
  assert.equal(X.bhtdFlat(cpu),false)});

test("〔混合〕車輪戰維持平面：它的盤不是 journey bh:gs（gsvIs 不認），視角、鏡頭、「更多」那顆都不碰；07bhw-wheel.js 沒有接任何 3D 的東西", ()=>{
  const E=boot({store:{gsvView:JSON.stringify("top"),park3d:"true"}}),X=E.X,G=X.GSV,st=game(E,1);
  const w=Object.assign({},st,{id:"w1",journey:null});w.td=Object.assign({},st.td,{pool:{sp:35}});   /* 車輪戰：單盤規則用 GSV，但不開 journey */
  assert.equal(w.td.mode,G.MODE);assert.equal(X.gsvIs(w),false);assert.equal(X.gsvFlat(w),false);assert.equal(J(X.gsvParkEx(w)).tdCam,null);assert.equal(X.bhtdFlat(w),false);
  E.run("GSV_ST=null");assert.equal(X.gsvParkBtn(),false);
  for(const k of["gsvFlat","gsvParkEx","gsvSetView","gsvView","gsvMk3","parkDraw","PARK.","park3d","setTdCam","headOf","screenOf"])assert.ok(!WHL.includes(k),"07bhw-wheel.js 不該出現 "+k);
  assert.match(WHL,/WHL_BD=Board\(/,"車輪戰自己開平面棋盤（01-board Board）")});

/* ====================== 盤上記號：分類 ====================== */
const KIND={gate:"gnd",ring:"gnd","ring fc":"gnd","ring ifo":"gnd",trap:"gnd",dp:"gnd",tg:"gnd",selg:"gnd",ink:"gnd",aim:"gnd",
  "bd inv":"up","bd arm":"up","bd guard":"up","bd drain":"up","bd src":"up","bd frz":"up",gt:"up","lb lbdp":"up","lb lbring":"up","tg hit":"up","pnm r":"head","pnm b":"head"};
test("每種記號在 3D 的分類：星門、紅圈（砲的目標、入侵、集火、情報）、守門點、補給點、可點的目標、選中底光、落點、準星＝貼地；侵、陣、奪、令、砲、架、定、門 N、補＝直立；漢字牌＝頭頂", ()=>{
  const X=boot().X;for(const k in KIND)assert.equal(X.gsvMkKind(k),KIND[k],k);
  assert.equal(X.gsvMkKind("gate g3"),"gnd","貼地後多掛的 g3 不影響分類");assert.equal(X.gsvMkKind("gsv-mk bd inv"),"up");assert.equal(X.gsvMkKind("bt-mk pnm r"),"head");
  assert.equal(X.gsvMkKind("新的徽章"),"up","不認得的類名一律直立");assert.equal(X.gsvMkKind(""),"up");assert.equal(X.gsvMkKind("bd ring"),"up","徽章優先：有 bd 就直立");
  assert.equal(X.gsvMkKind("ring 新的顏色"),"gnd","圈狀的沿用 ring 就貼地")});

test("〔混合〕gsvMarks 寫到的每一種類名、樣式表裡每一種記號，3D 都有明確的分類：圈和框（寬高照格距 --c 的）一定貼地，徽章 bd 一定直立", ()=>{
  const X=boot().X,body=GS.slice(GS.indexOf("function gsvMarks(st){"),GS.indexOf("function gsvFrame(){")),ks=[...new Set([...body.matchAll(/k:"([^"]+)"/g)].map(m=>m[1].trim().split(" ")[0]))];
  assert.ok(ks.length>=6,"抓得到 gsvMarks 的類名："+ks.join(","));
  for(const k of ks)assert.ok(k==="bd"||X.GSV_GND.test(k),`gsvMarks 的記號「${k}」：圈狀要加進 GSV_GND（貼地），徽章請用 bd（直立）`);
  /* 樣式表：.gsv-mk.<類>{…width:calc(var(--c)…} 的＝畫成一格大小的圈或框 → 3D 要貼地 */
  const css=GS.slice(GS.indexOf("function gsvCss(){"),GS.indexOf("function gsvCard(){")),sized=[...css.matchAll(/\.gsv-mk\.([a-z0-9]+)\{[^}]*?\bwidth:calc\(var\(--c\)/g)].map(m=>m[1]);
  assert.ok(sized.includes("gate")&&sized.includes("ring")&&sized.includes("trap")&&sized.includes("dp")&&sized.includes("tg"),"樣式表抓得到："+sized.join(","));
  for(const k of sized)assert.equal(X.gsvMkKind(k),"gnd",`樣式表的 .gsv-mk.${k} 是照格距畫的圈或框，3D 要貼地（加進 GSV_GND）`);
  assert.equal(X.gsvMkKind("bd"),"up");assert.match(css,/\.gsv-mk\.g3\{transform-origin:0 0\}/,"貼地矩陣從元素左上角算")});

/* 把規則真的會產生的記號都擺出來：星門、入侵卒、護陣卒、奪靈馬、大招預告（令／砲、架、目標）、集火、守門點、定身、補給點、選目標 */
function allMarks(E){const X=E.X,G=X.GSV,out=[];
  const add=(st,why)=>{for(const m of J(X.gsvMarks(st)))out.push(Object.assign(m,{why}))};
  for(const lv of[1,3,4])add(game(E,lv),"第 "+lv+" 關開局");
  const st=game(E,4),td=st.td,ids=Object.keys(td.ids).map(Number),blk=ids.filter(q=>st.board[q]===st.board[q].toLowerCase()),red=ids.filter(q=>st.board[q]===st.board[q].toUpperCase());
  td.fx={id:"pao",src:td.ids[blk[0]],scr:td.ids[blk[1]],tg:td.ids[red[0]]};td.fc={sq:blk[2],r:td.rnd};td.ctl.trap={until:td.rnd+2,sqs:[40,41]};td.ctl.frz=[{id:td.ids[blk[3]],until:td.rnd+2}];
  const inv=blk.find(q=>G.tagOf(td,td.ids[q])==="inv");if(inv!=null)td.arm[td.ids[inv]]=1;add(st,"第 4 關＋隔山星砲、集火、守門、定身");
  td.fx={id:"zjhl",src:td.ids[blk[0]]};add(st,"卒將號令");
  E.run("GSV_INFO=true");add(st,"情報");E.run("GSV_INFO=false;GSV_TG={id:'dep',p:'R',pk:[]}");add(st,"部署選補給點");E.run("GSV_TG=null");return out}

test("規則真的會產生的記號（第 1、3、4 關開局、隔山星砲、卒將號令、集火、守門、定身、部署）每一種都分得到類，星門／侵／陣／奪／令／砲／架／定／補都出現過", ()=>{
  const E=boot(),X=E.X,L=allMarks(E),seen={},txt=new Set();
  for(const m of L){const kd=X.gsvMkKind(m.k);assert.ok(m.k in KIND,`「${m.k}」（${m.why}）要列進這支測試的分類表`);assert.equal(kd,KIND[m.k],m.k);seen[m.k]=1;if(m.t)txt.add(String(m.t).replace(/<[^>]+>/g,"").replace(/\d+/g,""))}
  for(const k of["gate","bd inv","bd guard","bd drain","bd src","bd frz","ring","ring fc","trap","dp","tg"])assert.ok(seen[k],"要出現過 "+k+"；實際："+Object.keys(seen).join("、"));
  for(const t of["門","侵","陣","奪","令","砲","架","定","補"])assert.ok(txt.has(t),"要出現過「"+t+"」；實際："+[...txt].join("、"))});

test("gsvMk3：貼地的記號不放字，字另起直立標籤（星門→「門 N」、補給點→「補」）；徽章原樣；選中底光、落點、準星、每顆子的漢字牌；疊放順序 貼地→點擊區→目標鈕→直立→漢字牌", ()=>{
  const E=boot(),X=E.X,st=game(E,1),b=st.board,L0=J(X.gsvMarks(st)),own=b.findIndex(p=>p==="R"),foe=b.findIndex(p=>p&&p===p.toLowerCase()),empty=b.findIndex(p=>!p);
  const L=J(X.gsvMk3(L0,b,{sel:own,targets:[empty,foe],pnm:true})),kinds=L.map(m=>X.gsvMkKind(m.k));
  /* 星門：平面是一個圈裡寫「門 N」；3D 是空的貼地圈＋直立的「門 N」（舊版塔防的 gt） */
  const g0=L0.filter(m=>m.k==="gate");assert.ok(g0.length>0,"第 1 關開局看得到星門");assert.match(g0[0].t,/^門<i>\d+<\/i>$/);
  const g3=L.filter(m=>m.k==="gate"),gt=L.filter(m=>m.k==="gt");assert.equal(g3.length,g0.length);assert.ok(g3.every(m=>!m.t),"貼地的圈不放字");
  assert.deepEqual(gt.map(m=>[m.sq,m.t,m.c]),g0.map(m=>[m.sq,m.t.replace("<i>"," ").replace("</i>",""),"bt"]),"每個門一塊「門 N」，同一格、同一個倒數");
  /* 補給點 */
  const d0=L0.filter(m=>m.k==="dp"),d3=L.filter(m=>m.k==="dp"),lb=L.filter(m=>m.k==="lb lbdp");assert.ok(d0.length>0,"輪到你時看得到補給點");assert.ok(d3.every(m=>!m.t));assert.deepEqual(lb.map(m=>[m.sq,m.t]),d0.map(m=>[m.sq,"補"]));
  /* 徽章原樣（第 1 關有入侵卒的話） */
  assert.deepEqual(L.filter(m=>/^bd /.test(m.k)),L0.filter(m=>/^bd /.test(m.k)));
  /* 選中、落點、可吃 */
  assert.deepEqual(L.filter(m=>["selg","ink","aim"].includes(m.k)),[{sq:own,k:"selg",c:"bt"},{sq:empty,k:"ink",c:"bt"},{sq:foe,k:"aim",c:"bt"}]);
  /* 漢字牌：每顆子一塊，紅方「俥」、黑方照黑方的字 */
  const pn=L.filter(m=>/^pnm /.test(m.k));assert.equal(pn.length,b.filter(Boolean).length);assert.deepEqual(pn.find(m=>m.sq===own),{sq:own,k:"pnm r",c:"bt",t:"俥"});
  assert.equal(pn.find(m=>m.sq===foe).k,"pnm b");assert.equal(pn.find(m=>m.sq===foe).t,X.GSV.PBN[b[foe].toUpperCase()]);
  /* 順序：貼地一段、直立一段、漢字牌最後（疊在最上面） */
  const order=kinds.join(",").replace(/(gnd,)+gnd|gnd/,"G").replace(/(up,)+up|up/,"U").replace(/(head,)+head|head/,"H");assert.equal(order,"G,U,H");
  /* 不要漢字牌、沒有選子（塔防鏡頭沒開、對局結束） */
  const L2=J(X.gsvMk3(L0,b,{sel:-1,pnm:false}));assert.ok(!L2.some(m=>/pnm|selg|ink|aim/.test(m.k)));assert.equal(L2.length,L0.length+g0.length+d0.length);
  assert.deepEqual(J(X.gsvMk3([],[],null)),[],"空的也不丟錯")});

test("〔混合〕選目標在 3D 上點得到：可點的目標貼地；目標格上有棋子的多一塊直立的透明點擊區（點在角色身上也算），空格（補給點）不用；點擊區排在目標圈下面", ()=>{
  const E=boot(),X=E.X,st=game(E,1),b=st.board,foe=b.findIndex(p=>p&&p===p.toLowerCase()),empty=b.findIndex(p=>!p);
  const L=J(X.gsvMk3([{sq:foe,k:"tg",b:1},{sq:empty,k:"tg",b:1},{sq:foe,k:"bd inv",t:"侵"}],b,{}));
  assert.deepEqual(L,[{sq:foe,k:"tg hit",b:1,h:1},{sq:foe,k:"tg",b:1},{sq:empty,k:"tg",b:1},{sq:foe,k:"bd inv",t:"侵"}]);
  /* 部署後備：選了子之後，補給點變成可點的目標（真的規則算的），3D 那一份照樣是貼地的鈕 */
  E.run("GSV_TG={id:'dep',p:'R',pk:[]}");const T=J(X.gsvMarks(st)).filter(m=>m.k==="tg");assert.ok(T.length>0,"部署俥至少有一個補給點可以放");
  const T3=J(X.gsvMk3(T,b,{}));assert.deepEqual(T3,T,"補給點是空格：只有貼地的鈕");assert.ok(T3.every(m=>m.b===1&&X.gsvMkKind(m.k)==="gnd"));
  /* gsvOvClick 用 .gsv-mk.tg 找被點的鈕：點擊區也要掛 tg，而且樣式要蓋成透明 */
  assert.match(GS,/const b=e\.target\.closest\("\.gsv-mk\.tg"\)/);assert.match(GS,/\.gsv-mk\.tg\.hit\{border:0;background:transparent;animation:none/)});

test("gsvPos3：貼地＝格子座標＋矩陣；矩陣算不出來退回直立；「門 N」抬高 .62 格；點擊區＝腳到頭的中點、高度＝腳到頭（至少半格）；其他直立的就在格子上", ()=>{
  const X=boot().X,p={x:200,y:300};
  assert.deepEqual(J(X.gsvPos3("gnd","gsv-mk gate",p,40,"1,0,0,0.75,0,0",null)),{x:200,y:300,m:"1,0,0,0.75,0,0"});
  assert.deepEqual(J(X.gsvPos3("gnd","gsv-mk gate",p,40,null,null)),{x:200,y:300});
  assert.deepEqual(J(X.gsvPos3("up","bt-mk gt",p,40,null,null)),{x:200,y:300-40*.62});
  assert.deepEqual(J(X.gsvPos3("up","gsv-mk bd inv",p,40,null,null)),{x:200,y:300});
  assert.deepEqual(J(X.gsvPos3("up","gsv-mk tg hit",p,40,null,{x:200,y:240})),{x:200,y:270,w:28,h:60});
  assert.deepEqual(J(X.gsvPos3("up","gsv-mk tg hit",p,40,null,{x:200,y:295})),{x:200,y:297.5,w:28,h:20},"俯視時頭腳很近：至少半格高");
  assert.deepEqual(J(X.gsvPos3("up","gsv-mk tg hit",p,40,null,null)),{x:200,y:300},"拖曳中角色藏起來（headOf 回 null）：留在腳下");
  assert.deepEqual(J(X.gsvPos3("head","bt-mk pnm r",{x:200,y:250},40,null,null)),{x:200,y:250})});

/* ====================== gsvFrame：平面與 3D 兩種擺法 ====================== */
function frame(E,st){E.run("GSV_MK=''");E.ctx.__st=st;E.run("GSV_ST=__st");if(!E.D.doc.getElementById("gsvOv")){const o=E.D.mk("div");o.id="gsvOv";o.innerHTML=`<div class="mks"></div>`}
  E.X.gsvFrame();return E.D.doc.getElementById("gsvOv").children[0].children.map(c=>({cls:c.className,sq:+c.dataset.sq,tf:c.style.transform,w:c.style.width,h:c.style.height,html:c._html,attr:c._attr,tag:c.tagName,disp:c.style.display}))}

test("gsvFrame 平面棋盤：跟原本一樣（類名 gsv-mk、座標照 560×620 的 SVG、沒有矩陣、沒有漢字牌）", ()=>{
  const E=boot(),X=E.X,st=game(E,1),L0=J(X.gsvMarks(st)),R=frame(E,st);
  assert.equal(X.gsv3d(),false);assert.equal(R.length,L0.length);
  for(let i=0;i<R.length;i++){const m=L0[i],x=40+m.sq%9*60,y=40+(m.sq/9|0)*60;assert.equal(R[i].cls,"gsv-mk "+m.k);assert.equal(R[i].html,m.t||"");assert.equal(R[i].tf,`translate(${x}px,${y}px) translate(-50%,-50%)`)}
  assert.ok(R.some(r=>/門<i>\d+<\/i>/.test(r.html)),"平面的星門照舊把「門 N」寫在圈裡");assert.ok(!R.some(r=>/pnm|g3|bt-mk/.test(r.cls)))});

test("gsvFrame 3D 星盤：圈和框用 park3d screenOf 的座標加貼地矩陣（掛 g3）；徽章直立在格子上；「門 N」抬高；漢字牌用 headOf；選中子、落點、可吃目標照 park3d 最後一次畫的選取", ()=>{
  const E=boot({store:{gsvView:JSON.stringify("top"),park3d:"true"}}),X=E.X,st=game(E,3),b=st.board,pv=park3d(E),own=b.findIndex(p=>p==="R"),foe=b.findIndex(p=>p&&p===p.toLowerCase()),empty=b.findIndex(p=>!p);
  E.ctx.PARK.last={o:{sel:own,targets:[empty,foe]}};assert.equal(X.gsv3d(),true);
  const R=frame(E,st),at=q=>({x:100+q%9*40,y:100+(q/9|0)*30}),of=(cls,sq)=>R.find(r=>r.cls.split(" ").slice(1).join(" ").replace(/ g3h?$/,"")===cls&&(sq==null||r.sq===sq));
  /* 貼地：格距 40、往下一格 30 → 矩陣 1,0,0,0.75 */
  for(const r of R.filter(r=>/ g3$/.test(r.cls))){const p=at(r.sq);assert.equal(r.tf,`translate(${p.x}px,${p.y}px) matrix(1,0,0,0.75,0,0) translate(-50%,-50%)`,r.cls)}
  const gate=of("gate"),gt=of("gt"),guard=of("bd guard"),dp=of("dp"),lb=of("lb lbdp");
  assert.ok(gate&&/^gsv-mk gate g3$/.test(gate.cls)&&gate.html==="","星門的圈貼地、圈裡沒有字");
  assert.ok(gt&&gt.cls==="bt-mk gt"&&/^門 \d+$/.test(gt.html));{const p=at(gt.sq);assert.equal(gt.tf,`translate(${p.x}px,${p.y-40*.62}px) translate(-50%,-50%)`)}
  /* 11/15 實機驗收：徽章放腳邊會被角色和漢字牌擋掉一半 → 那一格有棋子就掛在頭頂漢字牌的右上角（headOf 再往右 .55 格、往上半格，疊在漢字牌上層），類名多 g3h（不套腳邊的偏移） */
  assert.ok(guard&&guard.cls==="gsv-mk bd guard g3h"&&guard.html==="陣","第 3 關的護陣卒");{const p=at(guard.sq);assert.equal(guard.tf,`translate(${p.x+40*.55}px,${p.y-50-40*.5}px) translate(-50%,-50%)`,"徽章直立、掛在頭頂旁：沒有矩陣")}
  assert.deepEqual(J(X.gsvPos3("up","gsv-mk bd inv",{x:200,y:300},40,null,{x:200,y:250})),{x:222,y:230,hd:1});assert.match(GS,/\.gsv-mk\.bd\.g3h\{margin:0;z-index:2/);assert.deepEqual(J(X.gsvPos3("up","gsv-mk bd src",{x:200,y:300},40,null,null)),{x:200,y:300},"空格上的徽章（沒有頭頂座標）照舊在格子上");
  assert.match(GS,/inSheet=!!\(history\.state&&history\.state\.xqSheet\)\}catch\(e\)\{\}if\(inSheet\)setTimeout\(go,320\);else go\(\);return true\}/,"從「更多」卡片按的時候等卡片關掉再切視角（不然返回鍵會指到這一頁自己）");
  assert.match(GS,/#gsvOv \.bt-mk\.gt\{[^}]*white-space:normal/,"相鄰兩道門的「門 N」標籤改成窄的兩行，不互蓋");
  assert.ok(dp&&/ g3$/.test(dp.cls)&&dp.html==="");assert.ok(lb&&lb.cls==="gsv-mk lb lbdp"&&lb.html==="補","補給點的字另起直立標籤");{const p=at(lb.sq);assert.equal(lb.tf,`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`)}
  /* 選取：舊版塔防的類名 */
  assert.equal(of("selg",own).cls,"bt-mk selg g3");assert.equal(of("ink",empty).cls,"bt-mk ink g3");assert.equal(of("aim",foe).cls,"bt-mk aim g3");
  /* 漢字牌：每顆子一塊，位置是 headOf（腳下往上 50），排在最後 */
  const pn=R.filter(r=>/^bt-mk pnm /.test(r.cls));assert.equal(pn.length,b.filter(Boolean).length);for(const r of pn){const p=at(r.sq);assert.equal(r.tf,`translate(${p.x}px,${p.y-50}px) translate(-50%,-50%)`)}
  assert.ok(R.slice(-pn.length).every(r=>/pnm/.test(r.cls)),"漢字牌排最後（疊在其他記號上面）");assert.equal(R.find(r=>r.sq===own&&/pnm r/.test(r.cls)).html,"俥");
  /* 對局結束：不疊選取 */
  st.result={w:"r",why:"x"};assert.ok(!frame(E,st).some(r=>/selg|ink|aim/.test(r.cls)));st.result=null;
  /* 3D 畫面在、但塔防鏡頭沒開（不該發生；保險）：照樣貼地，不疊選取與漢字牌 */
  pv.tdCam=()=>null;const R2=frame(E,st);assert.ok(R2.some(r=>/gate g3/.test(r.cls)));assert.ok(!R2.some(r=>/pnm|selg/.test(r.cls)))});

test("gsvFrame 3D：選目標的鈕貼地、角色身上多一塊點擊區（寬 .7 格、腳到頭）；park3d 給不出座標的記號先藏起來；3D 畫面收掉（回平面）下一格就照平面擺", ()=>{
  const E=boot({store:{gsvView:JSON.stringify("tilt"),park3d:"true"}}),X=E.X,st=game(E,1),pv=park3d(E,"tilt");
  E.run("GSV_TG={id:'dep',p:'R',pk:[]}");const R=frame(E,st),tg=R.filter(r=>/^gsv-mk tg/.test(r.cls));assert.ok(tg.length>0);
  for(const r of tg){assert.equal(r.tag,"BUTTON");assert.match(r.cls,/^gsv-mk tg g3$/);assert.match(r.attr,/aria-label="目標 \d+"/);assert.match(r.tf,/matrix\(/)}
  E.run("GSV_TG=null");
  /* 假裝選敵子當目標：直接塞一個可點的目標在黑子上 */
  const foe=st.board.findIndex(p=>p&&p===p.toLowerCase()),L=J(X.gsvMk3([{sq:foe,k:"tg",b:1}],st.board,{}));assert.equal(L[0].k,"tg hit");
  const P3=J(X.gsvPos3("up","gsv-mk tg hit",pv.screenOf(foe),40,null,pv.headOf(foe)));assert.deepEqual([P3.w,P3.h,P3.y],[28,50,pv.screenOf(foe).y-25]);
  /* 座標給不出來（翻到背面、角色藏起來） */
  const so=pv.screenOf;pv.screenOf=q=>q===40?so(40):q===41?so(41):null;pv.headOf=()=>null;const R3=frame(E,st);assert.ok(R3.length>0&&R3.every(r=>r.disp==="none"),"沒有座標＝藏起來，不丟錯");
  /* 3D 收掉 */
  assert.ok(E.D.doc.body.classList.contains("gsv-3d"),"3D 時 body 掛 gsv-3d（選目標的提示條搬到上面，不蓋棋盤底線）");
  E.ctx.PARK.v.el.style.display="none";const R4=frame(E,st);assert.equal(X.gsv3d(),false);assert.ok(R4.every(r=>/^gsv-mk /.test(r.cls)&&!/g3|matrix/.test(r.cls+r.tf)&&r.disp===""));
  assert.ok(!E.D.doc.body.classList.contains("gsv-3d"),"回平面就拿掉");E.ctx.PARK.v.el.style.display="";frame(E,st);assert.ok(E.D.doc.body.classList.contains("gsv-3d"));X.gsvHide();assert.ok(!E.D.doc.body.classList.contains("gsv-3d"),"離開對局也拿掉")});

test("跳字在 3D 上對位：gsvEv 的座標走同一個 bhtdXY（3D＝park3d screenOf、平面＝SVG）", ()=>{
  const E=boot(),X=E.X;E.run("bhtdFloat=function(t,p,c){window.__fl.push({t:t,p:p,c:c})}");E.ctx.__fl=[];
  X.gsvEv({k:"spawn",sq:13,tag:"inv"});assert.deepEqual(J(E.ctx.__fl.pop()),{t:"援軍・入侵卒",p:{x:40+4*60,y:40+1*60},c:"info"});
  park3d(E);X.gsvEv({k:"spawn",sq:13,tag:"inv"});assert.deepEqual(J(E.ctx.__fl.pop()).p,{x:100+4*40,y:100+1*30});
  X.gsvEv({k:"icpt",sq:22,drain:10,gain:6});assert.deepEqual(J(E.ctx.__fl.pop()).p,{x:100+4*40,y:100+2*30})});

/* ====================== 頂欄：「👁」視角鈕 ====================== */
test("對局中頂欄右上有「👁」視角鈕：寫現在的視角，點一下換下一種並重畫；離開對局收掉；選 3D 時先把 park3d 的鏡頭切過去", ()=>{
  const E=boot(),X=E.X,st=game(E,1),doc=E.D.doc;E.ctx.__rr=()=>X.gsvTick(st);   /* cgPlay.rr＝08b 重畫，最後會叫 bhTick→gsvTick */
  X.gsvTick(st);const b=doc.getElementById("gsvView");assert.ok(b,"gsvTick 建出視角鈕");assert.equal(E.tr.children[0],b,"放在頂欄最前面");assert.match(b.innerHTML,/👁.*純淨平面/);assert.equal(b.attrs["aria-label"],"視角：純淨平面（點一下換下一種）");
  assert.ok(doc.body.classList.contains("gsv-on"));assert.ok(doc.getElementById("gsvEn")&&doc.getElementById("gsvMe")&&doc.getElementById("gsvOv"),"HUD 照舊");
  const pv=park3d(E,null);b.click();assert.equal(X.gsvVw(),"top");assert.match(b.innerHTML,/全局俯視/);assert.deepEqual(pv.cams,["top"],"park3d 已經建好的話直接 setTdCam");assert.ok(doc.getElementById("gsvViewM"),"點了也彈出小選單");
  assert.match(doc.getElementById("gsvViewM").innerHTML,/data-v="top" class="on">● 全局俯視.*data-v="tilt" class="">○ 臨陣斜角.*data-v="flat" class="">○ 純淨平面/);
  b.click();assert.equal(X.gsvVw(),"tilt");b.click();assert.equal(X.gsvVw(),"flat");assert.match(b.innerHTML,/純淨平面/);assert.deepEqual(pv.cams,["top","tilt"],"回平面不用動鏡頭（08b 重畫會把 3D 收起來）");
  X.gsvHide();assert.equal(doc.getElementById("gsvView"),null);assert.equal(doc.getElementById("gsvViewM"),null);assert.ok(!doc.body.classList.contains("gsv-on"))});

test("專注棋盤模式開著：星門圍城照平面；按了要 3D＝把專注模式關掉再切；純淨畫面／螢幕報讀還開著就不切、講一聲", ()=>{
  const E=boot({store:{gsvView:JSON.stringify("top"),focusBoard:"true"}}),X=E.X,st=game(E,1);E.ctx.focusOn=()=>!!E.ctx.store.get("focusBoard",false)||!!E.ctx.FOC;
  assert.equal(X.gsvVw(),"flat");assert.equal(X.gsvFlat(st),true);assert.equal(E.get("gsvView"),"top","存的視角不動");
  X.gsvSetView("tilt");assert.equal(E.get("focusBoard"),false);assert.equal(X.gsvVw(),"tilt");assert.equal(X.gsvFlat(st),false);
  E.ctx.store.set("focusBoard",true);E.ctx.FOC=true;assert.equal(X.gsvVw(),"flat");X.gsvSetView("top");assert.equal(X.gsvVw(),"flat");assert.equal(E.get("gsvView"),"tilt");assert.equal(E.get("focusBoard"),true,"切不了就把專注模式還原");
  assert.match(E.log.toast.pop(),/平面棋盤/)});

/* ====================== 「更多」選單那顆（06-cpu parkBtn 原文） ====================== */
test("「更多」選單那顆「去園子下棋（3D）」：星門圍城對局中按了＝切到 3D 星盤（全局俯視）；已經在 3D 時那顆叫「回棋盤模式」、按了回平面；上一次用臨陣斜角就回臨陣斜角", ()=>{
  const E=boot(),X=E.X,st=game(E,1);E.ctx.__st=st;
  const render=()=>{E.run("PARK_OFF=!!bhtdFlat(__st)");X.gsvTick(st)};E.ctx.__rr=render;render();   /* 08b render：PARK_OFF 照 bhtlFlat→bhtdFlat→gsvFlat，再畫、再 bhTick */
  assert.equal(X.parkLabel(),"去園子下棋（3D）");
  let[,fn]=X.parkBtn(()=>E.log.redraw++);fn();   /* 手機「⋯ 更多」的清單直接呼叫 fn()（沒有事件物件） */
  assert.equal(X.gsvVw(),"top");assert.equal(E.get("gsvView"),"top");assert.equal(E.get("park3d"),true);assert.equal(X.gsvFlat(st),false);assert.ok(E.log.rr>=1,"自己叫對局頁重畫");assert.equal(E.log.redraw,0,"不走原本那條");
  assert.match(E.log.toast.pop(),/3D 星盤/);assert.equal(X.parkOn(),true);assert.equal(X.parkLabel(),"回棋盤模式","重畫後頂欄那顆換字");
  [,fn]=X.parkBtn(()=>E.log.redraw++);fn({currentTarget:null});assert.equal(X.gsvVw(),"flat");assert.equal(E.get("park3d"),true,"回平面是改星門圍城自己的視角，不是把玩家的 park3d 關掉");
  assert.equal(E.log.toast.pop(),"回到平面棋盤");assert.equal(X.parkLabel(),"去園子下棋（3D）");
  X.gsvSetView("tilt");X.gsvSetView("flat");X.parkBtn(()=>{})[1]();assert.equal(X.gsvVw(),"tilt","回 3D 用上一次的 3D 視角");
  assert.deepEqual(["flat","top","tilt"].map(v=>X.gsvParkTo(v,"top")),["top","flat","flat"]);assert.equal(X.gsvParkTo("flat","tilt"),"tilt");assert.equal(X.gsvParkTo("flat",undefined),"top")});

test("「更多」選單那顆在別的模式照舊：不是星門圍城的對局（挑戰電腦、舊版塔防、離開對局頁之後）不攔，park3d 照原本反過來、叫原本的重畫", ()=>{
  const E=boot({store:{park3d:"false"}}),X=E.X;
  assert.equal(X.gsvParkBtn(),false);let[,fn]=X.parkBtn(()=>E.log.redraw++);fn();assert.equal(E.get("park3d"),true);assert.equal(E.log.redraw,1);assert.equal(E.get("gsvView"),undefined);
  /* 下過星門圍城、離開對局頁（HUD 收掉）之後：GSV_ST 還留著也不攔 */
  const st=game(E,1);X.gsvTick(st);assert.equal(E.D.doc.body.classList.contains("gsv-on"),true);X.gsvHide();
  [,fn]=X.parkBtn(()=>E.log.redraw++);fn();assert.equal(E.get("park3d"),false);assert.equal(E.log.redraw,2);assert.equal(E.get("gsvView"),undefined)});

test("〔原始碼〕接線：06-cpu parkBtn 一開頭先問 gsvParkBtn；07bht bhtdParkEx 不是舊版塔防的盤就問 gsvParkEx；頂欄上那顆收起來（有「👁」了），「更多」清單裡那顆不在 #topRight 所以還在", ()=>{
  assert.match(CPU,/const parkBtn=redraw=>\[parkIcon\(\),e=>\{if\(typeof gsvParkBtn==="function"&&gsvParkBtn\(\)\)return;/);
  assert.match(TD,/function bhtdParkEx\(st\)\{if\(!bhtdIs\(st\)\)return typeof gsvParkEx==="function"\?gsvParkEx\(st\):\{bhBoss:null,tdCam:null\};/);
  assert.match(TD,/function bhtdFlat\(st\)\{return\(typeof gsvFlat==="function"&&gsvFlat\(st\)\)\|\|\(bhtdIs\(st\)&&bhtdView\(\)==="flat"\)\}/,"bhtdFlat 本身沒改");
  assert.match(GS,/body\.gsv-on #topRight button\[aria-label="回棋盤模式"\],body\.gsv-on #topRight button\[aria-label="去園子下棋（3D）"\]/);
  assert.match(GS,/function gsvFrame\(\)\{[\s\S]{0,400}if\(!document\.body\.classList\.contains\("gsv-on"\)\)return;gsvVwFix\(\);if\(!document\.getElementById\("gsvView"\)\)gsvViewUi\(\)/,"頂欄重畫把「👁」清掉，一秒內補回來；離開對局之後不做")});

test("進場時存的就是臨陣斜角（沒再按過視角鈕）：切平面再按「更多」那顆，回的是臨陣斜角", ()=>{
  const E=boot({store:{gsvView:JSON.stringify("tilt"),park3d:"true"}}),X=E.X,st=game(E,1);E.ctx.__st=st;E.ctx.__rr=()=>{E.run("PARK_OFF=!!bhtdFlat(__st)");X.gsvTick(st)};E.ctx.__rr();
  assert.equal(X.parkLabel(),"回棋盤模式","一進場就是 3D：頂欄那顆一開始就叫回棋盤模式");X.parkBtn(()=>{})[1]();assert.equal(X.gsvVw(),"flat");X.parkBtn(()=>{})[1]();assert.equal(X.gsvVw(),"tilt")});

test("gsvFrame 每 60 格查一次 3D 還在不在、「👁」還在不在：排到這一格之後才做（不在 gsvFrame 裡面重畫）；3D 被關掉就退回平面、鈕被頂欄重畫清掉就補回去", ()=>{
  const E=boot({store:{gsvView:JSON.stringify("top")}}),X=E.X,st=game(E,1),doc=E.D.doc,q=[];E.ctx.__rr=()=>X.gsvTick(st);X.gsvTick(st);assert.equal(X.gsvFlat(st),false);assert.equal(E.get("park3d"),true);
  E.ctx.setTimeout=f=>{q.push(f);return 1};for(let i=0;i<59;i++)X.gsvFrame();assert.equal(q.length,0);X.gsvFrame();assert.equal(q.length,1,"第 60 格排一次");
  doc.getElementById("gsvView").remove();assert.equal(doc.getElementById("gsvView"),null);const n=E.log.rr;q.shift()();assert.ok(doc.getElementById("gsvView"),"補回來");assert.equal(E.log.rr,n,"3D 好好的不重畫");
  E.ctx.store.set("park3d",false);for(let i=0;i<60;i++)X.gsvFrame();assert.equal(q.length,1);assert.equal(X.gsvVw(),"top","還沒輪到檢查");q.shift()();
  assert.equal(X.gsvVw(),"flat");assert.equal(E.get("gsvView"),"flat");assert.equal(E.log.rr,n+1);assert.match(doc.getElementById("gsvView").innerHTML,/純淨平面/)});

/* ====================== 3D 開不起來 ====================== */
test("3D 不能用時退回平面：選了 3D 先把 park3d 打開；裝置開不了、載入失敗（06-cpu parkDraw 把 park3d 關掉）→ 視角存回平面、照平面下，不卡住；之後自己再按還能再試", ()=>{
  const E=boot(),X=E.X,st=game(E,1);
  assert.deepEqual([["flat",null,0],["flat",false,1],["top",true,0],["top",true,1],["top",null,0],["top",false,0],["top",false,1],["tilt",null,1]].map(a=>X.gsvP3Step(...a)),[null,null,null,null,"ask","ask","fail",null]);
  E.ctx.store.set("gsvView","top");E.ctx.store.set("park3d",false);   /* 玩家在別的模式選了棋盤模式，星門圍城記的是 3D */
  assert.equal(X.gsvFlat(st),false);assert.equal(E.get("park3d"),true,"進場：要 3D 就把 park3d 打開（跟舊版塔防換視角一樣）");assert.equal(J(X.gsvParkEx(st)).tdCam,"top");
  E.ctx.store.set("park3d",false);   /* parkDraw：「這台裝置沒辦法顯示 3D，先用棋盤模式」 */
  assert.equal(J(X.gsvParkEx(st)).tdCam,null,"同一次重畫就不再要塔防鏡頭");assert.equal(E.get("gsvView"),"flat","視角存回平面");assert.equal(X.gsvFlat(st),true);assert.equal(X.bhtdFlat(st),true);assert.equal(E.get("park3d"),false,"不再去打開");
  /* 載入失敗是事後才關的、沒有人重畫：gsvFrame 每秒查一次 */
  X.gsvSetView("tilt");assert.equal(E.get("park3d"),true);const n=E.log.rr;E.ctx.store.set("park3d",false);X.gsvVwFix();assert.equal(X.gsvVw(),"flat");assert.equal(E.log.rr,n+1,"退回平面後重畫一次");
  X.gsvVwFix();assert.equal(E.log.rr,n+1,"已經是平面就不再動");
  /* 3D 好好的：什麼都不動 */
  X.gsvSetView("top");const n2=E.log.rr;X.gsvVwFix();assert.equal(X.gsvVw(),"top");assert.equal(E.log.rr,n2);
  /* 3D 還沒建好（park3d 載入中、過場中）也不是失敗：記號先照平面座標擺 */
  assert.equal(X.gsv3d(),false);assert.equal(X.bhtdXY(0).x,40)});

/* ====================== 版面、字典 ====================== */
test("〔原始碼〕版面：3D 區夾在上下兩條 HUD 中間（#bbox 固定定位，park3d 照它的高度排、TDPAD 留邊）；黑洞自由鏡頭的鈕和場名收起來；橫向蓋過黑洞滿版那條規則；過場時記號先藏", ()=>{
  const css=GS.slice(GS.indexOf("function gsvCss(){"),GS.indexOf("function gsvCard(){"));
  assert.match(css,/body\.gsv-on \.view\.fixed>#bbox\{position:fixed!important;left:0!important;right:0!important;top:calc\(var\(--bhTop,44px\) \+ var\(--gsvEnH\)\)!important;bottom:calc\(var\(--gsvMeH\) \+ env\(safe-area-inset-bottom,0px\)\)!important/);
  for(const k of[".gs-ui",".gs-pop",".un-ui",".tele-ui","#bbox .pkname",".pzoom",".gpad",".pkview",".pk2d"])assert.ok(css.includes("body.gsv-on "+k),"要收起來："+k);
  assert.match(css,/@media \(orientation:landscape\)\{body\.bh-full\.gsv-on \.view\.fixed:has\(>#bbox\):has\(>#acts\)>#bbox\{top:var\(--bhTop,44px\)!important;bottom:0!important;left:calc\(200px/);
  assert.match(css,/@media \(orientation:portrait\)\{body\.gsv-3d \.gsv-tip\{position:fixed;top:calc\(var\(--bhTop,44px\) \+ var\(--gsvEnH,62px\) - 32px\)/,"3D 直拿：選目標的提示條不蓋棋盤底線");
  assert.match(css,/#gsvView\{display:inline-flex!important/);assert.match(css,/#gsvViewM\{position:fixed;z-index:9300/);
  assert.match(TD,/\.pk-veil #bhtdOv,\.pk-veil #gsvOv\{visibility:hidden\}/);
  const P3=rd("xiangqi-lab/src/park3d.js");assert.match(P3,/TDPAD=\[16,2,4,2\]/);assert.match(P3,/if\(box&&\/\^\(sticky\|fixed\)\$\/\.test\(getComputedStyle\(box\)\.position\)\)/,"park3d 照固定定位的 #bbox 高度排版");
  assert.match(P3,/return\{el,draw,destroy,say,screenOf,headOf,setTdCam:\(m,fx\)=>tdSet\(m,fx\),tdCam:\(\)=>TDC,/,"用到的 park3d 介面都是現成的")});

test("〔原始碼〕英文字典補了這次新增的提示（視角名稱沿用舊版塔防原本就有的）", ()=>{
  for(const k of["回到平面棋盤","🌀 3D 星盤（右上 👁 換視角）","純淨畫面、螢幕報讀模式用平面棋盤","全局俯視","臨陣斜角","純淨平面"])assert.ok(I18.includes(`"${k}":"`),"字典要有："+k);
  for(const k of["回到平面棋盤","🌀 3D 星盤（右上 👁 換視角）","純淨畫面、螢幕報讀模式用平面棋盤"])assert.ok(GS.includes(`"${k}"`),"程式裡真的用到："+k)});
