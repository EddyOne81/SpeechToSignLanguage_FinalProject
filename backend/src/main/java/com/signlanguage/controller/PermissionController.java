package com.signlanguage.controller;

import com.signlanguage.dto.UpsertPermissionRequest;
import com.signlanguage.exception.ApiResponses;
import com.signlanguage.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<?> getAll(Pageable pageable) {
        return ApiResponses.ok(permissionService.getAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ApiResponses.ok(permissionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody UpsertPermissionRequest request) {
        return ApiResponses.ok(permissionService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpsertPermissionRequest request) {
        return ApiResponses.ok(permissionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return ApiResponses.ok(permissionService.delete(id));
    }
}
