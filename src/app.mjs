import { AGENTS, createRun, advanceRun, summarizeRun, exportCheckpoint, importCheckpoint } from './engine.mjs';
const KEY = 'free-agent-swarm-demo-v1';
const $ = id => document.getElementById(id);
let run = null;
let timer = null;
let inspected = 'codex';
const presets = {
  accessibility: 'Review this project, fix an accessibility issue, and prepare a draft PR.',
  testing: 'Write focused regression tests for an existing feature, check the results, and prepare a draft PR.',
  refactor: 'Safely refactor one duplicated module without behavior changes, then run relevant tests.'
};
const node = (tag, str, cls) => { const element = document.createElement(tag); element.textContent = str; if (cls) element.className = cls; return element; };
function toast(message) { const element = $('toast'); element.textContent = message; element.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('visible'), 2800); }
function load() { try { const stored = localStorage.getItem(KEY); return stored ? importCheckpoint(stored) : null; } catch { return null; } }
function save() { try { if (run) localStorage.setItem(KEY, exportCheckpoint(run)); else localStorage.removeItem(KEY); } catch { toast('Local storage is unavailable. Export a checkpoint to preserve your run.'); } }
function renderEvents(id) {
  const element = $(id); element.replaceChildren();
  if (!run?.events.length) { element.append(node('div', 'Nothing here yet. Start a demo run and the entire handoff will show up.', 'empty-data')); return; }
  for (const event of [...run.events].reverse()) {
    const row = node('div', '', 'event-item event-' + event.type);
    const mark = node('div', event.type === 'success' ? '✓' : event.type === 'warning' ? '!' : event.type === 'handoff' ? '↗' : '•', 'event-marker');
    const body = node('div', '', 'event-body'); body.append(node('strong', event.title), node('p', event.detail));
    row.append(mark, body, node('span', new Date(event.at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), 'event-time'));
    element.append(row);
  }
}
function renderDirectory() {
  const element = $('agentGridFull'); element.replaceChildren();
  for (const agent of AGENTS) {
    const card = node('article', '', 'agent-directory-card'); card.style.setProperty('--agent-accent', agent.color);
    card.append(node('div', agent.initials, 'directory-symbol'), node('h2', agent.name), node('p', agent.role));
    const foot = node('div', '', 'directory-meta'); foot.append(node('span', 'SIMULATED CREDITS'), node('strong', (run?.credits[agent.id] ?? agent.demoCredits) + ' UNITS'));
    card.append(foot); element.append(card);
  }
}
function render() {
  const summary = run ? summarizeRun(run) : { progress: 0, handoffs: 0, active: 'Supervisor' };
  $('metricHandoffs').textContent = String(summary.handoffs).padStart(2, '0');
  $('metricProgress').textContent = summary.progress + '%'; $('progressLabel').textContent = (run?.phase ?? 0) + ' / 7';
  $('progressFill').style.width = summary.progress + '%'; $('activeAgent').textContent = summary.active;
  $('activeAgentBadge').textContent = AGENTS.find(a => a.id === run?.activeAgent)?.initials ?? '✳';
  $('statusDescription').textContent = !run ? 'Waiting for a mission to begin.' : run.status === 'complete' ? 'Mock review complete. No real files were touched.' : run.status === 'blocked' ? 'No eligible demo quota remains. Your checkpoint is preserved.' : `Working through a simulated task in ${run.repository}`;
  const pill = $('runPill'); pill.className = 'run-pill ' + (run?.status ?? 'idle'); pill.textContent = (run?.status ?? 'idle').toUpperCase();
  $('networkStatus').textContent = run ? 'RUN / ' + run.status.toUpperCase() : 'AWAITING MISSION';
  $('networkVisual').dataset.phase = run?.phase ?? 0;
  $('agentCodexState').textContent = run?.credits.codex === 0 ? 'QUOTA REACHED' : 'PRIORITY 01';
  $('agentDeepseekState').textContent = run?.activeAgent === 'deepseek' ? 'ACTIVE FALLBACK' : 'STANDBY';
  for (const agent of document.querySelectorAll('.map-agent')) { const active = agent.dataset.agent === inspected; agent.classList.toggle('selected', active); agent.setAttribute('aria-pressed', String(active)); }
  const selected = AGENTS.find(agent => agent.id === inspected) ?? AGENTS[0];
  $('selectedAgentName').textContent = selected.name; $('selectedAgentRole').textContent = selected.role;
  $('selectedAgentCredits').textContent = String(run?.credits[selected.id] ?? selected.demoCredits);
  for (const id of ['stepButton', 'autoButton']) $(id).disabled = !run || ['complete', 'blocked'].includes(run.status);
  $('autoButton').textContent = timer ? 'PAUSE ‖' : 'AUTO PLAY ▷'; $('exportButton').disabled = !run;
  $('timelineExport').disabled = !run;
  renderEvents('eventList'); renderEvents('eventListFull'); renderDirectory();
}
function stop() { if (timer) clearInterval(timer); timer = null; }
function step() {
  if (!run || ['complete', 'blocked'].includes(run.status)) { stop(); return; }
  run = advanceRun(run); inspected = run.activeAgent; save(); render();
  if (['complete', 'blocked'].includes(run.status)) { stop(); render(); toast(run.status === 'complete' ? 'Demo finished: mock review ready.' : 'No demo providers available.'); }
}
function start(event) {
  event?.preventDefault(); stop();
  try { run = createRun({title: $('taskInput').value, repository: $('repoInput').value}); inspected = 'codex'; save(); step(); toast('Simulation started — choose next step or auto-play.'); }
  catch (err) { toast(err.message); }
}
const views = {overview:'Control room', agents:'The agents', timeline:'Run replay', setup:'Get connected'};
function show(view) {
  if (!Object.hasOwn(views, view)) return;
  document.querySelectorAll('[data-panel]').forEach(element => element.classList.toggle('hidden', element.id !== view));
  document.querySelectorAll('[data-view]').forEach(element => { const active = element.dataset.view === view; element.classList.toggle('active', active); if (active) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current'); });
  $('currentView').textContent = views[view]; if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view); window.scrollTo({top:0,behavior:'instant'});
}
function exportJSON() {
  if (!run) return toast('Start a run before exporting.');
  const url = URL.createObjectURL(new Blob([exportCheckpoint(run)], {type:'application/json'}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'swarm-' + run.runId + '.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('taskForm').addEventListener('submit', start);
$('heroStart').addEventListener('click', () => { show('overview'); start(); $('taskForm').scrollIntoView({block:'center',behavior:'smooth'}); });
$('stepButton').addEventListener('click', step);
$('autoButton').addEventListener('click', () => { if (timer) { stop(); render(); return; } timer = setInterval(step, 950); render(); });
$('resetButton').addEventListener('click', () => { stop(); run = null; inspected = 'codex'; save(); render(); toast('Demo reset. Ready for a new mission.'); });
$('exportButton').addEventListener('click', exportJSON); $('timelineExport').addEventListener('click', exportJSON);
$('importButton').addEventListener('click', () => $('importInput').click());
$('importInput').addEventListener('change', async event => {
  const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
  if (file.size > 100000) return toast('Checkpoint too large.');
  try { const restored = importCheckpoint(await file.text()); stop(); run = restored; inspected = run.activeAgent; save(); render(); toast('Checkpoint restored.'); } catch { toast('Invalid checkpoint.'); }
});
document.querySelectorAll('[data-view]').forEach(element => element.addEventListener('click', () => show(element.dataset.view)));
document.querySelectorAll('[data-go]').forEach(element => element.addEventListener('click', () => show(element.dataset.go)));
document.querySelectorAll('[data-agent]').forEach(element => element.addEventListener('click', () => { inspected = element.dataset.agent; render(); }));
document.querySelectorAll('[data-scenario]').forEach(element => element.addEventListener('click', () => {
  $('taskInput').value = presets[element.dataset.scenario];
  document.querySelectorAll('[data-scenario]').forEach(button => button.classList.toggle('active', button === element));
  $('taskInput').focus();
}));
window.addEventListener('hashchange', () => show(location.hash.slice(1)));
run = load(); if (run) inspected = run.activeAgent; render(); show(location.hash.slice(1) || 'overview');
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(() => {});
