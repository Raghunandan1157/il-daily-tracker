// ===== State =====
const STORAGE_KEY = 'il_tracker_data';
const TEAM_KEY = 'il_tracker_team';
let deleteTarget = null;

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initDate();
  initTabs();
  initCollectionForm();
  initSourcingForm();
  initTeamForm();
  initHistory();
  initModal();
  loadExistingEntry();
});

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
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      $(`#${tab.dataset.tab}`).classList.add('active');
    });
  });

  $('#viewHistoryBtn').addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(tc => tc.classList.remove('active'));
    $$('.tab')[3].classList.add('active');
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

  // Collection fields
  $('#ftdDemand').value = entry.ftdDemand ?? '';
  $('#ftdCollection').value = entry.ftdCollection ?? '';
  $('#ftod').value = entry.ftod ?? '';
  $('#potentialPnpa').value = entry.potentialPnpa ?? '';
  $('#prePnpa').value = entry.prePnpa ?? '';
  $('#npa').value = entry.npa ?? '';

  // Sourcing fields
  $('#branches').value = entry.branches ?? '';
  $('#activeStaff').value = entry.activeStaff ?? '';
  $('#loginPlan').value = entry.loginPlan ?? '';
  $('#dbPlan').value = entry.dbPlan ?? '';
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
    team.push({
      id: Date.now(),
      name,
      role,
      task,
      addedOn: todayStr()
    });
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
  // Switch to collection tab
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
