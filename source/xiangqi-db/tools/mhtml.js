// 把拆開的 m.html 組回一個完整的頁面（意見回饋 594：程式拆分）
//   m.html 裡：<link rel="stylesheet" href="m.css"> → 換成 m.css 的內容（<style>）
//             //#include m/xx.js 這種單獨一行 → 換成 xiangqi-db/m/xx.js 的內容
// 建置（xiangqi-lab/tools/build-site.js）、開發伺服器（xiangqi-referee.js 的 /m）、讀 m.html 的工具都用這支，組出來的跟拆之前逐字一樣。
// 用法：const {assemble,parts,findPart}=require("./mhtml.js")
"use strict";
const fs = require("fs"), path = require("path");
const DB = path.join(__dirname, "..");
const LINK = '<link rel="stylesheet" href="m.css">';
const INC = /^\/\/#include (m\/[\w.-]+\.js)$/gm;
const read = f => fs.readFileSync(path.join(DB, f), "utf8");
// m/*.js 存檔時最後多一個換行（方便編輯器），組回去時拿掉
const part = f => read(f).replace(/\n$/, "");
function assemble() {
  let h = read("m.html");
  if (h.includes(LINK)) h = h.split(LINK).join("<style>\n" + read("m.css").replace(/^\/\*[\s\S]*?\*\/\n/, "") + "</style>");
  return h.replace(INC, (m, f) => part(f));
}
// 拆出去的程式檔清單（照 m.html 裡的順序）
const parts = () => [...read("m.html").matchAll(INC)].map(m => m[1]);
// 找哪一個檔含有這段字（改程式時用）
const findPart = s => parts().filter(f => read(f).includes(s));
module.exports = { assemble, parts, findPart, DB };
if (require.main === module) {
  const a = process.argv[2];
  if (a === "--out") { fs.writeFileSync(process.argv[3], assemble()); console.log("組好了：" + process.argv[3]) }
  else if (a === "--find") console.log(findPart(process.argv[3]).join("\n") || "找不到")
  else console.log(parts().join("\n"));
}
