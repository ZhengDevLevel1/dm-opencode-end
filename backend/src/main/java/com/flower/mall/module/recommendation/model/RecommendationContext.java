package com.flower.mall.module.recommendation.model;

import com.flower.mall.common.enums.SeasonSuitability;

import java.time.LocalDateTime;

public record RecommendationContext(SeasonSuitability season, String festival,
                                    RecommendationScene scene, Long seedProductId,
                                    LocalDateTime generatedAt) {

    public RecommendationContext {
        if (season == null) {
            season = SeasonSuitability.ofMonth(LocalDateTime.now().getMonthValue());
        }
        if (scene == null) {
            scene = RecommendationScene.HOME;
        }
        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }
    }

    public static RecommendationContext of(SeasonSuitability season, String festival, String scene) {
        return of(season, festival, RecommendationScene.parse(scene), null);
    }

    public static RecommendationContext of(SeasonSuitability season, String festival,
                                           RecommendationScene scene, Long seedProductId) {
        return new RecommendationContext(season, normalizeFestival(festival),
                scene == null ? RecommendationScene.HOME : scene, seedProductId, LocalDateTime.now());
    }

    public String sceneCode() {
        return scene.code();
    }

    private static String normalizeFestival(String festival) {
        return festival == null || festival.isBlank() ? null : festival.trim();
    }
}
