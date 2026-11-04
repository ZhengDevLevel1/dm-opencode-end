package com.flower.mall.module.recommendation.model;

import com.flower.mall.module.recommendation.entity.RecommendationWeight;

import java.math.BigDecimal;

public record RecommendationWeights(double content, double popularity, double festival, double rating) {

    public static final RecommendationWeights DEFAULT = new RecommendationWeights(0.40, 0.20, 0.25, 0.15);

    public static RecommendationWeights from(RecommendationWeight entity) {
        if (entity == null) {
            return DEFAULT;
        }
        return new RecommendationWeights(
                toDouble(entity.getContentWeight()),
                toDouble(entity.getPopularityWeight()),
                toDouble(entity.getFestivalWeight()),
                toDouble(entity.getRatingWeight()));
    }

    public double sum() {
        return content + popularity + festival + rating;
    }

    public boolean isValid() {
        return content >= 0 && popularity >= 0 && festival >= 0 && rating >= 0
                && Math.abs(sum() - 1.0) <= 0.001;
    }

    public RecommendationWeights normalized() {
        double total = sum();
        if (total <= 0) {
            return DEFAULT;
        }
        return new RecommendationWeights(content / total, popularity / total,
                festival / total, rating / total);
    }

    private static double toDouble(BigDecimal value) {
        return value == null ? 0 : value.doubleValue();
    }
}
