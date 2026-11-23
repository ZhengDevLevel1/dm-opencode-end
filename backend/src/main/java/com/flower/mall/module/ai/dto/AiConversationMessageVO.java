package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationMessageVO {

    private Long id;
    private String role;
    private String content;
    private List<AiChatProductVO> products;
    private List<AiChatCitationVO> citations;
    private AiChatUsageVO usage;
    private String model;
    private Boolean degraded;
    private String status;
    private LocalDateTime createdAt;
}
