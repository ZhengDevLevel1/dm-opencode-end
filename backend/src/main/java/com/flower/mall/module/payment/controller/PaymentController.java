package com.flower.mall.module.payment.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.payment.dto.PaymentVO;
import com.flower.mall.module.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "模拟支付")
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "发起支付（获取或创建支付单）")
    @PostMapping("/orders/{orderId}")
    @OperationLogRecord(module = "支付", operation = "发起模拟支付")
    public ApiResponse<PaymentVO> create(@PathVariable Long orderId) {
        return ApiResponse.ok(paymentService.createOrGet(orderId));
    }

    @Operation(summary = "模拟支付回调成功")
    @PostMapping("/{paymentNo}/mock-callback")
    @OperationLogRecord(module = "支付", operation = "模拟支付回调")
    public ApiResponse<PaymentVO> mockCallback(@PathVariable String paymentNo) {
        return ApiResponse.ok(paymentService.mockCallback(paymentNo));
    }

    @Operation(summary = "查询订单最新支付记录")
    @GetMapping("/orders/{orderId}")
    public ApiResponse<PaymentVO> latest(@PathVariable Long orderId) {
        return ApiResponse.ok(paymentService.latestByOrder(orderId));
    }
}
