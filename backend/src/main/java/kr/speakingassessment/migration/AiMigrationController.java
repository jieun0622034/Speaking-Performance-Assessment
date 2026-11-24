package kr.speakingassessment.migration;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.speakingassessment.common.ApiError;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "이식 예정", description = "기존 프런트엔드 호출 경로를 보존합니다. AI 구현 전이며 성공·모의 채점 결과를 반환하지 않습니다.")
public class AiMigrationController {
    @PostMapping({"/api/rubric/generate", "/api/grade/speaking", "/api/grade/writing", "/api/grade/both", "/api/record/generate"})
    @Operation(summary = "기존 Node AI 기능 · Spring Boot 이식 예정")
    @ApiResponse(responseCode = "501", description = "아직 Spring Boot로 이식하지 않은 기능")
    public ResponseEntity<ApiError> notImplemented() {
        return ResponseEntity.status(501).body(ApiError.of("AI_MIGRATION_PENDING",
                "AI 기능은 Spring Boot로 이식 중입니다. 현재는 개발 환경만 구성되어 있습니다."));
    }
}
