// 用法：node check-connack.mjs <wss 網址>；送 MQTT 3.1.1 CONNECT（公開帳號 xqapp），收到 CONNACK 回傳碼 0 才結束代碼 0
const url = process.argv[2];
const str = (s) => { const b = Buffer.from(s, "utf8"); return Buffer.concat([Buffer.from([b.length >> 8, b.length & 255]), b]) };
const vh = Buffer.concat([str("MQTT"), Buffer.from([4, 0xC2, 0, 60])]);
const pl = Buffer.concat([str("w53test-" + Date.now().toString(36)), str("xqapp"), str("xqapp12345678")]);
const rem = vh.length + pl.length;
const pkt = Buffer.concat([Buffer.from([0x10, rem]), vh, pl]);
const t0 = Date.now();
const ws = new WebSocket(url, ["mqtt"]);
ws.binaryType = "arraybuffer";
const done = (code, msg) => { console.log(msg, `（${Date.now() - t0} ms）`); try { ws.close() } catch (e) { } process.exit(code) };
setTimeout(() => done(2, "逾時：10 秒沒收到 CONNACK"), 10000);
ws.onopen = () => ws.send(pkt);
ws.onmessage = (e) => { const b = Buffer.from(e.data); if (b[0] === 0x20) done(b[3] === 0 ? 0 : 1, `CONNACK 回傳碼 ${b[3]}${b[3] === 0 ? "（登入成功）" : "（被拒）"}`); else done(1, "收到的不是 CONNACK：" + b.slice(0, 8).toString("hex")) };
ws.onerror = (e) => done(1, "連線錯誤：" + (e.message || e.type));
