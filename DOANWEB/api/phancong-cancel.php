<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../connect.php';
$conn->set_charset('utf8mb4');

// Create cancel request table
$conn->query("CREATE TABLE IF NOT EXISTS phancong_cancel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pc INT NOT NULL,
  id_nv INT NOT NULL,
  ngay_truc DATE NOT NULL,
  ma_ca CHAR(10) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  INDEX idx_pc (id_pc),
  INDEX idx_nv_day (id_nv, ngay_truc),
  CONSTRAINT fk_pcc_pc FOREIGN KEY (id_pc) REFERENCES phancongca(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // List requests; filter optional by status or id_nv or ngay
  $where = [];
  $params = [];
  $types = '';
  if (isset($_GET['status'])) { $where[] = 'status = ?'; $types .= 's'; $params[] = $_GET['status']; }
  if (isset($_GET['id_nv'])) { $where[] = 'id_nv = ?'; $types .= 'i'; $params[] = intval($_GET['id_nv']); }
  if (isset($_GET['ngay'])) { $where[] = 'ngay_truc = ?'; $types .= 's'; $params[] = $_GET['ngay']; }
  $sql = 'SELECT * FROM phancong_cancel';
  if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
  $sql .= ' ORDER BY created_at DESC';
  $stmt = $conn->prepare($sql);
  if ($where) $stmt->bind_param($types, ...$params);
  $stmt->execute();
  $res = $stmt->get_result();
  $rows = [];
  while ($r = $res->fetch_assoc()) $rows[] = $r;
  echo json_encode(['success'=>true, 'requests'=>$rows]);
  $stmt->close();
  $conn->close();
  exit;
}

if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  $id_pc = intval($input['id_pc'] ?? 0);
  $id_nv = intval($input['id_nv'] ?? 0);
  $ngay = $input['ngay_truc'] ?? '';
  $ma_ca = $input['ma_ca'] ?? '';
  $reason = trim($input['reason'] ?? '');
  if ($id_pc<=0 || $id_nv<=0 || !$ngay || !$ma_ca || $reason==='') { echo json_encode(['success'=>false,'message'=>'Thiếu dữ liệu']); exit; }
  // Prevent multiple pending requests for the same assignment/day
  $chk = $conn->prepare('SELECT id FROM phancong_cancel WHERE id_pc=? AND status="pending" LIMIT 1');
  $chk->bind_param('i', $id_pc);
  $chk->execute();
  $has = $chk->get_result()->fetch_assoc();
  $chk->close();
  if ($has) { echo json_encode(['success'=>false,'message'=>'Yêu cầu hủy ca đang chờ duyệt']); exit; }
  $stmt = $conn->prepare('INSERT INTO phancong_cancel (id_pc, id_nv, ngay_truc, ma_ca, reason) VALUES (?,?,?,?,?)');
  $stmt->bind_param('iisss', $id_pc, $id_nv, $ngay, $ma_ca, $reason);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success'=>$ok]);
  $conn->close();
  exit;
}

if ($method === 'PUT') {
  // Admin approve/reject: ?id=... body { action: 'approve'|'reject' }
  $id = intval($_GET['id'] ?? 0);
  $input = json_decode(file_get_contents('php://input'), true);
  $action = $input['action'] ?? '';
  if ($id<=0 || !in_array($action, ['approve','reject'])) { echo json_encode(['success'=>false,'message'=>'Thiếu dữ liệu']); exit; }
  $status = $action === 'approve' ? 'approved' : 'rejected';
  $stmt = $conn->prepare('UPDATE phancong_cancel SET status=?, reviewed_at=NOW() WHERE id=?');
  $stmt->bind_param('si', $status, $id);
  $ok = $stmt->execute();
  $stmt->close();
  if ($ok && $status==='approved') {
    // On approval, remove the assignment
    $conn->query('DELETE pc FROM phancongca pc JOIN phancong_cancel pcc ON pcc.id_pc = pc.id WHERE pcc.id = '.intval($id));
  }
  echo json_encode(['success'=>$ok]);
  $conn->close();
  exit;
}

echo json_encode(['success'=>false,'message'=>'Method not allowed']);
$conn->close();
