-- 为已存在 user_theme_preference 表的数据库补充侧栏固定状态字段。
-- 该脚本只需执行一次；新库直接导入 schema.sql 即可。
ALTER TABLE user_theme_preference
    ADD COLUMN sidebar_pinned TINYINT NOT NULL DEFAULT 0 AFTER component_opacity;
