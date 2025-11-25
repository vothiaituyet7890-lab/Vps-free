console.log('🟣 staff.js loaded');

function requireStaff() {
  const user = getCurrentUser();
  if (!user || String(user.role).toLowerCase() !== 'staff') {
    const current = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = '/DOANWEB/login.html?returnUrl=' + current;
    return false;
  }
  return true;
}

// ===== Attendance (Check-in/Check-out) =====
async function resolveStaffId() {
  const u = getCurrentUser();
  if (!u || !u.id) throw new Error('Chưa đăng nhập');
  // Try find by id_tk
  const res = await fetch(`api/nhanvien.php?id_tk=${encodeURIComponent(u.id)}`);
  const data = await res.json();
  if (data && data.success && data.nhanvien) return data.nhanvien.id_nv;
  // Create mapping lazily
  const payload = { id_tk: u.id, ho_ten: u.name || u.username || 'Nhân viên', chuc_vu: 'Nhân viên' };
  const res2 = await fetch('api/nhanvien.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data2 = await res2.json();
  if (data2 && data2.success) return data2.id_nv;
  throw new Error('Không thể xác định nhân viên');
}

async function loadStaffAttendance() {
  try {
    const id_nv = await resolveStaffId();
    const today = new Date().toISOString().slice(0,10);
    // Load assignment today
    const aRes = await fetch(`api/phancong.php?ngay=${today}&id_nv=${id_nv}`);
    const aData = await aRes.json();
    const assign = (aData && aData.assignments && aData.assignments[0]) ? aData.assignments[0] : null;
    const info = document.getElementById('attendanceInfo');
    if (assign) {
      info.textContent = `Ca hôm nay: ${assign.ten_ca} (${assign.gio_bat_dau} - ${assign.gio_ket_thuc})`;
    } else {
      info.textContent = 'Hôm nay chưa được phân công ca.';
    }
    // Load today status via chamcong GET? existing API returns list by day across all employees; keep simple: try POST check-in existence; but safer to query: reuse GET by day and filter client side
    const ccRes = await fetch(`api/chamcong.php?ngay=${today}`);
    const ccData = await ccRes.json();
    const me = Array.isArray(ccData) ? ccData.find(x => String(x.id_nv) === String(id_nv)) : null;
    const status = document.getElementById('attendanceStatus');
    const btnIn = document.getElementById('btnCheckIn');
    const btnOut = document.getElementById('btnCheckOut');
    if (me && me.da_cham) {
      status.textContent = `Đã check-in: ${me.gio_vao || ''} • ${me.trang_thai || ''} ${me.gio_ra ? '• Đã check-out: '+me.gio_ra : ''}`;
      btnIn.disabled = true;
      btnOut.disabled = !!me.gio_ra;
      btnOut.dataset.idCc = me.id_cc || '';
    } else {
      status.textContent = 'Chưa check-in';
      btnIn.disabled = false;
      btnOut.disabled = true;
      btnOut.removeAttribute('data-id-cc');
    }
  } catch (e) {
    const status = document.getElementById('attendanceStatus');
    if (status) status.textContent = 'Lỗi tải dữ liệu: ' + (e.message || e);
  }
}

async function doCheckIn() {
  try {
    const id_nv = await resolveStaffId();
    const today = new Date().toISOString().slice(0,10);
    const res = await fetch('api/chamcong.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_nv, ngay: today }) });
    const data = await res.json();
    if (data && data.success) {
      await loadStaffAttendance();
    } else {
      alert(data && data.message ? data.message : 'Không thể check-in');
    }
  } catch (e) { alert('Lỗi: ' + (e.message || e)); }
}

async function doCheckOut() {
  try {
    const btnOut = document.getElementById('btnCheckOut');
    const id = btnOut?.dataset?.idCc;
    if (!id) { alert('Chưa check-in hoặc không tìm thấy bản ghi'); return; }
    const res = await fetch(`api/chamcong.php?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    if (data && data.success) {
      await loadStaffAttendance();
    } else {
      alert(data && data.message ? data.message : 'Không thể check-out');
    }
  } catch (e) { alert('Lỗi: ' + (e.message || e)); }
}


// ===== COURTS TAB =====
function loadStaffCourts() {
  fetch('api/courts.php?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector('#staffCourtsTable tbody');
      tbody.innerHTML = '';
      const courts = Array.isArray(data) ? data : [];
      if (!courts.length) {
        tbody.innerHTML = '<tr><td colspan="3">Không có dữ liệu</td></tr>';
        return;
      }
      for (const c of courts) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.name || c.ten_san || ('S' + (c.id || ''))}</td>
          <td>${labelCourtStatus(c.status)}</td>
          <td><button class="btn btn-primary btn-sm" onclick="prefillCourt('${escapeHtml(c.name || c.ten_san || '')}', '${escapeHtml(c.status || '')}')">Chọn</button></td>
        `;
        tbody.appendChild(tr);
      }
    })
    .catch(() => {
      const tbody = document.querySelector('#staffCourtsTable tbody');
      tbody.innerHTML = '<tr><td colspan="3">Lỗi tải dữ liệu</td></tr>';
    });
}

function labelCourtStatus(s) {
  const map = { 'trong': 'Trống', 'dang_thue': 'Đang thuê', 'bao_tri': 'Bảo trì', 'active': 'Đang hoạt động', 'maintenance': 'Bảo trì', 'occupied': 'Đang sử dụng' };
  return map[s] || s || '-';
}

function prefillCourt(name, status) {
  const nameInput = document.getElementById('courtNameInput');
  const statusInput = document.getElementById('courtStatusInput');
  if (nameInput) nameInput.value = decodeHtml(name);
  if (statusInput) statusInput.value = status || 'active';
}

function saveCourtStatus() {
  const name = document.getElementById('courtNameInput')?.value?.trim();
  const status = document.getElementById('courtStatusInput')?.value;
  if (!name) { alert('Nhập tên sân'); return; }
  // Find court by name first
  fetch('api/courts.php')
    .then(r => r.json())
    .then(courts => {
      const court = (courts || []).find(c => String(c.name || c.ten_san).toLowerCase() === name.toLowerCase());
      if (!court) { alert('Không tìm thấy sân có tên đã nhập'); return; }
      const id = court.id || court.id_san;
      return fetch(`api/courts.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
        .then(r => r.json())
        .then(resp => {
          if (resp && resp.success) {
            loadStaffCourts();
          } else {
            alert(resp && resp.message ? resp.message : 'Không thể cập nhật trạng thái sân');
          }
        });
    })
    .catch(() => alert('Lỗi kết nối'));
}

// ===== Shift signup (register/cancel request) =====
async function loadShiftSignup() {
  try {
    const id_nv = await resolveStaffId();
    const date = document.getElementById('signupDate')?.value || new Date().toISOString().slice(0,10);
    // Load all shifts
    const sRes = await fetch('api/catruc.php');
    const sData = await sRes.json();
    const shifts = (sData && sData.shifts) ? sData.shifts : [];
    // Load assignments of the day
    const aRes = await fetch(`api/phancong.php?ngay=${encodeURIComponent(date)}`);
    const aData = await aRes.json();
    const assigns = (aData && aData.assignments) ? aData.assignments : [];
    const byShift = new Map();
    assigns.forEach(x => {
      const arr = byShift.get(x.ma_ca) || [];
      arr.push(x);
      byShift.set(x.ma_ca, arr);
    });
    const tbody = document.querySelector('#staffShiftSignupTable tbody');
    tbody.innerHTML = '';
    shifts.forEach(sh => {
      const list = byShift.get(sh.ma_ca) || [];
      const myAssign = list.find(x => String(x.id_nv) === String(id_nv));
      const isMine = !!myAssign;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sh.ma_ca}</td>
        <td>${sh.ten_ca}</td>
        <td>${sh.gio_bat_dau} - ${sh.gio_ket_thuc}</td>
        <td>${list.length} / 3</td>
        <td>
          ${isMine ? `<button class="btn btn-warning btn-sm" onclick="prepCancelRequest(${myAssign.id}, '${date}', '${sh.ma_ca}')">Yêu cầu hủy</button>`
                   : `<button class=\"btn btn-primary btn-sm\" ${list.length>=3?'disabled':''} onclick=\"registerShift('${sh.ma_ca}','${date}')\">Đăng ký</button>`}
        </td>`;
      tbody.appendChild(tr);
    });
    const hint = document.getElementById('cancelRequestHint');
    if (hint) hint.textContent = 'Chọn ca của bạn để yêu cầu hủy và nhập lý do.';
    const btn = document.getElementById('btnSendCancel');
    if (btn) { btn.disabled = true; btn.onclick = null; }
  } catch (e) {
    const tbody = document.querySelector('#staffShiftSignupTable tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5">Lỗi: ${escapeHtml(e.message||e)}</td></tr>`;
  }
}

function prepCancelRequest(id_pc, ngay, ma_ca) {
  const btn = document.getElementById('btnSendCancel');
  const input = document.getElementById('cancelReason');
  const hint = document.getElementById('cancelRequestHint');
  if (!btn) return;
  btn.disabled = false;
  btn.onclick = async () => {
    const reason = (input?.value||'').trim();
    if (!reason) { alert('Vui lòng nhập lý do hủy ca'); return; }
    try {
      const id_nv = await resolveStaffId();
      const res = await fetch('api/phancong-cancel.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_pc, id_nv, ngay_truc: ngay, ma_ca, reason }) });
      const data = await res.json();
      if (data && data.success) {
        if (hint) hint.textContent = 'Đã gửi yêu cầu hủy ca. Chờ admin duyệt.';
        if (input) input.value = '';
        await loadShiftSignup();
      } else {
        alert(data && data.message ? data.message : 'Không thể gửi yêu cầu');
      }
    } catch (e) { alert('Lỗi: ' + (e.message || e)); }
  };
}

async function registerShift(ma_ca, ngay) {
  try {
    const id_nv = await resolveStaffId();
    const res = await fetch('api/phancong.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_nv, ma_ca, ngay_truc: ngay }) });
    const data = await res.json();
    if (data && data.success) {
      await loadShiftSignup();
    } else {
      alert(data && data.message ? data.message : 'Không thể đăng ký');
    }
  } catch (e) { alert('Lỗi: ' + (e.message || e)); }
}

// ===== CUSTOMERS TAB =====
function loadStaffCustomers() {
  fetch('api/customers.php?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector('#staffCustomersTable tbody');
      tbody.innerHTML = '';
      const customers = (data && data.customers) ? data.customers : [];
      if (!customers.length) { tbody.innerHTML = '<tr><td colspan="4">Không có dữ liệu</td></tr>'; return; }
      for (const c of customers) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(c.name || '-')}</td>
          <td>${escapeHtml(c.phone || '-')}</td>
          <td>${c.orders || 0}</td>
          <td>${formatCurrency(c.total || 0)}</td>
        `;
        tbody.appendChild(tr);
      }
    })
    .catch(() => {
      const tbody = document.querySelector('#staffCustomersTable tbody');
      tbody.innerHTML = '<tr><td colspan="4">Lỗi tải dữ liệu</td></tr>';
    });
}

// ===== PAYMENTS TAB =====
function loadStaffPayments() {
  fetch('api/payments.php?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector('#staffPaymentsTable tbody');
      tbody.innerHTML = '';
      const items = (data && data.payments) ? data.payments : [];
      if (!items.length) { tbody.innerHTML = '<tr><td colspan="5">Không có dữ liệu</td></tr>'; return; }
      for (const b of items) {
        const id = b.id;
        const isPaid = !!b.isPaid;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>#${id}</td>
          <td>${escapeHtml(b.customerName || '-')}</td>
          <td>${formatCurrency(b.price || 0)}</td>
          <td>${isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
          <td>
            <button class="btn btn-sm ${isPaid ? 'btn-secondary' : 'btn-success'}" onclick="togglePaid(${id}, ${isPaid ? 'true' : 'false'})">${isPaid ? 'Bỏ đánh dấu' : 'Đánh dấu đã thu'}</button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    })
    .catch(() => {
      const tbody = document.querySelector('#staffPaymentsTable tbody');
      tbody.innerHTML = '<tr><td colspan="5">Lỗi tải dữ liệu</td></tr>';
    });
}
function togglePaid(id, isPaid) {
  const method = isPaid ? 'DELETE' : 'POST';
  fetch(`api/payments.php?id=${encodeURIComponent(id)}`, { method })
    .then(r => r.json())
    .then(() => loadStaffPayments())
    .catch(() => alert('Lỗi kết nối'));
}

// ===== SHIFTS TAB (localStorage) =====
function loadStaffShifts() {
  const tbody = document.querySelector('#staffShiftsTable tbody');
  tbody.innerHTML = '<tr><td colspan="3">Đang tải...</td></tr>';
  fetch('api/shifts.php?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      const items = (data && data.shifts) ? data.shifts : [];
      tbody.innerHTML = '';
      if (!items.length) { tbody.innerHTML = '<tr><td colspan="3">Chưa có ca trực</td></tr>'; return; }
      items.forEach((s) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(s.date)}</td>
          <td>${escapeHtml(s.name)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteShift(${s.id})">Xóa</button></td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(() => { tbody.innerHTML = '<tr><td colspan="3">Lỗi tải dữ liệu</td></tr>'; });
}

function addShift() {
  const date = document.getElementById('shiftDate')?.value;
  const name = document.getElementById('shiftName')?.value?.trim();
  if (!date || !name) { alert('Nhập đủ ngày và ca'); return; }
  fetch('api/shifts.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, name })
  })
    .then(r => r.json())
    .then(() => { document.getElementById('shiftName').value = ''; loadStaffShifts(); })
    .catch(() => alert('Lỗi kết nối'));
}

function deleteShift(id) {
  fetch(`api/shifts.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(() => loadStaffShifts())
    .catch(() => alert('Lỗi kết nối'));
}

// ===== REPORTS TAB =====
function loadStaffReports() {
  fetch('api/bookings.php?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      const bookings = Array.isArray(data) ? data : [];
      let total = 0, count = 0, cancelled = 0;
      for (const b of bookings) {
        count += 1;
        total += Number(b.price || 0);
        const st = normalizeStatus(b.status || b.trang_thai);
        if (st === 'cancelled') cancelled += 1;
      }
      const el = document.getElementById('reportSummary');
      if (el) el.textContent = `Tổng đơn: ${count} • Doanh thu gộp: ${formatCurrency(total)} • Đã hủy: ${cancelled}`;
    })
    .catch(() => {
      const el = document.getElementById('reportSummary');
      if (el) el.textContent = 'Lỗi tải dữ liệu';
    });
}

// ===== Utils =====
function escapeHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function decodeHtml(s){
  const txt = document.createElement('textarea'); txt.innerHTML = s; return txt.value;
}
 

function wireTopNav() {
  const nav = document.getElementById('staffTopNav');
  if (!nav) return;
  nav.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      const routes = {
        'tab-bookings': '/DOANWEB/staff-bookings.html',
        'tab-payments': '/DOANWEB/staff-payments.html',
        'tab-customers': '/DOANWEB/staff-customers.html',
        'tab-courts': '/DOANWEB/staff-courts.html',
        'tab-shifts': '/DOANWEB/staff-shifts.html',
        'tab-reports': '/DOANWEB/staff-reports.html'
      };
      if (routes[tab]) {
        window.location.href = routes[tab];
      } else {
        activateTab(tab);
      }
    });
  });
}

function activateTab(tabId) {
  document.querySelectorAll('.tab-section').forEach(sec => {
    sec.style.display = (sec.id === tabId) ? '' : 'none';
  });
  // Update active state on top nav
  const nav = document.getElementById('staffTopNav');
  if (nav) {
    nav.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
    const activeBtn = nav.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
  // Lazy-load data per tab
  if (tabId === 'tab-bookings') loadStaffBookings();
  if (tabId === 'tab-courts') loadStaffCourts();
  if (tabId === 'tab-customers') loadStaffCustomers();
  if (tabId === 'tab-payments') loadStaffPayments();
  if (tabId === 'tab-shifts') loadStaffShifts();
  if (tabId === 'tab-reports') loadStaffReports();
}

function bindFilters() {
  document.querySelectorAll('.status-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterTable(btn.dataset.filter);
    });
  });
}

function filterTable(filter) {
  const rows = document.querySelectorAll('#staffBookingsTable tbody tr');
  rows.forEach(r => {
    if (!r.dataset.status) return;
    if (filter === 'all' || r.dataset.status === filter) r.style.display = '';
    else r.style.display = 'none';
  });
}

function loadStaffBookings() {
  fetch('api/bookings.php?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      const tbody = document.querySelector('#staffBookingsTable tbody');
      tbody.innerHTML = '';
      const bookings = Array.isArray(data) ? data : (data && data.bookings ? data.bookings : []);
      if (!bookings.length) {
        tbody.innerHTML = '<tr><td colspan="8">Không có dữ liệu</td></tr>';
        return;
      }
      for (const b of bookings) {
        const id = b.id || b.id_dat;
        const statusRaw = b.status || b.trang_thai;
        const tr = document.createElement('tr');
        tr.dataset.status = normalizeStatus(statusRaw);
        tr.innerHTML = `
          <td>#${id}</td>
          <td>${b.customerName || b.customer || b.ten_kh || '-'}</td>
          <td>${b.courtName || b.court || b.ten_san || '-'}</td>
          <td>${b.date || b.ngay_dat || '-'}</td>
          <td>${b.time || b.khung_gio || '-'}</td>
          <td><span class="tag ${tr.dataset.status}">${labelStatus(tr.dataset.status)}</span></td>
          <td class="right">${formatCurrency(b.price || b.amount || b.tong_tien || 0)}</td>
          <td class="actions">
            ${actionButtons(tr.dataset.status, id)}
          </td>
        `;
        tbody.appendChild(tr);
      }
      const active = document.querySelector('.status-chip.active');
      if (active) filterTable(active.dataset.filter);
    })
    .catch(() => {
      const tbody = document.querySelector('#staffBookingsTable tbody');
      tbody.innerHTML = '<tr><td colspan="8">Lỗi tải dữ liệu</td></tr>';
    });
}

function actionButtons(status, id) {
  if (status === 'pending') {
    return `
      <button class="btn btn-primary btn-sm" onclick="approve(${id})">Duyệt</button>
      <button class="btn btn-danger btn-sm" onclick="reject(${id})">Từ chối</button>
    `;
  }
  if (status === 'approved') {
    return `<button class="btn btn-danger btn-sm" onclick="cancel(${id})">Hủy</button>`;
  }
  return '<span style="color:#64748b">—</span>';
}

function normalizeStatus(s) {
  s = (String(s || '')).toLowerCase().trim();
  const noAcc = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const key = noAcc.replace(/[\s_]+/g, '');
  if (key.includes('daduyet')) return 'approved';
  if (key.includes('tuchoi') || key.includes('rejected')) return 'rejected';
  if (key.includes('huy') || key.includes('cancel')) return 'cancelled';
  return 'pending';
}

function labelStatus(s) {
  return {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    cancelled: 'Đã hủy'
  }[s] || s;
}

function formatCurrency(v) {
  try { return Number(v).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }); } catch { return v; }
}

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', () => {
  if (!requireStaff()) return;
  // Tabbed layout support (old staff.html)
  if (document.getElementById('staffTopNav')) {
    wireTopNav();
    bindFilters();
    activateTab('tab-bookings');
    loadStaffBookings();
    return;
  }
  // Standalone pages detection
  if (document.getElementById('staffBookingsTable')) {
    bindFilters();
    loadStaffBookings();
  }
  if (document.getElementById('staffPaymentsTable')) {
    loadStaffPayments();
  }
  if (document.getElementById('staffCustomersTable')) {
    loadStaffCustomers();
  }
  if (document.getElementById('staffCourtsTable')) {
    loadStaffCourts();
  }
  if (document.getElementById('staffShiftsTable')) {
    loadStaffShifts();
  }
  if (document.getElementById('reportSummary')) {
    loadStaffReports();
  }
  if (document.getElementById('attendancePanel')) {
    loadStaffAttendance();
  }
  // Shift signup page
  if (document.getElementById('staffShiftSignupTable')) {
    const d = document.getElementById('signupDate');
    if (d && !d.value) d.valueAsDate = new Date();
    document.getElementById('btnReloadSignup')?.addEventListener('click', loadShiftSignup);
    loadShiftSignup();
  }
});

function approve(id) { updateStatus(id, 'da_duyet'); }
function reject(id) { updateStatus(id, 'huy'); }
function cancel(id) { updateStatus(id, 'huy'); }

function updateStatus(id, status) {
  fetch(`api/bookings.php?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
    .then(r => r.json())
    .then(resp => {
      if (resp && resp.success) {
        loadStaffBookings();
      } else {
        alert(resp && resp.message ? resp.message : 'Không thể cập nhật trạng thái');
      }
    })
    .catch(() => alert('Lỗi kết nối'));
}
