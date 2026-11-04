package com.flower.mall.module.fulfillment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FulfillmentRequest {

    @NotBlank(message = "履约节点不能为空")
    @Pattern(regexp = "ACCEPTED|PREPARING|DELIVERING|SIGNED", message = "履约节点不合法")
    private String node;

    @Size(max = 200, message = "备注不能超过200个字符")
    private String remark;
}
