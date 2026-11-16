package com.flower.mall.module.address.dto;

import com.flower.mall.module.address.entity.UserAddress;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressVO {

    private Long id;
    private String receiverName;
    private String receiverPhone;
    private String label;
    private String province;
    private String city;
    private String district;
    private String detailAddress;
    private String formattedAddress;
    private String fullAddress;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private Boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AddressVO from(UserAddress address) {
        return AddressVO.builder()
                .id(address.getId())
                .receiverName(address.getReceiverName())
                .receiverPhone(address.getReceiverPhone())
                .label(address.getLabel())
                .province(address.getProvince())
                .city(address.getCity())
                .district(address.getDistrict())
                .detailAddress(address.getDetailAddress())
                .formattedAddress(address.getFormattedAddress())
                .fullAddress(buildFullAddress(address))
                .longitude(address.getLongitude())
                .latitude(address.getLatitude())
                .isDefault(Integer.valueOf(1).equals(address.getIsDefault()))
                .createdAt(address.getCreatedAt())
                .updatedAt(address.getUpdatedAt())
                .build();
    }

    private static String buildFullAddress(UserAddress address) {
        String formatted = trim(address.getFormattedAddress());
        String detail = trim(address.getDetailAddress());
        String province = trim(address.getProvince());
        String city = trim(address.getCity());
        String district = trim(address.getDistrict());
        StringBuilder regionBuilder = new StringBuilder(province);
        if (!city.isEmpty() && !city.equals(province)) {
            regionBuilder.append(city);
        }
        regionBuilder.append(district);
        String region = regionBuilder.toString();
        if (!region.isEmpty()) {
            return detail.isEmpty() ? region : region + detail;
        }
        if (!formatted.isEmpty()) {
            if (detail.isEmpty() || formatted.contains(detail)) {
                return formatted;
            }
            return formatted + " " + detail;
        }
        return detail;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
