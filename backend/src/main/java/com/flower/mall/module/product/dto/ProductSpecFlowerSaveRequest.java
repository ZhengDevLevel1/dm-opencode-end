package com.flower.mall.module.product.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductSpecFlowerSaveRequest {

    @NotNull(message = "花材ID不能为空")
    private Long materialId;

    @NotNull(message = "花材数量不能为空")
    @Min(value = 1, message = "花材数量必须大于0")
    @Max(value = 999, message = "单种花材数量不能超过999")
    private Integer quantity;
}
