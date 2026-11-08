DROP TABLE IF EXISTS metric_config;
DROP TABLE IF EXISTS tag_option;
DROP TABLE IF EXISTS tag_type_setting;
DROP TABLE IF EXISTS user_theme_preference;
DROP TABLE IF EXISTS appearance_setting;
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

CREATE TABLE sys_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    password VARCHAR(100) NOT NULL,
    nickname VARCHAR(30),
    phone VARCHAR(20),
    email VARCHAR(100),
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_user_username UNIQUE (username)
);

CREATE TABLE product (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    flower_meaning VARCHAR(200),
    occasion_tags VARCHAR(200),
    festival_tags VARCHAR(200),
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    stock INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    description VARCHAR(2000),
    season_suitability VARCHAR(20) NOT NULL DEFAULT 'ALL',
    sales_count INT NOT NULL DEFAULT 0,
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    rating_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'OFF_SHELF',
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0
);

CREATE TABLE inventory_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    change_type VARCHAR(30) NOT NULL,
    change_quantity INT NOT NULL,
    stock_before INT NOT NULL,
    stock_after INT NOT NULL,
    order_no VARCHAR(40),
    operator_id BIGINT,
    operator_name VARCHAR(50),
    remark VARCHAR(200),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE cart_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_cart_user_product UNIQUE (user_id, product_id),
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES sys_user (id),
    CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE user_favorite (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_favorite_user_product UNIQUE (user_id, product_id),
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES sys_user (id),
    CONSTRAINT fk_favorite_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE shop_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(40) NOT NULL,
    user_id BIGINT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    pay_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    receiver_name VARCHAR(50) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    receiver_address VARCHAR(255) NOT NULL,
    remark VARCHAR(255),
    cancel_reason VARCHAR(200),
    after_sale_reason VARCHAR(500),
    paid_at DATETIME,
    completed_at DATETIME,
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_order_no UNIQUE (order_no),
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
);

CREATE TABLE order_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_image VARCHAR(500),
    category VARCHAR(30),
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    reviewed TINYINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES shop_order (id),
    CONSTRAINT fk_order_item_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE payment_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_no VARCHAR(40) NOT NULL,
    order_id BIGINT NOT NULL,
    order_no VARCHAR(40) NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'MOCK',
    status VARCHAR(20) NOT NULL,
    paid_at DATETIME,
    callback_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_payment_no UNIQUE (payment_no),
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES shop_order (id),
    CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
);

CREATE TABLE fulfillment_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    order_no VARCHAR(40) NOT NULL,
    node VARCHAR(20) NOT NULL,
    operator_id BIGINT,
    operator_name VARCHAR(50),
    remark VARCHAR(200),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fulfillment_order FOREIGN KEY (order_id) REFERENCES shop_order (id)
);

CREATE TABLE review (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    order_item_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    rating TINYINT NOT NULL,
    content VARCHAR(500),
    reply VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_review_order_item UNIQUE (order_item_id),
    CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES shop_order (id),
    CONSTRAINT fk_review_order_item FOREIGN KEY (order_item_id) REFERENCES order_item (id),
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES sys_user (id),
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE recommendation_weight (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_weight DECIMAL(4,3) NOT NULL DEFAULT 0.400,
    popularity_weight DECIMAL(4,3) NOT NULL DEFAULT 0.200,
    festival_weight DECIMAL(4,3) NOT NULL DEFAULT 0.250,
    rating_weight DECIMAL(4,3) NOT NULL DEFAULT 0.150,
    updated_by BIGINT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_recommendation_weight_sum CHECK (
        ABS(content_weight + popularity_weight + festival_weight + rating_weight - 1.000) <= 0.001
    )
);

CREATE TABLE recommendation_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    scene VARCHAR(30),
    festival VARCHAR(20),
    season VARCHAR(20),
    cold_start TINYINT NOT NULL DEFAULT 0,
    weights_json VARCHAR(500),
    product_ids VARCHAR(1000),
    detail_json TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rec_log_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
);

CREATE TABLE operation_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(30),
    module VARCHAR(30) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    method VARCHAR(150),
    request_uri VARCHAR(200),
    request_method VARCHAR(10),
    request_params TEXT,
    success TINYINT NOT NULL DEFAULT 1,
    error_message VARCHAR(500),
    ip VARCHAR(64),
    duration_ms BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appearance_setting (
    id BIGINT PRIMARY KEY,
    auth_background_image VARCHAR(500),
    background_type VARCHAR(20),
    background_opacity DOUBLE DEFAULT 0.78,
    background_blur INT DEFAULT 0,
    component_opacity DOUBLE DEFAULT 1,
    auth_palette VARCHAR(32) DEFAULT 'default',
    auth_accent VARCHAR(32) DEFAULT 'sky',
    auth_custom_accent VARCHAR(16) DEFAULT '#38bdf8',
    updated_by BIGINT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tag_option (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tag_type VARCHAR(20) NOT NULL,
    name VARCHAR(30) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    home_visible TINYINT NOT NULL DEFAULT 1,
    home_sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tag_type_name UNIQUE (tag_type, name)
);

CREATE TABLE tag_type_setting (
    tag_type VARCHAR(20) PRIMARY KEY,
    max_select_count INT NOT NULL DEFAULT 8,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metric_config (
    id TINYINT PRIMARY KEY,
    price_mid_threshold DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    price_high_threshold DECIMAL(10,2) NOT NULL DEFAULT 300.00,
    stock_low_threshold INT NOT NULL DEFAULT 10,
    stock_high_threshold INT NOT NULL DEFAULT 50,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_theme_preference (
    user_id BIGINT PRIMARY KEY,
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
    background_image VARCHAR(500),
    background_opacity DOUBLE NOT NULL DEFAULT 0.82,
    background_blur INT NOT NULL DEFAULT 0,
    component_opacity DOUBLE NOT NULL DEFAULT 1,
    sidebar_pinned TINYINT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_theme_pref_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
);
