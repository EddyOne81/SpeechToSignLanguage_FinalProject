package com.signlanguage.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.signlanguage.dto.AuthResponse;
import com.signlanguage.entity.EmailVerificationToken;
import com.signlanguage.entity.Role;
import com.signlanguage.dto.LoginRequest;
import com.signlanguage.dto.RegisterRequest;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.EmailVerificationTokenRepository;
import com.signlanguage.repository.RoleRepository;
import com.signlanguage.repository.UserSLRepository;

import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserSLRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final EmailVerificationTokenRepository verificationTokenRepository;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        Role defaultRole = roleRepository.findByCode("ROLE_USER")
            .orElseThrow(() -> new RuntimeException("Default role ROLE_USER not found"));

        UserSignLanguage user = UserSignLanguage.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .roles(new HashSet<>())
                .build();

        user.getRoles().add(defaultRole);
        userRepository.save(user);

        sendVerificationEmail(user);

        String primaryRole = extractPrimaryRole(user);
        return AuthResponse.builder()
                .username(user.getUsername())
                .role(primaryRole)
                .emailVerified(false)
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserSignLanguage user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String primaryRole = extractPrimaryRole(user);
        return AuthResponse.builder()
                .username(user.getUsername())
                .role(primaryRole)
                .emailVerified(user.isEmailVerified())
                .build();
    }

    public String generateTokenForUser(String username) {
        UserSignLanguage user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String primaryRole = extractPrimaryRole(user);
        return jwtService.generateToken(username, primaryRole);
    }

    public void verifyEmail(String tokenValue) {
        EmailVerificationToken token = verificationTokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new RuntimeException("Invalid verification token"));

        if (token.isUsed()) {
            throw new RuntimeException("Verification token already used");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Verification token expired");
        }

        UserSignLanguage user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        token.setUsed(true);
        verificationTokenRepository.save(token);
    }

    public void resendVerificationEmail(String username) {
        UserSignLanguage user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Email already verified");
        }

        verificationTokenRepository.deleteByUser(user);
        sendVerificationEmail(user);
    }

    private void sendVerificationEmail(UserSignLanguage user) {
        String tokenValue = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .token(tokenValue)
                .user(user)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .used(false)
                .build();
        verificationTokenRepository.save(verificationToken);

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), tokenValue);
        }
    }

    private String extractPrimaryRole(UserSignLanguage user) {
        return user.getRoles().stream()
            .map(Role::getCode)
            .findFirst()
            .orElse("ROLE_USER");
    }
}
