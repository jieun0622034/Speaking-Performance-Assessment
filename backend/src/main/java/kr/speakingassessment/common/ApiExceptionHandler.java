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

    @ExceptionHandler(kr.speakingassessment.account.ApiProblem.class)
    ResponseEntity<ApiError> problem(kr.speakingassessment.account.ApiProblem e) {
        return ResponseEntity.status(e.status()).body(ApiError.of(e.code(), e.getMessage()));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiError> invalid(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(ApiError.of("INVALID_INPUT", e.getMessage()));
    }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> tooLarge() {
        return ResponseEntity.status(413).body(ApiError.of("FILE_TOO_LARGE", "파일 크기 제한을 확인해주세요."));
    }
    @ExceptionHandler(org.springframework.dao.EmptyResultDataAccessException.class)
    ResponseEntity<ApiError> missing() {
        return ResponseEntity.status(404).body(ApiError.of("NOT_FOUND", "자료를 찾지 못했습니다."));
    }
    @ExceptionHandler(org.springframework.dao.DuplicateKeyException.class)
    ResponseEntity<ApiError> duplicate() {
        return ResponseEntity.status(409).body(ApiError.of("DUPLICATE", "이미 등록된 자료입니다."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected() {
        return ResponseEntity.internalServerError().body(ApiError.of("INTERNAL_ERROR", "서버 작업을 완료하지 못했습니다."));
    }
}
