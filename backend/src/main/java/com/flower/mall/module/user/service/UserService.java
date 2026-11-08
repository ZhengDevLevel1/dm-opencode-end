package com.flower.mall.module.user.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flower.mall.common.enums.EmailCodeScene;
import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.enums.UserStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.auth.service.EmailCodeService;
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

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final EmailCodeService emailCodeService;

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
            String nextEmail = normalizeEmail(request.getEmail());
            String currentEmail = normalizeEmail(user.getEmail());
            if (nextEmail == null) {
                user.setEmail(null);
            } else if (!nextEmail.equals(currentEmail)) {
                Long exists = userMapper.selectCount(Wrappers.<User>lambdaQuery()
                        .eq(User::getEmail, nextEmail)
                        .ne(User::getId, userId));
                if (exists > 0) {
                    throw BusinessException.of(ErrorCode.EMAIL_ALREADY_REGISTERED);
                }
                if (!StringUtils.hasText(request.getEmailCode())) {
                    throw BusinessException.of(ErrorCode.BAD_REQUEST, "修改邮箱需要验证码");
                }
                emailCodeService.verifyAndConsume(nextEmail, EmailCodeScene.CHANGE_EMAIL, request.getEmailCode());
                user.setEmail(nextEmail);
            }
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
        if (StringUtils.hasText(request.getOldPassword())) {
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
                throw BusinessException.of(ErrorCode.PASSWORD_INCORRECT);
            }
        } else if (StringUtils.hasText(request.getEmailCode())) {
            if (!StringUtils.hasText(user.getEmail())) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "当前账号未绑定邮箱，无法使用验证码修改密码");
            }
            emailCodeService.verifyAndConsume(
                    user.getEmail(), EmailCodeScene.CHANGE_PASSWORD, request.getEmailCode());
        } else {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "请提供原密码或邮箱验证码");
        }
        User update = new User();
        update.setId(user.getId());
        update.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(update);
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value : null;
    }

    private String normalizeEmail(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }
}
