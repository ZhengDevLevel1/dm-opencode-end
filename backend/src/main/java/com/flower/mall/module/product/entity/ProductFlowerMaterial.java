package com.flower.mall.module.product.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("product_flower_material")
public class ProductFlowerMaterial {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long productId;

    private Long materialId;

    private Integer sortOrder;
}
