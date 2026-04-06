// ===== State =====
const STORAGE_KEY = 'il_tracker_data';
const TEAM_KEY = 'il_tracker_team';
const SESSION_KEY = 'il_tracker_session';
let deleteTarget = null;
let currentRole = null;
let charts = {};

// Credentials
const CREDENTIALS = {
  collection: '1212',
  source: '2323',
  admin: '9090'
};

const ROLE_LABELS = {
  collection: 'Collector',
  source: 'Source',
  admin: 'Admin'
};

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
});

// ===== Auth =====
function checkSession() {
  const session = localStorage.getItem(SESSION_KEY);
  if (session) {
    currentRole = session;
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  $('#loginScreen').style.display = 'flex';
  $('#appContainer').style.display = 'none';
}

function showApp() {
  $('#loginScreen').style.display = 'none';
  $('#appContainer').style.display = 'block';
  applyRoleAccess();
  initApp();
}

let selectedRole = null;

window.selectRole = function(role) {
  selectedRole = role;
  $('.login-roles').style.display = 'none';
  $('#loginPassword').style.display = 'block';
  $('#loginRoleLabel').textContent = `Sign in as ${ROLE_LABELS[role]}`;
  $('#passwordInput').value = '';
  $('#loginError').textContent = '';
  setTimeout(() => $('#passwordInput').focus(), 100);
};

window.backToRoles = function() {
  selectedRole = null;
  $('.login-roles').style.display = 'block';
  $('#loginPassword').style.display = 'none';
};

window.doLogin = function() {
  const pw = $('#passwordInput').value;
  if (pw === CREDENTIALS[selectedRole]) {
    currentRole = selectedRole;
    localStorage.setItem(SESSION_KEY, currentRole);
    showApp();
  } else {
    $('#loginError').textContent = 'Incorrect password. Please try again.';
    $('#passwordInput').value = '';
    $('#passwordInput').focus();
  }
};

window.doLogout = function() {
  currentRole = null;
  selectedRole = null;
  localStorage.removeItem(SESSION_KEY);
  // Reset login UI
  $('.login-roles').style.display = 'block';
  $('#loginPassword').style.display = 'none';
  // Destroy charts
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
  showLogin();
};

function applyRoleAccess() {
  const badge = $('#userBadge');
  badge.textContent = ROLE_LABELS[currentRole];
  badge.className = 'user-badge ' + currentRole;

  // Tab visibility
  const tabCollection = $$('.tab[data-tab="collection"]')[0];
  const tabSourcing = $$('.tab[data-tab="sourcing"]')[0];
  const tabTeam = $$('.tab[data-tab="team"]')[0];
  const tabHistory = $$('.tab[data-tab="history"]')[0];
  const tabAdmin = $$('.tab[data-tab="admin"]')[0];

  // Reset all tabs
  [tabCollection, tabSourcing, tabTeam, tabHistory, tabAdmin].forEach(t => {
    t.classList.remove('hidden', 'active');
  });
  $$('.tab-content').forEach(tc => tc.classList.remove('active'));

  if (currentRole === 'collection') {
    tabSourcing.classList.add('hidden');
    tabAdmin.classList.add('hidden');
    tabCollection.classList.add('active');
    $('#collection').classList.add('active');
    $('#headerSubtitle').textContent = 'Collection Dashboard';
  } else if (currentRole === 'source') {
    tabCollection.classList.add('hidden');
    tabAdmin.classList.add('hidden');
    tabSourcing.classList.add('active');
    $('#sourcing').classList.add('active');
    $('#headerSubtitle').textContent = 'Sourcing Dashboard';
  } else {
    // Admin sees everything, starts on dashboard
    tabAdmin.classList.add('active');
    $('#admin').classList.add('active');
    $('#headerSubtitle').textContent = 'Admin Dashboard';
  }
}

function initApp() {
  initDate();
  initTabs();
  initCollectionForm();
  initSourcingForm();
  initTeamForm();
  initHistory();
  initModal();
  loadExistingEntry();
  if (currentRole === 'admin') {
    renderDashboard();
  }
}

// ===== Date =====
function initDate() {
  const dateInput = $('#entryDate');
  dateInput.value = todayStr();
  dateInput.addEventListener('change', loadExistingEntry);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function selectedDate() {
  return $('#entryDate').value || todayStr();
}

// ===== Tabs =====
function initTabs() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('hidden')) return;
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $(`#${target}`).classList.add('active');
      if (target === 'admin' && currentRole === 'admin') {
        renderDashboard();
      }
      if (target === 'history') {
        renderHistory();
      }
    });
  });

  $('#viewHistoryBtn').addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(tc => tc.classList.remove('active'));
    $$('.tab[data-tab="history"]')[0].classList.add('active');
    $('#history').classList.add('active');
    renderHistory();
  });
}

// ===== Storage Helpers =====
function getAllEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

function saveAllEntries(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getEntry(date) {
  return getAllEntries()[date] || {};
}

function saveEntry(date, entry) {
  const all = getAllEntries();
  all[date] = { ...all[date], ...entry };
  saveAllEntries(all);
}

function deleteEntry(date) {
  const all = getAllEntries();
  delete all[date];
  saveAllEntries(all);
}

// ===== Load Existing Entry =====
function loadExistingEntry() {
  const date = selectedDate();
  const entry = getEntry(date);

  if ($('#ftdDemand')) {
    $('#ftdDemand').value = entry.ftdDemand ?? '';
    $('#ftdCollection').value = entry.ftdCollection ?? '';
    $('#ftod').value = entry.ftod ?? '';
    $('#potentialPnpa').value = entry.potentialPnpa ?? '';
    $('#prePnpa').value = entry.prePnpa ?? '';
    $('#npa').value = entry.npa ?? '';
  }

  if ($('#branches')) {
    $('#branches').value = entry.branches ?? '';
    $('#activeStaff').value = entry.activeStaff ?? '';
    $('#loginPlan').value = entry.loginPlan ?? '';
    $('#dbPlan').value = entry.dbPlan ?? '';
  }
}

// ===== Collection Form =====
function initCollectionForm() {
  $('#saveCollection').addEventListener('click', () => {
    const date = selectedDate();
    const data = {
      ftdDemand: parseNum($('#ftdDemand').value),
      ftdCollection: parseNum($('#ftdCollection').value),
      ftod: parseNum($('#ftod').value),
      potentialPnpa: parseNum($('#potentialPnpa').value),
      prePnpa: parseNum($('#prePnpa').value),
      npa: parseNum($('#npa').value),
    };
    saveEntry(date, data);
    toast('Collection data saved successfully');
    renderHistory();
  });

  $('#clearCollection').addEventListener('click', () => {
    $('#ftdDemand').value = '';
    $('#ftdCollection').value = '';
    $('#ftod').value = '';
    $('#potentialPnpa').value = '';
    $('#prePnpa').value = '';
    $('#npa').value = '';
  });
}

// ===== Sourcing Form =====
function initSourcingForm() {
  $('#saveSourcing').addEventListener('click', () => {
    const date = selectedDate();
    const data = {
      branches: parseNum($('#branches').value),
      activeStaff: parseNum($('#activeStaff').value),
      loginPlan: parseNum($('#loginPlan').value),
      dbPlan: parseNum($('#dbPlan').value),
    };
    saveEntry(date, data);
    toast('Sourcing data saved successfully');
    renderHistory();
  });

  $('#clearSourcing').addEventListener('click', () => {
    $('#branches').value = '';
    $('#activeStaff').value = '';
    $('#loginPlan').value = '';
    $('#dbPlan').value = '';
  });
}

// ===== Team =====
function initTeamForm() {
  renderTeam();

  $('#addMember').addEventListener('click', () => {
    const name = $('#memberName').value.trim();
    const role = $('#memberRole').value;
    const task = $('#memberTask').value;

    if (!name || !role || !task) {
      toast('Please fill all fields', true);
      return;
    }

    const team = getTeam();
    team.push({ id: Date.now(), name, role, task, addedOn: todayStr() });
    saveTeam(team);

    $('#memberName').value = '';
    $('#memberRole').value = '';
    $('#memberTask').value = '';

    renderTeam();
    toast('Team member added');
  });
}

function getTeam() {
  return JSON.parse(localStorage.getItem(TEAM_KEY) || '[]');
}

function saveTeam(team) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(team));
}

function renderTeam() {
  const team = getTeam();
  const container = $('#teamList');

  if (team.length === 0) {
    container.innerHTML = '<p class="empty-state">No team members added yet.</p>';
    return;
  }

  container.innerHTML = team.map(m => `
    <div class="team-member">
      <div class="member-info">
        <div class="member-avatar">${m.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="member-name">${escHtml(m.name)}</div>
          <div class="member-role">${escHtml(m.role)}</div>
        </div>
        <span class="member-task">${escHtml(m.task)}</span>
      </div>
      <div class="member-actions">
        <button class="btn btn-outline btn-sm" onclick="removeMember(${m.id})">Remove</button>
      </div>
    </div>
  `).join('');
}

window.removeMember = function(id) {
  const team = getTeam().filter(m => m.id !== id);
  saveTeam(team);
  renderTeam();
  toast('Member removed');
};

// ===== History =====
function initHistory() {
  renderHistory();
  $('#filterHistory').addEventListener('click', renderHistory);
  $('#exportCsv').addEventListener('click', exportCsv);
}

function renderHistory() {
  const all = getAllEntries();
  const from = $('#historyFrom').value;
  const to = $('#historyTo').value;

  let dates = Object.keys(all).sort().reverse();
  if (from) dates = dates.filter(d => d >= from);
  if (to) dates = dates.filter(d => d <= to);

  const tbody = $('#historyBody');
  const empty = $('#emptyHistory');

  if (dates.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = dates.map(date => {
    const e = all[date];
    return `
      <tr>
        <td><strong>${formatDate(date)}</strong></td>
        <td>${fmtNum(e.ftdDemand)}</td>
        <td>${fmtNum(e.ftdCollection)}</td>
        <td>${fmtNum(e.ftod)}</td>
        <td>${fmtNum(e.potentialPnpa)}</td>
        <td>${fmtNum(e.prePnpa)}</td>
        <td>${fmtNum(e.npa)}</td>
        <td>${fmtNum(e.branches)}</td>
        <td>${fmtNum(e.activeStaff)}</td>
        <td>${fmtNum(e.loginPlan)}</td>
        <td>${fmtNum(e.dbPlan)}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="editEntry('${date}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="promptDelete('${date}')">Del</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.editEntry = function(date) {
  $('#entryDate').value = date;
  loadExistingEntry();
  $$('.tab')[0].click();
  toast('Loaded entry for editing');
};

window.promptDelete = function(date) {
  deleteTarget = date;
  $('#modalOverlay').classList.add('show');
};

// ===== Modal =====
function initModal() {
  $('#cancelDelete').addEventListener('click', () => {
    deleteTarget = null;
    $('#modalOverlay').classList.remove('show');
  });

  $('#confirmDelete').addEventListener('click', () => {
    if (deleteTarget) {
      deleteEntry(deleteTarget);
      deleteTarget = null;
      $('#modalOverlay').classList.remove('show');
      renderHistory();
      loadExistingEntry();
      toast('Entry deleted');
    }
  });

  $('#modalOverlay').addEventListener('click', (e) => {
    if (e.target === $('#modalOverlay')) {
      deleteTarget = null;
      $('#modalOverlay').classList.remove('show');
    }
  });
}

// ===== CSV Export =====
function exportCsv() {
  const all = getAllEntries();
  const dates = Object.keys(all).sort().reverse();

  if (dates.length === 0) {
    toast('No data to export', true);
    return;
  }

  const headers = ['Date', 'FTD Demand', 'FTD Collection', 'FTOD', 'Potential PNPA (SMA-1)', 'Pre-PNPA (SMA-2)', 'NPA', 'Branches', 'Active Staff', 'Login Plan', 'DB Plan'];
  const rows = dates.map(d => {
    const e = all[d];
    return [d, e.ftdDemand, e.ftdCollection, e.ftod, e.potentialPnpa, e.prePnpa, e.npa, e.branches, e.activeStaff, e.loginPlan, e.dbPlan].map(v => v ?? '').join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `il_tracker_${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported');
}

// ===== ADMIN DASHBOARD =====
function getFilteredEntries() {
  const all = getAllEntries();
  const from = $('#dashFrom').value;
  const to = $('#dashTo').value;

  let dates = Object.keys(all).sort();
  if (from) dates = dates.filter(d => d >= from);
  if (to) dates = dates.filter(d => d <= to);

  return { dates, entries: dates.map(d => ({ date: d, ...all[d] })) };
}

window.renderDashboard = function() {
  const { dates, entries } = getFilteredEntries();
  const category = $('#dashCategory').value;

  renderKPIs(entries, category);
  renderCharts(dates, entries, category);
  renderDashTable(entries);
};

window.resetDashFilters = function() {
  $('#dashFrom').value = '';
  $('#dashTo').value = '';
  $('#dashCategory').value = 'all';
  renderDashboard();
};

function renderKPIs(entries, category) {
  const grid = $('#kpiGrid');
  if (entries.length === 0) {
    grid.innerHTML = '<p class="empty-state">No data available for the selected filters.</p>';
    return;
  }

  const sum = (key) => entries.reduce((a, e) => a + (e[key] || 0), 0);
  const avg = (key) => { const s = sum(key); return entries.length ? s / entries.length : 0; };

  const totalDemand = sum('ftdDemand');
  const totalCollection = sum('ftdCollection');
  const totalFtod = sum('ftod');
  const totalPnpa = sum('potentialPnpa');
  const totalPrePnpa = sum('prePnpa');
  const totalNpa = sum('npa');
  const totalBranches = sum('branches');
  const totalStaff = sum('activeStaff');
  const totalLogin = sum('loginPlan');
  const totalDb = sum('dbPlan');
  const efficiency = totalDemand > 0 ? ((totalCollection / totalDemand) * 100).toFixed(1) : '0.0';

  let kpis = [];

  if (category === 'all' || category === 'collection') {
    kpis.push(
      { label: 'Total FTD Demand', value: fmtCurrency(totalDemand), sub: `${entries.length} entries`, cls: 'blue' },
      { label: 'Total FTD Collection', value: fmtCurrency(totalCollection), sub: `Efficiency: ${efficiency}%`, cls: 'cyan' },
      { label: 'Total FTOD', value: fmtCurrency(totalFtod), sub: `Avg: ${fmtCurrency(avg('ftod'))}`, cls: 'green' },
    );
  }

  if (category === 'all' || category === 'pending') {
    kpis.push(
      { label: 'Potential PNPA (SMA-1)', value: fmtCurrency(totalPnpa), sub: '31-60 Days', cls: 'amber' },
      { label: 'Pre-PNPA (SMA-2)', value: fmtCurrency(totalPrePnpa), sub: '61-90 Days', cls: 'orange' },
    );
  }

  if (category === 'all' || category === 'npa') {
    kpis.push(
      { label: 'Total NPA', value: fmtCurrency(totalNpa), sub: `Avg: ${fmtCurrency(avg('npa'))}`, cls: 'red' },
    );
  }

  if (category === 'all' || category === 'sourcing') {
    kpis.push(
      { label: 'Total Branches', value: totalBranches.toLocaleString('en-IN'), sub: `Avg: ${avg('branches').toFixed(0)}/day`, cls: 'purple' },
      { label: 'Total Staff Days', value: totalStaff.toLocaleString('en-IN'), sub: `Avg: ${avg('activeStaff').toFixed(0)}/day`, cls: 'blue' },
      { label: 'Login Plan Total', value: totalLogin.toLocaleString('en-IN'), sub: `Avg: ${avg('loginPlan').toFixed(0)}/day`, cls: 'purple' },
      { label: 'DB Plan Total', value: fmtCurrency(totalDb), sub: `Avg: ${fmtCurrency(avg('dbPlan'))}`, cls: 'pink' },
    );
  }

  if (category === 'all') {
    kpis.push(
      { label: 'Collection Efficiency', value: `${efficiency}%`, sub: 'FTD Collection / Demand', cls: 'green' },
    );
  }

  grid.innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.cls}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>
  `).join('');
}

function renderCharts(dates, entries, category) {
  // Destroy old charts
  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  const labels = dates.map(d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  });

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8b8fa3', font: { size: 11 } }
      }
    },
    scales: {
      x: {
        ticks: { color: '#8b8fa3', font: { size: 10 } },
        grid: { color: 'rgba(42,46,63,0.5)' }
      },
      y: {
        ticks: { color: '#8b8fa3', font: { size: 10 } },
        grid: { color: 'rgba(42,46,63,0.5)' }
      }
    }
  };

  // Collection Trend (line)
  if (category === 'all' || category === 'collection') {
    const ctx1 = $('#chartCollection').getContext('2d');
    charts.collection = new Chart(ctx1, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'FTD Demand',
            data: entries.map(e => e.ftdDemand || 0),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            fill: true,
            tension: 0.3,
          },
          {
            label: 'FTD Collection',
            data: entries.map(e => e.ftdCollection || 0),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6,182,212,0.1)',
            fill: true,
            tension: 0.3,
          },
          {
            label: 'FTOD',
            data: entries.map(e => e.ftod || 0),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.1)',
            fill: true,
            tension: 0.3,
          }
        ]
      },
      options: chartOpts
    });
  }

  // Pending & NPA (bar)
  if (category === 'all' || category === 'pending' || category === 'npa') {
    const ctx2 = $('#chartPending').getContext('2d');
    charts.pending = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'PNPA (SMA-1)',
            data: entries.map(e => e.potentialPnpa || 0),
            backgroundColor: 'rgba(245,158,11,0.7)',
            borderRadius: 4,
          },
          {
            label: 'Pre-PNPA (SMA-2)',
            data: entries.map(e => e.prePnpa || 0),
            backgroundColor: 'rgba(249,115,22,0.7)',
            borderRadius: 4,
          },
          {
            label: 'NPA',
            data: entries.map(e => e.npa || 0),
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius: 4,
          }
        ]
      },
      options: chartOpts
    });
  }

  // Sourcing (bar)
  if (category === 'all' || category === 'sourcing') {
    const ctx3 = $('#chartSourcing').getContext('2d');
    charts.sourcing = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Branches',
            data: entries.map(e => e.branches || 0),
            backgroundColor: 'rgba(34,197,94,0.7)',
            borderRadius: 4,
          },
          {
            label: 'Active Staff',
            data: entries.map(e => e.activeStaff || 0),
            backgroundColor: 'rgba(59,130,246,0.7)',
            borderRadius: 4,
          },
          {
            label: 'Login Plan',
            data: entries.map(e => e.loginPlan || 0),
            backgroundColor: 'rgba(168,85,247,0.7)',
            borderRadius: 4,
          }
        ]
      },
      options: chartOpts
    });
  }

  // Efficiency (line)
  if (category === 'all' || category === 'collection') {
    const ctx4 = $('#chartEfficiency').getContext('2d');
    charts.efficiency = new Chart(ctx4, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Collection Efficiency %',
          data: entries.map(e => {
            const demand = e.ftdDemand || 0;
            return demand > 0 ? ((e.ftdCollection || 0) / demand * 100).toFixed(1) : 0;
          }),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.15)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#22c55e',
        }]
      },
      options: {
        ...chartOpts,
        scales: {
          ...chartOpts.scales,
          y: {
            ...chartOpts.scales.y,
            min: 0,
            max: 150,
          }
        }
      }
    });
  }
}

function renderDashTable(entries) {
  const tbody = $('#dashTableBody');
  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:24px">No data for selected filters</td></tr>';
    return;
  }

  tbody.innerHTML = entries.reverse().map(e => `
    <tr>
      <td><strong>${formatDate(e.date)}</strong></td>
      <td>${fmtNum(e.ftdDemand)}</td>
      <td>${fmtNum(e.ftdCollection)}</td>
      <td>${fmtNum(e.ftod)}</td>
      <td>${fmtNum(e.potentialPnpa)}</td>
      <td>${fmtNum(e.prePnpa)}</td>
      <td>${fmtNum(e.npa)}</td>
      <td>${fmtNum(e.branches)}</td>
      <td>${fmtNum(e.activeStaff)}</td>
      <td>${fmtNum(e.loginPlan)}</td>
      <td>${fmtNum(e.dbPlan)}</td>
    </tr>
  `).join('');
}

// ===== Helpers =====
function parseNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function fmtNum(val) {
  if (val === null || val === undefined) return '<span style="color:var(--text-muted)">-</span>';
  return typeof val === 'number' && val % 1 !== 0
    ? val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : val.toLocaleString('en-IN');
}

function fmtCurrency(val) {
  if (!val) return '0';
  return val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.classList.remove('show'), 2500);
}
