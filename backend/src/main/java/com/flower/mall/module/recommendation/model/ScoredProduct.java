package com.flower.mall.module.recommendation.model;

import java.util.List;

public record ScoredProduct(RecommendationCandidate product,
                            double contentSimilarity,
                            double popularityScore,
                            double festivalSeasonScore,
                            double ratingScore,
                            double finalScore,
                            String reason,
                            List<String> matchedTags) {
}
