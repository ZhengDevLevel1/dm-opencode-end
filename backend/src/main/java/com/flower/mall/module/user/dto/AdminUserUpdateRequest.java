package com.flower.mall.module.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminUserUpdateRequest {

    @Size(max = 30, message = "昵称长度不能超过30个字符")
    private String nickname;

    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Pattern(regexp = "CUSTOMER|STAFF|ADMIN", message = "角色不合法")
    private String role;

    @Pattern(regexp = "ENABLED|DISABLED", message = "用户状态不合法")
    private String status;
}
