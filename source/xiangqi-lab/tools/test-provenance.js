// 來源標籤（m/00-util.js 的 provOf／provChip／provLine／provDoc）：題庫、殘局、劇本、戰役、文件頁共用一套說法，跟文史考據頁的四種標籤一致。
// 11/11 Gemini 架構報告第四項。處理紀錄：xiangqi-db/story/100_Gemini架構報告處理.md
// 用法：node --test xiangqi-lab/tools/test-provenance.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const DB=path.join(__dirname,"../../xiangqi-db"),LAB=path.join(__dirname,"..");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const U=rd(path.join(DB,"m/00-util.js")),a=U.indexOf("const PROV_LB="),e=U.indexOf("\nfunction provDoc(");
assert.ok(a>0&&e>a,"找不到來源標籤");
const ctx={};vm.createContext(ctx);
vm.runInContext(U.split("\n").find(l=>l.startsWith("const esc="))+"\n"+U.slice(a,U.indexOf("\n",e+1))+"\nthis.X={PROV_LB,provOf,provChip,provLine,provDoc};",ctx);
const X=ctx.X,J=x=>x==null?x:JSON.parse(JSON.stringify(x));
test("四種說法跟文史考據頁（history.md「四種標籤」）一字不差，兩份 history.md 一樣",()=>{
  const h=rd(path.join(DB,"art/docs/history.md"));assert.equal(h,rd(path.join(LAB,"site/data/docs/history.md")));
  const sec=h.slice(h.indexOf("## 四種標籤"),h.indexOf("另外兩點"));const doc=[...sec.matchAll(/\*\*【([^】]+)】\*\*/g)].map(m=>m[1]);
  assert.deepEqual(doc,Object.values(J(X.PROV_LB)))});
test("Gemini 的標籤換成現有說法：fiction＝【遊戲創作】；classic＋shi_qing_ya_qu＝出處《適情雅趣》（不是真假分類）",()=>{
  assert.deepEqual(J(X.provOf({tags:["fiction"]})),{kind:"game",label:"遊戲創作",book:null});
  assert.match(X.provChip({tags:["fiction"]}),/【遊戲創作】/);
  assert.deepEqual(J(X.provOf({tags:["classic","shi_qing_ya_qu"]})),{kind:null,label:null,book:"適情雅趣"});
  assert.equal(X.provChip({tags:["classic","shi_qing_ya_qu"]}),"");assert.match(X.provLine({tags:["classic","shi_qing_ya_qu"]}),/📖 出處：適情雅趣/)});
test("沒有 tags 就看既有欄位：星槎石桌手擺題＝遊戲創作、古譜＝出處、題庫「…練習」不標、戰役「存疑」＝有爭議／傳說",()=>{
  assert.equal(X.provOf({src:{book:"星槎石桌",title:"x"}}).kind,"game");
  assert.deepEqual(J(X.provOf({src:{book:"橘中秘",title:"異地同心"}})),{kind:null,label:null,book:"橘中秘"});
  assert.equal(X.provOf({src:"入門練習"}),null);assert.equal(X.provOf({src:"悶宮練習"}),null);assert.equal(X.provLine({src:"入門練習"}),"");
  assert.match(X.provLine({src:"適情雅趣"}),/📖 出處：適情雅趣/);
  assert.equal(X.provOf({prov:"存疑"}).label,"有爭議／傳說");assert.equal(X.provOf({}),null);assert.equal(X.provOf(null),null)});
test("文件頁：md 裡的【史實】【有爭議…】【遊戲創作】套同一組樣式；棋規頁的【App 照亞洲棋例】不動",()=>{
  assert.equal(X.provDoc("【史實】正史"),'<span class="prov prov-hist">【史實】</span>正史');
  assert.match(X.provDoc("【有爭議／傳說】"),/prov-legend/);assert.match(X.provDoc("【史實／部分待查】"),/prov-hist/);assert.match(X.provDoc("【遊戲創作】"),/prov-game/);
  assert.equal(X.provDoc("【App 照亞洲棋例】"),"【App 照亞洲棋例】")});
test("〔原始碼〕畫面沒有另一套說法：程式和資料裡沒有【雲河演義】【適情雅趣古譜】；題庫、殘局、劇本、戰役都接上 provLine／provChip",()=>{
  for(const f of fs.readdirSync(path.join(DB,"m")).filter(f=>f.endsWith(".js")))assert.doesNotMatch(rd(path.join(DB,"m",f)).replace(/\/\*[\s\S]*?\*\//g,""),/【雲河演義】|【適情雅趣古譜】/,f);   /* 註解裡記 Gemini 原名可以，畫面上不行 */
  assert.match(rd(path.join(DB,"m/03-home-quiz.js")),/\$\{provLine\(q\)\}/);assert.match(rd(path.join(DB,"m/07c-canju.js")),/provChip\(P\)/);
  assert.match(rd(path.join(DB,"m/07f-ship.js")),/provChip\(c\.tags\?c:\{tags:N\.tags\|\|\["fiction"\]\}\)/);
  assert.match(rd(path.join(DB,"m/07-legend.js")),/provChip\(c\.tags\?c:\{tags:D\.tags\|\|\["fiction"\]\}\)/);
  const bt=rd(path.join(DB,"m/07g-battle.js"));assert.match(bt,/provOf\(c\)/);assert.doesNotMatch(bt,/標「存疑」/)});
