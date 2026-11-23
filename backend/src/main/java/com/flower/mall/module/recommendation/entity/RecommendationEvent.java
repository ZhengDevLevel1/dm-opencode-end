package com.flower.mall.module.recommendation.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("recommendation_event")
public class RecommendationEvent {

    @TableId(type = IdType.AUTO)
    private Long id;
    private String eventId;
    private String requestId;
    private String eventType;
    private Long userId;
    private String sessionId;
    private Long productId;
    private Integer position;
    private String scene;
    private String strategy;
    private String experimentId;
    private String variant;
    private Long orderId;
    private LocalDateTime occurredAt;
    private String metadataJson;
}
