package com.flower.mall.module.catalog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalTime;

@Data
@TableName("business_hour")
public class BusinessHour {

    @TableId(value = "day_of_week", type = IdType.INPUT)
    private Integer dayOfWeek;

    private LocalTime openTime;

    private LocalTime closeTime;

    private Integer enabled;

    private String note;
}
