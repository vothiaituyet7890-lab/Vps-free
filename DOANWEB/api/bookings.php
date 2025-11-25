<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Lấy danh sách đơn đặt
if ($method === 'GET') {
    $sql = "SELECT 
            ds.id_dat,
            ds.ngay_dat,
            ds.tong_tien,
            ds.trang_thai,
            kh.ho_ten as customer_name,
            GROUP_CONCAT(DISTINCT s.ten_san SEPARATOR ', ') as court_names,
            GROUP_CONCAT(DISTINCT CONCAT(ct.gio_bat_dau, '-', ct.gio_ket_thuc) SEPARATOR ', ') as time_slots
            FROM dat_san ds
            LEFT JOIN khachhang kh ON ds.id_kh = kh.id_kh
            LEFT JOIN ct_dat_san ct ON ds.id_dat = ct.id_dat
            LEFT JOIN san s ON ct.id_san = s.id_san
            GROUP BY ds.id_dat
            ORDER BY ds.ngay_dat DESC";
    
    $result = $conn->query($sql);
    $bookings = [];
    
    while ($row = $result->fetch_assoc()) {
        $bookings[] = [
            'id' => $row['id_dat'],
            'customerName' => $row['customer_name'],
            'courtName' => $row['court_names'],
            'date' => date('d/m/Y', strtotime($row['ngay_dat'])),
            'time' => $row['time_slots'],
            'price' => $row['tong_tien'],
            'status' => $row['trang_thai']
        ];
    }
    
    echo json_encode($bookings);
}

// PUT - Cập nhật trạng thái đơn đặt
else if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID không hợp lệ!']);
        exit;
    }
    
    $status = $data['status'] ?? '';
    
    if (!in_array($status, ['cho_duyet', 'da_duyet', 'huy'])) {
        echo json_encode(['success' => false, 'message' => 'Trạng thái không hợp lệ!']);
        exit;
    }
    
    $sql = "UPDATE dat_san SET trang_thai = ? WHERE id_dat = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $status, $id);
    
    if ($stmt->execute()) {
        $message = $status === 'da_duyet' ? 'Đã duyệt đơn đặt sân!' : 'Đã hủy đơn đặt sân!';
        echo json_encode(['success' => true, 'message' => $message]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $conn->error]);
    }
}

$conn->close();
?>
