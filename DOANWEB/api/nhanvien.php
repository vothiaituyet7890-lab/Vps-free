<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../connect.php';
$conn->set_charset('utf8mb4');

// Ensure nhanvien has id_tk link (optional)
$conn->query("ALTER TABLE nhanvien ADD COLUMN IF NOT EXISTS id_tk INT NULL");
// Some MySQL versions don't support IF NOT EXISTS on ADD COLUMN. Ignore errors silently.

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  if (isset($_GET['id_tk'])) {
    $id_tk = intval($_GET['id_tk']);
    $stmt = $conn->prepare("SELECT id_nv, ho_ten, chuc_vu, id_tk FROM nhanvien WHERE id_tk = ? LIMIT 1");
    $stmt->bind_param('i', $id_tk);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    echo json_encode(['success'=> (bool)$row, 'nhanvien'=>$row]);
    $stmt->close();
  } else {
    $rows = [];
    $res = $conn->query("SELECT id_nv, ho_ten, chuc_vu, id_tk FROM nhanvien ORDER BY id_nv");
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    echo json_encode(['success'=>true,'nhanvien'=>$rows]);
  }
  $conn->close();
  exit;
}

if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  $id_tk = isset($input['id_tk']) ? intval($input['id_tk']) : null;
  $ho_ten = $input['ho_ten'] ?? null;
  $chuc_vu = $input['chuc_vu'] ?? null;
  if (!$id_tk || !$ho_ten) { echo json_encode(['success'=>false,'message'=>'Thiếu id_tk hoặc ho_ten']); exit; }
  $stmt = $conn->prepare("INSERT INTO nhanvien (ho_ten, chuc_vu, id_tk) VALUES (?,?,?)");
  $stmt->bind_param('ssi', $ho_ten, $chuc_vu, $id_tk);
  $ok = $stmt->execute();
  $id_nv = $conn->insert_id;
  $stmt->close();
  echo json_encode(['success'=>$ok, 'id_nv'=>$id_nv]);
  $conn->close();
  exit;
}

if ($method === 'PUT') {
  $input = json_decode(file_get_contents('php://input'), true);
  $id_nv = intval($_GET['id_nv'] ?? 0);
  if ($id_nv<=0) { echo json_encode(['success'=>false,'message'=>'ID không hợp lệ']); exit; }
  $ho_ten = $input['ho_ten'] ?? null;
  $chuc_vu = $input['chuc_vu'] ?? null;
  $id_tk = isset($input['id_tk']) ? intval($input['id_tk']) : null;
  $stmt = $conn->prepare("UPDATE nhanvien SET ho_ten = COALESCE(?, ho_ten), chuc_vu = COALESCE(?, chuc_vu), id_tk = COALESCE(?, id_tk) WHERE id_nv = ?");
  $stmt->bind_param('ssii', $ho_ten, $chuc_vu, $id_tk, $id_nv);
  $ok = $stmt->execute();
  $stmt->close();
  echo json_encode(['success'=>$ok]);
  $conn->close();
  exit;
}

echo json_encode(['success'=>false,'message'=>'Method not allowed']);
$conn->close();
