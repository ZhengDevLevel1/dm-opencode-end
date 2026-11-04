package com.flower.mall.module.recommendation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RecommendationQuery {

    @Min(value = 1, message = "推荐数量至少为1")
    @Max(value = 50, message = "推荐数量最多为50")
    private int limit = 10;

    @Size(max = 20, message = "节日名称不能超过20个字符")
    private String festival;

    private String season;

    @Size(max = 30, message = "推荐场景不能超过30个字符")
    private String scene = "home";
}
