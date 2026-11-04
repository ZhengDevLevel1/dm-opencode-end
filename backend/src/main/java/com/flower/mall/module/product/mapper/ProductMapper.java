package com.flower.mall.module.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flower.mall.module.product.entity.Product;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.math.BigDecimal;

@Mapper
public interface ProductMapper extends BaseMapper<Product> {

    @Update("""
            UPDATE product
            SET stock = stock - #{quantity},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = #{productId}
              AND stock >= #{quantity}
              AND status = 'ON_SALE'
              AND deleted = 0
            """)
    int deductStock(@Param("productId") Long productId, @Param("quantity") int quantity);

    @Update("""
            UPDATE product
            SET stock = stock + #{quantity},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = #{productId}
              AND deleted = 0
            """)
    int restoreStock(@Param("productId") Long productId, @Param("quantity") int quantity);

    @Update("""
            UPDATE product
            SET stock = stock + #{delta},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = #{productId}
              AND stock + #{delta} >= 0
              AND deleted = 0
            """)
    int adjustStock(@Param("productId") Long productId, @Param("delta") int delta);

    @Update("""
            UPDATE product
            SET sales_count = sales_count + #{quantity},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = #{productId}
              AND deleted = 0
            """)
    int increaseSales(@Param("productId") Long productId, @Param("quantity") int quantity);

    @Update("""
            UPDATE product
            SET sales_count = CASE WHEN sales_count >= #{quantity} THEN sales_count - #{quantity} ELSE 0 END,
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = #{productId}
              AND deleted = 0
            """)
    int decreaseSales(@Param("productId") Long productId, @Param("quantity") int quantity);

    @Update("""
            UPDATE product
            SET rating_avg = #{ratingAvg},
                rating_count = #{ratingCount},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = #{productId}
              AND deleted = 0
            """)
    int updateRatingStats(@Param("productId") Long productId,
                          @Param("ratingAvg") BigDecimal ratingAvg,
                          @Param("ratingCount") int ratingCount);
}

