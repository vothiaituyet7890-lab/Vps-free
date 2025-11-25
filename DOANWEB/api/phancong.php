<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../connect.php';
$conn->set_charset('utf8mb4');

// Tables: catruc (ma_ca PK), nhanvien (id_nv PK), san (id_san PK assumed)
// Create phancongca if not exists
$conn->query("CREATE TABLE IF NOT EXISTS phancongca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_nv INT NOT NULL,
  ma_ca CHAR(10) NOT NULL,
  ngay_truc DATE NOT NULL,
  id_san INT NULL,
  UNIQUE KEY uniq_assign (id_nv, ma_ca, ngay_truc),
  INDEX idx_ngay (ngay_truc),
  CONSTRAINT fk_pc_nv FOREIGN KEY (id_nv) REFERENCES nhanvien(id_nv) ON DELETE CASCADE,
  CONSTRAINT fk_pc_ca FOREIGN KEY (ma_ca) REFERENCES catruc(ma_ca) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $ngay = $_GET['ngay'] ?? date('Y-m-d');
  $id_nv = isset($_GET['id_nv']) ? intval($_GET['id_nv']) : null;
  $sql = "SELECT pc.id, pc.id_nv, nv.ho_ten, pc.ma_ca, ct.ten_ca, ct.gio_bat_dau, ct.gio_ket_thuc,
                 pc.ngay_truc, pc.id_san
          FROM phancongca pc
          JOIN nhanvien nv ON nv.id_nv = pc.id_nv
          JOIN catruc ct ON ct.ma_ca = pc.ma_ca
          WHERE pc.ngay_truc = ?";
  if ($id_nv) { $sql .= " AND pc.id_nv = ?"; }
  $sql .= " ORDER BY ct.ma_ca, nv.ho_ten";
  $stmt = $conn->prepare($sql);
  if ($id_nv) { $stmt->bind_param('si', $ngay, $id_nv); }
  else { $stmt->bind_param('s', $ngay); }
  $stmt->execute();
  $res = $stmt->get_result();
  $rows = [];
  while ($r = $res->fetch_assoc()) $rows[] = $r;
  echo json_encode(['success'=>true,'assignments'=>$rows]);
  $stmt->close();
  $conn->close();
  exit;
}

if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  $id_nv = intval($input['id_nv'] ?? 0);
  $ma_ca = $input['ma_ca'] ?? '';
  $ngay = $input['ngay_truc'] ?? '';
  $id_san = isset($input['id_san']) && $input['id_san'] !== '' ? intval($input['id_san']) : null;
  if ($id_nv<=0 || !$ma_ca || !$ngay) { echo json_encode(['success'=>false,'message'=>'Thiếu dữ liệu']); exit; }
  // 1) Prevent duplicate assignment for same staff/shift/date
  $chk = $conn->prepare("SELECT id FROM phancongca WHERE id_nv=? AND ma_ca=? AND ngay_truc=? LIMIT 1");
  $chk->bind_param('iss', $id_nv, $ma_ca, $ngay);
  $chk->execute();
  $dup = $chk->get_result()->fetch_assoc();
  $chk->close();
  if ($dup) { echo json_encode(['success'=>true,'message'=>'Đã đăng ký ca này rồi']); exit; }
  // 2) Enforce capacity <= 3 per (ngay_truc, ma_ca)
  $cnt = $conn->prepare("SELECT COUNT(*) AS c FROM phancongca WHERE ma_ca=? AND ngay_truc=?");
  $cnt->bind_param('ss', $ma_ca, $ngay);
  $cnt->execute();
  $cRes = $cnt->get_result()->fetch_assoc();
  $cnt->close();
  if ((int)$cRes['c'] >= 3) { echo json_encode(['success'=>false,'message'=>'Ca này đã đủ 3 người']); exit; }
  $stmt = $conn->prepare("INSERT INTO phancongca (id_nv, ma_ca, ngay_truc, id_san) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE id_san=VALUES(id_san)");
  $stmt->bind_param('isss', $id_nv, $ma_ca, $ngay, $id_san);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success'=>$ok]);
  $conn->close();
  exit;
}

if ($method === 'DELETE') {
  $id = intval($_GET['id'] ?? 0);
  if ($id<=0) { echo json_encode(['success'=>false,'message'=>'ID không hợp lệ']); exit; }
  $stmt = $conn->prepare("DELETE FROM phancongca WHERE id=?");
  $stmt->bind_param('i', $id);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success'=>$ok]);
  $conn->close();
  exit;
}

echo json_encode(['success'=>false,'message'=>'Method not allowed']);
$conn->close();
