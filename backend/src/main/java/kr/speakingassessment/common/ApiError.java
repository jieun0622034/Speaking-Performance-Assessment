package kr.speakingassessment.common;

import java.time.Instant;

public record ApiError(String code, String error, Instant timestamp) {
    public static ApiError of(String code, String message) {
        return new ApiError(code, message, Instant.now());
    }
}
