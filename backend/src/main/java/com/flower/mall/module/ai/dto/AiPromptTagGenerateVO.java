package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPromptTagGenerateVO {

    private List<String> words;
    private Boolean degraded;
    private String fallbackReason;
    private Integer totalTokens;
}
