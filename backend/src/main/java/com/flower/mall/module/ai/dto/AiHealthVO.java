package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiHealthVO {
    private boolean enabled;
    private boolean reachable;
    private String endpoint;
    private String service;
    private String status;
    private boolean qdrantReady;
    private boolean llmReady;
    private boolean embeddingReady;
    private boolean degraded;
    private String message;
}
