const fs = require('fs');
const file = 'c:/Users/joseph/Desktop/Agartha Kayak/frontend/src/app/dashboardTest/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert submitPeerLoan function
const functionToInsert = `
  const submitPeerLoan = async () => {
    if (!address || !pNeighborId) return;
    try {
      const res = await fetch('/api/loans/peer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
        body: JSON.stringify({
          borrowerAddress: address,
          lenderAddress: pNeighborId,
          mode: pMode,
          amount: pAmount,
          itemName: pThingName,
          date: pDate,
          time: pTime,
          purpose: pPurpose
        })
      });
      if (res.ok) {
        setPeerModal({ ...peerModal, step: 'success' });
      } else {
        console.error('Failed to submit');
      }
    } catch (err) {
      console.error(err);
    }
  };
`;

code = code.replace(
  /const openPeerModal = \(\) => {/,
  functionToInsert + '\n  const openPeerModal = () => {'
);

// Update onClick
code = code.replace(
  /onClick={\(\) => {\n\s+if \(peerModal\.step === 3\) setPeerModal\({ \.\.\.peerModal, step: 'success' }\);\n\s+else setPeerModal\({ \.\.\.peerModal, step: \(peerModal\.step as number\) \+ 1 }\);\n\s+}}/,
  `onClick={() => {
                    if (peerModal.step === 3) submitPeerLoan();
                    else setPeerModal({ ...peerModal, step: (peerModal.step as number) + 1 });
                  }}`
);

// Fix mapping fields in Elder Requests mapping
// {elderRequests.map(req => ... {req.requester.name} ... {req.item}
code = code.replace(/req\.requester\.name/g, 'req.borrower?.alias');
code = code.replace(/req\.requester\.barangay/g, '(req.borrower?.barangay || "Local")');
code = code.replace(/req\.item/g, 'req.item_name');
code = code.replace(/req\.submitted/g, 'new Date(req.created_at).toLocaleDateString()');
code = code.replace(/selectedNeighbor\?\.name/g, 'selectedNeighbor?.alias');

fs.writeFileSync(file, code);
console.log('Update 2 Complete');
