package com.flower.mall.module.preference.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.preference.dto.ThemePreferenceRequest;
import com.flower.mall.module.preference.dto.ThemePreferenceVO;
import com.flower.mall.module.preference.service.ThemePreferenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "用户偏好")
@RestController
@RequestMapping("/api/auth/preferences")
@RequiredArgsConstructor
public class ThemePreferenceController {

    private final ThemePreferenceService themePreferenceService;

    @Operation(summary = "获取当前用户的外观偏好")
    @GetMapping
    public ApiResponse<ThemePreferenceVO> get() {
        return ApiResponse.ok(themePreferenceService.get());
    }

    @Operation(summary = "保存当前用户的外观偏好")
    @PutMapping
    public ApiResponse<ThemePreferenceVO> update(@Valid @RequestBody ThemePreferenceRequest request) {
        return ApiResponse.ok(themePreferenceService.update(request));
    }
}
