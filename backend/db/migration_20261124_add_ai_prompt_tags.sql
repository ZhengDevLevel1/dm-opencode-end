-- AI chat follow-up suggestions and admin-managed quick prompt tags.
-- Apply once to an existing flower_shop database.

ALTER TABLE ai_chat_message
    ADD COLUMN suggested_questions TEXT NULL AFTER usage_json;

CREATE TABLE IF NOT EXISTS ai_prompt_tag (
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

INSERT IGNORE INTO ai_prompt_tag (category, word, sort_order) VALUES
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
