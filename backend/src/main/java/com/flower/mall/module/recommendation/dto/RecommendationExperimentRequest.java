package com.flower.mall.module.recommendation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RecommendationExperimentRequest {

    @NotBlank(message = "实验ID不能为空")
    private String id;

    @NotBlank(message = "实验名称不能为空")
    private String name;

    private String scene = "home";

    private String mode = "AB";

    @Min(value = 0, message = "流量比例不能小于0")
    @Max(value = 100, message = "流量比例不能大于100")
    private Integer trafficPercent = 10;

    private String status = "PAUSED";

    private String primaryMetric = "CTR";

    private String configJson;
}
