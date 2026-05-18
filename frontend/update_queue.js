const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

code = code.replace(
  /queueItems\.slice\(0, 8\)\.map\(\(item\) => \(/,
  'groupedQueue.map((group, idx) => ('
);

code = code.replace(
  /key=\{item\.queue_id\}/,
  'key={idx}'
);

code = code.replace(
  /className=\`nq-item nq-item--\$\{item\.status/g,
  'className=\`nq-item nq-item--\${group.status'
);

code = code.replace(
  /\? 'batched' : item\.status/g,
  "? 'batched' : group.status"
);

code = code.replace(
  /className="nq-item__label">\{item\.summary\}<\/span>/,
  `className="nq-item__label">{group.count} {group.label}{group.count !== 1 ? 's' : ''}</span>`
);

code = code.replace(
  /\{item\.member_alias\} · \{item\.estimated_bytes\} bytes\r?\n\s*\{item\.block_number \? ` · Block #\$\{item\.block_number\}` : ''\}\r?\n\s*\{item\.status/g,
  '{group.bytes} bytes total\\n                        {group.status'
);

code = code.replace(/\{item\.status === 'queued'/g, "{group.status === 'queued'");
code = code.replace(/\{item\.status === 'batched'/g, "{group.status === 'batched'");
code = code.replace(/\{item\.status === 'etched'/g, "{group.status === 'etched'");

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Done');
