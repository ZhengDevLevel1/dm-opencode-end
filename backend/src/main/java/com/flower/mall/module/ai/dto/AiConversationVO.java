package com.flower.mall.module.ai.dto;

import com.flower.mall.module.ai.entity.AiChatConversation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationVO {

    private Long id;
    private String title;
    private Boolean pinned;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastMessageAt;

    public static AiConversationVO from(AiChatConversation conversation) {
        return AiConversationVO.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .pinned(Boolean.TRUE.equals(conversation.getPinned()))
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .lastMessageAt(conversation.getLastMessageAt())
                .build();
    }
}
