package com.flower.mall.module.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationStatsVO {

    private long totalRequests;
    private long distinctUsers;
    private long distinctRecommendedProducts;
    private long onSaleProducts;
    private double coverage;
    private List<String> topRecommendedProductIds;
}
