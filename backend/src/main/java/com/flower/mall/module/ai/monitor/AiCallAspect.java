package com.flower.mall.module.ai.monitor;

import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Aspect
@Component
@RequiredArgsConstructor
public class AiCallAspect {

    private final AiRuntimeMetrics runtimeMetrics;

    @Around("@annotation(aiCall)")
    public Object around(ProceedingJoinPoint joinPoint, AiCall aiCall) throws Throwable {
        long startedAt = System.currentTimeMillis();
        boolean success = false;
        try {
            Object result = joinPoint.proceed();
            success = true;
            return result;
        } finally {
            runtimeMetrics.record(resolvePath(joinPoint, aiCall),
                    System.currentTimeMillis() - startedAt, success);
        }
    }

    private String resolvePath(ProceedingJoinPoint joinPoint, AiCall aiCall) {
        if (StringUtils.hasText(aiCall.value())) {
            return aiCall.value();
        }
        Object[] args = joinPoint.getArgs();
        if (args.length > 0 && args[0] instanceof String path && StringUtils.hasText(path)) {
            return path;
        }
        return joinPoint.getSignature().toShortString();
    }
}
