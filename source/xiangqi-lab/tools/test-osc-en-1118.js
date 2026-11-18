// 開發者 11/18：開局門派＋十派掌門排進下一版，「英文翻完再發」。
//   課文、派名、課名、目標、開局名都在外掛字典 xiangqi-db/i18n-en.json 整句翻得出；07z9 帶變數的句子用 oscL(中文,英文) 並列；單字棋子不進字典。
// 用法：node --test xiangqi-lab/tools/test-osc-en-1118.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
if(!fs.existsSync(path.join(ROOT,"xiangqi-db/i18n-en.json"))){test("外掛字典只放 CDN，公開副本沒有：這支檢查略過",()=>{});return}   /* 公開副本 */
const SRC=rd("xiangqi-db/m/07i18n.js"),EXT=JSON.parse(rd("xiangqi-db/i18n-en.json")),OS=rd("xiangqi-db/m/07z9-school.js");
const CJK=/[㐀-鿿豈-﫿]/;
const i18n=()=>{const ctx={};vm.createContext(ctx);const i=SRC.indexOf("#I18N-PURE-BEGIN"),j=SRC.indexOf("/* #I18N-PURE-END */");vm.runInContext(SRC.slice(SRC.indexOf("\n",i)+1,j)+";this.R={i18nText,i18nExtMerge}",ctx);ctx.R.i18nExtMerge(EXT);return ctx.R};
const core=()=>{const c={};vm.createContext(c);vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"),OS.indexOf("/* ===== END osc-core"))+";this.OSC=OSC",c);return c.OSC};
const ok=(R,s)=>{const t=R.i18nText(s);assert.ok(t!=null&&!CJK.test(t),s+" → "+t)};
test("十派課文（說明、題目、選項、回饋、錯著說明）每一句都翻得出",()=>{const R=i18n();let n=0;
  const walk=o=>{if(typeof o==="string"){if(CJK.test(o)&&!/^[帥將仕士相象馬傌車俥炮砲兵卒]$/.test(o)){ok(R,o);n++}return}if(Array.isArray(o))return o.forEach(walk);if(o&&typeof o==="object")Object.values(o).forEach(walk)};
  for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db/opening-school")))walk(JSON.parse(rd("xiangqi-db/opening-school/"+f)));assert.ok(n>2000,"課文段數 "+n)});
test("派名、開局名、一句棋理、22 課課名、目標、篇名、本局開局名、掌門與棋友名字都翻得出",()=>{const R=i18n(),O=core();
  for(const s of O.SCH){ok(R,s.nm);ok(R,s.op);ok(R,s.say);s.tag.forEach(t=>ok(R,"想"+t));s.who.split("、").forEach(w=>ok(R,w))}
  for(const s of O.SCH)for(let n=1;n<=22;n++){ok(R,O.title(s.id,n));ok(R,O.GOAL[s.id][n-1]);ok(R,O.stage(n,s.id))}
  for(const k of Object.keys(O.NPC))ok(R,O.NPC[k][2]);for(const m of O.MST)for(const k of["nm","who","say","pre","win","lose"])ok(R,m[k]);
  for(const x of["佈局中","其他開局","中炮・佈局中","中炮（其他應法）","中炮對屏風馬","中炮對反宮馬","中炮對順炮","中炮對列炮","中炮對進卒","中炮對飛象","中炮對過宮炮","中炮對士角炮","中炮對單提馬","中炮對三步虎"])ok(R,x)});
test("單字棋子、保護字不進外掛字典；07z9 單字棋子自己對、英文時等字典到了再重畫",()=>{for(const k of[..."帥將仕士相象馬傌車俥炮砲兵卒","進階"])assert.ok(!Object.prototype.hasOwnProperty.call(EXT.en,k),k);
  assert.match(OS,/const OSC_PC1=\{帥:"General"/);assert.match(OS,/document\.addEventListener\("xq-i18n-ext",re\)/);assert.match(OS,/const oscL=\(zh,en\)=>oscEn\(\)\?en:zh/)});
test("用詞一致：雲河七星＝Cloud River Seven Stars、雲河棋會＝Cloud River Chess Club、修為＝XP；不留英式 centre、不寫 Yunhe",()=>{
  assert.ok(!/Seven Stars of (the )?Cloud River|Chess Society|\bYunhe\b/.test(OS));const v=JSON.stringify(EXT.en);assert.ok(!/\bcentre\b|\bYunhe\b/.test(v));assert.ok(!/Seven Stars of (the )?Cloud River/.test(v))});
