<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

// Lấy thông tin user từ localStorage (gửi qua POST)
$data = json_decode(file_get_contents('php://input'), true);
$userId = $data['userId'] ?? null;

if (!$userId) {
    echo json_encode([
        'success' => false,
        'isAdmin' => false,
        'message' => 'Không tìm thấy thông tin user'
    ]);
    exit;
}

// Kiểm tra trong database
$sql = "SELECT vai_tro FROM taikhoan WHERE id_tk = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $role = strtolower(trim($row['vai_tro']));
    $isAdmin = ($role === 'admin');
    
    echo json_encode([
        'success' => true,
        'isAdmin' => $isAdmin,
        'role' => $row['vai_tro']
    ]);
} else {
    echo json_encode([
        'success' => false,
        'isAdmin' => false,
        'message' => 'Tài khoản không tồn tại'
    ]);
}

$stmt->close();
$conn->close();
?>
