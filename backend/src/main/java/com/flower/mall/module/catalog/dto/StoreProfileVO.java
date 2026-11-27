package com.flower.mall.module.catalog.dto;

import com.flower.mall.module.catalog.entity.StoreProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreProfileVO {

    private String businessPhone;

    public static StoreProfileVO from(StoreProfile profile, String defaultPhone) {
        return StoreProfileVO.builder()
                .businessPhone(profile == null || profile.getBusinessPhone() == null
                        ? defaultPhone
                        : profile.getBusinessPhone())
                .build();
    }
}
