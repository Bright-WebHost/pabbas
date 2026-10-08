const ycloudKey = "d5502caecd15e608b38bb515f76d5f35";

fetch("https://api.ycloud.com/v2/whatsapp/templates?limit=50", {
  headers: { "X-API-Key": ycloudKey }
})
  .then(r => r.json())
  .then(data => {
    const t = data.items.find(t => t.name === "weekend_promo_dynamic");
    console.log(JSON.stringify(t, null, 2));
  })
  .catch(console.error);
