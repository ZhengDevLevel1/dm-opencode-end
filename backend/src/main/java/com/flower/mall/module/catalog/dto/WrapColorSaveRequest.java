package com.flower.mall.module.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WrapColorSaveRequest {

    @NotBlank(message = "包装色系名称不能为空")
    @Size(max = 50, message = "包装色系名称不能超过50个字符")
    private String name;

    @NotBlank(message = "主色值不能为空")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "主色值需为 #RRGGBB 格式")
    private String hex;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "描边色值需为 #RRGGBB 格式")
    private String ringHex;

    @Size(max = 200, message = "包装说明不能超过200个字符")
    private String description;

    @Min(value = 0, message = "启用状态不合法")
    @Max(value = 1, message = "启用状态不合法")
    private Integer enabled;

    @Min(value = 0, message = "排序不能小于0")
    private Integer sortOrder;
}
