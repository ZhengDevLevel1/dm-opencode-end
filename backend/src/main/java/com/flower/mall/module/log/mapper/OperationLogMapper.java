package com.flower.mall.module.log.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flower.mall.module.log.entity.OperationLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OperationLogMapper extends BaseMapper<OperationLog> {
}
