package com.flower.mall.module.stats.mapper;

import com.flower.mall.module.stats.dto.CategorySalesRow;
import com.flower.mall.module.stats.dto.OrderStatusRow;
import com.flower.mall.module.stats.dto.SalesTrendRow;
import com.flower.mall.module.stats.dto.TopProductRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface StatsMapper {

    @Select("""
            SELECT COALESCE(SUM(pay_amount), 0)
            FROM shop_order
            WHERE deleted = 0
              AND status IN ('PAID', 'FULFILLING', 'COMPLETED', 'AFTER_SALE')
            """)
    BigDecimal totalSales();

    @Select("""
            SELECT COALESCE(SUM(pay_amount), 0)
            FROM shop_order
            WHERE deleted = 0
              AND status IN ('PAID', 'FULFILLING', 'COMPLETED', 'AFTER_SALE')
              AND CAST(created_at AS DATE) = CURRENT_DATE
            """)
    BigDecimal todaySales();

    @Select("SELECT COUNT(*) FROM shop_order WHERE deleted = 0")
    long totalOrders();

    @Select("SELECT COUNT(*) FROM shop_order WHERE deleted = 0 AND CAST(created_at AS DATE) = CURRENT_DATE")
    long todayOrders();

    @Select("SELECT COUNT(*) FROM shop_order WHERE deleted = 0 AND status = 'PAID'")
    long pendingFulfillment();

    @Select("""
            SELECT COUNT(*) FROM product
            WHERE deleted = 0 AND status = 'ON_SALE' AND stock < #{threshold}
            """)
    long lowStockProducts(@Param("threshold") int threshold);

    @Select("""
            SELECT COUNT(*) FROM product
            WHERE deleted = 0 AND status = 'ON_SALE' AND stock >= #{threshold}
            """)
    long overstockProducts(@Param("threshold") int threshold);

    @Select("SELECT COUNT(*) FROM product WHERE deleted = 0 AND status = 'ON_SALE'")
    long onSaleProducts();

    @Select("SELECT COUNT(*) FROM sys_user WHERE deleted = 0 AND role = 'CUSTOMER'")
    long customerCount();

    @Select("SELECT COUNT(*) FROM review WHERE status = 'VISIBLE'")
    long totalReviews();

    @Select("SELECT COALESCE(AVG(rating), 0) FROM review WHERE status = 'VISIBLE'")
    BigDecimal averageRating();

    @Select("""
            SELECT CAST(COALESCE(paid_at, created_at) AS DATE) AS stat_date,
                   COALESCE(SUM(pay_amount), 0) AS amount,
                   COUNT(*) AS order_count
            FROM shop_order
            WHERE deleted = 0
              AND status IN ('PAID', 'FULFILLING', 'COMPLETED', 'AFTER_SALE')
              AND created_at >= #{start}
            GROUP BY CAST(COALESCE(paid_at, created_at) AS DATE)
            ORDER BY stat_date
            """)
    List<SalesTrendRow> selectSalesTrend(@Param("start") LocalDateTime start);

    @Select("""
            SELECT p.category AS category,
                   COALESCE(SUM(oi.subtotal), 0) AS amount,
                   COALESCE(SUM(oi.quantity), 0) AS quantity
            FROM order_item oi
            JOIN shop_order o ON oi.order_id = o.id
            JOIN product p ON oi.product_id = p.id
            WHERE o.deleted = 0
              AND o.status IN ('PAID', 'FULFILLING', 'COMPLETED', 'AFTER_SALE')
            GROUP BY p.category
            ORDER BY amount DESC
            """)
    List<CategorySalesRow> selectCategorySales();

    @Select("""
            SELECT status, COUNT(*) AS order_count
            FROM shop_order
            WHERE deleted = 0
            GROUP BY status
            """)
    List<OrderStatusRow> selectOrderStatusCounts();

    @Select("""
            SELECT oi.product_id AS product_id,
                   oi.product_name AS product_name,
                   COALESCE(SUM(oi.quantity), 0) AS quantity,
                   COALESCE(SUM(oi.subtotal), 0) AS amount
            FROM order_item oi
            JOIN shop_order o ON oi.order_id = o.id
            WHERE o.deleted = 0
              AND o.status IN ('PAID', 'FULFILLING', 'COMPLETED', 'AFTER_SALE')
            GROUP BY oi.product_id, oi.product_name
            ORDER BY quantity DESC
            LIMIT 10
            """)
    List<TopProductRow> selectTopProducts();
}
