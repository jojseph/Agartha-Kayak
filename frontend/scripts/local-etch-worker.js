// Node 18+ (global fetch)
const COMMUNITIES = ['3afb339d-f204-46cc-ab95-6304d1ddc38c']; // fill IDs or fetch from your DB
const SECRET = process.env.WORKER_TRIGGER_SECRET;
async function runOnce(){
  for(const id of COMMUNITIES){
    await fetch('http://localhost:3000/api/workers/etch-queue', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization: SECRET },
      body: JSON.stringify({ communityId: id })
    }).then(r=>r.json()).then(console.log).catch(console.error);
  }
}
setInterval(runOnce, 5*60*1000); // every 5 minutes
runOnce();