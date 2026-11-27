package com.flower.mall.module.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StoreProfileRequest {

    @NotBlank(message = "请输入营业电话")
    @Size(max = 30, message = "营业电话不能超过30个字符")
    @Pattern(regexp = "^[0-9+()\\-\\s]{5,30}$", message = "营业电话格式不正确")
    private String businessPhone;
}
