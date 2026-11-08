package com.flower.mall.module.tag.dto;

import com.flower.mall.module.tag.entity.TagOption;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TagOptionVO {

    private Long id;
    private String name;

    public static TagOptionVO from(TagOption option) {
        return TagOptionVO.builder()
                .id(option.getId())
                .name(option.getName())
                .build();
    }
}
