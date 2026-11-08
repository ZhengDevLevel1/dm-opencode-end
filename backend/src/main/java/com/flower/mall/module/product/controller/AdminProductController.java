package com.flower.mall.module.product.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.product.dto.ProductQuery;
import com.flower.mall.module.product.dto.ProductSaveRequest;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "管理员-商品管理")
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductService productService;

    @Operation(summary = "管理员分页查询商品（含下架）")
    @GetMapping
    public ApiResponse<PageResult<ProductVO>> page(ProductQuery query) {
        return ApiResponse.ok(productService.pageVO(query, true));
    }

    @Operation(summary = "管理员查看商品详情")
    @GetMapping("/{id}")
    public ApiResponse<ProductVO> detail(@PathVariable Long id) {
        return ApiResponse.ok(productService.detail(id, true));
    }

    @Operation(summary = "商品建档")
    @PostMapping
    @OperationLogRecord(module = "商品管理", operation = "商品建档")
    public ApiResponse<ProductVO> create(@Valid @RequestBody ProductSaveRequest request) {
        return ApiResponse.ok(productService.create(request));
    }

    @Operation(summary = "编辑商品")
    @PutMapping("/{id}")
    @OperationLogRecord(module = "商品管理", operation = "编辑商品")
    public ApiResponse<ProductVO> update(@PathVariable Long id,
                                         @Valid @RequestBody ProductSaveRequest request) {
        return ApiResponse.ok(productService.update(id, request));
    }

    @Operation(summary = "商品上下架")
    @PutMapping("/{id}/status")
    @OperationLogRecord(module = "商品管理", operation = "商品上下架")
    public ApiResponse<ProductVO> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ApiResponse.ok(productService.updateStatus(id, status));
    }

    @Operation(summary = "删除商品（逻辑删除）")
    @DeleteMapping("/{id}")
    @OperationLogRecord(module = "商品管理", operation = "删除商品")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ApiResponse.ok();
    }
}
