with open('.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if 'SUPABASE' in line and not line.startswith('#'):
            key_name = line.split('=', 1)[0]
            key_val = line.split('=', 1)[1][:20] + '...'
            print(f'{key_name} = {key_val}')
