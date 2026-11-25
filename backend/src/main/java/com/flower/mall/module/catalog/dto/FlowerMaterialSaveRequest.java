package com.flower.mall.module.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FlowerMaterialSaveRequest {

    @NotBlank(message = "花材名称不能为空")
    @Size(max = 50, message = "花材名称不能超过50个字符")
    private String name;

    @Size(max = 80, message = "拉丁学名不能超过80个字符")
    private String latinName;

    @Size(max = 200, message = "花材说明不能超过200个字符")
    private String note;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "代表色需为 #RRGGBB 格式")
    private String colorHex;

    @Size(max = 500, message = "花材图片地址不能超过500个字符")
    private String imageUrl;

    @Min(value = 0, message = "启用状态不合法")
    @Max(value = 1, message = "启用状态不合法")
    private Integer enabled;

    @Min(value = 0, message = "排序不能小于0")
    private Integer sortOrder;
}
