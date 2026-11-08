package com.flower.mall.module.tag.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class TagMaxCountRequest {

    @NotBlank(message = "标签类型不能为空")
    @Pattern(regexp = "OCCASION|FESTIVAL|MEANING", message = "标签类型不合法")
    private String type;

    @NotNull(message = "最大标签数不能为空")
    @Min(value = 1, message = "最大标签数不能小于1")
    @Max(value = 30, message = "最大标签数不能大于30")
    private Integer maxCount;
}
