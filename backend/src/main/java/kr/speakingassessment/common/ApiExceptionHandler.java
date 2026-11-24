package kr.speakingassessment.common;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> invalidJson() {
        return ResponseEntity.badRequest().body(ApiError.of("INVALID_JSON", "올바른 JSON 요청이 필요합니다."));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    ResponseEntity<ApiError> notFound() {
        return ResponseEntity.status(404).body(ApiError.of("NOT_FOUND", "요청한 API를 찾지 못했습니다."));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> wrongMethod() {
        return ResponseEntity.status(405).body(ApiError.of("METHOD_NOT_ALLOWED", "지원하지 않는 HTTP 메서드입니다."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected() {
        return ResponseEntity.internalServerError().body(ApiError.of("INTERNAL_ERROR", "서버 작업을 완료하지 못했습니다."));
    }
}
