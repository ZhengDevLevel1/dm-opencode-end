package com.flower.mall.module.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateOrderRequest {

    private List<Long> cartItemIds;

    @NotBlank(message = "收货人不能为空")
    @Size(max = 50, message = "收货人姓名不能超过50个字符")
    private String receiverName;

    @NotBlank(message = "联系电话不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "联系电话格式不正确")
    private String receiverPhone;

    @NotBlank(message = "收货地址不能为空")
    @Size(max = 255, message = "收货地址不能超过255个字符")
    private String receiverAddress;

    @Size(max = 255, message = "订单备注不能超过255个字符")
    private String remark;
}
