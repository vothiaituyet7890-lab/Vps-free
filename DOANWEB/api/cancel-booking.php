<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset('utf8mb4');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(['success' => false, 'message' => 'Method not allowed']);
  exit;
}

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$bookingId = intval($payload['bookingId'] ?? 0);
if ($bookingId <= 0) {
  echo json_encode(['success' => false, 'message' => 'ID đơn đặt sân không hợp lệ']);
  exit;
}

$userId = intval($_SESSION['user_id']);

// Tìm id_kh của user
$id_kh = null;
$stmt = $conn->prepare("SELECT id_kh FROM khachhang WHERE id_tk = ? LIMIT 1");
$stmt->bind_param('i', $userId);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
  $id_kh = intval($row['id_kh']);
}
$stmt->close();

if (!$id_kh) {
  echo json_encode(['success' => false, 'message' => 'Không tìm thấy thông tin khách hàng']);
  exit;
}

// Kiểm tra quyền sở hữu và thời gian cho phép hủy (trước 2 giờ so với giờ bắt đầu)
$sql = "SELECT ds.id_dat, ds.id_kh, ds.trang_thai, DATE(ds.ngay_dat) AS ngay_choi,
               MIN(ct.gio_bat_dau) AS gio_bat_dau
        FROM dat_san ds
        LEFT JOIN ct_dat_san ct ON ds.id_dat = ct.id_dat
        WHERE ds.id_dat = ?
        GROUP BY ds.id_dat";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $bookingId);
$stmt->execute();
$info = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$info) {
  echo json_encode(['success' => false, 'message' => 'Không tìm thấy đơn đặt sân']);
  $conn->close();
  exit;
}

if (intval($info['id_kh']) !== $id_kh) {
  echo json_encode(['success' => false, 'message' => 'Không thể hủy đơn đặt sân (không thuộc quyền sở hữu)']);
  $conn->close();
  exit;
}

if (strtolower($info['trang_thai']) === 'da_huy' || strtolower($info['trang_thai']) === 'huy') {
  echo json_encode(['success' => false, 'message' => 'Đơn đặt sân đã hủy trước đó']);
  $conn->close();
  exit;
}

// Tính thời điểm bắt đầu
$ngayChoi = $info['ngay_choi'];
$gioBatDau = $info['gio_bat_dau'] ?: '00:00:00';
$startDateTime = strtotime($ngayChoi . ' ' . $gioBatDau);
$now = time();
$limit = $startDateTime - 2 * 3600; // 2 giờ trước giờ bắt đầu

if ($now > $limit) {
  echo json_encode(['success' => false, 'message' => 'Đã quá thời hạn hủy (chỉ được hủy trước giờ đá 2 giờ)']);
  $conn->close();
  exit;
}

// Cho phép hủy
$stmt = $conn->prepare("UPDATE dat_san SET trang_thai = 'da_huy' WHERE id_dat = ? AND id_kh = ? AND trang_thai <> 'da_huy'");
$stmt->bind_param('ii', $bookingId, $id_kh);
if ($stmt->execute() && $stmt->affected_rows > 0) {
  echo json_encode(['success' => true, 'message' => 'Đã hủy đơn đặt sân']);
} else {
  echo json_encode(['success' => false, 'message' => 'Không thể hủy đơn đặt sân (không thuộc quyền sở hữu hoặc đã hủy)']);
}
$stmt->close();
$conn->close();
