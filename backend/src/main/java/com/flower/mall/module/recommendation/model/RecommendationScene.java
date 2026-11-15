package com.flower.mall.module.recommendation.model;

import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;

import java.util.List;
import java.util.Locale;

public enum RecommendationScene {

    HOME("home", "首页推荐", 2, false, "home"),
    CATALOG("catalog", "全部花礼", 0, false, "catalog"),
    RECOMMENDATIONS("recommendations", "智能推荐", 2, false, "recommendations"),
    PRODUCT("product", "商品详情", 3, true, "product"),
    GARDEN("garden", "花园推荐", 2, false, "home");

    public static final List<RecommendationScene> CONFIGURABLE =
            List.of(HOME, CATALOG, RECOMMENDATIONS, PRODUCT);

    private final String code;
    private final String label;
    private final int maxPerCategory;
    private final boolean seedRequired;
    private final String policyCode;

    RecommendationScene(String code, String label, int maxPerCategory,
                        boolean seedRequired, String policyCode) {
        this.code = code;
        this.label = label;
        this.maxPerCategory = maxPerCategory;
        this.seedRequired = seedRequired;
        this.policyCode = policyCode;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }

    public int maxPerCategory() {
        return maxPerCategory;
    }

    public boolean seedRequired() {
        return seedRequired;
    }

    public RecommendationScene policyScene() {
        return switch (this) {
            case GARDEN -> HOME;
            default -> this;
        };
    }

    public boolean configurable() {
        return this != GARDEN;
    }

    public double behaviorConfidenceFactor() {
        return switch (this) {
            case RECOMMENDATIONS, PRODUCT -> 1.0;
            case CATALOG -> 0.90;
            default -> 0.85;
        };
    }

    public String policyCode() {
        return policyCode;
    }

    public static RecommendationScene parse(String value) {
        RecommendationScene scene = fromCode(value);
        if (scene != null) {
            return scene;
        }
        throw BusinessException.of(ErrorCode.BAD_REQUEST,
                "推荐场景不合法，支持 home、catalog、recommendations、product、garden");
    }

    public static RecommendationScene fromCode(String value) {
        if (value == null || value.isBlank()) {
            return HOME;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        for (RecommendationScene scene : values()) {
            if (scene.code.equals(normalized)) {
                return scene;
            }
        }
        return null;
    }
}
