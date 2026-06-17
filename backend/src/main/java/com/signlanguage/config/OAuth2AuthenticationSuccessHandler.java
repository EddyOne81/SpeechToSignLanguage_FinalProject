package com.signlanguage.config;

import com.signlanguage.entity.Role;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.RoleRepository;
import com.signlanguage.repository.UserSLRepository;
import com.signlanguage.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashSet;

@Component
@ConditionalOnExpression("!'${google.oauth2.client-id:}'.isEmpty()")
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final UserSLRepository userRepository;
    private final RoleRepository roleRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        if (email == null) {
            response.sendRedirect(frontendUrl + "/?error=oauth2_no_email");
            return;
        }

        UserSignLanguage user = userRepository.findByEmail(email).orElseGet(() -> {
            String username = sanitizeUsername(name != null ? name : email.split("@")[0]);
            username = ensureUniqueUsername(username);

            Role defaultRole = roleRepository.findByCode("ROLE_USER")
                    .orElseThrow(() -> new RuntimeException("Default role not found"));

            UserSignLanguage newUser = UserSignLanguage.builder()
                    .username(username)
                    .email(email)
                    .passwordHash("")
                    .emailVerified(true)
                    .roles(new HashSet<>())
                    .build();
            newUser.getRoles().add(defaultRole);
            return userRepository.save(newUser);
        });

        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        String primaryRole = user.getRoles().stream()
                .map(Role::getCode)
                .findFirst()
                .orElse("ROLE_USER");

        String jwt = jwtService.generateToken(user.getUsername(), primaryRole);

        Cookie cookie = new Cookie("s2s_jwt", jwt);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(86400);
        response.addCookie(cookie);

        clearAuthenticationAttributes(request);
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        response.sendRedirect(frontendUrl + "/");
    }

    private String sanitizeUsername(String raw) {
        return raw.replaceAll("[^a-zA-Z0-9_]", "_").toLowerCase();
    }

    private String ensureUniqueUsername(String base) {
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }
}
