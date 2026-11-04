package com.flower.mall.module.order.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.fulfillment.dto.FulfillmentVO;
import com.flower.mall.module.fulfillment.service.FulfillmentService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.order.dto.AfterSaleRequest;
import com.flower.mall.module.order.dto.CancelOrderRequest;
import com.flower.mall.module.order.dto.CreateOrderRequest;
import com.flower.mall.module.order.dto.OrderVO;
import com.flower.mall.module.order.service.OrderService;
import com.flower.mall.common.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "订单")
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final FulfillmentService fulfillmentService;

    @Operation(summary = "提交订单")
    @PostMapping
    @OperationLogRecord(module = "订单", operation = "提交订单")
    public ApiResponse<OrderVO> create(@Valid @RequestBody CreateOrderRequest request) {
        return ApiResponse.ok(orderService.create(request));
    }

    @Operation(summary = "我的订单分页")
    @GetMapping
    public ApiResponse<PageResult<OrderVO>> page(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(orderService.pageForUser(SecurityUtils.currentUserId(), page, size, status));
    }

    @Operation(summary = "订单详情")
    @GetMapping("/{id}")
    public ApiResponse<OrderVO> detail(@PathVariable Long id) {
        return ApiResponse.ok(orderService.detailForUser(id));
    }

    @Operation(summary = "取消待支付订单")
    @PostMapping("/{id}/cancel")
    @OperationLogRecord(module = "订单", operation = "取消订单")
    public ApiResponse<OrderVO> cancel(@PathVariable Long id,
                                       @RequestBody(required = false) CancelOrderRequest request) {
        return ApiResponse.ok(orderService.cancelByUser(id, request == null ? null : request.getReason()));
    }

    @Operation(summary = "申请售后")
    @PostMapping("/{id}/after-sale")
    @OperationLogRecord(module = "订单", operation = "申请售后")
    public ApiResponse<OrderVO> afterSale(@PathVariable Long id,
                                          @Valid @RequestBody AfterSaleRequest request) {
        return ApiResponse.ok(orderService.applyAfterSale(id, request.getReason()));
    }

    @Operation(summary = "查询订单履约轨迹")
    @GetMapping("/{id}/fulfillments")
    public ApiResponse<List<FulfillmentVO>> fulfillments(@PathVariable Long id) {
        return ApiResponse.ok(fulfillmentService.listForCustomer(id));
    }
}
