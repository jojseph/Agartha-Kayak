const fs = require('fs');
const file = 'c:/Users/joseph/Desktop/Agartha Kayak/frontend/src/app/dashboardTest/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /onClick=\{\(\) => \{ disconnect\(\); router\.push\('\/'\); \}\}/,
  `onClick={() => { disconnect(); localStorage.removeItem('mesh-wallet-persist'); router.push('/'); }}`
);

fs.writeFileSync(file, code);
console.log('Update Complete');
