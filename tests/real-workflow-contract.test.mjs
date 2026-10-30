import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const read = p => readFileSync(resolve(import.meta.dirname,'..',p),'utf8');

test('live GitHub workflow is manual, gated, bounded, no auto-merge',()=>{
  const s=read('.github/workflows/real-free-agents.yml');
  assert.match(s,/workflow_dispatch:/);
  assert.doesNotMatch(s,/^  schedule:/m);
  assert.match(s,/confirm_free_tier/);
  assert.match(s,/persist-credentials: false/);
  assert.match(s,/timeout-minutes: 10/);
  assert.match(s,/gh pr create --draft/);
  assert.doesNotMatch(s,/gh pr merge|auto.?merge/);
});

test('n8n real dispatch is disabled and authenticated before execution',()=>{
  const wf=JSON.parse(read('n8n/workflows/dispatch-real-free-agents.json'));
  assert.equal(wf.active,false);
  assert.equal(wf.nodes.find(n=>n.name==='Private Task Webhook').parameters.authentication,'headerAuth');
  const dispatch=wf.nodes.find(n=>n.name==='Dispatch to Free GitHub Runner');
  assert.equal(dispatch.parameters.genericAuthType,'httpHeaderAuth');
  assert.match(dispatch.parameters.jsonBody,/confirm_free_tier/);
  assert.match(dispatch.parameters.jsonBody,/=== true/);
  assert.doesNotMatch(JSON.stringify(wf),/Bearer\s+sk-[A-Za-z0-9]+/);
});

test('live UI links to manually gated runner but still labels demo as demo',()=>{
  const page=read('index.html');
  assert.match(page,/real-free-agents.yml/);
  assert.match(page,/This browser page remains an offline simulation/);
});
