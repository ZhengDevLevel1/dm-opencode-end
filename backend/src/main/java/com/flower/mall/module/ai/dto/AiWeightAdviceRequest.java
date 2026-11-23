package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiWeightAdviceRequest {

    @NotBlank(message = "推荐场景不能为空")
    private String scene = "home";

    private Integer days = 30;
}
