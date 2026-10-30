import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const read = p => readFileSync(resolve(import.meta.dirname,'..',p),'utf8');

test('separate read-only generation and validation from privileged publishing',()=>{
  const s=read('.github/workflows/real-free-agents.yml');
  assert.match(s,/workflow_dispatch:/);
  assert.doesNotMatch(s,/^  schedule:/m);
  assert.match(s,/confirm_free_tier/);
  assert.match(s,/github.ref == 'refs\/heads\/main'/);
  assert.match(s,/permissions:\n  contents: read/);
  assert.match(s,/  generate:\n/);
  assert.match(s,/  validate:\n/);
  assert.match(s,/  publish:\n/);
  assert.match(s,/needs: \[generate, validate\]/);
  assert.match(s,/  publish:[\s\S]*?permissions:\n      contents: write\n      pull-requests: write/);
  assert.match(s,/  validate:[\s\S]*?permissions:\n      contents: read/);
  assert.match(s,/git apply --check/);
  assert.match(s,/git diff --cached --name-only/);
  assert.match(s,/gh auth setup-git/);
  assert.match(s,/gh pr create --draft/);
  assert.doesNotMatch(s,/x-access-token:|gh pr merge|auto.?merge/);
  const validate=s.split('  validate:\n')[1].split('  publish:\n')[0];
  assert.doesNotMatch(validate,/GROQ_API_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY|GH_TOKEN|secrets\./);
  const publish=s.split('  publish:\n')[1];
  assert.doesNotMatch(publish,/npm run|node scripts\/real-agent-runner|GROQ_API_KEY/);
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

test('static build excludes server-only model adapters',()=>{
  const build=read('scripts/build.mjs');
  assert.match(build, /rm\(resolve\(dist, 'src\/real'\)/);
});

test('live UI links to manually gated runner but still labels demo as demo',()=>{
  const page=read('index.html');
  assert.match(page,/real-free-agents.yml/);
  assert.match(page,/This browser page remains an offline simulation/);
});
