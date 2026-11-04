package com.flower.mall.module.review.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flower.mall.module.review.entity.Review;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;

@Mapper
public interface ReviewMapper extends BaseMapper<Review> {

    @Select("""
            SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS review_count
            FROM review
            WHERE product_id = #{productId}
              AND status = 'VISIBLE'
            """)
    RatingStats selectRatingStats(@Param("productId") Long productId);

    record RatingStats(BigDecimal avgRating, int reviewCount) {
    }
}
