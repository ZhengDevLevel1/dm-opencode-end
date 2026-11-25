package com.flower.mall.module.order.dto;

import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.module.order.entity.Order;
import com.flower.mall.module.order.entity.OrderItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderVO {

    private Long id;
    private String orderNo;
    private Long userId;
    private String buyerUsername;
    private String buyerNickname;
    private BigDecimal totalAmount;
    private BigDecimal payAmount;
    private String status;
    private String statusLabel;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private BigDecimal receiverLongitude;
    private BigDecimal receiverLatitude;
    private String remark;
    private String greetingCard;
    private LocalDateTime deliveryAt;
    private String cancelReason;
    private String afterSaleReason;
    private LocalDateTime paidAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private List<OrderItemVO> items;

    public static OrderVO from(Order order, List<OrderItem> items) {
        OrderStatus status = OrderStatus.valueOf(order.getStatus());
        return OrderVO.builder()
                .id(order.getId())
                .orderNo(order.getOrderNo())
                .userId(order.getUserId())
                .totalAmount(order.getTotalAmount())
                .payAmount(order.getPayAmount())
                .status(status.name())
                .statusLabel(status.getLabel())
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .receiverAddress(order.getReceiverAddress())
                .receiverLongitude(order.getReceiverLongitude())
                .receiverLatitude(order.getReceiverLatitude())
                .remark(order.getRemark())
                .greetingCard(order.getGreetingCard())
                .deliveryAt(order.getDeliveryAt())
                .cancelReason(order.getCancelReason())
                .afterSaleReason(order.getAfterSaleReason())
                .paidAt(order.getPaidAt())
                .completedAt(order.getCompletedAt())
                .createdAt(order.getCreatedAt())
                .items(items == null ? List.of() : items.stream().map(OrderItemVO::from).toList())
                .build();
    }
}
