package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import com.signlanguage.entity.UserFeedback;

public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {
	Page<UserFeedback> findByUserUserId(Long userId, Pageable pageable);
	Page<UserFeedback> findByUserUserIdAndHistoryHistoryId(Long userId, Long historyId, Pageable pageable);
	Optional<UserFeedback> findByUserUserIdAndHistoryHistoryId(Long userId, Long historyId);
	Optional<UserFeedback> findByFeedbackIdAndUserUserId(Long feedbackId, Long userId);
	@Modifying
	@Transactional
	long deleteByFeedbackIdAndUserUserId(Long feedbackId, Long userId);

	@Modifying
	@Transactional
	long deleteByHistoryHistoryId(Long historyId);

	@Modifying
	@Transactional
	long deleteByHistoryUserUserId(Long userId);

}
