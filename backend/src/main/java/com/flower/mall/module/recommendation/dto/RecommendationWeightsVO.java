package com.flower.mall.module.recommendation.dto;

import com.flower.mall.module.recommendation.entity.RecommendationWeight;
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
