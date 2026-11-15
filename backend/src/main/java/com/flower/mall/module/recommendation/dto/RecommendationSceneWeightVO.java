package com.flower.mall.module.recommendation.dto;

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
public class RecommendationSceneWeightVO {

    private String scene;
    private String sceneLabel;
    private BigDecimal contentWeight;
    private BigDecimal popularityWeight;
    private BigDecimal festivalWeight;
    private BigDecimal ratingWeight;
    private int maxPerCategory;
    private boolean seedRequired;
    private boolean enabled;
    private Long updatedBy;
    private LocalDateTime updatedAt;
}
