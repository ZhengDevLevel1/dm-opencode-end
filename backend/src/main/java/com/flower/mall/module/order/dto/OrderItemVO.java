package com.flower.mall.module.order.dto;

import com.flower.mall.module.order.entity.OrderItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemVO {

    private Long id;
    private Long productId;
    private String productName;
    private String productImage;
    private String category;
    private Long specId;
    private String specName;
    private Long wrapId;
    private String wrapName;
    private String flowerSummary;
    private String giftAccessories;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;
    private boolean reviewed;

    public static OrderItemVO from(OrderItem item) {
        return OrderItemVO.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(item.getProductName())
                .productImage(item.getProductImage())
                .category(item.getCategory())
                .specId(item.getSpecId())
                .specName(item.getSpecName())
                .wrapId(item.getWrapId())
                .wrapName(item.getWrapName())
                .flowerSummary(item.getFlowerSummary())
                .giftAccessories(item.getGiftAccessories())
                .unitPrice(item.getUnitPrice())
                .quantity(item.getQuantity())
                .subtotal(item.getSubtotal())
                .reviewed(item.getReviewed() != null && item.getReviewed() == 1)
                .build();
    }
}
