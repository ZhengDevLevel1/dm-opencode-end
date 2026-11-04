package com.flower.mall.module.fulfillment.dto;

import com.flower.mall.common.enums.FulfillmentNode;
import com.flower.mall.module.fulfillment.entity.FulfillmentRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FulfillmentVO {

    private Long id;
    private Long orderId;
    private String orderNo;
    private String node;
    private String nodeLabel;
    private String operatorName;
    private String remark;
    private LocalDateTime createdAt;

    public static FulfillmentVO from(FulfillmentRecord record) {
        FulfillmentNode node = FulfillmentNode.valueOf(record.getNode());
        return FulfillmentVO.builder()
                .id(record.getId())
                .orderId(record.getOrderId())
                .orderNo(record.getOrderNo())
                .node(node.name())
                .nodeLabel(node.getLabel())
                .operatorName(record.getOperatorName())
                .remark(record.getRemark())
                .createdAt(record.getCreatedAt())
                .build();
    }
}
