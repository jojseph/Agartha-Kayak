const fs = require('fs');
const file = 'c:/Users/joseph/Desktop/Agartha Kayak/frontend/src/app/dashboardTest/page.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('useRouter')) {
  code = code.replace(
    /import \{ useWallet \} from '@meshsdk\/react';/,
    `import { useWallet } from '@meshsdk/react';\nimport { useRouter } from 'next/navigation';`
  );
}

code = code.replace(
  /const { connected, wallet } = useWallet\(\);/,
  `const { disconnect, connected, wallet } = useWallet();\n  const router = useRouter();`
);

code = code.replace(
  /<button className="user-menu__disconnect" type="button">Disconnect<\/button>/,
  `<button className="user-menu__disconnect" type="button" onClick={() => { disconnect(); router.push('/'); }}>Disconnect</button>`
);

fs.writeFileSync(file, code);
console.log('Update 3 Complete');
