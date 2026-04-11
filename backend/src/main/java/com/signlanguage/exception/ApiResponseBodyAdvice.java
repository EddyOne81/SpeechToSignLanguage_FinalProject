package com.signlanguage.exception;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.time.OffsetDateTime;

@RestControllerAdvice
public class ApiResponseBodyAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        if (body instanceof ApiResponse<?> || body instanceof ApiErrorResponse) {
            return body;
        }

        if (selectedConverterType != null && StringHttpMessageConverter.class.isAssignableFrom(selectedConverterType)) {
            return body;
        }

        int status = resolveStatus(response);
        if (status == HttpStatus.NO_CONTENT.value()) {
            return null;
        }

        String path = request instanceof ServletServerHttpRequest servletRequest
                ? servletRequest.getServletRequest().getRequestURI()
                : "";

        return ApiResponse.builder()
                .timestamp(OffsetDateTime.now().toString())
                .status(status)
                .code(status >= 200 && status < 300 ? "SUCCESS" : "RESPONSE")
                .message(status >= 200 && status < 300 ? "Request successful" : "Request processed")
                .path(path)
                .data(body)
                .build();
    }

    private int resolveStatus(ServerHttpResponse response) {
        if (response instanceof ServletServerHttpResponse servletResponse) {
            return servletResponse.getServletResponse().getStatus();
        }
        return HttpStatus.OK.value();
    }
}