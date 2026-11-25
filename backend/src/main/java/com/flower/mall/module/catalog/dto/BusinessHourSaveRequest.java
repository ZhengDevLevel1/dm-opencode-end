package com.flower.mall.module.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BusinessHourSaveRequest {

    @NotNull(message = "星期不能为空")
    @Min(value = 1, message = "星期不合法")
    @Max(value = 7, message = "星期不合法")
    private Integer dayOfWeek;

    @NotNull(message = "开门时间不能为空")
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$", message = "开门时间格式不正确")
    private String openTime;

    @NotNull(message = "关门时间不能为空")
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$", message = "关门时间格式不正确")
    private String closeTime;

    @Min(value = 0, message = "启用状态不合法")
    @Max(value = 1, message = "启用状态不合法")
    private Integer enabled;

    @Size(max = 100, message = "备注不能超过100个字符")
    private String note;
}
