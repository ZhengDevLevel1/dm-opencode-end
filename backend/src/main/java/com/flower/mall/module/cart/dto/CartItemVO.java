package com.flower.mall.module.cart.dto;

import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.module.cart.entity.CartItem;
import com.flower.mall.module.product.entity.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemVO {

    private Long id;
    private Long productId;
    private String productName;
    private String productImage;
    private BigDecimal price;
    private Integer quantity;
    private BigDecimal subtotal;
    private Integer stock;
    private String status;
    private String statusLabel;
    private boolean available;

    public static CartItemVO from(CartItem item, Product product) {
        ProductStatus status = ProductStatus.valueOf(product.getStatus());
        boolean available = status == ProductStatus.ON_SALE && product.getStock() >= item.getQuantity();
        return CartItemVO.builder()
                .id(item.getId())
                .productId(product.getId())
                .productName(product.getName())
                .productImage(product.getImageUrl())
                .price(product.getPrice())
                .quantity(item.getQuantity())
                .subtotal(product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .stock(product.getStock())
                .status(status.name())
                .statusLabel(status.getLabel())
                .available(available)
                .build();
    }
}
