package com.flower.mall.module.recommendation.model;

public enum RecommendationMode {

    PERSONALIZED("PERSONALIZED", "个性化推荐"),
    CONTEXT_COLD_START("CONTEXT_COLD_START", "冷启动推荐"),
    SEED_SIMILAR("SEED_SIMILAR", "相似商品推荐"),
    CATALOG_POPULAR("CATALOG_POPULAR", "综合排序");

    private final String code;
    private final String label;

    RecommendationMode(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }
}
