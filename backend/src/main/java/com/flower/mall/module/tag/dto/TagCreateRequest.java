package com.flower.mall.module.tag.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TagCreateRequest {

    @NotBlank(message = "标签类型不能为空")
    @Pattern(regexp = "OCCASION|FESTIVAL|MEANING", message = "标签类型不合法")
    private String type;

    @NotBlank(message = "标签名称不能为空")
    @Size(max = 30, message = "标签名称不能超过30个字符")
    private String name;
}
