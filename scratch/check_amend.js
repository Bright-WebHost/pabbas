const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/exec_13423.json', 'utf8'));
const amendNode = data.data.resultData.runData['Create/Amend Order'];
if (amendNode && amendNode.length > 0) {
  console.log(JSON.stringify(amendNode[0].data.main[0][0].json, null, 2));
}
