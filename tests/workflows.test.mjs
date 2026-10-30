import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const dir = resolve(import.meta.dirname, '../n8n/workflows');
for (const file of ['zero-key-simulation.json', 'planning-failover.json']) {
  test(`n8n workflow ${file} is complete and initially disabled`, () => {
    const wf = JSON.parse(readFileSync(resolve(dir,file),'utf8'));
    assert.equal(wf.active, false);
    assert.ok(Array.isArray(wf.nodes) && wf.nodes.length > 1);
    const names = new Set(wf.nodes.map(n=>n.name));
    assert.equal(names.size,wf.nodes.length);
    for (const [name,outputs] of Object.entries(wf.connections)) {
      assert.ok(names.has(name));
      for (const branches of Object.values(outputs)) for(const group of branches) for(const target of group) assert.ok(names.has(target.node), `${file}: ${target.node} missing`);
    }
    assert.ok(!/Bearer\s+sk-[A-Za-z0-9]{8,}/.test(readFileSync(resolve(dir,file),'utf8')), 'No secret tokens');
  });
}
test('live workflow is planning only, guarded and has a free fallback',()=>{
  const wf=JSON.parse(readFileSync(resolve(dir,'planning-failover.json'),'utf8'));
  assert.ok(wf.nodes.find(n=>n.name==='Task Webhook').parameters.authentication==='headerAuth');
  assert.ok(wf.nodes.find(n=>n.name==='OpenRouter Free').parameters.jsonBody.includes('openrouter/free'));
  assert.ok(wf.nodes.find(n=>n.name==='Groq Backup').parameters.genericAuthType==='httpHeaderAuth');
  assert.ok(!wf.nodes.some(n=>n.type==='n8n-nodes-base.executeCommand'));
});
