package com.flower.mall.module.recommendation.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.common.enums.ReviewStatus;
import com.flower.mall.module.favorite.entity.UserFavorite;
import com.flower.mall.module.favorite.mapper.UserFavoriteMapper;
import com.flower.mall.module.metric.service.MetricConfigService;
import com.flower.mall.module.order.entity.Order;
import com.flower.mall.module.order.entity.OrderItem;
import com.flower.mall.module.order.mapper.OrderItemMapper;
import com.flower.mall.module.order.mapper.OrderMapper;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.module.recommendation.model.RecommendationCandidate;
import com.flower.mall.module.recommendation.model.UserBehaviorData;
import com.flower.mall.module.review.entity.Review;
import com.flower.mall.module.review.mapper.ReviewMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserBehaviorService {

    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final UserFavoriteMapper favoriteMapper;
    private final ReviewMapper reviewMapper;
    private final MetricConfigService metricConfigService;

    public UserBehaviorData load(Long userId) {
        if (userId == null) {
            return UserBehaviorData.empty();
        }
        List<Order> recentOrders = orderMapper.selectList(Wrappers.<Order>lambdaQuery()
                .eq(Order::getUserId, userId)
                .ge(Order::getCreatedAt, LocalDateTime.now().minusDays(30))
                .in(Order::getStatus,
                        OrderStatus.PAID.name(),
                        OrderStatus.FULFILLING.name(),
                        OrderStatus.COMPLETED.name(),
                        OrderStatus.AFTER_SALE.name()));

        Map<Long, Integer> purchasedQuantities = new LinkedHashMap<>();
        if (!recentOrders.isEmpty()) {
            List<Long> orderIds = recentOrders.stream().map(Order::getId).toList();
            List<OrderItem> items = orderItemMapper.selectList(Wrappers.<OrderItem>lambdaQuery()
                    .in(OrderItem::getOrderId, orderIds));
            items.forEach(item -> purchasedQuantities.merge(item.getProductId(), item.getQuantity(), Integer::sum));
        }

        List<UserFavorite> favorites = favoriteMapper.selectList(Wrappers.<UserFavorite>lambdaQuery()
                .eq(UserFavorite::getUserId, userId));
        List<Review> reviews = reviewMapper.selectList(Wrappers.<Review>lambdaQuery()
                .eq(Review::getUserId, userId)
                .eq(Review::getStatus, ReviewStatus.VISIBLE.name()));

        List<Long> productIds = new ArrayList<>();
        productIds.addAll(purchasedQuantities.keySet());
        productIds.addAll(favorites.stream().map(UserFavorite::getProductId).toList());
        productIds.addAll(reviews.stream().map(Review::getProductId).toList());
        List<Long> distinctIds = productIds.stream().distinct().toList();
        Map<Long, Product> products = distinctIds.isEmpty()
                ? Map.of()
                : productMapper.selectBatchIds(distinctIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        List<UserBehaviorData.PurchasedProduct> purchases = purchasedQuantities.entrySet().stream()
                .filter(entry -> products.containsKey(entry.getKey()))
                .map(entry -> new UserBehaviorData.PurchasedProduct(
                        toCandidate(products.get(entry.getKey())), entry.getValue()))
                .toList();

        List<RecommendationCandidate> favoriteProducts = favorites.stream()
                .map(favorite -> products.get(favorite.getProductId()))
                .filter(product -> product != null)
                .map(this::toCandidate)
                .toList();

        List<UserBehaviorData.ReviewedProduct> reviewedProducts = reviews.stream()
                .map(review -> {
                    Product product = products.get(review.getProductId());
                    return product == null ? null : new UserBehaviorData.ReviewedProduct(
                            toCandidate(product), review.getRating());
                })
                .filter(value -> value != null)
                .toList();

        Map<String, Double> categoryDistribution = new LinkedHashMap<>();
        for (UserBehaviorData.PurchasedProduct purchase : purchases) {
            String category = purchase.product().getCategory();
            if (category != null && !category.isBlank()) {
                categoryDistribution.merge(category, (double) purchase.quantity(), Double::sum);
            }
        }
        double categoryTotal = categoryDistribution.values().stream()
                .mapToDouble(Double::doubleValue)
                .sum();
        if (categoryTotal > 0) {
            categoryDistribution.replaceAll((category, count) -> round4(count / categoryTotal));
        }

        Set<String> favoriteTags = new LinkedHashSet<>();
        for (RecommendationCandidate favorite : favoriteProducts) {
            addTag(favoriteTags, "cat:", favorite.getCategory());
            if (favorite.getOccasionTags() != null) {
                favorite.getOccasionTags().forEach(tag -> addTag(favoriteTags, "occ:", tag));
            }
            if (favorite.getFestivalTags() != null) {
                favorite.getFestivalTags().forEach(tag -> addTag(favoriteTags, "fest:", tag));
            }
        }

        double averageRating = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
        return UserBehaviorData.builder()
                .purchases(purchases)
                .favorites(favoriteProducts)
                .reviews(reviewedProducts)
                .categoryDistribution(categoryDistribution)
                .favoriteTags(new ArrayList<>(favoriteTags))
                .purchaseFrequency(recentOrders.size())
                .averageRating(averageRating)
                .build();
    }

    private RecommendationCandidate toCandidate(Product product) {
        return RecommendationCandidate.from(product, metricConfigService.priceBand(product.getPrice()));
    }

    private void addTag(Set<String> tags, String prefix, String value) {
        if (value != null && !value.isBlank()) {
            tags.add(prefix + value.trim());
        }
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}
