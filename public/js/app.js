/* ============================================================
   BLC Affiliate OS — SPA JavaScript
   ============================================================ */

const API = {
  generate:    '/api/generate',
  challenge:   '/api/challenge',
  support:     '/api/support',
  settings:    '/api/settings',
  tasks:       '/api/tasks',
  taskBuckets: '/api/task-buckets',
  projects:    '/api/projects',
  projectAttachments: '/api/project-attachments',
  partners:    '/api/partners',
  teamMembers:   '/api/team-members',
  subscriptions: '/api/subscriptions',
  brandFinance:  '/api/brand-finance',
  adSpend:       '/api/ad-spend',
  expenses:      '/api/expenses',
  meetings:      '/api/meetings',
  ideas:           '/api/ideas',
  commentBank:     '/api/comment-bank',
  contentCalendar: '/api/content-calendar',
  contentIdeas:    '/api/content-ideas',
  teamCalendar:    '/api/team-calendar',
  partnerOutreach:    '/api/partner-outreach',
  partnerOutreachGen: '/api/partner-outreach-gen'
};

// Outreach signs as the brand, not a person — the team can change without
// rewriting a single email template. Mirrored in routes/outreach-gen.js.

const PARTNER_STATUSES = [
  { key: 'not_contacted',  label: 'Not Contacted',  color: 'gray'   },
  { key: 'contacted',      label: 'Contacted',      color: 'blue'   },
  { key: 'replied',        label: 'Replied',        color: 'teal'   },
  { key: 'applied',        label: 'Applied',        color: 'purple' },
  { key: 'accepted',       label: 'Accepted',       color: 'green'  },
  { key: 'not_interested', label: 'Not Interested', color: 'red'    },
  { key: 'no_response',    label: 'No Response',    color: 'gray'   },
  { key: 'archived',       label: 'Archived',       color: 'gray'   }
];

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
  selectedIds:        new Set(),
  dpAccordion:        { rates: false, eval: true, founderEval: false, counter: true },
  scripts:            [],
  scriptsLoaded:      false,
  contentLabTab:      'creators',
  contentLabCreatorId: null,
  scriptMode:         'write',  // 'write' | 'teardown'
  challengers:        [],
  challengeFilter:    'all',    // 'all' | 'active' | 'completed' | 'disqualified' | 'refund_approved'
  selectedChallengerId: null,
  support:            [],
  customIssueTypes:   [],
  tasks:              [],
  taskBuckets:        [],
  projects:           [],
  projectAttachments: [],
  partners:           [],
  teamMembers:        [],
  subscriptions:      [],
  brandFinance:       {},
  adSpend:            [],
  expenses:           [],
  meetings:           [],
  activeMeetingId:    null,
  meetingSearch:      '',
  plMonth:            null,
  dashChartMode:      'monthly',   // 'monthly' | 'channel'
  mktContentView:     'all',      // platform key or 'all'
  mktChartView:       'output',   // 'output' | 'spend' | 'impact'
  activeProjectId:    null,
  activePartnerId:    null,
  activeSubscriptionId: null,
  ideas:              [],
  commentBank:        [],
  commentBankFilter:  'pending',  // 'all' | 'pending' | 'replied'
  contentCalendar:    [],
  contentIdeas:       [],
  calWeek:            null,
  teamCalendar:       [],
  tcStart:            null,
  bfTab:              'overview',
  partnerLeads:      [],
  partnerTemplates:  [],
  partnerFilter:     'all',
  partnerView:       'pipeline',   // 'pipeline' | 'import' | 'templates' | 'stats'
  selectedPartnerId: null,
  partnerStats:      null
};


// ── Focus Timer state (persists across home re-renders) ───────────
const tmr = {
  mode:      'focus',   // 'focus' | 'break'
  focusMins: 25,
  breakMins: 5,
  remaining: 25 * 60,
  running:   false,
  sessions:  0,
  _iv:       null,
};
function _tmrTotal()  { return (tmr.mode === 'focus' ? tmr.focusMins : tmr.breakMins) * 60; }
function _tmrFmt(s)   { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function _tmrColor()  {
  if (tmr.mode === 'break') return 'rgba(255,255,255,0.65)';
  return tmr.remaining < 60 ? 'rgba(255,255,255,0.45)' : tmr.remaining < 300 ? 'rgba(255,255,255,0.65)' : '#ffffff';
}
function _tmrOffset() {
  const circ = +(2 * Math.PI * 52).toFixed(2);
  const pct  = _tmrTotal() > 0 ? tmr.remaining / _tmrTotal() : 1;
  return +(circ * (1 - pct)).toFixed(2);
}

function timerToggle() {
  if (tmr.running) {
    clearInterval(tmr._iv); tmr.running = false;
  } else {
    tmr.running = true;
    tmr._iv = setInterval(timerTick, 1000);
  }
  _tmrRender();
}
function timerReset() {
  clearInterval(tmr._iv); tmr.running = false;
  tmr.remaining = _tmrTotal();
  _tmrRender();
}
function timerTick() {
  if (tmr.remaining <= 0) {
    clearInterval(tmr._iv); tmr.running = false;
    if (tmr.mode === 'focus') { tmr.sessions++; tmr.mode = 'break'; }
    else { tmr.mode = 'focus'; }
    tmr.remaining = _tmrTotal();
    _tmrRender();
    showToast(tmr.mode === 'break' ? '✓ Focus session done — take a break!' : '☕ Break over — time to focus!');
    return;
  }
  tmr.remaining--;
  _tmrRender();
}
function timerSetMode(mode) {
  clearInterval(tmr._iv); tmr.running = false;
  tmr.mode = mode; tmr.remaining = _tmrTotal();
  _tmrRender();
}
function timerSetPreset(mode, mins) {
  clearInterval(tmr._iv); tmr.running = false;
  tmr.mode = mode;
  if (mode === 'focus') tmr.focusMins = mins; else tmr.breakMins = mins;
  tmr.remaining = _tmrTotal();
  _tmrRender();
}
function timerSetCustom() {
  const el  = document.getElementById('tmr-custom');
  const val = parseInt(el?.value);
  if (!val || val < 1 || val > 360) { el?.focus(); return; }
  el.value = '';
  timerSetPreset(tmr.mode, val);
}
function _tmrRender() {
  const arc  = document.getElementById('tmr-arc');
  if (!arc) return;
  const circ = +(2 * Math.PI * 52).toFixed(2);
  arc.setAttribute('stroke-dashoffset', _tmrOffset());
  arc.setAttribute('stroke', _tmrColor());
  document.getElementById('tmr-display').textContent   = _tmrFmt(tmr.remaining);
  document.getElementById('tmr-mode-label').textContent = tmr.mode === 'focus' ? 'Focus' : 'Break';
  const btn = document.getElementById('tmr-start');
  const isStart = !tmr.running && tmr.remaining === _tmrTotal();
  btn.textContent = tmr.running ? 'Pause' : isStart ? 'Start' : 'Resume';
  btn.className   = 'tmr-start-btn' + (tmr.running ? ' tmr-running' : '');
  document.getElementById('tmr-sessions-row').textContent =
    tmr.sessions === 0 ? 'No sessions yet today' :
    `${tmr.sessions} focus session${tmr.sessions !== 1 ? 's' : ''} completed`;
  document.querySelectorAll('.tmr-tab').forEach(b =>
    b.classList.toggle('tmr-tab-active', b.dataset.mode === tmr.mode));
  document.querySelectorAll('.tmr-preset').forEach(b => {
    const active = b.dataset.mode === tmr.mode &&
      +b.dataset.mins === (tmr.mode === 'focus' ? tmr.focusMins : tmr.breakMins);
    b.classList.toggle('tmr-preset-active', active);
  });
  document.title = tmr.running
    ? `${_tmrFmt(tmr.remaining)} — ${tmr.mode === 'focus' ? 'Focus' : 'Break'}`
    : 'BLC OS';
}
function _tmrHTML() {
  const circ = +(2 * Math.PI * 52).toFixed(2);
  return `
  <div class="home-timer-section">
    <div class="home-section-label">Focus Timer</div>
    <div class="home-timer-card">
      <div class="tmr-tabs">
        <button class="tmr-tab${tmr.mode==='focus'?' tmr-tab-active':''}" data-mode="focus" onclick="timerSetMode('focus')">Focus</button>
        <button class="tmr-tab${tmr.mode==='break'?' tmr-tab-active':''}" data-mode="break" onclick="timerSetMode('break')">Break</button>
      </div>
      <div class="tmr-ring-wrap">
        <svg class="tmr-svg" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
          <circle id="tmr-arc" cx="60" cy="60" r="52" fill="none"
            stroke="${_tmrColor()}" stroke-width="8"
            stroke-dasharray="${circ}" stroke-dashoffset="${_tmrOffset()}"
            stroke-linecap="round" transform="rotate(-90 60 60)"
            style="transition:stroke-dashoffset 0.8s linear,stroke 0.3s"/>
        </svg>
        <div class="tmr-center">
          <div class="tmr-display" id="tmr-display">${_tmrFmt(tmr.remaining)}</div>
          <div class="tmr-mode-label" id="tmr-mode-label">${tmr.mode==='focus'?'Focus':'Break'}</div>
        </div>
      </div>
      <div class="tmr-controls">
        <button id="tmr-start" class="tmr-start-btn${tmr.running?' tmr-running':''}" onclick="timerToggle()">
          ${tmr.running ? 'Pause' : tmr.remaining === _tmrTotal() ? 'Start' : 'Resume'}
        </button>
        <button class="tmr-reset-btn" onclick="timerReset()">Reset</button>
      </div>
      <div class="tmr-presets">
        <button class="tmr-preset${tmr.mode==='focus'&&tmr.focusMins===25?' tmr-preset-active':''}" data-mode="focus" data-mins="25" onclick="timerSetPreset('focus',25)">25m</button>
        <button class="tmr-preset${tmr.mode==='focus'&&tmr.focusMins===50?' tmr-preset-active':''}" data-mode="focus" data-mins="50" onclick="timerSetPreset('focus',50)">50m</button>
        <span class="tmr-sep">·</span>
        <button class="tmr-preset${tmr.mode==='break'&&tmr.breakMins===5?' tmr-preset-active':''}" data-mode="break" data-mins="5" onclick="timerSetPreset('break',5)">5m break</button>
        <button class="tmr-preset${tmr.mode==='break'&&tmr.breakMins===10?' tmr-preset-active':''}" data-mode="break" data-mins="10" onclick="timerSetPreset('break',10)">10m break</button>
        <span class="tmr-sep">·</span>
        <input type="number" id="tmr-custom" class="tmr-custom-input" min="1" max="360" placeholder="min"
          onkeydown="if(event.key==='Enter')timerSetCustom()" title="Custom duration in minutes">
        <button class="tmr-preset" onclick="timerSetCustom()">Set</button>
      </div>
      <div class="tmr-sessions-row" id="tmr-sessions-row">
        ${tmr.sessions===0?'No sessions yet today':`${tmr.sessions} focus session${tmr.sessions!==1?'s':''} completed`}
      </div>
    </div>
  </div>`;
}

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

// Filter a video list to those posted in a given YYYY-MM month

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
  closeMobileNav();
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
  closeMobileNav();
  state.currentPage = page;
  // Light the page itself, or the hub it lives under — otherwise nothing in
  // the sidebar is lit while you're inside a tool and you lose your place.
  const parentHub = PAGE_PARENT_HUB[page];
  document.querySelectorAll('.nav-item:not(.nav-cl-item)').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page || el.dataset.page === parentHub);
  });
  // Clear Creative Lab active state, then re-apply if on scripts page
  document.querySelectorAll('.nav-cl-item').forEach(el => el.classList.remove('active'));
  if (page === 'scripts') {
    document.getElementById('nav-group-creative')?.classList.add('open');
    updateScriptsNav();
  }
  const renderers = {
    home:         renderHomePage,
    marketing:    renderMarketingPage,
    growth:       () => renderHubPage('growth'),
    operations:   () => renderHubPage('operations'),
    projects:     renderProjectsPage,
    project:      renderProjectDetailPage,
    partners:     renderPartnersPage,
    partner:      renderPartnerDetailPage,
    meetings:     renderMeetingsPage,
    meeting:      renderMeetingDetailPage,
    team:         renderTeamPage,
    subscriptions: renderSubscriptionsPage,
    subscription:  renderSubscriptionDetailPage,
    tasks:        renderTasksPage,
    ideas:        renderIdeasPage,
    'comment-bank': renderCommentBankPage,
    scripts:      renderScriptsPage,
    'brand-finance': renderBrandFinancePage,
    challenge:          renderChallengePage,
    support:            renderSupportPage,
    'content-calendar': renderContentCalendarPage,
    'team-calendar':    renderTeamCalendarPage,
    'partner-outreach': renderPartnerOutreachPage
  };
  if (renderers[page]) renderers[page]();
}

// ============================================================
// HUBS
// A hub is a section landing page: banner with live stats, a hero
// card for the day's main action, then a grid of cards that drill
// into the tools. The sidebar holds one entry per hub, so finding
// something is "pick the area, then pick the tool" rather than
// scanning eighteen flat links.
// ============================================================

// Stroke icons, lucide-ish, sized by the container
const HUB_ICONS = {
  calendar:  '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  calCheck:  '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 16l2 2 4-4"/>',
  comment:   '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  flask:     '<path d="M9 3h6M10 3v6L5 19a2 2 0 002 2h10a2 2 0 002-2l-5-10V3"/>',
  images:    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  envelope:  '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  users:     '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  dollar:    '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
  tasks:     '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
  headset:   '<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>',
  eye:       '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  chart:     '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  handshake: '<path d="M8 21V9a2 2 0 012-2h4a2 2 0 012 2v12"/><path d="M2 21h20"/><path d="M4 21V11l4-3M20 21V11l-4-3"/>',
  plus:      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  card:      '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  tag:       '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>',
  doc:       '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
};

function hubIcon(key) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${HUB_ICONS[key] || ''}</svg>`;
}

// Counts shown on the banner. Each returns [value, label] pairs and is
// called at render time so the numbers are always live.
const HUBS = {
  marketing: {
    title:   'Marketing',
    promise: 'Make the content that sells.',
    sub:     'Everything that goes into planning, writing and publishing.',
    stats: () => [
      [state.contentCalendar.length,                                        'Scheduled'],
      [state.contentIdeas.length,                                           'Ideas'],
      [state.commentBank.filter(c => c.status !== 'replied').length,        'To reply'],
      [state.challengers.length,                                            'Challengers']
    ],
    hero: {
      page: 'content-calendar', icon: 'calendar', eyebrow: 'THIS WEEK',
      name: 'Content Calendar', desc: 'Plan what goes out and when', cta: 'Plan the week →'
    },
    cards: [
      { page: 'comment-bank',  icon: 'comment',  name: 'Comment Bank',   desc: 'Comments worth replying to',       cta: 'Reply →' },
      { page: 'scripts',       icon: 'flask',    name: 'Creative Lab',   desc: 'Write, rewrite and analyse scripts', cta: 'Open →' },
      { page: 'challenge',     icon: 'images',   name: 'Before & Afters', desc: 'The BBL challenge and its results', cta: 'View →' }
    ]
  },

  growth: {
    title:   'Growth',
    promise: 'More people selling for us.',
    sub:     'The esthetician partner network — the distribution we own and run ourselves.',
    stats: () => [
      [state.partnerLeads.filter(l => ['contacted','replied','applied'].includes(l.status)).length, 'In pipeline'],
      [state.partnerLeads.filter(l => l.status === 'replied').length,                               'Replied'],
      [state.partnerLeads.filter(l => l.status === 'accepted').length,                              'Accepted'],
      [state.partners.length,                                                                       'Partners']
    ],
    hero: {
      page: 'partner-outreach', icon: 'envelope', eyebrow: "TODAY'S OUTREACH",
      name: 'Pro Partner Outreach', desc: 'Reach the estheticians who move product', cta: 'Send today\'s DMs →'
    },
    // Partners lives in Operations — it covers manufacturing and accounting
    // as much as growth, and the same card in two hubs reads as two pages.
    cards: []
  },

  operations: {
    title:   'Operations',
    promise: 'Keep the business running.',
    sub:     'The work, the customers, and the money behind it.',
    stats: () => [
      [state.tasks.filter(t => !t.completed && !t.archived).length,                                    'Open tasks'],
      [state.tasks.filter(t => !t.completed && !t.archived && t.deadline && deadlineSortKey(t.deadline) < 0).length, 'Overdue'],
      [state.tasks.filter(t => t.assignee === 'for-founder' && !t.completed && !t.archived).length,    'For review'],
      [state.support.filter(i => (i.issue_date || '').startsWith(new Date().toISOString().slice(0, 7))).length, 'Issues this month']
    ],
    hero: {
      page: 'tasks', icon: 'tasks', eyebrow: 'TODAY',
      name: 'Team Tasks', desc: 'What everyone is working on, by person', cta: 'Open the board →'
    },
    cards: [
      { page: 'support',       icon: 'headset',   name: 'Customer Support', desc: 'Log and track customer issues',        cta: 'Handle →' },
      { page: 'brand-finance', icon: 'chart',     name: 'Financials',       desc: 'Revenue, inventory, pricing and cash',  cta: 'Open →' },
      { page: 'partners',      icon: 'handshake', name: 'Partners',         desc: 'Manufacturing, Amazon, accounting, agencies', cta: 'Open →' },
      { page: 'subscriptions', icon: 'card',      name: 'Subscriptions',    desc: 'What we pay for every month, and the total', cta: 'Track →' },
      { page: 'meetings',      icon: 'doc',       name: 'Meetings',         desc: 'Minutes and decisions, searchable',          cta: 'Open →' },
      { page: 'team-calendar', icon: 'calCheck',  name: 'Team Calendar',    desc: "Who's out, off, or slow to reply",           cta: 'Check →' },
      { page: 'team',          icon: 'users',     name: 'Team',             desc: 'Add people and give them a task column',    cta: 'Manage →' }
    ]
  }
};

// Which hub each tool page belongs to, derived from HUBS itself so it can
// never drift from the cards actually on screen. Used to keep the parent
// hub lit in the sidebar while you're inside one of its tools.
// Every tool has its own sidebar entry now, so this only covers detail
// pages — a record lights the list it came from, not a section.
const PAGE_PARENT_HUB = {
  project:      'projects',
  partner:      'partners',
  subscription: 'subscriptions',
  meeting:      'meetings'
};


function renderHubPage(key) {
  const hub = HUBS[key];
  if (!hub) return;
  document.getElementById('page-content').innerHTML = `
    <div class="hub-banner">
      <h1 class="hub-title">${esc(hub.title)}</h1>
      <div class="hub-promise">${esc(hub.promise)}</div>
      <div class="hub-sub">${esc(hub.sub)}</div>
      <div class="hub-stats">
        ${hub.stats().map(([value, label]) => `
          <div class="hub-stat">
            <div class="hub-stat-value">${esc(String(value))}</div>
            <div class="hub-stat-label">${esc(label)}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

// ============================================================
// PROJECTS
// The initiatives the business is pushing on. Bigger than a task,
// narrower than a hub. Tasks link to a project, so progress is
// derived from real work rather than a number someone maintains.
// ============================================================

const PROJECT_STATUSES = [
  { key: 'planning', label: 'Planning' },
  { key: 'active',   label: 'Active'   },
  { key: 'paused',   label: 'Paused'   },
  { key: 'done',     label: 'Done'     }
];

function projectTasks(id) {
  return state.tasks.filter(t => t.project_id === id && !t.archived);
}

function projectProgress(id) {
  const tasks = projectTasks(id);
  if (!tasks.length) return { done: 0, total: 0, pct: 0 };
  const done = tasks.filter(t => t.completed).length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}

function projectsSorted() {
  return [...state.projects].sort((a, b) => a.position - b.position);
}

function renderProjectsPage() {
  const projects = projectsSorted();
  const active   = projects.filter(p => p.status === 'active').length;
  const done     = projects.filter(p => p.status === 'done').length;
  const openWork = projects.reduce((s, p) => s + projectTasks(p.id).filter(t => !t.completed).length, 0);

  document.getElementById('page-content').innerHTML = `
    <div class="hub-banner">
      <h1 class="hub-title">Projects</h1>
      <div class="hub-promise">The bets we're making this quarter.</div>
      <div class="hub-sub">Each one spans several areas of the business. Progress comes from the tasks under it.</div>
      <div class="hub-stats">
        <div class="hub-stat"><div class="hub-stat-value">${active}</div><div class="hub-stat-label">Active</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${openWork}</div><div class="hub-stat-label">Open tasks</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${done}</div><div class="hub-stat-label">Done</div></div>
      </div>
    </div>

    <div class="hub-grid">
      ${projects.map(p => {
        const pr = projectProgress(p.id);
        const st = PROJECT_STATUSES.find(s => s.key === p.status) || PROJECT_STATUSES[1];
        const due = p.target_date ? fmtDeadline(p.target_date) : null;
        return `
        <button class="hub-card proj-card" onclick="openProjectDetail('${p.id}')">
          <span class="proj-status proj-status-${p.status}">${st.label}</span>
          <div class="hub-card-name">${esc(p.name)}</div>
          <div class="hub-card-desc">${esc(p.description || 'No description yet')}</div>
          <div class="proj-bar"><div class="proj-bar-fill" style="width:${pr.pct}%"></div></div>
          <div class="proj-meta">
            <span>${pr.total ? `${pr.done}/${pr.total} tasks · ${pr.pct}%` : 'No tasks yet'}</span>
            ${due ? `<span class="task-deadline ${due.cls}">${due.text}</span>` : ''}
          </div>
        </button>`;
      }).join('')}

      <button class="hub-card proj-card proj-card-new" onclick="openProjectEditor()">
        <div class="hub-ico">${hubIcon('plus')}</div>
        <div class="hub-card-name">New project</div>
        <div class="hub-card-desc">Start tracking another initiative</div>
      </button>
    </div>
  `;
}

// Each project gets its own page rather than a modal — a project is a
// place you work out of, not something you glance at and dismiss.
function openProjectDetail(id) {
  state.activeProjectId = id;
  navigate('project');
}

// A task's row status. Tasks are a completed boolean, not a tri-state, so
// this is derived rather than stored: dated-and-unfinished work is moving,
// undated work is not scheduled yet.
function projectTaskStatus(t) {
  if (t.completed) return { label: 'Completed', cls: 'pd-st-done' };
  if (t.deadline) {
    return deadlineSortKey(t.deadline) < 0
      ? { label: 'Overdue', cls: 'pd-st-late' }
      : { label: 'In Progress', cls: 'pd-st-going' };
  }
  return { label: 'Pending', cls: 'pd-st-idle' };
}

const ATTACH_ICONS = {
  figma: '<rect x="7" y="2" width="10" height="20" rx="5"/><circle cx="12" cy="12" r="3"/>',
  drive: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  pdf:   '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>',
  doc:   '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  link:  '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>'
};

function attachIcon(kind) {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ATTACH_ICONS[kind] || ATTACH_ICONS.link}</svg>`;
}

function renderProjectDetailPage() {
  const p = state.projects.find(x => x.id === state.activeProjectId);
  if (!p) { navigate('projects'); return; }

  const tasks = projectTasks(p.id).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline);
  });
  const pr  = projectProgress(p.id);
  const st  = PROJECT_STATUSES.find(s => s.key === p.status) || PROJECT_STATUSES[1];
  const files = (state.projectAttachments || []).filter(a => a.project_id === p.id);

  // "Assignees" plural in the design, but a project stores one owner. The
  // people actually doing the work are more informative, so the owner leads
  // and anyone with a task here follows.
  const workers = [...new Set(tasks.map(t => t.assignee).filter(k => k && k !== 'for-founder'))];
  const people  = [...new Set([p.owner, ...workers].filter(Boolean))];

  const started = p.created_at ? p.created_at.slice(0, 10) : null;
  const tags    = Array.isArray(p.tags) ? p.tags : [];

  document.getElementById('page-content').innerHTML = `
    <div class="pd-shell">

      <div class="pd-topbar">
        <div class="pd-crumbs">
          <button class="pd-crumb-link" onclick="navigate('projects')">Projects</button>
          <span class="pd-crumb-sep">/</span>
          <span class="pd-crumb-here">${esc(p.name)}</span>
        </div>
        <div class="pd-topbar-actions">
          <button class="pd-icon-btn" onclick="openProjectEditor('${p.id}')" title="Edit project">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="pd-icon-btn pd-icon-danger" onclick="deleteProject('${p.id}')" title="Delete project">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
          <button class="pd-icon-btn" onclick="navigate('projects')" title="Close">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="pd-body">
        <h1 class="pd-title pd-stagger" style="--i:0">${esc(p.name)}</h1>

        <div class="pd-meta pd-stagger" style="--i:1">
          <div class="pd-meta-item">
            <span class="pd-meta-ico">${hubIcon('chart')}</span>
            <div>
              <div class="pd-meta-label">Status</div>
              <span class="pd-pill pd-pill-${p.status}">
                <span class="pd-pill-dot"></span>${st.label}
              </span>
            </div>
          </div>

          <div class="pd-meta-item">
            <span class="pd-meta-ico">${hubIcon('users')}</span>
            <div>
              <div class="pd-meta-label">${people.length > 1 ? 'People' : 'Owner'}</div>
              <div class="pd-people">
                ${people.length ? people.map(k => `
                  <span class="pd-person">
                    <span class="focus-avatar">${esc(memberInitials(k))}</span>
                    <span>${esc(memberName(k))}</span>
                  </span>`).join('') : '<span class="pd-muted">Unassigned</span>'}
              </div>
            </div>
          </div>

          <div class="pd-meta-item">
            <span class="pd-meta-ico">${hubIcon('calendar')}</span>
            <div>
              <div class="pd-meta-label">Dates</div>
              <div class="pd-dates">
                <span>${started || '—'}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                <span>${p.target_date || 'No target'}</span>
              </div>
            </div>
          </div>

          <div class="pd-meta-item">
            <span class="pd-meta-ico">${hubIcon('tag')}</span>
            <div>
              <div class="pd-meta-label">Tags</div>
              <div class="pd-tags">
                ${tags.length
                  ? tags.map(t => `<span class="pd-tag">${esc(t)}</span>`).join('')
                  : '<span class="pd-muted">None yet — add them in Edit project</span>'}
              </div>
            </div>
          </div>

          <div class="pd-meta-item pd-meta-wide">
            <span class="pd-meta-ico">${hubIcon('doc')}</span>
            <div>
              <div class="pd-meta-label">Description</div>
              <div class="pd-desc">${p.description ? esc(p.description) : '<span class="pd-muted">No description yet</span>'}</div>
            </div>
          </div>

          <div class="pd-meta-item">
            <span class="pd-meta-ico">${hubIcon('tasks')}</span>
            <div>
              <div class="pd-meta-label">Progress</div>
              <div class="pd-progress-line">
                <div class="proj-bar" style="width:120px"><div class="proj-bar-fill" style="width:${pr.pct}%"></div></div>
                <span class="pd-progress-num">${pr.pct}%</span>
              </div>
              <div class="pd-muted" style="margin-top:3px">${pr.total ? `${pr.done} of ${pr.total} done` : 'No tasks yet'}</div>
            </div>
          </div>
        </div>

        <div class="pd-section pd-stagger" style="--i:2">
          <div class="pd-section-head">
            <h3 class="pd-section-title">
              ${hubIcon('paperclip')} Attachments
              <span class="pd-count">${files.length}</span>
            </h3>
          </div>
          <div class="pd-files">
            ${files.map(f => `
              <div class="pd-file">
                <a class="pd-file-main" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">
                  <span class="pd-file-ico">${attachIcon(f.kind)}</span>
                  <span class="pd-file-text">
                    <span class="pd-file-name">${esc(f.name)}</span>
                    <span class="pd-file-kind">${esc(f.kind || 'link')}</span>
                  </span>
                </a>
                <button class="pd-file-x" onclick="deleteAttachment('${f.id}')" title="Remove">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>`).join('')}
            <button class="pd-file-add" onclick="openAttachmentModal('${p.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        <div class="pd-section pd-stagger" style="--i:3">
          <div class="pd-section-head">
            <h3 class="pd-section-title">Task list <span class="pd-count">${tasks.length}</span></h3>
          </div>
          <div class="pd-table-wrap">
            <table class="pd-table">
              <thead>
                <tr>
                  <th style="width:44px">No</th>
                  <th>Task</th>
                  <th style="width:120px">Category</th>
                  <th style="width:130px">Status</th>
                  <th style="width:120px" class="pd-right">Due</th>
                </tr>
              </thead>
              <tbody id="pd-task-rows">
                ${tasks.length ? tasks.map((t, i) => {
                  const s  = projectTaskStatus(t);
                  const dl = fmtDeadline(t.deadline);
                  const cat = t.tag === 'revenue' ? 'Revenue' : t.tag === 'brand' ? 'Brand' : '—';
                  return `
                  <tr class="${t.completed ? 'pd-row-done' : ''}">
                    <td class="pd-muted">${i + 1}</td>
                    <td>
                      <button class="pd-task-check${t.completed ? ' pd-checked' : ''}" onclick="toggleProjectTask('${t.id}')" title="${t.completed ? 'Mark not done' : 'Mark done'}">
                        ${t.completed ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
                      </button>
                      <span class="pd-task-name" onclick="openTaskDetail('${t.id}')">${esc(t.title)}</span>
                    </td>
                    <td class="pd-muted">${cat}</td>
                    <td><span class="pd-status ${s.cls}">${s.label}</span></td>
                    <td class="pd-right">${dl ? `<span class="task-deadline ${dl.cls}">${dl.text}</span>` : '<span class="pd-muted">—</span>'}</td>
                  </tr>`;
                }).join('') : `
                  <tr><td colspan="5" class="pd-empty">Nothing here yet — add the first piece of work below.</td></tr>`}
              </tbody>
            </table>
          </div>
          <button class="focus-add-btn" style="max-width:280px" onclick="startAddProjectTask('${p.id}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add task to this project
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Attachments ─────────────────────────────────────────────────
async function loadProjectAttachments() {
  state.projectAttachments = await fetchAPI(API.projectAttachments).catch(() => []) || [];
}

function openAttachmentModal(projectId) {
  openModal('Add Attachment', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">Link</label>
        <input class="form-input" id="at-url" placeholder="Figma, Google Doc, Notion page, any URL">
      </div>
      <div class="form-group">
        <label class="form-label">Label</label>
        <input class="form-input" id="at-name" placeholder="Optional — defaults to the site name" maxlength="120">
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveAttachment('${projectId}')">Add</button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('at-url')?.focus(), 60);
}

async function saveAttachment(projectId) {
  const url  = document.getElementById('at-url')?.value.trim();
  const name = document.getElementById('at-name')?.value.trim();
  if (!url) { showToast('A link is required', 'error'); return; }
  try {
    const row = await fetchAPI(API.projectAttachments, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, url, name: name || null })
    });
    state.projectAttachments.push(row);
    closeModal();
    renderProjectDetailPage();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteAttachment(id) {
  try {
    await fetchAPI(`${API.projectAttachments}/${id}`, { method: 'DELETE' });
    state.projectAttachments = state.projectAttachments.filter(a => a.id !== id);
    renderProjectDetailPage();
  } catch (err) { showToast(err.message, 'error'); }
}

// Toggling from the project page re-renders here rather than the board
async function toggleProjectTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  try {
    const updated = await fetchAPI(`${API.tasks}/${id}`, {
      method: 'PUT', body: JSON.stringify({ completed: !task.completed })
    });
    const i = state.tasks.findIndex(t => t.id === id);
    if (i !== -1) state.tasks[i] = updated;
    renderProjectDetailPage();
    updateTasksUrgentBadge();
  } catch (err) { showToast(err.message, 'error'); }
}

// New work starts on the project owner's board, falling back to Gibran
function startAddProjectTask(projectId) {
  const listEl = document.getElementById('proj-page-tasks');
  if (!listEl || listEl.querySelector('.focus-add-row')) return;
  listEl.querySelector('.focus-empty')?.remove();
  const project = state.projects.find(p => p.id === projectId);
  const row = document.createElement('div');
  row.className = 'focus-task focus-add-row';
  row.innerHTML = `
    <span class="focus-check"></span>
    <input class="focus-add-input" type="text" placeholder="What needs doing?" maxlength="120">
  `;
  listEl.appendChild(row);
  const input = row.querySelector('input');
  input.focus();

  let settled = false;
  async function commit() {
    if (settled) return;
    settled = true;
    const title = input.value.trim();
    row.remove();
    if (!title) { renderProjectDetailPage(); return; }
    try {
      const task = await fetchAPI(API.tasks, {
        method: 'POST',
        body: JSON.stringify({ title, assignee: project?.owner || 'founder', project_id: projectId })
      });
      state.tasks.push(task);
      renderProjectDetailPage();
      updateTasksUrgentBadge();
    } catch (err) { showToast(err.message, 'error'); }
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') { settled = true; row.remove(); renderProjectDetailPage(); }
  });
  input.addEventListener('blur', () => setTimeout(commit, 150));
}

function openProjectEditor(id) {
  const p = id ? state.projects.find(x => x.id === id) : null;
  openModal(p ? 'Edit Project' : 'New Project', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" id="pj-name" value="${p ? esc(p.name) : ''}" placeholder="e.g. Wholesale" maxlength="80">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="pj-desc" rows="2" placeholder="What does winning look like?">${p ? esc(p.description || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Tags</label>
        <input class="form-input" id="pj-tags" placeholder="Comma separated — e.g. Revenue, Q3"
               value="${p && Array.isArray(p.tags) ? esc(p.tags.join(', ')) : ''}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Status</label>
          <select class="form-input" id="pj-status">
            ${PROJECT_STATUSES.map(s => `<option value="${s.key}" ${p && p.status === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Owner</label>
          <select class="form-input" id="pj-owner">
            <option value="">Unassigned</option>
            ${activeMembers().map(m => `<option value="${m.member_key}" ${p && p.owner === m.member_key ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Target date</label>
          <input type="date" class="form-input" id="pj-target" value="${p ? (p.target_date || '') : ''}">
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveProject(${p ? `'${id}'` : 'null'})">Save</button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('pj-name')?.focus(), 60);
}

async function saveProject(id) {
  const body = {
    name:        document.getElementById('pj-name')?.value.trim(),
    description: document.getElementById('pj-desc')?.value.trim() || null,
    status:      document.getElementById('pj-status')?.value,
    owner:       document.getElementById('pj-owner')?.value || null,
    target_date: document.getElementById('pj-target')?.value || null,
    tags: (document.getElementById('pj-tags')?.value || '')
            .split(',').map(t => t.trim()).filter(Boolean)
  };
  if (!body.name) { showToast('Name is required', 'error'); return; }
  try {
    if (id) {
      const updated = await fetchAPI(`${API.projects}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const i = state.projects.findIndex(p => p.id === id);
      if (i !== -1) state.projects[i] = updated;
    } else {
      state.projects.push(await fetchAPI(API.projects, { method: 'POST', body: JSON.stringify(body) }));
    }
    closeModal();
    // Editing from a project's own page should land you back on it
    if (state.currentPage === 'project') renderProjectDetailPage(); else renderProjectsPage();
    showToast('Saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteProject(id) {
  const p = state.projects.find(x => x.id === id);
  const n = projectTasks(id).length;
  if (!confirm(`Delete "${p?.name}"?${n ? `\n\n${n} task${n === 1 ? '' : 's'} will stay in Team Tasks, just unlinked. Nothing is deleted.` : ''}`)) return;
  try {
    await fetchAPI(`${API.projects}/${id}`, { method: 'DELETE' });
    state.projects = state.projects.filter(x => x.id !== id);
    state.tasks.forEach(t => { if (t.project_id === id) t.project_id = null; });
    closeModal();
    if (state.activeProjectId === id) state.activeProjectId = null;
    navigate('projects');            // its page no longer exists
    showToast('Project deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// PARTNERS
// The outside parties the business runs on. Categories are free
// text, so a new kind of partner never needs a schema change.
// ============================================================

function partnersSorted() {
  return [...state.partners].sort((a, b) => a.position - b.position);
}

function renderPartnersPage() {
  const partners = partnersSorted();
  const categories = [...new Set(partners.map(p => p.category).filter(Boolean))];

  document.getElementById('page-content').innerHTML = `
    <div class="hub-banner">
      <h1 class="hub-title">Partners</h1>
      <div class="hub-promise">Everyone outside the company we depend on.</div>
      <div class="hub-sub">Manufacturing, marketplaces, accounting, agencies, contractors — with the details in one place instead of scattered across notes.</div>
      <div class="hub-stats">
        <div class="hub-stat"><div class="hub-stat-value">${partners.length}</div><div class="hub-stat-label">Partners</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${categories.length}</div><div class="hub-stat-label">Categories</div></div>
      </div>
    </div>

    <div class="hub-grid">
      ${partners.map(p => `
        <button class="hub-card partner-card" onclick="openPartnerDetail('${p.id}')">
          ${p.category ? `<span class="partner-cat">${esc(p.category)}</span>` : ''}
          <div class="hub-card-name">${esc(p.name)}</div>
          ${p.contact_name  ? `<div class="partner-line">${esc(p.contact_name)}</div>` : ''}
          ${p.contact_email ? `<div class="partner-line partner-mono">${esc(p.contact_email)}</div>` : ''}
          ${p.contact_phone ? `<div class="partner-line partner-mono">${esc(p.contact_phone)}</div>` : ''}
          ${p.notes ? `<div class="hub-card-desc">${esc(p.notes)}</div>` : ''}
          <div class="hub-card-cta">Open →</div>
        </button>`).join('')}

      <button class="hub-card partner-card proj-card-new" onclick="openPartnerEditor()">
        <div class="hub-ico">${hubIcon('plus')}</div>
        <div class="hub-card-name">Add partner</div>
        <div class="hub-card-desc">Anyone outside the company we work with</div>
      </button>
    </div>
  `;
}

// A row of label/value pairs, skipping anything blank so a sparse record
// reads as a short page rather than a wall of dashes.
function detailFields(pairs) {
  const filled = pairs.filter(([, v]) => v);
  if (!filled.length) return '';
  return `<div class="detail-grid">${filled.map(([label, value, mono]) => `
    <div class="detail-field">
      <div class="detail-label">${esc(label)}</div>
      <div class="detail-value${mono ? ' partner-mono' : ''}">${value}</div>
    </div>`).join('')}</div>`;
}

function openPartnerDetail(id) {
  state.activePartnerId = id;
  navigate('partner');
}

function renderPartnerDetailPage() {
  const p = state.partners.find(x => x.id === state.activePartnerId);
  if (!p) { navigate('partners'); return; }
  const link = p.link
    ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer" class="detail-link">${esc(p.link)}</a>`
    : null;

  document.getElementById('page-content').innerHTML = `
    <button class="proj-back" onclick="navigate('partners')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      All partners
    </button>

    <div class="hub-banner">
      ${p.category ? `<span class="partner-cat" style="top:26px;right:30px">${esc(p.category)}</span>` : ''}
      <h1 class="hub-title">${esc(p.name)}</h1>
      ${p.contact_name ? `<div class="hub-promise">${esc(p.contact_name)}</div>` : ''}
    </div>

    ${detailFields([
      ['Email', p.contact_email ? esc(p.contact_email) : null, true],
      ['Phone', p.contact_phone ? esc(p.contact_phone) : null, true],
      ['Link',  link]
    ])}

    ${p.notes ? `
    <div class="detail-notes">
      <div class="detail-label">Notes</div>
      <div class="detail-notes-body">${esc(p.notes)}</div>
    </div>` : ''}

    <div class="proj-page-actions">
      <button class="btn btn-secondary btn-sm" onclick="openPartnerEditor('${p.id}')">Edit partner</button>
      <button class="btn btn-danger btn-sm" onclick="deletePartner('${p.id}')">Delete</button>
    </div>
  `;
}

function openSubscriptionDetail(id) {
  state.activeSubscriptionId = id;
  navigate('subscription');
}

function renderSubscriptionDetailPage() {
  const s = state.subscriptions.find(x => x.id === state.activeSubscriptionId);
  if (!s) { navigate('subscriptions'); return; }
  const cyc = SUB_CYCLES.find(c => c.key === s.cycle) || SUB_CYCLES[1];
  const due = s.renews_on ? fmtDeadline(s.renews_on) : null;
  const link = s.link
    ? `<a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer" class="detail-link">${esc(s.link)}</a>`
    : null;

  document.getElementById('page-content').innerHTML = `
    <button class="proj-back" onclick="navigate('subscriptions')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      All subscriptions
    </button>

    <div class="hub-banner">
      <span class="partner-cat" style="top:26px;right:30px">${s.status === 'cancelled' ? 'Cancelled' : 'Active'}</span>
      <h1 class="hub-title">${esc(s.name)}</h1>
      ${s.category ? `<div class="hub-sub" style="margin-top:6px">${esc(s.category)}</div>` : ''}
      <div class="hub-stats">
        <div class="hub-stat">
          <div class="hub-stat-value">${money(parseFloat(s.amount) || 0)}</div>
          <div class="hub-stat-label">Per ${cyc.label.toLowerCase().replace('ly', '')}</div>
        </div>
        <div class="hub-stat"><div class="hub-stat-value">${money(subMonthly(s))}</div><div class="hub-stat-label">Per month</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${money(subMonthly(s) * 12)}</div><div class="hub-stat-label">Per year</div></div>
        ${s.renews_on ? `
        <div class="hub-stat">
          <div class="hub-stat-value" style="font-size:18px;padding-top:10px">${s.renews_on}</div>
          <div class="hub-stat-label">Renews${due ? ` · ${due.text}` : ''}</div>
        </div>` : ''}
      </div>
    </div>

    ${detailFields([
      ['Paid with', s.paid_with ? esc(s.paid_with) : null],
      ['Owner',     s.owner ? esc(memberName(s.owner)) : null],
      ['Link',      link]
    ])}

    ${s.notes ? `
    <div class="detail-notes">
      <div class="detail-label">Notes</div>
      <div class="detail-notes-body">${esc(s.notes)}</div>
    </div>` : ''}

    <div class="proj-page-actions">
      <button class="btn btn-secondary btn-sm" onclick="openSubscriptionEditor('${s.id}')">Edit subscription</button>
      <button class="btn btn-danger btn-sm" onclick="deleteSubscription('${s.id}')">Delete</button>
    </div>
  `;
}

function openPartnerEditor(id) {
  const p = id ? state.partners.find(x => x.id === id) : null;
  const known = [...new Set(state.partners.map(x => x.category).filter(Boolean))];
  openModal(p ? 'Edit Partner' : 'Add Partner', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Name</label>
          <input class="form-input" id="pn-name" value="${p ? esc(p.name) : ''}" placeholder="e.g. Amazon" maxlength="80">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Category</label>
          <input class="form-input" id="pn-category" list="pn-cats" value="${p ? esc(p.category || '') : ''}" placeholder="e.g. Supply chain">
          <datalist id="pn-cats">${known.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Contact name</label>
          <input class="form-input" id="pn-contact" value="${p ? esc(p.contact_name || '') : ''}" placeholder="Who we talk to">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Phone</label>
          <input class="form-input" id="pn-phone" value="${p ? esc(p.contact_phone || '') : ''}" placeholder="Optional">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Email</label>
          <input class="form-input" id="pn-email" value="${p ? esc(p.contact_email || '') : ''}" placeholder="Optional">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Link</label>
          <input class="form-input" id="pn-link" value="${p ? esc(p.link || '') : ''}" placeholder="Portal or dashboard URL">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="pn-notes" rows="3" placeholder="Terms, lead times, account numbers, anything worth remembering">${p ? esc(p.notes || '') : ''}</textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:space-between;padding-top:4px">
        ${p ? `<button class="btn btn-danger btn-sm" onclick="deletePartner('${id}')">Delete</button>` : '<span></span>'}
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="savePartner(${p ? `'${id}'` : 'null'})">Save</button>
        </div>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('pn-name')?.focus(), 60);
}

async function savePartner(id) {
  const v = i => document.getElementById(i)?.value.trim() || null;
  const body = {
    name: v('pn-name'), category: v('pn-category'), contact_name: v('pn-contact'),
    contact_email: v('pn-email'), contact_phone: v('pn-phone'),
    link: v('pn-link'), notes: v('pn-notes')
  };
  if (!body.name) { showToast('Name is required', 'error'); return; }
  try {
    if (id) {
      const updated = await fetchAPI(`${API.partners}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const i = state.partners.findIndex(p => p.id === id);
      if (i !== -1) state.partners[i] = updated;
    } else {
      state.partners.push(await fetchAPI(API.partners, { method: 'POST', body: JSON.stringify(body) }));
    }
    closeModal();
    if (state.currentPage === 'partner') renderPartnerDetailPage(); else renderPartnersPage();
    showToast('Saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deletePartner(id) {
  const p = state.partners.find(x => x.id === id);
  if (!confirm(`Remove "${p?.name}" from Partners?`)) return;
  try {
    await fetchAPI(`${API.partners}/${id}`, { method: 'DELETE' });
    state.partners = state.partners.filter(x => x.id !== id);
    closeModal();
    if (state.activePartnerId === id) state.activePartnerId = null;
    navigate('partners');            // its page no longer exists
    showToast('Partner removed');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// TEAM
// The roster is data, not columns in the code. Adding someone here
// gives them a Team Tasks column, a Team Calendar row, and a slot in
// every assignee and owner dropdown.
// ============================================================

function renderTeamPage() {
  const members = [...state.teamMembers].sort((a, b) => a.position - b.position);
  const load = key => state.tasks.filter(t => t.assignee === key && !t.completed && !t.archived).length;

  document.getElementById('page-content').innerHTML = `
    <div class="hub-banner">
      <h1 class="hub-title">Team</h1>
      <div class="hub-promise">Who's on the inside.</div>
      <div class="hub-sub">Everyone here gets a column on the task board and a row on the team calendar. Sign-in uses one shared password, so this is about assigning work, not accounts.</div>
      <div class="hub-stats">
        <div class="hub-stat"><div class="hub-stat-value">${members.filter(m => m.active).length}</div><div class="hub-stat-label">Active</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${state.tasks.filter(t => !t.completed && !t.archived).length}</div><div class="hub-stat-label">Open tasks</div></div>
      </div>
    </div>

    <div class="hub-grid">
      ${members.map(m => `
        <button class="hub-card partner-card${m.active ? '' : ' is-inactive'}" onclick="openMemberEditor('${m.id}')">
          <span class="partner-cat">${m.active ? 'Active' : 'Inactive'}</span>
          <div class="team-row">
            <span class="focus-avatar">${esc(m.initials || m.name[0].toUpperCase())}</span>
            <div class="hub-card-name">${esc(m.name)}</div>
          </div>
          <div class="hub-card-desc">${load(m.member_key)} open task${load(m.member_key) === 1 ? '' : 's'}</div>
          <div class="hub-card-cta">Edit →</div>
        </button>`).join('')}

      <button class="hub-card partner-card proj-card-new" onclick="openMemberEditor()">
        <div class="hub-ico">${hubIcon('plus')}</div>
        <div class="hub-card-name">Add team member</div>
        <div class="hub-card-desc">They'll get their own column straight away</div>
      </button>
    </div>
  `;
}

function openMemberEditor(id) {
  const m = id ? state.teamMembers.find(x => x.id === id) : null;
  openModal(m ? 'Edit Team Member' : 'Add Team Member', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Name</label>
          <input class="form-input" id="tm-name" value="${m ? esc(m.name) : ''}" placeholder="e.g. Nia" maxlength="60">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Initials</label>
          <input class="form-input" id="tm-initials" value="${m ? esc(m.initials || '') : ''}" placeholder="Auto" maxlength="3">
        </div>
      </div>
      ${m ? `
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-input" id="tm-active">
          <option value="1" ${m.active ? 'selected' : ''}>Active — shows on the board</option>
          <option value="0" ${!m.active ? 'selected' : ''}>Inactive — hidden, work preserved</option>
        </select>
      </div>` : ''}
      <div style="display:flex;gap:8px;justify-content:space-between;padding-top:4px">
        ${m ? `<button class="btn btn-danger btn-sm" onclick="deleteMember('${id}')">Remove</button>` : '<span></span>'}
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="saveMember(${m ? `'${id}'` : 'null'})">Save</button>
        </div>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('tm-name')?.focus(), 60);
}

async function saveMember(id) {
  const name     = document.getElementById('tm-name')?.value.trim();
  const initials = document.getElementById('tm-initials')?.value.trim();
  const activeEl = document.getElementById('tm-active');
  if (!name) { showToast('Name is required', 'error'); return; }
  const body = { name, initials: initials || undefined };
  if (activeEl) body.active = activeEl.value === '1';
  try {
    if (id) {
      const updated = await fetchAPI(`${API.teamMembers}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const i = state.teamMembers.findIndex(x => x.id === id);
      if (i !== -1) state.teamMembers[i] = updated;
    } else {
      state.teamMembers.push(await fetchAPI(API.teamMembers, { method: 'POST', body: JSON.stringify(body) }));
    }
    closeModal();
    renderTeamPage();
    showToast('Saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteMember(id) {
  const m = state.teamMembers.find(x => x.id === id);
  if (!confirm(`Remove ${m?.name} from the team?`)) return;
  try {
    await fetchAPI(`${API.teamMembers}/${id}`, { method: 'DELETE' });
    state.teamMembers = state.teamMembers.filter(x => x.id !== id);
    closeModal();
    renderTeamPage();
    showToast('Removed');
  } catch (err) {
    // The API refuses while work is still assigned — surface why
    showToast(err.message, 'error');
  }
}

// ============================================================
// SUBSCRIPTIONS
// What the business pays for every month, and what that adds up to.
// ============================================================

const SUB_CYCLES = [
  { key: 'weekly',  label: 'Weekly',  perMonth: 52 / 12 },
  { key: 'monthly', label: 'Monthly', perMonth: 1 },
  { key: 'yearly',  label: 'Yearly',  perMonth: 1 / 12 }
];

// Everything normalises to a monthly figure so totals are comparable
function subMonthly(s) {
  const c = SUB_CYCLES.find(c => c.key === s.cycle) || SUB_CYCLES[1];
  return (parseFloat(s.amount) || 0) * c.perMonth;
}

const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
// Cents matter for a per-unit cost — rounding $6.40 to $6 is a 6% error on
// every margin computed from it.
const money2 = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function renderSubscriptionsPage() {
  const subs    = [...state.subscriptions].sort((a, b) => a.position - b.position);
  const active  = subs.filter(s => s.status === 'active');
  const monthly = active.reduce((t, s) => t + subMonthly(s), 0);

  // Renewing inside the next week, soonest first
  const soon = active
    .filter(s => s.renews_on && deadlineSortKey(s.renews_on) <= 7)
    .sort((a, b) => deadlineSortKey(a.renews_on) - deadlineSortKey(b.renews_on));

  document.getElementById('page-content').innerHTML = `
    <div class="hub-banner">
      <h1 class="hub-title">Subscriptions</h1>
      <div class="hub-promise">What we pay for every month.</div>
      <div class="hub-sub">Software and services on recurring billing, so the total is visible without digging through a card statement.</div>
      <div class="hub-stats">
        <div class="hub-stat"><div class="hub-stat-value">${money(monthly)}</div><div class="hub-stat-label">Per month</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${money(monthly * 12)}</div><div class="hub-stat-label">Per year</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${active.length}</div><div class="hub-stat-label">Active</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${soon.length}</div><div class="hub-stat-label">Renewing soon</div></div>
      </div>
    </div>

    <div class="hub-grid">
      ${subs.map(s => {
        const due = s.renews_on ? fmtDeadline(s.renews_on) : null;
        const cyc = SUB_CYCLES.find(c => c.key === s.cycle) || SUB_CYCLES[1];
        return `
        <button class="hub-card sub-card${s.status === 'cancelled' ? ' is-inactive' : ''}" onclick="openSubscriptionDetail('${s.id}')">
          ${s.category ? `<span class="partner-cat">${esc(s.category)}</span>` : ''}
          <div class="hub-card-name">${esc(s.name)}</div>
          <div class="sub-amount">${money(parseFloat(s.amount) || 0)}<span class="sub-cycle"> / ${cyc.label.toLowerCase()}</span></div>
          ${s.cycle !== 'monthly' ? `<div class="partner-line">${money(subMonthly(s))} a month equivalent</div>` : ''}
          ${s.paid_with ? `<div class="partner-line">${esc(s.paid_with)}</div>` : ''}
          <div class="proj-meta">
            <span>${s.status === 'cancelled' ? 'Cancelled' : 'Active'}</span>
            ${due ? `<span class="task-deadline ${due.cls}">Renews ${due.text}</span>` : ''}
          </div>
        </button>`;
      }).join('')}

      <button class="hub-card sub-card proj-card-new" onclick="openSubscriptionEditor()">
        <div class="hub-ico">${hubIcon('plus')}</div>
        <div class="hub-card-name">Add subscription</div>
        <div class="hub-card-desc">Anything billing on a recurring basis</div>
      </button>
    </div>
  `;
}

function openSubscriptionEditor(id) {
  const s = id ? state.subscriptions.find(x => x.id === id) : null;
  const known = [...new Set(state.subscriptions.map(x => x.category).filter(Boolean))];
  openModal(s ? 'Edit Subscription' : 'Add Subscription', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Name</label>
          <input class="form-input" id="sb-name" value="${s ? esc(s.name) : ''}" placeholder="e.g. Shopify" maxlength="80">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Category</label>
          <input class="form-input" id="sb-category" list="sb-cats" value="${s ? esc(s.category || '') : ''}" placeholder="e.g. Software">
          <datalist id="sb-cats">${known.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Amount</label>
          <input class="form-input" id="sb-amount" type="number" min="0" step="0.01" value="${s ? (s.amount ?? '') : ''}" placeholder="0.00">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Billing cycle</label>
          <select class="form-input" id="sb-cycle">
            ${SUB_CYCLES.map(c => `<option value="${c.key}" ${s && s.cycle === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Next renewal</label>
          <input type="date" class="form-input" id="sb-renews" value="${s ? (s.renews_on || '') : ''}">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Paid with</label>
          <input class="form-input" id="sb-paid" value="${s ? esc(s.paid_with || '') : ''}" placeholder="e.g. Amex">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Owner</label>
          <select class="form-input" id="sb-owner">
            <option value="">Unassigned</option>
            ${activeMembers().map(m => `<option value="${m.member_key}" ${s && s.owner === m.member_key ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Status</label>
          <select class="form-input" id="sb-status">
            <option value="active"    ${s && s.status === 'active'    ? 'selected' : ''}>Active</option>
            <option value="cancelled" ${s && s.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="sb-notes" rows="2" placeholder="Plan, seats, what it's for">${s ? esc(s.notes || '') : ''}</textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:space-between;padding-top:4px">
        ${s ? `<button class="btn btn-danger btn-sm" onclick="deleteSubscription('${id}')">Delete</button>` : '<span></span>'}
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="saveSubscription(${s ? `'${id}'` : 'null'})">Save</button>
        </div>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('sb-name')?.focus(), 60);
}

async function saveSubscription(id) {
  const v = i => document.getElementById(i)?.value.trim() || null;
  const body = {
    name: v('sb-name'), category: v('sb-category'), paid_with: v('sb-paid'),
    owner: v('sb-owner'), notes: v('sb-notes'),
    amount: parseFloat(document.getElementById('sb-amount')?.value) || 0,
    cycle: document.getElementById('sb-cycle')?.value,
    status: document.getElementById('sb-status')?.value,
    renews_on: v('sb-renews')
  };
  if (!body.name) { showToast('Name is required', 'error'); return; }
  try {
    if (id) {
      const updated = await fetchAPI(`${API.subscriptions}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const i = state.subscriptions.findIndex(x => x.id === id);
      if (i !== -1) state.subscriptions[i] = updated;
    } else {
      state.subscriptions.push(await fetchAPI(API.subscriptions, { method: 'POST', body: JSON.stringify(body) }));
    }
    closeModal();
    if (state.currentPage === 'subscription') renderSubscriptionDetailPage(); else renderSubscriptionsPage();
    showToast('Saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteSubscription(id) {
  const s = state.subscriptions.find(x => x.id === id);
  if (!confirm(`Delete "${s?.name}"?`)) return;
  try {
    await fetchAPI(`${API.subscriptions}/${id}`, { method: 'DELETE' });
    state.subscriptions = state.subscriptions.filter(x => x.id !== id);
    closeModal();
    if (state.activeSubscriptionId === id) state.activeSubscriptionId = null;
    navigate('subscriptions');       // its page no longer exists
    showToast('Deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// MEETINGS
// Minutes exist to be looked back at, so the list is searchable
// and decisions are kept apart from the running notes.
// ============================================================

async function loadMeetings() {
  state.meetings = await fetchAPI(API.meetings) || [];
}

function meetingDateLabel(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function meetingsMatching(q) {
  const list = [...state.meetings].sort((a, b) => (b.met_on || '').localeCompare(a.met_on || ''));
  const term = (q || '').trim().toLowerCase();
  if (!term) return list;
  return list.filter(m => [m.title, m.notes, m.decisions, (m.attendees || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase().includes(term));
}

function setMeetingSearch(v) {
  state.meetingSearch = v;
  const list = document.getElementById('mt-list');
  if (list) list.innerHTML = meetingListHTML();
}

function meetingListHTML() {
  const rows = meetingsMatching(state.meetingSearch);
  if (!rows.length) {
    return `<div class="focus-empty">${state.meetingSearch
      ? `Nothing matches “${esc(state.meetingSearch)}”`
      : 'No minutes yet — log the first one above.'}</div>`;
  }
  return rows.map(m => `
    <button class="mt-row" onclick="openMeetingDetail('${m.id}')">
      <span class="mt-date">${meetingDateLabel(m.met_on)}</span>
      <span class="mt-body">
        <span class="mt-title">${esc(m.title)}</span>
        ${(m.attendees || []).length ? `<span class="mt-people">${(m.attendees || []).map(esc).join(' · ')}</span>` : ''}
      </span>
      ${m.decisions ? '<span class="mt-flag">Decisions</span>' : ''}
      <span class="mt-arrow">→</span>
    </button>`).join('');
}

function renderMeetingsPage() {
  const total = state.meetings.length;
  const withDecisions = state.meetings.filter(m => m.decisions).length;

  document.getElementById('page-content').innerHTML = `
    <div class="hub-banner">
      <h1 class="hub-title">Meetings</h1>
      <div class="hub-promise">What was said, and what we decided.</div>
      <div class="hub-sub">Minutes worth looking back at — search them by anything that was mentioned.</div>
      <div class="hub-stats">
        <div class="hub-stat"><div class="hub-stat-value">${total}</div><div class="hub-stat-label">Logged</div></div>
        <div class="hub-stat"><div class="hub-stat-value">${withDecisions}</div><div class="hub-stat-label">With decisions</div></div>
      </div>
    </div>

    <div class="mt-toolbar">
      <input class="form-input mt-search" placeholder="Search minutes, decisions, people…"
             value="${esc(state.meetingSearch || '')}" oninput="setMeetingSearch(this.value)">
      <button class="btn btn-primary btn-sm" onclick="openMeetingEditor()">Log a meeting</button>
    </div>

    <div class="mt-list" id="mt-list">${meetingListHTML()}</div>
  `;
  setTimeout(() => {
    const s = document.querySelector('.mt-search');
    if (s && state.meetingSearch) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }, 40);
}

function openMeetingDetail(id) {
  state.activeMeetingId = id;
  navigate('meeting');
}

function renderMeetingDetailPage() {
  const m = state.meetings.find(x => x.id === state.activeMeetingId);
  if (!m) { navigate('meetings'); return; }

  document.getElementById('page-content').innerHTML = `
    <button class="proj-back" onclick="navigate('meetings')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      All meetings
    </button>

    <div class="hub-banner">
      <h1 class="hub-title">${esc(m.title)}</h1>
      <div class="hub-sub" style="margin-top:6px">${meetingDateLabel(m.met_on)}</div>
      ${(m.attendees || []).length ? `
        <div class="pd-people" style="margin-top:14px">
          ${(m.attendees || []).map(a => `
            <span class="pd-person">
              <span class="focus-avatar">${esc(a.trim()[0] ? a.trim()[0].toUpperCase() : '?')}</span>
              <span>${esc(a)}</span>
            </span>`).join('')}
        </div>` : ''}
    </div>

    ${m.decisions ? `
    <div class="detail-notes mt-decisions">
      <div class="detail-label">Decisions</div>
      <div class="detail-notes-body">${esc(m.decisions)}</div>
    </div>` : ''}

    <div class="detail-notes mt-actions-block">
      <div class="mt-actions-head">
        <div class="detail-label" style="margin:0">Action items</div>
        <span class="pd-count">${(m.action_items || []).filter(a => a.task_id).length}/${(m.action_items || []).length} on the board</span>
      </div>
      <div class="mt-actions" id="mt-actions">${meetingActionsHTML(m)}</div>
      <button class="focus-add-btn" style="max-width:240px" onclick="startAddActionItem('${m.id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add an action item
      </button>
    </div>

    <div class="detail-notes">
      <div class="detail-label">Notes</div>
      <div class="detail-notes-body">${m.notes ? esc(m.notes) : '<span class="pd-muted">No notes recorded</span>'}</div>
    </div>

    <div class="proj-page-actions">
      <button class="btn btn-secondary btn-sm" onclick="openMeetingEditor('${m.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteMeeting('${m.id}')">Delete</button>
    </div>
  `;
}

// An item is a suggestion until task_id is set. Once it points at a task,
// its state is read live off the board rather than copied — so a meeting
// from three weeks ago shows what actually happened, not what was assumed.
function meetingActionsHTML(m) {
  const items = m.action_items || [];
  if (!items.length) {
    return `<div class="focus-empty">Nothing captured yet — add what people agreed to do.</div>`;
  }
  return items.map(a => {
    const task = a.task_id ? state.tasks.find(t => t.id === a.task_id) : null;
    let status;
    if (!a.task_id) {
      status = `<button class="mt-add-btn" onclick="promoteActionItem('${m.id}','${a.id}')">Add to tasks →</button>`;
    } else if (!task) {
      status = `<span class="mt-state mt-state-gone">Task deleted</span>`;
    } else if (task.completed) {
      status = `<span class="mt-state mt-state-done">Done</span>`;
    } else if (task.deadline && deadlineSortKey(task.deadline) < 0) {
      status = `<span class="mt-state mt-state-late">Overdue</span>`;
    } else {
      status = `<span class="mt-state">On the board</span>`;
    }
    return `
      <div class="mt-action${a.task_id ? ' is-live' : ''}">
        <span class="mt-action-text">${esc(a.text)}</span>
        <select class="mt-action-who" onchange="setActionAssignee('${m.id}','${a.id}',this.value)" ${a.task_id ? 'disabled' : ''}>
          <option value="">Unassigned</option>
          ${activeMembers().map(mem => `<option value="${mem.member_key}" ${a.assignee === mem.member_key ? 'selected' : ''}>${esc(mem.name)}</option>`).join('')}
        </select>
        ${status}
        <button class="mt-action-x" onclick="removeActionItem('${m.id}','${a.id}')" title="Remove from this meeting">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
  }).join('');
}

async function saveActionItems(meetingId, items) {
  const m = state.meetings.find(x => x.id === meetingId);
  if (!m) return;
  const previous = m.action_items || [];
  m.action_items = items;                       // optimistic
  renderMeetingDetailPage();
  try {
    const updated = await fetchAPI(`${API.meetings}/${meetingId}`, {
      method: 'PUT', body: JSON.stringify({ action_items: items })
    });
    const i = state.meetings.findIndex(x => x.id === meetingId);
    if (i !== -1) state.meetings[i] = updated;
  } catch (err) {
    m.action_items = previous;
    renderMeetingDetailPage();
    showToast(err.message, 'error');
  }
}

function startAddActionItem(meetingId) {
  const list = document.getElementById('mt-actions');
  if (!list || list.querySelector('.mt-action-input')) return;
  list.querySelector('.focus-empty')?.remove();
  const row = document.createElement('div');
  row.className = 'mt-action';
  row.innerHTML = `<input class="mt-action-input" type="text" placeholder="e.g. Boris to confirm packaging" maxlength="300">`;
  list.appendChild(row);
  const input = row.querySelector('input');
  input.focus();

  let settled = false;
  function commit() {
    if (settled) return;
    settled = true;
    const text = input.value.trim();
    row.remove();
    if (!text) { renderMeetingDetailPage(); return; }
    const m = state.meetings.find(x => x.id === meetingId);
    saveActionItems(meetingId, [...(m.action_items || []),
      { id: Math.random().toString(36).slice(2, 10), text, assignee: null, task_id: null }]);
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') { settled = true; row.remove(); renderMeetingDetailPage(); }
  });
  input.addEventListener('blur', () => setTimeout(commit, 150));
}

function setActionAssignee(meetingId, itemId, assignee) {
  const m = state.meetings.find(x => x.id === meetingId);
  if (!m) return;
  saveActionItems(meetingId, (m.action_items || [])
    .map(a => a.id === itemId ? { ...a, assignee: assignee || null } : a));
}

// The suggestion becomes real work here, and only here.
async function promoteActionItem(meetingId, itemId) {
  const m = state.meetings.find(x => x.id === meetingId);
  const item = (m?.action_items || []).find(a => a.id === itemId);
  if (!item) return;
  try {
    const task = await fetchAPI(API.tasks, {
      method: 'POST',
      body: JSON.stringify({
        title: item.text,
        assignee: item.assignee || 'founder',
        notes: `From the meeting: ${m.title} (${m.met_on})`
      })
    });
    state.tasks.push(task);
    updateTasksUrgentBadge();
    await saveActionItems(meetingId, m.action_items.map(a => a.id === itemId ? { ...a, task_id: task.id } : a));
    showToast(`Added to ${memberName(task.assignee)}'s tasks`);
  } catch (err) { showToast(err.message, 'error'); }
}

// Removing it here leaves any task it created alone — the work is real now
// and outliving its meeting is the point.
function removeActionItem(meetingId, itemId) {
  const m = state.meetings.find(x => x.id === meetingId);
  if (!m) return;
  const item = (m.action_items || []).find(a => a.id === itemId);
  if (item?.task_id && !confirm('Remove this from the meeting?\n\nThe task it created stays on the board.')) return;
  saveActionItems(meetingId, (m.action_items || []).filter(a => a.id !== itemId));
}

function openMeetingEditor(id) {
  const m = id ? state.meetings.find(x => x.id === id) : null;
  const team = activeMembers().map(t => t.name);
  const past = [...new Set(state.meetings.flatMap(x => x.attendees || []))];
  const known = [...new Set([...team, ...past])];

  openModal(m ? 'Edit Meeting' : 'Log a Meeting', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="mt-date" value="${m ? m.met_on : new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Title</label>
          <input class="form-input" id="mt-title" value="${m ? esc(m.title) : ''}" placeholder="e.g. Weekly ops sync" maxlength="140">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Who was there</label>
        <input class="form-input" id="mt-attendees" list="mt-people"
               value="${m ? esc((m.attendees || []).join(', ')) : ''}" placeholder="Comma separated — Gibran, Tamar, Boris">
        <datalist id="mt-people">${known.map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="mt-notes" rows="7" style="resize:vertical"
                  placeholder="What was discussed…">${m ? esc(m.notes || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Decisions</label>
        <textarea class="form-input" id="mt-decisions" rows="3" style="resize:vertical"
                  placeholder="What was actually agreed — kept separate so it's findable later">${m ? esc(m.decisions || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Action items${m ? ' to add' : ''}</label>
        <textarea class="form-input" id="mt-actions-paste" rows="3" style="resize:vertical"
                  placeholder="One per line — paste Fathom's list straight in. They stay suggestions until you add them to the board."></textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveMeeting(${m ? `'${id}'` : 'null'})">Save</button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('mt-title')?.focus(), 60);
}

async function saveMeeting(id) {
  const body = {
    met_on: document.getElementById('mt-date')?.value,
    title: document.getElementById('mt-title')?.value.trim(),
    attendees: (document.getElementById('mt-attendees')?.value || '')
                 .split(',').map(a => a.trim()).filter(Boolean),
    notes: document.getElementById('mt-notes')?.value.trim() || null,
    decisions: document.getElementById('mt-decisions')?.value.trim() || null
  };
  if (!body.met_on) { showToast('Pick a date', 'error'); return; }
  if (!body.title)  { showToast('Give it a title', 'error'); return; }

  // Pasted lines append as suggestions — strip the bullet or dash people
  // paste along with them, and keep whatever is already captured.
  const existing = id ? (state.meetings.find(x => x.id === id)?.action_items || []) : [];
  const pasted = (document.getElementById('mt-actions-paste')?.value || '')
    .split('\n')
    .map(l => l.replace(/^\s*[-*•\d.)\]]+\s*/, '').trim())
    .filter(Boolean)
    .map(text => ({ id: Math.random().toString(36).slice(2, 10), text, assignee: null, task_id: null }));
  body.action_items = [...existing, ...pasted];

  try {
    if (id) {
      const updated = await fetchAPI(`${API.meetings}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const i = state.meetings.findIndex(x => x.id === id);
      if (i !== -1) state.meetings[i] = updated;
    } else {
      state.meetings.push(await fetchAPI(API.meetings, { method: 'POST', body: JSON.stringify(body) }));
    }
    closeModal();
    if (state.currentPage === 'meeting') renderMeetingDetailPage(); else renderMeetingsPage();
    showToast('Saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteMeeting(id) {
  const m = state.meetings.find(x => x.id === id);
  if (!confirm(`Delete the minutes for "${m?.title}"?\n\nThis can't be undone.`)) return;
  try {
    await fetchAPI(`${API.meetings}/${id}`, { method: 'DELETE' });
    state.meetings = state.meetings.filter(x => x.id !== id);
    closeModal();
    if (state.activeMeetingId === id) state.activeMeetingId = null;
    navigate('meetings');
    showToast('Deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── The Glow — one rAF-throttled listener drives every glass card ──
// Sets --glow-x/--glow-y in element-local coordinates so the border
// light tracks the cursor. Cards far from the pointer are parked once
// and then skipped. Fine pointers only; no-op under reduced motion.
(function initGlow() {
  const SELECTOR = '.hub-card, .hub-banner, .glow-surface';
  const REACH = 340;
  let raf = 0, lastX = -9999, lastY = -9999;

  function tick() {
    raf = 0;
    document.querySelectorAll(SELECTOR).forEach(el => {
      const r = el.getBoundingClientRect();
      const near = lastX > r.left - REACH && lastX < r.right + REACH &&
                   lastY > r.top  - REACH && lastY < r.bottom + REACH && r.width > 0;
      if (near) {
        el.style.setProperty('--glow-x', (lastX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--glow-y', (lastY - r.top).toFixed(0) + 'px');
        el._glowParked = false;
      } else if (!el._glowParked) {
        el.style.setProperty('--glow-x', '-9999px');
        el.style.setProperty('--glow-y', '-9999px');
        el._glowParked = true;
      }
    });
  }

  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  window.addEventListener('pointermove', e => {
    lastX = e.clientX; lastY = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();

// The slide-out record panel, still used by Pro Partner Outreach and
// Customer Support. It was defined inside the affiliate outreach code;
// with that gone it lives here, minus the affiliate selection it cleared.
function closeDetailPanel() {
  stopDictation();
  state.selectedPartnerId = null;
  const panel = document.getElementById('detail-panel');
  if (panel) panel.style.display = 'none';
  document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('row-active'));
}

function clearSelection() {
  if (state.selectedIds.size === 0) return;
  state.selectedIds.clear();
}

// ── Mobile nav drawer ─────────────────────────────────────────
function toggleMobileNav() {
  document.body.classList.toggle('mobile-nav-open');
}

function closeMobileNav() {
  document.body.classList.remove('mobile-nav-open');
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
  const CL_TITLES = {
    write:    { title: 'Write Script',   subtitle: 'Generate a personalized conversion-driven script using BLC\'s framework' },
    rewrite:  { title: 'Rewrite Script', subtitle: 'Drop a winning transcript — Claude tears it down and rewrites it for a different creator' },
    analyzer: { title: 'Script Analyzer', subtitle: 'Paste any script or transcript and get a full structural breakdown' },
    library:  { title: 'Script Library', subtitle: 'All generated and saved scripts' }
  };
  const clTitle = CL_TITLES[state.contentLabTab] || CL_TITLES.write;

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
            <label class="form-label-caps">Rewrite For</label>
            <input id="teardown-creator" class="form-input" type="text"
                   placeholder="Creator handle, e.g. @meg.pie7 — optional">
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
  const targetCreator     = document.getElementById('teardown-creator')?.value?.trim() || '';
  const scriptLength      = document.getElementById('teardown-length')?.value || 'medium';

  if (!sourceTranscript) { showToast('Paste a source transcript first', 'error'); return; }

  const btn    = document.getElementById('script-btn');
  const output = document.getElementById('script-output');

  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  output.innerHTML = `<div class="generating-indicator"><div class="spinner"></div><p>Tearing down the script and rewriting for your creator...</p></div>`;

  try {
    const res = await fetchAPI(`${API.generate}/teardown`, {
      method: 'POST',
      body: JSON.stringify({ sourceTranscript, targetCreator, scriptLength })
    });
    output.innerHTML = `<div class="output-content">${renderMarkdown(res.script)}</div>`;
    document.getElementById('copy-script-btn').classList.remove('hidden');

    const badge = document.getElementById('cl-saved-badge');
    if (badge) badge.classList.remove('hidden');
    if (res.scriptId) {
      state.scripts.unshift({
        id:             res.scriptId,
        creator_id:     null,
        creator_handle: targetCreator.replace(/^@/, ''),
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
// SETTINGS
// ============================================================



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
  const [tasks, buckets] = await Promise.all([
    fetchAPI(API.tasks),
    fetchAPI(API.taskBuckets).catch(() => [])   // board still works if buckets fail
  ]);
  state.tasks       = tasks;
  state.taskBuckets = buckets || [];
  updateTasksUrgentBadge();
}

async function loadProjects() {
  state.projects = await fetchAPI(API.projects).catch(() => []) || [];
}

async function loadPartners() {
  state.partners = await fetchAPI(API.partners).catch(() => []) || [];
}

async function loadTeamMembers() {
  state.teamMembers = await fetchAPI(API.teamMembers).catch(() => []) || [];
}

async function loadSubscriptions() {
  state.subscriptions = await fetchAPI(API.subscriptions).catch(() => []) || [];
}

// The two people the board assumed before the team table existed. Used only
// as a fallback so an unmigrated or unreachable table can't empty the board
// and hide everyone's work.
const IMPLICIT_MEMBERS = [
  { member_key: 'founder', name: 'Gibran', initials: 'G', active: true, position: 0 },
  { member_key: 'tamar',   name: 'Tamar',  initials: 'T', active: true, position: 1 }
];

// Active people, in board order. Everything that needs "who is on the team"
// reads this, so adding someone never means touching code.
//
// Anyone holding live work always gets a column, even without a row in the
// table. Without this, adding the first real member would drop the implicit
// fallback and take Gibran's and Tamar's columns — and every task in them —
// off the board at once.
function activeMembers() {
  const rows = state.teamMembers.filter(m => m.active).sort((a, b) => a.position - b.position);
  const known = new Set(rows.map(m => m.member_key));

  const orphaned = [...new Set(
    (state.tasks || [])
      .filter(t => !t.archived && t.assignee && t.assignee !== 'for-founder')
      .map(t => t.assignee)
  )].filter(k => !known.has(k));

  if (!rows.length && !orphaned.length) return IMPLICIT_MEMBERS;

  const filled = orphaned.map(k => {
    const implicit = IMPLICIT_MEMBERS.find(m => m.member_key === k);
    return implicit || { member_key: k, name: k, initials: k[0].toUpperCase(), active: true, position: 999 };
  });

  return [...rows, ...filled];
}

// Both resolve through activeMembers so they honour the same fallback the
// board uses. Reading state.teamMembers directly meant an unmigrated table
// showed raw keys like "founder" next to a board that said "Gibran".
function memberName(key) {
  if (key === 'for-founder') return 'For Founder';
  return activeMembers().find(m => m.member_key === key)?.name || key;
}

function memberInitials(key) {
  if (key === 'for-founder') return 'F';
  const m = activeMembers().find(m => m.member_key === key);
  return m?.initials || (m?.name || key || '?')[0].toUpperCase();
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

// Tasks for one person, optionally narrowed to a single bucket.
//   bucketId undefined → every task in the column (flat, used by "For Founder")
//   bucketId null      → Unsorted (no bucket assigned)
//   bucketId '<uuid>'  → that bucket
function tasksIn(assignee, bucketId) {
  return state.tasks
    .filter(t => t.assignee === assignee && !t.archived)
    .filter(t => bucketId === undefined || (t.bucket_id || null) === bucketId)
    .sort((a, b) => {
      // completed always last
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // sort by urgency: overdue first, then soonest, then no-deadline
      return deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline);
    });
}

function renderTaskItem(t) {
  const dl = fmtDeadline(t.deadline);
  return `
    <div class="focus-task${t.completed ? ' focus-done' : ''}" draggable="true"
         ondragstart="taskDragStart(event,'${t.id}')" ondragend="boardDragEnd(event)">
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
}

// Flat, unbucketed list — used by the "For Founder" queue
function renderTaskList(assignee) {
  const tasks = tasksIn(assignee);
  if (tasks.length === 0) return `<div class="focus-empty">Nothing yet</div>`;
  return tasks.map(renderTaskItem).join('');
}

// ============================================================
// TASK BUCKETS
// Per-person groupings inside a column. Gibran's "Today" and
// Tamar's "Today" are separate rows — renaming one never touches
// the other. A task with no bucket sits in the Unsorted zone.
// ============================================================

const BUCKET_COLLAPSE_KEY = 'blc_collapsed_buckets';

function collapsedBuckets() {
  try { return new Set(JSON.parse(localStorage.getItem(BUCKET_COLLAPSE_KEY) || '[]')); }
  catch { return new Set(); }
}

// Collapse is a view preference, not a fact about the team — it stays local
function toggleBucketCollapse(id) {
  const set = collapsedBuckets();
  set.has(id) ? set.delete(id) : set.add(id);
  localStorage.setItem(BUCKET_COLLAPSE_KEY, JSON.stringify([...set]));
  refreshTaskBoard();
}

function bucketsFor(assignee) {
  return state.taskBuckets
    .filter(b => b.assignee === assignee)
    .sort((a, b) => a.position - b.position);
}

function renderBucketedColumn(assignee) {
  const buckets   = bucketsFor(assignee);
  const collapsed = collapsedBuckets();
  const unsorted  = tasksIn(assignee, null);

  const unsortedHtml = `
    <div class="bucket-zone bucket-unsorted" data-bucket=""
         ondragover="bucketDragOver(event)" ondragleave="bucketDragLeave(event)"
         ondrop="bucketDrop(event,'${assignee}','')">
      <div class="bucket-body" id="unsorted-${assignee}">
        ${unsorted.length
          ? unsorted.map(renderTaskItem).join('')
          : buckets.length
            ? `<div class="bucket-drop-hint">Drop here to unsort</div>`
            : `<div class="focus-empty">Nothing yet</div>`}
      </div>
    </div>`;

  const bucketsHtml = buckets.map((b, i) => {
    const tasks       = tasksIn(assignee, b.id);
    const openCount   = tasks.filter(t => !t.completed).length;
    const isCollapsed = collapsed.has(b.id);
    return `
    <div class="bucket-zone" data-bucket="${b.id}"
         ondragover="bucketDragOver(event)" ondragleave="bucketDragLeave(event)"
         ondrop="bucketDrop(event,'${assignee}','${b.id}')">
      <div class="bucket-head" draggable="true"
           ondragstart="bucketDragStart(event,'${b.id}','${assignee}')" ondragend="boardDragEnd(event)">
        <button class="bucket-caret${isCollapsed ? ' bucket-caret-closed' : ''}"
                onclick="toggleBucketCollapse('${b.id}')" title="${isCollapsed ? 'Expand' : 'Collapse'}">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span class="bucket-name" onclick="startRenameBucket('${b.id}')" title="Click to rename">${esc(b.name)}</span>
        <span class="bucket-count">${openCount}</span>
        <button class="bucket-menu-btn" onclick="toggleBucketMenu(event,'${b.id}')" title="Bucket options">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>
        <div class="bucket-menu" id="bmenu-${b.id}">
          <button onclick="startRenameBucket('${b.id}')">Rename</button>
          <button onclick="moveBucket('${b.id}','${assignee}',-1)"${i === 0 ? ' disabled' : ''}>Move up</button>
          <button onclick="moveBucket('${b.id}','${assignee}',1)"${i === buckets.length - 1 ? ' disabled' : ''}>Move down</button>
          <button class="bucket-menu-danger" onclick="deleteBucket('${b.id}')">Delete</button>
        </div>
      </div>
      ${isCollapsed ? '' : `
      <div class="bucket-body">
        ${tasks.length
          ? tasks.map(renderTaskItem).join('')
          : `<div class="bucket-drop-hint">Empty</div>`}
      </div>
      <button class="bucket-add-task" onclick="startAddTask('${assignee}','${b.id}')">＋ Add here</button>`}
    </div>`;
  }).join('');

  return unsortedHtml + bucketsHtml;
}

// ── Bucket menu ─────────────────────────────────────────────────
function closeBucketMenus() {
  document.querySelectorAll('.bucket-menu.open').forEach(m => m.classList.remove('open'));
}

function toggleBucketMenu(e, id) {
  e.stopPropagation();
  const menu    = document.getElementById(`bmenu-${id}`);
  const wasOpen = menu?.classList.contains('open');
  closeBucketMenus();
  if (menu && !wasOpen) menu.classList.add('open');
}

document.addEventListener('click', closeBucketMenus);

// ── Drag & drop (desktop; touch devices use the menus and dropdown) ──
let bucketDragPayload = null;

function taskDragStart(e, id) {
  e.stopPropagation();
  bucketDragPayload = { type: 'task', id };
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', id); } catch (_) {}
  e.currentTarget.classList.add('is-dragging');
}

function bucketDragStart(e, id, assignee) {
  bucketDragPayload = { type: 'bucket', id, assignee };
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', id); } catch (_) {}
}

function boardDragEnd() {
  bucketDragPayload = null;
  document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
  document.querySelectorAll('.bucket-drag-over').forEach(el => el.classList.remove('bucket-drag-over'));
}

function bucketDragOver(e) {
  if (!bucketDragPayload) return;
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('bucket-drag-over');
}

function bucketDragLeave(e) {
  e.currentTarget.classList.remove('bucket-drag-over');
}

async function bucketDrop(e, assignee, bucketId) {
  e.preventDefault();
  e.stopPropagation();
  const payload = bucketDragPayload;
  boardDragEnd();
  if (!payload) return;
  if (payload.type === 'task') {
    await moveTaskToBucket(payload.id, bucketId || null);
  } else if (payload.type === 'bucket' && payload.assignee === assignee) {
    await dropBucketOnto(payload.id, bucketId, assignee);
  }
}

async function moveTaskToBucket(taskId, bucketId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || (task.bucket_id || null) === bucketId) return;
  const previous = task.bucket_id || null;
  task.bucket_id = bucketId;          // optimistic — the board feels instant
  refreshTaskBoard();
  try {
    const updated = await fetchAPI(`${API.tasks}/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ bucket_id: bucketId })
    });
    const i = state.tasks.findIndex(t => t.id === taskId);
    if (i !== -1) state.tasks[i] = updated;
  } catch (err) {
    task.bucket_id = previous;       // put it back where it was
    refreshTaskBoard();
    showToast(err.message, 'error');
  }
}

function applyBucketOrder(ids) {
  ids.forEach((id, i) => {
    const b = state.taskBuckets.find(x => x.id === id);
    if (b) b.position = i;
  });
}

async function persistBucketOrder(ids) {
  try {
    await fetchAPI(`${API.taskBuckets}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  } catch (err) {
    showToast(err.message, 'error');
    await loadTasks();
    refreshTaskBoard();
  }
}

async function dropBucketOnto(draggedId, targetId, assignee) {
  if (!targetId || draggedId === targetId) return;
  const ids  = bucketsFor(assignee).map(b => b.id);
  const from = ids.indexOf(draggedId);
  const to   = ids.indexOf(targetId);
  if (from === -1 || to === -1) return;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  applyBucketOrder(ids);
  refreshTaskBoard();
  await persistBucketOrder(ids);
}

async function moveBucket(id, assignee, dir) {
  closeBucketMenus();
  const ids  = bucketsFor(assignee).map(b => b.id);
  const from = ids.indexOf(id);
  const to   = from + dir;
  if (from === -1 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  applyBucketOrder(ids);
  refreshTaskBoard();
  await persistBucketOrder(ids);
}

// ── Create / rename / delete ────────────────────────────────────
function startAddBucket(assignee) {
  const listEl = document.getElementById(`tasks-${assignee}`);
  if (!listEl || listEl.querySelector('.bucket-add-row')) return;
  const row = document.createElement('div');
  row.className = 'bucket-add-row';
  row.innerHTML = `<input class="bucket-name-input" type="text" placeholder="Bucket name…" maxlength="40">`;
  listEl.appendChild(row);
  const input = row.querySelector('input');
  input.focus();

  let settled = false;
  async function commit() {
    if (settled) return;
    settled = true;
    const name = input.value.trim();
    row.remove();
    if (!name) return;
    try {
      const bucket = await fetchAPI(API.taskBuckets, {
        method: 'POST',
        body: JSON.stringify({ assignee, name })
      });
      state.taskBuckets.push(bucket);
      refreshTaskBoard();
    } catch (err) { showToast(err.message, 'error'); }
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') { settled = true; row.remove(); }
  });
  input.addEventListener('blur', () => setTimeout(commit, 150));
}

function startRenameBucket(id) {
  closeBucketMenus();
  const bucket = state.taskBuckets.find(b => b.id === id);
  if (!bucket) return;
  const nameEl = document.querySelector(`.bucket-zone[data-bucket="${id}"] .bucket-name`);
  if (!nameEl) return;

  const input = document.createElement('input');
  input.className = 'bucket-name-input';
  input.type      = 'text';
  input.value     = bucket.name;
  input.maxLength = 40;
  nameEl.replaceWith(input);
  // A draggable ancestor blocks text selection inside the input in some
  // browsers — the re-render after commit restores it.
  const head = input.closest('.bucket-head');
  if (head) head.draggable = false;
  input.focus();
  input.select();

  let settled = false;
  async function commit(save) {
    if (settled) return;
    settled = true;
    const name = input.value.trim();
    if (!save || !name || name === bucket.name) { refreshTaskBoard(); return; }
    const previous = bucket.name;
    bucket.name = name;              // optimistic
    refreshTaskBoard();
    try {
      const updated = await fetchAPI(`${API.taskBuckets}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      const i = state.taskBuckets.findIndex(b => b.id === id);
      if (i !== -1) state.taskBuckets[i] = updated;
    } catch (err) {
      bucket.name = previous;
      refreshTaskBoard();
      showToast(err.message, 'error');
    }
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commit(true);
    if (e.key === 'Escape') commit(false);
  });
  input.addEventListener('blur', () => commit(true));
}

async function deleteBucket(id) {
  closeBucketMenus();
  const bucket = state.taskBuckets.find(b => b.id === id);
  if (!bucket) return;
  const inside = state.tasks.filter(t => t.bucket_id === id && !t.archived).length;
  const word   = inside === 1 ? 'task' : 'tasks';
  if (inside > 0 &&
      !confirm(`Delete "${bucket.name}"?\n\n${inside} ${word} will move back to Unsorted. Nothing is deleted.`)) return;
  try {
    await fetchAPI(`${API.taskBuckets}/${id}`, { method: 'DELETE' });
    state.taskBuckets = state.taskBuckets.filter(b => b.id !== id);
    state.tasks.forEach(t => { if (t.bucket_id === id) t.bucket_id = null; });
    refreshTaskBoard();
    showToast(inside > 0 ? `Bucket deleted — ${inside} ${word} moved to Unsorted` : 'Bucket deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

function refreshTaskBoard() {
  activeMembers().forEach(m => {
    const el = document.getElementById(`tasks-${m.member_key}`);
    if (el) el.innerHTML = renderBucketedColumn(m.member_key);
  });
  const rEl = document.getElementById('tasks-for-founder');
  if (rEl) rEl.innerHTML = renderTaskList('for-founder');   // a queue, not a workload — stays flat
  // Update "For Founder" column badge count
  const pending = state.tasks.filter(t => t.assignee === 'for-founder' && !t.archived && !t.completed).length;
  const badge = document.querySelector('.focus-col-review .focus-col-badge');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'inline-flex' : 'none'; }
  // Nav badge = urgent tasks (overdue or ≤1d), not just for-founder
  updateTasksUrgentBadge();
}

function startAddTask(assignee, bucketId) {
  // Land in the bucket you clicked from; otherwise in Unsorted
  const listEl = bucketId
    ? document.querySelector(`#tasks-${assignee} .bucket-zone[data-bucket="${bucketId}"] .bucket-body`)
    : (document.getElementById(`unsorted-${assignee}`) || document.getElementById(`tasks-${assignee}`));
  if (!listEl || listEl.querySelector('.focus-add-row')) return;
  listEl.querySelector('.bucket-drop-hint, .focus-empty')?.remove();
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
    if (!title) { refreshTaskBoard(); return; }
    try {
      const task = await fetchAPI(API.tasks, {
        method: 'POST',
        body: JSON.stringify({ title, assignee, bucket_id: bucketId || null })
      });
      state.tasks.push(task);
      refreshTaskBoard();
    } catch (err) { showToast(err.message, 'error'); }
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { row.remove(); refreshTaskBoard(); }
  });
  input.addEventListener('blur', () => setTimeout(() => {
    if (row.parentNode) { row.remove(); refreshTaskBoard(); }
  }, 150));
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
  const buckets = bucketsFor(t.assignee);
  openModal('Task', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">Title</label>
        <input class="form-input" id="td-title" value="${esc(t.title)}" placeholder="Task name" maxlength="120">
      </div>
      <div style="display:grid;grid-template-columns:${buckets.length ? '1fr 1fr' : '1fr'};gap:12px">
        ${buckets.length ? `
        <div class="form-group" style="margin:0">
          <label class="form-label">Bucket</label>
          <select class="form-input" id="td-bucket">
            <option value="">Unsorted</option>
            ${buckets.map(b => `<option value="${b.id}" ${t.bucket_id === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
          </select>
        </div>` : ''}
        <div class="form-group" style="margin:0">
          <label class="form-label">Project</label>
          <select class="form-input" id="td-project">
            <option value="">No project</option>
            ${projectsSorted().map(p => `<option value="${p.id}" ${t.project_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
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
  const bucketEl  = document.getElementById('td-bucket');
  const projectEl = document.getElementById('td-project');
  if (!title) { showToast('Title is required', 'error'); return; }
  const body = { title, notes: notes || null, tag, deadline };
  // Only send bucket_id when the column actually has buckets — otherwise a
  // missing dropdown would read as "move to Unsorted".
  if (bucketEl)  body.bucket_id  = bucketEl.value  || null;
  if (projectEl) body.project_id = projectEl.value || null;
  try {
    const updated = await fetchAPI(`${API.tasks}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
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
        ${activeMembers().map(m => `
        <div class="focus-col">
          <div class="focus-col-head">
            <span class="focus-avatar">${esc(m.initials || m.name[0].toUpperCase())}</span>
            <span class="focus-col-name">${esc(m.name)}</span>
          </div>
          <div class="focus-list" id="tasks-${m.member_key}">${renderBucketedColumn(m.member_key)}</div>
          <div class="focus-col-actions">
            <button class="focus-add-btn" onclick="startAddTask('${m.member_key}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add task
            </button>
            <button class="focus-add-btn focus-add-bucket" onclick="startAddBucket('${m.member_key}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add bucket
            </button>
          </div>
        </div>`).join('')}
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

// ── Dashboard charts ────────────────────────────────────────────
// Chart.js is already loaded for Financials. Instances are tracked so a
// re-render replaces them instead of stacking canvases and leaking.
const dashCharts = {};

function dashDestroyCharts() {
  Object.keys(dashCharts).forEach(k => { dashCharts[k].destroy(); delete dashCharts[k]; });
}

const DASH_GRID = 'rgba(255,255,255,0.06)';
const DASH_TICK = { color: 'rgba(242,244,249,0.45)', font: { family: 'Poppins', size: 10 } };

// The last N weeks of the Financials log, oldest first
function dashWeeks(n = 12) {
  return [...(bf_getLog() || [])]
    .sort((a, b) => (a.week_ending || '').localeCompare(b.week_ending || ''))
    .slice(-n);
}

function weekRevenue(w) {
  return (parseFloat(w.tiktok_revenue) || 0)
       + (parseFloat(w.amazon_revenue) || 0)
       + (parseFloat(w.website_revenue) || 0);
}

// Roll the weekly log up into months. Weeks are attributed to the month
// their week_ending falls in — a week straddling a month boundary counts
// where it closed, which is how the numbers were entered.
function dashMonths(n = 12) {
  const byMonth = new Map();
  (bf_getLog() || []).forEach(w => {
    const m = (w.week_ending || '').slice(0, 7);
    if (!m) return;
    const cur = byMonth.get(m) || { month: m, total: 0, tiktok: 0, amazon: 0, website: 0, weeks: 0 };
    cur.tiktok  += parseFloat(w.tiktok_revenue)  || 0;
    cur.amazon  += parseFloat(w.amazon_revenue)  || 0;
    cur.website += parseFloat(w.website_revenue) || 0;
    cur.total   += weekRevenue(w);
    cur.weeks   += 1;
    byMonth.set(m, cur);
  });
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-n);
}

function monthLabelShort(ym) {
  const [y, m] = ym.split('-').map(Number);
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] + ' ' + String(y).slice(2);
}

function setDashChart(mode) {
  state.dashChartMode = mode;
  renderHomePage();
}

// ============================================================
// MARKETING DASHBOARD
// Output and spend, week by week, so the shape of the effort is
// visible next to the shape of the result.
// ============================================================

const AD_PLATFORMS = [
  { key: 'meta',   label: 'Meta',        shade: 'rgba(242,244,249,0.92)' },
  { key: 'google', label: 'Google',      shade: 'rgba(242,244,249,0.62)' },
  { key: 'tiktok', label: 'TikTok Shop', shade: 'rgba(242,244,249,0.36)' },
  { key: 'other',  label: 'Other',       shade: 'rgba(242,244,249,0.18)' }
];

async function loadAdSpend() {
  state.adSpend = await fetchAPI(API.adSpend).catch(() => []) || [];
}

// Monday of the week a date falls in, as YYYY-MM-DD — the calendar stores
// week_start, ad spend stores week_ending, so everything is normalised to
// a single key before they can be charted together.
function weekKeyOf(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function weekKeyLabel(k) {
  const d = new Date(k + 'T12:00:00');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate();
}

// Posted content per week, split by platform. Only entries actually marked
// posted count — planned-but-unposted would flatter the numbers.
function marketingWeeks(n = 10) {
  const weeks = new Map();
  const touch = k => {
    if (!weeks.has(k)) weeks.set(k, { key: k, posts: {}, total: 0, spend: {}, spendTotal: 0, revenue: 0 });
    return weeks.get(k);
  };

  (state.contentCalendar || []).forEach(e => {
    if ((e.status || '') !== 'posted') return;
    const k = e.week_start || weekKeyOf(e.week_start);
    if (!k) return;
    const w = touch(k);
    const p = e.platform || 'tiktok_blc';
    w.posts[p] = (w.posts[p] || 0) + 1;
    w.total += 1;
  });

  (state.adSpend || []).forEach(s => {
    const k = weekKeyOf(s.week_ending);
    if (!k) return;
    const w = touch(k);
    w.spend[s.platform] = (w.spend[s.platform] || 0) + (parseFloat(s.amount) || 0);
    w.spendTotal += parseFloat(s.amount) || 0;
  });

  (bf_getLog() || []).forEach(r => {
    const k = weekKeyOf(r.week_ending);
    if (!k) return;
    touch(k).revenue += weekRevenue(r);
  });

  return [...weeks.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-n);
}

// One chart, three questions. Output and Impact would otherwise be the
// same bars twice, one of them with a line on top.
const MKT_VIEWS = [
  { key: 'output', label: 'Output', title: 'Content posted per week' },
  { key: 'spend',  label: 'Spend',  title: 'Ad spend per week' },
  { key: 'impact', label: 'Impact', title: 'Output and spend against revenue' }
];

function setMktContentView(v) {
  state.mktContentView = v;
  renderMarketingPage();
}

function setMktChartView(v) {
  state.mktChartView = v;
  renderMarketingPage();
}

function renderMarketingPage() {
  dashDestroyCharts();

  const hub    = HUBS.marketing;
  const weeks  = marketingWeeks(10);
  const view   = state.mktContentView || 'all';
  const posted = weeks.reduce((t, w) => t + w.total, 0);
  const spend  = weeks.reduce((t, w) => t + w.spendTotal, 0);
  const rev    = weeks.reduce((t, w) => t + w.revenue, 0);
  const roas   = spend > 0 ? (rev / spend) : null;
  const last   = weeks[weeks.length - 1];
  const prev   = weeks[weeks.length - 2];

  const hasPosts  = weeks.some(w => w.total > 0);
  const hasSpend  = weeks.some(w => w.spendTotal > 0);
  const chartView = state.mktChartView || 'output';

  document.getElementById('page-content').innerHTML = `
    <div class="hub-banner">
      <h1 class="hub-title">${esc(hub.title)}</h1>
      <div class="hub-promise">${esc(hub.promise)}</div>
      <div class="hub-sub">${esc(hub.sub)}</div>
      <div class="hub-stats">
        <div class="hub-stat">
          <div class="hub-stat-value">${last ? last.total : 0}</div>
          <div class="hub-stat-label">Posted last week</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${posted}</div>
          <div class="hub-stat-label">Posted (${weeks.length}w)</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${money(spend)}</div>
          <div class="hub-stat-label">Ad spend (${weeks.length}w)</div>
        </div>
        <div class="hub-stat">
          <div class="hub-stat-value">${roas ? roas.toFixed(1) + 'x' : '—'}</div>
          <div class="hub-stat-label">Revenue per $1 ads</div>
        </div>
      </div>
    </div>

    <div class="dash-panel glow-surface" style="margin-bottom:26px">
      <div class="dash-panel-head">
        <h3 class="pd-section-title">${MKT_VIEWS.find(v => v.key === chartView)?.title || ''}</h3>
        <div class="dash-panel-controls">
          ${chartView === 'output' && hasPosts ? `
          <div class="dash-toggle">
            <button class="dash-toggle-btn${view === 'all' ? ' is-on' : ''}" onclick="setMktContentView('all')">All</button>
            ${CC_PLATFORMS.map(p => `
              <button class="dash-toggle-btn${view === p.key ? ' is-on' : ''}" onclick="setMktContentView('${p.key}')">${esc(p.abbr)}</button>`).join('')}
          </div>` : ''}
          ${chartView === 'spend' ? `<button class="btn btn-secondary btn-sm" onclick="openAdSpendModal()">Log spend</button>` : ''}
          <div class="dash-toggle">
            ${MKT_VIEWS.map(v => `
              <button class="dash-toggle-btn${chartView === v.key ? ' is-on' : ''}" onclick="setMktChartView('${v.key}')">${v.label}</button>`).join('')}
          </div>
        </div>
      </div>

      ${(() => {
        if (chartView === 'output') {
          return hasPosts
            ? `<div class="dash-chart dash-chart-tall"><canvas id="mkt-content"></canvas></div>
               <div class="dash-chart-foot">
                 ${view === 'all' ? 'All platforms, stacked' : ccGetLabel(view)}
                 ${last && prev ? ` · last week ${last.total} vs ${prev.total} the week before` : ''}
               </div>`
            : `<div class="dash-empty">Nothing marked posted yet.
                 <button class="dash-empty-link" onclick="navigate('content-calendar')">Open the Content Calendar →</button></div>`;
        }
        if (chartView === 'spend') {
          return hasSpend
            ? `<div class="dash-chart dash-chart-tall"><canvas id="mkt-spend"></canvas></div>
               <div class="dash-chart-foot">${money(spend)} across ${weeks.length} weeks</div>`
            : `<div class="dash-empty">No ad spend logged yet.
                 <button class="dash-empty-link" onclick="openAdSpendModal()">Log a week →</button></div>`;
        }
        return (hasPosts || hasSpend)
          ? `<div class="dash-chart dash-chart-tall"><canvas id="mkt-corr"></canvas></div>
             <div class="dash-chart-foot">Bars are posts. Both lines are dollars on the right axis — if spend and output climb but revenue doesn't, that's the signal.</div>`
          : `<div class="dash-empty">Nothing to compare yet — post some content and log a week of spend.</div>`;
      })()}
    </div>

  `;

  requestAnimationFrame(() => {
    if (chartView === 'output' && hasPosts)      mktDrawContent(weeks, view);
    else if (chartView === 'spend' && hasSpend)  mktDrawSpend(weeks);
    else if (chartView === 'impact' && (hasPosts || hasSpend)) mktDrawCorrelation(weeks);
  });
}

const MKT_SHADES = ['rgba(242,244,249,0.92)','rgba(242,244,249,0.62)','rgba(242,244,249,0.38)','rgba(242,244,249,0.20)'];

function mktBaseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'rgba(242,244,249,0.68)', font: { family: 'Poppins', size: 11 }, boxWidth: 9, padding: 12, usePointStyle: true } },
      tooltip: {
        backgroundColor: '#12131b', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
        titleColor: '#f2f4f9', bodyColor: 'rgba(242,244,249,0.75)'
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: DASH_TICK },
      y: { stacked: true, grid: { color: DASH_GRID }, ticks: DASH_TICK, beginAtZero: true }
    },
    ...extra
  };
}

function mktDrawContent(weeks, view) {
  const el = document.getElementById('mkt-content');
  if (!el || typeof Chart === 'undefined') return;
  const labels = weeks.map(w => weekKeyLabel(w.key));

  const datasets = view === 'all'
    ? CC_PLATFORMS.map((p, i) => ({
        label: p.label,
        data: weeks.map(w => w.posts[p.key] || 0),
        backgroundColor: MKT_SHADES[i % MKT_SHADES.length],
        borderRadius: 3, borderSkipped: false
      }))
    : [{
        label: ccGetLabel(view),
        data: weeks.map(w => w.posts[view] || 0),
        backgroundColor: MKT_SHADES[0],
        borderRadius: 3, borderSkipped: false
      }];

  dashCharts.mktContent = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: mktBaseOptions({
      plugins: {
        legend: { display: view === 'all', labels: { color: 'rgba(242,244,249,0.68)', font: { family: 'Poppins', size: 11 }, boxWidth: 9, padding: 12, usePointStyle: true } },
        tooltip: { backgroundColor: '#12131b', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, titleColor: '#f2f4f9', bodyColor: 'rgba(242,244,249,0.75)' }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: DASH_TICK },
        y: { stacked: true, grid: { color: DASH_GRID }, ticks: { ...DASH_TICK, precision: 0 }, beginAtZero: true }
      }
    })
  });
}

function mktDrawSpend(weeks) {
  const el = document.getElementById('mkt-spend');
  if (!el || typeof Chart === 'undefined') return;
  dashCharts.mktSpend = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: weeks.map(w => weekKeyLabel(w.key)),
      datasets: AD_PLATFORMS.map(p => ({
        label: p.label,
        data: weeks.map(w => Math.round(w.spend[p.key] || 0)),
        backgroundColor: p.shade,
        borderRadius: 3, borderSkipped: false
      }))
    },
    options: mktBaseOptions({
      plugins: {
        legend: { labels: { color: 'rgba(242,244,249,0.68)', font: { family: 'Poppins', size: 11 }, boxWidth: 9, padding: 12, usePointStyle: true } },
        tooltip: {
          backgroundColor: '#12131b', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
          titleColor: '#f2f4f9', bodyColor: 'rgba(242,244,249,0.75)',
          callbacks: { label: c => `${c.dataset.label}: ${money(c.raw)}` }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: DASH_TICK },
        y: { stacked: true, grid: { color: DASH_GRID }, ticks: { ...DASH_TICK, callback: v => '$' + (v >= 1000 ? (v/1000) + 'k' : v) }, beginAtZero: true }
      }
    })
  });
}

// Posts as bars against revenue as a line on its own axis — different
// units, so a shared scale would make one of them unreadable.
function mktDrawCorrelation(weeks) {
  const el = document.getElementById('mkt-corr');
  if (!el || typeof Chart === 'undefined') return;
  dashCharts.mktCorr = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: weeks.map(w => weekKeyLabel(w.key)),
      datasets: [
        { label: 'Posts', data: weeks.map(w => w.total), backgroundColor: 'rgba(242,244,249,0.26)', borderRadius: 3, borderSkipped: false, yAxisID: 'y' },
        // Revenue and spend are both dollars, so they share the right axis
        // and can actually be compared to each other.
        { label: 'Revenue', data: weeks.map(w => Math.round(w.revenue)), type: 'line',
          borderColor: 'rgba(242,244,249,0.95)', backgroundColor: 'transparent', borderWidth: 2,
          tension: 0.35, pointRadius: 3, pointBackgroundColor: '#06070c',
          pointBorderColor: 'rgba(242,244,249,0.95)', pointBorderWidth: 2, yAxisID: 'y1' },
        { label: 'Ad spend', data: weeks.map(w => Math.round(w.spendTotal)), type: 'line',
          borderColor: 'rgba(242,244,249,0.5)', backgroundColor: 'transparent', borderWidth: 2,
          borderDash: [5, 4], tension: 0.35, pointRadius: 2, pointBackgroundColor: '#06070c',
          pointBorderColor: 'rgba(242,244,249,0.5)', pointBorderWidth: 2, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: 'rgba(242,244,249,0.68)', font: { family: 'Poppins', size: 11 }, boxWidth: 9, padding: 12, usePointStyle: true } },
        tooltip: {
          backgroundColor: '#12131b', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
          titleColor: '#f2f4f9', bodyColor: 'rgba(242,244,249,0.75)',
          callbacks: { label: c => c.dataset.label === 'Posts' ? `Posts: ${c.raw}` : `${c.dataset.label}: ${money(c.raw)}` }
        }
      },
      scales: {
        x:  { grid: { display: false }, ticks: DASH_TICK },
        y:  { position: 'left',  grid: { color: DASH_GRID }, ticks: { ...DASH_TICK, precision: 0 }, beginAtZero: true, title: { display: true, text: 'Posts', color: 'rgba(242,244,249,0.45)', font: { size: 10 } } },
        y1: { position: 'right', grid: { display: false }, ticks: { ...DASH_TICK, callback: v => '$' + (v >= 1000 ? (v/1000) + 'k' : v) }, beginAtZero: true }
      }
    }
  });
}

// ── Logging ad spend ────────────────────────────────────────────
function openAdSpendModal() {
  const today = new Date();
  const dow = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (dow === 0 ? 0 : 7 - dow));
  const defaultWeek = sunday.toISOString().slice(0, 10);

  openModal('Log Ad Spend', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">Week ending</label>
        <input type="date" class="form-input" id="as-week" value="${defaultWeek}">
      </div>
      ${AD_PLATFORMS.map(p => `
        <div class="form-group" style="margin:0">
          <label class="form-label">${p.label}</label>
          <input class="form-input" id="as-${p.key}" type="number" min="0" step="0.01" placeholder="0.00">
        </div>`).join('')}
      <p style="font-size:12px;color:var(--text-muted);margin:0">
        Re-logging the same week overwrites it, so correcting a number is safe.
      </p>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveAdSpend()">Save</button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('as-week')?.focus(), 60);
}

async function saveAdSpend() {
  const week = document.getElementById('as-week')?.value;
  if (!week) { showToast('Pick the week ending date', 'error'); return; }

  const entries = AD_PLATFORMS
    .map(p => ({ platform: p.key, amount: parseFloat(document.getElementById(`as-${p.key}`)?.value) || 0 }))
    .filter(e => e.amount > 0);

  if (!entries.length) { showToast('Enter at least one amount', 'error'); return; }

  try {
    for (const e of entries) {
      const row = await fetchAPI(API.adSpend, {
        method: 'POST',
        body: JSON.stringify({ week_ending: week, platform: e.platform, amount: e.amount })
      });
      // Upsert on the server, so mirror that here rather than duplicating
      const i = state.adSpend.findIndex(s => s.week_ending === row.week_ending && s.platform === row.platform);
      if (i === -1) state.adSpend.push(row); else state.adSpend[i] = row;
    }
    closeModal();
    renderMarketingPage();
    showToast('Ad spend saved');
  } catch (err) { showToast(err.message, 'error'); }
}

function renderHomePage() {
  dashDestroyCharts();

  const now = new Date();
  const h = now.getHours();
  // All of these get ", team." appended, so none may end in punctuation —
  // the after-midnight one used to render "Still at it —, team."
  const greeting = h < 5 ? 'Still at it' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const openTasks    = state.tasks.filter(t => !t.completed && !t.archived);
  const overdue      = openTasks.filter(t => t.deadline && deadlineSortKey(t.deadline) < 0);
  const dueSoon      = openTasks.filter(t => t.deadline && deadlineSortKey(t.deadline) >= 0 && deadlineSortKey(t.deadline) <= 1);
  const thisMonth    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const supportMonth = state.support.filter(i => (i.issue_date || '').startsWith(thisMonth)).length;
  const activeProjects = projectsSorted().filter(p => p.status === 'active' || p.status === 'planning');
  const pipeline = state.partnerLeads.filter(l => ['contacted','replied','applied'].includes(l.status)).length;
  const subsMonthly = state.subscriptions
    .filter(s => s.status === 'active')
    .reduce((t, s) => t + subMonthly(s), 0);

  const weeks     = dashWeeks(12);
  const months    = dashMonths(12);
  const chartMode = state.dashChartMode || 'monthly';
  const hasRevenue = weeks.length > 0;
  const latest   = weeks[weeks.length - 1];
  const prev     = weeks[weeks.length - 2];
  const revNow   = latest ? weekRevenue(latest) : 0;
  const revPrev  = prev   ? weekRevenue(prev)   : 0;
  const revDelta = revPrev > 0 ? Math.round(((revNow - revPrev) / revPrev) * 100) : null;

  // Workload per person, so it's obvious who is buried
  const workload = activeMembers().map(m => {
    const mine = openTasks.filter(t => t.assignee === m.member_key);
    return { ...m, open: mine.length, late: mine.filter(t => t.deadline && deadlineSortKey(t.deadline) < 0).length };
  });
  const heaviest = Math.max(1, ...workload.map(w => w.open));

  const tile = (value, label, sub, page) => `
    <button class="dash-tile glow-surface" onclick="navigate('${page}')">
      <div class="dash-tile-value">${value}</div>
      <div class="dash-tile-label">${label}</div>
      <div class="dash-tile-sub">${sub}</div>
    </button>`;

  document.getElementById('page-content').innerHTML = `
    <div class="home-page">

      <div class="home-header-row">
        <div class="home-hero">
          <div class="home-greeting">${greeting}, team.</div>
          <div class="home-date">${dateStr}</div>
        </div>
        <div class="home-header-actions">
          <button class="btn btn-primary" onclick="navigate('tasks')">+ New Task</button>
        </div>
      </div>

      <div class="dash-tiles pd-stagger" style="--i:0">
        ${tile(
          revNow ? money(revNow) : '—',
          'Revenue last week',
          revDelta === null ? 'No prior week to compare' :
            `${revDelta >= 0 ? '▲' : '▼'} ${Math.abs(revDelta)}% vs the week before`,
          'brand-finance')}
        ${tile(openTasks.length, 'Open tasks',
          overdue.length ? `${overdue.length} overdue` : dueSoon.length ? `${dueSoon.length} due today` : 'Nothing overdue', 'tasks')}
        ${tile(activeProjects.length, 'Active projects',
          `${state.projects.length} tracked in total`, 'projects')}
        ${tile(money(subsMonthly), 'Monthly subscriptions',
          `${money(subsMonthly * 12)} a year`, 'subscriptions')}
      </div>

      <div class="dash-split pd-stagger" style="--i:1">
        <div class="dash-panel glow-surface">
          <div class="dash-panel-head">
            <h3 class="pd-section-title">${chartMode === 'monthly' ? 'Revenue by month' : 'Revenue by channel'}</h3>
            <div class="dash-toggle">
              <button class="dash-toggle-btn${chartMode === 'monthly' ? ' is-on' : ''}" onclick="setDashChart('monthly')">Monthly</button>
              <button class="dash-toggle-btn${chartMode === 'channel' ? ' is-on' : ''}" onclick="setDashChart('channel')">By channel</button>
            </div>
          </div>
          ${hasRevenue
            ? `<div class="dash-chart"><canvas id="dash-rev"></canvas></div>
               <div class="dash-chart-foot">
                 ${chartMode === 'monthly'
                   ? `${months.length} month${months.length === 1 ? '' : 's'} · ${money(months.reduce((t, m) => t + m.total, 0))} total`
                   : `last ${weeks.length} week${weeks.length === 1 ? '' : 's'}`}
               </div>`
            : `<div class="dash-empty">
                 No weekly numbers yet.
                 <button class="dash-empty-link" onclick="navigate('brand-finance')">Add a week in Financials →</button>
               </div>`}
        </div>

        <div class="dash-panel glow-surface">
          <div class="dash-panel-head">
            <h3 class="pd-section-title">Who's carrying what</h3>
            <span class="pd-count">${openTasks.length} open</span>
          </div>
          <div class="dash-workload">
            ${workload.map(w => `
              <button class="dash-person" onclick="navigate('tasks')">
                <span class="focus-avatar">${esc(w.initials || w.name[0].toUpperCase())}</span>
                <span class="dash-person-body">
                  <span class="dash-person-top">
                    <span class="dash-person-name">${esc(w.name)}</span>
                    <span class="dash-person-count">${w.open}${w.late ? ` <span class="dash-late">${w.late} late</span>` : ''}</span>
                  </span>
                  <span class="dash-person-bar"><span class="dash-person-fill" style="width:${Math.round((w.open / heaviest) * 100)}%"></span></span>
                </span>
              </button>`).join('')}
            ${workload.length ? '' : '<div class="dash-empty">No team members yet.</div>'}
          </div>
        </div>
      </div>

      <div class="dash-section-label pd-stagger" style="--i:2">Projects</div>
      <div class="home-projects-row pd-stagger" style="--i:2">
        ${activeProjects.length ? activeProjects.map(p => {
          const pr  = projectProgress(p.id);
          const due = p.target_date ? fmtDeadline(p.target_date) : null;
          return `
          <button class="home-project-card glow-surface" onclick="openProjectDetail('${p.id}')">
            <div class="home-project-name">${esc(p.name)}</div>
            <div class="proj-bar"><div class="proj-bar-fill" style="width:${pr.pct}%"></div></div>
            <div class="proj-meta">
              <span>${pr.total ? `${pr.done}/${pr.total} tasks` : 'No tasks yet'}</span>
              ${due ? `<span class="task-deadline ${due.cls}">${due.text}</span>` : `<span>${pr.pct}%</span>`}
            </div>
          </button>`;
        }).join('') : `
          <button class="home-project-card home-project-empty" onclick="navigate('projects')">
            <div class="home-project-name">No active projects</div>
            <div class="proj-meta"><span>Add one to start tracking</span></div>
          </button>`}
      </div>

      ${(overdue.length || supportMonth) ? `
      <div class="dash-section-label pd-stagger" style="--i:3">Needs attention</div>
      <div class="dash-attention pd-stagger" style="--i:3">
        ${overdue.slice(0, 5).map(t => {
          const dl = fmtDeadline(t.deadline);
          return `
          <button class="dash-attn-row" onclick="navigate('tasks')">
            <span class="focus-avatar">${esc(memberInitials(t.assignee))}</span>
            <span class="dash-attn-who">${esc(memberName(t.assignee))}</span>
            <span class="dash-attn-title">${esc(t.title)}</span>
            <span class="task-deadline ${dl.cls}">${dl.text}</span>
          </button>`;
        }).join('')}
        ${overdue.length > 5 ? `<button class="dash-attn-more" onclick="navigate('tasks')">${overdue.length - 5} more overdue →</button>` : ''}
        ${supportMonth ? `
          <button class="dash-attn-row" onclick="navigate('support')">
            <span class="dash-attn-dot"></span>
            <span class="dash-attn-title">${supportMonth} support issue${supportMonth !== 1 ? 's' : ''} logged this month</span>
            <span class="dash-attn-arrow">→</span>
          </button>` : ''}
      </div>` : ''}

    </div>
  `;

  requestAnimationFrame(() => {
    animateHomeStats();
    if (chartMode === 'monthly') dashDrawMonthly(months);
    else                          dashDrawRevenue(weeks);
  });
}

// Monthly total — the ups and downs at a glance. A line rather than bars,
// because the question here is the shape of the trend, not the split.
function dashDrawMonthly(months) {
  const el = document.getElementById('dash-rev');
  if (!el || !months.length || typeof Chart === 'undefined') return;

  const ctx = el.getContext('2d');
  const fill = ctx.createLinearGradient(0, 0, 0, 232);
  fill.addColorStop(0, 'rgba(242,244,249,0.22)');
  fill.addColorStop(1, 'rgba(242,244,249,0)');

  dashCharts.rev = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => monthLabelShort(m.month)),
      datasets: [{
        label: 'Total revenue',
        data: months.map(m => Math.round(m.total)),
        borderColor: 'rgba(242,244,249,0.9)',
        backgroundColor: fill,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#06070c',
        pointBorderColor: 'rgba(242,244,249,0.9)',
        pointBorderWidth: 2,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#12131b',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          titleColor: '#f2f4f9',
          bodyColor: 'rgba(242,244,249,0.75)',
          callbacks: {
            label: c => money(c.raw),
            // Month-to-month movement is the whole point, so name it
            afterLabel: c => {
              const prev = months[c.dataIndex - 1];
              if (!prev || !prev.total) return '';
              const d = Math.round(((months[c.dataIndex].total - prev.total) / prev.total) * 100);
              return `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}% vs ${monthLabelShort(prev.month)}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: DASH_TICK },
        y: { grid: { color: DASH_GRID }, ticks: { ...DASH_TICK, callback: v => '$' + (v >= 1000 ? (v / 1000) + 'k' : v) }, beginAtZero: true }
      }
    }
  });
}

// Monochrome by design — the three channels separate by lightness rather
// than hue, so the chart belongs to the same black-and-white system.
function dashDrawRevenue(weeks) {
  const el = document.getElementById('dash-rev');
  if (!el || !weeks.length || typeof Chart === 'undefined') return;

  const label = w => (w.week_ending || '').slice(5);
  const series = (key, shade) => ({
    label: { tiktok_revenue: 'TikTok Shop', amazon_revenue: 'Amazon', website_revenue: 'Website' }[key],
    data: weeks.map(w => parseFloat(w[key]) || 0),
    backgroundColor: shade,
    borderRadius: 3,
    borderSkipped: false
  });

  dashCharts.rev = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: weeks.map(label),
      datasets: [
        series('tiktok_revenue',  'rgba(242,244,249,0.92)'),
        series('amazon_revenue',  'rgba(242,244,249,0.52)'),
        series('website_revenue', 'rgba(242,244,249,0.24)')
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: 'rgba(242,244,249,0.68)', font: { family: 'Poppins', size: 11 }, boxWidth: 9, padding: 14, usePointStyle: true } },
        tooltip: {
          backgroundColor: '#12131b',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          titleColor: '#f2f4f9',
          bodyColor: 'rgba(242,244,249,0.75)',
          callbacks: { label: c => `${c.dataset.label}: ${money(c.raw)}` }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: DASH_TICK },
        y: { stacked: true, grid: { color: DASH_GRID }, ticks: { ...DASH_TICK, callback: v => '$' + (v >= 1000 ? (v / 1000) + 'k' : v) }, beginAtZero: true }
      }
    }
  });
}

// ============================================================
// GOAL + REVENUE
// ============================================================






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
// COMMENT BANK
// ============================================================

async function loadCommentBank() {
  state.commentBank = await fetchAPI(API.commentBank);
}

function renderCommentBankPage() {
  const filter = state.commentBankFilter || 'pending';
  const all = state.commentBank || [];
  const list = filter === 'all' ? all : all.filter(c => c.status === filter);
  const pendingCount = all.filter(c => c.status === 'pending').length;

  document.getElementById('page-content').innerHTML = `
    <div class="ideas-page">
      <div class="ideas-header">
        <div>
          <h1 class="page-title" style="margin-bottom:6px">Comment Bank</h1>
          <p class="ideas-subtitle">Good comments worth replying to — link the video, save the comment, never lose it</p>
        </div>
        <button class="btn btn-primary" onclick="openCommentModal(null)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Comment
        </button>
      </div>
      <div class="cr-filter-row">
        ${[
          { key: 'pending', label: `Pending${pendingCount ? ` (${pendingCount})` : ''}` },
          { key: 'replied', label: 'Replied' },
          { key: 'all',     label: 'All' }
        ].map(f => `<button class="cr-filter-btn${filter === f.key ? ' cr-filter-active' : ''}" onclick="setCommentBankFilter('${f.key}')">${f.label}</button>`).join('')}
      </div>
      ${list.length === 0
        ? `<div class="ideas-empty">
             <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);margin-bottom:12px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
             <p>${filter === 'replied' ? 'No replied comments yet' : 'No comments saved yet — paste a good one in'}</p>
           </div>`
        : `<div class="ideas-grid">
             ${list.map(c => `
               <div class="idea-card cr-card">
                 <div class="idea-body cr-comment-text" onclick="openCommentModal('${c.id}')">&ldquo;${esc(c.comment_text)}&rdquo;</div>
                 ${c.notes ? `<div class="cr-notes" onclick="openCommentModal('${c.id}')">${esc(c.notes)}</div>` : ''}
                 <div class="idea-footer cr-footer">
                   <a href="${esc(c.video_url)}" target="_blank" rel="noopener" class="cr-video-link" onclick="event.stopPropagation()">
                     <i class="fa-solid fa-video"></i> View video
                   </a>
                   <span class="idea-date">${fmtDate(c.created_at)}</span>
                 </div>
                 <div class="cr-actions">
                   <button class="cr-status-btn${c.status === 'replied' ? ' cr-status-replied' : ''}" onclick="toggleCommentStatus('${c.id}','${c.status}')">
                     ${c.status === 'replied' ? '<i class="fa-solid fa-check"></i> Replied' : 'Mark Replied'}
                   </button>
                   <button class="cr-copy-btn" onclick="copyCommentText('${c.id}')" title="Copy comment"><i class="fa-regular fa-copy"></i></button>
                 </div>
               </div>
             `).join('')}
           </div>`}
    </div>
  `;
}

function setCommentBankFilter(key) {
  state.commentBankFilter = key;
  renderCommentBankPage();
}

function openCommentModal(id) {
  const comment = id ? state.commentBank.find(c => c.id === id) : null;
  const isEdit = !!comment;

  openModal(isEdit ? 'Edit Comment' : 'New Comment', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">TikTok video link</label>
        <input type="url" class="form-input" id="cr-video-url" placeholder="https://www.tiktok.com/@..." value="${isEdit ? esc(comment.video_url) : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Comment</label>
        <textarea class="form-input" id="cr-comment-text" rows="4" placeholder="Paste the comment here…" style="resize:vertical">${isEdit ? esc(comment.comment_text) : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <input type="text" class="form-input" id="cr-notes" placeholder="e.g. reply angle, why it's good" value="${isEdit ? esc(comment.notes || '') : ''}">
      </div>
      <div style="display:flex;gap:8px;justify-content:space-between">
        <div>${isEdit ? `<button class="btn btn-danger btn-sm" onclick="deleteComment('${id}')">Delete</button>` : ''}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="saveComment(${id ? `'${id}'` : 'null'})">
            ${isEdit ? 'Save' : 'Add Comment'}
          </button>
        </div>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('cr-video-url')?.focus(), 60);
}

async function saveComment(id) {
  const video_url    = document.getElementById('cr-video-url')?.value.trim();
  const comment_text = document.getElementById('cr-comment-text')?.value.trim();
  const notes         = document.getElementById('cr-notes')?.value.trim();
  if (!video_url)    { showToast('Paste the video link first', 'error'); return; }
  if (!comment_text) { showToast('Paste the comment text first', 'error'); return; }
  try {
    if (id) {
      const updated = await fetchAPI(`${API.commentBank}/${id}`, { method: 'PUT', body: JSON.stringify({ video_url, comment_text, notes }) });
      const i = state.commentBank.findIndex(c => c.id === id);
      if (i !== -1) state.commentBank[i] = updated;
    } else {
      const created = await fetchAPI(API.commentBank, { method: 'POST', body: JSON.stringify({ video_url, comment_text, notes }) });
      state.commentBank.unshift(created);
    }
    closeModal();
    if (state.currentPage === 'comment-bank') renderCommentBankPage();
    showToast(id ? 'Comment updated' : 'Comment saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function toggleCommentStatus(id, currentStatus) {
  const status = currentStatus === 'replied' ? 'pending' : 'replied';
  try {
    const updated = await fetchAPI(`${API.commentBank}/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    const i = state.commentBank.findIndex(c => c.id === id);
    if (i !== -1) state.commentBank[i] = updated;
    if (state.currentPage === 'comment-bank') renderCommentBankPage();
  } catch (err) { showToast(err.message, 'error'); }
}

async function copyCommentText(id) {
  const comment = state.commentBank.find(c => c.id === id);
  if (!comment) return;
  try {
    await navigator.clipboard.writeText(comment.comment_text);
    showToast('Comment copied');
  } catch (err) { showToast('Could not copy', 'error'); }
}

async function deleteComment(id) {
  try {
    await fetchAPI(`${API.commentBank}/${id}`, { method: 'DELETE' });
    state.commentBank = state.commentBank.filter(c => c.id !== id);
    closeModal();
    if (state.currentPage === 'comment-bank') renderCommentBankPage();
    showToast('Comment deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// CONTENT CALENDAR
// ============================================================

const CC_STATUSES = [
  { key: 'idea',     label: 'Idea',     color: '#9ca3af' },
  { key: 'scripted', label: 'Scripted', color: '#f59e0b' },
  { key: 'filmed',   label: 'Filmed',   color: '#f97316' },
  { key: 'edited',   label: 'Edited',   color: '#7c3aed' },
  { key: 'posted',   label: 'Posted',   color: '#10b981' },
];
const CC_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CC_PLATFORMS = [
  { key: 'instagram',    label: 'Instagram',                   abbr: 'IG' },
  { key: 'tiktok_blc',  label: 'The Bikini Line Co (TikTok)', abbr: 'TT' },
  { key: 'tamar',       label: 'Tamar',                        abbr: 'TM' },
  { key: 'glow_like_tt', label: 'Glow Like TT',               abbr: 'GL' },
];

let ccPlatformOrder = (function() {
  try { return JSON.parse(localStorage.getItem('ccPlatformOrder')) || null; } catch { return null; }
})() || CC_PLATFORMS.map(p => p.key);

let ccPlatformLabels = (function() {
  try { return JSON.parse(localStorage.getItem('ccPlatformLabels')) || {}; } catch { return {}; }
})();

function ccGetLabel(key) {
  return (ccPlatformLabels[key] !== undefined && ccPlatformLabels[key] !== '')
    ? ccPlatformLabels[key]
    : CC_PLATFORMS.find(p => p.key === key)?.label || key;
}

function ccOrderedPlatforms() {
  return ccPlatformOrder
    .map(k => CC_PLATFORMS.find(p => p.key === k))
    .filter(Boolean);
}

const CC_CONTENT_TYPES = [
  { key: 'script',        label: 'Script' },
  { key: 'comment_reply', label: 'Comment Reply' },
  { key: 'green_screen',  label: 'Green Screen' },
  { key: 'raw_idea',      label: 'Raw Idea' },
];

function ccWeekStart(dateStr) {
  const d = new Date((dateStr || new Date().toISOString().split('T')[0]) + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

function ccWeekLabel(weekStart) {
  const s = new Date(weekStart + 'T12:00:00');
  const e = new Date(weekStart + 'T12:00:00');
  e.setDate(e.getDate() + 6);
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const endStr = s.getMonth() === e.getMonth()
    ? String(e.getDate())
    : `${mo[e.getMonth()]} ${e.getDate()}`;
  return `${mo[s.getMonth()]} ${s.getDate()} – ${endStr}, ${e.getFullYear()}`;
}

function ccShiftWeek(weekStart, n) {
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function ccDayDate(weekStart, dayIdx) {
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + dayIdx);
  return d.getDate();
}

function ccStatusObj(key) {
  return CC_STATUSES.find(s => s.key === key) || CC_STATUSES[0];
}

async function loadContentCalendar(week) {
  const w = week || state.calWeek || ccWeekStart();
  state.calWeek = w;
  state.contentCalendar = await fetchAPI(`${API.contentCalendar}?week=${w}`);
}

function renderContentCalendarPage() {
  if (!state.calWeek) state.calWeek = ccWeekStart();
  const week = state.calWeek;
  const isThisWeek = week === ccWeekStart();
  const today = new Date();

  document.getElementById('page-content').innerHTML = `
    <div class="cc-page">
      <div class="cc-main">
        <div class="cc-header">
          <div class="cc-header-left">
            <h1 class="page-title" style="margin-bottom:4px">Content Calendar</h1>
            <p class="cc-subtitle">4 channels · plan, script, and track every post</p>
          </div>
          <div class="cc-week-nav">
            <button class="cc-week-btn" onclick="ccNavigateWeek(-1)">←</button>
            <span class="cc-week-label">${ccWeekLabel(week)}</span>
            <button class="cc-week-btn" onclick="ccNavigateWeek(1)">→</button>
            ${!isThisWeek ? `<button class="btn btn-secondary btn-sm" onclick="ccGoToThisWeek()" style="margin-left:8px">This week</button>` : ''}
          </div>
        </div>

        <div class="cc-board">
          <div class="cc-col-headers">
            <div class="cc-platform-stub"></div>
            ${CC_DAYS.map((day, i) => {
              const d = new Date(week + 'T12:00:00');
              d.setDate(d.getDate() + i);
              const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
              return `<div class="cc-col-head${isToday ? ' cc-col-today' : ''}">
                <span class="cc-col-day">${day}</span>
                <span class="cc-col-date${isToday ? ' cc-col-date-today' : ''}">${d.getDate()}</span>
              </div>`;
            }).join('')}
          </div>

          ${ccOrderedPlatforms().map(platform => `
            <div class="cc-platform-row"
              ondragover="ccDragOver(event,'${platform.key}')"
              ondragleave="ccDragLeave(event)"
              ondrop="ccDrop(event,'${platform.key}')">
              <div class="cc-platform-label"
                draggable="true"
                ondragstart="ccDragStart(event,'${platform.key}')"
                ondragend="ccDragEnd(event)">
                <span class="cc-drag-handle">
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
                    <circle cx="2" cy="2" r="1.3"/><circle cx="6" cy="2" r="1.3"/>
                    <circle cx="2" cy="7" r="1.3"/><circle cx="6" cy="7" r="1.3"/>
                    <circle cx="2" cy="12" r="1.3"/><circle cx="6" cy="12" r="1.3"/>
                  </svg>
                </span>
                <span class="cc-platform-name" id="cc-pname-${platform.key}"
                  ondblclick="ccEditPlatformName('${platform.key}',event)"
                  title="Double-click to rename">${ccGetLabel(platform.key)}</span>
              </div>
              ${CC_DAYS.map((day, i) => {
                const entry = state.contentCalendar.find(e =>
                  (e.platform || 'tiktok_blc') === platform.key && e.day_of_week === i
                );
                if (entry && (entry.title || entry.script_text || entry.script_url)) {
                  const status = ccStatusObj(entry.status);
                  const typeObj = CC_CONTENT_TYPES.find(t => t.key === (entry.content_type || 'script'));
                  const typeLabel = typeObj?.label || 'Script';
                  const preview = entry.script_text ? entry.script_text.slice(0, 100).replace(/\n/g, ' ') : '';
                  return `<div class="cc-cell cc-cell-filled"
                    onclick="ccOpenPostDrawer('${platform.key}', ${i})"
                    ondragover="ibCellDragOver(event)"
                    ondragleave="ibCellDragLeave(event)"
                    ondrop="ibCellDrop(event,'${platform.key}',${i})">
                    <div class="cc-cell-top">
                      <span class="cc-cell-type">${typeLabel}</span>
                      <span class="cc-cell-dot" style="background:${status.color}" title="${status.label}"></span>
                    </div>
                    ${entry.title ? `<div class="cc-cell-title">${esc(entry.title)}</div>` : ''}
                    ${preview ? `<div class="cc-cell-preview">${esc(preview)}${entry.script_text?.length > 100 ? '…' : ''}</div>` : ''}
                  </div>`;
                }
                return `<div class="cc-cell cc-cell-empty"
                  onclick="ccOpenPostDrawer('${platform.key}', ${i})"
                  ondragover="ibCellDragOver(event)"
                  ondragleave="ibCellDragLeave(event)"
                  ondrop="ibCellDrop(event,'${platform.key}',${i})">
                  <span class="cc-cell-add">+ Add</span>
                </div>`;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>

      ${renderIdeaBank()}
    </div>
  `;
}

async function ccNavigateWeek(dir) {
  const newWeek = ccShiftWeek(state.calWeek, dir);
  state.calWeek = newWeek;
  await loadContentCalendar(newWeek);
  renderContentCalendarPage();
}

function ccGoToThisWeek() {
  const w = ccWeekStart();
  state.calWeek = w;
  loadContentCalendar(w).then(() => renderContentCalendarPage());
}

function ccOpenPostDrawer(platformKey, dayIdx) {
  const week = state.calWeek;
  const entry = state.contentCalendar.find(e =>
    (e.platform || 'tiktok_blc') === platformKey && e.day_of_week === dayIdx
  );
  const platformObj = CC_PLATFORMS.find(p => p.key === platformKey);
  const dayName = CC_DAYS[dayIdx];
  const d = new Date(week + 'T12:00:00');
  d.setDate(d.getDate() + dayIdx);
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateLabel = `${mo[d.getMonth()]} ${d.getDate()}`;
  const curStatus = entry?.status || 'idea';
  const curType   = entry?.content_type || 'script';

  ccSelectedStatus = null;
  ccSelectedType   = null;

  document.getElementById('detail-drawer-title').textContent = `${platformObj.label} · ${dayName} ${dateLabel}`;
  document.getElementById('detail-drawer-body').innerHTML = `
    <div class="cc-drawer">
      <div class="cc-form-row">
        <label class="cc-label">Content Type</label>
        <div class="cc-type-pills">
          ${CC_CONTENT_TYPES.map(t => `
            <button class="cc-type-pill${curType === t.key ? ' cc-type-active' : ''}"
              data-type="${t.key}" onclick="ccSelectType(this,'${t.key}')">${t.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Title <span style="font-weight:400;opacity:0.55">(optional)</span></label>
        <input type="text" class="dp-input" id="cc-title"
          value="${esc(entry?.title || '')}" placeholder="Hook, angle, or topic…">
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Status</label>
        <div class="cc-status-pills">
          ${CC_STATUSES.map(s => `
            <button class="cc-status-pill${curStatus === s.key ? ' cc-status-active' : ''}"
              style="${curStatus === s.key
                ? `background:${s.color};color:#fff;border-color:${s.color}`
                : `color:${s.color};border-color:${s.color}40`}"
              data-status="${s.key}" onclick="ccSelectStatus(this,'${s.key}','${s.color}')">
              ${s.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Script</label>
        <textarea class="dp-input cc-script-input" id="cc-script-text" rows="12"
          placeholder="Type or paste the full script here…">${esc(entry?.script_text || '')}</textarea>
      </div>

      <div class="cc-form-row">
        <div class="cc-doc-label-row">
          <label class="cc-label">Google Doc <span style="font-weight:400;opacity:0.55">(optional)</span></label>
          ${entry?.script_url ? `<button class="cc-doc-embed-btn" id="cc-doc-toggle" onclick="ccToggleDocEmbed()">Embed ↓</button>` : `<button class="cc-doc-embed-btn" id="cc-doc-toggle" onclick="ccToggleDocEmbed()" style="display:none">Embed ↓</button>`}
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="url" class="dp-input" id="cc-script-url"
            value="${esc(entry?.script_url || '')}" placeholder="Paste Google Doc URL…" style="flex:1"
            oninput="ccOnDocUrlInput()">
          <button class="btn btn-secondary btn-sm" onclick="ccOpenDoc()">Open ↗</button>
        </div>
        <div id="cc-doc-embed-wrap" style="display:none">
          <div class="cc-doc-iframe-wrap">
            <iframe id="cc-doc-iframe" class="cc-doc-iframe" src="" allowfullscreen></iframe>
          </div>
        </div>
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Notes</label>
        <textarea class="dp-input" id="cc-notes" rows="3"
          placeholder="References, comment to reply to, context…" style="resize:vertical">${esc(entry?.notes || '')}</textarea>
      </div>

      <div class="cc-drawer-actions">
        <button class="btn btn-primary"
          onclick="ccSavePost('${week}','${platformKey}',${dayIdx},'${entry?.id || ''}')">
          ${entry ? 'Save Changes' : 'Add Post'}
        </button>
        ${entry ? `<button class="btn btn-secondary" onclick="ccClearPost('${entry.id}')">Remove</button>` : ''}
      </div>
    </div>
  `;
  document.getElementById('detail-panel').style.display = 'flex';
}

let ccSelectedStatus = null;
let ccSelectedType   = null;

function ccSelectStatus(btn, key, color) {
  ccSelectedStatus = key;
  document.querySelectorAll('.cc-status-pill').forEach(b => {
    const bKey   = b.dataset.status;
    const bColor = CC_STATUSES.find(s => s.key === bKey)?.color || '#9ca3af';
    b.classList.remove('cc-status-active');
    b.style.background  = 'transparent';
    b.style.color       = bColor;
    b.style.borderColor = bColor + '40';
  });
  btn.classList.add('cc-status-active');
  btn.style.background  = color;
  btn.style.color       = '#fff';
  btn.style.borderColor = color;
}

function ccSelectType(btn, key) {
  ccSelectedType = key;
  document.querySelectorAll('.cc-type-pill').forEach(b => b.classList.remove('cc-type-active'));
  btn.classList.add('cc-type-active');
}

function ccOpenDoc() {
  const url = document.getElementById('cc-script-url')?.value?.trim();
  if (url) window.open(url, '_blank', 'noopener');
  else showToast('Paste a Google Doc URL first', 'error');
}

/* ── Row drag-to-reorder ──────────────────────────────────── */
let _ccDragKey = null;

function ccDragStart(event, key) {
  _ccDragKey = key;
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.closest('.cc-platform-row')?.classList.add('cc-dragging');
}

function ccDragOver(event, key) {
  if (_ibDragId) return; // idea-bank drag — cells handle it
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.cc-platform-row').forEach(r => r.classList.remove('cc-drag-over'));
  event.currentTarget.classList.add('cc-drag-over');
}

function ccDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('cc-drag-over');
  }
}

function ccDrop(event, targetKey) {
  if (_ibDragId) return; // idea-bank drag — cells handle it
  event.preventDefault();
  document.querySelectorAll('.cc-platform-row').forEach(r => r.classList.remove('cc-drag-over'));
  if (!_ccDragKey || _ccDragKey === targetKey) return;
  const from = ccPlatformOrder.indexOf(_ccDragKey);
  const to   = ccPlatformOrder.indexOf(targetKey);
  if (from < 0 || to < 0) return;
  ccPlatformOrder.splice(from, 1);
  ccPlatformOrder.splice(to, 0, _ccDragKey);
  localStorage.setItem('ccPlatformOrder', JSON.stringify(ccPlatformOrder));
  _ccDragKey = null;
  renderContentCalendarPage();
}

function ccDragEnd(event) {
  _ccDragKey = null;
  document.querySelectorAll('.cc-platform-row').forEach(r => {
    r.classList.remove('cc-dragging', 'cc-drag-over');
  });
}

// ============================================================
// IDEA BANK
// ============================================================

let _ibDragId = null;
let _ibOpen   = (function() { try { return JSON.parse(localStorage.getItem('ibOpen') ?? 'true'); } catch { return true; } })();

async function loadContentIdeas() {
  state.contentIdeas = await fetchAPI(API.contentIdeas);
}

function renderIdeaBank() {
  const ideas = state.contentIdeas || [];
  return `
    <div class="cc-bank${_ibOpen ? '' : ' cc-bank-collapsed'}" id="cc-bank">
      <div class="cc-bank-header">
        <span class="cc-bank-title">Idea Bank</span>
        <div style="display:flex;gap:6px;align-items:center">
          ${_ibOpen ? `<button class="btn btn-primary btn-sm" onclick="ibNewIdea()">+ New</button>` : ''}
          <button class="cc-bank-toggle" onclick="ibToggleBank()" title="${_ibOpen ? 'Collapse' : 'Expand'}">
            ${_ibOpen ? '‹' : '›'}
          </button>
        </div>
      </div>
      ${_ibOpen ? `
      <div class="cc-bank-list" id="ib-list">
        ${ideas.length === 0
          ? `<div class="ib-empty"><p style="font-weight:500;margin-bottom:4px">No ideas yet</p><p style="font-size:12px;color:var(--text-muted)">Click + New to add one, then drag it onto the calendar.</p></div>`
          : ideas.map(idea => `
            <div class="ib-card"
              draggable="true"
              ondragstart="ibDragStart(event,'${idea.id}')"
              ondragend="ibDragEnd(event)"
              onclick="ibOpenDrawer('${idea.id}')">
              <div class="ib-card-title">${esc(idea.title || 'Untitled')}</div>
              ${idea.channel ? `<div class="ib-card-channel">${ccGetLabel(idea.channel)}</div>` : ''}
              <div class="ib-card-badges">
                ${ibStatusBadge(idea.status)}
                ${ibTypeBadge(idea.content_type)}
              </div>
            </div>
          `).join('')
        }
      </div>` : ''}
    </div>`;
}

function ibStatusBadge(status) {
  const s = CC_STATUSES.find(x => x.key === status) || CC_STATUSES[0];
  return `<span class="ib-badge" style="background:${s.color}18;color:${s.color}">${s.label}</span>`;
}

function ibTypeBadge(type) {
  const t = CC_CONTENT_TYPES.find(x => x.key === type);
  if (!t || t.key === 'script') return '';
  return `<span class="ib-badge" style="background:rgba(0,0,0,0.06);color:var(--text-muted)">${t.label}</span>`;
}

function ibToggleBank() {
  _ibOpen = !_ibOpen;
  localStorage.setItem('ibOpen', JSON.stringify(_ibOpen));
  renderContentCalendarPage();
}

function ibNewIdea() {
  ccSelectedStatus = null;
  ccSelectedType   = null;
  ibOpenDrawer(null);
}

function ibOpenDrawer(id) {
  const idea = id ? state.contentIdeas.find(i => i.id === id) : null;
  ccSelectedStatus = null;
  ccSelectedType   = null;

  document.getElementById('detail-drawer-title').textContent = idea ? 'Edit Idea' : 'New Idea';
  document.getElementById('detail-drawer-body').innerHTML = `
    <div class="cc-drawer">
      <div class="cc-form-row">
        <label class="cc-label">Title</label>
        <input type="text" class="dp-input" id="ib-title"
          value="${esc(idea?.title || '')}" placeholder="Hook, angle, or topic…">
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Channel <span style="font-weight:400;opacity:0.55">(optional)</span></label>
        <select class="dp-input" id="ib-channel">
          <option value="">Any channel</option>
          ${CC_PLATFORMS.map(p => `
            <option value="${p.key}"${idea?.channel === p.key ? ' selected' : ''}>${ccGetLabel(p.key)}</option>
          `).join('')}
        </select>
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Content Type</label>
        <div class="cc-type-pills">
          ${CC_CONTENT_TYPES.map(t => `
            <button class="cc-type-pill${(idea?.content_type || 'script') === t.key ? ' cc-type-active' : ''}"
              data-type="${t.key}" onclick="ccSelectType(this,'${t.key}')">${t.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Status</label>
        <div class="cc-status-pills">
          ${CC_STATUSES.map(s => {
            const active = (idea?.status || 'idea') === s.key;
            return `<button class="cc-status-pill${active ? ' cc-status-active' : ''}"
              style="${active
                ? `background:${s.color};color:#fff;border-color:${s.color}`
                : `color:${s.color};border-color:${s.color}40`}"
              data-status="${s.key}" onclick="ccSelectStatus(this,'${s.key}','${s.color}')">
              ${s.label}</button>`;
          }).join('')}
        </div>
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Script</label>
        <textarea class="dp-input cc-script-input" id="ib-script" rows="10"
          placeholder="Write or paste your script here…">${esc(idea?.script_text || '')}</textarea>
      </div>

      <div class="cc-form-row">
        <label class="cc-label">Notes</label>
        <textarea class="dp-input" id="ib-notes" rows="3"
          placeholder="References, context, inspiration…" style="resize:vertical">${esc(idea?.notes || '')}</textarea>
      </div>

      <div class="cc-drawer-actions">
        <button class="btn btn-primary" onclick="ibSaveIdea('${idea?.id || ''}')">
          ${idea ? 'Save Changes' : 'Add to Bank'}
        </button>
        ${idea ? `<button class="btn btn-secondary" onclick="ibDeleteIdea('${idea.id}')">Delete</button>` : ''}
      </div>
    </div>
  `;
  document.getElementById('detail-panel').style.display = 'flex';
}

async function ibSaveIdea(id) {
  const title        = document.getElementById('ib-title')?.value?.trim() || '';
  const channel      = document.getElementById('ib-channel')?.value || null;
  const script_text  = document.getElementById('ib-script')?.value?.trim() || '';
  const notes        = document.getElementById('ib-notes')?.value?.trim() || '';
  const status       = ccSelectedStatus
    || document.querySelector('.cc-status-pill.cc-status-active')?.dataset?.status || 'idea';
  const content_type = ccSelectedType
    || document.querySelector('.cc-type-pill.cc-type-active')?.dataset?.type || 'script';

  if (!title) { showToast('Add a title first', 'error'); return; }

  try {
    const body = { title, channel: channel || null, script_text, notes, status, content_type };
    if (id) {
      const updated = await fetchAPI(`${API.contentIdeas}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const idx = state.contentIdeas.findIndex(i => i.id === id);
      if (idx !== -1) state.contentIdeas[idx] = updated;
    } else {
      const created = await fetchAPI(API.contentIdeas, { method: 'POST', body: JSON.stringify(body) });
      state.contentIdeas.unshift(created);
    }
    ccSelectedStatus = null;
    ccSelectedType   = null;
    closeDetailPanel();
    renderContentCalendarPage();
    showToast(id ? 'Idea updated' : 'Added to bank');
  } catch (err) { showToast(err.message, 'error'); }
}

async function ibDeleteIdea(id) {
  if (!confirm('Delete this idea?')) return;
  try {
    await fetchAPI(`${API.contentIdeas}/${id}`, { method: 'DELETE' });
    state.contentIdeas = state.contentIdeas.filter(i => i.id !== id);
    closeDetailPanel();
    renderContentCalendarPage();
    showToast('Idea deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

/* ── Drag from bank onto calendar cell ── */
function ibDragStart(event, ideaId) {
  _ibDragId  = ideaId;
  _ccDragKey = null;
  event.dataTransfer.effectAllowed = 'copy';
  event.currentTarget.classList.add('ib-dragging');
}

function ibDragEnd(event) {
  _ibDragId = null;
  event.currentTarget?.classList.remove('ib-dragging');
  document.querySelectorAll('.cc-cell-drop-target').forEach(el => el.classList.remove('cc-cell-drop-target'));
}

function ibCellDragOver(event) {
  if (!_ibDragId) return;
  event.preventDefault();
  event.stopPropagation(); // prevent row reorder handler from firing
  event.dataTransfer.dropEffect = 'copy';
  event.currentTarget.classList.add('cc-cell-drop-target');
}

function ibCellDragLeave(event) {
  event.currentTarget.classList.remove('cc-cell-drop-target');
}

function ibCellDrop(event, platformKey, dayIdx) {
  event.stopPropagation();
  event.currentTarget.classList.remove('cc-cell-drop-target');
  if (!_ibDragId) return;
  const id = _ibDragId;
  _ibDragId = null;

  const idea = state.contentIdeas.find(i => i.id === id);
  if (!idea) return;

  const existing = state.contentCalendar.find(e =>
    (e.platform || 'tiktok_blc') === platformKey && e.day_of_week === dayIdx
  );
  if (existing) {
    showToast('That slot already has content — click to edit it', 'error');
    return;
  }

  ibScheduleIdea(idea, platformKey, dayIdx);
}

async function ibScheduleIdea(idea, platformKey, dayIdx) {
  try {
    const week  = state.calWeek || ccWeekStart();
    const entry = await fetchAPI(API.contentCalendar, {
      method: 'POST',
      body: JSON.stringify({
        week_start:   week,
        day_of_week:  dayIdx,
        platform:     platformKey,
        title:        idea.title        || '',
        script_text:  idea.script_text  || '',
        notes:        idea.notes        || '',
        status:       idea.status       || 'idea',
        content_type: idea.content_type || 'script',
      })
    });
    state.contentCalendar.push(entry);
    renderContentCalendarPage();
    showToast(`"${idea.title || 'Idea'}" scheduled`);
  } catch (err) { showToast(err.message, 'error'); }
}

/* ── Row rename (double-click) ──────────────────────────────── */
function ccEditPlatformName(key, event) {
  event.stopPropagation();
  const span = document.getElementById(`cc-pname-${key}`);
  if (!span) return;
  const current = ccGetLabel(key);
  span.outerHTML = `<input class="cc-platform-name-input" id="cc-pname-input-${key}"
    value="${esc(current)}"
    onblur="ccSavePlatformName('${key}',this.value)"
    onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){ccCancelPlatformName('${key}','${esc(current)}');}"
    onclick="event.stopPropagation()">`;
  const input = document.getElementById(`cc-pname-input-${key}`);
  if (input) { input.focus(); input.select(); }
}

function ccSavePlatformName(key, value) {
  const name = value.trim();
  ccPlatformLabels[key] = name || CC_PLATFORMS.find(p => p.key === key)?.label || key;
  localStorage.setItem('ccPlatformLabels', JSON.stringify(ccPlatformLabels));
  renderContentCalendarPage();
}

function ccCancelPlatformName(key, original) {
  const input = document.getElementById(`cc-pname-input-${key}`);
  if (input) input.value = original;
  renderContentCalendarPage();
}

function ccToEmbedUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const m = rawUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!m) return null;
    return `https://docs.google.com/document/d/${m[1]}/edit?rm=minimal`;
  } catch { return null; }
}

function ccOnDocUrlInput() {
  const url = document.getElementById('cc-script-url')?.value?.trim();
  const toggle = document.getElementById('cc-doc-toggle');
  if (toggle) toggle.style.display = url ? 'inline-block' : 'none';
  // collapse embed if URL was cleared
  if (!url) {
    const wrap = document.getElementById('cc-doc-embed-wrap');
    if (wrap) wrap.style.display = 'none';
    const iframe = document.getElementById('cc-doc-iframe');
    if (iframe) iframe.src = '';
    if (toggle) toggle.textContent = 'Embed ↓';
  }
}

function ccToggleDocEmbed() {
  const wrap   = document.getElementById('cc-doc-embed-wrap');
  const iframe = document.getElementById('cc-doc-iframe');
  const toggle = document.getElementById('cc-doc-toggle');
  const open   = wrap?.style.display === 'none';
  if (open) {
    const url = document.getElementById('cc-script-url')?.value?.trim();
    const embedUrl = ccToEmbedUrl(url);
    if (!embedUrl) return showToast('Paste a valid Google Doc URL first', 'error');
    iframe.src = embedUrl;
    wrap.style.display = 'block';
    toggle.textContent = 'Collapse ↑';
  } else {
    wrap.style.display = 'none';
    iframe.src = '';
    toggle.textContent = 'Embed ↓';
  }
}

async function ccSavePost(week, platformKey, dayIdx, existingId) {
  const title        = document.getElementById('cc-title')?.value?.trim()       || '';
  const script_text  = document.getElementById('cc-script-text')?.value?.trim() || '';
  const script_url   = document.getElementById('cc-script-url')?.value?.trim()  || '';
  const notes        = document.getElementById('cc-notes')?.value?.trim()        || '';
  const status       = ccSelectedStatus
    || document.querySelector('.cc-status-pill.cc-status-active')?.dataset?.status || 'idea';
  const content_type = ccSelectedType
    || document.querySelector('.cc-type-pill.cc-type-active')?.dataset?.type       || 'script';

  try {
    let updated;
    if (existingId) {
      updated = await fetchAPI(`${API.contentCalendar}/${existingId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, script_text, script_url, notes, status, content_type })
      });
      const idx = state.contentCalendar.findIndex(e => e.id === existingId);
      if (idx !== -1) state.contentCalendar[idx] = updated;
    } else {
      updated = await fetchAPI(API.contentCalendar, {
        method: 'POST',
        body: JSON.stringify({
          week_start: week, day_of_week: dayIdx, platform: platformKey,
          title, script_text, script_url, notes, status, content_type
        })
      });
      state.contentCalendar.push(updated);
    }
    ccSelectedStatus = null;
    ccSelectedType   = null;
    closeDetailPanel();
    renderContentCalendarPage();
    showToast('Saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function ccClearPost(id) {
  if (!confirm('Remove this post?')) return;
  try {
    await fetchAPI(`${API.contentCalendar}/${id}`, { method: 'DELETE' });
    state.contentCalendar = state.contentCalendar.filter(e => e.id !== id);
    ccSelectedStatus = null;
    ccSelectedType   = null;
    closeDetailPanel();
    renderContentCalendarPage();
    showToast('Post removed');
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

function toggleNavSection(id) {
  const body = document.getElementById('nav-section-' + id);
  if (!body) return;
  const toggle = body.previousElementSibling;
  const isCollapsed = body.classList.toggle('collapsed');
  toggle?.classList.toggle('collapsed', isCollapsed);
  const stored = JSON.parse(localStorage.getItem('nav_collapsed') || '{}');
  stored[id] = isCollapsed;
  localStorage.setItem('nav_collapsed', JSON.stringify(stored));
}

function restoreNavCollapsed() {
  const stored = JSON.parse(localStorage.getItem('nav_collapsed') || '{}');
  for (const [id, collapsed] of Object.entries(stored)) {
    if (!collapsed) continue;
    const body = document.getElementById('nav-section-' + id);
    const toggle = body?.previousElementSibling;
    if (body) { body.classList.add('collapsed'); toggle?.classList.add('collapsed'); }
  }
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
  restoreNavCollapsed();

  // Regular nav items (not the roster group trigger or Creative Lab items — handled separately)
  document.querySelectorAll('.nav-item:not(.nav-group-trigger):not(.nav-cl-item)').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });
  // Group triggers — navigate to the parent page (opens the sub-menu automatically)
  document.querySelectorAll('.nav-group-trigger[data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
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

  // Each loader used to swallow its own failure, which meant an unreachable
  // table looked exactly like an empty one — Content Calendar, Idea Board,
  // Comment Bank and the Script Library were all broken for a long stretch
  // and simply rendered as "nothing here yet". Failures are collected and
  // reported once now, so a missing grant announces itself.
  const failed = [];
  const load = (label, fn) => fn().catch(err => {
    failed.push(label);
    console.error(`${label} failed to load:`, err);
  });

  await Promise.all([
    load('Challengers',       loadChallengers),
    load('Support',           loadSupport),
    load('Issue types',       loadCustomIssueTypes),
    load('Tasks',             loadTasks),
    load('Projects',          loadProjects),
    load('Attachments',       loadProjectAttachments),
    load('Partners',          loadPartners),
    load('Team',              loadTeamMembers),
    load('Subscriptions',     loadSubscriptions),
    load('Financials',        loadBrandFinance),
    load('Ad spend',          loadAdSpend),
    load('Expenses',          loadExpenses),
    load('Meetings',          loadMeetings),
    load('Ideas',             loadIdeas),
    load('Comment Bank',      loadCommentBank),
    load('Content Calendar',  loadContentCalendar),
    load('Content ideas',     loadContentIdeas),
    load('Pro Partner leads', loadPartnerOutreach)
  ]);

  if (failed.length) {
    setTimeout(() => showToast(
      `Couldn't load: ${failed.join(', ')}. Those pages will look empty until it's fixed.`,
      'error'
    ), 900);
  }

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
// This page used to read and write localStorage directly, so its numbers
// existed in exactly one browser — not shared, not backed up, invisible to
// anyone else. It's on Supabase now, but bf_load/bf_save keep their
// synchronous shape: they work off a cache hydrated at startup, and saves
// write through in the background. That keeps the page's own logic, which
// mutates whole arrays and objects in place, entirely unchanged.
function bf_load(k) {
  return state.brandFinance[k] !== undefined ? state.brandFinance[k] : null;
}

function bf_save(k, v) {
  state.brandFinance[k] = v;
  localStorage.setItem(k, JSON.stringify(v));   // local mirror, so a failed
                                                // write is never a lost entry
  fetchAPI(`${API.brandFinance}/${k}`, {
    method: 'PUT',
    body: JSON.stringify({ value: v })
  }).catch(err => showToast(`Couldn't sync to the team: ${err.message}`, 'error'));
}

// Pull the shared copy. First run against an empty table pushes up whatever
// is already in this browser, so nothing recorded before the move is lost.
async function loadBrandFinance() {
  const KEYS = [BF_K.LOG, BF_K.POS, BF_K.ACCOUNTS, BF_K.PRICING];
  let remote = {};
  try { remote = await fetchAPI(API.brandFinance) || {}; }
  catch { remote = {}; }

  state.brandFinance = remote;

  const orphaned = KEYS.filter(k => remote[k] === undefined && localStorage.getItem(k));
  if (!orphaned.length) return;

  let uploaded = 0;
  for (const k of orphaned) {
    try {
      const value = JSON.parse(localStorage.getItem(k));
      if (value === null) continue;
      await fetchAPI(`${API.brandFinance}/${k}`, { method: 'PUT', body: JSON.stringify({ value }) });
      state.brandFinance[k] = value;
      uploaded++;
    } catch {
      // Table missing or unreachable. Fall back to the local copy so the
      // page still shows the real numbers, and try again next load.
      try { state.brandFinance[k] = JSON.parse(localStorage.getItem(k)); } catch {}
    }
  }
  // Only claim the move happened for what actually landed
  if (uploaded) {
    showToast(`Financials moved to the shared database — ${uploaded} record${uploaded === 1 ? '' : 's'} uploaded`);
  }
}

function bf_getLog()    { return bf_load(BF_K.LOG)      || []; }
function bf_getPOs()    { return bf_load(BF_K.POS)      || []; }
function bf_getAccs()   { return bf_load(BF_K.ACCOUNTS) || {}; }
function bf_getPNotes() { return bf_load(BF_K.PRICING)  || {}; }
// The Anthropic key stays per-browser on purpose — it's a secret, and a
// shared table the anon key can read is the wrong place for it.
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

// "0.0 units/day" with nothing logged reads as a measurement — as though we
// genuinely sold nothing — when the truth is there is nothing to average.
// Null means no weeks recorded, and the tiles show an em dash instead.
function bf_velocityOrNull() {
  return bf_last4().length ? bf_avgDailyU() : null;
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
    { id: 'overview',  label: 'Overview' },
    { id: 'pl',        label: 'Profit & Loss' },
    { id: 'weekly',    label: 'Weekly Log' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'pricing',   label: '💲 Pricing Lab' },
    { id: 'accounts',  label: 'Accounts' }
  ];

  document.getElementById('page-content').innerHTML = `
    <div class="page-header" style="margin-bottom:0;align-items:flex-start">
      <div>
        <h1 class="page-title">Financials</h1>
        <p class="page-subtitle">Company money and stock — revenue, inventory, pricing &amp; cash</p>
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

  const subRenderers = { overview: bf_renderOverview, pl: bf_renderPL, weekly: bf_renderWeeklyLog, inventory: bf_renderInventory, pricing: bf_renderPricing, accounts: bf_renderAccounts };
  if (subRenderers[state.bfTab]) subRenderers[state.bfTab]();
}

// ── Overview tab ──────────────────────────────────────────────
// ── Profit & Loss ─────────────────────────────────────────────
// Everything here is assembled from data already being kept: revenue and
// units from the weekly log, ads from ad_spend, software from
// subscriptions, everything else from expenses. The only figure that has
// to be entered for this tab is cost per unit.

async function loadExpenses() {
  state.expenses = await fetchAPI(API.expenses).catch(() => []) || [];
}

function bf_unitCost() {
  return parseFloat((bf_load('blc_cogs') || {}).unit_cost) || 0;
}

function bf_plMonths() {
  const months = new Set();
  (bf_getLog() || []).forEach(w => { if (w.week_ending) months.add(w.week_ending.slice(0, 7)); });
  (state.adSpend  || []).forEach(s => { if (s.week_ending) months.add(s.week_ending.slice(0, 7)); });
  (state.expenses || []).forEach(e => { if (e.spent_on)    months.add(e.spent_on.slice(0, 7)); });
  return [...months].sort().reverse();
}

// One month's numbers, top to bottom.
function bf_plFor(month) {
  const weeks = (bf_getLog() || []).filter(w => (w.week_ending || '').startsWith(month));
  const num = (o, k) => parseFloat(o[k]) || 0;

  const revenue = {
    tiktok:  weeks.reduce((t, w) => t + num(w, 'tiktok_revenue'), 0),
    amazon:  weeks.reduce((t, w) => t + num(w, 'amazon_revenue'), 0),
    website: weeks.reduce((t, w) => t + num(w, 'website_revenue'), 0)
  };
  revenue.total = revenue.tiktok + revenue.amazon + revenue.website;

  const units = weeks.reduce((t, w) =>
    t + num(w, 'tiktok_orders') + num(w, 'amazon_orders') + num(w, 'website_orders'), 0);
  const cogs = units * bf_unitCost();
  const gross = revenue.total - cogs;

  const ads = (state.adSpend || [])
    .filter(s => (s.week_ending || '').startsWith(month))
    .reduce((t, s) => t + (parseFloat(s.amount) || 0), 0);

  // Subscriptions are a standing monthly cost, not something logged per
  // month, so the active ones are charged at their monthly equivalent.
  const software = (state.subscriptions || [])
    .filter(s => s.status === 'active')
    .reduce((t, s) => t + subMonthly(s), 0);

  const logged = (state.expenses || []).filter(e => (e.spent_on || '').startsWith(month));
  const byCategory = {};
  logged.forEach(e => {
    const c = e.category || 'Other';
    byCategory[c] = (byCategory[c] || 0) + (parseFloat(e.amount) || 0);
  });
  const otherTotal = Object.values(byCategory).reduce((t, v) => t + v, 0);

  const opex = ads + software + otherTotal;
  return {
    month, weeks: weeks.length, revenue, units, cogs, gross,
    ads, software, byCategory, otherTotal, opex,
    net: gross - opex,
    grossMargin: revenue.total > 0 ? (gross / revenue.total) * 100 : null,
    netMargin:   revenue.total > 0 ? ((gross - opex) / revenue.total) * 100 : null
  };
}

function bf_setPLMonth(m) { state.plMonth = m; bf_renderPL(); }

function bf_renderPL() {
  const months = bf_plMonths();
  if (!months.length) {
    document.getElementById('bf-content').innerHTML = `
      <div class="bf-card">
        <div class="dash-empty">
          Nothing to report on yet — a P&amp;L needs at least one week of numbers.
          <button class="dash-empty-link" onclick="renderBrandFinancePage('weekly')">Add a week in the Weekly Log →</button>
        </div>
      </div>`;
    return;
  }

  const month = months.includes(state.plMonth) ? state.plMonth : months[0];
  state.plMonth = month;
  const p    = bf_plFor(month);
  const prev = months[months.indexOf(month) + 1] ? bf_plFor(months[months.indexOf(month) + 1]) : null;
  const unitCost = bf_unitCost();

  // Rising revenue is good, rising costs are not — so cost rows invert the
  // colour. Showing "operating costs ▲85%" in green would read as a win.
  const delta = (now, before, isCost = false) => {
    if (before === null || before === undefined || !before) return '';
    const d = Math.round(((now - before) / Math.abs(before)) * 100);
    const good = isCost ? d < 0 : d >= 0;
    return `<span class="pl-delta ${good ? 'pl-up' : 'pl-down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%</span>`;
  };
  const row = (label, value, opts = {}) => `
    <div class="pl-row${opts.cls ? ' ' + opts.cls : ''}">
      <span class="pl-label">${esc(label)}${opts.hint ? `<span class="pl-hint">${esc(opts.hint)}</span>` : ''}</span>
      <span class="pl-value">${opts.negative && value > 0 ? '−' : ''}${money(Math.abs(value))}${opts.delta || ''}</span>
    </div>`;

  document.getElementById('bf-content').innerHTML = `
    <div class="pl-head">
      <select class="form-input pl-month" onchange="bf_setPLMonth(this.value)">
        ${months.map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${monthLabelShort(m)}</option>`).join('')}
      </select>
      <div class="pl-head-actions">
        <button class="btn btn-secondary btn-sm" onclick="bf_openUnitCost()">Unit cost: ${unitCost ? money2(unitCost) : 'not set'}</button>
        <button class="btn btn-primary btn-sm" onclick="bf_openExpense()">Log expense</button>
      </div>
    </div>

    ${!unitCost ? `
    <div class="pl-warn">
      Cost per unit isn't set, so gross profit is showing the same as revenue.
      Set it and COGS will be computed from the ${p.units || 0} units in this month.
    </div>` : ''}

    <div class="pl-grid">
      <div class="pl-tile">
        <div class="pl-tile-label">Revenue</div>
        <div class="pl-tile-value">${money(p.revenue.total)}</div>
      </div>
      <div class="pl-tile">
        <div class="pl-tile-label">Gross profit</div>
        <div class="pl-tile-value">${money(p.gross)}</div>
        <div class="pl-tile-sub">${p.grossMargin === null ? '—' : p.grossMargin.toFixed(0) + '% margin'}</div>
      </div>
      <div class="pl-tile">
        <div class="pl-tile-label">Operating costs</div>
        <div class="pl-tile-value">${money(p.opex)}</div>
      </div>
      <div class="pl-tile ${p.net >= 0 ? 'pl-tile-good' : 'pl-tile-bad'}">
        <div class="pl-tile-label">Net profit</div>
        <div class="pl-tile-value">${p.net < 0 ? '−' : ''}${money(Math.abs(p.net))}</div>
        <div class="pl-tile-sub">${p.netMargin === null ? '—' : p.netMargin.toFixed(0) + '% margin'}</div>
      </div>
    </div>

    <div class="bf-card pl-statement">
      <div class="pl-section">Revenue</div>
      ${row('TikTok Shop', p.revenue.tiktok)}
      ${row('Amazon', p.revenue.amazon)}
      ${row('Website', p.revenue.website)}
      ${row('Total revenue', p.revenue.total, { cls: 'pl-total', delta: prev ? delta(p.revenue.total, prev.revenue.total) : '' })}

      <div class="pl-section">Cost of goods</div>
      ${row('Product cost', p.cogs, { negative: true, hint: unitCost ? `${p.units} units × ${money2(unitCost)}` : 'no unit cost set' })}
      ${row('Gross profit', p.gross, { cls: 'pl-total', delta: prev ? delta(p.gross, prev.gross) : '' })}

      <div class="pl-section">Operating costs</div>
      ${row('Advertising', p.ads, { negative: true, hint: 'from ad spend' })}
      ${row('Software & subscriptions', p.software, { negative: true, hint: 'active subscriptions, monthly equivalent' })}
      ${Object.entries(p.byCategory).sort((a, b) => b[1] - a[1]).map(([c, v]) => row(c, v, { negative: true })).join('')}
      ${row('Total operating costs', p.opex, { cls: 'pl-total', negative: true, delta: prev ? delta(p.opex, prev.opex, true) : '' })}

      <div class="pl-net ${p.net >= 0 ? 'pl-up' : 'pl-down'}">
        <span>Net profit</span>
        <span>${p.net < 0 ? '−' : ''}${money(Math.abs(p.net))}${prev ? delta(p.net, prev.net) : ''}</span>
      </div>
      <div class="pl-foot">
        ${p.weeks} week${p.weeks === 1 ? '' : 's'} logged in ${monthLabelShort(month)}${prev ? ` · compared against ${monthLabelShort(prev.month)}` : ''}
      </div>
    </div>
  `;
}

function bf_openUnitCost() {
  openModal('Cost Per Unit', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group">
        <label class="form-label">What one unit costs you</label>
        <input class="form-input" id="pl-unit" type="number" min="0" step="0.01"
               value="${bf_unitCost() || ''}" placeholder="e.g. 6.40">
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin:0">
        Landed cost — product, packaging and inbound freight. Multiplied by units
        sold to get cost of goods, so it drives every gross margin on this page.
      </p>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="bf_saveUnitCost()">Save</button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('pl-unit')?.focus(), 60);
}

function bf_saveUnitCost() {
  const v = parseFloat(document.getElementById('pl-unit')?.value) || 0;
  bf_save('blc_cogs', { unit_cost: v });
  closeModal();
  bf_renderPL();
  showToast('Unit cost saved');
}

const EXPENSE_CATEGORIES = ['Payroll', 'Contractors', 'Shipping', 'Platform fees', 'Packaging', 'Samples', 'Travel', 'Other'];

function bf_openExpense() {
  const known = [...new Set([...EXPENSE_CATEGORIES, ...(state.expenses || []).map(e => e.category).filter(Boolean)])];
  openModal('Log Expense', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="ex-date" value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Amount</label>
          <input class="form-input" id="ex-amount" type="number" min="0" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Category</label>
          <input class="form-input" id="ex-category" list="ex-cats" placeholder="e.g. Payroll">
          <datalist id="ex-cats">${known.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Paid to</label>
          <input class="form-input" id="ex-vendor" placeholder="Optional">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <input class="form-input" id="ex-notes" placeholder="Optional">
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="bf_saveExpense()">Save</button>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('ex-amount')?.focus(), 60);
}

async function bf_saveExpense() {
  const v = i => document.getElementById(i)?.value.trim() || null;
  const body = {
    spent_on: v('ex-date'),
    category: v('ex-category') || 'Other',
    amount: parseFloat(document.getElementById('ex-amount')?.value) || 0,
    vendor: v('ex-vendor'),
    notes: v('ex-notes')
  };
  if (!body.spent_on)  { showToast('Pick a date', 'error'); return; }
  if (!body.amount)    { showToast('Enter an amount', 'error'); return; }
  try {
    state.expenses.push(await fetchAPI(API.expenses, { method: 'POST', body: JSON.stringify(body) }));
    closeModal();
    bf_renderPL();
    showToast('Expense logged');
  } catch (err) { showToast(err.message, 'error'); }
}

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
        <div class="bf-stat-label">Days of Stock Left</div>
        <div class="bf-stat-value" style="color:${rwyCol}">${rwy !== null ? rwy : '—'}</div>
        <div class="bf-runway-bar"><div class="bf-runway-fill" style="width:${rwyFill}%;background:${rwyCol}"></div></div>
        <span class="bf-pill ${pillCls}" style="margin-top:4px;display:inline-block">${pillLbl}</span>
      </div>
      <div class="bf-stat-card">
        <div class="bf-stat-label">Selling Per Day</div>
        <div class="bf-stat-value">${bf_velocityOrNull() === null ? '—' : vel.toFixed(1)}</div>
        <div class="bf-stat-sub">${bf_velocityOrNull() === null
          ? 'No weeks logged yet'
          : `avg units/day · ~${bf_N(Math.round(vel * 7))} this week`}</div>
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
      <div class="bf-stat-card"><div class="bf-stat-label">Stock On Hand</div><div class="bf-stat-value">${bf_N(latest?.inventory_units || 0)}</div><div class="bf-stat-sub">units right now</div></div>
      <div class="bf-stat-card"><div class="bf-stat-label">Selling Per Day</div><div class="bf-stat-value">${bf_velocityOrNull() === null ? '—' : vel.toFixed(1)}</div><div class="bf-stat-sub">${bf_velocityOrNull() === null ? 'No weeks logged yet' : 'avg over last 4 weeks'}</div></div>
      <div class="bf-stat-card" style="border-color:${rwy !== null && rwy <= 15 ? 'var(--red)' : rwy !== null && rwy <= 45 ? 'var(--yellow)' : 'var(--border)'}">
        <div class="bf-stat-label">⏳ Days Until Sold Out</div>
        <div class="bf-stat-value" style="color:${rwyCol}">${rwy !== null ? rwy : '—'}</div>
        <span class="bf-pill ${pillCls}" style="margin-top:6px;display:inline-block;font-size:11px">${pillLbl}</span>
      </div>
      <div class="bf-stat-card"><div class="bf-stat-label">Estimated Sellout</div><div class="bf-stat-value" style="font-size:16px;line-height:1.3">${selloutStr}</div><div class="bf-stat-sub">at current pace</div></div>
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
        <div class="bf-calc-row" style="border-bottom:none"><span style="color:var(--yellow)">− Vendor Bills (30 days)</span><span class="bf-calc-val" style="color:var(--yellow)">− ${bf_$$(net.posDue)}</span></div>
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

/* ============================================================
   TEAM CALENDAR
   ============================================================ */

// The calendar draws from the same team table as the task board, so a
// person added once appears in both.
function teamCalendarMembers() {
  return activeMembers().map(m => ({
    key:      m.member_key,
    name:     m.name,
    color:    m.color || '#f2f4f9',
    initials: m.initials || m.name[0].toUpperCase()
  }));
}

const ABSENCE_TYPES = [
  { key: 'vacation', label: 'Vacation',      color: '#0d9488' },
  { key: 'ooo',      label: 'Out of Office', color: '#ea580c' },
  { key: 'slow',     label: 'Slow Response', color: '#ca8a04' },
  { key: 'remote',   label: 'Remote',        color: '#7c3aed' },
  { key: 'sick',     label: 'Sick Day',      color: '#dc2626' },
];

function tcAddDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function tcWeekStart(dateStr) {
  const d = new Date((dateStr || new Date().toISOString().split('T')[0]) + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

function tcFmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return mo[d.getMonth()] + ' ' + d.getDate();
}

async function loadTeamCalendar() {
  if (!state.tcStart) state.tcStart = tcWeekStart();
  const end = tcAddDays(state.tcStart, 6);
  try {
    state.teamCalendar = await fetchAPI(API.teamCalendar + '?start=' + state.tcStart + '&end=' + end);
  } catch (e) {
    state.teamCalendar = [];
  }
}

function tcNavigate(n) {
  state.tcStart = tcAddDays(state.tcStart || tcWeekStart(), n * 7);
  loadTeamCalendar().then(() => renderTeamCalendarPage());
}

async function renderTeamCalendarPage() {
  if (!state.tcStart) state.tcStart = tcWeekStart();
  await loadTeamCalendar();

  const start = state.tcStart;
  const today = new Date().toISOString().split('T')[0];
  const days  = [];
  for (let i = 0; i < 7; i++) days.push(tcAddDays(start, i));
  const end = days[6];

  const DOW      = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const outToday = state.teamCalendar.filter(a => a.start_date <= today && a.end_date >= today);

  // Calendar rows are keyed by member_key now, which is the same value
  // tasks.assignee stores — so no translation table is needed. The founder
  // additionally sees the shared "For Founder" queue on their row.
  const assigneesFor = key => key === 'founder' ? [key, 'for-founder'] : [key];

  function dayCell(member, d) {
    const isToday  = d === today;
    const dow      = new Date(d + 'T12:00:00').getDay();
    const isWk     = dow === 0 || dow === 6;
    const entry    = state.teamCalendar.find(a =>
      a.member_key === member.key && a.start_date <= d && a.end_date >= d
    );

    // Tasks with a deadline on this day for this member
    const dayTasks = (state.tasks || []).filter(t =>
      !t.completed && !t.archived && t.deadline === d &&
      assigneesFor(member.key).includes(t.assignee)
    );
    const hasTasks = dayTasks.length > 0;

    const classes = [
      'tc-day-cell',
      isToday  ? 'tc-today-col'  : '',
      isWk     ? 'tc-weekend-col': '',
      entry    ? 'tc-has-event'  : 'tc-empty-cell',
      hasTasks ? 'tc-has-tasks'  : ''
    ].filter(Boolean).join(' ');

    const taskChipsHtml = hasTasks
      ? '<div class="tc-task-chips">' +
          dayTasks.slice(0, 3).map(t =>
            '<div class="tc-task-chip" title="' + esc(t.title) + '">' +
              '<span class="tc-task-dot"></span>' + esc(t.title) +
            '</div>'
          ).join('') +
          (dayTasks.length > 3 ? '<div class="tc-task-more">+' + (dayTasks.length - 3) + ' more</div>' : '') +
        '</div>'
      : '';

    if (!entry) {
      return '<div class="' + classes + '" onclick="tcOpenDrawer(\'' + member.key + '\',\'' + d + '\',null)" title="Mark as out on ' + d + '">' +
        taskChipsHtml +
      '</div>';
    }

    const at        = ABSENCE_TYPES.find(t => t.key === entry.absence_type) || ABSENCE_TYPES[0];
    const isStart   = entry.start_date === d;
    const isEnd     = entry.end_date   === d;
    const pos       = (isStart && isEnd) ? 'single' : isStart ? 'start' : isEnd ? 'end' : 'mid';
    const showLabel = isStart || (isStart && isEnd);

    return '<div class="' + classes + '" onclick="tcOpenDrawer(\'' + member.key + '\',\'' + d + '\',\'' + entry.id + '\')" title="' + esc(at.label) + ': ' + tcFmtDate(entry.start_date) + ' – ' + tcFmtDate(entry.end_date) + '">' +
      '<div class="tc-event-block tc-event-' + pos + '" style="--ec:' + at.color + '">' +
        (showLabel ? '<span class="tc-event-label">' + at.label + '</span>' : '') +
      '</div>' +
      taskChipsHtml +
    '</div>';
  }

  const bannerHtml = outToday.length === 0
    ? '<span class="tc-banner-dot tc-dot-green"></span><span class="tc-banner-text">Everyone\'s available today</span>'
    : outToday.map(function(a) {
        const m  = teamCalendarMembers().find(t => t.key === a.member_key);
        const at = ABSENCE_TYPES.find(t => t.key === a.absence_type);
        return '<div class="tc-banner-chip">' +
          '<div class="tc-chip-avatar" style="background:' + (m ? m.color : '#444') + '">' + (m ? m.initials : '?') + '</div>' +
          '<div>' +
            '<div class="tc-chip-name">' + (m ? m.name : a.member_key) + '</div>' +
            '<div class="tc-chip-type" style="color:' + (at ? at.color : '#888') + '">' + (at ? at.label : a.absence_type) + ' · until ' + tcFmtDate(a.end_date) + '</div>' +
          '</div>' +
        '</div>';
      }).join('');

  const colHeaders = days.map(function(d) {
    const isToday = d === today;
    const dow     = new Date(d + 'T12:00:00').getDay();
    const isWk    = dow === 0 || dow === 6;
    const num     = new Date(d + 'T12:00:00').getDate();
    return '<div class="tc-col-head' + (isWk ? ' tc-col-weekend' : '') + '">' +
      '<span class="tc-dow">' + DOW[dow] + '</span>' +
      '<span class="tc-date-num' + (isToday ? ' tc-date-today' : '') + '">' + num + '</span>' +
    '</div>';
  }).join('');

  const memberRows = teamCalendarMembers().map(function(member) {
    return '<div class="tc-member-row">' +
      '<div class="tc-name-col">' +
        '<div class="tc-avatar" style="background:' + member.color + '">' + member.initials + '</div>' +
        '<span class="tc-member-name">' + member.name + '</span>' +
      '</div>' +
      days.map(d => dayCell(member, d)).join('') +
    '</div>';
  }).join('');

  document.getElementById('page-content').innerHTML =
    '<div class="tc-page">' +

      '<div class="tc-header">' +
        '<div>' +
          '<h1 class="page-title" style="margin-bottom:3px">Team Calendar</h1>' +
          '<p class="tc-subtitle">Track who\'s out, on vacation, or unavailable</p>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="tc-nav-controls">' +
            '<button class="tc-nav-btn" onclick="tcNavigate(-1)">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>' +
            '</button>' +
            '<span class="tc-nav-label">' + tcFmtDate(start) + ' – ' + tcFmtDate(end) + '</span>' +
            '<button class="tc-nav-btn" onclick="tcNavigate(1)">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>' +
            '</button>' +
          '</div>' +
          '<button class="btn btn-secondary btn-sm" onclick="tcOpenDrawer(null,null,null)">+ Add</button>' +
        '</div>' +
      '</div>' +

      '<div class="tc-banner">' + bannerHtml + '</div>' +

      '<div class="tc-grid-wrap">' +
        '<div class="tc-col-row">' +
          '<div class="tc-name-stub"></div>' +
          colHeaders +
        '</div>' +
        memberRows +
      '</div>' +

    '</div>';
}

/* ── Team Calendar Drawer ─────────────────────────────────── */

let tcSelMember = null, tcSelType = null;

function tcOpenDrawer(memberKey, dateStr, existingId) {
  const entry    = existingId ? state.teamCalendar.find(a => a.id === existingId) : null;
  tcSelMember    = entry ? entry.member_key    : (memberKey || (teamCalendarMembers()[0] || {}).key);
  tcSelType      = entry ? entry.absence_type  : 'vacation';
  const curStart = entry ? entry.start_date    : (dateStr || '');
  const curEnd   = entry ? entry.end_date      : (dateStr || '');

  document.getElementById('detail-drawer-title').textContent = entry ? 'Edit Absence' : 'Mark as Out';

  document.getElementById('detail-drawer-body').innerHTML =
    '<div class="cc-drawer">' +

      '<div class="cc-form-row">' +
        '<label class="cc-label">Team Member</label>' +
        '<div class="cc-type-pills">' +
          teamCalendarMembers().map(function(m) {
            return '<button class="cc-type-pill' + (tcSelMember === m.key ? ' cc-type-active' : '') + '" ' +
              'data-tc-field="member" data-tc-val="' + m.key + '" ' +
              'onclick="tcPickField(this,\'member\')">' +
              '<span style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:' + m.color + ';align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;margin-right:5px">' + m.initials + '</span>' +
              m.name +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="cc-form-row">' +
        '<label class="cc-label">Type</label>' +
        '<div class="cc-type-pills" style="flex-wrap:wrap;gap:6px">' +
          ABSENCE_TYPES.map(function(t) {
            return '<button class="cc-type-pill' + (tcSelType === t.key ? ' cc-type-active' : '') + '" ' +
              'data-tc-field="type" data-tc-val="' + t.key + '" ' +
              'onclick="tcPickField(this,\'type\')">' +
              '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + t.color + ';margin-right:5px;flex-shrink:0"></span>' +
              t.label +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="cc-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div>' +
          '<label class="cc-label">From</label>' +
          '<input type="date" class="dp-input" id="tc-start" value="' + curStart + '">' +
        '</div>' +
        '<div>' +
          '<label class="cc-label">Until <span style="opacity:0.45;font-weight:400">(inclusive)</span></label>' +
          '<input type="date" class="dp-input" id="tc-end" value="' + curEnd + '">' +
        '</div>' +
      '</div>' +

      '<div class="cc-form-row">' +
        '<label class="cc-label">Notes <span style="opacity:0.45;font-weight:400">(optional)</span></label>' +
        '<textarea class="dp-input" id="tc-notes" rows="3" placeholder="e.g. no cell service, back Monday…" style="resize:vertical">' + esc(entry ? (entry.notes || '') : '') + '</textarea>' +
      '</div>' +

      '<div class="cc-drawer-actions" style="margin-top:16px">' +
        '<button class="btn btn-primary" onclick="tcSave(\'' + (existingId || '') + '\')">' + (entry ? 'Save Changes' : 'Add to Calendar') + '</button>' +
        (entry ? '<button class="btn btn-secondary" onclick="tcDelete(\'' + entry.id + '\')">Remove</button>' : '') +
      '</div>' +

    '</div>';

  document.getElementById('detail-panel').style.display = 'flex';
}

function tcPickField(btn, field) {
  const val   = btn.dataset.tcVal;
  const group = btn.closest('.cc-type-pills');
  group.querySelectorAll('.cc-type-pill').forEach(b => b.classList.remove('cc-type-active'));
  btn.classList.add('cc-type-active');
  if (field === 'member') tcSelMember = val;
  else                    tcSelType   = val;
}

async function tcSave(existingId) {
  const member_key   = tcSelMember || (teamCalendarMembers()[0] || {}).key;
  const absence_type = tcSelType   || 'vacation';
  const start_date   = (document.getElementById('tc-start') || {}).value;
  const end_date     = (document.getElementById('tc-end')   || {}).value;
  const notes        = ((document.getElementById('tc-notes') || {}).value || '').trim();

  if (!start_date || !end_date) return showToast('Set start and end dates', 'error');
  if (end_date < start_date)    return showToast('End date must be on or after start', 'error');

  const payload = { member_key, absence_type, start_date, end_date, notes: notes || null };

  try {
    if (existingId) {
      const updated = await fetchAPI(API.teamCalendar + '/' + existingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const idx = state.teamCalendar.findIndex(a => a.id === existingId);
      if (idx !== -1) state.teamCalendar[idx] = updated;
    } else {
      const created = await fetchAPI(API.teamCalendar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.teamCalendar.push(created);
    }
    closeDetailPanel();
    renderTeamCalendarPage();
    showToast('Saved ✓');
  } catch (e) {
    showToast((e && e.message) || 'Error saving', 'error');
  }
}

async function tcDelete(id) {
  if (!confirm('Remove this absence from the calendar?')) return;
  try {
    await fetchAPI(API.teamCalendar + '/' + id, { method: 'DELETE' });
    state.teamCalendar = state.teamCalendar.filter(a => a.id !== id);
    closeDetailPanel();
    renderTeamCalendarPage();
    showToast('Removed');
  } catch (e) {
    showToast((e && e.message) || 'Error', 'error');
  }
}

// ============================================================
// PRO PARTNER OUTREACH — IG DM lead tracker for licensed
// wax specialists / estheticians (Pro Partner Network funnel).
// Separate from the TikTok creator "Affiliate Outreach" pipeline.
// ============================================================

async function loadPartnerOutreach() {
  state.partnerLeads     = await fetchAPI(API.partnerOutreach);
  state.partnerTemplates = await fetchAPI(`${API.partnerOutreach}/templates`);
}

function renderPartnerOutreachPage() {
  if (state.partnerView === 'import')    return renderPartnerImportView();
  if (state.partnerView === 'templates') return renderPartnerTemplatesView();
  if (state.partnerView === 'stats')     return renderPartnerStatsView();
  renderPartnerPipelineView();
}

function partnerSubnav() {
  const tabs = [
    ['pipeline',  'Pipeline'],
    ['import',    'Import CSV'],
    ['templates', 'DM Templates'],
    ['stats',     'Stats']
  ];
  return `
    <div class="filter-bar" style="margin-bottom:16px">
      <div class="filter-tabs">
        ${tabs.map(([key, label]) => `
          <button class="filter-tab ${state.partnerView === key ? 'active' : ''}" onclick="setPartnerView('${key}')">${label}</button>
        `).join('')}
      </div>
    </div>`;
}

function setPartnerView(view) {
  state.partnerView = view;
  renderPartnerOutreachPage();
}

// ── Pipeline view ──────────────────────────────────────────────

function renderPartnerPipelineView() {
  const pipelineStatuses = PARTNER_STATUSES.filter(s => s.key !== 'archived');
  const counts = PARTNER_STATUSES.reduce((acc, s) => {
    acc[s.key] = state.partnerLeads.filter(l => l.status === s.key).length;
    return acc;
  }, {});
  const allCount = state.partnerLeads.filter(l => l.status !== 'archived').length;
  const contactedOrLater = state.partnerLeads.filter(l => l.status !== 'not_contacted' && l.status !== 'archived').length;
  const repliedOrLater   = state.partnerLeads.filter(l => ['replied','applied','accepted'].includes(l.status)).length;
  const applied          = state.partnerLeads.filter(l => ['applied','accepted'].includes(l.status)).length;

  const filtered = state.partnerFilter === 'all'
    ? state.partnerLeads.filter(l => l.status !== 'archived')
    : state.partnerLeads.filter(l => l.status === state.partnerFilter);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Pro Partner Outreach</h1>
        <p class="page-subtitle">Instagram DM outreach to licensed wax specialists &amp; estheticians for the Pro Partner Network</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" onclick="setPartnerView('import')">+ Import Leads</button>
        <button class="btn btn-primary" onclick="openAddPartnerLeadModal()">+ Add Lead</button>
      </div>
    </div>

    ${partnerSubnav()}

    <div class="stat-cards">
      <div class="stat-card stat-card-neutral">
        <div class="stat-value">${allCount}</div>
        <div class="stat-label">Total Leads</div>
      </div>
      <div class="stat-card stat-card-blue">
        <div class="stat-value blue">${contactedOrLater}</div>
        <div class="stat-label">Contacted</div>
      </div>
      <div class="stat-card stat-card-green">
        <div class="stat-value green">${repliedOrLater}</div>
        <div class="stat-label">Replied</div>
      </div>
      <div class="stat-card stat-card-green">
        <div class="stat-value green">${applied}</div>
        <div class="stat-label">Applied</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-tabs">
        <button class="filter-tab ${state.partnerFilter === 'all' ? 'active' : ''}" onclick="setPartnerFilter('all')">
          All <span class="filter-count">${allCount}</span>
        </button>
        ${pipelineStatuses.map(s => `
          <button class="filter-tab ${state.partnerFilter === s.key ? 'active' : ''}" onclick="setPartnerFilter('${s.key}')">
            ${s.label} <span class="filter-count">${counts[s.key] || 0}</span>
          </button>
        `).join('')}
        <button class="filter-tab filter-tab-archive ${state.partnerFilter === 'archived' ? 'active' : ''}" onclick="setPartnerFilter('archived')">
          Archived <span class="filter-count">${counts.archived || 0}</span>
        </button>
      </div>
    </div>

    <div class="table-container">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📬</div>
          <h3>${state.partnerFilter === 'all' ? 'No leads yet' : 'None in this stage'}</h3>
          <p>${state.partnerFilter === 'all' ? 'Add a lead or import a CSV to get started' : 'Try a different filter'}</p>
          ${state.partnerFilter === 'all' ? '<button class="btn btn-primary" onclick="openAddPartnerLeadModal()">+ Add Lead</button>' : ''}
        </div>
      ` : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Esthetician / Studio</th>
              <th>IG Handle</th>
              <th>Followers</th>
              <th>Template</th>
              <th>Status</th>
              <th>Follow-up Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.slice().sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0)).map(l => `
              <tr class="clickable-row ${state.selectedPartnerId === l.id ? 'row-active' : ''}" onclick="openPartnerDetailPanel('${l.id}')">
                <td>
                  <div class="creator-cell">
                    <div class="creator-name">${esc(l.esthetician_name || l.studio_name || l.ig_handle)}</div>
                    ${l.studio_name && l.esthetician_name ? `<div style="font-size:12px;color:var(--text-muted)">${esc(l.studio_name)}${l.city ? ' · ' + esc(l.city) : ''}</div>` : (l.city ? `<div style="font-size:12px;color:var(--text-muted)">${esc(l.city)}</div>` : '')}
                  </div>
                </td>
                <td>
                  <a class="ig-link" href="https://www.instagram.com/${esc((l.ig_handle||'').replace(/^@/,''))}/" target="_blank" rel="noopener" onclick="event.stopPropagation()">@${esc(l.ig_handle)}</a>
                </td>
                <td>${fmtNum(l.follower_count)}</td>
                <td>${esc((state.partnerTemplates.find(t => t.id === l.template_id) || {}).name) || '—'}</td>
                <td onclick="event.stopPropagation()">
                  <select class="inline-status-select status-key-${l.status}" onchange="updatePartnerStatusInline('${l.id}', this.value, this)">
                    ${PARTNER_STATUSES.map(s => `<option value="${s.key}"${l.status === s.key ? ' selected' : ''}>${s.label}</option>`).join('')}
                  </select>
                </td>
                <td>${l.status === 'contacted' && l.followup_due_date ? fmtDateShort(l.followup_due_date) : '—'}</td>
                <td onclick="event.stopPropagation()" style="display:flex;gap:6px;">
                  ${!['accepted','not_interested','archived'].includes(l.status) ? `<button class="btn btn-secondary btn-sm" onclick="copyPartnerDM('${l.id}')">${l.status === 'not_contacted' ? 'Copy DM' : 'Copy Follow-up'}</button>` : ''}
                  ${l.status !== 'archived' ? `<button class="btn btn-secondary btn-sm" title="Not a real/relevant lead" onclick="updatePartnerStatusInline('${l.id}','archived')">Archive</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>`;
}

// Fills a template's {{name}}/{{studio}}/{{detail}} placeholders with this lead's data
function fillPartnerTemplate(body, lead) {
  return (body || '')
    .replace(/\{\{\s*name\s*\}\}/gi, lead.esthetician_name || 'there')
    .replace(/\{\{\s*studio\s*\}\}/gi, lead.studio_name || 'your studio')
    .replace(/\{\{\s*detail\s*\}\}/gi, lead.found_detail || 'your work');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    return ok;
  }
}

// One click: fill the lead's DM, copy it, open their Instagram profile,
// and (on first contact) mark the lead as contacted with the follow-up date set.
async function copyPartnerDM(id) {
  const lead = state.partnerLeads.find(x => x.id === id);
  if (!lead) return;

  const tpl = state.partnerTemplates.find(t => t.id === lead.template_id && t.active)
    || state.partnerTemplates.find(t => t.active);
  if (!tpl) { showToast('Add an active DM template first', 'error'); return; }

  const message = fillPartnerTemplate(tpl.body, lead);
  const copied = await copyToClipboard(message);
  window.open(`https://www.instagram.com/${(lead.ig_handle || '').replace(/^@/, '')}/`, '_blank', 'noopener');

  if (lead.status === 'not_contacted') {
    try {
      const payload = { status: 'contacted' };
      if (!lead.template_id) payload.template_id = tpl.id;
      const rec = await fetchAPI(`${API.partnerOutreach}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const i = state.partnerLeads.findIndex(x => x.id === id);
      if (i !== -1) state.partnerLeads[i] = rec;
      renderPartnerPipelineView();
      if (state.selectedPartnerId === id) renderPartnerDetailPanel();
    } catch (err) {
      console.error('Failed to mark contacted after copying DM:', err.message);
    }
  }

  showToast(copied ? 'DM copied — paste it in Instagram' : 'Could not copy — check clipboard permissions', copied ? 'success' : 'error');
}

function setPartnerFilter(f) {
  state.partnerFilter = f;
  renderPartnerPipelineView();
}

async function updatePartnerStatusInline(id, newStatus, selectEl) {
  if (selectEl) selectEl.className = `inline-status-select status-key-${newStatus}`;
  try {
    const rec = await fetchAPI(`${API.partnerOutreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    const i = state.partnerLeads.findIndex(x => x.id === id);
    if (i !== -1) state.partnerLeads[i] = rec;
    if (newStatus === 'applied') showToast('🎉 Marked as applied!');
    renderPartnerPipelineView();
    if (state.selectedPartnerId === id) renderPartnerDetailPanel();
  } catch (err) {
    showToast(err.message, 'error');
    renderPartnerPipelineView();
  }
}

function openAddPartnerLeadModal() {
  const html = `
    <form id="modal-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Instagram Handle *</label>
          <input name="ig_handle" placeholder="@username" required>
        </div>
        <div class="form-group">
          <label>Follower Count</label>
          <input type="number" name="follower_count" placeholder="e.g. 45000">
        </div>
        <div class="form-group">
          <label>Esthetician Name</label>
          <input name="esthetician_name" placeholder="e.g. Amy">
        </div>
        <div class="form-group">
          <label>Studio Name</label>
          <input name="studio_name" placeholder="e.g. Glow Wax Studio">
        </div>
        <div class="form-group">
          <label>City</label>
          <input name="city" placeholder="e.g. Austin">
        </div>
        <div class="form-group">
          <label>Region / State</label>
          <input name="region" placeholder="e.g. TX">
        </div>
        <div class="form-group">
          <label>Found via (hashtag/geotag)</label>
          <input name="source_tag" placeholder="e.g. #austinesthetician">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Specific detail noticed (for personalization)</label>
          <input name="found_detail" placeholder="e.g. saw your ingrown-care Reel">
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Lead</button>
      </div>
    </form>`;

  openModal('Add Pro Partner Lead', html, async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(API.partnerOutreach, { method: 'POST', body: JSON.stringify(data) });
      state.partnerLeads.unshift(rec);
      closeModal();
      renderPartnerPipelineView();
      showToast('Lead added!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function deletePartnerLead(id) {
  if (!confirm('Delete this lead?')) return;
  try {
    await fetchAPI(`${API.partnerOutreach}/${id}`, { method: 'DELETE' });
    state.partnerLeads = state.partnerLeads.filter(l => l.id !== id);
    closeDetailPanel();
    renderPartnerPipelineView();
    showToast('Lead deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Detail panel (reuses the shared #detail-panel drawer) ───────

function openPartnerDetailPanel(id) {
  state.selectedPartnerId = id;
  const panel = document.getElementById('detail-panel');
  panel.style.display = 'flex';
  renderPartnerDetailPanel();
}

function renderPartnerDetailPanel() {
  const l = state.partnerLeads.find(x => x.id === state.selectedPartnerId);
  if (!l) { closeDetailPanel(); return; }

  document.getElementById('detail-drawer-title').textContent = 'Pro Partner Lead';
  document.getElementById('detail-drawer-body').innerHTML = `
    <div class="dp-creator-header">
      <div class="dp-header-top">
        <div class="dp-name">${esc(l.esthetician_name || l.studio_name || l.ig_handle)}</div>
        <select class="inline-status-select status-key-${l.status} dp-status-inline"
          onchange="updatePartnerStatusInline('${l.id}', this.value)">
          ${PARTNER_STATUSES.map(s => `<option value="${s.key}" ${l.status === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <a class="ig-link" href="https://www.instagram.com/${esc((l.ig_handle||'').replace(/^@/,''))}/" target="_blank" rel="noopener">@${esc(l.ig_handle)}</a>
    </div>

    <div class="dp-section" style="padding:0">
      <div class="detail-row"><span class="detail-label">Followers</span><span class="detail-value">${fmtNum(l.follower_count)}</span></div>
      <div class="detail-row"><span class="detail-label">Studio</span><span class="detail-value">${esc(l.studio_name) || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">City</span><span class="detail-value">${esc(l.city) || '—'}${l.region ? ', ' + esc(l.region) : ''}</span></div>
      <div class="detail-row"><span class="detail-label">Source</span><span class="detail-value">${esc(l.source_tag) || '—'}</span></div>
      <div class="detail-row" style="border-bottom:none"><span class="detail-label">Detail noticed</span><span class="detail-value">${esc(l.found_detail) || '—'}</span></div>
    </div>

    <div class="dp-section">
      <div class="dp-section-label">Outreach</div>
      <div class="form-group">
        <label>DM Template</label>
        <select onchange="setPartnerLeadTemplate('${l.id}', this.value)">
          <option value="">— auto (first active) —</option>
          ${state.partnerTemplates.map(t => `<option value="${t.id}" ${l.template_id === t.id ? 'selected' : ''}>${esc(t.name)}${t.active ? '' : ' (inactive)'}</option>`).join('')}
        </select>
      </div>
      ${!['accepted','not_interested'].includes(l.status) ? `<button class="btn btn-primary btn-sm" onclick="copyPartnerDM('${l.id}')">${l.status === 'not_contacted' ? 'Copy DM' : 'Copy Follow-up'}</button>` : ''}
    </div>

    <div class="dp-section" style="padding-top:0;padding-bottom:0">
      <div class="detail-row"><span class="detail-label">Contacted</span><span class="detail-value">${fmtDate(l.contacted_date)}</span></div>
      <div class="detail-row"><span class="detail-label">Follow-up due</span><span class="detail-value">${fmtDate(l.followup_due_date)}</span></div>
      <div class="detail-row"><span class="detail-label">Replied</span><span class="detail-value">${fmtDate(l.replied_date)}</span></div>
      <div class="detail-row"><span class="detail-label">Applied</span><span class="detail-value">${fmtDate(l.applied_date)}</span></div>
      <div class="detail-row" style="border-bottom:none"><span class="detail-label">Accepted</span><span class="detail-value">${fmtDate(l.accepted_date)}</span></div>
    </div>

    <div class="dp-section">
      <div class="form-group">
        <label>Notes</label>
        <textarea id="partner-notes-input" rows="4" placeholder="Add notes...">${esc(l.notes) || ''}</textarea>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="savePartnerNotes('${l.id}')">Save Notes</button>
    </div>

    <div class="dp-section">
      <button class="btn btn-danger btn-sm" onclick="deletePartnerLead('${l.id}')">Delete Lead</button>
    </div>
  `;
}

async function savePartnerNotes(id) {
  const notes = document.getElementById('partner-notes-input').value;
  try {
    const rec = await fetchAPI(`${API.partnerOutreach}/${id}`, { method: 'PUT', body: JSON.stringify({ notes }) });
    const i = state.partnerLeads.findIndex(x => x.id === id);
    if (i !== -1) state.partnerLeads[i] = rec;
    showToast('Notes saved');
  } catch (err) { showToast(err.message, 'error'); }
}

async function setPartnerLeadTemplate(id, templateId) {
  try {
    const rec = await fetchAPI(`${API.partnerOutreach}/${id}`, { method: 'PUT', body: JSON.stringify({ template_id: templateId || null }) });
    const i = state.partnerLeads.findIndex(x => x.id === id);
    if (i !== -1) state.partnerLeads[i] = rec;
    renderPartnerPipelineView();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Import view: paste list (primary) + CSV upload ─────────────

function renderPartnerImportView() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Import Leads</h1>
        <p class="page-subtitle">Fastest: paste what you found on Instagram. One lead per line.</p>
      </div>
    </div>
    ${partnerSubnav()}

    <div class="nb-step" style="margin-bottom:16px">
      <div class="nb-step-header">
        <span class="nb-step-num">1</span>
        <span class="nb-step-title">PASTE A LIST</span>
      </div>
      <div class="csv-columns-hint" style="margin-bottom:10px">
        One lead per line, in whatever order you jotted it down. Handle is required — everything else is a bonus:<br>
        <code>@handle - studio - city</code> &nbsp;or&nbsp; <code>@handle, studio, city</code> &nbsp;or just <code>@handle</code>
      </div>
      <textarea id="partner-paste-textarea" rows="8" placeholder="@amywaxes - Glow Wax Studio - Austin&#10;@brazilianbybri&#10;@waxqueen_dallas, Smooth Studio, Dallas"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-primary" onclick="handlePartnerPasteImport()">Add Leads</button>
      </div>
      <div id="partner-paste-result"></div>
    </div>

    <div class="nb-step">
      <div class="nb-step-header">
        <span class="nb-step-num">2</span>
        <span class="nb-step-title">OR UPLOAD A CSV</span>
      </div>
      <div class="csv-columns-hint" style="margin-bottom:10px">
        Supported columns:<br>
        <code>ig_handle</code> <code>esthetician_name</code> <code>studio_name</code>
        <code>city</code> <code>region</code> <code>follower_count</code> <code>source_tag</code> <code>found_detail</code> <code>profile_url</code>
      </div>
      <div class="dropzone" id="partner-dropzone" onclick="document.getElementById('partner-file-input').click()">
        <div class="dropzone-icon">📂</div>
        <div class="dropzone-label">Click to upload CSV</div>
        <div class="dropzone-sub">Max 500 leads per import</div>
      </div>
      <input type="file" id="partner-file-input" accept=".csv" style="display:none" onchange="handlePartnerCsvUpload(event)">
      <div id="partner-import-result"></div>
    </div>
  `;
}

// Parses freeform pasted lines into lead objects. Only the handle is required —
// studio/city are best-effort guesses from whatever follows common delimiters.
function parsePartnerPasteLines(text) {
  return (text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const handleMatch = line.match(/@?([A-Za-z0-9._]{2,30})/);
      if (!handleMatch) return null;
      const ig_handle = handleMatch[1];
      const rest = line.slice(line.indexOf(handleMatch[0]) + handleMatch[0].length)
        .replace(/^[\s\-–—,|]+/, '')
        .trim();
      const parts = rest.split(/\s*[-–—,|]\s*/).filter(Boolean);
      return {
        ig_handle,
        studio_name: parts[0] || null,
        city: parts[1] || null,
        notes: parts.length > 2 ? parts.slice(2).join(', ') : null
      };
    })
    .filter(Boolean);
}

async function handlePartnerPasteImport() {
  const text = document.getElementById('partner-paste-textarea').value;
  const leads = parsePartnerPasteLines(text);
  if (leads.length === 0) { showToast('No handles found — paste one per line', 'error'); return; }
  try {
    const result = await fetchAPI(`${API.partnerOutreach}/bulk`, { method: 'POST', body: JSON.stringify({ leads }) });
    await loadPartnerOutreach();
    document.getElementById('partner-paste-result').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>${result.imported} leads added</h3>
        <p>${result.skipped ? `${result.skipped} lines skipped (no handle found)` : ''}</p>
        <button class="btn btn-primary" onclick="setPartnerView('pipeline')">View Pipeline</button>
      </div>`;
    showToast(`${result.imported} leads added!`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handlePartnerCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('csv', file);
  try {
    const result = await fetchAPI(`${API.partnerOutreach}/import`, { method: 'POST', body: formData, headers: {} });
    await loadPartnerOutreach();
    document.getElementById('partner-import-result').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>${result.imported} leads imported</h3>
        <p>${result.skipped ? `${result.skipped} rows skipped (missing ig_handle)` : ''}</p>
        <button class="btn btn-primary" onclick="setPartnerView('pipeline')">View Pipeline</button>
      </div>`;
    showToast(`${result.imported} leads imported!`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── DM Templates view ─────────────────────────────────────────

function renderPartnerTemplatesView() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">DM Templates</h1>
        <p class="page-subtitle">Rotating message variants — swap-in {{name}}, {{studio}}, {{detail}} placeholders</p>
      </div>
      <button class="btn btn-primary" onclick="openAddPartnerTemplateModal()">+ New Template</button>
    </div>
    ${partnerSubnav()}
    <div class="table-container">
      ${state.partnerTemplates.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">✉️</div>
          <h3>No templates yet</h3>
          <p>Add 3-5 rotating variants so outreach doesn't read as copy-pasted</p>
          <button class="btn btn-primary" onclick="openAddPartnerTemplateModal()">+ New Template</button>
        </div>
      ` : state.partnerTemplates.map(t => `
        <div class="nb-step" style="margin-bottom:12px">
          <div class="nb-step-header">
            <span class="nb-step-title">${esc(t.name)}</span>
            <span class="badge badge-${t.active ? 'green' : 'gray'}">${t.active ? 'Active' : 'Inactive'}</span>
          </div>
          <p style="white-space:pre-wrap;font-size:13px;color:var(--text-secondary);margin:8px 0">${esc(t.body)}</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="editPartnerTemplate('${t.id}')">Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="togglePartnerTemplateActive('${t.id}', ${!t.active})">${t.active ? 'Deactivate' : 'Activate'}</button>
            <button class="btn btn-danger btn-sm" onclick="deletePartnerTemplate('${t.id}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function partnerTemplateFormHtml(t) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Name *</label>
        <input name="name" placeholder="e.g. Variant A - direct invite" value="${esc(t?.name) || ''}" required>
      </div>
      <div class="form-group">
        <label>Message *</label>
        <textarea name="body" rows="6" placeholder="Hey {{name}}! Saw {{detail}} at {{studio}}..." required>${esc(t?.body) || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${t ? 'Save' : 'Add Template'}</button>
      </div>
    </form>`;
}

function openAddPartnerTemplateModal() {
  openModal('New DM Template', partnerTemplateFormHtml(), async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(`${API.partnerOutreach}/templates`, { method: 'POST', body: JSON.stringify(data) });
      state.partnerTemplates.push(rec);
      closeModal();
      renderPartnerTemplatesView();
      showToast('Template added!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function editPartnerTemplate(id) {
  const t = state.partnerTemplates.find(x => x.id === id);
  if (!t) return;
  openModal('Edit DM Template', partnerTemplateFormHtml(t), async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(`${API.partnerOutreach}/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const i = state.partnerTemplates.findIndex(x => x.id === id);
      if (i !== -1) state.partnerTemplates[i] = rec;
      closeModal();
      renderPartnerTemplatesView();
      showToast('Template saved!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function togglePartnerTemplateActive(id, active) {
  try {
    const rec = await fetchAPI(`${API.partnerOutreach}/templates/${id}`, { method: 'PUT', body: JSON.stringify({ active }) });
    const i = state.partnerTemplates.findIndex(x => x.id === id);
    if (i !== -1) state.partnerTemplates[i] = rec;
    renderPartnerTemplatesView();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deletePartnerTemplate(id) {
  if (!confirm('Delete this template?')) return;
  try {
    await fetchAPI(`${API.partnerOutreach}/templates/${id}`, { method: 'DELETE' });
    state.partnerTemplates = state.partnerTemplates.filter(t => t.id !== id);
    renderPartnerTemplatesView();
    showToast('Template deleted');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Stats view ───────────────────────────────────────────────

async function renderPartnerStatsView() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Outreach Stats</h1>
        <p class="page-subtitle">Response and application rate by template and by city</p>
      </div>
    </div>
    ${partnerSubnav()}
    <div id="partner-stats-body"><div class="empty-state"><p>Loading...</p></div></div>`;

  try {
    const stats = await fetchAPI(`${API.partnerOutreach}/stats`);
    const pct = n => `${Math.round((n || 0) * 100)}%`;
    const rowsTable = (rows, labelKey) => `
      <table class="data-table">
        <thead><tr><th>${labelKey === 'template_name' ? 'Template' : 'City'}</th><th>Contacted</th><th>Replied</th><th>Applied</th><th>Response Rate</th><th>Application Rate</th></tr></thead>
        <tbody>
          ${rows.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No data yet</td></tr>` : rows.map(r => `
            <tr>
              <td>${esc(r[labelKey])}</td>
              <td>${r.contacted}</td>
              <td>${r.replied}</td>
              <td>${r.applied}</td>
              <td>${pct(r.response_rate)}</td>
              <td>${pct(r.application_rate)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    document.getElementById('partner-stats-body').innerHTML = `
      <div class="stat-cards">
        <div class="stat-card stat-card-neutral"><div class="stat-value">${stats.overall.contacted}</div><div class="stat-label">Contacted</div></div>
        <div class="stat-card stat-card-blue"><div class="stat-value blue">${stats.overall.replied}</div><div class="stat-label">Replied</div></div>
        <div class="stat-card stat-card-green"><div class="stat-value green">${stats.overall.applied}</div><div class="stat-label">Applied</div></div>
        <div class="stat-card stat-card-green"><div class="stat-value green">${stats.overall.accepted}</div><div class="stat-label">Accepted</div></div>
      </div>
      <h3 style="margin:20px 0 8px">By Template</h3>
      <div class="table-container">${rowsTable(stats.byTemplate, 'template_name')}</div>
      <h3 style="margin:20px 0 8px">By City</h3>
      <div class="table-container">${rowsTable(stats.byCity, 'city')}</div>
    `;
  } catch (err) {
    document.getElementById('partner-stats-body').innerHTML = `<div class="empty-state"><p>${esc(err.message)}</p></div>`;
  }
}
