package com.flower.mall.common.util;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public final class OrderNoGenerator {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final SecureRandom RANDOM = new SecureRandom();

    private OrderNoGenerator() {
    }

    public static String nextOrderNo() {
        return "FS" + LocalDateTime.now().format(FORMATTER) + randomDigits();
    }

    public static String nextPaymentNo() {
        return "PAY" + LocalDateTime.now().format(FORMATTER) + randomDigits();
    }

    private static String randomDigits() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
