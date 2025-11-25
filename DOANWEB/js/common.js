// ===== QUẢN LÝ MENU VÀ TRẠNG THÁI ĐĂNG NHẬP =====

document.addEventListener('DOMContentLoaded', function() {
    updateMenuState();
    setupEventListeners();
});

// Cập nhật trạng thái menu dựa trên đăng nhập
function updateMenuState() {
    const currentUser = getCurrentUser();
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    let userMenu = document.getElementById('userMenu');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    const nav = document.querySelector('.nav');

    // Deduplicate any previously injected menus (defensive)
    if (nav) {
        const menus = nav.querySelectorAll('.user-menu');
        if (menus.length > 1) {
            // Keep the first; remove the rest
            for (let i = 1; i < menus.length; i++) {
                menus[i].remove();
            }
            userMenu = nav.querySelector('.user-menu');
        }
    }

    if (currentUser) {
        // Đã đăng nhập
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';

        // Luôn đảm bảo chỉ có 1 menu: xóa tất cả menu cũ rồi chèn lại 1 cái
        if (nav) {
            nav.querySelectorAll('.user-menu').forEach(n => n.remove());
            userMenu = document.createElement('div');
            userMenu.id = 'userMenu';
            userMenu.className = 'user-menu';
            const adminLink = currentUser.role === 'admin' ? '<a href="/DOANWEB/admin.html">🛠️ Quản trị</a>' : '';
            const staffLink = currentUser.role === 'staff' ? '<a href="/DOANWEB/staff-bookings.html">🎧 Nhân viên</a>' : '';
            userMenu.innerHTML = `
              <button class="user-menu-btn">
                <span class="user-avatar">👤</span>
                <span class="user-name">${currentUser.name || currentUser.email || 'Tài khoản'}</span>
              </button>
              <div class="user-dropdown">
                ${adminLink}
                ${staffLink}
                <a href="/DOANWEB/settings.html">⚙️ Cài đặt</a>
                <a href="/DOANWEB/lich-dat-san-cua-toi.html">📋 Chi tiết sân đã đặt</a>
                <a href="#" id="logoutBtn">🚪 Đăng xuất</a>
              </div>
            `;
            nav.appendChild(userMenu);
            // Nếu client chưa có role admin, xác minh với server để hiển thị link Quản trị
            try {
                if (!(currentUser.role && currentUser.role.toLowerCase && currentUser.role.toLowerCase() === 'admin')) {
                    fetch('/DOANWEB/api/check-admin.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUser.id })
                    })
                    .then(r => r.json())
                    .then(check => {
                        if (check && check.isAdmin) {
                            const dd = userMenu.querySelector('.user-dropdown');
                            if (dd && !dd.querySelector('a[href="/DOANWEB/admin.html"]')) {
                                const a = document.createElement('a');
                                a.href = '/DOANWEB/admin.html';
                                a.textContent = '🛠️ Quản trị';
                                dd.insertBefore(a, dd.firstChild);
                            }
                        }
                    })
                    .catch(() => {});
                }
            } catch (e) {}
        }

        if (userMenu) userMenu.style.display = 'flex';
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name || currentUser.email;

        // Gắn sự kiện dropdown + logout nếu có menu động
        const menuBtn = userMenu ? userMenu.querySelector('.user-menu-btn') : null;
        const dropdown = userMenu ? userMenu.querySelector('.user-dropdown') : null;
        const dynLogout = userMenu ? userMenu.querySelector('#logoutBtn') : null;
        if (menuBtn && dropdown && !menuBtn._bound) {
            menuBtn._bound = true;
            menuBtn.addEventListener('click', function() {
                dropdown.classList.toggle('show');
            });
            document.addEventListener('click', function(e) {
                if (userMenu && !userMenu.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }
        if (dynLogout && !dynLogout._bound) {
            dynLogout._bound = true;
            dynLogout.addEventListener('click', function(e){ e.preventDefault(); logout(); });
        }
        if (logoutBtn && !logoutBtn._bound) {
            logoutBtn._bound = true;
            logoutBtn.onclick = function(e) { e.preventDefault(); logout(); };
        }

        // Global guard to prevent duplicate injections in later calls
        window.__sb_user_menu_initialized = true;
    } else {
        // Chưa đăng nhập
        if (loginLink) loginLink.style.display = 'block';
        if (registerLink) registerLink.style.display = 'block';
        if (loginBtn) loginBtn.style.display = '';
        if (userMenu) userMenu.remove();
        window.__sb_user_menu_initialized = false;
    }
}

// Thiết lập các sự kiện chung
function setupEventListeners() {
    // Đánh dấu menu hiện tại
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const menuLinks = document.querySelectorAll('.nav a');
    
    menuLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPath || 
            (currentPath === '' && linkHref === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Hàm đăng xuất
function logout() {
    // Xóa thông tin đăng nhập
    localStorage.removeItem('sportbooking_current_user');
    sessionStorage.removeItem('sportbooking_current_user');
    
    // Xóa thông tin ghi nhớ đăng nhập
    localStorage.removeItem('sportbooking_remember_me');
    
    // Chuyển hướng về trang đăng nhập với tham số logout
    window.location.href = '/DOANWEB/login.html?logout=1';
}
