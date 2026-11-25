package com.flower.mall.module.catalog.dto;

import com.flower.mall.module.catalog.entity.WrapColor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WrapColorVO {

    private Long id;
    private String name;
    private String hex;
    private String ringHex;
    private String description;
    private boolean enabled;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WrapColorVO from(WrapColor color) {
        return WrapColorVO.builder()
                .id(color.getId())
                .name(color.getName())
                .hex(color.getHex())
                .ringHex(color.getRingHex())
                .description(color.getDescription())
                .enabled(color.getEnabled() != null && color.getEnabled() == 1)
                .sortOrder(color.getSortOrder())
                .createdAt(color.getCreatedAt())
                .updatedAt(color.getUpdatedAt())
                .build();
    }
}
