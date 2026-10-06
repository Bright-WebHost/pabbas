fetch("https://staff.brightmedia.tech/api/v1/executions?limit=5", {
  headers: {
    "X-N8N-API-KEY": "n8n_api_5f0611d279cf44e27f078e3ec8e25d2c80c2f8217bb664c3ecadffcfbc99a538234bb4e3e3bdf2d0d08253a6",
    "Accept": "application/json"
  }
}).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
