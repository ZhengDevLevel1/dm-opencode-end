-- 门店营业电话：用于商品详情页脚展示，并可在后台“商品配置-营业时间”中维护。
USE flower_shop;

CREATE TABLE IF NOT EXISTS store_profile (
    id BIGINT NOT NULL,
    business_phone VARCHAR(30) NOT NULL DEFAULT '400-820-1024' COMMENT '门店营业电话',
    updated_by BIGINT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店联系信息';

INSERT IGNORE INTO store_profile (id, business_phone) VALUES (1, '400-820-1024');
