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
