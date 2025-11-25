<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

// Get parameters
$courtId = intval($_GET['courtId'] ?? 0);
$date = $_GET['date'] ?? '';
$startTime = $_GET['startTime'] ?? '';
$endTime = $_GET['endTime'] ?? '';

if ($courtId <= 0 || empty($date) || empty($startTime) || empty($endTime)) {
    echo json_encode([
        'available' => false,
        'message' => 'Thiếu thông tin!'
    ]);
    exit;
}

// Check if slot is available
$sql = "SELECT COUNT(*) as count 
        FROM ct_dat_san ct 
        JOIN dat_san ds ON ct.id_dat = ds.id_dat 
        WHERE ct.id_san = ? 
        AND DATE(ds.ngay_dat) = ? 
        AND (? < ct.gio_ket_thuc AND ? > ct.gio_bat_dau)
        AND ds.trang_thai <> 'da_huy'";

$stmt = $conn->prepare($sql);
$endTimeCheck = $endTime . ':00';
$startTimeCheck = $startTime . ':00';

$stmt->bind_param("isss", 
    $courtId, 
    $date, 
    $startTimeCheck, 
    $endTimeCheck
);

$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

$available = ($row['count'] == 0);

echo json_encode([
    'available' => $available,
    'message' => $available ? 'Sân còn trống' : 'Sân đã được đặt'
]);

$conn->close();
?>
