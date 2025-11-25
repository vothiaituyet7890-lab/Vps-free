// Trạng thái đặt sân
let selectedDate = null;
let selectedTime = null;
let selectedCourt = null;
let appliedDiscount = 0; // Số tiền giảm giá
let discountCode = null; // Mã giảm giá đã áp dụng

// Format: { 'YYYY-MM-DD': { 'HH:MM-HH:MM': [court_numbers] } }
const bookedCourts = {};

// Danh sách mã giảm giá
const discountCodes = {
  'SPORT10': { type: 'percent', value: 10, description: 'Giảm 10%' },
  'SPORT20': { type: 'percent', value: 20, description: 'Giảm 20%' },
  'NEWYEAR': { type: 'percent', value: 15, description: 'Giảm 15% - Năm mới' },
  'SUMMER50': { type: 'fixed', value: 50000, description: 'Giảm 50.000đ' },
  'VIP100': { type: 'fixed', value: 100000, description: 'Giảm 100.000đ - VIP' }
};

// Hàm hiển thị toast notification
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

  // Tự động ẩn sau 5 giây
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// Tạo lịch 7 ngày tiếp theo
function generateDateGrid() {
  const dateGrid = document.getElementById("dateGrid");
  dateGrid.innerHTML = "";

  const today = new Date();
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = weekdays[date.getDay()];
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;

    const dateItem = document.createElement("div");
    dateItem.className = "date-item";
    dateItem.dataset.date = dateStr;

    dateItem.innerHTML = `
      <div class="date-weekday">${dayOfWeek}</div>
      <div class="date-day">${dayOfMonth}</div>
      <div class="date-month">Th${month}</div>
    `;

    dateItem.addEventListener("click", () => selectDate(dateStr, dateItem));
    dateGrid.appendChild(dateItem);
  }
}

// Chọn ngày
function selectDate(dateStr, element) {
  // Bỏ chọn ngày cũ
  document.querySelectorAll(".date-item").forEach((item) => {
    item.classList.remove("selected");
  });

  // Chọn ngày mới
  element.classList.add("selected");
  selectedDate = dateStr;

  // Reset time và court
  selectedTime = null;
  selectedCourt = null;
  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.classList.remove("selected");
  });

  updateCourtsDisplay();
  hideSummary();
}

// Court type data
const courtTypes = {
  'bongda': {
    icon: '⚽',
    name: 'Sân Bóng Đá',
    description: 'Sân cỏ nhân tạo 5v5, 7v7, 11v11 - Chất lượng cao'
  },
  'caulong': {
    icon: '🏸',
    name: 'Sân Cầu Lông',
    description: 'Sân cầu lông trong nhà, sàn gỗ cao cấp, điều hòa'
  },
  'pickleball': {
    icon: '🎾',
    name: 'Sân Pickleball',
    description: 'Sân pickleball hiện đại, phù hợp mọi lứa tuổi'
  },
  'bongro': {
    icon: '🏀',
    name: 'Sân Bóng Rổ',
    description: 'Sân bóng rổ ngoài trời và trong nhà, rổ chuẩn NBA'
  }
};

// Display selected court type
function displaySelectedCourtType() {
  const selectedType = localStorage.getItem('selectedCourtType');
  
  if (selectedType && courtTypes[selectedType]) {
    const courtData = courtTypes[selectedType];
    const displayElement = document.getElementById('selectedCourtType');
    const iconElement = document.getElementById('courtTypeIcon');
    const nameElement = document.getElementById('courtTypeName');
    const descElement = document.getElementById('courtTypeDesc');
    
    iconElement.textContent = courtData.icon;
    nameElement.textContent = courtData.name;
    descElement.textContent = courtData.description;
    displayElement.style.display = 'block';
  }
}

// Chọn khung giờ
document.addEventListener("DOMContentLoaded", () => {
  // Display selected court type if available
  displaySelectedCourtType();
  
  const timeSlots = document.querySelectorAll(".time-slot");

  timeSlots.forEach((slot) => {
    slot.addEventListener("click", () => {
      if (!selectedDate) {
        showToast(
          "Chưa chọn ngày",
          "Vui lòng chọn ngày trước khi chọn khung giờ!",
          "warning"
        );
        return;
      }

      // Bỏ chọn khung giờ cũ
      timeSlots.forEach((s) => s.classList.remove("selected"));

      // Chọn khung giờ mới
      slot.classList.add("selected");
      selectedTime = slot.dataset.time;

      // Reset court
      selectedCourt = null;

      updateCourtsDisplay();
      hideSummary();
    });
  });

  // Khởi tạo lịch
  generateDateGrid();

  // Xử lý click vào sân
  const courtItems = document.querySelectorAll(".court-item");
  courtItems.forEach((court) => {
    court.addEventListener("click", () => {
      if (!selectedDate || !selectedTime) {
        showToast(
          "Chưa chọn đủ thông tin",
          "Vui lòng chọn ngày và khung giờ trước khi chọn sân!",
          "warning"
        );
        return;
      }

      if (court.classList.contains("booked")) {
        showToast(
          "Sân đã được đặt",
          "Sân này đã có người đặt. Vui lòng chọn sân khác!",
          "error"
        );
        return;
      }

      // Bỏ chọn sân cũ
      courtItems.forEach((c) => c.classList.remove("selected"));

      // Chọn sân mới
      court.classList.add("selected");
      selectedCourt = parseInt(court.dataset.court);

      showSummary();
    });
  });
});

// Cập nhật hiển thị trạng thái các sân
function updateCourtsDisplay() {
  const courtItems = document.querySelectorAll(".court-item");

  courtItems.forEach((court) => {
    const courtNumber = parseInt(court.dataset.court);

    // Reset classes
    court.classList.remove("available", "booked", "selected");

    if (selectedDate && selectedTime) {
      // Kiểm tra sân đã được đặt chưa
      const isBooked =
        bookedCourts[selectedDate]?.[selectedTime]?.includes(courtNumber);

      if (isBooked) {
        court.classList.add("booked");
        court.querySelector(".court-status").textContent = "Đã đặt";
      } else {
        court.classList.add("available");
        court.querySelector(".court-status").textContent = "Còn trống";
      }
    } else {
      court.querySelector(".court-status").textContent = "Chọn ngày & giờ";
    }
  });
}

// Hiển thị thông tin đặt sân
function showSummary() {
  const summary = document.getElementById("bookingSummary");

  // Format ngày
  const date = new Date(selectedDate);
  const dateStr = `${date.getDate()}/${
    date.getMonth() + 1
  }/${date.getFullYear()}`;

  document.getElementById("summaryDate").textContent = dateStr;
  document.getElementById("summaryTime").textContent = selectedTime;
  document.getElementById("summaryCourt").textContent = `Sân ${selectedCourt}`;

  // Reset discount khi chọn sân mới
  appliedDiscount = 0;
  discountCode = null;
  document.getElementById("discountCode").value = "";
  document.getElementById("discountMessage").style.display = "none";
  updatePriceDisplay();

  summary.style.display = "block";
  summary.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Cập nhật hiển thị giá
function updatePriceDisplay() {
  const basePrice = 300000;
  const finalPrice = basePrice - appliedDiscount;

  document.getElementById("summaryPrice").textContent = basePrice.toLocaleString('vi-VN') + "đ";

  if (appliedDiscount > 0) {
    document.getElementById("discountAmount").textContent = "-" + appliedDiscount.toLocaleString('vi-VN') + "đ";
    document.getElementById("finalPrice").textContent = finalPrice.toLocaleString('vi-VN') + "đ";
    document.getElementById("discountRow").style.display = "block";
    document.getElementById("finalPriceRow").style.display = "block";
  } else {
    document.getElementById("discountRow").style.display = "none";
    document.getElementById("finalPriceRow").style.display = "none";
  }
}

// Áp dụng mã giảm giá
function applyDiscount() {
  const input = document.getElementById("discountCode");
  const code = input.value.trim().toUpperCase();
  const messageEl = document.getElementById("discountMessage");

  if (!code) {
    messageEl.textContent = "⚠️ Vui lòng nhập mã giảm giá";
    messageEl.className = "error";
    messageEl.style.display = "block";
    return;
  }

  const discount = discountCodes[code];
  
  if (!discount) {
    messageEl.textContent = "❌ Mã giảm giá không hợp lệ";
    messageEl.className = "error";
    messageEl.style.display = "block";
    input.style.borderColor = "#dc2626";
    setTimeout(() => {
      input.style.borderColor = "";
    }, 2000);
    return;
  }

  // Tính số tiền giảm
  const basePrice = 300000;
  if (discount.type === 'percent') {
    appliedDiscount = Math.floor(basePrice * discount.value / 100);
  } else {
    appliedDiscount = discount.value;
  }

  // Đảm bảo giảm giá không vượt quá giá gốc
  if (appliedDiscount > basePrice) {
    appliedDiscount = basePrice;
  }

  discountCode = code;
  
  messageEl.textContent = `✅ Áp dụng thành công! ${discount.description}`;
  messageEl.className = "success";
  messageEl.style.display = "block";
  input.style.borderColor = "#059669";
  input.disabled = true;

  updatePriceDisplay();

  showToast(
    "Áp dụng mã thành công",
    `Bạn đã được giảm ${appliedDiscount.toLocaleString('vi-VN')}đ`,
    "success"
  );
}

// Ẩn thông tin đặt sân
function hideSummary() {
  document.getElementById("bookingSummary").style.display = "none";
}

// Lưu thông tin đặt sân tạm thời
function saveTemporaryBooking() {
  const basePrice = 300000;
  const finalPrice = basePrice - appliedDiscount;
  
  const bookingInfo = {
    court: selectedCourt,
    date: selectedDate,
    time: selectedTime,
    customerName: document.getElementById("customerName").value.trim(),
    customerPhone: document.getElementById("customerPhone").value.trim(),
    basePrice: basePrice,
    discountCode: discountCode,
    discountAmount: appliedDiscount,
    finalPrice: finalPrice,
    timestamp: new Date().toISOString()
  };
}

// Xác nhận đặt sân
function confirmBooking() {
  // Lấy thông tin đăng nhập (nếu có)
  const userData = getCurrentUser();

  // Kiểm tra thông tin khách hàng
  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  
  // Sử dụng thông tin từ tài khoản nếu đã đăng nhập
  let name = '';
  let phone = '';
  
  if (userData) {
    // Nếu đã đăng nhập, lấy thông tin từ tài khoản
    name = userData.name || '';
    phone = userData.phone || '';
    
    // Cập nhật giá trị trên form nếu chưa điền
    if (nameInput && !nameInput.value.trim()) nameInput.value = name;
    if (phoneInput && !phoneInput.value.trim()) phoneInput.value = phone;
  }
  
  // Lấy giá trị từ form (có thể đã được cập nhật từ tài khoản)
  name = nameInput ? nameInput.value.trim() : '';
  phone = phoneInput ? phoneInput.value.trim() : '';

  // Kiểm tra thông tin bắt buộc
  if (!selectedDate || !selectedTime || !selectedCourt) {
    showToast(
      "Thiếu thông tin",
      "Vui lòng chọn đầy đủ ngày, giờ và sân trước khi đặt.",
      "warning"
    );
    return;
  }

  // Kiểm tra thông tin khách hàng
  if (!name || !phone) {
    showToast(
      "Thiếu thông tin",
      "Vui lòng điền đầy đủ họ tên và số điện thoại.",
      "warning"
    );
    return;
  }

  // Kiểm tra số điện thoại hợp lệ
  const phoneRegex = /^0[0-9]{9}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    showToast(
      "Số điện thoại không hợp lệ",
      "Vui lòng nhập số điện thoại đúng định dạng (10 số, bắt đầu bằng 0).",
      "error"
    );
    return;
  }

  // Kiểm tra xem sân đã được đặt chưa
  if (bookedCourts[selectedDate] && bookedCourts[selectedDate][selectedTime] && 
      bookedCourts[selectedDate][selectedTime].includes(selectedCourt)) {
    showToast(
      "Sân đã được đặt",
      "Rất tiếc, sân đã được đặt trong khung giờ này. Vui lòng chọn khung giờ khác.",
      "error"
    );
    return;
  }

  // Lấy thông tin giá và giảm giá
  const priceElement = document.querySelector('.booking-summary .price-amount');
  let price = 0;
  if (priceElement) {
    price = parseInt(priceElement.textContent.replace(/[^0-9]/g, '')) || 0;
  }

  // Tạo thông tin đặt sân
  const bookingInfo = {
    id: 'BK' + Date.now(),
    customerName: name,
    customerPhone: phone,
    court: selectedCourt,
    date: selectedDate,
    time: selectedTime,
    price: price,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // Lưu thông tin đặt sân
  saveBooking(bookingInfo);
  
  // Hiển thị thông báo thành công
  showToast(
    "Đặt sân thành công!",
    `Bạn đã đặt sân ${selectedCourt} vào lúc ${selectedTime} ngày ${selectedDate}. Vui lòng đến đúng giờ.`,
    "success"
  );
  
  // Reset form
  resetBookingForm();
  
  // Cập nhật giao diện
  updateUIAfterBooking();
}
