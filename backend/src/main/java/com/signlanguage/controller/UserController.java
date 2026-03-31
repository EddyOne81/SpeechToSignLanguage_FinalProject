package com.signlanguage.controller;

import com.signlanguage.dto.ChangePasswordRequest;
import com.signlanguage.dto.UpdateMeRequest;
import com.signlanguage.dto.UpsertUserRequest;
import com.signlanguage.exception.ApiResponses;
import com.signlanguage.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        return ApiResponses.ok(userService.me());
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody UpdateMeRequest request) {
        return ApiResponses.ok(userService.updateMe(request));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<?> changeMyPassword(@RequestBody ChangePasswordRequest request) {
        return ApiResponses.ok(userService.changeMyPassword(request));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllUsers(Pageable pageable) {
        return ApiResponses.ok(userService.getAllUsers(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        return ApiResponses.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody UpsertUserRequest request) {
        return ApiResponses.ok(userService.createUser(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UpsertUserRequest request) {
        return ApiResponses.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return ApiResponses.ok(userService.deleteUser(id));
    }
}
