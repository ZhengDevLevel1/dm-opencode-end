-- 用户左侧导航“固定收起（悬停不展开）”偏好；适用于已有数据的 flower_shop 数据库。
-- 全新安装请直接导入 flower_shop.sql，无需执行本文件。
USE flower_shop;

ALTER TABLE user_theme_preference
    ADD COLUMN sidebar_locked TINYINT NOT NULL DEFAULT 0 AFTER sidebar_pinned;
