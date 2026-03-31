package com.signlanguage.repository;

import com.signlanguage.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    long countByUserUserIdAndIsReadFalse(Long userId);
}
