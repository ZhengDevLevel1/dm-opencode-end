package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatCitationVO {
    private Long documentId;
    private String title;
    private String category;
    private String source;
    private String snippet;
}
