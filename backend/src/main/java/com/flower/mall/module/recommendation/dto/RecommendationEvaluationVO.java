package com.flower.mall.module.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationEvaluationVO {

    private LocalDateTime generatedAt;
    private int totalProducts;
    private double overallCoverage;
    private List<PersonaResult> personas;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonaResult {
        private String name;
        private String description;
        private boolean coldStart;
        private int itemCount;
        private int relevantCount;
        private double hitRate;
        private double precisionAt10;
        private double coverage;
        private String sampleReason;
    }
}
