package com.flower.mall.module.review.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.review.dto.ReviewReplyRequest;
import com.flower.mall.module.review.dto.ReviewVO;
import com.flower.mall.module.review.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "管理员-评价管理")
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
public class AdminReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "分页查询评价")
    @GetMapping
    public ApiResponse<PageResult<ReviewVO>> page(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(reviewService.pageAdmin(page, size, productId, status, keyword));
    }

    @Operation(summary = "显示或隐藏评价")
    @PutMapping("/{id}/status")
    @OperationLogRecord(module = "评价管理", operation = "评价显示状态")
    public ApiResponse<ReviewVO> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ApiResponse.ok(reviewService.updateStatus(id, status));
    }

    @Operation(summary = "回复评价")
    @PutMapping("/{id}/reply")
    @OperationLogRecord(module = "评价管理", operation = "回复评价")
    public ApiResponse<ReviewVO> reply(@PathVariable Long id,
                                       @Valid @RequestBody ReviewReplyRequest request) {
        return ApiResponse.ok(reviewService.reply(id, request.getReply()));
    }
}
