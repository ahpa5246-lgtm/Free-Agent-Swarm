import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENTS, advanceRun, chooseNextAgent, cleanField, createRun, exportCheckpoint, importCheckpoint, summarizeRun } from '../src/engine.mjs';

test('creates a safe simulation only', () => {
  const run = createRun({ title: 'Fix bug', repository: 'demo/app' });
  assert.equal(run.mode, 'simulation'); assert.equal(run.phase, 0); assert.equal(run.events.length, 0);
});
test('rejects empty tasks and trims controls', () => {
  assert.throws(() => createRun({ title: '  ', repository: 'demo/app' }));
  assert.equal(cleanField('hello\nworld'), 'hello world');
});
test('failover on quota does not reset prior events', () => {
  let run = createRun();
  for (let i = 0; i < 4; i++) run = advanceRun(run);
  assert.equal(run.activeAgent, 'deepseek');
  assert.equal(run.credits.codex, 0);
  assert.equal(run.events.length, 4);
  assert.equal(run.events[2].type, 'warning');
  assert.equal(run.events[3].type, 'handoff');
});
test('complete simulation remains terminal and leaves handoff history', () => {
  let run = createRun();
  for (let i = 0; i < 7; i++) run = advanceRun(run);
  assert.equal(run.status, 'complete');
  assert.equal(advanceRun(run), run);
  assert.equal(summarizeRun(run).progress, 100);
  assert.equal(summarizeRun(run).handoffs, 1);
});
test('all free demo credits exhausted causes blocked state rather than loop', () => {
  let run = createRun();
  for (let i = 0; i < 3; i++) run = advanceRun(run);
  for (const provider of AGENTS) run.credits[provider.id] = 0;
  run = advanceRun(run);
  assert.equal(run.status, 'blocked');
  assert.equal(run.events.at(-1).title, 'No eligible provider');
});
test('checkpoint round trip resumes exact stage and handoff', () => {
  let run = createRun();
  for (let i = 0; i < 4; i++) run = advanceRun(run);
  const restored = importCheckpoint(exportCheckpoint(run));
  assert.equal(restored.phase, 4); assert.equal(restored.activeAgent, 'deepseek');
  assert.equal(advanceRun(restored).phase, 5);
});
test('rejects corrupt and malicious checkpoints', () => {
  assert.throws(() => importCheckpoint('{ invalid'));
  assert.throws(() => importCheckpoint(JSON.stringify({ ...createRun(), phase: -1 })));
  assert.throws(() => importCheckpoint(JSON.stringify({ ...createRun(), mode: 'live' })));
  assert.throws(() => importCheckpoint(JSON.stringify({ ...createRun(), credits: { ...createRun().credits, codex: -100 } })));
});
test('selection skips exhausted providers', () => {
  const run = createRun(); run.credits.codex = 0; run.credits.deepseek = 0;
  assert.equal(chooseNextAgent(run), 'kimi');
});
