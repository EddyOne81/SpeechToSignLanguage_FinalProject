package com.signlanguage.service;

import com.signlanguage.dto.UpsertDictionaryRequest;
import com.signlanguage.entity.DictionaryCacheSource;
import com.signlanguage.entity.DictionaryEntryType;
import com.signlanguage.entity.SignDictionary;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.SignDictionaryRepository;
import com.signlanguage.repository.UserSLRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SignDictionaryService {

    private final SignDictionaryRepository dictionaryRepository;
    private final UserSLRepository userRepository;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> search(String q, Pageable pageable) {
        Page<SignDictionary> data = (q == null || q.isBlank())
            ? dictionaryRepository.findAll(pageable)
            : dictionaryRepository.findByEnglishTextContainingIgnoreCaseOrNormalizedTextContainingIgnoreCase(q, q, pageable);

        return data.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(Long id) {
        SignDictionary dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dictionary item not found"));
        return toResponse(dictionary);
    }

    @Transactional
    public Map<String, Object> create(UpsertDictionaryRequest request) {
        validateRequired(request);
        String cleanEnglish = cleanText(request.getEnglishText());
        if (dictionaryRepository.existsByEnglishTextIgnoreCase(cleanEnglish)) {
            throw new RuntimeException("Dictionary text already exists");
        }

        String normalizedText = resolveNormalizedText(request.getNormalizedText(), cleanEnglish);
        DictionaryEntryType entryType = resolveEntryType(request.getEntryType(), normalizedText);
        String spokenLang = normalizeLang(request.getSpokenLang(), "en");
        String signedLang = normalizeLang(request.getSignedLang(), "ase");
        DictionaryCacheSource cacheSource = resolveCacheSource(request.getCacheSource());

        SignDictionary dictionary = SignDictionary.builder()
                .englishText(cleanEnglish)
                .normalizedText(normalizedText)
                .entryType(entryType)
                .spokenLang(spokenLang)
                .signedLang(signedLang)
                .cacheSource(cacheSource)
                .poseFilePath(request.getPoseFilePath())
                .build();

        dictionaryRepository.save(dictionary);
        return toResponse(dictionary);
    }

    @Transactional
    public Map<String, Object> update(Long id, UpsertDictionaryRequest request) {
        SignDictionary dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dictionary item not found"));

        String cleanEnglish = null;
        if (request.getEnglishText() != null && !request.getEnglishText().isBlank()) {
            cleanEnglish = cleanText(request.getEnglishText());
            if (dictionaryRepository.existsByEnglishTextIgnoreCaseAndWordIdNot(cleanEnglish, id)) {
                throw new RuntimeException("Dictionary text already exists");
            }
            dictionary.setEnglishText(cleanEnglish);
        }

        String normalizedText = resolveNormalizedText(request.getNormalizedText(), cleanEnglish);
        if (normalizedText != null) {
            dictionary.setNormalizedText(normalizedText);
        }

        if (request.getEntryType() != null) {
            dictionary.setEntryType(request.getEntryType());
        } else if (normalizedText != null) {
            dictionary.setEntryType(guessEntryType(normalizedText));
        }

        if (request.getSpokenLang() != null) {
            dictionary.setSpokenLang(normalizeLang(request.getSpokenLang(), "en"));
        }
        if (request.getSignedLang() != null) {
            dictionary.setSignedLang(normalizeLang(request.getSignedLang(), "ase"));
        }
        if (request.getCacheSource() != null) {
            dictionary.setCacheSource(request.getCacheSource());
        }
        if (request.getPoseFilePath() != null) {
            dictionary.setPoseFilePath(request.getPoseFilePath());
        }

        dictionaryRepository.save(dictionary);
        return toResponse(dictionary);
    }

    @Transactional
    public Map<String, Object> delete(Long id) {
        if (!dictionaryRepository.existsById(id)) {
            throw new RuntimeException("Dictionary item not found");
        }
        dictionaryRepository.deleteById(id);
        return Map.of("deleted", true);
    }

    private void validateRequired(UpsertDictionaryRequest request) {
        if (request.getEnglishText() == null || request.getEnglishText().isBlank()) {
            throw new RuntimeException("englishText is required");
        }
    }

    private UserSignLanguage resolveVerifiedBy(Long verifiedByUserId) {
        if (verifiedByUserId == null) {
            return null;
        }

        return userRepository.findById(verifiedByUserId)
                .orElseThrow(() -> new RuntimeException("Verifier user not found"));
    }

    private Map<String, Object> toResponse(SignDictionary dictionary) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("wordId", dictionary.getWordId());
        result.put("englishText", dictionary.getEnglishText());
        result.put("normalizedText", dictionary.getNormalizedText() == null ? "" : dictionary.getNormalizedText());
        result.put("entryType", dictionary.getEntryType() == null ? null : dictionary.getEntryType().name());
        result.put("spokenLang", dictionary.getSpokenLang() == null ? "" : dictionary.getSpokenLang());
        result.put("signedLang", dictionary.getSignedLang() == null ? "" : dictionary.getSignedLang());
        result.put("cacheSource", dictionary.getCacheSource() == null ? null : dictionary.getCacheSource().name());
        result.put("poseFilePath", dictionary.getPoseFilePath() == null ? "" : dictionary.getPoseFilePath());
        return result;
    }

    private String cleanText(String text) {
        return text == null ? null : text.trim();
    }

    private String resolveNormalizedText(String normalizedText, String englishText) {
        String candidate = normalizeText(normalizedText);
        if (candidate != null) {
            return candidate;
        }
        return normalizeText(englishText);
    }

    private String normalizeText(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private DictionaryEntryType resolveEntryType(DictionaryEntryType entryType, String normalizedText) {
        if (entryType != null) {
            return entryType;
        }
        return guessEntryType(normalizedText);
    }

    private DictionaryEntryType guessEntryType(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return DictionaryEntryType.GLOSS;
        }
        return normalizedText.contains(" ") ? DictionaryEntryType.PHRASE : DictionaryEntryType.GLOSS;
    }

    private DictionaryCacheSource resolveCacheSource(DictionaryCacheSource cacheSource) {
        return cacheSource == null ? DictionaryCacheSource.MANUAL : cacheSource;
    }

    private String normalizeLang(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}