package com.signlanguage.model;

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

    @Column(columnDefinition = "TEXT")
    private String fswCode;

    private String poseFilePath;

    private Boolean isVerified;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;
}
