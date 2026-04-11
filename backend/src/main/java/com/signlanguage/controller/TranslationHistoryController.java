package com.signlanguage.controller;

import com.signlanguage.exception.ApiResponses;
import com.signlanguage.service.TranslationHistoryService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/histories")
@RequiredArgsConstructor
public class TranslationHistoryController {

    private final TranslationHistoryService translationHistoryService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyHistories(Pageable pageable) {
        return ApiResponses.ok(translationHistoryService.getMyHistories(pageable));
    }

    @GetMapping("/me/{id}")
    public ResponseEntity<?> getMyHistory(@PathVariable Long id) {
        return ApiResponses.ok(translationHistoryService.getMyHistory(id));
    }

    @PostMapping("/me")
    public ResponseEntity<?> createMyHistory(@RequestBody UpsertHistoryRequest request) {
        return ApiResponses.ok(translationHistoryService.createMyHistory(
            request.getWordId(),
            request.getInputText(),
            request.getFswResult(),
            request.getPoseFilePath(),
            request.getProcessingTimeMs()
        ));
    }

    @PutMapping("/me/{id}")
    public ResponseEntity<?> updateMyHistory(@PathVariable Long id, @RequestBody UpsertHistoryRequest request) {
        return ApiResponses.ok(translationHistoryService.updateMyHistory(
                id,
                request.getWordId(),
                request.getInputText(),
                request.getFswResult(),
                request.getPoseFilePath(),
                request.getProcessingTimeMs()
        ));
    }

    @DeleteMapping("/me/{id}")
    public ResponseEntity<?> deleteMyHistory(@PathVariable Long id) {
        return ApiResponses.ok(translationHistoryService.deleteMyHistory(id));
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAllMyHistories() {
        return ApiResponses.ok(translationHistoryService.deleteAllMyHistories());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAll(Pageable pageable) {
        return ApiResponses.ok(translationHistoryService.getAll(pageable));
    }

    @Data
    public static class UpsertHistoryRequest {
        private Long wordId;
        private String inputText;
        private String fswResult;
        private String poseFilePath;
        private Integer processingTimeMs;
    }
}
