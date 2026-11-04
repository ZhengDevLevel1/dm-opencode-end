package com.flower.mall.module.recommendation.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class UserBehaviorData {

    private List<PurchasedProduct> purchases;
    private List<RecommendationCandidate> favorites;
    private List<ReviewedProduct> reviews;
    @Builder.Default
    private Map<String, Double> categoryDistribution = Map.of();
    @Builder.Default
    private List<String> favoriteTags = List.of();
    private int purchaseFrequency;
    private double averageRating;

    public static UserBehaviorData empty() {
        return UserBehaviorData.builder()
                .purchases(List.of())
                .favorites(List.of())
                .reviews(List.of())
                .categoryDistribution(Map.of())
                .favoriteTags(List.of())
                .purchaseFrequency(0)
                .averageRating(0)
                .build();
    }

    public boolean isEmpty() {
        return (purchases == null || purchases.isEmpty())
                && (favorites == null || favorites.isEmpty())
                && (reviews == null || reviews.isEmpty())
                && (categoryDistribution == null || categoryDistribution.isEmpty())
                && (favoriteTags == null || favoriteTags.isEmpty());
    }

    public record PurchasedProduct(RecommendationCandidate product, int quantity) {
    }

    public record ReviewedProduct(RecommendationCandidate product, int rating) {
    }
}
