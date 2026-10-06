const ycloudKey = "d5502caecd15e608b38bb515f76d5f35";

fetch("https://api.ycloud.com/v2/whatsapp/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": ycloudKey
  },
  body: JSON.stringify({
    from: "+919180348124",
    to: "919035960307",
    type: "template",
    template: {
      name: "weekend_promo_dynamic",
      language: { code: "en" },
      components: []
    }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
