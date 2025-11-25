<?php
header('Content-Type: text/html; charset=utf-8');

echo "<h2>Test Database Connection</h2>";

require_once 'connect.php';

if ($conn->connect_error) {
    echo "❌ Kết nối thất bại: " . $conn->connect_error;
} else {
    echo "✅ Kết nối database thành công!<br><br>";
    
    // Test query
    $sql = "SELECT * FROM loaisan";
    $result = $conn->query($sql);
    
    if ($result) {
        echo "✅ Bảng loaisan tồn tại!<br>";
        echo "Số loại sân: " . $result->num_rows . "<br><br>";
        
        echo "<h3>Danh sách loại sân:</h3>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Tên</th><th>Giá</th><th>Icon</th><th>Mô tả</th></tr>";
        
        while ($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . $row['id_loaisan'] . "</td>";
            echo "<td>" . $row['ten_loai'] . "</td>";
            echo "<td>" . number_format($row['gia_gio']) . "đ</td>";
            echo "<td>" . ($row['icon'] ?? 'N/A') . "</td>";
            echo "<td>" . ($row['mo_ta'] ?? 'N/A') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "❌ Lỗi query: " . $conn->error;
    }
    
    $conn->close();
}
?>
