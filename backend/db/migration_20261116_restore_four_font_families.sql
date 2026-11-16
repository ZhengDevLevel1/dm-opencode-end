-- ============================================================
-- 恢复四种系统字体预设
-- 适用于已执行过六字体迁移的 flower_shop 数据库；全新安装请直接导入 flower_shop.sql。
-- ============================================================

UPDATE user_theme_preference
SET font_family = CASE
    WHEN font_family IN ('default', 'serif', 'rounded', 'kai') THEN font_family
    WHEN font_family = 'round' THEN 'rounded'
    WHEN font_family = 'hand' THEN 'kai'
    WHEN font_family = 'decol' THEN 'serif'
    ELSE 'default'
END;

UPDATE appearance_setting
SET auth_font_family = CASE
    WHEN auth_font_family IN ('default', 'serif', 'rounded', 'kai') THEN auth_font_family
    WHEN auth_font_family = 'round' THEN 'rounded'
    WHEN auth_font_family = 'hand' THEN 'kai'
    WHEN auth_font_family = 'decol' THEN 'serif'
    ELSE 'default'
END;

ALTER TABLE user_theme_preference
    MODIFY COLUMN font_family VARCHAR(20) NOT NULL DEFAULT 'default'
        COMMENT '界面字体风格：default/serif/rounded/kai';

ALTER TABLE appearance_setting
    MODIFY COLUMN auth_font_family VARCHAR(20) NOT NULL DEFAULT 'default'
        COMMENT '登录页字体风格：default/serif/rounded/kai';
