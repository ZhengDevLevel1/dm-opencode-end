package com.flower.mall.module.order.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.common.enums.InventoryChangeType;
import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.common.enums.PaymentStatus;
import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.OrderNoGenerator;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.cart.entity.CartItem;
import com.flower.mall.module.cart.service.CartService;
import com.flower.mall.module.inventory.service.InventoryService;
import com.flower.mall.module.order.dto.AfterSaleHandleRequest;
import com.flower.mall.module.order.dto.CreateOrderRequest;
import com.flower.mall.module.order.dto.OrderVO;
import com.flower.mall.module.order.entity.Order;
import com.flower.mall.module.order.entity.OrderItem;
import com.flower.mall.module.order.mapper.OrderItemMapper;
import com.flower.mall.module.order.mapper.OrderMapper;
import com.flower.mall.module.payment.entity.PaymentRecord;
import com.flower.mall.module.payment.mapper.PaymentRecordMapper;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final CartService cartService;
    private final ProductMapper productMapper;
    private final InventoryService inventoryService;
    private final PaymentRecordMapper paymentRecordMapper;
    private final UserMapper userMapper;
    private final CacheService cacheService;

    @Transactional
    public OrderVO create(CreateOrderRequest request) {
        Long userId = SecurityUtils.currentUserId();
        List<CartItem> cartItems = cartService.selectOwnedItems(userId, request.getCartItemIds());
        if (request.getCartItemIds() != null && !request.getCartItemIds().isEmpty()) {
            long expected = request.getCartItemIds().stream().distinct().count();
            if (cartItems.size() < expected) {
                throw BusinessException.of(ErrorCode.CART_ITEM_NOT_FOUND, "部分购物车商品不存在或不属于当前用户");
            }
        }
        if (cartItems.isEmpty()) {
            throw BusinessException.of(ErrorCode.CART_EMPTY);
        }
        Map<Long, Product> products = productMapper.selectBatchIds(
                        cartItems.stream().map(CartItem::getProductId).distinct().toList())
                .stream().collect(Collectors.toMap(Product::getId, Function.identity()));

        BigDecimal total = BigDecimal.ZERO;
        for (CartItem cartItem : cartItems) {
            Product product = products.get(cartItem.getProductId());
            if (product == null) {
                throw BusinessException.of(ErrorCode.PRODUCT_NOT_FOUND);
            }
            if (!ProductStatus.ON_SALE.name().equals(product.getStatus())) {
                throw BusinessException.of(ErrorCode.PRODUCT_OFF_SHELF,
                        "商品「" + product.getName() + "」已下架");
            }
            if (cartItem.getQuantity() > product.getStock()) {
                throw BusinessException.of(ErrorCode.STOCK_INSUFFICIENT,
                        "商品「" + product.getName() + "」库存不足，当前库存 " + product.getStock());
            }
            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
        }
        total = total.setScale(2, RoundingMode.HALF_UP);

        Order order = new Order();
        order.setOrderNo(OrderNoGenerator.nextOrderNo());
        order.setUserId(userId);
        order.setTotalAmount(total);
        order.setPayAmount(total);
        order.setStatus(OrderStatus.PENDING_PAYMENT.name());
        order.setReceiverName(request.getReceiverName());
        order.setReceiverPhone(request.getReceiverPhone());
        order.setReceiverAddress(request.getReceiverAddress());
        order.setRemark(request.getRemark());
        order.setVersion(0);
        orderMapper.insert(order);

        List<OrderItem> orderItems = new ArrayList<>();
        List<CartItem> sortedItems = cartItems.stream()
                .sorted(Comparator.comparing(CartItem::getProductId))
                .toList();
        for (CartItem cartItem : sortedItems) {
            Product product = products.get(cartItem.getProductId());
            int quantity = cartItem.getQuantity();
            int stockBefore = product.getStock();
            int updated = productMapper.deductStock(product.getId(), quantity);
            if (updated == 0) {
                throw BusinessException.of(ErrorCode.STOCK_INSUFFICIENT,
                        "商品「" + product.getName() + "」库存不足，请调整数量后重试");
            }
            OrderItem item = new OrderItem();
            item.setOrderId(order.getId());
            item.setProductId(product.getId());
            item.setProductName(product.getName());
            item.setProductImage(product.getImageUrl());
            item.setCategory(product.getCategory());
            item.setUnitPrice(product.getPrice());
            item.setQuantity(quantity);
            item.setSubtotal(product.getPrice().multiply(BigDecimal.valueOf(quantity))
                    .setScale(2, RoundingMode.HALF_UP));
            item.setReviewed(0);
            orderItemMapper.insert(item);
            orderItems.add(item);
            inventoryService.recordMovement(product.getId(), product.getName(),
                    InventoryChangeType.ORDER_DEDUCT, -quantity, stockBefore, stockBefore - quantity,
                    order.getOrderNo(), "创建订单扣减库存");
        }
        cartService.removeItems(sortedItems);
        evictProductCaches(sortedItems.stream().map(CartItem::getProductId).toList());
        Order saved = orderMapper.selectById(order.getId());
        OrderVO vo = OrderVO.from(saved, orderItems);
        fillBuyerInfo(List.of(saved), List.of(vo));
        return vo;
    }

    public PageResult<OrderVO> pageForUser(Long userId, long page, long size, String status) {
        IPage<Order> orderPage = orderMapper.selectPage(new Page<>(Math.max(page, 1), clampSize(size)),
                Wrappers.<Order>lambdaQuery()
                        .eq(Order::getUserId, userId)
                        .eq(StringUtils.hasText(status), Order::getStatus, status)
                        .orderByDesc(Order::getId));
        return toPageResult(orderPage, false);
    }

    public PageResult<OrderVO> pageForStaff(long page, long size, String status, String keyword,
                                            LocalDateTime start, LocalDateTime end) {
        String search = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String pattern = search == null ? null : "%" + search + "%";
        IPage<Order> orderPage = orderMapper.selectPage(new Page<>(Math.max(page, 1), clampSize(size)),
                Wrappers.<Order>lambdaQuery()
                        .eq(StringUtils.hasText(status), Order::getStatus, status)
                        .and(pattern != null, wrapper -> wrapper
                                .like(Order::getOrderNo, search)
                                .or().like(Order::getReceiverName, search)
                                .or().like(Order::getReceiverPhone, search)
                                .or().apply("EXISTS (SELECT 1 FROM sys_user u "
                                                + "WHERE u.id = shop_order.user_id "
                                                + "AND (u.nickname LIKE {0} OR u.username LIKE {0}))",
                                        pattern)
                                .or().apply("EXISTS (SELECT 1 FROM order_item oi "
                                                + "WHERE oi.order_id = shop_order.id "
                                                + "AND oi.product_name LIKE {0})",
                                        pattern))
                        .ge(start != null, Order::getCreatedAt, start)
                        .le(end != null, Order::getCreatedAt, end)
                        .orderByDesc(Order::getId));
        return toPageResult(orderPage, true);
    }

    public OrderVO detailForUser(Long orderId) {
        Order order = getOwnedOrder(orderId, SecurityUtils.currentUserId());
        return OrderVO.from(order, items(orderId));
    }

    public OrderVO detailForStaff(Long orderId) {
        Order order = getRequired(orderId);
        OrderVO vo = OrderVO.from(order, items(orderId));
        fillBuyerInfo(List.of(order), List.of(vo));
        return vo;
    }

    public Order getRequired(Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw BusinessException.of(ErrorCode.ORDER_NOT_FOUND);
        }
        return order;
    }

    public Order getOwnedOrder(Long orderId, Long userId) {
        Order order = orderMapper.selectOne(Wrappers.<Order>lambdaQuery()
                .eq(Order::getId, orderId)
                .eq(Order::getUserId, userId));
        if (order == null) {
            throw BusinessException.of(ErrorCode.ORDER_NOT_FOUND);
        }
        return order;
    }

    public List<OrderItem> items(Long orderId) {
        return orderItemMapper.selectList(Wrappers.<OrderItem>lambdaQuery()
                .eq(OrderItem::getOrderId, orderId)
                .orderByAsc(OrderItem::getId));
    }

    @Transactional
    public OrderVO cancelByUser(Long orderId, String reason) {
        Long userId = SecurityUtils.currentUserId();
        Order order = getOwnedOrder(orderId, userId);
        if (!OrderStatus.PENDING_PAYMENT.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "仅待支付订单可以取消");
        }
        String finalReason = StringUtils.hasText(reason) ? reason : "用户主动取消";
        int updated = orderMapper.update(null, Wrappers.<Order>lambdaUpdate()
                .eq(Order::getId, orderId)
                .eq(Order::getUserId, userId)
                .eq(Order::getStatus, OrderStatus.PENDING_PAYMENT.name())
                .set(Order::getStatus, OrderStatus.CANCELLED.name())
                .set(Order::getCancelReason, finalReason)
                .set(Order::getUpdatedAt, LocalDateTime.now()));
        if (updated == 0) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "订单状态已变化，请刷新后重试");
        }
        restoreStock(order, InventoryChangeType.ORDER_CANCEL, "取消订单回补库存");
        closePendingPayments(orderId);
        evictProductCaches(items(orderId).stream().map(OrderItem::getProductId).toList());
        return OrderVO.from(getRequired(orderId), items(orderId));
    }

    @Transactional
    public OrderVO cancelByStaff(Long orderId, String reason) {
        Order order = getRequired(orderId);
        boolean paid = OrderStatus.PAID.name().equals(order.getStatus());
        if (!paid && !OrderStatus.PENDING_PAYMENT.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "仅待支付或已支付订单可以取消");
        }
        String finalReason = StringUtils.hasText(reason) ? reason : "店员取消订单";
        int updated = orderMapper.update(null, Wrappers.<Order>lambdaUpdate()
                .eq(Order::getId, orderId)
                .in(Order::getStatus, OrderStatus.PENDING_PAYMENT.name(), OrderStatus.PAID.name())
                .set(Order::getStatus, OrderStatus.CANCELLED.name())
                .set(Order::getCancelReason, finalReason)
                .set(Order::getUpdatedAt, LocalDateTime.now()));
        if (updated == 0) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "订单状态已变化，请刷新后重试");
        }
        restoreStock(order, InventoryChangeType.ORDER_CANCEL, "取消订单回补库存");
        if (paid) {
            refundPayments(orderId);
            decreaseSales(items(orderId));
        } else {
            closePendingPayments(orderId);
        }
        evictProductCaches(items(orderId).stream().map(OrderItem::getProductId).toList());
        return OrderVO.from(getRequired(orderId), items(orderId));
    }

    @Transactional
    public OrderVO applyAfterSale(Long orderId, String reason) {
        Long userId = SecurityUtils.currentUserId();
        Order order = getOwnedOrder(orderId, userId);
        if (!OrderStatus.COMPLETED.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "仅已完成订单可以申请售后");
        }
        int updated = orderMapper.update(null, Wrappers.<Order>lambdaUpdate()
                .eq(Order::getId, orderId)
                .eq(Order::getUserId, userId)
                .eq(Order::getStatus, OrderStatus.COMPLETED.name())
                .set(Order::getStatus, OrderStatus.AFTER_SALE.name())
                .set(Order::getAfterSaleReason, reason)
                .set(Order::getUpdatedAt, LocalDateTime.now()));
        if (updated == 0) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "订单状态已变化，请刷新后重试");
        }
        return OrderVO.from(getRequired(orderId), items(orderId));
    }

    @Transactional
    public OrderVO handleAfterSale(Long orderId, AfterSaleHandleRequest request) {
        Order order = getRequired(orderId);
        if (!OrderStatus.AFTER_SALE.name().equals(order.getStatus())) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "订单不在售后处理中");
        }
        boolean approved = Boolean.TRUE.equals(request.getApproved());
        String targetStatus = approved ? OrderStatus.REFUNDED.name() : OrderStatus.COMPLETED.name();
        String note = approved ? "同意退款" : "拒绝退款";
        if (StringUtils.hasText(request.getRemark())) {
            note = note + "：" + request.getRemark();
        }
        String reason = order.getAfterSaleReason() == null
                ? note
                : order.getAfterSaleReason() + " | " + note;
        int updated = orderMapper.update(null, Wrappers.<Order>lambdaUpdate()
                .eq(Order::getId, orderId)
                .eq(Order::getStatus, OrderStatus.AFTER_SALE.name())
                .set(Order::getStatus, targetStatus)
                .set(Order::getAfterSaleReason, reason)
                .set(Order::getUpdatedAt, LocalDateTime.now()));
        if (updated == 0) {
            throw BusinessException.of(ErrorCode.ORDER_STATE_INVALID, "订单状态已变化，请刷新后重试");
        }
        if (approved) {
            refundPayments(orderId);
            List<OrderItem> orderItems = items(orderId);
            restoreStock(order, InventoryChangeType.AFTER_SALE_RESTORE, "售后退款回补库存");
            decreaseSales(orderItems);
            evictProductCaches(orderItems.stream().map(OrderItem::getProductId).toList());
        }
        return OrderVO.from(getRequired(orderId), items(orderId));
    }

    @Transactional
    public void refundPayments(Long orderId) {
        paymentRecordMapper.update(null, Wrappers.<PaymentRecord>lambdaUpdate()
                .eq(PaymentRecord::getOrderId, orderId)
                .eq(PaymentRecord::getStatus, PaymentStatus.SUCCESS.name())
                .set(PaymentRecord::getStatus, PaymentStatus.REFUNDED.name()));
    }

    public void decreaseSales(List<OrderItem> orderItems) {
        for (OrderItem item : orderItems) {
            productMapper.decreaseSales(item.getProductId(), item.getQuantity());
        }
    }

    private void closePendingPayments(Long orderId) {
        paymentRecordMapper.update(null, Wrappers.<PaymentRecord>lambdaUpdate()
                .eq(PaymentRecord::getOrderId, orderId)
                .eq(PaymentRecord::getStatus, PaymentStatus.PENDING.name())
                .set(PaymentRecord::getStatus, PaymentStatus.FAILED.name()));
    }

    private void restoreStock(Order order, InventoryChangeType changeType, String remark) {
        for (OrderItem item : items(order.getId())) {
            Product product = productMapper.selectById(item.getProductId());
            if (product == null) {
                continue;
            }
            int stockBefore = product.getStock();
            productMapper.restoreStock(item.getProductId(), item.getQuantity());
            inventoryService.recordMovement(item.getProductId(), item.getProductName(), changeType,
                    item.getQuantity(), stockBefore, stockBefore + item.getQuantity(),
                    order.getOrderNo(), remark);
        }
    }

    private void evictProductCaches(List<Long> productIds) {
        productIds.stream().distinct().forEach(productId ->
                cacheService.evict(CacheKeys.productDetail(productId)));
        cacheService.evict(CacheKeys.HOT_PRODUCTS);
    }

    private PageResult<OrderVO> toPageResult(IPage<Order> orderPage, boolean includeBuyer) {
        List<Order> orders = orderPage.getRecords();
        Map<Long, List<OrderItem>> itemsMap = loadItemsByOrderIds(
                orders.stream().map(Order::getId).toList());
        List<OrderVO> records = orders.stream()
                .map(order -> OrderVO.from(order, itemsMap.getOrDefault(order.getId(), List.of())))
                .toList();
        if (includeBuyer) {
            fillBuyerInfo(orders, records);
        }
        return PageResult.of(records, orderPage.getTotal(), orderPage.getCurrent(), orderPage.getSize());
    }

    private Map<Long, List<OrderItem>> loadItemsByOrderIds(List<Long> orderIds) {
        if (orderIds.isEmpty()) {
            return Map.of();
        }
        return orderItemMapper.selectList(Wrappers.<OrderItem>lambdaQuery()
                        .in(OrderItem::getOrderId, orderIds)
                        .orderByAsc(OrderItem::getId))
                .stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId, LinkedHashMap::new, Collectors.toList()));
    }

    private void fillBuyerInfo(List<Order> orders, List<OrderVO> vos) {
        List<Long> userIds = orders.stream().map(Order::getUserId).distinct().toList();
        if (userIds.isEmpty()) {
            return;
        }
        Map<Long, User> users = userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        for (OrderVO vo : vos) {
            User user = users.get(vo.getUserId());
            if (user != null) {
                vo.setBuyerUsername(user.getUsername());
                vo.setBuyerNickname(user.getNickname());
            }
        }
    }

    private long clampSize(long size) {
        return Math.min(Math.max(size, 1), 100);
    }
}
