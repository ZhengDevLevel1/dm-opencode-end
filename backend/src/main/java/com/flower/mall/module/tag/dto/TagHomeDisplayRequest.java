package com.flower.mall.module.tag.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.List;

@Data
public class TagHomeDisplayRequest {

    @NotBlank(message = "标签类型不能为空")
    @Pattern(regexp = "CATEGORY|OCCASION", message = "该标签类型不支持首页展示配置")
    private String type;

    @NotEmpty(message = "首页展示配置不能为空")
    @Valid
    private List<Item> items;

    @Data
    public static class Item {

        @NotNull(message = "标签 ID 不能为空")
        private Long id;

        @NotNull(message = "展示状态不能为空")
        private Boolean visible;
    }
}
