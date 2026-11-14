// 產生 xiangqi-db/fixes.json（意見回饋 203 的「修正通知」）：在已登入的回饋試算表分頁裡執行，結果複製到剪貼簿
// 只放：列號、線上 ID 的雜湊、時間、類型、版本、處理說明；開發者自己寫的回饋才附上內容摘要（玩家原文不公開）
(async()=>{const id=location.pathname.split('/')[3];
  const g=r=>fetch(`/spreadsheets/d/${id}/export?format=csv&gid=316334788&range=${r}`).then(x=>x.text());
  const csv=t=>{const R=[];let r=[],f="",q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=""}else if(c=='\n'){r.push(f);R.push(r);r=[];f=""}else if(c!='\r')f+=c}r.push(f);R.push(r);return R};
  const H=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode("xqfix:"+s)))].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,12);
  const A=csv(await g("A2:J3000")),B=csv(await g("L2:O3000")),out=[],rep={},replies=[];
  /* hspx 11/13 開發者回覆玩家（管理頁「✉ 回覆玩家」寫在「回覆玩家」欄，欄位用標題找）：玩家寫的列、有線上 ID 的才匯出；只放列號、ID 雜湊、時間、類型、開發者的話（App 07s3 fbr 照雜湊只拿自己的） */
  const HD=csv(await g("A1:Z1"))[0]||[],rc=HD.indexOf("回覆玩家"),cl=i=>String.fromCharCode(65+i),RE=rc>=0?csv(await g(cl(rc)+"2:"+cl(rc)+"3000")):[];
  /* 11/13 開發者決定保留全部回覆：一格裡一行一則「MM/dd HH:mm｜內容」（舊的沒有時間），每則各一筆、照順序；rt＝回覆時間 */
  for(let i=0;i<A.length;i++){const a=A[i],b=B[i]||[],cel=String((RE[i]||[])[0]||"").trim();if(!cel||!a[4]||b[0]==="開發者")continue;const ty=a[1]||"";if(!ty||/玩家|測試|刪除請求|檢舉|Claude/.test(ty))continue;
    const h=await H(a[4]),at=(a[0]||"").replace(/:\d\d$/,"");
    for(const ln of cel.split("\n")){const m=ln.trim().match(/^(\d\d\/\d\d \d\d:\d\d)｜([\s\S]*)$/),re=(m?m[2]:ln).trim();if(!re)continue;const it={r:i+2,h,at,ty,re:re.slice(0,300)};if(m)it.rt=m[1];replies.push(it)}}
  for(let i=0;i<A.length;i++){const a=A[i],b=B[i]||[];
    /* 檢舉追蹤編號（m/07x4-lobbysafe.js）：「🚩 檢舉」那一列不進修正紀錄（不跳「你回報的問題修好了」、不寄修好回信），只把內容開頭的 [R-1111-7K3Q] 和狀態放進 reports；
       「已修復」打勾或「開發者決定」＝不處理 → done（🛠 已處理），「開發者決定」＝核准 → seen（👀 開發者已收到）；日期取處理說明開頭的版本號。不放 ID 雜湊、名字、原因（這個檔是公開的） */
    if(/檢舉/.test(a[1]||"")){const m=(a[2]||"").match(/\[(R-\d{4}-[2-9A-HJKMNP-Z]{4})\]/),s=b[1]==="TRUE"||b[3]==="不處理"?"done":b[3]==="核准"?"seen":"";
      if(m&&s){const dv=(b[2]||"").match(/^(?:進度\s*)?\d{4}(\d\d)(\d\d)-\d{4}/);rep[m[1]]=dv?{s,at:(+dv[1])+"/"+(+dv[2])}:{s}}continue}
    const no=b[1]!=="TRUE"&&b[3]==="不處理"&&b[0]!=="開發者";if(b[1]!=="TRUE"&&!no)continue;   /* 11/10 修好回信：開發者決定「不處理」的玩家回饋也匯出（no:1），寄「好點子收進百寶箱」的信；修正紀錄清單不列 */const ty=a[1]||"";if(!ty||/玩家|測試|刪除請求/.test(ty))continue;   /* 11/11 資料保留期限：「🗑 刪除請求」是處理紀錄，不是修正，不進公開的 fixes.json */
    const note=b[2]||"",v=(note.match(/^(\d{8}-\d{4})/)||[])[1]||"",dev=b[0]==="開發者";
    const it={r:i+2,h:a[4]?await H(a[4]):"",at:(a[0]||"").replace(/:\d\d$/,""),ty,v,n:note.replace(/^(進度\s*)?\d{8}-\d{4}[：:]\s*/,"")};
    if(no)it.no=1;if(dev){it.q=(a[2]||"").split("\n📎")[0].slice(0,160);it.d=1}out.push(it)}
  const json=JSON.stringify({updated:new Date().toISOString(),items:out,reports:rep,replies});await navigator.clipboard.writeText(json);return out.length+" 筆修正、"+Object.keys(rep).length+" 筆檢舉狀態、"+replies.length+" 筆開發者回覆，"+json.length+" 字"})()
