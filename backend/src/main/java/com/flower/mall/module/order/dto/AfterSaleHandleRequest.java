package com.flower.mall.module.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AfterSaleHandleRequest {

    @NotNull(message = "处理结果不能为空")
    private Boolean approved;

    @Size(max = 200, message = "处理备注不能超过200个字符")
    private String remark;
}
