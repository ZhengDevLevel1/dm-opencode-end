-- ============================================================
-- 花店管理系统（flower_shop）数据库完整初始化脚本
-- ------------------------------------------------------------
-- 本文件由 schema.sql、data.sql 与全部增量迁移脚本整合而成，
-- 已包含头像、外观设置、标签管理、主题偏好、推荐场景权重、
-- 邮箱唯一约束、地址簿与订单配送坐标等最新结构，适用于全新数据库一键初始化。
--
-- 执行方式（Windows / Linux / macOS）：
--   mysql -uroot -p < backend/db/flower_shop.sql
--
-- 注意：脚本会删除并重建 flower_shop 中的业务表，请勿在
--       已有生产数据的库上直接执行。
-- ============================================================

CREATE DATABASE IF NOT EXISTS flower_shop DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flower_shop;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_theme_preference;
DROP TABLE IF EXISTS appearance_setting;
DROP TABLE IF EXISTS metric_config;
DROP TABLE IF EXISTS tag_type_setting;
DROP TABLE IF EXISTS tag_option;
DROP TABLE IF EXISTS operation_log;
DROP TABLE IF EXISTS ai_prompt_tag;
DROP TABLE IF EXISTS ai_chat_message;
DROP TABLE IF EXISTS ai_chat_conversation;
DROP TABLE IF EXISTS recommendation_log;
DROP TABLE IF EXISTS recommendation_scene_weight;
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
DROP TABLE IF EXISTS user_address;
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
    UNIQUE KEY uk_user_email (email),
    KEY idx_user_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE user_address (
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
    ai_tags VARCHAR(255) DEFAULT NULL COMMENT 'AI 智能标签，逗号分隔',
    ai_selling_points VARCHAR(500) DEFAULT NULL COMMENT 'AI 卖点，逗号分隔',
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
    source_request_id VARCHAR(64) DEFAULT NULL,
    source_event_id VARCHAR(80) DEFAULT NULL,
    source_scene VARCHAR(30) DEFAULT NULL,
    source_position INT DEFAULT NULL,
    source_strategy VARCHAR(40) DEFAULT NULL,
    source_experiment_id VARCHAR(64) DEFAULT NULL,
    source_variant VARCHAR(30) DEFAULT NULL,
    attributed_at DATETIME DEFAULT NULL,
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
    receiver_longitude DECIMAL(10,7) DEFAULT NULL,
    receiver_latitude DECIMAL(10,7) DEFAULT NULL,
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

CREATE TABLE recommendation_scene_weight (
    scene VARCHAR(30) NOT NULL,
    content_weight DECIMAL(4,3) NOT NULL DEFAULT 0.400,
    popularity_weight DECIMAL(4,3) NOT NULL DEFAULT 0.200,
    festival_weight DECIMAL(4,3) NOT NULL DEFAULT 0.250,
    rating_weight DECIMAL(4,3) NOT NULL DEFAULT 0.150,
    enabled TINYINT NOT NULL DEFAULT 1,
    updated_by BIGINT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (scene),
    CONSTRAINT ck_recommendation_scene_weight_sum CHECK (
        ABS(content_weight + popularity_weight + festival_weight + rating_weight - 1.000) <= 0.001
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐场景权重配置表';

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
    request_id VARCHAR(64) DEFAULT NULL,
    user_id BIGINT DEFAULT NULL,
    scene VARCHAR(30) DEFAULT NULL,
    strategy VARCHAR(40) DEFAULT NULL,
    experiment_id VARCHAR(64) DEFAULT NULL,
    variant VARCHAR(30) DEFAULT NULL,
    mode VARCHAR(30) DEFAULT NULL,
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
    KEY idx_rec_log_request (request_id),
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
    auth_palette VARCHAR(32) NOT NULL DEFAULT 'default' COMMENT '默认表面配色',
    auth_accent VARCHAR(32) NOT NULL DEFAULT 'sky' COMMENT '登录页强调色',
    auth_custom_accent VARCHAR(16) NOT NULL DEFAULT '#38bdf8' COMMENT '自定义强调色 #RRGGBB',
    auth_font_family VARCHAR(20) NOT NULL DEFAULT 'default' COMMENT '登录页字体风格：default/serif/rounded/kai',
    auth_font_size DOUBLE NOT NULL DEFAULT 14 COMMENT '登录页字体大小（px）',
    updated_by BIGINT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='外观设置表';

CREATE TABLE tag_option (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tag_type VARCHAR(20) NOT NULL,
    name VARCHAR(30) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    home_visible TINYINT NOT NULL DEFAULT 1 COMMENT '是否在商城首页展示',
    home_sort_order INT NOT NULL DEFAULT 0 COMMENT '商城首页展示排序',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tag_type_name (tag_type, name),
    KEY idx_tag_type_sort (tag_type, sort_order),
    KEY idx_tag_home (tag_type, home_visible, home_sort_order)
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
    font_family VARCHAR(20) NOT NULL DEFAULT 'default',
    font_size DOUBLE NOT NULL DEFAULT 14,
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
    sidebar_pinned TINYINT NOT NULL DEFAULT 0,
    sidebar_locked TINYINT NOT NULL DEFAULT 0,
    map_snap_to_landmark TINYINT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_theme_pref_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户外观偏好表';

INSERT INTO sys_user (id, username, password, nickname, phone, email, role, status, created_at) VALUES
(1, 'admin', '$2a$10$35/6kxXtuaL1EReRCGBtkOJLxqGRTaneTZfa2a9J/7LDnOOMfYsb2', '系统管理员', '13800000001', 'admin@flower.local', 'ADMIN', 'ENABLED', DATE_SUB(NOW(), INTERVAL 180 DAY)),
(2, 'staff', '$2a$10$uTa4iQ7rC4shnrvDBGtjTeg40A3TRTfAWzSq8sSVTEryfxRCXF9ka', '花艺店员', '13800000002', 'staff@flower.local', 'STAFF', 'ENABLED', DATE_SUB(NOW(), INTERVAL 150 DAY)),
(3, 'customer', '$2a$10$UOWDZ803o1iJSyi9sC2D3.ZlTtg2qIYK0E8lZ9TaRLYe0OiV5w2CO', '小玫', '13900000003', 'customer@flower.local', 'CUSTOMER', 'ENABLED', DATE_SUB(NOW(), INTERVAL 120 DAY)),
(4, 'alice', '$2a$10$0tqIg0C4j23jTHWxyU5JQObjXiseEH6hQf8kq9eAYs9C04f/AfH0O', '爱丽丝', '13900000004', 'alice@flower.local', 'CUSTOMER', 'ENABLED', DATE_SUB(NOW(), INTERVAL 90 DAY)),
(5, 'bob', '$2a$10$UOWDZ803o1iJSyi9sC2D3.ZlTtg2qIYK0E8lZ9TaRLYe0OiV5w2CO', '新用户鲍勃', '13900000005', 'bob@flower.local', 'CUSTOMER', 'ENABLED', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, 'disabled', '$2a$10$UOWDZ803o1iJSyi9sC2D3.ZlTtg2qIYK0E8lZ9TaRLYe0OiV5w2CO', '已停用用户', '13900000006', 'disabled@flower.local', 'CUSTOMER', 'DISABLED', DATE_SUB(NOW(), INTERVAL 30 DAY));

INSERT INTO user_address (id, user_id, receiver_name, receiver_phone, label, province, city, district, detail_address, formatted_address, longitude, latitude, is_default, created_at) VALUES
(1, 3, '小玫', '13900000003', '家', '上海市', '上海市', '徐汇区', '衡山路88号1号楼502', '上海市徐汇区衡山路88号', 121.4468000, 31.2043000, 1, DATE_SUB(NOW(), INTERVAL 100 DAY)),
(2, 3, '小玫', '13900000003', '公司', '上海市', '上海市', '静安区', '南京西路1266号恒隆广场20层', '上海市静安区南京西路1266号', 121.4539000, 31.2279000, 0, DATE_SUB(NOW(), INTERVAL 80 DAY)),
(3, 4, '爱丽丝', '13900000004', '家', '上海市', '上海市', '静安区', '南京西路1266号', '上海市静安区南京西路1266号', 121.4539000, 31.2279000, 1, DATE_SUB(NOW(), INTERVAL 60 DAY));

INSERT INTO product (id, name, category, flower_meaning, occasion_tags, festival_tags, price, original_price, stock, image_url, description, season_suitability, sales_count, rating_avg, rating_count, status, created_at) VALUES
(1, '经典红玫瑰礼盒·11朵', '玫瑰', '热烈爱情，至死不渝', '表白,纪念日,生日', '情人节,七夕', 199.00, 239.00, 120, '/images/products/rose-11.svg', '精选厄瓜多尔红玫瑰11朵，搭配尤加利叶与雾面礼盒，适合表白与纪念日。', 'ALL', 320, 4.80, 86, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 160 DAY)),
(2, '香槟玫瑰·99朵', '玫瑰', '天长地久，只此一人', '求婚,纪念日,表白', '情人节,七夕', 599.00, 699.00, 43, '/images/products/rose-99.svg', '99朵香槟玫瑰巨型花束，手工包扎，适合求婚与重要纪念日。', 'ALL', 96, 4.90, 30, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 155 DAY)),
(3, '粉色康乃馨花束', '康乃馨', '感恩母爱，温柔守护', '母亲节,教师节,生日', '母亲节,教师节', 129.00, 159.00, 80, '/images/products/carnation-pink.svg', '粉色康乃馨搭配洋桔梗，温柔配色，送给母亲与老师的心意之选。', 'SPRING', 210, 4.70, 55, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 150 DAY)),
(4, '白百合花束', '百合', '纯洁高雅，百年好合', '婚礼,开业,生日', '春节', 159.00, 199.00, 60, '/images/products/lily-white.svg', '香水百合6枝，搭配白色满天星，清雅大气，适合婚礼与开业。', 'ALL', 180, 4.60, 40, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 145 DAY)),
(5, '向日葵花束', '向日葵', '阳光忠诚，勇敢追梦', '毕业季,生日,探望', '毕业季', 109.00, 139.00, 90, '/images/products/sunflower.svg', '向日葵5枝搭配尤加利叶，明亮温暖，为毕业与生日送上祝福。', 'SUMMER', 150, 4.50, 33, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 140 DAY)),
(6, '郁金香花束', '郁金香', '爱的告白，优雅浪漫', '情人节,生日,日常', '情人节', 139.00, 169.00, 70, '/images/products/tulip.svg', '进口郁金香10枝，色彩柔和，日常送花与告白皆宜。', 'SPRING', 130, 4.60, 25, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 130 DAY)),
(7, '混搭鲜花礼盒', '混合花束', '温暖祝福，日日欢喜', '生日,日常,探望', '', 189.00, 229.00, 100, '/images/products/mixed-box.svg', '玫瑰、洋桔梗、小雏菊混搭礼盒，明亮配色，适合日常送礼。', 'ALL', 260, 4.70, 62, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 120 DAY)),
(8, '永生玫瑰礼盒', '永生花', '永恒的爱，永不凋零', '情人节,纪念日,求婚', '情人节,七夕', 329.00, 399.00, 30, '/images/products/preserved-rose.svg', '厄瓜多尔永生玫瑰搭配玻璃罩与灯串，长久保存的浪漫纪念。', 'ALL', 88, 4.80, 21, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 110 DAY)),
(9, '绿色小盆栽', '绿植', '生机陪伴，清新每一天', '日常,办公', '', 49.00, 69.00, 150, '/images/products/green-plant.svg', '易打理绿植盆栽，附赠养护卡片，适合办公桌与家居点缀。', 'ALL', 400, 4.40, 70, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 100 DAY)),
(10, '满天星花束', '满天星', '思念守望，温柔星河', '生日,日常,毕业季', '毕业季', 79.00, 99.00, 120, '/images/products/babys-breath.svg', '大束满天星，轻盈如星，适合日常惊喜与毕业赠礼。', 'ALL', 190, 4.30, 28, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 95 DAY)),
(11, '康乃馨百合组合', '混合花束', '感恩祝福，平安顺遂', '母亲节,教师节,探望', '母亲节,教师节', 169.00, 199.00, 65, '/images/products/carnation-lily.svg', '康乃馨与百合组合花束，表达感恩与祝福，长辈送礼首选。', 'SPRING', 143, 4.70, 37, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 90 DAY)),
(12, '圣诞花环', '礼盒', '节日祝福，温暖团圆', '圣诞派对,新年', '圣诞节,春节', 119.00, 149.00, 50, '/images/products/christmas-wreath.svg', '松枝与红果手工花环，节日氛围浓厚，可悬挂于门庭。', 'WINTER', 100, 4.50, 18, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(13, '七夕星空玫瑰', '玫瑰', '浪漫星河，只为你来', '七夕,情人节,表白', '七夕,情人节', 269.00, 319.00, 45, '/images/products/starry-rose.svg', '蓝白玫瑰与满天星打造星空主题花束，七夕限定设计。', 'SUMMER', 120, 4.90, 26, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 80 DAY)),
(14, '婚礼手捧花', '混合花束', '百年好合，幸福启程', '婚礼,纪念日', '', 399.00, 459.00, 20, '/images/products/wedding-bouquet.svg', '新娘手捧花，白玫瑰与洋桔梗手工定制，可预约色系搭配。', 'ALL', 66, 4.80, 15, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 75 DAY)),
(15, '下架测试百合', '百合', '测试商品', '日常', '', 99.00, 129.00, 10, '/images/products/lily-test.svg', '用于验证下架商品不可下单。', 'ALL', 0, 0.00, 0, 'OFF_SHELF', DATE_SUB(NOW(), INTERVAL 60 DAY)),
(16, '康乃馨单支', '康乃馨', '感恩每一天', '母亲节,教师节,日常', '母亲节,教师节', 19.00, 29.00, 6, '/images/products/carnation-single.svg', '单支康乃馨，简单心意，适合日常表达感谢。', 'SPRING', 500, 4.20, 12, 'ON_SALE', DATE_SUB(NOW(), INTERVAL 50 DAY));

INSERT INTO shop_order (id, order_no, user_id, total_amount, pay_amount, status, receiver_name, receiver_phone, receiver_address, receiver_longitude, receiver_latitude, remark, cancel_reason, paid_at, completed_at, version, created_at) VALUES
(1, 'FL202605010001', 3, 358.00, 358.00, 'COMPLETED', '小玫', '13900000003', '上海市徐汇区衡山路88号', 121.4468000, 31.2043000, '请在工作日下午配送', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 0, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'FL202605020002', 4, 298.00, 298.00, 'COMPLETED', '爱丽丝', '13900000004', '上海市静安区南京西路1266号', 121.4539000, 31.2279000, '母亲节礼物，请附贺卡', NULL, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), 0, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(3, 'FL202605030003', 4, 238.00, 238.00, 'PENDING_PAYMENT', '爱丽丝', '13900000004', '上海市静安区南京西路1266号', 121.4539000, 31.2279000, NULL, NULL, NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'FL202605040004', 3, 599.00, 599.00, 'CANCELLED', '小玫', '13900000003', '上海市徐汇区衡山路88号', 121.4468000, 31.2043000, NULL, '临时取消，改日再订', NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(5, 'FL202605050005', 4, 189.00, 189.00, 'PAID', '爱丽丝', '13900000004', '上海市静安区南京西路1266号', 121.4539000, 31.2279000, '希望18点前送达', NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR));

INSERT INTO order_item (id, order_id, product_id, product_name, product_image, category, unit_price, quantity, subtotal, reviewed) VALUES
(1, 1, 1, '经典红玫瑰礼盒·11朵', '/images/products/rose-11.svg', '玫瑰', 199.00, 1, 199.00, 1),
(2, 1, 4, '白百合花束', '/images/products/lily-white.svg', '百合', 159.00, 1, 159.00, 0),
(3, 2, 3, '粉色康乃馨花束', '/images/products/carnation-pink.svg', '康乃馨', 129.00, 1, 129.00, 1),
(4, 2, 11, '康乃馨百合组合', '/images/products/carnation-lily.svg', '混合花束', 169.00, 1, 169.00, 0),
(5, 3, 12, '圣诞花环', '/images/products/christmas-wreath.svg', '礼盒', 119.00, 2, 238.00, 0),
(6, 4, 2, '香槟玫瑰·99朵', '/images/products/rose-99.svg', '玫瑰', 599.00, 1, 599.00, 0),
(7, 5, 7, '混搭鲜花礼盒', '/images/products/mixed-box.svg', '混合花束', 189.00, 1, 189.00, 0);

INSERT INTO payment_record (id, payment_no, order_id, order_no, user_id, amount, channel, status, paid_at, callback_at, created_at) VALUES
(1, 'PAY202605010001', 1, 'FL202605010001', 3, 358.00, 'MOCK', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'PAY202605020002', 2, 'FL202605020002', 4, 298.00, 'MOCK', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY)),
(3, 'PAY202605030003', 3, 'FL202605030003', 4, 238.00, 'MOCK', 'PENDING', NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'PAY202605040004', 4, 'FL202605040004', 3, 599.00, 'MOCK', 'FAILED', NULL, NULL, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(5, 'PAY202605050005', 5, 'FL202605050005', 4, 189.00, 'MOCK', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR));

INSERT INTO fulfillment_record (id, order_id, order_no, node, operator_id, operator_name, remark, created_at) VALUES
(1, 1, 'FL202605010001', 'ACCEPTED', 2, '花艺店员', '门店已接单', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 1, 'FL202605010001', 'PREPARING', 2, '花艺店员', '花材已备齐，开始制作', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 1, 'FL202605010001', 'DELIVERING', 2, '花艺店员', '骑手已取货', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(4, 1, 'FL202605010001', 'SIGNED', 2, '花艺店员', '客户已签收', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(5, 2, 'FL202605020002', 'ACCEPTED', 2, '花艺店员', '预约单已接单', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(6, 2, 'FL202605020002', 'PREPARING', 2, '花艺店员', '贺卡已写好', DATE_SUB(NOW(), INTERVAL 9 DAY)),
(7, 2, 'FL202605020002', 'DELIVERING', 2, '花艺店员', '已出发配送', DATE_SUB(NOW(), INTERVAL 9 DAY)),
(8, 2, 'FL202605020002', 'SIGNED', 2, '花艺店员', '本人签收', DATE_SUB(NOW(), INTERVAL 8 DAY));

INSERT INTO review (id, order_id, order_item_id, user_id, product_id, rating, content, reply, status, created_at) VALUES
(1, 1, 1, 3, 1, 5, '花很新鲜，包装精致，配送也很准时。', '感谢您的认可，期待再次为您送花。', 'VISIBLE', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 2, 3, 4, 3, 5, '妈妈很喜欢，颜色比图片还温柔。', NULL, 'VISIBLE', DATE_SUB(NOW(), INTERVAL 8 DAY));

INSERT INTO inventory_record (id, product_id, product_name, change_type, change_quantity, stock_before, stock_after, order_no, operator_id, operator_name, remark, created_at) VALUES
(1, 1, '经典红玫瑰礼盒·11朵', 'ORDER_DEDUCT', -1, 121, 120, 'FL202605010001', 3, '小玫', '下单扣减库存', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 4, '白百合花束', 'ORDER_DEDUCT', -1, 61, 60, 'FL202605010001', 3, '小玫', '下单扣减库存', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(3, 3, '粉色康乃馨花束', 'ORDER_DEDUCT', -1, 81, 80, 'FL202605020002', 4, '爱丽丝', '下单扣减库存', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(4, 11, '康乃馨百合组合', 'ORDER_DEDUCT', -1, 66, 65, 'FL202605020002', 4, '爱丽丝', '下单扣减库存', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(5, 12, '圣诞花环', 'ORDER_DEDUCT', -2, 52, 50, 'FL202605030003', 4, '爱丽丝', '下单扣减库存', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, 2, '香槟玫瑰·99朵', 'ORDER_DEDUCT', -1, 43, 42, 'FL202605040004', 3, '小玫', '下单扣减库存', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(7, 2, '香槟玫瑰·99朵', 'ORDER_CANCEL', 1, 42, 43, 'FL202605040004', 3, '小玫', '取消订单回补库存', DATE_SUB(NOW(), INTERVAL 14 DAY)),
(8, 7, '混搭鲜花礼盒', 'ORDER_DEDUCT', -1, 101, 100, 'FL202605050005', 4, '爱丽丝', '下单扣减库存', DATE_SUB(NOW(), INTERVAL 2 HOUR));

INSERT INTO user_favorite (id, user_id, product_id, created_at) VALUES
(1, 3, 1, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2, 3, 6, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(3, 3, 8, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(4, 4, 3, DATE_SUB(NOW(), INTERVAL 25 DAY)),
(5, 4, 11, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(6, 4, 8, DATE_SUB(NOW(), INTERVAL 6 DAY));

INSERT INTO recommendation_scene_weight (scene, content_weight, popularity_weight, festival_weight, rating_weight, enabled, updated_by, updated_at) VALUES
('home', 0.300, 0.230, 0.330, 0.140, 1, 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
('catalog', 0.250, 0.310, 0.260, 0.180, 1, 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
('recommendations', 0.460, 0.150, 0.240, 0.150, 1, 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
('product', 0.550, 0.090, 0.220, 0.140, 1, 1, DATE_SUB(NOW(), INTERVAL 30 DAY));

INSERT INTO recommendation_weight (id, content_weight, popularity_weight, festival_weight, rating_weight, updated_by, updated_at) VALUES
(1, 0.400, 0.200, 0.250, 0.150, 1, DATE_SUB(NOW(), INTERVAL 30 DAY));

INSERT INTO recommendation_log (id, user_id, scene, festival, season, cold_start, weights_json, product_ids, detail_json, created_at) VALUES
(1, 3, '生日', '情人节', 'SUMMER', 0, '{"content":0.4,"popularity":0.2,"festival":0.25,"rating":0.15}', '1,6,8,13', '[{"productId":1,"score":0.93},{"productId":8,"score":0.89}]', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 5, '日常', '无', 'SPRING', 1, '{"content":0.4,"popularity":0.2,"festival":0.25,"rating":0.15}', '7,9,10,3', '[{"productId":7,"score":0.81},{"productId":9,"score":0.78}]', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO operation_log (id, user_id, username, module, operation, method, request_uri, request_method, request_params, success, error_message, ip, duration_ms, created_at) VALUES
(1, 1, 'admin', '认证', '用户登录', 'AuthController.login', '/api/auth/login', 'POST', '{"username":"admin"}', 1, NULL, '127.0.0.1', 42, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 2, 'staff', '履约管理', '订单接单', 'StaffOrderController.accept', '/api/staff/orders/1/accept', 'POST', NULL, 1, NULL, '127.0.0.1', 31, DATE_SUB(NOW(), INTERVAL 5 DAY));

INSERT INTO appearance_setting (id) VALUES (1);
INSERT INTO metric_config (id) VALUES (1);

CREATE TABLE ai_call_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    request_id VARCHAR(64) NOT NULL,
    user_id BIGINT DEFAULT NULL,
    user_role VARCHAR(20) DEFAULT NULL,
    scene VARCHAR(30) NOT NULL,
    model VARCHAR(80) DEFAULT NULL,
    status VARCHAR(20) NOT NULL,
    degraded TINYINT NOT NULL DEFAULT 0,
    degraded_stage VARCHAR(60) DEFAULT NULL,
    fallback_reason VARCHAR(255) DEFAULT NULL,
    latency_ms INT NOT NULL DEFAULT 0,
    first_token_ms INT DEFAULT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    llm_calls INT NOT NULL DEFAULT 0,
    embedding_calls INT NOT NULL DEFAULT 0,
    rerank_calls INT NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(12,6) NOT NULL DEFAULT 0,
    request_chars INT NOT NULL DEFAULT 0,
    response_chars INT NOT NULL DEFAULT 0,
    session_id VARCHAR(64) DEFAULT NULL,
    error_code INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_log_created (created_at),
    KEY idx_ai_log_scene (scene, created_at),
    KEY idx_ai_log_status (status, created_at),
    KEY idx_ai_log_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 调用日志表';

CREATE TABLE ai_chat_conversation (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT DEFAULT NULL,
    session_key VARCHAR(64) DEFAULT NULL,
    title VARCHAR(120) NOT NULL DEFAULT '新的对话',
    pinned TINYINT NOT NULL DEFAULT 0,
    pinned_at DATETIME DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_ai_conv_user (user_id, status, pinned, last_message_at),
    KEY idx_ai_conv_session (session_key, status, pinned, last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 对话会话表';

CREATE TABLE ai_chat_message (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    products_json TEXT,
    citations_json TEXT,
    usage_json TEXT,
    suggested_questions TEXT,
    model VARCHAR(80) DEFAULT NULL,
    degraded TINYINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_msg_conversation (conversation_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 对话消息表';

CREATE TABLE ai_prompt_tag (
    id BIGINT NOT NULL AUTO_INCREMENT,
    category VARCHAR(20) NOT NULL COMMENT 'SCENE/AUDIENCE/NEED',
    word VARCHAR(40) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ai_prompt_tag_category_word (category, word),
    KEY idx_ai_prompt_tag_category_sort (category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 快捷提问标签表';

CREATE TABLE ai_knowledge_document (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(120) NOT NULL,
    category VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(200) DEFAULT NULL,
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_knowledge_category (category),
    KEY idx_ai_knowledge_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 知识库文档表';

CREATE TABLE recommendation_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_id VARCHAR(80) NOT NULL,
    request_id VARCHAR(64) DEFAULT NULL,
    event_type VARCHAR(30) NOT NULL,
    user_id BIGINT DEFAULT NULL,
    session_id VARCHAR(64) DEFAULT NULL,
    product_id BIGINT DEFAULT NULL,
    position INT DEFAULT NULL,
    scene VARCHAR(30) DEFAULT NULL,
    strategy VARCHAR(40) DEFAULT NULL,
    experiment_id VARCHAR(64) DEFAULT NULL,
    variant VARCHAR(30) DEFAULT NULL,
    order_id BIGINT DEFAULT NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata_json TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uk_rec_event_event_id (event_id),
    KEY idx_rec_event_request (request_id, product_id),
    KEY idx_rec_event_type_time (event_type, occurred_at),
    KEY idx_rec_event_experiment (experiment_id, variant, occurred_at),
    KEY idx_rec_event_user (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐行为事件表';

CREATE TABLE order_item_attribution (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    order_item_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    request_id VARCHAR(64) DEFAULT NULL,
    event_id VARCHAR(80) DEFAULT NULL,
    scene VARCHAR(30) DEFAULT NULL,
    strategy VARCHAR(40) DEFAULT NULL,
    experiment_id VARCHAR(64) DEFAULT NULL,
    variant VARCHAR(30) DEFAULT NULL,
    attributed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_item_attr (order_item_id),
    KEY idx_attr_order (order_id),
    KEY idx_attr_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单商品推荐归因表';

CREATE TABLE ai_experiment (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    scene VARCHAR(30) DEFAULT NULL,
    mode VARCHAR(20) NOT NULL,
    traffic_percent INT NOT NULL DEFAULT 10,
    status VARCHAR(20) NOT NULL DEFAULT 'PAUSED',
    primary_metric VARCHAR(30) NOT NULL DEFAULT 'CTR',
    config_json TEXT,
    start_at DATETIME DEFAULT NULL,
    end_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐实验配置表';

CREATE TABLE user_product_interaction (
    id BIGINT NOT NULL AUTO_INCREMENT,
    subject_key VARCHAR(80) NOT NULL,
    user_id BIGINT DEFAULT NULL,
    session_id VARCHAR(64) DEFAULT NULL,
    product_id BIGINT NOT NULL,
    view_count INT NOT NULL DEFAULT 0,
    click_count INT NOT NULL DEFAULT 0,
    total_dwell_ms BIGINT NOT NULL DEFAULT 0,
    last_viewed_at DATETIME DEFAULT NULL,
    last_clicked_at DATETIME DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_upi_subject_product (subject_key, product_id),
    KEY idx_upi_user (user_id),
    KEY idx_upi_session (session_id),
    KEY idx_upi_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户商品点击浏览聚合表';

INSERT INTO ai_prompt_tag (category, word, sort_order) VALUES
('SCENE', '日常用花', 1),
('SCENE', '生日惊喜', 2),
('SCENE', '纪念日', 3),
('SCENE', '母亲节', 4),
('SCENE', '情人节', 5),
('SCENE', '教师节', 6),
('SCENE', '毕业季', 7),
('SCENE', '约会表白', 8),
('SCENE', '探病慰问', 9),
('SCENE', '开业祝福', 10),
('AUDIENCE', '女朋友', 1),
('AUDIENCE', '男朋友', 2),
('AUDIENCE', '妈妈', 3),
('AUDIENCE', '爸爸', 4),
('AUDIENCE', '长辈', 5),
('AUDIENCE', '朋友', 6),
('AUDIENCE', '同事', 7),
('AUDIENCE', '客户', 8),
('AUDIENCE', '自己', 9),
('NEED', '预算200元以内', 1),
('NEED', '温柔一点', 2),
('NEED', '清新淡雅', 3),
('NEED', '有仪式感', 4),
('NEED', '好养活', 5),
('NEED', '寓意好', 6),
('NEED', '显档次', 7),
('NEED', '养护简单', 8),
('NEED', '香味不要太浓', 9);

INSERT INTO ai_knowledge_document (id, title, category, content, source, enabled) VALUES
(1, '玫瑰花语与送花场景', '花语', '红玫瑰代表热烈的爱情与告白，适合情人节、七夕、纪念日和表白；香槟玫瑰代表温柔与长久，适合纪念日和求婚；粉玫瑰更柔和，适合初恋、生日和日常惊喜。送玫瑰时优先确认对方是否喜欢浓香型花材，并搭配尤加利叶或满天星降低视觉压迫感。', '内置知识库', 1),
(2, '康乃馨与母亲节送花', '花语', '粉色康乃馨代表感恩、母爱与温柔，是母亲节、教师节和长辈生日最常用的花材之一。红色康乃馨更强调敬意与祝福，白色康乃馨可用于追思。送给母亲时建议选择粉康乃馨搭配百合或洋桔梗，避免过于浓烈的颜色。', '内置知识库', 1),
(3, '百合花语与注意事项', '花语', '白百合代表纯洁、庄重与百年好合，适合婚礼、开业和探望；香水百合香气较浓，室内摆放要注意通风。探望病人时建议选择颜色柔和的百合，并确认对方是否对花粉敏感。', '内置知识库', 1),
(4, '向日葵与毕业季送花', '花语', '向日葵代表阳光、忠诚和勇敢追梦，适合毕业季、生日、探望和鼓励场景。搭配尤加利叶或黄色系包装更显明亮。送给毕业生时可附一张手写卡片，表达对未来的祝福。', '内置知识库', 1),
(5, '鲜花养护基础', '养护', '收到花束后先拆除包装，斜剪花枝 2 至 3 厘米，去除浸水叶片，使用干净花瓶和清水。每 2 至 3 天换水并重新剪枝，避免阳光直射和空调出风口。玫瑰、康乃馨和百合都需要较浅水位，绣球和尤加利叶需水量更高。', '内置知识库', 1),
(6, '送花礼仪与禁忌', '礼仪', '送花前先确认收花人的喜好、过敏情况和场合。探病避免白色和黄色菊花，婚礼避免白色为主的花束，商务场合选择简洁大方的花礼。附卡片时写清称呼和祝福，避免使用过于私人或暧昧的表达。', '内置知识库', 1),
(7, '节日送花建议', '节日', '情人节和七夕以红玫瑰、香槟玫瑰为主；母亲节以康乃馨、百合和粉色系花束为主；教师节可选择康乃馨、向日葵或绿植；毕业季适合向日葵、满天星和混搭花束；春节可选择红色系、银柳和冬青等节日花材。', '内置知识库', 1),
(8, '配送、退款与售后说明', '售后', '鲜花属于易损耗商品，下单后请保持电话畅通。配送前会与收花人确认时间；如遇花材缺货，花艺师会在同价位内替换并提前沟通。签收后如发现明显质量问题，请在 24 小时内联系客服并提供照片，审核通过后可补发或退款。', '内置知识库', 1);

INSERT INTO ai_experiment (id, name, scene, mode, traffic_percent, status, primary_metric, config_json) VALUES
('rec-vector-ab', 'TF-IDF vs 向量召回 A/B', 'home', 'AB', 10, 'PAUSED', 'CTR', '{"control":"TF_IDF","treatment":"VECTOR"}');

SET FOREIGN_KEY_CHECKS = 1;