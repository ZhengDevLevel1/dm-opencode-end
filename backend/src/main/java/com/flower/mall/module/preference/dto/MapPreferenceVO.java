package com.flower.mall.module.preference.dto;

import com.flower.mall.module.preference.entity.UserThemePreference;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MapPreferenceVO {

    private boolean snapToLandmark;

    public static MapPreferenceVO from(UserThemePreference entity) {
        return MapPreferenceVO.builder()
                .snapToLandmark(entity != null && Boolean.TRUE.equals(entity.getMapSnapToLandmark()))
                .build();
    }
}
