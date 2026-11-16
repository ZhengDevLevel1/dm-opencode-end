-- ============================================================
-- 外观字体风格增量迁移
-- 适用于已存在的 flower_shop 数据库；全新安装请直接导入 flower_shop.sql。
-- ============================================================

ALTER TABLE user_theme_preference
    ADD COLUMN font_family VARCHAR(20) NOT NULL DEFAULT 'default'
        COMMENT '界面字体风格：default/serif/rounded/kai'
        AFTER custom_accent;

ALTER TABLE appearance_setting
    ADD COLUMN auth_font_family VARCHAR(20) NOT NULL DEFAULT 'default'
        COMMENT '登录页字体风格：default/serif/rounded/kai'
        AFTER auth_custom_accent;
