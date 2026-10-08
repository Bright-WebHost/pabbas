const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/exec_13424.json', 'utf8'));
const agentData = data.data.resultData.runData['Chat Agent'];
if (agentData && agentData.length > 0) {
  const output = agentData[0].data.main[0][0].json.output;
  console.log('AI Output 13424: ', output);
}
let data2 = JSON.parse(fs.readFileSync('scratch/exec_13423.json', 'utf8'));
const agentData2 = data2.data.resultData.runData['Chat Agent'];
if (agentData2 && agentData2.length > 0) {
  const output2 = agentData2[0].data.main[0][0].json.output;
  console.log('AI Output 13423: ', output2);
}
