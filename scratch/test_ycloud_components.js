const ycloudKey = "d5502caecd15e608b38bb515f76d5f35";

const payload = {
  from: "+919180348124",
  to: "+919035960307",
  type: "template",
  template: {
    name: "weekend_promo_dynamic",
    language: { code: "en" },
    components: [
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: "https://oss-ycloud-publicread.oss-ap-southeast-1.aliyuncs.com/online/BASE-FILE/2026/09/30/601a575e-00be-4994-b765-3c881ec8bd70.png" }
          }
        ]
      }
    ]
  }
};

fetch("https://api.ycloud.com/v2/whatsapp/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": ycloudKey
  },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(console.log).catch(console.error);
