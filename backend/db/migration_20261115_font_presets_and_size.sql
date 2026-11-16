-- ============================================================
-- 字体预设与字号增量迁移（历史六字体版本）
-- 适用于已存在 flower_shop 数据库；全新安装请直接导入 flower_shop.sql。
-- 执行后请继续执行 migration_20261116_restore_four_font_families.sql。
-- ============================================================

ALTER TABLE user_theme_preference
    ADD COLUMN font_size DOUBLE NOT NULL DEFAULT 14
        COMMENT '界面字体大小（px）'
        AFTER font_family;

ALTER TABLE appearance_setting
    ADD COLUMN auth_font_size DOUBLE NOT NULL DEFAULT 14
        COMMENT '登录页字体大小（px）'
        AFTER auth_font_family;

ALTER TABLE user_theme_preference
    MODIFY COLUMN font_family VARCHAR(20) NOT NULL DEFAULT 'sans'
        COMMENT '界面字体风格：serif/sans/round/decol/pixel/hand';

ALTER TABLE appearance_setting
    MODIFY COLUMN auth_font_family VARCHAR(20) NOT NULL DEFAULT 'sans'
        COMMENT '登录页字体风格：serif/sans/round/decol/pixel/hand';

UPDATE user_theme_preference
SET font_family = CASE font_family
    WHEN 'default' THEN 'sans'
    WHEN 'rounded' THEN 'round'
    WHEN 'kai' THEN 'hand'
    ELSE font_family
END;

UPDATE appearance_setting
SET auth_font_family = CASE auth_font_family
    WHEN 'default' THEN 'sans'
    WHEN 'rounded' THEN 'round'
    WHEN 'kai' THEN 'hand'
    ELSE auth_font_family
END;
