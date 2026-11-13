/* 太虛星尊三招魔法・3D 特效模組（11/13 試看版做好；11/14 接進 App：正本搬到 xiangqi-lab/src/bossfx3d.js，build-site 會複製到網站根目錄）
   App 只在黑洞巨盤要用到魔王時才載這支（m/07bhf-bossfx.js bhfxLoad），api 由 park3d 的 fxApi() 交出；試看頁 park/boss/fx/preview3d.html 也改載這一份（/lab/bossfx3d.js）。
   11/14 新增的 api（都選填，舊的試看頁不給也照舊）：
     bossAt()      每一格魔王要站的世界座標（App＝黑將那顆棋子的位置往黑方底線退一點）；回傳 null＝這一格不顯示魔王（例如還沒畫出黑將）
     bossTurn()    魔王整體再轉多少（弧度；翻盤時 π）
     caoBase       草書招名圖的資料夾（預設跟 base 一樣）
     poke(ms)      特效播放中每一格叫一次，請 park3d 不要進省電慢速（App＝park3d pwPoke）
     bossScale()   魔王整體縮放 {x,y,z}（App＝黑將那顆棋子的縮放：序局將死時跟著消融）
   play(k, o, {cao:false}) 跳過草書招名（設定「戰鬥演出：簡化」） */
/* 以下是 11/13 試看版原本的說明：
   流程照 2D 試看頁（preview_tpl.html）：施法（浮起、前傾、胸前玉牌發光、台詞泡泡）→ 草書招式名稱（寫出 1 秒、停 1 秒、化墨 0.5 秒）
   → 紫墨警告圈 → 玩家一回合可躲 → 魔法落下；第二階段範圍變大（由呼叫的人決定格子，模組只管畫）。

   用法：
     const fx = XQBossFx3D.create(api);  await fx.ready;
     await fx.play("meteor", {c, r, big, cells:[[c,r]…], kill:[[c,r]…]});
     await fx.play("lock",   {cells:[[c,r]…]});
     await fx.play("river",  {hit:[[c,r,"r"|"b"]…], big});
     fx.reset();  fx.dispose();
   api（App 接的時候由 park3d 提供；試看頁 preview3d.html 用 __PK 除錯掛勾湊出來）：
     T             three.js（預設 window.THREE）
     scene, camera park3d 的場景、鏡頭
     el            3D 畫面的容器（HTML 疊加層、投影座標都照它的大小）
     canvas        要震動的元素（預設 el 裡的 canvas）
     cell(c,r)     那一格的棋盤面世界座標（THREE.Vector3，y＝棋盤面；c、r 可以有小數）
     gs()          格距（黑洞巨盤 1.0～1.6）
     piece(c,r)    那一格棋子的 Object3D（化墨、變灰用），沒有就 null
     remove(list)  化墨退場播完，請 App 把這些格子 [[c,r]…] 的棋子拿掉（一次給齊，免得重排時棋子物件被換位置）
     glb(url)      載模型 → Promise<Object3D>（App 是 window.XQGLB）
     base          素材資料夾網址（cut/*.webp，結尾要有 /）
     bossGlb       魔王模型網址；bossYaw 模型轉向（弧度；b_taixu.glb 原檔正面朝 +x，要 −π/2 才面向紅方）；bossCell [c,r]（預設 [4,0] 黑方將位）；
                   bossOff [dc,dr] 站位微調（預設 [0,-.45]＝往黑方底線退 .45 格）；bossH 魔王高度（預設 3.9＝七星 1.55 的 2.5 倍）
     fxParent      （選填）黑洞半透明星盤那片網格：特效掛在它底下，跟星盤同一次畫（不然會被星盤蓋暗，說明在 fxRoot）
     dbg           （選填）true＝特效放大 1.6 倍、主控台印每個特效的世界座標與大小
     mirrorGroup   （選填）park3d 盤底倒影的鏡像群組 MG；有給就要在每一次畫之前呼叫 fx.pass("main"|"mirror"|"board")，魔王和特效才會出現在倒影裡（說明在 pass）
     tip(text)     狀態文字（選填）
     playerTurn()  紫墨警告圈出現後等玩家走一步 → Promise（選填；沒給就等 1.6 秒，跟 2D 試看一樣）
   魔王掛在場景裡一個 userData.giant＝1 的群組下（park3d 黑洞模式每格會把沒標 giant 的東西藏起來）；兩盞點光源一開始就加好、平常亮度 0（中途加燈會讓全部材質重編譯而卡一下） */
(function(){
  "use strict";
  const PI = Math.PI, TAU = PI * 2;
  const EZ = {
    lin: p => p,
    out: p => 1 - Math.pow(1 - p, 3),
    in: p => p * p * p,
    io: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
    fall: p => Math.pow(p, 2.2)
  };
  const NAMES = {meteor: "隕星碎", lock: "虛空鎖", river: "星河震"};
  const LINES = {meteor: "星隕！", lock: "畫地為牢。", river: "退下！"};
  const IMGS = ["meteor", "burst", "shards", "ink_splash", "seal", "chain_ring", "chain_bar", "chain_break", "river", "wave", "ripple", "droplets"];
  const CSS = `
.bfx-ov{position:absolute;inset:0;pointer-events:none;z-index:30;overflow:hidden}
.bfx-num{position:absolute;left:0;top:0;font-weight:900;font-size:clamp(16px,3.6vw,24px);color:#ff4d6d;text-shadow:0 0 4px #fff,0 0 2px #fff;white-space:nowrap;font-family:"Noto Serif TC","PMingLiU",serif}
.bfx-num>span{display:block;transform:translate(-50%,-50%)}
.bfx-say{position:absolute;left:0;top:-8px;background:#1e1430ee;border:1px solid #a77bff;color:#f4eaff;padding:6px 12px;border-radius:12px;font-size:16px;white-space:nowrap;opacity:0;transform:translate(-50%,-100%);font-family:"Noto Serif TC","PMingLiU",serif}
.bfx-veil{position:absolute;inset:0;background:radial-gradient(ellipse at center,#fff8 0,#fff3 45%,#0000 75%);opacity:0}
.bfx-cao{position:absolute;left:50%;top:50%;height:min(72%,560px);transform:translate(-50%,-50%);opacity:0;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 10px #f2e6ffcc)}
.bfx-caoTxt{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);writing-mode:vertical-rl;font-size:clamp(56px,12vw,96px);font-weight:900;color:#1a0a24;letter-spacing:8px;opacity:0;text-shadow:0 0 6px #fff,0 0 14px #f2e6ff;font-family:"Noto Serif TC","PMingLiU",serif}`;

  function create(api){
    const T = api.T || window.THREE;
    if (!T) throw new Error("沒有 three.js");
    const sc = api.scene, cam = api.camera;
    const base = api.base || "cut/";
    const G = () => api.gs ? api.gs() : 1.3;
    const P = (c, r, dy) => { const v = api.cell(c, r).clone(); v.y += dy || 0; return v; };
    const tip = t => { try { if (api.tip) api.tip(t); } catch (e) {} };
    const now = () => performance.now();
    let dead = false, ph = 0;
    /* ph＝第幾輪；reset() 會把 ph 加一：之前排好的等待、補間都不再往下走（Promise 不 resolve，舊的招式就停在那裡被回收） */
    const sleep = ms => { const my = ph; return new Promise(r => setTimeout(() => { if (my === ph && !dead) r(); }, ms)); };
    /* 棋子被動到的大小、高度、顯示：先記下來，reset 時還原（棋子物件是 park3d 池子裡重用的） */
    const KEEP = new Map();
    const keep = g => { if (g && !KEEP.has(g)) KEEP.set(g, {s: g.scale.x, y: g.position.y, v: g.visible}); };
    const unkeep = g => KEEP.delete(g);

    /* ---------- 小小的補間動畫（自己的 requestAnimationFrame；park3d 照常每格重畫） ---------- */
    const TW = [], LOOPS = new Set(), LBL = new Set();
    let raf = 0;
    const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(step); };
    function tw(d, f, o){
      o = o || {};
      const e = typeof o.e === "function" ? o.e : (EZ[o.e] || EZ.lin);
      return new Promise(res => { TW.push({t0: now() + (o.delay || 0), d, f, e, res, ph}); kick(); });
    }
    function step(){
      raf = 0;
      const t = now();
      syncRoot();
      for (let i = 0; i < TW.length; i++) {
        const a = TW[i];
        if (a.ph !== ph) { TW.splice(i--, 1); continue; }
        if (t < a.t0) continue;
        const p = Math.min(1, (t - a.t0) / a.d);
        try { a.f(a.e(p), p); } catch (e) {}
        if (p >= 1) { TW.splice(i--, 1); a.res(); }
      }
      for (const f of LOOPS) { try { f(t); } catch (e) {} }
      follow();
      if (TW.length || LOOPS.size || LBL.size) { kick(); if (api.poke) { try { api.poke(400); } catch (e) {} } }
    }
    const loop = f => { LOOPS.add(f); kick(); return () => LOOPS.delete(f); };

    /* ---------- 材質、貼圖 ---------- */
    const srgb = t => { if (T.sRGBEncoding != null) t.encoding = T.sRGBEncoding; if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; return t; };
    const TX = {};
    const glowTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.22, "rgba(255,255,255,.6)"); g.addColorStop(.55, "rgba(255,255,255,.16)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      return srgb(new T.CanvasTexture(c));
    })();
    TX.glow = glowTex;
    /* 浪的左右兩端淡出（2D 版用 CSS mask；3D 用 alphaMap：只看綠色頻道） */
    const edgeTex = (() => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 4;
      const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, "#000"); g.addColorStop(.12, "#fff"); g.addColorStop(.88, "#fff"); g.addColorStop(1, "#000");
      x.fillStyle = g; x.fillRect(0, 0, 256, 4);
      return new T.CanvasTexture(c);
    })();
    const asp = n => { const im = TX[n] && TX[n].image; return im && im.width ? im.height / im.width : 1; };
    const TL = new T.TextureLoader();
    const loadTex = n => new Promise(res => TL.load(base + n + ".webp", t => { srgb(t); t.anisotropy = 8; TX[n] = t; res(t); }, undefined, () => res(null)));
    const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

    const root = new T.Group(); root.name = "bossFx"; root.userData.giant = 1; sc.add(root);
    /* 特效層 fxRoot：
       park3d 黑洞模式一格畫三次：① 主畫面（這時半透明星盤藏起來）② 盤底鏡像 ③ 只畫 55% 不透明的星盤，蓋在前兩次上面。
       特效如果在 ① 畫，就會被 ③ 的星盤蓋掉一半（暗紫的墨、紫光幾乎看不見，11/13 試看第一版就是這樣）。
       所以 api.fxParent 給星盤那片網格時，特效掛在它底下（矩陣設成它的反矩陣＝等於直接在世界座標），跟著星盤在 ③ 才畫、畫在星盤上面；
       深度照 ① 留下來的，被棋子擋到的地方照樣被擋。魔王本身是實心模型，留在 ① 畫（root） */
    let fxRoot = root;
    if (api.fxParent) { fxRoot = new T.Group(); fxRoot.name = "bossFxOver"; fxRoot.userData.giant = 1; fxRoot.matrixAutoUpdate = false; api.fxParent.add(fxRoot); }
    const syncRoot = () => {
      if (fxRoot === root || !fxRoot.parent) return;
      fxRoot.parent.updateWorldMatrix(true, false);
      fxRoot.matrix.copy(fxRoot.parent.matrixWorld).invert();
      fxRoot.matrixWorldNeedsUpdate = true;
    };
    syncRoot();
    /* ?dbg=1：特效放大 1.6 倍，主控台印出每個特效的世界座標、大小 */
    const DBG = !!api.dbg, KD = DBG ? 1.6 : 1;
    const dbgLog = (n, o) => {
      if (!DBG) return;
      setTimeout(() => {
        if (!o.parent) return;
        const p = o.getWorldPosition(new T.Vector3());
        console.log(`[bossFx] ${n}${o.isSprite ? "（sprite）" : "（貼地）"} 世界座標 (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) 大小 ${o.scale.x.toFixed(2)}×${o.scale.y.toFixed(2)} 不透明度 ${o.material.opacity.toFixed(2)} 格距 ${G().toFixed(2)} 倒影：${api.mirrorGroup ? (o.isSprite ? "有（上下顛倒的複本材質）" : "有（跟特效層一起鏡像）") : "沒有（找不到倒影圖層）"}`);
      }, 0);
    };
    const PLANE = new T.PlaneGeometry(1, 1);
    const WAVEG = new T.PlaneGeometry(1, 1); WAVEG.translate(0, .5, 0);
    /* 美術圖是水墨＋紫光畫在透明底上：一般混合才留得住墨色（additive 會把深色墨吃掉），只有本身就是光的 burst 用 additive；發光感另外靠程式畫的光暈 sprite 和點光源 */
    function spr(n, w, o){
      o = o || {};
      const m = new T.SpriteMaterial({map: TX[n] || glowTex, color: o.col != null ? new T.Color(o.col) : new T.Color(0xffffff), transparent: true, opacity: o.op == null ? 1 : o.op,
        depthWrite: false, depthTest: o.dt !== false, fog: false, toneMapped: false, blending: o.add ? T.AdditiveBlending : T.NormalBlending});
      const s = new T.Sprite(m);
      if (!o.raw) w *= KD;
      s.userData.w = w; s.userData.h = w * asp(n);
      s.scale.set(s.userData.w, s.userData.h, 1);
      s.renderOrder = o.ro || 12;
      syncRoot();
      (o.parent || fxRoot).add(s);
      dbgLog(n, s);
      return s;
    }
    const setS = (s, k, ky) => s.scale.set(s.userData.w * k, s.userData.h * (ky == null ? k : ky), 1);
    function decal(n, w, h, o){
      o = o || {};
      const m = new T.MeshBasicMaterial({map: TX[n] || glowTex, color: o.col != null ? new T.Color(o.col) : new T.Color(0xffffff), transparent: true, opacity: o.op == null ? 1 : o.op,
        depthWrite: false, fog: false, toneMapped: false, side: T.DoubleSide, blending: o.add ? T.AdditiveBlending : T.NormalBlending,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4});
      const me = new T.Mesh(o.geo || PLANE, m);
      me.rotation.set(-PI / 2, 0, 0);
      if (!o.raw) { w *= KD; if (h != null) h *= KD; }
      me.userData.w = w; me.userData.h = h == null ? w * asp(n) : h;
      me.scale.set(me.userData.w, me.userData.h, 1);
      me.renderOrder = o.ro || 6;
      syncRoot();
      fxRoot.add(me);
      dbgLog(n, me);
      return me;
    }
    const setD = (d, k) => d.scale.set(d.userData.w * k, d.userData.h * k, 1);
    const kill = o => {
      if (!o) return;
      if (o.parent) o.parent.remove(o);
      const mm = o.userData && o.userData.mm;
      if (mm) { if (o.material === mm) o.material = mm.userData.src; mm.dispose(); o.userData.mm = null; }
      if (o.material) o.material.dispose();
    };

    /* 兩盞點光源：玉牌光、命中閃光（常駐、平常亮度 0） */
    const gemL = new T.PointLight(0xB77DFF, 0, 9, 1.6); gemL.userData.giant = 1; sc.add(gemL);
    const hitL = new T.PointLight(0xD8B8FF, 0, 14, 1.6); hitL.userData.giant = 1; sc.add(hitL);

    /* ---------- HTML 疊加層：草書招式名、台詞泡泡、飄字 ---------- */
    if (!document.getElementById("bfxCss")) { const s = document.createElement("style"); s.id = "bfxCss"; s.textContent = CSS; document.head.append(s); }
    const ov = document.createElement("div"); ov.className = "bfx-ov";
    const veil = document.createElement("div"); veil.className = "bfx-veil";
    const cao = document.createElement("img"); cao.className = "bfx-cao"; cao.alt = "";
    const caoTxt = document.createElement("div"); caoTxt.className = "bfx-caoTxt";
    const sayA = document.createElement("div"); sayA.style.cssText = "position:absolute;left:0;top:0";
    const sayEl = document.createElement("div"); sayEl.className = "bfx-say"; sayA.append(sayEl);
    ov.append(veil, sayA, cao, caoTxt);
    if (getComputedStyle(api.el).position === "static") api.el.style.position = "relative";
    api.el.append(ov);
    const V3 = new T.Vector3();
    function proj(v){
      V3.copy(v).project(cam);
      const w = api.el.clientWidth, h = api.el.clientHeight;
      return {x: (V3.x + 1) / 2 * w, y: (1 - V3.y) / 2 * h, ok: V3.z < 1 && V3.z > -1};
    }
    function follow(){
      for (const L of LBL) {
        const wp = typeof L.wp === "function" ? L.wp() : L.wp, q = proj(wp);
        L.el.style.transform = `translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px)`;
        L.el.style.visibility = q.ok ? "" : "hidden";
      }
    }
    function num(wp, txt){
      const d = document.createElement("div"); d.className = "bfx-num";
      const s = document.createElement("span"); s.textContent = txt; d.append(s); ov.append(d);
      const L = {el: d, wp: wp.clone()}; LBL.add(L); follow(); kick();
      s.animate([{transform: "translate(-50%,-50%)", opacity: 1}, {transform: "translate(-50%,-160%)", opacity: 0}], {duration: 1100, easing: "ease-out", fill: "forwards"})
        .finished.then(() => { LBL.delete(L); d.remove(); }).catch(() => { LBL.delete(L); d.remove(); });
    }
    function shake(px){
      const c = api.canvas || api.el.querySelector("canvas");
      if (!c || !c.animate) return;
      c.animate([0, 1, 2, 3, 4, 5, 6].map(i => ({transform: `translate(${i % 2 ? px : -px}px,${i % 3 ? 2 : -2}px)`})).concat([{transform: "none"}]), {duration: 420});
    }

    /* ---------- 棋子的材質：化墨（變黑、變透明）、鎖住（變灰）。每顆棋子換成自己的複本，播完換回原本的（同種棋子共用材質，不能直接改） ---------- */
    const SWAP = new Map();
    const LIT = m => m && (m.isMeshStandardMaterial || m.isMeshBasicMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial);
    function swap(g){
      if (SWAP.has(g)) return SWAP.get(g);
      const L = [], mats = [], U = {g: {value: 0}, k: {value: 0}};
      g.traverse(o => {
        if (!o.isMesh || !o.material) return;
        const old = o.material, arr = Array.isArray(old) ? old : [old];
        const nw = arr.map(x => {
          const c = x.clone();
          c.userData.o0 = c.opacity;
          if (LIT(c)) {
            c.onBeforeCompile = sh => {
              sh.uniforms.uGray = U.g; sh.uniforms.uInk = U.k;
              sh.fragmentShader = "uniform float uGray;\nuniform float uInk;\n" + sh.fragmentShader
                .replace("#include <map_fragment>", "#include <map_fragment>\n{float l=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(l*.72),uGray);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.05,.03,.08),uInk);}")
                .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance*=(1.-uInk)*(1.-.7*uGray);");
            };
            c.customProgramCacheKey = () => "bfxInkGray";
          }
          mats.push(c);
          return c;
        });
        o.material = Array.isArray(old) ? nw : nw[0];
        L.push([o, old]);
      });
      const S = {U, mats, restore(){ for (const [o, old] of L) o.material = old; for (const m of mats) m.dispose(); SWAP.delete(g); }};
      SWAP.set(g, S);
      return S;
    }
    const fade = (S, a) => { for (const m of S.mats) { m.transparent = true; m.opacity = (m.userData.o0 == null ? 1 : m.userData.o0) * a; } };

    /* ---------- 魔王：b_taixu.glb（靜態、沒骨架），站在黑方將位，約七星的 2.5 倍高 ---------- */
    let boss = null, pivot = null, gem = null, gemCore = null, aura = null, bossH = api.bossH || 3.9;
    async function loadBoss(){
      if (!api.bossGlb || !api.glb) return;
      const s = await api.glb(api.bossGlb).catch(() => null);
      if (!s || dead) return;
      const m = s.clone(true);
      m.rotation.y = api.bossYaw || 0;
      m.updateMatrixWorld(true);
      /* Tripo 原檔是金屬度 1＋金屬粗糙貼圖：黑洞沒有環境貼圖，金屬會整片發黑；照 tools/tripo_slim.py 瘦身後星樞棋兵的設定（不金屬、粗糙 .75） */
      m.traverse(o => {
        if (!o.isMesh) return;
        const arr = (Array.isArray(o.material) ? o.material : [o.material]).map(x => {
          const c = x.clone();
          if ("metalness" in c) { c.metalness = 0; c.metalnessMap = null; c.roughness = .75; c.roughnessMap = null; }
          return c;
        });
        o.material = Array.isArray(o.material) ? arr : arr[0];
        o.castShadow = true; o.receiveShadow = false;
      });
      const bx = new T.Box3().setFromObject(m), sz = bx.getSize(new T.Vector3()), ctr = bx.getCenter(new T.Vector3());
      /* 腳底中心（離地 6% 以下的頂點平均）：身後有一圈大光環，用外框中心會讓魔王往前站；胸前玉牌＝離地 25%～50%、左右置中、最往前的那一層頂點 */
      const V = new T.Vector3(), cand = [];
      let fx = 0, fz = 0, fn = 0, zmax = -1e9;
      m.traverse(o => {
        if (!o.isMesh) return;
        const A = o.geometry.attributes.position;
        for (let i = 0; i < A.count; i++) {
          V.fromBufferAttribute(A, i).applyMatrix4(o.matrixWorld);
          const fy = (V.y - bx.min.y) / sz.y;
          if (fy < .06) { fx += V.x; fz += V.z; fn++; }
          if (fy < .25 || fy > .5 || Math.abs(V.x - ctr.x) > sz.x * .12) continue;
          cand.push(V.x, V.y, V.z);
          if (V.z > zmax) zmax = V.z;
        }
      });
      const cx = fn ? fx / fn : ctr.x, cz = fn ? fz / fn : ctr.z;
      let gx = ctr.x, gy = bx.min.y + sz.y * .37, gz = bx.max.z, n = 0, sx = 0, sy = 0;
      for (let i = 0; i < cand.length; i += 3) if (cand[i + 2] > zmax - sz.z * .04) { sx += cand[i]; sy += cand[i + 1]; n++; }
      if (n) { gx = sx / n; gy = sy / n; gz = zmax; }
      const k = bossH / sz.y;
      m.position.set(-cx, -bx.min.y, -cz);
      const inner = new T.Group(); inner.scale.setScalar(k); inner.add(m);
      pivot = new T.Group(); pivot.add(inner);
      boss = new T.Group(); boss.name = "taixu"; boss.add(pivot);
      /* 站位：將位，再往後退一點（bossOff，單位＝格；預設往黑方底線退 .45 格），前排棋子比較不會擋到 */
      const bc = api.bossCell || [4, 0], bo = api.bossOff || [0, -.45];
      boss.position.copy(P(bc[0] + bo[0], bc[1] + bo[1], 0));
      root.add(boss);
      place();
      GP.set((gx - cx) * k, (gy - bx.min.y) * k, (gz - cz) * k + .08);
      /* 玉牌光暈放在特效層（星盤那一次才畫，不會被半透明星盤蓋暗），每一格照魔王身上那一點的世界座標擺 */
      gem = spr("glow", 1.25, {add: true, col: 0xB77DFF, op: 0, ro: 14, raw: true});
      gemCore = spr("glow", .42, {add: true, col: 0xF3DCFF, op: 0, ro: 15, raw: true});
      aura = decal("glow", 3.6, 3.6, {add: true, col: 0x8A4DFF, op: 0, ro: 5, raw: true});
      aura.position.copy(boss.position).y += .03;
      place();
      syncGem();
      if (DBG) console.log(`[bossFx] 魔王 高 ${bossH.toFixed(2)} 放大 ${k.toFixed(2)} 站位 (${boss.position.x.toFixed(2)}, ${boss.position.z.toFixed(2)}) 轉向 ${((api.bossYaw || 0) * 180 / PI).toFixed(0)}° 玉牌（魔王座標）(${GP.x.toFixed(2)}, ${GP.y.toFixed(2)}, ${GP.z.toFixed(2)})`);
    }
    /* ---------- 盤底倒影（開發者 11/13「記得魔王也要鏡像」）----------
       park3d 的倒影：第二次畫的時候把棋子暫時搬進鏡像群組 MG（y 上下翻、以 y＝.25 為鏡面），燈也照鏡像擺，畫完再搬回場景；
       第三次畫 55% 的星盤蓋在倒影上面，所以倒影的明暗、透明度是星盤給的。
       開發者 11/13 補充「招式也是，上面做什麼，下面就做什麼，反之亦然」：魔王和所有特效都照同一套進倒影。
       呼叫的人在每一次畫之前告訴模組這是哪一次（pass）：
         "mirror"＝第二次：魔王（含施法浮起、前傾的姿勢）、整個特效層 fxRoot（隕星、爆光、碎片、水珠、斷鏈、浪頭、鎖鏈圈、鎖鏈 X、警告圈、墨花、漣漪、星河光帶、玉牌光暈、腳下紫光）
                   都暫時搬進 MG（特效層的矩陣設成單位矩陣＝MG 裡的座標就是世界座標，MG 再上下翻），所以同一個物件、同一個時間、同一個姿勢；
                   面向鏡頭的 sprite 不會被負的縮放翻過來，倒影那一次換成「貼圖上下顛倒、旋轉角取負」的複本材質（亮度、顏色、旋轉每次照本體抄）；
         其他＝全部搬回原位。
       棋子的化墨、變灰、被浪頂一下改的是棋子本身（材質、位置），park3d 本來就把同一顆棋子畫進倒影，自動同步 */
    const MG = api.mirrorGroup || null;
    const FXHOME = fxRoot === root ? sc : api.fxParent;
    const FLIPPED = new Set(), FLIPTEX = new Map();
    const flipTex = t => {
      if (!t) return t;
      let f = FLIPTEX.get(t);
      if (!f) { f = t.clone(); f.repeat.set(1, -1); f.offset.set(0, 1); f.needsUpdate = true; FLIPTEX.set(t, f); }
      return f;
    };
    function flipOn(s){
      const m = s.material;
      let mm = s.userData.mm;
      if (!mm || mm.userData.src !== m) { if (mm) mm.dispose(); mm = m.clone(); mm.map = flipTex(m.map); mm.userData.src = m; s.userData.mm = mm; }
      mm.opacity = m.opacity; mm.color.copy(m.color); mm.rotation = -m.rotation; mm.blending = m.blending; mm.depthTest = m.depthTest;
      s.material = mm; FLIPPED.add(s);
    }
    let mirN = 0;
    function pass(kind){
      if (kind !== "mirror") place();
      if (!MG) return;
      if (kind === "mirror") {
        if (boss && fxRoot !== root && boss.parent !== MG) MG.add(boss);
        if (fxRoot.parent !== MG) MG.add(fxRoot);
        if (fxRoot !== root) fxRoot.matrix.identity();
        if (fxRoot === root) root.visible = true;
        fxRoot.matrixWorldNeedsUpdate = true;
        fxRoot.updateWorldMatrix(false, true);
        if (boss) boss.updateWorldMatrix(false, true);
        fxRoot.traverse(o => { if (o.isSprite && o.material) flipOn(o); });
        if (DBG && fxRoot.children.length !== mirN) { mirN = fxRoot.children.length; console.log(`[bossFx] 倒影這一格：魔王${boss && boss.parent === MG || (boss && fxRoot === root) ? "有" : "沒有"}、特效 ${fxRoot.children.length} 個（sprite 翻面 ${FLIPPED.size} 個）`); }
      } else {
        for (const s of FLIPPED) { const mm = s.userData.mm; if (mm && s.material === mm) s.material = mm.userData.src; }
        FLIPPED.clear();
        if (boss && fxRoot !== root && boss.parent !== root) root.add(boss);
        if (FXHOME && fxRoot.parent !== FXHOME) FXHOME.add(fxRoot);
        syncRoot();
        fxRoot.updateWorldMatrix(false, true);
        if (boss) boss.updateWorldMatrix(false, true);
      }
    }
    if (DBG) console.log(`[bossFx] 倒影圖層找到 ${!!MG}${MG ? "（魔王、特效都會進倒影）" : "（沒有倒影）"}；特效層掛在${fxRoot === root ? "場景（會被星盤蓋暗）" : "星盤底下"}`);
    const GP = new T.Vector3(), GW = new T.Vector3(), PV = new T.Vector3();
    /* 11/14 App：魔王每一格跟著黑將站（api.bossAt；回 null 就先藏起來），翻盤時整個轉過來（api.bossTurn）。沒給 bossAt（試看頁）＝站在 bossCell 不動 */
    function place(){
      if (!boss || !api.bossAt) return;
      let p = null;
      try { p = api.bossAt(PV); } catch (e) { p = null; }
      const on = !!p;
      boss.visible = on;
      if (aura) aura.visible = on;
      if (gem) { gem.visible = on; gemCore.visible = on; }
      if (!on) return;
      boss.position.copy(p);
      if (api.bossTurn) { try { boss.rotation.y = +api.bossTurn() || 0; } catch (e) {} }
      /* 11/14：跟著黑將的縮放（序局將死時 park3d 讓黑將從頭往下消融成茶霧，魔王一起消融；平常是 1） */
      if (api.bossScale) { let s = null; try { s = api.bossScale(); } catch (e) { s = null; } if (s) boss.scale.set(s.x || 1, s.y || 1, s.z || 1); else boss.scale.setScalar(1); }
      if (aura) { aura.position.copy(p); aura.position.y += .03; }
      syncGem();
    }
    const syncGem = () => {
      if (!gem || !pivot) return;
      pivot.updateWorldMatrix(true, false);
      GW.copy(GP).applyMatrix4(pivot.matrixWorld);
      gem.position.copy(GW); gemCore.position.copy(GW); gemL.position.copy(GW);
    };
    function bossTop(){ const v = boss ? boss.position.clone() : P(4, 0); v.y += (pivot ? pivot.position.y : 0) + bossH * 1.04; return v; }

    function say(t){
      sayEl.textContent = t;
      const L = {el: sayA, wp: bossTop}; LBL.add(L); kick();
      sayEl.animate([{opacity: 0}, {opacity: 1, offset: .15}, {opacity: 1, offset: .85}, {opacity: 0}], {duration: 2600}).finished
        .then(() => LBL.delete(L)).catch(() => LBL.delete(L));
    }

    /* 施法：浮起、前傾、放大一點、胸前玉牌發光（光暈＋點光源）、腳下紫光、畫面輕震 */
    async function cast(k){
      say(LINES[k] || "");
      shake(3);
      tw(900, (e, p) => {
        const a = p < .5 ? p / .5 : 1 - .15 * ((p - .5) / .5), s = p < .5 ? .6 + .65 * (p / .5) : 1.25 - .25 * ((p - .5) / .5);
        if (gem) { gem.material.opacity = a; setS(gem, s); gemCore.material.opacity = a; setS(gemCore, s); }
        if (aura) aura.material.opacity = .55 * Math.min(1, p * 2);
        gemL.intensity = 2.6 * a; syncGem();
      });
      if (!pivot) return sleep(600);
      await tw(600, e => { pivot.position.y = bossH * .1 * e; pivot.scale.setScalar(1 + .08 * e); pivot.rotation.x = .14 * e; syncGem(); }, {e: "out"});
      /* 施法中玉牌微微脈動 */
      const t0 = now();
      castLoop = loop(t => { const q = .85 + .15 * Math.sin((t - t0) / 260); if (gem) { gem.material.opacity = q; gemCore.material.opacity = q; } gemL.intensity = 2.2 * q; syncGem(); });
    }
    let castLoop = null;
    async function uncast(){
      if (castLoop) { castLoop(); castLoop = null; }
      const a0 = gem ? gem.material.opacity : 0, l0 = gemL.intensity, u0 = aura ? aura.material.opacity : 0;
      tw(500, e => { if (gem) { gem.material.opacity = a0 * (1 - e); gemCore.material.opacity = a0 * (1 - e); } if (aura) aura.material.opacity = u0 * (1 - e); gemL.intensity = l0 * (1 - e); });
      if (!pivot) return sleep(500);
      const y0 = pivot.position.y, s0 = pivot.scale.x, r0 = pivot.rotation.x;
      await tw(500, e => { const q = 1 - e; pivot.position.y = y0 * q; pivot.scale.setScalar(1 + (s0 - 1) * q); pivot.rotation.x = r0 * q; syncGem(); }, {e: "in"});
    }

    /* 草書招式名稱（HTML，跟 2D 一樣）：毛筆由上往下寫出 1 秒 → 停 1 秒 → 化墨散開 0.5 秒 */
    async function calli(k){
      const hasImg = !!CAOIMG[k], el = hasImg ? cao : caoTxt;
      if (hasImg) cao.src = CAOIMG[k].src; else caoTxt.textContent = NAMES[k];
      veil.animate([{opacity: 0}, {opacity: 1, offset: .15}, {opacity: 1, offset: .8}, {opacity: 0}], {duration: 2500});
      el.style.opacity = 1;
      el.style.webkitMaskImage = el.style.maskImage = "linear-gradient(to bottom,#000 0%,#000 45%,transparent 55%,transparent 100%)";
      el.style.webkitMaskSize = el.style.maskSize = "100% 220%";
      await el.animate([{maskPosition: "0 100%", webkitMaskPosition: "0 100%"}, {maskPosition: "0 0%", webkitMaskPosition: "0 0%"}], {duration: 1000, easing: "cubic-bezier(.4,.1,.6,1)", fill: "forwards"}).finished.catch(() => {});
      el.style.webkitMaskImage = el.style.maskImage = "none";
      await sleep(1000);
      await el.animate([{opacity: 1, filter: getComputedStyle(el).filter, transform: "translate(-50%,-50%) scale(1)"}, {opacity: 0, filter: "blur(10px)", transform: "translate(-50%,-50%) scale(1.15)"}], {duration: 500, easing: "ease-in"}).finished.catch(() => {});
      el.style.opacity = 0;
      el.getAnimations().forEach(a => a.cancel());
    }

    /* 紫墨警告圈（seal 平貼棋盤、慢慢轉）；w＝直徑幾格 */
    function warn(cells, w){
      const L = cells.map(([c, r]) => { const d = decal("seal", w * G()); d.position.copy(P(c, r, .03)); d.material.opacity = 0; return d; });
      const t0 = now();
      const stop = loop(t => {
        const q = ((t - t0) % 2400) / 2400, f = Math.min(1, (t - t0) / 300), b = Math.sin(q * PI);
        for (const d of L) { d.rotation.z = -q * TAU; setD(d, .92 + .12 * b); d.material.opacity = f * (.75 + .25 * b); }
      });
      return {L, off(){ stop(); L.forEach(kill); }};
    }
    /* ?dbg=1 的時間軸：每一段從按下招式算起幾秒（跟 2D 版對照：施法 0.6＋草書 2.5＋玩家回合 1.6＋魔法） */
    let PT0 = 0;
    const mark = s => { if (DBG) console.log(`[bossFx] 時間軸 +${((now() - PT0) / 1000).toFixed(2)}s ${s}`); };
    async function turn(){
      mark("紫墨警告圈出現，玩家回合（停 1.6 秒）");
      if (api.playerTurn) { await api.playerTurn(); mark("玩家回合結束"); return; }
      tip("紫墨警告圈出現了——你有一回合可以躲（試看版直接跳過）");
      await sleep(1600);
      tip("星尊的回合");
      mark("玩家回合結束");
    }

    /* 棋子化墨退場：變黑、變透明、放大一點、往上飄一點，冒一團墨（不拿掉，呼叫的人最後一次 remove） */
    async function inkOut(h){
      const g = h.g; keep(g);
      const S = swap(g), s0 = g.scale.x, y0 = g.position.y;
      for (const m of S.mats) { m.transparent = true; m.depthWrite = false; }
      const puff = spr("ink_splash", 1.3 * G(), {op: 0});
      puff.position.copy(g.position); puff.position.y += .8;
      tw(800, (e, p) => { setS(puff, .6 + .9 * e); puff.material.opacity = .8 * Math.sin(p * PI); puff.position.y = y0 + .8 + .6 * e; }, {e: "out"}).then(() => kill(puff));
      await tw(600, e => { S.U.k.value = Math.min(1, e * 1.7); fade(S, 1 - e); g.scale.setScalar(s0 * (1 + .25 * e)); g.position.y = y0 + .15 * e; });
      /* 藏起來、大小高度材質都還原，等呼叫的人 remove 把它收回池子（下次重用時 park3d 會再打開 visible） */
      g.visible = false;
      g.scale.setScalar(s0); g.position.y = y0;
      S.restore(); unkeep(g);
    }

    /* ── 隕星碎：o={c,r 目標格, big 第二階段, cells 範圍, kill 要化墨的格子} ── */
    async function meteor(o){
      const big = o.big ? 2.2 : 1, g = G();
      const ws = o.big ? warn([[o.c, o.r]], 3.24) : warn(o.cells || [[o.c, o.r]], 1.71);
      await turn();
      const tgt = P(o.c, o.r, 0);
      const from = tgt.clone().add(new T.Vector3(3.2 * g, 9.5, -4.2 * g)), to = tgt.clone().add(new T.Vector3(0, .55 * big, 0));
      const m = spr("meteor", 2.3 * g * big, {ro: 13});
      const halo = spr("glow", 2.2 * big, {add: true, col: 0xB98CFF, op: .9, ro: 12});
      const ghosts = [0, 1, 2, 3, 4].map(i => spr("glow", (1.5 - i * .2) * big, {add: true, col: 0x9C6BFF, op: 0, ro: 11}));
      /* 隕星圖的飛行方向（石頭在左下、尾巴往右上）＝螢幕上往左下 135°；照實際飛的方向轉圖 */
      const A0 = Math.atan2(-285, -280);
      const at = p => from.clone().lerp(to, p);
      hitL.position.copy(from); hitL.color.set(0xD8B8FF);
      await tw(480, e => {
        const p = at(e); m.position.copy(p); halo.position.copy(p);
        ghosts.forEach((s, i) => { const q = Math.max(0, e - (i + 1) * .045); s.position.copy(at(q)); s.material.opacity = e > .02 ? .5 * (1 - i / 5) : 0; });
        setS(m, 1.3 - .45 * e);
        const a = proj(from), b = proj(to);
        m.material.rotation = Math.atan2(-(b.y - a.y), b.x - a.x) - A0;
        hitL.position.copy(p); hitL.intensity = 1.5 * e;
      }, {e: "fall"});
      kill(m); kill(halo); ghosts.forEach(kill); ws.off();
      const b = spr("burst", 2.4 * g * big, {add: true, ro: 14}), s = spr("shards", 2.3 * g * big, {ro: 13});
      const ink = decal("ink_splash", 1.55 * g * big);
      const ring = decal("glow", 1, 1, {add: true, col: 0xA070FF, op: .9, ro: 7});
      b.position.copy(tgt); b.position.y += .8; s.position.copy(tgt); s.position.y += .9;
      ink.position.copy(tgt); ink.position.y += .035; ink.material.opacity = 0;
      ring.position.copy(tgt); ring.position.y += .04;
      tw(450, e => { setS(b, .2 + 1.3 * e); b.material.opacity = 1 - e; }, {e: "out"}).then(() => kill(b));
      tw(700, e => { setS(s, .3 + 1.1 * e); s.material.opacity = 1 - e; s.position.y = tgt.y + .9 + .5 * e; }, {e: "out"}).then(() => kill(s));
      tw(250, e => { setD(ink, .5 + .5 * e); ink.material.opacity = .92 * e; }, {e: "out"});
      tw(550, e => { const k = (.4 + 3.6 * e) * g * big; ring.scale.set(k, k, 1); ring.material.opacity = .9 * (1 - e); }, {e: "out"}).then(() => kill(ring));
      hitL.position.copy(tgt); hitL.position.y += 1;
      tw(650, e => { hitL.intensity = 4.5 * (1 - e); }, {e: "out"});
      shake(o.big ? 10 : 6);
      mark("隕星落地");
      const hit0 = (o.kill || []).map(([c, r]) => ({c, r, g: api.piece(c, r)}));
      if (DBG) console.log("[bossFx] 化墨目標", hit0.map(h => `(${h.c},${h.r})${h.g ? "找到棋子 " + h.g.userData.p : "找不到棋子"}`).join("、") || "（沒有）");
      const hit = hit0.filter(x => x.g);
      hit.forEach(h => num(P(h.c, h.r, 1.35), "化墨"));
      await Promise.all(hit.map(inkOut));
      mark("化墨動畫播完，請 App 拿掉棋子");
      if (hit.length && api.remove) {
        try { api.remove(hit.map(h => [h.c, h.r])); } catch (e) { console.error("[bossFx] remove 失敗", e); }
        if (DBG) console.log("[bossFx] remove 之後那幾格", hit.map(h => { const g = api.piece(h.c, h.r); return `(${h.c},${h.r})${g ? (g.visible ? "還有看得見的棋子！" : "還有棋子但藏著") : "已經沒有棋子"}`; }).join("、"));
      }
      await sleep(900);
      await tw(700, e => { ink.material.opacity = .92 * (1 - e); });
      kill(ink);
    }

    /* ── 虛空鎖：o={cells 要鎖的格子}；鎖鏈圈套在腰上（水平、略傾斜），兩條鎖鏈在棋子前交叉成 X（面向鏡頭），棋子變灰 ── */
    async function lock(o){
      const cells = o.cells || [];
      if (!cells.length) return;
      const ws = warn(cells, 1.71);
      await turn();
      ws.off();
      const parts = [], locked = [], g = G();
      await Promise.all(cells.map(async ([c, r], i) => {
        await sleep(i * 150);
        const pc = api.piece(c, r), b0 = P(c, r, 0);
        const ring = decal("chain_ring", 1.35 * g, null, {ro: 9});
        ring.material.opacity = 0;
        const yW = b0.y + .62, tilt = .16;
        parts.push(ring);
        tw(520, (e, p) => {
          const k = p < .75 ? 2.2 + (.9 - 2.2) * EZ.out(p / .75) : .9 + .1 * ((p - .75) / .25);
          setD(ring, k); ring.rotation.set(-PI / 2 + tilt * Math.min(1, p / .75), 0, (-40 * PI / 180) * (1 - Math.min(1, p / .75)));
          ring.position.set(b0.x, yW + 1.4 * (1 - Math.min(1, p / .75)), b0.z);
          ring.material.opacity = Math.min(1, p / .75);
        });
        await sleep(260);
        /* 兩條鎖鏈：放在棋子前面一點（往鏡頭方向），面向鏡頭 */
        const mid = b0.clone(); mid.y += .78;
        const toCam = cam.position.clone().sub(mid).normalize().multiplyScalar(.45);
        const b1 = spr("chain_bar", 1.6 * g, {ro: 13}), b2 = spr("chain_bar", 1.6 * g, {ro: 13});
        for (const [b, a] of [[b1, PI / 4], [b2, -PI / 4]]) { b.position.copy(mid).add(toCam); b.material.rotation = a; setS(b, .001, 1); parts.push(b); }
        tw(260, e => setS(b1, Math.max(.001, e), 1), {e: "out"});
        await tw(260, e => setS(b2, Math.max(.001, e), 1), {e: "out"});
        if (pc) { const S = swap(pc); locked.push(S); tw(260, e => { S.U.g.value = e; }); }
        num(P(c, r, 1.35), "鎖住一回合");
      }));
      shake(4);
      const t0 = now();
      const spin = loop(t => { for (const p of parts) if (p.isMesh) p.rotation.z = ((t - t0) / 4000) * TAU; });
      tip("被鎖的棋子下回合不能動");
      await sleep(1800);
      tip("下一回合：鎖鏈斷開");
      spin();
      parts.forEach(e => { const a0 = e.material.opacity; tw(250, q => { e.material.opacity = a0 * (1 - q); }).then(() => kill(e)); });
      locked.forEach(S => { tw(250, e => { S.U.g.value = 1 - e; }).then(() => S.restore()); });
      cells.forEach(([c, r]) => {
        const k = spr("chain_break", 1.8 * g, {ro: 14});
        k.position.copy(P(c, r, .8));
        tw(650, e => { setS(k, .6 + .8 * e); k.material.opacity = 1 - e; }, {e: "out"}).then(() => kill(k));
      });
      await sleep(700);
    }

    /* ── 星河震：o={hit:[[c,r,side]…] 河界上的棋子, big 第二階段} ──
       河界整條亮起（river 平貼在河界）→ 玩家一回合 → 星河浪沿河界立起來、從河面升起再落下；河界上的棋子被浪頂一下＋漣漪＋水珠 */
    async function river(o){
      const g = G(), mid = P(4, 4.5, .025);
      const band = decal("river", 9.35 * g, 1.6 * g, {op: 0, ro: 6});
      band.position.copy(mid);
      hitL.color.set(0xA97CFF); hitL.position.copy(mid); hitL.position.y += .7;
      const t0 = now();
      const pulse = loop(t => {
        const q = .5 - .5 * Math.cos(((t - t0) % 1200) / 1200 * TAU), f = Math.min(1, (t - t0) / 400);
        band.material.opacity = .8 * f; band.material.color.setScalar(1 + .35 * q); hitL.intensity = f * (1 + .6 * q);
      });
      tip("整條河界亮起：別停在河界上");
      await turn();
      const w = 9 * g, h = w * asp("wave") * .78;
      const wm = new T.MeshBasicMaterial({map: TX.wave, alphaMap: edgeTex, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, side: T.DoubleSide});
      const wave = new T.Mesh(WAVEG, wm); wave.renderOrder = 10;
      wave.position.set(mid.x, mid.y - .02, mid.z); wave.scale.set(w, .001, 1);
      root.add(wave);
      shake(9);
      await tw(650, (e, p) => {
        const k = p < .55 ? 1.05 * EZ.out(p / .55) : 1.05 - .15 * ((p - .55) / .45);
        wave.scale.y = Math.max(.001, h * k); wm.opacity = Math.min(1, p / .55);
      });
      const hit = (o.hit || []);
      hit.forEach(([c, r, side], i) => {
        const b0 = P(c, r, 0), pc = api.piece(c, r);
        const rp = decal("ripple", 1.75 * g, null, {op: 0, ro: 7}), dp = spr("droplets", 1.5 * g, {op: 0, ro: 13});
        rp.position.copy(b0); rp.position.y += .04;
        dp.position.copy(b0); dp.position.y += .7;
        tw(800, e => { setD(rp, .3 + 1 * e); rp.material.opacity = 1 - e; }, {e: "out", delay: i * 40}).then(() => kill(rp));
        tw(750, e => { setS(dp, .4 + .8 * e); dp.material.opacity = 1 - e; dp.position.y = b0.y + .7 + 1.1 * e; }, {e: "out", delay: i * 40}).then(() => kill(dp));
        if (pc) { keep(pc); const y0 = pc.position.y; tw(520, (e, p) => { pc.position.y = y0 + .35 * Math.sin(p * PI); }, {delay: i * 40}).then(() => { pc.position.y = y0; unkeep(pc); }); }
        if (side === "r") num(P(c, r, 1.35), "−5");
      });
      const nRed = hit.filter(x => x[2] === "r").length;
      if (nRed) setTimeout(() => num(P(4, 6.5, 1.2), "元氣 −" + nRed * 5 + (o.big ? "　靈力 −1" : "")), 450);
      await tw(550, e => { wave.scale.y = Math.max(.001, h * .9 * (1 - e)); wm.opacity = 1 - e; }, {e: "in", delay: 300});
      kill(wave);
      pulse();
      const l0 = hitL.intensity;
      await tw(600, e => { band.material.opacity = .8 * (1 - e); hitL.intensity = l0 * (1 - e); });
      kill(band); hitL.intensity = 0;
    }

    const SPELL = {meteor, lock, river};
    let busy = false;
    /* po（11/14 選填）：{cao:false}＝跳過草書招名（App 設定「戰鬥演出：簡化」） */
    async function play(k, o, po){
      if (busy || !SPELL[k]) return false;
      busy = true;
      const my = ph;
      PT0 = now();
      try {
        tip("太虛星尊施法：" + NAMES[k]);
        mark("施法開始（" + NAMES[k] + "）");
        await cast(k);
        if (my !== ph) return false;
        if (!(po && po.cao === false)) {
          mark("草書開始");
          await calli(k);
          if (my !== ph) return false;
        }
        mark("魔法開始");
        await SPELL[k](typeof o === "function" ? o() : (o || {}));
        if (my !== ph) return false;
        mark("收招");
        await uncast();
        mark("整招結束");
        return true;
      } finally { busy = false; }
    }
    /* 全部收掉：特效、迴圈、飄字、換掉的材質、魔王姿勢；動畫中途按也安全（進行中的補間直接結束） */
    function reset(){
      ph++;
      LOOPS.clear();
      castLoop = null;
      TW.length = 0;
      for (const L of [...LBL]) { if (L.el !== sayA) L.el.remove(); LBL.delete(L); }
      sayEl.getAnimations().forEach(a => a.cancel());
      for (const S of [...SWAP.values()]) S.restore();
      for (const [g, k] of KEEP) { g.scale.setScalar(k.s); g.position.y = k.y; g.visible = k.v; }
      KEEP.clear();
      for (const o of [...root.children, ...(fxRoot !== root ? fxRoot.children : [])]) if (o !== boss && o !== aura && o !== gem && o !== gemCore) kill(o);
      if (pivot) { pivot.position.set(0, 0, 0); pivot.scale.setScalar(1); pivot.rotation.set(0, 0, 0); }
      if (gem) { gem.material.opacity = 0; gemCore.material.opacity = 0; }
      if (aura) aura.material.opacity = 0;
      gemL.intensity = 0; hitL.intensity = 0;
      [cao, caoTxt, veil].forEach(e => { e.getAnimations().forEach(a => a.cancel()); e.style.opacity = 0; });
      busy = false;
    }
    function dispose(){
      pass("main");
      reset(); dead = true;
      if (raf) cancelAnimationFrame(raf);
      sc.remove(root); sc.remove(gemL); sc.remove(hitL);
      if (fxRoot !== root && fxRoot.parent) fxRoot.parent.remove(fxRoot);
      root.traverse(o => { if (o.material) o.material.dispose(); });
      fxRoot.traverse(o => { if (o.material) o.material.dispose(); });
      PLANE.dispose(); WAVEG.dispose(); edgeTex.dispose(); glowTex.dispose();
      for (const k in TX) if (TX[k] && TX[k].dispose) TX[k].dispose();
      for (const f of FLIPTEX.values()) f.dispose();
      ov.remove();
    }

    const CAOIMG = {};
    const ready = Promise.all([
      ...IMGS.map(loadTex),
      ...["meteor", "lock", "river"].map(k => loadImg((api.caoBase || base) + "cao_" + k + ".webp").then(im => { if (im) CAOIMG[k] = im; })),
      loadBoss().catch(e => { console.warn("魔王模型載入失敗", e); })
    ]).then(() => true);

    return {
      ready, play, reset, dispose, cast, uncast, calli, meteor, lock, river, pass,
      get root(){ return root; },
      get busy(){ return busy; },
      get boss(){ return boss; },
      get bossH(){ return bossH; }
    };
  }
  window.XQBossFx3D = {create};
})();
