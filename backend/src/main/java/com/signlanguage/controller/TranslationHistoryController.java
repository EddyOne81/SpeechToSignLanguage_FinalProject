package com.signlanguage.controller;

import com.signlanguage.entity.SignDictionary;
import com.signlanguage.entity.TranslationHistory;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.SignDictionaryRepository;
import com.signlanguage.repository.TranslationHistoryRepository;
import com.signlanguage.service.CurrentUserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/histories")
@RequiredArgsConstructor
public class TranslationHistoryController {

    private final TranslationHistoryRepository historyRepository;
    private final SignDictionaryRepository dictionaryRepository;
    private final CurrentUserService currentUserService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyHistories(Pageable pageable) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        Page<TranslationHistory> page = historyRepository.findByUserUserIdOrderByCreatedAtDesc(user.getUserId(), pageable);
        return ResponseEntity.ok(page.map(this::toResponse));
    }

    @GetMapping("/me/{id}")
    public ResponseEntity<?> getMyHistory(@PathVariable Long id) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        TranslationHistory history = historyRepository.findByHistoryIdAndUserUserId(id, user.getUserId())
                .orElseThrow(() -> new RuntimeException("History not found"));
        return ResponseEntity.ok(toResponse(history));
    }

    @PostMapping("/me")
    public ResponseEntity<?> createMyHistory(@RequestBody UpsertHistoryRequest request) {
        UserSignLanguage user = currentUserService.requireCurrentUser();

        TranslationHistory history = TranslationHistory.builder()
                .user(user)
                .word(resolveWord(request.getWordId()))
                .inputText(request.getInputText())
                .fswResult(request.getFswResult())
                .poseFilePath(request.getPoseFilePath())
                .processingTimeMs(request.getProcessingTimeMs())
                .build();

        historyRepository.save(history);
        return ResponseEntity.ok(toResponse(history));
    }

    @PutMapping("/me/{id}")
    public ResponseEntity<?> updateMyHistory(@PathVariable Long id, @RequestBody UpsertHistoryRequest request) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        TranslationHistory history = historyRepository.findByHistoryIdAndUserUserId(id, user.getUserId())
                .orElseThrow(() -> new RuntimeException("History not found"));

        if (request.getWordId() != null) {
            history.setWord(resolveWord(request.getWordId()));
        }
        if (request.getInputText() != null) {
            history.setInputText(request.getInputText());
        }
        if (request.getFswResult() != null) {
            history.setFswResult(request.getFswResult());
        }
        if (request.getPoseFilePath() != null) {
            history.setPoseFilePath(request.getPoseFilePath());
        }
        if (request.getProcessingTimeMs() != null) {
            history.setProcessingTimeMs(request.getProcessingTimeMs());
        }

        historyRepository.save(history);
        return ResponseEntity.ok(toResponse(history));
    }

    @DeleteMapping("/me/{id}")
    public ResponseEntity<?> deleteMyHistory(@PathVariable Long id) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        long deleted = historyRepository.deleteByHistoryIdAndUserUserId(id, user.getUserId());
        return ResponseEntity.ok(Map.of("deleted", deleted > 0));
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAllMyHistories() {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        long deleted = historyRepository.deleteByUserUserId(user.getUserId());
        return ResponseEntity.ok(Map.of("deletedCount", deleted));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAll(Pageable pageable) {
        return ResponseEntity.ok(historyRepository.findAll(pageable).map(this::toResponse));
    }

    private SignDictionary resolveWord(Long wordId) {
        if (wordId == null) {
            return null;
        }
        return dictionaryRepository.findById(wordId)
                .orElseThrow(() -> new RuntimeException("Dictionary word not found"));
    }

    private Map<String, Object> toResponse(TranslationHistory history) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("historyId", history.getHistoryId());
        result.put("userId", history.getUser() == null ? null : history.getUser().getUserId());
        result.put("wordId", history.getWord() == null ? null : history.getWord().getWordId());
        result.put("inputText", history.getInputText() == null ? "" : history.getInputText());
        result.put("fswResult", history.getFswResult() == null ? "" : history.getFswResult());
        result.put("poseFilePath", history.getPoseFilePath() == null ? "" : history.getPoseFilePath());
        result.put("processingTimeMs", history.getProcessingTimeMs() == null ? 0 : history.getProcessingTimeMs());
        result.put("createdAt", history.getCreatedAt());
        return result;
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
