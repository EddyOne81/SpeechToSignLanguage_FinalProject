package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.signlanguage.entity.TranslationHistory;

@Repository
public interface TranslationHistoryRepository extends JpaRepository<TranslationHistory, Long> {
	Page<TranslationHistory> findByUserUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
	Optional<TranslationHistory> findByHistoryIdAndUserUserId(Long historyId, Long userId);
	long deleteByHistoryIdAndUserUserId(Long historyId, Long userId);
	long deleteByUserUserId(Long userId);

}
