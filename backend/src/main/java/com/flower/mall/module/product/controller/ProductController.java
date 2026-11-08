package com.flower.mall.module.product.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.product.dto.ProductQuery;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "商品浏览与检索")
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @Operation(summary = "组合条件分页检索商品")
    @GetMapping
    public ApiResponse<PageResult<ProductVO>> page(ProductQuery query) {
        return ApiResponse.ok(productService.pageVO(query, false));
    }

    @Operation(summary = "热销商品（Redis 缓存）")
    @GetMapping("/hot")
    public ApiResponse<List<ProductVO>> hot() {
        return ApiResponse.ok(productService.hotProducts());
    }

    @Operation(summary = "商品详情")
    @GetMapping("/{id}")
    public ApiResponse<ProductVO> detail(@PathVariable Long id) {
        return ApiResponse.ok(productService.detail(id, false));
    }
}
