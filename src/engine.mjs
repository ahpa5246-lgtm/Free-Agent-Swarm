/**
 * Deterministic, offline-only educational simulation.
 * This does NOT call real AI providers or change GitHub repositories.
 */
export const AGENTS = Object.freeze([
  { id: 'codex', name: 'Codex', initials: 'CX', role: 'Implementation', color: '#94a3ff', demoCredits: 2 },
  { id: 'deepseek', name: 'DeepSeek', initials: 'DS', role: 'Fallback coding', color: '#46d6c5', demoCredits: 5 },
  { id: 'kimi', name: 'Kimi', initials: 'KM', role: 'Deep analysis', color: '#e2a8ff', demoCredits: 3 },
  { id: 'gemini', name: 'Gemini', initials: 'GM', role: 'Review & testing', color: '#f4bd74', demoCredits: 4 },
  { id: 'qwen', name: 'Qwen', initials: 'QW', role: 'Backup provider', color: '#85cafa', demoCredits: 4 },
  { id: 'gpt-oss', name: 'GPT-OSS', initials: 'GO', role: 'Open-model backup', color: '#d6e29b', demoCredits: 4 }
]);

export const MAX_EVENTS = 80;
const STAGES = ['started', 'inspection', 'quota_hit', 'handoff', 'implementation', 'tests', 'completed'];
const EXAMPLE_TASK = 'Review the project structure, fix one accessibility issue, and prepare a draft PR.';

export function cleanField(value, limit = 200) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
}

export function createRun({ title = EXAMPLE_TASK, repository = 'example/hello-world' } = {}) {
  const normalizedTitle = cleanField(title, 240);
  const normalizedRepo = cleanField(repository, 120);
  if (!normalizedTitle || !normalizedRepo) throw new Error('A task and repository are required.');
  return {
    schema: 1,
    runId: `demo-${Date.now().toString(36)}`,
    title: normalizedTitle,
    repository: normalizedRepo,
    mode: 'simulation',
    phase: 0,
    status: 'queued',
    activeAgent: 'codex',
    credits: Object.fromEntries(AGENTS.map(agent => [agent.id, agent.demoCredits])),
    events: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function chooseNextAgent(run, excluded = []) {
  return AGENTS.find(agent => !excluded.includes(agent.id) && run.credits[agent.id] > 0)?.id ?? null;
}

function addEvent(run, type, title, detail, agentId) {
  const event = { id: `${run.runId}-${run.phase}`, type, title, detail, agentId, at: new Date().toISOString() };
  return { ...run, events: [...run.events, event].slice(-MAX_EVENTS), updatedAt: event.at };
}

export function advanceRun(original) {
  const run = validateRun(original);
  if (run.status === 'complete' || run.status === 'blocked') return run;
  let next = { ...run, phase: run.phase + 1, status: 'running', credits: { ...run.credits } };
  switch (STAGES[run.phase]) {
    case 'started':
      next = addEvent(next, 'active', 'Task accepted', 'Supervisor assigned the first agent. This is a simulated execution.', 'codex');
      break;
    case 'inspection':
      next.credits.codex -= 1;
      next = addEvent(next, 'success', 'Repository inspection finished', 'A simulated codebase review and task scope were recorded.', 'codex');
      break;
    case 'quota_hit':
      next.credits.codex = 0;
      next = addEvent(next, 'warning', 'Demo quota reached', 'Codex was deliberately exhausted to demonstrate a safe handoff.', 'codex');
      break;
    case 'handoff': {
      const candidate = chooseNextAgent(next, ['codex']);
      if (!candidate) {
        next.status = 'blocked';
        next = addEvent(next, 'warning', 'No eligible provider', 'Progress is preserved until a usable quota is available.', 'codex');
      } else {
        next.activeAgent = candidate;
        next = addEvent(next, 'handoff', `Transferred to ${AGENTS.find(a => a.id === candidate).name}`, 'The next agent receives the task goal, prior notes and checkpoint.', candidate);
      }
      break;
    }
    case 'implementation':
      next.credits[next.activeAgent] = Math.max(0, next.credits[next.activeAgent] - 1);
      next = addEvent(next, 'active', 'Implementation proposal created', 'Mock diff prepared; no files or repositories were modified.', next.activeAgent);
      break;
    case 'tests':
      next = addEvent(next, 'success', 'Validation gates passed', 'Simulated lint, test and scope checks completed.', 'gemini');
      break;
    case 'completed':
      next.status = 'complete';
      next = addEvent(next, 'success', 'Ready for human review', 'The demo ends at a mock draft PR. No external action was taken.', next.activeAgent);
      break;
    default:
      next.status = 'complete';
  }
  return next;
}

export function validateRun(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('Invalid checkpoint.');
  if (candidate.schema !== 1 || candidate.mode !== 'simulation') throw new Error('Unsupported checkpoint version.');
  if (!Number.isInteger(candidate.phase) || candidate.phase < 0 || candidate.phase > STAGES.length) throw new Error('Invalid checkpoint stage.');
  if (!['queued', 'running', 'complete', 'blocked'].includes(candidate.status)) throw new Error('Invalid checkpoint status.');
  if (!AGENTS.some(agent => agent.id === candidate.activeAgent)) throw new Error('Unknown agent.');
  if (!candidate.credits || typeof candidate.credits !== 'object') throw new Error('Missing quota state.');
  for (const agent of AGENTS) {
    const credit = candidate.credits[agent.id];
    if (!Number.isInteger(credit) || credit < 0 || credit > 1_000) throw new Error('Invalid quota state.');
  }
  if (typeof candidate.title !== 'string' || !candidate.title.trim() || candidate.title.length > 240) throw new Error('Invalid title.');
  if (typeof candidate.repository !== 'string' || !candidate.repository.trim() || candidate.repository.length > 120) throw new Error('Invalid repository.');
  if (!Array.isArray(candidate.events) || candidate.events.length > MAX_EVENTS) throw new Error('Invalid events.');
  for (const event of candidate.events) {
    if (!event || typeof event !== 'object' || typeof event.title !== 'string' || event.title.length > 160 || typeof event.detail !== 'string' || event.detail.length > 500) throw new Error('Invalid event.');
  }
  return candidate;
}

export function exportCheckpoint(run) {
  return JSON.stringify(validateRun(run), null, 2);
}

export function importCheckpoint(text) {
  if (typeof text !== 'string' || text.length > 100_000) throw new Error('Checkpoint too large.');
  const parsed = JSON.parse(text);
  return validateRun(parsed);
}

export function summarizeRun(run) {
  return {
    progress: Math.round((Math.min(run.phase, STAGES.length) / STAGES.length) * 100),
    handoffs: run.events.filter(event => event.type === 'handoff').length,
    completed: run.status === 'complete',
    active: AGENTS.find(a => a.id === run.activeAgent)?.name ?? '—'
  };
}
