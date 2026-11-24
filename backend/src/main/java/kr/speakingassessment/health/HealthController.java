package kr.speakingassessment.health;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "개발 환경", description = "프런트엔드·백엔드·DB 연결 확인")
public class HealthController {
    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record HealthResponse(String status, String service, String database) {}

    @GetMapping("/api/health")
    @Operation(summary = "서버·DB 연결 확인")
    public HealthResponse health() {
        Integer result = jdbc.queryForObject("SELECT 1", Integer.class);
        if (result == null || result != 1) throw new IllegalStateException("Database health check failed");
        return new HealthResponse("UP", "speaking-assessment-api", "UP");
    }
}
