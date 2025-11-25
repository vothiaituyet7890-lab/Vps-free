// ===== ADMIN DASHBOARD JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
  const currentUser = getCurrentUser();
  
  // Nếu chưa đăng nhập -> đá về login
  if (!currentUser) {
    try { sessionStorage.setItem('returnUrl', 'admin.html'); } catch (e) {}
    window.location.href = 'login.html';
    return;
  }
  
  // Chỉ cho phép admin truy cập trang này
  if (typeof currentUser.role === 'string' && currentUser.role.toLowerCase() === 'admin') {
    // ok
  } else {
    // Fallback: hỏi server để xác minh quyền admin nếu client không có hoặc khác 'admin'
    fetch('api/check-admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    })
    .then(r => r.json())
    .then(check => {
      if (!(check && check.isAdmin)) {
        alert('⚠️ Bạn không có quyền truy cập trang quản trị.');
        window.location.href = 'index.html';
      } else {
        // continue loading dashboard normally
        // Load admin name
        document.getElementById('adminName').textContent = currentUser.name || 'Admin';
        loadDashboardStats();
        loadRecentBookings();
      }
    })
    .catch(() => {
      alert('⚠️ Không xác minh được quyền truy cập.');
      window.location.href = 'index.html';
    });
    return;
  }
  
  // Load admin name
  document.getElementById('adminName').textContent = currentUser.name || 'Admin';
  
  // Load dashboard data
  loadDashboardStats();
  loadRecentBookings();
  
  // Populate month select for reports
  const monthSelect = document.getElementById('courtReportMonth');
  if (monthSelect) {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const currentYear = new Date().getFullYear();
    
    months.forEach(month => {
      const option = document.createElement('option');
      option.value = `${currentYear}-${month}`;
      option.textContent = `Tháng ${parseInt(month)}/${currentYear}`;
      monthSelect.appendChild(option);
    });
  }
});

// ===== NAVIGATION =====
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  document.getElementById('section-' + sectionName).classList.add('active');
  
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.nav-item').classList.add('active');
  
  // Load data for section
  loadSectionData(sectionName);
}

function toggleSidebar() {
  document.querySelector('.admin-sidebar').classList.toggle('open');
}

// ===== LOAD SECTION DATA =====
function loadSectionData(sectionName) {
  switch(sectionName) {
    case 'dashboard':
      loadDashboardStats();
      loadRecentBookings();
      break;
    case 'employees':
      loadEmployees();
      break;
    case 'courts':
      loadCourts();
      break;
    case 'court-types':
      loadCourtTypes();
      break;
    case 'bookings':
      loadBookings();
      break;
    case 'users':
      loadUsers();
      break;
    case 'revenue':
      loadRevenue();
      break;
    case 'reports':
      // Reports page doesn't need to load data initially
      break;
  }
}

// ===== DASHBOARD =====
function loadDashboardStats() {
  // In real app, fetch from API
  // For demo, use mock data
  
  fetch('api/dashboard-stats.php')
    .then(response => response.json())
    .then(data => {
      document.getElementById('todayRevenue').textContent = formatCurrency(data.todayRevenue || 0);
      document.getElementById('todayBookings').textContent = data.todayBookings || 0;
      document.getElementById('activeCourts').textContent = data.activeCourts || 0;
      document.getElementById('totalUsers').textContent = data.totalUsers || 0;
    })
    .catch(error => {
      console.error('Error loading dashboard stats:', error);
      // Use mock data
      document.getElementById('todayRevenue').textContent = '2.500.000đ';
      document.getElementById('todayBookings').textContent = '8';
      document.getElementById('activeCourts').textContent = '12';
      document.getElementById('totalUsers').textContent = '156';
    });
}

function loadRecentBookings() {
  fetch('api/recent-bookings.php')
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById('recentBookingsTable');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có đơn đặt sân nào</td></tr>';
        return;
      }
      
      data.forEach(booking => {
        const row = `
          <tr>
            <td>#${booking.id}</td>
            <td>${booking.customerName}</td>
            <td>${booking.courtName}</td>
            <td>${booking.date}</td>
            <td>${booking.timeSlot}</td>
            <td>${formatCurrency(booking.price)}</td>
            <td><span class="status-badge ${booking.status}">${getStatusText(booking.status)}</span></td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    })
    .catch(error => {
      console.error('Error loading recent bookings:', error);
      // Mock data
      const mockData = [
        { id: 'BK001', customerName: 'Nguyễn Văn A', courtName: 'Sân 1', date: '25/10/2025', timeSlot: '18:00-20:00', price: 300000, status: 'confirmed' },
        { id: 'BK002', customerName: 'Trần Thị B', courtName: 'Sân 2', date: '25/10/2025', timeSlot: '16:00-18:00', price: 300000, status: 'confirmed' },
      ];
      
      const tbody = document.getElementById('recentBookingsTable');
      tbody.innerHTML = '';
      mockData.forEach(booking => {
        const row = `
          <tr>
            <td>#${booking.id}</td>
            <td>${booking.customerName}</td>
            <td>${booking.courtName}</td>
            <td>${booking.date}</td>
            <td>${booking.timeSlot}</td>
            <td>${formatCurrency(booking.price)}</td>
            <td><span class="status-badge ${booking.status}">${getStatusText(booking.status)}</span></td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    });
}

// ===== EMPLOYEES =====
let allEmployeesData = []; // Lưu toàn bộ dữ liệu nhân viên
let attendanceData = {}; // Lưu dữ liệu chấm công

function loadEmployees() {
  const today = new Date().toISOString().split('T')[0];
  
  // Load nhân viên và trạng thái chấm công
  Promise.all([
    fetch('api/employees.php').then(r => r.json()),
    fetch(`api/chamcong.php?ngay=${today}`).then(r => r.json())
  ])
  .then(([employees, attendance]) => {
    allEmployeesData = employees;
    
    // Tạo map trạng thái chấm công
    attendanceData = {};
    attendance.forEach(item => {
      attendanceData[item.id_nv] = item;
    });
    
    displayEmployees(employees);
  })
  .catch(error => {
    console.error('Error loading employees:', error);
    document.getElementById('employeesTable').innerHTML = '<tr><td colspan="6" class="text-center">Lỗi tải dữ liệu</td></tr>';
  });
}

function displayEmployees(employees) {
  const tbody = document.getElementById('employeesTable');
  tbody.innerHTML = '';
  
  if (employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không tìm thấy nhân viên nào</td></tr>';
    return;
  }
  
  employees.forEach((employee, index) => {
    const att = attendanceData[employee.id];
    const chamCongBtn = att && att.da_cham
      ? `<span class="status-badge confirmed">✅ ${att.gio_vao || ''}</span>`
      : `<button class="btn-action btn-success" onclick="chamCongNhanh(${employee.id})">✅ Chấm công</button>`;
    
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>NV${employee.id}</td>
        <td>${employee.name}</td>
        <td>${employee.phone || '-'}</td>
        <td>${employee.position || 'Nhân viên'}</td>
        <td>${chamCongBtn}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit" onclick="editEmployee(${employee.id})">✏️ Sửa</button>
            <button class="btn-action btn-delete" onclick="deleteEmployee(${employee.id})">🗑️ Xóa</button>
          </div>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

function searchEmployees() {
  const searchTerm = document.getElementById('searchEmployee').value.toLowerCase().trim();
  
  if (searchTerm === '') {
    displayEmployees(allEmployeesData);
    return;
  }
  
  // Lọc nhân viên theo tên
  const filtered = allEmployeesData.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm) ||
    (emp.phone && emp.phone.includes(searchTerm)) ||
    (emp.position && emp.position.toLowerCase().includes(searchTerm))
  );
  
  displayEmployees(filtered);
}

function openEmployeeModal(employeeId = null) {
  // Create modal for add/edit employee
  const modal = `
    <div class="modal-overlay" id="employeeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${employeeId ? '✏️ Sửa thông tin nhân viên' : '➕ Thêm nhân viên mới'}</h3>
          <button class="modal-close" onclick="closeModal('employeeModal')">×</button>
        </div>
        <div class="modal-body">
          <form id="employeeForm">
            <div class="form-field">
              <label>Họ tên *</label>
              <input type="text" id="employeeName" placeholder="Nhập họ tên" pattern="^[a-zA-ZÀ-ỹ\\s]+$" title="Tên chỉ được chứa chữ cái và khoảng trắng" minlength="1" required>
            </div>
            <div class="form-field">
              <label>Số điện thoại</label>
              <input type="tel" id="employeePhone" placeholder="Nhập số điện thoại" pattern="0[0-9]{9}" title="Số điện thoại phải có 10 số và bắt đầu bằng 0">
            </div>
            <div class="form-field">
              <label>Email</label>
              <input type="email" id="employeeEmail" placeholder="Nhập email">
            </div>
            <div class="form-field">
              <label>Chức vụ</label>
              <input type="text" id="employeePosition" placeholder="Nhập chức vụ">
            </div>
            <div class="form-field">
              <label>Lương/giờ (VNĐ)</label>
              <input type="number" id="employeeSalary" placeholder="Nhập lương/giờ" min="0" step="1000">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('employeeModal')">Hủy</button>
          <button class="btn btn-primary" onclick="saveEmployee(${employeeId})">💾 Lưu</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalContainer').innerHTML = modal;
  
  if (employeeId) {
    // Load employee data for editing
    loadEmployeeData(employeeId);
  }
}

function saveEmployee(employeeId) {
  const name = document.getElementById('employeeName').value.trim();
  const phone = document.getElementById('employeePhone').value.trim();
  const email = document.getElementById('employeeEmail').value.trim();
  const position = document.getElementById('employeePosition').value.trim();
  const salary = document.getElementById('employeeSalary').value.trim();
  
  // Validate tên: chỉ chữ cái và khoảng trắng
  const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
  if (!nameRegex.test(name)) {
    alert('❌ Tên chỉ được chứa chữ cái và khoảng trắng!');
    return;
  }
  
  if (name.length < 1) {
    alert('❌ Tên phải có ít nhất 1 ký tự!');
    return;
  }
  
  // Validate số điện thoại nếu có nhập
  if (phone && !/^0[0-9]{9}$/.test(phone)) {
    alert('❌ Số điện thoại không hợp lệ! Phải có 10 số và bắt đầu bằng 0.');
    return;
  }
  
  // Validate email nếu có nhập
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('❌ Email không hợp lệ!');
    return;
  }
  
  const formData = {
    name: name,
    phone: phone || '',
    email: email || '',
    position: position || 'Nhân viên',
    salary: salary || 0
  };
  
  const url = employeeId ? `api/employees.php?id=${employeeId}` : 'api/employees.php';
  const method = employeeId ? 'PUT' : 'POST';
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert(employeeId ? '✅ Cập nhật nhân viên thành công!' : '✅ Thêm nhân viên thành công!');
      closeModal('employeeModal');
      loadEmployees();
    } else {
      alert('❌ Lỗi: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error saving employee:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function editEmployee(id) {
  openEmployeeModal(id);
}

function deleteEmployee(id) {
  if (!confirm('⚠️ Bạn có chắc chắn muốn xóa nhân viên này?')) return;
  
  fetch(`api/employees.php?id=${id}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('✅ Xóa nhân viên thành công!');
        loadEmployees();
      } else {
        alert('❌ Lỗi: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error deleting employee:', error);
      alert('❌ Có lỗi xảy ra!');
    });
}

// ===== ATTENDANCE (CHẤM CÔNG) =====
function chamCongNhanh(id_nv) {
  const today = new Date().toISOString().split('T')[0];
  const gio_vao = new Date().toTimeString().slice(0,8);
  
  if (!confirm('Chấm công cho nhân viên này?\nGiờ vào: ' + gio_vao.slice(0,5))) return;
  
  fetch('api/chamcong.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_nv: id_nv,
      ngay: today,
      gio_vao: gio_vao,
      trang_thai: 'co_mat'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ ' + data.message);
      loadEmployees();
    } else {
      alert('❌ ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function showSalaryReport() {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
  
  const modal = `
    <div class="modal-overlay" id="salaryModal">
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h3>💰 Báo cáo lương nhân viên</h3>
          <button class="modal-close" onclick="closeModal('salaryModal')">×</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label>Chọn tháng:</label>
            <input type="month" id="salaryMonth" value="${currentMonth}" onchange="loadSalaryData()">
          </div>
          <div id="salaryContent" style="margin-top: 20px;">
            <p style="text-align: center; color: #666;">Đang tải dữ liệu...</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('salaryModal')">Đóng</button>
          <button class="btn btn-primary" onclick="printSalary()">🖨️ In báo cáo</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalContainer').innerHTML = modal;
  loadSalaryData();
}

function loadSalaryData() {
  const monthInput = document.getElementById('salaryMonth').value; // YYYY-MM
  const [year, month] = monthInput.split('-');
  const displayMonth = `${month}/${year}`;
  
  // Lấy danh sách nhân viên và chấm công tháng đó
  Promise.all([
    fetch('api/employees.php').then(r => r.json()),
    fetch(`api/chamcong.php?thang=${monthInput}`).then(r => r.json()).catch(() => [])
  ])
  .then(([employees, attendance]) => {
    // Đếm số ngày công của mỗi nhân viên
    const workDays = {};
    attendance.forEach(att => {
      if (att.trang_thai === 'co_mat') {
        workDays[att.id_nv] = (workDays[att.id_nv] || 0) + 1;
      }
    });
    
    let html = `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4 style="margin: 0; color: #2c3e50;">Tháng ${displayMonth}</h4>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Lương/giờ</th>
            <th>Số ngày công</th>
            <th>Số giờ</th>
            <th>Tổng lương</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    let total = 0;
    
    employees.forEach(emp => {
      const luongGio = parseFloat(emp.salary) || 30000;
      const soNgayCong = workDays[emp.id] || 0;
      const soGio = soNgayCong * 8;
      const tongLuong = luongGio * soGio;
      
      html += `
        <tr>
          <td><strong>${emp.name}</strong><br><small style="color: #666;">${emp.position || 'Nhân viên'}</small></td>
          <td>${formatCurrency(luongGio)}</td>
          <td style="text-align: center;">${soNgayCong} ngày</td>
          <td style="text-align: center;">${soGio}h</td>
          <td><strong style="color: #27ae60;">${formatCurrency(tongLuong)}</strong></td>
        </tr>
      `;
      
      total += tongLuong;
    });
    
    html += `
        </tbody>
        <tfoot>
          <tr style="background: #e8f5e9; font-weight: bold; font-size: 16px;">
            <td colspan="4" style="text-align: right; padding: 15px;">TỔNG LƯƠNG THÁNG:</td>
            <td style="color: #27ae60; font-size: 18px;">${formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    `;
    
    document.getElementById('salaryContent').innerHTML = html;
  })
  .catch(error => {
    console.error('Error:', error);
    document.getElementById('salaryContent').innerHTML = '<p style="text-align: center; color: #e74c3c;">❌ Có lỗi xảy ra khi tải dữ liệu!</p>';
  });
}

function printSalary() {
  window.print();
}

function loadAttendanceInline() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dateDisplay = today.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  document.getElementById('currentDate').textContent = dateDisplay;
  
  fetch(`api/chamcong.php?ngay=${dateStr}`)
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById('attendanceTableInline');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có nhân viên nào</td></tr>';
        return;
      }
      
      data.forEach(item => {
        const statusClass = item.trang_thai === 'co_mat' ? 'confirmed' : (item.trang_thai === 'vang' ? 'cancelled' : 'pending');
        const statusText = item.trang_thai === 'co_mat' ? '✅ Có mặt' : (item.trang_thai === 'vang' ? '❌ Vắng' : '🏖️ Nghỉ phép');
        
        const actionBtn = item.da_cham 
          ? `<button class="btn-action btn-warning" onclick="updateGioRa(${item.id_cc})">⏰ Giờ ra</button>
             <button class="btn-action btn-delete" onclick="deleteAttendance(${item.id_cc})">🗑️ Xóa</button>`
          : `<button class="btn-action btn-success" onclick="chamCong(${item.id_nv}, '${dateStr}')">✅ Chấm công</button>`;
        
        const row = `
          <tr>
            <td>${item.id_nv}</td>
            <td>${item.ho_ten}</td>
            <td>${item.chuc_vu || '-'}</td>
            <td>${item.gio_vao || '-'}</td>
            <td>${item.gio_ra || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
              <div class="action-buttons">
                ${actionBtn}
              </div>
            </td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    })
    .catch(error => {
      console.error('Error loading attendance:', error);
      document.getElementById('attendanceTableInline').innerHTML = '<tr><td colspan="7" class="text-center">Lỗi tải dữ liệu</td></tr>';
    });
}

function chamCong(id_nv, ngay) {
  const gio_vao = prompt('Nhập giờ vào (HH:MM):', new Date().toTimeString().slice(0,5));
  if (!gio_vao) return;
  
  fetch('api/chamcong.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_nv: id_nv,
      ngay: ngay,
      gio_vao: gio_vao + ':00',
      trang_thai: 'co_mat'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ ' + data.message);
      loadAttendanceInline();
    } else {
      alert('❌ ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function updateGioRa(id_cc) {
  const gio_ra = prompt('Nhập giờ ra (HH:MM):', new Date().toTimeString().slice(0,5));
  if (!gio_ra) return;
  
  fetch(`api/chamcong.php?id=${id_cc}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gio_ra: gio_ra + ':00'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ ' + data.message);
      loadAttendanceInline();
    } else {
      alert('❌ ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function deleteAttendance(id_cc) {
  if (!confirm('⚠️ Bạn có chắc chắn muốn xóa chấm công này?')) return;
  
  fetch(`api/chamcong.php?id=${id_cc}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('✅ ' + data.message);
        loadAttendanceInline();
      } else {
        alert('❌ ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('❌ Có lỗi xảy ra!');
    });
}

// ===== COURTS =====
let allCourtsData = []; // Lưu toàn bộ dữ liệu sân

function loadCourts() {
  fetch('api/courts.php')
    .then(response => response.json())
    .then(data => {
      allCourtsData = data;
      displayCourts(data);
    })
    .catch(error => {
      console.error('Error loading courts:', error);
      document.getElementById('courtsTable').innerHTML = '<tr><td colspan="7" class="text-center">Lỗi tải dữ liệu</td></tr>';
    });
}

function displayCourts(courts) {
  const tbody = document.getElementById('courtsTable');
  tbody.innerHTML = '';
  
  if (courts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không tìm thấy sân nào</td></tr>';
    return;
  }
  
  courts.forEach((court, index) => {
    const statusClass = court.status === 'trong' ? 'confirmed' : (court.status === 'dang_thue' ? 'pending' : 'cancelled');
    const statusText = court.status === 'trong' ? '✅ Trống' : (court.status === 'dang_thue' ? '🔄 Đang thuê' : '🔧 Bảo trì');
    
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>S${court.id}</td>
        <td>${court.name}</td>
        <td>${court.typeName}</td>
        <td>${court.description || '-'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit" onclick="editCourt(${court.id})">✏️ Sửa</button>
            <button class="btn-action btn-delete" onclick="deleteCourt(${court.id})">🗑️ Xóa</button>
          </div>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

function searchCourts() {
  const searchTerm = document.getElementById('searchCourt').value.toLowerCase().trim();
  const filterType = document.getElementById('filterCourtType').value;
  
  let filtered = allCourtsData;
  
  // Lọc theo tên sân
  if (searchTerm !== '') {
    filtered = filtered.filter(court => 
      court.name.toLowerCase().includes(searchTerm) ||
      court.typeName.toLowerCase().includes(searchTerm) ||
      (court.description && court.description.toLowerCase().includes(searchTerm))
    );
  }
  
  // Lọc theo loại sân
  if (filterType !== '') {
    filtered = filtered.filter(court => court.typeId == filterType);
  }
  
  displayCourts(filtered);
}

function filterCourtsByType() {
  searchCourts(); // Gọi lại hàm search để áp dụng cả filter
}

function openCourtModal(courtId = null) {
  // Load court types first
  fetch('api/court-types.php')
    .then(response => response.json())
    .then(courtTypes => {
      const courtTypeOptions = courtTypes.map(type => 
        `<option value="${type.id}">${type.name}</option>`
      ).join('');
      
      const modal = `
        <div class="modal-overlay" id="courtModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>${courtId ? '✏️ Sửa thông tin sân' : '➕ Thêm sân mới'}</h3>
              <button class="modal-close" onclick="closeModal('courtModal')">×</button>
            </div>
            <div class="modal-body">
              <form id="courtForm">
                <div class="form-field">
                  <label>Tên sân *</label>
                  <input type="text" id="courtName" placeholder="Nhập tên sân" required>
                </div>
                <div class="form-field">
                  <label>Loại sân *</label>
                  <select id="courtType" required>
                    <option value="">Chọn loại sân</option>
                    ${courtTypeOptions}
                  </select>
                </div>
                <div class="form-field">
                  <label>Mô tả</label>
                  <textarea id="courtDescription" rows="3" placeholder="Mô tả về sân..."></textarea>
                </div>
                <div class="form-field">
                  <label>Trạng thái *</label>
                  <select id="courtStatus" required>
                    <option value="trong">✅ Trống</option>
                    <option value="dang_thue">🔄 Đang thuê</option>
                    <option value="bao_tri">🔧 Bảo trì</option>
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="closeModal('courtModal')">Hủy</button>
              <button class="btn btn-primary" onclick="saveCourt(${courtId})">💾 Lưu</button>
            </div>
          </div>
        </div>
      `;
      
      document.getElementById('modalContainer').innerHTML = modal;
      
      if (courtId) {
        loadCourtData(courtId);
      }
    })
    .catch(error => {
      console.error('Error loading court types:', error);
      alert('❌ Không thể tải danh sách loại sân!');
    });
}

function loadCourtData(courtId) {
  fetch(`api/courts.php?id=${courtId}`)
    .then(response => response.json())
    .then(court => {
      document.getElementById('courtName').value = court.name;
      document.getElementById('courtType').value = court.typeId;
      document.getElementById('courtDescription').value = court.description || '';
      document.getElementById('courtStatus').value = court.status;
    })
    .catch(error => {
      console.error('Error loading court data:', error);
      alert('❌ Không thể tải thông tin sân!');
    });
}

function saveCourt(courtId) {
  const formData = {
    name: document.getElementById('courtName').value,
    typeId: document.getElementById('courtType').value,
    description: document.getElementById('courtDescription').value,
    status: document.getElementById('courtStatus').value
  };
  
  const url = courtId ? `api/courts.php?id=${courtId}` : 'api/courts.php';
  const method = courtId ? 'PUT' : 'POST';
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert(courtId ? '✅ Cập nhật sân thành công!' : '✅ Thêm sân thành công!');
      closeModal('courtModal');
      loadCourts();
    } else {
      alert('❌ Lỗi: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error saving court:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function editCourt(id) {
  openCourtModal(id);
}

function deleteCourt(id) {
  if (!confirm('⚠️ Bạn có chắc chắn muốn xóa sân này?')) return;
  
  fetch(`api/courts.php?id=${id}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('✅ Xóa sân thành công!');
        loadCourts();
      } else {
        alert('❌ Lỗi: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error deleting court:', error);
      alert('❌ Có lỗi xảy ra!');
    });
}

function toggleCourtStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const statusText = newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa';
  
  if (!confirm(`⚠️ Bạn có chắc chắn muốn ${statusText} sân này?`)) return;
  
  fetch(`api/courts.php?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert(`✅ ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} sân thành công!`);
      loadCourts();
    } else {
      alert('❌ Lỗi: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error toggling court status:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

// ===== COURT TYPES =====
function loadCourtTypes() {
  fetch('api/court-types.php')
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById('courtTypesTable');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có loại sân nào</td></tr>';
        return;
      }
      
      data.forEach((type, index) => {
        const row = `
          <tr>
            <td>${index + 1}</td>
            <td>LS${type.id}</td>
            <td>${type.name}</td>
            <td>${formatCurrency(type.price)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn-action btn-edit" onclick="editCourtType(${type.id})">✏️ Sửa</button>
                <button class="btn-action btn-delete" onclick="deleteCourtType(${type.id})">🗑️ Xóa</button>
              </div>
            </td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    })
    .catch(error => {
      console.error('Error loading court types:', error);
      document.getElementById('courtTypesTable').innerHTML = '<tr><td colspan="6" class="text-center">❌ Không thể tải dữ liệu loại sân</td></tr>';
    });
}

function openCourtTypeModal(courtTypeId = null) {
  const modal = `
    <div class="modal-overlay" id="courtTypeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${courtTypeId ? '✏️ Sửa loại sân' : '➕ Thêm loại sân mới'}</h3>
          <button class="modal-close" onclick="closeModal('courtTypeModal')">×</button>
        </div>
        <div class="modal-body">
          <form id="courtTypeForm">
            <div class="form-field">
              <label>Tên loại sân *</label>
              <input type="text" id="courtTypeName" placeholder="Nhập tên loại sân" required>
            </div>
            <div class="form-field">
              <label>Giá thuê/giờ (VNĐ) *</label>
              <input type="number" id="courtTypePrice" placeholder="Nhập giá thuê/giờ" min="0" step="1000" required>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('courtTypeModal')">Hủy</button>
          <button class="btn btn-primary" onclick="saveCourtType(${courtTypeId})">💾 Lưu</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalContainer').innerHTML = modal;
  
  if (courtTypeId) {
    loadCourtTypeData(courtTypeId);
  }
}

function loadCourtTypeData(courtTypeId) {
  fetch(`api/court-types.php?id=${courtTypeId}`)
    .then(response => response.json())
    .then(type => {
      document.getElementById('courtTypeName').value = type.name;
      document.getElementById('courtTypePrice').value = type.price;
    })
    .catch(error => {
      console.error('Error loading court type data:', error);
      alert('❌ Không thể tải thông tin loại sân!');
    });
}

function saveCourtType(courtTypeId) {
  const formData = {
    name: document.getElementById('courtTypeName').value,
    price: parseFloat(document.getElementById('courtTypePrice').value)
  };
  
  if (!formData.name || formData.price <= 0) {
    alert('❌ Vui lòng điền đầy đủ thông tin!');
    return;
  }
  
  const url = courtTypeId ? `api/court-types.php?id=${courtTypeId}` : 'api/court-types.php';
  const method = courtTypeId ? 'PUT' : 'POST';
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert(courtTypeId ? '✅ Cập nhật loại sân thành công!' : '✅ Thêm loại sân thành công!');
      closeModal('courtTypeModal');
      loadCourtTypes();
    } else {
      alert('❌ Lỗi: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error saving court type:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function editCourtType(id) {
  openCourtTypeModal(id);
}

function deleteCourtType(id) {
  if (!confirm('⚠️ Bạn có chắc chắn muốn xóa loại sân này?\n\nLưu ý: Không thể xóa nếu có sân đang sử dụng loại này.')) return;
  
  fetch(`api/court-types.php?id=${id}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('✅ Xóa loại sân thành công!');
        loadCourtTypes();
      } else {
        alert('❌ Lỗi: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error deleting court type:', error);
      alert('❌ Có lỗi xảy ra!');
    });
}

// ===== BOOKINGS =====
let allBookingsData = []; // Lưu toàn bộ dữ liệu đơn đặt

function loadBookings() {
  fetch('api/bookings.php')
    .then(response => response.json())
    .then(data => {
      allBookingsData = data;
      displayBookings(data);
    })
    .catch(error => {
      console.error('Error loading bookings:', error);
      document.getElementById('bookingsTable').innerHTML = '<tr><td colspan="9" class="text-center">Lỗi tải dữ liệu</td></tr>';
    });
}

function displayBookings(bookings) {
  const tbody = document.getElementById('bookingsTable');
  tbody.innerHTML = '';
  
  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Không tìm thấy đơn đặt nào</td></tr>';
    return;
  }
  
  bookings.forEach((booking, index) => {
    const statusClass = booking.status === 'da_duyet' ? 'confirmed' : (booking.status === 'huy' ? 'cancelled' : 'pending');
    const statusText = booking.status === 'da_duyet' ? '✅ Đã duyệt' : (booking.status === 'huy' ? '❌ Đã hủy' : '⏳ Chờ duyệt');
    
    // Nút thao tác tùy theo trạng thái
    let actionButtons = '';
    if (booking.status === 'cho_duyet') {
      actionButtons = `
        <button class="btn-action btn-success" onclick="approveBooking(${booking.id})">✅ Duyệt</button>
        <button class="btn-action btn-delete" onclick="cancelBooking(${booking.id})">❌ Hủy</button>
      `;
    } else if (booking.status === 'da_duyet') {
      actionButtons = `
        <button class="btn-action btn-delete" onclick="cancelBooking(${booking.id})">❌ Hủy đơn</button>
      `;
    } else {
      actionButtons = '<span style="color: #999;">Đã hủy</span>';
    }
    
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>DH${booking.id}</td>
        <td>${booking.customerName || '-'}</td>
        <td>${booking.courtName || '-'}</td>
        <td>${booking.date || '-'}</td>
        <td>${booking.time || '-'}</td>
        <td>${formatCurrency(booking.price || 0)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-buttons">
            ${actionButtons}
          </div>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

function searchBookings() {
  const searchTerm = document.getElementById('searchBooking').value.toLowerCase().trim();
  const filterStatus = document.getElementById('filterBookingStatus').value;
  const filterDate = document.getElementById('filterBookingDate').value;
  
  let filtered = allBookingsData;
  
  // Lọc theo tìm kiếm
  if (searchTerm !== '') {
    filtered = filtered.filter(booking => 
      ('DH' + booking.id).toLowerCase().includes(searchTerm) ||
      (booking.customerName && booking.customerName.toLowerCase().includes(searchTerm)) ||
      (booking.courtName && booking.courtName.toLowerCase().includes(searchTerm))
    );
  }
  
  // Lọc theo trạng thái
  if (filterStatus !== '') {
    filtered = filtered.filter(booking => booking.status === filterStatus);
  }
  
  // Lọc theo ngày
  if (filterDate !== '') {
    const selectedDate = new Date(filterDate).toLocaleDateString('vi-VN');
    filtered = filtered.filter(booking => booking.date === selectedDate);
  }
  
  displayBookings(filtered);
}

function filterBookings() {
  searchBookings(); // Gọi lại hàm search để áp dụng filter
}

function approveBooking(id) {
  if (!confirm('Xác nhận duyệt đơn đặt sân này?')) return;
  
  fetch(`api/bookings.php?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'da_duyet' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ ' + data.message);
      loadBookings();
    } else {
      alert('❌ ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function cancelBooking(id) {
  if (!confirm('⚠️ Bạn có chắc chắn muốn hủy đơn đặt này?')) return;
  
  fetch(`api/bookings.php?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'huy' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ ' + data.message);
      loadBookings();
    } else {
      alert('❌ ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

// ===== USERS =====
function loadUsers() {
  fetch('api/users.php')
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById('usersTable');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có người dùng nào</td></tr>';
        return;
      }
      
      data.forEach((user, index) => {
        const statusClass = user.status === 'active' ? 'confirmed' : 'cancelled';
        const statusText = user.status === 'active' ? '✅ Hoạt động' : '🔒 Đã khóa';
        
        const lockBtn = user.status === 'active'
          ? `<button class="btn-action btn-warning" onclick="lockUser(${user.id})">🔒 Khóa</button>`
          : `<button class="btn-action btn-success" onclick="unlockUser(${user.id})">🔓 Mở khóa</button>`;
        
        const row = `
          <tr>
            <td>${index + 1}</td>
            <td>TK${user.id}</td>
            <td>${user.username}</td>
            <td>${user.name || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>${user.phone || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
              <div class="action-buttons">
                ${lockBtn}
                <button class="btn-action btn-delete" onclick="deleteUser(${user.id})">🗑️ Xóa</button>
              </div>
            </td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    })
    .catch(error => {
      console.error('Error loading users:', error);
      document.getElementById('usersTable').innerHTML = '<tr><td colspan="8" class="text-center">Lỗi tải dữ liệu</td></tr>';
    });
}

function lockUser(id) {
  if (!confirm('⚠️ Bạn có chắc chắn muốn khóa tài khoản này?')) return;
  
  fetch(`api/users.php?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'locked' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ ' + data.message);
      loadUsers();
    } else {
      alert('❌ ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function unlockUser(id) {
  if (!confirm('Bạn có chắc chắn muốn mở khóa tài khoản này?')) return;
  
  fetch(`api/users.php?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'active' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('✅ ' + data.message);
      loadUsers();
    } else {
      alert('❌ ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('❌ Có lỗi xảy ra!');
  });
}

function deleteUser(id) {
  if (!confirm('⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa tài khoản này?\nHành động này không thể hoàn tác!')) return;
  
  fetch(`api/users.php?id=${id}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('✅ ' + data.message);
        loadUsers();
      } else {
        alert('❌ ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('❌ Có lỗi xảy ra!');
    });
}

// ===== REVENUE =====
function loadRevenue() {
  document.getElementById('monthRevenue').textContent = '15.000.000đ';
  document.getElementById('monthBookings').textContent = '45';
  document.getElementById('avgRevenue').textContent = '333.333đ';
  
  // Load chart
  const ctx = document.getElementById('revenueChart');
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: [1200000, 1900000, 1500000, 2200000, 1800000, 2500000, 2100000],
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
}

function filterRevenue(type) {
  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Load revenue data based on filter
  console.log('Filter revenue by:', type);
}

// ===== REPORTS =====
function exportRevenueReport() {
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;
  
  if (!startDate || !endDate) {
    alert('⚠️ Vui lòng chọn khoảng thời gian!');
    return;
  }
  
  window.location.href = `api/export-revenue.php?start=${startDate}&end=${endDate}`;
}

function exportBookingReport() {
  const startDate = document.getElementById('bookingReportStartDate').value;
  const endDate = document.getElementById('bookingReportEndDate').value;
  
  if (!startDate || !endDate) {
    alert('⚠️ Vui lòng chọn khoảng thời gian!');
    return;
  }
  
  window.location.href = `api/export-bookings.php?start=${startDate}&end=${endDate}`;
}

function exportCourtReport() {
  const month = document.getElementById('courtReportMonth').value;
  
  if (!month) {
    alert('⚠️ Vui lòng chọn tháng!');
    return;
  }
  
  window.location.href = `api/export-court-usage.php?month=${month}`;
}

function exportCustomerReport() {
  window.location.href = 'api/export-customers.php';
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

function getStatusText(status) {
  const statusMap = {
    'confirmed': 'Đã xác nhận',
    'cancelled': 'Đã hủy',
    'completed': 'Hoàn thành',
    'pending': 'Chờ xác nhận'
  };
  return statusMap[status] || status;
}


function closeModal(modalId) {
  document.getElementById(modalId).remove();
}

