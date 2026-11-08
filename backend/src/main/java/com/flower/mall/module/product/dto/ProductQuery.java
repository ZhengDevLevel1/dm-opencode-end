package com.flower.mall.module.product.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductQuery {

    private long page = 1;
    private long size = 10;
    private String keyword;
    private String category;
    private String occasion;
    private String festival;
    private String season;
    private String status;
    private Boolean lowStock;
    private String stockLevel;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private String sort = "sales_desc";
}
