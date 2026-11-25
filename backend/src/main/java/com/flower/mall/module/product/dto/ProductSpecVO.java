package com.flower.mall.module.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSpecVO {

    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private BigDecimal effectivePrice;
    private Integer totalStems;
    private boolean enabled;
    private Integer sortOrder;
    private List<ProductSpecFlowerVO> flowers;
}
