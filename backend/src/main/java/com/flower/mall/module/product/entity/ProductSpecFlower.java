package com.flower.mall.module.product.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("product_spec_flower")
public class ProductSpecFlower {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long specId;

    private Long materialId;

    private Integer quantity;
}
