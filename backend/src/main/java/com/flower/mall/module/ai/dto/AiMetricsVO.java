package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMetricsVO {
    private LocalDate startDate;
    private LocalDate endDate;
    private long totalCalls;
    private long successCalls;
    private long fallbackCalls;
    private long failedCalls;
    private double successRate;
    private double fallbackRate;
    private long totalTokens;
    private long promptTokens;
    private long completionTokens;
    private BigDecimal estimatedCost;
    private BigDecimal todayCost;
    private BigDecimal monthCost;
    private double avgLatencyMs;
    private int p95LatencyMs;
    private int firstTokenP95Ms;
    private double qps;
    private double avgLatencyMs5m;
    private int p95LatencyMs5m;
    @Builder.Default
    private Map<String, Long> callsByScene = new LinkedHashMap<>();
    @Builder.Default
    private Map<String, SceneCost> costByScene = new LinkedHashMap<>();
    @Builder.Default
    private Map<String, Long> degradedStages = new LinkedHashMap<>();
    @Builder.Default
    private List<DailyPoint> daily = new ArrayList<>();
    @Builder.Default
    private List<HourlyPoint> hourly = new ArrayList<>();
    @Builder.Default
    private List<EndpointPoint> endpoints = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyPoint {
        private LocalDate date;
        private long calls;
        private long fallback;
        private long failed;
        private long tokens;
        private long promptTokens;
        private long completionTokens;
        private BigDecimal cost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HourlyPoint {
        private LocalDateTime hour;
        private long calls;
        private long fallback;
        private long failed;
        private long tokens;
        private BigDecimal cost;
        private double avgLatencyMs;
        private int p95LatencyMs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SceneCost {
        private String scene;
        private long calls;
        private long promptTokens;
        private long completionTokens;
        private long totalTokens;
        private BigDecimal cost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EndpointPoint {
        private String path;
        private long calls;
        private long failures;
        private double qps;
        private double avgLatencyMs;
        private int p95LatencyMs;
        private String lastStatus;
        private LocalDateTime lastCalledAt;
    }
}
