package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
public class AiWeightAdviceApplyRequest {

    @NotBlank(message = "推荐场景不能为空")
    private String scene;

    @NotNull(message = "建议权重不能为空")
    private Map<String, Double> weights = new LinkedHashMap<>();
}
