-- 用户地址簿与订单配送坐标；适用于已有数据的 flower_shop 数据库。
-- 全新安装请直接导入 flower_shop.sql，无需执行本文件。
USE flower_shop;

CREATE TABLE IF NOT EXISTS user_address (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    receiver_name VARCHAR(50) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    label VARCHAR(10) NOT NULL DEFAULT '家',
    province VARCHAR(30) DEFAULT NULL,
    city VARCHAR(30) DEFAULT NULL,
    district VARCHAR(30) DEFAULT NULL,
    detail_address VARCHAR(100) NOT NULL,
    formatted_address VARCHAR(150) DEFAULT NULL,
    longitude DECIMAL(10,7) DEFAULT NULL,
    latitude DECIMAL(10,7) DEFAULT NULL,
    is_default TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_address_user_default (user_id, is_default),
    CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户地址簿';

ALTER TABLE shop_order
    ADD COLUMN receiver_longitude DECIMAL(10,7) DEFAULT NULL AFTER receiver_address,
    ADD COLUMN receiver_latitude DECIMAL(10,7) DEFAULT NULL AFTER receiver_longitude;
