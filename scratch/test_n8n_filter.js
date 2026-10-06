const input = [
  {
    json: [
      { phone: '123', total_orders: 2 },
      { phone: '456', total_orders: 5 }
    ]
  }
];

const dbCustomers = input.map(i => i.json) || [];
const params = { filter: 'all' };
let targetPhones = [];
const now = Date.now();
targetPhones = dbCustomers.filter(c => {
  if (params.filter === 'repeat' && c.total_orders < 2) return false;
  return true;
}).map(c => c.phone);

console.log("targetPhones:", targetPhones);
const unique = [...new Set(targetPhones.map(p => String(p).replace(/[^0-9]/g, '')).filter(Boolean))];
console.log("unique:", unique);
