package com.flower.mall.module.auth.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.auth.dto.EmailCodeLoginRequest;
import com.flower.mall.module.auth.dto.EmailCodeRequest;
import com.flower.mall.module.auth.service.AuthService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.user.dto.ChangePasswordRequest;
import com.flower.mall.module.user.dto.LoginRequest;
import com.flower.mall.module.user.dto.LoginResponse;
import com.flower.mall.module.user.dto.RegisterRequest;
import com.flower.mall.module.user.dto.UpdateProfileRequest;
import com.flower.mall.module.user.dto.UserVO;
import com.flower.mall.module.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "认证与个人中心")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @Operation(summary = "发送邮箱验证码")
    @PostMapping("/email-code")
    @OperationLogRecord(module = "认证", operation = "发送邮箱验证码", saveParams = false)
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody EmailCodeRequest request) {
        authService.sendEmailCode(request);
        return ApiResponse.ok();
    }

    @Operation(summary = "会员注册")
    @PostMapping("/register")
    public ApiResponse<UserVO> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.register(request));
    }

    @Operation(summary = "用户登录")
    @PostMapping("/login")
    @OperationLogRecord(module = "认证", operation = "用户登录", saveParams = false)
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @Operation(summary = "邮箱验证码登录")
    @PostMapping("/login/email")
    @OperationLogRecord(module = "认证", operation = "邮箱验证码登录", saveParams = false)
    public ApiResponse<LoginResponse> loginByEmail(@Valid @RequestBody EmailCodeLoginRequest request) {
        return ApiResponse.ok(authService.loginByEmail(request));
    }

    @Operation(summary = "退出登录")
    @PostMapping("/logout")
    @OperationLogRecord(module = "认证", operation = "退出登录", saveParams = false)
    public ApiResponse<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authService.logout(authorization);
        return ApiResponse.ok();
    }

    @Operation(summary = "获取当前用户信息")
    @GetMapping("/me")
    public ApiResponse<UserVO> me() {
        return ApiResponse.ok(userService.currentProfile());
    }

    @Operation(summary = "修改个人资料")
    @PutMapping("/me")
    @OperationLogRecord(module = "用户", operation = "修改个人资料")
    public ApiResponse<UserVO> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(userService.updateProfile(request));
    }

    @Operation(summary = "修改密码")
    @PutMapping("/password")
    @OperationLogRecord(module = "用户", operation = "修改密码", saveParams = false)
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
        return ApiResponse.ok();
    }
}
