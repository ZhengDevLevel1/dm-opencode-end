package com.flower.mall.module.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AfterSaleRequest {

    @NotBlank(message = "售后原因不能为空")
    @Size(max = 200, message = "售后原因不能超过200个字符")
    private String reason;
}
