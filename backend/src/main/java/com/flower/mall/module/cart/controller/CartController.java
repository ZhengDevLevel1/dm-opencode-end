package com.flower.mall.module.cart.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.cart.dto.CartAddRequest;
import com.flower.mall.module.cart.dto.CartItemVO;
import com.flower.mall.module.cart.dto.CartUpdateRequest;
import com.flower.mall.module.cart.service.CartService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "购物车")
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @Operation(summary = "查看购物车")
    @GetMapping
    public ApiResponse<List<CartItemVO>> list() {
        return ApiResponse.ok(cartService.list());
    }

    @Operation(summary = "加入购物车")
    @PostMapping("/items")
    public ApiResponse<CartItemVO> add(@Valid @RequestBody CartAddRequest request) {
        return ApiResponse.ok(cartService.add(request));
    }

    @Operation(summary = "修改购物车商品数量")
    @PutMapping("/items/{id}")
    public ApiResponse<CartItemVO> update(@PathVariable Long id,
                                          @Valid @RequestBody CartUpdateRequest request) {
        return ApiResponse.ok(cartService.update(id, request));
    }

    @Operation(summary = "移除购物车商品")
    @DeleteMapping("/items/{id}")
    public ApiResponse<Void> remove(@PathVariable Long id) {
        cartService.remove(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "清空购物车")
    @DeleteMapping
    public ApiResponse<Void> clear() {
        cartService.clear();
        return ApiResponse.ok();
    }
}
