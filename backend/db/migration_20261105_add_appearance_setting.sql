CREATE TABLE IF NOT EXISTS appearance_setting (
    id BIGINT NOT NULL,
    auth_background_image VARCHAR(500) DEFAULT NULL,
    background_type VARCHAR(20) DEFAULT NULL COMMENT 'NONE/GRADIENT/IMAGE',
    background_opacity DOUBLE NOT NULL DEFAULT 0.78,
    background_blur INT NOT NULL DEFAULT 0,
    component_opacity DOUBLE NOT NULL DEFAULT 1,
    updated_by BIGINT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='外观设置表';

INSERT INTO appearance_setting (id)
VALUES (1)
ON DUPLICATE KEY UPDATE id = id;

-- 兼容已执行过早期版本迁移（无调节字段）的数据库，逐列幂等补齐。
SET @has_type := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appearance_setting'
      AND COLUMN_NAME = 'background_type'
);
SET @ddl := IF(@has_type = 0,
    'ALTER TABLE appearance_setting ADD COLUMN background_type VARCHAR(20) DEFAULT NULL COMMENT ''NONE/GRADIENT/IMAGE'' AFTER auth_background_image',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_opacity := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appearance_setting'
      AND COLUMN_NAME = 'background_opacity'
);
SET @ddl := IF(@has_opacity = 0,
    'ALTER TABLE appearance_setting ADD COLUMN background_opacity DOUBLE NOT NULL DEFAULT 0.78 AFTER auth_background_image',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_blur := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appearance_setting'
      AND COLUMN_NAME = 'background_blur'
);
SET @ddl := IF(@has_blur = 0,
    'ALTER TABLE appearance_setting ADD COLUMN background_blur INT NOT NULL DEFAULT 0 AFTER background_opacity',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_component := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appearance_setting'
      AND COLUMN_NAME = 'component_opacity'
);
SET @ddl := IF(@has_component = 0,
    'ALTER TABLE appearance_setting ADD COLUMN component_opacity DOUBLE NOT NULL DEFAULT 1 AFTER background_blur',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
