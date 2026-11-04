package com.flower.mall.module.recommendation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RecommendationWeightRequest {

    @NotNull(message = "内容相似度权重不能为空")
    @DecimalMin(value = "0", message = "内容相似度权重不能小于0")
    @DecimalMax(value = "1", message = "内容相似度权重不能大于1")
    private BigDecimal contentWeight;

    @NotNull(message = "销量热度权重不能为空")
    @DecimalMin(value = "0", message = "销量热度权重不能小于0")
    @DecimalMax(value = "1", message = "销量热度权重不能大于1")
    private BigDecimal popularityWeight;

    @NotNull(message = "节日季节权重不能为空")
    @DecimalMin(value = "0", message = "节日季节权重不能小于0")
    @DecimalMax(value = "1", message = "节日季节权重不能大于1")
    private BigDecimal festivalWeight;

    @NotNull(message = "评分权重不能为空")
    @DecimalMin(value = "0", message = "评分权重不能小于0")
    @DecimalMax(value = "1", message = "评分权重不能大于1")
    private BigDecimal ratingWeight;

    public BigDecimal sum() {
        return contentWeight.add(popularityWeight).add(festivalWeight).add(ratingWeight);
    }
}
