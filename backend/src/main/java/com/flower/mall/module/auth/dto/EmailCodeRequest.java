package com.flower.mall.module.auth.dto;

import com.flower.mall.common.enums.EmailCodeScene;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class EmailCodeRequest {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotNull(message = "验证码用途不能为空")
    private EmailCodeScene scene;
}
