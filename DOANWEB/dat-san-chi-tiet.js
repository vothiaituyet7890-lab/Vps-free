// ===== ĐẶT SÂN CHI TIẾT - CGV STYLE =====

let selectedCourt = null;
let selectedDate = null;
let selectedSlot = null;
let allCourts = [];

document.addEventListener('DOMContentLoaded', function() {
    // Ensure login state is restored before building the page
    let cu = getCurrentUser();
    if (!cu) {
        // Try restore from cookie
        try {
            const cookieUser = typeof getCookie === 'function' ? getCookie('sb_current_user') : null;
            if (cookieUser) {
                const parsed = JSON.parse(cookieUser);
                if (parsed && (parsed.id || parsed.email || parsed.name)) {
                    setCurrentUser(parsed);
                }
            }
        } catch (e) {}
        // Try restore from remembered identifier (UI-only)
        cu = getCurrentUser();
        if (!cu) {
            const remember = localStorage.getItem('sportbooking_remember_me') === 'true';
            const ident = localStorage.getItem('sportbooking_identifier');
            if (remember && ident) {
                setCurrentUser({ id: 'remembered', email: ident, name: ident, phone: '' });
            }
        }
    }
    cu = getCurrentUser();
    console.log('[DSCT] currentUser after restore:', cu);
    if (typeof updateMenuState === 'function') updateMenuState();
    // Get courtId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const courtId = urlParams.get('courtId');
    
    if (!courtId) {
        alert('Không tìm thấy thông tin sân!');
        window.location.href = 'danh-sach-san.html';
        return;
    }
    
    // Load court info
    loadCourtInfo(courtId);
    
    // Generate date carousel (next 7 days)
    generateDateCarousel();
    
    // Handle confirm button
    document.getElementById('btnConfirm').addEventListener('click', confirmBooking);
});

// ===== LOAD COURT INFO =====
function loadCourtInfo(courtId) {
    fetch(`api/courts.php?id=${courtId}`)
        .then(response => response.json())
        .then(court => {
            if (court.error) {
                alert('Không tìm thấy sân!');
                window.location.href = 'danh-sach-san.html';
                return;
            }
            
            selectedCourt = court;
            
            // Update banner
            document.getElementById('courtName').textContent = court.name;
            document.getElementById('courtType').textContent = court.typeName;
            document.getElementById('courtPrice').textContent = formatCurrency(court.price) + '/giờ';
            
            // Update summary
            document.getElementById('sumCourt').textContent = court.name;
            
            // Load all courts of same type for schedule
            loadCourtsOfType(court.typeId);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Lỗi khi tải thông tin sân!');
        });
}

// ===== LOAD COURTS OF SAME TYPE =====
function loadCourtsOfType(typeId) {
    fetch('api/courts.php')
        .then(response => response.json())
        .then(courts => {
            allCourts = courts.filter(c => c.typeId == typeId);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// ===== GENERATE DATE CAROUSEL =====
function generateDateCarousel() {
    const carousel = document.getElementById('dateCarousel');
    carousel.innerHTML = '';
    
    const today = new Date();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dayName = dayNames[date.getDay()];
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const dateStr = date.toISOString().split('T')[0];
        
        const dateItem = document.createElement('div');
        dateItem.className = 'date-item';
        dateItem.innerHTML = `
            <div class="date-day">${dayName}</div>
            <div class="date-number">${day}</div>
            <div class="date-month">Tháng ${month}</div>
        `;
        
        dateItem.addEventListener('click', function() {
            selectDate(dateStr, dateItem);
        });
        
        carousel.appendChild(dateItem);
    }
}

// ===== SELECT DATE =====
function selectDate(dateStr, element) {
    // Remove active from all dates
    document.querySelectorAll('.date-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active to selected
    element.classList.add('active');
    selectedDate = dateStr;
    selectedSlot = null;
    
    // Update summary
    document.getElementById('sumDate').textContent = formatDate(dateStr);
    
    // Hide summary content
    document.getElementById('summaryContent').style.display = 'none';
    document.getElementById('summaryEmpty').style.display = 'block';
    
    // Load schedule for this date
    loadSchedule(dateStr);
}

// ===== LOAD SCHEDULE =====
async function loadSchedule(date) {
    const scheduleMessage = document.getElementById('scheduleMessage');
    const scheduleTable = document.getElementById('scheduleTable');
    
    scheduleMessage.style.display = 'none';
    scheduleTable.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">⏳ Đang tải lịch...</div>';
    
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
    
    scheduleTable.innerHTML = '';
    
    // Create schedule for each court
    for (const court of allCourts) {
        const row = document.createElement('div');
        row.className = 'court-schedule-row';
        
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'time-slots-row';
        
        // Check availability for each time slot
        for (const slot of timeSlots) {
            const [startTime, endTime] = slot.split('-');
            
            // Call API to check availability
            const isAvailable = await checkAvailability(court.id, date, startTime, endTime);
            
            const statusClass = isAvailable ? 'available' : 'booked';
            const statusText = isAvailable ? '✓ Còn trống' : '✕ Đã đặt';
            
            const slotElement = document.createElement('div');
            slotElement.className = `time-slot ${statusClass}`;
            slotElement.dataset.courtId = court.id;
            slotElement.dataset.courtName = court.name;
            slotElement.dataset.slot = slot;
            slotElement.dataset.price = court.price;
            slotElement.innerHTML = `
                <span class="time-slot-time">${slot.replace('-', ' - ')}</span>
                <span class="time-slot-status">${statusText}</span>
            `;
            
            if (isAvailable) {
                slotElement.addEventListener('click', function() {
                    selectTimeSlot(this);
                });
            }
            
            slotsContainer.appendChild(slotElement);
        }
        
        row.innerHTML = `<div class="court-schedule-header">🏟️ ${court.name}</div>`;
        row.appendChild(slotsContainer);
        scheduleTable.appendChild(row);
    }
}

// ===== CHECK AVAILABILITY =====
async function checkAvailability(courtId, date, startTime, endTime) {
    try {
        const response = await fetch(`api/check-availability.php?courtId=${courtId}&date=${date}&startTime=${startTime}&endTime=${endTime}`);
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Error checking availability:', error);
        return false; // Default to not available on error
    }
}

// ===== SELECT TIME SLOT =====
function selectTimeSlot(element) {
    // Remove selected from all slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add selected to this slot
    element.classList.add('selected');
    
    // Store selection
    selectedSlot = {
        courtId: element.dataset.courtId,
        courtName: element.dataset.courtName,
        slot: element.dataset.slot,
        price: parseFloat(element.dataset.price)
    };
    
    // Update summary
    updateSummary();
}

// ===== UPDATE SUMMARY =====
function updateSummary() {
    if (!selectedDate || !selectedSlot) return;
    
    const [startTime, endTime] = selectedSlot.slot.split('-');
    const hours = 2; // 2 hours per slot
    const totalPrice = hours * selectedSlot.price;
    
    document.getElementById('sumCourt').textContent = selectedSlot.courtName;
    document.getElementById('sumDate').textContent = formatDate(selectedDate);
    document.getElementById('sumTime').textContent = selectedSlot.slot.replace('-', ' - ');
    document.getElementById('sumPrice').textContent = formatCurrency(totalPrice);
    
    // Show summary content
    document.getElementById('summaryEmpty').style.display = 'none';
    document.getElementById('summaryContent').style.display = 'block';
    
    // Pre-fill customer info if logged in
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('customerName').value = currentUser.name || '';
        document.getElementById('customerPhone').value = currentUser.phone || '';
    }
}

// ===== CONFIRM BOOKING =====
function confirmBooking() {
    // Check login
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        alert('Vui lòng đăng nhập để đặt sân!');
        // Lưu lại URL hiện tại để quay lại sau khi đăng nhập
        try {
            sessionStorage.setItem('returnUrl', window.location.href);
        } catch (e) {}
        window.location.href = 'login.html';
        return;
    }
    
    // Validate
    if (!selectedDate || !selectedSlot) {
        alert('Vui lòng chọn ngày và khung giờ!');
        return;
    }
    
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    
    if (!customerName || !customerPhone) {
        alert('Vui lòng điền đầy đủ thông tin khách hàng!');
        return;
    }
    
    // Validate phone
    if (!/^0[0-9]{9}$/.test(customerPhone)) {
        alert('Số điện thoại không hợp lệ! Vui lòng nhập 10 số bắt đầu bằng 0.');
        return;
    }
    
    // Prepare booking intent and go to payment page
    const [startTime, endTime] = selectedSlot.slot.split('-');
    const hours = 2;
    const totalPrice = hours * selectedSlot.price;

    const bookingIntent = {
        courtId: selectedSlot.courtId,
        courtName: selectedSlot.courtName,
        date: selectedDate,
        startTime,
        endTime,
        customerName,
        customerPhone,
        totalPrice
    };

    try {
        localStorage.setItem('bookingIntent', JSON.stringify(bookingIntent));
    } catch (e) {}

    window.location.href = 'thanh-toan.html';
}

// ===== HELPER FUNCTIONS =====
function formatCurrency(amount) {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Sử dụng hàm getCurrentUser() từ auth.js
