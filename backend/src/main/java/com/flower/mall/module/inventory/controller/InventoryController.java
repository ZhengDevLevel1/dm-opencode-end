package com.flower.mall.module.inventory.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.inventory.dto.StockAdjustRequest;
import com.flower.mall.module.inventory.entity.InventoryRecord;
import com.flower.mall.module.inventory.service.InventoryService;
import com.flower.mall.module.product.dto.ProductQuery;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.service.ProductService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Tag(name = "店员-库存管理")
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final ProductService productService;

    @Operation(summary = "分页查询商品库存（含下架商品）")
    @GetMapping("/products")
    public ApiResponse<PageResult<ProductVO>> products(ProductQuery query) {
        return ApiResponse.ok(PageResult.of(productService.page(query, true), ProductVO::from));
    }

    @Operation(summary = "查看商品库存详情（含下架商品）")
    @GetMapping("/products/{id}")
    public ApiResponse<ProductVO> product(@PathVariable Long id) {
        return ApiResponse.ok(productService.detail(id, true));
    }

    @Operation(summary = "人工调整商品库存")
    @PostMapping("/products/{id}/stock")
    @OperationLogRecord(module = "库存管理", operation = "人工调整库存")
    public ApiResponse<InventoryRecord> adjustStock(@PathVariable Long id,
                                                    @Valid @RequestBody StockAdjustRequest request) {
        return ApiResponse.ok(inventoryService.adjustStock(id, request.getDelta(), request.getRemark()));
    }

    @Operation(summary = "分页查询库存变动记录")
    @GetMapping("/inventory")
    public ApiResponse<PageResult<InventoryRecord>> page(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String changeType,
            @RequestParam(required = false) String orderNo,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ApiResponse.ok(PageResult.of(
                inventoryService.page(page, size, productId, changeType, orderNo, keyword, start, end)));
    }
}
