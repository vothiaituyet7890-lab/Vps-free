<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../connect.php';
$conn->set_charset('utf8mb4');

// Create CaTruc table if not exists
$conn->query("CREATE TABLE IF NOT EXISTS catruc (
  ma_ca CHAR(10) PRIMARY KEY,
  ten_ca VARCHAR(30) NOT NULL,
  gio_bat_dau TIME NOT NULL,
  gio_ket_thuc TIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Seed default shifts if empty
$cntRes = $conn->query("SELECT COUNT(*) AS c FROM catruc");
$cntRow = $cntRes ? $cntRes->fetch_assoc() : ['c' => 0];
if ((int)$cntRow['c'] === 0) {
  $conn->query("INSERT INTO catruc (ma_ca, ten_ca, gio_bat_dau, gio_ket_thuc) VALUES
    ('C1','Ca sáng','06:00:00','12:00:00'),
    ('C2','Ca chiều','12:00:00','18:00:00'),
    ('C3','Ca tối','18:00:00','00:00:00')");
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $rows = [];
  $res = $conn->query("SELECT ma_ca, ten_ca, gio_bat_dau, gio_ket_thuc FROM catruc ORDER BY ma_ca");
  while ($r = $res->fetch_assoc()) $rows[] = $r;
  echo json_encode(['success' => true, 'shifts' => $rows]);
  $conn->close();
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
  $ma = $input['ma_ca'] ?? null;
  $ten = $input['ten_ca'] ?? null;
  $bd = $input['gio_bat_dau'] ?? null;
  $kt = $input['gio_ket_thuc'] ?? null;
  if (!$ma || !$ten || !$bd || !$kt) { echo json_encode(['success'=>false,'message'=>'Thiếu dữ liệu']); exit; }
  $stmt = $conn->prepare("REPLACE INTO catruc (ma_ca, ten_ca, gio_bat_dau, gio_ket_thuc) VALUES (?,?,?,?)");
  $stmt->bind_param('ssss', $ma, $ten, $bd, $kt);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success'=>$ok]);
  $conn->close();
  exit;
}

if ($method === 'DELETE') {
  $ma = $_GET['ma_ca'] ?? '';
  if (!$ma) { echo json_encode(['success'=>false,'message'=>'Thiếu ma_ca']); exit; }
  $stmt = $conn->prepare("DELETE FROM catruc WHERE ma_ca=?");
  $stmt->bind_param('s', $ma);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success'=>$ok]);
  $conn->close();
  exit;
}

echo json_encode(['success'=>false,'message'=>'Method not allowed']);
$conn->close();
