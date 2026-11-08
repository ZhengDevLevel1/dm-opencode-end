package com.flower.mall.common.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {

    BAD_REQUEST(400, 400, "请求参数错误"),
    UNAUTHORIZED(401, 401, "未登录或登录已过期"),
    FORBIDDEN(403, 403, "没有访问权限"),
    NOT_FOUND(404, 404, "资源不存在"),
    CONFLICT(409, 409, "请求与当前资源状态冲突"),
    INTERNAL_ERROR(500, 500, "服务器内部错误"),

    USERNAME_EXISTS(1001, 409, "用户名已存在"),
    USER_NOT_FOUND(1002, 404, "用户不存在"),
    LOGIN_FAILED(1003, 401, "用户名或密码错误"),
    USER_DISABLED(1004, 403, "账号已被禁用"),
    PASSWORD_INCORRECT(1005, 400, "原密码不正确"),
    EMAIL_CODE_INVALID(1006, 400, "验证码错误或已过期"),
    EMAIL_CODE_TOO_FREQUENT(1007, 429, "验证码发送过于频繁，请稍后再试"),
    EMAIL_NOT_REGISTERED(1008, 404, "该邮箱尚未注册"),
    EMAIL_ALREADY_REGISTERED(1009, 409, "该邮箱已被注册"),
    MAIL_SEND_FAILED(1010, 500, "验证码邮件发送失败，请稍后重试"),

    PRODUCT_NOT_FOUND(2001, 404, "商品不存在"),
    PRODUCT_OFF_SHELF(2002, 409, "商品已下架"),
    STOCK_INSUFFICIENT(2003, 409, "商品库存不足"),
    PRODUCT_STATUS_INVALID(2004, 400, "商品状态不合法"),

    CART_ITEM_NOT_FOUND(3001, 404, "购物车商品不存在"),
    CART_EMPTY(3002, 400, "购物车为空，无法创建订单"),
    CART_QUANTITY_INVALID(3003, 400, "商品数量必须大于0"),

    ORDER_NOT_FOUND(4001, 404, "订单不存在"),
    ORDER_STATE_INVALID(4002, 409, "订单状态不允许该操作"),
    ORDER_ACCESS_DENIED(4003, 403, "无权操作该订单"),
    ORDER_ITEM_NOT_FOUND(4004, 404, "订单明细不存在"),

    PAYMENT_NOT_FOUND(5001, 404, "支付记录不存在"),
    PAYMENT_STATE_INVALID(5002, 409, "支付状态不允许该操作"),
    PAYMENT_DUPLICATE(5003, 409, "订单已支付，请勿重复支付"),

    FULFILLMENT_STATE_INVALID(5501, 409, "履约状态不允许该操作"),
    FULFILLMENT_NODE_INVALID(5502, 409, "履约节点顺序不正确"),

    REVIEW_DUPLICATE(6001, 409, "该订单商品已评价"),
    REVIEW_NOT_ALLOWED(6002, 403, "当前订单状态不允许评价"),
    REVIEW_NOT_FOUND(6003, 404, "评价不存在"),

    WEIGHT_INVALID(7001, 400, "推荐权重不合法，四项权重之和必须为1"),
    RECOMMENDATION_EMPTY(7002, 200, "暂无可推荐商品"),

    FILE_UPLOAD_DISABLED(8001, 503, "图片上传服务未启用"),
    FILE_TYPE_INVALID(8002, 400, "仅支持 JPG、PNG、WEBP、GIF 格式的图片"),
    FILE_TOO_LARGE(8003, 400, "图片大小不能超过5MB"),
    FILE_UPLOAD_FAILED(8004, 500, "图片上传失败，请检查 MinIO 配置"),
    FILE_CATEGORY_INVALID(8005, 400, "图片分类不合法");

    private final int code;
    private final int status;
    private final String message;

    ErrorCode(int code, int status, String message) {
        this.code = code;
        this.status = status;
        this.message = message;
    }
}
