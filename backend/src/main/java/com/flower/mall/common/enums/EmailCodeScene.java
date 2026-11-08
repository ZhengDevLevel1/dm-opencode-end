package com.flower.mall.common.enums;

/**
 * 邮箱验证码使用场景，不同场景的验证码互不通用。
 */
public enum EmailCodeScene {
    LOGIN,
    REGISTER,
    CHANGE_PASSWORD,
    CHANGE_EMAIL
}
