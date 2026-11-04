package com.flower.mall.common.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.List;

@Getter
public enum FulfillmentNode {

    ACCEPTED("接单", 1),
    PREPARING("备花", 2),
    DELIVERING("配送", 3),
    SIGNED("签收", 4);

    private final String label;
    private final int sequence;

    FulfillmentNode(String label, int sequence) {
        this.label = label;
        this.sequence = sequence;
    }

    public static List<FulfillmentNode> orderedNodes() {
        return Arrays.asList(ACCEPTED, PREPARING, DELIVERING, SIGNED);
    }
}
