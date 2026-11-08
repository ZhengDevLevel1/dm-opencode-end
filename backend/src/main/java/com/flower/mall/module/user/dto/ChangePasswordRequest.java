package com.flower.mall.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    /** 原密码；与邮箱验证码二选一。 */
    private String oldPassword;

    /** 发送到当前账号绑定邮箱的验证码；与原密码二选一。 */
    @Pattern(regexp = "^\\d{6}$", message = "验证码需为6位数字")
    private String emailCode;

    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 32, message = "新密码长度需在6-32个字符之间")
    private String newPassword;
}
