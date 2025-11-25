<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once '../connect.php';
$conn->set_charset("utf8mb4");

// Thống kê tổng quan
$today = date('Y-m-d');

// Doanh thu hôm nay
$sql = "SELECT COALESCE(SUM(tong_tien), 0) as revenue 
        FROM dat_san 
        WHERE DATE(ngay_dat) = '$today' AND trang_thai != 'huy'";
$result = $conn->query($sql);
$todayRevenue = $result->fetch_assoc()['revenue'];

// Đơn đặt hôm nay
$sql = "SELECT COUNT(*) as count 
        FROM dat_san 
        WHERE DATE(ngay_dat) = '$today'";
$result = $conn->query($sql);
$todayBookings = $result->fetch_assoc()['count'];

// Số sân đang hoạt động
$sql = "SELECT COUNT(*) as count 
        FROM san 
        WHERE trang_thai = 'trong'";
$result = $conn->query($sql);
$activeCourts = $result->fetch_assoc()['count'];

// Tổng số người dùng
$sql = "SELECT COUNT(*) as count 
        FROM taikhoan 
        WHERE vai_tro = 'khachhang'";
$result = $conn->query($sql);
$totalUsers = $result->fetch_assoc()['count'];

echo json_encode([
    'todayRevenue' => $todayRevenue,
    'todayBookings' => $todayBookings,
    'activeCourts' => $activeCourts,
    'totalUsers' => $totalUsers
]);

$conn->close();
?>
