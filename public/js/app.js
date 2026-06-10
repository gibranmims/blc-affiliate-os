/* ============================================================
   BLC Affiliate OS — SPA JavaScript
   ============================================================ */

const API = {
  outreach:    '/api/outreach',
  roster:      '/api/roster',
  generate:    '/api/generate',
  outreachGen: '/api/outreach-gen',
  challenge:   '/api/challenge',
  support:     '/api/support',
  settings:    '/api/settings',
  tasks:       '/api/tasks',
  dailyTop2:   '/api/daily-top2',
  ideas:       '/api/ideas'
};

const STATUSES = [
  { key: 'drafted',          label: 'In Drafts',         color: 'gray'   },
  { key: 'sent',             label: 'Sent',               color: 'blue'   },
  { key: 'replied',          label: 'Replied',            color: 'teal'   },  // teal = positive engagement
  { key: 'counter_review',   label: 'Ctr. For Review',   color: 'purple' },
  { key: 'counter_approved', label: 'Ctr. Reviewed',      color: 'indigo' },
  { key: 'counter_offered',  label: 'Countered',          color: 'amber'  },  // amber = negotiation, not danger
  { key: 'counter_rejected', label: 'Creator Declined',    color: 'red'    },
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
  contentLabTab:      'creators',
  rosterMonth:        new Date().toISOString().slice(0, 7),
  contentLabCreatorId: null,
  rosterTab:          'paid',
  scriptMode:         'write',  // 'write' | 'teardown'
  challengers:        [],
  challengeFilter:    'all',    // 'all' | 'active' | 'completed' | 'disqualified' | 'refund_approved'
  selectedChallengerId: null,
  support:            [],
  customIssueTypes:   [],
  tasks:              [],
  dailyTop2:          [],
  ideas:              [],
  monthlyGoal:        0,
  monthlyRevenue:     0,
  bfTab:              'overview'
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
  const date = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  const date = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Returns a profile URL for a creator's handle based on platform
function creatorProfileUrl(handle, platform) {
  const h = (handle || '').replace(/^@/, '');
  const p = (platform || 'TikTok').toLowerCase();
  if (p === 'instagram') return `https://www.instagram.com/${h}/`;
  if (p === 'youtube')   return `https://www.youtube.com/@${h}`;
  return `https://www.tiktok.com/@${h}`;  // default TikTok
}

// Renders a consistent creator name+handle cell used in all tables
// name on top (bold), @handle below as a hyperlink to their profile
function creatorCell(name, handle, platform) {
  const url = creatorProfileUrl(handle, platform);
  const displayName = esc(name || handle);
  return `<div class="creator-cell">
    <div class="creator-name">${displayName}</div>
    <a class="creator-handle-link" href="${url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">@${esc(handle)}</a>
  </div>`;
}

// Month navigation helpers (YYYY-MM format)
function monthLabel(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function prevMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
}
function nextMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m, 1);
  return d.toISOString().slice(0, 7);
}
function switchRosterMonth(dir) {
  state.rosterMonth = dir === 'prev' ? prevMonth(state.rosterMonth) : nextMonth(state.rosterMonth);
  state.activeRosterId = null;
  closeDetailPanel();
  if (state.currentPage === 'finance') {
    renderFinancePage();
  } else if (state.currentPage === 'scripts' && state.contentLabTab === 'creators') {
    // Re-render the content lab creators section in place
    const body = document.getElementById('cl-body');
    if (body) body.innerHTML = renderCreatorsTab();
  } else {
    renderRosterPage();
  }
}

// Filter a video list to those posted in a given YYYY-MM month
function videosForMonth(videos, month) {
  if (!month) return videos;
  return videos.filter(v => v.posted_date && v.posted_date.startsWith(month));
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

// ============================================================
// ANIMATIONS
// ============================================================

function countUp(el, duration = 750) {
  const raw = el.textContent.trim();
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n <= 0) return;
  const start = performance.now();
  const isInt = Number.isInteger(n);
  el.textContent = isInt ? '0' : '0.0';
  (function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const val = n * ease;
    el.textContent = isInt ? String(Math.round(val)) : val.toFixed(1);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = raw; // restore original string (handles $2.5k etc)
  })(start);
}

function animateHomeStats() {
  // Count-up on QA stat numbers
  document.querySelectorAll('.home-qa-stat').forEach(el => countUp(el, 650));
  // Animate goal ring from empty → real offset
  const arc = document.querySelector('.home-goal-arc');
  if (arc) {
    const target = arc.dataset.target;
    arc.style.strokeDashoffset = arc.dataset.circ;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arc.style.strokeDashoffset = target;
    }));
  }
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
  const map    = { active: 'green', onboarding: 'purple', watching: 'blue', paused: 'yellow', inactive: 'gray', completed: 'orange' };
  const labels = { active: 'Active', onboarding: 'Onboarding', watching: 'Watching', paused: 'Paused', inactive: 'Inactive', completed: 'Completed' };
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

function normalizeBLCVideos(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(v => typeof v === 'string'
    ? { url: v, views: null, gmv: null, posted_date: null, title: '', transcript: '', thumbnail_url: null }
    : { url: v.url || '', views: v.views ?? null, gmv: v.gmv ?? null, posted_date: v.posted_date || null, title: v.title || '', transcript: v.transcript || '', thumbnail_url: v.thumbnail_url || null }
  );
}

const EVAL_QUESTIONS = [
  { key: 'product_fit',        label: 'Product Fit',
    q: 'Does she match the demographic or creator type that could sell BLC?',
    optLabels: ['Absolutely', 'Kinda', 'No'] },
  { key: 'on_camera_energy',   label: 'On Camera Energy',
    q: 'Authentic, good delivery, fast pace, believable?',
    optLabels: ['Engaging', 'Average', 'Boring'] },
  { key: 'production_quality', label: 'Production Quality',
    q: 'Good lighting, audio, native captions, understands viral video basics?',
    optLabels: ['High-Quality', 'Mid', 'Trash'] },
  { key: 'viral_track_record', label: 'Viral Track Record',
    q: 'How many TikTok Shop videos over 1M views?',
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
  document.querySelectorAll('.nav-item:not(.nav-cl-item)').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Clear Creative Lab active state, then re-apply if on scripts page
  document.querySelectorAll('.nav-cl-item').forEach(el => el.classList.remove('active'));
  if (page === 'scripts') updateScriptsNav();
  // Roster nav group — open on roster navigation, update sub-item active state
  if (page === 'roster') {
    const g = document.getElementById('nav-group-roster');
    if (g) g.classList.add('open');
    updateRosterSubNav();
  }
  const renderers = {
    home:         renderHomePage,
    tasks:        renderTasksPage,
    'daily-top2': renderDailyTop2Page,
    ideas:        renderIdeasPage,
    outreach:     renderOutreachPage,
    roster:       renderRosterPage,
    scripts:      renderScriptsPage,
    review:       renderForReviewPage,
    finance:         renderFinancePage,
    'brand-finance': renderBrandFinancePage,
    challenge:       renderChallengePage,
    support:         renderSupportPage
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
                <td>${creatorCell(r.name, r.handle, 'TikTok')}</td>
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
        <span>Affiliate Manager Evaluation</span>
        <span class="dp-acc-arrow">${state.dpAccordion.eval ? '▾' : '▸'}</span>
      </button>
      <div class="dp-acc-body${state.dpAccordion.eval ? '' : ' dp-acc-collapsed'}" id="dp-acc-eval">
      <div class="dp-section" style="border:none;padding-top:0">
      <div class="dp-section-label-row">
        <div class="dp-section-label">Affiliate Manager Evaluation</div>
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
          <div class="dp-eval-comp-who">Affiliate Manager</div>
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
          : `${founderEvalScore > evalScore ? '↑' : '↓'} ${Math.abs(founderEvalScore - evalScore)}pt gap — Founder rates ${founderEvalScore > evalScore ? 'higher' : 'lower'} than AM`}
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
            <div class="dp-rubric-label">${q.label}${differs ? ' <span class="dp-rubric-differs-dot" title="Differs from AM">●</span>' : ''}</div>
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
    ${r.status === 'counter_review' ? `

    <!-- === COUNTER REVIEW: AM proposal · Founder proposal · Final offer === -->

    <!-- 1. AM Counter Offer Proposal -->
    <div class="dp-section dp-proposal-card">
      <div class="dp-proposal-card-header">
        <div class="dp-section-label" style="margin-bottom:0">AM Counter Offer Proposal</div>
        ${(r.tier || autoTier) ? (() => {
          const g = gradeInfo(r.tier || autoTier);
          return g ? `<span class="dp-counter-suggested" style="font-size:12px">${gradeBadge(g.grade)} · Suggested ${fmt$(g.perVid)}/vid</span>` : '';
        })() : ''}
      </div>
      <div class="dp-counter-offer-fields" style="margin-top:12px">
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
              placeholder="e.g. 700"
              oninput="updateCounterCalc()">
          </div>
        </div>
      </div>
      <div class="dp-counter-per-vid" id="dp-counter-per-vid">${
        r.counter_offer_amount && r.video_count
          ? `<span class="dp-per-vid-calc">${fmt$(r.counter_offer_amount)}/vid avg</span>`
          : ''
      }</div>
    </div>

    <!-- 2. Founder Counter Offer Proposal -->
    <div class="dp-section dp-proposal-card dp-proposal-card-founder">
      <div class="dp-proposal-card-header">
        <div class="dp-section-label" style="margin-bottom:0">Founder Counter Offer Proposal</div>
        <span class="dp-founder-counter-hint">optional</span>
      </div>
      <div class="dp-founder-counter-fields" style="margin-top:12px">
        <div class="dp-form-group" style="flex:1">
          <label>Your rate / vid</label>
          <div class="dp-input-money">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" id="dp-founder-counter-rate"
              value="${r.founder_counter_amount || ''}"
              placeholder="${r.counter_offer_amount ? Math.round(r.counter_offer_amount) : 'e.g. 100'}"
              onblur="saveFounderCounter('${r.id}')">
          </div>
        </div>
        <div class="dp-form-group" style="flex:0 0 60px;text-align:center">
          <label>Videos</label>
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);padding:8px 0">${r.video_count || '—'}</div>
        </div>
        ${r.founder_counter_amount && r.video_count ? `
        <div class="dp-form-group" style="flex:0 0 80px;text-align:right">
          <label>Total</label>
          <div class="dp-rate-display dp-rate-counter" style="font-size:14px">${fmt$(parseFloat(r.founder_counter_amount) * parseInt(r.video_count))}</div>
        </div>` : ''}
      </div>
      ${(() => {
        if (!r.founder_counter_amount || !r.counter_offer_amount) return '';
        const diff = parseFloat(r.founder_counter_amount) - parseFloat(r.counter_offer_amount);
        if (diff === 0) return `<div class="dp-founder-counter-diff">= Same rate as AM (${fmt$(r.counter_offer_amount)}/vid)</div>`;
        const totalDiff = Math.abs(diff) * (parseInt(r.video_count) || 0);
        const cls = diff < 0 ? 'dp-counter-diff-down' : 'dp-counter-diff-up';
        const totalNote = r.video_count ? ` · ${fmt$(totalDiff)} ${diff < 0 ? 'less' : 'more'} on ${r.video_count} vids` : '';
        return `<div class="dp-founder-counter-diff ${cls}">${diff < 0 ? '↓' : '↑'} ${fmt$(Math.abs(diff))}/vid ${diff < 0 ? 'lower' : 'higher'} than AM${totalNote}</div>`;
      })()}
      <div class="dp-form-group" style="margin-top:10px">
        <label>Reasoning <span class="dp-label-hint">why you'd price differently</span></label>
        <textarea class="dp-input dp-textarea" id="dp-founder-counter-notes"
          placeholder="e.g. Strong energy but no viral track record yet — start lower and scale up after first batch..."
          onblur="saveFounderCounter('${r.id}')">${esc(r.founder_counter_notes || '')}</textarea>
      </div>
    </div>

    <!-- 3. Review Decision -->
    <div class="dp-section dp-final-counter-card">
      <div class="dp-section-label">Review Decision</div>
      <div class="dp-final-action-row" style="margin-top:12px">
        <button class="btn dp-generate-final-btn" id="dp-approve-am-btn"
          onclick="approveAtAMRate('${r.id}')">
          Approve AM Rate${r.counter_offer_amount ? ` (${fmt$(r.counter_offer_amount)}/vid)` : ''} →
        </button>
        <button class="btn dp-adjust-rate-btn" id="dp-approve-founder-btn"
          onclick="approveAtFounderRate('${r.id}')"
          ${!r.founder_counter_amount ? 'disabled' : ''}>
          ${r.founder_counter_amount ? `Adjust to ${fmt$(r.founder_counter_amount)}/vid →` : 'Set your rate above first'}
        </button>
      </div>
      <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">
        Both move to Ctr. Reviewed · Lu generates &amp; sends from there
      </div>
    </div>

    ` : r.status === 'counter_approved' ? `

    <!-- === COUNTER APPROVED: Lu generates & sends from here === -->
    <div class="dp-section dp-approved-counter-card">
      <div class="dp-approved-counter-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Counter Reviewed — Ready to Send
      </div>

      ${(() => {
        const finalRate  = r.final_counter_amount || r.counter_offer_amount;
        const isAdjusted = r.final_counter_amount && r.counter_offer_amount &&
          Math.round(parseFloat(r.final_counter_amount) * 100) !== Math.round(parseFloat(r.counter_offer_amount) * 100);
        const reasonText = r.final_counter_notes || (isAdjusted ? r.founder_counter_notes : null);
        if (!finalRate) return `<div style="color:var(--text-muted);font-size:13px;margin:8px 0">No rate on file — open the creator and go back to Ctr. For Review.</div>`;
        return `
        <div class="dp-approved-rate-display">
          <span class="dp-approved-per-vid">${fmt$(finalRate)}/vid</span>
          ${r.video_count ? `<span class="dp-approved-rate-meta">· ${r.video_count} videos · Total: <strong>${fmt$(parseFloat(finalRate) * parseInt(r.video_count))}</strong></span>` : ''}
        </div>
        ${isAdjusted
          ? `<div class="dp-approved-revised">↓ Founder adjusted from AM's ${fmt$(r.counter_offer_amount)}/vid — update the rate below before sending</div>`
          : `<div class="dp-approved-same">✓ Approved at AM's proposed rate</div>`}
        ${reasonText ? `
        <div class="dp-approved-notes">
          <div class="dp-approved-notes-label">Founder's reasoning</div>
          <div class="dp-approved-notes-text">${esc(reasonText)}</div>
        </div>` : ''}
        <button class="btn dp-generate-final-btn" id="dp-gen-final-counter-btn"
          onclick="generateFinalCounter('${r.id}')">
          Generate &amp; Send Counter →
        </button>
        <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px;">
          Signs email from Lu · moves to Counter Sent
        </div>`;
      })()}
    </div>

    ` : (r.tier || autoTier) ? `

    <!-- === OTHER STATUSES: standard counter offer accordion === -->
    <div class="dp-accordion">
      <button class="dp-acc-header ${state.dpAccordion.counter ? 'open' : ''}" onclick="toggleAccordion('counter')">
        <span>Counter Offer</span>
        <span class="dp-acc-arrow">${state.dpAccordion.counter ? '▾' : '▸'}</span>
      </button>
      <div class="dp-acc-body${state.dpAccordion.counter ? '' : ' dp-acc-collapsed'}" id="dp-acc-counter">
      <div class="dp-section dp-section-counter" style="border:none;padding-top:0">

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
        <button class="btn dp-counter-btn-draft" id="dp-send-counter-btn"
          onclick="sendCounterForReview('${r.id}')">
          Send Counter for Review
        </button>
      </div>

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
      <div class="dp-section-label${r.status === 'counter_review' && r.counter_feedback ? ' dp-section-label-rejected' : ''}">${r.status === 'counter_review' ? (r.counter_feedback ? '⚑ Counter Flagged — Pending Revision' : 'Counter Pending Review') : r.status === 'counter_approved' ? 'Counter Reviewed — Ready to Send' : 'Counter Sent'}</div>
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

    <!-- Creator Declined — decision panel (counter_rejected only) -->
    ${r.status === 'counter_rejected' ? (() => {
      const askedRate = r.asked_rate_custom ||
        (parseInt(r.video_count) >= 10 ? r.asked_rate_10 :
         parseInt(r.video_count) >= 5  ? r.asked_rate_5  : r.asked_rate_3) || null;
      const ourTotal = r.counter_offer_amount && r.video_count
        ? parseFloat(r.counter_offer_amount) * parseInt(r.video_count) : null;
      const theirTotal = askedRate && r.video_count
        ? parseFloat(askedRate) * parseInt(r.video_count) : null;
      return `
    <div class="dp-section dp-rejected-decision">
      <div class="dp-section-label dp-section-label-rejected">🚫 Creator Declined Our Counter</div>
      <div class="dp-rejected-recap">
        ${r.counter_offer_amount ? `
        <div class="dp-rejected-recap-row">
          <span class="dp-rejected-recap-label">Our offer</span>
          <span class="dp-rejected-recap-value">${fmt$(r.counter_offer_amount)}/vid${r.video_count ? ` · ${r.video_count} videos · <strong>${fmt$(ourTotal)} total</strong>` : ''}</span>
        </div>` : ''}
        ${askedRate ? `
        <div class="dp-rejected-recap-row dp-rejected-recap-row-ask">
          <span class="dp-rejected-recap-label">Their ask</span>
          <span class="dp-rejected-recap-value">${fmt$(askedRate)}/vid${r.video_count ? ` · ${r.video_count} videos · <strong>${fmt$(theirTotal)} total</strong>` : ''}</span>
        </div>` : ''}
      </div>
      <div class="dp-rejected-hint">How do you want to respond?</div>
      <div class="dp-rejected-actions">
        <button class="btn dp-rejected-btn-counter" onclick="reviseCounter('${r.id}')">
          ↩ Revise Our Offer
        </button>
        <button class="btn dp-rejected-btn-accept" onclick="toggleAcceptRatePanel('${r.id}')">
          ✓ Accept Their Rate
        </button>
        <button class="btn dp-rejected-btn-close" onclick="closeDeal('${r.id}')">
          ✕ Close Deal
        </button>
      </div>
      <div class="dp-accept-rate-panel" id="dp-accept-rate-panel-${r.id}" style="display:none">
        <div class="dp-accept-rate-label">Sign at rate ($/vid):</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          <div class="dp-input-money" style="width:140px">
            <span class="dp-money-prefix">$</span>
            <input type="number" class="dp-input" id="dp-accept-rate-input-${r.id}"
              value="${askedRate || ''}" placeholder="e.g. 150">
          </div>
          ${r.video_count ? `<span style="font-size:12px;color:var(--text-muted)">× ${r.video_count} videos</span>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px"
          onclick="signAtCreatorRate('${r.id}')">Confirm &amp; Sign →</button>
      </div>
    </div>`;
    })() : ''}

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

async function saveFounderCounter(id) {
  const rateEl  = document.getElementById('dp-founder-counter-rate');
  const notesEl = document.getElementById('dp-founder-counter-notes');
  const updates = {};
  if (rateEl)  updates.founder_counter_amount = rateEl.value !== '' ? parseFloat(rateEl.value) : null;
  if (notesEl) updates.founder_counter_notes  = notesEl.value.trim() || null;
  if (!Object.keys(updates).length) return;
  try {
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;
    renderDetailPanel();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approveAtAMRate(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  if (!r.counter_offer_amount) { showToast('No AM rate set — fill in the AM Counter Proposal first', 'error'); return; }
  const btn = document.getElementById('dp-approve-am-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Approving…'; }
  try {
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        final_counter_amount: r.counter_offer_amount,
        final_counter_notes:  null,
        status:               'counter_approved'
      })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;
    renderDetailPanel();
    renderOutreachPage();
    showToast('Approved at AM rate ✓ — Lu can now generate & send');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; }
  }
}

async function approveAtFounderRate(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  if (!r.founder_counter_amount) { showToast('Set your rate in the Founder proposal above first', 'error'); return; }
  const btn = document.getElementById('dp-approve-founder-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        final_counter_amount: r.founder_counter_amount,
        final_counter_notes:  r.founder_counter_notes || null,
        status:               'counter_approved'
      })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;
    renderDetailPanel();
    renderOutreachPage();
    showToast('Rate adjusted ✓ — Lu can see your reasoning and send');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; }
  }
}

async function generateFinalCounter(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;

  const perVid = r.final_counter_amount || r.counter_offer_amount;
  const videos = r.video_count;

  if (!perVid || isNaN(perVid)) { showToast('No rate on file — go back to Ctr. For Review', 'error'); return; }
  if (!videos || isNaN(videos)) { showToast('No video count set', 'error'); return; }

  const total = perVid * videos;

  const btn = document.getElementById('dp-gen-final-counter-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

  // Move to counter_offered with the already-saved final rate
  const saved = await fetchAPI(`${API.outreach}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      counter_offer_amount: perVid,
      status:               'counter_offered',
      ...counterFollowupPayload()
    })
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
        sender:               'Lu'
      })
    });
    await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ counter_offer_email: email })
    }).catch(() => null);
    const j = state.outreach.findIndex(x => x.id === id);
    if (j !== -1) state.outreach[j] = { ...state.outreach[j], counter_offer_email: email, status: 'counter_offered' };
    renderOutreachPage();
    renderDetailPanel();
    showToast('Counter message generated → moved to Counter Sent ✓');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Generate & Send Counter →'; }
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
          <span style="font-size:20px;flex-shrink:0;">📄</span>
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
  const isPaid   = state.rosterTab === 'paid';
  const allPaid  = state.roster.filter(r => r.affiliate_type !== 'free');
  const allFree  = state.roster.filter(r => r.affiliate_type === 'free');
  // For paid tab: filter by month (creators with no contract_month show in all months)
  const list = isPaid
    ? allPaid.filter(r => !r.contract_month || r.contract_month === state.rosterMonth)
    : allFree;
  const active  = list.filter(r => r.status === 'active').length;
  const totalGMV   = list.reduce((s, r) => s + (parseFloat(r.gmv) || 0), 0);
  const totalPosts = list.reduce((s, r) => s + (parseInt(r.content_submitted) || 0), 0);
  const paidCount  = allPaid.length;
  const freeCount  = allFree.length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = state.rosterMonth === currentMonth;

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

    ${isPaid ? `
    <div class="month-nav">
      <button class="month-nav-btn" onclick="switchRosterMonth('prev')">‹</button>
      <div class="month-nav-label">
        ${monthLabel(state.rosterMonth)}
        ${isCurrentMonth ? `<span class="month-nav-current-chip">Current</span>` : ''}
      </div>
      <button class="month-nav-btn" onclick="switchRosterMonth('next')">›</button>
    </div>
    ` : ''}

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
          <div class="empty-icon">${isPaid ? '📅' : '🔗'}</div>
          <h3>${isPaid ? `No contracts for ${monthLabel(state.rosterMonth)}` : 'No free affiliates yet'}</h3>
          <p>${isPaid ? 'Use "Renew Contract" on a completed creator to add them here, or add a new affiliate.' : 'Add commission-only affiliates manually'}</p>
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
                  ${creatorCell(r.name, r.handle, r.platform)}
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
  const blcVids  = normalizeBLCVideos(r.blc_videos).map(v => v.url);
  const schedule = Array.isArray(r.posting_schedule) ? r.posting_schedule : [];
  const startISO = r.start_date ? r.start_date.split('T')[0] : '';
  const endISO   = startISO ? (() => {
    const d = new Date(startISO + 'T12:00:00'); d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  })() : '';
  const total = (parseFloat(r.per_vid_rate) || 0) * (parseInt(r.video_count) || 0);
  const ROSTER_STATUSES = [['active','Active'],['onboarding','Onboarding'],['completed','Completed'],['watching','Watching'],['paused','Paused'],['inactive','Inactive']];

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

    <!-- Completion milestone -->
    ${r.status === 'active' ? `
    <div class="rs-complete-bar">
      <div class="rs-complete-bar-label">All videos delivered?</div>
      <div class="rs-complete-bar-hint">Once the creator confirms all videos are posted, mark them complete to flag the final 50% payment in For Review.</div>
      <button class="rs-complete-btn" onclick="markVideosComplete('${r.id}')">✓ Mark All Videos Complete</button>
    </div>
    ` : r.status === 'completed' ? `
    <div class="rs-complete-bar rs-complete-bar-done">
      <div class="rs-complete-bar-label">✓ Videos Complete — Final Payment Pending</div>
      <div class="rs-complete-bar-hint">Head to For Review to mark the final 50% payment as sent.</div>
    </div>
    ` : ''}

    <!-- Renew Contract (for active/completed paid creators) -->
    ${(r.status === 'active' || r.status === 'completed') && r.affiliate_type !== 'free' ? `
    <div class="rs-renew-bar">
      <div class="rs-renew-bar-label">Ready for another contract?</div>
      <div class="rs-renew-bar-hint">Clone this creator into a fresh contract for a new month — keeps their profile clean and history separate.</div>
      <button class="rs-renew-btn" onclick="openRenewContractModal('${r.id}')">↻ Renew Contract</button>
    </div>
    ` : ''}

    <!-- Remove -->
    <div class="dp-delete-zone">
      <button class="btn btn-danger-outline" onclick="deleteRosterFromPanel('${r.id}')">Remove from Roster</button>
    </div>
  `;
}

// ============================================================
// ROSTER — SAVE / CRUD
// ============================================================

async function markVideosComplete(id) {
  if (!confirm('Mark all videos as complete? This will flag the final 50% payment in For Review.')) return;
  try {
    const rec = await fetchAPI(`${API.roster}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' })
    });
    const i = state.roster.findIndex(x => x.id === id);
    if (i !== -1) state.roster[i] = rec;
    updateReviewBadge();
    renderRosterPage();
    showToast('Videos marked complete — final payment flagged in For Review ✓');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openRenewContractModal(id) {
  const r = state.roster.find(x => x.id === id);
  if (!r) return;
  const suggestedMonth = nextMonth(state.rosterMonth);
  const html = `
    <form id="modal-form">
      <p style="color:var(--text-muted);margin:0 0 16px;font-size:14px;">
        Creates a fresh contract for <strong>@${esc(r.handle)}</strong> in a new month.
        The original contract stays as-is.
      </p>
      <div class="form-grid">
        <div class="form-group">
          <label>Contract Month</label>
          <input type="month" name="contract_month" value="${suggestedMonth}" required>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="onboarding">Onboarding</option>
            <option value="active">Active</option>
          </select>
        </div>
        <div class="form-group">
          <label># Videos</label>
          <input type="number" name="video_count" value="${r.video_count || ''}">
        </div>
        <div class="form-group">
          <label>Total Deal ($)</label>
          <input type="number" name="deal_total" placeholder="e.g. 1000"
            value="${r.per_vid_rate && r.video_count ? (parseFloat(r.per_vid_rate) * parseInt(r.video_count)).toFixed(0) : ''}">
        </div>
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" name="start_date">
        </div>
        <div class="form-group">
          <label>Commission Rate (%)</label>
          <input type="number" step="0.1" name="commission_rate" value="${r.commission_rate || 20}">
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create New Contract</button>
      </div>
    </form>`;
  openModal(`Renew Contract — @${r.handle}`, html, async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    const dealTotal  = parseFloat(data.deal_total);
    const videoCount = parseInt(data.video_count);
    delete data.deal_total;
    if (!isNaN(dealTotal) && !isNaN(videoCount) && videoCount > 0) {
      data.per_vid_rate = dealTotal / videoCount;
    }
    // Carry forward key profile fields from original
    const newRec = {
      handle:           r.handle,
      name:             r.name,
      platform:         r.platform,
      niche:            r.niche,
      followers:        r.followers,
      email:            r.email,
      tier:             r.tier,
      affiliate_type:   r.affiliate_type || 'paid',
      content_style:    r.content_style,
      audience_demographics: r.audience_demographics,
      notes:            r.notes,
      // Reset per-contract fields
      content_submitted: 0,
      gmv:               0,
      payment_sent:      false,
      invoice_received:  false,
      serum_shipped:     false,
      brief_sent:        false,
      top_videos:        [],
      blc_videos:        [],
      posting_schedule:  [],
      ...data
    };
    try {
      const rec = await fetchAPI(API.roster, { method: 'POST', body: JSON.stringify(newRec) });
      state.roster.unshift(rec);
      // Navigate to the new month
      state.rosterMonth = data.contract_month;
      state.activeRosterId = rec.id;
      updateReviewBadge();
      closeModal();
      renderRosterPage();
      showToast(`New contract created for ${monthLabel(data.contract_month)} ✓`);
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function markFinalPaymentSent(rosterId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, {
      method: 'PUT',
      body: JSON.stringify({ payment_sent: true, payment_sent_date: today })
    });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    updateReviewBadge();
    renderForReviewPage();
    showToast('Final payment marked as sent ✓');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

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
function addBLCVideo(id) {
  const input = document.getElementById('rs-new-blc-url');
  const url   = input?.value?.trim();
  if (!url) return;
  const r = state.roster.find(x => x.id === id);
  if (!r) return;
  const existing = normalizeBLCVideos(r.blc_videos);
  const updated  = [...existing, { url, views: null, gmv: null, posted_date: null, title: '', transcript: '' }];
  input.value = '';
  r.blc_videos = updated;
  saveRosterField(id, 'blc_videos', updated);
  const list = document.getElementById('rs-blc-videos-list');
  if (list) {
    const idx = updated.length - 1;
    const div = document.createElement('div');
    div.className = 'rs-video-item';
    div.dataset.idx = idx;
    div.innerHTML = `<a href="${esc(url)}" target="_blank" class="rs-video-link" title="${esc(url)}">${esc(url)}</a><button class="rs-remove-btn" onclick="removeBLCVideo('${id}',${idx})" title="Remove">✕</button>`;
    list.appendChild(div);
  }
}
function removeBLCVideo(id, idx) {
  const r = state.roster.find(x => x.id === id);
  if (!r) return;
  const videos = normalizeBLCVideos(r.blc_videos).filter((_, i) => i !== idx);
  r.blc_videos = videos;
  saveRosterField(id, 'blc_videos', videos);
  const list = document.getElementById('rs-blc-videos-list');
  if (list) list.innerHTML = videos.map((v, i) => `<div class="rs-video-item" data-idx="${i}"><a href="${esc(v.url)}" target="_blank" class="rs-video-link" title="${esc(v.url)}">${esc(v.url)}</a><button class="rs-remove-btn" onclick="removeBLCVideo('${id}',${i})" title="Remove">✕</button></div>`).join('');
}

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
    // Tag with current month view (paid affiliates only)
    if (data.affiliate_type !== 'free') {
      data.contract_month = state.rosterMonth;
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
  updateScriptsNav();
  if (tab === 'library' && !state.scriptsLoaded) {
    const body = document.getElementById('cl-body');
    if (body) body.innerHTML = `<div class="cl-loading"><div class="spinner"></div><p>Loading saved scripts...</p></div>`;
    loadScripts().then(() => renderScriptsPage());
    return;
  }
  renderScriptsPage();
}

function renderScriptsPage() {
  const libCount      = state.scripts.length;
  const paidCreators  = state.roster.filter(r => r.affiliate_type !== 'free' || !r.affiliate_type);
  const creatorsCount = paidCreators.length;

  const CL_TITLES = {
    creators: { title: 'Creators',       subtitle: 'Track video performance and GMV across your affiliate roster' },
    write:    { title: 'Write Script',   subtitle: 'Generate a personalized conversion-driven script using BLC\'s framework' },
    rewrite:  { title: 'Rewrite Script', subtitle: 'Drop a winning transcript — Claude tears it down and rewrites it for a different creator' },
    analyzer: { title: 'Script Analyzer', subtitle: 'Paste any script or transcript and get a full structural breakdown' },
    library:  { title: 'Script Library', subtitle: 'All generated and saved scripts' }
  };
  const clTitle = CL_TITLES[state.contentLabTab] || CL_TITLES.creators;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${clTitle.title}</h1>
        <p class="page-subtitle">${clTitle.subtitle}</p>
      </div>
    </div>

    <div id="cl-body">
      ${renderContentLabTab()}
    </div>`;
}

function renderContentLabTab() {
  switch (state.contentLabTab) {
    case 'creators': return renderCreatorsTab();
    case 'write':    return renderWriteScriptTab();
    case 'rewrite':  return renderRewriteTab();
    case 'analyzer': return renderAnalyzerTab();
    case 'library':  return renderLibraryTab();
    default:         return renderWriteScriptTab();
  }
}

function renderWriteScriptTab() {
  return `
    <div class="generator-layout">
      <div class="generator-form-panel">
        <div class="panel">

          <div class="form-group">
            <label class="form-label-caps">Tone</label>
            <select id="script-tone">
              <option value="Balanced">Balanced — warm, relatable, friend who found something that works</option>
              <option value="Unfiltered">Unfiltered — raw, funny, authentic, stops the scroll with personality</option>
              <option value="Conservative">Conservative — clean, composed, credible without being clinical</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label-caps">Hook Angle</label>
            <select id="script-hook-type">
              <option value="Shame to empowerment">Shame to empowerment — names the emotional state she feels but hasn't said out loud</option>
              <option value="Avoidance behavior">Avoidance behavior — calls out what she's NOT doing because of the problem</option>
              <option value="Pain point direct">Pain point direct — names the physical problem immediately, no setup</option>
              <option value="Collective empowerment">Collective empowerment — "we" language, creates a movement</option>
              <option value="Outcome focused">Outcome focused — leads with the emotional benefit, not the problem</option>
              <option value="Trojan horse">Trojan horse — opens with something unexpected, viewer doesn't know it's about bikini line until halfway</option>
              <option value="Comment reply">Comment reply — pins a real user question as the hook, frames video as a direct answer</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label-caps">Main Pain Point</label>
            <select id="script-pain-point">
              <option value="Ingrowns">Ingrown hairs — trapped hair, scrubs aren't working</option>
              <option value="Discoloration">Discoloration — dark spots that outlast the bump</option>
              <option value="Irritation">Irritation & redness — angry skin after every session</option>
              <option value="All three">All three — full bikini line angle</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label-caps">Content Style</label>
            <select id="script-content-style">
              <option value="Talking head at home">Talking head at home — face to camera, direct</option>
              <option value="Sitting at beach or pool">Beach or pool — visual hook, body-forward opening</option>
              <option value="Car or casual">Car or casual — handheld, candid, trust through environment</option>
              <option value="Reaction or discovery">Reaction or discovery — stitching another video, reacting first</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label-caps">Script Length</label>
            <select id="script-length">
              <option value="hook">Hook only — 3–5 sec (ad testing)</option>
              <option value="short">Short — 15–30 sec</option>
              <option value="medium" selected>Medium — 30–60 sec</option>
              <option value="long">Long — 60–90 sec</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label-caps">Creator's Personal Experience <span style="color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0">(optional — if blank, gets a placeholder they replace)</span></label>
            <textarea id="script-experience" class="dp-textarea" rows="3"
              placeholder="e.g. I had ingrowns that would get really bad all along my bikini line. I tried so many things and nothing worked long term."></textarea>
          </div>

          <button class="btn btn-primary btn-full" id="script-btn" onclick="generateScript()">
            Generate Script
          </button>

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
              <p>Select a creator and click Generate to create a personalized video script</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderRewriteTab() {
  const creatorOptions = state.roster.map(c =>
    `<option value="${c.id}">${esc(c.name || c.handle)} · @${esc(c.handle)}</option>`
  ).join('');

  return `
    <div class="generator-layout">
      <div class="generator-form-panel">
        <div class="panel">

          <div class="form-group">
            <label class="form-label-caps">Winning Transcript</label>
            <div class="teardown-source-row">
              <textarea id="teardown-transcript" class="dp-textarea" rows="8"
                placeholder="Paste the winning transcript here…"></textarea>
              <div class="teardown-url-row">
                <input type="url" id="teardown-url" class="dp-input" placeholder="Or paste a TikTok / Instagram URL to auto-fetch…">
                <button class="btn btn-secondary btn-sm" id="teardown-fetch-btn" onclick="fetchTeardownTranscript()">Fetch</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label-caps">Rewrite For *</label>
            <select id="teardown-creator">
              <option value="">— Choose a creator —</option>
              ${creatorOptions}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label-caps">Target Length</label>
            <select id="teardown-length">
              <option value="short">Short — 15–30 sec</option>
              <option value="medium" selected>Medium — 30–60 sec</option>
              <option value="long">Long — 60–90 sec</option>
            </select>
          </div>

          <button class="btn btn-primary btn-full" id="script-btn" onclick="teardownScript()">
            Analyze & Rewrite
          </button>
          ${state.roster.length === 0 ? `<div class="info-box" style="margin-top:16px">Add creators to your Roster first.</div>` : ''}

        </div>
      </div>

      <div class="generator-output-panel">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Teardown + Rewrite</h3>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="cl-saved-badge hidden" id="cl-saved-badge">✓ Saved to Library</span>
              <button class="btn btn-secondary btn-sm hidden" id="copy-script-btn" onclick="copyOutput('script-output')">Copy</button>
            </div>
          </div>
          <div id="script-output" class="output-area">
            <div class="output-placeholder">
              <p>Paste a winning transcript, pick a creator, and click Analyze & Rewrite</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderAnalyzerTab() {
  return `
    <div class="generator-layout">
      <div class="generator-form-panel">
        <div class="panel">

          <div class="form-group">
            <label class="form-label-caps">Script or Transcript</label>
            <div class="teardown-source-row">
              <textarea id="analyzer-transcript" class="dp-textarea" rows="12"
                placeholder="Paste any TikTok or Instagram script / transcript here…"></textarea>
              <div class="teardown-url-row">
                <input type="url" id="analyzer-url" class="dp-input" placeholder="Or paste a TikTok URL to auto-fetch…">
                <button class="btn btn-secondary btn-sm" id="analyzer-fetch-btn" onclick="fetchAnalyzerTranscript()">Fetch</button>
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-full" id="analyzer-btn" onclick="analyzeScript()">
            Analyze Script
          </button>

        </div>
      </div>

      <div class="generator-output-panel">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Script Analysis</h3>
            <button class="btn btn-secondary btn-sm hidden" id="copy-analysis-btn" onclick="copyOutput('analyzer-output')">Copy</button>
          </div>
          <div id="analyzer-output" class="output-area">
            <div class="output-placeholder">
              <p>Paste any script or transcript and get a pass/fix score across the 7 things that make a video convert: hook strength, tension, authority placement, product reveal timing, relief moment, compliance, and CTA quality. Each one tells you exactly what to fix.</p>
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
      <button class="btn btn-primary" onclick="switchContentLabTab('write')">Write a Script</button>
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
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCreatorsTab() {
  const isCurrentMonth = state.rosterMonth === new Date().toISOString().slice(0, 7);
  const nav = `
    <div class="month-nav cl-month-nav">
      <button class="month-nav-btn" onclick="switchRosterMonth('prev')">‹</button>
      <div class="month-nav-label">
        ${monthLabel(state.rosterMonth)}
        ${isCurrentMonth ? `<span class="month-nav-current-chip">Current</span>` : ''}
      </div>
      <button class="month-nav-btn" onclick="switchRosterMonth('next')">›</button>
    </div>`;
  if (state.contentLabCreatorId) return nav + renderCreatorContentProfile(state.contentLabCreatorId);
  return nav + renderCreatorGrid();
}

function openCreatorProfile(id) {
  state.contentLabCreatorId = id;
  const body = document.getElementById('cl-body');
  if (body) body.innerHTML = renderCreatorsTab();
  backfillThumbnails(id); // silently fetch missing thumbnails
}

async function backfillThumbnails(rosterId) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r) return;
  const videos = normalizeBLCVideos(r.blc_videos);
  const missing = videos.map((v, i) => ({ v, i })).filter(({ v }) => v.url && !v.thumbnail_url);
  if (!missing.length) return;

  let changed = false;
  await Promise.all(missing.map(async ({ v, i }) => {
    try {
      const oe = await fetchAPI(`/api/oembed?url=${encodeURIComponent(v.url)}`);
      if (oe.thumbnail_url) { videos[i].thumbnail_url = oe.thumbnail_url; changed = true; }
    } catch (_) {}
  }));

  if (changed) await saveRosterBLCVideos(rosterId, videos, true);
}

function backToCreators() {
  state.contentLabCreatorId = null;
  const body = document.getElementById('cl-body');
  if (body) body.innerHTML = renderCreatorsTab();
}

function showAddVideoForm(rosterId) {
  const form = document.getElementById(`cl-add-form-${rosterId}`);
  if (form) { form.style.display = ''; form.querySelector('input')?.focus(); }
}

function renderCreatorGrid() {
  const creators = state.roster.filter(r => r.affiliate_type !== 'free' || !r.affiliate_type);
  if (creators.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">👥</div><h3>No creators on your roster yet</h3><p>Add creators to your Roster to track their content here</p><button class="btn btn-primary" onclick="navigate('roster')">Go to Roster</button></div>`;
  }
  const month = state.rosterMonth;
  // Monthly totals for summary line
  const monthVideos = creators.reduce((s, r) => s + videosForMonth(normalizeBLCVideos(r.blc_videos), month).length, 0);
  const monthGMV    = creators.reduce((s, r) => s + videosForMonth(normalizeBLCVideos(r.blc_videos), month).reduce((vs, v) => vs + (parseFloat(v.gmv) || 0), 0), 0);

  // Sort creators: those with monthly videos first (by monthly GMV desc), then the rest
  const sorted = [...creators].sort((a, b) => {
    const aGMV = videosForMonth(normalizeBLCVideos(a.blc_videos), month).reduce((s, v) => s + (parseFloat(v.gmv) || 0), 0);
    const bGMV = videosForMonth(normalizeBLCVideos(b.blc_videos), month).reduce((s, v) => s + (parseFloat(v.gmv) || 0), 0);
    return bGMV - aGMV;
  });

  return `
    <div class="cl-creators-summary">
      ${creators.length} creator${creators.length !== 1 ? 's' : ''} · ${monthVideos} video${monthVideos !== 1 ? 's' : ''} in ${monthLabel(month)} · <strong>${fmt$(monthGMV)} GMV</strong>
    </div>
    <div class="cl-creators-grid">
      ${sorted.map(r => {
        const allVideos  = normalizeBLCVideos(r.blc_videos);
        const videos     = videosForMonth(allVideos, month);
        const mGMV       = videos.reduce((s, v) => s + (parseFloat(v.gmv) || 0), 0);
        const mViews     = videos.reduce((s, v) => s + (parseInt(v.views) || 0), 0);
        const avgViews   = videos.length > 0 ? Math.round(mViews / videos.length) : 0;
        const topVideo   = videos.length > 0 ? [...videos].sort((a, b) => (parseFloat(b.gmv) || 0) - (parseFloat(a.gmv) || 0))[0] : null;
        const hasOther   = allVideos.length > videos.length; // has videos in other months
        return `
        <div class="cl-creator-card${videos.length === 0 ? ' cl-creator-card-empty' : ''}" onclick="openCreatorProfile('${r.id}')">
          <div class="cl-card-top">
            <div class="cl-card-identity">
              <div class="cl-card-name">${esc(r.name || r.handle)}</div>
              <a class="cl-card-handle" href="${creatorProfileUrl(r.handle, r.platform)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">@${esc(r.handle)}</a>
            </div>
            <div class="cl-card-badges">
              ${r.tier ? `<span class="grade-badge grade-${r.tier}">${r.tier}</span>` : ''}
            </div>
          </div>
          <div class="cl-card-stats">
            <div class="cl-card-stat">
              <div class="cl-card-stat-val">${videos.length}</div>
              <div class="cl-card-stat-label">Videos</div>
            </div>
            <div class="cl-card-stat">
              <div class="cl-card-stat-val">${fmt$(mGMV)}</div>
              <div class="cl-card-stat-label">GMV</div>
            </div>
            <div class="cl-card-stat">
              <div class="cl-card-stat-val">${avgViews > 0 ? fmtNum(avgViews) : '—'}</div>
              <div class="cl-card-stat-label">Avg Views</div>
            </div>
          </div>
          ${topVideo && topVideo.gmv
            ? `<div class="cl-card-top-video">Top: ${topVideo.views ? fmtNum(topVideo.views) + ' views · ' : ''}${fmt$(topVideo.gmv)} GMV</div>`
            : `<div class="cl-card-no-videos">${videos.length === 0
                ? (hasOther ? `No videos in ${monthLabel(month)}` : 'No videos logged yet')
                : 'No GMV tracked yet'}</div>`}
          <div class="cl-card-arrow">→</div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderCreatorContentProfile(id) {
  const r = state.roster.find(x => x.id === id);
  if (!r) return '<div class="empty-state">Creator not found</div>';
  const month      = state.rosterMonth;
  const allVideos  = normalizeBLCVideos(r.blc_videos);
  const videos     = videosForMonth(allVideos, month);  // monthly filter
  const sorted     = [...videos].sort((a, b) => (parseFloat(b.gmv) || 0) - (parseFloat(a.gmv) || 0));
  const mGMV       = videos.reduce((s, v) => s + (parseFloat(v.gmv) || 0), 0);
  const mViews     = videos.reduce((s, v) => s + (parseInt(v.views) || 0), 0);
  const totalDeal  = (parseFloat(r.per_vid_rate) || 0) * (parseInt(r.video_count) || 0);
  const gmvPer1k   = mViews > 0 ? (mGMV / mViews * 1000) : 0;
  const otherCount = allVideos.length - videos.length; // videos in other months

  // Default date for new video form = first day of selected month
  const defaultDate = `${month}-01`;

  return `
    <div class="cl-profile">
      <div class="cl-profile-nav">
        <button class="cl-back-btn" onclick="backToCreators()">← All Creators</button>
        <button class="btn btn-primary btn-sm" onclick="showAddVideoForm('${r.id}')">+ Add Video</button>
      </div>

      <div class="cl-profile-header">
        <div class="cl-profile-identity">
          <div class="cl-profile-name">${esc(r.name || r.handle)}</div>
          <a class="cl-profile-handle" href="${creatorProfileUrl(r.handle, r.platform)}" target="_blank" rel="noopener">@${esc(r.handle)}</a>
          <div class="cl-profile-meta">
            ${r.tier ? `${r.tier} grade · ` : ''}${r.video_count ? `${r.video_count} video deal` : ''}${r.per_vid_rate ? ` · ${fmt$(r.per_vid_rate)}/vid` : ''}${totalDeal > 0 ? ` · ${fmt$(totalDeal)} total` : ''}
          </div>
        </div>
      </div>

      <div class="cl-profile-stats">
        <div class="cl-pstat"><div class="cl-pstat-val">${videos.length}</div><div class="cl-pstat-label">Videos Logged</div></div>
        <div class="cl-pstat"><div class="cl-pstat-val">${mViews > 0 ? fmtNum(mViews) : '—'}</div><div class="cl-pstat-label">Total Views</div></div>
        <div class="cl-pstat cl-pstat-highlight"><div class="cl-pstat-val">${fmt$(mGMV)}</div><div class="cl-pstat-label">GMV — ${monthLabel(month)}</div></div>
        <div class="cl-pstat"><div class="cl-pstat-val">${gmvPer1k > 0 ? fmt$(gmvPer1k) : '—'}</div><div class="cl-pstat-label">GMV / 1k views</div></div>
      </div>

      <!-- Add Video Form -->
      <div class="cl-add-video-form" id="cl-add-form-${r.id}" style="display:none">
        <div class="cl-add-video-label">Add a video for ${monthLabel(month)}</div>
        <input type="url" class="dp-input" id="cl-new-video-url-${r.id}" placeholder="Paste TikTok URL..." style="margin-bottom:10px">
        <div class="cl-add-video-fields">
          <div class="cl-add-field">
            <label>Views</label>
            <input type="number" class="dp-input" id="cl-new-video-views-${r.id}" placeholder="e.g. 50000">
          </div>
          <div class="cl-add-field">
            <label>GMV ($)</label>
            <input type="number" class="dp-input" id="cl-new-video-gmv-${r.id}" placeholder="e.g. 450" step="0.01">
          </div>
          <div class="cl-add-field">
            <label>Date Posted</label>
            <input type="date" class="dp-input" id="cl-new-video-date-${r.id}" value="${defaultDate}">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="addBLCVideoEntry('${r.id}')">Add Video</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('cl-add-form-${r.id}').style.display='none'">Cancel</button>
        </div>
      </div>

      ${sorted.length === 0
        ? `<div class="cl-no-videos">
            No videos logged for ${monthLabel(month)}
            ${otherCount > 0 ? `<span class="cl-other-months-hint"> · ${otherCount} video${otherCount !== 1 ? 's' : ''} in other months</span>` : ' — click "+ Add Video" to add the first one'}
           </div>`
        : `<div class="cl-videos-grid">
          ${otherCount > 0 ? `<div class="cl-month-scope-note" style="grid-column:1/-1">${videos.length} video${videos.length !== 1 ? 's' : ''} in ${monthLabel(month)} · ${otherCount} in other months</div>` : ''}
          ${sorted.map((v, displayIdx) => {
            const origIdx = allVideos.findIndex(x => x.url === v.url && x.posted_date === v.posted_date);
            const isTop   = displayIdx === 0 && (parseFloat(v.gmv) || 0) > 0;
            const rank    = `#${displayIdx + 1}`;
            const thumb   = v.thumbnail_url || '';
            const dateShort = v.posted_date ? fmtDateShort(v.posted_date) : '—';
            return `
            <div class="cl-video-card${isTop ? ' cl-video-card-top' : ''}">
              <!-- Thumbnail -->
              <a href="${esc(v.url)}" target="_blank" rel="noopener" class="cl-vc-thumb"
                style="${thumb ? `background-image:url('${esc(thumb)}')` : ''}">
                ${!thumb ? `<div class="cl-vc-thumb-placeholder"></div>` : ''}
                <div class="cl-vc-rank-badge">${rank}</div>
                <div class="cl-vc-gmv-badge">${v.gmv ? fmt$(v.gmv) : ''}</div>
              </a>
              <!-- Stats & edit inputs -->
              <div class="cl-vc-body">
                <div class="cl-vc-stats-row">
                  <div class="cl-vc-stat-group">
                    <label class="cl-vc-label">Views</label>
                    <input type="number" class="dp-input cl-vc-input" value="${v.views || ''}"
                      placeholder="0" onblur="updateBLCVideoField('${r.id}', ${origIdx}, 'views', this.value)">
                  </div>
                  <div class="cl-vc-stat-group">
                    <label class="cl-vc-label">GMV ($)</label>
                    <input type="number" step="0.01" class="dp-input cl-vc-input" value="${v.gmv || ''}"
                      placeholder="0.00" onblur="updateBLCVideoField('${r.id}', ${origIdx}, 'gmv', this.value)">
                  </div>
                  <div class="cl-vc-stat-group">
                    <label class="cl-vc-label">Date</label>
                    <input type="date" class="dp-input cl-vc-input" value="${v.posted_date || ''}"
                      onblur="updateBLCVideoField('${r.id}', ${origIdx}, 'posted_date', this.value)">
                  </div>
                </div>
                <!-- Transcript -->
                <div class="cl-vc-transcript-row">
                  <button class="cl-vc-transcript-btn${v.transcript ? ' cl-vc-transcript-saved' : ''}"
                    onclick="toggleVideoTranscript('${r.id}', ${origIdx})">
                    ${v.transcript ? 'Transcript ▾' : 'Add transcript ▾'}
                  </button>
                  <button class="cl-vc-fetch-btn" data-fetch-btn="${r.id}-${origIdx}"
                    onclick="fetchTranscript('${r.id}', ${origIdx})">
                    Auto-fetch
                  </button>
                  <button class="cl-vc-remove-btn" onclick="removeBLCVideoEntry('${r.id}', ${origIdx})" title="Remove">✕</button>
                </div>
                <div class="cl-transcript-panel" id="cl-transcript-${r.id}-${origIdx}" style="display:none">
                  <textarea class="dp-textarea cl-transcript-ta" id="cl-transcript-ta-${r.id}-${origIdx}" rows="12"
                    placeholder="Paste transcript here or click Auto-fetch…"
                    onblur="updateBLCVideoField('${r.id}', ${origIdx}, 'transcript', this.value)">${esc(v.transcript || '')}</textarea>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>`}
    </div>`;
}

function toggleVideoTranscript(rosterId, idx) {
  const panel = document.getElementById(`cl-transcript-${rosterId}-${idx}`);
  if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
}

async function addBLCVideoEntry(rosterId) {
  const urlEl   = document.getElementById(`cl-new-video-url-${rosterId}`);
  const viewsEl = document.getElementById(`cl-new-video-views-${rosterId}`);
  const gmvEl   = document.getElementById(`cl-new-video-gmv-${rosterId}`);
  const dateEl  = document.getElementById(`cl-new-video-date-${rosterId}`);
  const url = urlEl?.value?.trim();
  if (!url) { showToast('Paste a video URL first', 'error'); return; }
  const r = state.roster.find(x => x.id === rosterId);
  const existing = normalizeBLCVideos(r?.blc_videos);

  // Auto-fetch thumbnail from TikTok oEmbed
  let thumbnail_url = null;
  try {
    const oe = await fetchAPI(`/api/oembed?url=${encodeURIComponent(url)}`);
    thumbnail_url = oe.thumbnail_url || null;
  } catch (_) { /* thumbnail is optional — continue without */ }

  const newEntry = {
    url,
    views:        viewsEl?.value ? parseFloat(viewsEl.value) : null,
    gmv:          gmvEl?.value   ? parseFloat(gmvEl.value)   : null,
    posted_date:  dateEl?.value  || null,
    title:        '',
    transcript:   '',
    thumbnail_url
  };
  const updated = [...existing, newEntry];
  await saveRosterBLCVideos(rosterId, updated, true);
  showToast('Video added ✓');
}

async function updateBLCVideoField(rosterId, idx, field, value) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r) return;
  const videos = normalizeBLCVideos(r.blc_videos);
  if (!videos[idx]) return;
  const numFields = ['views', 'gmv'];
  videos[idx][field] = numFields.includes(field)
    ? (value !== '' && value != null ? parseFloat(value) : null)
    : value;
  await saveRosterBLCVideos(rosterId, videos, false);
}

async function removeBLCVideoEntry(rosterId, idx) {
  if (!confirm('Remove this video entry?')) return;
  const r = state.roster.find(x => x.id === rosterId);
  const videos = normalizeBLCVideos(r?.blc_videos).filter((_, i) => i !== idx);
  await saveRosterBLCVideos(rosterId, videos, true);
  showToast('Video removed');
}

async function fetchTranscript(rosterId, origIdx) {
  const r = state.roster.find(x => x.id === rosterId);
  if (!r) return;
  const videos = normalizeBLCVideos(r.blc_videos);
  const v = videos[origIdx];
  if (!v?.url) return;

  // Show loading state in the textarea
  const taId = `cl-transcript-ta-${rosterId}-${origIdx}`;
  const ta = document.getElementById(taId);
  const btn = document.querySelector(`[data-fetch-btn="${rosterId}-${origIdx}"]`);
  if (ta) { ta.value = 'Fetching transcript…'; ta.disabled = true; }
  if (btn) { btn.textContent = '⏳ Fetching…'; btn.disabled = true; }

  try {
    const result = await fetchAPI('/api/transcript', {
      method: 'POST',
      body: JSON.stringify({ url: v.url })
    });
    const transcript = result.transcript || '';
    if (ta) { ta.value = transcript; ta.disabled = false; }
    if (btn) { btn.textContent = 'Re-fetch'; btn.disabled = false; }
    // Save to DB
    videos[origIdx].transcript = transcript;
    await saveRosterBLCVideos(rosterId, videos, false);
    showToast('Transcript fetched ✓');
  } catch (err) {
    if (ta) { ta.value = ''; ta.disabled = false; ta.placeholder = 'Paste transcript here…'; }
    if (btn) { btn.textContent = 'Auto-fetch'; btn.disabled = false; }
    const msg = err.message.includes('SUPADATA_API_KEY')
      ? 'Add SUPADATA_API_KEY to Railway env vars — get it from supadata.ai'
      : err.message.includes('ANTHROPIC_API_KEY')
      ? 'Add your ANTHROPIC_API_KEY to Railway env vars'
      : err.message;
    showToast(msg, 'error');
  }
}

async function saveRosterBLCVideos(rosterId, videos, rerender = false) {
  try {
    const rec = await fetchAPI(`${API.roster}/${rosterId}`, {
      method: 'PUT',
      body: JSON.stringify({ blc_videos: videos })
    });
    const i = state.roster.findIndex(x => x.id === rosterId);
    if (i !== -1) state.roster[i] = rec;
    if (rerender) openCreatorProfile(rosterId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setScriptMode(mode) {
  state.scriptMode = mode;
  const body = document.getElementById('cl-body');
  if (body) body.innerHTML = renderGeneratorTab();
}

function updateScriptsNav() {
  document.querySelectorAll('.nav-cl-item').forEach(el => {
    el.classList.toggle('active', el.dataset.scriptsTab === state.contentLabTab);
  });
}

async function generateScript() {
  const tone               = document.getElementById('script-tone')?.value;
  const hookFormat         = document.getElementById('script-hook-type')?.value;
  const painPoint          = document.getElementById('script-pain-point')?.value;
  const contentStyle       = document.getElementById('script-content-style')?.value;
  const scriptLength       = document.getElementById('script-length')?.value;
  const personalExperience = document.getElementById('script-experience')?.value?.trim();

  if (!tone) { showToast('Select a tone to continue', 'error'); return; }

  const btn    = document.getElementById('script-btn');
  const output = document.getElementById('script-output');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  output.innerHTML = `<div class="generating-indicator"><div class="spinner"></div><p>Writing your personalized script...</p></div>`;

  try {
    const res = await fetchAPI(`${API.generate}/script`, {
      method: 'POST',
      body: JSON.stringify({ tone, hookFormat, painPoint, contentStyle, personalExperience, scriptLength })
    });
    output.innerHTML = `<div class="output-content">${renderMarkdown(res.script)}</div>`;
    document.getElementById('copy-script-btn').classList.remove('hidden');

    const badge = document.getElementById('cl-saved-badge');
    if (badge) badge.classList.remove('hidden');
    if (res.scriptId) {
      state.scripts.unshift({
        id:             res.scriptId,
        creator_id:     null,
        creator_handle: tone || 'Balanced',
        product_focus:  `BBL Serum — ${painPoint || 'Ingrowns'} — ${hookFormat || 'Direct'}`,
        script_length:  { hook: 'Hook only', short: 'Short', medium: 'Medium', long: 'Long' }[scriptLength] || 'Medium',
        content:        res.script,
        mode:           'write',
        created_at:     new Date().toISOString()
      });
      state.scriptsLoaded = true;
    }
    showToast('Script generated and saved!');
  } catch (err) {
    output.innerHTML = `<div class="output-error">Error: ${esc(err.message)}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Script';
  }
}

async function analyzeScript() {
  const transcript = document.getElementById('analyzer-transcript')?.value?.trim();
  if (!transcript) { showToast('Paste a transcript first', 'error'); return; }

  const btn    = document.getElementById('analyzer-btn');
  const output = document.getElementById('analyzer-output');

  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  output.innerHTML = `<div class="generating-indicator"><div class="spinner"></div><p>Analyzing script structure...</p></div>`;

  try {
    const res = await fetchAPI(`${API.generate}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ transcript })
    });
    output.innerHTML = renderAnalysis(res.analysis);
    document.getElementById('copy-analysis-btn').classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
    output.innerHTML = `<div class="output-placeholder"><p>Analysis failed — try again</p></div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze Script';
  }
}

function renderAnalysis(data) {
  // Fallback — model returned unparseable text
  if (!data || !Array.isArray(data.criteria)) {
    return `<div class="output-content">${renderMarkdown(data?.raw || 'No analysis returned — try again.')}</div>`;
  }

  const passCount = data.criteria.filter(c => (c.verdict || '').toLowerCase() === 'pass').length;
  const total     = data.criteria.length;
  const rec       = (data.recommendation || '').toLowerCase(); // 'scale' | 'rewrite' | 'kill'

  const recConfig = {
    scale:   { label: 'SCALE',   sub: 'Test with budget',              cls: 'rec-scale'   },
    rewrite: { label: 'REWRITE', sub: 'Heavy surgery needed',          cls: 'rec-rewrite' },
    kill:    { label: 'KILL',    sub: 'Start over with a new angle',   cls: 'rec-kill'    },
  };
  const recInfo = recConfig[rec] || null;

  const rows = data.criteria.map(c => {
    const isPass = (c.verdict || '').toLowerCase() === 'pass';
    return `
      <div class="analysis-criterion analysis-${isPass ? 'pass' : 'fix'}">
        <div class="analysis-criterion-badge">${isPass ? '✓' : '!'}</div>
        <div class="analysis-criterion-main">
          <div class="analysis-criterion-name">${esc(c.name)}</div>
          <div class="analysis-criterion-reason">${esc(c.reason || '')}</div>
        </div>
        <div class="analysis-criterion-verdict analysis-verdict-${isPass ? 'pass' : 'fix'}">${isPass ? 'Pass' : 'Fix'}</div>
      </div>`;
  }).join('');

  return `
    <div class="analysis-result">
      ${recInfo ? `
      <div class="analysis-rec ${recInfo.cls}">
        <div class="analysis-rec-label">${recInfo.label}</div>
        <div class="analysis-rec-sub">${recInfo.sub}</div>
        <div class="analysis-rec-score">${passCount}/${total} passing</div>
      </div>` : `
      <div class="analysis-scorebar">
        <div class="analysis-score">${passCount}<span class="analysis-score-denom">/${total} passing</span></div>
        ${data.hookLine ? `<div class="analysis-hookline">Hook: "${esc(data.hookLine)}"</div>` : ''}
      </div>`}
      ${data.hookLine && recInfo ? `<div class="analysis-hookline-below">Hook: "${esc(data.hookLine)}"</div>` : ''}
      <div class="analysis-criteria">${rows}</div>
      ${data.verdict ? `
      <div class="analysis-verdict-box">
        <div class="analysis-verdict-label">Performance assessment</div>
        <div class="analysis-verdict-text">${esc(data.verdict)}</div>
      </div>` : ''}
    </div>`;
}

async function fetchAnalyzerTranscript() {
  const urlInput = document.getElementById('analyzer-url');
  const ta       = document.getElementById('analyzer-transcript');
  const btn      = document.getElementById('analyzer-fetch-btn');
  const url      = urlInput?.value?.trim();
  if (!url) { showToast('Paste a URL first', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Fetching...';
  try {
    const res = await fetchAPI('/api/transcript', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    if (ta) { ta.value = res.transcript || ''; showToast('Transcript fetched'); }
    if (urlInput) urlInput.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fetch';
  }
}

async function fetchTeardownTranscript() {
  const urlInput = document.getElementById('teardown-url');
  const ta       = document.getElementById('teardown-transcript');
  const btn      = document.getElementById('teardown-fetch-btn');
  const url      = urlInput?.value?.trim();
  if (!url) { showToast('Paste a TikTok URL first', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Fetching...';
  try {
    const res = await fetchAPI('/api/transcript', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    if (ta) ta.value = res.transcript || '';
    urlInput.value = '';
    showToast('Transcript fetched');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fetch';
  }
}

async function teardownScript() {
  const sourceTranscript  = document.getElementById('teardown-transcript')?.value?.trim();
  const targetCreatorId   = document.getElementById('teardown-creator')?.value;
  const scriptLength      = document.getElementById('teardown-length')?.value || 'medium';

  if (!sourceTranscript) { showToast('Paste a source transcript first', 'error'); return; }
  if (!targetCreatorId)  { showToast('Select a target creator', 'error'); return; }

  const btn    = document.getElementById('script-btn');
  const output = document.getElementById('script-output');

  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  output.innerHTML = `<div class="generating-indicator"><div class="spinner"></div><p>Tearing down the script and rewriting for your creator...</p></div>`;

  try {
    const res = await fetchAPI(`${API.generate}/teardown`, {
      method: 'POST',
      body: JSON.stringify({ sourceTranscript, targetCreatorId, scriptLength })
    });
    output.innerHTML = `<div class="output-content">${renderMarkdown(res.script)}</div>`;
    document.getElementById('copy-script-btn').classList.remove('hidden');

    const badge = document.getElementById('cl-saved-badge');
    if (badge) badge.classList.remove('hidden');
    if (res.scriptId) {
      const creator = state.roster.find(c => c.id === targetCreatorId);
      state.scripts.unshift({
        id:             res.scriptId,
        creator_id:     targetCreatorId,
        creator_handle: creator?.handle || '',
        product_focus:  'BBL Serum — Teardown Rewrite',
        script_length:  { short: 'Short', medium: 'Medium', long: 'Long' }[scriptLength] || 'Medium',
        content:        res.script,
        mode:           'teardown',
        created_at:     new Date().toISOString()
      });
      state.scriptsLoaded = true;
    }
    showToast('Teardown complete — script saved!');
  } catch (err) {
    output.innerHTML = `<div class="output-error">Error: ${esc(err.message)}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze & Rewrite';
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
  // Simplified: only check brief_sent (creative angles no longer required)
  return state.roster.filter(r =>
    r.status === 'onboarding' && r.serum_shipped && !r.brief_sent
  );
}

function reviewCounterRejected() {
  return state.outreach.filter(r => r.status === 'counter_rejected');
}

function reviewFinalPayments() {
  return state.roster.filter(r =>
    r.status === 'completed' && !r.payment_sent && r.per_vid_rate && r.video_count
  );
}

function reviewCount() {
  return reviewPendingPayments().length + reviewPendingSerum().length + reviewPendingAssets().length + reviewCounterRejected().length + reviewFinalPayments().length;
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
  const finalPayments   = reviewFinalPayments();
  const serum           = reviewPendingSerum();
  const assets          = reviewPendingAssets();
  const rejected        = reviewCounterRejected();
  const total           = payments.length + finalPayments.length + serum.length + assets.length + rejected.length;

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
        <span class="review-section-title">Serum Shipment Needed</span>
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
        <span class="review-section-title">Payments Due</span>
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

    <!-- Final Payments Due (50% remaining after all videos posted) -->
    <div class="review-section review-section-final">
      <div class="review-section-header">
        <span class="review-section-title">Final Payments Due</span>
        ${finalPayments.length > 0 ? `<span class="review-section-count review-count-orange">${finalPayments.length}</span>` : ''}
      </div>
      ${finalPayments.length === 0
        ? `<div class="review-empty">No final payments pending ✓</div>`
        : finalPayments.map(r => {
            const deal  = parseFloat(r.per_vid_rate) * parseInt(r.video_count);
            const half  = deal / 2;
            return `
            <div class="review-card review-card-final review-card-column">
              <div class="review-card-row">
                <div class="review-card-main">
                  <div class="review-card-name">${esc(r.name || r.handle)}</div>
                  <div class="review-card-sub">@${esc(r.handle)} · ${r.video_count} videos delivered · ${fmt$(r.per_vid_rate)}/vid · <strong>50% remaining</strong></div>
                </div>
                <div class="review-card-amount">
                  <div class="review-amount-value">${fmt$(half)}</div>
                  <div class="review-amount-hint">final payment</div>
                </div>
              </div>
              <div class="review-card-actions">
                <button class="btn btn-primary btn-sm" onclick="markFinalPaymentSent('${r.id}')">
                  Mark Final Payment Sent
                </button>
              </div>
            </div>`;
          }).join('')
      }
    </div>

    <!-- Brief Needed -->
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">Brief Needed</span>
        ${assets.length > 0 ? `<span class="review-section-count">${assets.length}</span>` : ''}
      </div>
      ${assets.length === 0
        ? `<div class="review-empty">${serum.length > 0 ? 'Waiting on serum shipments first' : 'All briefs sent ✓'}</div>`
        : assets.map(r => {
            const arrivalDate = r.serum_ship_date
              ? (() => { const d = new Date(r.serum_ship_date + 'T00:00:00'); d.setDate(d.getDate()+10); return fmtDateShort(d.toISOString().split('T')[0]); })()
              : null;
            return `
            <div class="review-card review-card-column">
              <div class="review-card-row">
                <div class="review-card-main">
                  <div class="review-card-name">${esc(r.name || r.handle)}</div>
                  <div class="review-card-sub">@${esc(r.handle)} · ${r.video_count || '?'} video deal${arrivalDate ? ` · Serum arrives ~${arrivalDate}` : ''}</div>
                </div>
              </div>
              <div class="review-checklist">
                <label class="review-check-item ${r.brief_sent ? 'review-check-done' : ''}">
                  <input type="checkbox" ${r.brief_sent ? 'checked' : ''}
                    onchange="markRosterField('${r.id}', 'brief_sent', this.checked)">
                  Content brief sent
                </label>
              </div>
            </div>`;
          }).join('')
      }
    </div>

    <!-- Counter Rejected -->
    <div class="review-section review-section-rejected">
      <div class="review-section-header">
        <span class="review-section-title">Counter Rejected — Needs Response</span>
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
  state.outreachFilter = 'counter_rejected';
  navigate('outreach');
  openDetailPanel(outreachId);
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

// --- Counter-rejected decision panel actions ---

function toggleAcceptRatePanel(id) {
  const panel = document.getElementById(`dp-accept-rate-panel-${id}`);
  if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
}

async function reviseCounter(id) {
  if (!confirm('This clears the current counter and moves the creator back to Replied so you can build a new offer. Continue?')) return;
  try {
    const rec = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'replied',
        counter_offer_amount:   null,
        counter_offer_email:    null,
        founder_counter_amount: null,
        founder_counter_notes:  null,
        final_counter_amount:   null,
        final_counter_notes:    null,
        counter_feedback:       null
      })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = rec;
    updateReviewBadge();
    updateRepliedBadge();
    renderDetailPanel();
    renderPipelineView();
    showToast('Moved back to Replied — build a new offer ✓');
  } catch (err) { showToast(err.message, 'error'); }
}

async function signAtCreatorRate(id) {
  const input = document.getElementById(`dp-accept-rate-input-${id}`);
  const rate  = parseFloat(input?.value);
  if (!rate || isNaN(rate)) { showToast('Enter a valid rate first', 'error'); return; }
  try {
    const rec = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status:               'signed',
        counter_offer_amount: rate,
        final_counter_amount: rate
      })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = rec;
    updateReviewBadge();
    updateRepliedBadge();
    renderDetailPanel();
    renderPipelineView();
    showToast('🎉 Signed at creator\'s rate! Fill in deal details, then Finalize & Onboard →');
  } catch (err) { showToast(err.message, 'error'); }
}

async function closeDeal(id) {
  if (!confirm('Archive this deal? This ends negotiations.')) return;
  try {
    const rec = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT', body: JSON.stringify({ status: 'archived' })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = rec;
    updateReviewBadge();
    updateRepliedBadge();
    closeDetailPanel();
    renderPipelineView();
    showToast('Deal closed and archived');
  } catch (err) { showToast(err.message, 'error'); }
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
    r.affiliate_type === 'paid' &&
    (r.status === 'active' || r.status === 'onboarding' || r.status === 'completed') &&
    (!r.contract_month || r.contract_month === state.rosterMonth)
  );
}

function financePaymentStatus(r) {
  if (r.payment_sent)                               return { val: 'paid_full',     label: 'Paid in Full',      cls: 'fin-status-paid'    };
  if (r.status === 'completed' && r.invoice_received) return { val: 'final_due',   label: 'Final Payment Due', cls: 'fin-status-final'   };
  if (r.invoice_received)                           return { val: 'deposit_paid',  label: '50% Down Paid',     cls: 'fin-status-deposit' };
  return                                                   { val: 'pending_invoice', label: 'Pending Invoice', cls: 'fin-status-pending' };
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

  const isCurrentMonth = state.rosterMonth === new Date().toISOString().slice(0, 7);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Finance</h1>
        <p class="page-subtitle">Live data from Roster & Pipeline · ${affiliates.length} paid affiliate${affiliates.length !== 1 ? 's' : ''}</p>
      </div>
    </div>

    <div class="month-nav">
      <button class="month-nav-btn" onclick="switchRosterMonth('prev')">‹</button>
      <div class="month-nav-label">
        ${monthLabel(state.rosterMonth)}
        ${isCurrentMonth ? `<span class="month-nav-current-chip">Current</span>` : ''}
      </div>
      <button class="month-nav-btn" onclick="switchRosterMonth('next')">›</button>
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
              <td class="fin-td-creator">${creatorCell(r.name, r.handle, r.platform)}</td>
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
                  ${ps.val === 'final_due' ? `<option value="final_due" selected>Final Payment Due</option>` : ''}
                  <option value="paid_full"       ${ps.val === 'paid_full'       ? 'selected' : ''}>Paid in Full</option>
                </select>
                ${ps.val === 'deposit_paid' ? `<div class="fin-deposit-hint">${fmt$(deposit)} remaining</div>` : ''}
                ${ps.val === 'final_due'    ? `<div class="fin-deposit-hint" style="color:var(--orange)">${fmt$(deposit)} final payment due</div>` : ''}
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
// CUSTOMER SUPPORT TRACKER
// ============================================================

const ISSUE_TYPES = [
  { key: 'pump_issue',    label: 'Pump Issue',    color: 'orange' },
  { key: 'short_shipped', label: 'Short Shipped', color: 'yellow' },
  { key: 'missing_item',  label: 'Missing Item',  color: 'red'    }
];

async function loadSupport() {
  state.support = await fetchAPI(API.support);
  updateSupportBadge();
}

async function loadCustomIssueTypes() {
  try {
    const data = await fetchAPI(API.settings);
    state.customIssueTypes = Array.isArray(data.custom_issue_types) ? data.custom_issue_types : [];
  } catch { state.customIssueTypes = []; }
}

async function saveCustomIssueTypes() {
  try {
    await fetchAPI(API.settings, { method: 'PUT', body: JSON.stringify({ custom_issue_types: state.customIssueTypes }) });
  } catch (err) { console.error('Failed to save custom issue types:', err.message); }
}

function buildIssueOptions(selectedValue = '') {
  const fixedKeys = ['pump_issue', 'short_shipped', 'missing_item'];
  const isCustomSelected = selectedValue && !fixedKeys.includes(selectedValue);
  let opts = `<option value="">-- Select issue --</option>`;
  opts += `<option value="pump_issue" ${selectedValue === 'pump_issue' ? 'selected' : ''}>Pump Issue (not pumping properly)</option>`;
  opts += `<option value="short_shipped" ${selectedValue === 'short_shipped' ? 'selected' : ''}>Short Shipped (ordered 2, received 1)</option>`;
  opts += `<option value="missing_item" ${selectedValue === 'missing_item' ? 'selected' : ''}>Missing Item (not in package)</option>`;
  if (state.customIssueTypes.length > 0) {
    opts += `<option disabled style="color:var(--text-muted);font-size:11px">──── Saved ────</option>`;
    opts += state.customIssueTypes.map(t => {
      const v = `custom::${t}`;
      const sel = isCustomSelected && selectedValue === t ? 'selected' : '';
      return `<option value="${v}" ${sel}>${esc(t)}</option>`;
    }).join('');
  }
  opts += `<option value="other">Other (describe below)</option>`;
  return opts;
}

function onSupportIssueChange(el) {
  const otherWrap   = document.getElementById('sup-other-wrap');
  const removeLink  = document.getElementById('sup-remove-saved');
  if (otherWrap)  otherWrap.style.display  = el.value === 'other'        ? 'block' : 'none';
  if (removeLink) removeLink.style.display = el.value.startsWith('custom::') ? 'block' : 'none';
}

function removeCustomIssueType() {
  const sel = document.getElementById('sup-issue-select');
  if (!sel || !sel.value.startsWith('custom::')) return;
  const label = sel.value.slice(8);
  state.customIssueTypes = state.customIssueTypes.filter(t => t !== label);
  saveCustomIssueTypes();
  sel.innerHTML = buildIssueOptions('');
  onSupportIssueChange(sel);
  showToast('Removed from saved types');
}

function updateSupportBadge() {
  const badge = document.getElementById('support-badge');
  if (!badge) return;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthCount = state.support.filter(i => (i.issue_date || '').startsWith(thisMonth)).length;
  badge.textContent = thisMonthCount;
  badge.style.display = thisMonthCount > 0 ? 'inline-flex' : 'none';
}

function renderSupportPage() {
  const all = state.support;

  // This month stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthIssues = all.filter(i => (i.issue_date || '').startsWith(thisMonth));
  const typeCounts = {};
  ISSUE_TYPES.forEach(t => { typeCounts[t.key] = thisMonthIssues.filter(i => i.issue_type === t.key).length; });

  const statCards = ISSUE_TYPES.map(t => `
    <div class="sup-stat sup-stat-${t.color}">
      <div class="sup-stat-count">${typeCounts[t.key]}</div>
      <div class="sup-stat-label">${t.label}</div>
      <div class="sup-stat-sub">this month</div>
    </div>`).join('') + `
    <div class="sup-stat sup-stat-gray">
      <div class="sup-stat-count">${thisMonthIssues.length}</div>
      <div class="sup-stat-label">Total</div>
      <div class="sup-stat-sub">this month</div>
    </div>`;

  // Group by year-month
  const groups = {};
  all.forEach(issue => {
    const d = issue.issue_date || (issue.created_at || '').split('T')[0] || '';
    const key = d.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  });
  const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  let tableContent = '';
  if (all.length === 0) {
    tableContent = `<div class="sup-empty">No issues logged yet.</div>`;
  } else {
    tableContent = sortedMonths.map(monthKey => {
      const [yr, mo] = monthKey.split('-');
      const monthLabel = new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const issues = groups[monthKey];
      const breakdown = ISSUE_TYPES.map(t => {
        const cnt = issues.filter(i => i.issue_type === t.key).length;
        return cnt > 0 ? `${t.label}: ${cnt}` : null;
      }).filter(Boolean).join(' · ');

      const rows = issues.map(issue => {
        const typeObj = ISSUE_TYPES.find(t => t.key === issue.issue_type) || { label: issue.issue_type, color: 'gray' };
        const dateStr = issue.issue_date
          ? new Date(issue.issue_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—';
        return `<tr class="sup-row" onclick="openEditIssueModal('${issue.id}')">
          <td class="sup-td sup-td-date">${dateStr}</td>
          <td class="sup-td sup-td-platform">${esc(issue.platform || '—')}</td>
          <td class="sup-td">${esc(issue.customer_name || '—')}</td>
          <td class="sup-td sup-td-order">${esc(issue.order_id || '—')}</td>
          <td class="sup-td"><span class="sup-type-pill sup-type-${typeObj.color}">${typeObj.label}</span></td>
          <td class="sup-td sup-td-actions" onclick="event.stopPropagation()">
            <button class="sup-action-btn sup-delete-btn" onclick="deleteSupportIssue('${issue.id}')" title="Delete">✕</button>
          </td>
        </tr>`;
      }).join('');

      return `
        <div class="sup-month-group">
          <div class="sup-month-header">
            <span class="sup-month-label">${monthLabel}</span>
            <span class="sup-month-meta">${issues.length} issue${issues.length !== 1 ? 's' : ''}${breakdown ? ' · ' + breakdown : ''}</span>
          </div>
          <table class="sup-table">
            <thead>
              <tr>
                <th class="sup-th">Date</th>
                <th class="sup-th">Platform</th>
                <th class="sup-th">Customer</th>
                <th class="sup-th">Order #</th>
                <th class="sup-th">Issue</th>
                <th class="sup-th"></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Customer Support</h1>
        <p class="page-subtitle">Monthly issue log · ${all.length} total</p>
      </div>
      <button class="btn btn-primary" onclick="openLogIssueModal()">+ Log Issue</button>
    </div>
    <div class="sup-stats-row">${statCards}</div>
    <div class="sup-table-card">${tableContent}</div>`;
}

function issueModalFields(selectedIssue = '') {
  return `
    <div id="sup-issue-wrap" style="margin-top:4px">
      <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px">Customer Issue</label>
      <select name="issue_type" id="sup-issue-select" onchange="onSupportIssueChange(this)" required style="width:100%;background:var(--bg-tertiary);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:9px 13px;font-size:13px;color:var(--text-primary);font-family:inherit;outline:none;appearance:none;cursor:pointer">
        ${buildIssueOptions(selectedIssue)}
      </select>
      <div id="sup-remove-saved" style="display:none;margin-top:6px">
        <button type="button" style="font-size:11.5px;color:var(--red);background:none;border:none;cursor:pointer;padding:0" onclick="removeCustomIssueType()">× Remove this from saved types</button>
      </div>
      <div id="sup-other-wrap" style="display:none;margin-top:10px;padding:12px 14px;background:var(--bg-tertiary);border:1px solid var(--border-light);border-radius:var(--radius-sm)">
        <input type="text" id="sup-other-text" placeholder="Describe the issue (e.g. Wrong color sent, Leaking bottle...)" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:9px 11px;font-size:13px;color:var(--text-primary);font-family:inherit;outline:none;box-sizing:border-box">
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer;user-select:none">
          <input type="checkbox" id="sup-save-type" style="accent-color:var(--accent);width:14px;height:14px">
          <span style="font-size:12px;color:var(--text-secondary)">Save as a recurring issue type</span>
        </label>
      </div>
    </div>`;
}

function resolveIssueTypeFromModal() {
  const sel = document.getElementById('sup-issue-select');
  if (!sel) return null;
  if (sel.value === 'other') {
    const text = (document.getElementById('sup-other-text')?.value || '').trim();
    if (!text) return null;
    if (document.getElementById('sup-save-type')?.checked && !state.customIssueTypes.includes(text)) {
      state.customIssueTypes.push(text);
      saveCustomIssueTypes();
    }
    return text;
  }
  if (sel.value.startsWith('custom::')) return sel.value.slice(8);
  return sel.value || null;
}

function openLogIssueModal() {
  const today = new Date().toISOString().split('T')[0];
  const html = `
    <form id="modal-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Date</label>
          <input type="date" name="issue_date" value="${today}" required>
        </div>
        <div class="form-group">
          <label>Platform</label>
          <select name="platform">
            <option value="TikTok Shop">TikTok Shop</option>
            <option value="Shopify">Shopify</option>
          </select>
        </div>
        <div class="form-group">
          <label>Customer Name</label>
          <input type="text" name="customer_name" placeholder="e.g. Jane D.">
        </div>
        <div class="form-group">
          <label>Order Number</label>
          <input type="text" name="order_id" placeholder="e.g. #12345">
        </div>
      </div>
      ${issueModalFields()}
      <div class="form-actions" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Log Issue</button>
      </div>
    </form>`;
  openModal('Log Issue', html, async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    const issueType = resolveIssueTypeFromModal();
    if (!issueType) { showToast('Select or describe an issue type', 'error'); return; }
    data.issue_type = issueType;
    try {
      const rec = await fetchAPI(API.support, { method: 'POST', body: JSON.stringify(data) });
      state.support.unshift(rec);
      updateSupportBadge();
      closeModal();
      renderSupportPage();
      showToast('Issue logged ✓');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function openEditIssueModal(id) {
  const issue = state.support.find(i => i.id === id);
  if (!issue) return;
  const html = `
    <form id="modal-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Date</label>
          <input type="date" name="issue_date" value="${issue.issue_date || ''}" required>
        </div>
        <div class="form-group">
          <label>Platform</label>
          <select name="platform">
            ${['TikTok Shop', 'Shopify'].map(p => `<option ${(issue.platform || 'TikTok Shop') === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Customer Name</label>
          <input type="text" name="customer_name" value="${esc(issue.customer_name || '')}">
        </div>
        <div class="form-group">
          <label>Order Number</label>
          <input type="text" name="order_id" value="${esc(issue.order_id || '')}">
        </div>
      </div>
      ${issueModalFields(issue.issue_type)}
      <div class="form-actions" style="justify-content:space-between">
        <button type="button" class="btn btn-danger-outline" onclick="deleteSupportIssue('${id}');closeModal()">Delete</button>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </div>
    </form>`;
  openModal('Edit Issue', html, async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    const issueType = resolveIssueTypeFromModal();
    if (!issueType) { showToast('Select or describe an issue type', 'error'); return; }
    data.issue_type = issueType;
    try {
      const rec = await fetchAPI(`${API.support}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const idx = state.support.findIndex(i => i.id === id);
      if (idx !== -1) state.support[idx] = rec;
      updateSupportBadge();
      closeModal();
      renderSupportPage();
      showToast('Issue updated ✓');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function deleteSupportIssue(id) {
  if (!confirm('Delete this issue? This cannot be undone.')) return;
  try {
    await fetchAPI(`${API.support}/${id}`, { method: 'DELETE' });
    state.support = state.support.filter(i => i.id !== id);
    updateSupportBadge();
    if (state.currentPage === 'support') renderSupportPage();
    showToast('Issue deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// HOME PAGE
// ============================================================

async function loadTasks() {
  state.tasks = await fetchAPI(API.tasks);
  updateTasksUrgentBadge();
}

function updateTasksUrgentBadge() {
  const urgentCount = state.tasks.filter(t =>
    !t.completed && !t.archived && t.deadline && deadlineSortKey(t.deadline) <= 1
  ).length;
  const badge = document.getElementById('tasks-nav-badge');
  if (!badge) return;
  badge.textContent   = urgentCount;
  badge.style.display = urgentCount > 0 ? 'inline-flex' : 'none';
}

// ── Task helpers ────────────────────────────────────────────────
function fmtDeadline(deadline) {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)   return { cls: 'deadline-overdue', text: `${Math.abs(diff)}d overdue`, urgent: true };
  if (diff <= 1)  return { cls: 'deadline-today',   text: diff === 0 ? 'Due today' : '1d left', urgent: true };
  if (diff <= 5)  return { cls: 'deadline-soon',    text: `${diff}d left`, urgent: false };
  return           { cls: 'deadline-future',         text: `${diff}d left`, urgent: false };
}

function taskTagBadge(tag) {
  if (!tag) return '';
  const map = {
    revenue: { cls: 'tag-revenue', label: 'Revenue' },
    brand:   { cls: 'tag-brand',   label: 'Brand' }
  };
  const c = map[tag];
  return c ? `<span class="task-tag ${c.cls}">${c.label}</span>` : '';
}

function deadlineSortKey(deadline) {
  if (!deadline) return Infinity; // no deadline → bottom
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(deadline + 'T00:00:00') - today) / 86400000);
}

function renderTaskList(assignee) {
  const tasks = state.tasks
    .filter(t => t.assignee === assignee && !t.archived)
    .sort((a, b) => {
      // completed always last
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // sort by urgency: overdue first, then soonest, then no-deadline
      return deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline);
    });
  if (tasks.length === 0) {
    return `<div class="focus-empty">Nothing yet</div>`;
  }
  return tasks.map(t => {
    const dl = fmtDeadline(t.deadline);
    return `
    <div class="focus-task${t.completed ? ' focus-done' : ''}">
      <button class="focus-check${t.completed ? ' focus-checked' : ''}" onclick="toggleTask('${t.id}')">
        ${t.completed ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </button>
      <span class="focus-task-title" onclick="openTaskDetail('${t.id}')">${esc(t.title)}${t.notes ? ` <span class="focus-has-notes" title="Has notes">·</span>` : ''}</span>
      ${taskTagBadge(t.tag)}
      ${dl ? `<span class="task-deadline ${dl.cls}">${dl.text}</span>` : ''}
      ${t.completed ? `<button class="focus-archive-btn" onclick="archiveTask('${t.id}')" title="Archive">Archive</button>` : ''}
      <button class="focus-edit-btn" onclick="openTaskDetail('${t.id}')" title="Edit">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>`;
  }).join('');
}

function refreshTaskBoard() {
  const fEl = document.getElementById('tasks-founder');
  const lEl = document.getElementById('tasks-lu');
  const gEl = document.getElementById('tasks-for-founder');
  if (fEl) fEl.innerHTML = renderTaskList('founder');
  if (lEl) lEl.innerHTML = renderTaskList('lu');
  if (gEl) gEl.innerHTML = renderTaskList('for-founder');
  // Update "For Founder" column badge count
  const pending = state.tasks.filter(t => t.assignee === 'for-founder' && !t.archived && !t.completed).length;
  const badge = document.querySelector('.focus-col-review .focus-col-badge');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'inline-flex' : 'none'; }
  // Nav badge = urgent tasks (overdue or ≤1d), not just for-founder
  updateTasksUrgentBadge();
}

function startAddTask(assignee) {
  const listEl = document.getElementById(`tasks-${assignee}`);
  if (!listEl || listEl.querySelector('.focus-add-row')) return;
  const row = document.createElement('div');
  row.className = 'focus-task focus-add-row';
  row.innerHTML = `
    <span class="focus-check"></span>
    <input class="focus-add-input" type="text" placeholder="Add a task…" maxlength="120">
  `;
  listEl.appendChild(row);
  const input = row.querySelector('input');
  input.focus();
  async function commit() {
    const title = input.value.trim();
    row.remove();
    if (!title) return;
    try {
      const task = await fetchAPI(API.tasks, {
        method: 'POST',
        body: JSON.stringify({ title, assignee })
      });
      state.tasks.push(task);
      refreshTaskBoard();
    } catch (err) { showToast(err.message, 'error'); }
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') row.remove();
  });
  input.addEventListener('blur', () => setTimeout(() => { if (row.parentNode) row.remove(); }, 150));
}

async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  try {
    const updated = await fetchAPI(`${API.tasks}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: !task.completed })
    });
    const i = state.tasks.findIndex(t => t.id === id);
    if (i !== -1) state.tasks[i] = updated;
    refreshTaskBoard();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteTask(id) {
  try {
    await fetchAPI(`${API.tasks}/${id}`, { method: 'DELETE' });
    state.tasks = state.tasks.filter(t => t.id !== id);
    refreshTaskBoard();
  } catch (err) { showToast(err.message, 'error'); }
}

async function archiveTask(id) {
  try {
    await fetchAPI(`${API.tasks}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ archived: true })
    });
    state.tasks = state.tasks.filter(t => t.id !== id);
    closeModal();
    refreshTaskBoard();
    showToast('Task archived');
  } catch (err) { showToast(err.message, 'error'); }
}

function openTaskDetail(id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  openModal('Task', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">Title</label>
        <input class="form-input" id="td-title" value="${esc(t.title)}" placeholder="Task name" maxlength="120">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Tag</label>
          <select class="form-input" id="td-tag">
            <option value="">No tag</option>
            <option value="revenue" ${t.tag === 'revenue' ? 'selected' : ''}>Revenue-Generating</option>
            <option value="brand"   ${t.tag === 'brand'   ? 'selected' : ''}>Brand-Building</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Deadline</label>
          <input type="date" class="form-input" id="td-deadline" value="${t.deadline || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes &amp; Links</label>
        <textarea class="form-input" id="td-notes" rows="4" placeholder="Add notes, context, or paste links here…" style="resize:vertical">${esc(t.notes || '')}</textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:space-between;padding-top:4px">
        <div style="display:flex;gap:8px">
          ${t.completed ? `<button class="btn btn-secondary btn-sm" onclick="archiveTask('${id}')">Archive</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteTaskModal('${id}')">Delete</button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveTaskDetail('${id}')">Save</button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('td-title')?.focus(), 60);
}

async function saveTaskDetail(id) {
  const title    = document.getElementById('td-title')?.value.trim();
  const notes    = document.getElementById('td-notes')?.value.trim();
  const tag      = document.getElementById('td-tag')?.value || null;
  const deadline = document.getElementById('td-deadline')?.value || null;
  if (!title) { showToast('Title is required', 'error'); return; }
  try {
    const updated = await fetchAPI(`${API.tasks}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, notes: notes || null, tag, deadline })
    });
    const i = state.tasks.findIndex(t => t.id === id);
    if (i !== -1) state.tasks[i] = updated;
    closeModal();
    refreshTaskBoard();
    showToast('Saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteTaskModal(id) {
  await deleteTask(id);
  closeModal();
}

// ============================================================
// DAILY TOP 2  (per-person: founder + lu)
// ============================================================

async function loadDailyTop2() {
  state.dailyTop2 = await fetchAPI(API.dailyTop2);
}

function refreshDailyTop2() {
  if (state.currentPage !== 'daily-top2') return;
  renderDailyTop2Page();
}

function getDT2(person) {
  // Returns slots [1, 2] for the given person, filling blanks if needed
  const found = state.dailyTop2.filter(i => i.person === person).sort((a, b) => a.slot - b.slot);
  return [
    found.find(i => i.slot === 1) || { person, slot: 1, title: null, completed: false },
    found.find(i => i.slot === 2) || { person, slot: 2, title: null, completed: false }
  ];
}

function renderDT2PersonCol(person, label, avatarLetter) {
  const items = getDT2(person);
  const allDone = items.every(i => i.completed && i.title);
  return `
    <div class="dt2-person-col">
      <div class="dt2-person-head">
        <span class="focus-avatar" style="width:26px;height:26px;font-size:11px">${avatarLetter}</span>
        <span class="dt2-person-name">${label}</span>
        <button class="dt2-reset-btn" onclick="resetDailyTop2('${person}')" title="Reset for tomorrow">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        </button>
      </div>
      <div class="dt2-items">
        ${items.map(item => `
          <div class="dt2-card${item.completed ? ' dt2-done' : ''}" id="dt2-card-${person}-${item.slot}">
            <button class="dt2-check${item.completed ? ' dt2-checked' : ''}"
                    onclick="toggleDailyTop2('${person}', ${item.slot})"
                    title="${item.completed ? 'Mark incomplete' : 'Mark done'}">
              ${item.completed ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
            </button>
            <div class="dt2-body">
              <span class="dt2-num">${item.slot}</span>
              <span class="dt2-title${!item.title ? ' dt2-placeholder' : ''}"
                    id="dt2-title-${person}-${item.slot}"
                    onclick="startEditDailyTop2('${person}', ${item.slot})">
                ${item.title ? esc(item.title) : `Click to set priority #${item.slot}…`}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
      ${allDone ? `
        <div class="dt2-celebration" style="margin-top:16px;font-size:14px;padding:14px 16px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Both done!
        </div>` : ''}
    </div>
  `;
}

function renderDailyTop2Page() {
  document.getElementById('page-content').innerHTML = `
    <div class="dt2-page">
      <div class="dt2-header">
        <div>
          <h1 class="page-title" style="margin-bottom:6px">Daily Top 2</h1>
          <p class="dt2-subtitle">2 things each person commits to moving forward today</p>
        </div>
      </div>
      <div class="dt2-two-col">
        ${renderDT2PersonCol('founder', 'Gibran', 'G')}
        ${renderDT2PersonCol('lu', 'Lu', 'L')}
      </div>
    </div>
  `;
}

async function toggleDailyTop2(person, slot) {
  const item = state.dailyTop2.find(i => i.person === person && i.slot === slot);
  const current = item?.completed || false;
  try {
    const updated = await fetchAPI(`${API.dailyTop2}/${person}/${slot}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: !current })
    });
    const i = state.dailyTop2.findIndex(x => x.person === person && x.slot === slot);
    if (i !== -1) state.dailyTop2[i] = updated;
    else state.dailyTop2.push(updated);
    refreshDailyTop2();
  } catch (err) { showToast(err.message, 'error'); }
}

function startEditDailyTop2(person, slot) {
  const item = state.dailyTop2.find(i => i.person === person && i.slot === slot);
  const titleEl = document.getElementById(`dt2-title-${person}-${slot}`);
  if (!titleEl || titleEl.tagName === 'INPUT') return;

  const input = document.createElement('input');
  input.className = 'dt2-input';
  input.value = item?.title || '';
  input.placeholder = `Set priority #${slot} for today…`;
  input.maxLength = 120;
  titleEl.replaceWith(input);
  input.focus();
  if (input.value) input.select();

  let saved = false;
  async function save() {
    if (saved) return; saved = true;
    const title = input.value.trim();
    try {
      const updated = await fetchAPI(`${API.dailyTop2}/${person}/${slot}`, {
        method: 'PUT',
        body: JSON.stringify({ title: title || null })
      });
      const i = state.dailyTop2.findIndex(x => x.person === person && x.slot === slot);
      if (i !== -1) state.dailyTop2[i] = updated;
      else state.dailyTop2.push(updated);
    } catch (err) { showToast(err.message, 'error'); }
    refreshDailyTop2();
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { input.blur(); }
    if (e.key === 'Escape') { saved = true; refreshDailyTop2(); }
  });
  input.addEventListener('blur', save);
}

async function resetDailyTop2(person) {
  try {
    const url = person === 'all' ? `${API.dailyTop2}/reset` : `${API.dailyTop2}/${person}`;
    await fetchAPI(url, { method: 'DELETE' });
    if (person === 'all') {
      state.dailyTop2 = state.dailyTop2.map(i => ({ ...i, title: null, completed: false }));
    } else {
      state.dailyTop2 = state.dailyTop2.map(i =>
        i.person === person ? { ...i, title: null, completed: false } : i
      );
    }
    renderDailyTop2Page();
    showToast('Reset for tomorrow ✓');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// TEAM TASKS PAGE
// ============================================================

function renderTasksPage() {
  const forFounderPending = state.tasks.filter(t => t.assignee === 'for-founder' && !t.archived && !t.completed).length;
  document.getElementById('page-content').innerHTML = `
    <div class="tasks-page">
      <div class="tasks-page-header">
        <div>
          <h1 class="page-title" style="margin-bottom:6px">Team Tasks</h1>
          <p class="dt2-subtitle">Everything the team is working on — by person</p>
        </div>
      </div>
      <div class="tasks-focus-grid">
        <div class="focus-col">
          <div class="focus-col-head">
            <span class="focus-avatar">G</span>
            <span class="focus-col-name">Gibran</span>
          </div>
          <div class="focus-list" id="tasks-founder">${renderTaskList('founder')}</div>
          <button class="focus-add-btn" onclick="startAddTask('founder')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add task
          </button>
        </div>
        <div class="focus-col">
          <div class="focus-col-head">
            <span class="focus-avatar">L</span>
            <span class="focus-col-name">Lu</span>
          </div>
          <div class="focus-list" id="tasks-lu">${renderTaskList('lu')}</div>
          <button class="focus-add-btn" onclick="startAddTask('lu')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add task
          </button>
        </div>
        <div class="focus-col focus-col-review">
          <div class="focus-col-head">
            <span class="focus-avatar focus-avatar-review">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 17H2a3 3 0 000 6h20a3 3 0 000-6z"/><path d="M5.45 9A7 7 0 0119 11"/><path d="M12 2v7"/></svg>
            </span>
            <span class="focus-col-name">For Founder</span>
            <span class="focus-col-badge" style="display:${forFounderPending > 0 ? 'inline-flex' : 'none'}">${forFounderPending}</span>
          </div>
          <div class="focus-list" id="tasks-for-founder">${renderTaskList('for-founder')}</div>
          <button class="focus-add-btn focus-add-btn-review" onclick="startAddTask('for-founder')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Leave for Founder
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderHomePage() {
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 5 ? 'Still at it —' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Metrics
  const activeAffiliates = state.roster.filter(r => r.status === 'active').length;
  const pipelineExcluded = new Set(['signed', 'archived', 'counter_rejected']);
  const inPipeline = state.outreach.filter(o => !pipelineExcluded.has(o.status)).length;
  const signed = state.outreach.filter(o => o.status === 'signed').length;
  const challengers = state.challengers.length;

  // Attention items
  const needsReply = state.outreach.filter(o => o.status === 'replied').length;
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const supportThisMonth = state.support.filter(i => (i.issue_date || '').startsWith(thisMonth)).length;

  // Urgent tasks — overdue or due today/tomorrow
  const urgentTasks = state.tasks
    .filter(t => !t.completed && !t.archived && t.deadline && deadlineSortKey(t.deadline) <= 1)
    .sort((a, b) => deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline));

  // Goal progress ring
  const goal = state.monthlyGoal || 0;
  const goalPct = goal > 0 ? Math.min(activeAffiliates / goal, 1) : 0;
  const r = 38, circ = +(2 * Math.PI * r).toFixed(1);
  const offset = +(circ * (1 - goalPct)).toFixed(1);
  const ringColor = goalPct >= 1 ? 'var(--green)' : goalPct >= 0.6 ? 'var(--accent)' : goalPct > 0 ? 'var(--yellow)' : 'var(--border)';

  // Revenue
  const rev = state.monthlyRevenue || 0;
  const revFmt = rev >= 1000 ? '$' + (rev / 1000).toFixed(1) + 'k' : rev > 0 ? '$' + rev.toLocaleString() : '—';

  document.getElementById('page-content').innerHTML = `
    <div class="home-page">

      <!-- Hero -->
      <div class="home-hero">
        <div class="home-greeting">${greeting}, team.</div>
        <div class="home-date">${dateStr}</div>
      </div>

      <!-- Goal banner — active affiliates + signed + revenue in one place -->
      <div class="home-goal-row">
        <div class="home-goal-ring-wrap">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="7"/>
            <circle class="home-goal-arc"
              data-target="${offset}" data-circ="${circ}"
              cx="44" cy="44" r="${r}" fill="none"
              stroke="${goalPct >= 1 ? '#4ade80' : goalPct > 0 ? '#a5f3a0' : 'rgba(255,255,255,0.25)'}"
              stroke-width="7"
              stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
              stroke-linecap="round" transform="rotate(-90 44 44)"
              style="transition:stroke-dashoffset 0.9s cubic-bezier(0.25,0.46,0.45,0.94)"/>
          </svg>
          <div class="home-goal-center">
            <span class="home-goal-pct">${goal > 0 ? Math.round(goalPct * 100) + '%' : '—'}</span>
          </div>
        </div>

        <div class="home-goal-text">
          <div class="home-goal-headline">
            ${activeAffiliates}${goal > 0 ? ' <span class="home-goal-of">/ ' + goal + '</span>' : ''}
            <span class="home-goal-headline-unit"> active affiliates</span>
          </div>
          <div class="home-goal-status">${goal > 0 ? (goalPct >= 1 ? 'Goal reached!' : `${goal - activeAffiliates} away from your goal`) : 'No monthly goal set'}</div>
          <!-- Signed + Revenue chips — unique data not shown in QA cards -->
          <div class="home-goal-chips">
            <span class="home-goal-chip home-goal-chip-green">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              ${signed} signed
            </span>
            <span class="home-goal-chip home-goal-chip-revenue" onclick="openRevenueEdit()" title="Click to update" style="cursor:pointer">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              ${revFmt} revenue
            </span>
            <button class="home-goal-edit-btn" onclick="openGoalEdit()">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              ${goal > 0 ? 'Edit goal' : 'Set a goal'}
            </button>
          </div>
        </div>

        ${(needsReply > 0 || supportThisMonth > 0) ? `
        <div class="home-attention-inline">
          ${needsReply > 0 ? `
            <div class="home-attention-item" onclick="navigate('outreach')">
              <span class="home-attn-dot home-attn-dot-yellow"></span>
              <span>${needsReply} creator${needsReply !== 1 ? 's' : ''} waiting for a reply</span>
              <span class="home-attn-arrow">→</span>
            </div>` : ''}
          ${supportThisMonth > 0 ? `
            <div class="home-attention-item" onclick="navigate('support')">
              <span class="home-attn-dot home-attn-dot-orange"></span>
              <span>${supportThisMonth} support issue${supportThisMonth !== 1 ? 's' : ''} this month</span>
              <span class="home-attn-arrow">→</span>
            </div>` : ''}
        </div>` : ''}
      </div>

      ${urgentTasks.length > 0 ? `
      <!-- Urgent tasks -->
      <div class="home-urgent-section">
        <div class="home-section-label home-section-label-urgent">Urgent</div>
        <div class="home-urgent-list">
          ${urgentTasks.map(t => {
            const dl = fmtDeadline(t.deadline);
            const aMap = {
              founder:      { lbl: 'G', name: 'Gibran',     cls: 'ua-gibran'  },
              lu:           { lbl: 'L', name: 'Lu',         cls: 'ua-lu'      },
              'for-founder':{ lbl: 'F', name: 'For Review', cls: 'ua-founder' }
            };
            const av = aMap[t.assignee] || { lbl: '?', name: 'Unknown', cls: '' };
            return `<div class="home-urgent-item" onclick="navigate('tasks')">
              <div class="home-urgent-who">
                <span class="home-urgent-avatar ${av.cls}">${av.lbl}</span>
                <span class="home-urgent-name">${av.name}</span>
              </div>
              <span class="home-urgent-title">${esc(t.title)}</span>
              ${dl ? `<span class="task-deadline ${dl.cls}">${dl.text}</span>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Quick Actions — 4-across, each card shows unique data -->
      <div class="home-qa-section">
        <div class="home-section-label">Quick Actions</div>
        <div class="home-qa-grid home-qa-grid-4">
          <button class="home-qa-card" onclick="navigate('outreach')">
            <div class="home-qa-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div class="home-qa-name">Affiliate Outreach</div>
            <div class="home-qa-stat">${inPipeline}</div>
            <div class="home-qa-sub">in pipeline${needsReply > 0 ? `&nbsp;· <span class="qa-alert">${needsReply} need reply</span>` : ''}</div>
          </button>
          <button class="home-qa-card" onclick="navigate('roster')">
            <div class="home-qa-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div class="home-qa-name">Affiliate Roster</div>
            <div class="home-qa-stat">${activeAffiliates}</div>
            <div class="home-qa-sub">active affiliates</div>
          </button>
          <button class="home-qa-card" onclick="navigate('support');setTimeout(openLogIssueModal,150)">
            <div class="home-qa-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div class="home-qa-name">Log Support Issue</div>
            <div class="home-qa-stat">${supportThisMonth}</div>
            <div class="home-qa-sub">issues this month</div>
          </button>
          <button class="home-qa-card" onclick="navigate('challenge')">
            <div class="home-qa-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div class="home-qa-name">Before &amp; Afters</div>
            <div class="home-qa-stat">${challengers}</div>
            <div class="home-qa-sub">challengers enrolled</div>
          </button>
        </div>
      </div>

    </div>
  `;
  // Animate numbers after DOM is painted
  requestAnimationFrame(animateHomeStats);
}

// ============================================================
// GOAL + REVENUE
// ============================================================

async function loadHomeSettings() {
  try {
    const s = await fetchAPI(API.settings);
    state.monthlyGoal    = parseInt(s.monthly_affiliate_goal)    || 0;
    state.monthlyRevenue = parseFloat(s.monthly_affiliate_revenue) || 0;
  } catch {}
}

function openGoalEdit() {
  openModal('Monthly Affiliate Goal', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <p style="color:var(--text-secondary);font-size:14px;margin:0">Set a target for active affiliates — the progress ring on your dashboard will track toward this number.</p>
      <div class="form-group">
        <label class="form-label">Target (active affiliates)</label>
        <input class="form-input" id="goal-input" type="number" min="1" max="9999"
               value="${state.monthlyGoal || ''}" placeholder="e.g. 15">
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        ${state.monthlyGoal ? `<button class="btn btn-secondary btn-sm" onclick="saveGoal(0)">Clear goal</button>` : '<span></span>'}
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="saveGoal()">Set Goal</button>
        </div>
      </div>
    </div>
  `);
  setTimeout(() => { const el = document.getElementById('goal-input'); el?.focus(); el?.select(); }, 60);
}

async function saveGoal(override) {
  const val = override !== undefined ? override : (parseInt(document.getElementById('goal-input')?.value) || 0);
  try {
    await fetchAPI(API.settings, { method: 'PUT', body: JSON.stringify({ monthly_affiliate_goal: val || null }) });
    state.monthlyGoal = val;
    closeModal();
    renderHomePage();
  } catch (err) { showToast(err.message, 'error'); }
}

function openRevenueEdit() {
  openModal('Affiliate Revenue — This Month', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <p style="color:var(--text-secondary);font-size:14px;margin:0">Manually track affiliate-driven revenue for this month. Update anytime.</p>
      <div class="form-group">
        <label class="form-label">Revenue ($)</label>
        <input class="form-input" id="revenue-input" type="number" min="0" step="1"
               value="${state.monthlyRevenue || ''}" placeholder="e.g. 4200">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveRevenue()">Update</button>
      </div>
    </div>
  `);
  setTimeout(() => { const el = document.getElementById('revenue-input'); el?.focus(); el?.select(); }, 60);
}

async function saveRevenue() {
  const val = parseFloat(document.getElementById('revenue-input')?.value) || 0;
  try {
    await fetchAPI(API.settings, { method: 'PUT', body: JSON.stringify({ monthly_affiliate_revenue: val || null }) });
    state.monthlyRevenue = val;
    closeModal();
    renderHomePage();
    showToast('Revenue updated');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// IDEA BOARD
// ============================================================

async function loadIdeas() {
  state.ideas = await fetchAPI(API.ideas);
}

function renderIdeasPage() {
  const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'];
  document.getElementById('page-content').innerHTML = `
    <div class="ideas-page">
      <div class="ideas-header">
        <div>
          <h1 class="page-title" style="margin-bottom:6px">Idea Board</h1>
          <p class="ideas-subtitle">Random ideas to revisit — nothing gets lost</p>
        </div>
        <button class="btn btn-primary" onclick="openIdeaModal(null)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Idea
        </button>
      </div>
      ${state.ideas.length === 0
        ? `<div class="ideas-empty">
             <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);margin-bottom:12px"><path d="M12 2a7 7 0 015.292 11.647l-.792 1.353A2 2 0 0114.764 16H9.236a2 2 0 01-1.736-1l-.792-1.353A7 7 0 0112 2z"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="10" y1="23" x2="14" y2="23"/></svg>
             <p>No ideas yet — drop anything here to revisit later</p>
           </div>`
        : `<div class="ideas-grid">
             ${state.ideas.map(idea => `
               <div class="idea-card idea-${idea.color}" onclick="openIdeaModal('${idea.id}')">
                 <div class="idea-body">${esc(idea.body)}</div>
                 <div class="idea-footer">
                   <span class="idea-date">${fmtDate(idea.created_at)}</span>
                 </div>
               </div>
             `).join('')}
           </div>`}
    </div>
  `;
}

function openIdeaModal(id) {
  const idea = id ? state.ideas.find(x => x.id === id) : null;
  const isEdit = !!idea;
  const currentColor = idea?.color || 'yellow';
  const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'];

  openModal(isEdit ? 'Edit Idea' : 'New Idea', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">Idea</label>
        <textarea class="form-input" id="idea-body" rows="5" placeholder="Write your idea here…" style="resize:vertical">${isEdit ? esc(idea.body) : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="idea-color-row">
          ${COLORS.map(c => `
            <button class="idea-color-dot idea-dot-${c}${currentColor === c ? ' idea-dot-active' : ''}"
                    onclick="pickIdeaColor('${c}')" data-color="${c}"></button>
          `).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:space-between">
        <div>${isEdit ? `<button class="btn btn-danger btn-sm" onclick="deleteIdea('${id}')">Delete</button>` : ''}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="saveIdea(${id ? `'${id}'` : 'null'})">
            ${isEdit ? 'Save' : 'Add Idea'}
          </button>
        </div>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('idea-body')?.focus(), 60);
}

function pickIdeaColor(color) {
  document.querySelectorAll('.idea-color-dot').forEach(b => b.classList.toggle('idea-dot-active', b.dataset.color === color));
}

async function saveIdea(id) {
  const body  = document.getElementById('idea-body')?.value.trim();
  const color = document.querySelector('.idea-color-dot.idea-dot-active')?.dataset.color || 'yellow';
  if (!body) { showToast('Write something first', 'error'); return; }
  try {
    if (id) {
      const updated = await fetchAPI(`${API.ideas}/${id}`, { method: 'PUT', body: JSON.stringify({ body, color }) });
      const i = state.ideas.findIndex(x => x.id === id);
      if (i !== -1) state.ideas[i] = updated;
    } else {
      const created = await fetchAPI(API.ideas, { method: 'POST', body: JSON.stringify({ body, color }) });
      state.ideas.unshift(created);
    }
    closeModal();
    if (state.currentPage === 'ideas') renderIdeasPage();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteIdea(id) {
  try {
    await fetchAPI(`${API.ideas}/${id}`, { method: 'DELETE' });
    state.ideas = state.ideas.filter(x => x.id !== id);
    closeModal();
    if (state.currentPage === 'ideas') renderIdeasPage();
    showToast('Idea deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// SIDEBAR COLLAPSE
// ============================================================

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const revealBtn = document.getElementById('sidebar-reveal-btn');
  const isHidden = sidebar.classList.toggle('sidebar-hidden');
  if (revealBtn) revealBtn.style.display = isHidden ? 'flex' : 'none';
  localStorage.setItem('sidebar-hidden', isHidden ? '1' : '0');
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Restore sidebar collapse state from localStorage
  const sidebarHidden = localStorage.getItem('sidebar-hidden') === '1';
  if (sidebarHidden) {
    document.querySelector('.sidebar')?.classList.add('sidebar-hidden');
    const revealBtn = document.getElementById('sidebar-reveal-btn');
    if (revealBtn) revealBtn.style.display = 'flex';
  }

  // Regular nav items (not the roster group trigger or Creative Lab items — handled separately)
  document.querySelectorAll('.nav-item:not(.nav-group-trigger):not(.nav-cl-item)').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });
  // Roster group trigger — navigate to roster (opens sub-menu automatically)
  const rosterTrigger = document.querySelector('.nav-group-trigger[data-page="roster"]');
  if (rosterTrigger) {
    rosterTrigger.addEventListener('click', e => { e.preventDefault(); navigate('roster'); });
  }
  // Roster sub-nav items — switch tab then navigate
  document.querySelectorAll('.nav-sub-item[data-roster-tab]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      state.rosterTab = el.dataset.rosterTab;
      navigate('roster');
    });
  });
  // Creative Lab nav items — switch tab then navigate to scripts page
  document.querySelectorAll('.nav-cl-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      state.contentLabTab = el.dataset.scriptsTab;
      navigate('scripts');
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
    loadChallengers().catch(err => console.error('Challengers load failed:', err)),
    loadSupport().catch(err => console.error('Support load failed:', err)),
    loadCustomIssueTypes().catch(() => {}),
    loadTasks().catch(() => {}),
    loadDailyTop2().catch(() => {}),
    loadHomeSettings().catch(() => {}),
    loadIdeas().catch(() => {}),
    checkTikTokStatus().catch(() => {})
  ]);

  const params = new URLSearchParams(window.location.search);
  const tiktokResult = params.get('tiktok');
  const startPage = params.get('page') || 'home';
  if (tiktokResult === 'connected') showToast('TikTok Shop connected!');
  if (tiktokResult === 'error')     showToast('TikTok connection failed. Try again.', 'error');
  if (tiktokResult) window.history.replaceState({}, '', '/');

  navigate(startPage);
});

// ============================================================
// BBL CHALLENGE TRACKER
// ============================================================

async function loadChallengers() {
  state.challengers = await fetchAPI(`${API.challenge}/challengers`);
}

function challengeStatusColor(status) {
  const map = { active: 'blue', completed: 'green', disqualified: 'red', refund_approved: 'purple' };
  return map[status] || 'gray';
}

function challengeStatusLabel(status) {
  const map = { active: 'Active', completed: 'Completed', disqualified: 'Disqualified', refund_approved: 'Refund Approved' };
  return map[status] || status;
}

// Returns the next check-in due info for a challenger
function nextCheckin(checkins) {
  if (!checkins) return null;
  const pending = checkins
    .filter(c => !c.submitted_at)
    .sort((a, b) => new Date(a.window_closes_at) - new Date(b.window_closes_at));
  return pending[0] || null;
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function checkinBadge(checkin, now) {
  if (!checkin) return `<span class="badge badge-gray" style="font-size:10px">—</span>`;
  if (checkin.submitted_at) return `<span class="badge badge-green" style="font-size:10px">✓</span>`;
  const opens = new Date(checkin.window_opens_at);
  const closes = checkin.grace_closes_at ? new Date(checkin.grace_closes_at) : new Date(checkin.window_closes_at);
  if (now > closes) return `<span class="badge badge-red" style="font-size:10px">Missed</span>`;
  if (now >= opens) return `<span class="badge badge-yellow" style="font-size:10px">Due</span>`;
  return `<span class="badge badge-gray" style="font-size:10px">Upcoming</span>`;
}

function renderChallengePage() {
  const now = new Date();
  const filtered = state.challengeFilter === 'all'
    ? state.challengers
    : state.challengers.filter(c => c.status === state.challengeFilter);

  const total    = state.challengers.length;
  const active   = state.challengers.filter(c => c.status === 'active').length;
  const completed = state.challengers.filter(c => c.status === 'completed').length;
  const eligible  = state.challengers.filter(c => c.status === 'refund_approved').length;

  const filterBtns = ['all', 'active', 'completed', 'disqualified', 'refund_approved'].map(f => {
    const labels = { all: 'All', active: 'Active', completed: 'Completed', disqualified: 'Disqualified', refund_approved: 'Refund Approved' };
    const active_ = f === state.challengeFilter;
    return `<button class="btn btn-sm ${active_ ? 'btn-primary' : 'btn-secondary'}" onclick="setChallengeFilter('${f}')">${labels[f]}</button>`;
  }).join('');

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Before & Afters</h1>
        <p class="page-subtitle">Win Your Money Back · ${total} total entrant${total !== 1 ? 's' : ''}</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <a href="/challenge/signup" target="_blank" class="btn btn-secondary btn-sm">Signup Link</a>
        <button class="btn btn-secondary btn-sm" onclick="loadChallengers().then(renderChallengePage)">Refresh</button>
      </div>
    </div>

    <div class="stat-cards" style="margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total Entrants</div>
      </div>
      <div class="stat-card">
        <div class="stat-value blue">${active}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value green">${completed}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value accent">${eligible}</div>
        <div class="stat-label">Refund Approved</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${filterBtns}
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Order #</th>
            <th>Signup</th>
            <th>Status</th>
            <th style="text-align:center">W2</th>
            <th style="text-align:center">W4</th>
            <th style="text-align:center">W6</th>
            <th style="text-align:center">W8</th>
            <th>Next Due</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 ? `
            <tr><td colspan="10" style="text-align:center;padding:48px;color:var(--text-muted)">
              ${state.challengeFilter === 'all' ? 'No challengers yet. Share the signup link to get started.' : 'No challengers in this filter.'}
            </td></tr>
          ` : filtered.map(c => {
            const checkins = c.challenge_checkins || [];
            const byWeek = { 2: null, 4: null, 6: null, 8: null };
            checkins.forEach(ci => { byWeek[ci.week_number] = ci; });
            const next = nextCheckin(checkins);
            const nextLabel = next
              ? (() => { const d = daysUntil(next.window_closes_at); return d > 0 ? `W${next.week_number} · in ${d}d` : `W${next.week_number} · overdue`; })()
              : (c.status === 'completed' ? 'Done' : '—');
            const hasStrongContent = checkins.some(ci => ci.is_strong_content);
            return `
            <tr class="clickable-row" onclick="openChallengerDetail('${c.id}')">
              <td>
                <div style="display:flex;flex-direction:column;gap:2px">
                  <span style="font-weight:600">${esc(c.name)}</span>
                  <span style="font-size:11.5px;color:var(--text-muted)">${esc(c.email)}</span>
                </div>
              </td>
              <td style="color:var(--text-secondary);font-size:13px">${esc(c.order_number)}</td>
              <td style="color:var(--text-secondary);font-size:13px">${fmtDateShort(c.signup_date)}</td>
              <td><span class="badge badge-${challengeStatusColor(c.status)}">${challengeStatusLabel(c.status)}</span></td>
              <td style="text-align:center">${checkinBadge(byWeek[2], now)}</td>
              <td style="text-align:center">${checkinBadge(byWeek[4], now)}</td>
              <td style="text-align:center">${checkinBadge(byWeek[6], now)}</td>
              <td style="text-align:center">${checkinBadge(byWeek[8], now)}</td>
              <td style="font-size:12.5px;color:${next && daysUntil(next.window_closes_at) < 0 ? 'var(--red)' : 'var(--text-secondary)'}">${nextLabel}</td>
              <td onclick="event.stopPropagation()" style="white-space:nowrap;text-align:right">
                ${hasStrongContent ? `<span style="font-size:11px;color:var(--yellow);margin-right:8px">★ Content</span>` : ''}
                ${c.status === 'completed' ? `<button class="btn btn-primary btn-sm" style="margin-right:6px" onclick="event.stopPropagation();approveRefund('${c.id}')">Approve Refund</button>` : ''}
                <button class="sup-action-btn sup-delete-btn" onclick="event.stopPropagation();deleteChallenger('${c.id}')" title="Delete">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setChallengeFilter(filter) {
  state.challengeFilter = filter;
  renderChallengePage();
}

async function deleteChallenger(id) {
  if (!confirm('Delete this challenger and all their check-in data? This cannot be undone.')) return;
  try {
    await fetchAPI(`${API.challenge}/challengers/${id}`, { method: 'DELETE' });
    state.challengers = state.challengers.filter(c => c.id !== id);
    closeDetailPanel();
    renderChallengePage();
    showToast('Challenger deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

async function approveRefund(challengerId) {
  if (!confirm('Mark refund as approved? This will notify the team to process the refund in Shopify.')) return;
  try {
    const updated = await fetchAPI(`${API.challenge}/challengers/${challengerId}/approve-refund`, { method: 'POST' });
    const i = state.challengers.findIndex(c => c.id === challengerId);
    if (i !== -1) state.challengers[i] = { ...state.challengers[i], ...updated };
    renderChallengePage();
    showToast('Refund approved — team notified ✓');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Challenger Detail Drawer ─────────────────────────────────────

async function openChallengerDetail(id) {
  state.selectedChallengerId = id;
  const challenger = state.challengers.find(c => c.id === id);
  if (!challenger) return;

  const panel = document.getElementById('detail-panel');
  const title = document.getElementById('detail-drawer-title');
  const body  = document.getElementById('detail-drawer-body');

  title.textContent = challenger.name;
  body.innerHTML = `<div style="padding:20px;color:var(--text-muted);font-size:13px">Loading photos...</div>`;
  panel.style.display = 'flex';

  // Render skeleton first, then load photos
  body.innerHTML = renderChallengerDetailBody(challenger, {});
  await loadChallengerPhotos(challenger);
}

function renderChallengerDetailBody(challenger, photos) {
  const checkins = challenger.challenge_checkins || [];
  const byWeek = { 0: { photo_url: challenger.week0_photo_url, week0: true }, 2: null, 4: null, 6: null, 8: null };
  checkins.forEach(ci => { byWeek[ci.week_number] = ci; });

  const statusColor = challengeStatusColor(challenger.status);
  const statusLabel = challengeStatusLabel(challenger.status);
  const now = new Date();

  return `
    <div style="padding:20px 22px;display:flex;flex-direction:column;gap:18px">

      <!-- Meta -->
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge badge-${statusColor}" style="font-size:12px">${statusLabel}</span>
          <div style="display:flex;gap:8px;align-items:center">
            ${challenger.status === 'completed'
              ? `<button class="btn btn-primary btn-sm" onclick="approveRefund('${challenger.id}')">Approve Refund</button>`
              : ''}
            <button class="btn btn-danger-outline btn-sm" onclick="deleteChallenger('${challenger.id}')">Delete</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
          <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Email</div>
            <div style="font-size:13px;font-weight:500">${esc(challenger.email)}</div>
          </div>
          <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Order #</div>
            <div style="font-size:13px;font-weight:500">${esc(challenger.order_number)}</div>
          </div>
          <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Signed up</div>
            <div style="font-size:13px;font-weight:500">${fmtDate(challenger.signup_date)}</div>
          </div>
        </div>
      </div>

      <!-- Check-in panels -->
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)">Check-Ins</div>

        ${renderCheckinPanel(0, byWeek[0], photos, challenger, now)}
        ${[2,4,6,8].map(w => renderCheckinPanel(w, byWeek[w], photos, challenger, now)).join('')}
      </div>
    </div>
  `;
}

function renderCheckinPanel(week, checkin, photos, challenger, now) {
  const isWeek0 = week === 0;
  const label = isWeek0 ? 'Week 0 — Before Photo' : `Week ${week} Check-In`;
  const photoId = isWeek0 ? `w0-photo-${challenger.id}` : (checkin ? `ci-photo-${checkin.id}` : null);
  const photoUrl = photos[photoId];

  let statusBadge = '';
  let bodyContent = '';

  if (isWeek0) {
    statusBadge = checkin?.photo_url
      ? `<span class="badge badge-green" style="font-size:10px">Submitted</span>`
      : `<span class="badge badge-gray" style="font-size:10px">No photo</span>`;
    if (checkin?.photo_url) {
      bodyContent = renderPhotoArea(photoUrl, photoId, isWeek0 ? null : checkin?.id, true, false);
    }
  } else if (!checkin) {
    statusBadge = `<span class="badge badge-gray" style="font-size:10px">No data</span>`;
  } else if (checkin.submitted_at) {
    statusBadge = `<span class="badge badge-green" style="font-size:10px">Submitted ${fmtDateShort(checkin.submitted_at)}</span>`;
    const starColor = checkin.is_strong_content ? 'var(--yellow)' : 'var(--text-muted)';
    const starTitle = checkin.is_strong_content ? 'Unflag content' : 'Flag as strong content';
    bodyContent = `
      ${renderPhotoArea(photoUrl, photoId, checkin.id, false, checkin.is_strong_content)}
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--text-muted)">Used consistently: <strong style="color:${checkin.used_consistently ? 'var(--green)' : 'var(--orange)'}">${checkin.used_consistently ? 'Yes' : 'No'}</strong></span>
        <button class="btn btn-sm btn-secondary" style="color:${starColor}" title="${starTitle}"
          onclick="toggleCheckinFlag('${checkin.id}', '${challenger.id}')">
          ${checkin.is_strong_content ? '★' : '☆'} ${checkin.is_strong_content ? 'Flagged' : 'Flag Content'}
        </button>
      </div>
      ${checkin.notes ? `<div style="font-size:12.5px;color:var(--text-secondary);margin-top:6px;line-height:1.5">"${esc(checkin.notes)}"</div>` : ''}
    `;
  } else {
    const opens  = new Date(checkin.window_opens_at);
    const closes = checkin.grace_closes_at ? new Date(checkin.grace_closes_at) : new Date(checkin.window_closes_at);
    if (now > closes) {
      statusBadge = `<span class="badge badge-red" style="font-size:10px">Missed</span>`;
    } else if (now >= opens) {
      statusBadge = `<span class="badge badge-yellow" style="font-size:10px">Window open · due ${fmtDateShort(checkin.window_closes_at)}</span>`;
    } else {
      statusBadge = `<span class="badge badge-gray" style="font-size:10px">Opens ${fmtDateShort(checkin.window_opens_at)}</span>`;
    }
  }

  return `
    <div style="background:var(--bg-tertiary);border-radius:10px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${bodyContent ? '10px' : '0'}">
        <span style="font-size:13px;font-weight:600">${label}</span>
        ${statusBadge}
      </div>
      ${bodyContent}
    </div>
  `;
}

function renderPhotoArea(signedUrl, photoId, checkinId, isWeek0, isFlagged) {
  if (!signedUrl) {
    return `<div id="${photoId}-container" style="background:var(--bg-elevated);border-radius:8px;height:80px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px">Loading photo...</div>`;
  }
  return `
    <div style="position:relative;display:inline-block;width:100%">
      <img id="${photoId}-img" src="${signedUrl}" alt="Check-in photo"
        style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;display:block">
      <a href="${signedUrl}" download class="btn btn-secondary btn-sm"
        style="position:absolute;bottom:8px;right:8px;font-size:11px;padding:4px 10px">Download</a>
    </div>
  `;
}

async function loadChallengerPhotos(challenger) {
  const checkins = challenger.challenge_checkins || [];
  const panel    = document.getElementById('detail-panel');
  if (!panel || panel.style.display === 'none') return;

  // Load week 0 photo
  if (challenger.week0_photo_url) {
    try {
      const { url } = await fetchAPI(`${API.challenge}/challengers/${challenger.id}/week0-photo`);
      const photoId = `w0-photo-${challenger.id}`;
      // Re-render with the URL available
      const body = document.getElementById('detail-drawer-body');
      if (body && state.selectedChallengerId === challenger.id) {
        body.innerHTML = renderChallengerDetailBody(challenger, { [photoId]: url });
        // Load check-in photos after week 0 renders
        loadCheckinPhotos(checkins, challenger);
      }
    } catch { /* non-fatal */ }
  } else {
    loadCheckinPhotos(checkins, challenger);
  }
}

async function loadCheckinPhotos(checkins, challenger) {
  const submitted = checkins.filter(ci => ci.submitted_at && ci.photo_url);
  for (const ci of submitted) {
    if (state.selectedChallengerId !== challenger.id) break;
    try {
      const { url } = await fetchAPI(`${API.challenge}/checkins/${ci.id}/photo`);
      const imgEl = document.getElementById(`ci-photo-${ci.id}-img`);
      const container = document.getElementById(`ci-photo-${ci.id}-container`);
      if (imgEl) {
        imgEl.src = url;
      } else if (container) {
        container.outerHTML = renderPhotoArea(url, `ci-photo-${ci.id}`, ci.id, false, ci.is_strong_content);
      }
    } catch { /* non-fatal */ }
  }
}

async function toggleCheckinFlag(checkinId, challengerId) {
  try {
    const updated = await fetchAPI(`${API.challenge}/checkins/${checkinId}/flag`, { method: 'PUT' });
    // Update in state
    const challenger = state.challengers.find(c => c.id === challengerId);
    if (challenger) {
      const ci = (challenger.challenge_checkins || []).find(c => c.id === checkinId);
      if (ci) ci.is_strong_content = updated.is_strong_content;
    }
    showToast(updated.is_strong_content ? 'Flagged as strong content ★' : 'Flag removed');
    // Re-render just the detail body (no photo reload needed)
    const body = document.getElementById('detail-drawer-body');
    if (body && state.selectedChallengerId === challengerId) {
      const c = state.challengers.find(x => x.id === challengerId);
      if (c) {
        // Preserve loaded photo URLs by extracting them from DOM
        const photoMap = {};
        document.querySelectorAll('[id$="-img"]').forEach(img => {
          const key = img.id.replace('-img', '');
          if (img.src) photoMap[key] = img.src;
        });
        body.innerHTML = renderChallengerDetailBody(c, photoMap);
      }
    }
    if (state.currentPage === 'challenge') renderChallengePage();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// BRAND FINANCE TRACKER  (bf_ namespace, localStorage-backed)
// ============================================================

// ── Constants ────────────────────────────────────────────────
const BF_K = {
  LOG:     'blc_weekly_log',
  POS:     'blc_pos',
  ACCOUNTS:'blc_accounts',
  PRICING: 'blc_pricing_notes',
  APIKEY:  'blc_apikey'
};

// ── Scan session state ────────────────────────────────────────
let bf_scanContext = '', bf_scanData = null, bf_scanCallback = null;

// ── Charts registry ──────────────────────────────────────────
const bf_charts = {};
function bf_destroyChart(id) {
  if (bf_charts[id]) { bf_charts[id].destroy(); delete bf_charts[id]; }
}

// ── Utilities ────────────────────────────────────────────────
function bf_uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function bf_$$(v, dec) {
  dec = (dec === undefined) ? 2 : dec;
  if (v === null || v === undefined || isNaN(v)) return '$—';
  return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function bf_fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function bf_fmtDateS(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function bf_today() { return new Date().toISOString().split('T')[0]; }

function bf_addDays(s, n) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function bf_daysFrom(s) {
  if (!s) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(s + 'T00:00:00') - t) / 86400000);
}

function bf_N(v) { return Number(v || 0).toLocaleString('en-US'); }
function bf_pct(v) { return v.toFixed(1) + '%'; }

// ── Data ─────────────────────────────────────────────────────
function bf_load(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function bf_save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function bf_getLog()    { return bf_load(BF_K.LOG)      || []; }
function bf_getPOs()    { return bf_load(BF_K.POS)      || []; }
function bf_getAccs()   { return bf_load(BF_K.ACCOUNTS) || {}; }
function bf_getPNotes() { return bf_load(BF_K.PRICING)  || {}; }
function bf_getApiKey() { return localStorage.getItem(BF_K.APIKEY) || ''; }

function bf_seed() {
  if (!bf_load(BF_K.PRICING)) {
    bf_save(BF_K.PRICING, { '29.99': '', '34.99': '', '36.99': '' });
  }
}

// ── Metrics ──────────────────────────────────────────────────
function bf_latestLog() {
  const l = bf_getLog();
  if (!l.length) return null;
  return [...l].sort((a, b) => b.week_ending.localeCompare(a.week_ending))[0];
}
function bf_sortedLog() {
  return [...bf_getLog()].sort((a, b) => a.week_ending.localeCompare(b.week_ending));
}
function bf_last4() {
  return [...bf_getLog()].sort((a, b) => b.week_ending.localeCompare(a.week_ending)).slice(0, 4);
}
function bf_wkU(w) { return (w.tiktok_orders || 0) + (w.amazon_orders || 0) + (w.website_orders || 0); }
function bf_wkR(w) { return (w.tiktok_revenue || 0) + (w.amazon_revenue || 0) + (w.website_revenue || 0); }
function bf_wkS(w) { return (w.tiktok_ad_spend || 0) + (w.amazon_ad_spend || 0) + (w.website_ad_spend || 0) + (w.google_spend || 0) + (w.meta_spend || 0); }

function bf_avgDailyU() {
  const w = bf_last4();
  if (!w.length) return 0;
  return w.reduce((s, x) => s + bf_wkU(x), 0) / (w.length * 7);
}
function bf_runway() {
  const l = bf_latestLog(); if (!l) return null;
  const v = bf_avgDailyU(); if (!v) return null;
  return Math.round((l.inventory_units || 0) / v);
}
function bf_runwayPill(d) {
  if (d > 45) return ['bf-pill-green',  '✅ You\'re good'];
  if (d > 15) return ['bf-pill-yellow', '⚠️ Getting low'];
  return             ['bf-pill-red',    '🚨 Order more now!'];
}
function bf_runwayColor(d) {
  if (d > 45) return 'var(--green)';
  if (d > 15) return 'var(--yellow)';
  return 'var(--red)';
}
function bf_netPos() {
  const a = bf_getAccs(), pos = bf_getPOs();
  const liquid   = (a.feel_like_sunday?.balance || 0) + (a.mims_media?.balance || 0) + (a.personal_checking?.balance || 0);
  const incoming = (a.tiktok_hold?.balance || 0) + (a.amazon_available?.balance || 0) + (a.amazon_deferred?.balance || 0);
  const amex     = a.amex?.balance || 0;
  const cutoff   = new Date(); cutoff.setDate(cutoff.getDate() + 30);
  const posDue   = pos.filter(p => p.due_date && new Date(p.due_date + 'T00:00:00') <= cutoff && p.status !== 'paid')
                      .reduce((s, p) => s + Math.max(0, (p.total_cost || 0) - (p.paid_to_date || 0)), 0);
  return { liquid, incoming, amex, posDue, net: liquid + incoming - amex - posDue };
}

// ── Status badges ────────────────────────────────────────────
function bf_statusBadge(s) {
  const m = {
    before_shipment:   ['bf-badge-gray',   '⏳ Before Shipment'],
    before_production: ['bf-badge-gray',   '⏳ Before Production'],
    on_order:          ['bf-badge-blue',   '📬 On Order'],
    on_delivery:       ['bf-badge-yellow', '🚢 On Delivery'],
    paid:              ['bf-badge-green',  '✅ Paid']
  };
  const [cls, label] = m[s] || ['bf-badge-gray', s || 'Unknown'];
  return `<span class="bf-badge ${cls}">${label}</span>`;
}
function bf_statusOpts(sel) {
  return [
    ['before_shipment',   'Before Shipment'],
    ['before_production', 'Before Production'],
    ['on_order',          'On Order'],
    ['on_delivery',       'On Delivery'],
    ['paid',              'Paid']
  ].map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
}

// ── API Key UI ────────────────────────────────────────────────
function bf_updateKeyUI() {
  const has = !!bf_getApiKey();
  const dot = document.getElementById('bf-key-dot');
  const lbl = document.getElementById('bf-key-label');
  if (dot) dot.className = 'bf-key-dot' + (has ? ' ok' : '');
  if (lbl) lbl.textContent = has ? 'API Key ✓ (click to change)' : 'Set API Key for Screenshots';
}

function bf_showApiKeyModal() {
  const cur = bf_getApiKey();
  openModal('🔑 Claude API Key', `
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:18px;line-height:1.6">
      The screenshot scanner uses <strong>Claude AI</strong> to read your screenshots and extract the numbers automatically.<br><br>
      Get a free API key from <strong>anthropic.com → Console → API Keys</strong>.<br>
      Your key is saved only on this device.
    </p>
    <div class="dp-form-group" style="margin-bottom:18px">
      <label class="form-label">Anthropic API Key</label>
      <input type="password" id="bf-api-key-input" class="dp-input" placeholder="sk-ant-api03-..." value="${esc(cur)}" autocomplete="off">
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="bf_saveApiKeyFromModal()">Save Key</button>
      ${cur ? `<button class="btn btn-danger-outline" onclick="bf_clearApiKey()">Remove Key</button>` : ''}
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function bf_saveApiKeyFromModal() {
  const v = document.getElementById('bf-api-key-input')?.value.trim();
  if (!v) { showToast('Please enter a key', 'error'); return; }
  localStorage.setItem(BF_K.APIKEY, v);
  closeModal();
  bf_updateKeyUI();
  showToast('API key saved — screenshot scanning is ready!');
}

function bf_clearApiKey() {
  if (!confirm('Remove the API key? Screenshot scanning will stop working.')) return;
  localStorage.removeItem(BF_K.APIKEY);
  closeModal();
  bf_updateKeyUI();
  showToast('API key removed');
}

// ── AI Screenshot Scanner ─────────────────────────────────────
function bf_fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function bf_getMime(file) {
  if (file.type === 'image/png')  return 'image/png';
  if (file.type === 'image/webp') return 'image/webp';
  if (file.type === 'image/gif')  return 'image/gif';
  return 'image/jpeg';
}
async function bf_callClaude(b64, mime, prompt) {
  const key = bf_getApiKey();
  if (!key) throw new Error('NO_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
        { type: 'text', text: prompt }
      ] }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  const text = data.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse response — try a clearer screenshot');
  return JSON.parse(match[0]);
}

const BF_PROMPTS = {
  weekly: `You are reading an e-commerce sales dashboard screenshot. Extract all visible sales data.
Return ONLY a JSON object with exactly these fields (use 0 for anything not visible, no dollar signs or commas):
{"tiktok_orders":0,"tiktok_revenue":0,"tiktok_ad_spend":0,"amazon_orders":0,"amazon_revenue":0,"amazon_ad_spend":0,"website_orders":0,"website_revenue":0,"website_ad_spend":0,"google_spend":0,"meta_spend":0,"inventory_units":0}
Return ONLY the JSON, no explanation.`,
  accounts: `You are reading a financial screenshot (bank, Stripe, TikTok Shop, Amazon Seller Central, etc). Extract any dollar balances visible.
Return ONLY a JSON object (use null for anything NOT visible, numbers only, no $ signs or commas):
{"feel_like_sunday":null,"mims_media":null,"personal_checking":null,"investment":null,"amex_balance":null,"tiktok_hold":null,"tiktok_next_payout":null,"amazon_available":null,"amazon_deferred":null}
Return ONLY the JSON, no explanation.`,
  po: `You are reading an invoice, PO, or payment confirmation screenshot. Extract key details.
Return ONLY a JSON object (numbers only, no $ or commas, dates as YYYY-MM-DD or empty string):
{"vendor":"","description":"","total_cost":0,"paid_to_date":0,"due_date":"","notes":""}
Return ONLY the JSON, no explanation.`
};

const BF_EXTRACT_LABELS = {
  weekly:   { tiktok_orders: 'TikTok Orders', tiktok_revenue: 'TikTok Revenue', tiktok_ad_spend: 'TikTok Ad Spend', amazon_orders: 'Amazon Orders', amazon_revenue: 'Amazon Revenue', amazon_ad_spend: 'Amazon Ad Spend', website_orders: 'Website Orders', website_revenue: 'Website Revenue', google_spend: 'Google Ads', meta_spend: 'Meta Ads', inventory_units: 'Units In Stock' },
  accounts: { feel_like_sunday: 'Feel Like Sunday LLC', mims_media: 'Mims Media', personal_checking: 'Personal Checking', investment: 'Investment', amex_balance: 'Amex Balance', tiktok_hold: 'TikTok On Hold', tiktok_next_payout: 'Next Payout', amazon_available: 'Amazon Available', amazon_deferred: 'Amazon Deferred' },
  po:       { vendor: 'Vendor', description: 'Description', total_cost: 'Total Cost', paid_to_date: 'Paid So Far', due_date: 'Due Date', notes: 'Notes' }
};

function bf_showScanModal(context, callback) {
  if (!bf_getApiKey()) { bf_showApiKeyModal(); return; }
  bf_scanContext = context;
  bf_scanData = null;
  bf_scanCallback = callback;
  openModal('📸 Scan Screenshot', `
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Drop any screenshot — Claude will read the numbers automatically.</p>
    <input type="file" id="bf-scan-file" accept="image/*" style="display:none" onchange="bf_handleScanFile(event)">
    <div class="bf-drop-zone" id="bf-scan-dz" onclick="bf_triggerScanFile()" ondragover="bf_dzDragOver(event)" ondragleave="bf_dzDragLeave()" ondrop="bf_dzDrop(event)">
      <div id="bf-scan-dz-inner">
        <div style="font-size:28px;margin-bottom:8px">📸</div>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">Drop your screenshot here</div>
        <div style="font-size:12px;color:var(--text-muted)">or click to choose a file · PNG, JPG, WEBP</div>
      </div>
    </div>
    <div id="bf-scan-extracted" style="display:none"></div>
    <div id="bf-scan-actions" style="display:none;margin-top:14px;gap:8px">
      <button class="btn btn-primary" onclick="bf_applyScanData()">✓ Use This Data</button>
      <button class="btn btn-secondary" onclick="bf_resetScan()">Try Different Screenshot</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function bf_triggerScanFile() { document.getElementById('bf-scan-file')?.click(); }
function bf_dzDragOver(e) { e.preventDefault(); document.getElementById('bf-scan-dz')?.classList.add('drag-over'); }
function bf_dzDragLeave() { document.getElementById('bf-scan-dz')?.classList.remove('drag-over'); }
function bf_dzDrop(e) { e.preventDefault(); bf_dzDragLeave(); const f = e.dataTransfer.files[0]; if (f) bf_processScanFile(f); }
function bf_handleScanFile(e) { const f = e.target.files[0]; if (f) bf_processScanFile(f); }

async function bf_processScanFile(file) {
  const dz        = document.getElementById('bf-scan-dz');
  const inner     = document.getElementById('bf-scan-dz-inner');
  const extracted = document.getElementById('bf-scan-extracted');
  const actions   = document.getElementById('bf-scan-actions');
  if (!dz || !inner) return;
  dz.className = 'bf-drop-zone loading';
  inner.innerHTML = `<div class="spinner"></div><div style="font-size:14px;font-weight:600;color:var(--accent);margin-top:8px">Claude is reading your screenshot…</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">Usually takes 5–10 seconds</div>`;
  try {
    const b64  = await bf_fileToB64(file);
    const mime = bf_getMime(file);
    const data = await bf_callClaude(b64, mime, BF_PROMPTS[bf_scanContext]);
    bf_scanData = data;
    const imgUrl = URL.createObjectURL(file);
    inner.innerHTML = `<img src="${imgUrl}" style="max-height:120px;max-width:100%;border-radius:8px;object-fit:contain">`;
    dz.className = 'bf-drop-zone done';
    const labels = BF_EXTRACT_LABELS[bf_scanContext] || {};
    const rows = Object.entries(data).filter(([k, v]) => v !== null && v !== 0 && v !== '').map(([k, v]) => {
      const label = labels[k] || k;
      let display = v;
      if (typeof v === 'number' && ['revenue','cost','spend','balance','hold','available','deferred','total_cost','paid_to_date','feel_like_sunday','mims_media','personal_checking','investment','amex_balance'].some(x => k.includes(x) || k === x)) display = bf_$$(v);
      return `<div class="bf-extracted-row"><span class="bf-extracted-key">${label}</span><span class="bf-extracted-val">${esc(String(display))}</span></div>`;
    });
    if (extracted) {
      extracted.innerHTML = rows.length
        ? `<div class="bf-extracted-preview"><div class="bf-extracted-title">✅ Found This Data</div>${rows.join('')}</div>`
        : `<div style="padding:14px;text-align:center;color:var(--yellow);font-size:13px">⚠️ Couldn't find any data. Try a different screenshot.</div>`;
      extracted.style.display = 'block';
      if (rows.length && actions) actions.style.display = 'flex';
    }
  } catch (err) {
    if (dz) dz.className = 'bf-drop-zone error-state';
    if (inner) inner.innerHTML = `<div style="font-size:24px;margin-bottom:8px">❌</div><div style="font-size:14px;font-weight:600;color:var(--red)">${err.message === 'NO_KEY' ? 'No API key set — click the key icon above' : 'Scan failed: ' + esc(err.message)}</div>`;
    if (extracted) { extracted.innerHTML = `<div style="text-align:center;margin-top:12px"><button class="btn btn-secondary" onclick="bf_resetScan()">Try Again</button></div>`; extracted.style.display = 'block'; }
  }
}

function bf_resetScan() {
  bf_scanData = null;
  const dz = document.getElementById('bf-scan-dz');
  const inner = document.getElementById('bf-scan-dz-inner');
  const extracted = document.getElementById('bf-scan-extracted');
  const actions = document.getElementById('bf-scan-actions');
  if (dz) dz.className = 'bf-drop-zone';
  if (inner) inner.innerHTML = `<div style="font-size:28px;margin-bottom:8px">📸</div><div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">Drop your screenshot here</div><div style="font-size:12px;color:var(--text-muted)">or click to choose a file · PNG, JPG, WEBP</div>`;
  if (extracted) extracted.style.display = 'none';
  if (actions) actions.style.display = 'none';
}
function bf_applyScanData() {
  if (!bf_scanData || !bf_scanCallback) return;
  closeModal();
  bf_scanCallback(bf_scanData);
  bf_scanData = null;
}

// ── Scan callbacks ────────────────────────────────────────────
function bf_applyWeeklyScan(data) {
  const setVal = (name, val) => { const el = document.querySelector(`#bf-content [name="${name}"]`); if (el && val) el.value = val; };
  setVal('tiktok_orders',   data.tiktok_orders   || '');
  setVal('tiktok_revenue',  data.tiktok_revenue  || '');
  setVal('tiktok_ad_spend', data.tiktok_ad_spend || '');
  setVal('amazon_orders',   data.amazon_orders   || '');
  setVal('amazon_revenue',  data.amazon_revenue  || '');
  setVal('amazon_ad_spend', data.amazon_ad_spend || '');
  setVal('website_orders',  data.website_orders  || '');
  setVal('website_revenue', data.website_revenue || '');
  setVal('google_spend',    data.google_spend    || '');
  setVal('meta_spend',      data.meta_spend      || '');
  setVal('inventory_units', data.inventory_units || '');
  showToast('Form filled from screenshot — review and save');
}
function bf_applyAccountsScan(data) {
  const a = bf_getAccs(), t = bf_today();
  if (data.feel_like_sunday != null)  a.feel_like_sunday  = { ...a.feel_like_sunday,  balance: data.feel_like_sunday,  updated: t };
  if (data.mims_media != null)        a.mims_media        = { ...a.mims_media,        balance: data.mims_media,        updated: t };
  if (data.personal_checking != null) a.personal_checking = { ...a.personal_checking, balance: data.personal_checking, updated: t };
  if (data.investment != null)        a.investment        = { ...a.investment,        balance: data.investment,        updated: t };
  if (data.amex_balance != null)      a.amex              = { ...a.amex,              balance: data.amex_balance,      updated: t };
  if (data.tiktok_hold != null)       a.tiktok_hold       = { ...a.tiktok_hold,       balance: data.tiktok_hold, next_payout: data.tiktok_next_payout || a.tiktok_hold?.next_payout || '', updated: t };
  if (data.amazon_available != null)  a.amazon_available  = { ...a.amazon_available,  balance: data.amazon_available,  updated: t };
  if (data.amazon_deferred != null)   a.amazon_deferred   = { ...a.amazon_deferred,   balance: data.amazon_deferred,   updated: t };
  bf_save(BF_K.ACCOUNTS, a);
  if (state.bfTab === 'accounts') bf_renderAccounts();
  showToast('Account balances updated from screenshot ✓');
}
function bf_applyPOScan(data) {
  const setVal = (name, val) => { const el = document.querySelector(`#modal-body [name="${name}"]`); if (el && val != null && val !== '') el.value = val; };
  setVal('vendor', data.vendor); setVal('description', data.description);
  setVal('total_cost', data.total_cost); setVal('paid_to_date', data.paid_to_date);
  setVal('due_date', data.due_date); setVal('notes', data.notes);
  showToast('PO form filled — review and save ✓');
}

// ── Main page ─────────────────────────────────────────────────
function renderBrandFinancePage(tab) {
  state.bfTab = tab || state.bfTab || 'overview';
  bf_seed();
  Object.keys(bf_charts).forEach(bf_destroyChart);

  const tabs = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'weekly',    label: '📅 Weekly Log' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'pricing',   label: '💲 Pricing Lab' },
    { id: 'accounts',  label: '💰 Accounts' }
  ];

  document.getElementById('page-content').innerHTML = `
    <div class="page-header" style="margin-bottom:0;align-items:flex-start">
      <div>
        <h1 class="page-title">BLC Tracker</h1>
        <p class="page-subtitle">Internal brand financials — stock, revenue &amp; cash</p>
      </div>
      <div class="bf-key-area" onclick="bf_showApiKeyModal()">
        <div class="bf-key-dot" id="bf-key-dot"></div>
        <span id="bf-key-label">Set API Key</span>
      </div>
    </div>

    <div class="bf-tabs">
      ${tabs.map(t => `<button class="bf-tab${state.bfTab === t.id ? ' active' : ''}" onclick="renderBrandFinancePage('${t.id}')">${t.label}</button>`).join('')}
    </div>

    <div id="bf-content"></div>
  `;

  bf_updateKeyUI();

  const subRenderers = { overview: bf_renderOverview, weekly: bf_renderWeeklyLog, inventory: bf_renderInventory, pricing: bf_renderPricing, accounts: bf_renderAccounts };
  if (subRenderers[state.bfTab]) subRenderers[state.bfTab]();
}

// ── Overview tab ──────────────────────────────────────────────
function bf_renderOverview() {
  const latest   = bf_latestLog();
  const rwy      = bf_runway();
  const vel      = bf_avgDailyU();
  const acc      = bf_getAccs();
  const pos      = bf_getPOs();
  const wRev     = latest ? bf_wkR(latest) : 0;
  const cashPos  = (acc.feel_like_sunday?.balance || 0) - (acc.amex?.balance || 0);
  const rwyCol   = rwy !== null ? bf_runwayColor(rwy) : 'var(--text-muted)';
  const rwyFill  = rwy !== null ? Math.min(100, (rwy / 90) * 100) : 0;
  const [pillCls, pillLbl] = rwy !== null ? bf_runwayPill(rwy) : ['bf-pill-gray', 'No data'];
  const outPOs   = pos.filter(p => (p.total_cost || 0) - (p.paid_to_date || 0) > 0 && p.status !== 'paid');
  let selloutStr = '—';
  if (rwy !== null) { const sd = new Date(); sd.setDate(sd.getDate() + rwy); selloutStr = sd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

  document.getElementById('bf-content').innerHTML = `
    <div class="bf-stat-grid">
      <div class="bf-stat-card" style="border-color:${rwy !== null && rwy <= 15 ? 'var(--red)' : rwy !== null && rwy <= 45 ? 'var(--yellow)' : 'var(--border)'}">
        <div class="bf-stat-label">📦 Days of Stock Left</div>
        <div class="bf-stat-value" style="color:${rwyCol}">${rwy !== null ? rwy : '—'}</div>
        <div class="bf-runway-bar"><div class="bf-runway-fill" style="width:${rwyFill}%;background:${rwyCol}"></div></div>
        <span class="bf-pill ${pillCls}" style="margin-top:4px;display:inline-block">${pillLbl}</span>
      </div>
      <div class="bf-stat-card">
        <div class="bf-stat-label">📈 Selling Per Day</div>
        <div class="bf-stat-value">${vel.toFixed(1)}</div>
        <div class="bf-stat-sub">avg units/day · ~${bf_N(Math.round(vel * 7))} this week</div>
      </div>
      <div class="bf-stat-card">
        <div class="bf-stat-label">💵 This Week's Revenue</div>
        <div class="bf-stat-value bf-mono">${bf_$$(wRev, 0)}</div>
        <div class="bf-stat-sub">Week ending ${bf_fmtDate(latest?.week_ending)}</div>
      </div>
      <div class="bf-stat-card">
        <div class="bf-stat-label">🏦 Cash After Amex</div>
        <div class="bf-stat-value bf-mono" style="color:${cashPos < 0 ? 'var(--red)' : 'var(--green)'}">${bf_$$(cashPos, 0)}</div>
        <div class="bf-stat-sub">FLS Checking minus Amex</div>
      </div>
    </div>

    <div class="bf-g2">
      <div class="bf-card" style="margin-bottom:0">
        <div class="bf-section-title">Sales by Channel — Last 12 Weeks</div>
        <div class="bf-chart-wrap"><canvas id="bf-ch-vel"></canvas></div>
      </div>
      <div class="bf-card" style="margin-bottom:0">
        <div class="bf-section-title">Channel Mix This Week</div>
        <div class="bf-chart-wrap"><canvas id="bf-ch-mix"></canvas></div>
      </div>
    </div>

    <div class="bf-card" style="margin-top:16px">
      <div class="bf-section-title">Outstanding Vendor Payments</div>
      ${outPOs.length ? `
        <div class="bf-table-wrap" style="margin-top:12px">
          <table class="bf-table">
            <thead><tr><th>Vendor</th><th>What For</th><th>Amount Due</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>${outPOs.map(p => `<tr>
              <td>${esc(p.vendor)}</td><td class="ell">${esc(p.description)}</td>
              <td class="mono">${bf_$$((p.total_cost || 0) - (p.paid_to_date || 0))}</td>
              <td class="mono">${bf_fmtDate(p.due_date)}</td>
              <td>${bf_statusBadge(p.status)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      ` : `
        <div class="bf-empty" style="margin-top:12px">
          <div class="bf-empty-icon">✅</div>
          <div class="bf-empty-title">All caught up!</div>
          <div class="bf-empty-sub">No outstanding payments to vendors</div>
        </div>
      `}
    </div>
  `;
  setTimeout(() => { bf_buildVelChart(); bf_buildMixChart(); }, 0);
}

// ── Charts ────────────────────────────────────────────────────
const BF_GRID = 'rgba(0,0,0,0.04)';
const BF_TICK = { color: '#aaa', font: { family: 'Inter', size: 10 } };
const BF_TIP  = { backgroundColor: '#fff', titleColor: '#666', bodyColor: '#111', borderColor: '#e8e8ec', borderWidth: 1, padding: 10, cornerRadius: 6 };

function bf_buildVelChart() {
  bf_destroyChart('vel');
  const data = bf_sortedLog().slice(-12);
  const ctx  = document.getElementById('bf-ch-vel');
  if (!ctx || !data.length || typeof Chart === 'undefined') return;
  bf_charts['vel'] = new Chart(ctx, {
    type: 'line',
    data: { labels: data.map(w => bf_fmtDateS(w.week_ending)), datasets: [
      { label: 'TikTok Shop', data: data.map(w => w.tiktok_orders  || 0), borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,0.06)',  tension: .35, fill: true, pointRadius: 3, pointBackgroundColor: '#16A34A' },
      { label: 'Amazon',      data: data.map(w => w.amazon_orders  || 0), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.06)',   tension: .35, fill: true, pointRadius: 3, pointBackgroundColor: '#2563EB' },
      { label: 'Website',     data: data.map(w => w.website_orders || 0), borderColor: '#CA8A04', backgroundColor: 'rgba(202,138,4,0.06)',   tension: .35, fill: true, pointRadius: 3, pointBackgroundColor: '#CA8A04' }
    ] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#888', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 12, usePointStyle: true } }, tooltip: BF_TIP }, scales: { x: { grid: { color: BF_GRID }, ticks: BF_TICK }, y: { grid: { color: BF_GRID }, ticks: BF_TICK, beginAtZero: true } } }
  });
}
function bf_buildMixChart() {
  bf_destroyChart('mix');
  const l = bf_latestLog();
  const ctx = document.getElementById('bf-ch-mix');
  if (!ctx || !l || typeof Chart === 'undefined') return;
  const tt = l.tiktok_orders || 0, az = l.amazon_orders || 0, ws = l.website_orders || 0, total = tt + az + ws;
  bf_charts['mix'] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['TikTok Shop', 'Amazon', 'Website'], datasets: [{ data: [tt, az, ws], backgroundColor: ['#16A34A', '#2563EB', '#CA8A04'], borderColor: '#fff', borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 10, usePointStyle: true } }, tooltip: { ...BF_TIP, callbacks: { label: c => `${c.label}: ${total ? bf_pct(c.raw / total * 100) : '0%'} (${bf_N(c.raw)})` } } } }
  });
}
function bf_buildPriceChart(rows) {
  bf_destroyChart('price');
  const ctx = document.getElementById('bf-ch-price');
  if (!ctx || typeof Chart === 'undefined') return;
  const labels = rows.map(([pp]) => '$' + pp);
  const vals   = rows.map(([, weeks]) => (weeks.reduce((s, w) => s + bf_wkU(w), 0) / (weeks.length * 7)).toFixed(2));
  bf_charts['price'] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Avg Units/Day', data: vals, backgroundColor: ['rgba(22,163,74,0.5)', 'rgba(22,163,74,0.75)', 'rgba(22,163,74,0.35)'], borderColor: 'var(--green)', borderWidth: 1, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: BF_TIP }, scales: { x: { grid: { color: BF_GRID }, ticks: BF_TICK }, y: { grid: { color: BF_GRID }, ticks: BF_TICK, beginAtZero: true } } }
  });
}

// ── Weekly Log tab ────────────────────────────────────────────
function bf_renderWeeklyLog() {
  const log = [...bf_getLog()].sort((a, b) => b.week_ending.localeCompare(a.week_ending));
  document.getElementById('bf-content').innerHTML = `
    <div class="bf-scan-banner">
      <div class="bf-scan-text"><strong>Got a screenshot?</strong> Drop it and Claude will fill in the form automatically.</div>
      <button class="btn btn-secondary" onclick="bf_showScanModal('weekly', bf_applyWeeklyScan)">📸 Scan Screenshot</button>
    </div>

    <div class="bf-card">
      <div class="bf-section-title">Add This Week's Numbers</div>
      <form id="bf-log-form" onsubmit="bf_saveLog(event)" style="margin-top:14px">
        <div class="bf-form-row cols-2">
          <div class="bf-form-group"><label class="bf-form-label">Week Ending Date</label><input type="date" name="week_ending" class="dp-input" value="${bf_today()}" required></div>
          <div class="bf-form-group"><label class="bf-form-label">Price You're Selling At</label>
            <select name="price_point" class="dp-input"><option value="29.99">$29.99</option><option value="34.99" selected>$34.99</option><option value="36.99">$36.99</option><option value="custom">Custom</option></select>
          </div>
        </div>
        <div class="bf-form-section">TikTok Shop</div>
        <div class="bf-form-row cols-3">
          <div class="bf-form-group"><label class="bf-form-label">Orders</label><input type="number" name="tiktok_orders" class="dp-input" placeholder="0" min="0" step="1"></div>
          <div class="bf-form-group"><label class="bf-form-label">Revenue ($)</label><input type="number" name="tiktok_revenue" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
          <div class="bf-form-group"><label class="bf-form-label">Ad Spend ($)</label><input type="number" name="tiktok_ad_spend" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
        </div>
        <div class="bf-form-section">Amazon</div>
        <div class="bf-form-row cols-3">
          <div class="bf-form-group"><label class="bf-form-label">Orders</label><input type="number" name="amazon_orders" class="dp-input" placeholder="0" min="0" step="1"></div>
          <div class="bf-form-group"><label class="bf-form-label">Revenue ($)</label><input type="number" name="amazon_revenue" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
          <div class="bf-form-group"><label class="bf-form-label">Ad Spend ($)</label><input type="number" name="amazon_ad_spend" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
        </div>
        <div class="bf-form-section">Website</div>
        <div class="bf-form-row cols-3">
          <div class="bf-form-group"><label class="bf-form-label">Orders</label><input type="number" name="website_orders" class="dp-input" placeholder="0" min="0" step="1"></div>
          <div class="bf-form-group"><label class="bf-form-label">Revenue ($)</label><input type="number" name="website_revenue" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
          <div class="bf-form-group"><label class="bf-form-label">Ad Spend ($)</label><input type="number" name="website_ad_spend" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
        </div>
        <div class="bf-form-section">Other Ad Spend &amp; Stock</div>
        <div class="bf-form-row cols-3">
          <div class="bf-form-group"><label class="bf-form-label">Google Ads ($)</label><input type="number" name="google_spend" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
          <div class="bf-form-group"><label class="bf-form-label">Meta / Instagram Ads ($)</label><input type="number" name="meta_spend" class="dp-input" placeholder="0.00" min="0" step="0.01"></div>
          <div class="bf-form-group"><label class="bf-form-label">Units In Stock Right Now</label><input type="number" name="inventory_units" class="dp-input" placeholder="0" min="0" step="1"></div>
        </div>
        <div class="bf-form-section">Notes (optional)</div>
        <div class="bf-form-group" style="margin-bottom:14px"><textarea name="notes" class="dp-input" rows="2" placeholder="Anything notable this week?"></textarea></div>
        <div style="display:flex;gap:8px">
          <button type="submit" class="btn btn-primary">✓ Save This Week</button>
          <button type="reset" class="btn btn-secondary">Reset</button>
        </div>
      </form>
    </div>

    <div class="bf-card">
      <div class="bf-section-title">History — ${log.length} Week${log.length !== 1 ? 's' : ''} Logged</div>
      ${log.length ? `
        <div class="bf-table-wrap" style="margin-top:12px">
          <table class="bf-table">
            <thead><tr><th>Week</th><th>TikTok</th><th>Amazon</th><th>Web</th><th>Total</th><th>Revenue</th><th>Ad Spend</th><th>ROAS</th><th>Price</th><th>Stock</th><th>Notes</th><th></th></tr></thead>
            <tbody>${log.map(w => {
              const u = bf_wkU(w), r = bf_wkR(w), s = bf_wkS(w), roas = s > 0 ? (r / s).toFixed(2) + 'x' : '—';
              return `<tr>
                <td class="mono">${bf_fmtDateS(w.week_ending)}</td>
                <td class="mono">${bf_N(w.tiktok_orders || 0)}</td><td class="mono">${bf_N(w.amazon_orders || 0)}</td><td class="mono">${bf_N(w.website_orders || 0)}</td>
                <td class="mono c-green" style="font-weight:600">${bf_N(u)}</td>
                <td class="mono">${bf_$$(r, 0)}</td><td class="mono c-yellow">${bf_$$(s, 0)}</td>
                <td class="mono">${roas}</td><td class="mono">$${esc(w.price_point)}</td><td class="mono">${bf_N(w.inventory_units || 0)}</td>
                <td class="ell c-muted" style="max-width:160px;font-size:12px">${esc(w.notes) || '—'}</td>
                <td><button class="btn btn-secondary" style="padding:3px 8px;font-size:11px" onclick="bf_deleteLog('${w.id}')">Delete</button></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      ` : `<div class="bf-empty" style="margin-top:12px"><div class="bf-empty-icon">📅</div><div class="bf-empty-title">No entries yet</div><div class="bf-empty-sub">Add your first week above</div></div>`}
    </div>
  `;
}

function bf_saveLog(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const entry = { id: bf_uid(), week_ending: fd.get('week_ending'),
    tiktok_orders: +fd.get('tiktok_orders') || 0,  tiktok_revenue: +fd.get('tiktok_revenue') || 0,   tiktok_ad_spend: +fd.get('tiktok_ad_spend') || 0,
    amazon_orders: +fd.get('amazon_orders') || 0,  amazon_revenue: +fd.get('amazon_revenue') || 0,   amazon_ad_spend: +fd.get('amazon_ad_spend') || 0,
    website_orders: +fd.get('website_orders') || 0, website_revenue: +fd.get('website_revenue') || 0, website_ad_spend: +fd.get('website_ad_spend') || 0,
    google_spend: +fd.get('google_spend') || 0, meta_spend: +fd.get('meta_spend') || 0, inventory_units: +fd.get('inventory_units') || 0,
    price_point: fd.get('price_point'), notes: fd.get('notes') };
  const log = bf_getLog(); log.push(entry); bf_save(BF_K.LOG, log);
  showToast('Week saved! ✓'); bf_renderWeeklyLog();
  e.target.reset();
  const wd = document.querySelector('#bf-content [name="week_ending"]'); if (wd) wd.value = bf_today();
}
function bf_deleteLog(id) {
  if (!confirm('Delete this weekly entry?')) return;
  bf_save(BF_K.LOG, bf_getLog().filter(w => w.id !== id));
  showToast('Entry deleted'); bf_renderWeeklyLog();
}

// ── Inventory & POs tab ───────────────────────────────────────
function bf_renderInventory() {
  const latest    = bf_latestLog();
  const rwy       = bf_runway();
  const vel       = bf_avgDailyU();
  const pos       = bf_getPOs();
  const rwyCol    = rwy !== null ? bf_runwayColor(rwy) : 'var(--text-muted)';
  const [pillCls, pillLbl] = rwy !== null ? bf_runwayPill(rwy) : ['bf-pill-gray', 'No data'];
  const totalPO   = pos.reduce((s, p) => s + (p.total_cost || 0), 0);
  const totalPaid = pos.reduce((s, p) => s + (p.paid_to_date || 0), 0);
  let selloutStr = '—', selloutDate = null;
  if (rwy !== null) { selloutDate = bf_addDays(bf_today(), rwy); selloutStr = bf_fmtDate(selloutDate); }

  document.getElementById('bf-content').innerHTML = `
    <div class="bf-stat-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="bf-stat-card"><div class="bf-stat-label">📦 Stock On Hand</div><div class="bf-stat-value">${bf_N(latest?.inventory_units || 0)}</div><div class="bf-stat-sub">units right now</div></div>
      <div class="bf-stat-card"><div class="bf-stat-label">📈 Selling Per Day</div><div class="bf-stat-value">${vel.toFixed(1)}</div><div class="bf-stat-sub">avg over last 4 weeks</div></div>
      <div class="bf-stat-card" style="border-color:${rwy !== null && rwy <= 15 ? 'var(--red)' : rwy !== null && rwy <= 45 ? 'var(--yellow)' : 'var(--border)'}">
        <div class="bf-stat-label">⏳ Days Until Sold Out</div>
        <div class="bf-stat-value" style="color:${rwyCol}">${rwy !== null ? rwy : '—'}</div>
        <span class="bf-pill ${pillCls}" style="margin-top:6px;display:inline-block;font-size:11px">${pillLbl}</span>
      </div>
      <div class="bf-stat-card"><div class="bf-stat-label">📅 Estimated Sellout</div><div class="bf-stat-value" style="font-size:16px;line-height:1.3">${selloutStr}</div><div class="bf-stat-sub">at current pace</div></div>
    </div>

    ${bf_buildTimeline(rwy, selloutDate)}

    <div class="bf-card">
      <div class="bf-section-hdr">
        <div class="bf-section-title">Purchase Orders</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="bf_showScanModal('po', data => { bf_showPOModal(); setTimeout(() => bf_applyPOScan(data), 100); })">📸 Scan Invoice</button>
          <button class="btn btn-primary" onclick="bf_showPOModal()">+ Add PO</button>
        </div>
      </div>
      <div class="bf-table-wrap">
        <table class="bf-table">
          <thead><tr><th>Vendor</th><th>What For</th><th>Total</th><th>Paid</th><th>Still Owe</th><th>Due Date</th><th>Status</th><th></th></tr></thead>
          <tbody>${pos.length ? pos.map(p => {
            const bal = (p.total_cost || 0) - (p.paid_to_date || 0);
            return `<tr>
              <td>${esc(p.vendor)}</td><td class="ell">${esc(p.description)}</td>
              <td class="mono">${bf_$$(p.total_cost)}</td><td class="mono">${bf_$$(p.paid_to_date)}</td>
              <td class="mono${bal > 0 ? ' c-yellow' : ''}"${bal > 0 ? ' style="font-weight:600"' : ''}>${bf_$$(bal)}</td>
              <td class="mono">${bf_fmtDate(p.due_date)}</td><td>${bf_statusBadge(p.status)}</td>
              <td style="white-space:nowrap;display:flex;gap:4px">
                <button class="btn btn-secondary" style="padding:3px 8px;font-size:11px" onclick="bf_showPOModal('${p.id}')">Edit</button>
                <button class="btn btn-danger-outline" style="padding:3px 8px;font-size:11px" onclick="bf_deletePO('${p.id}')">Del</button>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--text-muted)">No purchase orders yet</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="bf-table-footer">
        <div><div class="bf-footer-item-label">Total PO Value</div><div class="bf-footer-item-val">${bf_$$(totalPO)}</div></div>
        <div><div class="bf-footer-item-label">Total Paid</div><div class="bf-footer-item-val" style="color:var(--green)">${bf_$$(totalPaid)}</div></div>
        <div><div class="bf-footer-item-label">Still Owe</div><div class="bf-footer-item-val" style="color:var(--yellow)">${bf_$$(totalPO - totalPaid)}</div></div>
      </div>
    </div>
  `;
}

function bf_buildTimeline(rwy, selloutDate) {
  if (rwy === null || !selloutDate) return '';
  const dTotal  = Math.max(rwy + 60, 120);
  const sPct    = Math.min(95, (rwy / dTotal) * 100);
  const aPct    = Math.min(98, ((rwy + 50) / dTotal) * 100);
  const warn    = sPct > aPct || aPct > 95;
  const arrDate = bf_addDays(selloutDate, 50);
  const rCol    = bf_runwayColor(rwy);
  return `
  <div class="bf-timeline-wrap">
    <div class="bf-timeline-label">Restock Timeline</div>
    <div class="bf-timeline-sub">China shipping takes ~50 days — order before you sell out!</div>
    <div class="bf-t-track">
      ${warn ? `<div class="bf-warn-zone" style="left:${sPct}%;right:${100 - Math.min(98, aPct)}%"></div>` : ''}
      <div class="bf-t-fill" style="width:${sPct}%;background:${rCol}"></div>
      ${[[0, 'Today', bf_today(), 'var(--text-primary)'], [sPct, 'Sell Out', selloutDate, rCol], [aPct, 'Est. Arrival', arrDate, 'var(--blue)']].map(([p, l, d, c]) =>
        `<div class="bf-t-marker" style="left:${p}%"><div class="bf-t-dot" style="background:${c}"></div><div class="bf-t-label" style="color:${c}">${l}</div><div class="bf-t-date">${bf_fmtDateS(d)}</div></div>`
      ).join('')}
    </div>
    ${warn ? `<div style="font-size:13px;color:var(--red);font-weight:600;margin-top:8px">⚠️ Your stock runs out before your next order arrives — place a reorder now!</div>`
           : `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">✅ You have time — estimated arrival is before sellout.</div>`}
  </div>`;
}

function bf_showPOModal(id) {
  const po = id ? bf_getPOs().find(p => p.id === id) : null;
  openModal(po ? 'Edit Purchase Order' : 'Add Purchase Order', `
    <form onsubmit="bf_savePO(event,'${id || ''}')">
      <div class="bf-form-row cols-2" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">Vendor Name</label><input type="text" name="vendor" class="dp-input" value="${esc(po?.vendor || '')}" required></div>
        <div class="bf-form-group"><label class="bf-form-label">Status</label><select name="status" class="dp-input">${bf_statusOpts(po?.status || 'before_shipment')}</select></div>
      </div>
      <div class="bf-form-group" style="margin-bottom:12px"><label class="bf-form-label">What Is This Order?</label><input type="text" name="description" class="dp-input" value="${esc(po?.description || '')}" required></div>
      <div class="bf-form-row cols-2" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">Total Cost ($)</label><input type="number" name="total_cost" class="dp-input" value="${po?.total_cost || ''}" step="0.01" min="0" required></div>
        <div class="bf-form-group"><label class="bf-form-label">Already Paid ($)</label><input type="number" name="paid_to_date" class="dp-input" value="${po?.paid_to_date || 0}" step="0.01" min="0"></div>
      </div>
      <div class="bf-form-row cols-2" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">Due Date</label><input type="date" name="due_date" class="dp-input" value="${po?.due_date || ''}"></div>
        <div class="bf-form-group"><label class="bf-form-label">2nd Payment Date</label><input type="date" name="payment_date_2" class="dp-input" value="${po?.payment_date_2 || ''}"></div>
      </div>
      <div class="bf-form-group" style="margin-bottom:16px"><label class="bf-form-label">Notes</label><textarea name="notes" class="dp-input" rows="2">${esc(po?.notes || '')}</textarea></div>
      <div style="display:flex;gap:8px">
        <button type="submit" class="btn btn-primary">Save PO</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `);
}
function bf_savePO(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const entry = { id: id || bf_uid(), vendor: fd.get('vendor'), description: fd.get('description'),
    total_cost: +fd.get('total_cost') || 0, paid_to_date: +fd.get('paid_to_date') || 0,
    due_date: fd.get('due_date'), payment_date_2: fd.get('payment_date_2'), status: fd.get('status'), notes: fd.get('notes') };
  let pos = bf_getPOs();
  if (id) pos = pos.map(p => p.id === id ? entry : p); else pos.push(entry);
  bf_save(BF_K.POS, pos); closeModal(); showToast('PO saved ✓'); bf_renderInventory();
}
function bf_deletePO(id) {
  if (!confirm('Delete this PO?')) return;
  bf_save(BF_K.POS, bf_getPOs().filter(p => p.id !== id)); showToast('PO deleted'); bf_renderInventory();
}

// ── Pricing Lab tab ───────────────────────────────────────────
function bf_renderPricing() {
  const log    = bf_getLog();
  const notes  = bf_getPNotes();
  const groups = {};
  log.forEach(w => { const pp = w.price_point || '?'; if (!groups[pp]) groups[pp] = []; groups[pp].push(w); });
  const rows = Object.entries(groups).sort((a, b) => parseFloat(a[0] || 0) - parseFloat(b[0] || 0));

  document.getElementById('bf-content').innerHTML = `
    <div class="bf-g3-1">
      <div class="bf-card" style="margin-bottom:0">
        <div class="bf-section-title">Which Price Sells Best?</div>
        ${rows.length ? `
          <div class="bf-table-wrap" style="margin-top:12px">
            <table class="bf-table">
              <thead><tr><th>Price</th><th>Weeks Tested</th><th>Avg Sales/Day</th><th>Avg Rev/Day</th><th>Total Units</th><th>Total Revenue</th></tr></thead>
              <tbody>${rows.map(([pp, weeks]) => {
                const tU = weeks.reduce((s, w) => s + bf_wkU(w), 0), tR = weeks.reduce((s, w) => s + bf_wkR(w), 0), days = weeks.length * 7;
                return `<tr>
                  <td class="mono c-green" style="font-size:16px;font-weight:700">$${esc(pp)}</td>
                  <td class="mono">${weeks.length}</td>
                  <td class="mono" style="font-weight:600">${(tU / days).toFixed(1)}</td>
                  <td class="mono">${bf_$$(tR / days)}</td>
                  <td class="mono">${bf_N(tU)}</td>
                  <td class="mono">${bf_$$(tR, 0)}</td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
          <div class="bf-chart-wrap" style="height:180px;margin-top:16px"><canvas id="bf-ch-price"></canvas></div>
        ` : `<div class="bf-empty" style="margin-top:12px"><div class="bf-empty-icon">💲</div><div class="bf-empty-title">No data yet</div><div class="bf-empty-sub">Add weekly log entries to see price analysis</div></div>`}
      </div>
      <div class="bf-card" style="margin-bottom:0">
        <div class="bf-section-title">Notes Per Price</div>
        <p style="font-size:12px;color:var(--text-muted);margin:8px 0 16px">Auto-saves when you click away</p>
        ${['29.99', '34.99', '36.99'].map(pp => `
          <div style="margin-bottom:20px">
            <div style="font-family:var(--font-heading);font-size:18px;font-weight:700;color:var(--green);margin-bottom:6px">$${pp}</div>
            <textarea class="dp-input" rows="3" onblur="bf_savePricingNote('${pp}', this.value)" placeholder="How did this price feel?">${esc(notes[pp] || '')}</textarea>
          </div>`).join('')}
      </div>
    </div>
  `;
  if (rows.length) setTimeout(() => bf_buildPriceChart(rows), 0);
}
function bf_savePricingNote(pp, val) { const n = bf_getPNotes(); n[pp] = val; bf_save(BF_K.PRICING, n); }

// ── Accounts tab ──────────────────────────────────────────────
function bf_renderAccounts() {
  const a        = bf_getAccs();
  const net      = bf_netPos();
  const pos      = bf_getPOs();
  const cutoff   = new Date(); cutoff.setDate(cutoff.getDate() + 30);
  const upcoming = pos.filter(p => p.due_date && new Date(p.due_date + 'T00:00:00') <= cutoff && p.status !== 'paid');
  const netCol   = net.net >= 0 ? 'var(--green)' : 'var(--red)';
  const [pillCls, pillLbl] = net.net >= 0 ? ['bf-pill-green', '✅ Positive'] : ['bf-pill-red', '⚠️ In the Red'];

  document.getElementById('bf-content').innerHTML = `
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px">
      <button class="btn btn-secondary" onclick="bf_showScanModal('accounts', bf_applyAccountsScan)">📸 Scan Screenshot</button>
      <button class="btn btn-primary" onclick="bf_showAccsModal()">Update Balances</button>
    </div>

    <div class="bf-g2" style="align-items:start">
      <div class="bf-card" style="margin-bottom:0;border-color:${netCol}">
        <div class="bf-section-title" style="margin-bottom:12px">How It All Adds Up</div>
        <div class="bf-calc-row"><span style="color:var(--text-secondary)">💵 Cash in Business Accounts</span><span class="bf-calc-val">${bf_$$(net.liquid)}</span></div>
        <div class="bf-calc-row"><span style="color:var(--green)">📥 + Money Coming In</span><span class="bf-calc-val" style="color:var(--green)">+ ${bf_$$(net.incoming)}</span></div>
        <div class="bf-calc-row"><span style="color:var(--red)">💳 − Amex Balance Owed</span><span class="bf-calc-val" style="color:var(--red)">− ${bf_$$(net.amex)}</span></div>
        <div class="bf-calc-row" style="border-bottom:none"><span style="color:var(--yellow)">📦 − Vendor Bills (30 days)</span><span class="bf-calc-val" style="color:var(--yellow)">− ${bf_$$(net.posDue)}</span></div>
        <div style="height:1px;background:var(--border);margin:8px 0"></div>
        <div class="bf-calc-total"><span>= Your Real Position</span><span class="bf-calc-total-val" style="color:${netCol}">${bf_$$(net.net)}</span></div>
      </div>
      <div class="bf-card" style="margin-bottom:0;border-color:${netCol};text-align:center">
        <div class="bf-net-hero">
          <div class="bf-net-hero-label">Your Real Position</div>
          <div class="bf-net-hero-val" style="color:${netCol}">${bf_$$(net.net, 0)}</div>
          <span class="bf-pill ${pillCls}" style="display:inline-block;margin-top:12px">${pillLbl}</span>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px">After Amex + vendor bills due soon</div>
        </div>
      </div>
    </div>

    <div class="bf-section-label-row">Business &amp; Personal Cash</div>
    <div class="bf-acct-grid">
      ${bf_aCard('Feel Like Sunday LLC', 'Primary Business Account', a.feel_like_sunday)}
      ${bf_aCard('Mims Media Collective', 'Secondary Business', a.mims_media)}
      ${bf_aCard('Personal Checking', 'Personal Account', a.personal_checking)}
      ${bf_aCard('Investment Account', 'Stocks / Portfolio', a.investment)}
    </div>

    <div class="bf-section-label-row">Credit Cards</div>
    <div class="bf-acct-grid" style="margin-bottom:20px">
      <div class="bf-acct-card" style="border-color:var(--red)">
        <div class="bf-acct-name">American Express Business Gold</div>
        <div class="bf-acct-sub">Balance you owe</div>
        <div class="bf-acct-bal" style="color:var(--red)">${bf_$$(a.amex?.balance)}</div>
        <div class="bf-acct-upd">Last payment: ${bf_$$(a.amex?.last_payment || 0)} on ${bf_fmtDate(a.amex?.last_payment_date) || '—'}</div>
        <div class="bf-acct-upd">Updated ${bf_fmtDate(a.amex?.updated) || '—'}</div>
      </div>
    </div>

    <div class="bf-section-label-row">Money Coming In (Pending)</div>
    <div class="bf-acct-grid" style="margin-bottom:20px">
      <div class="bf-acct-card" style="border-color:var(--green)">
        <div class="bf-acct-name">TikTok Shop — On Hold</div>
        <div class="bf-acct-sub">Waiting to release</div>
        <div class="bf-acct-bal" style="color:var(--green)">${bf_$$(a.tiktok_hold?.balance)}</div>
        <div class="bf-acct-upd">Next payout: ${bf_fmtDate(a.tiktok_hold?.next_payout) || 'Unknown'}</div>
        <div class="bf-acct-upd">Updated ${bf_fmtDate(a.tiktok_hold?.updated) || '—'}</div>
      </div>
      <div class="bf-acct-card" style="border-color:var(--blue)">
        <div class="bf-acct-name">Amazon — Available</div>
        <div class="bf-acct-sub">Ready to transfer to bank</div>
        <div class="bf-acct-bal" style="color:var(--blue)">${bf_$$(a.amazon_available?.balance)}</div>
        <div class="bf-acct-upd">Updated ${bf_fmtDate(a.amazon_available?.updated) || '—'}</div>
      </div>
      <div class="bf-acct-card" style="border-color:var(--blue)">
        <div class="bf-acct-name">Amazon — Deferred</div>
        <div class="bf-acct-sub">In transit, not yet available</div>
        <div class="bf-acct-bal" style="color:var(--blue)">${bf_$$(a.amazon_deferred?.balance)}</div>
        <div class="bf-acct-upd">Updated ${bf_fmtDate(a.amazon_deferred?.updated) || '—'}</div>
      </div>
    </div>

    ${upcoming.length ? `
      <div class="bf-section-label-row" style="color:var(--yellow)">⚠️ Vendor Payments Due in 30 Days</div>
      <div class="bf-card">
        <div class="bf-table-wrap">
          <table class="bf-table">
            <thead><tr><th>Vendor</th><th>What For</th><th>Amount Due</th><th>Due Date</th><th>Days Left</th><th>Status</th></tr></thead>
            <tbody>${upcoming.map(p => {
              const d = bf_daysFrom(p.due_date);
              return `<tr>
                <td>${esc(p.vendor)}</td><td class="ell">${esc(p.description)}</td>
                <td class="mono c-yellow" style="font-weight:600">${bf_$$((p.total_cost || 0) - (p.paid_to_date || 0))}</td>
                <td class="mono">${bf_fmtDate(p.due_date)}</td>
                <td class="mono${d !== null && d < 7 ? ' c-red' : d !== null && d < 14 ? ' c-yellow' : ''}" style="font-weight:600">${d !== null ? (d < 0 ? '⚠️ Overdue' : d + ' days') : '—'}</td>
                <td>${bf_statusBadge(p.status)}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;
}

function bf_aCard(name, sub, data) {
  return `<div class="bf-acct-card"><div class="bf-acct-name">${name}</div><div class="bf-acct-sub">${sub}</div><div class="bf-acct-bal">${bf_$$(data?.balance)}</div><div class="bf-acct-upd">Updated ${bf_fmtDate(data?.updated) || '—'}</div></div>`;
}

function bf_showAccsModal() {
  const a = bf_getAccs();
  openModal('Update Account Balances', `
    <form onsubmit="bf_saveAccs(event)">
      <div class="bf-form-section">Business &amp; Personal Cash</div>
      <div class="bf-form-row cols-2" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">Feel Like Sunday LLC ($)</label><input type="number" name="feel_like_sunday" class="dp-input" value="${a.feel_like_sunday?.balance || 0}" step="0.01"></div>
        <div class="bf-form-group"><label class="bf-form-label">Mims Media Collective ($)</label><input type="number" name="mims_media" class="dp-input" value="${a.mims_media?.balance || 0}" step="0.01"></div>
      </div>
      <div class="bf-form-row cols-2" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">Personal Checking ($)</label><input type="number" name="personal_checking" class="dp-input" value="${a.personal_checking?.balance || 0}" step="0.01"></div>
        <div class="bf-form-group"><label class="bf-form-label">Investment Account ($)</label><input type="number" name="investment" class="dp-input" value="${a.investment?.balance || 0}" step="0.01"></div>
      </div>
      <div class="bf-form-section">American Express</div>
      <div class="bf-form-row cols-3" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">Amex Balance ($)</label><input type="number" name="amex_balance" class="dp-input" value="${a.amex?.balance || 0}" step="0.01"></div>
        <div class="bf-form-group"><label class="bf-form-label">Last Payment ($)</label><input type="number" name="amex_last_payment" class="dp-input" value="${a.amex?.last_payment || 0}" step="0.01"></div>
        <div class="bf-form-group"><label class="bf-form-label">Last Payment Date</label><input type="date" name="amex_last_payment_date" class="dp-input" value="${a.amex?.last_payment_date || ''}"></div>
      </div>
      <div class="bf-form-section">TikTok Shop</div>
      <div class="bf-form-row cols-2" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">On Hold Balance ($)</label><input type="number" name="tiktok_hold" class="dp-input" value="${a.tiktok_hold?.balance || 0}" step="0.01"></div>
        <div class="bf-form-group"><label class="bf-form-label">Next Payout Date</label><input type="date" name="tiktok_next_payout" class="dp-input" value="${a.tiktok_hold?.next_payout || ''}"></div>
      </div>
      <div class="bf-form-section">Amazon</div>
      <div class="bf-form-row cols-2" style="margin-bottom:12px">
        <div class="bf-form-group"><label class="bf-form-label">Available Balance ($)</label><input type="number" name="amazon_available" class="dp-input" value="${a.amazon_available?.balance || 0}" step="0.01"></div>
        <div class="bf-form-group"><label class="bf-form-label">Deferred Balance ($)</label><input type="number" name="amazon_deferred" class="dp-input" value="${a.amazon_deferred?.balance || 0}" step="0.01"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button type="submit" class="btn btn-primary">Save Everything</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `);
}
function bf_saveAccs(e) {
  e.preventDefault();
  const fd = new FormData(e.target), t = bf_today();
  bf_save(BF_K.ACCOUNTS, {
    feel_like_sunday:  { balance: +fd.get('feel_like_sunday')   || 0, updated: t },
    mims_media:        { balance: +fd.get('mims_media')         || 0, updated: t },
    personal_checking: { balance: +fd.get('personal_checking')  || 0, updated: t },
    investment:        { balance: +fd.get('investment')         || 0, updated: t },
    amex:              { balance: +fd.get('amex_balance')       || 0, last_payment: +fd.get('amex_last_payment') || 0, last_payment_date: fd.get('amex_last_payment_date'), updated: t },
    tiktok_hold:       { balance: +fd.get('tiktok_hold')        || 0, next_payout: fd.get('tiktok_next_payout'), updated: t },
    amazon_available:  { balance: +fd.get('amazon_available')   || 0, updated: t },
    amazon_deferred:   { balance: +fd.get('amazon_deferred')    || 0, updated: t }
  });
  closeModal(); showToast('Accounts updated ✓'); bf_renderAccounts();
}
