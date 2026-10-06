const ycloudKey = "d5502caecd15e608b38bb515f76d5f35";

fetch("https://api.ycloud.com/v2/whatsapp/messages/6ac38fe01d0dd60f5f816995", {
  headers: {
    "X-API-Key": ycloudKey
  }
}).then(r => r.json()).then(console.log).catch(console.error);
