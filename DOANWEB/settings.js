// ===== SETTINGS PAGE - Quản lý thông tin tài khoản =====

// Toast notification function
function showToast(title, message, type = "error") {
  const oldToast = document.querySelector(".toast-notification");
  if (oldToast) {
    oldToast.remove();
  }

  const icons = {
    error: "❌",
    success: "✅",
    warning: "⚠️",
    info: "ℹ️",
  };
  const toast = document.createElement("div");
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// Kiểm tra đăng nhập khi load trang
document.addEventListener('DOMContentLoaded', function() {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    alert('❌ Bạn cần đăng nhập để truy cập trang này!');
    sessionStorage.setItem('returnUrl', window.location.href);
    window.location.href = 'dang-nhap.html';
    return;
  }
  
  // Load thông tin user vào form
  loadUserProfile(currentUser);
});

// Load thông tin user vào form
function loadUserProfile(user) {
  document.getElementById('profileName').value = user.name || '';
  document.getElementById('profileEmail').value = user.email || '';
  document.getElementById('profilePhone').value = user.phone || '';
  
  // Format ngày tham gia
  if (user.createdAt) {
    const date = new Date(user.createdAt);
    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    document.getElementById('profileJoinDate').value = formattedDate;
  }
}

// ===== XỬ LÝ CẬP NHẬT THÔNG TIN CÁ NHÂN =====
document.getElementById('profileForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const name = document.getElementById('profileName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  
  // Validate họ tên
  const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
  if (!nameRegex.test(name)) {
    const nameInput = document.getElementById('profileName');
    nameInput.style.borderColor = '#ef4444';
    nameInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
    nameInput.focus();

    showToast(
      'Họ tên không hợp lệ',
      'Họ tên chỉ được chứa chữ cái và khoảng trắng',
      'error'
    );

    setTimeout(() => {
      nameInput.style.borderColor = '';
      nameInput.style.boxShadow = '';
    }, 3000);
    return;
  }
  
  // Validate số điện thoại
  const phoneRegex = /^0[0-9]{9}$/;
  if (!phoneRegex.test(phone)) {
    const phoneInput = document.getElementById('profilePhone');
    phoneInput.style.borderColor = '#ef4444';
    phoneInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
    phoneInput.focus();

    showToast(
      'Số điện thoại không hợp lệ',
      'Số điện thoại phải có 10 số và bắt đầu bằng 0',
      'error'
    );

    setTimeout(() => {
      phoneInput.style.borderColor = '';
      phoneInput.style.boxShadow = '';
    }, 3000);
    return;
  }
  
  // Kiểm tra số điện thoại đã được dùng bởi user khác chưa
  const users = getUsers();
  const phoneExists = users.some(u => u.phone === phone && u.id !== currentUser.id);
  
  if (phoneExists) {
    showToast(
      'Số điện thoại đã tồn tại',
      'Số điện thoại này đã được sử dụng bởi tài khoản khác',
      'error'
    );
    return;
  }
  
  // Cập nhật thông tin user trong danh sách users
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex].name = name;
    users[userIndex].phone = phone;
    saveUsers(users);
    
    // Cập nhật current user
    currentUser.name = name;
    currentUser.phone = phone;
    setCurrentUser(currentUser);
    
    showToast(
      'Cập nhật thành công',
      'Thông tin cá nhân đã được cập nhật',
      'success'
    );
    
    // Reload trang sau 1 giây để cập nhật header
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
});

// ===== XỬ LÝ ĐỔI MẬT KHẨU =====
document.getElementById('passwordForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  
  // Validate
  if (newPassword.length < 6) {
    showToast(
      'Mật khẩu quá ngắn',
      'Mật khẩu mới phải có ít nhất 6 ký tự',
      'error'
    );
    return;
  }
  
  if (newPassword !== confirmNewPassword) {
    showToast(
      'Mật khẩu không khớp',
      'Mật khẩu mới và xác nhận mật khẩu không giống nhau',
      'error'
    );
    return;
  }
  
  // Lấy user từ danh sách để kiểm tra mật khẩu hiện tại
  const users = getUsers();
  const user = users.find(u => u.id === currentUser.id);
  
  if (!user) {
    showToast('Lỗi', 'Không tìm thấy thông tin tài khoản', 'error');
    return;
  }
  
  if (user.password !== currentPassword) {
    const currentPwdInput = document.getElementById('currentPassword');
    currentPwdInput.style.borderColor = '#ef4444';
    currentPwdInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
    currentPwdInput.focus();

    showToast(
      'Mật khẩu không đúng',
      'Mật khẩu hiện tại không chính xác',
      'error'
    );

    setTimeout(() => {
      currentPwdInput.style.borderColor = '';
      currentPwdInput.style.boxShadow = '';
    }, 3000);
    return;
  }
  
  // Cập nhật mật khẩu
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex].password = newPassword;
    saveUsers(users);
    
    showToast(
      'Đổi mật khẩu thành công',
      'Mật khẩu của bạn đã được cập nhật',
      'success'
    );
    
    // Reset form
    document.getElementById('passwordForm').reset();
  }
});

// ===== XÓA TÀI KHOẢN =====
function deleteAccount() {
  const confirmed = confirm(
    '⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa tài khoản?\n\n' +
    'Hành động này sẽ:\n' +
    '• Xóa vĩnh viễn tất cả thông tin cá nhân\n' +
    '• Xóa tất cả lịch sử đặt sân\n' +
    '• Không thể hoàn tác\n\n' +
    'Nhấn OK để xác nhận xóa tài khoản.'
  );
  
  if (!confirmed) return;
  
  // Xác nhận lần 2
  const finalConfirm = confirm(
    '🚨 XÁC NHẬN LẦN CUỐI\n\n' +
    'Bạn THỰC SỰ muốn xóa tài khoản vĩnh viễn?\n' +
    'Nhấn OK để tiếp tục.'
  );
  
  if (!finalConfirm) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  // Xóa user khỏi danh sách
  let users = getUsers();
  users = users.filter(u => u.id !== currentUser.id);
  saveUsers(users);
  
  // Xóa current user
  localStorage.removeItem('sportbooking_current_user');
  
  alert('✅ Tài khoản đã được xóa thành công.\n\nCảm ơn bạn đã sử dụng SportBooking!');
  
  // Chuyển về trang chủ
  window.location.href = 'index.html';
}
