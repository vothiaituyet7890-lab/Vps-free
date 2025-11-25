<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Lấy danh sách loại sân hoặc 1 loại sân
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        // Lấy 1 loại sân
        $id = intval($_GET['id']);
        $sql = "SELECT * FROM loaisan WHERE id_loaisan = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            echo json_encode([
                'id' => $row['id_loaisan'],
                'name' => $row['ten_loai'],
                'price' => $row['gia_gio']
            ]);
        } else {
            echo json_encode(['error' => 'Không tìm thấy loại sân']);
        }
    } else {
        // Lấy tất cả loại sân
        $sql = "SELECT * FROM loaisan ORDER BY id_loaisan ASC";
        $result = $conn->query($sql);
        
        $courtTypes = [];
        while ($row = $result->fetch_assoc()) {
            $courtTypes[] = [
                'id' => $row['id_loaisan'],
                'name' => $row['ten_loai'],
                'price' => $row['gia_gio']
            ];
        }
        
        echo json_encode($courtTypes);
    }
}

// POST - Thêm loại sân mới
else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = $data['name'] ?? '';
    $price = $data['price'] ?? 0;
    
    if (empty($name) || $price <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng điền đầy đủ thông tin!'
        ]);
        exit;
    }
    
    $sql = "INSERT INTO loaisan (ten_loai, gia_gio) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sd", $name, $price);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Thêm loại sân thành công!',
            'id' => $conn->insert_id
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi: ' . $conn->error
        ]);
    }
}

// PUT - Cập nhật loại sân
else if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'ID không hợp lệ!'
        ]);
        exit;
    }
    
    $name = $data['name'] ?? '';
    $price = $data['price'] ?? 0;
    
    if (empty($name) || $price <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng điền đầy đủ thông tin!'
        ]);
        exit;
    }
    
    $sql = "UPDATE loaisan SET ten_loai = ?, gia_gio = ? WHERE id_loaisan = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sdi", $name, $price, $id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Cập nhật loại sân thành công!'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi: ' . $conn->error
        ]);
    }
}

// DELETE - Xóa loại sân
else if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'ID không hợp lệ!'
        ]);
        exit;
    }
    
    // Kiểm tra xem có sân nào đang dùng loại sân này không
    $checkSql = "SELECT COUNT(*) as count FROM san WHERE id_loaisan = ?";
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['count'] > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa! Có ' . $row['count'] . ' sân đang sử dụng loại sân này.'
        ]);
        exit;
    }
    
    $sql = "DELETE FROM loaisan WHERE id_loaisan = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Xóa loại sân thành công!'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi: ' . $conn->error
        ]);
    }
}

$conn->close();
?>
