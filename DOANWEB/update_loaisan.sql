-- Thêm cột icon và mo_ta vào bảng loaisan nếu chưa có

ALTER TABLE `loaisan` 
ADD COLUMN IF NOT EXISTS `icon` varchar(10) DEFAULT '⚽' AFTER `gia_gio`,
ADD COLUMN IF NOT EXISTS `mo_ta` text DEFAULT NULL AFTER `icon`;

-- Cập nhật dữ liệu mẫu nếu bảng trống
INSERT INTO `loaisan` (`id_loaisan`, `ten_loai`, `gia_gio`, `icon`, `mo_ta`) VALUES
(1, 'Sân bóng đá mini', 200000.00, '⚽', 'Sân bóng đá 5 người, có mái che, đèn chiếu sáng'),
(2, 'Sân cầu lông', 80000.00, '🏸', 'Sân cầu lông tiêu chuẩn, có điều hòa'),
(3, 'Sân tennis', 150000.00, '🎾', 'Sân tennis chuyên nghiệp, mặt sân cỏ nhân tạo'),
(4, 'Sân pickleball', 100000.00, '🏓', 'Sân pickleball hiện đại, phù hợp mọi lứa tuổi')
ON DUPLICATE KEY UPDATE 
    icon = VALUES(icon),
    mo_ta = VALUES(mo_ta);
