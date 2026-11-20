// 11/18 第 35 輪（候選版 1010）N33-1：第一次進序局還有 3～5 個超過 200ms 的長任務 → 拆開：
//   ① shader 暖機：暫時場景 WS（燈光替身、霧、環境）一次只放一個有材質的物件、編出新 program 就讓出；投影深度 shader 挑代表真的 render 一次
//   ② 巨盤 create 的程式貼圖（cv）延後分段畫；第一次擺棋子人（parkDraw 的 draw）放到下一段；接模型（bot3d attachGLB）整段排進 glyLater
//   ③ 全景圖先 im.decode() 再取平均色；④ 走路小人縮小只改 CSS（不 rd.setSize）；⑤ N35-1「星盤展開中…」1.6 秒開始淡入
// 這些改動同時在兩份檔案：1010 組版快照（scratchpad\relD\src-20261118-1010\park3d.js、bot3d.js；scratchpad\snapB\xiangqi-db\m\06-cpu.js、07bh-blackhole.js）
//   和工作區（xiangqi-lab\src、xiangqi-db\m）。每個子測試對兩份都跑（快照不在＝只跑工作區，標明略過原因）。
// 不開瀏覽器：three.min.js 在 node 跑真的 Scene／Mesh／燈光，renderer 用假的（照 r149 compile 的規則：traverseVisible 收燈、traverse 收材質）。實際長任務要測試員量。
// 用法：node --test xiangqi-lab/tools/test-r40-1118.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SNAP = path.join(process.env.LOCALAPPDATA || "", "Temp", "claude", "C--Users-rayson-myClaude", "a1520069-d9a3-4c4a-a1ad-2cbf5ca0228d", "scratchpad");
const T_SRC = [["工作區", p => path.join(ROOT, "xiangqi-lab/src", p), p => path.join(ROOT, "xiangqi-db/m", p)], ["1010 快照", p => path.join(SNAP, "relD/src-20261118-1010", p), p => path.join(SNAP, "snapB/xiangqi-db/m", p)]]
  .filter(([n, s]) => fs.existsSync(s("park3d.js")));
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, j) };
const HAVE = T_SRC.length > 0, NO = "沒有 xiangqi-lab/src（公開副本不含）";
/* three.min.js：開發者電腦在 xiangqi-lab/src；公開副本的 run-tests 把 xiangqi-lab/site 連到倉庫根目錄（那裡有 three.min.js）；都沒有就略過 */
const THREE_P = ["xiangqi-lab/src/three.min.js", "xiangqi-lab/site/three.min.js", "../three.min.js"].map(p => path.join(ROOT, p)).find(p => fs.existsSync(p)) || null;
const three = () => require(THREE_P);
const NO3 = "找不到 three.min.js（xiangqi-lab/src、xiangqi-lab/site 都沒有）";

/* 假 renderer：照 three r149 WebGLRenderer.compile 的規則——traverseVisible 收燈光（數燈、數投影）、traverse 收有材質的物件（不看 visible）；
   program 的鍵＝材質種類＋燈光數＋投影數＋霧＋骨架。render 另外替投影物件編深度 shader（有投影燈時） */
function fakeRd() { const progs = new Map(), log = []; let cur = null;
  const key = (scene, o, m) => { let nl = 0, ns = 0; scene.traverseVisible(x => { if (x.isLight) { nl++; if (x.castShadow) ns++ } }); return [m.type, nl, ns, scene.fog ? 1 : 0, o.isSkinnedMesh ? 1 : 0].join("|") };
  const add = k => { if (!progs.has(k)) { progs.set(k, 1); R.info.programs.push(k); if (cur) cur.push(k) } };
  const R = { info: { programs: [] }, autoClear: true,
    compile(scene) { scene.traverse(o => { const M = o.material; if (!M) return; for (const m of [].concat(M)) add(key(scene, o, m)) }) },
    render(scene) { this.compile(scene); let ns = 0; scene.traverseVisible(x => { if (x.isLight && x.castShadow) ns++ }); if (ns) scene.traverse(o => { if (o.isMesh && o.castShadow) { const m = [].concat(o.material)[0]; add(["depth", o.isSkinnedMesh ? 1 : 0, m.side].join("|")) } }) },
    step(f) { cur = []; f(); const r = cur; cur = null; return r } };
  return { R, progs, log } }
/* 序局那樣的場景：燈（一盞投影）、霧、棋盤、背景、10 個棋子人（有骨架的、外殼子物件）、看不見的東西 */
function scene(T) { const sc = new T.Scene(); sc.fog = new T.Fog(0, 1, 2); const sun = new T.DirectionalLight(); sun.castShadow = true; sc.add(sun, new T.AmbientLight(), new T.HemisphereLight());
  sc.add(new T.Mesh(new T.PlaneGeometry(), new T.MeshStandardMaterial()), new T.Mesh(new T.SphereGeometry(), new T.MeshBasicMaterial({ side: T.BackSide })));
  for (let i = 0; i < 10; i++) { const g = new T.Group(), m = new T.SkinnedMesh(new T.BoxGeometry(), new T.MeshLambertMaterial()); m.castShadow = true; m.add(new T.Mesh(new T.BoxGeometry(), new T.ShaderMaterial())); g.add(m, new T.Mesh(new T.CircleGeometry(), new T.MeshBasicMaterial({ transparent: true }))); sc.add(g) }
  const hid = new T.Mesh(new T.BoxGeometry(), new T.MeshPhongMaterial()); hid.visible = false; sc.add(hid); return sc }

test("① shader 暖機（兩份都驗）：每段最多編出一個物件的 program、段與段之間讓出；暖完以後整個場景 compile、render 都不會再多編任何一支（燈光數、投影數、霧都跟正式畫面一樣）", { skip: !HAVE ? NO : !THREE_P ? NO3 : false }, () => {
  for (const [name, S] of T_SRC) {
    const P = rd(S("park3d.js")), code = between(P, P.includes("    const WS=new T.Scene(),WSL=[]") ? "    const WS=new T.Scene(),WSL=[]" : "    const WS=new T.Scene(),WM=", "\n    let warmed=false;");   /* 11/18 第 36 輪工作區改寫暖機（新規則見 test-n33-warm-1118.js），這裡照樣驗基本規則 */
    const T = three(), sc = scene(T), { R, progs } = fakeRd(), cam = new T.PerspectiveCamera(), nTop = sc.children.length; let now = 0; const Q = [];
    const ctx = { T, sc, cam, rd: R, stopped: false, performance: { now: () => now }, setTimeout: f => Q.push(f) };
    vm.createContext(ctx); vm.runInContext(code + ";this.run=warmRun", ctx);
    let done = 0; ctx.run(() => done++, 4000); const steps = [];
    while (Q.length && steps.length < 500) { const f = Q.shift(); steps.push(R.step(f)) }
    assert.equal(done, 1, name + "：暖完");
    assert.ok(steps.filter(s => s.length).length >= 5, name + "：program 分散在好幾段：" + steps.map(s => s.length).join(","));
    assert.ok(steps.every(s => s.length <= 1), name + "：每段最多一支（這個場景每個物件一種材質）：" + steps.map(s => s.length).join(","));
    const n = progs.size; R.compile(sc); R.render(sc); assert.equal(progs.size, n, name + "：正式畫面不再多編（暖機編的就是正式要用的那幾支）");
    assert.ok([...progs.keys()].some(k => /^depth\|1\|/.test(k)), name + "：有骨架的投影深度 shader 也先編好");
    for (const o of [sc, ...sc.children]) assert.ok(o.children !== undefined); sc.traverse(o => { assert.ok(Array.isArray(o.children)) });
    assert.equal(sc.children.length, nTop, name + "：暖機沒有搬動正式場景的物件"); let hull = 0; sc.traverse(o => { if (o.material && o.material.type === "ShaderMaterial") hull++ }); assert.equal(hull, 10, name + "：子物件都放回去");
  }
});

test("② 巨盤 create 的程式貼圖延後分段畫：create 時只排隊；有人先要用畫布（getContext）就先畫好那張；create 最後每段 30ms 畫完；淡入前等畫完、等全景圖解碼完", { skip: HAVE ? false : NO }, () => {
  for (const [name, S] of T_SRC) {
    const P = rd(S("park3d.js")), code = between(P, "  let CVQ=null;", "\n  const noise=");
    let made = 0; const drawn = []; const canvas = () => ({ width: 0, height: 0, getContext: HTMLCanvasProto.getContext });
    const HTMLCanvasProto = { getContext() { return { who: this } } };
    const ctx = { document: { createElement: () => { made++; const c = Object.create(HTMLCanvasProto); return c } }, HTMLCanvasElement: { prototype: HTMLCanvasProto }, T: { CanvasTexture: function (c) { this.image = c } }, srgb: t => t, ANI: 1 };
    vm.createContext(ctx); vm.runInContext(code + ";this.cv=cv;this.setQ=q=>{CVQ=q}", ctx);
    const Q = []; ctx.setQ(Q);
    const t1 = ctx.cv(4, 4, (g, w, h) => drawn.push("A")), t2 = ctx.cv(4, 4, (g, w, h) => drawn.push("B"));
    assert.deepEqual(drawn, [], name + "：create 時不畫"); assert.equal(Q.length, 2);
    t2.image.getContext("2d"); assert.deepEqual(drawn, ["B"], name + "：先要用那張就先畫好"); assert.equal(t2.needsUpdate, true);
    for (const j of Q) j(); assert.deepEqual(drawn, ["B", "A"], name + "：排隊的畫完，已畫過的不重畫");
    ctx.setQ(null); ctx.cv(4, 4, () => drawn.push("C")); assert.equal(drawn[2], "C", name + "：不是巨盤 create 時照舊當場畫");
    assert.ok(P.includes("function create(host,opt){opt=opt||{};CVQ=opt.giant?[]:null;let cvLeft=0,decPend=0;"), name);
    assert.ok(P.includes("{const Q=CVQ;CVQ=null;if(Q&&Q.length){cvLeft=Q.length;const run=()=>{const t=performance.now();while(Q.length&&performance.now()-t<30)"), name + "：每段 30ms");
    assert.ok(P.includes("gntGlbReady()&&!cvLeft&&!decPend&&dt>mn)"), name + "：淡入前等貼圖畫完、全景圖解碼完");
    assert.ok(P.includes("if(im&&im.decode&&im.naturalWidth){decPend++;const go=()=>{decPend--;put()};im.decode().then(go,go)}else put()};if(loadImg(BI.src,putD))setTimeout(putD,0)}}"), name + "：全景圖先 decode 再取平均色");
  }
});

test("② 第一次擺棋子人放到下一段（parkDraw）；接模型整段排進 glyLater；④ 走路小人縮小只改 CSS 大小", { skip: HAVE ? false : NO }, () => {
  for (const [name, S, Mm] of T_SRC) {
    const C6 = rd(Mm("06-cpu.js")); assert.ok(C6.includes("ik:pkIntroKey(ex),fresh:!!ex.giant};") && C6.includes("if(PARK.fresh){PARK.fresh=0;const P0=PARK;setTimeout(()=>{try{if(PARK===P0&&document.body.contains(host)&&P0.last){P0.v.draw(P0.last.board,P0.last.o,P0.last.ex);pkSwUi(host)}}catch(e){}},0);return}"), name + " 06-cpu");
    const B = rd(S("bot3d.js")); assert.ok(B.includes(".then(sc=>glyLater(()=>{if(!sc)throw new Error(\"empty\");") && B.includes("return glbFin()}));B.glbP.catch(") && !B.includes("return glyLater(()=>{run();return glbFin()})"), name + " bot3d：整段排隊、裡面不再排第二次（不會自己等自己）");
    const as = between(B, "    let shrink=1,bufW=0,bufH=0;const applySize=", "\n    const setScale=");
    let sets = []; const box = { style: {} }, dom = { style: {} }; const ctx = { SC: 1, W0: 60, H0: 80, W: 0, H: 0, box, rd: { setSize: (w, h, u) => sets.push([w, h, u]), domElement: dom } };
    vm.createContext(ctx); vm.runInContext("let W=0,H=0;" + as.replace("let shrink=1,", "var shrink=1,") + ";this.a=applySize;this.s=v=>{shrink=v}", ctx);
    ctx.a(); assert.deepEqual(sets, [[60, 80, false]], name + "：第一次配緩衝區"); ctx.s(.6); ctx.a(); assert.equal(sets.length, 1, name + "：縮小不重配"); assert.equal(dom.style.width, "36px"); assert.equal(box.style.width, "36px");
    ctx.s(1); ctx.a(); assert.equal(sets.length, 1, name + "：回到原大小也不重配"); ctx.s(2); ctx.a(); assert.equal(sets.length, 2, name + "：變更大才重配");
  }
});

test("⑤ N35-1「星盤展開中…」1.6 秒開始淡入（0.4 秒淡完，2.0 秒那一格看得到）", { skip: HAVE ? false : NO }, () => {
  for (const [name, , Mm] of T_SRC) assert.ok(rd(Mm("07bh-blackhole.js")).includes('h.style.animation="bhxLd .4s ease-out 1.6s forwards"'), name);
});

test("快照跟工作區這輪改的段落一字不差（工作區另外多了下一版的滿版 FULLV，不在這些段落裡；暖機 WS 那段 11/18 第 36 輪又改過，不比）", { skip: T_SRC.length === 2 ? false : "沒有 1010 快照（只在這台電腦的暫存區）" }, () => {
  const [[, W, WM], [, K, KM]] = T_SRC, segs = [["  let CVQ=null;", "\n  const noise="], ["    let warmed=false;", "\n"], ["    {const Q=CVQ;CVQ=null;", "\n"], ["        const putD=", "\n"]];
  for (const [a, b] of segs) assert.equal(between(rd(W("park3d.js")), a, b), between(rd(K("park3d.js")), a, b), a);
  /* 11/18 掌門胸前門派字（figure 的 gch／gred、glyTex 第三個參數）之後 bot3d.js 整支不再跟快照一樣：只比緩衝區大小那段；排隊載入那段裡有 glyTex 的呼叫（這次加了參數），結構由上面「整段排隊」那項的關鍵句檢查 */
  assert.equal(between(rd(W("bot3d.js")), "    let shrink=1,bufW=0,bufH=0;const applySize=", "\n    const setScale="), between(rd(K("bot3d.js")), "    let shrink=1,bufW=0,bufH=0;const applySize=", "\n    const setScale="), "bot3d.js applySize");
  /* W31（11/21）：06-cpu.js 補上原生線已驗過的 3D 控制列停靠（pkDock／.pk-control-dock，Android P0「local-3d-board-controls-docked」）。
     快照（＝0133 的 06-cpu）之後只准多這一段：快照少掉的只能是被它改寫的 3 行，多出來的行都要屬於停靠這段 */
  const snapL = rd(KM("06-cpu.js")).split("\n"), curL = rd(WM("06-cpu.js")).split("\n"), curS = new Set(curL), snapS = new Set(snapL);
  const gone = snapL.filter(l => !curS.has(l)), added = curL.filter(l => !snapS.has(l));
  assert.ok(gone.length <= 3 && gone.every(l => /\.pk2d::before\{|let b=host\.querySelector\("\.pk2d"\)|host\.append\(b\)\}$/.test(l)), "06-cpu.js 少了快照裡的行：" + gone.join(" ／ ").slice(0, 300));
  const DOCK = /dock|pkDock|controls\.|\.pk2d::before\{[^`]*\}$|^\s*\}+$|^\s*if\(on3\)\{$|const zoom=PARK|const next=host\.nextElementSibling|if\(!create\)return null|style\.position="relative";$/;
  assert.ok(added.length > 0 && added.length <= 30 && added.every(l => DOCK.test(l)), "06-cpu.js 多了停靠以外的行：" + added.filter(l => !DOCK.test(l)).join(" ／ ").slice(0, 300));
});
