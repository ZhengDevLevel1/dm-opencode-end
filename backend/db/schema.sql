CREATE DATABASE IF NOT EXISTS flower_shop DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flower_shop;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS operation_log;
DROP TABLE IF EXISTS recommendation_log;
DROP TABLE IF EXISTS recommendation_weight;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS fulfillment_record;
DROP TABLE IF EXISTS payment_record;
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS shop_order;
DROP TABLE IF EXISTS user_favorite;
DROP TABLE IF EXISTS cart_item;
DROP TABLE IF EXISTS inventory_record;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS sys_user;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE sys_user (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(30) NOT NULL COMMENT '登录名',
    password VARCHAR(100) NOT NULL COMMENT 'BCrypt密码',
    nickname VARCHAR(30) DEFAULT NULL COMMENT '昵称',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    avatar_url VARCHAR(500) DEFAULT NULL COMMENT '头像地址',
    role VARCHAR(20) NOT NULL COMMENT 'CUSTOMER/STAFF/ADMIN',
    status VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_username (username),
    KEY idx_user_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE product (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '商品ID',
    name VARCHAR(100) NOT NULL COMMENT '商品名称',
    category VARCHAR(30) NOT NULL COMMENT '花材品类',
    flower_meaning VARCHAR(200) DEFAULT NULL COMMENT '花语',
    occasion_tags VARCHAR(200) DEFAULT NULL COMMENT '场景标签，逗号分隔',
    festival_tags VARCHAR(200) DEFAULT NULL COMMENT '节日标签，逗号分隔',
    price DECIMAL(10,2) NOT NULL COMMENT '售价',
    original_price DECIMAL(10,2) DEFAULT NULL COMMENT '原价',
    stock INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    image_url VARCHAR(500) DEFAULT NULL COMMENT '图片地址',
    description VARCHAR(2000) DEFAULT NULL COMMENT '商品描述',
    season_suitability VARCHAR(20) NOT NULL DEFAULT 'ALL' COMMENT '季节适用性',
    sales_count INT NOT NULL DEFAULT 0 COMMENT '累计销量',
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00 COMMENT '平均评分',
    rating_count INT NOT NULL DEFAULT 0 COMMENT '评价数量',
    status VARCHAR(20) NOT NULL DEFAULT 'OFF_SHELF' COMMENT 'ON_SALE/OFF_SHELF',
    version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_product_status_category (status, category),
    KEY idx_product_price (price),
    KEY idx_product_sales (sales_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

CREATE TABLE inventory_record (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    change_type VARCHAR(30) NOT NULL COMMENT 'STOCK_IN/ORDER_DEDUCT/ORDER_CANCEL/MANUAL_ADJUST/AFTER_SALE_RESTORE',
    change_quantity INT NOT NULL COMMENT '带符号的变动数量',
    stock_before INT NOT NULL,
    stock_after INT NOT NULL,
    order_no VARCHAR(40) DEFAULT NULL,
    operator_id BIGINT DEFAULT NULL,
    operator_name VARCHAR(50) DEFAULT NULL,
    remark VARCHAR(200) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_inventory_product (product_id),
    KEY idx_inventory_order_no (order_no),
    KEY idx_inventory_created (created_at),
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存变动记录表';

CREATE TABLE cart_item (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cart_user_product (user_id, product_id),
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES sys_user (id),
    CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';

CREATE TABLE user_favorite (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_favorite_user_product (user_id, product_id),
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES sys_user (id),
    CONSTRAINT fk_favorite_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏表';

CREATE TABLE shop_order (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_no VARCHAR(40) NOT NULL,
    user_id BIGINT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    pay_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL COMMENT 'PENDING_PAYMENT/PAID/FULFILLING/COMPLETED/CANCELLED/AFTER_SALE/REFUNDED',
    receiver_name VARCHAR(50) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    receiver_address VARCHAR(255) NOT NULL,
    remark VARCHAR(255) DEFAULT NULL,
    cancel_reason VARCHAR(200) DEFAULT NULL,
    after_sale_reason VARCHAR(500) DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_order_user_status (user_id, status),
    KEY idx_order_status_created (status, created_at),
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

CREATE TABLE order_item (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_image VARCHAR(500) DEFAULT NULL,
    category VARCHAR(30) DEFAULT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    reviewed TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_order_item_order (order_id),
    KEY idx_order_item_product (product_id),
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES shop_order (id),
    CONSTRAINT fk_order_item_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

CREATE TABLE payment_record (
    id BIGINT NOT NULL AUTO_INCREMENT,
    payment_no VARCHAR(40) NOT NULL,
    order_id BIGINT NOT NULL,
    order_no VARCHAR(40) NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'MOCK',
    status VARCHAR(20) NOT NULL COMMENT 'PENDING/SUCCESS/FAILED/REFUNDED',
    paid_at DATETIME DEFAULT NULL,
    callback_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_no (payment_no),
    KEY idx_payment_order (order_id),
    KEY idx_payment_status (status),
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES shop_order (id),
    CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';

CREATE TABLE fulfillment_record (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    order_no VARCHAR(40) NOT NULL,
    node VARCHAR(20) NOT NULL COMMENT 'ACCEPTED/PREPARING/DELIVERING/SIGNED',
    operator_id BIGINT DEFAULT NULL,
    operator_name VARCHAR(50) DEFAULT NULL,
    remark VARCHAR(200) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_fulfillment_order (order_id),
    CONSTRAINT fk_fulfillment_order FOREIGN KEY (order_id) REFERENCES shop_order (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='履约记录表';

CREATE TABLE review (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    order_item_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    rating TINYINT NOT NULL,
    content VARCHAR(500) DEFAULT NULL,
    reply VARCHAR(500) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE' COMMENT 'VISIBLE/HIDDEN',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_review_order_item (order_item_id),
    KEY idx_review_product_status (product_id, status),
    KEY idx_review_user (user_id),
    CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES shop_order (id),
    CONSTRAINT fk_review_order_item FOREIGN KEY (order_item_id) REFERENCES order_item (id),
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES sys_user (id),
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='售后评价表';

CREATE TABLE recommendation_weight (
    id BIGINT NOT NULL AUTO_INCREMENT,
    content_weight DECIMAL(4,3) NOT NULL DEFAULT 0.400,
    popularity_weight DECIMAL(4,3) NOT NULL DEFAULT 0.200,
    festival_weight DECIMAL(4,3) NOT NULL DEFAULT 0.250,
    rating_weight DECIMAL(4,3) NOT NULL DEFAULT 0.150,
    updated_by BIGINT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT ck_recommendation_weight_sum CHECK (
        ABS(content_weight + popularity_weight + festival_weight + rating_weight - 1.000) <= 0.001
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐权重配置表';

CREATE TABLE recommendation_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT DEFAULT NULL,
    scene VARCHAR(30) DEFAULT NULL,
    festival VARCHAR(20) DEFAULT NULL,
    season VARCHAR(20) DEFAULT NULL,
    cold_start TINYINT NOT NULL DEFAULT 0,
    weights_json VARCHAR(500) DEFAULT NULL,
    product_ids VARCHAR(1000) DEFAULT NULL,
    detail_json TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_rec_log_user (user_id),
    KEY idx_rec_log_created (created_at),
    CONSTRAINT fk_rec_log_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐日志表';

CREATE TABLE operation_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT DEFAULT NULL,
    username VARCHAR(30) DEFAULT NULL,
    module VARCHAR(30) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    method VARCHAR(150) DEFAULT NULL,
    request_uri VARCHAR(200) DEFAULT NULL,
    request_method VARCHAR(10) DEFAULT NULL,
    request_params TEXT,
    success TINYINT NOT NULL DEFAULT 1,
    error_message VARCHAR(500) DEFAULT NULL,
    ip VARCHAR(64) DEFAULT NULL,
    duration_ms BIGINT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_op_log_created (created_at),
    KEY idx_op_log_module (module),
    KEY idx_op_log_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

CREATE TABLE appearance_setting (
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

CREATE TABLE tag_option (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tag_type VARCHAR(20) NOT NULL,
    name VARCHAR(30) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tag_type_name (tag_type, name),
    KEY idx_tag_type_sort (tag_type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品标签选项表';

CREATE TABLE tag_type_setting (
    tag_type VARCHAR(20) NOT NULL,
    max_select_count INT NOT NULL DEFAULT 8,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (tag_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签类型配置表';

CREATE TABLE metric_config (
    id TINYINT NOT NULL DEFAULT 1,
    price_mid_threshold DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    price_high_threshold DECIMAL(10,2) NOT NULL DEFAULT 300.00,
    stock_low_threshold INT NOT NULL DEFAULT 10,
    stock_high_threshold INT NOT NULL DEFAULT 50,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='价格带与库存指标配置表';

CREATE TABLE user_theme_preference (
    user_id BIGINT NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'system',
    palette VARCHAR(40) NOT NULL DEFAULT 'default',
    accent VARCHAR(20) NOT NULL DEFAULT 'sky',
    custom_accent VARCHAR(20) NOT NULL DEFAULT '#38bdf8',
    radius VARCHAR(20) NOT NULL DEFAULT 'default',
    density VARCHAR(20) NOT NULL DEFAULT 'comfortable',
    sidebar_style VARCHAR(20) NOT NULL DEFAULT 'follow',
    scale DOUBLE NOT NULL DEFAULT 1,
    reduce_motion TINYINT NOT NULL DEFAULT 0,
    high_contrast TINYINT NOT NULL DEFAULT 0,
    background VARCHAR(20) NOT NULL DEFAULT 'solid',
    background_image VARCHAR(500) DEFAULT NULL,
    background_opacity DOUBLE NOT NULL DEFAULT 0.82,
    background_blur INT NOT NULL DEFAULT 0,
    component_opacity DOUBLE NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_theme_pref_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户外观偏好表';
