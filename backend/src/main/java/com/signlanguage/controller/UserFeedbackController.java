package com.signlanguage.controller;

import com.signlanguage.entity.TranslationHistory;
import com.signlanguage.entity.UserFeedback;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.TranslationHistoryRepository;
import com.signlanguage.repository.UserFeedbackRepository;
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
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class UserFeedbackController {

    private final UserFeedbackRepository feedbackRepository;
    private final TranslationHistoryRepository historyRepository;
    private final CurrentUserService currentUserService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyFeedbacks(Pageable pageable) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        Page<UserFeedback> page = feedbackRepository.findByUserUserIdOrderByCreatedAtDesc(user.getUserId(), pageable);
        return ResponseEntity.ok(page.map(this::toResponse));
    }

    @GetMapping("/me/{id}")
    public ResponseEntity<?> getMyFeedback(@PathVariable Long id) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        UserFeedback feedback = feedbackRepository.findByFeedbackIdAndUserUserId(id, user.getUserId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        return ResponseEntity.ok(toResponse(feedback));
    }

    @PostMapping("/me")
    public ResponseEntity<?> createMyFeedback(@RequestBody UpsertFeedbackRequest request) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        TranslationHistory history = historyRepository.findByHistoryIdAndUserUserId(request.getHistoryId(), user.getUserId())
                .orElseThrow(() -> new RuntimeException("History not found or not owned by current user"));

        UserFeedback feedback = UserFeedback.builder()
                .user(user)
                .history(history)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        feedbackRepository.save(feedback);
        return ResponseEntity.ok(toResponse(feedback));
    }

    @PutMapping("/me/{id}")
    public ResponseEntity<?> updateMyFeedback(@PathVariable Long id, @RequestBody UpsertFeedbackRequest request) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        UserFeedback feedback = feedbackRepository.findByFeedbackIdAndUserUserId(id, user.getUserId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));

        if (request.getRating() != null) {
            feedback.setRating(request.getRating());
        }
        if (request.getComment() != null) {
            feedback.setComment(request.getComment());
        }
        if (request.getHistoryId() != null) {
            TranslationHistory history = historyRepository.findByHistoryIdAndUserUserId(request.getHistoryId(), user.getUserId())
                    .orElseThrow(() -> new RuntimeException("History not found or not owned by current user"));
            feedback.setHistory(history);
        }

        feedbackRepository.save(feedback);
        return ResponseEntity.ok(toResponse(feedback));
    }

    @DeleteMapping("/me/{id}")
    public ResponseEntity<?> deleteMyFeedback(@PathVariable Long id) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        long deleted = feedbackRepository.deleteByFeedbackIdAndUserUserId(id, user.getUserId());
        return ResponseEntity.ok(Map.of("deleted", deleted > 0));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAll(Pageable pageable) {
        return ResponseEntity.ok(feedbackRepository.findAll(pageable).map(this::toResponse));
    }

    private Map<String, Object> toResponse(UserFeedback feedback) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("feedbackId", feedback.getFeedbackId());
        result.put("userId", feedback.getUser() == null ? null : feedback.getUser().getUserId());
        result.put("historyId", feedback.getHistory() == null ? null : feedback.getHistory().getHistoryId());
        result.put("rating", feedback.getRating() == null ? 0 : feedback.getRating());
        result.put("comment", feedback.getComment() == null ? "" : feedback.getComment());
        result.put("createdAt", feedback.getCreatedAt());
        return result;
    }

    @Data
    public static class UpsertFeedbackRequest {
        private Long historyId;
        private Integer rating;
        private String comment;
    }
}
