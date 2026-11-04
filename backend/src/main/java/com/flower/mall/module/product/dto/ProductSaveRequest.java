package com.flower.mall.module.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductSaveRequest {

    @NotBlank(message = "商品名称不能为空")
    @Size(max = 100, message = "商品名称不能超过100个字符")
    private String name;

    @NotBlank(message = "商品品类不能为空")
    @Size(max = 30, message = "商品品类不能超过30个字符")
    private String category;

    @Size(max = 200, message = "花语不能超过200个字符")
    private String flowerMeaning;

    @Size(max = 200, message = "场景标签不能超过200个字符")
    private String occasionTags;

    @Size(max = 200, message = "节日标签不能超过200个字符")
    private String festivalTags;

    @NotNull(message = "价格不能为空")
    @DecimalMin(value = "0.01", message = "价格必须大于0")
    private BigDecimal price;

    @DecimalMin(value = "0.01", message = "原价必须大于0")
    private BigDecimal originalPrice;

    @NotNull(message = "库存不能为空")
    @Min(value = 0, message = "库存不能小于0")
    private Integer stock;

    @Size(max = 500, message = "图片地址不能超过500个字符")
    private String imageUrl;

    @Size(max = 2000, message = "商品描述不能超过2000个字符")
    private String description;

    @NotBlank(message = "季节适用性不能为空")
    @Pattern(regexp = "SPRING|SUMMER|AUTUMN|WINTER|ALL", message = "季节适用性不合法")
    private String seasonSuitability;

    @Pattern(regexp = "ON_SALE|OFF_SHELF", message = "商品状态不合法")
    private String status;
}
