package com.flower.mall.support;

public final class CacheKeys {

    public static final String PRODUCT_DETAIL_PREFIX = "cache:product:";
    public static final String HOT_PRODUCTS = "cache:product:hot";

    private CacheKeys() {
    }

    public static String productDetail(Long productId) {
        return PRODUCT_DETAIL_PREFIX + productId;
    }
}
