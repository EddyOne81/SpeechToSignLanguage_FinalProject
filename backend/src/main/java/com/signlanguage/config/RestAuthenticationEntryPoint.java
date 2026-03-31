package com.signlanguage.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.OffsetDateTime;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        String payload = "{"
                + "\"timestamp\":\"" + OffsetDateTime.now() + "\"," 
                + "\"status\":" + HttpStatus.UNAUTHORIZED.value() + ","
                + "\"error\":\"" + HttpStatus.UNAUTHORIZED.getReasonPhrase() + "\"," 
                + "\"code\":\"UNAUTHORIZED\"," 
                + "\"message\":\"Authentication is required\"," 
                + "\"path\":\"" + escapeJson(request.getRequestURI()) + "\"," 
                + "\"details\":null"
                + "}";

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
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
