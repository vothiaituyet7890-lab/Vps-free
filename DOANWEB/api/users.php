<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Lấy danh sách người dùng
if ($method === 'GET') {
    $sql = "SELECT 
            tk.id_tk,
            tk.ten_dang_nhap,
            tk.vai_tro,
            kh.ho_ten,
            kh.email,
            kh.sdt,
            kh.trang_thai
            FROM taikhoan tk
            LEFT JOIN khachhang kh ON tk.id_tk = kh.id_tk
            WHERE tk.vai_tro = 'khachhang'
            ORDER BY tk.id_tk DESC";
    
    $result = $conn->query($sql);
    $users = [];
    
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'id' => $row['id_tk'],
            'username' => $row['ten_dang_nhap'],
            'name' => $row['ho_ten'],
            'email' => $row['email'],
            'phone' => $row['sdt'],
            'role' => $row['vai_tro'],
            'status' => $row['trang_thai'] ?? 'active'
        ];
    }
    
    echo json_encode($users);
}

// PUT - Cập nhật trạng thái người dùng (khóa/mở khóa)
else if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID không hợp lệ!']);
        exit;
    }
    
    // Không cho khóa admin
    $checkSql = "SELECT vai_tro FROM taikhoan WHERE id_tk = ?";
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if ($user['vai_tro'] === 'admin') {
        echo json_encode(['success' => false, 'message' => 'Không thể khóa tài khoản admin!']);
        exit;
    }
    
    $status = $data['status'] ?? 'active';
    
    $sql = "UPDATE khachhang SET trang_thai = ? WHERE id_tk = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $status, $id);
    
    if ($stmt->execute()) {
        $message = $status === 'locked' ? 'Đã khóa tài khoản!' : 'Đã mở khóa tài khoản!';
        echo json_encode(['success' => true, 'message' => $message]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $conn->error]);
    }
}

// DELETE - Xóa người dùng
else if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID không hợp lệ!']);
        exit;
    }
    
    // Không cho xóa admin
    $checkSql = "SELECT vai_tro FROM taikhoan WHERE id_tk = ?";
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if ($user['vai_tro'] === 'admin') {
        echo json_encode(['success' => false, 'message' => 'Không thể xóa tài khoản admin!']);
        exit;
    }
    
    $conn->begin_transaction();
    
    try {
        // Xóa thông tin khách hàng trước
        $sql1 = "DELETE FROM khachhang WHERE id_tk = ?";
        $stmt1 = $conn->prepare($sql1);
        $stmt1->bind_param("i", $id);
        $stmt1->execute();
        
        // Xóa tài khoản
        $sql2 = "DELETE FROM taikhoan WHERE id_tk = ?";
        $stmt2 = $conn->prepare($sql2);
        $stmt2->bind_param("i", $id);
        $stmt2->execute();
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Xóa người dùng thành công!']);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()]);
    }
}

$conn->close();
?>
