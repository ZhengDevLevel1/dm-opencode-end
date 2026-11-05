package com.flower.mall.module.appearance.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.appearance.dto.AuthBackgroundVO;
import com.flower.mall.module.appearance.service.AppearanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "外观设置")
@RestController
@RequestMapping("/api/appearance")
@RequiredArgsConstructor
public class AppearanceController {

    private final AppearanceService appearanceService;

    @Operation(summary = "获取登录页背景")
    @GetMapping("/auth-background")
    public ApiResponse<AuthBackgroundVO> authBackground() {
        return ApiResponse.ok(appearanceService.getAuthBackground());
    }
}
