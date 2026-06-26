package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.signlanguage.entity.TranslationHistory;

public interface TranslationHistoryRepository extends JpaRepository<TranslationHistory, Long> {
	// Sort-aware variants — order comes from the Pageable so the UI can pick latest/oldest.
	Page<TranslationHistory> findByUserUserId(Long userId, Pageable pageable);
	Page<TranslationHistory> findByUserUserIdAndInputTextContainingIgnoreCase(Long userId, String inputText, Pageable pageable);
	Optional<TranslationHistory> findByHistoryIdAndUserUserId(Long historyId, Long userId);
	long deleteByHistoryIdAndUserUserId(Long historyId, Long userId);
	long deleteByUserUserId(Long userId);

}
