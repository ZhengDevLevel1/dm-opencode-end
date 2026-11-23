package com.flower.mall.module.ai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ai_chat_conversation")
public class AiChatConversation {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String sessionKey;
    private String title;
    private Boolean pinned;
    private LocalDateTime pinnedAt;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastMessageAt;
}
