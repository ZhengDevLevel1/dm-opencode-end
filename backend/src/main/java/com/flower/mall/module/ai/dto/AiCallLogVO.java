package com.flower.mall.module.ai.dto;

import com.flower.mall.module.ai.entity.AiCallLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCallLogVO {
    private Long id;
    private String requestId;
    private Long userId;
    private String userRole;
    private String scene;
    private String model;
    private String status;
    private boolean degraded;
    private String degradedStage;
    private String fallbackReason;
    private Integer latencyMs;
    private Integer firstTokenMs;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private BigDecimal estimatedCost;
    private Integer requestChars;
    private Integer responseChars;
    private String sessionId;
    private Integer errorCode;
    private LocalDateTime createdAt;

    public static AiCallLogVO from(AiCallLog log) {
        return AiCallLogVO.builder()
                .id(log.getId())
                .requestId(log.getRequestId())
                .userId(log.getUserId())
                .userRole(log.getUserRole())
                .scene(log.getScene())
                .model(log.getModel())
                .status(log.getStatus())
                .degraded(Boolean.TRUE.equals(log.getDegraded()))
                .degradedStage(log.getDegradedStage())
                .fallbackReason(log.getFallbackReason())
                .latencyMs(log.getLatencyMs())
                .firstTokenMs(log.getFirstTokenMs())
                .promptTokens(log.getPromptTokens())
                .completionTokens(log.getCompletionTokens())
                .totalTokens(log.getTotalTokens())
                .estimatedCost(log.getEstimatedCost())
                .requestChars(log.getRequestChars())
                .responseChars(log.getResponseChars())
                .sessionId(log.getSessionId())
                .errorCode(log.getErrorCode())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
