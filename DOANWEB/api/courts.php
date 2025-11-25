<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Lấy danh sách sân hoặc 1 sân
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        // Lấy 1 sân
        $id = intval($_GET['id']);
        $sql = "SELECT s.*, l.ten_loai, l.gia_gio 
                FROM san s 
                LEFT JOIN loaisan l ON s.id_loaisan = l.id_loaisan 
                WHERE s.id_san = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            echo json_encode([
                'id' => $row['id_san'],
                'name' => $row['ten_san'],
                'typeId' => $row['id_loaisan'],
                'typeName' => $row['ten_loai'],
                'price' => $row['gia_gio'],
                'description' => $row['mo_ta'] ?? '',
                'status' => $row['trang_thai']
            ]);
        } else {
            echo json_encode(['error' => 'Không tìm thấy sân']);
        }
    } else {
        // Lấy tất cả sân
        $sql = "SELECT s.*, l.ten_loai, l.gia_gio 
                FROM san s 
                LEFT JOIN loaisan l ON s.id_loaisan = l.id_loaisan 
                ORDER BY s.id_san ASC";
        $result = $conn->query($sql);
        
        $courts = [];
        while ($row = $result->fetch_assoc()) {
            $courts[] = [
                'id' => $row['id_san'],
                'name' => $row['ten_san'],
                'typeId' => $row['id_loaisan'],
                'typeName' => $row['ten_loai'],
                'price' => $row['gia_gio'],
                'description' => $row['mo_ta'] ?? '',
                'status' => $row['trang_thai']
            ];
        }
        
        echo json_encode($courts);
    }
}

// POST - Thêm sân mới
else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = $data['name'] ?? '';
    $typeId = intval($data['typeId'] ?? 0);
    $description = $data['description'] ?? '';
    $status = $data['status'] ?? 'trong';
    
    if (empty($name) || $typeId <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng điền đầy đủ thông tin!'
        ]);
        exit;
    }
    
    // Kiểm tra loại sân có tồn tại không
    $checkSql = "SELECT id_loaisan FROM loaisan WHERE id_loaisan = ?";
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("i", $typeId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Loại sân không tồn tại!'
        ]);
        exit;
    }
    
    $sql = "INSERT INTO san (ten_san, id_loaisan, mo_ta, trang_thai) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("siss", $name, $typeId, $description, $status);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Thêm sân thành công!',
            'id' => $conn->insert_id
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi: ' . $conn->error
        ]);
    }
}

// PUT - Cập nhật sân
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
    
    // Nếu chỉ cập nhật status
    if (isset($data['status']) && count($data) === 1) {
        $status = $data['status'];
        $sql = "UPDATE san SET trang_thai = ? WHERE id_san = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $status, $id);
    } else {
        $name = $data['name'] ?? '';
        $typeId = intval($data['typeId'] ?? 0);
        $description = $data['description'] ?? '';
        $status = $data['status'] ?? 'trong';
        
        if (empty($name) || $typeId <= 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Vui lòng điền đầy đủ thông tin!'
            ]);
            exit;
        }
        
        $sql = "UPDATE san SET ten_san = ?, id_loaisan = ?, mo_ta = ?, trang_thai = ? WHERE id_san = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sissi", $name, $typeId, $description, $status, $id);
    }
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Cập nhật sân thành công!'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi: ' . $conn->error
        ]);
    }
}

// DELETE - Xóa sân
else if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'ID không hợp lệ!'
        ]);
        exit;
    }
    
    // Kiểm tra xem có đơn đặt nào đang dùng sân này không
    $checkSql = "SELECT COUNT(*) as count FROM ct_dat_san WHERE id_san = ?";
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['count'] > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa! Có ' . $row['count'] . ' đơn đặt đang sử dụng sân này.'
        ]);
        exit;
    }
    
    $sql = "DELETE FROM san WHERE id_san = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Xóa sân thành công!'
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
