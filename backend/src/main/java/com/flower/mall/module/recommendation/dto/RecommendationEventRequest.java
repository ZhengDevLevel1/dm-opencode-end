package com.flower.mall.module.recommendation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class RecommendationEventRequest {

    @NotBlank(message = "事件ID不能为空")
    private String eventId;

    private String requestId;

    @NotBlank(message = "事件类型不能为空")
    private String eventType;

    private Long productId;

    private Integer position;

    private String scene;

    private String strategy;

    private String experimentId;

    private String variant;

    private String sessionId;

    private LocalDateTime occurredAt;

    private Map<String, Object> metadata;
}
