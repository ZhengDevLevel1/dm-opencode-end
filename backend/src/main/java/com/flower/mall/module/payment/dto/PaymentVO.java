package com.flower.mall.module.payment.dto;

import com.flower.mall.common.enums.PaymentStatus;
import com.flower.mall.module.payment.entity.PaymentRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentVO {

    private Long id;
    private String paymentNo;
    private Long orderId;
    private String orderNo;
    private BigDecimal amount;
    private String channel;
    private String status;
    private String statusLabel;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;

    public static PaymentVO from(PaymentRecord record) {
        PaymentStatus status = PaymentStatus.valueOf(record.getStatus());
        return PaymentVO.builder()
                .id(record.getId())
                .paymentNo(record.getPaymentNo())
                .orderId(record.getOrderId())
                .orderNo(record.getOrderNo())
                .amount(record.getAmount())
                .channel(record.getChannel())
                .status(status.name())
                .statusLabel(status.getLabel())
                .paidAt(record.getPaidAt())
                .createdAt(record.getCreatedAt())
                .build();
    }
}
