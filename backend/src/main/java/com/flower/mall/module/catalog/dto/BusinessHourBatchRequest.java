package com.flower.mall.module.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BusinessHourBatchRequest {

    @NotEmpty(message = "营业时间不能为空")
    @Size(max = 7, message = "最多配置7天营业时间")
    @Valid
    private List<BusinessHourSaveRequest> hours;
}
