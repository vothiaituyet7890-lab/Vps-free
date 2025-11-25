<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
require_once '../connect.php';
$conn->set_charset('utf8mb4');

try {
  $sql = "SELECT kh.id_kh, kh.ho_ten AS name, kh.sdt AS phone,
                  COUNT(ds.id_dat) AS booking_count,
                  COALESCE(SUM(ds.tong_tien),0) AS total_spent
           FROM khachhang kh
           LEFT JOIN dat_san ds ON ds.id_kh = kh.id_kh
           GROUP BY kh.id_kh, kh.ho_ten, kh.sdt
           ORDER BY total_spent DESC, booking_count DESC";
  $res = $conn->query($sql);
  $items = [];
  while ($row = $res->fetch_assoc()) {
    $items[] = [
      'id' => (int)$row['id_kh'],
      'name' => $row['name'] ?: '-',
      'phone' => $row['phone'] ?: '-',
      'orders' => (int)$row['booking_count'],
      'total' => (float)$row['total_spent']
    ];
  }
  echo json_encode(['success' => true, 'customers' => $items]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()]);
}
$conn->close();
