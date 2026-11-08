package com.flower.mall.module.stats.service;

import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.module.metric.service.MetricConfigService;
import com.flower.mall.module.stats.dto.CategorySalesRow;
import com.flower.mall.module.stats.dto.CategorySalesVO;
import com.flower.mall.module.stats.dto.OrderStatusRow;
import com.flower.mall.module.stats.dto.OrderStatusVO;
import com.flower.mall.module.stats.dto.OverviewStatsVO;
import com.flower.mall.module.stats.dto.SalesTrendRow;
import com.flower.mall.module.stats.dto.SalesTrendVO;
import com.flower.mall.module.stats.dto.TopProductRow;
import com.flower.mall.module.stats.dto.TopProductVO;
import com.flower.mall.module.stats.mapper.StatsMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final StatsMapper statsMapper;
    private final MetricConfigService metricConfigService;

    public OverviewStatsVO overview() {
        BigDecimal averageRating = statsMapper.averageRating();
        return OverviewStatsVO.builder()
                .totalSales(scale(statsMapper.totalSales()))
                .todaySales(scale(statsMapper.todaySales()))
                .totalOrders(statsMapper.totalOrders())
                .todayOrders(statsMapper.todayOrders())
                .pendingFulfillment(statsMapper.pendingFulfillment())
                .lowStockProducts(statsMapper.lowStockProducts(metricConfigService.lowStockThreshold()))
                .onSaleProducts(statsMapper.onSaleProducts())
                .customerCount(statsMapper.customerCount())
                .totalReviews(statsMapper.totalReviews())
                .averageRating(averageRating == null ? BigDecimal.ZERO
                        : averageRating.setScale(2, RoundingMode.HALF_UP))
                .build();
    }

    public List<SalesTrendVO> salesTrend(int days) {
        int range = Math.min(Math.max(days, 1), 90);
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(range - 1L);
        Map<LocalDate, SalesTrendRow> rows = statsMapper.selectSalesTrend(start.atStartOfDay())
                .stream()
                .collect(Collectors.toMap(SalesTrendRow::getStatDate, Function.identity(),
                        (left, right) -> right, LinkedHashMap::new));
        List<SalesTrendVO> result = new ArrayList<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            SalesTrendRow row = rows.get(date);
            result.add(SalesTrendVO.builder()
                    .date(date)
                    .amount(row == null ? BigDecimal.ZERO : scale(row.getAmount()))
                    .orderCount(row == null ? 0 : row.getOrderCount())
                    .build());
        }
        return result;
    }

    public List<CategorySalesVO> categorySales() {
        return statsMapper.selectCategorySales().stream()
                .map(row -> new CategorySalesVO(row.getCategory(), scale(row.getAmount()), row.getQuantity()))
                .toList();
    }

    public List<OrderStatusVO> orderStatusDistribution() {
        Map<String, Long> counts = statsMapper.selectOrderStatusCounts().stream()
                .collect(Collectors.toMap(OrderStatusRow::getStatus, OrderStatusRow::getOrderCount,
                        Long::sum));
        return Arrays.stream(OrderStatus.values())
                .map(status -> OrderStatusVO.builder()
                        .status(status.name())
                        .statusLabel(status.getLabel())
                        .count(counts.getOrDefault(status.name(), 0L))
                        .build())
                .toList();
    }

    public List<TopProductVO> topProducts() {
        return statsMapper.selectTopProducts().stream()
                .map(row -> TopProductVO.builder()
                        .productId(row.getProductId())
                        .productName(row.getProductName())
                        .quantity(row.getQuantity())
                        .amount(scale(row.getAmount()))
                        .build())
                .toList();
    }

    private BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
