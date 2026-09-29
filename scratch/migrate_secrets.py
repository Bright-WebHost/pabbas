import os
import re

def replace_in_file(file_path, search_regex, replacement):
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = re.sub(search_regex, replacement, content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file_path}")

# 1. lib/supabase/admin.ts
replace_in_file('lib/supabase/admin.ts', r'process\.env\.SUPABASE_SERVICE_ROLE_KEY', 'process.env.SUPABASE_SECRET_KEY')

# 2. lib/session/cookies.ts
replace_in_file('lib/session/cookies.ts', r'process\.env\.SESSION_SECRET \|\| process\.env\.SUPABASE_SERVICE_ROLE_KEY', 'process.env.SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY /* Fallback to prevent breaking existing sessions during migration */')
replace_in_file('lib/session/cookies.ts', r'SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET or SUPABASE_SECRET_KEY')

# 3. n8n workflow JSONs
n8n_files = [
    'n8n/workflows/Pabbas _ Status Notifier.json',
    'n8n/workflows/Pabbas _ Blast Sender.json',
    'n8n/workflows/Pabbas _ Staff _ AI Toggle.json',
    'n8n/workflows/Pabbas _ Agent Reply Sender.json'
]
for f in n8n_files:
    replace_in_file(f, r'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY')

# 4. WhatsApp AI Order Bridge
bridge_file = 'n8n/workflows/Pabbas _ Production _ WhatsApp AI Order Bridge (1).json'
leaked_jwt_regex = r'(?:Bearer )?eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXpjdG50a3d6YWhkZmplcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_.-]+'

def bridge_replacer(match):
    s = match.group(0)
    if s.startswith('Bearer'):
        return 'Bearer {{$env.SUPABASE_SECRET_KEY}}'
    return '={{$env.SUPABASE_SECRET_KEY}}'
    
if os.path.exists(bridge_file):
    with open(bridge_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(leaked_jwt_regex, bridge_replacer, content)
    
    if new_content != content:
        with open(bridge_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Removed hardcoded JWTs from WhatsApp AI Order Bridge')

# 5. Historical/test scripts
test_scripts = [
    'test-webhook-real.js',
    'test-rpc.js',
    'test-patch.js',
    'test-webhook.js'
]
for f in test_scripts:
    replace_in_file(f, r"'" + leaked_jwt_regex + r"'", "process.env.SUPABASE_SECRET_KEY || 'MISSING_SECRET'")

replace_in_file('scratch/verify_phase7d.ts', r'process\.env\.SUPABASE_SERVICE_ROLE_KEY', 'process.env.SUPABASE_SECRET_KEY')
replace_in_file('scratch/verify_ceo_demo.ts', r'process\.env\.SUPABASE_SERVICE_ROLE_KEY', 'process.env.SUPABASE_SECRET_KEY')

# 6. .env.local
replace_in_file('.env.local', r'SUPABASE_SERVICE_ROLE_KEY=', 'SUPABASE_SECRET_KEY=')
replace_in_file('.env.local', r'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY')

# 8. Documentation
docs = [
    'docs/PABBAS_COMPLETE_TECHNICAL_DOCUMENTATION.md',
    'docs/pabbas/06-nextjs-application.md',
    'docs/pabbas/16-local-development.md',
    'docs/pabbas/17-testing-verification.md',
    'docs/pabbas/18-troubleshooting.md'
]
for f in docs:
    replace_in_file(f, r'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY')

print("All replacements executed.")
