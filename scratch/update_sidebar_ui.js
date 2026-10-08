const fs = require('fs');
let sidebar = fs.readFileSync('components/dashboard/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace(
  '<span className="text-[9px] tracking-[2px] text-[#A1B2C6] mt-1 font-bold uppercase">Staff Hub</span>',
  '<span className="text-[9px] tracking-[2px] text-[#A1B2C6] mt-1 font-bold uppercase">Staff Hub • {role}</span>'
);

fs.writeFileSync('components/dashboard/Sidebar.tsx', sidebar);
console.log('Sidebar UI updated with role label');
