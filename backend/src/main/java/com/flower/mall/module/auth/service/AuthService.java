package com.flower.mall.module.auth.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.EmailCodeScene;
import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.enums.UserStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.auth.dto.EmailCodeLoginRequest;
import com.flower.mall.module.auth.dto.EmailCodeRequest;
import com.flower.mall.module.user.dto.LoginRequest;
import com.flower.mall.module.user.dto.LoginResponse;
import com.flower.mall.module.user.dto.RegisterRequest;
import com.flower.mall.module.user.dto.UserVO;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import com.flower.mall.security.AuthUser;
import com.flower.mall.security.JwtService;
import com.flower.mall.security.TokenStore;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenStore tokenStore;
    private final EmailCodeService emailCodeService;

    @Transactional
    public UserVO register(RegisterRequest request) {
        Long count = userMapper.selectCount(Wrappers.<User>lambdaQuery()
                .eq(User::getUsername, request.getUsername()));
        if (count > 0) {
            throw BusinessException.of(ErrorCode.USERNAME_EXISTS);
        }
        String email = normalizeEmail(request.getEmail());
        Long emailCount = userMapper.selectCount(Wrappers.<User>lambdaQuery()
                .eq(User::getEmail, email));
        if (emailCount > 0) {
            throw BusinessException.of(ErrorCode.EMAIL_ALREADY_REGISTERED);
        }
        emailCodeService.verifyAndConsume(email, EmailCodeScene.REGISTER, request.getEmailCode());

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(StringUtils.hasText(request.getNickname()) ? request.getNickname() : request.getUsername());
        user.setPhone(blankToNull(request.getPhone()));
        user.setEmail(email);
        user.setRole(UserRole.CUSTOMER.name());
        user.setStatus(UserStatus.ENABLED.name());
        userMapper.insert(user);
        return UserVO.from(userMapper.selectById(user.getId()));
    }

    /**
     * 发送登录或注册场景的邮箱验证码。
     */
    public void sendEmailCode(EmailCodeRequest request) {
        emailCodeService.sendCode(request.getEmail(), request.getScene());
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        } catch (DisabledException exception) {
            throw BusinessException.of(ErrorCode.USER_DISABLED);
        } catch (BadCredentialsException exception) {
            throw BusinessException.of(ErrorCode.LOGIN_FAILED);
        } catch (AuthenticationException exception) {
            throw BusinessException.of(ErrorCode.LOGIN_FAILED);
        }
        AuthUser principal = (AuthUser) authentication.getPrincipal();
        return issueToken(userMapper.selectById(principal.getId()));
    }

    /**
     * 邮箱验证码登录：校验验证码后为已注册用户签发令牌。
     */
    public LoginResponse loginByEmail(EmailCodeLoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = emailCodeService.findUserByEmail(email);
        if (user == null) {
            throw BusinessException.of(ErrorCode.EMAIL_NOT_REGISTERED);
        }
        emailCodeService.verifyAndConsume(email, EmailCodeScene.LOGIN, request.getCode());
        if (!UserStatus.ENABLED.name().equals(user.getStatus())) {
            throw BusinessException.of(ErrorCode.USER_DISABLED);
        }
        return issueToken(user);
    }

    private LoginResponse issueToken(User user) {
        JwtService.TokenInfo tokenInfo =
                jwtService.generateToken(user.getId(), user.getUsername(), UserRole.valueOf(user.getRole()));
        tokenStore.store(tokenInfo.jti(), user.getId(),
                Duration.ofSeconds(tokenInfo.expiresInSeconds()));
        return LoginResponse.builder()
                .token(tokenInfo.token())
                .tokenType("Bearer")
                .expiresIn(tokenInfo.expiresInSeconds())
                .user(UserVO.from(user))
                .build();
    }

    public void logout(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            return;
        }
        try {
            String jti = jwtService.parse(authorizationHeader.substring(7).trim()).getId();
            tokenStore.revoke(jti);
        } catch (Exception ignored) {
            // 令牌无效时无需处理会话
        }
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value : null;
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
