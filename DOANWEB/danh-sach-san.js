// ===== DANH SÁCH SÂN - USER VIEW =====

let allCourts = [];
let courtTypes = [];
let selectedCourt = null;
let selectedDate = null;
let selectedTimeSlot = null;
let selectedSlotData = null;
let courtTypeId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Load court types for filter
    loadCourtTypes();
    
    // Load all courts
    loadCourts();
});

// ===== LOAD COURT TYPES =====
function loadCourtTypes() {
    fetch('api/court-types.php')
        .then(response => response.json())
        .then(data => {
            courtTypes = data;
            const select = document.getElementById('filterCourtType');
            
            data.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = `${type.icon} ${type.name}`;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading court types:', error);
        });
}

// ===== LOAD COURTS =====
function loadCourts() {
    const grid = document.getElementById('courtsGrid');
    if (!grid) return;
    
    // Hiển thị trạng thái đang tải
    grid.innerHTML = `
        <div class="loading-state-modern">
            <div class="loading-spinner-modern">⏳</div>
            <p>Đang tải danh sách sân...</p>
        </div>`;
    
    fetch('api/courts.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error('Dữ liệu không hợp lệ từ máy chủ');
            }
            allCourts = data;
            displayCourts(data);
            updateCourtCount(data.length);
        })
        .catch(error => {
            console.error('Error loading courts:', error);
            showErrorState(error.message || 'Không thể tải danh sách sân. Vui lòng thử lại sau.');
        });
}

// ===== DISPLAY COURTS =====
function displayCourts(courts) {
    const grid = document.getElementById('courtsGrid');
    
    if (courts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-modern">
                <div class="empty-icon">🏟️</div>
                <h3>Không tìm thấy sân</h3>
                <p>Không có sân nào phù hợp với tiêu chí tìm kiếm</p>
            </div>
        `;
        return;
    }
    
    // Clear grid first
    grid.innerHTML = '';
    
    courts.forEach(court => {
        // Lấy icon từ courtTypes
        const courtType = courtTypes.find(t => t.id == court.typeId);
        const typeIcon = courtType ? courtType.icon : '🏟️';
        
        const cardHTML = `
        <div class="court-card-modern" id="card_${court.id}">
            <div class="court-card-header-modern">
                <div class="court-status-badge-modern ${court.status}">
                    ${getCourtStatusText(court.status)}
                </div>
                <div class="court-icon-large">${typeIcon}</div>
                <h3>${court.name}</h3>
                <p class="court-type-label">${court.typeName} - ${formatCurrency(court.price)}/giờ</p>
            </div>
            <div class="court-card-body-modern">
                <div class="court-info-row">
                    <div class="court-info-icon">📝</div>
                    <div class="court-info-text">
                        <span class="court-info-label">Mô tả</span>
                        <span class="court-info-value">${court.description || 'Sân chất lượng cao'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Booking Form (Hidden by default) -->
            <div class="booking-form-expanded" id="bookingForm_${court.id}" style="display: none;">
                <div class="booking-form-content">
                    <h4>📅 Đặt sân ${court.name}</h4>
                    
                    <!-- Date Selection -->
                    <div class="form-group">
                        <label>Chọn ngày</label>
                        <input type="date" class="form-input" id="date_${court.id}" min="${new Date().toISOString().split('T')[0]}" onchange="loadTimeSlotsForCourt(${court.id})">
                    </div>
                    
                    <!-- Time Slots -->
                    <div class="form-group">
                        <label>Chọn khung giờ</label>
                        <div class="time-slots-grid" id="timeSlots_${court.id}">
                            <p class="empty-msg">Vui lòng chọn ngày</p>
                        </div>
                    </div>
                    
                    <!-- Customer Info -->
                    <div class="form-group" id="customerInfo_${court.id}" style="display: none;">
                        <label>Thông tin khách hàng</label>
                        <input type="text" placeholder="Họ và tên *" class="form-input" id="name_${court.id}" pattern="^[a-zA-ZÀ-ỹ\\s]+$" required>
                        <input type="tel" placeholder="Số điện thoại (10 số) *" class="form-input" id="phone_${court.id}" pattern="0[0-9]{9}" maxlength="10" required>
                    </div>
                    
                    <!-- Actions -->
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" data-action="cancel" data-court-id="${court.id}">Hủy</button>
                        <button type="button" class="btn-submit" id="bookBtn_${court.id}" data-action="submit" data-court-id="${court.id}" disabled>
                            Xác nhận đặt sân
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="court-card-footer-modern">
                <button type="button" class="btn-book-court" data-court-id="${court.id}">
                    <span>Đặt sân ngay</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        </div>
        `;
        
        // Create element and add to grid
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardHTML;
        const cardElement = tempDiv.firstElementChild;
        grid.appendChild(cardElement);
        
        // Add event listeners
        const bookBtn = cardElement.querySelector('.btn-book-court');
        const cancelBtn = cardElement.querySelector('.btn-cancel');
        const submitBtn = cardElement.querySelector('.btn-submit');
        
        bookBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Redirect to booking detail page
            window.location.href = `dat-san-chi-tiet.html?courtId=${court.id}`;
        });
        
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleBookingForm(court.id);
        });
        
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            submitBooking(court.id);
        });
    });
}

// ===== FILTER COURTS =====
function filterCourts() {
    const searchTerm = document.getElementById('searchCourt').value.toLowerCase();
    const typeFilter = document.getElementById('filterCourtType').value;
    const statusFilter = document.getElementById('filterCourtStatus').value;
    
    let filtered = allCourts;
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(court => 
            court.name.toLowerCase().includes(searchTerm) ||
            court.typeName.toLowerCase().includes(searchTerm) ||
            (court.description && court.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filter by court type
    if (typeFilter) {
        filtered = filtered.filter(court => court.typeId == typeFilter);
    }
    
    // Filter by status
    if (statusFilter) {
        filtered = filtered.filter(court => court.status === statusFilter);
    }
    
    displayCourts(filtered);
    updateCourtCount(filtered.length);
}

// ===== UPDATE COURT COUNT =====
function updateCourtCount(count) {
    const countElement = document.getElementById('courtCount');
    countElement.textContent = `Tổng số: ${count} sân`;
}

// ===== GET COURT STATUS TEXT =====
function getCourtStatusText(status) {
    const statusMap = {
        'trong': 'Sẵn sàng',
        'dang_thue': 'Đang thuê',
        'bao_tri': 'Bảo trì'
    };
    return statusMap[status] || status;
}

// ===== FORMAT CURRENCY =====
function formatCurrency(amount) {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// ===== FORMAT DATE =====
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// ===== SHOW ERROR STATE =====
function showErrorState() {
    const grid = document.getElementById('courtsGrid');
    grid.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Không thể tải dữ liệu</h3>
            <p>Đã xảy ra lỗi khi tải danh sách sân. Vui lòng thử lại sau.</p>
            <button class="btn btn-primary" onclick="loadCourts()">🔄 Thử lại</button>
        </div>
    `;
}

// ===== INLINE BOOKING FUNCTIONS =====
let selectedSlots = {}; // Store selected slot for each court

function toggleBookingForm(courtId) {
    const form = document.getElementById(`bookingForm_${courtId}`);
    const card = document.getElementById(`card_${courtId}`);
    
    if (!form || !card) {
        console.error('Form or card not found for courtId:', courtId);
        return;
    }
    
    const isHidden = form.style.display === 'none' || form.style.display === '';
    
    if (isHidden) {
        // Close all other forms first
        document.querySelectorAll('.booking-form-expanded').forEach(f => {
            f.style.display = 'none';
        });
        document.querySelectorAll('.court-card-modern').forEach(c => {
            c.classList.remove('expanded');
        });
        
        // Open this form
        form.style.display = 'block';
        card.classList.add('expanded');
        
        // Scroll to form smoothly
        setTimeout(() => {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        // Close form
        form.style.display = 'none';
        card.classList.remove('expanded');
    }
}

function loadTimeSlotsForCourt(courtId) {
    const date = document.getElementById(`date_${courtId}`).value;
    const container = document.getElementById(`timeSlots_${courtId}`);
    
    if (!date) {
        container.innerHTML = '<p class="select-date-first">👆 Chọn ngày trước</p>';
        return;
    }
    
    container.innerHTML = '<p class="loading-slots">⏳ Đang tải...</p>';
    
    // Time slots
    const timeSlots = [
        '06:00-08:00',
        '08:00-10:00',
        '10:00-12:00',
        '14:00-16:00',
        '16:00-18:00',
        '18:00-20:00',
        '20:00-22:00'
    ];
    
    // Simulate loading
    setTimeout(() => {
        let html = '';
        timeSlots.forEach(slot => {
            // Mock availability (70% available)
            const isAvailable = Math.random() > 0.3;
            const statusClass = isAvailable ? 'available' : 'booked';
            const disabled = isAvailable ? '' : 'disabled';
            
            html += `
                <button class="time-slot-btn ${statusClass}" 
                        onclick="selectTimeSlot(${courtId}, '${slot}')" 
                        ${disabled}>
                    ${slot.replace('-', ' - ')}
                </button>
            `;
        });
        container.innerHTML = html;
    }, 500);
}

function selectTimeSlot(courtId, slot) {
    // Remove previous selection for this court
    document.querySelectorAll(`#timeSlots_${courtId} .time-slot-btn`).forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class
    event.target.classList.add('selected');
    
    // Store selection
    const court = allCourts.find(c => c.id == courtId);
    selectedSlots[courtId] = {
        slot: slot,
        date: document.getElementById(`date_${courtId}`).value,
        court: court
    };
    
    // Show customer info section
    document.getElementById(`customerInfo_${courtId}`).style.display = 'block';
    
    // Enable book button
    document.getElementById(`bookBtn_${courtId}`).disabled = false;
    
    // Pre-fill if logged in
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById(`name_${courtId}`).value = currentUser.name || '';
        document.getElementById(`phone_${courtId}`).value = currentUser.phone || '';
    }
}

function submitBooking(courtId) {
    // Check login
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Vui lòng đăng nhập để đặt sân!');
        try {
            sessionStorage.setItem('returnUrl', window.location.href);
        } catch (e) {}
        window.location.href = 'login.html';
        return;
    }
    
    // Get data
    const selection = selectedSlots[courtId];
    if (!selection) {
        alert('Vui lòng chọn ngày và khung giờ!');
        return;
    }
    
    const name = document.getElementById(`name_${courtId}`).value.trim();
    const phone = document.getElementById(`phone_${courtId}`).value.trim();
    
    if (!name || !phone) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    // Validate phone
    if (!/^0[0-9]{9}$/.test(phone)) {
        alert('Số điện thoại không hợp lệ!');
        return;
    }
    
    // Get time range
    const [startTime, endTime] = selection.slot.split('-');
    
    // Prepare booking data
    const bookingData = {
        courtId: courtId,
        courtName: selection.court.name,
        date: selection.date,
        startTime: startTime,
        endTime: endTime,
        customerName: name,
        customerPhone: phone,
        price: selection.court.price,
        totalPrice: 2 * selection.court.price // 2 hours per slot
    };
    
    // Disable button
    const btn = document.getElementById(`bookBtn_${courtId}`);
    btn.disabled = true;
    btn.innerHTML = '<span>Đang xử lý...</span>';
    
    // Chuyển sang trang thanh toán với bookingIntent
    try {
        localStorage.setItem('bookingIntent', JSON.stringify(bookingData));
    } catch (e) {}
    window.location.href = 'thanh-toan.html';
}
