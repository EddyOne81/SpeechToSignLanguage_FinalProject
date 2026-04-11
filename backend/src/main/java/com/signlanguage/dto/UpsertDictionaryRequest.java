package com.signlanguage.dto;

import lombok.Data;

@Data
public class UpsertDictionaryRequest {
    private String englishText;
    private String fswCode;
    private String poseFilePath;
    private Boolean isVerified;
    private Long verifiedByUserId;
}