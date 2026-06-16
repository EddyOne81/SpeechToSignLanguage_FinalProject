package com.signlanguage.dto;

import com.signlanguage.entity.DictionaryCacheSource;
import com.signlanguage.entity.DictionaryEntryType;
import lombok.Data;

@Data
public class UpsertDictionaryRequest {
    private String englishText;
    private String normalizedText;
    private DictionaryEntryType entryType;
    private String spokenLang;
    private String signedLang;
    private DictionaryCacheSource cacheSource;
    private String fswCode;
    private String poseFilePath;
    private Boolean isVerified;
    private Long verifiedByUserId;
}