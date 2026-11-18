package com.flower.mall.module.preference.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MapPreferenceRequest {

    @NotNull(message = "自动跳转地标设置不能为空")
    private Boolean snapToLandmark;
}
