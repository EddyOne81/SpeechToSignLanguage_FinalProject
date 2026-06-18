package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.signlanguage.entity.DictionaryEntryType;
import com.signlanguage.entity.SignDictionary;

public interface SignDictionaryRepository extends JpaRepository<SignDictionary, Long> {
    Optional<SignDictionary> findByEnglishTextIgnoreCase(String text);
    boolean existsByEnglishTextIgnoreCase(String text);
    boolean existsByEnglishTextIgnoreCaseAndWordIdNot(String text, Long wordId);
    Page<SignDictionary> findByEnglishTextContainingIgnoreCase(String q, Pageable pageable);
    Page<SignDictionary> findByEnglishTextContainingIgnoreCaseOrNormalizedTextContainingIgnoreCase(String q, String normalizedText, Pageable pageable);
    Optional<SignDictionary> findFirstByNormalizedTextAndEntryTypeAndSpokenLangAndSignedLang(
            String normalizedText,
            DictionaryEntryType entryType,
            String spokenLang,
            String signedLang
    );
}
