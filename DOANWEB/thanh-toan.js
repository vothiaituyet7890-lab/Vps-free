// Lấy thông tin đơn đặt sân từ localStorage (ý định trước thanh toán)
const bookingInfo = JSON.parse(localStorage.getItem('bookingIntent'));

// Kiểm tra nếu không có thông tin đặt sân, chuyển về trang danh sách sân
if (!bookingInfo) {
    window.location.href = 'danh-sach-san.html';
}

// Hiển thị thông tin đặt sân
function displayBookingInfo() {
    if (!bookingInfo) return;
    
    document.getElementById('booking-court').textContent = bookingInfo.courtName || `Sân ${bookingInfo.courtId || ''}`;
    
    // Định dạng ngày tháng
    const date = new Date(bookingInfo.date);
    const options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    document.getElementById('booking-date').textContent = date.toLocaleDateString('vi-VN', options);
    
    document.getElementById('booking-time').textContent = `${bookingInfo.startTime} - ${bookingInfo.endTime}`;
    
    // Tính giá và hiển thị
    const price = bookingInfo.totalPrice || 0;
    document.getElementById('booking-price').textContent = price.toLocaleString('vi-VN') + ' VNĐ';
    document.getElementById('booking-total').textContent = price.toLocaleString('vi-VN') + ' VNĐ';
}

// Xử lý sự kiện khi nhấn nút thanh toán
document.getElementById('btnPay').addEventListener('click', function() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    // Lấy thông tin user đang đăng nhập
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Vui lòng đăng nhập để tiếp tục');
        window.location.href = 'dang-nhap.html?returnUrl=thanh-toan.html';
        return;
    }
    
    // Tạo đơn đặt sân và gửi lên server
    const bookingData = {
        courtId: bookingInfo.courtId,
        courtName: bookingInfo.courtName,
        date: bookingInfo.date,
        startTime: bookingInfo.startTime,
        endTime: bookingInfo.endTime,
        customerName: bookingInfo.customerName,
        customerPhone: bookingInfo.customerPhone,
        totalPrice: bookingInfo.totalPrice,
        paymentMethod: paymentMethod
    };
    
    // Gửi đơn đặt sân lên server
    fetch('api/create-booking.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            try { localStorage.removeItem('bookingIntent'); } catch (e) {}
            window.location.href = 'lich-dat-san-cua-toi.html';
        } else {
            alert('❌ ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('❌ Có lỗi xảy ra khi đặt sân!');
    });
});

// Không còn lưu tạm đơn localStorage ở bước thanh toán; dữ liệu lấy từ DB ở trang lịch sử

// Cập nhật giao diện người dùng khi đã đăng nhập
function updateUIForLoggedInUser() {
    const currentUser = getCurrentUser();
    const userMenu = document.getElementById('userMenu');
    
    if (currentUser) {
        userMenu.textContent = currentUser.name;
        userMenu.href = 'profile.html';
        
        // Thêm menu dropdown
        userMenu.insertAdjacentHTML('afterend', `
            <div class="user-dropdown">
                <a href="profile.html">Tài khoản của tôi</a>
                <a href="lich-dat-san-cua-toi.html">Đơn đặt sân</a>
                <a href="#" onclick="logout()">Đăng xuất</a>
            </div>
        `);
    } else {
        userMenu.textContent = 'Đăng nhập';
        userMenu.href = 'dang-nhap.html';
    }
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    checkLoginStatus();
    
    // Cập nhật giao diện người dùng
    updateUIForLoggedInUser();
    
    // Hiển thị thông tin đặt sân
    displayBookingInfo();
});
