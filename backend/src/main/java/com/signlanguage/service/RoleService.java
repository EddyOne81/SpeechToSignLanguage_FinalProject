package com.signlanguage.service;

import com.signlanguage.dto.UpsertRoleRequest;
import com.signlanguage.entity.Permission;
import com.signlanguage.entity.Role;
import com.signlanguage.repository.PermissionRepository;
import com.signlanguage.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAll(Pageable pageable) {
        Page<Role> roles = roleRepository.findAll(pageable);
        return roles.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));
        return toResponse(role);
    }

    @Transactional
    public Map<String, Object> create(UpsertRoleRequest request) {
        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new RuntimeException("Role code is required");
        }
        if (roleRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Role code already exists");
        }

        Role role = Role.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .isSystem(request.getIsSystem() != null && request.getIsSystem())
                .permissions(resolvePermissions(request.getPermissionCodes()))
                .build();

        roleRepository.save(role);
        return toResponse(role);
    }

    @Transactional
    public Map<String, Object> update(Long id, UpsertRoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        if (request.getName() != null) {
            role.setName(request.getName());
        }
        if (request.getDescription() != null) {
            role.setDescription(request.getDescription());
        }
        if (request.getIsSystem() != null) {
            role.setIsSystem(request.getIsSystem());
        }
        if (request.getPermissionCodes() != null) {
            role.setPermissions(resolvePermissions(request.getPermissionCodes()));
        }

        roleRepository.save(role);
        return toResponse(role);
    }

    @Transactional
    public Map<String, Object> delete(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        if (Boolean.TRUE.equals(role.getIsSystem())) {
            throw new RuntimeException("System role cannot be deleted");
        }

        roleRepository.delete(role);
        return Map.of("deleted", true);
    }

    private Set<Permission> resolvePermissions(Set<String> permissionCodes) {
        Set<Permission> permissions = new HashSet<>();
        if (permissionCodes == null) {
            return permissions;
        }

        for (String code : permissionCodes) {
            Permission permission = permissionRepository.findByCode(code)
                    .orElseThrow(() -> new RuntimeException("Permission not found: " + code));
            permissions.add(permission);
        }

        return permissions;
    }

    private Map<String, Object> toResponse(Role role) {
        return Map.of(
                "roleId", role.getRoleId(),
                "code", role.getCode(),
                "name", role.getName(),
                "description", role.getDescription() == null ? "" : role.getDescription(),
                "isSystem", role.getIsSystem(),
                "permissions", role.getPermissions().stream().map(Permission::getCode).collect(Collectors.toSet()),
                "createdAt", role.getCreatedAt()
        );
    }
}