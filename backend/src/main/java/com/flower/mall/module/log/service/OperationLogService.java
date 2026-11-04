package com.flower.mall.module.log.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flower.mall.module.log.entity.OperationLog;
import com.flower.mall.module.log.mapper.OperationLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationLogService {

    private final OperationLogMapper operationLogMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(OperationLog operationLog) {
        try {
            operationLogMapper.insert(operationLog);
        } catch (Exception exception) {
            log.warn("操作日志写入失败: {}", exception.getMessage());
        }
    }

    public IPage<OperationLog> page(long page, long size, String module, String username,
                                    LocalDateTime start, LocalDateTime end) {
        return operationLogMapper.selectPage(new Page<>(page, size), Wrappers.<OperationLog>lambdaQuery()
                .eq(StringUtils.hasText(module), OperationLog::getModule, module)
                .like(StringUtils.hasText(username), OperationLog::getUsername, username)
                .ge(start != null, OperationLog::getCreatedAt, start)
                .le(end != null, OperationLog::getCreatedAt, end)
                .orderByDesc(OperationLog::getId));
    }
}
