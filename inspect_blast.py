import urllib.request, json

# Read keys
key = None
supabase_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()
        if line.startswith('SUPABASE_SECRET_KEY='): supabase_key = line.split('=', 1)[1].strip()

# 1. Inspect blast_log table schema via Supabase
print("=" * 60)
print("1. PRODUCTION blast_log TABLE SCHEMA")
print("=" * 60)
req = urllib.request.Request(
    'https://clqzctntkwzahdfjeqlx.supabase.co/rest/v1/blast_log?limit=0',
    headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Accept': 'application/vnd.pgrst.object+json',
        'Prefer': 'count=exact'
    }
)
try:
    res = urllib.request.urlopen(req)
    print(f"  Headers: {dict(res.headers)}")
except Exception as e:
    if hasattr(e, 'headers'):
        print(f"  Content-Range: {e.headers.get('Content-Range')}")

# Try to get column info via a select with a bogus filter to see the schema
req2 = urllib.request.Request(
    'https://clqzctntkwzahdfjeqlx.supabase.co/rest/v1/blast_log?select=*&limit=1',
    headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
    }
)
try:
    res2 = urllib.request.urlopen(req2)
    data = json.loads(res2.read().decode())
    if data:
        print(f"  Columns (from row): {list(data[0].keys())}")
    else:
        print("  Table is empty, trying OpenAPI spec...")
except Exception as e:
    print(f"  Error: {e}")
    if hasattr(e, 'read'):
        print(f"  Body: {e.read().decode()}")

# 2. Inspect the Log Blast node in n8n
print()
print("=" * 60)
print("2. LOG BLAST NODE (n8n workflow)")
print("=" * 60)
req3 = urllib.request.Request(
    'https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x',
    headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'}
)
res3 = urllib.request.urlopen(req3)
wf = json.loads(res3.read().decode())
for n in wf['nodes']:
    if n['name'] == 'Log Blast':
        print(json.dumps(n['parameters'], indent=2))

# 3. Check the original backup for comparison
print()
print("=" * 60)
print("3. ORIGINAL Log Blast NODE (from backup)")
print("=" * 60)
with open('scratch/blast_sender.json', 'r') as f:
    backup = json.load(f)
for n in backup['nodes']:
    if n['name'] == 'Log Blast':
        print(json.dumps(n['parameters'], indent=2))
