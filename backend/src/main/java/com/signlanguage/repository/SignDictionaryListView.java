package com.signlanguage.repository;

import com.signlanguage.entity.DictionaryCacheSource;
import com.signlanguage.entity.DictionaryEntryType;

/**
 * Read-only projection for listing/searching dictionary entries WITHOUT loading
 * the heavy {@code pose_data} BYTEA column. A closed interface projection makes
 * Spring Data select only these columns, so listing is fast and never pulls the
 * pose binaries (those are only needed by the pose-serving path).
 */
public interface SignDictionaryListView {
    Long getWordId();
    String getEnglishText();
    String getNormalizedText();
    DictionaryEntryType getEntryType();
    String getSpokenLang();
    String getSignedLang();
    DictionaryCacheSource getCacheSource();
    String getPoseFilePath();
}
