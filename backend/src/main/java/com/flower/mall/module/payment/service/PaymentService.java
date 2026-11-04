package com.flower.mall.module.payment.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.common.enums.PaymentStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.OrderNoGenerator;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.order.entity.Order;
import com.flower.mall.module.order.entity.OrderItem;
import com.flower.mall.module.order.mapper.OrderItemMapper;
import com.flower.mall.module.order.mapper.OrderMapper;
import com.flower.mall.module.payment.dto.PaymentVO;
import com.flower.mall.module.payment.entity.PaymentRecord;
import com.flower.mall.module.payment.mapper.PaymentRecordMapper;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRecordMapper paymentRecordMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final CacheService cacheService;

    @Transactional
    public PaymentVO createOrGet(Long orderId) {
        Long userId = SecurityUtils.currentUserId();
        Order order = getOwnedOrder(orderId, userId);
        if (!OrderStatus.PENDING_PAYMENT.name().equals(order.getStatus())) {
            if (order.getStatus().equals(OrderStatus.PAID.name())) {
                throw BusinessException.of(ErrorCode.PAYMENT_DUPLICATE);
            }
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "当前订单状态不能发起支付");
        }
        PaymentRecord existing = paymentRecordMapper.selectOne(Wrappers.<PaymentRecord>lambdaQuery()
                .eq(PaymentRecord::getOrderId, orderId)
                .eq(PaymentRecord::getStatus, PaymentStatus.PENDING.name())
                .orderByDesc(PaymentRecord::getId)
                .last("LIMIT 1"));
        if (existing != null) {
            return PaymentVO.from(existing);
        }
        PaymentRecord payment = new PaymentRecord();
        payment.setPaymentNo(OrderNoGenerator.nextPaymentNo());
        payment.setOrderId(order.getId());
        payment.setOrderNo(order.getOrderNo());
        payment.setUserId(userId);
        payment.setAmount(order.getPayAmount());
        payment.setChannel("MOCK");
        payment.setStatus(PaymentStatus.PENDING.name());
        paymentRecordMapper.insert(payment);
        return PaymentVO.from(payment);
    }

    @Transactional
    public PaymentVO mockCallback(String paymentNo) {
        Long userId = SecurityUtils.currentUserId();
        PaymentRecord payment = paymentRecordMapper.selectOne(Wrappers.<PaymentRecord>lambdaQuery()
                .eq(PaymentRecord::getPaymentNo, paymentNo)
                .eq(PaymentRecord::getUserId, userId));
        if (payment == null) {
            throw BusinessException.of(ErrorCode.PAYMENT_NOT_FOUND);
        }
        if (PaymentStatus.SUCCESS.name().equals(payment.getStatus())) {
            return PaymentVO.from(payment);
        }
        if (!PaymentStatus.PENDING.name().equals(payment.getStatus())) {
            throw BusinessException.of(ErrorCode.PAYMENT_STATE_INVALID, "支付记录状态不允许回调");
        }
        Order order = orderMapper.selectById(payment.getOrderId());
        if (order == null) {
            throw BusinessException.of(ErrorCode.ORDER_NOT_FOUND);
        }
        if (!OrderStatus.PENDING_PAYMENT.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "订单状态已变化，不能完成支付");
        }
        LocalDateTime now = LocalDateTime.now();
        int paymentUpdated = paymentRecordMapper.update(null, Wrappers.<PaymentRecord>lambdaUpdate()
                .eq(PaymentRecord::getId, payment.getId())
                .eq(PaymentRecord::getStatus, PaymentStatus.PENDING.name())
                .set(PaymentRecord::getStatus, PaymentStatus.SUCCESS.name())
                .set(PaymentRecord::getPaidAt, now)
                .set(PaymentRecord::getCallbackAt, now));
        if (paymentUpdated == 0) {
            PaymentRecord latest = paymentRecordMapper.selectById(payment.getId());
            if (latest != null && PaymentStatus.SUCCESS.name().equals(latest.getStatus())) {
                return PaymentVO.from(latest);
            }
            throw BusinessException.of(ErrorCode.PAYMENT_STATE_INVALID, "支付状态已变化，请刷新后重试");
        }
        int orderUpdated = orderMapper.update(null, Wrappers.<Order>lambdaUpdate()
                .eq(Order::getId, order.getId())
                .eq(Order::getStatus, OrderStatus.PENDING_PAYMENT.name())
                .set(Order::getStatus, OrderStatus.PAID.name())
                .set(Order::getPaidAt, now)
                .set(Order::getUpdatedAt, now));
        if (orderUpdated == 0) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "订单状态已变化，不能完成支付");
        }
        List<OrderItem> items = orderItemMapper.selectList(Wrappers.<OrderItem>lambdaQuery()
                .eq(OrderItem::getOrderId, order.getId()));
        for (OrderItem item : items) {
            productMapper.increaseSales(item.getProductId(), item.getQuantity());
            cacheService.evict(CacheKeys.productDetail(item.getProductId()));
        }
        cacheService.evict(CacheKeys.HOT_PRODUCTS);
        return PaymentVO.from(paymentRecordMapper.selectById(payment.getId()));
    }

    public PaymentVO latestByOrder(Long orderId) {
        Long userId = SecurityUtils.currentUserId();
        getOwnedOrder(orderId, userId);
        PaymentRecord payment = paymentRecordMapper.selectOne(Wrappers.<PaymentRecord>lambdaQuery()
                .eq(PaymentRecord::getOrderId, orderId)
                .orderByDesc(PaymentRecord::getId)
                .last("LIMIT 1"));
        return payment == null ? null : PaymentVO.from(payment);
    }

    private Order getOwnedOrder(Long orderId, Long userId) {
        Order order = orderMapper.selectOne(Wrappers.<Order>lambdaQuery()
                .eq(Order::getId, orderId)
                .eq(Order::getUserId, userId));
        if (order == null) {
            throw BusinessException.of(ErrorCode.ORDER_NOT_FOUND);
        }
        return order;
    }
}
