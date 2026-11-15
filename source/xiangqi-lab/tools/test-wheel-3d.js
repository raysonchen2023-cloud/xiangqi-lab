// 黑洞車輪戰 3D（開發者 11/15：「車輪戰也增加 3D 視角」「可以在黑洞三張大棋盤」→ 選單定案：目前這盤完整 3D 角色，另外兩盤是場景裡的簡化棋盤；m/07bhw-wheel.js 的 ③）單元測試。
// 不開瀏覽器、不跑引擎、不載 three／park3d：vm 照 App 的順序載 07bht-td.js、07bhg-gatesiege.js、07bhw-wheel.js；DOM、store、計時器、park3d 實例（XQPark3D.create 回的那個）、three（只有計數用的殼）都是假的。
//   視角三態與記住（存檔鍵 whlView，預設平面，跟星門圍城的 gsvView 互不影響）、整場只建一個 3D 實例、換盤時 park3d 直接擺好（ex.bkey）、哪一張完整哪兩張簡化、
//   簡化棋盤的棋子與狀態跟那一盤一致、點簡化棋盤換盤、鏡頭飛行、3D 開不起來退回平面、離開後資源與畫面收乾淨。
// 這裡只證明狀態切換、換盤邏輯、座標與資源的帳照設計走；3D 畫面本身（三張盤的構圖、鏡頭飛得順不順、記號有沒有對準）要實機看，測試看不到。
// 用法：node --test xiangqi-lab/tools/test-wheel-3d.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const TD=rd("xiangqi-db/m/07bht-td.js"),GS=rd("xiangqi-db/m/07bhg-gatesiege.js"),WS=rd("xiangqi-db/m/07bhw-wheel.js"),CPU=rd("xiangqi-db/m/06-cpu.js"),P3=rd("xiangqi-lab/src/park3d.js"),I18=rd("xiangqi-db/m/07i18n.js");
const J=x=>JSON.parse(JSON.stringify(x));

/* ---------- 假 DOM：元素樹（innerHTML 會拆成巢狀元素）、id 登記、classList、dataset、style、事件、簡單的選擇器（#id、.類、標籤、後代、逗號、[data-x]） ---------- */
function fakeDom(){const REG=new Map(),VOID=new Set(["line","rect","circle","br","img","input","path"]);let doc=null;
  const seg=s=>{const m=/^([a-zA-Z][\w-]*)?((?:[#.][\w-]+|\[[\w-]+\])*)$/.exec(s);if(!m)return null;const o={tag:m[1]?m[1].toUpperCase():"",id:"",cls:[],attr:[]};for(const x of m[2].match(/[#.][\w-]+|\[[\w-]+\]/g)||[]){if(x[0]==="#")o.id=x.slice(1);else if(x[0]===".")o.cls.push(x.slice(1));else o.attr.push(x.slice(1,-1))}return o};
  const hit=(el,o)=>!!o&&(!o.tag||el.tagName===o.tag)&&(!o.id||el._id===o.id)&&o.cls.every(c=>el._cls.includes(c))&&o.attr.every(a=>a.startsWith("data-")?a.slice(5)in el.dataset:a in el.attrs);
  const matches=(el,sel)=>sel.split(",").some(one=>{const ps=one.trim().split(/\s+/).map(seg);if(!hit(el,ps[ps.length-1]))return false;let p=el.parentNode;for(let k=ps.length-2;k>=0;k--){while(p&&!hit(p,ps[k]))p=p.parentNode;if(!p)return false;p=p.parentNode}return true});
  const walk=(el,f)=>{for(const c of el.children){if(f(c))return c;const r=walk(c,f);if(r)return r}return null},all=(el,f,out)=>{for(const c of el.children){if(f(c))out.push(c);all(c,f,out)}return out};
  const mk=tag=>{const el={tagName:String(tag).toUpperCase(),_id:"",_cls:[],_html:"",children:[],dataset:{},attrs:{},_h:{},parentNode:null,title:"",hidden:false,type:"",
      style:{setProperty(k,v){this[k]=v}},
      get id(){return this._id},set id(v){this._id=v;REG.set(v,this)},
      get className(){return this._cls.join(" ")},set className(v){this._cls=String(v).split(/\s+/).filter(Boolean)},
      get isConnected(){let p=this;while(p){if(p===doc.body||p===doc.head||p===doc.documentElement)return true;p=p.parentNode}return false},
      get firstChild(){return this.children[0]||null},get parentElement(){return this.parentNode},
      get textContent(){return this._tx!=null?this._tx:this._html.replace(/<[^>]+>/g,"")},set textContent(v){this._tx=String(v);this._html=this._tx;this.children=[]},
      get innerHTML(){return this._html},set innerHTML(v){this._html=String(v);this._tx=null;this.children=[];const re=/<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|[^>"])*?)(\/?)>/g;let cur=this,m;
        while((m=re.exec(this._html))){const tg=m[2].toLowerCase();if(m[1]){let p=cur;while(p&&p!==this&&p.tagName!==tg.toUpperCase())p=p.parentNode;if(p&&p!==this){p._html=this._html.slice(p._s,m.index);cur=p.parentNode}continue}
          const c=mk(tg);c._attr=m[3];for(const a of m[3].matchAll(/([\w-]+)="([^"]*)"/g)){if(a[1]==="class")c.className=a[2];else if(a[1]==="id")c.id=a[2];else if(a[1].startsWith("data-"))c.dataset[a[1].slice(5)]=a[2];c.attrs[a[1]]=a[2]}
          c.parentNode=cur;cur.children.push(c);c._s=re.lastIndex;if(!m[4]&&!VOID.has(tg))cur=c}},
      setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return k in this.attrs?this.attrs[k]:null},
      addEventListener(t,f){const a=this._h[t]||(this._h[t]=[]);if(!a.includes(f))a.push(f)},removeEventListener(t,f){const a=this._h[t];if(a){const i=a.indexOf(f);if(i>=0)a.splice(i,1)}},
      append(...a){for(const c of a)if(c&&typeof c==="object"){if(c.parentNode)c.remove();c.parentNode=this;this.children.push(c)}},prepend(c){if(c.parentNode)c.remove();c.parentNode=this;this.children.unshift(c)},
      insertBefore(c,ref){if(c.parentNode)c.remove();c.parentNode=this;const i=ref?this.children.indexOf(ref):-1;if(i<0)this.children.push(c);else this.children.splice(i,0,c)},
      remove(){const p=this.parentNode;if(p){const i=p.children.indexOf(this);if(i>=0)p.children.splice(i,1)}this.parentNode=null},
      querySelector(s){return walk(this,c=>matches(c,s))},querySelectorAll(s){return all(this,c=>matches(c,s),[])},
      closest(s){let p=this;while(p&&p.tagName){if(matches(p,s))return p;p=p.parentNode}return null},
      getBoundingClientRect(){return this._rect||{left:0,top:0,right:0,bottom:0,width:0,height:0}},get clientWidth(){return(this._rect||{}).width||0},get clientHeight(){return(this._rect||{}).height||0},
      fire(t,e){e=Object.assign({target:this,type:t,stopPropagation(){},preventDefault(){}},e);let p=this;while(p){for(const f of(p._h&&p._h[t]||[]).slice())f(e);p=p.parentNode}}};
    el.classList={contains:c=>el._cls.includes(c),add:(...a)=>{for(const c of a)if(!el._cls.includes(c))el._cls.push(c)},remove:(...a)=>{el._cls=el._cls.filter(c=>!a.includes(c))},
      toggle:(c,on)=>{const has=el._cls.includes(c),want=on===undefined?!has:!!on;if(want&&!has)el._cls.push(c);if(!want&&has)el._cls=el._cls.filter(x=>x!==c);return want}};
    if(el.tagName==="CANVAS"){el.txt=[];el.getContext=()=>({beginPath(){},arc(){},fill(){},stroke(){},fillText:(t,x,y)=>el.txt.push([t,Math.round(x),Math.round(y)])})}
    return el};
  doc={createElement:mk,body:mk("body"),head:mk("head"),documentElement:mk("html"),getElementById:id=>{const e=REG.get(id);return e&&e.isConnected?e:null},
    querySelector:s=>doc.body.querySelector(s)||doc.head.querySelector(s),querySelectorAll:s=>doc.body.querySelectorAll(s)};
  return{doc,mk}}

/* ---------- 假的 three（只記帳：建了幾個、dispose 幾個）和假的 park3d fxApi ---------- */
function fakeThree(){const cnt={geo:0,mat:0,tex:0,disp:0},v3=(x,y,z)=>({x:x||0,y:y||0,z:z||0,set(a,b,c){this.x=a;this.y=b;this.z=c;return this},copy(o){this.x=o.x;this.y=o.y;this.z=o.z;return this},setScalar(s){this.x=this.y=this.z=s;return this}});
  class Obj{constructor(){this.children=[];this.userData={};this.position=v3();this.scale=v3(1,1,1);this.rotation={x:0,copy(o){this.x=o.x}};this.visible=true;this.parent=null}add(...a){for(const x of a){x.parent=this;this.children.push(x)}}remove(x){const i=this.children.indexOf(x);if(i>=0){this.children.splice(i,1);x.parent=null}}}
  const disp=o=>{o.dispose=()=>{if(!o.gone){o.gone=1;cnt.disp++}};return o};
  const T={Group:class extends Obj{},Mesh:class extends Obj{constructor(g,m){super();this.geometry=g;this.material=m}},LineSegments:class extends Obj{constructor(g,m){super();this.geometry=g;this.material=m}},
    BufferGeometry:class{constructor(){cnt.geo++;this.attributes={};this.draw=[0,0];disp(this)}setAttribute(k,a){this.attributes[k]=a}setIndex(a){this.index=a}setDrawRange(a,b){this.draw=[a,b]}},
    BufferAttribute:class{constructor(a,n){this.array=a;this.itemSize=n;this.needsUpdate=false}},Float32BufferAttribute:class{constructor(a,n){this.array=new Float32Array(a);this.itemSize=n}},
    CanvasTexture:class{constructor(c){cnt.tex++;this.image=c;disp(this)}},MeshBasicMaterial:class{constructor(o){cnt.mat++;Object.assign(this,o);disp(this)}},LineBasicMaterial:class{constructor(o){cnt.mat++;Object.assign(this,o);disp(this)}},
    Vector3:class{constructor(){this.x=this.y=this.z=0}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}project(){const x=this.x,z=this.z;this.x=x/40;this.y=-z/40;this.z=.5;return this}},SRGBColorSpace:"srgb"};
  return{T,cnt,v3,Obj}}
function fakeApi(o){o=o||{};const K=fakeThree(),T=K.T,scene=new K.Obj(),hooks=new Set(),bgeo={parameters:{width:10.4,height:11.4},dispose(){throw new Error("主盤的幾何不能被 dispose")}},bmat={dispose(){throw new Error("主盤的材質不能被 dispose")}};
  const board=new T.Mesh(bgeo,bmat);board.position.set(0,.57,0);board.scale.set(1.6,1.6,1);board.rotation.x=-Math.PI/2;scene.add(board);scene.add(new K.Obj());   /* 場景原本就有的東西（主盤、一個別的） */
  const cam={position:K.v3(0,30,12),look:null,lookAt(v){this.look={x:v.x,y:v.y,z:v.z}}},el=o.el||{getBoundingClientRect:()=>({left:0,top:0,right:400,bottom:400,width:400,height:400})},V={under:false};
  const A={T,scene,camera:cam,el,gs:()=>1.6,top:.56,board,hook(f){hooks.add(f);return()=>hooks.delete(f)},poke(){A.pokes++},pokes:0,view:()=>V};
  return{A,K,scene,cam,hooks,V,frame(){cam.position.set(0,30,12);for(const f of hooks)f("main")}}}

/* ---------- 開一個假的 App ---------- */
function boot(o){o=o||{};const D=fakeDom(),mem=Object.assign({},o.store),log={toast:[],rr:0,flat:[],created:0,parkGone:0},TQ=[],RQ=[];let NOW=1e6,tid=0;
  const ctx={console,Math,JSON,Set,Map,Object,Array,String,Number,Promise,Float32Array,isFinite,Date:{now:()=>NOW},
    setTimeout:(f,ms)=>{TQ.push({f,at:NOW+(ms||0),id:++tid});return tid},clearTimeout:id=>{const i=TQ.findIndex(x=>x.id===id);if(i>=0)TQ.splice(i,1)},
    requestAnimationFrame:f=>{RQ.push(f);return RQ.length},cancelAnimationFrame(){RQ.length=0},
    document:D.doc,location:{hash:o.hash||"#/port"},innerWidth:390,innerHeight:844,matchMedia:()=>({matches:!!ctx.RM}),addEventListener(){},removeEventListener(){},RM:false,FOC:false,
    store:{get:(k,d)=>k in mem?JSON.parse(mem[k]):d,set:(k,v)=>{mem[k]=JSON.stringify(v)}},
    esc:s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])),
    toast:t=>log.toast.push(String(t)),vibrate(){},modal:()=>null,confirmBox(){},XQCore:C,focusApply(){},bhIs:st=>!!st&&String(st.journey||"").startsWith("bh:"),
    NAMES:{r:{},b:{}},Board:()=>({svg:D.mk("svg"),draw:(b,op)=>log.flat.push({b:b.join(","),sel:op.sel})}),
    parkLook:()=>({k:"look"}),myLook:()=>null,parkCrowd:()=>[],bhStarsEx:()=>null,cgPlay:{rr:()=>{log.rr++}}};
  ctx.window=ctx;ctx.focusOn=()=>!!ctx.FOC;vm.createContext(ctx);
  vm.runInContext(TD+"\n;"+GS+"\n;"+WS+"\n;var PARK=null;this.X={GSV,WHL,BHTD_VW,gsvVw,gsvVwNext,gsvMkKind,gsvPos3,bhtdGnd,bhtdXY,whlOpen,whlNew,whlShow,whlHide,whlPaint,whlGo,whlGo2,whlTap,whlClick,whlMarks,whlThumbs,whlFloat,"+
    "whlVw,whl3dOn,whl3Shown,whlSlots,whlSideList,whlSidePos,whlAtlasCell,whlAtlasDraw,whlSideQuads,whlPadTop,whlFlyAt,whlInQuad,whlHitSide,whlSbAt,whlSbHTML,whl3Marks,whl3Ex,whlSideKit,whlVwUi,whlSetView,whlViewMenu,whl3dOpen,whl3dClose,whl3Draw,whl3Frame,whl3Lay,whl3Fly,whl3Down,whl3Up,whl3Float,WHL_AT,WHL_SS,WHL_SGAP,WHL_3MS,WHL_ST,WHL_DG};",ctx);
  const run=s=>vm.runInContext(s,ctx),E={ctx,X:ctx.X,D,doc:D.doc,log,mem,run,TQ,RQ,get:k=>k in mem?JSON.parse(mem[k]):undefined,
    tick(ms){NOW+=ms;for(let n=0;n<200;n++){const i=TQ.findIndex(x=>x.at<=NOW);if(i<0)break;const t=TQ.splice(i,1)[0];t.f()}},now:()=>NOW,
    /* 假的 XQPark3D：create 回一個記帳的實例（畫了什麼、鏡頭、留白、銷毀），fxApi 是假的 three 場景 */
    park(opt){opt=opt||{};const made=[];ctx.XQPark3D={create(host,op){log.created++;if(opt.fail)return null;const F=fakeApi(),elp=D.mk("div");elp.className="park3d";elp._rect={left:0,top:0,right:400,bottom:400,width:400,height:400};host.append(elp);
        let cam=null,dead=0;const pv={el:elp,F,host,op,draws:[],pads:[],cams:[],dead:()=>dead,busyN:0,draw(b,o2,ex){pv.draws.push({b:b.join(","),o:J(o2),ex:J(ex)});cam=ex.tdCam||null},destroy(){dead++;elp.remove();if(op.onDestroy)op.onDestroy()},
          screenOf:q=>({x:100+q%9*30,y:300+(q/9|0)*30}),headOf:q=>({x:100+q%9*30,y:260+(q/9|0)*30}),tdCam:()=>cam,setTdCam(m){cam=m;pv.cams.push(m)},setTdPad(p){pv.pads.push(J(p))},busy:()=>pv.busyN>0,fxApi:()=>F.A};
        F.A.el=elp;made.push(pv);return pv}};return made}};
  return E}
/* 開一場三盤的車輪戰（真的規則），畫面蓋上去 */
function start(E,o){o=o||{};E.X.whlNew(null);const ov=E.doc.getElementById("whlOv");assert.ok(ov,"車輪戰畫面蓋上去了");const h=ov.querySelector(".whl-3d");assert.ok(h,"有 3D 區");h._rect={left:0,top:0,right:375,bottom:413,width:375,height:413};return{ov,host:h,M:E.run("WHL_M")}}
const cur=E=>E.run("WHL_CUR");

/* ====================== 視角 ====================== */
test("預設維持平面；選過會記住（存檔鍵 whlView）；跟星門圍城的 gsvView、舊版塔防的 bhtdView 互不影響", ()=>{
  const E=boot(),X=E.X,made=E.park();assert.equal(X.whlVw(),"flat");const S=start(E);
  assert.equal(made.length,0,"平面：不建 3D");assert.equal(X.whl3dOn(),false);assert.ok(!S.ov.classList.contains("v3"));assert.ok(E.log.flat.length>0,"平面棋盤照畫");
  const b=S.ov.querySelector(".whl-vw");assert.ok(b,"頂欄有「👁」");assert.match(b.innerHTML,/👁.*純淨平面/);assert.equal(b.attrs["aria-label"],"視角：純淨平面（點一下換下一種）");
  X.whlSetView("top");assert.equal(E.get("whlView"),"top");assert.equal(X.whlVw(),"top");assert.match(b.innerHTML,/全局俯視/);assert.equal(E.get("gsvView"),undefined,"沒寫到星門圍城的鍵");assert.equal(E.get("bhtdView"),undefined);assert.equal(E.get("park3d"),undefined,"也不動玩家的 park3d");
  assert.equal(X.gsvVw(),"flat","星門圍城還是它自己的預設");X.whlSetView("亂填");assert.equal(E.get("whlView"),"top");
  /* 記住：換一個全新的 App、帶同一份存檔；星門圍城選 3D 不會把車輪戰拉成 3D */
  const E2=boot({store:{whlView:JSON.stringify("tilt")}});assert.equal(E2.X.whlVw(),"tilt");assert.equal(E2.X.gsvVw(),"flat");
  const E3=boot({store:{gsvView:JSON.stringify("top"),bhtdView:JSON.stringify("tilt")}});assert.equal(E3.X.whlVw(),"flat");assert.equal(E3.X.gsvVw(),"top");
  E3.ctx.FOC=true;E3.ctx.store.set("whlView","top");assert.equal(E3.X.whlVw(),"flat","純淨畫面／螢幕報讀模式一律平面")});

test("「👁」點一下換下一種（全局俯視 → 臨陣斜角 → 純淨平面）、小選單可以直接選；兩種 3D 之間只換鏡頭，回平面把 3D 整個拆掉", ()=>{
  const E=boot(),X=E.X,made=E.park(),S=start(E),b=S.ov.querySelector(".whl-vw");
  b.fire("click");assert.equal(X.whlVw(),"top");assert.equal(made.length,1);const pv=made[0];assert.ok(S.ov.classList.contains("v3"));
  const m=E.doc.getElementById("whlViewM");assert.ok(m,"點了也彈出小選單");assert.match(m.innerHTML,/data-v="top" class="on">● 全局俯視.*○ 臨陣斜角.*○ 純淨平面/);assert.equal(m.parentNode,S.ov,"選單掛在車輪戰這一層裡");
  b.fire("click");assert.equal(X.whlVw(),"tilt");assert.equal(made.length,1,"換 3D 視角不重建");assert.deepEqual(pv.cams,["tilt"]);assert.equal(pv.dead(),0);
  b.fire("click");assert.equal(X.whlVw(),"flat");assert.equal(pv.dead(),1,"回平面＝拆掉 3D（不留在背景占記憶體）");assert.ok(!S.ov.classList.contains("v3"));assert.equal(X.whl3dOn(),false);
  E.doc.getElementById("whlViewM").children[1].fire("click");assert.equal(X.whlVw(),"tilt");assert.equal(made.length,2);assert.equal(E.doc.getElementById("whlViewM"),null,"選了就收選單");
  assert.equal(made[1].draws[made[1].draws.length-1].ex.tdCam,"tilt")});

/* ====================== 一個 3D 實例 ====================== */
test("〔混合〕整場只有一個 3D 實例：開 3D 時先把對局頁那個收掉；之後重畫、換盤、換視角、再開一場都不再建；3D 開著時 whl3dOn＝true（對局頁的 parkDraw 不建新的）", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park();E.ctx.PARK={v:{destroy(){E.log.parkGone++;E.ctx.PARK=null}}};
  const S=start(E);assert.equal(E.log.created,1,"上次選 3D：一進來就開");assert.equal(E.log.parkGone,1,"對局頁的 3D 先收掉");assert.equal(E.ctx.PARK,null);assert.equal(X.whl3dOn(),true);
  const pv=made[0];assert.equal(pv.op.giant,true);assert.equal(pv.op.bg,"data/park/bh_far2.webp");assert.equal(pv.host,S.host,"掛在車輪戰自己的 3D 區");assert.equal(typeof pv.op.onTap,"function");
  X.whlPaint();E.run("WHL_HK=''");X.whlPaint();X.whlGo2(1,false);X.whlGo2(2,false);X.whlSetView("tilt");X.whlSetView("top");X.whl3dOpen();assert.equal(E.log.created,1);
  X.whlNew(null);assert.equal(E.log.created,1,"再開一場沿用同一個");assert.equal(E.doc.querySelectorAll(".park3d").length,1);
  assert.ok(pv.draws.every(d=>d.ex.giant===true&&d.ex.quietMate===true&&d.ex.result===null&&d.ex.botSide==="b"&&d.o.flip===false&&d.o.me==="r"));
  /* 06-cpu：車輪戰 3D 開著，對局頁不建 */
  assert.match(CPU,/function parkDraw\(host,bd,board,o,ex\)\{\n  if\(typeof whl3dOn==="function"&&whl3dOn\(\)\)return;/);
  X.whl3dClose(0);assert.equal(X.whl3dOn(),false);E.run("WHL_3S='load'");assert.equal(X.whl3dOn(),true,"正在開的時候也算")});

/* ====================== 換盤 ====================== */
test("換盤：park3d 拿到的是新那一盤的局面，ex.bkey 換成那一盤的（同一盤重畫不變）；被吃子、開局照那一盤算；選取不帶過去", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park(),S=start(E),pv=made[0],M=S.M,last=()=>pv.draws[pv.draws.length-1];
  const k0=last().ex.bkey;assert.equal(k0,"whl:"+M.id+":0");assert.equal(last().ex.gid,k0);assert.equal(last().b,M.bs[0].P.board.join(","));assert.equal(last().ex.tdCam,"top");
  const own=M.bs[0].P.board.findIndex(p=>p==="R");X.whlTap(own);assert.equal(last().o.sel,own);assert.ok(last().o.targets.length>0,"選子：落點也給 3D");assert.equal(last().ex.bkey,k0,"同一盤重畫 bkey 不變（park3d 才會照常播走子動畫）");
  X.whlGo2(2,false);assert.equal(last().ex.bkey,"whl:"+M.id+":2");assert.equal(last().b,M.bs[2].P.board.join(","));assert.equal(last().o.sel,-1,"換盤不帶選取");assert.deepEqual(last().o.targets,[]);
  assert.notEqual(M.bs[0].P.board.join(","),M.bs[2].P.board.join(","),"三盤局面不同（不然這條沒意義）");
  X.whlGo2(0,false);assert.equal(last().ex.bkey,k0);
  const keys=new Set([0,1,2].map(i=>J(X.whl3Ex("whl:"+M.id+":"+i,"tilt",M.bs[i].P,"me")).bkey));assert.equal(keys.size,3);assert.equal(J(X.whl3Ex("k","tilt",M.bs[0].P,"think")).thinking,true);assert.equal(J(X.whl3Ex("k","flat",M.bs[0].P,"me")).tdCam,"top")});

/* park3d 的 bkeySwap 原文拿出來跑（那一段不碰 three） */
const BK=(()=>{const a=P3.indexOf("const bkeySwap=k=>{"),b=P3.indexOf("prevB=null;prevLast=null};",a);assert.ok(a>0&&b>a,"找得到 park3d bkeySwap");return P3.slice(a,b+"prevB=null;prevLast=null};".length)})();
test("〔混合〕park3d 換盤直接擺好：bkey 變了＝不拿上一盤比對（prevB 清掉 → 整盤重擺，不會把碰巧對得上的子當成走過去）、進行中的動畫當場收尾、拖到一半的子放下；第一次給 bkey、同一盤都不動", ()=>{
  const S=new Function(`let BKEY=null,prevB=["x"],prevLast="1-2",anims=[],CAPBUSY=0,TDP=null,ended=[],dragEnd=0;const tdDragEnd=()=>{dragEnd++};${BK}
    return{swap:bkeySwap,get:()=>({BKEY,prevB,prevLast,n:anims.length,CAPBUSY,TDP,ended,dragEnd}),set(o){if("prevB"in o)prevB=o.prevB;if("prevLast"in o)prevLast=o.prevLast;if("anims"in o)anims=o.anims;if("CAPBUSY"in o)CAPBUSY=o.CAPBUSY;if("TDP"in o)TDP=o.TDP},push:a=>anims.push(a),ended}`)();
  S.swap("a");assert.deepEqual(S.get().prevB,["x"],"第一次給 bkey：不動（照平常開局）");assert.equal(S.get().BKEY,"a");
  S.swap("a");assert.deepEqual(S.get().prevB,["x"],"同一盤：不動，走子動畫照常");
  /* 換盤：兩段式動畫（第一段結束時再排第二段）都要收尾 */
  S.set({CAPBUSY:2,TDP:{drag:{}},anims:[{f:p=>S.ended.push("f1:"+p),end:()=>{S.ended.push("e1");S.push({f:p=>S.ended.push("f2:"+p),end:()=>S.ended.push("e2")})}}]});
  S.swap("b");const g=S.get();assert.equal(g.prevB,null);assert.equal(g.prevLast,null);assert.equal(g.n,0);assert.deepEqual(g.ended,["f1:1","e1","f2:1","e2"]);assert.equal(g.CAPBUSY,0);assert.equal(g.TDP,null);assert.equal(g.dragEnd,1);
  /* 原始碼：draw 只在有給 bkey 時才進來；prevB 是空的就走整盤重擺 */
  assert.match(P3,/gntHorseLock\(o\.sel!=null\?o\.sel:-1,board\)\}catch\(e\)\{\}if\(ex\.bkey!==undefined\)bkeySwap\(ex\.bkey\);[^\n]*\n\s+const L=o\.last&&/,"在比對上一盤（moved）之前先處理換盤");assert.match(P3,/const moved=prevB&&L&&lk!==prevLast&&/);assert.match(P3,/else if\(!prevB\|\|board\.join\(","\)!==prevB\.join\(","\)\)\{if\(!\(GIANT&&prevB&&lk===prevLast&&patchB\(board,prevB,null\)\)\)sync\(board\)\}/);
  assert.match(P3,/function sync\(board\)\{Object\.values\(pieces\)\.forEach\(g=>GIANT\?gntDrop\(g\):sc\.remove\(g\)\);pieces=\{\};board\.forEach\(\(p,i\)=>\{if\(p\)\{const g=makePiece\(p\);at\(g,i\);pieces\[i\]=g\}\}\)/,"sync＝直接擺在格子上，沒有動畫")});

test("哪一張完整、哪兩張簡化：目前這盤交給 park3d（完整角色），另外兩盤照盤號一左一右交給簡化棋盤；換盤後跟著換；兩盤的舊存檔只有一張簡化", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park(),S=start(E),pv=made[0],M=S.M,side=()=>J(E.run("WHL_3SL")).map(s=>[s.i,s.slot]);
  assert.deepEqual(J(X.whlSlots(3,0)),[{i:1,slot:"L"},{i:2,slot:"R"}]);assert.deepEqual(J(X.whlSlots(3,1)),[{i:0,slot:"L"},{i:2,slot:"R"}]);assert.deepEqual(J(X.whlSlots(3,2)),[{i:0,slot:"L"},{i:1,slot:"R"}]);
  assert.deepEqual(J(X.whlSlots(2,0)),[{i:1,slot:"R"}]);assert.deepEqual(J(X.whlSlots(2,1)),[{i:0,slot:"L"}]);assert.deepEqual(J(X.whlSlots(1,0)),[]);
  for(const c of[0,1,2]){X.whlGo2(c,false);assert.equal(pv.draws[pv.draws.length-1].b,M.bs[c].P.board.join(","),"完整的是第 "+(c+1)+" 盤");assert.deepEqual(side(),J(X.whlSlots(3,c)).map(s=>[s.i,s.slot]));
    const G=pv.F.scene.children.filter(o=>o.userData.giant);assert.equal(G.length,2,"場景裡兩張簡化棋盤");assert.ok(!side().some(s=>s[0]===c),"目前這盤不會同時是簡化的")}});

test("簡化棋盤的棋子跟那一盤的局面一致：每顆子一塊圓牌，位置照同一套格子、紅黑用不同的圖集格；局面變了才重填", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park(),S=start(E),pv=made[0],M=S.M,b1=M.bs[1].P.board,Q=X.whlSideQuads(b1,1.6,.6);
  assert.equal(Q.n,b1.filter(Boolean).length);assert.deepEqual(J(Q.cells).map(c=>[c.sq,c.p]),b1.map((p,q)=>[q,p]).filter(x=>x[1]),"每顆子一塊，一顆不多一顆不少");
  for(let k=0;k<Q.n;k++){const c=Q.cells[k],x=(c.sq%9-4)*1.6,z=((c.sq/9|0)-4.5)*1.6,p=Array.from(Q.pos.slice(k*12,k*12+12)),u=Array.from(Q.uv.slice(k*8,k*8+8));
    assert.ok(Math.abs((p[0]+p[3])/2-x)<1e-5&&Math.abs((p[2]+p[8])/2-z)<1e-5,"圓牌中心在那一格");assert.ok(p[1]===Math.fround(.6)&&p[4]===p[1]&&p[7]===p[1]&&p[10]===p[1],"平躺在盤面上");
    const cell=X.whlAtlasCell(c.p);assert.deepEqual([u[0],u[2]],[cell.c/4,(cell.c+1)/4]);assert.deepEqual([u[1],u[5]],[1-(cell.r+1)/4,1-cell.r/4])}
  assert.ok(Array.from(Q.pos.slice(Q.n*12)).every(v=>v===0),"用不到的格子不留舊資料");
  /* 圖集：紅 7 黑 7 個字各一格，不重複；同一種子紅黑不同格 */
  const cells=[..."KABNRCP",..."kabnrcp"].map(p=>{const c=X.whlAtlasCell(p);return c.c+","+c.r});assert.equal(new Set(cells).size,14);assert.equal(X.whlAtlasCell("x"),null);assert.equal(X.whlAtlasCell(null),null);
  const cv=E.D.mk("canvas");X.whlAtlasDraw(cv.getContext("2d"),512);assert.deepEqual(cv.txt.map(t=>t[0]).join(""),"帥仕相傌俥炮兵將士象馬車砲卒");assert.equal(new Set(cv.txt.map(t=>t[1]+","+t[2])).size,14,"每個字畫在自己的格子");
  /* 場景裡那兩張：drawRange＝子數×6，內容＝那一盤 */
  const G=pv.F.scene.children.filter(o=>o.userData.giant),SL=J(E.run("WHL_3SL"));assert.equal(SL.length,2);
  for(const s of SL){const g=G.find(o=>Math.sign(o.position.x)===(s.slot==="L"?-1:1)),pc=g.children[2];assert.deepEqual(pc.geometry.draw,[0,M.bs[s.i].P.board.filter(Boolean).length*6]);
    assert.deepEqual(Array.from(pc.geometry.attributes.position.array),Array.from(X.whlSideQuads(M.bs[s.i].P.board,1.6,.57+.04).pos));assert.equal(g.children[0].geometry,pv.F.A.board.geometry,"棋盤板借主盤的幾何");assert.equal(g.children[0].material,pv.F.A.board.material,"也借主盤的材質")}
  const at=G[0].children[2].geometry.attributes.position;at.needsUpdate=false;E.run("WHL_HK=''");X.whlPaint();assert.equal(at.needsUpdate,false,"局面沒變不重填");
  assert.equal(G[0].children[2].material,G[1].children[2].material,"兩張盤的圓牌共用一個材質、一張圖集")});

test("簡化棋盤上的狀態跟縮圖同一份：輪到我／思考中／已走／勝敗和、最嚴重的危險角標、封招；鈕上寫盤號，點了換到那一盤", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park(),S=start(E),M=S.M,list=()=>J(X.whlSideList(M,cur(E),C));
  assert.deepEqual(list().map(s=>[s.i,s.st,s.lab,s.res]),[[1,"me","輪到我",""],[2,"me","輪到我",""]]);
  M.bs[1].P.turn="b";M.bs[2].acted=M.R;assert.deepEqual(list().map(s=>[s.st,s.lab]),[["think","思考中"],["wait","已走"]]);M.bs[1].P.turn="r";M.bs[2].acted=-1;
  M.bs[1].P.result={w:"r",why:"x"};M.bs[2].P.result={w:"b",why:"x"};assert.deepEqual(list().map(s=>[s.st,s.lab,s.res]),[["done","勝","勝"],["done","敗","敗"]]);M.bs[2].P.result={w:null,why:"x"};assert.equal(list()[1].lab,"和");M.bs[1].P.result=null;M.bs[2].P.result=null;
  /* 危險：跟縮圖用同一個 WHL.danger 的第一名 */
  M.bs[1].P.td.me.hp=0;const D=J(X.WHL.danger(M,1,C))[0];assert.ok(D&&D.k==="core","第 2 盤星核見底：最嚴重的是「危」");const s1=list()[0];assert.equal(s1.dg,D.k);assert.equal(s1.hot,D.rank>=X.WHL.DG_HOT);
  const th=X.whlThumbs(M),h=X.whlSbHTML(s1);assert.ok(th.includes(`<i class="whl-dg ${D.k}">${X.WHL_DG[D.k][0]}</i>`),"縮圖上的角標");assert.ok(h.includes(`<i class="whl-dg ${D.k}">${X.WHL_DG[D.k][0]}</i>`),"簡化棋盤的鈕上同一個角標");
  assert.match(h,/^<button type="button" class="whl-sb me( hot)?" data-i="1" data-slot="L" aria-label="換到第 2 盤，輪到我，/);assert.ok(h.includes("<b>2</b><span>輪到我</span>"));
  M.bs[2].seal=M.R;assert.equal(list()[1].seal,true);assert.ok(X.whlSbHTML(list()[1]).includes('<i class="whl-sl">封</i>'));
  /* 畫面上真的有這兩顆鈕，位置照簡化棋盤的投影；點了換盤 */
  E.run("WHL_HK=''");X.whlPaint();X.whl3Frame();const o=E.doc.getElementById("whl3Ov"),sb=o.querySelectorAll(".whl-sb");assert.equal(sb.length,2);assert.deepEqual(sb.map(b=>b.dataset.i),["1","2"]);
  for(const b of sb){assert.match(b.style.transform,/^translate\(\d+px,\d+px\) translate\(-50%,-50%\)$/);assert.equal(b.style.display,"")}
  assert.ok(+/translate\((\d+)px/.exec(sb[0].style.transform)[1]<+/translate\((\d+)px/.exec(sb[1].style.transform)[1],"左邊那張的鈕在左邊");
  E.ctx.RM=true;sb[1].fire("click");assert.equal(cur(E),2,"減少動態：點了直接換")});

/* ====================== 擺位、留白、命中 ====================== */
test("三張盤的擺位：兩張簡化棋盤各縮成 .47 倍，並排在主盤遠端（星樞那一側）後面，左右對稱、外緣跟主盤同寬、彼此不疊、不壓到主盤；盤面同高", ()=>{
  const X=boot().X,gs=1.6,BW=10.4,BH=11.4,w=BW*gs,d=BH*gs,L=X.whlSidePos("L",gs,BW,BH,.57),R=X.whlSidePos("R",gs,BW,BH,.57);
  assert.equal(L.s,.47);assert.equal(L.x,-R.x);assert.equal(L.z,R.z);assert.ok(L.x<0&&R.x>0);
  assert.ok(Math.abs((R.x+w*R.s/2)-w/2)<1e-9,"右邊那張的外緣＝主盤右緣");assert.ok(R.x-w*R.s/2>0,"兩張中間有縫");
  assert.ok(L.z+d*L.s/2<-d/2-1,"近端邊在主盤遠端邊的後面（隔 .9 格）");assert.ok(Math.abs((-d/2)-(L.z+d*L.s/2)-X.WHL_SGAP*gs)<1e-9);
  assert.ok(Math.abs(L.y+.57*L.s-.57)<1e-9,"縮小以後盤面還是跟主盤同一個高度")});

test("3D 區上面留多少給簡化棋盤：至少 16；高的螢幕整張露出來，矮的螢幕主盤優先（至少 86% 寬或 80% 高），剩下的露一截；只有一盤時不留", ()=>{
  const X=boot().X,p=X.whlPadTop;assert.equal(p(0,0),16);assert.equal(p(375,30),16);
  for(const[W,H]of[[375,413],[375,593],[390,520],[800,360],[768,700],[320,330]]){const t=p(W,H),m=H-4-t;assert.ok(t>=16&&t<H*.5,`${W}×${H} 留 ${t}`);assert.ok(m>=Math.min(W*.86,(H-4)*.8)-1,`${W}×${H} 主盤還有 ${m}`)}
  assert.ok(p(375,593)>p(375,413),"越高留越多");assert.equal(p(375,593),Math.round(375*.47),"夠高：整張露出來就好，不多留");assert.equal(p(375,2000),Math.round(375*.47));
  const E=boot({store:{whlView:JSON.stringify("top")}}),made=E.park();start(E);assert.deepEqual(made[0].pads[made[0].pads.length-1],[16,2,4,2],"3D 區還量不到大小時先用預設")});

test("點簡化棋盤：點在它的投影四邊形裡＝那一盤；點在主盤（外擴一成）裡不算，免得跟選子搶；都不是＝-1", ()=>{
  const X=boot().X,main=[{x:100,y:300},{x:340,y:300},{x:340,y:570},{x:100,y:570}],sides=[{i:1,q:[{x:60,y:80},{x:190,y:80},{x:200,y:170},{x:50,y:170}]},{i:2,q:[{x:210,y:80},{x:340,y:80},{x:350,y:170},{x:200,y:170}]},null];
  assert.equal(X.whlHitSide({x:120,y:120},main,sides),1);assert.equal(X.whlHitSide({x:300,y:160},main,sides),2);assert.equal(X.whlHitSide({x:20,y:120},main,sides),-1);assert.equal(X.whlHitSide({x:200,y:400},main,sides),-1,"主盤裡");
  assert.equal(X.whlHitSide({x:200,y:295},main,sides),-1,"主盤邊上（外擴一成）");assert.equal(X.whlHitSide({x:120,y:120},null,sides),1,"主盤投影算不出來時照樣能點");
  const over=[{i:1,q:[{x:60,y:250},{x:190,y:250},{x:200,y:330},{x:50,y:330}]}];assert.equal(X.whlHitSide({x:120,y:320},main,over),-1,"疊到主盤的那一截歸主盤");assert.equal(X.whlHitSide({x:120,y:262},main,over),1);
  assert.equal(X.whlInQuad({x:5,y:5},[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]),true);assert.equal(X.whlInQuad({x:11,y:5},[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]),false);
  /* 鈕的位置：靠主盤那邊往裡 35%，不超出 3D 區 */
  const Q={c:{x:120,y:120},n:{x:120,y:170},q:[]};assert.deepEqual(J(X.whlSbAt(Q,null)),{x:120,y:145});assert.deepEqual(J(X.whlSbAt({c:{x:10,y:-40},n:{x:10,y:5}},{left:0,top:0,right:400,bottom:400})),{x:48,y:18})});

/* ====================== 鏡頭飛行 ====================== */
test("鏡頭飛到簡化棋盤：起點是原本的鏡頭、終點看著那張盤的中心而且拉近到它的倍數（看起來跟主盤一樣大）；中間平順", ()=>{
  const X=boot().X,cp={x:0,y:30,z:12},P={x:4.4,z:-14.8,s:.47},a=J(X.whlFlyAt(0,cp,P,.56)),b=J(X.whlFlyAt(1,cp,P,.56)),m=J(X.whlFlyAt(.5,cp,P,.56));
  assert.deepEqual(a,{px:0,py:30,pz:12,lx:0,ly:.56,lz:0});assert.deepEqual([b.lx,b.ly,b.lz],[4.4,.56,-14.8]);
  for(const[k,v]of[["px",4.4+0*.47],["py",.56+(30-.56)*.47],["pz",-14.8+12*.47]])assert.ok(Math.abs(b[k]-v)<1e-9,k);
  assert.ok(m.lx>0&&m.lx<4.4&&m.py<30&&m.py>b.py);assert.deepEqual(J(X.whlFlyAt(2,cp,P,.56)),b,"超過 1 當 1");assert.deepEqual(J(X.whlFlyAt(-1,cp,P,.56)),a)});

test("換盤（點縮圖、「先救」、自動跳盤、點簡化棋盤都走 whlGo）在 3D：鏡頭先飛、飛到了才換內容；飛的時候不收點擊；park3d 還在播走子動畫就先等；飛太久直接換", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park(),S=start(E),pv=made[0],M=S.M,F=pv.F,n0=pv.draws.length;
  S.ov.querySelectorAll(".whl-tb")[2].fire("click");   /* 點第 3 張縮圖 */
  assert.equal(cur(E),0,"還沒換：鏡頭在飛");assert.ok(E.run("!!WHL_FLY"));assert.equal(pv.draws.length,n0+1,"先重畫一次（收掉選取），還是原本那盤");assert.equal(pv.draws[n0].ex.bkey,"whl:"+M.id+":0");
  X.whlTap(M.bs[0].P.board.findIndex(p=>p==="R"));assert.equal(E.run("WHL_SEL"),-1,"飛的時候點棋子沒反應");X.whlGo(1,true);assert.equal(E.run("WHL_FLY.j"),2,"飛的時候再點別盤也不理");
  X.whl3Frame();assert.equal(E.doc.getElementById("whl3Ov").style.visibility,"hidden","飛的時候記號先藏起來");
  E.tick(X.WHL_3MS/2);F.frame();const P=X.whlSidePos("R",1.6,10.4,11.4,.57);assert.ok(F.cam.look&&F.cam.look.x>0&&F.cam.look.x<P.x,"飛到一半：看的點在路上");assert.equal(cur(E),0);
  E.tick(X.WHL_3MS/2+10);F.frame();assert.deepEqual([F.cam.look.x,F.cam.look.z],[P.x,P.z],"到了：看著那張盤的中心");assert.equal(cur(E),0,"這一格還停在終點（內容下一格之前才換，中間不閃舊畫面）");
  E.tick(0);assert.equal(cur(E),2,"換過去了");assert.equal(E.run("WHL_FLY"),null);assert.equal(pv.draws[pv.draws.length-1].ex.bkey,"whl:"+M.id+":2");assert.equal(pv.draws[pv.draws.length-1].b,M.bs[2].P.board.join(","));
  F.cam.look=null;F.frame();assert.equal(F.cam.look,null,"換完鏡頭還給 park3d，不再去動它");X.whl3Frame();assert.equal(E.doc.getElementById("whl3Ov").style.visibility,"");
  /* park3d 還在播動畫：等它（最多 0.9 秒） */
  pv.busyN=1;X.whlGo(0,true);E.tick(300);F.frame();assert.equal(F.cam.look,null,"還在等，沒開始飛");pv.busyN=0;E.tick(60);E.tick(X.WHL_3MS+10);F.frame();E.tick(0);assert.equal(cur(E),0);
  pv.busyN=1;X.whlGo(1,true);E.tick(950);E.tick(X.WHL_3MS+10);F.frame();E.tick(0);assert.equal(cur(E),1,"等超過 0.9 秒就不等了");pv.busyN=0;
  /* 畫面停著不畫（分頁在背景、省電）：掛勾沒被叫，保險時間到直接換 */
  X.whlGo(2,true);E.tick(X.WHL_3MS+950);assert.equal(cur(E),2);assert.equal(E.run("WHL_FLY"),null);
  /* 減少動態：直接切 */
  E.ctx.RM=true;const n1=pv.draws.length;X.whlGo(0,true);assert.equal(cur(E),0);assert.equal(pv.draws.length,n1+1);assert.equal(E.run("WHL_FLY"),null)});

test("直接點旁邊那張簡化棋盤（不是拖曳）＝換到那一盤；拖著轉視角、點在主盤上、平面視角都不會", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park(),S=start(E),pv=made[0];E.ctx.RM=true;
  const Q=E.run("WHL_SIDE").quad("R");assert.ok(Q&&Q.q.length===4);const p=Q.c;
  X.whl3Down({clientX:p.x,clientY:p.y,pointerId:1});X.whl3Up({clientX:p.x+30,clientY:p.y,pointerId:1});assert.equal(cur(E),0,"拖了 30px：是在轉視角");
  X.whl3Down({clientX:p.x,clientY:p.y,pointerId:1});X.whl3Up({clientX:p.x+2,clientY:p.y,pointerId:2});assert.equal(cur(E),0,"不是同一根手指");
  X.whl3Down({clientX:200,clientY:400,pointerId:1});X.whl3Up({clientX:200,clientY:400,pointerId:1});assert.equal(cur(E),0,"點在主盤上");
  X.whl3Down({clientX:p.x,clientY:p.y,pointerId:1});X.whl3Up({clientX:p.x+2,clientY:p.y+1,pointerId:1});assert.equal(cur(E),2,"點右邊那張＝第 3 盤");
  const QL=E.run("WHL_SIDE").quad("L").c;S.host.fire("pointerdown",{clientX:QL.x,clientY:QL.y,pointerId:5});S.host.fire("pointerup",{clientX:QL.x,clientY:QL.y,pointerId:5});assert.equal(cur(E),0,"3D 區真的有接這兩個事件：左邊那張現在是第 1 盤");
  pv.F.V.under=true;assert.equal(E.run("WHL_SIDE").quad("R"),null,"轉到盤底：投影不算，鈕也藏起來")});

/* ====================== 3D 開不起來 ====================== */
test("3D 不能用時退回平面：裝置建不出來、載入失敗、20 秒沒好，都把視角存回平面、講一聲、平面棋盤照樣能下，不卡住", ()=>{
  /* ① create 回 null */
  let E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X;E.park({fail:true});let S=start(E);
  assert.equal(E.get("whlView"),"flat");assert.equal(X.whl3dOn(),false);assert.ok(!S.ov.classList.contains("v3"),"平面主棋盤沒被收起來");assert.match(E.log.toast.join("|"),/沒辦法顯示 3D/);assert.match(S.ov.querySelector(".whl-vw").innerHTML,/純淨平面/);
  const own=S.M.bs[0].P.board.findIndex(p=>p==="R");X.whlTap(own);assert.equal(E.run("WHL_SEL"),own,"照樣能選子");assert.equal(E.log.flat[E.log.flat.length-1].sel,own);
  /* ② 還沒載 park3d，載入失敗 */
  E=boot({store:{whlView:JSON.stringify("tilt")}});X=E.X;let rej=null;E.ctx.parkLoad=()=>({then(f){return{catch(g){rej=g}}}});S=start(E);assert.equal(X.whl3dOn(),true,"載入中");assert.ok(!S.ov.classList.contains("v3"),"載入中先照平面顯示");
  rej(new Error("x"));assert.equal(E.get("whlView"),"flat");assert.equal(X.whl3dOn(),false);assert.equal(E.log.toast.filter(t=>/3D/.test(t)).length,1);
  /* ③ 20 秒沒好 */
  E=boot({store:{whlView:JSON.stringify("top")}});X=E.X;let ok=null;E.ctx.parkLoad=()=>({then(f){ok=f;return{catch(){}}}});S=start(E);E.tick(19000);assert.equal(X.whl3dOn(),true);E.tick(1100);assert.equal(X.whl3dOn(),false);assert.equal(E.get("whlView"),"flat");
  const made=E.park();ok();assert.equal(made.length,0,"逾時之後才載好：不再建");
  /* ④ 載入中就離開：載好也不建 */
  E=boot({store:{whlView:JSON.stringify("top")}});X=E.X;E.ctx.parkLoad=()=>({then(f){ok=f;return{catch(){}}}});S=start(E);X.whlHide();const made2=E.park();ok();assert.equal(made2.length,0);assert.equal(E.get("whlView"),"top","自己離開不算開不起來");
  /* ⑤ 沒有載入函式（不該發生）也不卡 */
  E=boot({store:{whlView:JSON.stringify("top")}});X=E.X;S=start(E);assert.equal(X.whl3dOn(),false);assert.equal(E.get("whlView"),"flat")});

/* ====================== 離開後收乾淨 ====================== */
test("簡化棋盤的資源帳：自己建的只有 6 個（圖集、圓牌材質、框線幾何、框線材質、兩盤各一個圓牌幾何）；拆掉時全部 dispose、場景回到原樣、掛勾解除；借主盤的幾何和材質不能 dispose", ()=>{
  const X=boot().X,F=fakeApi(),D=fakeDom(),kit=X.whlSideKit(F.A,D.doc),n0=F.scene.children.length,b=new Array(90).fill(null);b[4]="k";b[85]="K";b[40]="R";
  assert.deepEqual(J(kit.stat()),{groups:0,own:0,hook:1});assert.deepEqual(J(F.K.cnt),{geo:0,mat:0,tex:0,disp:0},"還沒有簡化棋盤：什麼都不建");
  kit.set([{i:1,slot:"L",key:"a",board:b},{i:2,slot:"R",key:"b",board:b}]);assert.deepEqual(J(kit.stat()),{groups:2,own:6,hook:1});assert.deepEqual(J(F.K.cnt),{geo:3,mat:2,tex:1,disp:0});assert.equal(F.scene.children.length,n0+2);
  for(const g of F.scene.children.slice(n0)){assert.equal(g.userData.giant,1,"park3d 每格會藏掉不認得的東西，要標 giant");assert.equal(g.children.length,3);assert.equal(g.scale.x,.47)}
  kit.set([{i:0,slot:"L",key:"c",board:b},{i:2,slot:"R",key:"b",board:b}]);assert.deepEqual(J(F.K.cnt),{geo:3,mat:2,tex:1,disp:0},"換盤只換內容，不重建");assert.equal(kit.slotOf(0),"L");assert.equal(kit.slotOf(1),null);
  kit.set([{i:1,slot:"R",key:"a",board:b}]);assert.deepEqual(J(kit.stat()),{groups:1,own:5,hook:1},"少一張：它的圓牌幾何當場 dispose");assert.equal(F.K.cnt.disp,1);assert.equal(F.scene.children.length,n0+1);
  kit.dispose();assert.deepEqual(J(kit.stat()),{groups:0,own:0,hook:0});assert.equal(F.scene.children.length,n0,"場景回到進來之前");assert.equal(F.hooks.size,0);
  assert.equal(F.K.cnt.disp,F.K.cnt.geo+F.K.cnt.mat+F.K.cnt.tex,"建幾個就 dispose 幾個");assert.equal(F.K.cnt.disp,6);kit.dispose();assert.equal(F.K.cnt.disp,6,"再叫一次不重複");
  assert.equal(kit.fly(1,100,()=>{}),false,"拆掉以後不能飛")});

test("離開車輪戰（✕、整場結束按離開）：3D 實例 destroy 一次、簡化棋盤拆乾淨、記號層和選單移除、過場標記拿掉、whl3dOn＝false；底下是對局頁就叫它重畫；星門圍城的視角不受影響", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top"),gsvView:JSON.stringify("tilt")},hash:"#/journey/play"}),X=E.X,made=E.park();E.ctx.PARK={v:{destroy(){E.ctx.PARK=null}}};
  const bb=E.D.mk("div");bb.id="bbox";E.doc.body.append(bb);E.doc.documentElement.classList.add("pk-veil");const S=start(E),pv=made[0],F=pv.F,n0=2;
  X.whlViewMenu(true);X.whl3Frame();assert.ok(E.doc.getElementById("whl3Ov"));assert.ok(E.doc.getElementById("whlViewM"));assert.equal(F.scene.children.length,n0+2);assert.equal(F.hooks.size,1);
  S.ov.querySelectorAll("[data-x]").find(b=>b.dataset.x==="quit").fire("click");
  assert.equal(pv.dead(),1);assert.equal(E.run("WHL_PK"),null);assert.equal(E.run("WHL_SIDE"),null);assert.equal(E.run("WHL_FLY"),null);assert.equal(X.whl3dOn(),false);assert.equal(X.whl3Shown(),false);
  assert.equal(F.scene.children.length,n0,"場景裡的簡化棋盤拿掉了");assert.equal(F.hooks.size,0);assert.equal(F.K.cnt.disp,F.K.cnt.geo+F.K.cnt.mat+F.K.cnt.tex);assert.ok(F.K.cnt.disp>=6);
  for(const id of["whlOv","whl3Ov","whlViewM"])assert.equal(E.doc.getElementById(id),null,id+" 移除");assert.equal(E.doc.querySelectorAll(".park3d").length,0);assert.ok(!E.doc.documentElement.classList.contains("pk-veil"));
  assert.equal(E.log.rr,0);E.tick(0);assert.equal(E.log.rr,1,"底下是對局頁：叫它重畫（它的 3D 被收掉了）");
  assert.equal(E.get("whlView"),"top","離開不改記住的視角");assert.equal(E.get("gsvView"),"tilt");assert.equal(X.gsvVw(),"tilt");assert.equal(E.ctx.PARK,null,"沒有留下全域的 3D 實例");assert.equal(E.get("park3d"),undefined);
  X.whl3Frame();E.tick(5000);assert.equal(E.log.rr,1,"離開之後不會再有東西在跑");
  /* 再進來：重新建一個（還是只有一個） */
  X.whlOpen();assert.equal(made.length,2);assert.equal(made[1].dead(),0);assert.equal(E.doc.querySelectorAll(".park3d").length,1)});

test("離開的幾種情況：換頁（hashchange）造成的不叫對局頁重畫；底下不是對局頁不叫；這一場沒開過 3D 不叫；在場內回平面不叫（還在車輪戰裡）", ()=>{
  let E=boot({store:{whlView:JSON.stringify("top")},hash:"#/journey/play"}),X=E.X;E.park();const bb=E.D.mk("div");bb.id="bbox";E.doc.body.append(bb);start(E);X.whlHide({type:"hashchange"});E.tick(0);assert.equal(E.log.rr,0);assert.equal(X.whl3dOn(),false);
  E=boot({store:{whlView:JSON.stringify("top")},hash:"#/port"});X=E.X;E.park();start(E);X.whlHide();E.tick(0);assert.equal(E.log.rr,0);
  E=boot({hash:"#/journey/play"});X=E.X;E.park();const b2=E.D.mk("div");b2.id="bbox";E.doc.body.append(b2);start(E);X.whlHide();E.tick(0);assert.equal(E.log.rr,0);
  E=boot({store:{whlView:JSON.stringify("top")},hash:"#/journey/play"});X=E.X;E.park();const b3=E.D.mk("div");b3.id="bbox";E.doc.body.append(b3);start(E);X.whlSetView("flat");E.tick(0);assert.equal(E.log.rr,0,"回平面還在車輪戰裡");
  X.whlHide();E.tick(0);assert.equal(E.log.rr,1,"之後離開才叫（3D 開過）")});

/* ====================== 盤上記號、跳字 ====================== */
test("〔混合〕3D 盤上記號重用星門圍城那一套：可點的目標補上 tg、星門拆成貼地圈＋直立「門 N」、侵／陣是直立徽章（11/16 取消陣眼子：盤上沒有「眼」記號）；貼地矩陣用車輪戰自己的座標（bhtdGnd 第四個參數）", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X,made=E.park(),S=start(E),pv=made[0],M=S.M,b=M.bs[0].P.board,L0=J(X.whlMarks(M,0)),L=J(X.whl3Marks(M,0));
  assert.ok(L0.some(m=>m.k==="gate"&&/^門\d+$/.test(m.t)),"平面記號有星門");assert.ok(!L0.some(m=>/\beye\b/.test(m.k))&&!L.some(m=>/\beye\b/.test(m.k)),"平面、3D 都沒有陣眼記號");
  assert.ok(L.filter(m=>m.k==="gate").every(m=>/^門<i>\d+<\/i>$/.test(m.t)));for(const m of L)assert.ok(["gnd","up"].includes(X.gsvMkKind(m.k)));assert.equal(X.gsvMkKind("bd eye"),"up");
  E.run("WHL_TG={id:'dep',p:'R',pk:[]};WHL_HK=''");const T=J(X.whl3Marks(M,0)).filter(m=>m.b);assert.ok(T.length>0&&T.every(m=>m.k==="tg"));E.run("WHL_TG=null;WHL_HK=''");
  /* bhtdGnd：給了座標函式就用它（不去問對局頁的 #bbox） */
  const xy=q=>({x:100+q%9*30,y:300+(q/9|0)*30});assert.equal(X.bhtdGnd(40,xy(40),30,xy),"1,0,0,1,0,0");assert.equal(X.bhtdGnd(40,xy(40),30),null,"沒給：照舊問 bhtdXY（這裡沒有對局頁 → 算不出來）");
  /* 畫面上：選一顆子 → 選中底光、落點、頭頂漢字牌；貼地的有矩陣、徽章掛在頭頂 */
  const own=b.findIndex(p=>p==="R");X.whlTap(own);X.whl3Frame();const o=E.doc.getElementById("whl3Ov"),R=o.querySelector(".mks").children.map(c=>({cls:c.className,sq:+c.dataset.sq,tf:c.style.transform,html:c._html}));
  assert.ok(R.some(r=>r.cls==="bt-mk selg g3"&&r.sq===own));assert.ok(R.some(r=>/^bt-mk (ink|aim) g3$/.test(r.cls)));
  for(const r of R.filter(r=>/ g3$/.test(r.cls))){const p=xy(r.sq);assert.equal(r.tf,`translate(${p.x}px,${p.y}px) matrix(1,0,0,1,0,0) translate(-50%,-50%)`)}
  const pn=R.filter(r=>/^bt-mk pnm /.test(r.cls));assert.equal(pn.length,b.filter(Boolean).length);for(const r of pn){const p=xy(r.sq);assert.equal(r.tf,`translate(${p.x}px,${p.y-40}px) translate(-50%,-50%)`)}
  assert.ok(!R.some(r=>/\beye\b/.test(r.cls)||r.html==="眼"),"沒有陣眼徽章");assert.ok(R.some(r=>r.cls==="bt-mk gt"&&/^門 \d+$/.test(r.html)));assert.ok(R.some(r=>r.cls==="gsv-mk gate g3"&&r.html===""));
  /* 可點的目標：車輪戰的點擊處理認得 gsv-mk tg */
  X.whlTap(own);E.run("WHL_TG={id:'dep',p:'R',pk:[]};WHL_HK=''");X.whlPaint();X.whl3Frame();const tg=o.querySelector(".mks").querySelectorAll(".tg");assert.ok(tg.length>0);assert.match(WS,/const mk=e\.target\.closest\("\.whl-mk\.tg,\.gsv-mk\.tg"\)/)});

test("跳字在 3D 上對位：有格子的放在那一格的螢幕位置，沒格子的（扣血、招名）放在 3D 區上方或下方；平面照舊放在平面棋盤裡", ()=>{
  const E=boot({store:{whlView:JSON.stringify("top")}}),X=E.X;E.park();const S=start(E),o=E.doc.getElementById("whl3Ov"),fl=()=>o.querySelectorAll(".whl-fl").map(f=>[f.textContent,f.style.left,f.style.top,f.className]);
  X.whlFloat("援軍",13,"");X.whlFloat("−8",null,"dmg");X.whlFloat("+3",null,"heal");assert.deepEqual(fl(),[["援軍","220px","330px","whl-fl"],["−8","200px","48px","whl-fl dmg"],["+3","200px","344px","whl-fl heal"]]);
  E.tick(1500);assert.equal(fl().length,0,"1.4 秒後拿掉");
  X.whlSetView("flat");X.whlFloat("援軍",13,"");const f=S.ov.querySelector(".whl-bd").querySelectorAll(".whl-fl");assert.equal(f.length,1);assert.match(f[0].style.left,/%$/)});

/* ====================== 原始碼：版面、介面、字典 ====================== */
test("〔原始碼〕版面：3D 開著時平面主棋盤收起來、3D 區填滿中間（park3d 照它的高度排）；三張縮圖縮成一排小膠囊但盤號、狀態、危險角標都留著；黑洞自由鏡頭的鈕收起來；記號層在車輪戰這一層裡", ()=>{
  const css=WS.slice(WS.indexOf("function whlCss(){"),WS.indexOf("function whlShow(){"));
  assert.ok(css.includes("#whlOv.v3 .whl-3d{display:block}#whlOv.v3 .whl-bd{display:none}"));assert.ok(css.includes(".whl-3d{display:none;position:sticky;top:0;flex:1 1 100%;align-self:stretch;min-width:0;height:100%;overflow:hidden}"));
  assert.match(P3,/if\(box&&\/\^\(sticky\|fixed\)\$\/\.test\(getComputedStyle\(box\)\.position\)\)/,"park3d 照 sticky／fixed 的容器高度排版");
  assert.ok(css.includes("#whlOv.v3 .whl-mini svg,#whlOv.v3 .whl-hp{display:none}#whlOv.v3 .whl-no{position:static;display:block}"),"縮圖變小：小棋盤、血條收掉，盤號留著");assert.ok(!/#whlOv\.v3 \.whl-(dg|sl|st)[^{]*\{[^}]*display:none/.test(css),"狀態字、危險角標、封招不能收");
  for(const k of[".pzoom",".gpad",".pkview",".pk2d",".gs-ui",".gs-pop",".un-ui",".tele-ui",".pkname"])assert.ok(css.includes("#whlOv .whl-3d "+k),"要收起來："+k);
  assert.ok(css.includes("#whl3Ov{position:fixed;inset:0;z-index:9001;pointer-events:none"));assert.ok(css.includes(".pk-veil #whl3Ov{visibility:hidden}"),"3D 過場時記號先藏");assert.ok(!css.includes(".bd.eye{"),"11/16 取消陣眼子：沒有「眼」徽章的樣式");
  assert.match(css,/\.whl-sb\{position:absolute;left:0;top:0;pointer-events:auto;[^}]*min-height:30px/);assert.ok(css.includes("@media (prefers-reduced-motion:reduce){.whl-sb.hot{animation:none}}"));
  assert.ok(WS.includes('<div class="whl-bw"><div class="whl-bd"><div class="whl-mks"></div></div><div class="whl-3d"></div></div>'));assert.ok(WS.includes('ov.append(o)}'),"記號層掛在 #whlOv 裡（不會蓋到跳出來的視窗）");
  assert.ok(WS.includes('<div class="whl-msg" aria-live="polite"></div>')&&WS.includes("${whlAlert(M,i)}"),"提示列和「先救」鈕照舊")});

test("〔原始碼〕park3d 只有新增：draw 的 ex.bkey、setTdPad、busy 都是新的；原本交出去的介面開頭不變；簡化棋盤用的是現成的 fxApi（場景、鏡頭、主盤網格、繪製掛勾），不在 park3d 裡", ()=>{
  assert.match(P3,/return\{el,draw,destroy,say,screenOf,headOf,setTdCam:\(m,fx\)=>tdSet\(m,fx\),tdCam:\(\)=>TDC,/);
  assert.match(P3,/hide\(\)\{el\.style\.display="none"\},show\(\)\{if\(el\.style\.display==="none"\)\{el\.style\.display="";fit\(\)\}\},\n\s+\/\*[^\n]*\*\/\n\s+setTdPad\(p\)\{[^\n]*TDPAD=q;pwPoke\(400\)\}\},busy:\(\)=>anims\.length>0\|\|CAPBUSY>0\|\|!!CINE\}\}/);
  assert.match(P3,/let TDK="",TDD=30,TDO=\[0,0\],TDPU=null,TDPAD=\[16,2,4,2\]/,"預設留白沒改");assert.match(P3,/const k=W\+"x"\+H\+"\|"\+GS\+"\|"\+TDC\+"\|"\+FIGK\+"\|"\+TDPAD\.join\(","\)/,"留白變了鏡頭會重算");
  assert.match(P3,/board:bplane,mirror:MG,hook\(f\)\{FXH\.add\(f\);return\(\)=>FXH\.delete\(f\)\}/);assert.match(P3,/if\(GIANT&&FXH\.size\)fxH\("main"\);if\(GIANT&&MG\)\{bplane\.visible=false;BU\.visible=false\}rd\.render\(sc,cam\)/,"掛勾在鏡頭擺好之後、畫之前");
  assert.match(P3,/const gntKeep=o=>[^\n]*\|\|!!\(o\.userData&&o\.userData\.giant\);/);
  for(const k of["whlSide","whl3","WHL_"])assert.ok(!P3.includes(k),"park3d 裡不該有車輪戰專用的東西："+k);
  assert.match(TD,/function bhtdGnd\(q,p,cell,xy\)\{xy=xy\|\|bhtdXY;/)});

test("〔原始碼〕英文字典補了這次的提示；視角名稱、專注模式那句沿用原本的", ()=>{
  for(const k of["這台裝置沒辦法顯示 3D，先用棋盤模式","三張星盤","純淨畫面、螢幕報讀模式用平面棋盤","全局俯視","臨陣斜角","純淨平面"]){assert.ok(I18.includes(`"${k}":"`),"字典要有："+k);assert.ok(WS.includes(k)||TD.includes(k),"程式裡真的用到："+k)}});

test("〔原始碼〕頂欄：三顆鈕不被擠扁（視角鈕的字不會被設定鈕蓋住）；螢幕太窄時視角鈕只留圖示，把位置讓給「第 N 輪」", ()=>{
  const css=WS.slice(WS.indexOf("function whlCss(){"),WS.indexOf("function whlShow(){"));
  assert.ok(css.includes(".whl-top>button{flex:none}"));assert.ok(css.includes("@media(max-width:359px){.whl-vw small{display:none}}"));
  assert.ok(WS.includes('class="whl-vw" data-x="view" aria-label="視角"'),"只剩圖示時報讀還念得出來")});
