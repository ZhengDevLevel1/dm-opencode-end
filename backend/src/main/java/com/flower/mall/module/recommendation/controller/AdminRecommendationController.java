package com.flower.mall.module.recommendation.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.recommendation.dto.RecommendationEvaluationVO;
import com.flower.mall.module.recommendation.dto.RecommendationLogVO;
import com.flower.mall.module.recommendation.dto.RecommendationStatsVO;
import com.flower.mall.module.recommendation.dto.RecommendationWeightRequest;
import com.flower.mall.module.recommendation.dto.RecommendationWeightsVO;
import com.flower.mall.module.recommendation.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Tag(name = "管理员-推荐配置与效果")
@RestController
@RequestMapping("/api/admin/recommendations")
@RequiredArgsConstructor
public class AdminRecommendationController {

    private final RecommendationService recommendationService;

    @Operation(summary = "查看推荐权重配置")
    @GetMapping("/weights")
    public ApiResponse<RecommendationWeightsVO> weights() {
        return ApiResponse.ok(recommendationService.getWeights());
    }

    @Operation(summary = "调整推荐权重（四项之和须为1）")
    @PutMapping("/weights")
    @OperationLogRecord(module = "推荐管理", operation = "调整推荐权重")
    public ApiResponse<RecommendationWeightsVO> updateWeights(
            @Valid @RequestBody RecommendationWeightRequest request) {
        return ApiResponse.ok(recommendationService.updateWeights(request));
    }

    @Operation(summary = "分页查询推荐日志")
    @GetMapping("/logs")
    public ApiResponse<PageResult<RecommendationLogVO>> logs(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ApiResponse.ok(recommendationService.pageLogs(page, size, userId, keyword, start, end));
    }

    @Operation(summary = "三类典型用户画像推荐效果评估")
    @GetMapping("/evaluation")
    public ApiResponse<RecommendationEvaluationVO> evaluation() {
        return ApiResponse.ok(recommendationService.evaluatePersonas());
    }

    @Operation(summary = "近30天推荐覆盖率统计")
    @GetMapping("/stats")
    public ApiResponse<RecommendationStatsVO> stats() {
        return ApiResponse.ok(recommendationService.stats());
    }
}
