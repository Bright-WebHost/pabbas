import * as fs from 'fs';
import * as path from 'path';

const workflowPath = path.resolve('n8n/workflows/pabbas_order_event_receiver.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const sendToSimulatorNode = {
  "parameters": {
    "method": "POST",
    "url": "={{ $env.SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co' }}/rest/v1/dev_whatsapp_messages",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpCustomAuth",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "customer_id",
          "value": "={{ $('Claim Event').item.json.payload.customer.id }}"
        },
        {
          "name": "message",
          "value": "={{ $('Mock WhatsApp Message').item.json.message }}"
        }
      ]
    },
    "options": {}
  },
  "id": "10",
  "name": "Send to Simulator",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "position": [1450, -150],
  "credentials": {
    "httpCustomAuth": {
      "id": "Supabase_Service_Role_ID",
      "name": "Supabase Service Role"
    }
  }
};

// Add the new node
workflow.nodes.push(sendToSimulatorNode);

// Update Complete Event position so it doesn't overlap
const completeEventNode = workflow.nodes.find((n: any) => n.name === 'Complete Event');
if (completeEventNode) {
  completeEventNode.position = [1650, -150];
}

// Modify connections
// Disconnect IF Mock Success -> Complete Event
workflow.connections["IF Mock Success?"] = {
  "main": [
    [
      {
        "node": "Send to Simulator",
        "type": "main",
        "index": 0
      }
    ],
    [
      {
        "node": "Fail Event",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

// Connect Send to Simulator -> Complete Event
workflow.connections["Send to Simulator"] = {
  "main": [
    [
      {
        "node": "Complete Event",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log('Successfully updated n8n workflow JSON.');
