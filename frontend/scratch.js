const fs = require('fs');
const file = 'c:/Users/joseph/Desktop/Agartha Kayak/frontend/src/app/dashboardTest/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /interface Neighbor {[\s\S]*?}\n\ninterface ElderRequest {[\s\S]*?}\n\ninterface Transaction {/,
  `interface Neighbor {
  wallet_address: string;
  alias: string;
  barangay: string;
}

interface ElderRequest {
  loan_id: string;
  borrower: { alias: string; barangay: string };
  mode: 'money' | 'things';
  amount?: number;
  item_name?: string;
  needed_by_date: string;
  needed_by_time: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Transaction {`
);

code = code.replace(
  /const NEIGHBORS: Neighbor\[\] = \[[\s\S]*?\];\n\nconst ELDER_REQUESTS_INITIAL: ElderRequest\[\] = \[[\s\S]*?\];/,
  ''
);

if(!code.includes('@meshsdk/react')) {
  code = code.replace(
    /import React, { useState, useEffect, useMemo } from 'react';/,
    `import React, { useState, useEffect, useMemo } from 'react';\nimport { useWallet } from '@meshsdk/react';`
  );
}

// Add state variables inside App
code = code.replace(
  /export default function DashboardTestPage\(\) {\n  \/\/ Modals States/,
  `export default function DashboardTestPage() {
  const { connected, wallet } = useWallet();
  const [address, setAddress] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  
  useEffect(() => {
    if (connected) {
      wallet.getUsedAddresses().then(addrs => {
        setAddress(addrs[0]);
        // Fetch neighbors
        fetch(\`/api/members/search?exclude=\${addrs[0]}\`)
          .then(res => res.json())
          .then(data => setNeighbors(data.members || []))
          .catch(console.error);
      });
    }
  }, [connected, wallet]);

  // Modals States`
);

// Fix selectedNeighbor to use address
code = code.replace(
  /const \[pNeighborId, setPNeighborId\] = useState<number \| null>\(null\);/,
  `const [pNeighborId, setPNeighborId] = useState<string | null>(null);`
);

code = code.replace(
  /const selectedNeighbor = NEIGHBORS\.find\(n => n\.id === pNeighborId\);/,
  `const selectedNeighbor = neighbors.find(n => n.wallet_address === pNeighborId);`
);

code = code.replace(
  /const filteredNeighbors = NEIGHBORS\.filter\(n => n\.name\.toLowerCase\(\)\.includes\(pQuery\.toLowerCase\(\)\)\);/,
  `const filteredNeighbors = neighbors.filter(n => (n.alias || '').toLowerCase().includes(pQuery.toLowerCase()));`
);

// Fix peer card rendering
code = code.replace(
  /filteredNeighbors\.map\(n => \([\s\S]*?<button key={n\.id} className={`peer-card peer-card--simple \${pNeighborId === n\.id \? 'is-selected' : ''}`} onClick={\(\) => setPNeighborId\(n\.id\)}>[\s\S]*?<span className="peer-card__avatar">{initialsOf\(n\.name\)}<\/span>[\s\S]*?<span className="peer-card__body"><span className="peer-card__name">{n\.name}<\/span><\/span>[\s\S]*?<span className="peer-card__radio"><\/span>[\s\S]*?<\/button>[\s\S]*?\)\)/,
  `filteredNeighbors.map(n => (
    <button key={n.wallet_address} className={\`peer-card peer-card--simple \${pNeighborId === n.wallet_address ? 'is-selected' : ''}\`} onClick={() => setPNeighborId(n.wallet_address)}>
      <span className="peer-card__avatar">{initialsOf(n.alias || '?')}</span>
      <span className="peer-card__body"><span className="peer-card__name">{n.alias}</span> <span className="peer-card__sub">{n.barangay || 'Local'}</span></span>
      <span className="peer-card__radio"></span>
    </button>
  ))`
);

code = code.replace(
  /<span className="peer-chip__avatar">{initialsOf\(selectedNeighbor\.name\)}<\/span>/g,
  `<span className="peer-chip__avatar">{initialsOf(selectedNeighbor.alias || '?')}</span>`
);
code = code.replace(
  /<span className="peer-chip__name">{selectedNeighbor\.name}<\/span>/g,
  `<span className="peer-chip__name">{selectedNeighbor.alias}</span>`
);
code = code.replace(
  /<span>Sent directly to <span>{selectedNeighbor\.name\.split\(' '\)\[0\]}<\/span><\/span>/g,
  `<span>Sent directly to <span>{selectedNeighbor.alias?.split(' ')[0]}</span></span>`
);

// Fix the Elder Modal
code = code.replace(
  /const openElderModal = \(\) => {\n    \/\/ Deep clone initial to refresh state for demo\n    setElderRequests\(JSON\.parse\(JSON\.stringify\(ELDER_REQUESTS_INITIAL\)\)\);\n    setElderModalOpen\(true\);\n  };/,
  `const openElderModal = () => {
    if (address) {
      fetch(\`/api/loans/requests?address=\${address}\`)
        .then(res => res.json())
        .then(data => setElderRequests(data.requests || []))
        .catch(console.error);
    }
    setElderModalOpen(true);
  };`
);

fs.writeFileSync(file, code);
console.log('Update Complete');
