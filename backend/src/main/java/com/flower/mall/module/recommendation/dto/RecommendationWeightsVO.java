package com.flower.mall.module.recommendation.dto;

import com.flower.mall.module.recommendation.entity.RecommendationWeight;
import com.flower.mall.module.recommendation.model.RecommendationWeights;
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
public class RecommendationWeightsVO {

    private BigDecimal contentWeight;
    private BigDecimal popularityWeight;
    private BigDecimal festivalWeight;
    private BigDecimal ratingWeight;
    private Long updatedBy;
    private LocalDateTime updatedAt;

    public static RecommendationWeightsVO from(RecommendationWeights weights) {
        return RecommendationWeightsVO.builder()
                .contentWeight(BigDecimal.valueOf(weights.content()))
                .popularityWeight(BigDecimal.valueOf(weights.popularity()))
                .festivalWeight(BigDecimal.valueOf(weights.festival()))
                .ratingWeight(BigDecimal.valueOf(weights.rating()))
                .build();
    }

    public static RecommendationWeightsVO from(RecommendationWeight weight) {
        return RecommendationWeightsVO.builder()
                .contentWeight(weight.getContentWeight())
                .popularityWeight(weight.getPopularityWeight())
                .festivalWeight(weight.getFestivalWeight())
                .ratingWeight(weight.getRatingWeight())
                .updatedBy(weight.getUpdatedBy())
                .updatedAt(weight.getUpdatedAt())
                .build();
    }
}
