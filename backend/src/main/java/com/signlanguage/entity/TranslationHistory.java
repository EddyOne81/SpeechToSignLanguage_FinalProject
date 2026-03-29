package com.signlanguage.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "translation_history")
@Data 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class TranslationHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long historyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserSignLanguage user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id")
    private SignDictionary word;

    @Column(columnDefinition = "TEXT")
    private String inputText;

    @Column(columnDefinition = "TEXT")
    private String fswResult;

    private String poseFilePath;

    private Integer processingTimeMs;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}