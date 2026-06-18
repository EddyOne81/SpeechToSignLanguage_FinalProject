package com.signlanguage.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Set;

@Component
public class EmailVerificationFilter extends OncePerRequestFilter {

    private static final Set<String> EXEMPT_PREFIXES = Set.of(
            "/api/auth/",
            "/oauth2/",
            "/login/oauth2/",
            "/error",
            "/api/translate/"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !isExempt(request.getRequestURI())) {
            boolean unverified = auth.getAuthorities().stream()
                    .anyMatch(a -> "EMAIL_UNVERIFIED".equals(a.getAuthority()));

            if (unverified) {
                writeEmailNotVerifiedResponse(request, response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isExempt(String uri) {
        for (String prefix : EXEMPT_PREFIXES) {
            if (uri.startsWith(prefix)) return true;
        }
        return false;
    }

    private void writeEmailNotVerifiedResponse(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        String payload = "{"
                + "\"timestamp\":\"" + OffsetDateTime.now() + "\","
                + "\"status\":" + HttpStatus.FORBIDDEN.value() + ","
                + "\"error\":\"" + HttpStatus.FORBIDDEN.getReasonPhrase() + "\"," 
                + "\"code\":\"EMAIL_NOT_VERIFIED\","
                + "\"message\":\"Please verify your email before accessing this resource\","
                + "\"path\":\"" + escapeJson(request.getRequestURI()) + "\","
                + "\"details\":null"
                + "}";

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(payload);
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
