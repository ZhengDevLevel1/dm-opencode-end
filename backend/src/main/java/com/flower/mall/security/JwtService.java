package com.flower.mall.security;

import com.flower.mall.common.enums.UserRole;
import com.flower.mall.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final AppProperties properties;

    public JwtService(AppProperties properties) {
        this.properties = properties;
        byte[] secret = properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes long");
        }
        this.secretKey = Keys.hmacShaKeyFor(secret);
    }

    public TokenInfo generateToken(Long userId, String username, UserRole role) {
        String jti = UUID.randomUUID().toString().replace("-", "");
        Instant now = Instant.now();
        long expirationSeconds = properties.getJwt().getExpirationSeconds();
        Instant expiresAt = now.plusSeconds(expirationSeconds);
        String token = Jwts.builder()
                .id(jti)
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role.name())
                .issuer(properties.getJwt().getIssuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(secretKey)
                .compact();
        return new TokenInfo(token, jti, expiresAt, expirationSeconds);
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .requireIssuer(properties.getJwt().getIssuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long expirationSeconds() {
        return properties.getJwt().getExpirationSeconds();
    }

    public record TokenInfo(String token, String jti, Instant expiresAt, long expiresInSeconds) {
    }
}
