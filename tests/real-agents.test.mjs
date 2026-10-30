import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { FREE_ROUTES, failoverFree, requestFreeModel } from '../src/real/providers.mjs';
import { codeOneFile, readTarget, parseProposal, validateTargetPath } from '../src/real/coding.mjs';

const env = { SWARM_CONFIRM_FREE_TIER: 'true', GROQ_API_KEY: 'fake-key', GEMINI_API_KEY: 'fake-key-2', OPENROUTER_API_KEY: 'fake-key-3' };
const response = (body, status=200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const answer = (path, content='export const value = 2;\n') => JSON.stringify({ path, summary: 'bounded sample change', content });
const chat = message => response({ choices: [{ message: { content: message } }] });
const gemini = message => response({ candidates: [{ content: { parts: [{ text: message }] } }] });

async function temp() {
  const root = await mkdtemp(resolve(tmpdir(), 'swarm-live-'));
  await mkdir(resolve(root,'src'),{recursive:true});
  await writeFile(resolve(root,'src/fixture.mjs'), 'export const value = 1;\n');
  return root;
}

test('allowlist contains only explicit vetted zero-priced routes', () => {
  assert.deepEqual(FREE_ROUTES.map(r=>r.model), ['openai/gpt-oss-120b','gemini-3.1-flash-lite','openrouter/free','qwen/qwen3.8-27b']);
  assert.ok(FREE_ROUTES.every(r=>['groq','gemini','openrouter'].includes(r.provider)));
});

test('missing free tier confirmation prevents API call', async () => {
  let calls=0;
  await assert.rejects(() => failoverFree('task',{env:{ GROQ_API_KEY:'dummy' },fetchImpl: async()=>{calls++;return chat('hello');}}),/Free-tier-only/);
  assert.equal(calls,0);
});

test('first free provider succeeds over actual HTTP-shaped adapter response', async () => {
  const r=await failoverFree('task',{env,fetchImpl: async (url, opts) => { assert.match(url,/groq/);assert.match(opts.headers.authorization,/fake-key/);return chat('output'); }});
  assert.equal(r.provider,'groq'); assert.equal(r.text,'output'); assert.equal(r.events[0].state,'success');
});

test('Groq 429 moves to Gemini and skips same-provider Qwen to respect shared quota', async () => {
  const calls=[];
  const r=await failoverFree('task',{env,fetchImpl: async url => {calls.push(url);return url.includes('groq')?response({},429):gemini('fallback worked');}});
  assert.equal(r.provider,'gemini');assert.equal(r.text,'fallback worked');assert.equal(calls.length,2);
  assert.deepEqual(r.events.map(e=>e.state),['quota_exhausted','success']);
});

test('empty provider output triggers fallback to independent provider', async () => {
  const r=await failoverFree('task',{env,fetchImpl: async url => url.includes('groq')?chat(''):gemini('nonempty')});
  assert.equal(r.provider,'gemini');
});

test('non-free model route is refused before any HTTP call', async () => {
  await assert.rejects(()=>requestFreeModel({id:'rogue',provider:'groq',model:'paid/model',env:'GROQ_API_KEY'},'hi',{env,fetchImpl: async()=>{throw new Error('must not call')}}),/Non-allowlisted/);
});

test('reject path traversal, sensitive directories, and unexpected code paths', () => {
  for(const path of ['../.env','.github/workflows/ci.yml','src/real/providers.mjs','src/../../package.json','foo.js','/src/main.mjs','src\\foo.js','src//main.mjs'])
    assert.throws(()=>validateTargetPath(path));
  assert.equal(validateTargetPath('src/fixture.mjs'),'src/fixture.mjs');
});

test('reject symbolic links outside repository', async () => {
  const root=await temp();
  try { await symlink('/etc/passwd',resolve(root,'src/passwd.js')); await assert.rejects(()=>readTarget(root,'src/passwd.js'),/ordinary/); }
  finally { await rm(root,{recursive:true,force:true}); }
});

test('invalid JSON or unexpected file path cannot modify source', async () => {
  const root=await temp();
  try {
    await assert.rejects(()=>codeOneFile({root,targetPath:'src/fixture.mjs',task:'change example',env,fetchImpl:async()=>chat(answer('src/evil.mjs'))}),/Every configured free coding route failed/);
    assert.equal(await readFile(resolve(root,'src/fixture.mjs'),'utf8'),'export const value = 1;\n');
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('real free model response edits existing scoped file', async () => {
  const root=await temp();
  try {
    const result=await codeOneFile({root,targetPath:'src/fixture.mjs',task:'update the example value to 2',env,fetchImpl:async()=>chat(answer('src/fixture.mjs'))});
    assert.equal(result.status,'edited');assert.equal(result.agent,'groq-oss');
    assert.equal(await readFile(resolve(root,'src/fixture.mjs'),'utf8'),'export const value = 2;\n');
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('fallback on quota can edit through Gemini response', async () => {
  const root=await temp();
  let count=0;
  try {
    const result=await codeOneFile({root,targetPath:'src/fixture.mjs',task:'make a small change',env,fetchImpl:async url => {count++;return url.includes('groq')?response({},429):gemini(answer('src/fixture.mjs'));}});
    assert.equal(result.agent,'gemini-flash-lite');assert.equal(count,2);
    assert.equal(result.attempts[0].state,'quota_exhausted');
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('dryRun never writes files', async () => {
  const root=await temp();
  try {
    const result=await codeOneFile({root,targetPath:'src/fixture.mjs',task:'update',env,fetchImpl:async()=>chat(answer('src/fixture.mjs')),dryRun:true});
    assert.equal(result.status,'proposed');assert.equal(await readFile(resolve(root,'src/fixture.mjs'),'utf8'),'export const value = 1;\n');
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('provider never leaks API key in any error description', async () => {
  await assert.rejects(()=>failoverFree('task',{env,fetchImpl:async()=>response({ error: { message: 'fake-key' } },401)}),e=>{
    assert.ok(!e.message.includes('fake-key'));assert.ok(e.events.every(x=>!JSON.stringify(x).includes('fake-key')));return true;
  });
});

test('parseProposal respects exact JSON schema and maximum size', () => {
  assert.deepEqual(parseProposal('```json\n'+answer('src/f.mjs')+'\n```','src/f.mjs').path,'src/f.mjs');
  assert.throws(()=>parseProposal(answer('src/f.mjs','x'.repeat(19000)),'src/f.mjs'),/safety limits/);
  assert.throws(()=>parseProposal('not a JSON','src/f.mjs'),/invalid JSON/);
});
