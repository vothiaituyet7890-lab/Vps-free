<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
// Disable caching to ensure fresh data after changes
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  echo json_encode(['success' => false, 'message' => 'Method not allowed']);
  exit;
}

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
  exit;
}

$userId = intval($_SESSION['user_id']);

// Lấy id_kh từ id_tk
$id_kh = null;
$sql_get_kh = "SELECT id_kh FROM khachhang WHERE id_tk = ? LIMIT 1";
$stmt = $conn->prepare($sql_get_kh);
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
if ($rowKh = $res->fetch_assoc()) {
  $id_kh = intval($rowKh['id_kh']);
}
$stmt->close();

if (!$id_kh) {
  echo json_encode(['success' => true, 'bookings' => []]);
  exit;
}

$sql = "SELECT 
          ds.id_dat,
          ds.ngay_dat,
          ds.tong_tien,
          ds.trang_thai,
          GROUP_CONCAT(DISTINCT s.ten_san SEPARATOR ', ') as court_names,
          GROUP_CONCAT(DISTINCT CONCAT(ct.gio_bat_dau, '-', ct.gio_ket_thuc) SEPARATOR ', ') as time_slots
        FROM dat_san ds
        LEFT JOIN ct_dat_san ct ON ds.id_dat = ct.id_dat
        LEFT JOIN san s ON ct.id_san = s.id_san
        WHERE ds.id_kh = ?
        GROUP BY ds.id_dat
        ORDER BY ds.ngay_dat DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_kh);
$stmt->execute();
$result = $stmt->get_result();

// Helper: remove Vietnamese accents for robust status comparison
function remove_accents($str) {
  $accents = [
    'à'=>'a','á'=>'a','ạ'=>'a','ả'=>'a','ã'=>'a','â'=>'a','ầ'=>'a','ấ'=>'a','ậ'=>'a','ẩ'=>'a','ẫ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ặ'=>'a','ẳ'=>'a','ẵ'=>'a',
    'è'=>'e','é'=>'e','ẹ'=>'e','ẻ'=>'e','ẽ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ệ'=>'e','ể'=>'e','ễ'=>'e',
    'ì'=>'i','í'=>'i','ị'=>'i','ỉ'=>'i','ĩ'=>'i',
    'ò'=>'o','ó'=>'o','ọ'=>'o','ỏ'=>'o','õ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ộ'=>'o','ổ'=>'o','ỗ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ợ'=>'o','ở'=>'o','ỡ'=>'o',
    'ù'=>'u','ú'=>'u','ụ'=>'u','ủ'=>'u','ũ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ự'=>'u','ử'=>'u','ữ'=>'u',
    'ỳ'=>'y','ý'=>'y','ỵ'=>'y','ỷ'=>'y','ỹ'=>'y',
    'đ'=>'d',
    'À'=>'a','Á'=>'a','Ạ'=>'a','Ả'=>'a','Ã'=>'a','Â'=>'a','Ầ'=>'a','Ấ'=>'a','Ậ'=>'a','Ẩ'=>'a','Ẫ'=>'a','Ă'=>'a','Ằ'=>'a','Ắ'=>'a','Ặ'=>'a','Ẳ'=>'a','Ẵ'=>'a',
    'È'=>'e','É'=>'e','Ẹ'=>'e','Ẻ'=>'e','Ẽ'=>'e','Ê'=>'e','Ề'=>'e','Ế'=>'e','Ệ'=>'e','Ể'=>'e','Ễ'=>'e',
    'Ì'=>'i','Í'=>'i','Ị'=>'i','Ỉ'=>'i','Ĩ'=>'i',
    'Ò'=>'o','Ó'=>'o','Ọ'=>'o','Ỏ'=>'o','Õ'=>'o','Ô'=>'o','Ồ'=>'o','Ố'=>'o','Ộ'=>'o','Ổ'=>'o','Ỗ'=>'o','Ơ'=>'o','Ờ'=>'o','Ớ'=>'o','Ợ'=>'o','Ở'=>'o','Ỡ'=>'o',
    'Ù'=>'u','Ú'=>'u','Ụ'=>'u','Ủ'=>'u','Ũ'=>'u','Ư'=>'u','Ừ'=>'u','Ứ'=>'u','Ự'=>'u','Ử'=>'u','Ữ'=>'u',
    'Ỳ'=>'y','Ý'=>'y','Ỵ'=>'y','Ỷ'=>'y','Ỹ'=>'y',
    'Đ'=>'d'
  ];
  return strtr($str, $accents);
}

$items = [];
while ($row = $result->fetch_assoc()) {
  // Chuẩn hóa trạng thái cho UI hiện tại
  $statusDb = strtolower(trim($row['trang_thai']));
  $statusKey = str_replace([' ', '_'], '', remove_accents($statusDb));
  // Map trạng thái cho UI và GIỮ lại các đơn đã hủy
  if (in_array($statusKey, ['huy','dahuy'])) {
    $status = 'cancelled';
  } else if (in_array($statusKey, ['daduyet','approved'])) {
    $status = 'approved';
  } else if (in_array($statusKey, ['choduyet','pending'])) {
    $status = 'pending';
  } else if (in_array($statusKey, ['tuchoi','rejected'])) {
    $status = 'rejected';
  } else if (strpos($statusKey, 'huy') !== false || strpos($statusKey, 'cancel') !== false) {
    $status = 'cancelled';
  } else {
    $status = 'pending';
  }

  $items[] = [
    'id' => $row['id_dat'],
    'court' => $row['court_names'],
    'date' => $row['ngay_dat'],
    'time' => $row['time_slots'],
    'amount' => (float)$row['tong_tien'],
    'status' => $status,
    'statusRaw' => $row['trang_thai'],
    'createdAt' => $row['ngay_dat']
  ];
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'bookings' => $items]);
