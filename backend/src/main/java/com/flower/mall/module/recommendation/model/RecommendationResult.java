package com.flower.mall.module.recommendation.model;

import java.util.List;

public record RecommendationResult(RecommendationContext context,
                                   RecommendationWeights weights,
                                   boolean coldStart,
                                   List<ScoredProduct> items) {
}
