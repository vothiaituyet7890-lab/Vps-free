<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

error_reporting(0);
ini_set('display_errors', 0);

// Kết nối database
$host = "localhost";
$username = "root";
$password = "";
$database = "qlydatsan";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Không thể kết nối database!'
    ]);
    exit;
}

$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            echo json_encode([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ!'
            ]);
            exit;
        }
        
        // Get data from request
        $courtId = intval($data['courtId'] ?? 0);
        $courtName = $data['courtName'] ?? '';
        $date = $data['date'] ?? '';
        $startTime = $data['startTime'] ?? '';
        $endTime = $data['endTime'] ?? '';
        $customerName = $data['customerName'] ?? '';
        $customerPhone = $data['customerPhone'] ?? '';
        $totalPrice = floatval($data['totalPrice'] ?? 0);
        
        // Validate
        if ($courtId <= 0 || empty($date) || empty($startTime) || empty($endTime)) {
            echo json_encode([
                'success' => false,
                'message' => 'Vui lòng điền đầy đủ thông tin!'
            ]);
            exit;
        }
        
        // Check if user is logged in
        if (!isset($_SESSION['user_id'])) {
            echo json_encode([
                'success' => false,
                'message' => 'Vui lòng đăng nhập để đặt sân!'
            ]);
            exit;
        }
        
        $id_tk = intval($_SESSION['user_id']); // id tài khoản
        
        $conn->begin_transaction();

        // Resolve id_kh from id_tk (create if missing)
        $id_kh = null;
        $sql_get_kh = "SELECT id_kh FROM khachhang WHERE id_tk = ? LIMIT 1";
        if ($stmt = $conn->prepare($sql_get_kh)) {
            $stmt->bind_param("i", $id_tk);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($rowKh = $res->fetch_assoc()) {
                $id_kh = intval($rowKh['id_kh']);
            }
            $stmt->close();
        }

        if (!$id_kh) {
            // Tạo khách hàng tối thiểu gắn với tài khoản hiện tại
            $sql_ins_kh = "INSERT INTO khachhang (id_tk, ho_ten, sdt) VALUES (?, ?, ?)";
            if ($stmt = $conn->prepare($sql_ins_kh)) {
                $ten = $customerName ?: 'Khách hàng';
                $sdt = $customerPhone ?: '';
                $stmt->bind_param("iss", $id_tk, $ten, $sdt);
                $stmt->execute();
                $id_kh = $conn->insert_id;
                $stmt->close();
            }
        }
        
        if (!$id_kh) {
            $conn->rollback();
            echo json_encode([
                'success' => false,
                'message' => 'Không xác định được khách hàng để tạo đơn đặt sân.'
            ]);
            exit;
        }
        
        // Check if court is available for this time slot
        $check_sql = "SELECT COUNT(*) as count FROM ct_dat_san ct 
                      JOIN dat_san ds ON ct.id_dat = ds.id_dat 
                      WHERE ct.id_san = ? 
                      AND DATE(ds.ngay_dat) = ? 
                      AND ct.gio_bat_dau < ? 
                      AND ct.gio_ket_thuc > ?
                      AND ds.trang_thai NOT IN ('da_huy','huy')";
        $stmt = $conn->prepare($check_sql);
        $endTimeCheck = $endTime . ':00';
        $startTimeCheck = $startTime . ':00';
        $stmt->bind_param("isss", $courtId, $date, $endTimeCheck, $startTimeCheck);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['count'] > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Khung giờ này đã được đặt! Vui lòng chọn khung giờ khác.'
            ]);
            exit;
        }
        
        // Create booking
        $ngay_dat = $date . ' ' . date('H:i:s');
        // Auto-approve: không cần admin/nhân viên duyệt
        $trang_thai = 'da_duyet';
        
        $sql_dat_san = "INSERT INTO dat_san (id_kh, ngay_dat, tong_tien, trang_thai) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($sql_dat_san);
        $stmt->bind_param("isds", $id_kh, $ngay_dat, $totalPrice, $trang_thai);
        $stmt->execute();
        
        $id_dat = $conn->insert_id;
        
        // Create booking detail
        $gio_bat_dau = $startTime . ':00';
        $gio_ket_thuc = $endTime . ':00';
        
        $sql_ct = "INSERT INTO ct_dat_san (id_dat, id_san, gio_bat_dau, gio_ket_thuc) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($sql_ct);
        $stmt->bind_param("iiss", $id_dat, $courtId, $gio_bat_dau, $gio_ket_thuc);
        $stmt->execute();
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Đặt sân thành công!',
            'bookingId' => $id_dat,
            'courtName' => $courtName,
            'date' => $date,
            'time' => $startTime . ' - ' . $endTime
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi khi đặt sân: ' . $e->getMessage()
        ]);
    } finally {
        $conn->close();
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed!'
    ]);
}
?>
