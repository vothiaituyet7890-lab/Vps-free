<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Lấy danh sách chấm công
if ($method === 'GET') {
    if (isset($_GET['thang'])) {
        // Lấy chấm công theo tháng
        $thang = $_GET['thang']; // Format: YYYY-MM
        $sql = "SELECT cc.*, nv.ho_ten 
                FROM chamcong cc
                LEFT JOIN nhanvien nv ON cc.id_nv = nv.id_nv
                WHERE DATE_FORMAT(cc.ngay, '%Y-%m') = ?
                ORDER BY cc.ngay ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $thang);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = [
                'id_cc' => $row['id_cc'],
                'id_nv' => $row['id_nv'],
                'ho_ten' => $row['ho_ten'],
                'ngay' => $row['ngay'],
                'gio_vao' => $row['gio_vao'],
                'gio_ra' => $row['gio_ra'],
                'trang_thai' => $row['trang_thai'],
                'ghi_chu' => $row['ghi_chu']
            ];
        }
        
        echo json_encode($data);
    } else {
        // Lấy chấm công theo ngày
        $ngay = $_GET['ngay'] ?? date('Y-m-d');
        
        // Lấy danh sách nhân viên và trạng thái chấm công hôm nay
        $sql = "SELECT nv.id_nv, nv.ho_ten, nv.chuc_vu,
                cc.id_cc, cc.ngay, cc.gio_vao, cc.gio_ra, cc.trang_thai, cc.ghi_chu
                FROM nhanvien nv
                LEFT JOIN chamcong cc ON nv.id_nv = cc.id_nv AND cc.ngay = ?
                ORDER BY nv.id_nv ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $ngay);
        $stmt->execute();
        $result = $stmt->get_result();
    
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = [
                'id_nv' => $row['id_nv'],
                'ho_ten' => $row['ho_ten'],
                'chuc_vu' => $row['chuc_vu'],
                'id_cc' => $row['id_cc'],
                'ngay' => $row['ngay'],
                'gio_vao' => $row['gio_vao'],
                'gio_ra' => $row['gio_ra'],
                'trang_thai' => $row['trang_thai'] ?? 'vang',
                'ghi_chu' => $row['ghi_chu'],
                'da_cham' => $row['id_cc'] ? true : false
            ];
        }
        
        echo json_encode($data);
    }
}

// POST - Chấm công
else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id_nv = intval($data['id_nv'] ?? 0);
    $ngay = $data['ngay'] ?? date('Y-m-d');
    $gio_vao = $data['gio_vao'] ?? date('H:i:s');
    // Determine status by comparing to assigned shift start time (if any)
    // default status
    $trang_thai = 'co_mat';
    $ghi_chu = $data['ghi_chu'] ?? '';
    
    if ($id_nv <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID nhân viên không hợp lệ!']);
        exit;
    }
    
    // Kiểm tra đã chấm công chưa
    $check_sql = "SELECT id_cc FROM chamcong WHERE id_nv = ? AND ngay = ?";
    $stmt = $conn->prepare($check_sql);
    $stmt->bind_param("is", $id_nv, $ngay);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Nhân viên đã được chấm công hôm nay!']);
        exit;
    }
    
    // If assignment exists for today, compute late/ontime
    try {
        $assign_sql = "SELECT ct.gio_bat_dau FROM phancongca pc JOIN catruc ct ON ct.ma_ca = pc.ma_ca WHERE pc.id_nv = ? AND pc.ngay_truc = ? LIMIT 1";
        $assign_stmt = $conn->prepare($assign_sql);
        $assign_stmt->bind_param("is", $id_nv, $ngay);
        $assign_stmt->execute();
        $assign_res = $assign_stmt->get_result();
        if ($rowA = $assign_res->fetch_assoc()) {
            $start = strtotime($rowA['gio_bat_dau']);
            $in = strtotime($gio_vao);
            if ($start && $in) {
                $lateBoundary = $start + 15 * 60; // +15 minutes
                $trang_thai = ($in > $lateBoundary) ? 'Tre' : 'Dung gio';
            }
        }
        $assign_stmt->close();
    } catch (Exception $e) {}

    // Thêm chấm công
    $sql = "INSERT INTO chamcong (id_nv, ngay, gio_vao, trang_thai, ghi_chu) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("issss", $id_nv, $ngay, $gio_vao, $trang_thai, $ghi_chu);
    
    if ($stmt->execute()) {
        $newId = $conn->insert_id;
        echo json_encode([
            'success' => true,
            'message' => 'Chấm công thành công!',
            'id' => $newId,
            'record' => [
                'id_cc' => $newId,
                'id_nv' => $id_nv,
                'ngay' => $ngay,
                'gio_vao' => $gio_vao,
                'gio_ra' => null,
                'trang_thai' => $trang_thai,
                'ghi_chu' => $ghi_chu
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $conn->error]);
    }
}

// PUT - Cập nhật giờ ra
else if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id_cc = intval($_GET['id'] ?? 0);
    
    if ($id_cc <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID không hợp lệ!']);
        exit;
    }
    
    $gio_ra = $data['gio_ra'] ?? date('H:i:s');
    $ghi_chu = $data['ghi_chu'] ?? '';
    
    $sql = "UPDATE chamcong SET gio_ra = ?, ghi_chu = ? WHERE id_cc = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssi", $gio_ra, $ghi_chu, $id_cc);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Cập nhật giờ ra thành công!', 'gio_ra' => $gio_ra]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $conn->error]);
    }
}

// DELETE - Xóa chấm công
else if ($method === 'DELETE') {
    $id_cc = intval($_GET['id'] ?? 0);
    
    if ($id_cc <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID không hợp lệ!']);
        exit;
    }
    
    $sql = "DELETE FROM chamcong WHERE id_cc = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id_cc);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Xóa chấm công thành công!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $conn->error]);
    }
}

$conn->close();
?>
