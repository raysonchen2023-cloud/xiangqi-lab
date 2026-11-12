#!/usr/bin/env node
// 產生可以放上 GitHub Pages 的離線版網站：xiangqi-lab/site/
//  - core.js：直接從 xiangqi-referee.js 抄出規則、記譜、裁判、評等、難度設定（不重打，兩邊規則永遠一致）
//  - index.html：由手機 App 版 xiangqi-db/m.html 轉成離線版
//  - engine/：網頁版 Pikafish（xiangqi-wasm/out）與神經網路檔
//  - data/：只放明清古譜（特級大師、許銀川對局不公開，改由電腦同步到手機）
// 用法：node xiangqi-lab/tools/build-site.js
"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const ROOT=path.join(__dirname,"..",".."),LAB=path.join(__dirname,".."),SRC=path.join(LAB,"src"),SITE=path.join(LAB,"site");
const PUBLIC_BOOKS=["shiqingyaqu","juzhongmi","meihuapu","kaiju","canju","xuyinchuan","gmgames","brilliant"];   // brilliant＝妙棋精選（意見回饋 310，find-brilliant.js 產生；還沒產生就跳過）   // gmgames（33 MB）不預先下載：App 打開後在背景抓一次，存在不跟版本走的快取
// 太大不預先下載的棋譜：放在網站上，玩家在棋譜庫按「下載」才抓（存在手機裡，之後離線也能看）
// 比賽對局（全國賽、公開賽…，依年代分包，由 xiangqi-db/tools/build-tournaments.js 產生）
const BIG_BOOKS=(()=>{try{return JSON.parse(fs.readFileSync(path.join(__dirname,"..","..","xiangqi-db","tour-packs.json"),"utf8")).map(p=>[p.key,p.name,p.count,p.events])}catch(e){return[]}})();
const APP_URL="https://raysonchen2023-cloud.github.io/xiangqi-lab/";

// ---------- 1. core.js：從裁判程式抄出需要的程式碼 ----------
const ref=fs.readFileSync(path.join(ROOT,"xiangqi-referee.js"),"utf8").split("\n");
const lineOf=(re,from=0)=>{for(let i=from;i<ref.length;i++)if(re.test(ref[i]))return i;throw new Error("在裁判程式裡找不到："+re)};
// 從某一行開始，取到大括號（或中括號）平衡為止
function block(startRe){const s=lineOf(startRe);let depth=0,seen=false;
  for(let i=s;i<ref.length;i++){for(const ch of ref[i]){if(ch==="{"||ch==="["){depth++;seen=true}else if(ch==="}"||ch==="]")depth--}
    if(seen&&depth===0)return ref.slice(s,i+1).join("\n")}throw new Error("區塊沒有結束："+startRe)}
const engineStart=lineOf(/^const START=/),engineEnd=lineOf(/^\/\/ ---------- 對局狀態/);
const parts=[
  "// ===== 規則、記譜（xiangqi-referee.js「引擎」段） =====",ref.slice(engineStart,engineEnd).join("\n"),
  "const PLAYER={r:\"紅方\",b:\"黑方\"};",
  "// ===== 棋譜註記 =====",block(/^function annotate\(/),block(/^const summary=/),block(/^function fullItem\(/),block(/^function gameItem\(/),
  "// ===== 難度設定 =====",block(/^const LEVELS=\[/),
  "// ===== 走子與裁判 =====",block(/^function stateApply\(/),block(/^function stateRebuild\(/),block(/^function judgeState\(/),block(/^function pickMove\(/),
  "// ===== 每步評等 =====",ref[lineOf(/^const ANALYZE_MS=/)],ref[lineOf(/^const clampV=/)],block(/^async function classifyRaw\(/)];
const names=["START","NAMES","CN","VAL","sideOf","opp","parseFen","fen","legal","legalOk","inCheck","kingSq","make","iccs","parseSq","notate","chasePairs","hasAttackers","REP_RULES","repetitionVerdict","TW_RULES","twRepetitionVerdict","RULESET_DEFAULT","RULESETS","ruleConfig","ruleConfigOf","ruleRated","rulesetVerdict","repetitionWarning",
  "PLAYER","annotate","summary","fullItem","gameItem","LEVELS","stateApply","stateRebuild","judgeState","pickMove","ANALYZE_MS","clampV","gradeLoss","qName","classifyRaw"];
const core=`// 自動產生，請勿直接修改：來源是 xiangqi-referee.js（node xiangqi-lab/tools/build-site.js）
// 需要外部提供：evalPos(board, side, ms, multipv)（網頁版 Pikafish）
"use strict";
var XQCore=(function(){
${parts.join("\n")}
return{${names.join(",")}};
})();
if(typeof module!=="undefined")module.exports=XQCore;
`;
// ChatGPT：裁判回歸測試只更新 core，不清空網站、不複製大型素材或部署。
if(process.argv.includes("--core-only")){
  fs.mkdirSync(SITE,{recursive:true});fs.writeFileSync(path.join(SITE,"core.js"),core);
  console.log("Updated site/core.js only (no deployment)");process.exit(0);
}
// 清掉舊的網站檔案，但保留 .git（site/ 本身就是 GitHub 上的倉庫）
fs.mkdirSync(SITE,{recursive:true});for(const f of fs.readdirSync(SITE))if(f!==".git")fs.rmSync(path.join(SITE,f),{recursive:true,force:true});
fs.mkdirSync(path.join(SITE,"engine"),{recursive:true});fs.mkdirSync(path.join(SITE,"data"),{recursive:true});
fs.writeFileSync(path.join(SITE,"core.js"),core);

// ---------- 2. 引擎 ----------
for(const f of["pikafish.js","pikafish.wasm"])fs.copyFileSync(path.join(ROOT,"xiangqi-wasm","out",f),path.join(SITE,"engine",f));
fs.copyFileSync(path.join(ROOT,"xiangqi-db","engine","pikafish.nnue"),path.join(SITE,"engine","pikafish.nnue"));

// ---------- 3. 古譜資料 ----------
const allBooks=JSON.parse(fs.readFileSync(path.join(ROOT,"xiangqi-db","books.json"),"utf8"));
const books=[];
for(const key of PUBLIC_BOOKS){if(!fs.existsSync(path.join(ROOT,"xiangqi-db",key+".json")))continue;const d=JSON.parse(fs.readFileSync(path.join(ROOT,"xiangqi-db",key+".json"),"utf8"));
  fs.writeFileSync(path.join(SITE,"data",key+".json"),JSON.stringify(d));
  const b=allBooks.find(x=>x.key===key)||{};books.push({key,name:d.name||b.name,book:d.book||b.book,count:d.items.length})}
fs.writeFileSync(path.join(SITE,"data","books.json"),JSON.stringify(books));
const big=[];for(const[key,name,cnt]of BIG_BOOKS){const src=path.join(ROOT,"xiangqi-db",key+".json");if(!fs.existsSync(src))continue;
  fs.copyFileSync(src,path.join(SITE,"data",key+".json"));const n=(fs.readFileSync(src,"utf8").match(/"id":/g)||[]).length;
  big.push({key,name,size:fs.statSync(src).size,count:cnt||n})}
fs.writeFileSync(path.join(SITE,"data","big-books.json"),JSON.stringify(big));
// 棋力測驗題庫、術語庫（都只用公版古譜和自己寫的說明）
// 朝代棋子底圖
fs.mkdirSync(path.join(SITE,"data","qa"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","qa")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","qa",f),path.join(SITE,"data","qa",f));
fs.mkdirSync(path.join(SITE,"data","voice"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","voice")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","voice",f),path.join(SITE,"data","voice",f));
fs.mkdirSync(path.join(SITE,"data","sfx"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","sfx")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","sfx",f),path.join(SITE,"data","sfx",f));
// 公園 3D 的朝代道具（Gemini 畫的、去背後的樹、茶杯、長椅、凳子、燈籠、桌面，xiangqi-db/park3d/<朝代>/）
for(const e of fs.existsSync(path.join(ROOT,"xiangqi-db","park3d"))?fs.readdirSync(path.join(ROOT,"xiangqi-db","park3d")):[]){const sd=path.join(ROOT,"xiangqi-db","park3d",e);if(!fs.statSync(sd).isDirectory())continue;
  fs.mkdirSync(path.join(SITE,"data","park3d",e),{recursive:true});for(const f of fs.readdirSync(sd))fs.copyFileSync(path.join(sd,f),path.join(SITE,"data","park3d",e,f))}
// 公園 3D 的手繪 Pikafish（開發者用 Gemini 畫的 6 個姿勢，xiangqi-db/pika/）
fs.mkdirSync(path.join(SITE,"data","pika"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","pika")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","pika",f),path.join(SITE,"data","pika",f));
if(fs.existsSync(path.join(ROOT,"xiangqi-db","pika2"))){fs.mkdirSync(path.join(SITE,"data","pika2"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","pika2")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","pika2",f),path.join(SITE,"data","pika2",f))}   /* 意見回饋 418：第二款 Pikafish「臥龍」 */
if(fs.existsSync(path.join(ROOT,"xiangqi-db","npc"))){fs.mkdirSync(path.join(SITE,"data","npc"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","npc")).filter(f=>/\.webp$|^faces\.json$/.test(f)))fs.copyFileSync(path.join(ROOT,"xiangqi-db","npc",f),path.join(SITE,"data","npc",f))}   /* 意見回饋 425：園子路人棋友的立繪（有才複製） */
// 意見回饋 367、369：主頁小帥的手繪版（24 個姿勢＋8 張走路圖，xiangqi-db/xs/，tools/key_xs.py 產生）
if(fs.existsSync(path.join(ROOT,"xiangqi-db","xs"))){fs.mkdirSync(path.join(SITE,"data","xs"),{recursive:true});fs.cpSync(path.join(ROOT,"xiangqi-db","xs"),path.join(SITE,"data","xs"),{recursive:true})}   /* 意見回饋 492：含女生版 xs/girl/ */
// 公園 3D 棋盤的朝代背景長卷（開發者用 Gemini 畫的，xiangqi-db/park/<朝代>.webp）
fs.mkdirSync(path.join(SITE,"data","park"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","park")).filter(f=>/\.webp$/.test(f)))fs.copyFileSync(path.join(ROOT,"xiangqi-db","park",f),path.join(SITE,"data","park",f));
fs.mkdirSync(path.join(SITE,"data","glyphs"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","glyphs")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","glyphs",f),path.join(SITE,"data","glyphs",f));
fs.mkdirSync(path.join(SITE,"data","pieces"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","pieces")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","pieces",f),path.join(SITE,"data","pieces",f));
// 11/3 Gemini 新圖（tools/process_art.py 轉好的 webp）：荒野小徑、驛站、地圖、石桌、寶物、柳寒舟、擂主 → data/<種類>/
{const AD=path.join(ROOT,"xiangqi-db","art");if(fs.existsSync(AD))for(const k of fs.readdirSync(AD)){const sd=path.join(AD,k);if(!fs.statSync(sd).isDirectory()||k==="tripo"||(k==="bgm"&&process.env.NO_BGM))continue;   /* NO_BGM=1：背景音樂還在產生時先不更新網站上的音樂 */   /* Tripo 原始模型（每個 3 MB）不放網站，只放瘦身後的 tripo_app */
  fs.mkdirSync(path.join(SITE,"data",k),{recursive:true});fs.cpSync(sd,path.join(SITE,"data",k),{recursive:true,filter:s=>!/\.old/.test(path.basename(s))})}}   /* 含子資料夾（data/icons/<朝代>/），留底的 .old 圖不複製 */
// 朝代棋盤底圖
fs.mkdirSync(path.join(SITE,"data","boards"),{recursive:true});for(const f of fs.readdirSync(path.join(ROOT,"xiangqi-db","boards")))fs.copyFileSync(path.join(ROOT,"xiangqi-db","boards",f),path.join(SITE,"data","boards",f));
/* 回饋 852：停權名單正本 xiangqi-db/banlist.json 也複製到 site/data/（sw.js 對它一律直接上網、不快取、不轉 CDN） */
for(const f of["quiz.json","terms.json","gmbios.json","fixes.json","banlist.json"])fs.copyFileSync(path.join(ROOT,"xiangqi-db",f),path.join(SITE,"data",f));
for(const f of["quiz-calib.json","park-legend.json","park-legend2.json","park-novel.json"])if(fs.existsSync(path.join(ROOT,"xiangqi-db",f)))fs.copyFileSync(path.join(ROOT,"xiangqi-db",f),path.join(SITE,"data",f));   /* 意見回饋 301：題目校正檔（有才複製） */

// ---------- 4. App 本體（由手機版 m.html 轉成離線版） ----------
// 意見回饋 594（程式拆分）：m.html 的主樣式在 xiangqi-db/m.css、主程式在 xiangqi-db/m/*.js，組回一個完整的頁面（逐字跟拆之前一樣）
let html=require(path.join(ROOT,"xiangqi-db","tools","mhtml.js")).assemble();
/* 意見回饋 633（開發者：字有大有小）：朝代字型只收 fonts/charset.txt 裡的字，沒收到的字（例如新角色「苗疆少女」的疆）會跳成系統字型、大小不一。這裡先檢查，缺字就提醒重做字型 */
{const cs=new Set([...fs.readFileSync(path.join(ROOT,"xiangqi-db","fonts","charset.txt"),"utf8")]),miss=new Set();
  for(const ch of html)if(/[㐀-鿿豈-﫿]/.test(ch)&&!cs.has(ch))miss.add(ch);
  /* 意見回饋 783（開發者：字體沒統一）：戰役、小說、名詞解釋、棋手名字都在資料檔裡，也要一起查（隋滅陳的「痺」就是漏在 battles.json） */
  const walkJ=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walkJ(p);else if(e.name.endsWith(".json")&&fs.statSync(p).size<60e6)for(const ch of fs.readFileSync(p,"utf8"))if(/[㐀-鿿豈-﫿]/.test(ch)&&!cs.has(ch))miss.add(ch)}};
  try{walkJ(path.join(ROOT,"xiangqi-db","art"))}catch(e){console.log("⚠ 資料檔缺字檢查失敗："+e.message)}
  if(miss.size)console.log(`⚠ 朝代字型缺 ${miss.size} 個字：${[...miss].join("")}——把字加進 xiangqi-db/fonts/charset.txt，再跑 python xiangqi-db/tools/font_subset.py`)}
const rep=(a,b)=>{if(!html.includes(a))throw new Error("m.html 裡找不到要替換的字串："+a.slice(0,60));html=html.split(a).join(b)};
rep(`<link rel="manifest" href="/m/manifest.json"><link rel="icon" href="/m/icon.svg"><link rel="apple-touch-icon" href="/m/icon-180.png">`,
    `<link rel="manifest" href="manifest.json"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="icon-180.png">`);
// 離線版不用 Google 字型（離線抓不到，而且多執行緒模式會擋外站資源）
html=html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/,"");
rep(`<script>\n"use strict";`,`<script>window.XQ_OFFLINE=true;window.XQ_BUILD="__BUILD__";</script>\n<script src="core.js"></script>\n<script src="engine.js"></script>\n<script src="local.js"></script>\n<script src="net.js"></script>\n<script src="zh.js"></script>\n<script>\n"use strict";`);
fs.writeFileSync(path.join(SITE,"index.html"),html);
for(const f of fs.readdirSync(SRC))fs.copyFileSync(path.join(SRC,f),path.join(SITE,f));

// ---------- 5. 授權與說明 ----------
fs.copyFileSync(path.join(ROOT,"xiangqi-db","engine","Copying.txt"),path.join(SITE,"LICENSE-Pikafish-GPL3.txt"));
fs.copyFileSync(path.join(ROOT,"xiangqi-db","engine","NNUE-License.md"),path.join(SITE,"NNUE-License.md"));
fs.mkdirSync(path.join(SITE,"pikafish-src"),{recursive:true});
fs.copyFileSync(path.join(ROOT,"xiangqi-wasm","Pikafish","src","uci.cpp"),path.join(SITE,"pikafish-src","uci.cpp"));
fs.copyFileSync(path.join(ROOT,"xiangqi-wasm","build-wsl.sh"),path.join(SITE,"pikafish-src","build-wsl.sh"));
fs.writeFileSync(path.join(SITE,"README.md"),`# 象棋千秋（離線版）

手機也能離線使用的中國象棋 App：挑戰 Pikafish（八個難度）、雙人對戰、明清古譜研究與 Pikafish 分析。
網址：${APP_URL}

## 著作權與授權
© 2026 陳泓昇（Chen Hung-Sheng）

- **程式碼**：GNU 通用公共授權第 3 版，或（由你選擇）任何更新的版本（SPDX：\`GPL-3.0-or-later\`），全文見 [LICENSE](LICENSE)。網頁、\`.js\` 程式檔、建置與測試工具都算，**寫在程式檔裡的介面文字、場景小故事和對白也跟著程式是 GPL**。可讀的原始碼、組裝方法和測試在 [source/](source/README.md)；\`node source/check-build.js\` 可以核對這裡的 \`index.html\` 就是那份原始碼組出來的。
- **開發者自製的素材**：\`data/\` 底下的圖片（含 AI 協助生成的）、3D 模型、背景音樂、音效、長篇劇情與題目講解等資料檔、說明文件，依創用 CC 姓名標示─非商業性─相同方式分享 4.0 國際（CC BY-NC-SA 4.0）授權，見 [LICENSE-ASSETS.md](LICENSE-ASSETS.md)。
- **不在上面兩種授權裡的**：特級大師小傳 \`data/gmbios.json\`（改寫自維基百科等，照原來源的條件）、語音檔 \`data/voice/\`、棋譜資料，以及第三方元件：Pikafish 引擎（GPL-3.0）、神經網路權重 \`pikafish.nnue\`（不得商用）、three.js、OpenCC、jsQR、QRCode.js、字型等，照各自授權，清單見 [NOTICE.md](NOTICE.md)，授權全文在 [licenses/](licenses/README.md)。

簡單說：程式可以自由使用、修改、再散布（也可以商用），條件是散布時同樣用 GPL、附上原始碼；圖、音樂、劇情可以分享和改作，但要標示出處、不能商用、改作要用同樣的授權。

這個倉庫只收問題回報（Issues），不收 Pull Request，見 [CONTRIBUTING.md](CONTRIBUTING.md)。

Code: GPL-3.0-or-later, including UI text, vignettes and dialogue written in the code files. Original assets under \`data/\` (images, 3D models, music, long-form story and other data texts, docs): CC BY-NC-SA 4.0. \`data/gmbios.json\`, \`data/voice/\`, game records and third-party components keep their own terms (see NOTICE.md). Issues are welcome; pull requests are not accepted.

## 內容與授權
- **Pikafish 引擎**：GPL-3.0（見 LICENSE-Pikafish-GPL3.txt）。原始碼：https://github.com/official-pikafish/Pikafish 標籤 \`Pikafish-2026-09-06\`。
  網頁版只改了 \`src/uci.cpp\`（讓網頁可以送指令，改過的完整檔案在 pikafish-src/），編譯指令在 pikafish-src/build-wsl.sh。
- **神經網路 pikafish.nnue**：Pikafish 團隊提供，限合法、非商業使用（見 NNUE-License.md）。
- **棋譜**：適情雅趣、橘中秘、梅花譜，以及古典開局譜、殘局譜，均為明清古譜。
  數位化資料來自 chasoft/community-xiangqi-games-database。
`);
fs.writeFileSync(path.join(SITE,".nojekyll"),"");

// ---------- 5.8 意見回饋 508：大師對局、全國比賽、古譜、殘局、題庫是簡體來源，建置時一律轉成繁體（tools/to_trad.py，OpenCC s2tw）----------
{const L=["gmgames","tour-1956-2010","tour-2011-2014","tour-2015-2019","canju","kaiju","xuyinchuan","juzhongmi","shiqingyaqu","meihuapu","brilliant","quiz","gmbios"].map(k=>path.join(SITE,"data",k+".json")).filter(p=>fs.existsSync(p));
  const r=require("child_process").spawnSync("python",["-I",path.join(__dirname,"to_trad.py"),...L],{encoding:"utf8"});if(r.status!==0)throw new Error("轉繁體失敗："+(r.stderr||r.error));console.log("轉成繁體：",L.length,"個資料檔")}
/* 意見回饋 514／518：手機裡下載過的「比賽對局」存在手機的資料庫，不會跟著版本換；每個檔記內容指紋（轉成繁體以後算），App 發現跟手機裡的不同就在背景重新下載 */
{const BB=path.join(SITE,"data","big-books.json"),big=JSON.parse(fs.readFileSync(BB,"utf8"));for(const g of big){const p=path.join(SITE,"data",g.key+".json");if(fs.existsSync(p)){g.size=fs.statSync(p).size;g.h=require("crypto").createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0,8)}}fs.writeFileSync(BB,JSON.stringify(big))}
// ---------- 5.9 意見回饋 422：開 App 時要先載好的圖片、音效清單（data/preload.json）----------
// 開發者要求「所有東西載好，寧可一開始顯示 LOADING，也不要在遊戲過程中卡頓」：App 開啟時照這份清單，把還沒在手機快取裡的都抓下來才進首頁。
// 只列「外觀快取」那些資料夾（跟 sw.js 的 xqlab-look 規則一樣）；特級大師對局、全國比賽、神經網路這些大型選購資料不在裡面
/* 回饋 845（開發者 11/9 選：折衷先載）：清單改由 tools/preload-list.js 產生（資料夾清單、指紋照舊），每一項多第四格「層級」（0／朝代＝首批、1＝背景），另附 pages（哪一頁先要哪些檔）。
   App 只先載首批就進首頁，其餘背景下載；舊版 App 只讀前三格，照舊全部先載 */
{const PL=require("./preload-list.js").makePreload(SITE);fs.writeFileSync(path.join(SITE,"data","preload.json"),JSON.stringify(PL));
  const L=require("./preload-list.js"),MB=b=>(b/1048576).toFixed(1)+" MB",fb=e=>L.firstBytes(PL,e);
  console.log("開啟時預先載入：",PL.n,"個檔、",MB(PL.bytes),"；其中首批（手機、Q 版）約",MB(Math.min(...L.ERAS.map(fb))),"～",MB(Math.max(...L.ERAS.map(fb))))}

// ---------- 5.10 意見回饋 661：「關於」顯示整包遊戲要多大空間（建置時算好，寫進 index.html）----------
{const sz=p=>{try{const st=fs.statSync(p);if(st.isFile())return st.size;let s=0;for(const f of fs.readdirSync(p))s+=sz(path.join(p,f));return s}catch(e){return 0}};
  const D=path.join(SITE,"data"),pl=JSON.parse(fs.readFileSync(path.join(D,"preload.json"),"utf8")),bb=JSON.parse(fs.readFileSync(path.join(D,"big-books.json"),"utf8"));
  const skip=new Set([".git","pikafish-src","tripo_anim","_rekey_backup"]),bigKeys=new Set(["gmgames.json",...bb.map(b=>b.key+".json")]);
  let code=0;for(const f of fs.readdirSync(SITE))if(/.(js|html|css|json|webmanifest)$/.test(f))code+=sz(path.join(SITE,f));
  for(const f of fs.readdirSync(D))if(/.json$/.test(f)&&!bigKeys.has(f))code+=sz(path.join(D,f));
  let all=0;(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){if(skip.has(f.name))continue;const p=path.join(d,f.name);if(f.isDirectory())w(p);else all+=fs.statSync(p).size}})(SITE);
  const S={pre:pl.bytes,code,eng:sz(path.join(SITE,"engine")),gm:sz(path.join(D,"gmgames.json")),bgm:sz(path.join(D,"bgm")),opt:bb.map(b=>[b.name,b.size||0]),all};
  S.other=Math.max(0,all-S.pre-S.code-S.eng-S.gm-S.bgm-S.opt.reduce((a,b)=>a+b[1],0));
  const ix=path.join(SITE,"index.html"),src=fs.readFileSync(ix,"utf8");if(!src.includes("/*__SIZES__*/null"))throw new Error("index.html 找不到 __SIZES__（意見回饋 661）");
  fs.writeFileSync(ix,src.replace("/*__SIZES__*/null",JSON.stringify(S)));const M=b=>(b/1048576).toFixed(0)+" MB";
  console.log("整包大小：開 App",M(S.pre+S.code),"、背景自動",M(S.eng+S.gm),"、音樂",M(S.bgm),"、選購",M(S.opt.reduce((a,b)=>a+b[1],0)),"、其他",M(S.other),"、全部",M(all))}

// ---------- 6. 版本號（給 service worker 判斷要不要更新快取） ----------
const h=crypto.createHash("sha1");
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const p=path.join(d,f.name);
  if(f.name===".git")continue;if(f.isDirectory())walk(p);else if(f.name!=="sw.js")h.update(f.name).update(fs.readFileSync(p))}})(SITE);
// 版本號用「日期-時間」表示（例如 20261030-2315）；內容沒變就沿用上一版的號碼，不會無故跳更新
const hash=h.digest("hex").slice(0,8),VF=path.join(ROOT,"xiangqi-lab","tools",".last-version.json");
let lastV={};try{lastV=JSON.parse(fs.readFileSync(VF,"utf8"))}catch(e){}
const pad=n=>String(n).padStart(2,"0"),nw=new Date();
let version=process.env.XQ_VERSION&&/^\d{8}-\d{4}$/.test(process.env.XQ_VERSION)?process.env.XQ_VERSION:lastV.hash===hash&&lastV.version?lastV.version:`${nw.getFullYear()}${pad(nw.getMonth()+1)}${pad(nw.getDate())}-${pad(nw.getHours())}${pad(nw.getMinutes())}`;
// 版本號只能往後走：曾經用 XQ_VERSION 指定過較晚的號碼，之後照時鐘算出來比它小，就接在它後面加一分鐘（不然手機會以為新版是舊版）
const maxV=lastV.max||lastV.version||"";
if(lastV.hash!==hash&&maxV&&version<=maxV){const m=maxV.match(/^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)$/);if(m){const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]+1);version=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`}}
fs.writeFileSync(VF,JSON.stringify({hash,version,max:version>maxV?version:maxV}));
const sw=path.join(SITE,"sw.js");if(fs.existsSync(sw))fs.writeFileSync(sw,fs.readFileSync(sw,"utf8").replace("__VERSION__",version));
// 網頁本身也記一份版本號（回報錯誤時可以分辨「正在執行的版本」和「已下載好的版本」）
{const ix=path.join(SITE,"index.html");if(fs.existsSync(ix))fs.writeFileSync(ix,fs.readFileSync(ix,"utf8").replace("__BUILD__",version))}
let total=0;(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.name===".git")continue;if(f.isDirectory())walk(p);else total+=fs.statSync(p).size}})(SITE);
// 安全網：發布前檢查所有程式檔和頁面裡的程式有沒有語法錯誤（壞掉的 sw.js 會讓手機裝不了新版）
// 意見回饋 270：用 vm.Script 正式編譯（new Function 會漏掉某些括號錯誤），而且網站根目錄每一支 .js 都檢查（之前漏了 park3d.js、bot3d.js）
{const vm=require("vm"),bad=[];for(const f of fs.readdirSync(SITE).filter(f=>f.endsWith(".js")&&!/\.min\.js$/.test(f))){try{new vm.Script(fs.readFileSync(path.join(SITE,f),"utf8"),{filename:f})}catch(e){bad.push(f+"："+e.message)}}
  const html=fs.readFileSync(path.join(SITE,"index.html"),"utf8");[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new vm.Script(m[1],{filename:"index.html#"+(i+1)})}catch(e){bad.push("index.html 第 "+(i+1)+" 段程式："+e.message)}});
  if(bad.length){console.error("\n✘ 有程式語法錯誤，不要發布：\n  "+bad.join("\n  "));process.exit(1)}}
console.log(`網站產生完成：${SITE}\n版本 ${version}，共 ${(total/1048576).toFixed(1)} MB（其中神經網路 48.4 MB）\n古譜：${books.map(b=>b.name+" "+b.count).join("、")}`);
