package com.flower.mall.module.catalog.dto;

import com.flower.mall.module.catalog.entity.BusinessHour;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessHourVO {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private Integer dayOfWeek;
    private String dayLabel;
    private String openTime;
    private String closeTime;
    private boolean enabled;
    private String note;

    public static BusinessHourVO from(BusinessHour hour) {
        return BusinessHourVO.builder()
                .dayOfWeek(hour.getDayOfWeek())
                .dayLabel(dayLabel(hour.getDayOfWeek()))
                .openTime(hour.getOpenTime() == null ? null : hour.getOpenTime().format(TIME_FORMAT))
                .closeTime(hour.getCloseTime() == null ? null : hour.getCloseTime().format(TIME_FORMAT))
                .enabled(hour.getEnabled() != null && hour.getEnabled() == 1)
                .note(hour.getNote())
                .build();
    }

    private static String dayLabel(Integer dayOfWeek) {
        if (dayOfWeek == null || dayOfWeek < 1 || dayOfWeek > 7) {
            return "";
        }
        return switch (dayOfWeek) {
            case 1 -> "周一";
            case 2 -> "周二";
            case 3 -> "周三";
            case 4 -> "周四";
            case 5 -> "周五";
            case 6 -> "周六";
            default -> "周日";
        };
    }
}
