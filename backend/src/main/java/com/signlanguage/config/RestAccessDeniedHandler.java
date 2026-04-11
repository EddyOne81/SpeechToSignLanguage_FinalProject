package com.signlanguage.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.OffsetDateTime;

@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException, ServletException {
        String payload = "{"
                + "\"timestamp\":\"" + OffsetDateTime.now() + "\"," 
                + "\"status\":" + HttpStatus.FORBIDDEN.value() + ","
                + "\"error\":\"" + HttpStatus.FORBIDDEN.getReasonPhrase() + "\"," 
                + "\"code\":\"FORBIDDEN\"," 
                + "\"message\":\"You do not have permission to access this resource\"," 
                + "\"path\":\"" + escapeJson(request.getRequestURI()) + "\"," 
                + "\"details\":null"
                + "}";

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(payload);
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
