package com.flower.mall.module.stats.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.stats.dto.CategorySalesVO;
import com.flower.mall.module.stats.dto.OrderStatusVO;
import com.flower.mall.module.stats.dto.OverviewStatsVO;
import com.flower.mall.module.stats.dto.SalesTrendVO;
import com.flower.mall.module.stats.dto.TopProductVO;
import com.flower.mall.module.stats.service.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "管理员-经营分析")
@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    @Operation(summary = "经营总览")
    @GetMapping("/overview")
    public ApiResponse<OverviewStatsVO> overview() {
        return ApiResponse.ok(statsService.overview());
    }

    @Operation(summary = "销售趋势")
    @GetMapping("/sales-trend")
    public ApiResponse<List<SalesTrendVO>> salesTrend(@RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(statsService.salesTrend(days));
    }

    @Operation(summary = "品类销售分布")
    @GetMapping("/category-sales")
    public ApiResponse<List<CategorySalesVO>> categorySales() {
        return ApiResponse.ok(statsService.categorySales());
    }

    @Operation(summary = "订单状态分布")
    @GetMapping("/order-status")
    public ApiResponse<List<OrderStatusVO>> orderStatus() {
        return ApiResponse.ok(statsService.orderStatusDistribution());
    }

    @Operation(summary = "热销商品排行")
    @GetMapping("/top-products")
    public ApiResponse<List<TopProductVO>> topProducts() {
        return ApiResponse.ok(statsService.topProducts());
    }
}
