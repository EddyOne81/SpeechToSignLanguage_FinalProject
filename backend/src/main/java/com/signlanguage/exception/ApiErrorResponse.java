package com.signlanguage.exception;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiErrorResponse {
    private String timestamp;
    private int status;
    private String error;
    private String code;
    private String message;
    private String path;
    private Object details;
}
