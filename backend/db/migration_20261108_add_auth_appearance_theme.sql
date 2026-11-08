-- 登录页外观风格：表面配色、强调色与自定义强调色
-- 适用于已执行过 migration_20261105_add_appearance_setting.sql 的数据库。

INSERT INTO appearance_setting (id)
VALUES (1)
ON DUPLICATE KEY UPDATE id = id;

SET @has_palette := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appearance_setting'
      AND COLUMN_NAME = 'auth_palette'
);
SET @ddl := IF(@has_palette = 0,
    'ALTER TABLE appearance_setting ADD COLUMN auth_palette VARCHAR(32) NOT NULL DEFAULT ''default'' COMMENT ''默认表面配色'' AFTER component_opacity',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_accent := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appearance_setting'
      AND COLUMN_NAME = 'auth_accent'
);
SET @ddl := IF(@has_accent = 0,
    'ALTER TABLE appearance_setting ADD COLUMN auth_accent VARCHAR(32) NOT NULL DEFAULT ''sky'' COMMENT ''登录页强调色'' AFTER auth_palette',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_custom_accent := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appearance_setting'
      AND COLUMN_NAME = 'auth_custom_accent'
);
SET @ddl := IF(@has_custom_accent = 0,
    'ALTER TABLE appearance_setting ADD COLUMN auth_custom_accent VARCHAR(16) NOT NULL DEFAULT ''#38bdf8'' COMMENT ''自定义强调色 #RRGGBB'' AFTER auth_accent',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
