/* 11/25 開發者 iPad 截圖（快速對局 3D 經典世界石桌）：「問題是看起來沒有平放在桌子上！」「會飄起來」「所有角度看起來都要是穩穩地放在桌子」，左半邊又疊到棋盤右上角。
   原因：香爐是一張往後仰的 2D 立牌（card，tilt .3），寬畫面、低角度、側面看，底部對不上桌面。
   改法（src/park3d.js）：跟茶杯一樣換成程式畫的 3D 青瓷三足小香爐（censer3d），三隻腳踩桌面、底下接觸陰影，位置挪到 (6.8,-3)。
   這支把香爐那段程式抽出來在 vm 裡真的跑一次（行為）。公開副本的測試在暫存資料夾跑、拿不到倉庫根目錄的 three.min.js，
   所以用一個只記形狀參數的極簡 THREE：每個零件照形狀（旋轉體、圓柱、圓環、球、圓片）和位置、旋轉、整組放大倍率，算出世界座標的外緣。
   立牌拿掉了用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const PARK = fs.readFileSync(path.join(ROOT, "xiangqi-lab/src/park3d.js"), "utf8").replace(/\r\n/g, "\n");
const TABLE_R = 8.2, BOARD_HALF_X = 5.56;   /* 桌緣半徑、棋盤木框外緣（park3d 註解與 11/15 修正的量測） */
const END = "smk:[x,top,z,i/4]})}}";

function fakeThree() {
  const v3 = () => { const p = { x: 0, y: 0, z: 0, set(a, b, c) { p.x = a; p.y = b; p.z = c; return p }, setScalar(s) { p.x = p.y = p.z = s; return p } }; return p };
  class Obj { constructor() { this.position = v3(); this.rotation = v3(); this.scale = v3().setScalar(1); this.children = []; this.name = "" } add(o) { this.children.push(o); o.parent = this } traverse(f) { f(this); for (const c of this.children) c.traverse(f) } }
  class Group extends Obj { }
  class Mesh extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true } }
  const geo = type => class { constructor(...a) { this.type = type; this.args = a } };
  return { Group, Mesh, Vector2: class { constructor(x, y) { this.x = x; this.y = y } },
    LatheGeometry: geo("Lathe"), TorusGeometry: geo("Torus"), CircleGeometry: geo("Circle"), CylinderGeometry: geo("Cylinder"), SphereGeometry: geo("Sphere"),
    MeshStandardMaterial: class { constructor(o) { Object.assign(this, o) } }, MeshBasicMaterial: class { constructor(o) { Object.assign(this, o) } },
    Sprite: class extends Obj { }, SpriteMaterial: class { constructor(o) { Object.assign(this, o) } }, DoubleSide: 2 };
}

/* 零件在整組裡的外緣：回傳 [水平方向離零件中心最遠, y 最低, y 最高]（都在零件自己的座標，再加上位置） */
function partExtent(m) {
  const g = m.geometry, a = g.args, p = m.position, r = m.rotation;
  const flat = Math.abs(Math.abs(r.x) - Math.PI / 2) < 1e-6, upright = Math.abs(Math.abs(r.y) - Math.PI / 2) < 1e-6;
  let horiz, y0, y1;
  if (g.type === "Lathe") { horiz = Math.max(...a[0].map(v => v.x)); y0 = Math.min(...a[0].map(v => v.y)); y1 = Math.max(...a[0].map(v => v.y)) }
  else if (g.type === "Cylinder") { horiz = Math.max(a[0], a[1]); y0 = -a[2] / 2; y1 = a[2] / 2 }
  else if (g.type === "Sphere") { horiz = a[0]; y0 = -a[0]; y1 = a[0] }
  else if (g.type === "Circle") { assert.ok(flat, "圓片要平放"); horiz = a[0]; y0 = y1 = 0 }
  else if (g.type === "Torus") { const R = a[0] + a[1]; if (flat) { horiz = R; y0 = -a[1]; y1 = a[1] } else { assert.ok(upright, "直立圓環轉 90 度"); horiz = R; y0 = -R; y1 = R } }
  else throw new Error("沒處理的形狀 " + g.type);
  return { cx: p.x, cz: p.z, horiz, y0: p.y + y0, y1: p.y + y1 };
}

function build() {
  const a = PARK.indexOf("        {const x=6.8,z=-3,"), b = PARK.indexOf(END, a);
  assert.ok(a > 0 && b > a, "抓得到 3D 香爐那段");
  const c = { console, Math, blobs: [], X: { bills: [] }, PI: Math.PI, TAU: Math.PI * 2 };
  c.T = fakeThree(); c.root = new c.T.Group();
  c.blob = (x, y, z, rx, rz, op) => c.blobs.push({ x, y, z, rx, rz, op });
  c.radial = () => null;
  vm.createContext(c); vm.runInContext(PARK.slice(a, b + END.length), c);
  const g = c.root.children.find(o => o.name === "censer3d");
  assert.ok(g, "建出 censer3d");
  const S = g.scale.x, parts = []; g.traverse(o => { if (o.isMesh) parts.push(o) });
  /* 世界座標：整組在 (g.position)、放大 S 倍 */
  const W = parts.map(m => { const e = partExtent(m); return { m, cx: g.position.x + e.cx * S, cz: g.position.z + e.cz * S, horiz: e.horiz * S, y0: g.position.y + e.y0 * S, y1: g.position.y + e.y1 * S } });
  return { c, g, parts, W };
}

test("香爐是立體的：有爐身、三隻腳、兩耳、香，不是一張立牌", () => {
  const { parts } = build();
  assert.ok(parts.some(m => m.geometry.type === "Lathe"), "爐身是旋轉體");
  const legs = parts.filter(m => m.geometry.type === "Cylinder" && m.geometry.args[2] < .2);
  assert.equal(legs.length, 3, "三隻腳");
  const ang = legs.map(m => Math.atan2(m.position.z, m.position.x)).sort((a, b) => a - b);
  for (let i = 0; i < 3; i++) { const d = ((ang[(i + 1) % 3] - ang[i]) + Math.PI * 4) % (Math.PI * 2); assert.ok(Math.abs(d - Math.PI * 2 / 3) < 1e-6, "三隻腳平均分開") }
  assert.equal(parts.filter(m => m.geometry.type === "Torus").length, 3, "口沿一圈＋兩耳");
});

test("穩穩放在桌面上：三隻腳的底剛好在桌面（y=0），沒有零件低於桌面", () => {
  const { g, W } = build();
  /* #180 審查（iMac Claude 1）：整組設 g.rotation.x=.5（傾倒）時，上面的外緣算法只看零件自己的旋轉，照樣會過 → 這裡直接要求整組不能前後、左右傾（繞直立軸轉不影響平放，不管） */
  assert.equal(g.rotation.x, 0, "整組不能前後傾"); assert.equal(g.rotation.z, 0, "整組不能左右傾");
  for (const w of W) if (w.m.geometry.type === "Cylinder" || w.m.geometry.type === "Lathe") { assert.equal(w.m.rotation.x, 0, "爐身、腳、香要直立"); assert.equal(w.m.rotation.z, 0, "爐身、腳、香要直立") }
  const low = Math.min(...W.map(w => w.y0));
  assert.ok(Math.abs(low) < 1e-6, "最低點 y=" + low);
  const legs = W.filter(w => w.m.geometry.type === "Cylinder" && w.m.geometry.args[2] < .2);
  for (const l of legs) assert.ok(Math.abs(l.y0) < 1e-6, "每隻腳都踩到桌面");
  const body = W.find(w => w.m.geometry.type === "Lathe");
  assert.ok(body.y0 > 0 && Math.abs(body.y0 - Math.max(...legs.map(l => l.y1))) < .06, "爐底坐在腳上（不懸空）：爐底 " + body.y0.toFixed(3));
  const top = Math.max(...W.map(w => w.y1));
  assert.ok(top > .8 && top < 1.4, "高度跟茶杯差不多：" + top.toFixed(2));
});

test("不超出桌緣、不疊到棋盤木框", () => {
  const { W } = build();
  const far = Math.max(...W.map(w => Math.hypot(w.cx, w.cz) + w.horiz));   /* 零件中心離桌心＋零件最寬的半徑：只會多算、不會少算 */
  assert.ok(far < TABLE_R - .05, "最遠離桌心 " + far.toFixed(2) + "，桌緣 " + TABLE_R);
  const left = Math.min(...W.map(w => w.cx - w.horiz));
  assert.ok(left > BOARD_HALF_X + .3, "最左 x=" + left.toFixed(2) + "，離木框外緣 " + BOARD_HALF_X + " 至少 0.3");
});

test("底下有接觸陰影、白煙從香頭往上飄", () => {
  const { c, W } = build();
  assert.equal(c.blobs.length, 1); const s = c.blobs[0];
  const body = W.find(w => w.m.geometry.type === "Lathe");
  assert.ok(s.y > 0 && s.y < .05, "陰影貼桌面"); assert.ok(s.rx >= body.horiz, "陰影蓋得住爐底");
  const top = Math.max(...W.map(w => w.y1)), smk = c.X.bills.filter(b => b.smk);
  assert.equal(smk.length, 4);
  for (const b of smk) assert.ok(Math.abs(b.smk[1] - top) < .1, "白煙起點 " + b.smk[1].toFixed(2) + " 在香頭 " + top.toFixed(2));
});

test("〔原始碼〕香爐不再用往後仰的 2D 立牌", () => {
  assert.doesNotMatch(PARK, /use\("censer",im=>\{const x=6\.35,z=-3\.6,c=card\(/);
  assert.match(PARK, /g\.name="censer3d"/);
});
