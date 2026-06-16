package com.signlanguage.controller;

import com.signlanguage.dto.UpsertRoleRequest;
import com.signlanguage.exception.ApiResponses;
import com.signlanguage.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ResponseEntity<?> getAll(Pageable pageable) {
        return ApiResponses.ok(roleService.getAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ApiResponses.ok(roleService.getById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody UpsertRoleRequest request) {
        return ApiResponses.ok(roleService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpsertRoleRequest request) {
        return ApiResponses.ok(roleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return ApiResponses.ok(roleService.delete(id));
    }
}
