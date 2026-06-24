package com.signlanguage.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sign_dictionary")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SignDictionary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long wordId;

    @Column(unique = true, nullable = false)
    private String englishText;

    @Column(length = 512)
    private String normalizedText;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private DictionaryEntryType entryType;

    @Column(length = 16)
    private String spokenLang;

    @Column(length = 16)
    private String signedLang;

    @Enumerated(EnumType.STRING)
    @Column(length = 24)
    private DictionaryCacheSource cacheSource;

    private String poseFilePath;

    @Column(name = "pose_data", columnDefinition = "bytea")
    private byte[] poseData;
}
