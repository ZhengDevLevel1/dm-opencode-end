package com.flower.mall.module.ai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("ai_call_log")
public class AiCallLog {

    @TableId(type = IdType.AUTO)
    private Long id;
    private String requestId;
    private Long userId;
    private String userRole;
    private String scene;
    private String model;
    private String status;
    private Boolean degraded;
    private String degradedStage;
    private String fallbackReason;
    private Integer latencyMs;
    private Integer firstTokenMs;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Integer llmCalls;
    private Integer embeddingCalls;
    private Integer rerankCalls;
    private BigDecimal estimatedCost;
    private Integer requestChars;
    private Integer responseChars;
    private String sessionId;
    private Integer errorCode;
    private LocalDateTime createdAt;
}
