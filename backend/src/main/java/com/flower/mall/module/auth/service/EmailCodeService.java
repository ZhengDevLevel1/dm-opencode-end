package com.flower.mall.module.auth.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.EmailCodeScene;
import com.flower.mall.common.enums.UserStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 邮箱验证码：负责验证码的生成、发送、校验与过期清理。
 * 验证码保存在本机内存中，有效期 5 分钟，同一邮箱同一场景 60 秒内只能发送一次。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailCodeService {

    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration SEND_INTERVAL = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;
    private final UserMapper userMapper;

    @Value("${spring.mail.username:}")
    private String from;

    private final Map<String, CodeEntry> codes = new ConcurrentHashMap<>();

    /**
     * 发送验证码。注册与更换邮箱场景要求邮箱未注册，登录与修改密码场景要求邮箱已注册且账号未禁用。
     */
    public void sendCode(String email, EmailCodeScene scene) {
        String normalized = normalize(email);
        assertSceneAllowed(normalized, scene);

        String key = cacheKey(normalized, scene);
        Instant now = Instant.now();
        CodeEntry existing = codes.get(key);
        if (existing != null && Duration.between(existing.sentAt(), now).compareTo(SEND_INTERVAL) < 0) {
            throw BusinessException.of(ErrorCode.EMAIL_CODE_TOO_FREQUENT);
        }

        String code = generateCode();
        sendMail(normalized, scene, code);
        codes.put(key, new CodeEntry(code, now.plus(CODE_TTL), now));
        cleanupExpired(now);
        log.info("邮箱验证码已发送: email={}, scene={}", normalized, scene);
    }

    /**
     * 校验并消费验证码；校验失败累计 5 次后验证码失效。
     */
    public void verifyAndConsume(String email, EmailCodeScene scene, String code) {
        String key = cacheKey(normalize(email), scene);
        CodeEntry entry = codes.get(key);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            codes.remove(key);
            throw BusinessException.of(ErrorCode.EMAIL_CODE_INVALID);
        }
        if (!entry.code().equals(code == null ? "" : code.trim())) {
            int failures = entry.failures() + 1;
            if (failures >= MAX_ATTEMPTS) {
                codes.remove(key);
            } else {
                codes.put(key, new CodeEntry(entry.code(), entry.expiresAt(), entry.sentAt(), failures));
            }
            throw BusinessException.of(ErrorCode.EMAIL_CODE_INVALID);
        }
        codes.remove(key);
    }

    /**
     * 按邮箱查找用户，邮箱匹配忽略大小写。
     */
    public User findUserByEmail(String email) {
        String normalized = normalize(email);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        return userMapper.selectOne(Wrappers.<User>lambdaQuery()
                .eq(User::getEmail, normalized)
                .orderByAsc(User::getId)
                .last("LIMIT 1"));
    }

    private void assertSceneAllowed(String email, EmailCodeScene scene) {
        User user = findUserByEmail(email);
        if (scene == EmailCodeScene.REGISTER || scene == EmailCodeScene.CHANGE_EMAIL) {
            if (user != null) {
                throw BusinessException.of(ErrorCode.EMAIL_ALREADY_REGISTERED);
            }
            return;
        }
        if (user == null) {
            throw BusinessException.of(ErrorCode.EMAIL_NOT_REGISTERED);
        }
        if (!UserStatus.ENABLED.name().equals(user.getStatus())) {
            throw BusinessException.of(ErrorCode.USER_DISABLED);
        }
    }

    /**
     * 生成 6 位数字验证码，子类或测试可覆写。
     */
    protected String generateCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    private void sendMail(String email, EmailCodeScene scene, String code) {
        String action = sceneAction(scene);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, false, StandardCharsets.UTF_8.name());
            if (StringUtils.hasText(from)) {
                helper.setFrom(from);
            }
            helper.setTo(email);
            helper.setSubject("花屿 Bloom Isle " + action + "验证码");
            helper.setText(buildHtml(code, action), true);
            mailSender.send(message);
        } catch (Exception exception) {
            log.error("验证码邮件发送失败: email={}, scene={}", email, scene, exception);
            throw BusinessException.of(ErrorCode.MAIL_SEND_FAILED);
        }
    }

    private String buildHtml(String code, String action) {
        return """
                <div style="margin:0;padding:32px 16px;background:#f7f3f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#3d2f2c;">
                  <div style="max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #eadedb;border-radius:16px;">
                    <p style="margin:0;font-size:12px;letter-spacing:2px;color:#b06a72;">花屿 BLOOM ISLE</p>
                    <h1 style="margin:12px 0 0;font-size:20px;font-weight:600;">%s验证码</h1>
                    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#6b5b57;">你正在%s花屿 Bloom Isle 账号，请在 5 分钟内输入以下验证码完成验证：</p>
                    <div style="margin:24px 0;padding:16px;background:#faf3f2;border-radius:12px;text-align:center;font-size:30px;font-weight:600;letter-spacing:8px;color:#b04a56;">%s</div>
                    <p style="margin:0;font-size:12px;line-height:1.7;color:#8a7a76;">验证码 5 分钟内有效，请勿转发给他人。如非本人操作，请忽略本邮件，你的账号不会受到影响。</p>
                  </div>
                  <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:11px;color:#a39692;">此邮件由系统自动发送，请勿直接回复。</p>
                </div>
                """.formatted(action, action, code);
    }

    private String sceneAction(EmailCodeScene scene) {
        return switch (scene) {
            case LOGIN -> "登录";
            case REGISTER -> "注册";
            case CHANGE_PASSWORD -> "修改密码";
            case CHANGE_EMAIL -> "更换邮箱";
        };
    }

    private void cleanupExpired(Instant now) {
        codes.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private String cacheKey(String email, EmailCodeScene scene) {
        return scene.name() + ":" + email;
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private record CodeEntry(String code, Instant expiresAt, Instant sentAt, int failures) {

        private CodeEntry(String code, Instant expiresAt, Instant sentAt) {
            this(code, expiresAt, sentAt, 0);
        }
    }
}
