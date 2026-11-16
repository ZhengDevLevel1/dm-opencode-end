package com.flower.mall.module.address.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AddressSaveRequest {

    @NotBlank(message = "收货人不能为空")
    @Size(max = 50, message = "收货人姓名不能超过50个字符")
    private String receiverName;

    @NotBlank(message = "联系电话不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "联系电话格式不正确")
    private String receiverPhone;

    @Size(max = 10, message = "地址标签不能超过10个字符")
    private String label;

    @Size(max = 30, message = "省份不能超过30个字符")
    private String province;

    @Size(max = 30, message = "城市不能超过30个字符")
    private String city;

    @Size(max = 30, message = "区县不能超过30个字符")
    private String district;

    @NotBlank(message = "详细地址不能为空")
    @Size(max = 100, message = "详细地址不能超过100个字符")
    private String detailAddress;

    @Size(max = 150, message = "地图地址不能超过150个字符")
    private String formattedAddress;

    @DecimalMin(value = "-180.0", message = "经度不合法")
    @DecimalMax(value = "180.0", message = "经度不合法")
    private BigDecimal longitude;

    @DecimalMin(value = "-90.0", message = "纬度不合法")
    @DecimalMax(value = "90.0", message = "纬度不合法")
    private BigDecimal latitude;

    private Boolean isDefault;
}
