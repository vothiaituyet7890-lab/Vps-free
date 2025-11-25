// ===== QUẢN LÝ TÀI KHOẢN =====
console.log('🔵 auth.js loaded!');

// ===== Cookie helpers =====
function setCookie(name, value, days) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    const expires = 'expires=' + d.toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + ';' + expires + ';path=/';
  } catch (e) {}
}

function getCookie(name) {
  try {
    const cname = name + '=';
    const decoded = document.cookie.split(';');
    for (let c of decoded) {
      c = c.trim();
      if (c.indexOf(cname) === 0) return decodeURIComponent(c.substring(cname.length));
    }
  } catch (e) {}
  return null;
}

function deleteCookie(name) {
  try { document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; } catch (e) {}
}

// Lấy danh sách users từ localStorage
function getUsers() {
  const users = localStorage.getItem('sportbooking_users');
  return users ? JSON.parse(users) : [];
}

// Lưu danh sách users vào localStorage
function saveUsers(users) {
  localStorage.setItem('sportbooking_users', JSON.stringify(users));
}

// Lấy user đang đăng nhập
function getCurrentUser() {
  try {
    // 1. Kiểm tra trong localStorage trước
    const localStorageUser = localStorage.getItem('sportbooking_current_user');
    if (localStorageUser) {
      const userData = JSON.parse(localStorageUser);
      // Chấp nhận các bản ghi legacy thiếu 1 số field, miễn có id hoặc email hoặc name
      if (userData && (userData.id || userData.email || userData.name)) {
        console.log('🔑 Loaded user from localStorage:', userData.email);
        return userData;
      } else {
        console.warn('⚠️ User data missing fields in localStorage, will try sessionStorage');
      }
    }
    
    // 2. Nếu không có trong localStorage, kiểm tra sessionStorage
    const sessionUser = sessionStorage.getItem('sportbooking_current_user');
    if (sessionUser) {
      const userData = JSON.parse(sessionUser);
      // Chấp nhận dữ liệu nếu có id hoặc email hoặc name
      if (userData && (userData.id || userData.email || userData.name)) {
        console.log('🔑 Loaded user from sessionStorage:', userData.email);
        // Đồng bộ lên localStorage để duy trì đăng nhập
        localStorage.setItem('sportbooking_current_user', sessionUser);
        return userData;
      } else {
        console.warn('⚠️ Invalid user data in sessionStorage');
      }
    }

    // 3. Fallback: kiểm tra cookie (trong trường hợp storage bị reset do điều hướng)
    const cookieUser = getCookie('sb_current_user');
    if (cookieUser) {
      try {
        const userData = JSON.parse(cookieUser);
        if (userData && (userData.id || userData.email || userData.name)) {
          // Đồng bộ lại lên storage để các trang khác sử dụng
          const userString = JSON.stringify(userData);
          localStorage.setItem('sportbooking_current_user', userString);
          sessionStorage.setItem('sportbooking_current_user', userString);
          console.log('🔑 Restored user from cookie');
          return userData;
        }
      } catch (e) {
        // Cookie hỏng thì xóa
        deleteCookie('sb_current_user');
      }
    }
    
    console.log('ℹ️ No active user session found');
    return null;
    
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    // Xóa dữ liệu không hợp lệ nếu có
    localStorage.removeItem('sportbooking_current_user');
    sessionStorage.removeItem('sportbooking_current_user');
    return null;
  }
}

// Lưu thông tin user đang đăng nhập
function setCurrentUser(user) {
  try {
    if (!user || !user.id || !user.email) {
      console.error('❌ Không thể lưu thông tin user không hợp lệ:', user);
      return false;
    }
    
    // Lưu đầy đủ thông tin user cần thiết
    const userData = {
      id: user.id,
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      role: (user.role ? String(user.role) : 'user').trim().toLowerCase(),
      // Thêm thời gian hết hạn (30 ngày kể từ bây giờ)
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Chuyển đổi thành chuỗi JSON
    const userString = JSON.stringify(userData);
    
    // Lưu vào cả localStorage (để duy trì đăng nhập)
    localStorage.setItem('sportbooking_current_user', userString);
    
    // Và sessionStorage (cho phiên làm việc hiện tại)
    sessionStorage.setItem('sportbooking_current_user', userString);

    // Lưu cookie (30 ngày) để dự phòng khi storage bị clear giữa các trang
    setCookie('sb_current_user', userString, 30);
    
    console.log('✅ Đã lưu thông tin đăng nhập cho:', user.email);
    
    // Cập nhật giao diện người dùng
    updateUserUI(userData);
    
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi lưu thông tin đăng nhập:', error);
    return false;
  }
}

// Đăng xuất
function logout() {
  // Xóa tất cả dữ liệu đăng nhập
  localStorage.removeItem('sportbooking_current_user');
  sessionStorage.removeItem('sportbooking_current_user');
  deleteCookie('sb_current_user');
  
  // Xóa các dữ liệu tạm thời
  sessionStorage.removeItem('returnUrl');
  
  console.log('✅ Đã đăng xuất thành công');
  
  // Chuyển về trang chủ
  window.location.href = 'index.html';
}

// Kiểm tra email đã tồn tại chưa
function isEmailExists(email) {
  const users = getUsers();
  return users.some(user => user.email.toLowerCase() === email.toLowerCase());
}

// Kiểm tra số điện thoại đã tồn tại chưa
function isPhoneExists(phone) {
  const users = getUsers();
  return users.some(user => user.phone === phone);
}

// Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate số điện thoại (Việt Nam: 10 số, bắt đầu bằng 0)
function isValidPhone(phone) {
  // Loại bỏ khoảng trắng và ký tự đặc biệt
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Kiểm tra: phải là 10 số, bắt đầu bằng 0
  const phoneRegex = /^0[0-9]{9}$/;
  return phoneRegex.test(cleanPhone);
}

// Làm sạch số điện thoại (loại bỏ ký tự không phải số)
function cleanPhoneNumber(phone) {
  return phone.replace(/\D/g, '');
}

// ===== XỬ LÝ ĐĂNG KÝ =====
if (document.getElementById('registerForm')) {
  // Chặn autofill cho form đăng ký
  document.addEventListener('DOMContentLoaded', function () {
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const phoneInput = document.getElementById('registerPhone');
    const pwInput = document.getElementById('registerPassword');
    const cpwInput = document.getElementById('registerConfirmPassword');

    const protect = (el, autocompleteValue) => {
      if (!el) return;
      el.value = '';
      if (autocompleteValue) el.setAttribute('autocomplete', autocompleteValue);
      el.readOnly = true;
      el.addEventListener('focus', () => { el.readOnly = false; }, { once: true });
    };

    protect(nameInput, 'off');
    protect(emailInput, 'off');
    protect(phoneInput, 'off');
    protect(pwInput, 'new-password');
    protect(cpwInput, 'new-password');

    // Xóa lại nhiều lần để chặn autofill trễ
    [50, 300, 1000].forEach(t => setTimeout(() => {
      if (nameInput) nameInput.value = '';
      if (emailInput) emailInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (pwInput) pwInput.value = '';
      if (cpwInput) cpwInput.value = '';
    }, t));
  });

  document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validate
    if (!name || !email || !phone || !password) {
      alert('❌ Vui lòng điền đầy đủ thông tin!');
      return;
    }
    
    if (!isValidEmail(email)) {
      alert('❌ Email không hợp lệ!');
      return;
    }
    
    // Làm sạch số điện thoại
    const cleanedPhone = cleanPhoneNumber(phone);
    
    if (!isValidPhone(cleanedPhone)) {
      // Highlight ô input bị lỗi
      const phoneInput = document.getElementById('registerPhone');
      phoneInput.style.borderColor = '#ef4444';
      phoneInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
      phoneInput.focus();
      
      alert('❌ Số điện thoại không hợp lệ!\n\nSố điện thoại Việt Nam phải có 10 chữ số và bắt đầu bằng số 0.\nVí dụ: 0912345678');
      
      // Reset style sau 3 giây
      setTimeout(() => {
        phoneInput.style.borderColor = '';
        phoneInput.style.boxShadow = '';
      }, 3000);
      
      return;
    }
    
    if (password.length < 6) {
      alert('❌ Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('❌ Mật khẩu xác nhận không khớp!');
      return;
    }
    
    if (!agreeTerms) {
      alert('❌ Bạn phải đồng ý với điều khoản dịch vụ!');
      return;
    }
    
    // Gọi API PHP để đăng ký
    fetch('api/register.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: cleanedPhone,
        password: password
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Lưu thông tin user vào localStorage
        setCurrentUser(data.user);
        
        alert(`✅ ${data.message}\n\nChào mừng bạn đến với SportBooking!`);
        
        // Chuyển về trang đặt sân hoặc trang chủ
        const returnUrl = sessionStorage.getItem('returnUrl') || 'index.html';
        sessionStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
      } else {
        alert('❌ ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('❌ Có lỗi xảy ra khi đăng ký!');
    });
  });
}

// ===== XỬ LÝ ĐĂNG NHẬP =====
if (document.getElementById('loginForm')) {
  // Kiểm tra xem có phải là lần đăng xuất không
  const isLogout = new URLSearchParams(window.location.search).has('logout');
  
  // Nếu là đăng xuất thì xóa thông tin đăng nhập đã lưu
  if (isLogout) {
    localStorage.removeItem('sportbooking_remember_me');
    localStorage.removeItem('sportbooking_identifier');
  }
  
  // Tự động điền thông tin đăng nhập nếu có và không phải là đăng xuất
  document.addEventListener('DOMContentLoaded', function() {
    // Chỉ điền thông tin nếu không phải là trang đăng xuất
    if (!isLogout) {
      const rememberMe = localStorage.getItem('sportbooking_remember_me') === 'true';
      if (rememberMe) {
        const savedIdentifier = localStorage.getItem('sportbooking_identifier');
        if (savedIdentifier) {
          document.getElementById('loginIdentifier').value = savedIdentifier;
          document.getElementById('rememberMe').checked = true;
        }
      } else {
        // Không bật ghi nhớ -> luôn xóa sạch để tránh autofill của trình duyệt
        const idInput = document.getElementById('loginIdentifier');
        const pwInput = document.getElementById('loginPassword');
        const remember = document.getElementById('rememberMe');
        if (idInput) {
          idInput.value = '';
          idInput.setAttribute('autocomplete', 'off');
          idInput.readOnly = true;
          idInput.addEventListener('focus', () => { idInput.readOnly = false; }, { once: true });
        }
        if (pwInput) {
          pwInput.value = '';
          pwInput.setAttribute('autocomplete', 'new-password');
          pwInput.readOnly = true;
          pwInput.addEventListener('focus', () => { pwInput.readOnly = false; }, { once: true });
        }
        if (remember) remember.checked = false;
        // Một số trình duyệt vẫn autofill trễ, xóa lại sau một tick
        setTimeout(() => {
          if (idInput && (localStorage.getItem('sportbooking_remember_me') !== 'true')) idInput.value = '';
          if (pwInput && (localStorage.getItem('sportbooking_remember_me') !== 'true')) pwInput.value = '';
        }, 50);
        setTimeout(() => {
          if (idInput && (localStorage.getItem('sportbooking_remember_me') !== 'true')) idInput.value = '';
          if (pwInput && (localStorage.getItem('sportbooking_remember_me') !== 'true')) pwInput.value = '';
        }, 300);
        setTimeout(() => {
          if (idInput && (localStorage.getItem('sportbooking_remember_me') !== 'true')) idInput.value = '';
          if (pwInput && (localStorage.getItem('sportbooking_remember_me') !== 'true')) pwInput.value = '';
        }, 1000);
      }
    } else {
      // Nếu là đăng xuất thì chắc chắn xóa form và trạng thái ghi nhớ trên UI
      const idInput = document.getElementById('loginIdentifier');
      const pwInput = document.getElementById('loginPassword');
      const remember = document.getElementById('rememberMe');
      if (idInput) idInput.value = '';
      if (pwInput) pwInput.value = '';
      if (remember) remember.checked = false;
    }
  });

  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    // Gửi yêu cầu đăng nhập đến API
    fetch('api/login.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: identifier,
        password: password
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Nếu đăng nhập bằng username 'admin' thì gán vai trò admin chắc chắn
        const isAdminUsername = !!(identifier && identifier.trim().toLowerCase().startsWith('admin'));
        const isAdminByName = !!(data.user && data.user.name && String(data.user.name).trim().toLowerCase().startsWith('admin'));
        // Nếu đăng nhập bằng tài khoản nhân viên đặc biệt
        const isStaffSpecial = (identifier && identifier.trim().toLowerCase() === 'nhanvien' && String(password) === '123');
        const roleOverride = (isAdminUsername || isAdminByName) ? { role: 'admin' } : (isStaffSpecial ? { role: 'staff' } : {});
        const userPayload = Object.assign({}, data.user || {}, roleOverride);

        // Lưu thông tin người dùng
        setCurrentUser(userPayload);
        
        // Nếu chọn ghi nhớ đăng nhập
        if (rememberMe) {
          localStorage.setItem('sportbooking_remember_me', 'true');
          localStorage.setItem('sportbooking_identifier', identifier);
        } else {
          localStorage.removeItem('sportbooking_remember_me');
          localStorage.removeItem('sportbooking_identifier');
        }
        
        // Nếu là admin (theo role hoặc username) -> chuyển đến trang quản trị
        if ((userPayload && typeof userPayload.role === 'string' && userPayload.role.toLowerCase() === 'admin') || isAdminUsername || isAdminByName) {
          window.location.href = '/DOANWEB/admin.html';
          return;
        }

        // Nếu là nhân viên đặc biệt -> chuyển đến trang nhân viên (standalone)
        if (userPayload && typeof userPayload.role === 'string' && userPayload.role.toLowerCase() === 'staff') {
          window.location.href = '/DOANWEB/staff-bookings.html';
          return;
        }

        // Fallback: hỏi server để xác nhận vai trò từ DB (trường hợp client không nhận đúng role)
        if (userPayload && userPayload.id) {
          fetch('/DOANWEB/api/check-admin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userPayload.id })
          })
          .then(r => r.json())
          .then(check => {
            if (check && check.isAdmin) {
              window.location.href = '/DOANWEB/admin.html';
            } else {
              const returnUrl = sessionStorage.getItem('returnUrl') || 'index.html';
              sessionStorage.removeItem('returnUrl');
              window.location.href = returnUrl;
            }
          })
          .catch(() => {
            const returnUrl = sessionStorage.getItem('returnUrl') || 'index.html';
            sessionStorage.removeItem('returnUrl');
            window.location.href = returnUrl;
          });
          return;
        }

        // Người dùng thường: chuyển hướng về trang trước đó hoặc trang chủ
        const returnUrl = sessionStorage.getItem('returnUrl') || 'index.html';
        sessionStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
      } else {
        alert('❌ ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('❌ Có lỗi xảy ra khi đăng nhập!');
    });
  });
}

// ===== KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP =====
function checkLoginStatus() {
  const currentUser = getCurrentUser();
  return currentUser !== null;
}

function requireLogin() {
  const currentUser = getCurrentUser();
  
  // Nếu chưa đăng nhập
  if (!currentUser || !currentUser.id) {
    console.log('⚠️ Chưa đăng nhập, yêu cầu đăng nhập...');
    
    // Lưu URL hiện tại để quay lại sau khi đăng nhập
    const currentPath = window.location.pathname;
    if (currentPath !== '/login.html' && currentPath !== '/dangky.html') {
      sessionStorage.setItem('returnUrl', window.location.href);
    }
    
    // Chuyển đến trang đăng nhập
    window.location.href = 'login.html';
    return false;
  }
  
  console.log('✅ Đã đăng nhập với tài khoản:', currentUser.name);
  return true;
}

// Cập nhật giao diện người dùng dựa trên trạng thái đăng nhập
function updateUserUI(userData) {
  // Cập nhật header
  const loginLink = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const userMenu = document.getElementById('userMenu');
  const userNameDisplay = document.getElementById('userNameDisplay');
  
  if (userData) {
    // Đã đăng nhập
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (userMenu) userMenu.style.display = 'block';
    if (userNameDisplay) userNameDisplay.textContent = userData.name || userData.email;
  } else {
    // Chưa đăng nhập
    if (loginLink) loginLink.style.display = 'block';
    if (registerLink) registerLink.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
  }
}

// ===== CẬP NHẬT HEADER =====
document.addEventListener('DOMContentLoaded', function() {
  console.log('🟢 DOMContentLoaded - Checking user...');
  // Sử dụng hàm từ common.js để cập nhật menu
  if (typeof updateMenuState === 'function') {
    updateMenuState();
  }
  
  // Cập nhật giao diện người dùng
  const currentUser = getCurrentUser();
  updateUserUI(currentUser);
  
  console.log('🟢 Current user:', currentUser);
  // Nếu là admin và đang ở trang chủ -> tự động chuyển đến trang quản trị
  try {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const isOnAdmin = path.toLowerCase() === 'admin.html';
    const isOnStaff = path.toLowerCase() === 'staff.html' || path.toLowerCase() === 'staff-bookings.html';
    const isHome = path === '' || path.toLowerCase() === 'index.html';
    if (currentUser && typeof currentUser.role === 'string' && currentUser.role.toLowerCase() === 'admin' && !isOnAdmin && isHome) {
      window.location.replace('/DOANWEB/admin.html');
      return;
    }
    if (currentUser && typeof currentUser.role === 'string' && currentUser.role.toLowerCase() === 'staff' && !isOnStaff && isHome) {
      window.location.replace('/DOANWEB/staff-bookings.html');
      return;
    }
    // Luôn xác minh với server để đảm bảo quyền admin
    if (currentUser && currentUser.id) {
      fetch('/DOANWEB/api/check-admin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })
      .then(r => r.json())
      .then(check => {
        if (check && check.isAdmin && !isOnAdmin && isHome) {
          window.location.replace('/DOANWEB/admin.html');
        }
      })
      .catch(() => {});
    }
  } catch (e) {}
  // Sự kiện logout nếu có sẵn phần tử trong DOM (trường hợp trang đã render sẵn)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && !logoutBtn._bound) {
    logoutBtn._bound = true;
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
  
  // Menu sẽ do common.js đảm nhiệm để tránh trùng lặp
});
