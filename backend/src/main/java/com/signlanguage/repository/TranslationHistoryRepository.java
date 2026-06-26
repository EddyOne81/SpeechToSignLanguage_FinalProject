package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import com.signlanguage.entity.TranslationHistory;

public interface TranslationHistoryRepository extends JpaRepository<TranslationHistory, Long> {
	// Eagerly fetch the to-one relations the response mapping reads (user, word)
	// so listing histories is a single query instead of an N+1 lazy-load storm.
	@Override
	@EntityGraph(attributePaths = {"user", "word"})
	Page<TranslationHistory> findAll(Pageable pageable);

	// Sort-aware variants — order comes from the Pageable so the UI can pick latest/oldest.
	@EntityGraph(attributePaths = {"user", "word"})
	Page<TranslationHistory> findByUserUserId(Long userId, Pageable pageable);
	@EntityGraph(attributePaths = {"user", "word"})
	Page<TranslationHistory> findByUserUserIdAndInputTextContainingIgnoreCase(Long userId, String inputText, Pageable pageable);
	Optional<TranslationHistory> findByHistoryIdAndUserUserId(Long historyId, Long userId);
	long deleteByHistoryIdAndUserUserId(Long historyId, Long userId);
	long deleteByUserUserId(Long userId);

}
