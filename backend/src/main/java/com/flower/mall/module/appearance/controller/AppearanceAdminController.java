package com.flower.mall.module.appearance.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.appearance.dto.AuthBackgroundRequest;
import com.flower.mall.module.appearance.dto.AuthBackgroundVO;
import com.flower.mall.module.appearance.service.AppearanceService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "管理端外观设置")
@RestController
@RequestMapping("/api/admin/appearance")
@RequiredArgsConstructor
public class AppearanceAdminController {

    private final AppearanceService appearanceService;

    @Operation(summary = "更新登录页背景")
    @PutMapping("/auth-background")
    @OperationLogRecord(module = "外观管理", operation = "更新登录页背景", saveParams = false)
    public ApiResponse<AuthBackgroundVO> updateAuthBackground(
            @Valid @RequestBody AuthBackgroundRequest request) {
        return ApiResponse.ok(appearanceService.updateAuthBackground(request));
    }
}
