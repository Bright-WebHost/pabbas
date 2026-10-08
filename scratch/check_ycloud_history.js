const ycloudKey = "d5502caecd15e608b38bb515f76d5f35";

fetch("https://api.ycloud.com/v2/whatsapp/messages?limit=5", {
  headers: {
    "X-API-Key": ycloudKey
  }
}).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data.items, null, 2));
}).catch(console.error);
