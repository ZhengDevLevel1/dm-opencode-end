package com.flower.mall.module.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSpecFlowerVO {

    private Long materialId;
    private String name;
    private String latinName;
    private String colorHex;
    private String imageUrl;
    private Integer quantity;
}
