#!/usr/bin/env node
/** Server-side GitHub Actions entrypoint. Never included in the PWA bundle. */
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeOneFile } from '../src/real/coding.mjs';

const root = process.cwd();
const targetPath = process.env.SWARM_TARGET_PATH;
const task = process.env.SWARM_TASK;
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
const reportDir = resolve(root, '.swarm-reports');
await mkdir(reportDir, { recursive: true });
const receipt = { schema: 1, mode: 'live-free-api', status: 'blocked', targetPath, timestamp: new Date().toISOString(), attempts: [] };
try {
  const result = await codeOneFile({ root, targetPath, task, env: process.env });
  Object.assign(receipt, result);
  console.log(`Live agent ${result.agent} proposed an edit for ${result.targetPath}; tests must pass before any PR.`);
} catch (err) {
  receipt.error = err.message;
  receipt.attempts = err.attempts ?? [];
  console.error(`Agent blocked: ${err.message}`);
} finally {
  await writeFile(resolve(reportDir, 'last-run.json'), JSON.stringify(receipt, null, 2) + '\n');
  if (summaryFile) await appendFile(summaryFile, `\n## Free Agent Swarm live run\n- Status: **${receipt.status}**\n- Provider route: ${receipt.agent ?? 'none'}\n- Target: \`${targetPath ?? 'unknown'}\`\n- No automatic merge or deployment.\n`);
}
if (receipt.status !== 'edited') process.exitCode = 1;
