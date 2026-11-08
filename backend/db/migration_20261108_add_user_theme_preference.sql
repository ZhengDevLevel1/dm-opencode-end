CREATE TABLE IF NOT EXISTS tag_option (
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

CREATE TABLE IF NOT EXISTS tag_type_setting (
    tag_type VARCHAR(20) NOT NULL,
    max_select_count INT NOT NULL DEFAULT 8,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (tag_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签类型配置表';

CREATE TABLE IF NOT EXISTS metric_config (
    id TINYINT NOT NULL DEFAULT 1,
    price_mid_threshold DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    price_high_threshold DECIMAL(10,2) NOT NULL DEFAULT 300.00,
    stock_low_threshold INT NOT NULL DEFAULT 10,
    stock_high_threshold INT NOT NULL DEFAULT 50,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='价格带与库存指标配置表';

CREATE TABLE IF NOT EXISTS user_theme_preference (
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
