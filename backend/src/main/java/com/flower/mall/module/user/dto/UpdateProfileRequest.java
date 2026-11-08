package com.flower.mall.module.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(max = 30, message = "昵称长度不能超过30个字符")
    private String nickname;

    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @Email(message = "邮箱格式不正确")
    private String email;

    /** 修改为新邮箱时必填，验证码发送到新邮箱。 */
    @Pattern(regexp = "^\\d{6}$", message = "验证码需为6位数字")
    private String emailCode;

    @Size(max = 500, message = "头像地址长度不能超过500个字符")
    private String avatarUrl;
}
