package com.flower.mall.module.favorite.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.favorite.service.FavoriteService;
import com.flower.mall.module.product.dto.ProductVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "商品收藏")
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Operation(summary = "我的收藏列表")
    @GetMapping
    public ApiResponse<List<ProductVO>> list() {
        return ApiResponse.ok(favoriteService.list());
    }

    @Operation(summary = "收藏商品")
    @PostMapping("/{productId}")
    public ApiResponse<Void> add(@PathVariable Long productId) {
        favoriteService.add(productId);
        return ApiResponse.ok();
    }

    @Operation(summary = "取消收藏")
    @DeleteMapping("/{productId}")
    public ApiResponse<Void> remove(@PathVariable Long productId) {
        favoriteService.remove(productId);
        return ApiResponse.ok();
    }
}
