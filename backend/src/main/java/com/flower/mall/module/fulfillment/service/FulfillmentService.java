package com.flower.mall.module.fulfillment.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.FulfillmentNode;
import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.fulfillment.dto.FulfillmentVO;
import com.flower.mall.module.fulfillment.entity.FulfillmentRecord;
import com.flower.mall.module.fulfillment.mapper.FulfillmentRecordMapper;
import com.flower.mall.module.order.entity.Order;
import com.flower.mall.module.order.mapper.OrderMapper;
import com.flower.mall.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FulfillmentService {

    private final FulfillmentRecordMapper fulfillmentRecordMapper;
    private final OrderMapper orderMapper;

    @Transactional
    public List<FulfillmentVO> accept(Long orderId) {
        Order order = getRequired(orderId);
        if (!OrderStatus.PAID.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.FULFILLMENT_STATE_INVALID, "仅已支付订单可以接单");
        }
        int updated = orderMapper.update(null, Wrappers.<Order>lambdaUpdate()
                .eq(Order::getId, orderId)
                .eq(Order::getStatus, OrderStatus.PAID.name())
                .set(Order::getStatus, OrderStatus.FULFILLING.name())
                .set(Order::getUpdatedAt, LocalDateTime.now()));
        if (updated == 0) {
            throw BusinessException.of(ErrorCode.FULFILLMENT_STATE_INVALID, "订单状态已变化，请刷新后重试");
        }
        insertRecord(order, FulfillmentNode.ACCEPTED, "店员接单");
        return list(orderId);
    }

    @Transactional
    public List<FulfillmentVO> advance(Long orderId, FulfillmentNode node, String remark) {
        Order order = getRequired(orderId);
        if (!OrderStatus.FULFILLING.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.FULFILLMENT_STATE_INVALID, "订单不在履约中");
        }
        FulfillmentRecord last = fulfillmentRecordMapper.selectOne(Wrappers.<FulfillmentRecord>lambdaQuery()
                .eq(FulfillmentRecord::getOrderId, orderId)
                .orderByDesc(FulfillmentRecord::getId)
                .last("LIMIT 1"));
        if (last == null) {
            throw BusinessException.of(ErrorCode.FULFILLMENT_NODE_INVALID, "请先完成接单操作");
        }
        FulfillmentNode lastNode = FulfillmentNode.valueOf(last.getNode());
        if (lastNode == FulfillmentNode.SIGNED) {
            throw BusinessException.of(ErrorCode.FULFILLMENT_STATE_INVALID, "订单已完成签收");
        }
        FulfillmentNode expected = FulfillmentNode.orderedNodes().get(lastNode.getSequence());
        if (node != expected) {
            throw BusinessException.of(ErrorCode.FULFILLMENT_NODE_INVALID,
                    "下一履约节点应为「" + expected.getLabel() + "」");
        }
        insertRecord(order, node, remark);
        if (node == FulfillmentNode.SIGNED) {
            int updated = orderMapper.update(null, Wrappers.<Order>lambdaUpdate()
                    .eq(Order::getId, orderId)
                    .eq(Order::getStatus, OrderStatus.FULFILLING.name())
                    .set(Order::getStatus, OrderStatus.COMPLETED.name())
                    .set(Order::getCompletedAt, LocalDateTime.now())
                    .set(Order::getUpdatedAt, LocalDateTime.now()));
            if (updated == 0) {
                throw BusinessException.of(ErrorCode.FULFILLMENT_STATE_INVALID, "订单状态已变化，请刷新后重试");
            }
        }
        return list(orderId);
    }

    public List<FulfillmentVO> list(Long orderId) {
        return fulfillmentRecordMapper.selectList(Wrappers.<FulfillmentRecord>lambdaQuery()
                        .eq(FulfillmentRecord::getOrderId, orderId)
                        .orderByAsc(FulfillmentRecord::getId))
                .stream().map(FulfillmentVO::from).toList();
    }

    public List<FulfillmentVO> listForCustomer(Long orderId) {
        Long userId = SecurityUtils.currentUserId();
        Order order = orderMapper.selectOne(Wrappers.<Order>lambdaQuery()
                .eq(Order::getId, orderId)
                .eq(Order::getUserId, userId));
        if (order == null) {
            throw BusinessException.of(ErrorCode.ORDER_NOT_FOUND);
        }
        return list(orderId);
    }

    public Order getRequired(Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw BusinessException.of(ErrorCode.ORDER_NOT_FOUND);
        }
        return order;
    }

    private void insertRecord(Order order, FulfillmentNode node, String remark) {
        FulfillmentRecord record = new FulfillmentRecord();
        record.setOrderId(order.getId());
        record.setOrderNo(order.getOrderNo());
        record.setNode(node.name());
        record.setRemark(StringUtils.hasText(remark) ? remark : node.getLabel());
        AuthUser authUser = SecurityUtils.currentUserOrNull();
        if (authUser != null) {
            record.setOperatorId(authUser.getId());
            record.setOperatorName(authUser.getUsername());
        } else {
            record.setOperatorName("system");
        }
        fulfillmentRecordMapper.insert(record);
    }
}
