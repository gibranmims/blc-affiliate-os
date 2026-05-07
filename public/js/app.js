/* ============================================================
   BLC Affiliate OS — SPA JavaScript
   ============================================================ */

const API = {
  outreach: '/api/outreach',
  roster:   '/api/roster',
  generate: '/api/generate'
};

const state = {
  currentPage:    'outreach',
  outreach:       [],
  roster:         [],
  outreachFilter: 'all'
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

function statusBadge(status, type = 'outreach') {
  const map = type === 'outreach'
    ? { contacted: 'blue', interested: 'yellow', negotiating: 'purple', signed: 'green', declined: 'red', ghosted: 'gray' }
    : { active: 'green', inactive: 'gray', paused: 'yellow' };
  const color = map[status] || 'gray';
  return `<span class="badge badge-${color}">${esc(status)}</span>`;
}

function tierBadge(tier) {
  if (!tier) return '—';
  const map = { nano: 'gray', micro: 'blue', mid: 'purple', macro: 'yellow', mega: 'orange' };
  return `<span class="badge badge-${map[tier] || 'gray'}">${esc(tier)}</span>`;
}

function platformIcon(p) {
  return { TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Pinterest: '📌' }[p] || '🌐';
}

function selectOpts(options, selected) {
  return options.map(([val, label]) =>
    `<option value="${val}" ${val === selected ? 'selected' : ''}>${label}</option>`
  ).join('');
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
  // Focus first input
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
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const renderers = { outreach: renderOutreachPage, roster: renderRosterPage, briefs: renderBriefsPage, scripts: renderScriptsPage };
  if (renderers[page]) renderers[page]();
}

// ============================================================
// OUTREACH — DATA
// ============================================================

async function loadOutreach() {
  state.outreach = await fetchAPI(API.outreach);
}

// ============================================================
// OUTREACH — RENDER
// ============================================================

function renderOutreachPage() {
  const counts = ['all','contacted','interested','negotiating','signed','declined','ghosted'].reduce((acc, s) => {
    acc[s] = s === 'all' ? state.outreach.length : state.outreach.filter(r => r.status === s).length;
    return acc;
  }, {});

  const filtered = state.outreachFilter === 'all'
    ? state.outreach
    : state.outreach.filter(r => r.status === state.outreachFilter);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Outreach</h1>
        <p class="page-subtitle">Track creator pitches, negotiations, and deal status</p>
      </div>
      <button class="btn btn-primary" onclick="openAddOutreachModal()">+ Add Creator</button>
    </div>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">${counts.all}</div>
        <div class="stat-label">Total Outreach</div>
      </div>
      <div class="stat-card">
        <div class="stat-value accent">${counts.interested + counts.negotiating}</div>
        <div class="stat-label">In Pipeline</div>
      </div>
      <div class="stat-card">
        <div class="stat-value green">${counts.signed}</div>
        <div class="stat-label">Signed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value muted">${counts.declined + counts.ghosted}</div>
        <div class="stat-label">Not Moving Forward</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-tabs">
        ${['all','contacted','interested','negotiating','signed','declined','ghosted'].map(s => `
          <button class="filter-tab ${state.outreachFilter === s ? 'active' : ''}" onclick="setOutreachFilter('${s}')">
            ${s.charAt(0).toUpperCase() + s.slice(1)}
            <span class="filter-count">${counts[s]}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="table-container">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📡</div>
          <h3>${state.outreachFilter === 'all' ? 'No outreach yet' : `No creators with status "${state.outreachFilter}"`}</h3>
          <p>${state.outreachFilter === 'all' ? 'Start tracking your creator pitches' : 'Try a different filter'}</p>
          ${state.outreachFilter === 'all' ? '<button class="btn btn-primary" onclick="openAddOutreachModal()">+ Add Creator</button>' : ''}
        </div>
      ` : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Platform</th>
              <th>Niche</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Rate Offered</th>
              <th>Rate Negotiated</th>
              <th>Contact Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(r => `
              <tr>
                <td>
                  <div class="creator-cell">
                    <span class="creator-handle">@${esc(r.handle)}</span>
                    ${r.contact_email ? `<span class="creator-email">${esc(r.contact_email)}</span>` : ''}
                  </div>
                </td>
                <td><span class="platform-tag">${platformIcon(r.platform)} ${esc(r.platform)}</span></td>
                <td>${esc(r.niche) || '—'}</td>
                <td>${tierBadge(r.tier)}</td>
                <td>${statusBadge(r.status, 'outreach')}</td>
                <td>${fmt$(r.rate_offered)}</td>
                <td>${r.rate_negotiated ? `<strong>${fmt$(r.rate_negotiated)}</strong>` : '—'}</td>
                <td>${fmtDate(r.contact_date)}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" onclick="openEditOutreachModal('${r.id}')" title="Edit">✏️</button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteOutreach('${r.id}')" title="Delete">🗑️</button>
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

function setOutreachFilter(f) {
  state.outreachFilter = f;
  renderOutreachPage();
}

// ============================================================
// OUTREACH — CRUD
// ============================================================

function outreachFormHTML(r = {}) {
  const platforms = [['TikTok','TikTok'],['Instagram','Instagram'],['YouTube','YouTube'],['Pinterest','Pinterest']];
  const tiers     = [['','— Select Tier —'],['nano','Nano'],['micro','Micro'],['mid','Mid'],['macro','Macro'],['mega','Mega']];
  const statuses  = [['contacted','Contacted'],['interested','Interested'],['negotiating','Negotiating'],['signed','Signed'],['declined','Declined'],['ghosted','Ghosted']];
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
          <label>Tier</label>
          <select name="tier">${selectOpts(tiers, r.tier || '')}</select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">${selectOpts(statuses, r.status || 'contacted')}</select>
        </div>
        <div class="form-group">
          <label>Rate Offered ($)</label>
          <input type="number" step="0.01" name="rate_offered" value="${r.rate_offered || ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Rate Negotiated ($)</label>
          <input type="number" step="0.01" name="rate_negotiated" value="${r.rate_negotiated || ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Contact Email</label>
          <input type="email" name="contact_email" value="${esc(r.contact_email || '')}" placeholder="creator@email.com">
        </div>
        <div class="form-group">
          <label>Contact Date</label>
          <input type="date" name="contact_date" value="${r.contact_date ? r.contact_date.split('T')[0] : ''}">
        </div>
        <div class="form-group form-group-full">
          <label>Notes</label>
          <textarea name="notes" placeholder="Notes about this creator or outreach...">${esc(r.notes || '')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${r.id ? 'Save Changes' : 'Add Creator'}</button>
      </div>
    </form>`;
}

function openAddOutreachModal() {
  openModal('Add Creator to Outreach', outreachFormHTML(), async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(API.outreach, { method: 'POST', body: JSON.stringify(data) });
      state.outreach.unshift(rec);
      closeModal(); renderOutreachPage(); showToast('Creator added!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function openEditOutreachModal(id) {
  const r = state.outreach.find(x => x.id === id);
  if (!r) return;
  openModal('Edit Outreach', outreachFormHTML(r), async (e) => {
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const rec = await fetchAPI(`${API.outreach}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      const i = state.outreach.findIndex(x => x.id === id);
      if (i !== -1) state.outreach[i] = rec;
      closeModal(); renderOutreachPage(); showToast('Outreach updated!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function deleteOutreach(id) {
  if (!confirm('Delete this outreach record? This cannot be undone.')) return;
  try {
    await fetchAPI(`${API.outreach}/${id}`, { method: 'DELETE' });
    state.outreach = state.outreach.filter(r => r.id !== id);
    renderOutreachPage(); showToast('Record deleted');
  } catch (err) { showToast(err.message, 'error'); }
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
  const active   = state.roster.filter(r => r.status === 'active').length;
  const totalGMV = state.roster.reduce((s, r) => s + (parseFloat(r.gmv) || 0), 0);
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
                <td>${statusBadge(r.status, 'roster')}</td>
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
// BRIEF GENERATOR
// ============================================================

function renderBriefsPage() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Brief Generator</h1>
        <p class="page-subtitle">Generate personalized content briefs powered by Claude AI</p>
      </div>
    </div>

    <div class="generator-layout">
      <div class="generator-form-panel">
        <div class="panel">
          <h3 class="panel-title">Brief Settings</h3>

          <div class="form-group">
            <label>Select Creator *</label>
            <select id="brief-creator" onchange="updatePreview('brief')">
              <option value="">— Choose a creator —</option>
              ${state.roster.map(c =>
                `<option value="${c.id}">${platformIcon(c.platform)} @${esc(c.handle)}${c.niche ? ' · ' + esc(c.niche) : ''}</option>`
              ).join('')}
            </select>
          </div>

          <div id="brief-preview" class="creator-preview hidden"></div>

          <div class="form-group">
            <label>Product Focus</label>
            <input id="brief-product" placeholder="e.g. Bikini Line Shave Serum">
          </div>

          <div class="form-group">
            <label>Campaign Goal</label>
            <input id="brief-goal" placeholder="e.g. Launch awareness, drive conversions">
          </div>

          <button class="btn btn-primary btn-full" id="brief-btn" onclick="generateBrief()">
            ✨ Generate Brief
          </button>

          ${state.roster.length === 0 ? `<div class="info-box" style="margin-top:16px">Add creators to your Roster first — the generator pulls their profile to personalize the brief.</div>` : ''}
        </div>
      </div>

      <div class="generator-output-panel">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Generated Brief</h3>
            <button class="btn btn-secondary btn-sm hidden" id="copy-brief-btn" onclick="copyOutput('brief-output')">📋 Copy</button>
          </div>
          <div id="brief-output" class="output-area">
            <div class="output-placeholder">
              <div class="output-icon">📋</div>
              <p>Select a creator and click Generate to create a personalized content brief</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

async function generateBrief() {
  const creatorId   = document.getElementById('brief-creator').value;
  const productFocus = document.getElementById('brief-product').value;
  const campaignGoal = document.getElementById('brief-goal').value;

  if (!creatorId) { showToast('Please select a creator', 'error'); return; }

  const btn    = document.getElementById('brief-btn');
  const output = document.getElementById('brief-output');

  btn.disabled = true;
  btn.textContent = '⏳ Generating...';
  output.innerHTML = `<div class="generating-indicator"><div class="spinner"></div><p>Crafting your personalized brief...</p></div>`;

  try {
    const res = await fetchAPI(`${API.generate}/brief`, {
      method: 'POST',
      body: JSON.stringify({ creatorId, productFocus, campaignGoal })
    });
    output.innerHTML = `<div class="output-content">${renderMarkdown(res.brief)}</div>`;
    document.getElementById('copy-brief-btn').classList.remove('hidden');
    showToast('Brief generated!');
  } catch (err) {
    output.innerHTML = `<div class="output-error">⚠️ ${esc(err.message)}</div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Generate Brief';
  }
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
            🎬 Generate Script
          </button>

          ${state.roster.length === 0 ? `<div class="info-box" style="margin-top:16px">Add creators to your Roster first — the generator pulls their profile to match their voice.</div>` : ''}
        </div>
      </div>

      <div class="generator-output-panel">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Generated Script</h3>
            <button class="btn btn-secondary btn-sm hidden" id="copy-script-btn" onclick="copyOutput('script-output')">📋 Copy</button>
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
  const creatorId   = document.getElementById('script-creator').value;
  const productFocus = document.getElementById('script-product').value;
  const scriptLength = document.getElementById('script-length').value;

  if (!creatorId) { showToast('Please select a creator', 'error'); return; }

  const btn    = document.getElementById('script-btn');
  const output = document.getElementById('script-output');

  btn.disabled = true;
  btn.textContent = '⏳ Generating...';
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
    btn.textContent = '🎬 Generate Script';
  }
}

// ============================================================
// SHARED GENERATOR HELPERS
// ============================================================

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
      ${c.audience_demographics ? `
        <div class="preview-row preview-row-full">
          <span class="preview-label">Audience</span>
          <span class="preview-value">${esc(c.audience_demographics)}</span>
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
    if (e.key === 'Escape') closeModal();
  });

  try {
    await Promise.all([loadOutreach(), loadRoster()]);
  } catch (err) {
    showToast('Could not load data — check your Supabase config', 'error');
    console.error(err);
  }

  navigate('outreach');
});
