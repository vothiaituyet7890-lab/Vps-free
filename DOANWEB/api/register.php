<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Tắt hiển thị lỗi PHP để không làm hỏng JSON
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
    
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $password = $data['password'] ?? '';
    
    if (empty($name) || empty($email) || empty($phone) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng điền đầy đủ thông tin!'
        ]);
        exit;
    }
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Email không hợp lệ!'
        ]);
        exit;
    }
    
    // Validate phone
    if (!preg_match('/^0[0-9]{9}$/', $phone)) {
        echo json_encode([
            'success' => false,
            'message' => 'Số điện thoại không hợp lệ!'
        ]);
        exit;
    }
    
    // Kiểm tra email đã tồn tại
    $check_email = "SELECT id_kh FROM khachhang WHERE email = ?";
    $stmt = $conn->prepare($check_email);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Email đã được đăng ký!'
        ]);
        exit;
    }
    
    // Kiểm tra số điện thoại đã tồn tại
    $check_phone = "SELECT id_kh FROM khachhang WHERE sdt = ?";
    $stmt = $conn->prepare($check_phone);
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Số điện thoại đã được đăng ký!'
        ]);
        exit;
    }
    
    $conn->begin_transaction();
        // Tạo tài khoản
        $sql_account = "INSERT INTO taikhoan (ten_dang_nhap, mat_khau, vai_tro) VALUES (?, ?, 'khachhang')";
        $stmt = $conn->prepare($sql_account);
        $stmt->bind_param("ss", $email, $password);
        $stmt->execute();
        
        $id_tk = $conn->insert_id;
        
        // Tạo thông tin khách hàng
        $trang_thai = 'active';
        $sql_customer = "INSERT INTO khachhang (id_tk, ho_ten, email, sdt, trang_thai) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql_customer);
        $stmt->bind_param("issss", $id_tk, $name, $email, $phone, $trang_thai);
        $stmt->execute();
        
        $conn->commit();
        
        // Tự động đăng nhập
        $_SESSION['user_id'] = $id_tk;
        $_SESSION['user_role'] = 'khachhang';
        
        $userData = [
            'id' => $id_tk,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'role' => 'khachhang',
            'createdAt' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode([
            'success' => true,
            'message' => 'Đăng ký thành công!',
            'user' => $userData
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi khi đăng ký: ' . $e->getMessage()
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
