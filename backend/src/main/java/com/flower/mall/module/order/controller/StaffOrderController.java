package com.flower.mall.module.order.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.common.enums.FulfillmentNode;
import com.flower.mall.module.fulfillment.dto.FulfillmentRequest;
import com.flower.mall.module.fulfillment.dto.FulfillmentVO;
import com.flower.mall.module.fulfillment.service.FulfillmentService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.order.dto.AfterSaleHandleRequest;
import com.flower.mall.module.order.dto.CancelOrderRequest;
import com.flower.mall.module.order.dto.OrderVO;
import com.flower.mall.module.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "店员-订单履约")
@RestController
@RequestMapping("/api/staff/orders")
@RequiredArgsConstructor
public class StaffOrderController {

    private final OrderService orderService;
    private final FulfillmentService fulfillmentService;

    @Operation(summary = "店员订单分页查询")
    @GetMapping
    public ApiResponse<PageResult<OrderVO>> page(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ApiResponse.ok(orderService.pageForStaff(page, size, status, keyword, start, end));
    }

    @Operation(summary = "店员查看订单详情")
    @GetMapping("/{id}")
    public ApiResponse<OrderVO> detail(@PathVariable Long id) {
        return ApiResponse.ok(orderService.detailForStaff(id));
    }

    @Operation(summary = "接单")
    @PostMapping("/{id}/accept")
    @OperationLogRecord(module = "履约", operation = "接单")
    public ApiResponse<List<FulfillmentVO>> accept(@PathVariable Long id) {
        return ApiResponse.ok(fulfillmentService.accept(id));
    }

    @Operation(summary = "推进履约节点")
    @PostMapping("/{id}/fulfillment")
    @OperationLogRecord(module = "履约", operation = "推进履约节点")
    public ApiResponse<List<FulfillmentVO>> advance(@PathVariable Long id,
                                                    @Valid @RequestBody FulfillmentRequest request) {
        return ApiResponse.ok(fulfillmentService.advance(id,
                FulfillmentNode.valueOf(request.getNode()), request.getRemark()));
    }

    @Operation(summary = "店员取消订单")
    @PostMapping("/{id}/cancel")
    @OperationLogRecord(module = "履约", operation = "店员取消订单")
    public ApiResponse<OrderVO> cancel(@PathVariable Long id,
                                       @RequestBody(required = false) CancelOrderRequest request) {
        return ApiResponse.ok(orderService.cancelByStaff(id, request == null ? null : request.getReason()));
    }

    @Operation(summary = "处理售后申请")
    @PostMapping("/{id}/after-sale")
    @OperationLogRecord(module = "履约", operation = "处理售后")
    public ApiResponse<OrderVO> handleAfterSale(@PathVariable Long id,
                                                @Valid @RequestBody AfterSaleHandleRequest request) {
        return ApiResponse.ok(orderService.handleAfterSale(id, request));
    }

    @Operation(summary = "履约记录查询")
    @GetMapping("/{id}/fulfillments")
    public ApiResponse<List<FulfillmentVO>> fulfillments(@PathVariable Long id) {
        return ApiResponse.ok(fulfillmentService.list(id));
    }
}
