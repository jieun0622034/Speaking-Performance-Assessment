package kr.speakingassessment.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI openAPI() {
        return new OpenAPI().info(new Info()
                .title("말하기 수행평가 API")
                .version("0.1.0")
                .description("React + Spring Boot 개발 환경. 상태 확인 API는 구현됨. "
                        + "기존 Node AI API는 이식 예정이며 501 응답을 반환합니다."));
    }
}
