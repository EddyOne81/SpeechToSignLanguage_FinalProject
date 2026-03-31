package com.signlanguage.config;

import com.signlanguage.entity.Permission;
import com.signlanguage.entity.Role;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.PermissionRepository;
import com.signlanguage.repository.RoleRepository;
import com.signlanguage.repository.UserSLRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
public class SecuritySeedDataConfig {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
        private final UserSLRepository userRepository;
        private final PasswordEncoder passwordEncoder;

        @Value("${app.bootstrap.admin.username:admin}")
        private String adminUsername;

        @Value("${app.bootstrap.admin.email:admin@signlanguage.local}")
        private String adminEmail;

        @Value("${app.bootstrap.admin.password:Admin@123456}")
        private String adminPassword;

    @Bean
    CommandLineRunner seedSecurityData() {
        return args -> {
            Permission userProfileRead = ensurePermission("USER_PROFILE_READ", "Read profile", "USER", "Read own profile");
            Permission userProfileUpdate = ensurePermission("USER_PROFILE_UPDATE", "Update profile", "USER", "Update own profile");
            Permission translateExecute = ensurePermission("TRANSLATE_EXECUTE", "Execute translation", "TRANSLATE", "Call translation flow");
            Permission historyRead = ensurePermission("HISTORY_READ", "Read history", "HISTORY", "Read own translation history");
            Permission historyDelete = ensurePermission("HISTORY_DELETE", "Delete history", "HISTORY", "Delete own translation history");
            Permission dictionaryRead = ensurePermission("DICTIONARY_READ", "Read dictionary", "DICTIONARY", "Search dictionary");
            Permission dictionaryWrite = ensurePermission("DICTIONARY_WRITE", "Write dictionary", "DICTIONARY", "Create, update and delete dictionary entries");
            Permission feedbackWrite = ensurePermission("FEEDBACK_WRITE", "Write feedback", "FEEDBACK", "Create feedback");
            Permission notificationRead = ensurePermission("NOTIFICATION_READ", "Read notification", "NOTIFICATION", "Read notifications");
            Permission notificationWrite = ensurePermission("NOTIFICATION_WRITE", "Write notification", "NOTIFICATION", "Create notifications");

            Role userRole = ensureRoleWithPermissions(
                    "ROLE_USER",
                    "User",
                    "Default user role",
                    Set.of(
                            userProfileRead,
                            userProfileUpdate,
                            translateExecute,
                            historyRead,
                            historyDelete,
                            dictionaryRead,
                            feedbackWrite,
                            notificationRead
                    )
            );

            Role adminRole = ensureRoleWithPermissions(
                    "ROLE_ADMIN",
                    "Admin",
                    "Administrator role",
                    new HashSet<>(List.of(
                            userProfileRead,
                            userProfileUpdate,
                            translateExecute,
                            historyRead,
                            historyDelete,
                            dictionaryRead,
                            dictionaryWrite,
                            feedbackWrite,
                            notificationRead,
                            notificationWrite
                    ))
            );

            ensureDefaultAdminUser(adminRole, userRole);
        };
    }

    private Permission ensurePermission(String code, String name, String module, String description) {
        return permissionRepository.findByCode(code)
                .orElseGet(() -> permissionRepository.save(Permission.builder()
                        .code(code)
                        .name(name)
                        .module(module)
                        .description(description)
                        .build()));
    }

    private Role ensureRoleWithPermissions(String code, String name, String description, Set<Permission> permissions) {
    Role role = roleRepository.findByCode(code)
            .orElseGet(() -> roleRepository.save(Role.builder()
                    .code(code)
                    .name(name)
                    .description(description)
                    .isSystem(true)
                    .build()));

    role.setPermissions(new HashSet<>(permissions));
            return roleRepository.save(role);
    }

    private void ensureDefaultAdminUser(Role adminRole, Role userRole) {
            userRepository.findByUsername(adminUsername).ifPresentOrElse(existing -> {
                    Set<Role> roles = existing.getRoles() == null ? new HashSet<>() : new HashSet<>(existing.getRoles());
                    boolean changed = roles.add(adminRole);
                    changed = roles.add(userRole) || changed;

                    if (changed) {
                            existing.setRoles(roles);
                            userRepository.save(existing);
                    }
            }, () -> {
                    String emailToUse = resolveAdminEmail();

                    UserSignLanguage admin = UserSignLanguage.builder()
                                    .username(adminUsername)
                                    .email(emailToUse)
                                    .passwordHash(passwordEncoder.encode(adminPassword))
                                    .roles(new HashSet<>())
                                    .build();

                    admin.getRoles().add(adminRole);
                    admin.getRoles().add(userRole);

                    userRepository.save(admin);
            });
    }

    private String resolveAdminEmail() {
            if (!userRepository.existsByEmail(adminEmail)) {
                    return adminEmail;
            }

            String fallbackEmail = adminUsername + "@local.invalid";
            if (!userRepository.existsByEmail(fallbackEmail)) {
                    return fallbackEmail;
            }

            return "admin+" + System.currentTimeMillis() + "@local.invalid";
    }
}
