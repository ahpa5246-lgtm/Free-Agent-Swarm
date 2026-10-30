import { AGENTS, createRun, advanceRun, summarizeRun, exportCheckpoint, importCheckpoint } from './engine.mjs';

const STORAGE_KEY = 'free-agent-swarm-demo-v1';
const $ = id => document.getElementById(id);
let run = null;
let interval = null;
const agentCards = new Map();

function safelyLoad() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? importCheckpoint(saved) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
function save() {
  try { if (run) localStorage.setItem(STORAGE_KEY, exportCheckpoint(run)); else localStorage.removeItem(STORAGE_KEY); }
  catch { toast('Browser storage is unavailable; export a checkpoint instead.'); }
}
function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => element.classList.remove('visible'), 3300);
}
function text(tag, value, className = '') {
  const node = document.createElement(tag); node.textContent = value;
  if (className) node.className = className;
  return node;
}
function renderAgents(containerId, expanded = false) {
  const grid = $(containerId); grid.replaceChildren();
  for (const agent of AGENTS) {
    const card = document.createElement('article'); card.className = 'agent-card'; card.dataset.agent = agent.id;
    const upper = document.createElement('div'); upper.className = 'agent-top';
    const badge = text('div', agent.initials, 'agent-badge'); badge.style.setProperty('--agent-accent', agent.color);
    upper.append(badge, text('span', 'SIMULATED', 'mini-status'));
    card.append(upper, text('h3', agent.name), text('p', agent.role));
    const foot = document.createElement('div'); foot.className = 'agent-foot';
    foot.append(text('span', 'Demo quota'), text('strong', `${run ? run.credits[agent.id] : agent.demoCredits} left`));
    card.append(foot); grid.append(card);
  }
}
function renderEvents(containerId) {
  const list = $(containerId); if (!list) return;
  list.replaceChildren();
  if (!run || run.events.length === 0) {
    list.append(text('div', 'No activity yet. Start a demo to see each decision and handoff.', 'empty-state')); return;
  }
  for (const event of [...run.events].reverse()) {
    const row = document.createElement('div'); row.className = `event-item event-${event.type}`;
    const dot = document.createElement('div'); dot.className = 'event-marker'; dot.textContent = event.type === 'success' ? '✓' : event.type === 'warning' ? '!' : event.type === 'handoff' ? '↗' : '•';
    const body = document.createElement('div'); body.className = 'event-body';
    body.append(text('strong', event.title), text('p', event.detail));
    const stamp = text('span', new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'event-time');
    row.append(dot, body, stamp); list.append(row);
  }
}
function render() {
  const summary = run ? summarizeRun(run) : { progress: 0, handoffs: 0, active: 'Not assigned' };
  $('metricHandoffs').textContent = String(summary.handoffs).padStart(2, '0');
  $('metricProgress').textContent = `${summary.progress}%`;
  $('metricStatus').textContent = !run ? 'Ready to launch' : run.status === 'complete' ? 'Review ready' : run.status === 'blocked' ? 'Quota exhausted' : 'Simulation active';
  $('progressLabel').textContent = `${run?.phase ?? 0} / 7 stages`;
  $('progressFill').style.width = `${summary.progress}%`;
  $('activeAgent').textContent = run ? summary.active : 'Not assigned';
  const active = AGENTS.find(agent => agent.id === run?.activeAgent);
  $('activeAgentBadge').textContent = active?.initials ?? '–';
  $('activeAgentBadge').style.setProperty('--agent-accent', active?.color ?? '#7e91a9');
  const pill = $('runPill'); pill.className = `run-pill ${run ? run.status : 'idle'}`;
  pill.replaceChildren(text('span', ''), document.createTextNode(!run ? ' Idle' : run.status === 'complete' ? ' Complete' : run.status === 'blocked' ? ' Blocked' : ' Running'));
  $('statusDescription').textContent = !run ? 'Launch a demo mission to watch an automatic handoff from one agent to another.' : run.status === 'complete' ? 'Simulation complete. Your mock draft PR is ready for review.' : run.status === 'blocked' ? 'Every provider is unavailable. Import a checkpoint or reset to try again.' : `Working on “${run.title}” · no external APIs or repositories touched.`;
  $('stepButton').disabled = !run || run.status === 'complete' || run.status === 'blocked';
  $('autoButton').disabled = !run || run.status === 'complete' || run.status === 'blocked';
  $('autoButton').textContent = interval ? 'Pause ‖' : 'Auto-play ▷';
  $('exportButton').disabled = !run;
  document.querySelectorAll('.phase-nodes span').forEach((dot, index) => { dot.className = index < (run?.phase ?? 0) ? 'finished' : index === (run?.phase ?? 0) ? 'selected' : ''; });
  renderAgents('agentGrid'); renderAgents('agentGridFull', true);
  renderEvents('eventList'); renderEvents('eventListFull');
}
function stopAuto() { if (interval) clearInterval(interval); interval = null; }
function step() {
  if (!run || ['complete', 'blocked'].includes(run.status)) { stopAuto(); return; }
  run = advanceRun(run); save(); render();
  if (['complete', 'blocked'].includes(run.status)) { stopAuto(); render(); toast(run.status === 'complete' ? 'Simulation finished. Check the timeline.' : 'No remaining demo quota.'); }
}
function startDemo(event) {
  event?.preventDefault(); stopAuto();
  try { run = createRun({ title: $('taskInput').value, repository: $('repoInput').value }); save(); render(); step(); toast('Demo launched — step through or press Auto-play.'); }
  catch (error) { toast(error.message); }
}
function downloadCheckpoint() {
  if (!run) { toast('Start a demo first.'); return; }
  const blob = new Blob([exportCheckpoint(run)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `swarm-${run.runId}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showView(id) {
  for (const panel of document.querySelectorAll('[data-panel]')) panel.classList.toggle('view-hidden', panel.id !== id);
  for (const tab of document.querySelectorAll('[data-view]')) tab.classList.toggle('active', tab.dataset.view === id);
  $('currentView').textContent = ({ overview: 'Overview', agents: 'Agent network', timeline: 'Run history', setup: 'Setup guide' })[id] ?? 'Overview';
  window.location.hash = id; window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('taskForm').addEventListener('submit', startDemo);
$('heroStart').addEventListener('click', () => { showView('overview'); startDemo(); });
$('stepButton').addEventListener('click', step);
$('autoButton').addEventListener('click', () => {
  if (interval) { stopAuto(); render(); return; }
  interval = setInterval(step, 850); render();
});
$('resetButton').addEventListener('click', () => { stopAuto(); run = null; save(); render(); toast('Demo cleared.'); });
$('viewAgents').addEventListener('click', () => showView('agents'));
$('exportButton').addEventListener('click', downloadCheckpoint);
$('timelineExport').addEventListener('click', downloadCheckpoint);
$('importButton').addEventListener('click', () => $('importInput').click());
$('importInput').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 100_000) { toast('Checkpoint file is too large.'); return; }
  try { stopAuto(); run = importCheckpoint(await file.text()); save(); render(); toast('Checkpoint restored.'); }
  catch { toast('Invalid checkpoint. No data imported.'); }
});
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', () => showView(link.dataset.view)));
document.querySelectorAll('[data-go]').forEach(link => link.addEventListener('click', () => showView(link.dataset.go)));
window.addEventListener('hashchange', () => { const name = window.location.hash.slice(1); if (['overview','agents','timeline','setup'].includes(name)) showView(name); });
run = safelyLoad(); render();
const startingView = window.location.hash.slice(1);
if (['agents','timeline','setup'].includes(startingView)) showView(startingView);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(() => {});
