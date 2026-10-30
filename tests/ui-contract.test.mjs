import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.mjs', import.meta.url), 'utf8');
const ids = ['overview','agents','timeline','setup','taskForm','repoInput','taskInput','startButton',
  'networkVisual','agentCodexState','agentDeepseekState','selectedAgentName','selectedAgentCredits',
  'runPill','progressFill','stepButton','autoButton','resetButton','eventList','eventListFull',
  'exportButton','importButton','importInput','timelineExport','agentGridFull'];
test('all preserved controls remain present once', () => {
  for (const id of ids) {
    assert.equal([...html.matchAll(new RegExp(`id=["']${id}["']`, 'g'))].length, 1, `Missing or duplicated #${id}`);
  }
});
test('agent selection and demo quota inspector are wired', () => {
  assert.match(html,/data-agent="deepseek"/);assert.match(html,/data-agent="codex"/);
  assert.match(app,/selectedAgentCredits/);assert.match(app,/\[data-agent\]/);
});
test('offline browser demo is explicitly identified, with no embedded secrets', () => {
  assert.match(html,/No API calls\. No GitHub writes/);
  assert.match(html,/SIMULATION ONLY/);
  assert.doesNotMatch(html,/sk-[A-Za-z0-9]{20,}/);
  assert.doesNotMatch(html,/<script[^>]+src="https?:/);
});
test('mobile diagram is constrained to internal scrolling, with reduced motion', () => {
  assert.match(css,/\.network-scroll\{[^}]*overflow-x:auto/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
