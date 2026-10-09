const fs = require('fs');

let staff = fs.readFileSync('lib/auth/staff.ts', 'utf8');
staff = staff.replace(/const \{ data, error \} = await supabase.rpc<any, any>\("staff_check"\);/, 'const result = await supabase.rpc("staff_check");\n    const data = result.data as any;\n    const error = result.error;');
staff = staff.replace(/const \{ data, error \} = await supabase.rpc\("staff_check"\);/, 'const result = await supabase.rpc("staff_check");\n    const data = result.data as any;\n    const error = result.error;');
fs.writeFileSync('lib/auth/staff.ts', staff);

console.log('Fixed typescript issues in staff.ts');
