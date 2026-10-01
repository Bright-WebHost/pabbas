import json

wf = json.load(open('scratch/live_workflow_current.json'))

for n in wf['nodes']:
    if n['name'] == 'Extract Inbound Message':
        js = n['parameters']['jsCode']
        js = js.replace("ai_intent: ''\n  }\n}];", "ai_intent: '',\n    audio_link: message.audio?.link || message.voice?.link || null\n  }\n}];")
        n['parameters']['jsCode'] = js

# Remove TODO node
wf['nodes'] = [n for n in wf['nodes'] if n['name'] != 'YCloud Voice/Media TODO (Disabled)']

# The flow currently goes: Save Inbound Message -> Retrieve Chat Context
# We want: Save Inbound Message -> If Audio
# If Audio (True) -> Download Audio -> Transcribe Audio -> Format Transcription -> Retrieve Chat Context
# If Audio (False) -> Retrieve Chat Context

# Find connections from Save Inbound Message
for conn_name, connections in wf['connections'].items():
    if conn_name == 'Save Inbound Message':
        pass

wf['connections']['Save Inbound Message'] = {
    'main': [
        [
            {
                'node': 'Is Audio Message?',
                'type': 'main',
                'index': 0
            }
        ]
    ]
}

wf['connections']['Is Audio Message?'] = {
    'main': [
        [
            {
                'node': 'Download Audio',
                'type': 'main',
                'index': 0
            }
        ],
        [
            {
                'node': 'Retrieve Chat Context',
                'type': 'main',
                'index': 0
            }
        ]
    ]
}

wf['connections']['Download Audio'] = {
    'main': [
        [
            {
                'node': 'Transcribe Audio',
                'type': 'main',
                'index': 0
            }
        ]
    ]
}

wf['connections']['Transcribe Audio'] = {
    'main': [
        [
            {
                'node': 'Format Transcription',
                'type': 'main',
                'index': 0
            }
        ]
    ]
}

wf['connections']['Format Transcription'] = {
    'main': [
        [
            {
                'node': 'Retrieve Chat Context',
                'type': 'main',
                'index': 0
            }
        ]
    ]
}

# Add nodes
wf['nodes'].extend([
    {
        "parameters": {
            "conditions": {
                "boolean": [
                    {
                        "value1": "={{ !!$json.audio_link }}",
                        "value2": True
                    }
                ]
            }
        },
        "name": "Is Audio Message?",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [ 700, 200 ]
    },
    {
        "parameters": {
            "method": "GET",
            "url": "={{ $json.audio_link }}",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {
                        "name": "X-API-Key",
                        "value": "d5502caecd15e608b38bb515f76d5f35"
                    }
                ]
            },
            "options": {
                "response": {
                    "response": {
                        "responseFormat": "file",
                        "outputPropertyName": "audio"
                    }
                }
            }
        },
        "name": "Download Audio",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [ 900, 100 ]
    },
    {
        "parameters": {
            "resource": "audio",
            "operation": "transcribe",
            "binaryPropertyName": "audio"
        },
        "name": "Transcribe Audio",
        "type": "n8n-nodes-base.openAi",
        "typeVersion": 1,
        "position": [ 1100, 100 ],
        "credentials": {
            "openAiApi": {
                "id": "qoyVBVk1ojHK9xi0",
                "name": "OpenAI account"
            }
        }
    },
    {
        "parameters": {
            "jsCode": "const item = $input.first().json;\nitem.content = item.text || '[Voice Note]';\ndelete item.text;\nreturn [{ json: item }];"
        },
        "name": "Format Transcription",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [ 1300, 100 ]
    }
])

with open('scratch/live_workflow_patched.json', 'w') as f:
    json.dump(wf, f, indent=2)
