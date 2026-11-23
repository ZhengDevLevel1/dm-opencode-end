package com.flower.mall.module.recommendation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class RecommendationEventBatchRequest {

    @NotEmpty(message = "事件列表不能为空")
    @Valid
    private List<RecommendationEventRequest> events;
}
