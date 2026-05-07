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
  { key: 'drafted',        label: 'Drafted',    color: 'gray'   },
  { key: 'sent',           label: 'Sent',       color: 'blue'   },
  { key: 'replied',        label: 'Replied',    color: 'yellow' },
  { key: 'evaluating',     label: 'Evaluating', color: 'purple' },
  { key: 'counter_offered',label: 'Countered',  color: 'orange' },
  { key: 'signed',         label: 'Signed',     color: 'green'  },
  { key: 'archived',       label: 'Archived',   color: 'gray'   }
];

const state = {
  currentPage:        'outreach',
  outreach:           [],
  roster:             [],
  outreachFilter:     'all',
  outreachView:       'pipeline',  // 'pipeline' | 'new-batch'
  selectedOutreachId: null,
  selectedIds:        new Set()
};

const nbState = {
  emails:         [],
  selectedFile:   null,
  gmailConnected: false,
  connectedEmail: null,
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
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
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtGMV(val) {
  if (!val) return '—';
  const n = Number(val);
  if (isNaN(n) || n === 0) return '—';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function gradeBadge(tier) {
  if (!tier) return '—';
  return `<span class="grade-badge grade-badge-${tier}">${tier}</span>`;
}

function rosterStatusBadge(status) {
  const map = { active: 'green', inactive: 'gray', paused: 'yellow' };
  return `<span class="badge badge-${map[status] || 'gray'}">${esc(status)}</span>`;
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

function getSuggestedTier(r) {
  if (r.on_camera === 'no') return 'C';
  if (r.viral_potential === 'yes' && r.feels_natural === 'natural') return 'A';
  if (r.viral_potential === 'no') return 'C';
  return 'B';
}

function tierRange(tier) {
  return { A: '$150–$250', B: '$75–$130', C: 'low cost / skip' }[tier] || '';
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
  const renderers = {
    outreach: renderOutreachPage,
    roster:   renderRosterPage,
    scripts:  renderScriptsPage
  };
  if (renderers[page]) renderers[page]();
}

// ============================================================
// OUTREACH — DATA
// ============================================================

async function loadOutreach() {
  state.outreach = await fetchAPI(API.outreach);
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

  const filtered = state.outreachFilter === 'all'
    ? state.outreach.filter(r => r.status !== 'archived')
    : state.outreachFilter === 'archived'
    ? state.outreach.filter(r => r.status === 'archived')
    : state.outreach.filter(r => r.status === state.outreachFilter);

  const inPipeline = ['sent','replied','evaluating','counter_offered']
    .reduce((s, k) => s + (counts[k] || 0), 0);

  const anySelected = state.selectedIds.size > 0;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Outreach</h1>
        <p class="page-subtitle">Track creator pipeline from first email to signed deal</p>
      </div>
      <button class="btn btn-primary" onclick="openNewBatch()">+ New Batch</button>
    </div>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">${allCount}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value accent">${inPipeline}</div>
        <div class="stat-label">In Pipeline</div>
      </div>
      <div class="stat-card">
        <div class="stat-value green">${counts.signed || 0}</div>
        <div class="stat-label">Signed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value muted">${counts.archived || 0}</div>
        <div class="stat-label">Archived</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-tabs">
        <button class="filter-tab ${state.outreachFilter === 'all' ? 'active' : ''}" onclick="setOutreachFilter('all')">
          All <span class="filter-count">${allCount}</span>
        </button>
        ${pipelineStatuses.map(s => `
          <button class="filter-tab ${state.outreachFilter === s.key ? 'active' : ''}" onclick="setOutreachFilter('${s.key}')">
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
                  onchange="toggleSelectAll(this.checked, ${JSON.stringify(filtered.map(r => r.id))})">
              </th>
              <th>Creator</th>
              <th>Category</th>
              <th>GMV (30d)</th>
              <th>Followers</th>
              <th>Engagement</th>
              <th>Grade</th>
              <th>Status</th>
              <th>Added</th>
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
                <td class="category-cell">${esc((r.product_category || '').split(',')[0].trim()) || '—'}</td>
                <td>${fmtGMV(r.last_30d_gmv)}</td>
                <td>${fmtNum(r.follower_count)}</td>
                <td>${esc(r.avg_engagement || '—')}</td>
                <td>${gradeBadge(r.tier)}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${fmtDate(r.created_at)}</td>
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

function closeDetailPanel() {
  state.selectedOutreachId = null;
  document.getElementById('detail-panel').style.display = 'none';
  document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('row-active'));
}

function renderDetailPanel() {
  const r = state.outreach.find(x => x.id === state.selectedOutreachId);
  if (!r) { closeDetailPanel(); return; }

  document.getElementById('detail-drawer-title').textContent = 'Creator Detail';

  const hasReplied = ['replied','evaluating','counter_offered','signed','ghosted'].includes(r.status);
  const suggested  = (r.on_camera && r.feels_natural && r.viral_potential) ? getSuggestedTier(r) : null;

  document.getElementById('detail-drawer-body').innerHTML = `

    <!-- Creator header -->
    <div class="dp-creator-header">
      <div class="dp-name">${esc(r.name || r.handle)}</div>
      <div class="dp-handle-row">
        ${r.profile_url
          ? `<a class="dp-profile-link" href="${esc(r.profile_url)}" target="_blank">@${esc(r.handle)} ↗</a>`
          : `<span class="dp-handle-plain">@${esc(r.handle)}</span>`
        }
      </div>
      <div class="dp-chips">
        ${r.follower_count ? `<span class="dp-chip">${fmtNum(r.follower_count)} followers</span>` : ''}
        ${r.last_30d_gmv   ? `<span class="dp-chip">${fmtGMV(r.last_30d_gmv)} GMV</span>` : ''}
        ${r.avg_engagement ? `<span class="dp-chip">${esc(r.avg_engagement)} eng</span>` : ''}
        ${r.email ? `<span class="dp-chip dp-chip-email">${esc(r.email)}</span>` : ''}
      </div>
      ${r.product_category ? `<div class="dp-category">${esc(r.product_category)}</div>` : ''}
    </div>

    <!-- Status -->
    <div class="dp-section">
      <div class="dp-section-label">Status</div>
      <div class="dp-status-row">
        ${statusBadge(r.status)}
        <select class="dp-status-select" onchange="updateOutreachField('${r.id}', 'status', this.value)">
          ${STATUSES.map(s => `<option value="${s.key}" ${r.status === s.key ? 'selected':''}>${s.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Outreach email -->
    ${r.generated_email ? `
    <div class="dp-section">
      <div class="dp-section-label">Outreach Email</div>
      <div class="dp-email-meta">From: ${esc(r.sender || '—')} &nbsp;&middot;&nbsp; Subject: paid opportunity with The Bikini Line Co</div>
      <div class="dp-email-body" id="dp-email-body">${esc(r.generated_email)}</div>
      <button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('dp-email-body').innerText)">Copy</button>
    </div>
    ` : ''}

    <!-- Evaluation (shown from "replied" onward) -->
    ${hasReplied ? `
    <div class="dp-section">
      <div class="dp-section-label">Their Rate</div>
      <div class="dp-form-group">
        <label>Asked rate per video ($)</label>
        <input type="number" class="dp-input" id="dp-asked-rate"
          value="${r.asked_rate || ''}" placeholder="e.g. 500"
          onblur="updateOutreachField('${r.id}', 'asked_rate', this.value)">
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-label">Creator Evaluation</div>

      <div class="dp-rubric">
        <div class="dp-rubric-step">
          <div class="dp-rubric-question">Can she talk on camera?</div>
          <div class="dp-rubric-options">
            <button class="dp-opt-btn ${r.on_camera === 'yes' ? 'active':''}"
              onclick="setEvalField('${r.id}', 'on_camera', 'yes')">Yes</button>
            <button class="dp-opt-btn ${r.on_camera === 'no' ? 'active':''}"
              onclick="setEvalField('${r.id}', 'on_camera', 'no')">No</button>
          </div>
        </div>

        <div class="dp-rubric-step">
          <div class="dp-rubric-question">Does she feel natural on camera?</div>
          <div class="dp-rubric-options">
            <button class="dp-opt-btn ${r.feels_natural === 'natural' ? 'active':''}"
              onclick="setEvalField('${r.id}', 'feels_natural', 'natural')">Natural</button>
            <button class="dp-opt-btn ${r.feels_natural === 'forced' ? 'active':''}"
              onclick="setEvalField('${r.id}', 'feels_natural', 'forced')">Forced</button>
          </div>
        </div>

        <div class="dp-rubric-step">
          <div class="dp-rubric-question">Can you imagine her going viral?</div>
          <div class="dp-rubric-options">
            <button class="dp-opt-btn ${r.viral_potential === 'yes' ? 'active':''}"
              onclick="setEvalField('${r.id}', 'viral_potential', 'yes')">Yes</button>
            <button class="dp-opt-btn ${r.viral_potential === 'maybe' ? 'active':''}"
              onclick="setEvalField('${r.id}', 'viral_potential', 'maybe')">Maybe</button>
            <button class="dp-opt-btn ${r.viral_potential === 'no' ? 'active':''}"
              onclick="setEvalField('${r.id}', 'viral_potential', 'no')">No</button>
          </div>
        </div>
      </div>

      ${suggested ? `
      <div class="dp-tier-suggestion">
        <span class="dp-tier-suggestion-label">Suggested:</span>
        ${gradeBadge(suggested)}
        <span style="font-size:12px;color:var(--text-muted)">${tierRange(suggested)}</span>
      </div>
      ` : ''}

      <div class="dp-section-label" style="margin-bottom:8px">Assign Grade</div>
      <div class="dp-grade-options">
        ${['A','B','C'].map(t => `
          <button class="dp-grade-btn grade-${t} ${r.tier === t ? 'active':''}"
            onclick="setEvalField('${r.id}', 'tier', '${t}')">
            ${t}
            <span class="dp-grade-range">${tierRange(t)}</span>
          </button>
        `).join('')}
      </div>

      <div class="dp-form-group" style="margin-top:14px">
        <label>Notes</label>
        <textarea class="dp-input dp-textarea" id="dp-notes"
          placeholder="Anything worth noting..."
          onblur="updateOutreachField('${r.id}', 'evaluation_notes', this.value)">${esc(r.evaluation_notes || '')}</textarea>
      </div>
    </div>

    <!-- Counter offer -->
    ${r.tier ? `
    <div class="dp-section">
      <div class="dp-section-label">Counter Offer</div>
      <div class="dp-counter-rates">
        <div class="dp-form-group">
          <label>Their rate</label>
          <div class="dp-rate-display">${r.asked_rate ? fmt$(r.asked_rate) : '—'}</div>
        </div>
        <div class="dp-form-group">
          <label>Our offer ($)</label>
          <input type="number" class="dp-input" id="dp-counter-amount"
            value="${r.counter_offer_amount || ''}" placeholder="e.g. 200">
        </div>
      </div>
      <button class="btn btn-primary" id="dp-gen-counter-btn"
        onclick="generateCounterOffer('${r.id}')">
        Generate Counter Offer
      </button>

      ${r.counter_offer_email ? `
      <div class="dp-counter-preview">
        <div class="dp-section-label" style="margin-bottom:8px">Preview — copy and reply manually in Gmail thread</div>
        <div class="dp-email-body" id="dp-counter-email-body">${esc(r.counter_offer_email)}</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px"
          onclick="copyText(document.getElementById('dp-counter-email-body').innerText)">Copy</button>
      </div>
      ` : ''}
    </div>
    ` : ''}
    ` : ''}

    <!-- Signed: deal details & contract -->
    ${r.status === 'signed' ? `
    <div class="dp-section dp-signed-section">
      <div class="dp-section-label">Deal Details</div>
      <div class="dp-signed-grid">
        <div class="dp-form-group">
          <label>Rate per video ($)</label>
          <input type="number" class="dp-input" id="dp-final-rate"
            value="${r.counter_offer_amount || r.asked_rate || ''}"
            placeholder="e.g. 150"
            onblur="updateOutreachField('${r.id}', 'counter_offer_amount', this.value)">
        </div>
        <div class="dp-form-group">
          <label>Number of videos</label>
          <input type="number" class="dp-input" id="dp-video-count"
            value="${r.video_count || ''}"
            placeholder="e.g. 4"
            onblur="updateOutreachField('${r.id}', 'video_count', this.value)">
        </div>
      </div>
      <div class="dp-form-group">
        <label>Start date</label>
        <input type="date" class="dp-input" id="dp-start-date"
          value="${r.start_date ? r.start_date.split('T')[0] : ''}"
          onblur="updateOutreachField('${r.id}', 'start_date', this.value)">
      </div>
      ${(r.counter_offer_amount || r.asked_rate) && r.video_count ? `
      <div class="dp-deal-summary">
        <span>Total: <strong>${fmt$(parseFloat(r.counter_offer_amount || r.asked_rate) * parseInt(r.video_count))}</strong></span>
        <span class="dp-deal-half">50% upfront: ${fmt$(parseFloat(r.counter_offer_amount || r.asked_rate) * parseInt(r.video_count) / 2)}</span>
      </div>
      ` : ''}
      <button class="btn btn-primary" style="margin-top:12px;width:100%;justify-content:center"
        id="dp-contract-btn"
        onclick="generateContractAndMoveToRoster('${r.id}')">
        Generate Contract + Move to Roster
      </button>
    </div>
    ` : ''}

    <!-- Delete -->
    <div class="dp-delete-zone">
      <button class="btn btn-danger btn-sm" onclick="deleteOutreach('${r.id}')">Delete Record</button>
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
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function setEvalField(id, field, value) {
  await updateOutreachField(id, field, value);
}

async function generateCounterOffer(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;

  const amountEl = document.getElementById('dp-counter-amount');
  const amount = amountEl?.value;
  if (!amount) { showToast('Enter our offer amount first', 'error'); return; }

  const btn = document.getElementById('dp-gen-counter-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

  // Save the amount first
  await updateOutreachField(id, 'counter_offer_amount', amount);

  try {
    const { email } = await fetchAPI(`${API.outreachGen}/counter-offer`, {
      method: 'POST',
      body: JSON.stringify({
        name:               r.name,
        handle:             r.handle,
        askedRate:          r.asked_rate,
        counterOfferAmount: amount,
        tier:               r.tier,
        sender:             r.sender || 'Tamar'
      })
    });

    await updateOutreachField(id, 'counter_offer_email', email);
    showToast('Counter offer generated');
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Counter Offer'; }
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

function toggleSelectAll(checked, ids) {
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

  const rateEl  = document.getElementById('dp-final-rate');
  const countEl = document.getElementById('dp-video-count');
  const dateEl  = document.getElementById('dp-start-date');

  const rate       = parseFloat(rateEl?.value || r.counter_offer_amount || r.asked_rate);
  const videoCount = parseInt(countEl?.value || r.video_count);
  const startDate  = dateEl?.value || (r.start_date ? r.start_date.split('T')[0] : '');

  if (!rate || isNaN(rate))            { showToast('Enter rate per video first', 'error'); return; }
  if (!videoCount || isNaN(videoCount)){ showToast('Enter number of videos first', 'error'); return; }
  if (!startDate)                       { showToast('Enter start date first', 'error'); return; }

  const btn = document.getElementById('dp-contract-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

  try {
    // Save deal details in one request
    const saved = await fetchAPI(`${API.outreach}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ counter_offer_amount: rate, video_count: videoCount, start_date: startDate })
    });
    const i = state.outreach.findIndex(x => x.id === id);
    if (i !== -1) state.outreach[i] = saved;

    // Generate contract PDF (streamed back as PDF)
    const res = await fetch(`${API.outreachGen}/create-contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorName:  r.name || r.handle,
        handle:       r.handle,
        creatorEmail: r.email || '',
        signedRate:   rate,
        videoCount:   videoCount,
        startDate:    startDate
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Contract generation failed');
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(r.name || r.handle).replace(/[^a-zA-Z0-9\s\-]/g, '')} - BLC Contract.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

    // Add to Roster
    await moveToRoster(r, rate, videoCount);
    showToast('Contract downloaded — creator moved to Roster!');
    renderDetailPanel();

  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Contract + Move to Roster'; }
  }
}

async function moveToRoster(r, rate, videoCount) {
  const rec = await fetchAPI(API.roster, {
    method: 'POST',
    body: JSON.stringify({
      handle:          r.handle,
      platform:        'TikTok',
      niche:           (r.product_category || '').split(',')[0].trim() || null,
      followers:       r.follower_count || null,
      email:           r.email || null,
      status:          'active',
      commission_rate: 0,
      notes:           `Signed ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Rate: $${rate}/video × ${videoCount} videos.`
    })
  });
  state.roster.unshift(rec);
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
            <div class="gmail-status disconnected" style="margin-bottom:10px">
              <div class="status-dot"></div>
              <span class="gmail-status-text">Gmail not connected</span>
            </div>
            <button class="btn btn-secondary btn-full btn-connect-gmail" onclick="connectGmail()" id="nb-connect-btn" style="margin-bottom:10px">Connect Gmail</button>
          ` : `
            <div class="gmail-status connected" style="margin-bottom:10px">
              <div class="status-dot"></div>
              <span class="gmail-status-text">${esc(nbState.connectedEmail || 'Gmail connected')}</span>
              <button class="btn btn-secondary btn-sm" onclick="disconnectGmail()" style="font-size:11px;padding:3px 8px;margin-left:auto">Disconnect</button>
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
    await addOneToPipeline(e);
    if (btn) { btn.disabled = true; btn.textContent = 'Saved ✓'; btn.classList.add('saved'); }
    nbState.savedCount = (nbState.savedCount || 0) + 1;
    showToast(`Draft saved & ${e.name || e.handle} added to pipeline`);
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
    const data = await fetchAPI(`${API.outreachGen}/auth/status`);
    const wasConnected = nbState.gmailConnected;
    nbState.gmailConnected = data.connected;
    nbState.connectedEmail = data.email || null;
    if (data.connected !== wasConnected && state.outreachView === 'new-batch') renderNewBatchView();
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
    return true;
  } catch (err) {
    console.error('Failed to add to pipeline:', e.handle, err.message);
    return false;
  }
}

async function nbSaveDrafts() {
  if (!nbState.gmailConnected) { showToast('Connect Gmail first', 'error'); return; }

  nbState.emails.forEach((e, i) => {
    const el = document.getElementById(`nb-email-text-${i}`);
    if (el) e.body = el.innerText;
  });

  const toSave = nbState.emails.filter(e => e.body && !e.error);
  if (toSave.length === 0) { showToast('No valid emails to save', 'error'); return; }

  const btn = document.getElementById('nb-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving drafts...'; }

  try {
    const res = await fetchAPI(`${API.outreachGen}/save-drafts`, {
      method: 'POST',
      body: JSON.stringify({ emails: toSave })
    });

    if (btn) { btn.textContent = 'Adding to pipeline...'; }
    let added = 0;
    for (const e of toSave) {
      const ok = await addOneToPipeline(e);
      if (ok) added++;
    }

    nbState.savedCount = (nbState.savedCount || 0) + res.saved;

    const outputEl = document.getElementById('nb-output');
    if (outputEl) {
      outputEl.innerHTML = `
        <div class="nb-success-banner">
          <div class="nb-success-icon">✅</div>
          <div class="nb-success-title">${res.saved} draft${res.saved !== 1 ? 's' : ''} saved &amp; ${added} added to pipeline</div>
          <div class="nb-success-body">Now go into Gmail and manually send each draft. Once you've sent them, come back here and move each creator from <strong>Drafted</strong> to <strong>Sent</strong> in your pipeline.</div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="btn btn-primary" onclick="backToPipeline()">Go to Pipeline</button>
            <button class="btn btn-secondary" onclick="clearBatch()">Start New Batch</button>
          </div>
        </div>`;
    }
    nbState.emails = [];
    renderNewBatchView();
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
}

// ============================================================
// ROSTER — RENDER
// ============================================================

function renderRosterPage() {
  const active     = state.roster.filter(r => r.status === 'active').length;
  const totalGMV   = state.roster.reduce((s, r) => s + (parseFloat(r.gmv) || 0), 0);
  const totalPosts = state.roster.reduce((s, r) => s + (parseInt(r.content_submitted) || 0), 0);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Roster</h1>
        <p class="page-subtitle">Active affiliate database — fully editable</p>
      </div>
      <button class="btn btn-primary" onclick="openAddRosterModal()">+ Add Affiliate</button>
    </div>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">${state.roster.length}</div>
        <div class="stat-label">Total Affiliates</div>
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
      ${state.roster.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No affiliates yet</h3>
          <p>Add your first affiliate to the roster</p>
          <button class="btn btn-primary" onclick="openAddRosterModal()">+ Add Affiliate</button>
        </div>
      ` : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Platform</th>
              <th>Niche</th>
              <th>Followers</th>
              <th>Posts</th>
              <th>GMV</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.roster.map(r => `
              <tr>
                <td>
                  <div class="creator-cell">
                    <span class="creator-handle">@${esc(r.handle)}</span>
                    ${r.email ? `<span class="creator-email">${esc(r.email)}</span>` : ''}
                  </div>
                </td>
                <td><span class="platform-tag">${platformIcon(r.platform)} ${esc(r.platform)}</span></td>
                <td>${esc(r.niche) || '—'}</td>
                <td>${fmtNum(r.followers)}</td>
                <td>${r.content_submitted || 0}</td>
                <td><span class="gmv-value">${fmt$(r.gmv)}</span></td>
                <td>${r.commission_rate ? r.commission_rate + '%' : '—'}</td>
                <td>${rosterStatusBadge(r.status)}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" onclick="openEditRosterModal('${r.id}')" title="Edit">✏️</button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteRoster('${r.id}')" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
              ${r.notes ? `
                <tr class="notes-row">
                  <td colspan="9"><div class="notes-content">💬 ${esc(r.notes)}</div></td>
                </tr>` : ''}
            `).join('')}
          </tbody>
        </table>
      `}
    </div>`;
}

// ============================================================
// ROSTER — CRUD
// ============================================================

function rosterFormHTML(r = {}) {
  const platforms = [['TikTok','TikTok'],['Instagram','Instagram'],['YouTube','YouTube'],['Pinterest','Pinterest']];
  const statuses  = [['active','Active'],['inactive','Inactive'],['paused','Paused']];
  return `
    <form id="modal-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Handle *</label>
          <input name="handle" value="${esc(r.handle || '')}" placeholder="username" required>
        </div>
        <div class="form-group">
          <label>Platform</label>
          <select name="platform">${selectOpts(platforms, r.platform || 'TikTok')}</select>
        </div>
        <div class="form-group">
          <label>Niche</label>
          <input name="niche" value="${esc(r.niche || '')}" placeholder="e.g. Skincare, Lifestyle">
        </div>
        <div class="form-group">
          <label>Followers</label>
          <input type="number" name="followers" value="${r.followers || ''}" placeholder="e.g. 50000">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${esc(r.email || '')}" placeholder="creator@email.com">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">${selectOpts(statuses, r.status || 'active')}</select>
        </div>
        <div class="form-group">
          <label>Posts Submitted</label>
          <input type="number" min="0" name="content_submitted" value="${r.content_submitted || 0}">
        </div>
        <div class="form-group">
          <label>GMV ($)</label>
          <input type="number" step="0.01" min="0" name="gmv" value="${r.gmv || 0}">
        </div>
        <div class="form-group form-group-full">
          <label>Commission Rate (%)</label>
          <input type="number" step="0.1" min="0" max="100" name="commission_rate" value="${r.commission_rate || 15}">
        </div>
        <div class="form-group form-group-full">
          <label>Content Style</label>
          <textarea name="content_style" placeholder="How they create — vibe, format, typical style...">${esc(r.content_style || '')}</textarea>
        </div>
        <div class="form-group form-group-full">
          <label>Audience Demographics</label>
          <textarea name="audience_demographics" placeholder="Age range, location, interests, skin concerns...">${esc(r.audience_demographics || '')}</textarea>
        </div>
        <div class="form-group form-group-full">
          <label>Notes</label>
          <textarea name="notes" placeholder="Additional notes...">${esc(r.notes || '')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${r.id ? 'Save Changes' : 'Add Affiliate'}</button>
      </div>
    </form>`;
}

function openAddRosterModal() {
  openModal('Add Affiliate to Roster', rosterFormHTML(), async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(API.roster, { method: 'POST', body: JSON.stringify(data) });
      state.roster.unshift(rec);
      closeModal(); renderRosterPage(); showToast('Affiliate added!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function openEditRosterModal(id) {
  const r = state.roster.find(x => x.id === id);
  if (!r) return;
  openModal('Edit Affiliate', rosterFormHTML(r), async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(`${API.roster}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const i = state.roster.findIndex(x => x.id === id);
      if (i !== -1) state.roster[i] = rec;
      closeModal(); renderRosterPage(); showToast('Affiliate updated!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function deleteRoster(id) {
  if (!confirm('Remove this affiliate from the roster? This cannot be undone.')) return;
  try {
    await fetchAPI(`${API.roster}/${id}`, { method: 'DELETE' });
    state.roster = state.roster.filter(r => r.id !== id);
    renderRosterPage(); showToast('Affiliate removed');
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// SCRIPT GENERATOR
// ============================================================

function renderScriptsPage() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Script Generator</h1>
        <p class="page-subtitle">Generate ready-to-film video scripts personalized to each creator</p>
      </div>
    </div>

    <div class="generator-layout">
      <div class="generator-form-panel">
        <div class="panel">
          <h3 class="panel-title">Script Settings</h3>
          <div class="form-group">
            <label>Select Creator *</label>
            <select id="script-creator" onchange="updatePreview('script')">
              <option value="">— Choose a creator —</option>
              ${state.roster.map(c =>
                `<option value="${c.id}">${platformIcon(c.platform)} @${esc(c.handle)}${c.niche ? ' · ' + esc(c.niche) : ''}</option>`
              ).join('')}
            </select>
          </div>
          <div id="script-preview" class="creator-preview hidden"></div>
          <div class="form-group">
            <label>Product to Feature</label>
            <input id="script-product" placeholder="e.g. Ingrown Hair Serum">
          </div>
          <div class="form-group">
            <label>Script Length</label>
            <select id="script-length">
              <option value="short">Short — 15–30 sec (hook/teaser)</option>
              <option value="medium" selected>Medium — 45–60 sec (product feature)</option>
              <option value="long">Long — 2–3 min (tutorial/review)</option>
            </select>
          </div>
          <button class="btn btn-primary btn-full" id="script-btn" onclick="generateScript()">
            Generate Script
          </button>
          ${state.roster.length === 0 ? `<div class="info-box" style="margin-top:16px">Add creators to your Roster first — the generator pulls their profile to personalize the script.</div>` : ''}
        </div>
      </div>

      <div class="generator-output-panel">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Generated Script</h3>
            <button class="btn btn-secondary btn-sm hidden" id="copy-script-btn" onclick="copyOutput('script-output')">Copy</button>
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

async function generateScript() {
  const creatorId    = document.getElementById('script-creator').value;
  const productFocus = document.getElementById('script-product').value;
  const scriptLength = document.getElementById('script-length').value;

  if (!creatorId) { showToast('Please select a creator', 'error'); return; }

  const btn    = document.getElementById('script-btn');
  const output = document.getElementById('script-output');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  output.innerHTML = `<div class="generating-indicator"><div class="spinner"></div><p>Writing your personalized script...</p></div>`;

  try {
    const res = await fetchAPI(`${API.generate}/script`, {
      method: 'POST',
      body: JSON.stringify({ creatorId, productFocus, scriptLength })
    });
    output.innerHTML = `<div class="output-content">${renderMarkdown(res.script)}</div>`;
    document.getElementById('copy-script-btn').classList.remove('hidden');
    showToast('Script generated!');
  } catch (err) {
    output.innerHTML = `<div class="output-error">⚠️ ${esc(err.message)}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Script';
  }
}

function updatePreview(type) {
  const id      = document.getElementById(`${type}-creator`).value;
  const preview = document.getElementById(`${type}-preview`);
  if (!id) { preview.classList.add('hidden'); return; }
  const c = state.roster.find(x => x.id === id);
  if (!c) return;

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
      ${c.content_style ? `
        <div class="preview-row preview-row-full">
          <span class="preview-label">Content Style</span>
          <span class="preview-value">${esc(c.content_style)}</span>
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
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeDetailPanel();
      clearSelection();
    }
  });

  await loadOutreach().catch(err => console.error('Outreach load failed:', err));
  await loadRoster().catch(err => console.error('Roster load failed:', err));

  navigate('outreach');
});
