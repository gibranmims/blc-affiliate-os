/* ============================================================
   BLC Affiliate OS — SPA JavaScript
   ============================================================ */

const API = {
  outreach:    '/api/outreach',
  roster:      '/api/roster',
  generate:    '/api/generate',
  outreachGen: '/api/outreach-gen'
};

const STATUSES = [
  { key: 'drafted',          label: 'In Drafts',         color: 'gray'   },
  { key: 'sent',             label: 'Sent',               color: 'blue'   },
  { key: 'replied',          label: 'Replied',            color: 'yellow' },
  { key: 'counter_review',   label: 'Ctr. For Review',   color: 'purple' },
  { key: 'counter_approved', label: 'Ctr. Approved',     color: 'teal'   },
  { key: 'counter_offered',  label: 'Countered',          color: 'orange' },
  { key: 'counter_rejected', label: 'Ctr. Rejected',      color: 'red'    },
  { key: 'signed',           label: 'Signed',             color: 'green'  },
  { key: 'archived',         label: 'Archived',           color: 'gray'   }
];

const state = {
  currentPage:        'outreach',
  outreach:           [],
  roster:             [],
  outreachFilter:     'all',
  outreachView:       'pipeline',  // 'pipeline' | 'new-batch'
  selectedOutreachId: null,
  activeRosterId:     null,
  selectedIds:        new Set(),
  outreachSort:       { col: 'followers', dir: 'desc' },
  dpAccordion:        { rates: false, eval: true, founderEval: false, counter: true },
  tiktokConnected:    false,
  scripts:            [],
  scriptsLoaded:      false,
  contentLabTab:      'generator',
  rosterTab:          'paid'
};

const nbState = {
  emails:         [],
  selectedFile:   null,
  gmailConnected: false,
  connectedEmail: null,
  driveConnected: false,
  driveEmail:     null,
  draftMode:      'manual',
  savedCount:     0,
  polling:        null
};

// ============================================================
// UTILITIES
// ============================================================

async function fetchAPI(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error ${res.status} — check Railway deploy logs`);
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showDraftSuccessModal(savedCount, addedCount, gmailEmail, isSingle = false, pipelineError = null) {
  const existing = document.getElementById('draft-success-modal');
  if (existing) existing.remove();

  const emailLabel = gmailEmail ? `<strong>${esc(gmailEmail)}</strong> drafts` : `your Gmail drafts`;

  const el = document.createElement('div');
  el.id = 'draft-success-modal';
  el.className = 'draft-modal-overlay';
  el.innerHTML = `
    <div class="draft-modal">
      <button class="draft-modal-close" onclick="document.getElementById('draft-success-modal').remove()">✕</button>
      <div class="draft-modal-icon">✅</div>
      <div class="draft-modal-title">
        <span>${savedCount} draft${savedCount !== 1 ? 's' : ''}</span> saved to ${emailLabel}<br>
        and <span>${addedCount} creator${addedCount !== 1 ? 's' : ''}</span> added to your pipeline.
      </div>
      <hr class="draft-modal-divider">
      ${pipelineError ? `
      <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--red);text-align:left">
        <strong>Pipeline error:</strong> ${esc(pipelineError)}
      </div>` : ''}
      <div class="draft-modal-reminder">
        Don't forget to go into Gmail and <strong>manually send each draft</strong> when you're ready. Once sent, come back and move each creator from <strong>Drafted → Sent</strong> in your pipeline.
      </div>
      <div class="draft-modal-actions">
        ${isSingle
          ? `<button class="btn btn-primary" onclick="document.getElementById('draft-success-modal').remove()">Got it</button>`
          : `<button class="btn btn-primary" onclick="document.getElementById('draft-success-modal').remove(); backToPipeline()">Go to Pipeline</button>
             <button class="btn btn-secondary" onclick="document.getElementById('draft-success-modal').remove(); clearBatch()">New Batch</button>`
        }
      </div>
    </div>`;

  el.addEventListener('click', (e) => {
    if (e.target === el) el.remove();
  });

  document.body.appendChild(el);
}

function fmt$(val) {
  if (val === null || val === undefined || val === '') return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(val) {
  if (!val && val !== 0) return '—';
  const n = parseInt(val);
  if (isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  return n.toLocaleString('en-US');
}

function fmtGMV(val) {
  if (!val) return '—';
  const n = Number(val);
  if (isNaN(n) || n === 0) return '—';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Returns fresh follow-up dates when a counter offer is sent (today +4, +8 days)
function counterFollowupPayload() {
  const d1 = new Date(); d1.setDate(d1.getDate() + 4);
  const d2 = new Date(); d2.setDate(d2.getDate() + 8);
  return {
    followup1_date: d1.toISOString().split('T')[0],
    followup2_date: d2.toISOString().split('T')[0],
    followup1_sent: false,
    followup2_sent: false
  };
}

// Returns CSS class based on whether a date is overdue, today, or upcoming
function fuDateClass(dateStr) {
  if (!dateStr) return '';
  const t = todayStr();
  if (dateStr < t) return 'fu-overdue';
  if (dateStr === t) return 'fu-today';
  return 'fu-upcoming';
}

function renderFUBadge(r) {
  if (!r.sent_date) return '';
  const t = todayStr();
  if (!r.followup1_sent && r.followup1_date) {
    const cls = r.followup1_date < t ? 'fu-badge-overdue' : r.followup1_date === t ? 'fu-badge-today' : 'fu-badge-dim';
    return `<div class="fu-badge ${cls}">FU1 · ${fmtDateShort(r.followup1_date)}</div>`;
  }
  if (r.followup1_sent && !r.followup2_sent && r.followup2_date) {
    const cls = r.followup2_date < t ? 'fu-badge-overdue' : r.followup2_date === t ? 'fu-badge-today' : 'fu-badge-dim';
    return `<div class="fu-badge ${cls}">FU2 · ${fmtDateShort(r.followup2_date)}</div>`;
  }
  if (r.followup2_sent) {
    return `<div class="fu-badge fu-badge-done">All FUs sent ✓</div>`;
  }
  return '';
}

// Statuses where follow-ups are no longer relevant
const FU_HIDDEN_STATUSES = new Set(['replied','counter_review','counter_approved','counter_rejected','signed','archived']);

// Renders a table cell for FU1 or FU2 columns — color-coded by status
function renderFUCell(r, num) {
  // Once they've responded, follow-ups are irrelevant
  if (FU_HIDDEN_STATUSES.has(r.status)) return `<td class="fu-col fu-col-empty">—</td>`;

  const dateStr = num === 1 ? r.followup1_date : r.followup2_date;
  const isSent  = num === 1 ? r.followup1_sent : r.followup2_sent;

  if (isSent) {
    return `<td class="fu-col fu-col-sent" onclick="event.stopPropagation();toggleFollowupSent('${r.id}',${num})" title="Click to unmark">
      <span class="fu-sent-pill">✓ FU${num} Sent</span>
    </td>`;
  }
  if (!dateStr) return `<td class="fu-col fu-col-empty">—</td>`;
  const t = todayStr();
  if (dateStr < t) return `<td class="fu-col fu-col-overdue" onclick="event.stopPropagation();toggleFollowupSent('${r.id}',${num})" title="Mark as sent">
    ${fmtDateShort(dateStr)} <span class="fu-mark-hint">mark sent</span>
  </td>`;
  return `<td class="fu-col fu-col-upcoming">${fmtDateShort(dateStr)}</td>`;
}

// Returns pre-written follow-up message text for a given outreach record
function fuMessageText(r, num) {
  const firstName = (r.name || r.handle || 'there').split(' ')[0];
  const sender = r.sender || 'Tamar';

  // Counter-offer follow-ups use different copy
  if (r.status === 'counter_offered') {
    if (num === 1) return [
      `Hey ${firstName},`,
      ``,
      `Just wanted to follow up on my last message — would love to hear if these rates work for you.`,
      ``,
      `Let me know.`,
      ``,
      sender
    ].join('\n');
    return [
      `Hey ${firstName},`,
      ``,
      `Before I close the loop on this one, just wanted to reach out one last time.`,
      ``,
      `Let me know if these rates work for you.`,
      ``,
      sender
    ].join('\n');
  }

  // Standard sent-phase follow-ups
  if (num === 1) return [
    `Hey ${firstName},`,
    ``,
    `Just wanted to follow up on my last message in case it got buried.`,
    ``,
    `We'd love to hear your rates if this is something you'd be open to.`,
    ``,
    `Let me know!`,
    ``,
    `Warmly,`,
    `Lu`
  ].join('\n');
  return [
    `Hey ${firstName},`,
    ``,
    `Before I close the loop on this one, just wanted to reach out one last time.`,
    ``,
    `We'd love to hear your rates for 3, 5, or 10 videos a month.`,
    ``,
    `Hope to hear from you.`,
    ``,
    `Warmly,`,
    `Lu`
  ].join('\n');
}

function avgRatePerVid(r) {
  const rates = [];
  if (r.asked_rate_3  && r.asked_rate_3  > 0) rates.push(r.asked_rate_3  / 3);
  if (r.asked_rate_5  && r.asked_rate_5  > 0) rates.push(r.asked_rate_5  / 5);
  if (r.asked_rate_10 && r.asked_rate_10 > 0) rates.push(r.asked_rate_10 / 10);
  if (r.asked_rate_custom && r.asked_rate_custom_count && r.asked_rate_custom > 0)
    rates.push(r.asked_rate_custom / r.asked_rate_custom_count);
  if (rates.length === 0) return null;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status) {
  const s = STATUSES.find(x => x.key === status) || { label: status, color: 'gray' };
  return `<span class="badge badge-${s.color}">${s.label}</span>`;
}

function gradeBadge(grade) {
  if (!grade) return '—';
  const color = grade.startsWith('A') ? 'green' : grade.startsWith('B') ? 'blue' : 'yellow';
  const cls   = grade.replace('+','plus').replace('-','minus');
  return `<span class="badge badge-${color} grade-badge grade-badge-${cls}">${grade}</span>`;
}

function rosterStatusBadge(status) {
  const map    = { active: 'green', onboarding: 'purple', watching: 'blue', paused: 'yellow', inactive: 'gray' };
  const labels = { active: 'Active', onboarding: 'Onboarding', watching: 'Watching', paused: 'Paused', inactive: 'Inactive' };
  return `<span class="badge badge-${map[status] || 'gray'}">${labels[status] || esc(status)}</span>`;
}

function platformIcon(p) {
  return { TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Pinterest: '📌' }[p] || '🌐';
}

function selectOpts(options, selected) {
  return options.map(([val, label]) =>
    `<option value="${val}" ${val === selected ? 'selected' : ''}>${label}</option>`
  ).join('');
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Copy failed — select and copy manually', 'error'));
}

const EVAL_QUESTIONS = [
  { key: 'product_fit',        label: 'Product Fit',
    q: 'Does she match the demographic or creator type that could sell BLC?',
    optLabels: ['Absolutely', 'Kinda', 'No'] },
  { key: 'on_camera_energy',   label: 'On Camera Energy',
    q: 'Authentic, good delivery, fast pace, believable?',
    optLabels: ['Magnetic', 'Average', 'Boring'] },
  { key: 'production_quality', label: 'Production Quality',
    q: 'Good lighting, audio, native captions, understands viral video basics?',
    optLabels: ['Fire', 'Mid', 'Trash'] },
  { key: 'viral_track_record', label: 'Viral Track Record',
    q: 'How many videos over 1M views?',
    opts: ['none','1to3','4plus'], optLabels: ['None', '1–3', '4+'] },
  { key: 'viral_potential',    label: 'Viral Potential',
    q: 'Can you imagine her going viral specifically for BLC?',
    optLabels: ['Yes', 'Maybe', 'No'] },
  { key: 'sales_structure',    label: 'Sales Structure',
    q: 'Does she know how to structure videos to drive sales?',
    optLabels: ['Yes', 'Kinda', 'No'] },
];

// Each score 0–12 maps to a grade and a suggested per-video counter rate
const GRADE_SCALE = [
  { score: 12, grade: 'A+', perVid: 400, tier: 'A', desc: 'Top tier — premium rate' },
  { score: 11, grade: 'A',  perVid: 300, tier: 'A', desc: 'Strong A — mid A range' },
  { score: 10, grade: 'A-', perVid: 200, tier: 'A', desc: 'Low A — bottom of A range' },
  { score:  9, grade: 'B+', perVid: 130, tier: 'B', desc: 'Near A — top of B range' },
  { score:  8, grade: 'B',  perVid: 100, tier: 'B', desc: 'Solid B — mid B range' },
  { score:  7, grade: 'B-', perVid:  85, tier: 'B', desc: 'Low B — bottom of B range' },
  { score:  6, grade: 'B-', perVid:  75, tier: 'B', desc: 'Low B — floor of B range' },
  { score:  5, grade: 'C+', perVid:  50, tier: 'C', desc: 'Near B — top of C range' },
  { score:  4, grade: 'C',  perVid:  35, tier: 'C', desc: 'Mid C range' },
  { score:  3, grade: 'C',  perVid:  25, tier: 'C', desc: 'Low C range' },
  { score:  2, grade: 'C-', perVid:  15, tier: 'C', desc: 'Very low — reconsider' },
  { score:  1, grade: 'C-', perVid:   0, tier: 'C', desc: 'Pass' },
  { score:  0, grade: 'C-', perVid:   0, tier: 'C', desc: 'Pass' },
];

function gradeInfo(gradeOrScore) {
  if (typeof gradeOrScore === 'number') return GRADE_SCALE.find(g => g.score === gradeOrScore) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return GRADE_SCALE.find(g => g.grade === gradeOrScore) || null;
}

function evalFieldScore(key, val) {
  if (key === 'viral_track_record') {
    if (val === '4plus') return 2;
    if (val === '1to3') return 1;
    return 0;
  }
  if (val === 'yes') return 2;
  if (val === 'maybe') return 1;
  return 0;
}

function calcEvalScore(r) {
  return EVAL_QUESTIONS.reduce((sum, q) => sum + evalFieldScore(q.key, r[q.key] || ''), 0);
}

function calcFounderEvalScore(r) {
  return EVAL_QUESTIONS.reduce((sum, q) => sum + evalFieldScore(q.key, r[`founder_${q.key}`] || ''), 0);
}

function autoTierFromScore(score) {
  const g = gradeInfo(score);
  return g ? g.grade : 'C-';
}

function tierRange(grade) {
  const g = gradeInfo(grade);
  return g ? `$${g.perVid}/vid suggested` : '';
}

function gradeColor(grade) {
  if (!grade) return 'gray';
  if (grade.startsWith('A')) return 'green';
  if (grade.startsWith('B')) return 'blue';
  return 'yellow';
}

// ============================================================
// MODAL
// ============================================================

let _onSubmit = null;

function openModal(title, bodyHTML, onSubmit) {
  _onSubmit = onSubmit || null;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
  const form = document.getElementById('modal-form');
  if (form && _onSubmit) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await _onSubmit(e);
    });
  }
  const first = document.querySelector('#modal-body input, #modal-body select, #modal-body textarea');
  if (first) setTimeout(() => first.focus(), 50);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
  _onSubmit = null;
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) closeModal();
}

// ============================================================
// NAVIGATION
// ============================================================

function navigate(page) {
  if (page === 'outreach') state.outreachView = 'pipeline';
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Roster nav group — open on roster navigation, update sub-item active state
  if (page === 'roster') {
    const g = document.getElementById('nav-group-roster');
    if (g) g.classList.add('open');
    updateRosterSubNav();
  }
  const renderers = {
    outreach: renderOutreachPage,
    roster:   renderRosterPage,
    scripts:  renderScriptsPage,
    review:   renderForReviewPage,
    finance:  renderFinancePage
  };
  if (renderers[page]) renderers[page]();
}

function updateRosterSubNav() {
  document.querySelectorAll('.nav-sub-item[data-roster-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.rosterTab === state.rosterTab);
  });
}

// ============================================================
// OUTREACH — DATA
// ============================================================

async function loadOutreach() {
  state.outreach = await fetchAPI(API.outreach);
  updateReviewBadge();
  updateRepliedBadge();
}

// ============================================================
// OUTREACH — PAGE DISPATCHER
// ============================================================

function renderOutreachPage() {
  if (state.outreachView === 'new-batch') {
    renderNewBatchView();
  } else {
    renderPipelineView();
  }
}

// ============================================================
// OUTREACH — PIPELINE VIEW
// ============================================================

function renderPipelineView() {
  const pipelineStatuses = STATUSES.filter(s => s.key !== 'archived');
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = state.outreach.filter(r => r.status === s.key).length;
    return acc;
  }, {});
  const allCount = state.outreach.filter(r => r.status !== 'archived').length;

  const STATUS_PRIORITY = { signed: 0, counter_offered: 1, counter_approved: 2, counter_review: 3, replied: 4, sent: 5, drafted: 6, archived: 7 };
  const filtered = (state.outreachFilter === 'all'
    ? state.outreach.filter(r => r.status !== 'archived')
    : state.outreachFilter === 'archived'
    ? state.outreach.filter(r => r.status === 'archived')
    : state.outreach.filter(r => r.status === state.outreachFilter)
  ).slice().sort((a, b) => {
    const { col, dir } = state.outreachSort;
    // In "All" view always float active pipeline to top first
    if (state.outreachFilter === 'all') {
      const pa = STATUS_PRIORITY[a.status] ?? 9;
      const pb = STATUS_PRIORITY[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
    }
    let av, bv;
    if (col === 'followers') { av = a.follower_count || 0; bv = b.follower_count || 0; }
    else if (col === 'rates') { av = avgRatePerVid(a) || 0; bv = avgRatePerVid(b) || 0; }
    else if (col === 'name') { av = (a.name || a.handle || '').toLowerCase(); bv = (b.name || b.handle || '').toLowerCase(); }
    else if (col === 'status') { av = a.status || ''; bv = b.status || ''; }
    else { av = 0; bv = 0; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  state.filteredIds = filtered.map(r => r.id);

  const inPipeline = ['sent','replied','counter_review','counter_approved','counter_offered']
    .reduce((s, k) => s + (counts[k] || 0), 0);

  const anySelected = state.selectedIds.size > 0;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Outreach</h1>
        <p class="page-subtitle">Track creator pipeline from first email to signed deal</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" onclick="openAddOutreachModal()">+ Add Creator</button>
        <button class="btn btn-primary" onclick="openNewBatch()">+ New Batch</button>
      </div>
    </div>

    <div class="stat-cards">
      <div class="stat-card stat-card-neutral">
        <div class="stat-value">${allCount}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card stat-card-blue">
        <div class="stat-value blue">${inPipeline}</div>
        <div class="stat-label">In Pipeline</div>
      </div>
      <div class="stat-card stat-card-green">
        <div class="stat-value green">${counts.signed || 0}</div>
        <div class="stat-label">Signed</div>
      </div>
      <div class="stat-card stat-card-red ${(counts.replied||0) > 0 ? 'stat-card-red-active' : ''}" style="cursor:${(counts.replied||0)>0?'pointer':'default'}" onclick="${(counts.replied||0)>0?`setOutreachFilter('replied')`:''}">
        <div class="stat-value red">${counts.replied || 0}</div>
        <div class="stat-label">Need Reply${(counts.replied||0)>0?' ↗':''}</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-tabs">
        <button class="filter-tab ${state.outreachFilter === 'all' ? 'active' : ''}" onclick="setOutreachFilter('all')">
          All <span class="filter-count">${allCount}</span>
        </button>
        ${pipelineStatuses.map(s => `
          <button class="filter-tab filter-tab-${s.key} ${state.outreachFilter === s.key ? 'active' : ''}" onclick="setOutreachFilter('${s.key}')">
            ${s.label} <span class="filter-count">${counts[s.key] || 0}</span>
          </button>
        `).join('')}
        <button class="filter-tab filter-tab-archive ${state.outreachFilter === 'archived' ? 'active' : ''}" onclick="setOutreachFilter('archived')">
          Archived <span class="filter-count">${counts.archived || 0}</span>
        </button>
      </div>
    </div>

    ${anySelected ? `
    <div class="selection-bar" id="selection-bar">
      <span class="selection-count">${state.selectedIds.size} selected</span>
      <div class="selection-actions">
        <select class="bulk-status-select" id="bulk-status-select">
          <option value="">Change status…</option>
          ${STATUSES.filter(s => s.key !== 'archived').map(s => `<option value="${s.key}">${s.label}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="bulkChangeStatus()">Apply</button>
        ${state.outreachFilter !== 'archived' ? `
          <button class="btn btn-secondary btn-sm" onclick="bulkArchive()">Archive</button>
        ` : ''}
        <button class="btn btn-danger btn-sm" onclick="bulkDelete()">Delete</button>
        <button class="btn btn-secondary btn-sm" onclick="clearSelection()">Deselect</button>
      </div>
    </div>
    ` : ''}

    <div class="table-container">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📬</div>
          <h3>${state.outreachFilter === 'all' ? 'No creators yet' : state.outreachFilter === 'archived' ? 'No archived creators' : 'None in this stage'}</h3>
          <p>${state.outreachFilter === 'all' ? 'Upload a CSV to start your first batch' : 'Try a different filter'}</p>
          ${state.outreachFilter === 'all' ? '<button class="btn btn-primary" onclick="openNewBatch()">+ New Batch</button>' : ''}
        </div>
      ` : `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px;padding-right:0">
                <input type="checkbox" class="row-checkbox" id="select-all-cb"
                  ${filtered.every(r => state.selectedIds.has(r.id)) && filtered.length > 0 ? 'checked' : ''}
                  onchange="toggleSelectAll(this.checked)">
              </th>
              ${sortTh('name', 'Creator')}
              ${sortTh('followers', 'Followers')}
              ${sortTh('rates', '$/vid')}
              <th>Grade</th>
              ${sortTh('status', 'Status')}
              <th class="fu-col-header">Follow-up 1</th>
              <th class="fu-col-header">Follow-up 2</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(r => `
              <tr class="clickable-row ${state.selectedOutreachId === r.id ? 'row-active' : ''} ${state.selectedIds.has(r.id) ? 'row-selected' : ''}"
                  onclick="openDetailPanel('${r.id}')">
                <td style="padding-right:0" onclick="event.stopPropagation()">
                  <input type="checkbox" class="row-checkbox"
                    data-id="${r.id}"
                    ${state.selectedIds.has(r.id) ? 'checked' : ''}
                    onchange="toggleRowSelect('${r.id}', this.checked)">
                </td>
                <td>
                  <div class="creator-cell">
                    <div class="creator-name">${esc(r.name || r.handle)}</div>
                    <div class="creator-handle-small">@${esc(r.handle)}</div>
                  </div>
                </td>
                <td>${fmtNum(r.follower_count)}</td>
                <td class="rate-cell">${(() => {
                  const hasReq = ['replied','counter_review','counter_approved','counter_offered','signed'].includes(r.status);
                  const hasCtr = ['counter_review','counter_approved','counter_offered','signed'].includes(r.status);
                  const req = avgRatePerVid(r);
                  if (!hasReq || req === null) return '—';
                  if (!hasCtr) return `<span class="rate-req">${fmt$(req)}</span>`;
                  const ctr = r.counter_offer_amount;
                  return `<div class="rate-stack"><span class="rate-req">Req: ${fmt$(req)}</span><span class="rate-ctr">Ctr: ${ctr ? fmt$(ctr) : '—'}</span></div>`;
                })()}</td>
                <td>${gradeBadge(r.tier)}</td>
                <td onclick="event.stopPropagation()">
                  <select class="inline-status-select status-key-${r.status}"
                          onchange="updateStatusInline('${r.id}', this.value, this)">
                    ${STATUSES.filter(s => s.key !== 'archived').map(s =>
                      `<option value="${s.key}"${r.status === s.key ? ' selected' : ''}>${s.label}</option>`
                    ).join('')}
                  </select>
                </td>
                ${renderFUCell(r, 1)}
                ${renderFUCell(r, 2)}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>`;
}

function setOutreachFilter(f) {
  state.outreachFilter = f;
  renderPipelineView();
}

function setOutreachSort(col) {
  if (state.outreachSort.col === col) {
    state.outreachSort.dir = state.outreachSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    state.outreachSort = { col, dir: 'desc' };
  }
  renderPipelineView();
}

function sortTh(col, label) {
  const active = state.outreachSort.col === col;
  const arrow = active ? `<span class="sort-arrow">${state.outreachSort.dir === 'asc' ? '↑' : '↓'}</span>` : '';
  return `<th class="sortable-th${active ? ' sort-active' : ''}" onclick="setOutreachSort('${col}')">${label}${arrow}</th>`;
}

async function updateStatusInline(id, newStatus, selectEl) {
  selectEl.className = `inline-status-select status-key-${newStatus}`;
  try {
    const payload = { status: newStatus };
    // Reset follow-up window when counter is sent
    if (newStatus === 'counter_offered') Object.assign(payload, counterFollowupPayload());
    const rec = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = rec;
    if (newStatus === 'signed') showToast('🎉 Signed! Fill in the deal details, then click Finalize & Onboard →');
    if (newStatus === 'counter_rejected') { updateReviewBadge(); showToast('Moved to For Review — counter rejected', 'error'); }
    renderPipelineView();
    updateRepliedBadge();
    if (state.selectedOutreachId === id) renderDetailPanel();
  } catch (err) {
    showToast(err.message, 'error');
    renderPipelineView();
  }
}

async function bulkChangeStatus() {
  const sel = document.getElementById('bulk-status-select');
  const newStatus = sel ? sel.value : '';
  if (!newStatus) { showToast('Pick a status first', 'error'); return; }
  const ids = [...state.selectedIds];
  if (ids.length === 0) return;
  try {
    await Promise.all(ids.map(id =>
      fetchAPI(`${API.outreach}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      }).then(rec => {
        const i = state.outreach.findIndex(x => x.id === id);
        if (i !== -1) state.outreach[i] = rec;
      })
    ));
    state.selectedIds.clear();
    const label = STATUSES.find(s => s.key === newStatus)?.label || newStatus;
    showToast(`${ids.length} creator${ids.length !== 1 ? 's' : ''} → ${label}`);
    renderPipelineView();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// OUTREACH — DETAIL PANEL
// ============================================================

function openDetailPanel(id) {
  state.selectedOutreachId = id;
  const panel = document.getElementById('detail-panel');
  panel.style.display = 'flex';
  renderDetailPanel();
  // highlight row
  document.querySelectorAll('.clickable-row').forEach(row => {
    row.classList.toggle('row-active', row.onclick?.toString().includes(`'${id}'`));
  });
}

function toggleAccordion(key) {
  state.dpAccordion[key] = !state.dpAccordion[key];
  const body   = document.getElementById(`dp-acc-${key}`);
  const header = body?.previousElementSibling;
  if (!body) return;
  body.classList.toggle('dp-acc-collapsed', !state.dpAccordion[key]);
  if (header) {
    header.classList.toggle('open', state.dpAccordion[key]);
    const arrow = header.querySelector('.dp-acc-arrow');
    if (arrow) arrow.textContent = state.dpAccordion[key] ? '▾' : '▸';
  }
}

function closeDetailPanel() {
  stopDictation();
  state.selectedOutreachId = null;
  state.activeRosterId     = null;
  document.getElementById('detail-panel').style.display = 'none';
  document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('row-active'));
}

function renderDetailPanel() {
  const r = state.outreach.find(x => x.id === state.selectedOutreachId);
  if (!r) { closeDetailPanel(); return; }

  document.getElementById('detail-drawer-title').textContent = 'Creator Detail';

  const hasReplied = ['replied', 'counter_review', 'counter_approved'].includes(r.status);
  const evalScore  = calcEvalScore(r);
  const allEvalDone = EVAL_QUESTIONS.every(q => r[q.key]);
  const autoTier   = allEvalDone ? autoTierFromScore(evalScore) : null;
  const founderEvalScore   = calcFounderEvalScore(r);
  const allFounderEvalDone = EVAL_QUESTIONS.every(q => r[`founder_${q.key}`]);
  const founderAutoTier    = allFounderEvalDone ? autoTierFromScore(founderEvalScore) : null;

  document.getElementById('detail-drawer-body').innerHTML = `

    <!-- Creator header + inline status -->
    <div class="dp-creator-header">
      <div class="dp-header-top">
        <div class="dp-name">${esc(r.name || r.handle)}</div>
        <select class="inline-status-select status-key-${r.status} dp-status-inline"
          onchange="updateOutreachField('${r.id}', 'status', this.value); this.className='inline-status-select status-key-'+this.value+' dp-status-inline'">
          ${STATUSES.map(s => `<option value="${s.key}" ${r.status === s.key ? 'selected':''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="dp-handle-row">
        ${r.profile_url
          ? `<a class="dp-profile-link" href="${esc(r.profile_url)}" target="_blank">@${esc(r.handle)} ↗</a>`
          : `<span class="dp-handle-plain">@${esc(r.handle)}</span>`
        }
      </div>
      <div class="dp-chips">
        ${r.follower_count ? `<span class="dp-chip">${fmtNum(r.follower_count)} followers</span>` : ''}
        ${r.last_30d_gmv   ? `<span class="dp-chip">${fmtGMV(r.last_30d_gmv)} GMV</span>` : ''}
        ${r.email ? `<span class="dp-chip dp-chip-email">${esc(r.email)}</span>` : ''}
      </div>
      ${r.product_category ? `<div class="dp-category">${esc(r.product_category)}</div>` : ''}
    </div>

    <!-- Follow-up Tracker (only shown while creator is still in Sent status) -->
    ${r.status === 'sent' ? `
    <div class="dp-section">
      <div class="dp-section-label">Follow-up Tracker</div>
      <div class="fu-timeline">

        <!-- First outreach -->
        <div class="fu-row">
          <div class="fu-step-dot fu-dot-sent"></div>
          <div class="fu-step-body">
            <div class="fu-step-label">First outreach</div>
            ${r.sent_date
              ? `<div class="fu-step-date">${fmtDate(r.sent_date)}</div>`
              : `<input type="date" class="dp-input fu-date-input" placeholder="Set send date"
                   onclick="try{this.showPicker()}catch(e){}"
                   onchange="updateOutreachField('${r.id}', 'sent_date', this.value)">`
            }
          </div>
          <div class="fu-step-status fu-status-sent">✓ Sent</div>
        </div>

        <div class="fu-connector"></div>

        <!-- Follow-up 1 -->
        <div class="fu-row ${r.followup1_date ? fuDateClass(r.followup1_date) : ''}">
          <div class="fu-step-dot ${r.followup1_sent ? 'fu-dot-sent' : 'fu-dot-pending'}"></div>
          <div class="fu-step-body">
            <div class="fu-step-label">Follow-up 1</div>
            <input type="date" class="dp-input fu-date-input fu-date-editable"
              value="${r.followup1_date || ''}"
              onclick="try{this.showPicker()}catch(e){}"
              onchange="updateOutreachField('${r.id}', 'followup1_date', this.value)">
          </div>
          <div class="fu-step-action">
            ${r.followup1_sent
              ? `<span class="fu-status-sent">✓ Sent ${r.followup1_sent_date ? fmtDateShort(r.followup1_sent_date) : ''}</span>`
              : r.sent_date
                ? `<button class="fu-mark-btn" onclick="markFollowupSent('${r.id}', 1)">Mark Sent</button>`
                : `<span class="fu-locked-hint">Set send date first</span>`
            }
          </div>
        </div>

        <div class="fu-connector"></div>

        <!-- Follow-up 2 -->
        <div class="fu-row ${r.followup2_date && r.followup1_sent ? fuDateClass(r.followup2_date) : 'fu-locked'}">
          <div class="fu-step-dot ${r.followup2_sent ? 'fu-dot-sent' : r.followup1_sent ? 'fu-dot-pending' : 'fu-dot-locked'}"></div>
          <div class="fu-step-body">
            <div class="fu-step-label">Follow-up 2</div>
            <input type="date" class="dp-input fu-date-input fu-date-editable"
              value="${r.followup2_date || ''}"
              onclick="try{this.showPicker()}catch(e){}"
              onchange="updateOutreachField('${r.id}', 'followup2_date', this.value)">
          </div>
          <div class="fu-step-action">
            ${r.followup2_sent
              ? `<span class="fu-status-sent">✓ Sent ${r.followup2_sent_date ? fmtDateShort(r.followup2_sent_date) : ''}</span>`
              : r.followup1_sent
                ? `<button class="fu-mark-btn" onclick="markFollowupSent('${r.id}', 2)">Mark Sent</button>`
                : `<span class="fu-locked-hint">After FU1</span>`
            }
          </div>
        </div>

      </div>
    </div>

    <!-- Follow-up Messages (copy-paste templates) -->
    <div class="dp-section">
      <div class="dp-section-label">Follow-up Messages</div>
      ${[1, 2].map(num => {
        const isSent   = num === 1 ? r.followup1_sent : r.followup2_sent;
        const dateStr  = num === 1 ? r.followup1_date : r.followup2_date;
        const msgText  = fuMessageText(r, num);
        const msgLines = msgText.split('\n').map(l => esc(l)).join('<br>');
        return `
        <div class="fu-msg-card${isSent ? ' fu-msg-sent' : ''}">
          <div class="fu-msg-header">
            <span class="fu-msg-num">Follow-up ${num}</span>
            ${dateStr ? `<span class="fu-msg-date">${fmtDateShort(dateStr)}</span>` : ''}
            ${isSent ? `<span class="fu-msg-badge-sent">✓ Sent</span>` : ''}
          </div>
          <div class="fu-msg-body">${msgLines}</div>
          <div class="fu-msg-actions">
            <button class="btn btn-secondary btn-sm" onclick="copyFollowupMessage('${r.id}', ${num})">
              Copy message
            </button>
            ${!isSent ? `<button class="fu-mark-btn" onclick="markFollowupSent('${r.id}', ${num})">Mark Sent</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    <!-- Counter Follow-up Tracker (shown when status is counter_offered) -->
    ${r.status === 'counter_offered' ? `
    <div class="dp-section">
      <div class="dp-section-label">Counter Follow-ups</div>
      <div class="fu-timeline">

        <!-- Counter sent (reference point) -->
        <div class="fu-row">
          <div class="fu-step-dot fu-dot-sent"></div>
          <div class="fu-step-body">
            <div class="fu-step-label">Counter sent</div>
          </div>
          <div class="fu-step-status fu-status-sent">✓ Sent</div>
        </div>

        <div class="fu-connector"></div>

        <!-- Counter Follow-up 1 -->
        <div class="fu-row ${r.followup1_date ? fuDateClass(r.followup1_date) : ''}">
          <div class="fu-step-dot ${r.followup1_sent ? 'fu-dot-sent' : 'fu-dot-pending'}"></div>
          <div class="fu-step-body">
            <div class="fu-step-label">Follow-up 1</div>
            <input type="date" class="dp-input fu-date-input fu-date-editable"
              value="${r.followup1_date || ''}"
              onclick="try{this.showPicker()}catch(e){}"
              onchange="updateOutreachField('${r.id}', 'followup1_date', this.value)">
          </div>
          <div class="fu-step-action">
            ${r.followup1_sent
              ? `<span class="fu-status-sent">✓ Sent ${r.followup1_sent_date ? fmtDateShort(r.followup1_sent_date) : ''}</span>`
              : `<button class="fu-mark-btn" onclick="markFollowupSent('${r.id}', 1)">Mark Sent</button>`
            }
          </div>
        </div>

        <div class="fu-connector"></div>

        <!-- Counter Follow-up 2 -->
        <div class="fu-row ${r.followup2_date && r.followup1_sent ? fuDateClass(r.followup2_date) : 'fu-locked'}">
          <div class="fu-step-dot ${r.followup2_sent ? 'fu-dot-sent' : r.followup1_sent ? 'fu-dot-pending' : 'fu-dot-locked'}"></div>
          <div class="fu-step-body">
            <div class="fu-step-label">Follow-up 2</div>
            <input type="date" class="dp-input fu-date-input fu-date-editable"
              value="${r.followup2_date || ''}"
              onclick="try{this.showPicker()}catch(e){}"
              onchange="updateOutreachField('${r.id}', 'followup2_date', this.value)">
          </div>
          <div class="fu-step-action">
            ${r.followup2_sent
              ? `<span class="fu-status-sent">✓ Sent ${r.followup2_sent_date ? fmtDateShort(r.followup2_sent_date) : ''}</span>`
              : r.followup1_sent
                ? `<button class="fu-mark-btn" onclick="markFollowupSent('${r.id}', 2)">Mark Sent</button>`
                : `<span class="fu-locked-hint">After FU1</span>`
            }
          </div>
        </div>

      </div>
    </div>

    <!-- Counter Follow-up Messages (copy-paste templates) -->
    <div class="dp-section">
      <div class="dp-section-label">Counter Follow-up Messages</div>
      ${[1, 2].map(num => {
        const isSent   = num === 1 ? r.followup1_sent : r.followup2_sent;
        const dateStr  = num === 1 ? r.followup1_date : r.followup2_date;
        const msgText  = fuMessageText(r, num);
        const msgLines = msgText.split('\n').map(l => esc(l)).join('<br>');
        return `
        <div class="fu-msg-card${isSent ? ' fu-msg-sent' : ''}">
          <div class="fu-msg-header">
            <span class="fu-msg-num">Follow-up ${num}</span>
            ${dateStr ? `<span class="fu-msg-date">${fmtDateShort(dateStr)}</span>` : ''}
            ${isSent ? `<span class="fu-msg-badge-sent">✓ Sent</span>` : ''}
          </div>
          <div class="fu-msg-body">${msgLines}</div>
          <div class="fu-msg-actions">
            <button class="btn btn-secondary btn-sm" onclick="copyFollowupMessage('${r.id}', ${num})">
              Copy message
            </button>
            ${!isSent ? `<button class="fu-mark-btn" onclick="markFollowupSent('${r.id}', ${num})">Mark Sent</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    <!-- Evaluation (shown from "replied" onward) -->
    ${hasReplied ? `
    <div class="dp-accordion">
      <button class="dp-acc-header ${state.dpAccordion.rates ? 'open' : ''}" onclick="toggleAccordion('rates')">
        <span>Their Asked Rates</span>
        <span class="dp-acc-arrow">${state.dpAccordion.rates ? '▾' : '▸'}</span>
      </button>
      <div class="dp-acc-body${state.dpAccordion.rates ? '' : ' dp-acc-collapsed'}" id="dp-acc-rates">
      <div class="dp-section" style="border:none;padding-top:0">
      <div class="dp-rates-grid">
        <div class="dp-form-group">
          <label>3-video bundle</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" placeholder="e.g. 1200"
              value="${r.asked_rate_3 || ''}"
              onblur="updateOutreachField('${r.id}', 'asked_rate_3', this.value)">
          </div>
          ${r.asked_rate_3 ? `<div class="dp-rate-per-vid">${fmt$(r.asked_rate_3/3)}/vid avg</div>` : ''}
        </div>
        <div class="dp-form-group">
          <label>5-video bundle</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" placeholder="e.g. 1750"
              value="${r.asked_rate_5 || ''}"
              onblur="updateOutreachField('${r.id}', 'asked_rate_5', this.value)">
          </div>
          ${r.asked_rate_5 ? `<div class="dp-rate-per-vid">${fmt$(r.asked_rate_5/5)}/vid avg</div>` : ''}
        </div>
        <div class="dp-form-group">
          <label>10-video bundle</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" placeholder="e.g. 2500"
              value="${r.asked_rate_10 || ''}"
              onblur="updateOutreachField('${r.id}', 'asked_rate_10', this.value)">
          </div>
          ${r.asked_rate_10 ? `<div class="dp-rate-per-vid">${fmt$(r.asked_rate_10/10)}/vid avg</div>` : ''}
        </div>
      </div>
      <div class="dp-rates-custom">
        <div class="dp-form-group" style="flex:0 0 90px">
          <label># videos</label>
          <input type="number" class="dp-input" placeholder="e.g. 6"
            value="${r.asked_rate_custom_count || ''}"
            onblur="updateOutreachField('${r.id}', 'asked_rate_custom_count', this.value)">
        </div>
        <div class="dp-form-group" style="flex:1">
          <label>Custom bundle <span class="dp-label-hint">optional</span></label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" placeholder="e.g. 2100"
              value="${r.asked_rate_custom || ''}"
              onblur="updateOutreachField('${r.id}', 'asked_rate_custom', this.value)">
          </div>
          ${r.asked_rate_custom && r.asked_rate_custom_count ? `<div class="dp-rate-per-vid">${fmt$(r.asked_rate_custom/r.asked_rate_custom_count)}/vid avg</div>` : ''}
        </div>
      </div>
    </div>

      </div></div></div>

    <div class="dp-accordion">
      <button class="dp-acc-header ${state.dpAccordion.eval ? 'open' : ''}" onclick="toggleAccordion('eval')">
        <span>Lu's Evaluation</span>
        <span class="dp-acc-arrow">${state.dpAccordion.eval ? '▾' : '▸'}</span>
      </button>
      <div class="dp-acc-body${state.dpAccordion.eval ? '' : ' dp-acc-collapsed'}" id="dp-acc-eval">
      <div class="dp-section" style="border:none;padding-top:0">
      <div class="dp-section-label-row">
        <div class="dp-section-label">Lu's Evaluation</div>
        ${(EVAL_QUESTIONS.some(q => r[q.key])) ? `
          <button class="btn-reset-eval" onclick="resetEvaluation('${r.id}')">Reset</button>
        ` : ''}
      </div>

      <div class="dp-eval-score-bar">
        <span class="dp-eval-score-num">${evalScore}<span class="dp-eval-score-denom">/12</span></span>
        ${allEvalDone ? (() => {
          const g = gradeInfo(autoTier);
          return `<span class="dp-eval-auto-tier">${gradeBadge(autoTier)}<span class="dp-eval-grade-desc">${g ? g.desc : ''}</span></span>`;
        })() : `<span class="dp-eval-pending">Answer all 6 to auto-assign grade</span>`}
      </div>

      <div class="dp-rubric">
        ${EVAL_QUESTIONS.map(q => {
          const opts  = q.opts      || ['yes','maybe','no'];
          const lbls  = q.optLabels || ['Yes','Maybe','No'];
          const cur   = r[q.key] || '';
          return `
          <div class="dp-rubric-step">
            <div class="dp-rubric-label">${q.label}</div>
            <div class="dp-rubric-question">${q.q}</div>
            <div class="dp-rubric-options">
              ${opts.map((o, i) => `
                <button class="dp-opt-btn ${cur === o ? 'active' : ''}"
                  onclick="setEvalField('${r.id}', '${q.key}', '${o}')">
                  ${lbls[i]}${cur === o ? ` <span class="dp-opt-pts">(${evalFieldScore(q.key, o)}pt)</span>` : ''}
                </button>
              `).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>

    </div>

      </div></div>

    <!-- Evaluation comparison card (shown when both are complete) -->
    ${allEvalDone && allFounderEvalDone ? `
    <div class="dp-eval-comparison">
      <div class="dp-eval-comp-row">
        <div class="dp-eval-comp-item">
          <div class="dp-eval-comp-who">Lu</div>
          <div class="dp-eval-comp-score">${evalScore}/12 &nbsp;${gradeBadge(autoTier)}</div>
        </div>
        <div class="dp-eval-comp-vs">vs</div>
        <div class="dp-eval-comp-item">
          <div class="dp-eval-comp-who">Founder</div>
          <div class="dp-eval-comp-score">${founderEvalScore}/12 &nbsp;${gradeBadge(founderAutoTier)}</div>
        </div>
      </div>
      <div class="dp-eval-comp-diff ${founderEvalScore === evalScore ? '' : founderEvalScore > evalScore ? 'dp-eval-comp-up' : 'dp-eval-comp-down'}">
        ${founderEvalScore === evalScore
          ? '✓ Both evaluations agree on the grade'
          : `${founderEvalScore > evalScore ? '↑' : '↓'} ${Math.abs(founderEvalScore - evalScore)}pt gap — Founder rates ${founderEvalScore > evalScore ? 'higher' : 'lower'} than Lu`}
      </div>
    </div>
    ` : ''}

    <div class="dp-accordion">
      <button class="dp-acc-header ${state.dpAccordion.founderEval ? 'open' : ''}" onclick="toggleAccordion('founderEval')">
        <span>Founder Evaluation <span class="dp-acc-optional">optional</span></span>
        <span class="dp-acc-arrow">${state.dpAccordion.founderEval ? '▾' : '▸'}</span>
      </button>
      <div class="dp-acc-body${state.dpAccordion.founderEval ? '' : ' dp-acc-collapsed'}" id="dp-acc-founderEval">
      <div class="dp-section" style="border:none;padding-top:0">
      <div class="dp-section-label-row">
        <div class="dp-section-label">Founder Evaluation</div>
        ${EVAL_QUESTIONS.some(q => r[`founder_${q.key}`]) ? `
          <button class="btn-reset-eval" onclick="resetFounderEvaluation('${r.id}')">Reset</button>
        ` : ''}
      </div>
      <div class="dp-eval-hint">Grade independently — compare side by side with the affiliate manager's take.</div>

      <div class="dp-eval-score-bar">
        <span class="dp-eval-score-num">${founderEvalScore}<span class="dp-eval-score-denom">/12</span></span>
        ${allFounderEvalDone ? (() => {
          const g = gradeInfo(founderAutoTier);
          return `<span class="dp-eval-auto-tier">${gradeBadge(founderAutoTier)}<span class="dp-eval-grade-desc">${g ? g.desc : ''}</span></span>`;
        })() : `<span class="dp-eval-pending">Answer all 6 to auto-assign grade</span>`}
      </div>

      <div class="dp-rubric">
        ${EVAL_QUESTIONS.map(q => {
          const opts = q.opts      || ['yes','maybe','no'];
          const lbls = q.optLabels || ['Yes','Maybe','No'];
          const cur  = r[`founder_${q.key}`] || '';
          const amVal = r[q.key] || '';
          const differs = cur && amVal && cur !== amVal;
          return `
          <div class="dp-rubric-step${differs ? ' dp-rubric-step-differs' : ''}">
            <div class="dp-rubric-label">${q.label}${differs ? ' <span class="dp-rubric-differs-dot" title="Differs from Lu">●</span>' : ''}</div>
            <div class="dp-rubric-question">${q.q}</div>
            <div class="dp-rubric-options">
              ${opts.map((o, i) => `
                <button class="dp-opt-btn ${cur === o ? 'active' : ''}"
                  onclick="setFounderEvalField('${r.id}', '${q.key}', '${o}')">
                  ${lbls[i]}${cur === o ? ` <span class="dp-opt-pts">(${evalFieldScore(q.key, o)}pt)</span>` : ''}
                </button>
              `).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>

    </div>
      </div></div>

    <!-- Counter offer -->
    ${(r.tier || autoTier) ? `
    <div class="dp-accordion">
      <button class="dp-acc-header ${state.dpAccordion.counter ? 'open' : ''}" onclick="toggleAccordion('counter')">
        <span>Counter Offer</span>
        <span class="dp-acc-arrow">${state.dpAccordion.counter ? '▾' : '▸'}</span>
      </button>
      <div class="dp-acc-body${state.dpAccordion.counter ? '' : ' dp-acc-collapsed'}" id="dp-acc-counter">
      <div class="dp-section dp-section-counter" style="border:none;padding-top:0">
      <div class="dp-section-label dp-section-label-lg" style="display:none"></div>

      ${(() => {
        const g = gradeInfo(r.tier || autoTier);
        if (!g) return '';
        return `<div class="dp-counter-tier-hint">
          ${gradeBadge(g.grade)}
          <span class="dp-counter-desc">${g.desc}</span>
          <span class="dp-counter-suggested">Counter: <strong>${fmt$(g.perVid)}/vid</strong></span>
        </div>`;
      })()}

      ${(() => {
        // Show BLC's counter rates (not creator's asked rates — those are visible above)
        const counterPerVid = r.counter_offer_amount || (gradeInfo(r.tier || autoTier) || {}).perVid;
        if (!counterPerVid) return '';
        const cpv = parseFloat(counterPerVid);
        return `
        <div class="dp-counter-rates">
          <div class="dp-counter-rates-label">Our counter at ${fmt$(cpv)}/vid</div>
          <div class="dp-form-group"><label>3-vid bundle</label><div class="dp-rate-display dp-rate-counter">${fmt$(cpv * 3)}</div><div class="dp-rate-per-vid">${fmt$(cpv)}/vid</div></div>
          <div class="dp-form-group"><label>5-vid bundle</label><div class="dp-rate-display dp-rate-counter">${fmt$(cpv * 5)}</div><div class="dp-rate-per-vid">${fmt$(cpv)}/vid</div></div>
          <div class="dp-form-group"><label>10-vid bundle</label><div class="dp-rate-display dp-rate-counter">${fmt$(cpv * 10)}</div><div class="dp-rate-per-vid">${fmt$(cpv)}/vid</div></div>
        </div>`;
      })()}

      <div class="dp-counter-offer-fields">
        <div class="dp-form-group">
          <label># Videos</label>
          <input type="number" class="dp-input" id="dp-counter-videos"
            value="${r.video_count || ''}"
            placeholder="e.g. 5"
            oninput="updateCounterCalc()">
        </div>
        <div class="dp-form-group">
          <label>Total Offer</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" id="dp-counter-total"
              value="${r.counter_offer_amount && r.video_count ? Math.round(r.counter_offer_amount * r.video_count) : ''}"
              placeholder="${(gradeInfo(r.tier || autoTier) || {}).perVid ? (gradeInfo(r.tier || autoTier).perVid * 5) : 'e.g. 1500'}"
              oninput="updateCounterCalc()">
          </div>
        </div>
      </div>
      <div class="dp-counter-per-vid" id="dp-counter-per-vid">${
        r.counter_offer_amount && r.video_count
          ? `<span class="dp-per-vid-calc">${fmt$(r.counter_offer_amount)}/vid avg</span>`
          : (gradeInfo(r.tier || autoTier) ? `Suggested: ${fmt$((gradeInfo(r.tier || autoTier) || {}).perVid)}/vid` : '')
      }</div>

      <div class="dp-counter-btn-row">
        <button class="btn dp-counter-btn-generate" id="dp-gen-counter-btn"
          onclick="generateCounterOffer('${r.id}')">
          Generate Counter Message
        </button>
        ${r.status === 'counter_review' ? `
        <button class="btn dp-counter-btn-approve" id="dp-approve-counter-btn"
          onclick="approveCounter('${r.id}')">
          Approve ✓
        </button>
        <button class="btn dp-counter-btn-reject" id="dp-reject-counter-btn"
          onclick="toggleRejectPanel()">
          Reject
        </button>
        ` : `
        <button class="btn dp-counter-btn-draft" id="dp-send-counter-btn"
          onclick="sendCounterForReview('${r.id}')">
          Send Counter for Review
        </button>
        `}
      </div>

      ${r.status === 'counter_review' ? `
      <div class="dp-reject-panel${r.counter_feedback ? ' dp-reject-panel-visible' : ''}" id="dp-reject-panel">
        <div class="dp-reject-label">Rejection reason / preferred rate:</div>
        <textarea class="dp-input dp-textarea" id="dp-reject-feedback"
          placeholder="e.g. Rate too high — counter at $150/vid...">${esc(r.counter_feedback || '')}</textarea>
        <button class="btn dp-counter-btn-reject-submit"
          onclick="rejectCounter('${r.id}')">
          Submit Rejection
        </button>
      </div>
      ${r.counter_feedback ? `
      <div class="dp-rejection-note">
        <span class="dp-rejection-icon">⚑</span>
        <div>
          <div class="dp-rejection-title">Flagged — Pending Revision</div>
          <div class="dp-rejection-text">${esc(r.counter_feedback)}</div>
        </div>
      </div>` : ''}
      ` : ''}

      ${r.counter_offer_email ? `
      <div class="dp-counter-preview">
        <div class="dp-counter-preview-header">
          <div class="dp-section-label" style="margin-bottom:0">Counter Message</div>
          <button class="btn-clear-message" onclick="clearCounterMessage('${r.id}')">Clear</button>
        </div>
        <textarea class="dp-input dp-textarea dp-counter-ta" id="dp-counter-email-ta"
          onblur="updateOutreachField('${r.id}', 'counter_offer_email', this.value)">${esc(r.counter_offer_email)}</textarea>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px"
          onclick="copyText(document.getElementById('dp-counter-email-ta').value)">Copy</button>
      </div>
      ` : ''}
    </div>
    </div></div>
    ` : ''}
    ` : ''}

    <!-- Signed: deal details & contract -->
    ${r.status === 'signed' ? `
    <div class="dp-section dp-signed-section">
      <div class="dp-section-label">Deal Details</div>
      <div class="dp-signed-grid">
        <div class="dp-form-group">
          <label># Videos</label>
          <input type="number" class="dp-input" id="dp-video-count"
            value="${r.video_count || ''}"
            placeholder="e.g. 5"
            onblur="updateOutreachField('${r.id}', 'video_count', this.value)">
        </div>
        <div class="dp-form-group">
          <label>Total Deal</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" id="dp-deal-total"
              value="${r.counter_offer_amount && r.video_count ? Math.round(parseFloat(r.counter_offer_amount) * parseInt(r.video_count)) : ''}"
              placeholder="e.g. 700"
              onblur="saveOutreachDealTotal('${r.id}', this.value)">
          </div>
          ${r.counter_offer_amount && r.video_count ? `<div class="dp-rate-per-vid">${fmt$(r.counter_offer_amount)}/vid</div>` : ''}
        </div>
      </div>
      <div class="dp-form-group">
        <label>Start date</label>
        <input type="date" class="dp-input" id="dp-start-date"
          value="${r.start_date ? r.start_date.split('T')[0] : ''}"
          onclick="try{this.showPicker()}catch(e){}"
          onblur="updateOutreachField('${r.id}', 'start_date', this.value)">
      </div>
      ${r.counter_offer_amount && r.video_count ? `
        <div class="dp-deal-summary">
          <b>${r.video_count} videos</b> for <b>${fmt$(parseFloat(r.counter_offer_amount) * parseInt(r.video_count))}</b>
          <span style="color:var(--text-muted);font-weight:400">&nbsp;·&nbsp; ${fmt$(r.counter_offer_amount)}/vid</span>
        </div>` : ''}

      ${(() => {
        const rosterEntry = state.roster.find(x =>
          x.handle.toLowerCase() === r.handle.toLowerCase() && x.affiliate_type === 'paid'
        );
        if (rosterEntry) {
          const deposit = r.counter_offer_amount && r.video_count
            ? parseFloat(r.counter_offer_amount) * parseInt(r.video_count) / 2 : null;
          const statusLabel = rosterEntry.status === 'onboarding' ? 'Onboarding in progress' : 'Onboarded — active';
          return `
          <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding:12px 14px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.2);border-radius:var(--radius-sm);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style="font-size:13px;font-weight:600;color:var(--green);">${statusLabel} — contract sent</span>
          </div>
          ${deposit && !rosterEntry.payment_sent ? `
          <div class="payment-block payment-block-pending" style="margin-top:10px;">
            <div class="payment-block-top">
              <div>
                <div class="payment-block-label">50% deposit due after invoice</div>
                <div class="payment-block-amount">${fmt$(deposit)}</div>
              </div>
              <button class="payment-mark-btn" onclick="markRosterField('${rosterEntry.id}', 'payment_sent', true)">Mark Paid</button>
            </div>
            <div class="payment-block-hint">Also tracked in <strong>For Review</strong></div>
          </div>` : ''}
          ${rosterEntry.payment_sent ? `
          <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding:10px 14px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.2);border-radius:var(--radius-sm);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style="font-size:13px;font-weight:600;color:var(--green);">Deposit paid ${rosterEntry.payment_sent_date ? fmtDateShort(rosterEntry.payment_sent_date) : ''}</span>
          </div>` : ''}`;
        }
        return `
        <button class="btn btn-primary" style="margin-top:14px;width:100%;justify-content:center"
          id="dp-contract-btn"
          onclick="generateContractAndMoveToRoster('${r.id}')">
          Finalize &amp; Onboard →
        </button>
        <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px;">
          Generates contract PDF · saves Gmail draft · moves to roster
        </div>`;
      })()}
    </div>
    ` : ''}

    <!-- Counter summary (read-only — counter_offered, counter_approved, or counter_review) -->
    ${['counter_offered','counter_approved','counter_review'].includes(r.status) ? `
    <div class="dp-section">
      <div class="dp-section-label${r.status === 'counter_review' && r.counter_feedback ? ' dp-section-label-rejected' : ''}">${r.status === 'counter_review' ? (r.counter_feedback ? '⚑ Counter Flagged — Pending Revision' : 'Counter Pending Review') : r.status === 'counter_approved' ? 'Counter Approved — Ready to Send' : 'Counter Sent'}</div>
      ${r.counter_offer_amount && r.video_count ? `
        <div class="dp-deal-summary">
          <span>${fmt$(r.counter_offer_amount)}/vid &middot; ${r.video_count} videos &middot; Total: <strong>${fmt$(parseFloat(r.counter_offer_amount) * parseInt(r.video_count))}</strong></span>
        </div>` : ''}
      ${r.counter_offer_email ? `
        <textarea class="dp-input dp-textarea dp-counter-ta" readonly style="margin-top:10px;color:var(--text-muted)"
          id="dp-counter-preview-ro">${esc(r.counter_offer_email)}</textarea>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px"
          onclick="copyText(document.getElementById('dp-counter-preview-ro').value)">Copy message</button>
      ` : `<div style="color:var(--text-muted);font-size:13px;margin-top:8px;">No counter message saved.</div>`}
    </div>
    ` : ''}

    <!-- Notes (always visible at every stage) -->
    <div class="dp-section">
      <div class="dp-section-label">Notes</div>
      <textarea class="dp-input dp-textarea"
        placeholder="Anything worth noting..."
        onblur="updateOutreachField('${r.id}', 'evaluation_notes', this.value)">${esc(r.evaluation_notes || '')}</textarea>
    </div>

    <!-- Clear Form -->
    <div class="dp-clear-zone">
      <button class="btn-clear-form" onclick="clearCreatorForm('${r.id}')">
        Clear Form
      </button>
      <span class="dp-clear-hint">Resets rates, counter message, and evaluation so you can start over</span>
    </div>
  `;
}

async function updateOutreachField(id, field, value) {
  try {
    const rec = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ [field]: value })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = rec;
    renderDetailPanel();
    if (field === 'status') { renderOutreachPage(); updateRepliedBadge(); updateReviewBadge(); }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markPaymentSent(id) {
  try {
    const rec = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ payment_sent: true })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = rec;
    updateReviewBadge();
    renderDetailPanel();
    if (state.outreachView === 'pipeline') renderPipelineView();
    showToast('50% deposit marked as paid ✓');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function copyFollowupMessage(id, num) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  navigator.clipboard.writeText(fuMessageText(r, num))
    .then(() => showToast(`Follow-up ${num} message copied!`))
    .catch(() => showToast('Copy failed — select and copy manually', 'error'));
}

async function markFollowupSent(id, num) {
  await toggleFollowupSent(id, num, true);
}

async function toggleFollowupSent(id, num, forceTrue = false) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  const isSent = num === 1 ? r.followup1_sent : r.followup2_sent;
  const nowSent = forceTrue ? true : !isSent;
  const payload = num === 1
    ? { followup1_sent: nowSent, ...(nowSent ? {} : { followup1_sent_date: null }) }
    : { followup2_sent: nowSent, ...(nowSent ? {} : { followup2_sent_date: null }) };
  try {
    const rec = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = rec;
    renderDetailPanel();
    if (state.outreachView === 'pipeline') renderPipelineView();
    showToast(nowSent ? `Follow-up ${num} marked as sent` : `Follow-up ${num} unmarked`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function clearCounterMessage(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  r.counter_offer_email = null;
  await fetchAPI(`${API.outreach}/${id}`, { method: 'PUT', body: JSON.stringify({ counter_offer_email: null }) });
  renderDetailPanel();
}

async function clearCreatorForm(id) {
  if (!confirm('Clear all rates, counter message, and evaluation for this creator? This cannot be undone.')) return;
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  const fields = [
    'asked_rate_3','asked_rate_5','asked_rate_10','asked_rate_custom','asked_rate_custom_count',
    'counter_offer_amount','counter_offer_email',
    ...EVAL_QUESTIONS.map(q => q.key), 'tier'
  ];
  fields.forEach(f => { r[f] = null; });
  const updates = {};
  fields.forEach(f => { updates[f] = null; });
  await fetchAPI(`${API.outreach}/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  showToast('Form cleared');
  renderDetailPanel();
}

async function resetEvaluation(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  const fields = [...EVAL_QUESTIONS.map(q => q.key), 'tier'];
  fields.forEach(f => { r[f] = null; });
  const updates = {};
  fields.forEach(f => { updates[f] = null; });
  await fetchAPI(`${API.outreach}/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  renderDetailPanel();
}

async function setEvalField(id, field, value) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  r[field] = value;
  const allDone = EVAL_QUESTIONS.every(q => r[q.key]);
  if (allDone) {
    const score = calcEvalScore(r);
    const tier  = autoTierFromScore(score);
    r.tier = tier;
    await Promise.all([
      updateOutreachField(id, field, value),
      updateOutreachField(id, 'tier', tier)
    ]);
  } else {
    await updateOutreachField(id, field, value);
  }
  renderDetailPanel();
}

async function resetFounderEvaluation(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  const fields = [...EVAL_QUESTIONS.map(q => `founder_${q.key}`), 'founder_tier'];
  fields.forEach(f => { r[f] = null; });
  const updates = {};
  fields.forEach(f => { updates[f] = null; });
  await fetchAPI(`${API.outreach}/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  renderDetailPanel();
}

async function setFounderEvalField(id, field, value) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  r[`founder_${field}`] = value;
  const allDone = EVAL_QUESTIONS.every(q => r[`founder_${q.key}`]);
  if (allDone) {
    const score = calcFounderEvalScore(r);
    const tier  = autoTierFromScore(score);
    r.founder_tier = tier;
    await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ [`founder_${field}`]: value, founder_tier: tier })
    });
  } else {
    await updateOutreachField(id, `founder_${field}`, value);
  }
  renderDetailPanel();
}

function updateCounterCalc() {
  const vids  = parseInt(document.getElementById('dp-counter-videos')?.value);
  const total = parseFloat(document.getElementById('dp-counter-total')?.value);
  const el    = document.getElementById('dp-counter-per-vid');
  if (!el) return;
  if (vids > 0 && total > 0) {
    el.innerHTML = `<span class="dp-per-vid-calc">${fmt$(total / vids)}/vid avg</span>`;
  } else {
    el.innerHTML = '';
  }
}

async function generateCounterOffer(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;

  const videos = parseInt(document.getElementById('dp-counter-videos')?.value);
  const total  = parseFloat(document.getElementById('dp-counter-total')?.value);

  if (!videos || isNaN(videos)) { showToast('Enter # of videos first', 'error'); return; }
  if (!total  || isNaN(total))  { showToast('Enter total offer amount first', 'error'); return; }

  const perVid = total / videos;

  const btn = document.getElementById('dp-gen-counter-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

  // Save deal details + move status to counter_offered + reset follow-up window
  const saved = await fetchAPI(`${API.outreach}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ counter_offer_amount: perVid, video_count: videos, status: 'counter_offered', ...counterFollowupPayload() })
  }).catch(() => null);
  if (saved) {
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;
  }
  updateRepliedBadge();

  try {
    const { email } = await fetchAPI(`${API.outreachGen}/counter-offer`, {
      method: 'POST',
      body: JSON.stringify({
        name:                 r.name,
        handle:               r.handle,
        askedRate3:           r.asked_rate_3,
        askedRate5:           r.asked_rate_5,
        askedRate10:          r.asked_rate_10,
        askedRateCustom:      r.asked_rate_custom,
        askedRateCustomCount: r.asked_rate_custom_count,
        counterVideos:        videos,
        counterTotal:         total,
        counterPerVid:        perVid,
        tier:                 r.tier,
        sender:               r.sender || 'Tamar'
      })
    });

    // Also save the generated email to DB and update local state
    await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ counter_offer_email: email })
    }).catch(() => null);

    const j = state.outreach.findIndex(x => x.id === id);
    if (j !== -1) state.outreach[j] = { ...state.outreach[j], counter_offer_email: email, status: 'counter_offered' };
    renderOutreachPage();
    renderDetailPanel();
    showToast('Counter offer generated');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Counter Message'; }
  }
}

async function sendCounterForReview(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;

  const btn = document.getElementById('dp-send-counter-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'counter_review' })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;
    renderDetailPanel();
    renderOutreachPage();
    showToast('Counter moved to "Ctr. For Review" ✓');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Send Counter for Review'; }
  }
}

function toggleRejectPanel() {
  const panel = document.getElementById('dp-reject-panel');
  if (panel) panel.classList.toggle('dp-reject-panel-visible');
}

async function approveCounter(id) {
  const btn = document.getElementById('dp-approve-counter-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Approving…'; }
  try {
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'counter_approved', counter_feedback: null })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;
    renderDetailPanel();
    renderOutreachPage();
    showToast('Counter approved ✓');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Approve ✓'; }
  }
}

async function rejectCounter(id) {
  const feedback = document.getElementById('dp-reject-feedback')?.value?.trim();
  if (!feedback) { showToast('Please enter rejection feedback first', 'error'); return; }
  const btn = document.querySelector('.dp-counter-btn-reject-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ counter_feedback: feedback })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;
    renderDetailPanel();
    renderOutreachPage();
    showToast('Counter flagged — team notified ⚑');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Rejection'; }
  }
}

async function deleteOutreach(id) {
  if (!confirm('Delete this creator record? This cannot be undone.')) return;
  try {
    await fetchAPI(`${API.outreach}/${id}`, { method: 'DELETE' });
    state.outreach = state.outreach.filter(r => r.id !== id);
    closeDetailPanel();
    renderPipelineView();
    showToast('Record deleted');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// OUTREACH — BULK SELECTION
// ============================================================

function toggleRowSelect(id, checked) {
  if (checked) state.selectedIds.add(id);
  else state.selectedIds.delete(id);
  renderPipelineView();
}

function toggleSelectAll(checked) {
  const ids = state.filteredIds || [];
  if (checked) ids.forEach(id => state.selectedIds.add(id));
  else ids.forEach(id => state.selectedIds.delete(id));
  renderPipelineView();
}

function clearSelection() {
  if (state.selectedIds.size === 0) return;
  state.selectedIds.clear();
  if (state.outreachView === 'pipeline' && state.currentPage === 'outreach') renderPipelineView();
}

async function bulkArchive() {
  const ids = [...state.selectedIds];
  if (ids.length === 0) return;
  try {
    await Promise.all(ids.map(id =>
      fetchAPI(`${API.outreach}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' })
      }).then(rec => {
        const i = state.outreach.findIndex(x => x.id === id);
        if (i !== -1) state.outreach[i] = rec;
      })
    ));
    state.selectedIds.clear();
    showToast(`${ids.length} creator${ids.length !== 1 ? 's' : ''} archived`);
    renderPipelineView();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function bulkDelete() {
  const ids = [...state.selectedIds];
  if (ids.length === 0) return;
  if (!confirm(`Delete ${ids.length} creator record${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
  try {
    await Promise.all(ids.map(id => fetchAPI(`${API.outreach}/${id}`, { method: 'DELETE' })));
    state.outreach = state.outreach.filter(r => !ids.includes(r.id));
    state.selectedIds.clear();
    showToast(`${ids.length} record${ids.length !== 1 ? 's' : ''} deleted`);
    renderPipelineView();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// OUTREACH — CONTRACT + ROSTER HANDOFF
// ============================================================

async function generateContractAndMoveToRoster(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;

  const totalEl = document.getElementById('dp-deal-total');
  const countEl = document.getElementById('dp-video-count');
  const dateEl  = document.getElementById('dp-start-date');

  const videoCount = parseInt(countEl?.value   || r.video_count);
  const dealTotal  = parseFloat(totalEl?.value || (r.counter_offer_amount && r.video_count ? parseFloat(r.counter_offer_amount) * parseInt(r.video_count) : ''));
  const startDate  = dateEl?.value             || (r.start_date ? r.start_date.split('T')[0] : '');

  if (!videoCount || isNaN(videoCount)) { showToast('Enter number of videos first', 'error'); return; }
  if (!dealTotal  || isNaN(dealTotal))  { showToast('Enter total deal amount first', 'error'); return; }
  if (!startDate)                        { showToast('Enter start date first', 'error'); return; }

  const rate = dealTotal / videoCount;

  const btn = document.getElementById('dp-contract-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Working on it…'; }

  try {
    // 1. Save deal details
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ counter_offer_amount: rate, video_count: videoCount, start_date: startDate })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;

    // 2. Run full sign flow (contract PDF → Gmail draft → roster)
    const result = await fetchAPI(`${API.outreachGen}/sign-flow`, {
      method: 'POST',
      body: JSON.stringify({ outreachId: id })
    });

    // 3. Download PDF locally
    if (result.pdfBase64) {
      const byteStr = atob(result.pdfBase64);
      const bytes   = new Uint8Array(byteStr.length);
      for (let j = 0; j < byteStr.length; j++) bytes[j] = byteStr.charCodeAt(j);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = result.pdfFilename || `${(r.name || r.handle)} - BLC Contract.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    }

    // 4. Sync roster state — always reload to guarantee fresh data
    await loadRoster();

    // 5. Show success modal + refresh badge
    updateReviewBadge();
    showSignedSuccessModal(result.creatorName || r.name || r.handle, result.halfDeposit);
    renderDetailPanel();

  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Finalize & Onboard →'; }
  }
}

function showSignedSuccessModal(creatorName, halfDeposit) {
  const existing = document.getElementById('signed-success-modal');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'signed-success-modal';
  el.className = 'draft-modal-overlay';
  el.innerHTML = `
    <div class="draft-modal">
      <button class="draft-modal-close" onclick="document.getElementById('signed-success-modal').remove()">✕</button>
      <div class="draft-modal-icon">🎉</div>
      <div class="draft-modal-title">
        <span>${esc(creatorName)}</span> is officially onboarded!
      </div>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;">
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);">
          <span style="font-size:20px;flex-shrink:0;">📄</span>
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary)">Contract PDF generated</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Downloaded locally + Gmail draft saved to <strong style="color:var(--text-secondary)">partnerships@thebikiniline.co</strong></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--yellow-dim);">
          <span style="font-size:20px;flex-shrink:0;">💰</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--yellow)">50% payment due: ${fmt$(halfDeposit)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Waiting on invoice — they'll send via PayPal or wire</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;">
          <span style="font-size:20px;flex-shrink:0;">👥</span>
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary)">Added to Paid Affiliates roster</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">All deal info pre-filled</div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px;"
        onclick="document.getElementById('signed-success-modal').remove()">
        Got it
      </button>
    </div>
  `;
  document.body.appendChild(el);
}

// ============================================================
// OUTREACH — NEW BATCH VIEW
// ============================================================

function openNewBatch() {
  state.outreachView = 'new-batch';
  nbState.emails       = [];
  nbState.selectedFile = null;
  nbState.savedCount   = 0;
  renderNewBatchView();
  checkGmailStatus();
}

function clearBatch() {
  nbState.emails       = [];
  nbState.selectedFile = null;
  nbState.savedCount   = 0;
  renderNewBatchView();
}

function renderNewBatchView() {
  const total     = nbState.emails.length;
  const generated = nbState.emails.filter(e => !e.error).length;
  const errors    = nbState.emails.filter(e => e.error).length;
  const saved     = nbState.savedCount || 0;

  document.getElementById('page-content').innerHTML = `
    <div class="page-back-row">
      <button class="back-btn" onclick="backToPipeline()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Pipeline
      </button>
      <h1 class="page-title">New Batch</h1>
    </div>

    <div class="nb-stats-bar">
      <div class="nb-stat"><span class="nb-stat-value">${total}</span><span class="nb-stat-label">Total</span></div>
      <div class="nb-stat"><span class="nb-stat-value ${generated > 0 ? 'green' : ''}">${generated}</span><span class="nb-stat-label">Generated</span></div>
      <div class="nb-stat"><span class="nb-stat-value ${saved > 0 ? 'accent' : ''}">${saved}</span><span class="nb-stat-label">Saved this run</span></div>
      <div class="nb-stat"><span class="nb-stat-value ${errors > 0 ? 'red' : ''}">${errors}</span><span class="nb-stat-label">Errors</span></div>
    </div>

    <div class="new-batch-layout">

      <!-- Left: steps -->
      <div style="position:sticky;top:24px;display:flex;flex-direction:column;gap:12px;">

        <!-- Step 1 -->
        <div class="nb-step">
          <div class="nb-step-header">
            <span class="nb-step-num">1</span>
            <span class="nb-step-title">CONTACTS CSV</span>
          </div>
          <div class="csv-columns-hint">
            Euka export auto-detected:<br>
            <code>handle</code> <code>name</code> <code>email</code>
            <code>follower_count</code> <code>last_30d_gmv</code>
            <code>product_category</code> <code>profile</code>
          </div>
          <div class="dropzone ${nbState.selectedFile ? 'file-selected' : ''}"
               id="nb-dropzone" onclick="document.getElementById('nb-file-input').click()">
            <div class="dropzone-icon">${nbState.selectedFile ? '✅' : '📂'}</div>
            <div class="dropzone-label">${nbState.selectedFile ? nbState.selectedFile.name : 'Click to upload CSV'}</div>
            <div class="dropzone-sub">${nbState.selectedFile ? (nbState.selectedFile.size / 1024).toFixed(1) + ' KB' : 'or drag and drop'}</div>
          </div>
          <input type="file" id="nb-file-input" accept=".csv" style="display:none" onchange="handleNbFileSelect(event)">
        </div>

        <!-- Step 2 -->
        <div class="nb-step">
          <div class="nb-step-header">
            <span class="nb-step-num">2</span>
            <span class="nb-step-title">RUN</span>
          </div>

          ${!nbState.gmailConnected ? `
            <div class="gmail-status disconnected" style="margin-bottom:6px">
              <div class="status-dot"></div>
              <span class="gmail-status-text">Gmail not connected</span>
            </div>
            <button class="btn btn-secondary btn-full btn-connect-gmail" onclick="connectGmail()" id="nb-connect-btn" style="margin-bottom:12px">Connect Gmail (for outreach)</button>
          ` : `
            <div class="gmail-status connected" style="margin-bottom:12px">
              <div class="status-dot"></div>
              <span class="gmail-status-text">${esc(nbState.connectedEmail || 'Gmail connected')}</span>
              <button class="btn btn-secondary btn-sm" onclick="disconnectGmail()" style="font-size:11px;padding:3px 8px;margin-left:auto">Disconnect</button>
            </div>
          `}

          ${!nbState.driveConnected ? `
            <div class="gmail-status disconnected" style="margin-bottom:6px">
              <div class="status-dot"></div>
              <span class="gmail-status-text">Drive not connected</span>
            </div>
            <button class="btn btn-secondary btn-full" onclick="connectDrive()" id="nb-drive-connect-btn" style="margin-bottom:12px">Connect Google Drive (for contracts)</button>
          ` : `
            <div class="gmail-status connected" style="margin-bottom:12px">
              <div class="status-dot"></div>
              <span class="gmail-status-text">${esc(nbState.driveEmail || 'Drive connected')}</span>
              <button class="btn btn-secondary btn-sm" onclick="disconnectDrive()" style="font-size:11px;padding:3px 8px;margin-left:auto">Disconnect</button>
            </div>
          `}

          <div class="draft-mode-selector" style="margin-bottom:12px">
            <button class="draft-mode-btn ${nbState.draftMode === 'auto' ? 'active' : ''}"
              onclick="setDraftMode('auto')">Auto Save</button>
            <button class="draft-mode-btn ${nbState.draftMode === 'manual' ? 'active' : ''}"
              onclick="setDraftMode('manual')">Manual Save</button>
          </div>

          <button class="btn btn-primary btn-full" id="nb-generate-btn"
                  onclick="runBatchGenerate()" ${!nbState.selectedFile ? 'disabled' : ''}>
            Generate Emails
          </button>

          ${nbState.emails.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <button class="btn btn-primary btn-full" id="nb-save-btn"
              onclick="nbSaveDrafts()" ${!nbState.gmailConnected ? 'disabled title="Connect Gmail first"' : ''}>
              Save ${nbState.emails.filter(e => e.body && !e.error).length} Drafts + Add to Pipeline
            </button>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Right: email previews -->
      <div>
        <div class="output-panel-header">
          <h3 class="panel-title" style="margin-bottom:0">
            ${nbState.emails.length > 0 ? `${nbState.emails.length} emails generated` : 'Generated Emails'}
          </h3>
          ${nbState.emails.length > 0 ? `
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:12px;color:var(--text-muted)">Click to edit</span>
              <button class="btn btn-secondary btn-sm" onclick="clearBatch()" style="font-size:11px;padding:3px 10px;color:var(--text-muted)">Clear All</button>
            </div>` : ''}
        </div>
        <div id="nb-output">
          ${nbState.emails.length === 0 ? `
            <div class="panel">
              <div class="output-placeholder" style="height:300px">
                <div class="output-icon">✉️</div>
                <p>Upload a CSV and click Generate — emails appear here ready to review and edit</p>
              </div>
            </div>
          ` : renderNbEmailCards()}
        </div>
      </div>
    </div>`;

  setupNbDropzone();
}

function backToPipeline() {
  state.outreachView = 'pipeline';
  renderPipelineView();
}

function setupNbDropzone() {
  const dz = document.getElementById('nb-dropzone');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) applyNbFile(file);
  });
}

function handleNbFileSelect(e) {
  const file = e.target.files[0];
  if (file) applyNbFile(file);
}

function applyNbFile(file) {
  if (!file.name.endsWith('.csv')) { showToast('Please upload a .csv file', 'error'); return; }
  nbState.selectedFile = file;
  renderNewBatchView();
}

async function runBatchGenerate() {
  if (!nbState.selectedFile) { showToast('Upload a CSV first', 'error'); return; }

  const btn = document.getElementById('nb-generate-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  const outputEl = document.getElementById('nb-output');
  outputEl.innerHTML = `
    <div class="panel gen-progress">
      <div style="font-size:14px;font-weight:600;color:var(--text-primary)">Generating emails...</div>
      <div class="gen-progress-bar-track">
        <div class="gen-progress-bar-fill" id="nb-progress-fill" style="width:0%"></div>
      </div>
      <div class="gen-progress-label">Reading CSV and calling Claude API</div>
    </div>`;

  let pct = 0;
  const ticker = setInterval(() => {
    pct = Math.min(pct + (Math.random() * 4), 88);
    const fill = document.getElementById('nb-progress-fill');
    if (fill) fill.style.width = pct + '%';
  }, 600);

  try {
    const formData = new FormData();
    formData.append('csv', nbState.selectedFile);

    const res = await fetch(`${API.outreachGen}/generate`, { method: 'POST', body: formData });
    const data = await res.json();
    clearInterval(ticker);
    const fill = document.getElementById('nb-progress-fill');
    if (fill) fill.style.width = '100%';
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    nbState.emails = data.emails;
    showToast(`${data.total} emails generated`);
    renderNewBatchView();
    if (nbState.draftMode === 'auto' && nbState.gmailConnected) {
      await nbSaveDrafts();
    }
  } catch (err) {
    clearInterval(ticker);
    outputEl.innerHTML = `<div class="panel"><div class="output-error">⚠️ ${esc(err.message)}</div></div>`;
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Generate Emails';
  }
}

function renderNbEmailCards() {
  if (nbState.emails.length === 0) return '';
  return `<div class="email-list">${nbState.emails.map((e, i) => renderNbEmailCard(e, i)).join('')}</div>`;
}

function renderNbEmailCard(e, i) {
  if (e.error) {
    return `
      <div class="email-card error-card">
        <div class="email-card-header">
          <div class="email-card-meta">
            <div class="email-card-name">@${esc(e.handle)} — ${esc(e.name)}</div>
            <div class="email-card-sub" style="color:var(--red)">Failed: ${esc(e.error)}</div>
          </div>
        </div>
      </div>`;
  }
  return `
    <div class="email-card" id="nb-card-${i}">
      <div class="email-card-header">
        <div class="email-card-meta">
          <div class="email-card-name">@${esc(e.handle)}${e.name ? ' — ' + esc(e.name) : ''}</div>
          <div class="email-card-sub">${esc(e.email) || '<span style="color:var(--red)">No email address</span>'}</div>
        </div>
        <span class="email-card-sender">from ${esc(e.sender)}</span>
      </div>
      <div class="email-card-body">
        <div class="email-subject">Subject: <span>paid opportunity with The Bikini Line Co</span></div>
        <div class="email-text" id="nb-email-text-${i}"
          contenteditable="false" onclick="makeNbEditable(${i})"
          title="Click to edit">${esc(e.body)}</div>
      </div>
      <div class="email-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="makeNbEditable(${i})" id="nb-edit-btn-${i}">Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="saveNbEdit(${i})" id="nb-save-edit-btn-${i}" style="display:none">Done</button>
        ${nbState.draftMode === 'manual' ? `
        <button class="btn btn-secondary btn-sm nb-draft-btn" onclick="saveOneDraft(${i})" id="nb-draft-btn-${i}"
          ${!nbState.gmailConnected ? 'disabled title="Connect Gmail first"' : ''}>
          Save to Gmail
        </button>` : ''}
      </div>
    </div>`;
}

function setDraftMode(mode) {
  nbState.draftMode = mode;
  renderNewBatchView();
}

async function saveOneDraft(i) {
  if (!nbState.gmailConnected) { showToast('Connect Gmail first', 'error'); return; }

  await checkGmailStatus();
  if (!nbState.gmailConnected) {
    showToast('Gmail was disconnected — please reconnect and try again', 'error');
    renderNewBatchView();
    return;
  }

  const e = nbState.emails[i];
  const el = document.getElementById(`nb-email-text-${i}`);
  if (el) e.body = el.innerText;

  const btn = document.getElementById(`nb-draft-btn-${i}`);
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    await fetchAPI(`${API.outreachGen}/save-drafts`, {
      method: 'POST',
      body: JSON.stringify({ emails: [e] })
    });
    const result = await addOneToPipeline(e);
    if (btn) { btn.disabled = true; btn.textContent = 'Saved ✓'; btn.classList.add('saved'); }
    nbState.savedCount = (nbState.savedCount || 0) + 1;
    showDraftSuccessModal(1, result.ok ? 1 : 0, nbState.connectedEmail, true, result.ok ? null : result.error);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Save to Gmail'; }
    if (err.message.includes('not connected') || err.message.includes('invalid_grant')) {
      nbState.gmailConnected = false;
      renderNewBatchView();
    }
    showToast(err.message, 'error');
  }
}

function makeNbEditable(i) {
  const el = document.getElementById(`nb-email-text-${i}`);
  if (!el) return;
  el.setAttribute('contenteditable', 'true');
  el.focus();
  document.getElementById(`nb-edit-btn-${i}`).style.display = 'none';
  document.getElementById(`nb-save-edit-btn-${i}`).style.display = '';
}

function saveNbEdit(i) {
  const el = document.getElementById(`nb-email-text-${i}`);
  if (!el) return;
  nbState.emails[i].body = el.innerText;
  el.setAttribute('contenteditable', 'false');
  document.getElementById(`nb-edit-btn-${i}`).style.display = '';
  document.getElementById(`nb-save-edit-btn-${i}`).style.display = 'none';
}


// ============================================================
// GMAIL (used in new batch view)
// ============================================================

async function checkGmailStatus() {
  try {
    const [gmail, drive] = await Promise.all([
      fetchAPI(`${API.outreachGen}/auth/status`),
      fetchAPI(`${API.outreachGen}/drive-auth/status`)
    ]);
    const wasConnected = nbState.gmailConnected;
    nbState.gmailConnected = gmail.connected;
    nbState.connectedEmail = gmail.email || null;
    nbState.driveConnected = drive.connected;
    nbState.driveEmail     = drive.email || null;
    if (gmail.connected !== wasConnected && state.outreachView === 'new-batch') renderNewBatchView();
  } catch (_) {}
}

async function connectGmail() {
  const btn = document.getElementById('nb-connect-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Opening...'; }

  try {
    const data = await fetchAPI(`${API.outreachGen}/auth/url`);
    const popup = window.open(data.url, 'gmail-auth', 'width=500,height=650,top=100,left=200');

    if (nbState.polling) clearInterval(nbState.polling);
    nbState.polling = setInterval(async () => {
      await checkGmailStatus();
      if (nbState.gmailConnected) {
        clearInterval(nbState.polling);
        if (popup && !popup.closed) popup.close();
      }
    }, 1500);
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Connect Gmail'; }
  }
}

async function disconnectGmail() {
  try {
    await fetchAPI(`${API.outreachGen}/auth/disconnect`, { method: 'DELETE' });
    nbState.gmailConnected = false;
    renderNewBatchView();
    showToast('Gmail disconnected');
  } catch (err) { showToast(err.message, 'error'); }
}

async function checkDriveStatus() {
  try {
    const data = await fetchAPI(`${API.outreachGen}/drive-auth/status`);
    nbState.driveConnected = data.connected;
    nbState.driveEmail     = data.email || null;
  } catch (_) {}
}

async function connectDrive() {
  const btn = document.getElementById('nb-drive-connect-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Opening...'; }
  try {
    const data = await fetchAPI(`${API.outreachGen}/drive-auth/url`);
    const popup = window.open(data.url, 'drive-auth', 'width=500,height=650,top=100,left=200');
    const poll = setInterval(async () => {
      await checkDriveStatus();
      if (nbState.driveConnected) {
        clearInterval(poll);
        if (popup && !popup.closed) popup.close();
        renderNewBatchView();
        showToast('Google Drive connected — ' + (nbState.driveEmail || ''));
      }
    }, 1500);
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Connect Google Drive (for contracts)'; }
  }
}

async function disconnectDrive() {
  try {
    await fetchAPI(`${API.outreachGen}/drive-auth/disconnect`, { method: 'DELETE' });
    nbState.driveConnected = false;
    nbState.driveEmail     = null;
    renderNewBatchView();
    showToast('Drive disconnected');
  } catch (err) { showToast(err.message, 'error'); }
}

async function addOneToPipeline(e) {
  try {
    const rec = await fetchAPI(API.outreach, {
      method: 'POST',
      body: JSON.stringify({
        handle:              e.handle,
        name:                e.name,
        email:               e.email,
        product_category:    e.product_category,
        follower_count:      e.follower_count,
        last_30d_gmv:        e.last_30d_gmv,
        avg_engagement:      e.avg_engagement,
        estimated_post_rate: e.estimated_post_rate,
        profile_url:         e.profile_url,
        status:              'drafted',
        generated_email:     e.body,
        sender:              e.sender
      })
    });
    state.outreach.unshift(rec);
    return { ok: true };
  } catch (err) {
    console.error('Failed to add to pipeline:', e.handle, err.message);
    return { ok: false, error: err.message };
  }
}

async function nbSaveDrafts() {
  if (!nbState.gmailConnected) { showToast('Connect Gmail first', 'error'); return; }

  // Pre-flight: verify server still has tokens (catches redeploy mid-session)
  await checkGmailStatus();
  if (!nbState.gmailConnected) {
    showToast('Gmail was disconnected — please reconnect and try again', 'error');
    renderNewBatchView();
    return;
  }

  nbState.emails.forEach((e, i) => {
    const el = document.getElementById(`nb-email-text-${i}`);
    if (el) e.body = el.innerText;
  });

  const toSave = nbState.emails.filter(e => e.body && !e.error);
  if (toSave.length === 0) { showToast('No valid emails to save', 'error'); return; }

  const btn = document.getElementById('nb-save-btn');
  const estSecs = Math.ceil(toSave.length * 0.15) + 2;
  if (btn) {
    btn.disabled = true;
    btn.textContent = `Saving ${toSave.length} drafts… (~${estSecs}s)`;
  }

  try {
    const res = await fetchAPI(`${API.outreachGen}/save-drafts`, {
      method: 'POST',
      body: JSON.stringify({ emails: toSave })
    });

    if (res.failed > 0) showToast(`${res.failed} draft(s) failed — check Railway logs`, 'error');
    if (btn) { btn.textContent = 'Adding to pipeline...'; }
    let added = 0;
    let firstError = null;
    for (const e of toSave) {
      const result = await addOneToPipeline(e);
      if (result.ok) added++;
      else if (!firstError) firstError = result.error;
    }

    nbState.savedCount = (nbState.savedCount || 0) + res.saved;
    nbState.emails = [];
    renderNewBatchView();
    showDraftSuccessModal(res.saved, added, nbState.connectedEmail, false, firstError);
  } catch (err) {
    if (err.message.includes('not connected') || err.message.includes('invalid_grant')) {
      nbState.gmailConnected = false;
      renderNewBatchView();
    }
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = `Save ${toSave.length} Drafts + Add to Pipeline`; }
  }
}

// ============================================================
// ROSTER — DATA
// ============================================================

async function loadRoster() {
  state.roster = await fetchAPI(API.roster);
  updateReviewBadge();
}

async function checkTikTokStatus() {
  try {
    const data = await fetchAPI('/api/tiktok/status');
    state.tiktokConnected = data.connected && !data.expired;
  } catch { state.tiktokConnected = false; }
}

async function syncTikTokGMV() {
  const btn = document.getElementById('tiktok-sync-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
  try {
    const result = await fetchAPI('/api/tiktok/sync', { method: 'POST' });
    await loadRoster();
    renderRosterPage();
    showToast(`Synced — ${result.updated} creator(s) updated (${result.total_orders} orders).`);
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '↻ Sync GMV'; }
  }
}

// ============================================================
// ROSTER — RENDER
// ============================================================

function switchRosterTab(tab) {
  state.rosterTab = tab;
  if (state.activeRosterId) {
    const r = state.roster.find(x => x.id === state.activeRosterId);
    const rType = r?.affiliate_type || 'paid';
    if (rType !== tab) { state.activeRosterId = null; closeDetailPanel(); }
  }
  updateRosterSubNav();
  renderRosterPage();
}

function renderRosterPage() {
  const isPaid  = state.rosterTab === 'paid';
  const list    = state.roster.filter(r => isPaid ? (r.affiliate_type !== 'free') : (r.affiliate_type === 'free'));
  const active  = list.filter(r => r.status === 'active').length;
  const totalGMV   = list.reduce((s, r) => s + (parseFloat(r.gmv) || 0), 0);
  const totalPosts = list.reduce((s, r) => s + (parseInt(r.content_submitted) || 0), 0);
  const paidCount  = state.roster.filter(r => r.affiliate_type !== 'free').length;
  const freeCount  = state.roster.filter(r => r.affiliate_type === 'free').length;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${isPaid ? 'Paid Affiliates' : 'Free Affiliates'}</h1>
        <p class="page-subtitle">${isPaid ? 'Contracted creators — per-video deals' : 'Commission-only affiliates'}</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${state.tiktokConnected
          ? `<button class="btn btn-secondary" id="tiktok-sync-btn" onclick="syncTikTokGMV()">↻ Sync TikTok GMV</button>`
          : `<button class="btn btn-secondary" onclick="window.location.href='/api/tiktok/auth'">Connect TikTok Shop</button>`
        }
        <button class="btn btn-primary" onclick="openAddRosterModal()">+ Add Affiliate</button>
      </div>
    </div>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">${list.length}</div>
        <div class="stat-label">${isPaid ? 'Paid' : 'Free'} Affiliates</div>
      </div>
      <div class="stat-card">
        <div class="stat-value green">${active}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value accent">${fmt$(totalGMV)}</div>
        <div class="stat-label">Total GMV</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalPosts}</div>
        <div class="stat-label">Posts Submitted</div>
      </div>
    </div>

    <div class="table-container">
      ${list.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${isPaid ? '👥' : '🔗'}</div>
          <h3>No ${isPaid ? 'paid' : 'free'} affiliates yet</h3>
          <p>${isPaid ? 'Signed creators move here from the outreach pipeline' : 'Add commission-only affiliates manually'}</p>
          <button class="btn btn-primary" onclick="openAddRosterModal()">+ Add Affiliate</button>
        </div>
      ` : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Creator</th>
              ${isPaid ? `<th>Grade</th><th>Deal</th><th>Start Date</th>` : `<th>Followers</th>`}
              <th>Posts Made</th>
              ${isPaid ? `<th>Posts Left</th>` : ''}
              <th>GMV</th>
              <th>Status</th>
              ${isPaid ? `<th class="tbl-th-assets">Assets Needed</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${list.map(r => {
              const isActive = r.id === state.activeRosterId;
              const startFmt = r.start_date
                ? new Date(r.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—';
              return `
              <tr class="clickable-row${isActive ? ' row-active' : ''}" onclick="openRosterDetail('${r.id}')">
                <td>
                  <div class="creator-cell">
                    <span class="creator-handle">@${esc(r.handle)}</span>
                    ${r.name ? `<span class="creator-email">${esc(r.name)}</span>` : ''}
                  </div>
                </td>
                ${isPaid ? `
                  <td>${r.tier ? `<span class="grade-badge grade-${r.tier}">${r.tier}</span>` : '—'}</td>
                  <td class="tbl-editable-cell" onclick="rosterDealCellEdit(this,'${r.id}',${r.video_count||0},${r.per_vid_rate||0})" title="Click to edit deal">
                    ${r.video_count && r.per_vid_rate
                      ? `<span class="deal-cell">${r.video_count} vids · ${fmt$(parseFloat(r.per_vid_rate) * parseInt(r.video_count))}</span>`
                      : `<span class="deal-cell-none">+ Add deal</span>`}
                  </td>
                  <td class="tbl-editable-cell" onclick="rosterCellEdit(this,'${r.id}','start_date','${r.start_date ? r.start_date.split('T')[0] : ''}','date')" title="Click to edit">${startFmt}</td>
                ` : `<td>${fmtNum(r.followers)}</td>`}
                <td class="tbl-editable-cell" onclick="rosterCellEdit(this,'${r.id}','content_submitted',${r.content_submitted||0},'number')" title="Click to edit">${r.content_submitted || 0}</td>
                ${isPaid ? (() => {
                  const made      = parseInt(r.content_submitted) || 0;
                  const total     = parseInt(r.video_count) || 0;
                  const remaining = Math.max(0, total - made);
                  return `<td class="tbl-posts-remaining ${remaining === 0 && total > 0 ? 'posts-done' : remaining > 0 ? 'posts-active' : ''}">${total > 0 ? remaining : '—'}</td>`;
                })() : ''}
                <td class="tbl-editable-cell" onclick="rosterCellEdit(this,'${r.id}','gmv',${r.gmv||0},'number')" title="Click to edit"><span class="gmv-value">${fmt$(r.gmv)}</span></td>
                <td onclick="event.stopPropagation()">
                  <select class="inline-status-select status-key-rs-${r.status}"
                    onchange="saveRosterField('${r.id}','status',this.value);this.className='inline-status-select status-key-rs-'+this.value">
                    <option value="active"     ${r.status==='active'     ?'selected':''}>Active</option>
                    <option value="onboarding" ${r.status==='onboarding' ?'selected':''}>Onboarding</option>
                    <option value="watching"   ${r.status==='watching'   ?'selected':''}>Watching</option>
                    <option value="paused"     ${r.status==='paused'     ?'selected':''}>Paused</option>
                    <option value="inactive"   ${r.status==='inactive'   ?'selected':''}>Inactive</option>
                  </select>
                </td>
                ${isPaid ? `
                <td class="tbl-editable-cell tbl-assets-cell" onclick="rosterCellEdit(this,'${r.id}','creative_assets_needed',${r.creative_assets_needed||0},'number')" title="Click to set number of creative assets needed">
                  ${(r.creative_assets_needed || 0) > 0
                    ? `<span class="assets-badge">${r.creative_assets_needed}</span>`
                    : `<span class="assets-none">—</span>`}
                </td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>`;

  if (state.activeRosterId && state.roster.find(r => r.id === state.activeRosterId)) {
    const panel = document.getElementById('detail-panel');
    panel.style.display = 'flex';
    renderRosterDetailPanel();
  }
}

// ============================================================
// ROSTER — DETAIL PANEL
// ============================================================

function openRosterDetail(id) {
  state.activeRosterId = id;
  const panel = document.getElementById('detail-panel');
  panel.style.display = 'flex';
  renderRosterDetailPanel();
  document.querySelectorAll('.data-table tbody .clickable-row').forEach(tr => {
    tr.classList.toggle('row-active', tr.getAttribute('onclick') === `openRosterDetail('${id}')`);
  });
}

function renderRosterDetailPanel() {
  const r = state.roster.find(x => x.id === state.activeRosterId);
  if (!r) { closeDetailPanel(); return; }

  document.getElementById('detail-drawer-title').textContent = 'Affiliate Profile';

  const topVids  = Array.isArray(r.top_videos)      ? r.top_videos      : [];
  const blcVids  = Array.isArray(r.blc_videos)       ? r.blc_videos      : [];
  const schedule = Array.isArray(r.posting_schedule) ? r.posting_schedule : [];
  const startISO = r.start_date ? r.start_date.split('T')[0] : '';
  const endISO   = startISO ? (() => {
    const d = new Date(startISO + 'T12:00:00'); d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  })() : '';
  const total = (parseFloat(r.per_vid_rate) || 0) * (parseInt(r.video_count) || 0);
  const ROSTER_STATUSES = [['active','Active'],['onboarding','Onboarding'],['watching','Watching'],['paused','Paused'],['inactive','Inactive']];

  const videoListHTML = (videos, listId, removeFn, inputId, addFn) => `
    <div id="${listId}" class="rs-video-list">
      ${videos.map((url, i) => `
        <div class="rs-video-item" data-idx="${i}">
          <a href="${esc(url)}" target="_blank" class="rs-video-link" title="${esc(url)}">${esc(url)}</a>
          <button class="rs-remove-btn" onclick="${removeFn}('${r.id}',${i})" title="Remove">✕</button>
        </div>`).join('')}
    </div>
    <div class="rs-add-video-row">
      <input type="url" class="dp-input" id="${inputId}" placeholder="Paste TikTok URL..."
        onkeydown="if(event.key==='Enter'){${addFn}('${r.id}');event.preventDefault();}">
      <button class="btn btn-secondary btn-sm" onclick="${addFn}('${r.id}')">+ Add</button>
    </div>`;

  document.getElementById('detail-drawer-body').innerHTML = `

    <!-- Header -->
    <div class="dp-creator-header">
      <div class="dp-header-top">
        <div class="dp-name">${esc(r.name || r.handle)}</div>
        <select class="inline-status-select status-key-rs-${r.status} dp-status-inline"
          onchange="saveRosterField('${r.id}','status',this.value); this.className='inline-status-select status-key-rs-'+this.value+' dp-status-inline'">
          ${ROSTER_STATUSES.map(([k,l]) => `<option value="${k}" ${r.status===k?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="dp-handle-row">
        <span class="dp-handle-plain">@${esc(r.handle)}</span>
      </div>
      <div class="dp-chips">
        ${r.tier      ? `<span class="dp-chip"><b>${r.tier}</b> grade</span>` : ''}
        ${r.followers ? `<span class="dp-chip">${fmtNum(r.followers)} followers</span>` : ''}
        ${r.email     ? `<span class="dp-chip dp-chip-email">${esc(r.email)}</span>` : ''}
      </div>
    </div>

    <!-- Deal Details -->
    <div class="dp-section">
      <div class="dp-section-label">Deal Details</div>
      <div class="dp-signed-grid">
        <div class="dp-form-group">
          <label># Videos</label>
          <input type="number" class="dp-input" id="rs-deal-count" value="${r.video_count || ''}" placeholder="e.g. 5">
        </div>
        <div class="dp-form-group">
          <label>Total Deal</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" id="rs-deal-total"
              value="${r.per_vid_rate && r.video_count ? Math.round(parseFloat(r.per_vid_rate) * parseInt(r.video_count)) : ''}"
              placeholder="e.g. 1000">
          </div>
          ${r.per_vid_rate && r.video_count ? `<div class="dp-rate-per-vid" id="rs-deal-rate-hint">${fmt$(r.per_vid_rate)}/vid</div>` : '<div class="dp-rate-per-vid" id="rs-deal-rate-hint"></div>'}
        </div>
        <div class="dp-form-group">
          <label>Start Date</label>
          <input type="date" class="dp-input" id="rs-deal-start" value="${startISO}">
        </div>
        <div class="dp-form-group">
          <label>End Date</label>
          <input type="date" class="dp-input" id="rs-deal-end" value="${r.end_date ? r.end_date.split('T')[0] : endISO}">
        </div>
      </div>
      ${total > 0 ? `<div class="dp-deal-summary" id="rs-deal-summary"><b>${r.video_count} videos</b> for <b>${fmt$(total)}</b> <span style="color:var(--text-muted);font-weight:400">&nbsp;·&nbsp; ${fmt$(r.per_vid_rate)}/vid</span></div>` : '<div class="dp-deal-summary" id="rs-deal-summary" style="display:none"></div>'}
      <button class="dp-save-btn" id="rs-deal-save-btn" onclick="saveRosterDealSection('${r.id}')">Save Deal Details</button>
    </div>

    <!-- Posting Schedule (right after deal) -->
    <div class="dp-section">
      <div class="dp-section-label">Posting Schedule</div>
      <div class="dp-section-hint">Track when each video is due and whether it's been posted</div>
      <div id="rs-schedule-list" class="rs-schedule-list">
        ${schedule.map((entry, i) => `
          <div class="rs-schedule-entry${entry.posted ? ' rs-entry-posted' : ''}" data-idx="${i}">
            <div class="rs-schedule-top-row">
              <span class="rs-schedule-label">${esc(entry.note || `Video ${i+1}`)}</span>
              <input type="date" class="dp-input rs-schedule-date" value="${esc(entry.date || '')}"
                onblur="updateScheduleEntry('${r.id}',${i},'date',this.value)">
              <label class="rs-posted-label" title="Mark as posted">
                <input type="checkbox" ${entry.posted ? 'checked' : ''} onchange="toggleSchedulePosted('${r.id}',${i},this.checked)">
                <span>Posted</span>
              </label>
              <button class="rs-remove-btn" onclick="removeScheduleEntry('${r.id}',${i})" title="Remove">✕</button>
            </div>
            <input type="url" class="dp-input rs-schedule-link" value="${esc(entry.link || '')}"
              placeholder="Paste video link once posted…"
              onblur="updateScheduleEntry('${r.id}',${i},'link',this.value)">
          </div>`).join('')}
      </div>
      <button class="rs-add-schedule-btn" onclick="addScheduleEntry('${r.id}')">+ Add Entry</button>
    </div>

    <!-- Performance -->
    <div class="dp-section">
      <div class="dp-section-label">Performance</div>
      <div class="dp-signed-grid">
        <div class="dp-form-group">
          <label>Posts Submitted</label>
          <input type="number" min="0" class="dp-input" id="rs-perf-posts" value="${r.content_submitted || 0}">
        </div>
        <div class="dp-form-group">
          <label>GMV Earned</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" step="0.01" min="0" class="dp-input" id="rs-perf-gmv" value="${r.gmv || 0}">
          </div>
        </div>
        <div class="dp-form-group">
          <label>Commission Rate</label>
          <input type="number" step="0.1" min="0" max="100" class="dp-input" id="rs-perf-commission"
            value="${r.commission_rate ?? 20}" placeholder="20">
          <div class="dp-rate-per-vid">% organic · 10% on Spark Ads</div>
        </div>
      </div>
      <button class="dp-save-btn" id="rs-perf-save-btn" onclick="saveRosterPerfSection('${r.id}')">Save Performance</button>
    </div>

    <!-- Content Style -->
    <div class="dp-section">
      <div class="dp-section-label-row">
        <div class="dp-section-label">Content Style</div>
        <button class="rs-dictate-btn" id="rs-dictate-btn-style" onclick="toggleDictation('${r.id}','rs-content-style','rs-dictate-btn-style','content_style')">
          <span>🎤</span> Dictate
        </button>
      </div>
      <div class="dp-section-hint">How they create — format, vibe, energy, what makes them work</div>
      <textarea class="dp-textarea rs-assessment-ta" id="rs-content-style"
        placeholder="e.g. Casual get-ready-with-me style, lots of close-ups, speaks directly to camera, authentic and unfiltered, good at showing before/after...">${esc(r.content_style || '')}</textarea>
      <button class="dp-save-btn" id="rs-style-save-btn" onclick="saveSectionField('${r.id}','content_style','rs-content-style','rs-style-save-btn')">Save</button>
    </div>

    <!-- BLC Vision -->
    <div class="dp-section">
      <div class="dp-section-label-row">
        <div class="dp-section-label">BLC Vision</div>
        <button class="rs-dictate-btn" id="rs-dictate-btn-vision" onclick="toggleDictation('${r.id}','rs-blc-vision','rs-dictate-btn-vision','creator_assessment')">
          <span>🎤</span> Dictate
        </button>
      </div>
      <div class="dp-section-hint">How do we think she can succeed as a BLC affiliate?</div>
      <textarea class="dp-textarea rs-assessment-ta" id="rs-blc-vision"
        placeholder="e.g. Her audience is exactly our demo — young women dealing with ingrowns. She should lead with the Ingrown Serum, do a before/after, and link in first comment...">${esc(r.creator_assessment || '')}</textarea>
      <button class="dp-save-btn" id="rs-vision-save-btn" onclick="saveSectionField('${r.id}','creator_assessment','rs-blc-vision','rs-vision-save-btn')">Save</button>
    </div>

    <!-- Best Performing TikTok Shop Videos -->
    <div class="dp-section">
      <div class="dp-section-label">Best Performing TikTok Shop Videos</div>
      <div class="dp-section-hint">Their top TikTok Shop content — any brand, not just ours</div>
      ${videoListHTML(topVids, 'rs-videos-list', 'removeTopVideo', 'rs-new-video-url', 'addTopVideo')}
    </div>

    <!-- BLC Videos -->
    <div class="dp-section">
      <div class="dp-section-label">BLC Videos</div>
      <div class="dp-section-hint">Videos they've posted specifically for us</div>
      ${videoListHTML(blcVids, 'rs-blc-videos-list', 'removeBLCVideo', 'rs-new-blc-url', 'addBLCVideo')}
    </div>

    <!-- Remove -->
    <div class="dp-delete-zone">
      <button class="btn btn-danger-outline" onclick="deleteRosterFromPanel('${r.id}')">Remove from Roster</button>
    </div>
  `;
}

// ============================================================
// ROSTER — SAVE / CRUD
// ============================================================

async function saveRosterField(id, field, value) {
  try {
    const body = { [field]: value === '' ? null : value };
    const rec = await fetchAPI(`${API.roster}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    const i = state.roster.findIndex(x => x.id === id);
    if (i !== -1) state.roster[i] = rec;
    if (field === 'status') updateReviewBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveRosterDealTotal(rosterId, totalStr) {
  const total = parseFloat(totalStr);
  if (!total || isNaN(total)) return;
  const r = state.roster.find(x => x.id === rosterId);
  const count = r ? parseInt(r.video_count) : 0;
  if (!count) { showToast('Set # videos first', 'error'); return; }
  await saveRosterField(rosterId, 'per_vid_rate', total / count);
}

async function saveOutreachDealTotal(outreachId, totalStr) {
  const total = parseFloat(totalStr);
  if (!total || isNaN(total)) return;
  const countEl = document.getElementById('dp-video-count');
  const r = state.outreach.find(x => x.id === outreachId);
  const count = parseInt(countEl?.value || r?.video_count || 0);
  if (!count) { showToast('Set # videos first', 'error'); return; }
  await updateOutreachField(outreachId, 'counter_offer_amount', total / count);
}

// Batch save helpers — read fields by ID, save in one PUT, flash button
function _flashSaveBtn(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = 'Saved ✓';
  btn.classList.add('dp-save-btn-done');
  setTimeout(() => { btn.textContent = btn.dataset.label || 'Save'; btn.classList.remove('dp-save-btn-done'); }, 1800);
}

async function saveRosterDealSection(rosterId) {
  const countVal = document.getElementById('rs-deal-count')?.value;
  const totalVal = document.getElementById('rs-deal-total')?.value;
  const startVal = document.getElementById('rs-deal-start')?.value;
  const endVal   = document.getElementById('rs-deal-end')?.value;

  const videoCount = parseInt(countVal);
  const dealTotal  = parseFloat(totalVal);

  if (totalVal && !isNaN(dealTotal) && (!countVal || isNaN(videoCount))) {
    showToast('Set # videos first', 'error'); return;
  }

  const updates = {};
  if (!isNaN(videoCount) && countVal) updates.video_count = videoCount;
  if (!isNaN(dealTotal)  && totalVal) updates.per_vid_rate = (updates.video_count || videoCount) ? dealTotal / (updates.video_count || videoCount) : null;
  if (startVal) updates.start_date = startVal;
  if (endVal)   updates.end_date   = endVal;

  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, { method: 'PUT', body: JSON.stringify(updates) });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    // Refresh the summary line and rate hint
    const newTotal = (parseFloat(rec.per_vid_rate) || 0) * (parseInt(rec.video_count) || 0);
    const summaryEl = document.getElementById('rs-deal-summary');
    const hintEl    = document.getElementById('rs-deal-rate-hint');
    if (summaryEl && newTotal > 0) {
      summaryEl.style.display = '';
      summaryEl.innerHTML = `<b>${rec.video_count} videos</b> for <b>${fmt$(newTotal)}</b> <span style="color:var(--text-muted);font-weight:400">&nbsp;·&nbsp; ${fmt$(rec.per_vid_rate)}/vid</span>`;
    }
    if (hintEl && rec.per_vid_rate) hintEl.textContent = `${fmt$(rec.per_vid_rate)}/vid`;
    _flashSaveBtn('rs-deal-save-btn');
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveRosterPerfSection(rosterId) {
  const posts      = document.getElementById('rs-perf-posts')?.value;
  const gmv        = document.getElementById('rs-perf-gmv')?.value;
  const commission = document.getElementById('rs-perf-commission')?.value;

  const updates = {};
  if (posts      !== undefined) updates.content_submitted = posts      !== '' ? parseInt(posts)           : null;
  if (gmv        !== undefined) updates.gmv               = gmv        !== '' ? parseFloat(gmv)           : null;
  if (commission !== undefined) updates.commission_rate   = commission !== '' ? parseFloat(commission)     : null;

  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, { method: 'PUT', body: JSON.stringify(updates) });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    _flashSaveBtn('rs-perf-save-btn');
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveSectionField(rosterId, field, textareaId, btnId) {
  const value = document.getElementById(textareaId)?.value ?? '';
  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, { method: 'PUT', body: JSON.stringify({ [field]: value || null }) });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    _flashSaveBtn(btnId);
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Inline table cell editing ──────────────────────────────────────────────

function rosterCellEdit(td, rosterId, field, currentVal, type) {
  event.stopPropagation();
  const orig = td.innerHTML;
  const input = document.createElement('input');
  input.className = 'tbl-inline-input';
  input.type  = type || 'text';
  input.value = currentVal || '';
  if (type === 'number') input.step = 'any';
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();

  let saved = false;
  async function commit() {
    if (saved) return;
    saved = true;
    const val = input.value.trim();
    try {
      const body = val === '' ? { [field]: null } : { [field]: type === 'number' ? parseFloat(val) : val };
      const rec = await fetchAPI(`${API.roster}/${rosterId}`, { method: 'PUT', body: JSON.stringify(body) });
      const i = state.roster.findIndex(x => x.id === rosterId);
      if (i !== -1) state.roster[i] = rec;
      updateReviewBadge();
      renderRosterPage();
    } catch (err) { showToast(err.message, 'error'); td.innerHTML = orig; }
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { saved = true; td.innerHTML = orig; }
  });
}

function rosterDealCellEdit(td, rosterId, videoCount, perVidRate) {
  event.stopPropagation();
  const orig = td.innerHTML;
  const currentTotal = videoCount && perVidRate ? Math.round(parseFloat(perVidRate) * parseInt(videoCount)) : '';

  td.innerHTML = `
    <div class="tbl-deal-edit" onclick="event.stopPropagation()">
      <input class="tbl-inline-input tbl-deal-count" type="number" min="1" placeholder="vids" value="${videoCount || ''}">
      <span class="tbl-deal-sep">×  $</span>
      <input class="tbl-inline-input tbl-deal-total" type="number" min="0" placeholder="total" value="${currentTotal}">
      <button class="tbl-deal-save" onclick="commitRosterDealCell(this,'${rosterId}')">✓</button>
      <button class="tbl-deal-cancel" onclick="event.stopPropagation();this.closest('td').innerHTML=\`${orig.replace(/`/g,"'")}\`">✕</button>
    </div>`;

  // also save on Enter from either input
  td.querySelectorAll('input').forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commitRosterDealCell(td.querySelector('.tbl-deal-save'), rosterId); }
    if (e.key === 'Escape') { td.innerHTML = orig; }
  }));
  td.querySelector('.tbl-deal-count').focus();
}

async function commitRosterDealCell(btn, rosterId) {
  event.stopPropagation();
  const td    = btn.closest('td');
  const count = parseInt(td.querySelector('.tbl-deal-count')?.value);
  const total = parseFloat(td.querySelector('.tbl-deal-total')?.value);
  if (!count || count < 1)  { showToast('Enter number of videos', 'error'); return; }
  if (!total || total <= 0) { showToast('Enter total deal amount', 'error'); return; }
  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, {
      method: 'PUT',
      body: JSON.stringify({ video_count: count, per_vid_rate: total / count })
    });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    renderRosterPage();
  } catch (err) { showToast(err.message, 'error'); }
}

function _addVideoToList(rosterId, field, inputId, listId, removeFn) {
  const input = document.getElementById(inputId);
  const url   = input?.value?.trim();
  if (!url) return;
  const r = state.roster.find(x => x.id === rosterId);
  if (!r) return;
  const videos = [...(Array.isArray(r[field]) ? r[field] : []), url];
  input.value = '';
  r[field] = videos;
  saveRosterField(rosterId, field, videos);
  const list = document.getElementById(listId);
  if (list) {
    const idx = videos.length - 1;
    const div = document.createElement('div');
    div.className   = 'rs-video-item';
    div.dataset.idx = idx;
    div.innerHTML   = `
      <a href="${esc(url)}" target="_blank" class="rs-video-link" title="${esc(url)}">${esc(url)}</a>
      <button class="rs-remove-btn" onclick="${removeFn}('${rosterId}',${idx})" title="Remove">✕</button>`;
    list.appendChild(div);
  }
}

function _removeVideoFromList(rosterId, field, idx, listId, removeFn) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r) return;
  const videos = (Array.isArray(r[field]) ? r[field] : []).filter((_, i) => i !== idx);
  r[field] = videos;
  saveRosterField(rosterId, field, videos);
  const list = document.getElementById(listId);
  if (list) {
    list.innerHTML = videos.map((url, i) => `
      <div class="rs-video-item" data-idx="${i}">
        <a href="${esc(url)}" target="_blank" class="rs-video-link" title="${esc(url)}">${esc(url)}</a>
        <button class="rs-remove-btn" onclick="${removeFn}('${rosterId}',${i})" title="Remove">✕</button>
      </div>`).join('');
  }
}

function addTopVideo(id)    { _addVideoToList(id, 'top_videos', 'rs-new-video-url', 'rs-videos-list', 'removeTopVideo'); }
function removeTopVideo(id, i) { _removeVideoFromList(id, 'top_videos', i, 'rs-videos-list', 'removeTopVideo'); }
function addBLCVideo(id)    { _addVideoToList(id, 'blc_videos', 'rs-new-blc-url', 'rs-blc-videos-list', 'removeBLCVideo'); }
function removeBLCVideo(id, i) { _removeVideoFromList(id, 'blc_videos', i, 'rs-blc-videos-list', 'removeBLCVideo'); }

// ── Posting Schedule ──────────────────────────────────────────

function addScheduleEntry(rosterId) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r) return;
  const entry    = { date: '', note: '', posted: false };
  const schedule = [...(Array.isArray(r.posting_schedule) ? r.posting_schedule : []), entry];
  r.posting_schedule = schedule;
  saveRosterField(rosterId, 'posting_schedule', schedule);
  const idx  = schedule.length - 1;
  const list = document.getElementById('rs-schedule-list');
  if (list) {
    const div = document.createElement('div');
    div.className   = 'rs-schedule-entry';
    div.dataset.idx = idx;
    div.innerHTML   = _scheduleEntryHTML(rosterId, entry, idx);
    list.appendChild(div);
    div.querySelector('.rs-schedule-date')?.focus();
  }
}

function _scheduleEntryHTML(rosterId, entry, idx) {
  return `
    <div class="rs-schedule-top-row">
      <span class="rs-schedule-label">${esc(entry.note || `Video ${idx+1}`)}</span>
      <input type="date" class="dp-input rs-schedule-date" value="${esc(entry.date || '')}"
        onblur="updateScheduleEntry('${rosterId}',${idx},'date',this.value)">
      <label class="rs-posted-label" title="Mark as posted">
        <input type="checkbox" ${entry.posted ? 'checked' : ''} onchange="toggleSchedulePosted('${rosterId}',${idx},this.checked)">
        <span>Posted</span>
      </label>
      <button class="rs-remove-btn" onclick="removeScheduleEntry('${rosterId}',${idx})" title="Remove">✕</button>
    </div>
    <input type="url" class="dp-input rs-schedule-link" value="${esc(entry.link || '')}"
      placeholder="Paste video link once posted…"
      onblur="updateScheduleEntry('${rosterId}',${idx},'link',this.value)">`;
}

function updateScheduleEntry(rosterId, idx, field, value) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r || !r.posting_schedule?.[idx]) return;
  r.posting_schedule[idx][field] = value;
  saveRosterField(rosterId, 'posting_schedule', r.posting_schedule);
}

function toggleSchedulePosted(rosterId, idx, checked) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r || !r.posting_schedule?.[idx]) return;
  r.posting_schedule[idx].posted = checked;
  saveRosterField(rosterId, 'posting_schedule', r.posting_schedule);
  const entry = document.querySelector(`#rs-schedule-list .rs-schedule-entry[data-idx="${idx}"]`);
  if (entry) entry.classList.toggle('rs-entry-posted', checked);
}

function removeScheduleEntry(rosterId, idx) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r) return;
  const schedule = (Array.isArray(r.posting_schedule) ? r.posting_schedule : []).filter((_, i) => i !== idx);
  r.posting_schedule = schedule;
  saveRosterField(rosterId, 'posting_schedule', schedule);
  const list = document.getElementById('rs-schedule-list');
  if (list) {
    list.innerHTML = schedule.map((entry, i) => `
      <div class="rs-schedule-entry${entry.posted ? ' rs-entry-posted' : ''}" data-idx="${i}">
        ${_scheduleEntryHTML(rosterId, entry, i)}
      </div>`).join('');
  }
}

async function deleteRosterFromPanel(id) {
  if (!confirm('Remove this affiliate from the roster?')) return;
  try {
    await fetchAPI(`${API.roster}/${id}`, { method: 'DELETE' });
    state.roster         = state.roster.filter(r => r.id !== id);
    state.activeRosterId = null;
    closeDetailPanel();
    renderRosterPage();
    showToast('Affiliate removed');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// ROSTER — MANUAL ADD MODAL
// ============================================================

function openAddOutreachModal() {
  const statuses = [
    ['drafted',        'In Drafts'],
    ['sent',           'Sent'],
    ['replied',        'Replied'],
    ['counter_offered','Countered'],
    ['signed',         'Signed']
  ];
  const html = `
    <form id="modal-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Handle *</label>
          <input name="handle" placeholder="@username" required>
        </div>
        <div class="form-group">
          <label>Name</label>
          <input name="name" placeholder="Creator name">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" placeholder="creator@email.com">
        </div>
        <div class="form-group">
          <label>Followers</label>
          <input type="number" name="follower_count" placeholder="e.g. 85000">
        </div>
        <div class="form-group">
          <label>Profile URL</label>
          <input name="profile_url" placeholder="https://tiktok.com/@username">
        </div>
        <div class="form-group">
          <label>Niche / Category</label>
          <input name="product_category" placeholder="e.g. Skincare, Lifestyle">
        </div>
        <div class="form-group">
          <label>30-day GMV ($)</label>
          <input type="number" step="0.01" name="last_30d_gmv" placeholder="e.g. 4200">
        </div>
        <div class="form-group">
          <label>Pipeline Status</label>
          <select name="status">${selectOpts(statuses, 'drafted')}</select>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add to Pipeline</button>
      </div>
    </form>`;

  openModal('Add Creator', html, async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(API.outreach, { method: 'POST', body: JSON.stringify(data) });
      state.outreach.unshift(rec);
      closeModal();
      renderPipelineView();
      showToast('Creator added to pipeline!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function openAddRosterModal() {
  const defaultType = state.rosterTab === 'free' ? 'free' : 'paid';
  const platforms = [['TikTok','TikTok'],['Instagram','Instagram'],['YouTube','YouTube']];
  const tiers     = [['','— none —'],['A','A'],['B','B'],['C','C']];
  const statuses  = [['active','Active'],['onboarding','Onboarding'],['watching','Watching'],['paused','Paused'],['inactive','Inactive']];
  const html = `
    <form id="modal-form">
      <div class="form-group" style="margin-bottom:16px">
        <label>Affiliate Type</label>
        <div class="type-toggle-row">
          <label class="type-toggle-opt">
            <input type="radio" name="affiliate_type" value="paid" ${defaultType === 'paid' ? 'checked' : ''}
              onchange="document.getElementById('modal-deal-fields').style.display='grid'">
            <span>Paid — fixed deal + commission</span>
          </label>
          <label class="type-toggle-opt">
            <input type="radio" name="affiliate_type" value="free" ${defaultType === 'free' ? 'checked' : ''}
              onchange="document.getElementById('modal-deal-fields').style.display='none'">
            <span>Free — commission only</span>
          </label>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Handle *</label>
          <input name="handle" placeholder="username" required>
        </div>
        <div class="form-group">
          <label>Name</label>
          <input name="name" placeholder="Creator name">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status" id="add-roster-status" onchange="toggleDealFields(this.value)">
            ${selectOpts(statuses, 'active')}
          </select>
        </div>
        <div class="form-group">
          <label>Platform</label>
          <select name="platform">${selectOpts(platforms, 'TikTok')}</select>
        </div>
        <div class="form-group">
          <label>Niche</label>
          <input name="niche" placeholder="e.g. Skincare">
        </div>
        <div class="form-group">
          <label>Followers</label>
          <input type="number" name="followers" placeholder="e.g. 50000">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" placeholder="creator@email.com">
        </div>
        <div class="form-group">
          <label>Grade</label>
          <select name="tier">${selectOpts(tiers, '')}</select>
        </div>
      </div>
      <div id="modal-deal-fields" style="display:${defaultType === 'free' ? 'none' : 'grid'};grid-template-columns:1fr 1fr;gap:12px 16px">
        <div style="grid-column:1/-1;font-size:11px;color:var(--text-muted);margin:4px 0 0;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Deal Details</div>
        <div class="form-group">
          <label># Videos</label>
          <input type="number" name="video_count" id="modal-video-count" placeholder="e.g. 5">
        </div>
        <div class="form-group">
          <label>Total Deal ($)</label>
          <input type="number" name="deal_total" id="modal-deal-total" placeholder="e.g. 1000">
        </div>
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" name="start_date">
        </div>
        <div class="form-group">
          <label>Commission Rate (%)</label>
          <input type="number" step="0.1" name="commission_rate" value="20">
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add to Roster</button>
      </div>
    </form>`;
  openModal('Add to Roster', html, async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    // Convert total deal → per_vid_rate
    const dealTotal  = parseFloat(data.deal_total);
    const videoCount = parseInt(data.video_count);
    delete data.deal_total;
    if (!isNaN(dealTotal) && !isNaN(videoCount) && videoCount > 0) {
      data.per_vid_rate = dealTotal / videoCount;
    }
    try {
      const rec = await fetchAPI(API.roster, { method: 'POST', body: JSON.stringify(data) });
      state.roster.unshift(rec);
      updateReviewBadge();
      closeModal(); renderRosterPage(); showToast('Added to roster!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function toggleDealFields(status) {
  const el = document.getElementById('deal-fields');
  if (el) el.style.display = status === 'watching' ? 'none' : '';
}

// ============================================================
// DICTATION (Web Speech API)
// ============================================================

let _dictation     = null;
let _dictationMeta = null; // { rosterId, taId, dbField }

function toggleDictation(rosterId, taId, btnId, dbField) {
  if (_dictation && _dictationMeta?.taId === taId) {
    stopDictation();
  } else {
    if (_dictation) stopDictation();
    startDictation(rosterId, taId, btnId, dbField);
  }
}

function startDictation(rosterId, taId, btnId, dbField) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Voice dictation requires Chrome or Edge', 'error'); return; }

  const ta  = document.getElementById(taId);
  const btn = document.getElementById(btnId);
  if (!ta || !btn) return;

  _dictationMeta = { rosterId, taId, dbField };
  _dictation     = new SR();
  _dictation.continuous     = true;
  _dictation.interimResults = true;
  _dictation.lang           = 'en-US';

  let committed = ta.value;

  _dictation.onstart = () => {
    btn.classList.add('recording');
    btn.innerHTML = '<span>⏹</span> Stop';
  };

  _dictation.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) committed += (committed ? ' ' : '') + e.results[i][0].transcript;
      else                       interim   += e.results[i][0].transcript;
    }
    ta.value = committed + (interim ? ' ' + interim : '');
  };

  _dictation.onend = () => {
    if (btn) { btn.classList.remove('recording'); btn.innerHTML = '<span>🎤</span> Dictate'; }
    if (ta && _dictationMeta) saveRosterField(_dictationMeta.rosterId, _dictationMeta.dbField, ta.value.trim());
    _dictation     = null;
    _dictationMeta = null;
  };

  _dictation.start();
}

function stopDictation() {
  if (_dictation) { try { _dictation.stop(); } catch(_) {} }
}

// ============================================================
// SCRIPT GENERATOR
// ============================================================

// ============================================================
// CONTENT LAB
// ============================================================

async function loadScripts() {
  state.scripts = await fetchAPI(`${API.generate}/scripts`);
  state.scriptsLoaded = true;
}

function switchContentLabTab(tab) {
  state.contentLabTab = tab;
  if (tab === 'library' && !state.scriptsLoaded) {
    const body = document.getElementById('cl-body');
    if (body) body.innerHTML = `<div class="cl-loading"><div class="spinner"></div><p>Loading saved scripts...</p></div>`;
    loadScripts().then(() => renderScriptsPage());
    return;
  }
  renderScriptsPage();
}

function renderScriptsPage() {
  const libCount = state.scripts.length;
  const blcCount = state.roster.reduce((s, r) => s + (Array.isArray(r.blc_videos) ? r.blc_videos.length : 0), 0);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Content Lab</h1>
        <p class="page-subtitle">Generate, save, and manage all your affiliate content</p>
      </div>
    </div>

    <div class="cl-tabs">
      <button class="cl-tab ${state.contentLabTab === 'generator' ? 'active' : ''}" onclick="switchContentLabTab('generator')">Script Generator</button>
      <button class="cl-tab ${state.contentLabTab === 'library'   ? 'active' : ''}" onclick="switchContentLabTab('library')">Saved Scripts${libCount > 0 ? ` <span class="cl-tab-count">${libCount}</span>` : ''}</button>
      <button class="cl-tab ${state.contentLabTab === 'videos'    ? 'active' : ''}" onclick="switchContentLabTab('videos')">BLC Videos${blcCount > 0 ? ` <span class="cl-tab-count">${blcCount}</span>` : ''}</button>
    </div>

    <div id="cl-body">
      ${renderContentLabTab()}
    </div>`;
}

function renderContentLabTab() {
  switch (state.contentLabTab) {
    case 'library': return renderLibraryTab();
    case 'videos':  return renderBLCVideosTab();
    default:        return renderGeneratorTab();
  }
}

function renderGeneratorTab() {
  return `
    <div class="generator-layout">
      <div class="generator-form-panel">
        <div class="panel">
          <h3 class="panel-title">Script Settings</h3>

          <div class="form-group">
            <label>Select Creator *</label>
            <select id="script-creator" onchange="updatePreview()">
              <option value="">— Choose a creator —</option>
              ${state.roster.map(c =>
                `<option value="${c.id}">${platformIcon(c.platform)} @${esc(c.handle)}${c.niche ? ' · ' + esc(c.niche) : ''}${c.tier ? ' · ' + c.tier : ''}</option>`
              ).join('')}
            </select>
          </div>

          <div id="script-preview" class="creator-preview hidden"></div>

          <div class="form-group">
            <label>Pain point focus</label>
            <select id="script-pain-point">
              <option value="Ingrown hairs">Ingrown hairs</option>
              <option value="Discoloration">Discoloration / dark spots</option>
              <option value="Irritation and redness">Irritation and redness</option>
              <option value="All three equally">All three equally</option>
            </select>
          </div>

          <div class="form-group">
            <label>Entry point</label>
            <select id="script-entry-point">
              <option value="Pain point">Pain point — lead with the problem</option>
              <option value="Dream outcome">Dream outcome — lead with the result</option>
              <option value="Customer identity">Customer identity — lead with who she is</option>
            </select>
          </div>

          <div class="form-group">
            <label>Creator's personal experience <span style="color:var(--text-muted);font-weight:400">(1–2 sentences)</span></label>
            <textarea id="script-experience" class="dp-textarea" rows="3"
              placeholder="e.g. I used to always wear a coverup at the beach because I had ingrowns and dark spots all along my bikini line…"></textarea>
          </div>

          <div class="form-group">
            <label>Filming location</label>
            <select id="script-location">
              <option value="Beach or pool">Beach or pool</option>
              <option value="Home" selected>Home</option>
              <option value="Studio">Studio</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="form-group">
            <label>Script length</label>
            <select id="script-length">
              <option value="short">Short — under 30 sec</option>
              <option value="medium" selected>Medium — 30–60 sec</option>
              <option value="long">Long — 60–90 sec</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mention specific ingredients?</label>
            <select id="script-ingredients">
              <option value="Yes, name them">Yes — name the ingredients</option>
              <option value="Keep it simple">Keep it simple — benefits only</option>
            </select>
          </div>

          <button class="btn btn-primary btn-full" id="script-btn" onclick="generateScript()">
            Generate Script
          </button>
          ${state.roster.length === 0 ? `<div class="info-box" style="margin-top:16px">Add creators to your Roster first.</div>` : ''}
        </div>
      </div>

      <div class="generator-output-panel">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Generated Script</h3>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="cl-saved-badge hidden" id="cl-saved-badge">✓ Saved to Library</span>
              <button class="btn btn-secondary btn-sm hidden" id="copy-script-btn" onclick="copyOutput('script-output')">Copy</button>
            </div>
          </div>
          <div id="script-output" class="output-area">
            <div class="output-placeholder">
              <div class="output-icon">🎬</div>
              <p>Select a creator and click Generate to create a personalized video script</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderLibraryTab() {
  if (!state.scriptsLoaded) {
    return `<div class="cl-loading"><div class="spinner"></div><p>Loading saved scripts...</p></div>`;
  }
  if (state.scripts.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">📄</div>
      <h3>No scripts yet</h3>
      <p>Generated scripts are automatically saved here</p>
      <button class="btn btn-primary" onclick="switchContentLabTab('generator')">Generate a Script</button>
    </div>`;
  }

  const creators = [...new Set(state.scripts.map(s => s.creator_handle))].sort();

  return `
    <div class="cl-library">
      <div class="cl-library-toolbar">
        <select id="cl-filter-creator" onchange="filterLibrary()" class="cl-filter-select">
          <option value="">All creators (${state.scripts.length})</option>
          ${creators.map(h => `<option value="${h}">@${esc(h)}</option>`).join('')}
        </select>
      </div>
      <div id="cl-scripts-list">
        ${state.scripts.map(s => scriptCardHTML(s)).join('')}
      </div>
    </div>`;
}

function scriptCardHTML(s) {
  const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const preview = s.content.replace(/[#*\-_`]/g, '').replace(/\n/g, ' ').slice(0, 160).trim();
  return `
    <div class="script-card" id="sc-${s.id}">
      <div class="script-card-header" onclick="toggleScriptCard('${s.id}')">
        <div class="script-card-meta">
          <span class="script-card-handle">@${esc(s.creator_handle)}</span>
          <span class="script-card-dot">·</span>
          <span class="script-card-product">${esc(s.product_focus)}</span>
          <span class="script-card-dot">·</span>
          <span class="script-card-length">${esc(s.script_length)}</span>
        </div>
        <div class="script-card-actions">
          <span class="script-card-date">${date}</span>
          <button class="rs-remove-btn" onclick="deleteScript(event,'${s.id}')" title="Delete">✕</button>
          <span class="script-card-chevron" id="chev-${s.id}">›</span>
        </div>
      </div>
      <div class="script-card-preview">${esc(preview)}…</div>
      <div class="script-card-body hidden" id="scb-${s.id}">
        <div class="output-content">${renderMarkdown(s.content)}</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="navigator.clipboard.writeText(document.getElementById('scb-${s.id}').innerText)">Copy Script</button>
      </div>
    </div>`;
}

function toggleScriptCard(id) {
  const body  = document.getElementById(`scb-${id}`);
  const chev  = document.getElementById(`chev-${id}`);
  const card  = document.getElementById(`sc-${id}`);
  const open  = !body.classList.contains('hidden');
  body.classList.toggle('hidden', open);
  card.classList.toggle('expanded', !open);
  if (chev) chev.textContent = open ? '›' : '⌄';
}

function filterLibrary() {
  const handle = document.getElementById('cl-filter-creator')?.value || '';
  const filtered = handle ? state.scripts.filter(s => s.creator_handle === handle) : state.scripts;
  const list = document.getElementById('cl-scripts-list');
  if (list) list.innerHTML = filtered.map(s => scriptCardHTML(s)).join('');
}

async function deleteScript(e, id) {
  e.stopPropagation();
  try {
    await fetchAPI(`${API.generate}/scripts/${id}`, { method: 'DELETE' });
    state.scripts = state.scripts.filter(s => s.id !== id);
    const card = document.getElementById(`sc-${id}`);
    if (card) card.remove();
    showToast('Script deleted');
    // update tab count
    document.querySelectorAll('.cl-tab').forEach((btn, i) => {
      if (i === 1) btn.innerHTML = `Saved Scripts${state.scripts.length > 0 ? ` <span class="cl-tab-count">${state.scripts.length}</span>` : ''}`;
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderBLCVideosTab() {
  const creatorsWithVideos = state.roster.filter(r =>
    Array.isArray(r.blc_videos) && r.blc_videos.length > 0
  );

  if (creatorsWithVideos.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">🎵</div>
      <h3>No BLC videos yet</h3>
      <p>Add them through each creator's profile in the Roster</p>
      <button class="btn btn-primary" onclick="navigate('roster')">Go to Roster</button>
    </div>`;
  }

  return `
    <div class="blc-videos-all">
      <div class="blc-videos-summary">
        ${creatorsWithVideos.length} creator${creatorsWithVideos.length !== 1 ? 's' : ''} ·
        ${creatorsWithVideos.reduce((s, r) => s + r.blc_videos.length, 0)} total videos
      </div>
      ${creatorsWithVideos.map(r => `
        <div class="blc-creator-section">
          <div class="blc-creator-header">
            <span class="blc-creator-handle">@${esc(r.handle)}</span>
            ${r.tier ? `<span class="grade-badge grade-${r.tier}">${r.tier}</span>` : ''}
            <span class="blc-video-count">${r.blc_videos.length} video${r.blc_videos.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="blc-videos-grid">
            ${r.blc_videos.map(url => `
              <a href="${esc(url)}" target="_blank" class="blc-video-link">
                <span class="blc-video-icon">🎵</span>
                <span class="blc-video-url">${esc(url.replace('https://www.tiktok.com/', '').replace('https://tiktok.com/', ''))}</span>
              </a>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

async function generateScript() {
  const creatorId          = document.getElementById('script-creator').value;
  const painPoint          = document.getElementById('script-pain-point')?.value;
  const entryPoint         = document.getElementById('script-entry-point')?.value;
  const personalExperience = document.getElementById('script-experience')?.value?.trim();
  const filmingLocation    = document.getElementById('script-location')?.value;
  const scriptLength       = document.getElementById('script-length').value;
  const mentionIngredients = document.getElementById('script-ingredients')?.value;

  if (!creatorId) { showToast('Please select a creator', 'error'); return; }

  const btn    = document.getElementById('script-btn');
  const output = document.getElementById('script-output');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  output.innerHTML = `<div class="generating-indicator"><div class="spinner"></div><p>Writing your personalized script...</p></div>`;

  try {
    const res = await fetchAPI(`${API.generate}/script`, {
      method: 'POST',
      body: JSON.stringify({ creatorId, painPoint, entryPoint, personalExperience, filmingLocation, scriptLength, mentionIngredients })
    });
    output.innerHTML = `<div class="output-content">${renderMarkdown(res.script)}</div>`;
    document.getElementById('copy-script-btn').classList.remove('hidden');

    // Show saved badge + add to local state
    const badge = document.getElementById('cl-saved-badge');
    if (badge) badge.classList.remove('hidden');
    if (res.scriptId) {
      const creator = state.roster.find(c => c.id === creatorId);
      state.scripts.unshift({
        id:             res.scriptId,
        creator_id:     creatorId,
        creator_handle: creator?.handle || '',
        product_focus:  `BBL Serum — ${painPoint || 'Ingrowns'}`,
        script_length:  { short: 'Short', medium: 'Medium', long: 'Long' }[scriptLength] || 'Medium',
        content:        res.script,
        created_at:     new Date().toISOString()
      });
      state.scriptsLoaded = true;
    }
    showToast('Script generated and saved!');
  } catch (err) {
    output.innerHTML = `<div class="output-error">⚠️ ${esc(err.message)}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Script';
  }
}

function updatePreview() {
  const id      = document.getElementById('script-creator').value;
  const preview = document.getElementById('script-preview');
  if (!id) { preview.classList.add('hidden'); return; }
  const c = state.roster.find(x => x.id === id);
  if (!c) return;

  const topCount = Array.isArray(c.top_videos) ? c.top_videos.length : 0;
  const blcCount = Array.isArray(c.blc_videos) ? c.blc_videos.length : 0;

  preview.classList.remove('hidden');
  preview.innerHTML = `
    <div class="creator-preview-card">
      <div class="preview-row">
        <span class="preview-label">Handle</span>
        <span class="preview-value">@${esc(c.handle)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">Platform</span>
        <span class="preview-value">${platformIcon(c.platform)} ${esc(c.platform)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">Niche</span>
        <span class="preview-value">${esc(c.niche) || '—'}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">Followers</span>
        <span class="preview-value">${fmtNum(c.followers)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">Top Videos</span>
        <span class="preview-value">${topCount} on file</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">BLC Videos</span>
        <span class="preview-value">${blcCount} on file</span>
      </div>
      ${c.creator_assessment ? `
        <div class="preview-row preview-row-full">
          <span class="preview-label">Assessment</span>
          <span class="preview-value">${esc(c.creator_assessment)}</span>
        </div>` : ''}
    </div>`;
}

function renderMarkdown(text) {
  return text
    .replace(/^---$/gm, '<hr>')
    .replace(/^## (.*?)$/gm, '</p><h2>$1</h2><p>')
    .replace(/^### (.*?)$/gm, '</p><h3>$1</h3><p>')
    .replace(/^# (.*?)$/gm, '</p><h1>$1</h1><p>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function copyOutput(id) {
  const el   = document.getElementById(id);
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Copy failed — try selecting and copying manually', 'error'));
}

// ============================================================
// FOR REVIEW
// ============================================================

function reviewPendingPayments() {
  // Only show payment due AFTER serum has been shipped (contract confirmed)
  return state.roster.filter(r =>
    r.status === 'onboarding' && r.serum_shipped && !r.invoice_received && r.per_vid_rate && r.video_count
  );
}

function reviewPendingSerum() {
  return state.roster.filter(r => r.status === 'onboarding' && !r.serum_shipped);
}

function reviewPendingAssets() {
  // Only surfaces after serum is shipped (so posting schedule dates are real)
  return state.roster.filter(r =>
    r.status === 'onboarding' &&
    r.serum_shipped &&
    !(r.brief_sent && r.creative_angles_sent && r.posting_schedule_confirmed)
  );
}

function reviewCounterRejected() {
  return state.outreach.filter(r => r.status === 'counter_rejected');
}

function reviewNeedsCreativeAssets() {
  return state.roster.filter(r => (r.creative_assets_needed || 0) > 0);
}

function reviewCount() {
  return reviewPendingPayments().length + reviewPendingSerum().length + reviewPendingAssets().length + reviewCounterRejected().length + reviewNeedsCreativeAssets().length;
}

function updateReviewBadge() {
  const count = reviewCount();
  const badge = document.getElementById('review-badge');
  if (!badge) return;
  badge.textContent   = count;
  badge.style.display = count > 0 ? '' : 'none';
}

function updateRepliedBadge() {
  const count = state.outreach.filter(r => r.status === 'replied').length;
  const badge = document.getElementById('replied-badge');
  if (!badge) return;
  badge.textContent   = count;
  badge.style.display = count > 0 ? '' : 'none';
}

// Calculate posting schedule: 2 videos/week starting from serum arrival (+10 days)
function calcPostingSchedule(serumShipDate, videoCount) {
  if (!serumShipDate || !videoCount) return [];
  const arrival = new Date(serumShipDate + 'T00:00:00');
  arrival.setDate(arrival.getDate() + 10);
  const dates = [];
  for (let i = 0; i < parseInt(videoCount); i++) {
    const d = new Date(arrival);
    // 2 per week: video 0 on arrival, video 1 on +3d, video 2 on +7d, video 3 on +10d …
    const offset = Math.floor(i / 2) * 7 + (i % 2) * 3;
    d.setDate(d.getDate() + offset);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function renderForReviewPage() {
  const payments        = reviewPendingPayments();
  const serum           = reviewPendingSerum();
  const assets          = reviewPendingAssets();
  const rejected        = reviewCounterRejected();
  const creativeNeeded  = reviewNeedsCreativeAssets();
  const total           = payments.length + serum.length + assets.length + rejected.length + creativeNeeded.length;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">For Review</h1>
        <p class="page-subtitle">${total === 0
          ? 'All caught up — nothing needs your attention'
          : `${total} item${total !== 1 ? 's' : ''} need${total === 1 ? 's' : ''} your attention`}</p>
      </div>
    </div>

    <!-- Serum Shipment Needed (step 1 — always first) -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">📦 Serum Shipment Needed</span>
        ${serum.length > 0 ? `<span class="review-section-count">${serum.length}</span>` : ''}
      </div>
      ${serum.length === 0
        ? `<div class="review-empty">All serums shipped ✓</div>`
        : serum.map(r => `
            <div class="review-card">
              <div class="review-card-main">
                <div class="review-card-name">${esc(r.name || r.handle)}</div>
                <div class="review-card-sub">@${esc(r.handle)} · ${r.video_count || '?'} video deal · BBL Serum needed</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="markRosterField('${r.id}', 'serum_shipped', true)">
                Mark Shipped
              </button>
            </div>`
          ).join('')
      }
    </div>

    <!-- Payments Due (step 2 — only after serum shipped) -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">💰 Payments Due</span>
        ${payments.length > 0 ? `<span class="review-section-count">${payments.length}</span>` : ''}
      </div>
      ${payments.length === 0
        ? `<div class="review-empty">${serum.length > 0 ? 'Awaiting serum shipment before payment' : 'No pending payments — all clear ✓'}</div>`
        : payments.map(r => {
            const deal = parseFloat(r.per_vid_rate) * parseInt(r.video_count);
            const half = deal / 2;
            return `
            <div class="review-card review-card-column">
              <div class="review-card-row">
                <div class="review-card-main">
                  <div class="review-card-name">${esc(r.name || r.handle)}</div>
                  <div class="review-card-sub">@${esc(r.handle)} · ${r.video_count} video deal · ${fmt$(r.per_vid_rate)}/vid</div>
                </div>
                <div class="review-card-amount">
                  <div class="review-amount-value">${fmt$(half)}</div>
                  <div class="review-amount-hint">50% deposit</div>
                </div>
              </div>
              <div class="review-card-actions">
                <button class="btn btn-primary btn-sm" onclick="markRosterField('${r.id}', 'invoice_received', true)">
                  Mark 50% Paid
                </button>
              </div>
            </div>`;
          }).join('')
      }
    </div>

    <!-- Creative Assets Needed -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">🎬 Creative Assets Needed</span>
        ${assets.length > 0 ? `<span class="review-section-count">${assets.length}</span>` : ''}
      </div>
      ${assets.length === 0
        ? `<div class="review-empty">${serum.length > 0 ? 'Waiting on serum shipments before scheduling' : 'All creative assets sent ✓'}</div>`
        : assets.map(r => {
            const schedule = calcPostingSchedule(r.serum_ship_date, r.video_count);
            const arrivalDate = r.serum_ship_date
              ? (() => { const d = new Date(r.serum_ship_date + 'T00:00:00'); d.setDate(d.getDate()+10); return fmtDateShort(d.toISOString().split('T')[0]); })()
              : null;
            return `
            <div class="review-card review-card-column">
              <div class="review-card-row">
                <div class="review-card-main">
                  <div class="review-card-name">${esc(r.name || r.handle)}</div>
                  <div class="review-card-sub">@${esc(r.handle)} · ${r.video_count} video deal${arrivalDate ? ` · Serum arrives ~${arrivalDate}` : ''}</div>
                </div>
              </div>
              ${schedule.length > 0 ? `
              <div class="review-schedule">
                <div class="review-schedule-label">Auto-generated posting schedule (2/week)</div>
                <div class="review-schedule-dates">
                  ${schedule.map((d, i) => `<span class="review-schedule-chip">Vid ${i+1}: ${fmtDateShort(d)}</span>`).join('')}
                </div>
              </div>` : ''}
              <div class="review-checklist">
                <label class="review-check-item ${r.brief_sent ? 'review-check-done' : ''}">
                  <input type="checkbox" ${r.brief_sent ? 'checked' : ''}
                    onchange="markRosterField('${r.id}', 'brief_sent', this.checked)">
                  Content brief sent
                </label>
                <label class="review-check-item ${r.creative_angles_sent ? 'review-check-done' : ''}">
                  <input type="checkbox" ${r.creative_angles_sent ? 'checked' : ''}
                    onchange="markRosterField('${r.id}', 'creative_angles_sent', this.checked)">
                  Creative angles sent (${r.video_count || '?'} angles)
                </label>
                <label class="review-check-item ${r.posting_schedule_confirmed ? 'review-check-done' : ''}">
                  <input type="checkbox" ${r.posting_schedule_confirmed ? 'checked' : ''}
                    onchange="markRosterField('${r.id}', 'posting_schedule_confirmed', this.checked)">
                  Posting schedule confirmed
                </label>
              </div>
            </div>`;
          }).join('')
      }
    </div>

    <!-- Creative Assets to Send -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">🎨 Creative Assets to Send</span>
        ${creativeNeeded.length > 0 ? `<span class="review-section-count">${creativeNeeded.length}</span>` : ''}
      </div>
      ${creativeNeeded.length === 0
        ? `<div class="review-empty">No creative assets pending ✓</div>`
        : creativeNeeded.map(r => `
            <div class="review-card">
              <div class="review-card-main">
                <div class="review-card-name">${esc(r.name || r.handle)}</div>
                <div class="review-card-sub">@${esc(r.handle)}${r.video_count ? ` · ${r.video_count} video deal` : ''} · <strong>${r.creative_assets_needed} asset${r.creative_assets_needed !== 1 ? 's' : ''} needed</strong></div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="assets-badge assets-badge-lg">${r.creative_assets_needed}</span>
                <button class="btn btn-primary btn-sm" onclick="markCreativeAssetsSent('${r.id}')">
                  Mark Sent
                </button>
              </div>
            </div>`
          ).join('')
      }
    </div>

    <!-- Counter Rejected -->
    <div class="review-section review-section-rejected">
      <div class="review-section-header">
        <span class="review-section-title">🚫 Counter Rejected — Needs Response</span>
        ${rejected.length > 0 ? `<span class="review-section-count review-count-red">${rejected.length}</span>` : ''}
      </div>
      ${rejected.length === 0
        ? `<div class="review-empty">No rejected counters ✓</div>`
        : rejected.map(r => {
            const total = r.counter_offer_amount && r.video_count
              ? parseFloat(r.counter_offer_amount) * parseInt(r.video_count) : null;
            return `
            <div class="review-card review-card-rejected">
              <div class="review-card-row">
                <div class="review-card-main">
                  <div class="review-card-name">${esc(r.name || r.handle)}</div>
                  <div class="review-card-sub">@${esc(r.handle)}${total ? ` · Our counter was ${fmt$(total)} for ${r.video_count} videos` : ''}</div>
                </div>
                <div class="review-card-actions">
                  <button class="btn btn-secondary btn-sm" onclick="openOutreachFromReview('${r.id}')">Review Deal</button>
                  <button class="btn btn-sm review-archive-btn" onclick="archiveFromReview('${r.id}')">Archive</button>
                </div>
              </div>
            </div>`;
          }).join('')
      }
    </div>
  `;
}

function openOutreachFromReview(outreachId) {
  state.currentPage = 'outreach';
  state.selectedOutreachId = outreachId;
  navigate('outreach');
}

async function archiveFromReview(outreachId) {
  try {
    const rec = await fetchAPI(`${API.outreach}/${outreachId}`, {
      method: 'PUT', body: JSON.stringify({ status: 'archived' })
    });
    const i = state.outreach.findIndex(x => x.id === outreachId);
    if (i !== -1) state.outreach[i] = rec;
    updateReviewBadge();
    updateRepliedBadge();
    renderForReviewPage();
    showToast('Archived');
  } catch (err) { showToast(err.message, 'error'); }
}

async function markCreativeAssetsSent(rosterId) {
  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, {
      method: 'PUT',
      body: JSON.stringify({ creative_assets_needed: 0 })
    });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    updateReviewBadge();
    renderForReviewPage();
    showToast('Creative assets marked as sent ✓');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markRosterField(rosterId, field, value) {
  try {
    const r = state.roster.find(x => x.id === rosterId);
    const payload = { [field]: value };

    // When serum is marked shipped → auto-generate posting schedule
    if (field === 'serum_shipped' && value === true && r) {
      const today = new Date().toISOString().split('T')[0];
      payload.serum_ship_date = today;
      const dates = calcPostingSchedule(today, r.video_count);
      if (dates.length > 0) {
        payload.posting_schedule = dates.map((date, i) => ({
          date,
          note: `Video ${i + 1}`,
          link: '',
          posted: false
        }));
      }
    }

    const rec = await fetchAPI(`${API.roster}/${rosterId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    updateReviewBadge();
    if (rec.status === 'active' && state.roster[i]?.status === 'onboarding') {
      showToast(`${rec.name || rec.handle} graduated to Active! 🎉`);
    }
    if (field === 'serum_shipped' && value === true && payload.posting_schedule) {
      showToast(`Serum shipped — posting schedule auto-generated ✓`);
    }
    renderForReviewPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openRosterCreatorFromReview(id) {
  state.rosterTab = 'paid';
  state.activeRosterId = id;
  navigate('roster');
  setTimeout(() => openRosterDetail(id), 80);
}

// ============================================================
// FINANCE
// ============================================================

function financeAffiliates() {
  return state.roster.filter(r =>
    r.affiliate_type === 'paid' && (r.status === 'active' || r.status === 'onboarding')
  );
}

function financePaymentStatus(r) {
  if (r.payment_sent)      return { val: 'paid_full',       label: 'Paid in Full',    cls: 'fin-status-paid'    };
  if (r.invoice_received)  return { val: 'deposit_paid',    label: '50% Down Paid',   cls: 'fin-status-deposit' };
  return                          { val: 'pending_invoice', label: 'Pending Invoice', cls: 'fin-status-pending' };
}

function financeMonthlyRate(r) {
  return (parseFloat(r.per_vid_rate) || 0) * (parseInt(r.video_count) || 0);
}

function renderFinancePage() {
  const affiliates = financeAffiliates();

  // ── Stat calculations ──
  const totalCommitment = affiliates.reduce((s, r) => s + financeMonthlyRate(r), 0);
  const totalContracted = affiliates.reduce((s, r) => s + (parseInt(r.video_count) || 0), 0);
  const totalPosted     = affiliates.reduce((s, r) => s + (parseInt(r.content_submitted) || 0), 0);
  const totalGMV        = affiliates.reduce((s, r) => s + (parseFloat(r.gmv) || 0), 0);
  const avgDeal         = affiliates.length ? totalCommitment / affiliates.length : 0;

  const currentMonth    = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const paidThisMonth   = affiliates
    .filter(r => r.payment_sent && r.payment_sent_date?.startsWith(currentMonth))
    .reduce((s, r) => s + financeMonthlyRate(r) / 2, 0);

  const unpaidCount     = affiliates.filter(r => !r.payment_sent).length;
  const unpaidTotal     = affiliates
    .filter(r => !r.payment_sent)
    .reduce((s, r) => s + financeMonthlyRate(r) / 2, 0);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Finance</h1>
        <p class="page-subtitle">Live data from Roster & Pipeline · ${affiliates.length} paid affiliate${affiliates.length !== 1 ? 's' : ''}</p>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="fin-stats-grid">
      <div class="fin-stat-card">
        <div class="fin-stat-label">Monthly Commitment</div>
        <div class="fin-stat-value">${fmt$(totalCommitment)}</div>
        <div class="fin-stat-sub">${totalContracted} videos contracted</div>
      </div>
      <div class="fin-stat-card">
        <div class="fin-stat-label">Videos Posted</div>
        <div class="fin-stat-value fin-stat-neutral">${totalPosted}</div>
        <div class="fin-stat-sub">of ${totalContracted} contracted</div>
      </div>
      <div class="fin-stat-card">
        <div class="fin-stat-label">GMV Generated</div>
        <div class="fin-stat-value fin-stat-green">${fmt$(totalGMV)}</div>
        <div class="fin-stat-sub">${totalGMV > 0 && totalCommitment > 0 ? `${(totalGMV / totalCommitment).toFixed(1)}× return` : 'No GMV tracked yet'}</div>
      </div>
      <div class="fin-stat-card">
        <div class="fin-stat-label">Avg Deal Size</div>
        <div class="fin-stat-value fin-stat-neutral">${fmt$(avgDeal)}</div>
        <div class="fin-stat-sub">per affiliate</div>
      </div>
      <div class="fin-stat-card ${unpaidCount > 0 ? 'fin-stat-card-warn' : ''}">
        <div class="fin-stat-label">Payments Due</div>
        <div class="fin-stat-value fin-stat-yellow">${fmt$(unpaidTotal)}</div>
        <div class="fin-stat-sub">${unpaidCount} unpaid invoice${unpaidCount !== 1 ? 's' : ''}</div>
      </div>
      <div class="fin-stat-card">
        <div class="fin-stat-label">Paid Out This Month</div>
        <div class="fin-stat-value fin-stat-green">${fmt$(paidThisMonth)}</div>
        <div class="fin-stat-sub">${affiliates.filter(r => r.payment_sent && r.payment_sent_date?.startsWith(currentMonth)).length} affiliates paid</div>
      </div>
    </div>

    <!-- Affiliates Table -->
    <div class="fin-table-wrap">
      <table class="fin-table">
        <thead>
          <tr>
            <th>Creator</th>
            <th class="fin-th-num">Monthly Rate</th>
            <th class="fin-th-num">Videos</th>
            <th class="fin-th-num">Posted</th>
            <th class="fin-th-num">GMV</th>
            <th>Payment Status</th>
          </tr>
        </thead>
        <tbody>
          ${affiliates.length === 0 ? `
            <tr><td colspan="6" class="fin-empty">No paid affiliates yet — onboard your first creator to see data here.</td></tr>
          ` : affiliates.map(r => {
            const monthly = financeMonthlyRate(r);
            const deposit = monthly / 2;
            const ps      = financePaymentStatus(r);
            return `
            <tr class="fin-row">
              <td class="fin-td-creator">
                <div class="fin-creator-name">${esc(r.name || r.handle)}</div>
                <div class="fin-creator-handle">@${esc(r.handle)}</div>
              </td>
              <td class="fin-td-num">
                <div class="fin-amount">${monthly > 0 ? fmt$(monthly) : '—'}</div>
                ${r.per_vid_rate ? `<div class="fin-amount-sub">${fmt$(r.per_vid_rate)}/vid</div>` : ''}
              </td>
              <td class="fin-td-num">${r.video_count || '—'}</td>
              <td class="fin-td-num">${r.content_submitted || 0}</td>
              <td class="fin-td-num">
                ${r.gmv ? `<span class="fin-gmv">${fmt$(r.gmv)}</span>` : '<span class="fin-muted">—</span>'}
              </td>
              <td class="fin-td-status">
                <select class="fin-status-select fin-status-select-${ps.val}"
                  onchange="setFinancePaymentStatus('${r.id}', this.value); this.className='fin-status-select fin-status-select-'+this.value">
                  <option value="pending_invoice" ${ps.val === 'pending_invoice' ? 'selected' : ''}>Pending Invoice</option>
                  <option value="deposit_paid"    ${ps.val === 'deposit_paid'    ? 'selected' : ''}>50% Down Paid</option>
                  <option value="paid_full"       ${ps.val === 'paid_full'       ? 'selected' : ''}>Paid in Full</option>
                </select>
                ${ps.val === 'deposit_paid' ? `<div class="fin-deposit-hint">${fmt$(deposit)} remaining</div>` : ''}
                ${ps.val === 'paid_full' && r.payment_sent_date ? `<div class="fin-deposit-hint">Paid ${fmtDateShort(r.payment_sent_date)}</div>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function markRosterFieldFinance(rosterId, field, value) {
  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, {
      method: 'PUT',
      body: JSON.stringify({ [field]: value })
    });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    updateReviewBadge();
    renderFinancePage();
    showToast('Payment updated ✓');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function setFinancePaymentStatus(rosterId, val) {
  // Map dropdown value → boolean fields (clear date when reverting)
  const payloads = {
    pending_invoice: { payment_sent: false, invoice_received: false, payment_sent_date: null },
    deposit_paid:    { payment_sent: false, invoice_received: true,  payment_sent_date: null },
    paid_full:       { payment_sent: true,  invoice_received: true  }
  };
  const payload = payloads[val];
  if (!payload) return;
  const labels = { pending_invoice: 'Pending Invoice', deposit_paid: '50% Down Paid', paid_full: 'Paid in Full' };
  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    updateReviewBadge();
    renderFinancePage();
    showToast(`Payment status → ${labels[val]} ✓`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// SETTINGS
// ============================================================

async function openSettingsModal() {
  let current = {};
  try { current = await fetchAPI('/api/settings'); } catch (_) {}
  openModal('App Settings', `
    <div style="display:flex;flex-direction:column;gap:18px;">
      <div class="dp-form-group">
        <label>Discord Invite Link</label>
        <input type="text" class="dp-input" id="settings-discord"
          placeholder="https://discord.gg/..."
          value="${esc(current.discord_invite_link || '')}">
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Inserted into welcome emails when a creator is signed and onboarded.</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveSettings()">Save</button>
      </div>
    </div>
  `);
}

async function saveSettings() {
  const discord = document.getElementById('settings-discord')?.value?.trim() || '';
  try {
    await fetchAPI('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ discord_invite_link: discord })
    });
    closeModal();
    showToast('Settings saved ✓');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Regular nav items (not the roster group trigger — handled separately)
  document.querySelectorAll('.nav-item:not(.nav-group-trigger)').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });
  // Roster group trigger — navigate to roster (opens sub-menu automatically)
  const rosterTrigger = document.querySelector('.nav-group-trigger[data-page="roster"]');
  if (rosterTrigger) {
    rosterTrigger.addEventListener('click', e => { e.preventDefault(); navigate('roster'); });
  }
  // Sub-nav items — switch tab then navigate
  document.querySelectorAll('.nav-sub-item[data-roster-tab]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      state.rosterTab = el.dataset.rosterTab;
      navigate('roster');
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeDetailPanel();
      clearSelection();
    }
  });

  await loadOutreach().catch(err => console.error('Outreach load failed:', err));
  await Promise.all([
    loadRoster().catch(err => console.error('Roster load failed:', err)),
    checkTikTokStatus().catch(() => {})
  ]);

  const params = new URLSearchParams(window.location.search);
  const tiktokResult = params.get('tiktok');
  const startPage = params.get('page') || 'outreach';
  if (tiktokResult === 'connected') showToast('TikTok Shop connected!');
  if (tiktokResult === 'error')     showToast('TikTok connection failed. Try again.', 'error');
  if (tiktokResult) window.history.replaceState({}, '', '/');

  navigate(startPage);
});
