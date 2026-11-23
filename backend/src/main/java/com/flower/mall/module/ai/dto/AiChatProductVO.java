package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatProductVO {
    private Long productId;
    private String name;
    private String category;
    private BigDecimal price;
    private BigDecimal ratingAvg;
    private Integer salesCount;
    private String reason;
}
