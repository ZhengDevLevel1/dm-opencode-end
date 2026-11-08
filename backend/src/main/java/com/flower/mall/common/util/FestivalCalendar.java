package com.flower.mall.common.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.temporal.TemporalAdjusters;
import java.util.Optional;

public final class FestivalCalendar {

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
        if (month == Month.DECEMBER && day == 24) {
            return Optional.of("平安夜");
        }
        if (month == Month.DECEMBER && day == 25) {
            return Optional.of("圣诞节");
        }
        if (month == Month.MAY && isNthWeekday(date, DayOfWeek.SUNDAY, 2)) {
            return Optional.of("母亲节");
        }
        if (month == Month.JUNE && isNthWeekday(date, DayOfWeek.SUNDAY, 3)) {
            return Optional.of("父亲节");
        }
        if (month == Month.NOVEMBER && isNthWeekday(date, DayOfWeek.THURSDAY, 4)) {
            return Optional.of("感恩节");
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

    private static boolean isNthWeekday(LocalDate date, DayOfWeek dayOfWeek, int nth) {
        if (date.getDayOfWeek() != dayOfWeek) {
            return false;
        }
        LocalDate first = date.with(TemporalAdjusters.firstInMonth(dayOfWeek));
        return first.plusWeeks(nth - 1L).equals(date);
    }
}
