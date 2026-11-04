package com.flower.mall.module.recommendation.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.recommendation.dto.RecommendationQuery;
import com.flower.mall.module.recommendation.dto.RecommendationResponse;
import com.flower.mall.module.recommendation.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "智能推荐（核心）")
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @Operation(summary = "多因素加权个性化推荐",
            description = "结合商品内容特征、用户行为特征与节日季节上下文，返回带推荐理由和分数明细的排序结果")
    @GetMapping
    public ApiResponse<RecommendationResponse> recommend(@Valid RecommendationQuery query) {
        return ApiResponse.ok(recommendationService.recommend(query));
    }
}
