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
public class RecommendationResponse {

    private String strategy;
    private boolean coldStart;
    private String season;
    private String seasonLabel;
    private String festival;
    private String scene;
    private LocalDateTime generatedAt;
    private RecommendationWeightsVO weights;
    private List<RecommendationItemVO> items;
}
