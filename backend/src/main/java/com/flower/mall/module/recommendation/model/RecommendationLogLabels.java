package com.flower.mall.module.recommendation.model;

import com.flower.mall.common.enums.SeasonSuitability;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class RecommendationLogLabels {

    private static final Map<String, String> SCENE_LABELS = Map.of(
            "home", "首页推荐",
            "product", "商品详情",
            "garden", "花园推荐"
    );

    private RecommendationLogLabels() {
    }

    public static String sceneLabel(String scene) {
        if (!StringUtils.hasText(scene)) {
            return "默认场景";
        }
        String value = scene.trim();
        return SCENE_LABELS.getOrDefault(value.toLowerCase(Locale.ROOT), value);
    }

    public static String seasonLabel(String season) {
        if (!StringUtils.hasText(season)) {
            return "未知";
        }
        String value = season.trim();
        try {
            return SeasonSuitability.valueOf(value.toUpperCase(Locale.ROOT)).getLabel();
        } catch (IllegalArgumentException exception) {
            return value;
        }
    }

    public static List<String> matchingScenes(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return List.of();
        }
        String value = keyword.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        List<String> matches = new ArrayList<>();
        SCENE_LABELS.forEach((code, label) -> {
            if (code.contains(lower) || label.contains(value)) {
                matches.add(code);
            }
        });
        return matches;
    }

    public static List<String> matchingSeasons(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return List.of();
        }
        String value = keyword.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        List<String> matches = new ArrayList<>();
        for (SeasonSuitability season : SeasonSuitability.values()) {
            if (season.name().toLowerCase(Locale.ROOT).contains(lower)
                    || season.getLabel().contains(value)) {
                matches.add(season.name());
            }
        }
        return matches;
    }
}
