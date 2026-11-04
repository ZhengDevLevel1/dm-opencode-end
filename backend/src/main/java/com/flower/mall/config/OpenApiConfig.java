package com.flower.mall.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "BearerAuth";

    @Bean
    public OpenAPI flowerShopOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("花店管理系统 API")
                        .description("基于内容匹配与多因素加权的花店智能推荐系统后端接口")
                        .version("1.0.0")
                        .contact(new Contact().name("毕业设计项目组")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME))
                .components(new Components().addSecuritySchemes(SECURITY_SCHEME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("登录后获取的 JWT 令牌，格式：Bearer {token}")));
    }
}
