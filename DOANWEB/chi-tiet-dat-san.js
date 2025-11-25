// Get booking ID from URL
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get('id');

// Load booking details
function loadBookingDetails() {
  if (!bookingId) {
    window.location.href = '/DOANWEB/lich-dat-san-cua-toi.html';
    return;
  }

  // Trước tiên kiểm tra đơn đặt sân còn tồn tại trên máy chủ (đã hủy sẽ không còn trong danh sách)
  fetch('/DOANWEB/api/my-bookings.php')
    .then(r => r.json())
    .then(resp => {
      if (resp && resp.success) {
        const exists = (resp.bookings || []).some(b => String(b.id) === String(bookingId));
        if (!exists) {
          showToast('Đơn không còn tồn tại', 'Đơn đặt sân đã hủy hoặc không khả dụng', 'info');
          setTimeout(() => {
            window.location.href = '/DOANWEB/lich-dat-san-cua-toi.html';
          }, 1200);
          return;
        }
      }

      // Tiếp tục logic cũ: lấy chi tiết từ localStorage để hiển thị
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const booking = bookings.find(b => String(b.id) === String(bookingId));

      if (!booking) {
        showToast('Không tìm thấy đơn đặt sân', 'Vui lòng quay lại danh sách', 'warning');
        setTimeout(() => {
          window.location.href = 'lich-dat-san-cua-toi.html';
        }, 1200);
        return;
      }

      // Display booking details
      displayBookingInfo(booking);
    })
    .catch(() => {
      // Nếu lỗi mạng, vẫn thử hiển thị từ localStorage
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const booking = bookings.find(b => String(b.id) === String(bookingId));
      if (!booking) {
        showToast('Không tìm thấy đơn đặt sân', 'Vui lòng quay lại danh sách', 'warning');
        setTimeout(() => {
          window.location.href = 'lich-dat-san-cua-toi.html';
        }, 1200);
        return;
      }
      displayBookingInfo(booking);
    });
}

// Display booking information
function displayBookingInfo(booking) {
  // Update status banner
  const statusBanner = document.getElementById('statusBanner');
  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusDesc = document.getElementById('statusDesc');
  const cancelBtn = document.getElementById('cancelBtn');

  if (booking.status === 'cancelled') {
    statusBanner.classList.add('cancelled');
    statusIcon.textContent = '❌';
    statusTitle.textContent = 'Đã hủy đặt sân';
    statusDesc.textContent = 'Đơn đặt sân này đã bị hủy';
    cancelBtn.disabled = true;
    cancelBtn.style.opacity = '0.5';
    cancelBtn.style.cursor = 'not-allowed';
  } else {
    statusIcon.textContent = '✅';
    statusTitle.textContent = 'Đặt sân thành công';
    statusDesc.textContent = 'Đơn đặt sân của bạn đã được xác nhận';
  }

  // Booking ID
  document.getElementById('bookingIdDisplay').textContent = `#${booking.id}`;
  
  // Date created
  const createdDate = new Date(booking.timestamp);
  document.getElementById('dateCreated').textContent = 
    createdDate.toLocaleString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  // Court information
  document.getElementById('courtType').textContent = booking.courtType || 'Sân Bóng Đá';
  document.getElementById('courtNumber').textContent = `Sân ${booking.court}`;
  
  const bookingDate = new Date(booking.date);
  document.getElementById('bookingDate').textContent = 
    bookingDate.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  
  document.getElementById('bookingTime').textContent = booking.time;

  // Customer information
  document.getElementById('customerName').textContent = booking.customerName;
  document.getElementById('customerPhone').textContent = booking.customerPhone;

  // Payment information
  const basePrice = booking.basePrice || 300000;
  const discountAmount = booking.discountAmount || 0;
  const finalPrice = booking.finalPrice || basePrice;

  document.getElementById('basePrice').textContent = basePrice.toLocaleString('vi-VN') + 'đ';
  document.getElementById('totalAmount').textContent = finalPrice.toLocaleString('vi-VN') + 'đ';

  // Show discount if applicable
  if (discountAmount > 0) {
    document.getElementById('discountRow').style.display = 'flex';
    document.getElementById('discountAmount').textContent = '-' + discountAmount.toLocaleString('vi-VN') + 'đ';
    document.getElementById('discountCodeDisplay').textContent = booking.discountCode || '';
  }

  // Payment method
  let paymentMethodText = 'Chưa thanh toán';
  if (booking.paymentMethod) {
    switch(booking.paymentMethod) {
      case 'momo':
        paymentMethodText = 'Ví điện tử Momo';
        break;
      case 'bank':
        paymentMethodText = 'Chuyển khoản ngân hàng';
        break;
      case 'cash':
        paymentMethodText = 'Thanh toán trực tiếp';
        break;
      default:
        paymentMethodText = booking.paymentMethod;
    }
  }
  document.getElementById('paymentMethod').textContent = paymentMethodText;
}

// Show cancel modal
function showCancelModal() {
  const modal = document.getElementById('cancelModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Close cancel modal
function closeCancelModal() {
  const modal = document.getElementById('cancelModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  document.getElementById('cancelReason').value = '';
}

// Confirm cancellation
function confirmCancel() {
  const reason = document.getElementById('cancelReason').value.trim();

  // Gọi API hủy đặt sân trên máy chủ để đồng bộ trạng thái
  fetch('/DOANWEB/api/cancel-booking.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: Number(bookingId), reason })
  })
    .then(r => r.json())
    .then(resp => {
      if (resp && resp.success) {
        showToast('Hủy đặt sân thành công', resp.message || 'Đơn đặt sân của bạn đã được hủy', 'success');
        closeCancelModal();
        // Điều hướng về danh sách để mục đã hủy biến mất khỏi UI
        setTimeout(() => {
          window.location.href = 'lich-dat-san-cua-toi.html';
        }, 1200);
      } else {
        showToast('Không thể hủy', (resp && resp.message) || 'Vui lòng thử lại', 'error');
      }
    })
    .catch(() => {
      showToast('Lỗi', 'Không thể kết nối máy chủ', 'error');
    });
}

// Toast notification function
function showToast(title, message, type = 'info') {
  const oldToast = document.querySelector('.toast-notification');
  if (oldToast) {
    oldToast.remove();
  }

  const icons = {
    error: '❌',
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const toast = document.createElement('div');
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
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('cancelModal');
  if (e.target === modal) {
    closeCancelModal();
  }
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadBookingDetails();
});
