-- AI assistant, recommendation event attribution and experiment support.
-- Apply once to an existing flower_shop database.

ALTER TABLE recommendation_log
    ADD COLUMN request_id VARCHAR(64) NULL AFTER id,
    ADD COLUMN strategy VARCHAR(40) NULL AFTER scene,
    ADD COLUMN experiment_id VARCHAR(64) NULL AFTER strategy,
    ADD COLUMN variant VARCHAR(30) NULL AFTER experiment_id,
    ADD COLUMN mode VARCHAR(30) NULL AFTER variant,
    ADD KEY idx_rec_log_request (request_id);

ALTER TABLE cart_item
    ADD COLUMN source_request_id VARCHAR(64) NULL,
    ADD COLUMN source_event_id VARCHAR(80) NULL,
    ADD COLUMN source_scene VARCHAR(30) NULL,
    ADD COLUMN source_position INT NULL,
    ADD COLUMN source_strategy VARCHAR(40) NULL,
    ADD COLUMN source_experiment_id VARCHAR(64) NULL,
    ADD COLUMN source_variant VARCHAR(30) NULL,
    ADD COLUMN attributed_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS ai_call_log (
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

CREATE TABLE IF NOT EXISTS ai_knowledge_document (
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

CREATE TABLE IF NOT EXISTS recommendation_event (
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

CREATE TABLE IF NOT EXISTS order_item_attribution (
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

CREATE TABLE IF NOT EXISTS ai_experiment (
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

CREATE TABLE IF NOT EXISTS user_product_interaction (
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

INSERT IGNORE INTO ai_knowledge_document (id, title, category, content, source, enabled) VALUES
(1, '玫瑰花语与送花场景', '花语', '红玫瑰代表热烈的爱情与告白，适合情人节、七夕、纪念日和表白；香槟玫瑰代表温柔与长久，适合纪念日和求婚；粉玫瑰更柔和，适合初恋、生日和日常惊喜。送玫瑰时优先确认对方是否喜欢浓香型花材，并搭配尤加利叶或满天星降低视觉压迫感。', '内置知识库', 1),
(2, '康乃馨与母亲节送花', '花语', '粉色康乃馨代表感恩、母爱与温柔，是母亲节、教师节和长辈生日最常用的花材之一。红色康乃馨更强调敬意与祝福，白色康乃馨可用于追思。送给母亲时建议选择粉康乃馨搭配百合或洋桔梗，避免过于浓烈的颜色。', '内置知识库', 1),
(3, '百合花语与注意事项', '花语', '白百合代表纯洁、庄重与百年好合，适合婚礼、开业和探望；香水百合香气较浓，室内摆放要注意通风。探望病人时建议选择颜色柔和的百合，并确认对方是否对花粉敏感。', '内置知识库', 1),
(4, '向日葵与毕业季送花', '花语', '向日葵代表阳光、忠诚和勇敢追梦，适合毕业季、生日、探望和鼓励场景。搭配尤加利叶或黄色系包装更显明亮。送给毕业生时可附一张手写卡片，表达对未来的祝福。', '内置知识库', 1),
(5, '鲜花养护基础', '养护', '收到花束后先拆除包装，斜剪花枝 2 至 3 厘米，去除浸水叶片，使用干净花瓶和清水。每 2 至 3 天换水并重新剪枝，避免阳光直射和空调出风口。玫瑰、康乃馨和百合都需要较浅水位，绣球和尤加利叶需水量更高。', '内置知识库', 1),
(6, '送花礼仪与禁忌', '礼仪', '送花前先确认收花人的喜好、过敏情况和场合。探病避免白色和黄色菊花，婚礼避免白色为主的花束，商务场合选择简洁大方的花礼。附卡片时写清称呼和祝福，避免使用过于私人或暧昧的表达。', '内置知识库', 1),
(7, '节日送花建议', '节日', '情人节和七夕以红玫瑰、香槟玫瑰为主；母亲节以康乃馨、百合和粉色系花束为主；教师节可选择康乃馨、向日葵或绿植；毕业季适合向日葵、满天星和混搭花束；春节可选择红色系、银柳和冬青等节日花材。', '内置知识库', 1),
(8, '配送、退款与售后说明', '售后', '鲜花属于易损耗商品，下单后请保持电话畅通。配送前会与收花人确认时间；如遇花材缺货，花艺师会在同价位内替换并提前沟通。签收后如发现明显质量问题，请在 24 小时内联系客服并提供照片，审核通过后可补发或退款。', '内置知识库', 1);
