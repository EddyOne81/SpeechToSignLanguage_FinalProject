package com.signlanguage.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.signlanguage.dto.AuthResponse;
import com.signlanguage.entity.Role;
import com.signlanguage.dto.LoginRequest;
import com.signlanguage.dto.RegisterRequest;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.RoleRepository;
import com.signlanguage.repository.UserSLRepository;

import lombok.RequiredArgsConstructor;

import java.util.HashSet;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserSLRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

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
            .roles(new HashSet<>())
                .build();

        user.getRoles().add(defaultRole);

        userRepository.save(user);

        String primaryRole = extractPrimaryRole(user);
        String token = jwtService.generateToken(user.getUsername(), primaryRole);
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .username(user.getUsername())
            .role(primaryRole)
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserSignLanguage user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String primaryRole = extractPrimaryRole(user);
        String token = jwtService.generateToken(user.getUsername(), primaryRole);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .username(user.getUsername())
            .role(primaryRole)
                .build();
    }

        private String extractPrimaryRole(UserSignLanguage user) {
        return user.getRoles().stream()
            .map(Role::getCode)
            .findFirst()
            .orElse("ROLE_USER");
        }
}