package com.flower.mall.module.log.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.common.util.IpUtils;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.log.entity.OperationLog;
import com.flower.mall.module.log.service.OperationLogService;
import com.flower.mall.security.AuthUser;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.validation.BindingResult;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@Component
@Aspect
@RequiredArgsConstructor
public class OperationLogAspect {

    private static final int MAX_PARAM_LENGTH = 2000;

    private final OperationLogService operationLogService;
    private final ObjectMapper objectMapper;

    @Around("@annotation(record)")
    public Object around(ProceedingJoinPoint joinPoint, OperationLogRecord record) throws Throwable {
        long startedAt = System.currentTimeMillis();
        OperationLog operationLog = new OperationLog();
        operationLog.setModule(record.module());
        operationLog.setOperation(record.operation());
        operationLog.setMethod(joinPoint.getSignature().toShortString());
        operationLog.setSuccess(1);
        operationLog.setIp(IpUtils.currentIp());
        HttpServletRequest request = currentRequest();
        if (request != null) {
            operationLog.setRequestUri(request.getRequestURI());
            operationLog.setRequestMethod(request.getMethod());
        }
        AuthUser authUser = SecurityUtils.currentUserOrNull();
        if (authUser != null) {
            operationLog.setUserId(authUser.getId());
            operationLog.setUsername(authUser.getUsername());
        } else {
            operationLog.setUsername("anonymous");
        }
        if (record.saveParams()) {
            operationLog.setRequestParams(serializeArgs(joinPoint.getArgs()));
        }
        try {
            Object result = joinPoint.proceed();
            return result;
        } catch (Throwable throwable) {
            operationLog.setSuccess(0);
            operationLog.setErrorMessage(truncate(throwable.getMessage(), 500));
            throw throwable;
        } finally {
            operationLog.setDurationMs(System.currentTimeMillis() - startedAt);
            operationLogService.record(operationLog);
        }
    }

    private HttpServletRequest currentRequest() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes == null ? null : attributes.getRequest();
    }

    private String serializeArgs(Object[] args) {
        try {
            List<Object> serializable = Arrays.stream(args)
                    .filter(arg -> arg != null
                            && !(arg instanceof ServletRequest)
                            && !(arg instanceof ServletResponse)
                            && !(arg instanceof MultipartFile)
                            && !(arg instanceof BindingResult))
                    .toList();
            if (serializable.isEmpty()) {
                return null;
            }
            String json = objectMapper.writeValueAsString(serializable);
            json = json.replaceAll("(?i)\"(password|oldPassword|newPassword)\"\\s*:\\s*\"[^\"]*\"",
                    "\"$1\":\"******\"");
            return truncate(json, MAX_PARAM_LENGTH);
        } catch (Exception exception) {
            return null;
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
