package com.flower.mall.common.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

public final class FestivalCalendar {

    public static final List<String> SUPPORTED_FESTIVALS = List.of(
            "元旦", "春节", "情人节", "妇女节", "母亲节", "520", "儿童节",
            "毕业季", "七夕", "教师节", "国庆节", "圣诞节");

    private FestivalCalendar() {
    }

    public static Optional<String> detect(LocalDate date) {
        Month month = date.getMonth();
        int day = date.getDayOfMonth();

        if (month == Month.JANUARY && day == 1) {
            return Optional.of("元旦");
        }
        if (month == Month.FEBRUARY && day == 14) {
            return Optional.of("情人节");
        }
        if (month == Month.MARCH && day == 8) {
            return Optional.of("妇女节");
        }
        if (month == Month.MAY && day == 20) {
            return Optional.of("520");
        }
        if (month == Month.JUNE && day == 1) {
            return Optional.of("儿童节");
        }
        if (month == Month.AUGUST && day == 10) {
            return Optional.of("七夕");
        }
        if (month == Month.SEPTEMBER && day == 10) {
            return Optional.of("教师节");
        }
        if (month == Month.OCTOBER && day == 1) {
            return Optional.of("国庆节");
        }
        if (month == Month.DECEMBER && day == 25) {
            return Optional.of("圣诞节");
        }
        if (month == Month.MAY && isNthSunday(date, 2)) {
            return Optional.of("母亲节");
        }
        LocalDate springStart = LocalDate.of(date.getYear(), 1, 20);
        LocalDate springEnd = LocalDate.of(date.getYear(), 2, 20);
        if (!date.isBefore(springStart) && !date.isAfter(springEnd)) {
            return Optional.of("春节");
        }
        if (month.getValue() >= 5 && month.getValue() <= 7 && date.getDayOfMonth() <= 20) {
            return Optional.of("毕业季");
        }
        return Optional.empty();
    }

    private static boolean isNthSunday(LocalDate date, int nth) {
        if (date.getDayOfWeek() != DayOfWeek.SUNDAY) {
            return false;
        }
        LocalDate firstSunday = date.with(TemporalAdjusters.firstInMonth(DayOfWeek.SUNDAY));
        return firstSunday.plusWeeks(nth - 1L).equals(date);
    }
}
