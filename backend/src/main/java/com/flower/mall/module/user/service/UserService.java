package com.flower.mall.module.user.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.enums.UserStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.user.dto.AdminUserCreateRequest;
import com.flower.mall.module.user.dto.AdminUserUpdateRequest;
import com.flower.mall.module.user.dto.ChangePasswordRequest;
import com.flower.mall.module.user.dto.UpdateProfileRequest;
import com.flower.mall.module.user.dto.UserVO;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public IPage<User> page(long page, long size, String keyword, String role, String status) {
        return userMapper.selectPage(new Page<>(page, size), Wrappers.<User>lambdaQuery()
                .and(StringUtils.hasText(keyword), wrapper -> wrapper
                        .like(User::getUsername, keyword)
                        .or().like(User::getNickname, keyword)
                        .or().like(User::getPhone, keyword))
                .eq(StringUtils.hasText(role), User::getRole, role)
                .eq(StringUtils.hasText(status), User::getStatus, status)
                .orderByDesc(User::getId));
    }

    public User getRequired(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw BusinessException.of(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    public UserVO currentProfile() {
        return UserVO.from(getRequired(SecurityUtils.currentUserId()));
    }

    @Transactional
    public UserVO create(AdminUserCreateRequest request) {
        Long count = userMapper.selectCount(Wrappers.<User>lambdaQuery()
                .eq(User::getUsername, request.getUsername()));
        if (count > 0) {
            throw BusinessException.of(ErrorCode.USERNAME_EXISTS);
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(StringUtils.hasText(request.getNickname()) ? request.getNickname() : request.getUsername());
        user.setPhone(blankToNull(request.getPhone()));
        user.setEmail(blankToNull(request.getEmail()));
        user.setRole(UserRole.valueOf(request.getRole()).name());
        user.setStatus(UserStatus.ENABLED.name());
        userMapper.insert(user);
        return UserVO.from(userMapper.selectById(user.getId()));
    }

    @Transactional
    public UserVO update(Long userId, AdminUserUpdateRequest request) {
        User user = getRequired(userId);
        if (request.getNickname() != null) {
            user.setNickname(request.getNickname());
        }
        if (request.getPhone() != null) {
            user.setPhone(blankToNull(request.getPhone()));
        }
        if (request.getEmail() != null) {
            user.setEmail(blankToNull(request.getEmail()));
        }
        if (StringUtils.hasText(request.getRole())) {
            user.setRole(UserRole.valueOf(request.getRole()).name());
        }
        if (StringUtils.hasText(request.getStatus())) {
            if (UserStatus.DISABLED.name().equals(request.getStatus())
                    && userId.equals(SecurityUtils.currentUserId())) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "不能禁用当前登录账号");
            }
            user.setStatus(UserStatus.valueOf(request.getStatus()).name());
        }
        userMapper.updateById(user);
        return UserVO.from(userMapper.selectById(userId));
    }

    @Transactional
    public void resetPassword(Long userId, String newPassword) {
        getRequired(userId);
        User update = new User();
        update.setId(userId);
        update.setPassword(passwordEncoder.encode(newPassword));
        userMapper.updateById(update);
    }

    @Transactional
    public UserVO updateProfile(UpdateProfileRequest request) {
        Long userId = SecurityUtils.currentUserId();
        User user = getRequired(userId);
        if (request.getNickname() != null) {
            user.setNickname(request.getNickname());
        }
        if (request.getPhone() != null) {
            user.setPhone(blankToNull(request.getPhone()));
        }
        if (request.getEmail() != null) {
            user.setEmail(blankToNull(request.getEmail()));
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(StringUtils.hasText(request.getAvatarUrl())
                    ? request.getAvatarUrl().trim()
                    : "");
        }
        userMapper.updateById(user);
        return UserVO.from(userMapper.selectById(userId));
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = getRequired(SecurityUtils.currentUserId());
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw BusinessException.of(ErrorCode.PASSWORD_INCORRECT);
        }
        User update = new User();
        update.setId(user.getId());
        update.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(update);
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value : null;
    }
}
