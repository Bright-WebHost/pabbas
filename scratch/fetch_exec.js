const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
const apiKey = apiKeyMatch[1].trim();

const w = JSON.parse(fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8'));

fetch(`https://staff.brightmedia.tech/api/v1/executions?workflowId=${w.id}&limit=1`, {
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Accept': 'application/json'
  }
}).then(async r => {
  if (!r.ok) {
    console.error("Failed to fetch executions", await r.text());
    return;
  }
  const data = await r.json();
  if (!data.data || data.data.length === 0) {
    console.log("No recent executions found.");
    return;
  }
  
  const execId = data.data[0].id;
  console.log(`Latest Execution ID: ${execId}`);
  
  const execReq = await fetch(`https://staff.brightmedia.tech/api/v1/executions/${execId}`, {
    headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }
  });
  
  const execData = await execReq.json();
  
  // Dump the execution data to a local file so we can inspect it
  fs.writeFileSync('scratch/latest_execution.json', JSON.stringify(execData, null, 2));
  console.log("Execution details saved to scratch/latest_execution.json");
  
  // Quick analysis
  const runData = execData.data.resultData.runData;
  console.log("\n--- Node Execution Summary ---");
  for (const nodeName in runData) {
    const runs = runData[nodeName];
    console.log(`${nodeName}: ran ${runs.length} times`);
    if (nodeName === 'Filter & Clean Phones' && runs[0].data.main[0]) {
        console.log("  Filtered Phones Output:", JSON.stringify(runs[0].data.main[0].map(x => x.json.phone)));
    }
    if (nodeName === 'Send Template' && runs[0].data.main[0]) {
        console.log("  Send Template Output (Item 0):", JSON.stringify(runs[0].data.main[0][0].json));
    }
  }
}).catch(console.error);
