package com.flower.mall.module.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationItemVO {

    private Long productId;
    private String name;
    private String imageUrl;
    private String category;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String priceBand;
    private List<String> occasionTags;
    private List<String> festivalTags;
    private String seasonLabel;
    private Integer salesCount;
    private BigDecimal ratingAvg;
    private Integer ratingCount;
    private double score;
    private double contentSimilarity;
    private double popularityScore;
    private double festivalSeasonScore;
    private double ratingScore;
    private String reason;
    private List<String> matchedTags;
}
