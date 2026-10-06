const fs = require('fs');

fetch("https://staff.brightmedia.tech/api/v1/executions?workflowId=k7mayj1bhUGCmz8x&limit=1", {
  headers: {
    "X-N8N-API-KEY": "n8n_api_5f0611d279cf44e27f078e3ec8e25d2c80c2f8217bb664c3ecadffcfbc99a538234bb4e3e3bdf2d0d08253a6",
    "Accept": "application/json"
  }
}).then(r => r.json()).then(data => {
  const latestId = data.data[0].id;
  console.log("Latest Execution ID:", latestId);
  return fetch("https://staff.brightmedia.tech/api/v1/executions/" + latestId, {
    headers: {
      "X-N8N-API-KEY": "n8n_api_5f0611d279cf44e27f078e3ec8e25d2c80c2f8217bb664c3ecadffcfbc99a538234bb4e3e3bdf2d0d08253a6",
      "Accept": "application/json"
    }
  });
}).then(r => r.json()).then(data => {
  fs.writeFileSync('scratch/latest_execution_blast.json', JSON.stringify(data, null, 2));
  console.log("Saved execution data to scratch/latest_execution_blast.json");
  console.log("Nodes that executed:", Object.keys(data.data.resultData.runData));
}).catch(console.error);
