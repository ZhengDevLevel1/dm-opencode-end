package com.flower.mall.module.user.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.user.dto.AdminUserCreateRequest;
import com.flower.mall.module.user.dto.AdminUserUpdateRequest;
import com.flower.mall.module.user.dto.ResetPasswordRequest;
import com.flower.mall.module.user.dto.UserVO;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "管理员-用户管理")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "分页查询用户")
    @GetMapping
    public ApiResponse<PageResult<UserVO>> page(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(PageResult.of(userService.page(page, size, keyword, role, status), UserVO::from));
    }

    @Operation(summary = "查询用户详情")
    @GetMapping("/{id}")
    public ApiResponse<UserVO> detail(@PathVariable Long id) {
        return ApiResponse.ok(UserVO.from(userService.getRequired(id)));
    }

    @Operation(summary = "创建店员或管理员账号")
    @PostMapping
    @OperationLogRecord(module = "用户管理", operation = "创建用户", saveParams = false)
    public ApiResponse<UserVO> create(@Valid @RequestBody AdminUserCreateRequest request) {
        return ApiResponse.ok(userService.create(request));
    }

    @Operation(summary = "更新用户信息与角色")
    @PutMapping("/{id}")
    @OperationLogRecord(module = "用户管理", operation = "更新用户")
    public ApiResponse<UserVO> update(@PathVariable Long id,
                                      @Valid @RequestBody AdminUserUpdateRequest request) {
        return ApiResponse.ok(userService.update(id, request));
    }

    @Operation(summary = "重置用户密码")
    @PutMapping("/{id}/password")
    @OperationLogRecord(module = "用户管理", operation = "重置密码", saveParams = false)
    public ApiResponse<Void> resetPassword(@PathVariable Long id,
                                           @Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(id, request.getNewPassword());
        return ApiResponse.ok();
    }
}
