package com.flower.mall.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class CacheServiceTest {

    @Test
    void evictsImmediatelyWithoutActiveTransaction() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        CacheService cacheService = cacheService(redisTemplate);

        cacheService.evict("product:1");

        verify(redisTemplate).delete("product:1");
    }

    @Test
    void defersEvictionUntilTransactionCommits() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        CacheService cacheService = cacheService(redisTemplate);

        TransactionSynchronizationManager.initSynchronization();
        try {
            cacheService.evict("product:1");

            verify(redisTemplate, never()).delete("product:1");
            List<TransactionSynchronization> synchronizations =
                    TransactionSynchronizationManager.getSynchronizations();
            synchronizations.forEach(TransactionSynchronization::afterCommit);

            verify(redisTemplate).delete("product:1");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private CacheService cacheService(StringRedisTemplate redisTemplate) {
        AppProperties properties = new AppProperties();
        properties.getRedis().setEnabled(true);
        return new CacheService(redisTemplate, new ObjectMapper(), properties);
    }
}
