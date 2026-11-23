package com.flower.mall.module.recommendation.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.recommendation.dto.RecommendationEventBatchRequest;
import com.flower.mall.module.recommendation.service.RecommendationEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "推荐行为事件")
@RestController
@RequestMapping("/api/recommendation-events")
@RequiredArgsConstructor
public class RecommendationEventController {

    private final RecommendationEventService eventService;

    @Operation(summary = "上报曝光/浏览/点击/加购事件")
    @PostMapping
    public ApiResponse<Map<String, Integer>> ingest(
            @Valid @RequestBody RecommendationEventBatchRequest request) {
        return ApiResponse.ok(Map.of("accepted", eventService.ingest(request)));
    }
}
