package com.signlanguage.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<Map<String, String>> details = ex.getBindingResult().getAllErrors().stream()
                .map(error -> {
                    String field = error instanceof FieldError ? ((FieldError) error).getField() : error.getObjectName();
                    return Map.of(
                            "field", field,
                            "message", error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()
                    );
                })
                .toList();

        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Validation failed", request.getRequestURI(), details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraint(ConstraintViolationException ex, HttpServletRequest request) {
        List<String> details = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .toList();

        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Constraint validation failed", request.getRequestURI(), details);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleBadBody(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_REQUEST_BODY", "Malformed JSON request body", request.getRequestURI(), null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied", request.getRequestURI(), null);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiErrorResponse> handleRuntime(RuntimeException ex, HttpServletRequest request) {
        ErrorMapping mapping = classify(ex.getMessage());
        return build(mapping.status(), mapping.code(), safeMessage(ex.getMessage(), mapping.defaultMessage()), request.getRequestURI(), null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnknown(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Unexpected server error", request.getRequestURI(), null);
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String code, String message, String path, Object details) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(OffsetDateTime.now().toString())
                .status(status.value())
                .error(status.getReasonPhrase())
                .code(code)
                .message(message)
                .path(path)
                .details(details)
                .build();

        return ResponseEntity.status(status).body(body);
    }

    private ErrorMapping classify(String message) {
        if (message == null || message.isBlank()) {
            return new ErrorMapping(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Request failed");
        }

        String m = message.toLowerCase();
        if (m.contains("unauthenticated") || m.contains("invalid credentials") || m.contains("token")) {
            return new ErrorMapping(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
        }
        if (m.contains("forbidden") || m.contains("access denied")) {
            return new ErrorMapping(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
        }
        if (m.contains("not found")) {
            return new ErrorMapping(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found");
        }
        if (m.contains("already exists") || m.contains("duplicate")) {
            return new ErrorMapping(HttpStatus.CONFLICT, "CONFLICT", "Resource already exists");
        }
        if (m.contains("required") || m.contains("invalid") || m.contains("incorrect")) {
            return new ErrorMapping(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid request");
        }

        return new ErrorMapping(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Request failed");
    }

    private String safeMessage(String message, String fallback) {
        return (message == null || message.isBlank()) ? fallback : message;
    }

    private record ErrorMapping(HttpStatus status, String code, String defaultMessage) {
    }
}
