package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.signlanguage.entity.UserFeedback;

@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {
	Page<UserFeedback> findByUserUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
	Optional<UserFeedback> findByFeedbackIdAndUserUserId(Long feedbackId, Long userId);
	long deleteByFeedbackIdAndUserUserId(Long feedbackId, Long userId);

}
