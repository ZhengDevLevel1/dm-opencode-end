package com.flower.mall.module.stats.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OverviewStatsVO {

    private BigDecimal totalSales;
    private BigDecimal todaySales;
    private long totalOrders;
    private long todayOrders;
    private long pendingFulfillment;
    private long lowStockProducts;
    private long overstockProducts;
    private long onSaleProducts;
    private long customerCount;
    private long totalReviews;
    private BigDecimal averageRating;
}
