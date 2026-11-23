package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiWeightAdviceVO {
    private String scene;
    @Builder.Default
    private Map<String, Double> currentWeights = new LinkedHashMap<>();
    @Builder.Default
    private Map<String, Double> suggestedWeights = new LinkedHashMap<>();
    private String reason;
    private double confidence;
    @Builder.Default
    private List<String> guardrails = List.of();
    private boolean degraded;
    private String fallbackReason;
}
