package com.flower.mall.module.order.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CancelOrderRequest {

    @Size(max = 200, message = "取消原因不能超过200个字符")
    private String reason;
}
