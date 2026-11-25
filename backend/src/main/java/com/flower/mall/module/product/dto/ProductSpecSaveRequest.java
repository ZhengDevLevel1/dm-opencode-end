package com.flower.mall.module.product.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductSpecSaveRequest {

    private Long id;

    @NotBlank(message = "规格名称不能为空")
    @Size(max = 60, message = "规格名称不能超过60个字符")
    private String name;

    @Size(max = 200, message = "规格说明不能超过200个字符")
    private String description;

    @DecimalMin(value = "0.01", message = "规格价格必须大于0")
    private BigDecimal price;

    @DecimalMin(value = "0.01", message = "规格划线价必须大于0")
    private BigDecimal originalPrice;

    @Min(value = 0, message = "排序不能小于0")
    private Integer sortOrder;

    @Min(value = 0, message = "启用状态不合法")
    @Max(value = 1, message = "启用状态不合法")
    private Integer enabled;

    @Size(max = 20, message = "单个规格最多选择20种花材")
    @Valid
    private List<ProductSpecFlowerSaveRequest> flowers;
}
