/* ================= 🏮 驛站滿版水墨圖（意見回饋 759，開發者 11/8「照規劃繼續」；規劃 story/雲河驛站_規劃.md、出圖清單 story/雲河驛站_出圖清單.md）=================
   innSheet()（07-legend.js）畫完以後呼叫 yzInn(v,k)：把上方 160px 橫幅換成那一朝的滿版圖 data/yizhan/<朝代>_f.webp（768×1376；意見回饋 773 的全彩水墨版，載不到退回 769 的淡彩 _c，用新檔名避開手機舊快取；純水墨原圖在 park/yizhan/，要退回就轉檔放進 art/yizhan/ 再把 YZ_IMG 設成 ""），原本的清單全部留在圖下面。
   雲河驛站（船艙那一站，k＝classic）＝總站：🏮 旅人、🗝 秘境棋友、📮 信箱（全部的信）、🏯 點將台，加上「千秋驛路」12 個朝代小圓印：
     沒停靠（eraLocked）＝霧＋灰印，點了 eraLockMsg；停靠過＝亮；那一朝的千秋印亮了任何一邊＝朱印、鑄成金印＝金印（07i2-seal.js sealOf；11/9 以前是「學會了＝朱印」）；那一朝有沒讀的信＝紅點；點亮的印走 shipGoTo（千秋穿梭）到那一朝的驛站。
   各朝驛站：旅人、秘境棋友、這一朝寄來的信（PARK_NPC 的 era），加一個史實小牌 YZ_SIGHT（點了 15% 撿那一朝的珍品，跟渡口景點一樣，沒撿到看介紹）。
   旅人、秘境棋友的小窗只是轉給清單上原本的按鈕（data-inn），下棋流程完全不變。
   YZ_ON＝總開關；YZ_READY＝定稿、可以上的圖（沒列的朝代照舊用橫幅）；YZ_SPOT／YZ_ROAD／YZ_SIGHT 的位置照每張圖量的（左%、上%）。樣式在 yzCss()（m.css 有別人在改，先放這裡）。 */
/* 開發者 11/10：經典世界的驛站不該有往各朝代的入口，一律從星槎的千秋石枰去——拿掉「千秋驛路」12 個朝代小圓印（圖也重畫成沒有各朝小島的天空） */
const YZ_ROAD_ON=false,YZ_CLV="1115";   /* 經典驛站圖 11/10 重畫（同檔名換圖，網址帶版本，手機才會重抓） */
const YZ_ON=true;   /* 開發者 11/8：史學顧問核過，打開 */
const YZ_IMG="_f";   /* 意見回饋 773：全彩水墨版 <朝代>_f.webp；載不到退回淡彩 _c（img 的 onerror） */
const YZ_READY=new Set(["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"]);
const YZ_SPOT={
  classic:{tr:[51,66],sec:[23,54],mail:[80,69],ling:[85,58]},
  qin:{tr:[58,49],sec:[27,58],mail:[83,59],sight:[52,79]},
  han:{tr:[50,56],sec:[22,63],mail:[80,64],sight:[50,79]},
  sanguo:{tr:[56,50],sec:[27,60],mail:[79,63],sight:[61,85]},
  weijin:{tr:[57,52],sec:[22,60],mail:[78,67],sight:[54,79]},
  nanbei:{tr:[55,55],sec:[21,62],mail:[82,69],sight:[54,87]},
  sui:{tr:[56,52],sec:[17,63],mail:[85,65],sight:[67,82]},
  tang:{tr:[57,54],sec:[24,58],mail:[84,62],sight:[60,74]},
  wudai:{tr:[54,54],sec:[23,60],mail:[76,71],sight:[44,81]},
  song:{tr:[58,54],sec:[18,62],mail:[86,64],sight:[46,78]},
  yuan:{tr:[60,57],sec:[23,64],mail:[84,64],sight:[69,81]},
  ming:{tr:[56,56],sec:[32,63],mail:[85,64],sight:[61,79]},
  qing:{tr:[60,56],sec:[27,59],mail:[86,62],sight:[74,79]}};
/* W107-L 第 3 批 iPad 橫向專用圖（l1610，2560×1600；Windows Claude 1 11/25 量，output/w107-ipad/l1610/yizhan/yz_l1610.json）：每朝構圖不同、各一套座標（全部是 %）。
   圖 data/yizhan/<朝>_f_l1610.webp；鍵＝原圖 <朝>_f（載不到的淡彩 _c 退回圖沒有橫式版）。S 入口（yzTr 旅人、yzSec 秘境棋友、yzMail 信箱、yzLing 點將台（只有經典）、yzSight 景點）、walk 走路節點；
   沒給 look0 的朝代看向「路過的旅人」。景點標籤（.po-sight）字級用 cqw，橫式圖框比較寬，3.1cqw 會放大到 37px 蓋住旁邊的入口，橫式圖改 2cqw（約 24px，跟直向差不多）。清版景點標籤從量的 (75,60) 往左上挪到 (74,55)：原位置跟 88% 的信箱標籤疊在一起（仍指著牆上的郵包、告示板 75,57）。經典版另有 12 朵雲的 road（YZ_ROAD_ON 目前 false，先不登記）。
   信箱常畫在最右邊：元、清的信箱在寬 89～98%，部分 iPad 會裁掉大半，熱點只能放 88%（Windows Claude 1 註明要實機確認）。
   走路：原本由 07w 包一層 yzInn、用 SHW_YZ（原圖座標）掛；用橫式圖時這裡先照條目掛好（shwMount 掛過就不重掛），記憶名換成 yzL:<朝>（07w SHW_EXITS 的 yz:<朝> 出口是原圖 %，
   橫式圖沒有出口表＝照 07w 預設從起點往下走出去）。進門從水墨暈開（07p yzColor）只有直式的淡彩圖，用橫式圖時 yzColor 自己略過（看 P.dataset.scw）。夜景沒有另外的圖（驛站只有一張），所以不分日夜 */
const YZ_L={
  classic:{S:{"yzTr":[47,66],"yzSec":[22.5,52],"yzMail":[69,62],"yzLing":[81,53]},walk:{"h":[0.06,66,0.0012],"look0":[50,85],"N":{"home":[74,83],"b1":[62,78],"tr":[46,71.5],"c1":[38,68],"c2":[30,62],"sec":[23,56.5],"mail":[67,70],"ling":[80.6,57.5]},"E":"home-b1 b1-tr tr-c1 c1-c2 c2-sec home-mail b1-mail mail-ling","HS":{"yzTr":["tr",50,52,"bow"],"yzSec":["sec",22.5,48,"wave"],"yzMail":["mail",69,58,"wave"],"yzLing":["ling",81,50,"cheer"]}}},
  qin:{S:{"yzTr":[55,58],"yzSec":[26,60],"yzMail":[88,60],"yzSight":[53,84]},walk:{"h":[0.065,60,0.001],"look0":[55,58],"N":{"home":[55,80],"tr":[54,62],"c":[40,66],"sec":[27,64],"mail":[86,78],"r":[69,75],"sight":[53,88]},"E":"home-tr home-c c-sec home-mail home-r home-sight","HS":{"yzTr":["tr",58,44,"bow"],"yzSec":["sec",26,53,"wave"],"yzMail":["mail",88,53,"wave"],"yzSight":["sight",52,73,"wave"]}}},
  han:{S:{"yzTr":[55,64],"yzSec":[36,66],"yzMail":[87,68],"yzSight":[55,86]},walk:{"h":[0.07,60,0.001],"look0":[55,64],"N":{"home":[62,80],"tr":[54,70],"sec":[35,72],"mail":[86,82],"sight":[53,88]},"E":"home-tr home-sec home-mail home-sight","HS":{"yzTr":["tr",58,40,"bow"],"yzSec":["sec",36,58,"wave"],"yzMail":["mail",87,62,"wave"],"yzSight":["sight",57,82,"wave"]}}},
  sanguo:{S:{"yzTr":[63,55],"yzSec":[35,58],"yzMail":[88,64],"yzSight":[56,86]},walk:{"h":[0.07,60,0.001],"look0":[63,55],"N":{"home":[60,70],"tr":[62,60],"c":[45,62],"sec":[35,62],"mail":[86,72],"sight":[47,76],"r":[75,82]},"E":"home-tr home-c c-sec home-mail home-sight home-r","HS":{"yzTr":["tr",68,45,"bow"],"yzSec":["sec",35,54,"wave"],"yzMail":["mail",88,60,"wave"],"yzSight":["sight",56,82,"wave"]}}},
  weijin:{S:{"yzTr":[52,56],"yzSec":[29,58],"yzMail":[83,58],"yzSight":[54,82]},walk:{"h":[0.07,60,0.001],"look0":[52,56],"N":{"home":[42,88],"st":[27,74],"c":[35,64],"sec":[28,64],"tr":[48,62],"mail":[82,66],"sight":[52,72]},"E":"home-st st-c c-sec c-tr tr-sight tr-mail","HS":{"yzTr":["tr",54,45,"bow"],"yzSec":["sec",29,51,"wave"],"yzMail":["mail",83,50,"wave"],"yzSight":["sight",54,78,"wave"]}}},
  nanbei:{S:{"yzTr":[50,62],"yzSec":[28,72],"yzMail":[79,58],"yzSight":[74,82]},walk:{"h":[0.07,60,0.001],"look0":[50,62],"N":{"home":[40,84],"tr":[50,70],"c":[34,74],"sec":[30,80],"mail":[78,68],"sight":[70,85]},"E":"home-tr home-c c-sec tr-mail home-sight tr-sight","HS":{"yzTr":["tr",51,48,"bow"],"yzSec":["sec",28,68,"wave"],"yzMail":["mail",79,50,"wave"],"yzSight":["sight",74,76,"wave"]}}},
  sui:{S:{"yzTr":[55,56],"yzSec":[37,66],"yzMail":[86,58],"yzSight":[62,80]},walk:{"h":[0.07,60,0.001],"look0":[55,56],"N":{"home":[30,86],"c":[40,74],"sec":[36,70],"tr":[52,66],"mail":[84,64],"sight":[62,74]},"E":"home-c c-sec c-tr tr-mail tr-sight","HS":{"yzTr":["tr",56,44,"bow"],"yzSec":["sec",37,58,"wave"],"yzMail":["mail",86,52,"wave"],"yzSight":["sight",60,82,"wave"]}}},
  tang:{S:{"yzTr":[63,60],"yzSec":[29,54],"yzMail":[87,72],"yzSight":[63,86]},walk:{"h":[0.07,60,0.001],"look0":[63,60],"N":{"home":[44,78],"c":[40,64],"sec":[27,58],"tr":[58,72],"mail":[84,82],"sight":[58,80]},"E":"home-c c-sec home-tr tr-mail home-sight","HS":{"yzTr":["tr",63,42,"bow"],"yzSec":["sec",29,46,"wave"],"yzMail":["mail",87,66,"wave"],"yzSight":["sight",63,88,"wave"]}}},
  wudai:{S:{"yzTr":[56,56],"yzSec":[37,66],"yzMail":[88,64],"yzSight":[60,86]},walk:{"h":[0.07,60,0.001],"look0":[56,56],"N":{"home":[40,88],"c":[45,74],"sec":[36,76],"tr":[54,68],"mail":[85,72],"sight":[62,84]},"E":"home-c c-sec c-tr tr-mail home-sight c-sight","HS":{"yzTr":["tr",56,40,"bow"],"yzSec":["sec",37,60,"wave"],"yzMail":["mail",88,58,"wave"],"yzSight":["sight",60,84,"wave"]}}},
  song:{S:{"yzTr":[60,60],"yzSec":[27,66],"yzMail":[87,74],"yzSight":[59,86]},walk:{"h":[0.07,60,0.001],"look0":[60,60],"N":{"home":[37,88],"c":[42,74],"sec":[30,72],"tr":[58,68],"mail":[84,84],"sight":[62,88]},"E":"home-c c-sec c-tr tr-mail home-sight tr-sight","HS":{"yzTr":["tr",60,48,"bow"],"yzSec":["sec",27,60,"wave"],"yzMail":["mail",88,66,"wave"],"yzSight":["sight",59,82,"wave"]}}},
  yuan:{S:{"yzTr":[58,60],"yzSec":[38,68],"yzMail":[88,72],"yzSight":[74,86]},walk:{"h":[0.07,60,0.001],"look0":[58,60],"N":{"home":[36,80],"c":[46,72],"sec":[38,72],"tr":[56,66],"mail":[88,84],"sight":[70,84]},"E":"home-c c-sec c-tr tr-mail tr-sight home-sight","HS":{"yzTr":["tr",58,44,"bow"],"yzSec":["sec",39,60,"wave"],"yzMail":["mail",88,66,"wave"],"yzSight":["sight",74,82,"wave"]}}},
  ming:{S:{"yzTr":[54,50],"yzSec":[34,53],"yzMail":[83,62],"yzSight":[56,74]},walk:{"h":[0.07,60,0.001],"look0":[54,50],"N":{"home":[40,72],"st":[38,62],"c":[44,56],"sec":[34,56],"tr":[54,56],"mail":[82,70],"sight":[50,80]},"E":"home-st st-c c-sec c-tr tr-mail home-sight","HS":{"yzTr":["tr",55,38,"bow"],"yzSec":["sec",34,49,"wave"],"yzMail":["mail",83,56,"wave"],"yzSight":["sight",56,70,"wave"]}}},
  qing:{S:{"yzTr":[60,52],"yzSec":[42,64],"yzMail":[88,62],"yzSight":[74,55]},walk:{"h":[0.07,60,0.001],"look0":[60,52],"N":{"home":[34,78],"c":[44,72],"sec":[40,72],"tr":[58,66],"sight":[74,70],"mail":[88,72]},"E":"home-c c-sec c-tr tr-sight sight-mail","HS":{"yzTr":["tr",60,42,"bow"],"yzSec":["sec",42,58,"wave"],"yzMail":["mail",88,58,"wave"],"yzSight":["sight",75,56,"wave"]}}}};
/* 注意：這支比 07w 早載入（同一段 script），最上層不能碰 SHW_YZ（const 暫時死區，typeof 也會丟錯）；el 等其他走路設定由 cfg0（SHW_PG0＋SHW_YZ）合併時帶進來 */
if(typeof SCW!=="undefined")for(const k in YZ_L){const L=YZ_L[k];
  SCW["yizhan/"+k+"_f"]={ready:true,f:"yizhan/"+k+"_f_l1610",w:2560,h:1600,S:L.S,exit:[14,92],safe:{l:.12,r:.12,t:.05,b:.10},walk:Object.assign({W:2560,H:1600,home:"home"},L.walk)}}
/* 換圖重掛走路時（07sw scwWalk 叫 onCfg）：橫式圖記憶名用 yzL:<朝>，原圖照舊 yz:<朝> */
function yzOnCfg(o,k,x){o.pfx=(x&&x.W===2560?"yzL:":"yz:")+k}
/* 開頁就是橫式圖：圖框一開始就帶 scw-l 和 data-scw（07sw scwMount 看 data-scw 決定入口照條目擺；少了它入口會照原圖 % 擺在橫式圖上）。回傳 class 後半＋屬性 */
const yzScwTag=k=>k?` scw-l" data-scw="${k}"`:`"`;
/* 雲河驛站圖上 12 朵小雲（左%、上%＝圓印放在那朵雲的下緣），照 park/yizhan/classic.png 量的：第一排秦漢三國魏晉、第二排南北朝隋唐五代、第三排宋元明清 */
const YZ_ROAD={qin:[17,18],han:[40,17.5],sanguo:[64,18],weijin:[84,18.5],nanbei:[16.5,29.5],sui:[39,31],tang:[64,30],wudai:[86,32],song:[34,40.5],yuan:[46,41],ming:[65,42],qing:[88,43]};
const YZ_SEAL={qin:"秦",han:"漢",sanguo:"三國",weijin:"晉",nanbei:"南北",sui:"隋",tang:"唐",wudai:"五代",song:"宋",yuan:"元",ming:"明",qing:"清"};
/* 史實小牌 [名字, 介紹]：寫法照 story/雲河驛站_規劃.md 第五節（有據的才寫；說法不一的寫「相傳」） */
const YZ_SIGHT={
  qin:["車同軌","秦始皇統一天下以後規定「車同軌」：車子兩個輪子之間的寬度全國都一樣，輪子在路上壓出的車轍才對得上，車走得又快又穩。湖北雲夢睡虎地出土的秦簡裡有一條《行書律》，規定命令和寫著「急」的文書，一收到就要馬上送出去。"],
  han:["烽燧與懸泉置","漢朝在往西域的路上修了許多烽燧：敵人來了，白天燒柴冒煙、夜裡點火，一座接一座把消息傳下去。甘肅敦煌的懸泉置是一處漢代驛站的遺址，四周是厚厚的土牆，考古學家在那裡挖出三萬多枚漢簡，記著來來往往的使者、馬匹和信件。"],
  sanguo:["江上傳書","三國打仗，消息走得快慢常常決定勝負。在長江邊，送軍情、送公文除了騎馬，也常常要坐船過江。"],
  weijin:["亭與耳杯","路邊的亭子是旅人歇腳的地方，也是送別朋友的地方。溪上那種兩邊有「耳朵」、像小船一樣的橢圓形杯子叫耳杯，漢朝到魏晉的人常用它喝酒，古人又叫它「羽觴」。王羲之和朋友在蘭亭「曲水流觴」，漂在水上的就是這種杯子。"],
  nanbei:["折梅寄遠","相傳南北朝的陸凱折了一枝梅花，託驛使帶給遠方的朋友范曄，還附了一首詩：「折花逢驛使，寄與隴頭人。江南無所有，聊贈一枝春。」這首詩的作者和故事，古書的說法不太一樣，所以說「相傳」。"],
  sui:["水驛","隋朝開通大運河以後，南北的船可以一路走水路。到了唐朝，驛站分成陸驛和水驛：陸驛準備馬，水驛準備的是船。"],
  tang:["三十里一驛","唐朝的《唐六典》記載：大約每三十里設一個驛，全國一共一千六百多所，有陸驛、水驛，也有水陸兩用的驛。驛裡養著驛馬，拿著官府憑證的人才能換馬、住宿。唐朝的詩人常在驛站的牆上題詩。"],
  wudai:["斷了的驛路","五代只有五十多年，卻換了五個朝代，到處打仗。驛路常常被戰火切斷，信送不到，逃難的人也找不到家人。"],
  song:["驛和遞鋪","宋朝把「住」和「送」分開：驛和館給來往的官員吃住，送公文交給路邊一間一間的遞鋪。遞送分成步遞、馬遞、急腳遞三等；急的文書用「急腳遞」，更急的還要加上一塊紅漆寫金字的木牌，叫「金字牌急腳遞」，一天要跑五百多里。岳飛被一天連下十二道「金字牌」召回，用的就是這種。"],
  yuan:["站赤","元朝的驛站叫「站赤」。官員和信使要拿著官府發的憑證，例如蓋了御寶的文書或圓牌，才能在站裡換馬、吃住。陸上的站用馬、牛、驢或車，水上的站用船，北方冰天雪地的地方，還有讓狗拉著雪橇（爬犁）在雪地上跑的「狗站」。"],
  ming:["驛、遞運所、急遞鋪","明朝把傳遞分成三種：水馬驛負責接待和換馬換船，遞運所負責運送物資，急遞鋪負責傳送公文。江蘇高郵的盂城驛是明朝洪武年間蓋的，河北懷來的雞鳴驛是一座驛城，兩處到今天都還保存著。"],
  qing:["驛站走入歷史","清朝沿用明朝的驛站，軍情另外走「塘鋪」。清末開辦了新式的郵政，寄信不再靠驛馬；民國初年，用了兩千多年的驛站就慢慢撤掉了。"]};
function yzCss(){if(document.getElementById("yzCss"))return;const s=document.createElement("style");s.id="yzCss";
  s.textContent=`.yz-page .shp-spot{z-index:2}.yz-page.scw-l .po-sight{font-size:2cqw;padding:.45cqw 1.4cqw}.yz-seal{position:absolute;z-index:1;transform:translate(-50%,-50%);width:8.4cqw;height:8.4cqw;min-width:30px;min-height:30px;padding:0;border-radius:50%;border:1.5px solid #2a2018;background:rgba(255,251,242,.92);color:#2a2018;font:900 4.2cqw/1 var(--serif,serif);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 9px 2px rgba(242,201,76,.6)}
.yz-seal::before{content:"";position:absolute;inset:-7px;border-radius:50%}.yz-seal.w2{font-size:3cqw;letter-spacing:-.05em}.yz-seal:active{transform:translate(-50%,-50%) scale(.92)}
.yz-seal.ln{background:#B5452B;color:#fff;border-color:#ffe08a}.yz-seal.lk{background:rgba(232,228,220,.9);color:#9a917f;border-color:#b5ad9c;box-shadow:none}
.yz-seal i{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#e0362c;border:1.5px solid #fff}
.yz-nolist{display:none}.yz-more{position:absolute;z-index:3;top:12px;right:12px;padding:5px 11px;border-radius:99px;border:1px solid rgba(255,224,138,.7);background:rgba(20,16,12,.55);color:#ffe08a;font:800 13px/1.2 var(--serif,serif);cursor:pointer}.yz-more::before{content:"";position:absolute;inset:-8px}.yz-more:active{transform:scale(.95)}
.yz-fog{position:absolute;z-index:1;transform:translate(-50%,-50%);width:27cqw;height:15cqw;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,rgba(246,243,236,.97),rgba(246,243,236,.85) 55%,rgba(246,243,236,0))}`;
  document.head.append(s)}
/* 有幾封沒讀的信：k＝classic 算全部，其他只算寄自那一朝的 */
function yzUnread(k){try{const M=npcBonds();return npcLetters().filter(n=>(k==="classic"||n.era===k)&&!(M[n.id]||{}).r).length}catch(e){return 0}}
function yzMail(k){const M=npcBonds(),L=npcLetters().filter(n=>k==="classic"||n.era===k);
  sheet(k==="classic"?"📮 信箱":"📮 寄自"+eraLabel(k)+"的信",b=>{b.innerHTML=(typeof chdMailRow==="function"?chdMailRow(k):"")/* 意見回饋 774 故國舊夢：角色寄不出去的信 */+(L.length?`<div class="items" style="padding:0">${L.map(n=>`<button class="item" data-yzm="${esc(n.id)}"><span class="lb" style="font-size:22px">💌</span><span class="tx"><b>${esc(n.name)}的信${M[n.id]&&M[n.id].r?"":" 🆕"}</b><span>寄自${esc(eraLabel(n.era))}</span></span><span class="muted">›</span></button>`).join("")}</div>`
      :typeof chdMailRow==="function"&&chdMailRow(k)?"":`<p class="muted" style="line-height:1.7;margin:0">${k==="classic"?"還沒有信。園子裡的女棋手羈絆到第 3 級，她會寫信寄來這裡。":"還沒有寄自"+esc(eraLabel(k))+"的信。這一朝的女棋手羈絆到第 3 級，她的信會先送到這裡。"}</p>`)+(k==="classic"?"":`<button class="btn ghost" id="yzAll" style="width:100%;margin-top:10px">📮 看全部的信</button>`);
    if(typeof chdMailBind==="function")chdMailBind(b);b.querySelectorAll("[data-yzm]").forEach(y=>y.onclick=()=>{const n=PARK_NPC.find(z=>z.id===y.dataset.yzm);closeSheet();if(n)setTimeout(()=>npcMail(n,()=>route()),260)});
    const a=b.querySelector("#yzAll");if(a)a.onclick=()=>{closeSheet();setTimeout(()=>yzMail("classic"),260)}})}
/* 旅人、秘境棋友：把清單上原本的按鈕複製到小窗，點了轉給原本的按鈕 */
function yzPick(v,ids,title,note){const rows=[...v.querySelectorAll("[data-inn]")].filter(b=>ids.includes(b.dataset.inn)).map(b=>b.outerHTML.replace(/data-inn=/g,"data-yzp=")).join("");
  sheet(title,b=>{b.innerHTML=`<p class="muted" style="font-size:13px;line-height:1.6;margin:0 0 8px">${note}</p><div class="items" style="padding:0">${rows}</div>`;
    b.querySelectorAll("[data-yzp]").forEach(y=>y.onclick=()=>{const id=y.dataset.yzp;closeSheet();setTimeout(()=>{const t=v.querySelector('[data-inn="'+id+'"]');if(t&&!t.disabled)t.click()},260)})})}
/* 意見回饋 777（開發者）：滿版圖已經放得下所有入口，圖下面的清單收起來（YZ_NOLIST_ON）。清單還在畫面裡（只是藏著），旅人、秘境棋友、信箱照舊轉給它；
   圖上沒有熱點的入口（羈絆、棋史卡冊、輿圖、消寒圖、各朝的點將台、走去園子／擂台，以及之後別人加進清單的按鈕）都收在右上角「☰ 其他」：小窗裡列的是清單上原本的按鈕，點了轉給原本的按鈕 */
const YZ_NOLIST_ON=true;
const YZ_MORE_ON=false;   /* 意見回饋 780（開發者）：「☰ 其他」點進去內容太複雜，拿掉；羈絆、棋史卡、輿圖、消寒圖在「我的角色」頁都有，點將台在雲河驛站 */
function yzLing(){sheet("🏯 點將台",b=>{b.innerHTML='<div id="lingBox"></div>';lingShopBind(b)})}
function yzMore(v,k,pad){const C=pad.querySelector(".card"),B=[...pad.querySelectorAll("button")].filter(b=>!b.closest("#lingBox")&&!b.hasAttribute("data-inn")&&!b.hasAttribute("data-mail")&&b.id!=="toShip"&&!b.disabled);
  B.forEach((b,i)=>b.dataset.yzi=i);
  const row=(ic,t,s,a)=>`<button class="item" ${a}><span class="lb" style="font-size:22px">${ic}</span><span class="tx"><b>${t}</b>${s?`<span>${s}</span>`:""}</span><span class="muted">›</span></button>`;
  const one=x=>x.classList.contains("item")?x.outerHTML.replace(/\sid="[^"]*"/,"").replace(/data-yzi=/,"data-yzr="):`<button class="item" data-yzr="${x.dataset.yzi}"><span class="tx"><b>${x.innerHTML}</b></span><span class="muted">›</span></button>`;
  let H="",cur="",n=0;for(const e of pad.querySelectorAll(".sec-t,button")){if(e.classList.contains("sec-t")){cur=`<div class="sec-t" style="margin-top:10px">${e.innerHTML}</div>`;continue}if(!B.includes(e))continue;H+=cur+one(e);cur="";n++}
  sheet("☰ 其他",b=>{b.innerHTML=(C?`<div class="card" style="line-height:1.7;font-size:14px;margin-bottom:8px">${C.innerHTML}</div>`:"")+`<div class="items" style="padding:0">${H}${k==="classic"?"":row("🏯","點將台","將令 "+lingN()+" 枚",'id="yzMLing"')}${row("📋","顯示完整清單","圖下面原本的清單","id=\"yzMList\"")}</div>`;
    b.querySelectorAll("[data-yzr]").forEach(y=>y.onclick=()=>{const t=pad.querySelector('[data-yzi="'+y.dataset.yzr+'"]');closeSheet();if(t)setTimeout(()=>t.click(),260)});
    const L=b.querySelector("#yzMLing");if(L)L.onclick=()=>{closeSheet();setTimeout(yzLing,260)};
    b.querySelector("#yzMList").onclick=()=>{closeSheet();pad.classList.remove("yz-nolist");setTimeout(()=>pad.scrollIntoView({behavior:"smooth",block:"start"}),300)}})}
function yzSight(k){const s=YZ_SIGHT[k];if(!s)return;vibrate(5);const show=()=>sheet("📍 "+s[0],b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(innName(k))}</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(s[1])}</p>`});
  (typeof relicSightDrop==="function"?relicSightDrop("y",k,s[0]):typeof relicDrop==="function"?relicDrop(k,.15):Promise.resolve(false)).then(got=>{if(!got)show()}).catch(show)}
function yzInn(v,k){if(!YZ_ON||!YZ_READY.has(k))return;const S=YZ_SPOT[k],pad=v.querySelector(".pad");if(!S||!pad)return;yzCss();
  const T=SHIP_STOP[k]||{},nu=yzUnread(k),Sx=jSecrets();
  const sp=[["yzTr",S.tr,"🏮 路過的旅人",(YZ_NOLIST_ON?"Lv "+xpInfo().L+"・":"")+(INN.length+(typeof igCount==="function"?igCount(k):0))+" 位・下棋練等","hot"],["yzSec",S.sec,"🗝 秘境棋友","找到 "+Object.keys(Sx).length+"／"+SECRETS.length],["yzMail",S.mail,k==="classic"?"📮 信箱":"📮 這一朝的信",nu?"🆕 "+nu+" 封新信":"書信往來"]];
  if(S.ling)sp.push(["yzLing",S.ling,"🏯 點將台","將令 "+lingN()+" 枚"]);
  const road=k!=="classic"||!YZ_ROAD_ON?"":SHIP_ROUTE.filter(e=>e!=="classic"&&YZ_ROAD[e]).map(e=>{const p=YZ_ROAD[e],lk=eraLocked(e),SS=typeof sealOf==="function"?(sealCss(),sealOf(e)):null,ln=!lk&&(SS?SS.n>0:shipLearned(e)),gd=ln&&SS&&SS.gold,u=!lk&&yzUnread(e),t=YZ_SEAL[e]||eraLabel(e);
    return(lk?`<i class="yz-fog" style="left:${p[0]}%;top:${p[1]-3.5}%"></i>`:"")+`<button class="yz-seal${lk?" lk":ln?" ln":""}${gd?" gd":""}${t.length>1?" w2":""}" data-yze="${e}" style="left:${p[0]}%;top:${p[1]}%" aria-label="${esc(innName(e))}${lk?"（星槎還沒停靠）":gd?"（千秋印鑄成金印了）":ln?`（千秋印亮了 ${SS?SS.n+"／"+SS.N:""} 邊）`:""}${u?"，有新信":""}">${esc(t)}${u?"<i></i>":""}</button>`}).join("");
  const sub=k==="classic"?(YZ_ROAD_ON?"旅人歇腳、書信往來；千秋驛路通往各朝驛站":"旅人歇腳、書信往來；要去各朝，從星槎的千秋石枰啟程"):esc((k==="classic"?"":eraLabel(k)+"・")+(T.place||"")),si=YZ_SIGHT[k]&&S.sight;
  const d=document.createElement("div");
  /* W107-L：iPad 橫向有專用橫式圖（07sw SCW，條目在上面 YZ_L）就一開始載那張；入口、景點、出口照條目 */
  const src=`data/yizhan/${k}${YZ_IMG}.webp${k==="classic"?"?v="+YZ_CLV:""}`,pre=typeof scwPre==="function"?scwPre(v,src):{src,k:""};
  d.innerHTML=`<div class="shp-page cq yz-page${yzScwTag(pre.k)}><img src="${pre.src}" alt="${esc(innName(k))}" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='data/yizhan/${k}_c.webp'}">${road}<div class="shp-cap"><b>🏮 ${esc(innName(k))}</b><small>${sub}</small></div>${sp.map(([id,p,b,sm,cl])=>`<button class="shp-spot${cl?" "+cl:""}" id="${id}" style="left:${p[0]}%;top:${p[1]}%"><b>${b}</b>${sm?`<small>${sm}</small>`:""}</button>`).join("")}${si?`<button class="po-sight" id="yzSight" style="left:${S.sight[0]}%;top:${S.sight[1]}%">📍 ${esc(YZ_SIGHT[k][0])}</button>`:""}</div>`;
  const pg=d.firstElementChild;v.insertBefore(pg,pad);if(typeof yzColor==="function")yzColor(pg,k);   /* 11/16 進門從水墨暈開成全彩（07p-portcolor.js） */const ab=pad.querySelector(".abn");if(ab)ab.remove();
  if(YZ_NOLIST_ON){pad.classList.add("yz-nolist");if(YZ_MORE_ON)pg.insertAdjacentHTML("beforeend",'<button class="yz-more" id="yzMore" aria-label="其他入口：羈絆、棋史卡冊、輿圖、消寒圖、點將台、走去園子和擂台">☰ 其他</button>')}
  const on=(q,fn)=>{const e=pg.querySelector(q);if(e)e.onclick=()=>{vibrate(5);fn()}};
  on("#yzTr",()=>yzPick(v,INN.map(x=>x.id).concat(typeof igIds==="function"?igIds(k):[]),"🏮 路過的旅人","驛站裡都是路過的旅人，找誰下都可以、下幾次都可以。"));
  on("#yzSec",()=>{const rw=typeof secAllReward==="function"?secAllReward():null;if(rw)setTimeout(()=>sheet("📜 雲河尋訪錄",b=>{b.innerHTML=secAllNote(rw)}),400);   /* W96：更新前就找齊六位的老玩家，打開清單時補發拓本（secAllReward 自己防重複） */
    const nS=Object.keys(Sx).length;yzPick(v,SECRETS.map(x=>x.id),"🗝 秘境棋友",nS>=SECRETS.length?`六位都找到了，找誰下都可以。`:`找到 ${nS}／${SECRETS.length} 位。還沒找到的藏在各朝代的園子裡；點將台可以用將令換線索。`)});
  on("#yzMail",()=>yzMail(k));on("#yzLing",()=>{if(YZ_NOLIST_ON&&pad.classList.contains("yz-nolist"))return yzLing();const L=v.querySelector("#lingBox");if(L)L.scrollIntoView({behavior:"smooth",block:"start"})});on("#yzMore",()=>yzMore(v,k,pad));on("#yzSight",()=>yzSight(k));
  pg.querySelectorAll("[data-yze]").forEach(b=>b.onclick=()=>{const e=b.dataset.yze;vibrate(5);if(eraLocked(e)){toast(eraLockMsg(e));return}shipGoTo(e,()=>route())});
  /* W107-L：掛上 07sw（換圖、退回原圖、入口換位置）；走路設定 cfg0 跟 07w 的 shwYz 同一份。開頁就是橫式圖時這裡先照條目掛走路，07w 包的那次 shwPage 看到已掛過就略過 */
  if(typeof scwMount==="function"&&typeof SHW_YZ!=="undefined"&&SHW_YZ[k]){const cfg=Object.assign({},SHW_PG0,SHW_YZ[k]),o={key:scwKey(src),src0:src,ids:["yzTr","yzSec","yzMail","yzLing","yzSight"],pfx:"yz:"+k,cfg0:cfg,onCfg:x=>yzOnCfg(o,k,x)};
    scwMount(pg,o);if(pre.k&&scwCur(pg)){const c=scwWalkCfg(o,scwCur(pg));yzOnCfg(o,k,c);pg._scwW="l";
      try{if(typeof shwPage==="function"&&typeof SHW_YZ_ON!=="undefined"&&SHW_YZ_ON&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,c,o.pfx,()=>!document.querySelector(".walkc"))}catch(e){}}}
  shpFit(v)}
