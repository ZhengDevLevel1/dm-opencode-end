ALTER TABLE product
    ADD COLUMN ai_tags VARCHAR(255) DEFAULT NULL COMMENT 'AI 智能标签，逗号分隔' AFTER description,
    ADD COLUMN ai_selling_points VARCHAR(500) DEFAULT NULL COMMENT 'AI 卖点，逗号分隔' AFTER ai_tags;
