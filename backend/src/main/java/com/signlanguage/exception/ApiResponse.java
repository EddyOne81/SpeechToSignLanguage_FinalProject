package com.signlanguage.exception;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiResponse<T> {
    private String timestamp;
    private int status;
    private String code;
    private String message;
    private String path;
    private T data;
}