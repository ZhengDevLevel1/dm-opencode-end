package com.flower.mall.module.product.dto;

import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.common.enums.SeasonSuitability;
import com.flower.mall.module.product.entity.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVO {

    private Long id;
    private String name;
    private String category;
    private String flowerMeaning;
    private String occasionTags;
    private String festivalTags;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer stock;
    private String imageUrl;
    private String description;
    private String seasonSuitability;
    private String seasonLabel;
    private String priceBand;
    private Integer salesCount;
    private BigDecimal ratingAvg;
    private Integer ratingCount;
    private String status;
    private String statusLabel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProductVO from(Product product) {
        SeasonSuitability season = SeasonSuitability.valueOf(product.getSeasonSuitability());
        ProductStatus status = ProductStatus.valueOf(product.getStatus());
        return ProductVO.builder()
                .id(product.getId())
                .name(product.getName())
                .category(product.getCategory())
                .flowerMeaning(product.getFlowerMeaning())
                .occasionTags(product.getOccasionTags())
                .festivalTags(product.getFestivalTags())
                .price(product.getPrice())
                .originalPrice(product.getOriginalPrice())
                .stock(product.getStock())
                .imageUrl(product.getImageUrl())
                .description(product.getDescription())
                .seasonSuitability(season.name())
                .seasonLabel(season.getLabel())
                .priceBand(priceBand(product.getPrice()))
                .salesCount(product.getSalesCount())
                .ratingAvg(product.getRatingAvg())
                .ratingCount(product.getRatingCount())
                .status(status.name())
                .statusLabel(status.getLabel())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    public static String priceBand(BigDecimal price) {
        if (price == null) {
            return "未知";
        }
        if (price.compareTo(BigDecimal.valueOf(100)) < 0) {
            return "平价";
        }
        if (price.compareTo(BigDecimal.valueOf(300)) < 0) {
            return "中端";
        }
        return "高端";
    }
}
