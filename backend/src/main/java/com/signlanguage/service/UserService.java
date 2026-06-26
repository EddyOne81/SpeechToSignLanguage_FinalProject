package com.signlanguage.service;

import com.signlanguage.dto.ChangePasswordRequest;
import com.signlanguage.dto.UpdateMeRequest;
import com.signlanguage.dto.UpsertUserRequest;
import com.signlanguage.entity.Role;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.RoleRepository;
import com.signlanguage.repository.TranslationHistoryRepository;
import com.signlanguage.repository.UserFeedbackRepository;
import com.signlanguage.repository.UserSLRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserSLRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final TranslationHistoryRepository historyRepository;
    private final UserFeedbackRepository feedbackRepository;

    private static final String ADMIN_ROLE = "ROLE_ADMIN";

    private boolean isAdmin(UserSignLanguage user) {
        return user.getRoles().stream().anyMatch(r -> ADMIN_ROLE.equals(r.getCode()));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> me() {
        return toUserResponse(currentUserService.requireCurrentUser());
    }

    @Transactional
    public Map<String, Object> updateMe(UpdateMeRequest request) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (!request.getEmail().equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        userRepository.save(user);
        return toUserResponse(user);
    }

    @Transactional
    public Map<String, Object> changeMyPassword(ChangePasswordRequest request) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        if (request.getOldPassword() == null || request.getNewPassword() == null) {
            throw new RuntimeException("oldPassword and newPassword are required");
        }

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Old password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        return Map.of("message", "Password updated");
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllUsers(Pageable pageable) {
        Page<UserSignLanguage> users = userRepository.findAll(pageable);
        return users.map(this::toUserResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserById(Long id) {
        UserSignLanguage user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return toUserResponse(user);
    }

    @Transactional
    public Map<String, Object> createUser(UpsertUserRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank() ||
                request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("username and password are required");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        if (request.getEmail() != null && !request.getEmail().isBlank() && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        Set<Role> roles = resolveRoles(request.getRoleCodes());

        UserSignLanguage user = UserSignLanguage.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .roles(roles)
                .build();

        userRepository.save(user);
        return toUserResponse(user);
    }

    @Transactional
    public Map<String, Object> updateUser(Long id, UpsertUserRequest request) {
        UserSignLanguage user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (!request.getEmail().equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoleCodes() != null && !request.getRoleCodes().isEmpty()) {
            // Admin accounts are protected: their role cannot be changed from the panel.
            if (isAdmin(user)) {
                throw new RuntimeException("Admin roles cannot be changed.");
            }
            user.setRoles(resolveRoles(request.getRoleCodes()));
        }

        userRepository.save(user);
        return toUserResponse(user);
    }

    @Transactional
    public Map<String, Object> deleteUser(Long id) {
        UserSignLanguage user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // Admin accounts are protected and can never be deleted from the panel.
        if (isAdmin(user)) {
            throw new RuntimeException("Admin accounts cannot be deleted.");
        }
        // Remove dependent rows first so FK constraints don't block the delete:
        // a user's feedbacks reference both the user and their histories.
        feedbackRepository.deleteByUserUserId(id);
        historyRepository.deleteByUserUserId(id);
        userRepository.delete(user);
        return Map.of("deleted", true);
    }

    private Set<Role> resolveRoles(Set<String> roleCodes) {
        Set<String> codes = roleCodes == null || roleCodes.isEmpty()
                ? Set.of("ROLE_USER")
                : roleCodes;

        Set<Role> roles = new HashSet<>();
        for (String code : codes) {
            Role role = roleRepository.findByCode(code)
                    .orElseThrow(() -> new RuntimeException("Role not found: " + code));
            roles.add(role);
        }
        return roles;
    }

    private Map<String, Object> toUserResponse(UserSignLanguage user) {
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("userId", user.getUserId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail() == null ? "" : user.getEmail());
        map.put("emailVerified", user.isEmailVerified());
        map.put("roles", user.getRoles().stream().map(Role::getCode).collect(Collectors.toSet()));
        map.put("createdAt", user.getCreatedAt());
        return map;
    }
}