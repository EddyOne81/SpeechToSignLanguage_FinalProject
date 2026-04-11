package com.signlanguage.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.OffsetDateTime;

public final class ApiResponses {

    private ApiResponses() {
    }

    public static <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder()
                .timestamp(OffsetDateTime.now().toString())
                .status(200)
                .code("SUCCESS")
                .message("Request successful")
                .path(resolvePath())
                .data(data)
                .build());
    }

    private static String resolvePath() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null || attributes.getRequest() == null) {
            return "";
        }
        return attributes.getRequest().getRequestURI();
    }
}