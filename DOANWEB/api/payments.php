<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../connect.php';
$conn->set_charset('utf8mb4');

// Create table if not exists
$conn->query("CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_dat INT NOT NULL,
  paid_at DATETIME NOT NULL,
  UNIQUE KEY uniq_booking (id_dat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // Return bookings with paid flag
  $sql = "SELECT 
            ds.id_dat AS id,
            kh.ho_ten AS customerName,
            ds.tong_tien AS price,
            p.paid_at IS NOT NULL AS isPaid,
            p.paid_at
          FROM dat_san ds
          LEFT JOIN khachhang kh ON kh.id_kh = ds.id_kh
          LEFT JOIN payments p ON p.id_dat = ds.id_dat
          ORDER BY ds.id_dat DESC";
  $res = $conn->query($sql);
  $items = [];
  while ($row = $res->fetch_assoc()) {
    $items[] = [
      'id' => (int)$row['id'],
      'customerName' => $row['customerName'] ?: '-',
      'price' => (float)$row['price'],
      'isPaid' => (bool)$row['isPaid'],
      'paidAt' => $row['paid_at']
    ];
  }
  echo json_encode(['success' => true, 'payments' => $items]);
  $conn->close();
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = isset($_GET['id']) ? intval($_GET['id']) : intval($input['id'] ?? 0);
if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'ID không hợp lệ']); exit; }

if ($method === 'POST') {
  // Mark as paid
  $stmt = $conn->prepare("INSERT INTO payments (id_dat, paid_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE paid_at = VALUES(paid_at)");
  $stmt->bind_param('i', $id);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success' => $ok, 'message' => $ok ? 'Đã đánh dấu đã thu' : 'Không thể cập nhật']);
  $conn->close();
  exit;
}

if ($method === 'DELETE') {
  // Unmark paid
  $stmt = $conn->prepare("DELETE FROM payments WHERE id_dat = ?");
  $stmt->bind_param('i', $id);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success' => $ok, 'message' => $ok ? 'Đã bỏ đánh dấu' : 'Không thể cập nhật']);
  $conn->close();
  exit;
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
$conn->close();
