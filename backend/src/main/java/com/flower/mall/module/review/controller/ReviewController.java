package com.flower.mall.module.review.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.review.dto.ReviewCreateRequest;
import com.flower.mall.module.review.dto.ReviewVO;
import com.flower.mall.module.review.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "售后评价")
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "提交订单商品评价")
    @PostMapping
    @OperationLogRecord(module = "评价", operation = "提交评价")
    public ApiResponse<ReviewVO> create(@Valid @RequestBody ReviewCreateRequest request) {
        return ApiResponse.ok(reviewService.create(request));
    }

    @Operation(summary = "商品评价列表")
    @GetMapping("/products/{productId}")
    public ApiResponse<PageResult<ReviewVO>> pageByProduct(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size) {
        return ApiResponse.ok(reviewService.pageByProduct(productId, page, size));
    }

    @Operation(summary = "我的评价列表")
    @GetMapping("/my")
    public ApiResponse<PageResult<ReviewVO>> mine(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size) {
        return ApiResponse.ok(reviewService.pageMine(page, size));
    }
}
