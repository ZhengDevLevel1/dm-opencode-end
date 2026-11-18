-- 用户地图选点“自动跳转最近地标”偏好；适用于已有数据的 flower_shop 数据库。
-- 全新安装请直接导入 flower_shop.sql，无需执行本文件。
USE flower_shop;

ALTER TABLE user_theme_preference
    ADD COLUMN map_snap_to_landmark TINYINT NOT NULL DEFAULT 0 AFTER sidebar_pinned;
