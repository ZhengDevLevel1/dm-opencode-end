package com.flower.mall.module.catalog.service;

import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.catalog.dto.BusinessHourBatchRequest;
import com.flower.mall.module.catalog.dto.BusinessHourSaveRequest;
import com.flower.mall.module.catalog.dto.BusinessHourVO;
import com.flower.mall.module.catalog.entity.BusinessHour;
import com.flower.mall.module.catalog.mapper.BusinessHourMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BusinessHourService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final BusinessHourMapper businessHourMapper;

    public List<BusinessHourVO> list() {
        return businessHourMapper.selectList(null).stream()
                .sorted((left, right) -> Integer.compare(left.getDayOfWeek(), right.getDayOfWeek()))
                .map(BusinessHourVO::from)
                .toList();
    }

    @Transactional
    public List<BusinessHourVO> save(BusinessHourBatchRequest request) {
        Set<Integer> days = new HashSet<>();
        for (BusinessHourSaveRequest hour : request.getHours()) {
            if (!days.add(hour.getDayOfWeek())) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "营业时间存在重复的星期配置");
            }
            LocalTime open = parseTime(hour.getOpenTime());
            LocalTime close = parseTime(hour.getCloseTime());
            if (!open.isBefore(close)) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "关门时间必须晚于开门时间");
            }
            BusinessHour entity = new BusinessHour();
            entity.setDayOfWeek(hour.getDayOfWeek());
            entity.setOpenTime(open);
            entity.setCloseTime(close);
            entity.setEnabled(hour.getEnabled() == null ? 1 : hour.getEnabled());
            entity.setNote(StringUtils.hasText(hour.getNote()) ? hour.getNote().trim() : null);
            if (businessHourMapper.updateById(entity) == 0) {
                businessHourMapper.insert(entity);
            }
        }
        return list();
    }

    public void validateDelivery(LocalDateTime deliveryAt) {
        if (deliveryAt == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        if (deliveryAt.isBefore(now.plusMinutes(60))) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "请至少提前1小时预约送达时间");
        }
        if (deliveryAt.isAfter(now.plusDays(6))) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "最多支持预约6天内的送达时间");
        }
        BusinessHour hour = businessHourMapper.selectById(deliveryAt.getDayOfWeek().getValue());
        if (hour == null || hour.getEnabled() == null || hour.getEnabled() != 1) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "所选日期门店休息，请选择其他送达日期");
        }
        LocalTime time = deliveryAt.toLocalTime();
        if (time.isBefore(hour.getOpenTime()) || time.isAfter(hour.getCloseTime())) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST,
                    "送达时间需在营业时间 " + hour.getOpenTime().format(TIME_FORMAT)
                            + "-" + hour.getCloseTime().format(TIME_FORMAT) + " 内");
        }
    }

    private LocalTime parseTime(String value) {
        try {
            return value.length() == 5 ? LocalTime.parse(value) : LocalTime.parse(value);
        } catch (RuntimeException exception) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "营业时间格式不正确");
        }
    }
}
