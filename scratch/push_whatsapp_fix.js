const fs = require('fs');

const url = 'https://staff.brightmedia.tech/api/v1/workflows/24IaEnLI3RCYU6da';
const headers = { 
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
  'Content-Type': 'application/json'
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => {
    // Fix Send WhatsApp
    let s = data.nodes.find(n => n.name.includes('Send WhatsApp'));
    if (s) {
      // Remove double == and put it properly
      s.parameters.jsonBody = "={{ JSON.stringify((function() {\n  const req = {\n    from: \"+919180348124\",\n    to: $json.phone\n  };\n  \n  if ($json.send_receipt) {\n    req.type = 'image';\n    req.image = {\n      link: 'https://pabbas-one.vercel.app/api/receipt?order_number=' + $json.order_number,\n      caption: $json.message\n    };\n  } else if ($json.message_type === 'interactive') {\n    req.type = 'interactive';\n    req.interactive = {\n      type: 'button',\n      body: { text: $json.message },\n      action: {\n        buttons: [\n          {\n            type: 'reply',\n            reply: {\n              id: 'accept_' + $json.order_number,\n              title: $json.interactive_button || 'Accept'\n            }\n          }\n        ]\n      }\n    };\n  } else {\n    req.type = 'text';\n    req.text = {\n      body: $json.message\n    };\n  }\n  \n  return req;\n})()) }}";
    }

    const payload = {
      name: data.name,
      nodes: data.nodes,
      connections: data.connections,
      settings: data.settings || {},
      staticData: data.staticData || null
    };
    
    return fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
  })
  .then(res => res.json())
  .then(data => {
    if (data.id) {
       console.log('Successfully updated Send WhatsApp logic in workflow:', data.id);
    } else {
       console.log('Update Error:', data);
    }
  })
  .catch(err => console.error(err));
