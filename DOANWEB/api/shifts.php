<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../connect.php';
$conn->set_charset('utf8mb4');

// Create table if not exists
$conn->query("CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_date DATE NOT NULL,
  shift_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $res = $conn->query("SELECT id, shift_date, shift_name FROM shifts ORDER BY shift_date DESC, id DESC");
  $items = [];
  while ($row = $res->fetch_assoc()) {
    $items[] = [ 'id' => (int)$row['id'], 'date' => $row['shift_date'], 'name' => $row['shift_name'] ];
  }
  echo json_encode(['success' => true, 'shifts' => $items]);
  $conn->close();
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
  $date = $input['date'] ?? '';
  $name = $input['name'] ?? '';
  if (!$date || !$name) { echo json_encode(['success' => false, 'message' => 'Thiếu dữ liệu']); exit; }
  $stmt = $conn->prepare("INSERT INTO shifts (shift_date, shift_name) VALUES (?, ?)");
  $stmt->bind_param('ss', $date, $name);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success' => $ok]);
  $conn->close();
  exit;
}

if ($method === 'DELETE') {
  $id = intval($_GET['id'] ?? 0);
  if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'ID không hợp lệ']); exit; }
  $stmt = $conn->prepare("DELETE FROM shifts WHERE id = ?");
  $stmt->bind_param('i', $id);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success' => $ok]);
  $conn->close();
  exit;
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
$conn->close();
