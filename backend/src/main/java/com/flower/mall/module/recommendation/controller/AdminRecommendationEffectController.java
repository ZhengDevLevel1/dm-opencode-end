package com.flower.mall.module.recommendation.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.recommendation.dto.RecommendationEffectVO;
import com.flower.mall.module.recommendation.dto.RecommendationExperimentRequest;
import com.flower.mall.module.recommendation.dto.RecommendationExperimentVO;
import com.flower.mall.module.recommendation.service.RecommendationEventService;
import com.flower.mall.module.recommendation.service.RecommendationExperimentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "管理端推荐效果与实验")
@RestController
@RequestMapping("/api/admin/recommendations")
@RequiredArgsConstructor
public class AdminRecommendationEffectController {

    private final RecommendationEventService eventService;
    private final RecommendationExperimentService experimentService;

    @Operation(summary = "推荐曝光/点击/加购/下单效果")
    @GetMapping("/effects")
    public ApiResponse<RecommendationEffectVO> effects(@RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(eventService.stats(days));
    }

    @Operation(summary = "推荐实验列表")
    @GetMapping("/experiments")
    public ApiResponse<List<RecommendationExperimentVO>> experiments() {
        return ApiResponse.ok(experimentService.list());
    }

    @Operation(summary = "保存推荐实验（A/B 或 Shadow）")
    @PostMapping("/experiments")
    public ApiResponse<RecommendationExperimentVO> saveExperiment(
            @Valid @RequestBody RecommendationExperimentRequest request) {
        return ApiResponse.ok(experimentService.save(request));
    }

    @Operation(summary = "启停推荐实验")
    @PutMapping("/experiments/{id}/status")
    public ApiResponse<RecommendationExperimentVO> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ApiResponse.ok(experimentService.updateStatus(id, body.get("status")));
    }
}
