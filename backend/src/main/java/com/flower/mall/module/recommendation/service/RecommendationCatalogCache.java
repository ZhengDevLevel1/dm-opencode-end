package com.flower.mall.module.recommendation.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.support.TransactionCacheSupport;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class RecommendationCatalogCache {

    private final ProductMapper productMapper;
    private final long ttlSeconds;
    private final Object refreshLock = new Object();
    private volatile Snapshot snapshot;

    public RecommendationCatalogCache(ProductMapper productMapper, AppProperties properties) {
        this.productMapper = productMapper;
        this.ttlSeconds = Math.max(properties.getRecommendation().getProductCacheSeconds(), 1);
    }

    public List<Product> onSaleProducts() {
        Snapshot current = snapshot;
        Instant now = Instant.now();
        if (current != null && current.expiresAt().isAfter(now)) {
            return current.products();
        }
        synchronized (refreshLock) {
            current = snapshot;
            now = Instant.now();
            if (current != null && current.expiresAt().isAfter(now)) {
                return current.products();
            }
            List<Product> products = List.copyOf(productMapper.selectList(Wrappers.<Product>lambdaQuery()
                    .select(Product::getId, Product::getName, Product::getImageUrl, Product::getCategory,
                            Product::getFlowerMeaning, Product::getOccasionTags, Product::getFestivalTags,
                            Product::getPrice, Product::getOriginalPrice, Product::getSeasonSuitability,
                            Product::getSalesCount, Product::getRatingAvg, Product::getRatingCount)
                    .eq(Product::getStatus, ProductStatus.ON_SALE.name())
                    .orderByDesc(Product::getSalesCount)
                    .orderByDesc(Product::getId)));
            snapshot = new Snapshot(products, now.plusSeconds(ttlSeconds));
            TransactionCacheSupport.onRollback(this::clear);
            return products;
        }
    }

    public void invalidate() {
        clear();
        TransactionCacheSupport.afterCompletion(this::clear);
    }

    private void clear() {
        snapshot = null;
    }

    private record Snapshot(List<Product> products, Instant expiresAt) {
    }
}
