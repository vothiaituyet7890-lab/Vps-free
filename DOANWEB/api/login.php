<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $identifier = $data['identifier'] ?? '';
    $password = $data['password'] ?? '';
    
    if (empty($identifier) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng điền đầy đủ thông tin!'
        ]);
        exit;
    }
    
    // Đơn giản: chỉ dùng bảng taikhoan
    $sql = "SELECT id_tk, ten_dang_nhap, mat_khau, vai_tro FROM taikhoan WHERE ten_dang_nhap = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $identifier);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Kiểm tra mật khẩu
        if ($row['mat_khau'] === $password) {
            // Đăng nhập thành công
            $_SESSION['user_id'] = $row['id_tk'];
            // Nếu username là 'admin' thì đảm bảo vai trò là admin
            $usernameLower = strtolower(trim($row['ten_dang_nhap']));
            $role = strtolower(trim($row['vai_tro']));
            if ($usernameLower === 'admin') { $role = 'admin'; }
            $_SESSION['user_role'] = $role;
            
            $userData = [
                'id' => $row['id_tk'],
                'name' => $row['ten_dang_nhap'],
                'email' => $row['ten_dang_nhap'],
                'role' => $role,
                'createdAt' => date('Y-m-d H:i:s')
            ];
            
            echo json_encode([
                'success' => true,
                'message' => 'Đăng nhập thành công!',
                'user' => $userData
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Mật khẩu không đúng!'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Tài khoản không tồn tại!'
        ]);
    }
    
    $stmt->close();
    $conn->close();
}
?>
