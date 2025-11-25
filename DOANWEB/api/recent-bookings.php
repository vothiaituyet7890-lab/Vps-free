<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

// Lấy đơn đặt sân gần đây
$sql = "SELECT 
    ds.id_dat,
    kh.ho_ten as customer_name,
    s.ten_san as court_name,
    ds.ngay_dat,
    ds.tong_tien,
    ds.trang_thai
FROM dat_san ds
LEFT JOIN khachhang kh ON ds.id_kh = kh.id_kh
LEFT JOIN ct_dat_san cds ON ds.id_dat = cds.id_dat
LEFT JOIN san s ON cds.id_san = s.id_san
ORDER BY ds.ngay_dat DESC
LIMIT 10";

$result = $conn->query($sql);

$bookings = [];
while ($row = $result->fetch_assoc()) {
    $bookings[] = [
        'id' => 'BK' . str_pad($row['id_dat'], 3, '0', STR_PAD_LEFT),
        'customerName' => $row['customer_name'] ?? 'N/A',
        'courtName' => $row['court_name'] ?? 'N/A',
        'date' => date('d/m/Y', strtotime($row['ngay_dat'])),
        'timeSlot' => '18:00-20:00',
        'price' => $row['tong_tien'] ?? 0,
        'status' => $row['trang_thai'] ?? 'pending'
    ];
}

echo json_encode($bookings);
$conn->close();
?>
