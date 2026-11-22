/* ===== W48-S3 仕角炮門「當鋪算兌子」（開發者 11/22 選單：193 第一批之一；規格照 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 8 節＋_Claude審稿.md） =====
   掌門方硯冰是蘇州當鋪朝奉。盤上有一顆對方的子被你捉著，吃下去會引發一串互吃：玩家選「吃」或「不吃」，答完列出兌換帳。
   ・子力表：車 9、馬 4、炮 4.5、仕象各 2、兵 1、過河兵 2（兵卒在吃掉的那一格已過河就算 2）
   ・互吃用程式窮舉（只算這一格的互吃，雙方每一步都可以選擇停手，取對自己最好的），不用引擎；著法合法與否照 core.js（含牽制、炮架）
   ・題目由 tools/shijiao-build.js 從大師對局挑出、寫進下面 JH_SJ_Q（不另放資料檔，預覽站也能玩）；CI 用同一支 jhSjSee 重算核對
   ・難度三級：初級互吃 1～2 步、中級 2～3 步（帳裡有過河兵或仕象）、高級 3～4 步（帳裡有炮或車）；你一律執紅、輪紅走
   ・一輪 3 題，全對每天修為 +10（只給一次）；不扣修為、不改棋局
   對外：jhShijiaoOpen()（門內頁的入口、座標等仕角炮門門內圖出好後由 07z9b 那邊接） */
const JH_SJ_V={R:9,N:4,C:4.5,A:2,B:2,P:1};
/* 一顆子在 sq 這一格被吃掉值多少分：兵卒在這一格已過河算 2 */
function jhSjVal(p,sq){const T=String(p).toUpperCase();if(T==="P"){const r=sq/9|0,red=p===T;if(red?r<=4:r>=5)return 2}return JH_SJ_V[T]||0}
/* 窮舉 T 這一格的互吃：s＝輪走方；forced＝這一步一定要吃（玩家選了「吃」）。
   回傳 {v：輪走方從這裡開始的淨得失, pv：照最好走法的每一步 {f,t,p 吃的子,cap 被吃的子,val 被吃的子值幾分}, chk：帳裡有沒有哪一步是將軍}
   不吃時 v＝0、pv 空；forced 卻吃不到時回 null。分數相同時選停手（帳最短） */
function jhSjSee(C,b,s,T,forced){
  let best=forced?null:{v:0,pv:[],chk:false};
  const cap=b[T];if(!cap||C.sideOf(cap)===s||cap.toUpperCase()==="K")return best;
  for(const [f,t] of C.legal(b,s)){if(t!==T)continue;
    const g=jhSjVal(cap,T),nb=C.make(b,f,t),r=jhSjSee(C,nb,C.opp(s),T,false),v=g-r.v;
    if(!best||v>best.v)best={v,pv:[{f,t,p:b[f],cap,val:g}].concat(r.pv),chk:C.inCheck(nb,C.opp(s))||r.chk}}
  return best}
/* 題庫：id、lv（1 初 2 中 3 高）、fen（輪紅走）、t（被捉的那一格，0～89）、ans（y 吃／n 不吃）、v（選吃之後紅方淨得失）、pv（吃下去照最好走法的每一步，UCI）、src（大師對局索引@手數）
   這一段由 xiangqi-lab/tools/shijiao-build.js 產生，不要手改 */
/* ==JH_SJ_Q== */
const JH_SJ_Q=[
{"id":"s01","lv":1,"fen":"r1b1kabr1/4a1c2/1cn3n2/p1p1p1R1p/6p2/2PN5/P3P1P1P/1C2C1N2/9/R1BAKAB2 w - - 0 1","t":24,"ans":"n","v":-5,"pv":["g6g7","b7g7"],"src":"gm0@16"},
{"id":"s02","lv":1,"fen":"r1baka3/9/2ncb1nc1/p3p2Cp/2p3p2/2P6/P3P1P1P/2N1C3N/9/1RBAKAB2 w - - 0 1","t":27,"ans":"n","v":-3.5,"pv":["h6a6","a9a6"],"src":"gm15838@18"},
{"id":"s03","lv":1,"fen":"2bakabr1/9/1c4nc1/4p1pRp/1np6/r5P2/2P1P3P/N1C1C1N2/9/R1BAKAB2 w - - 0 1","t":25,"ans":"n","v":-4.5,"pv":["h6h7","h9h7"],"src":"gm23757@16"},
{"id":"s04","lv":1,"fen":"1rb1kab2/4a4/nc4n1c/p1p1p1p1p/3r5/P5P2/2P1P3P/N1CC2N2/9/1RBAKABR1 w - - 0 1","t":19,"ans":"n","v":-4.5,"pv":["b0b7","b9b7"],"src":"gm8064@16"},
{"id":"s05","lv":1,"fen":"1r1akab1r/9/1cn1b2c1/p1p1p4/6p1p/2PN5/P3P1P1n/4C1C1N/8R/1RBAKAB2 w - - 0 1","t":19,"ans":"n","v":-4.5,"pv":["b0b7","b9b7"],"src":"gm15983@16"},
{"id":"s06","lv":1,"fen":"r1bak2r1/4a4/1c2b1nc1/1C2p1pRp/pnp6/5NP2/P1P1P3P/N3C4/9/R1BAKAB2 w - - 0 1","t":31,"ans":"y","v":1,"pv":["f4e6"],"src":"gm23902@16"},
{"id":"s07","lv":1,"fen":"r1b1kabn1/4a4/n1c1c4/p3C1p1p/9/2p6/P3P1P1P/N3C1N2/9/1RBAKAB2 w - - 0 1","t":35,"ans":"y","v":1,"pv":["e6i6"],"src":"gm16128@18"},
{"id":"s08","lv":1,"fen":"2bak3r/4a4/2ncb1n1c/p1p1p1p1p/1r7/2P3P2/P3P3P/N1C1B1C2/3R5/2BAKA1NR w - - 0 1","t":29,"ans":"y","v":1,"pv":["c2c6"],"src":"gm24047@16"},
{"id":"s09","lv":1,"fen":"rnbakab2/3r5/2c1c1n2/p3p2Cp/6p2/2p6/P3P1P1P/N3C1N2/4A4/1RB1KABR1 w - - 0 1","t":1,"ans":"n","v":-5,"pv":["b0b9","a9b9"],"src":"gm8354@16"},
{"id":"s10","lv":1,"fen":"r2akab2/9/1cn1b1c2/p1C4rp/5n3/2PNp4/P3P1P1P/1C2B3N/4A4/3RKAB1R w - - 0 1","t":49,"ans":"y","v":2,"pv":["e3e4"],"src":"gm16273@22"},
{"id":"s11","lv":1,"fen":"2baka3/3r4r/n1c1b1nc1/p1p1pR1Cp/6p2/1NP6/P3P1P1P/1C2B4/9/2BAKA1NR w - - 0 1","t":29,"ans":"n","v":-3,"pv":["b4c6","a7c6"],"src":"gm580@16"},
{"id":"s12","lv":1,"fen":"r3kab2/3Ra4/2n1b1n2/pc2p3p/2p3p1c/2P1R4/P3P1P1P/1CN1C1N2/7r1/2BAKAB2 w - - 0 1","t":31,"ans":"n","v":-8,"pv":["e4e6","c7e6"],"src":"gm8499@22"},
{"id":"s13","lv":1,"fen":"1r2kabr1/4a4/c1n1b1n2/pRp1p3p/6p2/2P1P2c1/P5P1P/2NCC1N2/4A4/2B1KABR1 w - - 0 1","t":27,"ans":"n","v":-8,"pv":["b6a6","c7a6"],"src":"gm24337@20"},
{"id":"s14","lv":1,"fen":"2bakac2/3r5/1c2b1n2/p3pRpCp/1np6/6P2/P1P1P3P/N2CB1N2/4A4/2BAK4 w - - 0 1","t":33,"ans":"n","v":-8,"pv":["f6g6","g9g6"],"src":"gm16563@24"},
{"id":"s15","lv":1,"fen":"2ba3R1/4ak3/4b4/8C/2p1p4/P8/4cr2P/1n2B3C/2cNA4/4KAB2 w - - 0 1","t":58,"ans":"y","v":0.5,"pv":["d1e3","f3e3"],"src":"gm1015@60"},
{"id":"s16","lv":1,"fen":"2nakab2/5R3/nrR1C2r1/p3p3p/9/6P2/P8/9/4A4/2BA1KB2 w - - 0 1","t":19,"ans":"y","v":4.5,"pv":["e7b7","c9b7"],"src":"gm8934@56"},
{"id":"s17","lv":1,"fen":"rC2kab2/4a4/c4nn1r/p1N1p1p2/2b5p/C8/P3P1c1P/6N2/9/1RBAKABR1 w - - 0 1","t":18,"ans":"y","v":0.5,"pv":["c6a7","c5a7"],"src":"gm24772@28"},
{"id":"s18","lv":1,"fen":"r2akab2/1R7/c2rb1n2/p1n1p3p/1N4p2/7R1/P3P1P1P/4C1N2/9/2BAKAB2 w - - 0 1","t":18,"ans":"y","v":0.5,"pv":["b5a7","a9a7"],"src":"gm1450@28"},
{"id":"s19","lv":1,"fen":"4kab2/4a4/1c2b4/p1P1N3p/1C1rr4/9/P5R1P/4B4/4A4/3A1KB2 w - - 0 1","t":40,"ans":"y","v":4.5,"pv":["b5e5","d5e5"],"src":"gm9949@54"},
{"id":"s20","lv":1,"fen":"1rb1kab2/4aR3/2n1r4/p1p5p/3NC1pn1/2P6/1c2c3P/C7B/9/1RBAKA3 w - - 0 1","t":22,"ans":"y","v":5,"pv":["d5e7","c9e7"],"src":"gm2755@40"},
{"id":"s21","lv":2,"fen":"1r2kabr1/4a4/2n1b1n2/p3p3p/6p2/3CP1P2/P5ccP/2NCB1N2/5R3/2RAKAB2 w - - 0 1","t":42,"ans":"n","v":-1,"pv":["g4g5","e7g5"],"src":"gm7919@28"},
{"id":"s22","lv":2,"fen":"2baka3/5r2r/nc1cb1n2/p1p1p3p/6p2/P6R1/2P1P1P1P/NC1C2N2/5R3/2BAKAB2 w - - 0 1","t":3,"ans":"n","v":-2.5,"pv":["d2d9","e9d9"],"src":"gm145@16"},
{"id":"s23","lv":2,"fen":"1rbak1br1/4a4/c1n2cn2/p1p1p3p/6p2/2PN5/P3P1P1P/R2CC1N2/9/2BAKABR1 w - - 0 1","t":3,"ans":"n","v":-2.5,"pv":["d2d9","e9d9"],"src":"gm290@16"},
{"id":"s24","lv":2,"fen":"1rbaka2r/9/n2cb1nc1/2p1p3p/p8/6R2/P1P1P3P/N2CB1NC1/9/2BAKA2R w - - 0 1","t":3,"ans":"n","v":-2.5,"pv":["d2d9","e9d9"],"src":"gm8209@16"},
{"id":"s25","lv":2,"fen":"2bakn3/4a4/1c2b2c1/r5p1p/pnp1p4/2P6/P3N1P1P/1C2C1N2/R8/2BAKAB2 w - - 0 1","t":38,"ans":"n","v":-1,"pv":["c4c5","e7c5"],"src":"gm435@22"},
{"id":"s26","lv":2,"fen":"1nbaka3/9/4b1n1c/p1C1p3p/4c1p2/2P3P2/P7P/N3C1N2/4A4/2B1KAB2 w - - 0 1","t":42,"ans":"n","v":-1,"pv":["g4g5","e7g5"],"src":"gm24192@26"},
{"id":"s27","lv":2,"fen":"1R1akab2/9/4b1n2/p3n2cp/2p1C1p2/3r1NP2/P1P1N3P/4B4/4A4/4KAB2 w - - 0 1","t":22,"ans":"n","v":-2.5,"pv":["e5e7","g9e7"],"src":"gm8644@38"},
{"id":"s28","lv":2,"fen":"2r1kab2/n2Ra4/4b1n2/p1N1p3p/6p2/2P2N1r1/4P3P/1C2B3B/4AR3/c3KA3 w - - 0 1","t":22,"ans":"n","v":-2,"pv":["c6e7","g9e7"],"src":"gm870@42"},
{"id":"s29","lv":2,"fen":"2bak4/4a4/c3b1n1c/4p1C1p/p2n3r1/2R3P2/P3P3P/2NCB1N2/9/3AKAB2 w - - 0 1","t":2,"ans":"n","v":-7,"pv":["c4c9","e7c9"],"src":"gm8789@30"},
{"id":"s30","lv":2,"fen":"r3ka1r1/4a4/1c2b1nc1/p3p3p/1nbR2p2/9/P3P1P1P/N1C1C1N2/9/2BAKABR1 w - - 0 1","t":38,"ans":"n","v":-7,"pv":["d5c5","e7c5"],"src":"gm16708@20"},
{"id":"s31","lv":2,"fen":"4kab2/4a4/n3b1c2/1Rc6/8P/p1n1P1B2/2r3PC1/4B1N2/4A4/1N2KA3 w - - 0 1","t":47,"ans":"y","v":2,"pv":["e2c4","c3c4"],"src":"gm10094@60"},
{"id":"s32","lv":2,"fen":"2baka3/6r2/nR2bRn2/2N1p1p1p/pr7/P8/2P1c1P1P/2C1B2C1/4A4/2BAK4 w - - 0 1","t":18,"ans":"y","v":2,"pv":["c6a7","c9a7","b7a7"],"src":"gm2465@28"},
{"id":"s33","lv":2,"fen":"2c1kab2/4a4/4b1C2/p2Rp3p/2p6/r1c3p2/4P3P/2C1B4/4AN3/2BAK4 w - - 0 1","t":47,"ans":"y","v":2.5,"pv":["e2c4","c9c4"],"src":"gm26367@44"},
{"id":"s34","lv":2,"fen":"1n2kab2/4a4/4b4/p7p/2c5n/4C1P1P/P3N4/C5c2/9/2BAKAB2 w - - 0 1","t":44,"ans":"y","v":2,"pv":["i4i5","i6i5"],"src":"gm4060@58"},
{"id":"s35","lv":2,"fen":"4kabn1/4a4/4b2c1/p7p/3rc1p2/1R2P4/P5P1P/6N2/4A4/1NB1KAB2 w - - 0 1","t":40,"ans":"y","v":2.5,"pv":["e4e5","d5e5"],"src":"gm12269@32"},
{"id":"s36","lv":2,"fen":"2bak4/2c1a4/n3b4/2p1p1p1p/p2r2n2/2P1P1PR1/P3r3P/N3C1N2/4A4/2B1KAB2 w - - 0 1","t":42,"ans":"y","v":2,"pv":["g4g5","e7g5"],"src":"gm28107@32"},
{"id":"s37","lv":2,"fen":"4kabr1/4a4/6n2/p3p3p/2Pn2p2/9/Pc1r2PcP/1CN1C4/4A4/R1B1KABR1 w - - 0 1","t":39,"ans":"y","v":2,"pv":["c5d5","d3d5"],"src":"gm12559@26"},
{"id":"s38","lv":2,"fen":"2bakab2/9/2c3n2/1Rn1p1p1p/p4N3/6P2/P2rP3P/3cB1N2/4A3C/3AK1B2 w - - 0 1","t":66,"ans":"y","v":2.5,"pv":["e1d2","d3d2"],"src":"gm28397@40"},
{"id":"s39","lv":2,"fen":"1nbaka3/1C2cR3/4b4/pPc1p3p/3r1n3/1R7/P1r5P/3CB4/4A4/2BAKN3 w - - 0 1","t":29,"ans":"y","v":2.5,"pv":["b6c6","c3c6"],"src":"gm13139@40"},
{"id":"s40","lv":2,"fen":"2bak4/4a4/4b1n2/p1C1p1R1p/5r3/9/P3P4/4Bc3/4A4/2BAK4 w - - 0 1","t":68,"ans":"y","v":2.5,"pv":["e1f2","f5f2"],"src":"gm29412@54"},
{"id":"s41","lv":3,"fen":"1r2kabr1/4a4/2n1b2c1/p1p1p2Rp/1c3np2/PR7/2P1P1P1P/N1C1C1N2/9/2BAKAB2 w - - 0 1","t":31,"ans":"y","v":0.5,"pv":["e2e6","c7e6","h6e6"],"src":"gm16418@18"},
{"id":"s42","lv":3,"fen":"1r2kabr1/3na4/4b1n2/pCp1p1p1p/9/2c2NP2/P3P3P/N3C4/7c1/1RBAKABR1 w - - 0 1","t":31,"ans":"y","v":0.5,"pv":["b6e6","d8e6","f4e6"],"src":"gm725@18"},
{"id":"s43","lv":3,"fen":"1rbak3r/4a4/1cn1bc3/p3p2Rp/5np2/2R6/P3P1P1P/2NCC1N2/9/2BAKAB2 w - - 0 1","t":31,"ans":"y","v":0.5,"pv":["e2e6","c7e6","h6e6"],"src":"gm24482@20"},
{"id":"s44","lv":3,"fen":"4kab2/4a4/n3b3n/1Rc3c1C/3r5/4C3P/4P3N/4B4/2N1A4/4KAB2 w - - 0 1","t":29,"ans":"y","v":4,"pv":["i6c6","a7c6","b6c6"],"src":"gm24627@52"},
{"id":"s45","lv":3,"fen":"3ak4/r3a4/1c2b1n2/p2Rn3p/2p3p2/6P2/P1P1N2c1/2N1C4/9/2BAKAB2 w - - 0 1","t":31,"ans":"y","v":3.5,"pv":["e2e6","g7e6","d6e6"],"src":"gm16998@36"},
{"id":"s46","lv":3,"fen":"2c1kab2/4a4/4b2c1/p8/2nCp1pnp/1NR6/Pr2P1P1P/4B3N/4A4/2CAK1B2 w - - 0 1","t":38,"ans":"y","v":1.5,"pv":["c0c5","e7c5","c4c5"],"src":"gm9224@42"},
{"id":"s47","lv":3,"fen":"1cC1kab2/r3a4/2n4r1/p1R1n3p/2p1p1p2/4c4/P3N1P1P/2N1C4/9/1RBAKAB2 w - - 0 1","t":38,"ans":"n","v":-4,"pv":["c6c5","e6c5","c9c5"],"src":"gm1885@32"},
{"id":"s48","lv":3,"fen":"2bk1a3/5n3/2Can3b/pr6p/2P1R1p2/9/6P1P/4C1N2/9/c1BAKAB2 w - - 0 1","t":22,"ans":"y","v":1.5,"pv":["c7e7","c9e7","e5e7"],"src":"gm2030@48"},
{"id":"s49","lv":3,"fen":"4kab2/R1n1a4/9/3np1N1p/2R6/3r2P2/P7P/Nr1pB4/4A4/2BAK4 w - - 0 1","t":11,"ans":"n","v":-1,"pv":["a8c8","d6c8","c5c8"],"src":"gm17868@58"},
{"id":"s50","lv":3,"fen":"3akab2/9/2n1b1n2/p1p1p3p/3NP1p2/2P6/P3c1r1c/C1N1C4/4AR3/1rB1KAB2 w - - 0 1","t":58,"ans":"y","v":1,"pv":["d5e3","i3e3","c2e3","g3e3"],"src":"gm2320@26"},
{"id":"s51","lv":3,"fen":"1rb1ka3/4a2R1/4bcn2/p3p1C1p/2pn5/5RP2/P1P1P3P/N4CN2/c2rA4/2BAK1B2 w - - 0 1","t":23,"ans":"y","v":2,"pv":["f2f7","e8f7","f4f7"],"src":"gm10674@26"},
{"id":"s52","lv":3,"fen":"3akab2/c4r1r1/2n1b2c1/p1R4RC/6p2/2P1p4/P3P1n1P/2NC2N2/4A4/2B1KAB2 w - - 0 1","t":27,"ans":"n","v":-4,"pv":["c6a6","c7a6","h6a6"],"src":"gm11399@30"},
{"id":"s53","lv":3,"fen":"2baka1r1/4c4/1c2b1n2/4C1pRp/2p6/5NP2/2n1P3P/1NC6/9/2BAKAB2 w - - 0 1","t":35,"ans":"n","v":-4,"pv":["h6i6","g7i6","e6i6"],"src":"gm27382@26"},
{"id":"s54","lv":3,"fen":"4kab2/4a4/4b4/p2r4p/3np2r1/P1R1c4/2P1N1P1n/C3C3B/1R2A4/2B1KA3 w - - 0 1","t":49,"ans":"y","v":2,"pv":["e2e4","e5e4","c4e4"],"src":"gm3770@46"},
{"id":"s55","lv":3,"fen":"1R3ab1C/3ka4/3c5/4p4/p8/2P3p2/P3P1n1P/2r1B1N2/4A4/4KAB2 w - - 0 1","t":5,"ans":"n","v":-0.5,"pv":["i9f9","e8f9","b9f9"],"src":"gm27962@52"},
{"id":"s56","lv":3,"fen":"3k1abn1/1R2a4/1c2b4/p3C3p/4p1p2/9/P3P1P1P/1r2B1N2/9/2BAKA3 w - - 0 1","t":13,"ans":"n","v":-0.5,"pv":["e6e8","f9e8","b8e8"],"src":"gm4785@34"},
{"id":"s57","lv":3,"fen":"3ak1b1r/4a4/2R1b4/9/9/P2c1pB2/4R2p1/9/4A4/2B1KA3 w - - 0 1","t":22,"ans":"n","v":-5,"pv":["c7e7","g9e7","e3e7"],"src":"gm20913@56"},
{"id":"s58","lv":3,"fen":"r1b1kab2/4a4/2nc5/p3p3p/1cp3P1P/2PR5/P3P4/1CN1BC3/4A4/3RKA1r1 w - - 0 1","t":21,"ans":"n","v":-2.5,"pv":["d4d7","e8d7","d0d7"],"src":"gm13284@34"},
{"id":"s59","lv":3,"fen":"3a2R2/4ak3/9/p3p3p/2p2r3/4c1P2/P2R4P/9/N3A4/3K1AB2 w - - 0 1","t":3,"ans":"n","v":-5,"pv":["g9d9","e8d9","d3d9"],"src":"gm13429@56"},
{"id":"s60","lv":3,"fen":"3aka3/9/b2r4b/R7p/2p1pr1n1/p4N3/nRP6/4N4/4A4/2B1KAB2 w - - 0 1","t":54,"ans":"n","v":-3,"pv":["b3a3","a4a3","a6a3"],"src":"gm29992@54"}
];
/* ==/JH_SJ_Q== */

/* 存檔 jhShijiao：lv＝上次選的難度；d＝今天領過修為的日子；best＝一輪最多算對幾題 */
function jhSjGet(){let o=null;try{o=store.get("jhShijiao",null)}catch(e){}o=o&&typeof o==="object"?o:{};
  return{lv:[1,2,3].includes(+o.lv)?+o.lv:1,d:typeof o.d==="string"?o.d.slice(0,12):"",best:Math.max(0,Math.min(3,+o.best||0))}}
function jhSjSet(o){try{store.set("jhShijiao",o)}catch(e){}}
const jhSjDay=()=>typeof jhWindDay==="function"?jhWindDay(new Date()):new Date().toISOString().slice(0,10);
const jhSjHash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h};
/* 一輪 3 題：同一天同一難度第一次打開是固定的 3 題，再玩一輪就換（照時間打散） */
/* 每一題各自用雜湊挑（不用固定步長，免得 3 題常常連號） */
/* FNV 的低位元混得不夠（相鄰種子取餘數只差 1），先打散再用高位元換成 0～n-1 */
const jhSjIdx=(h,n)=>{h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return Math.floor((h>>>0)/4294967296*n)};
function jhSjPick(lv,seed){const L=JH_SJ_Q.filter(q=>q.lv===lv);if(!L.length)return[];const out=[];
  for(let k=0;out.length<Math.min(3,L.length)&&k<L.length*4;k++){const q=L[jhSjIdx(jhSjHash(seed+"|"+k),L.length)];if(!out.includes(q))out.push(q)}
  for(const q of L)if(out.length<Math.min(3,L.length)&&!out.includes(q))out.push(q);return out}
/* 一輪算完：記最好成績；全對而且今天還沒領過才給修為 +10。回傳給了多少 */
function jhSjFinish(right,total){const G=jhSjGet(),d=jhSjDay();G.best=Math.max(G.best,right);let xp=0;
  if(total>0&&right===total&&G.d!==d){G.d=d;xp=10;if(typeof addXP==="function")try{addXP(10,jhL("當鋪算兌子","Pawnshop trades"),"sj:"+d)}catch(e){}}
  jhSjSet(G);return xp}

const jhSjNm=(p)=>{const C=window.XQCore,s=C.sideOf(p),T=String(p).toUpperCase();
  const EN={K:"King",A:"Advisor",B:"Elephant",N:"Horse",R:"Chariot",C:"Cannon",P:"Pawn"};
  return jhL((s==="r"?"紅":"黑")+C.NAMES[s][T],(s==="r"?"Red ":"Black ")+EN[T])};
const jhSjPts=v=>(Math.round(v*10)/10).toString();
const jhSjSum=v=>v>0?"+"+jhSjPts(v):v<0?"−"+jhSjPts(-v):"0";   /* 累計：正數 +、負數用全形減號 −，跟每步的 ± 一致 */
/* 兌換帳：每一步誰吃誰、紅方得失、累計；最後淨賺或淨賠 */
function jhSjLedger(q){const C=window.XQCore,p=q.fen.split(" ");let b=C.parseFen(p[0]),sum=0;const rows=[];
  q.pv.forEach((u,i)=>{const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4)),pc=b[f],cap=b[t],val=jhSjVal(cap,t),red=C.sideOf(pc)==="r";sum+=red?val:-val;
    rows.push({i,f,t,pc,cap,val,red,sum});b=C.make(b,f,t)});
  return{rows,sum}}
/* 答錯時指出是哪一步的得失沒算到 */
function jhSjWhy(q,said){const {rows,sum}=jhSjLedger(q);
  if(said==="y"){const w=rows.filter(r=>!r.red).sort((a,b2)=>b2.val-a.val||a.i-b2.i)[0];
    return w?jhL(`第 ${w.i+1} 步${jhSjNm(w.pc)}吃回你的${jhSjNm(w.cap).slice(1)}，要扣 ${jhSjPts(w.val)} 分；整串算下來淨賠 ${jhSjPts(-sum)} 分。`,`Step ${w.i+1}: ${jhSjNm(w.pc)} takes back your ${jhSjNm(w.cap)}, −${jhSjPts(w.val)}. Net loss ${jhSjPts(-sum)}.`):""}
  if(rows.length===1)return jhL(`對方吃不回來，白賺 ${jhSjPts(sum)} 分。`,`They can't take back: a free ${jhSjPts(sum)}.`);
  return jhL(`對方吃回來不划算，帳算到底你淨賺 ${jhSjPts(sum)} 分。`,`Taking back doesn't pay for them: you net +${jhSjPts(sum)}.`)}

/* PR #37 審查①：被捉的子要一眼看得到。Board 的 hint 是跟棋子一樣大的藍色虛線框，會被棋子蓋住；
   改量那個框的位置，在棋子外面多畫一圈金色粗圈（比棋子大一圈、畫在最上層），原本的框藏起來；Board 重畫不會清掉外加的圈，先清舊的 */
function jhSjMark(svg){if(!svg||!svg.querySelector)return;svg.querySelectorAll(".jh-sj-mark").forEach(x=>x.remove());const r=svg.querySelector('rect[stroke="#2F7FD8"]');if(!r)return;
  const x=+r.getAttribute("x")+ +r.getAttribute("width")/2,y=+r.getAttribute("y")+ +r.getAttribute("height")/2;r.setAttribute("display","none");
  const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
  for(const [k,v] of Object.entries({cx:x,cy:y,r:36,fill:"none",stroke:"#F2B705","stroke-width":6,class:"jh-sj-mark"}))c.setAttribute(k,v);svg.append(c)}
function jhShijiaoOpen(lv0){const G=jhSjGet();let lv=[1,2,3].includes(+lv0)?+lv0:G.lv,Q=[],qi=0,right=0;
  const LV={1:jhL("初級","Easy"),2:jhL("中級","Medium"),3:jhL("高級","Hard")};
  sheet(jhL("🏮 當鋪・算兌子","🏮 Pawnshop · Count the trade"),b=>{const bd=Board(),C=window.XQCore;
    b.innerHTML=`<p class="jh-sj-say">${esc(jhL("方硯冰：「開當鋪最講究算帳，連串互吃算清楚是賺是賠，再決定吃不吃！」","Fang Yanbing: “A pawnbroker lives by the books. Work out the whole chain of captures, then decide whether to take.”"))}</p>
      <div class="jh-actions" id="jhSjLv">${[1,2,3].map(k=>`<button class="btn ghost" data-lv="${k}">${esc(LV[k])}</button>`).join("")}</div>
      <p id="jhSjQ"></p><div id="jhSjB" class="jh-sj-bd"></div>
      <div class="jh-actions" id="jhSjA"><button class="btn" data-a="y">${esc(jhL("吃","Take"))}</button><button class="btn ghost" data-a="n">${esc(jhL("不吃","Don't take"))}</button></div>
      <div id="jhSjS" class="jh-sj-led" style="display:none"></div><div class="jh-actions"><button class="btn" id="jhSjN" style="display:none"></button></div>
      <p class="muted jh-sj-val">${esc(jhL("子力表：車 9・馬 4・炮 4.5・仕象各 2・兵 1・過河兵 2","Values: Chariot 9 · Horse 4 · Cannon 4.5 · Advisor/Elephant 2 · Pawn 1 · Crossed pawn 2"))}</p>`;
    const $=s=>b.querySelector(s);$("#jhSjB").append(bd.svg);
    const start=k=>{lv=k;const g=jhSjGet();g.lv=k;jhSjSet(g);Q=jhSjPick(k,jhSjDay()+"|"+k+"|"+Date.now());qi=0;right=0;
      b.querySelectorAll("[data-lv]").forEach(x=>x.classList.toggle("on",+x.dataset.lv===k));show()};
    const show=()=>{const q=Q[qi];if(!q){$("#jhSjQ").textContent=jhL("這一級的題目還在準備。","Puzzles for this level are on the way.");return}
      const p=q.fen.split(" "),f0=C.parseSq(q.pv[0].slice(0,2));bd.draw(C.parseFen(p[0]),{targets:[q.t],sel:f0,hint:[q.t]});jhSjMark(bd.svg);   /* PR #37 審查①：被捉的子只有 targets 細圈、手機上不明顯，加藍色虛線框（hint） */
      $("#jhSjQ").textContent=jhL(`${LV[lv]}・第 ${qi+1}／${Q.length} 題：你執紅。${jhSjNm(C.parseFen(p[0])[q.t])}被你的${jhSjNm(C.parseFen(p[0])[f0]).slice(1)}捉著（金色圈起來的那一顆）。連串互吃算到底，吃還是不吃？`,
        `${LV[lv]} ${qi+1}/${Q.length}: You are Red. Your ${jhSjNm(C.parseFen(p[0])[f0])} attacks the ${jhSjNm(C.parseFen(p[0])[q.t])} (gold circle). Count the whole exchange: take or not?`);
      $("#jhSjA").style.display="";$("#jhSjS").style.display="none";$("#jhSjN").style.display="none"};
    b.querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>start(+x.dataset.lv));
    b.querySelectorAll("[data-a]").forEach(x=>x.onclick=()=>{const q=Q[qi];if(!q)return;const said=x.dataset.a,ok=said===q.ans;if(ok)right++;$("#jhSjA").style.display="none";
      const {rows,sum}=jhSjLedger(q),last=rows[rows.length-1];
      bd.draw(C.parseFen(q.fen.split(" ")[0]),{targets:[q.t],sel:rows[0].f,hint:[q.t]});jhSjMark(bd.svg);
      const S=$("#jhSjS");S.style.display="";
      S.innerHTML=`<p><b>${esc(ok?jhL("✔ 帳算得精準！該賺就賺、該放就放。","✔ Spot on. Take when it pays, pass when it doesn't."):jhL(`✘ 帳算錯啦，這題該「${q.ans==="y"?"吃":"不吃"}」。`,`✘ Not quite — the answer is “${q.ans==="y"?"take":"don't take"}”.`))}</b></p>
        ${ok?"":`<p>${esc(jhSjWhy(q,said))}</p>`}
        <p class="muted">${esc(jhL("吃下去的兌換帳（紅方得失）：","The exchange if you take (Red's balance):"))}</p>
        <ol>${rows.map(r=>`<li>${esc(jhL(`${jhSjNm(r.pc)}吃${jhSjNm(r.cap)}　${r.red?"+":"−"}${jhSjPts(r.val)}　（累計 ${jhSjSum(r.sum)}）`,`${jhSjNm(r.pc)} takes ${jhSjNm(r.cap)}  ${r.red?"+":"−"}${jhSjPts(r.val)}  (total ${jhSjSum(r.sum)})`))}</li>`).join("")}</ol>
        <p>${esc(sum>0?jhL(`淨賺 ${jhSjPts(sum)} 分。`,`Net +${jhSjPts(sum)}.`):jhL(`淨賠 ${jhSjPts(-sum)} 分，${last&&!last.red?"最後一步被吃回來的也要算進去":"不吃才划算"}。`,`Net −${jhSjPts(-sum)}${last&&!last.red?"; the last recapture counts too":""}.`))}</p>`;
      const nb=$("#jhSjN");nb.style.display="";nb.textContent=qi+1<Q.length?jhL("下一題","Next"):jhL("結帳","Close the books");
      nb.onclick=()=>{if(qi+1<Q.length){qi++;show();return}const xp=jhSjFinish(right,Q.length);
        S.innerHTML=`<p><b>${esc(jhL(`這一輪算對 ${right}／${Q.length} 題。`,`${right}/${Q.length} correct.`))}</b>${xp?esc(jhL(`全對，修為 +${xp}。`,` All correct: +${xp} XP.`)):right===Q.length?esc(jhL("全對！今天的修為已經領過了。","All correct! Today's XP is already claimed.")):""}</p>`;
        nb.textContent=jhL("再算一輪","Another round");nb.onclick=()=>start(lv)}});
    start(lv)})}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhSjCss";s.textContent=`
.jh-sj-bd{max-width:340px;margin:6px auto}.jh-sj-bd svg{display:block;width:100%;height:auto}
#jhSjLv .btn.on{outline:2px solid currentColor}.jh-sj-led ol{margin:4px 0 4px 1.2em;padding:0}.jh-sj-led li{margin:2px 0}.jh-sj-val{font-size:13px;text-align:center}.jh-sj-mark{pointer-events:none}`;
  if(!document.getElementById("jhSjCss"))document.head.append(s)})();
