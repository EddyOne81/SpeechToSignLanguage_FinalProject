package com.signlanguage.service;

import com.signlanguage.dto.UpsertPermissionRequest;
import com.signlanguage.entity.Permission;
import com.signlanguage.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public Page<Permission> getAll(Pageable pageable) {
        return permissionRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Permission getById(Long id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permission not found"));
    }

    @Transactional
    public Permission create(UpsertPermissionRequest request) {
        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new RuntimeException("Permission code is required");
        }
        if (permissionRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Permission code already exists");
        }

        Permission permission = Permission.builder()
                .code(request.getCode())
                .name(request.getName())
                .module(request.getModule())
                .description(request.getDescription())
                .build();

        permissionRepository.save(permission);
        return permission;
    }

    @Transactional
    public Permission update(Long id, UpsertPermissionRequest request) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permission not found"));

        if (request.getName() != null) {
            permission.setName(request.getName());
        }
        if (request.getModule() != null) {
            permission.setModule(request.getModule());
        }
        if (request.getDescription() != null) {
            permission.setDescription(request.getDescription());
        }

        permissionRepository.save(permission);
        return permission;
    }

    @Transactional
    public Map<String, Object> delete(Long id) {
        if (!permissionRepository.existsById(id)) {
            throw new RuntimeException("Permission not found");
        }
        permissionRepository.deleteById(id);
        return Map.of("deleted", true);
    }
}