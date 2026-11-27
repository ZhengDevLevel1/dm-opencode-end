package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCareGuideVO {
    private String careGuide;
    private boolean degraded;
    private String fallbackReason;
}
