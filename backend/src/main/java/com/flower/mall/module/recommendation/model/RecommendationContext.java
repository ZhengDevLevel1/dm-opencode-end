package com.flower.mall.module.recommendation.model;

import com.flower.mall.common.enums.SeasonSuitability;

import java.time.LocalDateTime;

public record RecommendationContext(SeasonSuitability season, String festival, String scene,
                                    LocalDateTime generatedAt) {

    public RecommendationContext {
        if (season == null) {
            season = SeasonSuitability.ofMonth(LocalDateTime.now().getMonthValue());
        }
        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }
    }

    public static RecommendationContext of(SeasonSuitability season, String festival, String scene) {
        return new RecommendationContext(season, festival == null || festival.isBlank() ? null : festival.trim(),
                scene == null || scene.isBlank() ? "home" : scene, LocalDateTime.now());
    }
}
