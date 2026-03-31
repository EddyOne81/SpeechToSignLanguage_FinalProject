package com.signlanguage.controller;

import com.signlanguage.dto.UpsertDictionaryRequest;
import com.signlanguage.service.SignDictionaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dictionaries")
@RequiredArgsConstructor
public class SignDictionaryController {

    private final SignDictionaryService signDictionaryService;

    @GetMapping
    public ResponseEntity<?> search(@RequestParam(value = "q", required = false) String q, Pageable pageable) {
        return ResponseEntity.ok(signDictionaryService.search(q, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ResponseEntity.ok(signDictionaryService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DICTIONARY_WRITE')")
    public ResponseEntity<?> create(@RequestBody UpsertDictionaryRequest request) {
        return ResponseEntity.ok(signDictionaryService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DICTIONARY_WRITE')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpsertDictionaryRequest request) {
        return ResponseEntity.ok(signDictionaryService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('DICTIONARY_WRITE')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return ResponseEntity.ok(signDictionaryService.delete(id));
    }
}
