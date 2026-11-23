package com.flower.mall.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Data
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Redis redis = new Redis();
    private Cache cache = new Cache();
    private Recommendation recommendation = new Recommendation();
    private Ai ai = new Ai();
    private Minio minio = new Minio();
    private Cors cors = new Cors();

    @Data
    public static class Jwt {
        private String secret;
        private long expirationSeconds = 86400;
        private String issuer = "flower-shop-backend";
    }

    @Data
    public static class Redis {
        private boolean enabled = true;
    }

    @Data
    public static class Cache {
        private long productDetailSeconds = 600;
        private long hotProductsSeconds = 300;
        private int hotProductsLimit = 8;
    }

    @Data
    public static class Recommendation {
        private int candidateLimit = 60;
        private int catalogScanLimit = 500;
        private int productCacheSeconds = 30;
        private int behaviorCacheSeconds = 30;
    }

    @Data
    public static class Ai {
        private boolean enabled = false;
        private boolean chatEnabled = true;
        private boolean merchantEnabled = true;
        private boolean chatAllowAnonymous = true;
        private String baseUrl = "http://127.0.0.1:8081";
        private boolean nacosEnabled = false;
        private String nacosServerAddr = "127.0.0.1:8848";
        private String serviceName = "flower-ai-service";
        private String internalToken = "flower-ai-internal-dev-token";
        private int timeoutMs = 15000;
        private int chatTimeoutMs = 60000;
        private int chatRateLimitPerMinute = 10;
        private int chatDailyLimit = 100;
        private int chatMaxQuestionChars = 500;
        private int chatContextMaxChars = 12000;
        private int chatContextMaxMessages = 40;
        private double dailyBudget = 20.0;
        private String chatModel = "deepseek-chat";
        private String recommendationMode = "TF_IDF";
        private int vectorTrafficPercent = 0;
        private Pricing pricing = new Pricing();
    }

    @Data
    public static class Pricing {
        private double inputPer1k = 0.001;
        private double outputPer1k = 0.002;
    }

    @Data
    public static class Minio {
        private boolean enabled = false;
        private String endpoint = "http://localhost:9000";
        private String accessKey = "minioadmin";
        private String secretKey = "minioadmin";
        private String bucket = "flower-shop";
        private String publicUrl = "";
        private boolean autoCreateBucket = true;
        private boolean publicRead = true;
    }

    @Data
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>();
    }
}
