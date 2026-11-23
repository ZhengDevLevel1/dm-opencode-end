package com.flower.mall.module.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationEffectVO {
    private LocalDate startDate;
    private LocalDate endDate;
    private long impressions;
    private long clicks;
    private long addToCarts;
    private long orders;
    private double ctr;
    private double cvr;
    private double addToCartRate;
    private double orderRate;
    @Builder.Default
    private Map<String, SceneEffect> byScene = new LinkedHashMap<>();
    @Builder.Default
    private List<VariantEffect> byVariant = new ArrayList<>();
    @Builder.Default
    private List<DailyEffect> daily = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SceneEffect {
        private long impressions;
        private long clicks;
        private long addToCarts;
        private long orders;
        private double ctr;
        private double cvr;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantEffect {
        private String experimentId;
        private String variant;
        private long impressions;
        private long clicks;
        private long orders;
        private double ctr;
        private double cvr;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyEffect {
        private LocalDate date;
        private long impressions;
        private long clicks;
        private long orders;
        private double ctr;
        private double cvr;
    }
}
