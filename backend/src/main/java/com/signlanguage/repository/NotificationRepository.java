package com.signlanguage.repository;

import com.signlanguage.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    long countByUserUserIdAndIsReadFalse(Long userId);
    Optional<Notification> findByNotificationIdAndUserUserId(Long notificationId, Long userId);
    List<Notification> findByUserUserIdAndIsReadFalse(Long userId);
    long deleteByNotificationIdAndUserUserId(Long notificationId, Long userId);
}
