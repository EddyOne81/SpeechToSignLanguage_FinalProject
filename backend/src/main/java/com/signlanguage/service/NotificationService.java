package com.signlanguage.service;

import com.signlanguage.dto.CreateNotificationRequest;
import com.signlanguage.entity.Notification;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.NotificationRepository;
import com.signlanguage.repository.UserSLRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserSLRepository userRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getMyNotifications(Pageable pageable) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        Page<Notification> page = notificationRepository.findByUserUserIdOrderByCreatedAtDesc(user.getUserId(), pageable);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUnreadCount() {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        long count = notificationRepository.countByUserUserIdAndIsReadFalse(user.getUserId());
        return Map.of("unreadCount", count);
    }

    @Transactional
    public Map<String, Object> markRead(Long id) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        Notification notification = notificationRepository.findByNotificationIdAndUserUserId(id, user.getUserId())
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
        return toResponse(notification);
    }

    @Transactional
    public Map<String, Object> markAllRead() {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        List<Notification> unread = notificationRepository.findByUserUserIdAndIsReadFalse(user.getUserId());
        LocalDateTime now = LocalDateTime.now();
        unread.forEach(n -> {
            n.setIsRead(true);
            n.setReadAt(now);
        });
        notificationRepository.saveAll(unread);
        return Map.of("updated", unread.size());
    }

    @Transactional
    public Map<String, Object> deleteMyNotification(Long id) {
        UserSignLanguage user = currentUserService.requireCurrentUser();
        long deleted = notificationRepository.deleteByNotificationIdAndUserUserId(id, user.getUserId());
        return Map.of("deleted", deleted > 0);
    }

    @Transactional
    public Map<String, Object> createNotification(CreateNotificationRequest request) {
        if (request.getUserId() == null || request.getType() == null || request.getType().isBlank()
                || request.getTitle() == null || request.getTitle().isBlank()) {
            throw new RuntimeException("userId, type and title are required");
        }

        UserSignLanguage targetUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        Notification notification = Notification.builder()
                .user(targetUser)
                .type(request.getType())
                .title(request.getTitle())
                .content(request.getContent())
                .dataJson(request.getDataJson())
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        return toResponse(notification);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAll(Pageable pageable) {
        return notificationRepository.findAll(pageable).map(this::toResponse);
    }

    private Map<String, Object> toResponse(Notification notification) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("notificationId", notification.getNotificationId());
        result.put("userId", notification.getUser() == null ? null : notification.getUser().getUserId());
        result.put("type", notification.getType());
        result.put("title", notification.getTitle());
        result.put("content", notification.getContent() == null ? "" : notification.getContent());
        result.put("dataJson", notification.getDataJson() == null ? "" : notification.getDataJson());
        result.put("isRead", notification.getIsRead());
        result.put("readAt", notification.getReadAt());
        result.put("createdAt", notification.getCreatedAt());
        return result;
    }
}