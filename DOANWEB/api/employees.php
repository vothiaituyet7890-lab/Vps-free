<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

// GET - Lấy danh sách nhân viên hoặc 1 nhân viên
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $sql = "SELECT * FROM nhanvien WHERE id_nv = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            echo json_encode([
                'id' => $row['id_nv'],
                'name' => $row['ho_ten'],
                'phone' => $row['sdt'],
                'email' => $row['email'],
                'position' => $row['chuc_vu'],
                'salary' => $row['luong']
            ]);
        } else {
            echo json_encode(['error' => 'Không tìm thấy nhân viên']);
        }
    } else {
        // Lấy tất cả nhân viên
        $sql = "SELECT * FROM nhanvien ORDER BY id_nv DESC";
        
        $result = $conn->query($sql);
        $employees = [];
        
        while ($row = $result->fetch_assoc()) {
            $employees[] = [
                'id' => $row['id_nv'],
                'name' => $row['ho_ten'],
                'phone' => $row['sdt'],
                'email' => $row['email'],
                'position' => $row['chuc_vu'],
                'salary' => $row['luong']
            ];
        }
        
        echo json_encode($employees);
    }
}

// POST - Thêm nhân viên mới
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = $data['name'] ?? '';
    $phone = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    $position = $data['position'] ?? '';
    $salary = $data['salary'] ?? 0;
    
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng nhập họ tên!']);
        exit;
    }
    
    $sql = "INSERT INTO nhanvien (ho_ten, sdt, email, chuc_vu, luong) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssd", $name, $phone, $email, $position, $salary);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Thêm nhân viên thành công!',
            'id' => $conn->insert_id
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi: ' . $conn->error
        ]);
    }
}

// PUT - Cập nhật nhân viên
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($_GET['id'] ?? 0);
    
    if ($id === 0) {
        echo json_encode(['success' => false, 'message' => 'ID không hợp lệ']);
        exit;
    }
    
    $name = $data['name'] ?? '';
    $phone = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    $position = $data['position'] ?? '';
    $salary = $data['salary'] ?? 0;
    
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng nhập họ tên!']);
        exit;
    }
    
    $sql = "UPDATE nhanvien SET ho_ten = ?, sdt = ?, email = ?, chuc_vu = ?, luong = ? WHERE id_nv = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssdi", $name, $phone, $email, $position, $salary, $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Cập nhật nhân viên thành công!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $conn->error]);
    }
}

// DELETE - Xóa nhân viên
elseif ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    
    if ($id === 0) {
        echo json_encode(['success' => false, 'message' => 'ID không hợp lệ']);
        exit;
    }
    
    $sql = "DELETE FROM nhanvien WHERE id_nv = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Xóa nhân viên thành công!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $conn->error]);
    }
}

$conn->close();
?>
