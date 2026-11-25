package com.flower.mall.module.catalog.dto;

import com.flower.mall.module.catalog.entity.FlowerMaterial;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlowerMaterialVO {

    private Long id;
    private String name;
    private String latinName;
    private String note;
    private String colorHex;
    private String imageUrl;
    private boolean enabled;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FlowerMaterialVO from(FlowerMaterial material) {
        return FlowerMaterialVO.builder()
                .id(material.getId())
                .name(material.getName())
                .latinName(material.getLatinName())
                .note(material.getNote())
                .colorHex(material.getColorHex())
                .imageUrl(material.getImageUrl())
                .enabled(material.getEnabled() != null && material.getEnabled() == 1)
                .sortOrder(material.getSortOrder())
                .createdAt(material.getCreatedAt())
                .updatedAt(material.getUpdatedAt())
                .build();
    }
}
