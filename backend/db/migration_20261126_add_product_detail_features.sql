-- 商品详情增强：花材库、包装色系、营业时间、商品多图、规格、评价图片、送达时间与贺卡。
-- 适用于已初始化过的 flower_shop 数据库。

USE flower_shop;

CREATE TABLE IF NOT EXISTS flower_material (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '花材名称',
    latin_name VARCHAR(80) DEFAULT NULL COMMENT '拉丁学名',
    note VARCHAR(200) DEFAULT NULL COMMENT '花材说明',
    color_hex VARCHAR(20) DEFAULT NULL COMMENT '代表色',
    enabled TINYINT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_flower_material_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='花材库';

CREATE TABLE IF NOT EXISTS wrap_color (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '包装色系名称',
    hex VARCHAR(20) NOT NULL COMMENT '主色值',
    ring_hex VARCHAR(20) DEFAULT NULL COMMENT '描边色值',
    description VARCHAR(200) DEFAULT NULL,
    enabled TINYINT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_wrap_color_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='包装色系库';

CREATE TABLE IF NOT EXISTS business_hour (
    day_of_week TINYINT NOT NULL COMMENT '1-7，周一至周日',
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    enabled TINYINT NOT NULL DEFAULT 1,
    note VARCHAR(100) DEFAULT NULL,
    PRIMARY KEY (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营业时间';

CREATE TABLE IF NOT EXISTS product_image (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_product_image_product (product_id),
    CONSTRAINT fk_product_image_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品多图';

CREATE TABLE IF NOT EXISTS product_flower_material (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_product_flower_material (product_id, material_id),
    CONSTRAINT fk_pfm_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT fk_pfm_material FOREIGN KEY (material_id) REFERENCES flower_material (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品选用花材';

CREATE TABLE IF NOT EXISTS product_spec (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    name VARCHAR(60) NOT NULL,
    description VARCHAR(200) DEFAULT NULL,
    price DECIMAL(10,2) DEFAULT NULL COMMENT '为空时使用商品基础价',
    sort_order INT NOT NULL DEFAULT 0,
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_product_spec_name (product_id, name),
    KEY idx_product_spec_product (product_id),
    CONSTRAINT fk_product_spec_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格';

CREATE TABLE IF NOT EXISTS product_spec_flower (
    id BIGINT NOT NULL AUTO_INCREMENT,
    spec_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_product_spec_flower (spec_id, material_id),
    CONSTRAINT fk_psf_spec FOREIGN KEY (spec_id) REFERENCES product_spec (id),
    CONSTRAINT fk_psf_material FOREIGN KEY (material_id) REFERENCES flower_material (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格花材用量';

CREATE TABLE IF NOT EXISTS review_image (
    id BIGINT NOT NULL AUTO_INCREMENT,
    review_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_review_image_review (review_id),
    CONSTRAINT fk_review_image_review FOREIGN KEY (review_id) REFERENCES review (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价图片';

ALTER TABLE cart_item
    ADD COLUMN spec_id BIGINT NOT NULL DEFAULT 0 AFTER product_id,
    ADD COLUMN wrap_id BIGINT NOT NULL DEFAULT 0 AFTER spec_id,
    DROP INDEX uk_cart_user_product,
    ADD UNIQUE KEY uk_cart_user_product (user_id, product_id, spec_id, wrap_id);

ALTER TABLE order_item
    ADD COLUMN spec_id BIGINT NOT NULL DEFAULT 0 AFTER category,
    ADD COLUMN spec_name VARCHAR(60) DEFAULT NULL AFTER spec_id,
    ADD COLUMN wrap_id BIGINT NOT NULL DEFAULT 0 AFTER spec_name,
    ADD COLUMN wrap_name VARCHAR(60) DEFAULT NULL AFTER wrap_id;

ALTER TABLE shop_order
    ADD COLUMN greeting_card VARCHAR(100) DEFAULT NULL COMMENT '手写贺卡内容' AFTER remark,
    ADD COLUMN delivery_at DATETIME DEFAULT NULL COMMENT '预约送达时间' AFTER greeting_card;

INSERT IGNORE INTO flower_material (id, name, latin_name, note, color_hex, enabled, sort_order) VALUES
(1, '红玫瑰', 'Rosa rugosa', '主花，热烈浓郁，适合表达爱意', '#B23A48', 1, 10),
(2, '尤加利', 'Eucalyptus cinerea', '叶材，清冽木质香，增加线条感', '#7D8F69', 1, 20),
(3, '洋桔梗', 'Eustoma grandiflorum', '配花，花瓣层叠柔和', '#E8B4C8', 1, 30),
(4, '满天星', 'Gypsophila paniculata', '点缀花，轻盈星点', '#F2EFE9', 1, 40),
(5, '康乃馨', 'Dianthus caryophyllus', '主花，温柔耐放，适合感恩主题', '#E7A6B1', 1, 50),
(6, '香水百合', 'Lilium orientalis', '主花，清雅芬芳', '#F7F3EA', 1, 60),
(7, '向日葵', 'Helianthus annuus', '主花，明亮勇敢', '#E9B949', 1, 70),
(8, '郁金香', 'Tulipa gesneriana', '主花，优雅柔和', '#D96C75', 1, 80);

INSERT IGNORE INTO wrap_color (id, name, hex, ring_hex, description, enabled, sort_order) VALUES
(1, '雾面米白', '#EFE7D8', '#D7CBB8', '经典百搭，突出花材本色', 1, 10),
(2, '苔藓绿', '#6F7D5C', '#4E5B41', '自然森系，适合枝叶类花束', 1, 20),
(3, '胭脂粉', '#D9A6B0', '#B77A86', '柔和浪漫，适合告白与纪念日', 1, 30),
(4, '夜墨黑', '#2E3034', '#17181A', '利落高级，适合红玫瑰', 1, 40),
(5, '香槟金', '#C9A86A', '#A88A4E', '温润典雅，适合婚礼与庆典', 1, 50);

INSERT IGNORE INTO business_hour (day_of_week, open_time, close_time, enabled, note) VALUES
(1, '09:00:00', '20:00:00', 1, '周一鲜切花正常供应'),
(2, '09:00:00', '20:00:00', 1, '周二鲜切花正常供应'),
(3, '09:00:00', '20:00:00', 1, '周三鲜切花正常供应'),
(4, '09:00:00', '20:00:00', 1, '周四鲜切花正常供应'),
(5, '09:00:00', '20:00:00', 1, '周五鲜切花正常供应'),
(6, '09:00:00', '20:00:00', 1, '周末建议提前预约'),
(7, '09:00:00', '20:00:00', 1, '周末建议提前预约');

INSERT IGNORE INTO product_flower_material (product_id, material_id, sort_order) VALUES
(1, 1, 10), (1, 2, 20),
(2, 1, 10), (2, 2, 20),
(3, 5, 10), (3, 3, 20),
(4, 6, 10), (4, 4, 20),
(5, 7, 10), (5, 2, 20),
(6, 8, 10), (6, 2, 20),
(7, 1, 10), (7, 3, 20), (7, 4, 30),
(8, 1, 10), (8, 2, 20),
(10, 4, 10),
(11, 5, 10), (11, 6, 20),
(13, 1, 10), (13, 4, 20),
(14, 1, 10), (14, 3, 20), (14, 6, 30),
(15, 6, 10),
(16, 5, 10);

INSERT IGNORE INTO product_spec (id, product_id, name, description, price, sort_order, enabled) VALUES
(1, 1, '心动款 · 11枝', '11朵红玫瑰搭配尤加利叶，适合日常告白', 199.00, 10, 1),
(2, 1, '深爱款 · 19枝', '19朵红玫瑰，加入满天星点缀，更有层次', 329.00, 20, 1),
(3, 1, '至臻款 · 33枝', '33朵红玫瑰，仪式感十足的纪念日选择', 529.00, 30, 1),
(4, 2, '经典款 · 99枝', '99朵香槟玫瑰，巨型花束手工包扎', 599.00, 10, 1),
(5, 7, '日常款', '玫瑰、洋桔梗与满天星混搭', 189.00, 10, 1),
(6, 7, '丰盛款', '加大花量，适合生日与探望', 269.00, 20, 1);

INSERT IGNORE INTO product_spec_flower (spec_id, material_id, quantity) VALUES
(1, 1, 11), (1, 2, 3),
(2, 1, 19), (2, 2, 5), (2, 4, 2),
(3, 1, 33), (3, 2, 8), (3, 4, 3),
(4, 1, 99), (4, 2, 12),
(5, 1, 6), (5, 3, 4), (5, 4, 2),
(6, 1, 9), (6, 3, 6), (6, 4, 3);
