-- 标签首页展示：品类标签与场景标签控制商城首页的展示与排序
-- 适用于已执行过 migration_20261108_add_user_theme_preference.sql 的数据库。

SET @has_home_visible := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tag_option'
      AND COLUMN_NAME = 'home_visible'
);
SET @ddl := IF(@has_home_visible = 0,
    'ALTER TABLE tag_option ADD COLUMN home_visible TINYINT NOT NULL DEFAULT 1 COMMENT ''是否在商城首页展示'' AFTER sort_order',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_home_sort := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tag_option'
      AND COLUMN_NAME = 'home_sort_order'
);
SET @ddl := IF(@has_home_sort = 0,
    'ALTER TABLE tag_option ADD COLUMN home_sort_order INT NOT NULL DEFAULT 0 COMMENT ''商城首页展示排序'' AFTER home_visible',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 仅在首次新增字段时初始化：老数据沿用标签原有排序；场景默认只展示前 6 个，保持原首页样式。
SET @need_init := @has_home_visible = 0;

UPDATE tag_option
SET home_sort_order = sort_order
WHERE @need_init = 1 AND home_sort_order = 0;

UPDATE tag_option
SET home_visible = 0
WHERE @need_init = 1 AND tag_type = 'OCCASION' AND home_sort_order > 6;
