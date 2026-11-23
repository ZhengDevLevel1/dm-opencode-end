-- AI chat conversation history, sidebar, pinning and title support.
-- Apply once to an existing flower_shop database.

CREATE TABLE IF NOT EXISTS ai_chat_conversation (
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

CREATE TABLE IF NOT EXISTS ai_chat_message (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    products_json TEXT,
    citations_json TEXT,
    usage_json TEXT,
    model VARCHAR(80) DEFAULT NULL,
    degraded TINYINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_msg_conversation (conversation_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 对话消息表';
