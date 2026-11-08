package com.flower.mall.module.metric.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.metric.dto.MetricConfigRequest;
import com.flower.mall.module.metric.dto.MetricConfigVO;
import com.flower.mall.module.metric.service.MetricConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "指标配置")
@RestController
@RequestMapping("/api/admin/metrics")
@RequiredArgsConstructor
public class AdminMetricController {

    private final MetricConfigService metricConfigService;

    @Operation(summary = "获取价格带与库存指标")
    @GetMapping
    public ApiResponse<MetricConfigVO> get() {
        return ApiResponse.ok(metricConfigService.get());
    }

    @Operation(summary = "保存价格带与库存指标")
    @PutMapping
    public ApiResponse<MetricConfigVO> update(@Valid @RequestBody MetricConfigRequest request) {
        return ApiResponse.ok(metricConfigService.update(request));
    }
}
