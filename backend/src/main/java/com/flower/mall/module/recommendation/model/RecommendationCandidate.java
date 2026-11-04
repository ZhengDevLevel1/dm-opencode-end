package com.flower.mall.module.recommendation.model;

import com.flower.mall.common.enums.SeasonSuitability;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.entity.Product;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class RecommendationCandidate {

    private final Long id;
    private final String name;
    private final String imageUrl;
    private final String category;
    private final List<String> occasionTags;
    private final List<String> festivalTags;
    private final String flowerMeaning;
    private final SeasonSuitability season;
    private final BigDecimal price;
    private final BigDecimal originalPrice;
    private final int salesCount;
    private final BigDecimal ratingAvg;
    private final int ratingCount;

    public static RecommendationCandidate from(Product product) {
        SeasonSuitability season = SeasonSuitability.ALL;
        if (product.getSeasonSuitability() != null) {
            try {
                season = SeasonSuitability.valueOf(product.getSeasonSuitability());
            } catch (IllegalArgumentException ignored) {
                season = SeasonSuitability.ALL;
            }
        }
        return RecommendationCandidate.builder()
                .id(product.getId())
                .name(product.getName())
                .imageUrl(product.getImageUrl())
                .category(product.getCategory())
                .occasionTags(TagUtils.splitTags(product.getOccasionTags()))
                .festivalTags(TagUtils.splitTags(product.getFestivalTags()))
                .flowerMeaning(product.getFlowerMeaning())
                .season(season)
                .price(product.getPrice())
                .originalPrice(product.getOriginalPrice())
                .salesCount(product.getSalesCount() == null ? 0 : product.getSalesCount())
                .ratingAvg(product.getRatingAvg() == null ? BigDecimal.ZERO : product.getRatingAvg())
                .ratingCount(product.getRatingCount() == null ? 0 : product.getRatingCount())
                .build();
    }

    public String priceBand() {
        return ProductVO.priceBand(price);
    }

    public boolean matchesFestival(String festival) {
        if (festival == null || festival.isBlank()) {
            return false;
        }
        return festivalTags.stream().anyMatch(tag -> tag.contains(festival) || festival.contains(tag));
    }
}
