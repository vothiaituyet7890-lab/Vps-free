-- Fix bảng loaisan: thêm cột icon và mo_ta nếu chưa có

-- Kiểm tra và thêm cột icon
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'qlydatsan' 
AND TABLE_NAME = 'loaisan' 
AND COLUMN_NAME = 'icon';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `loaisan` ADD COLUMN `icon` varchar(10) DEFAULT ''⚽'' AFTER `gia_gio`',
    'SELECT ''Column icon already exists'' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Kiểm tra và thêm cột mo_ta
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'qlydatsan' 
AND TABLE_NAME = 'loaisan' 
AND COLUMN_NAME = 'mo_ta';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `loaisan` ADD COLUMN `mo_ta` text DEFAULT NULL AFTER `icon`',
    'SELECT ''Column mo_ta already exists'' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
