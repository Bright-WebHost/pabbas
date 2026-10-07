const fs = require('fs');
const codePath = 'app/(dashboard)/dashboard/OrderManagerProvider.tsx';
let code = fs.readFileSync(codePath, 'utf8');
const b64 = fs.readFileSync('scratch/audio.txt', 'utf8');
code = code.replace('"https://actions.google.com/sounds/v1/alarms/beep_short.ogg"', '`' + b64 + '`');
fs.writeFileSync(codePath, code);
console.log('Replaced URL with Base64 inline!');
