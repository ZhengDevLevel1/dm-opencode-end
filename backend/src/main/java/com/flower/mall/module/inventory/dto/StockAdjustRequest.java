package com.flower.mall.module.inventory.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StockAdjustRequest {

    @NotNull(message = "调整数量不能为空")
    private Integer delta;

    @Size(max = 200, message = "备注不能超过200个字符")
    private String remark;
}
