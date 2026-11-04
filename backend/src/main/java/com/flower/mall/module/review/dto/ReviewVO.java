package com.flower.mall.module.review.dto;

import com.flower.mall.common.enums.ReviewStatus;
import com.flower.mall.module.review.entity.Review;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewVO {

    private Long id;
    private Long orderId;
    private Long orderItemId;
    private Long productId;
    private String productName;
    private Long userId;
    private String nickname;
    private Integer rating;
    private String content;
    private String reply;
    private String status;
    private String statusLabel;
    private LocalDateTime createdAt;

    public static ReviewVO from(Review review) {
        ReviewStatus status = ReviewStatus.valueOf(review.getStatus());
        return ReviewVO.builder()
                .id(review.getId())
                .orderId(review.getOrderId())
                .orderItemId(review.getOrderItemId())
                .productId(review.getProductId())
                .userId(review.getUserId())
                .rating(review.getRating())
                .content(review.getContent())
                .reply(review.getReply())
                .status(status.name())
                .statusLabel(status.getLabel())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
